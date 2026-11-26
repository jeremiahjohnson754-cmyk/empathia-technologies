/**
 * #/play/expo — Expo LIVE, the first slice (task #181): the Northlight Technology Expo in Hall A of the Larkspur Exchange Convention
 * Centre (fictional) in 3D, with its plan beside it. Choose a booth on the plan, in the list or in the hall, and the camera flies to it;
 * its card says what the exhibitor does and what they are demonstrating; save it to your agenda, or leave your details for them only
 * after ticking the consent box. Sessions run on the main stage and in two presentation zones: join one and answer its poll, or ask a
 * question that waits for the moderator. The organiser view lays a modeled footfall map over the hall and shows a booth's simulated AV
 * fault with where it would go. Everything is fictional; agenda, details, votes and questions stay in this browser and say so.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Renderer, boxVerts, figureVerts, hex, m4, norm, type Mesh, type V3 } from './gl.js';
import { BOOTHS, FOOD, FOOTFALL_NOTE, HALL, LOUNGE, REG, SESSIONS, STAGE, ZONES, footfall, type Booth } from './expo.js';

import { attach, hintText, setFull, type Hint } from '../map/gestures.js';
import { MovePad, useMoveKeys, type Moves } from './MovePad.js';
const KEY = 'empathia.expolive.v1';
interface Saved { agenda: string[]; leads: Array<{ booth: string; name: string; at: string }>; votes: Record<string, string>; questions: Array<{ session: string; text: string; state: 'pending' }> }
const load = (): Saved => { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s && Array.isArray(s.agenda) ? s : { agenda: [], leads: [], votes: {}, questions: [] }; } catch { return { agenda: [], leads: [], votes: {}, questions: [] }; } };
const lerp = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const AISLES: Array<Array<[number, number]>> = [[[-58, 0], [56, 0]], [[-45, -30], [-45, 30]], [[30, -30], [30, 30], [-30, 30], [-30, -30]], [[-15, -29], [-15, 20]], [[0, 22], [55, 22], [55, -5], [0, -5]], [[-58, -27], [-30, -27], [-30, 4], [-58, 4]]];
const SHIRTS = ['#2C5FA8', '#C2553F', '#0E8F83', '#E0A43B', '#6B4FA0', '#3D4A5C', '#D8D2C4', '#5E9B4F'];

export default function ExpoLive() { return <ExpoLivePage />; }
export function ExpoLivePage() {
  const canvas = useRef<HTMLCanvasElement>(null); const [err, setErr] = useState<string | null>(null); const [fps, setFps] = useState(0); const [detail, setDetail] = useState(100);
  // Full quality (25 Nov 2026, as on Stadium LIVE): pins full detail whatever the frame rate; ticked when the address asks for ?detail=full
  const rRef = useRef<Renderer | null>(null); const [fullQ, setFullQ] = useState(() => typeof location !== 'undefined' && /[?&]detail=full\b/.test(location.hash));
  const [sel, setSel] = useState<string | null>(null); const selRef = useRef(sel); selRef.current = sel;
  const [organiser, setOrganiser] = useState(false); const orgRef = useRef(organiser); orgRef.current = organiser;
  const [session, setSession] = useState<string | null>(null); const sessRef = useRef(session); sessRef.current = session;
  const [saved, setSaved] = useState<Saved>(load); const keep = (s: Saved) => { setSaved(s); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* not kept */ } };
  const [consent, setConsent] = useState(false); const [name, setName] = useState(''); const [q, setQ] = useState('');
  // moving around and choosing a booth in the hall (founder, 20 Nov 2026 05:34: clicking a booth in the hall did not take you there; hard to
  // move around): gestures.ts, a tap on a booth flies to it, a stage that can go full screen
  const stage = useRef<HTMLDivElement>(null); const vpRef = useRef<number[] | null>(null); const [hint, setHint] = useState<Hint>(null); const [full, setFullState] = useState(false); const fullRef = useRef(false);
  const toggleFull = (on: boolean) => { fullRef.current = setFull(stage.current, on); setFullState(on); };
  useEffect(() => { if (!full) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') toggleFull(false); }; window.addEventListener('keydown', k); return () => { window.removeEventListener('keydown', k); setFull(stage.current, false); }; }, [full]);   // eslint-disable-line react-hooks/exhaustive-deps
  const [labels, setLabels] = useState<Array<{ x: number; y: number; text: string; id: string; kind: string }>>([]);
  const [reduced] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches); const reducedRef = useRef(reduced);
  const cam = useRef({ yaw: -0.5, pitch: 0.72, dist: 120, at: [0, 0, 0] as V3, goal: null as null | { yaw: number; pitch: number; dist: number; at: V3 } });
  const booth = BOOTHS.find((b) => b.id === sel) || null; const sess = SESSIONS.find((s) => s.id === session) || null;
  const flyTo = useCallback((b: Booth | null) => { setSel(b?.id ?? null); setConsent(false); cam.current.goal = b ? { yaw: cam.current.yaw, pitch: 0.5, dist: 34, at: [b.x, 1, b.z] } : { yaw: -0.5, pitch: 0.72, dist: 120, at: [0, 0, 0] }; if (reducedRef.current && cam.current.goal) { Object.assign(cam.current, cam.current.goal); cam.current.goal = null; } }, []);

  useEffect(() => {
    let r: Renderer; try { r = new Renderer(canvas.current!); } catch (e) { setErr((e as Error).message); return; }
    rRef.current = r;
    const hall: number[] = [], glowv: number[] = [], screens: number[] = [], carpet: number[] = [];
    boxVerts({ min: [-400, -0.3, -400], max: [400, -0.05, 400], color: '#3B4148' }, hall);
    boxVerts({ min: [HALL.x0, -0.05, HALL.z0], max: [HALL.x1, 0, HALL.z1], color: '#4A4E55' }, hall);
    for (const [x0, z0, x1, z1] of [[-58, -1.6, 58, 1.6], [-46.5, -34, -43.5, 34], [28.5, -34, 31.5, 34], [-31.5, -34, -28.5, 34], [-16.5, -34, -13.5, 34]] as Array<[number, number, number, number]>) boxVerts({ min: [x0, 0, z0], max: [x1, 0.02, z1], color: '#2E4A68' }, carpet);
    // walls with glazing at the entrance end; the trussed roof on a grid of columns; rows of lights under the roof
    boxVerts({ min: [HALL.x0 - 1, 0, HALL.z0 - 1], max: [HALL.x1 + 1, HALL.h, HALL.z0], color: '#C9CED4' }, hall); boxVerts({ min: [HALL.x1, 0, HALL.z0], max: [HALL.x1 + 1, HALL.h, HALL.z1], color: '#C9CED4' }, hall);
    boxVerts({ min: [HALL.x0 - 1, 0, HALL.z1], max: [HALL.x1 + 1, 4, HALL.z1 + 1], color: '#C9CED4' }, hall); boxVerts({ min: [HALL.x0 - 1, 0, HALL.z0], max: [HALL.x0, 4, HALL.z1], color: '#AFC8D8' }, hall);
    for (let x = -50; x <= 50; x += 20) for (const z of [-30, 30]) boxVerts({ min: [x - 0.5, 0, z - 0.5], max: [x + 0.5, HALL.h, z + 0.5], color: '#9AA2AB' }, hall);
    for (let x = -50; x <= 50; x += 20) { boxVerts({ min: [x - 0.4, HALL.h - 1.2, HALL.z0], max: [x + 0.4, HALL.h - 0.4, HALL.z1], color: '#7D858E' }, hall); }
    for (let z = -30; z <= 30; z += 10) boxVerts({ min: [HALL.x0, HALL.h - 0.6, z - 0.15], max: [HALL.x1, HALL.h - 0.3, z + 0.15], color: '#8C939B' }, hall);
    for (let x = -55; x <= 55; x += 10) for (let z = -30; z <= 30; z += 10) boxVerts({ min: [x - 1.2, HALL.h - 0.9, z - 0.3], max: [x + 1.2, HALL.h - 0.7, z + 0.3], color: '#FFF3D6' }, glowv);
    // booths: a back wall in the exhibitor's colour, a counter, a demonstration screen, a header
    for (const b of BOOTHS) { const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, z0 = b.z - b.d / 2, z1 = b.z + b.d / 2;
      boxVerts({ min: [x0, 0, z0], max: [x1, 0.08, z1], color: b.cat === 'Showcase' ? '#E6EFEC' : '#D9DCE0' }, hall);
      boxVerts({ min: [x0, 0, z0], max: [x1, 3.2, z0 + 0.25], color: b.color }, hall); boxVerts({ min: [x0, 0, z0], max: [x0 + 0.25, 3.2, z0 + b.d * 0.6], color: b.color }, hall);
      boxVerts({ min: [b.x - 1.4, 0, z1 - 1.6], max: [b.x + 1.4, 1.05, z1 - 0.8], color: '#F4F2EC' }, hall);
      boxVerts({ min: [b.x - 2, 1.3, z0 + 0.27], max: [b.x + 2, 3.0, z0 + 0.33], color: '#FFFFFF' }, screens);
      boxVerts({ min: [x0, 3.6, z0 + 0.05], max: [x1, 4.4, z0 + 0.3], color: b.color }, glowv);
      if (b.cat === 'Showcase') { boxVerts({ min: [x0 + 1, 0, z0 + 2], max: [x0 + 1.2, 5, z0 + 2.2], color: '#0A7268' }, hall); boxVerts({ min: [x1 - 1.2, 0, z0 + 2], max: [x1 - 1, 5, z0 + 2.2], color: '#0A7268' }, hall); boxVerts({ min: [x0 + 1, 5, z0 + 2], max: [x1 - 1, 5.6, z0 + 2.2], color: '#0E8F83' }, glowv); } }
    // the main stage with its LED wall; two presentation zones; registration; the lounge; the food court
    boxVerts({ min: [STAGE.x - STAGE.w / 2, 0, STAGE.z - STAGE.d / 2], max: [STAGE.x + STAGE.w / 2, 1.1, STAGE.z + STAGE.d / 2], color: '#22262B' }, hall);
    boxVerts({ min: [STAGE.x + STAGE.w / 2 - 0.6, 1.1, STAGE.z - 7], max: [STAGE.x + STAGE.w / 2 - 0.3, 8.5, STAGE.z + 7], color: '#FFFFFF' }, screens);
    for (let i = 0; i < 8; i++) for (let k = 0; k < 10; k++) boxVerts({ min: [STAGE.x - 24 + i * 2.2, 0, STAGE.z - 8 + k * 1.6], max: [STAGE.x - 23.4 + i * 2.2, 0.45, STAGE.z - 7.4 + k * 1.6], color: '#3D4A5C' }, hall);
    for (const z of ZONES) { boxVerts({ min: [z.x - 5, 0, z.z - 3], max: [z.x + 5, 0.4, z.z + 3], color: '#2B3036' }, hall); boxVerts({ min: [z.x - 3, 0.4, z.z - 3], max: [z.x + 3, 3.4, z.z - 2.8], color: '#FFFFFF' }, screens); }
    boxVerts({ min: [REG.x - 3, 0, REG.z - 6], max: [REG.x + 1, 1.1, REG.z + 6], color: '#F4F2EC' }, hall); boxVerts({ min: [REG.x - 3, 3.5, REG.z - 6], max: [REG.x + 1, 4.3, REG.z + 6], color: '#0A7268' }, glowv);
    for (let i = 0; i < 6; i++) boxVerts({ min: [LOUNGE.x - 6 + (i % 3) * 4, 0, LOUNGE.z - 3 + Math.floor(i / 3) * 4], max: [LOUNGE.x - 4 + (i % 3) * 4, 0.7, LOUNGE.z - 1.6 + Math.floor(i / 3) * 4], color: '#7A3E5C' }, hall);
    for (let i = 0; i < 8; i++) boxVerts({ min: [FOOD.x - 14 + i * 3.6, 0, FOOD.z - 0.6], max: [FOOD.x - 12.6 + i * 3.6, 0.75, FOOD.z + 0.6], color: '#B0753F' }, hall);
    const M = { hall: r.mesh(hall), glow: r.mesh(glowv), screens: r.mesh(screens), carpet: r.mesh(carpet) };
    const figs: number[] = []; for (let i = 0; i < 60; i++) { const sx = STAGE.x - 24 + (i % 8) * 2.2 + 0.3, sz = STAGE.z - 8 + Math.floor(i / 8) * 1.6 + 0.6; figureVerts(sx, 0.2, sz, SHIRTS[i % SHIRTS.length]!, figs); }
    const audience = r.mesh(figs);
    let raf = 0, last = performance.now(), frames = 0, fpsAt = last, labAt = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop); r.pace(now - last); const dt = Math.min(0.05, (now - last) / 1000); last = now; frames += 1; if (now - fpsAt > 1000) { setFps(Math.round(frames * 1000 / (now - fpsAt))); setDetail(Math.round(r.detail * 100)); frames = 0; fpsAt = now; }
      const C = cam.current; if (C.goal) { const k = Math.min(1, dt * 3); C.yaw += (C.goal.yaw - C.yaw) * k; C.pitch += (C.goal.pitch - C.pitch) * k; C.dist += (C.goal.dist - C.dist) * k; C.at = lerp(C.at, C.goal.at, k); if (Math.abs(C.dist - C.goal.dist) < 0.05) C.goal = null; }
      r.resize(Math.min(window.devicePixelRatio || 1, 2)); const cv = r.canvas; const aspect = cv.width / Math.max(1, cv.height);   // the renderer's own canvas: the page's reference to it is already empty in the frame between leaving the page and this loop being stopped (found by the performance check, 25 Nov 2026)
      const eye: V3 = [C.at[0] + Math.sin(C.yaw) * Math.cos(C.pitch) * C.dist, C.at[1] + Math.sin(C.pitch) * C.dist, C.at[2] + Math.cos(C.yaw) * Math.cos(C.pitch) * C.dist];
      const vp = m4.mul(m4.persp(0.9, aspect, 0.3, 600), m4.look(eye, C.at)); vpRef.current = vp as unknown as number[];
      const cs = `${C.at[0].toFixed(1)} ${C.at[2].toFixed(1)} ${C.dist.toFixed(0)} ${C.yaw.toFixed(2)} ${C.pitch.toFixed(2)}`; if (cv.dataset.cam !== cs) cv.dataset.cam = cs;   // the camera (target x z, distance, yaw, pitch), read by the gesture tests
      r.light = { sun: norm([0.3, 0.9, 0.2]), sunCol: [0.55, 0.53, 0.5], sky: [0.92, 0.92, 0.9], ground: [0.42, 0.4, 0.38], amb: 0.62 };
      r.begin(vp, eye, [0.86, 0.88, 0.9], 200, 520); r.sky(eye, [0.88, 0.9, 0.93], [0.5, 0.66, 0.88], 500);
      r.draw(M.hall); r.draw(M.carpet); r.draw(audience);
      r.glow(1); r.draw(M.glow); r.draw(M.screens, m4.ident(), sessRef.current ? hex('#0E8F83') : hex('#DDE7EE')); r.glow(0);
      const t = reducedRef.current ? 0 : now / 1000;
      for (let i = 0; i < 42; i++) { const path = AISLES[i % AISLES.length]!; const segs = path.length > 2 ? [...path, path[0]!] : [...path, ...[...path].reverse()];
        let total = 0; const lens = segs.slice(1).map((p, j) => { const l = Math.hypot(p[0] - segs[j]![0], p[1] - segs[j]![1]); total += l; return l; });
        let d = (t * (1 + (i % 5) * 0.12) + i * 37) % total; let j = 0; while (d > lens[j]! && j < lens.length - 1) { d -= lens[j]!; j += 1; }
        const a = segs[j]!, b = segs[j + 1]!; const k = d / lens[j]!; const off = ((i * 7) % 5 - 2) * 0.6; const ox = (b[1] - a[1]) / lens[j]! * off, oz = -(b[0] - a[0]) / lens[j]! * off;
        const x = a[0] + (b[0] - a[0]) * k + ox, z = a[1] + (b[1] - a[1]) * k + oz; const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]); const bob = reducedRef.current ? 0 : Math.abs(Math.sin(t * 6 + i)) * 0.04;
        r.draw(r.unit, m4.trs([x, 0.95 + bob, z], yaw, [0.46, 0.75, 0.28]), hex(SHIRTS[i % SHIRTS.length]!)); r.draw(r.unit, m4.trs([x, 0.3, z], yaw, [0.4, 0.6, 0.24]), hex('#2B3440')); r.draw(r.unit, m4.trs([x, 1.5 + bob, z], yaw, [0.26, 0.26, 0.26]), [0.78, 0.6, 0.47]); }
      const sb = selRef.current ? BOOTHS.find((b) => b.id === selRef.current) : null;
      if (sb) { r.glow(1); r.draw(r.unit, m4.trs([sb.x, 0.12, sb.z], 0, [sb.w + 0.6, 0.08, sb.d + 0.6]), hex('#F2C14E'), 0.55); r.glow(0); }
      if (orgRef.current) { r.glow(1); const s = SESSIONS.find((x) => x.id === sessRef.current) || null; for (const b of BOOTHS) { const f = footfall(b, s); const k = Math.max(0, Math.min(1, (f - 120) / 260)); r.draw(r.unit, m4.trs([b.x, 4.8 + k * 3, b.z], 0, [b.w * 0.9, 0.3 + k * 6, b.d * 0.9]), lerp([0.2, 0.62, 0.9], [0.86, 0.15, 0.12], k), 0.55); } r.glow(0); }
      if (now - labAt > 150) { labAt = now;
        const proj = (p: V3) => { const v = [p[0], p[1], p[2], 1]; const c = [0, 0, 0, 0]; for (let i = 0; i < 4; i++) c[i] = vp[i]! * v[0]! + vp[4 + i]! * v[1]! + vp[8 + i]! * v[2]! + vp[12 + i]! * v[3]!; if (c[3]! <= 0.5) return null; const x = (c[0]! / c[3]! + 1) / 2 * cv.clientWidth, y = (1 - c[1]! / c[3]!) / 2 * cv.clientHeight; return x < 0 || x > cv.clientWidth || y < 0 || y > cv.clientHeight ? null : { x, y }; };
        const L: Array<{ x: number; y: number; text: string; id: string; kind: string }> = [];
        const near = C.dist < 70; for (const b of BOOTHS) { const q2 = proj([b.x, 5, b.z - b.d / 2]); const full = near || b.id === selRef.current || b.cat === 'Showcase'; if (q2) L.push({ ...q2, text: full ? `${b.id} · ${b.name}` : b.id, id: b.id, kind: b.id === selRef.current ? 'sel' : b.cat === 'Showcase' ? 'show' : 'booth' }); }
        const qs = proj([STAGE.x, 9.5, STAGE.z]); if (qs) L.push({ ...qs, text: 'Main stage', id: 'stage', kind: 'place' }); const qr = proj([REG.x, 5, REG.z]); if (qr) L.push({ ...qr, text: 'Registration', id: 'reg', kind: 'place' });
        setLabels(L); }
    };
    raf = requestAnimationFrame(loop); return () => { cancelAnimationFrame(raf); r.dispose(); if (rRef.current === r) rRef.current = null; };
  }, []);

  // which booth is under a point of the canvas: each booth's footprint, raised to its wall height, projected; the nearest one that contains it
  const boothAt = (x: number, y: number): Booth | null => { const vp = vpRef.current; const cv = canvas.current; if (!vp || !cv) return null; const W = cv.clientWidth, H = cv.clientHeight;
    const P = (p: V3) => { const c = [0, 1, 2, 3].map((i) => vp[i]! * p[0] + vp[4 + i]! * p[1] + vp[8 + i]! * p[2] + vp[12 + i]!); if (c[3]! <= 0.3) return null; return [(c[0]! / c[3]! + 1) / 2 * W, (1 - c[1]! / c[3]!) / 2 * H, c[3]!] as const; };
    let best: { b: Booth; d: number } | null = null;
    for (const b of BOOTHS) { const h = 4; const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].flatMap(([sx, sz]) => [P([b.x + sx! * b.w / 2, 0, b.z + sz! * b.d / 2]), P([b.x + sx! * b.w / 2, h, b.z + sz! * b.d / 2])]).filter(Boolean) as Array<readonly [number, number, number]>;
      if (pts.length < 8) continue; const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); if (x < Math.min(...xs) - 4 || x > Math.max(...xs) + 4 || y < Math.min(...ys) - 4 || y > Math.max(...ys) + 4) continue;
      const dep = pts.reduce((a, p) => a + p[2], 0) / pts.length; if (!best || dep < best.d) best = { b, d: dep }; }
    return best?.b ?? null; };
  // every move of the camera, for the gestures, the buttons on the hall and the keyboard alike
  const moves = useMemo<Moves>(() => { const C = cam.current; return {
    turn: (da) => { C.goal = null; C.yaw += da; },
    tilt: (dp) => { C.goal = null; C.pitch = Math.max(0.15, Math.min(1.4, C.pitch + dp)); },
    zoom: (f) => { C.goal = null; C.dist = Math.max(16, Math.min(200, C.dist * f)); },
    pan: (dx, dy) => { C.goal = null; const k = C.dist / Math.max(240, canvas.current?.clientHeight || 400); const sy = Math.sin(C.yaw), cy = Math.cos(C.yaw);
      C.at = [Math.max(HALL.x0, Math.min(HALL.x1, C.at[0] - (dx * cy - dy * sy) * k)), C.at[1], Math.max(HALL.z0, Math.min(HALL.z1, C.at[2] - (dx * sy + dy * cy) * k))]; },
  }; }, []);
  useMoveKeys(canvas, moves);
  useEffect(() => { const cv = canvas.current; if (!cv) return;
    return attach(cv, { drag: (dx, dy) => { moves.turn(-dx * 0.0042); moves.tilt!(dy * 0.0032); }, alt: (dx, dy) => moves.pan!(dx, dy), zoom: (f) => moves.zoom(f), twist: (da) => moves.turn(-da),
      tap: (x, y) => { cv.focus({ preventScroll: true }); const b = boothAt(x, y); if (b) flyTo(b); }, hint: setHint }, { greedy: () => fullRef.current, twoFingerMove: 'alt' }); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const vote = (sid: string, o: string) => { if (saved.votes[sid]) return; keep({ ...saved, votes: { ...saved.votes, [sid]: o } }); };
  const visible = useMemo(() => [...BOOTHS].sort((a, b) => a.id.localeCompare(b.id)), []);
  const inAgenda = booth ? saved.agenda.includes(booth.id) : false; const left = booth ? saved.leads.some((l) => l.booth === booth.id) : false;

  return <section className="xpo" data-testid="expo-live" data-ready={!err} data-sel={sel || ''} data-organiser={organiser} data-session={session || ''} data-fps={fps} data-detail={detail} data-quality={fullQ ? 'full' : 'auto'} data-agenda={saved.agenda.length} data-leads={saved.leads.length}>
    <header className="cl-head"><h1>Expo LIVE</h1><p>The Northlight Technology Expo, Hall A of the Larkspur Exchange Convention Centre: a fictional expo, twenty fictional exhibitors and the Empathia showcase. Your agenda, details, votes and questions stay in this browser.</p></header>
    <div className="xpo-grid">
      <div className="xpo-stage" ref={stage}>
        <canvas ref={canvas} className="cl-canvas" tabIndex={0} data-testid="xpo-canvas" aria-label="Hall A in 3D. Tap or click a booth to go to it. Drag to look around, right-drag or Shift-drag to move along the hall, Ctrl or ⌘ with the wheel or a pinch to zoom; on a phone two fingers move the view, or open it full screen. Every booth is also on the plan and in the list." />
        {hint ? <p className="xpo-hint" role="status" data-testid="xpo-hint">{hintText(hint)}</p> : null}
        {err ? <div className="cl-err" role="alert" data-testid="xpo-err"><b>This browser cannot draw the hall.</b> {err}. The plan beside it has every booth.</div> : null}
        <div className="cl-labels">{labels.map((l) => <button key={l.id} type="button" tabIndex={-1} className={`cl-tag xpo-tag xpo-tag--${l.kind}`} style={{ transform: `translate(${Math.round(l.x)}px, ${Math.round(l.y)}px)` }} onClick={() => { const b = BOOTHS.find((x) => x.id === l.id); if (b) flyTo(b); }}><b>{l.text}</b></button>)}</div>
        <MovePad moves={moves} what="hall" prefix="xpo" />
        <div className="xpo-bar">
        {/* in full screen the chosen booth’s card is the bar’s first row, so it sits above the buttons however many rows they wrap to (25 Nov 2026: a fixed offset let it cover Done once the bar wrapped) */}
        {full && booth ? <div className="xpo-mini" data-testid="xpo-mini"><b>{booth.id} · {booth.name}</b><span>{booth.cat}</span><button type="button" className="cl-btn" onClick={() => { toggleFull(false); requestAnimationFrame(() => document.querySelector('[data-testid=xpo-card]')?.scrollIntoView({ block: 'nearest' })); }}>Details</button></div> : null}
          <button type="button" className="cl-btn" onClick={() => flyTo(null)} data-testid="xpo-overview">Whole hall</button>
          <button type="button" className="cl-btn" aria-pressed={full} onClick={() => toggleFull(!full)} data-testid="xpo-full">{full ? 'Done' : 'Full screen'}</button>
          <label className="cl-btn xpo-org"><input type="checkbox" checked={organiser} onChange={(e) => setOrganiser(e.target.checked)} data-testid="xpo-organiser" /> Organiser view</label>
          <label className="cl-btn xpo-org"><input type="checkbox" checked={fullQ} onChange={(e) => { setFullQ(e.target.checked); rRef.current?.setFull(e.target.checked); if (e.target.checked) setDetail(100); }} data-testid="xpo-quality" /> Full quality</label><span className="xpo-fps" data-testid="xpo-pace">{fps} fps here{fullQ ? ', held at full detail' : detail < 100 ? `, drawn at ${detail}% of full detail` : ''} · <a href="#/play/performance" data-testid="xpo-measure">Measure this device</a></span></div>
      </div>
      <aside className="xpo-side" aria-label="Plan, booths and sessions">
        <svg className="xpo-plan" viewBox={`${HALL.x0 - 2} ${HALL.z0 - 2} ${HALL.x1 - HALL.x0 + 4} ${HALL.z1 - HALL.z0 + 4}`} role="group" aria-label="Plan of Hall A" data-testid="xpo-plan">
          <rect x={HALL.x0} y={HALL.z0} width={HALL.x1 - HALL.x0} height={HALL.z1 - HALL.z0} className="xpo-plan__hall" rx="1" />
          <rect x={STAGE.x - STAGE.w / 2} y={STAGE.z - STAGE.d / 2} width={STAGE.w} height={STAGE.d} className="xpo-plan__stage" /><text x={STAGE.x} y={STAGE.z + 1} className="xpo-plan__t" textAnchor="middle">Stage</text>
          {visible.map((b) => <g key={b.id} role="button" tabIndex={0} aria-label={`Booth ${b.id}, ${b.name}`} aria-pressed={sel === b.id} onClick={() => flyTo(b)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flyTo(b); } }} className="xpo-plan__b" data-testid={`xpo-plan-${b.id}`}>
            <rect x={b.x - b.w / 2} y={b.z - b.d / 2} width={b.w} height={b.d} rx="0.6" fill={b.color} opacity={sel === b.id ? 1 : 0.78} /><text x={b.x} y={b.z + 1} className="xpo-plan__t" textAnchor="middle">{b.id}</text></g>)}
          <text x={HALL.x0 + 1} y={HALL.z1 - 1.5} className="xpo-plan__t">Entrance ←</text>
        </svg>
        {booth ? <div className="xpo-card" data-testid="xpo-card"><span className="xpo-kick" style={{ color: booth.color }}>{booth.id} · {booth.cat}</span><h2>{booth.name}</h2><p>{booth.about}.</p><p><b>On the stand:</b> {booth.demo}.</p>
          <div className="build__row"><button type="button" className="cl-btn" aria-pressed={inAgenda} onClick={() => keep({ ...saved, agenda: inAgenda ? saved.agenda.filter((x) => x !== booth.id) : [...saved.agenda, booth.id] })} data-testid="xpo-agenda">{inAgenda ? 'In your agenda ✓' : 'Save to my agenda'}</button></div>
          {left ? <p className="sl-note" data-testid="xpo-left">You left your details for {booth.name} (kept in this browser; nothing was sent).</p> : <form className="xpo-lead" onSubmit={(e) => { e.preventDefault(); if (!consent || name.trim().length < 2) return; keep({ ...saved, leads: [...saved.leads, { booth: booth.id, name: name.trim(), at: new Date().toISOString() }] }); setName(''); setConsent(false); }}>
            <label className="kit-field">Your name <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} data-testid="xpo-name" /></label>
            <label className="cl-opt"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} data-testid="xpo-consent" /> I agree that {booth.name} may contact me about what I saw here.</label>
            <button type="submit" className="cl-btn cl-btn--go" disabled={!consent || name.trim().length < 2} data-testid="xpo-leave">Leave my details</button>
            <p className="xpo-note">Nothing is sent in this demonstration: your details stay in this browser. In the product, an exhibitor sees them only with this consent.</p></form>}
          {organiser ? <p className="xpo-note" data-testid="xpo-foot">Footfall here: {footfall(booth, sess)} people an hour. {FOOTFALL_NOTE}</p> : null}
          {organiser && booth.id === 'C3' ? <p className="xpo-note" data-testid="xpo-fault">This stand’s demonstration display reports no signal (simulated). In the product it opens an incident for the venue’s AV team: <a href="#/v25/service">ServiceHands</a>.</p> : null}
        </div> : <p className="xpo-note">Choose a booth on the plan, in the hall or in the list.</p>}
        <details className="xpo-list"><summary>All exhibitors ({BOOTHS.length})</summary><ul>{visible.map((b) => <li key={b.id}><button type="button" onClick={() => flyTo(b)} data-testid={`xpo-list-${b.id}`}>{b.id} · {b.name} <span>{b.cat}</span></button></li>)}</ul></details>
        <div className="xpo-sessions"><h2>Sessions</h2>{SESSIONS.map((s) => <div key={s.id} className="xpo-sess"><button type="button" aria-pressed={session === s.id} onClick={() => setSession(session === s.id ? null : s.id)} data-testid={`xpo-join-${s.id}`}><b>{s.at}</b> {s.title} <span>{s.where}</span></button>
          {session === s.id ? <div className="xpo-poll" data-testid={`xpo-poll-${s.id}`}><p><b>Poll:</b> {s.poll.q}</p>{s.poll.options.map((o) => <button key={o} type="button" className="slv-vote" aria-pressed={saved.votes[s.id] === o} disabled={!!saved.votes[s.id]} onClick={() => vote(s.id, o)} data-testid={`xpo-vote-${s.id}-${s.poll.options.indexOf(o)}`}><span>{o}</span></button>)}
            {saved.votes[s.id] ? <p className="xpo-note" data-testid="xpo-voted">You answered “{saved.votes[s.id]}”. Kept in this browser; in the product, a session’s poll counts the answers of consenting attendees.</p> : null}
            <form className="build__row" onSubmit={(e) => { e.preventDefault(); if (q.trim().length < 4) return; keep({ ...saved, questions: [...saved.questions, { session: s.id, text: q.trim(), state: 'pending' }] }); setQ(''); }}><label className="kit-field">Ask a question <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={200} data-testid="xpo-q" /></label><button type="submit" className="cl-btn" data-testid="xpo-ask">Ask</button></form>
            {saved.questions.filter((x) => x.session === s.id).map((x, i) => <p key={i} className="xpo-note" data-testid="xpo-question">“{x.text}” · waiting for the moderator</p>)}</div> : null}</div>)}</div>
      </aside>
    </div>
  </section>;
}
