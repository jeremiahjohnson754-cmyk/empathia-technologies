/**
 * A room built from its program (./programs.ts) with Empathia's kit (./kit.ts): the shell (a timber floor in boards, walls with thickness,
 * skirting and a dark section where they are cut, a glass front with mullions and a sliding door, a door from the corridor with its swing,
 * from an occupant's eyes a ceiling with downlights and loudspeakers), the furniture and equipment, and what the room looks out on.
 * From the orbiting camera the walls between the camera and the room are cut low, as an architect's cutaway; from an occupant's eyes every
 * wall stands and the ceiling is drawn.
 */
import { scene, poly, line, label, hit, type L3Scene, type P3 } from '../l3.js';
import { solid, lathe, flat, shadow, pool, chair, stool, sofa, table, lowTable, counter, shelves, display, plant, pendant, stadiumSeat, taskChair, monitor, mirror, mixConsole, rack, glassWall, platform, sees, tint, frame, M, PRI, type View, type RGB } from './kit.js';
import type { Program, Piece, Side } from './programs.js';
import { bowlOutside } from './stadium.js';
import { RUN_COLOUR } from './PlanView.js';

const TW = 0.14, CUT = 0.34, POCHE = 'rgb(58,54,50)';
/** Each world's own character (13 Nov 2026, the spatial gate's "four-world differentiation"): the Enterprise campus in blue-grey carpet,
 *  warm white walls and teal; the University in sage carpet, cream walls, forest-green and oak; Harborlight Stadium in charcoal carpet, cool
 *  white and the club's harbour teal; the convention centre in navy carpet, pale grey and slate blue. Furniture, glass and timber are shared. */
export type World = 'enterprise' | 'university' | 'stadium' | 'convention';
interface Theme { carpet: string; wall: RGB; chair: RGB; sofa: RGB }
const THEMES: Record<World, Theme> = {
  enterprise: { carpet: 'url(#rm-carpet-ent)', wall: [235, 231, 224], chair: [185, 142, 94], sofa: [47, 107, 108] },
  university: { carpet: 'url(#rm-carpet-uni)', wall: [238, 232, 216], chair: [160, 120, 78], sofa: [62, 98, 70] },
  stadium: { carpet: 'url(#rm-carpet2)', wall: [232, 233, 232], chair: [168, 117, 75], sofa: [47, 107, 108] },
  convention: { carpet: 'url(#rm-carpet-cnv)', wall: [228, 230, 232], chair: [120, 132, 150], sofa: [56, 74, 104] },
};
let T: Theme = THEMES.enterprise;
const NORMAL: Record<Side, [number, number]> = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };
const INNER: Record<Side, 'N' | 'S' | 'E' | 'W'> = { N: 'S', S: 'N', W: 'E', E: 'W' };

/** the side a wall-mounted piece hangs on, if it hangs on one */
const MOUNTED = new Set(['display', 'panel', 'shelves', 'mirror', 'clock', 'ledwall']);
const mountOf = (p: Piece, P: Program): Side | null => !MOUNTED.has(p.kind) ? null : p.x < 0.3 ? 'W' : p.x > P.w - 0.3 ? 'E' : p.y > P.d - 0.3 ? 'S' : p.y < 0.3 ? 'N' : null;
/** whether a wall is cut low (it stands between the orbiting camera and the room) */
export function cutWall(P: Program, v: View, s: Side): boolean { if (v.eye) return false; const [nx, ny] = NORMAL[s]; const mid: Record<Side, [number, number]> = { N: [P.w / 2, 0], S: [P.w / 2, P.d], W: [0, P.d / 2], E: [P.w, P.d / 2] }; return sees(v, nx, ny, mid[s][0], mid[s][1]); }

function wall(sc: L3Scene, v: View, P: Program, s: Side) {
  const spec = P.walls[s]; if (spec.none) return; const cut = cutWall(P, v, s); const H = spec.parapet ? (cut ? Math.min(CUT, spec.parapet) : spec.parapet) : cut ? CUT : P.H; const L = cut ? 4 : 2; const along = s === 'N' || s === 'S';
  const len = along ? P.w + 2 * TW : P.d, a0 = along ? -TW : 0; const pos = s === 'N' ? -TW / 2 : s === 'S' ? P.d + TW / 2 : s === 'W' ? -TW / 2 : P.w + TW / 2;
  const seg = (u0: number, u1: number, z: number, h: number, col: RGB, st: Parameters<typeof solid>[4] = {}) => { if (u1 - u0 < 0.005 || h < 0.005) return;
    solid(sc, v, along ? { x: (u0 + u1) / 2, y: pos, z, w: u1 - u0, d: TW, h } : { x: pos, y: (u0 + u1) / 2, z, w: TW, d: u1 - u0, h }, col, { L, top: POCHE, edge: 'rgba(60,52,44,.35)', ...st }); };
  const inner = INNER[s]; const finish = spec.finish && !cut ? { face: { [inner]: spec.finish } } : {};
  if (spec.glass) {
    // sill, head, mullions; a pane in each bay; the sliding door's handle
    seg(a0, a0 + len, 0, 0.06, M.bronze, { top: tint(M.bronze, 1.2) }); if (!cut) seg(a0, a0 + len, H - 0.1, 0.1, M.bronze);
    const nb = Math.max(2, Math.round(P.w / 1.25)); const xs = Array.from({ length: nb + 1 }, (_, i) => (P.w * i) / nb);
    for (const x of xs) solid(sc, v, along ? { x, y: pos, z: 0.06, w: 0.045, d: 0.1, h: H - 0.06 } : { x: pos, y: x, z: 0.06, w: 0.1, d: 0.045, h: H - 0.06 }, M.bronze, { L, edge: null });
    for (let i = 0; i < nb; i++) { const u0 = xs[i]! + 0.03, u1 = xs[i + 1]! - 0.03, z1 = cut ? H : H - 0.1; const pt = (u: number, z: number): P3 => (along ? [u, pos, z] : [pos, u, z]);
      poly(sc, L, [pt(u0, 0.06), pt(u1, 0.06), pt(u1, z1), pt(u0, z1)], { f: 'url(#rm-glass)', s: M.glassEdge, sw: 0.4, c: pt((u0 + u1) / 2, z1 / 2), pri: PRI.solid });
      if (!cut && !v.eye) { const du = u1 - u0; poly(sc, L, [pt(u0 + du * 0.18, 0.06), pt(u0 + du * 0.34, 0.06), pt(u0 + du * 0.62, z1), pt(u0 + du * 0.46, z1)], { f: 'rgba(255,255,255,.10)', s: 'none', c: pt((u0 + u1) / 2, z1 / 2 + 0.01), pri: PRI.solid + 0.01 }); } }
    if (spec.slide && !cut) { const hx = spec.slide.at - spec.slide.w / 2 + 0.12; solid(sc, v, along ? { x: hx, y: pos + (s === 'N' ? 0.09 : -0.09), z: 0.85, w: 0.03, d: 0.03, h: 0.55 } : { x: pos, y: hx, z: 0.85, w: 0.03, d: 0.03, h: 0.55 }, M.steel, { L, edge: null });
      line(sc, 1, [[spec.slide.at - spec.slide.w / 2, 0.02, 0.004], [spec.slide.at + spec.slide.w / 2, 0.02, 0.004]], { s: 'rgba(60,52,44,.5)', sw: 0.8, pri: PRI.mark }); }
    return;
  }
  const dr = spec.door; const gaps: Array<[number, number]> = dr ? [[dr.at - dr.w / 2, dr.at + dr.w / 2]] : [];
  let u = a0; for (const [g0, g1] of gaps) { seg(u, g0, 0, H, T.wall, finish); if (H > 2.1) seg(g0, g1, 2.1, H - 2.1, T.wall, finish); u = g1; } seg(u, a0 + len, 0, H, T.wall, finish);
  // skirting on the room side
  const off = s === 'N' ? 0.008 : s === 'S' ? -0.008 : s === 'W' ? 0.008 : -0.008; const ip = s === 'N' || s === 'W' ? pos + TW / 2 + off : pos - TW / 2 + off; u = along ? 0 : 0;
  const end = along ? P.w : P.d; for (const [g0, g1] of [...gaps, [end, end] as [number, number]]) { if (g0 - u > 0.02) solid(sc, v, along ? { x: (u + g0) / 2, y: ip, w: g0 - u, d: 0.016, h: Math.min(0.08, H) } : { x: ip, y: (u + g0) / 2, w: 0.016, d: g0 - u, h: Math.min(0.08, H) }, M.walnut, { L, edge: null }); u = g1; }
  if (dr) { // the door, on whichever wall it is: (u along the wall, n into the room) to the room's x, y
    const hingeAtHi = dr.hinge === 'hi'; const hu = hingeAtHi ? dr.at + dr.w / 2 - 0.03 : dr.at - dr.w / 2 + 0.03; const base = s === 'N' ? 0 : s === 'S' ? P.d : s === 'W' ? 0 : P.w; const inward = s === 'S' || s === 'E' ? -1 : 1;
    const at = (uu: number, n: number, z: number): P3 => (along ? [uu, base + inward * n, z] : [base + inward * n, uu, z]);
    if (cut) { // the door's swing, drawn on the floor as on a plan
      const r = dr.w - 0.05; line(sc, 1, Array.from({ length: 13 }, (_, i) => { const t = (i / 12) * (Math.PI / 2); return at(hu + (hingeAtHi ? -1 : 1) * Math.cos(t) * r, Math.sin(t) * r, 0.006); }), { s: 'rgba(70,60,50,.55)', sw: 0.8, da: '4 3', pri: PRI.mark });
      line(sc, 1, [at(hu, 0, 0.006), at(hu, r, 0.006)], { s: 'rgba(70,60,50,.7)', sw: 1.2, pri: PRI.mark }); }
    else { const [lx, ly] = at(hu, dr.w / 2 - 0.02, 0); solid(sc, v, along ? { x: lx, y: ly, w: 0.045, d: dr.w - 0.04, h: 2.08 } : { x: lx, y: ly, w: dr.w - 0.04, d: 0.045, h: 2.08 }, M.walnutL, { L: 3, o: 'door' }); } }
}

/** a task chair at a desk run, raised with the tier it stands on; simple at a distance where there are many */
function taskChairAt(sc: L3Scene, v: View, x: number, y: number, z: number, st: { o: string }, simple: boolean) {
  if (!z) { taskChair(sc, v, x, y, 0, M.charcoal, st, simple); return; }
  solid(sc, v, { x, y, z: z + 0.44, w: 0.48, d: 0.46, h: 0.08 }, M.charcoal, { ...st, edge: null }); solid(sc, v, { x, y: y + 0.22, z: z + 0.54, w: 0.44, d: 0.06, h: 0.5 }, M.charcoal, { ...st, edge: null, k: 0.94 });
  if (!simple) solid(sc, v, { x, y, z, w: 0.05, d: 0.05, h: 0.44 }, M.steelD, { ...st, edge: null });
}
function monitorAt(sc: L3Scene, v: View, x: number, y: number, z: number, st: { o: string }, small = false) { monitor(sc, v, x, y, z, small ? 0.48 : 0.62, small ? 0.28 : 0.36, small ? 160 : 180, st); }
/** a dining chair drawn simply (seat and back), where a room has many */
function simpleChair(sc: L3Scene, v: View, x: number, y: number, rot: number, st: { o: string }) {
  const [bx, by] = frame(x, y, rot)(0, 0.21); solid(sc, v, { x, y, z: 0.42, w: 0.46, d: 0.46, h: 0.06, rot }, T.chair, { ...st, edge: null }); solid(sc, v, { x: bx, y: by, z: 0.48, w: 0.44, d: 0.05, h: 0.4, rot }, T.chair, { ...st, edge: null, k: 0.95 });
}

function piece(sc: L3Scene, v: View, P: Program, p: Piece) {
  const st = { o: p.id }; const rot = p.rot || 0;
  switch (p.kind) {
    case 'rail': { shadow(sc, 1, p.x, p.y, p.w, p.d, 0, 0.003, 0.6);
      for (const s of [-1, 1]) solid(sc, v, { x: p.x + s * (p.w / 2 - 0.12), y: p.y + 0.06, w: 0.06, d: 0.2, h: p.h - 0.04 }, M.black, { ...st, edge: null });
      solid(sc, v, { x: p.x, y: p.y + 0.12, z: p.h - 0.18, w: p.w - 0.04, d: 0.06, h: 0.14 }, M.walnut, st);
      solid(sc, v, { x: p.x, y: p.y, z: p.h - 0.04, w: p.w, d: p.d, h: 0.04 }, M.quartz, { ...st, top: 'url(#rm-stone)' });
      // what is on it: a few glasses and a bowl, so it reads as in use
      if (p.w > 2) for (let i = 0; i < 3; i++) { const gx = p.x - p.w / 2 + p.w * (0.22 + i * 0.29); lathe(sc, v, gx, p.y + 0.04, p.h, 0.035, 0.12, [205, 222, 226], { o: p.id, r1: 0.04, n: 10, a: 0.55, edge: 'rgba(120,140,150,.6)' });
        if (i === 1) lathe(sc, v, gx + 0.32, p.y - 0.02, p.h, 0.07, 0.05, M.cream, { o: p.id, r1: 0.1, n: 14 }); }
      break; }
    case 'stools': for (const [x, y] of p.at || []) stool(sc, v, x, y, p.h, M.leather, st, true, rot); break;
    case 'bar': counter(sc, v, p.x, p.y, p.w, p.d, p.h, rot, M.walnut, M.quartz, { ...st, glass: [[p.w / 2 - 0.66, p.w / 2 - 0.06]] }); break;
    case 'shelves': shelves(sc, v, p.x, p.y, p.w, rot, p.z || 1.4, (p.z || 1.4) + p.h, 3, st); break;
    case 'rug': { const r = (x: number, y: number, w: number, d: number): Array<[number, number]> => [[x - w / 2, y - d / 2], [x + w / 2, y - d / 2], [x + w / 2, y + d / 2], [x - w / 2, y + d / 2]];
      flat(sc, 1, r(p.x, p.y, p.w, p.d), 0.004, '#6f7c80', { pri: PRI.rug, o: p.id }); flat(sc, 1, r(p.x, p.y, p.w - 0.2, p.d - 0.2), 0.005, '#a9b3b2', { pri: PRI.rug + 0.05, o: p.id }); flat(sc, 1, r(p.x, p.y, p.w - 0.34, p.d - 0.34), 0.0055, '#b9c1bf', { pri: PRI.rug + 0.06, o: p.id }); break; }
    case 'sofa': sofa(sc, v, p.x, p.y, rot, p.w, T.sofa, st, 3); break;
    case 'armchair': sofa(sc, v, p.x, p.y, rot, p.w, T.chair, st, 1); break;
    case 'lowtable': lowTable(sc, v, p.x, p.y, p.w, p.d, st, rot); break;
    case 'hightable': table(sc, v, p.x, p.y, p.w, p.d, p.h, M.quartz, M.black, st, true);
      for (const [x, y] of p.at || []) stool(sc, v, x, y, 0.76, M.leather, st, true, (Math.atan2(p.x - x, -(p.y - y)) * 180) / Math.PI); break;
    case 'table': table(sc, v, p.x, p.y, p.w, p.d, p.h, M.oak, M.walnut, st); for (const [x, y] of p.at || []) chair(sc, v, x, y, (Math.atan2(p.x - x, -(p.y - y)) * 180) / Math.PI, T.chair, st); break;
    case 'pendants': for (const s of [-1, 1]) pendant(sc, v, p.x + s * 0.2, p.y, p.z || 1.9, P.H, st); break;
    case 'plant': plant(sc, v, p.x, p.y, p.h, st); break;
    case 'display': display(sc, v, p.x, p.y, p.z || 1.35, p.w, p.h, rot, st); break;
    case 'panel': solid(sc, v, { x: p.x, y: p.y, z: p.z || 1.2, w: p.w, d: 0.025, h: p.h, rot }, M.black, { ...st, face: { N: 'url(#rm-panel)' } }); break;
    case 'seats': { const n = p.n ?? 6, sp = n > 6 ? p.w / n : 0.62; for (let i = 0; i < n; i++) { const x = p.x + (i - (n - 1) / 2) * sp;
      if (n <= 12) stadiumSeat(sc, v, x, p.y, p.z || 0, 0, M.charcoal, { ...st, L: 1.5 });
      else { solid(sc, v, { x, y: p.y, z: (p.z || 0) + 0.36, w: 0.48, d: 0.44, h: 0.08 }, M.charcoal, { ...st, L: 1.5, edge: null }); solid(sc, v, { x, y: p.y + 0.22, z: (p.z || 0) + 0.42, w: 0.48, d: 0.07, h: 0.5 }, M.charcoal, { ...st, L: 1.5, edge: null, k: 0.94 }); } } break; }
    case 'chairs': for (const [x, y] of p.at || []) chair(sc, v, x, y, rot, T.chair, st); break;
    case 'taskchairs': for (const [x, y] of p.at || []) taskChair(sc, v, x, y, rot, M.charcoal, st); break;
    case 'vanity': counter(sc, v, p.x, p.y, p.w, p.d, p.h, 180, M.walnut, M.quartz, { ...st, doors: Math.max(2, Math.round(p.w / 0.5)) }); mirror(sc, v, p.x, 0.03, 1.05, p.w - 0.1, 0.8, 180, st, true); break;
    case 'mirror': mirror(sc, v, p.x, p.y, p.z || 0.3, p.w, p.h, rot, st); break;
    case 'clock': solid(sc, v, { x: p.x, y: p.y, z: p.z || 1.8, w: p.w, d: p.d, h: p.h, rot }, M.black, { ...st, face: { N: 'url(#rm-timer)' } }); break;
    case 'mark': for (const [a, b, c, d] of [[-1, -1, 1, -0.94], [-1, 0.94, 1, 1], [-1, -1, -0.94, 1], [0.94, -1, 1, 1]] as const) flat(sc, 1, [[p.x + a * p.w / 2, p.y + b * p.d / 2], [p.x + c * p.w / 2, p.y + b * p.d / 2], [p.x + c * p.w / 2, p.y + d * p.d / 2], [p.x + a * p.w / 2, p.y + d * p.d / 2]], 0.004, '#e8c14a', { pri: PRI.mark, o: p.id }); break;
    case 'taskdesk': { const P2 = frame(p.x, p.y, rot); table(sc, v, p.x, p.y, p.w, p.d, p.h, M.oak, M.black, st, false, rot); const [mx, my] = P2(0, -p.d / 2 + 0.16); monitor(sc, v, mx, my, p.h, 0.6, 0.35, rot + 180, st);
      const [cx, cy] = P2(0, p.d / 2 + 0.3); taskChair(sc, v, cx, cy, rot, M.charcoal, st); break; }
    case 'deskrun': { const z0 = p.z || 0; solid(sc, v, { x: p.x, y: p.y, z: z0 + p.h - 0.035, w: p.w, d: p.d, h: 0.035 }, M.oak, { ...st, L: 3 }); solid(sc, v, { x: p.x, y: p.y - p.d / 2 + 0.03, z: z0 + 0.1, w: p.w - 0.1, d: 0.025, h: p.h - 0.15 }, M.charcoal, { ...st, edge: null });
      const at = p.at || []; const many = at.length > 10; const every = p.n ? Math.max(1, Math.round(at.length / p.n)) : 0;
      at.forEach(([x, y], i) => { const z = z0; const o = (fx: number, fy: number) => [x + fx, y + fy] as const; taskChairAt(sc, v, x, y, z, st, many);
        if (every && i % every === Math.floor(every / 2)) monitorAt(sc, v, x + (many ? 0 : 0.42), p.y - p.d / 2 + 0.16, z + p.h, st, !many);   // at a booth's few positions, the monitor sits to the side, clear of the view
        if (p.kind === 'deskrun' && p.note?.includes('headset')) { const [hx, hy] = o(0.2, -0.95); solid(sc, v, { x: hx, y: hy, z: z + p.h, w: 0.18, d: 0.16, h: 0.05 }, M.black, { ...st, bevel: 0.03, edge: null }); } }); break; }
    case 'unit': solid(sc, v, { x: p.x, y: p.y, z: p.z || 0.74, w: p.w, d: p.d, h: p.h }, M.charcoal, { ...st, top: 'url(#rm-faders)' }); break;
    case 'platform': platform(sc, v, p.x, p.y, p.w, p.d, p.h, [128, 118, 106], st); break;
    case 'steps': { const n = Math.max(2, Math.round(p.h / 0.2)); for (let i = 0; i < n; i++) solid(sc, v, { x: p.x, y: p.y - p.d / 2 + (p.d * (i + 0.5)) / n, w: p.w, d: p.d / n, h: (p.h * (i + 1)) / n }, [128, 118, 106], { ...st, L: 2.5, top: tint([128, 118, 106], 1.04) }); break; }
    case 'console': mixConsole(sc, v, p.x, p.y, p.w, p.d, rot, st); break;
    case 'rack': rack(sc, v, p.x, p.y, p.h, rot, st); break;
    case 'pod': { const x0 = p.x - p.w / 2, x1 = p.x + p.w / 2, y0 = p.y - p.d / 2, y1 = p.y + p.d / 2;
      glassWall(sc, v, x0, y0, x1, y0, p.h, st); glassWall(sc, v, x0, y1, x1, y1, p.h, st); glassWall(sc, v, x0, y0, x0, y1, p.h, st, 0.9);
      table(sc, v, p.x + 0.2, p.y, 1.8, 0.9, 0.74, M.oak, M.walnut, st); for (const [dx, dy] of [[-0.55, -0.72], [0.15, -0.72], [0.85, -0.72], [-0.55, 0.72], [0.15, 0.72], [0.85, 0.72]] as const) chair(sc, v, p.x + 0.2 + dx, p.y + dy, dy < 0 ? 0 : 180, T.chair, st); break; }
    case 'tables4': { const many = (p.at || []).length > 12; for (const [x, y] of p.at || []) { table(sc, v, x, y, 0.9, 0.9, p.h, M.oak, M.walnut, st, true);
      for (const [dx, dy, r] of [[0, -0.66, 180], [0, 0.66, 0], [-0.66, 0, -90], [0.66, 0, 90]] as const) { if (many) simpleChair(sc, v, x + dx, y + dy, r, st); else chair(sc, v, x + dx, y + dy, r, T.chair, st); } } break; }
    case 'island': { const P2 = frame(p.x, p.y, 0); counter(sc, v, p.x, p.y - p.d / 2 + 0.33, p.w, 0.66, p.h, 0, M.walnut, M.quartz, st); counter(sc, v, p.x, p.y + p.d / 2 - 0.33, p.w, 0.66, 0.92, 180, M.walnut, M.quartz, { ...st, glass: [[-p.w / 2 + 0.1, -p.w / 2 + 1.3]] });
      shelves(sc, v, p.x, p.y + 0.05, p.w - 1.2, 0, 1.2, 1.9, 3, st); const n = Math.max(3, Math.floor((p.w - 0.6) / 0.7)); for (let i = 0; i < n; i++) { const [sx, sy] = P2(-p.w / 2 + 0.6 + (i * (p.w - 1.2)) / Math.max(1, n - 1), -p.d / 2 - 0.25); stool(sc, v, sx, sy, 0.76, M.leather, st, true); } break; }
    case 'column': { solid(sc, v, { x: p.x, y: p.y, w: p.w, d: p.d, h: p.h }, M.plaster, { ...st, top: 'rgb(58,54,50)' }); display(sc, v, p.x, p.y - p.d / 2 - 0.03, 2.1, 1.43, 0.82, 0, st); display(sc, v, p.x, p.y + p.d / 2 + 0.03, 2.1, 1.43, 0.82, 180, st); break; }
    case 'ledwall': solid(sc, v, { x: p.x, y: p.y, z: p.z || 1, w: p.w, d: p.d, h: p.h, rot: 180 }, M.black, { ...st, face: { N: 'url(#rm-board)' } }); break;
    // ---- V2.5.3's objects, drawn with the kit (./fromV253.ts)
    case 'chair1': chair(sc, v, p.x, p.y, rot, T.chair, st); break;
    case 'table0': table(sc, v, p.x, p.y, p.w, p.d, p.h, M.oak, M.walnut, st, false, rot); break;
    case 'credenza': counter(sc, v, p.x, p.y, Math.max(p.w, p.d), Math.min(p.w, p.d), p.h, rot, M.walnut, M.quartz, st); break;
    case 'controldesk': { table(sc, v, p.x, p.y, p.w, p.d, p.h, M.oak, M.black, st, false, rot); const n = Math.max(1, Math.min(4, Math.floor(p.w / 0.9)));
      for (let i = 0; i < n; i++) monitor(sc, v, p.x - p.w / 2 + (p.w * (i + 0.5)) / n, p.y - p.d / 4, p.h, 0.55, 0.32, 180, st); break; }
    case 'lectern': { solid(sc, v, { x: p.x, y: p.y, w: p.w * 0.9, d: p.d * 0.8, h: p.h - 0.08, rot }, M.walnut, st); solid(sc, v, { x: p.x, y: p.y, z: p.h - 0.08, w: p.w, d: p.d, h: 0.05, rot }, M.walnutL, { ...st, bevel: 0.03 }); break; }
    case 'touch': solid(sc, v, { x: p.x, y: p.y, z: p.z, w: Math.max(0.2, p.w), d: Math.max(0.14, p.d), h: 0.04 }, M.black, { ...st, top: 'url(#rm-panel)' }); break;
    case 'videobar': solid(sc, v, { x: p.x, y: p.y, z: p.z, w: p.w, d: Math.max(0.08, p.d), h: Math.max(0.08, p.h), rot }, M.charcoal, { ...st, bevel: 0.02 }); break;
    case 'camera': { solid(sc, v, { x: p.x, y: p.y, z: p.z, w: Math.max(0.16, p.w), d: Math.max(0.14, p.d), h: Math.max(0.12, p.h), rot }, M.charcoal, { ...st, bevel: 0.03 }); const [lx, ly] = frame(p.x, p.y, rot)(0, -Math.max(0.14, p.d) / 2); lathe(sc, v, lx, ly, (p.z || 0) + 0.02, 0.04, 0.08, M.black, { ...st, n: 10 }); break; }
    case 'stage': platform(sc, v, p.x, p.y, p.w, p.d, p.h, [96, 74, 56], st); break;
    case 'divider': solid(sc, v, { x: p.x, y: p.y, w: p.w, d: p.d, h: p.h }, [176, 170, 160], { ...st, bevel: 0.02 }); break;
    case 'wireless': lathe(sc, v, p.x, p.y, p.z || 0, 0.03, Math.max(0.15, p.h), M.black, { ...st, n: 8 }); break;
    case 'seatblock': { const many = (p.at || []).length > 40; for (const [x, y] of p.at || []) { if (many) simpleChair(sc, v, x, y, rot, st); else chair(sc, v, x, y, rot, T.chair, st); } break; }
    case 'ceildev': if (p.label.toLowerCase().includes('microphone')) solid(sc, v, { x: p.x, y: p.y, z: Math.min(p.z || P.H - 0.05, P.H - 0.04), w: p.w, d: p.d, h: 0.035 }, [238, 236, 231], { ...st, bevel: 0.05 });
      else lathe(sc, v, p.x, p.y, Math.min(p.z || P.H - 0.05, P.H - 0.04), Math.max(0.08, p.w / 2), 0.03, [244, 242, 237], { ...st, n: 14 }); break;
    case 'ceildev-hidden': break;
    // ---- equipment (./equipment.ts): drawn in front of what holds it when equipment is shown, as an x-ray of the cabinet
    case 'rackdev': solid(sc, v, { x: p.x, y: p.y, z: p.z, w: p.w, d: p.d, h: p.h, rot }, M.black, { ...st, L: 4.5, face: { N: 'url(#rm-rackface)', S: 'url(#rm-rackface)' }, edge: 'rgba(120,200,190,.7)' }); break;
    // a device's position on the record, wall- or rack-mounted: an enclosure with the unit's front
    case 'rackpos': solid(sc, v, { x: p.x, y: p.y, z: p.z, w: p.w, d: p.d, h: p.h, rot }, M.charcoal, { ...st, face: { N: 'url(#rm-rackface)', S: 'url(#rm-rackface)', E: 'url(#rm-rackface)', W: 'url(#rm-rackface)' }, bevel: 0.02 }); break;
    case 'headset': { lathe(sc, v, p.x - 0.06, p.y, p.z || 0, 0.045, 0.04, M.black, { ...st, n: 10 }); lathe(sc, v, p.x + 0.06, p.y, p.z || 0, 0.045, 0.04, M.black, { ...st, n: 10 }); solid(sc, v, { x: p.x, y: p.y, z: (p.z || 0) + 0.04, w: 0.16, d: 0.02, h: 0.02 }, M.charcoal, { ...st, edge: null }); solid(sc, v, { x: p.x + 0.08, y: p.y - 0.06, z: (p.z || 0) + 0.02, w: 0.012, d: 0.12, h: 0.012 }, M.black, { ...st, edge: null }); break; }
    case 'lipmic': solid(sc, v, { x: p.x, y: p.y, z: p.z || 0, w: p.w, d: p.d, h: p.h, rot }, M.black, { ...st, bevel: 0.01 }); break;
    case 'intercom': solid(sc, v, { x: p.x, y: p.y, z: p.z || 0, w: p.w, d: p.d, h: p.h, rot }, M.charcoal, { ...st, top: 'url(#rm-keys)' }); break;
    case 'floorbox': solid(sc, v, { x: p.x, y: p.y, z: p.z || 0, w: p.w, d: p.d, h: Math.max(0.02, p.h), rot }, M.steel, { ...st, top: 'url(#rm-floorbox)' }); break;
    case 'speakerbox': solid(sc, v, { x: p.x, y: p.y, z: p.z || 0, w: p.w, d: p.d, h: p.h, rot: rot || 180 }, M.black, { ...st, face: { N: 'url(#rm-woofer)' }, bevel: 0.01 }); break;
    case 'wap': lathe(sc, v, p.x, p.y, (p.z || P.H - 0.05) - 0.03, 0.11, 0.03, [246, 246, 243], { ...st, n: 14 }); break;
    case 'box': solid(sc, v, { x: p.x, y: p.y, z: p.z, w: p.w, d: p.d, h: p.h, rot }, M.stone, st); break;
    // ---- Empathia's fixture rules (./fromFixtures.ts); fixtures are axis-aligned boxes, `rot` says which way they face
    case 'fx-stall': { shadow(sc, 1, p.x, p.y, p.w, p.d, 0, 0.003, 0.6); for (const sx of [-1, 1]) solid(sc, v, { x: p.x + sx * (p.w / 2 - 0.015), y: p.y, z: 0.15, w: 0.03, d: p.d, h: 1.85 }, [214, 210, 202], { ...st, edge: 'rgba(120,110,100,.4)' });
      solid(sc, v, { x: p.x, y: p.y - p.d / 2 + 0.015, z: 0.15, w: p.w - 0.06, d: 0.03, h: 1.85 }, [96, 128, 132], { ...st, edge: 'rgba(60,70,72,.6)' });
      lathe(sc, v, p.x, p.y + p.d / 4, 0, 0.19, 0.4, [246, 246, 243], { ...st, r1: 0.21, n: 14 }); solid(sc, v, { x: p.x, y: p.y + p.d / 2 - 0.1, z: 0.4, w: 0.42, d: 0.16, h: 0.38 }, [246, 246, 243], { ...st, bevel: 0.02 }); break; }
    case 'fx-counter': { const side = Math.abs(rot) === 90; const len = side ? p.d : p.w, dep = side ? p.w : p.d; const steel = /cooking|prep|island|back counter/i.test(p.label);
      counter(sc, v, p.x, p.y, len, dep, p.h, rot, steel ? M.steel : M.walnut, steel ? M.steel : M.quartz, { ...st, doors: Math.max(1, Math.round(len / 0.6)) });
      const m = /(\d+) basin/.exec(p.label); if (m) { const n = Number(m[1]); for (let i = 0; i < n; i++) lathe(sc, v, p.x - len / 2 + (len * (i + 0.5)) / n, p.y, p.h - 0.02, 0.17, 0.03, [250, 250, 248], { ...st, n: 14 });
        if (p.y < 1) mirror(sc, v, p.x, 0.03, 1.15, len - 0.1, 0.85, 180, st); } break; }
    case 'fx-small': solid(sc, v, { x: p.x, y: p.y, z: 1.0, w: p.w, d: p.d, h: Math.min(0.35, p.h), rot }, M.steel, { ...st, bevel: 0.02 }); break;
    case 'fx-fridge': { shadow(sc, 1, p.x, p.y, p.w, p.d); solid(sc, v, { x: p.x, y: p.y, w: p.w, d: p.d, h: p.h }, M.steel, { ...st, face: { [rot === 90 ? 'E' : rot === -90 ? 'W' : rot === 180 ? 'S' : 'N']: 'url(#rm-fridge)' } }); break; }
    case 'fx-shelf': { shadow(sc, 1, p.x, p.y, p.w, p.d, 0, 0.003, 0.6); const steel = M.steelD; for (const [ux, uy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) solid(sc, v, { x: p.x + ux * (p.w / 2 - 0.02), y: p.y + uy * (p.d / 2 - 0.02), w: 0.035, d: 0.035, h: p.h }, steel, { ...st, edge: null });
      // the boards are drawn in bays, each with what stands on it, so a long run sorts correctly against the cartons on it
      const nb = Math.max(3, Math.round(p.h / 0.5)); const nbx = Math.max(1, Math.floor(p.w / 0.45)); const bw = p.w / nbx;
      for (let i = 0; i < nb; i++) { const z = 0.1 + ((p.h - 0.15) * i) / (nb - 1); for (let j = 0; j < nbx; j++) { const bx = p.x - p.w / 2 + bw * (j + 0.5);
        solid(sc, v, { x: bx, y: p.y, z, w: bw, d: p.d, h: 0.025 }, M.steel, { ...st, edge: null });
        if (i < nb - 1 && (i * 3 + j) % 4 !== 0) solid(sc, v, { x: bx, y: p.y, z: z + 0.025, w: Math.min(0.36, bw - 0.06), d: Math.min(0.38, p.d - 0.06), h: 0.26 + ((i + j) % 3) * 0.04 }, [176, 142, 102], { ...st, edge: 'rgba(110,84,56,.5)', k: 0.94 + ((i + j) % 3) * 0.03 }); } } break; }
    case 'fx-kiosk': { shadow(sc, 1, p.x, p.y, p.w, p.d); solid(sc, v, { x: p.x, y: p.y, w: p.w, d: p.d, h: p.h, rot }, M.charcoal, { ...st, face: { N: 'url(#rm-panel)' }, bevel: 0.02 }); break; }
    case 'fx-table': table(sc, v, p.x, p.y, p.w, p.d, p.h, M.oak, M.walnut, st, p.w < 1.2 && p.d < 1.2); break;
    case 'fx-chair': chair(sc, v, p.x, p.y, rot, T.chair, st); break;
    case 'fx-sofa': sofa(sc, v, p.x, p.y, rot, Math.max(p.w, p.d), p.w > 1.4 || p.d > 1.4 ? T.sofa : T.chair, st, p.w > 1.4 || p.d > 1.4 ? 3 : 1); break;
    case 'fx-machine': { shadow(sc, 1, p.x, p.y, p.w, p.d); solid(sc, v, { x: p.x, y: p.y, w: p.w, d: p.d, h: p.h, rot }, [236, 236, 232], { ...st, face: { N: 'url(#rm-washer)' }, bevel: 0.03 }); break; }
    case 'fx-rack': rack(sc, v, p.x, p.y, p.h, rot, st); break;
    case 'fx-cabinet': { shadow(sc, 1, p.x, p.y, p.w, p.d); solid(sc, v, { x: p.x, y: p.y, w: p.w, d: p.d, h: p.h, rot }, /board|panel/i.test(p.label) ? [150, 64, 58] : M.steel, { ...st, bevel: 0.02 }); break; }
    case 'fx-plant': { shadow(sc, 1, p.x, p.y, p.w, p.d); solid(sc, v, { x: p.x, y: p.y, w: p.w, d: p.d, h: p.h }, /pump/i.test(p.label) ? [88, 128, 104] : M.steel, { ...st, face: { N: 'url(#rm-grille)', S: 'url(#rm-grille)' }, bevel: 0.03 });
      lathe(sc, v, p.x + p.w / 2 - 0.15, p.y, p.h, 0.09, 0.6, M.steelD, { ...st, n: 10 }); break; }
    case 'fx-bed': { shadow(sc, 1, p.x, p.y, p.w, p.d); for (const [ux, uy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) solid(sc, v, { x: p.x + ux * (p.w / 2 - 0.06), y: p.y + uy * (p.d / 2 - 0.06), w: 0.04, d: 0.04, h: 0.55 }, M.steel, { ...st, edge: null });
      solid(sc, v, { x: p.x, y: p.y, z: 0.55, w: p.w, d: p.d, h: 0.12 }, [214, 222, 226], { ...st, bevel: 0.05 }); solid(sc, v, { x: p.x, y: p.y + p.d / 2 - 0.22, z: 0.67, w: p.w - 0.2, d: 0.3, h: 0.08 }, [244, 244, 240], { ...st, bevel: 0.04 }); break; }
    case 'fx-locker': { shadow(sc, 1, p.x, p.y, p.w, p.d, 0, 0.003, 0.6); solid(sc, v, { x: p.x, y: p.y, w: p.w, d: p.d, h: p.h, rot }, [118, 140, 152], { ...st, face: { N: 'url(#rm-lockers)' } }); break; }
    case 'fx-bench': { solid(sc, v, { x: p.x, y: p.y, z: p.h - 0.04, w: p.w, d: p.d, h: 0.04 }, M.oak, st); for (const ux of [-1, 1]) solid(sc, v, { x: p.x + ux * (p.w / 2 - 0.1), y: p.y, w: 0.05, d: p.d - 0.06, h: p.h - 0.04 }, M.steelD, { ...st, edge: null }); break; }
    case 'fx-booth': { flat(sc, 1, [[p.x - p.w / 2, p.y - p.d / 2], [p.x + p.w / 2, p.y - p.d / 2], [p.x + p.w / 2, p.y + p.d / 2], [p.x - p.w / 2, p.y + p.d / 2]], 0.006, '#5d6f7d', { pri: PRI.rug, o: p.id });
      solid(sc, v, { x: p.x, y: p.y + p.d / 2 - 0.04, w: p.w, d: 0.08, h: p.h }, [236, 232, 226], { ...st, face: { N: 'url(#rm-board)' } }); solid(sc, v, { x: p.x - p.w / 2 + 0.04, y: p.y + p.d / 4, w: 0.08, d: p.d / 2, h: p.h }, [236, 232, 226], st);
      counter(sc, v, p.x + p.w / 4, p.y - p.d / 2 + 0.4, 1.2, 0.5, 1.0, 0, [236, 232, 226], M.quartz, { ...st, doors: 1 }); break; }
    case 'fx-mat': flat(sc, 1, [[p.x - p.w / 2, p.y - p.d / 2], [p.x + p.w / 2, p.y - p.d / 2], [p.x + p.w / 2, p.y + p.d / 2], [p.x - p.w / 2, p.y + p.d / 2]], 0.01, '#4f7d64', { pri: PRI.rug, o: p.id, s: 'rgba(30,50,40,.5)', sw: 0.6 }); break;
    default: solid(sc, v, { x: p.x, y: p.y, z: p.z, w: p.w, d: p.d, h: p.h, rot }, M.stone, st);
  }
}

/** The room scene: shell, light, pieces, outside; a button on each piece; names when asked for (and always on the selected piece). */
export function roomScene(P: Program, v: View, o: { sel: string | null; names: boolean; equip?: boolean }): L3Scene {
  T = THEMES[P.world || 'enterprise'];
  const full = !!v.eye; const yMin = P.outside === 'suite' ? -2.3 : -0.3;
  const sc = scene(P.w / 2, (P.d + yMin) / 2, Math.hypot(P.w + 0.6, P.d - yMin + 0.6) / 2, P.H);
  // From an eye, shapes are painted by tier, then distance; but the room's floor must cover the bowl below it and its walls must cover
  // what is behind them, so the part of the world the eye is not in is painted first, whole (room first from the balcony; bowl first
  // from inside)
  const outside: Array<[number, number]> = [], shell: Array<[number, number]> = []; const track = (into: Array<[number, number]>, f: () => void) => { const a = sc.items.length; f(); into.push([a, sc.items.length]); };
  const inside = !!v.eye && v.eye.x >= 0 && v.eye.x <= P.w && v.eye.y >= 0 && v.eye.y <= P.d;
  // the members' corridor outside the door
  track(outside, () => flat(sc, 0.5, [[-TW, P.d + TW], [P.w + TW, P.d + TW], [P.w + TW, P.d + TW + 1.6], [-TW, P.d + TW + 1.6]], 0, 'url(#rm-carpet)', { pri: PRI.ground }));
  const s0 = sc.items.length;
  // the floor in oak boards running along the glass, three tones
  if (P.floor === 'carpet') flat(sc, 1, [[0, 0], [P.w, 0], [P.w, P.d], [0, P.d]], 0, T.carpet, { pri: PRI.ground });
  if (P.floor === 'vinyl') flat(sc, 1, [[0, 0], [P.w, 0], [P.w, P.d], [0, P.d]], 0, 'url(#rm-vinyl)', { pri: PRI.ground });
  if (P.floor === 'concrete') flat(sc, 1, [[0, 0], [P.w, 0], [P.w, P.d], [0, P.d]], 0, '#aaa59d', { pri: PRI.ground, s: 'rgba(80,76,70,.3)', sw: 0.4 });
  const nb = P.floor === 'oak' ? Math.ceil(P.d / 0.2) : 0; const tones = [M.oak, M.oak2, [204, 172, 133] as RGB];
  for (let i = 0; i < nb; i++) { const y0 = (P.d * i) / nb, y1 = (P.d * (i + 1)) / nb; let x = -((i * 0.73) % 1.4); let j = 0;
    while (x < P.w) { const len = 1.2 + ((i * 37 + j * 53) % 7) * 0.12; const a = Math.max(0, x), b = Math.min(P.w, x + len);
      if (b - a > 0.01) flat(sc, 1, [[a, y0], [b, y0], [b, y1], [a, y1]], 0, tint(tones[(i * 7 + j * 5) % 3]!, 0.97 + ((i * 13 + j * 29) % 7) * 0.01), { pri: PRI.ground, s: 'rgba(140,108,76,.35)', sw: 0.3 }); x += len; j++; } }
  // where the floor meets the walls it is a little darker (light reaches the corners less)
  for (const [a, b, c2, d2] of [[0, 0, P.w, 0.26], [0, P.d - 0.26, P.w, P.d], [0, 0, 0.26, P.d], [P.w - 0.26, 0, P.w, P.d]] as const) flat(sc, 1, [[a, b], [c2, b], [c2, d2], [a, d2]], 0.001, 'rgba(70,50,30,.07)', { pri: PRI.rug - 0.3 });
  for (const [a, b, c2, d2] of [[0, 0, P.w, 0.1], [0, P.d - 0.1, P.w, P.d], [0, 0, 0.1, P.d], [P.w - 0.1, 0, P.w, P.d]] as const) flat(sc, 1, [[a, b], [c2, b], [c2, d2], [a, d2]], 0.0012, 'rgba(70,50,30,.08)', { pri: PRI.rug - 0.29 });
  for (const [x, y] of P.lights) pool(sc, 1, x, y, 0.75);
  if (full) { // the ceiling, its downlights and loudspeakers
    flat(sc, 2, [[0, 0], [P.w, 0], [P.w, P.d], [0, P.d]], P.H, tint(M.plaster, 0.97), { pri: PRI.ground });
    for (const [x, y] of P.lights) flat(sc, 2, Array.from({ length: 14 }, (_, i) => { const t = (i / 14) * Math.PI * 2; return [x + Math.cos(t) * 0.065, y + Math.sin(t) * 0.065] as [number, number]; }), P.H - 0.002, '#fff4d8', { pri: PRI.ground + 0.6, s: 'rgba(0,0,0,.18)', sw: 0.4 });
    for (const [x, y] of P.speakers) flat(sc, 2, Array.from({ length: 18 }, (_, i) => { const t = (i / 18) * Math.PI * 2; return [x + Math.cos(t) * 0.11, y + Math.sin(t) * 0.11] as [number, number]; }), P.H - 0.002, '#f6f4ef', { pri: PRI.ground + 0.6, s: '#c9c3b8', sw: 0.6, o: 'speakers' }); }
  for (const s of ['N', 'E', 'S', 'W'] as Side[]) wall(sc, v, P, s);
  shell.push([s0, sc.items.length]);
  const ok = P.outside; if (ok) track(outside, () => bowlOutside(sc, v, P.w, full, ok));
  const shown = P.pieces.filter((p) => { const m = mountOf(p, P); return (!p.eqOnly || o.equip) && (!m || !cutWall(P, v, m)); });
  for (const p of shown) { if (p.y < 0) track(outside, () => piece(sc, v, P, p)); else piece(sc, v, P, p); }
  // with equipment shown: the cable runs, by kind, along their routes (in the ceiling void, down the walls, in the floor boxes)
  if (o.equip) for (const r of P.runs || []) line(sc, 3, r.pts, { s: RUN_COLOUR[r.kind], sw: 2.2, c: r.pts[Math.floor(r.pts.length / 2)], pri: 0.5 });
  if (v.eye) for (const [a, b] of inside ? outside : shell) for (let i = a; i < b; i++) { const it = sc.items[i] as { pri?: number }; it.pri = (it.pri || 0) - 20; }
  // buttons for big things first and small ones (a camera on a credenza, a panel on a table) last, so the small one is on top where they overlap
  for (const p of [...shown].sort((a, b) => b.w * b.d - a.w * a.d)) { if (p.kind === 'rug' || p.kind === 'ceildev-hidden') continue;
    // V2.5.3's chairs and seat blocks are picked by tapping them, as in V2.5.3, not by a button each (a button per chair covers the equipment)
    const tapOnly = p.kind === 'chair1' || p.kind === 'seatblock'; const at: P3 = p.kind === 'stools' || p.kind === 'seats' ? [p.x, p.y, (p.z || 0) + p.h * 0.7] : [p.x, p.y, (p.z || 0) + p.h * 0.7];
    if (o.names || o.sel === p.id) label(sc, [p.x, p.y, (p.z || 0) + p.h + 0.12], p.label.replace(/ \(\d+\)$/, ''), { cls: o.sel === p.id ? undefined : 'soft', on: o.sel === p.id, o: p.id, keep: o.sel === p.id });
    if (!tapOnly) hit(sc, at, { o: p.id, r: 12, label: `${p.label}. Shows what it is.`, testId: `rm-piece-${p.id}` }); }
  if (full) { if (o.names || o.sel === 'speakers') for (const [x, y] of P.speakers) label(sc, [x, y, P.H - 0.05], 'Ceiling loudspeaker', { cls: 'soft', o: 'speakers' }); for (const [x, y] of P.speakers.slice(0, 1)) hit(sc, [x, y, P.H - 0.05], { o: 'speakers', r: 12, label: 'Ceiling loudspeakers. Shows what they are.', testId: 'rm-piece-speakers' }); }
  return sc;
}

/** The kit's materials as SVG paint: glass, light pools, a display's picture, a refrigerator's glass door, slatted timber, the corridor's
 *  carpet, LED boards, the far stand's lit suites, the video board, the sky. */
export function roomDefs(): string {
  return `<linearGradient id="rm-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="rgb(222,238,245)" stop-opacity=".34"/><stop offset=".5" stop-color="rgb(176,208,224)" stop-opacity=".12"/><stop offset="1" stop-color="rgb(230,242,247)" stop-opacity=".26"/></linearGradient>
<radialGradient id="rm-pool"><stop offset="0" stop-color="#fff1d2" stop-opacity=".55"/><stop offset=".6" stop-color="#ffecc6" stop-opacity=".18"/><stop offset="1" stop-color="#ffe9c0" stop-opacity="0"/></radialGradient>
<linearGradient id="rm-scr-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#20434f"/><stop offset="1" stop-color="#2f7470"/></linearGradient>
<linearGradient id="rm-scr-grass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3f8a45"/><stop offset=".5" stop-color="#5aa553"/><stop offset="1" stop-color="#3f8a45"/></linearGradient>
<pattern id="rm-screen" width="1" height="1" patternContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#rm-scr-sky)"/><rect y=".42" width="1" height=".58" fill="url(#rm-scr-grass)"/><rect y=".34" width="1" height=".08" fill="#2c6d6c"/><rect x=".06" y=".08" width=".34" height=".09" fill="#101417" opacity=".85"/><rect x=".07" y=".1" width=".1" height=".05" fill="#45c1b4"/><rect x="0" y=".72" width="1" height=".006" fill="#eef" opacity=".7"/></pattern>
<linearGradient id="rm-stone" x1="0" y1="0" x2="1" y2=".6"><stop offset="0" stop-color="#f4f1ec"/><stop offset=".35" stop-color="#ebe7e0"/><stop offset=".42" stop-color="#dcd7cf"/><stop offset=".5" stop-color="#efebe5"/><stop offset=".78" stop-color="#e6e1d9"/><stop offset="1" stop-color="#f2efe9"/></linearGradient>
<linearGradient id="rm-panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#244a52"/><stop offset="1" stop-color="#3f8f93"/></linearGradient>
<linearGradient id="rm-fridge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4a50" stop-opacity=".92"/><stop offset=".5" stop-color="#6f8a8f" stop-opacity=".85"/><stop offset="1" stop-color="#2e3a3f" stop-opacity=".92"/></linearGradient>
<pattern id="rm-slats" width="7" height="12" patternUnits="userSpaceOnUse"><rect width="7" height="12" fill="#7a573f"/><rect x="5" width="2" height="12" fill="#563c2b"/></pattern>
<pattern id="rm-carpet" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#555b60"/><circle cx="2.5" cy="2.5" r=".9" fill="#61686d"/><circle cx="7.5" cy="7.5" r=".9" fill="#4d5257"/></pattern>
<linearGradient id="rm-led" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1c6d6c"/><stop offset=".3" stop-color="#43c1b4"/><stop offset=".5" stop-color="#e9f6f2"/><stop offset=".7" stop-color="#43c1b4"/><stop offset="1" stop-color="#1c6d6c"/></linearGradient>
<pattern id="rm-suites" width="14" height="10" patternUnits="userSpaceOnUse"><rect width="14" height="10" fill="#2a3036"/><rect x="1.5" y="2" width="10" height="6" fill="#d9b884" opacity=".85"/></pattern>
<linearGradient id="rm-board" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#173b46"/><stop offset=".5" stop-color="#2b8f86"/><stop offset="1" stop-color="#0f2a33"/></linearGradient>
<pattern id="rm-seats" width="5" height="4" patternUnits="userSpaceOnUse"><rect width="5" height="4" fill="#27706f"/><rect x=".6" y=".5" width="3.6" height="1.8" rx=".6" fill="#2f8584"/><rect y="3.3" width="5" height=".7" fill="#1f5958"/></pattern>
<pattern id="rm-seats-l" width="5" height="4" patternUnits="userSpaceOnUse"><rect width="5" height="4" fill="#2c7a7b"/><rect x=".6" y=".5" width="3.6" height="1.8" rx=".6" fill="#3a9192"/><rect y="3.3" width="5" height=".7" fill="#236364"/></pattern>
<pattern id="rm-carpet2" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#8a8178"/><path d="M0 6h12M6 0v12" stroke="#83796f" stroke-width=".8"/><circle cx="3" cy="3" r=".7" fill="#938a80"/><circle cx="9" cy="9" r=".7" fill="#7d746a"/></pattern>
<linearGradient id="rm-mirror" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dfe7ea"/><stop offset=".45" stop-color="#b9c6cc"/><stop offset=".5" stop-color="#eef3f5"/><stop offset="1" stop-color="#aebbc1"/></linearGradient>
<pattern id="rm-timer" width="1" height="1" patternContentUnits="objectBoundingBox"><rect width="1" height="1" fill="#111"/><rect x=".12" y=".22" width=".76" height=".56" fill="#c8312b" opacity=".9"/><rect x=".46" y=".3" width=".06" height=".4" fill="#111"/></pattern>
<pattern id="rm-faders" width="14" height="22" patternUnits="userSpaceOnUse"><rect width="14" height="22" fill="#2a2d31"/><rect x="1" y="1" width="12" height="7" fill="#33373c"/><circle cx="4" cy="3" r="1.3" fill="#8b9096"/><circle cx="10" cy="3" r="1.3" fill="#8b9096"/><circle cx="7" cy="6" r="1.1" fill="#c9a64a"/><rect x="6.4" y="10" width="1.2" height="11" fill="#15171a"/><rect x="5" y="14" width="4" height="2.2" rx=".5" fill="#e3e3e3"/></pattern>
<pattern id="rm-meters" width="1" height="1" patternContentUnits="objectBoundingBox"><rect width="1" height="1" fill="#15171a"/><rect x=".05" y=".25" width=".9" height=".5" fill="#2b6f74"/><rect x=".05" y=".55" width=".9" height=".12" fill="#7ecf6a"/></pattern>
<pattern id="rm-rackface" width="1" height="1" patternContentUnits="objectBoundingBox"><rect width="1" height="1" fill="#1b1d20"/><rect x=".08" y=".08" width=".84" height=".14" fill="#2c2f33"/><rect x=".08" y=".28" width=".84" height=".14" fill="#2c2f33"/><rect x=".08" y=".48" width=".84" height=".14" fill="#2c2f33"/><circle cx=".82" cy=".15" r=".02" fill="#4fd17a"/><circle cx=".82" cy=".35" r=".02" fill="#4fd17a"/></pattern>
<pattern id="rm-vinyl" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#c9c3b8"/><rect width="10" height="10" fill="#c4beb2"/><rect x="10" y="10" width="10" height="10" fill="#c4beb2"/></pattern>
<pattern id="rm-washer" width="1" height="1" patternContentUnits="objectBoundingBox"><rect width="1" height="1" fill="#ecece8"/><rect y=".05" width="1" height=".14" fill="#d8d8d3"/><circle cx=".5" cy=".58" r=".27" fill="#9aa3a8"/><circle cx=".5" cy=".58" r=".19" fill="#4d5a61"/></pattern>
<pattern id="rm-lockers" width="9" height="40" patternUnits="userSpaceOnUse"><rect width="9" height="40" fill="#7d939f"/><rect x="8.2" width=".8" height="40" fill="#5b6e78"/><rect x="5.5" y="17" width="1.6" height=".7" fill="#d9dfe2"/><rect x="1.5" y="3" width="4" height=".5" fill="#6a7f8a"/><rect x="1.5" y="4.4" width="4" height=".5" fill="#6a7f8a"/></pattern>
<pattern id="rm-grille" width="6" height="4" patternUnits="userSpaceOnUse"><rect width="6" height="4" fill="#99a0a6"/><rect y="2.6" width="6" height="1" fill="#7c838a"/></pattern>
<pattern id="rm-carpet-ent" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#7b8189"/><path d="M0 6h12" stroke="#757b83" stroke-width=".8"/><circle cx="3" cy="3" r=".7" fill="#858b93"/></pattern>
<pattern id="rm-carpet-uni" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#7f8a76"/><path d="M6 0v12" stroke="#78836f" stroke-width=".8"/><circle cx="9" cy="3" r=".7" fill="#89947f"/></pattern>
<pattern id="rm-carpet-cnv" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#4d5870"/><path d="M0 0l12 12" stroke="#56627a" stroke-width=".8"/><circle cx="3" cy="9" r=".7" fill="#5f6b83"/></pattern>
<pattern id="rm-keys" width="1" height="1" patternContentUnits="objectBoundingBox"><rect width="1" height="1" fill="#2a2d31"/><g fill="#5fb6ad"><rect x=".06" y=".2" width=".1" height=".25"/><rect x=".2" y=".2" width=".1" height=".25"/><rect x=".34" y=".2" width=".1" height=".25"/><rect x=".48" y=".2" width=".1" height=".25"/></g><g fill="#c9a64a"><rect x=".62" y=".2" width=".1" height=".25"/><rect x=".76" y=".2" width=".1" height=".25"/></g><rect x=".06" y=".6" width=".8" height=".2" fill="#15171a"/></pattern>
<pattern id="rm-floorbox" width="1" height="1" patternContentUnits="objectBoundingBox"><rect width="1" height="1" fill="#9aa0a6"/><rect x=".1" y=".1" width=".8" height=".8" fill="#80868c"/><rect x=".2" y=".2" width=".25" height=".25" fill="#2f6b6c"/><rect x=".55" y=".2" width=".25" height=".25" fill="#2f6b6c"/><rect x=".2" y=".55" width=".25" height=".25" fill="#e8e8e8"/><rect x=".55" y=".55" width=".25" height=".25" fill="#e8e8e8"/></pattern>
<pattern id="rm-woofer" width="1" height="1" patternContentUnits="objectBoundingBox"><rect width="1" height="1" fill="#1b1d20"/><circle cx=".5" cy=".62" r=".3" fill="#3a3d42"/><circle cx=".5" cy=".62" r=".12" fill="#15171a"/><circle cx=".5" cy=".2" r=".09" fill="#3a3d42"/></pattern>
<linearGradient id="rm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d84a3"/><stop offset=".55" stop-color="#a9b8c6"/><stop offset="1" stop-color="#e3d1b6"/></linearGradient>`;
}
