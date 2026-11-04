#!/usr/bin/env node
// The living campus: site → building → floor → room at 390/768/1440 in light and dark. The spatial stage stays dark in light mode (D36);
// every building and room on a stage is keyboard reachable and also in a list; glyphs count the open issues of the room records;
// unknown buildings/floors/rooms say so; no page error, no request leaves the page, no horizontal overflow.
//   node tests/browser/demo-campus.test.mjs
import path from 'node:path';
import { harness, VIEWPORTS, SCHEMES } from './demo-spaces-lib.mjs';
const { ok, open, done, out } = await harness('demo-campus');

for (const scheme of SCHEMES) for (const vp of VIEWPORTS) {
  const tag = `${scheme}-${vp[2]}`; const t = await open(vp, scheme, { hash: '#/campus' });
  const site = await t.page.evaluate(() => {
    const st = document.querySelector('[data-testid="campus-stage"]'); const bg = st ? getComputedStyle(st).backgroundColor : '';
    const lum = (() => { const m = bg.match(/\d+(\.\d+)?/g); if (!m) return 1; const [r, g, b] = m.map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; })();
    return { h1: document.querySelector('main h1')?.textContent || '', buildings: document.querySelectorAll('[data-testid^="campus-b-"]').length, cards: document.querySelectorAll('[data-testid="building-list"] .kit-meter').length, lum, stats: document.querySelector('.campus__stats')?.textContent || '' };
  });
  // changed for uplift/core-screens (founder, 2026-11-04: V2.5.3's buildings list with health bars): the list is the kit's MeterRow
  ok(`CA-${tag}-01`, 'the campus page shows the site, six buildings on the map and six in the list', /Northstar Innovation Campus/.test(site.h1) && site.buildings === 6 && site.cards === 6, JSON.stringify(site));
  ok(`CA-${tag}-02`, 'the spatial stage stays dark in either theme (D36)', site.lum < 0.25, site.lum);
  ok(`CA-${tag}-03`, 'no horizontal overflow on the campus page', (await t.overflow()) <= 0, await t.overflow());
  if (vp[2] === 'desktop') await t.page.screenshot({ path: path.join(out, `${tag}-site.png`) });
  // keyboard: focus a building on the map and press Enter
  await t.page.focus('[data-testid="campus-b-ATL"]'); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(250);
  ok(`CA-${tag}-04`, 'a building on the map opens with the keyboard', (await t.page.evaluate(() => location.hash)) === '#/campus/ATL' && /Atlas HQ/.test(await t.text()));
  const fl = await t.page.locator('[data-testid^="floor-ATL-"]').count();
  ok(`CA-${tag}-05`, 'Atlas HQ lists its seven floors, each saying whether it holds a canonical room', fl === 7, fl);
  await t.page.click('[data-testid="floor-ATL-4"]'); await t.page.waitForTimeout(250);
  const floor = await t.page.evaluate(() => ({ tiles: document.querySelectorAll('[data-testid^="floor-room-"]').length, rows: document.querySelectorAll('[data-testid="room-list"] tbody tr').length }));
  ok(`CA-${tag}-06`, 'floor 4 shows its rooms on the plate and in the list (same count)', floor.tiles >= 3 && floor.tiles === floor.rows, JSON.stringify(floor));
  ok(`CA-${tag}-07`, 'no horizontal overflow on the floor page', (await t.overflow()) <= 0, await t.overflow());
  await t.page.click('[data-testid="floor-room-R-ATL-4-218"]'); await t.page.waitForTimeout(400);
  ok(`CA-${tag}-08`, 'a room tile opens the room view at its campus address', (await t.page.evaluate(() => location.hash)) === '#/campus/ATL/4/R-ATL-4-218' && (await t.page.locator('[data-testid="room-view"]').count()) === 1);
  // the glyphs agree with the room records: open issues of Beacon on the map = sum on the rooms list
  await t.go('#/campus');
  const glyph = await t.page.evaluate(() => { const g = document.querySelector('[data-testid="campus-b-BCN"]'); return g ? g.getAttribute('aria-label') : ''; });
  await t.go('#/rooms?building=BCN');
  const listed = await t.page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="room-list"] tbody tr td:nth-child(6)')).reduce((n, td) => n + (Number(td.textContent) || 0), 0));
  ok(`CA-${tag}-09`, 'a building’s issue glyph equals the open issues of its rooms', new RegExp(`, ${listed} open issue`).test(glyph || ''), `${glyph} vs ${listed}`);
  // destructive: unknown building, floor out of range, room on the wrong floor
  for (const [h, w] of [['#/campus/XYZ', 'building XYZ'], ['#/campus/ATL/99', 'floor 99'], ['#/campus/ATL/5/R-ATL-4-218', 'room R-ATL-4-218']]) { await t.go(h); ok(`CA-${tag}-10${h}`, `an unknown address says so (${w})`, /Not on this campus/.test(await t.text()) && new RegExp(w).test(await t.text())); }
  // back/forward keeps the address and the page in step
  await t.go('#/campus/HZN'); await t.go('#/campus/HZN/1'); await t.page.goBack(); await t.page.waitForTimeout(250);
  ok(`CA-${tag}-11`, 'back returns to the building page', (await t.page.evaluate(() => location.hash)) === '#/campus/HZN' && /Horizon Media Center/.test(await t.text()));
  // the rooms index filters, with an empty state
  await t.go('#/rooms'); const all = await t.page.locator('[data-testid="room-list"] tbody tr').count();
  ok(`CA-${tag}-12`, 'the rooms index lists the thirty rooms', all === 30, all);
  await t.go('#/rooms?state=OPERATIONAL&building=HZN');
  ok(`CA-${tag}-13`, 'a filter with no match shows an empty state, not a blank', /No room matches/.test(await t.text()));
  // D36 under an explicit Light choice (the shell's switch sets data-theme="light"): the stage keeps the dark tokens
  await t.go('#/campus'); const forced = await t.page.evaluate(() => { const was = document.documentElement.dataset.theme; document.documentElement.dataset.theme = 'light'; const m = getComputedStyle(document.querySelector('[data-testid="campus-stage"]')).backgroundColor.match(/\d+/g).map(Number); if (was === undefined) delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = was; return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; });
  ok(`CA-${tag}-15`, 'with Light chosen explicitly, the spatial stage still takes the dark tokens (D36)', forced < 0.25, forced);
  ok(`CA-${tag}-14`, 'no page error and no request leaves the page', !t.errs.length && !t.ext.length, [...t.errs, ...t.ext].join(' | '));
  await t.close();
}
await done();
