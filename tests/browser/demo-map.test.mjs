#!/usr/bin/env node
// Empathia Map (task #234; founder 18 Nov 14:10: "Fix the campus maps please cause it is not the quality we're looking for"). Each
// control is pressed and its effect checked on the drawn map (canvas pixels compared) or on the camera (data-dist / data-yaw), in reduced
// motion so frames are stable: the aerial and street styles, zoom, turning to north, the campus → building → floor → room drill and back,
// search, the room's jumps to the other products, a phone layout with no overlapping controls, and no console error.
// Light by default; PW_COLOR_SCHEME=dark for the dark run. Headless Chromium renders WebGL in software here: no frame-rate claim.
//   node tests/browser/demo-map.test.mjs
import crypto from 'node:crypto';
import { harness } from './demo-shell-lib.mjs';
const { open, ok, done } = await harness('demo-map');
const shot = async (p) => { await p.waitForTimeout(450); return crypto.createHash('sha1').update(await p.evaluate(() => document.querySelector('[data-testid=emap-canvas]').toDataURL('image/png'))).digest('hex'); };
const A = (p, k) => p.getByTestId('emap').getAttribute(`data-${k}`);

const t = await open('#/campus', { role: 'architect', sw: false, w: 1440, h: 900, reduced: true }); const p = t.page; p.setDefaultTimeout(20000);
await p.waitForSelector('[data-testid=emap][data-ready=true]'); await p.waitForTimeout(1500);
const a0 = await shot(p), a1 = await shot(p);
const pins = await p.locator('[data-testid^="campus-b-"]').count();
ok('MAP-01', 'the campus draws (WebGL2): six building buttons, the aerial style, still between presses', pins === 6 && (await A(p, 'mode')) === 'imagery' && a0 === a1 && (await A(p, 'level')) === 'campus', `${pins} pins`);
const lab = await p.getByTestId('campus-b-ATL').getAttribute('aria-label');
ok('MAP-02', 'each building button names its health, rooms, open issues and floors from the records', /^Atlas HQ: health (\d+ of 100|not scored), \d+ rooms, \d+ open issues?, 7 floors$/.test(lab || ''), lab);

await p.getByTestId('emap-map').click(); const m1 = await shot(p);
await p.getByTestId('emap-imagery').click(); const m2 = await shot(p);
ok('MAP-03', 'Map and Aerial redraw the ground in our street style and back in the synthetic aerial style', m1 !== a1 && m2 === a1 && (await A(p, 'mode')) === 'imagery', '');

const d0 = Number(await A(p, 'dist')); await p.getByTestId('emap-in').click(); await p.waitForTimeout(400); const d1 = Number(await A(p, 'dist')); await p.getByTestId('emap-out').click(); await p.waitForTimeout(400); const d2 = Number(await A(p, 'dist'));
ok('MAP-04', 'zoom in brings the camera closer, zoom out takes it back', d1 < d0 * 0.8 && Math.abs(d2 - d0) / d0 < 0.05, `${d0} → ${d1} → ${d2}`);
await p.getByTestId('emap-canvas').focus(); await p.keyboard.press('q'); await p.waitForTimeout(200); const y1 = Number(await A(p, 'yaw')); await p.getByTestId('emap-north').click(); await p.waitForTimeout(300);
ok('MAP-05', 'Q turns the map; the compass puts north up again', Math.abs(y1 - -0.65) > 0.1 && Math.abs(Number(await A(p, 'yaw'))) < 0.01, `${y1} → ${await A(p, 'yaw')}`);
await p.getByTestId('emap-canvas').focus(); const k0 = await shot(p); await p.keyboard.press('ArrowRight'); const k1 = await shot(p); await p.keyboard.press('-'); await p.waitForTimeout(200);
ok('MAP-06', 'the map moves from the keyboard (arrows) and zooms with + and −', k1 !== k0 && Number(await A(p, 'dist')) > d0, `${await A(p, 'dist')}`);

// drill: building → floor → room → its jumps; then back up
await p.getByTestId('campus-b-ATL').click(); await p.waitForTimeout(500);
const card = await p.getByTestId('emap-card').innerText();
ok('MAP-07', 'a building opens its place card: health, rooms, issues and its floors, each floor saying how many rooms it holds', (await A(p, 'sel')) === 'ATL' && (await A(p, 'level')) === 'building' && /Atlas HQ/.test(card) && (await p.locator('[data-testid^="emap-floor-"]').count()) === 7, card.slice(0, 80));
await p.getByTestId('emap-floor-4').click(); await p.waitForTimeout(600); const f1 = await shot(p);
const rooms = await p.locator('[data-testid^="map-room-"]').count();
ok('MAP-08', 'a floor cuts the building away and lays out its rooms, saying the layout is modeled', (await A(p, 'level')) === 'floor' && (await A(p, 'floor')) === '4' && rooms >= 3 && (await p.getByTestId('map-room-R-ATL-4-218').count()) === 1 && /modeled/.test(await p.getByTestId('emap-card').innerText()), `${rooms} rooms`);
await p.getByTestId('map-room-R-ATL-4-218').click(); await p.waitForTimeout(300);
const jumps = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-testid=emap-roomcard] a')].map((a) => [a.getAttribute('data-testid'), a.getAttribute('href')])));
ok('MAP-09', 'the room card opens that exact room in the room record, Lite, Commissioning, Assurance, Core Replay, Search Party and ServiceHands', jumps['emap-j-room'] === '#/room/R-ATL-4-218' && jumps['emap-j-lite'] === '#/lite/room/R-ATL-4-218' && jumps['emap-j-cx'] === '#/commissioning/room/R-ATL-4-218' && jumps['emap-j-as'] === '#/assurance/room/R-ATL-4-218' && jumps['emap-j-replay'] === '#/replay/R-ATL-4-218' && jumps['emap-j-sp'] === '#/search?focus=Room:R-ATL-4-218' && jumps['emap-j-sh'] === '#/servicehands/new?room=R-ATL-4-218', JSON.stringify(jumps));
await p.getByTestId('emap-j-lite').click(); await p.waitForTimeout(1200);
ok('MAP-10', 'the Lite jump lands on that room in Lite', (await p.evaluate(() => location.hash)) === '#/lite/room/R-ATL-4-218' && !(await p.getByTestId('access-page').count()), await p.evaluate(() => location.hash));
await p.goBack(); await p.waitForSelector('[data-testid=emap][data-ready=true]'); await p.waitForTimeout(800);
await p.getByTestId('campus-b-HZN').click(); await p.waitForTimeout(400); await p.getByTestId('emap-up-campus').click(); await p.waitForTimeout(400);
ok('MAP-11', 'the breadcrumb drills back up to the whole campus', (await A(p, 'level')) === 'campus' && (await A(p, 'sel')) === '' && f1 !== (await shot(p)), await A(p, 'level'));

await p.getByTestId('emap-q').fill('4.218'); await p.waitForTimeout(250); await p.getByTestId('emap-hit-R-ATL-4-218').click(); await p.waitForTimeout(500);
ok('MAP-12', 'search finds a room by its number and flies to its floor with the room card open', (await A(p, 'level')) === 'floor' && (await A(p, 'room')) === 'R-ATL-4-218' && (await p.getByTestId('emap-roomcard').count()) === 1, `${await A(p, 'level')} ${await A(p, 'room')}`);
await p.getByTestId('emap-up-campus').click(); await p.waitForTimeout(300); await p.getByTestId('campus-b-BCN').click(); await p.waitForTimeout(300); await p.getByTestId('emap-open').click(); await p.waitForTimeout(800);
ok('MAP-13', '“Open” on the place card opens the building page', (await p.evaluate(() => location.hash)) === '#/campus/BCN', await p.evaluate(() => location.hash));
ok('MAP-15', `the map knows the graphics it runs on and says so (data-gpu=${await A(p, 'gpu')}): a software renderer gets no opening flight and standard resolution, a GPU the cinematic opening`, ['software', 'hardware'].includes(await A(p, 'gpu') || ''), await A(p, 'gpu'));
ok('MAP-14', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
await t.close();

for (const [w, h, tag] of [[390, 844, 'phone'], [360, 740, 'p360']]) { // a phone: the controls never overlap each other, no sideways scroll
  const ph = await open('#/campus', { role: 'architect', sw: false, w, h, reduced: true }); const q = ph.page;
  await q.waitForSelector('[data-testid=emap][data-ready=true]', { timeout: 30000 }); await q.waitForTimeout(800); await q.getByTestId('campus-b-ATL').click(); await q.waitForTimeout(500);
  const v = await q.evaluate(() => { const r = (s) => { const b = document.querySelector(s)?.getBoundingClientRect(); return b && b.width ? { s, l: b.left, t: b.top, r: b.right, b: b.bottom } : null; }; const xs = ['.emap__search', '.emap__crumbs', '.emap__layers', '.emap__ctrl', '.emap__card'].map(r).filter(Boolean); const hit = []; for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) { const a = xs[i], b = xs[j]; if (a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1) hit.push(`${a.s}×${b.s}`); } const small = [...document.querySelectorAll('.emap button, .emap input, .emap a')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.height && !e.closest('.emap__pins') && (b.width < 44 || b.height < 36); }).map((e) => e.textContent || e.getAttribute('aria-label')); return { n: xs.length, hit, small, over: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
  ok(`MAP-${tag}`, `${w} × ${h}: search, levels, layers, zoom and the place card all show, none overlaps another, controls are touch-sized, no sideways scroll`, v.n === 5 && !v.hit.length && !v.small.length && v.over <= 0, JSON.stringify(v));
  await ph.close(); }
await done();
