/**
 * What a stadium suite looks out on (13 Nov 2026): its balcony of padded seats stepping down from the glass, the neighbouring suites'
 * balconies behind glass partitions, and — from an occupant's eyes — the whole bowl: the lower tier raking down to the LED perimeter boards,
 * the pitch with its markings and goals, the far stand with its own suite level and roof, the end stands and a video board. Harborlight
 * Stadium is fictional; this is a modelled bowl at the scale of a 60,000-seat venue, not a survey of any real one.
 */
import { poly, line, type L3Scene, type P3 } from '../l3.js';
import { solid, flat, M, PRI, tint, type View } from './kit.js';

const TILE = '#c9c3b8', CONC = '#8f8a83';
const q = (sc: L3Scene, L: number, p: P3[], f: string, pri: number, extra: { s?: string; sw?: number } = {}) => poly(sc, L, p, { f, s: extra.s ?? 'none', sw: extra.sw, pri });

/** A neighbouring suite's balcony seat, simplified (two solids). */
function farSeat(sc: L3Scene, v: View, x: number, y: number, z: number) {
  solid(sc, v, { x, y, z: z + 0.36, w: 0.48, d: 0.44, h: 0.08 }, M.charcoal, { L: 1.5, edge: null });
  solid(sc, v, { x, y: y + 0.22, z: z + 0.42, w: 0.48, d: 0.07, h: 0.5 }, M.charcoal, { L: 1.5, edge: null, k: 0.94 });
}

/** The balcony and, when `full` (seen from someone's eyes), the bowl. `w` is the suite's width along the glass. */
export function suiteOutside(sc: L3Scene, v: View, w: number, full: boolean) {
  const cx = w / 2, ext = full ? 3 * w : Math.min(2.4, w * 0.32); const X0 = -ext, X1 = w + ext; const L = 1.5;
  // the balcony: a tread a step down from the room, a second one lower, the parapet with a glass balustrade and a handrail
  q(sc, L, [[X0, 0, -0.12], [X1, 0, -0.12], [X1, -1.05, -0.12], [X0, -1.05, -0.12]], TILE, PRI.terrain - 0.2);
  q(sc, L, [[X0, -1.05, -0.12], [X1, -1.05, -0.12], [X1, -1.05, -0.52], [X0, -1.05, -0.52]], tint(M.stone, 0.86), PRI.terrain - 0.15);
  q(sc, L, [[X0, -1.05, -0.52], [X1, -1.05, -0.52], [X1, -2.0, -0.52], [X0, -2.0, -0.52]], tint([201, 195, 184], 0.95), PRI.terrain - 0.2);
  q(sc, L, [[X0, 0, 0], [X1, 0, 0], [X1, 0, -0.12], [X0, 0, -0.12]], tint(M.stone, 0.8), PRI.terrain - 0.15);
  solid(sc, v, { x: (X0 + X1) / 2, y: -2.1, z: -0.52, w: X1 - X0, d: 0.2, h: 0.3 }, M.concrete, { L, pri: PRI.terrain });
  q(sc, L, [[X0, -2.08, -0.22], [X1, -2.08, -0.22], [X1, -2.08, 0.55], [X0, -2.08, 0.55]], 'url(#rm-glass)', PRI.solid, { s: M.glassEdge, sw: 0.5 });
  solid(sc, v, { x: (X0 + X1) / 2, y: -2.08, z: 0.55, w: X1 - X0, d: 0.06, h: 0.045 }, M.bronze, { L, edge: null });
  // glass partitions between the suites' balconies
  for (let k = Math.ceil(X0 / w); k * w <= X1 + 0.01; k++) { const x = k * w;
    poly(sc, L, [[x, 0, 1.25], [x, 0, -0.12], [x, -1.05, -0.12], [x, -1.05, -0.52], [x, -2.0, -0.52], [x, -2.0, 1.25]], { f: 'url(#rm-glass)', s: M.glassEdge, sw: 0.5, pri: PRI.solid }); }
  // the neighbours' seats (ours are the room's own pieces, selectable)
  for (let k = Math.ceil(X0 / w); k * w < X1; k++) { if (k === 0) continue;
    for (const [y, z] of [[-0.55, -0.12], [-1.5, -0.52]] as const) for (let i = 0; i < 6; i++) { const x = k * w + w / 2 + (i - 2.5) * 0.62; if (x > X0 + 0.3 && x < X1 - 0.3) farSeat(sc, v, x, y, z); } }
  if (!full) {
    // from outside the room, a hint of the lower tier below the balcony
    for (let r = 0; r < 4; r++) { const y0 = -2.45 - r * 0.8, z = -2.4 - r * 0.4;
      q(sc, 0.5, [[X0, y0, z], [X1, y0, z], [X1, y0 - 0.8, z], [X0, y0 - 0.8, z]], CONC, PRI.terrain - 0.3);
      q(sc, 0.5, [[X0, y0 - 0.2, z], [X1, y0 - 0.2, z], [X1, y0 - 0.2, z + 0.42], [X0, y0 - 0.2, z + 0.42]], tint(r % 2 ? M.seatL : M.seat, 1), PRI.terrain); }
    return;
  }
  // ---- the bowl, seen from inside
  // the floor above overhangs the balcony
  q(sc, L, [[X0, 0.2, 3.05], [X1, 0.2, 3.05], [X1, -2.35, 3.05], [X0, -2.35, 3.05]], '#d8d3cb', PRI.terrain);
  for (let x = X0 + 1.2; x < X1; x += 2.5) flat(sc, L, Array.from({ length: 10 }, (_, i) => { const t = (i / 10) * Math.PI * 2; return [x + Math.cos(t) * 0.07, -1.1 + Math.sin(t) * 0.07] as [number, number]; }), 3.04, '#fff3d6', { pri: PRI.terrain + 0.05 });
  // the lower tier, raking down to the pitch: treads, then the seat backs (seen from behind) in blocks between the aisles
  const rows = 26, B0 = cx - 62, B1 = cx + 62;
  for (let r = 0; r < rows; r++) { const y0 = -2.45 - r * 0.8, z = -2.4 - r * 0.4;
    q(sc, 0.5, [[B0, y0, z], [B1, y0, z], [B1, y0 - 0.8, z], [B0, y0 - 0.8, z]], r % 2 ? '#928d86' : CONC, PRI.terrain - 0.2);
    const col = tint(r % 2 ? M.seatL : M.seat, 1 - r * 0.004);
    for (let a = -4; a <= 4; a++) { const s0 = Math.max(B0, cx + a * 14 - 6.45), s1 = Math.min(B1, cx + a * 14 + 6.45);
      q(sc, 0.5, [[s0, y0 - 0.22, z], [s1, y0 - 0.22, z], [s1, y0 - 0.22, z + 0.44], [s0, y0 - 0.22, z + 0.44]], col, PRI.terrain); } }
  const zp = -2.4 - rows * 0.4 - 0.9, yb = -2.45 - rows * 0.8 - 1.2, yt = yb - 6.5, yf = yt - 68 - 7, PL = 105, PW = 68;
  // perimeter LED boards facing the stand, the grass, the pitch in mown stripes, its markings and goals
  q(sc, 0.5, [[cx - 60, yb, zp + 0.9], [cx + 60, yb, zp + 0.9], [cx + 60, yb, zp], [cx - 60, yb, zp]], 'url(#rm-led)', PRI.terrain + 0.1);
  q(sc, 0, [[cx - 70, yb, zp], [cx + 70, yb, zp], [cx + 70, yf, zp], [cx - 70, yf, zp]], '#4f8446', PRI.ground - 0.5);
  for (let i = 0; i < 18; i++) { const x0 = cx - PL / 2 + (i * PL) / 18, x1 = x0 + PL / 18; q(sc, 0, [[x0, yt, zp], [x1, yt, zp], [x1, yt - PW, zp], [x0, yt - PW, zp]], i % 2 ? '#5c9a4d' : '#529146', PRI.ground); }
  const W = 'rgba(250,250,244,.92)', z1 = zp + 0.01, lin = (pts: Array<[number, number]>, z = z1) => line(sc, 0, pts.map(([x, y]) => [x, y, z] as P3), { s: W, sw: 2.2, pri: PRI.mark });
  const xa = cx - PL / 2, xb = cx + PL / 2, ym = yt - PW / 2;
  lin([[xa, yt], [xb, yt], [xb, yt - PW], [xa, yt - PW], [xa, yt]]); lin([[cx, yt], [cx, yt - PW]]);
  lin(Array.from({ length: 41 }, (_, i) => { const t = (i / 40) * Math.PI * 2; return [cx + Math.cos(t) * 9.15, ym + Math.sin(t) * 9.15] as [number, number]; }));
  for (const s of [-1, 1]) { const g = s < 0 ? xa : xb, i16 = g - s * 16.5, i5 = g - s * 5.5;
    lin([[g, ym - 20.16], [i16, ym - 20.16], [i16, ym + 20.16], [g, ym + 20.16]]); lin([[g, ym - 9.16], [i5, ym - 9.16], [i5, ym + 9.16], [g, ym + 9.16]]);
    line(sc, 0, [[g, ym - 3.66, zp], [g, ym - 3.66, zp + 2.44], [g, ym + 3.66, zp + 2.44], [g, ym + 3.66, zp]], { s: '#ffffff', sw: 2.6, pri: PRI.mark + 0.1 });
    q(sc, 0, [[g, ym - 3.66, zp + 2.44], [g + s * 2, ym - 3.66, zp + 1.4], [g + s * 2, ym + 3.66, zp + 1.4], [g, ym + 3.66, zp + 2.44]], 'rgba(235,235,230,.35)', PRI.mark); }
  // the far stand: a lower tier, a level of suites (lit glass), an upper tier, the roof with its lights
  const S0 = cx - 66, S1 = cx + 66; let y = yf, z = zp + 1.0;
  const band = (y0: number, z0: number, dy: number, dz: number, i: number, x0 = S0, x1 = S1) => q(sc, 0.5, [[x0, y0, z0], [x1, y0, z0], [x1, y0 - dy, z0 + dz], [x0, y0 - dy, z0 + dz]], i % 2 ? tint(M.seatL, 0.9) : tint(M.seat, 0.92), PRI.terrain);
  q(sc, 0.5, [[S0, yf + 0.4, zp], [S1, yf + 0.4, zp], [S1, yf + 0.4, zp + 1.0], [S0, yf + 0.4, zp + 1.0]], 'url(#rm-led)', PRI.terrain + 0.1);
  for (let i = 0; i < 7; i++) { band(y, z, 2.6, 1.25, i); y -= 2.6; z += 1.25; }
  q(sc, 0.5, [[S0, y, z], [S1, y, z], [S1, y, z + 3.6], [S0, y, z + 3.6]], 'url(#rm-suites)', PRI.terrain + 0.1); z += 3.6; y -= 1.5;
  q(sc, 0.5, [[S0, y + 1.5, z], [S1, y + 1.5, z], [S1, y, z], [S0, y, z]], '#5a5d61', PRI.terrain);
  for (let i = 0; i < 8; i++) { band(y, z, 2.4, 1.55, i + 1); y -= 2.4; z += 1.55; }
  for (let a = -4; a <= 4; a++) { const x = cx + a * 14; q(sc, 0.5, [[x - 0.6, yf, zp + 1], [x + 0.6, yf, zp + 1], [x + 0.6, yf - 18.2, zp + 9.75], [x - 0.6, yf - 18.2, zp + 9.75]], '#a39e96', PRI.terrain + 0.05); }
  const zr = z + 4.5; q(sc, 0.5, [[S0 - 4, y, z - 1], [S1 + 4, y, z - 1], [S1 + 4, y, zr], [S0 - 4, y, zr]], '#45484d', PRI.terrain + 0.08);
  q(sc, 0.5, [[S0 - 4, y, zr], [S1 + 4, y, zr], [S1 + 4, yf + 6, zr], [S0 - 4, yf + 6, zr]], '#3a3d42', PRI.solid);
  q(sc, 0.5, [[S0 - 4, yf + 6, zr], [S1 + 4, yf + 6, zr], [S1 + 4, yf + 6, zr - 0.9], [S0 - 4, yf + 6, zr - 0.9]], '#2b2e32', PRI.solid + 0.01);
  for (let x = S0; x <= S1; x += 9) q(sc, 0.5, [[x, yf + 6.05, zr - 0.75], [x + 3.2, yf + 6.05, zr - 0.75], [x + 3.2, yf + 6.05, zr - 0.45], [x, yf + 6.05, zr - 0.45]], 'rgba(255,250,232,.96)', PRI.solid + 0.02);
  // the end stands, raking up from each goal line, and a video board on one of them
  for (const s of [-1, 1]) { const xe = s < 0 ? xa - 8 : xb + 8; let x = xe, ze = zp + 1.0; const Y0 = yt + 3, Y1 = yt - PW - 3;
    q(sc, 0.5, [[x - s * 0.4, Y0, zp], [x - s * 0.4, Y1, zp], [x - s * 0.4, Y1, zp + 1], [x - s * 0.4, Y0, zp + 1]], 'url(#rm-led)', PRI.terrain + 0.1);
    for (let i = 0; i < 12; i++) { q(sc, 0.5, [[x, Y0, ze], [x, Y1, ze], [x + s * 2.6, Y1, ze + 1.3], [x + s * 2.6, Y0, ze + 1.3]], i % 2 ? tint(M.seatL, 0.88) : tint(M.seat, 0.9), PRI.terrain); x += s * 2.6; ze += 1.3; }
    q(sc, 0.5, [[x + s * 2, Y0 + 4, ze + 5], [x + s * 2, Y1 - 4, ze + 5], [x - s * 14, Y1 - 4, ze + 5], [x - s * 14, Y0 + 4, ze + 5]], '#3a3d42', PRI.solid);
    q(sc, 0.5, [[x, Y0 + 4, ze - 1], [x, Y1 - 4, ze - 1], [x, Y1 - 4, ze + 5], [x, Y0 + 4, ze + 5]], '#45484d', PRI.terrain + 0.08);
    if (s < 0) q(sc, 0.5, [[x - s * 13.9, ym - 8, ze + 4.4], [x - s * 13.9, ym + 8, ze + 4.4], [x - s * 13.9, ym + 8, ze - 0.4], [x - s * 13.9, ym - 8, ze - 0.4]], 'url(#rm-board)', PRI.solid + 0.05, { s: '#16181b', sw: 4 }); }
}
