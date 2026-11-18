/**
 * Operational incidents (migration 0039; founder, 17 Nov 2026: "prioritize operational incident intelligence").
 *
 * An incident is an issue of a room in service: a room issue of category OPERATIONAL_INCIDENT with its detail in app.incident. It is
 * worked through the same records as a deficiency — the issue's workflow (deficiencies.ts), a ServiceHands work order with its hard
 * gates, an APEX case — because a second service desk beside the first would be two answers to "what is open in this room".
 *
 *   report      anyone who can see the room. What was reported never changes.
 *   block       the service manager or operations lead says what the work is waiting on; unblocking clears it. A blocked incident's
 *               correction is not recorded until it is unblocked.
 *   escalate    once, with the reason.
 *   workflow    owner and date → root cause, what was done and how it was resolved → confirmation that the room does again what it
 *               stopped doing (by the reporter, or by someone holding the authority) → closed by someone who neither fixed nor confirmed.
 *
 * Intelligence is what the records add up to, and only that: counts by status, kind, domain, how it was found, root cause and
 * resolution; time from report to resolution; which incidents repeat an earlier one (worked out by the database when the incident is
 * written); and a per-room status derived from its open incidents. No number here is measured from a device or estimated: a room
 * with no incident on record is "no open incident", not "healthy".
 */
import type { Queryable } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import { findRoom } from './rooms.js';
import { invalid, notFound } from '../http/errors.js';
import { ROOT_CAUSES, type DeficiencyAction } from '@empathia/commissioning-engine';
import { runStep } from './deficiencies.js';

export const ENTRY_TYPES = ['OPERATIONAL_INCIDENT', 'ENGINEERING_OBSERVATION'] as const;
export const ISSUE_TYPES: Record<string, string> = { no_audio: 'No audio', low_audio: 'Low audio', echo_aec_failure: 'Echo or echo-cancellation failure', video_no_signal: 'No video signal', camera_tracking_failure: 'Camera tracking failure',
  control_system_failure: 'Control system failure', network_connectivity: 'Network connectivity', device_offline: 'Device offline', firmware_issue: 'Firmware issue', ui_ux_issue: 'User interface issue', documentation_missing: 'Documentation missing',
  installation_defect: 'Installation defect', design_gap: 'Design gap', vendor_performance: 'Vendor performance', standards_violation: 'Standards violation', improvement_opportunity: 'Improvement opportunity', user_error: 'User error', other: 'Other' };
export const DOMAINS = ['audio', 'video', 'network', 'control', 'av_infrastructure', 'power_ups', 'lighting', 'signage', 'conferencing', 'design', 'vendor', 'integration'];
export const DETECTED = ['user_report', 'support_round', 'scheduled_maintenance', 'production', 'monitoring'];
export const IMPACTS = ['none', 'minor_annoyance', 'moderate_disruption', 'major_disruption', 'executive_impact'];
export const RESOLUTIONS = ['configuration_fix', 'hardware_replacement', 'firmware_update', 'software_patch', 'training', 'design_change', 'escalation_to_vendor', 'workaround', 'no_action_required'];
export const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
export const IN_SERVICE = ['ACCEPTED', 'OPERATIONAL'];
export const MANAGE = ['service.triage', 'issue.assign'];
export const RECURRENCE_DAYS = 30;
export const catalogue = { entryTypes: ENTRY_TYPES, issueTypes: ISSUE_TYPES, domains: DOMAINS, detectedDuring: DETECTED, userImpacts: IMPACTS, resolutionTypes: RESOLUTIONS, severities: SEVERITIES, rootCauses: ROOT_CAUSES, recurrenceDays: RECURRENCE_DAYS };   // rootCauses: the workflow's own list, so a page asks for none of its own

interface Row { id: string; code: string; title: string; severity: string; state: string; workflow: string; owner_role: string | null; target_date: string | null; root_cause: string | null; corrective_action: string | null; retest: { result: string; evidence: string } | null; resolution: { at?: string } | null;
  room_id: string; room_code: string; room_name: string; entry_type: string; issue_type: string; domain: string; detected_during: string; user_impact: string; device: string | null; description: string; reported_by: string; reporter: string; reported_role: string; reported_at: string;
  recurrence_of: string | null; repeats: string | null; blocked_reason: string | null; blocked_at: string | null; escalation_reason: string | null; escalated_at: string | null; resolution_type: string | null; resolved_at: string | null; work_orders: string[] | null }
const SELECT = `SELECT i.id, i.code, i.title, i.severity, i.state, i.workflow, i.owner_role, to_char(i.target_date, 'YYYY-MM-DD') AS target_date, i.root_cause, i.corrective_action, i.retest, i.resolution,
    r.id AS room_id, r.code AS room_code, r.name AS room_name, n.entry_type, n.issue_type, n.domain, n.detected_during, n.user_impact, a.code AS device, n.description, n.reported_by, p.display_name AS reporter, n.reported_role, n.reported_at,
    n.recurrence_of, pi.code AS repeats, n.blocked_reason, n.blocked_at, n.escalation_reason, n.escalated_at, n.resolution_type, n.resolved_at,
    (SELECT array_agg(w.code ORDER BY w.created_at) FROM app.work_order w WHERE w.issue_id = i.id) AS work_orders
  FROM app.incident n JOIN app.room_issue i ON i.id = n.issue_id JOIN app.room r ON r.id = n.room_id JOIN app.person p ON p.id = n.reported_by
  LEFT JOIN app.planned_asset a ON a.id = n.position_id LEFT JOIN app.room_issue pi ON pi.id = n.recurrence_of`;

/** What a reader calls the incident's state: the workflow, with "blocked" over it while it is. */
export const statusOf = (r: { workflow: string; blocked_reason: string | null }) => (r.workflow === 'CLOSED' ? 'CLOSED' : r.workflow === 'DEFERRED' ? 'DEFERRED' : r.workflow === 'ACCEPTED_EXCEPTION' ? 'ACCEPTED_EXCEPTION'
  : r.blocked_reason ? 'BLOCKED' : r.workflow === 'PENDING_RETEST' ? 'AWAITING_CONFIRMATION' : r.workflow);
const hours = (from: string, to: string | null | undefined) => (to ? Math.round(((Date.parse(to) - Date.parse(from)) / 36e5) * 10) / 10 : null);
const view = (r: Row, ctx: RequestContext) => ({ incident: r.code, status: statusOf(r), workflow: r.workflow, room: { code: r.room_code, name: r.room_name }, entryType: r.entry_type, issueType: r.issue_type, issueTypeName: ISSUE_TYPES[r.issue_type] ?? r.issue_type, domain: r.domain,
  severity: r.severity, title: r.title, description: r.description, detectedDuring: r.detected_during, userImpact: r.user_impact, device: r.device, reportedBy: r.reporter, reportedRole: r.reported_role, reportedAt: r.reported_at, youReported: r.reported_by === ctx.p.personId,
  repeats: r.repeats, blocked: r.blocked_reason ? { reason: r.blocked_reason, since: r.blocked_at } : null, escalated: r.escalation_reason ? { reason: r.escalation_reason, at: r.escalated_at } : null,
  ownerRole: r.owner_role, targetDate: r.target_date, rootCause: r.root_cause, correctiveAction: r.corrective_action, resolutionType: r.resolution_type, resolvedAt: r.resolved_at, confirmation: r.retest,
  closedAt: r.workflow === 'CLOSED' ? r.resolution?.at ?? null : null, hoursToResolve: hours(r.reported_at, r.resolved_at), workOrders: r.work_orders || [] });

/** Site scope for the caller as a SQL fragment over the room alias r (the same rule findRoom applies to one room). */
const scoped = (ctx: RequestContext, n: number): { sql: string; args: unknown[] } => { const s = ctx.p.siteScope;
  return s && s.length ? { sql: ` AND r.building_id IN (SELECT id FROM app.building WHERE site_id = ANY($${n}::uuid[]))`, args: [s] } : { sql: '', args: [] }; };

export interface ReportInput { entryType?: string; issueType: string; domain: string; severity: string; title: string; description: string; detectedDuring: string; userImpact: string; device?: string }
/** Report an incident on a room in service. Anyone who can see the room may; the database works out whether it repeats an earlier one. */
export async function reportIncident(ctx: RequestContext, ref: string, b: ReportInput) {
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true); const A = 'incident.report'; const agg = { type: 'Room', id: room.code }; const why: string[] = [];
    if (!IN_SERVICE.includes(room.lifecycle)) await ctx.refuse(A, agg, [`${room.code} is ${room.lifecycle}: an operational incident is reported on a room in service. Before acceptance, what goes wrong is a deficiency of the design or of commissioning and is recorded as one`]);
    const entry = b.entryType || 'OPERATIONAL_INCIDENT';
    if (!(ENTRY_TYPES as readonly string[]).includes(entry)) why.push(`entryType is one of ${ENTRY_TYPES.join(', ')}`);
    if (!ISSUE_TYPES[b.issueType]) why.push(`issueType is one of ${Object.keys(ISSUE_TYPES).join(', ')}`);
    if (!DOMAINS.includes(b.domain)) why.push(`domain is one of ${DOMAINS.join(', ')}`);
    if (!SEVERITIES.includes(b.severity)) why.push(`severity is one of ${SEVERITIES.join(', ')}`);
    if (!DETECTED.includes(b.detectedDuring)) why.push(`detectedDuring is one of ${DETECTED.join(', ')}`);
    if (!IMPACTS.includes(b.userImpact)) why.push(`userImpact is one of ${IMPACTS.join(', ')}`);
    if (!b.title || b.title.trim().length < 5) why.push('a title says what is wrong in a few words');
    if (!b.description || b.description.trim().length < 10) why.push('a description says what was seen or heard, and when');
    if (b.severity === 'Critical' && b.userImpact === 'none') why.push('a Critical incident (the room is down) affects someone: say how much');
    let position: { id: string; code: string } | null = null;
    if (b.device) { position = (await q.query<{ id: string; code: string }>('SELECT id, code FROM app.planned_asset WHERE room_id = $1 AND code = $2 AND NOT furniture AND removed_at IS NULL', [room.id, b.device])).rows[0] || null; if (!position) why.push(`${b.device} is not a device of ${room.code}`); }
    if (why.length) await ctx.refuse(A, agg, why);
    const code = (await q.query<{ c: string }>("SELECT app.next_code('incident', 'INC-') AS c")).rows[0]!.c;
    const rev = (await q.query<{ n: number }>('SELECT coalesce(max(rev_no), 0) AS n FROM app.room_revision WHERE room_id = $1', [room.id])).rows[0]!.n;
    const issue = (await q.query<{ id: string }>(`INSERT INTO app.room_issue (tenant_id, room_id, code, key, category, check_name, severity, title, rationale, assets, first_seen_rev, last_seen_rev) VALUES ($1,$2,$3,$4,'OPERATIONAL_INCIDENT',$5,$6,$7,$8,$9,$10,$10) RETURNING id`,
      [ctx.p.tenantId, room.id, code, `incident:${code}`, b.issueType, b.severity, b.title.trim(), b.description.trim(), position ? [position.code] : [], rev])).rows[0]!;
    const n = (await q.query<{ recurrence_of: string | null }>(`INSERT INTO app.incident (issue_id, tenant_id, room_id, entry_type, issue_type, domain, detected_during, user_impact, position_id, description, reported_by, reported_role) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING recurrence_of`,
      [issue.id, ctx.p.tenantId, room.id, entry, b.issueType, b.domain, b.detectedDuring, b.userImpact, position?.id ?? null, b.description.trim(), ctx.p.personId, ctx.p.role])).rows[0]!;
    const repeats = n.recurrence_of ? (await q.query<{ code: string }>('SELECT code FROM app.room_issue WHERE id = $1', [n.recurrence_of])).rows[0]?.code ?? null : null;
    await q.query('INSERT INTO app.issue_event (tenant_id, issue_id, kind, detail, actor_id) VALUES ($1,$2,$3,$4,$5)', [ctx.p.tenantId, issue.id, 'created', { source: `operational: ${b.detectedDuring}`, entryType: entry, issueType: b.issueType, ...(repeats ? { repeats } : {}) }, ctx.p.personId]);
    await ctx.emit(q, 'issue.created_or_updated', { type: 'RoomIssue', id: code, rev: 1 }, { issueId: code, status: 'OPEN', change: 'created', roomId: room.code });
    await ctx.audit(q, A, 'ALLOWED', { type: 'RoomIssue', id: code }, { room: room.code, entryType: entry, issueType: b.issueType, severity: b.severity, detectedDuring: b.detectedDuring, repeats });
    return { incident: code, room: room.code, status: 'OPEN', severity: b.severity, issueType: b.issueType, repeats,
      note: repeats ? `This repeats ${repeats}: the same kind of incident in this room within ${RECURRENCE_DAYS} days. The database worked that out from the records.` : `No incident of this kind was reported in this room in the ${RECURRENCE_DAYS} days before.` };
  });
}

export async function listIncidents(ctx: RequestContext, f: { status?: string; room?: string; limit?: number }) {
  return ctx.tx(async (q) => { const sc = scoped(ctx, 1); const rows = (await q.query<Row>(`${SELECT} WHERE true${sc.sql} ORDER BY n.reported_at DESC, i.code DESC`, sc.args)).rows;
    const items = rows.map((r) => view(r, ctx)).filter((x) => (!f.status || x.status === f.status) && (!f.room || x.room.code === f.room));
    return { items: items.slice(0, Math.min(200, Math.max(1, f.limit || 100))), total: items.length, catalogue, may: { manage: ctx.can(MANAGE) } }; });
}

async function one(ctx: RequestContext, q: Queryable, code: string, lock = false): Promise<Row> {
  const sc = scoped(ctx, 2); const r = (await q.query<Row>(`${SELECT} WHERE i.code = $1${sc.sql}${lock ? ' FOR UPDATE OF n' : ''}`, [code, ...sc.args])).rows[0];
  if (!r) throw notFound(`incident ${code}`); return r;
}
export async function getIncident(ctx: RequestContext, code: string) {
  return ctx.tx(async (q) => { const r = await one(ctx, q, code);
    const history = (await q.query<{ kind: string; detail: Record<string, unknown>; at: string; actor: string | null }>('SELECT e.kind, e.detail, e.at, p.display_name AS actor FROM app.issue_event e LEFT JOIN app.person p ON p.id = e.actor_id WHERE e.issue_id = $1 ORDER BY e.id', [r.id])).rows;
    return { ...view(r, ctx), history, catalogue, may: { manage: ctx.can(MANAGE), confirm: r.reported_by === ctx.p.personId || ctx.can(['issue.assign', 'tests.verify.all', 'test.verify']) } }; });
}

/** Say what an incident is waiting on, or that it no longer is. */
export async function setBlocked(ctx: RequestContext, code: string, body: { blocked: boolean; reason?: string }) {
  await ctx.require(MANAGE, body.blocked ? 'block an incident' : 'unblock an incident', { type: 'RoomIssue', id: code });
  return ctx.tx(async (q) => { const r = await one(ctx, q, code, true); const A = body.blocked ? 'incident.block' : 'incident.unblock'; const agg = { type: 'RoomIssue', id: code };
    if (!['OPEN', 'IN_PROGRESS'].includes(r.workflow)) await ctx.refuse(A, agg, [`${code} is ${statusOf(r)}: only an incident that is open or in progress is blocked or unblocked`]);
    if (body.blocked) { const reason = (body.reason || '').trim(); if (reason.length < 5) await ctx.refuse(A, agg, ['say what the work is waiting on']); if (r.blocked_reason) await ctx.refuse(A, agg, [`${code} is already blocked: ${r.blocked_reason}`]);
      await q.query('UPDATE app.incident SET blocked_reason = $2, blocked_at = now(), blocked_by = $3 WHERE issue_id = $1', [r.id, reason, ctx.p.personId]);
      await q.query('INSERT INTO app.issue_event (tenant_id, issue_id, kind, detail, actor_id) VALUES ($1,$2,$3,$4,$5)', [ctx.p.tenantId, r.id, 'blocked', { reason }, ctx.p.personId]);
    } else { if (!r.blocked_reason) await ctx.refuse(A, agg, [`${code} is not blocked`]);
      await q.query('UPDATE app.incident SET blocked_reason = NULL, blocked_at = NULL, blocked_by = NULL WHERE issue_id = $1', [r.id]);
      await q.query('INSERT INTO app.issue_event (tenant_id, issue_id, kind, detail, actor_id) VALUES ($1,$2,$3,$4,$5)', [ctx.p.tenantId, r.id, 'unblocked', { was: r.blocked_reason, since: r.blocked_at, note: (body.reason || '').trim() || null }, ctx.p.personId]); }
    await ctx.audit(q, A, 'ALLOWED', agg, {});
    return view(await one(ctx, q, code), ctx); });
}

export async function escalate(ctx: RequestContext, code: string, body: { reason: string }) {
  await ctx.require(MANAGE, 'escalate an incident', { type: 'RoomIssue', id: code });
  return ctx.tx(async (q) => { const r = await one(ctx, q, code, true); const agg = { type: 'RoomIssue', id: code }; const reason = (body.reason || '').trim();
    if (r.workflow === 'CLOSED') await ctx.refuse('incident.escalate', agg, [`${code} is closed`]);
    if (r.escalation_reason) await ctx.refuse('incident.escalate', agg, [`${code} was escalated already (${r.escalated_at}): ${r.escalation_reason}`]);
    if (reason.length < 5) await ctx.refuse('incident.escalate', agg, ['say why it is escalated, and to whom']);
    await q.query('UPDATE app.incident SET escalation_reason = $2, escalated_at = now(), escalated_by = $3 WHERE issue_id = $1', [r.id, reason, ctx.p.personId]);
    await q.query('INSERT INTO app.issue_event (tenant_id, issue_id, kind, detail, actor_id) VALUES ($1,$2,$3,$4,$5)', [ctx.p.tenantId, r.id, 'escalated', { reason }, ctx.p.personId]);
    await ctx.audit(q, 'incident.escalate', 'ALLOWED', agg, {});
    return view(await one(ctx, q, code), ctx); });
}

export const STEPS = ['start', 'fixed', 'confirm', 'close', 'defer', 'resume', 'reopen'] as const;
/** Who may take each step of an incident. Confirmation is also the reporter's, whatever they hold: they know whether the room works. */
export const STEP_AUTHORITY: Record<typeof STEPS[number], string[]> = { start: ['service.triage', 'issue.assign'], fixed: ['work.evidence', 'service.triage'], confirm: ['issue.assign', 'tests.verify.all', 'test.verify'],
  close: ['service.close', 'tests.verify.all', 'baseline.approve'], defer: ['issue.assign', 'baseline.approve'], resume: ['service.triage', 'issue.assign'], reopen: ['service.reopen', 'issue.assign'] };

/**
 * One step of an incident. The engine and the database guard are the deficiency workflow's (deficiencies.ts runStep); what differs is
 * who may take the step, that a blocked incident's correction waits, and that "fixed" also says how it was resolved.
 */
export async function incidentStep(ctx: RequestContext, code: string, body: Record<string, unknown>) {
  const k = String(body['step'] || '') as typeof STEPS[number]; const s = (n: string) => String(body[n] ?? ''); const target = { type: 'RoomIssue', id: code };
  if (!(STEPS as readonly string[]).includes(k)) throw invalid(`step is one of ${STEPS.join(', ')}`);
  const head = await ctx.tx(async (q) => { const r = await one(ctx, q, code); return { id: r.id, reportedBy: r.reported_by }; });
  if (!(k === 'confirm' && head.reportedBy === ctx.p.personId)) await ctx.require(STEP_AUTHORITY[k], `incident.${k}`, target);
  let a: DeficiencyAction; let resolution: string | null = null;
  switch (k) {
    case 'start': if (!/^[a-z_]{2,40}$/.test(s('ownerRole'))) throw invalid('ownerRole is a role key'); a = { kind: 'start', owner: s('ownerRole'), targetDate: s('targetDate') }; break;
    case 'fixed': if (!(ROOT_CAUSES as readonly string[]).includes(s('rootCause'))) throw invalid(`rootCause is one of ${ROOT_CAUSES.join(', ')}`); if (!RESOLUTIONS.includes(s('resolutionType'))) throw invalid(`resolutionType is one of ${RESOLUTIONS.join(', ')}`);
      resolution = s('resolutionType'); a = { kind: 'fixed', rootCause: s('rootCause') as never, action: s('action').slice(0, 2000) }; break;
    case 'confirm': if (typeof body['restored'] !== 'boolean') throw invalid('restored is true (the room does again what it stopped doing) or false'); if (s('note').trim().length < 5) throw invalid('say what was checked, in a few words');
      a = { kind: 'retest', result: body['restored'] ? 'PASS' : 'FAIL', evidence: `confirmed by ${ctx.p.role}: ${s('note').trim()}`.slice(0, 120) }; break;
    case 'close': a = { kind: 'verify' }; break;
    case 'defer': a = { kind: 'defer', reason: s('reason').slice(0, 1000), until: s('until'), acceptanceDue: false }; break;
    case 'resume': a = { kind: 'resume', reason: s('reason').slice(0, 1000) }; break;
    default: a = { kind: 'reopen', reason: s('reason').slice(0, 1000) };
  }
  if (k === 'start' && !(await ctx.tx(async (q) => (await q.query('SELECT 1 FROM app.role WHERE key = $1', [s('ownerRole')])).rowCount))) throw invalid(`unknown role ${s('ownerRole')}`);
  await runStep(ctx, code, a, { incident: true,
    before: async (q, issue) => { const n = (await q.query<{ blocked_reason: string | null }>('SELECT blocked_reason FROM app.incident WHERE issue_id = $1 FOR UPDATE', [issue.id])).rows[0];
      return n?.blocked_reason && (k === 'fixed' || k === 'confirm' || k === 'close') ? [`${code} is blocked (${n.blocked_reason}): unblock it before this step`] : []; },
    after: async (q, issue) => {
      if (resolution) await q.query('UPDATE app.incident SET resolution_type = $2, resolved_at = now(), resolved_by = $3 WHERE issue_id = $1', [issue.id, resolution, ctx.p.personId]);
      // a confirmation that failed, or a reopening, sends the work back: the earlier resolution no longer stands (it stays in the history)
      else if (issue.to === 'IN_PROGRESS' && (issue.from === 'PENDING_RETEST' || issue.from === 'CLOSED')) await q.query('UPDATE app.incident SET resolution_type = NULL, resolved_at = NULL, resolved_by = NULL WHERE issue_id = $1', [issue.id]);
      if (issue.to !== 'OPEN' && issue.to !== 'IN_PROGRESS') await q.query('UPDATE app.incident SET blocked_reason = NULL, blocked_at = NULL, blocked_by = NULL WHERE issue_id = $1 AND blocked_reason IS NOT NULL', [issue.id]);
    } });
  return ctx.tx(async (q) => view(await one(ctx, q, code), ctx));
}

/** What the incident records add up to. Counts and times from the records; nothing estimated, nothing from a device. */
export async function intelligence(ctx: RequestContext, f: { days?: number }) {
  const days = Math.min(730, Math.max(1, Math.round(f.days || 90)));
  return ctx.tx(async (q) => { const sc = scoped(ctx, 2);
    const rows = (await q.query<Row>(`${SELECT} WHERE n.reported_at >= now() - make_interval(days => $1)${sc.sql} ORDER BY n.reported_at`, [days, ...sc.args])).rows; const all = rows.map((r) => ({ r, s: statusOf(r), h: hours(r.reported_at, r.resolved_at) }));
    const open = (s: string) => !['CLOSED', 'DEFERRED', 'ACCEPTED_EXCEPTION'].includes(s); const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
    const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : Math.round(((s[m - 1]! + s[m]!) / 2) * 10) / 10; };
    const by = (key: (r: Row) => string | null, label?: (k: string) => string) => { const m = new Map<string, typeof all>(); for (const x of all) { const k = key(x.r); if (k === null) continue; m.set(k, [...(m.get(k) || []), x]); }
      return [...m.entries()].map(([k, xs]) => { const hs = xs.map((x) => x.h).filter((h): h is number => h !== null); return { key: k, ...(label ? { name: label(k) } : {}), incidents: xs.length, open: xs.filter((x) => open(x.s)).length, repeats: xs.filter((x) => x.r.recurrence_of).length, resolved: hs.length, meanHoursToResolve: mean(hs) }; })
        .sort((a, b) => b.incidents - a.incidents || a.key.localeCompare(b.key)); };
    const resolved = all.map((x) => x.h).filter((h): h is number => h !== null);
    // per room: every room in service the caller can see, with what its incident records say (a room with none is listed as having none)
    const rooms = (await q.query<{ id: string; code: string; name: string; lifecycle: string }>(`SELECT r.id, r.code, r.name, r.lifecycle FROM app.room r WHERE r.lifecycle = ANY($1)${scoped(ctx, 2).sql} ORDER BY r.code`, [IN_SERVICE, ...sc.args])).rows;
    const perRoom = rooms.map((room) => { const xs = all.filter((x) => x.r.room_id === room.id); const o = xs.filter((x) => open(x.s)); const worst = ['Critical', 'High', 'Medium', 'Low'].find((s) => o.some((x) => x.r.severity === s)) || null;
      return { room: room.code, name: room.name, incidents: xs.length, open: o.length, blocked: o.filter((x) => x.s === 'BLOCKED').length, awaitingConfirmation: o.filter((x) => x.s === 'AWAITING_CONFIRMATION').length, closed: xs.filter((x) => x.s === 'CLOSED').length,
        criticalOpen: o.filter((x) => x.r.severity === 'Critical').length, repeats: xs.filter((x) => x.r.recurrence_of).length, lastReportedAt: xs.at(-1)?.r.reported_at ?? null,
        status: worst === 'Critical' ? 'DOWN' : worst === 'High' ? 'DEGRADED' : worst ? 'ATTENTION' : 'NO_OPEN_INCIDENT',
        why: worst ? `${o.length} open incident${o.length === 1 ? '' : 's'}, the most severe ${worst}` : xs.length ? 'every incident on record is closed' : 'no incident on record in this period' }; });
    // repeats: chains of the same kind of incident in the same room
    const chains = all.filter((x) => x.r.recurrence_of).map((x) => ({ incident: x.r.code, repeats: x.r.repeats, room: x.r.room_code, issueType: x.r.issue_type, device: x.r.device, reportedAt: x.r.reported_at, status: x.s }));
    return { period: { days, from: new Date(Date.now() - days * 864e5).toISOString() }, totals: { incidents: all.length, open: all.filter((x) => open(x.s)).length, inProgress: all.filter((x) => x.s === 'IN_PROGRESS').length, blocked: all.filter((x) => x.s === 'BLOCKED').length,
        awaitingConfirmation: all.filter((x) => x.s === 'AWAITING_CONFIRMATION').length, closed: all.filter((x) => x.s === 'CLOSED').length, deferred: all.filter((x) => x.s === 'DEFERRED').length, criticalOpen: all.filter((x) => open(x.s) && x.r.severity === 'Critical').length,
        repeats: chains.length, escalated: all.filter((x) => x.r.escalation_reason).length, resolved: resolved.length, meanHoursToResolve: mean(resolved), medianHoursToResolve: median(resolved) },
      byIssueType: by((r) => r.issue_type, (k) => ISSUE_TYPES[k] ?? k), byDomain: by((r) => r.domain), byDetectedDuring: by((r) => r.detected_during), byRootCause: by((r) => r.root_cause), byResolutionType: by((r) => r.resolution_type), bySeverity: by((r) => r.severity),
      rooms: perRoom, repeats: chains,
      basis: `Counted from the incident records of the last ${days} days that you may see. Time to resolve is from the report to the moment the correction was recorded. A repeat is the same kind of incident in the same room within ${RECURRENCE_DAYS} days, worked out by the database when the incident is written. A room's status here is derived from its open incidents and from nothing else: it is not a measurement of the room, and "no open incident" is not a statement that the room works.` };
  });
}
