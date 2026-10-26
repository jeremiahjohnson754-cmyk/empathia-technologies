/**
 * Engine Lab: the ported commissioning engine (packages/commissioning-engine) running in the browser on rooms taken from the
 * golden cases. Every change re-runs classification, design checks and the 94-definition applicability. It is a sandbox:
 * nothing here is evidence, and nothing is written to the demonstrator.
 */
import { useMemo, useState } from 'react';
import { analyzeRoom, resultLabel, resultWords, ENGINE_VERSION } from '@empathia/commissioning-engine';
import type { RecordedResult, RoomDesignInput } from '@empathia/domain-types';
import labRooms from '../generated/lab-rooms.json';

const ROOMS = labRooms as unknown as Array<{ name: string; input: RoomDesignInput }>;
const LIFECYCLES = ['PLANNED', 'DESIGN_APPROVED', 'INSTALLATION_PENDING', 'INSTALLED_UNVERIFIED', 'COMMISSIONING'];

export function EngineLab() {
  const [k, setK] = useState(0);
  const base = ROOMS[k]!.input;
  const [occupancy, setOcc] = useState(base.occupancy);
  const [use, setUse] = useState(base.intendedUse);
  const [life, setLife] = useState(base.lifecycle);
  const [offDev, setOffDev] = useState<string[]>([]);
  const [offConn, setOffConn] = useState<string[]>([]);
  const [photo, setPhoto] = useState(false);
  const [results, setResults] = useState<Record<string, RecordedResult>>({});
  const [show, setShow] = useState<'applicable' | 'all'>('applicable');

  const reset = (i: number) => { const b = ROOMS[i]!.input; setK(i); setOcc(b.occupancy); setUse(b.intendedUse); setLife(b.lifecycle); setOffDev([]); setOffConn([]); setPhoto(false); setResults({}); };
  const input: RoomDesignInput = useMemo(() => ({
    ...base, occupancy, intendedUse: use, lifecycle: life,
    geometry: photo ? { ...base.geometry, provenance: { length: 'PHOTO_INFERRED', width: 'PHOTO_INFERRED', ceiling: 'PHOTO_INFERRED' }, confidence: 'low' } : base.geometry,
    devices: base.devices.map((d) => (offDev.includes(d.id) ? { ...d, removed: true } : d)),
    connections: base.connections.map((c) => (offConn.includes(c.id) ? { ...c, removed: true } : c)),
    results,
  }), [base, occupancy, use, life, offDev, offConn, photo, results]);
  const a = useMemo(() => analyzeRoom(input), [input]);
  const toggle = (list: string[], set: (x: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const byId = new Map(base.devices.map((d) => [d.id, d]));
  const rows = a.applicability.rows.filter((r) => (show === 'all' ? true : r.applicable));
  const firstApplicable = a.applicability.rows.find((r) => r.applicable);
  const simulateRecord = () => {
    if (!firstApplicable) return;
    setResults({ ...results, [firstApplicable.id]: { state: 'PASS', evidence: { kind: (firstApplicable.evidence || ['FIELD_OBSERVED'])[0]!, ref: 'LAB-SANDBOX-1' }, by: 'cxeng', verified: null } });
  };
  const simulateVerify = (by: string) => {
    if (!firstApplicable || !results[firstApplicable.id]) return;
    setResults({ ...results, [firstApplicable.id]: { ...results[firstApplicable.id]!, verified: { by } } });
  };

  return (
    <div className="stack">
      <div className="notice"><p className="muted">This is <b>@empathia/commissioning-engine {ENGINE_VERSION}</b> — the TypeScript port of the demonstrator’s rules (deterministic, not machine learning), running in your browser. It reproduces the demonstrator exactly on 92 golden cases. A sandbox: nothing here is evidence.</p></div>
      <div className="lab">
        <div className="panel pad stack" aria-label="Room inputs">
          <label>Room<select className="field" value={k} onChange={(e) => reset(Number(e.target.value))}>{ROOMS.map((r, i) => <option key={r.name} value={i}>{r.name}</option>)}</select></label>
          <label>Occupancy: <b className="num">{occupancy}</b><input type="range" min={1} max={400} value={occupancy} onChange={(e) => setOcc(Number(e.target.value))} /></label>
          <label>Intended use<input className="field" value={use} onChange={(e) => setUse(e.target.value)} /></label>
          <label>Lifecycle<select className="field" value={life} onChange={(e) => setLife(e.target.value)}>{LIFECYCLES.map((l) => <option key={l}>{l}</option>)}</select></label>
          <label className="check"><input type="checkbox" checked={photo} onChange={(e) => setPhoto(e.target.checked)} /> dimensions inferred from a photo</label>
          <details>
            <summary>Devices ({base.devices.length - offDev.length} of {base.devices.length})</summary>
            <div className="stack" style={{ marginTop: 8 }}>{base.devices.map((d) => <label key={d.id} className="check"><input type="checkbox" checked={!offDev.includes(d.id)} onChange={() => toggle(offDev, setOffDev, d.id)} /> <span>{d.label} <span className="faint mono">{d.id}</span></span></label>)}</div>
          </details>
          <details>
            <summary>Connections ({base.connections.length - offConn.length} of {base.connections.length})</summary>
            <div className="stack" style={{ marginTop: 8 }}>{base.connections.map((c) => <label key={c.id} className="check"><input type="checkbox" checked={!offConn.includes(c.id)} onChange={() => toggle(offConn, setOffConn, c.id)} /> <span>{byId.get(c.from)?.label ?? c.from} → {byId.get(c.to)?.label ?? c.to} <span className="faint">({c.kind})</span></span></label>)}</div>
          </details>
          <hr className="rule" />
          <b>Result labels, in the sandbox</b>
          <p className="faint">Record a PASS on the first applicable test as the Commissioning Engineer, then verify it — first by the same person, then by the QA reviewer. Only the room in COMMISSIONING accepts a result in the real rules.</p>
          <div className="row"><button className="btn" type="button" onClick={simulateRecord} disabled={!firstApplicable}>Record PASS (cxeng)</button><button className="btn" type="button" onClick={() => simulateVerify('cxeng')}>Verify as cxeng</button><button className="btn" type="button" onClick={() => simulateVerify('qa_reviewer')}>Verify as QA</button></div>
          {firstApplicable && <p className="mono">{firstApplicable.id}: {resultLabel(results[firstApplicable.id])}</p>}
        </div>

        <div className="stack" aria-live="polite">
          <div className="cols-3">
            <div className="panel pad stack"><span className="faint">Classification</span><h2>{a.classification.archetypeName}</h2><span className="muted">{a.classification.subtype} · {a.classification.sizeCategory} · {a.classification.complexity}</span><span className="faint">confidence {a.classification.confidence}</span></div>
            <div className="panel pad stack"><span className="faint">Applicability</span><h2 className="num">{a.applicability.applicable} of {a.applicability.library}</h2><span className="muted">{Object.entries(a.applicability.byStatus).map(([s, n]) => `${n} ${s.toLowerCase().replace(/_/g, ' ')}`).join(' · ')}</span><span className="faint">{resultWords(a.counts)}</span></div>
            <div className="panel pad stack"><span className="faint">Design deficiencies</span><h2 className="num">{a.checks.length}</h2><span className="muted">{a.checks.filter((c) => c.severity === 'High').length} High · {a.checks.filter((c) => c.severity === 'Medium').length} Medium · {a.checks.filter((c) => c.severity === 'Low').length} Low</span></div>
          </div>
          <div className="panel pad stack">
            <h3>Why</h3>
            <ul className="list">{a.classification.why.map((w) => <li key={w}>{w}</li>)}</ul>
            <h3>Assumptions</h3>
            <ul className="list warn">{a.classification.assumptions.map((w) => <li key={w}>{w}</li>)}</ul>
          </div>
          {a.checks.length > 0 && (
            <div className="panel pad stack">
              <h3>Findings</h3>
              <ul className="list warn">{a.checks.map((c) => <li key={c.key}><b>{c.severity}</b> — {c.title}. <span className="faint">{c.rationale}. Key <code>{c.key}</code></span></li>)}</ul>
            </div>
          )}
          <div className="panel pad stack">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3>The library, judged</h3>
              <div className="tabs" role="tablist"><button role="tab" type="button" aria-selected={show === 'applicable'} onClick={() => setShow('applicable')}>Applicable</button><button role="tab" type="button" aria-selected={show === 'all'} onClick={() => setShow('all')}>All {a.applicability.library}</button></div>
            </div>
            <div className="table-wrap">
              <table className="ledger">
                <thead><tr><th>Test</th><th>Pack</th><th>Status</th><th>Result</th><th>Why / why not</th></tr></thead>
                <tbody>{rows.map((r) => <tr key={r.id}><td><b>{r.label}</b><div className="faint mono">{r.id}</div></td><td className="faint">{r.pack ?? 'base'}</td><td><span className={`chip ${r.applicable ? (r.status === 'REQUIRES_PHYSICAL_EXECUTION' ? 'info' : 'warn') : 'plain'}`}>{r.status.toLowerCase().replace(/_/g, ' ')}</span></td><td className="mono">{r.result ?? '—'}</td><td className="faint">{r.applicable ? r.why.join('; ') : r.justification}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
