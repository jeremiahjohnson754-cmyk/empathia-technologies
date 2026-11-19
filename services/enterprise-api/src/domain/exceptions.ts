/**
 * Pass with Exception for a measured test (migration 0042; 50/10 master directive §3.1, the V3.9 rules: "Pass with Exception also
 * requires a deficiency", "Intelligibility failures require dedicated exception records").
 *
 *   log      someone who measures or verifies records why a value outside its criterion is poor, the root cause and the mitigation,
 *            against the deficiency the FAIL opened. The database copies the measured value, the metric and the limits from the
 *            measurement the current FAIL rests on (app.measured_exception_fill); nothing of that is taken from the request.
 *   decide   someone holding baseline.approve, never its logger, approves or rejects it, once.
 *   except   the deficiency step (deficiencies.ts) then names the approved record; the database guard holds it for every writer.
 *
 * Acceptance counts such a test as PASS WITH EXCEPTION (rooms.ts → engine lifecycle `excepted`): never a pass, and the baseline says so.
 *
 * 0048: the record rests on one of two rules (app.exception_route): the room's criterion for the test (0042), or, where the room has
 * none, the commissioning standard's intelligibility floor: a speech transmission index of 0.40 or less is never a pass and is routed
 * to its own exception record. Such a record names the floor as its limit and no criterion version.
 */
import type { Queryable } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import { invalid, notFound } from '../http/errors.js';
import { findRoom } from './rooms.js';

export const LOG_AUTHORITIES = ['test.verify', 'tests.verify.all', 'work.evidence', 'fi.plan'];
export const DECIDE_AUTHORITIES = ['baseline.approve'];

interface Row { id: string; code: string; room_id: string; issue_id: string; test_id: string; measurement_id: string; metric: string; unit: string; measured_value: string;
  lower: string | null; upper: string | null; criterion_version: number | null; why_poor: string; root_cause: string; mitigation: string; evidence_id: string | null;
  logged_by: string; logged_at: string; state: string; decided_by: string | null; decided_at: string | null; decision_note: string | null; issue: string }
const COLS = `x.id, x.code, x.room_id, x.issue_id, x.test_id, x.measurement_id, x.metric, x.unit, x.measured_value, x.lower, x.upper, x.criterion_version, x.why_poor, x.root_cause,
  x.mitigation, x.evidence_id, x.logged_by, x.logged_at, x.state, x.decided_by, x.decided_at, x.decision_note, i.code AS issue`;
const n = (v: string | null) => (v === null ? null : Number(v));
export const viewOf = (r: Row) => ({
  code: r.code, issue: r.issue, test: r.test_id, measurementId: r.measurement_id, state: r.state,
  measured: { value: Number(r.measured_value), metric: r.metric, unit: r.unit }, limit: { lower: n(r.lower), upper: n(r.upper), criterionVersion: r.criterion_version },
  whyPoor: r.why_poor, rootCause: r.root_cause, mitigation: r.mitigation, evidenceId: r.evidence_id, loggedBy: r.logged_by, loggedAt: r.logged_at,
  decidedBy: r.decided_by, decidedAt: r.decided_at, decisionNote: r.decision_note,
  basis: r.criterion_version === null ? 'commissioning standard' : 'site criterion',
  words: `${r.test_id}: measured ${Number(r.measured_value)} ${r.unit} against ${r.criterion_version === null ? `the commissioning standard (an STI above ${Number(r.lower)} passes; at or below it is routed to an intelligibility exception)` : `${r.upper !== null ? `at most ${Number(r.upper)}` : ''}${r.upper !== null && r.lower !== null ? ' and ' : ''}${r.lower !== null ? `at least ${Number(r.lower)}` : ''} ${r.unit} (criterion version ${r.criterion_version})`} — ${r.state === 'APPROVED' ? 'PASS WITH EXCEPTION once the deficiency is excepted on it: not a pass' : r.state.toLowerCase()}`,
});
const agg = (code: string) => ({ type: 'MeasuredException', id: code });
/** 'criterion' | 'standard' | null: the rule a failed test's exception record rests on (app.exception_route, 0048). */
export const route = async (q: Queryable, tenantId: string, roomId: string, test: string) =>
  (await q.query<{ r: string | null }>('SELECT app.exception_route($1, $2, $3) AS r', [tenantId, roomId, test])).rows[0]?.r ?? null;

/** Log the exception record of a deficiency opened by a failed measured test. */
export async function log(ctx: RequestContext, issueCode: string, body: { whyPoor?: string; rootCause?: string; mitigation?: string; evidenceId?: string }) {
  await ctx.require(LOG_AUTHORITIES, 'log a measured exception', { type: 'RoomIssue', id: issueCode });
  return ctx.tx(async (q) => {
    const i = (await q.query<{ id: string; room_id: string; key: string; workflow: string }>('SELECT id, room_id, key, workflow FROM app.room_issue WHERE code = $1', [issueCode])).rows[0];
    if (!i) throw notFound(`issue ${issueCode}`);
    const room = await findRoom(ctx, q, i.room_id); const why: string[] = [];
    const test = /^test-failed:(.+)$/.exec(i.key)?.[1];
    if (!test) why.push(`${issueCode} was not opened by a failed test: an exception record of a measured value is for those`);
    else if (!(await route(q, ctx.p.tenantId, room.id, test))) why.push(`${room.code} has no criterion for ${test}, and its current FAIL is not a speech transmission index at or below the commissioning standard's 0.40: without a limit there is no measured value to except; the deficiency follows its own workflow`);
    if (['CLOSED', 'ACCEPTED_EXCEPTION'].includes(i.workflow)) why.push(`${issueCode} is ${i.workflow}: nothing to except`);
    if ((await q.query("SELECT 1 FROM app.measured_exception WHERE issue_id = $1 AND state <> 'REJECTED'", [i.id])).rowCount) why.push(`${issueCode} already has an exception record that is not rejected`);
    const t = (s: unknown) => String(s ?? '').trim();
    if (t(body.whyPoor).length < 10) why.push('say why the value is poor (at least ten characters)');
    if (t(body.rootCause).length < 5) why.push('give the root cause');
    if (t(body.mitigation).length < 10) why.push('say what mitigates it (at least ten characters)');
    if (body.evidenceId && !/^[0-9a-f-]{36}$/.test(body.evidenceId)) throw invalid('evidenceId is the id of a stored evidence file');
    if (body.evidenceId && !(await q.query('SELECT 1 FROM app.evidence_object WHERE id = $1', [body.evidenceId])).rowCount) why.push('the evidence named is not one of this organization’s files');
    if (why.length) await ctx.refuse('exception.log', { type: 'RoomIssue', id: issueCode }, why);
    const code = (await q.query<{ c: string }>("SELECT app.next_code('measured_exception', 'EXC-') AS c")).rows[0]!.c;
    try {
      await q.query('INSERT INTO app.measured_exception (tenant_id, code, room_id, issue_id, test_id, measurement_id, why_poor, root_cause, mitigation, evidence_id, logged_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        [ctx.p.tenantId, code, room.id, i.id, test, '00000000-0000-0000-0000-000000000000', t(body.whyPoor), t(body.rootCause), t(body.mitigation), body.evidenceId || null, ctx.p.personId]);
    } catch (e) {
      const m = /EM020 (.+)/.exec(String((e as Error).message)); if (m) await ctx.refuse('exception.log', { type: 'RoomIssue', id: issueCode }, [m[1]!]); throw e;
    }
    const r = (await q.query<Row>(`SELECT ${COLS} FROM app.measured_exception x JOIN app.room_issue i ON i.id = x.issue_id WHERE x.code = $1`, [code])).rows[0]!;
    await ctx.audit(q, 'exception.log', 'ALLOWED', agg(code), { issue: issueCode, test, value: Number(r.measured_value), upper: n(r.upper), lower: n(r.lower), basis: r.criterion_version === null ? 'commissioning standard' : 'site criterion' });
    return viewOf(r);
  });
}

/** Approve or reject an exception record: never by its logger, once. */
export async function decide(ctx: RequestContext, code: string, body: { decision?: string; note?: string }) {
  await ctx.require(DECIDE_AUTHORITIES, 'decide a measured exception', agg(code));
  return ctx.tx(async (q) => {
    const r = (await q.query<Row>(`SELECT ${COLS} FROM app.measured_exception x JOIN app.room_issue i ON i.id = x.issue_id WHERE x.code = $1 FOR UPDATE OF x`, [code])).rows[0];
    if (!r) throw notFound(`exception ${code}`);
    await findRoom(ctx, q, r.room_id);
    if (!['APPROVED', 'REJECTED'].includes(String(body.decision))) throw invalid('decision is APPROVED or REJECTED');
    await ctx.separate('exception.decide', agg(code), [r.logged_by], 'an exception record');
    if (r.state !== 'REQUESTED') await ctx.refuse('exception.decide', agg(code), [`${code} was decided already (${r.state})`]);
    if (body.decision === 'REJECTED' && String(body.note ?? '').trim().length < 5) await ctx.refuse('exception.decide', agg(code), ['a rejection says why']);
    await q.query('UPDATE app.measured_exception SET state = $2, decided_by = $3, decided_at = now(), decision_note = $4 WHERE id = $1', [r.id, body.decision, ctx.p.personId, String(body.note ?? '').trim() || null]);
    const out = (await q.query<Row>(`SELECT ${COLS} FROM app.measured_exception x JOIN app.room_issue i ON i.id = x.issue_id WHERE x.id = $1`, [r.id])).rows[0]!;
    await ctx.audit(q, 'exception.decide', 'ALLOWED', agg(code), { decision: body.decision, issue: r.issue });
    return { ...viewOf(out), next: body.decision === 'APPROVED' ? `except ${r.issue} on ${code}: POST /v1/issues/${r.issue}/deficiency {"step":"except","exceptionRef":"${code}"} by someone holding baseline.approve who did not log it` : 'the deficiency stays open: fix it and measure again, or log a new exception record' };
  });
}

/** The exception records of a room. */
export async function ofRoom(ctx: RequestContext, ref: string) {
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref);
    const rows = (await q.query<Row>(`SELECT ${COLS} FROM app.measured_exception x JOIN app.room_issue i ON i.id = x.issue_id WHERE x.room_id = $1 ORDER BY x.logged_at, x.code`, [room.id])).rows;
    return { room: room.code, items: rows.map(viewOf), may: { log: ctx.can(LOG_AUTHORITIES), decide: ctx.can(DECIDE_AUTHORITIES) } };
  });
}

/** For the except step: the approved record a measured deficiency is excepted on, or why it may not be (null when the rule does not apply). */
export async function forExcept(q: Queryable, issueId: string, roomId: string, key: string, ref: string): Promise<{ why: string[]; loggedBy: string | null } | null> {
  const test = /^test-failed:(.+)$/.exec(key)?.[1];
  const tenant = (await q.query<{ tenant_id: string }>('SELECT tenant_id FROM app.room WHERE id = $1', [roomId])).rows[0]?.tenant_id;
  if (!test || !tenant || !(await route(q, tenant, roomId, test))) return null;
  const e = (await q.query<{ code: string; state: string; logged_by: string }>("SELECT code, state, logged_by FROM app.measured_exception WHERE issue_id = $1 ORDER BY logged_at DESC", [issueId])).rows;
  const hit = e.find((x) => x.code === ref.trim());
  if (!hit) return { why: [`a failed measured test is excepted on its own exception record: log one (POST /v1/issues/{issue}/measured-exception)${e.length ? ` — this deficiency's: ${e.map((x) => `${x.code} ${x.state}`).join(', ')}` : ''}`], loggedBy: null };
  if (hit.state !== 'APPROVED') return { why: [`${hit.code} is ${hit.state}: only an approved exception record excepts the deficiency`], loggedBy: hit.logged_by };
  return { why: [], loggedBy: hit.logged_by };
}

/** The applicable tests of a room whose current FAIL is covered by an approved exception record and an excepted deficiency. */
export async function exceptedTests(q: Queryable, roomId: string): Promise<string[]> {
  return (await q.query<{ test_id: string }>(`SELECT x.test_id FROM app.measured_exception x JOIN app.room_issue i ON i.id = x.issue_id
      JOIN app.current_result c ON c.room_id = x.room_id AND c.test_id = x.test_id JOIN app.test_result r ON r.id = c.result_id
     WHERE x.room_id = $1 AND x.state = 'APPROVED' AND i.workflow = 'ACCEPTED_EXCEPTION' AND i.exception_ref = x.code AND r.state = 'FAIL' AND r.measurement_id = x.measurement_id`, [roomId])).rows.map((r) => r.test_id);
}
