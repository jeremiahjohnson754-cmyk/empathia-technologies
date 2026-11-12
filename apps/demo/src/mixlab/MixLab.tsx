/**
 * Mix the Stream (#/labs/mix[/<room>]): SIGNAL's flagship lab boss, embedded in S01E10 and in Learn and Service (founder, 12 Nov 2026).
 * A 32-channel console in layers of eight, five rooms built for this lab, scenes of a service, and a boss level on a clock. Every result
 * is kept in this browser only: practice, never a credential. The numbers are a teaching model (model.ts), and the page says so.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PageProps } from '../registry.types.js';
import * as M from './model.js';
import { Fader, Knob, Meter, useClock } from './controls.js';
import { CompGraph, EqGraph, GROUP_COLOR, RoomView, Spectrum, kindColor, srcSays, type Seat } from './views.js';

const KEY = 'empathia.mixlab.v1';
interface Saved { mixes: Record<string, M.Mix>; best: Record<string, Record<string, number>>; boss: Record<string, number> }
const readSaved = (): Saved => { try { const x = JSON.parse(localStorage.getItem(KEY) || 'null'); if (x && typeof x === 'object' && x.mixes && x.best) return { boss: {}, ...x }; } catch { /* storage may be blocked */ } return { mixes: {}, best: {}, boss: {} }; };
const writeSaved = (s: Saved) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* the lab still works without storage */ } };
const dbf = (v: number) => (v <= M.OFF + 0.5 ? '−∞' : `${v > 0 ? '+' : ''}${Math.round(v * 10) / 10}`);

export const HELP: Record<string, [string, string]> = {
  gain: ['Preamp gain', 'Sets how hard the input is driven before anything else. Too little and the channel sits in the noise; too much and its peaks clip. Aim for peaks between −24 and −3 dBFS.'],
  hpf: ['High-pass filter', 'Removes everything below its frequency, 12 dB per octave. On voices and guitars, 80–120 Hz takes out rumble, breath and stage boom without touching the sound you want.'],
  eq: ['Parametric EQ', 'Four bells: drag a node for frequency (left–right) and gain (up–down); scroll on it, or use the arrows, for Q (narrow or wide). Cut what rings or muddies before you boost anything.'],
  comp: ['Compressor', 'Above the threshold, the level rises 1 dB for every “ratio” dB in. Drag the knee for the threshold. Fast attack catches transients (and dulls drums); slow release can pump. 3–6 dB of reduction on a voice is a good start.'],
  fader: ['Channel fader', 'The channel’s level in the mix, after the processing. Mixing is mostly faders.'],
  mute: ['Mute', 'Closes the channel everywhere. Close every mic that is not in use: each open mic adds noise and brings feedback closer.'],
  main: ['Main assign', 'Whether this channel goes to the room’s loudspeakers. Room mics and the click track should not.'],
  stream: ['Stream send', 'This channel’s level on the stream bus, the mix people at home hear. Close mics dominate a stream, so it needs its own balance and some room sound.'],
  wedge: ['Wedge sends', 'What each floor wedge plays to the people on stage. Every dB sent to a wedge from a vocal mic is a dB closer to feedback.'],
  rev: ['Reverb send', 'Sends the channel to the reverb. In a live room the room is the reverb; the stream, which hears close mics, usually needs some.'],
  dly: ['Delay send', 'Sends the channel to the delay effect: echoes timed in milliseconds, often to the song’s tempo (60 000 ÷ BPM).'],
  sub: ['Subwoofer level', 'How loud the subwoofers play compared with the mains. Weight under the music, never a boom that hides the words.'],
  mainbus: ['Main bus', 'The level of everything going to the room’s loudspeakers at once.'],
  streambus: ['Stream bus', 'The level of the stream mix. Aim for about −16 LUFS, with peaks no higher than −1 dBTP.'],
  layer: ['Fader layers', 'A 32-channel console shows its channels eight at a time. Flip layers to reach the rest.'],
  delays: ['Fill delays', 'A loudspeaker nearer the listener than the mains is heard first unless it waits. Delay = the extra distance ÷ 343 m/s, plus about 10 ms so the mains still lead.'],
  room: ['Room view', 'Waves leave each loudspeaker group in its colour; the seats glow by sound pressure (blue quiet, red loud). The yellow ring is the critical distance. Select a seat to read it.'],
  fx: ['Effects rack', 'Reverb and delay, each with its own return to the room and to the stream.'],
};

export default function MixLabPage({ params }: PageProps) {
  return <section className="stack" data-native="" data-testid="mixlab-page"><MixLab initialRoom={params.room} /></section>;
}

export function MixLab({ initialRoom, embedded, onResult }: { initialRoom?: string; embedded?: boolean; onResult?: (room: string, score: number, passed: boolean) => void }) {
  const [saved, setSaved] = useState<Saved>(readSaved);
  const [roomKey, setRoomKey] = useState(M.ROOMS.some((r) => r.key === initialRoom) ? initialRoom! : 'basement');
  const r = M.roomOf(roomKey); const order = M.sceneOrder(r);
  const [mix, setMixState] = useState<M.Mix>(() => saved.mixes[roomKey] || M.freshMix(roomKey));
  const [scene, setScene] = useState<M.Scene>(order[0]!); const [sel, setSel] = useState(0); const [layer, setLayer] = useState(0);
  const [tab, setTab] = useState<'eq' | 'dyn' | 'sends' | 'spec'>('eq'); const [tool, setTool] = useState<'ring' | 'align' | 'pink' | 'seat'>('ring');
  const [seat, setSeat] = useState<Seat | null>(null); const [solo, setSolo] = useState<string | null>(null); const [help, setHelp] = useState('room'); const [said, setSaid] = useState('');
  const [boss, setBoss] = useState<{ start: number; now: number; results: number[] } | null>(null);
  const t = useClock(15);
  useEffect(() => { const m = saved.mixes[roomKey] || M.freshMix(roomKey); setMixState(m); setScene(M.sceneOrder(M.roomOf(roomKey))[0]!); setSel(0); setLayer(0); setSeat(null); setSolo(null); setBoss(null); }, [roomKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const setMix = (f: (m: M.Mix) => M.Mix) => setMixState((m) => { const n = f(m); setSaved((s) => { const x = { ...s, mixes: { ...s.mixes, [n.room]: n } }; writeSaved(x); return x; }); return n; });
  const upd = (i: number, p: Partial<M.Strip>) => setMix((m) => ({ ...m, strips: m.strips.map((s, j) => (j === i ? { ...s, ...p } : s)) }));
  const a = useMemo(() => M.analyse(mix, scene), [mix, scene]); const gs = useMemo(() => M.goals(mix, a), [mix, a]); const sc = M.score(gs);
  const s = mix.strips[sel]!; const c = a.ch[sel]!; const layers = M.layersOf(mix.strips.length); const [l0, l1] = layers[Math.min(layer, layers.length - 1)]!;
  const H = (k: string) => () => setHelp(k);
  // the boss level: the scenes run on a clock; each is scored as it ends
  const per = M.BOSS_SECONDS / order.length; const bossIdx = boss ? Math.min(order.length, Math.floor((boss.now - boss.start) / 1000 / per)) : -1;
  useEffect(() => { if (!boss) return; const id = setInterval(() => setBoss((b) => (b ? { ...b, now: Date.now() } : b)), 250); return () => clearInterval(id); }, [boss?.start]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastIdx = useRef(-1);
  useEffect(() => { if (!boss) { lastIdx.current = -1; return; } if (bossIdx === lastIdx.current) return;
    if (lastIdx.current >= 0) { const done = order[lastIdx.current]!; const sco = M.score(M.goals(mix, M.analyse(mix, done))); setBoss((b) => (b ? { ...b, results: [...b.results, sco] } : b)); }
    lastIdx.current = bossIdx; if (bossIdx < order.length) setScene(order[bossIdx]!); }, [bossIdx]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!boss || boss.results.length < order.length) return; const avg = Math.round(boss.results.reduce((p, q) => p + q, 0) / boss.results.length); const ok = avg >= M.PASS && Math.min(...boss.results) >= 60;
    setSaved((x) => { const n = { ...x, boss: { ...x.boss, [roomKey]: Math.max(x.boss[roomKey] || 0, avg) } }; writeSaved(n); return n; });
    setSaid(ok ? `Boss level cleared: ${avg} on average, no scene under 60. The service went out right, in the room and online.` : `Boss level not cleared: ${avg} on average, lowest scene ${Math.min(...boss.results)}. Every scene needs at least 60 and the average ${M.PASS}.`);
    onResult?.(`${roomKey}-boss`, avg, ok); setBoss(null); }, [boss?.results.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const check = () => { const best = { ...(saved.best[roomKey] || {}), [scene]: Math.max(saved.best[roomKey]?.[scene] || 0, sc) }; const n = { ...saved, best: { ...saved.best, [roomKey]: best } }; setSaved(n); writeSaved(n);
    const all = order.every((x) => (best[x] || 0) >= M.PASS); setSaid(`${M.SCENES.find((x) => x.key === scene)!.label}: ${sc} of 100${sc >= M.PASS ? ' — passed.' : `. ${M.PASS} passes; the goals in red say what is left.`}${all ? ` Every scene of the ${r.tier.toLowerCase()} is passed.` : ''}`);
    if (all) onResult?.(roomKey, Math.round(order.reduce((p, x) => p + (best[x] || 0), 0) / order.length), true); };
  const reset = () => { const m = M.freshMix(roomKey); setMix(() => m); setSaid('The console is back as it was handed over.'); };
  const roomPassed = (k: string) => { const rr = M.roomOf(k); return M.sceneOrder(rr).every((x) => (saved.best[k]?.[x] || 0) >= M.PASS); };
  const pink = [6, 5, 3, 1, 0, 0, -1, -2, -3, -5].map((x) => x + (a.fohBand[5] ?? 0));
  const jit = (db: number, i: number) => db + Math.sin(t * 7 + i * 1.3) * 1.5 + Math.sin(t * 2.3 + i) * 1.2;

  return <div className={`mx${embedded ? ' mx--embedded' : ''}`} data-testid="mixlab" data-room={roomKey} data-scene={scene} data-score={sc}>
    <header className="mx-head">
      <div><p className="mx-kicker">SIGNAL flagship lab boss · Season 1, Episode 10</p><h2 className="mx-title">Mix the Stream</h2>
        <p className="mx-lede">Mix the room and its live stream on a 32-channel console, in five rooms from a basement to a 4,000-seat mega church. Drag the faders and knobs, flip the layers, shape the EQ, ring out the wedges, line up the delays, and keep it right through every scene of the service.</p>
        <p className="mx-note">A teaching model in octave bands, built from textbook formulas (all shown below). It is not a measurement, not a real room, and not any maker’s console. Results stay in this browser: practice, never a credential.</p></div>
      <div className="mx-score" data-testid="mx-score" aria-label={`Scene score ${sc} of 100`}><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" className="mx-score__bg" /><circle cx="18" cy="18" r="15.5" className="mx-score__fg" style={{ strokeDasharray: `${sc * 0.974} 100`, stroke: sc >= M.PASS ? '#22c55e' : sc >= 60 ? '#f59e0b' : '#ef4444' }} /></svg><b>{sc}</b><span>scene score</span></div>
    </header>

    <nav className="mx-rooms" aria-label="Rooms">{M.ROOMS.map((x) => <button key={x.key} type="button" className={`mx-roomcard${x.key === roomKey ? ' on' : ''}`} aria-pressed={x.key === roomKey} onClick={() => setRoomKey(x.key)} data-testid={`mx-room-${x.key}`}>
      <b>{x.tier}</b><span className="mx-stars" aria-label={`difficulty ${x.difficulty} of 5`}>{'★'.repeat(x.difficulty)}{'☆'.repeat(5 - x.difficulty)}</span><span>{x.seats.toLocaleString()} seats · {x.channels} ch</span>{roomPassed(x.key) ? <span className="mx-ok">passed{saved.boss[x.key] ? ` · boss ${saved.boss[x.key]}` : ''}</span> : null}</button>)}</nav>
    <p className="mx-brief"><b>{r.name}.</b> {r.brief} <span className="mx-dim">{r.dims.join(' × ')} m · RT60 {a.rt60} s · critical distance {a.dc} m.</span> {r.traps.map((x) => <span key={x} className="mx-trap">⚠ {x}</span>)}</p>

    <div className="mx-scenes" role="group" aria-label="Scenes of the service">{order.map((x, i) => { const S = M.SCENES.find((y) => y.key === x)!; const b = saved.best[roomKey]?.[x];
      return <button key={x} type="button" className={`mx-scene${x === scene ? ' on' : ''}${b != null && b >= M.PASS ? ' done' : ''}`} aria-pressed={x === scene} disabled={!!boss} onClick={() => setScene(x)} data-testid={`mx-scene-${x}`} title={S.says}><span>{i + 1}</span>{S.label}{b != null ? <em>{b}</em> : null}</button>; })}
      <button type="button" className="mx-btn mx-btn--go" onClick={check} disabled={!!boss} data-testid="mx-check">Check this scene</button>
      {r.difficulty >= 4 && <button type="button" className={`mx-btn mx-btn--boss${boss ? ' on' : ''}`} onClick={() => { if (boss) { setBoss(null); setSaid('Boss level stopped.'); } else { setBoss({ start: Date.now(), now: Date.now(), results: [] }); setSaid(`Boss level: ${order.length} scenes, ${Math.round(per)} seconds each. The service moves on without you.`); } }} data-testid="mx-boss">{boss ? `■ Stop · ${order[Math.min(bossIdx, order.length - 1)] || ''} · ${Math.max(0, Math.ceil(per - ((boss.now - boss.start) / 1000) % per))} s` : '▶ Boss level: run the service live'}</button>}
      <button type="button" className="mx-btn" onClick={reset} disabled={!!boss} data-testid="mx-reset">Reset console</button>
    </div>
    {boss && <div className="mx-bossbar" role="status" data-testid="mx-bossbar"><div style={{ width: `${Math.min(100, ((boss.now - boss.start) / 1000 / M.BOSS_SECONDS) * 100)}%` }} />{boss.results.map((x, i) => <span key={i} className={x >= M.PASS ? 'ok' : x >= 60 ? 'meh' : 'bad'}>{order[i]} {x}</span>)}</div>}
    <p className="mx-said" role="status" data-testid="mx-said">{said || M.SCENES.find((x) => x.key === scene)!.says}</p>

    <div className="mx-stage">
      <div className="mx-roomwrap" onPointerDownCapture={H('room')}>
        <RoomView r={r} m={mix} a={a} t={t} seat={seat} onSeat={(x) => { setSeat(x); setTool('seat'); }} solo={solo} />
        <div className="mx-legend" role="group" aria-label="Loudspeaker groups: select one to hear it alone">{r.groups.filter((g) => g.kind !== 'wedge').map((g) => <button key={g.key} type="button" className={`mx-chip${solo === g.key ? ' on' : ''}`} aria-pressed={solo === g.key} onClick={() => setSolo(solo === g.key ? null : g.key)} style={{ borderColor: GROUP_COLOR[g.kind] }}><i style={{ background: GROUP_COLOR[g.kind] }} />{g.label}</button>)}<span className="mx-chip mx-chip--k"><i style={{ background: GROUP_COLOR.wedge }} />Wedges</span></div>
      </div>
      <ul className="mx-goals" data-testid="mx-goals" aria-label="Goals for this scene">{gs.map((g) => <li key={g.key} className={g.ok ? 'ok' : 'no'} data-goal={g.key} data-ok={g.ok}><b>{g.ok ? '✓' : '✕'} {g.label}</b><span>{g.value}</span><small>{g.why}</small></li>)}</ul>
    </div>

    <section className="mx-console" aria-label="32-channel console">
      <div className="mx-layers" role="group" aria-label="Fader layers" onPointerDownCapture={H('layer')}>{layers.map(([x0, x1], i) => <button key={i} type="button" className={`mx-layer${i === layer ? ' on' : ''}`} aria-pressed={i === layer} onClick={() => setLayer(i)} data-testid={`mx-layer-${i}`}>{x0 + 1}–{x1}</button>)}
        <span className="mx-layers__k">{mix.strips.length} channels · {r.groups.filter((g) => g.kind === 'wedge').length} wedge mixes · reverb · delay · stream bus</span></div>
      <div className="mx-desk">
        <div className="mx-strips" data-testid="mx-strips">{mix.strips.slice(l0, l1).map((st, k) => { const i = l0 + k; const co = a.ch[i]!; const fb = a.feedback.filter((f) => f.i === i); const ring = fb.some((f) => f.margin < 0);
          return <div key={i} className={`mx-strip${i === sel ? ' sel' : ''}${st.mute ? ' muted' : ''}${ring ? ' ring' : ''}`} data-testid={`mx-strip-${i}`} data-clip={co.clip}>
            <button type="button" className="mx-scribble" style={{ background: kindColor(st.kind) }} onClick={() => setSel(i)} aria-pressed={i === sel} title={srcSays(st.kind)}>{i + 1} {st.name}</button>
            <Knob label={`${st.name} gain`} value={st.gain} min={0} max={66} onChange={(v) => upd(i, { gain: v })} fmt={(v) => `${v} dB`} color="#f59e0b" onHelp={H('gain')} testId={`mx-gain-${i}`} />
            <button type="button" className={`mx-tog${st.hpf ? ' on' : ''}`} aria-pressed={!!st.hpf} onClick={() => { upd(i, { hpf: st.hpf ? 0 : M.SOURCES[st.kind].hpf >= 80 ? M.SOURCES[st.kind].hpf : 80 }); setHelp('hpf'); }} data-testid={`mx-hpf-${i}`}>HP {st.hpf || ''}</button>
            <button type="button" className={`mx-tog mx-tog--comp${st.comp.on ? ' on' : ''}`} aria-pressed={st.comp.on} onClick={() => { upd(i, { comp: { ...st.comp, on: !st.comp.on } }); setHelp('comp'); }}>COMP {st.comp.on ? `−${Math.round(co.gr)}` : ''}</button>
            <Knob label={`${st.name} stream send`} value={Math.max(-60, st.stream)} min={-60} max={10} size={30} onChange={(v) => upd(i, { stream: v <= -60 ? M.OFF : v })} fmt={(v) => (v <= -60 ? 'off' : `${v}`)} color="#22d3ee" onHelp={H('stream')} testId={`mx-stream-${i}`} />
            <button type="button" className={`mx-tog${st.main ? ' on' : ''}`} aria-pressed={st.main} onClick={() => { upd(i, { main: !st.main }); setHelp('main'); }} data-testid={`mx-main-${i}`}>MAIN</button>
            <Fader label={`${st.name} fader`} value={Math.max(-60, st.fader)} min={-60} max={10} onChange={(v) => upd(i, { fader: v <= -60 ? M.OFF : v })} fmt={dbf} onHelp={H('fader')} testId={`mx-fader-${i}`} height={140}
              meter={<Meter db={st.mute ? -90 : jit(co.rms, i)} peak={st.mute ? undefined : co.peak} h={140} testId={`mx-meter-${i}`} />} color={kindColor(st.kind)} />
            <span className="mx-strip__v">{dbf(st.fader)}</span>
            <button type="button" className={`mx-mute${st.mute ? ' on' : ''}`} aria-pressed={st.mute} onClick={() => { upd(i, { mute: !st.mute }); setHelp('mute'); }} data-testid={`mx-mute-${i}`}>MUTE</button>
          </div>; })}</div>
        <div className="mx-master">
          <div className="mx-bus"><span>SUB</span><Fader label="Subwoofer level" value={mix.sub} min={-20} max={10} onChange={(v) => setMix((m) => ({ ...m, sub: v }))} fmt={dbf} onHelp={H('sub')} height={140} color="#8b5cf6" testId="mx-sub" /><span>{dbf(mix.sub)}</span></div>
          <div className="mx-bus"><span>MAIN</span><Fader label="Main bus" value={mix.main} min={-40} max={20} onChange={(v) => setMix((m) => ({ ...m, main: v }))} fmt={dbf} onHelp={H('mainbus')} height={140} color="#e2e8f0" testId="mx-mainbus" meter={<Meter db={jit(a.mainRms, 40)} peak={a.mainPeak} h={140} testId="mx-meter-main" />} /><span>{dbf(mix.main)}</span></div>
          <div className="mx-bus"><span>STREAM</span><Fader label="Stream bus" value={mix.stream} min={-40} max={30} onChange={(v) => setMix((m) => ({ ...m, stream: v }))} fmt={dbf} onHelp={H('streambus')} height={140} color="#22d3ee" testId="mx-streambus" meter={<Meter db={jit(M.dbSum(a.stream), 41)} peak={a.streamPeak} h={140} testId="mx-meter-stream" />} /><span>{dbf(mix.stream)}</span></div>
          <div className="mx-lufs" data-testid="mx-lufs"><b>{a.streamLufs}</b><span>LUFS stream</span><b>{a.streamPeak}</b><span>dBTP peak</span><b>{a.fohDbA}</b><span>dB(A) at mix</span></div>
        </div>
      </div>
    </section>

    <section className="mx-detail" aria-label={`Channel ${sel + 1}: ${s.name}`}>
      <div className="mx-detail__head"><b style={{ color: kindColor(s.kind) }}>{sel + 1} · {s.name}</b><span className="mx-dim">{srcSays(s.kind)}</span>
        <span className="mx-tabs" role="tablist">{(['eq', 'dyn', 'sends', 'spec'] as const).map((x) => <button key={x} type="button" role="tab" aria-selected={tab === x} className={`mx-tab${tab === x ? ' on' : ''}`} onClick={() => setTab(x)} data-testid={`mx-tab-${x}`}>{{ eq: 'EQ', dyn: 'Dynamics', sends: 'Sends', spec: 'Spectrum' }[x]}</button>)}</span></div>
      {tab === 'eq' && <div className="mx-eqwrap"><EqGraph s={s} set={(p) => upd(sel, p)} onHelp={setHelp} /><div className="mx-knobrow">{s.eq.map((b, k) => <span key={k} className="mx-band"><b>{k + 1}</b>
        <Knob label={`Band ${k + 1} frequency`} value={b.f} min={20} max={18000} step={10} size={32} onChange={(v) => upd(sel, { eq: s.eq.map((x, j) => (j === k ? { ...x, f: v } : x)) })} fmt={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${v}`)} onHelp={H('eq')} />
        <Knob label={`Band ${k + 1} gain`} value={b.g} min={-15} max={15} step={0.5} size={32} onChange={(v) => upd(sel, { eq: s.eq.map((x, j) => (j === k ? { ...x, g: v } : x)) })} fmt={(v) => `${v > 0 ? '+' : ''}${v}`} color="#22c55e" onHelp={H('eq')} testId={`mx-eqg-${k}`} />
        <Knob label={`Band ${k + 1} Q`} value={b.q} min={0.3} max={10} step={0.1} size={32} onChange={(v) => upd(sel, { eq: s.eq.map((x, j) => (j === k ? { ...x, q: Math.round(v * 10) / 10 } : x)) })} fmt={(v) => `Q${v}`} color="#38bdf8" onHelp={H('eq')} /></span>)}
        <span className="mx-band"><b>HP</b><Knob label="High-pass frequency" value={s.hpf} min={0} max={400} step={5} size={32} onChange={(v) => upd(sel, { hpf: v < 20 ? 0 : v })} fmt={(v) => (v ? `${v}` : 'off')} color="#a78bfa" onHelp={H('hpf')} testId="mx-hpf-knob" /></span></div></div>}
      {tab === 'dyn' && <div className="mx-dyn"><CompGraph s={s} set={(p) => upd(sel, p)} inDb={M.dbSum(c.post) + c.gr} onHelp={setHelp} />
        <div className="mx-knobrow"><button type="button" className={`mx-tog${s.comp.on ? ' on' : ''}`} aria-pressed={s.comp.on} onClick={() => upd(sel, { comp: { ...s.comp, on: !s.comp.on } })} data-testid="mx-comp-on">Compressor {s.comp.on ? 'on' : 'off'}</button>
          <Knob label="Threshold" value={s.comp.thr} min={-50} max={0} onChange={(v) => upd(sel, { comp: { ...s.comp, thr: v, on: true } })} fmt={(v) => `${v} dB`} onHelp={H('comp')} testId="mx-comp-thr" />
          <Knob label="Ratio" value={s.comp.ratio} min={1} max={20} step={0.5} onChange={(v) => upd(sel, { comp: { ...s.comp, ratio: v } })} fmt={(v) => `${v}:1`} color="#f472b6" onHelp={H('comp')} />
          <Knob label="Attack" value={s.comp.att} min={0.5} max={100} step={0.5} onChange={(v) => upd(sel, { comp: { ...s.comp, att: v } })} fmt={(v) => `${v} ms`} color="#38bdf8" onHelp={H('comp')} />
          <Knob label="Release" value={s.comp.rel} min={20} max={1000} step={10} onChange={(v) => upd(sel, { comp: { ...s.comp, rel: v } })} fmt={(v) => `${v} ms`} color="#a78bfa" onHelp={H('comp')} />
          <span className="mx-gr" data-testid="mx-gr" aria-label={`Gain reduction ${Math.round(c.gr * 10) / 10} dB`}><span style={{ height: `${Math.min(100, c.gr * 6)}%` }} /><b>−{Math.round(c.gr * 10) / 10} dB</b></span></div></div>}
      {tab === 'sends' && <div className="mx-knobrow">{s.wedge.map((w, j) => <Knob key={j} label={`Wedge ${j + 1} send`} value={Math.max(-40, w)} min={-40} max={10} onChange={(v) => upd(sel, { wedge: s.wedge.map((x, k) => (k === j ? (v <= -40 ? M.OFF : v) : x)) })} fmt={(v) => (v <= -40 ? 'off' : `${v}`)} color="#f472b6" onHelp={H('wedge')} testId={`mx-wedge-${j}`} />)}
        <Knob label="Reverb send" value={Math.max(-40, s.rev)} min={-40} max={10} onChange={(v) => upd(sel, { rev: v <= -40 ? M.OFF : v })} fmt={(v) => (v <= -40 ? 'off' : `${v}`)} color="#a78bfa" onHelp={H('rev')} testId="mx-rev" />
        <Knob label="Delay send" value={Math.max(-40, s.dly)} min={-40} max={10} onChange={(v) => upd(sel, { dly: v <= -40 ? M.OFF : v })} fmt={(v) => (v <= -40 ? 'off' : `${v}`)} color="#38bdf8" onHelp={H('dly')} />
        <Knob label="Stream send" value={Math.max(-60, s.stream)} min={-60} max={10} onChange={(v) => upd(sel, { stream: v <= -60 ? M.OFF : v })} fmt={(v) => (v <= -60 ? 'off' : `${v}`)} color="#22d3ee" onHelp={H('stream')} /></div>}
      {tab === 'spec' && <div className="mx-specs"><Spectrum bands={c.pre} t={t} label={`${s.name} before processing`} testId="mx-spec-pre" /><Spectrum bands={c.post.map((x) => x + s.fader)} t={t + 3} label={`${s.name} after EQ, compressor and fader`} testId="mx-spec-post" /></div>}
    </section>

    <div className="mx-two">
      <section className="mx-fx" aria-label="Effects rack" onPointerDownCapture={H('fx')}><h3>Effects rack</h3>
        <div className="mx-knobrow"><span className="mx-fxk">REVERB</span>
          <Knob label="Reverb decay" value={mix.fx.revTime} min={0.3} max={6} step={0.1} onChange={(v) => setMix((m) => ({ ...m, fx: { ...m.fx, revTime: Math.round(v * 10) / 10 } }))} fmt={(v) => `${v} s`} color="#a78bfa" />
          <Knob label="Reverb pre-delay" value={mix.fx.revPre} min={0} max={120} onChange={(v) => setMix((m) => ({ ...m, fx: { ...m.fx, revPre: v } }))} fmt={(v) => `${v} ms`} color="#a78bfa" />
          <Knob label="Reverb to the room" value={Math.max(-40, mix.fx.revMain)} min={-40} max={10} onChange={(v) => setMix((m) => ({ ...m, fx: { ...m.fx, revMain: v <= -40 ? M.OFF : v } }))} fmt={(v) => (v <= -40 ? 'off' : `${v}`)} color="#e2e8f0" testId="mx-revmain" />
          <Knob label="Reverb to the stream" value={Math.max(-40, mix.fx.revStream)} min={-40} max={10} onChange={(v) => setMix((m) => ({ ...m, fx: { ...m.fx, revStream: v <= -40 ? M.OFF : v } }))} fmt={(v) => (v <= -40 ? 'off' : `${v}`)} color="#22d3ee" testId="mx-revstream" /></div>
        <div className="mx-knobrow"><span className="mx-fxk">DELAY</span>
          <Knob label="Delay time" value={mix.fx.dlyMs} min={20} max={1200} step={5} onChange={(v) => setMix((m) => ({ ...m, fx: { ...m.fx, dlyMs: v } }))} fmt={(v) => `${v} ms`} color="#38bdf8" />
          <Knob label="Delay feedback" value={mix.fx.dlyFb} min={0} max={90} onChange={(v) => setMix((m) => ({ ...m, fx: { ...m.fx, dlyFb: v } }))} fmt={(v) => `${v}%`} color="#38bdf8" />
          <Knob label="Delay to the room" value={Math.max(-40, mix.fx.dlyMain)} min={-40} max={10} onChange={(v) => setMix((m) => ({ ...m, fx: { ...m.fx, dlyMain: v <= -40 ? M.OFF : v } }))} fmt={(v) => (v <= -40 ? 'off' : `${v}`)} color="#e2e8f0" />
          <Knob label="Delay to the stream" value={Math.max(-40, mix.fx.dlyStream)} min={-40} max={10} onChange={(v) => setMix((m) => ({ ...m, fx: { ...m.fx, dlyStream: v <= -40 ? M.OFF : v } }))} fmt={(v) => (v <= -40 ? 'off' : `${v}`)} color="#22d3ee" />
          <TapTempo onTap={(ms) => setMix((m) => ({ ...m, fx: { ...m.fx, dlyMs: ms } }))} /></div>
        <p className="mx-dim">{mix.fx.dlyMs} ms is one beat at {Math.round(60000 / mix.fx.dlyMs)} BPM. A {mix.fx.revTime} s reverb in a room that already rings for {a.rt60} s adds {mix.fx.revTime > a.rt60 ? 'more than the room has' : 'less than the room has'}.</p></section>

      <section className="mx-tools" aria-label="Commissioning tools"><h3>Commissioning tools</h3>
        <span className="mx-tabs" role="tablist">{(['ring', 'align', 'pink', 'seat'] as const).map((x) => <button key={x} type="button" role="tab" aria-selected={tool === x} className={`mx-tab${tool === x ? ' on' : ''}`} onClick={() => setTool(x)} data-testid={`mx-tool-${x}`}>{{ ring: 'Ring out', align: 'Delay alignment', pink: 'Pink noise RTA', seat: 'SPL at a seat' }[x]}</button>)}</span>
        {tool === 'ring' && <ul className="mx-ring" data-testid="mx-ring">{a.feedback.length ? [...a.feedback].sort((p, q) => p.margin - q.margin).slice(0, 8).map((f, k) => <li key={k} className={f.margin < 0 ? 'bad' : f.margin < 3 ? 'meh' : 'ok'}>
          <button type="button" className="mx-link" onClick={() => { setSel(f.i); setLayer(Math.floor(f.i / M.LAYER)); setTab('eq'); setHelp('eq'); }}>{f.i + 1} {mix.strips[f.i]!.name} → {f.where}</button><b>{f.margin} dB</b><span>rings near {M.BAND_LABEL[f.ring]} Hz</span></li>) : <li>No microphone feeds a loudspeaker yet.</li>}</ul>}
        {tool === 'align' && <div className="mx-align" data-testid="mx-align">{a.delays.length ? a.delays.map((d) => <div key={d.key} className="mx-alignrow"><b>{d.label}</b>
          <Knob label={`${d.label} delay`} value={d.set} min={0} max={200} step={0.5} onChange={(v) => setMix((m) => ({ ...m, delays: { ...m.delays, [d.key]: v } }))} fmt={(v) => `${v} ms`} color="#34d399" onHelp={H('delays')} testId={`mx-delay-${d.key}`} />
          <svg viewBox="0 0 200 30" className="mx-impulse" aria-label={`Arrival: mains at 10 ms after the fill would be in time; the fill is ${d.err} ms ${d.err >= 0 ? 'late' : 'early'} against that`}><line x1={0} y1={26} x2={200} y2={26} className="mx-grid" /><line x1={100} y1={4} x2={100} y2={26} stroke="#22d3ee" strokeWidth={3} /><line x1={Math.max(2, Math.min(198, 100 + d.err * 4))} y1={8} x2={Math.max(2, Math.min(198, 100 + d.err * 4))} y2={26} stroke={Math.abs(d.err) <= 3 ? '#22c55e' : '#ef4444'} strokeWidth={3} /></svg>
          <span className={Math.abs(d.err) <= 3 ? 'mx-ok' : 'mx-bad'}>{Math.abs(d.err) <= 3 ? 'aligned' : `${d.err > 0 ? '+' : ''}${d.err} ms`}</span></div>) : <p className="mx-dim">This room has no fills to delay.</p>}</div>}
        {tool === 'pink' && <><Spectrum bands={a.fohBand} t={t} target={pink} label="The room at the mix position, against a gently sloping house curve" testId="mx-rta" /><p className="mx-dim">The bars are the room at the mix position; the dashed line is a house curve with a little more low end than high. Bring them together with the sub level and the EQ.</p></>}
        {tool === 'seat' && (seat ? <div className="mx-seat" data-testid="mx-seat"><b>{seat.dba} dB(A)</b> at {Math.round(seat.x)} m across, {Math.round(seat.y)} m back.<ul>{seat.arrivals.map((x) => <li key={x.label}><i style={{ background: x.color }} />{x.label}: {x.ms} ms, {x.db} dB(A)</li>)}</ul></div> : <p className="mx-dim">Select a seat in the room view to read its level and when each loudspeaker group arrives there.</p>)}
      </section>
    </div>

    <div className="mx-two">
      <section className="mx-calc" aria-label="The formulas, with this mix's numbers" data-testid="mx-calc"><h3>The formulas, with your numbers</h3><dl>{M.calculations(mix, a, sel).map((x) => <div key={x.name}><dt>{x.name} <code>{x.eq}</code></dt><dd>{x.value}</dd></div>)}</dl></section>
      <section className="mx-help" aria-live="polite" data-testid="mx-help"><h3>{HELP[help]?.[0] || 'What this does'}</h3><p>{HELP[help]?.[1]}</p><Glossary /></section>
    </div>
  </div>;
}

function TapTempo({ onTap }: { onTap: (ms: number) => void }) {
  const taps = useRef<number[]>([]);
  return <button type="button" className="mx-btn" onClick={() => { const now = performance.now(); taps.current = [...taps.current.filter((x) => now - x < 3000), now];
    if (taps.current.length >= 2) { const d = taps.current.slice(1).map((x, i) => x - taps.current[i]!); onTap(Math.round(d.reduce((p, q) => p + q, 0) / d.length / 5) * 5); } }} data-testid="mx-tap">Tap tempo</button>;
}

const TERMS = ['Gain', 'Gain staging', 'Headroom', 'Clipping', 'dBFS', 'Preamp', 'Fader', 'Channel strip', 'Bus', 'Aux send', 'Pre-fader', 'EQ', 'Q', 'Feedback', 'Gain before feedback', 'Monitor', 'Reverberation', 'Echo', 'Comb filter', 'Delay speaker', 'Speed of sound', 'Inverse-square law', 'SPL', 'Decibel', 'LUFS', 'Peak meter', 'Loudness', 'Polar pattern', 'Cardioid', 'Dynamic range'];
let glCache: Promise<{ terms: Array<{ term: string; d: string }> }> | null = null;
function Glossary() {
  const [terms, setTerms] = useState<Array<{ term: string; d: string }>>([]); const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { let live = true; (glCache ||= fetch('signal/glossary.json').then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).catch((e) => { glCache = null; throw e; }))
    .then((g: { terms: Array<{ term: string; d: string }> }) => live && setTerms(g.terms.filter((x) => TERMS.includes(x.term)))).catch(() => { /* the glossary is a help, not a gate */ }); return () => { live = false; }; }, []);
  if (!terms.length) return null; const o = terms.find((x) => x.term === open);
  return <div className="mx-gloss" data-testid="mx-gloss"><p className="mx-kicker">Glossary</p><div className="mx-glosschips">{terms.map((x) => <button key={x.term} type="button" className={`mx-chip${open === x.term ? ' on' : ''}`} aria-pressed={open === x.term} onClick={() => setOpen(open === x.term ? null : x.term)}>{x.term}</button>)}</div>
    {o && <p className="mx-glossd"><b>{o.term}.</b> {o.d} <a href="#/learn/fieldbook">Open the glossary</a></p>}</div>;
}
