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
out vec4 o;
void main(){
  vec3 n = normalize(vNor); float d = max(dot(n, uSun), 0.0);
  vec3 sky = vec3(0.78,0.86,0.95), ground = vec3(0.45,0.42,0.36);
  vec3 amb = mix(ground, sky, n.y*0.5+0.5) * 0.48;
  vec3 c = vCol * (amb + vec3(1.0,0.96,0.88) * d * 0.72);
  float rim = pow(1.0 - max(dot(n, normalize(uEye - vWorld)), 0.0), 3.0) * 0.08; c += rim;
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

export interface Mesh { vao: WebGLVertexArrayObject; n: number }
export class Renderer {
  gl: WebGL2RenderingContext; prog: WebGLProgram; u: Record<string, WebGLUniformLocation | null> = {}; unit: Mesh; disc: Mesh;
  constructor(public canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' }); if (!gl) throw new Error('WebGL2 is not available in this browser');
    this.gl = gl; const sh = (t: number, s: string) => { const x = gl.createShader(t)!; gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x) || 'shader'); return x; };
    const p = gl.createProgram()!; gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
    this.prog = p; for (const k of ['uVP', 'uM', 'uTint', 'uUseTint', 'uSun', 'uEye', 'uFog', 'uFogNear', 'uFogFar', 'uAlpha']) this.u[k] = gl.getUniformLocation(p, k);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
    const v: number[] = []; boxVerts({ min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5], color: '#ffffff' }, v); this.unit = this.mesh(v);
    const d: number[] = []; const N = 20; for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2, b = ((i + 1) / N) * Math.PI * 2; d.push(0, 0, 0, 0, 1, 0, 0, 0, 0, Math.cos(b) * 0.5, 0, Math.sin(b) * 0.5, 0, 1, 0, 0, 0, 0, Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5, 0, 1, 0, 0, 0, 0); } this.disc = this.mesh(d);
  }
  mesh(v: number[]): Mesh {
    const gl = this.gl; const vao = gl.createVertexArray()!; gl.bindVertexArray(vao); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
    for (let i = 0; i < 3; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 3, gl.FLOAT, false, 36, i * 12); }
    gl.bindVertexArray(null); return { vao, n: v.length / 9 };
  }
  resize(dpr: number) { const c = this.canvas; const w = Math.max(1, Math.round(c.clientWidth * dpr)), h = Math.max(1, Math.round(c.clientHeight * dpr)); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } this.gl.viewport(0, 0, w, h); }
  begin(vp: M4, eye: V3, fog: V3, near: number, far: number) {
    const gl = this.gl; gl.clearColor(fog[0], fog[1], fog[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.useProgram(this.prog);
    gl.uniformMatrix4fv(this.u['uVP']!, false, vp); gl.uniform3fv(this.u['uSun']!, norm([0.45, 0.8, 0.35])); gl.uniform3fv(this.u['uEye']!, eye); gl.uniform3fv(this.u['uFog']!, fog);
    gl.uniform1f(this.u['uFogNear']!, near); gl.uniform1f(this.u['uFogFar']!, far); gl.uniform1f(this.u['uAlpha']!, 1); gl.disable(gl.BLEND);
  }
  draw(m: Mesh, model: M4 = m4.ident(), tint?: V3, alpha = 1) {
    const gl = this.gl; gl.uniformMatrix4fv(this.u['uM']!, false, model); gl.uniform1f(this.u['uUseTint']!, tint ? 1 : 0); if (tint) gl.uniform3fv(this.u['uTint']!, tint);
    if (alpha < 1) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); } gl.uniform1f(this.u['uAlpha']!, alpha);
    gl.bindVertexArray(m.vao); gl.drawArrays(gl.TRIANGLES, 0, m.n);
    if (alpha < 1) { gl.disable(gl.BLEND); gl.depthMask(true); gl.uniform1f(this.u['uAlpha']!, 1); }
  }
  dispose() { this.gl.getExtension('WEBGL_lose_context')?.loseContext(); }
}
