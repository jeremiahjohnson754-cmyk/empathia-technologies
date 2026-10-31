/**
 * Field results, independent verification, issues and ServiceHands work orders, and evidence objects — server-side.
 * Rules (same as the demonstrator, enforced here and again by database constraints):
 *   - a result needs a room in COMMISSIONING, an applicable test, the responsible role, an accepted evidence kind and a stored evidence object;
 *   - a recorded PASS is PASS_UNVERIFIED until a different person with verification authority verifies it;
 *   - a FAIL opens one installation/commissioning deficiency per test; only a verified retest resolves it;
 *   - closing a work order records field work and never passes a test.
 */
import { recordBlockers, verifyBlockers, resultLabel } from '@empathia/commissioning-engine';
import type { ApplicabilityRow, RecordedResult } from '@empathia/domain-types';
import type { Queryable } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import type { ObjectStore } from '../storage/objectStore.js';
import { analyze, findRoom, load, relate } from './rooms.js';
import { ApiError, invalid, notFound, refused } from '../http/errors.js';

async function code(q: Queryable, kind: string, prefix: string): Promise<string> { return (await q.query<{ c: string }>('SELECT app.next_code($1, $2) AS c', [kind, prefix])).rows[0]!.c; }

async function currentPlanRow(q: Queryable, roomId: string, testId: string): Promise<{ planId: string; row: ApplicabilityRow | undefined }> {
  const plan = (await q.query<{ id: string }>('SELECT id FROM app.cx_plan WHERE room_id = $1 ORDER BY compiled_at DESC, id DESC LIMIT 1', [roomId])).rows[0];
  if (!plan) return { planId: '', row: undefined };
  const r = (await q.query<{ test_id: string; label: string; pack: string | null; domain: string; phase: number; tier: number; applicable: boolean; status: string; personas: string[]; evidence: string[]; instrument: boolean; devices: string[] }>('SELECT * FROM app.cx_plan_row WHERE plan_id = $1 AND test_id = $2', [plan.id, testId])).rows[0];
  return { planId: plan.id, row: r ? { id: r.test_id, label: r.label, pack: r.pack, domain: r.domain, phase: r.phase, tier: r.tier, applicable: r.applicable, status: r.status as ApplicabilityRow['status'], why: [], personas: r.personas, evidence: r.evidence, instrument: r.instrument, devices: r.devices } : undefined };
}

// ------------------------------------------------------------------------------------------------ evidence
const EVIDENCE_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'text/csv', 'application/json', 'text/plain'];
export const EVIDENCE_AUTHORITIES = ['work.evidence', 'field.scan', 'test.verify', 'tests.verify.all', 'test.verify.audio', 'test.verify.video', 'test.verify.control'];

export async function uploadEvidence(ctx: RequestContext, store: ObjectStore, data: Buffer, mediaType: string, fileName: string) {
  await ctx.require(EVIDENCE_AUTHORITIES, 'upload evidence');
  const mt = mediaType.split(';')[0]!.trim().toLowerCase();
  if (!EVIDENCE_TYPES.includes(mt)) throw new ApiError('unsupported_media_type', `evidence must be one of ${EVIDENCE_TYPES.join(', ')}`);
  if (!data.length) throw invalid('the evidence file is empty');
  const name = String(fileName || 'evidence').replace(/[^\w.\- ]+/g, '_').slice(0, 200);
  const obj = await store.put(data);
  return ctx.tx(async (q) => {
    const r = (await q.query<{ id: string; uploaded_at: string; retention_until: string }>(`INSERT INTO app.evidence_object (tenant_id, sha256, bytes, media_type, file_name, storage_key, uploaded_by, retention_until) VALUES ($1,$2,$3,$4,$5,$6,$7, (now() + interval '7 years')::date) RETURNING id, uploaded_at, retention_until`,
      [ctx.p.tenantId, obj.sha256, obj.bytes, mt, name, obj.key, ctx.p.personId])).rows[0]!;
    await ctx.audit(q, 'evidence.upload', 'ALLOWED', { type: 'Evidence', id: r.id }, { sha256: obj.sha256, bytes: obj.bytes, mediaType: mt });
    return { id: r.id, sha256: obj.sha256, bytes: obj.bytes, mediaType: mt, fileName: name, uploadedAt: r.uploaded_at, retentionUntil: r.retention_until };
  });
}

export async function evidenceContent(ctx: RequestContext, store: ObjectStore, id: string): Promise<{ data: Buffer; mediaType: string; fileName: string }> {
  return ctx.tx(async (q) => {
    const e = (await q.query<{ storage_key: string; sha256: string; media_type: string; file_name: string; uploaded_by: string }>('SELECT storage_key, sha256, media_type, file_name, uploaded_by FROM app.evidence_object WHERE id = $1', [id])).rows[0];
    if (!e) throw notFound(`evidence ${id}`);
    if (ctx.p.siteScope && ctx.p.siteScope.length && e.uploaded_by !== ctx.p.personId) {   // site scope (RT-02): evidence is readable through a room in scope that cites it, or by its uploader
      const cited = await q.query('SELECT 1 FROM app.test_result t JOIN app.room r ON r.id = t.room_id AND r.tenant_id = t.tenant_id JOIN app.building b ON b.id = r.building_id AND b.tenant_id = r.tenant_id WHERE t.evidence_id = $1 AND b.site_id = ANY($2::uuid[]) LIMIT 1', [id, ctx.p.siteScope]);
      if (!cited.rowCount) { await ctx.audit(null, 'evidence.read', 'DENIED', { type: 'Evidence', id }, { why: 'not cited by a room in the caller\'s site scope' }); throw notFound(`evidence ${id}`); }
    }
    const data = await store.get(e.storage_key);
    if (!(await store.verify(e.storage_key, e.sha256))) throw new ApiError('internal', 'the stored evidence no longer matches its recorded hash');
    await ctx.audit(q, 'evidence.read', 'ALLOWED', { type: 'Evidence', id });
    return { data, mediaType: e.media_type, fileName: e.file_name };
  });
}

// ------------------------------------------------------------------------------------------------ results
export async function recordResult(ctx: RequestContext, ref: string, body: { testId: string; state: string; evidenceId: string; evidenceKind: string; instrument?: string }) {
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true);
    const { planId, row } = await currentPlanRow(q, room.id, body.testId);
    const ev = (await q.query<{ id: string }>('SELECT id FROM app.evidence_object WHERE id = $1', [body.evidenceId])).rows[0];
    if (!ev) throw notFound(`evidence ${body.evidenceId}`);
    const why = recordBlockers(room.lifecycle, row, ctx.p.role, { state: body.state, evidence: { kind: body.evidenceKind, ref: body.evidenceId, instrument: body.instrument ?? null } });
    if (why.length) {
      const isRole = /is not the responsible role/.test(why[0]!);
      await ctx.audit(null, 'commission.result.record', 'DENIED', { type: 'Room', id: room.code }, { testId: body.testId, why });   // own transaction: survives the rollback (RT-01)
      throw isRole ? new ApiError('forbidden', why[0]!) : refused(why);
    }
    const prev = (await q.query<{ result_id: string }>('SELECT result_id FROM app.current_result WHERE room_id = $1 AND test_id = $2', [room.id, body.testId])).rows[0];
    const r = (await q.query<{ id: string }>(`INSERT INTO app.test_result (tenant_id, room_id, test_id, state, evidence_id, evidence_kind, instrument, recorded_by, recorded_role, supersedes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [ctx.p.tenantId, room.id, body.testId, body.state, body.evidenceId, body.evidenceKind, body.instrument ?? null, ctx.p.personId, ctx.p.role, prev?.result_id ?? null])).rows[0]!;
    const rr: RecordedResult = { state: body.state as RecordedResult['state'], evidence: { kind: body.evidenceKind, ref: body.evidenceId }, by: ctx.p.personId, verified: null };
    const label = resultLabel(rr);
    await ctx.emit(q, 'commission.test_result_submitted', { type: 'Room', id: room.code, rev: room.rev }, { planId, testId: body.testId, state: body.state, resultLabel: label, evidence: body.evidenceKind, designId: room.code, roomId: room.code });
    if (body.state === 'FAIL') await openCxDeficiency(ctx, q, room.id, room.code, planId, row!, body.evidenceId);
    await ctx.audit(q, 'commission.result.record', 'ALLOWED', { type: 'Room', id: room.code }, { testId: body.testId, state: body.state, resultLabel: label, resultId: r.id });
    await analyze(ctx, q, room.id, `result ${body.testId}`);
    return { resultId: r.id, testId: body.testId, state: body.state, resultLabel: label };
  });
}

async function openCxDeficiency(ctx: RequestContext, q: Queryable, roomId: string, roomCode: string, planId: string, row: ApplicabilityRow, evidenceId: string) {
  const key = `test-failed:${row.id}`;
  const i = (await q.query<{ id: string; code: string; state: string }>('SELECT id, code, state FROM app.room_issue WHERE room_id = $1 AND key = $2', [roomId, key])).rows[0];
  const revNo = (await q.query<{ n: number }>('SELECT coalesce(max(rev_no), 0) AS n FROM app.room_revision WHERE room_id = $1', [roomId])).rows[0]!.n;
  if (!i) {
    const c = await code(q, 'issue', 'RISS-');
    const ins = (await q.query<{ id: string }>(`INSERT INTO app.room_issue (tenant_id, room_id, code, key, category, check_name, severity, title, rationale, assets, first_seen_rev, last_seen_rev) VALUES ($1,$2,$3,$4,'INSTALLATION_COMMISSIONING_DEFICIENCY','commissioning_test_failed',$5,$6,$7,$8,$9,$9) RETURNING id`,
      [ctx.p.tenantId, roomId, c, key, row.tier === 1 ? 'High' : 'Medium', `${row.label} failed`, `the ${row.label} test failed on the installed room (evidence ${evidenceId})`, row.devices || [], revNo])).rows[0]!;
    await q.query('INSERT INTO app.issue_event (tenant_id, issue_id, kind, detail, actor_id) VALUES ($1,$2,$3,$4,$5)', [ctx.p.tenantId, ins.id, 'created', { source: 'commissioning: physical test result', evidenceId }, ctx.p.personId]);
    await relate(ctx, q, { type: 'RoomIssue', id: c }, 'AFFECTS', { type: 'Room', id: roomCode }, 'FIELD_OBSERVED');
    await ctx.emit(q, 'commission.test_failed', { type: 'Room', id: roomCode, rev: 1 }, { planId, testId: row.id, roomId: roomCode });
    await ctx.emit(q, 'commission.deficiency_opened', { type: 'RoomIssue', id: c, rev: 1 }, { planId, testId: row.id, issueId: c });
    await ctx.emit(q, 'issue.created_or_updated', { type: 'RoomIssue', id: c, rev: 1 }, { issueId: c, status: 'OPEN', change: 'created', roomId: roomCode });
    return;
  }
  await q.query(`UPDATE app.room_issue SET state = 'OPEN', resolution = NULL, last_seen_rev = $2 WHERE id = $1`, [i.id, revNo]);
  await q.query('INSERT INTO app.issue_event (tenant_id, issue_id, kind, detail, actor_id) VALUES ($1,$2,$3,$4,$5)', [ctx.p.tenantId, i.id, 'seen_again', { source: 'the test failed again', evidenceId }, ctx.p.personId]);
  await ctx.emit(q, 'commission.test_failed', { type: 'Room', id: roomCode, rev: 1 }, { planId, testId: row.id, roomId: roomCode });
}

export const VERIFY_AUTHORITIES = ['tests.verify.all', 'test.verify', 'customer.accept'];

export async function verifyResult(ctx: RequestContext, ref: string, testId: string) {
  await ctx.require(VERIFY_AUTHORITIES, 'verify a result', { type: 'Room', id: ref });
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true);
    const cur = (await q.query<{ result_id: string; state: string; recorded_by: string; verified_by: string | null; evidence_kind: string; evidence_id: string }>('SELECT result_id, state, recorded_by, verified_by, evidence_kind, evidence_id FROM app.current_result WHERE room_id = $1 AND test_id = $2', [room.id, testId])).rows[0];
    const rr: RecordedResult | undefined = cur ? { state: cur.state as RecordedResult['state'], evidence: { kind: cur.evidence_kind, ref: cur.evidence_id }, by: cur.recorded_by, verified: cur.verified_by ? { by: cur.verified_by } : null } : undefined;
    const why = verifyBlockers(rr, ctx.p.personId);
    if (why.length) await ctx.refuse('commission.result.verify', { type: 'Room', id: room.code }, why, { testId });
    await q.query('INSERT INTO app.verification (tenant_id, result_id, recorded_by, verified_by, verified_role) VALUES ($1,$2,$3,$4,$5)', [ctx.p.tenantId, cur!.result_id, cur!.recorded_by, ctx.p.personId, ctx.p.role]);
    const label = resultLabel({ ...rr!, verified: { by: ctx.p.personId } });
    await ctx.emit(q, 'room.test_verified', { type: 'Room', id: room.code, rev: room.rev }, { designId: room.code, testId, resultLabel: label, verifiedBy: ctx.p.personId });
    // a verified PASS retest resolves the test's open commissioning deficiency
    const i = (await q.query<{ id: string; code: string }>(`SELECT id, code FROM app.room_issue WHERE room_id = $1 AND key = $2 AND state = 'OPEN'`, [room.id, `test-failed:${testId}`])).rows[0];
    if (i) {
      const resolution = { at: new Date().toISOString(), by: ctx.p.personId, byRole: ctx.p.role, how: `retest ${testId} PASS by ${cur!.recorded_by}, verified by ${ctx.p.personId}`, evidenceId: cur!.evidence_id };
      await q.query(`UPDATE app.room_issue SET state = 'RESOLVED', resolution = $2 WHERE id = $1`, [i.id, resolution]);
      await q.query('INSERT INTO app.issue_event (tenant_id, issue_id, kind, detail, actor_id) VALUES ($1,$2,$3,$4,$5)', [ctx.p.tenantId, i.id, 'resolved', resolution, ctx.p.personId]);
      const planId = (await q.query<{ id: string }>('SELECT id FROM app.cx_plan WHERE room_id = $1 ORDER BY compiled_at DESC, id DESC LIMIT 1', [room.id])).rows[0]?.id || '';
      await ctx.emit(q, 'commission.deficiency_resolved', { type: 'RoomIssue', id: i.code, rev: 2 }, { planId, testId, issueId: i.code });
      await ctx.emit(q, 'issue.created_or_updated', { type: 'RoomIssue', id: i.code, rev: 2 }, { issueId: i.code, status: 'RESOLVED', change: 'resolved', roomId: room.code });
    }
    await ctx.audit(q, 'commission.result.verify', 'ALLOWED', { type: 'Room', id: room.code }, { testId, resultLabel: label });
    await analyze(ctx, q, room.id, `verified ${testId}`);
    return { testId, resultLabel: label };
  });
}

// ------------------------------------------------------------------------------------------------ issues and work orders
export async function assignIssue(ctx: RequestContext, issueCode: string, ownerRole: string) {
  await ctx.require(['issue.assign', 'route.internal'], 'assign an issue', { type: 'RoomIssue', id: issueCode });
  return ctx.tx(async (q) => {
    const i = (await q.query<{ id: string; state: string; room_id: string }>('SELECT i.id, i.state, i.room_id FROM app.room_issue i WHERE i.code = $1 FOR UPDATE', [issueCode])).rows[0];
    if (!i) throw notFound(`issue ${issueCode}`);
    await findRoom(ctx, q, i.room_id);                                      // site scope applies to issues through their room
    if (i.state !== 'OPEN') throw refused(['the issue is not open']);
    if (!(await q.query('SELECT 1 FROM app.role WHERE key = $1', [ownerRole])).rowCount) throw invalid(`unknown role ${ownerRole}`);
    await q.query('UPDATE app.room_issue SET owner_role = $2 WHERE id = $1', [i.id, ownerRole]);
    await q.query('INSERT INTO app.issue_event (tenant_id, issue_id, kind, detail, actor_id) VALUES ($1,$2,$3,$4,$5)', [ctx.p.tenantId, i.id, 'assigned', { ownerRole, byRole: ctx.p.role }, ctx.p.personId]);
    await ctx.emit(q, 'issue.assigned', { type: 'RoomIssue', id: issueCode, rev: 2 }, { issueId: issueCode, owner: ownerRole });
    await ctx.audit(q, 'issue.assign', 'ALLOWED', { type: 'RoomIssue', id: issueCode }, { ownerRole });
    return { issueId: issueCode, ownerRole };
  });
}

export async function createWorkOrder(ctx: RequestContext, issueCode: string, body: { assignedRole?: string; note?: string }) {
  await ctx.require(['service.assign', 'service.triage'], 'raise a work order', { type: 'RoomIssue', id: issueCode });
  return ctx.tx(async (q) => {
    const i = (await q.query<{ id: string; state: string; category: string; room_id: string }>('SELECT id, state, category, room_id FROM app.room_issue WHERE code = $1 FOR UPDATE', [issueCode])).rows[0];
    if (!i) throw notFound(`issue ${issueCode}`);
    const room = await findRoom(ctx, q, i.room_id);
    if (i.category !== 'INSTALLATION_COMMISSIONING_DEFICIENCY') throw refused(['a design deficiency on a planned room gets a design change, not a field work order']);
    if (i.state !== 'OPEN') throw refused(['the issue is not open']);
    const c = await code(q, 'workorder', 'WO-');
    const role = body.assignedRole || 'service';
    await q.query('INSERT INTO app.work_order (tenant_id, issue_id, code, assigned_role, note, created_by) VALUES ($1,$2,$3,$4,$5,$6)', [ctx.p.tenantId, i.id, c, role, String(body.note || '').slice(0, 1000), ctx.p.personId]);
    await q.query('INSERT INTO app.issue_event (tenant_id, issue_id, kind, detail, actor_id) VALUES ($1,$2,$3,$4,$5)', [ctx.p.tenantId, i.id, 'work_order', { workOrder: c, state: 'OPEN', assignedRole: role }, ctx.p.personId]);
    await ctx.emit(q, 'work_order.created', { type: 'WorkOrder', id: c, rev: 1 }, { workOrderId: c, roomId: room.code, kind: 'remediation', issueId: issueCode });
    await ctx.audit(q, 'work_order.create', 'ALLOWED', { type: 'WorkOrder', id: c }, { issueCode });
    return { workOrderId: c, state: 'OPEN', assignedRole: role };
  });
}

// closing moved to domain/service.ts (P6-A): a work order closes only from RESOLVED, under the customer policy

export { load };
