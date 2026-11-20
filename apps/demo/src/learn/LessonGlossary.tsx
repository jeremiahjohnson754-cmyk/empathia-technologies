/**
 * Glossary marks inside Learn's lesson cards (18 Nov 2026; SIGNAL_INVENTORY: “Not carried: marks inside lesson cards”). The reference
 * walks a page's text nodes after they are drawn and underlines each glossary term at its first use; the lesson cards here are drawn
 * from the build package's own HTML, so the same walk runs over them once they are on the page: first use per lesson, never inside
 * code, a link, a button or a formula. A mark is a button: Enter, Space or a click opens the story's own pop-over.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { buildRx, markRun, type GlossaryIndex, type GlRx, type Term } from '../signal/glossary.js';
import { GlPop, loadGlossary } from '../signal/glpop.js';

const SKIP = 'code, a, button, .learn__eq, script, style';

/** mark the first use of each term in the cards inside `root`; returns how many were marked */
export function markLesson(root: HTMLElement, R: GlRx, terms: Term[]): number {
  const used = new Set<string>(); let n = 0;
  for (const card of root.querySelectorAll<HTMLElement>('.learn__card')) {
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT, { acceptNode: (t) => ((t.parentElement?.closest(SKIP)) || (t.textContent || '').trim().length <= 2 ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const nodes: Text[] = []; for (let t = walker.nextNode(); t; t = walker.nextNode()) nodes.push(t as Text);
    for (const t of nodes) {
      const parts = markRun(t.textContent || '', R, used); if (!parts.some((p) => p.g)) continue;
      const frag = document.createDocumentFragment();
      for (const p of parts) { if (!p.g) { frag.appendChild(document.createTextNode(p.t)); continue; }
        const b = document.createElement('button'); b.type = 'button'; b.className = 'sg-gl ln-gl'; b.dataset['gl'] = p.g.term; b.textContent = p.t; b.setAttribute('aria-label', `${p.t} — glossary`); frag.appendChild(b); n += 1; }
      t.replaceWith(frag);
    }
  }
  void terms; return n;
}

export function LessonGlossary({ lessonKey, role, children }: { lessonKey: string; role: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null); const [gl, setGl] = useState<GlossaryIndex | null>(null); const [open, setOpen] = useState<{ g: Term; at: HTMLElement } | null>(null);
  useEffect(() => { let on = true; loadGlossary().then((g) => on && setGl(g)).catch(() => undefined); return () => { on = false; }; }, []);
  useEffect(() => { setOpen(null); if (!gl || !ref.current) return; markLesson(ref.current, buildRx(gl.terms), gl.terms); }, [gl, lessonKey]);
  return <div ref={ref} onClick={(e) => { const b = (e.target as Element).closest?.('.ln-gl') as HTMLElement | null; if (!b || !gl) return; const g = gl.terms.find((x) => x.term === b.dataset['gl']); if (g) setOpen({ g, at: b }); }}>
    {children}
    {open && gl ? <GlPop g={open.g} at={open.at} gl={gl} role={role} onClose={() => { const at = open.at; setOpen(null); at.focus(); }} /> : null}
  </div>;
}
