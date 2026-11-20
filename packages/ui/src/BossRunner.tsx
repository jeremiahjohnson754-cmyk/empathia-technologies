/**
 * A SIGNAL boss level (Episode 11), to the reference's mountBoss (chal_boss.js) on the pure engine in boss.ts: the briefing (stakes,
 * the run's stages as pips, the rules, calm lights, the record), then one stage at a time on its own clock — the trace, the calls, the
 * five challenges (one shot each), and from Season 8 the commission: ask, scope, design, cost. Any failure ends the run with the reason
 * and "Start the run over". The alarm light is a soft edge glow that pulses at most once a second (yellow under pressure, red when time
 * is short or the run just failed, green when cleared); reduced motion or calm lights make it a steady tint. No inline styles.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Notice } from './components.js';
import * as BX from './boss.js';
import { shuffle, hashSeed } from './drills.js';
import { ChallengeRunner, type ChalOutcome } from './ChallengeRunner.js';
import { libHtml } from './signal.js';

export interface Formula { name: string; eq: string; where?: Array<[string, string]>; note?: string; ex?: string; when?: string; opts?: string[] }
type Props = { id: string; B: BX.Boss; factor?: number; tier?: number; formulas?: Record<string, Formula>; record?: BX.BossRecord; onRecord?: (r: BX.BossRecord) => void; onChallenge?: (key: string, score: number, passed: boolean) => void; heading?: 'h2' | 'h3' };
type Alarm = 'y' | 'r' | 'g' | 'rf' | null;
type Phase = { k: 'intro' } | { k: 'stage'; i: number } | { k: 'cleared'; i: number; msg?: string } | { k: 'failed'; i: number; title: string; why: string } | { k: 'won' };
const fmt = (s: number) => { const t = Math.max(0, Math.ceil(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const LV = ['', 'Beginner', 'Intermediate', 'Advanced', 'Mastery'];
const calmRead = () => { try { return globalThis.localStorage?.getItem('signal-calm') === '1'; } catch { return false; } };
const calmWrite = (v: boolean) => { try { globalThis.localStorage?.setItem('signal-calm', v ? '1' : '0'); } catch { /* per-viewer convenience only */ } };

export function BossRunner({ id, B, factor = 1, tier = 2, formulas = {}, record, onRecord, onChallenge, heading = 'h2' }: Props) {
  const [phase, setPhase] = useState<Phase>({ k: 'intro' }); const [rec, setRec] = useState<BX.BossRecord>(record || { tries: 0, passed: false, best: 0 });
  const [alarm, setAlarm] = useState<Alarm>(null); const [calm, setCalm] = useState(calmRead); const [left, setLeft] = useState(0); const t0 = useRef(0);
  const save = (r: BX.BossRecord) => { setRec(r); onRecord?.(r); };
  const i = phase.k === 'stage' || phase.k === 'cleared' || phase.k === 'failed' ? phase.i : -1, step = i >= 0 ? B.steps[i]! : null, secs = step ? BX.stageSecs(B, step, factor) : 0, live = phase.k === 'stage';
  const begin = () => { save(BX.beginRun(rec)); t0.current = Date.now(); go(0); };
  const go = (n: number) => { const s = B.steps[n]!; setLeft(BX.stageSecs(B, s, factor)); setAlarm('y'); setPhase({ k: 'stage', i: n }); };
  const outcome = (o: BX.Outcome) => { if (phase.k !== 'stage') return; if (o.ok) { setAlarm('g'); setPhase({ k: 'cleared', i: phase.i, msg: o.msg }); } else { save(BX.reached(rec, phase.i)); setAlarm('rf'); setPhase({ k: 'failed', i: phase.i, title: o.title, why: o.why }); } };
  const next = () => { if (phase.k !== 'cleared') return; const n = phase.i + 1, r = BX.reached(rec, n); if (n >= B.steps.length) { save(BX.won(r, B, Date.now())); setAlarm('g'); setPhase({ k: 'won' }); } else { save(r); go(n); } };
  useEffect(() => { if (!live || !secs) return undefined; const t = setInterval(() => setLeft((l) => l - 1), 1000); return () => clearInterval(t); }, [live, secs, i]);
  useEffect(() => { if (live && secs) { if (left <= 0) outcome(BX.timeoutOutcome(step!)); else setAlarm(BX.lowClock(left, secs) ? 'r' : 'y'); } }, [left]);
  useEffect(() => { if (alarm === 'rf') { const t = setTimeout(() => setAlarm('r'), 2600); return () => clearTimeout(t); } if (alarm === 'g' && phase.k === 'won') { const t = setTimeout(() => setAlarm(null), 4000); return () => clearTimeout(t); } return undefined; }, [alarm, phase.k]);
  const H = heading;
  const pips = (at: number, dead = false) => <ol className="boss__pips" aria-label="Run progress">{B.steps.map((s, k) => { const m = BX.stepMode(s); return <li key={k} data-state={k < at ? 'done' : k === at ? (dead ? 'dead' : 'now') : 'todo'} title={`${BX.WORD[m]}${'title' in s && s.title ? ` · ${s.title}` : ''}`}><b aria-hidden="true">{BX.ICON[m]}</b><small>{BX.WORD[m]}</small></li>; })}</ol>;
  return (
    <article className="stack boss" data-testid="boss" data-boss={id} data-phase={phase.k} data-step={i}>
      <div className="boss__alarm" aria-hidden="true" data-state={alarm || 'off'} data-calm={calm} />
      {phase.k === 'intro' && <>
        <p className="lab__k">☢ Season {B.se} · Episode 11 · boss level · {LV[B.lv]}</p>
        {H === 'h2' ? <h2 className="build__h">{B.title}</h2> : <h3 className="build__h">{B.title}</h3>}
        <p className="boss__style">{B.style}</p><p className="boss__stakes">{B.stakes}</p>
        {pips(-1)}
        <ul className="boss__rules">
          <li>Every stage runs on its own clock. Every challenge gets one check. A wrong call, a failed check or an empty clock ends the run — and you start again from stage one.</li>
          <li>Five modes: see it, hear it, reach it, build it, record it — plus a signal trace and the calls only you can make (or refuse to make).</li>
          <li>The edge of the screen tells you where you stand: yellow = under pressure, red = time is short or the run just failed, green = cleared.</li>
          <li>Clearing the boss opens the next season. Timers follow your settings (relaxed doubles them; off removes them).</li>
          {BX.hasCommission(B) && <li className="boss__new">📐 The commission — this run also designs, scopes and prices a real job, do or die: 📋 ask it (a leading or out-of-bounds question ends the run; closing without a must-ask question ends it too) · 🔑 scope it (turn-key, end to end — everything else named to its owner) · 📐 design it (every requirement met, every constraint inside its limit, no boundary crossed) · 💲 cost it (get the estimate right, then bring it inside the budget without cutting a requirement).{B.hard ? ` ${B.hard}` : ''}</li>}
        </ul>
        <label className="ch__check"><input type="checkbox" checked={calm} onChange={(e) => { setCalm(e.target.checked); calmWrite(e.target.checked); }} /> <span>Calm lights — a steady tint instead of a pulse</span></label>
        {rec.passed ? <p className="boss__cleared" data-testid="boss-cleared">✔ Cleared — in {rec.tries} run{rec.tries === 1 ? '' : 's'}. Run it again any time.</p> : rec.tries ? <p className="ui-meta">Runs so far: {rec.tries} · furthest: stage {rec.best} of {B.steps.length}.</p> : null}
        <p><Button kind="primary" onClick={begin} testId="boss-begin">{rec.tries ? '▶ Start the run again' : '▶ Begin the run'}</Button></p>
      </>}
      {step && <>
        <p className="lab__k">☢ {B.title} · run {rec.tries}</p>
        {pips(i, phase.k === 'failed')}
        <div className="boss__stage-h"><p className="boss__mode">{BX.ICON[BX.stepMode(step)]} {BX.WORD[BX.stepMode(step)]}{step.type === 'chal' ? ` · stage ${B.steps.filter((s) => s.type === 'chal').indexOf(step) + 1} of 5` : ''}</p>
          <p className="dr__clock" data-testid="boss-clock" aria-live="off" data-low={!!secs && BX.lowClock(left, secs)}>{secs ? `⏱ ${fmt(phase.k === 'stage' ? left : left)}` : '⏱ no clock (timers off)'}</p></div>
        {phase.k === 'failed' && <div className="boss__fail" role="alert" data-testid="boss-fail"><p className="boss__fail-h">✖ Run over · {phase.title}</p><p>{phase.why}</p>
          <p className="ui-meta">You reached step {phase.i + 1} of {B.steps.length}. {B.lose || 'The boss level starts over from the top.'}</p>
          <p className="lab__row"><Button kind="primary" onClick={begin} testId="boss-restart">↺ Start the run over</Button><Button onClick={() => { setAlarm(null); setPhase({ k: 'intro' }); }}>Back to the briefing</Button></p></div>}
        {step.type === 'chal' && step.twist && <p className="boss__twist">⚡ {step.twist}</p>}
        {'title' in step && step.title && step.type !== 'chal' && <h4 className="build__h">{step.title}</h4>}
        {'brief' in step && step.brief && step.type !== 'chal' && <p>{step.brief}</p>}
        <fieldset className="boss__lock" disabled={phase.k !== 'stage'}><legend className="ui-sr">{BX.WORD[BX.stepMode(step)]} stage</legend>
          <Stage key={`${rec.tries}:${i}`} id={id} B={B} step={step} i={i} tries={rec.tries} factor={factor} tier={tier} formulas={formulas} locked={phase.k !== 'stage'} onOutcome={outcome} onChallenge={onChallenge} /></fieldset>
        {phase.k === 'cleared' && <div className="boss__ok" data-testid="boss-ok" role="status"><p className="boss__ok-h">✔ {BX.DONE[step.type] || 'STAGE CLEARED'}</p>{phase.msg && <p>{phase.msg}</p>}
          <p><Button kind="primary" onClick={next} testId="boss-next">{phase.i === B.steps.length - 1 ? 'Finish the run ▸' : 'Next ▸'}</Button></p></div>}
      </>}
      {phase.k === 'won' && <>
        <p className="lab__k">☢ Season {B.se} · boss level</p>{pips(B.steps.length)}
        <div className="boss__win" data-testid="boss-win" role="status"><p className="boss__ok-h">✔ Boss cleared</p><h3 className="build__h">{B.title}</h3><p>{B.win}</p>
          <p className="ui-meta">Run {rec.tries}{t0.current ? (() => { const m = Math.round((Date.now() - t0.current) / 60000); return m ? ` · about ${m} min` : ''; })() : ''}{rec.firstRun === rec.tries ? ' · the next season is open.' : ''}</p></div>
        <p><Button onClick={begin}>↺ Run it again</Button></p>
      </>}
    </article>
  );
}

type StageProps = { id: string; B: BX.Boss; step: BX.Step; i: number; tries: number; factor: number; tier: number; formulas: Record<string, Formula>; locked: boolean; onOutcome: (o: BX.Outcome) => void; onChallenge?: (key: string, score: number, passed: boolean) => void };
function Stage(p: StageProps) {
  const s = p.step;
  switch (s.type) {
    case 'chal': return <ChallengeRunner id={s.chal} lv={p.B.lv} factor={p.factor} boss heading="h4" where="Boss stage" onResult={(o: ChalOutcome) => {
      p.onChallenge?.(`${s.chal}@${p.B.lv}`, o.score, o.passed); const r = o.result; if (o.passed) p.onOutcome({ ok: true, msg: s.win || undefined }); else if ('instant' in r) p.onOutcome(BX.fail(r.instant.title, r.instant.why));
      else p.onOutcome(BX.fail(BX.WORD[s.mode]!, `The check didn’t pass: ${r.checks.filter((c) => !c.ok).map((c) => c.label).slice(0, 3).join(' · ')}. The details are in the results above.`)); }} />;
    case 'call': return <Call {...p} s={s} />;
    case 'trace': return <Trace {...p} s={s} />;
    case 'ask': return <Ask {...p} s={s} />;
    case 'scope': return <Scope {...p} s={s} />;
    case 'design': return <Design {...p} s={s} />;
    case 'cost': return <Cost {...p} s={s} />;
    default: return null;
  }
}
function Call({ id, i, tries, locked, onOutcome, s }: StageProps & { s: Extract<BX.Step, { type: 'call' }> }) {
  const order = useMemo(() => shuffle(s.opts.map((_o, k) => k), hashSeed(`${id}${i}${tries}`)), [s, id, i, tries]); const [picked, setPicked] = useState<number | null>(null);
  return <div className="stack" data-testid="boss-call"><p className="boss__q">{s.q}</p><div className="dr__grid">{order.map((k) => { const o = s.opts[k]!;
    return <button key={k} type="button" className="dr__btn" data-ok={picked === k ? o.ok : undefined} disabled={locked || picked !== null} onClick={() => { setPicked(k); onOutcome(BX.callPick(o)); }}>{o.t}</button>; })}</div></div>;
}
function Trace({ id, tries, locked, onOutcome, s }: StageProps & { s: Extract<BX.Step, { type: 'trace' }> }) {
  const order = useMemo(() => shuffle(s.items.map((_x, k) => k), hashSeed(`${id}T${tries}`)), [s, id, tries]); const [done, setDone] = useState(0); const [wrong, setWrong] = useState<number | null>(null);
  const tap = (k: number) => { const r = BX.traceTap(s, done, k); setDone(r.done); if (!r.out?.ok && r.out) setWrong(k); if (r.out) onOutcome(r.out); };
  return <div className="stack" data-testid="boss-trace"><p className="ui-meta">Tap each point in the order the signal passes through it, from source to destination.</p>
    <ol className="dr__order">{s.items.slice(0, done).map((t) => <li key={t}>{t}</li>)}</ol>
    <div className="dr__grid">{order.map((k) => <button key={k} type="button" className="dr__btn" data-used={k < done} data-ok={wrong === k ? false : undefined} disabled={locked || k < done} onClick={() => tap(k)}>{s.items[k]}</button>)}</div></div>;
}
function Ask({ id, tries, locked, onOutcome, s }: StageProps & { s: Extract<BX.Step, { type: 'ask' }> }) {
  const order = useMemo(() => shuffle(s.qs.map((_q, k) => k), hashSeed(`${id}A${tries}`)), [s, id, tries]); const [a, setA] = useState(() => BX.askStart(s)); const [trap, setTrap] = useState<string | null>(null);
  const open = BX.askOpen(s, a);
  const ask = (qid: string) => { const r = BX.askQuestion(s, a, qid); setA(r.state); if (r.out && !r.out.ok && r.out.title === 'Wrong question') setTrap(qid); if (r.out) onOutcome(r.out); };
  const close = () => { const r = BX.askClose(s, a); setA(r.state); onOutcome(r.out); };
  return <div className="stack" data-testid="boss-ask">{s.client && <p className="boss__client">🤝 {s.client}</p>}
    <p className="ui-meta" aria-live="polite">Questions left: {a.left} of {s.slots} · {a.asked.length} asked</p>
    <ol className="boss__transcript">{a.asked.map((qid) => { const q = s.qs.find((x) => x.id === qid)!; return <li key={qid} data-kind={q.kind}><b>{q.q}</b> — “{q.a}”</li>; })}{trap && <li data-kind="trap"><b>{s.qs.find((x) => x.id === trap)!.q}</b></li>}</ol>
    {BX.askCaptured(s, a).length > 0 && <div className="boss__reqs"><p className="lab__k">Requirements captured</p>{BX.askCaptured(s, a).map((r) => <span key={r} className="boss__req" data-ok="true">✓ {r}</span>)}</div>}
    <div className="dr__grid">{order.map((k) => s.qs[k]!).filter((q) => open.includes(q)).map((q) => <button key={q.id} type="button" className="dr__btn" data-followup={!!q.after} disabled={locked || a.done} onClick={() => ask(q.id)}>{q.after ? '↳ ' : ''}{q.q}</button>)}</div>
    <p><Button disabled={locked || a.done} onClick={close}>Close the meeting ▸</Button></p></div>;
}
function Scope({ locked, onOutcome, s }: StageProps & { s: Extract<BX.Step, { type: 'scope' }> }) {
  const [pick, setPick] = useState<Array<string | undefined>>([]); const [issued, setIssued] = useState(false);
  return <div className="stack" data-testid="boss-scope"><p className="ui-meta">Say whose each line is. Turn-key means everything in our scope arrives designed, installed, tested, documented and taught — and everything else is named to its owner.{s.allow ? ' One slip allowed.' : ' No slips allowed.'}</p>
    {s.items.map((it, k) => <div key={k} className="dr__cm"><p className="dr__sym">{it.s}</p><div className="dr__chips" role="group" aria-label={`Whose is it: ${it.s}`}>{s.groups.map((g) =>
      <button key={g} type="button" className="dr__chip" aria-pressed={pick[k] === g} data-right={issued ? g === it.c : undefined} disabled={locked || issued} onClick={() => { const n = [...pick]; n[k] = g; setPick(n); }}>{g}</button>)}</div></div>)}
    <p><Button kind="primary" disabled={locked || issued} onClick={() => { setIssued(true); onOutcome(BX.scopeIssue(s, pick)); }}>Issue the scope ▸</Button></p></div>;
}
function FormulaCard({ F, tier }: { F: Formula; tier: number }) {
  if (tier >= 4) return <p className="ui-meta">🎯 Mastery: nobody hands you the formula. The Fieldbook has the reference.</p>;
  const card = <div className="boss__fx"><p><b>{F.name}</b> <span className="learn__eq" dangerouslySetInnerHTML={libHtml(F.eq)} /></p>{F.where && <p className="ui-meta">{F.where.map(([k, v]) => `${k.replace(/<[^>]+>/g, '')}: ${v}`).join(' · ')}</p>}{tier <= 1 && F.ex && <p className="ui-meta"><b>Worked example.</b> {F.ex}</p>}</div>;
  return tier === 3 ? <details className="boss__fx-ask"><summary>ƒ Formula available — ask for it</summary>{card}</details> : card;
}
function Design({ locked, onOutcome, s, tier, formulas }: StageProps & { s: Extract<BX.Step, { type: 'design' }> }) {
  const [sel, setSel] = useState<Record<string, number>>({}); const [issued, setIssued] = useState(false); const U = s.units || {};
  const t = BX.designTotals(s, sel), m = BX.designMet(s, sel), left = s.slots.filter((sl) => sel[sl.id] == null).length;
  const attrs = (o: BX.DesignOpt) => Object.entries(o.v || {}).filter(([, v]) => v).map(([a, v]) => (a === 'usd' ? BX.usd(v) : `${BX.bnum(v)} ${U[a] || a}`)).join(' · ');
  return <div className="stack" data-testid="boss-design">
    <p className="lab__k">Requirements · from the meeting</p><div className="boss__reqs">{s.needs.map((n) => <span key={n.id} className="boss__req" data-ok={m.has(n.id)}>{m.has(n.id) ? '✓' : '○'} {n.label}</span>)}</div>
    <p className="lab__k">Constraints · live</p><div className="boss__meters">{s.limits.map((L) => { const v = BX.limitValue(L, t), c = BX.limitCap(L, t), ok = BX.limitOk(L, t), pct = c ? Math.min(1, v / c) : v ? 1 : 0;
      return <div key={L.label} className="boss__meter" data-ok={ok}><span>{L.label}</span><svg viewBox="0 0 100 6" aria-hidden="true" preserveAspectRatio="none"><rect className="boss__mtrack" width={100} height={6} /><rect className="boss__mfill" width={Math.round(pct * 100)} height={6} /></svg>
        <span className="ui-meta">{BX.fmtLimit(L, v)}{L.min != null ? ' · needs ≥ ' : ' · limit '}{BX.fmtLimit(L, c)}{ok ? '' : ' ✗'}</span></div>; })}</div>
    {(s.f || []).map((k) => formulas[k] ? <FormulaCard key={k} F={formulas[k]!} tier={tier} /> : null)}
    {s.slots.map((sl) => <div key={sl.id} className="stack"><p className="lab__k">{sl.label}</p><div className="dr__grid" role="group" aria-label={sl.label}>{sl.opts.map((o, k) =>
      <button key={k} type="button" className="dr__btn" aria-pressed={sel[sl.id] === k} disabled={locked || issued} onClick={() => setSel({ ...sel, [sl.id]: k })}><b>{o.n}</b>{attrs(o) && <small>{attrs(o)}</small>}{o.note && <small>{o.note}</small>}</button>)}</div></div>)}
    <p className="ui-meta" aria-live="polite">{left ? `${left} block${left === 1 ? '' : 's'} still to choose · ` : ''}{s.limits.map((L) => `${BX.limitOk(L, t) ? '✓' : '✕'} ${L.short || L.label.split(' (')[0]}`).join(' · ')} · {s.needs.filter((n) => m.has(n.id)).length}/{s.needs.length} requirements</p>
    <p><Button kind="primary" disabled={locked || issued || left > 0} onClick={() => { setIssued(true); onOutcome(BX.designIssue(s, sel)); }}>Issue the design ▸</Button></p></div>;
}
function Cost({ locked, onOutcome, s, tier, formulas }: StageProps & { s: Extract<BX.Step, { type: 'cost' }> }) {
  const E = BX.estimate(s), F = s.f ? formulas[s.f] : undefined, gate = tier >= 4 && !!F?.opts && F.opts.length >= 2;
  const [chose, setChose] = useState<string | null>(null); const [wrongF, setWrongF] = useState<string[]>([]); const [v, setV] = useState(''); const [right, setRight] = useState(false); const [on, setOn] = useState<boolean[]>(() => (s.ve || []).map(() => false)); const [presented, setPresented] = useState(false);
  const ready = !gate || chose === s.f; const KIND: Record<string, string> = { eq: `Equipment${s.tax ? ` · tax ${Math.round(s.tax * 100)}% applies` : ''}`, lab: 'Labour', run: 'Running costs · per year × years', later: 'Later · one-off, in today’s money' };
  const submit = () => { const n = BX.parseTotal(v); if (n === null) return; const r = BX.costEstimate(s, n); if (r.ok) setRight(true); else onOutcome(r); };
  const now = BX.afterSavings(s, on), over = E.T - s.budget;
  return <div className="stack" data-testid="boss-cost">
    <div className="lab__tablewrap"><table className="ch__boq"><thead><tr><th>Line · quantity × each</th><th>Amount</th></tr></thead><tbody>{(['eq', 'lab', 'run', 'later'] as const).flatMap((kd) => { const ls = s.lines.filter((l) => (l.kind || 'eq') === kd); if (!ls.length) return [];
      return [<tr key={kd}><th colSpan={2}>{KIND[kd]}</th></tr>, ...ls.map((l, j) => <tr key={`${kd}${j}`}><td>{l.t}<br /><small className="ui-meta">{BX.bnum(l.q)}{l.u ? ` ${l.u}` : ''} × {BX.usd(l.each)}</small></td><td className="ch__n">{BX.usd(l.q * l.each)}</td></tr>)]; })}</tbody></table></div>
    <p className="ui-meta">{s.rule || `Contingency ${Math.round((s.cont || 0) * 100)}% on equipment and labour.`}</p>
    {F && !gate && <FormulaCard F={F} tier={tier} />}
    {gate && F && <div className="stack boss__fx-choose"><p className="lab__k">🎯 Mastery · which relationship do you need? Choose it, then solve.</p><div className="dr__chips">{F.opts!.map((k) => formulas[k] ? <button key={k} type="button" className="dr__chip" aria-pressed={chose === k} disabled={locked || chose === s.f || wrongF.includes(k)} onClick={() => { if (k === s.f) setChose(k); else setWrongF([...wrongF, k]); }}>{formulas[k]!.name}</button> : null)}</div>
      <p className="ui-meta" aria-live="polite">{chose === s.f ? `✓ ${F.when || 'That’s the one.'}` : wrongF.length ? `✕ Not this one — ${formulas[wrongF[wrongF.length - 1]!]?.when || ''} Think about what the problem gives you and what it asks for.` : ''}</p></div>}
    <label className="ch__field"><span>{s.ask || 'Your total'}</span><input className="lab__input" type="text" inputMode="decimal" placeholder="$ …" value={v} disabled={locked || !ready || right} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} /></label>
    {!right && <p><Button kind="primary" disabled={locked || !ready || BX.parseTotal(v) === null} onClick={submit}>Submit the estimate</Button></p>}
    {right && <div className="stack" data-testid="boss-ve"><Notice tone={over > 0 ? 'warn' : 'ok'}>✓ {BX.usd(E.T)} is right. The client’s budget is {BX.usd(s.budget)}{over > 0 ? ` — you are ${BX.usd(over)} over. Bring it inside the budget without cutting a requirement.` : ' — you are inside it.'}</Notice>
      {(s.ve || []).length > 0 && <><p className="lab__k">Value engineering · choose savings</p><div className="dr__grid">{s.ve!.map((o, k) => <button key={k} type="button" className="dr__btn" aria-pressed={on[k]} disabled={locked || presented} onClick={() => { const n = [...on]; n[k] = !n[k]; setOn(n); }}><b>{o.t}</b><small>saves {BX.usd(o.save)}</small>{o.note && <small>{o.note}</small>}</button>)}</div>
        <p className="ui-meta" aria-live="polite" data-over={now > s.budget}>After your changes: {BX.usd(now)} · budget {BX.usd(s.budget)}{now > s.budget ? ` · still ${BX.usd(now - s.budget)} over` : ` · inside by ${BX.usd(s.budget - now)}`}</p></>}
      <p><Button kind="primary" disabled={locked || presented} onClick={() => { setPresented(true); onOutcome(BX.costPresent(s, on)); }}>Present to the client ▸</Button></p></div>}
  </div>;
}
