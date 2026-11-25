/**
 * Context that survives moving between products (task #223, founder 18 Nov 2026 12:27: "Someone should be able to move from a room to
 * Search Party, into ServiceHands, and back to the original room without losing the task they were doing").
 *
 * Two pieces, both kept in this browser tab only:
 *   1. Scroll memory per history entry. A new page starts at its top (with the heading clear of the sticky bar); Back, Forward and a
 *      refresh return to where that page was left. The position rides on the history entry itself (history.state.sy), so it follows the
 *      browser's own Back stack, not a guess.
 *   2. The return trail: the places where work happens — a room, a work order, a report being written, a room's commissioning or
 *      assurance, an incident, a story chapter — are remembered with their exact address (tab, device, view) and scroll. On any other page a
 *      "Back to …" chip returns to the most recent one, exactly as it was. Only places the current role may open are offered.
 * Nothing here grants anything: the chip is a link, and the policy still decides what opens.
 */
import { useEffect, useState } from 'react';
import { Icon } from '@empathia/ui';

export interface Mark { path: string; hash: string; label: string; sub: string; sy: number; at: number; /** a search kept with its query, filter and choice (20 Nov 2026) */ search?: boolean }
const KEY = 'empathia.trail.v1';
const MAX = 6; const TTL = 3 * 3600_000;
/** route parameters that name a place where work happens; and the pages that are such a place without a parameter */
const ANCHOR_PARAMS = ['room', 'wo', 'fault', 'chapter'];
const ANCHOR_PAGES = new Set(['room', 'servicehands.request']);
export const isAnchor = (pageId: string, params: Record<string, string>) => ANCHOR_PAGES.has(pageId) || Object.keys(params).some((k) => ANCHOR_PARAMS.includes(k));
export const pathOf = (hash: string) => hash.split('?')[0]!;

const read = (): Mark[] => { try { const v = JSON.parse(sessionStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter((m) => m && typeof m.hash === 'string' && typeof m.label === 'string' && Date.now() - (m.at || 0) < TTL) : []; } catch { return []; } };
const write = (ms: Mark[]) => { try { sessionStorage.setItem(KEY, JSON.stringify(ms.slice(0, MAX))); } catch { /* storage refused: the trail is simply shorter-lived */ } listeners.forEach((f) => f()); };
const listeners = new Set<() => void>();

// ---- 1. scroll memory -------------------------------------------------------------------------------------------------------------
let arrival: number | null = null;          // the scroll the entry we just arrived on remembers (null: a new entry → its top)
let current: { path: string; anchor: boolean } = { path: '', anchor: false };
let installed = false;
export function installScrollMemory() {
  if (installed || typeof window === 'undefined') return; installed = true;
  try { history.scrollRestoration = 'manual'; } catch { /* older browsers: the browser restores on its own */ }
  // a fragment navigation fires popstate AND hashchange; both read the entry's own state, so they agree
  const capture = () => { const st = history.state as { sy?: unknown } | null; arrival = st && typeof st.sy === 'number' ? st.sy : null; };
  capture();   // the first load (and a refresh): the entry may already carry its scroll
  addEventListener('hashchange', capture); addEventListener('popstate', capture);
  let t: ReturnType<typeof setTimeout> | undefined;
  addEventListener('scroll', () => {
    if (t) return;   // at most every 250 ms (Safari refuses more than 100 history writes in 30 s)
    t = setTimeout(() => { t = undefined; const sy = Math.round(scrollY);
      try { history.replaceState({ ...(history.state as object | null || {}), sy }, ''); } catch { /* refused: Back lands at the top instead */ }
      if (current.anchor) { const ms = read(); const m = ms.find((x) => x.path === current.path); if (m && m.sy !== sy) { m.sy = sy; write(ms); } }
    }, 250);
  }, { passive: true });
}

/** After a page change: a new entry starts at the top; a revisited one (Back, Forward, refresh, a trail chip) returns to its scroll. */
export function settleScroll() {
  const want = arrival; arrival = null;
  if (want == null || want <= 0) { scrollTo(0, 0); return; }
  // the page's code and data may still be arriving: try for up to 2 s until the document is tall enough, then stop
  const t0 = Date.now(); const go = () => { const room = document.documentElement.scrollHeight - innerHeight; if (room >= want - 2 || Date.now() - t0 > 2000) { scrollTo(0, Math.min(want, Math.max(0, room))); return; } requestAnimationFrame(go); };
  go();
}

// ---- 2. the trail -----------------------------------------------------------------------------------------------------------------
/** Remember the current page if it is a place where work happens: its exact address and, once its own page has drawn, its name.
 *
 *  25 Nov 2026. Rewritten after the exact-commit regression on 5c6d698f failed RP-20 ("Back to Room not found" on a room's replay), and
 *  corrected again the same day after an independent review of that first correction. What it does now, and why:
 *   - Every call starts a new watch and ends the one before (`seq`). A watch belongs to one address under one role: nothing seen after
 *     the visitor moves on, changes only the query, or changes role is credited to it. (First a place was named from whatever heading
 *     was on screen when a timer fired: the next page's. Then the guard compared the path only, so a role change on the same address
 *     still let an old watch read the refusal.)
 *   - While the page is loading or has failed to load, it decides nothing: a loading placeholder (aria-busy) or a failure view (NotYet,
 *     below) is neither the place's name nor a verdict on it. It waits for as long as the visitor stays; a failure followed by "Try
 *     again" is named when the page draws. (First it read the placeholder's heading, "Back to Core Replay"; then it gave up after four
 *     seconds, so a slow first visit was never remembered, and it kept "X could not load" as a place.)
 *   - A page that says its subject does not exist, or that it is not shown to this role, carries NotAPlace: the address is not kept, and
 *     a place kept earlier at exactly this address (a work order since reset) is forgotten. A place kept at the same path but another
 *     address is left alone: a page may refuse one view (?as=…) of a place another view of which is real.
 *   - The watch goes on after the place is named, so a page that learns late that its subject is missing (a sandbox room the server
 *     does not have) still says so. It looks at most every 100 ms, and only when the page changes.
 *   - A page that draws no heading at all is named "where you were" once it has stood drawn, not loading, for four seconds.
 *  A place already on the trail keeps its entry meanwhile, under its old name and address, so its scroll is still recorded; a new place
 *  takes the scroll it is at when it is named. */
export const MISSING = '[data-missing]';
export const WAITING = '[data-trail-wait], [aria-busy=true]';
/** Put this in a page's "there is no such room / work order / chapter" state, and in a page's own "not shown to this role" gate. It draws
 *  nothing; it tells the trail that this address is not a place where work happens, so it is never offered as "Back to …". */
export function NotAPlace() { return <span data-missing="" hidden />; }
/** Put this in a loading or failed-to-load view: the page is not there yet, so the trail neither names the place after the view nor
 *  forgets it. */
export function NotYet() { return <span data-trail-wait="" hidden />; }
let seq = 0; let watch: { stop: () => void } | null = null;
export function notePage(route: string, pageId: string | null, params: Record<string, string>) {
  const path = pathOf(route); const anchor = !!pageId && isAnchor(pageId, params);
  current = { path, anchor }; const me = ++seq; watch?.stop(); watch = null;
  if (!anchor || typeof document === 'undefined') return;
  const upsert = (label: string, sub: string) => { const ms = read(); const old = ms.find((m) => m.path === path); const m: Mark = { path, hash: route, label: label || old?.label || 'where you were', sub, sy: old?.sy ?? Math.round(scrollY), at: Date.now() };
    write([m, ...ms.filter((x) => x.path !== path)]); };
  let pending: ReturnType<typeof setTimeout> | undefined; let late: ReturnType<typeof setTimeout> | undefined; let named = false; let drawnSince = 0;
  const check = () => {
    pending = undefined; if (me !== seq) return;
    const main = document.querySelector('main'); if (!main) return;
    if (main.querySelector(WAITING)) { drawnSince = 0; return; }   // loading, or failed to load: nothing to decide yet
    if (main.querySelector(MISSING)) { if (read().some((m) => m.path === path && m.hash === route)) forget(path); named = true; return; }
    if (named) return;
    const h1 = main.querySelector('h1'); drawnSince ||= Date.now();
    if (!h1 && Date.now() - drawnSince < 4000) { if (!late) late = setTimeout(() => { late = undefined; check(); }, 4050 - (Date.now() - drawnSince)); return; }   // a page that draws nothing more would not wake the watch
    named = true;
    const tab = (main.querySelector('[role=tab][aria-selected=true]')?.textContent?.trim() || '').replace(/^(.*?\D)\s*(\d+)$/, '$1 ($2)');
    upsert((h1?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80), tab.slice(0, 40));
  };
  const soon = (ms = 100) => { if (!pending) pending = setTimeout(check, ms); };
  const mo = new MutationObserver(() => soon()); mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-busy', 'data-missing', 'data-trail-wait'] });
  watch = { stop: () => { mo.disconnect(); if (pending) clearTimeout(pending); if (late) clearTimeout(late); } };
  soon(60);
}
export function forget(path: string) { write(read().filter((m) => m.path !== path)); }
/** A search with something in it (founder's master directive, 20 Nov 2026: find a room in Search Party, open it in Lite, look at its devices
 *  and its commissioning evidence, "and return to the original search without unexpectedly losing the selected room, filters, or navigation
 *  context"). The search page keeps its query, filter and choice in its own address; this keeps that address on the trail as well, as a
 *  second, quieter way back, so the most recent place of work stays the main chip. */
export function noteSearch(hash: string, label: string, sub: string) {
  const path = pathOf(hash); const ms = read(); const old = ms.find((m) => m.path === path);
  if (!label) return;   // an empty search keeps the last one on the trail; a new search replaces it, and × forgets it
  if (old && old.hash === hash && old.label === label && old.sub === sub) return;
  write([{ path, hash, label: label.slice(0, 80), sub: sub.slice(0, 40), sy: old?.sy ?? 0, at: Date.now(), search: true }, ...ms.filter((x) => x.path !== path)]);
}

/** The return chip: the most recent place of work that is not this page and that this role may open. */
export function ReturnChip({ route, allowed }: { route: string; allowed: (hash: string) => boolean }) {
  const [ms, setMs] = useState<Mark[]>(read);
  useEffect(() => { const f = () => setMs(read()); listeners.add(f); f(); return () => { listeners.delete(f); }; }, [route]);
  const here = pathOf(route);
  const m = ms.find((x) => !x.search && x.path !== here && allowed(x.hash));
  const sx = ms.find((x) => x.search && x.path !== here && allowed(x.hash));
  if (!m && !sx) return null;
  // a fragment navigation is synchronous: the new history entry exists at once, so its scroll is written onto it before the router's
  // popstate/hashchange read it (the 18 Nov first version kept a "pending" value that the second of those two events wiped)
  const go = (to: Mark) => { if (location.hash !== to.hash) location.hash = to.hash; try { history.replaceState({ ...(history.state as object | null || {}), sy: to.sy }, ''); } catch { /* none */ } arrival = to.sy; if (location.hash === to.hash && pathOf(route) === to.path) settleScroll(); };
  return (
    <nav className="trail-row" aria-label="Where you were" data-testid="trail">
      {m && <div className="trail">
        <a className="trail__back" href={m.hash} onClick={(e) => { e.preventDefault(); go(m); }} data-testid="trail-back" data-to={m.hash}>
          <Icon name="undo" size={18} /><span className="trail__t"><span className="trail__k">Back to</span> <b>{m.label}</b>{m.sub && <span className="trail__s"> · {m.sub}</span>}</span></a>
        <button type="button" className="trail__x" aria-label={`Forget ${m.label}`} onClick={() => forget(m.path)} data-testid="trail-forget"><Icon name="close" size={16} /></button>
      </div>}
      {sx && <div className="trail trail--search">
        <a className="trail__back" href={sx.hash} onClick={(e) => { e.preventDefault(); go(sx); }} data-testid="trail-search" data-to={sx.hash}>
          <Icon name="search" size={18} /><span className="trail__t"><span className="trail__k">Your search</span> <b>{sx.label}</b>{sx.sub && <span className="trail__s"> · {sx.sub}</span>}</span></a>
        <button type="button" className="trail__x" aria-label={`Forget the search ${sx.label}`} onClick={() => forget(sx.path)} data-testid="trail-search-forget"><Icon name="close" size={16} /></button>
      </div>}
    </nav>
  );
}
