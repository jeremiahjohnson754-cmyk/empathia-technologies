/**
 * Empathia Map (task #234; founder 18 Nov 13:42, 13:51, 14:00, 14:10: "Fix the campus maps … it is not the quality we're looking for").
 * One map for the campus wherever it appears (investor start, Mission Control, Campus, Search Party): a synthetic aerial view or our own
 * street style of the fictional campus, the buildings in 3D, fluid pan / zoom / rotate / tilt with mouse, touch and keyboard, and a
 * camera that flies — campus → building → floor (cut away, rooms laid out) → room — and back up. A building opens a place card; a room
 * opens the exact room in Lite, Commissioning, Assurance, Core Replay, Search Party and ServiceHands. Original Empathia design: familiar
 * conventions (search, zoom, layers, compass, place card), with no other map provider's marks or styling.
 * Honesty: the imagery is painted from the canonical footprints and says so; storey heights and the room layout inside a floor are
 * MODELED (the canon holds floor counts and room sizes, not floor plans); every number on a pin comes from the room records.
 * Every building and room is also a real button (keyboard, screen reader); without WebGL2 the caller shows the SVG map instead.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Renderer, m4, prismVerts, boxVerts, cylinderVerts, sphereVerts, hex, norm, type V3, type M4, type Mesh } from '../play/gl.js';
import { BUILDINGS, roomsIn, shortName, type Building, type RoomOutline } from '../campus/canon.js';
import { roomRecord } from '../campus/design.js';
import { roomIssues } from '../campus/metrics.js';
import { load as loadWs } from '../workspace/store.js';
import { useOpens } from '../spatial/parts.js';
import { layoutOf, paintAsync, GROUND, STOREY, type Layout, type Rect } from './imagery.js';
import type { CampusTile } from '../spatial/Spatial.js';

type Mode = 'imagery' | 'map';
type Level = { k: 'campus' } | { k: 'building'; b: string } | { k: 'floor'; b: string; f: number };
interface Cam { tx: number; tz: number; dist: number; yaw: number; pitch: number }
interface RoomBox { o: RoomOutline; x: number; z: number; w: number; d: number; state: string; issues: number }

export const webgl2 = () => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } };
const STATE_COL: Record<string, string> = { OPERATIONAL: '#2f9e6b', ACCEPTED: '#2f9e6b', COMMISSIONING: '#d79a2b', INSTALLED_UNVERIFIED: '#d4762c', INSTALLATION_PENDING: '#6f86c9', DESIGN_APPROVED: '#6f86c9', PLANNED: '#8b93a1' };
const STATE_WORD: Record<string, string> = { OPERATIONAL: 'operational', ACCEPTED: 'accepted', COMMISSIONING: 'commissioning', INSTALLED_UNVERIFIED: 'installed, not verified', INSTALLATION_PENDING: 'installation pending', DESIGN_APPROVED: 'design approved', PLANNED: 'planned' };
const BAND_GLYPH = { healthy: '●', monitor: '▲', action: '◆', none: '○' } as const;
// a facade palette per building, so the campus reads as six different buildings (all MODELED materials)
const LOOK: Record<string, { glass: string; slab: string; roof: string }> = { ATL: { glass: '#3e586f', slab: '#e2ddd2', roof: '#6f6d68' }, MER: { glass: '#5c7684', slab: '#cfc8bb', roof: '#7a776f' }, FRG: { glass: '#8d969b', slab: '#b9b3a7', roof: '#8a8d8f' }, BCN: { glass: '#4f6f6a', slab: '#e8e1d2', roof: '#74716a' }, HZN: { glass: '#2f3f52', slab: '#d8d2c6', roof: '#5f5e5a' }, NST: { glass: '#566a7d', slab: '#ddd6c9', roof: '#77746d' } };
const MAPLOOK = { glass: '#e7e1d6', slab: '#efe9df', roof: '#dcd4c6' };
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// the imagery is painted once per mode and shared by every map on the page
const painted: Partial<Record<Mode, HTMLCanvasElement>> = {}; const painting: Partial<Record<Mode, Promise<HTMLCanvasElement>>> = {}; let LAYOUT: Layout | null = null;
const layout = () => (LAYOUT ||= layoutOf(BUILDINGS));

function invert(m: M4): M4 | null { const a = m, o = new Float32Array(16);
  const b00 = a[0]! * a[5]! - a[1]! * a[4]!, b01 = a[0]! * a[6]! - a[2]! * a[4]!, b02 = a[0]! * a[7]! - a[3]! * a[4]!, b03 = a[1]! * a[6]! - a[2]! * a[5]!, b04 = a[1]! * a[7]! - a[3]! * a[5]!, b05 = a[2]! * a[7]! - a[3]! * a[6]!;
  const b06 = a[8]! * a[13]! - a[9]! * a[12]!, b07 = a[8]! * a[14]! - a[10]! * a[12]!, b08 = a[8]! * a[15]! - a[11]! * a[12]!, b09 = a[9]! * a[14]! - a[10]! * a[13]!, b10 = a[9]! * a[15]! - a[11]! * a[13]!, b11 = a[10]! * a[15]! - a[11]! * a[14]!;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!det) return null; det = 1 / det;
  o[0] = (a[5]! * b11 - a[6]! * b10 + a[7]! * b09) * det; o[1] = (a[2]! * b10 - a[1]! * b11 - a[3]! * b09) * det; o[2] = (a[13]! * b05 - a[14]! * b04 + a[15]! * b03) * det; o[3] = (a[10]! * b04 - a[9]! * b05 - a[11]! * b03) * det;
  o[4] = (a[6]! * b08 - a[4]! * b11 - a[7]! * b07) * det; o[5] = (a[0]! * b11 - a[2]! * b08 + a[3]! * b07) * det; o[6] = (a[14]! * b02 - a[12]! * b05 - a[15]! * b01) * det; o[7] = (a[8]! * b05 - a[10]! * b02 + a[11]! * b01) * det;
  o[8] = (a[4]! * b10 - a[5]! * b08 + a[7]! * b06) * det; o[9] = (a[1]! * b08 - a[0]! * b10 - a[3]! * b06) * det; o[10] = (a[12]! * b04 - a[13]! * b02 + a[15]! * b00) * det; o[11] = (a[9]! * b02 - a[8]! * b04 - a[11]! * b00) * det;
  o[12] = (a[5]! * b07 - a[4]! * b09 - a[6]! * b06) * det; o[13] = (a[0]! * b09 - a[1]! * b07 + a[2]! * b06) * det; o[14] = (a[13]! * b01 - a[12]! * b03 - a[14]! * b00) * det; o[15] = (a[8]! * b03 - a[9]! * b01 + a[10]! * b00) * det; return o; }
const xf = (m: M4, p: [number, number, number, number]) => [0, 1, 2, 3].map((r) => m[r]! * p[0] + m[4 + r]! * p[1] + m[8 + r]! * p[2] + m[12 + r]! * p[3]) as [number, number, number, number];

/** rooms of a floor laid out inside the footprint (MODELED: shelf-packed by size, scaled down if the floor is full) */
function roomLayout(b: Building, f: number, w: ReturnType<typeof loadWsSafe>): RoomBox[] {
  const L = layout(); const F = L.foot[b.key]!; const rs = [...roomsIn(b.key, f)].sort((p, q) => q.dims[0] * q.dims[1] - p.dims[0] * p.dims[1]);
  const pad = 3, gap = 2.4; let s = 1;
  for (let k = 0; k < 12; k++) { let x = pad, z = pad, row = 0, ok = true; for (const r of rs) { const rw = Math.max(4, r.dims[0] * s), rd = Math.max(4, r.dims[1] * s); if (x + rw > F.w - pad) { x = pad; z += row + gap; row = 0; } if (z + rd > F.d - pad) { ok = false; break; } x += rw + gap; row = Math.max(row, rd); } if (ok) break; s *= 0.82; }
  let x = pad, z = pad, row = 0; const out: RoomBox[] = [];
  for (const r of rs) { const rw = Math.max(4, r.dims[0] * s), rd = Math.max(4, r.dims[1] * s); if (x + rw > F.w - pad) { x = pad; z += row + gap; row = 0; } const rec = roomRecord(r.id); out.push({ o: r, x: F.x + x, z: F.z + z, w: rw, d: rd, state: rec?.lifecycle || 'PLANNED', issues: rec ? roomIssues(rec, w).length : 0 }); x += rw + gap; row = Math.max(row, rd); }
  // centre the block on the floor (it was packed into the north-west corner)
  if (out.length) { const mx = Math.max(...out.map((b) => b.x + b.w)) - F.x, mz = Math.max(...out.map((b) => b.z + b.d)) - F.z; const ox = (F.w - mx - pad) / 2, oz = (F.d - mz - pad) / 2; for (const b of out) { b.x += ox; b.z += oz; } }
  return out;
}
function loadWsSafe() { try { return loadWs(); } catch { return null; } }

const GVS = `#version 300 es
layout(location=0) in vec2 aXZ; uniform mat4 uVP; uniform vec4 uBox; out vec2 vUV; out vec3 vW;
void main(){ vec3 w = vec3(aXZ.x, 0.0, aXZ.y); vW = w; vUV = vec2((w.x - uBox.x) / uBox.z, (w.z - uBox.y) / uBox.z); gl_Position = uVP * vec4(w, 1.0); }`;
const GFS = `#version 300 es
precision mediump float; in vec2 vUV; in vec3 vW; uniform sampler2D uTex; uniform vec3 uEye; uniform vec3 uFog; uniform float uNear; uniform float uFar; uniform vec3 uEdge; uniform float uOver; out vec4 o;
void main(){ vec2 e = min(vUV, 1.0 - vUV); float inside = step(0.0, min(e.x, e.y));
  if (uOver > 0.5) { vec4 h = texture(uTex, clamp(vUV, 0.0, 1.0)); o = vec4(h.rgb, h.a * inside); return; }
  vec3 c = mix(uEdge, texture(uTex, clamp(vUV, 0.0, 1.0)).rgb, inside * smoothstep(0.0, 0.06, min(e.x, e.y)));
  float f = clamp((distance(uEye, vW) - uNear) / (uFar - uNear), 0.0, 1.0); o = vec4(mix(c, uFog, f * f), 1.0); }`;

type Lens = 'none' | 'risk' | 'issues';
const LENS_NAME: Record<Lens, string> = { none: 'No lens', risk: 'Health risk', issues: 'Issues' };
interface Metric { rows: Array<{ b: Building; v: number | null; issues: number; rooms: number; score: number | null }>; max: number; topRaw: Building | null; topRate: Building | null }
/** the lens values per building, from the same tiles the pins use (the room records and the service workspace) */
function metricOf(lens: Lens, rate: boolean, tiles: Record<string, CampusTile>): Metric | null {
  if (lens === 'none') return null;
  const rows = BUILDINGS.map((b) => { const x = tiles[b.key] || { score: null, band: 'none' as const, issues: 0, rooms: 0 }; const v = lens === 'risk' ? (x.score == null ? null : 100 - x.score) : rate ? (x.rooms ? (x.issues / x.rooms) * 10 : null) : x.issues; return { b, v, issues: x.issues, rooms: x.rooms, score: x.score }; });
  const top = (f: (r: Metric['rows'][number]) => number) => { const r = [...rows].sort((a, c) => f(c) - f(a))[0]; return r && f(r) > 0 ? r.b : null; };
  return { rows, max: Math.max(0, ...rows.map((r) => r.v ?? 0)), topRaw: top((r) => r.issues), topRate: top((r) => (r.rooms ? r.issues / r.rooms : 0)) };
}
const fmt = (lens: Lens, rate: boolean, v: number | null) => (v == null ? '—' : lens === 'issues' && rate ? `${v.toFixed(1)}/10 rooms` : lens === 'issues' ? `${v} issue${v === 1 ? '' : 's'}` : `risk ${v}`);
/** a soft glow on the ground under each building, its size and colour by the lens value (sequential: one hue, light → dark) */
function heatCanvas(m: Metric, lens: Lens): HTMLCanvasElement {
  const N = 512; const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d')!; const L = layout(); const P = (v: number) => (v / GROUND.size) * N;
  const lo = lens === 'issues' ? [255, 210, 120] : [196, 178, 255], hi = lens === 'issues' ? [185, 28, 28] : [76, 29, 149];
  for (const r of m.rows) { if (!r.v || !m.max) continue; const k = r.v / m.max; const F = L.foot[r.b.key]!; const cx = P(F.x + F.w / 2 - GROUND.x0), cz = P(F.z + F.d / 2 - GROUND.z0); const rad = P(Math.max(F.w, F.d) * 0.62 + 18 + 26 * k);
    const col = lo.map((a, i) => Math.round(a + (hi[i]! - a) * k)).join(','); const gr = g.createRadialGradient(cx, cz, 0, cx, cz, rad); gr.addColorStop(0, `rgba(${col},${(0.42 + 0.4 * k).toFixed(2)})`); gr.addColorStop(0.55, `rgba(${col},${(0.25 + 0.3 * k).toFixed(2)})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.beginPath(); g.arc(cx, cz, rad, 0, 7); g.fill(); }
  return c;
}
function Legend({ lens, rate, setRate, metric, at, opens }: { lens: Lens; rate: boolean; setRate: (b: boolean) => void; metric: Metric; at: Date; opens: (h: string) => boolean }) {
  const hhmm = at.toTimeString().slice(0, 5); const lo = lens === 'issues' ? '#ffd278' : '#c4b2ff', hi = lens === 'issues' ? '#b91c1c' : '#4c1d95';
  const rr = (b: Building | null) => { const r = metric.rows.find((x) => x.b === b); return r ? r : null; };
  const a = rr(metric.topRaw), b = rr(metric.topRate);
  return (
    <section className="emap__legend" aria-label={`${LENS_NAME[lens]} legend`} data-testid="emap-legend">
      <h3>{lens === 'issues' ? (rate ? 'Open issues per 10 rooms' : 'Open issues') : 'Health risk (100 − health score)'}</h3>
      {lens === 'issues' && <div className="emap__seg" role="group" aria-label="Count or rate"><button type="button" aria-pressed={!rate} onClick={() => setRate(false)} data-testid="emap-count">Count</button><button type="button" aria-pressed={rate} onClick={() => setRate(true)} data-testid="emap-rate">Per 10 rooms</button></div>}
      <div className="emap__scale" aria-hidden="true"><i style={{ background: `linear-gradient(90deg, ${lo}, ${hi})` }} /><span>0</span><span>{fmt(lens, rate, lens === 'issues' && rate ? Math.round(metric.max * 10) / 10 : metric.max)}</span></div>
      {lens === 'issues' && <p data-testid="emap-legend-top">Most issues: <b>{a ? `${a.b.short} (${a.issues} in ${a.rooms} rooms)` : 'none'}</b>. Most per 10 rooms: <b>{b ? `${b.b.short} (${((b.issues / Math.max(1, b.rooms)) * 10).toFixed(1)})` : 'none'}</b>. A large building with many issues is not necessarily less reliable than a small one with a few.</p>}
      {lens === 'risk' && <p>A building with no scored room has no risk value and no glow (it is not a zero).</p>}
      <p className="emap__src" data-testid="emap-legend-src">From the room records and the service workspace held in this browser · synthetic · computed at {hhmm}.</p>
      {opens('#/pro/issues') && !location.hash.startsWith('#/pro/issues') && <a href="#/pro/issues" className="emap__jump" data-testid="emap-legend-pro">Open Issue Intelligence</a>}
    </section>
  );
}

export function EmpathiaMap({ tiles, onOpen, onPreview, current, testId = 'campus-3d', lens: lens0 = 'none' }: { tiles: Record<string, CampusTile>; onOpen: (b: Building) => void; onPreview?: (b: Building | null) => void; current?: string; testId?: string; lens?: Lens }) {
  const opens = useOpens();
  const host = useRef<HTMLDivElement>(null); const canvas = useRef<HTMLCanvasElement>(null);
  const pins = useRef<Record<string, HTMLButtonElement | null>>({}); const rpins = useRef<Record<string, HTMLButtonElement | null>>({}); const needle = useRef<HTMLSpanElement>(null);
  const [mode, setMode] = useState<Mode>('imagery'); const [tilt, setTilt] = useState(true);
  const [level, setLevel] = useState<Level>(() => (current ? { k: 'building', b: current } : { k: 'campus' }));
  const [room, setRoom] = useState<string | null>(null); const [q, setQ] = useState(''); const [ready, setReady] = useState(false); const [err, setErr] = useState('');
  const sel = level.k === 'campus' ? null : BUILDINGS.find((b) => b.key === level.b) || null;
  const [lens, setLens] = useState<Lens>(lens0); const [rate, setRate] = useState(false); const [at] = useState(() => new Date());
  const metric = useMemo(() => metricOf(lens, rate, tiles), [lens, rate, tiles]);
  const ws = useMemo(loadWsSafe, []);
  const rooms = useMemo(() => (level.k === 'floor' && sel ? roomLayout(sel, level.f, ws) : []), [level, sel, ws]);
  // the camera lives outside React (it changes every frame); `kick` asks for a redraw
  const S = useRef({ cam: { tx: 0, tz: 0, dist: 520, yaw: -0.65, pitch: 0.86 } as Cam, from: null as Cam | null, to: null as Cam | null, t0: 0, dur: 1, dirty: true, raf: 0, kick: () => {}, mode, tilt, level, rooms, sel: sel?.key || null, hover: null as string | null, vp: null as M4 | null, soft: false, heat: null as { key: string; c: HTMLCanvasElement } | null });
  S.current.mode = mode; S.current.tilt = tilt; S.current.level = level; S.current.rooms = rooms; S.current.sel = sel?.key || null;
  const heat = useMemo(() => (metric ? { key: `${lens}:${rate}:${metric.rows.map((r) => r.v ?? '-').join(',')}`, c: heatCanvas(metric, lens) } : null), [metric, lens, rate]);
  S.current.heat = heat;

  const L = layout();
  const centreOf = (r: Rect) => [r.x + r.w / 2, r.z + r.d / 2] as const;
  const camFor = (lv: Level): Cam => { const s = S.current.cam;
    if (lv.k === 'campus') { const r = L.ring; return { tx: r.x + r.w / 2, tz: r.z + r.d / 2 + 20, dist: 560, yaw: s.yaw, pitch: S.current.tilt ? 0.86 : 1.52 }; }
    const b = BUILDINGS.find((x) => x.key === lv.b)!; const F = L.foot[b.key]!; const [cx0, cz0] = centreOf(F); const span = Math.max(F.w, F.d);
    const c: Cam = lv.k === 'building' ? { tx: cx0, tz: cz0, dist: span * 2.4 + b.floors * STOREY * 3, yaw: s.yaw, pitch: S.current.tilt ? 0.62 : 1.52 } : { tx: cx0, tz: cz0, dist: span * 1.55, yaw: s.yaw, pitch: S.current.tilt ? 1.08 : 1.55 };
    // on a desktop the place card covers the left of the map: frame the subject in the space that is left
    const wide = (host.current?.clientWidth || 1000) > 640; const k = c.dist * (wide ? 0.2 : 0.24);
    if (wide) { c.tx -= Math.cos(c.yaw) * k; c.tz += Math.sin(c.yaw) * k; }   // (on a phone the card sits under the map: no offset)
    return c; };
  const fly = (to: Cam, slow = 1) => { const st = S.current; if (reduced()) { st.cam = { ...to }; st.to = null; st.kick(); return; } st.from = { ...st.cam }; st.to = to; st.t0 = performance.now(); st.dur = (st.soft ? 450 : 1300) * slow; st.kick(); };
  const goLevel = (lv: Level) => { setLevel(lv); setRoom(null); fly(camFor(lv)); onPreview?.(lv.k === 'campus' ? null : BUILDINGS.find((b) => b.key === lv.b) || null); };

  // ---- the renderer --------------------------------------------------------------------------------------------------------------
  useEffect(() => {
    // the 3D starts after the page has painted (18 Nov: built during mount it delayed the page's own first paint by a few hundred ms on a
    // slow machine); the buttons, card and text are there at once
    let stop: (() => void) | undefined; let live = true;
    // …and when the browser is idle (a click made at once is answered first; 18 Nov: started during a navigation it delayed the next page)
    const idle = (f: () => void, t: number) => { const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }; if (w.requestIdleCallback) w.requestIdleCallback(f, { timeout: t }); else setTimeout(f, 200); };
    idle(() => { if (live) stop = init(); }, 1500);
    return () => { live = false; stop?.(); };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const init = (): (() => void) | undefined => {
    const cv = canvas.current; if (!cv) return undefined; let r: Renderer; try { r = new Renderer(cv); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); return undefined; }
    const gl = r.gl; const st = S.current;
    // the graphics tier (#227): a software renderer (no GPU) draws a frame in tens of milliseconds, so it gets no opening flight and
    // standard resolution; a GPU gets the cinematic opening and up to 2× pixels. The tier is on the element as evidence (data-gpu).
    const dbg = gl.getExtension('WEBGL_debug_renderer_info'); const gpuName = String((dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) || '');
    const soft = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpuName); st.soft = soft; host.current?.setAttribute('data-gpu', soft ? 'software' : 'hardware');
    { const c = camFor(st.level); const still = reduced() || soft; st.cam = still ? c : { ...c, dist: c.dist * 2.6, pitch: Math.min(1.5, c.pitch + 0.5), yaw: c.yaw - 0.9 }; if (!still) { st.from = { ...st.cam }; st.to = c; st.t0 = performance.now() + 250; st.dur = 2600; } }
    // ground program and textures
    const sh = (t: number, s: string) => { const x = gl.createShader(t)!; gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x) || 'shader'); return x; };
    const gp = gl.createProgram()!; gl.attachShader(gp, sh(gl.VERTEX_SHADER, GVS)); gl.attachShader(gp, sh(gl.FRAGMENT_SHADER, GFS)); gl.linkProgram(gp);
    const gu = Object.fromEntries(['uVP', 'uBox', 'uTex', 'uEye', 'uFog', 'uNear', 'uFar', 'uEdge', 'uOver'].map((k) => [k, gl.getUniformLocation(gp, k)]));
    const gvao = gl.createVertexArray()!; gl.bindVertexArray(gvao); const gb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, gb); const E = 2400;
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-E, -E, E, -E, E, E, -E, -E, E, E, -E, E].map((v, i) => v + (i % 2 ? GROUND.z0 : GROUND.x0) + GROUND.size / 2)), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
    const tex: Partial<Record<Mode, WebGLTexture>> = {}; const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    const upload = (m: Mode) => { if (tex[m]) return tex[m]!; const c = painted[m]!; const t = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT))); return (tex[m] = t); };
    // buildings: one mesh per storey band and one roof per building, per look (aerial and map)
    const B: Record<string, { floors: Mesh[]; roof: Mesh; mfloors: Mesh[]; mroof: Mesh; h: number }> = {};
    for (const b of BUILDINGS) { const F = L.foot[b.key]!; const pts: Array<[number, number]> = [[F.x, F.z], [F.x + F.w, F.z], [F.x + F.w, F.z + F.d], [F.x, F.z + F.d]]; const H = b.floors * STOREY;
      const make = (lk: { glass: string; slab: string; roof: string }) => { const floors: Mesh[] = []; for (let i = 0; i < b.floors; i++) { const v: number[] = []; const y = i * STOREY; prismVerts(pts, y, y + 0.9, lk.slab, v, false); prismVerts(pts, y + 0.9, y + STOREY, lk.glass, v, false);
          // mullions: thin vertical fins every 3 m on the long sides
          if (lk !== MAPLOOK) for (let x = F.x + 3; x < F.x + F.w - 1; x += 3) { boxVerts({ min: [x - 0.12, y + 0.9, F.z - 0.18], max: [x + 0.12, y + STOREY, F.z], color: lk.slab }, v); boxVerts({ min: [x - 0.12, y + 0.9, F.z + F.d], max: [x + 0.12, y + STOREY, F.z + F.d + 0.18], color: lk.slab }, v); }
          floors.push(r.mesh(v)); }
        const v: number[] = []; prismVerts(pts, H, H + 0.6, lk.roof, v, true); for (const [a, c] of [[[F.x, F.z], [F.x + F.w, F.z + 0.5]], [[F.x, F.z + F.d - 0.5], [F.x + F.w, F.z + F.d]], [[F.x, F.z], [F.x + 0.5, F.z + F.d]], [[F.x + F.w - 0.5, F.z], [F.x + F.w, F.z + F.d]]] as Array<[[number, number], [number, number]]>) boxVerts({ min: [a[0], H + 0.6, a[1]], max: [c[0], H + 1.5, c[1]], color: lk.slab }, v);
        if (lk !== MAPLOOK) { let s = b.key.charCodeAt(0) * 7 + b.key.charCodeAt(2); for (let k = 0; k < 4; k++) { s = (s * 9301 + 49297) % 233280; const u = s / 233280; const ux = F.x + 6 + u * (F.w - 18), uz = F.z + 5 + ((k * 0.27 + u * 0.4) % 1) * (F.d - 14); boxVerts({ min: [ux, H + 0.6, uz], max: [ux + 5 + u * 3, H + 2.6, uz + 3.5], color: '#b9bcbe' }, v); } }
        return { floors, roof: r.mesh(v) }; };
      const a = make(LOOK[b.key] || LOOK['ATL']!), mm = make(MAPLOOK); B[b.key] = { floors: a.floors, roof: a.roof, mfloors: mm.floors, mroof: mm.roof, h: H }; }
    // trees near the campus in 3D (the woodland beyond is in the imagery)
    let trees: Mesh | null = null; const buildTrees = () => {
    const tv: number[] = []; for (const t of L.trees) { const near = t.x > L.ring.x - 70 && t.x < L.ring.x + L.ring.w + 70 && t.z > L.ring.z - 70 && t.z < L.ring.z + L.ring.d + 70; if (!near) continue; const c = hex(t.tone < 0.3 ? '#4d6b33' : '#3d5f2f'); cylinderVerts(t.x, t.z, 0.35, 0.35, 0, t.h * 0.45, '#5a4636', tv, 6); sphereVerts([t.x, t.h * 0.62, t.z], [t.r * 0.9, t.h * 0.42, t.r * 0.9], c, tv, 8, 6); }
    trees = r.mesh(tv); st.kick(); };
    { const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }; if (w.requestIdleCallback) w.requestIdleCallback(buildTrees, { timeout: 2500 }); else setTimeout(buildTrees, 300); }
    const roomMeshes = new Map<string, Mesh>(); const slabs = new Map<string, Mesh>();
    const slabMesh = (k: string, f: number) => { const id = `${k}@${f}`; let m = slabs.get(id); if (!m) { const F = L.foot[k]!; const v: number[] = []; const y = (f - 1) * STOREY; prismVerts([[F.x, F.z], [F.x + F.w, F.z], [F.x + F.w, F.z + F.d], [F.x, F.z + F.d]], y, y + 0.9, '#e4e0d8', v, true); m = r.mesh(v); slabs.set(id, m); } return m; };
    const roomMesh = (rb: RoomBox, y: number) => { const k = `${rb.o.id}@${y}`; let m = roomMeshes.get(k); if (!m) { const v: number[] = []; boxVerts({ min: [rb.x, y, rb.z], max: [rb.x + rb.w, y + 0.25, rb.z + rb.d], color: STATE_COL[rb.state] || '#8b93a1' }, v); for (const [a, c] of [[[rb.x, rb.z], [rb.x + rb.w, rb.z + 0.3]], [[rb.x, rb.z + rb.d - 0.3], [rb.x + rb.w, rb.z + rb.d]], [[rb.x, rb.z], [rb.x + 0.3, rb.z + rb.d]], [[rb.x + rb.w - 0.3, rb.z], [rb.x + rb.w, rb.z + rb.d]]] as Array<[[number, number], [number, number]]>) boxVerts({ min: [a[0], y + 0.25, a[1]], max: [c[0], y + 2.4, c[1]], color: '#e8edf2' }, v); m = r.mesh(v); roomMeshes.set(k, m); } return m; };

    let heatTex: WebGLTexture | null = null; let heatKey = '';
    const draw = () => {
      st.raf = 0; const now = performance.now();
      if (st.to && st.from) { const t = Math.min(1, Math.max(0, (now - st.t0) / st.dur)); const e = ease(t); const a = st.from, b = st.to; const lift = Math.sin(Math.PI * t) * Math.min(0.6, Math.hypot(b.tx - a.tx, b.tz - a.tz) / 400) * (a.dist + b.dist) * 0.5;
        st.cam = { tx: a.tx + (b.tx - a.tx) * e, tz: a.tz + (b.tz - a.tz) * e, dist: a.dist + (b.dist - a.dist) * e + lift, yaw: a.yaw + (b.yaw - a.yaw) * e, pitch: a.pitch + (b.pitch - a.pitch) * e }; if (t >= 1) { st.to = null; st.from = null; } }
      const dpr = st.soft ? 1 : Math.min(2, devicePixelRatio || 1); r.resize(dpr); const W = cv.width, Hh = cv.height; const c = st.cam;
      const eye: V3 = [c.tx + Math.sin(c.yaw) * Math.cos(c.pitch) * c.dist, Math.sin(c.pitch) * c.dist, c.tz + Math.cos(c.yaw) * Math.cos(c.pitch) * c.dist];
      const up: V3 = c.pitch > 1.5 ? [-Math.sin(c.yaw), 0, -Math.cos(c.yaw)] : [0, 1, 0];
      const vp = m4.mul(m4.persp(0.62, W / Hh, Math.max(1, c.dist * 0.05), c.dist * 8 + 3000), m4.look(eye, [c.tx, 0, c.tz], up)); st.vp = vp;
      const map = st.mode === 'map'; const fog: V3 = map ? [0.93, 0.94, 0.91] : [0.72, 0.8, 0.86];
      // ground
      if (!painted[st.mode]) { const m = st.mode; (painting[m] ||= paintAsync(m, BUILDINGS, layout())).then((c) => { painted[m] = c; st.kick(); }); }
      gl.clearColor(fog[0], fog[1], fog[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (painted[st.mode]) { gl.useProgram(gp); gl.uniformMatrix4fv(gu['uVP']!, false, vp); gl.uniform4f(gu['uBox']!, GROUND.x0, GROUND.z0, GROUND.size, 0); gl.uniform3fv(gu['uEye']!, eye); gl.uniform3fv(gu['uFog']!, fog); gl.uniform1f(gu['uNear']!, c.dist * 1.2); gl.uniform1f(gu['uFar']!, c.dist * 4 + 1200); gl.uniform3fv(gu['uEdge']!, map ? [0.925, 0.93, 0.9] : [0.33, 0.43, 0.24]);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, upload(st.mode)); gl.uniform1i(gu['uTex']!, 0); gl.uniform1f(gu['uOver']!, 0); gl.disable(gl.CULL_FACE); gl.bindVertexArray(gvao); gl.drawArrays(gl.TRIANGLES, 0, 6);
        if (st.heat) { if (heatKey !== st.heat.key) { if (!heatTex) heatTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, heatTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, st.heat.c); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); heatKey = st.heat.key; }
          gl.bindTexture(gl.TEXTURE_2D, heatTex); gl.uniform1f(gu['uOver']!, 1); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.DEPTH_TEST); gl.drawArrays(gl.TRIANGLES, 0, 6); gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND); }
        gl.enable(gl.CULL_FACE); }
      // the rest through the shared renderer (lit geometry)
      gl.useProgram(r.prog); gl.uniformMatrix4fv(r.u['uVP']!, false, vp); gl.uniform3fv(r.u['uSun']!, norm([-0.55, 0.78, -0.45])); gl.uniform3fv(r.u['uEye']!, eye); gl.uniform3fv(r.u['uFog']!, fog); gl.uniform1f(r.u['uFogNear']!, c.dist * 1.2); gl.uniform1f(r.u['uFogFar']!, c.dist * 4 + 1200);
      gl.uniform3fv(r.u['uSky']!, [0.8, 0.86, 0.95]); gl.uniform3fv(r.u['uGround']!, [0.45, 0.44, 0.38]); gl.uniform1f(r.u['uAmb']!, map ? 0.95 : 0.62); gl.uniform3fv(r.u['uSunCol']!, map ? [0.25, 0.25, 0.25] : [0.62, 0.58, 0.52]); gl.uniform1f(r.u['uGlow']!, 0); gl.uniform1f(r.u['uGrad']!, 0); gl.uniform1f(r.u['uAlpha']!, 1);
      gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.depthMask(true); gl.clear(gl.DEPTH_BUFFER_BIT);
      if (!map && c.dist < 1400 && trees) r.draw(trees);
      const lv = st.level; const cut = lv.k === 'floor' ? lv : null; const late: Array<() => void> = [];
      for (const b of BUILDINGS) { const M = B[b.key]!; const fl = map ? M.mfloors : M.floors; const roof = map ? M.mroof : M.roof; const hi = st.sel === b.key || st.hover === b.key;
        if (cut && cut.b === b.key) { fl.forEach((m, i) => { if (i < cut.f - 1) r.draw(m); else if (i === cut.f - 1) late.push(() => r.draw(m, undefined, undefined, 0.22)); });
          r.draw(slabMesh(b.key, cut.f)); const y = (cut.f - 1) * STOREY + 0.95; for (const rb of st.rooms) r.draw(roomMesh(rb, y)); continue; }
        if (hi) r.glow(0.18); fl.forEach((m) => r.draw(m)); r.draw(roof); if (hi) r.glow(0); }
      late.forEach((f) => f());
      setReady(true); place(vp, cv);
      if (needle.current) needle.current.style.transform = `rotate(${(-c.yaw * 180) / Math.PI}deg)`;
      host.current?.setAttribute('data-dist', c.dist.toFixed(0)); host.current?.setAttribute('data-yaw', c.yaw.toFixed(2)); host.current?.setAttribute('data-pitch', c.pitch.toFixed(2));
      if (st.to) st.raf = requestAnimationFrame(draw);
    };
    // pins follow the buildings and rooms on screen
    const place = (vp: M4, cv2: HTMLCanvasElement) => { const w = cv2.clientWidth, h = cv2.clientHeight; const proj = (x: number, y: number, z: number) => { const p = xf(vp, [x, y, z, 1]); if (p[3] <= 0) return null; return [(p[0] / p[3] * 0.5 + 0.5) * w, (1 - (p[1] / p[3] * 0.5 + 0.5)) * h] as const; };
      for (const b of BUILDINGS) { const el = pins.current[b.key]; if (!el) continue; const F = L.foot[b.key]!; const s = proj(F.x + F.w / 2, b.floors * STOREY + 4, F.z + F.d / 2); const show = !!s && s[0] > -40 && s[0] < w + 40 && s[1] > -20 && s[1] < h + 40 && !(st.level.k === 'floor');
        el.style.transform = s ? `translate(${s[0].toFixed(1)}px, ${s[1].toFixed(1)}px) translate(-50%, -100%)` : ''; el.style.visibility = show ? 'visible' : 'hidden'; }
      const lv = st.level; for (const rb of st.rooms) { const el = rpins.current[rb.o.id]; if (!el || lv.k !== 'floor') continue; const s = proj(rb.x + rb.w / 2, (lv.f - 1) * STOREY + 2.6, rb.z + rb.d / 2); el.style.transform = s ? `translate(${s[0].toFixed(1)}px, ${s[1].toFixed(1)}px) translate(-50%, -50%)` : ''; el.style.visibility = s ? 'visible' : 'hidden'; } };
    st.kick = () => { if (!st.raf) st.raf = requestAnimationFrame(draw); };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => st.kick()) : null; ro?.observe(cv);
    const lost = (e: Event) => { e.preventDefault(); setErr('The map’s graphics were interrupted. Reload the page to restore them.'); }; cv.addEventListener('webglcontextlost', lost);
    st.kick(); return () => { if (st.raf) cancelAnimationFrame(st.raf); ro?.disconnect(); cv.removeEventListener('webglcontextlost', lost); r.dispose(); };
  };
  useEffect(() => { S.current.kick(); }, [mode, tilt, level, rooms, room, heat]);

  // ---- input: drag to pan, right-drag / two fingers to turn and tilt, wheel / pinch to zoom, keys --------------------------------------
  useEffect(() => { const cv = canvas.current!; const st = S.current; const ptrs = new Map<number, { x: number; y: number }>(); let moved = 0; let down: { x: number; y: number; b: number } | null = null; let last2: { d: number; a: number; mx: number; my: number } | null = null;
    const clampCam = () => { const c = st.cam; c.dist = Math.max(18, Math.min(1500, c.dist)); c.pitch = Math.max(0.28, Math.min(1.55, c.pitch)); c.tx = Math.max(GROUND.x0, Math.min(GROUND.x0 + GROUND.size, c.tx)); c.tz = Math.max(GROUND.z0, Math.min(GROUND.z0 + GROUND.size, c.tz)); };
    const pan = (dx: number, dy: number) => { const c = st.cam; const k = (c.dist * 1.15) / Math.max(200, cv.clientHeight); const sy = Math.sin(c.yaw), cy = Math.cos(c.yaw); c.tx -= (dx * cy + dy * sy / Math.max(0.35, Math.sin(c.pitch))) * k; c.tz -= (-dx * sy + dy * cy / Math.max(0.35, Math.sin(c.pitch))) * k; st.to = null; clampCam(); st.kick(); };
    const turn = (dx: number, dy: number) => { st.cam.yaw -= dx * 0.006; st.cam.pitch += dy * 0.004; st.to = null; clampCam(); st.kick(); };
    const zoom = (f: number) => { st.cam.dist *= f; st.to = null; clampCam(); st.kick(); };
    const ray = (cx: number, cy: number) => { if (!st.vp) return null; const inv = invert(st.vp); if (!inv) return null; const r = cv.getBoundingClientRect(); const nx = ((cx - r.left) / r.width) * 2 - 1, ny = 1 - ((cy - r.top) / r.height) * 2; const a = xf(inv, [nx, ny, -1, 1]), b = xf(inv, [nx, ny, 1, 1]); const o: V3 = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; const e: V3 = [b[0] / b[3], b[1] / b[3], b[2] / b[3]]; return { o, d: norm([e[0] - o[0], e[1] - o[1], e[2] - o[2]]) }; };
    const hitBox = (o: V3, d: V3, mn: V3, mx: V3) => { let t0 = -Infinity, t1 = Infinity; for (let i = 0; i < 3; i++) { if (Math.abs(d[i]!) < 1e-9) { if (o[i]! < mn[i]! || o[i]! > mx[i]!) return null; continue; } const a = (mn[i]! - o[i]!) / d[i]!, b = (mx[i]! - o[i]!) / d[i]!; t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b)); } return t1 >= Math.max(t0, 0) ? Math.max(t0, 0) : null; };
    const pick = (cx: number, cy: number) => { const r = ray(cx, cy); if (!r) return null; const lv = st.level;
      if (lv.k === 'floor') { const y = (lv.f - 1) * STOREY; let best: { id: string; t: number } | null = null; for (const rb of st.rooms) { const t = hitBox(r.o, r.d, [rb.x, y, rb.z], [rb.x + rb.w, y + 2.6, rb.z + rb.d]); if (t != null && (!best || t < best.t)) best = { id: rb.o.id, t }; } if (best) return { room: best.id }; }
      let best: { b: string; t: number } | null = null; for (const b of BUILDINGS) { const F = L.foot[b.key]!; const t = hitBox(r.o, r.d, [F.x, 0, F.z], [F.x + F.w, b.floors * STOREY + 1.5, F.z + F.d]); if (t != null && (!best || t < best.t)) best = { b: b.key, t }; } return best ? { b: best.b } : null; };
    const onDown = (e: PointerEvent) => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { cv.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ } moved = 0; down = { x: e.clientX, y: e.clientY, b: e.button }; last2 = null; cv.focus({ preventScroll: true }); };
    const onMove = (e: PointerEvent) => { const p = ptrs.get(e.pointerId);
      if (!p) { const h = pick(e.clientX, e.clientY); const k = h && 'b' in h ? h.b! : null; if (k !== st.hover) { st.hover = k; cv.style.cursor = k ? 'pointer' : 'grab'; st.kick(); } return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      if (ptrs.size >= 2) { const [a, b] = [...ptrs.values()] as [{ x: number; y: number }, { x: number; y: number }]; const d = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (last2) { zoom(last2.d / Math.max(1, d)); st.cam.yaw -= ang - last2.a; turn(0, (my - last2.my) * 0.6); } last2 = { d, a: ang, mx, my }; return; }
      if (down && (down.b === 2 || e.ctrlKey || e.shiftKey)) turn(dx, dy); else pan(dx, dy); };
    const onUp = (e: PointerEvent) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) last2 = null; if (moved < 6 && down && ptrs.size === 0) { const h = pick(e.clientX, e.clientY); if (h && 'room' in h) setRoom(h.room!); else if (h && 'b' in h) goLevel({ k: 'building', b: h.b! }); } down = null; };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); zoom(Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0014))); };
    const onKey = (e: KeyboardEvent) => { const k = e.key; const step = 40; if (k === 'ArrowLeft') pan(step, 0); else if (k === 'ArrowRight') pan(-step, 0); else if (k === 'ArrowUp') pan(0, step); else if (k === 'ArrowDown') pan(0, -step); else if (k === '+' || k === '=') zoom(0.8); else if (k === '-' || k === '_') zoom(1.25); else if (k === 'q' || k === 'Q') turn(-30, 0); else if (k === 'e' || k === 'E') turn(30, 0); else return; e.preventDefault(); };
    const noMenu = (e: Event) => e.preventDefault();
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp); cv.addEventListener('wheel', onWheel, { passive: false }); cv.addEventListener('keydown', onKey); cv.addEventListener('contextmenu', noMenu);
    const dbl = (e: MouseEvent) => { const r = ray(e.clientX, e.clientY); if (r && r.d[1] < 0) { const t = -r.o[1] / r.d[1]; fly({ ...st.cam, tx: r.o[0] + r.d[0] * t, tz: r.o[2] + r.d[2] * t, dist: st.cam.dist * 0.5 }, 0.6); } }; cv.addEventListener('dblclick', dbl);
    return () => { cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointercancel', onUp); cv.removeEventListener('wheel', onWheel); cv.removeEventListener('keydown', onKey); cv.removeEventListener('contextmenu', noMenu); cv.removeEventListener('dblclick', dbl); };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  // ---- search ---------------------------------------------------------------------------------------------------------------------
  const hits = useMemo(() => { const s = q.trim().toLowerCase(); if (s.length < 2) return []; const bs = BUILDINGS.filter((b) => `${b.name} ${b.short} ${b.key}`.toLowerCase().includes(s)).map((b) => ({ k: 'b' as const, id: b.key, label: b.name, sub: `${b.floors} floors · ${b.purpose}` }));
    const rs = BUILDINGS.flatMap((b) => roomsIn(b.key)).filter((r) => `${r.id} ${r.name} ${shortName(r)} ${r.aliases.join(' ')}`.toLowerCase().includes(s)).slice(0, 6).map((r) => ({ k: 'r' as const, id: r.id, label: `${shortName(r)} · ${r.name}`, sub: `Floor ${r.floor}` })); return [...bs, ...rs].slice(0, 8); }, [q]);
  const choose = (h: { k: 'b' | 'r'; id: string }) => { setQ(''); if (h.k === 'b') goLevel({ k: 'building', b: h.id }); else { const r = BUILDINGS.flatMap((b) => roomsIn(b.key)).find((x) => x.id === h.id)!; const lv: Level = { k: 'floor', b: r.building, f: r.floor }; setLevel(lv); fly(camFor(lv)); setRoom(r.id); } };

  const t = (b: Building) => tiles[b.key] || { score: null, band: 'none' as const, issues: 0, rooms: 0 };
  const label = (b: Building) => { const x = t(b); return `${b.name}: health ${x.score == null ? 'not scored' : `${x.score} of 100`}, ${x.rooms} rooms, ${x.issues} open issue${x.issues === 1 ? '' : 's'}, ${b.floors} floors`; };
  const selRoom = room ? rooms.find((r) => r.o.id === room) || (() => { const o = BUILDINGS.flatMap((b) => roomsIn(b.key)).find((x) => x.id === room); return o ? { o, x: 0, z: 0, w: 0, d: 0, state: roomRecord(o.id)?.lifecycle || 'PLANNED', issues: 0 } : null; })() : null;
  const J = (href: string, text: string, tid: string) => (opens(href) ? <a className="emap__jump" href={href} data-testid={tid}>{text}</a> : null);

  if (err) return <div className="emap emap--err" role="alert" data-testid="emap-err"><p>{err}</p></div>;
  return (
    <div className="emap" ref={host} data-testid="emap" data-lens={lens} data-rate={rate} data-ready={ready} data-level={level.k} data-sel={sel?.key || ''} data-floor={level.k === 'floor' ? level.f : ''} data-room={room || ''} data-mode={mode} data-tilt={tilt}>
      <div className="emap__view">
      <canvas ref={canvas} className="emap__cv" tabIndex={0} role="img" aria-label="Empathia Map of the Northstar campus: drag to move, Ctrl or right-drag to turn, scroll or pinch to zoom, arrow keys to move, plus and minus to zoom, Q and E to turn. Every building and room is also a button below." data-testid="emap-canvas" />
      <div className="emap__pins" role="group" aria-label={`Campus map: ${BUILDINGS.length} buildings. Each opens its place card.`} data-testid={testId}>
        {BUILDINGS.map((b) => { const x = t(b); return <button key={b.key} type="button" ref={(e: HTMLButtonElement | null) => { pins.current[b.key] = e; }} className={`emap__pin emap__pin--${x.band}${sel?.key === b.key ? ' on' : ''}`} aria-label={label(b)} aria-current={current === b.key ? 'true' : undefined} aria-pressed={sel?.key === b.key} data-testid={`campus-b-${b.key}`}
          onClick={() => { if (sel?.key === b.key && level.k === 'building') onOpen(b); else goLevel({ k: 'building', b: b.key }); }} onMouseEnter={() => { S.current.hover = b.key; S.current.kick(); onPreview?.(b); }} onMouseLeave={() => { S.current.hover = null; S.current.kick(); }} onFocus={() => onPreview?.(b)}>
          <span className="emap__glyph" aria-hidden="true">{BAND_GLYPH[x.band]}</span><b>{b.short}</b>{metric ? <span className="emap__lv" data-testid={`emap-lv-${b.key}`}>{fmt(lens, rate, metric.rows.find((r) => r.b.key === b.key)?.v ?? null)}</span> : <><span className="emap__score">{x.score ?? '—'}</span>{x.issues > 0 && <span className="emap__iss" aria-hidden="true">{x.issues}</span>}</>}</button>; })}
        {level.k === 'floor' && rooms.map((rb) => <button key={rb.o.id} type="button" ref={(e: HTMLButtonElement | null) => { rpins.current[rb.o.id] = e; }} className={`emap__rpin${room === rb.o.id ? ' on' : ''}`} data-testid={`map-room-${rb.o.id}`} aria-label={`${shortName(rb.o)} ${rb.o.name}: ${STATE_WORD[rb.state] || rb.state}${rb.issues ? `, ${rb.issues} open issue${rb.issues === 1 ? '' : 's'}` : ''}`} aria-pressed={room === rb.o.id} onClick={() => setRoom(rb.o.id)}>
          <i style={{ background: STATE_COL[rb.state] }} aria-hidden="true" />{rb.o.number}{rb.issues > 0 && <span className="emap__iss" aria-hidden="true">{rb.issues}</span>}</button>)}
      </div>
      <div className="emap__top">
        <div className="emap__search"><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the campus: a building, a room, 4.218…" aria-label="Search the campus map" data-testid="emap-q" maxLength={60} />
          {hits.length > 0 && <ul className="emap__hits" role="listbox" aria-label="Places">{hits.map((h) => <li key={h.k + h.id} role="option" aria-selected="false"><button type="button" onClick={() => choose(h)} data-testid={`emap-hit-${h.id}`}><b>{h.label}</b><span>{h.sub}</span></button></li>)}</ul>}</div>
        <nav className="emap__crumbs" aria-label="Map level">
          <button type="button" onClick={() => goLevel({ k: 'campus' })} aria-current={level.k === 'campus' ? 'location' : undefined} data-testid="emap-up-campus">Campus</button>
          {sel && <><span aria-hidden="true">›</span><button type="button" onClick={() => goLevel({ k: 'building', b: sel.key })} aria-current={level.k === 'building' ? 'location' : undefined} data-testid="emap-up-building">{sel.short}</button></>}
          {level.k === 'floor' && <><span aria-hidden="true">›</span><span aria-current="location">Floor {level.f}</span></>}
        </nav>
      </div>
      <div className="emap__layers" role="group" aria-label="Map layers">
        <button type="button" aria-pressed={mode === 'imagery'} onClick={() => setMode('imagery')} data-testid="emap-imagery">Aerial</button>
        <button type="button" aria-pressed={mode === 'map'} onClick={() => setMode('map')} data-testid="emap-map">Map</button>
        <button type="button" aria-pressed={tilt} onClick={() => { const n = !tilt; setTilt(n); S.current.tilt = n; fly({ ...S.current.cam, pitch: n ? 0.86 : 1.54 }, 0.7); }} data-testid="emap-tilt">3D</button>
      </div>
      <div className="emap__ctrl">
        <button type="button" aria-label="North up" title="North up" onClick={() => fly({ ...S.current.cam, yaw: 0 }, 0.6)} data-testid="emap-north"><span ref={needle} className="emap__needle" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M12 2.5 15.5 12h-7z" fill="#ff6b5b" /><path d="M12 21.5 8.5 12h7z" fill="#cfd8e6" /><text x="12" y="9.6" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="#2a0e0b">N</text></svg></span></button>
        <button type="button" aria-label="Zoom in" onClick={() => fly({ ...S.current.cam, dist: Math.max(18, S.current.cam.dist * 0.6) }, 0.45)} data-testid="emap-in">+</button>
        <button type="button" aria-label="Zoom out" onClick={() => fly({ ...S.current.cam, dist: Math.min(1500, S.current.cam.dist * 1.6) }, 0.45)} data-testid="emap-out">−</button>
      </div>
      <p className="emap__credit">Empathia Map · synthetic {mode === 'imagery' ? 'aerial imagery' : 'map'} of a fictional campus · heights and floor layouts modeled</p>
      </div>
      <div className="emap__lens" role="group" aria-label="Map lens">
        {(['none', 'risk', 'issues'] as const).map((k) => <button key={k} type="button" aria-pressed={lens === k} onClick={() => setLens(k)} data-testid={`emap-lens-${k}`}>{LENS_NAME[k]}</button>)}
      </div>
      {metric && <Legend lens={lens} rate={rate} setRate={setRate} metric={metric} at={at} opens={opens} />}
      {sel && level.k !== 'campus' && !selRoom && (
        <section className="emap__card" aria-labelledby="emap-card-h" data-testid="emap-card">
          <h3 id="emap-card-h">{sel.name}</h3><p className="emap__meta">{sel.purpose} · {sel.floors} floors · opened {sel.opened}</p>
          <p className="emap__meta"><span className={`emap__band emap__band--${t(sel).band}`}>{BAND_GLYPH[t(sel).band]} {t(sel).score == null ? 'not scored' : `${t(sel).score} of 100`}</span> · {t(sel).rooms} rooms · {t(sel).issues} open issue{t(sel).issues === 1 ? '' : 's'}</p>
          <div className="emap__floors" role="group" aria-label="Floors">{Array.from({ length: sel.floors }, (_, i) => i + 1).reverse().map((f) => { const n = roomsIn(sel.key, f).length; return <button key={f} type="button" aria-pressed={level.k === 'floor' && level.f === f} disabled={!n} onClick={() => goLevel({ k: 'floor', b: sel.key, f })} data-testid={`emap-floor-${f}`} title={n ? `${n} room${n === 1 ? '' : 's'} on floor ${f}` : `No canonical room on floor ${f}`}>{f}<small>{n || ''}</small></button>; })}</div>
          {metric && lens !== 'none' && (() => { const x = t(sel); return <p className="emap__meta" data-testid="emap-card-metric">{lens === 'issues' ? <>{x.issues} open issue{x.issues === 1 ? '' : 's'} ÷ {x.rooms} rooms = <b>{x.rooms ? ((x.issues / x.rooms) * 10).toFixed(1) : '—'} per 10 rooms</b></> : <>Health {x.score ?? '—'} of 100 → risk <b>{x.score == null ? '—' : 100 - x.score}</b></>}</p>; })()}
          {metric && lens !== 'none' && opens(`#/rooms?building=${sel.key}`) && <div className="emap__acts"><a href={`#/rooms?building=${sel.key}`} className="emap__jump" data-testid="emap-card-drill">Its rooms and their issues</a></div>}
          {level.k === 'floor' && <p className="emap__note">Floor {level.f}: {rooms.length} room{rooms.length === 1 ? '' : 's'}. The layout inside the floor is modeled from each room’s size, not a surveyed plan.</p>}
          <div className="emap__acts"><button type="button" className="emap__go" onClick={() => onOpen(sel)} data-testid="emap-open">Open {sel.short}</button>{J(`#/rooms?building=${sel.key}`, 'Its rooms', 'emap-rooms')}{J(`#/search?focus=Building:${sel.key}`, 'Search Party', 'emap-sp-b')}</div>
        </section>)}
      {selRoom && (
        <section className="emap__card" aria-labelledby="emap-room-h" data-testid="emap-roomcard">
          <button type="button" className="emap__x" aria-label="Close the room card" onClick={() => setRoom(null)}>×</button>
          <h3 id="emap-room-h">{shortName(selRoom.o)} · {selRoom.o.name}</h3>
          <p className="emap__meta"><i className="emap__dot" style={{ background: STATE_COL[selRoom.state] }} aria-hidden="true" /> {STATE_WORD[selRoom.state] || selRoom.state} · {selRoom.o.capacity} seats · {selRoom.o.dims[0]} × {selRoom.o.dims[1]} m{selRoom.issues ? ` · ${selRoom.issues} open issue${selRoom.issues === 1 ? '' : 's'}` : ''} · <span className="emap__id">{selRoom.o.id}</span></p>
          <div className="emap__jumps" aria-label="Open this room in">
            {J(`#/room/${selRoom.o.id}`, 'Room record', 'emap-j-room')}{J(`#/lite/room/${selRoom.o.id}`, 'Lite 3D', 'emap-j-lite')}{J(`#/commissioning/room/${selRoom.o.id}`, 'Commissioning', 'emap-j-cx')}{J(`#/assurance/room/${selRoom.o.id}`, 'Assurance', 'emap-j-as')}
            {J(`#/replay/${selRoom.o.id}`, 'Core Replay', 'emap-j-replay')}{J(`#/search?focus=Room:${selRoom.o.id}`, 'Search Party', 'emap-j-sp')}{J(`#/servicehands/new?room=${selRoom.o.id}`, 'Report a problem', 'emap-j-sh')}{J(`#/people?room=${selRoom.o.id}`, 'Who knows it', 'emap-j-people')}
          </div>
        </section>)}
    </div>
  );
}
