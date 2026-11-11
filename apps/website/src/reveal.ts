// The founder page's ten-second introduction (dist/founder.js, loaded in <head> on /founder only, so the first paint is already the
// opening frame). The picture itself is drawn by the stylesheet (src/styles/founder.css): this script only decides WHEN.
//   <html data-fr="armed">   the opening frame, held still until the plate is meaningfully in view
//   <html data-fr="run">     the sequence is playing (ten seconds, timed by the stylesheet's own clock animation)
//   <html data-fr="paused">  held where it is
//   no attribute             the resting composition: what a visitor sees with no script, with reduced motion, or after the sequence
// It plays once per browser session (sessionStorage, guarded). It adds no listener for keys or scrolling, moves no focus except when
// the button under the pointer is withdrawn, and sets no inline style (the site's policy forbids them).
const root = document.documentElement; const KEY = 'empathia.founderReveal';
const still = matchMedia('(prefers-reduced-motion: reduce)');
let played = false; try { played = sessionStorage.getItem(KEY) === '1'; } catch { /* storage unavailable: it plays once per page */ }
const able = 'IntersectionObserver' in window;
if (able && !still.matches && !played) root.setAttribute('data-fr', 'armed');

const wire = () => {
  const box = document.querySelector<HTMLElement>('[data-reveal]'); const ctl = box?.querySelector<HTMLElement>('[data-reveal-ctl]');
  const toggle = box?.querySelector<HTMLButtonElement>('[data-reveal-toggle]'); const word = toggle?.querySelector<HTMLElement>('[data-reveal-word]'); const replay = box?.querySelector<HTMLButtonElement>('[data-reveal-replay]');
  if (!box || !ctl || !toggle || !word || !replay || !able) { root.removeAttribute('data-fr'); return; }
  const state = () => root.getAttribute('data-fr');
  const paint = () => {
    const s = state(); const live = s === 'run' || s === 'paused';
    ctl.hidden = still.matches || s === 'armed';   // nothing to control: no controls
    if (!live && document.activeElement === toggle) replay.focus();
    toggle.hidden = !live; word.textContent = s === 'paused' ? 'Play' : 'Pause';
  };
  const start = () => { try { sessionStorage.setItem(KEY, '1'); } catch { /* it still plays */ } root.setAttribute('data-fr', 'run'); paint(); };
  const rest = () => { root.removeAttribute('data-fr'); paint(); };
  box.addEventListener('animationend', (e) => { if (e.target === box && e.animationName === 'rv-clock') rest(); });
  toggle.addEventListener('click', () => { root.setAttribute('data-fr', state() === 'paused' ? 'run' : 'paused'); paint(); });
  replay.addEventListener('click', () => { root.removeAttribute('data-fr'); void box.offsetWidth; start(); });   // the reflow lets every animation begin again
  still.addEventListener('change', () => { if (still.matches) rest(); else paint(); });
  if (state() === 'armed') {
    // at least half of the plate in view; or, on a screen too short for that, the plate filling most of it; or the name itself fully in view
    const name = document.querySelector('[data-founder="founder"] .founder__name');
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const seen = e.target === box ? e.intersectionRatio >= 0.5 || (!!e.rootBounds && e.intersectionRect.height >= 0.6 * e.rootBounds.height) : e.intersectionRatio >= 0.99;
        if (seen) { io.disconnect(); if (state() === 'armed') start(); return; }
      }
    }, { threshold: [0.25, 0.5, 0.75, 0.99] });
    // watch only once the page has loaded: the photograph is there to be lit, and a link to a section further down has already scrolled
    const watch = () => { io.observe(box); if (name) io.observe(name); };
    if (document.readyState === 'complete') watch(); else addEventListener('load', watch, { once: true });
  }
  paint();
};
const ready = () => { try { wire(); } catch { root.removeAttribute('data-fr'); } };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
