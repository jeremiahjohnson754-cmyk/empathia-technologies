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

const T = 0.14, CUT = 0.34, POCHE = 'rgb(58,54,50)';
const NORMAL: Record<Side, [number, number]> = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };
const INNER: Record<Side, 'N' | 'S' | 'E' | 'W'> = { N: 'S', S: 'N', W: 'E', E: 'W' };

/** the side a wall-mounted piece hangs on, if it hangs on one */
const MOUNTED = new Set(['display', 'panel', 'shelves', 'mirror', 'clock', 'ledwall']);
const mountOf = (p: Piece, P: Program): Side | null => !MOUNTED.has(p.kind) ? null : p.x < 0.3 ? 'W' : p.x > P.w - 0.3 ? 'E' : p.y > P.d - 0.3 ? 'S' : p.y < 0.3 ? 'N' : null;
/** whether a wall is cut low (it stands between the orbiting camera and the room) */
export function cutWall(P: Program, v: View, s: Side): boolean { if (v.eye) return false; const [nx, ny] = NORMAL[s]; const mid: Record<Side, [number, number]> = { N: [P.w / 2, 0], S: [P.w / 2, P.d], W: [0, P.d / 2], E: [P.w, P.d / 2] }; return sees(v, nx, ny, mid[s][0], mid[s][1]); }

function wall(sc: L3Scene, v: View, P: Program, s: Side) {
  const spec = P.walls[s]; if (spec.none) return; const cut = cutWall(P, v, s); const H = spec.parapet ? (cut ? Math.min(CUT, spec.parapet) : spec.parapet) : cut ? CUT : P.H; const L = cut ? 4 : 2; const along = s === 'N' || s === 'S';
  const len = along ? P.w + 2 * T : P.d, a0 = along ? -T : 0; const pos = s === 'N' ? -T / 2 : s === 'S' ? P.d + T / 2 : s === 'W' ? -T / 2 : P.w + T / 2;
  const seg = (u0: number, u1: number, z: number, h: number, col: RGB, st: Parameters<typeof solid>[4] = {}) => { if (u1 - u0 < 0.005 || h < 0.005) return;
    solid(sc, v, along ? { x: (u0 + u1) / 2, y: pos, z, w: u1 - u0, d: T, h } : { x: pos, y: (u0 + u1) / 2, z, w: T, d: u1 - u0, h }, col, { L, top: POCHE, edge: 'rgba(60,52,44,.35)', ...st }); };
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
  let u = a0; for (const [g0, g1] of gaps) { seg(u, g0, 0, H, M.plaster, finish); if (H > 2.1) seg(g0, g1, 2.1, H - 2.1, M.plaster, finish); u = g1; } seg(u, a0 + len, 0, H, M.plaster, finish);
  // skirting on the room side
  const off = s === 'N' ? 0.008 : s === 'S' ? -0.008 : s === 'W' ? 0.008 : -0.008; const ip = s === 'N' || s === 'W' ? pos + T / 2 + off : pos - T / 2 + off; u = along ? 0 : 0;
  const end = along ? P.w : P.d; for (const [g0, g1] of [...gaps, [end, end] as [number, number]]) { if (g0 - u > 0.02) solid(sc, v, along ? { x: (u + g0) / 2, y: ip, w: g0 - u, d: 0.016, h: Math.min(0.08, H) } : { x: ip, y: (u + g0) / 2, w: 0.016, d: g0 - u, h: Math.min(0.08, H) }, M.walnut, { L, edge: null }); u = g1; }
  if (dr) { const hingeAtHi = dr.hinge === 'hi'; const hx = hingeAtHi ? dr.at + dr.w / 2 - 0.03 : dr.at - dr.w / 2 + 0.03; const inward = s === 'S' ? -1 : 1;
    if (cut) { // the door's swing, drawn on the floor as on a plan
      line(sc, 1, Array.from({ length: 13 }, (_, i) => { const t = (i / 12) * (Math.PI / 2); const r = dr.w - 0.05; const dx = (hingeAtHi ? -1 : 1) * Math.cos(t) * r, dy = inward * Math.sin(t) * r; return [hx + dx, P.d + dy, 0.006] as P3; }), { s: 'rgba(70,60,50,.55)', sw: 0.8, da: '4 3', pri: PRI.mark });
      line(sc, 1, [[hx, P.d, 0.006], [hx, P.d + inward * (dr.w - 0.05), 0.006]], { s: 'rgba(70,60,50,.7)', sw: 1.2, pri: PRI.mark }); }
    else solid(sc, v, { x: hx, y: P.d + inward * (dr.w / 2 - 0.02), w: 0.045, d: dr.w - 0.04, h: 2.08 }, M.walnutL, { L: 3, o: 'door' }); }
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
  const [bx, by] = frame(x, y, rot)(0, 0.21); solid(sc, v, { x, y, z: 0.42, w: 0.46, d: 0.46, h: 0.06, rot }, M.camel, { ...st, edge: null }); solid(sc, v, { x: bx, y: by, z: 0.48, w: 0.44, d: 0.05, h: 0.4, rot }, M.camel, { ...st, edge: null, k: 0.95 });
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
    case 'sofa': sofa(sc, v, p.x, p.y, rot, p.w, M.teal, st, 3); break;
    case 'armchair': sofa(sc, v, p.x, p.y, rot, p.w, M.camel, st, 1); break;
    case 'lowtable': lowTable(sc, v, p.x, p.y, p.w, p.d, st, rot); break;
    case 'hightable': table(sc, v, p.x, p.y, p.w, p.d, p.h, M.quartz, M.black, st, true);
      for (const [x, y] of p.at || []) stool(sc, v, x, y, 0.76, M.leather, st, true, (Math.atan2(p.x - x, -(p.y - y)) * 180) / Math.PI); break;
    case 'table': table(sc, v, p.x, p.y, p.w, p.d, p.h, M.oak, M.walnut, st); for (const [x, y] of p.at || []) chair(sc, v, x, y, (Math.atan2(p.x - x, -(p.y - y)) * 180) / Math.PI, M.camel, st); break;
    case 'pendants': for (const s of [-1, 1]) pendant(sc, v, p.x + s * 0.2, p.y, p.z || 1.9, P.H, st); break;
    case 'plant': plant(sc, v, p.x, p.y, p.h, st); break;
    case 'display': display(sc, v, p.x, p.y, p.z || 1.35, p.w, p.h, rot, st); break;
    case 'panel': solid(sc, v, { x: p.x, y: p.y, z: p.z || 1.2, w: p.w, d: 0.025, h: p.h, rot }, M.black, { ...st, face: { N: 'url(#rm-panel)' } }); break;
    case 'seats': { const n = p.n ?? 6, sp = n > 6 ? p.w / n : 0.62; for (let i = 0; i < n; i++) { const x = p.x + (i - (n - 1) / 2) * sp;
      if (n <= 12) stadiumSeat(sc, v, x, p.y, p.z || 0, 0, M.charcoal, { ...st, L: 1.5 });
      else { solid(sc, v, { x, y: p.y, z: (p.z || 0) + 0.36, w: 0.48, d: 0.44, h: 0.08 }, M.charcoal, { ...st, L: 1.5, edge: null }); solid(sc, v, { x, y: p.y + 0.22, z: (p.z || 0) + 0.42, w: 0.48, d: 0.07, h: 0.5 }, M.charcoal, { ...st, L: 1.5, edge: null, k: 0.94 }); } } break; }
    case 'chairs': for (const [x, y] of p.at || []) chair(sc, v, x, y, rot, M.camel, st); break;
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
      table(sc, v, p.x + 0.2, p.y, 1.8, 0.9, 0.74, M.oak, M.walnut, st); for (const [dx, dy] of [[-0.55, -0.72], [0.15, -0.72], [0.85, -0.72], [-0.55, 0.72], [0.15, 0.72], [0.85, 0.72]] as const) chair(sc, v, p.x + 0.2 + dx, p.y + dy, dy < 0 ? 0 : 180, M.camel, st); break; }
    case 'tables4': { const many = (p.at || []).length > 12; for (const [x, y] of p.at || []) { table(sc, v, x, y, 0.9, 0.9, p.h, M.oak, M.walnut, st, true);
      for (const [dx, dy, r] of [[0, -0.66, 180], [0, 0.66, 0], [-0.66, 0, -90], [0.66, 0, 90]] as const) { if (many) simpleChair(sc, v, x + dx, y + dy, r, st); else chair(sc, v, x + dx, y + dy, r, M.camel, st); } } break; }
    case 'island': { const P2 = frame(p.x, p.y, 0); counter(sc, v, p.x, p.y - p.d / 2 + 0.33, p.w, 0.66, p.h, 0, M.walnut, M.quartz, st); counter(sc, v, p.x, p.y + p.d / 2 - 0.33, p.w, 0.66, 0.92, 180, M.walnut, M.quartz, { ...st, glass: [[-p.w / 2 + 0.1, -p.w / 2 + 1.3]] });
      shelves(sc, v, p.x, p.y + 0.05, p.w - 1.2, 0, 1.2, 1.9, 3, st); const n = Math.max(3, Math.floor((p.w - 0.6) / 0.7)); for (let i = 0; i < n; i++) { const [sx, sy] = P2(-p.w / 2 + 0.6 + (i * (p.w - 1.2)) / Math.max(1, n - 1), -p.d / 2 - 0.25); stool(sc, v, sx, sy, 0.76, M.leather, st, true); } break; }
    case 'column': { solid(sc, v, { x: p.x, y: p.y, w: p.w, d: p.d, h: p.h }, M.plaster, { ...st, top: 'rgb(58,54,50)' }); display(sc, v, p.x, p.y - p.d / 2 - 0.03, 2.1, 1.43, 0.82, 0, st); display(sc, v, p.x, p.y + p.d / 2 + 0.03, 2.1, 1.43, 0.82, 180, st); break; }
    case 'ledwall': solid(sc, v, { x: p.x, y: p.y, z: p.z || 1, w: p.w, d: p.d, h: p.h, rot: 180 }, M.black, { ...st, face: { N: 'url(#rm-board)' } }); break;
    default: solid(sc, v, { x: p.x, y: p.y, z: p.z, w: p.w, d: p.d, h: p.h, rot }, M.stone, st);
  }
}

/** The room scene: shell, light, pieces, outside; a button on each piece; names when asked for (and always on the selected piece). */
export function roomScene(P: Program, v: View, o: { sel: string | null; names: boolean }): L3Scene {
  const full = !!v.eye; const yMin = P.outside === 'suite' ? -2.3 : -0.3;
  const sc = scene(P.w / 2, (P.d + yMin) / 2, Math.hypot(P.w + 0.6, P.d - yMin + 0.6) / 2, P.H);
  // From an eye, shapes are painted by tier, then distance; but the room's floor must cover the bowl below it and its walls must cover
  // what is behind them, so the part of the world the eye is not in is painted first, whole (room first from the balcony; bowl first
  // from inside)
  const outside: Array<[number, number]> = [], shell: Array<[number, number]> = []; const track = (into: Array<[number, number]>, f: () => void) => { const a = sc.items.length; f(); into.push([a, sc.items.length]); };
  const inside = !!v.eye && v.eye.x >= 0 && v.eye.x <= P.w && v.eye.y >= 0 && v.eye.y <= P.d;
  // the members' corridor outside the door
  track(outside, () => flat(sc, 0.5, [[-T, P.d + T], [P.w + T, P.d + T], [P.w + T, P.d + T + 1.6], [-T, P.d + T + 1.6]], 0, 'url(#rm-carpet)', { pri: PRI.ground }));
  const s0 = sc.items.length;
  // the floor in oak boards running along the glass, three tones
  if (P.floor === 'carpet') flat(sc, 1, [[0, 0], [P.w, 0], [P.w, P.d], [0, P.d]], 0, 'url(#rm-carpet2)', { pri: PRI.ground });
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
  const shown = P.pieces.filter((p) => { const m = mountOf(p, P); return !m || !cutWall(P, v, m); });
  for (const p of shown) { if (p.y < 0) track(outside, () => piece(sc, v, P, p)); else piece(sc, v, P, p); }
  if (v.eye) for (const [a, b] of inside ? outside : shell) for (let i = a; i < b; i++) { const it = sc.items[i] as { pri?: number }; it.pri = (it.pri || 0) - 20; }
  for (const p of shown) { if (p.kind === 'rug') continue; const at: P3 = p.kind === 'stools' || p.kind === 'seats' ? [p.x, p.y, (p.z || 0) + p.h * 0.7] : [p.x, p.y, (p.z || 0) + p.h * 0.7];
    if (o.names || o.sel === p.id) label(sc, [p.x, p.y, (p.z || 0) + p.h + 0.12], p.label.replace(/ \(\d+\)$/, ''), { cls: o.sel === p.id ? undefined : 'soft', on: o.sel === p.id, o: p.id, keep: o.sel === p.id });
    hit(sc, at, { o: p.id, r: 12, label: `${p.label}. Shows what it is.`, testId: `rm-piece-${p.id}` }); }
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
<linearGradient id="rm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d84a3"/><stop offset=".55" stop-color="#a9b8c6"/><stop offset="1" stop-color="#e3d1b6"/></linearGradient>`;
}
