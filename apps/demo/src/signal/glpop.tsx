/**
 * The glossary pop-over (reference ladder.js glPop), shared by the story and Learn's lesson cards (18 Nov 2026): the term, its domain and
 * definition, the first formula it names, where it is first met, and the way to the glossary. The glossary index ships beside the
 * bundle (signal/glossary.json) and is fetched once.
 */
import { useEffect, useRef, useState } from 'react';
import type { GlossaryIndex, Term } from './glossary.js';
import { LiteTryCard } from './LiteTry.js';
import { liteForTerm } from './lite.js';

let glCache: Promise<GlossaryIndex> | null = null;
export const loadGlossary = () => (glCache ||= fetch('signal/glossary.json').then((r) => { if (!r.ok) throw new Error(`signal/glossary.json ${r.status}`); return r.json() as Promise<GlossaryIndex>; }).catch((e) => { glCache = null; throw e; }));

/** The pop-over (ladder.js glPop): the term, its domain and definition, the first formula it names, where it is first met. */
export function GlPop({ g, at, gl, onClose, role }: { g: Term; at: HTMLElement; gl: GlossaryIndex; onClose: () => void; role: string }) {
  const ref = useRef<HTMLDivElement>(null); const x = useRef<HTMLButtonElement>(null); const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  useEffect(() => { const r = at.getBoundingClientRect(), w = Math.min(340, window.innerWidth - 24), left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left)); const h = ref.current?.offsetHeight || 180, below = r.bottom + 8;
    setPos({ left, width: w, top: below + h < window.innerHeight - 8 ? below : Math.max(8, r.top - h - 8) }); x.current?.focus(); }, [g, at]);
  useEffect(() => { const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node) && e.target !== at) onClose(); }; const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const away = () => onClose(); document.addEventListener('mousedown', down); document.addEventListener('keydown', key); window.addEventListener('hashchange', away);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); window.removeEventListener('hashchange', away); }; }, [at, onClose]);
  const F = g.f[0] ? gl.formulas[g.f[0]] : undefined;
  return <div ref={ref} className="sg-glpop" role="dialog" aria-label={`Glossary: ${g.term}`} data-testid="story-glpop" style={pos ? { left: pos.left, top: pos.top, width: pos.width } : { left: 12, top: -9999 }}>
    <p className="sg-glpop__h"><b>{g.term}</b> <span className="ui-tag">{g.dom}</span><button ref={x} type="button" className="ui-btn ui-btn--quiet sg-glpop__x" aria-label="Close" onClick={onClose}>✕</button></p>
    <p>{g.d}</p>
    {F && <p className="sg-glpop__f"><span className="ui-meta">ƒ {F.name}</span> <span dangerouslySetInnerHTML={{ __html: F.eq }} /></p>}
    {g.first && <p className="ui-meta">First met: {g.first.toUpperCase()}{gl.titles[g.first] ? ` · ${gl.titles[g.first]}` : ''}</p>}
    <p><a className="ui-btn ui-btn--quiet" href="#/learn/fieldbook">📖 Open the glossary</a></p>
    <LiteTryCard t={liteForTerm(g.term)} role={role} after="glossary term" compact />
  </div>;
}
