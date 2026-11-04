/**
 * Learn labs (#/learn/labs; #/learn/labs/hear|see|light; #/learn/labs/<SIGNAL lab id>; ?type=<kind> filters the list). A lab is a fault,
 * a simulator and a check. The clock is a guide, never a gate (no lab fails on time). Passing records competency evidence for the
 * perspective in this browser — never a credential, never an authorization to work. The SIGNAL library is fetched from this
 * demonstration's own files on demand.
 */
import { useEffect, useState } from 'react';
import { Tag } from '@empathia/ui';
import type { WorkspaceProps } from '../hardening/lazy.js';
import { OpsHead, param, personaOf } from '../hardening/kit.js';
import { opsPath } from '../hardening/path.js';
import { useConfirm, useUndo } from '../safeguards/Safeguards.js';
import { loadLib } from '../pages/Learn.js';
import { AudioLab, CameraLab, LightLab, Checks, fmt, type Check } from './Instruments.js';
import { initState, evaluate, patchError, mathOk, type SfLab, type SfState } from './signalflow.js';
import { loadLabs, saveLabs, recordLab, resultKey, type LabState } from './store.js';

const INSTRUMENTS = [
  { id: 'hear', title: 'Audio Lab: hear the engineering', domain: 'Audio', kind: 'Instrument', brief: 'The far end hears rumble and the voice is buried. Take out the rumble, bring the consonants forward, and keep the output from surprising anyone.' },
  { id: 'see', title: 'Camera Lab: see the settings', domain: 'Camera', kind: 'Instrument', brief: 'The picture bands under the room lights and the presenter’s hand smears. Fix the shutter, exposure, gain and white balance together.' },
  { id: 'light', title: 'Lighting Lab: shape the light', domain: 'Lighting', kind: 'Instrument', brief: 'The presenter is over-lit and two-coloured and the display behind washes out. Balance key and fill, match the colour, keep spill off the screen.' },
] as const;
const KIND: Record<string, string> = { signalflow: 'Signal flow', physics: 'Physics', network: 'Network', power: 'Power', eq: 'EQ', camera: 'Camera', rf: 'RF', dmx: 'DMX', fill: 'Fill' };
type Lib = { labs: Record<string, SfLab & { type: string }>; labOrder: string[] };

function useLabs(persona: string) {
  const [d, setD] = useState<LabState>(loadLabs);
  return { d, persona, passed: (id: string) => !!d.results[resultKey(persona, id)]?.passed, record: (r: Parameters<typeof recordLab>[1]) => setD(recordLab(persona, r)), restore: (x: LabState) => { saveLabs(x); setD(x); } };
}

export default function Labs({ perspective, hash }: WorkspaceProps) {
  const persona = personaOf(perspective); const id = opsPath(hash)[2] || ''; const L = useLabs(persona);
  const [lib, setLib] = useState<Lib | null>(null); const [err, setErr] = useState<string | null>(null); const [n, setN] = useState(0);
  const needLib = !INSTRUMENTS.some((x) => x.id === id);
  useEffect(() => { if (!needLib || lib) return; let live = true; setErr(null); loadLib().then((j) => { if (live) setLib(j as unknown as Lib); }, (e: Error) => { if (live) setErr(e.message || 'the SIGNAL library did not load'); }); return () => { live = false; }; }, [needLib, n]);   // eslint-disable-line react-hooks/exhaustive-deps
  const inst = INSTRUMENTS.find((x) => x.id === id);
  if (inst) return <Instrument key={inst.id} inst={inst} L={L} />;
  if (err) return <section className="ops"><OpsHead product="learn" kicker="Learn · labs" title="Labs" persona={persona} /><div role="alert" className="ops-refused" data-testid="lib-error"><b>The SIGNAL library could not load.</b> {err}. The Audio, Camera and Lighting labs below work without it. <button type="button" className="ui-btn ui-btn--sm" onClick={() => setN((x) => x + 1)}>Try again</button></div><InstrumentList L={L} /></section>;
  if (id) { if (!lib) return <section className="ops"><OpsHead product="learn" kicker="Learn · labs" title="Loading the lab" persona={persona} /><p role="status" className="ops-note">Loading the SIGNAL library…</p></section>;
    const lab = lib.labs[id]; return lab ? <SignalLab key={id} lab={lab} L={L} /> : <section className="ops"><OpsHead product="learn" kicker="Learn · labs" title="Lab not found" persona={persona} lead={<>There is no lab {id}. <a href="#/learn/labs">All labs</a></>} /></section>; }
  return <LabList lib={lib} L={L} type={param(hash, 'type')} />;
}

function InstrumentList({ L }: { L: ReturnType<typeof useLabs> }) {
  return <ul className="ops-board" data-testid="instruments">{INSTRUMENTS.map((x) => <li key={x.id} className="ops-col"><a className="ops-job" href={`#/learn/labs/${x.id}`} data-lab={x.id}><b>{x.title}</b><span className="ops-meta">{x.domain} · instrument lab</span><span className="ops-note">{x.brief}</span>{L.passed(x.id) ? <Tag tone="ok">passed · competency evidence</Tag> : <Tag tone="muted">not passed yet</Tag>}</a></li>)}</ul>;
}
function LabList({ lib, L, type }: { lib: Lib | null; L: ReturnType<typeof useLabs>; type: string | null }) {
  const confirm = useConfirm(); const undo = useUndo();
  const kinds = lib ? [...new Set(lib.labOrder.map((k) => lib.labs[k]!.type))] : [];
  const list = lib ? lib.labOrder.filter((k) => !type || lib.labs[k]!.type === type) : [];
  const mine = Object.values(L.d.results).filter((r) => r.persona === L.persona && r.passed).length;
  return (
    <section className="ops" data-testid="labs">
      <OpsHead product="learn" kicker="Learn · labs" title="Labs" persona={L.persona} lead={<>A fault, a simulator and a check. Change the system, watch the result, do the math, then record your result. Passing is competency evidence — never a credential, never an authorization to work.</>}
        actions={<button type="button" className="ui-btn ui-btn--quiet" disabled={!mine} data-testid="labs-reset" onClick={() => confirm.ask({ key: 'labs.reset', title: 'Clear your lab results?', object: 'clear results', actionLabel: 'Clear the results', consequence: <>Your {mine} passed lab result(s) in this browser are removed, and with them the lab evidence on your internal competency record.</>, onConfirm: () => { const prev = structuredClone(L.d); L.restore({ v: 1, results: Object.fromEntries(Object.entries(L.d.results).filter(([, r]) => r.persona !== L.persona)) }); undo.offer({ label: 'your lab results were cleared', undo: () => L.restore(prev) }); } })}>Clear my results</button>} />
      {undo.bar}
      <p className="ops-note"><b>{mine}</b> lab(s) passed as {L.persona}.</p>
      <h2>Instrument labs</h2><InstrumentList L={L} />
      <h2>SIGNAL fault labs{lib ? ` · ${lib.labOrder.length}` : ''}</h2>
      {!lib ? <p role="status" className="ops-note">Loading the SIGNAL library…</p> : <>
        <nav className="ops-tabs" aria-label="Kind of lab"><a href="#/learn/labs" aria-current={!type ? 'page' : undefined}>Every lab ({lib.labOrder.length})</a>{kinds.map((k) => <a key={k} href={`#/learn/labs?type=${k}`} aria-current={type === k ? 'page' : undefined}>{KIND[k] || k} ({lib.labOrder.filter((x) => lib.labs[x]!.type === k).length})</a>)}</nav>
        <ul className="ops-board" data-testid="signal-labs">{list.map((k) => { const x = lib.labs[k]!; return <li key={k} className="ops-col"><a className="ops-job" href={`#/learn/labs/${k}`} data-lab={k}><b>{x.title}</b><span className="ops-meta">{KIND[x.type] || x.type} · {x.domain}{x.type === 'signalflow' ? ' · simulator' : ' · calculation check'}</span>{L.passed(k) ? <Tag tone="ok">passed</Tag> : null}</a></li>; })}</ul></>}
      {confirm.dialog}
    </section>
  );
}

function Record({ L, lab, title, domain, ok, mode }: { L: ReturnType<typeof useLabs>; lab: string; title: string; domain: string; ok: boolean; mode: 'simulator' | 'calculation' }) {
  const [said, setSaid] = useState<string | null>(null);
  return (
    <div className="ops-card" data-testid="lab-record"><div className="ops-row">
      <button type="button" className="ui-btn ui-btn--primary" onClick={() => { L.record({ lab, title, domain, passed: ok, mode }); setSaid(ok ? 'Passed and recorded as competency evidence on your internal competency record.' : 'Recorded as an attempt. Every check above must pass; change the system and test again.'); }} data-testid="lab-test">Test my fix and record the result</button>
      {L.passed(lab) ? <Tag tone="ok">passed · competency evidence</Tag> : null}</div>
      <p className="ops-note" role="status" data-testid="lab-said">{said || 'Nothing is recorded until you test your fix.'}</p>
      <p className="ops-meta">Competency evidence for the perspective you are using, in this browser. It is not a credential and never authorizes work: dispatch gates read the competency record, not lab results.</p></div>
  );
}

function Instrument({ inst, L }: { inst: typeof INSTRUMENTS[number]; L: ReturnType<typeof useLabs> }) {
  const [checks, setChecks] = useState<Check[]>([]);
  const Lab = inst.id === 'hear' ? AudioLab : inst.id === 'see' ? CameraLab : LightLab;
  return (
    <section className="ops" data-testid={`lab-${inst.id}`}>
      <OpsHead product="learn" kicker={`Learn · labs · ${inst.domain}`} title={inst.title} persona={L.persona} lead={<>{inst.brief}</>} actions={<a className="ui-btn ui-btn--quiet" href="#/learn/labs">All labs</a>} />
      <p className="ops-meta">{inst.id === 'hear' ? 'Web Audio, processed live in your browser · synthesized sources, no recordings · no microphone is used' : inst.id === 'see' ? 'Illustration of the physics · not a lens model · not a measurement of a camera' : 'Illuminance modeled: inverse square and cosine · not measured'}</p>
      <Lab onState={setChecks} />
      <section className="ops-card" aria-labelledby="ck-h"><h2 id="ck-h">The fix · {checks.filter((c) => c.ok).length} of {checks.length}</h2><Checks checks={checks} /></section>
      <Record L={L} lab={inst.id} title={inst.title} domain={inst.domain} ok={checks.length > 0 && checks.every((c) => c.ok)} mode="simulator" />
    </section>
  );
}

function SignalLab({ lab, L }: { lab: SfLab; L: ReturnType<typeof useLabs> }) {
  const sim = lab.type === 'signalflow' && Array.isArray(lab.nodes);
  const [s, setS] = useState<SfState>(() => (sim ? initState(lab) : { gains: {}, mutes: {}, patches: [] }));
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [perr, setPerr] = useState<string | null>(null);
  const [ans, setAns] = useState<string[]>(() => (lab.math || []).map(() => ''));
  const ev = sim ? evaluate(lab, s) : null; const mathAll = (lab.math || []).every((m, i) => mathOk(m, ans[i] || ''));
  const ok = (ev ? ev.ok : true) && mathAll;
  const lvl = (v: number) => (Number.isFinite(v) ? `${fmt(v)} dB` : 'silent');
  return (
    <section className="ops" data-testid="signal-lab">
      <OpsHead product="learn" kicker={`Learn · labs · ${KIND[lab.type] || lab.type} · ${lab.domain}`} title={lab.title} persona={L.persona} lead={<>{lab.brief}</>} actions={<a className="ui-btn ui-btn--quiet" href="#/learn/labs">All labs</a>} />
      <p className="ops-meta">{lab.time ? `Guide time ${Math.round(lab.time / 60)} minutes — a guide, never a gate. ` : ''}Illustrative models, not measurements.</p>
      {!sim && <p className="ops-note" data-testid="calc-only">The simulator for this kind of lab is not rebuilt in this demonstration yet; the calculation check below is complete, and passing it records calculation-only evidence.</p>}
      {sim && ev && <div className="ops-grid ops-grid--2b">
        <section className="ops-card" aria-labelledby="sf-h"><h2 id="sf-h">The system</h2>
          <div className="ops-table-wrap"><table className="ops-table" data-testid="sf-nodes"><caption className="ui-sr">Every node, its control and the level it reads</caption><thead><tr><th scope="col">Node</th><th scope="col">Fed by</th><th scope="col">Control</th><th scope="col">Level</th></tr></thead>
            <tbody>{lab.nodes.map((n) => { const feeds = [...lab.wires, ...s.patches].filter(([, t]) => t === n.id).map(([f]) => lab.nodes.find((x) => x.id === f)?.label || f); return (
              <tr key={n.id}><th scope="row">{n.label}<div className="ops-meta">{n.kind === 'src' ? `source at ${n.level} dB` : n.kind}</div></th><td className="ops-meta">{feeds.join(', ') || '—'}</td>
                <td>{n.gain ? (n.gain.edit ? <label className="ops-field"><span className="ui-sr">{n.label} gain</span><input type="number" min={n.gain.min} max={n.gain.max} step={n.gain.step} value={s.gains[n.id]} onChange={(e) => setS({ ...s, gains: { ...s.gains, [n.id]: Number(e.target.value) } })} data-testid={`sf-gain-${n.id}`} /> dB</label> : `${s.gains[n.id]} dB (fixed)`) : null}
                  {n.mute ? (n.mute.edit ? <label className="check"><input type="checkbox" checked={!!s.mutes[n.id]} onChange={(e) => setS({ ...s, mutes: { ...s.mutes, [n.id]: e.target.checked } })} /> muted</label> : <span className="ops-meta">{s.mutes[n.id] ? 'muted by a scene (fixed)' : ''}</span>) : null}</td>
                <td>{lvl(ev.levels[n.id]!)}</td></tr>); })}</tbody></table></div>
          <div className="ops-form"><h3>Patch</h3><div className="ops-row">
            <label className="ops-field">From<select value={from} onChange={(e) => setFrom(e.target.value)} data-testid="sf-from"><option value="">Choose…</option>{lab.nodes.filter((n) => n.kind !== 'out').map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}</select></label>
            <label className="ops-field">To<select value={to} onChange={(e) => setTo(e.target.value)} data-testid="sf-to"><option value="">Choose…</option>{lab.nodes.filter((n) => n.kind !== 'src').map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}</select></label>
            <button type="button" className="ui-btn" onClick={() => { const e = patchError(lab, s, from, to); setPerr(e); if (!e) setS({ ...s, patches: [...s.patches, [from, to]] }); }} data-testid="sf-patch">Patch</button></div>
            {perr && <p className="ops-refused" role="alert">{perr}</p>}
            {s.patches.length > 0 && <ul className="ops-list">{s.patches.map(([f, t], i) => <li key={`${f}-${t}`} className="ops-row"><span className="ops-note">{lab.nodes.find((n) => n.id === f)?.label} → {lab.nodes.find((n) => n.id === t)?.label}</span><button type="button" className="ui-btn ui-btn--sm ui-btn--quiet" onClick={() => setS({ ...s, patches: s.patches.filter((_, j) => j !== i) })}>Remove</button></li>)}</ul>}
            <button type="button" className="ui-btn ui-btn--quiet" onClick={() => setS(initState(lab))}>Reset the system</button></div>
        </section>
        <section className="ops-card" aria-labelledby="tg-h"><h2 id="tg-h">Targets</h2><ul className="ops-list" data-testid="sf-targets" aria-live="polite">{ev.results.map((r) => <li key={r.node} className={r.ok ? 'ops-ok' : 'ops-fail'}><b>{r.label}</b> <span className="ops-meta">reads {lvl(r.level)} · needs {r.range}{r.missing.length ? ` · missing ${r.missing.join(', ')}` : ''}</span></li>)}</ul></section>
      </div>}
      {(lab.math || []).length > 0 && <section className="ops-card" aria-labelledby="mt-h"><h2 id="mt-h">Do the math</h2>{lab.math.map((m, i) => (
        <label key={m.q} className="ops-field">{m.q} <span className="ops-meta">({m.unit})</span><input type="number" step="any" value={ans[i]} onChange={(e) => setAns(ans.map((a, j) => (j === i ? e.target.value : a)))} data-testid={`sf-math-${i}`} aria-describedby={`mh-${i}`} />
          <span id={`mh-${i}`} className={ans[i] ? (mathOk(m, ans[i]!) ? 'ops-ok' : 'ops-fail') : 'ops-meta'}>{ans[i] ? (mathOk(m, ans[i]!) ? 'Right.' : `Not yet. Hint: ${m.hint}`) : 'Enter a number.'}</span></label>))}</section>}
      {ok && <p className="ops-note" role="status">{lab.success}</p>}
      <Record L={L} lab={lab.id} title={lab.title} domain={lab.domain} ok={ok} mode={sim ? 'simulator' : 'calculation'} />
    </section>
  );
}
