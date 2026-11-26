/**
 * Every number the campus, the room page and Mission Control show, computed from the demonstration's records — never typed in.
 *
 *   Health (MODELED, not measured): a room's record, scored. 100, less 15 for each open High issue, 8 for each Medium, 4 for each Low,
 *   less up to 30 for failed tests and up to 20 for tests not yet run (in proportion to the tests that apply). A room whose record
 *   holds no test result is not scored ("no evidence") rather than given a number. Bands as in V2.5.3: 88 or more Healthy, 75–87
 *   Monitor, below 75 Action required. A building's and the campus's score is the mean of their scored rooms.
 *
 *   Rooms at risk and the area status (25 Nov 2026, metric integrity, founder's commercial-readiness directive §4.3): an average of 135
 *   rooms read 99 while six rooms held an open High issue, and every building showed green. The score stays the mean (the formula above
 *   is unchanged: no number is lowered for effect). What changed is the status beside it. A room is AT RISK when an open issue is High
 *   (critical) or its score is in Action required, scored or not: a room the record cannot score is never counted fine. A room NEEDS
 *   ATTENTION when it is at risk, has any open issue, or scores below Healthy. An area (floor, building, site, campus) takes the band of its
 *   mean, but never Healthy, and never Not scored, while one of its rooms is at risk: it is then at least Monitor, and says how many rooms
 *   are at risk and which room is lowest. `band` is that status; `meanBand` is the band of the mean alone. Definitions: campus/definitions.ts.
 *
 *   Open issues: the room record's issues plus the service workspace's live incidents for the room (one per id; the live record wins),
 *   so a repair closed in ServiceHands lowers the count everywhere at once.
 *
 *   Delivery spine: nine stages from Intake to Service, each read from a record (programme, design, positions, installations, the
 *   engine's results, baselines, the service workspace). A stage is DONE only when a record says so.
 */
import type { RoomLifecycle } from '@empathia/domain-types';
import { BUILDINGS, REGIONAL_SITES, CAMPUS_ROOMS as ROOMS, roomById, shortName, type Building, type RoomOutline } from './canon.js';
import { roomRecord, allRecords, PEOPLE, C, type RoomRecord, type Issue, type Position } from './design.js';
import { programme } from './programme.js';
import type { Workspace, Incident, WorkOrder } from '../workspace/store.js';
import { isOpenRequest } from '../workspace/requests.js';

export type Band = 'healthy' | 'monitor' | 'action' | 'none';
export const BAND_LABEL: Record<Band, string> = { healthy: 'Healthy', monitor: 'Monitor', action: 'Action required', none: 'Not scored' };
export const bandOf = (score: number | null): Band => (score == null ? 'none' : score >= 88 ? 'healthy' : score >= 75 ? 'monitor' : 'action');
export const BAND_TONE: Record<Band, 'ok' | 'warn' | 'bad' | 'muted'> = { healthy: 'ok', monitor: 'warn', action: 'bad', none: 'muted' };

export { isOpenRequest, isUnclosedRequest, isFixedRequest, requestFixedAt, OPEN_REQUEST_STATES } from '../workspace/requests.js';
const SEV: Record<string, Issue['severity']> = { 'Mission critical': 'High', High: 'High', Standard: 'Medium' };
export interface OpenIssue { id: string; title: string; severity: Issue['severity']; state: string; source: string; positions: string[]; live: boolean; openedAt?: string; href?: string }

/** The room's open issues: record issues not resolved, plus live service incidents (the live record wins on the same id). */
export function roomIssues(r: RoomRecord, w?: Workspace | null): OpenIssue[] {
  const live = (w?.incidents || []).filter((i) => i.roomId === r.outline.id);
  const liveIds = new Set(live.map((i) => i.id));
  const out: OpenIssue[] = r.issues.filter((i) => i.state !== 'RESOLVED' && !liveIds.has(i.id)).map((i) => ({ id: i.id, title: i.title, severity: i.severity, state: i.state, source: i.source, positions: i.positions, live: false }));
  for (const i of live) if (isOpenRequest(i)) out.push({ id: i.id, title: i.title, severity: SEV[i.severity] || 'Medium', state: i.state, source: 'ServiceHands request', positions: [], live: true, openedAt: i.openedAt, href: `#/v25/service?id=${i.id}` });
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

/** At risk: an open High (critical) issue, or a score in Action required. A room without a score can be at risk. */
export const atRisk = (h: Health, iss: OpenIssue[]): boolean => h.band === 'action' || iss.some((i) => i.severity === 'High');
/** Needs attention: at risk, any open issue, or a score below Healthy. Rooms that are not scored and have nothing open are not counted. */
export const needsAttention = (h: Health, iss: OpenIssue[]): boolean => atRisk(h, iss) || iss.length > 0 || (h.score != null && h.band !== 'healthy');
/** An area's status: the band of its mean, raised to Monitor while any of its rooms is at risk (never Healthy, never Not scored then). */
export const areaStatus = (score: number | null, risk: number): Band => { const b = bandOf(score); return risk > 0 && (b === 'healthy' || b === 'none') ? 'monitor' : b; };

/** What every area shares: its rooms at risk and needing attention, and its lowest scored room (the range the mean hides). */
export interface AreaRisk { atRisk: number; attention: number; highRooms: number; lowest: { id: string; label: string; score: number } | null; meanBand: Band }
function areaRisk(recs: RoomRecord[], w: Workspace | null | undefined, score: number | null): AreaRisk {
  let risk = 0, att = 0, highRooms = 0; let lowest: AreaRisk['lowest'] = null;
  for (const r of recs) { const h = roomHealth(r, w); const iss = roomIssues(r, w);
    if (atRisk(h, iss)) risk += 1; if (needsAttention(h, iss)) att += 1; if (iss.some((i) => i.severity === 'High')) highRooms += 1;
    if (h.score != null && (!lowest || h.score < lowest.score)) lowest = { id: r.outline.id, label: shortName(r.outline), score: h.score }; }
  return { atRisk: risk, attention: att, highRooms, lowest, meanBand: bandOf(score) };
}

export interface BuildingStats extends AreaRisk { b: Building; rooms: number; scored: number; score: number | null; band: Band; open: number; high: number; devices: number; applicable: number; verified: number; verifiedPct: number | null; byLife: Record<string, number> }
/** a building's figures from its room records; with `floor`, the same figures for that floor's rooms only (the campus floor page) */
export function buildingStats(key: string, w?: Workspace | null, floor?: number): BuildingStats {
  const b = BUILDINGS.find((x) => x.key === key) || REGIONAL_SITES.find((x) => x.key === key)!;
  const recs = allRecords().filter((r) => r.outline.building === key && (floor == null || r.outline.floor === floor));
  const hs = recs.map((r) => roomHealth(r, w)); const scores = hs.map((h) => h.score).filter((s): s is number => s != null);
  const iss = recs.flatMap((r) => roomIssues(r, w));
  const applicable = recs.reduce((s, r) => s + r.counts.applicable, 0); const verified = recs.reduce((s, r) => s + r.counts.verified, 0);
  const byLife: Record<string, number> = {}; for (const r of recs) byLife[r.lifecycle] = (byLife[r.lifecycle] || 0) + 1;
  const score = mean(scores); const ar = areaRisk(recs, w, score);
  return { b, ...ar, rooms: recs.length, scored: scores.length, score, band: areaStatus(score, ar.atRisk), open: iss.length, high: iss.filter((i) => i.severity === 'High').length, devices: recs.reduce((s, r) => s + r.positions.filter((p) => !p.furniture).length, 0), applicable, verified, verifiedPct: applicable ? Math.round((100 * verified) / applicable) : null, byLife };
}

export interface CampusStats extends AreaRisk { buildings: BuildingStats[]; /** the fictional regional sites of the rooms plan (not on the campus map) */ sites: BuildingStats[]; rooms: number; devices: number; score: number | null; band: Band; scored: number; healthy: number; monitor: number; action: number; unscored: number; open: number; high: number; applicable: number; verified: number; verifiedPct: number | null; accepted: number; byLife: Record<string, number> }
export function campusStats(w?: Workspace | null): CampusStats {
  const recs = allRecords(); const hs = recs.map((r) => roomHealth(r, w));
  const scores = hs.map((h) => h.score).filter((s): s is number => s != null);
  const iss = recs.flatMap((r) => roomIssues(r, w));
  const applicable = recs.reduce((s, r) => s + r.counts.applicable, 0); const verified = recs.reduce((s, r) => s + r.counts.verified, 0);
  const byLife: Record<string, number> = {}; for (const r of recs) byLife[r.lifecycle] = (byLife[r.lifecycle] || 0) + 1;
  const score = mean(scores); const ar = areaRisk(recs, w, score);
  return {
    ...ar, buildings: BUILDINGS.map((b) => buildingStats(b.key, w)), sites: REGIONAL_SITES.map((b) => buildingStats(b.key, w)), rooms: recs.length, devices: recs.reduce((s, r) => s + r.positions.filter((p) => !p.furniture).length, 0),
    score, band: areaStatus(score, ar.atRisk), scored: scores.length, healthy: hs.filter((h) => h.band === 'healthy').length, monitor: hs.filter((h) => h.band === 'monitor').length, action: hs.filter((h) => h.band === 'action').length, unscored: hs.filter((h) => h.band === 'none').length,
    open: iss.length, high: iss.filter((i) => i.severity === 'High').length, applicable, verified, verifiedPct: applicable ? Math.round((100 * verified) / applicable) : null,
    accepted: recs.filter((r) => r.baselines.some((x) => x.state === 'CURRENT')).length, byLife,
  };
}

/**
 * The rooms that need attention, in the order they are worked: rooms at risk first, then lowest score, then most open issues. Until 25 Nov
 * 2026 the order was the score alone, so a room that could not be scored but held an open High design deficiency was listed after rooms
 * with one Low issue; a room at risk now comes before every room that is not, scored or not.
 */
export function attentionQueue(w?: Workspace | null): Array<{ r: RoomRecord; h: Health; issues: OpenIssue[]; risk: boolean }> {
  return allRecords().map((r) => { const h = roomHealth(r, w); const issues = roomIssues(r, w); return { r, h, issues, risk: atRisk(h, issues) }; }).filter((x) => needsAttention(x.h, x.issues))
    .sort((a, b) => Number(b.risk) - Number(a.risk) || (a.h.score ?? 101) - (b.h.score ?? 101) || b.issues.length - a.issues.length);
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
  const incidents = (w?.incidents || []).filter((i: Incident) => i.roomId === id && isOpenRequest(i)); const wos = (w?.workOrders || []).filter((x: WorkOrder) => x.roomId === id && !['DONE', 'CANCELLED'].includes(x.state));
  const issues = roomIssues(r, w); const c = r.counts;
  const designed = r.events.some((e) => e.type === 'room.design_created') || r.outline.kind === 'earlier';
  const st: Stage[] = [
    req ? { key: 'intake', label: 'Intake', state: 'DONE', detail: `${req.id} → ${prj!.id}`, source: 'program request', href: '#/home' }
      : { key: 'intake', label: 'Intake', state: 'NO_RECORD', detail: 'No request on record', source: 'program (none for this room)' },
    designIssues.length ? { key: 'design', label: 'Design', state: 'BLOCKED', detail: `${designIssues.length} High design deficienc${designIssues.length === 1 ? 'y' : 'ies'} open`, source: 'engine design check' }
      : reached(r, 'DESIGN_APPROVED') ? { key: 'design', label: 'Design', state: 'DONE', detail: `Approved · revision ${r.baselines.length ? Math.max(...r.baselines.map((b) => b.revision)) : 1}`, source: 'room events' }
      : designed ? { key: 'design', label: 'Design', state: 'IN_PROGRESS', detail: 'Designed, not yet approved', source: 'room events' } : { key: 'design', label: 'Design', state: 'NO_RECORD', detail: 'No design on record', source: 'room record' },
    hw.length ? { key: 'selection', label: 'Selection', state: 'DONE', detail: `${hw.length} device position${hw.length === 1 ? '' : 's'}`, source: 'room positions' } : { key: 'selection', label: 'Selection', state: 'NO_RECORD', detail: 'No device on record', source: 'room positions' },
    prj ? { key: 'project', label: 'Project', state: prj.delivery === 'CUSTOMER_ACCEPTED' ? 'DONE' : 'IN_PROGRESS', detail: `${prj.id} · ${prj.delivery.replace(/_/g, ' ').toLowerCase()}`, source: 'program project' }
      : { key: 'project', label: 'Project', state: 'NO_RECORD', detail: 'No project', source: 'program (none for this room)' },
    fund.length ? { key: 'procurement', label: 'Procurement', state: 'DONE', detail: `${fund.reduce((s, f) => s + f.amount, 0).toLocaleString('en-US')} USD authorized`, source: 'program funding' }
      : dec.length ? { key: 'procurement', label: 'Procurement', state: 'IN_PROGRESS', detail: `${dec[dec.length - 1]!.decision.toLowerCase()} (scope ${dec[dec.length - 1]!.scopeRev}), not funded`, source: 'program decisions' }
      : { key: 'procurement', label: 'Procurement', state: 'NO_RECORD', detail: 'No record', source: 'program (none for this room)' },
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

// ------------------------------------------------------------------------------------------------------------ the room's technical facts
/**
 * The right panel of the technical room page (3 November screen 02): positions and models, PoE, camera coverage, drift dimensions — each
 * DECLARED from the catalogue or MODELED from the plan, never measured. `models` are distinct device classes: no make or model is invented.
 */
export interface RoomFacts {
  positions: number; models: number;
  poe: { draw: number; budget: number | null; source: string } | null;
  coverage: { seats: number; covered: number; source: string } | null;
  drift: { dimensions: number; items: string[] };
}
export function roomFacts(r: RoomRecord): RoomFacts {
  const hw = r.positions.filter((p) => !p.furniture);
  const cats = C.categories;
  const sw = hw.find((p) => p.cat === 'switch');
  const draw = Math.round(hw.filter((p) => p.cat !== 'switch' && cats[p.cat]?.net).reduce((s, p) => s + (cats[p.cat]?.poe || 0), 0) * 10) / 10;
  const budget = sw ? Number(cats['switch']?.props?.['poe_budget_w']) || null : null;
  // camera coverage: a seating block is covered when it lies within a camera's declared field of view and 9 m (MODELED planning rule)
  const seats = r.positions.filter((p) => p.cat === 'chairs'); const cams = hw.filter((p) => p.cat === 'camera');
  const perBlock = Number(cats['chairs']?.props?.['seats']) || 6;
  const inView = (cam: Position, seat: Position) => { const dx = seat.x - cam.x, dy = seat.y - cam.y; if (Math.hypot(dx, dy) > 9) return false; const fov = (Number(cats['camera']?.props?.['fov_deg']) || 70) / 2; const a = (Math.atan2(dy, dx) * 180) / Math.PI; const diff = Math.abs((((a - cam.rot) % 360) + 540) % 360 - 180); return diff <= fov; };
  const covered = seats.filter((s) => cams.some((c) => inView(c, s))).length * perBlock;
  const dims = new Set(moves(r).map((m) => m.kind));
  const WORD: Record<string, string> = { unit: 'a unit replaced', baseline: 'a baseline pending', issue: 'an issue opened', lifecycle: 'a lifecycle change', exception: 'an exception requested' };
  return {
    positions: hw.length, models: new Set(hw.map((p) => p.cat)).size,
    poe: sw ? { draw, budget, source: 'declared catalog values, not measured' } : null,
    coverage: cams.length && seats.length ? { seats: seats.length * perBlock, covered, source: 'modeled from the plan: field of view and 9 m reach, not a verified sightline' } : null,
    drift: { dimensions: dims.size, items: [...dims].map((k) => WORD[k] || k) },
  };
}
