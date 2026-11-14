/**
 * #/commissioning/instruments/reverb — the reverberation instrument of the Engineering Instrument Bench (40/10 directive §7C, 14 Nov 2026).
 *
 * An engineer brings measured impulse responses (WAV or CSV, one per source/receiver position); the page works out EDT, T20 and T30 in
 * octave bands with ./bench/reverb.ts, shows each decay curve with its fit, refuses every figure the data cannot support (and says why),
 * notes the measurement quality (straightness ξ, curvature C, dynamic range), averages the positions, and compares the mean against a
 * target the project's policy sets — a comparison, never a commissioning verdict. Every file is fingerprinted (SHA-256) and the
 * measurement chain is declared: a phone or consumer microphone is never treated as a calibrated measurement microphone.
 *
 * Nothing is estimated from a photograph or the room's size (that is Lite's Sabine model, labelled as a model). The built-in reference
 * responses are SYNTHETIC — exponentially decaying noise of a known decay time — for checking the instrument, and are labelled so in
 * the page and in every export. Nothing is uploaded: files are read in this browser.
 */
import { useMemo, useState } from 'react';
import { PageHero, Card, Notice, Tag, Segmented } from '@empathia/ui';
import { readWav, readCsv, analyseBands, syntheticIR, quality, meanOverPositions, type Analysis, type IR } from '../bench/reverb.js';
import { personaOf, personaLabel } from '../build/store.js';
import { ExportMenu } from '../export/ExportMenu.js';
import { reverbPackage, CHAINS, type Chain, type Position } from '../export/reverb.js';

const MAX_POSITIONS = 8; const MAX_BYTES = 20_000_000;
async function sha256(b: ArrayBuffer) { const d = await crypto.subtle.digest('SHA-256', b); return Array.from(new Uint8Array(d)).map((x) => x.toString(16).padStart(2, '0')).join(''); }
const s3 = (v: number | null | undefined) => (typeof v === 'number' ? v.toFixed(2) : '—');

function Decay({ a, testId }: { a: Analysis; testId: string }) {
  const W = 640, H = 240, L = 44, R = 12, T = 12, B = 30; const tMax = Math.max(0.2, a.edcDb.length * a.dt); const yMin = -70;
  const x = (t: number) => L + ((W - L - R) * t) / tMax; const y = (db: number) => T + ((H - T - B) * Math.min(0, Math.max(yMin, db))) / yMin;
  const step = Math.max(1, Math.floor(a.edcDb.length / 400)); let d = '';
  for (let i = 0; i < a.edcDb.length; i += step) { if (a.edcDb[i]! < yMin) break; d += `${i ? 'L' : 'M'}${x(i * a.dt).toFixed(1)},${y(a.edcDb[i]!).toFixed(1)}`; }
  const fit = a.fits.find((f) => f.name === 'T20' && f.seconds !== null) || a.fits.find((f) => f.name === 'EDT' && f.seconds !== null);
  const line = fit && fit.slope !== null && fit.intercept !== null ? (() => { const t0 = (fit.from - fit.intercept!) / fit.slope!; const t1 = (-60 - fit.intercept!) / fit.slope!; return { x0: x(Math.max(0, t0)), y0: y(fit.from), x1: x(Math.min(tMax, t1)), y1: y(fit.intercept! + fit.slope! * Math.min(tMax, t1)) }; })() : null;
  const ticks = [0, -10, -20, -30, -40, -50, -60]; const tt = Array.from({ length: 6 }, (_, i) => (tMax * i) / 5);
  return (
    <figure className="rv-fig" data-testid={testId}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Energy decay curve, ${a.band}: falls to the noise at ${a.truncatedAt} s${fit ? `; the ${fit.name} fit gives ${fit.seconds} s` : ''}`}>
        {ticks.map((v) => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="rv-grid" /><text x={L - 6} y={y(v) + 4} className="rv-tick" textAnchor="end">{v}</text></g>)}
        {tt.map((t, i) => <text key={t} x={x(t)} y={H - 10} className="rv-tick" textAnchor={i === tt.length - 1 ? 'end' : 'middle'}>{t.toFixed(2)}{i === tt.length - 1 ? ' s' : ''}</text>)}
        <text x={4} y={T + 4} className="rv-tick">dB</text>
        {fit ? <rect x={L} width={W - L - R} y={y(fit.from)} height={y(fit.to) - y(fit.from)} className="rv-range" /> : null}
        <path d={d} className="rv-curve" fill="none" />
        {line ? <line {...{ x1: line.x0, y1: line.y0, x2: line.x1, y2: line.y1 }} className="rv-fit" /> : null}
      </svg>
      <figcaption className="ui-meta">The decay curve (Schroeder, noise subtracted) to where it meets the noise at {a.truncatedAt} s{fit ? <>; shaded, the {fit.name} range ({fit.from} to {fit.to} dB) and, dashed, its fitted line to −60 dB</> : null}.</figcaption>
    </figure>
  );
}

export function ReverbBenchPage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective);
  const [positions, setPositions] = useState<Position[]>([]); const [err, setErr] = useState<string | null>(null);
  const [chain, setChain] = useState<Chain>('unknown'); const [target, setTarget] = useState(''); const [tol, setTol] = useState('10');
  const [pick, setPick] = useState(0); const [band, setBand] = useState('1 kHz');
  const add = (p: Position) => setPositions((xs) => { const n = [...xs, p].slice(0, MAX_POSITIONS); setPick(n.length - 1); return n; });
  const read = async (files: FileList | null) => {
    setErr(null); if (!files) return;
    for (const f of Array.from(files)) {
      if (positions.length >= MAX_POSITIONS) { setErr(`At most ${MAX_POSITIONS} positions at a time.`); break; }
      if (f.size > MAX_BYTES) { setErr(`${f.name} is over 20 MB.`); continue; }
      try {
        const buf = await f.arrayBuffer(); const ir: IR = /\.csv$/i.test(f.name) ? readCsv(new TextDecoder().decode(buf)) : /\.wav$/i.test(f.name) ? readWav(buf) : (() => { throw new Error('choose a .wav or .csv impulse response'); })();
        if (ir.seconds < 0.3) throw new Error(`the response is ${ir.seconds.toFixed(2)} s long; an impulse response needs at least 0.3 s to show a decay`);
        add({ name: f.name, bytes: f.size, sha: await sha256(buf), rate: ir.rate, bits: ir.bits, channels: ir.channels, seconds: Math.round(ir.seconds * 1000) / 1000, format: ir.format, synthetic: false, bands: analyseBands(ir) });
      } catch (e) { setErr(`${f.name}: ${(e as Error).message}`); }
    }
  };
  const reference = async () => {
    const seed = 101 + positions.length; const ir = syntheticIR(0.7, { floorDb: -85, seed, seconds: 1.8 });
    const fake = new TextEncoder().encode(`synthetic-reference rt=0.7 floor=-85 seed=${seed}`);
    add({ name: `Synthetic reference, 0.70 s (seed ${seed})`, bytes: ir.samples.length * 8, sha: await sha256(fake.buffer as ArrayBuffer), rate: ir.rate, bits: 64, channels: 1, seconds: ir.seconds, format: 'csv', synthetic: true, bands: analyseBands(ir) });
  };
  const means = useMemo(() => meanOverPositions(positions.map((p) => p.bands)), [positions]);
  const tgt = Number(target); const hasTarget = target.trim() !== '' && tgt > 0 && tgt < 20; const tolPct = Math.max(1, Math.min(50, Number(tol) || 10));
  const cur = positions[Math.min(pick, positions.length - 1)]; const curA = cur?.bands.find((a) => a.band === band) || cur?.bands[0];
  const anySynthetic = positions.some((p) => p.synthetic); const chainInfo = CHAINS[chain];
  const made = { role: personaLabel(persona), at: new Date().toISOString(), build: process.env.DEMO_BUILD_ID || 'dev' };
  return (
    <section className="wk rv" data-native="workspace" data-testid="reverb-bench" data-positions={positions.length}>
      <PageHero product="commissioning" icon="speaker" eyebrow="Commissioning · instrument bench" title="Reverberation from impulse responses"
        lede={<>Bring the impulse responses you measured, one per source and microphone position (WAV or CSV). The bench works out EDT, T20 and T30 by octave band, shows each decay and its fit, refuses any figure the measurement cannot support, and averages the positions. Files are read in this browser; nothing is uploaded. Acting as <b>{personaLabel(persona)}</b>.</>} />

      <Card icon="mic" title="The measurement chain" sub="What made these recordings decides what the figures can claim" testId="rv-chain">
        <label className="rv-field"><span>Microphone and interface</span>
          <select value={chain} onChange={(e) => setChain(e.target.value as Chain)} data-testid="rv-chain-select">{(Object.keys(CHAINS) as Chain[]).map((k) => <option key={k} value={k}>{CHAINS[k].label}</option>)}</select></label>
        <div data-testid="rv-chain-note"><Notice tone={chainInfo.tone}>{chainInfo.note}</Notice></div>
      </Card>

      <Card icon="download" title="Impulse responses" sub={`Up to ${MAX_POSITIONS} positions. WAV: 16-, 24- or 32-bit PCM or 32-bit float, first channel. CSV: time (s), amplitude.`} testId="rv-import">
        <div className="rv-actions">
          <label className="ui-btn ui-btn--primary">Choose files<input type="file" multiple accept=".wav,.csv,audio/wav,text/csv" className="ui-visually-hidden" data-testid="rv-file" onChange={(e) => { void read(e.target.files); e.target.value = ''; }} /></label>
          <button type="button" className="ui-btn" onClick={() => void reference()} data-testid="rv-reference" disabled={positions.length >= MAX_POSITIONS}>Add a synthetic reference (0.70 s)</button>
          {positions.length ? <button type="button" className="ui-btn ui-btn--quiet" onClick={() => { setPositions([]); setPick(0); }}>Clear</button> : null}
        </div>
        <p className="wk-note">The synthetic reference is noise decaying at exactly 0.70 s over a floor 85 dB down: a known answer for checking the instrument, never a measurement of a room.</p>
        {err ? <div role="alert" data-testid="rv-error"><Notice tone="bad">{err}</Notice></div> : null}
        {positions.length ? <div className="san__scroll"><table className="pa-table" data-testid="rv-positions"><thead><tr><th scope="col">Position</th><th scope="col">File</th><th scope="col">Rate</th><th scope="col">Length</th><th scope="col">Dynamic range</th><th scope="col">SHA-256</th></tr></thead>
          <tbody>{positions.map((p, i) => <tr key={i} data-testid="rv-position" data-synthetic={p.synthetic} className={i === pick ? 'on' : ''}><th scope="row"><button type="button" className="ui-link" onClick={() => setPick(i)} aria-pressed={i === pick}>P{i + 1}</button></th>
            <td>{p.name}{p.synthetic ? <> <Tag tone="warn">synthetic reference</Tag></> : null}</td><td className="num">{(p.rate / 1000).toFixed(1)} kHz</td><td className="num">{p.seconds.toFixed(2)} s</td><td className="num">{p.bands[0]!.dynamicRange} dB</td><td className="ui-mono">{p.sha.slice(0, 12)}…</td></tr>)}</tbody></table></div> : <p className="ui-muted" data-testid="rv-empty">No responses yet. Choose your measured files, or add the synthetic reference to see how the bench works.</p>}
      </Card>

      {cur && curA ? <Card icon="chart" title={`P${pick + 1}: the decay, ${curA.band}`} sub={cur.name} testId="rv-decay-card">
        <Segmented label="Band" value={curA.band} onChange={setBand} options={cur.bands.map((a) => ({ value: a.band, label: a.band }))} />
        <Decay a={curA} testId="rv-decay" />
        <div className="san__scroll"><table className="pa-table" data-testid="rv-fits"><thead><tr><th scope="col">Figure</th><th scope="col">Range</th><th scope="col">Seconds</th><th scope="col">Straightness (r)</th><th scope="col">Why not</th></tr></thead>
          <tbody>{curA.fits.map((f) => <tr key={f.name} data-testid="rv-fit" data-name={f.name} data-refused={f.refused ? 'yes' : 'no'}><th scope="row">{f.name}</th><td>{f.from} to {f.to} dB</td><td className="num">{s3(f.seconds)}</td><td className="num">{f.r === null ? '—' : f.r.toFixed(4)}</td><td>{f.refused ? <Tag tone="muted">not shown</Tag> : null} <span className="ui-meta">{f.refused || ''}</span></td></tr>)}</tbody></table></div>
        {quality(curA).length ? <ul className="plain" data-testid="rv-quality">{quality(curA).map((q) => <li key={q}><Tag tone="warn">!</Tag> {q}</li>)}</ul> : <p className="ui-meta" data-testid="rv-quality">The decay is straight over every range shown (ξ ≤ 10 ‰) and T30 agrees with T20 within 10 %.</p>}
      </Card> : null}

      {positions.length ? <Card icon="layers" title={`The mean over ${positions.length} position${positions.length === 1 ? '' : 's'}`} sub="Refused figures are left out of a mean and counted; a band needs at least two positions for a mean worth comparing" testId="rv-means">
        <div className="rv-target">
          <label className="rv-field"><span>Target T20 (s), from the project’s policy</span><input type="number" step="0.05" min="0.1" max="10" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} data-testid="rv-target" placeholder="none set" /></label>
          <label className="rv-field"><span>Tolerance (±%)</span><input type="number" step="1" min="1" max="50" value={tol} onChange={(e) => setTol(e.target.value)} data-testid="rv-tol" /></label>
        </div>
        <div className="san__scroll"><table className="pa-table" data-testid="rv-mean-table"><thead><tr><th scope="col">Band</th><th scope="col">EDT</th><th scope="col">T20</th><th scope="col">T30</th>{hasTarget ? <th scope="col">Against {tgt.toFixed(2)} s ± {tolPct}%</th> : null}</tr></thead>
          <tbody>{means.map((m) => { const v = m.t20.mean; const off = hasTarget && v !== null ? Math.round(((v - tgt) / tgt) * 1000) / 10 : null; const state = off === null ? null : Math.abs(off) <= tolPct ? 'within' : off > 0 ? 'above' : 'below';
            return <tr key={m.band} data-testid="rv-mean" data-band={m.band} data-state={state || ''}><th scope="row">{m.band}</th>{([m.edt, m.t20, m.t30] as const).map((x, i) => <td key={i} className="num">{s3(x.mean)} <span className="ui-meta">n={x.n}</span></td>)}
              {hasTarget ? <td>{state === null ? <span className="ui-meta">no T20 to compare</span> : <><Tag tone={state === 'within' ? 'ok' : 'warn'}>{state === 'within' ? 'within' : state}</Tag> <span className="ui-meta">{off! > 0 ? '+' : ''}{off}%{m.t20.n < 2 ? ' · one position only' : ''}</span></>}</td> : null}</tr>; })}</tbody></table></div>
        <p className="wk-note">A comparison with the target the project set, not a commissioning result: the commissioning engineer records the test, with these files as its evidence, and a different person verifies it. {chainInfo.claim}</p>
        {anySynthetic ? <div data-testid="rv-synthetic-note"><Notice tone="warn">The table includes the <b>synthetic reference</b>: those figures check the instrument against a known answer and describe no room.</Notice></div> : null}
      </Card> : null}

      {positions.length ? <ExportMenu testId="rv-export" title="Reverberation report" by={personaLabel(persona)} sub="The positions and their fingerprints, every band and fit with its refusals, the mean, the target comparison and the method, as six files"
        make={() => reverbPackage({ positions, chain, target: hasTarget ? { seconds: tgt, tolPct } : null }, made)} /> : null}

      <details className="ln-dom" data-testid="rv-method"><summary><b>How the figures are worked out</b></summary>
        <ul className="plain">
          <li>The response starts at its direct sound (the first sample within 20 dB of the peak).</li>
          <li>The noise floor is the mean energy of the response’s last tenth; it is subtracted, and the decay is cut where its 10 ms energy comes within 5 dB of that floor.</li>
          <li>The energy decay curve is the squared response integrated backwards from that point (Schroeder), in dB.</li>
          <li>A least-squares line is fitted over each range — EDT 0 to −10 dB, T20 −5 to −25 dB, T30 −5 to −35 dB — and extrapolated to 60 dB of decay.</li>
          <li>A figure is refused when the response’s dynamic range does not reach 10 dB beyond the end of its range (T20 needs 35 dB, T30 45 dB), or when the decay does not reach it before the noise.</li>
          <li>Octave bands 125 Hz to 4 kHz use a zero-phase fourth-order band-pass (an approximation of the standard filters; band results are labelled as such). One position’s band figures vary; measure several positions and use the mean.</li>
          <li>The method follows the published approach of ISO 3382-2; the standard itself is not reproduced here. The bench is checked against synthetic responses of known decay time (tests/unit/bench-reverb.test.mjs).</li>
        </ul>
      </details>
    </section>
  );
}
