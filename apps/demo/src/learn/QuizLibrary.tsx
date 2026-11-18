/**
 * The SIGNAL quiz library (restored 18 Nov 2026; docs/restoration/SIGNAL_INVENTORY.md, “470 not yet reachable”): all 693 quizzes of the
 * build package, as the standalone holds them, reachable from Learn and not only inside the story: chapter checks, UX rules, twist
 * checks, season finals, case checks, fieldbook checks and lesson checks. Browse by kind, season and words; play any one in place with
 * the shared QuizRunner; each links back to the chapter it belongs to. Best scores stay in this browser; practice, not a credential.
 */
import { useMemo, useState } from 'react';
import { QuizRunner, type Quiz } from '@empathia/ui';

export const KINDS: { id: string; label: string; test: (id: string) => boolean }[] = [
  { id: 'chapter', label: 'Chapter checks', test: (id) => /^Q-S\d\dE\d\d$/.test(id) },
  { id: 'ux', label: 'UX rules', test: (id) => id.startsWith('Q-UX-') },
  { id: 'twist', label: 'Twist checks', test: (id) => id.startsWith('Q-TW-') },
  { id: 'final', label: 'Season finals', test: (id) => /-FINAL$/.test(id) },
  { id: 'case', label: 'Case checks', test: (id) => id.startsWith('Q-CASE-') },
  { id: 'fieldbook', label: 'Fieldbook checks', test: (id) => id.startsWith('Q-FB') },
];
export const kindOf = (id: string) => KINDS.find((k) => k.test(id))?.id || 'lesson';
export const KIND_LABEL: Record<string, string> = { ...Object.fromEntries(KINDS.map((k) => [k.id, k.label])), lesson: 'Lesson checks' };
/** the chapter a quiz sits in, from its id (Q-S04E01, Q-UX-S04E01, Q-TW-S04E01-2 → s04e01) */
export const chapterOf = (id: string) => { const m = /S(\d\d)E(\d\d)/.exec(id); return m ? `s${m[1]}e${m[2]}` : null; };

const BEST = 'empathia.signal.quizbest.v1';
const readBest = (): Record<string, [number, number]> => { try { return JSON.parse(localStorage.getItem(BEST) || '{}'); } catch { return {}; } };
const writeBest = (b: Record<string, [number, number]>) => { try { localStorage.setItem(BEST, JSON.stringify(b)); } catch { /* storage refused: best scores last this visit */ } };

export function QuizLibrary({ quizzes, seasonOf }: { quizzes: Record<string, Quiz>; seasonOf: Record<string, number> }) {
  const ids = useMemo(() => Object.keys(quizzes), [quizzes]);
  const [kind, setKind] = useState('chapter'); const [season, setSeason] = useState(0); const [q, setQ] = useState(''); const [sel, setSel] = useState<string | null>(null);
  const [best, setBest] = useState(readBest);
  const seasonFor = (id: string) => seasonOf[`quiz:${id}`] || 0;
  const counts = useMemo(() => Object.fromEntries([...KINDS.map((k) => k.id), 'lesson'].map((k) => [k, ids.filter((id) => kindOf(id) === k).length])), [ids]);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const list = ids.filter((id) => kindOf(id) === kind && (!season || seasonFor(id) === season) && words.every((w) => `${id} ${quizzes[id]!.title} ${quizzes[id]!.domain}`.toLowerCase().includes(w)));
  const seasons = [...new Set(ids.map(seasonFor).filter(Boolean))].sort((a, b) => a - b);
  const totalQs = useMemo(() => ids.reduce((a, id) => a + quizzes[id]!.qs.length, 0), [ids, quizzes]);
  const cur = sel ? quizzes[sel] : null; const ch = sel ? chapterOf(sel) : null;
  return <div className="ql" data-testid="quiz-library">
    <p className="ui-meta">{ids.length} quizzes, {totalQs.toLocaleString('en-US')} questions, every one the build package holds. {Object.keys(best).length} taken in this browser.</p>
    <div className="ln-tags" role="group" aria-label="Kind of quiz">{[...KINDS.map((k) => k.id), 'lesson'].map((k) => <button key={k} type="button" className={`ln-kind${kind === k ? ' on' : ''}`} aria-pressed={kind === k} onClick={() => { setKind(k); setSel(null); }} data-kind={k}><b>{KIND_LABEL[k]}</b><span>{counts[k]}</span></button>)}</div>
    <div className="ql__filters">
      <label className="ops-field">Season <select value={season} onChange={(e) => setSeason(Number(e.target.value))} data-testid="ql-season"><option value={0}>All seasons</option>{seasons.map((s) => <option key={s} value={s}>Season {s}</option>)}</select></label>
      <label className="ops-field">Words <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="gain, VLAN, contrast…" data-testid="ql-search" /></label>
    </div>
    <div className="svc__grid">
      <ul className="svc__list ql__list" data-testid="ql-list">{list.length ? list.map((id) => { const b = best[id]; return <li key={id} className={id === sel ? 'on' : ''}><a href="#/learn/library" onClick={(e) => { e.preventDefault(); setSel(id); }} data-quiz={id}><b>{quizzes[id]!.title}</b><span className="ui-meta">{quizzes[id]!.domain} · {quizzes[id]!.qs.length} question{quizzes[id]!.qs.length === 1 ? '' : 's'}{seasonFor(id) ? ` · Season ${seasonFor(id)}` : ''}{b ? ` · best ${b[0]} of ${b[1]}` : ''}</span></a></li>; }) : <li className="ui-meta">No {KIND_LABEL[kind]!.toLowerCase()} match.</li>}</ul>
      <div>{cur ? <div className="stack" data-testid="ql-play"><QuizRunner key={sel} q={cur} onComplete={(s, t) => { const b = { ...best }; if (!b[sel!] || s > b[sel!]![0]) b[sel!] = [s, t]; setBest(b); writeBest(b); }} />
        {ch ? <p className="ui-meta">From the story: <a href={`#/story/${ch}`}>read the chapter this check belongs to</a>.</p> : null}<p className="ui-meta">Practice, not a credential: answers stay in this browser.</p></div>
        : <p className="ui-meta">Pick a quiz to play it here. Each question answers once; the explanation follows.</p>}</div>
    </div>
  </div>;
}
