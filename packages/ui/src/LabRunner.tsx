/**
 * A SIGNAL Fix-It Lab, to the reference's rules (labs.ts): the brief and the flag first, then "Open the lab" (and its clock); the math
 * box; the simulator; "Test the fix" and "Reset lab"; three misses offer "Show me the fix". Kinds drawn here: signal flow, network,
 * power, conduit fill, EQ and timing, camera, DMX, RF, and physics (controls, the live readout, and since 12 Nov the reference's
 * animated canvas drawings, held still under reduced motion).
 * Meters and diagrams are SVG attributes, never inline styles, so the page keeps its content policy.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Notice } from './components.js';
import * as X from './labs.js';
import * as PH from './physics.js';
import { drawPhysics, physHas, physHeight } from './physicsDraw.js';

export const LAB_KINDS_PLAYABLE: ReadonlySet<string> = new Set(['signalflow', 'network', 'power', 'fill', 'eq', 'camera', 'dmx', 'rf', 'physics']);
export const LAB_KIND_WORD: Record<string, string> = { physics: 'Physics in motion', signalflow: 'Signal flow', eq: 'EQ and time', camera: 'Camera', network: 'Network and VLANs', dmx: 'DMX', power: 'Power', rf: 'RF coordination', fill: 'Conduit fill' };
export interface LabData { id: string; type: string; domain: string; title: string; brief: string; flag?: string; time?: number; timeoutWhy?: string; success: string; math: X.MathStep[]; history?: { when: string; title: string; body: string }; [k: string]: unknown }

const fmt = (s: number) => { const t = Math.max(0, Math.ceil(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
type Sim = { check: () => X.Check; view: ReactNode };

type Props = { L: LabData; factor?: number; onRecord?: (pass: boolean, fin: boolean) => void; heading?: 'h2' | 'h4' };
export function LabRunner(p: Props) { const [round, setRound] = useState(0); return <LabInner key={round} {...p} onReset={() => setRound((r) => r + 1)} />; }
function LabInner({ L, factor = 0, onRecord, heading = 'h2', onReset }: Props & { onReset: () => void }) {
  const secs = X.clockFor(L.time, factor);
  const [open, setOpen] = useState(false); const [left, setLeft] = useState(secs || 0); const [misses, setMisses] = useState(0);
  const [v, setV] = useState<X.Verdict | null>(null); const [math, setMath] = useState<Record<number, { v: string; tries: number; ok: boolean; msg: string }>>({});
  const final = !!v?.final; const playable = LAB_KINDS_PLAYABLE.has(L.type);
  useEffect(() => { if (!open || !secs || final) return undefined; const id = setInterval(() => setLeft((l) => l - 1), 1000); return () => clearInterval(id); }, [open, secs, final]);
  const reset = onReset;
  const missing = () => L.math.filter((_, i) => !math[i]?.ok).map((m) => m.q);
  const sim = useSim(L);
  useEffect(() => { if (open && secs && !final && left <= 0 && sim) { const r = X.clockOut(L, sim.check()); setV(r); onRecord?.(false, true); } });
  const test = () => { if (!sim || final) return; const r = X.testFix(L, sim.check(), missing(), misses); setV(r); if (!r.pass) setMisses(misses + 1); onRecord?.(r.pass, r.final); };
  const showFix = () => { if (!sim) return; setV(X.showFix(L, sim.check())); onRecord?.(false, true); };
  const checkStep = (i: number) => { const m = L.math[i]!; const cur = math[i] || { v: '', tries: 0, ok: false, msg: '' }; const n = X.num(cur.v);
    if (n === null) { setMath({ ...math, [i]: { ...cur, ok: false, msg: 'Enter a number.' } }); return; }
    const ok = X.mathRight(m, n); const tries = cur.tries + 1; setMath({ ...math, [i]: { ...cur, tries, ok, msg: ok ? `✓ ${m.why || 'Correct.'}` : `✕ Not yet. ${m.wrong || (tries >= 2 ? 'The equation is shown below.' : 'Put the numbers into the formula above.')}` } }); };
  const H = heading;
  return (
    <article className="stack lab" data-testid="lab" data-lab={L.id} data-kind={L.type} data-state={v?.final ? (v.pass ? 'passed' : 'failed') : open ? 'open' : 'ready'}>
      <p className="lab__k">Fix-It Lab · {LAB_KIND_WORD[L.type] || L.type} · {L.domain}{secs ? <span className="lab__clock" data-testid="lab-clock"> · ⏱ {fmt(open ? left : secs)}</span> : L.time ? ' · untimed here' : ''}</p>
      {H === 'h2' ? <h2 className="build__h">{L.title}</h2> : <h4 className="build__h">{L.title}</h4>}
      <p>{L.brief}</p>
      {L.history && <div className="lab__hist"><p className="lab__k">Science history · {L.history.when}</p><p><b>{L.history.title}</b></p><p>{L.history.body}</p></div>}
      {L.flag && <p className="ui-meta">⚑ {L.flag}: figures and mechanisms here are illustrative and await subject-matter review.</p>}
      {!playable && <Notice tone="info">This kind of lab is not drawn here yet. Its brief and its math are above; the simulator is still to be restored.</Notice>}
      {playable && !open && <p><Button kind="primary" onClick={() => setOpen(true)}>▶ Open the lab{secs ? ` (${fmt(secs)} on the clock)` : ''}</Button></p>}
      {playable && open && <>
        {L.math.length > 0 && <div className="lab__math" data-testid="lab-math"><p className="lab__k">Work it out first</p>
          {L.math.map((m, i) => { const st = math[i]; return <div key={i} className="lab__step" data-ok={!!st?.ok}><p>{i + 1}. {m.q}</p>
            <p className="lab__row"><input className="lab__input" inputMode="decimal" aria-label={m.q} placeholder={m.unit ? `… ${m.unit}` : '…'} value={st?.v || ''} disabled={final} onChange={(e) => setMath({ ...math, [i]: { ...(st || { tries: 0, ok: false, msg: '' }), v: e.target.value } })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); checkStep(i); } }} />{m.unit && <span>{m.unit}</span>}<Button onClick={() => checkStep(i)} disabled={final}>Check</Button></p>
            {st?.msg && <p aria-live="polite">{st.msg}</p>}{(st?.ok || (st?.tries || 0) >= 2) && m.hint && <p className="lab__eq">Equation: {m.hint}</p>}</div>; })}</div>}
        <div className="lab__stage" data-testid="lab-stage">{sim?.view}</div>
        {sim && <p className="lab__live" data-testid="lab-live" data-ok={sim.check().ok}>{sim.check().ok ? 'Every target met on the simulator.' : `${sim.check().why.length} problem${sim.check().why.length === 1 ? '' : 's'} left: ${sim.check().why[0]}`}</p>}
        {!final && <p className="lab__row"><Button kind="primary" onClick={test}>✓ Test the fix</Button><Button onClick={reset}>↺ Reset lab</Button></p>}
      </>}
      {v && <div data-testid="lab-verdict" data-pass={v.pass} data-final={v.final}><Notice tone={v.pass ? 'ok' : 'warn'}><b>{v.head}</b><ul className="dr__lines">{v.lines.filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ul></Notice>
        {v.offerFix && !v.final && <p><Button onClick={showFix}>Show me the fix (ends the lab · not passed)</Button></p>}
        {v.final && !v.pass && <p><Button onClick={reset}>Try again</Button></p>}</div>}
    </article>
  );
}

// --------------------------------------------------------------------------------------------------------- simulators (views)
function useSim(L: LabData): Sim | null {
  switch (L.type) {
    case 'signalflow': return useSf(L as unknown as X.SfLab);
    case 'network': return useNet(L as unknown as X.NetLab);
    case 'power': case 'fill': return usePwr(L as unknown as X.PwrLab);
    case 'eq': return useEq(L as unknown as X.EqLab);
    case 'camera': return useCam(L as unknown as X.CamLab);
    case 'dmx': return useDmx(L as unknown as X.DmxLab);
    case 'rf': return useRf(L as unknown as X.RfLab);
    case 'physics': return usePhy(L as unknown as PH.PhysLab);
    default: return null;
  }
}
const Meter = ({ value, max = 1, mark, bad, label }: { value: number; max?: number; mark?: number; bad?: boolean; label: string }) => { const w = Math.max(0, Math.min(1, value / max)) * 200;
  return <svg className="lab__meter" viewBox="0 0 200 10" role="img" aria-label={label} data-bad={!!bad}><rect className="lab__meter-bg" x="0" y="0" width="200" height="10" rx="3" /><rect className="lab__meter-fg" x="0" y="0" width={w} height="10" rx="3" />{mark != null && <line className="lab__meter-mark" x1={mark * 200} x2={mark * 200} y1="0" y2="10" />}</svg>; };
const dB = (l: number) => (Number.isFinite(l) ? `${Math.round(l * 10) / 10} dB` : 'no signal');

function useSf(L: X.SfLab): Sim {
  const [s, set] = useState(() => X.sfInit(L)); const [sel, setSel] = useState<string | null>(null); const R = X.sfCompute(L, s);
  const cols = [...new Set(L.nodes.map((n) => n.col))].sort((a, b) => a - b);
  const tap = (id: string) => { if (!sel) { setSel(id); return; } if (sel === id) { setSel(null); return; } if (X.sfCanWire(L, sel, id)) { set(X.sfToggle(L, s, sel, id)); setSel(null); } else setSel(id); };
  const view = <>
    <p className="ui-meta">Tap a block, then a block to its right, to connect or disconnect them. Set gains and mutes below. Meters are live.</p>
    <div className="lab__cols">{cols.map((c) => <div key={c} className="lab__col">{L.nodes.filter((n) => n.col === c).sort((a, b) => a.row - b.row).map((n) => { const r = R[n.id]!; const clip = n.kind !== 'src' && Number.isFinite(r.lvl) && r.lvl > 0;
      return <div key={n.id} className="lab__block" data-kind={n.kind}><button type="button" className="lab__node" aria-pressed={sel === n.id} data-node={n.id} data-clip={clip} onClick={() => tap(n.id)}><b>{n.label}</b><span className="ui-meta">{n.kind === 'src' ? `${n.level} dB` : s.mutes[n.id] ? 'muted' : n.gain ? `${s.gains[n.id]! >= 0 ? '+' : ''}${s.gains[n.id]} dB` : n.kind}</span></button>
        {n.kind !== 'src' && <><Meter value={Number.isFinite(r.lvl) ? r.lvl + 60 : 0} max={60} bad={clip} label={`${n.label} level ${dB(r.lvl)}`} /><span className="lab__lvl">{dB(r.lvl)}{clip ? ' · clip' : ''}{n.kind === 'out' && Object.keys(r.srcs).length ? ` · ${Object.keys(r.srcs).map((x) => X.sfNode(L, x).short || X.sfNode(L, x).label).join(' + ')}` : ''}</span></>}</div>; })}</div>)}</div>
    <p className="lab__k">Connections</p><ul className="lab__wires" data-testid="lab-wires">{s.wires.map((k) => { const [a, b] = k.split('>') as [string, string]; return <li key={k}><span>{X.sfNode(L, a).label} → {X.sfNode(L, b).label}</span><Button onClick={() => set(X.sfToggle(L, s, a, b))}>Disconnect</Button></li>; })}</ul>
    {L.nodes.some((n) => n.gain?.edit || n.mute?.edit) && <div className="lab__ctl">{L.nodes.filter((n) => n.gain?.edit).map((n) => <label key={n.id} className="lab__field"><span>{n.label} gain (dB)</span><input className="lab__input" type="number" min={n.gain!.min} max={n.gain!.max} step={n.gain!.step || 1} value={s.gains[n.id]} aria-label={`${n.label} gain in dB`} onChange={(e) => set(X.sfGain(L, s, n.id, Number(e.target.value)))} /></label>)}
      {L.nodes.filter((n) => n.mute?.edit).map((n) => <Button key={n.id} onClick={() => set(X.sfMute(L, s, n.id))}>{s.mutes[n.id] ? `Unmute ${n.label}` : `Mute ${n.label}`}</Button>)}</div>}
  </>;
  return { check: () => X.sfCheck(L, s), view };
}

function useNet(L: X.NetLab): Sim {
  const [s, set] = useState(() => X.netInit(L));
  const view = <>
    <div className="lab__table"><table><caption>{L.switchLabel || 'Switch'}: VLANs</caption><thead><tr><th>VLAN</th><th>Name</th><th>Subnet</th><th>Automatic range</th>{L.showIgmp && <th>Multicast snooping</th>}</tr></thead>
      <tbody>{L.vlans.map((v) => { const c = X.cidr(v.subnet); return <tr key={v.id}><td>{v.id}</td><td>{v.name}</td><td>{v.subnet}</td><td>{v.dhcp ? `${X.n2ip(c.base + v.dhcp[0])} – ${X.n2ip(c.base + v.dhcp[1])}` : 'none'}</td>{L.showIgmp && <td><label className="lab__check"><input type="checkbox" checked={!!s.igmp[v.id]} disabled={v.igmpEdit === false} aria-label={`Multicast snooping on VLAN ${v.id}`} onChange={(e) => set(X.netSetIgmp(L, s, v.id, e.target.checked))} /> on</label></td>}</tr>; })}</tbody></table></div>
    <div className="lab__table"><table><caption>Ports</caption><thead><tr><th>Port</th><th>Device</th><th>VLAN</th><th>Address (fixed)</th><th>Needs</th></tr></thead>
      <tbody>{L.devices.map((d) => { const st = X.netDevice(L, s, d.id); return <tr key={d.id} data-ok={st.ok}><td>{d.port}</td><td>{d.label}{d.mbps ? ` · ${d.mbps} Mb/s${d.multicast ? ' multicast' : ''}` : ''}</td>
        <td><select className="lab__input" aria-label={`${d.label} VLAN`} value={s.vlan[d.id]} disabled={!!d.lock?.includes('vlan')} onChange={(e) => set(X.netSetVlan(L, s, d.id, Number(e.target.value)))}>{L.vlans.map((v) => <option key={v.id} value={v.id}>{v.id} · {v.name}</option>)}</select></td>
        <td>{d.dhcp ? 'automatic (DHCP)' : <input className="lab__input" aria-label={`${d.label} fixed address`} spellCheck={false} value={s.ip[d.id]} disabled={!!d.lock?.includes('ip')} onChange={(e) => set(X.netSetIp(L, s, d.id, e.target.value))} />}</td><td className="ui-meta">{d.note || ''}</td></tr>; })}</tbody></table></div>
    {(L.pairs || []).length > 0 && <ul className="lab__pairs">{(L.pairs || []).map(([a, b]) => { const ok = X.netReach(L, s, a, b); return <li key={a + b} data-ok={ok}>{ok ? '✓' : '✕'} {L.devices.find((d) => d.id === a)!.label} ↔ {L.devices.find((d) => d.id === b)!.label}</li>; })}</ul>}
  </>;
  return { check: () => X.netCheck(L, s), view };
}

function usePwr(L: X.PwrLab): Sim {
  const [s, set] = useState(() => X.pwrInit(L)); const U = X.pwrUnit(L), limit = L.limit || 0.8, cap = L.capWord || (U === 'W' ? 'budget' : 'breaker');
  const view = <>
    <p className="lab__k">{L.header || `${U === 'A' ? 'Amps per circuit' : U === 'W' ? 'Watts per switch' : 'Load per run'} · line at ${Math.round(limit * 100)}% of ${cap} · illustrative`}</p>
    <ul className="lab__bars">{L.circuits.map((c) => { const a = X.pwrDraw(L, s, c); const over = a > c.breaker * limit; return <li key={c.id} data-over={over}><span>{c.label}</span><Meter value={a} max={c.breaker * 1.2} mark={limit / 1.2} bad={over} label={`${c.label}: ${Math.round(a * 10) / 10} of ${c.breaker} ${U}`} /><b>{Math.round(a * 10) / 10} / {c.breaker} {U}</b></li>; })}</ul>
    <div className="lab__ctl">{L.loads.map((l, i) => <label key={i} className="lab__field"><span>{l.label} · {l.watts} {U === 'A' ? 'W' : U}{l.lock ? ' · fixed' : ''}</span><select className="lab__input" aria-label={`${l.label} circuit`} value={s[i]} disabled={!!l.lock} onChange={(e) => set(X.pwrAssign(L, s, i, e.target.value))}><option value="">{L.noneText || (U === 'W' ? '— unpowered —' : '— unplugged —')}</option>{L.circuits.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>)}</div>
    {U === 'A' && <p className="ui-meta">A worksheet for the licensed electrician, who does the work. Nothing here is a procedure.</p>}
  </>;
  return { check: () => X.pwrCheck(L, s), view };
}

function useEq(L: X.EqLab): Sim {
  const [s, set] = useState(() => X.eqInit(L)); const band = L.mode === 'notch' || L.eqToo;
  const W = 400, Hh = 150, fx = (f: number) => 10 + ((Math.log10(f) - Math.log10(20)) / 3) * (W - 20), fy = (d: number) => 10 + ((18 - Math.max(-24, Math.min(18, d))) / 42) * (Hh - 20);
  const pts = (fn: (f: number) => number) => Array.from({ length: 121 }, (_, i) => { const f = 10 ** (Math.log10(20) + (i / 120) * 3); return `${fx(f).toFixed(1)},${fy(fn(f)).toFixed(1)}`; }).join(' ');
  const field = (k: keyof X.EqState, label: string, min: number, max: number, step: number, unit: string) => <label className="lab__field"><span>{label}{unit ? ` (${unit})` : ''}</span><input className="lab__input" type="number" min={min} max={max} step={step} value={s[k]} aria-label={label} onChange={(e) => set(X.eqSet(L, s, k, Number(e.target.value)))} /><input type="range" className="lab__range" min={min} max={max} step={step} value={s[k]} aria-label={`${label} slider`} onChange={(e) => set(X.eqSet(L, s, k, Number(e.target.value)))} /></label>;
  const view = L.mode === 'avsync' ? <>
    <p className="ui-meta">When the picture arrives and when the sound arrives: viewers accept sound up to {L.early ?? 15} ms early or {L.late ?? 45} ms late.</p>
    <svg className="lab__svg" viewBox="0 0 400 60" role="img" aria-label={`Picture at ${L.dt} ms; sound at ${s.delay} ms`}><rect className="lab__win" x={10 + (((L.dt || 0) - (L.early ?? 15)) / eqMax(L)) * 380} y="10" width={(((L.early ?? 15) + (L.late ?? 45)) / eqMax(L)) * 380} height="40" /><line className="lab__pic" x1={10 + ((L.dt || 0) / eqMax(L)) * 380} x2={10 + ((L.dt || 0) / eqMax(L)) * 380} y1="5" y2="55" /><line className="lab__snd" x1={10 + (s.delay / eqMax(L)) * 380} x2={10 + (s.delay / eqMax(L)) * 380} y1="5" y2="55" /></svg>
    <div className="lab__ctl">{field('delay', `Delay on the ${L.delayOn || 'audio'}`, 0, eqMax(L), 0.01, 'ms')}</div></> : <>
    <svg className="lab__svg" viewBox={`0 0 ${W} ${Hh}`} role="img" aria-label={band ? 'Frequency response with the ringing peak and your EQ band' : 'Frequency response of two arrivals with your delay'}><line className="lab__zero" x1="10" x2={W - 10} y1={fy(0)} y2={fy(0)} /><polyline className="lab__before" points={pts((f) => X.eqMeasured(L, X.eqInit(L), f))} /><polyline className="lab__after" points={pts((f) => X.eqHeard(L, s, f))} /></svg>
    <p className="ui-meta">Grey: before. Coloured: what the listener hears now.</p>
    <div className="lab__ctl">{band && <>{field('f', 'Band frequency', 20, 20000, 1, 'Hz')}{field('g', 'Band gain', -18, 6, 0.5, 'dB')}{field('q', 'Band Q (width)', 0.3, 16, 0.1, '')}</>}{L.mode === 'align' && field('delay', `Delay on the ${L.delayOn || 'fill'}`, 0, eqMax(L), 0.01, 'ms')}</div></>;
  return { check: () => X.eqCheck(L, s), view };
}
const eqMax = (L: X.EqLab) => X.eqMaxDelay(L);

function useCam(L: X.CamLab): Sim {
  const [s, set] = useState(() => X.camInit(L)); const m = X.camModel(L, s);
  const sel = (k: keyof X.CamState, label: string, opts: readonly number[], f: (x: number) => string, disabled = false) => <label className="lab__field"><span>{label}</span><select className="lab__input" aria-label={label} value={s[k]} disabled={disabled} onChange={(e) => set(X.camSet(L, s, k, Number(e.target.value)))}>{opts.map((o) => <option key={o} value={o}>{f(o)}</option>)}</select></label>;
  const view = <>
    <svg className="lab__svg lab__cam" viewBox="0 0 400 180" role="img" aria-label={`Camera preview: presenter ${m.blurSubj > (L.tolBlur || 0.8) ? 'soft' : 'sharp'}, wall ${m.moire > (L.tolMoire || 0.45) ? 'with moiré' : 'soft'}, ${m.banding > 0.15 ? 'bands rolling' : 'no bands'}${m.stutter ? ', stuttering' : ''}`}>
      <rect className="lab__wall" x="20" y="10" width="360" height="110" rx="4" /><text className="lab__walltext" x="200" y="72" textAnchor="middle">{L.wallText || 'WALL'}</text>
      {m.moire > (L.tolMoire || 0.45) && Array.from({ length: 18 }, (_, i) => <line key={i} className="lab__moire" x1={20 + i * 20} x2={40 + i * 20} y1="10" y2="120" />)}
      {m.banding > 0.15 && [0, 1, 2].map((i) => <rect key={i} className="lab__band" x="20" y={20 + i * 35} width="360" height="10" />)}
      <circle className="lab__subj" cx="200" cy="115" r="26" data-soft={m.blurSubj > (L.tolBlur || 0.8)} /><rect className="lab__subj" x="170" y="140" width="60" height="40" rx="10" data-soft={m.blurSubj > (L.tolBlur || 0.8)} /></svg>
    <p className="ui-meta">Presenter {L.subject} m from the camera; wall {L.wall} m. {s.wallIn} Hz × {L.mult || 8} = {Math.round(m.cycles * 100) / 100} refresh cycles per exposure.</p>
    <div className="lab__ctl"><label className="lab__field"><span>Focus distance (m)</span><input className="lab__input" type="number" min={0.5} max={30} step={0.1} value={s.focus} aria-label="Focus distance" onChange={(e) => set(X.camSet(L, s, 'focus', Number(e.target.value)))} /></label>
      {sel('iris', 'Iris', X.CAM_OPTS.iris, (x) => `f/${x}`)}{sel('shutter', 'Shutter', X.CAM_OPTS.shutter, (x) => `1/${x}`)}{sel('fps', 'Camera frame rate', X.CAM_OPTS.fps, (x) => `${x}p`)}{sel('wallIn', 'Wall processor input', X.CAM_OPTS.wallIn, (x) => `${x} Hz`, L.wallEditable === false)}</div>
  </>;
  return { check: () => X.camCheck(L, s), view };
}

function useDmx(L: X.DmxLab): Sim {
  const [s, set] = useState(() => X.dmxInit(L)); const span = Math.min(512, Math.max(64, Math.ceil((Math.max(...L.fixtures.map((f, i) => s.addr[i]! + f.foot - 1)) + 16) / 32) * 32));
  const view = <>
    <svg className="lab__svg" viewBox="0 0 400 40" role="img" aria-label="Universe map: each fixture's channels">{L.fixtures.map((f, i) => <rect key={i} className="lab__chan" data-i={i % 4} x={10 + ((s.addr[i]! - 1) / span) * 380} y={6 + (i % 2) * 14} width={(f.foot / span) * 380} height="12" />)}</svg>
    <div className="lab__ctl">{L.fixtures.map((f, i) => <label key={i} className="lab__field"><span>{f.label} · {f.foot} ch</span><input className="lab__input" type="number" min={1} max={512} value={s.addr[i]} aria-label={`${f.label} start address`} onChange={(e) => set(X.dmxSetAddr(L, s, i, Number(e.target.value)))} /></label>)}
      {L.links.map((k, i) => <label key={k.label} className="lab__field"><span>Link {k.label}</span><select className="lab__input" aria-label={`Cable ${k.label}`} value={s.links[i]} onChange={(e) => set(X.dmxSetLink(L, s, i, e.target.value as 'data' | 'mic' | 'y'))}><option value="data">Rated data cable</option><option value="mic">Microphone cable</option><option value="y">Y-split (no splitter)</option></select></label>)}
      <Button onClick={() => set(X.dmxTerm(s))}>{s.term ? '✓ Terminator fitted (remove)' : '＋ Fit a terminator at the end of the line'}</Button></div>
  </>;
  return { check: () => X.dmxCheck(L, s), view };
}

function useRf(L: X.RfLab): Sim {
  const [s, set] = useState(() => X.rfInit(L)); const lo = L.band[0] - 1, hi = L.band[1] + 1, x = (f: number) => 10 + ((f - lo) / (hi - lo)) * 380;
  const view = <>
    <svg className="lab__svg" viewBox="0 0 400 70" role="img" aria-label="Spectrum: your carriers, their intermodulation products and the occupied ranges">
      <rect className="lab__bandok" x={x(L.band[0])} y="5" width={x(L.band[1]) - x(L.band[0])} height="60" />{(L.blocked || []).map((b) => <rect key={b[2]} className="lab__blocked" x={x(b[0])} y="5" width={x(b[1]) - x(b[0])} height="60" />)}
      {X.rfProducts(L, s).filter((p) => p.f >= lo && p.f <= hi).map((p, i) => <line key={i} className="lab__im" x1={x(p.f)} x2={x(p.f)} y1="40" y2="65" />)}{s.map((f, i) => <line key={i} className="lab__tx" x1={x(f)} x2={x(f)} y1="8" y2="65" />)}</svg>
    <p className="ui-meta">Tall lines: your carriers. Short lines: intermodulation products. Shaded: occupied ranges. Band {L.band[0]}–{L.band[1]} MHz (illustrative).</p>
    <div className="lab__ctl">{L.tx.map((t, i) => <label key={t.label} className="lab__field"><span>{t.label} (MHz)</span><input className="lab__input" type="number" step={0.025} min={L.band[0]} max={L.band[1]} value={s[i]} disabled={!!t.lock} aria-label={`${t.label} frequency in MHz`} onChange={(e) => set(X.rfSet(L, s, i, Number(e.target.value)))} /></label>)}</div>
  </>;
  return { check: () => X.rfCheck(L, s), view };
}


/** The simulation drawn live on a canvas (the reference's drawing); one frame per animation frame, a still frame under reduced motion. */
function PhysCanvas({ L, s, label }: { L: PH.PhysLab; s: PH.PState; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null); const st = useRef(s); st.current = s;
  useEffect(() => { const c = ref.current?.getContext('2d'); if (!c) return undefined; const reduced = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches, t0 = performance.now(); let raf = 0;
    const frame = () => { try { drawPhysics(c, L.sim, st.current, L, (performance.now() - t0) / 1000, reduced); } catch { /* a drawing never breaks the lab */ } if (!reduced) raf = requestAnimationFrame(frame); };
    frame(); return () => cancelAnimationFrame(raf); }, [L]);
  useEffect(() => { const c = ref.current?.getContext('2d'); if (c && globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) try { drawPhysics(c, L.sim, s, L, 0, true); } catch { /* still */ } }, [s, L]);
  return <div className="lab__svgwrap"><canvas ref={ref} className="lab__canvas" width={800} height={physHeight(L.sim)} role="img" aria-label={label} data-testid="phys-canvas" /></div>;
}
function usePhy(L: PH.PhysLab): Sim {
  const [s, set] = useState(() => PH.phyInit(L)); const S = PH.SIMS[L.sim];
  const view = !S ? <p>Unknown simulation {L.sim}.</p> : <>
    {physHas(L.sim) && <PhysCanvas L={L} s={s} label={S.aria} />}
    <p className="ui-meta">{S.aria} Illustrative textbook model (RV-39).</p>
    <dl className="lab__read" data-testid="lab-readout">{PH.phyRead(L, s).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    <div className="lab__ctl">{S.controls(L).map((c) => c.kind === 'toggle' ? <label key={c.key} className="lab__check"><input type="checkbox" checked={!!s[c.key]} aria-label={c.label} onChange={(e) => set(PH.phySet(L, s, c.key, e.target.checked))} /> {c.label}</label>
      : c.kind === 'select' ? <label key={c.key} className="lab__field"><span>{c.label}</span><select className="lab__input" aria-label={c.label} value={Number(s[c.key])} onChange={(e) => set(PH.phySet(L, s, c.key, Number(e.target.value)))}>{c.options.map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}</select></label>
      : <label key={c.key} className="lab__field"><span>{c.label}{c.unit ? ` (${c.unit})` : ''}</span><input className="lab__input" type="number" min={c.min} max={c.max} step={c.step} value={Number(s[c.key])} aria-label={c.label} onChange={(e) => set(PH.phySet(L, s, c.key, Number(e.target.value)))} /><input className="lab__range" type="range" min={c.min} max={c.max} step={c.step} value={Number(s[c.key])} aria-label={`${c.label} slider`} onChange={(e) => set(PH.phySet(L, s, c.key, Number(e.target.value)))} /></label>)}</div>
  </>;
  return { check: () => PH.phyCheck(L, s), view };
}
