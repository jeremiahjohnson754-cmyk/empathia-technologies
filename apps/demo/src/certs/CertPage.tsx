/**
 * #/learn/certifications, #/learn/cts, #/learn/cts-d, #/learn/cts-i — the certification study spaces of Empathia Learn (founder,
 * 18 Nov 2026). For each exam: the facts as AVIXA publishes them (sourced and dated), the duties and their weights, a study guide per
 * duty, the math and physics with a calculator for every formula, original practice in four modes, and exam-day strategy. The
 * comparison page sets the three side by side.
 *
 * Unofficial: CTS®, CTS-D® and CTS-I® are AVIXA® certifications; Empathia is not affiliated with or endorsed by AVIXA; no question here
 * comes from an AVIXA exam. A practice score is learning evidence on this device, never a credential, a prediction of a result, or an
 * authorization of any kind.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Icon, FieldCalculator } from '@empathia/ui';
import { CERTS, CERT_IDS, COMPARE, SOURCES, READ_ON, type CertId, type Cert } from './facts.js';
import { GUIDES, MATH, STRATEGY, DIFFERENCES, type Section } from './guide.js';
import { BANKS, assemble, score, allocation, capacity, loadProgress, saveProgress, record, type Session, type Mode, type Score, type Progress } from './exam.js';
import { toolById } from '../fieldtools/calc.js';

type Tab = 'overview' | 'guide' | 'math' | 'practice' | 'examday';
const TABS: { id: Tab; label: string }[] = [{ id: 'overview', label: 'The exam' }, { id: 'guide', label: 'Study guide' }, { id: 'math', label: 'Math and physics' }, { id: 'practice', label: 'Practice' }, { id: 'examday', label: 'Exam day' }];
const store = (() => { try { const s = window.localStorage; s.setItem('__c', '1'); s.removeItem('__c'); return s; } catch { return null; } })();
const slug = (c: CertId) => c.toLowerCase();

function Disclaimer() {
  return <p className="ct-disc" data-testid="ct-disclaimer"><Icon name="info" size={16} /> Unofficial study material. CTS®, CTS-D® and CTS-I® are certifications of AVIXA®; Empathia is not affiliated with or endorsed by AVIXA, and no question here is from an AVIXA exam. Exam facts were read from AVIXA’s own pages on {READ_ON}: confirm on AVIXA’s site before you book or pay. A practice score is not a credential and does not predict a result.</p>;
}
const ToolLink = ({ id }: { id?: string }) => { const t = id ? toolById(id) : null; return t ? <a className="ct-tool" href={`#/field-tools/${t.id}`}><Icon name="wrench" size={14} /> {t.title}</a> : null; };

function Sections({ list }: { list: Section[] }) {
  return <>{list.map((s) => <section key={s.id} className="ct-sec" id={`ct-${s.id}`} data-testid={`ct-sec-${s.id}`}>
    <h3>{s.title}</h3>{s.body.map((p, i) => <p key={i}>{p}</p>)}
    {s.points && <ul className="ct-points">{s.points.map((p) => <li key={p}>{p}</li>)}</ul>}
    {s.formulas && <ul className="ct-formulas">{s.formulas.map((f) => <li key={f.f}><code>{f.f}</code><span>{f.say}</span><ToolLink id={f.tool} /></li>)}</ul>}
    {s.traps && <div className="ct-traps"><b>Traps</b><ul>{s.traps.map((t) => <li key={t}>{t}</li>)}</ul></div>}
  </section>)}</>;
}

const Bar = ({ pct, low }: { pct: number; low?: boolean }) => <svg className="ct-bar" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true"><rect className="ct-bar__bg" x="0" y="0" width="100" height="6" rx="3" /><rect className={low ? 'ct-bar__fg ct-bar__fg--low' : 'ct-bar__fg'} x="0" y="0" width={Math.max(0, Math.min(100, pct))} height="6" rx="3" /></svg>;

function Weights({ c }: { c: Cert }) {
  return <ol className="ct-weights" data-testid="ct-weights">{c.domains.map((d) => <li key={d.code}>
    <div className="ct-weights__row"><b>{d.code}</b><span className="ct-weights__t">{d.title}</span><span className="ct-weights__p">{d.weight} %</span></div>
    <Bar pct={d.weight * 2.4} />
    <p className="ct-plain">{d.plain}</p>
    <details><summary>{d.tasks.length} task{d.tasks.length === 1 ? '' : 's'} in the outline</summary><ul className="ct-tasks">{d.tasks.map((t) => <li key={t.code}><span>{t.code}</span>{t.title}<b>{t.weight} %</b></li>)}</ul></details>
  </li>)}</ol>;
}

function Overview({ c }: { c: Cert }) {
  const src = SOURCES[c.source]!;
  const facts: [string, string][] = [['Questions', `${c.questions.total}: ${c.questions.scored} scored and ${c.questions.pilot} unscored pilot questions, mixed in; ${c.options} options each`], ['Time', `${c.minutes} minutes, about ${Math.round(c.minutes * 60 / c.questions.total)} seconds a question`], ['To pass', c.passing], ['Before you sit it', `${c.prerequisite} ${c.experience}`], ['Languages', c.languages.join(', ')], ['Fees', `USD ${c.fees.member} for AVIXA members, ${c.fees.nonMember} for non-members. ${c.fees.note}`], ['Where', c.delivery], ['What you may use', c.aids], ['Retakes', c.retakes], ['Renewal', c.renewal]];
  return <div className="ct-grid">
    <div className="ct-panel"><h2>The exam at a glance</h2><dl className="ct-facts" data-testid="ct-facts">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <p className="ct-src">Source: <a href={src.url} target="_blank" rel="noreferrer">{src.label}</a>{c.id === 'CTS' ? <>; <a href={SOURCES.proctoring!.url} target="_blank" rel="noreferrer">{SOURCES.proctoring!.label}</a>; <a href={SOURCES.ctsPage!.url} target="_blank" rel="noreferrer">{SOURCES.ctsPage!.label}</a></> : null}. Read {READ_ON}.</p></div>
    <div className="ct-panel"><h2>Where the points are</h2><p className="ct-plain">The duties and weights of AVIXA’s published content outline (Appendix A of the handbook). Titles are the handbook’s; the one-line descriptions are ours.</p><Weights c={c} /></div>
  </div>;
}

// ------------------------------------------------------------------------------------------------ practice
function Practice({ c, progress, setProgress }: { c: Cert; progress: Progress; setProgress: (p: Progress) => void }) {
  const [s, setS] = useState<Session | null>(null); const [ans, setAns] = useState<Record<string, number>>({}); const [flags, setFlags] = useState<Set<string>>(new Set());
  const [i, setI] = useState(0); const [done, setDone] = useState<Score | null>(null); const [left, setLeft] = useState<number | null>(null); const [confirm, setConfirm] = useState(false);
  const [domain, setDomain] = useState(c.domains[0]!.code);
  const missed = progress.missed[c.id] || []; const best = progress.best[c.id];
  const start = (mode: Mode, size: number, dom?: string) => { const sess = assemble(c.id, { mode, size, seed: Date.now() % 2147483647, domain: dom, missed }); setS(sess); setAns({}); setFlags(new Set()); setI(0); setDone(null); setConfirm(false); setLeft(sess.seconds); };
  const finish = () => { if (!s) return; const sc = score(s, ans); setDone(sc); const p = record(progress, s, sc); setProgress(p); setLeft(null); setConfirm(false); };
  useEffect(() => { if (left === null || done) return; if (left <= 0) { finish(); return; } const t = setTimeout(() => setLeft((x) => (x === null ? x : x - 1)), 1000); return () => clearTimeout(t); });   // eslint-disable-line react-hooks/exhaustive-deps
  const q = s?.questions[i]; const study = !!s && s.mode !== 'exam'; const answered = q ? ans[q.id] : undefined; const reveal = !!q && (done !== null || (study && answered !== undefined));
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.focus(); }, [i, s]);
  const onKey = (e: KeyboardEvent) => { if (!s || !q || done) return; const k = e.key.toLowerCase(); const n = '1234'.indexOf(k) >= 0 ? '1234'.indexOf(k) : 'abcd'.indexOf(k);
    if (n >= 0 && !(study && answered !== undefined)) { setAns((a) => ({ ...a, [q.id]: n })); e.preventDefault(); }
    else if (k === 'enter' || k === 'arrowright') { if (i < s.questions.length - 1) setI(i + 1); e.preventDefault(); } else if (k === 'arrowleft') { if (i > 0) setI(i - 1); e.preventDefault(); }
    else if (k === 'f' && s.mode === 'exam') { setFlags((f) => { const g = new Set(f); g.has(q.id) ? g.delete(q.id) : g.add(q.id); return g; }); e.preventDefault(); } };

  if (!s) return <div className="ct-practice" data-testid="ct-practice-setup">
    <div className="ct-modes">
      <div className="ct-mode"><h3>Practice exam</h3><p>Questions drawn from each duty in the outline’s proportions, timed at the real exam’s pace, scored at the end with a duty-by-duty breakdown.</p>
        <div className="ct-row">{[25, 50, 100].filter((n) => n <= capacity(c.id)).map((n) => <button key={n} type="button" className="ui-btn ui-btn--sm ui-btn--primary" onClick={() => start('exam', n)} data-testid={`ct-exam-${n}`}>{n} questions · {Math.round(c.minutes * 60 / c.questions.total * n / 60)} min</button>)}</div></div>
      <div className="ct-mode"><h3>Study mode</h3><p>The same mix, untimed, with the answer and the reasoning after each question.</p><button type="button" className="ui-btn ui-btn--sm" onClick={() => start('study', 20)} data-testid="ct-study">20 questions</button></div>
      <div className="ct-mode"><h3>Calculation drills</h3><p>Fresh numbers every time: decibels, distance, throw, loads, current, heat, subnets, delay, scale.</p><button type="button" className="ui-btn ui-btn--sm" onClick={() => start('drill', 15)} data-testid="ct-drill">15 drills</button></div>
      <div className="ct-mode"><h3>One duty</h3><p>Concentrate on a weak duty.</p><div className="ct-row"><label className="ui-sr" htmlFor="ct-dom">Duty</label><select id="ct-dom" value={domain} onChange={(e) => setDomain(e.target.value)}>{c.domains.map((d) => <option key={d.code} value={d.code}>{d.code} · {d.title}</option>)}</select><button type="button" className="ui-btn ui-btn--sm" onClick={() => start('domain', 15, domain)} data-testid="ct-domain">Start</button></div></div>
      <div className="ct-mode"><h3>What you missed</h3><p>{missed.length ? `${missed.length} question${missed.length === 1 ? '' : 's'} you have not yet answered correctly since you missed them.` : 'Nothing yet: questions you miss collect here until you answer them right.'}</p><button type="button" className="ui-btn ui-btn--sm" disabled={!missed.length} onClick={() => start('missed', 20)} data-testid="ct-missed">Review {Math.min(20, missed.length)}</button></div>
    </div>
    <p className="ct-fine">{BANKS[c.id].length} written questions and {'∞'} calculation drills for {c.id}. {best ? `Your best practice exam here: ${best.pct} % on ${best.total} questions.` : ''} Progress is kept in this browser only.</p>
  </div>;

  if (done) { const sc = done; return <div className="ct-practice" data-testid="ct-results">
    <div className="ct-panel ct-score"><h2>{sc.correct} of {sc.total} correct ({sc.pct} %)</h2>
      <p className="ct-fine">{sc.unanswered ? `${sc.unanswered} left unanswered. ` : ''}Practice evidence only. AVIXA scores the real exam on a scale to 500 with 350 to pass, set against a criterion standard; a percentage here does not convert to it.</p>
      <ul className="ct-bydomain" data-testid="ct-bydomain">{c.domains.filter((d) => sc.byDomain[d.code]).map((d) => { const b = sc.byDomain[d.code]!; const pct = Math.round(b.correct / b.total * 100); return <li key={d.code}><span>{d.code} · {d.title}</span><Bar pct={pct} low={pct < 70} /><b>{b.correct}/{b.total}</b></li>; })}</ul>
      <div className="ct-row"><button type="button" className="ui-btn ui-btn--sm ui-btn--primary" onClick={() => setS(null)} data-testid="ct-again">Another session</button>{sc.missed.length > 0 && <button type="button" className="ui-btn ui-btn--sm" onClick={() => { setI(s.questions.findIndex((x) => sc.missed.includes(x.id))); }}>Review the first one missed</button>}</div></div>
    <ol className="ct-review">{s.questions.map((x, k) => { const a = ans[x.id]; const ok = a === x.answer; return <li key={x.id} data-ok={ok ? '1' : '0'}><button type="button" className="ct-review__q" onClick={() => setI(k)}><span>{ok ? '✓' : '✗'}</span> {x.stem}</button>
      {k === i && <QuestionView q={x} chosen={a} reveal onPick={() => undefined} />}</li>; })}</ol>
  </div>; }

  return <div className="ct-practice" data-testid="ct-runner" data-mode={s.mode}><FieldCalculator />
    <div className="ct-runbar">
      <span>Question {i + 1} of {s.questions.length}</span>
      {left !== null && <span className="ct-timer" data-low={left < 300 ? '1' : undefined} role="timer" aria-live="off">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} left</span>}
      <span className="ct-fine">Keys: 1–4 answer · Enter next · ← back{s.mode === 'exam' ? ' · F flag' : ''}</span>
      <button type="button" className="ui-btn ui-btn--sm ui-btn--quiet" onClick={() => setS(null)}>Leave</button>
    </div>
    <div className="ct-qbox" ref={box} tabIndex={-1} onKeyDown={onKey} data-testid="ct-qbox">
      {q && <QuestionView q={q} chosen={answered} reveal={reveal} onPick={(n) => { if (!(study && answered !== undefined)) setAns((a) => ({ ...a, [q.id]: n })); }} />}
    </div>
    <div className="ct-row ct-nav">
      <button type="button" className="ui-btn ui-btn--sm" disabled={i === 0} onClick={() => setI(i - 1)}>Previous</button>
      {s.mode === 'exam' && q && <button type="button" className="ui-btn ui-btn--sm" aria-pressed={flags.has(q.id)} onClick={() => setFlags((f) => { const g = new Set(f); g.has(q.id) ? g.delete(q.id) : g.add(q.id); return g; })} data-testid="ct-flag">{flags.has(q.id) ? 'Flagged' : 'Flag for review'}</button>}
      {i < s.questions.length - 1 ? <button type="button" className="ui-btn ui-btn--sm ui-btn--primary" onClick={() => setI(i + 1)} data-testid="ct-next">Next</button>
        : confirm ? <><span className="ct-fine">{s.questions.length - Object.keys(ans).length} unanswered{flags.size ? `, ${flags.size} flagged` : ''}.</span><button type="button" className="ui-btn ui-btn--sm ui-btn--primary" onClick={finish} data-testid="ct-submit-yes">Score it</button><button type="button" className="ui-btn ui-btn--sm" onClick={() => setConfirm(false)}>Keep working</button></>
          : <button type="button" className="ui-btn ui-btn--sm ui-btn--primary" onClick={() => (s.mode === 'exam' ? setConfirm(true) : finish())} data-testid="ct-submit">{s.mode === 'exam' ? 'Finish and score' : 'See my results'}</button>}
    </div>
    {s.mode === 'exam' && <nav className="ct-dots" aria-label="Questions">{s.questions.map((x, k) => <button key={x.id} type="button" className="ct-dot" aria-current={k === i ? 'step' : undefined} data-answered={ans[x.id] !== undefined ? '1' : undefined} data-flag={flags.has(x.id) ? '1' : undefined} onClick={() => setI(k)} aria-label={`Question ${k + 1}${ans[x.id] !== undefined ? ', answered' : ''}${flags.has(x.id) ? ', flagged' : ''}`}>{k + 1}</button>)}</nav>}
  </div>;
}

function QuestionView({ q, chosen, reveal, onPick }: { q: Session['questions'][number]; chosen?: number; reveal: boolean; onPick: (n: number) => void }) {
  return <div className="ct-q" data-qid={q.id} data-testid="ct-q">
    <p className="ct-q__meta">{q.domain} · {q.topic}{q.generated ? ' · drill' : ''}</p>
    <p className="ct-q__stem">{q.stem}</p>
    <div className="ct-opts" role="radiogroup" aria-label="Answers">{q.options.map((o, n) => {
      const st = reveal ? (n === q.answer ? 'right' : n === chosen ? 'wrong' : '') : n === chosen ? 'chosen' : '';
      return <button key={n} type="button" role="radio" aria-checked={chosen === n} className="ct-opt" data-state={st || undefined} onClick={() => onPick(n)} data-n={n}>
        <span className="ct-opt__k">{'ABCD'[n]}</span><span>{o}</span>{reveal && n === q.answer ? <em>Correct</em> : reveal && n === chosen ? <em>Your answer</em> : null}</button>; })}</div>
    {reveal && <div className="ct-why" data-testid="ct-why" role="status"><b>{chosen === q.answer ? 'Right.' : chosen === undefined ? 'Not answered.' : 'Not this time.'}</b> {q.why} <ToolLink id={q.tool} /></div>}
  </div>;
}

// ------------------------------------------------------------------------------------------------ formula cards
function FormulaCards() {
  const cards = useMemo(() => MATH.flatMap((s) => (s.formulas || []).map((f) => ({ ...f, sec: s.title }))), []);
  const [k, setK] = useState(0); const [flip, setFlip] = useState(false); const c = cards[k]!;
  return <div className="ct-cards" data-testid="ct-cards"><h3>Formula cards</h3>
    <button type="button" className="ct-card" data-flipped={flip ? '1' : undefined} onClick={() => setFlip(!flip)} aria-label={flip ? `Formula: ${c.f}. Press to show the question.` : `What is the formula for ${c.say}? Press to reveal.`}>
      {flip ? <><code>{c.f}</code><span>{c.sec}</span></> : <><span className="ct-card__q">The formula for</span><b>{c.say}</b><span className="ct-fine">Say it, then turn the card.</span></>}</button>
    <div className="ct-row"><button type="button" className="ui-btn ui-btn--sm" onClick={() => { setK((k - 1 + cards.length) % cards.length); setFlip(false); }}>Previous</button><span className="ct-fine">{k + 1} of {cards.length}</span><button type="button" className="ui-btn ui-btn--sm" onClick={() => { setK((k + 1) % cards.length); setFlip(false); }} data-testid="ct-card-next">Next</button><ToolLink id={c.tool} /></div>
  </div>;
}

// ------------------------------------------------------------------------------------------------ pages
function Compare() {
  return <div className="ct-page" data-testid="ct-compare">
    <header className="ct-head"><p className="ct-kicker"><Icon name="book" size={16} /> Learn · certifications</p><h1>CTS, CTS-D and CTS-I, side by side</h1>
      <p className="ct-lede">Three AVIXA certifications: the general one, and two specialties that build on it. What each covers, who it is for, how the exams compare, and where to study each one here.</p></header>
    <Disclaimer />
    <ul className="ct-choose">{CERT_IDS.map((id) => { const c = CERTS[id]; return <li key={id}><a href={`#${c.path}`} data-cert={id}><b>{id}</b><span>{c.name}</span><span className="ct-fine">{c.one}</span></a></li>; })}</ul>
    <div className="ct-tablewrap"><table className="ct-table" data-testid="ct-table"><thead><tr><th scope="col"><span className="ui-sr">Item</span></th>{CERT_IDS.map((id) => <th key={id} scope="col">{id}</th>)}</tr></thead>
      <tbody>{COMPARE.map((r) => <tr key={r.label}><th scope="row">{r.label}</th>{CERT_IDS.map((id) => <td key={id}>{r.get(CERTS[id])}</td>)}</tr>)}</tbody></table></div>
    <div className="ct-diffs">{DIFFERENCES.map((d) => <section key={d.title} className="ct-sec"><h3>{d.title}</h3><p>{d.body}</p></section>)}</div>
    <p className="ct-src">Sources: {CERT_IDS.map((id) => SOURCES[CERTS[id].source]!).map((s, k) => <span key={s.url}>{k ? '; ' : ''}<a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></span>)}. Read {READ_ON}.</p>
  </div>;
}

export function CertPage({ cert, tab: tabParam }: { cert: CertId | 'all'; tab?: string }) {
  const [progress, setP] = useState<Progress>(() => loadProgress(store)); const setProgress = (p: Progress) => { setP(p); saveProgress(store, p); };
  const initial = (TABS.some((t) => t.id === tabParam) ? tabParam : 'overview') as Tab; const [tab, setTab] = useState<Tab>(initial);
  useEffect(() => setTab(initial), [cert, tabParam]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (cert === 'all') return <Compare />;
  const c = CERTS[cert]; const alloc = allocation(cert, 100);
  return <div className="ct-page" data-testid="ct-page" data-cert={cert}>
    <header className="ct-head"><p className="ct-kicker"><Icon name="book" size={16} /> Learn · <a href="#/learn/certifications">certifications</a></p>
      <h1>{c.id} <span>{c.name}</span></h1><p className="ct-lede">{c.one}</p>
      <nav className="ct-other" aria-label="Other certifications">{CERT_IDS.filter((x) => x !== cert).map((x) => <a key={x} href={`#/learn/${slug(x)}`}>{x}</a>)}<a href="#/learn/certifications">Compare all three</a><a href="#/field-tools">Field Tools</a></nav></header>
    <Disclaimer />
    <div className="ct-tabs" role="tablist" aria-label={`${c.id} study space`}>{TABS.map((t) => <a key={t.id} role="tab" aria-selected={tab === t.id} href={`#/learn/${slug(cert)}/${t.id}`} onClick={() => setTab(t.id)} data-tab={t.id}>{t.label}</a>)}</div>
    <div role="tabpanel" data-testid={`ct-tab-${tab}`}>
      {tab === 'overview' && <Overview c={c} />}
      {tab === 'guide' && <div className="ct-guide">{c.domains.map((d) => { const g = GUIDES[cert].find((x) => x.domain === d.code); return <section key={d.code} className="ct-panel" data-testid={`ct-guide-${d.code}`}>
        <h2>{d.code} · {d.title} <span className="ct-w">{d.weight} % · about {alloc[d.code]} of 100 scored questions</span></h2><p className="ct-plain">{d.plain}</p>{g ? <Sections list={g.sections} /> : null}
        <p className="ct-fine">{BANKS[cert].filter((q) => q.domain === d.code).length} written practice questions on this duty.</p></section>; })}</div>}
      {tab === 'math' && <div className="ct-guide"><div className="ct-panel"><Sections list={MATH} /></div><div className="ct-panel"><FormulaCards /></div></div>}
      {tab === 'practice' && <Practice key={cert} c={c} progress={progress} setProgress={setProgress} />}
      {tab === 'examday' && <div className="ct-guide"><div className="ct-panel"><Sections list={STRATEGY} /></div></div>}
    </div>
  </div>;
}
export default CertPage;
