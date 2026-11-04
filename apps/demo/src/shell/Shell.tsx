/**
 * The demonstration's shell: the small-shield emblem (D39), the nine products in the canonical order (D37/D40) as the rail, a quick
 * find over the registered pages, the System/Light/Dark switch (D9), View as (D1) and, up to 820 px, a compact bar with a drawer that
 * holds every product, its pages and the theme choice. Everything that leads somewhere is filtered by the policy first (D44): a role
 * is never offered a product, page or tab it cannot open. The role colour appears in the avatar, the header role bar, the current
 * product's halo and the greeting — never in the theme (D9) or the teal accent (D8).
 */
import { useMemo, useRef, useState, type ReactNode } from 'react';
import type { PageDef, RoleKey } from '../registry.types.js';
import { PAGES, resolve, hrefOf } from '../registry.pages.js';
import { ROLES, ROLE_KEYS, canOpen, tabsFor, type Resolved } from '../access/policy.js';
import { PRODUCTS, ThemeSwitch } from '@empathia/ui';   // the one canonical list of the nine (D37/D40) and the shared System/Light/Dark switch (D9)
import { useDialog } from '../viewas/ViewAsSheet.js';
import { openPages } from '../viewas/scope.js';
export { openPages };

/** Can the role open this address through a registered page? (Tabs and links never lead to a refusal.) */
export const opensNative = (role: RoleKey, href: string) => { const r = resolve(href); return !!r && canOpen(role, r); };
/** A legacy V2.5.3 address, re-pointed at the registered page that answers it, at that page's own address. */
export const translate = (href: string) => { const r = resolve(href); return r && !Object.keys(r.params).length ? hrefOf(r.page.id, {}, Object.fromEntries(r.query)) : href; };

const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

export function Shell({ role, hash, at, onViewAs, onRole, children, note }: { role: RoleKey; hash: string; at: Resolved | null; onViewAs: () => void; onRole: (r: RoleKey) => void; children: ReactNode; note: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const pages = useMemo(() => openPages(role), [role]);
  const products = PRODUCTS.map((p) => ({ ...p, pages: pages.filter((x) => x.product === p.id), landing: pages.find((x) => x.product === p.id && x.landing) ?? pages.find((x) => x.product === p.id) })).filter((p) => p.landing);
  const current = at?.page.product;
  const tabs = tabsFor(role, (h) => opensNative(role, h), translate);
  const r = ROLES[role];
  const here = hash.split('?')[0];
  return (
    <div className="shell demo-shell">
      <a className="skip" href="#main">Skip to content</a>
      <header className="shell__bar" data-testid="shell-header">
        <a className="shell__brand" href="#/investor" aria-label="Empathia Living Campus — investor start">
          <img className="shell__emblem" src="brand/emblem-small.svg" alt="" width="28" height="28" />
          <span className="shell__word">Empathia</span><span className="shell__edition">Living Campus</span>
        </a>
        <nav aria-label="Products" className="shell__rail">
          {products.map((p) => <a key={p.id} href={hrefOf(p.landing!.id)} className="shell__product" data-p={p.id} aria-current={current === p.id ? 'true' : undefined} title={p.purpose}><span className="pmark" aria-hidden="true" />{p.name}</a>)}
        </nav>
        <div className="shell__tools">
          <QuickFind role={role} pages={pages} open={findOpen} setOpen={setFindOpen} />
          <ThemeSwitch className="shell__theme" />
          <button type="button" className="viewas-btn" data-r={role} onClick={onViewAs} aria-haspopup="dialog" data-testid="viewas-open" aria-label={`View as: currently ${r.label}. Change role`}>
            <span className="ava" aria-hidden="true">{r.initials}</span><span className="viewas-btn__t"><span className="viewas-btn__k">View as</span><span className="viewas-btn__n">{r.label}</span></span>
          </button>
          <label className="persp"><span className="ui-sr">Quick role switch</span><select value={role} onChange={(e) => onRole(e.target.value as RoleKey)} aria-describedby="persp-note">{ROLE_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
          <button type="button" className="shell__menu-btn" onClick={() => setMenu(true)} aria-haspopup="dialog" aria-expanded={menu} data-testid="menu-open"><span aria-hidden="true" className="burger" /><span className="ui-sr">Menu: all products</span></button>
        </div>
      </header>
      <div className="rolebar" data-r={role} aria-hidden="true" />
      <div className="shell__role">
        <p className="greet"><span className="greet__hi">{greeting()},</span> <b className="greet__who">{r.label}</b> <span className="greet__home">· {r.home}</span></p>
        {tabs.length > 0 && <nav aria-label={`${r.label} home`} className="hometabs" data-testid="hometabs">
          {tabs.map((t) => t.act === 'viewas'
            ? <button key={t.key} type="button" className="hometab" onClick={onViewAs}>{t.label}</button>
            : <a key={t.key} href={t.href} className="hometab" aria-current={here === t.href.split('?')[0] ? 'page' : undefined}>{t.label}</a>)}
        </nav>}
      </div>
      <div className="shell__note" role="note">{note}</div>
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
        <div className="sheet__head"><h2 id="drawer-h">Products</h2><button type="button" className="sheet__x" onClick={onClose} aria-label="Close the menu">×</button></div>
        <button type="button" className="drawer__who" data-r={role} onClick={onViewAs}><span className="ava" aria-hidden="true">{r.initials}</span><span><b>View as</b> · {r.label}</span></button>
        <ul className="drawer__list">
          {products.map((p) => (
            <li key={p.id} className="drawer__product" data-p={p.id}>
              <a href={hrefOf(p.landing!.id)} onClick={onClose} aria-current={current === p.id ? 'true' : undefined}><span className="pmark" aria-hidden="true" /><span className="drawer__pn">{p.name}{current === p.id && <span className="drawer__cur"> (current)</span>}</span><span className="drawer__pp">{p.purpose}</span></a>
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

/** Quick find: the registered pages this role can open, by title, purpose, product and alias (Scouter answers "which camera"). */
function QuickFind({ role, pages, open, setOpen }: { role: RoleKey; pages: PageDef[]; open: boolean; setOpen: (b: boolean) => void }) {
  const [q, setQ] = useState(''); const [i, setI] = useState(0); const input = useRef<HTMLInputElement>(null);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = words.length ? pages.map((p) => {
    const hay = [p.title, p.purpose, PRODUCTS.find((x) => x.id === p.product)?.name || '', p.search?.keywords || '', ...(p.search?.aliases || [])].join(' ').toLowerCase();
    const alias = (p.search?.aliases || []).some((a) => a.toLowerCase().startsWith(q.toLowerCase().trim()));
    return { p, s: words.every((w) => hay.includes(w)) ? (alias ? 3 : 0) + (p.title.toLowerCase().includes(words[0]!) ? 2 : 1) : 0 };
  }).filter((x) => x.s).sort((a, b) => b.s - a.s).slice(0, 7).map((x) => x.p) : [];
  const go = (p: PageDef) => { location.hash = hrefOf(p.id); setQ(''); setOpen(false); };
  const submit = () => { if (hits[i]) go(hits[i]!); else if (q.trim() && pages.some((p) => p.id === 'find')) { location.hash = `#/find?q=${encodeURIComponent(q.trim())}`; setQ(''); setOpen(false); } };
  return (
    <div className={`find${open ? ' find--open' : ''}`} data-testid="quickfind" data-role={role}>
      <button type="button" className="find__btn" aria-expanded={open} aria-controls="find-in" onClick={() => { setOpen(!open); setTimeout(() => input.current?.focus(), 0); }}><span aria-hidden="true" className="find__icon" /><span className="ui-sr">Find a page</span></button>
      <div className="find__box">
        <input ref={input} id="find-in" type="search" role="combobox" aria-expanded={hits.length > 0} aria-controls="find-list" aria-autocomplete="list" aria-activedescendant={hits[i] ? `find-${hits[i]!.id}` : undefined}
          placeholder="Find a page or a task" aria-label="Find a page or a task" value={q} autoComplete="off" maxLength={80}
          onChange={(e) => { setQ(e.target.value); setI(0); }}
          onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(i + 1, hits.length - 1)); } else if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(i - 1, 0)); } else if (e.key === 'Enter') { e.preventDefault(); submit(); } else if (e.key === 'Escape') { setQ(''); setOpen(false); } }} />
        {hits.length > 0 && <ul id="find-list" role="listbox" className="find__list" aria-label="Pages">{hits.map((p, k) => (
          <li key={p.id} id={`find-${p.id}`} role="option" aria-selected={k === i} className="find__opt" data-p={p.product} onMouseDown={(e) => { e.preventDefault(); go(p); }}>
            <b>{p.title}</b><span>{PRODUCTS.find((x) => x.id === p.product)?.name ?? 'Empathia'} · {p.purpose}</span></li>))}</ul>}
        {words.length > 0 && !hits.length && <p className="find__none" role="status">No page for “{q.trim()}” that this role can open.</p>}
      </div>
    </div>
  );
}
