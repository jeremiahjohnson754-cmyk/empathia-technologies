/**
 * A SIGNAL challenge, to the reference's mountChal (chal_core.js): the mode and title, the formula, the level row (not in a boss), the
 * brief, the controls, a live readout and a drawing computed from the same model, "Check my work" (one shot in a boss), "Start over",
 * and the result: the headline, the joke or the cheer, every check with what you had and the target, and why when it failed (or always
 * at levels 1–2). Mastery runs on the challenge's own clock unless timers are off. reach-cues is played live: keys 1–8 fire looks against
 * the song's clock. Drawings are SVG attributes and one canvas, never inline styles, so the page keeps its content policy.
 */
import { useEffect, useId, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Button } from './components.js';
import * as CH from './challenges/index.js';
import type { Challenge, Control, CState, Result } from './challenges/core.js';
import { band } from './challenges/band.js';

const fmt = (s: number) => { const t = Math.max(0, Math.ceil(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const LV_NAME = ['', 'Level 1 · Beginner', 'Level 2 · Intermediate', 'Level 3 · Advanced', 'Level 4 · Mastery (on the clock)'];
const CHEERS = ['The room settles. Nobody noticed a thing — which is the job.', 'The producer gives you a thumbs-up without looking up.', 'Tasha writes it on the whiteboard as the new standard.', 'Elias reads your numbers twice and signs.', 'Somebody at the back says “oh, that’s better” to nobody in particular.'];
export interface ChalOutcome { passed: boolean; score: number; result: Result; timeout?: boolean }
type Props = { id: string; lv: number; factor?: number; boss?: boolean; where?: string; heading?: 'h2' | 'h3' | 'h4'; records?: Record<string, CH.ChalRecord>; onLevel?: (lv: number) => void; onResult?: (o: ChalOutcome) => void };

/** Keyed by level and round so "Start over" and a level change start clean. */
export function ChallengeRunner(p: Props) { const [round, setRound] = useState(0); return <Inner key={`${p.id}@${p.lv}#${round}`} {...p} again={() => setRound((r) => r + 1)} />; }

function Inner({ id, lv, factor = 1, boss = false, where, heading = 'h3', records, onLevel, onResult, again }: Props & { again: () => void }) {
  const C = CH.byId(id), M = CH.MODES.find((m) => m.id === C.mode)!, H = heading;
  const [st, setSt] = useState<CState>(() => C.init(lv)); const [out, setOut] = useState<ChalOutcome | null>(null);
  const timed = lv === 4 && !!C.time && !!factor && !boss && !C.live; const [left, setLeft] = useState(C.time); const [beat, setBeat] = useState(false);
  const done = !!out && (boss || timed && (out.passed || !!out.timeout));
  const finish = (r: Result, timeout = false) => { const sc = CH.scoreResult(r), o = { passed: sc.passed, score: sc.score, result: r, timeout }; setOut(o); if (timed && sc.passed) setBeat(true); onResult?.(o); };
  const check = (s = st) => { if (done) return; finish(C.evaluate(s, lv)); };
  useEffect(() => { if (!timed || done) return undefined; const t = setInterval(() => setLeft((l) => l - 1), 1000); return () => clearInterval(t); }, [timed, done]);
  useEffect(() => { if (timed && !done && left <= 0) finish(CH.withTimeout(C, C.evaluate(st, lv)), true); });
  const set = (patch: CState, fin = false) => { const n = { ...st, ...patch }; setSt(n); if (fin) check(n); };
  return (
    <article className="stack ch" data-testid="challenge" data-chal={id} data-lv={lv} data-state={out ? (out.passed ? 'passed' : 'failed') : 'ready'}>
      <p className="lab__k">{M.icon} {M.name} · challenge</p>
      {H === 'h2' ? <h2 className="build__h">{C.icon} {C.title}</h2> : H === 'h3' ? <h3 className="build__h">{C.icon} {C.title}</h3> : <h4 className="build__h">{C.icon} {C.title}</h4>}
      {C.formula && <p className="ch__formula">ƒ {C.formula}</p>}
      {!boss && <div className="ch__lvrow" role="group" aria-label="Difficulty level">{[1, 2, 3, 4].map((n) => { const r = records?.[CH.key(id, n)];
        return <button key={n} type="button" className="ch__lv" aria-pressed={n === lv} title={LV_NAME[n]} onClick={() => onLevel?.(n)}>L{n}{r ? `${r.passed ? ' ✔' : ' ·'} ${r.best}` : ''}</button>; })}</div>}
      <p className="ui-meta">{LV_NAME[lv]}{where ? ` · ${where}` : ''}</p>
      <p>{C.brief(lv)}</p>
      {timed && <p className="dr__clock" data-testid="chal-clock" aria-live="off" data-low={left <= 20}>{beat ? '⏱ Beat the clock.' : `⏱ ${fmt(left)} — ${C.clock || 'until doors'}`}</p>}
      {lv === 4 && !!C.time && !factor && !boss && !C.live && <p className="ui-meta">⏱ Timers are off in your settings — Mastery without the clock.</p>}
      {C.live ? <CueDesk lv={lv} factor={factor} done={done} onFinish={(r) => finish(r)} /> : <>
        <Drawing C={C} st={st} lv={lv} />
        <Readout rows={C.readout(st, lv)} />
        <Controls C={C} st={st} lv={lv} disabled={done} set={set} />
        {C.id === 'hear-comp' && <Listen st={st} />}{C.id === 'hear-eq' && <GuitarPlay st={st} lv={lv} />}
        {C.note && <p className="ui-meta">{C.note}</p>}
        {!done && <p className="lab__row"><Button kind="primary" onClick={() => check()}>{boss ? '✔ Check my work — one shot' : '✔ Check my work'}</Button>{!boss && <Button onClick={again}>↺ Start over</Button>}</p>}
      </>}
      {out && <ResultView o={out} lv={lv} />}
      {!boss && <p className="ui-meta">⚑ CH-01: a teaching model. The physics is standard; the targets are teaching windows, and a professional may choose differently on purpose. No real product is modelled.</p>}
    </article>
  );
}

function ResultView({ o, lv }: { o: ChalOutcome; lv: number }) {
  const r = o.result;
  if ('instant' in r) return <div className="ch__res" data-testid="chal-result" data-pass="false" role="status"><p className="ch__res-h">✖ INSTANT FAIL · {r.instant.title}</p><p className="ch__joke">{r.instant.joke}</p><p>Why: {r.instant.why}</p><p className="ui-meta">Score 0. Change it and check again — every attempt is saved to your record.</p></div>;
  const sc = CH.score(r.checks);
  return <div className="ch__res" data-testid="chal-result" data-pass={sc.passed} role="status">
    <p className="ch__res-h">{sc.passed ? '✔ PASSED' : '✖ NOT YET'} · {sc.score}/100 {CH.stars(sc.passed ? sc.score : 0)}{o.timeout ? ' · TIME' : ''}</p>
    {r.headline ? <p className="ch__joke">{r.headline}</p> : sc.passed ? <p className="ch__joke">{CHEERS[(sc.score + lv) % CHEERS.length]}</p> : null}
    <ul className="ch__checks">{r.checks.map((c, i) => <li key={i} data-ok={c.ok}><b>{c.ok ? '✓' : '✗'} {c.label}{c.must && !c.ok ? ' (must pass)' : ''}</b>
      {(c.got != null || c.want != null) && <span className="ui-meta">{c.got != null ? `you: ${c.got}` : ''}{c.got != null && c.want != null ? ' · ' : ''}{c.want != null ? `target: ${c.want}` : ''}</span>}
      {c.why && (!c.ok || lv <= 2) && <span>{c.why}</span>}</li>)}</ul>
    {!sc.mustOk && <p className="ui-meta">At least one must-pass item failed, so this attempt can’t pass whatever the score.</p>}
  </div>;
}

function Readout({ rows }: { rows: CH.Readout }) {
  return <dl className="ch__read" data-testid="chal-readout">{rows.map((r, i) => <div key={i} data-bad={r[2] === 'bad'}><dt>{r[0]}</dt><dd>{r[1]}{r[2] === 'bad' ? ' ✗' : ''}</dd></div>)}</dl>;
}

// ------------------------------------------------------------------------------------------------------------------- controls
const toPos = (c: Extract<Control, { kind: 'slider' }>, v: number) => (c.log ? (1000 * Math.log(v / c.min)) / Math.log(c.max / c.min) : v);
const fromPos = (c: Extract<Control, { kind: 'slider' }>, p: number) => { const raw = c.log ? c.min * (c.max / c.min) ** (p / 1000) : p; const q = Math.round(raw / c.step) * c.step; return CH.clamp(Number(q.toFixed(6)), c.min, c.max); };
const show = (v: number, unit?: string) => `${Math.abs(v) >= 100 ? Math.round(v) : CH.round(v, 3)}${unit ? ` ${unit}` : ''}`;
function Controls({ C, st, lv, disabled, set }: { C: Challenge; st: CState; lv: number; disabled: boolean; set: (p: CState, fin?: boolean) => void }) {
  const list = C.controls(lv, st);
  return <div className="ch__ctl" data-testid="chal-controls">{list.map((c) => {
    const k = `${c.kind}:${c.key}`;
    switch (c.kind) {
      case 'slider': { const v = Number(st[c.key]); return <label key={k} className="ch__field"><span>{c.label}</span>
        <input type="range" data-key={c.key} data-log={!!c.log} data-vmin={c.min} data-vmax={c.max} min={c.log ? 0 : c.min} max={c.log ? 1000 : c.max} step={c.log ? 1 : c.step} value={toPos(c, v)} disabled={disabled} aria-valuetext={show(v, c.unit)} onChange={(e) => set({ [c.key]: fromPos(c, Number(e.target.value)) })} />
        <b className="ch__v">{show(v, c.unit)}</b></label>; }
      case 'stops': { const v = Number(st[c.key]), i = Math.max(0, c.stops.indexOf(v)); return <label key={k} className="ch__field"><span>{c.label}</span>
        <input type="range" data-key={c.key} data-stops={c.stops.join(',')} min={0} max={c.stops.length - 1} step={1} value={i} disabled={disabled} aria-valuetext={c.fmt ? c.fmt(v) : String(v)} onChange={(e) => set({ [c.key]: c.stops[Number(e.target.value)]! })} />
        <b className="ch__v">{c.fmt ? c.fmt(v) : v}</b></label>; }
      case 'select': return <label key={k} className="ch__field"><span>{c.label}</span>
        <select data-key={c.key} value={String(st[c.key])} disabled={disabled} onChange={(e) => { const o = c.options.find((x) => String(x[0]) === e.target.value); if (o) set({ [c.key]: o[0] }); }}>{c.options.map((o) => <option key={String(o[0])} value={String(o[0])}>{o[1]}</option>)}</select></label>;
      case 'check': return <label key={k} className="ch__check"><input type="checkbox" data-key={c.key} checked={!!st[c.key]} disabled={disabled} onChange={(e) => set({ [c.key]: e.target.checked })} /> <span>{c.label}</span></label>;
      case 'stepper': { const v = Number(st[c.key]); return <div key={k} className="ch__field ch__step"><span>{c.label}</span>
        <button type="button" className="dr__mv" disabled={disabled || v <= c.min} aria-label={`Fewer: ${c.label}`} onClick={() => set({ [c.key]: Math.max(c.min, v - 1) })}>−</button><b className="ch__v" aria-live="polite" data-key={c.key}>{v}{c.unit || ''}</b>
        <button type="button" className="dr__mv" disabled={disabled || v >= c.max} aria-label={`More: ${c.label}`} onClick={() => set({ [c.key]: Math.min(c.max, v + 1) })}>+</button></div>; }
      case 'slots': return <div key={k} className="ch__slots" role="group" aria-label={c.label} data-key={c.key}><p className="lab__k">{c.label}</p>
        <div className="dr__grid">{c.options.map((o) => <button key={o.id} type="button" className="dr__btn" data-opt={o.id} aria-pressed={st[c.key] === o.id} disabled={disabled} onClick={() => set({ [c.key]: o.id })}>{o.label}</button>)}</div></div>;
      case 'color': return <div key={k} className="ch__field ch__color" data-key={c.key}><span>{c.label}</span>
        <input type="color" aria-label={`${c.label} colour`} value={String(st[c.key]).toLowerCase()} disabled={disabled} onChange={(e) => set({ [c.key]: e.target.value })} />
        <div className="ch__sw">{CH.See.SWATCHES.map((hx) =>  <button key={hx} type="button" className="ch__chip" data-hex={hx} aria-label={`${c.label} ${hx}`} title={hx} disabled={disabled} aria-pressed={String(st[c.key]).toLowerCase() === hx.toLowerCase()} onClick={() => set({ [c.key]: hx })}><svg viewBox="0 0 10 10" aria-hidden="true"><rect width="10" height="10" fill={hx} /></svg></button>)}</div></div>;
      case 'action': return <p key={k}><Button disabled={disabled} onClick={() => set(c.set, !!c.finish)}>{c.label}</Button></p>;
      default: return null;
    }
  })}</div>;
}

// ------------------------------------------------------------------------------------------------------------------- drawings
function Drawing({ C, st, lv }: { C: Challenge; st: CState; lv: number }): ReactElement | null {
  switch (C.id) {
    case 'hear-eq': return <EqCurve st={st} lv={lv} />;
    case 'hear-comp': return <WordLevels st={st} />;
    case 'see-moire': return <MoireView st={st} lv={lv} />;
    case 'see-promo': return <PromoSlide st={st} lv={lv} />;
    case 'reach-light': return <LuxWalk st={st} lv={lv} />;
    case 'build-studio': return <Rt60 st={st} lv={lv} />;
    case 'build-rf': return <RfPlan st={st} lv={lv} />;
    case 'record-loud': return <LoudBars st={st} />;
    case 'see-focus': return <FocusPicture st={st} lv={lv} />;
    case 'record-take': return <TakeLadder st={st} />;
    case 'record-panel': return <PanelAbove st={st} lv={lv} />;
    case 'build-stream': return <StreamBars st={st} lv={lv} />;
    default: return null;
  }
}
const Svg = ({ label, h = 200, children }: { label: string; h?: number; children: ReactNode }) => <div className="lab__svgwrap"><svg className="ch__svg" viewBox={`0 0 600 ${h}`} role="img" aria-label={label}>{children}</svg></div>;
function EqCurve({ st, lv }: { st: CState; lv: number }) {
  const S = CH.Hear.guitarNet(st, lv), ref = useMemo(() => CH.Hear.guitarThirds(), []), X = (f: number) => 40 + (Math.log10(f / 20) / 3) * 540, Y = (d: number) => 180 - ((CH.clamp(d, -42, 18) + 42) / 60) * 160, tol = [0, 4, 3, 2, 1.5][lv]!, byp = !!st['byp'];
  const path = (fn: (f: number) => number) => Array.from({ length: 121 }, (_x, i) => { const f = 20 * 1000 ** (i / 120); return `${i ? 'L' : 'M'}${X(f).toFixed(1)} ${Y(fn(f)).toFixed(1)}`; }).join('');
  const bw = 540 / CH.Hear.THIRDS.length - 3;
  const outline = CH.Hear.THIRDS.map((f, i) => `${i ? 'L' : 'M'}${(X(f) - bw / 2).toFixed(1)} ${Y(ref[i]!).toFixed(1)}L${(X(f) + bw / 2).toFixed(1)} ${Y(ref[i]!).toFixed(1)}`).join('');
  return <Svg h={214} label={`A ⅓-octave analyser of the guitar through the channel${byp ? ' with your EQ bypassed' : ''}, the untouched guitar's outline, and the EQ curves; judged ±${tol} dB from 100 Hz to 10 kHz.`}>
    <rect className="ch__band" x={X(100)} y={10} width={X(10000) - X(100)} height={170} />
    {[-36, -24, -12, 0, 12].map((d) => <g key={d}><line className="ch__grid" x1={40} x2={580} y1={Y(d)} y2={Y(d)} /><text className="ch__t" x={34} y={Y(d) + 4} textAnchor="end">{d > 0 ? '+' : ''}{d}</text></g>)}
    {CH.Hear.THIRDS.map((f, i) => { const v = ref[i]! + S.bf(f) + (byp ? 0 : S.yf(f)); return <rect key={f} className="ch__bar" x={X(f) - bw / 2} y={Y(v)} width={bw} height={Math.max(0, Y(-42) - Y(v))} />; })}
    <path className="ch__ref" d={outline} />
    {lv === 1 && <path className="ch__bad" d={path(S.bf)} />}<path className="ch__yours" d={path(S.yf)} />{lv === 1 && <path className="ch__net" d={path((f) => S.bf(f) + S.yf(f))} />}
    {[100, 1000, 10000].map((f) => <text key={f} className="ch__t" x={X(f)} y={206} textAnchor="middle">{CH.fmtHz(f)}Hz</text>)}
    <text className="ch__t" x={44} y={22}>{lv === 1 ? 'bars: the guitar via the channel · outline: untouched · dashed: their EQ · thin: yours · thick: the sum' : 'bars: the guitar via the channel · outline: untouched · thin: your EQ'}</text></Svg>;
}
/** The guitar through their EQ and yours, live on Web Audio biquads; the bypass box switches yours out. Sound starts only from the button. */
function GuitarPlay({ st, lv }: { st: CState; lv: number }) {
  const ref = useRef<{ ac: AudioContext; src: AudioBufferSourceNode; U: BiquadFilterNode[]; you: GainNode; by: GainNode } | null>(null); const [on, setOn] = useState(false);
  const stop = () => { try { ref.current?.src.stop(); } catch { /* already stopped */ } ref.current = null; setOn(false); };
  useEffect(() => () => { stop(); }, []);
  useEffect(() => { const r = ref.current; if (!r) return; const n = (k: string) => Number(st[k]), t = r.ac.currentTime, lvx = Math.min(3, lv), U = r.U;
    U[0]!.frequency.setTargetAtTime(Math.max(20, n('hp')), t, 0.02); U[1]!.frequency.setTargetAtTime(n('lsf'), t, 0.02); U[1]!.gain.setTargetAtTime(lvx >= 3 ? n('ls') : 0, t, 0.02);
    [['p1f', 'p1g', 'p1q'], ['p2f', 'p2g', 'p2q'], ['p3f', 'p3g', 'p3q']].forEach(([f, g, q], j) => { const nd = U[2 + j]!; nd.frequency.setTargetAtTime(n(f!), t, 0.02); nd.gain.setTargetAtTime(j === 2 && lvx < 2 ? 0 : n(g!), t, 0.02); nd.Q.setTargetAtTime(n(q!), t, 0.02); });
    U[5]!.frequency.setTargetAtTime(n('hsf'), t, 0.02); U[5]!.gain.setTargetAtTime(n('hs'), t, 0.02); r.you.gain.setTargetAtTime(st['byp'] ? 0 : 1, t, 0.01); r.by.gain.setTargetAtTime(st['byp'] ? 1 : 0, t, 0.01); });
  const play = () => { try {
    const AC = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext; if (!AC) return; const ac = new AC(), x = CH.Hear.guitar(), b = ac.createBuffer(1, x.length, 48000); b.getChannelData(0).set(x);
    const src = ac.createBufferSource(); src.buffer = b; src.loop = true;
    const chain = CH.Hear.guitarBad(lv).map((bd) => { const f = ac.createBiquadFilter(); f.type = bd[0] === 'peak' ? 'peaking' : 'highshelf'; f.frequency.value = bd[1]; f.gain.value = bd[2]; if (bd[0] === 'peak') f.Q.value = bd[3] || 0.7071; return f; });
    const U = (['highpass', 'lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'] as BiquadFilterType[]).map((ty) => { const f = ac.createBiquadFilter(); f.type = ty; if (ty === 'highpass') f.Q.value = -3.0103; return f; });   // Web Audio's high-pass Q is in dB: −3.01 dB = Butterworth
    const gIn = ac.createGain(), you = ac.createGain(), by = ac.createGain(), out = ac.createGain(); out.gain.value = 0.3;
    src.connect(chain[0]!); for (let i = 1; i < chain.length; i += 1) chain[i - 1]!.connect(chain[i]!); chain[chain.length - 1]!.connect(gIn);
    gIn.connect(U[0]!); for (let i = 1; i < U.length; i += 1) U[i - 1]!.connect(U[i]!); U[U.length - 1]!.connect(you); gIn.connect(by); you.connect(out); by.connect(out); out.connect(ac.destination);
    ref.current = { ac, src, U, you, by }; src.start(); setOn(true);
  } catch { stop(); } };
  return <p className="lab__row"><Button onClick={on ? stop : play}>{on ? '■ Stop' : '▶ Play the guitar through the channel'}</Button>{on && <span className="ui-meta" aria-live="polite">Playing{st['byp'] ? ', your EQ bypassed' : ', through your EQ'}…</span>}</p>;
}
function WordLevels({ st }: { st: CState }) {
  const s = CH.Hear.vocalStats(st), lo = -40, Y = (v: number) => 170 - ((CH.clamp(v, lo, 0) - lo) / -lo) * 150;
  return <Svg label="Level of each of the eight sung words after your compressor, against 0 dBFS.">
    <line className="ch__clip" x1={40} x2={580} y1={Y(0)} y2={Y(0)} /><text className="ch__t" x={578} y={Y(0) - 4} textAnchor="end">0 dBFS</text>
    {s.sylR.map((v, i) => <g key={i}><rect className="ch__bar" x={60 + i * 64} y={Y(v)} width={44} height={170 - Y(v)} /><text className="ch__t" x={82 + i * 64} y={186} textAnchor="middle">{i + 1}</text></g>)}
    <text className="ch__t" x={44} y={14}>word levels (dB RMS) · peak {CH.round(s.peak, 1)} dBFS · range {CH.round(s.range, 1)} dB</text></Svg>;
}
function MoireView({ st, lv }: { st: CState; lv: number }) {
  const ref = useRef<HTMLCanvasElement>(null), w = 320, h = 180;
  const R = useMemo(() => CH.See.moire({ P: CH.See.M_PITCH[lv]!, st: Number(st['st']), g: Number(st['g']), f: Number(st['f']), N: Number(st['N']), sf: Number(st['sf']) }), [st, lv]);
  useEffect(() => { const c = ref.current?.getContext('2d'); if (!c) return; const img = c.createImageData(w, h); img.data.set(CH.See.moireImage(R, w, h)); c.putImageData(img, 0, 0); }, [R]);
  return <div className="lab__svgwrap"><canvas ref={ref} width={w} height={h} className="ch__canvas" role="img" aria-label={`What the sensor records of the LED wall, computed pixel by pixel: moiré strength ${CH.round(R.sev, 3)}.`} /></div>;
}
function PromoSlide({ st, lv }: { st: CState; lv: number }) {
  const T = CH.See.promoText(lv), btn = CH.See.buttonText(String(st['ac'])), sim = String(st['sim']); const f = (hx: string) => { if (sim === 'none') return hx; const c = CH.See.hex(hx), d = sim === 'deut' ? CH.See.deut(c) : (() => { const l = Math.round(255 * (CH.See.lum(c) ** (1 / 2.2))); return [l, l, l]; })(); return `rgb(${d.join(',')})`; };
  return <Svg h={338} label={`The promo slide in your colours${sim === 'deut' ? ', as a viewer with deuteranopia sees it' : sim === 'gray' ? ', in brightness only' : ''}.`}>
    <rect width={600} height={338} fill={f(String(st['bg']))} /><circle cx={525} cy={60} r={112} fill={f(String(st['ac']))} opacity={0.18} />
    <text x={44} y={128} fontSize={46} fontWeight={900} fill={f(String(st['hd']))} textLength={T.title.length > 14 ? 510 : undefined} lengthAdjust="spacingAndGlyphs">{T.title}</text>
    <text x={46} y={166} fontSize={18} fontWeight={600} fill={f(String(st['bd']))}>{T.sub}</text><text x={46} y={192} fontSize={13.5} fill={f(String(st['bd']))}>{T.small}</text>
    <rect x={44} y={226} width={226} height={52} rx={26} fill={f(String(st['ac']))} /><text x={157} y={259} fontSize={18} fontWeight={900} fill={f(btn)} textAnchor="middle">SAVE YOUR SEAT</text></Svg>;
}
function LuxWalk({ st, lv }: { st: CState; lv: number }) {
  const R = CH.Reach.photo(st); if (!R) return <p className="ui-meta">This fixture can’t be drawn — check your work to see what the camera thinks of it.</p>;
  const L = CH.Reach.LUX[lv]!, Ym = Math.max(L[1] * 1.3, R.E * 1.1), X = (m: number) => 40 + ((m + 1.5) / 3) * 540, Y = (v: number) => 170 - (CH.clamp(v, 0, Ym) / Ym) * 150;
  const d = Array.from({ length: 61 }, (_x, i) => { const m = -1.5 + i / 20; return `${i ? 'L' : 'M'}${X(m).toFixed(1)} ${Y(R.E * R.prof(m)).toFixed(1)}`; }).join('');
  return <Svg label="Illuminance on her face across her 3 m walk, against the target band.">
    <rect className="ch__band" x={40} y={Y(L[1])} width={540} height={Y(L[0]) - Y(L[1])} /><path className="ch__net" d={d} />
    <text className="ch__t" x={40} y={192}>−1.5 m</text><text className="ch__t" x={580} y={192} textAnchor="end">+1.5 m</text><text className="ch__t" x={44} y={14}>lux across her walk · band = target {L[0]}–{L[1]} lx</text></Svg>;
}
function Rt60({ st, lv }: { st: CState; lv: number }) {
  const R = CH.Build.room(st), T = lv >= 3 ? [0.2, 0.4] : lv === 2 ? [0.2, 0.45] : [0.15, 0.6], Y = (t: number) => 170 - (CH.clamp(t, 0, 1.6) / 1.6) * 150;
  return <Svg label="Reverb time RT60 at 125 Hz, 500 Hz and 2 kHz against the target band.">
    <rect className="ch__band" x={40} y={Y(T[1]!)} width={540} height={Y(T[0]!) - Y(T[1]!)} />
    {[0, 0.4, 0.8, 1.2, 1.6].map((t) => <g key={t}><line className="ch__grid" x1={40} x2={580} y1={Y(t)} y2={Y(t)} /><text className="ch__t" x={34} y={Y(t) + 4} textAnchor="end">{t.toFixed(1)}</text></g>)}
    {['125 Hz', '500 Hz', '2 kHz'].map((lab, b) => <g key={lab}><rect className="ch__bar" x={110 + b * 160} y={Y(R[b]!.rt)} width={80} height={170 - Y(R[b]!.rt)} /><text className="ch__t" x={150 + b * 160} y={Y(R[b]!.rt) - 6} textAnchor="middle">{CH.round(R[b]!.rt, 2)} s</text><text className="ch__t" x={150 + b * 160} y={190} textAnchor="middle">{lab}</text></g>)}
    <text className="ch__t" x={44} y={14}>reverb time (Sabine) · band = target</text></Svg>;
}
function RfPlan({ st, lv }: { st: CState; lv: number }) {
  const A = CH.Build.rf(st, lv), X = (f: number) => 20 + ((f - 516) / 28) * 560, bad = new Set(A.conf.map((c) => c.i));
  return <Svg label="The tuning range with your microphone carriers, their intermodulation products and anything else on the air.">
    {A.tv && <rect className="ch__tv" x={X(524)} y={30} width={X(530) - X(524)} height={140} />}
    {A.P.filter((p) => p.f > 516 && p.f < 544).map((p, i) => <line key={i} className={p.o === 3 ? 'ch__im3' : 'ch__im5'} x1={X(p.f)} x2={X(p.f)} y1={170} y2={p.o === 3 ? 140 : 152} />)}
    {A.ifb && <line className="ch__iem" x1={X(A.ifb)} x2={X(A.ifb)} y1={170} y2={50} />}
    {A.F.map((f, i) => <g key={i}><line className={bad.has(i) ? 'ch__carrier is-bad' : 'ch__carrier'} x1={X(f)} x2={X(f)} y1={170} y2={64 + (i % 2) * 16} /><text className="ch__t" x={X(f)} y={58 + (i % 2) * 16} textAnchor="middle">M{i + 1}{bad.has(i) ? '✗' : ''}</text></g>)}
    {[518, 522, 526, 530, 534, 538, 542].map((f) => <text key={f} className="ch__t" x={X(f)} y={190} textAnchor="middle">{f}</text>)}
    <text className="ch__t" x={24} y={14}>carriers (tall) · 3rd-order products{A.o5 ? ' · 5th-order (short)' : ''}{A.tv ? ' · TV channel (shaded)' : ''} · MHz</text></Svg>;
}
function LoudBars({ st }: { st: CState }) {
  const R = CH.Record.loudness(st), tot = R.seg.reduce((s, x) => s + x.d, 0), Y = (v: number) => 170 - ((CH.clamp(v, -36, 0) + 36) / 36) * 150; let x = 40;
  return <Svg label="Loudness of each programme segment against the −24 LKFS target, with the integrated loudness.">
    <rect className="ch__band" x={40} y={Y(-22)} width={540} height={Y(-26) - Y(-22)} />
    {R.seg.map((s) => { const w = (s.d / tot) * 540, x0 = x; x += w; return <g key={s.sn}><rect className={s.locked ? 'ch__bar is-locked' : 'ch__bar'} x={x0 + 2} y={Y(s.L)} width={w - 4} height={170 - Y(s.L)} /><text className="ch__t" x={x0 + w / 2} y={190} textAnchor="middle">{s.sn}</text></g>; })}
    <line className="ch__int" x1={40} x2={580} y1={Y(R.I)} y2={Y(R.I)} /><text className="ch__t" x={44} y={14}>loudness by segment (LKFS) · dashed: integrated {CH.round(R.I, 1)} · band: −24 ±2</text></Svg>;
}

/** see-focus, the camera's picture (restored 18 Nov 2026 from the reference's draw(), read as text): an interviewee at 2.5 m in front
 *  of a bookshelf at 6 m, rendered through your settings: background and subject blur from the thin-lens blur circles, the hand's motion
 *  blur from the shutter, exposure and white balance as a colour matrix, ISO as grain, mains flicker as rolling bands (six updates a
 *  second, none under reduced motion). The HUD says every value in words. */
const cctRGB = (K: number): [number, number, number] => { const t = K / 100; const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592), g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492), b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307; const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))); return [c(r), c(g), c(b)]; };
function FocusPicture({ st, lv }: { st: CState; lv: number }) {
  const id = useId().replace(/:/g, ''); const C = CH.See.camera(st, lv); const W = 800, H = 450, k = W / 1920, coc = 0.025;
  const [phase, setPhase] = useState(0);
  useEffect(() => { if (!C.flick || C.resid < 0.005 || matchMedia('(prefers-reduced-motion: reduce)').matches) return; const iv = setInterval(() => setPhase((p) => p + (2 * Math.PI * 120) / C.fps), 1000 / 6); return () => clearInterval(iv); }, [C.flick, C.fps, C.resid]);
  const a = cctRGB(3200), bw = cctRGB(Number(st['wb'])); let gains = [0, 1, 2].map((i) => Math.pow(a[i]! / Math.max(1, bw[i]!), 2.2)); const gm = Math.max(...gains), e = Math.pow(2, CH.clamp(C.dEV, -5, 4));
  gains = gains.map((g) => CH.round((g / gm) * e * (gm > 1.4 ? 1.15 : 1), 4));
  const nz = 0.035 * (Number(st['iso']) / 800) * (C.dEV < 0 ? Math.pow(2, -C.dEV / 2) : 1); const sharp = C.bs <= coc; const meter = 380, mx = CH.clamp(C.dEV, -3, 3);
  const books = ['#7F1D1D', '#1E3A8A', '#14532D', '#CA8A04', '#3F3F46', '#9A3412'];
  return <div className="lab__svgwrap"><svg className="ch__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`The camera’s picture through your settings: ${sharp ? 'her eyes are sharp' : 'she is soft'}, exposure ${C.dEV > 0 ? '+' : ''}${CH.round(C.dEV, 1)} stops, white balance ${Math.round(C.wbErr)} mired off${C.flick ? `, flicker ${CH.round(C.resid * 100, 1)}%` : ''}.`} data-testid="see-focus-picture">
    <defs>
      <filter id={`${id}bg`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation={CH.round((C.bbPx * k) / 2.4, 2)} /></filter>
      <filter id={`${id}su`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={CH.round((C.bsPx * k) / 2.4, 2)} /></filter>
      <filter id={`${id}ha`} x="-60%" y="-20%" width="220%" height="140%"><feGaussianBlur stdDeviation={`${CH.round(Math.max((C.hand * k) / 2.2, (C.bsPx * k) / 2.4), 2)} ${CH.round((C.bsPx * k) / 2.4, 2)}`} /></filter>
      <filter id={`${id}gr`}><feColorMatrix type="matrix" values={`${gains[0]} 0 0 0 0 0 ${gains[1]} 0 0 0 0 0 ${gains[2]} 0 0 0 0 0 1 0`} /></filter>
      <filter id={`${id}nz`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={1} seed={3} /><feColorMatrix type="saturate" values="0.2" /></filter>
      <linearGradient id={`${id}fl`} x1="0" y1="0" x2="0" y2="1">{Array.from({ length: 13 }, (_x, i) => { const y = i / 12; return <stop key={i} offset={y} stopColor="#000" stopOpacity={CH.round(0.5 + 0.5 * Math.cos(2 * Math.PI * 1.9 * y + phase), 3)} />; })}</linearGradient>
    </defs>
    <g filter={`url(#${id}gr)`}>
      <g filter={`url(#${id}bg)`}><rect x={-20} y={-20} width={840} height={490} fill="#8C7A68" />
        {[0, 1, 2, 3].map((sh) => { const yy = 40 + sh * 95; return <g key={sh}><rect x={440} y={yy + 70} width={340} height={10} fill="#5B4636" />{Array.from({ length: 14 }, (_x, b) => <rect key={b} x={446 + b * 23} y={yy + 12 + ((b * 7) % 13)} width={18} height={58 - ((b * 7) % 13)} fill={books[(b + sh) % 6]} />)}</g>; })}
        <rect x={60} y={60} width={150} height={190} fill="#C9D6E3" /><rect x={70} y={70} width={130} height={170} fill="#E8EEF4" /><circle cx={330} cy={150} r={34} fill="#FFE8B0" /><rect x={326} y={184} width={8} height={120} fill="#3F3F46" /></g>
      <g filter={`url(#${id}su)`}><path d="M150 450 C160 350 230 318 320 312 C410 318 480 350 492 450 Z" fill="#1E3A5F" /><rect x={296} y={262} width={48} height={60} fill="#C68B64" /><ellipse cx={320} cy={214} rx={62} ry={76} fill="#D59A72" />
        <path d="M258 200 C258 140 300 128 322 128 C360 128 386 150 384 206 C372 170 330 160 300 176 C282 186 266 196 258 200 Z" fill="#2B1B12" />
        {[296, 344].map((ex) => <g key={ex}><ellipse cx={ex} cy={212} rx={9} ry={6} fill="#FFFFFF" /><circle cx={ex} cy={212} r={4.5} fill="#1F2937" /><circle cx={ex + 1.5} cy={210.5} r={1.4} fill="#FFFFFF" /></g>)}
        <path d="M304 250 Q320 262 336 250" stroke="#7F1D1D" strokeWidth={3} fill="none" /><circle cx={350} cy={352} r={5} fill="#111827" />
        {Array.from({ length: 6 }, (_x, ln) => <rect key={ln} x={230 + ln * 8} y={360} width={4} height={40} fill={ln % 2 ? '#F8FAFC' : '#0F172A'} />)}</g>
      <g filter={`url(#${id}ha)`}><ellipse cx={520} cy={380} rx={30} ry={22} fill="#D59A72" /><rect x={490} y={390} width={40} height={70} fill="#1E3A5F" /></g>
    </g>
    <rect className="ch__noise" x={0} y={0} width={W} height={H} filter={`url(#${id}nz)`} opacity={CH.round(CH.clamp(nz, 0, 0.7), 3)} />
    <rect x={0} y={0} width={W} height={H} fill={`url(#${id}fl)`} opacity={CH.round(CH.clamp(C.resid * 2.2, 0, 0.8), 3)} />
    <g className="ch__hud"><rect x={0} y={0} width={W} height={30} fill="#000" opacity={0.55} />
      <text x={10} y={21} fill="#F8FAFC" fontSize={14} fontWeight={800}>f/{String(st['N'])} · 1/{String(st['sh'])} ({Math.round(C.ang)}°) · ISO {String(st['iso'])} · ND {String(st['nd'])} · {String(st['wb'])} K · {C.fps}p · {String(st['fl'])} mm</text>
      <rect x={meter} y={H - 34} width={240} height={26} rx={6} fill="#000" opacity={0.6} />
      {[-3, -2, -1, 0, 1, 2, 3].map((s2) => <line key={s2} x1={meter + 20 + (s2 + 3) * 33.3} x2={meter + 20 + (s2 + 3) * 33.3} y1={H - 30} y2={H - 22} stroke="#CBD5E1" />)}
      <path d={`M${meter + 20 + (mx + 3) * 33.3} ${H - 20} l-6 10 h12 Z`} fill={Math.abs(C.dEV) <= 0.5 ? '#34D399' : '#FBBF24'} />
      <text x={meter + 120} y={H - 38} textAnchor="middle" fill="#F8FAFC" fontSize={13} fontWeight={800}>exposure {C.dEV > 0 ? '+' : ''}{CH.round(C.dEV, 1)} stops</text>
      {sharp && <rect x={250} y={130} width={140} height={170} fill="none" stroke="#34D399" strokeWidth={2} strokeDasharray="8 5" />}
      <text x={10} y={H - 12} fill={sharp ? '#34D399' : '#F87171'} fontSize={14} fontWeight={800}>{sharp ? 'FOCUS ✓ on her eyes' : 'FOCUS ✗ — she is soft'}</text></g>
  </svg></div>;
}

// Restored 18 Nov 2026 from the reference's chal_record.js / chal_build.js draw() (read as text): the vocal take's gain ladder, the
// panel from above, and the stream's budget bars, each computed from the same model the check uses.
function TakeLadder({ st }: { st: CState }) {
  const R = CH.Record.take(st); const psum = (a: number[]) => 10 * Math.log10(a.reduce((x, v) => x + 10 ** (v / 10), 0));
  const cols = [{ n: 'AT THE MIC', u: 'dB SPL', v: [R.loudSPL, R.softSPL, psum([28 - 4.8, st['fan'] ? 42 + (st['fanPos'] === 'rear' ? -20 : 0) : -99])] }, { n: 'MIC OUTPUT', u: 'dBu', v: [R.micLoud, R.micSoft, R.nRoom - Number(st['g']) + 18] },
    { n: `PREAMP (+${st['g']} dB)`, u: 'dBu', v: [R.micLoud + Number(st['g']), R.micSoft + Number(st['g']), R.noise + 18] }, { n: 'CONVERTER', u: 'dBFS', v: [R.peak, R.soft, R.noise] }];
  const Y = (v: number, i: number) => { const lo = i === 0 ? 0 : i === 3 ? -130 : -112, hi = i === 0 ? 130 : i === 3 ? 0 : 18; return 300 - ((CH.clamp(v, lo, hi) - lo) / (hi - lo)) * 228; };
  const marks: [number, string, string][] = [[0, 'ch__mk is-loud', 'chorus'], [1, 'ch__mk is-soft', 'verse'], [2, 'ch__mk is-noise', 'noise']];
  return <Svg h={360} label={`The gain ladder from the singer to the converter: chorus, verse and noise at each stage; chorus peaks ${R.live ? `${CH.round(R.peak, 1)} dBFS` : 'no signal'}.`}>
    {cols.map((c, i) => { const x = 20 + i * 145; return <g key={c.n}>
      <rect className="ch__col" x={x} y={52} width={110} height={248} /><text className="ch__t" x={x + 55} y={20} textAnchor="middle">{c.n}</text><text className="ch__t" x={x + 55} y={318} textAnchor="middle">{c.u}</text>
      {i >= 2 && <g><line className="ch__clip" x1={x} x2={x + 110} y1={Y(i === 3 ? 0 : 18, i)} y2={Y(i === 3 ? 0 : 18, i)} /><text className="ch__t" x={x + 108} y={Y(i === 3 ? 0 : 18, i) + 14} textAnchor="end">clip</text></g>}
      {!R.live && i >= 1 ? <text className="ch__t ch__t--bad" x={x + 55} y={170} textAnchor="middle">no signal</text>
        : marks.map(([k, cls, w]) => { const y = Y(c.v[k]!, i); return <g key={w}><rect className={cls} x={x + 8} y={y - 3} width={94} height={6} /><text className="ch__t" x={x + 55} y={y - 7} textAnchor="middle">{w} {CH.round(c.v[k]!, 0)}</text></g>; })}
      {i < 3 && <text className="ch__t" x={x + 128} y={172} textAnchor="middle">→</text>}</g>; })}
    <text className="ch__t" x={10} y={350}>Signal-to-noise under the verse: {R.live ? `${CH.round(R.soft - R.noise, 1)} dB` : '—'} · direct-to-room {CH.round(R.drr, 1)} dB · typical figures, not a product (CH-01)</text>
  </Svg>;
}
function PanelAbove({ st, lv }: { st: CState; lv: number }) {
  const C = CH.Record.panel(st, lv); const n = C.n; const X = (k: number) => 300 + (k - (n - 1) / 2) * Math.min(C.s * 190, 480 / Math.max(1, n - 1)); const pat = String(st['pat']);
  const lobe = (x: number, y: number) => { if (pat === 'omni') return <circle className="ch__lobe" cx={x} cy={y} r={26} />; let d = ''; for (let a = 0; a <= 72; a += 1) { const th = (a / 72) * 2 * Math.PI, rr = 26 * CH.Record.polar(pat, th); d += `${a ? 'L' : 'M'}${(x + rr * Math.sin(th)).toFixed(1)} ${(y - rr * Math.cos(th)).toFixed(1)}`; } return <path className="ch__lobe" d={`${d}Z`} />; };
  const mY = (i: number) => 120 + Number(st[`d${i}`]) * 0.7;
  return <Svg h={300} label={`The panel from above: ${n} talkers, their microphones and pickup patterns, each channel's average level; the worst leak ${C.wp ? `${CH.Record.PANEL_NM[C.wp[0]]} into ${CH.Record.PANEL_NM[C.wp[1]]}'s mic, ${CH.round(C.worst, 1)} dB` : 'none'}.`}>
    <rect className="ch__table" x={40} y={150} width={520} height={44} rx={10} />
    {Array.from({ length: n }, (_x, i) => { const x = X(i), lv2 = C.lev[i]!, ok = Math.abs(lv2 - C.mean) <= 2; return <g key={i}>
      <circle className="ch__head2" cx={x} cy={96} r={17} /><text className="ch__t" x={x} y={62} textAnchor="middle">{CH.Record.PANEL_NM[i]}</text><text className="ch__t" x={x} y={76} textAnchor="middle">{CH.Record.PANEL_LV[i]} dB SPL @1 m</text>
      <line className="ch__stand" x1={x} x2={x} y1={mY(i)} y2={200} /><circle className="ch__capsule" cx={x} cy={mY(i)} r={5} />{lobe(x, mY(i))}
      <rect className="ch__col" x={x - 24} y={226} width={48} height={12} /><rect className={lv2 > -6 ? 'ch__mk is-hot' : ok ? 'ch__mk is-ok' : 'ch__mk is-off'} x={x - 24} y={226} width={48 * CH.clamp((lv2 + 50) / 50, 0, 1)} height={12} />
      <text className="ch__t" x={x} y={256} textAnchor="middle">{CH.round(lv2, 1)} dBFS</text></g>; })}
    {C.wp && <path className={C.worst > -9.5 ? 'ch__leak is-bad' : 'ch__leak'} d={`M${X(C.wp[0])} 96 Q${(X(C.wp[0]) + X(C.wp[1])) / 2} 44 ${X(C.wp[1])} ${mY(C.wp[1])}`} />}
    <text className="ch__t" x={14} y={20}>FROM ABOVE · worst leak: {C.wp ? `${CH.Record.PANEL_NM[C.wp[0]]} into ${CH.Record.PANEL_NM[C.wp[1]]}’s mic, ${CH.round(C.worst, 1)} dB → comb filter ±${CH.round(C.comb / 2, 1)} dB` : '—'}</text>
    <text className="ch__t" x={14} y={288}>Speech averages (peaks ≈ 12 dB higher) · seats {C.s} m apart · room 150 m³, RT60 0.8 s · typical (CH-01)</text>
  </Svg>;
}
function StreamBars({ st, lv }: { st: CState; lv: number }) {
  const C = CH.Build.stream(st, lv); const bppMin = lv >= 2 ? 0.07 : 0.05, syncW = lv >= 3 ? [45, 15] : [60, 40];
  const rows: [string, number, string, boolean][] = [['Upload used', C.use, `${CH.round(C.use * 100, 0)}% of ${CH.round(C.eff, 1)} Mbps`, C.use <= 0.75], ['Picture (bits/pixel)', C.bpp / 0.15, `${CH.round(C.bpp, 3)} bpp`, C.bpp >= bppMin],
    ['CPU load', C.cpu / 100, `${Math.round(C.cpu)}%`, C.cpu <= 90], ['Mic above game', (C.diff + 5) / 25, `${C.diff >= 0 ? '+' : ''}${C.diff} dB`, C.diff >= 6 && C.diff <= 14], ['Mix peak', (C.pk + 30) / 30, `${CH.round(C.pk, 1)} dBFS`, C.pk <= -1]];
  if (lv >= 2) rows.push(['Lip sync (audio early +)', (C.lead + 100) / 200, `${C.lead > 0 ? '+' : ''}${Math.round(C.lead)} ms`, C.lead <= syncW[1]! && C.lead >= -syncW[0]!]);
  return <Svg h={20 + rows.length * 34} label="Your stream: upload used, picture quality in bits per pixel, CPU load, the audio mix and the lip-sync error.">
    {rows.map(([label, frac, txt, good], i) => { const y = 10 + i * 34; return <g key={label}><text className="ch__t" x={10} y={y + 15}>{label}</text><rect className="ch__col" x={170} y={y} width={300} height={20} />
      <rect className={good ? 'ch__mk is-ok' : 'ch__mk is-hot'} x={170} y={y} width={300 * CH.clamp(frac, 0, 1)} height={20} /><text className={good ? 'ch__t' : 'ch__t ch__t--bad'} x={478} y={y + 15}>{txt}{good ? '' : ' ✗'}</text></g>; })}
  </Svg>;
}

/** Hear the vocal through your compressor (before or after). Sound starts only from the button, at a quiet level. */
function Listen({ st }: { st: CState }) {
  const ctx = useRef<AudioContext | null>(null); const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => () => { void ctx.current?.close(); }, []);
  const play = (which: 'before' | 'after') => { try {
    const AC = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext; if (!AC) return; ctx.current = ctx.current || new AC(); const ac = ctx.current;
    const x = CH.Hear.vocal(), y = which === 'before' ? x : CH.Hear.compress(x, CH.Hear.VFS, { thr: Number(st['thr']), ratio: Number(st['ratio']), att: Number(st['att']), rel: Number(st['rel']), knee: Number(st['knee']), mk: Number(st['mk']) }).y;
    const buf = ac.createBuffer(1, y.length, CH.Hear.VFS); buf.getChannelData(0).set(y.map((v) => CH.clamp(v, -1, 1))); const src = ac.createBufferSource(), g = ac.createGain(); g.gain.value = 0.35; src.buffer = buf; src.connect(g); g.connect(ac.destination);
    src.onended = () => setPlaying(null); setPlaying(which); src.start();
  } catch { setPlaying(null); } };
  return <p className="lab__row"><Button disabled={!!playing} onClick={() => play('before')}>▶ Hear it untouched</Button><Button disabled={!!playing} onClick={() => play('after')}>▶ Hear it through your compressor</Button>{playing && <span className="ui-meta" aria-live="polite">Playing {playing === 'before' ? 'the untouched take' : 'your setting'}…</span>}</p>;
}

// ------------------------------------------------------------------------------------------------------------------- reach-cues
function CueDesk({ lv, factor, done, onFinish }: { lv: number; factor: number; done: boolean; onFinish: (r: Result) => void }) {
  const Q = CH.Reach, S = useMemo(() => Q.song(lv), [lv]), W = useMemo(() => Q.windows(factor), [factor]);
  const [run, setRun] = useState<CH.Reach.CueRun | null>(null); const [t, setT] = useState(0); const t0 = useRef(0); const ref = useRef<CH.Reach.CueRun | null>(null); const [click, setClick] = useState(true);
  const steps = useRef(0); const ac = useRef<AudioContext | null>(null); const sch = useRef<ReturnType<typeof setInterval> | null>(null); const master = useRef<GainNode | null>(null); const useAC = useRef(false);
  const now = () => (useAC.current && ac.current ? ac.current.currentTime - t0.current : performance.now() / 1000 - t0.current);
  const silence = () => { if (sch.current) clearInterval(sch.current); sch.current = null; try { master.current?.disconnect(); } catch { /* gone */ } master.current = null; };
  const wall0 = useRef(0);
  const start = () => { const r = Q.cueStart(S); ref.current = r; useAC.current = false; steps.current = 0; wall0.current = performance.now() / 1000;
    if (click) { try { const AC = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext; if (AC) ac.current = ac.current || new AC(); } catch { ac.current = null; } }
    const a = click ? ac.current : null;
    if (a && a.state === 'suspended') void a.resume().catch(() => undefined);
    if (a && a.state !== 'closed') { useAC.current = true; t0.current = a.currentTime + 0.15; const m = a.createGain(); m.gain.value = 0.22; m.connect(a.destination); master.current = m; const step = band(a, m, S), six = S.beat / 4; let next = 0;
      sch.current = setInterval(() => { while (ref.current && t0.current + next * six < a.currentTime + 0.15) { if (next * six < S.len) { step(next, t0.current + next * six); steps.current += 1; } next += 1; } }, 25); }
    else t0.current = performance.now() / 1000 + 0.15;
    setRun(r); };
  const stop = (abort: boolean) => { const r = ref.current; silence(); if (!r) return; ref.current = null; setRun(null); onFinish(Q.cueFinish(S, r, lv, W, abort)); };
  const fire = (k: number) => { const r = ref.current; if (!r) return; const n = Q.cueFire(S, r, k, now(), lv, W); ref.current = n; setRun(n); };
  useEffect(() => { if (!run) return undefined; let raf = 0;
    const loop = () => { const r = ref.current; if (!r) return;
      // an audio clock that never starts (no output device, or blocked) must not freeze the show: fall back to the wall clock
      if (useAC.current && ac.current && performance.now() / 1000 - wall0.current > 0.8 && ac.current.currentTime - t0.current < -0.1) { silence(); useAC.current = false; t0.current = wall0.current + 0.15; }
      const tt = now(); const n = Q.cueTick(S, r, tt, W); if (n !== r) { ref.current = n; setRun(n); } setT(tt);
      if (tt >= S.len) { stop(false); return; } raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf); }, [run === null]);
  useEffect(() => { if (!run) return undefined; const onKey = (e: KeyboardEvent) => { const k = Number(e.key); if (k >= 1 && k <= 8) { e.preventDefault(); fire(k); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [run === null]);
  useEffect(() => () => { silence(); void ac.current?.close(); }, []);
  const X = (s: number) => 10 + CH.clamp(s / S.len, 0, 1) * 580, next = run ? S.cues.find((c, i) => !run.hits[i] && c.t > t - W[2]) : null;
  return <div className="stack ch__cues" data-testid="cue-desk" data-running={!!run} data-clock={run ? (useAC.current ? 'audio' : 'wall') : undefined} data-steps={steps.current}>
    <div className="lab__svgwrap"><svg className="ch__svg" viewBox="0 0 600 120" role="img" aria-label="The song’s timeline with its sections, the cue points and the playhead.">
      {S.secs.map((s, j) => { const show = lv < 4 || t >= s.t; return <g key={j}><rect className={show ? 'ch__sec' : 'ch__sec is-hidden'} x={X(s.t)} y={40} width={Math.max(1, X(s.t + s.bars * S.bar) - X(s.t) - 2)} height={22} />{show && X(s.t + s.bars * S.bar) - X(s.t) > 44 && <text className="ch__t" x={X(s.t) + 4} y={56}>{s.name.replace('chorus2', 'chorus+').toUpperCase()}</text>}</g>; })}
      {S.cues.map((c, i) => { const h = run?.hits[i]; return <g key={i}><path className={h ? (h.ok && (h.g === 'perfect' || h.g === 'good') ? 'ch__cue is-ok' : 'ch__cue is-bad') : 'ch__cue'} d={`M${X(c.t)} 64 l-5 9 h10 Z`} />{lv === 1 && <text className="ch__t" x={X(c.t)} y={88} textAnchor="middle">{Q.CUE_HINT[c.sec]!.split(' ')[0]}</text>}</g>; })}
      <line className="ch__head" x1={X(t)} x2={X(t)} y1={34} y2={78} />
      <text className="ch__t" x={10} y={22}>{run ? `look ${run.look} ${Q.LOOKS[run.look]?.n || ''} · crowd ${Math.round(run.crowd)}/100` : `${S.bpm} BPM · ${S.cues.length} cues · windows ±${CH.round(W[0], 2)} perfect, ±${CH.round(W[1], 2)} good`}</text>
      {run && next && lv <= 2 && <text className="ch__t" x={10} y={112}>NEXT: {next.sec.replace('chorus2', 'chorus, second half').toUpperCase()} in {Math.max(0, CH.round(next.t - t, 1))} s{lv === 1 ? ` — try ${Q.CUE_HINT[next.sec]}` : ''}</text>}
    </svg></div>
    <div className="ch__keys" role="group" aria-label="Lighting looks, keys 1 to 8">{[1, 2, 3, 4, 5, 6, 7, 8].map((k) => <button key={k} type="button" className="dr__btn ch__key" aria-pressed={run?.look === k} disabled={!run} onClick={() => fire(k)}><b>{k}</b><span>{Q.LOOKS[k]!.n}</span></button>)}</div>
    <p className="ch__msgs" aria-live="polite">{(run?.msg || []).filter((m) => t - m.at < 2.2).map((m, i) => <span key={i} data-tone={m.tone}>{m.txt}</span>)}</p>
    {!done && <p className="lab__row">{run ? <Button onClick={() => stop(true)}>■ Stop (counts as a fail)</Button> : <Button kind="primary" onClick={start}>▶ Start the song</Button>}
      {!run && <label className="ch__check"><input type="checkbox" checked={click} onChange={(e) => setClick(e.target.checked)} /> <span>Play the music (keep it quiet)</span></label>}</p>}
  </div>;
}
