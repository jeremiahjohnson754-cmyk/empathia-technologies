/**
 * The runner for tours A, B and C: a persistent panel (docked at the bottom on phones) with previous / next, pause and resume, skip to a
 * stop, and exit; ← / → move between stops and Esc exits while the panel has focus. Each stop is announced politely; focus moves to the
 * panel at a stop change without trapping it. The stop's element is outlined (no animation under reduced motion). Narration plays only
 * from a VERIFIED take, muted until the visitor presses play, with captions and a transcript.
 */
import { useEffect, useRef, useState } from 'react';
import { Button, Tag } from '@empathia/ui';
import { TOURS, NARRATION, tourByKey, type Tour } from './tours.js';
import { NATIVE, areaKey } from '../registry.js';
import { resolve } from '../registry.pages.js';

const KEY = 'empathia.demo.guided.v1';
interface Run { tour: Tour['key']; i: number; paused: boolean }
const load = (): Run | null => { try { const v = JSON.parse(sessionStorage.getItem(KEY) || 'null') as Run | null; const t = v && typeof v === 'object' ? tourByKey(v.tour) : undefined; return t && Number.isInteger(v!.i) && v!.i >= 0 && v!.i < t.stops.length ? v : null; } catch { return null; } };   // a stop outside the tour is no tour (SA-09)
const save = (r: Run | null) => { try { if (r) sessionStorage.setItem(KEY, JSON.stringify(r)); else sessionStorage.removeItem(KEY); } catch { /* storage unavailable: the tour lasts the page */ } };
export const stopNative = (href: string) => !!resolve(href) || NATIVE.has(areaKey(href));

export function GuidedPanel({ hash }: { hash: string }) {
  const [run, setRun] = useState<Run | null>(load);
  const panel = useRef<HTMLElement>(null);
  // #/tours/a|b|c[?stop=n] starts (or restarts) a tour
  useEffect(() => { const m = /^#\/tours\/([abc])(?:\?stop=(\d+))?$/.exec(hash); if (m) { const t = tourByKey(m[1]!)!; const i = Math.min(t.stops.length - 1, Math.max(0, Number(m[2] || 1) - 1)); goto({ tour: t.key, i, paused: false }); } }, [hash]);   // eslint-disable-line react-hooks/exhaustive-deps
  const t = run ? tourByKey(run.tour)! : null; const s = t && run ? t.stops[run.i]! : null;
  const goto = (r: Run) => { setRun(r); save(r); const st = tourByKey(r.tour)!.stops[r.i]!; if (location.hash !== st.href) location.hash = st.href; setTimeout(() => panel.current?.focus({ preventScroll: true }), 50); };
  const exit = () => { setRun(null); save(null); };
  // outline the stop's element once it is on the page
  useEffect(() => {
    if (!s?.spot || run?.paused) return;
    let n = 0; let el: Element | null = null;
    const tick = setInterval(() => { el = document.querySelector(`[data-testid="${s.spot}"]`); if (el || ++n > 20) { clearInterval(tick); if (el) { el.classList.add('tour-spot'); const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); } } }, 100);
    return () => { clearInterval(tick); document.querySelectorAll('.tour-spot').forEach((x) => x.classList.remove('tour-spot')); };
  }, [s?.spot, s?.id, run?.paused, hash]);
  if (!run || !t || !s) return null;
  const last = run.i === t.stops.length - 1; const native = stopNative(s.href); const take = s.narration ? NARRATION[s.narration] : undefined;
  return (
    <aside ref={panel} tabIndex={-1} className={`tour guided${run.paused ? ' paused' : ''}`} aria-label={t.title} data-testid="guided"
      onKeyDown={(e) => { if ((e.target as HTMLElement).closest('audio, input, select, textarea')) return; if (e.key === 'ArrowRight' && !last) { e.preventDefault(); goto({ ...run, i: run.i + 1, paused: false }); } else if (e.key === 'ArrowLeft' && run.i > 0) { e.preventDefault(); goto({ ...run, i: run.i - 1, paused: false }); } else if (e.key === 'Escape') { e.preventDefault(); exit(); } }}>
      <div className="tour__head"><span className="tour__k">{t.title} · stop {run.i + 1} of {t.stops.length}</span>{run.paused && <Tag tone="muted">paused</Tag>}{!native && <Tag tone="warn">address without its own page</Tag>}</div>
      <p className="ui-visually-hidden" role="status" aria-live="polite">{`Stop ${run.i + 1} of ${t.stops.length}: ${s.title}${run.paused ? ', paused' : ''}`}</p>
      {!run.paused && <>
        <h2 className="tour__title">{s.title}</h2>
        <p className="tour__text">{s.text}</p>
        {!native && <p className="ui-meta">This stop’s address has no page of its own; it lands on the address map instead of pretending.</p>}
        {take && <Narration id={s.narration!} />}
      </>}
      <div className="tour__acts">
        <Button small onClick={() => goto({ ...run, i: run.i - 1, paused: false })} disabled={run.i === 0}>Previous</Button>
        {last ? <Button small kind="primary" onClick={exit}>Finish · explore freely</Button> : <Button small kind="primary" onClick={() => goto({ ...run, i: run.i + 1, paused: false })}>Next</Button>}
        <Button small kind="quiet" onClick={() => { const r = { ...run, paused: !run.paused }; setRun(r); save(r); }}>{run.paused ? 'Resume' : 'Pause'}</Button>
        <label className="tour__skip">Skip to <select value={run.i} onChange={(e) => goto({ ...run, i: Number(e.target.value), paused: false })}>{t.stops.map((x, i) => <option key={x.id} value={i}>{x.id} · {x.title}</option>)}</select></label>
        <Button small kind="quiet" onClick={exit}>Exit tour</Button>
      </div>
    </aside>
  );
}

function Narration({ id }: { id: string }) {
  const n = NARRATION[id]!; const [failed, setFailed] = useState(false);
  return (
    <div className="narr" data-testid="narration">
      {failed ? <p className="ui-meta">The narration audio could not be loaded; the transcript below is the same words.</p> :
        <audio controls preload="none" src={n.src} onError={() => setFailed(true)} aria-label="Narration of this stop"><track kind="captions" src={n.captions} srcLang="en" label="English" default /></audio>}
      <details><summary>Transcript</summary><p>{n.transcript}</p></details>
      <p className="ui-meta">{n.voice}</p>
    </div>
  );
}

export function ToursPage() {
  return (
    <section className="tours" data-native="" data-testid="tours-index">
      <p className="kicker">Guided experiences</p><h1>Three tours, or explore on your own</h1>
      <p className="ui-muted">Each tour can be paused, resumed, skipped and left at any stop. Nothing in the demonstration needs a tour.</p>
      <ul className="tours__list">{TOURS.map((t) => <li key={t.key}><a href={`#/tours/${t.key}`} className="campus__card" data-testid={`tour-start-${t.key}`}><b>{t.title}</b><span className="ui-muted">{t.goal}</span><span className="ui-meta">{t.audience} · {t.stops.length} stops</span></a></li>)}</ul>
      <h2 className="build__h">Or start where you are</h2>
      <ul className="tours__free"><li><a href="#/campus">Walk the campus</a> — for a first look</li><li><a href="#/v25/exec">Executive intelligence</a> — for executives</li><li><a href={'#/search/scenarios'}>Search Party scenarios</a> — for engineers</li><li><a href="#/tours/investor">The seven investor scenarios</a></li></ul>
    </section>
  );
}
