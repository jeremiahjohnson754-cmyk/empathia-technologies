/**
 * The Cinematic Story player (A5, 12 Nov 2026): plays a scene shot by shot over the canon chapter. Each shot shows the canon panel art,
 * its caption, and its spoken lines with captions; a line with a recorded take plays it, and a line without one stays on screen for a calm
 * reading time. The decision pauses the scene and uses the story engine's own choice (the same as Classic). Pause, step back, step on
 * and leave at any time; nothing here is timed against the viewer.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Item, ChapterState, Outcome } from './story.js';
import { takeFor, readMs, quoted, returnsToChoice, type Scene } from './cinematic.js';

type Decision = Extract<Item, { type: 'decision' }>;
interface Line { who: string; name: string; text: string; src: string | null }
interface Props { scene: Scene; items: Item[]; panels: string[] | undefined; cast: Record<string, string>; state: ChapterState; onChoose: (d: Decision, letter: string) => Outcome; onClose: () => void }

export function Cinematic({ scene, items, panels, cast, state, onChoose, onClose }: Props) {
  const [act, setAct] = useState(0); const A = scene.acts[act]!;
  const panelOf = useMemo(() => { const m = new Map<number, number>(); let n = -1; items.forEach((it, i) => { if (it.type === 'panel') { n += 1; m.set(i, n); } }); return m; }, [items]);
  const nameOf = (who: string) => cast[who.toLowerCase()] || who;
  const shots = useMemo(() => A.shots.map((s) => {
    const it = items[s.item] as Item & Record<string, unknown>;
    if (s.kind === 'panel' && it?.type === 'panel') {
      const bubbles = ((it as unknown as { bubbles?: { who: string; text: string }[] }).bubbles || []).map((b) => { const who = b.who.toLowerCase(); return { who, name: nameOf(who), text: b.text, src: takeFor(scene.takes, who, b.text)?.src || null }; });
      return { ...s, art: panels?.[panelOf.get(s.item) ?? -1] || '', alt: String((it as unknown as { alt?: string }).alt || ''), caption: String((it as unknown as { caption?: string }).caption || ''), lines: bubbles as Line[] };
    }
    if (s.kind === 'beat' && it?.type === 'beat') {
      const lines = ((it as unknown as { lines: { who: string; text: string }[] }).lines).map((l) => ({ who: l.who, name: nameOf(l.who), text: l.text, src: takeFor(scene.takes, l.who, l.text)?.src || null }));
      return { ...s, art: '', alt: '', caption: '', lines };
    }
    if (s.kind === 'footage') return { ...s, art: '', alt: s.note || '', caption: s.note || '', lines: [] as Line[] };
    return { ...s, art: '', alt: '', caption: '', lines: [] as Line[] };
  }).map((sh, i, all) => {
    // the canon repeats a panel's bubble as the first line of the beat that follows it (the beat is the exchange); it is spoken once, in the beat
    const nx = all[i + 1]; if (sh.kind === 'panel' && nx?.kind === 'beat' && sh.lines.length && nx.lines[0] && sh.lines[sh.lines.length - 1]!.text === nx.lines[0].text) return { ...sh, lines: sh.lines.slice(0, -1) };
    return sh;
  }), [scene, act, items, panels]);
  const [shot, setShot] = useState(0); const [line, setLine] = useState(0); const [playing, setPlaying] = useState(true);
  const [out, setOut] = useState<{ letter: string; result: string; consequence: string; ladder: boolean } | null>(null);
  const audio = useRef<HTMLAudioElement>(null); const timer = useRef<number | null>(null); const root = useRef<HTMLElement>(null);
  // the player opens where the reader is looking (and a browser pauses muted footage it cannot see)
  useEffect(() => { root.current?.scrollIntoView({ block: 'start' }); }, []);
  const cur = shots[shot]!; const ln = cur.lines[line] as Line | undefined; const dec = cur.kind === 'decision' ? (items[cur.item] as Decision) : null;
  const chosen = dec ? state.choices[dec.id] : undefined;
  const clear = () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null; } };
  const advance = () => { clear(); if (ln && line + 1 < cur.lines.length) { setLine(line + 1); return; } if (shot + 1 < shots.length) { setShot(shot + 1); setLine(0); setOut(null); } else setPlaying(false); };
  // play the current line (or hold a caption-only shot for its reading time); a decision waits for the viewer
  useEffect(() => {
    clear(); const a = audio.current; if (!playing || dec) { a?.pause(); return undefined; }
    if (cur.kind === 'footage') { a?.pause(); timer.current = window.setTimeout(advance, 9000); return clear; }
    if (ln?.src && a) { a.src = ln.src; a.currentTime = 0; a.play().catch(() => { timer.current = window.setTimeout(advance, readMs(ln.text)); }); return () => { a.pause(); clear(); }; }
    timer.current = window.setTimeout(advance, readMs(ln?.text || cur.caption || cur.alt || '')); return clear;
  }, [shot, line, playing, dec]);
  const go = (d: number) => { clear(); audio.current?.pause(); const n = Math.max(0, Math.min(shots.length - 1, shot + d)); setShot(n); setLine(0); setOut(null); };
  const choose = (letter: string) => {
    if (!dec) return; const o = onChoose(dec, letter); if (o.kind !== 'recorded') return;
    // an option whose canon result sends the player back to the choice keeps the decision open (it is still recorded, as in Classic)
    const ladder = returnsToChoice(o.option.result); setOut({ letter, result: o.option.result, consequence: o.option.consequence, ladder });
    const q = quoted(o.option.result); const take = q ? takeFor(scene.takes, q.who, q.text) : null;
    if (take && audio.current) { audio.current.src = take.src; audio.current.currentTime = 0; audio.current.play().catch(() => {}); }
  };
  const motion = typeof matchMedia === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  return <section ref={root} className="sg-cine" data-testid="sg-cine" data-scene={scene.chapter} data-act={act} aria-label={`Cinematic story: ${A.title}`}>
    <header className="sg-cine__bar"><b>{A.title}</b> {A.sub && <span className="ui-meta">{A.sub}</span>} <span className="ui-meta">· shot {shot + 1} of {shots.length} · {scene.takes.length ? `voices: Maya (${scene.voices.maya}), Ray (${scene.voices.ray}); lines without a recorded take are captions` : 'captions; this chapter’s voices are not recorded yet'}</span>
      <label className="sg-cine__acts">Act <select value={act} onChange={(e) => { clear(); audio.current?.pause(); setAct(Number(e.target.value)); setShot(0); setLine(0); setOut(null); setPlaying(true); }} data-testid="sg-cine-act">{scene.acts.map((a, i) => <option key={i} value={i}>{a.title}</option>)}</select></label></header>
    <div className="sg-cine__stage" data-testid="sg-cine-shot" data-shot={shot} data-item={cur.item} data-kind={cur.kind}>
      {cur.kind === 'footage' && cur.src ? <video className="sg-cine__film" key={`f${shot}`} src={cur.src} muted autoPlay playsInline aria-label={cur.note} onEnded={() => { if (playing) advance(); }} data-testid="sg-cine-footage" /> : null}
      {cur.art ? <div className={`sg-cine__art${motion ? ' sg-cine__art--move' : ''}`} role="img" aria-label={cur.alt} key={shot} dangerouslySetInnerHTML={{ __html: cur.art }} /> : null}
      {dec ? <div className="sg-cine__dec" data-testid="sg-cine-dec" data-decision={dec.id}>
        <p className="sg-dec__k">Decision</p><h3>{dec.prompt}</h3><p>{dec.happening}</p>
        {(!out || out.ladder) && <div className="sg-cine__opts" role="group" aria-label="Choices">{dec.options.filter((o) => !(out?.ladder && o.letter === out.letter)).map((o) => <button key={o.letter} type="button" className="ui-btn" onClick={() => choose(o.letter)}>{o.letter}. {o.label}</button>)}</div>}
        {out && <div className="sg-cine__out" role="status" data-testid="sg-cine-out" data-letter={out.letter} data-ladder={String(out.ladder)}><p><b>{out.result}</b></p><p>{out.consequence}</p>
          {out.ladder ? <p className="ui-meta">The choice is open again.</p> : shot + 1 < shots.length ? <button type="button" className="ui-btn ui-btn--primary" onClick={() => { setPlaying(true); go(1); }} data-testid="sg-cine-continue">Continue</button> : <p className="ui-meta">End of the act. Choose the next act, or go back to the written story.</p>}</div>}
        {!out && chosen && <p className="ui-meta">Chosen before: {chosen.letter}. Choosing again changes it, as in the written story.</p>}
      </div> : <div className="sg-cine__caps">
        {cur.caption && <p className="sg-cine__cap">{cur.caption}</p>}
        {ln && <p className="sg-cine__line" data-testid="sg-cine-line" data-who={ln.who} data-audio={ln.src ? 'take' : 'caption'}><b>{ln.name}:</b> {ln.text}</p>}
      </div>}
    </div>
    <audio ref={audio} onEnded={() => { if (!dec) window.setTimeout(advance, 450); }} preload="auto" />
    <div className="sg-cine__ctl">
      <button type="button" className="ui-btn" onClick={() => go(-1)} disabled={shot === 0}>◂ Back</button>
      <button type="button" className="ui-btn" onClick={() => setPlaying(!playing)} data-testid="sg-cine-play" aria-pressed={!playing}>{playing ? 'Pause' : 'Play'}</button>
      <button type="button" className="ui-btn" onClick={() => go(1)} disabled={shot === shots.length - 1 || (!!dec && !out)} data-testid="sg-cine-next">Next ▸</button>
      {shot === shots.length - 1 && act + 1 < scene.acts.length && <button type="button" className="ui-btn" onClick={() => { clear(); audio.current?.pause(); setAct(act + 1); setShot(0); setLine(0); setOut(null); setPlaying(true); }} data-testid="sg-cine-nextact">Next act: {scene.acts[act + 1]!.title} ▸</button>}
      <button type="button" className="ui-btn" onClick={() => { audio.current?.pause(); clear(); onClose(); }} data-testid="sg-cine-close">Back to the written story</button>
    </div>
  </section>;
}
