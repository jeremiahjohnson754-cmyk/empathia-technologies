// FieldLink concept enclosures as simple solids (founder directive 18 Nov 2026 17:25 §10, "Version D — Interactive 360-degree product
// concept": "Where original 3D assets can be created accurately, allow users to rotate the conceptual enclosures. Do not invent detailed
// interior engineering geometry"). Only the outer envelope the concept specifies is drawn, at its target dimensions (class T on the
// page): Nano 75 × 20 × 13 mm, Edge 160 × 110 × 45 mm, Pulse about 86 mm across and 28 mm high. No port, vent, button or interior is
// drawn, because none is designed yet. Pure functions: the page renders the first pose at build time, and fieldlink.js turns it.
export type V3 = [number, number, number];
export interface Solid { id: 'nano' | 'edge' | 'pulse'; name: string; envelope: string; faces: V3[][] }

const box = (w: number, d: number, h: number): V3[][] => {
  const x = w / 2, y = d / 2, z = h / 2;
  const p: V3[] = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]];
  // each face listed counter-clockwise seen from outside, so its normal points out
  return [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]].map((f) => f.map((i) => p[i]!));
};
const cylinder = (r: number, h: number, n = 36): V3[][] => {
  const z = h / 2; const ring = (zz: number): V3[] => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n), zz]);
  const b = ring(-z), t = ring(z);
  return [[...b].reverse(), t, ...Array.from({ length: n }, (_, i) => [b[i]!, b[(i + 1) % n]!, t[(i + 1) % n]!, t[i]!])];
};
export const SOLIDS: Solid[] = [
  { id: 'nano', name: 'FieldLink Nano', envelope: '75 × 20 × 13 mm envelope (target)', faces: box(75, 20, 13) },
  { id: 'edge', name: 'FieldLink Edge', envelope: '160 × 110 × 45 mm envelope (target)', faces: box(160, 110, 45) },
  { id: 'pulse', name: 'FieldLink Pulse', envelope: 'about 86 mm across, 28 mm high (target)', faces: cylinder(43, 28) },
];
export const POSE = { yaw: -0.65, pitch: 0.95 };

/** The solid turned by yaw (about the vertical axis) and pitch, projected orthographically into a 400 × 280 box, back faces dropped,
 * far faces first, each with its shade (0..1) from a light above and to the front-left. */
export function project(s: Solid, yaw: number, pitch: number): { pts: string; shade: number }[] {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const rot = ([x, y, z]: V3): V3 => { const x1 = x * cy - y * sy, y1 = x * sy + y * cy; return [x1, y1 * cp - z * sp, y1 * sp + z * cp]; };
  const all = s.faces.map((f) => f.map(rot));
  const R = Math.max(...s.faces.flat().map(([x, y, z]) => Math.hypot(x, y, z)));   // the same scale in every pose, so turning never zooms
  const k = 118 / R;
  const L: V3 = [-0.35, -0.55, 0.76];
  const out: { pts: string; shade: number; d: number }[] = [];
  for (const f of all) {
    const [a, b, c] = f as [V3, V3, V3];
    const u: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const m = Math.hypot(...n) || 1;
    if (n[2] / m <= 0.001) continue;   // facing away
    const lam = Math.max(0, (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / m);
    out.push({ pts: f.map(([x, y]) => `${(200 + x * k).toFixed(1)},${(140 + y * k).toFixed(1)}`).join(' '), shade: Number((0.28 + 0.72 * lam).toFixed(3)), d: f.reduce((t, p) => t + p[2], 0) / f.length });
  }
  return out.sort((p, q) => p.d - q.d).map(({ pts, shade }) => ({ pts, shade }));
}
/** the enclosure's finish: a graphite shell, lighter where the light falls */
export const fillOf = (shade: number) => `rgb(${Math.round(26 + 118 * shade)},${Math.round(32 + 126 * shade)},${Math.round(40 + 138 * shade)})`;
