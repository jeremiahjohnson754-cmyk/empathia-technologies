/**
 * The bench — HEAR IT, SEE IT: the reference's six demos (demos.js) before you touch a live room: the ear and the threshold of hearing,
 * EQ and the analyser (with live pink noise), compression (the transfer curve and the gain over two seconds), shutter, frame rate and
 * flicker (a rolling-shutter frame), beams and fixture types, colour temperature and mixing. Illustrative models (FB-05). The drawings
 * are dark stages in either theme, drawn with SVG attributes only; sound starts only from a button, quietly. Restored 12 Nov 2026.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from './components.js';
import { biq, fmtHz, REGIONS, THIRDS, regionOf, round } from './challenges/core.js';

const REG_C: Record<string, string> = { 'SUB-BASS': '#7C3AED', BASS: '#2563EB', 'LOW-MIDS': '#0891B2', MIDS: '#16A34A', 'UPPER-MIDS': '#CA8A04', PRESENCE: '#EA580C', BRILLIANCE: '#DC2626' };
const REG_FEEL: Record<string, string> = { 'SUB-BASS': 'felt more than heard · rumble, room modes', BASS: 'weight and warmth · kick and bass fundamentals', 'LOW-MIDS': 'body — or mud when it piles up', MIDS: 'the core of voices and instruments · honk if overdone', 'UPPER-MIDS': 'the ear is most sensitive here · clarity or harshness', PRESENCE: 'consonants and attack · where sibilance starts', BRILLIANCE: 'air and sparkle · cymbals, breath' };
const logX = (f: number, x0: number, x1: number) => x0 + ((Math.log10(f) - Math.log10(20)) / 3) * (x1 - x0);
const T = ({ x, y, s, size = 15, fill = '#CBD5E1', anchor = 'start', weight = 700 }: { x: number; y: number; s: ReactNode; size?: number; fill?: string; anchor?: 'start' | 'middle' | 'end'; weight?: number }) => <text x={x} y={y} fontSize={size} fontWeight={weight} fill={fill} textAnchor={anchor}>{s}</text>;
const Stage = ({ w, h, label, children }: { w: number; h: number; label: string; children: ReactNode }) => <div className="lab__svgwrap bench__stage"><svg className="ch__svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}><rect width={w} height={h} fill="#0B1220" />{children}</svg></div>;
const Read = ({ rows }: { rows: Array<[string, string]> }) => <dl className="ch__read" aria-live="polite">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
function Slider({ label, v, min, max, step, unit, log, set }: { label: string; v: number; min: number; max: number; step: number; unit?: string; log?: boolean; set: (v: number) => void }) {
  const toR = (x: number) => (log ? ((Math.log10(x) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))) * 1000 : ((x - min) / (max - min)) * 1000);
  const fromR = (r: number) => { const x = log ? 10 ** (Math.log10(min) + (r / 1000) * (Math.log10(max) - Math.log10(min))) : min + (r / 1000) * (max - min); return round(Math.round(x / step) * step, 4); };
  return <label className="ch__field"><span>{label}{unit ? ` (${unit})` : ''}</span><input type="range" min={0} max={1000} step={1} value={toR(v)} aria-valuetext={`${v}${unit ? ` ${unit}` : ''}`} onChange={(e) => set(fromR(Number(e.target.value)))} /><b className="ch__v">{v}{unit ? ` ${unit}` : ''}</b></label>;
}
function useAudio() { const ac = useRef<AudioContext | null>(null); useEffect(() => () => { void ac.current?.close(); }, []);
  return () => { try { const AC = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext; if (!AC) return null; ac.current = ac.current || new AC(); if (ac.current.state === 'suspended') void ac.current.resume(); return ac.current; } catch { return null; } }; }

// ------------------------------------------------------------------------------------------------------------ 1 · the ear
const thr = (f: number) => { const k = f / 1000; return 3.64 * k ** -0.8 - 6.5 * Math.exp(-0.6 * (k - 3.3) ** 2) + 1e-3 * k ** 4; };   // Terhardt (1979), young listener
function Ear() {
  const [f, setF] = useState(1000), [lvl, setLvl] = useState(60), audio = useAudio(), osc = useRef<OscillatorNode | null>(null), [on, setOn] = useState(false);
  useEffect(() => { if (osc.current) osc.current.frequency.setTargetAtTime(f, osc.current.context.currentTime, 0.02); }, [f]);
  useEffect(() => () => { try { osc.current?.stop(); } catch { /* stopped */ } }, []);
  const x0 = 70, x1 = 780, y0 = 30, y1 = 300, Y = (d: number) => y1 - ((d + 10) / 130) * (y1 - y0), heard = lvl > thr(f), px = logX(f, x0, x1);
  const d = Array.from({ length: 201 }, (_x, i) => { const q = 10 ** (Math.log10(20) + (i / 200) * 3); return `${i ? 'L' : 'M'}${round(logX(q, x0, x1), 1)} ${round(Y(Math.min(120, thr(q))), 1)}`; }).join('');
  const toggle = () => { if (osc.current) { try { osc.current.stop(); } catch { /* */ } osc.current = null; setOn(false); return; } const ac = audio(); if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(); g.gain.value = 0.04; o.frequency.value = f; o.connect(g); g.connect(ac.destination); o.start(); osc.current = o; setOn(true); };
  return <>
    <Stage w={800} h={360} label="Hearing range: the approximate threshold of hearing across frequency, the audible regions in colour, and a marker for the tone you choose.">
      {REGIONS.map((r, i) => { const a = logX(r.lo, x0, x1), b = logX(r.hi, x0, x1); return <g key={r.name}><rect x={a} y={y0} width={b - a} height={y1 - y0} fill={REG_C[r.name]} opacity={0.16} /><T x={(a + b) / 2} y={y0 + (i % 2 ? 32 : 14)} s={r.name} size={12} fill={REG_C[r.name]} anchor="middle" weight={800} /></g>; })}
      {[0, 20, 40, 60, 80, 100, 120].map((v) => <g key={v}><line x1={x0} x2={x1} y1={Y(v)} y2={Y(v)} stroke="#1F2A3D" /><T x={x0 - 8} y={Y(v) + 5} s={v} size={13} fill="#94A3B8" anchor="end" /></g>)}
      {[20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].map((q) => <T key={q} x={logX(q, x0, x1)} y={y1 + 22} s={fmtHz(q)} size={13} fill="#94A3B8" anchor="middle" />)}
      <path d={d} fill="none" stroke="#F4F1E8" strokeWidth={3} /><T x={logX(40, x0, x1)} y={Y(62)} s="threshold of hearing" size={14} fill="#F4F1E8" weight={800} />
      <rect x={logX(2000, x0, x1)} y={Y(-4)} width={logX(5000, x0, x1) - logX(2000, x0, x1)} height={8} fill="#FBBF24" /><T x={logX(2000, x0, x1)} y={Y(18)} s="most sensitive · ear-canal resonance ↓" size={13} fill="#FDE68A" anchor="middle" />
      <rect x={logX(300, x0, x1)} y={Y(86)} width={logX(3400, x0, x1) - logX(300, x0, x1)} height={8} fill="#34D399" opacity={0.8} /><T x={logX(1000, x0, x1)} y={Y(86) - 6} s="telephone band 300 Hz–3.4 kHz: speech stays understandable" size={13} fill="#6EE7B7" anchor="middle" />
      <line x1={px} x2={px} y1={y0} y2={y1} stroke={heard ? '#22D3EE' : '#F87171'} strokeWidth={2} strokeDasharray="5 4" /><circle cx={px} cy={Y(lvl)} r={9} fill={heard ? '#22D3EE' : '#F87171'} stroke="#05070C" strokeWidth={2} />
      <T x={12} y={352} s="dB SPL (vertical) · Hz, log scale (horizontal) · APPROXIMATE, young adult — hearing varies (FB-05)" size={12} fill="#94A3B8" />
    </Stage>
    <Read rows={[['frequency', `${round(f, 0)} Hz`], ['wavelength λ = 343 ÷ f', `${round(343 / f, 3)} m`], ['region', `${regionOf(f).name} — ${REG_FEEL[regionOf(f).name]}`], ['threshold here', `${round(thr(f), 1)} dB SPL`], ['your tone', `${lvl} dB SPL · ${heard ? 'audible' : 'below threshold — silent to this ear'}`]]} />
    <div className="ch__ctl"><Slider label="Frequency" v={f} min={20} max={20000} step={1} unit="Hz" log set={setF} /><Slider label="Tone level on the chart" v={lvl} min={-10} max={120} step={1} unit="dB SPL" set={setLvl} /></div>
    <p><Button onClick={toggle}>{on ? '■ Stop' : '🔊 Play the tone (quiet)'}</Button></p>
    <p className="ui-meta">The chart level is a label, not your playback level — the button plays a quiet tone at whatever volume your device is set to. Phone and laptop speakers can’t reproduce much below 100–150 Hz, so the lowest tones may be silent even though your ears could hear them. Protect your hearing: keep it quiet.</p>
  </>;
}

// ------------------------------------------------------------------------------------------------------------ 2 · EQ and the analyser
const psum = (a: number, b: number) => 10 * Math.log10(10 ** (a / 10) + 10 ** (b / 10)); const l2 = (x: number) => Math.log(x) / Math.LN2;
const SOURCES: Record<string, { name: string; f: (f: number) => number }> = {
  pink: { name: 'Pink noise (equal energy per ⅓ octave)', f: () => 0 },
  vocal: { name: 'A voice (illustrative spectrum)', f: (f) => -1.5 * l2(f / 400) ** 2 + 3 * Math.exp(-2 * l2(f / 3000) ** 2) - (f < 100 ? 12 * l2(100 / f) : 0) },
  kick: { name: 'A kick drum (illustrative)', f: (f) => psum(6 - 3 * l2(f / 60) ** 2, -6 - 3 * l2(f / 3500) ** 2) },
  ring: { name: 'A mic starting to ring at 2.5 kHz', f: (f) => -(l2(f / 800) ** 2) + 22 * Math.exp(-((l2(f / 2500) * 12) ** 2)) },
};
type EqS = { src: string; hp: number; ls: number; lsf: number; p1f: number; p1g: number; p1q: number; p2f: number; p2g: number; p2q: number; hs: number; hsf: number };
function Eq() {
  const [s, setS] = useState<EqS>({ src: 'vocal', hp: 80, ls: 0, lsf: 120, p1f: 350, p1g: -4, p1q: 1.4, p2f: 3000, p2g: 2, p2q: 1.0, hs: 0, hsf: 8000 }); const set = (k: keyof EqS) => (v: number) => setS({ ...s, [k]: v });
  const audio = useAudio(), live = useRef<{ src: AudioBufferSourceNode; nodes: BiquadFilterNode[]; an: AnalyserNode; raf: number } | null>(null), [bars, setBars] = useState<number[] | null>(null);
  const B = [biq('hp', s.hp, 0, 0.7071), biq('ls', s.lsf, s.ls), biq('peak', s.p1f, s.p1g, s.p1q), biq('peak', s.p2f, s.p2g, s.p2q), biq('hs', s.hsf, s.hs)], eq = (f: number) => B.reduce((t, fn) => t + fn(f), 0);
  useEffect(() => { const L = live.current; if (!L) return; const t = L.an.context.currentTime, [hp, ls, p1, p2, hs] = L.nodes as [BiquadFilterNode, BiquadFilterNode, BiquadFilterNode, BiquadFilterNode, BiquadFilterNode];
    hp.frequency.setTargetAtTime(s.hp, t, 0.02); ls.frequency.setTargetAtTime(s.lsf, t, 0.02); ls.gain.setTargetAtTime(s.ls, t, 0.02); p1.frequency.setTargetAtTime(s.p1f, t, 0.02); p1.gain.setTargetAtTime(s.p1g, t, 0.02); p1.Q.setTargetAtTime(s.p1q, t, 0.02);
    p2.frequency.setTargetAtTime(s.p2f, t, 0.02); p2.gain.setTargetAtTime(s.p2g, t, 0.02); p2.Q.setTargetAtTime(s.p2q, t, 0.02); hs.frequency.setTargetAtTime(s.hsf, t, 0.02); hs.gain.setTargetAtTime(s.hs, t, 0.02); }, [s]);
  const stop = () => { const L = live.current; if (!L) return; try { L.src.stop(); } catch { /* */ } cancelAnimationFrame(L.raf); live.current = null; setBars(null); };
  useEffect(() => () => stop(), []);
  const listen = () => { if (live.current) { stop(); return; } const ac = audio(); if (!ac) return;
    const n = ac.sampleRate * 4, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, seed = 99;   // Paul Kellet's economical pink-noise filter
    for (let i = 0; i < n; i += 1) { seed = (seed * 16807) % 2147483647; const w = seed / 1073741823.5 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; }
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true; const nodes = (['highpass', 'lowshelf', 'peaking', 'peaking', 'highshelf'] as BiquadFilterType[]).map((ty) => { const f = ac.createBiquadFilter(); f.type = ty; if (ty === 'highpass') f.Q.value = -3.0103; return f; });
    const g = ac.createGain(); g.gain.value = 0.12; const an = ac.createAnalyser(); an.fftSize = 8192; an.smoothingTimeConstant = 0.8;
    src.connect(nodes[0]!); for (let i = 1; i < nodes.length; i += 1) nodes[i - 1]!.connect(nodes[i]!); nodes[nodes.length - 1]!.connect(g); g.connect(an); an.connect(ac.destination);
    const loop = () => { const L = live.current; if (!L) return; const arr = new Float32Array(an.frequencyBinCount); an.getFloatFrequencyData(arr); const bin = ac.sampleRate / an.fftSize;
      const lb = THIRDS.map((f) => { const lo = f / 2 ** (1 / 6), hi = f * 2 ** (1 / 6); let p = 0; for (let k = Math.max(1, Math.floor(lo / bin)); k <= Math.min(arr.length - 1, Math.ceil(hi / bin)); k += 1) p += 10 ** (arr[k]! / 10); return 10 * Math.log10(p + 1e-12); });
      const ref = lb[17]!; setBars(lb.map((v) => v - ref)); L.raf = requestAnimationFrame(loop); };
    live.current = { src, nodes, an, raf: 0 }; setS({ ...s }); src.start(); loop(); };
  const x0 = 60, x1 = 780, y1 = 320, Y = (v: number) => y1 - ((Math.max(-30, Math.min(24, v)) + 30) / 54) * 290, bw = (x1 - x0) / THIRDS.length - 3;
  const worst = THIRDS.map((f) => [f, SOURCES[s.src]!.f(f) + eq(f)] as const).sort((a, b) => b[1] - a[1])[0]!;
  const curve = Array.from({ length: 241 }, (_x, i) => { const f = 10 ** (Math.log10(20) + (i / 240) * 3); return `${i ? 'L' : 'M'}${round(logX(f, x0, x1), 1)} ${round(Y(eq(f)), 1)}`; }).join('');
  return <>
    <Stage w={800} h={380} label="A real-time analyser: ⅓-octave bars coloured by frequency region, and the EQ curve you are shaping.">
      {REGIONS.map((r) => { const a = logX(r.lo, x0, x1), b = logX(r.hi, x0, x1); return <rect key={r.name} x={a} y={y1 + 4} width={b - a - 2} height={10} fill={REG_C[r.name]} />; })}
      {[-24, -12, 0, 12].map((v) => <g key={v}><line x1={x0} x2={x1} y1={Y(v)} y2={Y(v)} stroke={v === 0 ? '#475569' : '#1F2A3D'} /><T x={x0 - 8} y={Y(v) + 5} s={`${v > 0 ? '+' : ''}${v}`} size={13} fill="#94A3B8" anchor="end" /></g>)}
      {[31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000].map((f) => <T key={f} x={logX(f, x0, x1)} y={y1 + 34} s={fmtHz(f)} size={13} fill="#94A3B8" anchor="middle" />)}
      {THIRDS.map((f, i) => { const v = bars ? bars[i]! : SOURCES[s.src]!.f(f) + eq(f); return <rect key={f} x={logX(f, x0, x1) - bw / 2} y={Y(v)} width={bw} height={Math.max(0, y1 - Y(v))} fill={REG_C[regionOf(f).name]} opacity={0.85} />; })}
      <path d={curve} fill="none" stroke="#F4F1E8" strokeWidth={3.5} /><T x={x1} y={20} s={bars ? 'LIVE ANALYSER · what you are hearing' : 'bars = source + EQ · white line = EQ alone'} size={14} anchor="end" weight={800} />
      <T x={10} y={374} s="dB re: flat · ⅓-octave bands · ILLUSTRATIVE sources (FB-05)" size={12} fill="#94A3B8" />
    </Stage>
    <Read rows={[['loudest band', `${fmtHz(worst[0])} Hz · ${regionOf(worst[0]).name}`], ['what lives there', REG_FEEL[regionOf(worst[0]).name]!], ['high-pass', `${s.hp} Hz · 12 dB/octave`], ['rule of thumb', 'cut narrow, boost wide — and sweep with your ears, confirm with the analyser']]} />
    <label className="ch__field"><span>Source</span><select value={s.src} onChange={(e) => setS({ ...s, src: e.target.value })}>{Object.entries(SOURCES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select></label>
    <div className="ch__ctl">{([['High-pass', 'hp', 20, 400, 1, 'Hz', true], ['Low shelf freq', 'lsf', 40, 400, 1, 'Hz', true], ['Low shelf gain', 'ls', -12, 12, 0.5, 'dB'], ['Band 1 freq', 'p1f', 60, 12000, 1, 'Hz', true], ['Band 1 gain', 'p1g', -18, 12, 0.5, 'dB'], ['Band 1 Q', 'p1q', 0.3, 16, 0.1, ''], ['Band 2 freq', 'p2f', 60, 16000, 1, 'Hz', true], ['Band 2 gain', 'p2g', -18, 12, 0.5, 'dB'], ['Band 2 Q', 'p2q', 0.3, 16, 0.1, ''], ['High shelf freq', 'hsf', 2000, 16000, 1, 'Hz', true], ['High shelf gain', 'hs', -12, 12, 0.5, 'dB']] as Array<[string, keyof EqS, number, number, number, string, boolean?]>)
      .map(([label, k, min, max, step, unit, log]) => <Slider key={k} label={label} v={s[k] as number} min={min} max={max} step={step} unit={unit} log={log} set={set(k)} />)}</div>
    <p><Button onClick={listen}>{bars ? '■ Stop' : '🔊 Listen through the EQ (pink noise, quiet)'}</Button></p>
    <p className="ui-meta">The white curve is the EQ alone; the coloured bars are what reaches the listener, band by band, in the colours the Fieldbook uses for the regions of the spectrum. When you listen, the bars become a live analyser of the noise you hear (relative to its 1 kHz band) — your ears and the meter should agree. Try the ringing mic: find it, then cut it with a narrow band.</p>
  </>;
}

// ------------------------------------------------------------------------------------------------------------ 3 · compression
function Comp() {
  const [s, setS] = useState({ thr: -18, ratio: 4, knee: 6, att: 10, rel: 150, mk: 0, prog: 'vocal' }); const set = (k: string) => (v: number) => setS({ ...s, [k]: v });
  const gc = (x: number) => { const T0 = s.thr, R = s.ratio, Wk = s.knee; if (2 * (x - T0) < -Wk) return x; if (2 * Math.abs(x - T0) <= Wk && Wk > 0) return x + ((1 / R - 1) * (x - T0 + Wk / 2) ** 2) / (2 * Wk); return T0 + (x - T0) / R; };
  const env = (t: number) => { if (s.prog === 'drums') { const ph = (t * 4) % 1, hit = Math.floor(t * 4) % 2 ? -6 : -2; return Math.max(-50, hit - ph * 70); }
    if (s.prog === 'bass') { const n = Math.floor(t * 3), v = [-10, -22, -8, -18, -12, -24][n % 6]!, p = (t * 3) % 1; return v - p * 10; }
    const syl = [-8, -20, -6, -24, -12, -4, -18, -10], k = Math.floor(t * 4) % syl.length, q = (t * 4) % 1; return syl[k]! + (q < 0.15 ? (q / 0.15 - 1) * 12 : -q * 6); };
  const ax = 40, ay = 40, as = 280, PX = (v: number) => ax + ((v + 60) / 60) * as, PY = (v: number) => ay + as - ((v + 60) / 60) * as;
  let tr = ''; for (let v = -60; v <= 0; v += 0.5) tr += `${v === -60 ? 'M' : 'L'}${round(PX(v), 1)} ${round(PY(Math.min(0, gc(v) + s.mk)), 1)}`;
  const tx = 370, tw = 410, ty = 40, lh = 190, dur = 2, fs = 1000, aA = Math.exp(-1 / ((s.att / 1000) * fs)), aR = Math.exp(-1 / ((s.rel / 1000) * fs)), TY = (v: number) => ty + lh - ((v + 60) / 60) * lh, GY = (v: number) => ty + lh + 24 + (Math.min(20, v) / 20) * 60;
  let g = 0, di = '', dO = '', dg = '', maxGR = 0, pkIn = -99, pkOut = -99;
  for (let i = 0; i <= dur * fs; i += 1) { const t = i / fs, x = env(t), target = gc(x) - x; g = target < g ? aA * g + (1 - aA) * target : aR * g + (1 - aR) * target; const y = x + g + s.mk, X = tx + (t / dur) * tw;
    if (i % 4 === 0) { di += `${i ? 'L' : 'M'}${round(X, 1)} ${round(TY(x), 1)}`; dO += `${i ? 'L' : 'M'}${round(X, 1)} ${round(TY(Math.min(0, y)), 1)}`; dg += `${i ? 'L' : 'M'}${round(X, 1)} ${round(GY(-g), 1)}`; }
    maxGR = Math.max(maxGR, -g); pkIn = Math.max(pkIn, x); pkOut = Math.max(pkOut, y); }
  return <>
    <Stage w={800} h={400} label="A compressor: the transfer curve on the left, and on the right the input level, the output level and the gain reduction over two seconds.">
      <rect x={ax} y={ay} width={as} height={as} fill="#0B1220" stroke="#334155" />
      {[-48, -36, -24, -12].map((v) => <g key={v}><line x1={PX(v)} x2={PX(v)} y1={ay} y2={ay + as} stroke="#1F2A3D" /><line x1={ax} x2={ax + as} y1={PY(v)} y2={PY(v)} stroke="#1F2A3D" /><T x={PX(v)} y={ay + as + 18} s={v} size={12} fill="#94A3B8" anchor="middle" /><T x={ax - 6} y={PY(v) + 4} s={v} size={12} fill="#94A3B8" anchor="end" /></g>)}
      <line x1={PX(-60)} y1={PY(-60)} x2={PX(0)} y2={PY(0)} stroke="#475569" strokeDasharray="5 5" /><path d={tr} fill="none" stroke="#F472B6" strokeWidth={3.5} />
      <line x1={PX(s.thr)} x2={PX(s.thr)} y1={ay} y2={ay + as} stroke="#FBBF24" strokeDasharray="4 4" /><T x={PX(s.thr) + 4} y={ay + 14} s="threshold" size={13} fill="#FDE68A" /><T x={ax} y={26} s="IN → OUT (dBFS)" size={14} weight={800} />
      <rect x={tx} y={ty} width={tw} height={lh} fill="#0B1220" stroke="#334155" /><rect x={tx} y={ty + lh + 24} width={tw} height={60} fill="#0B1220" stroke="#334155" />
      <T x={tx} y={ty + lh + 18} s="gain reduction · 0 (top) to 20 dB (bottom)" size={12} fill="#FCA5A5" />
      <path d={di} fill="none" stroke="#64748B" strokeWidth={2} /><path d={dO} fill="none" stroke="#34D399" strokeWidth={2.5} /><path d={dg} fill="none" stroke="#F87171" strokeWidth={2.5} />
      <T x={tx} y={26} s="LEVEL OVER 2 s · grey in · green out" size={13} weight={800} /><T x={10} y={392} s="Feed-forward compressor model, dB domain, soft knee · ILLUSTRATIVE programme (FB-05)" size={12} fill="#94A3B8" />
    </Stage>
    <Read rows={[['ratio', `${s.ratio}:1 above ${s.thr} dBFS`], ['most gain reduction', `${round(maxGR, 1)} dB`], ['peaks', `in ${round(pkIn, 1)} → out ${round(pkOut, 1)} dBFS`], ['attack / release', `${s.att} ms / ${s.rel} ms`], ['listen for', maxGR > 10 ? 'pumping, lost punch — too much' : maxGR < 2 ? 'barely working' : 'steadier level, natural attack']]} />
    <label className="ch__field"><span>Programme</span><select value={s.prog} onChange={(e) => setS({ ...s, prog: e.target.value })}><option value="vocal">A sung phrase (loud and soft syllables)</option><option value="drums">Drum hits (fast peaks)</option><option value="bass">Bass guitar (uneven notes)</option></select></label>
    <div className="ch__ctl">{([['Threshold', 'thr', -50, 0, 1, 'dBFS'], ['Ratio', 'ratio', 1, 20, 0.5, ':1'], ['Knee width', 'knee', 0, 20, 1, 'dB'], ['Attack', 'att', 0.5, 100, 0.5, 'ms'], ['Release', 'rel', 20, 1000, 5, 'ms'], ['Makeup gain', 'mk', 0, 20, 0.5, 'dB']] as Array<[string, string, number, number, number, string]>)
      .map(([label, k, min, max, step, unit]) => <Slider key={k} label={label} v={(s as Record<string, number | string>)[k] as number} min={min} max={max} step={step} unit={unit} set={set(k)} />)}</div>
    <p className="ui-meta">Above the threshold, every <i>ratio</i> dB in becomes 1 dB out. Attack is how fast it reduces gain; release how fast it lets go. The Fieldbook’s starting points (a vocal around 3:1 with 3–6 dB of reduction) are starting points — the programme and the room decide.</p>
  </>;
}

// ------------------------------------------------------------------------------------------------------------ 4 · shutter, frame rate and flicker
function Shutter() {
  const [s, setS] = useState({ fps: 29.97, angle: 180, speed: 6, flick: 120, depth: 60 }); const set = (k: string) => (v: number) => setS({ ...s, [k]: v });
  const tExp = s.angle / 360 / s.fps, frameT = 1 / s.fps, cyc = s.flick * tExp, lx = 20, lw = 760, ly = 172, span = 4 * frameT, rx = 20, ry = 276, rw = 360, rh = 128, rows = 60, readout = 0.9 * frameT, m = s.depth / 100;
  let mn = 9, mx = -9; const rowsI = Array.from({ length: rows }, (_x, r) => { const ts = (r / rows) * readout, w = 2 * Math.PI * s.flick, I = 1 + (m * (Math.sin(w * (ts + tExp)) - Math.sin(w * ts))) / (w * tExp); mn = Math.min(mn, I); mx = Math.max(mx, I); return I; });
  const band = mx - mn; let dd = ''; for (let x = 0; x <= lw; x += 2) { const t = (x / lw) * span; dd += `${x ? 'L' : 'M'}${lx + x} ${round(ly + 48 - 12 * Math.cos(2 * Math.PI * s.flick * t), 1)}`; }
  return <>
    <Stage w={800} h={420} label="Shutter and frame rate: six captured frames of a moving ball showing motion blur, a timeline of when the shutter is open, and a frame lit by a flickering light showing rolling bands.">
      <T x={20} y={24} s={`SIX FRAMES · a ball crossing the frame at ${s.speed} frame-widths per second`} size={14} weight={800} />
      {Array.from({ length: 6 }, (_x, k) => { const fx = 20 + k * 128, fy = 36, fw = 120, fh = 80, pos = (s.speed * k * frameT) % 1, blur = s.speed * tExp * fw; return <g key={k}><rect x={fx} y={fy} width={fw} height={fh} fill="#111827" stroke="#334155" /><rect x={fx + pos * fw - 7} y={fy + 33} width={Math.min(fw, 14 + blur)} height={14} rx={7} fill="#FBBF24" opacity={Math.max(0.35, Math.min(1, 14 / (14 + blur)))} /><T x={fx + 4} y={fy + fh + 16} s={`frame ${k + 1}`} size={12} fill="#94A3B8" /></g>; })}
      <T x={lx} y={ly - 6} s={`TIMELINE · frame period ${round(frameT * 1000, 2)} ms · shutter open ${round(tExp * 1000, 2)} ms (≈ 1/${Math.round(1 / tExp)} s)`} size={14} weight={800} />
      {[0, 1, 2, 3].map((j) => { const a = lx + ((j * frameT) / span) * lw; return <g key={j}><rect x={a} y={ly} width={(frameT / span) * lw - 2} height={24} fill="#1E293B" /><rect x={a} y={ly} width={(tExp / span) * lw} height={24} fill="#22D3EE" opacity={0.8} /></g>; })}
      <path d={dd} fill="none" stroke="#F472B6" strokeWidth={2} /><T x={lx + lw} y={ly + 76} s={`light output flickering at ${s.flick} Hz`} size={12} fill="#F9A8D4" anchor="end" />
      <T x={rx} y={ry - 8} s="ONE FRAME UNDER THAT LIGHT (rolling shutter)" size={14} weight={800} />
      {rowsI.map((I, r) => { const c = Math.round(Math.max(0, Math.min(255, 150 * I))); return <rect key={r} x={rx} y={ry + (r * rh) / rows} width={rw} height={rh / rows + 0.5} fill={`rgb(${c},${c},${Math.round(c * 0.95)})`} />; })}
      <T x={400} y={ry + 10} s={`cycles of flicker per exposure: ${round(cyc, 2)}`} size={16} fill="#F4F1E8" weight={800} />
      <T x={400} y={ry + 36} s={band < 0.03 ? 'A whole number of cycles:' : 'Not a whole number of cycles:'} size={14} fill={band < 0.03 ? '#6EE7B7' : '#FCA5A5'} /><T x={400} y={ry + 54} s={band < 0.03 ? 'every row gets the same light.' : 'rows get different light — bands.'} size={14} fill={band < 0.03 ? '#6EE7B7' : '#FCA5A5'} />
      <T x={400} y={ry + 76} s={`band contrast ≈ ${Math.round((band / (1 + m)) * 100)}%`} size={14} /><T x={400} y={ry + 96} s="Fix: choose a shutter that fits whole cycles," size={14} /><T x={400} y={ry + 116} s="e.g. 1/60 s or 1/120 s under 120 Hz flicker;" size={14} /><T x={400} y={ry + 136} s="1/50 or 1/100 under 100 Hz." size={14} />
    </Stage>
    <Read rows={[['exposure', `${round(tExp * 1000, 2)} ms (${s.angle}° at ${s.fps} fps)`], ['motion blur', `${round(s.speed * tExp * 100, 1)}% of the frame width`], ['180° rule', 'exposure ≈ half the frame period — natural-looking motion'], ['refresh cycles', `cycles = flicker × shutter = ${round(cyc, 2)}`]]} />
    <div className="ch__ctl">
      <label className="ch__field"><span>Frame rate</span><select value={s.fps} onChange={(e) => setS({ ...s, fps: Number(e.target.value) })}>{[23.976, 24, 25, 29.97, 30, 50, 59.94, 60].map((f) => <option key={f} value={f}>{f} fps</option>)}</select></label>
      <label className="ch__field"><span>Light / LED refresh</span><select value={s.flick} onChange={(e) => setS({ ...s, flick: Number(e.target.value) })}>{([[120, 'Lamps on 60 Hz mains (120 Hz flicker)'], [100, 'Lamps on 50 Hz mains (100 Hz flicker)'], [960, 'LED wall, low refresh (960 Hz, illustrative)'], [3840, 'LED wall, high refresh (3,840 Hz, illustrative)']] as const).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
      <Slider label="Shutter angle" v={s.angle} min={11.25} max={360} step={0.25} unit="°" set={set('angle')} /><Slider label="Subject speed" v={s.speed} min={0} max={20} step={0.5} unit="frame-widths/s" set={set('speed')} /><Slider label="Flicker depth" v={s.depth} min={0} max={100} step={5} unit="%" set={set('depth')} />
    </div>
    <p className="ui-meta">Shutter angle turns into exposure time: t = angle ÷ 360 ÷ fps. A wider angle means longer exposure, more motion blur and more light. Under lights that flicker — mains-powered lamps at twice the mains frequency, or an LED wall’s refresh — a shutter that fits a whole number of flicker cycles keeps every row of the picture equal. Flicker depth varies by fixture and driver; check the fixture on camera.</p>
  </>;
}

// ------------------------------------------------------------------------------------------------------------ 5 · beams and fixture types
const FIXTURES = [
  { id: 'par', name: 'PAR (fixed lens)', beam: 25, field: 40, range: '≈10–60° by lens', edge: 'soft, oval or round', use: 'colour washes, back light, uplight' },
  { id: 'fresnel', name: 'Fresnel (spot ↔ flood)', beam: 30, field: 50, range: '≈15–60° focus range', edge: 'soft edge, blends well', use: 'key and fill on faces, even washes' },
  { id: 'ellip', name: 'Ellipsoidal / profile', beam: 26, field: 30, range: 'fixed barrels, e.g. 19°, 26°, 36°, 50°', edge: 'hard edge; shutters and gobos shape it', use: 'front light that stays off walls and screens' },
  { id: 'wash', name: 'Moving head wash', beam: 20, field: 35, range: '≈10–50° zoom', edge: 'soft', use: 'colour, looks, re-aimable washes' },
  { id: 'spot', name: 'Moving head spot', beam: 18, field: 24, range: '≈12–35° zoom', edge: 'sharp, gobos and iris', use: 'specials, texture, pickups' },
  { id: 'beam', name: 'Moving head beam', beam: 3, field: 5, range: '≈2–5°', edge: 'tight shaft of light', use: 'mid-air effects in haze' },
  { id: 'batten', name: 'LED batten / strip', beam: 40, field: 60, range: 'wide, linear', edge: 'soft line of light', use: 'cyc and backdrop washes, uplight' }];
function Beam() {
  const [s, setS] = useState({ fx: 'ellip', d: 10, beam: 26, field: 30, lm: 5000, n: 3, gap: 3 }); const set = (k: string) => (v: number) => setS({ ...s, [k]: v, ...(k === 'beam' && v > s.field ? { field: v } : {}) });
  const f = FIXTURES.find((x) => x.id === s.fx)!, field = Math.max(s.field, s.beam), rad = (a: number) => (a * Math.PI) / 180;
  const Db = 2 * s.d * Math.tan(rad(s.beam / 2)), Df = 2 * s.d * Math.tan(rad(field / 2)), sr = 2 * Math.PI * (1 - Math.cos(rad(field / 2))), I = s.lm / sr, E = I / (s.d * s.d);
  const sx = 40, fy = 160, L = Math.min(300, 125 / Math.tan(rad(Math.max(field, 1) / 2))), ex = sx + L, h = (a: number) => Math.tan(rad(a / 2)) * (ex - sx), hf = h(field), hb = h(s.beam);
  const py = 330, pc = 400, psc = Math.min(22, 300 / Math.max(1, s.n * s.gap + Df)), even = s.gap <= Db * 1.05 && s.gap >= Db * 0.6;
  return <>
    <Stage w={800} h={420} label="Beam geometry: a fixture’s cone reaching a stage at the throw distance, with the beam and field diameters, the illuminance at the centre, and several fixtures overlapping on the floor.">
      <T x={20} y={26} s={`SIDE VIEW · throw ${s.d} m (angles true, length not to scale)`} size={14} weight={800} />
      <path d={`M${sx} ${fy} L${ex} ${fy - hf} L${ex} ${fy + hf} Z`} fill="#FDE68A" opacity={0.18} /><path d={`M${sx} ${fy} L${ex} ${fy - hb} L${ex} ${fy + hb} Z`} fill="#FDE68A" opacity={0.38} />
      <rect x={sx - 24} y={fy - 14} width={26} height={28} rx={4} fill="#334155" stroke="#94A3B8" /><line x1={ex} x2={ex} y1={40} y2={260} stroke="#94A3B8" strokeWidth={3} />
      <T x={ex + 8} y={fy - hb - 4} s={`beam ⌀ ${round(Db, 2)} m (50%)`} size={14} fill="#FDE68A" /><T x={ex + 8} y={Math.max(52, fy - hf - 22)} s={`field ⌀ ${round(Df, 2)} m (10%)`} size={13} fill="#FEF3C7" />
      <T x={20} y={286} s={`ON THE STAGE FLOOR · ${s.n} fixtures, ${s.gap} m apart`} size={14} weight={800} />
      {Array.from({ length: s.n }, (_x, k) => { const cx = pc + (k - (s.n - 1) / 2) * s.gap * psc; return <g key={k}><circle cx={cx} cy={py + 40} r={(Df / 2) * psc} fill="#FDE68A" opacity={0.14} /><circle cx={cx} cy={py + 40} r={(Db / 2) * psc} fill="#FDE68A" opacity={0.28} stroke="#FBBF24" /></g>; })}
      <T x={780} y={300} s={even ? 'beams meet near their 50% edges → an even wash' : s.gap > Db * 1.05 ? 'gaps between beams → dark patches' : 'heavy overlap → hot spots'} size={13} fill={even ? '#6EE7B7' : '#FCA5A5'} anchor="end" />
      <T x={10} y={414} s="Beam angle: where intensity falls to 50% of centre · field angle: 10% · uniform-cone estimate for lux · ILLUSTRATIVE (FB-05)" size={12} fill="#94A3B8" />
    </Stage>
    <Read rows={[['fixture', `${f.name} · ${f.range}`], ['edge', f.edge], ['used for', f.use], ['beam ⌀ = 2 × d × tan(θ ÷ 2)', `${round(Db, 2)} m`], ['centre intensity (approx.)', `${Math.round(I)} cd`], ['illuminance E = I ÷ d²', `${Math.round(E)} lux ≈ ${round(E / 10.764, 1)} fc`]]} />
    <label className="ch__field"><span>Fixture type</span><select value={s.fx} onChange={(e) => { const x = FIXTURES.find((q) => q.id === e.target.value)!; setS({ ...s, fx: x.id, beam: x.beam, field: x.field }); }}>{FIXTURES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    <div className="ch__ctl"><Slider label="Throw distance" v={s.d} min={2} max={30} step={0.5} unit="m" set={set('d')} /><Slider label="Beam angle" v={s.beam} min={2} max={70} step={1} unit="°" set={set('beam')} /><Slider label="Field angle" v={field} min={3} max={90} step={1} unit="°" set={set('field')} />
      <Slider label="Light output" v={s.lm} min={500} max={30000} step={100} unit="lumens" set={set('lm')} /><Slider label="Fixtures in the row" v={s.n} min={1} max={5} step={1} set={set('n')} /><Slider label="Spacing" v={s.gap} min={0.5} max={8} step={0.5} unit="m" set={set('gap')} /></div>
    <p className="ui-meta">Double the throw and the pool doubles in width but the light on it falls to a quarter. The same lumens in a narrower beam make a brighter pool. Real fixtures publish photometric data — beam and field angles and candela at centre; use it, not these typical ranges.</p>
  </>;
}

// ------------------------------------------------------------------------------------------------------------ 6 · colour temperature and mixing
export function cctRGB(K: number): [number, number, number] {   // widely used approximation (fit to blackbody colours); good for a swatch, not for measurement
  const t = K / 100, c = (v: number) => Math.round(Math.max(0, Math.min(255, v)));
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592, g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492, b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [c(r), c(g), c(b)];
}
function Colour() {
  const [s, setS] = useState({ k: 3200, k2: 5600, r: 255, g: 180, b: 60 }); const set = (k: string) => (v: number) => setS({ ...s, [k]: v }); const shift = Math.round(1e6 / s.k2 - 1e6 / s.k), cx = 660, cy = 205, rr = 62;
  return <>
    <Stage w={800} h={360} label="Colour temperature swatches with their mired values, and three coloured lights overlapping to show additive mixing.">
      <T x={20} y={26} s="WHITE IS NOT ONE COLOUR · colour temperature (kelvin)" size={14} weight={800} />
      {Array.from({ length: 40 }, (_x, i) => <rect key={i} x={20 + i * 19} y={40} width={19} height={40} fill={`rgb(${cctRGB(1800 + i * 210).join(',')})`} />)}
      {[2000, 3200, 4300, 5600, 6500, 9000].map((K) => <T key={K} x={20 + ((K - 1800) / 210) * 19} y={98} s={`${K} K`} size={12} anchor="middle" />)}
      {([['A', s.k, 30], ['B', s.k2, 280]] as const).map(([n, K, x]) => <g key={n}><rect x={x} y={120} width={220} height={90} rx={10} fill={`rgb(${cctRGB(K).join(',')})`} /><T x={x + 110} y={234} s={`${n} · ${K} K · ${Math.round(1e6 / K)} mired`} size={14} fill="#E2E8F0" anchor="middle" weight={800} /></g>)}
      <T x={30} y={266} s={`A → B needs a ${shift > 0 ? '+' : ''}${shift} mired shift`} size={15} fill="#FDE68A" weight={800} /><T x={30} y={288} s={`(${shift > 0 ? 'a warming' : 'a cooling'} filter or setting)`} size={14} fill="#FDE68A" />
      <T x={30} y={314} s="mired = 1,000,000 ÷ kelvin" size={13} fill="#94A3B8" /><T x={30} y={332} s="equal mired steps look like equal colour steps" size={13} fill="#94A3B8" />
      <rect x={545} y={110} width={235} height={220} fill="#000" />
      <g className="bench__screen">{([[`rgb(${s.r},0,0)`, cx, cy - 40], [`rgb(0,${s.g},0)`, cx - 45, cy + 30], [`rgb(0,0,${s.b})`, cx + 45, cy + 30]] as const).map(([c, x, y]) => <circle key={c} cx={x} cy={y} r={rr} fill={c} className="bench__light" />)}</g>
      <T x={662} y={322} s={`R ${s.r} · G ${s.g} · B ${s.b}`} size={13} fill="#E2E8F0" anchor="middle" /><T x={10} y={354} s="Swatches approximate blackbody colour on your screen — not a measurement (FB-05)" size={12} fill="#94A3B8" />
    </Stage>
    <Read rows={[['A', `${s.k} K ≈ ${s.k < 3500 ? 'warm (tungsten-like)' : s.k < 5000 ? 'neutral' : 'cool (daylight-like)'}`], ['mired shift A→B', `${shift > 0 ? '+' : ''}${shift}`], ['mixing', 'red + green + blue light add toward white; paint subtracts'], ['on camera', 'match all sources to one white balance; RGB-only white can make skin look odd — RGBW / RGBAL fixtures render it better']]} />
    <div className="ch__ctl"><Slider label="Source A" v={s.k} min={1800} max={10000} step={50} unit="K" set={set('k')} /><Slider label="Source B (target)" v={s.k2} min={1800} max={10000} step={50} unit="K" set={set('k2')} />
      <Slider label="Red" v={s.r} min={0} max={255} step={1} set={set('r')} /><Slider label="Green" v={s.g} min={0} max={255} step={1} set={set('g')} /><Slider label="Blue" v={s.b} min={0} max={255} step={1} set={set('b')} /></div>
    <p className="ui-meta">Warm light (low kelvin) looks orange; daylight (5,600 K and up) looks blue beside it. Cameras need every source on one colour temperature — or a deliberate choice not to. Mireds make the arithmetic of filters and settings add up.</p>
  </>;
}

export const BENCH: Array<{ id: string; title: string; icon: string; C: () => JSX.Element }> = [
  { id: 'ear', title: 'The ear — what we can hear', icon: '👂', C: Ear }, { id: 'eq', title: 'EQ and the analyser — regions in colour', icon: '🎚', C: Eq },
  { id: 'comp', title: 'Compression — threshold, ratio, attack, release', icon: '🗜', C: Comp }, { id: 'shutter', title: 'Shutter, frame rate and flicker', icon: '🎥', C: Shutter },
  { id: 'beam', title: 'Light — beam sizes and fixture types', icon: '💡', C: Beam }, { id: 'color', title: 'Colour temperature and mixing', icon: '🌈', C: Colour }];
/** The bench: six demos, one open at a time. */
export function Bench() {
  const [open, setOpen] = useState<string | null>(null); const D = BENCH.find((b) => b.id === open);
  return <div className="stack" data-testid="bench">
    <div className="dr__grid" role="group" aria-label="Demos on the bench">{BENCH.map((b) => <button key={b.id} type="button" className="dr__btn" aria-pressed={open === b.id} data-demo={b.id} onClick={() => setOpen(open === b.id ? null : b.id)}>{b.icon} {b.title}</button>)}</div>
    {D && <section className="stack" data-testid="bench-demo" data-demo={D.id} aria-label={D.title}><h4 className="build__h">{D.icon} {D.title}</h4><D.C /></section>}
  </div>;
}
