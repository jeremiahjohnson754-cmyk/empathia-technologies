/**
 * Shoot the Service (#/labs/video): SIGNAL's video flagship lab. Two live viewfinders that band, flicker, smear, blow out and colour-cast
 * exactly as the settings say; a switcher with program and preview, a cut and a mix, a lyrics key; and a lip-sync delay for the stream.
 * Results stay in this browser: practice, never a credential.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PageProps } from '../registry.types.js';
import * as V from './video.js';
import { Knob, useClock } from './controls.js';
import { kelvinRgb } from './LightLab.js';

const KEY = 'empathia.videolab.v1';
interface State { rig: V.Rig; cue: number; best: Record<string, number> }
const read = (): State => { try { const x = JSON.parse(localStorage.getItem(KEY) || 'null'); if (x && x.rig && Array.isArray(x.rig.cams)) return x; } catch { /* storage may be blocked */ } return { rig: V.freshVideo(), cue: 0, best: {} }; };
const HELP: Record<string, [string, string]> = {
  fps: ['Frame rate', 'Every camera and the switcher must run the same format. In 60 Hz countries 29.97 or 59.94 sits with the mains; 25 and 50 belong to 50 Hz countries.'],
  shutter: ['Shutter', 'How long each frame is exposed, as a fraction of a second. It decides motion blur, and whether lights and LED walls band or flicker.'],
  iris: ['Iris (f-stop)', 'The lens opening. Each full stop (2.8 → 4 → 5.6) halves the light. Wider (smaller number) also blurs the background more.'],
  iso: ['ISO / gain', 'Amplifies the picture. Each doubling is one stop brighter, and noisier.'],
  nd: ['ND filter', 'Neutral grey glass in front of the sensor: takes stops of light away without changing anything else.'],
  wb: ['White balance', 'Tells the camera what colour white is. Set it to the light’s colour temperature.'],
  switcher: ['The switcher', 'Preview is what goes next; program is what is live. CUT swaps them at once; MIX dissolves. The key puts the lyrics over the program.'],
  sync: ['Lip-sync', 'Each device in the video path holds a frame. Delay the stream’s audio by the same time: frames × (1000 ÷ fps) ms.'],
};

export default function VideoLabPage(_p: PageProps) { return <section className="stack" data-native="" data-testid="videolab-page"><VideoLab /></section>; }
export function VideoLab() {
  const [st, setSt] = useState<State>(read); const [cam, setCam] = useState(0); const [help, setHelp] = useState('shutter'); const [said, setSaid] = useState(''); const [mix, setMix] = useState<{ from: number; at: number } | null>(null);
  const save = (n: State) => { setSt(n); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* the lab still works without storage */ } };
  const r = st.rig; const gs = useMemo(() => V.videoGoals(r, st.cue), [r, st.cue]); const sc = V.videoScore(gs); const t = useClock(20);
  const setRig = (p: Partial<V.Rig>) => save({ ...st, rig: { ...r, ...p } }); const setCamP = (i: number, p: Partial<V.Cam>) => setRig({ cams: r.cams.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const c = r.cams[cam]!; const C = V.CUES[st.cue]!;
  useEffect(() => { if (!mix) return; const id = setTimeout(() => setMix(null), 1000); return () => clearTimeout(id); }, [mix]);
  const take = (dissolve: boolean) => { if (dissolve) setMix({ from: r.pgm, at: Date.now() }); setRig({ pgm: r.pvw, pvw: r.pgm }); setHelp('switcher'); };
  const next = () => { const best = { ...st.best, [C.key]: Math.max(st.best[C.key] || 0, sc) }; const n = (st.cue + 1) % V.CUES.length; save({ ...st, best, cue: n }); setSaid(`${C.label}: ${sc} of 100${sc >= 75 ? ' — passed.' : '. 75 passes.'} Next: ${V.CUES[n]!.label}. ${V.CUES[n]!.says}`); };
  return <div className="mx vx" data-testid="videolab" data-score={sc} data-cue={C.key}>
    <header className="mx-head"><div><p className="mx-kicker">SIGNAL flagship lab · Video</p><h2 className="mx-title">Shoot the Service</h2>
      <p className="mx-lede">Two cameras, an LED wall, house lights on the mains, a switcher and a stream. Set the format, shutter, iris, ISO, ND and white balance until the viewfinders are clean; cut the service on cue; and make the sound wait for the picture.</p>
      <p className="mx-note">A teaching model: banding from the wall’s refresh and the lights’ flicker over the shutter time, exposure from the incident-meter equation, lip-sync from frame times. Not a real camera or switcher. Results stay in this browser.</p></div>
      <div className="mx-score" data-testid="vx-score"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" className="mx-score__bg" /><circle cx="18" cy="18" r="15.5" className="mx-score__fg" style={{ strokeDasharray: `${sc * 0.974} 100`, stroke: sc >= 75 ? '#22c55e' : sc >= 50 ? '#f59e0b' : '#ef4444' }} /></svg><b>{sc}</b><span>cue score</span></div></header>
    <div className="mx-scenes" role="group" aria-label="Cues">{V.CUES.map((x, i) => <button key={x.key} type="button" className={`mx-scene${i === st.cue ? ' on' : ''}${(st.best[x.key] || 0) >= 75 ? ' done' : ''}`} aria-pressed={i === st.cue} onClick={() => save({ ...st, cue: i })} data-testid={`vx-cue-${x.key}`} title={x.says}><span>{i + 1}</span>{x.label}{st.best[x.key] != null ? <em>{st.best[x.key]}</em> : null}</button>)}
      <button type="button" className="mx-btn mx-btn--go" onClick={next} data-testid="vx-next">Score this cue and go on</button><button type="button" className="mx-btn" onClick={() => { save({ rig: V.freshVideo(), cue: 0, best: st.best }); setSaid('The cameras and switcher are back as they were handed over.'); }}>Reset</button></div>
    <p className="mx-said" role="status" data-testid="vx-said">{said || C.says}</p>
    <div className="mx-stage"><div className="mx-roomwrap">
      <div className="mx-console" aria-label="Multiview">
        <div className="vx-mon">{V.SOURCES.map((s, i) => <button key={s} type="button" className={`vx-src${r.pgm === i ? ' pgm' : r.pvw === i ? ' pvw' : ''}`} onClick={() => { setRig({ pvw: i }); setHelp('switcher'); }} aria-label={`${s}${r.pgm === i ? ', on program' : r.pvw === i ? ', on preview' : ''}: select for preview`} data-testid={`vx-src-${i}`}>
          <View i={i} r={r} t={t} keyOn={i === r.pgm && r.key} /><span>{r.pgm === i ? '● PGM ' : r.pvw === i ? '○ PVW ' : ''}{s}</span></button>)}</div>
        <div className="vx-bus"><b>PROGRAM</b>{V.SOURCES.map((s, i) => <button key={s} type="button" className={`vx-key${r.pgm === i ? ' pgm' : ''}`} onClick={() => setRig({ pgm: i })} data-testid={`vx-pgm-${i}`}>{i + 1}</button>)}</div>
        <div className="vx-bus"><b>PREVIEW</b>{V.SOURCES.map((s, i) => <button key={s} type="button" className={`vx-key${r.pvw === i ? ' pvw' : ''}`} onClick={() => setRig({ pvw: i })} data-testid={`vx-pvw-${i}`}>{i + 1}</button>)}
          <button type="button" className="vx-key" onClick={() => take(false)} data-testid="vx-cut">CUT</button><button type="button" className="vx-key" onClick={() => take(true)} data-testid="vx-mix">MIX</button>
          <button type="button" className={`vx-key${r.key ? ' pgm' : ''}`} aria-pressed={r.key} onClick={() => { setRig({ key: !r.key }); setHelp('switcher'); }} data-testid="vx-key">KEY · lyrics</button>{mix && <span className="mx-dim">mixing…</span>}</div>
      </div>
      <div className="mx-console" aria-label={`Camera ${cam + 1} controls`}>
        <div className="mx-layers">{r.cams.map((_, i) => <button key={i} type="button" className={`mx-layer${i === cam ? ' on' : ''}`} aria-pressed={i === cam} onClick={() => setCam(i)} data-testid={`vx-cam-${i}`}>Cam {i + 1}</button>)}
          <span className="mx-layers__k" onPointerDownCapture={() => setHelp('fps')}>format: {V.FPS.map((f) => <button key={f} type="button" className={`mx-tog${r.fps === f ? ' on' : ''}`} aria-pressed={r.fps === f} onClick={() => setRig({ fps: f })} data-testid={`vx-fps-${f}`}>{f}</button>)}</span></div>
        <div className="mx-knobrow">
          <Knob label={`Cam ${cam + 1} shutter`} value={V.SHUTTERS.indexOf(c.shutter)} min={0} max={V.SHUTTERS.length - 1} onChange={(v) => setCamP(cam, { shutter: V.SHUTTERS[v]! })} fmt={(v) => `1/${V.SHUTTERS[v]}`} color="#f59e0b" onHelp={() => setHelp('shutter')} testId="vx-shutter" />
          <Knob label={`Cam ${cam + 1} iris`} value={V.STOPS.indexOf(c.f)} min={0} max={V.STOPS.length - 1} onChange={(v) => setCamP(cam, { f: V.STOPS[v]! })} fmt={(v) => `f/${V.STOPS[v]}`} color="#38bdf8" onHelp={() => setHelp('iris')} testId="vx-iris" />
          <Knob label={`Cam ${cam + 1} ISO`} value={V.ISOS.indexOf(c.iso)} min={0} max={V.ISOS.length - 1} onChange={(v) => setCamP(cam, { iso: V.ISOS[v]! })} fmt={(v) => `ISO ${V.ISOS[v]}`} color="#f472b6" onHelp={() => setHelp('iso')} testId="vx-iso" />
          <Knob label={`Cam ${cam + 1} ND`} value={c.nd} min={0} max={6} step={2} onChange={(v) => setCamP(cam, { nd: v })} fmt={(v) => (v ? `ND ${v} st` : 'clear')} color="#94a3b8" onHelp={() => setHelp('nd')} />
          <Knob label={`Cam ${cam + 1} white balance`} value={c.wb} min={2700} max={7500} step={100} onChange={(v) => setCamP(cam, { wb: v })} fmt={(v) => `${v} K`} color={`rgb(${kelvinRgb(c.wb).join(',')})`} onHelp={() => setHelp('wb')} testId="vx-wb" />
          <Knob label="Stream audio delay" value={r.audioDelay} min={0} max={200} onChange={(v) => setRig({ audioDelay: v })} fmt={(v) => `${v} ms`} color="#22c55e" onHelp={() => setHelp('sync')} testId="vx-delay" />
        </div></div></div>
      <ul className="mx-goals" data-testid="vx-goals">{gs.map((g) => <li key={g.key} className={g.ok ? 'ok' : 'no'} data-goal={g.key} data-ok={g.ok}><b>{g.ok ? '✓' : '✕'} {g.label}</b><span>{g.value}</span><small>{g.why}</small></li>)}</ul></div>
    <div className="mx-two">
      <section className="mx-calc" data-testid="vx-calc"><h3>The formulas, with your numbers</h3><dl>
        <div><dt>LED wall banding <code>refreshes per exposure = Hz × t</code></dt><dd>{V.WALL_HZ} × 1/{c.shutter} = {Math.round((V.WALL_HZ / c.shutter) * 1000) / 1000}: {V.banded(V.WALL_HZ, c.shutter) ? `the .${String(V.bandFraction(V.WALL_HZ, c.shutter)).split('.')[1] || '0'} is the band` : 'whole, clean'}</dd></div>
        <div><dt>Shutter angle <code>θ = 360° × fps × t</code></dt><dd>360 × {r.fps} / {c.shutter} = {V.angle(r.fps, c.shutter)}°</dd></div>
        <div><dt>Exposure <code>log₂(E·ISO/250) − ND = log₂(N²/t)</code></dt><dd>{V.SHOTS[cam]!.lux} lux at ISO {c.iso}, f/{c.f}, 1/{c.shutter}, ND {c.nd}: {V.evError(c, V.SHOTS[cam]!.lux)} stops</dd></div>
        <div><dt>Lip-sync <code>delay = frames × 1000 / fps</code></dt><dd>{V.VIDEO_FRAMES} × {Math.round(V.frameMs(r.fps) * 10) / 10} ms = {Math.round(V.VIDEO_FRAMES * V.frameMs(r.fps))} ms; set {r.audioDelay} ms ({V.lipSyncError(r) > 0 ? '+' : ''}{V.lipSyncError(r)})</dd></div></dl></section>
      <section className="mx-help" aria-live="polite" data-testid="vx-help"><h3>{HELP[help]![0]}</h3><p>{HELP[help]![1]}</p></section></div>
  </div>;
}

/** A source in the multiview, drawn from its settings: rolling bands, flicker, exposure, colour cast and motion blur. */
function View({ i, r, t, keyOn }: { i: number; r: V.Rig; t: number; keyOn: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const c = cv.current; if (!c) return; const W = 320, H = 180; if (c.width !== W) { c.width = W; c.height = H; } const g = c.getContext('2d'); if (!g) return;
    if (i >= 2) { const grd = g.createLinearGradient(0, 0, W, H); grd.addColorStop(0, i === 2 ? '#1e3a8a' : '#111827'); grd.addColorStop(1, i === 2 ? '#7c3aed' : '#0f172a'); g.fillStyle = grd; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.font = 'bold 18px system-ui'; g.textAlign = 'center';
      g.fillText(i === 2 ? 'Welcome' : 'lyrics (key fill)', W / 2, H / 2); g.font = '12px system-ui'; g.fillText(i === 2 ? 'the service begins at 10:30' : 'line one of the song · line two', W / 2, H / 2 + 22); g.textAlign = 'start'; return; }
    const cam = r.cams[i]!; const s = V.SHOTS[i]!; const ev = V.evError(cam, s.lux); const bright = Math.max(0.15, Math.min(1.6, 2 ** ev * 0.75));
    const [wr, wg, wb] = kelvinRgb(s.cct); const [cr, cg, cb] = kelvinRgb(cam.wb); const tint = [wr / Math.max(1, cr), wg / Math.max(1, cg), wb / Math.max(1, cb)];
    const col = (r0: number, g0: number, b0: number) => `rgb(${Math.min(255, r0 * bright * tint[0]!)},${Math.min(255, g0 * bright * tint[1]!)},${Math.min(255, b0 * bright * tint[2]!)})`;
    const flick = V.banded(V.MAINS_FLICKER, cam.shutter) ? 0.85 + 0.15 * Math.sin(t * 14) : 1;
    g.fillStyle = col(28 * flick, 30 * flick, 40 * flick); g.fillRect(0, 0, W, H);
    const wx = i === 0 ? 60 : 0, ww = i === 0 ? 200 : W, wy = i === 0 ? 20 : 0, wh = i === 0 ? 90 : 110; const wgr = g.createLinearGradient(wx, 0, wx + ww, 0); wgr.addColorStop(0, '#2563eb'); wgr.addColorStop(1, '#9333ea'); g.fillStyle = wgr; g.fillRect(wx, wy, ww, wh);
    if (V.banded(V.WALL_HZ, cam.shutter)) { const f = V.bandFraction(V.WALL_HZ, cam.shutter); const n = 3; for (let k = 0; k < n; k++) { const y = wy + (((t * 40 * f + (k * wh) / n) % wh) + wh) % wh; g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(wx, y, ww, wh * 0.08 * (1 - Math.abs(f - 0.5))); } }
    const px = i === 0 ? W / 2 : W / 2, sc = i === 0 ? 1 : 2.6, base = H - 8; g.fillStyle = col(170, 140, 120); g.beginPath(); g.arc(px, base - 70 * sc / 1.4, 11 * sc / 1.3, 0, Math.PI * 2); g.fill(); g.fillStyle = col(40, 50, 80); g.fillRect(px - 16 * sc / 1.3, base - 58 * sc / 1.4, 32 * sc / 1.3, 70 * sc);
    const blur = Math.min(6, 360 / cam.shutter); const hx = px + 22 * sc / 1.3 + Math.sin(t * 6) * 10 * sc / 2; for (let k = 0; k < Math.max(1, Math.round(blur)); k++) { g.fillStyle = col(170, 140, 120).replace('rgb', 'rgba').replace(')', `,${1 / Math.max(1, blur) + 0.1})`); g.beginPath(); g.arc(hx - k * 2.2, base - 64 * sc / 1.4, 5 * sc / 1.3, 0, Math.PI * 2); g.fill(); }
    if (ev > 0.5) { g.strokeStyle = 'rgba(255,255,255,.7)'; for (let k = -H; k < W; k += 8) { g.beginPath(); g.moveTo(k + ((t * 30) % 8), 0); g.lineTo(k + H + ((t * 30) % 8), H); g.stroke(); } }
    if (ev < -1) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, W, H); }
    if (keyOn) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, H - 40, W, 40); g.fillStyle = '#fff'; g.font = 'bold 14px system-ui'; g.fillText('line one of the song · line two', 12, H - 16); }
    g.fillStyle = '#fff'; g.font = '11px system-ui'; g.fillText(`${r.fps} · 1/${cam.shutter} · f/${cam.f} · ISO ${cam.iso} · ${cam.wb}K`, 6, 14);
  }, [i, r, t, keyOn]);
  return <canvas ref={cv} data-testid={`vx-view-${i}`} aria-hidden="true" />;
}
