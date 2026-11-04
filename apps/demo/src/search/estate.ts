/**
 * The demonstration's synthetic estate for Search Party (scenario 1: "If this switch fails, what is affected?"): a campus, two buildings,
 * rooms, their devices, the network and power that serve them, the people and roles around them, one open issue and its work order.
 * Every edge carries a provenance label as the product does; nothing here is measured, polled or real. The Build a Room draft (if one
 * exists in this browser) is merged in as a live room with its own devices and proposed connections.
 */
import { Graph, nodeKey, type Catalogue, type SearchNode, type Edge } from '@empathia/search-party';
import { loadDraft, live } from '../build/store.js';
import type { PlannedDevice, Connection } from '@empathia/domain-types';
import { BUILDINGS as CAMPUS_BUILDINGS, REGIONAL_SITES, CAMPUS_ROOMS as ROOMS, SITE, fullName, roomHref, buildingByKey, roomById } from '../campus/canon.js';
/** the campus buildings and the fictional regional sites of the rooms plan (rows 40, 42, 45 sit on them) */
const BUILDINGS = [...CAMPUS_BUILDINGS, ...REGIONAL_SITES];
import { roomRecord } from '../campus/design.js';

const N = (type: string, id: string, label: string, extra: Partial<SearchNode> = {}): SearchNode => ({ type, id, label, provenance: 'synthetic seed (demonstration)', ...extra });
const E = (from: [string, string], rel: string, to: [string, string], provenance = 'DECLARED (synthetic seed)'): Edge => ({ from: { type: from[0], id: from[1] }, rel, to: { type: to[0], id: to[1] }, provenance });

export function buildEstate(): Catalogue & { graph: Graph } {
  const nodes: SearchNode[] = [
    N('Site', 'SITE-NORTH', SITE.name, { facets: { site: 'SITE-NORTH' } }),
    N('Building', 'ATL', 'Atlas HQ', { subtitle: `${SITE.name} · 7 floors`, facets: { site: 'SITE-NORTH' }, href: '#/campus/ATL' }),
    N('Building', 'NST', 'Northstar Annex', { subtitle: `${SITE.name} · 3 floors`, facets: { site: 'SITE-NORTH' }, href: '#/campus/NST' }),
    // the reference room's status comes from its record (recommissioning held), never from a hand-typed label
    N('Room', 'R-ATL-4-218', 'Atlas 4.218 Boardroom', { subtitle: `Atlas HQ · floor 4 · ${roomRecord('R-ATL-4-218')!.lifecycle} (recommissioning held)`, facets: { site: 'SITE-NORTH', building: 'ATL', lifecycle: roomRecord('R-ATL-4-218')!.lifecycle }, href: roomHref(roomById('R-ATL-4-218')!) }),
    N('Room', 'R-ATL-4-220', 'Atlas 4.220 Huddle', { subtitle: 'Atlas HQ · floor 4 · OPERATIONAL', facets: { site: 'SITE-NORTH', building: 'ATL', lifecycle: 'OPERATIONAL' }, href: roomHref(roomById('R-ATL-4-220')!) }),
    N('Room', 'R-ATL-4-231', 'Atlas 4.231 Training', { subtitle: 'Atlas HQ · floor 4 · ACCEPTED', facets: { site: 'SITE-NORTH', building: 'ATL', lifecycle: 'ACCEPTED' }, href: roomHref(roomById('R-ATL-4-231')!) }),
    N('Room', 'R-NST-2-101', 'Northstar Town Hall', { subtitle: 'Northstar Annex · floor 2 · COMMISSIONING', facets: { site: 'SITE-NORTH', building: 'NST', lifecycle: 'COMMISSIONING' }, href: roomHref(roomById('R-NST-2-101')!) }),
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
  // the canonical campus: every building and room, and each room's device positions (position code · asset code · identity state)
  const have = new Set(nodes.map((n) => nodeKey(n)));
  for (const b of BUILDINGS) if (!have.has(`Building:${b.key}`)) { nodes.push(N('Building', b.key, b.name, { subtitle: `${SITE.name} · ${b.floors} floors`, facets: { site: 'SITE-NORTH' }, href: `#/campus/${b.key}` })); edges.push(E(['Building', b.key], 'LOCATED_IN', ['Site', 'SITE-NORTH'], 'DERIVED building.site')); }
  for (const o of ROOMS) {
    const rec = roomRecord(o.id)!;
    if (!have.has(`Room:${o.id}`)) { nodes.push(N('Room', o.id, fullName(o), { subtitle: `${buildingByKey(o.building)!.name} · floor ${o.floor} · ${rec.lifecycle}`, facets: { site: 'SITE-NORTH', building: o.building, lifecycle: rec.lifecycle }, href: roomHref(o), provenance: o.kind === 'designed' ? 'MODELED room (designed from its archetype)' : 'synthetic seed (demonstration)' })); edges.push(E(['Room', o.id], 'LOCATED_IN', ['Building', o.building])); }
    for (const p of rec.positions) {
      if (p.furniture) continue;
      const id = have.has(`PlannedAsset:${p.code}`) ? p.code : `${o.id}/${p.code}`;
      if (id === p.code) { const n = nodes.find((x) => x.type === 'PlannedAsset' && x.id === id); if (n) { n.subtitle = `${n.subtitle} · position ${p.code} · asset ${p.asset || '—'} · identity ${p.identity}`; n.href = `${roomHref(o)}?device=${p.code}`; } continue; }
      nodes.push(N('PlannedAsset', id, `${p.label} (${o.number})`, { subtitle: `${p.catLabel} · position ${p.code} · asset ${p.asset || '—'} · identity ${p.identity}`, facets: { building: o.building, category: p.cat }, href: `${roomHref(o)}?device=${p.code}`, provenance: p.provenance }));
      edges.push(E(['Room', o.id], 'PLANS_DEVICE', ['PlannedAsset', id], o.kind === 'designed' ? 'MODELED (archetype template)' : 'DECLARED (room record)'));
    }
  }
  // the Build a Room draft of this browser, as a live room of the Northstar Annex
  const d = loadDraft();
  if (d) {
    nodes.push(N('Room', d.code, d.name, { subtitle: `Northstar Annex · ${d.design.lifecycle} · your Build a Room draft`, facets: { site: 'SITE-NORTH', building: 'NST', lifecycle: d.design.lifecycle }, href: '#/v25/build', provenance: 'Build a Room draft (this browser)' }));
    edges.push(E(['Room', d.code], 'LOCATED_IN', ['Building', 'NST'], 'DECLARED (Build a Room)'));
    for (const x of live(d.design.devices) as PlannedDevice[]) { if (x.furniture) continue; nodes.push(N('PlannedAsset', `${d.code}/${x.id}`, `${x.label} (${d.name})`, { subtitle: `${x.cat} · ${d.name}`, facets: { building: 'NST', category: x.cat }, provenance: 'Build a Room draft (this browser)', href: '#/v25/build' })); edges.push(E(['Room', d.code], 'PLANS_DEVICE', ['PlannedAsset', `${d.code}/${x.id}`], 'DECLARED (Build a Room)')); }
    for (const c of live(d.design.connections) as Connection[]) edges.push(E(['PlannedAsset', `${d.code}/${c.from}`], c.kind === 'control' ? 'CONTROLS' : c.kind === 'power' ? 'POWERED_BY' : 'CONNECTS_TO', ['PlannedAsset', `${d.code}/${c.to}`], 'MODELED (proposed connection, Build a Room)'));
    for (const b of d.baselines || []) { nodes.push(N('CommissioningBaseline', `${d.code}/v${b.version}`, `${d.name} · baseline v${b.version}`, { subtitle: `${b.state} · revision ${b.revision}`, facets: { state: b.state, building: 'NST' }, provenance: 'Build a Room draft (this browser)', href: '#/v25/build' })); edges.push(E(['CommissioningBaseline', `${d.code}/v${b.version}`], 'DOCUMENTS', ['Room', d.code], 'DERIVED baseline.room')); if (b.version > 1) edges.push(E(['CommissioningBaseline', `${d.code}/v${b.version}`], 'SUPERSEDES', ['CommissioningBaseline', `${d.code}/v${b.version - 1}`], 'DECLARED baseline.supersedes')); }
  }
  const visible = new Set(nodes.map((n) => nodeKey(n)));
  const kept = edges.filter((e) => visible.has(nodeKey(e.from)) && visible.has(nodeKey(e.to)));
  const types: Record<string, number> = {}; for (const n of nodes) types[n.type] = (types[n.type] || 0) + 1;
  return { nodes, edges: kept, graph: new Graph(kept), coverage: { types, edges: kept.length, notes: ['synthetic estate: every record and relationship is invented for the demonstration', 'ownership, support paths, vendors, skills and availability are not modelled: intents about them answer UNKNOWN', d ? 'your Build a Room draft is merged in as a live room' : 'build a room (Lite) and it appears here with its devices and connections'] } };
}
