/**
 * No page offers a role a link that role may not open (24 Nov 2026).
 *
 * The rule already existed page by page: the room row, the job row, the "works with" row and most action rows list only the places the
 * role may open ("absent, not disabled"). An audit of 977 pages as all seventeen roles still found 29 kinds of link that led to the
 * access page, most of them on pages served at more than one address (a V2.5.3 address that loads another product's screen keeps that
 * screen's links) or in tables and breadcrumbs written before the rule. Fixing each is still right where a page can say something
 * better; this guard is what makes the rule hold everywhere, including on pages written later.
 *
 * What it does, in the page body only: an in-app link whose address resolves to a page this role may not open stops being a link.
 * If it is an action (a button-styled link, or a link in an action row) it is hidden, like every other action the role does not have.
 * If it is information (a record's identifier in a table, a room's name, a breadcrumb) its text stays and only the link goes, so
 * nothing the person was shown disappears. An address that is simply unknown is left alone: that is the 404 page's business.
 * It grants nothing and hides nothing that was readable: the access decision is the router's (App.tsx decide), asked here in advance.
 */
import { useEffect } from 'react';

/** links that are actions: these are hidden when closed; every other closed link keeps its text */
// (a button-styled link, a link in an action row, a tab or other item that sits directly in a navigation bar, a "see also" link in a line of links)
const ACTION = '.ui-btn, .kit-btn, .ops-row > a, .fl-refs > a, .room-jumps > a, .cap-rail a, .roomtabs__t, nav > a, .room__links > a';

/** Close every refused in-app link under `root`, and reopen any that this role may open again. Returns how many are closed. */
export function closeRefusedLinks(root: ParentNode, allowed: (hash: string) => boolean): number {
  for (const a of root.querySelectorAll<HTMLAnchorElement>('a[data-closed]')) {
    const was = a.dataset['closed'] || ''; if (a.hasAttribute('href')) { delete a.dataset['closed']; delete a.dataset['closedAction']; continue; }   // the page gave it a new address
    if (allowed(was)) { a.setAttribute('href', was); delete a.dataset['closed']; delete a.dataset['closedAction']; }
  }
  for (const a of root.querySelectorAll<HTMLAnchorElement>('a[href^="#/"]')) {
    const href = a.getAttribute('href') || ''; if (allowed(href)) continue;
    a.dataset['closed'] = href; if (a.matches(ACTION)) a.dataset['closedAction'] = '1'; a.removeAttribute('href');
  }
  return root.querySelectorAll('a[data-closed]').length;
}

/** Keeps the page body free of refused links as it renders and changes. `allowed` must be stable for a role (it is memoised per address here). */
export function useLinkGuard(role: string, allowed: (hash: string) => boolean): void {
  useEffect(() => {
    const main = document.getElementById('main'); if (!main) return;
    const memo = new Map<string, boolean>(); const ok = (h: string) => { let v = memo.get(h); if (v === undefined) { v = allowed(h); memo.set(h, v); } return v; };
    let queued = 0; const run = () => { queued = 0; closeRefusedLinks(main, ok); };
    const obs = new MutationObserver(() => { if (!queued) queued = requestAnimationFrame(run); });
    obs.observe(main, { subtree: true, childList: true, attributes: true, attributeFilter: ['href'] }); run();
    return () => { obs.disconnect(); if (queued) cancelAnimationFrame(queued);
      // a different role is about to be asked: give every closed link its address back, so the next role is judged on the page as written
      for (const a of main.querySelectorAll<HTMLAnchorElement>('a[data-closed]')) { if (!a.hasAttribute('href')) a.setAttribute('href', a.dataset['closed'] || ''); delete a.dataset['closed']; delete a.dataset['closedAction']; } };
  }, [role]);   // eslint-disable-line react-hooks/exhaustive-deps
}
