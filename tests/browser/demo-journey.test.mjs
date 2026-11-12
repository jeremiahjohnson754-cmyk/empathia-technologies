#!/usr/bin/env node
// One room across the products (70/10 task 70-6, first journey): Lite → Search Party → the technical room view → the commissioning
// record, each step on the same room's identity, with back, forward and reload keeping it. Synthetic data; nothing leaves the page.
//   node tests/browser/demo-journey.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-journey');
const ROOM = 'R-ATL-4-218';
for (const w of [1440, 390]) {
  const t = await open(`#/lite/room/${ROOM}?mode=engineer`, { role: 'architect', w, h: 860 }); const p = t.page; await p.getByTestId('lite-room').waitFor();
  const hash = () => p.evaluate(() => location.hash);
  await p.click(`a[href="#/search?focus=Room:${ROOM}"]`); await p.getByTestId('search-party').waitFor(); await p.waitForTimeout(300);
  const rel = await p.locator('[data-testid=sp-list-first] li').count(); const h1 = await hash();
  ok(`J-${w}-01`, `${w} px: from the room in Lite, Search Party opens on the same room with its related records`, new RegExp(`focus=Room(:|%3A)${ROOM}`).test(h1) && rel >= 1, `${h1} ${rel}`);
  await p.goBack(); await p.getByTestId('lite-room').waitFor(); const back = await p.getByTestId('lite-room').getAttribute('data-room');
  await p.goForward(); await p.getByTestId('search-party').waitFor(); const fwd = await hash(); await p.goBack(); await p.getByTestId('lite-room').waitFor();
  ok(`J-${w}-02`, 'back returns to the same room in Lite; forward returns to Search Party on it', back === ROOM && /focus=Room/.test(fwd), `${back} ${fwd}`);
  await p.click('.lt-foot a:has-text("technical room view")'); await p.waitForTimeout(600); const rv = await hash(); const has1 = await p.locator(`main [data-room="${ROOM}"]`).count();
  await p.reload(); await p.waitForTimeout(800); const rv2 = await hash(); const has2 = await p.locator(`main [data-room="${ROOM}"]`).count();
  ok(`J-${w}-03`, 'the technical room view opens on the same room and keeps it through a reload', rv.includes(ROOM) && rv2 === rv && has1 >= 1 && has2 >= 1, `${rv} ${has1} ${has2}`);
  await p.goBack(); await p.getByTestId('lite-room').waitFor();
  const dev = p.locator('.lt-dev[data-cat="camera"], .lt-dev[data-cat="bar"]').first(); await dev.dispatchEvent('click'); await p.getByTestId('lite-card').waitFor();
  await p.click(`[data-testid=lite-card-cx] a[href="#/commissioning/room/${ROOM}"]`); await p.waitForTimeout(600); const h3 = await hash(); const main = await p.evaluate(() => document.querySelector('main')?.innerText || '');
  ok(`J-${w}-04`, 'from a device’s card, the commissioning record opens on the same room', h3 === `#/commissioning/room/${ROOM}` && /4\.218|R-ATL-4-218/.test(main), h3);
  await p.goBack(); await p.getByTestId('lite-room').waitFor(); const last = await p.getByTestId('lite-room').getAttribute('data-room');
  const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`J-${w}-05`, 'back again lands on the room in Lite; no overflow, no console error, no request leaving the page', last === ROOM && over <= 0 && !t.errs.length && !t.off.length, [last, over, ...t.errs, ...t.off].slice(0, 4).join(' | '));
  await t.close();
}
await done();
