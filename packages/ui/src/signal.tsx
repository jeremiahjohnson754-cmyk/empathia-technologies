/**
 * SIGNAL runners shared by the demonstrator and the enterprise application: a lesson's check (QuizRunner) and the six interactive
 * drill kinds (DrillRunner). A completion is reported to the caller, who records it as training — training never grants authority.
 */
import { useEffect, useRef, useState } from 'react';
import * as D from './drills.js';
import * as I from './incidents.js';
import { Button, Notice, Tag } from './components.js';

export interface Quiz { title: string; domain: string; qs: Array<{ q: string; o: string[]; a: number; why: string }> }
export interface Drill { id: string; type: string; domain: string; time: number; title: string; brief: string; success?: string; [k: string]: unknown }
export const DRILL_KINDS: Array<[string, string]> = [['firstfail', 'First failure'], ['clues', 'Separate the clues'], ['order', 'Put it in order'], ['route', 'Build the path'], ['classmatch', 'Classify the cause'], ['triage', 'Spend the budget']];
/** First-party library text (lesson cards and formulas carry <b> and formula spans), shipped with the build; never user input. */
export const libHtml = (s: string) => ({ __html: s });

export function QuizRunner({ q, onComplete }: { q: Quiz; onComplete?: (score: number, total: number) => void }) {
  const [ans, setAns] = useState<Record<number, number>>({});
  const score = q.qs.filter((x, i) => ans[i] === x.a).length;
  const answer = (i: number, j: number) => { const next = { ...ans, [i]: j }; setAns(next); if (onComplete && Object.keys(next).length === q.qs.length && Object.keys(ans).length < q.qs.length) onComplete(q.qs.filter((x, k) => next[k] === x.a).length, q.qs.length); };
  return (
    <div className="card stack" data-testid="quiz"><h3 className="build__h">{q.title}</h3>
      {q.qs.map((x, i) => <div key={i} className="stack"><p><b>{i + 1}. {x.q}</b></p><div className="learn__opts">{x.o.map((o, j) => <button key={j} type="button" className={`sp__chip${ans[i] === j ? (j === x.a ? ' ok' : ' bad') : ''}`} onClick={() => answer(i, j)}>{o}</button>)}</div>{ans[i] !== undefined && <p className="ui-meta">{ans[i] === x.a ? 'Right. ' : 'Not quite. '}{x.why}</p>}</div>)}
      <p className="ui-meta">{Object.keys(ans).length === q.qs.length ? `${score} of ${q.qs.length} — a check of understanding, not a credential.` : `${Object.keys(ans).length} of ${q.qs.length} answered`}</p>
    </div>
  );
}

/**
 * A practice drill, to the reference's rules (drills.ts). `factor` is the clock: 0 untimed (the default, as Learn has always run them),
 * 1 the drill's own time, 2 relaxed. With a clock the brief is read first and "Start the clock" starts it; running out fails the try.
 * Every try is reported to `onDone`; a failure explains itself and offers "Try again".
 */
export function DrillRunner({ d, onDone, factor = 0, heading = 'h2' }: { d: Drill; onDone: (correct: boolean, elapsedS: number) => void; factor?: number; heading?: 'h2' | 'h4' }) {
  const [round, setRound] = useState(0); const secs = D.clockFor(d, factor);
  const [started, setStarted] = useState<number | null>(secs ? null : Date.now()); const [left, setLeft] = useState(secs || 0);
  const [v, setV] = useState<D.Verdict | null>(null);
  const finish = (x: D.Verdict) => { if (v) return; setV(x); onDone(x.pass, Math.round((Date.now() - (started || Date.now())) / 1000)); };
  useEffect(() => { if (!secs || started === null || v) return undefined; const id = setInterval(() => setLeft((l) => l - 1), 1000); return () => clearInterval(id); }, [secs, started, v]);
  useEffect(() => { if (secs && started !== null && !v && left <= 0) finish(D.timeoutVerdict(d)); });
  const again = () => { setV(null); setLeft(secs || 0); setStarted(secs ? null : Date.now()); setRound(round + 1); };
  const title = <>{d.title} <Tag tone="muted">{d.domain} · {D.KIND_LABEL[d.type] || d.type}</Tag></>;
  return (
    <article className="stack dr" data-testid="drill" data-drill={d.id} data-kind={d.type} data-state={v ? (v.pass ? 'passed' : 'failed') : started === null ? 'ready' : 'running'}>
      {heading === 'h2' ? <h2 className="build__h">{title}</h2> : <h4 className="build__h">{title}</h4>}
      <p className="dr__brief">{d.brief}</p>
      {secs ? <p className={`dr__clock${left <= 10 && started !== null && !v ? ' is-hot' : ''}`} data-testid="drill-clock" aria-live="off">⏱ {started === null ? D.fmt(secs) : D.fmt(left)}</p> : d.time ? <p className="ui-meta">Untimed here (the drill’s own clock is {D.fmt(d.time)}).</p> : null}
      {started === null ? <p className="dr__start"><span className="ui-meta">Read the brief. The clock starts when you press Start.</span> <Button kind="primary" onClick={() => setStarted(Date.now())}>▶ Start the clock ({D.fmt(secs || 0)})</Button></p>
        : <DrillBody key={round} d={d} done={!!v} finish={finish} />}
      {v && <div data-testid="drill-verdict" data-pass={v.pass}><Notice tone={v.pass ? 'ok' : 'warn'}><b>{v.head}</b><ul className="dr__lines">{v.lines.filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ul></Notice>
        {!v.pass && <p><Button onClick={again}>Try again</Button></p>}</div>}
    </article>
  );
}

function DrillBody({ d, done, finish }: { d: Drill; done: boolean; finish: (v: D.Verdict) => void }) {
  const [picked, setPicked] = useState<number[]>([]); const [order, setOrder] = useState<number[]>(() => (d.type === 'order' ? D.orderStart(d) : []));
  const [cls, setCls] = useState<Record<number, string>>({}); const [slots, setSlots] = useState<Record<number, string>>({}); const [sel, setSel] = useState<string | null>(null);
  const [ff, setFf] = useState<number | null>(null);
  if (d.type === 'firstfail') { const st = d['stages'] as D.Stage[]; const ans = d['answer'] as number;
    return <div className="stack"><p className="ui-meta">{(d['ask'] as string) || 'Tap the earliest stage where the evidence shows the failure. Upstream of it, everything reads normal.'}</p>
      <ol className="learn__stages">{st.map((s, i) => <li key={i}><button type="button" disabled={done} data-state={ff === null ? '' : i === ans ? 'right' : i === ff ? 'wrong' : ''} onClick={() => { setFf(i); finish(D.gradeFirstfail(d, i)); }}><b>{i + 1} · {s.name}</b><span className="ui-meta">{s.reading}</span></button></li>)}</ol></div>; }
  if (d.type === 'clues') { const cl = d['clues'] as D.Clue[]; const pick = d['pick'] as number;
    return <div className="stack"><p className="ui-meta">Pick exactly {pick} clues that best separate the explanations. Some cards are red herrings; some are actions that would destroy evidence.</p>
      {Array.isArray(d['hypotheses']) && <p className="ui-meta">Explanations on the board: {(d['hypotheses'] as string[]).join(' · ')}</p>}
      <div className="dr__grid">{D.clueOrder(d).map((i) => { const on = picked.includes(i); return <button key={i} type="button" className="dr__btn" aria-pressed={on} disabled={done || (!on && picked.length >= pick)} data-state={!done ? '' : cl[i]!.k === 'key' ? 'right' : on ? 'wrong' : ''} onClick={() => setPicked(on ? picked.filter((x) => x !== i) : [...picked, i])}>{cl[i]!.t}</button>; })}</div>
      <p className="dr__foot"><span className="ui-meta">{picked.length} of {pick} picked</span> <Button kind="primary" disabled={done || picked.length !== pick} onClick={() => finish(D.gradeClues(d, picked))}>Submit clues</Button></p></div>; }
  if (d.type === 'order') { const items = d['items'] as string[];
    return <div className="stack"><p className="ui-meta">Put the steps in the order a professional would take them. Use ▲ ▼.</p>
      <ol className="dr__order">{order.map((idx, pos) => <li key={idx} data-state={!done ? '' : idx === pos ? 'right' : 'wrong'}><span>{items[idx]}</span><span className="dr__moves"><button type="button" className="dr__mv" aria-label={`Move up: ${items[idx]}`} disabled={done || pos === 0} onClick={() => setOrder(D.move(order, pos, -1))}>▲</button><button type="button" className="dr__mv" aria-label={`Move down: ${items[idx]}`} disabled={done || pos === order.length - 1} onClick={() => setOrder(D.move(order, pos, 1))}>▼</button></span></li>)}</ol>
      <p className="dr__foot"><Button kind="primary" disabled={done} onClick={() => finish(D.gradeOrder(d, order))}>Check the order</Button></p></div>; }
  if (d.type === 'classmatch') { const items = d['items'] as D.ClassItem[]; const { list, custom } = D.classesFor(d);
    return <div className="stack"><p className="ui-meta">{custom ? `Sort each one into the right group: ${list.join(' · ')}.` : 'For each symptom, choose the failure class of the CAUSE described. Symptoms and causes are often in different classes.'}</p>
      {items.map((it, i) => <div key={i} className="dr__cm"><p className="dr__sym">{it.s}</p><div className="dr__chips" role="group" aria-label={custom ? 'Group' : 'Failure class'}>{list.map((c) => <button key={c} type="button" className="dr__chip" aria-pressed={cls[i] === c} disabled={done} data-state={!done ? '' : c === it.c ? 'right' : c === cls[i] ? 'wrong' : ''} onClick={() => setCls({ ...cls, [i]: c })}>{c}</button>)}</div></div>)}
      <p className="dr__foot"><Button kind="primary" disabled={done} onClick={() => finish(D.gradeClassmatch(d, cls))}>Check the classes</Button></p></div>; }
  if (d.type === 'route') { const sl = d['slots'] as D.Slot[]; const used = new Set(Object.values(slots));
    const place = (i: number) => { if (done) return; if (sel) { const n: Record<number, string> = {}; for (const [k, v] of Object.entries(slots)) if (v !== sel) n[Number(k)] = v; n[i] = sel; setSlots(n); setSel(null); } else if (slots[i]) { const n = { ...slots }; delete n[i]; setSlots(n); } };
    return <div className="stack"><p className="ui-meta">Tap a part, then tap the slot it belongs in. Tap a filled slot to empty it.</p>
      <ol className="dr__slots">{sl.map((s, i) => <li key={i}><button type="button" className="dr__slot" disabled={done} data-state={!done ? '' : slots[i] === s.answer ? 'right' : 'wrong'} aria-label={`${s.label}: ${slots[i] || 'empty'}`} onClick={() => place(i)}><b>{s.label}</b><span>{slots[i] || (sel ? 'place it here' : 'empty')}</span></button></li>)}</ol>
      <div className="dr__chips" role="group" aria-label="Parts">{D.routePool(d).map((c) => <button key={c} type="button" className="dr__chip" aria-pressed={sel === c} disabled={done} data-used={used.has(c)} onClick={() => setSel(sel === c ? null : c)}>{c}</button>)}</div>
      <p className="dr__foot"><Button kind="primary" disabled={done} onClick={() => finish(D.gradeRoute(d, slots))}>Check the path</Button></p></div>; }
  if (d.type === 'triage') { const items = d['items'] as D.TriageItem[]; const budget = d['budget'] as number; const t = D.triageTotals(d, picked);
    return <div className="stack"><p className="ui-meta">Budget {D.money(d, budget)}. Risk = likelihood (1–5) × impact (1–5). Tap items to fund them. Every figure is illustrative.</p>
      <p className="dr__meter" data-over={t.cost > budget}><b>Spent {D.money(d, t.cost)} of {D.money(d, budget)}</b> · risk retired {t.risk}</p>
      <div className="dr__grid">{items.map((it, i) => { const on = picked.includes(i); return <button key={it.id} type="button" className="dr__btn" aria-pressed={on} disabled={done} onClick={() => setPicked(on ? picked.filter((x) => x !== i) : [...picked, i])}><b>{it.name}{it.must ? ' · commitment' : ''}</b><span className="ui-meta">{D.money(d, it.cost)} · L{it.L} × I{it.I} = {D.risk(it)}</span></button>; })}</div>
      <p className="dr__foot"><Button kind="primary" disabled={done} onClick={() => finish(D.gradeTriage(d, picked))}>Present the plan</Button></p></div>; }
  return <Notice tone="warn">Drill kind {d.type} is not interactive yet.</Notice>;
}

/**
 * A live incident (Service Mode), to the reference's rules (incidents.ts): the briefing first, then "Start the incident"; the clock runs
 * in real time and every action spends its seconds; a calculation gate opens before its action; "Declare the incident resolved" ends
 * it; the debrief shows the score grid, why each move mattered and an expert's path. `factor`: 1 the incident's clock, 2 relaxed,
 * 0 timer off (it counts, never ends). Each finished run is reported to `onEnd`.
 */
export function IncidentRunner({ inc, factor = 1, onEnd, heading = 'h2' }: { inc: I.Incident; factor?: number; onEnd?: (outcome: I.Outcome, why: I.EndWhy) => void; heading?: 'h2' | 'h4' }) {
  const [st, setSt] = useState<I.State | null>(null); const [calc, setCalc] = useState<{ a: I.Action; v: string; tries: number; msg: string } | null>(null);
  const reported = useRef<I.State | null>(null);
  useEffect(() => { if (!st || st.over) return undefined; const id = setInterval(() => setSt((s) => (s ? I.tick(inc, s, 1) : s)), 1000); return () => clearInterval(id); }, [st === null, st?.over, inc]);
  useEffect(() => { if (st?.end && reported.current !== st) { reported.current = st; onEnd?.(st.end.outcome, st.end.why); } });
  const run = (a: I.Action) => { if (!st) return; if (a.calc) { setCalc({ a, v: '', tries: 0, msg: '' }); return; } setSt(I.act(inc, st, a)); };
  const submit = () => { if (!st || !calc) return; const v = Number(calc.v.replace(',', '.')); if (calc.v.trim() === '' || !Number.isFinite(v)) { setCalc({ ...calc, msg: 'Enter a number.' }); return; }
    const r = I.answerCalc(inc, st, calc.a, v); setSt(r.state); if (r.right) setCalc(null); else { const tries = calc.tries + 1; setCalc({ ...calc, tries, msg: `✕ Not right. ${tries >= 2 ? 'The equation is shown below.' : 'Put the numbers into the formula.'} That cost ${calc.a.calc!.penalty || 10} seconds.` }); } };
  const H = heading === 'h2' ? 'h2' : 'h4'; const clock = st ? st.left : inc.clock * (factor || 1);
  const head = <><span className="in__k">Incident {inc.id} · {inc.priority}</span>{H === 'h2' ? <h2 className="build__h">{inc.title}</h2> : <h4 className="build__h">{inc.title}</h4>}<p className="in__brief">{inc.brief}</p></>;
  return (
    <article className="stack in" data-testid="incident" data-incident={inc.id} data-state={!st ? 'ready' : st.end ? st.end.outcome : 'running'}>
      <div className="in__head"><div>{head}</div><p className={`in__clock${st && !st.over && st.timed && st.left <= 20 ? ' is-hot' : ''}`} data-testid="incident-clock" role="timer" aria-live="off"><b>{I.fmtS(clock)}</b><span>{st && !st.timed ? `timer off · ${inc.deadline.toLowerCase()}` : `until ${inc.deadline.toLowerCase()}`}</span></p></div>
      {!st && <div className="in__card"><p className="in__k">Briefing</p><p>{inc.briefing}</p>{inc.note && <p className="ui-meta">{inc.note}</p>}<p><Button kind="primary" onClick={() => setSt(I.begin(inc, factor))}>▶ Start the incident</Button></p><p className="ui-meta">Actions unlock when you start the incident.</p></div>}
      {st && <>
        <div className="in__grid">
          <div className="in__card"><p className="in__k">System state</p><ul className="in__rows">{Object.entries(inc.status).map(([k, d]) => <li key={k}><span>{d.label}</span><b data-ok={st.status[k] === d.ok}>{st.status[k]}</b></li>)}</ul></div>
          <div className="in__card"><p className="in__k">Trust</p><ul className="in__rows">{Object.entries(st.trust).map(([k, v]) => <li key={k}><span>{k}</span><b>{I.TRUST_WORDS[Math.max(0, Math.min(5, v))]}</b></li>)}</ul></div>
          <div className="in__card" data-testid="incident-evidence"><p className="in__k">Evidence tray</p><ul className="in__tray">{Object.entries(inc.evidence).filter(([e]) => st.ev[e] || st.lost[e]).map(([e, d]) => <li key={e} data-lost={!!st.lost[e]}>{st.lost[e] ? `Lost · ${d.l}` : `${d.s} · ${d.l}`}</li>)}</ul>{!Object.keys(st.ev).length && !Object.keys(st.lost).length && <p className="ui-meta">Empty. Nothing collected yet.</p>}</div>
        </div>
        {!st.end && <div className="in__acts" data-testid="incident-actions" role="group" aria-label="Actions">{I.visible(inc, st).map((a) => <button key={a.id} type="button" className="in__act" data-action={a.id} disabled={!I.available(a, st)} onClick={() => run(a)}><span>{a.label}</span><span className="ui-meta">⏱ {I.costOf(a, st) ? `${I.costOf(a, st)} s` : 'instant'}{a.calc ? ' · calculate' : ''}{(a.badges || []).map((b) => ` · ${b[1]}`).join('')}</span></button>)}
          <button type="button" className="in__act in__act--declare" data-testid="incident-declare" onClick={() => setSt(I.declare(inc, st))}><span>Declare the incident resolved</span><span className="ui-meta">ends the incident</span></button></div>}
        {calc && !st.end && <div className="in__card" role="group" aria-label="Work it out" data-testid="incident-calc"><p className="in__k">🧮 {calc.a.label}</p><p>{calc.a.calc!.q}</p>
          <p className="in__calc"><input className="in__input" inputMode="decimal" aria-label={calc.a.calc!.q} placeholder={calc.a.calc!.unit ? `… ${calc.a.calc!.unit}` : '…'} value={calc.v} onChange={(e) => setCalc({ ...calc, v: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} />{calc.a.calc!.unit && <span>{calc.a.calc!.unit}</span>}
            <Button kind="primary" onClick={submit}>Submit</Button><Button onClick={() => setCalc(null)}>Cancel</Button></p>
          {calc.msg && <p aria-live="polite">{calc.msg}</p>}{calc.tries >= 2 && calc.a.calc!.hint && <p className="in__eq">{calc.a.calc!.hint}</p>}</div>}
        {st.end && (() => { const d = I.debrief(inc, st); return <div className="in__card in__end" data-testid="incident-end" data-outcome={st.end.outcome}><p className="in__out"><b>{st.end.head}</b></p><p>{st.end.text}</p>
          <dl className="in__score"><div><dt>Service</dt><dd>{d.service}</dd></div><div><dt>Proof</dt><dd>{d.proof}</dd></div><div><dt>Evidence</dt><dd>{d.evidence}</dd></div><div><dt>Trust</dt><dd>{d.trust}</dd></div><div><dt>Boundaries</dt><dd>{d.boundaries}</dd></div><div><dt>Clock left</dt><dd>{d.clockLeft}</dd></div></dl>
          {d.lessons.length > 0 && <><p className="in__k">Why your moves mattered</p><ul className="in__list">{d.lessons.map((l) => <li key={l}>{l}</li>)}</ul></>}
          <p className="in__k">An expert’s path</p><ol className="in__list">{inc.expert.map((x) => <li key={x}>{x}</li>)}</ol>
          <p><Button onClick={() => { setSt(null); setCalc(null); }}>Run it again</Button></p></div>; })()}
        <div className="in__card"><p className="in__k">Incident log</p><ol className="in__log" aria-label="Incident log" reversed>{st.log.slice().reverse().map((l, i) => <li key={st.log.length - i} data-tone={l.tone}><span className="in__t">[{I.fmtS(l.t)}]</span> {l.text}</li>)}</ol></div>
      </>}
    </article>
  );
}
