/**
 * #/play/stadium — Stadium LIVE, the first slice (task #182; founder, 17 Nov 2026 10:20 and 13:40: "changing the lighting transforms the
 * modeled stadium, not a panel beside a picture"). Harborlight Stadium in 3D (./stadium.ts, drawn by ./gl.ts): the bowl, its crowd, the
 * light towers, boards and ribbon, PA clusters and the broadcast gallery, with the LIVE console beside it. Every control changes the
 * scene, the sound, an overlay or saved state, and says so; the browser checks compare the drawn scene before and after each one.
 *
 * Honesty: the venue and every name are fictional; levels are MODELED (the heatmap states its assumptions) and never a measurement;
 * device states are simulated; sound is synthesised in the browser, off until the visitor turns it on, quiet, with a mute; there is no
 * strobing (light changes ease over half a second or more, and reduced motion removes movement); votes are kept in this browser.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from 'react';
import { Renderer, boxVerts, figureVerts, hex, m4, norm, prismVerts, stepVerts, type Mesh, type V3 } from './gl.js';
import { ATMOS, AWAY, DBA_ASSUMPTIONS, DEVICES, PITCH, SECTIONS, SEGS, TIERS, TIMELINE, modeledDba, ring, rnd, rowQuad, sectionName, sectionOf, theta, type Atmos } from './stadium.js';

type View = 'orbit' | 'flyover' | 'field' | 'seat' | 'gallery';
type Overlay = 'none' | 'dba' | 'pa' | 'rf';
type Look = 'home' | 'away' | 'neutral';
interface Prefs { atmos: Atmos; view: View; overlay: Overlay; ops: boolean; look: Look; ribbon: string; layers: { crowd: number; pa: number; commentary: number }; master: number; mix: 'spectator' | 'broadcast' }
const PREF_KEY = 'empathia.stadiumlive.v1';
const DEFAULTS: Prefs = { atmos: 'live', view: 'orbit', overlay: 'none', ops: false, look: 'home', ribbon: '#0E8F83', layers: { crowd: 0.7, pa: 0.4, commentary: 0.4 }, master: 0.5, mix: 'spectator' };
const loadPrefs = (): Prefs => { try { const p = JSON.parse(localStorage.getItem(PREF_KEY) || 'null'); return p && p.atmos in ATMOS ? { ...DEFAULTS, ...p, layers: { ...DEFAULTS.layers, ...(p.layers || {}) } } : DEFAULTS; } catch { return DEFAULTS; } };
const HOME = ['#0E8F83', '#0A6B62', '#F2F2EE', '#13A596']; const AWAYC = ['#B42318', '#7A1A13', '#1E1E1E', '#D4442F']; const MIX = ['#3D5A99', '#E0A43B', '#7A3E5C', '#5E9B4F', '#D8D2C4'];
const lerp = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** the synthesised sound of the bowl: filtered noise for the crowd, a stand-in for the PA and for commentary; capped and opt-in */
class Sound {
  ctx: AudioContext; master: GainNode; crowd: GainNode; pa: GainNode; com: GainNode; pan: StereoPannerNode; lp: BiquadFilterNode; started = false;
  constructor() {
    const c = this.ctx = new AudioContext(); this.master = c.createGain(); this.master.gain.value = 0; this.master.connect(c.destination);
    this.pan = c.createStereoPanner(); this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 6000; this.pan.connect(this.lp).connect(this.master);
    const noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = noise.getChannelData(0); let b = 0; for (let i = 0; i < d.length; i++) { b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); d[i] = b * 3; }
    const src = (f: number, q: number) => { const s = c.createBufferSource(); s.buffer = noise; s.loop = true; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; s.connect(bp); s.start(); return bp; };
    this.crowd = c.createGain(); this.crowd.gain.value = 0; src(650, 0.6).connect(this.crowd).connect(this.pan);
    this.com = c.createGain(); this.com.gain.value = 0; const v = src(1700, 4); const trem = c.createOscillator(); const tg = c.createGain(); trem.frequency.value = 4.5; tg.gain.value = 0.5; trem.connect(tg).connect(this.com.gain); trem.start(); v.connect(this.com).connect(this.pan);
    this.pa = c.createGain(); this.pa.gain.value = 0; const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = 523; const og = c.createGain(); og.gain.value = 0.06; o.connect(og).connect(this.pa).connect(this.pan); o.start();
    this.started = true;
  }
  set(p: Prefs, excite: number, fill: number, zonePan: number, zoneLp: number, cheer: number) {
    const t = this.ctx.currentTime; const ease = (g: AudioParam, v: number) => g.setTargetAtTime(v, t, 0.35);
    ease(this.master.gain, Math.min(0.2, p.master * 0.2));   // capped: never more than a fifth of full scale
    const crowd = p.layers.crowd * fill * (0.25 + 0.75 * excite) * (p.mix === 'broadcast' ? 0.45 : 1) * (1 + cheer * 0.9);
    ease(this.crowd.gain, Math.min(1.2, crowd)); ease(this.pa.gain, p.layers.pa * (fill > 0.02 ? 0.5 : 0.15) * (p.mix === 'broadcast' ? 0.3 : 1));
    ease(this.com.gain, p.layers.commentary * (p.mix === 'broadcast' ? 0.5 : 0.04)); ease(this.pan.pan, zonePan); ease(this.lp.frequency, zoneLp);
  }
  close() { void this.ctx.close(); }
}

export default function StadiumLive() { return <StadiumLivePage />; }
export function StadiumLivePage() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [p, setP] = useState<Prefs>(loadPrefs); const pr = useRef(p); pr.current = p;
  const save = useCallback((q: Partial<Prefs>) => setP((x) => { const n = { ...x, ...q }; try { localStorage.setItem(PREF_KEY, JSON.stringify(n)); } catch { /* not kept */ } return n; }), []);
  const [tab, setTab] = useState<'atmos' | 'view' | 'audio' | 'production' | 'ops' | 'people'>('atmos');
  const [err, setErr] = useState<string | null>(null); const [labels, setLabels] = useState<Array<{ x: number; y: number; text: string; kind: string }>>([]);
  const [cheer, setCheer] = useState<{ side: 'home' | 'away' | 'all'; at: number } | null>(null); const cheerRef = useRef(cheer); cheerRef.current = cheer;
  const [wave, setWave] = useState(false); const waveRef = useRef(wave); waveRef.current = wave;
  const [replay, setReplay] = useState<number | null>(null); const [board, setBoard] = useState<string | null>(null); const boardRef = useRef(board); boardRef.current = board;
  const [zone, setZone] = useState<number | null>(null); const [device, setDevice] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(false); const snd = useRef<Sound | null>(null); const [fps, setFps] = useState(0);
  const [reduced, setReduced] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches); const reducedRef = useRef(reduced); reducedRef.current = reduced;
  const [votes, setVotes] = useState<Record<string, number>>(() => { try { return JSON.parse(localStorage.getItem('empathia.stadiumlive.poll') || '{}'); } catch { return {}; } });
  const [mine, setMine] = useState<string | null>(() => { try { return localStorage.getItem('empathia.stadiumlive.mine'); } catch { return null; } });
  const orbit = useRef({ yaw: 0.55, pitch: 0.62, dist: 245 }); const drag = useRef<{ x: number; y: number } | null>(null);
  const atm = ATMOS[p.atmos]; const excite = replay !== null ? TIMELINE[replay]!.excite : atm.excite;
  const exciteRef = useRef(excite); exciteRef.current = excite;
  const [drawn, setDrawn] = useState(0);

  // the scene: static meshes once; the crowd when the fill or the colours change
  const meshes = useRef<{ r: Renderer; city: Mesh; windows: Mesh; water: Mesh; beams: Mesh; bowl: Mesh; pitch: Mesh; heads: Mesh; glass: Mesh; ribbon: Mesh; screens: Mesh; stage: Mesh; crowd: Array<{ mesh: Mesh; section: number; upper: boolean }>; dba: Array<{ mesh: Mesh; section: number }>; pa: Mesh; rf: Mesh } | null>(null);
  useEffect(() => {
    let r: Renderer; try { r = new Renderer(canvas.current!); } catch (e) { setErr((e as Error).message); return; }
    const bowl: number[] = [], pitch: number[] = [], heads: number[] = [], glass: number[] = [], ribbon: number[] = [], screens: number[] = [], stage: number[] = [], pa: number[] = [], rf: number[] = [];
    boxVerts({ min: [-700, -0.3, -700], max: [700, 0, 140], color: '#2A332D' }, bowl); boxVerts({ min: [-150, -0.02, -110], max: [150, 0.01, 110], color: '#3A4440' }, bowl);
    boxVerts({ min: [-62, 0, -45], max: [62, 0.02, 45], color: '#3E7D3A' }, pitch);
    for (let k = 0; k < 10; k++) { const x0 = -PITCH.L / 2 + k * PITCH.L / 10; boxVerts({ min: [x0, 0.02, -PITCH.W / 2], max: [x0 + PITCH.L / 10, 0.03, PITCH.W / 2], color: k % 2 ? '#4A9446' : '#55A350' }, pitch); }
    const line = (x0: number, z0: number, x1: number, z1: number) => boxVerts({ min: [Math.min(x0, x1) - 0.06, 0.03, Math.min(z0, z1) - 0.06], max: [Math.max(x0, x1) + 0.06, 0.045, Math.max(z0, z1) + 0.06], color: '#F4F4EE' }, pitch);
    const L2 = PITCH.L / 2, W2 = PITCH.W / 2; line(-L2, -W2, L2, -W2); line(-L2, W2, L2, W2); line(-L2, -W2, -L2, W2); line(L2, -W2, L2, W2); line(0, -W2, 0, W2);
    for (const s of [-1, 1]) { line(s * L2, -20, s * (L2 - 16.5), -20); line(s * L2, 20, s * (L2 - 16.5), 20); line(s * (L2 - 16.5), -20, s * (L2 - 16.5), 20); boxVerts({ min: [s * L2 - (s > 0 ? 0 : 1.5), 0, -3.7], max: [s * L2 + (s > 0 ? 1.5 : 0), 2.44, 3.7], color: '#F4F4EE' }, pitch); }
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, b = (i + 1) / 24 * Math.PI * 2; prismVerts([[Math.cos(a) * 9.15, Math.sin(a) * 9.15], [Math.cos(b) * 9.15, Math.sin(b) * 9.15], [Math.cos(b) * 9.0, Math.sin(b) * 9.0], [Math.cos(a) * 9.0, Math.sin(a) * 9.0]], 0.03, 0.045, '#F4F4EE', pitch); }
    // the tiers: each row a step of seats, coloured by section; the away corner in its own colour
    for (const t of TIERS) for (let i = 0; i < SEGS; i++) { const sec = sectionOf(i); const away = AWAY.includes(sec);
      for (let row = 0; row < t.rows; row++) { const q = rowQuad(t, row, i); const step = (t.y1 - t.y0) / t.rows; const col = away ? (row % 2 ? '#8A3A33' : '#7A322C') : sec % 2 ? (row % 2 ? '#2C6F7D' : '#28697A') : (row % 2 ? '#35606F' : '#305A68'); stepVerts(q.pts, row === 0 ? (t.upper ? t.y0 - 1.5 : 0) : q.y - step, q.y, col, bowl); } }
    for (let i = 0; i < SEGS; i++) { const t0 = theta(i), t1 = theta(i + 1);
      prismVerts([ring(t0, 80, 62), ring(t1, 80, 62), ring(t1, 86, 68), ring(t0, 86, 68)], 0, 13, '#33414D', bowl);
      prismVerts([ring(t0, 80.3, 62.3), ring(t1, 80.3, 62.3), ring(t1, 85.7, 67.7), ring(t0, 85.7, 67.7)], 13, 18.2, '#9CC3D6', glass);
      prismVerts([ring(t0, 85.6, 67.6), ring(t1, 85.6, 67.6), ring(t1, 86.2, 68.2), ring(t0, 86.2, 68.2)], 17.2, 18.9, '#FFFFFF', ribbon);
      prismVerts([ring(t0, 104, 84), ring(t1, 104, 84), ring(t1, 107, 87), ring(t0, 107, 87)], 0, 37, '#4C5864', bowl);
      prismVerts([ring(t0, 90, 72), ring(t1, 90, 72), ring(t1, 108, 88), ring(t0, 108, 88)], 39.5, 40.5, '#5D6873', bowl);
      prismVerts([ring(t0, 59, 42), ring(t1, 59, 42), ring(t1, 60.2, 43.2), ring(t0, 60.2, 43.2)], 0, 1.3, '#1A2530', bowl);
      // RF: a modeled coverage ring of wireless access points under the lower tier (honestly labelled as modeled)
      const cov = 0.55 + 0.45 * Math.sin(i / 3); prismVerts([ring(t0, 62, 45), ring(t1, 62, 45), ring(t1, 79, 61), ring(t0, 79, 61)], 8 + cov * 6, 8.5 + cov * 6, cov > 0.75 ? '#2BB673' : cov > 0.35 ? '#E0A43B' : '#B42318', rf);
    }
    for (const [x, z] of [[100, 78], [-100, 78], [100, -78], [-100, -78]] as Array<[number, number]>) { boxVerts({ min: [x - 1.2, 0, z - 1.2], max: [x + 1.2, 50, z + 1.2], color: '#7A838C' }, bowl); boxVerts({ min: [x - 7, 50, z - 2], max: [x + 7, 55, z + 2], color: '#FFFFFF' }, heads); }
    for (const s of [-1, 1]) { boxVerts({ min: [s * 109 - 1.5, 28, -16], max: [s * 109 + 1.5, 45, 16], color: '#1B232B' }, bowl); boxVerts({ min: [s * 109 - (s > 0 ? 1.7 : -1.5), 29.5, -15], max: [s * 109 - (s > 0 ? 1.5 : -1.7), 43.5, 15], color: '#FFFFFF' }, screens); }
    boxVerts({ min: [-8, 14, 62], max: [8, 18, 66], color: '#C7DCE6' }, glass);   // the broadcast gallery
    boxVerts({ min: [-58, 0, -12], max: [-38, 1.6, 12], color: '#22262B' }, stage); boxVerts({ min: [-58, 1.6, -12], max: [-56, 16, -10], color: '#3A3F45' }, stage); boxVerts({ min: [-58, 1.6, 10], max: [-56, 16, 12], color: '#3A3F45' }, stage); boxVerts({ min: [-58, 15, -12], max: [-40, 16, 12], color: '#3A3F45' }, stage); boxVerts({ min: [-57.9, 2, -9], max: [-57.6, 14, 9], color: '#FFFFFF' }, screens);
    for (const d of DEVICES.filter((x) => x.kind === 'pa')) { const [x, y, z] = d.at; const dir = norm([-x, -y * 0.6, -z]); const tip: V3 = [x + dir[0] * 70, 2, z + dir[2] * 70]; const w = 28; const px = -dir[2], pz = dir[0];
      prismVerts([[x, z], [tip[0] + px * w, tip[2] + pz * w], [tip[0] - px * w, tip[2] - pz * w]], 1.0, 1.6, '#2F9BD7', pa); }
    // the city around the harbour: towers to the north and the sides, the water to the south, lit windows that come on at night
    const city: number[] = [], windows: number[] = [], water: number[] = [], beams: number[] = [];
    for (let i = 0; i < 140; i++) { const a = rnd(i * 3.1) * Math.PI * 2; const rr = 255 + rnd(i * 5.7) * 210; const x = Math.cos(a) * rr * 1.25, z = Math.sin(a) * rr; if (z > 150) continue;
      const w = 12 + rnd(i * 7.3) * 22, d = 12 + rnd(i * 2.9) * 22, h = 18 + Math.pow(rnd(i * 4.4), 2) * 150; const shade = 0.16 + rnd(i * 9.1) * 0.14;
      boxVerts({ min: [x - w / 2, 0, z - d / 2], max: [x + w / 2, h, z + d / 2], color: '#' + [shade, shade * 1.05, shade * 1.18].map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('') }, city);
      for (let y = 6; y < h - 4; y += 5.5) { if (rnd(i * 13 + y) < 0.35) continue; const lit = rnd(i * 17 + y) < 0.5 ? '#FFD98A' : '#BFE3FF';
        boxVerts({ min: [x - w / 2 + 1, y, z - d / 2 - 0.15], max: [x + w / 2 - 1, y + 1.4, z - d / 2 - 0.05], color: lit }, windows); boxVerts({ min: [x - w / 2 - 0.15, y, z - d / 2 + 1], max: [x - w / 2 - 0.05, y + 1.4, z + d / 2 - 1], color: lit }, windows);
        boxVerts({ min: [x + w / 2 + 0.05, y, z - d / 2 + 1], max: [x + w / 2 + 0.15, y + 1.4, z + d / 2 - 1], color: lit }, windows); boxVerts({ min: [x - w / 2 + 1, y, z + d / 2 + 0.05], max: [x + w / 2 - 1, y + 1.4, z + d / 2 + 0.15], color: lit }, windows); } }
    boxVerts({ min: [-700, -0.25, 140], max: [700, -0.05, 700], color: '#0E2A3F' }, water);
    for (let i = 0; i < 40; i++) { const x = -520 + i * 26 + rnd(i) * 10; boxVerts({ min: [x, -0.04, 150 + rnd(i * 2) * 120], max: [x + 1.2, -0.03, 230 + rnd(i * 3) * 180], color: '#2F5C78' }, water); }
    // light-tower beams: a wedge of light from each head down to the pitch, added to the night
    for (const [x, z] of [[100, 78], [-100, 78], [100, -78], [-100, -78]] as Array<[number, number]>) { const hx = x * 0.97, hz = z * 0.97; const tx = x * 0.25, tz = z * 0.22; const px = -(tz - hz), pz = tx - hx; const l = Math.hypot(px, pz); const ux = px / l * 6, uz = pz / l * 6, vx = px / l * 34, vz = pz / l * 34;
      const tri = (a: V3, b: V3, c: V3) => { for (const p2 of [a, b, c]) beams.push(p2[0], p2[1], p2[2], 0, 1, 0, 1, 1, 1); };
      const A: V3 = [hx - ux, 52, hz - uz], B: V3 = [hx + ux, 52, hz + uz], C: V3 = [tx + vx, 0.2, tz + vz], D: V3 = [tx - vx, 0.2, tz - vz]; tri(A, B, C); tri(A, C, D); }
    const dba = []; const crowd: Array<{ mesh: Mesh; section: number; upper: boolean }> = [];
    for (const t of TIERS) for (let s = 0; s < SECTIONS; s++) { const v: number[] = []; const per = SEGS / SECTIONS; const r0 = Math.floor(t.rows * 0.3);
      prismVerts([rowQuad(t, r0, s * per).pts[0]!, rowQuad(t, r0, (s + 1) * per - 1).pts[1]!, rowQuad(t, t.rows - 1, (s + 1) * per - 1).pts[2]!, rowQuad(t, t.rows - 1, s * per).pts[3]!], t.y1 + 0.5, t.y1 + 1.2, '#FFFFFF', v);
      if (!t.upper) dba.push({ mesh: r.mesh(v), section: s }); }
    meshes.current = { r, city: r.mesh(city), windows: r.mesh(windows), water: r.mesh(water), beams: r.mesh(beams), bowl: r.mesh(bowl), pitch: r.mesh(pitch), heads: r.mesh(heads), glass: r.mesh(glass), ribbon: r.mesh(ribbon), screens: r.mesh(screens), stage: r.mesh(stage), crowd, dba, pa: r.mesh(pa), rf: r.mesh(rf) };
    setDrawn((x) => x + 1);
    return () => { r.dispose(); meshes.current = null; };
  }, []);
  // the crowd: rebuilt when the atmosphere's fill or the look changes
  const fill = replay !== null ? ATMOS[TIMELINE[replay]!.atmos].fill : atm.fill; const crowdKey = `${fill}|${p.atmos}`;
  useEffect(() => {
    const M = meshes.current; if (!M) return; const r = M.r; const out: Array<{ mesh: Mesh; section: number; upper: boolean }> = [];
    for (const t of TIERS) for (let s = 0; s < SECTIONS; s++) { const v: number[] = []; const away = AWAY.includes(s);
      for (let i = s * (SEGS / SECTIONS); i < (s + 1) * (SEGS / SECTIONS); i++) for (let row = 0; row < t.rows; row++) { const q = rowQuad(t, row, i);
        for (let k = 0; k < 2; k++) { const seed = i * 131 + row * 17 + k * 7 + (t.upper ? 5000 : 0); if (rnd(seed) > fill) continue;
          const f = (k + 0.5) / 2; const cx = q.pts[0]![0] + (q.pts[1]![0] - q.pts[0]![0]) * f, cz = q.pts[0]![1] + (q.pts[1]![1] - q.pts[0]![1]) * f; const mx = (q.pts[3]![0] - q.pts[0]![0]) * 0.35, mz = (q.pts[3]![1] - q.pts[0]![1]) * 0.35;
          const pal = p.atmos === 'concert' ? MIX : away ? AWAYC : rnd(seed + 1) < 0.85 ? HOME : MIX; const c = pal[Math.floor(rnd(seed + 2) * pal.length)]!;
          figureVerts(cx + mx, q.y, cz + mz, c, v); } }
      out.push({ mesh: r.mesh(v), section: s, upper: t.upper }); }
    M.crowd = out; setDrawn((x) => x + 1);
  }, [crowdKey, drawn === 0]);   // eslint-disable-line react-hooks/exhaustive-deps

  // the loop
  const state = useRef({ light: 0, lc: hex(ATMOS[p.atmos].lights), fade: 1 });
  useEffect(() => {
    let raf = 0; let last = performance.now(); let frames = 0, fpsAt = last; let labAt = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop); const M = meshes.current; if (!M) return; const r = M.r; const dt = Math.min(0.05, (now - last) / 1000); last = now;
      frames += 1; if (now - fpsAt > 1000) { setFps(Math.round(frames * 1000 / (now - fpsAt))); frames = 0; fpsAt = now; }
      const P = pr.current; const A = ATMOS[replayRef.current !== null ? TIMELINE[replayRef.current]!.atmos : P.atmos]; const S = state.current;
      // ease every light change over about half a second: no flash, no strobe
      const k = reducedRef.current ? 1 : Math.min(1, dt * 3); S.light += ((A.night ? 1 : 0) - S.light) * k; S.lc = lerp(S.lc, hex(A.lights), k);
      const night = S.light; const day = 1 - night;
      r.light = { sun: norm([0.35, 0.85, 0.3]), sunCol: lerp([0.75, 0.72, 0.66], [0.12, 0.14, 0.2], night), sky: lerp([0.78, 0.86, 0.95], [0.25, 0.3, 0.45], night), ground: lerp([0.45, 0.42, 0.36], [0.2, 0.2, 0.22], night), amb: 0.5 * day + 0.55 * night };
      r.resize(Math.min(window.devicePixelRatio || 1, 2)); const cv = canvas.current!; const aspect = cv.width / Math.max(1, cv.height);
      if (P.view === 'flyover' && !reducedRef.current) orbit.current.yaw += dt * 0.12;
      const o = orbit.current; let eye: V3, at: V3 = [0, 4, 0];
      if (P.view === 'orbit') eye = [Math.sin(o.yaw) * Math.cos(o.pitch) * o.dist, Math.sin(o.pitch) * o.dist, Math.cos(o.yaw) * Math.cos(o.pitch) * o.dist];
      else if (P.view === 'flyover') { const fy = o.yaw + 1.1, fp = 1.0, fd = 290; eye = [Math.sin(fy) * Math.cos(fp) * fd, Math.sin(fp) * fd, Math.cos(fy) * Math.cos(fp) * fd]; }   // high above the roof line; it circles unless motion is reduced
      else if (P.view === 'field') { eye = [-10, 1.7, 37]; at = [8, 3, 0]; } else if (P.view === 'seat') { eye = [24, 10.2, 54.5]; at = [-4, 1, 0]; } else { eye = [0, 17, 61]; at = [0, 0, 0]; }
      const vp = m4.mul(m4.persp(P.view === 'field' ? 1.05 : 0.9, aspect, 0.5, 900), m4.look(eye, at));
      const zen = lerp([0.36, 0.56, 0.86], A.label === 'Concert' ? [0.05, 0.02, 0.12] : [0.015, 0.025, 0.07], night); const hor = lerp([0.83, 0.89, 0.96], A.label === 'Concert' ? [0.3, 0.12, 0.32] : [0.26, 0.17, 0.2], night);
      r.begin(vp, eye, hor, 300, 880); r.sky(eye, hor, zen, 860);
      r.draw(M.city); r.draw(M.water); r.glow(night); r.draw(M.windows, m4.ident(), lerp([0.32, 0.36, 0.42], [1, 1, 1], night)); r.glow(0);
      r.draw(M.bowl);
      r.glow(0.55 * night); r.draw(M.pitch, m4.ident(), undefined); r.glow(0);
      if (A.label === 'Concert') { r.draw(M.stage); }
      r.glow(0.8 * night + 0.1); r.draw(M.glass); r.glow(1);
      r.draw(M.heads, m4.ident(), lerp([0.55, 0.58, 0.62], S.lc, night));
      if (night > 0.05) { r.glow(1); r.draw(M.beams, m4.ident(), S.lc, 0.07 * night, true); r.glow(0); r.glow(1); }
      const cheerNow = cheerRef.current && now - cheerRef.current.at < 3500 ? cheerRef.current : null; const ce = cheerNow ? Math.sin(Math.min(1, (now - cheerNow.at) / 3500) * Math.PI) : 0;
      const ribbonCol: V3 = cheerNow ? hex(cheerNow.side === 'away' ? '#B42318' : P.ribbon) : hex(P.ribbon);
      r.draw(M.ribbon, m4.ident(), lerp(ribbonCol, [1, 1, 1], (cheerNow ? 0.35 : 0.08) + 0.12 * Math.sin(now / 900) * (reducedRef.current ? 0 : 1)));   // a cheer brightens the ribbon in the cheering side's colour
      const boardCol: V3 = cheerNow ? hex(cheerNow.side === 'away' ? '#7A1A13' : '#0A6B62') : A.label === 'Concert' ? hex('#3A1460') : A.label === 'Technical rehearsal' ? hex('#3B3B3B') : hex('#0F2A33');
      r.draw(M.screens, m4.ident(), boardCol); r.glow(0);
      // the crowd: a cheer lifts the cheering side; a wave runs round the bowl
      for (const g of M.crowd) { const away = AWAY.includes(g.section); let y = 0;
        if (!reducedRef.current) { if (cheerNow && (cheerNow.side === 'all' || (cheerNow.side === 'away') === away)) y = 0.35 * ce * Math.abs(Math.sin(now / 160 + g.section)); if (waveRef.current) { const ph = ((now / 1000) * 1.6 - g.section / SECTIONS * Math.PI * 2) % (Math.PI * 2); y = Math.max(y, Math.max(0, Math.cos(ph)) ** 6 * 0.9); } }
        const tint = P.look === 'away' ? (away ? undefined : lerp([0.35, 0.36, 0.38], [1, 1, 1], 0.2)) : P.look === 'home' ? (away ? lerp([0.35, 0.36, 0.38], [1, 1, 1], 0.2) : undefined) : undefined;
        r.draw(g.mesh, m4.trs([0, y, 0], 0, [1, 1, 1]), P.look !== 'neutral' && tint ? tint : undefined); }
      if (A.label === 'Concert') { r.glow(1); for (let i = 0; i < 4; i++) r.draw(r.unit, m4.trs([-30 + i * 14, 0.4, Math.sin(now / 700 * (reducedRef.current ? 0 : 1) + i) * 12], 0, [10, 0.2, 10]), S.lc, 0.35); r.glow(0); }
      // overlays
      if (P.overlay === 'dba') { r.glow(1); for (const g of M.dba) { const db = modeledDba(g.section, fill, exciteRef.current, cheerNow ? (cheerNow.side === 'all' ? 'home' : cheerNow.side) : null); const k2 = Math.max(0, Math.min(1, (db - 70) / 40)); r.draw(g.mesh, m4.ident(), lerp([0.2, 0.62, 0.9], [0.86, 0.15, 0.12], k2), 0.62); } r.glow(0); }
      if (P.overlay === 'pa') { r.glow(1); r.draw(M.pa, m4.ident(), undefined, 0.35); r.glow(0); }
      if (P.overlay === 'rf') { r.glow(1); r.draw(M.rf, m4.ident(), undefined, 0.7); r.glow(0); }
      if (P.ops) { r.glow(1); for (const d of DEVICES) r.draw(r.unit, m4.trs(d.at, 0, [2.6, 2.6, 2.6]), hex(d.status === 'ok' ? '#2BB673' : d.status === 'warn' ? '#E0A43B' : '#E5484D')); r.glow(0); }
      if (now - labAt > 120) { labAt = now;
        const proj = (q: V3) => { const v = [q[0], q[1], q[2], 1]; const c = [0, 0, 0, 0]; for (let i = 0; i < 4; i++) c[i] = vp[i]! * v[0]! + vp[4 + i]! * v[1]! + vp[8 + i]! * v[2]! + vp[12 + i]! * v[3]!; if (c[3]! <= 0.5) return null; const x = (c[0]! / c[3]! + 1) / 2 * cv.clientWidth, y = (1 - c[1]! / c[3]!) / 2 * cv.clientHeight; return x < 0 || x > cv.clientWidth || y < 0 || y > cv.clientHeight ? null : { x, y }; };
        const L: Array<{ x: number; y: number; text: string; kind: string }> = []; const bt = boardRef.current || A.board;
        for (const s of [-1, 1]) { const q = proj([s * 107, 36.5, 0]); if (q) L.push({ ...q, text: bt, kind: 'board' }); }
        if (P.ops) for (const d of DEVICES) { const q = proj([d.at[0], d.at[1] + 3, d.at[2]]); if (q) L.push({ ...q, text: `${d.id}`, kind: `dev-${d.status}` }); }
        if (P.overlay === 'dba') for (let s = 0; s < SECTIONS; s += 2) { const mid = theta(s * (SEGS / SECTIONS) + 2); const pt = ring(mid, 72, 54); const q = proj([pt[0], 12, pt[1]]); if (q) L.push({ ...q, text: `${modeledDba(s, fill, exciteRef.current, null)} dBA`, kind: 'dba' }); }
        setLabels(L);
      }
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [fill]);   // eslint-disable-line react-hooks/exhaustive-deps
  const replayRef = useRef(replay); replayRef.current = replay;

  // sound follows the state; it exists only after the visitor turns it on
  const zonePan = zone === null ? 0 : Math.max(-0.9, Math.min(0.9, ring(theta(zone * 4 + 2), 1, 1)[0])); const zoneLp = zone === null ? 6000 : 2500 + 3500 * (1 - Math.abs(zonePan));
  useEffect(() => { if (soundOn && snd.current) snd.current.set(p, excite, fill, zonePan, zoneLp, cheer && performance.now() - cheer.at < 3500 ? 1 : 0); }, [soundOn, p, excite, fill, zonePan, zoneLp, cheer]);
  useEffect(() => () => snd.current?.close(), []);
  const turnSound = (on: boolean) => { if (on) { try { snd.current = snd.current || new Sound(); void snd.current.ctx.resume(); setSoundOn(true); } catch { setSoundOn(false); } } else { snd.current?.set({ ...p, master: 0 }, 0, 0, 0, 6000, 0); setSoundOn(false); } };
  const doCheer = (side: 'home' | 'away' | 'all') => { setCheer({ side, at: performance.now() }); window.setTimeout(() => setCheer((c) => (c && performance.now() - c.at >= 3400 ? null : c)), 3600); };
  const step = (i: number) => { setReplay(i); setBoard(TIMELINE[i]!.board); if (TIMELINE[i]!.cheer) doCheer(TIMELINE[i]!.cheer!); };
  const vote = (o: string) => { if (mine) return; const n = { ...votes, [o]: (votes[o] || 0) + 1 }; setVotes(n); setMine(o); try { localStorage.setItem('empathia.stadiumlive.poll', JSON.stringify(n)); localStorage.setItem('empathia.stadiumlive.mine', o); } catch { /* not kept */ } };
  const onDown = (e: RPE) => { drag.current = { x: e.clientX, y: e.clientY }; if (pr.current.view !== 'orbit') save({ view: 'orbit' }); };
  const onMove = (e: RPE) => { const d = drag.current; if (!d) return; orbit.current.yaw -= (e.clientX - d.x) * 0.005; orbit.current.pitch = Math.max(0.08, Math.min(1.35, orbit.current.pitch + (e.clientY - d.y) * 0.004)); d.x = e.clientX; d.y = e.clientY; };
  const onWheel = (e: { deltaY: number }) => { orbit.current.dist = Math.max(70, Math.min(320, orbit.current.dist * (e.deltaY > 0 ? 1.08 : 0.93))); };
  const dev = DEVICES.find((d) => d.id === device) || null; const total = Object.values(votes).reduce((a, b) => a + b, 0);
  const tabs: Array<[typeof tab, string]> = [['atmos', 'Atmosphere'], ['view', 'Perspective'], ['audio', 'Audio'], ['production', 'Production'], ['ops', 'Operations'], ['people', 'Participation']];
  const opt = <T extends string>(cur: T, val: T, label: string, set: (v: T) => void, id: string) => <button key={val} type="button" className="slv-chip" aria-pressed={cur === val} onClick={() => set(val)} data-testid={`${id}-${val}`}>{label}</button>;
  const levels = useMemo(() => Array.from({ length: SECTIONS }, (_, s) => ({ s, name: sectionName(s, false), db: modeledDba(s, fill, excite, null), away: AWAY.includes(s) })), [fill, excite]);

  return <section className="slv" data-testid="stadium-live" data-ready={!err} data-atmos={replay !== null ? TIMELINE[replay]!.atmos : p.atmos} data-view={p.view} data-overlay={p.overlay} data-ops={p.ops} data-look={p.look} data-fill={fill} data-cheer={cheer?.side || ''} data-wave={wave} data-sound={soundOn} data-fps={fps} data-replay={replay ?? ''}>
    <header className="cl-head"><h1>Stadium LIVE</h1><p>Harborlight Stadium, a fictional venue, in 3D. The console changes the bowl itself: its light, crowd, boards, sound and overlays. Levels are modeled, device states simulated; nothing here is a live feed.</p></header>
    <div className="slv-grid">
      <div className="slv-stage">
        <canvas ref={canvas} className="cl-canvas" tabIndex={0} data-testid="slv-canvas" aria-label={`Harborlight Stadium in 3D: ${(replay !== null ? ATMOS[TIMELINE[replay]!.atmos] : atm).label}. Drag to look around, scroll to zoom.`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onWheel={onWheel} />
        {err ? <div className="cl-err" role="alert" data-testid="slv-err"><b>This browser cannot draw the stadium.</b> {err}. The <a href="#/worlds/stadium">Stadium world</a> shows it as a plan.</div> : null}
        <div className="cl-labels" aria-hidden="true">{labels.map((l, i) => <div key={i} className={`cl-tag slv-tag slv-tag--${l.kind}`} style={{ transform: `translate(${Math.round(l.x)}px, ${Math.round(l.y)}px)` }}><b>{l.text}</b></div>)}</div>
        <div className="slv-now" role="status" data-testid="slv-now"><b>{(replay !== null ? ATMOS[TIMELINE[replay]!.atmos] : atm).label}</b> · {replay !== null ? `${TIMELINE[replay]!.t} — ${TIMELINE[replay]!.text}` : atm.note}{cheer ? ` · ${cheer.side === 'away' ? 'away' : cheer.side === 'home' ? 'home' : 'whole bowl'} cheer` : ''}</div>
      </div>
      <aside className="slv-console" aria-label="LIVE console" data-testid="slv-console">
        <div className="slv-tabs" role="tablist">{tabs.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-testid={`slv-tab-${k}`}>{l}</button>)}</div>
        {tab === 'atmos' ? <div className="slv-pane"><p className="slv-h">Atmosphere</p><div className="slv-chips">{(Object.keys(ATMOS) as Atmos[]).map((a) => opt(p.atmos, a, ATMOS[a].label, (v) => { setReplay(null); setBoard(null); save({ atmos: v }); }, 'slv-atmos'))}</div>
          <p className="slv-note">{atm.note} Crowd {Math.round(fill * 100)}% of seats (modeled).</p>
          <p className="slv-h">Event timeline (replay)</p><ol className="slv-time">{TIMELINE.map((e, i) => <li key={i}><button type="button" aria-pressed={replay === i} onClick={() => step(i)} data-testid={`slv-replay-${i}`}><b>{e.t}</b> {e.text}</button></li>)}</ol>
          {replay !== null ? <button type="button" className="cl-btn" onClick={() => { setReplay(null); setBoard(null); }}>Back to live control</button> : null}</div> : null}
        {tab === 'view' ? <div className="slv-pane"><p className="slv-h">Camera</p><div className="slv-chips">{opt(p.view, 'orbit', 'Orbit', (v) => save({ view: v }), 'slv-view')}{opt(p.view, 'flyover', 'Flyover', (v) => save({ view: v }), 'slv-view')}{opt(p.view, 'field', 'Field level', (v) => save({ view: v }), 'slv-view')}{opt(p.view, 'seat', 'Spectator, section 112', (v) => save({ view: v }), 'slv-view')}{opt(p.view, 'gallery', 'Broadcast gallery', (v) => save({ view: v }), 'slv-view')}</div>
          <p className="slv-h">Audience</p><div className="slv-chips">{opt(p.look, 'home', 'Home supporters', (v) => save({ look: v }), 'slv-look')}{opt(p.look, 'away', 'Away supporters', (v) => save({ look: v }), 'slv-look')}{opt(p.look, 'neutral', 'General fan', (v) => save({ look: v }), 'slv-look')}</div>
          <p className="slv-note">The audience you choose is lit; the others dim. Drag the scene to orbit, scroll to zoom.</p></div> : null}
        {tab === 'audio' ? <div className="slv-pane"><p className="slv-h">Sound</p>
          <label className="cl-opt"><input type="checkbox" checked={soundOn} onChange={(e) => turnSound(e.target.checked)} data-testid="slv-sound" /> Turn on the stadium sound (quiet, synthesised in your browser; off until you choose)</label>
          {(['crowd', 'pa', 'commentary'] as const).map((l) => <label key={l} className="slv-slide">{l === 'crowd' ? 'Crowd' : l === 'pa' ? 'Public address' : 'Commentary (a stand-in)'} <input type="range" min={0} max={1} step={0.05} value={p.layers[l]} onChange={(e) => save({ layers: { ...p.layers, [l]: Number(e.target.value) } })} data-testid={`slv-layer-${l}`} /></label>)}
          <label className="slv-slide">Master (capped) <input type="range" min={0} max={1} step={0.05} value={p.master} onChange={(e) => save({ master: Number(e.target.value) })} data-testid="slv-master" /></label>
          <div className="slv-chips">{opt(p.mix, 'spectator', 'Spectator mix', (v) => save({ mix: v }), 'slv-mix')}{opt(p.mix, 'broadcast', 'Broadcast mix', (v) => save({ mix: v }), 'slv-mix')}</div>
          <p className="slv-h">Cheer</p><div className="slv-chips"><button type="button" className="slv-chip" onClick={() => doCheer('home')} data-testid="slv-cheer-home">Home cheer</button><button type="button" className="slv-chip" onClick={() => doCheer('away')} data-testid="slv-cheer-away">Away cheer</button><button type="button" className="slv-chip" aria-pressed={wave} onClick={() => setWave(!wave)} data-testid="slv-wave">{wave ? 'Stop the wave' : 'Start a wave'}</button></div>
          <p className="slv-h">Hear it from a section</p><div className="slv-chips">{[0, 6, 12, 15, 18].map((s) => <button key={s} type="button" className="slv-chip" aria-pressed={zone === s} onClick={() => setZone(zone === s ? null : s)} data-testid={`slv-zone-${s}`}>{sectionName(s, false)}{AWAY.includes(s) ? ' (away)' : ''}</button>)}</div>
          <p className="slv-h">Overlay</p><div className="slv-chips">{opt(p.overlay, 'none', 'None', (v) => save({ overlay: v }), 'slv-overlay')}{opt(p.overlay, 'dba', 'Crowd level (modeled dBA)', (v) => save({ overlay: v }), 'slv-overlay')}{opt(p.overlay, 'pa', 'PA coverage', (v) => save({ overlay: v }), 'slv-overlay')}</div>
          {p.overlay === 'dba' ? <><p className="slv-note" data-testid="slv-assume">{DBA_ASSUMPTIONS}</p><table className="slv-table" aria-label="Modeled crowd level by section"><thead><tr><th>Section</th><th>dBA (modeled)</th></tr></thead><tbody>{levels.map((x) => <tr key={x.s}><td>{x.name}{x.away ? ' (away)' : ''}</td><td>{x.db}</td></tr>)}</tbody></table></> : null}
          {p.overlay === 'pa' ? <p className="slv-note">Four line-array clusters and the areas each is aimed at (MODELED from their positions; not a coverage prediction).</p> : null}
          <button type="button" className="cl-btn" onClick={() => turnSound(false)} data-testid="slv-mute">Mute</button></div> : null}
        {tab === 'production' ? <div className="slv-pane"><p className="slv-h">Ribbon board colour</p><div className="slv-chips">{[['#0E8F83', 'Home teal'], ['#E0A43B', 'Gold'], ['#2C5FA8', 'Blue'], ['#B26BFF', 'Violet']].map(([c, l]) => <button key={c} type="button" className="slv-chip" aria-pressed={p.ribbon === c} onClick={() => save({ ribbon: c! })} data-testid={`slv-ribbon-${c!.slice(1)}`}><span className="slv-sw" style={{ background: c }} /> {l}</button>)}</div>
          <p className="slv-h">Scoreboard graphic</p><div className="slv-chips">{['Welcome to Harborlight', 'Please find your seats', 'Fan of the match · vote now', 'Exit via your nearest gate'].map((b) => <button key={b} type="button" className="slv-chip" aria-pressed={board === b} onClick={() => setBoard(board === b ? null : b)} data-testid={`slv-board-${b.split(' ')[0]!.toLowerCase()}`}>{b}</button>)}</div>
          <p className="slv-note">Light scenes follow the atmosphere and change over half a second or more; nothing flashes.</p>
          <label className="cl-opt"><input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} /> Reduced stimulation (no movement, no shimmer)</label></div> : null}
        {tab === 'ops' ? <div className="slv-pane"><label className="cl-opt"><input type="checkbox" checked={p.ops} onChange={(e) => save({ ops: e.target.checked })} data-testid="slv-ops" /> Show the venue’s AV devices and their state (simulated)</label>
          <div className="slv-chips">{opt(p.overlay, 'rf', 'Wireless coverage (modeled)', (v) => save({ overlay: v }), 'slv-overlay')}{opt(p.overlay, 'none', 'No overlay', (v) => save({ overlay: v }), 'slv-overlay2')}</div>
          <ul className="slv-devs">{DEVICES.map((d) => <li key={d.id}><button type="button" aria-pressed={device === d.id} onClick={() => { setDevice(device === d.id ? null : d.id); if (!p.ops) save({ ops: true }); }} data-testid={`slv-dev-${d.id}`}><span className={`slv-dot slv-dot--${d.status}`} /> {d.label}</button></li>)}</ul>
          {dev ? <div className="slv-card" data-testid="slv-dev-card"><b>{dev.label}</b><p>{dev.info}</p><p className="slv-note">State: {dev.status === 'ok' ? 'normal' : dev.status === 'warn' ? 'attention' : 'fault'} (simulated). {dev.status === 'fault' ? <>In the product, this would open an incident: <a href="#/v25/service">ServiceHands</a>.</> : null}</p></div> : null}</div> : null}
        {tab === 'people' ? <div className="slv-pane"><p className="slv-h">Poll · Fan of the match</p>{['Number 7', 'Number 10', 'The goalkeeper'].map((o) => <button key={o} type="button" className="slv-vote" disabled={!!mine} aria-pressed={mine === o} onClick={() => vote(o)} data-testid={`slv-vote-${o.replace(/\W+/g, '').toLowerCase()}`}><span>{o}</span><i style={{ width: `${total ? Math.round((votes[o] || 0) / total * 100) : 0}%` }} /><em>{votes[o] || 0}</em></button>)}
          <p className="slv-note" data-testid="slv-poll-note">{mine ? `You voted for ${mine}. ` : ''}Votes on this page are kept in this browser only; in the Experiences product a poll collects real votes from consenting attendees.</p></div> : null}
        <p className="slv-note">Frame rate here: {fps} fps (this machine).</p>
      </aside>
    </div>
  </section>;
}
