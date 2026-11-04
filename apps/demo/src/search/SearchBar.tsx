/**
 * The search bar of the demonstration (header): an ARIA 1.2 combobox over the demo-wide index (find.ts). Arrow keys move, Enter opens,
 * Escape closes; Enter with nothing highlighted opens the full results page (#/find?q=…). Results are announced politely.
 */
import { useId, useMemo, useRef, useState, type RefObject } from 'react';
import { find, type Hit } from './find.js';
import { Notice } from '@empathia/ui';

const KIND: Record<Hit['kind'], string> = { room: 'Room', building: 'Building', device: 'Device', product: 'Product', page: 'Page', tour: 'Tour' };

/** `hero`: Mission Control's Search Party bar — Enter with nothing highlighted asks Search Party (#/search?q=…) instead of the results page. */
export function SearchBar({ hero, placeholder, label = 'Search the demonstration', inputRef }: { hero?: boolean; placeholder?: string; label?: string; inputRef?: RefObject<HTMLInputElement | null> } = {}) {
  const id = useId(); const [q, setQ] = useState(''); const [open, setOpen] = useState(false); const [act, setAct] = useState(-1);
  const hits = useMemo(() => (q.trim() ? find(q, 8) : []), [q]);
  const own = useRef<HTMLInputElement>(null); const box = inputRef || own;
  const go = (href: string) => { setOpen(false); setAct(-1); setQ(''); location.hash = href; box.current?.blur(); };
  const submit = () => { if (act >= 0 && hits[act]) go(hits[act]!.href); else if (q.trim()) go(`${hero ? '#/search' : '#/find'}?q=${encodeURIComponent(q.trim().slice(0, 80))}`); };
  return (
    <div className={`sbar${hero ? ' sbar--hero' : ''}`} role="search" data-testid={hero ? 'hero-search' : 'searchbar'}>
      <label htmlFor={`${id}-q`} className="ui-visually-hidden">{label}</label>
      <input ref={box} id={`${id}-q`} className="sbar__input" type="search" role="combobox" aria-expanded={open && hits.length > 0} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={act >= 0 ? `${id}-o${act}` : undefined}
        value={q} placeholder={placeholder || 'Search rooms, devices, products…'} autoComplete="off" spellCheck={false} maxLength={80}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setAct(-1); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setAct((a) => Math.min(hits.length - 1, a + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setAct((a) => Math.max(-1, a - 1)); }
          else if (e.key === 'Enter') { e.preventDefault(); submit(); }
          else if (e.key === 'Escape') { if (open) { e.preventDefault(); setOpen(false); setAct(-1); } else setQ(''); }
        }} />
      <ul id={`${id}-list`} role="listbox" aria-label="Suggestions" className="sbar__list" hidden={!open || !hits.length}>
        {hits.map((h, i) => <li key={h.id} id={`${id}-o${i}`} role="option" aria-selected={i === act} className={i === act ? 'on' : ''} onMouseDown={(e) => { e.preventDefault(); go(h.href); }}><span className="sbar__kind">{KIND[h.kind]}</span><b>{h.label}</b><span className="ui-meta">{h.description}</span></li>)}
      </ul>
      <span className="ui-visually-hidden" role="status" aria-live="polite">{open && q.trim() ? (hits.length ? `${hits.length} suggestion${hits.length === 1 ? '' : 's'}` : 'No suggestion') : ''}</span>
    </div>
  );
}

export function FindPage({ hash }: { hash: string }) {
  const q = new URLSearchParams(/\?(.*)$/.exec(hash)?.[1] || '').get('q') || '';
  const hits = useMemo(() => find(q, 60), [q]);
  const groups = (['room', 'product', 'tour', 'building', 'device', 'page'] as const).map((k) => [k, hits.filter((h) => h.kind === k)] as const).filter(([, l]) => l.length);
  return (
    <section className="fnd" data-native="" data-testid="find-page">
      <header className="room__hero"><p className="kicker">Search</p><h1>{q ? <>Results for “{q}”</> : 'Search the demonstration'}</h1>
      <div className="fnd__bar"><SearchBar /></div></header>
      <p className="ui-muted" role="status">{q ? `${hits.length} result${hits.length === 1 ? '' : 's'}` : 'Type in the search bar: a room (“4.218”, “boardroom”), a device (“tv”, “mic”), a product or a question word (“who supports”).'}</p>
      {q && !hits.length && <Notice tone="info">Nothing matches “{q}”. Try a room number such as 4.218, a device such as “camera”, or a product such as “Search Party”. For relationships, open <a href={`#/search?q=${encodeURIComponent(q)}`}>Search Party with this text</a>.</Notice>}
      {groups.map(([k, l]) => <div key={k} className="fnd__group"><h2 className="build__h">{KIND[k]}s ({l.length})</h2><ul className="fnd__list">{l.map((h) => <li key={h.id}><a href={h.href}><b>{h.label}</b><span className="ui-muted">{h.description}</span>{h.why && <span className="ui-meta">alias {h.why}</span>}</a></li>)}</ul></div>)}
    </section>
  );
}
