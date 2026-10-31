// The site shell: header with the primary navigation, the main region, and the footer. The menu collapses below 900 px and is
// operated by the button (apps/website/src/main.ts): aria-expanded, Escape closes, focus returns to the button.
import React from 'react';
import type { Page } from './content';

const PRIMARY = ['/platform', '/products', '/solutions', '/how-it-works', '/films', '/technology', '/trust', '/founder'];
export function Shell({ page, pages, demoUrl, preview }: { page: Page; pages: Page[]; demoUrl: string; preview: boolean }) {
  const nav = PRIMARY.map((p) => pages.find((x) => x.path === p)).filter((p): p is Page => !!p && !!p.nav);
  const here = (href: string) => page.path === href || (href !== '/' && page.path.startsWith(href + '/'));
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      {preview ? <p className="preview-bar" role="note">Preview build for owner review — films whose rights are not yet verified are shown here. Not for publication.</p> : null}
      <header className="top"><div className="wrap top__bar">
        <a className="brand" href="/" aria-label="Empathia Technologies, home"><svg className="brand__mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h12M3 18h18" /><circle cx="19" cy="12" r="2" /></svg><span>Empathia</span></a>
        <button className="menu" type="button" aria-expanded="false" aria-controls="nav" data-menu>Menu</button>
        <nav id="nav" className="nav" aria-label="Primary">
          <ul>{nav.map((n) => <li key={n.path}><a href={n.path} aria-current={here(n.path) ? 'page' : undefined}>{n.nav}</a></li>)}</ul>
          <div className="nav__cta"><a className="btn btn--quiet" href={demoUrl + '/#/investor'}>Live demo</a><a className="btn btn--primary" href="/request-demo">Request a demo</a></div>
        </nav>
      </div></header>
      <main id="main">{page.body}</main>
      <footer className="foot"><div className="wrap foot__grid">
        <div><p className="foot__brand">Empathia Technologies</p><p>Living Campus. Demonstrations run on synthetic data; nothing shown is a live system.</p></div>
        <ul aria-label="Company"><li><a href="/founder">Founder</a></li><li><a href="/about">About</a></li><li><a href="/pilot-partners">Pilots</a></li><li><a href="/contact">Contact</a></li></ul>
        <ul aria-label="Policies"><li><a href="/trust">Security and trust</a></li><li><a href="/privacy">Privacy</a></li><li><a href="/legal">Legal and accessibility</a></li></ul>
      </div></footer>
    </>
  );
}
