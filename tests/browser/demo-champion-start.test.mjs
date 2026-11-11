#!/usr/bin/env node
// A Site Champion's first weeks (#/site/start; apps/demo/src/champion/start.ts) against the built demo, end to end as one champion:
// the list starts empty, the check is refused until the lessons are read, the safety question decides, and the four things the record
// can see are done on the champion's own pages (a room checked, a note added, the operator guide acknowledged) and come back as done.
//   PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs tests/browser/demo-champion-start.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, main, done, base } = await harness('demo-champion-start');
const clean = (t) => t.errs.length === 0 && t.off.length === 0;
const over = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
const steps = (p) => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-testid=start-steps] li')].map((x) => [x.dataset.step, x.dataset.done])));
const led = (p, type) => p.evaluate((ty) => (JSON.parse(localStorage.getItem('empathia.demo.workspace.v1') || '{}').events || []).filter((e) => e.type === ty).map((e) => `${e.outcome}:${e.detail}`), type);
const go = async (p, hash, sel) => { await p.goto(`${base}${hash}`); await p.waitForSelector(sel); };
const RIGHT = { 'q-report': 1, 'q-access': 2, 'q-match': 0, 'q-note': 3, 'q-free': 1, 'q-safety': 2 };
const pick = async (p, answers) => { for (const [q, j] of Object.entries(answers)) await p.locator(`[data-q=${q}] input`).nth(j).check(); };

{ const t = await open('#/site/start', { role: 'sitechamp' }); const p = t.page; await p.waitForSelector('[data-testid=start]'); const m = await main(p);
  ok('CSB-01', 'a new champion’s list is empty, and the page says what it is: a draft, a list and not a qualification', await p.getAttribute('[data-testid=start]', 'data-done') === '0' && Object.values(await steps(p)).every((x) => x === 'no') && Object.keys(await steps(p)).join(' ') === 'lessons check walk read note support' && /0 of 6 done/.test(m) && /Draft: not yet reviewed by a practising AV engineer/.test(m) && /A list, not a qualification/.test(m), JSON.stringify(await steps(p)));
  const prof = await p.innerText('[data-testid=start-profile]');
  ok('CSB-02', 'the champion sees their own directory entry: name, site and floor, hours, and their backup', /Amara Dlomo/.test(prof) && /Atlas HQ, based on floor \d+ · \d+ rooms/.test(prof) && /Monday to Friday, 07:30 to 16:00/.test(prof) && /Bao Kahale/.test(prof), prof.replace(/\s+/g, ' ').slice(0, 240));
  await pick(p, RIGHT); await p.click('[data-testid=check-go]'); const no = await p.innerText('[data-testid=start-refused]');
  ok('CSB-03', 'the check is refused, beside the check, until the six lessons are marked as read; nothing is recorded', /Read the lessons first: 6 of 6 are not marked as read/.test(no) && await p.locator('[data-testid=check-result]').count() === 0 && (await led(p, 'site.start_checked')).length === 0 && await p.evaluate(() => !!document.querySelector('[data-testid=start-check] [data-testid=start-refused]')), no.slice(0, 120));
  for (const id of ['role', 'report', 'access', 'check', 'note', 'safety']) await p.click(`[data-testid=lesson-read-${id}]`);
  const read = await p.evaluate(() => [...document.querySelectorAll('.st-lesson')].map((x) => `${x.dataset.read}:${/Read on \d+ \w+/.test(x.innerText)}:${x.querySelectorAll('button').length}`));
  ok('CSB-04', 'each lesson marked as read says when and loses its button; the first line of the list is done; one ledger line each, saying it grants nothing', read.length === 6 && read.every((x) => x === 'yes:true:0') && (await steps(p)).lessons === 'yes' && (await led(p, 'site.start_read')).length === 6 && (await led(p, 'site.start_read')).every((x) => /^ALLOWED:.*their own word; it grants nothing/.test(x)), read.join(' '));
  await pick(p, { ...RIGHT, 'q-safety': 0 }); await p.click('[data-testid=check-go]'); await p.waitForSelector('[data-testid=check-result]');
  const r1 = await p.evaluate(() => { const r = document.querySelector('[data-testid=check-result]'); return { passed: r.dataset.passed, score: r.dataset.score, text: r.innerText, marked: [...document.querySelectorAll('[data-testid=start-check] fieldset')].map((f) => f.dataset.marked).join(' '), whys: document.querySelectorAll('.st-why').length }; });
  ok('CSB-05', 'five right with the safety question wrong does not pass, says why, and shows the reason under every question', r1.passed === 'no' && r1.score === '5' && /Not passed: the last question has to be right, whatever the total/.test(r1.text) && r1.marked === 'right right right right right wrong' && r1.whys === 6 && (await steps(p)).check === 'no', JSON.stringify(r1).slice(0, 260));
  await pick(p, { 'q-safety': 2 }); const cleared = await p.locator('[data-testid=check-result]').count(); await p.click('[data-testid=check-go]'); await p.waitForSelector('[data-testid=check-result][data-passed=yes]');
  const l2 = await led(p, 'site.start_checked');
  ok('CSB-06', 'changing an answer clears the old result; all six right passes, says it is not a qualification and gives no permission, and the ledger keeps both tries as counts', cleared === 0 && /6 of 6\. That passes\. It is a check of understanding, not a qualification, and it gives you no new permission/.test(await p.innerText('[data-testid=check-result]')) && (await steps(p)).check === 'yes' && l2.length === 2 && l2.some((x) => /5 of 6, not passed \(try 1/.test(x)) && l2.some((x) => /6 of 6, passed \(try 2/.test(x)), l2.join(' | '));
  await p.click('[data-testid=support-read]');
  ok('CSB-07', 'who supports the site names the people in order and the backup; marking it read completes that line', (await steps(p)).support === 'yes' && /Service Engineer: \S+/.test(await p.innerText('[data-testid=start-support]')) && /Your backup: Bao Kahale/.test(await p.innerText('[data-testid=start-support]')) && await p.getAttribute('[data-testid=start]', 'data-done') === '3');

  // the three things the record sees, done on the champion's own pages
  await p.click('[data-step=walk] a'); await p.waitForSelector('[data-testid=site]');
  ok('CSB-08', '“My site” carries the list’s progress and the way back to it', /Getting started: 3 of 6 done/.test(await p.innerText('[data-testid=site-start]')) && await p.getAttribute('[data-testid=site-start] a', 'href') === '#/site/start');
  await p.locator('[data-testid=site-rooms] [data-act=verify]').first().click(); await p.waitForSelector('[data-testid=site-done]');
  await p.fill('[data-testid=site-note-text]', 'After three the sun washes out the camera unless the blinds are down.'); await p.click('[data-testid=site-note-go]'); await p.waitForSelector('[data-testid=site-note-list]');
  ok('CSB-09', 'checking a room and adding a note move the count on “My site” at once', /Getting started: 5 of 6 done/.test(await p.innerText('[data-testid=site-start]')), await p.innerText('[data-testid=site-start]'));
  await p.click('[data-testid=site-start] a'); await p.waitForSelector('[data-testid=start]'); const s5 = await steps(p);
  const walkEv = await p.innerText('[data-step=walk] .st-ev');
  ok('CSB-10', 'back on the list, the room and the note are done “from the record”, and one line is left: what the champion is asked to read', s5.walk === 'yes' && s5.note === 'yes' && s5.read === 'no' && /1 of \d+ rooms checked on site · from the record/.test(walkEv) && /1 document waiting for you/.test(await p.innerText('[data-step=read]')), JSON.stringify(s5));
  await p.click('[data-step=read] a'); await p.waitForSelector('[data-testid=docs]'); await p.locator('[data-testid=docs-list] li[data-mine=yes] a').first().click(); await p.waitForSelector('[data-testid=doc-ack-go]'); await p.click('[data-testid=doc-ack-go]'); await p.waitForFunction(() => !document.querySelector('[data-testid=doc-ack-go]'));
  await go(p, '#/site/start', '[data-testid=start]'); await p.reload(); await p.waitForSelector('[data-testid=start]'); const end = await steps(p);
  ok('CSB-11', 'acknowledging the operator guide on its own page completes the list; it says so, and it survives a reload', Object.values(end).every((x) => x === 'yes') && await p.getAttribute('[data-testid=start]', 'data-complete') === 'yes' && /Everything on this list is done/.test(await main(p)) && /Nothing is waiting for you/.test(await p.innerText('[data-step=read]')) && await p.locator('[data-testid=start-steps] a').count() <= 1, JSON.stringify(end));
  await p.click('[data-testid=start-profile-link]'); await p.waitForSelector('[data-testid=champion-maynot]');
  ok('CSB-12', 'the profile link opens the champion’s own entry, with what the role may not do, whatever the list says', (await p.locator('[data-testid=champion-maynot] li').count()) >= 8 && /Accept a room at commissioning sign-off/.test(await p.innerText('[data-testid=champion-maynot]')));
  await go(p, '#/site/start', '[data-testid=start]'); await p.emulateMedia({ media: 'print' }); await p.waitForTimeout(200);
  const pr = await p.evaluate(() => { const vis = (s) => [...document.querySelectorAll(s)].some((e) => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0); return { chrome: vis('.shell__bar, .rail, .foot'), buttons: vis('.st button'), lessons: document.querySelectorAll('.st-lesson li').length, over: document.documentElement.scrollWidth - innerWidth }; });
  ok('CSB-13', 'printed, it is the lessons and the questions without the app or its buttons', !pr.chrome && !pr.buttons && pr.lessons >= 18 && pr.over <= 0, JSON.stringify(pr)); await p.emulateMedia({ media: 'screen' });
  ok('CSB-14', 'no console error and nothing requested off the origin', clean(t), [...t.errs, ...t.off].join(' | ')); await t.close(); }

// the list is the champion's own: no other role has the page, and arriving there asks and records nothing
for (const role of ['employee', 'svcmgr', 'architect']) { const t = await open('#/site/start', { role }); await t.page.waitForTimeout(700); const m = await main(t.page);
  ok(`CSB-20-${role}`, `“Getting started” is not open to the ${role}; no lesson, no check, nothing in the ledger`, /is not open to the/.test(m) && await t.page.locator('[data-testid=start], .st-lesson, [data-testid=check-go]').count() === 0 && (await led(t.page, 'site.start_read')).length === 0, m.slice(0, 100)); await t.close(); }

for (const w of [390, 320]) { const t = await open('#/site/start', { role: 'sitechamp', w, h: 780 }); const p = t.page; await p.waitForSelector('[data-testid=start]'); await pick(p, RIGHT); await p.click('[data-testid=check-go]'); await p.waitForSelector('[data-testid=start-refused]');
  const small = await p.evaluate(() => [...document.querySelectorAll('.st .ui-btn, .st .st-opt')].filter((b) => { const r = b.getBoundingClientRect(); return r.height > 0 && r.height < 43.5; }).length);
  ok(`CSB-30-${w}`, `at ${w} px the list, the lessons and a refused check fit the screen, with one h1 and every control at least 44 px tall`, await over(p) <= 0 && small === 0 && await p.locator('main h1').count() === 1 && clean(t), `over=${await over(p)} small=${small}`); await t.close(); }

await done();
