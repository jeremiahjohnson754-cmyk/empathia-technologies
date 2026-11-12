/**
 * SIGNAL · An Empathia Learn Story (#/story is the library; #/story/<chapter id> reads one chapter). The founder's canon, unchanged:
 * the Prologue and all 133 chapters of twelve seasons, fetched one chapter at a time from this demonstration's own files.
 *
 * What the reader does is real and remembered in this browser: a decision gates the story until a choice is recorded, and every choice
 * counts, a costly one too (story.ts states the rules); hints cost merit; the previous chapter's choices open the next; conversations
 * move trust, discoveries are found by looking, and a chapter can be replayed. The canon is a draft and says so: every open review flag
 * is shown where it applies (the package's rule: keep all content; flag rather than block). Nothing here is a credential.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PageProps } from '../registry.types.js';
import { Block, Crumbs, Pick } from '../worlds/kit.js';
import { BANDS, SEVERITY, TIMEOUT, answerTalk, chapterVerdict, choose, complete, echoes, emphasis, emptyChapter, find, load, nextOf, passed, prevOf, reached, replayDecision, resume, save, seconds, tally, timeOut, trustLine, weightLine, weightOf,
  type Chapter, type ChapterState, type Clock, type Item, type Option, type Outcome, type Progress, type StoryIndex, type Verdict } from './story.js';

type Flags = Record<string, { type: string; title: string; detail?: string }>;
let ixCache: Promise<StoryIndex> | null = null; let flagCache: Promise<Flags> | null = null; let defsReady: Promise<void> | null = null;
export const getJson = <T,>(url: string): Promise<T> => fetch(url).then((r) => { if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json() as Promise<T>; });
/** A failed read while the browser reports no connection: the file is simply not on this device. */
export const notKept = () => typeof navigator !== 'undefined' && navigator.onLine === false;
export const loadIndex = () => (ixCache ||= getJson<StoryIndex>('signal/index.json').catch((e) => { ixCache = null; throw e; }));
const loadFlags = () => (flagCache ||= getJson<Flags>('signal/flags.json').catch(() => ({} as Flags)));
/** The shared sprite sheet (figures, props, backgrounds) is first-party art shipped with the build; it is put in the page once so panels can refer to it. */
export const loadDefs = () => (defsReady ||= fetch('signal/defs.svg').then((r) => r.text()).then((svg) => { if (document.getElementById('sg-defs')) return; const d = document.createElement('div'); d.id = 'sg-defs'; d.className = 'sg-defs'; d.setAttribute('aria-hidden', 'true'); d.innerHTML = svg; document.body.appendChild(d); }).catch(() => { defsReady = null; }));
export function useLoaded<T>(get: () => Promise<T>, key: string): { data: T | null; error: string | null } {
  const [st, set] = useState<{ data: T | null; error: string | null }>({ data: null, error: null });
  useEffect(() => { let live = true; set({ data: null, error: null }); get().then((d) => live && set({ data: d, error: null }), (e: Error) => live && set({ data: null, error: e.message })); return () => { live = false; }; }, [key]);   // eslint-disable-line react-hooks/exhaustive-deps
  return st;
}
const Em = ({ text }: { text: string }) => <>{emphasis(text).map((p, i) => (p.b ? <b key={i}>{p.t}</b> : p.i ? <i key={i}>{p.t}</i> : <span key={i}>{p.t}</span>))}</>;
const Paras = ({ text }: { text: string }) => <>{text.split(/\n{2,}/).map((p, i) => <p key={i}><Em text={p} /></p>)}</>;
export const Face = ({ id, pose, expr }: { id: string; pose: string; expr: string }) => <svg className="sg-face" viewBox="36 20 128 128" width="40" height="40" aria-hidden="true"><use href={`#f-${id}-${pose}-${expr}`} width="200" height="320" /></svg>;
export const Draft = () => <span className="ui-tag" data-testid="story-draft">Draft · under review</span>;

export default function StoryPage({ params }: PageProps) {
  const ix = useLoaded(loadIndex, 'ix'); const [progress, setProgress] = useState<Progress>(load);
  const commit = (p: Progress) => { setProgress(p); save(p); };
  if (ix.error) return <div className="sg" data-testid="story-error"><h1 tabIndex={-1}>The story did not load</h1><p className="lead">The story files could not be read ({ix.error}). Your progress is untouched.</p><p><a className="ui-btn ui-btn--primary" href="#/story" onClick={() => location.reload()}>Try again</a></p></div>;
  if (!ix.data) return <div className="sg" data-testid="story-loading" aria-busy="true"><h1 tabIndex={-1}>SIGNAL</h1><p className="lead">Opening the story…</p></div>;
  const id = params.chapter; const ref = id ? ix.data.chapters.find((c) => c.id === id) : null;
  if (id && !ref) return <div className="sg" data-testid="story-unknown"><h1 tabIndex={-1}>SIGNAL has no chapter at this address</h1><p><a className="ui-btn ui-btn--primary" href="#/story">Open the library</a></p></div>;
  return ref ? <Reader key={ref.id} ix={ix.data} id={ref.id} progress={progress} commit={commit} /> : <Library ix={ix.data} progress={progress} commit={commit} />;
}

function Library({ ix, progress, commit }: { ix: StoryIndex; progress: Progress; commit: (p: Progress) => void }) {
  const next = resume(ix, progress); const started = Object.keys(progress.chapters).length > 0; const done = (s: number) => ix.chapters.filter((c) => c.season === s && progress.chapters[c.id]?.done).length;
  const [open, setOpen] = useState<number>(next.season); const st = ix.stats;
  const seasonChapters = ix.chapters.filter((c) => c.season === open);
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
        <ol className="sg-chapters">{seasonChapters.map((c) => { const s = progress.chapters[c.id]; return (
          <li key={c.id}><a className="sg-chapter" href={`#/story/${c.id}`} data-chapter={c.id}>
            <span className="sg-chapter__k">{c.kicker}</span><b>{c.title}</b><span className="sg-chapter__s">{c.sub}</span>
            <span className="ui-meta">{[`${c.panels} panels`, c.decisions ? `${c.decisions} decision${c.decisions === 1 ? '' : 's'}` : null, c.level, c.boss ? 'Boss level' : null, c.meltdown ? 'Meltdown' : null, s?.done ? 'Read' : s ? 'In progress' : null].filter(Boolean).join(' · ')}</span>
          </a></li>); })}</ol>
      </Block>
    </div>
  );
}

function Reader({ ix, id, progress, commit }: { ix: StoryIndex; id: string; progress: Progress; commit: (p: Progress) => void }) {
  const ch = useLoaded(() => getJson<Chapter>(`signal/story/${id}.json`), id); const art = useLoaded(() => Promise.all([getJson<{ panels: string[]; closing: { alt: string; svg: string }[] }>(`signal/art/${id}.json`), loadDefs()]).then((r) => r[0]), `art-${id}`);
  const flags = useLoaded(loadFlags, 'flags'); const ref = ix.chapters.find((c) => c.id === id)!; const state = progress.chapters[id] || emptyChapter(); const [said, setSaid] = useState('');
  const set = (s: ChapterState, extra: Partial<Progress> = {}) => commit({ ...progress, ...extra, last: id, chapters: { ...progress.chapters, [id]: s } });
  const items = ch.data?.items || []; const upTo = reached(items, state, progress.gates); const finished = ch.data ? complete(items, state) : false;
  useEffect(() => { if (ch.data && finished && !state.done) set({ ...state, done: true }); });   // a chapter is read once every decision in it is made
  const t = useMemo(() => tally(items, state), [items, state]); const next = nextOf(ix, id); const prev = prevOf(ix, id);
  const prevCh = useLoaded(() => (prev ? getJson<Chapter>(`signal/story/${prev.id}.json`) : Promise.resolve(null)), `prev-${id}`);
  const before = useMemo(() => (prev && prevCh.data ? echoes(prevCh.data.items, progress.chapters[prev.id]) : null), [prev, prevCh.data, progress.chapters]);
  const said1 = (o: Outcome) => (o.kind === 'refused' ? o.why : o.verdict === 'costly' ? `Recorded: a costly call. ${o.option.fail || ''} The story goes on with it.` : o.verdict === 'canonical' ? 'Recorded: the professional call. The story continues.' : 'Recorded: it works, not the best. The story continues.');
  if (ch.error) return <div className="sg" data-testid="story-error"><h1 tabIndex={-1}>{ref.title} did not load</h1>{notKept() ? <p className="lead" data-testid="story-not-kept">You are offline and this chapter is not kept on this device. Chapters you have already opened, and seasons kept from <a href="#/offline">Offline and this device</a>, open without a connection. Your progress is untouched.</p> : <p className="lead">This chapter’s file could not be read ({ch.error}). Your progress is untouched.</p>}<p><a className="ui-btn ui-btn--primary" href="#/story">Back to the library</a></p></div>;
  let panelNo = -1;
  return (
    <article className="sg sg-read" data-testid="story-reader" data-chapter={id} data-reached={upTo} data-items={items.length} aria-busy={!ch.data}>
      <Crumbs items={[{ label: 'Learn', href: '#/learn' }, { label: 'SIGNAL', href: '#/story' }, { label: ref.season ? `Season ${ref.season}` : 'Prologue', href: '#/story' }, { label: ref.title }]} />
      <p className="kicker">{ref.kicker} <Draft /></p>
      <h1 tabIndex={-1}>{ref.title}</h1>
      {ref.sub && <p className="lead">{ref.sub}</p>}
      <div className="sg-bar">
        <Pick label="Decision clock" value={progress.clock} options={[['on', 'Clock on'], ['extended', 'Double time'], ['off', 'No clock']] as const} onChange={(c: Clock) => commit({ ...progress, clock: c })} />
        <label className="sg-check"><input type="checkbox" checked={!progress.gates} onChange={(e) => commit({ ...progress, gates: !e.target.checked })} data-testid="story-gates" /> Show the whole chapter without waiting for decisions</label>
      </div>
      {ch.data && ch.data.chapter.flags.length > 0 && (
        <details className="sg-flags" data-testid="story-flags"><summary>{ch.data.chapter.flags.length} review point{ch.data.chapter.flags.length === 1 ? '' : 's'} open on this chapter</summary>
          <ul>{ch.data.chapter.flags.map((f) => <li key={f}><b>{f}</b> {flags.data?.[f] ? `· ${flags.data[f]!.type.toLowerCase()}: ${flags.data[f]!.title}` : ''}</li>)}</ul></details>)}
      {!ch.data && <p data-testid="story-loading">Opening the chapter…</p>}
      {ch.data && <Echoes prev={prev?.title || null} e={before} />}
      <div className="sg-flow">
        {items.slice(0, upTo).map((it, i) => { if (it.type === 'panel') panelNo += 1; return <ItemView key={i} it={it} n={i} svg={it.type === 'panel' ? art.data?.panels[panelNo] : undefined} cast={ix.cast} state={state} clock={progress.clock} gated={progress.gates}
          onChoose={(d, letter, meta) => { const r = choose(state, d, letter, meta); set(r.state); setSaid(said1(r.outcome)); return r.outcome; }}
          onTimeout={(d, h) => { set(timeOut(state, d, h)); setSaid('Time ran out. The decision is recorded as missed. Tap an option to see what it would have done, or replay it to make it count.'); }}
          onReplay={(did) => { set(replayDecision(state, did)); setSaid('The decision is open again and the clock restarts.'); }}
          onTalk={(tid, o) => set(answerTalk(state, tid, o))} onFind={(did) => set(find(state, did))} />; })}
        {ch.data && upTo >= items.length && art.data?.closing.map((c, i) => <figure key={i} className="sg-panel"><div className="sg-art" role="img" aria-label={c.alt} dangerouslySetInnerHTML={{ __html: c.svg }} /></figure>)}
      </div>
      <p className="ui-visually-hidden" role="status" aria-live="polite" data-testid="story-said">{said}</p>
      {ch.data && upTo < items.length && <p className="sg-wait" data-testid="story-waiting">The story is waiting for your decision. {items.length - upTo} more moments follow.</p>}
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
    </article>
  );
}

export interface ViewProps { it: Item; n: number; svg?: string; cast: Record<string, string>; state: ChapterState; clock: Clock; gated: boolean; onChoose: (d: Extract<Item, { type: 'decision' }>, letter: string, meta: { hints: number }) => Outcome; onTimeout?: (d: Extract<Item, { type: 'decision' }>, hints: number) => void; onReplay?: (id: string) => void; onTalk: (id: string, o: number) => void; onFind: (id: string) => void }
const MOUNT_WORD: Record<string, string> = { lesson: 'Lesson', lab: 'Lab', quiz: 'Quiz', drill: 'Drill', incident: 'Live incident', review: 'Season review', boss: 'Boss level', meltdown: 'Meltdown' };
export function ItemView(p: ViewProps): JSX.Element | null {
  const { it, cast } = p; const name = (id: string) => cast[id] || id;
  switch (it.type) {
    case 'heading': return <header className="sg-h" data-item="heading"><h2>{it.text}</h2>{it.sub && <p>{it.sub}</p>}</header>;
    case 'panel': return (
      <figure className={`sg-panel${it.kind === 'flashback' ? ' is-flashback' : ''}`} data-item="panel">
        {it.tab && <p className="sg-tab">{it.tab}</p>}
        <div className="sg-art" role="img" aria-label={it.alt} {...(p.svg ? { dangerouslySetInnerHTML: { __html: p.svg } } : {})} />
        <figcaption>
          {it.narration.map((n, i) => <p key={i} className="sg-narr">{n.replace(/\s*\[COMIC\]\s*$/, '')}</p>)}
          {it.bubbles.length > 0 && <ul className="sg-bubbles">{it.bubbles.map((b, i) => <li key={i} className="sg-bubble" data-side={b.side} data-kind={b.kind}><b>{b.who}{b.kind === 'radio' ? ' (radio)' : b.kind === 'phone' ? ' (phone)' : b.kind === 'whisper' ? ' (whisper)' : ''}</b> <Em text={b.text} /></li>)}</ul>}
          {it.caption && <p className="sg-cap">{it.caption}</p>}
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
        <ul>{it.lines.map((l, i) => <li key={i}><Face id={l.who} pose={l.pose} expr={l.expr} /><span><b>{name(l.who)}</b> <Em text={l.text} /></span></li>)}</ul></section>);
    case 'discovery': { const found = p.state.found.includes(it.id); return (
      <section className="sg-disc" data-item="discovery" data-found={found}>
        {found ? <><p className="sg-disc__k">Discovery · {it.thread}</p><h3>{it.title}</h3><Paras text={it.body} /></>
          : <button type="button" className="ui-btn" onClick={() => p.onFind(it.id)} data-discovery={it.id}>Look closer: {it.teaser}</button>}
      </section>); }
    case 'twist': return <section className="sg-twist" data-item="twist"><p className="sg-twist__k">Twist</p><h3>{it.title}</h3><Paras text={it.body} />{it.label && <p className="ui-meta">{it.label}</p>}</section>;
    case 'history': return <aside className="sg-hist" data-item="history"><p className="sg-hist__k">Then and now{it.when ? ` · ${it.when}` : ''}</p><h3>{it.title}</h3><Paras text={it.body} /><p className="ui-meta">Under review: {it.flag}. Dates and attributions are the author’s draft until that review closes.</p></aside>;
    case 'mount': return (
      <aside className="sg-mount" data-item="mount" data-kind={it.kind}>
        <span className="ui-tag">{MOUNT_WORD[it.kind] || it.kind}{it.gate === 'hard' ? ' · required in the product' : ''}</span>
        <span>{it.label ? <Em text={it.label} /> : <code>{it.id}</code>}</span>
        {it.kind === 'lab' ? <a className="ui-btn" href={`#/learn/labs/${encodeURIComponent(it.id)}`}>Open the lab</a> : it.kind === 'lesson' || it.kind === 'quiz' ? <a className="ui-btn" href="#/learn">Open Learn</a> : <span className="ui-meta">Not yet playable from the story in this build.</span>}
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
function Decision({ d, state, clock, onChoose, onTimeout, onReplay }: ViewProps & { d: Extract<Item, { type: 'decision' }> }) {
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
      <p>{d.happening}</p>
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
function Echoes({ prev, e }: { prev: string | null; e: ReturnType<typeof echoes> | null }) {
  if (!prev) return <p className="sg-echo" data-testid="story-echo" data-made="0">Your story starts here. Every choice you make is remembered, by you and by the crew.</p>;
  if (!e) return null; const tl = trustLine(e.trust);
  return <section className="sg-echo" data-testid="story-echo" data-made={e.made.length} aria-label={`Previously: your choices in ${prev}`}><h2 className="sg-echo__h">Previously: your choices in {prev}</h2>
    {e.made.length === 0 ? <p>You haven’t made choices in that chapter yet. The story is following the ★ path. Go back and choose, and this page will remember what you did.</p>
      : <><ul>{e.made.map((m) => <li key={m.id} data-verdict={m.verdict}>{m.timedOut ? <>⏱ You ran out of time on “{m.prompt}”, and someone else decided for you.</> : <>{m.verdict === 'canonical' ? '★' : m.verdict === 'costly' ? '✕' : '◦'} You chose {/^["“].*["”]$/.test(m.label.trim()) ? m.label.trim() : `“${m.label}”`}. {m.consequence}</>}</li>)}</ul>
        <p className="ui-meta">Merit carried in: {e.merit > 0 ? `+${e.merit}` : e.merit}{tl ? `. The crew remembers: ${tl}` : ''}</p></>}</section>;
}
