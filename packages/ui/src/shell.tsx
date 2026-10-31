/**
 * The platform shell shared by every Empathia surface (owner directive 2026-10-30: one platform, specialised applications). It carries
 * the brand, the product rail, the identity block and a status note. It knows nothing about routing or authorization: the host passes
 * the products it may show (`available: false` renders the product as present-but-locked with its reason, so a person learns the platform's
 * shape without being able to reach what their role does not allow — the API decides either way) and the current identity.
 */
import type { ReactNode } from 'react';

export interface ShellProduct { key: string; label: string; href: string; /** one line on what the product does, for the tooltip and the locked state */ purpose: string; active?: boolean; available?: boolean; lockedWhy?: string }
export interface ShellIdentity { name: string; role: string; organization: string; scope?: string | null; mode?: 'authenticated' | 'demonstration' }

export function AppShell({ products, identity, actions, note, edition, children }: { products: ShellProduct[]; identity?: ShellIdentity; actions?: ReactNode; note?: ReactNode; edition?: string; children: ReactNode }) {
  return (
    <div className="shell">
      <a className="skip" href="#main">Skip to content</a>
      <header className="shell__bar">
        <a className="shell__brand" href={products[0]?.href || '#/'}><span className="shell__mark" aria-hidden="true" /><span>Empathia</span>{edition && <span className="shell__edition">{edition}</span>}</a>
        <nav aria-label="Products" className="shell__rail">
          {products.map((p) => p.available === false
            ? <span key={p.key} className="shell__product shell__product--locked" title={p.lockedWhy ? `${p.purpose} — ${p.lockedWhy}` : p.purpose} aria-disabled="true">{p.label}</span>
            : <a key={p.key} href={p.href} className="shell__product" aria-current={p.active ? 'page' : undefined} title={p.purpose}>{p.label}</a>)}
        </nav>
        <div className="shell__who">
          {identity && <span className="shell__identity"><b>{identity.name}</b><span className="shell__meta">{identity.role} · {identity.organization}{identity.scope ? ` · ${identity.scope}` : ''}{identity.mode === 'demonstration' ? ' · demonstration' : ''}</span></span>}
          {actions}
        </div>
      </header>
      {note && <div className="shell__note" role="note">{note}</div>}
      <main id="main" tabIndex={-1} className="shell__main">{children}</main>
    </div>
  );
}

/** A product page's standard header: name, one-line purpose, optional actions. The same at the top of every product so the platform reads as one. */
export function ProductHeader({ product, purpose, actions, children }: { product: string; purpose: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="product__head">
      <div><p className="product__kicker">{product}</p>{children}<p className="product__purpose">{purpose}</p></div>
      {actions && <div className="product__actions">{actions}</div>}
    </header>
  );
}
