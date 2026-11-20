/**
 * The demonstration's Core model for the V2.5.3 parity areas (#/list, #/set, #/ledger, #/compare, #/ask, #/exports, #/investigate, …):
 * one typed index of records, every one of them built from the demo's own records — the thirty room records (campus/design.ts), the
 * shared workspace (incidents, work orders, staff), the decision desk (projects, decisions, funding) — plus a small set of synthetic
 * organisational seeds V2.5.3 carried (service vendors, standards, signage zones). Nothing here names a maker, a model or a serial: a
 * device is a class template on a position, its identity UNKNOWN, as the room records keep it. Every figure a page shows is counted
 * from these records; a value the records do not hold is `null` and is shown as "—" (no data), never as 0.
 */
import { ROOMS, BUILDINGS, buildingByKey, shortName, fullName, roomHref, roomById, seeded, type RoomOutline } from '../campus/canon.js';
import { allRecords, roomRecord, DEMO_NOW, openIssues, type RoomRecord, type Position } from '../campus/design.js';
import type { Workspace } from '../workspace/store.js';
import type { DecisionState, Project } from '../decisions/store.js';

export type Prov = 'KNOWN' | 'INFERRED' | 'SIMULATED';
export const PROV_TEXT: Record<Prov, string> = {
  KNOWN: 'Known: read from a record of this demonstration',
  INFERRED: 'Inferred: concluded from other records by a stated rule, not observed',
  SIMULATED: 'Simulated: produced for this demonstration from the records, never measured',
};
export type EntityType = 'Room' | 'Device' | 'Issue' | 'LifecycleEvent' | 'NetworkNode' | 'PowerNode' | 'EnvironmentalSensor' | 'Project' | 'Request' | 'Design' | 'Document' | 'Standard'
  | 'Vendor' | 'SupportAgreement' | 'SignageZone' | 'BudgetScenario' | 'PurchaseDecision' | 'Recommendation';
export interface Link { type: EntityType; id: string; rel: string }
export interface Rec {
  type: EntityType; id: string; name: string; sub: string;
  roomId?: string; building?: string; state?: string; tone?: 'ok' | 'warn' | 'bad' | 'info' | 'muted';
  facts: Array<[string, string]>; prov: Prov; source: string; href?: string; links: Link[]; at?: string; usd?: number | null;
}
export interface TypeInfo { label: string; plural: string; icon: 'room' | 'device' | 'alert' | 'clock' | 'route' | 'pulse' | 'layers' | 'ticket' | 'book' | 'shield' | 'users' | 'link' | 'map' | 'chart' | 'check' | 'spark'; blurb: string; facet: string }
/** The eighteen record types V2.5.3 opened at #/list/<Type> (names and plurals from its TYPES table). */
export const TYPES: Record<EntityType, TypeInfo> = {
  Room: { label: 'Room', plural: 'Rooms', icon: 'room', blurb: 'Every room of the campus with its lifecycle, devices and tests', facet: 'Lifecycle' },
  Device: { label: 'Device', plural: 'Devices', icon: 'device', blurb: 'Every device position with its class, layer and identity state', facet: 'Stage' },
  Issue: { label: 'Issue', plural: 'Issues', icon: 'alert', blurb: 'Field reports, design deficiencies and drift, open and closed', facet: 'State' },
  LifecycleEvent: { label: 'Lifecycle event', plural: 'Lifecycle events', icon: 'clock', blurb: 'Every recorded step in a room’s life, with who and when', facet: 'Kind' },
  NetworkNode: { label: 'Network node', plural: 'Network nodes', icon: 'route', blurb: 'Switches that serve rooms, from the estate and the room designs', facet: 'Building' },
  PowerNode: { label: 'Power node', plural: 'Power nodes', icon: 'pulse', blurb: 'Power panels and equipment racks', facet: 'Building' },
  EnvironmentalSensor: { label: 'Environmental sensor', plural: 'Environmental sensors', icon: 'layers', blurb: 'One air-and-occupancy point per room; occupancy simulated from the bookings', facet: 'Building' },
  Project: { label: 'Project', plural: 'Projects', icon: 'ticket', blurb: 'Projects on the decision desk with their governance state', facet: 'State' },
  Request: { label: 'Request', plural: 'Requests', icon: 'ticket', blurb: 'Room requests behind projects and service requests from rooms', facet: 'Kind' },
  Design: { label: 'Design', plural: 'Designs', icon: 'map', blurb: 'One design per room, with its revision and the engine’s findings', facet: 'Status' },
  Document: { label: 'Document', plural: 'Documents', icon: 'book', blurb: 'What each room’s record holds as documents: design, report, as-built, guide', facet: 'Kind' },
  Standard: { label: 'Standard', plural: 'Standards', icon: 'shield', blurb: 'The campus room standards and how the estate meets them', facet: 'Domain' },
  Vendor: { label: 'Vendor', plural: 'Vendors', icon: 'users', blurb: 'Service partners and contractors (fictional organisations)', facet: 'Kind' },
  SupportAgreement: { label: 'Support agreement', plural: 'Support agreements', icon: 'link', blurb: 'Who supports which building and domain', facet: 'Status' },
  SignageZone: { label: 'Signage zone', plural: 'Signage zones', icon: 'map', blurb: 'Lobby and commons signage zones and their priority rule', facet: 'Building' },
  BudgetScenario: { label: 'Budget scenario', plural: 'Budget scenarios', icon: 'chart', blurb: 'The rough order of magnitude of each project, from its record', facet: 'Basis' },
  PurchaseDecision: { label: 'Purchase decision', plural: 'Purchase decisions', icon: 'check', blurb: 'What waits for a named person to approve, and what was decided', facet: 'Status' },
  Recommendation: { label: 'Recommendation', plural: 'Recommendations', icon: 'spark', blurb: 'What the records suggest doing next; engineer approval required', facet: 'Kind' },
};
export const TYPE_KEYS = Object.keys(TYPES) as EntityType[];
export const isType = (t: string | undefined): t is EntityType => !!t && (TYPE_KEYS as string[]).includes(t);

const DAY = 864e5;
const day = (t: string | number) => new Date(t).toISOString().slice(0, 10);
const bShort = (k: string) => buildingByKey(k)?.short || k;
export const fmtUsd = (n: number | null | undefined) => (n == null ? '—' : `$${n.toLocaleString('en-US')}`);
export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

// ------------------------------------------------------------------ organisational seeds (synthetic; V2.5.3 SERVICE_VENDORS, STANDARDS, SIGNAGE_ZONES)
export const VENDORS: Array<[string, string, string]> = [
  ['VN-BRIGHTWATER', 'Brightwater AV Integration', 'AV integrator'], ['VN-COBALT', 'Cobalt Ridge Systems', 'AV integrator'], ['VN-FERNHILL', 'Fernhill Network Services', 'Network services'],
  ['VN-VELMOOR', 'Velmoor Electrical', 'Electrical contractor'], ['VN-LARKSPUR', 'Larkspur Managed Services', 'Managed AV support'], ['VN-QUARTZLINE', 'Quartzline Acoustics', 'Acoustic consultant'],
  ['VN-BRANNOCH', 'Brannoch Structured Cabling', 'Cabling contractor'], ['VN-PINECREST', 'Pinecrest Workplace Furniture', 'Furniture supplier'], ['VN-SAFFRON', 'Saffron Hill Broadcast', 'Broadcast engineering'],
  ['VN-KESTRELBY', 'Kestrelby Field Services', 'Field service'], ['VN-UMBRA', 'Umbra Learning Media', 'Learning content producer'],
];
/** Support agreements: SA-BW-02 is the workspace's own (Cara Lind's); the others give every building and layer a named path or a stated gap. */
export const AGREEMENTS: Array<{ id: string; vendor: string; kind: string; buildings: string[]; layers: string[]; status: 'Active' | 'Expired' }> = [
  { id: 'SA-BW-02', vendor: 'VN-BRIGHTWATER', kind: 'AV support and break-fix', buildings: ['ATL'], layers: ['audio', 'video', 'display'], status: 'Active' },
  { id: 'SA-CR-01', vendor: 'VN-COBALT', kind: 'AV support and break-fix', buildings: ['MER', 'FRG'], layers: ['audio', 'video', 'display', 'control'], status: 'Active' },
  { id: 'SA-LK-01', vendor: 'VN-LARKSPUR', kind: 'Managed AV support', buildings: ['BCN', 'HZN'], layers: ['audio', 'video', 'display', 'control'], status: 'Active' },
  { id: 'SA-FN-01', vendor: 'VN-FERNHILL', kind: 'Network operations', buildings: ['ATL', 'MER', 'FRG', 'BCN', 'HZN', 'NST'], layers: ['network'], status: 'Active' },
  { id: 'SA-VE-01', vendor: 'VN-VELMOOR', kind: 'Electrical maintenance', buildings: ['ATL', 'MER'], layers: ['power'], status: 'Expired' },
  { id: 'SA-SH-01', vendor: 'VN-SAFFRON', kind: 'Broadcast engineering', buildings: ['HZN'], layers: ['video'], status: 'Active' },
];
export const STANDARDS: Array<[string, string, string, string, string, string[]]> = [
  ['ST-AUD-01', 'Speech intelligibility at every seat', 'Audio', 'Speech transmission index of 0.60 or better at every listening position.', 'Measured with a test signal, or modeled before build', ['micceil', 'mictable', 'micwireless', 'speaker', 'dsp']],
  ['ST-AUD-02', 'Echo cancellation reference routing', 'Audio', 'Every loudspeaker feed that can be heard by a microphone is present in the echo-cancellation reference.', 'Configuration review and far-end listening test', ['dsp', 'speaker']],
  ['ST-AUD-03', 'Wireless microphone frequency coordination', 'Audio', 'Every wireless channel sits in the campus frequency plan with a documented spare.', 'Frequency scan compared with the plan', ['micwireless']],
  ['ST-VID-01', 'Camera coverage of every seat', 'Video', 'Each seat is visible in at least one camera preset; the presenter position has its own preset.', 'Preset walk-through with seat map', ['camera', 'bar']],
  ['ST-VID-02', 'Display size for the farthest viewer', 'Display', 'Image height is at least one sixth of the distance to the farthest seat for detailed content.', 'Calculated from room dimensions', ['display', 'ledwall', 'projector']],
  ['ST-NET-01', 'Room devices on managed network segments', 'Network', 'Every networked room device connects to a managed switch port on a documented segment.', 'Switch records compared with the device records', ['switch']],
  ['ST-NET-03', 'Switch port documentation', 'Network', 'The switch and port for each device are recorded and match what is found on site.', 'Port trace at commissioning', ['switch']],
  ['ST-PWR-01', 'Protected power for critical rooms', 'Power', 'Rooms rated mission critical run their core devices from metered, backed-up power.', 'Power path inspection', ['rack']],
  ['ST-CTL-01', 'Consistent control experience', 'Control', 'Start, share and volume are in the same place on every touch controller of the same profile.', 'Panel review against the profile', ['touch', 'control']],
  ['ST-CTL-02', 'Scheduling panel behavior', 'Scheduling', 'The panel shows the current booking within one minute of a calendar change.', 'Timed booking test', ['scheduler']],
];
/** V2.5.3 SIGNAGE_ZONES without its player and panel names (those were invented equipment identities): zone, building, purpose, channels, rule, displays. */
export const SIGNAGE: Array<[string, string, string, string, number, string, number]> = [
  ['SZ-ATL-LOBBY', 'Atlas lobby welcome and wayfinding', 'ATL', 'Welcome, directions and the day’s events for visitors and staff.', 3, 'Priority messages replace all content within 30 seconds', 3],
  ['SZ-ATL-COFFEE', 'Atlas coffee point menu', 'ATL', 'The day’s menu and opening hours.', 2, 'Priority messages replace the menu', 1],
  ['SZ-ATL-COMMONS', 'Northstar Commons event wall', 'ATL', 'Event schedules and campus news in the commons.', 2, 'Priority messages replace all content', 2],
  ['SZ-MER-LOBBY', 'Meridian lobby', 'MER', 'Lab safety notices and directions.', 2, 'Priority messages replace all content', 1],
  ['SZ-FRG-LOBBY', 'Forge shift notices', 'FRG', 'Shift change times and site notices for both shifts.', 2, 'Priority messages replace all content', 2],
  ['SZ-BCN-LOBBY', 'Beacon learning schedule', 'BCN', 'Today’s sessions and where they are.', 3, 'Priority messages replace all content', 1],
  ['SZ-HZN-LOBBY', 'Horizon media wall', 'HZN', 'Live program and event information around townhalls.', 2, 'Priority messages replace all content', 2],
];

// ------------------------------------------------------------------ derived rules (each one stated where it is shown)
/** A device's stage, inferred from its room's lifecycle, its installation and the support agreements; the rule is RULES.stage. */
export type Stage = 'Planned' | 'Commissioning' | 'In service' | 'Support' | 'End';
export const RULES = {
  stage: 'Planned: the room is not yet installed. Commissioning: the room is in commissioning. Support: in service in a building and layer an active support agreement covers. In service: in service with no agreement covering it. End: removed from service (an installation with a removal date).',
  recommendation: 'One recommendation per open issue: drift and layout changes → recommission; a design deficiency → design change; a field fault → repair. Engineer approval required; no cost is invented — a figure appears only where a project record holds one.',
  health: 'Room health: 100 minus 25 per open high-severity issue, 12 per medium, 5 per low, and the share of applicable tests not yet verified (up to 30). A rule of this demonstration, shown wherever the score is.',
} as const;
export const coveredBy = (building: string, layer: string) => AGREEMENTS.find((a) => a.status === 'Active' && a.buildings.includes(building) && a.layers.includes(layer)) || null;
export function stageOf(r: RoomRecord, p: Position): Stage {
  if (r.lifecycle === 'PLANNED' || r.lifecycle === 'DESIGN_APPROVED' || r.lifecycle === 'INSTALLATION_PENDING' || !r.installations.some((i) => i.position === p.code)) return 'Planned';
  if (r.lifecycle === 'COMMISSIONING' || r.lifecycle === 'INSTALLED_UNVERIFIED') return 'Commissioning';
  return coveredBy(r.outline.building, p.layer) ? 'Support' : 'In service';
}
export function healthOf(r: RoomRecord): number {
  const w = { High: 25, Medium: 12, Low: 5 } as const;
  const iss = openIssues(r).reduce((s, i) => s + w[i.severity], 0);
  const gap = r.counts.applicable ? Math.round((1 - r.counts.verified / r.counts.applicable) * 30) : 30;
  return Math.max(0, 100 - iss - gap);
}

// ------------------------------------------------------------------ the scheduler's sessions (generated for this demonstration; never a real calendar)
export interface Session { from: number; to: number; title: string }
const TITLES = ['Team stand-up', 'Design review', 'Supplier call', 'Planning session', 'Training block', 'All-hands rehearsal', 'Project check-in', 'Interview panel', 'Shift handover', 'Customer briefing'];
/** The day's sessions in one room, deterministic from the room id and the demonstration clock (DEMO_NOW = 1 Nov 2026, 15:00 UTC). */
export function sessionsOf(roomId: string): Session[] {
  const rnd = seeded(`sessions:${roomId}`); const start = DEMO_NOW - 7 * 36e5; const out: Session[] = []; let t = start;
  while (t < start + 10 * 36e5) { t += Math.round(rnd() * 3) * 30 * 6e4; const len = (1 + Math.floor(rnd() * 3)) * 30 * 6e4; if (t + len > start + 10 * 36e5) break; out.push({ from: t, to: t + len, title: TITLES[Math.floor(rnd() * TITLES.length)]! }); t += len; }
  return out;
}
export const busyAt = (roomId: string, t = DEMO_NOW) => sessionsOf(roomId).find((s) => s.from <= t && s.to > t) || null;
export const nextOf = (roomId: string, t = DEMO_NOW) => sessionsOf(roomId).find((s) => s.from > t) || null;
export const hhmm = (t: number) => new Date(t).toISOString().slice(11, 16);

// ------------------------------------------------------------------ the model
export interface Core { all: Rec[]; byType: Record<EntityType, Rec[]>; get: (id: string) => Rec | undefined; rooms: RoomRecord[] }
const lifeTone = (l: string): Rec['tone'] => (l === 'OPERATIONAL' || l === 'ACCEPTED' ? 'ok' : l === 'COMMISSIONING' ? 'warn' : 'info');
const sevTone = (s: string): Rec['tone'] => (s === 'High' || s === 'Mission critical' ? 'bad' : s === 'Medium' ? 'warn' : 'info');

export function buildCore(w: Pick<Workspace, 'incidents' | 'workOrders'>, d: Pick<DecisionState, 'projects' | 'decisions' | 'funding'>): Core {
  const rooms = allRecords(); const out: Rec[] = [];
  const add = (r: Rec) => { out.push(r); return r; };
  const nameOf = (o: RoomOutline) => shortName(o);
  for (const r of rooms) {
    const o = r.outline; const hw = r.positions.filter((p) => !p.furniture);
    add({ type: 'Room', id: o.id, name: fullName(o), sub: `${buildingByKey(o.building)?.name} · floor ${o.floor} · ${r.archetypeName} · ${o.capacity} seats`, roomId: o.id, building: o.building, state: r.lifecycle, tone: lifeTone(r.lifecycle),
      facts: [['Lifecycle', r.lifecycle], ['Archetype', r.archetypeName], ['Seats', String(o.capacity)], ['Devices', String(hw.length)], ['Tests verified', `${r.counts.verified} of ${r.counts.applicable}`], ['Open issues', String(openIssues(r).length)], ['Health (rule)', `${healthOf(r)} of 100`], ['Geometry', r.geometryProvenance]],
      prov: 'KNOWN', source: o.source, href: roomHref(o), links: [{ type: 'Design', id: `DS-${o.id.slice(2)}`, rel: 'designed by' }] });
    for (const p of hw) {
      const st = stageOf(r, p); const inst = r.installations.find((i) => i.position === p.code && !i.removedAt);
      add({ type: 'Device', id: `${o.id}/${p.code}`, name: `${p.label} · ${nameOf(o)}`, sub: `${p.catLabel} · ${p.layer} · ${p.mount}`, roomId: o.id, building: o.building, state: st, tone: st === 'Support' ? 'ok' : st === 'In service' ? 'warn' : 'info',
        facts: [['Position', p.code], ['Class', p.catLabel], ['Layer', p.layer], ['Unit', p.asset || 'none recorded'], ['Identity', `${p.identity}: no make, model or serial is invented`], ['Installed', inst ? day(inst.installedAt) : '—'], ['Stage (inferred)', st], ['Support', coveredBy(o.building, p.layer)?.id || 'no active agreement']],
        prov: st === 'Planned' || st === 'Commissioning' ? 'KNOWN' : 'INFERRED', source: p.provenance, href: roomHref(o), links: [{ type: 'Room', id: o.id, rel: 'in' }] });
      if (p.layer === 'network' || p.layer === 'power') add({ type: p.layer === 'network' ? 'NetworkNode' : 'PowerNode', id: `${p.layer === 'network' ? 'NN' : 'PN'}-${o.id.slice(2)}-${p.code}`, name: `${p.label} · ${nameOf(o)}`, sub: `${p.catLabel} in the room design · ${r.connections.filter((c) => c.from === p.code || c.to === p.code).length} connections`, roomId: o.id, building: o.building, state: st, tone: 'info',
        facts: [['Position', p.code], ['Connections', String(r.connections.filter((c) => c.from === p.code || c.to === p.code).length)], ['Connection state', 'PROPOSED by the engine’s rules (modeled, not traced)']], prov: 'INFERRED', source: p.provenance, href: roomHref(o), links: [{ type: 'Room', id: o.id, rel: 'serves' }] });
    }
    for (const i of r.installations.filter((x) => x.removedAt)) add({ type: 'Device', id: `${o.id}/${i.position}@${i.asset}`, name: `Removed unit ${i.asset} · ${nameOf(o)}`, sub: `position ${i.position} · removed ${day(i.removedAt!)}`, roomId: o.id, building: o.building, state: 'End', tone: 'muted',
      facts: [['Position', i.position], ['Unit', i.asset], ['Removed', day(i.removedAt!)], ['Why', i.removalReason || i.reason], ['Stage', 'End: removed from service']], prov: 'KNOWN', source: i.basis, href: roomHref(o), links: [{ type: 'Room', id: o.id, rel: 'was in' }] });
    for (const i of r.issues) add({ type: 'Issue', id: i.id, name: i.title, sub: `${i.severity} · ${i.state} · ${nameOf(o)}`, roomId: o.id, building: o.building, state: i.state, tone: i.state === 'RESOLVED' ? 'ok' : sevTone(i.severity),
      facts: [['Severity', i.severity], ['State', i.state], ['Positions', i.positions.join(', ') || '—'], ['Source', i.source]], prov: 'KNOWN', source: i.source, href: roomHref(o), links: [{ type: 'Room', id: o.id, rel: 'in' }] });
    r.events.forEach((e, k) => add({ type: 'LifecycleEvent', id: `EV-${o.id.slice(2)}-${String(r.events.length - k).padStart(4, '0')}`, name: `${e.type.replace(/[._]/g, ' ')} · ${nameOf(o)}`, sub: `${day(e.at)} · ${e.by} · ${e.outcome || 'ALLOWED'}`, roomId: o.id, building: o.building, state: e.type.split('.')[0], tone: e.outcome === 'DENIED' ? 'warn' : 'muted', at: e.at,
      facts: [['When', day(e.at)], ['By', e.by], ['Event', e.type], ['Outcome', e.outcome || 'ALLOWED'], ['Detail', e.detail]], prov: 'KNOWN', source: 'room record (engine rules, fixed seed)', href: roomHref(o), links: [{ type: 'Room', id: o.id, rel: 'happened to' }] }));
    const rev = r.baselines.length ? Math.max(...r.baselines.map((b) => b.revision)) : 1; const approved = r.lifecycle !== 'PLANNED';
    add({ type: 'Design', id: `DS-${o.id.slice(2)}`, name: `${nameOf(o)} design, revision ${rev}`, sub: `${r.archetypeName} · ${r.findings.length} engine findings · ${r.connections.length} proposed connections`, roomId: o.id, building: o.building, state: approved ? 'Approved' : 'In review', tone: approved ? 'ok' : 'warn',
      facts: [['Revision', String(rev)], ['Template', r.templateNote || 'catalogue template for the archetype'], ['Findings', String(r.findings.length)], ['Connections', `${r.connections.length} proposed`], ['Applicable tests', String(r.counts.applicable)]], prov: 'KNOWN', source: 'room design record', href: roomHref(o), links: [{ type: 'Room', id: o.id, rel: 'designs' }] });
    const docs: Array<[string, boolean, string]> = [['Design summary', true, `revision ${rev}`], ['Commissioning report', r.counts.recorded > 0, `${r.counts.verified} verified results`], ['As-built drawing', r.installations.length > 0 && !['PLANNED', 'DESIGN_APPROVED'].includes(r.lifecycle), `${r.installations.length} installations`], ['Room user guide', r.lifecycle === 'ACCEPTED' || r.lifecycle === 'OPERATIONAL', 'for the people using the room']];
    docs.filter((x) => x[1]).forEach(([n, , note], k) => add({ type: 'Document', id: `DOC-${o.id.slice(2)}-${k + 1}`, name: `${nameOf(o)} ${n.toLowerCase()}`, sub: `${n} · ${note}`, roomId: o.id, building: o.building, state: n, tone: 'muted',
      facts: [['Kind', n], ['Basis', note], ['Held as', 'a record of this demonstration; no file is attached']], prov: 'KNOWN', source: 'room record', href: roomHref(o), links: [{ type: 'Room', id: o.id, rel: 'documents' }] }));
    const hasSched = sessionsOf(o.id); const busy = busyAt(o.id);
    add({ type: 'EnvironmentalSensor', id: `ES-${o.id.slice(2)}`, name: `${nameOf(o)} · air and occupancy`, sub: busy ? `occupied (simulated) · ${busy.title}` : 'unoccupied (simulated)', roomId: o.id, building: o.building, state: busy ? 'Occupied' : 'Free', tone: 'info',
      facts: [['Occupancy', busy ? 'occupied (simulated from the day’s sessions)' : 'unoccupied (simulated)'], ['Sessions today', String(hasSched.length)], ['Temperature', '— no reading: nothing is measured'], ['CO₂', '— no reading: nothing is measured'], ['Connector', 'Building management (IC-5), simulated, not connected']], prov: 'SIMULATED', source: 'scheduler sessions (generated for this demonstration)', href: roomHref(o), links: [{ type: 'Room', id: o.id, rel: 'senses' }] });
  }
  // estate nodes (the Search Party estate) — the building's own network and power
  add({ type: 'NetworkNode', id: 'SW-ATL-4A', name: 'Access switch ATL-4A', sub: 'IDF 4 · 48 ports · PoE · serves floor 4', building: 'ATL', state: 'Estate', tone: 'info', facts: [['Where', 'IDF 4'], ['Serves', 'the rooms of Atlas floor 4']], prov: 'KNOWN', source: 'estate record (Search Party)', href: '#/search', links: [] });
  add({ type: 'NetworkNode', id: 'SW-ATL-CORE', name: 'Core switch ATL-CORE', sub: 'MDF · uplink for every floor', building: 'ATL', state: 'Estate', tone: 'info', facts: [['Where', 'MDF'], ['Serves', 'every Atlas floor switch']], prov: 'KNOWN', source: 'estate record (Search Party)', href: '#/search', links: [] });
  add({ type: 'PowerNode', id: 'PDU-ATL-4', name: 'Power panel ATL-4', sub: 'IDF 4 · UPS-backed', building: 'ATL', state: 'Estate', tone: 'info', facts: [['Where', 'IDF 4'], ['Backed by', 'UPS']], prov: 'KNOWN', source: 'estate record (Search Party)', href: '#/search', links: [] });
  // workspace service requests (the shared ServiceHands workspace, live in this browser)
  for (const i of w.incidents) {
    if (!out.some((x) => x.type === 'Issue' && x.id === i.id)) add({ type: 'Issue', id: i.id, name: i.title, sub: `${i.severity} · ${i.state} · ${i.roomName}`, roomId: i.roomId, building: i.buildingKey, state: i.state === 'CLOSED' || i.state === 'RESOLVED' ? 'RESOLVED' : 'OPEN', tone: i.state === 'CLOSED' || i.state === 'RESOLVED' ? 'ok' : sevTone(i.severity),
      facts: [['Severity', i.severity], ['Service state', i.state], ['Opened', day(i.openedAt)], ['Work order', i.workOrderId || '—'], ['Recurrence of', i.recurrenceOf || '—']], prov: 'KNOWN', source: 'ServiceHands workspace (this browser)', href: `#/servicehands`, links: [{ type: 'Room', id: i.roomId, rel: 'in' }] });
    add({ type: 'Request', id: `RQ-${i.id}`, name: `Service request: ${i.title}`, sub: `${i.state} · ${i.roomName} · opened ${day(i.openedAt)}`, roomId: i.roomId, building: i.buildingKey, state: 'Service request', tone: i.state === 'CLOSED' ? 'ok' : 'warn', at: i.openedAt,
      facts: [['Kind', 'Service request'], ['State', i.state], ['Summary', i.summary], ['Issue', i.id]], prov: 'KNOWN', source: 'ServiceHands workspace (this browser)', href: '#/servicehands', links: [{ type: 'Issue', id: i.id, rel: 'raised' }] });
  }
  // the decision desk: projects, their requests, budget scenarios and purchase decisions
  d.projects.forEach((p: Project, k) => {
    const room = p.roomId ? roomById(p.roomId) : null; const fund = d.funding.find((f) => f.projectId === p.id) || null; const dec = d.decisions.filter((x) => x.projectId === p.id).slice(-1)[0] || null;
    add({ type: 'Project', id: p.id, name: p.name, sub: `${p.state} · scope revision ${p.scopeRev} · ${room ? shortName(room) : 'no single room'}`, roomId: p.roomId || undefined, building: room?.building, state: p.state, tone: p.state === 'APPROVED' || p.state === 'FUNDED' ? 'ok' : p.state === 'HELD' || p.state === 'REJECTED' ? 'warn' : 'info', usd: p.romUsd,
      facts: [['State', p.state], ['Rough order of magnitude', fmtUsd(p.romUsd)], ['Scope revision', String(p.scopeRev)], ['Pitch revision', String(p.pitchRev)], ['Funded', fund ? `${fmtUsd(fund.amount)} (${fund.costCenter})` : 'not funded'], ['Summary', p.summary]], prov: 'KNOWN', source: 'decision desk (this browser)', href: '#/v25/decisions', links: room ? [{ type: 'Room', id: room.id, rel: 'builds' }] : [] });
    add({ type: 'Request', id: `RQ-${p.id}`, name: `Room request: ${p.name}`, sub: `behind ${p.id} · ${p.state === 'APPROVED' || p.state === 'FUNDED' ? 'in delivery' : 'awaiting a decision'}`, roomId: p.roomId || undefined, building: room?.building, state: 'Room request', tone: 'info', facts: [['Kind', 'Room request'], ['Project', p.id], ['Need', p.summary]], prov: 'KNOWN', source: 'decision desk (this browser)', href: '#/v25/decisions', links: [{ type: 'Project', id: p.id, rel: 'became' }] });
    add({ type: 'BudgetScenario', id: `BS-${String(k + 1).padStart(2, '0')}`, name: `${p.name} · rough order of magnitude`, sub: `${fmtUsd(p.romUsd)} at brief revision ${p.brief.rev}`, roomId: p.roomId || undefined, building: room?.building, state: fund ? 'Funded' : 'Brief', tone: fund ? 'ok' : 'info', usd: p.romUsd,
      facts: [['Capital (ROM)', fmtUsd(p.romUsd)], ['Basis', `project brief, revision ${p.brief.rev}`], ['Funded', fund ? fmtUsd(fund.amount) : 'not funded'], ['Actual', '— no actual cost is held in this demonstration']], prov: 'KNOWN', source: 'project record (decision desk)', href: '#/v25/decisions', links: [{ type: 'Project', id: p.id, rel: 'funds' }] });
    add({ type: 'PurchaseDecision', id: `PD-${String(k + 1).padStart(2, '0')}`, name: p.name, sub: `${dec ? dec.decision : 'Awaiting approval'} · ${fmtUsd(p.romUsd)}`, roomId: p.roomId || undefined, building: room?.building, state: dec ? dec.decision : p.state === 'APPROVED' ? 'APPROVED' : 'Awaiting approval', tone: dec?.decision === 'APPROVED' || p.state === 'APPROVED' ? 'ok' : dec?.decision === 'HELD' ? 'warn' : 'info', usd: p.romUsd,
      facts: [['Decision', dec ? `${dec.decision} by ${dec.by}` : p.state === 'APPROVED' ? 'APPROVED' : 'waits for a named approver'], ['Reason', dec?.reason || '—'], ['Amount (ROM)', fmtUsd(p.romUsd)], ['Approver', p.approverId]], prov: 'KNOWN', source: 'decision desk (this browser)', href: '#/v25/decisions', links: [{ type: 'Project', id: p.id, rel: 'decides' }] });
  });
  // recommendations: one per open issue (RULES.recommendation)
  let n = 0;
  for (const r of rooms) for (const i of openIssues(r)) {
    n += 1; const t = i.title.toLowerCase();
    const kind = /drift|moved|layout|furniture/.test(t) ? 'Recommission' : /^dd-|^fnd-/i.test(i.id) || /design|no dsp|viewing|sightline/.test(t) ? 'Design change' : 'Repair';
    const proj = d.projects.find((p) => p.roomId === r.outline.id);
    add({ type: 'Recommendation', id: `REC-${String(n).padStart(3, '0')}`, name: `${kind}: ${i.title}`, sub: `${nameOf(r.outline)} · ${i.severity} · engineer approval required`, roomId: r.outline.id, building: r.outline.building, state: kind, tone: kind === 'Repair' ? 'warn' : 'info', usd: proj ? proj.romUsd : null,
      facts: [['Kind', kind], ['Because', i.title], ['Based on', i.source], ['Status', 'Under review: engineer approval required'], ['Cost', proj ? `${fmtUsd(proj.romUsd)} (project ${proj.id})` : '— no figure: the records hold none for this']], prov: 'INFERRED', source: RULES.recommendation, href: roomHref(r.outline), links: [{ type: 'Issue', id: i.id, rel: 'answers' }, { type: 'Room', id: r.outline.id, rel: 'for' }] });
  }
  for (const [id, name, kind] of VENDORS) {
    const ag = AGREEMENTS.filter((a) => a.vendor === id);
    add({ type: 'Vendor', id, name, sub: `${kind} · ${plural(ag.length, 'agreement')}`, state: kind, tone: 'muted', facts: [['Kind', kind], ['Agreements', ag.map((a) => a.id).join(', ') || 'none'], ['Buildings', [...new Set(ag.flatMap((a) => a.buildings))].map(bShort).join(', ') || '—'], ['Organisation', 'fictional']], prov: 'KNOWN', source: 'synthetic vendor register (V2.5.3)', links: ag.map((a) => ({ type: 'SupportAgreement' as const, id: a.id, rel: 'holds' })) });
  }
  for (const a of AGREEMENTS) {
    const v = VENDORS.find((x) => x[0] === a.vendor)!; const covered = rooms.filter((r) => a.buildings.includes(r.outline.building)).length;
    add({ type: 'SupportAgreement', id: a.id, name: `${v[1]}: ${a.kind}`, sub: `${a.status} · ${a.buildings.map(bShort).join(', ')} · ${a.layers.join(', ')}`, state: a.status, tone: a.status === 'Active' ? 'ok' : 'warn', facts: [['Vendor', v[1]], ['Status', a.status], ['Buildings', a.buildings.map(bShort).join(', ')], ['Layers', a.layers.join(', ')], ['Rooms in scope', String(covered)]], prov: 'KNOWN', source: 'synthetic support register', links: [{ type: 'Vendor', id: a.vendor, rel: 'with' }] });
  }
  for (const [id, name, dom, req, how, cats] of STANDARDS) {
    const apply = rooms.filter((r) => r.positions.some((p) => cats.includes(p.cat))); const open = apply.filter((r) => openIssues(r).some((i) => i.positions.some((code) => cats.includes(r.positions.find((p) => p.code === code)?.cat || ''))));
    add({ type: 'Standard', id, name, sub: `${dom} · applies to ${plural(apply.length, 'room')} · ${open.length} with an open issue`, state: dom, tone: open.length ? 'warn' : 'ok', facts: [['Domain', dom], ['Asks for', req], ['Verified by', how], ['Rooms it applies to', String(apply.length)], ['Rooms with an open issue on it', String(open.length)]], prov: 'KNOWN', source: 'campus room standards (synthetic, V2.5.3)', links: open.map((r) => ({ type: 'Room' as const, id: r.outline.id, rel: 'not met in' })) });
  }
  for (const [id, name, b, purpose, ch, rule, displays] of SIGNAGE) add({ type: 'SignageZone', id, name, sub: `${bShort(b)} · ${plural(displays, 'display')} · ${plural(ch, 'channel')}`, building: b, state: bShort(b), tone: 'muted', facts: [['Purpose', purpose], ['Displays', `${displays} (display class; no player or panel model is named)`], ['Channels', String(ch)], ['Priority rule', rule], ['Control plane', 'simulated: nothing is published']], prov: 'KNOWN', source: 'synthetic signage register (V2.5.3)', links: [] });

  const byType = Object.fromEntries(TYPE_KEYS.map((t) => [t, [] as Rec[]])) as Record<EntityType, Rec[]>;
  const ix = new Map<string, Rec>(); for (const r of out) { byType[r.type].push(r); if (!ix.has(r.id)) ix.set(r.id, r); }
  return { all: out, byType, get: (id) => ix.get(id), rooms };
}
export { DEMO_NOW, DAY, day, roomRecord, ROOMS, BUILDINGS, roomById, shortName, fullName, roomHref };
