import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DESTINATIONS, GROUPS } from '../nav';
import { PRODUCTS, productBySlug } from '../data/products';
import { SCENARIOS } from '../data/scenarios';
import { DOCS, FILMS_DATA, SOURCES } from '../data/generated';
import { href, go, useRoute } from '../lib/router';
import { update, useStudio } from '../lib/store';
import { Ladder } from './Ladder';

export const serverMode = () => /^https?:/.test(window.location.protocol);

function Rail({ onNavigate }: { onNavigate: () => void }) {
  const r = useRoute();
  return (
    <aside className="rail" aria-label="Destinations">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true" />
        <div><b>Empathia Founder Studio</b><span>synthetic data · founder only</span></div>
      </div>
      <nav>
        {GROUPS.map((g) => (
          <div className="rail-group" key={g}>
            <h4>{g}</h4>
            <ul>
              {DESTINATIONS.filter((d) => d.group === g).map((d) => {
                const p = d.product ? productBySlug(d.product) : undefined;
                return (
                  <li key={d.path}>
                    <a href={href(d.path)} aria-current={r.path === d.path ? 'page' : undefined} onClick={onNavigate}>
                      <span>{d.label}</span>
                      {p && <span className="mini-ladder" aria-hidden="true"><Ladder ladder={p.ladder} /></span>}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

interface Hit { kind: string; label: string; detail: string; to: string }

function buildIndex(): Hit[] {
  const out: Hit[] = [];
  for (const d of DESTINATIONS) out.push({ kind: 'Destination', label: d.label, detail: d.blurb, to: href(d.path) });
  for (const p of PRODUCTS) {
    const d = DESTINATIONS.find((x) => x.product === p.slug);
    for (const w of p.whatWorks) out.push({ kind: p.name, label: w, detail: 'what works', to: href(d ? d.path : 'maturity') });
    for (const rt of p.routes) out.push({ kind: 'Demo page', label: rt, detail: p.name, to: href(d ? d.path : 'maturity', undefined, { route: rt }) });
  }
  for (const s of SCENARIOS) out.push({ kind: 'Scenario', label: s.title, detail: s.why, to: href('scenarios', s.id) });
  for (const f of FILMS_DATA) out.push({ kind: 'Film', label: f.title, detail: `${f.series} · ${f.found ? 'on file' : 'not found'}`, to: href('media', f.key) });
  for (const doc of DOCS) out.push({ kind: 'Document', label: doc.title, detail: doc.path, to: href('docs', doc.id) });
  for (const s of SOURCES) out.push({ kind: 'Source', label: s.title, detail: s.path, to: href('architecture', 'source', { file: s.id }) });
  return out;
}

function Palette({ onClose }: { onClose: () => void }) {
  const index = useMemo(buildIndex, []);
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = (words.length ? index.filter((h) => words.every((w) => `${h.label} ${h.detail} ${h.kind}`.toLowerCase().includes(w))) : index.filter((h) => h.kind === 'Destination')).slice(0, 40);
  const pick = (h?: Hit) => { if (!h) return; go(h.to); onClose(); };
  return (
    <div className="palette-bg" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Search the studio">
        <input
          ref={input} value={q} placeholder="Search products, pages, films, documents and source…" aria-label="Search" aria-controls="palette-results"
          onChange={(e) => { setQ(e.target.value); setI(0); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(i + 1, hits.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(i - 1, 0)); }
            if (e.key === 'Enter') pick(hits[i]);
          }}
        />
        <ul id="palette-results" role="listbox">
          {hits.length === 0 && <li className="muted" style={{ padding: 12 }}>Nothing matches “{q}”. Try a product name, a route like #/v25/build, or a film.</li>}
          {hits.map((h, k) => (
            <li key={`${h.to}-${k}`} role="option" aria-selected={k === i}>
              <a href={h.to} aria-selected={k === i} onClick={(e) => { e.preventDefault(); pick(h); }} onMouseEnter={() => setI(k)}>
                <span className="kind">{h.kind}</span>
                <span>{h.label}<small>{h.detail}</small></span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const r = useRoute();
  const st = useStudio();
  const [open, setOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const dest = DESTINATIONS.find((d) => d.path === r.path);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(true); } if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); setOpen(true); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    if (st.theme === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', st.theme);
    if (st.reducedMotion) root.setAttribute('data-motion', 'reduced'); else root.removeAttribute('data-motion');
  }, [st.theme, st.reducedMotion]);
  const first = useRef(true);
  useEffect(() => {
    document.title = `${dest ? dest.label : 'Studio'} · Empathia Founder Studio`;
    // on navigation (not on first load, so the skip link stays the first Tab stop) move focus to the new page for screen readers
    if (first.current) first.current = false; else document.getElementById('main')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [r.path, r.sub]);
  const nextTheme = st.theme === 'dark' ? 'light' : st.theme === 'light' ? 'system' : 'dark';
  return (
    <div className={`shell${railOpen ? ' rail-open' : ''}`}>
      <a className="skip" href="#main">Skip to content</a>
      <Rail onNavigate={() => setRailOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" type="button" aria-label="Open the destinations" aria-expanded={railOpen} onClick={() => setRailOpen(!railOpen)}>☰</button>
          <span className="crumb">{dest ? `${dest.group} › ${dest.label}` : 'Founder Studio'}</span>
          <span className="spacer" />
          <span className={`mode-chip${serverMode() ? ' ok' : ''}`} title={serverMode() ? 'Served by the studio launcher on this computer: persona switching, inspection and snapshots are available.' : 'Opened from disk: everything works except automatic persona switching, data inspection and saved snapshots.'}>
            {serverMode() ? 'Launcher · local only' : 'Opened from disk'}
          </span>
          <button className="icon-btn" type="button" aria-label={`Appearance: ${st.theme}. Switch to ${nextTheme}`} title={`Appearance: ${st.theme}`} onClick={() => update((s) => ({ ...s, theme: nextTheme }))}>{st.theme === 'light' ? '☀' : st.theme === 'dark' ? '☾' : '◐'}</button>
          <button className="search-btn" type="button" onClick={() => setOpen(true)} aria-label="Search (Control or Command K)"><span aria-hidden="true">⌕</span><span className="label">Search everything</span><kbd>⌘K</kbd></button>
        </header>
        <main id="main" tabIndex={-1} className="page">{children}</main>
      </div>
      {open && <Palette onClose={() => setOpen(false)} />}
    </div>
  );
}
