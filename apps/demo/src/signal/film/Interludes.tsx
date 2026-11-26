/**
 * The playable scenes of Ten Seats (S01E01). Each one is the canon's own investigation step, handed to the player: measure the seats,
 * plot the cards, test the four explanations, turn the fill down, measure again after the re-aim. The physics is acoustics.ts; the
 * plots are an illustrative model (said beside each one). What the player establishes is recorded with the canon's evidence label, and
 * "Show me" completes a scene for anyone who would rather watch it — recorded as assisted, never as done unaided.
 */
import { useMemo, useState } from 'react';
import { SEATS, TEN, FREQS, curve, reading, notchesMove, RIG_START, type Rig, type Seat } from './acoustics.js';
import { listenAt, soundReady } from './sound.js';
import type { PlayRecord } from './director.js';

export interface PlayProps { done: PlayRecord | null; prior: Record<string, PlayRecord>; firstCall: string | null; onDone: (r: PlayRecord) => void }
const seat = (id: string) => SEATS.find((s) => s.id === id)!;
const X = (f: number) => (Math.log(f / 50) / Math.log(2000 / 50)) * 300 + 30;
const Y = (db: number) => 10 + ((6 - Math.max(-18, Math.min(6, db))) / 24) * 120;

/** An analyzer strip, as Maya's: response in dB over 50 Hz–2 kHz, with the first notch marked. */
export function Analyzer({ s, rig, ghost, label }: { s: Seat; rig: Rig; ghost?: { rig: Rig; label: string }; label?: string }) {
  const path = (r: Rig) => curve(s, r).map((d, i) => `${i ? 'L' : 'M'}${X(FREQS[i]!).toFixed(1)},${Y(d).toFixed(1)}`).join(' ');
  const r = reading(s, rig);
  return <figure className="fm-an" data-testid="fm-analyzer" data-seat={s.id} data-first={r.first ?? ''} data-depth={r.depth}>
    <svg viewBox="0 0 340 150" role="img" aria-label={`Analyzer, ${s.balcony ? 'balcony front' : `row ${s.row} seat ${s.seat}`}: ${r.first ? `first notch about ${r.first} hertz, ${Math.abs(r.depth)} decibels deep` : 'no deep notch'}${ghost ? `; ${ghost.label} shown faint` : ''}`}>
      {[100, 200, 500, 1000, 2000].map((f) => <g key={f}><line x1={X(f)} x2={X(f)} y1={10} y2={130} className="fm-an__grid" /><text x={X(f)} y={145} className="fm-an__t">{f >= 1000 ? `${f / 1000}k` : f}</text></g>)}
      {[0, -6, -12].map((d) => <g key={d}><line x1={30} x2={330} y1={Y(d)} y2={Y(d)} className="fm-an__grid" /><text x={26} y={Y(d) + 3} className="fm-an__t fm-an__t--y">{d}</text></g>)}
      {ghost && <path d={path(ghost.rig)} className="fm-an__ghost" />}
      <path d={path(rig)} className="fm-an__line" />
      {r.first && <circle cx={X(r.first)} cy={Y(r.depth)} r={3.5} className="fm-an__dot" />}
    </svg>
    <figcaption className="ui-meta">{label || (s.balcony ? 'Balcony front' : `Row ${s.row}, seat ${s.seat}`)}: {s.balcony ? `level ${curve(s, rig)[0]!.toFixed(1)} dB` : r.first ? <>first notch ≈ <b>{r.first} Hz</b>, {r.depth} dB deep · Δt ≈ {r.delay} ms</> : 'no deep notch'} · <i>illustrative model of the canon’s mechanism</i></figcaption>
  </figure>;
}

/** The sanctuary from above: the platform, the mains, the fill, and the seats that can be measured (buttons). */
function SeatMap({ sel, onPick, got, show, heat }: { sel: string | null; onPick: (id: string) => void; got: Set<string>; show: Seat[]; heat?: (s: Seat) => number }) {
  return <div className="fm-map" data-testid="fm-seatmap">
    <svg viewBox="0 0 320 345" aria-hidden="true" className="fm-map__plan">
      <rect x={60} y={6} width={200} height={22} rx={4} className="fm-map__stage" /><text x={160} y={21} className="fm-map__lbl">platform</text>
      <rect x={70} y={30} width={14} height={9} className="fm-map__spk" /><rect x={236} y={30} width={14} height={9} className="fm-map__spk" /><rect x={153} y={30} width={14} height={9} className="fm-map__fill" /><text x={160} y={50} className="fm-map__lbl">fill</text>
      {Array.from({ length: 11 }, (_, r) => Array.from({ length: 11 }, (_, c) => <circle key={`${r}-${c}`} cx={30 + c * 26} cy={62 + r * 24} r={3} className="fm-map__seat" />))}
      <text x={160} y={341} className="fm-map__lbl">rows 1–11 · balcony front behind</text>
    </svg>
    {show.map((s) => { const x = s.balcony ? 160 : 30 + (s.seat - 7) * 26; const y = s.balcony ? 322 : 62 + (s.row - 1) * 24; const h = heat ? heat(s) : null;
      return <button key={s.id} type="button" className={`fm-map__pick${sel === s.id ? ' on' : ''}${got.has(s.id) ? ' got' : ''}${s.hollow ? ' ten' : ''}`} style={{ left: `${(x / 320) * 100}%`, top: `${(y / 345) * 100}%`, ...(h !== null ? { ['--h' as string]: String(h) } : {}) }}
        onClick={() => onPick(s.id)} aria-pressed={sel === s.id} data-testid={`fm-seat-${s.id}`} aria-label={`${s.balcony ? 'Balcony front' : `Row ${s.row}, seat ${s.seat}`}${s.hollow ? ', one of the ten' : ''}${got.has(s.id) ? ', recorded' : ''}`}><span aria-hidden="true">{s.balcony ? 'B' : s.seat}</span></button>; })}
  </div>;
}

/** Measure the ten seats — before anything is changed (mode 'before'), or again after the re-aim (mode 'after'). */
export function Measure({ mode, done, prior, firstCall, onDone }: PlayProps & { mode: 'before' | 'after' }) {
  const startRig: Rig = mode === 'after' ? { ...RIG_START, fill: 'reaimed' } : firstCall === 'A' ? { ...RIG_START, eq: true } : firstCall === 'B' ? { ...RIG_START, fill: 'off' } : RIG_START;
  const [rig, setRig] = useState<Rig>(startRig); const [sel, setSel] = useState<string>('R8-13'); const [got, setGot] = useState<Record<string, number | null>>({}); const [wrote, setWrote] = useState(false); const [msg, setMsg] = useState('');
  const need = mode === 'before' ? TEN.map((s) => s.id) : ['R8-12', 'R8-13', 'R7-12', 'R9-13', 'BAL-F'];
  const show = mode === 'before' ? [...TEN, seat('R8-9'), seat('R4-12')] : [...TEN, seat('R8-9'), seat('R8-15'), seat('BAL-F')];
  const left = need.filter((id) => !(id in got)); const s = seat(sel);
  const record = () => { if (mode === 'before' && rig.fill === 'off') { setMsg('The fill is off: the seats sound thin, not hollow. Nothing you record now is the problem people hear. Turn it back on first.'); return; }
    setGot({ ...got, [sel]: reading(s, rig).first }); setMsg(`Recorded ${s.balcony ? 'the balcony front' : `row ${s.row}, seat ${s.seat}`}.`); };
  const before = prior['measure']; const beforeRig: Rig = before?.caveat ? { ...RIG_START, eq: true } : RIG_START;
  const caveat = mode === 'before' && firstCall === 'A' ? 'Recorded after an EQ change: the true “before” is gone.' : null;
  const finish = (assisted: boolean) => { const firsts = assisted ? Object.fromEntries(need.map((id) => [id, reading(seat(id), rig).first])) : got;
    onDone({ done: true, assisted, evidence: mode === 'before' ? 'ten seats, before' : 'condition 1 · empty room', caveat, data: { seats: Object.keys(firsts), moved: mode === 'before' ? notchesMove(TEN.map((x) => x.id), rig) : false, wrote: mode === 'after' ? true : false } }); };
  const ready = !left.length && (mode === 'before' || wrote);
  return <div className="fm-play" data-testid={`fm-play-${mode === 'before' ? 'measure' : 'verify'}`}>
    {mode === 'before' && firstCall === 'A' && <p className="fm-play__cons" data-testid="fm-cons-eq"><b>Because of your first call:</b> you cut the fill’s mids before measuring. Every reading below is of a changed system — the comparison you would need later is gone. You can still measure; the record will say so.</p>}
    {mode === 'before' && firstCall === 'B' && rig.fill === 'off' && <p className="fm-play__cons" data-testid="fm-cons-off"><b>Because of your first call:</b> the fill is still off. Off, the center is clear and the sides are thin — the hollowness people complain about is not there to measure. <button type="button" className="ui-btn ui-btn--sm" onClick={() => { setRig({ ...rig, fill: 'up' }); setMsg('The fill is back on.'); }} data-testid="fm-fill-on">Turn the fill back on</button></p>}
    <div className="fm-play__grid">
      <SeatMap sel={sel} onPick={setSel} got={new Set(Object.keys(got))} show={show} />
      <div className="fm-play__side">
        <Analyzer s={s} rig={rig} ghost={mode === 'after' && before ? { rig: beforeRig, label: 'before the re-aim' } : undefined} />
        <p className="fm-play__acts"><button type="button" className="ui-btn ui-btn--primary" onClick={record} data-testid="fm-record">Record this seat</button>
          {soundReady() && <button type="button" className="ui-btn" onClick={() => listenAt(s, rig)} data-testid="fm-listen">Listen here (3 s)</button>}</p>
        <p className="ui-meta" data-testid="fm-left">{left.length ? `${left.length} to go: ${left.map((id) => (id === 'BAL-F' ? 'balcony front' : id.replace('R', 'row ').replace('-', ' seat '))).join(', ')}` : 'All recorded.'}</p>
        {mode === 'after' && !left.length && <label className="fm-play__check"><input type="checkbox" checked={wrote} onChange={(e) => setWrote(e.target.checked)} data-testid="fm-wrote" /> Write it down: the balcony front is weaker than before (it used to get the fill).</label>}
      </div>
    </div>
    {Object.keys(got).length > 0 && <table className="fm-tab" data-testid="fm-readings"><thead><tr><th>Seat</th><th>First notch</th></tr></thead><tbody>{Object.entries(got).map(([id, f]) => <tr key={id}><td>{id === 'BAL-F' ? 'Balcony front' : id.replace('R', 'Row ').replace('-', ', seat ')}</td><td>{f ? `${f} Hz` : 'none'}</td></tr>)}</tbody></table>}
    <p className="ui-visually-hidden" role="status" aria-live="polite">{msg}</p>
    <p className="fm-play__acts">{done ? <span className="ui-tag" data-testid="fm-play-done">Recorded{done.assisted ? ' (shown)' : ''}</span> : <>
      <button type="button" className="ui-btn ui-btn--primary" disabled={!ready} onClick={() => finish(false)} data-testid="fm-play-finish">{mode === 'before' ? 'That’s the ten seats' : 'Sign off condition 1'}</button>
      <button type="button" className="ui-btn ui-btn--quiet" onClick={() => finish(true)} data-testid="fm-play-showme">Show me instead</button></>}</p>
  </div>;
}

/** Two years of comment cards: plot them, then read the cluster. The cards are props for the scene — card nine is the canon's own. */
const CARDS = [
  { id: 1, when: 'Oct, 2 years ago', row: 8, seat: 12, text: 'Could not follow the sermon from my usual seat.' },
  { id: 2, when: 'Nov, 2 years ago', row: 7, seat: 11, text: 'Pastor sounds far away in the middle.' },
  { id: 3, when: 'Nov, 2 years ago', row: 2, seat: 6, text: 'Parking lot lights are out again.', stray: true },
  { id: 4, when: 'Jan, 2 years ago', row: 9, seat: 13, text: 'Echo in row 9?' },
  { id: 5, when: 'Feb, 2 years ago', row: 8, seat: 13, text: 'Voice sounds hollow.' },
  { id: 6, when: 'Mar, 2 years ago', row: 8, seat: 10, text: 'Hard to hear the readings.' },
  { id: 7, when: 'May, 2 years ago', row: 7, seat: 12, text: 'Sounds like a tin can mid-room.' },
  { id: 8, when: 'Aug, 2 years ago', row: 1, seat: 18, text: 'Front row too loud during songs.', stray: true },
  { id: 9, when: 'Sep, 2 years ago', row: 8, seat: 12, text: 'Middle rows sound like the pastor is in a cupboard. — D.', canon: true },
  { id: 10, when: 'Dec, last year', row: 9, seat: 12, text: 'Still hollow in the middle.' },
  { id: 11, when: 'Mar, this year', row: 8, seat: 14, text: 'Moved seats, better on the aisle.' },
  { id: 12, when: 'Jun, this year', row: 7, seat: 13, text: 'Hollow sound center rows.' },
];
export function Cards({ done, onDone }: PlayProps) {
  const [plotted, setPlotted] = useState<number[]>([]); const [where, setWhere] = useState<string | null>(null); const [when, setWhen] = useState<string | null>(null);
  const all = plotted.length === CARDS.length; const right = where === 'centre' && when === 'after';
  return <div className="fm-play" data-testid="fm-play-cards">
    <p className="ui-meta">The renovation finished in September, two years ago — when the new center fill went up. <i>The cards are props for this scene; card nine is the story’s own.</i></p>
    <div className="fm-play__grid">
      <div className="fm-cards" role="list" aria-label="Comment cards">{CARDS.map((c) => { const on = plotted.includes(c.id); return <div role="listitem" key={c.id} className={`fm-card${on ? ' on' : ''}${c.canon ? ' canon' : ''}`}><p className="ui-meta">Card {c.id} · {c.when}</p><p>{c.text}</p><p className="ui-meta">row {c.row}, seat {c.seat}</p>
        <button type="button" className="ui-btn ui-btn--sm" disabled={on} onClick={() => setPlotted([...plotted, c.id])} data-testid={`fm-card-${c.id}`}>{on ? 'On the chart' : 'Plot it'}</button></div>; })}</div>
      <div className="fm-play__side"><svg viewBox="0 0 240 180" className="fm-chart" role="img" aria-label={`Seating chart with ${plotted.length} of ${CARDS.length} cards plotted`} data-testid="fm-chart">
        <rect x={40} y={4} width={160} height={14} rx={3} className="fm-map__stage" />
        {Array.from({ length: 11 }, (_, r) => Array.from({ length: 14 }, (_, c) => <circle key={`${r}-${c}`} cx={22 + c * 15} cy={30 + r * 13} r={2.5} className="fm-map__seat" />))}
        {plotted.map((id) => { const c = CARDS.find((x) => x.id === id)!; return <circle key={id} cx={22 + (c.seat - 5) * 15} cy={30 + (c.row - 1) * 13} r={5} className={`fm-chart__dot${c.stray ? ' stray' : ''}`} />; })}
      </svg>
      {all && <fieldset className="fm-q" data-testid="fm-cards-q"><legend>Where do the complaints cluster?</legend>{[['front', 'Rows 1–3'], ['centre', 'Rows 7–9, center'], ['aisles', 'Along the aisles'], ['everywhere', 'Everywhere']].map(([k, l]) => <label key={k}><input type="radio" name="fm-where" checked={where === k} onChange={() => setWhere(k!)} data-testid={`fm-where-${k}`} /> {l}</label>)}</fieldset>}
      {all && <fieldset className="fm-q"><legend>When did they start?</legend>{[['before', 'Before the renovation'], ['after', 'Just after the renovation'], ['recent', 'Only this year']].map(([k, l]) => <label key={k}><input type="radio" name="fm-when" checked={when === k} onChange={() => setWhen(k!)} data-testid={`fm-when-${k}`} /> {l}</label>)}</fieldset>}
      {all && where && when && !right && <p className="fm-play__cons" data-testid="fm-cards-wrong">Look again at the dots and the dates: the stray cards are about other things.</p>}
      {right && <p className="fm-play__ok" data-testid="fm-cards-right">A tight cluster in rows 7 to 9, center — starting just after the renovation.</p>}</div>
    </div>
    <p className="fm-play__acts">{done ? <span className="ui-tag" data-testid="fm-play-done">Recorded{done.assisted ? ' (shown)' : ''}</span> : <>
      <button type="button" className="ui-btn ui-btn--primary" disabled={!right} onClick={() => onDone({ done: true, assisted: false, evidence: 'EV-CASE001-01', caveat: null, data: { plotted: plotted.length } })} data-testid="fm-play-finish">Show Ray the chart</button>
      <button type="button" className="ui-btn ui-btn--quiet" onClick={() => onDone({ done: true, assisted: true, evidence: 'EV-CASE001-01', caveat: null, data: { plotted: CARDS.length } })} data-testid="fm-play-showme">Show me instead</button></>}</p>
  </div>;
}

/** Four explanations, one test each — the tests and their results are the canon's (panel 26). */
const TESTS = [
  { id: 'mic', name: 'The microphone', test: 'Play the same recording through every other seat', result: 'Clean in every other seat.', verdict: 'Contradicted' },
  { id: 'hearing', name: 'Dolores’s hearing', test: 'Sit there and listen yourself', result: 'Maya hears it too, so it isn’t only Dolores. Contradicted as the cause of the room problem — whether her hearing has changed is not Maya’s to judge.', verdict: 'Contradicted' },
  { id: 'air', name: 'The air handling', test: 'Switch it off and on again', result: 'No change.', verdict: 'Contradicted' },
  { id: 'room', name: 'The room', test: 'Fill alone, mains alone, then both together', result: 'Fill alone clear, mains alone clear, both together hollow.', verdict: 'Suspected' },
];
export function Board({ done, onDone }: PlayProps) {
  const [ran, setRan] = useState<string[]>([]); const [keep, setKeep] = useState<string | null>(null);
  const allRan = ran.length === TESTS.length;
  return <div className="fm-play" data-testid="fm-play-board">
    <ul className="fm-board">{TESTS.map((t) => { const on = ran.includes(t.id); return <li key={t.id} className={`fm-board__c${on ? ` is-${t.verdict.toLowerCase()}` : ''}`}><b>{t.name}</b>
      {on ? <p data-testid={`fm-test-${t.id}`}><span className="ui-tag">{t.verdict}</span> {t.result}</p> : <p><button type="button" className="ui-btn ui-btn--sm" onClick={() => setRan([...ran, t.id])} data-testid={`fm-run-${t.id}`}>{t.test}</button></p>}</li>; })}</ul>
    {allRan && <fieldset className="fm-q" data-testid="fm-board-q"><legend>Which explanation can the evidence not rule out?</legend>{TESTS.map((t) => <label key={t.id}><input type="radio" name="fm-keep" checked={keep === t.id} onChange={() => setKeep(t.id)} data-testid={`fm-keep-${t.id}`} /> {t.name}</label>)}</fieldset>}
    {keep && keep !== 'room' && <p className="fm-play__cons" data-testid="fm-board-wrong">That one was contradicted by its own test. Which one wasn’t?</p>}
    <p className="fm-play__acts">{done ? <span className="ui-tag" data-testid="fm-play-done">Recorded{done.assisted ? ' (shown)' : ''}</span> : <>
      <button type="button" className="ui-btn ui-btn--primary" disabled={keep !== 'room'} onClick={() => onDone({ done: true, assisted: false, evidence: 'The Room · suspected', caveat: null, data: { ran: ran.length } })} data-testid="fm-play-finish">Keep the room</button>
      <button type="button" className="ui-btn ui-btn--quiet" onClick={() => onDone({ done: true, assisted: true, evidence: 'The Room · suspected', caveat: null, data: { ran: 4 } })} data-testid="fm-play-showme">Show me instead</button></>}</p>
  </div>;
}

/** "If it's the reflection, turning the fill down should make the notches shallower. If it doesn't, I'm wrong." */
export function FillTest({ done, onDone }: PlayProps) {
  const [db, setDb] = useState(0); const [rec, setRec] = useState<Record<string, number>>({}); const s = seat('R8-13');
  const rig = useMemo<Rig>(() => ({ ...RIG_START, fillDb: db }), [db]); const r = reading(s, rig);
  const shallower = '0' in rec && Object.keys(rec).some((k) => Number(k) <= -6 && rec[k]! > rec['0']!);
  return <div className="fm-play" data-testid="fm-play-filltest">
    <div className="fm-play__grid"><Analyzer s={s} rig={rig} ghost={db !== 0 ? { rig: RIG_START, label: 'fill at its usual level' } : undefined} />
      <div className="fm-play__side">
        <label className="fm-fader">Fill level <b>{db} dB</b><input type="range" min={-6} max={0} step={1} value={db} onChange={(e) => setDb(Number(e.target.value))} data-testid="fm-fader" aria-valuetext={`${db} decibels`} /></label>
        <p className="fm-play__acts"><button type="button" className="ui-btn ui-btn--primary" onClick={() => setRec({ ...rec, [String(db)]: r.depth })} data-testid="fm-record">Record seat 13 at {db} dB</button>
          {soundReady() && <button type="button" className="ui-btn" onClick={() => listenAt(s, rig)} data-testid="fm-listen">Listen (3 s)</button>}</p>
        {Object.keys(rec).length > 0 && <ul className="fm-tab" data-testid="fm-readings">{Object.entries(rec).sort((a, b) => Number(b[0]) - Number(a[0])).map(([k, v]) => <li key={k}>Fill {k} dB: deepest notch {v} dB</li>)}</ul>}
        {!('0' in rec) && <p className="ui-meta">Record it at 0 dB first, so you have something to compare with.</p>}
        {shallower && <p className="fm-play__ok" data-testid="fm-fill-shallower">The notches get shallower. Not gone. The reflection idea survives the test.</p>}
      </div></div>
    <p className="fm-play__acts">{done ? <span className="ui-tag" data-testid="fm-play-done">Recorded{done.assisted ? ' (shown)' : ''}</span> : <>
      <button type="button" className="ui-btn ui-btn--primary" disabled={!shallower} onClick={() => onDone({ done: true, assisted: false, evidence: 'EV-S01E01-08', caveat: null, data: { levels: Object.keys(rec) } })} data-testid="fm-play-finish">Write the result down</button>
      <button type="button" className="ui-btn ui-btn--quiet" onClick={() => onDone({ done: true, assisted: true, evidence: 'EV-S01E01-08', caveat: null, data: { levels: ['0', '-6'] } })} data-testid="fm-play-showme">Show me instead</button></>}</p>
  </div>;
}

/** What the model shows for each Sunday plan (BR-S01E01-02), beside the canon's own result. */
export function PlanConsequence({ letter }: { letter: string }) {
  const s13 = seat('R8-13');
  if (letter === 'A') return <div data-testid="fm-plan-model"><Analyzer s={s13} rig={{ ...RIG_START, eq: true }} ghost={{ rig: RIG_START, label: 'as it was' }} label="Seat 13 with the notches EQ’d" /><p className="ui-meta">EQ changes every seat at once; the notches sit at different frequencies in each, so the comb is still there.</p></div>;
  if (letter === 'B') return <div data-testid="fm-plan-model"><Analyzer s={seat('BAL-F')} rig={{ ...RIG_START, fill: 'off' }} label="Balcony front with the fill off" /><p className="ui-meta">Off, the ten seats clear up — and everything the fill was there for goes thin.</p></div>;
  if (letter === 'D') return <div data-testid="fm-plan-model"><Analyzer s={seat('R8-12')} rig={RIG_START} label="Seat 12, after Dolores moves" /><p className="ui-meta">The seat is still hollow for whoever sits in it next.</p></div>;
  return <div data-testid="fm-plan-model"><Analyzer s={s13} rig={{ ...RIG_START, fill: 'reaimed' }} ghost={{ rig: RIG_START, label: 'as it is now' }} label="Seat 13 if the fill is re-aimed (predicted)" /><p className="ui-meta">A prediction until it is measured — that is Thursday’s job.</p></div>;
}
