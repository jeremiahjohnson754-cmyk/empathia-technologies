/**
 * The canonical estate model (v1.8.1 §3.1, §13): one shape for every world, so Lite, Search Party, Space Optimizer and Showroom Builder
 * are built once and read any estate. World → campus or venue → district → building → level → space or room → asset.
 *
 * Not every estate uses every depth, and a space may cross the usual boundaries (a seating bowl, a concourse, a quad, an expo hall):
 * such a space has one parent and lists the other places it reaches in `spans`. Every record has a stable identifier that never encodes
 * its position in a list, a typed parent, an access class and a provenance. Everything in these estates is SYNTHETIC: fictional places,
 * generic equipment classes, modeled figures. Nothing here is a survey, an as-built record or a measurement.
 */
export type WorldKey = 'enterprise' | 'stadium' | 'university' | 'convention';
export type NodeKind = 'world' | 'campus' | 'venue' | 'district' | 'building' | 'level' | 'space' | 'room';
/** Who may see more than a place's name and location. `public` anyone; `members` signed-in members of the community (students, attendees);
 *  `staff` the organization's staff; `restricted` named groups only (team areas, residents, venue-private engineering). */
export type Access = 'public' | 'members' | 'staff' | 'restricted';
export const ACCESS_ORDER: readonly Access[] = ['public', 'members', 'staff', 'restricted'];
export type Commissioning = 'ACCEPTED' | 'COMMISSIONING' | 'DESIGNED' | 'NOT_APPLICABLE';

export interface EstateNode {
  id: string; world: WorldKey; kind: NodeKind;
  /** what it is, in the world's own vocabulary: 'classroom', 'dormitory', 'suite', 'breakout-room', 'concourse' … */
  type: string;
  name: string; parent: string | null;
  /** other places a space reaches across (a bowl spans levels; a quad touches buildings) */
  spans?: string[];
  access: Access;
  /** a group the record belongs to within its world: a school, a stadium district, an event zone */
  group?: string;
  capacity?: number;
  /** length, width, height in metres (rooms) */
  dims?: [number, number, number];
  layout?: string;
  stepFree?: boolean; accessNote?: string;
  commissioning?: Commissioning;
  /** year the room's systems were last refreshed */
  refreshed?: number;
  /** position on the estate's 2D plan, in plan units (buildings and outdoor spaces) */
  plan?: { x: number; y: number; w: number; h: number };
  note?: string;
  provenance: 'SYNTHETIC';
}
export type AssetKind = 'display' | 'projector' | 'camera' | 'microphone' | 'loudspeaker' | 'processor' | 'control' | 'network' | 'compute' | 'capture' | 'assistive' | 'lighting' | 'signage' | 'led' | 'intercom' | 'router';
export interface Asset { id: string; world: WorldKey; room: string; kind: AssetKind; label: string; /** a generic equipment class, never a manufacturer or model */ cls: string; qty: number; installed: number; state: 'IN_SERVICE' | 'ATTENTION' | 'PLANNED'; provenance: 'SYNTHETIC' }
export interface Route { id: string; from: string; to: string; minutes: number; stepFree: boolean; via: string; note?: string }
export interface Estate { world: WorldKey; version: string; name: string; fictional: true; nodes: EstateNode[]; assets: Asset[]; routes: Route[] }

export interface Index { estate: Estate; byId: Map<string, EstateNode>; children: Map<string, EstateNode[]>; assetsOf: Map<string, Asset[]> }
export function indexOf(e: Estate): Index {
  const byId = new Map(e.nodes.map((n) => [n.id, n])); const children = new Map<string, EstateNode[]>(); const assetsOf = new Map<string, Asset[]>();
  for (const n of e.nodes) if (n.parent) { const l = children.get(n.parent) || []; l.push(n); children.set(n.parent, l); }
  for (const a of e.assets) { const l = assetsOf.get(a.room) || []; l.push(a); assetsOf.set(a.room, l); }
  return { estate: e, byId, children, assetsOf };
}
/** From the world down to the node: the breadcrumb, and the proof that the node hangs in the tree. */
export function pathOf(ix: Index, id: string): EstateNode[] {
  const out: EstateNode[] = []; const seen = new Set<string>(); let n = ix.byId.get(id);
  while (n && !seen.has(n.id)) { out.unshift(n); seen.add(n.id); n = n.parent ? ix.byId.get(n.parent) : undefined; }
  return out;
}
export function descendants(ix: Index, id: string): EstateNode[] { const out: EstateNode[] = []; const walk = (x: string) => { for (const c of ix.children.get(x) || []) { out.push(c); walk(c.id); } }; walk(id); return out; }
export const ofType = (e: Estate, type: string) => e.nodes.filter((n) => n.type === type);
/** May a reader with this access class see the record's detail? (Its name and place on a public map may still be shown.) */
export const maySee = (reader: Access, n: Pick<EstateNode, 'access'>) => ACCESS_ORDER.indexOf(reader) >= ACCESS_ORDER.indexOf(n.access);

/** Every reason the estate is not internally consistent; an empty list means it is. */
export function validate(e: Estate): string[] {
  const errs: string[] = []; const ix = indexOf(e); const ids = new Set<string>();
  const roots = e.nodes.filter((n) => n.parent === null); if (roots.length !== 1 || roots[0]!.kind !== 'world') errs.push('an estate has exactly one root, the world');
  for (const n of e.nodes) {
    if (ids.has(n.id)) errs.push(`duplicate id ${n.id}`); ids.add(n.id);
    if (!/^[A-Z][A-Z0-9]*(-[A-Z0-9]+)*$/.test(n.id)) errs.push(`id ${n.id} is not a stable identifier`);
    if (n.world !== e.world) errs.push(`${n.id} belongs to another world`);
    if (n.provenance !== 'SYNTHETIC') errs.push(`${n.id} has no provenance`);
    if (n.parent !== null && !ix.byId.has(n.parent)) errs.push(`${n.id} has no parent ${n.parent}`);
    for (const s of n.spans || []) if (!ix.byId.has(s)) errs.push(`${n.id} spans a missing place ${s}`);
    if (n.parent !== null) { const p = pathOf(ix, n.id); if (p[0]?.kind !== 'world') errs.push(`${n.id} does not hang from the world`); }
    if (n.kind === 'room') {
      if (!n.dims || n.dims.some((d) => !(d > 0)) || n.dims[2] < 2.2 || n.dims[2] > 30) errs.push(`${n.id} has no believable dimensions`);
      if (!(n.capacity && n.capacity > 0)) errs.push(`${n.id} has no capacity`);
      else if (n.dims && (n.dims[0] * n.dims[1]) / n.capacity < 0.45) errs.push(`${n.id} seats ${n.capacity} in ${(n.dims[0] * n.dims[1]).toFixed(0)} m²: too dense to be real`);
      if (n.stepFree === undefined) errs.push(`${n.id} does not say whether it is step-free`);
      if (!n.commissioning) errs.push(`${n.id} has no commissioning state`);
    }
  }
  const names = new Map<string, string>();   // no duplicate records disguised as different rooms: one name per parent
  for (const n of e.nodes) { const k = `${n.parent}|${n.name}`; if (names.has(k)) errs.push(`${n.id} and ${names.get(k)} are the same place twice`); names.set(k, n.id); }
  const aids = new Set<string>();
  for (const a of e.assets) {
    if (aids.has(a.id) || ids.has(a.id)) errs.push(`duplicate asset id ${a.id}`); aids.add(a.id);
    const r = ix.byId.get(a.room); if (!r) errs.push(`asset ${a.id} is in a missing room ${a.room}`); else if (r.kind !== 'room' && r.kind !== 'space') errs.push(`asset ${a.id} is not in a room or space`);
    if (a.world !== e.world) errs.push(`asset ${a.id} belongs to another world`);
    if (!(a.qty > 0)) errs.push(`asset ${a.id} has no quantity`);
  }
  for (const r of e.routes) { if (!ix.byId.has(r.from) || !ix.byId.has(r.to)) errs.push(`route ${r.id} has a missing end`); if (!(r.minutes > 0)) errs.push(`route ${r.id} has no duration`); }
  return errs;
}
/** A deterministic pick: the same seed always gives the same choice, so an estate never changes between loads. */
export const pick = <T,>(xs: readonly T[], seed: number): T => xs[((seed % xs.length) + xs.length) % xs.length]!;
