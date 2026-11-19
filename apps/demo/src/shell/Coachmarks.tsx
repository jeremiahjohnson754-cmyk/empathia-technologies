/**
 * Coach marks (founder, 19 Nov 2026 09:16): "little UX pop-ups ... for the role selector icon and the field tools wrench icon to show
 * people hey tap this to do this ... that goes away but after a few seconds of interactivity".
 *
 * Two small tips, one after the other, each pointing at its control in the header:
 *   1. View as: switch the role the platform is shown as;
 *   2. Field Tools (only where the role has the wrench): the site-walk calculators.
 * They start a few seconds after the visitor first interacts with the page (never on a cold load), each goes away by itself after a few
 * seconds, on "Got it", on Escape, or when its control is used, and each is shown once per visitor (browser storage, read and written
 * in try/catch: without storage they show once per page load). They never take focus, never cover their own control, wait while a
 * dialog is open or a film is playing, and do not animate for a visitor who asks for reduced motion.
 *
 * Automated browsers (navigator.webdriver) do not get them unless the address asks with coach=show, so a scripted walk through the
 * other pages is not interrupted by a tip; tests/browser/demo-coach.test.mjs checks them with coach=show.
 */
import { useEffect, useRef, useState } from 'react';

const KEY = 'empathia.demo.coach.v1';
const START_AFTER_MS = 3000;   // after the first interaction
const SHOW_MS = 8000;          // each tip stays this long unless dismissed
const GAP_MS = 1200;           // between the two tips

type TipId = 'viewas' | 'fieldtools';
interface Tip { id: TipId; target: string; title: string; body: string }
const TIPS: readonly Tip[] = [
  { id: 'viewas', target: '[data-testid=viewas-open]', title: 'See it as someone else', body: 'Tap here to switch roles: an executive, a service engineer, a visitor. Each sees only what that role may open.' },
  { id: 'fieldtools', target: '[data-testid=shell-fieldtools]', title: 'Field Tools for the site walk', body: 'Tap the wrench for the calculators you use on site: projector throw, SPL, PoE budget, cable loss and more, each with its formula and working.' },
];

const memory = new Set<TipId>();   // what was shown in this page load, for a browser without storage
function seen(): Set<TipId> {
  const s = new Set<TipId>(memory);
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(v)) for (const x of v) s.add(x); } catch { /* no storage: this page load only */ }
  return s;
}
function markSeen(id: TipId) {
  memory.add(id);
  try { const s = seen(); s.add(id); localStorage.setItem(KEY, JSON.stringify([...s])); } catch { /* no storage */ }
}
const wanted = (hash: string) => /[?&]coach=show\b/.test(hash) || !(typeof navigator !== 'undefined' && (navigator as Navigator & { webdriver?: boolean }).webdriver);
/** Something else has the visitor's attention: a dialog, an open sheet, or a film. */
const busy = () => !!document.querySelector('[role=dialog][aria-modal=true], dialog[open]') || /^#\/film\//.test(location.hash);
const visible = (el: Element | null): el is HTMLElement => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; };

export function Coachmarks({ hash, role }: { hash: string; role: string }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const [on] = useState(() => wanted(hash));   // decided once, on arrival: later addresses do not carry coach=show
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  const clear = () => { timers.current.forEach((t) => clearTimeout(t)); timers.current = []; };
  const close = (i: number) => { clear(); setTip(null); later(() => show.current(i + 1), GAP_MS); };
  // the queue: the first tip not yet seen whose control is on screen; a dialog or a film makes it wait
  const show = useRef<(from: number) => void>(() => undefined);
  show.current = (from) => {
    const done = seen();
    const i = TIPS.findIndex((t, k) => k >= from && !done.has(t.id));
    const t = TIPS[i];
    if (!t) { setTip(null); return; }
    if (!visible(document.querySelector(t.target))) { show.current(i + 1); return; }   // this role has no wrench: skip it
    if (busy()) { later(() => show.current(from), 2000); return; }
    markSeen(t.id); setTip(t); later(() => close(i), SHOW_MS);
  };

  // started by the visitor's first interaction, never by a cold load
  useEffect(() => {
    if (!on) return;
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    const off = () => evs.forEach((e) => window.removeEventListener(e, start));
    function start() { off(); later(() => show.current(0), START_AFTER_MS); }
    evs.forEach((e) => window.addEventListener(e, start, { passive: true }));
    return () => { off(); clear(); };
  }, [on]);

  // a role change can remove the wrench: a tip whose control is gone goes with it
  useEffect(() => { if (tip && !visible(document.querySelector(tip.target))) close(TIPS.indexOf(tip)); }, [role]);

  // using the control or pressing Escape dismisses the tip and moves on
  useEffect(() => {
    if (!tip) return;
    const i = TIPS.indexOf(tip); const el = document.querySelector(tip.target);
    const used = () => close(i); const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(i); };
    el?.addEventListener('click', used); window.addEventListener('keydown', onKey);
    return () => { el?.removeEventListener('click', used); window.removeEventListener('keydown', onKey); };
  }, [tip]);

  if (!tip) return null;
  return <Bubble key={tip.id} tip={tip} onClose={() => close(TIPS.indexOf(tip))} />;
}

function Bubble({ tip, onClose }: { tip: Tip; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; arrow: number } | null>(null);
  useEffect(() => {
    const place = () => {
      const el = document.querySelector(tip.target); const me = ref.current;
      if (!el || !me) return;
      const r = el.getBoundingClientRect(); const w = me.offsetWidth; const m = 8;
      const cx = r.left + r.width / 2;
      const left = Math.max(m, Math.min(innerWidth - w - m, cx - w / 2));
      setPos({ top: Math.round(r.bottom + 12), left: Math.round(left), arrow: Math.round(Math.max(16, Math.min(w - 16, cx - left))) });
    };
    place();
    window.addEventListener('resize', place); window.addEventListener('scroll', place, { passive: true });
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place); };
  }, [tip]);
  return (
    <div ref={ref} className="coach" data-testid="coach" data-tip={tip.id} role="note" aria-live="polite" aria-label={`Tip: ${tip.title}`}
      style={pos ? { top: pos.top, left: pos.left, ['--arrow' as string]: `${pos.arrow}px` } : { visibility: 'hidden', top: 0, left: 0 }}>
      <b className="coach__t">{tip.title}</b>
      <span className="coach__b">{tip.body}</span>
      <button type="button" className="coach__ok" onClick={onClose} data-testid="coach-ok">Got it</button>
    </div>
  );
}
