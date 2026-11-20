/**
 * The room passport as a sheet over the room (V2.5.3 opened it over the room; 13 Nov 2026, founder: "I want the room passport available
 * without losing the current room, camera view, or spatial context"). The room stays where it is underneath: the camera, the selection
 * and the tab are untouched, and closing the sheet returns focus to what opened it. A modal dialog: Escape closes it, Tab stays inside it,
 * and the address carries ?sheet=passport so a link opens the room with its passport open.
 */
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Icon } from '@empathia/ui';

type BodyProps = { role: string; type: string; id: string; headingId?: string };
let loaded: ComponentType<BodyProps> | null = null;

export function PassportSheet({ role, roomId, name, onClose }: { role: string; roomId: string; name: string; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null); const opener = useRef<Element | null>(null);
  // the passport's code loads with the sheet, not with the room
  const [Body, setBody] = useState<ComponentType<BodyProps> | null>(() => loaded);
  useEffect(() => { if (Body) return; let live = true; void import('../parity/Records.js').then((m) => { loaded = m.PassportBody as ComponentType<BodyProps>; if (live) setBody(() => loaded); }); return () => { live = false; }; }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (Body) setTimeout(() => box.current?.querySelector<HTMLElement>('#lite-passport-h')?.focus(), 30); }, [Body]);
  useEffect(() => {
    opener.current = document.activeElement;
    const t = setTimeout(() => (box.current?.querySelector<HTMLElement>('#lite-passport-h') || box.current?.querySelector<HTMLElement>('button'))?.focus(), 60);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab' || !box.current) return;
      const f = [...box.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex="0"],input,select,textarea')].filter((x) => x.offsetParent !== null);
      if (!f.length) return; const first = f[0]!, last = f[f.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || !box.current.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { clearTimeout(t); document.removeEventListener('keydown', key); const o = opener.current as HTMLElement | null; if (o && document.contains(o)) o.focus({ preventScroll: true }); };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="lt-sheet" data-testid="lite-passport-sheet">
    <button type="button" className="lt-sheet__scrim" aria-label="Close the room passport" tabIndex={-1} onClick={onClose} />
    <div ref={box} className="lt-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="lite-passport-h">
      <div className="lt-sheet__bar"><span className="ui-meta">{name} · the room stays as you left it</span>
        <a className="ui-btn ui-btn--small ui-btn--quiet" href={`#/list/Room/${roomId}`} data-testid="lite-passport-page">Open as a page</a>
        <button type="button" className="ui-btn ui-btn--small" onClick={onClose} data-testid="lite-passport-close"><Icon name="close" size={16} /> Close</button></div>
      {Body ? <Body role={role} type="Room" id={roomId} headingId="lite-passport-h" /> : <p className="ui-meta" role="status">Opening the passport…</p>}
    </div>
  </div>;
}
