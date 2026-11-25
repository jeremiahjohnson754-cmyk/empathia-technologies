/**
 * Campus Life's renderer: a small WebGL2 renderer written for this game, with no library (the approved path is the browser's own 3D;
 * founder, 17 Nov 2026 10:31). It draws boxes and prisms: the static world merged into one buffer at load, and moving parts (people,
 * the door) as one unit cube drawn with a model matrix and a colour. Lit by a sun and a sky/ground ambient, with distance fog and soft
 * contact shadows under people. Everything is geometry from ./world.ts in metres; nothing is fetched.
 */
export type V3 = [number, number, number];
export type M4 = Float32Array;

export const m4 = {
  ident(): M4 { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  mul(a: M4, b: M4): M4 { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r]! * b[c * 4 + k]!; o[c * 4 + r] = s; } return o; },
  persp(fovy: number, aspect: number, near: number, far: number): M4 { const f = 1 / Math.tan(fovy / 2); const o = new Float32Array(16); o[0] = f / aspect; o[5] = f; o[10] = (far + near) / (near - far); o[11] = -1; o[14] = (2 * far * near) / (near - far); return o; },
  look(eye: V3, at: V3, up: V3 = [0, 1, 0]): M4 {
    const z = norm(sub(eye, at)); const x = norm(cross(up, z)); const y = cross(z, x); const o = new Float32Array(16);
    o[0] = x[0]; o[4] = x[1]; o[8] = x[2]; o[1] = y[0]; o[5] = y[1]; o[9] = y[2]; o[2] = z[0]; o[6] = z[1]; o[10] = z[2];
    o[12] = -dot(x, eye); o[13] = -dot(y, eye); o[14] = -dot(z, eye); o[15] = 1; return o;
  },
  /** translate, rotate about y, scale: the model matrix of a box part */
  trs(t: V3, yaw: number, s: V3, pivotTop = false): M4 {
    const c = Math.cos(yaw), n = Math.sin(yaw); const o = new Float32Array(16);
    o[0] = c * s[0]; o[2] = -n * s[0]; o[5] = s[1]; o[8] = n * s[2]; o[10] = c * s[2]; o[12] = t[0]; o[13] = t[1] - (pivotTop ? s[1] / 2 : 0); o[14] = t[2]; o[15] = 1; return o;
  },
  /** a limb hanging from a joint and swung about the x axis (local), then turned to the body's yaw */
  limb(joint: V3, yaw: number, swing: number, s: V3, off: V3 = [0, 0, 0]): M4 {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(swing), sx = Math.sin(swing);
    // R = Ry(yaw) * Rx(swing); the box's centre sits half its length below the joint
    const R = [cy, 0, -sy, sy * sx, cx, cy * sx, sy * cx, -sx, cy * cx];
    const local: V3 = [off[0], off[1] - s[1] / 2, off[2]];
    const t: V3 = [joint[0] + R[0]! * local[0] + R[3]! * local[1] + R[6]! * local[2], joint[1] + R[1]! * local[0] + R[4]! * local[1] + R[7]! * local[2], joint[2] + R[2]! * local[0] + R[5]! * local[1] + R[8]! * local[2]];
    const o = new Float32Array(16); o[0] = R[0]! * s[0]; o[1] = R[1]! * s[0]; o[2] = R[2]! * s[0]; o[4] = R[3]! * s[1]; o[5] = R[4]! * s[1]; o[6] = R[5]! * s[1]; o[8] = R[6]! * s[2]; o[9] = R[7]! * s[2]; o[10] = R[8]! * s[2]; o[12] = t[0]; o[13] = t[1]; o[14] = t[2]; o[15] = 1; return o;
  },
};
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const hex = (h: string): V3 => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

const VS = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec3 aCol;
uniform mat4 uVP; uniform mat4 uM; uniform vec3 uTint; uniform float uUseTint;
out vec3 vNor; out vec3 vCol; out vec3 vWorld;
void main(){ vec4 w = uM * vec4(aPos,1.0); vWorld = w.xyz; vNor = normalize(mat3(uM) * aNor); vCol = mix(aCol, uTint, uUseTint); gl_Position = uVP * w; }`;
const FS = `#version 300 es
precision mediump float;
in vec3 vNor; in vec3 vCol; in vec3 vWorld; uniform vec3 uSun; uniform vec3 uEye; uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar; uniform float uAlpha;
uniform vec3 uSky; uniform vec3 uGround; uniform float uAmb; uniform vec3 uSunCol; uniform float uGlow; uniform float uGrad; uniform highp vec3 uTint; uniform vec3 uTint2;
out vec4 o;
void main(){
  if (uGrad > 0.5) { o = vec4(mix(uTint, uTint2, pow(clamp(vCol.r, 0.0, 1.0), 0.55)), 1.0); return; }
  vec3 n = normalize(vNor); float d = max(dot(n, uSun), 0.0);
  vec3 amb = mix(uGround, uSky, n.y*0.5+0.5) * uAmb;
  vec3 c = mix(vCol * (amb + uSunCol * d), vCol, uGlow);
  float rim = pow(1.0 - max(dot(n, normalize(uEye - vWorld)), 0.0), 3.0) * 0.08; c += rim;
  float f = clamp((distance(uEye, vWorld) - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
  o = vec4(mix(c, uFog, f*f), uAlpha);
}`;
/**
 * The far figure's own program (figureFar; 25 Nov 2026). One face stands for three: vNor.y runs from -1 at its foot to 1 at its far
 * edge; the far share uFar.y of it is the head, lit from above; the rest is the two sides the eye can see, each lit as itself
 * (uFar.z and uFar.w say which way they look) and mixed by how much of each the eye sees (uFar.x). `shade` is the arithmetic of FS
 * above, so the face is lit as the whole figure is, face by face.
 *
 * It is a program of its own, not a branch of FS, for a measured reason: with the branch in FS the stadium at full quality fell from
 * 31 frames in five seconds to 19 on the test machine though it drew the same picture. A renderer without a graphics processor
 * works out both sides of a branch for every pixel, so every pixel of every scene paid for lighting three faces.
 */
const FS_FAR = `#version 300 es
precision mediump float;
in vec3 vNor; in vec3 vCol; in vec3 vWorld; uniform vec3 uSun; uniform vec3 uEye; uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar; uniform float uAlpha;
uniform vec3 uSky; uniform vec3 uGround; uniform float uAmb; uniform vec3 uSunCol; uniform float uGlow; uniform highp vec3 uTint; uniform highp float uUseTint; uniform vec4 uFar;
out vec4 o;
vec3 shade(vec3 col, vec3 n){
  float d = max(dot(n, uSun), 0.0);
  vec3 amb = mix(uGround, uSky, n.y*0.5+0.5) * uAmb;
  vec3 c = mix(col * (amb + uSunCol * d), col, uGlow);
  return c + pow(1.0 - max(dot(n, normalize(uEye - vWorld)), 0.0), 3.0) * 0.08;
}
void main(){
  vec3 c;
  if (vNor.y * 0.5 + 0.5 > 1.0 - uFar.y) c = shade(mix(vec3(0.78, 0.6, 0.47), uTint, uUseTint), vec3(0.0, 1.0, 0.0));
  else c = uFar.x * shade(vCol, vec3(uFar.z, 0.0, 0.0)) + (1.0 - uFar.x) * shade(vCol, vec3(0.0, 0.0, uFar.w));
  float f = clamp((distance(uEye, vWorld) - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
  o = vec4(mix(c, uFog, f*f), uAlpha);
}`;

export interface Box { min: V3; max: V3; color: string; tag?: string }

/** the 36 vertices of a box, coloured, with face normals; top faces a little lighter, as daylight would */
export function boxVerts(b: Box, out: number[]) {
  const [x0, y0, z0] = b.min, [x1, y1, z1] = b.max; const c = hex(b.color);
  const F: Array<[V3, V3[]]> = [
    [[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]], [[0, 0, -1], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]]],
    [[1, 0, 0], [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]]], [[-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]],
    [[0, 1, 0], [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]]], [[0, -1, 0], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]],
  ];
  for (const [n, q] of F) for (const i of [0, 1, 2, 0, 2, 3]) { const p = q[i]!; out.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2]); }
}

/** an upright prism over any four-cornered footprint (x, z), from y0 to y1, coloured; faces lit by their own normals */
export function prismVerts(pts: Array<[number, number]>, y0: number, y1: number, color: string | V3, out: number[], top = true) {
  const c = typeof color === 'string' ? hex(color) : color; const n = pts.length; const push = (p: V3, nn: V3) => out.push(p[0], p[1], p[2], nn[0], nn[1], nn[2], c[0], c[1], c[2]);
  let cx = 0, cz = 0; for (const p of pts) { cx += p[0] / n; cz += p[1] / n; }
  for (let i = 0; i < n; i++) { const a = pts[i]!, b = pts[(i + 1) % n]!; let nx = b[1] - a[1], nz = -(b[0] - a[0]); const mx = (a[0] + b[0]) / 2 - cx, mz = (a[1] + b[1]) / 2 - cz; if (nx * mx + nz * mz < 0) { nx = -nx; nz = -nz; } const l = Math.hypot(nx, nz) || 1; const nn: V3 = [nx / l, 0, nz / l];
    const q: V3[] = [[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]]; const order = (b[0] - a[0]) * nn[2] - (b[1] - a[1]) * nn[0] > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]; for (const k of order) push(q[k]!, nn); }
  if (top) for (let i = 1; i < n - 1; i++) { const tri: V3[] = [[pts[0]![0], y1, pts[0]![1]], [pts[i]![0], y1, pts[i]![1]], [pts[i + 1]![0], y1, pts[i + 1]![1]]]; const cr = (tri[1]![0] - tri[0]![0]) * (tri[2]![2] - tri[0]![2]) - (tri[1]![2] - tri[0]![2]) * (tri[2]![0] - tri[0]![0]); const ord = cr < 0 ? [0, 1, 2] : [0, 2, 1]; for (const k of ord) push(tri[k]!, [0, 1, 0]); }
}

/** a seating step: its top and the riser facing the pitch (the edge pts[0]–pts[1]); the hidden faces are not drawn */
export function stepVerts(pts: Array<[number, number]>, y0: number, y1: number, color: string | V3, out: number[], riserColor?: string | V3) {
  const c = typeof color === 'string' ? hex(color) : color; const rc = riserColor === undefined ? c.map((x) => x * 0.8) as V3 : typeof riserColor === 'string' ? hex(riserColor) : riserColor;
  const push = (p: V3, nn: V3, col: V3) => out.push(p[0], p[1], p[2], nn[0], nn[1], nn[2], col[0], col[1], col[2]);
  const T: V3[] = pts.map((p) => [p[0], y1, p[1]]); const cr = (T[1]![0] - T[0]![0]) * (T[2]![2] - T[0]![2]) - (T[1]![2] - T[0]![2]) * (T[2]![0] - T[0]![0]);
  for (const k of cr < 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]) push(T[k]!, [0, 1, 0], c);
  const a = pts[0]!, b = pts[1]!; let nx = b[1] - a[1], nz = -(b[0] - a[0]); if (nx * -a[0] + nz * -a[1] < 0) { nx = -nx; nz = -nz; } const l = Math.hypot(nx, nz) || 1; const nn: V3 = [nx / l, 0, nz / l];
  const q: V3[] = [[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]]; for (const k of (b[0] - a[0]) * nn[2] - (b[1] - a[1]) * nn[0] > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]) push(q[k]!, nn, rc);
}
/** the five ways a seated figure's faces look, in the order `figureFaces` fills them: +z, −z, +x, −x, up */
export const FIGURE_SIDES: Array<{ axis: 0 | 1 | 2; sign: 1 | -1 }> = [{ axis: 2, sign: 1 }, { axis: 2, sign: -1 }, { axis: 0, sign: 1 }, { axis: 0, sign: -1 }, { axis: 1, sign: 1 }];
/**
 * The same figure as `figureVerts`, its five faces sorted by the way they look, one list each (25 Nov 2026). Every figure of a crowd
 * stands square to the same axes, so all the faces that look, say, east are seen or hidden together: a section whose east faces all
 * look away from the eye need not send them to be drawn at all. The graphics card would discard them anyway (back faces are culled),
 * but only after working on every corner of them, which is most of the cost of a full house where there is no fast card.
 */
export function figureFaces(x: number, y: number, z: number, color: string, out: number[][]) {
  const one: number[] = []; figureVerts(x, y, z, color, one); for (let f = 0; f < 5; f++) { const o = out[f]!; for (let i = f * 54; i < (f + 1) * 54; i++) o.push(one[i]!); }
}
/**
 * whether any face of a list can be seen from `eye`: the faces look along `axis` in the direction `sign` and lie between `lo` and `hi`
 * on that axis. False only when every one of them looks away, so nothing visible is ever left out.
 */
export const facesSeen = (eye: V3, axis: 0 | 1 | 2, sign: 1 | -1, lo: number, hi: number): boolean => (sign > 0 ? eye[axis] > lo : eye[axis] < hi);
/**
 * Level of detail by distance (25 Nov 2026; founder: "Preserve full graphical detail for nearby spectators. Simplify distant
 * spectators dynamically. Preserve crowd density, atmosphere and visual identity. Maintain a full-quality override.").
 *
 * What decides is how tall a thing is in the pixels actually drawn, not metres: that follows the camera, the lens, the size of the
 * canvas and the adaptive detail all at once, so a figure is simplified only where it is too small on this screen for the difference
 * to show. Any world can use these: a crowd, trees, parked cars, the furniture of a far room.
 */
export const pixelsTall = (size: number, dist: number, fovy: number, heightPx: number): number => (dist > 0 ? (size / dist) * (heightPx / 2) / Math.tan(fovy / 2) : Infinity);
/** a figure at least this many drawn pixels tall is drawn whole */
export const LOD_NEAR_PX = 6;
/** and the change either way waits until the size is this far past the line, so a thing on the line does not flicker between the two */
export const LOD_BAND = 0.15;
/** 0 = drawn whole, 1 = drawn simply. Anything that is not a size (no measure yet) is drawn whole. */
export function lodLevel(px: number, was: 0 | 1, nearPx = LOD_NEAR_PX): 0 | 1 {
  if (!(px >= 0)) return 0;
  return was === 1 ? (px > nearPx * (1 + LOD_BAND) ? 0 : 1) : (px < nearPx * (1 - LOD_BAND) ? 1 : 0);
}
/** the four quarters a far figure can be seen from, in the order `figureFar` fills them */
export const FAR_QUARTERS: Array<{ sx: 1 | -1; sz: 1 | -1 }> = [{ sx: 1, sz: 1 }, { sx: -1, sz: 1 }, { sx: 1, sz: -1 }, { sx: -1, sz: -1 }];
/** half the width (x), half the depth (z) and the height of a seated figure, and its head's colour: figureVerts, figureFaces and figureFar draw the same figure */
export const FIGURE = { w: 0.22, d: 0.2, h: 0.8, skin: [0.78, 0.6, 0.47] as V3 };
/**
 * The same seated figure seen from far off: one face in place of the three a viewer can see, one list for each quarter it may be seen
 * from. The face stands on the box's diagonal, corner to corner, and leans back by the depth that gives it the area of the head seen
 * from above. That makes it cover, from any direction in its quarter at or above the seat, exactly the area the whole figure covers
 * (its two visible sides and its head: the sums are the same, term for term), so a far crowd is as dense as the whole one. Its shape
 * differs: seen off the diagonal it is a slanted mark, sideways by at most 0.22 m of its 0.8 m, which at the few pixels a far figure
 * is tall is under two pixels.
 *
 * It is coloured and lit as the whole figure is, face by face, by the renderer (Renderer.drawFar and the far figure's program, FS_FAR):
 * the share of the face that is head (`farShares`) is the head's colour lit from above, the rest is the shirt lit as each visible
 * side is, mixed by how much of each side the eye sees. So the face carries the shirt's colour at every corner, and in place of a
 * direction its second attribute says where on the face a point is: -1 at the foot, 1 at the far edge.
 * Every person stays, in place and colour: two triangles a figure where the whole figure sends six.
 */
export function figureFar(x: number, y: number, z: number, color: string, out: number[][]) {
  const c = hex(color); const { w, d, h } = FIGURE; const R = Math.hypot(2 * w, 2 * d); const lean = (2 * w * 2 * d) / R / 2;
  FAR_QUARTERS.forEach(({ sx, sz }, f) => {
    const a: [number, number] = [x - sx * w, z + sz * d], b: [number, number] = [x + sx * w, z - sz * d];   // the ends of the figure's outline seen from this quarter
    let nx = b[1] - a[1], nz = -(b[0] - a[0]); if (nx * sx + nz * sz < 0) { nx = -nx; nz = -nz; } const l = Math.hypot(nx, nz); nx /= l; nz /= l;   // level, square to the diagonal, into the quarter
    const q: V3[] = [[a[0] + nx * lean, y, a[1] + nz * lean], [b[0] + nx * lean, y, b[1] + nz * lean], [b[0] - nx * lean, y + h, b[1] - nz * lean], [a[0] - nx * lean, y + h, a[1] - nz * lean]];
    const face: V3 = [nx * h, 2 * lean, nz * h]; const o = out[f]!;   // the way the face looks, to wind it so its front is kept
    for (const k of dot(cross(sub(q[1]!, q[0]!), sub(q[2]!, q[0]!)), face) >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]) { const p = q[k]!; o.push(p[0], p[1], p[2], 0, k >= 2 ? 1 : -1, 0, c[0], c[1], c[2]); }
  });
}
/**
 * For a far figure seen along `v` (from it toward the eye; any length): how much of its visible sides is the side that looks along x
 * (`sideX`, the rest looks along z), and how much of all the eye sees of it is its head (`head`). These are the areas of the whole
 * figure's faces as that eye sees them, so a far face shaded with them is the whole figure's colour and light, in the same shares.
 */
export function farShares(v: V3): { sideX: number; head: number } {
  const { w, d, h } = FIGURE; const ax = 2 * d * h * Math.abs(v[0]), az = 2 * w * h * Math.abs(v[2]), top = 4 * w * d * Math.max(0, v[1]); const sides = ax + az;
  return { sideX: sides > 0 ? ax / sides : 0.5, head: sides + top > 0 ? top / (sides + top) : 0 };
}
/** a seated figure, as light as a crowd of thousands needs: one box of five faces (no underside), shirt on the sides, a head-coloured top */
export function figureVerts(x: number, y: number, z: number, color: string, out: number[]) {
  const c = hex(color); const skin: V3 = [0.78, 0.6, 0.47]; const x0 = x - 0.22, x1 = x + 0.22, z0 = z - 0.2, z1 = z + 0.2, y0 = y, y1 = y + 0.8;
  const F: Array<[V3, V3[], V3]> = [[[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], c], [[0, 0, -1], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], c],
    [[1, 0, 0], [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], c], [[-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], c], [[0, 1, 0], [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], skin]];
  for (const [n, q, col] of F) for (const i of [0, 1, 2, 0, 2, 3]) { const p = q[i]!; out.push(p[0], p[1], p[2], n[0], n[1], n[2], col[0], col[1], col[2]); }
}

/**
 * one flat four-cornered face, seen from the side `n` points to: two triangles. For a thing that is only ever seen from one side (a lit
 * window on a distant tower), where a thin box would spend twelve triangles, ten of them on faces nobody can see.
 */
export function quadVerts(q: [V3, V3, V3, V3], n: V3, color: string | V3, out: number[]) {
  const c = typeof color === 'string' ? hex(color) : color; const f = cross(sub(q[1], q[0]), sub(q[2], q[0]));
  for (const k of dot(f, n) >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]) { const p = q[k]!; out.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2]); }
}

/** one triangle, wound so that its front faces the way `n` points (the back is culled) */
function tri(out: number[], a: [V3, V3], b: [V3, V3], c: [V3, V3], col: V3) {
  const u = sub(b[0], a[0]), v = sub(c[0], a[0]); const f = cross(u, v); const n: V3 = [a[1][0] + b[1][0] + c[1][0], a[1][1] + b[1][1] + c[1][1], a[1][2] + b[1][2] + c[1][2]];
  const order = dot(f, n) >= 0 ? [a, b, c] : [a, c, b]; for (const [p, nn] of order) out.push(p[0], p[1], p[2], nn[0], nn[1], nn[2], col[0], col[1], col[2]);
}
/** a sphere (an ellipsoid when the radii differ), lit smoothly: latitude by longitude, baked into a static buffer */
export function sphereVerts(c: V3, r: V3, color: string | V3, out: number[], seg = 12, rings = 8) {
  const col = typeof color === 'string' ? hex(color) : color; const pt = (i: number, j: number): [V3, V3] => { const th = (i / seg) * Math.PI * 2, ph = (j / rings) * Math.PI; const n: V3 = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)]; return [[c[0] + n[0] * r[0], c[1] + n[1] * r[1], c[2] + n[2] * r[2]], norm([n[0] / r[0], n[1] / r[1], n[2] / r[2]])]; };
  for (let i = 0; i < seg; i++) for (let j = 0; j < rings; j++) { const q = [pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)]; if (j > 0) tri(out, q[0]!, q[1]!, q[2]!, col); if (j < rings - 1) tri(out, q[0]!, q[2]!, q[3]!, col); }
}
/** an upright cylinder (an elliptic one when the radii differ) from y0 to y1, its top closed, lit smoothly round its side */
export function cylinderVerts(x: number, z: number, rx: number, rz: number, y0: number, y1: number, color: string | V3, out: number[], seg = 12, top = true) {
  const col = typeof color === 'string' ? hex(color) : color; const P = (i: number): [number, number, V3] => { const a = (i / seg) * Math.PI * 2; return [x + Math.cos(a) * rx, z + Math.sin(a) * rz, norm([Math.cos(a) / rx, 0, Math.sin(a) / rz])]; };
  for (let i = 0; i < seg; i++) { const [ax, az, an] = P(i), [bx, bz, bn] = P(i + 1); const q: Array<[V3, V3]> = [[[ax, y0, az], an], [[bx, y0, bz], bn], [[bx, y1, bz], bn], [[ax, y1, az], an]];
    tri(out, q[0]!, q[1]!, q[2]!, col); tri(out, q[0]!, q[2]!, q[3]!, col);
    if (top) { const up: V3 = [0, 1, 0]; tri(out, [[x, y1, z], up], [[ax, y1, az], up], [[bx, y1, bz], up], col); } }
}

/** a mesh on the graphics card: `n` vertices, and the sphere (centre `c`, radius `r`) that holds every one of them as built */
export interface Mesh { vao: WebGLVertexArrayObject; n: number; c: V3; r: number }
/** the sphere that holds every vertex of a buffer of 9 numbers a vertex (the middle of its box, out to its farthest corner) */
export function boundOf(v: ArrayLike<number>): { c: V3; r: number } {
  if (v.length < 9) return { c: [0, 0, 0], r: 0 };
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i + 8 < v.length; i += 9) { const x = v[i]!, y = v[i + 1]!, z = v[i + 2]!; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
  return { c: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], r: Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 };
}
/**
 * whether a sphere can be in the picture a view-projection matrix draws: false only when it lies wholly outside one of the view's six
 * sides, so nothing that could be seen is ever left out (a sphere near a corner may be kept though it is outside: that costs a draw,
 * never a hole in the picture).
 */
export function sphereInView(vp: ArrayLike<number>, c: V3, r: number): boolean {
  const row = (i: number) => [vp[i]!, vp[4 + i]!, vp[8 + i]!, vp[12 + i]!]; const w = row(3);
  for (const [i, sgn] of [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]] as Array<[number, number]>) { const a = row(i); const px = w[0]! + sgn * a[0]!, py = w[1]! + sgn * a[1]!, pz = w[2]! + sgn * a[2]!, pd = w[3]! + sgn * a[3]!;
    const l = Math.hypot(px, py, pz); if (l > 0 && (px * c[0] + py * c[1] + pz * c[2] + pd) / l < -r) return false; }
  return true;
}
/**
 * Adaptive detail (24 Nov 2026; the founder's stated biggest concern is spatial rendering performance, target 30 frames a second).
 *
 * These scenes are bound by the number of pixels drawn where there is no fast graphics processor: the campus measured 16 to 18 frames
 * a second at phone size and 7 to 9 at desktop size in software rendering, a third of the pixels for twice the speed. So when a scene
 * cannot hold PACE_SLOW frames a second it draws fewer pixels (the canvas keeps its size on the page; the picture is scaled up), down
 * to DETAIL_MIN of full resolution. The step down follows the shortfall (pixels go with the square of the detail, so the detail is
 * multiplied by the square root of pace over target, never by less than DETAIL_STEP_MAX nor more than DETAIL_STEP_MIN in one second),
 * so a slow machine is helped within two or three seconds; steps back up are small and need clear headroom, so it does not hunt.
 * The rule is a pure function so it can be tested without a browser.
 */
export const DETAIL_MIN = 0.5; export const PACE_SLOW = 24; export const PACE_FAST = 50; export const DETAIL_STEP_MAX = 0.6; export const DETAIL_STEP_MIN = 0.8;
export function governDetail(detail: number, fps: number): number {
  if (!(fps > 0) || !(detail > 0)) return detail;
  if (fps < PACE_SLOW && detail > DETAIL_MIN) { const k = Math.min(DETAIL_STEP_MIN, Math.max(DETAIL_STEP_MAX, Math.sqrt(fps / PACE_SLOW))); return Math.max(DETAIL_MIN, Math.round(detail * k * 100) / 100); }
  if (fps > PACE_FAST && detail < 1) return Math.min(1, Math.round((detail / 0.9) * 100) / 100);
  return detail;
}

/** lowering the detail all the way must buy at least this much speed, or the scene is not bound by pixels and full detail is restored */
export const DETAIL_WORTH = 1.25;
/** the first frames of a scene compile its shaders and upload its geometry; they say nothing about its pace */
export const WARM_FRAMES = 5;
/**
 * Holds the detail level for one scene and applies the rule about once a second. Frames that say nothing about drawing are not
 * counted: the first WARM_FRAMES, and any frame after a pause or a hidden tab.
 *
 * Fewer pixels are only worth a softer picture if they buy speed, so the governor measures both ends and compares them. The pace at
 * full detail is kept (the best second seen there). If a scene reaches the minimum and is still slow, it is watched there for two
 * seconds; unless that pace is at least DETAIL_WORTH times the full-detail pace, the scene is bound by something other than pixels
 * (its geometry, or the processor), so full detail comes back and stays: a softer picture for no speed is a loss. A scene that does
 * gain keeps the gain. Measured on the test machine (two cores, no graphics processor, software rendering; not a device claim):
 * campus 9 to 10 at full and 21 to 23 at half; expo 16 to 17 at full and about 30 at 64%; stadium 5 at full and 8 to 9 at half, a
 * real gain that still leaves the stadium far from smooth there.
 *
 * Two things can be given up for speed, and the one nobody can see goes first (25 Nov 2026). A scene that has a simpler way to draw
 * its distant things says so (`simplifies`); when it is slow at full detail the governor first turns that on (`simple`) and only
 * then, if it is still slow, draws fewer pixels. A machine that holds the pace gives up neither. If the pace later runs well clear of
 * the target for SIMPLE_RETRY seconds the whole figures are tried once more, and kept if the pace holds.
 *
 * The override: `full` pins full resolution and whole figures whatever the pace (`?detail=full` in the address, or the page's own
 * control), and `setFull(false)` hands the decision back and starts measuring afresh.
 */
export const SIMPLE_RETRY = 3;
export class DetailGovernor {
  detail = 1; notPixelBound = false; private ms = 0; private n = 0; private warm = 0; private fullFps = 0; private atMin: number[] = []; private judged = false;
  /** the scene has a simpler way to draw its distant things (set by the scene) */
  simplifies = false;
  /** draw distant things simply: true only while the scene is too slow to draw them whole */
  simple = false;
  /** full quality whatever the pace */
  full: boolean;
  private clear = 0; private retried = false;
  constructor(public adaptive = true) { this.full = !adaptive; }
  /** pin full quality, or hand the decision back to the pace */
  setFull(on: boolean) {
    this.full = on; this.detail = 1; this.simple = false; this.adaptive = !on; this.notPixelBound = false;
    this.ms = 0; this.n = 0; this.fullFps = 0; this.atMin = []; this.judged = false; this.clear = 0; this.retried = false;
  }
  frame(ms: number): number {
    if (this.full) { this.detail = 1; this.simple = false; return 1; }
    if (!this.adaptive) { this.detail = 1; return 1; }
    if (!(ms > 0) || ms > 1000) return this.detail;
    if (this.warm < WARM_FRAMES) { this.warm += 1; return this.detail; }
    this.ms += ms; this.n += 1;
    if (this.ms < 1000) return this.detail;
    const fps = this.n * 1000 / this.ms; this.ms = 0; this.n = 0;
    if (this.simplifies && this.detail >= 1) {
      // the first thing given up is the one that cannot be seen: this second decides that, and pixels are not touched until the next
      if (!this.simple && fps < PACE_SLOW) { this.simple = true; this.clear = 0; this.fullFps = 0; return this.detail; }
      if (this.simple && !this.retried) { this.clear = fps > PACE_FAST ? this.clear + 1 : 0; if (this.clear >= SIMPLE_RETRY) { this.simple = false; this.retried = true; this.fullFps = 0; return this.detail; } }
    }
    if (this.detail >= 1 && fps > this.fullFps) this.fullFps = fps;
    if (!this.judged && this.detail <= DETAIL_MIN && fps < PACE_SLOW) {
      this.atMin.push(fps);
      if (this.atMin.length >= 2) { this.judged = true; const pace = (this.atMin[0]! + this.atMin[1]!) / 2;
        if (this.fullFps > 0 && pace < this.fullFps * DETAIL_WORTH) { this.detail = 1; this.adaptive = false; this.notPixelBound = true; } }
      return this.detail;
    }
    this.detail = governDetail(this.detail, fps);
    return this.detail;
  }
}

export class Renderer {
  gl: WebGL2RenderingContext; prog: WebGLProgram; u: Record<string, WebGLUniformLocation | null> = {}; unit: Mesh; disc: Mesh; ball: Mesh; tube: Mesh;
  constructor(public canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }); if (!gl) throw new Error('WebGL2 is not available in this browser');
    this.gl = gl; const sh = (t: number, s: string) => { const x = gl.createShader(t)!; gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x) || 'shader'); return x; };
    const p = gl.createProgram()!; gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
    this.prog = p; for (const k of ['uVP', 'uM', 'uTint', 'uUseTint', 'uSun', 'uEye', 'uFog', 'uFogNear', 'uFogFar', 'uAlpha', 'uSky', 'uGround', 'uAmb', 'uSunCol', 'uGlow', 'uGrad', 'uTint2']) this.u[k] = gl.getUniformLocation(p, k);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
    const v: number[] = []; boxVerts({ min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5], color: '#ffffff' }, v); this.unit = this.mesh(v);
    const sb: number[] = []; sphereVerts([0, 0, 0], [0.5, 0.5, 0.5], '#ffffff', sb, 14, 10); this.ball = this.mesh(sb); const tb: number[] = []; cylinderVerts(0, 0, 0.5, 0.5, -0.5, 0.5, '#ffffff', tb, 12); this.tube = this.mesh(tb);
    const d: number[] = []; const N = 20; for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2, b = ((i + 1) / N) * Math.PI * 2; d.push(0, 0, 0, 0, 1, 0, 0, 0, 0, Math.cos(b) * 0.5, 0, Math.sin(b) * 0.5, 0, 1, 0, 0, 0, 0, Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5, 0, 1, 0, 0, 0, 0); } this.disc = this.mesh(d);
  }
  mesh(v: number[]): Mesh {
    const gl = this.gl; const vao = gl.createVertexArray()!; gl.bindVertexArray(vao); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
    for (let i = 0; i < 3; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 3, gl.FLOAT, false, 36, i * 12); }
    gl.bindVertexArray(null); return { vao, n: v.length / 9, ...boundOf(v) };
  }
  /** decides how many pixels to draw (DetailGovernor above); `?detail=full` in the address keeps full detail */
  gov = new DetailGovernor(typeof location === 'undefined' || !/[?&]detail=full\b/.test(location.hash));
  /** the fraction of full resolution being drawn (1 = full) */
  get detail(): number { return this.gov.detail; }
  /** tell the renderer how long the last frame took */
  pace(ms: number) { this.gov.frame(ms); }
  /** whether full quality is pinned (the address switch or the page's control) */
  get full(): boolean { return this.gov.full; }
  /** pin full quality (full resolution, every distant thing drawn whole), or hand the decision back to the pace */
  setFull(on: boolean) { this.gov.setFull(on); if (on) this.forceSimple = false; }
  /**
   * `?lod=simple` in the address draws distant things simply whatever the pace: for looking at the simple drawing itself, and for a test
   * to compare it with the whole one at the same resolution (with `?detail=full` the pixels stay full; this switch decides the figures).
   */
  forceSimple = typeof location !== 'undefined' && /[?&]lod=simple\b/.test(location.hash);
  /**
   * The level to draw a mesh of things `size` metres tall at: 0 whole, 1 simply. Whole unless the scene is too slow for it (see
   * DetailGovernor.simple) and, even then, whole wherever the nearest of them is tall enough on this canvas to show the difference.
   */
  lod(m: Mesh, eye: V3, fovy: number, size: number, was: 0 | 1): 0 | 1 {
    if (!this.gov.simple && !this.forceSimple) return 0;
    return lodLevel(this.pixels(m, eye, fovy, size), was);
  }
  /** how tall, in drawn pixels, the nearest thing of a mesh of things `size` metres tall can be: the distance is to the nearest edge of the mesh's sphere */
  pixels(m: Mesh, eye: V3, fovy: number, size: number): number { return pixelsTall(size, Math.max(0.01, Math.hypot(eye[0] - m.c[0], eye[1] - m.c[1], eye[2] - m.c[2]) - m.r), fovy, this.canvas.height); }
  resize(dprFull: number) { const dpr = dprFull * this.detail; const c = this.canvas; const w = Math.max(1, Math.round(c.clientWidth * dpr)), h = Math.max(1, Math.round(c.clientHeight * dpr)); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } this.gl.viewport(0, 0, w, h); }
  /** the light of the scene: the defaults are Campus Life's daylight */
  light: { sun: V3; sunCol: V3; sky: V3; ground: V3; amb: number } = { sun: norm([0.45, 0.8, 0.35]), sunCol: [0.72, 0.69, 0.63], sky: [0.78, 0.86, 0.95], ground: [0.45, 0.42, 0.36], amb: 0.48 };
  /**
   * what the last whole frame drew: draw calls and triangles. A count, so the same on every machine, which a frame rate is not; the
   * canvas carries it (data-draws, data-tris) for a test to hold each scene to a budget (25 Nov 2026, roadmap A19).
   */
  stats = { draws: 0, tris: 0 }; private tally = { draws: 0, tris: 0 }; private vp: M4 | null = null;
  /** whether a mesh, drawn where it was built or moved by no more than `pad`, can be in this frame's picture (see sphereInView) */
  seen(m: Mesh, pad = 0): boolean { return !this.vp || m.r <= 0 || sphereInView(this.vp, m.c, m.r + pad); }
  begin(vp: M4, eye: V3, fog: V3, near: number, far: number) {
    const t = this.tally; if (t.draws) { const s = this.stats; if (s.draws !== t.draws || s.tris !== t.tris) { s.draws = t.draws; s.tris = t.tris; this.canvas.dataset.draws = String(t.draws); this.canvas.dataset.tris = String(t.tris); } t.draws = 0; t.tris = 0; }
    this.vp = vp; this.frame = { eye, fog, near, far }; this.farSet = false; this.glowNow = 0;
    const gl = this.gl; gl.clearColor(fog[0], fog[1], fog[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.useProgram(this.prog); const L = this.light;
    gl.uniformMatrix4fv(this.u['uVP']!, false, vp); gl.uniform3fv(this.u['uSun']!, L.sun); gl.uniform3fv(this.u['uEye']!, eye); gl.uniform3fv(this.u['uFog']!, fog);
    gl.uniform3fv(this.u['uSky']!, L.sky); gl.uniform3fv(this.u['uGround']!, L.ground); gl.uniform1f(this.u['uAmb']!, L.amb); gl.uniform3fv(this.u['uSunCol']!, L.sunCol); gl.uniform1f(this.u['uGlow']!, 0); gl.uniform1f(this.u['uGrad']!, 0);
    gl.uniform1f(this.u['uFogNear']!, near); gl.uniform1f(this.u['uFogFar']!, far); gl.uniform1f(this.u['uAlpha']!, 1); gl.disable(gl.BLEND);
  }
  /** draw unlit (a lamp, a screen, a board), fully or partly */
  glow(g: number) { this.glowNow = g; this.gl.uniform1f(this.u['uGlow']!, g); }
  private glowNow = 0;
  /** draw a mesh, or the `count` vertices of it from `first`; alpha below 1 blends it over what is behind; `add` adds its light (beams, glows) instead */
  draw(m: Mesh, model: M4 = m4.ident(), tint?: V3, alpha = 1, add = false, first = 0, count = m.n - first) {
    if (count <= 0) return;
    const gl = this.gl; gl.uniformMatrix4fv(this.u['uM']!, false, model); gl.uniform1f(this.u['uUseTint']!, tint ? 1 : 0); if (tint) gl.uniform3fv(this.u['uTint']!, tint);
    const blend = alpha < 1 || add; if (blend) { gl.enable(gl.BLEND); if (add) gl.blendFunc(gl.SRC_ALPHA, gl.ONE); else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); if (add) gl.disable(gl.CULL_FACE); } gl.uniform1f(this.u['uAlpha']!, alpha);
    gl.bindVertexArray(m.vao); gl.drawArrays(gl.TRIANGLES, first, count); this.tally.draws += 1; this.tally.tris += count / 3;   // `first` and `count` draw a part of the mesh
    if (blend) { gl.disable(gl.BLEND); gl.depthMask(true); gl.enable(gl.CULL_FACE); gl.uniform1f(this.u['uAlpha']!, 1); }
  }
  /**
   * draw a run of far figures (figureFar) of the quarter (sx, sz), seen along `v` from them toward the eye: lit and coloured as the
   * whole figures are, face by face (farShares; the far branch of the shader)
   */
  drawFar(m: Mesh, model: M4, tint: V3 | undefined, first: number, count: number, sx: number, sz: number, v: V3) {
    if (count <= 0 || !this.vp || !this.frame) return; const gl = this.gl; const sh = farShares(v);
    if (!this.far) { const mk = (t: number, src: string) => { const x = gl.createShader(t)!; gl.shaderSource(x, src); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x) || 'shader'); return x; };
      const p = gl.createProgram()!; gl.attachShader(p, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, FS_FAR)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
      const u: Record<string, WebGLUniformLocation | null> = {}; for (const k of ['uVP', 'uM', 'uTint', 'uUseTint', 'uSun', 'uEye', 'uFog', 'uFogNear', 'uFogFar', 'uAlpha', 'uSky', 'uGround', 'uAmb', 'uSunCol', 'uGlow', 'uFar']) u[k] = gl.getUniformLocation(p, k); this.far = { p, u }; }
    const u = this.far.u; gl.useProgram(this.far.p);
    if (!this.farSet) { const L = this.light, F = this.frame; this.farSet = true;   // the frame's light and view, once a frame
      gl.uniformMatrix4fv(u['uVP']!, false, this.vp); gl.uniform3fv(u['uSun']!, L.sun); gl.uniform3fv(u['uEye']!, F.eye); gl.uniform3fv(u['uFog']!, F.fog); gl.uniform3fv(u['uSky']!, L.sky); gl.uniform3fv(u['uGround']!, L.ground); gl.uniform1f(u['uAmb']!, L.amb); gl.uniform3fv(u['uSunCol']!, L.sunCol);
      gl.uniform1f(u['uFogNear']!, F.near); gl.uniform1f(u['uFogFar']!, F.far); gl.uniform1f(u['uAlpha']!, 1); }
    gl.uniformMatrix4fv(u['uM']!, false, model); gl.uniform1f(u['uUseTint']!, tint ? 1 : 0); if (tint) gl.uniform3fv(u['uTint']!, tint); gl.uniform1f(u['uGlow']!, this.glowNow); gl.uniform4f(u['uFar']!, sh.sideX, sh.head, sx, sz);
    gl.bindVertexArray(m.vao); gl.drawArrays(gl.TRIANGLES, first, count); this.tally.draws += 1; this.tally.tris += count / 3;
    gl.useProgram(this.prog);
  }
  private far: { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> } | null = null; private farSet = false; private frame: { eye: V3; fog: V3; near: number; far: number } | null = null;
  /** the sky: a dome around the eye coloured from the horizon to the zenith, drawn first and behind everything */
  sky(eye: V3, horizon: V3, zenith: V3, radius = 100) {
    const gl = this.gl; if (!this.dome) { const v: number[] = []; const N = 24, M = 8; const pt = (i: number, j: number): V3 => { const a = (i / N) * Math.PI * 2, e = (j / M) * Math.PI / 2 - 0.12; return [Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)]; };
      for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const q = [pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)]; for (const k of [0, 2, 1, 0, 3, 2]) { const p = q[k]!; const h = Math.max(0, p[1]); v.push(p[0], p[1], p[2], 0, -1, 0, h, h, h); } }
      this.dome = this.mesh(v); }
    gl.depthMask(false); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.uniform1f(this.u['uGrad']!, 1); gl.uniform3fv(this.u['uTint']!, horizon); gl.uniform3fv(this.u['uTint2']!, zenith); gl.uniform1f(this.u['uUseTint']!, 0);
    gl.uniformMatrix4fv(this.u['uM']!, false, m4.trs(eye, 0, [radius, radius, radius])); gl.bindVertexArray(this.dome.vao); gl.drawArrays(gl.TRIANGLES, 0, this.dome.n); this.tally.draws += 1; this.tally.tris += this.dome.n / 3;
    gl.uniform1f(this.u['uGrad']!, 0); gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.depthMask(true);
  }
  dome: Mesh | null = null;
  dispose() { this.gl.getExtension('WEBGL_lose_context')?.loseContext(); }
}
