/**
 * #/play/campus — Campus Life, the first playable slice (task #186; founder, 17 Nov 2026 10:31 and 10:59): the Quad of Kestrel Valley
 * University and Science Hall, a third-person student you move with the keyboard or a thumb-stick, Professor Calder and her quest, an
 * opening door, the furnished lecture theatre SCI-110 and its circuit bench, three fact cards, experience and levels, and progress kept
 * in this browser (the page says so). Drawn by ./gl.ts in WebGL2; the rules are ./sim.ts.
 *
 * Controls: W A S D or the arrow keys' up/down to move (←/→ turn the camera), Shift to run, E or Enter to act, Esc to pause, M for the
 * map. Drag on the scene to turn the camera. On a touch screen: the stick moves, drag elsewhere turns the camera, and the buttons act and
 * run. Sound is off until the player turns it on, and is quiet.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPE, type ReactElement } from 'react';
import { Renderer, boxVerts, hex, m4, type M4, type V3 } from './gl.js';
import { boxes, CARDS, DOOR, HALL, NPC, BENCH, signs, WORLD, inHall } from './world.js';
import { act, camera, fresh, fromSave, level, reach, solved, step, STAGES, toSave, type Input, type Reach, type State } from './sim.js';
import { QUEST } from '../worlds/university/data.public.js';

const KEY = 'empathia.campuslife.v1';
const load = (): State | null => { try { const r = localStorage.getItem(KEY); return r ? fromSave(JSON.parse(r)) : null; } catch { return null; } };
const store = (s: State) => { try { localStorage.setItem(KEY, JSON.stringify(toSave(s))); return true; } catch { return false; } };
const PLAYER = { body: '#0E7C72', legs: '#27323F', skin: '#C89A78', hair: '#3A2A20', bag: '#E0A43B' };
/** students on the Quad's paths: loops in metres, a walking pace and their clothes (all fictional) */
const WALKERS: Array<{ loop: Array<[number, number]>; speed: number; phase: number; colors: Record<string, string> }> = [
  { loop: [[-22, 15], [22, 15], [22, -15], [-22, -15]], speed: 1.3, phase: 0.1, colors: { body: '#C2553F', legs: '#2B3440', skin: '#8D5B3E', hair: '#1E1A17', bag: '#2E5E8C' } },
  { loop: [[-55, 0], [-24, 0]], speed: 1.1, phase: 0.35, colors: { body: '#3D5A99', legs: '#4A4A4A', skin: '#E2B992', hair: '#B07A3A' } },
  { loop: [[0, 42], [0, 18], [-23, 15], [-23, -15], [0, -20], [23, -15], [23, 15], [0, 18]], speed: 1.4, phase: 0.6, colors: { body: '#6A8F3A', legs: '#24303C', skin: '#C08A64', hair: '#2C2420', bag: '#9C3D5C' } },
  { loop: [[22, -15], [-22, -15], [-22, 15], [22, 15]], speed: 1.2, phase: 0.8, colors: { body: '#E0A43B', legs: '#3A3F55', skin: '#5E3B27', hair: '#151312' } },
];

function person(r: Renderer, x: number, z: number, yaw: number, walk: number, speed: number, col: Record<string, string>, reduced: boolean, alpha = 1) {
  const sw = reduced ? 0 : Math.sin(walk) * Math.min(0.75, speed / 5); const bob = reduced ? 0 : Math.abs(Math.sin(walk)) * 0.04 * Math.min(1, speed / 3);
  const fwd = (d: number): V3 => [x + Math.sin(yaw) * d, 0, z + Math.cos(yaw) * d]; const side = (d: number, y: number): V3 => [x + Math.cos(yaw) * d, y + bob, z - Math.sin(yaw) * d];
  void fwd;
  r.draw(r.unit, m4.trs([x, 1.18 + bob, z], yaw, [0.46, 0.56, 0.26]), hex(col['body']!), alpha);
  r.draw(r.unit, m4.trs([x, 0.9 + bob, z], yaw, [0.42, 0.12, 0.24]), hex(col['legs']!), alpha);
  r.draw(r.unit, m4.trs([x, 1.62 + bob, z], yaw, [0.27, 0.28, 0.27]), hex(col['skin']!), alpha);
  r.draw(r.unit, m4.trs([x - Math.sin(yaw) * 0.02, 1.79 + bob, z - Math.cos(yaw) * 0.02], yaw, [0.29, 0.08, 0.29]), hex(col['hair']!), alpha);
  if (col['bag']) r.draw(r.unit, m4.trs([x - Math.sin(yaw) * 0.19, 1.2 + bob, z - Math.cos(yaw) * 0.19], yaw, [0.34, 0.4, 0.12]), hex(col['bag']!), alpha);
  for (const s of [-1, 1]) {
    r.draw(r.unit, m4.limb(side(0.11 * s, 0.86), yaw, sw * s, [0.15, 0.84, 0.17]), hex(col['legs']!), alpha);
    r.draw(r.unit, m4.limb(side(0.3 * s, 1.43), yaw, -sw * s * 0.8, [0.12, 0.56, 0.13]), hex(col['body']!), alpha);
  }
  r.draw(r.disc, m4.trs([x, 0.025, z], 0, [1.0, 1, 1.0]), [0.12, 0.14, 0.12], 0.3);
}

export default function CampusLife() { return <CampusLifePage />; }
export function CampusLifePage() {
  const canvas = useRef<HTMLCanvasElement>(null); const root = useRef<HTMLDivElement>(null);
  const st = useRef<State>(load() || fresh()); const keys = useRef(new Set<string>()); const stick = useRef({ x: 0, y: 0, on: false }); const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const turnBy = useRef({ yaw: 0, pitch: 0 }); const runToggle = useRef(false);
  const [hud, setHud] = useState(() => ({ ...st.current, reach: null as Reach | null, fps: 0, inside: false, eyeZ: 0 }));
  const [paused, setPaused] = useState(false); const [panel, setPanel] = useState<null | 'talk' | 'circuits' | 'screen' | { card: string }>(null);
  const [map, setMap] = useState(true); const [sound, setSound] = useState(false); const [reduced, setReduced] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [saved, setSaved] = useState<string | null>(() => (load() ? 'Resumed from this browser' : null)); const [err, setErr] = useState<string | null>(null); const [toast, setToast] = useState<string | null>(null);
  const [labels, setLabels] = useState<Array<{ x: number; y: number; text: string; sub?: string; kind: string }>>([]);
  const audio = useRef<AudioContext | null>(null); const frozen = paused || !!panel;
  const frozenRef = useRef(frozen); frozenRef.current = frozen; const reducedRef = useRef(reduced); reducedRef.current = reduced;

  const chime = useCallback((f = 660) => { if (!sound) return; try { const a = audio.current || (audio.current = new AudioContext()); const o = a.createOscillator(), g = a.createGain(); o.frequency.value = f; o.type = 'sine'; g.gain.setValueAtTime(0.0001, a.currentTime); g.gain.exponentialRampToValueAtTime(0.06, a.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.5); o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.55); } catch { /* no audio */ } }, [sound]);
  const commit = useCallback((s: State, note?: string) => { const before = st.current; st.current = s; if (s.xp > before.xp) chime(s.stage !== before.stage ? 880 : 660);
    if (s.stage !== before.stage || s.cards.length !== before.cards.length || note) { if (store(s)) setSaved(`Saved in this browser · ${new Date().toLocaleTimeString()}`); }
    if (s.log.length > before.log.length) { setToast(s.log[s.log.length - 1]!); window.setTimeout(() => setToast(null), 2600); } }, [chime]);
  const doAct = useCallback(() => { const r = reach(st.current); if (!r) return; const out = act(st.current, r); commit(out.s); if (out.open) setPanel(out.open); else if (out.card) setPanel({ card: out.card }); }, [commit]);

  // input
  useEffect(() => {
    const down = (e: KeyboardEvent) => { const t = e.target as HTMLElement; if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      if (!root.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      if (e.key === 'Escape') { e.preventDefault(); if (panel) setPanel(null); else setPaused((p) => !p); return; }
      if (frozenRef.current) return;
      if (e.key === 'e' || e.key === 'E' || (e.key === 'Enter' && document.activeElement === canvas.current)) { e.preventDefault(); doAct(); return; }
      if (e.key === 'm' || e.key === 'M') { setMap((m) => !m); return; }
      if (e.key === 'c' || e.key === 'C') { const y = st.current.yaw; st.current = { ...st.current, camYaw: Math.atan2(Math.sin(y), Math.cos(y)) }; return; }
      if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'PageUp', 'PageDown'].includes(e.key)) { e.preventDefault(); keys.current.add(e.key.length === 1 ? e.key.toLowerCase() : e.key); } };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, [doAct, panel]);

  // the loop
  useEffect(() => {
    let r: Renderer; try { r = new Renderer(canvas.current!); } catch (e) { setErr((e as Error).message); return; }
    const world: number[] = [], roof: number[] = []; for (const b of boxes) boxVerts(b, b.tag === 'roof' ? roof : world);
    const W = r.mesh(world), RF = r.mesh(roof); let raf = 0; let last = performance.now(); let hudAt = 0; let frames = 0, fpsAt = last, fps = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now; frames += 1; if (now - fpsAt > 1000) { fps = Math.round(frames * 1000 / (now - fpsAt)); frames = 0; fpsAt = now; }
      const k = keys.current; const inp: Input = { fwd: 0, right: 0, run: k.has('Shift') || runToggle.current, turn: 0, tilt: 0 };
      if (!frozenRef.current) {
        inp.fwd = (k.has('w') || k.has('ArrowUp') ? 1 : 0) - (k.has('s') || k.has('ArrowDown') ? 1 : 0); inp.right = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0);
        inp.turn = (k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0); inp.tilt = (k.has('PageUp') ? 1 : 0) - (k.has('PageDown') ? 1 : 0);
        if (stick.current.on) { inp.fwd = -stick.current.y; inp.right = stick.current.x; }
        const s0 = st.current; let s = step(s0, inp, dt); s = { ...s, camYaw: s.camYaw + turnBy.current.yaw, camPitch: Math.max(0.08, Math.min(1.15, s.camPitch + turnBy.current.pitch)) }; turnBy.current = { yaw: 0, pitch: 0 };
        if (s.stage !== s0.stage || s.xp !== s0.xp) commit(s); else st.current = s;
      }
      const s = st.current; r.resize(Math.min(window.devicePixelRatio || 1, 2)); const cv = canvas.current!; const aspect = cv.width / Math.max(1, cv.height);
      const cam = camera(s); const vp = m4.mul(m4.persp(0.95, aspect, 0.1, 220), m4.look(cam.eye, cam.at)); const inside = inHall(s.x, s.z);
      r.begin(vp, cam.eye, inside ? [0.86, 0.84, 0.8] : [0.8, 0.87, 0.93], inside ? 30 : 60, inside ? 80 : 150);
      r.draw(W); if (!inside) r.draw(RF);
      const open = s.doorT * 1.25; const dw = (DOOR.x1 - DOOR.x0) / 2;
      r.draw(r.unit, m4.trs([DOOR.x0 + dw / 2 - open, DOOR.h / 2, DOOR.z], 0, [dw, DOOR.h, 0.12]), hex(DOOR.color)); r.draw(r.unit, m4.trs([DOOR.x1 - dw / 2 + open, DOOR.h / 2, DOOR.z], 0, [dw, DOOR.h, 0.12]), hex(DOOR.color));
      person(r, s.x, s.z, s.yaw, s.walkT, s.speed, PLAYER, reducedRef.current, cam.dist < 1.5 ? 0.35 : 1);
      const npcYaw = Math.hypot(s.x - NPC.x, s.z - NPC.z) < 6 ? Math.atan2(s.x - NPC.x, s.z - NPC.z) : NPC.yaw; person(r, NPC.x, NPC.z, npcYaw, now / 900, reducedRef.current ? 0 : 0.6, NPC.colors, true);
      // students crossing the Quad on its paths (ambient; they never block the player). With reduced motion they stand and talk.
      for (const w of WALKERS) { const L = w.loop; const total = L.reduce((a, p, i) => a + Math.hypot(L[(i + 1) % L.length]![0] - p[0], L[(i + 1) % L.length]![1] - p[1]), 0);
        let d = reducedRef.current ? w.phase * total : ((now / 1000) * w.speed + w.phase * total) % total; let i = 0;
        for (;;) { const a = L[i]!, b = L[(i + 1) % L.length]!; const seg = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d <= seg || i >= L.length - 1) { const k = Math.min(1, d / seg); const x = a[0] + (b[0] - a[0]) * k, z = a[1] + (b[1] - a[1]) * k; person(r, x, z, Math.atan2(b[0] - a[0], b[1] - a[1]), now / 1000 * w.speed * 2.2, reducedRef.current ? 0 : w.speed, w.colors, reducedRef.current); break; } d -= seg; i += 1; } }
      const bobT = reducedRef.current ? 0 : Math.sin(now / 400) * 0.12;
      for (const c of CARDS) if (!s.cards.includes(c.id)) r.draw(r.unit, m4.trs([c.at[0], 1.0 + bobT, c.at[1]], reducedRef.current ? 0.6 : now / 700, [0.45, 0.6, 0.06]), [0.98, 0.78, 0.22]);
      const target: V3 | null = s.stage === 'start' || s.stage === 'solved' ? [NPC.x, 2.35, NPC.z] : s.stage === 'met' ? [0, 3.8, DOOR.z + 0.6] : s.stage === 'inside' || s.stage === 'bench' ? [BENCH.x, 2.1, BENCH.z] : null;
      if (target) r.draw(r.unit, m4.trs([target[0], target[1] + bobT, target[2]], reducedRef.current ? 0.78 : now / 500, [0.32, 0.32, 0.32]), [0.06, 0.62, 0.55]);
      if (now - hudAt > 100) { hudAt = now;
        const proj = (p: V3) => { const v = [p[0], p[1], p[2], 1]; const o = [0, 0, 0, 0]; for (let i = 0; i < 4; i++) o[i] = vp[i]! * v[0]! + vp[4 + i]! * v[1]! + vp[8 + i]! * v[2]! + vp[12 + i]! * v[3]!; if (o[3]! <= 0.1) return null; const x = (o[0]! / o[3]! + 1) / 2 * cv.clientWidth, y = (1 - o[1]! / o[3]!) / 2 * cv.clientHeight; return x < -50 || x > cv.clientWidth + 50 || y < -20 || y > cv.clientHeight + 20 ? null : { x, y, d: Math.hypot(p[0] - cam.eye[0], p[2] - cam.eye[2]) }; };
        const L: Array<{ x: number; y: number; text: string; sub?: string; kind: string }> = [];
        if (!inside) for (const g of signs) { const q = proj(g.at); if (q && q.d < 70) L.push({ x: q.x, y: q.y, text: g.text, sub: g.sub, kind: 'sign' }); }
        const qn = proj([NPC.x, 2.15, NPC.z]); if (qn && qn.d < 25) L.push({ x: qn.x, y: qn.y, text: NPC.name, sub: NPC.role, kind: 'npc' });
        if (inside) { const qb = proj([BENCH.x, 1.6, BENCH.z]); if (qb) L.push({ x: qb.x, y: qb.y, text: BENCH.label, kind: 'thing' }); const qs = proj([0, 4.8, -41.4]); if (qs) L.push({ x: qs.x, y: qs.y, text: 'SCI-110 · Lecture theatre', kind: 'thing' }); }
        setLabels(L); setHud({ ...s, reach: reach(s), fps, inside, eyeZ: cam.eye[2] });
      }
      r.draw(r.unit, m4.ident(), undefined, 0);   // keep the program bound for the next frame's begin
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); r.dispose(); };
  }, [commit]);

  // pointer: drag to turn the camera; the thumb-stick
  const onDown = (e: RPE) => { const ne = e as unknown as { pointerType: string; button: number }; if (ne.pointerType === 'mouse' && ne.button !== 0) return; canvas.current?.focus(); drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* a pointer the browser no longer tracks */ } };
  const onMove = (e: RPE) => { const d = drag.current; if (!d || d.id !== e.pointerId) return; turnBy.current.yaw -= (e.clientX - d.x) * 0.006; turnBy.current.pitch += (e.clientY - d.y) * 0.004; d.x = e.clientX; d.y = e.clientY; };
  const onUp = () => { drag.current = null; };
  const stickEl = useRef<HTMLDivElement>(null);
  const stickMove = (e: RPE) => { const b = stickEl.current!.getBoundingClientRect(); const cx = b.left + b.width / 2, cy = b.top + b.height / 2; let x = (e.clientX - cx) / (b.width / 2), y = (e.clientY - cy) / (b.height / 2); const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } stick.current = { x, y, on: true }; };
  const s = hud; const lvl = level(s.xp); const into = s.xp % 200;
  const restart = () => { const f = fresh(); st.current = f; store(f); setSaved('Started again'); setPaused(false); setPanel(null); };

  return <section className="cl" ref={root} data-testid="campus-life" data-ready={!err} data-x={s.x.toFixed(2)} data-z={s.z.toFixed(2)} data-yaw={s.camYaw.toFixed(3)} data-cam={s.camDist.toFixed(2)} data-eye-z={s.eyeZ.toFixed(2)}
    data-xp={s.xp} data-level={lvl} data-stage={s.stage} data-door={s.door ? 'open' : 'closed'} data-inside={s.inside} data-fps={s.fps} data-cards={s.cards.length} data-speed={s.speed.toFixed(2)}>
    <header className="cl-head"><h1>Campus Life</h1><p>Kestrel Valley University · the Quad and Science Hall · a first playable slice. Everything here is fictional; progress is kept <b>in this browser</b>.</p></header>
    <div className="cl-stage">
      <canvas ref={canvas} className="cl-canvas" tabIndex={0} aria-label="Campus Life: the Quad and Science Hall. Move with W A S D, run with Shift, act with E, turn the camera with the left and right arrow keys or by dragging, C to put it behind you." data-testid="cl-canvas"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
      {err ? <div className="cl-err" role="alert" data-testid="cl-err"><b>This browser cannot draw the campus.</b> {err}. The <a href="#/worlds/university">University world</a> shows the same campus as a plan.</div> : null}
      <div className="cl-labels" aria-hidden="true">{labels.map((l, i) => <div key={i} className={`cl-tag cl-tag--${l.kind}`} style={{ transform: `translate(${Math.round(l.x)}px, ${Math.round(l.y)}px)` }}><b>{l.text}</b>{l.sub ? <span>{l.sub}</span> : null}</div>)}</div>
      <div className="cl-hud">
        <div className="cl-card cl-who" data-testid="cl-level"><span className="cl-avatar" aria-hidden="true" /> <div><b>Student · level {lvl}</b><div className="cl-xp" role="meter" aria-label="Experience in this level" aria-valuemin={0} aria-valuemax={200} aria-valuenow={into}><i style={{ width: `${into / 2}%` }} /></div><span>{s.xp} XP</span></div></div>
        <div className="cl-card cl-quest" data-testid="cl-quest"><span className="cl-kick">Quest · Light the lecture theatre</span><b>{STAGES[s.stage]}</b><span>Campus Discovery · fact cards {s.cards.length} of {CARDS.length}</span></div>
        {map ? <svg className="cl-map" viewBox={`${WORLD.minX} ${WORLD.minZ} ${WORLD.maxX - WORLD.minX} ${WORLD.maxZ - WORLD.minZ}`} role="img" aria-label="Map of the Quad and Science Hall with your position" data-testid="cl-map">
          <rect x={WORLD.minX} y={WORLD.minZ} width={WORLD.maxX - WORLD.minX} height={WORLD.maxZ - WORLD.minZ} className="cl-map__g" />
          {boxes.filter((b) => b.max[1] > 5 && b.tag !== 'roof').map((b, i) => <rect key={i} x={b.min[0]} y={b.min[2]} width={b.max[0] - b.min[0]} height={b.max[2] - b.min[2]} className="cl-map__b" />)}
          <rect x={HALL.x0} y={HALL.z0} width={HALL.x1 - HALL.x0} height={HALL.z1 - HALL.z0} className="cl-map__h" />
          {CARDS.filter((c) => !s.cards.includes(c.id)).map((c) => <circle key={c.id} cx={c.at[0]} cy={c.at[1]} r={1.6} className="cl-map__c" />)}
          <circle cx={NPC.x} cy={NPC.z} r={1.8} className="cl-map__n" />
          <g transform={`translate(${s.x} ${s.z}) rotate(${(-s.yaw * 180) / Math.PI})`}><path d="M0 3.4 L2.2 -2 L0 -0.8 L-2.2 -2 Z" className="cl-map__p" /></g>
          <text x={WORLD.maxX - 3} y={WORLD.minZ + 7} className="cl-map__nn" textAnchor="end">N ↑</text>
        </svg> : null}
        <div className="cl-compass" aria-hidden="true" data-testid="cl-compass">{(() => { const th = Math.atan2(Math.sin(s.camYaw), -Math.cos(s.camYaw)); return ([['N', 0], ['E', 90], ['S', 180], ['W', 270]] as Array<[string, number]>).map(([d, b]) => { const rel = b * Math.PI / 180 - th; return Math.cos(rel) > -0.2 ? <span key={d} data-dir={d} style={{ transform: `translateX(${(Math.sin(rel) * 34).toFixed(1)}px)` }}>{d}</span> : null; }); })()}</div>
        {s.reach && !frozen ? <button type="button" className="cl-prompt" onClick={doAct} data-testid="cl-prompt" data-reach={s.reach.id}><kbd>E</kbd> {s.reach.prompt} · {s.reach.label}</button> : null}
        {toast ? <div className="cl-toast" role="status" data-testid="cl-toast">{toast}</div> : null}
        <div className="cl-bar">
          <button type="button" className="cl-btn" onClick={() => setPaused(true)} data-testid="cl-pause">Pause</button>
          <button type="button" className="cl-btn" onClick={() => { store(st.current); setSaved(`Saved in this browser · ${new Date().toLocaleTimeString()}`); }} data-testid="cl-save">Save</button>
          <button type="button" className="cl-btn" onClick={() => setMap((m) => !m)} aria-pressed={map}>Map</button>
          {saved ? <span className="cl-saved" data-testid="cl-saved">{saved}</span> : null}
        </div>
      </div>
      <div className="cl-touch" aria-hidden="true">
        <div ref={stickEl} className="cl-stick" data-testid="cl-stick" onPointerDown={(e) => { try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* a pointer the browser no longer tracks */ } stickMove(e); }} onPointerMove={(e) => { if (stick.current.on) stickMove(e); }} onPointerUp={() => { stick.current = { x: 0, y: 0, on: false }; }} onPointerCancel={() => { stick.current = { x: 0, y: 0, on: false }; }}><i style={{ transform: `translate(${(stick.current.x * 34).toFixed(0)}px, ${(stick.current.y * 34).toFixed(0)}px)` }} /></div>
        <div className="cl-acts"><button type="button" className="cl-round" onPointerDown={(e) => { e.preventDefault(); doAct(); }} disabled={!s.reach}>Act</button><button type="button" className="cl-round" aria-pressed={runToggle.current} onPointerDown={(e) => { e.preventDefault(); runToggle.current = !runToggle.current; }}>Run</button></div>
      </div>
      {paused ? <div className="cl-modal" role="dialog" aria-modal="true" aria-label="Paused" data-testid="cl-paused"><div className="cl-sheet">
        <h2>Paused</h2>
        <p className="cl-keys"><kbd>W A S D</kbd> move · <kbd>Shift</kbd> run · <kbd>E</kbd> act · <kbd>←</kbd><kbd>→</kbd> turn the camera · drag to look · <kbd>C</kbd> camera behind you · <kbd>M</kbd> map · <kbd>Esc</kbd> pause</p>
        <label className="cl-opt"><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} data-testid="cl-sound" /> Sound (quiet chimes when you earn experience; off until you turn it on)</label>
        <label className="cl-opt"><input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} /> Reduce motion (no bobbing or spinning)</label>
        <p>Progress is kept in this browser only, on this device. <button type="button" className="cl-btn" onClick={restart} data-testid="cl-restart">Start again</button></p>
        <p>Also: <a href="#/learn/practice">Learn</a> · <a href="#/lite">Lite</a> · <a href="#/worlds/university">the University world</a> · <a href="#/field-tools/ohms-law">Ohm’s law in Field Tools</a></p>
        <button type="button" className="cl-btn cl-btn--go" onClick={() => { setPaused(false); canvas.current?.focus(); }} data-testid="cl-resume" autoFocus>Resume</button>
      </div></div> : null}
      {panel ? <Panel panel={panel} s={st.current} onClose={() => { setPanel(null); canvas.current?.focus(); }} onSolved={(first) => commit(solved(st.current, first), 'solved')} /> : null}
    </div>
    <p className="cl-foot">A first playable slice: one plaza, one building, one furnished classroom, one person to meet and one quest. The other buildings are seen from outside and open in later releases. Frame rate here: {s.fps} fps (this machine, this browser).</p>
  </section>;
}

function Panel({ panel, s, onClose, onSolved }: { panel: 'talk' | 'circuits' | 'screen' | { card: string }; s: State; onClose: () => void; onSolved: (firstTry: number) => void }) {
  const close = useRef<HTMLButtonElement>(null); useEffect(() => { close.current?.focus(); }, []);
  let body: ReactElement;
  if (panel === 'talk') {
    const lines: Record<string, string[]> = {
      met: ['Good morning! I’m Professor Calder. My 09:00 Circuits and Signals lecture is in SCI-110 — and the LED demonstration board on the circuit bench is dark.', 'Could you go in and fix it? Three circuits, three resistors. Work each one out; don’t guess.'],
      inside: ['The bench is on the right-hand side of SCI-110, past the desks. Take your time.'], bench: ['How is the bench? Ohm’s law is your friend: V = I × R.'],
      solved: ['You did it already? Wonderful — come and tell me.'], done: ['The board is lit and the lecture can start on time. Thank you! You’ve earned your experience today.', 'There’s more of the campus to come: the library, the Engineering Centre and the Union open in later releases.'],
      start: ['Hello!'],
    };
    body = <><h2>{NPC.name}</h2><p className="cl-sub">{NPC.role}</p>{(lines[s.stage] || lines['start']!).map((l, i) => <p key={i}>{l}</p>)}</>;
  } else if (panel === 'screen') {
    body = <><h2>SCI-110 · Lecture screen</h2><p>09:00 · Circuits and Signals — Week 6: series and parallel resistance.</p><p className="cl-sub">In the connected demonstration, this room is the one commissioned on the server: its plan, devices, tests and acceptance are at <a href="#/flagship">the lecture theatre’s page</a>.</p></>;
  } else if (panel === 'circuits') {
    return <Circuits onClose={onClose} onSolved={onSolved} done={s.stage !== 'bench'} />;
  } else { const c = CARDS.find((x) => x.id === panel.card)!; body = <><h2>Fact card · {c.title}</h2><p>{c.fact}</p><p className="cl-sub">Campus Discovery: {s.cards.length} of {CARDS.length} found.</p></>; }
  return <div className="cl-modal" role="dialog" aria-modal="true" aria-label="Conversation" data-testid="cl-panel"><div className="cl-sheet">{body}<button ref={close} type="button" className="cl-btn cl-btn--go" onClick={onClose} data-testid="cl-close">Continue</button></div></div>;
}

function Circuits({ onClose, onSolved, done }: { onClose: () => void; onSolved: (firstTry: number) => void; done: boolean }) {
  const [i, setI] = useState(0); const [pick, setPick] = useState<number | null>(null); const [first, setFirst] = useState(0); const [tried, setTried] = useState(false); const [finished, setFinished] = useState(done);
  const q = QUEST[i]!; const opt = pick !== null ? q.options[pick]! : null; const btn = useRef<HTMLButtonElement>(null); useEffect(() => { btn.current?.focus(); }, [i, finished]);
  const lit = useMemo(() => finished, [finished]);
  return <div className="cl-modal" role="dialog" aria-modal="true" aria-label="Circuit bench" data-testid="cl-circuits"><div className="cl-sheet cl-sheet--wide">
    <h2>Circuit bench · SCI-110</h2>
    <svg viewBox="0 0 320 70" className="cl-board" role="img" aria-label={lit ? 'The LED board is lit' : 'The LED board is dark'} data-lit={lit}>
      <rect x="2" y="2" width="316" height="66" rx="8" className="cl-board__pcb" />{[0, 1, 2, 3, 4, 5, 6, 7].map((k) => <circle key={k} cx={30 + k * 37} cy="35" r="11" className={lit || k < i * 3 ? 'cl-led cl-led--on' : 'cl-led'} />)}
    </svg>
    {finished ? <><p data-testid="cl-circuits-done"><b>The board is lit.</b> {done ? 'This bench is already done.' : 'Go and tell Professor Calder.'}</p><button ref={btn} type="button" className="cl-btn cl-btn--go" onClick={onClose} data-testid="cl-close">Continue</button></> : <>
      <p className="cl-sub">Circuit {i + 1} of {QUEST.length} · {q.given}</p><p><b>{q.prompt}</b></p>
      <div className="cl-opts" role="group" aria-label="Answers">{q.options.map((o, k) => <button key={k} ref={k === 0 ? btn : undefined} type="button" className="cl-opt-btn" aria-pressed={pick === k} data-right={o.right} disabled={!!opt?.right}
        onClick={() => { setPick(k); if (!tried) { setTried(true); if (o.right) setFirst((f) => f + 1); } }}>{o.label}</button>)}</div>
      {opt ? <p className={opt.right ? 'cl-ok' : 'cl-no'} role="status" data-testid="cl-why">{opt.right ? 'Right. ' : 'Not quite. '}{opt.why}</p> : null}
      <p className="cl-sub">Stuck? <a href="#/field-tools/ohms-law" data-testid="cl-fieldtools">Work it out with Ohm’s law in Field Tools</a> (your progress is saved; come back to the bench to carry on).</p>
      <div className="build__row"><button type="button" className="cl-btn" onClick={onClose}>Leave the bench</button>
        {opt?.right ? <button type="button" className="cl-btn cl-btn--go" data-testid="cl-next" onClick={() => { if (i + 1 < QUEST.length) { setI(i + 1); setPick(null); setTried(false); } else { setFinished(true); onSolved(first); } }}>{i + 1 < QUEST.length ? 'Next circuit' : 'Light the board'}</button> : null}</div>
    </>}
  </div></div>;
}
