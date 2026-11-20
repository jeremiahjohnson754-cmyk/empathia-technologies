/**
 * Empathia's room kit (13 Nov 2026, founder on a stadium suite drawn as V2.5.3's boardroom: "This looks terrible … don't have my rooms
 * or experiences looking like this"). The drawing primitives a furnished room is built from: solids lit from one fixed light (so a room
 * reads the same from every side), lathed shapes for stools, pots and shades, soft contact shadows, light pools, and the furniture people
 * recognise — chairs with legs and backs, sofas with cushions and arms, stools, tables, counters with plinths and stone tops, open shelving
 * with bottles, wall displays with a lit picture, plants. Everything is in metres on the L3 scene (./l3.tsx), drawn from an orbiting
 * camera or from an occupant's eyes. Modelled and illustrative: no piece here is a surveyed or verified asset.
 */
import { poly, line, rgb, type L3Scene, type P3, type Cam, type Eye } from '../l3.js';

export type RGB = [number, number, number];
export interface View { cam: Cam; eye: Eye | null }
const RAD = Math.PI / 180;
/** the horizontal direction the light comes from (from the room's back-left): faces turned towards it are brighter */
const LIGHT: [number, number] = (() => { const x = -0.45, y = 0.89, n = Math.hypot(x, y); return [x / n, y / n]; })();
export const hex = (h: string): RGB => { const v = parseInt(h.replace('#', ''), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
export const tint = (c: RGB, k: number, a?: number) => rgb(c, k, a);

/** Draw order tiers within a layer (L3View sorts by layer, then this, then depth; from an eye, by group, then this, then distance). */
export const PRI = { ground: -4, rug: -2.5, mark: -2, shadow: -1.5, terrain: -1, solid: 0 } as const;

/** Whether a face with horizontal outward normal (nx, ny) through (px, py) is seen: from the orbiting camera by its direction, from an eye by
 *  which side of the face the eye is on. */
export function sees(v: View, nx: number, ny: number, px: number, py: number): boolean {
  if (v.eye) return nx * (v.eye.x - px) + ny * (v.eye.y - py) > 0.001;
  if (v.cam.pitch > 88) return false;
  return nx * Math.sin(v.cam.yaw * RAD) + ny * Math.cos(v.cam.yaw * RAD) > 0.02;
}
const lam = (nx: number, ny: number) => nx * LIGHT[0] + ny * LIGHT[1];

export interface Solid { x: number; y: number; z?: number; w: number; d: number; h: number; rot?: number }
export interface Style { L?: number; pri?: number; o?: string; a?: number; edge?: string | null; top?: string; face?: Partial<Record<'N' | 'E' | 'S' | 'W', string>>; k?: number; noTop?: boolean; sw?: number; /** a soft rounded top: a darker rim and a lighter crown, inset by this many metres */ bevel?: number }
const FACES: Array<[number, number, 'N' | 'E' | 'S' | 'W']> = [[0, -1, 'N'], [1, 0, 'E'], [0, 1, 'S'], [-1, 0, 'W']];
/** A box lit from the fixed light: its sides as the viewer sees them, its top, and from below (an eye under it) its underside. */
export function solid(sc: L3Scene, v: View, b: Solid, col: RGB, st: Style = {}) {
  const z0 = b.z || 0, z1 = z0 + b.h, r = (b.rot || 0) * RAD, rc = Math.cos(r), rs = Math.sin(r), hw = b.w / 2, hd = b.d / 2;
  const cs = ([[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]] as Array<[number, number]>).map(([px, py]) => [b.x + px * rc - py * rs, b.y + px * rs + py * rc] as [number, number]);
  const L = st.L ?? 3, k0 = st.k ?? 1; const c: P3 = [b.x, b.y, z0 + b.h / 2]; const edge = st.edge === undefined ? rgb(col, 0.72 * k0, 0.5) : st.edge; const sw = st.sw ?? 0.45;
  for (let i = 0; i < 4; i++) {
    const [n0, n1, nm] = FACES[i]!; const nx = n0 * rc - n1 * rs, ny = n0 * rs + n1 * rc; const a = cs[i]!, e = cs[(i + 1) % 4]!;
    if (b.h < 0.004 || !sees(v, nx, ny, (a[0] + e[0]) / 2, (a[1] + e[1]) / 2)) continue;
    const k = (0.8 + 0.14 * lam(nx, ny)) * k0;
    poly(sc, L, [[a[0], a[1], z0], [e[0], e[1], z0], [e[0], e[1], z1], [a[0], a[1], z1]], { c, f: st.face?.[nm] ?? rgb(col, k, st.a), s: edge ?? 'none', sw, o: st.o, a: st.a == null ? undefined : 1, pri: st.pri });
  }
  if (!st.noTop && (!v.eye || v.eye.z > z1)) {
    poly(sc, L, cs.map(([px, py]) => [px, py, z1] as P3), { c, f: st.top ?? rgb(col, st.bevel ? 0.94 * k0 : k0, st.a), s: edge ?? 'none', sw, o: st.o, pri: st.pri });
    if (st.bevel) { const bi = Math.min(st.bevel, hw * 0.45, hd * 0.45); const ins = ([[-hw + bi, -hd + bi], [hw - bi, -hd + bi], [hw - bi, hd - bi], [-hw + bi, hd - bi]] as Array<[number, number]>).map(([px, py]) => [b.x + px * rc - py * rs, b.y + px * rs + py * rc, z1 + 0.004] as P3);
      poly(sc, L, ins, { c: [c[0], c[1], c[2] + 0.001], f: rgb(col, 1.07 * k0, st.a), s: 'none', o: st.o, pri: st.pri }); } }
  if (v.eye && v.eye.z < z0) poly(sc, L, cs.map(([px, py]) => [px, py, z0] as P3), { c, f: rgb(col, 0.6 * k0, st.a), s: edge ?? 'none', sw, o: st.o, pri: st.pri });
}
/** A lathed shape (a stool's seat, a pot, a shade, a column): an n-sided prism, its sides lit like a solid's. */
export function lathe(sc: L3Scene, v: View, x: number, y: number, z: number, r: number, h: number, col: RGB, st: Style & { r1?: number; n?: number } = {}) {
  const n = st.n ?? 14, r1 = st.r1 ?? r, L = st.L ?? 3, k0 = st.k ?? 1; const c: P3 = [x, y, z + h / 2]; const edge = st.edge === undefined ? rgb(col, 0.72 * k0, 0.35) : st.edge;
  const at = (i: number, rr: number, zz: number): P3 => { const t = (i / n) * Math.PI * 2; return [x + Math.cos(t) * rr, y + Math.sin(t) * rr, zz]; };
  for (let i = 0; i < n; i++) { const t = ((i + 0.5) / n) * Math.PI * 2; const nx = Math.cos(t), ny = Math.sin(t);
    if (h < 0.004 || !sees(v, nx, ny, x + nx * r, y + ny * r)) continue; const k = (0.8 + 0.14 * lam(nx, ny)) * k0;
    poly(sc, L, [at(i, r, z), at(i + 1, r, z), at(i + 1, r1, z + h), at(i, r1, z + h)], { c, f: rgb(col, k, st.a), s: rgb(col, k, st.a), sw: 0.35, o: st.o, pri: st.pri }); }
  if (!st.noTop && (!v.eye || v.eye.z > z + h)) poly(sc, L, Array.from({ length: n }, (_, i) => at(i, r1, z + h)), { c, f: st.top ?? rgb(col, k0, st.a), s: edge ?? 'none', sw: 0.4, o: st.o, pri: st.pri });
  if (v.eye && v.eye.z < z) poly(sc, L, Array.from({ length: n }, (_, i) => at(i, r, z)), { c, f: st.top ?? rgb(col, 0.62 * k0, st.a), s: 'none', o: st.o, pri: st.pri });
}
/** A flat shape on the floor (or any level): a rug, a mark, a pool of light. */
export function flat(sc: L3Scene, L: number, pts: Array<[number, number]>, z: number, fill: string, st: { pri?: number; s?: string; sw?: number; o?: string; a?: number } = {}) {
  poly(sc, L, pts.map(([x, y]) => [x, y, z] as P3), { f: fill, s: st.s ?? 'none', sw: st.sw, pri: st.pri ?? PRI.mark, o: st.o, a: st.a });
}
const rrect = (x: number, y: number, w: number, d: number, rot: number, inset = 0): Array<[number, number]> => {
  const r = rot * RAD, rc = Math.cos(r), rs = Math.sin(r), hw = w / 2 + inset, hd = d / 2 + inset, k = Math.min(hw, hd) * 0.5;
  const pts: Array<[number, number]> = [[-hw + k, -hd], [hw - k, -hd], [hw, -hd + k], [hw, hd - k], [hw - k, hd], [-hw + k, hd], [-hw, hd - k], [-hw, -hd + k]];
  return pts.map(([px, py]) => [x + px * rc - py * rs, y + px * rs + py * rc]);
};
/** A soft contact shadow under a piece: two rounded footprints, the outer fainter, nudged away from the light. */
export function shadow(sc: L3Scene, L: number, x: number, y: number, w: number, d: number, rot = 0, z = 0.003, a = 1) {
  const ox = -LIGHT[0] * 0.06, oy = -LIGHT[1] * 0.06;
  flat(sc, L, rrect(x + ox, y + oy, w, d, rot, 0.1), z, `rgba(48,36,24,${(0.07 * a).toFixed(3)})`, { pri: PRI.shadow });
  flat(sc, L, rrect(x + ox * 0.5, y + oy * 0.5, w, d, rot, 0.02), z + 0.0005, `rgba(48,36,24,${(0.12 * a).toFixed(3)})`, { pri: PRI.shadow });
}
/** the warm pool a downlight throws on the floor */
export function pool(sc: L3Scene, L: number, x: number, y: number, r: number, z = 0.002) {
  flat(sc, L, Array.from({ length: 20 }, (_, i) => { const t = (i / 20) * Math.PI * 2; return [x + Math.cos(t) * r, y + Math.sin(t) * r * 0.92] as [number, number]; }), z, 'url(#rm-pool)', { pri: PRI.rug + 0.2 });
}

/** a point in a piece's own frame (front towards −y when rot is 0) placed in the room */
export const frame = (x: number, y: number, rot: number) => { const r = rot * RAD, rc = Math.cos(r), rs = Math.sin(r); return (lx: number, ly: number): [number, number] => [x + lx * rc - ly * rs, y + lx * rs + ly * rc]; };

// ---------------------------------------------------------------------------------------------------------------- materials
export const M = {
  oak: hex('#cdb08a'), oak2: hex('#c4a57e'), walnut: hex('#6b4c37'), walnutL: hex('#86634a'), quartz: hex('#efebe4'), plaster: hex('#ebe6de'), plasterW: hex('#e4ddd2'),
  poche: hex('#3a3632'), bronze: hex('#3f3b37'), black: hex('#232427'), steel: hex('#9aa0a6'), steelD: hex('#5d6268'), leather: hex('#a8754b'), charcoal: hex('#34383d'),
  teal: hex('#2f6b6c'), tealL: hex('#3f8285'), camel: hex('#b98e5e'), linen: hex('#d9d2c5'), stone: hex('#b9b3aa'), concrete: hex('#9c978f'), cream: hex('#e2dccf'),
  leaf: hex('#5b8a57'), leaf2: hex('#6f9c64'), leaf3: hex('#4a7550'), seat: hex('#2a7b7a'), seatL: hex('#33898a'), glassEdge: 'rgba(205,226,236,.55)',
};

// ---------------------------------------------------------------------------------------------------------------- furniture
export interface PieceStyle { o: string; L?: number }
/** a dining or side chair: four legs, a seat, a back */
export function chair(sc: L3Scene, v: View, x: number, y: number, rot: number, col: RGB, st: PieceStyle, legs: RGB = M.walnut) {
  const P = frame(x, y, rot); shadow(sc, 1, x, y, 0.5, 0.5, rot);
  for (const [lx, ly] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]] as const) { const [px, py] = P(lx, ly); solid(sc, v, { x: px, y: py, w: 0.035, d: 0.035, h: 0.42, rot }, legs, { o: st.o, edge: null }); }
  solid(sc, v, { x, y, z: 0.42, w: 0.47, d: 0.46, h: 0.06, rot }, col, { o: st.o, bevel: 0.04 }); const [bx, by] = P(0, 0.21); solid(sc, v, { x: bx, y: by, z: 0.48, w: 0.45, d: 0.05, h: 0.4, rot }, col, { o: st.o, k: 0.95 });
}
/** a bar or counter stool: a foot, a column, a footrest ring and a round seat */
export function stool(sc: L3Scene, v: View, x: number, y: number, seat: number, col: RGB, st: PieceStyle, back = false, rot = 0) {
  shadow(sc, 1, x, y, 0.42, 0.42, 0, 0.003, 0.8); lathe(sc, v, x, y, 0, 0.2, 0.025, M.black, { o: st.o, n: 16 });
  solid(sc, v, { x, y, z: 0.025, w: 0.045, d: 0.045, h: seat - 0.09, rot }, M.black, { o: st.o, edge: null });
  lathe(sc, v, x, y, seat * 0.38, 0.17, 0.018, M.black, { o: st.o, n: 16, noTop: false, top: tint(M.black, 1.25) });
  lathe(sc, v, x, y, seat - 0.075, 0.2, 0.075, col, { o: st.o, n: 16, r1: 0.19 });
  if (back) { const [bx, by] = frame(x, y, rot)(0, 0.16); solid(sc, v, { x: bx, y: by, z: seat, w: 0.36, d: 0.05, h: 0.26, rot }, col, { o: st.o, k: 0.95 }); }
}
/** a sofa or armchair: a low plinth, the base, seat cushions, a back and two arms */
export function sofa(sc: L3Scene, v: View, x: number, y: number, rot: number, w: number, col: RGB, st: PieceStyle, seats = 3) {
  const P = frame(x, y, rot); const d = 0.88; shadow(sc, 1, x, y, w, d, rot);
  solid(sc, v, { x, y, w: w - 0.06, d: d - 0.06, h: 0.1, rot }, M.black, { o: st.o, edge: null });
  solid(sc, v, { x, y, z: 0.1, w, d, h: 0.3, rot }, col, { o: st.o });
  const cw = (w - 0.4) / seats; for (let i = 0; i < seats; i++) { const [cx, cy] = P(-w / 2 + 0.2 + cw * (i + 0.5), -0.08); solid(sc, v, { x: cx, y: cy, z: 0.4, w: cw - 0.025, d: 0.62, h: 0.11, rot }, col, { o: st.o, k: 1.06, bevel: 0.05, edge: rgb(col, 0.6, 0.6) }); }
  const [bx, by] = P(0, 0.33); solid(sc, v, { x: bx, y: by, z: 0.4, w: w - 0.06, d: 0.22, h: 0.42, rot }, col, { o: st.o, k: 0.96, bevel: 0.05 });
  for (const s of [-1, 1]) { const [ax, ay] = P(s * (w / 2 - 0.09), 0); solid(sc, v, { x: ax, y: ay, z: 0.4, w: 0.18, d: d, h: 0.22, rot }, col, { o: st.o, k: 0.98, bevel: 0.04 }); }
  if (seats >= 2) for (const s of [-1, 1]) { const [px, py] = P(s * (w / 2 - 0.42), 0.15); solid(sc, v, { x: px, y: py, z: 0.52, w: 0.4, d: 0.12, h: 0.36, rot: rot + s * 8 }, M.linen, { o: st.o, bevel: 0.03 }); }
}
/** a table: a top on four legs, or on a pedestal */
export function table(sc: L3Scene, v: View, x: number, y: number, w: number, d: number, h: number, top: RGB, base: RGB, st: PieceStyle, pedestal = false, rot = 0) {
  shadow(sc, 1, x, y, w, d, rot, 0.003, 0.9);
  if (pedestal) { lathe(sc, v, x, y, 0, Math.min(w, d) * 0.32, 0.03, base, { o: st.o }); solid(sc, v, { x, y, z: 0.03, w: 0.08, d: 0.08, h: h - 0.07, rot }, base, { o: st.o, edge: null }); }
  else { const P = frame(x, y, rot); for (const [lx, ly] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) { const [px, py] = P(lx * (w / 2 - 0.06), ly * (d / 2 - 0.06)); solid(sc, v, { x: px, y: py, w: 0.045, d: 0.045, h: h - 0.04, rot }, base, { o: st.o, edge: null }); } }
  solid(sc, v, { x, y, z: h - 0.04, w, d, h: 0.04, rot }, top, { o: st.o, top: top === M.quartz ? 'url(#rm-stone)' : undefined });
}
/** a low table: a stone top on a solid timber base */
export function lowTable(sc: L3Scene, v: View, x: number, y: number, w: number, d: number, st: PieceStyle, rot = 0) {
  shadow(sc, 1, x, y, w, d, rot); solid(sc, v, { x, y, w: w - 0.16, d: d - 0.16, h: 0.34, rot }, M.walnut, { o: st.o }); solid(sc, v, { x, y, z: 0.34, w, d, h: 0.04, rot }, M.quartz, { o: st.o, top: 'url(#rm-stone)' });
}
/** A run of base units against a wall: recessed plinth, carcass with door joints, a stone top with a small overhang. `front` is where the
 *  person stands (the unit's −y side when rot is 0). */
export function counter(sc: L3Scene, v: View, x: number, y: number, len: number, dep: number, h: number, rot: number, body: RGB, top: RGB, st: PieceStyle & { doors?: number; glass?: Array<[number, number]> } ) {
  const P = frame(x, y, rot); shadow(sc, 1, x, y, len, dep, rot, 0.003, 0.7);
  const [px, py] = P(0, 0.04); solid(sc, v, { x: px, y: py, w: len - 0.02, d: dep - 0.08, h: 0.1, rot }, M.poche, { o: st.o, edge: null });
  solid(sc, v, { x, y, z: 0.1, w: len, d: dep, h: h - 0.13, rot }, body, { o: st.o });
  const [tx, ty] = P(0, -0.02); solid(sc, v, { x: tx, y: ty, z: h - 0.03, w: len + 0.02, d: dep + 0.04, h: 0.03, rot }, top, { o: st.o, top: top === M.quartz ? 'url(#rm-stone)' : undefined });
  // door joints and glazed fronts on the front face, if the front is seen
  const [fx, fy] = P(0, -dep / 2), [nx0, ny0] = P(0, -1); const nx = nx0 - x, ny = ny0 - y; if (!sees(v, nx, ny, fx, fy)) return;
  const n = st.doors ?? Math.max(1, Math.round(len / 0.6)); const off = (lx: number, z: number): P3 => { const [qx, qy] = P(lx, -dep / 2 - 0.004); return [qx, qy, z]; };
  for (const [g0, g1] of st.glass || []) poly(sc, 3, [off(g0, 0.16), off(g1, 0.16), off(g1, h - 0.08), off(g0, h - 0.08)], { c: [...P((g0 + g1) / 2, -dep / 2 - 0.01), h / 2] as P3, f: 'url(#rm-fridge)', s: tint(M.steelD, 1, 0.8), sw: 0.6, o: st.o });
  for (let i = 1; i < n; i++) { const lx = -len / 2 + (len * i) / n; line(sc, 3, [off(lx, 0.13), off(lx, h - 0.06)], { s: rgb(body, 0.6, 0.7), sw: 0.6, c: [...P(lx, -dep / 2 - 0.01), h / 2] as P3 }); }
}
/** Open shelving on a wall with bottles and glasses on it (a bar's back wall): `n` boards between z0 and z1. */
export function shelves(sc: L3Scene, v: View, x: number, y: number, len: number, rot: number, z0: number, z1: number, n: number, st: PieceStyle) {
  const P = frame(x, y, rot); const BOT: RGB[] = [hex('#2e5a3c'), hex('#7a3b2e'), hex('#c9b27a'), hex('#d8dde0'), hex('#4b3a2a'), hex('#9fb8b0')];
  for (let i = 0; i < n; i++) { const z = z0 + ((z1 - z0) * i) / Math.max(1, n - 1); solid(sc, v, { x, y, z, w: len, d: 0.26, h: 0.035, rot }, M.walnutL, { o: st.o });
    if (i === n - 1) continue; const k = Math.floor(len / 0.11); for (let j = 0; j < k; j++) { if ((j * 7 + i * 3) % 5 === 0) continue; const lx = -len / 2 + 0.08 + j * 0.11; const [bx, by] = P(lx, 0.02); const tall = (j + i) % 3 === 0;
      solid(sc, v, { x: bx, y: by, z: z + 0.035, w: 0.065, d: 0.065, h: tall ? 0.3 : 0.22, rot }, BOT[(j * 5 + i * 2) % BOT.length]!, { o: st.o, edge: null, k: 0.95 }); } }
}
/** a flat-panel display on a wall, its picture lit */
export function display(sc: L3Scene, v: View, x: number, y: number, z: number, w: number, h: number, rot: number, st: PieceStyle) {
  solid(sc, v, { x, y, z, w, d: 0.05, h, rot }, M.black, { o: st.o, face: { N: 'url(#rm-screen)' }, edge: 'rgba(10,10,12,.9)' });
}
/** a planter with a shrub or a small tree */
export function plant(sc: L3Scene, v: View, x: number, y: number, h: number, st: PieceStyle) {
  shadow(sc, 1, x, y, 0.5, 0.5, 0); lathe(sc, v, x, y, 0, 0.2, 0.42, M.cream, { o: st.o, r1: 0.24, n: 16 }); lathe(sc, v, x, y, 0.42, 0.22, 0.02, hex('#5b4434'), { o: st.o, n: 16 });
  const G = [M.leaf3, M.leaf, M.leaf2]; const tiers = Math.max(2, Math.round((h - 0.45) / 0.32));
  for (let i = 0; i < tiers; i++) { const t = i / Math.max(1, tiers - 1); const r = 0.34 - 0.16 * t + (i % 2 ? 0.04 : 0); const z = 0.45 + i * ((h - 0.6) / tiers);
    for (let j = 0; j < 3; j++) { const a = (i * 2.1 + j * 2.09); const ox = Math.cos(a) * r * 0.45, oy = Math.sin(a) * r * 0.45;
      lathe(sc, v, x + ox, y + oy, z + j * 0.04, r * 0.62, (h - 0.5) / tiers + 0.1, G[(i + j) % 3]!, { o: st.o, r1: r * 0.3, n: 8, edge: null, k: 0.92 + 0.06 * j }); } }
}
/** a pendant light hanging on its cord, with a glow under the shade */
export function pendant(sc: L3Scene, v: View, x: number, y: number, z: number, ceil: number, st: PieceStyle) {
  line(sc, 3, [[x, y, ceil], [x, y, z + 0.22]], { s: 'rgba(30,28,26,.8)', sw: 0.5, c: [x, y, z + 0.3] });
  lathe(sc, v, x, y, z, 0.17, 0.2, M.bronze, { o: st.o, r1: 0.06, n: 14 });
  if (!v.eye || v.eye.z < z) flat(sc, 3, Array.from({ length: 14 }, (_, i) => { const t = (i / 14) * Math.PI * 2; return [x + Math.cos(t) * 0.16, y + Math.sin(t) * 0.16] as [number, number]; }), z + 0.001, 'rgba(255,226,170,.95)', { pri: 0.1, o: st.o });
}
/** a padded stadium seat on a pedestal, with arms (a suite's balcony seat) */
export function stadiumSeat(sc: L3Scene, v: View, x: number, y: number, z: number, rot: number, col: RGB, st: PieceStyle & { L?: number }) {
  const L = st.L ?? 3, P = frame(x, y, rot); solid(sc, v, { x, y, z, w: 0.12, d: 0.3, h: 0.36, rot }, M.steelD, { o: st.o, L, edge: null });
  solid(sc, v, { x, y, z: z + 0.36, w: 0.48, d: 0.44, h: 0.08, rot }, col, { o: st.o, L, bevel: 0.05 });
  const [bx, by] = P(0, 0.22); solid(sc, v, { x: bx, y: by, z: z + 0.42, w: 0.48, d: 0.07, h: 0.5, rot }, col, { o: st.o, L, k: 0.94 });
  for (const s of [-1, 1]) { const [ax, ay] = P(s * 0.27, 0.02); solid(sc, v, { x: ax, y: ay, z: z + 0.36, w: 0.05, d: 0.42, h: 0.24, rot }, M.steelD, { o: st.o, L, edge: null }); }
}

// ---------------------------------------------------------------------------------------------------------------- work, broadcast and hosting
/** a task chair: a five-star base, a column, a padded seat and back */
export function taskChair(sc: L3Scene, v: View, x: number, y: number, rot: number, col: RGB, st: PieceStyle, simple = false) {
  const P = frame(x, y, rot); if (!simple) { shadow(sc, 1, x, y, 0.55, 0.55, 0, 0.003, 0.7); lathe(sc, v, x, y, 0.05, 0.3, 0.03, M.black, { o: st.o, n: 10 }); solid(sc, v, { x, y, z: 0.08, w: 0.05, d: 0.05, h: 0.36, rot }, M.steelD, { o: st.o, edge: null }); }
  solid(sc, v, { x, y, z: 0.44, w: 0.48, d: 0.46, h: 0.08, rot }, col, { o: st.o, bevel: simple ? undefined : 0.04 });
  const [bx, by] = P(0, 0.22); solid(sc, v, { x: bx, y: by, z: 0.54, w: 0.44, d: 0.06, h: 0.5, rot }, col, { o: st.o, k: 0.94, bevel: simple ? undefined : 0.02 });
}
/** a monitor on a desk stand */
export function monitor(sc: L3Scene, v: View, x: number, y: number, z: number, w: number, h: number, rot: number, st: PieceStyle) {
  const P = frame(x, y, rot); const [sx, sy] = P(0, 0.06); solid(sc, v, { x: sx, y: sy, z, w: 0.22, d: 0.18, h: 0.015, rot }, M.black, { o: st.o, edge: null });
  solid(sc, v, { x: sx, y: sy, z: z + 0.015, w: 0.04, d: 0.03, h: 0.12, rot }, M.black, { o: st.o, edge: null }); display(sc, v, x, y, z + 0.1, w, h, rot, st);
}
/** a mirror on a wall, with a row of lamps over it (a dressing mirror when `lamps`) */
export function mirror(sc: L3Scene, v: View, x: number, y: number, z: number, w: number, h: number, rot: number, st: PieceStyle, lamps = false) {
  solid(sc, v, { x, y, z, w, d: 0.03, h, rot }, M.bronze, { o: st.o, face: { N: 'url(#rm-mirror)' } });
  if (lamps) { const P = frame(x, y, rot); const n = Math.max(3, Math.round(w / 0.25)); for (let i = 0; i < n; i++) { const [lx, ly] = P(-w / 2 + (w * (i + 0.5)) / n, -0.05); lathe(sc, v, lx, ly, z + h + 0.02, 0.04, 0.07, [255, 236, 196], { o: st.o, n: 8, edge: null }); } }
}
/** a mixing console on its desk: the desk, a worktop with faders, a meter bridge at the back */
export function mixConsole(sc: L3Scene, v: View, x: number, y: number, w: number, d: number, rot: number, st: PieceStyle) {
  const P = frame(x, y, rot); shadow(sc, 1, x, y, w, d, rot); solid(sc, v, { x, y, w, d, h: 0.72, rot }, M.charcoal, { o: st.o });
  solid(sc, v, { x, y, z: 0.72, w: w - 0.04, d: d - 0.06, h: 0.06, rot }, M.black, { o: st.o, top: 'url(#rm-faders)' });
  const [mx, my] = P(0, -(d / 2 - 0.12)); solid(sc, v, { x: mx, y: my, z: 0.78, w: w - 0.1, d: 0.2, h: 0.22, rot }, M.black, { o: st.o, face: { S: 'url(#rm-meters)' } });
}
/** an equipment rack with its fronts */
export function rack(sc: L3Scene, v: View, x: number, y: number, h: number, rot: number, st: PieceStyle) {
  shadow(sc, 1, x, y, 0.6, 0.8, rot); solid(sc, v, { x, y, w: 0.6, d: 0.8, h, rot }, M.black, { o: st.o, face: { N: 'url(#rm-rackface)' } });
}
/** a glass partition between two points, with a slim frame (a meeting pod's walls); a gap of `door` metres is left at its middle */
export function glassWall(sc: L3Scene, v: View, x0: number, y0: number, x1: number, y1: number, h: number, st: PieceStyle, door = 0) {
  const len = Math.hypot(x1 - x0, y1 - y0); const ux = (x1 - x0) / len, uy = (y1 - y0) / len; const segs: Array<[number, number]> = door ? [[0, (len - door) / 2], [(len + door) / 2, len]] : [[0, len]];
  for (const [a, b] of segs) { const p = (t: number, z: number): P3 => [x0 + ux * t, y0 + uy * t, z]; const c: P3 = [x0 + ux * (a + b) / 2, y0 + uy * (a + b) / 2, h / 2];
    poly(sc, 3, [p(a, 0), p(b, 0), p(b, h), p(a, h)], { c, f: 'url(#rm-glass)', s: M.glassEdge, sw: 0.5, o: st.o });
    for (const t of [a, b]) solid(sc, v, { x: x0 + ux * t, y: y0 + uy * t, w: 0.04, d: 0.04, h }, M.bronze, { o: st.o, edge: null }); }
  solid(sc, v, { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: h - 0.04, w: Math.abs(ux) > 0.5 ? len : 0.05, d: Math.abs(ux) > 0.5 ? 0.05 : len, h: 0.04 }, M.bronze, { o: st.o, edge: null });
}
/** a raised floor (a tier in a press box, a platform) with its nosing */
export function platform(sc: L3Scene, v: View, x: number, y: number, w: number, d: number, h: number, top: RGB, st: PieceStyle) {
  solid(sc, v, { x, y, w, d, h, rot: 0 }, top, { o: st.o, L: 2.5, face: { N: rgb(top, 0.72), S: rgb(top, 0.8) }, top: rgb(top, 1) });
  solid(sc, v, { x, y: y - d / 2 + 0.03, z: h - 0.02, w, d: 0.06, h: 0.025 }, [200, 170, 90], { o: st.o, L: 2.5, edge: null });
}
