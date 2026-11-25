/**
 * SIGNAL Story Director — a chapter as an interactive film (#/film/<chapter id>). See director.ts for the model and its rules.
 *
 * The viewer starts it (with or without sound: nothing sounds before that click). Shots play in canon order: the chapter's generated
 * footage, its art under a slow camera, its lines as subtitles — spoken by the recorded takes where they exist — act cards between acts.
 * A decision stops the film inside the frame; the choice is recorded in the story engine (the same record as the written story), its
 * canon result and consequence play, and the film goes on from there; an option the canon sends back to the choice reopens it. Where the
 * story hands control to the player, a playable scene runs (Interludes.tsx) and the film waits for it. The end credits list the calls
 * made, what they cost or earned, what was established and how, and who the voices are. Replay plays the chapter without touching the
 * saved story. Every control is a button and has a key; captions are always on; reduced motion holds the camera still.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PageProps } from '../../registry.types.js';
import { answerTalk, callbacksBefore, chapterVerdict, choose, complete, echoes, emptyChapter, find, load, nextOf, prevOf, replayDecision, save, seconds, tally, timeOut, trustLine, weightLine, weightOf, TIMEOUT, type Chapter, type ChapterState, type Item, type Progress, type StoryIndex } from '../story.js';
import { TAKES, VOICES, takeFor, readMs, quoted, returnsToChoice } from '../cinematic.js';
import { Face, getJson, loadDefs, loadIndex, useLoaded, notKept } from '../StoryPage.js';
import { buildFilm, INTERLUDES, ONLY_IF, loadFilm, saveFilm, emptyFilm, hidingPlace, objectiveState, questOf, type FilmShot, type FilmState, type PlayRecord } from './director.js';
import { Board, Cards, FillTest, Measure, PlanConsequence } from './Interludes.js';
import { enableSound, roomTone, silence } from './sound.js';
import { NotAPlace, NotYet } from '../../shell/trail.js';

type Decision = Extract<Item, { type: 'decision' }>; type Talk = Extract<Item, { type: 'talk' }>;
interface Line { who: string; name: string; text: string; src: string | null; face?: { pose: string; expr: string } }
interface Out { letter: string; result: string; consequence: string; ladder: boolean; weight: string; trust: string; timedOut: boolean }

export default function FilmPage({ params }: PageProps) {
  const ix = useLoaded(loadIndex, 'ix'); const id = params.chapter || 's01e01';
  if (ix.error) return <div className="sg"><NotYet /><h1 tabIndex={-1}>The story did not load</h1><p className="lead">The story files could not be read ({ix.error}).</p></div>;
  if (!ix.data) return <div className="sg" aria-busy="true"><h1 tabIndex={-1}>SIGNAL</h1><p className="lead">Opening the film…</p></div>;
  if (!ix.data.chapters.some((c) => c.id === id)) return <div className="sg" data-testid="film-unknown"><NotAPlace /><h1 tabIndex={-1}>SIGNAL has no chapter at this address</h1><p><a className="ui-btn ui-btn--primary" href="#/film/s01e01">Start with Ten Seats</a></p></div>;
  return <Film key={id} ix={ix.data} id={id} />;
}

function Film({ ix, id }: { ix: StoryIndex; id: string }) {
  const ch = useLoaded(() => getJson<Chapter>(`signal/story/${id}.json`), id);
  const art = useLoaded(() => Promise.all([getJson<{ panels: string[] }>(`signal/art/${id}.json`), loadDefs()]).then((r) => r[0]), `art-${id}`);
  const ref = ix.chapters.find((c) => c.id === id)!; const items: Item[] = useMemo(() => ch.data?.items || [], [ch.data]);
  const shots = useMemo(() => buildFilm(id, items), [id, items]);
  const [sandbox, setSandbox] = useState(false);
  const [progress, setProgress] = useState<Progress>(load); const state = progress.chapters[id] || emptyChapter();
  const setState = (s: ChapterState) => { const p = { ...progress, last: id, chapters: { ...progress.chapters, [id]: s } }; setProgress(p); if (!sandbox) save(p); };
  const [film, setFilm] = useState<FilmState>(() => loadFilm(id));
  const writeFilm = (f: FilmState) => { setFilm(f); if (!sandbox) saveFilm(id, f); };
  const [k, setK] = useState(0); const [line, setLine] = useState(0); const [playing, setPlaying] = useState(true);
  const [sound, setSound] = useState(false); const [out, setOut] = useState<Out | null>(null); const [left, setLeft] = useState<number | null>(null);
  const [miss, setMiss] = useState(0);
  const [cap, setCap] = useState<'m' | 'l'>('m'); const [theatre, setTheatre] = useState(false); const [said, setSaid] = useState('');
  const audio = useRef<HTMLAudioElement>(null); const timer = useRef<number | null>(null); const root = useRef<HTMLElement>(null); const stage = useRef<HTMLDivElement>(null);
  const panelNo = useMemo(() => { const m = new Map<number, number>(); let n = -1; items.forEach((it, i) => { if (it.type === 'panel') { n += 1; m.set(i, n); } }); return m; }, [items]);
  const takes = TAKES[id] || []; const nameOf = (who: string) => ix.cast[who.toLowerCase()] || who;
  const shot: FilmShot = shots[Math.min(k, shots.length - 1)]!;
  const motion = typeof matchMedia === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const it = 'item' in shot ? items[shot.item] : undefined;
  const lines: Line[] = useMemo(() => {
    if (shot.kind === 'panel' && it?.type === 'panel') {
      const skip = (ONLY_IF[id] || []).filter((o) => o.item === shot.item && state.choices[o.decision]?.letter !== o.letter).map((o) => o.who);
      return it.bubbles.filter((b) => !skip.includes(b.who)).map((b) => { const w = b.who.toLowerCase(); return { who: w, name: ix.cast[w] || b.who, text: b.text, src: takeFor(takes, w, b.text)?.src || null }; });
    }
    if (shot.kind === 'beat' && it?.type === 'beat') return it.lines.map((l) => ({ who: l.who, name: nameOf(l.who), text: l.text, src: takeFor(takes, l.who, l.text)?.src || null, face: { pose: l.pose, expr: l.expr } }));
    return [];
  }, [shot, it, state.choices]);   // eslint-disable-line react-hooks/exhaustive-deps
  const ln = lines[line];
  const dec = shot.kind === 'decision' && it?.type === 'decision' ? (it as Decision) : null;
  const talk = shot.kind === 'talk' && it?.type === 'talk' ? (it as Talk) : null;
  const play = shot.kind === 'play' ? (INTERLUDES[id] || []).find((p) => p.id === shot.id) || null : null;
  const playRec = play ? film.plays[play.id] || null : null;
  const chosen = dec ? state.choices[dec.id] : undefined;
  const disc = shot.kind === 'find' && it?.type === 'discovery' ? it : null; const twist = shot.kind === 'twist' && it?.type === 'twist' ? it : null; const quest = questOf(items);
  const discoveries = useMemo(() => items.filter((x) => x.type === 'discovery').map((x) => (x as Extract<Item, { type: 'discovery' }>).id), [items]);
  const twistAt = shots.findIndex((x) => x.kind === 'twist');
  const upTo = shot.kind === 'credits' ? items.length : 'item' in shot ? shot.item : 0;
  const evidence = useMemo(() => items.slice(0, upTo + 1).flatMap((x) => (x.type === 'panel' ? x.evidence : [])), [items, upTo]);
  const clear = () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null; } };
  const actOf = (n: number) => { for (let j = n; j >= 0; j -= 1) { const s = shots[j]!; if (s.kind === 'act') return s.title; } return ref.title; };
  const goTo = (n: number) => { clear(); audio.current?.pause(); const to = Math.max(0, Math.min(shots.length - 1, n)); setK(to); setLine(0); setOut(null); setLeft(null); setPlaying(true); setMiss(0);
    const s = shots[to]!; if (s.kind === 'act') setSaid(`${s.title}${s.sub ? `. ${s.sub}` : ''}`); else if (s.kind === 'decision') setSaid('A decision. The film waits for you.'); else if (s.kind === 'play') setSaid('Your turn: a playable scene.');
    if (to > 0 && s.kind !== 'credits') writeFilm({ ...film, at: to }); };
  const advance = () => { clear(); if (ln && line + 1 < lines.length) { setLine(line + 1); return; } if (k + 1 < shots.length) goTo(k + 1); };
  const blocked = (dec && (!chosen || out?.ladder || chosen.letter === TIMEOUT && !out)) || (talk && !(talk.id in state.talks)) || (play && !playRec) || shot.kind === 'title';
  // the film's clock: lines speak (or hold for a reading time), act cards and footage run, decisions and playable scenes wait
  useEffect(() => {
    clear(); const a = audio.current; if (!playing) { a?.pause(); return undefined; }
    if (shot.kind === 'act') { timer.current = window.setTimeout(advance, motion ? 2800 : 2200); return clear; }
    if (shot.kind === 'footage') { timer.current = window.setTimeout(advance, 10500); return clear; }   // the clip's own end usually comes first
    if (shot.kind !== 'panel' && shot.kind !== 'beat') return undefined;
    if (ln?.src && a && sound) { a.src = ln.src; a.currentTime = 0; a.play().catch(() => { timer.current = window.setTimeout(advance, readMs(ln.text)); }); return () => { a.pause(); clear(); }; }
    const p = it as Record<string, unknown> | undefined; const hold = ln ? readMs(ln.text) : Math.min(6500, readMs(String(p?.['caption'] || p?.['alt'] || '')));
    timer.current = window.setTimeout(advance, hold); return clear;
  }, [k, line, playing, sound, lines.length]);   // eslint-disable-line react-hooks/exhaustive-deps
  // a timed decision counts down only when the reader's clock says so (story settings: on, extended or off)
  const limit = dec && !chosen ? seconds(dec, progress.clock) : null;
  useEffect(() => { if (!limit || !playing) { setLeft(null); return undefined; } setLeft(limit); const t0 = Date.now(); const h = window.setInterval(() => { const s = limit - Math.floor((Date.now() - t0) / 1000); setLeft(s); if (s <= 0) { window.clearInterval(h); } }, 250); return () => window.clearInterval(h); }, [k, limit, playing]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (left === 0 && dec && !state.choices[dec.id]) { setState(timeOut(state, dec)); setOut({ letter: TIMEOUT, result: (dec.timeout || ['Someone else decided for you.']).join(' '), consequence: '', ladder: false, weight: weightLine('costly', 2), trust: '', timedOut: true }); setSaid('Time ran out. The decision is recorded as missed.'); } }, [left]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { silence(); }, []);
  useEffect(() => { if (shot.kind === 'decision' || shot.kind === 'play' || shot.kind === 'credits' || shot.kind === 'quest' || shot.kind === 'twist' || shot.kind === 'find') root.current?.querySelector<HTMLElement>('.fm-focus')?.focus({ preventScroll: true }); }, [k]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (shot.kind === 'credits' && !sandbox && !state.done && complete(items, state)) setState({ ...state, done: true }); }, [k]);   // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (letter: string) => {
    if (!dec) return; const r = choose(state, dec, letter); if (r.outcome.kind !== 'recorded') { setSaid(r.outcome.why); return; }
    setState(r.state); const o = r.outcome.option; const w = weightOf(dec, r.state.choices[dec.id]!);
    setOut({ letter, result: o.result, consequence: o.consequence, ladder: returnsToChoice(o.result), weight: weightLine(w.verdict, w.sev), trust: trustLine(w.trust), timedOut: false });
    setSaid(`Recorded: ${o.label}.`);
    const q = quoted(o.result); const take = q ? takeFor(takes, q.who, q.text) : null; if (take && sound && audio.current) { audio.current.src = take.src; audio.current.currentTime = 0; audio.current.play().catch(() => {}); }
  };
  const begin = (withSound: boolean, at: number, replay: boolean) => {
    if (replay) { setSandbox(true); setProgress({ ...progress, chapters: { ...progress.chapters, [id]: emptyChapter() } }); setFilm(emptyFilm()); }
    const ok = withSound && enableSound(); setSound(ok); if (ok) roomTone(true); if (!replay) { const f = { ...film, sound: ok }; setFilm(f); saveFilm(id, f); }
    goTo(Math.max(1, at));
  };
  const onKey = (e: { key: string; target: EventTarget; preventDefault: () => void }) => {
    const t = e.target as HTMLElement; if (t.closest('input, select, textarea')) return;
    if (e.key === ' ' && shot.kind !== 'title') { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === 'ArrowRight' && !blocked) { e.preventDefault(); goTo(k + 1); } else if (e.key === 'ArrowLeft' && k > 1) { e.preventDefault(); goTo(k - 1); }
    else if (dec && /^[1-6]$/.test(e.key) && (!out || out.ladder)) { const o = dec.options[Number(e.key) - 1]; if (o) { e.preventDefault(); pick(o.letter); } }
  };
  if (ch.error) return <div className="sg" data-testid="film-error"><NotYet /><h1 tabIndex={-1}>{ref.title} did not load</h1>{notKept() && <p className="lead">You are offline and this chapter is not kept on this device.</p>}</div>;
  if (!ch.data) return <div className="sg" aria-busy="true"><h1 tabIndex={-1}>{ref.title}</h1><p className="lead">Opening the film…</p></div>;
  const svg = shot.kind === 'panel' ? art.data?.panels[panelNo.get(shot.item) ?? -1] : undefined;
  // a decision or conversation holds the last picture behind it, dimmed, so the choice stays in the scene
  const bgArt = (dec || talk || disc || twist) && 'item' in shot ? (() => { for (let j = shot.item; j >= 0; j -= 1) { const n = panelNo.get(j); if (n !== undefined) return art.data?.panels[n]; } return undefined; })() : undefined;
  const acts = shots.map((s, i) => ({ s, i })).filter((x) => x.s.kind === 'act') as { s: Extract<FilmShot, { kind: 'act' }>; i: number }[];
  const prev = prevOf(ix, id); const prevEcho = prev ? echoes([], progress.chapters[prev.id]) : null; const next = nextOf(ix, id);
  const voiced = [...new Set(takes.map((t) => t.who))];
  return <section ref={root} className={`fm${theatre ? ' fm--theatre' : ''} fm--cap-${cap}`} data-testid="film" data-chapter={id} data-shot={k} data-shots={shots.length} data-kind={shot.kind} data-sandbox={String(sandbox)} data-sound={String(sound)} aria-label={`SIGNAL, ${ref.title}: interactive film`} onKeyDown={onKey}>
    {shot.kind !== 'title' && <h1 className="ui-visually-hidden" tabIndex={-1}>{ref.title}: interactive film</h1>}
    <nav className="fm-modes" aria-label="Ways to experience this chapter"><a href={`#/film/${id}`} aria-current="page" data-testid="film-mode-film">Film</a><a href={`#/play/${id}`} data-testid="film-mode-play">Scenes</a><a href={`#/story/${id}`} data-testid="film-mode-read">Read (comic)</a><span className="ui-meta">One story, three ways: your choices carry across all three.</span></nav>
    {sandbox && <p className="fm-sandbox" data-testid="film-sandbox">Replay: nothing you choose now changes your saved story. <button type="button" className="ui-btn ui-btn--sm" onClick={() => { setSandbox(false); setProgress(load()); setFilm(loadFilm(id)); goTo(0); setK(0); }}>End the replay</button></p>}
    <div ref={stage} className={`fm-stage fm-stage--${shot.kind}`} data-testid="film-stage" data-item={'item' in shot ? shot.item : ''}>
      {shot.kind === 'title' && <div className="fm-title fm-focus" tabIndex={-1} data-testid="film-title">
        <p className="fm-title__k">SIGNAL · Season {ref.season}{ix.seasons[String(ref.season)] ? `: ${ix.seasons[String(ref.season)]}` : ''} · Episode {ref.episode}</p>
        <h1 className="fm-title__h">{ref.title}</h1><p className="fm-title__sub">{ref.sub}</p>
        {prev && prevEcho && <p className="ui-meta" data-testid="film-previously">Before this: {prev.kicker} “{prev.title}”{Object.keys(progress.chapters[prev.id]?.choices || {}).length ? ' — your calls there carry into the story.' : '.'}</p>}
        <div className="fm-title__acts">
          <button type="button" className="ui-btn ui-btn--primary" onClick={() => begin(true, 1, false)} data-testid="film-begin-sound">Begin with sound</button>
          <button type="button" className="ui-btn" onClick={() => begin(false, 1, false)} data-testid="film-begin-quiet">Begin without sound</button>
          {film.at > 1 && film.at < shots.length - 1 && <button type="button" className="ui-btn" onClick={() => begin(film.sound !== false, film.at, false)} data-testid="film-resume">Resume: {actOf(film.at)}</button>}
          {Object.keys(state.choices).length > 0 && <button type="button" className="ui-btn ui-btn--quiet" onClick={() => begin(film.sound !== false, 1, true)} data-testid="film-replay">Replay without changing your saved story</button>}
        </div>
        <p className="ui-meta fm-title__note">Voices: {voiced.length ? `${voiced.map((w) => `${nameOf(w)} (AI voice ${VOICES[w] || ''})`).join(', ')}; every other line is a subtitle` : 'this chapter’s lines are subtitles; no voices are recorded for it yet'}. {(shots.some((s) => s.kind === 'footage')) ? 'Footage is generated, of fictional places and people. ' : ''}Sound starts only if you choose it. Your choices are kept in this browser and shared with the written story.</p>
      </div>}
      {shot.kind === 'act' && <div className="fm-act" data-testid="film-act"><p className="fm-act__t">{shot.title}</p>{shot.sub && <p className="fm-act__s">{shot.sub}</p>}</div>}
      {shot.kind === 'footage' && <figure className="fm-foot"><video key={shot.src} className="fm-foot__v" src={shot.src} muted autoPlay playsInline preload="auto" onEnded={() => { if (playing) advance(); }} onError={() => setSaid('This clip could not load; the film goes on.')} aria-label={shot.note} data-testid="film-footage" /><figcaption className="fm-foot__n">{shot.note}</figcaption></figure>}
      {shot.kind === 'panel' && <div className="fm-panel">{svg ? <div key={k} className={`fm-art${motion ? ' fm-art--move' : ''}`} role="img" aria-label={String((it as { alt?: string })?.alt || '')} dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="fm-art fm-art--none">{String((it as { alt?: string })?.alt || '')}</p>}
        {!!(it as { caption?: string })?.caption && <p className="fm-capline">{(it as { caption: string }).caption}</p>}</div>}
      {shot.kind === 'beat' && <div className="fm-beat">{it?.type === 'beat' && it.where && <p className="fm-beat__w">{it.where}</p>}{ln?.face && <span className="fm-beat__face"><Face id={ln.who} pose={ln.face.pose || 'N'} expr={ln.face.expr || 'talk'} /></span>}</div>}
      {(shot.kind === 'panel' || shot.kind === 'beat') && ln && <p className="fm-sub" data-testid="film-line" data-who={ln.who} data-audio={ln.src && sound ? 'take' : 'caption'}><b>{ln.name}</b> {ln.text}</p>}
      {dec && <div className="fm-dec" data-testid="film-decision" data-decision={dec.id}>
        {bgArt && <div className="fm-dec__bg" aria-hidden="true" dangerouslySetInnerHTML={{ __html: bgArt }} />}
        <p className="fm-dec__k">Decision{left !== null && left > 0 ? <span className="fm-dec__clock" data-testid="film-clock" role="timer" aria-label={`${left} seconds left`}> · {left} s</span> : null}</p>
        <h2 className="fm-dec__q fm-focus" tabIndex={-1}>{dec.prompt}</h2>{dec.happening && <p className="fm-dec__h">{dec.happening}</p>}
        {(() => { const cb = callbacksBefore(items, state, dec.id, 1)[0]; return cb ? <p className="fm-dec__cb" data-testid="film-callback"><b>Because of an earlier call:</b> {cb.result}</p> : null; })()}
        {(!out || out.ladder) && chosen?.letter !== TIMEOUT && <div className="fm-dec__opts" role="group" aria-label="Choices">{dec.options.filter((o) => !(out?.ladder && o.letter === out.letter)).map((o, n) => <button key={o.letter} type="button" className="fm-opt" onClick={() => pick(o.letter)} data-testid={`film-opt-${o.letter}`}><span className="fm-opt__n" aria-hidden="true">{n + 1}</span>{o.label}</button>)}</div>}
        {out && <div className={`fm-out${out.timedOut ? ' is-timeout' : ''}`} role="status" data-testid="film-out" data-letter={out.letter} data-ladder={String(out.ladder)}>
          <p className="fm-out__r"><b>{out.result}</b></p>{out.consequence && <p>{out.consequence}</p>}<p className="ui-meta">{out.weight}{out.trust ? ` · trust: ${out.trust}` : ''}</p>
          {id === 's01e01' && dec.id === 'BR-S01E01-02' && !out.ladder && <PlanConsequence letter={out.letter} />}
          {out.ladder ? <p className="ui-meta">The choice is open again.</p> : <button type="button" className="ui-btn ui-btn--primary fm-focus" onClick={() => goTo(k + 1)} data-testid="film-continue">Continue</button>}
          {out.timedOut && <button type="button" className="ui-btn" onClick={() => { setState(replayDecision(state, dec.id)); setOut(null); goTo(k); }} data-testid="film-replay-decision">Replay this decision</button>}</div>}
        {!out && chosen && chosen.letter !== TIMEOUT && <p className="ui-meta">You chose {chosen.letter} before. <button type="button" className="ui-btn ui-btn--sm" onClick={() => goTo(k + 1)} data-testid="film-continue">Keep it and continue</button> or choose again.</p>}
        {!out && chosen?.letter === TIMEOUT && <p className="ui-meta">The clock ran out here before. <button type="button" className="ui-btn ui-btn--sm" onClick={() => setState(replayDecision(state, dec.id))} data-testid="film-replay-decision">Replay this decision</button> <button type="button" className="ui-btn ui-btn--sm" onClick={() => goTo(k + 1)}>Continue</button></p>}
      </div>}
      {shot.kind === 'quest' && it?.type === 'quest' && <div className="fm-dec fm-quest" data-testid="film-quest">
        <p className="fm-dec__k">{it.kind} · {it.level}</p><h2 className="fm-dec__q fm-focus" tabIndex={-1}>{it.title}</h2>
        <p className="fm-dec__h"><b>Stakes:</b> {it.stakes}</p><p className="fm-dec__h"><b>Clock:</b> {it.clock} · <b>Reward:</b> {it.reward}</p>
        <ul className="fm-obj" aria-label="Objectives">{it.objectives.map((o) => <li key={o.key} data-obj={o.key}>{o.text}</li>)}</ul>
        <p className="ui-meta">The film keeps these objectives in the case file below, and ticks them as you go.</p>
        <button type="button" className="ui-btn ui-btn--primary" onClick={() => goTo(k + 1)} data-testid="film-continue">Take the case</button>
      </div>}
      {disc && <div className="fm-find" data-testid="film-find" data-discovery={disc.id}>
        {bgArt ? <div className="fm-find__art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: bgArt }} /> : <div className="fm-find__art fm-find__art--none" />}
        {!state.found.includes(disc.id) ? <>
          <button type="button" className="fm-find__miss" aria-label="Look here" onClick={() => setMiss(miss + 1)} data-testid="film-find-miss" />
          {(() => { const h = hidingPlace(disc.id); return <button type="button" className={`fm-find__spot${miss >= 3 ? ' is-hint' : ''}`} style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%`, width: `${h.w * 100}%`, height: `${h.h * 100}%` }} aria-label={`Look closer: ${disc.teaser}`} onClick={() => { setState(find(state, disc.id)); setSaid(`Found: ${disc.title}.`); }} data-testid="film-find-spot" />; })()}
          <div className="fm-find__bar"><p className="fm-dec__k fm-focus" tabIndex={-1}>Look closer · something about {disc.teaser}</p><p className="ui-meta">{miss === 0 ? 'Something in this picture is worth a closer look. Click where you would look.' : miss < 3 ? 'Not there. Look again.' : 'It is marked now.'} Optional: you can move on without it.</p>
            <button type="button" className="ui-btn ui-btn--sm" onClick={() => goTo(k + 1)} data-testid="film-find-skip">Move on</button></div>
        </> : <div className="fm-out fm-find__card" role="status" data-testid="film-found"><p className="fm-dec__k">Found · {disc.thread}</p><h2 className="fm-dec__q fm-focus" tabIndex={-1}>{disc.title}</h2>{disc.body.split(/\n{2,}/).map((x, i) => <p key={i}>{x.replace(/\*/g, '')}</p>)}<button type="button" className="ui-btn ui-btn--primary" onClick={() => goTo(k + 1)} data-testid="film-continue">Continue</button></div>}
      </div>}
      {twist && <div className="fm-dec fm-twist" data-testid="film-twist">
        {bgArt && <div className="fm-dec__bg" aria-hidden="true" dangerouslySetInnerHTML={{ __html: bgArt }} />}
        <p className="fm-dec__k">Twist</p><h2 className="fm-dec__q fm-focus" tabIndex={-1}>{twist.title}</h2><p className="fm-twist__b">{twist.body}</p>
        <button type="button" className="ui-btn ui-btn--primary" onClick={() => goTo(k + 1)} data-testid="film-continue">Continue</button>
      </div>}
      {talk && <div className="fm-dec fm-talk" data-testid="film-talk" data-talk={talk.id}>
        {bgArt && <div className="fm-dec__bg" aria-hidden="true" dangerouslySetInnerHTML={{ __html: bgArt }} />}
        <p className="fm-dec__k"><Face id={talk.who} pose="N" expr="worried" /> {nameOf(talk.who)}</p><h2 className="fm-dec__q fm-focus" tabIndex={-1}>{talk.prompt}</h2>
        {!(talk.id in state.talks) ? <div className="fm-dec__opts" role="group" aria-label="What Maya says">{talk.options.map((o, n) => <button key={n} type="button" className="fm-opt" onClick={() => setState(answerTalk(state, talk.id, n))} data-testid={`film-say-${n}`}><span className="fm-opt__n" aria-hidden="true">{n + 1}</span>{o.label}</button>)}</div>
          : (() => { const o = talk.options[state.talks[talk.id]!]!; return <div className="fm-out" role="status" data-testid="film-reply"><p><b>{nameOf(o.who)}:</b> {o.reply}</p><p className="ui-meta">trust: {trustLine(o.trust) || 'no change'}</p><button type="button" className="ui-btn ui-btn--primary fm-focus" onClick={() => goTo(k + 1)} data-testid="film-continue">Continue</button></div>; })()}
      </div>}
      {play && <div className="fm-playwrap" data-testid="film-play" data-play={play.id}>
        <p className="fm-dec__k">Your turn · a playable scene <span className="ui-meta">(staging added to the story; the investigation is the story’s own)</span></p>
        <h2 className="fm-dec__q fm-focus" tabIndex={-1}>{play.title}</h2><p className="fm-dec__h">{play.goal}</p>
        {(() => { const props = { done: playRec, prior: film.plays, firstCall: state.choices['BR-S01E01-01']?.letter || null, onDone: (r: PlayRecord) => { writeFilm({ ...film, plays: { ...film.plays, [play.id]: r } }); setSaid(`Recorded: ${r.evidence}${r.assisted ? ', shown' : ''}.`); } };
          return play.id === 'measure' ? <Measure mode="before" {...props} /> : play.id === 'verify' ? <Measure mode="after" {...props} /> : play.id === 'cards' ? <Cards {...props} /> : play.id === 'board' ? <Board {...props} /> : <FillTest {...props} />; })()}
        {playRec && <p className="fm-play__acts"><span className="ui-meta">Evidence: <b>{playRec.evidence}</b>{playRec.caveat ? ` — ${playRec.caveat}` : ''}</span> <button type="button" className="ui-btn ui-btn--primary" onClick={() => goTo(k + 1)} data-testid="film-continue">Continue the film</button></p>}
      </div>}
      {shot.kind === 'credits' && <Credits ix={ix} id={id} items={items} state={state} film={film} voiced={voiced} next={next?.id || null} sandbox={sandbox} onAgain={() => goTo(0)} />}
    </div>
    <audio ref={audio} onEnded={() => { if (!dec) window.setTimeout(advance, 420); }} preload="auto" />
    {shot.kind !== 'title' && <div className="fm-ctl" role="group" aria-label="Film controls">
      <button type="button" className="ui-btn" onClick={() => goTo(k - 1)} disabled={k <= 1} data-testid="film-back" aria-label="Back one shot">◂</button>
      <button type="button" className="ui-btn ui-btn--primary" onClick={() => setPlaying(!playing)} data-testid="film-toggle" aria-pressed={!playing}>{playing ? 'Pause' : 'Play'}</button>
      <button type="button" className="ui-btn" onClick={() => goTo(k + 1)} disabled={!!blocked || k >= shots.length - 1} data-testid="film-next" aria-label="Next shot">▸</button>
      <label className="fm-ctl__act">Act <select value={acts.filter((a) => a.i <= k).pop()?.i ?? ''} onChange={(e) => goTo(Number(e.target.value))} data-testid="film-acts">{acts.map((a) => <option key={a.i} value={a.i}>{a.s.title}</option>)}</select></label>
      <button type="button" className="ui-btn ui-btn--quiet" onClick={() => { if (sound) { silence(); setSound(false); audio.current?.pause(); } else { const ok = enableSound(); setSound(ok); if (ok) roomTone(true); } }} aria-pressed={sound} data-testid="film-sound">{sound ? 'Sound on' : 'Sound off'}</button>
      <button type="button" className="ui-btn ui-btn--quiet" onClick={() => setCap(cap === 'm' ? 'l' : 'm')} aria-pressed={cap === 'l'} data-testid="film-capsize">Larger captions</button>
      <button type="button" className="ui-btn ui-btn--quiet" onClick={() => setTheatre(!theatre)} aria-pressed={theatre} data-testid="film-theatre">Theatre</button>
      <button type="button" className="ui-btn ui-btn--quiet" onClick={() => { const el = stage.current; if (!el) return; if (document.fullscreenElement) void document.exitFullscreen(); else void el.requestFullscreen?.().catch(() => setTheatre(true)); }} data-testid="film-full">Full screen</button>
      <span className="ui-meta fm-ctl__where" data-testid="film-where">{actOf(k)} · shot {k} of {shots.length - 2}</span>
    </div>}
    {shot.kind !== 'title' && (quest || evidence.length > 0 || discoveries.length > 0) && <section className="fm-case" aria-label="Case file" data-testid="film-case">
      {quest && <div className="fm-case__col"><h3>Objectives</h3><ul className="fm-obj">{quest.objectives.map((o) => { const st = objectiveState(o.key, { choices: state.choices, found: state.found, discoveries, twistSeen: twistAt >= 0 && k > twistAt }); return <li key={o.key} data-obj={o.key} data-state={st}><span aria-hidden="true">{st === 'done' ? '✓' : st === 'open' ? '○' : '·'}</span> {o.text}{st === 'elsewhere' ? <> <a href={`#/story/${id}`} className="ui-meta">practice in the written story</a></> : null}<span className="ui-visually-hidden">{st === 'done' ? ', done' : st === 'open' ? ', not yet' : ''}</span></li>; })}</ul></div>}
      <div className="fm-case__col"><h3>Evidence so far</h3>{evidence.length ? <ul className="fm-ev" data-testid="film-evidence-so-far">{evidence.map((e, i) => <li key={i} data-state={e.state}><span className={`fm-ev__s fm-ev__s--${e.state.toLowerCase()}`}>{e.state.toLowerCase()}</span> {e.label}</li>)}</ul> : <p className="ui-meta">Nothing recorded yet.</p>}
        {discoveries.length > 0 && <p className="ui-meta" data-testid="film-found-count">Found {state.found.filter((f) => discoveries.includes(f)).length} of {discoveries.length} things worth a closer look.</p>}</div>
    </section>}
    <p className="ui-visually-hidden" role="status" aria-live="polite" data-testid="film-said">{said}</p>
    {shot.kind !== 'title' && shot.kind !== 'credits' && <details className="fm-script"><summary>Transcript of this shot</summary>{lines.length ? <ol>{lines.map((l, i) => <li key={i}><b>{l.name}:</b> {l.text}</li>)}</ol> : <p>{String((it as { alt?: string; caption?: string })?.caption || (it as { alt?: string })?.alt || (shot.kind === 'footage' ? shot.note : ''))}</p>}</details>}
  </section>;
}

function Credits({ ix, id, items, state, film, voiced, next, sandbox, onAgain }: { ix: StoryIndex; id: string; items: Item[]; state: ChapterState; film: FilmState; voiced: string[]; next: string | null; sandbox: boolean; onAgain: () => void }) {
  const e = echoes(items, state); const t = tally(items, state); const plays = INTERLUDES[id] || [];
  const who = [...new Set(items.flatMap((x) => (x.type === 'beat' ? x.lines.map((l) => l.who) : x.type === 'panel' ? x.bubbles.map((b) => b.who.toLowerCase()) : [])))].filter((w) => ix.cast[w]);
  return <div className="fm-credits fm-focus" tabIndex={-1} data-testid="film-credits">
    <p className="fm-title__k">End of episode{sandbox ? ' · replay, not saved' : ''}</p><h2 className="fm-title__h">{ix.chapters.find((c) => c.id === id)!.title}</h2>
    <p className="fm-credits__v" data-testid="film-verdict">{chapterVerdict(t)}</p>
    <h3>Your calls</h3><ol className="fm-credits__calls" data-testid="film-calls">{e.made.map((m) => <li key={m.id} data-verdict={m.verdict}><b>{m.prompt}</b><br />{m.timedOut ? 'The clock ran out.' : m.label} <span className="ui-tag">{m.verdict === 'canonical' ? '★ the professional call' : m.verdict === 'costly' ? '✕ costly' : '◦ not wrong'}</span></li>)}</ol>
    {Object.keys(e.trust).length > 0 && <p data-testid="film-trust">Trust: {trustLine(e.trust)}</p>}
    {plays.length > 0 && <><h3>What you established</h3><ul data-testid="film-evidence">{plays.map((p) => { const r = film.plays[p.id]; return <li key={p.id}>{p.title}: {r ? <><b>{r.evidence}</b>{r.assisted ? ' (shown, not done unaided)' : ''}{r.caveat ? ` — ${r.caveat}` : ''}</> : 'not done'}</li>; })}</ul></>}
    <p className="ui-meta">Story merit {t.merit}: entertainment, not a credential. Finishing an episode proves nothing about anyone’s professional competence.</p>
    <h3>Cast</h3><p className="fm-credits__cast">{who.map((w) => `${ix.cast[w]}${voiced.includes(w) ? ` — AI-generated voice (${VOICES[w] || 'stock voice'})` : ''}`).join(' · ')}</p>
    <p className="ui-meta">Every line is the SIGNAL canon’s. Voices are AI-generated stock voices, not clones of anyone. Footage is generated video of fictional places and people, reviewed shot by shot; footage that could teach the wrong thing was rejected. Room tone and the comb-filter sounds are made in your browser. The playable scenes, act cards and props are staging added for the film.</p>
    <p className="fm-title__acts">{next && <a className="ui-btn ui-btn--primary" href={`#/film/${next}`} data-testid="film-next-episode">Next episode</a>}<a className="ui-btn" href={`#/story/${id}`} data-testid="film-practice">Practice and quizzes for this episode</a><a className="ui-btn" href={`#/play/${id}`}>Play it as scenes</a><button type="button" className="ui-btn ui-btn--quiet" onClick={onAgain}>Watch again</button></p>
  </div>;
}
