/**
 * SIGNAL · An Empathia Learn Story (#/story is the library; #/story/<chapter id> reads one chapter). The founder's canon, unchanged:
 * the Prologue and all 133 chapters of twelve seasons, fetched one chapter at a time from this demonstration's own files.
 *
 * What the reader does is real and remembered in this browser: decisions gate the story and can fail, hints cost merit, conversations
 * move trust, discoveries are found by looking, and a chapter can be replayed. The canon is a draft and says so: every open review flag
 * is shown where it applies (the package's rule: keep all content; flag rather than block). Nothing here is a credential.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PageProps } from '../registry.types.js';
import { Block, Crumbs, Pick } from '../worlds/kit.js';
import { BANDS, answerTalk, choose, complete, emphasis, emptyChapter, find, load, nextOf, passed, reached, resume, save, seconds, tally,
  type Chapter, type ChapterState, type Clock, type Item, type Outcome, type Progress, type StoryIndex } from './story.js';

type Flags = Record<string, { type: string; title: string; detail?: string }>;
let ixCache: Promise<StoryIndex> | null = null; let flagCache: Promise<Flags> | null = null; let defsReady: Promise<void> | null = null;
const getJson = <T,>(url: string): Promise<T> => fetch(url).then((r) => { if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json() as Promise<T>; });
const loadIndex = () => (ixCache ||= getJson<StoryIndex>('signal/index.json').catch((e) => { ixCache = null; throw e; }));
const loadFlags = () => (flagCache ||= getJson<Flags>('signal/flags.json').catch(() => ({} as Flags)));
/** The shared sprite sheet (figures, props, backgrounds) is first-party art shipped with the build; it is put in the page once so panels can refer to it. */
const loadDefs = () => (defsReady ||= fetch('signal/defs.svg').then((r) => r.text()).then((svg) => { if (document.getElementById('sg-defs')) return; const d = document.createElement('div'); d.id = 'sg-defs'; d.className = 'sg-defs'; d.setAttribute('aria-hidden', 'true'); d.innerHTML = svg; document.body.appendChild(d); }).catch(() => { defsReady = null; }));
function useLoaded<T>(get: () => Promise<T>, key: string): { data: T | null; error: string | null } {
  const [st, set] = useState<{ data: T | null; error: string | null }>({ data: null, error: null });
  useEffect(() => { let live = true; set({ data: null, error: null }); get().then((d) => live && set({ data: d, error: null }), (e: Error) => live && set({ data: null, error: e.message })); return () => { live = false; }; }, [key]);   // eslint-disable-line react-hooks/exhaustive-deps
  return st;
}
const Em = ({ text }: { text: string }) => <>{emphasis(text).map((p, i) => (p.b ? <b key={i}>{p.t}</b> : p.i ? <i key={i}>{p.t}</i> : <span key={i}>{p.t}</span>))}</>;
const Paras = ({ text }: { text: string }) => <>{text.split(/\n{2,}/).map((p, i) => <p key={i}><Em text={p} /></p>)}</>;
const Face = ({ id, pose, expr }: { id: string; pose: string; expr: string }) => <svg className="sg-face" viewBox="36 20 128 128" width="40" height="40" aria-hidden="true"><use href={`#f-${id}-${pose}-${expr}`} width="200" height="320" /></svg>;
const Draft = () => <span className="ui-tag" data-testid="story-draft">Draft · under review</span>;

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
  const t = useMemo(() => tally(items, state), [items, state]); const next = nextOf(ix, id);
  if (ch.error) return <div className="sg" data-testid="story-error"><h1 tabIndex={-1}>{ref.title} did not load</h1><p className="lead">This chapter’s file could not be read ({ch.error}). Your progress is untouched.</p><p><a className="ui-btn ui-btn--primary" href="#/story">Back to the library</a></p></div>;
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
      <div className="sg-flow">
        {items.slice(0, upTo).map((it, i) => { if (it.type === 'panel') panelNo += 1; return <ItemView key={i} it={it} n={i} svg={it.type === 'panel' ? art.data?.panels[panelNo] : undefined} cast={ix.cast} state={state} clock={progress.clock} gated={progress.gates}
          onChoose={(d, letter, meta) => { const r = choose(state, d, letter, meta); set(r.state); setSaid(r.outcome.kind === 'failed' ? `That path fails: ${r.outcome.reason}` : r.outcome.kind === 'passed' ? 'Decision made. The story continues.' : r.outcome.why); return r.outcome; }}
          onTalk={(tid, o) => set(answerTalk(state, tid, o))} onFind={(did) => set(find(state, did))} />; })}
        {ch.data && upTo >= items.length && art.data?.closing.map((c, i) => <figure key={i} className="sg-panel"><div className="sg-art" role="img" aria-label={c.alt} dangerouslySetInnerHTML={{ __html: c.svg }} /></figure>)}
      </div>
      <p className="ui-visually-hidden" role="status" aria-live="polite" data-testid="story-said">{said}</p>
      {ch.data && upTo < items.length && <p className="sg-wait" data-testid="story-waiting">The story is waiting for your decision. {items.length - upTo} more moments follow.</p>}
      {ch.data && finished && upTo >= items.length && (
        <Block title="Where this chapter leaves you" testId="story-summary">
          <ul className="sg-sum">
            {t.decisions > 0 && <li><b>{t.made} of {t.decisions}</b> decisions made, {t.firstTry} at the first attempt{t.failedAttempts ? `, ${t.failedAttempts} failed attempt${t.failedAttempts === 1 ? '' : 's'}` : ''}{t.hints ? `, ${t.hints} hint${t.hints === 1 ? '' : 's'} used` : ''}{t.timedOut ? `, ${t.timedOut} past the clock` : ''}</li>}
            {t.decisions > 0 && <li>Merit from this chapter’s choices: <b data-testid="story-merit">{t.merit > 0 ? `+${t.merit}` : t.merit}</b></li>}
            {Object.keys(t.trust).length > 0 && <li>Trust moved: {Object.entries(t.trust).filter(([, v]) => v !== 0).map(([k, v]) => `${k} ${v > 0 ? `+${v}` : v}`).join(', ') || 'nowhere, on balance'}</li>}
            {t.discoveries > 0 && <li><b>{t.found} of {t.discoveries}</b> discoveries found</li>}
          </ul>
          <p className="ui-meta">Counted from the story’s own weights for the choices made in this browser. It is practice in a story, not an assessment of a person.</p>
        </Block>)}
      <p className="sg-acts">
        {next && finished && <a className="ui-btn ui-btn--primary" href={`#/story/${next.id}`} data-testid="story-next">Next: {next.title}</a>}
        <a className="ui-btn" href="#/story">Library</a>
        {(Object.keys(state.choices).length > 0 || state.found.length > 0 || Object.keys(state.talks).length > 0) && <button type="button" className="ui-btn ui-btn--quiet" data-testid="story-replay" onClick={() => { set(emptyChapter()); setSaid('Chapter reset. Your earlier choices in it are forgotten.'); }}>Replay this chapter</button>}
      </p>
    </article>
  );
}

interface ViewProps { it: Item; n: number; svg?: string; cast: Record<string, string>; state: ChapterState; clock: Clock; gated: boolean; onChoose: (d: Extract<Item, { type: 'decision' }>, letter: string, meta: { hints: number; timedOut: boolean }) => Outcome; onTalk: (id: string, o: number) => void; onFind: (id: string) => void }
const MOUNT_WORD: Record<string, string> = { lesson: 'Lesson', lab: 'Lab', quiz: 'Quiz', drill: 'Drill', incident: 'Live incident', review: 'Season review', boss: 'Boss level', meltdown: 'Meltdown' };
function ItemView(p: ViewProps): JSX.Element | null {
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

function Decision({ d, state, clock, onChoose }: ViewProps & { d: Extract<Item, { type: 'decision' }> }) {
  const c = state.choices[d.id]; const done = passed(state, d.id); const total = seconds(d, clock); const [left, setLeft] = useState<number | null>(total); const [hints, setHints] = useState(c?.hints || 0); const [last, setLast] = useState<Outcome | null>(null);
  const timedOut = useRef(!!c?.timedOut); const ref = useRef<HTMLElement>(null);
  useEffect(() => { setLeft(total); }, [total]);
  useEffect(() => { if (done || left === null || left <= 0) return undefined; const t = setTimeout(() => setLeft((x) => (x === null ? x : x - 1)), 1000); return () => clearTimeout(t); }, [left, done]);
  if (left === 0) timedOut.current = true;
  const chosen = done ? d.options.find((o) => o.letter === c!.letter)! : null;
  return (
    <section className="sg-dec" data-item="decision" data-decision={d.id} data-done={done} ref={ref} aria-labelledby={`${d.id}-h`}>
      <p className="sg-dec__k">Decision{d.clock ? ` · ${d.clock}` : ''}</p>
      <h3 id={`${d.id}-h`}>{d.prompt}</h3>
      <p>{d.happening}</p>
      <div className="sg-facts"><div><h4>Known</h4><ul>{d.known.map((k, i) => <li key={i}>{k}</li>)}</ul></div><div><h4>Not known</h4><ul>{d.unknown.map((k, i) => <li key={i}>{k}</li>)}</ul></div></div>
      <p className="sg-risk"><b>At risk.</b> {d.risk}</p>
      {!done && total !== null && <p className="sg-clock" data-testid="story-clock" data-left={left ?? ''}>{left !== null && left > 0 ? <>Time to decide: <b>{left}</b> s</> : <span data-testid="story-timeout">{(d.timeout || ['The clock has run out.']).join(' ')} You can still choose.</span>}</p>}
      {!done && (<>
        <div className="sg-opts" role="group" aria-label="Options">{d.options.map((o) => { const failed = c?.failed.includes(o.letter); return (
          <button key={o.letter} type="button" className="sg-opt" disabled={failed} onClick={() => setLast(onChoose(d, o.letter, { hints, timedOut: timedOut.current }))} data-option={o.letter}>
            <b>{o.letter}</b> <span>{o.label}{o.badges.length > 0 && <span className="sg-badges">{o.badges.map((b, i) => <span key={i} className="ui-tag">{b.text}</span>)}</span>}{failed && <span className="ui-meta"> Tried: it fails</span>}</span></button>); })}</div>
        {last?.kind === 'failed' && <div className="sg-fail" role="alert" data-testid="story-fail"><p><b>That path fails.</b> {last.reason}</p><p>{last.option.result} {last.option.consequence}</p><p className="ui-meta">Choose again. The failed attempt is remembered.</p></div>}
        {d.hints.length > 0 && <div className="sg-hints">{d.hints.slice(0, hints).map((h) => <p key={h.id} className="sg-hint"><b>Hint {h.id.slice(1)}.</b> {h.text}</p>)}
          {hints < d.hints.length && <button type="button" className="ui-btn ui-btn--quiet" onClick={() => setHints(hints + 1)} data-testid="story-hint">Take a hint (keeps {Math.round(d.hints[hints]!.keep * 100)}% of the merit)</button>}</div>}
        {d.note && <p className="ui-meta">{d.note}</p>}
      </>)}
      {chosen && (<div className="sg-result" data-testid="story-result" data-letter={chosen.letter}>
        <p className="sg-said">You chose {chosen.letter}: {chosen.label}</p><p><b>{chosen.result}</b></p><p>{chosen.consequence}</p>
        {chosen.chips.length > 0 && <p className="sg-chips">{chosen.chips.map((x, i) => <span key={i} className="ui-tag">{x}</span>)}</p>}
        <p className="ui-meta">{[c!.tries > 1 ? `${c!.tries} attempts` : 'First attempt', c!.hints ? `${c!.hints} hint${c!.hints === 1 ? '' : 's'}` : null, c!.timedOut ? 'past the clock' : null].filter(Boolean).join(' · ')}</p>
        {d.lab && <p><a className="ui-btn" href={`#/learn/labs/${encodeURIComponent(d.lab)}`}>{d.lab_label || 'Open the lab'}</a></p>}
      </div>)}
    </section>
  );
}
