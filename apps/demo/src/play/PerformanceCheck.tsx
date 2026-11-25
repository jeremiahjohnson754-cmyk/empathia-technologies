/**
 * The performance check (25 Nov 2026; roadmap A19): a visitor measures their own device, in the page, and keeps the result.
 *
 * Founder, 24 Nov 2026: "representative desktop and mobile performance benchmarks covering rendering, navigation responsiveness,
 * memory consumption and larger spatial environments"; 25 Nov: measure customer hardware before optimising further against a test
 * machine. This page is how such a measurement is taken. It never starts by itself, sends nothing anywhere, and says in the result
 * what the result is: one run, on one device, at one moment (play/perf.ts, HONESTY).
 *
 * What it measures: (1) a synthetic district drawn larger and larger at full quality (rendering, and a larger environment);
 * (2) the three live scenes exactly as a visitor meets them, with the time each takes to show its first frame (the response of
 * moving between worlds) and whatever each gave up to keep its pace; (3) the memory this browser reports, where it reports any.
 * `?short` in the address shortens every step for the automated check of this page; a short run says so in its result.
 */
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { ROLES } from '../access/policy.js';
import { ExportMenu } from '../export/ExportMenu.js';
import { performanceReport } from '../export/perf.js';
import type { PageProps } from '../registry.types.js';
import { Renderer, m4, norm, type V3 } from './gl.js';
import { BLOCK_SIDE, HONESTY, IDEAL, LADDER, SCENES, STOP_BELOW, TARGET, block, blockPlaces, browserOf, headline, memoryWords, paceOf, standing, type DeviceFacts, type MemoryReading, type PerfResult, type SceneKey, type SceneResult, type StepResult } from './perf.js';
import './play.css';

/** each scene's page is downloaded when its turn comes, as it is for a visitor who opens it */
const SCENE: Record<SceneKey, () => Promise<{ default: ComponentType }>> = { campus: () => import('./CampusLife.js'), stadium: () => import('./StadiumLive.js'), expo: () => import('./ExpoLive.js') };
const ROOT: Record<SceneKey, string> = { campus: 'campus-life', stadium: 'stadium-live', expo: 'expo-live' };
const wait = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));
const frame = () => new Promise<number>((ok) => requestAnimationFrame(ok));
const heapMb = (): number | null => { const m = (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory; return m && typeof m.usedJSHeapSize === 'number' ? Math.round(m.usedJSHeapSize / 1048576) : null; };
function facts(cv: HTMLCanvasElement | null): DeviceFacts {
  const nav = navigator as Navigator & { deviceMemory?: number }; let renderer = '';
  try { const g = document.createElement('canvas').getContext('webgl2'); const e = g?.getExtension('WEBGL_debug_renderer_info'); renderer = g ? String(e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)) : 'no WebGL2'; } catch { renderer = 'not reported'; }
  const browser = browserOf(nav.userAgent);
  void cv; return { cores: typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null, memoryGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null, screen: `${screen.width} × ${screen.height}`, pixelRatio: Math.round((window.devicePixelRatio || 1) * 100) / 100, renderer: renderer.slice(0, 160), browser, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, touch: (nav.maxTouchPoints || 0) > 0 };
}

export default function PerformanceCheck(props: PageProps) { return <PerformanceCheckPage {...props} />; }
export function PerformanceCheckPage({ role, query }: PageProps) {
  // the short form gives a scene three seconds: at the stadium's own floor on the test machine (2 frames a second) that is still more than the five frames a pace needs (the regression on 5c6d698f gave it 1.8 s, drew eight frames, and reported none)
  const short = query.has('short'); const STEP = short ? 700 : 2600, WARM = short ? 200 : 500, SCENE_MS = short ? 3000 : 8000;
  const canvas = useRef<HTMLCanvasElement | null>(null); const stop = useRef(false); const kept = useRef<Renderer | null>(null);   // kept: the last run's renderer, so its last picture stays on the page until the next run or until the page is left
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle'); const [step, setStep] = useState({ n: 0, of: LADDER.length + SCENES.length, label: '' });
  const [runs, setRuns] = useState(0);   // each run draws on a canvas of its own: the last run's drawing context is given back when it ends and cannot be used again
  const [scene, setScene] = useState<{ key: SceneKey; Page: ComponentType } | null>(null); const [result, setResult] = useState<PerfResult | null>(null); const [err, setErr] = useState<string | null>(null);
  useEffect(() => () => { stop.current = true; Renderer.probe = null; try { kept.current?.dispose(); } catch { /* already gone */ } kept.current = null; }, []);

  const run = useCallback(async () => {
    if (phase === 'running') return; stop.current = false; setErr(null); setResult(null); setPhase('running'); try { kept.current?.dispose(); } catch { /* already gone */ } kept.current = null; setRuns((n) => n + 1); await frame(); await frame();
    const cv = canvas.current; if (!cv) { setErr('the page has no canvas to draw on'); setPhase('done'); return; }
    const device = facts(cv); const memory: MemoryReading[] = [{ when: 'Before the check', usedMb: heapMb() }]; const ladder: StepResult[] = []; const scenes: SceneResult[] = []; let interrupted: string | null = null; let shape: PerfResult['canvas'] = null;
    const gone = () => { if (stop.current) interrupted = 'stopped before the end'; else if (document.hidden) interrupted = 'the page was hidden, so the browser stopped drawing'; return !!interrupted; };
    let r: Renderer | null = null;
    try {
      // 1. a larger and larger synthetic environment, at full quality: the same block drawn 1, 2, 4 … 32 times
      r = new Renderer(cv); r.setFull(true); const mesh = r.mesh(block()); const tris = mesh.n / 3; const ground = r.mesh((() => { const v: number[] = []; const s = BLOCK_SIDE * 4; for (const [a, b, c] of [[[-s, 0, -s], [-s, 0, s], [s, 0, s]], [[-s, 0, -s], [s, 0, s], [s, 0, -s]]] as V3[][]) for (const p of [a!, b!, c!]) v.push(p[0], p[1], p[2], 0, 1, 0, 0.36, 0.4, 0.38); return v; })());
      const still = device.reducedMotion; let slow = '';   // once a step is too slow, why the larger ones are not attempted
      for (let i = 0; i < LADDER.length && !gone(); i++) { const blocks = LADDER[i]!; const places = blockPlaces(blocks); const triangles = tris * blocks;
        setStep({ n: i + 1, of: LADDER.length + SCENES.length, label: `A synthetic district of ${triangles.toLocaleString('en-US')} triangles` });
        if (slow) { ladder.push({ blocks, triangles, pace: null, skipped: slow }); continue; }
        const span = Math.ceil(Math.sqrt(blocks)) * BLOCK_SIDE; const times: number[] = []; const t0 = performance.now(); let last = t0;
        for (;;) { const now = await frame(); if (gone()) break; const dt = now - last; last = now; if (now - t0 > WARM) times.push(dt); if (now - t0 > WARM + STEP) break;
          r.resize(Math.min(window.devicePixelRatio || 1, 2)); const aspect = cv.width / Math.max(1, cv.height); const a = still ? 0.6 : 0.6 + (now - t0) / 9000; const eye: V3 = [Math.cos(a) * (span * 0.75 + 120), span * 0.35 + 70, Math.sin(a) * (span * 0.75 + 120)];
          r.light = { sun: norm([0.35, 0.85, 0.3]), sunCol: [0.6, 0.58, 0.54], sky: [0.9, 0.92, 0.95], ground: [0.4, 0.4, 0.38], amb: 0.6 };
          r.begin(m4.mul(m4.persp(0.9, aspect, 1, span * 3 + 900), m4.look(eye, [0, 10, 0])), eye, [0.8, 0.84, 0.88], span * 1.5 + 300, span * 3 + 800); r.sky(eye, [0.84, 0.88, 0.92], [0.45, 0.62, 0.86], span * 2 + 600);
          r.draw(ground); for (const at of places) r.draw(mesh, m4.trs(at, 0, [1, 1, 1])); }
        shape = { cssWidth: cv.clientWidth, cssHeight: cv.clientHeight, width: cv.width, height: cv.height };
        if (gone()) break; const pace = paceOf(times);
        if (!pace) { ladder.push({ blocks, triangles, pace: null, tooSlow: true, skipped: 'too slow to measure: fewer than five frames in the time allowed' }); slow = 'not run: the step before was too slow to measure'; }
        else { ladder.push({ blocks, triangles, pace }); if (pace.fps < STOP_BELOW) slow = `not run: the step before was below ${STOP_BELOW} frames a second`; } }
      kept.current = r; r = null; memory.push({ when: 'After the synthetic environment', usedMb: heapMb() });
      // 2. the three scenes, each exactly as a visitor meets it
      for (let i = 0; i < SCENES.length && !gone(); i++) { const s = SCENES[i]!; setStep({ n: LADDER.length + i + 1, of: LADDER.length + SCENES.length, label: s.title }); const times: number[] = []; let first: number | null = null; const t0 = performance.now();
        Renderer.probe = (ms) => { if (first === null) first = performance.now() - t0; else times.push(ms); }; const Page = (await SCENE[s.key]()).default; setScene({ key: s.key, Page });
        while (first === null && performance.now() - t0 < 30000 && !gone()) await wait(60); const late = first === null && !interrupted;   // it had its thirty seconds and drew nothing (a stop or a hidden page is not that)
        const began = performance.now(); while (performance.now() - began < SCENE_MS && first !== null && !gone()) await wait(100);
        const root = document.querySelector<HTMLElement>(`[data-testid="pf-scene"] [data-testid="${ROOT[s.key]}"]`); const cvs = root?.querySelector<HTMLCanvasElement>('canvas'); const picture = cvs ? { cssWidth: cvs.clientWidth, cssHeight: cvs.clientHeight, width: cvs.width, height: cvs.height } : null; const settled = times.slice(Math.floor(times.length / 2));   // the second half: after the scene has adapted
        // A slow device may draw too few frames in that half to give a pace. Then the pace is of every frame it drew, and the row says so; with fewer than five in all, it says it was too slow to measure. A scene that drew frames is never reported as not measured.
        const pace = paceOf(settled) ?? paceOf(times); const cut = !!interrupted;   // a scene the check was stopped in did not have its time: it is not called slow
        const why = first === null || paceOf(settled) ? null : pace ? (cut ? 'the pace is of the frames it drew before the check ended' : 'the pace is of every frame it drew: too few after it settled') : cut ? 'not measured: the check ended first' : 'too slow to measure: fewer than five frames in the time allowed';
        scenes.push({ key: s.key, title: s.title, firstFrameMs: first === null ? null : Math.round(first), pace, detail: root?.dataset.detail ? Number(root.dataset.detail) : null, simple: root?.dataset.simple === undefined ? null : root.dataset.simple === 'true', triangles: cvs?.dataset.tris ? Number(cvs.dataset.tris) : null, draws: cvs?.dataset.draws ? Number(cvs.dataset.draws) : null, picture, ...(late ? { note: 'did not draw a frame within 30 seconds' } : why ? { note: why } : {}) });
        Renderer.probe = null; setScene(null); await wait(250); memory.push({ when: `After ${s.title}`, usedMb: heapMb() }); }
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); interrupted = interrupted || 'an error stopped it'; }
    finally { Renderer.probe = null; setScene(null); if (r) kept.current = r; }
    setResult({ schema: 'empathia.device-performance/1', at: new Date().toISOString(), short, interrupted, canvas: shape, device, ladder, scenes, memory }); setPhase('done');
  }, [phase, short, STEP, WARM, SCENE_MS]);

  const Scene = scene ? scene.Page : null; const made = () => ({ role: ROLES[role].label, at: new Date().toISOString(), build: process.env.DEMO_BUILD_ID || 'dev' });
  const ms = (x: number | null | undefined) => (x == null ? '—' : String(x)); const mark = (w: 'held' | 'below' | 'not run') => <span data-held={w}>{w}</span>;
  const box = useCallback((e: HTMLDivElement | null) => { if (e) (e as HTMLElement & { inert: boolean }).inert = true; }, []);   // a scene being measured is shown, not used: nothing in it takes focus or a press, and it is kept from a screen reader
  return <section className="slv" data-testid="performance-check" data-phase={phase} data-short={short}>
    <header className="cl-head"><h1>Performance check</h1><p>Measure this device: how large a 3D environment it draws smoothly, and how the three scenes run on it. It starts only when you ask, takes about {short ? 'ten seconds' : 'a minute'}, and sends nothing anywhere.</p></header>
    <div className="slv-chips">{phase === 'running'
      ? <button type="button" className="cl-btn" onClick={() => { stop.current = true; }} data-testid="pf-stop">Stop</button>
      : <button type="button" className="cl-btn cl-btn--go" onClick={run} data-testid="pf-run">{phase === 'done' ? 'Run the check again' : 'Run the check'}</button>}</div>
    <p className="slv-note" role="status" data-testid="pf-status">{phase === 'running' ? `Measuring ${step.n} of ${step.of}: ${step.label}. Keep this page in front until it finishes.` : phase === 'done' && result ? headline(result) : 'Nothing has been measured yet.'}</p>
    {Scene ? <div className="pf-live" data-testid="pf-scene" ref={box} aria-hidden="true">
      {/* a scene is measured here, in the page's full width, so it is laid out and sized as it is on its own page */}
      <Scene />
    </div> : null}
    <div className={Scene ? 'slv-grid pf-away' : 'slv-grid'} data-testid="pf-own">
      <div className="slv-stage pf-stage">
        <canvas key={runs} ref={canvas} className="pf-canvas" aria-label="The synthetic district the check draws" data-testid="pf-canvas" />
        {phase === 'idle' ? <p className="pf-wait">The check draws here when it runs.</p> : null}
        {err ? <div className="cl-err" role="alert" data-testid="pf-error">The check could not finish: {err}</div> : null}
      </div>
      <aside className="slv-console" aria-label="What a result is">
        <div className="slv-pane" data-testid="pf-honesty"><p className="slv-h">What a result is</p>{HONESTY.map((h) => <p key={h} className="slv-note">{h}</p>)}</div>
        <p className="slv-note">The targets: {TARGET} frames a second to be interactive, {IDEAL} to be smooth. A target is held when the pace is at or above it and no more than one frame in twenty runs a quarter longer than it allows.</p>
      </aside>
    </div>
    {result ? <div className="pf-results" data-testid="pf-results">
      <h2>The device, as its browser reports it</h2>
      <table className="slv-table" aria-label="The device, as its browser reports it" data-testid="pf-device"><tbody>
        <tr><th scope="row">Processor threads</th><td>{result.device.cores ?? 'not reported'}</td></tr>
        <tr><th scope="row">Memory</th><td>{memoryWords(result.device.memoryGb)}</td></tr>
        <tr><th scope="row">Screen</th><td>{result.device.screen} at {result.device.pixelRatio}×</td></tr>
        <tr><th scope="row">Graphics</th><td>{result.device.renderer || 'not reported'}</td></tr>
        <tr><th scope="row">Browser</th><td>{result.device.browser}</td></tr>
        <tr><th scope="row">Picture measured</th><td>{result.canvas ? `${result.canvas.cssWidth} × ${result.canvas.cssHeight} on the page, ${result.canvas.width} × ${result.canvas.height} drawn` : 'nothing was drawn'}</td></tr>
      </tbody></table>
      <h2>A larger and larger environment</h2>
      <p className="slv-note">The check draws the same block of plain towers once, then twice, up to thirty-two times, at full quality with nothing simplified, and stops going larger once a size is too slow. The count is of the towers; the ground and sky add a few hundred triangles.</p>
      <div className="pf-scroll"><table className="slv-table" aria-label="Pace by size of the synthetic environment" data-testid="pf-ladder"><thead><tr><th scope="col">Triangles a frame</th><th scope="col">Frames a second</th><th scope="col">Usual frame (ms)</th><th scope="col">Slow frame, 1 in 20 (ms)</th><th scope="col">Slowest frame (ms)</th><th scope="col">Against {TARGET}</th><th scope="col">Against {IDEAL}</th></tr></thead>
        <tbody>{result.ladder.map((s) => <tr key={s.blocks} data-triangles={s.triangles}><th scope="row">{s.triangles.toLocaleString('en-US')}</th>{s.pace ? <><td>{s.pace.fps}</td><td>{s.pace.medianMs}</td><td>{s.pace.p95Ms}</td><td>{s.pace.worstMs}</td></> : <td colSpan={4}>{s.skipped || '—'}</td>}<td>{mark(standing(s, TARGET))}</td><td>{mark(standing(s, IDEAL))}</td></tr>)}</tbody></table></div>
      <h2>The three scenes, as a visitor meets them</h2>
      <p className="slv-note">Each scene is opened in this page at the size its own page gives it, and left to run as it does for a visitor: it may draw fewer pixels, or draw distant figures more simply, to keep its pace. The pace is of the second half of its time, after it has settled. The time to the first frame includes downloading the scene if this browser did not already hold it.</p>
      <div className="pf-scroll"><table className="slv-table" aria-label="The three scenes on this device" data-testid="pf-scenes"><thead><tr><th scope="col">Scene</th><th scope="col">To the first frame (ms)</th><th scope="col">Frames a second</th><th scope="col">Slow frame, 1 in 20 (ms)</th><th scope="col">Drawn at</th><th scope="col">Distant figures</th><th scope="col">Triangles a frame</th><th scope="col">Picture (on the page, drawn)</th></tr></thead>
        <tbody>{result.scenes.map((s) => <tr key={s.key} data-scene={s.key} data-on-page={s.picture ? `${s.picture.cssWidth}x${s.picture.cssHeight}` : ''}><th scope="row">{s.title}</th><td>{ms(s.firstFrameMs)}</td><td>{s.pace ? <>{s.pace.fps}{s.note ? <span data-testid="pf-scene-note"> ({s.note})</span> : null}</> : s.note || 'not reached'}</td><td>{ms(s.pace?.p95Ms)}</td><td>{s.detail == null ? '—' : `${s.detail}%`}</td><td>{s.simple == null ? '—' : s.simple ? 'drawn simply' : 'whole'}</td><td>{s.triangles == null ? '—' : s.triangles.toLocaleString('en-US')}</td><td>{s.picture ? `${s.picture.cssWidth} × ${s.picture.cssHeight}, ${s.picture.width} × ${s.picture.height}` : '—'}</td></tr>)}</tbody></table></div>
      {result.scenes.length < SCENES.length ? <p className="slv-note" data-testid="pf-partial">{SCENES.length - result.scenes.length} of the {SCENES.length} scenes were not reached before the check ended.</p> : null}
      <h2>Memory</h2>
      <p className="slv-note">{result.memory.every((m) => m.usedMb == null) ? 'This browser reports no memory figure.' : 'JavaScript memory as this browser reports it. It is not the memory the graphics use.'}</p>
      {result.memory.some((m) => m.usedMb != null) ? <table className="slv-table" aria-label="Memory in use during the check" data-testid="pf-memory"><tbody>{result.memory.map((m) => <tr key={m.when}><th scope="row">{m.when}</th><td>{m.usedMb == null ? 'not reported' : `${m.usedMb} MB`}</td></tr>)}</tbody></table> : null}
      <ExportMenu testId="pf-export" title="Keep this result" sub="The result as six files, written in your browser. Nothing is uploaded." by={ROLES[role].label} make={() => performanceReport(result, made())}
        says="Every file says what it is: one run measured on this device, a synthetic environment and fictional scenes, the two targets, and the role it was made as, which grants nothing." />
    </div> : null}
  </section>;
}
