/**
 * Two of the standalone's keyboard and reading behaviours (read as text 18 Nov 2026; SIGNAL_INVENTORY §4 “Keyboard”):
 *  - ArtZoom: any panel drawing (and the cover) opens full-width in a scrollable viewer, “🔍 Enlarged · scroll to explore”, with its
 *    description under it; on a phone held upright the picture turns sideways to fill the screen, as the reference does. Escape, the
 *    close button or a tap on the backdrop around the picture closes it, and focus returns to where it was. The rotation is drawn in SVG (no style
 *    attributes), the picture is a copy of the panel's own drawing.
 *  - arrowKeys: in a group of options, the arrow keys move focus to the next or previous option and wrap, as the reference's tiles.
 */
import { useEffect, useRef, type KeyboardEvent } from 'react';

export interface ZoomPic { svg: string; alt: string }
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/** take a copy of the drawing under a click, or null when the click was on a control or not on art */
export function zoomFrom(target: EventTarget | null, sel = '.sg-panel .sg-art, .tp-cover'): ZoomPic | null {
  const t = target as Element | null; if (!t || !t.closest) return null;
  if (t.closest('a,button,input,select,label,textarea')) return null;
  const art = t.closest(sel); const svg = art?.querySelector('svg'); if (!art || !svg) return null;
  const title = svg.querySelector('title')?.textContent || art.getAttribute('aria-label') || '';
  const c = svg.cloneNode(true) as SVGSVGElement; c.removeAttribute('style'); c.removeAttribute('class');
  const vb = svg.viewBox?.baseVal; const vw = (vb && vb.width) || 800, vh = (vb && vb.height) || 480;
  if (!c.getAttribute('viewBox')) c.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  const AW = window.innerWidth - 32, AH = window.innerHeight - 130, sN = AW / vw, sR = Math.min(AH / vw, AW / vh);
  if (sR > sN * 1.25) {   // a phone held upright: turn the picture sideways so it fills the screen (the reference's rule)
    c.setAttribute('width', String(vw)); c.setAttribute('height', String(vh)); c.setAttribute('x', '0'); c.setAttribute('y', '0');
    return { alt: title, svg: `<svg xmlns="http://www.w3.org/2000/svg" class="sg-zoom__pic sg-zoom__pic--rot" viewBox="0 0 ${vh} ${vw}" width="${Math.round(vh * sR)}" height="${Math.round(vw * sR)}" role="img" aria-label="${title.replace(/[&<>"]/g, (x) => ESC[x]!)}"><g transform="translate(${vh} 0) rotate(90)">${c.outerHTML}</g></svg>` };
  }
  c.setAttribute('class', 'sg-zoom__pic'); c.removeAttribute('width'); c.removeAttribute('height');
  return { alt: title, svg: c.outerHTML };
}

export function ArtZoom({ pic, onClose }: { pic: ZoomPic; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null); const back = useRef<Element | null>(null);
  useEffect(() => { back.current = document.activeElement; close.current?.focus(); document.body.classList.add('zooming');
    return () => { document.body.classList.remove('zooming'); (back.current as HTMLElement | null)?.focus?.({ preventScroll: true }); }; }, []);
  return <div className="sg-zoom" role="dialog" aria-modal="true" aria-label="Enlarged picture" data-testid="story-zoom"
    onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } else if (e.key === 'Tab') { e.preventDefault(); close.current?.focus(); } }}
    onClick={(e) => { const t = e.target as Element; if (t === e.currentTarget || t.classList?.contains('sg-zoom__box')) onClose(); }}>
    <div className="sg-zoom__bar"><span>🔍 Enlarged · scroll to explore</span><button ref={close} type="button" className="ui-btn" onClick={onClose} data-testid="story-zoom-close">✕ Close</button></div>
    <div className="sg-zoom__box"><div dangerouslySetInnerHTML={{ __html: pic.svg }} />{pic.alt ? <p className="sg-zoom__alt">{pic.alt}</p> : null}</div>
  </div>;
}

/** arrow keys move focus between the buttons of an option group, wrapping at the ends */
export function arrowKeys(e: KeyboardEvent<HTMLElement>) {
  const k = e.key; if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(k)) return;
  const bs = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])')]; const i = bs.indexOf(document.activeElement as HTMLButtonElement); if (i < 0 || !bs.length) return;
  e.preventDefault(); bs[(k === 'ArrowDown' || k === 'ArrowRight' ? i + 1 : i - 1 + bs.length) % bs.length]!.focus();
}
