// The site shell (header, navigation, footer) and the lead form. The form posts to the public lead endpoint of the API when one is
// configured (data-api on <html>); without one it says so plainly and never pretends a message was sent.
import React from 'react';
import { PAGES, type Page } from './content';

export const NAV = PAGES.filter((p) => p.nav && p.path !== '/').map((p) => ({ href: p.path, label: p.nav as string }));

export function Shell({ page, children }: { page: Page; children: React.ReactNode }) {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="top"><div className="wrap bar">
        <a className="brand" href="/" aria-label="Empathia Technologies, home"><span className="mark" aria-hidden="true" /> Empathia</a>
        <nav aria-label="Primary"><button className="menu" type="button" aria-expanded="false" aria-controls="nav" data-menu>Menu</button>
          <ul id="nav">{NAV.map((n) => <li key={n.href}><a href={n.href} aria-current={page.path === n.href ? 'page' : undefined}>{n.label}</a></li>)}</ul>
        </nav>
      </div></header>
      <main id="main">{children}</main>
      <footer className="foot"><div className="wrap">
        <p><strong>Empathia Technologies</strong> · Living Campus. Demonstrations run on synthetic data; nothing shown is a live system.</p>
        <p><a href="/privacy">Privacy</a> · <a href="/legal">Legal</a> · <a href="/trust">Security and trust</a> · <a href="/contact">Contact</a></p>
      </div></footer>
    </>
  );
}

