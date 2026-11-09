// The site shell: header (the small shield beside "Empathia", the primary navigation with the nine products in canonical order, the
// System/Light/Dark choice, the two calls to action), the main region, and the footer with the flagship emblem lockup (D39). The menu
// collapses below 1100 px and is operated by the button (apps/website/src/main.ts): aria-expanded, Escape closes, focus returns.
import React from 'react';
import type { Page } from './content';
import { PRODUCTS } from './products.js';

const PRIMARY = ['/platform', '/how-it-works', '/technology', '/trust', '/pricing', '/pilots', '/founder'];
const ICON = {
  system: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>,
  light: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  dark: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>,
};
export const ThemeSwitch = () => (
  <div className="theme" role="group" aria-label="Colour theme" data-theme-switch>
    {(['system', 'light', 'dark'] as const).map((t) => <button key={t} type="button" data-theme-set={t} aria-pressed={t === 'system' ? 'true' : 'false'} title={t === 'system' ? 'Follow the system' : t === 'light' ? 'Light' : 'Dark'}>{ICON[t]}<span>{t === 'system' ? 'System' : t === 'light' ? 'Light' : 'Dark'}</span></button>)}
  </div>
);

export function Shell({ page, pages, demoUrl, preview }: { page: Page; pages: Page[]; demoUrl: string; preview: boolean }) {
  const nav = PRIMARY.map((p) => pages.find((x) => x.path === p)).filter((p): p is Page => !!p && !!p.nav);
  const here = (href: string) => page.path === href || (href !== '/' && page.path.startsWith(href + '/'));
  const inProducts = page.path === '/products' || page.path.startsWith('/products/');
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      {preview ? <p className="preview-bar" role="note">Preview build for owner review — films whose rights are not yet verified are shown here. Not for publication.</p> : null}
      <header className="top"><div className="wrap top__bar">
        <a className="brand" href="/" aria-label="Empathia Technologies, home"><img src="/brand/emblem-small.svg" width={32} height={32} alt="" /><span>Empathia</span></a>
        <button className="menu" type="button" aria-expanded="false" aria-controls="nav" data-menu>Menu</button>
        <nav id="nav" className="nav" aria-label="Primary">
          <ul className="nav__links">
            <li><details className="pmenu" data-here={inProducts ? '' : undefined}><summary>Products</summary>
              <div className="pmenu__panel"><ul>{PRODUCTS.map((p) => <li key={p.id}><a href={`/products/${p.slug}`} data-p={p.id} aria-current={page.path === `/products/${p.slug}` ? 'page' : undefined}><span className="dot" aria-hidden="true" /><b>{p.name}</b><small>{p.purpose}{p.apps.length ? `. Includes ${p.apps.join(' and ')}.` : ''}</small></a></li>)}</ul>
              <a className="pmenu__all" href="/products" aria-current={page.path === '/products' ? 'page' : undefined}>All nine products</a></div></details></li>
            {nav.map((n) => <li key={n.path}><a href={n.path} aria-current={here(n.path) ? 'page' : undefined}>{n.nav}</a></li>)}
          </ul>
          <ThemeSwitch />
          <div className="nav__cta"><a className="btn btn--quiet" href={demoUrl + '/#/investor'}>Open the demo</a><a className="btn btn--primary" href="/request-demo">Request a demo</a></div>
        </nav>
      </div></header>
      <main id="main">{page.body}</main>
      <footer className="foot"><div className="wrap foot__grid">
        <div>
          <a className="lockup" href="/" aria-label="Empathia Technologies, home"><img src="/brand/emblem.svg" width={72} height={72} loading="lazy" decoding="async" alt="" /><span><b>EMPATHIA</b><small>THE LIVING SYSTEM</small></span></a>
          <p>Empathia Technologies. Living Campus.</p><p>Demonstrations run on synthetic data; nothing shown is a live system.</p>
        </div>
        <div><h2>Products</h2><ul>{PRODUCTS.map((p) => <li key={p.id}><a href={`/products/${p.slug}`} data-p={p.id}><span className="dot" aria-hidden="true" />{p.name}</a></li>)}</ul></div>
        <div><h2>Company</h2><ul><li><a href="/founder">Founder</a></li><li><a href="/about">About</a></li><li><a href="/pricing">Pricing</a></li><li><a href="/pilots">Pilot packages</a></li><li><a href="/pilot-partners">Pilots and partners</a></li><li><a href="/films">Films</a></li><li><a href="/contact">Contact</a></li></ul></div>
        <div><h2>Policies</h2><ul><li><a href="/trust">Security and trust</a></li><li><a href="/privacy">Privacy</a></li><li><a href="/legal">Legal and accessibility</a></li></ul></div>
      </div></footer>
    </>
  );
}
