/**
 * V2.5.3's room interiors on this campus model. vendor.js is V2.5.3's own layout and drawing code; this file supplies what it read from
 * V2.5.3's entity store and view state, built from the room records here (the same archetype codes, the same hero dimensions, the same
 * device categories, since the records came from V2.5.3). The room, its furniture and equipment are drawn exactly as V2.5.3 drew them;
 * the figures V2.5.3's reporting engines put on seats (capture class, video framing, sightlines) are computed here from the layout's own
 * cameras and microphones, as a plain modelled estimate (not V2.5.3's acoustic engine), and labelled modelled.
 */
import { makeV253, type V253, type V253Layout } from './vendor.js';
import { roomRecord } from '../../campus/design.js';
import { CAMPUS_ROOMS, buildingByKey } from '../../campus/canon.js';
import { roomState } from '../model.js';

export type V253State = 'designed' | 'commissioned' | 'current' | 'proposed';
export interface V253View { mode: string; state: V253State; layers: string[]; cover: string[]; sel?: string | null; cam?: string | null; edits?: V253Edits | null }
/** V2.5.3's own edit model (applyEdits): moves and turns by object id, objects added by kind, objects removed. Applied in the Optimize lens. */
export interface V253Edits { mv: Record<string, [number, number, number]>; add: Array<{ kind: 'micceil' | 'spk' | 'display' | 'camera'; x: number; y: number; aim?: number; face?: number }>; remove: string[] }

const RACK = new Set(['dsp', 'compute', 'switch', 'amp', 'encoder', 'switcher', 'control']);
type Ent = Record<string, unknown> & { id: string; type: string };
const ents = new Map<string, Ent>(); const devicesOf = new Map<string, Ent[]>();
function roomEnt(id: string): Ent | undefined {
  const hit = ents.get(id); if (hit) return hit;
  const r = roomRecord(id); if (!r) return undefined; const o = r.outline; const B = buildingByKey(o.building);
  // a device with an open issue on the record is not "Online" in the current state, so V2.5.3 marks it (its warning glyph) as it did
  const attention = new Set(roomState(r, 'current').positions.filter((p) => p.mark === 'attention').map((p) => p.code));
  const devs: Ent[] = r.positions.filter((p) => !p.furniture).map((p) => { const st = attention.has(p.code) ? 'Degraded' : 'Online'; return { id: `${id}:${p.code}`, type: 'Device', category: p.cat, name: p.label, model: p.device, state: st, stage: 'In service', roomId: id, status: st }; });
  for (const d of devs) ents.set(d.id, d); devicesOf.set(id, devs);
  const e: Ent = { id, type: 'Room', key: id, name: o.name, short: `${B?.short ?? o.building} ${o.number}`, number: o.number, buildingKey: o.building, floorN: o.floor, archetype: o.archetype, capacity: o.capacity,
    criticality: 'Standard', dims: { w: o.dims[0], d: o.dims[1], h: o.dims[2] }, templateName: r.archetypeName, availableNow: true, seatsNow: o.capacity, healthState: 'Healthy', docState: '' };
  ents.set(id, e); return e;
}
const get = (id: string): Ent | undefined => {
  if (id.startsWith('B-')) { const B = buildingByKey(id.slice(2)); return B ? { id, type: 'Building', key: B.key, name: B.name, short: B.short, floors: B.floors } : undefined; }
  return ents.get(id) || (id.startsWith('R-') ? roomEnt(id) : undefined);
};
const all = (type: string) => (type === 'Room' ? CAMPUS_ROOMS.map((o) => roomEnt(o.id)!).filter(Boolean) : []);
const outs = (id: string, rel: string) => (rel === 'HAS_DEVICE' ? (roomEnt(id), devicesOf.get(id) || []) : []);
const none = () => []; const nothing = () => undefined;

/** A modelled estimate of what V2.5.3's metricsOf put on seats, from the layout's own cameras and microphones (geometry only). */
function metricsOf(_room: unknown, L: V253Layout) {
  const covered = new Set<string>(); const cls = new Map<string, string>(); const detail = new Map<string, { sti?: number }>();
  for (const s of L.seats || []) {
    for (const c of L.cams || []) for (const p of c.presets || []) { const dx = s.x - c.x, dy = s.y - c.y, dist = Math.hypot(dx, dy); const ang = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360; const off = Math.abs(((ang - p.aim + 540) % 360) - 180); if (dist <= p.range && off <= p.fov / 2) covered.add(s.id); }
    let best = Infinity; for (const m of (L.mics as Array<{ x: number; y: number; r1?: number; r2?: number }>) || []) { const dist = Math.hypot(s.x - m.x, s.y - m.y); best = Math.min(best, dist / Math.max(0.5, m.r1 || 2.2)); }
    cls.set(s.id, best <= 1 ? 'primary' : best <= 1.5 ? 'secondary' : 'outside');
  }
  const n = (L.seats || []).length || 1;
  return { capture: { cls, detail }, repro: { cls: new Map() }, sight: { na: true, rays: [] as unknown[] }, video: { covered, framingSet: covered, zonePct: Math.round((covered.size / n) * 100) } };
}

/** The proposed state as V2.5.3 drew a proposal (engDesignFor → edits.add): the positions this campus's proposal adds, as added objects. */
const ADD_KIND: Record<string, string> = { camera: 'camera', bar: 'camera', micceil: 'micceil', speaker: 'spk', display: 'display' };
function engDesignFor(id: string) {
  const r = roomRecord(id); if (!r) return null; const pro = roomState(r, 'proposed'); if (!pro.available) return null;
  const add = pro.positions.filter((p) => p.mark === 'added' && ADD_KIND[p.cat]).map((p) => ({ kind: ADD_KIND[p.cat], x: p.x, y: p.y, aim: 90 }));
  return add.length ? { design: { edits: { add } } } : null;
}

/**
 * The founder's choice (13 Nov 2026): the town halls and control rooms V2.5.3 never drew are drawn from V2.5.3's own layout for their type,
 * scaled to the room. Town halls take V2.5.3's townhall (Horizon 1.400, 26 × 32 m); control rooms take its control room (Horizon 2.215,
 * 7.6 × 6.4 m). Positions scale with the room; large furniture (stage, desks, seating blocks, LED wall) stretches with it; equipment and
 * chairs keep their size; seating blocks hold about the room's capacity. Only V2.5.3's design is borrowed, never its story: the source
 * is laid out as designed (no dropped wireless channels, no proposed antennas), and this room's own records then mark its states.
 * The layout says where it came from (scaledFrom), and the page says it is scaled.
 */
const SCALE_SRC: Record<string, { id: string; dims: [number, number, number]; name: string }> = {
  TWN: { id: 'R-HZN-1-400', dims: [26, 32, 7.5], name: 'V2.5.3’s townhall (Horizon 1.400)' },
  CTL: { id: 'R-HZN-2-215', dims: [7.6, 6.4, 3], name: 'V2.5.3’s control room (Horizon 2.215)' },
};
type Obj = Record<string, unknown> & { kind: string; x: number; y: number; z?: number; w: number; d: number; h: number; rot?: number };
const STRETCH = new Set(['stage', 'desk', 'ledwall', 'table', 'seatblock', 'divider']);
function scaleLayout(L0: Record<string, unknown>, from: [number, number, number], to: { w: number; d: number; h: number }, capacity: number) {
  const sx = to.w / from[0], sy = to.d / from[1], sz = to.h / from[2], sr = Math.sqrt(sx * sy);
  const L = { ...L0, w: to.w, d: to.d, h: to.h } as Record<string, unknown>;
  const door = (dr: unknown) => { const o = dr as { wall: string; at: number; width: number } | undefined; return o ? { ...o, at: o.at * (o.wall === 'S' || o.wall === 'N' ? sx : sy) } : o; };
  L.door = door(L0.door); if (L0.door2) L.door2 = door(L0.door2);
  L.zones = ((L0.zones as Array<{ pts: number[][] }>) || []).map((z) => ({ ...z, pts: z.pts.map(([x, y]) => [x! * sx, y! * sy]) }));
  const blocks = ((L0.objs as Obj[]) || []).filter((o) => o.kind === 'seatblock').length || 1; const per = Math.max(4, Math.ceil(capacity / blocks));
  L.objs = ((L0.objs as Obj[]) || []).map((o0) => {
    const o: Obj = { ...o0, x: o0.x * sx, y: o0.y * sy };
    if (o.z && o.z > 0) o.z = Math.min(to.h - 0.1, o.z * sz);
    if (STRETCH.has(o.kind)) { o.w = o0.w * sx; o.d = o0.d * sy; }
    // a seating block keeps V2.5.3's seat width; rows close up to 0.9 m (no closer) so the block holds about its share of the capacity
    if (o.kind === 'seatblock') { const px = Number(o0.px) || 0.6, py0 = Number(o0.py) || 1.1; const cols = Math.max(2, Math.floor((o.w - 0.3) / px));
      const rows = Math.max(2, Math.min(Math.ceil(per / cols), Math.floor(o.d / 0.9) + 1)); const py = Math.min(py0, o.d / Math.max(1, rows - 1));
      Object.assign(o, { x0: Number(o0.x0) * sx, y0: Number(o0.y0) * sy, rows, cols, px, py }); }
    if (Array.isArray(o0.presets)) o.presets = (o0.presets as Array<Record<string, number>>).map((p) => ({ ...p, range: (p.range || 0) * sr }));
    if (typeof o0.range === 'number') o.range = (o0.range as number) * sr;
    if (typeof o0.capX === 'number') { o.capX = (o0.capX as number) * sx; o.capY = (o0.capY as number) * sy; }
    return o;
  });
  // V2.5.3's townhall told a wireless story of its own (two channels dropping at stage right): not this room's, so none is carried
  if (L0.wireless) L.wireless = { drop: false, fixed: false, zone: null, note: 'Wireless microphones as V2.5.3’s townhall layout places them' };
  L.ghost = null; L.drift = null;
  return L;
}
const SCALED = new Map<string, string>();
function addScaledRooms(E: V253) {
  const H = E.HERO_LAYOUT as Record<string, (room: unknown, st: string, o?: unknown) => Record<string, unknown>>;
  for (const o of CAMPUS_ROOMS) {
    const src = SCALE_SRC[o.archetype as string]; if (!src || H[o.id]) continue;
    const room = roomEnt(o.id); if (!room) continue;
    // only rooms V2.5.3's general layout cannot draw (it has no general layout for these types)
    let fine = false; try { const g = (E.genericLayout as (r: unknown) => { objs: Obj[] })(room); fine = g.objs.length > 0 && g.objs.every((x) => [x.x, x.y, x.w, x.d].every(Number.isFinite)); } catch { fine = false; }
    if (fine) continue;
    const make = H[src.id]!;
    H[o.id] = (r: unknown, _st: string, opts?: unknown) => { const rr = r as { dims: { w: number; d: number; h: number }; capacity: number };
      const L0 = make({ ...(r as object), id: src.id, dims: { w: src.dims[0], d: src.dims[1], h: src.dims[2] } }, 'designed', opts);
      return { ...scaleLayout(L0, src.dims, rr.dims, rr.capacity), scaledFrom: src.name }; };
    SCALED.set(o.id, src.name);
  }
}
/** Which of V2.5.3's layouts a room was scaled from, when it was (the founder's choice for the rooms V2.5.3 never drew). */
export const v253ScaledFrom = (roomId: string): string | null => { engine(); return SCALED.get(roomId) ?? null; };

let V: V253 | null = null;
const S = { role: 'architect', lite: { drift: {} as Record<string, unknown> }, assure: {}, com: {}, eng: {} };
function engine(): V253 {
  if (V) return V;
  V = makeV253({ get, all, outs, ins: none, out1: nothing, in1: nothing, LV: {}, S, metricsOf, stateOf: () => ({}), assuranceOf: () => null, engDesignFor, azFindings: none,
    userBaselineOf: nothing, implementedFor: none, comBuiltFix: nothing, gearOf: nothing, esc: (x: unknown) => String(x ?? ''), chip: () => '', plural: (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`,
    canViewEntity: () => true, canViewField: () => true, plainAside: () => '', plainRole: () => '', plainSub: () => '', subOf: () => '', iconFor: () => '', DB: { e: ents, t: new Map() }, OBJECT_CARDS: {}, nav: () => undefined });
  addScaledRooms(V);
  return V;
}

/** The room as V2.5.3 laid it out in a state: every object with its kind, position, size and the device it stands for. */
export function v253Layout(roomId: string, state: V253State = 'current'): V253Layout | null {
  const room = roomEnt(roomId); if (!room) return null; const E = engine();
  E.setLV(lv(roomId, { mode: 'engineer', state, layers: [], cover: [] }));
  return E.layoutOf(room, state);
}
function lv(roomId: string, v: V253View) {
  return { roomId, mode: v.mode, state: v.state, layers: new Set(v.layers), cover: new Set(v.cover), sel: v.sel ?? null, cam: v.cam ?? null, focus: null, edits: v.edits ?? null, preview: null, builder: null, replay: null, tween: null, split: null, assure: false, assurePage: null, acSrc: null, defs: null, hall: null, M: null, L: null };
}
/** V2.5.3's room scene (liteRoomScene) for a camera and a view: shell, furniture, equipment, coverage and labels, as L3 items. */
export function v253RoomScene(roomId: string, view: V253View, cam: { yaw: number; small: boolean }) {
  const room = roomEnt(roomId); if (!room) return null; const E = engine();
  const v = lv(roomId, view); E.setLV(v); (globalThis as unknown as { __v253room?: string }).__v253room = roomId;
  const a = (cam.yaw * Math.PI) / 180;
  return E.liteRoomScene({ sy: Math.sin(a), cy: Math.cos(a), s: 1, small: cam.small });
}
/** The scene and the layout it was drawn from (liteRoomScene leaves the layout on the view state, as V2.5.3 did on LV.L). */
export function v253Room(roomId: string, view: V253View, cam: { yaw: number; small: boolean }) {
  const room = roomEnt(roomId); if (!room) return null; const E = engine();
  const v = lv(roomId, view); E.setLV(v); (globalThis as unknown as { __v253room?: string }).__v253room = roomId;
  const a = (cam.yaw * Math.PI) / 180;
  const sc = E.liteRoomScene({ sy: Math.sin(a), cy: Math.cos(a), s: 1, small: cam.small }) as { items: Array<{ t: string; text?: string }> };
  // V2.5.3 labelled the rear rows with a speech-intelligibility figure from its acoustic engine, which is not carried over: without it the
  // figure would read 0.00, a number nobody computed. The label is left out rather than shown wrong (the Measurements panel says what is modelled).
  sc.items = sc.items.filter((i) => !(i.t === 'x' && /^Rear rows · STI/.test(i.text || '')));
  return { sc, L: v.L as unknown as V253Layout };
}
/** The room as arranged: V2.5.3's layout with the edits applied (Optimize), and what its cameras and microphones now reach (modelled). */
export function v253Arranged(roomId: string, edits: V253Edits | null) {
  const room = roomEnt(roomId); if (!room) return null; const E = engine();
  E.setLV(lv(roomId, { mode: 'optimize', state: 'current', layers: [], cover: [], edits })); (globalThis as unknown as { __v253room?: string }).__v253room = roomId;
  const L = (E.liteLayoutNow as () => V253Layout)(); const M = metricsOf(room, L); const n = (L.seats || []).length;
  const primary = [...M.capture.cls.values()].filter((c) => c === 'primary').length;
  return { L, seats: n, cam: M.video.covered.size, mic: primary };
}
export const v253Defs = () => engine().L3_DEFS;
/** who is looking, as V2.5.3's S.role: a visitor sees the room but opens no cards; everyone else may */
export const setV253Role = (role: string) => { S.role = role === 'visitor' ? 'visitor' : 'architect'; };
export const v253RoomIds = () => CAMPUS_ROOMS.map((o) => o.id);
/**
 * Whether V2.5.3 could draw this room. It drew town halls and control rooms only as its own hero rooms (fixed coordinates for one room),
 * with no general layout for those types; a room of those types that V2.5.3 did not have comes out without positions. Such a room opens on
 * the technical overlay instead, and says why, rather than drawing something V2.5.3 never drew.
 */
const drawable = new Map<string, boolean>();
export function v253Drawable(roomId: string): boolean {
  const hit = drawable.get(roomId); if (hit !== undefined) return hit;
  let ok = false; try { const L = v253Layout(roomId, 'current'); ok = !!L && L.objs.length > 0 && L.objs.every((o) => [o.x, o.y, o.w, o.d].every((n) => Number.isFinite(n))); } catch { ok = false; }
  drawable.set(roomId, ok); return ok;
}
export const v253Rack = (cat: string) => RACK.has(cat);
