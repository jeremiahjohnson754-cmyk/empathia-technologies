/**
 * The demonstration's shell (QUALITY_UPLIFT, after V2.5.3's aurora shell, better):
 *   - a compact top bar: the small-shield emblem (D39) with a small "Synthetic data" chip, the current product (its colour mark, the role's
 *     halo), global quick find (→ #/find), notifications computed from the demo's records, the System/Light/Dark switch (D9), View as (D1);
 *   - the role's navigation from the policy (V2.5.3 tabsFor, D44) as ONE nav: a left icon rail on desktop, the bottom tab bar on phones,
 *     ending in "More", which opens the product sheet: the nine products in the canonical order (D37/D40) with their pages and the theme;
 *   - no greeting, breadcrumb or product rows, and no per-page banner: one synthetic-data line lives in the footer (App.tsx).
 * Everything that leads somewhere is filtered by the policy first (D44): a role is never offered a product, page or tab it cannot open.
 * The role colour shows in the avatar, the role line under the bar, the View-as name and the current product's halo — never in the theme
 * (D9) or the teal accent (D8), which marks "you are here" in the rail.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PageDef, RoleKey } from '../registry.types.js';
import { resolve, hrefOf } from '../registry.pages.js';
import { ROLES, ROLE_KEYS, canOpen, tabsFor, type Resolved } from '../access/policy.js';
import { PRODUCTS, ThemeSwitch, Icon, type IconName } from '@empathia/ui';   // the one canonical list of the nine (D37/D40), the shared theme switch (D9), the kit's icons
import { useDialog } from '../viewas/ViewAsSheet.js';
import { openPages } from '../viewas/scope.js';
export { openPages };

/** Can the role open this address through a registered page? (Tabs and links never lead to a refusal.) */
export const opensNative = (role: RoleKey, href: string) => { const r = resolve(href); return !!r && canOpen(role, r); };
/** A legacy V2.5.3 address, re-pointed at the registered page that answers it, at that page's own address. */
export const translate = (href: string) => { const r = resolve(href); return r && !Object.keys(r.params).length ? hrefOf(r.page.id, {}, Object.fromEntries(r.query)) : href; };

/** V2.5.3's tab icon names (ROLE tabs) → the kit's icon set. */
const TAB_ICON: Record<string, IconName> = {
  home: 'home', campus: 'campus', search: 'search', room: 'room', place: 'place', people: 'users', check: 'check', device: 'device', project: 'layers',
  time: 'clock', learn: 'book', evidence: 'shield', commission: 'shield', network: 'route', issue: 'alert', support: 'wrench', ops: 'wrench', graph: 'chart',
  rec: 'pulse', budget: 'ticket', plus: 'plus',
};

export function Shell({ role, hash, at, onViewAs, onRole, children }: { role: RoleKey; hash: string; at: Resolved | null; onViewAs: () => void; onRole: (r: RoleKey) => void; children: ReactNode; note?: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const pages = useMemo(() => openPages(role), [role]);
  const products = PRODUCTS.map((p) => ({ ...p, pages: pages.filter((x) => x.product === p.id), landing: pages.find((x) => x.product === p.id && x.landing) ?? pages.find((x) => x.product === p.id) })).filter((p) => p.landing);
  const current = at?.page.product;
  const cur = products.find((p) => p.id === current);
  const tabs = tabsFor(role, (h) => opensNative(role, h), translate);
  const r = ROLES[role];
  const here = hash.split('?')[0];
  // a tab is "you are here" when it is this address, or when it opens the page being shown (an alias such as #/home → its own address)
  const isHere = (href: string) => here === href.split('?')[0] || (!!at && resolve(href)?.page.id === at.page.id && !tabs.some((t) => t.href.split('?')[0] === here));
  return (
    <div className="shell demo-shell">
      <a className="skip" href="#main">Skip to content</a>
      <header className="shell__bar" data-testid="shell-header">
        <a className="shell__brand" href="#/investor" aria-label="Empathia Living Campus — investor start">
          <img className="shell__emblem" src="brand/emblem-small.svg" alt="" width="28" height="28" />
          <span className="shell__word">Empathia</span>
        </a>
        <span className="synth-chip" title="Every person, room, device and figure in this demonstration is invented">Synthetic data</span>
        {cur && <a href={hrefOf(cur.landing!.id)} className="shell__product" data-p={cur.id} aria-current="true" title={cur.purpose}><span className="pmark" aria-hidden="true" /><span className="shell__pn">{cur.name}</span></a>}
        <div className="shell__tools">
          <QuickFind role={role} pages={pages} open={findOpen} setOpen={setFindOpen} />
          <Notifications role={role} />
          <ThemeSwitch className="shell__theme" />
          <button type="button" className="viewas-btn" data-r={role} onClick={onViewAs} aria-haspopup="dialog" data-testid="viewas-open" aria-label={`View as: currently ${r.label}. Change role`}>
            <span className="ava" aria-hidden="true">{r.initials}</span><span className="viewas-btn__t"><span className="viewas-btn__k">View as</span><span className="viewas-btn__n">{r.label}</span></span>
          </button>
          <label className="persp"><span className="ui-sr">Quick role switch</span><select value={role} onChange={(e) => onRole(e.target.value as RoleKey)} aria-describedby="persp-note">{ROLE_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
        </div>
      </header>
      <div className="rolebar" data-r={role} aria-hidden="true" />
      <nav aria-label={`${r.label}: ${r.home}`} className="rail" data-testid="hometabs" data-n={Math.min(tabs.length + 1, 6)}>
        {tabs.map((t) => t.act === 'viewas'
          ? <button key={t.key} type="button" className="hometab" onClick={onViewAs} aria-haspopup="dialog"><Icon name={TAB_ICON[t.icon] || 'users'} size={22} /><span className="hometab__l">{t.label}</span></button>
          : <a key={t.key} href={t.href} className="hometab" aria-current={isHere(t.href) ? 'page' : undefined}><Icon name={TAB_ICON[t.icon] || 'grid'} size={22} /><span className="hometab__l">{t.label}</span></a>)}
        <button type="button" className="hometab hometab--more" onClick={() => setMenu(true)} aria-haspopup="dialog" aria-expanded={menu} data-testid="menu-open">
          <Icon name="products" size={22} /><span className="hometab__l">More</span><span className="ui-sr">: all products</span>
        </button>
      </nav>
      <main id="main" tabIndex={-1} className="shell__main">{children}</main>
      <Drawer open={menu} onClose={() => setMenu(false)} products={products} current={current} at={at} onViewAs={() => { setMenu(false); onViewAs(); }} role={role} />
    </div>
  );
}

function Drawer({ open, onClose, products, current, at, onViewAs, role }: { open: boolean; onClose: () => void; products: { id: string; name: string; purpose: string; pages: PageDef[]; landing?: PageDef }[]; current?: string; at: Resolved | null; onViewAs: () => void; role: RoleKey }) {
  const ref = useDialog(open, onClose);
  if (!open) return null;
  const r = ROLES[role];
  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div ref={ref} className="sheet drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-h" tabIndex={-1} onClick={(e) => e.stopPropagation()} data-testid="menu">
        <div className="sheet__head"><h2 id="drawer-h">Products <span className="drawer__count">{products.length}</span></h2><button type="button" className="sheet__x" onClick={onClose} aria-label="Close the menu"><Icon name="close" size={20} /></button></div>
        <button type="button" className="drawer__who" data-r={role} onClick={onViewAs}><span className="ava" aria-hidden="true">{r.initials}</span><span><b>View as</b> · {r.label}</span><Icon name="chevron-right" size={18} className="drawer__chev" /></button>
        <a className="drawer__start" href="#/investor" onClick={onClose} aria-current={at?.page.id === 'investor' ? 'page' : undefined}><Icon name="spark" size={18} /><span><b>Investor start</b><span>Three ways in: build a room, a guided scenario, the problem each workflow solves</span></span>{at?.page.id === 'investor' && <span className="drawer__here" aria-hidden="true">You are here</span>}</a>
        <ul className="drawer__list">
          {products.map((p) => (
            <li key={p.id} className="drawer__product" data-p={p.id}>
              <a href={hrefOf(p.landing!.id)} onClick={onClose} aria-current={current === p.id ? 'true' : undefined}><span className="pmark" aria-hidden="true" /><span className="drawer__pn">{p.name}{current === p.id && <span className="ui-sr"> (current)</span>}</span>{current === p.id && <span className="drawer__here" aria-hidden="true">You are here</span>}<span className="drawer__pp">{p.purpose}</span></a>
              {p.pages.length > 1 && <ul className="drawer__pages">{p.pages.filter((x) => x !== p.landing).map((x) => <li key={x.id}><a href={hrefOf(x.id)} onClick={onClose} aria-current={at?.page.id === x.id ? 'page' : undefined}><b>{x.title}</b> <span>{x.purpose}</span></a></li>)}</ul>}
            </li>
          ))}
        </ul>
        <div className="drawer__theme"><span className="drawer__lbl" aria-hidden="true">Appearance</span><ThemeSwitch labels /></div>
        <p className="drawer__foot"><a href="#/investor" onClick={onClose}>Investor start</a> · <a href="#/access" onClick={onClose}>Who may see what</a></p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ notifications
interface Note { id: string; text: string; sub: string; href?: string; tone: 'bad' | 'warn' | 'info' }
type Inc = { id: string; title: string; roomName: string; severity: string; state: string };
const WS_KEY = 'empathia.demo.workspace.v1';
const STEP: Record<string, string> = { OPEN: 'needs triage', TRIAGED: 'needs a technician', ASSIGNED: 'assigned, not yet accepted', ACCEPTED: 'accepted', IN_PROGRESS: 'being repaired', VERIFYING: 'awaiting verification' };
/** The open service incidents of the demo's own workspace (read only: the stored workspace, or the seed it starts from — never written). */
async function readIncidents(): Promise<Inc[]> {
  try { const s = localStorage.getItem(WS_KEY); if (s) { const w = JSON.parse(s) as { v?: number; incidents?: Inc[] }; if (w.v === 1 && Array.isArray(w.incidents)) return w.incidents; } } catch { /* storage blocked: fall back to the seed */ }
  const S = await import('../workspace/store.js'); return S.seed().incidents as unknown as Inc[];
}
function Notifications({ role }: { role: RoleKey }) {
  const [items, setItems] = useState<Note[] | null>(null);
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null); const box = useRef<HTMLDivElement>(null);
  const refresh = () => {
    readIncidents().then((xs) => setItems(xs.filter((i) => STEP[i.state]).sort((a, b) => (a.severity === 'Mission critical' ? -1 : 0) - (b.severity === 'Mission critical' ? -1 : 0))
      .map((i) => { const href = `#/v25/service?id=${encodeURIComponent(i.id)}`; return { id: i.id, text: `${i.id} · ${i.title}`, sub: `${i.roomName} · ${i.severity} · ${STEP[i.state]}`, href: opensNative(role, href) ? href : undefined, tone: i.severity === 'Mission critical' ? 'bad' : i.severity === 'High' ? 'warn' : 'info' } as Note; })))
      .catch(() => setItems([]));
  };
  useEffect(() => { refresh(); const f = (e: StorageEvent) => { if (e.key === WS_KEY) refresh(); }; addEventListener('storage', f); return () => removeEventListener('storage', f); }, [role]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return; refresh();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); setOpen(false); btn.current?.focus(); } };
    const down = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', key); document.addEventListener('mousedown', down);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('mousedown', down); };
  }, [open]);   // eslint-disable-line react-hooks/exhaustive-deps
  const n = items?.length ?? 0;
  return (
    <div className="notes">
      <button ref={btn} type="button" className="notes__btn" aria-expanded={open} aria-controls="notes-panel" onClick={() => setOpen(!open)} data-testid="notifications"
        aria-label={items === null ? 'Notifications' : `Notifications: ${n} open service ${n === 1 ? 'incident' : 'incidents'}`}>
        <Icon name="bell" size={20} />{n > 0 && <span className="notes__n" aria-hidden="true">{n > 9 ? '9+' : n}</span>}
      </button>
      {open && <div ref={box} id="notes-panel" className="notes__panel" role="region" aria-label="Notifications">
        <p className="notes__h">Open service incidents <span className="notes__c">{n}</span></p>
        {n ? <ul className="notes__list">{items!.map((x) => <li key={x.id} className={`notes__i ui-tone--${x.tone}`}>
          {x.href ? <a href={x.href} onClick={() => setOpen(false)}><b>{x.text}</b><span>{x.sub}</span></a> : <div><b>{x.text}</b><span>{x.sub}</span></div>}
        </li>)}</ul> : <p className="notes__none">Nothing open: every incident in this demonstration is resolved or closed.</p>}
        <p className="notes__foot">Computed from the demonstration's synthetic service records.</p>
      </div>}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ quick find
/** Quick find: the registered pages this role can open, by title, purpose, product and alias (Scouter answers "which camera"); "/" focuses it. */
function QuickFind({ role, pages, open, setOpen }: { role: RoleKey; pages: PageDef[]; open: boolean; setOpen: (b: boolean) => void }) {
  const [q, setQ] = useState(''); const [i, setI] = useState(0); const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { const t = e.target as HTMLElement | null; if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) && !document.body.classList.contains('has-dialog')) { e.preventDefault(); setOpen(true); input.current?.focus(); setTimeout(() => input.current?.focus(), 0); } };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [setOpen]);
  // the demo-wide index of rooms, buildings and devices (search/find.ts) loads on first use, so the main bundle stays small
  const [index, setIndex] = useState<null | ((q: string, n: number) => Array<{ id: string; kind: string; label: string; description: string; href: string }>)>(null);
  useEffect(() => { if (!q.trim() || index) return; let live = true; import('../search/find.js').then((m) => { if (live) setIndex(() => m.find); }).catch(() => undefined); return () => { live = false; }; }, [q, index]);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const pageHits = words.length ? pages.map((p) => {
    const hay = [p.title, p.purpose, PRODUCTS.find((x) => x.id === p.product)?.name || '', p.search?.keywords || '', ...(p.search?.aliases || [])].join(' ').toLowerCase();
    const alias = (p.search?.aliases || []).some((a) => a.toLowerCase().startsWith(q.toLowerCase().trim()));
    return { p, s: words.every((w) => hay.includes(w)) ? (alias ? 3 : 0) + (p.title.toLowerCase().includes(words[0]!) ? 2 : 1) : 0 };
  }).filter((x) => x.s).sort((a, b) => b.s - a.s).map((x) => x.p) : [];
  type Opt = { key: string; href: string; title: string; sub: string; product?: string };
  const GROUPS: Array<[string, string]> = [['room', 'Rooms'], ['device', 'Devices & positions'], ['building', 'Buildings']];
  const ents = words.length && index ? index(q, 40).filter((h) => GROUPS.some(([k]) => k === h.kind) && opensNative(role, h.href)) : [];
  const groups: Array<{ key: string; label: string; opts: Opt[]; more: number }> = [];
  if (pageHits.length) groups.push({ key: 'page', label: 'Pages', opts: pageHits.slice(0, 5).map((p) => ({ key: `p-${p.id}`, href: hrefOf(p.id), title: p.title, sub: `${PRODUCTS.find((x) => x.id === p.product)?.name ?? 'Empathia'} · ${p.purpose}`, product: p.product })), more: Math.max(0, pageHits.length - 5) });
  for (const [k, label] of GROUPS) { const xs = ents.filter((h) => h.kind === k); if (xs.length) groups.push({ key: k, label, opts: xs.slice(0, 4).map((h) => ({ key: `${k}-${h.id}`, href: h.href, title: h.label, sub: h.description })), more: Math.max(0, xs.length - 4) }); }
  const hits = groups.flatMap((g) => g.opts);
  const canFind = pages.some((p) => p.id === 'find');
  const close = () => { setQ(''); setOpen(false); input.current?.blur(); };
  const go = (o: Opt) => { location.hash = o.href; close(); };
  const submit = () => { if (hits[i]) go(hits[i]!); else if (q.trim() && canFind) { location.hash = `#/find?q=${encodeURIComponent(q.trim())}`; close(); } };
  const optId = (o: Opt) => `find-${o.key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  let n = -1;
  return (
    <div className={`find${open ? ' find--open' : ''}`} data-testid="quickfind" data-role={role}>
      <button type="button" className="find__btn" aria-expanded={open} aria-controls="find-in" onClick={() => { setOpen(!open); setTimeout(() => input.current?.focus(), 0); }}><Icon name="search" size={20} /><span className="ui-sr">Find a page</span></button>
      <div className="find__box">
        <Icon name="search" size={16} className="find__glass" />
        <input ref={input} id="find-in" type="search" role="combobox" aria-expanded={hits.length > 0} aria-controls="find-list" aria-autocomplete="list" aria-activedescendant={hits[i] ? optId(hits[i]!) : undefined}
          placeholder="Search rooms, devices, pages…" aria-label="Find a page or a task" aria-keyshortcuts="/" value={q} autoComplete="off" maxLength={80}
          onChange={(e) => { setQ(e.target.value); setI(0); }}
          onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(i + 1, hits.length - 1)); } else if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(i - 1, 0)); } else if (e.key === 'Enter') { e.preventDefault(); submit(); } else if (e.key === 'Escape') { setQ(''); setOpen(false); } }} />
        <kbd className="find__kbd" aria-hidden="true">/</kbd>
        {hits.length > 0 && <div className="find__list">
          <ul id="find-list" role="listbox" aria-label="Results">{groups.map((g) => (
            <li key={g.key} role="presentation" className="find__grp">
              <span className="find__g" id={`find-g-${g.key}`} aria-hidden="true">{g.label}{g.more ? <i> · {g.more} more{canFind ? ' in Search' : ''}</i> : null}</span>
              <ul role="group" aria-labelledby={`find-g-${g.key}`}>{g.opts.map((o) => { n += 1; const k = n; return (
                <li key={o.key} id={optId(o)} role="option" aria-selected={k === i} className="find__opt" data-p={o.product} data-kind={g.key} onMouseDown={(e) => { e.preventDefault(); go(o); }}>
                  <b>{o.title}</b><span>{o.sub}</span></li>); })}</ul>
            </li>))}</ul>
          {canFind && <p className="find__all" aria-hidden="true">Enter on nothing selected opens every result for “{q.trim()}”</p>}
        </div>}
        {words.length > 0 && !hits.length && <p className="find__none" role="status">No page for “{q.trim()}” that this role can open.{canFind ? ' Press Enter to search the records.' : ''}</p>}
      </div>
    </div>
  );
}
