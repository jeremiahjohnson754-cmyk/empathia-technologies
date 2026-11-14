/**
 * #/commissioning/instruments/sti — the speech-intelligibility workflow of the instrument bench (./bench/sti.ts): record the STI meter's
 * readings position by position, compare them with the project's policy, and, for a shortfall, raise an intelligibility exception that
 * someone else approves (never for a life-safety system). Kept in this browser so a second perspective can approve; every request and
 * approval is written to the audit trail. No STI is computed here.
 */
import { useState } from 'react';
import { PageHero, Card, Notice, Tag } from '@empathia/ui';
import { parseReadings, evaluate, exceptionRefusal, approvalRefusal, POLICY_PRESETS, type Reading, type Chain, type ExceptionRecord } from '../bench/sti.js';
import { stiPackage, CHAIN_WORD } from '../export/sti.js';
import { ExportMenu } from '../export/ExportMenu.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { personaOf, personaLabel, holds } from '../build/store.js';

const KEY = 'empathia.demo.sti.v1';
interface State { room: string; policy: string; chain: Chain; readings: Reading[]; exceptions: ExceptionRecord[]; synthetic: boolean }
const blank = (): State => ({ room: 'Atlas 4.231 Training', policy: POLICY_PRESETS[0]!.id, chain: 'meter-calibrated', readings: [], exceptions: [], synthetic: false });
const load = (): State => { try { const s = localStorage.getItem(KEY); const d = s ? JSON.parse(s) : null; return d && Array.isArray(d.readings) ? { ...blank(), ...d } : blank(); } catch { return blank(); } };
const store = (s: State) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* the page still works for this visit */ } };
const EXAMPLE = [['Front row', 0.66], ['Centre', 0.63], ['Rear left', 0.61], ['Behind the column', 0.51], ['Rear right', 0.6]] as const;

export function StiBenchPage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective); const { apply } = useWorkspace();
  const [s, set0] = useState<State>(load); const set = (n: State) => { set0(n); store(n); };
  const [errs, setErrs] = useState<string[]>([]); const [why, setWhy] = useState<string[] | null>(null); const [done, setDone] = useState<string | null>(null);
  const [pos, setPos] = useState(''); const [val, setVal] = useState(''); const [occ, setOcc] = useState(false);
  const [reason, setReason] = useState(''); const [measures, setMeasures] = useState(''); const [expires, setExpires] = useState(new Date(Date.now() + 180 * 864e5).toISOString().slice(0, 10));
  const p = POLICY_PRESETS.find((x) => x.id === s.policy) || POLICY_PRESETS[0]!; const ev = evaluate(s.readings, p); const now = new Date().toISOString();
  const audit = (type: string, detail: string, outcome: 'ALLOWED' | 'DENIED') => apply((x) => { x.events.unshift({ at: now, by: persona, type, aggregate: 'STI', detail, outcome }); return null; });
  const canRecord = holds(persona, 'tests.verify.all') || holds(persona, 'test.verify.audio'); const canApprove = holds(persona, 'baseline.approve');
  const addRows = (rs: Reading[], synthetic = false) => set({ ...s, readings: [...s.readings, ...rs].slice(0, 200), synthetic: s.synthetic || synthetic });
  const read = async (f: File | undefined) => { setErrs([]); if (!f) return; if (!/\.csv$/i.test(f.name)) { setErrs(['choose a .csv of position, sti (and occupied, meter)']); return; }
    const r = parseReadings(await f.text(), { meter: 'declared on import', chain: s.chain, occupied: false, at: now }); setErrs(r.errors); addRows(r.readings); };
  const request = () => {
    setWhy(null); setDone(null);
    const e = { policy: p.id, positions: ev.short, reason, measures, expires, requestedBy: persona, at: now };
    const w = [...(canRecord ? [] : [`${personaLabel(persona)} does not record commissioning results`]), ...exceptionRefusal(e, p, ev, now)];
    audit('sti.exception_requested', w.length ? `refused: ${w.join('; ')}` : `${ev.short.join(', ')} until ${expires}`, w.length ? 'DENIED' : 'ALLOWED');
    if (w.length) { setWhy(w); return; }
    const rec: ExceptionRecord = { ...e, id: `IX-${String(s.exceptions.length + 1).padStart(3, '0')}`, approvedBy: null, approvedAt: null };
    set({ ...s, exceptions: [...s.exceptions, rec] }); setDone(`${rec.id} requested; it waits for someone else’s approval`);
  };
  const approve = (rec: ExceptionRecord) => {
    setWhy(null); setDone(null);
    const w = [...(canApprove ? [] : [`${personaLabel(persona)} does not approve exceptions (needs baseline.approve)`]), ...approvalRefusal(rec, persona)];
    audit('sti.exception_approved', w.length ? `${rec.id} refused: ${w.join('; ')}` : rec.id, w.length ? 'DENIED' : 'ALLOWED');
    if (w.length) { setWhy(w); return; }
    set({ ...s, exceptions: s.exceptions.map((x) => (x.id === rec.id ? { ...x, approvedBy: persona, approvedAt: now } : x)) }); setDone(`${rec.id} approved`);
  };
  const made = { role: personaLabel(persona), at: now, build: process.env.DEMO_BUILD_ID || 'dev' };
  return (
    <section className="wk rv" data-native="workspace" data-testid="sti-bench" data-verdict={ev.verdict} data-n={ev.n}>
      <PageHero product="commissioning" icon="mic" eyebrow="Commissioning · instrument bench" title="Speech intelligibility (STI)"
        lede={<>Record what the STI meter reported at each listener position, compare it with the project’s policy, and carry a shortfall only with an exception someone else approves. This page computes no STI and quotes no standard. Acting as <b>{personaLabel(persona)}</b>.</>} />
      <Card icon="settings" title="Policy and measurement" sub="The thresholds are the project’s policy, named and versioned — not a requirement quoted from a standard" testId="sti-policy">
        <div className="rv-target">
          <label className="rv-field"><span>Project policy</span><select value={s.policy} onChange={(e) => set({ ...s, policy: e.target.value })} data-testid="sti-policy-select">{POLICY_PRESETS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label className="rv-field"><span>Measured with</span><select value={s.chain} onChange={(e) => set({ ...s, chain: e.target.value as Chain })} data-testid="sti-chain">{(Object.keys(CHAIN_WORD) as Chain[]).map((k) => <option key={k} value={k}>{CHAIN_WORD[k]}</option>)}</select></label>
          <label className="rv-field"><span>Room</span><input value={s.room} onChange={(e) => set({ ...s, room: e.target.value.slice(0, 80) })} /></label>
        </div>
        <p className="ui-meta">At each position at least {p.minEach.toFixed(2)}; mean at least {p.minMean.toFixed(2)}; at least {p.minPositions} positions.{p.lifeSafety ? ' Life-safety: no exception carries a shortfall.' : ''}</p>
      </Card>
      <Card icon="download" title="Readings" sub="One per listener position, as the meter reported it" testId="sti-readings">
        <div className="rv-actions">
          <label className="ui-btn">Import a CSV<input type="file" accept=".csv,text/csv" className="ui-visually-hidden" data-testid="sti-file" onChange={(e) => { void read(e.target.files?.[0]); e.target.value = ''; }} /></label>
          <button type="button" className="ui-btn" onClick={() => addRows(EXAMPLE.map(([position, sti]) => ({ position, sti, occupied: false, meter: 'SYN-STI-METER-01 (synthetic)', chain: s.chain, at: now })), true)} data-testid="sti-example">Add example readings (synthetic)</button>
          {s.readings.length ? <button type="button" className="ui-btn ui-btn--quiet" onClick={() => set({ ...blank(), policy: s.policy, chain: s.chain, room: s.room })}>Clear</button> : null}
        </div>
        <form className="rv-target" onSubmit={(e) => { e.preventDefault(); const v = Number(val); if (!pos.trim() || !(v >= 0 && v <= 1)) { setErrs(['a position and an STI from 0.00 to 1.00']); return; } setErrs([]); addRows([{ position: pos.trim().slice(0, 40), sti: Math.round(v * 100) / 100, occupied: occ, meter: 'entered by hand', chain: s.chain, at: now }]); setPos(''); setVal(''); }}>
          <label className="rv-field"><span>Position</span><input value={pos} onChange={(e) => setPos(e.target.value)} data-testid="sti-pos" /></label>
          <label className="rv-field"><span>STI</span><input value={val} onChange={(e) => setVal(e.target.value)} inputMode="decimal" data-testid="sti-val" placeholder="0.62" /></label>
          <label className="rv-field"><span>Occupied</span><input type="checkbox" checked={occ} onChange={(e) => setOcc(e.target.checked)} /></label>
          <button type="submit" className="ui-btn" data-testid="sti-add">Add</button>
        </form>
        {errs.length ? <div role="alert" data-testid="sti-errors"><Notice tone="bad">{errs.join(' · ')}</Notice></div> : null}
        {s.synthetic ? <p className="wk-note" data-testid="sti-synthetic">Includes synthetic example readings: they describe no room.</p> : null}
      </Card>
      {ev.n ? <Card icon="chart" title="Against the policy" sub={p.name} testId="sti-result">
        <p><Tag tone={ev.verdict === 'MEETS_POLICY' ? 'ok' : ev.verdict === 'NO_VERDICT' ? 'muted' : 'bad'}>{ev.verdict === 'MEETS_POLICY' ? 'Meets the policy' : ev.verdict === 'NO_VERDICT' ? 'No verdict' : 'Below the policy'}</Tag> <span className="ui-meta">{ev.n} positions · mean {ev.mean?.toFixed(2)} · lowest {ev.min?.toFixed(2)}</span></p>
        {ev.why.length ? <ul className="plain" data-testid="sti-why">{ev.why.map((w) => <li key={w}>{w}</li>)}</ul> : null}
        {ev.flags.length ? <ul className="plain" data-testid="sti-flags">{ev.flags.map((f) => <li key={f}><Tag tone="warn">!</Tag> {f}</li>)}</ul> : null}
        <div className="san__scroll"><table className="pa-table"><thead><tr><th scope="col">Position</th><th scope="col">STI</th><th scope="col">Against the policy</th><th scope="col">Occupied</th><th scope="col">Meter</th></tr></thead>
          <tbody>{ev.readings.map((r, i) => <tr key={i} data-testid="sti-row" data-ok={r.ok}><th scope="row">{r.position}</th><td className="num">{r.sti.toFixed(2)}</td><td><Tag tone={r.ok ? 'ok' : 'bad'}>{r.ok ? 'Meets' : 'Below'}</Tag></td><td>{r.occupied ? 'yes' : 'no'}</td><td>{r.meter} · {CHAIN_WORD[r.chain]}</td></tr>)}</tbody></table></div>
      </Card> : null}
      {ev.verdict === 'BELOW_POLICY' || s.exceptions.length ? <Card icon="shield" title="Intelligibility exception" sub="Carries a measured shortfall at named positions, with a reason, compensating measures and an expiry; approved by someone else; never for life-safety" testId="sti-exception">
        {why ? <div role="alert" data-testid="sti-refused"><Notice tone="bad"><b>Refused.</b> {why.join(' · ')}</Notice></div> : null}
        {done ? <div role="status" data-testid="sti-done"><Notice tone="ok">{done}. Written to the audit trail.</Notice></div> : null}
        {ev.verdict === 'BELOW_POLICY' ? <div className="rv-target">
          <p className="ui-meta">Positions below the policy: <b>{ev.short.join(', ')}</b></p>
          <label className="rv-field"><span>Reason</span><input value={reason} onChange={(e) => setReason(e.target.value)} data-testid="sti-reason" /></label>
          <label className="rv-field"><span>Compensating measures</span><input value={measures} onChange={(e) => setMeasures(e.target.value)} data-testid="sti-measures" /></label>
          <label className="rv-field"><span>Expires</span><input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} /></label>
          <button type="button" className="ui-btn" onClick={request} data-testid="sti-request">Request an exception</button></div> : null}
        {s.exceptions.length ? <ul className="plain">{s.exceptions.map((x) => <li key={x.id} data-testid="sti-ix" data-state={x.approvedBy ? 'approved' : 'requested'}><b>{x.id}</b> · {x.positions.join(', ')} · until {x.expires} · requested by {personaLabel(x.requestedBy)} · {x.approvedBy ? <Tag tone="ok">approved by {personaLabel(x.approvedBy)}</Tag> : <><Tag tone="warn">waiting for approval</Tag> <button type="button" className="ui-btn" onClick={() => approve(x)} data-testid="sti-approve">Approve</button></>}<div className="ui-meta">{x.reason} · measures: {x.measures}</div></li>)}</ul> : null}
      </Card> : null}
      {ev.n ? <ExportMenu testId="sti-export" title="Speech intelligibility report" by={personaLabel(persona)} sub="The readings, the policy, the verdict with its flags and any exception, as six files" make={() => stiPackage({ readings: s.readings, policy: p, ev, exceptions: s.exceptions, synthetic: s.synthetic, room: s.room }, made)} /> : null}
    </section>
  );
}
