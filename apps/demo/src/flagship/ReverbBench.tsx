/**
 * The reverberation bench of the flagship room (founder, 17 Nov 2026: "a genuinely interactive commissioning measurement… the
 * measurement benches writing directly to authoritative server records").
 *
 * What it does itself: takes one impulse response per receiver position and works out EDT, T20 and T30 in octave bands with
 * ../bench/reverb.ts (Schroeder integration with noise subtraction; a figure the data cannot support is refused and says why), then
 * the room's figure: T30, mean of the 500 Hz and 1 kHz bands, averaged over the positions.
 *
 * What it does not do: it does not decide whether the room passes. It hands the value, the positions and an analysis package to the
 * page, which uploads the package as evidence and records the measurement; the database judges it against the criterion in force, and
 * the verdict shown is the server's (docs/adr/ADR-0014).
 *
 * No room is measured in a demonstration. The responses offered here are SYNTHETIC reference signals of a decay time the person
 * chooses, and a measurement that includes one is recorded as SIMULATED. A response file from a real measurement can be loaded
 * instead (WAV or CSV); the file stays in this browser and its SHA-256 goes into the package. A phone or consumer microphone is
 * declared as uncalibrated, and the server does not let an uncalibrated value pass.
 */
import { useMemo, useState } from 'react';
import { Card, Tag, Notice } from '@empathia/ui';
import { analyseBands, meanOverPositions, quality, syntheticIR, readWav, readCsv, type Analysis, type BandMean, type IR } from '../bench/reverb.js';

export interface BenchCriterion { version: number; metric: string; unit: string; lower: number | null; upper: number | null; source: string; setBy: string; words: string }
export interface BenchTest { test: string; name: string; criterion: BenchCriterion | null; measurements: number; mayMeasure: boolean }
export interface BenchOutput { value: number; provenance: 'SIMULATED' | 'FIELD_MEASURED'; instrumentId?: string; calibrationStatus?: 'CALIBRATED' | 'UNKNOWN'; calibrationDue?: string; location: string; source: string; method: string; detail: Record<string, unknown>; packageText: string }
interface Pos { id: number; x: number; y: number; file: { name: string; sha256: string; ir: IR } | null }
interface Done { per: Array<{ pos: Pos; rt: number | null; bands: Analysis[] }>; means: BandMean[]; value: number | null; why: string[] }

const MAX = 6; const MAX_BYTES = 20_000_000; const RATE = 16000;
const r2 = (n: number) => Math.round(n * 100) / 100;
const s2 = (v: number | null | undefined) => (typeof v === 'number' ? v.toFixed(2) : '—');
const fit = (a: Analysis | undefined, name: 'EDT' | 'T20' | 'T30') => a?.fits.find((f) => f.name === name);
async function sha256(b: ArrayBuffer) { const d = await crypto.subtle.digest('SHA-256', b); return Array.from(new Uint8Array(d)).map((x) => x.toString(16).padStart(2, '0')).join(''); }
/** The stated, fixed variation between positions' reference signals: −8, −4, 0, +4, +8 % by position number. Not a model of any room. */
const spread = (id: number) => 1 + 0.04 * (((id * 3) % 5) - 2);

/** One band's decay curve with its T30 fit: the figure a person checks before trusting the number. */
function Decay({ a, label }: { a: Analysis; label: string }) {
  const W = 560, H = 210, L = 44, R = 12, T = 12, B = 30; const yMin = -60; const f = fit(a, 'T30'); const tMax = Math.max(0.2, Math.min(a.edcDb.length * a.dt, f?.seconds ? f.seconds * 1.15 : a.edcDb.length * a.dt));
  const x = (t: number) => L + ((W - L - R) * t) / tMax; const y = (db: number) => T + ((H - T - B) * Math.min(0, Math.max(yMin, db))) / yMin;
  const step = Math.max(1, Math.floor(a.edcDb.length / 300)); let d = '';
  for (let i = 0; i < a.edcDb.length; i += step) { const t = i * a.dt; if (t > tMax || a.edcDb[i]! < yMin) break; d += `${d ? 'L' : 'M'}${x(t).toFixed(1)},${y(a.edcDb[i]!).toFixed(1)}`; }
  const line = f && f.slope !== null && f.intercept !== null ? { x1: x(Math.max(0, (-5 - f.intercept) / f.slope)), y1: y(-5), x2: x(Math.min(tMax, (-35 - f.intercept) / f.slope)), y2: y(-35) } : null;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => r2(k * tMax));
  return (
    <svg className="fb__decay" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Decay curve, ${label}: the integrated response falls from 0 dB${f?.seconds ? `; the T30 fit between 5 and 35 dB down gives ${f.seconds.toFixed(2)} seconds` : '; T30 could not be worked out'}`} data-testid="fl-bench-decay">
      {[0, -10, -20, -30, -40, -50, -60].map((db) => <g key={db}><line className="fb__grid" x1={L} y1={y(db)} x2={W - R} y2={y(db)} /><text className="fb__tick" x={L - 6} y={y(db) + 4} textAnchor="end">{db}</text></g>)}
      {ticks.map((t) => <text key={t} className="fb__tick" x={x(t)} y={H - B + 16} textAnchor="middle">{t}</text>)}
      <text className="fb__tick" x={L} y={H - 4} textAnchor="start">seconds</text><text className="fb__tick" x={L} y={T - 2} textAnchor="start">dB</text>
      <path className="fb__curve" d={d} />
      {line ? <><line className="fb__fit" {...line} /><text className="fb__label" x={Math.min(line.x2 + 6, W - R - 150)} y={line.y2 - 6}>T30 fit: {f!.seconds!.toFixed(2)} s</text></> : null}
      <text className="fb__label" x={W - R - 6} y={T + 14} textAnchor="end">integrated decay, {label}</text>
    </svg>
  );
}

export function ReverbBench({ geometry, test, lifecycle, person, busy, onRecord }: { geometry: { widthM: number; lengthM: number }; test: BenchTest | null; lifecycle: string; person: string; busy: boolean; onRecord: (o: BenchOutput) => void }) {
  const W = geometry.widthM; const L = geometry.lengthM; const pad = 1.2;
  const [pos, setPos] = useState<Pos[]>([]); const [rt, setRt] = useState(1.4); const [done, setDone] = useState<Done | null>(null); const [msg, setMsg] = useState<string | null>(null); const [show, setShow] = useState(0);
  const [chain, setChain] = useState<'CALIBRATED' | 'UNKNOWN'>('UNKNOWN'); const [instrument, setInstrument] = useState(''); const [due, setDue] = useState('');
  const synthetic = pos.some((p) => !p.file); const nextId = () => { for (let i = 1; i <= MAX; i++) if (!pos.some((p) => p.id === i)) return i; return 0; };
  const change = (next: Pos[]) => { setPos(next); setDone(null); setMsg(null); };
  const add = (x: number, y: number) => { const id = nextId(); if (!id) { setMsg(`At most ${MAX} positions.`); return; } change([...pos, { id, x: r2(Math.min(W, Math.max(0, x))), y: r2(Math.min(L, Math.max(0, y))), file: null }].sort((a, b) => a.id - b.id)); };
  // four receiver positions spread over the seating: not on the centre line, not close to a wall
  const typical = () => change([[0.3, 0.38], [0.68, 0.5], [0.4, 0.68], [0.72, 0.84]].map(([fx, fy], i) => ({ id: i + 1, x: r2(W * fx!), y: r2(L * fy!), file: null })));
  const onPlan = (e: { clientX: number; clientY: number; currentTarget: SVGSVGElement }) => { const m = e.currentTarget.getScreenCTM(); if (!m) return; const pt = e.currentTarget.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(m.inverse()); if (q.x < 0 || q.x > W || q.y < 0 || q.y > L) return; add(q.x, q.y); };
  const load = async (id: number, file: File | undefined) => {
    if (!file) return; setMsg(null);
    try { if (file.size > MAX_BYTES) throw new Error('the file is over 20 MB'); const buf = await file.arrayBuffer(); const ir = /\.csv$/i.test(file.name) ? readCsv(new TextDecoder().decode(buf)) : readWav(buf);
      const hash = await sha256(buf); change(pos.map((p) => (p.id === id ? { ...p, file: { name: file.name, sha256: hash, ir } } : p))); }
    catch (e) { setMsg(`${file.name} could not be read as an impulse response: ${(e as Error).message}`); }
  };
  const analyse = () => {
    const per = pos.map((p) => { const decay = p.file ? null : r2(rt * spread(p.id)); const ir = p.file ? p.file.ir : syntheticIR(decay!, { rate: RATE, seed: 7 + p.id * 13 }); return { pos: p, rt: decay, bands: analyseBands(ir) }; });
    const means = meanOverPositions(per.map((x) => x.bands)); const why: string[] = [];
    for (const x of per) for (const band of ['500 Hz', '1 kHz']) { const f = fit(x.bands.find((a) => a.band === band), 'T30'); if (!f || f.seconds === null) why.push(`T30 could not be worked out at position ${x.pos.id}, ${band}: ${f?.refused || 'the band is not in the response'}`); }
    const a = means.find((m) => m.band === '500 Hz')?.t30.mean; const b = means.find((m) => m.band === '1 kHz')?.t30.mean;
    setDone({ per, means, value: !why.length && typeof a === 'number' && typeof b === 'number' ? r2((a + b) / 2) : null, why }); setShow(0);
  };
  const output = useMemo((): BenchOutput | null => {
    if (!done || done.value === null || !test) return null;
    const detail = { quantity: 'T30, mean of the 500 Hz and 1 kHz octave bands, averaged over the positions', positions: done.per.map((x) => ({ position: x.pos.id, x: x.pos.x, y: x.pos.y, source: x.pos.file ? `file ${x.pos.file.name}` : `synthetic reference, decay ${x.rt} s`,
      t30_500: fit(x.bands.find((a) => a.band === '500 Hz'), 'T30')?.seconds ?? null, t30_1k: fit(x.bands.find((a) => a.band === '1 kHz'), 'T30')?.seconds ?? null })), bands: done.means.map((m) => ({ band: m.band, edt: m.edt.mean, t20: m.t20.mean, t30: m.t30.mean })) };
    const pkg = { kind: 'reverberation analysis package', room: 'UNI-SCI-110', test: test.test, metric: 't30_mid', unit: 's', value: done.value, synthetic,
      statement: synthetic ? 'SYNTHETIC: one or more responses are reference signals of a chosen decay time, generated in the browser from the seed and decay listed. No room was measured.' : 'The responses are files loaded in the browser. The files themselves are not in this package: each is named with its SHA-256.',
      analysis: 'Schroeder backward integration with noise subtraction and truncation; least-squares fit from 5 to 35 dB down (T30), 5 to 25 dB (T20), 0 to 10 dB (EDT); a figure is refused when the dynamic range cannot support it',
      positions: done.per.map((x) => ({ position: x.pos.id, x: x.pos.x, y: x.pos.y, response: x.pos.file ? { file: x.pos.file.name, sha256: x.pos.file.sha256, rate: x.pos.file.ir.rate, seconds: r2(x.pos.file.ir.seconds) } : { synthetic: true, decaySeconds: x.rt, seed: 7 + x.pos.id * 13, rate: RATE, floorDb: -80 },
        bands: x.bands.map((a) => ({ band: a.band, edt: fit(a, 'EDT')?.seconds ?? null, t20: fit(a, 'T20')?.seconds ?? null, t30: fit(a, 'T30')?.seconds ?? null, dynamicRangeDb: a.dynamicRange, refused: a.fits.filter((f) => f.refused).map((f) => `${f.name}: ${f.refused}`), notes: quality(a) })) })),
      bandMeans: detail.bands, generatedAt: new Date().toISOString() };
    return { value: done.value, provenance: synthetic ? 'SIMULATED' : 'FIELD_MEASURED', ...(synthetic ? {} : { instrumentId: instrument.trim(), calibrationStatus: chain, ...(chain === 'CALIBRATED' && due ? { calibrationDue: due } : {}) }),
      location: `${done.per.length} receiver positions: ${done.per.map((x) => `P${x.pos.id} (${x.pos.x}, ${x.pos.y})`).join(', ')}`.slice(0, 120), source: synthetic ? 'synthetic reference responses generated in the browser (no room was measured)' : `impulse response files: ${done.per.map((x) => x.pos.file!.name).join(', ')}`.slice(0, 200),
      method: 'ISO 3382-2 integrated impulse response, T30', detail, packageText: JSON.stringify(pkg, null, 1) };
  }, [done, test, synthetic, instrument, chain, due]);
  const chainReady = synthetic || (instrument.trim().length >= 3 && (chain !== 'CALIBRATED' || !!due));
  const shown = done?.per[show]; const shownBand = shown?.bands.find((a) => a.band === '1 kHz');

  return (
    <Card icon="pulse" title="Measurement bench: reverberation" sub={test?.criterion ? `This room has to meet: T30 (500 Hz and 1 kHz) ${test.criterion.words}` : 'This room has no criterion for reverberation'} testId="fl-bench-card">
      {test?.criterion ? <p className="ui-meta" data-testid="fl-bench-criterion" data-version={test.criterion.version} data-upper={test.criterion.upper ?? ''}>Criterion version {test.criterion.version}, from “{test.criterion.source}”, set by {test.criterion.setBy}. The limit is the server’s record; this bench does not hold it and does not judge against it.</p> : null}
      {lifecycle !== 'COMMISSIONING' ? <Notice tone="warn"><b>The room is not in commissioning yet.</b> The analysis works now; the server records a measurement only for a room in commissioning.</Notice> : null}
      <div className="fb__grid2">
        <div>
          <h4 className="fl__h4">1 · Receiver positions</h4>
          <p className="ui-meta">Click the plan to put a receiver position where a listener sits, or use four typical ones. {pos.length} of {MAX} placed.</p>
          <svg className="fb__plan" viewBox={`${-pad} ${-pad} ${W + 2 * pad} ${L + 2 * pad}`} role="group" aria-label={`Receiver positions on the plan: ${pos.length} placed`} data-testid="fl-bench-plan" onClick={onPlan}>
            <rect className="fl__outline" x={0} y={0} width={W} height={L} /><text className="fl__dim" x={W / 2} y={-0.35} textAnchor="middle">front</text>
            {pos.map((p) => <g key={p.id} className="fb__pos" data-pos={p.id} data-x={p.x} data-y={p.y} transform={`translate(${p.x} ${p.y})`}><circle r={0.55} /><text y={0.2} textAnchor="middle">{p.id}</text></g>)}
          </svg>
          <p className="build__row"><button type="button" className="ui-btn ui-btn--sm" data-testid="fl-bench-typical" onClick={typical}>Use four typical positions</button>
            {pos.length ? <button type="button" className="ui-btn ui-btn--sm ui-btn--quiet" data-testid="fl-bench-clear" onClick={() => change([])}>Remove all</button> : null}</p>
          {pos.length ? <ul className="fl__list fb__poslist" data-testid="fl-bench-positions">{pos.map((p) => <li key={p.id}><b>P{p.id}</b> {p.x} m across, {p.y} m from the front · {p.file ? <>file <span className="ui-mono">{p.file.name}</span> <span className="ui-muted">sha256 {p.file.sha256.slice(0, 12)}…</span></> : <>synthetic reference, decay {r2(rt * spread(p.id))} s</>}
            <label className="fb__file">Load a measured response (WAV or CSV)<input type="file" accept=".wav,.csv,audio/wav,text/csv" data-testid={`fl-bench-file-${p.id}`} onChange={(e: { target: { files: FileList | null } }) => void load(p.id, e.target.files?.[0])} /></label>
            <button type="button" className="fl__linkbtn" onClick={() => change(pos.filter((x) => x.id !== p.id))}>remove</button></li>)}</ul> : null}
        </div>
        <div>
          <h4 className="fl__h4">2 · The responses</h4>
          {synthetic || !pos.length ? <>
            <label className="kit-field">Decay time of the synthetic reference responses: <b data-testid="fl-bench-rt-value">{rt.toFixed(2)} s</b>
              <input type="range" min={0.3} max={2.5} step={0.05} value={rt} data-testid="fl-bench-rt" onChange={(e: { target: { value: string } }) => { setRt(Number(e.target.value)); setDone(null); }} /></label>
            <p className="ui-meta">No room is being measured. These are reference signals of a known decay time, generated here, so that the analysis and everything after it can be followed. Each position’s signal differs by a fixed, stated amount (−8 to +8 %). The measurement is recorded as SIMULATED.</p>
          </> : <>
            <p className="ui-meta">Every position has a response file. Say what it was measured with: the server records it, and an uncalibrated chain does not pass a test.</p>
            <label className="kit-field">Instrument <input type="text" value={instrument} maxLength={80} data-testid="fl-bench-instrument" onChange={(e: { target: { value: string } }) => setInstrument(e.target.value)} /></label>
            <label className="kit-field">Measurement chain <select value={chain} data-testid="fl-bench-chain" onChange={(e: { target: { value: string } }) => setChain(e.target.value as 'CALIBRATED' | 'UNKNOWN')}><option value="UNKNOWN">Not calibrated, or not known (a phone, a consumer microphone)</option><option value="CALIBRATED">Calibrated measurement microphone and interface</option></select></label>
            {chain === 'CALIBRATED' ? <label className="kit-field">Calibration due <input type="date" value={due} data-testid="fl-bench-due" onChange={(e: { target: { value: string } }) => setDue(e.target.value)} /></label> : null}
          </>}
          <p className="build__row"><button type="button" className="ui-btn ui-btn--primary ui-btn--sm" data-testid="fl-bench-analyse" disabled={pos.length < 2} onClick={analyse}>Analyse {pos.length} response{pos.length === 1 ? '' : 's'}</button>{pos.length < 2 ? <span className="ui-meta">Place at least two positions.</span> : null}</p>
          {msg ? <p role="alert" data-testid="fl-bench-msg"><Tag tone="warn">note</Tag> {msg}</p> : null}
        </div>
      </div>

      {done ? <div data-testid="fl-bench-result" data-value={done.value ?? ''}>
        <h4 className="fl__h4">3 · What the analysis found</h4>
        <div className="fb__grid2">
          <div>{shown && shownBand ? <Decay a={shownBand} label={`1 kHz, position ${shown.pos.id}`} /> : null}
            <p className="fb__tabs" role="group" aria-label="Position shown">{done.per.map((x, i) => <button key={x.pos.id} type="button" className="fl__phase" aria-pressed={i === show} onClick={() => setShow(i)}>P{x.pos.id}</button>)}</p></div>
          <div className="fl__tablewrap"><table className="ui-table fb__table" data-testid="fl-bench-bands"><thead><tr><th scope="col">Band</th><th scope="col">EDT (s)</th><th scope="col">T20 (s)</th><th scope="col">T30 (s)</th></tr></thead>
            <tbody>{done.means.filter((m) => m.band !== 'broadband').map((m) => <tr key={m.band} data-band={m.band} data-mid={m.band === '500 Hz' || m.band === '1 kHz' ? 'yes' : 'no'}><th scope="row">{m.band}</th><td>{s2(m.edt.mean)}</td><td>{s2(m.t20.mean)}</td><td>{s2(m.t30.mean)}{m.t30.n < done.per.length ? <span className="ui-muted"> ({m.t30.n} of {done.per.length})</span> : null}</td></tr>)}</tbody></table>
            <p className="ui-meta">Means over the {done.per.length} positions. The two highlighted bands make the room’s figure.</p></div>
        </div>
        {done.value !== null ? <p className="fb__value" data-testid="fl-bench-value" data-value={done.value}>T30 (500 Hz and 1 kHz), mean of {done.per.length} positions: <b>{done.value.toFixed(2)} s</b></p>
          : <div data-testid="fl-bench-refused"><Notice tone="bad"><b>There is no figure to record.</b> The data does not support one:<ul className="fl__list">{done.why.map((w) => <li key={w}>{w}</li>)}</ul></Notice></div>}
        {done.per.some((x) => x.bands.some((a) => quality(a).length)) ? <details className="fb__notes"><summary>Measurement-quality notes</summary><ul className="fl__list">{done.per.flatMap((x) => x.bands.filter((a) => a.band === '500 Hz' || a.band === '1 kHz').flatMap((a) => quality(a).map((q) => <li key={`${x.pos.id}${a.band}${q}`}>P{x.pos.id}, {a.band}: {q}</li>)))}</ul></details> : null}
        <h4 className="fl__h4">4 · Record it on the server</h4>
        <p className="ui-meta">The value, the positions and an analysis package (uploaded as the evidence file) go to the server as the {person}. The database then works out whether the value meets the criterion. {synthetic ? 'It is recorded as SIMULATED.' : `It is recorded as a field measurement, ${chain === 'CALIBRATED' ? 'calibrated' : 'not calibrated'}.`}</p>
        <p className="build__row"><button type="button" className="ui-btn ui-btn--primary" data-testid="fl-bench-record" disabled={busy || !output || !chainReady} onClick={() => { if (output) onRecord(output); }}>Record the measurement as the {person}</button>
          {!chainReady ? <span className="ui-meta">Name the instrument{chain === 'CALIBRATED' ? ' and when its calibration is due' : ''}.</span> : null}</p>
      </div> : null}
    </Card>
  );
}
