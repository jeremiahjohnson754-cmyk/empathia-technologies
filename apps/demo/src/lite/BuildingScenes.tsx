/**
 * A building's floors drawn apart, and one floor in 3D (V2.5.3 liteBuildingScene, liteFloorScene and floorPlan, ported to L3). The floor
 * plan is V2.5.3's own rule: the floor's rooms in number order, the first half along the north side of a corridor and the rest along the
 * south, Atlas's workplace spaces placed into the shorter side, a network closet at the end of the north row, a core with lifts and stairs
 * at the west end. Sizes are each room's modelled dimensions from its record; the arrangement is illustrative, not a surveyed plan.
 */
import { useEffect, useMemo, useState } from 'react';
import { roomRecord } from '../campus/design.js';
import { buildingByKey, BUILDINGS } from '../campus/canon.js';
import { bandOf } from '../campus/metrics.js';
import { SPACES } from './data/v253.js';
import { roomsOf, readiness, liteRoomHref } from './model.js';
import { scene, poly, line, label, hit, box, rgb, useCam, L3View, type Cam, type RGB, type L3Scene } from './l3.js';
import { LOOK } from '../map/looks.js';
import { CampusMap } from '../spatial/Spatial.js';
import type { MapOverlay } from '../map/EmpathiaMap.js';
import { campusStats } from '../campus/metrics.js';
import { load as loadWs } from '../workspace/store.js';
import { paintAsync, layoutOf, GROUND, U, STOREY, type View } from '../map/imagery.js';

export interface PlanItem { id: string; type: 'room' | 'space' | 'closet'; w: number; d: number; label: string; x: number; y: number; side: 'N' | 'S' }
export interface FloorPlanModel { bKey: string; fN: number; W: number; D: number; core: { x: number; y: number; w: number; d: number }; corridor: { x: number; y: number; w: number; d: number }; midY: number; items: PlanItem[]; liftBox: { x: number; y: number; w: number; d: number }; stairBox: { x: number; y: number; w: number; d: number }; entrance: [number, number] | null }
const cache = new Map<string, FloorPlanModel>();
/** V2.5.3 floorPlan(bKey, fN), on this campus model's rooms. */
export function floorPlan(bKey: string, fN: number): FloorPlanModel {
  const k = `${bKey}-${fN}`; const hit0 = cache.get(k); if (hit0) return hit0;
  const rooms = roomsOf(bKey, fN).slice().sort((a, b) => Number(a.number.split('.')[1]) - Number(b.number.split('.')[1]));
  const topN = Math.ceil(rooms.length / 2);
  const spaces = bKey === 'ATL' ? SPACES.filter((s) => s.floor === fN && s.size) : [];
  const asItem = (r: (typeof rooms)[number]) => { const [w, d] = roomRecord(r.id)!.outline.dims; return { id: r.id, type: 'room' as const, w, d, label: r.number }; };
  const north: Omit<PlanItem, 'x' | 'y' | 'side'>[] = rooms.slice(0, topN).map(asItem), south: Omit<PlanItem, 'x' | 'y' | 'side'>[] = rooms.slice(topN).map(asItem);
  const len = (row: { w: number }[]) => row.reduce((a, x) => a + x.w + 0.5, 0);
  for (const s of spaces) { const it = { id: s.id, type: 'space' as const, w: s.size![0], d: s.size![1], label: s.name.replace(/^(Atlas|Northstar) /, '') }; if (s.id === 'SP-ATL-LOBBY') south.unshift(it); else if (len(north) <= len(south)) north.push(it); else south.push(it); }
  north.push({ id: `SP-${bKey}-${fN}-IDF`, type: 'closet', w: 3, d: 3.2, label: 'Network closet' });
  const coreW = 5.5, corW = 2.6; const dN = Math.max(...north.map((x) => x.d), 6), dS = Math.max(...south.map((x) => x.d), 6); const corY = dN + 0.3;
  const items: PlanItem[] = []; let x = coreW + 0.8;
  for (const it of north) { items.push({ ...it, x, y: corY - it.d, side: 'N' }); x += it.w + 0.5; }
  const endN = x; x = coreW + 0.8;
  for (const it of south) { items.push({ ...it, x, y: corY + corW, side: 'S' }); x += it.w + 0.5; }
  const W = Math.max(endN, x) + 0.4, D = corY + corW + dS + 0.3, midY = corY + corW / 2;
  const lobby = items.find((i) => i.id === 'SP-ATL-LOBBY');
  const P: FloorPlanModel = { bKey, fN, W, D, core: { x: 0.3, y: 0.3, w: coreW, d: D - 0.6 }, corridor: { x: coreW + 0.3, y: corY, w: W - coreW - 0.6, d: corW }, midY, items,
    liftBox: { x: 1.2, y: midY - 2.6, w: 3.6, d: 2.2 }, stairBox: { x: 1.2, y: midY + 0.6, w: 3.6, d: 2.6 }, entrance: lobby ? [lobby.x + lobby.w / 2, lobby.y + lobby.d] : null };
  cache.set(k, P); return P;
}
// The estate look (founder, 19 Nov 2026 09:54: the building and floor views look and feel like the estate view). The Empathia Map's own
// materials: each building's glass, slab and roof (map/looks.ts), its grass and paving (imagery.ts), its room colours (EmpathiaMap STATE_COL),
// in daylight. A room's colour is its readiness band, as before; only the materials changed.
const BAND_RGB: Record<string, RGB> = { healthy: [64, 168, 118], monitor: [222, 170, 64], action: [212, 98, 80], none: [160, 166, 172] };
const BAND_EDGE: Record<string, string> = { healthy: 'rgba(30,110,74,.9)', monitor: 'rgba(160,110,20,.9)', action: 'rgba(170,52,38,.95)', none: 'rgba(90,96,104,.6)' };
const BAND_FLOOR: Record<string, string> = { healthy: 'rgba(64,168,118,.32)', monitor: 'rgba(222,170,64,.38)', action: 'url(#l3hatchE)', none: 'rgba(150,156,164,.26)' };
const SPACE_RGB: RGB = [70, 186, 172], CLOSET_RGB: RGB = [122, 134, 142], CORE_RGB: RGB = [156, 160, 164], LIFT_RGB: RGB = [126, 142, 164], STAIR_RGB: RGB = [134, 138, 144], PARTITION: RGB = [236, 232, 224];
const hexRgb = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lookOf = (key: string) => LOOK[key] || LOOK.ATL!;
/** The ground at every level is the estate map's own synthetic aerial imagery (map/imagery.ts: lawns, the ring road, car parks, plazas,
 *  paths, woods, the pond, and the buildings' shadows), painted once in this browser and kept for the visit; never fetched, never real.
 *  Founder, 19 Nov 2026 12:37: the Lite campus should look like the campus on the start page. */
const aerial = new Map<string, Promise<string>>();
/** the square of ground round a building, `k` times its longer side: the imagery painted at a few times the campus's resolution (the floor
 *  sees close, 3×; the building's floors drawn apart see far behind it, 8×) */
export const viewOf = (key: string, k = 3): View => { const F = footOf(key); const size = Math.max(F.w, F.d) * k; return { x0: F.x + F.w / 2 - size / 2, z0: F.y + F.d / 2 - size / 2, size }; };
export function useAerial(key?: string, k = 3): string | null {
  const [href, setHref] = useState<string | null>(null);
  useEffect(() => { let live = true;
    if (typeof document === 'undefined') return undefined;
    // a data: URL, not a blob: one: the demonstration's content policy admits images from itself and data: only
    const id = key ? `${key}×${k}` : '*'; let job = aerial.get(id);
    if (!job) { job = paintAsync('imagery', BUILDINGS, undefined, 8, key ? viewOf(key, k) : undefined).then((c) => c.toDataURL('image/jpeg', 0.86)); aerial.set(id, job); }
    job.then((h) => { if (live) setHref(h); }).catch(() => { aerial.delete(id); });
    return () => { live = false; };
  }, [key, k]);
  return href;
}
/** only the campus's own buildings stand in the imagery; a regional site's views keep the stage's plain grass */
const onCampus = (key: string) => BUILDINGS.some((b) => b.key === key);
/** the estate's footprint of a building, in its metres */
const footOf = (key: string) => { const b = buildingByKey(key)!; return { x: b.map.x * U, y: b.map.y * U, w: b.map.w * U, d: b.map.d * U }; };
/** the aerial ground under a building's plan: the imagery scaled so the building's footprint lies under the plan, centred on it */
const groundUnder = (key: string, W: number, D: number, mult = 3) => { const F = footOf(key); const k = (W / F.w + D / F.d) / 2; const v = viewOf(key, mult);
  return { x: W / 2 + (v.x0 - (F.x + F.w / 2)) * k, y: D / 2 + (v.z0 - (F.y + F.d / 2)) * k, w: v.size * k, d: v.size * k }; };
const toneOf = (id: string) => { const r = roomRecord(id); return r ? bandOf(readiness(r)) : 'none'; };
const spaceHref = (id: string) => (id === 'SP-ATL-COMMONS' ? '#/lite/commons' : `#/lite/space/${id}`);
/** where a visitor is (V2.5.3 herePlace's default): the Atlas lobby on floor 1 */
export const HERE = { bKey: 'ATL', fN: 1 };

/** The floors drawn apart: each plate one floor at scale, its rooms and spaces on it; tap a plate to open the floor. */
export function buildingScene(cam: Cam, bKey: string): L3Scene {
  const B = buildingByKey(bKey)!; const n = B.floors; const plans = Array.from({ length: n }, (_, i) => floorPlan(bKey, i + 1));
  const W = Math.max(...plans.map((p) => p.W)), D = Math.max(...plans.map((p) => p.D)); const G = n > 4 ? 6.2 : 7.4;
  const sc = scene(W / 2, D / 2, Math.hypot(W, D) / 2, (n - 1) * G + 2.5); const lk = lookOf(bKey), glass = hexRgb(lk.glass);
  poly(sc, 0, [[0.8, 1.2, -0.42], [W + 2.4, 1.2, -0.42], [W + 2.4, D + 2.8, -0.42], [0.8, D + 2.8, -0.42]], { f: 'rgba(0,0,0,.26)', s: 'none', pri: -3 });
  plans.forEach((P, i) => {
    const f = i + 1, z = i * G, to = `#/lite/b/${bKey}/${f}`, here = HERE.bKey === bKey && HERE.fN === f;
    // the slab: its edge is the building's glass, its top the floor (as the Empathia Map draws a storey)
    box(sc, cam, { x: W / 2, y: D / 2, z: z - 0.35, w: W, d: D, h: 0.35 }, glass, { pri: -2, L: 2, top: 'url(#l3slabE)', stroke: here ? 'var(--l3-teal)' : 'rgba(40,52,70,.55)', sw: here ? 1.6 : 0.7, nav: to });
    poly(sc, 3, [[P.corridor.x, P.corridor.y, z + 0.01], [W - 0.3, P.corridor.y, z + 0.01], [W - 0.3, P.corridor.y + P.corridor.d, z + 0.01], [P.corridor.x, P.corridor.y + P.corridor.d, z + 0.01]], { pri: -1, f: 'rgba(120,110,96,.16)', s: 'none', nav: to });
    box(sc, cam, { x: P.core.x + P.core.w / 2, y: D / 2, z, w: P.core.w, d: D - 0.6, h: 1.8 }, CORE_RGB, { stroke: 'rgba(70,74,80,.5)', nav: to });
    for (const it of P.items) {
      const tone = it.type === 'room' ? toneOf(it.id) : 'none';
      box(sc, cam, { x: it.x + it.w / 2, y: it.y + it.d / 2, z, w: it.w, d: it.d, h: it.type === 'closet' ? 1.05 : 1.55 }, it.type === 'space' ? SPACE_RGB : it.type === 'closet' ? CLOSET_RGB : BAND_RGB[tone]!, { stroke: it.type === 'space' ? 'rgba(20,110,100,.8)' : it.type === 'room' ? BAND_EDGE[tone] : 'rgba(70,80,86,.6)', sw: 0.6, nav: to });
    }
    const names = P.items.filter((x) => x.type === 'space').map((x) => x.label), rooms = P.items.filter((x) => x.type === 'room').length;
    label(sc, [0, D, z + 0.4], `Floor ${f}`, { anchor: 'start', big: true, on: here, sub: here ? 'you are here' : names.length ? names.slice(0, 2).join(', ') : `${rooms} room${rooms === 1 ? '' : 's'}`, nav: to, testId: `l3-floor-label-${f}` });
    hit(sc, [W / 2, D / 2, z + 1], { nav: to, r: 22, label: `Floor ${f}: ${rooms} room${rooms === 1 ? '' : 's'}${names.length ? `, ${names.join(', ')}` : ''}. Opens the floor.`, testId: `l3-floor-${f}` });
  });
  return sc;
}

/** One floor in 3D: slab, corridor, core with lifts and stairs, rooms and spaces with low walls and an open door side, labels, and a hit
 *  on each room that opens it. */
export function floorScene(cam: Cam, bKey: string, fN: number, mark?: string | null): L3Scene {
  const P = floorPlan(bKey, fN); const sc = scene(P.W / 2, P.D / 2, Math.hypot(P.W, P.D) / 2, 1.6); const glass = hexRgb(lookOf(bKey).glass);
  poly(sc, 0, [[0.5, 0.7, -0.02], [P.W + 1.1, 0.7, -0.02], [P.W + 1.1, P.D + 1.3, -0.02], [0.5, P.D + 1.3, -0.02]], { f: 'rgba(0,0,0,.24)', s: 'none' });
  poly(sc, 0, [[0, 0, 0], [P.W, 0, 0], [P.W, P.D, 0], [0, P.D, 0]], { f: 'url(#l3slabE)', s: 'rgba(40,52,70,.6)', sw: 0.9 });
  const c = P.corridor;
  poly(sc, 0, [[c.x, c.y, 0.01], [c.x + c.w, c.y, 0.01], [c.x + c.w, c.y + c.d, 0.01], [c.x, c.y + c.d, 0.01]], { f: 'rgba(120,110,96,.14)', s: 'none' });
  line(sc, 0, [[c.x + 0.4, P.midY, 0.012], [c.x + c.w - 0.4, P.midY, 0.012]], { s: 'rgba(80,70,60,.32)', sw: 0.8, da: '5 5' });
  // the building's glass round the floor, low and half-clear so the rooms read through it (the Empathia Map's facade)
  for (const [x, y, w, d] of [[P.W / 2, 0.08, P.W, 0.16], [P.W / 2, P.D - 0.08, P.W, 0.16], [0.08, P.D / 2, 0.16, P.D], [P.W - 0.08, P.D / 2, 0.16, P.D]] as const)
    box(sc, cam, { x, y, w, d, h: 1.15 }, glass, { L: 2, a: 0.55, stroke: 'rgba(40,52,70,.45)', sw: 0.5 });
  box(sc, cam, { x: P.core.x + P.core.w / 2, y: P.core.y + P.core.d / 2, w: P.core.w, d: P.core.d, h: 0.5 }, CORE_RGB, { L: 2, stroke: 'rgba(70,74,80,.45)' });
  box(sc, cam, { x: P.liftBox.x + P.liftBox.w / 2, y: P.liftBox.y + P.liftBox.d / 2, z: 0.5, w: P.liftBox.w, d: P.liftBox.d, h: 1.6 }, LIFT_RGB, { stroke: 'rgba(50,60,76,.5)' });
  box(sc, cam, { x: P.stairBox.x + P.stairBox.w / 2, y: P.stairBox.y + P.stairBox.d / 2, z: 0.5, w: P.stairBox.w, d: P.stairBox.d, h: 1 }, STAIR_RGB, { stroke: 'rgba(60,64,70,.5)' });
  label(sc, [P.liftBox.x + P.liftBox.w / 2, P.liftBox.y + P.liftBox.d / 2, 2.2], 'Lifts', { cls: 'soft', lift: 6 });
  label(sc, [P.stairBox.x + P.stairBox.w / 2, P.stairBox.y + P.stairBox.d / 2, 1.6], 'Stairs', { cls: 'soft', lift: 6 });
  if (P.entrance) label(sc, [P.entrance[0], P.entrance[1] + 0.6, 0.1], 'Way in', { cls: 'soft', tone: 'here' });
  for (const it of P.items) {
    const x = it.x + it.w / 2, y = it.y + it.d / 2;
    if (it.type === 'closet') { box(sc, cam, { x, y, w: it.w, d: it.d, h: 0.9 }, CLOSET_RGB, { stroke: 'rgba(20,110,100,.7)', dash: '3 2' }); continue; }
    const to = it.type === 'room' ? liteRoomHref(it.id) : spaceHref(it.id); const tone = it.type === 'room' ? toneOf(it.id) : 'none'; const on = mark === it.id;
    const fill = it.type === 'space' ? 'rgba(70,186,172,.34)' : it.type === 'room' ? BAND_FLOOR[tone]! : 'rgba(150,156,164,.26)';
    const edge = on ? 'var(--l3-teal)' : it.type === 'space' ? 'rgba(20,110,100,.8)' : BAND_EDGE[tone]!;
    poly(sc, 1, [[it.x, it.y, 0.02], [it.x + it.w, it.y, 0.02], [it.x + it.w, it.y + it.d, 0.02], [it.x, it.y + it.d, 0.02]], { f: fill, s: edge, sw: on ? 1.8 : 1, nav: to });
    // low walls on the three sides away from the corridor; the corridor side is the open door side
    const wh = on ? 1.3 : 0.95, wt = 0.18, col: RGB = it.type === 'space' ? [150, 210, 200] : PARTITION;
    const far = it.side === 'N' ? it.y : it.y + it.d;
    box(sc, cam, { x, y: far + (it.side === 'N' ? wt / 2 : -wt / 2), w: it.w, d: wt, h: wh }, col, { nav: to });
    box(sc, cam, { x: it.x + wt / 2, y, w: wt, d: it.d, h: wh }, col, { nav: to });
    box(sc, cam, { x: it.x + it.w - wt / 2, y, w: wt, d: it.d, h: wh }, col, { nav: to });
    const name = it.type === 'room' ? roomRecord(it.id)?.outline.name : it.label;
    label(sc, [x, y, wh + 0.1], it.label, { sub: it.type === 'room' && name ? (name.length > 16 ? `${name.slice(0, 15)}…` : name) : undefined, tone: it.type === 'room' ? tone : 'space', on, nav: to, testId: `l3-item-${it.id}` });
    hit(sc, [x, y, 0.5], { nav: to, r: 16, label: `${it.type === 'room' ? `Room ${it.label}${name ? `, ${name}` : ''}` : it.label}. Opens it.`, testId: `l3-open-${it.id}` });
  }
  return sc;
}

/** The building's exploded floors, with the camera and controls. */
export function BuildingStage({ bKey, onNav }: { bKey: string; onNav: (to: string) => void }) {
  const c = useCam({ yaw: -34, pitch: 20, zoom: 1 }); const B = buildingByKey(bKey)!; const href = useAerial(onCampus(bKey) ? bKey : undefined, 8);
  const sc = useMemo(() => buildingScene(c.cam, bKey), [c.cam, bKey]);
  const ground = useMemo(() => { if (!onCampus(bKey)) return undefined; if (!href) return null; const plans = Array.from({ length: B.floors }, (_, i) => floorPlan(bKey, i + 1)); return { href, ...groundUnder(bKey, Math.max(...plans.map((p) => p.W)), Math.max(...plans.map((p) => p.D)), 8) }; }, [href, bKey, B.floors]);
  return <L3View sc={sc} c={c} label={`The floors of ${B.name}, drawn apart. Each floor is a button.`} onNav={onNav} testId="lite-building-3d" tall S={14} look="estate" tidy ground={ground} credit={`Empathia Lite · ${B.name}, its floors drawn apart · synthetic · floor layouts modeled`} />;
}
/** One floor in 3D, with the camera and controls. */
export function FloorStage({ bKey, fN, onNav, mark }: { bKey: string; fN: number; onNav: (to: string) => void; mark?: string | null }) {
  const c = useCam({ yaw: -30, pitch: 50, zoom: 1 }); const B = buildingByKey(bKey)!; const href = useAerial(onCampus(bKey) ? bKey : undefined);
  const sc = useMemo(() => floorScene(c.cam, bKey, fN, mark), [c.cam, bKey, fN, mark]);
  const ground = useMemo(() => { if (!onCampus(bKey)) return undefined; if (!href) return null; const P = floorPlan(bKey, fN); return { href, ...groundUnder(bKey, P.W, P.D) }; }, [href, bKey, fN]);
  return <L3View sc={sc} c={c} label={`Floor ${fN} of ${B.name} in 3D. Each room is a button.`} onNav={onNav} testId="lite-floor-3d" tall S={22} look="estate" tidy ground={ground} credit={`Empathia Lite · ${B.name} floor ${fN} · synthetic · the layout is modeled from each room’s size, not surveyed`} />;
}

// ------------------------------------------------------------------------------------------------ the campus (V2.5.3 liteCampusScene)
// In the estate map's own metres (map/imagery.ts: 1 V2.5.3 map unit = 40 m, 4.2 m a storey), so the buildings stand exactly on their
// footprints in the aerial imagery under them, at the heights the start page's campus gives them.
const K = U;
const GATE: Record<string, 'N' | 'S' | 'E' | 'W'> = { ATL: 'S', MER: 'E', FRG: 'N', BCN: 'S', HZN: 'W' };
const entrance = (m: { x: number; y: number; w: number; d: number }, key: string): [number, number] => { const g = GATE[key] || 'S'; return g === 'S' ? [m.x + m.w / 2, m.y + m.d + 0.1] : g === 'N' ? [m.x + m.w / 2, m.y - 0.1] : g === 'E' ? [m.x + m.w + 0.1, m.y + m.d / 2] : [m.x - 0.1, m.y + m.d / 2]; };

/** The campus: the aerial ground (drawn under the scene by the stage, see useAerial), and on it each building as the estate map draws it —
 *  its glass, a slab band at every storey, its roof and plant — with its entrance ring and label. The lens changes what is drawn on it,
 *  as in V2.5.3: the visitor's way in from the car park, or the links to the campus core. */
export function campusScene(cam: Cam, buildings: ReadonlyArray<{ key: string; name: string; short: string; purpose: string; floors: number; map: { x: number; y: number; w: number; d: number } }>,
  opts: { lens?: string | null; tone?: (key: string) => string; plaza: readonly [number, number]; visitorPath: ReadonlyArray<readonly [number, number]> }) {
  const sc = scene(4.55 * K, 4.3 * K, 4.15 * K, 7 * STOREY + 2); /* framed inside the ring road, as the start page frames the campus */ const P2 = (p: readonly [number, number]): [number, number] => [p[0] * K, p[1] * K];
  const tech = opts.lens === 'engineer' || opts.lens === 'optimize' || opts.lens === 'exec';
  for (const b of buildings) {
    const m = b.map, x = (m.x + m.w / 2) * K, y = (m.y + m.d / 2) * K, w = m.w * K, d = m.d * K, h = b.floors * STOREY + 1, to = `#/lite/b/${b.key}`, here = b.key === HERE.bKey;
    const lk = lookOf(b.key), glass = hexRgb(lk.glass), slab = hexRgb(lk.slab), roof = hexRgb(lk.roof);
    box(sc, cam, { x, y, w, d, h }, glass, { nav: to, stroke: 'rgba(30,40,54,.55)', top: rgb(roof) });
    // a slab band at every storey on the faces towards the camera: the Empathia Map's glass-and-slab facade
    const cs: [number, number][] = [[x - w / 2, y - d / 2], [x + w / 2, y - d / 2], [x + w / 2, y + d / 2], [x - w / 2, y + d / 2]]; const N: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const vx = Math.sin(cam.yaw * Math.PI / 180), vy = Math.cos(cam.yaw * Math.PI / 180);
    if (cam.pitch < 88) for (let i = 0; i < 4; i++) { const n = N[i]!; const facing = n[0] * vx + n[1] * vy; if (facing <= 0.02) continue; const a = cs[i]!, c2 = cs[(i + 1) % 4]!; const k = 0.72 + 0.28 * facing;
      for (let f = 0; f <= b.floors; f++) { const z0 = f === b.floors ? h - 1 : f * STOREY, z1 = f === b.floors ? h : z0 + 0.9;
        poly(sc, 3, [[a[0], a[1], z0], [c2[0], c2[1], z0], [c2[0], c2[1], z1], [a[0], a[1], z1]], { c: [x, y, h / 2], sub: 0.5, f: rgb(slab, k), s: 'none', nav: to }); } }
    poly(sc, 3, [[x - w * 0.44, y - d * 0.43, h + 0.02], [x + w * 0.44, y - d * 0.43, h + 0.02], [x + w * 0.44, y + d * 0.43, h + 0.02], [x - w * 0.44, y + d * 0.43, h + 0.02]], { c: [x, y, h / 2], sub: 2, f: rgb(roof, 1.1), s: 'rgba(40,40,40,.22)', sw: 0.6, nav: to });
    box(sc, cam, { x: x + w * 0.18, y: y - d * 0.14, z: h, w: w * 0.2, d: d * 0.18, h: 2.4 }, [150, 153, 156], { nav: to, stroke: 'rgba(60,62,66,.4)' });
    box(sc, cam, { x: x - w * 0.2, y: y + d * 0.16, z: h, w: w * 0.12, d: d * 0.12, h: 1.6 }, [132, 135, 138], { nav: to, stroke: 'rgba(60,62,66,.4)' });
    const g = P2(entrance(m, b.key)); poly(sc, 1, Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return [g[0] + Math.cos(a) * 5, g[1] + Math.sin(a) * 5, 0.1] as [number, number, number]; }), { f: 'rgba(47,179,163,.55)', s: 'var(--l3-teal)', sw: 1 });
    label(sc, [x, y, h + 2], b.short, { lift: 18, big: true, tone: tech && opts.tone ? opts.tone(b.key) : undefined, on: here && !tech, sub: here ? 'you are here' : opts.lens === 'visitor' && b.key === 'ATL' ? 'main entrance' : '', nav: to, testId: `l3-bld-label-${b.key}` });
    hit(sc, [x, y, h], { nav: to, r: 24, label: `${b.name}. ${b.purpose}. Opens the building.`, testId: `lite-bld-${b.key}` });
  }
  if (opts.lens === 'visitor') { line(sc, 6, opts.visitorPath.map((p) => [p[0] * K, p[1] * K, 0.4] as [number, number, number]), { s: 'var(--l3-teal)', sw: 3, cls: 'l3-route' }); const s0 = P2(opts.visitorPath[0]!); label(sc, [s0[0] - 8, s0[1] + 4, 0.4], 'Visitor parking', { lift: 12, tone: 'here' }); }
  if (opts.lens === 'engineer') { const at = buildings.find((b) => b.key === 'ATL'); if (at) { const c0: [number, number, number] = [(at.map.x + at.map.w / 2) * K, (at.map.y + at.map.d / 2) * K, at.floors * STOREY + 3];
    for (const b of buildings) if (b.key !== 'ATL') line(sc, 6, [[(b.map.x + b.map.w / 2) * K, (b.map.y + b.map.d / 2) * K, b.floors * STOREY + 3], c0], { s: 'var(--l3-teal)', sw: 1.4, da: '4 5' });
    label(sc, c0, 'Campus core', { lift: 84, tone: 'here' }); } }
  return sc;
}
/** The campus. Where the browser draws WebGL2 it is the start page's own campus, the Empathia Map (founder, 19 Nov 2026 12:37 and 14:03:
 *  "polish it … like the campus view on the start page"), in Lite's mode: a building opens Lite's building at once, Lite's lens draws on it
 *  (the visitor's way in, the links to the campus core), and the pins carry the same health and issues as the start page. Without WebGL2
 *  it is the scene above, on the same aerial imagery. */
export function CampusStage(p: { buildings: Parameters<typeof campusScene>[1]; onNav: (to: string) => void; lens?: string | null; tone?: (k: string) => string; plaza: readonly [number, number]; visitorPath: ReadonlyArray<readonly [number, number]> }) {
  const [gl] = useState(() => { try { return typeof document !== 'undefined' && !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } });
  const tiles = useMemo(() => { let w = null; try { w = loadWs(); } catch { /* none */ } return Object.fromEntries(campusStats(w).buildings.map((s) => [s.b.key, { score: s.score, band: s.band, issues: s.open, rooms: s.rooms }])); }, []);
  const overlay = useMemo<MapOverlay | null>(() => {
    // the visitor's way in, on the map's own ground (map/imagery.ts layout): from the south car park up the entrance boulevard to the ring
    // road, along it to the first clear gap south of Atlas, and up that gap across the lawn to Atlas's south door. The gap is measured: no
    // footprint lies on it, so the line never crosses a building.
    if (p.lens === 'visitor') { const L = layoutOf(BUILDINGS); const lot = L.lots[0]!, ring = L.ring, atl = L.foot['ATL']!, cx = ring.x + ring.w / 2, y = 0.8; const lz = lot.z + lot.d / 2;
      const south = ring.z + ring.d - ring.lane / 2 - 2, door = atl.z + atl.d;
      const clear = (x: number) => Object.values(L.foot).every((f) => !(x > f.x - 6 && x < f.x + f.w + 6 && f.z + f.d > door && f.z < south));
      const xs = Object.values(L.foot).flatMap((f) => [f.x - 10, f.x + f.w + 10]).concat([atl.x + atl.w / 2]).filter((x) => x > atl.x - 40 && x < atl.x + atl.w + 40 && clear(x));
      const gx = xs.sort((a2, b2) => Math.abs(a2 - (atl.x + atl.w / 2)) - Math.abs(b2 - (atl.x + atl.w / 2)))[0] ?? atl.x + atl.w / 2;
      const pts: Array<[number, number, number]> = [[lot.x + lot.w * 0.8, y, lz], [cx - 5, y, lz], [cx - 5, y, south], [gx, y, south], [gx, y, door + 8], [atl.x + atl.w / 2, y, door + 8], [atl.x + atl.w / 2, y, door]];
      return { lines: [{ pts, route: true }], labels: [{ at: [gx, 3, south], text: 'From the visitor car park', testId: 'lite-ov-parking' }] }; }
    if (p.lens === 'engineer') { const at = p.buildings.find((b) => b.key === 'ATL'); if (!at) return null; const top = (b: (typeof p.buildings)[number]) => [(b.map.x + b.map.w / 2) * U, b.floors * STOREY + 3, (b.map.y + b.map.d / 2) * U] as [number, number, number];
      return { lines: p.buildings.filter((b) => b.key !== 'ATL').map((b) => ({ pts: [top(b), top(at)], dash: true })), labels: [] }; }
    return null; }, [p.lens, p.visitorPath, p.buildings]);
  if (gl) return <CampusMap tiles={tiles} testId="lite-campus-3d" direct bare pinTest={(k) => `lite-bld-${k}`} pinSub={(k) => (k === HERE.bKey ? (p.lens === 'engineer' ? 'campus core' : 'you are here') : undefined)} overlay={overlay}
    onOpen={(b) => p.onNav(`#/lite/b/${b.key}`)} onRoom={(id) => p.onNav(liteRoomHref(id))} />;
  // without WebGL2 the drawn map colors each building from the same campusStats(workspace) bands as the pins (re-review of c7bcc0aa, LT-open-02)
  return <CampusScene {...p} tone={p.tone ? (k) => tiles[k]?.band ?? 'none' : undefined} />;
}
function CampusScene({ buildings, onNav, lens, tone, plaza, visitorPath }: Parameters<typeof CampusStage>[0]) {
  const c = useCam({ yaw: -37, pitch: 42, zoom: 1 }); const href = useAerial();
  const sc = useMemo(() => campusScene(c.cam, buildings, { lens, tone, plaza, visitorPath }), [c.cam, buildings, lens, tone, plaza, visitorPath]);
  const ground = useMemo(() => (href ? { href, x: GROUND.x0, y: GROUND.z0, w: GROUND.size, d: GROUND.size, wood: true } : null), [href]);
  return <L3View sc={sc} c={c} label={`The campus in 3D: ${buildings.length} buildings. Each building is a button.`} onNav={onNav} testId="lite-campus-3d" S={1.1} look="estate" tidy ground={ground} credit="Empathia Lite · synthetic aerial imagery of a fictional campus · heights and floor layouts modeled" />;
}
