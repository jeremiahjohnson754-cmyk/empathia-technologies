/**
 * Every number the campus, the room page and Mission Control show, computed from the demonstration's records — never typed in.
 *
 *   Health (MODELED, not measured): a room's record, scored. 100, less 15 for each open High issue, 8 for each Medium, 4 for each Low,
 *   less up to 30 for failed tests and up to 20 for tests not yet run (in proportion to the tests that apply). A room whose record
 *   holds no test result is not scored ("no evidence") rather than given a number. Bands as in V2.5.3: 88 or more Healthy, 75–87
 *   Monitor, below 75 Action required. A building's and the campus's score is the mean of their scored rooms.
 *
 *   Open issues: the room record's issues plus the service workspace's live incidents for the room (one per id; the live record wins),
 *   so a repair closed in ServiceHands lowers the count everywhere at once.
 *
 *   Delivery spine: nine stages from Intake to Service, each read from a record (programme, design, positions, installations, the
 *   engine's results, baselines, the service workspace). A stage is DONE only when a record says so.
 */
import type { RoomLifecycle } from '@empathia/domain-types';
import { BUILDINGS, REGIONAL_SITES, CAMPUS_ROOMS as ROOMS, roomById, shortName, type Building, type RoomOutline } from './canon.js';
import { roomRecord, allRecords, PEOPLE, type RoomRecord, type Issue } from './design.js';
import { programme } from './programme.js';
import type { Workspace, Incident, WorkOrder } from '../workspace/store.js';

export type Band = 'healthy' | 'monitor' | 'action' | 'none';
export const BAND_LABEL: Record<Band, string> = { healthy: 'Healthy', monitor: 'Monitor', action: 'Action required', none: 'Not scored' };
export const bandOf = (score: number | null): Band => (score == null ? 'none' : score >= 88 ? 'healthy' : score >= 75 ? 'monitor' : 'action');
export const BAND_TONE: Record<Band, 'ok' | 'warn' | 'bad' | 'muted'> = { healthy: 'ok', monitor: 'warn', action: 'bad', none: 'muted' };

const LIVE = new Set(['OPEN', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'VERIFYING', 'REOPENED']);
const SEV: Record<string, Issue['severity']> = { 'Mission critical': 'High', High: 'High', Standard: 'Medium' };
export interface OpenIssue { id: string; title: string; severity: Issue['severity']; state: string; source: string; positions: string[]; live: boolean; openedAt?: string; href?: string }

/** The room's open issues: record issues not resolved, plus live service incidents (the live record wins on the same id). */
export function roomIssues(r: RoomRecord, w?: Workspace | null): OpenIssue[] {
  const live = (w?.incidents || []).filter((i) => i.roomId === r.outline.id);
  const liveIds = new Set(live.map((i) => i.id));
  const out: OpenIssue[] = r.issues.filter((i) => i.state !== 'RESOLVED' && !liveIds.has(i.id)).map((i) => ({ id: i.id, title: i.title, severity: i.severity, state: i.state, source: i.source, positions: i.positions, live: false }));
  for (const i of live) if (LIVE.has(i.state)) out.push({ id: i.id, title: i.title, severity: SEV[i.severity] || 'Medium', state: i.state, source: 'ServiceHands request', positions: [], live: true, openedAt: i.openedAt, href: `#/v25/service?id=${i.id}` });
  const rank = { High: 0, Medium: 1, Low: 2 } as const;
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || a.id.localeCompare(b.id));
}

export interface Health { score: number | null; band: Band; parts: Array<{ label: string; points: number }>; why: string }
export function roomHealth(r: RoomRecord, w?: Workspace | null): Health {
  const c = r.counts; const recorded = c.applicable - c.notTested;
  if (!c.applicable || recorded <= 0) return { score: null, band: 'none', parts: [], why: 'The record holds no test result, so the room is not scored.' };
  const iss = roomIssues(r, w);
  const n = (s: Issue['severity']) => iss.filter((i) => i.severity === s).length;
  const parts = [
    { label: `${n('High')} open High issue${n('High') === 1 ? '' : 's'} × 15`, points: -15 * n('High') },
    { label: `${n('Medium')} open Medium × 8`, points: -8 * n('Medium') },
    { label: `${n('Low')} open Low × 4`, points: -4 * n('Low') },
    { label: `${c.failed} of ${c.applicable} tests failed`, points: -Math.round((30 * c.failed) / c.applicable) },
    { label: `${c.notTested} of ${c.applicable} tests not yet run`, points: -Math.round((20 * c.notTested) / c.applicable) },
  ].filter((p) => p.points < 0);
  const score = Math.max(0, Math.min(100, 100 + parts.reduce((s, p) => s + p.points, 0)));
  return { score, band: bandOf(score), parts, why: parts.length ? parts.map((p) => `${p.label} (${p.points})`).join(' · ') : 'No open issue and every applicable test has a result.' };
}

const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

export interface BuildingStats { b: Building; rooms: number; scored: number; score: number | null; band: Band; open: number; high: number; devices: number; applicable: number; verified: number; verifiedPct: number | null; byLife: Record<string, number> }
export function buildingStats(key: string, w?: Workspace | null): BuildingStats {
  const b = BUILDINGS.find((x) => x.key === key) || REGIONAL_SITES.find((x) => x.key === key)!;
  const recs = allRecords().filter((r) => r.outline.building === key);
  const hs = recs.map((r) => roomHealth(r, w)); const scores = hs.map((h) => h.score).filter((s): s is number => s != null);
  const iss = recs.flatMap((r) => roomIssues(r, w));
  const applicable = recs.reduce((s, r) => s + r.counts.applicable, 0); const verified = recs.reduce((s, r) => s + r.counts.verified, 0);
  const byLife: Record<string, number> = {}; for (const r of recs) byLife[r.lifecycle] = (byLife[r.lifecycle] || 0) + 1;
  const score = mean(scores);
  return { b, rooms: recs.length, scored: scores.length, score, band: bandOf(score), open: iss.length, high: iss.filter((i) => i.severity === 'High').length, devices: recs.reduce((s, r) => s + r.positions.filter((p) => !p.furniture).length, 0), applicable, verified, verifiedPct: applicable ? Math.round((100 * verified) / applicable) : null, byLife };
}

export interface CampusStats { buildings: BuildingStats[]; /** the fictional regional sites of the rooms plan (not on the campus map) */ sites: BuildingStats[]; rooms: number; devices: number; score: number | null; band: Band; scored: number; healthy: number; monitor: number; action: number; unscored: number; open: number; high: number; applicable: number; verified: number; verifiedPct: number | null; accepted: number; byLife: Record<string, number> }
export function campusStats(w?: Workspace | null): CampusStats {
  const recs = allRecords(); const hs = recs.map((r) => roomHealth(r, w));
  const scores = hs.map((h) => h.score).filter((s): s is number => s != null);
  const iss = recs.flatMap((r) => roomIssues(r, w));
  const applicable = recs.reduce((s, r) => s + r.counts.applicable, 0); const verified = recs.reduce((s, r) => s + r.counts.verified, 0);
  const byLife: Record<string, number> = {}; for (const r of recs) byLife[r.lifecycle] = (byLife[r.lifecycle] || 0) + 1;
  const score = mean(scores);
  return {
    buildings: BUILDINGS.map((b) => buildingStats(b.key, w)), sites: REGIONAL_SITES.map((b) => buildingStats(b.key, w)), rooms: recs.length, devices: recs.reduce((s, r) => s + r.positions.filter((p) => !p.furniture).length, 0),
    score, band: bandOf(score), scored: scores.length, healthy: hs.filter((h) => h.band === 'healthy').length, monitor: hs.filter((h) => h.band === 'monitor').length, action: hs.filter((h) => h.band === 'action').length, unscored: hs.filter((h) => h.band === 'none').length,
    open: iss.length, high: iss.filter((i) => i.severity === 'High').length, applicable, verified, verifiedPct: applicable ? Math.round((100 * verified) / applicable) : null,
    accepted: recs.filter((r) => r.baselines.some((x) => x.state === 'CURRENT')).length, byLife,
  };
}

/** Rooms ordered by what needs attention first: lowest score, then most open issues. */
export function attentionQueue(w?: Workspace | null): Array<{ r: RoomRecord; h: Health; issues: OpenIssue[] }> {
  return allRecords().map((r) => ({ r, h: roomHealth(r, w), issues: roomIssues(r, w) })).filter((x) => x.issues.length || (x.h.score != null && x.h.band !== 'healthy'))
    .sort((a, b) => (a.h.score ?? 101) - (b.h.score ?? 101) || b.issues.length - a.issues.length);
}

// ------------------------------------------------------------------------------------------------------------ the delivery spine
export type StageState = 'DONE' | 'IN_PROGRESS' | 'BLOCKED' | 'NOT_STARTED' | 'NO_RECORD';
export interface Stage { key: string; label: string; state: StageState; detail: string; source: string; href?: string }
const ORDER: RoomLifecycle[] = ['PLANNED', 'DESIGN_APPROVED', 'INSTALLATION_PENDING', 'INSTALLED_UNVERIFIED', 'COMMISSIONING', 'ACCEPTED', 'OPERATIONAL'];
const reached = (r: RoomRecord, s: RoomLifecycle) => ORDER.indexOf(r.lifecycle) >= ORDER.indexOf(s) || r.baselines.some((b) => b.state === 'CURRENT');

export function spine(r: RoomRecord, w?: Workspace | null): Stage[] {
  const P = programme(); const id = r.outline.id;
  const prj = P.projects.find((p) => p.roomIds.includes(id)); const req = prj ? P.requests.find((q) => q.id === prj.requestId) : undefined;
  const dec = prj ? P.decisions.filter((d) => d.projectId === prj.id) : []; const fund = prj ? P.funding.filter((f) => f.projectId === prj.id) : [];
  const hw = r.positions.filter((p) => !p.furniture);
  const designIssues = r.issues.filter((i) => i.state !== 'RESOLVED' && i.id.startsWith('DD-'));
  const cur = r.baselines.find((b) => b.state === 'CURRENT'); const pend = r.baselines.find((b) => b.state === 'PENDING_ACCEPTANCE');
  const incidents = (w?.incidents || []).filter((i: Incident) => i.roomId === id && LIVE.has(i.state)); const wos = (w?.workOrders || []).filter((x: WorkOrder) => x.roomId === id && !['DONE', 'CANCELLED'].includes(x.state));
  const issues = roomIssues(r, w); const c = r.counts;
  const designed = r.events.some((e) => e.type === 'room.design_created') || r.outline.kind === 'earlier';
  const st: Stage[] = [
    req ? { key: 'intake', label: 'Intake', state: 'DONE', detail: `${req.id} → ${prj!.id}`, source: 'programme request', href: '#/home' }
      : { key: 'intake', label: 'Intake', state: 'NO_RECORD', detail: 'No request on record', source: 'programme (none for this room)' },
    designIssues.length ? { key: 'design', label: 'Design', state: 'BLOCKED', detail: `${designIssues.length} High design deficienc${designIssues.length === 1 ? 'y' : 'ies'} open`, source: 'engine design check' }
      : reached(r, 'DESIGN_APPROVED') ? { key: 'design', label: 'Design', state: 'DONE', detail: `Approved · revision ${r.baselines.length ? Math.max(...r.baselines.map((b) => b.revision)) : 1}`, source: 'room events' }
      : designed ? { key: 'design', label: 'Design', state: 'IN_PROGRESS', detail: 'Designed, not yet approved', source: 'room events' } : { key: 'design', label: 'Design', state: 'NO_RECORD', detail: 'No design on record', source: 'room record' },
    hw.length ? { key: 'selection', label: 'Selection', state: 'DONE', detail: `${hw.length} device position${hw.length === 1 ? '' : 's'}`, source: 'room positions' } : { key: 'selection', label: 'Selection', state: 'NO_RECORD', detail: 'No device on record', source: 'room positions' },
    prj ? { key: 'project', label: 'Project', state: prj.delivery === 'CUSTOMER_ACCEPTED' ? 'DONE' : 'IN_PROGRESS', detail: `${prj.id} · ${prj.delivery.replace(/_/g, ' ').toLowerCase()}`, source: 'programme project' }
      : { key: 'project', label: 'Project', state: 'NO_RECORD', detail: 'No project', source: 'programme (none for this room)' },
    fund.length ? { key: 'procurement', label: 'Procurement', state: 'DONE', detail: `${fund.reduce((s, f) => s + f.amount, 0).toLocaleString('en-US')} USD authorized`, source: 'programme funding' }
      : dec.length ? { key: 'procurement', label: 'Procurement', state: 'IN_PROGRESS', detail: `${dec[dec.length - 1]!.decision.toLowerCase()} (scope ${dec[dec.length - 1]!.scopeRev}), not funded`, source: 'programme decisions' }
      : { key: 'procurement', label: 'Procurement', state: 'NO_RECORD', detail: 'No record', source: 'programme (none for this room)' },
    r.installations.length && reached(r, 'INSTALLED_UNVERIFIED') ? { key: 'installation', label: 'Installation', state: 'DONE', detail: `${r.installations.filter((x) => !x.removedAt).length} units installed`, source: 'installations' }
      : reached(r, 'INSTALLATION_PENDING') ? { key: 'installation', label: 'Installation', state: 'IN_PROGRESS', detail: 'Installation pending', source: 'room lifecycle' } : { key: 'installation', label: 'Installation', state: 'NOT_STARTED', detail: 'Not installed', source: 'room lifecycle' },
    !c.applicable || c.applicable === c.notTested ? { key: 'commissioning', label: 'Commissioning', state: reached(r, 'COMMISSIONING') ? 'IN_PROGRESS' : 'NOT_STARTED', detail: c.applicable ? `0 of ${c.applicable} tests recorded` : 'No applicable test', source: 'engine results' }
      : c.failed ? { key: 'commissioning', label: 'Commissioning', state: 'BLOCKED', detail: `${c.failed} failed · ${c.verified} of ${c.applicable} verified`, source: 'engine results' }
      : { key: 'commissioning', label: 'Commissioning', state: c.verified === c.applicable ? 'DONE' : 'IN_PROGRESS', detail: `${c.verified} of ${c.applicable} verified`, source: 'engine results' },
    pend ? { key: 'acceptance', label: 'Acceptance', state: r.nextStep?.blockers.length ? 'BLOCKED' : 'IN_PROGRESS', detail: `v${pend.version} pending${cur ? ` · v${cur.version} current` : ''}`, source: 'baselines' }
      : cur ? { key: 'acceptance', label: 'Acceptance', state: 'DONE', detail: `Baseline v${cur.version} accepted`, source: 'baselines' }
      : { key: 'acceptance', label: 'Acceptance', state: 'NOT_STARTED', detail: 'No accepted baseline', source: 'baselines' },
    incidents.length || issues.length ? { key: 'service', label: 'Service', state: 'IN_PROGRESS', detail: `${incidents.length} open request${incidents.length === 1 ? '' : 's'} · ${wos.length} work order${wos.length === 1 ? '' : 's'} · ${issues.length} open issue${issues.length === 1 ? '' : 's'}`, source: 'service workspace and room issues', href: incidents[0] ? `#/v25/service?id=${incidents[0].id}` : undefined }
      : cur ? { key: 'service', label: 'Service', state: 'DONE', detail: 'Nothing open', source: 'service workspace' } : { key: 'service', label: 'Service', state: 'NOT_STARTED', detail: 'Not in service yet', source: 'room lifecycle' },
  ];
  return st;
}

// ------------------------------------------------------------------------------------------------------------ where the room has moved
export interface Move { at: string; title: string; from: string; to: string; by: string; kind: 'unit' | 'baseline' | 'issue' | 'lifecycle' | 'exception' }
/** What changed after the room was first accepted, read from its installations, baselines, issues and events. */
export function moves(r: RoomRecord): Move[] {
  const accepted = [...r.events].reverse().find((e) => e.type === 'room.lifecycle_changed' && /→ ACCEPTED$/.test(e.detail));
  if (!accepted) return [];
  const after = r.events.filter((e) => e.at > accepted.at);
  const who = (p: string) => PEOPLE[p] || p;
  const out: Move[] = [];
  for (const x of r.installations.filter((i) => i.removedAt)) { const next = r.installations.find((i) => i.position === x.position && i.installedAt >= x.removedAt!); const p = r.positions.find((q) => q.code === x.position); out.push({ at: x.removedAt!, title: `${p?.label || x.position} unit replaced`, from: x.asset, to: next?.asset || '—', by: who(next?.by || 'installer'), kind: 'unit' }); }
  for (const e of after) {
    if (e.type === 'room.lifecycle_changed') { const [f, t] = e.detail.split(' (')[0]!.split(' → '); out.push({ at: e.at, title: 'Lifecycle', from: f || '', to: t || '', by: who(e.by), kind: 'lifecycle' }); }
    if (e.type === 'issue.opened') out.push({ at: e.at, title: e.detail, from: 'as handed over', to: 'issue opened', by: who(e.by), kind: 'issue' });
    if (e.type === 'policy.exception_requested') out.push({ at: e.at, title: 'Design exception requested', from: 'no exception', to: e.detail.split(' (')[0]!, by: who(e.by), kind: 'exception' });
  }
  const pend = r.baselines.find((b) => b.state === 'PENDING_ACCEPTANCE'); const cur = r.baselines.find((b) => b.state === 'CURRENT');
  if (pend && cur) out.push({ at: pend.at, title: 'Commissioning baseline', from: `v${cur.version} (accepted)`, to: `v${pend.version} pending acceptance`, by: pend.by ? who(pend.by) : 'awaiting a reviewer', kind: 'baseline' });
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

// ------------------------------------------------------------------------------------------------------------ featured rooms (the room switcher)
/** The rooms the room page offers as tabs: the reference room first, then the rooms whose records carry something to look at. */
export function featuredRooms(n = 8): RoomOutline[] {
  const scored = allRecords().filter((r) => r.outline.kind !== 'reference').map((r) => ({ o: r.outline, k: (r.issues.some((i) => i.state !== 'RESOLVED') ? 2 : 0) + (r.outline.kind === 'earlier' ? 1 : 0) + (r.baselines.length ? 0.5 : 0) }));
  scored.sort((a, b) => b.k - a.k || ROOMS.indexOf(a.o) - ROOMS.indexOf(b.o));
  return [roomById('R-ATL-4-218')!, ...scored.slice(0, n - 1).map((x) => x.o)];
}
export const roomLabel = (o: RoomOutline) => shortName(o);
export { roomRecord };
