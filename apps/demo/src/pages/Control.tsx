/**
 * Mission Control, Executive intelligence and the Evidence ledger / policy — the three pages that show the whole platform at once.
 *   - Mission Control: every station (intake, decision, funding, design, commissioning, field, documents, handoff, assurance, service)
 *     counts live records of this demonstration — the Build a Room draft, the service workspace, the synthetic estate — and every
 *     record opens where it lives, with its history.
 *   - Executive: the 27 KPI passports of @empathia/kpi-engine computed from those records: numerator, denominator, window, coverage,
 *     freshness, confidence; "not measurable" is never 0%.
 *   - Ledger: every event behind every state (the workspace's and the room draft's), with actor, time and local time; the policy page
 *     is the role × area matrix the demonstrator's dispatcher used, verbatim, beside the authority each native page checks.
 */
import { useMemo, useState } from 'react';
import { Button, Facts, Notice, Tag, Tabs, PageHero, StatTile, ScoreRing, Segmented, Card, Chip, List, ListRow, EmptyState, ProgressBar, Icon, type IconName } from '@empathia/ui';
import { BUILDINGS } from '../campus/canon.js';
import { plural, Foot, weekCounts, weekBacklog, deltaOf } from './viz.js';
import { V25Nav } from './V25Nav.js';
import { passports, type Passport, type Records } from '@empathia/kpi-engine';
import { TIERS } from '@empathia/apex-engine';
import areaRoles from '../generated/area-roles.json';
import * as S from '../workspace/store.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { loadDraft, personaOf, personaLabel, holds, type Draft } from '../build/store.js';
import { NATIVE } from '../registry.js';

const when = (s: string | null | undefined) => (s ? s.slice(0, 16).replace('T', ' ') : '—');
const local = (s: string) => new Date(s).toLocaleString(undefined, { hour12: false });

// ------------------------------------------------------------------------------------------------------------ the records of this demonstration, assembled once
export function assemble(w: S.Workspace, d: Draft | null): Records {
  const now = S.now();
  const projects: Records['projects'] = [
    { id: 'PRJ-ATLAS-AV', governance: 'FUNDED', delivery: 'FIELD_ACTIVE', updatedAt: new Date(Date.now() - 6 * 864e5).toISOString(), requestId: 'REQ-0031', history: [{ to: 'ENGINEERING_REVIEW', at: new Date(Date.now() - 60 * 864e5).toISOString() }, { to: 'FIELD_ACTIVE', at: new Date(Date.now() - 12 * 864e5).toISOString() }] },
    { id: 'PRJ-NST-TH', governance: 'APPROVED', delivery: 'DESIGN_DRAFT', updatedAt: new Date(Date.now() - 2 * 864e5).toISOString(), requestId: 'REQ-0034', history: [{ to: 'ENGINEERING_REVIEW', at: new Date(Date.now() - 9 * 864e5).toISOString() }] },
  ];
  if (d) projects.push({ id: d.code, governance: 'FUNDED', delivery: d.design.lifecycle === 'ACCEPTED' || d.design.lifecycle === 'OPERATIONAL' ? 'CUSTOMER_ACCEPTED' : d.design.lifecycle === 'COMMISSIONING' ? 'FIELD_ACTIVE' : 'DESIGN_DRAFT', updatedAt: d.events[0]?.at || d.createdAt, requestId: `REQ-${d.code}`, history: d.events.filter((e) => e.type.startsWith('room.lifecycle:') && e.outcome === 'ALLOWED').map((e) => ({ to: e.type.endsWith('COMMISSIONING') ? 'FIELD_ACTIVE' : e.type.split(':')[1]!, at: e.at })) });
  const rooms: Records['rooms'] = [
    { id: 'R-ATL-4-218', requiresCommissioning: true, devices: 5, baseline: { version: 1, publishedAt: new Date(Date.now() - 120 * 864e5).toISOString(), devicesBound: 5, verifiedTests: 14, applicableTests: 14, exceptions: 0 }, instrumented: true, eligibleForUsage: true },
    { id: 'R-ATL-4-220', requiresCommissioning: true, devices: 2, baseline: { version: 1, publishedAt: new Date(Date.now() - 90 * 864e5).toISOString(), devicesBound: 2, verifiedTests: 9, applicableTests: 9, exceptions: 0 }, instrumented: true, eligibleForUsage: true },
    { id: 'R-ATL-4-231', requiresCommissioning: true, devices: 2, baseline: { version: 1, publishedAt: new Date(Date.now() - 30 * 864e5).toISOString(), devicesBound: 2, verifiedTests: 11, applicableTests: 12, exceptions: 1 }, instrumented: false, eligibleForUsage: true },
    { id: 'R-NST-2-101', requiresCommissioning: true, devices: 9, baseline: null, instrumented: false, eligibleForUsage: true },
  ];
  if (d) rooms.push({ id: d.code, requiresCommissioning: true, devices: d.design.devices.filter((x) => !x.furniture && !x.removed).length, baseline: d.baseline ? { version: d.baseline.version, publishedAt: d.baseline.at, devicesBound: d.baseline.devices.length, verifiedTests: Object.values(d.baseline.results).filter((r) => r === 'PASS_VERIFIED').length, applicableTests: Object.keys(d.baseline.results).length, exceptions: 0 } : null, instrumented: false, eligibleForUsage: false });
  const sessions: Records['sessions'] = []; for (let i = 0; i < 60; i++) sessions.push({ roomId: i % 3 === 0 ? 'R-ATL-4-220' : 'R-ATL-4-218', at: new Date(Date.now() - (i * 1.4 + 0.3) * 864e5).toISOString(), conferencing: i % 4 !== 1, whiteboarding: i % 5 === 0, deviceActivation: i % 7 !== 3, interactiveDisplay: i % 3 !== 0 });
  return { now, projects,
    decisions: [{ projectId: 'PRJ-ATLAS-AV', decision: 'APPROVED', scopeRev: 1, at: new Date(Date.now() - 70 * 864e5).toISOString() }, { projectId: 'PRJ-NST-TH', decision: 'HELD', scopeRev: 1, at: new Date(Date.now() - 20 * 864e5).toISOString() }, { projectId: 'PRJ-NST-TH', decision: 'APPROVED', scopeRev: 2, at: new Date(Date.now() - 10 * 864e5).toISOString() }],
    funding: [{ projectId: 'PRJ-ATLAS-AV', kind: 'AUTHORIZED', amount: 184000, currency: 'USD', at: new Date(Date.now() - 65 * 864e5).toISOString() }],
    workOrders: w.workOrders.map((x) => ({ id: x.id, state: x.state === 'DONE' ? 'RESOLVED' : x.state, openedAt: x.openedAt, resolvedAt: x.state === 'DONE' ? w.incidents.find((i) => i.id === x.incidentId)?.restoredAt || null : null, roomId: x.roomId })),
    incidents: w.incidents.map((i) => ({ id: i.id, state: i.state, roomId: i.roomId, openedAt: i.openedAt, restoredAt: i.restoredAt, recurrenceOf: i.recurrenceOf, reopened: i.reopened })),
    requests: [{ id: 'REQ-0031', projectId: 'PRJ-ATLAS-AV', submittedAt: new Date(Date.now() - 80 * 864e5).toISOString() }, { id: 'REQ-0034', projectId: 'PRJ-NST-TH', submittedAt: new Date(Date.now() - 25 * 864e5).toISOString() }, ...(d ? [{ id: `REQ-${d.code}`, projectId: d.code, submittedAt: d.createdAt }] : [])],
    rooms, documents: rooms.flatMap((r) => [{ roomId: r.id, mandatory: true, state: r.baseline ? 'APPROVED' : 'PENDING', at: r.baseline?.publishedAt || now }, { roomId: r.id, mandatory: true, state: r.baseline && r.id !== 'R-ATL-4-231' ? 'APPROVED' : 'SUBMITTED', at: now }]),
    standards: [{ id: 'STD-ROOM-HUDDLE-3', effectiveAt: new Date(Date.now() - 40 * 864e5).toISOString() }, { id: 'STD-NET-SEG-2', effectiveAt: null }], sops: [{ id: 'SOP-CX-01', createdAt: new Date(Date.now() - 50 * 864e5).toISOString(), approvedAt: new Date(Date.now() - 35 * 864e5).toISOString() }], sows: [{ id: 'SOW-ATL-2026-1', createdAt: new Date(Date.now() - 66 * 864e5).toISOString(), approvedAt: new Date(Date.now() - 64 * 864e5).toISOString() }],
    devices: [{ id: 'A-0101', active: true, supportEnd: '2028-01-01' }, { id: 'A-0102', active: true, supportEnd: '2027-06-30', romLow: 1800, romHigh: 2600 }, { id: 'A-0103', active: true, supportEnd: '2029-03-01' }, { id: 'A-0104', active: true, supportEnd: null }, { id: 'A-0105', active: true, supportEnd: '2027-09-01', romLow: 900, romHigh: 1400 }, { id: 'A-0201', active: true, supportEnd: '2030-01-01' }, { id: 'A-0202', active: true, supportEnd: '2027-06-30', romLow: 1800, romHigh: 2600 }, { id: 'A-0301', active: true, supportEnd: '2026-12-31', romLow: 3200, romHigh: 5600 }, { id: 'A-0302', active: true, supportEnd: null }],
    sessions, profiles: [{ id: 'SCP-DSP-HUDDLE', state: 'PUBLISHED', verifiedCoverage: true }, { id: 'SCP-CAM-BOARD', state: 'PROPOSED', verifiedCoverage: false }], fieldScans: [{ roomId: 'R-ATL-4-231', at: new Date(Date.now() - 20 * 864e5).toISOString(), completed: true }], consentedParticipation: false };
}

// ------------------------------------------------------------------------------------------------------------ Mission Control
export function MissionControl({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective);
  const { w } = useWorkspace(); const d = loadDraft();
  const R = useMemo(() => assemble(w, d), [w, d]);
  const stations: Array<{ key: string; label: string; count: number; href: string; items: string[] }> = [
    { key: 'intake', label: 'Intake', count: R.requests.length, href: '#/v25/build', items: R.requests.map((r) => `${r.id} → ${r.projectId}`) },
    { key: 'decision', label: 'Decision', count: R.decisions.length, href: '#/v25/exec', items: R.decisions.map((x) => `${x.projectId} ${x.decision} (scope ${x.scopeRev})`) },
    { key: 'funding', label: 'Funding', count: R.funding.length, href: '#/v25/exec', items: R.funding.map((f) => `${f.projectId} ${f.amount.toLocaleString()} ${f.currency}`) },
    { key: 'design', label: 'Design', count: R.projects.filter((p) => p.delivery && /DESIGN/.test(p.delivery)).length, href: '#/v25/build', items: R.projects.filter((p) => p.delivery && /DESIGN/.test(p.delivery)).map((p) => `${p.id} ${p.delivery}`) },
    { key: 'commissioning', label: 'Commissioning', count: R.rooms.filter((r) => !r.baseline).length, href: '#/v25/build?tab=checks', items: R.rooms.filter((r) => !r.baseline).map((r) => `${r.id} no accepted baseline yet`) },
    { key: 'field', label: 'Field', count: w.workOrders.filter((x) => x.state !== 'DONE' && x.state !== 'CANCELLED').length, href: '#/v25/service', items: w.workOrders.filter((x) => x.state !== 'DONE').map((x) => `${x.id} ${x.state} · ${x.title}`) },
    { key: 'documents', label: 'Documents', count: R.documents.filter((x) => x.state !== 'APPROVED').length, href: '#/v25/build?tab=drawings', items: R.documents.filter((x) => x.state !== 'APPROVED').map((x) => `${x.roomId} ${x.state}`) },
    { key: 'handoff', label: 'Handoff', count: R.projects.filter((p) => p.delivery === 'CUSTOMER_ACCEPTED').length, href: '#/v25/build?tab=lifecycle', items: R.projects.filter((p) => p.delivery === 'CUSTOMER_ACCEPTED').map((p) => `${p.id} accepted, handoff pending`) },
    { key: 'assurance', label: 'Assurance', count: R.rooms.filter((r) => r.baseline).length, href: '#/v25/build?tab=lifecycle', items: R.rooms.filter((r) => r.baseline).map((r) => `${r.id} baseline v${r.baseline!.version}`) },
    { key: 'service', label: 'Service', count: w.incidents.filter((i) => !['CLOSED', 'CANCELLED'].includes(i.state)).length, href: '#/v25/service', items: w.incidents.filter((i) => !['CLOSED', 'CANCELLED'].includes(i.state)).map((i) => `${i.id} ${i.state} · ${i.title}`) },
  ];
  const latest = [...w.events, ...(d?.events.map((e) => ({ ...e, aggregate: d.code })) || [])].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 12);
  const todo = needsAction(w, d, persona);
  const based = R.rooms.filter((r) => r.baseline).length; const openJobs = w.incidents.filter((i) => !['CLOSED', 'CANCELLED'].includes(i.state));
  const allEvents = [...w.events, ...(d?.events || [])]; const evWeeks = weekCounts(allEvents, (e) => e.at); const denied = allEvents.filter((e) => e.outcome === 'DENIED').length;
  const ICON: Record<string, IconName> = { intake: 'inbox', decision: 'check', funding: 'ticket', design: 'layers', commissioning: 'shield', field: 'wrench', documents: 'book', handoff: 'link', assurance: 'pulse', service: 'route' };
  return (
    <section className="mc wk">
      <PageHero product="mission-control" icon="pulse" eyebrow="Empathia V2.5 · one connected lifecycle" title="What changed, what matters, what needs action"
        lede={<>Intake to decision to design to commissioning to handoff to service — one lifecycle, with the evidence behind every state. <b>{plural(todo.length, 'thing')}</b> wait{todo.length === 1 ? 's' : ''} on <b>{personaLabel(persona)}</b>; <b>{plural(openJobs.length, 'service job')}</b> open.</>}
        meta={[<Chip key="s" small tone="muted">Synthetic records · simulated</Chip>, <Chip key="e" small tone="accent">{plural(allEvents.length, 'event')} in the ledger</Chip>]}
        aside={<ScoreRing value={based} max={R.rooms.length} label="Rooms with an accepted baseline" caption={`${based} of ${R.rooms.length} rooms in the lifecycle`} />} />
      <V25Nav role={perspective} current="#/v25" />
      <div className="kit-grid kit-grid--tiles wk-tiles4" data-testid="tiles">
        <StatTile label="Waiting on you" value={todo.length} icon="bell" tone={todo.length ? 'warn' : 'ok'} hint={todo[0]?.text || 'Nothing waits on this perspective'} />
        <StatTile label="Open service jobs" value={openJobs.length} icon="route" tone="servicehands" href="#/servicehands" spark={weekBacklog(w.incidents, (i) => i.openedAt, (i) => i.closedAt)} delta={deltaOf(weekBacklog(w.incidents, (i) => i.openedAt, (i) => i.closedAt), 'down', 'vs 4 wk ago', { level: true })} />
        <StatTile label="Rooms without a baseline" value={R.rooms.length - based} icon="shield" tone="commissioning" hint="Commissioning not accepted yet" />
        <StatTile label="Ledger events" value={allEvents.length} icon="book" tone="mission-control" spark={evWeeks} delta={deltaOf(evWeeks, 'none', 'vs prior 4 wk')} href="#/v25/ledger" />
      </div>
      <Card icon="route" tone="mission-control" title="Where every record is" sub="The lifecycle, station by station · each count is the live records at that station; open one where it lives">
        <div className="mc__stations" data-testid="stations">{stations.map((s) => <a key={s.key} className="mc__station" href={s.href}><span className="mc__top"><span className="kit-card__icon" aria-hidden="true"><Icon name={ICON[s.key] || 'info'} size={16} /></span><span className="mc__n">{s.count}</span></span><b>{s.label}</b><ul>{s.items.slice(0, 3).map((x) => <li key={x}>{x}</li>)}{s.items.length > 3 && <li className="ui-meta">+{s.items.length - 3} more</li>}{!s.items.length && <li className="ui-meta">nothing pending</li>}</ul></a>)}</div>
      </Card>
      <div className="wk-g2">
        <Card icon="bell" tone="warn" title={`Needs action by ${personaLabel(persona)}`} sub={todo.length ? plural(todo.length, 'step') + ', each opens where it is decided' : undefined}>
          {todo.length ? <List label="Waiting on this perspective">{todo.map((x) => <ListRow key={x.text} title={x.text} href={x.href} chevron leading={<Icon name="arrow-right" />} />)}</List> : <EmptyState title="Nothing waits on this perspective right now" icon="check" />}
        </Card>
        <Card icon="book" title="Latest events" sub={`${plural(denied, 'refusal')} recorded beside the allowed steps`} action={<a className="ui-btn ui-btn--quiet" href="#/v25/ledger">The whole ledger</a>}>
          <ul className="wk-rows">{latest.map((e, i) => <li key={i}><span><b>{e.type}</b><span className="wk-r__m">{('aggregate' in e ? (e as { aggregate: string }).aggregate : '')} · {personaLabel(e.by)} · {when(e.at)}</span></span><Tag tone={e.outcome === 'DENIED' ? 'bad' : 'ok'}>{e.outcome}</Tag></li>)}</ul>
        </Card>
      </div>
      <Foot>Every count is computed in this page from the demonstration’s synthetic records. Nothing is connected to a real system.</Foot>
    </section>
  );
}
function needsAction(w: S.Workspace, d: Draft | null, persona: string): Array<{ text: string; href: string }> {
  const out: Array<{ text: string; href: string }> = [];
  for (const i of w.incidents) {
    if (i.state === 'OPEN' && holds(persona, 'service.triage')) out.push({ text: `Triage ${i.id} · ${i.title}`, href: `#/v25/service?id=${i.id}` });
    if (i.state === 'TRIAGED' && holds(persona, 'service.assign')) out.push({ text: `Assign ${i.id} · ${i.title}`, href: `#/v25/service?id=${i.id}` });
    if (i.state === 'ASSIGNED' && S.techForPersona(persona) === S.workOrderOf(w, i.workOrderId || '')?.techId) out.push({ text: `Accept the job ${i.workOrderId}`, href: `#/v25/service?id=${i.id}` });
    if (i.state === 'VERIFYING' && holds(persona, 'service.verify')) out.push({ text: `Verify the repair on ${i.id}`, href: `#/v25/service?id=${i.id}` });
    if (i.state === 'RESOLVED' && holds(persona, 'service.close')) out.push({ text: `Close ${i.id}`, href: `#/v25/service?id=${i.id}` });
  }
  for (const c of w.learnCases) { if (c.state === 'PROPOSED' && S.LEARN_SME.some((a) => holds(persona, a)) && c.proposedBy !== persona) out.push({ text: `SME review of ${c.id}`, href: `#/v25/learn?case=${c.id}` }); if (c.state === 'SME_REVIEWED' && holds(persona, 'case.approve')) out.push({ text: `Approve ${c.id} for Learn`, href: `#/v25/learn?case=${c.id}` }); }
  if (d) { if (d.design.lifecycle === 'PLANNED' && holds(persona, 'room.design.approve')) out.push({ text: `Approve the design of ${d.name}`, href: '#/v25/build?tab=lifecycle' }); if (d.design.lifecycle === 'COMMISSIONING' && holds(persona, 'tests.verify.all')) out.push({ text: `Record results on ${d.name}`, href: '#/v25/build?tab=lifecycle' }); }
  return out;
}

// ------------------------------------------------------------------------------------------------------------ Executive intelligence
const LEVEL: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = { high: 'ok', medium: 'info', low: 'warn', none: 'muted' };
/** Which building a record belongs to: a room by its id (R-<building>-…), a project by the room it delivers. The Build a Room draft is
 * not placed in a building, so it counts only under "All buildings" (said on the page). */
const PROJECT_BUILDING: Record<string, string> = { 'PRJ-ATLAS-AV': 'ATL', 'PRJ-NST-TH': 'NST' };
const bOfRoom = (id: string | null | undefined) => (id && /^R-([A-Z]+)-/.exec(id)?.[1]) || null;
export function scopeRecords(R: Records, b: string): Records {
  if (b === 'all') return R;
  const inR = (id: string | null | undefined) => bOfRoom(id) === b; const inP = (id: string | null | undefined) => !!id && PROJECT_BUILDING[id] === b;
  return { ...R, projects: R.projects.filter((p) => inP(p.id)), decisions: R.decisions.filter((x) => inP(x.projectId)), funding: R.funding.filter((x) => inP(x.projectId)),
    requests: R.requests.filter((x) => inP(x.projectId)), workOrders: R.workOrders.filter((x) => inR(x.roomId)), incidents: R.incidents.filter((x) => inR(x.roomId)),
    rooms: R.rooms.filter((x) => inR(x.id)), documents: R.documents.filter((x) => inR(x.roomId)), sessions: R.sessions.filter((x) => inR(x.roomId)), fieldScans: R.fieldScans.filter((x) => inR(x.roomId)) };
}
/** Decisions still waiting: a project whose latest decision is HELD, or APPROVED with no authorized funding yet. */
export function pendingFunding(R: Records) {
  return R.projects.flatMap((p): Array<{ id: string; state: string; tone: 'warn' | 'info'; why: string; at: string }> => {
    const last = R.decisions.filter((x) => x.projectId === p.id).sort((a, b) => (a.at < b.at ? 1 : -1))[0];
    const funded = R.funding.filter((f) => f.projectId === p.id && f.kind === 'AUTHORIZED').reduce((a, f) => a + f.amount, 0);
    if (!last) return [{ id: p.id, state: 'Decision pending', tone: 'warn', why: 'no decision recorded yet', at: p.updatedAt }];
    if (last.decision === 'HELD') return [{ id: p.id, state: 'Held', tone: 'warn', why: `held at scope revision ${last.scopeRev}`, at: last.at }];
    if (last.decision === 'APPROVED' && !funded) return [{ id: p.id, state: 'Awaiting funding', tone: 'info', why: `approved at scope revision ${last.scopeRev}; funding is a separate decision`, at: last.at }];
    return [];
  });
}
export function ExecPage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective);
  const { w } = useWorkspace(); const d = loadDraft();
  const [days, setDays] = useState('90'); const [bld, setBld] = useState('all'); const [sel, setSel] = useState<string | null>(null);
  const R0 = useMemo(() => assemble(w, d), [w, d]);
  const R = useMemo(() => scopeRecords(R0, bld), [R0, bld]);
  const ps = useMemo(() => passports(R, Number(days)), [R, days]);
  const prev = useMemo(() => passports({ ...R, now: new Date(Date.parse(R.now) - Number(days) * 864e5).toISOString() }, Number(days)), [R, days]);
  const p = ps.find((x) => x.id === sel) || null;
  const allowed = ['exec', 'opslead', 'bpm', 'syseng', 'svcmgr', 'steward', 'architect'].includes(persona);
  if (!allowed) return <section className="exec"><header className="build__head"><div><p className="kicker">Executive intelligence</p><h1>KPI passports</h1></div></header><Notice tone="warn"><b>Acting as {personaLabel(persona)}: this perspective does not see executive passports.</b> They are read by the executive, operations, business and systems leads, the service manager and the steward; usage figures are aggregate-only for everyone.</Notice></section>;
  const measured = ps.filter((x) => x.state === 'MEASURED'); const high = measured.filter((x) => x.confidence.level === 'high');
  const pend = pendingFunding(R); const committed = R.funding.filter((f) => f.kind === 'AUTHORIZED').reduce((a, f) => a + f.amount, 0);
  const pick = (id: string) => { setSel(id); setTimeout(() => document.getElementById('passport-h')?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), 0); };
  const val = (x: Passport) => (x.state === 'MEASURED' && typeof x.value === 'number' ? `${x.value.toLocaleString('en-GB', { maximumFractionDigits: 1 })}${x.unit === '%' ? '%' : ''}` : '—');
  const unitOf = (x: Passport) => (x.state === 'MEASURED' && x.unit !== '%' ? x.unit : '');
  const bname = bld === 'all' ? 'All buildings' : BUILDINGS.find((b) => b.key === bld)?.name || bld;
  const withRecords = new Set([...R0.rooms.map((r) => bOfRoom(r.id)), ...Object.values(PROJECT_BUILDING)].filter(Boolean));
  return (
    <section className="exec wk">
      <PageHero product="pro" icon="chart" eyebrow="Executive intelligence · shows its work" title="Twenty-seven KPI passports"
        lede={<>Pending decisions, funding and {ps.length} measures computed from the records and the ledger — numerator, denominator, window, coverage, freshness and confidence. Nothing typed in; &ldquo;not measurable&rdquo; is never 0%. Acting as <b>{personaLabel(persona)}</b>.</>}
        meta={[<Chip key="b" small tone="accent">{bname}</Chip>, <Chip key="d" small tone="muted">Last {days} days</Chip>, <Chip key="u" small tone="muted">Usage aggregate-only</Chip>]}
        aside={<ScoreRing value={measured.length} max={ps.length} label="Passports measurable" caption={`${high.length} with high confidence`} />} />
      <div className="wk-filters" data-testid="exec-filters">
        <Segmented label="Period" value={days} onChange={(v) => setDays(v)} options={['30', '90', '180', '365'].map((n) => ({ value: n, label: `${n} days` }))} />
        <Segmented label="Building" value={bld} onChange={(v) => { setBld(v); setSel(null); }} options={[{ value: 'all', label: 'All buildings' }, ...BUILDINGS.filter((b) => withRecords.has(b.key)).map((b) => ({ value: b.key, label: b.short }))]} />
      </div>
      <div className="kit-grid kit-grid--tiles wk-tiles4" data-testid="tiles">
        <StatTile label="Passports measurable" value={measured.length} unit={`of ${ps.length}`} icon="chart" tone="pro" delta={{ value: measured.length - prev.filter((x) => x.state === 'MEASURED').length, good: 'up', label: 'vs the period before' }} />
        <StatTile label="High confidence" value={high.length} icon="shield" tone="ok" hint="Coverage of 90% or more, fresh sources" />
        <StatTile label="Funds committed" value={committed} unit="USD" icon="ticket" tone="info" hint={`${plural(R.funding.length, 'authorization')} on record`} />
        <StatTile label="Decisions waiting" value={pend.length} icon="clock" tone={pend.length ? 'warn' : 'ok'} href="#/v25/decisions" hint="Held, or approved without funding" />
      </div>
      <Card icon="ticket" tone="pro" title="Pending funding and approval" sub={`${plural(pend.length, 'project')} in ${bname.toLowerCase() === 'all buildings' ? 'all buildings' : bname}`} action={<a className="ui-btn ui-btn--quiet" href="#/v25/decisions">Decision desk</a>} testId="pending-funding">
        {pend.length ? <List label="Projects waiting for a decision or funding">{pend.map((x) => <ListRow key={x.id} title={x.id} sub={`${x.why} · since ${when(x.at)}`} leading={<Icon name="clock" />} trailing={<Chip small tone={x.tone}>{x.state}</Chip>} href="#/v25/decisions" chevron />)}</List>
          : <EmptyState title="Nothing is waiting" icon="check">Every project in scope has its decision and its funding.</EmptyState>}
      </Card>
      <Card icon="grid" title="The passports" sub={`Select one to see how it was computed${bld === 'all' && d ? ` · includes the Build a Room draft ${d.code}, which is in no building` : ''}`}>
        <div className="exec__grid" data-testid="passports">{ps.map((x) => {
          const was = prev.find((y) => y.id === x.id);
          const dv = x.state === 'MEASURED' && was?.state === 'MEASURED' && typeof x.value === 'number' && typeof was.value === 'number' ? Math.round((x.value - was.value) * 10) / 10 : null;
          return <button key={x.id} type="button" aria-pressed={x.id === sel} className={`exec__tile${x.id === sel ? ' on' : ''}${x.state === 'NOT_MEASURABLE' ? ' nm' : ''}`} onClick={() => pick(x.id)}>
            <span className="exec__label">{x.label}</span>
            <span className="exec__value">{val(x)}{unitOf(x) ? <small> {unitOf(x)}</small> : null}</span>
            <span className="ui-meta">{x.state === 'MEASURED' ? `${x.numerator} / ${x.denominator}${dv !== null && dv !== 0 ? ` · ${dv > 0 ? '+' : '−'}${Math.abs(dv)} vs before` : ''}` : 'not measurable'}</span>
            {x.coverage.total ? <ProgressBar small label="Coverage" value={x.coverage.observed} max={x.coverage.total} valueText={`${x.coverage.observed}/${x.coverage.total}`} tone={LEVEL[x.confidence.level] === 'ok' ? 'ok' : LEVEL[x.confidence.level] === 'warn' ? 'warn' : 'info'} /> : null}
            <Tag tone={LEVEL[x.confidence.level]}>{x.confidence.level}</Tag></button>;
        })}</div>
      </Card>
      {p && <PassportView p={p} />}
      <Foot>Every figure is computed in this page from the demonstration’s synthetic records; nothing is measured from a real building.</Foot>
    </section>
  );
}
function PassportView({ p }: { p: Passport }) {
  return (
    <section className="kit-card" aria-labelledby="passport-h" data-testid="passport">
      <header className="kit-card__head"><span className="kit-card__icon" aria-hidden="true"><Icon name="book" size={18} /></span><div className="kit-card__titles"><h2 id="passport-h" className="kit-card__title">KPI passport · {p.label} <Tag tone={p.state === 'MEASURED' ? 'ok' : 'muted'}>{p.state}</Tag></h2><p className="kit-card__sub">{p.definition}</p></div></header>
      <div className="kit-card__body">
      <Facts items={[['Value', p.state === 'MEASURED' ? `${p.value}${p.unit === '%' ? '%' : ` ${p.unit}`}` : `not measurable — ${p.reason}`], ['Numerator / denominator', p.numerator === null ? '—' : `${p.numerator} / ${p.denominator}`], ['Window', `${p.window.days} days · ${when(p.window.from)} → ${when(p.window.to)}`], ['Coverage', `${p.coverage.observed} of ${p.coverage.total} eligible records observed`], ['Freshness', p.freshness === null ? '—' : `freshest source ${p.freshness} day(s) old`], ['Confidence', `${p.confidence.level}${p.confidence.reasons.length ? ` — ${p.confidence.reasons.join('; ')}` : ''}`], ['Source · owner · privacy', `${p.source} · ${p.owner} · ${p.privacy}`], ['Exclusions', p.exclusions.join('; ') || 'none'], ['Drill-down', p.drill.length ? p.drill.join(', ') : '—'], ['Version', p.version]]} />
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------------------ Ledger and policy
export const PAGE_AUTHORITIES: Array<{ page: string; href: string; gates: string[] }> = [
  { page: 'Build a Room (Lite · commissioning · acceptance)', href: '#/v25/build', gates: ['room.design', 'room.classify.approve', 'room.design.approve', 'window.approve', 'work.evidence', 'tests.verify.all', 'test.verify', 'customer.accept', 'plan.compile'] },
  { page: 'Search Party', href: '#/search', gates: ['(read within the visible catalogue)'] },
  { page: 'ServiceHands', href: '#/v25/service', gates: ['service.triage', 'service.assign', 'work.accept', 'work.start', 'work.evidence', 'service.verify', 'service.close', 'service.reopen', 'request.submit'] },
  { page: 'APEX', href: '#/v25/apex', gates: S.APEX_ACT_AUTHORITIES },
  { page: 'Learn cases', href: '#/v25/learn', gates: [...new Set([...S.LEARN_PROPOSE, ...S.LEARN_SME, 'case.approve'])] },
  { page: 'Executive passports', href: '#/v25/exec', gates: ['(roles: exec, opslead, bpm, syseng, svcmgr, steward, architect)'] },
];
export function LedgerPage({ perspective, policy }: { perspective: string; policy: boolean }) {
  const persona = personaOf(perspective);
  const { w } = useWorkspace(); const d = loadDraft();
  const [q, setQ] = useState(''); const [only, setOnly] = useState<'all' | 'DENIED' | 'ALLOWED'>('all');
  const events = useMemo(() => [...w.events, ...(d?.events.map((e) => ({ ...e, aggregate: d.code })) || [])].sort((a, b) => (a.at < b.at ? 1 : -1)), [w, d]);
  const shown = events.filter((e) => (only === 'all' || e.outcome === only) && (!q || `${e.type} ${e.aggregate} ${e.detail} ${e.by}`.toLowerCase().includes(q.toLowerCase())));
  const tab = policy ? 'policy' : 'ledger';
  return (
    <section className="ledger">
      <header className="build__head"><div><p className="kicker">Evidence ledger</p><h1>{policy ? 'The role × area matrix the dispatcher uses' : 'The ledger behind every state'}</h1><p className="ui-muted">Acting as <b>{personaLabel(persona)}</b>. Every transition emitted a validated event with its actor, time and local time. This is a demonstration of authorisation, not security.</p></div></header>
      <Tabs label="Ledger" active={tab} onChange={(k) => { location.hash = k === 'policy' ? '#/v25/policy' : '#/v25/ledger'; }} tabs={[{ key: 'ledger', label: 'Events', count: events.length }, { key: 'policy', label: 'Policy' }]} />
      {!policy ? <div className="stack">
        <div className="build__row"><input className="sp__input" aria-label="Filter events" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by type, record, actor or detail" />{(['all', 'ALLOWED', 'DENIED'] as const).map((k) => <Button key={k} small kind={only === k ? 'primary' : 'secondary'} onClick={() => setOnly(k)}>{k}</Button>)}</div>
        <table className="build__table" data-testid="ledger"><thead><tr><th>When (UTC)</th><th>Local</th><th>Who</th><th>Event</th><th>Record</th><th>Outcome</th><th>Detail</th></tr></thead><tbody>{shown.slice(0, 200).map((e, i) => <tr key={i}><td className="ui-mono">{e.at.slice(0, 19).replace('T', ' ')}</td><td className="ui-meta">{local(e.at)}</td><td>{personaLabel(e.by)}</td><td className="ui-mono">{e.type}</td><td className="ui-mono">{e.aggregate}</td><td><Tag tone={e.outcome === 'DENIED' ? 'bad' : 'ok'}>{e.outcome}</Tag></td><td className="ui-meta">{e.detail}</td></tr>)}</tbody></table>
        {shown.length > 200 && <p className="ui-meta">{shown.length - 200} more not shown.</p>}
      </div> : <div className="stack">
        <h2 className="build__h">What each native page checks (from the code that checks it)</h2>
        <table className="build__table" data-testid="policy-gates"><thead><tr><th>Page</th><th>Authorities checked</th><th>{personaLabel(persona)} holds</th></tr></thead><tbody>{PAGE_AUTHORITIES.map((p) => <tr key={p.page}><td><a href={p.href}>{p.page}</a></td><td className="ui-meta">{p.gates.join(', ')}</td><td>{p.gates.filter((g) => !g.startsWith('(')).filter((g) => holds(persona, g)).join(', ') || <span className="ui-meta">none of these</span>}</td></tr>)}</tbody></table>
        <h2 className="build__h">Role × area visibility of the V2.5.3 demonstrator (verbatim)</h2>
        <p className="ui-meta">{areaRoles.areas.length} areas × {areaRoles.roles.length} roles; ● visible to the role. A perspective here shows what that role sees; it grants nothing.</p>
        <div className="ledger__matrix"><table className="build__table" data-testid="policy-matrix"><thead><tr><th>Area</th>{areaRoles.roles.map((r) => <th key={r} className={r === perspective ? 'on' : ''}>{r}</th>)}</tr></thead><tbody>{areaRoles.areas.map((a) => <tr key={a.key}><td>{a.label} <span className="ui-meta mono">{a.key}</span>{NATIVE.has(a.key) && <Tag tone="ok">native</Tag>}</td>{areaRoles.roles.map((r) => <td key={r} className={r === perspective ? 'on' : ''}>{a.roles.includes(r) ? '●' : ''}</td>)}</tr>)}</tbody></table></div>
        <h2 className="build__h">APEX action tiers</h2>
        <ul className="plain">{Object.entries(TIERS).map(([k, t]) => <li key={k}><b>{k} · {t.label}</b> <span className="ui-meta">{t.bound} · {t.autonomous ? 'may run on its own within its bound' : 'never autonomous'}</span></li>)}</ul>
      </div>}
    </section>
  );
}
