/**
 * Versioned, immutable Assurance baselines (ADR-0003). Version 1 is published when a room is ACCEPTED, by the acceptance itself; every
 * later version is published by the re-acceptance that follows an authorized recommissioning (ACCEPTED → COMMISSIONING, plan.compile),
 * by an acceptor who neither recorded nor verified the results it binds (ADR-0005). There is no other way to publish a version. A version binds the exact design revision and hash, the commissioning plan, the result labels and the
 * evidence objects cited; publishing supersedes the current version and keeps the lineage. Exceptions are requested and decided by
 * different people. Nothing here is ever overwritten.
 */
import type { Queryable } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import { ApiError, invalid, notFound } from '../http/errors.js';
import { findRoom } from './rooms.js';

interface Bound { designRevision: number; designSha256: string; planId: string | null; results: Record<string, string>; evidenceIds: string[]; devices: unknown[]; authors: string[] }

/** What the room's current state binds: the approved design revision, the current result labels, the evidence they cite, the authors. */
export async function bindCurrent(q: Queryable, room: { id: string; approved_revision: number | null }): Promise<Bound> {
  const rev = (await q.query<{ rev_no: number; sha256: string; snapshot: { devices: Array<{ id: string; cat: string; label: string; furniture: boolean }> } }>('SELECT rev_no, sha256, snapshot FROM app.room_revision WHERE room_id = $1 AND rev_no = $2', [room.id, room.approved_revision])).rows[0];
  if (!rev) throw new ApiError('rule_refused', 'a baseline needs an approved design revision');
  const plan = (await q.query<{ id: string }>('SELECT id FROM app.cx_plan WHERE room_id = $1 ORDER BY compiled_at DESC, id DESC LIMIT 1', [room.id])).rows[0];
  const res = (await q.query<{ test_id: string; result_label: string; evidence_id: string | null; recorded_by: string | null; verified_by: string | null }>('SELECT c.test_id, c.result_label, t.evidence_id, t.recorded_by, v.verified_by FROM app.current_result c LEFT JOIN app.test_result t ON t.id = c.result_id LEFT JOIN app.verification v ON v.result_id = c.result_id WHERE c.room_id = $1', [room.id])).rows;
  return { designRevision: rev.rev_no, designSha256: rev.sha256, planId: plan?.id || null, results: Object.fromEntries(res.map((r) => [r.test_id, r.result_label])),
    evidenceIds: [...new Set(res.map((r) => r.evidence_id).filter((x): x is string => !!x))], devices: rev.snapshot.devices.filter((d) => !d.furniture).map((d) => ({ id: d.id, category: d.cat, label: d.label })),
    authors: [...new Set(res.flatMap((r) => [r.recorded_by, r.verified_by]).filter((x): x is string => !!x))] };
}

/** Publish the next version (version 1 at acceptance; later versions supersede the current one). Called inside the caller's transaction. */
export async function publish(ctx: RequestContext, q: Queryable, room: { id: string; code: string; approved_revision: number | null }, reason: string): Promise<{ id: string; version: number; supersedes: string | null }> {
  const b = await bindCurrent(q, room);
  const cur = (await q.query<{ id: string; version: number }>("SELECT id, version FROM app.assurance_baseline WHERE room_id = $1 AND state = 'CURRENT'", [room.id])).rows[0];
  const version = cur ? cur.version + 1 : 1;
  if (cur) await q.query("UPDATE app.assurance_baseline SET state = 'SUPERSEDED', superseded_at = now(), superseded_by = $2 WHERE id = $1", [cur.id, ctx.p.personId]);
  const r = await q.query<{ id: string }>(`INSERT INTO app.assurance_baseline (tenant_id, room_id, version, design_revision, design_sha256, plan_id, results, evidence_ids, devices, reason, published_by, supersedes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [ctx.p.tenantId, room.id, version, b.designRevision, b.designSha256, b.planId, b.results, b.evidenceIds, JSON.stringify(b.devices), reason, ctx.p.personId, cur?.id || null]);
  if (cur) await ctx.emit(q, 'assurance.baseline_superseded', { type: 'Room', id: room.code, rev: version }, { roomId: room.code, oldBaselineId: cur.id, newBaselineId: r.rows[0]!.id, version });
  await ctx.audit(q, 'assurance.baseline_published', 'ALLOWED', { type: 'Room', id: room.code }, { version, supersedes: cur?.id || null, designRevision: b.designRevision, evidence: b.evidenceIds.length });
  return { id: r.rows[0]!.id, version, supersedes: cur?.id || null };
}

export async function lineage(ctx: RequestContext, ref: string) {
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref);
    const items = (await q.query('SELECT id, version, state, design_revision, design_sha256, plan_id, results, evidence_ids, devices, reason, published_by, published_at, supersedes, superseded_at, superseded_by FROM app.assurance_baseline WHERE room_id = $1 ORDER BY version', [room.id])).rows;
    const exceptions = (await q.query('SELECT id, baseline_id, kind, dimension, rationale, state, requested_by, requested_at, decided_by, decided_at, decision_note, expires_at FROM app.baseline_exception WHERE room_id = $1 ORDER BY requested_at', [room.id])).rows;
    return { room: room.code, current: items.find((x) => (x as { state: string }).state === 'CURRENT') || null, items, exceptions };
  });
}

export async function requestException(ctx: RequestContext, ref: string, body: { kind: string; dimension: string; rationale: string; expiresAt?: string }) {
  await ctx.require(['baseline.approve', 'test.verify', 'tests.verify.all', 'work.evidence'], 'request a baseline exception', { type: 'Room', id: ref });
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref);
    const cur = (await q.query<{ id: string }>("SELECT id FROM app.assurance_baseline WHERE room_id = $1 AND state = 'CURRENT'", [room.id])).rows[0];
    if (!cur) throw notFound(`a current baseline of ${room.code}`);
    if (body.expiresAt && Number.isNaN(Date.parse(body.expiresAt))) throw invalid('expiresAt must be a date');
    const r = await q.query<{ id: string }>('INSERT INTO app.baseline_exception (tenant_id, room_id, baseline_id, kind, dimension, rationale, requested_by, expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id', [ctx.p.tenantId, room.id, cur.id, body.kind, body.dimension, body.rationale, ctx.p.personId, body.expiresAt || null]);
    await ctx.audit(q, 'assurance.exception_requested', 'ALLOWED', { type: 'BaselineException', id: r.rows[0]!.id }, { room: room.code, kind: body.kind, dimension: body.dimension });
    return { id: r.rows[0]!.id, state: 'REQUESTED' };
  });
}
export async function decideException(ctx: RequestContext, id: string, body: { decision: 'APPROVED' | 'REJECTED'; note?: string }) {
  await ctx.require('baseline.approve', 'decide a baseline exception', { type: 'BaselineException', id });
  return ctx.tx(async (q) => {
    const e = (await q.query<{ requested_by: string; state: string; room_id: string }>('SELECT requested_by, state, room_id FROM app.baseline_exception WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!e) throw notFound(`exception ${id}`);
    if (e.state !== 'REQUESTED') throw new ApiError('rule_refused', `the exception is already ${e.state}`);
    await ctx.separate('assurance.exception_decide', { type: 'BaselineException', id }, [e.requested_by], 'an exception');
    await q.query('UPDATE app.baseline_exception SET state = $2, decided_by = $3, decided_at = now(), decision_note = $4 WHERE id = $1', [id, body.decision, ctx.p.personId, body.note || null]);
    await ctx.audit(q, 'assurance.exception_decided', 'ALLOWED', { type: 'BaselineException', id }, { decision: body.decision });
    return { id, state: body.decision };
  });
}
