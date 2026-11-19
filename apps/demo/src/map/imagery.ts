/**
 * Empathia Map imagery (task #234; founder 18 Nov 13:51: "our other version of the maps … like the satellite imagery and our map style
 * that's close to google but it's different if someone really looks at it"). Two ground images of the fictional Northstar campus, painted
 * in the browser from the canonical building footprints (campus/canon.ts), never fetched and never real imagery:
 *   - IMAGERY: a synthetic aerial view — mown lawns, a pitch, a pond, a ring road with its markings, car parks with stalls and cars, paved
 *     plazas and paths, woodland, and the sun's shadows of buildings and trees (sun from the north-west, so shadows fall to the south-east);
 *   - MAP: our own street style — warm paper land, parks, water, roads with casings, footprints, dashed paths.
 * Everything is deterministic (one seed), in metres: 1 V2.5.3 map unit = 40 m. The same layout places the 3D trees and buildings.
 */
import type { Building } from '../campus/canon.js';

export const U = 40;                       // metres per V2.5.3 map unit
export const GROUND = { x0: -150, z0: -170, size: 680 };   // the painted square, metres
export const TEX = 2048;
export const STOREY = 4.2;                 // metres per floor (MODELED: the canon has floor counts, not heights)

export interface Rect { x: number; z: number; w: number; d: number }
export interface Tree { x: number; z: number; r: number; h: number; tone: number }
export interface Layout { foot: Record<string, Rect>; ring: Rect & { r: number; lane: number }; roads: Array<[number, number, number, number, number]>; lots: Rect[]; pitch: Rect; pond: { x: number; z: number; rx: number; rz: number }; plaza: Rect; paths: Array<[number, number, number, number, number, number]>; trees: Tree[] }

const rng = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x - m && x < r.x + r.w + m && z > r.z - m && z < r.z + r.d + m;

/** the campus layout in metres, derived from the building footprints (so a moved building moves its paths, shadows and trees) */
export function layoutOf(B: Building[]): Layout {
  const foot = Object.fromEntries(B.map((b) => [b.key, { x: b.map.x * U, z: b.map.y * U, w: b.map.w * U, d: b.map.d * U }]));
  const all = Object.values(foot); const minX = Math.min(...all.map((r) => r.x)), maxX = Math.max(...all.map((r) => r.x + r.w)), minZ = Math.min(...all.map((r) => r.z)), maxZ = Math.max(...all.map((r) => r.z + r.d));
  const ring = { x: minX - 38, z: minZ - 42, w: maxX - minX + 76, d: maxZ - minZ + 84, r: 46, lane: 12 };
  const cx = ring.x + ring.w / 2;
  const roads: Layout['roads'] = [
    [cx, ring.z + ring.d, cx, GROUND.z0 + GROUND.size, 16],                 // the entrance boulevard to the south
    [ring.x, ring.z + ring.d * 0.45, GROUND.x0, ring.z + ring.d * 0.45, 11], // the west road
    [ring.x + ring.w, ring.z + ring.d * 0.3, GROUND.x0 + GROUND.size, ring.z + ring.d * 0.22, 11],
  ];
  const lots: Rect[] = [{ x: cx - 150, z: ring.z + ring.d + 22, w: 118, d: 74 }, { x: cx + 34, z: ring.z + ring.d + 22, w: 104, d: 74 }, { x: ring.x + ring.w - 120, z: ring.z - 96, w: 112, d: 66 }];
  const hub = foot['ATL'] || all[0]!; const plaza = { x: hub.x - 16, z: hub.z - 16, w: hub.w + 32, d: hub.d + 32 };
  // the pitch and the pond sit in the largest open spaces east of the hub, if the footprints leave room (they do for the canon)
  const pitch = { x: maxX - 96, z: minZ + 6, w: 92, d: 58 }; const pond = { x: maxX - 44, z: maxZ - 44, rx: 38, rz: 25 };
  const paths: Layout['paths'] = [];
  for (const r of all) { if (r === hub) continue; const sx = hub.x + hub.w / 2, sz = hub.z + hub.d / 2; const ex = r.x + r.w / 2, ez = r.z + r.d / 2; paths.push([sx, sz, (sx + ex) / 2 + (ez - sz) * 0.18, (sz + ez) / 2 - (ex - sx) * 0.18, ex, ez]); }
  const R = rng(4218); const trees: Tree[] = [];
  const blocked = (x: number, z: number) => all.some((f) => inR(f, x, z, 9)) || inR(plaza, x, z, 4) || lots.some((l) => inR(l, x, z, 5)) || inR(pitch, x, z, 6) || ((x - pond.x) / (pond.rx + 6)) ** 2 + ((z - pond.z) / (pond.rz + 6)) ** 2 < 1
    || roads.some(([x0, z0, x1, z1, w]) => segDist(x, z, x0, z0, x1, z1) < w / 2 + 5) || Math.abs(ringDist(ring, x, z)) < ring.lane / 2 + 5;
  for (let i = 0; i < 2600 && trees.length < 900; i++) {
    const x = GROUND.x0 + R() * GROUND.size, z = GROUND.z0 + R() * GROUND.size; if (blocked(x, z)) continue;
    const outside = ringDist(ring, x, z) > 18; const inside = ringDist(ring, x, z) < -10;
    if (!outside && !inside) continue; if (inside && R() > 0.16) continue; if (outside && R() > 0.85) continue;
    trees.push({ x, z, r: (outside ? 4.5 : 3.6) + R() * 3, h: 7 + R() * 7, tone: R() });
  }
  return { foot, ring, roads, lots, pitch, pond, plaza, paths, trees };
}
function segDist(px: number, pz: number, x0: number, z0: number, x1: number, z1: number) { const dx = x1 - x0, dz = z1 - z0; const t = Math.max(0, Math.min(1, ((px - x0) * dx + (pz - z0) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(px - (x0 + t * dx), pz - (z0 + t * dz)); }
/** signed distance to the ring road's centre line (a rounded rectangle): negative inside */
function ringDist(r: Layout['ring'], x: number, z: number) { const cx = r.x + r.w / 2, cz = r.z + r.d / 2; const qx = Math.abs(x - cx) - (r.w / 2 - r.r), qz = Math.abs(z - cz) - (r.d / 2 - r.r); return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r.r; }

/** the square of ground a painting covers, in metres: the whole campus (GROUND) or, for one building's views, the ground round it at a
 *  higher resolution (Lite's building and floor, 19 Nov 2026: the same imagery, sharp at that distance) */
export interface View { x0: number; z0: number; size: number }
function noise(R: () => number, n: number, lo: number, hi: number) { const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d')!; const d = g.createImageData(n, n); for (let i = 0; i < n * n; i++) { const v = lo + (hi - lo) * R(); d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; } g.putImageData(d, 0, 0); return c; }
function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const SUN = { dx: 0.62, dz: 0.5 };   // shadow direction per metre of height (sun from the north-west, mid-afternoon in the demonstration)

/** Paint in small steps (a generator), so the page stays responsive while the imagery is made: paintAsync yields to the browser between
 *  steps (18 Nov: painted in one go it blocked the main thread for ~0.9 s in total on load). paint() runs the same steps at once. */
export function paint(mode: 'imagery' | 'map', B: Building[], L: Layout = layoutOf(B), view?: View): HTMLCanvasElement { const it = paintSteps(mode, B, L, view); let r = it.next(); while (!r.done) r = it.next(); return r.value; }
export function paintAsync(mode: 'imagery' | 'map', B: Building[], L: Layout = layoutOf(B), budget = 8, view?: View): Promise<HTMLCanvasElement> {
  const it = paintSteps(mode, B, L, view); return new Promise((ok) => { const run = () => { const t0 = performance.now(); let r = it.next(); while (!r.done && performance.now() - t0 < budget) r = it.next(); if (r.done) ok(r.value); else setTimeout(run, 0); }; setTimeout(run, 0); }); }
function* paintSteps(mode: 'imagery' | 'map', B: Building[], L: Layout, view: View = GROUND): Generator<void, HTMLCanvasElement, void> {
  const px = (v: number) => (v / view.size) * TEX;
  const X = (x: number) => px(x - view.x0), Z = (z: number) => px(z - view.z0);
  const c = document.createElement('canvas'); c.width = c.height = TEX; const g = c.getContext('2d')!; const R = rng(mode === 'imagery' ? 110 : 220);
  const ring = L.ring; const ringPath = (grow: number) => roundRect(g, X(ring.x - grow), Z(ring.z - grow), px(ring.w + grow * 2), px(ring.d + grow * 2), px(ring.r + grow));
  const im = mode === 'imagery';
  // land
  g.fillStyle = im ? '#55703a' : '#eceee6'; g.fillRect(0, 0, TEX, TEX);
  if (im) { g.imageSmoothingEnabled = true;
    // the grass texture: the coarse octaves are combined on a 512 px canvas first, so the full-size image takes two blends, not four
    { const f = document.createElement('canvas'); f.width = f.height = 512; const h = f.getContext('2d')!; h.fillStyle = '#808080'; h.fillRect(0, 0, 512, 512); h.imageSmoothingEnabled = true; for (const [n, a] of [[16, 0.55], [48, 0.4], [160, 0.3]] as const) { h.globalAlpha = a; h.globalCompositeOperation = 'overlay'; h.drawImage(noise(R, n, 30, 225), 0, 0, 512, 512); } yield;
      g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.9; g.drawImage(f, 0, 0, TEX, TEX); yield; g.globalAlpha = 0.12; g.drawImage(noise(R, 512, 40, 215), 0, 0, TEX, TEX); yield; }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // the campus inside the ring is mown: a lighter, even green with diagonal mowing stripes
    g.save(); ringPath(-ring.lane / 2 - 2); g.clip(); g.fillStyle = 'rgba(132,170,86,0.55)'; g.fillRect(0, 0, TEX, TEX);
    g.translate(TEX / 2, TEX / 2); g.rotate(-0.5); for (let i = -TEX; i < TEX; i += px(9)) { g.fillStyle = (i / px(9)) % 2 ? 'rgba(255,255,230,0.05)' : 'rgba(0,30,0,0.05)'; g.fillRect(i, -TEX, px(9), TEX * 2); } g.restore();
  } else { g.save(); ringPath(-ring.lane / 2); g.fillStyle = '#e1eadb'; g.fill(); g.restore(); }
  yield;
  // pitch
  { const p = L.pitch; if (im) { g.fillStyle = '#4f8f3c'; g.fillRect(X(p.x), Z(p.z), px(p.w), px(p.d)); for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; g.fillRect(X(p.x + (p.w / 10) * i), Z(p.z), px(p.w / 10), px(p.d)); }
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = px(0.25); g.strokeRect(X(p.x + 3), Z(p.z + 3), px(p.w - 6), px(p.d - 6)); g.beginPath(); g.moveTo(X(p.x + p.w / 2), Z(p.z + 3)); g.lineTo(X(p.x + p.w / 2), Z(p.z + p.d - 3)); g.stroke(); g.beginPath(); g.arc(X(p.x + p.w / 2), Z(p.z + p.d / 2), px(8), 0, 7); g.stroke();
    for (const e of [0, 1]) g.strokeRect(X(e ? p.x + p.w - 3 - 15 : p.x + 3), Z(p.z + p.d / 2 - 18), px(15), px(36)); }
    else { g.fillStyle = '#cfe6c4'; g.fillRect(X(p.x), Z(p.z), px(p.w), px(p.d)); g.strokeStyle = '#b4d4a7'; g.lineWidth = 2; g.strokeRect(X(p.x + 3), Z(p.z + 3), px(p.w - 6), px(p.d - 6)); } }
  // pond
  { const w = L.pond; if (im) { g.fillStyle = '#b9a77d'; g.beginPath(); g.ellipse(X(w.x), Z(w.z), px(w.rx + 2.5), px(w.rz + 2.5), 0.3, 0, 7); g.fill(); const gr = g.createRadialGradient(X(w.x - 6), Z(w.z - 4), px(2), X(w.x), Z(w.z), px(w.rx)); gr.addColorStop(0, '#3d6f86'); gr.addColorStop(1, '#2a4f5f'); g.fillStyle = gr; g.beginPath(); g.ellipse(X(w.x), Z(w.z), px(w.rx), px(w.rz), 0.3, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = px(0.6); for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(X(w.x - 8 + R() * 16), Z(w.z - 6 + R() * 12), px(6 + R() * 8), px(1 + R()), 0.3, 0, Math.PI); g.stroke(); } }
    else { g.fillStyle = '#b6d8ec'; g.beginPath(); g.ellipse(X(w.x), Z(w.z), px(w.rx), px(w.rz), 0.3, 0, 7); g.fill(); } }
  yield;
  // plaza
  { const p = L.plaza; g.fillStyle = im ? '#c9c2b4' : '#f6f2ea'; roundRect(g, X(p.x), Z(p.z), px(p.w), px(p.d), px(6)); g.fill(); if (im) { g.strokeStyle = 'rgba(80,70,60,0.18)'; g.lineWidth = 1; for (let x = p.x; x < p.x + p.w; x += 3) { g.beginPath(); g.moveTo(X(x), Z(p.z)); g.lineTo(X(x), Z(p.z + p.d)); g.stroke(); } for (let z = p.z; z < p.z + p.d; z += 3) { g.beginPath(); g.moveTo(X(p.x), Z(z)); g.lineTo(X(p.x + p.w), Z(z)); g.stroke(); } } }
  // paths (hub to each building)
  for (const [sx, sz, qx, qz, ex, ez] of L.paths) { g.lineCap = 'round'; for (const [w, col] of (im ? [[4.2, '#a39c8c'], [3.4, '#d3cdbf']] : [[4, '#ffffff']]) as Array<[number, string]>) { g.strokeStyle = col; g.lineWidth = px(w); if (!im) g.setLineDash([px(2), px(1.4)]); g.beginPath(); g.moveTo(X(sx), Z(sz)); g.quadraticCurveTo(X(qx), Z(qz), X(ex), Z(ez)); g.stroke(); g.setLineDash([]); } }
  yield;
  // roads: casing, asphalt, markings
  const asphalt = im ? '#3b3e41' : '#ffffff'; const casing = im ? '#9b978d' : '#d3d0c6';
  const drawRoads = (grow: number, col: string) => { g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = px(ring.lane + grow); ringPath(0); g.stroke(); for (const [x0, z0, x1, z1, w] of L.roads) { g.lineWidth = px(w + grow); g.beginPath(); g.moveTo(X(x0), Z(z0)); g.lineTo(X(x1), Z(z1)); g.stroke(); }
    for (const l of L.lots) { g.lineWidth = px(7 + grow); g.beginPath(); g.moveTo(X(l.x + l.w / 2), Z(l.z < ring.z ? l.z + l.d : l.z)); g.lineTo(X(l.x + l.w / 2), Z(l.z < ring.z ? ring.z : ring.z + ring.d)); g.stroke(); } };
  drawRoads(2.6, casing); yield; drawRoads(0, asphalt); yield;
  if (im) { g.save(); g.globalAlpha = 0.18; g.globalCompositeOperation = 'overlay'; ringPath(ring.lane / 2); g.clip(); g.drawImage(noise(R, 512, 0, 255), 0, 0, TEX, TEX); g.restore();
    g.strokeStyle = 'rgba(236,220,150,0.85)'; g.lineWidth = px(0.22); g.setLineDash([px(3), px(4)]); ringPath(0); g.stroke(); for (const [x0, z0, x1, z1] of L.roads) { g.beginPath(); g.moveTo(X(x0), Z(z0)); g.lineTo(X(x1), Z(z1)); g.stroke(); } g.setLineDash([]); }
  yield;
  // car parks: stalls and parked cars
  for (const l of L.lots) { yield; g.fillStyle = im ? '#45484b' : '#e3e1db'; roundRect(g, X(l.x), Z(l.z), px(l.w), px(l.d), px(3)); g.fill();
    if (im) { const rows = Math.floor(l.d / 17); g.strokeStyle = 'rgba(240,240,235,0.7)'; g.lineWidth = px(0.15); const cars = ['#d9dde1', '#1d2a3a', '#7d1f22', '#9aa3ab', '#2f3a2c', '#e6e2d6', '#24364f', '#5c5f63'];
      for (let r = 0; r < rows; r++) { const zz = l.z + 3 + r * 17; for (let x = l.x + 3; x < l.x + l.w - 3; x += 2.6) { for (const side of [0, 1]) { const z0 = zz + side * 6.2; g.beginPath(); g.moveTo(X(x), Z(z0)); g.lineTo(X(x), Z(z0 + 5)); g.stroke(); if (R() < 0.72 && x + 2.6 < l.x + l.w - 3) { g.fillStyle = cars[Math.floor(R() * cars.length)]!; roundRect(g, X(x + 0.35), Z(z0 + 0.4), px(1.9), px(4.3), px(0.5)); g.fill(); g.fillStyle = 'rgba(20,30,40,0.55)'; g.fillRect(X(x + 0.55), Z(z0 + (side ? 0.9 : 3.0)), px(1.5), px(0.7)); } } } } } }
  yield;
  // building aprons and shadows (the 3D buildings stand on these)
  for (const b of B) { const f = L.foot[b.key]!; const h = b.floors * STOREY + 2; if (im) { g.fillStyle = 'rgba(12,18,10,0.45)'; g.beginPath(); g.moveTo(X(f.x + f.w), Z(f.z)); g.lineTo(X(f.x + f.w + h * SUN.dx), Z(f.z + h * SUN.dz)); g.lineTo(X(f.x + f.w + h * SUN.dx), Z(f.z + f.d + h * SUN.dz)); g.lineTo(X(f.x + h * SUN.dx), Z(f.z + f.d + h * SUN.dz)); g.lineTo(X(f.x), Z(f.z + f.d)); g.lineTo(X(f.x + f.w), Z(f.z + f.d)); g.closePath(); g.fill(); }
    g.fillStyle = im ? '#a7a196' : '#d8d1c4'; g.fillRect(X(f.x - 3), Z(f.z - 3), px(f.w + 6), px(f.d + 6)); g.fillStyle = im ? '#6f6a63' : '#cbc2b3'; g.fillRect(X(f.x), Z(f.z), px(f.w), px(f.d)); }
  // trees: shadow, then canopy (imagery); round green dots (map)
  let n = 0; for (const t of L.trees) { if (++n % 60 === 0) yield; if (im) { g.fillStyle = 'rgba(10,20,8,0.42)'; g.beginPath(); g.ellipse(X(t.x + t.h * SUN.dx * 0.6), Z(t.z + t.h * SUN.dz * 0.6), px(t.r * 1.05), px(t.r * 0.9), 0.6, 0, 7); g.fill();
      const gr = g.createRadialGradient(X(t.x - t.r * 0.35), Z(t.z - t.r * 0.35), px(t.r * 0.1), X(t.x), Z(t.z), px(t.r)); const base: [number, number, number] = t.tone < 0.15 ? [96, 110, 52] : t.tone < 0.3 ? [62, 92, 46] : [44, 78 + t.tone * 18, 38]; gr.addColorStop(0, `rgb(${base[0] + 50},${base[1] + 50},${base[2] + 30})`); gr.addColorStop(0.7, `rgb(${base[0]},${base[1]},${base[2]})`); gr.addColorStop(1, `rgb(${base[0] - 18},${base[1] - 22},${base[2] - 14})`);
      g.fillStyle = gr; g.beginPath(); g.arc(X(t.x), Z(t.z), px(t.r), 0, 7); g.fill(); }
    else { g.fillStyle = 'rgba(160,204,144,0.6)'; g.beginPath(); g.arc(X(t.x), Z(t.z), px(t.r * 0.8), 0, 7); g.fill(); } }
  return c;
}
