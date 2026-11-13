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
export interface V253View { mode: string; state: V253State; layers: string[]; cover: string[]; sel?: string | null; cam?: string | null }

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

let V: V253 | null = null;
const S = { role: 'architect', lite: { drift: {} as Record<string, unknown> }, assure: {}, com: {}, eng: {} };
function engine(): V253 {
  if (V) return V;
  V = makeV253({ get, all, outs, ins: none, out1: nothing, in1: nothing, LV: {}, S, metricsOf, stateOf: () => ({}), assuranceOf: () => null, engDesignFor, azFindings: none,
    userBaselineOf: nothing, implementedFor: none, comBuiltFix: nothing, gearOf: nothing, esc: (x: unknown) => String(x ?? ''), chip: () => '', plural: (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`,
    canViewEntity: () => true, canViewField: () => true, plainAside: () => '', plainRole: () => '', plainSub: () => '', subOf: () => '', iconFor: () => '', DB: { e: ents, t: new Map() }, OBJECT_CARDS: {}, nav: () => undefined });
  return V;
}

/** The room as V2.5.3 laid it out in a state: every object with its kind, position, size and the device it stands for. */
export function v253Layout(roomId: string, state: V253State = 'current'): V253Layout | null {
  const room = roomEnt(roomId); if (!room) return null; const E = engine();
  E.setLV(lv(roomId, { mode: 'engineer', state, layers: [], cover: [] }));
  return E.layoutOf(room, state);
}
function lv(roomId: string, v: V253View) {
  return { roomId, mode: v.mode, state: v.state, layers: new Set(v.layers), cover: new Set(v.cover), sel: v.sel ?? null, cam: v.cam ?? null, focus: null, edits: null, preview: null, builder: null, replay: null, tween: null, split: null, assure: false, assurePage: null, acSrc: null, defs: null, hall: null, M: null, L: null };
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
