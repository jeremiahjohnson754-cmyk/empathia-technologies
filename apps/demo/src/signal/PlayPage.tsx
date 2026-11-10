/**
 * SIGNAL played as scenes (#/play/<chapter id>): the same canon chapter as #/story/<id>, performed. Each panel is a shot with a camera
 * move and its lines timed as captions; conversations are close shots; decisions and replies appear inside the frame and hold the
 * scene; the canon's discoveries are hidden in the picture to be found and taken; notes, quests and twists are cards between shots.
 * Staging comes from scene.ts; every word is the canon's. There is no recorded voice or generated video yet, and the page says so.
 * Choices, trust and what is found are the same record the reader uses, so the two ways of reading never disagree.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PageProps } from '../registry.types.js';
import { Block, Crumbs } from '../worlds/kit.js';
import { answerTalk, choose, emptyChapter, find, load, nextOf, save, tally, type Chapter, type ChapterState, type Item, type Progress, type StoryIndex } from './story.js';
import { buildScene, frontier, hotspotsAt, lineAt, mayPass, recap, type Shot } from './scene.js';
import { Draft, Face, ItemView, getJson, loadDefs, loadIndex, useLoaded } from './StoryPage.js';

const POS = 'empathia.signal.play.v1';
const posOf = (id: string): number => { try { return Number((JSON.parse(localStorage.getItem(POS) || '{}') as Record<string, number>)[id]) || 0; } catch { return 0; } };
const keepPos = (id: string, n: number) => { try { const all = JSON.parse(localStorage.getItem(POS) || '{}') as Record<string, number>; all[id] = n; localStorage.setItem(POS, JSON.stringify(all)); } catch { /* playing still works without storage */ } };
const KIND_WORD: Record<string, string> = { radio: ' (radio)', phone: ' (phone)', whisper: ' (whisper)' };

export default function PlayPage({ params }: PageProps) {
  const ix = useLoaded(loadIndex, 'ix'); const id = params.chapter || '';
  if (ix.error) return <div className="sg" data-testid="play-error"><h1 tabIndex={-1}>The story did not load</h1><p className="lead">The story files could not be read ({ix.error}).</p><p><a className="ui-btn ui-btn--primary" href="#/story">Open the library</a></p></div>;
  if (!ix.data) return <div className="sg" aria-busy="true"><h1 tabIndex={-1}>SIGNAL</h1><p className="lead">Opening the scene…</p></div>;
  if (!ix.data.chapters.some((c) => c.id === id)) return <div className="sg" data-testid="story-unknown"><h1 tabIndex={-1}>SIGNAL has no chapter at this address</h1><p><a className="ui-btn ui-btn--primary" href="#/story">Open the library</a></p></div>;
  return <Player key={id} ix={ix.data} id={id} />;
}

function Player({ ix, id }: { ix: StoryIndex; id: string }) {
  const ch = useLoaded(() => getJson<Chapter>(`signal/story/${id}.json`), id); const art = useLoaded(() => Promise.all([getJson<{ panels: string[] }>(`signal/art/${id}.json`), loadDefs()]).then((r) => r[0]), `art-${id}`);
  const [progress, setProgress] = useState<Progress>(load); const state = progress.chapters[id] || emptyChapter(); const ref = ix.chapters.find((c) => c.id === id)!;
  const set = (s: ChapterState) => { const p = { ...progress, last: id, chapters: { ...progress.chapters, [id]: s } }; setProgress(p); save(p); };
  const scene = useMemo(() => (ch.data ? buildScene(ch.data) : null), [ch.data]); const items: Item[] = ch.data?.items || [];
  const [n, setN] = useState(() => posOf(id)); const [t, setT] = useState(0); const [playing, setPlaying] = useState(true); const [open, setOpen] = useState<string | null>(null); const [said, setSaid] = useState(''); const [ended, setEnded] = useState(false);
  const shot: Shot | null = scene ? scene.shots[Math.min(n, scene.shots.length - 1)]! : null; const limit = scene ? frontier(scene, state) : 0; const staged = shot && (shot.kind === 'live' || shot.kind === 'close');
  const go = (k: number) => { if (!scene) return; const to = Math.max(0, Math.min(k, limit, scene.shots.length - 1)); setN(to); setT(0); setOpen(null); setEnded(false); keepPos(id, to); };
  const last = useRef(0);
  useEffect(() => { if (!staged || !playing) return undefined; last.current = performance.now(); const h = setInterval(() => { const now = performance.now(); const d = (now - last.current) / 1000; last.current = now; setT((x) => x + d); }, 100); return () => clearInterval(h); }, [n, playing, staged]);
  useEffect(() => { if (!scene || !shot || !staged || t < shot.dur) return; if (n >= scene.shots.length - 1) { setPlaying(false); setEnded(true); if (!state.done) set({ ...state, done: true }); } else if (hotspotsAt(shot, shot.dur).some((h) => !state.found.includes(h.discovery)) && !ended) { setPlaying(false); setEnded(true); setSaid('The shot is held: something here has not been looked at. Find it, or move on.'); } else go(n + 1); });   // eslint-disable-line react-hooks/exhaustive-deps
  if (ch.error) return <div className="sg" data-testid="play-error"><h1 tabIndex={-1}>{ref.title} did not load</h1><p><a className="ui-btn ui-btn--primary" href="#/story">Open the library</a></p></div>;
  if (!scene || !shot) return <div className="sg" aria-busy="true"><h1 tabIndex={-1}>{ref.title}</h1><p className="lead" data-testid="play-loading">Opening the scene…</p></div>;
  const line = lineAt(shot, t); const spots = staged ? hotspotsAt(shot, Math.min(t, shot.dur)) : []; const svg = art.data?.panels[shot.panel]; const r = recap(scene, state); const finished = n >= scene.shots.length - 1 && mayPass(shot, state) && (!staged || ended);
  const disc = open ? (items.find((x) => x.type === 'discovery' && x.id === open) as Extract<Item, { type: 'discovery' }> | undefined) : undefined; const next = nextOf(ix, id); const tl = tally(items, state);
  return (
    <div className="sg pl" data-testid="play" data-chapter={id} data-shot={n} data-shots={scene.shots.length} data-kind={shot.kind} data-frontier={limit}>
      <Crumbs items={[{ label: 'Learn', href: '#/learn' }, { label: 'SIGNAL', href: '#/story' }, { label: ref.title, href: `#/story/${id}` }, { label: 'Played' }]} />
      <p className="kicker">{ref.kicker} · played as scenes <Draft /></p>
      <h1 tabIndex={-1}>{ref.title}</h1>
      <div className={`pl-stage${shot.kind === 'live' && shot.flashback ? ' is-flashback' : ''}`} data-testid="play-stage" data-camera={shot.kind === 'live' ? shot.camera : 'hold'} data-playing={playing && !!staged}>
        <div key={`${n}`} className="pl-art" role="img" aria-label={shot.kind === 'live' ? shot.alt : 'The scene, held behind the conversation'} style={{ animationDuration: `${staged ? shot.dur : 8}s` }} {...(svg ? { dangerouslySetInnerHTML: { __html: svg } } : {})} />
        {shot.kind === 'live' && shot.tab && <p className="pl-tab">{shot.tab}</p>}
        {shot.kind === 'close' && <div className="pl-close">{shot.where && <p className="pl-where">{shot.where}</p>}{line?.who && <Face id={line.who} pose={line.pose || 'N'} expr={line.expr || 'talk'} />}</div>}
        {spots.map((h) => { const got = state.found.includes(h.discovery); return <button key={h.id} type="button" className="pl-spot" data-found={got} data-hotspot={h.discovery} style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%`, width: `${h.w * 100}%`, height: `${h.h * 100}%` }} aria-label={got ? `Found: ${h.label}` : `Look closer: ${h.label}`} onClick={() => { if (!got) { set(find(state, h.discovery)); setSaid(`Found: ${h.label}.`); } setOpen(h.discovery); setPlaying(false); }}><span className="pl-spot__l">{h.label}</span></button>; })}
        {staged && <p className="pl-sub" data-testid="play-line" aria-live="off">{line ? <><b>{line.who ? `${ix.cast[line.who] || line.who}${KIND_WORD[line.kind] || ''}` : line.kind === 'caption' ? '' : 'Narrator'}</b> {line.text}</> : ''}</p>}
        {!staged && <div className="pl-over" data-testid="play-over">
          {shot.kind === 'card' && <div className="pl-cards">{shot.cards.map((k) => <ItemView key={k} it={items[k]!} n={k} cast={ix.cast} state={state} clock={progress.clock} gated onChoose={() => ({ kind: 'refused', why: '' })} onTalk={() => undefined} onFind={() => undefined} />)}</div>}
          {(shot.kind === 'choice' || shot.kind === 'reply') && <ItemView it={items[shot.item]!} n={shot.item} cast={ix.cast} state={state} clock={progress.clock} gated
            onChoose={(d, letter, meta) => { const res = choose(state, d, letter, meta); set(res.state); setSaid(res.outcome.kind === 'failed' ? `That path fails: ${res.outcome.reason}` : res.outcome.kind === 'passed' ? 'Decision made.' : res.outcome.why); return res.outcome; }}
            onTalk={(tid, o) => set(answerTalk(state, tid, o))} onFind={() => undefined} />}
          {mayPass(shot, state) && n < scene.shots.length - 1 && <p><button type="button" className="ui-btn ui-btn--primary" data-testid="play-continue" onClick={() => go(n + 1)}>Continue</button></p>}
        </div>}
      </div>
      <div className="pl-bar" role="group" aria-label="Scene controls">
        <button type="button" className="ui-btn" onClick={() => go(n - 1)} disabled={n === 0} data-testid="play-back">Back a shot</button>
        {staged && <button type="button" className="ui-btn ui-btn--primary" onClick={() => { if (ended && t >= shot.dur) { setT(0); setEnded(false); } setPlaying(!playing); }} data-testid="play-toggle" aria-pressed={playing}>{playing ? 'Pause' : t >= shot.dur ? 'Play the shot again' : 'Play'}</button>}
        <button type="button" className="ui-btn" onClick={() => go(n + 1)} disabled={n >= limit || n >= scene.shots.length - 1} data-testid="play-next">Next shot</button>
        <span className="ui-meta" data-testid="play-where">Shot {n + 1} of {scene.shots.length}{staged ? ` · ${Math.min(Math.floor(t), Math.floor(shot.dur))} of ${Math.round(shot.dur)} s` : ''} · about {r.minutes} min of scenes</span>
      </div>
      <p className="ui-visually-hidden" role="status" aria-live="polite" data-testid="play-said">{said}</p>
      {disc && <Block title={disc.title} sub={`Discovery · ${disc.thread}`} testId="play-discovery">{disc.body.split(/\n{2,}/).map((p, i) => <p key={i}>{p.replace(/\*/g, '')}</p>)}<p><button type="button" className="ui-btn" onClick={() => { setOpen(null); setPlaying(true); }}>Back to the scene</button></p></Block>}
      {staged && shot.lines.length > 0 && <details className="sg-flags pl-script"><summary>The words of this shot</summary><ol>{shot.lines.map((l, i) => <li key={i}><b>{l.who ? ix.cast[l.who] || l.who : l.kind === 'caption' ? 'Caption' : 'Narrator'}</b> {l.text}</li>)}</ol>{spots.length > 0 && <p>In this shot: {spots.map((h) => <button key={h.id} type="button" className="ui-btn ui-btn--quiet" data-list-hotspot={h.discovery} onClick={() => { if (!state.found.includes(h.discovery)) set(find(state, h.discovery)); setOpen(h.discovery); setPlaying(false); }}>{h.label}</button>)}</p>}</details>}
      <Block title="Carried" sub={`${r.found} of ${r.hidden} found in this chapter`} testId="play-carried">
        {state.found.length === 0 ? <p>Nothing yet. Some shots hide things worth a closer look: move over the picture, or open “The words of this shot”.</p> : <ul className="pl-inv">{state.found.map((f) => { const d = items.find((x) => x.type === 'discovery' && x.id === f) as Extract<Item, { type: 'discovery' }> | undefined; return d ? <li key={f}><button type="button" className="ui-btn" onClick={() => setOpen(f)} data-carried={f}>{d.title}</button></li> : null; })}</ul>}
      </Block>
      {finished && <Block title="End of the chapter" testId="play-recap">
        <ul className="sg-sum"><li><b>{tl.made} of {tl.decisions}</b> decisions made{tl.failedAttempts ? `, ${tl.failedAttempts} failed attempt${tl.failedAttempts === 1 ? '' : 's'}` : ''}</li><li><b>{r.found} of {r.hidden}</b> things found{r.missed.length ? `. Walked past: ${r.missed.join('; ')}` : ''}</li></ul>
        <p className="sg-acts">{next && <a className="ui-btn ui-btn--primary" href={`#/play/${next.id}`} data-testid="play-nextchapter">Play the next chapter: {next.title}</a>}<button type="button" className="ui-btn" onClick={() => go(0)}>Play it again from the start</button></p>
      </Block>}
      <p className="sg-acts"><a className="ui-btn" href={`#/story/${id}`}>Read this chapter as panels</a><a className="ui-btn" href="#/story">Library</a></p>
      <p className="ui-meta">Staged from the author’s draft: pictures, words, choices and discoveries are the canon’s; the camera moves and timings are added. There is no recorded voice or generated video in this build yet. Reduced-motion settings stop the camera.</p>
    </div>
  );
}
