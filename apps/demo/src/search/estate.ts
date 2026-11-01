/**
 * The demonstration's synthetic estate for Search Party (scenario 1: "If this switch fails, what is affected?"): a campus, two buildings,
 * rooms, their devices, the network and power that serve them, the people and roles around them, one open issue and its work order.
 * Every edge carries a provenance label as the product does; nothing here is measured, polled or real. The Build a Room draft (if one
 * exists in this browser) is merged in as a live room with its own devices and proposed connections.
 */
import { Graph, nodeKey, type Catalogue, type SearchNode, type Edge, type NodeRef } from '@empathia/search-party';
import { loadDraft, live, identity, unitOf, type Draft } from '../build/store.js';
import type { PlannedDevice, Connection } from '@empathia/domain-types';

const N = (type: string, id: string, label: string, extra: Partial<SearchNode> = {}): SearchNode => ({ type, id, label, provenance: 'synthetic seed (demonstration)', ...extra });
const E = (from: [string, string], rel: string, to: [string, string], provenance = 'DECLARED (synthetic seed)'): Edge => ({ from: { type: from[0], id: from[1] }, rel, to: { type: to[0], id: to[1] }, provenance });

export type Estate = Catalogue & { graph: Graph };
/** The estate graph. `draft` defaults to this browser's Build a Room draft; the impact panel passes the draft before and after a change. */
export function buildEstate(draft?: Draft | null): Estate {
  const nodes: SearchNode[] = [
    N('Site', 'SITE-NORTH', 'North Campus', { facets: { site: 'SITE-NORTH' } }),
    N('Building', 'ATL', 'Atlas Tower', { subtitle: 'North Campus · 12 floors', facets: { site: 'SITE-NORTH' } }),
    N('Building', 'NST', 'Northstar Annex', { subtitle: 'North Campus · 3 floors', facets: { site: 'SITE-NORTH' } }),
    N('Room', 'R-ATL-4-218', 'Atlas 4.218 Boardroom', { subtitle: 'Atlas Tower · floor 4 · OPERATIONAL', facets: { site: 'SITE-NORTH', building: 'ATL', lifecycle: 'OPERATIONAL' }, href: '#/suite/lite' }),
    N('Room', 'R-ATL-4-220', 'Atlas 4.220 Huddle', { subtitle: 'Atlas Tower · floor 4 · OPERATIONAL', facets: { site: 'SITE-NORTH', building: 'ATL', lifecycle: 'OPERATIONAL' } }),
    N('Room', 'R-ATL-4-231', 'Atlas 4.231 Training', { subtitle: 'Atlas Tower · floor 4 · ACCEPTED', facets: { site: 'SITE-NORTH', building: 'ATL', lifecycle: 'ACCEPTED' } }),
    N('Room', 'R-NST-2-101', 'Northstar Town Hall', { subtitle: 'Northstar Annex · floor 2 · COMMISSIONING', facets: { site: 'SITE-NORTH', building: 'NST', lifecycle: 'COMMISSIONING' } }),
    N('NetworkNode', 'SW-ATL-4A', 'Access switch ATL-4A', { subtitle: 'IDF 4 · 48 ports · PoE', facets: { building: 'ATL' } }),
    N('NetworkNode', 'SW-ATL-CORE', 'Core switch ATL-CORE', { subtitle: 'MDF · uplink for every floor', facets: { building: 'ATL' } }),
    N('PowerNode', 'PDU-ATL-4', 'Power panel ATL-4', { subtitle: 'IDF 4 · UPS-backed', facets: { building: 'ATL' } }),
    N('PlannedAsset', 'A-0101', 'Display 1 (4.218)', { subtitle: 'display · Atlas 4.218', facets: { building: 'ATL', category: 'display' } }),
    N('PlannedAsset', 'A-0102', 'UC room compute (4.218)', { subtitle: 'compute · Atlas 4.218', facets: { building: 'ATL', category: 'compute' } }),
    N('PlannedAsset', 'A-0103', 'Audio processor (4.218)', { subtitle: 'dsp · Atlas 4.218', facets: { building: 'ATL', category: 'dsp' } }),
    N('PlannedAsset', 'A-0104', 'Ceiling microphone (4.218)', { subtitle: 'micceil · Atlas 4.218', facets: { building: 'ATL', category: 'micceil' } }),
    N('PlannedAsset', 'A-0105', 'Touch panel (4.218)', { subtitle: 'touch · Atlas 4.218', facets: { building: 'ATL', category: 'touch' } }),
    N('PlannedAsset', 'A-0201', 'Video bar (4.220)', { subtitle: 'bar · Atlas 4.220', facets: { building: 'ATL', category: 'bar' } }),
    N('PlannedAsset', 'A-0202', 'UC room compute (4.220)', { subtitle: 'compute · Atlas 4.220', facets: { building: 'ATL', category: 'compute' } }),
    N('PlannedAsset', 'A-0301', 'Projector (4.231)', { subtitle: 'projector · Atlas 4.231', facets: { building: 'ATL', category: 'projector' } }),
    N('PlannedAsset', 'A-0302', 'Control processor (4.231)', { subtitle: 'control · Atlas 4.231', facets: { building: 'ATL', category: 'control' } }),
    N('RoomIssue', 'ISS-0417', 'Far-end audio drops out during long calls', { subtitle: 'High · OPEN · Atlas 4.218', facets: { severity: 'High', state: 'OPEN', building: 'ATL' } }),
    N('WorkOrder', 'WO-0088', 'WO-0088 · service', { subtitle: 'OPEN · ISS-0417', facets: { state: 'OPEN', role: 'service' } }),
    N('Person', 'p-syseng', 'Systems Engineer (synthetic)', { provenance: 'synthetic seed (approver recorded on the room)' }),
    N('Person', 'p-svcmgr', 'Service Manager (synthetic)', { provenance: 'synthetic seed (work order creator)' }),
    N('PersonRole', 'service', 'Service Technician', { provenance: 'V25_PERSONAS (policy)' }),
    N('Project', 'PRJ-ATLAS-AV', 'Atlas Tower AV refresh', { subtitle: 'OPEN', facets: { state: 'OPEN' } }),
    N('CommissioningBaseline', 'BL-4-231-v1', 'Atlas 4.231 · baseline v1', { subtitle: 'CURRENT · design revision 3', facets: { state: 'CURRENT', building: 'ATL' } }),
  ];
  const edges: Edge[] = [
    E(['Building', 'ATL'], 'LOCATED_IN', ['Site', 'SITE-NORTH'], 'DERIVED building.site'), E(['Building', 'NST'], 'LOCATED_IN', ['Site', 'SITE-NORTH'], 'DERIVED building.site'),
    E(['Room', 'R-ATL-4-218'], 'LOCATED_IN', ['Building', 'ATL']), E(['Room', 'R-ATL-4-220'], 'LOCATED_IN', ['Building', 'ATL']), E(['Room', 'R-ATL-4-231'], 'LOCATED_IN', ['Building', 'ATL']), E(['Room', 'R-NST-2-101'], 'LOCATED_IN', ['Building', 'NST']),
    E(['Room', 'R-ATL-4-218'], 'BELONGS_TO', ['Project', 'PRJ-ATLAS-AV'], 'DERIVED room.project'), E(['Room', 'R-ATL-4-220'], 'BELONGS_TO', ['Project', 'PRJ-ATLAS-AV'], 'DERIVED room.project'),
    ...['A-0101', 'A-0102', 'A-0103', 'A-0104', 'A-0105'].map((a) => E(['Room', 'R-ATL-4-218'], 'PLANS_DEVICE', ['PlannedAsset', a])),
    ...['A-0201', 'A-0202'].map((a) => E(['Room', 'R-ATL-4-220'], 'PLANS_DEVICE', ['PlannedAsset', a])),
    ...['A-0301', 'A-0302'].map((a) => E(['Room', 'R-ATL-4-231'], 'PLANS_DEVICE', ['PlannedAsset', a])),
    // the network: the access switch feeds the networked devices of three rooms; the core feeds the access switch; power behind both
    ...['A-0102', 'A-0103', 'A-0105', 'A-0202', 'A-0302'].map((a) => E(['NetworkNode', 'SW-ATL-4A'], 'FEEDS', ['PlannedAsset', a], 'OBSERVED (switch port table, synthetic collector export 2026-10-28)')),
    E(['NetworkNode', 'SW-ATL-CORE'], 'FEEDS', ['NetworkNode', 'SW-ATL-4A'], 'DECLARED (network design)'),
    E(['PowerNode', 'PDU-ATL-4'], 'POWERED_BY', ['NetworkNode', 'SW-ATL-4A'], 'DECLARED (electrical schedule)'),
    E(['NetworkNode', 'SW-ATL-4A'], 'POWERED_BY', ['PowerNode', 'PDU-ATL-4'], 'DECLARED (electrical schedule)'),
    // signal flow inside 4.218 (MODELED by the design rules)
    E(['PlannedAsset', 'A-0104'], 'CONNECTS_TO', ['PlannedAsset', 'A-0103'], 'MODELED (proposed connection)'), E(['PlannedAsset', 'A-0103'], 'CONNECTS_TO', ['PlannedAsset', 'A-0102'], 'MODELED (proposed connection)'), E(['PlannedAsset', 'A-0102'], 'CONNECTS_TO', ['PlannedAsset', 'A-0101'], 'MODELED (proposed connection)'), E(['PlannedAsset', 'A-0105'], 'CONTROLS', ['PlannedAsset', 'A-0102'], 'MODELED (proposed connection)'),
    E(['RoomIssue', 'ISS-0417'], 'AFFECTS', ['Room', 'R-ATL-4-218'], 'DERIVED issue.room'), E(['RoomIssue', 'ISS-0417'], 'ISSUE_ON', ['PlannedAsset', 'A-0103'], 'MODELED (triage)'),
    E(['RoomIssue', 'ISS-0417'], 'REMEDIED_BY', ['WorkOrder', 'WO-0088'], 'DERIVED work_order.issue'), E(['WorkOrder', 'WO-0088'], 'ASSIGNED_TO', ['PersonRole', 'service'], 'DECLARED work_order.assigned_role'), E(['WorkOrder', 'WO-0088'], 'RESOLVED_BY', ['Person', 'p-svcmgr'], 'DECLARED work_order.created_by'),
    E(['Room', 'R-ATL-4-231'], 'APPROVED_BY', ['Person', 'p-syseng'], 'DECLARED room.approved_class'), E(['CommissioningBaseline', 'BL-4-231-v1'], 'DOCUMENTS', ['Room', 'R-ATL-4-231'], 'DERIVED baseline.room'), E(['CommissioningBaseline', 'BL-4-231-v1'], 'APPROVED_BY', ['Person', 'p-syseng'], 'DECLARED baseline.published_by'),
  ];
  // the Build a Room draft of this browser, as a live room of the Northstar Annex
  const d = draft === undefined ? loadDraft() : draft;
  if (d) {
    nodes.push(N('Room', d.code, d.name, { subtitle: `Northstar Annex · ${d.design.lifecycle} · your Build a Room draft`, facets: { site: 'SITE-NORTH', building: 'NST', lifecycle: d.design.lifecycle }, href: '#/v25/build', provenance: 'Build a Room draft (this browser)' }));
    edges.push(E(['Room', d.code], 'LOCATED_IN', ['Building', 'NST'], 'DECLARED (Build a Room)'));
    for (const x of live(d.design.devices) as PlannedDevice[]) { if (x.furniture) continue; const u = identity(d, x.id); nodes.push(N('PlannedAsset', `${d.code}/${x.id}`, `${x.label} (${d.name})`, { subtitle: `${x.cat} · ${d.name} · ${u.asset ? `unit ${u.asset} · identity ${u.identityState}` : 'no unit installed'}`, facets: { building: 'NST', category: x.cat, identity: u.identityState || 'NO_UNIT' }, provenance: 'Build a Room draft (this browser)', href: '#/v25/build', keywords: [x.cat, ...(u.asset ? [u.asset] : [])] }));
      // ADR-0012: the unit at the position, located in it (DERIVED from the open installation record, as the enterprise API's catalogue does)
      if (u.asset) { const a = unitOf(d, u.asset); nodes.push(N('Asset', `${d.code}/${u.asset}`, `${u.asset} · ${a?.model || ''}`, { subtitle: `identity ${u.identityState} · synthetic unit at ${x.id}`, facets: { building: 'NST', identity: u.identityState || '' }, provenance: 'Build a Room draft (this browser)', href: '#/v25/build', keywords: [u.asset, 'unit', 'asset'] })); edges.push(E(['Asset', `${d.code}/${u.asset}`], 'LOCATED_IN', ['PlannedAsset', `${d.code}/${x.id}`], 'DERIVED (open installation record, Build a Room)')); } edges.push(E(['Room', d.code], 'PLANS_DEVICE', ['PlannedAsset', `${d.code}/${x.id}`], 'DECLARED (Build a Room)')); }
    for (const c of live(d.design.connections) as Connection[]) edges.push(E(['PlannedAsset', `${d.code}/${c.from}`], c.kind === 'control' ? 'CONTROLS' : c.kind === 'power' ? 'POWERED_BY' : 'CONNECTS_TO', ['PlannedAsset', `${d.code}/${c.to}`], 'MODELED (proposed connection, Build a Room)'));
    for (const b of d.baselines || []) { nodes.push(N('CommissioningBaseline', `${d.code}/v${b.version}`, `${d.name} · baseline v${b.version}`, { subtitle: `${b.state} · revision ${b.revision}`, facets: { state: b.state, building: 'NST' }, provenance: 'Build a Room draft (this browser)', href: '#/v25/build' })); edges.push(E(['CommissioningBaseline', `${d.code}/v${b.version}`], 'DOCUMENTS', ['Room', d.code], 'DERIVED baseline.room')); if (b.version > 1) edges.push(E(['CommissioningBaseline', `${d.code}/v${b.version}`], 'SUPERSEDES', ['CommissioningBaseline', `${d.code}/v${b.version - 1}`], 'DECLARED baseline.supersedes')); }
  }
  const visible = new Set(nodes.map((n) => nodeKey(n)));
  const kept = edges.filter((e) => visible.has(nodeKey(e.from)) && visible.has(nodeKey(e.to)));
  const types: Record<string, number> = {}; for (const n of nodes) types[n.type] = (types[n.type] || 0) + 1;
  return { nodes, edges: kept, graph: new Graph(kept), coverage: { types, edges: kept.length, notes: ['synthetic estate: every record and relationship is invented for the demonstration', 'ownership, support paths, vendors, skills and availability are not modelled: intents about them answer UNKNOWN', d ? 'your Build a Room draft is merged in as a live room' : 'build a room (Lite) and it appears here with its devices and connections'] } };
}

/** The ServiceHands context packet: devices, the switch that feeds them, its uplink, the other rooms on the same switch, power — recorded edges only.
 *  (Moved here from pages/Service.tsx so the room story reads the same dependencies the technician sees.) */
export function contextPacket(est: Estate, roomId: string) {
  const room: NodeRef = { type: 'Room', id: roomId };
  const label = (n: NodeRef) => est.nodes.find((x) => nodeKey(x) === nodeKey(n))?.label || n.id;
  const roomOf = (dev: NodeRef) => est.edges.find((e) => (e.rel === 'PLANS_DEVICE' || e.rel === 'HAS_DEVICE') && nodeKey(e.to) === nodeKey(dev))?.from || null;
  const devs = est.edges.filter((e) => (e.rel === 'PLANS_DEVICE' || e.rel === 'HAS_DEVICE') && nodeKey(e.from) === nodeKey(room)).map((e) => e.to);
  const swEdge = est.edges.find((e) => e.rel === 'FEEDS' && e.from.type === 'NetworkNode' && devs.some((d) => nodeKey(d) === nodeKey(e.to))) || null;
  const sw = swEdge?.from || null;
  const upEdge = sw ? est.edges.find((e) => e.rel === 'FEEDS' && nodeKey(e.to) === nodeKey(sw)) || null : null;
  const uplink = upEdge?.from || null;
  const sharing = sw ? [...new Set(est.edges.filter((e) => e.rel === 'FEEDS' && nodeKey(e.from) === nodeKey(sw)).map((e) => roomOf(e.to)).filter((r): r is NodeRef => !!r && r.id !== roomId).map(label))] : [];
  const powEdge = sw ? est.edges.find((e) => e.rel === 'POWERED_BY' && nodeKey(e.from) === nodeKey(sw)) || null : null;
  const power = powEdge?.to || null;
  return { devices: devs.map(label), switch: sw ? label(sw) : null, uplink: uplink ? label(uplink) : null, sharing, power: power ? label(power) : null,
    /** the provenance of each recorded edge the packet stands on (the story shows it beside the dependency) */
    provenance: { switch: swEdge?.provenance || null, uplink: upEdge?.provenance || null, power: powEdge?.provenance || null }, switchId: sw?.id || null };
}
