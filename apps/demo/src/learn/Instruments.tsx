/**
 * The three instrument labs of Empathia Learn (V2.5.3 #/learn/labs/hear, /see, /light), each with a fault to fix and a check the page
 * can state exactly:
 *  - Audio Lab: real Web Audio processing of synthesized sources (no recordings, no microphone): input gain, high-pass, four EQ bands,
 *    a limiter before the volume, live meters. Sound starts only when a source is pressed; the default volume is low.
 *  - Camera Lab: a drawn scene that answers shutter, frame rate, gain, iris and white balance (an illustration of the physics, not a
 *    lens model).
 *  - Lighting Lab: three fixtures around a presenter; illuminance from the inverse-square and cosine laws, DMX values, colour
 *    temperature (modeled, not measured).
 */
import { useEffect, useMemo, useRef, useState } from 'react';

export interface Check { label: string; ok: boolean; now: string }
export const fmt = (n: number, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d);
const dB = (x: number) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
function Range({ label, value, min, max, step, unit, onChange, id }: { label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void; id: string }) {
  return <label className="ops-field">{label} <b>{value}{unit || ''}</b><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} data-testid={id} aria-valuetext={`${value}${unit || ''}`} /></label>;
}
export function Checks({ checks }: { checks: Check[] }) {
  return <ul className="ops-list" data-testid="lab-checks" aria-live="polite">{checks.map((c) => <li key={c.label} className={c.ok ? 'ops-ok' : 'ops-fail'}><b>{c.label}</b> <span className="ops-meta">now {c.now}</span></li>)}</ul>;
}

// ------------------------------------------------------------------------------------------------ Audio Lab
export interface AudioState { inGain: number; hpfOn: boolean; hpf: number; bands: number[]; outGain: number; volume: number; bypass: boolean }
export const AUDIO_BANDS = [['Low', 120], ['Body', 500], ['Presence', 3000], ['Air', 10000]] as const;
export const AUDIO_DEFAULT: AudioState = { inGain: 0, hpfOn: false, hpf: 40, bands: [4, 2, -3, 0], outGain: 3, volume: 0.2, bypass: false };
export function audioChecks(s: AudioState): Check[] {
  return [
    { label: 'High-pass in, between 80 and 120 Hz (removes the rumble)', ok: s.hpfOn && s.hpf >= 80 && s.hpf <= 120, now: s.hpfOn ? `${s.hpf} Hz` : 'bypassed' },
    { label: 'Low band cut or flat (0 dB or less)', ok: s.bands[0]! <= 0, now: `${s.bands[0]} dB` },
    { label: 'Presence (3 kHz) raised +3 to +6 dB (consonants come forward)', ok: s.bands[2]! >= 3 && s.bands[2]! <= 6, now: `${s.bands[2]} dB` },
    { label: 'Output gain at or under 0 dB (no surprise for the far end)', ok: s.outGain <= 0, now: `${s.outGain} dB` },
    { label: 'Processing in (not bypassed)', ok: !s.bypass, now: s.bypass ? 'bypassed' : 'in' },
  ];
}
export function AudioLab({ onState }: { onState: (checks: Check[]) => void }) {
  const [s, setS] = useState<AudioState>(AUDIO_DEFAULT); const [playing, setPlaying] = useState<string | null>(null); const [meter, setMeter] = useState({ rms: -Infinity, peak: -Infinity, gr: 0 });
  const g = useRef<{ ctx: AudioContext; src: AudioNode & { stop?: () => void }; nodes: { inG: GainNode; hpf: BiquadFilterNode; eq: BiquadFilterNode[]; lim: DynamicsCompressorNode; outG: GainNode; vol: GainNode; an: AnalyserNode; dry: GainNode; wet: GainNode } } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const checks = useMemo(() => audioChecks(s), [s]); useEffect(() => onState(checks), [checks]);   // eslint-disable-line react-hooks/exhaustive-deps
  const lin = (d: number) => 10 ** (d / 20);
  useEffect(() => { const n = g.current?.nodes; if (!n) return; const t = g.current!.ctx.currentTime;
    n.inG.gain.setTargetAtTime(lin(s.inGain), t, 0.02); n.hpf.frequency.setTargetAtTime(s.hpfOn ? s.hpf : 10, t, 0.02);
    n.eq.forEach((f, i) => f.gain.setTargetAtTime(s.bands[i]!, t, 0.02)); n.outG.gain.setTargetAtTime(lin(s.outGain), t, 0.02); n.vol.gain.setTargetAtTime(s.volume, t, 0.02);
    n.dry.gain.setTargetAtTime(s.bypass ? 1 : 0, t, 0.02); n.wet.gain.setTargetAtTime(s.bypass ? 0 : 1, t, 0.02); }, [s]);
  const stop = () => { try { g.current?.src.stop?.(); g.current?.ctx.close(); } catch { /* already stopped */ } g.current = null; setPlaying(null); };
  useEffect(() => stop, []);
  const play = (kind: string) => {
    stop(); const AC = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext); if (!AC) return;
    const ctx = new AC(); let src: AudioNode & { stop?: () => void };
    if (kind === 'noise') { const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = b.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048; d[i] = (b0 + b1 + b2 + w * 0.02) * 0.6; } const n = ctx.createBufferSource(); n.buffer = b; n.loop = true; n.start(); src = n; }
    else { const o = ctx.createOscillator(); o.type = kind === 'voice' ? 'sawtooth' : 'sine'; o.frequency.value = kind === 'voice' ? 140 : 1000; if (kind === 'voice') { const lfo = ctx.createOscillator(); lfo.frequency.value = 3.2; const lg = ctx.createGain(); lg.gain.value = 18; lfo.connect(lg).connect(o.frequency); lfo.start(); } o.start(); src = o; }
    const rumble = ctx.createOscillator(); rumble.frequency.value = 45; const rg = ctx.createGain(); rg.gain.value = 0.25; rumble.connect(rg); rumble.start();   // the fault: building rumble on the input
    const inG = ctx.createGain(); const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass';
    const eq = AUDIO_BANDS.map(([, f], i) => { const b = ctx.createBiquadFilter(); b.type = i === 0 ? 'lowshelf' : i === 3 ? 'highshelf' : 'peaking'; b.frequency.value = f; b.Q.value = 1; return b; });
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -3; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.1;
    const outG = ctx.createGain(); const vol = ctx.createGain(); const an = ctx.createAnalyser(); an.fftSize = 2048; const dry = ctx.createGain(); const wet = ctx.createGain();
    src.connect(inG); rg.connect(inG); inG.connect(dry); inG.connect(hpf); let last: AudioNode = hpf; for (const b of eq) { last.connect(b); last = b; } last.connect(lim); lim.connect(outG); outG.connect(wet);
    dry.connect(an); wet.connect(an); an.connect(vol); vol.connect(ctx.destination);
    g.current = { ctx, src, nodes: { inG, hpf, eq, lim, outG, vol, an, dry, wet } }; setPlaying(kind); setS((x) => ({ ...x }));
  };
  useEffect(() => {
    if (!playing) return; let raf = 0; const buf = new Float32Array(2048); const fbuf = new Uint8Array(1024);
    const tick = () => { const n = g.current?.nodes; if (!n) return; n.an.getFloatTimeDomainData(buf); let sum = 0, pk = 0; for (const v of buf) { sum += v * v; pk = Math.max(pk, Math.abs(v)); }
      setMeter({ rms: dB(Math.sqrt(sum / buf.length)), peak: dB(pk), gr: n.lim.reduction });
      const c = canvas.current?.getContext('2d'); if (c) { n.an.getByteFrequencyData(fbuf); c.fillStyle = '#0b0f16'; c.fillRect(0, 0, 640, 180); c.fillStyle = '#45cfc1'; for (let i = 0; i < 320; i++) { const v = fbuf[Math.floor((i / 320) ** 2 * 1023)]! / 255; c.fillRect(i * 2, 180 - v * 170, 2, v * 170); } }
      raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [playing]);
  const set = (k: keyof AudioState, v: unknown) => setS((x) => ({ ...x, [k]: v }));
  return (
    <div className="ops-grid ops-grid--2b">
      <div className="ops-card">
        <div className="ops-row" role="group" aria-label="Source">{[['voice', 'Voice-like source'], ['noise', 'Pink noise'], ['tone', '1 kHz tone']].map(([k, l]) => <button key={k} type="button" className={`ui-btn${playing === k ? ' ui-btn--primary' : ''}`} aria-pressed={playing === k} onClick={() => play(k!)} data-testid={`al-${k}`}>{l}</button>)}
          <button type="button" className="ui-btn ui-btn--quiet" onClick={stop} disabled={!playing} data-testid="al-stop">Stop</button></div>
        <p className="ops-note" role="status">{playing ? `Playing the ${playing === 'voice' ? 'voice-like source' : playing === 'noise' ? 'pink noise' : '1 kHz tone'} with 45 Hz building rumble on the input.` : 'Nothing is playing. Sound starts only when you press a source; the volume starts low.'}</p>
        <div className="ops-stage"><canvas ref={canvas} width={640} height={180} role="img" aria-label="Spectrum of the output" style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
        <p className="ops-meta" data-testid="al-meter">Output RMS {Number.isFinite(meter.rms) ? fmt(meter.rms) : '—'} dBFS · peak {Number.isFinite(meter.peak) ? fmt(meter.peak) : '—'} dBFS · limiter {fmt(meter.gr)} dB</p>
        <div className="ops-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))' }}>{AUDIO_BANDS.map(([n, f], i) => <Range key={n} id={`al-band-${i}`} label={`${n} (${f >= 1000 ? `${f / 1000} kHz` : `${f} Hz`})`} unit=" dB" value={s.bands[i]!} min={-12} max={12} step={0.5} onChange={(v) => set('bands', s.bands.map((b, j) => (j === i ? v : b)))} />)}</div>
      </div>
      <div className="ops-card"><h3>Gain structure</h3>
        <Range id="al-in" label="Input gain" unit=" dB" value={s.inGain} min={-24} max={12} step={0.5} onChange={(v) => set('inGain', v)} />
        <label className="check"><input type="checkbox" checked={s.hpfOn} onChange={(e) => set('hpfOn', e.target.checked)} data-testid="al-hpf-on" /> High-pass in</label>
        <Range id="al-hpf" label="High-pass frequency" unit=" Hz" value={s.hpf} min={20} max={400} step={5} onChange={(v) => set('hpf', v)} />
        <Range id="al-out" label="Output gain (after the limiter)" unit=" dB" value={s.outGain} min={-30} max={6} step={0.5} onChange={(v) => set('outGain', v)} />
        <Range id="al-vol" label="Volume (your speakers)" value={Math.round(s.volume * 100)} unit="%" min={0} max={100} step={2} onChange={(v) => set('volume', v / 100)} />
        <label className="check"><input type="checkbox" checked={s.bypass} onChange={(e) => set('bypass', e.target.checked)} /> A/B: bypass all processing</label>
        <button type="button" className="ui-btn ui-btn--quiet" onClick={() => setS(AUDIO_DEFAULT)}>Reset the controls</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Camera Lab
export interface CameraState { shutter: number; fps: number; gain: number; iris: number; wb: number }
export const CAMERA_DEFAULT: CameraState = { shutter: 50, fps: 30, gain: 18, iris: 4, wb: 5600 };
export const ROOM_CCT = 4000; export const MAINS_HZ = 60;
/** Exposure relative to the correct one: brighter with a slower shutter, a wider iris and more gain. */
export function cameraModel(s: CameraState) {
  const ev = Math.log2(120 / s.shutter) + 2 * Math.log2(2.8 / s.iris) + s.gain / 6 - 1;   // 0 = correct for this scene
  const blurPx = (1.2 / s.shutter) * 160;   // a hand moving 1.2 m/s across a 160 px-per-metre frame
  const flicker = !(Number.isInteger((2 * MAINS_HZ) / s.shutter) || s.shutter <= 2 * MAINS_HZ && Number.isInteger(s.shutter / MAINS_HZ));
  const noise = s.gain; const wbErr = Math.abs(s.wb - ROOM_CCT); const legal = s.shutter >= s.fps;
  return { ev, blurPx, flicker, noise, wbErr, legal };
}
export function cameraChecks(s: CameraState): Check[] {
  const m = cameraModel(s);
  return [
    { label: `No banding under ${MAINS_HZ} Hz lighting (shutter in step with the mains)`, ok: !m.flicker, now: `1/${s.shutter} s` },
    { label: 'Motion blur on the moving hand under 3 px', ok: m.blurPx < 3, now: `${fmt(m.blurPx)} px` },
    { label: 'Exposure within ±0.5 EV of correct', ok: Math.abs(m.ev) <= 0.5, now: `${m.ev >= 0 ? '+' : ''}${fmt(m.ev)} EV` },
    { label: 'Gain at or under 12 dB (noise stays out of faces)', ok: s.gain <= 12, now: `${s.gain} dB` },
    { label: `White balance within 300 K of the room (${ROOM_CCT} K)`, ok: m.wbErr <= 300, now: `${s.wb} K` },
    { label: 'Shutter at least as fast as the frame rate', ok: m.legal, now: `1/${s.shutter} s at ${s.fps} fps` },
  ];
}
export function CameraLab({ onState }: { onState: (checks: Check[]) => void }) {
  const [s, setS] = useState<CameraState>(CAMERA_DEFAULT); const cv = useRef<HTMLCanvasElement>(null); const m = cameraModel(s);
  const checks = useMemo(() => cameraChecks(s), [s]); useEffect(() => onState(checks), [checks]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const c = cv.current?.getContext('2d'); if (!c) return; const W = 640, H = 360; const bright = Math.max(0.15, Math.min(1.6, 2 ** m.ev));
    const tint = s.wb - ROOM_CCT; const r = Math.min(255, 150 * bright * (1 - tint / 9000)), b = Math.min(255, 150 * bright * (1 + tint / 9000)), gg = Math.min(255, 150 * bright);
    c.fillStyle = `rgb(${r * 0.5},${gg * 0.5},${b * 0.5})`; c.fillRect(0, 0, W, H);
    c.fillStyle = `rgb(${r * 0.3},${gg * 0.35},${b * 0.45})`; c.fillRect(380, 60, 220, 130);   // the display at five metres
    c.fillStyle = `rgb(${r},${gg * 0.85},${b * 0.75})`; c.beginPath(); c.arc(220, 140, 46, 0, Math.PI * 2); c.fill(); c.fillRect(170, 190, 100, 170);   // the presenter
    const n = Math.max(1, Math.round(m.blurPx / 2)); c.globalAlpha = 1 / n; for (let k = 0; k < n; k++) { c.fillStyle = `rgb(${r},${gg * 0.85},${b * 0.75})`; c.fillRect(290 + k * 2, 200, 26, 26); } c.globalAlpha = 1;   // the moving hand
    if (m.flicker) { c.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 0; y < H; y += 24) c.fillRect(0, y, W, 9); }
    if (s.gain > 0) { c.fillStyle = 'rgba(255,255,255,0.12)'; for (let k = 0; k < s.gain * 60; k++) c.fillRect((k * 7919) % W, (k * 104729) % H, 1, 1); }
  }, [s]);   // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof CameraState, v: number) => setS((x) => ({ ...x, [k]: v }));
  return (
    <div className="ops-grid ops-grid--2b">
      <div className="ops-card"><div className="ops-stage"><canvas ref={cv} width={640} height={360} role="img" aria-label={`Simulated picture: exposure ${fmt(m.ev)} EV, blur ${fmt(m.blurPx)} px, ${m.flicker ? 'banding visible' : 'no banding'}, gain ${s.gain} dB`} style={{ width: '100%', height: 'auto', display: 'block' }} /></div>
        <p className="ops-meta">A drawn scene: a presenter at three metres, a display at five, a hand moving. An illustration of the physics, not a lens model.</p></div>
      <div className="ops-card"><h3>Camera</h3>
        <label className="ops-field">Shutter <select value={s.shutter} onChange={(e) => set('shutter', Number(e.target.value))} data-testid="cl-shutter">{[25, 30, 50, 60, 100, 120, 250, 500, 1000].map((v) => <option key={v} value={v}>1/{v} s</option>)}</select></label>
        <label className="ops-field">Frame rate <select value={s.fps} onChange={(e) => set('fps', Number(e.target.value))} data-testid="cl-fps">{[25, 30, 50, 60].map((v) => <option key={v} value={v}>{v} fps</option>)}</select></label>
        <Range id="cl-gain" label="Gain" unit=" dB" value={s.gain} min={0} max={24} step={1} onChange={(v) => set('gain', v)} />
        <label className="ops-field">Iris <select value={s.iris} onChange={(e) => set('iris', Number(e.target.value))} data-testid="cl-iris">{[1.4, 2, 2.8, 4, 5.6, 8].map((v) => <option key={v} value={v}>f/{v}</option>)}</select></label>
        <Range id="cl-wb" label="White balance" unit=" K" value={s.wb} min={2700} max={6500} step={100} onChange={(v) => set('wb', v)} />
        <button type="button" className="ui-btn ui-btn--quiet" onClick={() => setS(CAMERA_DEFAULT)}>Reset the controls</button></div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Lighting Lab
export interface Fixture { id: string; name: string; dmx: number; dist: number; angle: number; cct: number }
export const MAX_CD = 6000;   // candela at DMX 255
export const LIGHT_DEFAULT: Fixture[] = [{ id: 'key', name: 'Key light', dmx: 255, dist: 2.0, angle: 30, cct: 5600 }, { id: 'fill', name: 'Fill light', dmx: 255, dist: 2.0, angle: 45, cct: 3200 }, { id: 'back', name: 'Back light', dmx: 128, dist: 2.5, angle: 60, cct: 5600 }];
/** Vertical illuminance on the face: E = I · cos θ / d² (I from the DMX level), modeled, not measured; the back light lights the shoulders, not the face. */
export function lightModel(f: Fixture[]) {
  const lux = (x: Fixture) => ((MAX_CD * x.dmx) / 255) * Math.cos((x.angle * Math.PI) / 180) / (x.dist * x.dist);
  const key = f.find((x) => x.id === 'key')!, fill = f.find((x) => x.id === 'fill')!;
  const face = lux(key) + lux(fill); const ratio = lux(fill) > 0 ? lux(key) / lux(fill) : Infinity;
  const spill = f.reduce((a, x) => a + lux(x) * 0.12, 0);   // what reaches the display behind
  const ccts = f.filter((x) => x.dmx > 0).map((x) => x.cct); const spread = ccts.length ? Math.max(...ccts) - Math.min(...ccts) : 0;
  return { face, ratio, spill, spread, each: Object.fromEntries(f.map((x) => [x.id, lux(x)])) };
}
export function lightChecks(f: Fixture[]): Check[] {
  const m = lightModel(f);
  return [
    { label: 'Face lit to 500–800 lux (vertical)', ok: m.face >= 500 && m.face <= 800, now: `${Math.round(m.face)} lux` },
    { label: 'Key-to-fill ratio between 1.5 and 3 (shape without hard shadows)', ok: m.ratio >= 1.5 && m.ratio <= 3, now: Number.isFinite(m.ratio) ? fmt(m.ratio) : 'no fill' },
    { label: 'Fixtures within 300 K of each other (one colour on the face)', ok: m.spread <= 300, now: `${m.spread} K apart` },
    { label: 'Spill on the display behind under 150 lux', ok: m.spill < 150, now: `${Math.round(m.spill)} lux` },
  ];
}
export function LightLab({ onState }: { onState: (checks: Check[]) => void }) {
  const [f, setF] = useState<Fixture[]>(LIGHT_DEFAULT); const [sel, setSel] = useState('key'); const m = lightModel(f); const x = f.find((y) => y.id === sel)!;
  const checks = useMemo(() => lightChecks(f), [f]); useEffect(() => onState(checks), [checks]);   // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof Fixture, v: number) => setF((all) => all.map((y) => (y.id === sel ? { ...y, [k]: v } : y)));
  const S = 70, cx = 200, cy = 170;
  return (
    <div className="ops-grid ops-grid--2b">
      <div className="ops-card"><div className="ops-stage"><svg viewBox="0 0 400 260" role="img" aria-label={`Plan: presenter lit to ${Math.round(m.face)} lux, key to fill ${Number.isFinite(m.ratio) ? fmt(m.ratio) : 'no fill'}`}>
        <rect x="120" y="20" width="160" height="16" fill="#26324a" /><text x="200" y="14" fill="#e8eef7" fontSize="10" textAnchor="middle">display behind · {Math.round(m.spill)} lux spill</text>
        <circle cx={cx} cy={cy} r="14" fill="#d9b48f" /><text x={cx} y={cy + 30} fill="#e8eef7" fontSize="10" textAnchor="middle">face {Math.round(m.face)} lux</text>
        {f.map((y, i) => { const a = ((y.angle * (i === 1 ? -1 : 1)) * Math.PI) / 180 + (y.id === 'back' ? Math.PI : 0); const px = cx + Math.sin(a) * y.dist * S, py = cy + Math.cos(a) * y.dist * S * (y.id === 'back' ? 1 : -1) * -1; return <g key={y.id}><line x1={px} y1={py} x2={cx} y2={cy} stroke={`rgba(255,${200 + (y.cct - 3200) / 20},${120 + (y.cct - 3200) / 12},${0.2 + y.dmx / 400})`} strokeWidth="6" /><circle cx={px} cy={py} r={sel === y.id ? 10 : 7} fill="#f5d36b" stroke={sel === y.id ? '#fff' : 'none'} strokeWidth="2" /><text x={px} y={py - 12} fill="#e8eef7" fontSize="10" textAnchor="middle">{y.name}</text></g>; })}
      </svg></div>
        <div className="ops-table-wrap"><table className="ops-table"><caption className="ui-sr">DMX channels</caption><thead><tr><th scope="col">Fixture</th><th scope="col">Ch</th><th scope="col">DMX</th><th scope="col">On the face</th></tr></thead>
          <tbody>{f.map((y, i) => <tr key={y.id}><td>{y.name}</td><td>{i * 2 + 1}–{i * 2 + 2}</td><td>{y.dmx} · {y.cct} K</td><td>{y.id === 'back' ? 'shoulders, not the face' : `${Math.round(m.each[y.id]!)} lux`}</td></tr>)}</tbody></table></div></div>
      <div className="ops-card"><h3>Fixture</h3>
        <div className="ops-row" role="group" aria-label="Choose a fixture">{f.map((y) => <button key={y.id} type="button" className={`ui-btn${sel === y.id ? ' ui-btn--primary' : ''}`} aria-pressed={sel === y.id} onClick={() => setSel(y.id)} data-testid={`ll-${y.id}`}>{y.name}</button>)}</div>
        <Range id="ll-dmx" label="Intensity (DMX)" value={x.dmx} min={0} max={255} step={1} onChange={(v) => set('dmx', v)} />
        <Range id="ll-dist" label="Distance to the face" unit=" m" value={x.dist} min={1} max={5} step={0.1} onChange={(v) => set('dist', v)} />
        <Range id="ll-angle" label="Angle off the face" unit="°" value={x.angle} min={0} max={80} step={1} onChange={(v) => set('angle', v)} />
        <Range id="ll-cct" label="Colour temperature" unit=" K" value={x.cct} min={2700} max={6500} step={100} onChange={(v) => set('cct', v)} />
        <button type="button" className="ui-btn ui-btn--quiet" onClick={() => setF(LIGHT_DEFAULT)}>Reset the fixtures</button></div>
    </div>
  );
}
