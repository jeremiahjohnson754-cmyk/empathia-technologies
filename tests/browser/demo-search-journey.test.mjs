#!/usr/bin/env node
// Product to product without losing the search (founder's master directive, 20 Nov 2026, §3: "A user locates a meeting room in Search
// Party, opens it in Lite, inspects its devices in Pro, checks commissioning evidence, and returns to the original search without
// unexpectedly losing the selected room, filters, or navigation context"). Pressed through the real pages at a phone (390 × 844) and a
// desktop (1440 × 900), as the architect:
//   Search Party: type "4.218", filter to rooms, choose the room → the address carries the query, the filter and the choice;
//   the room's own page, on its Devices tab → Lite (the room in 3D) → Commissioning (its evidence);
//   browser Back returns to the search exactly as it was left; so does a refresh; so does the trail's "Your search" link from any page;
//   and the main "Back to" chip still leads to the last place of work, not to the search.
// The results page keeps its facet the same way. Light by default; PW_COLOR_SCHEME=dark for the dark run.
//   node tests/browser/demo-search-journey.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { open, ok, done } = await harness('demo-search-journey');
const ROOM = 'R-ATL-4-218';
const hashOf = (p) => p.evaluate(() => location.hash);
const params = async (p) => Object.fromEntries(new URLSearchParams((await hashOf(p)).split('?')[1] || ''));
const state = (p) => p.evaluate(() => ({ q: document.querySelector('#spd-q')?.value || '', type: document.querySelector('.sp__search select')?.value || '', h1: document.querySelector('main h1')?.textContent?.trim() || '', on: document.querySelector('.sp__rlist li.on b')?.textContent?.trim() || '' }));
const settle = async (p) => { await p.waitForSelector('main h1', { timeout: 10000 }); await p.waitForTimeout(500); };

for (const [tag, w, h] of [['desk', 1440, 900], ['phone', 390, 844]]) {
  const t = await open('#/search', { role: 'architect', sw: false, w, h, reduced: true }); const p = t.page; p.setDefaultTimeout(15000);
  await p.waitForSelector('[data-testid=search-party]');
  await p.fill('#spd-q', '4.218'); await p.selectOption('.sp__search select', 'Room'); await p.waitForTimeout(300);
  await p.locator(`.sp__rlist a[href="#/search?focus=${encodeURIComponent(`Room:${ROOM}`)}"]`).click(); await p.waitForTimeout(600);
  const a = await params(p); const s0 = await state(p);
  ok(`JR-${tag}-01`, 'Search Party: the query, the Rooms filter and the chosen room are in the address', a.q === '4.218' && a.type === 'Room' && a.focus === `Room:${ROOM}` && /4\.218/.test(s0.h1), `${await hashOf(p)} · ${s0.h1}`);

  await p.getByTestId('sp-room-open').click(); await settle(p);
  await p.locator('main [role=tab]', { hasText: /^Devices/ }).first().click(); await p.waitForTimeout(400);
  const roomAt = await hashOf(p); const tab = await p.evaluate(() => document.querySelector('main [role=tab][aria-selected=true]')?.textContent?.trim() || '');
  await p.getByTestId('room-jump-lite').first().click(); await settle(p); const liteAt = await hashOf(p);
  await p.getByTestId('room-jump-commissioning').first().click(); await settle(p); const cxAt = await hashOf(p); const cxH = await p.evaluate(() => document.querySelector('main h1')?.textContent || '');
  ok(`JR-${tag}-02`, 'from the search into the room (Devices), Lite and its commissioning evidence, each for the same room', roomAt.includes(ROOM) && /Devices/.test(tab) && liteAt.startsWith(`#/lite/room/${ROOM}`) && cxAt.startsWith(`#/commissioning/room/${ROOM}`), `${roomAt} [${tab}] → ${liteAt} → ${cxAt} (${cxH.trim().slice(0, 40)})`);

  const chips = await p.evaluate(() => ({ back: document.querySelector('[data-testid=trail-back]')?.getAttribute('data-to') || '', search: document.querySelector('[data-testid=trail-search]')?.getAttribute('data-to') || '', text: document.querySelector('[data-testid=trail-search]')?.textContent?.replace(/\s+/g, ' ').trim() || '' }));
  ok(`JR-${tag}-03`, 'on the commissioning page the main chip leads to the last place of work (Lite or the room), and a second link leads to the search', !!chips.back && !chips.back.startsWith('#/search') && chips.search.startsWith('#/search?') && /Your search/.test(chips.text) && /4\.218/.test(chips.text), JSON.stringify(chips));

  for (let i = 0; i < 6 && !(await hashOf(p)).startsWith('#/search'); i++) { await p.goBack(); await p.waitForTimeout(450); }
  await p.waitForSelector('[data-testid=search-party]'); await p.waitForTimeout(400); const s1 = await state(p); const b = await params(p);
  ok(`JR-${tag}-04`, 'browser Back returns to the search as it was left: the words, the Rooms filter, the room chosen and shown', s1.q === '4.218' && s1.type === 'Room' && /4\.218/.test(s1.h1) && b.focus === `Room:${ROOM}`, JSON.stringify(s1));

  await p.reload(); await p.waitForSelector('[data-testid=search-party]'); await p.waitForTimeout(500); const s2 = await state(p);
  ok(`JR-${tag}-05`, 'a refresh keeps the same search', s2.q === '4.218' && s2.type === 'Room' && /4\.218/.test(s2.h1), JSON.stringify(s2));

  await p.evaluate((r) => { location.hash = `#/commissioning/room/${r}`; }, ROOM); await settle(p);
  await p.getByTestId('trail-search').click(); await p.waitForSelector('[data-testid=search-party]'); await p.waitForTimeout(500); const s3 = await state(p);
  ok(`JR-${tag}-06`, '"Your search" from another page returns to the same search', s3.q === '4.218' && s3.type === 'Room' && /4\.218/.test(s3.h1), `${await hashOf(p)} · ${JSON.stringify(s3)}`);

  await p.click('[data-testid=sp-clear]'); await p.waitForTimeout(500); const c = await params(p); const focused = await p.evaluate(() => document.activeElement?.id);
  ok(`JR-${tag}-07`, 'the clear control empties the search field, keeps the focus in it, and the address follows', !c.q && focused === 'spd-q' && (await state(p)).q === '', `${await hashOf(p)} · focus ${focused}`);

  // the results page: a facet chosen, a result opened, Back
  await p.evaluate(() => { location.hash = '#/find?q=camera'; }); await p.waitForSelector('[data-testid=find-facets]'); await p.waitForTimeout(300);
  const facet = await p.evaluate(() => [...document.querySelectorAll('[data-testid=find-facets] [data-facet]')].map((b) => b.getAttribute('data-facet')).find((k) => k !== 'all') || '');
  await p.click(`[data-testid=find-facets] [data-facet="${facet}"]`); await p.waitForTimeout(250);
  await p.locator('.fnd__group a').first().click(); await settle(p); await p.goBack(); await p.waitForSelector('[data-testid=find-facets]'); await p.waitForTimeout(400);
  const on = await p.evaluate(() => document.querySelector('[data-testid=find-facets] [aria-pressed=true]')?.getAttribute('data-facet') || '');
  ok(`JR-${tag}-08`, 'the results page keeps the narrowing chosen (its facet) after opening a result and coming back', !!facet && on === facet, `${facet} → ${on}`);
  ok(`JR-${tag}-09`, 'no console error, nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close();
}
// The directive's search cases (§5) that no other suite presses already, in the header's Search Party bar; the map of all eighteen to
// their checks is docs/qa/experience-2026-11-20/NAVIGATION_AND_SEARCH_VALIDATION.md.
for (const [tag, w, h, touch] of [['desk', 1440, 900, false], ['phone', 390, 844, true]]) {
  const t = await open('#/campus', { role: 'architect', sw: false, w, h, reduced: true, touch }); const p = t.page; p.setDefaultTimeout(15000);
  await p.waitForSelector('#find-in');
  const ask = async (q) => { await p.fill('#find-in', ''); await p.fill('#find-in', q); await p.waitForFunction(() => document.querySelectorAll('#find-list [role=option]').length > 0 || !!document.querySelector('.find__none:not(:empty)'), null, { timeout: 8000 }).catch(() => undefined); await p.waitForTimeout(250);
    return p.$$eval('#find-list [role=option]', (o) => o.map((x) => (x.textContent || '').replace(/\s+/g, ' ').trim())); };
  if (tag === 'desk') {
    const part = await ask('boardr'); ok('SC-03', 'partial words are matched: “boardr” offers boardrooms', part.some((x) => /boardroom/i.test(x)), part.slice(0, 3).join(' | '));
    const multi = await ask('atlas boardroom'); ok('SC-04', 'several words narrow together: “atlas boardroom” offers an Atlas boardroom first', multi.length > 0 && /boardroom/i.test(multi[0]) && multi.some((x) => /Atlas/i.test(x)), multi.slice(0, 3).join(' | '));
    const lower = await ask('boardroom'); const mixed = await ask('BoArDrOoM'); ok('SC-06', 'upper and lower case do not matter', lower.length > 0 && JSON.stringify(lower) === JSON.stringify(mixed), `${lower.length} vs ${mixed.length}`);
    const bld = await ask('Atlas'); ok('SC-09', 'a building by name: “Atlas” offers Atlas HQ', bld.some((x) => /Atlas HQ/.test(x)), bld.slice(0, 3).join(' | '));
    const iss = await ask('ISS-0417'); const wo = await ask('WO-0088'); ok('SC-11', 'an issue and a work order by their numbers', iss.some((x) => /0417/.test(x)) && wo.some((x) => /0088/.test(x)), `${iss[0] || 'none'} · ${wo[0] || 'none'}`);
  }
  await ask('camera'); await p.click('[data-testid=find-clear]'); await p.waitForTimeout(250);
  const cl = await p.evaluate(() => ({ v: document.querySelector('#find-in').value, f: document.activeElement?.id, n: document.querySelectorAll('#find-list [role=option]').length }));
  ok(`SC-${tag}-16`, 'the clear control empties the bar, keeps the focus in it and closes the results', cl.v === '' && cl.f === 'find-in' && cl.n === 0, JSON.stringify(cl));
  const opts = await ask('4.218'); const first = p.locator('#find-list [role=option]').first(); const fb = await first.boundingBox();
  if (touch) await p.touchscreen.tap(fb.x + fb.width / 2, fb.y + fb.height / 2); else await first.click(); await p.waitForTimeout(700);
  const at = await p.evaluate(() => location.hash);
  ok(`SC-${tag}-18`, `${touch ? 'a tap' : 'a click'} on the first result opens it (the reference room 4.218), and the results fit the window`, /R-ATL-4-218/.test(at) && fb.x >= 0 && fb.x + fb.width <= w + 1, `${opts[0] || 'none'} → ${at}`);
  ok(`SC-${tag}-err`, 'no console error, nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close();
}
await done();
