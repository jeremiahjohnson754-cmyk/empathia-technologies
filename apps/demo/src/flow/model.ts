/**
 * Empathia FLOW — AVoIP signal and network intelligence (Enterprise 3.0 directive 1, capability 2; journey J6A-FLOW). Read-only.
 * FLOW owns no topology of its own in the demonstration: every node and edge is the synthetic estate's record (src/search/estate.ts),
 * read through the relationship engine's own impact traversal. What FLOW adds is the reading: each claim sorted by layer (physical,
 * switching, routing, application) with its evidence state taken from the edge's provenance, and a plain UNKNOWN where the estate
 * holds nothing (timing, multicast, the WAN). It writes no configuration and reads no live network.
 */
import { impact } from '@empathia/relationship-engine';
import { buildEstate } from '../search/estate.js';
import { roomById, fullName } from '../campus/canon.js';
import { FLOW as CALL_FLOW, caseView, type CaseId, type EvidenceState } from '../voice/model.js';

export type NetLayer = 'L1' | 'L2' | 'L3' | 'APP';
export const NET_LAYER: Record<NetLayer, string> = { L1: 'Layer 1 · physical and power', L2: 'Layer 2 · switching', L3: 'Layer 3 · routing and uplink', APP: 'Application · streams and timing' };
export interface Claim { layer: NetLayer; label: string; state: EvidenceState; source: string; refs: Array<{ type: string; id: string; label: string }> }
export interface LinkView { node: { type: string; id: string; label: string; subtitle: string }; claims: Claim[]; rooms: Array<{ id: string; name: string; devices: string[] }>; dependents: number; voiceRooms: string[] }

let est: ReturnType<typeof buildEstate> | null = null; const estate = () => (est ||= buildEstate());
/** The evidence state an estate edge states in its provenance ("OBSERVED (switch port table…)"); anything else is DECLARED. */
export const stateOf = (prov: string): EvidenceState => { const m = /^(DECLARED|OBSERVED|MODELED|DERIVED|MEASURED|VERIFIED)/.exec(prov); return m ? (m[1] === 'DERIVED' ? 'DECLARED' : (m[1] as EvidenceState)) : 'DECLARED'; };
const label = (type: string, id: string) => estate().nodes.find((n) => n.type === type && n.id === id)?.label || id;
const R = (type: string, id: string) => ({ type, id, label: label(type, id) });
export const networkNodes = () => estate().nodes.filter((n) => n.type === 'NetworkNode').map((n) => ({ id: n.id, label: n.label, subtitle: n.subtitle || '' }));

export function linkView(nodeId: string, voiceCase: CaseId = 'degraded'): LinkView | null {
  const e = estate(); const node = e.nodes.find((n) => n.type === 'NetworkNode' && n.id === nodeId); if (!node) return null;
  const me = { type: 'NetworkNode', id: nodeId }; const out = e.edges.filter((x) => x.from.type === 'NetworkNode' && x.from.id === nodeId); const inc = e.edges.filter((x) => x.to.type === 'NetworkNode' && x.to.id === nodeId);
  const claims: Claim[] = [];
  for (const p of out.filter((x) => x.rel === 'POWERED_BY')) claims.push({ layer: 'L1', label: `Powered from ${label(p.to.type, p.to.id)}`, state: stateOf(p.provenance), source: p.provenance, refs: [R(p.to.type, p.to.id)] });
  claims.push({ layer: 'L1', label: 'Cabling between this node and its devices', state: 'UNKNOWN', source: 'The estate holds no cable or patch record. FLOW does not infer one.', refs: [] });
  const feeds = out.filter((x) => x.rel === 'FEEDS'); const groups = new Map<string, typeof feeds>();
  for (const f of feeds) { const k = `${f.to.type}|${f.provenance}`; groups.set(k, [...(groups.get(k) || []), f]); }
  for (const [k, g] of groups) { const t = k.split('|')[0]!; claims.push({ layer: t === 'NetworkNode' ? 'L3' : 'L2', label: t === 'NetworkNode' ? `Feeds ${g.map((x) => label(x.to.type, x.to.id)).join(', ')}` : `Feeds ${g.length} networked device${g.length === 1 ? '' : 's'}`, state: stateOf(g[0]!.provenance), source: g[0]!.provenance, refs: g.map((x) => R(x.to.type, x.to.id)) }); }
  for (const u of inc.filter((x) => x.rel === 'FEEDS')) claims.push({ layer: 'L3', label: `Uplink: fed by ${label(u.from.type, u.from.id)}`, state: stateOf(u.provenance), source: u.provenance, refs: [R(u.from.type, u.from.id)] });
  // the one observation FLOW shares with VOICE: the simulated uplink counters of the call-path fixture (same record, never a second copy)
  const core = caseView(voiceCase).hops.find((h) => h.layer === 'core');
  if (core && (nodeId === 'SW-ATL-4A' || nodeId === 'SW-ATL-CORE')) claims.push({ layer: 'L3', label: 'Uplink interface counters', state: core.observed.state, source: core.observed.source, refs: [] });
  claims.push({ layer: 'L3', label: 'Beyond the building (WAN)', state: 'UNKNOWN', source: 'No collector is configured at the WAN edge.', refs: [] });
  // application: the modelled signal connections between the devices this node feeds, and what is not recorded at all
  const fed = new Set(feeds.filter((x) => x.to.type === 'PlannedAsset').map((x) => x.to.id));
  const streams = e.edges.filter((x) => x.rel === 'CONNECTS_TO' && (fed.has(x.from.id) || fed.has(x.to.id)));
  if (streams.length) claims.push({ layer: 'APP', label: `${streams.length} signal connection${streams.length === 1 ? '' : 's'} touch the devices on this node`, state: stateOf(streams[0]!.provenance), source: `${streams[0]!.provenance}. A modelled connection is a design proposal, not an observed stream.`, refs: streams.map((x) => ({ type: x.from.type, id: x.from.id, label: `${label(x.from.type, x.from.id)} → ${label(x.to.type, x.to.id)}` })) });
  claims.push({ layer: 'APP', label: 'Network timing (PTP) and multicast', state: 'UNKNOWN', source: 'No timing source, multicast group or stream registry is recorded in the estate. Nothing is asserted about them.', refs: [] });
  // dependents by the relationship engine's own traversal; rooms are the ones that plan the fed devices
  const hit = impact(e.graph, me, ['FEEDS', 'CONNECTS_TO']); const devices = new Set(hit.filter((n) => n.type === 'PlannedAsset').map((n) => n.id));
  const rooms = new Map<string, string[]>();
  for (const x of e.edges.filter((y) => y.rel === 'PLANS_DEVICE' && devices.has(y.to.id))) rooms.set(x.from.id, [...(rooms.get(x.from.id) || []), label('PlannedAsset', x.to.id)]);
  const list = [...rooms].map(([id, d]) => ({ id, name: roomById(id) ? fullName(roomById(id)!) : label('Room', id), devices: d })).sort((a, b) => a.id.localeCompare(b.id));
  return { node: { type: 'NetworkNode', id: node.id, label: node.label, subtitle: node.subtitle || '' }, claims, rooms: list, dependents: hit.length, voiceRooms: list.filter((r) => r.id === CALL_FLOW.room.entityId).map((r) => r.id) };
}
export const WHY = 'Enterprise 3.0 directive 1 (FLOW, read-only) and founder decision E3-D2: network records are read by the roles V2.5.3 gives the NetworkNode entity, and by the UC / Voice Administrator, whose calling depends on them';
