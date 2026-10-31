/**
 * SIGNAL runners shared by the demonstrator and the enterprise application: a lesson's check (QuizRunner) and the six interactive
 * drill kinds (DrillRunner). A completion is reported to the caller, who records it as training — training never grants authority.
 */
import { useState } from 'react';
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

export function DrillRunner({ d, onDone }: { d: Drill; onDone: (correct: boolean, elapsedS: number) => void }) {
  const [started] = useState(() => Date.now());
  const [result, setResult] = useState<{ correct: boolean; text: string } | null>(null);
  const finish = (correct: boolean, text: string) => { setResult({ correct, text }); onDone(correct, Math.round((Date.now() - started) / 1000)); };
  return (
    <article className="stack" data-testid="drill"><h2 className="build__h">{d.title} <Tag tone="muted">{d.domain} · {d.type}</Tag></h2><p>{d.brief}</p>
      {!result ? <DrillBody d={d} finish={finish} /> : <Notice tone={result.correct ? 'ok' : 'warn'}><b>{result.correct ? 'Right.' : 'Not this time.'}</b> {result.text}</Notice>}
    </article>
  );
}

function DrillBody({ d, finish }: { d: Drill; finish: (c: boolean, t: string) => void }) {
  const [picked, setPicked] = useState<number[]>([]); const [order, setOrder] = useState<number[] | null>(null); const [cls, setCls] = useState<Record<number, string>>({}); const [slots, setSlots] = useState<Record<number, string>>({});
  if (d.type === 'firstfail') { const st = d['stages'] as Array<{ name: string; reading: string; why: string }>; const ans = d['answer'] as number; return <ol className="learn__stages">{st.map((s, i) => <li key={i}><button type="button" onClick={() => finish(i === ans, i === ans ? String(d.success) : `${s.why} The first failure is at ${st[ans]!.name}: ${st[ans]!.why}`)}><b>{s.name}</b><span className="ui-meta">{s.reading}</span></button></li>)}</ol>; }
  if (d.type === 'clues') { const cl = d['clues'] as Array<{ t: string; k: string; why: string }>; const need = d['need'] as number; const pick = d['pick'] as number; return <div className="stack"><p className="ui-meta">Hypotheses: {(d['hypotheses'] as string[]).join(' · ')}. Pick the {pick} clues that separate them.</p><ul className="plain">{cl.map((c, i) => <li key={i}><label className="check"><input type="checkbox" checked={picked.includes(i)} onChange={(e) => setPicked(e.target.checked ? [...picked, i] : picked.filter((x) => x !== i))} /> {c.t}</label></li>)}</ul><Button small kind="primary" disabled={picked.length !== pick} onClick={() => { const keys = picked.filter((i) => cl[i]!.k === 'key').length; const destroyed = picked.some((i) => cl[i]!.k === 'destroys'); const ok = keys >= need && !destroyed; finish(ok, ok ? String(d.success) : picked.map((i) => `${cl[i]!.t}: ${cl[i]!.why}`).join(' ')); }}>Check ({picked.length}/{pick})</Button></div>; }
  if (d.type === 'order') { const items = d['items'] as string[]; const cur = order || items.map((_, i) => i).sort(() => Math.random() - 0.5); const move = (i: number, dir: number) => { const n = [...cur]; const j = i + dir; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j]!, n[i]!]; setOrder(n); }; return <div className="stack"><ol className="learn__order">{cur.map((idx, i) => <li key={idx}><span>{items[idx]}</span><span className="row-actions"><Button small kind="quiet" onClick={() => move(i, -1)}>↑</Button><Button small kind="quiet" onClick={() => move(i, 1)}>↓</Button></span></li>)}</ol><Button small kind="primary" onClick={() => { const ok = cur.every((idx, i) => idx === i); finish(ok, ok ? String(d.success) : (d['why'] as string[]).map((w, i) => `${i + 1}. ${items[i]} — ${w}`).join(' ')); }}>Check the order</Button></div>; }
  if (d.type === 'classmatch') { const items = d['items'] as Array<{ s: string; c: string; why: string }>; const classes = [...new Set(items.map((x) => x.c))]; return <div className="stack">{items.map((it, i) => <div key={i} className="build__row"><span>{it.s}</span><select aria-label="Class" value={cls[i] || ''} onChange={(e) => setCls({ ...cls, [i]: e.target.value })}><option value="">—</option>{classes.map((c) => <option key={c}>{c}</option>)}</select></div>)}<Button small kind="primary" disabled={Object.keys(cls).length !== items.length} onClick={() => { const wrong = items.filter((it, i) => cls[i] !== it.c); const ok = wrong.length <= ((d['allow'] as number) || 0); finish(ok, ok ? String(d.success) : wrong.map((it) => `${it.s} → ${it.c}: ${it.why}`).join(' ')); }}>Check</Button></div>; }
  if (d.type === 'route') { const sl = d['slots'] as Array<{ label: string; answer: string }>; const pool = d['pool'] as string[]; const why = d['why'] as Record<string, string>; return <div className="stack">{sl.map((s, i) => <div key={i} className="build__row"><b>{s.label}</b><select aria-label={s.label} value={slots[i] || ''} onChange={(e) => setSlots({ ...slots, [i]: e.target.value })}><option value="">—</option>{pool.map((p) => <option key={p}>{p}</option>)}</select></div>)}<Button small kind="primary" disabled={Object.keys(slots).length !== sl.length} onClick={() => { const wrong = sl.filter((s, i) => slots[i] !== s.answer); const ok = !wrong.length; finish(ok, ok ? String(d.success) : wrong.map((s, i) => `${s.label}: ${why[slots[sl.indexOf(s)] || ''] || ''} The stage is ${s.answer}.`).join(' ')); }}>Check the path</Button></div>; }
  if (d.type === 'triage') { const items = d['items'] as Array<{ id: string; name: string; cost: number; L: number; I: number; must?: boolean; why: string }>; const budget = d['budget'] as number; const spent = picked.reduce((n, i) => n + items[i]!.cost, 0); const risk = (it: { L: number; I: number }) => it.L * it.I; const total = items.reduce((n, it) => n + risk(it), 0); const retired = picked.reduce((n, i) => n + risk(items[i]!), 0); return <div className="stack"><p className="ui-meta">Budget {budget.toLocaleString()} {String(d['unit'])} · spent {spent.toLocaleString()} · risk retired {retired}/{total} (likelihood × impact)</p><ul className="plain">{items.map((it, i) => <li key={it.id}><label className="check"><input type="checkbox" checked={picked.includes(i)} onChange={(e) => setPicked(e.target.checked ? [...picked, i] : picked.filter((x) => x !== i))} /> <b>{it.name}</b> {it.cost.toLocaleString()} · L{it.L} I{it.I}{it.must ? ' · commitment' : ''}</label></li>)}</ul><Button small kind="primary" onClick={() => { const musts = items.every((it, i) => !it.must || picked.includes(i)); const ok = spent <= budget && musts && retired / total >= (d['target'] as number); finish(ok, ok ? String(d.success) : `${spent > budget ? 'Over budget. ' : ''}${!musts ? 'A commitment was skipped. ' : ''}${retired / total < (d['target'] as number) ? `Only ${Math.round((retired / total) * 100)}% of the risk retired. ` : ''}${items.map((it) => `${it.name}: ${it.why}`).join(' ')}`); }}>Fund the plan</Button></div>; }
  return <Notice tone="warn">Drill kind {d.type} is not interactive yet.</Notice>;
}
