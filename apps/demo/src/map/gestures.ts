/**
 * One way to move every map and 3D world on the page (founder, 20 Nov 2026 05:34: "the campus maps and maps everything in general are a
 * little too sensitive especially for mobile users it's hard to scroll down to the page"; and of Expo LIVE: hard to move around).
 *
 * On the page, a picture never takes the page's own gestures. That is the pattern people know from maps on other websites:
 *   - Touch: one finger scrolls the page as it does anywhere else; two fingers move the picture (pinch to zoom, twist to turn, move
 *     together to pan or orbit). A finger that tries to drag the picture gets a short hint saying so.
 *   - Mouse: drag moves the picture (pan or orbit, as the picture prefers; right-drag or Shift-drag does the other). The plain wheel
 *     scrolls the page; Ctrl or ⌘ with the wheel zooms, as does a trackpad pinch (browsers send it that way). A hint says so.
 *   - A tap or click opens what is under it only if the finger or mouse barely moved (10 px for a finger, 5 for a mouse) and was quick;
 *     a drag never opens anything.
 * Full screen (the picture's own button) makes the picture "greedy": one finger and the plain wheel move it, as a game or a maps app
 * would; Escape or Done leaves it.
 *
 * attach() works on any element (a canvas, a stage); it uses pointer events for the mouse and pen, and touch events for fingers so that
 * the page can keep one-finger scrolling while two-finger gestures are taken (touch-action: pan-x pan-y in CSS; none when greedy).
 */
export type Hint = 'touch' | 'wheel' | null;
export interface GestureTarget {
  /** a one-finger (greedy) or mouse drag in the picture's preferred sense, in CSS pixels */
  drag(dx: number, dy: number): void;
  /** the other sense: right-drag, Shift-drag, or two fingers moving together */
  alt?(dx: number, dy: number): void;
  /** zoom by a factor (< 1 nearer), about a screen point */
  zoom(f: number, x: number, y: number): void;
  /** a two-finger twist, in radians */
  twist?(da: number): void;
  /** a tap or click that barely moved */
  tap?(x: number, y: number): void;
  /** show or clear the hint */
  hint?(h: Hint): void;
}
export interface GestureOptions { greedy: () => boolean; twoFingerMove?: 'alt' | 'drag' }

export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
export const hintText = (h: Hint) => h === 'touch' ? 'Use two fingers to move the picture, or open it full screen.' : h === 'wheel' ? `Hold ${isMac() ? '⌘' : 'Ctrl'} and scroll to zoom.` : '';

export function attach(el: HTMLElement, t: GestureTarget, o: GestureOptions): () => void {
  let hintTimer = 0; const say = (h: Hint) => { if (!t.hint) return; t.hint(h); clearTimeout(hintTimer); if (h) hintTimer = window.setTimeout(() => t.hint!(null), 1600); };
  // ---- mouse and pen ------------------------------------------------------------------------------------------------------------
  let m: { id: number; x: number; y: number; x0: number; y0: number; alt: boolean; moved: number; at: number } | null = null;
  const pd = (e: PointerEvent) => { if (e.pointerType === 'touch') return; if (e.button !== 0 && e.button !== 2) return;
    m = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, alt: e.button === 2 || e.shiftKey || e.ctrlKey, moved: 0, at: performance.now() };
    try { el.setPointerCapture(e.pointerId); } catch { /* a synthetic pointer */ } };
  const pm = (e: PointerEvent) => { if (!m || e.pointerId !== m.id) return; const dx = e.clientX - m.x, dy = e.clientY - m.y; m.x = e.clientX; m.y = e.clientY; m.moved = Math.max(m.moved, Math.hypot(e.clientX - m.x0, e.clientY - m.y0));
    if (m.moved < 3) return; if (m.alt && t.alt) t.alt(dx, dy); else t.drag(dx, dy); };
  const pu = (e: PointerEvent) => { if (!m || e.pointerId !== m.id) return; const r = el.getBoundingClientRect(); if (e.type === 'pointerup' && m.moved < 5 && !m.alt && performance.now() - m.at < 700) t.tap?.(e.clientX - r.left, e.clientY - r.top); m = null; };
  const wh = (e: WheelEvent) => { if (!(o.greedy() || e.ctrlKey || e.metaKey)) { say('wheel'); return; } e.preventDefault(); const r = el.getBoundingClientRect(); t.zoom(Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0014)), e.clientX - r.left, e.clientY - r.top); };
  const menu = (e: Event) => e.preventDefault();
  // ---- fingers --------------------------------------------------------------------------------------------------------------------
  let f: { x0: number; y0: number; x: number; y: number; at: number; moved: number; hinted: boolean } | null = null; let two: { d: number; a: number; mx: number; my: number } | null = null;
  const pair = (ts: TouchList) => { const a = ts[0]!, b = ts[1]!; return { d: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY), a: Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX), mx: (a.clientX + b.clientX) / 2, my: (a.clientY + b.clientY) / 2 }; };
  const ts = (e: TouchEvent) => { if (e.touches.length >= 2) { e.preventDefault(); two = pair(e.touches); f = null; return; } const p = e.touches[0]!; f = { x0: p.clientX, y0: p.clientY, x: p.clientX, y: p.clientY, at: performance.now(), moved: 0, hinted: false }; if (o.greedy()) e.preventDefault(); };
  const tm = (e: TouchEvent) => {
    if (e.touches.length >= 2) { e.preventDefault(); const n = pair(e.touches); const r = el.getBoundingClientRect();
      if (two) { t.zoom(two.d / Math.max(1, n.d), n.mx - r.left, n.my - r.top); let da = n.a - two.a; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; t.twist?.(da); const dx = n.mx - two.mx, dy = n.my - two.my; if ((o.twoFingerMove || 'alt') === 'alt' && t.alt) t.alt(dx, dy); else t.drag(dx, dy); }
      two = n; return; }
    if (!f) return; const p = e.touches[0]!; const dx = p.clientX - f.x, dy = p.clientY - f.y; f.x = p.clientX; f.y = p.clientY; f.moved = Math.max(f.moved, Math.hypot(p.clientX - f.x0, p.clientY - f.y0));
    if (o.greedy()) { e.preventDefault(); if (f.moved >= 4) t.drag(dx, dy); return; }
    if (f.moved > 14 && !f.hinted) { f.hinted = true; say('touch'); }   // the page scrolls; the picture says how to move it
  };
  const te = (e: TouchEvent) => { if (e.touches.length < 2) two = null;
    if (f && e.touches.length === 0) { const c = e.changedTouches[0]; if (c && f.moved < 10 && performance.now() - f.at < 600) { const r = el.getBoundingClientRect(); if (e.cancelable) e.preventDefault(); t.tap?.(c.clientX - r.left, c.clientY - r.top); } f = null; } };
  const tc = () => { f = null; two = null; };
  el.addEventListener('pointerdown', pd); el.addEventListener('pointermove', pm); el.addEventListener('pointerup', pu); el.addEventListener('pointercancel', pu);
  el.addEventListener('wheel', wh, { passive: false }); el.addEventListener('contextmenu', menu);
  el.addEventListener('touchstart', ts, { passive: false }); el.addEventListener('touchmove', tm, { passive: false }); el.addEventListener('touchend', te, { passive: false }); el.addEventListener('touchcancel', tc);
  return () => { clearTimeout(hintTimer); el.removeEventListener('pointerdown', pd); el.removeEventListener('pointermove', pm); el.removeEventListener('pointerup', pu); el.removeEventListener('pointercancel', pu);
    el.removeEventListener('wheel', wh); el.removeEventListener('contextmenu', menu); el.removeEventListener('touchstart', ts); el.removeEventListener('touchmove', tm); el.removeEventListener('touchend', te); el.removeEventListener('touchcancel', tc); };
}

/** Full screen for a picture: the element fills the window (not the browser's Fullscreen API, which phones do not all offer for an
 *  element); Escape leaves; the page behind does not scroll. Returns the new state. */
export function setFull(el: HTMLElement | null, on: boolean): boolean {
  if (!el) return false; el.classList.toggle('is-full', on); document.documentElement.classList.toggle('has-full', on);
  window.dispatchEvent(new Event('resize')); return on;
}
