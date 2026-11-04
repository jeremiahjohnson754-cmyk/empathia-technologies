/**
 * Mission Control's numbers and queues (pages/Home.tsx), computed from the demonstration's records — the 45 room records, the programme,
 * the service workspace and the Build a Room draft — never typed in. Pure functions: the page renders them, the unit suite checks them.
 *
 *   - series(): month-end series over the last 12 months of the records (tests verified, rooms accepted, room events, service requests),
 *     each a count read from dated events; the demonstration's fixed "now" (DEMO_NOW) anchors room events, the clock anchors the workspace.
 *   - flow(): every room on one station of the delivery flow (Intake → … → Service → In operation), from its lifecycle, baselines and
 *     open issues; Intake counts the programme's requests and the Build a Room draft.
 *   - priorities(): what waits for a person, each naming whose work it is (role keys) and the verb that starts it (Take action, Resume,
 *     Review); the page shows the viewer's own first (View as changes the list) and never offers an address the role cannot open (D44).
 *   - incidents(), activeRooms(), savedWork(), insight(): the inspiration composition, each row opening the record it names.
 */
import type { RoleKey } from '../registry.types.js';
import { allRecords, DEMO_NOW, type RoomRecord } from './design.js';
import { roomById, roomHref, shortName, fullName } from './canon.js';
import { roomHealth, roomIssues, attentionQueue } from './metrics.js';
import { programme } from './programme.js';
import type { Workspace } from '../workspace/store.js';

const DAY = 864e5;
const LIVE = new Set(['OPEN', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'VERIFYING', 'REOPENED']);

// ------------------------------------------------------------------------------------------------------------ month-end series
export interface Series { label: string; values: number[]; months: string[] }
/** Month ends, oldest first: `n` points ending at `end`. */
const monthEnds = (end: number, n: number) => Array.from({ length: n }, (_, i) => { const d = new Date(end); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - (n - 1 - i) + 1); return d.getTime() - 1; });
const label = (t: number) => new Date(t).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });

export function series(w: Workspace | null, n = 12, recs: RoomRecord[] = allRecords()): { verified: Series; accepted: Series; activity: Series; requests: Series } {
  const ends = monthEnds(DEMO_NOW, n); const months = ends.map(label);
  const ev = recs.flatMap((r) => r.events.map((e) => ({ t: Date.parse(e.at), type: e.type, detail: e.detail, room: r.outline.id })));
  const cum = (pred: (e: typeof ev[number]) => boolean) => ends.map((t) => ev.filter((e) => e.t <= t && pred(e)).length);
  // a room counts as accepted at a month end when its last lifecycle change by then ended in ACCEPTED or OPERATIONAL
  const accepted = ends.map((t) => recs.filter((r) => { const last = r.events.filter((e) => e.type === 'room.lifecycle_changed' && Date.parse(e.at) <= t).sort((a, b) => a.at.localeCompare(b.at)).pop(); return !!last && /→ (ACCEPTED|OPERATIONAL)\b/.test(last.detail); }).length);
  // workspace times are real clock times: bucket them by month counted back from today
  const wEnds = monthEnds(Date.now(), n);
  const requests = wEnds.map((t, i) => (w?.incidents || []).filter((x) => { const o = Date.parse(x.openedAt); return o <= t && o > (i ? wEnds[i - 1]! : t - 31 * DAY); }).length);
  const activity = ends.map((t, i) => ev.filter((e) => e.t <= t && e.t > (i ? ends[i - 1]! : t - 31 * DAY) && e.type !== 'record.kept').length);
  return {
    verified: { label: 'Tests independently verified, cumulative, by month end', values: cum((e) => e.type === 'commission.result_verified'), months },
    accepted: { label: 'Rooms accepted, by month end', values: accepted, months },
    activity: { label: 'Room events recorded per month', values: activity, months },
    requests: { label: 'Service requests opened per month', values: requests, months },
  };
}

// ------------------------------------------------------------------------------------------------------------ the delivery flow
export type StationKey = 'intake' | 'design' | 'procurement' | 'installation' | 'commissioning' | 'acceptance' | 'service' | 'operating';
export interface Station { key: StationKey; label: string; help: string; count: number; rooms: Array<{ id: string; label: string; href: string }>; blocked: number; href: string; items?: string[] }
const STATIONS: Array<[StationKey, string, string]> = [
  ['intake', 'Intake', 'Requests on record, waiting for or past a decision'],
  ['design', 'Design', 'Rooms planned or designed, not yet approved'],
  ['procurement', 'Procurement', 'Design approved, installation not yet scheduled'],
  ['installation', 'Installation', 'Installation pending'],
  ['commissioning', 'Commissioning', 'Installed; tests being recorded and verified'],
  ['acceptance', 'Acceptance', 'A baseline waits for a reviewer'],
  ['service', 'Service', 'Accepted rooms with something open'],
  ['operating', 'In operation', 'Accepted, nothing open'],
];
export function stationOf(r: RoomRecord, w: Workspace | null): StationKey {
  if (r.baselines.some((b) => b.state === 'PENDING_ACCEPTANCE')) return 'acceptance';
  switch (r.lifecycle) {
    case 'PLANNED': return 'design';
    case 'DESIGN_APPROVED': return 'procurement';
    case 'INSTALLATION_PENDING': return 'installation';
    case 'INSTALLED_UNVERIFIED': case 'COMMISSIONING': return 'commissioning';
    default: return roomIssues(r, w).length ? 'service' : 'operating';
  }
}
export function flow(w: Workspace | null, draft: { code: string; name: string } | null = null, recs: RoomRecord[] = allRecords()): Station[] {
  const P = programme();
  const out: Station[] = STATIONS.map(([key, l, help]) => ({ key, label: l, help, count: 0, rooms: [], blocked: 0, href: key === 'intake' ? '#/v25/build' : `#/rooms?station=${key}` }));
  const at = (k: StationKey) => out.find((s) => s.key === k)!;
  const intake = at('intake'); intake.items = [...P.requests.map((q) => `${q.id} · ${q.title}`), ...(draft ? [`${draft.code} · ${draft.name} (Build a Room draft)`] : [])]; intake.count = intake.items.length;
  for (const r of recs) {
    const s = at(stationOf(r, w)); s.count += 1; s.rooms.push({ id: r.outline.id, label: shortName(r.outline), href: roomHref(r.outline) });
    // held: a record is holding the room at this station (an engine refusal, a failed test); an operating room's refusal to become
    // OPERATIONAL without live monitoring is not a hold on its delivery, so it is not counted there
    if (s.key !== 'operating' && s.key !== 'service' && (r.nextStep?.blockers.length || r.counts.failed)) s.blocked += 1;
  }
  return out;
}

// ------------------------------------------------------------------------------------------------------------ priorities
export type Verb = 'Take action' | 'Resume' | 'Review';
export interface Priority { id: string; title: string; where: string; whose: RoleKey[]; decides: string; verb: Verb; href: string; tone: 'bad' | 'warn' | 'info'; at?: string }
const SVC: RoleKey[] = ['svcmgr', 'ops', 'service'];
/** What waits for a person, from the records, most severe first. `whose` names the roles whose work it is (V2.5.3 AZ_ROLE). */
export function priorities(w: Workspace | null, recs: RoomRecord[] = allRecords()): Priority[] {
  const out: Priority[] = [];
  for (const i of w?.incidents || []) {
    if (!LIVE.has(i.state)) continue;
    const o = roomById(i.roomId); const wo = (w?.workOrders || []).find((x) => x.incidentId === i.id && !['DONE', 'CANCELLED'].includes(x.state));
    const hi = i.severity === 'High' || i.severity === 'Mission critical';
    if (i.state === 'OPEN') out.push({ id: i.id, title: `Triage ${i.id}: ${i.title}`, where: o ? shortName(o) : i.roomName, whose: SVC, decides: 'The service manager triages', verb: 'Take action', href: `#/v25/service?id=${i.id}`, tone: hi ? 'bad' : 'warn', at: i.openedAt });
    else out.push({ id: i.id, title: `${i.id} is ${i.state.toLowerCase().replace(/_/g, ' ')}: ${i.title}${wo ? ` · ${wo.id} ${wo.state.toLowerCase()}` : ''}`, where: o ? shortName(o) : i.roomName, whose: ['service', 'installer', 'svcmgr', 'ops'], decides: 'The assigned technician continues it', verb: 'Resume', href: `#/v25/service?id=${i.id}`, tone: hi ? 'bad' : 'warn', at: i.openedAt });
  }
  for (const r of recs) {
    if (r.exception?.state === 'PENDING_APPROVAL') out.push({ id: r.exception.id, title: `Approve or refuse the design exception ${r.exception.id}`, where: shortName(r.outline), whose: ['qa', 'syseng', 'designer', 'ops'], decides: 'An independent reviewer decides', verb: 'Review', href: `${roomHref(r.outline)}?tab=history`, tone: 'warn' });
    const pend = r.baselines.find((b) => b.state === 'PENDING_ACCEPTANCE');
    if (pend) out.push({ id: `${r.outline.id}-v${pend.version}`, title: `Accept baseline v${pend.version}${r.nextStep?.blockers.length ? ` — held: ${r.nextStep.blockers.length} reason${r.nextStep.blockers.length === 1 ? '' : 's'}` : ''}`, where: shortName(r.outline), whose: ['qa', 'cxeng', 'syseng', 'ops'], decides: 'The QA reviewer decides', verb: 'Review', href: `${roomHref(r.outline)}?tab=history`, tone: 'warn' });
    if (r.lifecycle === 'COMMISSIONING' && !pend && r.counts.applicable) { const left = r.counts.applicable - r.counts.verified; if (left > 0) out.push({ id: `CX-${r.outline.id}`, title: `Complete commissioning: ${left} of ${r.counts.applicable} tests not yet verified`, where: shortName(r.outline), whose: ['cxeng', 'installer', 'syseng', 'ops'], decides: 'The commissioning engineer records, another person verifies', verb: 'Resume', href: `${roomHref(r.outline)}?tab=tests`, tone: r.counts.failed ? 'bad' : 'info' }); }
  }
  for (const x of attentionQueue(w)) for (const i of roomIssues(x.r, w).filter((y) => !y.live && y.state === 'OPEN')) out.push({ id: i.id, title: i.title, where: shortName(x.r.outline), whose: ['ops', 'service', 'svcmgr', 'syseng'], decides: `${i.severity} · ${i.source}`, verb: 'Take action', href: `${roomHref(x.r.outline)}`, tone: i.severity === 'High' ? 'bad' : 'warn' });
  const P = programme();
  for (const p of P.projects) if (p.governance === 'APPROVED' && !P.funding.some((f) => f.projectId === p.id)) { const o = roomById(p.roomIds[0] || ''); out.push({ id: p.id, title: `Fund ${p.id} (approved at scope ${Math.max(...P.decisions.filter((d) => d.projectId === p.id).map((d) => d.scopeRev))})`, where: o ? shortName(o) : p.id, whose: ['exec', 'bpm'], decides: 'The executive sponsor decides', verb: 'Review', href: '#/v25/decisions', tone: 'info' }); }
  const rank = { bad: 0, warn: 1, info: 2 } as const;
  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))).sort((a, b) => rank[a.tone] - rank[b.tone]);
}
/** The viewer's own items first; `opens` removes what the role cannot open (D44). */
export function prioritiesFor(role: RoleKey, opens: (href: string) => boolean, all: Priority[]): { mine: Priority[]; others: Priority[] } {
  const ok = all.filter((p) => opens(p.href.split('?')[0]!));
  const owns = (p: Priority) => role === 'architect' || p.whose.includes(role);
  return { mine: ok.filter(owns), others: ok.filter((p) => !owns(p)) };
}

// ------------------------------------------------------------------------------------------------------------ incidents, active rooms, saved work
export interface IncidentRow { id: string; title: string; severity: string; state: string; room: string; roomHref?: string; href: string; at: string; live: boolean }
export function incidents(w: Workspace | null): IncidentRow[] {
  return [...(w?.incidents || [])].sort((a, b) => Number(LIVE.has(b.state)) - Number(LIVE.has(a.state)) || b.openedAt.localeCompare(a.openedAt)).map((i) => { const o = roomById(i.roomId); return { id: i.id, title: i.title, severity: i.severity, state: i.state, room: o ? shortName(o) : i.roomName, roomHref: o ? roomHref(o) : undefined, href: `#/v25/service?id=${i.id}`, at: i.openedAt, live: LIVE.has(i.state) }; });
}
export interface ActiveRoom { id: string; label: string; name: string; href: string; why: string; tone: 'bad' | 'warn' | 'info' | 'accent'; score: number | null }
/** Rooms with something happening now: a live request or work order, commissioning in progress, a baseline pending. */
export function activeRooms(w: Workspace | null, recs: RoomRecord[] = allRecords()): ActiveRoom[] {
  const out: ActiveRoom[] = [];
  for (const r of recs) {
    const live = (w?.incidents || []).filter((i) => i.roomId === r.outline.id && LIVE.has(i.state)); const wo = (w?.workOrders || []).filter((x) => x.roomId === r.outline.id && !['DONE', 'CANCELLED'].includes(x.state));
    const pend = r.baselines.some((b) => b.state === 'PENDING_ACCEPTANCE');
    const why = [live.length ? `${live.length} live request${live.length === 1 ? '' : 's'}` : '', wo.length ? `${wo.length} work order${wo.length === 1 ? '' : 's'} open` : '', r.lifecycle === 'COMMISSIONING' ? `commissioning · ${r.counts.verified} of ${r.counts.applicable} verified` : '', pend ? 'baseline pending acceptance' : ''].filter(Boolean);
    if (why.length) out.push({ id: r.outline.id, label: shortName(r.outline), name: r.outline.name, href: roomHref(r.outline), why: why.join(' · '), tone: live.some((i) => i.severity !== 'Standard') ? 'bad' : live.length ? 'warn' : pend ? 'accent' : 'info', score: roomHealth(r, w).score });
  }
  const rank = { bad: 0, warn: 1, accent: 2, info: 3 } as const;
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}
export interface Saved { id: string; title: string; sub: string; href: string; icon: string; at?: string }
/** Work a person left part-way, from the records: the Build a Room draft, open diagnoses, unreviewed lessons, field scans in progress. */
export function savedWork(w: Workspace | null, draft: { code: string; name: string; createdAt: string; design?: { lifecycle?: string } } | null): Saved[] {
  const out: Saved[] = [];
  if (draft) out.push({ id: draft.code, title: `${draft.name || draft.code} — Build a Room draft`, sub: `${draft.code} · ${(draft.design?.lifecycle || 'PLANNED').replace(/_/g, ' ').toLowerCase()}`, href: '#/v25/build', icon: 'cube', at: draft.createdAt });
  for (const a of w?.apexCases || []) if (!a.reviewed) out.push({ id: a.id, title: `APEX diagnosis ${a.id}`, sub: `${a.hypotheses.length} hypotheses · not yet reviewed`, href: `#/v25/apex?id=${a.id}`, icon: 'pulse', at: a.openedAt });
  for (const l of w?.learnCases || []) if (l.state !== 'APPROVED' && l.state !== 'REJECTED') out.push({ id: l.id, title: `Lesson ${l.id}: ${l.title}`, sub: `${l.state.toLowerCase().replace(/_/g, ' ')}`, href: '#/v25/learn', icon: 'book', at: l.proposedAt });
  for (const s of w?.fiSessions || []) if (!s.terminal) { const o = roomById(s.roomId); out.push({ id: s.id, title: `Field scan ${s.id}`, sub: `${o ? fullName(o) : s.roomId} · ${s.state.toLowerCase().replace(/_/g, ' ')} · simulated`, href: `#/v25/fi/scan/${s.roomId}`, icon: 'search', at: s.log[0]?.at }); }
  return out;
}

// ------------------------------------------------------------------------------------------------------------ the Search Party insight
export function insight(w: Workspace | null, recs: RoomRecord[] = allRecords()): { text: string; asks: Array<{ q: string; href: string }> } {
  const live = (w?.incidents || []).filter((i) => LIVE.has(i.state)).length;
  const wo = (w?.workOrders || []).filter((x) => !['DONE', 'CANCELLED'].includes(x.state)).length;
  const cx = recs.filter((r) => r.lifecycle === 'COMMISSIONING').length;
  const first = attentionQueue(w)[0];
  const p = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  return {
    text: `${p(live, 'live service request')}, ${p(wo, 'open work order')} and ${p(cx, 'room')} in commissioning are on record${first ? `; ${shortName(first.r.outline)} comes first` : ''}.`,
    asks: [
      { q: 'If this switch fails, what is affected?', href: '#/search/scenarios/S1' },
      { q: first ? `Who supports ${shortName(first.r.outline)}?` : 'Who supports this space?', href: first ? `#/search/scenarios/S2?room=${first.r.outline.id}` : '#/search/scenarios/S2' },
      { q: first ? `What connects to ${shortName(first.r.outline)}?` : 'What connects to the reference room?', href: `#/search?focus=Room:${first?.r.outline.id || 'R-ATL-4-218'}` },
    ],
  };
}
