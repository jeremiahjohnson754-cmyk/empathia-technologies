/**
 * Mission Control (P1): one action center over every product. For the caller it lists the governed steps that are theirs to take
 * now — computed from the same transition tables, authorities and separation-of-duties rules the product pages enforce — plus the
 * operational exceptions in their site scope. It never acts: every item links to the record where the server decides again.
 * Nothing here is a KPI; figures with definitions live in Reports and the Executive passports.
 */
import { GOVERNANCE_TRANSITIONS, DELIVERY_TRANSITIONS } from '@empathia/project-governance';
import { SERVICE_TRANSITIONS } from '@empathia/service-engine';
import { LIFECYCLE_AUTHORITY } from '@empathia/commissioning-engine';
import { ROOM_LIFECYCLE } from '@empathia/domain-types';
import type { RequestContext } from '../auth/context.js';
import { APEX_OPEN, APEX_REVIEW } from './apex.js';
import { LEARN_SME } from './learn.js';
import { VERIFY_AUTHORITIES } from './commissioning.js';
import { COMPETENCY_VERIFY } from './competency.js';

export interface Action { product: 'projects' | 'rooms' | 'commissioning' | 'service' | 'apex' | 'field' | 'learn'; kind: string; ref: string; title: string; detail: string; href: string; authority: string; at: string | null }
export interface Exception { product: string; ref: string; title: string; detail: string; href: string; severity: 'high' | 'medium' | 'low'; at: string | null }

const TECH_STEPS = new Set(['ACCEPTED', 'IN_PROGRESS', 'VERIFYING']);   // taken only by the assigned technician

export async function missionControl(ctx: RequestContext) {
  return ctx.tx(async (q) => {
    const me = ctx.p.personId; const can = (a: string | string[]) => ctx.can(a);
    const scope = ctx.p.siteScope?.length ? ctx.p.siteScope : null;
    const args: unknown[] = scope ? [scope] : [];
    const S = `(SELECT r.id FROM app.room r JOIN app.building b ON b.id = r.building_id${scope ? ' WHERE b.site_id = ANY($1::uuid[])' : ''})`;
    const actions: Action[] = []; const exceptions: Exception[] = [];

    // projects: governance and delivery steps whose authority the caller holds (the record computes the guard's blockers)
    const projects = (await q.query<{ code: string; name: string; governance: string; delivery: string | null; updated_at: string }>("SELECT code, name, governance, delivery, updated_at FROM app.project WHERE governance NOT IN ('DRAFT') ORDER BY updated_at DESC LIMIT 200")).rows;
    for (const p of projects) {
      for (const t of GOVERNANCE_TRANSITIONS.filter((x) => x.from === p.governance && can(x.authority))) actions.push({ product: 'projects', kind: 'governance', ref: p.code, title: `${p.name}: ${p.governance} → ${t.to}`, detail: `guard ${t.guard}`, href: `#/projects/${p.code}`, authority: t.authority, at: p.updated_at });
      if (p.delivery) for (const t of DELIVERY_TRANSITIONS.filter((x) => x.from === p.delivery && can(x.authority))) actions.push({ product: 'projects', kind: 'delivery', ref: p.code, title: `${p.name}: ${p.delivery} → ${t.to}`, detail: `guard ${t.guard}`, href: `#/projects/${p.code}`, authority: t.authority, at: p.updated_at });
    }

    // rooms: the next lifecycle step when the caller holds its authority
    const rooms = (await q.query<{ code: string; name: string; lifecycle: string; updated_at: string }>(`SELECT r.code, r.name, r.lifecycle, r.updated_at FROM app.room r JOIN ${S} s ON s.id = r.id WHERE r.lifecycle <> 'OPERATIONAL' ORDER BY r.updated_at DESC LIMIT 300`, args)).rows;
    for (const r of rooms) {
      const i = ROOM_LIFECYCLE.indexOf(r.lifecycle as never); const next = ROOM_LIFECYCLE[i + 1]; if (!next) continue;
      const a = LIFECYCLE_AUTHORITY[next]; if (can(a)) actions.push({ product: 'rooms', kind: 'lifecycle', ref: r.code, title: `${r.name}: move to ${next.replace(/_/g, ' ').toLowerCase()}`, detail: `from ${r.lifecycle}`, href: `#/rooms/${r.code}`, authority: a, at: r.updated_at });
    }

    // commissioning: passes awaiting independent verification (never the recorder — the room page enforces it)
    if (can(VERIFY_AUTHORITIES)) {   // the verify route's own gate (and the engine's independence rule below)
      const pend = (await q.query<{ code: string; name: string; n: number; at: string }>(`SELECT r.code, r.name, count(*)::int AS n, max(cr.recorded_at) AS at FROM app.current_result cr JOIN app.room r ON r.id = cr.room_id JOIN ${S} s ON s.id = r.id WHERE cr.result_label = 'PASS_UNVERIFIED' AND cr.recorded_by <> $${args.length + 1} GROUP BY r.code, r.name ORDER BY at DESC LIMIT 100`, [...args, me])).rows;
      for (const p of pend) actions.push({ product: 'commissioning', kind: 'verify', ref: p.code, title: `${p.name}: ${p.n} pass${p.n === 1 ? '' : 'es'} awaiting independent verification`, detail: 'recorded by someone else', href: `#/rooms/${p.code}/commissioning`, authority: VERIFY_AUTHORITIES.join(' | '), at: p.at });
    }

    // service: the work-order steps that are the caller's (technician steps only for the assignee; verification never for the technician or a recorder)
    const wos = (await q.query<{ code: string; state: string; severity: string | null; assigned_to: string | null; evidence: Array<{ recorderId: string }>; title: string; room_code: string; created_at: string }>(`SELECT w.code, w.state, w.severity, w.assigned_to, w.evidence, i.title, r.code AS room_code, w.created_at FROM app.work_order w JOIN app.room_issue i ON i.id = w.issue_id JOIN app.room r ON r.id = i.room_id JOIN ${S} s ON s.id = r.id WHERE w.state NOT IN ('CLOSED','CANCELLED') ORDER BY w.created_at DESC LIMIT 300`, args)).rows;
    for (const w of wos) {
      for (const t of SERVICE_TRANSITIONS.filter((x) => x.from === w.state && can(x.authority))) {
        if (TECH_STEPS.has(w.state) && t.authority !== 'service.verify' && w.assigned_to !== me) continue;
        if (w.state === 'ASSIGNED' && w.assigned_to !== me) continue;
        if (t.authority === 'service.verify' && (w.assigned_to === me || w.evidence.some((e) => e.recorderId === me))) continue;
        actions.push({ product: 'service', kind: t.to.toLowerCase(), ref: w.code, title: `${w.code} · ${w.title}: ${w.state} → ${t.to}`, detail: `${w.severity || 'not triaged'} · guard ${t.guard}`, href: `#/service/${w.code}`, authority: t.authority, at: w.created_at });
      }
      if (w.state === 'OPEN' && ['Mission critical', 'High'].includes(w.severity || '')) exceptions.push({ product: 'service', ref: w.code, title: `${w.code} is ${w.severity} and not assigned`, detail: w.title, href: `#/service/${w.code}`, severity: 'high', at: w.created_at });
    }

    // APEX: deficiencies without a case (for those who may open one); cases awaiting review
    if (can(APEX_OPEN)) {
      const n = (await q.query<{ code: string; title: string; room_code: string; created_at: string }>(`SELECT i.code, i.title, r.code AS room_code, i.created_at FROM app.room_issue i JOIN app.room r ON r.id = i.room_id JOIN ${S} s ON s.id = r.id WHERE i.state = 'OPEN' AND i.category = 'INSTALLATION_COMMISSIONING_DEFICIENCY' AND NOT EXISTS (SELECT 1 FROM app.apex_case c WHERE c.issue_id = i.id) ORDER BY i.created_at DESC LIMIT 50`, args)).rows;
      for (const i of n) actions.push({ product: 'apex', kind: 'open', ref: i.code, title: `${i.title}: no diagnosis yet`, detail: `deficiency on ${i.room_code}`, href: `#/rooms/${i.room_code}/issues`, authority: 'apex.open', at: i.created_at });
    }
    if (can(APEX_REVIEW)) {
      const c = (await q.query<{ code: string; title: string; opened_at: string; acts: number }>(`SELECT c.code, i.title, c.opened_at, jsonb_array_length(c.actions) AS acts FROM app.apex_case c JOIN app.room_issue i ON i.id = c.issue_id JOIN ${S} s ON s.id = c.room_id WHERE c.review IS NULL AND jsonb_array_length(c.actions) > 0 ORDER BY c.opened_at DESC LIMIT 50`, args)).rows;
      for (const x of c) actions.push({ product: 'apex', kind: 'review', ref: x.code, title: `${x.code} · ${x.title}: diagnosis awaiting review`, detail: `${x.acts} action outcome(s) on the case`, href: `#/apex/${x.code}`, authority: APEX_REVIEW.join(' | '), at: x.opened_at });
    }

    // Field Intelligence: the session step for the caller's role (arming and running only for the consenting operator)
    const fis = (await q.query<{ code: string; state: string; terminal: boolean; session: { approvals: Record<string, unknown>; instrument: unknown; safety: { localOperator: string | null; emergencyStop: string }; exits: Array<{ exit: string; why: string }> }; room_code: string; updated_at: string }>(`SELECT f.code, f.state, f.terminal, f.session, r.code AS room_code, f.updated_at FROM app.fi_session f JOIN app.room r ON r.id = f.room_id JOIN ${S} s ON s.id = r.id ORDER BY f.updated_at DESC LIMIT 100`, args)).rows;
    for (const f of fis) {
      const s = f.session; const href = `#/field/sessions/${f.code}`; const push = (kind: string, title: string, authority: string) => actions.push({ product: 'field', kind, ref: f.code, title: `${f.code} (${f.room_code}): ${title}`, detail: f.state, href, authority, at: f.updated_at });
      if (f.terminal) { if (f.state !== 'ACQUIRED' && Date.now() - Date.parse(f.updated_at) < 7 * 864e5) exceptions.push({ product: 'field', ref: f.code, title: `${f.code} ended ${f.state}`, detail: s.exits[s.exits.length - 1]?.why || '', href, severity: 'medium', at: f.updated_at }); continue; }
      if (f.state === 'DRAFT' && can(['protocol.approve', 'tests.verify.all', 'fipv.review', 'plan.compile'])) push('eligibility', 'check eligibility (licence and adapters)', 'plan.compile');
      if (f.state === 'SAFETY_PREFLIGHT') {
        if (!s.approvals['protocol'] && can('protocol.approve')) push('protocol', 'approve the protocol and its level limit', 'protocol.approve');
        if (!s.approvals['window'] && can(['window.approve', 'access.approve', 'occupancy.confirm'])) push('window', 'reserve the window and confirm occupancy', 'window.approve');
        if (!s.approvals['operator'] && can(['work.accept', 'test.verify', 'work.evidence'])) push('operator', 'consent as the local operator', 'work.accept');
        if (s.safety.localOperator === me && !s.instrument) push('instrument', 'register the instrument and its calibration', 'work.evidence');
        if (s.safety.localOperator === me && s.safety.emergencyStop !== 'VERIFIED_LOCAL') push('estop', 'verify the emergency stop', 'work.accept');
      }
      if (f.state === 'DRY_RUN' && s.safety.localOperator === me) push('dry_run', 'walk the dry run (emits nothing)', 'work.accept');
      if (f.state === 'APPROVAL_PENDING' && !s.approvals['session'] && can(['tests.verify.all', 'fipv.review'])) push('authorize', 'authorize or refuse the session', 'tests.verify.all');
      if (f.state === 'APPROVAL_PENDING' && s.approvals['session'] && s.safety.localOperator === me) push('arm', 'arm (two confirmations; simulation in this build)', 'work.accept');
      if (['ARMED', 'RUNNING'].includes(f.state) && s.safety.localOperator === me) push('run', 'step the simulated run or stop it', 'work.accept');
    }

    // Learn: cases to review or approve (never your own; the steward never the proposer or the reviewer)
    const lcs = (await q.query<{ code: string; title: string; state: string; proposed_by: string; reviewer: string | null; proposed_at: string }>("SELECT code, title, state, proposed_by, sme_review->>'by' AS reviewer, proposed_at FROM app.learn_case WHERE state IN ('PROPOSED','SME_REVIEWED') ORDER BY proposed_at DESC LIMIT 50")).rows;
    for (const c of lcs) {
      if (c.state === 'PROPOSED' && can(LEARN_SME) && c.proposed_by !== me) actions.push({ product: 'learn', kind: 'review', ref: c.code, title: `${c.code} · ${c.title}: subject-matter review`, detail: 'you are not the proposer', href: '#/learn/cases', authority: LEARN_SME.join(' | '), at: c.proposed_at });
      if (c.state === 'SME_REVIEWED' && can('case.approve') && c.proposed_by !== me && c.reviewer !== me) actions.push({ product: 'learn', kind: 'approve', ref: c.code, title: `${c.code} · ${c.title}: steward approval`, detail: 'neither proposer nor reviewer', href: '#/learn/cases', authority: 'case.approve', at: c.proposed_at });
    }

    // Competency records awaiting provenance verification (never the recorder, never the holder) — ADR-0009
    const cps = (await q.query<{ id: string; competency: string; person_id: string; recorded_by: string; holder: string; recorded_at: string }>("SELECT c.id, c.competency, c.person_id, c.recorded_by, p.display_name AS holder, c.recorded_at FROM app.competency_record c JOIN app.person p ON p.id = c.person_id WHERE c.state = 'PENDING_VERIFICATION' ORDER BY c.recorded_at DESC LIMIT 50")).rows;
    for (const c of cps) if (can(COMPETENCY_VERIFY) && c.recorded_by !== me && c.person_id !== me) actions.push({ product: 'learn', kind: 'verify-competency', ref: c.id, title: `${c.competency} for ${c.holder}: verify provenance`, detail: 'neither recorder nor holder', href: '#/learn/competencies', authority: COMPETENCY_VERIFY.join(' | '), at: c.recorded_at });

    // exceptions that are facts of the estate, not steps: open high/critical issues in scope
    const hi = (await q.query<{ code: string; title: string; severity: string; room_code: string; created_at: string }>(`SELECT i.code, i.title, i.severity, r.code AS room_code, i.created_at FROM app.room_issue i JOIN app.room r ON r.id = i.room_id JOIN ${S} s ON s.id = r.id WHERE i.state = 'OPEN' AND i.severity IN ('Critical','High') ORDER BY i.created_at DESC LIMIT 20`, args)).rows;
    for (const i of hi) exceptions.push({ product: 'rooms', ref: i.code, title: `${i.severity} issue open on ${i.room_code}`, detail: i.title, href: `#/rooms/${i.room_code}/issues`, severity: i.severity === 'Critical' ? 'high' : 'medium', at: i.created_at });

    actions.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
    const byProduct = actions.reduce<Record<string, number>>((m, a) => { m[a.product] = (m[a.product] || 0) + 1; return m; }, {});
    return { me: { name: ctx.p.name, role: ctx.p.role, siteScoped: !!scope }, actions: actions.slice(0, 200), total: actions.length, byProduct, exceptions: exceptions.slice(0, 50),
      scanned: { projects: projects.length, rooms: rooms.length, workOrders: wos.length, fiSessions: fis.length, learnCases: lcs.length, competencies: cps.length },
      note: 'Steps you hold the authority for, in your site scope. Each opens the record, where the server checks the guard again. Operational performance stays NOT_MONITORED.' };
  });
}
