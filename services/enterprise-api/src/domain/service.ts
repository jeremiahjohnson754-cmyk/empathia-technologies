/**
 * ServiceHands (P6-A): the work order on @empathia/service-engine's governed machine, persisted.
 *   OPEN → TRIAGED → ASSIGNED → ACCEPTED → IN_PROGRESS → VERIFYING → RESOLVED → CLOSED; RESOLVED → REOPENED → TRIAGED.
 * Every step: authority (central, before the body), the engine's guard with its reasons, the row update, an append-only
 * work-order event, the audit record and the contract-validated domain event — in one transaction. Site scope reaches a
 * work order only through its room (RT-02). Closing a work order never passes a commissioning test.
 */
import { SERVICE_TRANSITIONS, WORK_NEEDS, SLA, candidates as rankCandidates, preflight as runPreflight, serviceBlockers, type ServiceState, type Staff, type ServiceFacts, type Candidate } from '@empathia/service-engine';
import type { Queryable } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import { invalid, notFound } from '../http/errors.js';
import { verifiedCerts } from './competency.js';

export interface WorkOrderRow {
  id: string; tenant_id: string; issue_id: string; code: string; state: ServiceState; assigned_role: string; note: string; created_by: string; created_at: string;
  closed_by: string | null; closed_at: string | null; closing_note: string | null;
  work_type: string; severity: string | null; triage: { scope: string; risk: string; byRole: string; at: string } | null; window_from: string | null; window_to: string | null;
  assigned_to: string | null; assignment: Record<string, unknown> | null; accepted_at: string | null; preflight: { ok: boolean; checks: unknown[]; at: string } | null; started_at: string | null;
  evidence: Array<{ kind: string; note: string; ref: string | null; recorderId: string; at: string }>; verification: { outcome: string; note: string; verifierId: string; at: string } | null;
  reopen_count: number; customer_confirmed: boolean;
  // joined
  issue_code: string; issue_title: string; room_id: string; room_code: string; room_name: string; building_key: string; site_id: string; assignee_name: string | null;
}

const SELECT = `SELECT w.*, i.code AS issue_code, i.title AS issue_title, r.id AS room_id, r.code AS room_code, r.name AS room_name, b.code AS building_key, b.site_id, p.display_name AS assignee_name
  FROM app.work_order w JOIN app.room_issue i ON i.id = w.issue_id AND i.tenant_id = w.tenant_id JOIN app.room r ON r.id = i.room_id AND r.tenant_id = i.tenant_id
  JOIN app.building b ON b.id = r.building_id AND b.tenant_id = r.tenant_id LEFT JOIN app.person p ON p.id = w.assigned_to`;
const scope = (ctx: RequestContext, n: number) => (ctx.p.siteScope && ctx.p.siteScope.length ? { sql: ` AND b.site_id = ANY($${n}::uuid[])`, args: [ctx.p.siteScope] } : { sql: '', args: [] as unknown[] });

async function find(ctx: RequestContext, q: Queryable, code: string, lock = false): Promise<WorkOrderRow> {
  const sc = scope(ctx, 2);
  const r = (await q.query<WorkOrderRow>(`${SELECT} WHERE w.code = $1${sc.sql}${lock ? ' FOR UPDATE OF w' : ''}`, [code, ...sc.args])).rows[0];
  if (!r) throw notFound(`work order ${code}`);
  return r;
}

export async function listWorkOrders(ctx: RequestContext, state?: string) {
  const sc = scope(ctx, 2);
  const rows = (await ctx.tx((q) => q.query<WorkOrderRow>(`${SELECT} WHERE ($1::text IS NULL OR w.state = $1)${sc.sql} ORDER BY w.created_at DESC LIMIT 200`, [state || null, ...sc.args]))).rows;
  return { items: rows.map(summary), states: SERVICE_TRANSITIONS.map((t) => ({ from: t.from, to: t.to, authority: t.authority, guard: t.guard })) };
}

const summary = (w: WorkOrderRow) => ({ code: w.code, state: w.state, workType: w.work_type, severity: w.severity, sla: w.severity ? SLA[w.severity as keyof typeof SLA] : null, issue: { code: w.issue_code, title: w.issue_title }, room: { code: w.room_code, name: w.room_name, building: w.building_key }, assignee: w.assigned_to ? { id: w.assigned_to, name: w.assignee_name } : null, createdAt: w.created_at, reopenCount: w.reopen_count, evidenceCount: w.evidence.length });

const facts = (ctx: RequestContext, w: WorkOrderRow, extra: Partial<ServiceFacts> = {}): ServiceFacts => ({
  state: w.state, actorId: ctx.p.personId, technicianId: w.assigned_to, recorderIds: w.evidence.map((e) => e.recorderId), severity: w.severity || undefined, roomId: w.room_code,
  preflightOk: w.preflight?.ok, evidence: w.evidence.length, verifiedBy: w.verification?.outcome === 'pass' ? w.verification.verifierId : undefined,
  customerPolicy: { needsCustomerConfirmation: w.severity !== 'Standard', confirmed: w.customer_confirmed }, ...extra,
});

/** The next governed steps for this caller: transitions from the state, with the authority and whether the caller holds it, and the current blockers. */
function nextSteps(ctx: RequestContext, w: WorkOrderRow) {
  return SERVICE_TRANSITIONS.filter((t) => t.from === w.state).map((t) => ({ to: t.to, authority: t.authority, guard: t.guard, yours: ctx.can(t.authority), blockers: serviceBlockers(t.to, facts(ctx, w)) }));
}

async function step(ctx: RequestContext, q: Queryable, w: WorkOrderRow, to: ServiceState, action: string, extra: Partial<ServiceFacts> = {}, detail: Record<string, unknown> = {}) {
  const t = SERVICE_TRANSITIONS.find((x) => x.from === w.state && x.to === to);
  const why = t ? serviceBlockers(to, facts(ctx, w, extra)) : [`no transition ${w.state} → ${to}: a job moves one governed step at a time`];
  if (why.length) await ctx.refuse(action, { type: 'WorkOrder', id: w.code }, why, { from: w.state, to });
  await q.query('INSERT INTO app.work_order_event (tenant_id, work_order_id, kind, detail, actor_id) VALUES ($1,$2,$3,$4,$5)', [ctx.p.tenantId, w.id, action, { from: w.state, to, byRole: ctx.p.role, ...detail }, ctx.p.personId]);
  await q.query('INSERT INTO app.issue_event (tenant_id, issue_id, kind, detail, actor_id) VALUES ($1,$2,$3,$4,$5)', [ctx.p.tenantId, w.issue_id, 'work_order', { workOrder: w.code, state: to, ...detail }, ctx.p.personId]);
  await ctx.audit(q, action, 'ALLOWED', { type: 'WorkOrder', id: w.code }, { from: w.state, to, ...detail });
}

/** The staff pool the hard gates read: everyone in the tenant who may accept work, with a profile; without one they are ineligible for a stated reason. */
async function pool(ctx: RequestContext, q: Queryable): Promise<Array<Staff & { profiled: boolean }>> {
  const rows = (await q.query<{ person_id: string; display_name: string; internal: boolean | null; org_name: string | null; building_key: string | null; sites: string[] | null; skills: Staff['skills'] | null; leave_from: string | null; leave_to: string | null; capacity_hours: number | null; agreement: Staff['agreement'] | null; open_jobs: number }>(
    `SELECT DISTINCT ON (m.person_id) m.person_id, p.display_name, s.internal, s.org_name, s.building_key, s.sites, s.skills, s.leave_from::text, s.leave_to::text, s.capacity_hours, s.agreement,
            (SELECT count(*) FROM app.work_order w WHERE w.assigned_to = m.person_id AND w.state IN ('ASSIGNED','ACCEPTED','IN_PROGRESS','VERIFYING')) AS open_jobs
       FROM app.membership m JOIN app.role r ON r.key = m.role_key JOIN app.person p ON p.id = m.person_id LEFT JOIN app.staff_profile s ON s.tenant_id = m.tenant_id AND s.person_id = m.person_id
      WHERE 'work.accept' = ANY(r.authorities) AND NOT p.disabled ORDER BY m.person_id`)).rows;
  // ADR-0009: certifications come only from verified competency records (independent verifier, not revoked); staff_profile.certs is not read
  const certs = await verifiedCerts(q, rows.map((x) => x.person_id));
  return rows.map((x) => ({ id: x.person_id, name: x.display_name, internal: x.internal ?? true, orgName: x.org_name || undefined, buildingKey: x.building_key, sites: x.sites || [], skills: x.skills || {}, certs: certs.get(x.person_id) || {},
    leave: x.leave_from ? { from: x.leave_from, to: x.leave_to || x.leave_from } : null, capacity: { remaining: Math.max(0, (x.capacity_hours ?? 0) - Number(x.open_jobs) * 4) }, agreement: x.agreement || null, profiled: !!x.sites } as Staff & { profiled: boolean }));
}

function rank(ctx: RequestContext, staff: Array<Staff & { profiled: boolean }>, w: WorkOrderRow) {
  const today = new Date().toISOString().slice(0, 10);
  const out = rankCandidates(staff, { workType: w.work_type, scope: { roomId: w.room_code, buildingKey: w.building_key }, window: w.window_from ? { from: w.window_from, to: w.window_to || w.window_from } : null, excludeIds: [w.created_by] }, today);
  // a person without a staff profile fails on the facts, and the reason says so rather than hiding behind the gates
  const noProfile = new Set(staff.filter((s) => !s.profiled).map((s) => s.id));
  const mark = (c: Candidate) => (noProfile.has(c.id) ? { ...c, hardOk: false, hardFails: ['no staff profile on record (certifications, sites and capacity unknown)', ...c.hardFails] } : c);
  return { need: out.need, eligible: out.eligible.filter((c) => !noProfile.has(c.id)), ineligible: [...out.ineligible.map(mark), ...out.eligible.filter((c) => noProfile.has(c.id)).map(mark)], none: out.eligible.filter((c) => !noProfile.has(c.id)).length === 0, whyNone: out.whyNone, today };
}

export const RECURRENCE_WINDOW_DAYS = 90;
/** Incident recurrence, derived from records only: earlier work orders on the same issue (an issue is unique per room and finding key,
 *  and commissioning re-opens it when the finding returns) created within the window before this one, and this job's own reopenings. */
export async function recurrenceOf(q: Queryable, w: WorkOrderRow) {
  const prior = (await q.query<{ code: string; state: string; created_at: string; closed_at: string | null; reopen_count: number }>(
    `SELECT code, state, created_at, closed_at, reopen_count FROM app.work_order WHERE issue_id = $1 AND id <> $2 AND created_at < $3 AND created_at >= $3::timestamptz - make_interval(days => $4) ORDER BY created_at DESC`,
    [w.issue_id, w.id, w.created_at, RECURRENCE_WINDOW_DAYS])).rows;
  return { recurring: prior.length > 0 || w.reopen_count > 0, priorWorkOrders: prior.map((x) => ({ code: x.code, state: x.state, createdAt: x.created_at, closedAt: x.closed_at, reopenCount: x.reopen_count })), reopenCount: w.reopen_count, windowDays: RECURRENCE_WINDOW_DAYS,
    basis: `earlier work orders on the same issue (same room, same finding) within ${RECURRENCE_WINDOW_DAYS} days, and this job's reopenings` };
}

export async function getWorkOrder(ctx: RequestContext, code: string) {
  return ctx.tx(async (q) => {
    const w = await find(ctx, q, code);
    const events = (await q.query<{ kind: string; detail: Record<string, unknown>; actor_id: string | null; at: string; actor: string | null }>('SELECT e.kind, e.detail, e.actor_id, e.at, p.display_name AS actor FROM app.work_order_event e LEFT JOIN app.person p ON p.id = e.actor_id WHERE e.work_order_id = $1 ORDER BY e.id', [w.id])).rows;
    const cands = (w.state === 'TRIAGED' && ctx.can('service.assign')) ? rank(ctx, await pool(ctx, q), w) : null;
    const need = WORK_NEEDS[w.work_type] || WORK_NEEDS['break_fix']!;
    const recurrence = await recurrenceOf(q, w);
    return { ...summary(w), recurrence, note: w.note, triage: w.triage, window: w.window_from ? { from: w.window_from, to: w.window_to } : null, assignment: w.assignment, acceptedAt: w.accepted_at, preflight: w.preflight, startedAt: w.started_at, evidence: w.evidence, verification: w.verification,
      customerPolicy: { needsCustomerConfirmation: w.severity !== 'Standard', confirmed: w.customer_confirmed }, closedAt: w.closed_at, closingNote: w.closing_note, need: { certs: need.certs, experience: need.experience, tools: need.tools, parts: need.parts },
      nextSteps: nextSteps(ctx, w), candidates: cands, events, workTypes: Object.keys(WORK_NEEDS), severities: Object.keys(SLA) };
  });
}

export async function triage(ctx: RequestContext, code: string, body: { severity: string; scope: string; risk: string; workType?: string; window?: { from: string; to?: string } | null }) {
  await ctx.require('service.triage', 'triage a work order', { type: 'WorkOrder', id: code });
  if (body.workType && !WORK_NEEDS[body.workType]) throw invalid(`unknown work type ${body.workType}`, Object.keys(WORK_NEEDS));
  return ctx.tx(async (q) => {
    const w = await find(ctx, q, code, true);
    await step(ctx, q, w, 'TRIAGED', 'work_order.triage', { severity: body.severity, roomId: w.room_code }, { severity: body.severity, scope: body.scope, risk: body.risk, workType: body.workType || w.work_type });
    await q.query("UPDATE app.work_order SET state = 'TRIAGED', severity = $2, triage = $3, work_type = $4, window_from = $5, window_to = $6, assigned_to = NULL, assignment = NULL, accepted_at = NULL, preflight = NULL, started_at = NULL, verification = NULL WHERE id = $1",
      [w.id, body.severity, { scope: body.scope, risk: body.risk, byRole: ctx.p.role, at: new Date().toISOString() }, body.workType || w.work_type, body.window?.from ?? null, body.window?.to ?? body.window?.from ?? null]);
    return { workOrderId: code, state: 'TRIAGED', severity: body.severity, sla: SLA[body.severity as keyof typeof SLA] };
  });
}

export async function candidatesFor(ctx: RequestContext, code: string) {
  await ctx.require('service.assign', 'rank candidates', { type: 'WorkOrder', id: code });
  return ctx.tx(async (q) => { const w = await find(ctx, q, code); return { workOrderId: code, state: w.state, ...rank(ctx, await pool(ctx, q), w) }; });
}

/** For Search Party's "who is qualified" question: the hard-gated candidates of the triaged work order remedying an issue — the same
 *  gates and the same pool as assignment; null when there is no triaged work order or the caller may not see rankings. */
export async function qualifiedForIssue(ctx: RequestContext, q: Queryable, issueCode: string) {
  if (!ctx.can('service.assign')) return null;
  const wo = (await q.query<{ code: string }>("SELECT w.code FROM app.work_order w JOIN app.room_issue i ON i.id = w.issue_id WHERE i.code = $1 AND w.state = 'TRIAGED' ORDER BY w.created_at DESC LIMIT 1", [issueCode])).rows[0];
  if (!wo) return null;
  const r = rank(ctx, await pool(ctx, q), await find(ctx, q, wo.code));
  return { workOrder: wo.code, eligible: r.eligible.map((c) => ({ id: c.id, name: c.name, reasons: c.reasons })), ineligible: r.ineligible.map((c) => ({ id: c.id, name: c.name, fails: c.hardFails })), provenance: 'ServiceHands hard gates over verified competency records (app.competency_record), sites, leave and capacity' };
}

export async function assign(ctx: RequestContext, code: string, personId: string) {
  await ctx.require('service.assign', 'assign a work order', { type: 'WorkOrder', id: code });
  return ctx.tx(async (q) => {
    const w = await find(ctx, q, code, true);
    const ranked = rank(ctx, await pool(ctx, q), w);
    const chosen = ranked.eligible.find((c) => c.id === personId); const rejected = ranked.ineligible.find((c) => c.id === personId);
    if (!chosen && !rejected) await ctx.refuse('work_order.assign', { type: 'WorkOrder', id: code }, ['the chosen person is not in this organization’s service pool']);
    if (rejected) await ctx.refuse('work_order.assign', { type: 'WorkOrder', id: code }, ['the chosen technician fails a hard gate', ...rejected.hardFails], { technicianId: personId });
    await step(ctx, q, w, 'ASSIGNED', 'work_order.assign', { technicianId: personId, eligible: !!chosen }, { technicianId: personId, ...(chosen ? { score: chosen.score, reasons: chosen.reasons } : { hardFails: rejected!.hardFails }) });
    await q.query("UPDATE app.work_order SET state = 'ASSIGNED', assigned_to = $2, assignment = $3 WHERE id = $1", [w.id, personId, { score: chosen!.score, reasons: chosen!.reasons, rankedAt: new Date().toISOString(), today: ranked.today }]);
    await ctx.emit(q, 'work_order.assigned', { type: 'WorkOrder', id: code, rev: 2 }, { workOrderId: code, techId: personId, siteScope: w.site_id });
    return { workOrderId: code, state: 'ASSIGNED', technicianId: personId, score: chosen!.score, reasons: chosen!.reasons };
  });
}

export async function accept(ctx: RequestContext, code: string) {
  await ctx.require('work.accept', 'accept a work order', { type: 'WorkOrder', id: code });
  return ctx.tx(async (q) => {
    const w = await find(ctx, q, code, true);
    await step(ctx, q, w, 'ACCEPTED', 'work_order.accept');
    await q.query("UPDATE app.work_order SET state = 'ACCEPTED', accepted_at = now() WHERE id = $1", [w.id]);
    await ctx.emit(q, 'work_order.accepted', { type: 'WorkOrder', id: code, rev: 3 }, { workOrderId: code, techId: ctx.p.personId });
    return { workOrderId: code, state: 'ACCEPTED' };
  });
}

export interface PreflightBody { bookings?: Array<{ from: string; to?: string }>; stock?: Record<string, { onHand: number; checkedAt?: string }>; accessConfirmedBy?: string | null; safetyBriefed?: boolean; heightPermit?: boolean; toolsConfirmed?: string[] }
/** Records the dispatch preflight against the work type's needs. Every check is stored; a failed one blocks the start. The technician who holds the job records it. */
export async function recordPreflight(ctx: RequestContext, code: string, body: PreflightBody) {
  await ctx.require('work.start', 'record a dispatch preflight', { type: 'WorkOrder', id: code });
  return ctx.tx(async (q) => {
    const w = await find(ctx, q, code, true);
    if (w.state !== 'ACCEPTED') await ctx.refuse('work_order.preflight', { type: 'WorkOrder', id: code }, [`the preflight is recorded on an accepted job (state ${w.state})`]);
    if (w.assigned_to !== ctx.p.personId) await ctx.refuse('work_order.preflight', { type: 'WorkOrder', id: code }, ['the assigned technician records the preflight']);
    const need = WORK_NEEDS[w.work_type] || WORK_NEEDS['break_fix']!;
    const today = Date.now();
    const parts = need.parts.map((part) => { const s = body.stock?.[part]; const age = s?.checkedAt ? Math.floor((today - Date.parse(s.checkedAt)) / 86400000) : undefined; return { part, qty: 1, stock: s ? { known: true, onHand: s.onHand, checkedAt: s.checkedAt, ageDays: age, stale: age != null && age > 7 } : { known: false, onHand: 0 } }; });
    const result = runPreflight({ window: w.window_from ? { from: w.window_from, to: w.window_to || w.window_from } : null, bookings: body.bookings || [], parts, access: body.accessConfirmedBy ? { confirmedBy: body.accessConfirmedBy } : null, safety: { briefed: !!body.safetyBriefed, heightPermit: !!body.heightPermit }, needs: need, tools: need.tools, toolsConfirmed: body.toolsConfirmed || [], approval: { ok: true, why: `job ${code} assigned by the service manager and accepted ${w.accepted_at}` } });
    const stored = { ...result, at: new Date().toISOString() };
    await q.query('UPDATE app.work_order SET preflight = $2 WHERE id = $1', [w.id, stored]);
    await q.query('INSERT INTO app.work_order_event (tenant_id, work_order_id, kind, detail, actor_id) VALUES ($1,$2,$3,$4,$5)', [ctx.p.tenantId, w.id, 'work_order.preflight', { ok: result.ok, failed: result.checks.filter((c) => !c.ok).map((c) => c.id) }, ctx.p.personId]);
    await ctx.audit(q, 'work_order.preflight', 'ALLOWED', { type: 'WorkOrder', id: code }, { ok: result.ok });
    return { workOrderId: code, ...stored };
  });
}

export async function start(ctx: RequestContext, code: string) {
  await ctx.require('work.start', 'start a work order', { type: 'WorkOrder', id: code });
  return ctx.tx(async (q) => {
    const w = await find(ctx, q, code, true);
    await step(ctx, q, w, 'IN_PROGRESS', 'work_order.start');
    await q.query("UPDATE app.work_order SET state = 'IN_PROGRESS', started_at = now() WHERE id = $1", [w.id]);
    return { workOrderId: code, state: 'IN_PROGRESS' };
  });
}

export async function addEvidence(ctx: RequestContext, code: string, body: { kind: string; note: string; ref?: string | null }) {
  await ctx.require('work.evidence', 'record field evidence', { type: 'WorkOrder', id: code });
  return ctx.tx(async (q) => {
    const w = await find(ctx, q, code, true);
    if (!['IN_PROGRESS', 'VERIFYING'].includes(w.state)) await ctx.refuse('work_order.evidence', { type: 'WorkOrder', id: code }, [`field evidence is recorded while the work is in progress (state ${w.state})`]);
    if (w.assigned_to !== ctx.p.personId) await ctx.refuse('work_order.evidence', { type: 'WorkOrder', id: code }, ['the assigned technician records the work']);
    const item = { kind: body.kind, note: body.note, ref: body.ref || null, recorderId: ctx.p.personId, at: new Date().toISOString() };
    await q.query("UPDATE app.work_order SET evidence = evidence || $2::jsonb WHERE id = $1", [w.id, JSON.stringify([item])]);
    await q.query('INSERT INTO app.work_order_event (tenant_id, work_order_id, kind, detail, actor_id) VALUES ($1,$2,$3,$4,$5)', [ctx.p.tenantId, w.id, 'work_order.evidence', { kind: body.kind, ref: body.ref || null }, ctx.p.personId]);
    await ctx.audit(q, 'work_order.evidence', 'ALLOWED', { type: 'WorkOrder', id: code }, { kind: body.kind });
    return { workOrderId: code, state: w.state, evidenceCount: w.evidence.length + 1 };
  });
}

export async function submit(ctx: RequestContext, code: string) {
  await ctx.require('work.evidence', 'hand a work order over for verification', { type: 'WorkOrder', id: code });
  return ctx.tx(async (q) => {
    const w = await find(ctx, q, code, true);
    await step(ctx, q, w, 'VERIFYING', 'work_order.submit', {}, { evidence: w.evidence.length });
    await q.query("UPDATE app.work_order SET state = 'VERIFYING', verification = NULL WHERE id = $1", [w.id]);
    await ctx.emit(q, 'service.field_completed', { type: 'WorkOrder', id: code, rev: 4 }, { workOrderId: code });
    return { workOrderId: code, state: 'VERIFYING', note: 'Field work recorded. The commissioning lead verifies; a work order never passes a test by itself.' };
  });
}

/** Independent verification: pass → RESOLVED; fail is recorded and the job stays VERIFYING for more field work (the technician records and resubmits). */
export async function verify(ctx: RequestContext, code: string, body: { outcome: 'pass' | 'fail'; note: string }) {
  await ctx.require('service.verify', 'verify a work order', { type: 'WorkOrder', id: code });
  return ctx.tx(async (q) => {
    const w = await find(ctx, q, code, true);
    if (w.state !== 'VERIFYING') await ctx.refuse('work_order.verify', { type: 'WorkOrder', id: code }, [`verification happens on a job handed over for it (state ${w.state})`]);
    const why = serviceBlockers('RESOLVED', facts(ctx, w));   // separation of duties applies to pass and fail alike
    if (why.length) await ctx.refuse('work_order.verify', { type: 'WorkOrder', id: code }, why);
    const v = { outcome: body.outcome, note: body.note, verifierId: ctx.p.personId, at: new Date().toISOString() };
    if (body.outcome === 'fail') {
      await q.query('UPDATE app.work_order SET verification = $2 WHERE id = $1', [w.id, v]);
      await q.query('INSERT INTO app.work_order_event (tenant_id, work_order_id, kind, detail, actor_id) VALUES ($1,$2,$3,$4,$5)', [ctx.p.tenantId, w.id, 'work_order.verify', { outcome: 'fail', note: body.note }, ctx.p.personId]);
      await ctx.audit(q, 'work_order.verify', 'ALLOWED', { type: 'WorkOrder', id: code }, { outcome: 'fail' });
      return { workOrderId: code, state: 'VERIFYING', outcome: 'fail', note: 'The verification failed and is recorded; the technician records further work and resubmits.' };
    }
    await step(ctx, q, w, 'RESOLVED', 'work_order.verify', {}, { outcome: 'pass' });
    await q.query("UPDATE app.work_order SET state = 'RESOLVED', verification = $2 WHERE id = $1", [w.id, v]);
    await ctx.emit(q, 'service.repair_verified', { type: 'WorkOrder', id: code, rev: 5 }, { workOrderId: code, verifierId: ctx.p.personId });
    return { workOrderId: code, state: 'RESOLVED', outcome: 'pass' };
  });
}

export async function close(ctx: RequestContext, code: string, body: { note: string; customerConfirmed?: boolean }) {
  await ctx.require('service.close', 'close a work order', { type: 'WorkOrder', id: code });
  return ctx.tx(async (q) => {
    const w = await find(ctx, q, code, true);
    const confirmed = w.customer_confirmed || !!body.customerConfirmed;
    await step(ctx, q, w, 'CLOSED', 'work_order.close', { customerPolicy: { needsCustomerConfirmation: w.severity !== 'Standard', confirmed } }, { customerConfirmed: confirmed });
    await q.query("UPDATE app.work_order SET state = 'CLOSED', closed_by = $2, closed_at = now(), closing_note = $3, customer_confirmed = $4 WHERE id = $1", [w.id, ctx.p.personId, String(body.note || '').slice(0, 1000), confirmed]);
    return { workOrderId: code, state: 'CLOSED', note: 'Closing a work order never passes a test: the issue resolves only with a verified retest.' };
  });
}

export async function reopen(ctx: RequestContext, code: string, reason: string) {
  await ctx.require('service.reopen', 'reopen a work order', { type: 'WorkOrder', id: code });
  return ctx.tx(async (q) => {
    const w = await find(ctx, q, code, true);
    await step(ctx, q, w, 'REOPENED', 'work_order.reopen', { reopenReason: reason || null }, { reason });
    await q.query("UPDATE app.work_order SET state = 'REOPENED', reopen_count = reopen_count + 1, customer_confirmed = false WHERE id = $1", [w.id]);
    await ctx.emit(q, 'incident.reopened', { type: 'WorkOrder', id: code, rev: 6 + w.reopen_count }, { incidentId: w.issue_code, reason });
    return { workOrderId: code, state: 'REOPENED', reopenCount: w.reopen_count + 1 };
  });
}
