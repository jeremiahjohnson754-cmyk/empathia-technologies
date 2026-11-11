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

// the chapters that are the same in every room (apps/demo/src/guides/chapters.ts)
{ const t = await open('#/guide', { role: 'employee' }); const p = t.page; await p.waitForSelector('[data-testid=guide-chapters]');
  const list = await p.evaluate(() => [...document.querySelectorAll('[data-testid=guide-chapters] a')].map((a) => a.dataset.chapter).join(' '));
  ok('GB-50', 'the guide’s first page lists its eleven chapters under the rooms, and says they are a draft and that videos are not built', list === 'meetings rooms sharing hybrid help finding accessibility remote security apps questions' && /A draft, not yet reviewed by a person who supports users for a living\. Short videos are not built\./.test(await p.innerText('[data-testid=guide-chapters]')), list);
  await p.click('[data-testid=guide-chapters] a[data-chapter=help]'); await p.waitForSelector('[data-testid=guide-chapter][data-chapter=help]'); const m = await main(p);
  ok('GB-51', '“When something does not work”: three things to try, then stop, then how to ask; it says not to open or unplug anything', /Three things anyone can try/.test(m) && /Then stop/.test(m) && /Do not open a cabinet, reach behind the screen, unplug the room’s equipment or restart things you did not start/.test(m) && /Report it from the room/.test(m) && /Draft/.test(m) && /Chapter 5 of 11/.test(m));
  const links = await p.evaluate(() => [...document.querySelectorAll('[data-testid=chapter-links] a')].map((a) => a.getAttribute('href')).join(' '));
  ok('GB-52', 'its links go to the product’s own pages, and it says what an organisation would add and that none is recorded', links === '#/here #/people' && /From your organisation\. The hours support is staffed, and what to do outside them\. None is recorded in this demonstration, and nothing is assumed in its place\./.test(await p.innerText('[data-testid=chapter-yours]')) && /covers, from the guide’s list of contents: common troubleshooting, how to request assistance, site-specific support, qr codes/.test(await p.innerText('[data-testid=chapter-covers]')), links);
  await p.click('[data-testid=chapter-next]'); await p.waitForSelector('[data-testid=guide-chapter][data-chapter=finding]'); await p.click('[data-testid=chapter-prev]'); await p.waitForSelector('[data-testid=guide-chapter][data-chapter=help]');
  await p.goto(`${base}#/guide/topic/apps`); await p.waitForSelector('[data-testid=guide-chapter][data-chapter=apps]'); const apps = await main(p);
  ok('GB-53', 'the chapters follow one another, and the one on Microsoft’s applications says which is for what and that step-by-step instructions are not written here', /Teams is where you meet, call and chat/.test(apps) && /OneDrive is where your own work files are kept/.test(apps) && /Step-by-step instructions for these applications are not written here: they change, and your organisation has its own approved guidance/.test(apps));
  await p.goto(`${base}#/guide/topic/nope`); await p.waitForSelector('[data-testid=guide-missing]');
  ok('GB-54', 'an unknown chapter says so and offers the guide’s first page', /There is no such chapter/.test(await main(p)) && await p.getAttribute('[data-testid=guide-missing] a', 'href') === '#/guide' && clean(t), t.errs.join(' | ')); await t.close(); }
{ const t = await open('#/guide/topic/help', { role: 'visitor' }); const p = t.page; await p.waitForSelector('[data-testid=guide-chapter]');
  const links = await p.evaluate(() => [...document.querySelectorAll('[data-testid=chapter-links] a')].map((a) => a.getAttribute('href')).join(' '));
  ok('GB-55', 'a visitor reads the same chapter, with only the links a visitor can open', links === '#/here' && /Three things anyone can try/.test(await main(p)), links); await t.close(); }
for (const w of [390, 320]) { const t = await open('#/guide/topic/sharing', { role: 'employee', w, h: 780 }); await t.page.waitForSelector('[data-testid=guide-chapter]');
  const small = await t.page.evaluate(() => [...document.querySelectorAll('.gd-chapter .ui-btn, .gd-links a')].filter((b) => b.getBoundingClientRect().height > 0 && b.getBoundingClientRect().height < 43.5).length);
  ok(`GB-56-${w}`, `at ${w} px a chapter fits the screen, has one h1 and its links and buttons are at least 44 px tall`, await over(t.page) <= 0 && small === 0 && await t.page.locator('main h1').count() === 1 && clean(t), `over=${await over(t.page)} small=${small}`); await t.close(); }

await done();
