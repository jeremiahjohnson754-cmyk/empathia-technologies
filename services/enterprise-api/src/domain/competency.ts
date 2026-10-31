/**
 * Competency records (P1, ADR-0009): the credentials ServiceHands' hard gates read.
 *   record  — the service manager (service.assign) records a certificate, licence or assessment for a person: competency id from the
 *             service engine's catalogue, issuer, reference, issue and expiry dates, an optional evidence copy, optional training records
 *             as supporting evidence (never sufficient alone);
 *   verify / reject — the data steward (provenance.review) checks provenance; never the recorder, never the holder (also a DB CHECK);
 *   revoke  — either authority, with a reason; a revoked credential stops counting at once.
 * A credential counts for dispatch only when VERIFIED, unexpired and not revoked — `verifiedCerts` is the only source the gates use.
 */
import { CERTS, type CertId } from '@empathia/service-engine';
import type { Queryable } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import { invalid, notFound } from '../http/errors.js';

export const COMPETENCY_RECORD = ['service.assign'];
export const COMPETENCY_VERIFY = ['provenance.review'];
export const COMPETENCY_REVOKE = ['service.assign', 'provenance.review'];

interface Row { id: string; person_id: string; competency: string; source: string; issuer: string; reference: string; evidence_id: string | null; training_refs: string[]; issued_on: string; expires_on: string; state: string; recorded_by: string; recorded_at: string; decided_by: string | null; decided_at: string | null; decision_note: string | null; revoked_by: string | null; revoked_at: string | null; revoke_reason: string | null; holder: string; recorder: string; decider: string | null }
const SELECT = `SELECT c.*, c.issued_on::text AS issued_on, c.expires_on::text AS expires_on, h.display_name AS holder, r.display_name AS recorder, d.display_name AS decider
  FROM app.competency_record c JOIN app.person h ON h.id = c.person_id JOIN app.person r ON r.id = c.recorded_by LEFT JOIN app.person d ON d.id = c.decided_by`;
const today = () => new Date().toISOString().slice(0, 10);
const view = (ctx: RequestContext, c: Row) => {
  const expired = c.expires_on < today(); const counts = c.state === 'VERIFIED' && !expired;
  return { id: c.id, person: { id: c.person_id, name: c.holder }, competency: c.competency, label: (CERTS as Record<string, { label: string }>)[c.competency]?.label || c.competency, source: c.source, issuer: c.issuer, reference: c.reference, evidenceId: c.evidence_id, trainingRefs: c.training_refs.map(Number),
    issuedOn: c.issued_on, expiresOn: c.expires_on, expired, state: c.state, countsForDispatch: counts, recordedBy: c.recorder, recordedAt: c.recorded_at, decidedBy: c.decider, decidedAt: c.decided_at, decisionNote: c.decision_note, revokedAt: c.revoked_at, revokeReason: c.revoke_reason,
    yours: { decide: c.state === 'PENDING_VERIFICATION' && ctx.can(COMPETENCY_VERIFY) && c.recorded_by !== ctx.p.personId && c.person_id !== ctx.p.personId, revoke: c.state === 'VERIFIED' && ctx.can(COMPETENCY_REVOKE) } };
};

/** The gates' only source: verified, unexpired, unrevoked credentials per person, in the engine's shape. */
export async function verifiedCerts(q: Queryable, personIds: string[]): Promise<Map<string, Record<string, { expires: string }>>> {
  const out = new Map<string, Record<string, { expires: string }>>();
  if (!personIds.length) return out;
  const rows = (await q.query<{ person_id: string; competency: string; expires_on: string }>("SELECT person_id, competency, max(expires_on)::text AS expires_on FROM app.competency_record WHERE state = 'VERIFIED' AND person_id = ANY($1::uuid[]) GROUP BY person_id, competency", [personIds])).rows;
  for (const r of rows) { const m = out.get(r.person_id) || {}; m[r.competency] = { expires: r.expires_on }; out.set(r.person_id, m); }
  return out;   // an expired credential is returned with its date: the engine's gate names it "expired <date>" rather than hiding it
}

export async function list(ctx: RequestContext, personId?: string) {
  const mayRecord = ctx.can(COMPETENCY_RECORD);
  // credentials are personal records: those who record or verify them see everyone's; anyone else sees only their own
  const own = !ctx.can([...COMPETENCY_RECORD, ...COMPETENCY_VERIFY]) ? ctx.p.personId : null;
  const { rows, pool } = await ctx.tx(async (q) => ({
    rows: (await q.query<Row>(`${SELECT} WHERE ($1::uuid IS NULL OR c.person_id = $1) AND ($2::uuid IS NULL OR c.person_id = $2) ORDER BY h.display_name, c.competency, c.recorded_at DESC LIMIT 500`, [personId || null, own])).rows,
    // the service pool (people who may accept work) — the same people the service manager already ranks for dispatch; nobody else is offered
    pool: mayRecord ? (await q.query<{ id: string; name: string }>("SELECT DISTINCT p.id, p.display_name AS name FROM app.membership m JOIN app.role r ON r.key = m.role_key JOIN app.person p ON p.id = m.person_id WHERE 'work.accept' = ANY(r.authorities) AND NOT p.disabled ORDER BY 2")).rows : [],
  }));
  return { items: rows.map((c) => view(ctx, c)), pool, catalogue: Object.entries(CERTS).map(([id, c]) => ({ id, label: c.label })), mayRecord, mayVerify: ctx.can(COMPETENCY_VERIFY),
    note: 'A credential counts for dispatch only when verified by someone other than its recorder and its holder, unexpired and not revoked. Training never counts by itself.' };
}

export async function record(ctx: RequestContext, body: { personId: string; competency: string; source: 'EXTERNAL_CERTIFICATE' | 'LICENCE' | 'ASSESSMENT'; issuer: string; reference: string; issuedOn: string; expiresOn: string; evidenceId?: string; trainingRefs?: number[] }) {
  await ctx.require(COMPETENCY_RECORD, 'record a competency', { type: 'Person', id: body.personId });
  if (!(body.competency in CERTS)) throw invalid(`competency is one of ${Object.keys(CERTS).join(', ')}`);
  if (!(body.expiresOn > body.issuedOn)) throw invalid('the expiry date is after the issue date');
  if (body.source === 'ASSESSMENT' && !(body.trainingRefs?.length || body.evidenceId)) throw invalid('an assessment cites its evidence: an uploaded record or the training records it is based on');
  return ctx.tx(async (q) => {
    if (!(await q.query('SELECT 1 FROM app.membership WHERE person_id = $1', [body.personId])).rowCount) throw notFound(`person ${body.personId}`);
    if (body.trainingRefs?.length) {
      const own = (await q.query<{ n: number }>('SELECT count(*)::int AS n FROM app.training_record WHERE id = ANY($1::bigint[]) AND person_id = $2', [body.trainingRefs, body.personId])).rows[0]!.n;
      if (own !== body.trainingRefs.length) await ctx.refuse('competency.record', { type: 'Person', id: body.personId }, ['every cited training record must belong to the person the competency is for']);
    }
    const id = (await q.query<{ id: string }>('INSERT INTO app.competency_record (tenant_id, person_id, competency, source, issuer, reference, evidence_id, training_refs, issued_on, expires_on, recorded_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id',
      [ctx.p.tenantId, body.personId, body.competency, body.source, body.issuer, body.reference, body.evidenceId || null, body.trainingRefs || [], body.issuedOn, body.expiresOn, ctx.p.personId])).rows[0]!.id;
    await ctx.audit(q, 'competency.record', 'ALLOWED', { type: 'Competency', id }, { personId: body.personId, competency: body.competency, source: body.source, expiresOn: body.expiresOn });
    return { id, state: 'PENDING_VERIFICATION', note: 'Recorded. It counts for dispatch only after the data steward verifies its provenance.' };
  });
}

async function find(q: Queryable, id: string): Promise<Row> { const r = (await q.query<Row>(`${SELECT} WHERE c.id = $1 FOR UPDATE OF c`, [id])).rows[0]; if (!r) throw notFound(`competency ${id}`); return r; }

export async function decide(ctx: RequestContext, id: string, body: { decision: 'verify' | 'reject'; note: string }) {
  await ctx.require(COMPETENCY_VERIFY, 'verify a competency', { type: 'Competency', id });
  return ctx.tx(async (q) => {
    const c = await find(q, id); const why: string[] = [];
    if (c.state !== 'PENDING_VERIFICATION') why.push(`only a pending credential is decided (it is ${c.state})`);
    if (c.recorded_by === ctx.p.personId) why.push('the verifier is not the person who recorded the credential (separation of duties)');
    if (c.person_id === ctx.p.personId) why.push('nobody verifies their own credential');
    if (why.length) await ctx.refuse('competency.verify', { type: 'Competency', id }, why);
    const state = body.decision === 'verify' ? 'VERIFIED' : 'REJECTED';
    await q.query('UPDATE app.competency_record SET state = $2, decided_by = $3, decided_at = now(), decision_note = $4 WHERE id = $1', [id, state, ctx.p.personId, body.note]);
    await ctx.audit(q, body.decision === 'verify' ? 'competency.verify' : 'competency.reject', 'ALLOWED', { type: 'Competency', id }, { personId: c.person_id, competency: c.competency, note: body.note });
    return { id, state, countsForDispatch: state === 'VERIFIED' && c.expires_on >= today() };
  });
}

export async function revoke(ctx: RequestContext, id: string, reason: string) {
  await ctx.require(COMPETENCY_REVOKE, 'revoke a competency', { type: 'Competency', id });
  return ctx.tx(async (q) => {
    const c = await find(q, id);
    if (c.state !== 'VERIFIED') await ctx.refuse('competency.revoke', { type: 'Competency', id }, [`only a verified credential is revoked (it is ${c.state})`]);
    await q.query("UPDATE app.competency_record SET state = 'REVOKED', revoked_by = $2, revoked_at = now(), revoke_reason = $3 WHERE id = $1", [id, ctx.p.personId, reason]);
    await ctx.audit(q, 'competency.revoke', 'ALLOWED', { type: 'Competency', id }, { personId: c.person_id, competency: c.competency, reason });
    return { id, state: 'REVOKED', countsForDispatch: false };
  });
}

export const isCert = (k: string): k is CertId => k in CERTS;
