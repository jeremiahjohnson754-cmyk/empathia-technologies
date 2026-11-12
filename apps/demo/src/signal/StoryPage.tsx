/**
 * SIGNAL · An Empathia Learn Story (#/story is the library; #/story/<chapter id> reads one chapter). The founder's canon, unchanged:
 * the Prologue and all 133 chapters of twelve seasons, fetched one chapter at a time from this demonstration's own files.
 *
 * What the reader does is real and remembered in this browser: a decision gates the story until a choice is recorded, and every choice
 * counts, a costly one too (story.ts states the rules); hints cost merit; the previous chapter's choices open the next; conversations
 * move trust, discoveries are found by looking, and a chapter can be replayed. The canon is a draft and says so: every open review flag
 * is shown where it applies (the package's rule: keep all content; flag rather than block). Nothing here is a credential.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PageProps } from '../registry.types.js';
import * as RT from './ratings.js';
import { chapterPop, doneKeys, gatePop, type PopBody } from './pops.js';
import type { MissionIndex } from './mission.js';
import { buildRx, chapterMarks, type GlossaryIndex, type Seg, type Term } from './glossary.js';
import { BossRunner, Bosses, DrillRunner, IncidentRunner, LabRunner, MeltdownRunner, LAB_KINDS_PLAYABLE, Meltdowns, type Drill, type Formula, type Incidents, type LabData } from '@empathia/ui';
import { Block, Crumbs, Pick } from '../worlds/kit.js';
import { emptyProgress, BANDS, SEVERITY, TIMEOUT, answerTalk, chapterVerdict, choose, complete, echoes, emphasis, emptyChapter, find, load, nextOf, passed, prevOf, reached, replayDecision, resume, save, seconds, tally, timeOut, trustLine, weightLine, weightOf,
  type Chapter, type ChapterState, type Clock, type Item, type Option, type Outcome, type Progress, type StoryIndex, type Verdict,
  PLAYABLE, TIER_WORD, blocking, gateCleared, gateCount, gateKey, recordQuiz, recordDrillTry, recordIncidentRun, recordLabTry, recordChalTry, skip, chapterLocks, lockedBehind, type BossRecord, type Gate, type Pieces, type Quiz, type ReviewRecord, type MeltdownRecord } from './story.js';

type Flags = Record<string, { type: string; title: string; detail?: string }>;
let ixCache: Promise<StoryIndex> | null = null; let flagCache: Promise<Flags> | null = null; let defsReady: Promise<void> | null = null;
export const getJson = <T,>(url: string): Promise<T> => fetch(url).then((r) => { if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json() as Promise<T>; });
/** A failed read while the browser reports no connection: the file is simply not on this device. */
export const notKept = () => typeof navigator !== 'undefined' && navigator.onLine === false;
export const loadIndex = () => (ixCache ||= getJson<StoryIndex>('signal/index.json').catch((e) => { ixCache = null; throw e; }));
const loadFlags = () => (flagCache ||= getJson<Flags>('signal/flags.json').catch(() => ({} as Flags)));
let ratingsCache: Promise<RT.RatingsIndex> | null = null;
const loadRatings = () => (ratingsCache ||= getJson<RT.RatingsIndex>('signal/ratings.json').catch((e) => { ratingsCache = null; throw e; }));
let glCache: Promise<GlossaryIndex> | null = null;
const loadGlossary = () => (glCache ||= getJson<GlossaryIndex>('signal/glossary.json').catch((e) => { glCache = null; throw e; }));
let missionCache: Promise<MissionIndex> | null = null;
const loadMission = () => (missionCache ||= getJson<MissionIndex>('signal/mission.json').catch((e) => { missionCache = null; throw e; }));
/** The shared sprite sheet (figures, props, backgrounds) is first-party art shipped with the build; it is put in the page once so panels can refer to it. */
export const loadDefs = () => (defsReady ||= fetch('signal/defs.svg').then((r) => r.text()).then((svg) => { if (document.getElementById('sg-defs')) return; const d = document.createElement('div'); d.id = 'sg-defs'; d.className = 'sg-defs'; d.setAttribute('aria-hidden', 'true'); d.innerHTML = svg; document.body.appendChild(d); }).catch(() => { defsReady = null; }));
export function useLoaded<T>(get: () => Promise<T>, key: string): { data: T | null; error: string | null } {
  const [st, set] = useState<{ data: T | null; error: string | null }>({ data: null, error: null });
  useEffect(() => { let live = true; set({ data: null, error: null }); get().then((d) => live && set({ data: d, error: null }), (e: Error) => live && set({ data: null, error: e.message })); return () => { live = false; }; }, [key]);   // eslint-disable-line react-hooks/exhaustive-deps
  return st;
}
const Em = ({ text }: { text: string }) => <>{emphasis(text).map((p, i) => (p.b ? <b key={i}>{p.t}</b> : p.i ? <i key={i}>{p.t}</i> : <span key={i}>{p.t}</span>))}</>;
const Paras = ({ text }: { text: string }) => <>{text.split(/\n{2,}/).map((p, i) => <p key={i}><Em text={p} /></p>)}</>;
/** Glossary terms in the reading text (restored 12 Nov 2026, reference ladder.js): the chapter's marks, worked out once (glossary.ts), and
 *  the pop-over to open. Text without a mark, or before the glossary loads, is drawn exactly as before. */
const GlCtx = createContext<{ marks: Map<string, Seg[]> | null; open: (g: Term, el: HTMLElement) => void } | null>(null);
function Gl({ k, text, plain }: { k: string; text: string; plain?: boolean }) {
  const c = useContext(GlCtx); const segs = c?.marks?.get(k); if (!segs) return plain ? <>{text}</> : <Em text={text} />;
  return <>{segs.map((x, i) => { const t = x.g ? <span className="sg-gl" role="button" tabIndex={0} data-gl={x.g.term} aria-label={`${x.t} — glossary`} onClick={(e) => c!.open(x.g!, e.currentTarget)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c!.open(x.g!, e.currentTarget); } }}>{x.t}</span> : x.t;
    return x.b ? <b key={i}>{t}</b> : x.i ? <i key={i}>{t}</i> : <span key={i}>{t}</span>; })}</>;
}
const GlParas = ({ k, text }: { k: string; text: string }) => <>{text.split(/\n{2,}/).map((p, i) => <p key={i}><Gl k={`${k}${i}`} text={p} /></p>)}</>;
/** The pop-over (ladder.js glPop): the term, its domain and definition, the first formula it names, where it is first met. */
function GlPop({ g, at, gl, onClose }: { g: Term; at: HTMLElement; gl: GlossaryIndex; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null); const x = useRef<HTMLButtonElement>(null); const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  useEffect(() => { const r = at.getBoundingClientRect(), w = Math.min(340, window.innerWidth - 24), left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left)); const h = ref.current?.offsetHeight || 180, below = r.bottom + 8;
    setPos({ left, width: w, top: below + h < window.innerHeight - 8 ? below : Math.max(8, r.top - h - 8) }); x.current?.focus(); }, [g, at]);
  useEffect(() => { const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node) && e.target !== at) onClose(); }; const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const away = () => onClose(); document.addEventListener('mousedown', down); document.addEventListener('keydown', key); window.addEventListener('hashchange', away);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); window.removeEventListener('hashchange', away); }; }, [at, onClose]);
  const F = g.f[0] ? gl.formulas[g.f[0]] : undefined;
  return <div ref={ref} className="sg-glpop" role="dialog" aria-label={`Glossary: ${g.term}`} data-testid="story-glpop" style={pos ? { left: pos.left, top: pos.top, width: pos.width } : { left: 12, top: -9999 }}>
    <p className="sg-glpop__h"><b>{g.term}</b> <span className="ui-tag">{g.dom}</span><button ref={x} type="button" className="ui-btn ui-btn--quiet sg-glpop__x" aria-label="Close" onClick={onClose}>✕</button></p>
    <p>{g.d}</p>
    {F && <p className="sg-glpop__f"><span className="ui-meta">ƒ {F.name}</span> <span dangerouslySetInnerHTML={{ __html: F.eq }} /></p>}
    {g.first && <p className="ui-meta">First met: {g.first.toUpperCase()}{gl.titles[g.first] ? ` · ${gl.titles[g.first]}` : ''}</p>}
    <p><a className="ui-btn ui-btn--quiet" href="#/learn/fieldbook">📖 Open the glossary</a></p>
  </div>;
}
export const Face = ({ id, pose, expr }: { id: string; pose: string; expr: string }) => <svg className="sg-face" viewBox="36 20 128 128" width="40" height="40" aria-hidden="true"><use href={`#f-${id}-${pose}-${expr}`} width="200" height="320" /></svg>;
export const Draft = () => <span className="ui-tag" data-testid="story-draft">Draft · under review</span>;

export default function StoryPage({ params }: PageProps) {
  const ix = useLoaded(loadIndex, 'ix'); const [progress, setProgress] = useState<Progress>(load);
  const commit = (p: Progress) => { setProgress(p); save(p); };
  /** For pieces that record more than once from one action (a boss stage records its challenge try, then the run): each change builds on the last. */
  const update = (f: (p: Progress) => Progress) => setProgress((cur) => { const n = f(cur); save(n); return n; });
  if (ix.error) return <div className="sg" data-testid="story-error"><h1 tabIndex={-1}>The story did not load</h1><p className="lead">The story files could not be read ({ix.error}). Your progress is untouched.</p><p><a className="ui-btn ui-btn--primary" href="#/story" onClick={() => location.reload()}>Try again</a></p></div>;
  if (!ix.data) return <div className="sg" data-testid="story-loading" aria-busy="true"><h1 tabIndex={-1}>SIGNAL</h1><p className="lead">Opening the story…</p></div>;
  const id = params.chapter; const ref = id ? ix.data.chapters.find((c) => c.id === id) : null;
  if (id && !ref) return <div className="sg" data-testid="story-unknown"><h1 tabIndex={-1}>SIGNAL has no chapter at this address</h1><p><a className="ui-btn ui-btn--primary" href="#/story">Open the library</a></p></div>;
  return ref ? <Reader key={ref.id} ix={ix.data} id={ref.id} progress={progress} commit={commit} update={update} /> : <Library ix={ix.data} progress={progress} commit={commit} />;
}

function Library({ ix, progress, commit }: { ix: StoryIndex; progress: Progress; commit: (p: Progress) => void }) {
  const next = resume(ix, progress); const started = Object.keys(progress.chapters).length > 0; const done = (s: number) => ix.chapters.filter((c) => c.season === s && progress.chapters[c.id]?.done).length;
  const [open, setOpen] = useState<number>(next.season); const st = ix.stats;
  const seasonChapters = ix.chapters.filter((c) => c.season === open); const locks = useMemo(() => chapterLocks(ix, progress), [ix, progress]);
  return (
    <div className="sg" data-testid="story-library">
      <Crumbs items={[{ label: 'Learn', href: '#/learn' }, { label: 'SIGNAL' }]} />
      <p className="kicker">Empathia Learn · an interactive graphic novel <Draft /></p>
      <h1 tabIndex={-1}>SIGNAL</h1>
      <p className="lead">Maya starts as a volunteer at a sound desk and ends as the principal architect of an estate that no longer needs her. Twelve seasons that teach AV, IT, lighting and live-event systems by living through them.</p>
      <ul className="sg-stats" data-testid="story-stats"><li><b>{st.chapters}</b> chapters</li><li><b>{st.seasons}</b> seasons</li><li><b>{st.panels!.toLocaleString('en-GB')}</b> panels</li><li><b>{st.decisions}</b> decisions</li><li><b>{st.quests}</b> quests</li></ul>
      <p className="sg-acts"><a className="ui-btn ui-btn--primary" href={`#/story/${next.id}`} data-testid="story-continue">{started ? `Continue: ${next.title}` : 'Start at the Prologue'}</a>
        {started && <button type="button" className="ui-btn ui-btn--quiet" data-testid="story-reset" onClick={() => commit({ ...progress, chapters: {}, last: null })}>Forget my progress</button>}</p>
      <p className="ui-meta">The author’s complete draft, shown unchanged. {st.review_flags} review points are still open and are marked where they apply; treat technical figures as illustrative until they close. Your progress stays in this browser and is practice, not a credential. In the product, SIGNAL is free through Season 2.</p>

      <nav className="sg-seasons" aria-label="Seasons">
        <button type="button" className="sg-season" aria-pressed={open === 0} onClick={() => setOpen(0)} data-season="0"><span className="sg-season__n">Prologue</span><span className="sg-season__t">Think like a systems engineer</span><span className="ui-meta">{done(0)} of {ix.chapters.filter((c) => c.season === 0).length} read</span></button>
        {BANDS.map(([band, nums]) => (<div key={band} className="sg-band"><h2 className="sg-band__h">{band}</h2><div className="sg-band__row">
          {nums.map((n) => { const all = ix.chapters.filter((c) => c.season === n).length; return <button key={n} type="button" className="sg-season" aria-pressed={open === n} onClick={() => setOpen(n)} data-season={n}><span className="sg-season__n">Season {n}</span><span className="sg-season__t">{ix.seasons[String(n)]}</span><span className="ui-meta">{done(n)} of {all} read</span></button>; })}</div></div>))}
      </nav>

      <Block title={open === 0 ? 'Prologue' : `Season ${open} · ${ix.seasons[String(open)]}`} sub={`${seasonChapters.length} chapters`} testId="story-chapters">
        <ol className="sg-chapters">{seasonChapters.map((c) => { const s = progress.chapters[c.id]; const lk = !!locks[c.id]; return (
          <li key={c.id}><a className="sg-chapter" href={`#/story/${c.id}`} data-chapter={c.id} data-locked={lk} aria-label={lk ? `${c.kicker} ${c.title} (locked)` : undefined}>
            <span className="sg-chapter__k">{c.kicker}</span><b>{c.title}</b><span className="sg-chapter__s">{c.sub}</span>
            <span className="ui-meta">{[`${c.panels} panels`, c.decisions ? `${c.decisions} decision${c.decisions === 1 ? '' : 's'}` : null, c.level, c.boss ? 'Boss level' : null, c.meltdown ? 'Meltdown' : null, lk ? '🔒 Locked' : s?.done ? 'Read' : s ? 'In progress' : null].filter(Boolean).join(' · ')}</span>
          </a></li>); })}</ol>
      </Block>
    </div>
  );
}

function Reader({ ix, id, progress, commit, update }: { ix: StoryIndex; id: string; progress: Progress; commit: (p: Progress) => void; update: (f: (p: Progress) => Progress) => void }) {
  const ch = useLoaded(() => getJson<Chapter>(`signal/story/${id}.json`), id); const art = useLoaded(() => Promise.all([getJson<{ panels: string[]; closing: { alt: string; svg: string }[] }>(`signal/art/${id}.json`), loadDefs()]).then((r) => r[0]), `art-${id}`);
  const retry = (se: number) => { void loadRatings().then((X) => { commit({ ...RT.retrySeason(progress, X, se), last: null }); const first = ix.chapters.find((c) => c.season === se); location.hash = `#/story/${first ? first.id : 's01e00'}`; }); };
  const restart = () => { commit({ ...emptyProgress(), clock: progress.clock, gates: progress.gates }); location.hash = '#/story/pro01'; };
  const failed = Object.entries(progress.reviews).filter(([, r]) => !r.pass).map(([k]) => Number(k.slice(1))).sort((a, b) => a - b)[0];
  const flags = useLoaded(loadFlags, 'flags'); const ref = ix.chapters.find((c) => c.id === id)!; const state = progress.chapters[id] || emptyChapter(); const [said, setSaid] = useState('');
  const set = (s: ChapterState, extra: Partial<Progress> = {}) => commit({ ...progress, ...extra, last: id, chapters: { ...progress.chapters, [id]: s } });
  const pc = useLoaded(() => getJson<Pieces>(`signal/pieces/${id}.json`), `pieces-${id}`); const pieces = pc.data; const ctx = pieces ? { pieces, progress } : undefined;
  const items = ch.data?.items || []; const upTo = reached(items, state, progress.gates, ctx); const finished = ch.data ? complete(items, state, ctx) : false; const hold = pieces && progress.gates ? blocking(state, progress, pieces) : null; const gc = pieces ? gateCount(state, progress, pieces) : null;
  useEffect(() => { if (ch.data && finished && !state.done) set({ ...state, done: true }); });   // a chapter is read once every decision in it is made
  const t = useMemo(() => tally(items, state), [items, state]); const next = nextOf(ix, id); const prev = prevOf(ix, id);
  const locks = useMemo(() => chapterLocks(ix, progress), [ix, progress]); const locked = !!locks[id]; const behind = locked ? lockedBehind(ix, locks) : null;
  const prevCh = useLoaded(() => (prev ? getJson<Chapter>(`signal/story/${prev.id}.json`) : Promise.resolve(null)), `prev-${id}`);
  const before = useMemo(() => (prev && prevCh.data ? echoes(prevCh.data.items, progress.chapters[prev.id]) : null), [prev, prevCh.data, progress.chapters]);
  // Result pop-ups (gate.js): a card for each gate newly cleared by playing it, and one when the chapter is finished. The first look at a
  // chapter only notes what is already done; nothing pops for it. window.SIGNAL_NOPOP turns them off, as in the reference (its own QA).
  // "Still art" (reference header toggle t-still): stops the story's animation, remembered in this browser
  const [still, setStill] = useState(() => { try { return localStorage.getItem('signal-still') === '1'; } catch { return false; } });
  const gl = useLoaded(loadGlossary, 'glossary'); const glRx = useMemo(() => (gl.data ? buildRx(gl.data.terms) : null), [gl.data]);
  const glMarks = useMemo(() => (glRx && ch.data ? chapterMarks(ch.data.items, glRx) : null), [glRx, ch.data]); const [glOpen, setGlOpen] = useState<{ g: Term; at: HTMLElement } | null>(null);
  const glCtx = useMemo(() => ({ marks: glMarks, open: (g: Term, at: HTMLElement) => setGlOpen({ g, at }) }), [glMarks]); const glClose = useMemo(() => () => setGlOpen((o) => { o?.at.focus({ preventScroll: true }); return null; }), []);
  const mi = useLoaded(loadMission, 'mission'); const seen = useRef<Set<string> | null>(null); const doneSeen = useRef<boolean | null>(null);
  const [pops, setPops] = useState<Array<{ g?: Gate; chapter?: true }>>([]); const [showing, setShowing] = useState(false); const closedOnce = useRef(false); const prevFocus = useRef<Element | null>(null);
  useEffect(() => { if (!pieces || !ch.data || locked) return; const now = doneKeys(pieces, state, progress);
    if (seen.current === null) { seen.current = now; doneSeen.current = finished; return; }
    const fresh = pieces.gates.filter((g) => now.has(`${g.kind}:${g.id}`) && !seen.current!.has(`${g.kind}:${g.id}`)); seen.current = now;
    const add: Array<{ g?: Gate; chapter?: true }> = fresh.map((g) => ({ g })); if (finished && !doneSeen.current) add.push({ chapter: true }); doneSeen.current = finished;
    if (add.length && !(globalThis as { SIGNAL_NOPOP?: boolean }).SIGNAL_NOPOP) setPops((q) => [...q, ...add]); });
  useEffect(() => { if (showing || !pops.length) return undefined; const t = setTimeout(() => { prevFocus.current = document.activeElement; setShowing(true); }, closedOnce.current ? 250 : 900); return () => clearTimeout(t); }, [showing, pops.length]);
  const head = showing ? pops[0] : undefined; const lq = ix.lessonQuiz || {};
  const body: PopBody | null = head && ch.data && pieces ? (head.chapter ? chapterPop(ref.title, items, state, progress, mi.data, id, lq, next) : gatePop(head.g!, items, state, progress, pieces, mi.data, id, lq)) : null;
  const closePop = (move: boolean) => { const it = pops[0]; setPops((q) => q.slice(1)); setShowing(false); closedOnce.current = true;
    if (move && it?.chapter && next) { location.hash = `#/story/${next.id}`; return; }
    const at = move && it?.g ? document.querySelector(it.g.kind === 'decision' ? `[data-decision="${it.g.id}"]` : `[data-piece="${it.g.id}"]`)?.closest('.sg-flow > *')?.nextElementSibling as HTMLElement | null | undefined : null;
    if (at) { at.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); at.setAttribute('tabindex', '-1'); at.focus({ preventScroll: true }); }
    else (prevFocus.current as HTMLElement | null)?.focus?.({ preventScroll: true }); };
  const said1 = (o: Outcome) => (o.kind === 'refused' ? o.why : o.verdict === 'costly' ? `Recorded: a costly call. ${o.option.fail || ''} The story goes on with it.` : o.verdict === 'canonical' ? 'Recorded: the professional call. The story continues.' : 'Recorded: it works, not the best. The story continues.');
  if (ch.error) return <div className="sg" data-testid="story-error"><h1 tabIndex={-1}>{ref.title} did not load</h1>{notKept() ? <p className="lead" data-testid="story-not-kept">You are offline and this chapter is not kept on this device. Chapters you have already opened, and seasons kept from <a href="#/offline">Offline and this device</a>, open without a connection. Your progress is untouched.</p> : <p className="lead">This chapter’s file could not be read ({ch.error}). Your progress is untouched.</p>}<p><a className="ui-btn ui-btn--primary" href="#/story">Back to the library</a></p></div>;
  let panelNo = -1;
  return (
    <article className="sg sg-read" data-testid="story-reader" data-still={still} data-chapter={id} data-reached={upTo} data-items={items.length} aria-busy={!ch.data}>
      <Crumbs items={[{ label: 'Learn', href: '#/learn' }, { label: 'SIGNAL', href: '#/story' }, { label: ref.season ? `Season ${ref.season}` : 'Prologue', href: '#/story' }, { label: ref.title }]} />
      {failed != null && <div className="sg-banner" role="status" data-testid="story-gameover-banner"><b>✕ Game over · Season {failed} review failed (Story Score {progress.reviews[`S${failed}`]!.score}).</b> <button type="button" className="ui-btn" onClick={() => retry(failed)}>↺ Retry Season {failed}</button> <button type="button" className="ui-btn ui-btn--quiet" onClick={restart}>⟲ Restart</button></div>}
      <p className="kicker">{ref.kicker} <Draft /></p>
      <h1 tabIndex={-1}>{ref.title}</h1>
      {ref.sub && <p className="lead">{ref.sub}</p>}
      <div className="sg-bar">
        <Pick label="Decision clock" value={progress.clock} options={[['on', 'Clock on'], ['extended', 'Double time'], ['off', 'No clock']] as const} onChange={(c: Clock) => commit({ ...progress, clock: c })} />
        <label className="sg-check"><input type="checkbox" checked={still} onChange={(e) => { setStill(e.target.checked); try { localStorage.setItem('signal-still', e.target.checked ? '1' : '0'); } catch { /* */ } }} data-testid="story-still" /> Still art</label>
        <label className="sg-check"><input type="checkbox" checked={!progress.gates} onChange={(e) => commit({ ...progress, gates: !e.target.checked })} data-testid="story-gates" /> Show the whole chapter without waiting for decisions</label>
      </div>
      {ch.data && ch.data.chapter.flags.length > 0 && (
        <details className="sg-flags" data-testid="story-flags"><summary>{ch.data.chapter.flags.length} review point{ch.data.chapter.flags.length === 1 ? '' : 's'} open on this chapter</summary>
          <ul>{ch.data.chapter.flags.map((f) => <li key={f}><b>{f}</b> {flags.data?.[f] ? `· ${flags.data[f]!.type.toLowerCase()}: ${flags.data[f]!.title}` : ''}</li>)}</ul></details>)}
      {locked ? <div className="sg-lock" role="note" data-testid="story-locked"><p className="sg-lock__k">🔒 Locked chapter</p>
        <p>Clear the core (★) and recommended (◐) gates in {behind ? <b>{behind.title}</b> : 'the chapter before'} to open this one. Reviewer mode above shows every chapter without the gates and keeps your progress as it is.</p>
        {behind && <p><a className="ui-btn ui-btn--primary" href={`#/story/${behind.id}`} data-testid="story-locked-back">◂ Back to {behind.title}</a> <a className="ui-btn" href="#/story">Library</a></p>}</div> : <>
      {!ch.data && <p data-testid="story-loading">Opening the chapter…</p>}
      {ch.data && <Echoes prev={prev?.title || null} e={before} />}
      <GlCtx.Provider value={glCtx}><div className="sg-flow">
        {items.slice(0, upTo).map((it, i) => { if (it.type === 'panel') panelNo += 1; return <ItemView key={i} it={it} n={i} svg={it.type === 'panel' ? art.data?.panels[panelNo] : undefined} cast={ix.cast} state={state} clock={progress.clock} gated={progress.gates}
          onChoose={(d, letter, meta) => { const r = choose(state, d, letter, meta); set(r.state); setSaid(said1(r.outcome)); return r.outcome; }}
          pieces={pieces} progress={progress} onQuiz={(qid, r, n) => { commit({ ...recordQuiz(progress, qid, r, n), last: id }); setSaid(`Check recorded: ${r} of ${n}.`); }} onSkip={(g) => { commit({ ...skip(progress, g), last: id }); setSaid('Skipped for now. It stays here to come back to.'); }}
          onReview={(rid, rec) => { commit({ ...progress, reviews: { ...progress.reviews, [rid]: rec }, last: id }); setSaid(rec.pass ? `Season review passed: Story Score ${rec.score}.` : `Game over: Story Score ${rec.score}, below 65.`); }}
          onRetrySeason={retry} onRestart={restart}
          onBoss={(bid, rec) => { update((cur) => ({ ...cur, bosses: { ...cur.bosses, [bid]: rec }, last: id })); if (rec.passed && rec.at && rec.best >= 1) setSaid(`Boss cleared in ${rec.tries} run${rec.tries === 1 ? '' : 's'}. The story goes on.`); }}
          onChallenge={(key, score, pass) => update((cur) => recordChalTry(cur, key, score, pass, Date.now()))}
          onMeltdown={(mid, rec) => { commit({ ...progress, meltdowns: { ...progress.meltdowns, [mid]: rec }, last: id }); setSaid(rec.last === 'proven' ? `Meltdown contained and proven: rating ${rec.grade}.` : rec.last === 'partial' ? 'Meltdown survived, not proven. Recorded.' : 'Meltdown lost. Recorded; the after-action review shows where it turned.'); }}
          onLab={(lid, ok, fin) => { commit({ ...recordLabTry(progress, lid, ok, fin), last: id }); setSaid(ok ? 'Lab fixed and recorded.' : fin ? 'Lab ended, not passed. Recorded; the fix is shown in the lab.' : 'Not fixed yet. The lab stays open.'); }}
          onIncident={(iid, o, why) => { commit({ ...recordIncidentRun(progress, iid, o, why), last: id }); setSaid(o === 'proven' ? 'Incident closed: restored and proven. Recorded.' : o === 'partial' ? 'Incident closed: restored, not proven. Recorded.' : 'Incident closed as failed. Recorded; the debrief says why, and you can run it again.'); }}
          onDrill={(did, ok) => { commit({ ...recordDrillTry(progress, did, ok), last: id }); setSaid(ok ? 'Drill passed and recorded.' : 'Drill recorded as not passed. The story goes on; you can try it again here.'); }}
          onTimeout={(d, h) => { set(timeOut(state, d, h)); setSaid('Time ran out. The decision is recorded as missed. Tap an option to see what it would have done, or replay it to make it count.'); }}
          onReplay={(did) => { set(replayDecision(state, did)); setSaid('The decision is open again and the clock restarts.'); }}
          onTalk={(tid, o) => set(answerTalk(state, tid, o))} onFind={(did) => set(find(state, did))} />; })}
        {ch.data && upTo >= items.length && art.data?.closing.map((c, i) => <figure key={i} className="sg-panel"><div className="sg-art" role="img" aria-label={c.alt} dangerouslySetInnerHTML={{ __html: c.svg }} /></figure>)}
      </div></GlCtx.Provider>
      {glOpen && gl.data && <GlPop g={glOpen.g} at={glOpen.at} gl={gl.data} onClose={glClose} />}
      <p className="ui-visually-hidden" role="status" aria-live="polite" data-testid="story-said">{said}</p>
      {body && <GatePop body={body} go={head!.chapter ? (next ? 'Open the next chapter ▸' : 'Close') : 'Continue the story ▸'} onClose={closePop} />}
      {ch.data && upTo < items.length && <p className="sg-wait" data-testid="story-waiting" data-kind={hold?.kind || 'decision'}>{hold && hold.kind !== 'decision' ? `🔒 ${hold.kind === 'lesson' ? 'Finish the lesson check' : hold.kind === 'drill' ? 'Finish the drill' : hold.kind === 'incident' ? 'Run the live incident to its end' : hold.kind === 'lab' ? 'Fix it — or run out the clock' : hold.kind === 'meltdown' ? 'Survive the meltdown — or fail it' : hold.kind === 'boss' ? 'Clear the boss level — a failed run starts over from the top —' : hold.kind === 'review' ? 'The next season opens only with a Story Score of 65 or higher. Submit the season for review' : 'Answer every question'} to continue${hold.tier === 'soft' ? ', or skip it for now' : ''}.` : 'The story is waiting for your decision.'} {items.length - upTo} more moments follow.{gc ? ` ${gc.cleared} of ${gc.total} gates cleared in this chapter.` : ''}</p>}
      {pieces && <p className="ui-meta" data-testid="story-gate-note">Played inside the story in this build: decisions, quizzes, lessons, drills, live incidents, Fix-It Labs, season reviews, meltdowns and boss levels.</p>}
      {ch.data && finished && upTo >= items.length && (
        <Block title="Where this chapter leaves you" testId="story-summary">
          <ul className="sg-sum">
            {t.decisions > 0 && <li><b>{t.made} of {t.decisions}</b> decisions made: <span data-testid="story-counts" data-canonical={t.canonical} data-costly={t.costly} data-neutral={t.neutral}>★ {t.canonical} professional, ◦ {t.neutral} workable, ✕ {t.costly} costly</span>{t.timedOut ? `, ${t.timedOut} past the clock` : ''}{t.changed ? `, ${t.changed} changed after the first choice` : ''}{t.hints ? `, ${t.hints} hint${t.hints === 1 ? '' : 's'} used` : ''}</li>}
            {t.decisions > 0 && <li data-testid="story-verdict">{chapterVerdict(t)}</li>}
            {t.decisions > 0 && <li>Merit from this chapter’s choices: <b data-testid="story-merit">{t.merit > 0 ? `+${t.merit}` : t.merit}</b></li>}
            {Object.keys(t.trust).length > 0 && <li>Trust moved: {Object.entries(t.trust).filter(([, v]) => v !== 0).map(([k, v]) => `${k} ${v > 0 ? `+${v}` : v}`).join(', ') || 'nowhere, on balance'}</li>}
            {t.discoveries > 0 && <li><b>{t.found} of {t.discoveries}</b> discoveries found</li>}
          </ul>
          <p className="ui-meta">Counted from the story’s own weights for the choices made in this browser. It is practice in a story, not an assessment of a person.</p>
        </Block>)}
      <p className="sg-acts">
        {next && finished && <a className="ui-btn ui-btn--primary" href={`#/story/${next.id}`} data-testid="story-next">Next: {next.title}</a>}
        <a className="ui-btn" href={`#/play/${id}`} data-testid="story-play">Play this chapter as scenes</a>
        <a className="ui-btn" href="#/story">Library</a>
        {(Object.keys(state.choices).length > 0 || state.found.length > 0 || Object.keys(state.talks).length > 0) && <button type="button" className="ui-btn ui-btn--quiet" data-testid="story-replay" onClick={() => { set(emptyChapter()); setSaid('Chapter reset. Your earlier choices in it are forgotten.'); }}>Replay this chapter</button>}
      </p>
      </>}
    </article>
  );
}

export interface ViewProps { it: Item; n: number; svg?: string; cast: Record<string, string>; state: ChapterState; clock: Clock; gated: boolean; onChoose: (d: Extract<Item, { type: 'decision' }>, letter: string, meta: { hints: number }) => Outcome; onTimeout?: (d: Extract<Item, { type: 'decision' }>, hints: number) => void; onReplay?: (id: string) => void; onTalk: (id: string, o: number) => void; onFind: (id: string) => void;
  /** the chapter's pieces and gates, and the reader's quiz records, when loaded */ pieces?: Pieces | null; progress?: Progress; onQuiz?: (id: string, right: number, total: number) => void; onSkip?: (g: Gate) => void; onDrill?: (id: string, passed: boolean) => void; onIncident?: (id: string, outcome: 'proven' | 'partial' | 'fail', why: 'declared' | 'clock' | 'boundary') => void; onLab?: (id: string, passed: boolean, final: boolean) => void; onReview?: (id: string, rec: ReviewRecord) => void; onRetrySeason?: (season: number) => void; onRestart?: () => void; onMeltdown?: (id: string, rec: MeltdownRecord) => void; onBoss?: (id: string, rec: BossRecord) => void; onChallenge?: (key: string, score: number, passed: boolean) => void }
const MOUNT_WORD: Record<string, string> = { lesson: 'Lesson', lab: 'Lab', quiz: 'Quiz', drill: 'Drill', incident: 'Live incident', review: 'Season review', boss: 'Boss level', meltdown: 'Meltdown' };
const gateOf = (p: ViewProps, kind: string, id: string): Gate | undefined => p.pieces?.gates.find((g) => g.index === p.n && g.kind === kind && g.id === id);
/** Lesson cards carry a little markup (bold, italic, sub, sup, a formula span). Only those become elements; anything else is text. */
function Rich({ html }: { html: string }) {
  const out: ReactNode[] = []; const stack: { tag: string; kids: ReactNode[] }[] = [{ tag: '', kids: out }]; const re = /<(\/?)(b|i|sub|sup|span)(?:\s+class="formula")?\s*>/g; let at = 0; let m: RegExpExecArray | null; let k = 0;
  const text = (t: string) => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  while ((m = re.exec(html))) { if (m.index > at) stack[stack.length - 1]!.kids.push(text(html.slice(at, m.index))); at = m.index + m[0].length;
    if (!m[1]) stack.push({ tag: m[2]!, kids: [] }); else if (stack.length > 1 && stack[stack.length - 1]!.tag === m[2]) { const f = stack.pop()!; const key = k++; const el = f.tag === 'span' ? <code key={key} className="sg-formula">{f.kids}</code> : f.tag === 'b' ? <b key={key}>{f.kids}</b> : f.tag === 'i' ? <i key={key}>{f.kids}</i> : f.tag === 'sub' ? <sub key={key}>{f.kids}</sub> : <sup key={key}>{f.kids}</sup>; stack[stack.length - 1]!.kids.push(el); } }
  if (at < html.length) stack[stack.length - 1]!.kids.push(text(html.slice(at))); while (stack.length > 1) { const f = stack.pop()!; stack[stack.length - 1]!.kids.push(...f.kids); }
  return <>{out}</>;
}
function QuizView({ q, id, rec, onDone }: { q: Quiz; id: string; rec?: { best: number; total: number; first: number }; onDone: (right: number, total: number) => void }) {
  const [picked, setPicked] = useState<Record<number, number>>({}); const [round, setRound] = useState(0); const n = Object.keys(picked).length; const right = q.qs.filter((x, i) => picked[i] === x.a).length;
  useEffect(() => { if (n === q.qs.length && n > 0) onDone(right, q.qs.length); }, [n]);
  return <div className="sg-quiz" data-testid="story-quiz" data-quiz={id} data-answered={n} data-of={q.qs.length} key={round}>
    <h4>✎ {q.title}</h4>{rec && n === 0 && <p className="ui-meta" data-testid="story-quiz-rec">Done before: best {rec.best} of {rec.total}, first {rec.first}. Answer again to practise; the first score stays.</p>}
    <ol className="sg-qs">{q.qs.map((x, i) => { const got = picked[i]; const done = got !== undefined; return <li key={i} data-done={done}><p className="sg-q">{x.q}</p>
      <div className="sg-qopts" role="group" aria-label={`Question ${i + 1}`}>{x.o.map((o, j) => <button key={j} type="button" className="sg-opt sg-qopt" disabled={done} data-state={!done ? '' : j === x.a ? 'right' : j === got ? 'wrong' : ''} onClick={() => setPicked({ ...picked, [i]: j })}>{o}{done && j === x.a ? <span className="sg-mark"> ✓ right answer</span> : done && j === got ? <span className="sg-mark"> ✕ your answer</span> : null}</button>)}</div>
      {done && <p className="sg-why" role="status">{got === x.a ? '✓ Right. ' : '✕ Not quite. '}{x.why}</p>}</li>; })}</ol>
    {n === q.qs.length && <p className="sg-score" data-testid="story-quiz-score">Score {right} of {q.qs.length}{right === q.qs.length ? ' · clean sheet' : ' · review the explanations above'} <button type="button" className="ui-btn ui-btn--quiet" onClick={() => { setPicked({}); setRound(round + 1); }}>Retake</button></p>}
  </div>;
}
/** A quiz or a lesson inside the chapter, with the tier of its gate and what clears it. */
function Piece({ p, kind, id, n, label }: { p: ViewProps; kind: string; id: string; n: number; label?: string | null }) {
  const g = gateOf(p, kind, id); const pieces = p.pieces; const prog = p.progress; if (!pieces || !prog) return null; void n;
  if (kind === 'drill') return <DrillPiece p={p} id={id} g={g} label={label} />;
  if (kind === 'incident') return <IncidentPiece p={p} id={id} g={g} label={label} />;
  if (kind === 'lab') return <LabPiece p={p} id={id} g={g} label={label} />;
  if (kind === 'review') return <ReviewPiece p={p} id={id} g={g} />;
  if (kind === 'meltdown') return <MeltdownPiece p={p} id={id} g={g} label={label} />;
  if (kind === 'boss') return <BossPiece p={p} id={id} g={g} label={label} />;
  const L = kind === 'lesson' ? pieces.lessons[id] : undefined; const qid = kind === 'lesson' ? L?.quiz : id; const q = qid ? pieces.quizzes[qid] : undefined; if (!q) return null;
  const cleared = g ? gateCleared(g, p.state, prog, pieces) : !!prog.quizzes[qid!]; const skipped = !!(g && prog.skips[gateKey(g)]) && !prog.quizzes[qid!];
  return <section className={`sg-piece is-${g?.tier || 'opt'}`} data-item="piece" data-kind={kind} data-piece={id} data-tier={g?.tier || 'opt'} data-cleared={cleared} aria-label={`${kind === 'lesson' ? 'Lesson' : 'Check'}: ${L?.title || q.title}`}>
    <p className="sg-tier" data-testid="story-tier">{TIER_WORD[g?.tier || 'opt']}{skipped ? ' · skipped for now' : ''}</p>
    {L && <><p className="sg-dec__k">Lesson {id} · {L.domain}</p><h3>{L.title}</h3>{L.sum && <p className="lead">{L.sum}</p>}<div className="sg-cards">{L.cards.map((c, i) => <p key={i} className="sg-card"><Rich html={c} /></p>)}</div>{L.flag && <p className="ui-meta">⚑ {L.flag}</p>}</>}
    {label && !L && <p className="ui-meta"><Em text={label} /></p>}
    <QuizView q={q} id={qid!} rec={prog.quizzes[qid!]} onDone={(r, t) => p.onQuiz?.(qid!, r, t)} />
    {g?.tier === 'soft' && !cleared && <p><button type="button" className="ui-btn ui-btn--quiet" data-testid="story-skip" onClick={() => p.onSkip?.(g)}>Skip for now</button></p>}
  </section>;
}
/** A practice drill inside the chapter (restored 11 Nov 2026): the shared runner on the reference's rules, on the story's clock.
 *  Its gate is done once a try is recorded, passed or not, as the reference's gate.js has it; a failure explains itself and can be retried. */
const FACTOR: Record<string, number> = { on: 1, extended: 2, off: 0 };
function DrillPiece({ p, id, g, label }: { p: ViewProps; id: string; g: Gate | null | undefined; label?: string | null }) {
  const d = p.pieces?.drills?.[id]; const prog = p.progress; if (!d || !prog) return null;
  const rec = prog.drills[id]; const cleared = g ? gateCleared(g, p.state, prog, p.pieces!) : !!rec; const skipped = !!(g && prog.skips[gateKey(g)]) && !rec;
  return <section className={`sg-piece is-${g?.tier || 'opt'}`} data-item="piece" data-kind="drill" data-piece={id} data-tier={g?.tier || 'opt'} data-cleared={cleared} aria-label={`Drill: ${String(d['title'] || id)}`}>
    <p className="sg-tier" data-testid="story-tier">{TIER_WORD[g?.tier || 'opt']}{g?.core ? ' · the chapter’s core skill' : ''}{skipped ? ' · skipped for now' : ''}</p>
    {label && <p className="ui-meta"><Em text={label} /></p>}
    {rec && <p className="ui-meta" data-testid="story-drill-rec">{rec.passed ? 'Passed' : 'Not passed yet'} · {rec.tries} {rec.tries === 1 ? 'try' : 'tries'} · first try {rec.first ? 'passed' : 'not passed'}.</p>}
    <DrillRunner key={p.clock} d={d as unknown as Drill} heading="h4" factor={FACTOR[p.clock] ?? 1} onDone={(ok) => p.onDrill?.(id, ok)} />
    {g?.tier === 'soft' && !cleared && <p><button type="button" className="ui-btn ui-btn--quiet" data-testid="story-skip" onClick={() => p.onSkip?.(g)}>Skip for now</button></p>}
  </section>;
}
/** A live incident inside the chapter (restored 11 Nov 2026): the shared Service Mode runner on the reference's rules, on the story's
 *  clock. Its gate is done once a run ends, whatever the outcome, as gate.js has it; the record keeps the best and the first. */
const OUTCOME_WORD = { proven: 'restored and proven', partial: 'restored, not proven', fail: 'failed' } as const;
function IncidentPiece({ p, id, g, label }: { p: ViewProps; id: string; g: Gate | null | undefined; label?: string | null }) {
  const inc = p.pieces?.incidents?.[id]; const prog = p.progress; if (!inc || !prog) return null;
  const rec = prog.incidents[id]; const cleared = g ? gateCleared(g, p.state, prog, p.pieces!) : !!rec; const skipped = !!(g && prog.skips[gateKey(g)]) && !rec;
  return <section className={`sg-piece is-${g?.tier || 'opt'}`} data-item="piece" data-kind="incident" data-piece={id} data-tier={g?.tier || 'opt'} data-cleared={cleared} aria-label={`Live incident: ${inc.title}`}>
    <p className="sg-tier" data-testid="story-tier">{TIER_WORD[g?.tier || 'opt']}{skipped ? ' · skipped for now' : ''}</p>
    {label && <p className="ui-meta"><Em text={label} /></p>}
    {rec && <p className="ui-meta" data-testid="story-incident-rec">Best so far: {OUTCOME_WORD[rec.best]} · {rec.runs} {rec.runs === 1 ? 'run' : 'runs'} · first run {OUTCOME_WORD[rec.first]} ({rec.firstWhy === 'clock' ? 'the clock ran out' : rec.firstWhy === 'boundary' ? 'a boundary was crossed' : 'declared'}).</p>}
    <IncidentRunner key={p.clock} inc={inc as unknown as Incidents.Incident} heading="h4" factor={FACTOR[p.clock] ?? 1} onEnd={(o, why) => p.onIncident?.(id, o, why)} />
    {g?.tier === 'soft' && !cleared && <p><button type="button" className="ui-btn ui-btn--quiet" data-testid="story-skip" onClick={() => p.onSkip?.(g)}>Skip for now</button></p>}
  </section>;
}
/** A Fix-It Lab inside the chapter (restored 11 Nov 2026): the shared runner on the reference's rules, on the story's clock. Its gate
 *  is done when the lab is fixed, or ends (the clock, or "Show me the fix"), as gate.js has it; a miss keeps it open. */
function LabPiece({ p, id, g, label }: { p: ViewProps; id: string; g: Gate | null | undefined; label?: string | null }) {
  const L = p.pieces?.labs?.[id]; const prog = p.progress; if (!L || !prog) return null;
  const rec = prog.labs[id]; const cleared = g ? gateCleared(g, p.state, prog, p.pieces!) : !!(rec && (rec.passed || rec.done)); const skipped = !!(g && prog.skips[gateKey(g)]) && !rec;
  return <section className={`sg-piece is-${g?.tier || 'opt'}`} data-item="piece" data-kind="lab" data-piece={id} data-tier={g?.tier || 'opt'} data-cleared={cleared} aria-label={`Fix-It Lab: ${L.title}`}>
    <p className="sg-tier" data-testid="story-tier">{TIER_WORD[g?.tier || 'opt']}{g?.core ? ' · the chapter’s core skill' : ''}{skipped ? ' · skipped for now' : ''}</p>
    {label && <p className="ui-meta"><Em text={label} /></p>}
    {rec && <p className="ui-meta" data-testid="story-lab-rec">{rec.passed ? `Fixed (on try ${rec.passTry})` : rec.done ? 'Ended, not passed' : 'Not fixed yet'} · {rec.tries} {rec.tries === 1 ? 'test' : 'tests'}.</p>}
    <LabRunner key={p.clock} L={L as unknown as LabData} heading="h4" factor={FACTOR[p.clock] ?? 1} onRecord={(ok, fin) => p.onLab?.(id, ok, fin)} />
    {g?.tier === 'soft' && !cleared && <p><button type="button" className="ui-btn ui-btn--quiet" data-testid="story-skip" onClick={() => p.onSkip?.(g)}>Skip for now</button></p>}
  </section>;
}
/** A season review inside the season finale (restored 11 Nov 2026): the six ratings from first attempts, the Story Score, what pulled it
 *  down, the Seasons 10–12 forecast (the loadout, locked at Season 9). Submitting records it; below 65 is game over: retry the season,
 *  restart the story, or look back first. The gate opens only on a pass, as the reference's gate.js has it. */
function ReviewPiece({ p, id, g }: { p: ViewProps; id: string; g: Gate | null | undefined }) {
  const X = useLoaded(loadRatings, 'ratings'); const prog = p.progress; const [look, setLook] = useState(false); if (!prog) return null;
  const se = Number(id.slice(1)); const rec = prog.reviews[id];
  if (!X.data) return <section className="sg-piece is-hard" data-item="piece" data-kind="review" data-piece={id}><p className="ui-meta">{X.error ? `The ratings did not load: ${X.error}` : 'Gathering your first attempts…'}</p></section>;
  const r = RT.ratingsFor(prog, X.data, se); const lo = se >= 9 && rec?.loadout ? rec.loadout : RT.loadoutOf(r);
  const bars = (rr: RT.Ratings) => <ul className="sg-bars" data-testid="story-ratings">{RT.DIMS.map(([k, label, q]) => { const v = rr.dims[k].score; return <li key={k} data-band={RT.band(v)}><span><b>{label}</b><span className="ui-meta">{q}</span></span><svg className="sg-meter" viewBox="0 0 100 8" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label={label}><rect className="sg-meter__bg" x="0" y="0" width="100" height="8" rx="3" /><rect className="sg-meter__fg" x="0" y="0" width={v} height="8" rx="3" /><line className="sg-meter__pass" x1={RT.PASS} x2={RT.PASS} y1="0" y2="8" /></svg><b className="num">{v}</b></li>; })}</ul>;
  return <section className="sg-piece is-hard sg-review" data-item="piece" data-kind="review" data-piece={id} data-tier={g?.tier || 'hard'} data-cleared={!!rec?.pass}>
    <p className="sg-tier" data-testid="story-tier">{TIER_WORD.hard}</p>
    <h3>Season {se} review · six ratings</h3>
    <p>Everything you did through Season {se} — first attempts, not retries — is rated six ways. The Story Score must be {RT.PASS} or higher for the story to go on.</p>
    {bars(r)}
    <p className="sg-score" data-testid="story-score" data-pass={r.pass}>Story Score {r.score} / 100 · {r.pass ? 'the story goes on' : `below ${RT.PASS} — game over`}</p>
    <p className="ui-meta">{r.debt} unresolved shortcut{r.debt === 1 ? '' : 's'} on the books · {r.seen} first attempt{r.seen === 1 ? '' : 's'} counted.</p>
    {r.notes.length > 0 && <><p className="sg-dec__k">What pulled your score down</p><ul className="sg-notes" data-testid="story-review-notes">{r.notes.map((n) => <li key={n.t}>{n.t}</li>)}</ul></>}
    <p className="sg-dec__k">{se >= 9 && rec?.loadout ? 'Seasons 10–12 · your loadout' : 'Forecast · if this holds, Seasons 10–12 look like this'}</p>
    <ul className="sg-loadout" data-testid="story-loadout">{Object.entries(lo).map(([k, o]) => <li key={k} data-level={o.lvl}><span className="sg-tag">{RT.LEVEL[o.lvl]}</span> <b>{o.label}</b> <span>{o.text}</span></li>)}</ul>
    <p className="ui-meta">Levels come from your ratings (80 and above full, 65 and above limited, below that the bare minimum).</p>
    {!rec && <p><button type="button" className="ui-btn ui-btn--primary" data-testid="story-review-submit" onClick={() => p.onReview?.(id, RT.submitReview(prog, X.data!, se, Date.now()) as ReviewRecord)}>▶ Submit Season {se} for review</button></p>}
    {rec && rec.pass && <p className="sg-verdict" data-testid="story-review-verdict" data-pass="true">✓ Season {se} passed · Story Score {rec.score}</p>}
    {rec && !rec.pass && !look && <div className="sg-gameover" role="alertdialog" aria-labelledby={`go-${id}`} data-testid="story-gameover"><p className="sg-dec__k">✕ Game over · story failure</p><h4 id={`go-${id}`}>Season {se} ends the story</h4>
      <p>Your Story Score is {rec.score}. The story needs {RT.PASS}. The people who counted on Maya stopped counting on her — and the next season doesn’t happen.</p>
      <p className="sg-row"><button type="button" className="ui-btn ui-btn--primary" onClick={() => p.onRetrySeason?.(se)}>↺ Retry Season {se}</button><button type="button" className="ui-btn" onClick={() => p.onRestart?.()}>⟲ Restart the whole story</button><button type="button" className="ui-btn ui-btn--quiet" onClick={() => setLook(true)}>Look back first</button></p>
      <p className="ui-meta">Retrying a season clears that season’s first attempts so they can be earned again. Earlier seasons keep their record.</p></div>}
    {rec && !rec.pass && look && <p className="sg-verdict" data-testid="story-review-verdict" data-pass="false">✕ Game over · Season {se} was submitted at {rec.score}. <button type="button" className="ui-btn" onClick={() => p.onRetrySeason?.(se)}>↺ Retry Season {se}</button></p>}
  </section>;
}
/** A meltdown inside the season finale (restored 11 Nov 2026): the shared runner on the reference's rules, on the story's clock, with
 *  the loadout (Season 9's, or the forecast) deciding which nodes and moves are affordable in Seasons 10–12. Its gate clears when a run
 *  ends, survived or failed, as gate.js has it; the record keeps the best and the first. */
function MeltdownPiece({ p, id, g, label }: { p: ViewProps; id: string; g: Gate | null | undefined; label?: string | null }) {
  const M = p.pieces?.meltdowns?.[id]; const prog = p.progress; const X = useLoaded(loadRatings, 'ratings'); if (!M || !prog) return null;
  const lo = X.data ? RT.currentLoadout(prog, X.data) : null; const rec = prog.meltdowns[id]; const cleared = g ? gateCleared(g, p.state, prog, p.pieces!) : !!rec;
  if (!lo) return <section className="sg-piece is-hard" data-item="piece" data-kind="meltdown" data-piece={id}><p className="ui-meta">{X.error ? `The ratings did not load: ${X.error}` : 'Reading your loadout…'}</p></section>;
  return <section className={`sg-piece is-${g?.tier || 'hard'}`} data-item="piece" data-kind="meltdown" data-piece={id} data-tier={g?.tier || 'hard'} data-cleared={cleared} aria-label={`Meltdown: ${M.title}`}>
    <p className="sg-tier" data-testid="story-tier">{TIER_WORD[g?.tier || 'hard']}</p>
    {label && <p className="ui-meta"><Em text={label} /></p>}
    {rec && <p className="ui-meta" data-testid="story-meltdown-rec">Best so far: {rec.best === 'proven' ? 'contained and proven' : rec.best === 'partial' ? 'survived, not proven' : 'mission failed'}, rating {rec.grade} · {rec.runs} {rec.runs === 1 ? 'run' : 'runs'} · first run rated {rec.firstGrade}.</p>}
    <MeltdownRunner key={p.clock} M={M as unknown as Meltdowns.Meltdown} heading="h4" factor={FACTOR[p.clock] ?? 1} resMet={(r) => RT.resMet(lo, r)} resWhy={(r) => RT.resWhy(lo, r)} onEnd={(S) => p.onMeltdown?.(id, Meltdowns.recordMeltdown(rec as Meltdowns.MeltdownRecord | undefined, S) as MeltdownRecord)} />
  </section>;
}
function BossPiece({ p, id, g, label }: { p: ViewProps; id: string; g: Gate | null | undefined; label?: string | null }) {
  const B = p.pieces?.bosses?.[id]; const prog = p.progress; if (!B || !prog) return null; const rec = prog.bosses[id]; const cleared = g ? gateCleared(g, p.state, prog, p.pieces!) : !!rec?.passed;
  return <section className={`sg-piece is-${g?.tier || 'hard'}`} data-item="piece" data-kind="boss" data-piece={id} data-tier={g?.tier || 'hard'} data-cleared={cleared} aria-label={`Boss level: ${B.title}`}>
    <p className="sg-tier" data-testid="story-tier">{TIER_WORD[g?.tier || 'hard']}</p>
    {label && <p className="ui-meta"><Em text={label} /></p>}
    <BossRunner key={p.clock} id={id} B={B as unknown as Bosses.Boss} heading="h3" factor={FACTOR[p.clock] ?? 1} tier={prog.support && prog.support !== 'auto' ? Number(prog.support) : p.pieces?.tiers?.[id] ?? 2} formulas={(p.pieces?.formulas || {}) as Record<string, Formula>} record={rec} onRecord={(r) => p.onBoss?.(id, r as BossRecord)} onChallenge={(key, score, pass) => p.onChallenge?.(key, score, pass)} />
  </section>;
}
export function ItemView(p: ViewProps): JSX.Element | null {
  const { it, cast } = p; const name = (id: string) => cast[id] || id;
  switch (it.type) {
    case 'heading': return <header className="sg-h" data-item="heading"><h2>{it.text}</h2>{it.sub && <p>{it.sub}</p>}</header>;
    case 'panel': return (
      <figure className={`sg-panel${it.kind === 'flashback' ? ' is-flashback' : ''}`} data-item="panel">
        {it.tab && <p className="sg-tab">{it.tab}</p>}
        <div className="sg-art" role="img" aria-label={it.alt} {...(p.svg ? { dangerouslySetInnerHTML: { __html: p.svg } } : {})} />
        <figcaption>
          {it.narration.map((n, i) => <p key={i} className="sg-narr"><Gl k={`${p.n}:n${i}`} text={n.replace(/\s*\[COMIC\]\s*$/, '')} plain /></p>)}
          {it.bubbles.length > 0 && <ul className="sg-bubbles">{it.bubbles.map((b, i) => <li key={i} className="sg-bubble" data-side={b.side} data-kind={b.kind}><b>{b.who}{b.kind === 'radio' ? ' (radio)' : b.kind === 'phone' ? ' (phone)' : b.kind === 'whisper' ? ' (whisper)' : ''}</b> <Gl k={`${p.n}:b${i}`} text={b.text} /></li>)}</ul>}
          {it.caption && <p className="sg-cap"><Gl k={`${p.n}:cap`} text={it.caption} plain /></p>}
          {it.evidence.length > 0 && <p className="sg-ev">{it.evidence.map((e, i) => <span key={i} className="ui-tag">{e.label}: {e.state.toLowerCase()}</span>)}{it.confidence !== null && <span className="ui-meta"> Confidence {it.confidence}%</span>}</p>}
          {it.flags.length > 0 && <p className="ui-meta sg-flagline">Under review: {it.flags.join(', ')}</p>}
        </figcaption>
      </figure>);
    case 'note': return <aside className="sg-note" data-item="note" data-role={it.role}><Paras text={it.text} />{it.case && <p className="ui-meta">Case file {it.case}</p>}</aside>;
    case 'quest': return (
      <section className="sg-quest" data-item="quest" aria-label={`Quest: ${it.title}`}>
        <p className="sg-quest__k">{it.kind} · {it.level}</p><h3>{it.title}</h3>
        <p className="sg-party">{it.party.map((id) => <span key={id} className="sg-who"><Face id={id} pose="N" expr="smile" />{name(id)}</span>)}</p>
        <dl className="sg-dl"><div><dt>At stake</dt><dd>{it.stakes}</dd></div><div><dt>Clock</dt><dd>{it.clock}</dd></div><div><dt>Reward</dt><dd>{it.reward}</dd></div></dl>
        <ul className="sg-obj">{it.objectives.map((o) => <li key={o.key}>{o.text}</li>)}</ul>
        {it.rumor && <p className="sg-rumor"><b>Rumour.</b> {it.rumor}</p>}
      </section>);
    case 'beat': return (
      <section className="sg-beat" data-item="beat" data-mood={it.mood}>{it.where && <p className="ui-meta">{it.where}</p>}
        <ul>{it.lines.map((l, i) => <li key={i}><Face id={l.who} pose={l.pose} expr={l.expr} /><span><b>{name(l.who)}</b> <Gl k={`${p.n}:l${i}`} text={l.text} /></span></li>)}</ul></section>);
    case 'discovery': { const found = p.state.found.includes(it.id); return (
      <section className="sg-disc" data-item="discovery" data-found={found}>
        {found ? <><p className="sg-disc__k">Discovery · {it.thread}</p><h3>{it.title}</h3><GlParas k={`${p.n}:di`} text={it.body} /></>
          : <button type="button" className="ui-btn" onClick={() => p.onFind(it.id)} data-discovery={it.id}>Look closer: {it.teaser}</button>}
      </section>); }
    case 'twist': return <section className="sg-twist" data-item="twist"><p className="sg-twist__k">Twist</p><h3>{it.title}</h3><GlParas k={`${p.n}:tw`} text={it.body} />{it.label && <p className="ui-meta">{it.label}</p>}
      <Piece p={p} kind={it.test_kind} id={it.test_id} n={p.n} /></section>;
    case 'history': return <aside className="sg-hist" data-item="history"><p className="sg-hist__k">Then and now{it.when ? ` · ${it.when}` : ''}</p><h3>{it.title}</h3><GlParas k={`${p.n}:hi`} text={it.body} /><p className="ui-meta">Under review: {it.flag}. Dates and attributions are the author’s draft until that review closes.</p></aside>;
    case 'mount': return (it.kind === 'quiz' || it.kind === 'lesson' || (it.kind === 'drill' && p.pieces?.drills?.[it.id]) || (it.kind === 'incident' && p.pieces?.incidents?.[it.id]) || (it.kind === 'lab' && LAB_KINDS_PLAYABLE.has(String(p.pieces?.labs?.[it.id]?.type))) || it.kind === 'review' || (it.kind === 'meltdown' && p.pieces?.meltdowns?.[it.id]) || (it.kind === 'boss' && p.pieces?.bosses?.[it.id])) && p.pieces ? <Piece p={p} kind={it.kind} id={it.id} n={p.n} label={it.label} /> : (
      <aside className="sg-mount" data-item="mount" data-kind={it.kind}>
        <span className="ui-tag">{MOUNT_WORD[it.kind] || it.kind}</span>
        <span>{it.label ? <Em text={it.label} /> : <code>{it.id}</code>}</span>
        {it.kind === 'lab' ? <a className="ui-btn" href={`#/learn/labs/${encodeURIComponent(it.id)}`}>Open the lab</a> : it.kind === 'lesson' || it.kind === 'quiz' ? <span className="ui-meta">Opening…</span> : <span className="ui-meta" data-testid="story-not-playable">Not yet playable inside the story in this build{gateOf(p, it.kind, it.id)?.tier === 'hard' ? '. In the source the story waits for it; here it does not, because it cannot be played yet' : ''}.</span>}
      </aside>);
    case 'talk': { const a = p.state.talks[it.id]; return (
      <section className="sg-talk" data-item="talk" data-answered={a !== undefined}>
        <p className="sg-talk__q"><Face id={it.who} pose="N" expr="talk" /><span><b>{name(it.who)}</b> {it.prompt}</span></p>
        {a === undefined ? <div className="sg-opts" role="group" aria-label="Your reply">{it.options.map((o, i) => <button key={i} type="button" className="sg-opt" onClick={() => p.onTalk(it.id, i)} data-talk={i}>{o.label}</button>)}</div>
          : <><p className="sg-said">You said: {it.options[a]!.label}</p><p className="sg-reply"><Face id={it.options[a]!.who} pose={it.options[a]!.pose} expr={it.options[a]!.expr} /><span><b>{name(it.options[a]!.who)}</b> {it.options[a]!.reply}</span></p>
            <p className="ui-meta">{Object.entries(it.options[a]!.trust).map(([k, v]) => `${k} ${v > 0 ? `+${v}` : v}`).join(' · ') || 'No change in trust'}</p></>}
      </section>); }
    case 'decision': return <Decision {...p} d={it} />;
    default: return null;
  }
}

function Weight({ o, c, d, review }: { o: Option | null; c: { letter: string; hints: number } | null; d: Extract<Item, { type: 'decision' }>; review: boolean }) {
  const w = c ? weightOf(d, { letter: c.letter, first: c.letter, changes: 0, hints: c.hints }) : null; if (!w) return null; const tl = trustLine(w.trust);
  return <div className={`sg-weight is-${w.verdict}`} data-testid="story-weight" data-verdict={w.verdict} data-sev={w.sev}>
    <span className="sg-weight__k">{SEVERITY[w.sev] || SEVERITY[1]}</span><span>Merit {w.merit > 0 ? `+${w.merit}` : w.merit}</span>{tl && <span>Trust {tl}</span>}
    <p>{review ? 'After the clock: this is what it would have meant. It doesn’t count. Replay to decide for real.' : weightLine(w.verdict, w.sev)}</p>{o?.fail && <p className="sg-weight__why"><b>Why it costs.</b> {o.fail}</p>}</div>;
}
const MARK: Record<Verdict, string> = { canonical: '★ The professional call', neutral: '◦ It works, not the best', costly: '✕ A costly call' };
function Decision({ d, n, state, clock, onChoose, onTimeout, onReplay }: ViewProps & { d: Extract<Item, { type: 'decision' }> }) {
  const c = state.choices[d.id]; const recorded = passed(state, d.id); const missed = c?.letter === TIMEOUT; const total = seconds(d, clock);
  const [left, setLeft] = useState<number | null>(total); const [running, setRunning] = useState(false); const [hints, setHints] = useState(c?.hints || 0); const [peek, setPeek] = useState<string | null>(null); const ref = useRef<HTMLElement>(null);
  useEffect(() => { setLeft(total); setRunning(false); }, [total, recorded]);
  // the reference starts the clock when most of the card is in view, and stops and resets it if the card leaves the screen before a choice
  useEffect(() => { if (recorded || total === null) return undefined; const el = ref.current; if (!el || typeof IntersectionObserver === 'undefined') { setRunning(true); return undefined; }
    // "in view" is 60% of the card, or 60% of the screen when the card is taller than the screen (a card on a phone often is)
    const io = new IntersectionObserver((es) => { for (const e of es) { const need = 0.6 * Math.min(e.boundingClientRect.height, e.rootBounds?.height || window.innerHeight); if (e.isIntersecting && e.intersectionRect.height >= need) setRunning(true); else if (!e.isIntersecting) { setRunning(false); setLeft(total); } } },
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) }); io.observe(el); return () => io.disconnect(); }, [recorded, total]);
  useEffect(() => { if (recorded || !running || left === null) return undefined; if (left <= 0) { onTimeout?.(d, hints); return undefined; } const t = setTimeout(() => setLeft((x) => (x === null ? x : x - 1)), 1000); return () => clearTimeout(t); }, [left, running, recorded]);
  const shown = missed ? (peek ? d.options.find((o) => o.letter === peek) || null : null) : recorded ? d.options.find((o) => o.letter === c!.letter) || null : null;
  return (
    <section className="sg-dec" data-item="decision" data-decision={d.id} data-done={recorded} data-missed={missed} ref={ref} aria-labelledby={`${d.id}-h`}>
      <p className="sg-dec__k">Decision{d.clock ? ` · ${d.clock}` : ''}</p>
      <h3 id={`${d.id}-h`}>{d.prompt}</h3>
      <p><Gl k={`${n}:hap`} text={d.happening} plain /></p>
      <div className="sg-facts"><div><h4>Known</h4><ul>{d.known.map((k, i) => <li key={i}>{k}</li>)}</ul></div><div><h4>Not known</h4><ul>{d.unknown.map((k, i) => <li key={i}>{k}</li>)}</ul></div></div>
      <p className="sg-risk"><b>At risk.</b> {d.risk}</p>
      {!recorded && total !== null && <p className="sg-clock" data-testid="story-clock" data-left={left ?? ''} data-running={running}>{running ? <>Time to decide: <b>{left}</b> s</> : <>{total} s to decide. The clock starts when this card is in view, and restarts if it leaves the screen.</>}</p>}
      {missed && <div className="sg-missed" role="alert" data-testid="story-timeout"><p><b>Time ran out.</b> {(d.timeout || ['Someone else decided for you.']).join(' ')}</p><p>Tap any option to see what it would have done, or replay the decision to make it count.</p>
        <p><button type="button" className="ui-btn" data-testid="story-replay-decision" onClick={() => { setPeek(null); setHints(0); onReplay?.(d.id); }}>Replay this decision</button></p></div>}
      <div className="sg-opts" role="group" aria-label="Options">{d.options.map((o) => (
        <button key={o.letter} type="button" className="sg-opt" aria-pressed={missed ? peek === o.letter : c?.letter === o.letter} onClick={() => { if (missed) setPeek(o.letter); else onChoose(d, o.letter, { hints }); }} data-option={o.letter}>
          <b>{o.letter}</b> <span>{o.label}{o.badges.length > 0 && <span className="sg-badges">{o.badges.map((b, i) => <span key={i} className="ui-tag">{b.text}</span>)}</span>}</span></button>))}</div>
      {!recorded && d.hints.length > 0 && <div className="sg-hints">{d.hints.slice(0, hints).map((h) => <p key={h.id} className="sg-hint"><b>Hint {h.id.slice(1)}.</b> {h.text}</p>)}
        {hints < d.hints.length && <button type="button" className="ui-btn ui-btn--quiet" onClick={() => setHints(hints + 1)} data-testid="story-hint">Take a hint (keeps {Math.round(d.hints[hints]!.keep * 100)}% of the merit)</button>}</div>}
      {!recorded && d.note && <p className="ui-meta">{d.note}</p>}
      {shown && (<div className="sg-result" data-testid="story-result" data-letter={shown.letter} data-verdict={shown.fail ? 'costly' : shown.canonical ? 'canonical' : 'neutral'} data-review={missed}>
        <p className="sg-said">{missed ? `Option ${shown.letter} would have been` : `You chose ${shown.letter}`}: {shown.label} <span className="sg-mark">{MARK[shown.fail ? 'costly' : shown.canonical ? 'canonical' : 'neutral']}</span></p><p><b>{shown.result}</b></p><p>{shown.consequence}</p>
        {shown.chips.length > 0 && <p className="sg-chips">{shown.chips.map((x, i) => <span key={i} className="ui-tag">{x}</span>)}</p>}
        <Weight o={shown} c={{ letter: shown.letter, hints: missed ? 0 : c!.hints }} d={d} review={missed} />
        {!missed && <p className="ui-meta">{[c!.changes ? `First choice ${c!.first}, changed ${c!.changes === 1 ? 'once' : `${c!.changes} times`}` : 'First choice', c!.hints ? `${c!.hints} hint${c!.hints === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')}. Tap another option to change it; the first choice is kept.</p>}
        {!missed && shown.canonical && d.lab && <p><a className="ui-btn" href={`#/learn/labs/${encodeURIComponent(d.lab)}`}>{d.lab_label || 'Open the lab'}</a></p>}
      </div>)}
      {missed && !peek && <Weight o={null} c={{ letter: TIMEOUT, hints: 0 }} d={d} review={false} />}
    </section>
  );
}
/** The result card (gate.js showPop): a modal dialog, focus on its first button, Tab moves between its two buttons, Escape or a tap
 *  outside stays where you are. */
function GatePop({ body, go, onClose }: { body: PopBody; go: string; onClose: (move: boolean) => void }) {
  const a = useRef<HTMLButtonElement>(null); const b = useRef<HTMLButtonElement>(null); useEffect(() => { a.current?.focus(); }, [body.title, body.kicker]);
  return <div className="sg-pop" role="dialog" aria-modal="true" aria-labelledby="sg-pop-h" data-testid="story-pop" data-tone={body.tone} onClick={(e) => { if (e.target === e.currentTarget) onClose(false); }}
    onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(false); } else if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === a.current ? b : a).current?.focus(); } }}>
    <div className={`sg-pop__card is-${body.tone}`}><span className="sg-pop__k">{body.kicker}</span><h3 id="sg-pop-h">{body.title}</h3>
      <ul>{body.lines.map((t, i) => <li key={i}>{t}</li>)}</ul>
      <p className="sg-row"><button ref={a} type="button" className="ui-btn ui-btn--primary" data-testid="story-pop-go" onClick={() => onClose(true)}>{go}</button><button ref={b} type="button" className="ui-btn" data-testid="story-pop-stay" onClick={() => onClose(false)}>Stay here</button></p></div>
  </div>;
}
function Echoes({ prev, e }: { prev: string | null; e: ReturnType<typeof echoes> | null }) {
  if (!prev) return <p className="sg-echo" data-testid="story-echo" data-made="0">Your story starts here. Every choice you make is remembered, by you and by the crew.</p>;
  if (!e) return null; const tl = trustLine(e.trust);
  return <section className="sg-echo" data-testid="story-echo" data-made={e.made.length} aria-label={`Previously: your choices in ${prev}`}><h2 className="sg-echo__h">Previously: your choices in {prev}</h2>
    {e.made.length === 0 ? <p>You haven’t made choices in that chapter yet. The story is following the ★ path. Go back and choose, and this page will remember what you did.</p>
      : <><ul>{e.made.map((m) => <li key={m.id} data-verdict={m.verdict}>{m.timedOut ? <>⏱ You ran out of time on “{m.prompt}”, and someone else decided for you.</> : <>{m.verdict === 'canonical' ? '★' : m.verdict === 'costly' ? '✕' : '◦'} You chose {/^["“].*["”]$/.test(m.label.trim()) ? m.label.trim() : `“${m.label}”`}. {m.consequence}</>}</li>)}</ul>
        <p className="ui-meta">Merit carried in: {e.merit > 0 ? `+${e.merit}` : e.merit}{tl ? `. The crew remembers: ${tl}` : ''}</p></>}</section>;
}
