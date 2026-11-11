#!/usr/bin/env node
// "How do I use this room?" (the End User Success & Training Guide's room pages; apps/demo/src/guides) against the built demo: a room
// with a panel and cameras, a room with neither panel nor separate camera, the index, the plan that rings what a task uses, the way to
// practise and to get help, the site champion, the printed page, phone widths, and who is told a name.
//   PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs tests/browser/demo-guides.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, main, done, base } = await harness('demo-guides');
const clean = (t) => t.errs.length === 0 && t.off.length === 0;
const over = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
const sections = (p) => p.evaluate(() => [...document.querySelectorAll('[data-section]')].map((s) => s.dataset.section));
const BOARD = 'R-ATL-4-218'; const BARE = 'R-ATL-4-220';

{ const t = await open(`#/guide/room/${BOARD}`, { role: 'employee' }); const p = t.page; await p.waitForSelector('[data-testid=guide]');
  const s = await sections(p); const m = await main(p);
  ok('GB-01', 'the boardroom’s guide is its own: every task the room supports, in order, ending with how to finish and how to get help', s.join(' ') === 'start share sound camera controls end help' && await p.getAttribute('[data-testid=guide]', 'data-room') === BOARD, s.join(' '));
  ok('GB-02', 'it says what is installed and what the room supports, each with its reason, and that it is a draft about a synthetic room', await p.locator('[data-testid=guide-supports] tbody tr').count() >= 4 && (await p.innerText('[data-testid=guide-equipment]')).length > 30 && /Draft/.test(m) && /Synthetic room/.test(m) && /not yet reviewed by a person/.test(m));
  const before = await p.innerText('[data-testid=guide-caption]'); await p.click('[data-section=camera] [data-act=show]');
  const cap = await p.innerText('[data-testid=guide-caption]'); const ringed = await p.locator('[data-testid=guide-stage] [data-marked], [data-testid=guide-stage] .is-marked, [data-testid=guide-stage] [aria-label*="used in this step"]').count();
  ok('GB-03', '“Show on the plan” rings the equipment a task uses and says how many pieces', /Choose “Show on the plan”/.test(before) && /Ringed: what “.+” uses \(\d+ pieces? of equipment\)/.test(cap) && await p.getAttribute('[data-section=camera]', 'data-active') === 'yes' && await p.getAttribute('[data-section=camera] [data-act=show]', 'aria-pressed') === 'true', `${cap} ringed=${ringed}`);
  await p.click('[data-section=camera] [data-act=show]'); ok('GB-04', 'and pressing it again clears the plan', /Choose “Show on the plan”/.test(await p.innerText('[data-testid=guide-caption]')));
  const prac = await p.getAttribute('[data-testid=guide-practise]', 'href'); const help = await p.getAttribute('[data-testid=guide-help]', 'href');
  ok('GB-05', 'the controls can be practised on this room’s simulated panel, which says nothing real changes; help opens “In this room” for this room', prac === `#/control/${BOARD}` && help === `#/here/${BOARD}?step=wrong` && /A simulated panel: nothing in a real room changes/.test(m), `${prac} ${help}`);
  const champ = await p.innerText('[data-testid=guide-champion]');
  ok('GB-06', 'an employee is told who the site champion is and how available they are, with a way to who knows the room', /Your site champion/.test(champ) && !/A local colleague/.test(champ) && await p.getAttribute('[data-testid=guide-who]', 'href') === `#/people?room=${BOARD}`, champ.slice(0, 160));
  await p.emulateMedia({ media: 'print' }); await p.waitForTimeout(200);
  const pr = await p.evaluate(() => { const vis = (s) => [...document.querySelectorAll(s)].some((e) => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0); return { nav: vis('.shell__bar, .rail, .foot, .skip, [data-testid=guide-print], [data-act=show], .gd-link'), steps: document.querySelectorAll('.gd-steps li').length, over: document.documentElement.scrollWidth - innerWidth, title: vis('main h1') }; });
  ok('GB-07', 'printed, the page is the guide alone: no navigation, no buttons that do nothing on paper, every step present, nothing cut off sideways', !pr.nav && pr.steps >= 10 && pr.over <= 0 && pr.title, JSON.stringify(pr)); await p.emulateMedia({ media: 'screen' });
  ok('GB-08', 'no console error and nothing requested off the origin', clean(t), [...t.errs, ...t.off].join(' | ')); await t.close(); }

{ const t = await open(`#/guide/room/${BARE}`, { role: 'employee' }); const p = t.page; await p.waitForSelector('[data-testid=guide]'); const s = await sections(p); const m = await main(p);
  // this room is a video bar and its computer with no display on record: it has no "start a meeting" or "share" task, and no panel
  ok('GB-10', 'a room with no touch panel and no display has only the tasks it supports, is not told to tap a panel, and is not offered one to practise on', !/tap [^.]* on the (touch )?panel/i.test(m) && !(await p.locator('[data-testid=guide-practise]').count()) && !s.includes('share') && s.includes('end') && s.includes('help') && s.length < 7, `${s.join(' ')} | ${(m.match(/[^.]*panel[^.]*\./i) || [''])[0].slice(0, 160)}`);
  const no = await p.evaluate(() => [...document.querySelectorAll('[data-testid=guide-supports] tbody tr[data-yes=no]')].map((r) => r.querySelector('td:last-child').textContent.length));
  ok('GB-11', 'what the room cannot do is said, each with why', no.length >= 1 && no.every((n) => n > 8), JSON.stringify(no)); ok('GB-12', 'no console error', clean(t), t.errs.join(' | ')); await t.close(); }

{ const t = await open(`#/guide/room/${BOARD}`, { role: 'visitor' }); const p = t.page; await p.waitForSelector('[data-testid=guide]'); const champ = await p.innerText('[data-testid=guide-champion]');
  ok('GB-20', 'a visitor reads the same guide but is told no name: a local colleague, reached through their host', /A local colleague/.test(champ) && /Ask your host or the front desk/.test(champ) && !(await p.locator('[data-testid=guide-who]').count()), champ.slice(0, 160));
  ok('GB-21', 'and is offered no practice panel they could not open', !(await p.locator('[data-testid=guide-practise]').count()) || await p.getAttribute('[data-testid=guide-practise]', 'href') === `#/control/${BOARD}`); await t.close(); }

{ const t = await open('#/guide', { role: 'employee' }); const p = t.page; await p.waitForSelector('[data-testid=guide-index]');
  const n = await p.locator('[data-testid=guide-rooms] a').count(); await p.fill('[data-testid=guide-q]', '4.218'); await p.waitForTimeout(200); const f = await p.locator('[data-testid=guide-rooms] a').count();
  ok('GB-30', 'the index lists a guide for every one of the 90 rooms and finds one by its number', n === 90 && f >= 1 && f < 10, `${n} ${f}`);
  await p.goto(`${base}#/guide/room/R-NOPE-0-000`); await p.waitForSelector('[data-testid=guide-missing]'); ok('GB-31', 'an unknown room says so and offers the index', (await p.getAttribute('[data-testid=guide-missing] a', 'href')) === '#/guide'); await t.close(); }

for (const w of [390, 320]) { const t = await open(`#/guide/room/${BOARD}`, { role: 'employee', w, h: 780 }); await t.page.waitForSelector('[data-testid=guide]');
  const small = await t.page.evaluate(() => [...document.querySelectorAll('.gd .ui-btn')].filter((b) => b.getBoundingClientRect().height > 0 && b.getBoundingClientRect().height < 43.5).length);
  ok(`GB-40-${w}`, `at ${w} px the guide fits the screen and its buttons are at least 44 px tall`, await over(t.page) <= 0 && small === 0 && clean(t), `over=${await over(t.page)} small=${small}`); await t.close(); }

await done();
