// No page offers a role a link that role may not open (apps/demo/src/shell/linkGuard.ts, 24 Nov 2026).
//
// Why this suite exists: walking the twelve journeys (demo-journeys) found an employee sent from a room's code to a page that refuses
// employees, and an executive offered commissioning records from the service figures. An audit of 977 pages as all seventeen roles then
// found 29 kinds of such link. The cases below are those 29, each as the role and on the page where it was found, followed by a walk of
// every link on each of those pages. What must hold:
//   LK-01..  the link that led to the access page is no longer a link for that role
//   LK-…-all every link the page still offers that role opens a page (never the access page)
//   LK-…-txt a closed link that carried information keeps its text; a closed action is not shown
//   LK-90    switching to a role that may open the page gives the link back, on the same page, without a reload
//   LK-91    a role that may open everything loses nothing; the page that is refused still explains itself with its own links
//   node tests/browser/demo-links.test.mjs   (after node scripts/build.mjs)
import { harness } from './demo-shell-lib.mjs';
const { open, ok, done, base } = await harness('demo-links');
const settle = async (p) => { await p.waitForSelector('main h1', { timeout: 15000 }).catch(() => undefined); await p.waitForTimeout(500); };
const pat = (h) => h.replace(/R-[A-Z]{3}-\d+-\d+/g, 'R-*').replace(/\b(AS|PA|A|ISS|WO|REQ|APX|PRJ|TC|DD|FND|SW|VN|DEF|T)-[A-Z0-9-]+/g, '$1-*').replace(/[?&](m|v|b|p|q|t|at|step)=[^&]*/g, '');

// [role, the page, the addresses it offered that this role may not open]
const FOUND = [
  ['svcmgr', '#/pro/issues', [/^#\/commissioning\/room\//]],
  ['service', '#/pro/issues', [/^#\/v25\/service\/analytics/]],
  ['service', '#/service/fixes', [/^#\/service($|\?)/, /^#\/service\/coverage/]],
  ['designer', '#/campus/ATL/4/R-ATL-4-218?tab=history', [/^#\/v25\/fi\/scan\//]],
  ['installer', '#/campus/BCN/3/R-BCN-3-225?tab=tests', [/^#\/campus$/, /^#\/campus\/[A-Z]{3}$/, /^#\/rooms$/, /^#\/search\/scenarios/]],
  ['installer', '#/room/R-ATL-4-218', [/^#\/replay\//, /^#\/v25\/fi\/scan\//]],
  ['installer', '#/commissioning/room/R-ATL-4-218', [/^#\/v25\/people/]],
  ['ipm', '#/install', [/^#\/servicehands\/wo\//, /^#\/servicehands\?id=/]],
  ['bpm', '#/lessons', [/^#\/learn($|\/)/, /^#\/onboard/, /^#\/manual/, /^#\/servicehands/, /^#\/replay\//]],
  ['exec', '#/assurance', [/^#\/campus\/[A-Z]{3}\/\d+\/R-/, /^#\/assurance\/room\//]],
  ['employee', '#/servicehands/new', [/^#\/servicehands$/]],
  ['sitechamp', '#/servicehands/new', [/^#\/servicehands$/]],
  ['sitechamp', '#/scan/SIM-AV-0042', [/^#\/room\//]],
  ['qa', '#/commissioning', [/^#\/campus\/[A-Z]{3}\/\d+\/R-/]],
  ['ucadmin', '#/campus/ATL/4/R-ATL-4-218', [/^#\/replay\//, /^#\/v25\/fi\/scan\//]],
  ['employee', '#/here/R-ATL-4-218', [/^#\/campus\//]],
  ['exec', '#/v25/service/analytics', [/^#\/commissioning\/room\//, /^#\/v25\/service\?id=/]],
];
let n = 0;
for (const [role, page, refused] of FOUND) {
  n += 1; const id = `LK-${String(n).padStart(2, '0')}`;
  const t = await open(page, { role, sw: false, w: 1366, h: 850, reduced: true }); const p = t.page; await settle(p);
  const s = await p.evaluate(() => ({ refused: !!document.querySelector('[data-testid=access-page]'),
    links: [...new Set([...document.querySelectorAll('main a[href^="#/"]')].map((a) => a.getAttribute('href')))],
    closed: [...document.querySelectorAll('main a[data-closed]')].map((a) => ({ href: a.dataset.closed, action: a.dataset.closedAction === '1', text: (a.textContent || '').trim(), shown: a.getClientRects().length > 0, focusable: a.tabIndex >= 0 && a.hasAttribute('href') })) }));
  const still = s.links.filter((h) => refused.some((r) => r.test(h)));
  ok(id, `${role} on ${page}: the page opens and no longer offers ${refused.map((r) => r.source.replace(/\\\//g, '/')).join(', ')}`, !s.refused && still.length === 0, s.refused ? 'the page itself is refused' : still.slice(0, 4).join('  '));
  const info = s.closed.filter((c) => !c.action); const acts = s.closed.filter((c) => c.action);
  ok(`${id}-txt`, `${role} on ${page}: ${info.length} closed link(s) keep their text and are not focusable; ${acts.length} closed action(s) are not shown`, info.every((c) => c.text.length > 0 && !c.focusable) && acts.every((c) => !c.shown), JSON.stringify([...info.filter((c) => !c.text || c.focusable), ...acts.filter((c) => c.shown)]).slice(0, 240));
  // every link the page still offers this role opens a page: one exemplar per kind of address, as the audit did
  const seen = new Set(); const sample = s.links.filter((h) => { const k = pat(h); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 28); const bad = [];
  for (const h of sample) { await p.goto(base + h).catch(() => undefined); await p.waitForSelector('main h1', { timeout: 8000 }).catch(() => undefined); await p.waitForTimeout(220);
    if (await p.evaluate(() => !!document.querySelector('[data-testid=access-page]'))) bad.push(h); }
  ok(`${id}-all`, `${role} on ${page}: all ${sample.length} kinds of link it still offers open a page`, bad.length === 0, bad.slice(0, 4).join('  '));
  ok(`${id}-err`, `${role} on ${page}: no console error`, t.errs.length === 0, t.errs.slice(0, 2).join(' | '));
  await t.close();
}

// a switch of role on the same page, without a reload: the installer's breadcrumb to the campus is text; the architect's is a link again
{ const t = await open('#/campus/BCN/3/R-BCN-3-225?tab=tests', { role: 'installer', sw: false, reduced: true }); const p = t.page; await settle(p);
  const before = await p.evaluate(() => ({ closed: document.querySelectorAll('main a[data-closed]').length, campus: document.querySelectorAll('main a[href="#/campus"]').length }));
  await p.click('[data-testid=viewas-open]'); await p.click('[data-testid=viewas-sheet] [data-role-key=architect]'); await p.waitForTimeout(900); await settle(p);
  const after = await p.evaluate(() => ({ closed: document.querySelectorAll('main a[data-closed]').length, campus: document.querySelectorAll('main a[href="#/campus"]').length, hash: location.hash }));
  ok('LK-90', 'switching from the Installation Engineer to the Product Architect on the same room gives the closed links back, without a reload', before.closed > 0 && before.campus === 0 && after.closed === 0 && after.campus > 0 && /R-BCN-3-225/.test(after.hash), JSON.stringify({ before, after }));
  await p.click('[data-testid=viewas-open]'); await p.click('[data-testid=viewas-sheet] [data-role-key=installer]'); await p.waitForTimeout(900); await settle(p);
  const again = await p.evaluate(() => ({ closed: document.querySelectorAll('main a[data-closed]').length, campus: document.querySelectorAll('main a[href="#/campus"]').length }));
  ok('LK-90b', 'and switching back closes them again', again.closed === before.closed && again.campus === 0, JSON.stringify(again));
  await t.close(); }

// nothing is taken from a role that may open everything; a refused page still explains itself and its own links work
{ const t = await open('#/campus/ATL/4/R-ATL-4-218', { role: 'architect', sw: false, reduced: true }); const p = t.page; await settle(p);
  const a = await p.evaluate(() => ({ closed: document.querySelectorAll('main a[data-closed]').length, links: document.querySelectorAll('main a[href^="#/"]').length }));
  const x = await open('#/voice', { role: 'employee', sw: false, reduced: true }); await settle(x.page);
  const r = await x.page.evaluate(() => ({ access: !!document.querySelector('[data-testid=access-page]'), closed: document.querySelectorAll('main a[data-closed]').length, links: document.querySelectorAll('main a[href^="#/"]').length }));
  ok('LK-91', 'the Product Architect loses no link on a room; the access page an employee gets for VOICE keeps its own links', a.closed === 0 && a.links > 10 && r.access && r.closed === 0 && r.links > 0, JSON.stringify({ a, r }));
  await t.close(); await x.close(); }

await done();
