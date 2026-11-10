#!/usr/bin/env node
// Game day (Surpass §20, W16): the stadium event clock in the browser. The clock really changes the figures; a critical fault holds
// kick-off; steps go in order; a fix is verified by another role; the event survives leaving for a room and coming back; a fan gets
// the public view only; phone and both themes.   node tests/browser/demo-gameday.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, main, done } = await harness('demo-gameday');
const nums = (p) => p.locator('[data-testid=gameday-numbers]').innerText().then((t) => t.replace(/\s+/g, ' '));
const phase = (p) => p.locator('[data-testid=gameday]').getAttribute('data-phase');

{ const t = await open('#/gameday?as=stadium.av_it_engineer'); const p = t.page; await p.waitForSelector('[data-testid=gameday]');
  const n0 = await nums(p);
  ok('GDB-01', 'the day starts before doors with nobody inside, labelled simulated and synthetic', await phase(p) === 'pre-open' && /^0 inside of 62,200/.test(n0) && /simulated event/.test(await main(p)) && await p.locator('main [data-testid=synthetic]').count() === 1, n0);
  await p.click('[data-testid=gameday-advance]'); await p.click('[data-testid=gameday-advance]'); const n2 = await nums(p);
  ok('GDB-02', 'moving the clock changes the figures: warm-up has four fifths of the crowd inside', await phase(p) === 'warmup' && /49,760 inside/.test(n2) && n2 !== n0 && (await p.locator('.gd-phases li[aria-current=step]').innerText()).startsWith('Warm-up'), n2);
  await p.click('[data-fault=pa-upper]'); await p.waitForSelector('[data-incident]');
  ok('GDB-03', 'an injected fault becomes an incident, degrades its system and is announced', (await p.locator('[data-system=pa]').getAttribute('data-state')) === 'DEGRADED' && /Fault opened/.test(await p.locator('[data-testid=gameday-said]').innerText()) && /1 open incident/.test(await nums(p)));
  await p.click('[data-testid=gameday-advance]');
  ok('GDB-04', 'a critical fault holds kick-off, in words', await phase(p) === 'warmup' && /Held: Upper bowl announcements/.test(await p.locator('[data-testid=gameday-hold]').innerText()) && (await p.locator('[data-testid=gameday]').getAttribute('data-held')) === 'true');
  ok('GDB-05', 'guests are told what they need and nothing about the system', /also shown on the video boards/.test(await p.locator('[data-testid=gameday-publicpreview]').innerText()));
  const href = await p.locator('[data-incident] a.ui-btn').first().getAttribute('href'); await p.click('[data-incident] a.ui-btn'); await p.waitForSelector('[data-testid=estate-place]');
  ok('GDB-06', 'the incident opens its real room in the estate', /#\/estate\/stadium\/STA-PA\?as=stadium\.av_it_engineer/.test(href) && (await p.locator('[data-testid=estate-place]').getAttribute('data-node')) === 'STA-PA');
  await p.goBack(); await p.waitForSelector('[data-incident]');
  ok('GDB-07', 'coming back, the event is where it was left', await phase(p) === 'warmup' && await p.locator('[data-incident]').count() === 1);
  for (const s of ['ACKNOWLEDGED', 'DISPATCHED', 'FIXED']) { await p.click(`[data-respond=${s}]`); await p.waitForSelector(`[data-incident][data-step=${s}]`); }
  ok('GDB-08', 'worked in order, the fix restores the system pending an independent check', (await p.locator('[data-system=pa]').getAttribute('data-state')) === 'AWAITING_CHECK');
  await p.click('[data-respond=VERIFIED]');
  ok('GDB-09', 'the engineer who fixed it cannot verify it', (await p.locator('[data-incident]').getAttribute('data-step')) === 'FIXED' && /someone other than the person who made it/.test(await p.locator('[data-testid=gameday-said]').innerText()));
  await p.click('[data-testid=gameday-advance]'); ok('GDB-10', 'with the fault fixed, kick-off goes ahead and the feed is live', await phase(p) === 'first-half' && /Programme feed live/.test(await nums(p)));
  await p.goto(p.url().replace(/#.*/, '#/gameday?as=stadium.venue_ops_lead')); await p.waitForSelector('[data-respond=VERIFIED]'); await p.click('[data-respond=VERIFIED]'); await p.waitForSelector('[data-incident][data-step=VERIFIED]');
  ok('GDB-11', 'another venue role verifies it, and the system reads working', (await p.locator('[data-system=pa]').getAttribute('data-state')) === 'OK' && /0 open incidents/.test(await nums(p)) && /Venue Operations Lead|operations/i.test(await p.locator('[data-incident] .gd-steps').innerText()));
  ok('GDB-12', 'the readiness report is on the page and computed', /Readiness at first half \(T\+0 min\)/.test(await p.locator('[data-testid=gameday-report]').innerText()) && /GD-001/.test(await p.locator('[data-testid=gameday-report]').innerText()));
  await p.click('[data-fault=gate-c-scanners]');
  await p.goto(p.url().replace(/#.*/, '#/gameday?as=stadium.fan')); await p.waitForSelector('[data-testid=gameday-public]'); const pub = await main(p);
  ok('GDB-13', 'a fan sees gates, queues and advice only: no control room, systems, incidents or room identifiers', await p.locator('[data-testid=gameday-advance], [data-testid=gameday-systems], [data-testid=gameday-incidents], [data-fault]').count() === 0 && /Gate D/.test(pub) && !/STA-|GD-0|ribbon|rack|programme return/i.test(pub), pub.slice(0, 160));
  ok('GDB-14', 'the fan is steered away from the slow gate', (await p.locator('[data-gate=C]').getAttribute('data-best')) === 'false' && await p.locator('[data-best=true]').count() === 1);
  ok('GDB-15', 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

{ const t = await open('#/world/stadium?as=stadium.venue_ops_lead'); const p = t.page; await p.click('[data-testid=open-gameday]'); await p.waitForSelector('[data-testid=gameday]');
  ok('GDB-16', 'the Stadium world offers “Run a game day”, as the same role', /as=stadium\.venue_ops_lead/.test(p.url())); await p.click('[data-testid=gameday-reset]');
  ok('GDB-17', 'the day can be started again', await phase(p) === 'pre-open' && await p.locator('[data-incident]').count() === 0); await t.close(); }

for (const theme of ['light', 'dark']) { const t = await open('#/gameday?as=stadium.av_it_engineer', { w: 390, h: 844, theme }); const p = t.page; await p.waitForSelector('[data-testid=gameday]'); await p.click('[data-fault=ribbon-east]');
  const small = await p.$$eval('main .ui-btn, main .sg-opt, main .w-crumbs a', (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 43.5; }).map((e) => `${e.textContent.slice(0, 16)}:${Math.round(e.getBoundingClientRect().height)}`));
  ok(`GDB-18 ${theme}`, `phone (390, ${theme}): no horizontal overflow, 44 px targets, no console error`, await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0 && small.length === 0 && !t.errs.length, `${small.slice(0, 4).join(',')} ${t.errs.join('|')}`); await t.close(); }
await done();
