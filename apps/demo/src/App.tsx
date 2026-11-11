/**
 * The investor demonstration: the shell, the router and the policy gate. Every address resolves, in order, to
 *   1. a registered page (registry.pages.ts) — opened only when the policy admits the current role at that exact address, and only then is
 *      its code loaded; otherwise the Agora Owl access page (D44);
 *   2. a legacy V2.5.3 area (registry.ts) — its migration-status page, behind the same policy;
 *   3. nothing — the not-found page.
 * View as (D1) changes the role; the role veil marks every switch; the page, tabs and buttons re-render from the policy.
 */
import React, { Component, useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { Notice, Loading, Button } from '@empathia/ui';
import type { PageProps, RoleKey } from './registry.types.js';
import { areaOf, areaKey } from './registry.js';
import { resolve, PAGES, hrefOf } from './registry.pages.js';
import { ROLES, ROLE_KEYS, canOpen, canDo, canSee, whoCanOpen, legacyAuthority, allows, tabsFor, type Resolved } from './access/policy.js';
import { AccessProvider } from './access/Gate.js';
import { AccessPage, NotFound } from './access/AccessPage.js';
import { Shell, opensNative, translate } from './shell/Shell.js';
import { ViewAsSheet } from './viewas/ViewAsSheet.js';
import { RoleVeil, type VeilShow } from './viewas/RoleVeil.js';
import { ViewAsContext } from './viewas/context.js';
import { useRoleState } from './viewas/role.js';
import { TourPanel } from './tour/Tour.js';
import { ContactLinks } from './enquiry/WorkWith.js';
import { ENQUIRY } from './enquiry.js';
import { OfflineStrip } from './offline/Strip.js';
import { Shortcuts } from './start/ShortcutSheet.js';

const START = '#/investor';
/** The address the router reads: an in-page anchor (#problems) or an empty hash is the investor start. */
const routeOf = (h: string) => (h.startsWith('#/') && h.length > 2 ? h : START);
const homeOf = (role: RoleKey) => tabsFor(role, (h) => opensNative(role, h), translate)[0]?.href || START;

/** Where an address leads for a role, without loading anything: the page and whether it opens, or a legacy area, or nothing. */
export function decide(role: RoleKey, hash: string) {
  const at = resolve(hash);
  if (at) return { kind: 'page' as const, at, allowed: canOpen(role, at), title: at.page.title, purpose: at.page.purpose, who: whoCanOpen(at) };
  const key = areaKey(hash); const area = areaOf(hash);
  if (key === 'none' || !area || area.key === 'none') return { kind: 'missing' as const, at: null, allowed: true, title: 'Unknown address', purpose: undefined, who: [] as RoleKey[] };
  const a = legacyAuthority(key);
  return { kind: 'legacy' as const, at: null, area, allowed: allows(a, role), title: area.label, purpose: undefined, who: ROLE_KEYS.filter((k) => allows(a, k)) };
}

export function App() {
  const [hash, setHash] = useState(() => location.hash || START);
  const [role, setRoleState] = useRoleState();
  const [sheet, setSheet] = useState(false);
  const [veil, setVeil] = useState<VeilShow | null>(null);
  const [said, setSaid] = useState('');
  const first = useRef(true);
  const pending = useRef('');   // a role switch's announcement, said instead of the heading by the focus effect that follows it
  useEffect(() => {
    if (!location.hash) history.replaceState(null, '', START);
    const h = () => setHash(location.hash || START); addEventListener('hashchange', h); return () => removeEventListener('hashchange', h);
  }, []);
  const route = routeOf(hash);
  const d = decide(role, route);

  const switchTo = useCallback((r: RoleKey, o: { tour?: boolean } = {}) => {
    setSheet(false);
    if (r === role) return;
    const here = decide(r, routeOf(location.hash || START));
    let lands = here.allowed && here.kind !== 'missing' ? `stays on ${here.title}` : '';
    if (!lands && !o.tour) { const to = homeOf(r); const t = decide(r, to); lands = `lands on ${t.title}`; location.hash = to; }
    setRoleState(r);
    if (!o.tour) setVeil((v) => ({ role: r, lands: lands || ROLES[r].home, n: (v?.n || 0) + 1 }));
    pending.current = `Now viewing as ${ROLES[r].label}${lands ? `; ${lands}` : ''}. Viewing as a role grants nothing; View as returns you.`; setSaid(pending.current);
  }, [role, setRoleState]);

  // route focus: after an in-app navigation, focus the page's heading and announce it (not on the first load)
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    // a page whose code is still loading has no heading yet: focus stays on main until the heading arrives (within 4 s), then moves to it —
    // unless the person has already moved focus somewhere else
    let obs: MutationObserver | null = null; let stop: ReturnType<typeof setTimeout> | undefined;
    const toHeading = (h1: HTMLElement) => { if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: false }); };
    const t = setTimeout(() => {
      const h1 = document.querySelector<HTMLElement>('main h1'); const m = document.getElementById('main');
      // a role change is announced with the page it lands on. When that page's code arrives late (a slow phone, a busy machine), the late
      // heading is added to the announcement and never replaces it: "viewing as a role grants nothing" must always be heard
      const roleMsg = pending.current;
      // a field inside the page that changed the address (a room select, a search box) keeps the focus: the person is still using it
      // — and so does the Search Party bar in the header when the person has already gone back to it (choosing a result blurs it, so a
      // focused bar here was focused after the navigation; taking it away would drop the words being typed)
      const a = document.activeElement; const inField = !!a && ((!!m && m.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) || a.id === 'find-in');
      if (inField) { /* announce only */ } else if (h1) toHeading(h1); else {
        m?.focus();
        if (m && typeof MutationObserver !== 'undefined') {
          obs = new MutationObserver(() => { const late = m.querySelector<HTMLElement>('h1'); if (!late) return; obs?.disconnect(); obs = null; const a = document.activeElement; if (!a || a === m || a === document.body) { toHeading(late); setSaid(roleMsg ? `${roleMsg} ${late.textContent || d.title}.` : late.textContent || d.title); } });
          obs.observe(m, { childList: true, subtree: true }); stop = setTimeout(() => { obs?.disconnect(); obs = null; }, 4000);
        }
      }
      setSaid(pending.current || h1?.textContent || d.title); pending.current = '';
    }, 60);
    return () => { clearTimeout(t); if (stop) clearTimeout(stop); obs?.disconnect(); };
  }, [route, role]);   // eslint-disable-line react-hooks/exhaustive-deps

  const home = homeOf(role);
  let body: ReactNode;
  if (d.kind === 'missing') body = <NotFound hash={hash} home={home} />;
  else if (!d.allowed) body = <AccessPage role={role} title={d.title} purpose={d.purpose} who={d.who} home={home} own={tabsFor(role, (h) => opensNative(role, h), translate).filter((t) => !t.act).map((t) => ({ label: t.label, href: t.href }))} onRole={(r) => switchTo(r)} onViewAs={() => setSheet(true)} />;
  else if (d.kind === 'page') body = <PageHost key={d.at.page.id} at={d.at} role={role} hash={route} />;
  else body = <Boundary hash={route} area={d.area} />;

  return (
    <ViewAsContext.Provider value={{ switchTo: (r) => switchTo(r), open: () => setSheet(true) }}>
      <div className="demo" data-r={role}>
        <Shell role={role} hash={route} at={d.kind === 'page' ? d.at : null} onViewAs={() => setSheet(true)} onRole={(r) => switchTo(r)}>
          <TourPanel hash={hash} onPerspective={(p) => { if (ROLE_KEYS.includes(p as RoleKey)) switchTo(p as RoleKey, { tour: true }); }} />
          <div className="wrap"><OfflineStrip />{body}</div>
        </Shell>
        <ViewAsSheet open={sheet} role={role} onPick={(r) => switchTo(r)} onClose={() => setSheet(false)} />
        <RoleVeil show={veil} />
        <Shortcuts role={role} opens={(h) => opensNative(role, h)} />
        <p id="route-announcer" className="ui-sr" aria-live="polite" aria-atomic="true">{said}</p>
        {/* the ONE synthetic-data line (QUALITY_UPLIFT: no per-page banner; V2.5.3 shows a chip by the logo and one footer line) */}
        <footer className="foot"><span className="ui-tag ui-tone--warn foot__tag">Synthetic data</span> <span id="persp-note">Everything here is invented and connected to no real system; viewing as a role grants nothing.</span><span className="foot__more"> The only ways out are Empathia's enquiry form on {ENQUIRY.host} and the Teams, email and phone links a contact action opens when you press it.</span> <a href="#/investor">Back to the start</a> <a href="#/offline" data-testid="foot-offline">Offline use</a><ContactLinks /></footer>
      </div>
    </ViewAsContext.Provider>
  );
}

const loaded = new Map<string, ComponentType<PageProps>>();
/** Loads the page's chunk (once per page), with a visible loading state and a retry when the network or the chunk fails. */
function PageHost({ at, role, hash }: { at: Resolved; role: RoleKey; hash: string }) {
  const [C, setC] = useState<ComponentType<PageProps> | null>(() => loaded.get(at.page.id) ?? null);
  const [err, setErr] = useState<string | null>(null); const [n, setN] = useState(0);
  useEffect(() => {
    if (C) return; let live = true; setErr(null);
    at.page.load(n).then((m) => { if (!live) return; loaded.set(at.page.id, m.default); setC(() => m.default); }).catch((e: unknown) => { if (live) setErr(e instanceof Error ? e.message : String(e)); });
    return () => { live = false; };
  }, [at.page.id, n]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (err) return <section className="loadfail" role="alert"><h1 tabIndex={-1}>{at.page.title} did not load</h1><p>The page's code could not be fetched — the connection may have dropped. Nothing was changed.</p><Button kind="primary" onClick={() => setN(n + 1)}>Try again</Button></section>;
  if (!C) return <Loading label={`Loading ${at.page.title}`} />;
  const props: PageProps = { role, hash, params: at.params, query: at.query, can: (id) => canDo(role, at, id), sees: (id) => canSee(role, at, id) };
  return <AccessProvider role={role} at={at}><PageBoundary title={at.page.title}><C {...props} /></PageBoundary></AccessProvider>;
}
class PageBoundary extends Component<{ title: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <section className="loadfail" role="alert"><h1 tabIndex={-1}>{this.props.title} stopped</h1><p>Something on this page failed. The rest of the demonstration still works.</p><a className="ui-btn" href="#/investor">Back to the start</a></section> : this.props.children; }
}

/** A legacy address no page claims (none should remain: tests/browser/demo-parity-areas.test.mjs asserts it). It still lands on a finished screen: what the area is, the nearest pages, and the full address list. */
function Boundary({ hash, area }: { hash: string; area: { key: string; label: string; target: string; status: string; newRoute: string } }) {
  const near = PAGES.filter((p) => p.product !== 'shell').slice(0, 6);
  return (
    <section className="boundary">
      <h1>{area.label}</h1>
      <p className="ui-muted">Address <code>{hash}</code> · V2.5.3 area <code>{area.key}</code></p>
      <Notice tone="info">This address belongs to the V2.5.3 area “{area.label}”. Its content is served by the pages below; the full map of every original address is on <a href="#/parity">Every V2.5.3 address</a>.</Notice>
      <ul className="ui-list">{near.map((p) => <li key={p.id}><a href={hrefOf(p.id)}>{p.title}</a> — {p.purpose}</li>)}</ul>
      <p><a className="ui-btn" href="#/parity">Every V2.5.3 address</a> <a className="ui-btn ui-btn--quiet" href="#/investor">Back to the start</a></p>
    </section>
  );
}
export default React.memo(App);
