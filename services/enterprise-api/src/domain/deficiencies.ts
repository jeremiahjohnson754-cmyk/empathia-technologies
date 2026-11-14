/**
 * The deficiency workflow over the API (migration 0032; the state machine is @empathia/commissioning-engine deficiencies.ts, the same one
 * the demonstration uses). Each step is checked three times: the step's authority (here), the engine's rules with the actor and what the
 * step rests on (here), and the database's guard trigger (for every writer, the runtime role included). Each step is written to
 * app.issue_event as a 'workflow' event and to the audit trail; a refusal is audited as DENIED with the engine's reasons.
 *
 * The server is stricter than the engine in two places, by design: a High or Critical deficiency is never deferred (acceptance waits for
 * it), and the role that owns a deficiency does not approve its deferral.
 */
import { step, ROOT_CAUSES, type Deficiency, type DeficiencyAction, type DeficiencyState } from '@empathia/commissioning-engine';
import type { RequestContext } from '../auth/context.js';
import { findRoom } from './rooms.js';
import { invalid, notFound } from '../http/errors.js';

export const STEP_AUTHORITY: Record<DeficiencyAction['kind'], string[]> = {
  start: ['deficiency.open', 'issue.assign'], fixed: ['work.evidence', 'deviation.raise'],
  retest: ['tests.verify.all', 'test.verify', 'test.verify.audio', 'test.verify.video', 'test.verify.control'],
  verify: ['tests.verify.all', 'baseline.approve'], except: ['baseline.approve'], defer: ['issue.assign', 'baseline.approve'],
  resume: ['deficiency.open', 'issue.assign'], reopen: ['service.reopen', 'deficiency.open'],
};
export const ANY_STEP_AUTHORITY = [...new Set(Object.values(STEP_AUTHORITY).flat())];
const KINDS = Object.keys(STEP_AUTHORITY) as Array<DeficiencyAction['kind']>;

interface Row {
  id: string; code: string; room_id: string; title: string; check_name: string; severity: 'Critical' | 'High' | 'Medium' | 'Low'; state: string; workflow: DeficiencyState;
  owner_role: string | null; target_date: string | null; root_cause: string | null; corrective_action: string | null; fixed_by: string | null;
  retest: Deficiency['retest']; exception_ref: string | null; exception_requested_by: string | null; exception_approved_by: string | null;
  deferral: Deficiency['deferral']; closed_by: string | null; created_at: string; resolution: unknown;
}
const COLS = `id, code, room_id, title, check_name, severity, state, workflow, owner_role, to_char(target_date, 'YYYY-MM-DD') AS target_date, root_cause, corrective_action,
  fixed_by, retest, exception_ref, exception_requested_by, exception_approved_by, deferral, closed_by, created_at, resolution`;

/** what a deficiency is against decides whether it may be excepted: safety, security, evidence, tenant isolation and separation of duties
 *  are never open to exception (the demonstration reads the same words) */
const NOT_WAIVABLE = /earth|ground|safety|fall|rig|mount|load|security|password|credential|tenant|evidence|separation/i;
export const waivable = (r: { title: string; check_name: string }) => !NOT_WAIVABLE.test(`${r.title} ${r.check_name}`);
function toEngine(r: Row): Deficiency {
  return { id: r.code, title: r.title, severity: r.severity, state: r.workflow, waivable: waivable(r), owner: null, openedAt: new Date(r.created_at).toISOString(),
    targetDate: r.target_date, rootCause: r.root_cause as Deficiency['rootCause'], action: r.corrective_action, fixedBy: r.fixed_by, retest: r.retest,
    exception: r.exception_ref ? { id: r.exception_ref, requestedBy: r.exception_requested_by || '', approvedBy: r.exception_approved_by || '' } : null,
    deferral: r.deferral, closedBy: r.closed_by, history: [] };
}
const view = (r: Row) => ({ issueId: r.code, state: r.state, workflow: r.workflow, severity: r.severity, waivable: waivable(r), ownerRole: r.owner_role, targetDate: r.target_date, rootCause: r.root_cause,
  correctiveAction: r.corrective_action, fixedBy: r.fixed_by, retest: r.retest, exception: r.exception_ref ? { ref: r.exception_ref, requestedBy: r.exception_requested_by, approvedBy: r.exception_approved_by } : null,
  deferral: r.deferral, closedBy: r.closed_by });

/** the body of one step, checked for shape before anything else (422 with the field named) */
function actionOf(body: Record<string, unknown>): DeficiencyAction {
  const k = String(body['step'] || '') as DeficiencyAction['kind']; const s = (n: string) => String(body[n] ?? '');
  if (!KINDS.includes(k)) throw invalid(`step is one of ${KINDS.join(', ')}`);
  switch (k) {
    case 'start': if (!/^[a-z_]{2,40}$/.test(s('ownerRole'))) throw invalid('ownerRole is a role key'); return { kind: k, owner: s('ownerRole'), targetDate: s('targetDate') };
    case 'fixed': if (!(ROOT_CAUSES as readonly string[]).includes(s('rootCause'))) throw invalid(`rootCause is one of ${ROOT_CAUSES.join(', ')}`); return { kind: k, rootCause: s('rootCause') as never, action: s('action').slice(0, 2000) };
    case 'retest': if (!['PASS', 'FAIL'].includes(s('result'))) throw invalid('result is PASS or FAIL'); return { kind: k, result: s('result') as 'PASS' | 'FAIL', evidence: s('evidence').slice(0, 120) };
    case 'verify': return { kind: k };
    case 'except': return { kind: k, exceptionId: s('exceptionRef').slice(0, 80), requestedBy: s('requestedBy') };
    case 'defer': return { kind: k, reason: s('reason').slice(0, 1000), until: s('until'), acceptanceDue: true };
    case 'resume': return { kind: k, reason: s('reason').slice(0, 1000) };
    case 'reopen': return { kind: k, reason: s('reason').slice(0, 1000) };
  }
}

export async function deficiencyStep(ctx: RequestContext, issueCode: string, body: Record<string, unknown>) {
  const a = actionOf(body || {}); const target = { type: 'RoomIssue', id: issueCode };
  await ctx.require(STEP_AUTHORITY[a.kind], `deficiency.${a.kind}`, target);
  return ctx.tx(async (q) => {
    const r = (await q.query<Row>(`SELECT ${COLS} FROM app.room_issue WHERE code = $1 FOR UPDATE`, [issueCode])).rows[0];
    if (!r) throw notFound(`issue ${issueCode}`);
    await findRoom(ctx, q, r.room_id);                                   // site scope applies to issues through their room
    const why: string[] = [];
    if (a.kind === 'start' && !(await q.query('SELECT 1 FROM app.role WHERE key = $1', [a.owner])).rowCount) throw invalid(`unknown role ${a.owner}`);
    if (a.kind === 'except') {
      if (!/^[0-9a-f-]{36}$/.test(a.requestedBy) || !(await q.query('SELECT 1 FROM app.person WHERE id = $1', [a.requestedBy])).rowCount) throw invalid('requestedBy is the person who asked for the exception');
    }
    if (a.kind === 'defer' && r.owner_role && r.owner_role === ctx.p.role) why.push('the role that owns the deficiency does not approve its deferral');
    const now = new Date().toISOString(); const res = step(toEngine(r), a, ctx.p.personId, now);
    if (!res.ok) why.push(...res.why);
    if (why.length) await ctx.refuse(`deficiency.${a.kind}`, target, why, { from: r.workflow });
    const n = (res as { ok: true; next: Deficiency }).next; const last = n.history[n.history.length - 1]!;
    const closing = n.state === 'CLOSED'; const reopening = a.kind === 'reopen';
    const resolution = closing ? { at: now, by: ctx.p.personId, byRole: ctx.p.role, how: `deficiency verified closed on ${n.retest?.evidence} (retest by ${n.retest?.by}, fixed by ${n.fixedBy})` } : null;
    const u = (await q.query<Row>(`UPDATE app.room_issue SET workflow = $2, owner_role = $3, target_date = $4, root_cause = $5, corrective_action = $6, fixed_by = $7, retest = $8,
        exception_ref = $9, exception_requested_by = $10, exception_approved_by = $11, deferral = $12, closed_by = $13,
        state = CASE WHEN $2 = 'CLOSED' THEN 'RESOLVED' ELSE 'OPEN' END, resolution = CASE WHEN $2 = 'CLOSED' THEN $14::jsonb ELSE NULL END
      WHERE id = $1 RETURNING ${COLS}`,
      [r.id, n.state, a.kind === 'start' ? n.owner : r.owner_role, n.targetDate, n.rootCause, n.action, n.fixedBy, n.retest ? JSON.stringify(n.retest) : null,
        n.exception?.id ?? null, n.exception?.requestedBy || null, n.exception?.approvedBy || null, n.deferral ? JSON.stringify(n.deferral) : null, n.closedBy, resolution ? JSON.stringify(resolution) : null])).rows[0]!;
    await q.query('INSERT INTO app.issue_event (tenant_id, issue_id, kind, detail, actor_id) VALUES ($1,$2,$3,$4,$5)', [ctx.p.tenantId, r.id, 'workflow', { step: a.kind, from: r.workflow, to: n.state, note: last.note, byRole: ctx.p.role }, ctx.p.personId]);
    if (closing || reopening) {
      const room = await findRoom(ctx, q, r.room_id);
      await ctx.emit(q, 'issue.created_or_updated', { type: 'RoomIssue', id: r.code, rev: 2 }, { issueId: r.code, status: closing ? 'RESOLVED' : 'OPEN', change: closing ? 'resolved' : 'reopened', roomId: room.code });
    }
    await ctx.audit(q, `deficiency.${a.kind}`, 'ALLOWED', target, { from: r.workflow, to: n.state });
    return view(u);
  });
}

export async function deficiencyOf(ctx: RequestContext, issueCode: string) {
  return ctx.tx(async (q) => {
    const r = (await q.query<Row>(`SELECT ${COLS} FROM app.room_issue WHERE code = $1`, [issueCode])).rows[0];
    if (!r) throw notFound(`issue ${issueCode}`);
    await findRoom(ctx, q, r.room_id);
    const history = (await q.query<{ detail: Record<string, unknown>; at: string; actor_id: string | null }>(`SELECT detail, at, actor_id FROM app.issue_event WHERE issue_id = $1 AND kind = 'workflow' ORDER BY id`, [r.id])).rows;
    return { ...view(r), history: history.map((h) => ({ ...h.detail, at: h.at, by: h.actor_id })) };
  });
}
