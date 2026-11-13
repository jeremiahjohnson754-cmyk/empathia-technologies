/**
 * A building's floors drawn apart, and one floor in 3D (V2.5.3 liteBuildingScene, liteFloorScene and floorPlan, ported to L3). The floor
 * plan is V2.5.3's own rule: the floor's rooms in number order, the first half along the north side of a corridor and the rest along the
 * south, Atlas's workplace spaces placed into the shorter side, a network closet at the end of the north row, a core with lifts and stairs
 * at the west end. Sizes are each room's modelled dimensions from its record; the arrangement is illustrative, not a surveyed plan.
 */
import { useMemo } from 'react';
import { roomRecord } from '../campus/design.js';
import { buildingByKey } from '../campus/canon.js';
import { bandOf } from '../campus/metrics.js';
import { SPACES } from './data/v253.js';
import { roomsOf, readiness, liteRoomHref } from './model.js';
import { scene, poly, line, label, hit, box, disc, rgb, useCam, L3View, type Cam, type RGB, type L3Scene } from './l3.js';

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
const BAND_RGB: Record<string, RGB> = { healthy: [70, 104, 88], monitor: [118, 100, 64], action: [116, 70, 64], none: [92, 90, 84] };
const BAND_EDGE: Record<string, string> = { healthy: 'rgba(110,231,183,.75)', monitor: 'rgba(251,191,36,.8)', action: 'rgba(248,113,113,.85)', none: 'rgba(255,246,232,.24)' };
const toneOf = (id: string) => { const r = roomRecord(id); return r ? bandOf(readiness(r)) : 'none'; };
const spaceHref = (id: string) => (id === 'SP-ATL-COMMONS' ? '#/lite/commons' : `#/lite/space/${id}`);
/** where a visitor is (V2.5.3 herePlace's default): the Atlas lobby on floor 1 */
export const HERE = { bKey: 'ATL', fN: 1 };

/** The floors drawn apart: each plate one floor at scale, its rooms and spaces on it; tap a plate to open the floor. */
export function buildingScene(cam: Cam, bKey: string): L3Scene {
  const B = buildingByKey(bKey)!; const n = B.floors; const plans = Array.from({ length: n }, (_, i) => floorPlan(bKey, i + 1));
  const W = Math.max(...plans.map((p) => p.W)), D = Math.max(...plans.map((p) => p.D)); const G = n > 4 ? 6.2 : 7.4;
  const sc = scene(W / 2, D / 2, Math.hypot(W, D) / 2, (n - 1) * G + 2.5);
  poly(sc, 0, [[-1.5, -1.5, -0.4], [W + 1.5, -1.5, -0.4], [W + 1.5, D + 1.5, -0.4], [-1.5, D + 1.5, -0.4]], { f: 'rgba(0,0,0,.34)', s: 'none' });
  plans.forEach((P, i) => {
    const f = i + 1, z = i * G, to = `#/lite/b/${bKey}/${f}`, here = HERE.bKey === bKey && HERE.fN === f;
    box(sc, cam, { x: W / 2, y: D / 2, z: z - 0.35, w: W, d: D, h: 0.35 }, [70, 67, 60], { pri: -2, L: 2, top: 'url(#l3slab)', stroke: here ? 'var(--l3-teal)' : 'rgba(255,246,232,.26)', sw: here ? 1.5 : 0.7, nav: to });
    poly(sc, 3, [[P.corridor.x, P.corridor.y, z + 0.01], [W - 0.3, P.corridor.y, z + 0.01], [W - 0.3, P.corridor.y + P.corridor.d, z + 0.01], [P.corridor.x, P.corridor.y + P.corridor.d, z + 0.01]], { pri: -1, f: 'rgba(255,246,232,.07)', s: 'none', nav: to });
    box(sc, cam, { x: P.core.x + P.core.w / 2, y: D / 2, z, w: P.core.w, d: D - 0.6, h: 1.8 }, [84, 88, 96], { nav: to });
    for (const it of P.items) {
      const tone = it.type === 'room' ? toneOf(it.id) : 'none';
      box(sc, cam, { x: it.x + it.w / 2, y: it.y + it.d / 2, z, w: it.w, d: it.d, h: it.type === 'closet' ? 1.05 : 1.55 }, it.type === 'space' ? [52, 96, 90] : it.type === 'closet' ? [48, 66, 70] : BAND_RGB[tone]!, { stroke: it.type === 'space' ? 'rgba(69,207,193,.6)' : it.type === 'room' ? BAND_EDGE[tone] : 'rgba(255,246,232,.22)', sw: 0.6, nav: to });
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
  const P = floorPlan(bKey, fN); const sc = scene(P.W / 2, P.D / 2, Math.hypot(P.W, P.D) / 2, 1.6);
  poly(sc, 0, [[-0.6, -0.6, -0.02], [P.W + 0.6, -0.6, -0.02], [P.W + 0.6, P.D + 0.6, -0.02], [-0.6, P.D + 0.6, -0.02]], { f: 'rgba(0,0,0,.32)', s: 'none' });
  poly(sc, 0, [[0, 0, 0], [P.W, 0, 0], [P.W, P.D, 0], [0, P.D, 0]], { f: 'url(#l3slab)', s: 'rgba(255,246,232,.24)' });
  const c = P.corridor;
  poly(sc, 0, [[c.x, c.y, 0.01], [c.x + c.w, c.y, 0.01], [c.x + c.w, c.y + c.d, 0.01], [c.x, c.y + c.d, 0.01]], { f: 'rgba(255,246,232,.09)', s: 'none' });
  line(sc, 0, [[c.x + 0.4, P.midY, 0.012], [c.x + c.w - 0.4, P.midY, 0.012]], { s: 'rgba(255,246,232,.18)', sw: 0.8, da: '5 5' });
  box(sc, cam, { x: P.core.x + P.core.w / 2, y: P.core.y + P.core.d / 2, w: P.core.w, d: P.core.d, h: 0.5 }, [74, 78, 86], { L: 2 });
  box(sc, cam, { x: P.liftBox.x + P.liftBox.w / 2, y: P.liftBox.y + P.liftBox.d / 2, z: 0.5, w: P.liftBox.w, d: P.liftBox.d, h: 1.6 }, [96, 110, 132], {});
  box(sc, cam, { x: P.stairBox.x + P.stairBox.w / 2, y: P.stairBox.y + P.stairBox.d / 2, z: 0.5, w: P.stairBox.w, d: P.stairBox.d, h: 1 }, [70, 72, 78], {});
  label(sc, [P.liftBox.x + P.liftBox.w / 2, P.liftBox.y + P.liftBox.d / 2, 2.2], 'Lifts', { cls: 'soft', lift: 6 });
  label(sc, [P.stairBox.x + P.stairBox.w / 2, P.stairBox.y + P.stairBox.d / 2, 1.6], 'Stairs', { cls: 'soft', lift: 6 });
  if (P.entrance) label(sc, [P.entrance[0], P.entrance[1] + 0.6, 0.1], 'Way in', { cls: 'soft', tone: 'here' });
  for (const it of P.items) {
    const x = it.x + it.w / 2, y = it.y + it.d / 2;
    if (it.type === 'closet') { box(sc, cam, { x, y, w: it.w, d: it.d, h: 0.9 }, [48, 66, 70], { stroke: 'rgba(69,207,193,.5)', dash: '3 2' }); continue; }
    const to = it.type === 'room' ? liteRoomHref(it.id) : spaceHref(it.id); const tone = it.type === 'room' ? toneOf(it.id) : 'none'; const on = mark === it.id;
    const fill = it.type === 'space' ? 'rgba(46,92,86,.95)' : it.type === 'room' ? (tone === 'action' ? 'url(#l3hatch)' : 'rgba(62,60,54,.95)') : 'rgba(62,60,54,.95)';
    const edge = on ? 'var(--l3-teal)' : it.type === 'space' ? 'rgba(69,207,193,.6)' : BAND_EDGE[tone]!;
    poly(sc, 1, [[it.x, it.y, 0.02], [it.x + it.w, it.y, 0.02], [it.x + it.w, it.y + it.d, 0.02], [it.x, it.y + it.d, 0.02]], { f: fill, s: edge, sw: on ? 1.6 : 0.9, nav: to });
    // low walls on the three sides away from the corridor; the corridor side is the open door side
    const wh = on ? 1.3 : 0.95, wt = 0.18, col: RGB = it.type === 'space' ? [60, 110, 104] : [96, 92, 84];
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
  const c = useCam({ yaw: -34, pitch: 20, zoom: 1 }); const B = buildingByKey(bKey)!;
  const sc = useMemo(() => buildingScene(c.cam, bKey), [c.cam, bKey]);
  return <L3View sc={sc} c={c} label={`The floors of ${B.name}, drawn apart. Each floor is a button.`} onNav={onNav} testId="lite-building-3d" tall S={14} />;
}
/** One floor in 3D, with the camera and controls. */
export function FloorStage({ bKey, fN, onNav, mark }: { bKey: string; fN: number; onNav: (to: string) => void; mark?: string | null }) {
  const c = useCam({ yaw: -30, pitch: 50, zoom: 1 }); const B = buildingByKey(bKey)!;
  const sc = useMemo(() => floorScene(c.cam, bKey, fN, mark), [c.cam, bKey, fN, mark]);
  return <L3View sc={sc} c={c} label={`Floor ${fN} of ${B.name} in 3D. Each room is a button.`} onNav={onNav} testId="lite-floor-3d" tall S={22} />;
}

// ------------------------------------------------------------------------------------------------ the campus (V2.5.3 liteCampusScene)
const K = 17;   // V2.5.3 CAMPUS_M: metres per campus-map unit
const COL = { lawn: [30, 44, 36] as RGB, path: [56, 54, 49] as RGB, bld: [62, 60, 54] as RGB, roof: [74, 71, 64] as RGB, green: [48, 92, 66] as RGB };
const GATE: Record<string, 'N' | 'S' | 'E' | 'W'> = { ATL: 'S', MER: 'E', FRG: 'N', BCN: 'S', HZN: 'W' };
const hashStr = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const strip = (a: readonly [number, number], b: readonly [number, number], w: number): [number, number, number][] => { const g = Math.atan2(b[1] - a[1], b[0] - a[0]), nx = -Math.sin(g) * w / 2, ny = Math.cos(g) * w / 2; return [[a[0] + nx, a[1] + ny, 0.05], [b[0] + nx, b[1] + ny, 0.05], [b[0] - nx, b[1] - ny, 0.05], [a[0] - nx, a[1] - ny, 0.05]]; };
const entrance = (m: { x: number; y: number; w: number; d: number }, key: string): [number, number] => { const g = GATE[key] || 'S'; return g === 'S' ? [m.x + m.w / 2, m.y + m.d + 0.1] : g === 'N' ? [m.x + m.w / 2, m.y - 0.1] : g === 'E' ? [m.x + m.w + 0.1, m.y + m.d / 2] : [m.x - 0.1, m.y + m.d / 2]; };

/** The campus: ground and a faint grid, lawns, the plaza and the paths to each entrance, visitor parking, trees, and each building with
 *  its lit windows floor by floor, roof and plant, entrance ring and label. The lens changes what is drawn on it, as in V2.5.3. */
export function campusScene(cam: Cam, buildings: ReadonlyArray<{ key: string; name: string; short: string; purpose: string; floors: number; map: { x: number; y: number; w: number; d: number } }>,
  opts: { lens?: string | null; tone?: (key: string) => string; plaza: readonly [number, number]; visitorPath: ReadonlyArray<readonly [number, number]> }) {
  const sc = scene(4.75 * K, 4.2 * K, 5.5 * K, 22); const P2 = (p: readonly [number, number]): [number, number] => [p[0] * K, p[1] * K];
  poly(sc, 0, [[-1 * K, -1.2 * K, 0], [10.4 * K, -1.2 * K, 0], [10.4 * K, 9.4 * K, 0], [-1 * K, 9.4 * K, 0]], { f: '#15171a', s: 'rgba(255,246,232,.07)' });
  for (let i = 0; i <= 11; i++) line(sc, 0, [[(i - 1) * K, -1.2 * K, 0], [(i - 1) * K, 9.4 * K, 0]], { s: 'rgba(255,246,232,.03)', sw: 0.6 });
  for (let i = 0; i <= 10; i++) line(sc, 0, [[-1 * K, (i - 1) * K, 0], [10.4 * K, (i - 1) * K, 0]], { s: 'rgba(255,246,232,.03)', sw: 0.6 });
  for (const [x0, y0, x1, y1] of [[0, 0.2, 4.2, 2.3], [6.8, 0.2, 9.8, 2.3], [0, 6.5, 3.1, 8.9], [6.9, 5.2, 9.9, 8.9], [5.2, 2.3, 6.6, 4.7]] as const)
    poly(sc, 0, [[x0 * K, y0 * K, 0.02], [x1 * K, y0 * K, 0.02], [x1 * K, y1 * K, 0.02], [x0 * K, y1 * K, 0.02]], { f: rgb(COL.lawn, 0.9), s: 'none' });
  const pz = P2(opts.plaza);
  poly(sc, 0, Array.from({ length: 22 }, (_, i) => { const a = (i / 22) * Math.PI * 2; return [pz[0] + Math.cos(a) * 0.42 * K, pz[1] + Math.sin(a) * 0.42 * K, 0.04] as [number, number, number]; }), { f: rgb(COL.path, 1.1), s: 'rgba(255,246,232,.14)' });
  for (const b of buildings) poly(sc, 0, strip(P2(entrance(b.map, b.key)), pz, 0.13 * K), { f: rgb(COL.path), s: 'none' });
  for (let i = 1; i < opts.visitorPath.length; i++) poly(sc, 0, strip(P2(opts.visitorPath[i - 1]!), P2(opts.visitorPath[i]!), 0.11 * K), { f: rgb(COL.path), s: 'none' });
  poly(sc, 0, [[0.5 * K, 7 * K, 0.03], [2.3 * K, 7 * K, 0.03], [2.3 * K, 8.5 * K, 0.03], [0.5 * K, 8.5 * K, 0.03]], { f: '#1f2124', s: 'rgba(255,246,232,.16)' });
  for (let i = 1; i < 7; i++) line(sc, 0, [[(0.5 + i * 0.257) * K, 7.1 * K, 0.04], [(0.5 + i * 0.257) * K, 7.6 * K, 0.04]], { s: 'rgba(255,246,232,.2)', sw: 0.7 });
  for (const [tx, ty] of [[1, 1], [2.3, 0.7], [3.4, 1.5], [7.4, 1], [8.8, 1.4], [0.7, 7], [2.6, 8.4], [7.6, 6.2], [9, 7.6], [8.2, 8.4], [5.6, 3], [6.2, 4.2]] as const) disc(sc, cam, tx * K, ty * K, 1.2, 0.2 * K, 0.34 * K, COL.green, { L: 3 });
  const tech = opts.lens === 'engineer' || opts.lens === 'optimize' || opts.lens === 'exec';
  for (const b of buildings) {
    const m = b.map, x = (m.x + m.w / 2) * K, y = (m.y + m.d / 2) * K, w = m.w * K, d = m.d * K, fh = 3.3, h = b.floors * fh + 1.2, to = `#/lite/b/${b.key}`, here = b.key === HERE.bKey;
    poly(sc, 0, [[x - w / 2 + 3, y - d / 2 + 4, 0.03], [x + w / 2 + 5, y - d / 2 + 4, 0.03], [x + w / 2 + 5, y + d / 2 + 5, 0.03], [x - w / 2 + 3, y + d / 2 + 5, 0.03]], { f: 'rgba(0,0,0,.28)', s: 'none' });
    box(sc, cam, { x, y, w, d, h }, COL.bld, { nav: to, stroke: 'rgba(255,246,232,.12)' });
    // lit windows, floor by floor, on the faces towards the camera
    const cs: [number, number][] = [[x - w / 2, y - d / 2], [x + w / 2, y - d / 2], [x + w / 2, y + d / 2], [x - w / 2, y + d / 2]]; const N: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const vx = Math.sin(cam.yaw * Math.PI / 180), vy = Math.cos(cam.yaw * Math.PI / 180);
    if (cam.pitch < 88) for (let i = 0; i < 4; i++) { const n = N[i]!; if (n[0] * vx + n[1] * vy <= 0.02) continue; const a = cs[i]!, c2 = cs[(i + 1) % 4]!;
      for (let f = 0; f < b.floors; f++) { const lit = 0.12 + ((hashStr(`${b.key}${i}${f}`) % 9) / 9) * 0.26, z0 = f * fh + 1.1, z1 = f * fh + 2.9;
        poly(sc, 3, [[mix(a[0], c2[0], 0.04), mix(a[1], c2[1], 0.04), z0], [mix(a[0], c2[0], 0.96), mix(a[1], c2[1], 0.96), z0], [mix(a[0], c2[0], 0.96), mix(a[1], c2[1], 0.96), z1], [mix(a[0], c2[0], 0.04), mix(a[1], c2[1], 0.04), z1]], { c: [x, y, h / 2], sub: 0.5, f: `rgba(255,224,170,${lit.toFixed(2)})`, s: 'none', nav: to }); } }
    poly(sc, 3, [[x - w * 0.43, y - d * 0.42, h + 0.02], [x + w * 0.43, y - d * 0.42, h + 0.02], [x + w * 0.43, y + d * 0.42, h + 0.02], [x - w * 0.43, y + d * 0.42, h + 0.02]], { c: [x, y, h / 2], sub: 2, f: rgb(COL.roof), s: 'rgba(255,246,232,.2)', sw: 0.7, nav: to });
    box(sc, cam, { x: x + w * 0.18, y: y - d * 0.14, z: h, w: w * 0.22, d: d * 0.2, h: 1.6 }, [70, 68, 62], { nav: to });
    const g = P2(entrance(m, b.key)); poly(sc, 1, Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [g[0] + Math.cos(a) * 2.6, g[1] + Math.sin(a) * 2.6, 0.06] as [number, number, number]; }), { f: 'rgba(69,207,193,.45)', s: 'var(--l3-teal)', sw: 0.8 });
    label(sc, [x, y, h + 1.6], b.short, { lift: 22, big: true, tone: tech && opts.tone ? opts.tone(b.key) : undefined, on: here && !tech, sub: here ? 'you are here' : opts.lens === 'visitor' && b.key === 'ATL' ? 'main entrance' : '', nav: to, testId: `l3-bld-label-${b.key}` });
    hit(sc, [x, y, h], { nav: to, r: 24, label: `${b.name}. ${b.purpose}. Opens the building.`, testId: `lite-bld-${b.key}` });
  }
  if (opts.lens === 'visitor') { line(sc, 6, opts.visitorPath.map((p) => [p[0] * K, p[1] * K, 0.3] as [number, number, number]), { s: 'var(--l3-teal)', sw: 2.4, cls: 'l3-route' }); const s0 = P2(opts.visitorPath[0]!); label(sc, [s0[0] - 8, s0[1] + 4, 0.3], 'Visitor parking', { lift: 12, tone: 'here' }); }
  if (opts.lens === 'engineer') { const at = buildings.find((b) => b.key === 'ATL'); if (at) { const c0: [number, number, number] = [(at.map.x + at.map.w / 2) * K, (at.map.y + at.map.d / 2) * K, at.floors * 3.3 + 2];
    for (const b of buildings) if (b.key !== 'ATL') line(sc, 6, [[(b.map.x + b.map.w / 2) * K, (b.map.y + b.map.d / 2) * K, b.floors * 3.3 + 2], c0], { s: 'var(--l3-teal)', sw: 1.1, da: '3 4' });
    label(sc, c0, 'Campus core', { lift: 44, tone: 'here' }); } }
  return sc;
}
/** The campus with the camera and controls. */
export function CampusStage({ buildings, onNav, lens, tone, plaza, visitorPath }: { buildings: Parameters<typeof campusScene>[1]; onNav: (to: string) => void; lens?: string | null; tone?: (k: string) => string; plaza: readonly [number, number]; visitorPath: ReadonlyArray<readonly [number, number]> }) {
  const c = useCam({ yaw: -38, pitch: 40, zoom: 1 });
  const sc = useMemo(() => campusScene(c.cam, buildings, { lens, tone, plaza, visitorPath }), [c.cam, buildings, lens, tone, plaza, visitorPath]);
  return <L3View sc={sc} c={c} label={`The campus in 3D: ${buildings.length} buildings. Each building is a button.`} onNav={onNav} testId="lite-campus-3d" S={2.6} />;
}
