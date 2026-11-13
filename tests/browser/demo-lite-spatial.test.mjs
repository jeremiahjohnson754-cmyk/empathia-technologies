#!/usr/bin/env node
// Lite spatial restoration (founder directive 12 Nov 2026, "50/10"): the V2.5.3 hierarchy, walked the way a person walks it, with no
// internal state set by the test. Campus → building → floor → room by tapping the scene; back up by the page's own links and the browser's
// Back; deep links and reload; the camera turns, tilts, zooms and goes to plan by its buttons, the keyboard and a drag; the scene leads the
// page (the room is the hero); phone and desktop; no console error, nothing requested off the page.
//   node tests/browser/demo-lite-spatial.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-lite-spatial');
const at = (p) => p.evaluate(() => location.hash);
const wait = (p, sel) => p.waitForSelector(sel, { timeout: 10000 });

for (const [w, h, tag] of [[1440, 900, 'desktop'], [412, 915, 'phone']]) {
  const t = await open('#/lite', { role: 'architect', w, h, sw: false }); const p = t.page; p.setDefaultTimeout(10000);
  await wait(p, '[data-testid=lite-campus-3d]');
  // the scene is the first thing after the page head and the lens row
  const lead = await p.evaluate(() => { const st = document.querySelector('[data-testid=lite-campus-3d]').getBoundingClientRect(); return { top: Math.round(st.top), h: Math.round(st.height), vh: innerHeight }; });
  ok(`LS-${tag}-01`, 'Lite opens on the campus in 3D, high on the page (the scene is the hero)', lead.top < lead.vh * 0.5 && lead.h > 220, JSON.stringify(lead));
  const blds = await p.locator('[data-testid=lite-campus-3d] .l3-hitbtn').count();
  ok(`LS-${tag}-02`, 'every campus building is a named button on the scene', blds === 6 && (await p.locator('[data-testid=lite-bld-ATL]').getAttribute('aria-label')).includes('Atlas HQ'), String(blds));
  await p.locator('[data-testid=lite-bld-ATL]').click(); await wait(p, '[data-testid=lite-building-3d]');
  ok(`LS-${tag}-03`, 'tapping Atlas opens the building with its floors drawn apart, each floor a button', (await at(p)) === '#/lite/b/ATL' && (await p.locator('[data-testid=lite-building-3d] .l3-hitbtn').count()) === 7 && (await p.locator('[data-testid=l3-floor-label-1]').innerText()).includes('you are here'));
  await p.locator('[data-testid=l3-floor-4]').click(); await wait(p, '[data-testid=lite-floor-3d]');
  const rooms = await p.locator('[data-testid=lite-floor-3d] .l3-hitbtn').count();
  ok(`LS-${tag}-04`, 'tapping floor 4 opens the floor in 3D: corridor, lifts and stairs labelled, each room a button', (await at(p)) === '#/lite/b/ATL/4' && rooms >= 4 && /Lifts/.test(await p.locator('[data-testid=lite-floor-3d]').innerText()) && /Stairs/.test(await p.locator('[data-testid=lite-floor-3d]').innerText()), String(rooms));
  await p.locator('[data-testid="l3-open-R-ATL-4-218"]').click(); await wait(p, '[data-testid=lite-room]');
  ok(`LS-${tag}-05`, 'tapping 4.218 opens the furnished room in 3D', (await at(p)).startsWith('#/lite/room/R-ATL-4-218') && (await p.locator('[data-testid=lite-room] svg').count()) > 0);
  // up again: the browser's Back, then the page's own links
  await p.goBack(); await wait(p, '[data-testid=lite-floor-3d]');
  ok(`LS-${tag}-06`, 'Back returns to floor 4 in 3D', (await at(p)) === '#/lite/b/ATL/4');
  await p.locator('[data-testid=lite-up-building]').click(); await wait(p, '[data-testid=lite-building-3d]');
  ok(`LS-${tag}-07`, '“All floors of Atlas” goes up to the building', (await at(p)) === '#/lite/b/ATL');
  await p.locator('[data-testid=lite-up-campus]').click(); await wait(p, '[data-testid=lite-campus-3d]');
  ok(`LS-${tag}-08`, '“Back to the campus” goes up to the campus', (await at(p)) === '#/lite');
  await p.goBack(); await wait(p, '[data-testid=lite-building-3d]');
  ok(`LS-${tag}-09`, 'Back from the campus returns to the building, the way the reader came', (await at(p)) === '#/lite/b/ATL');
  // the camera: buttons, keyboard, drag
  const svg = p.locator('[data-testid=lite-building-3d] .l3-svg'); const cam = async () => ({ yaw: Number(await svg.getAttribute('data-yaw')), pitch: Number(await svg.getAttribute('data-pitch')), zoom: Number(await svg.getAttribute('data-zoom')) });
  const c0 = await cam(); await p.locator('[data-testid=lite-building-3d]').getByRole('button', { name: 'Turn right' }).click(); const c1 = await cam();
  await p.locator('[data-testid=lite-building-3d]').getByRole('button', { name: 'Zoom in' }).click(); const c2 = await cam();
  await p.locator('[data-testid=lite-building-3d]').getByRole('button', { name: 'Plan view from above' }).click(); const c3 = await cam();
  await p.locator('[data-testid=lite-building-3d]').getByRole('button', { name: 'Reset the view' }).click(); const c4 = await cam();
  ok(`LS-${tag}-10`, 'the camera turns, zooms, goes to plan from above and resets by its buttons', c1.yaw === c0.yaw + 45 && c2.zoom > c1.zoom && c3.pitch === 90 && c4.yaw === c0.yaw && c4.pitch === c0.pitch, JSON.stringify([c0, c1, c2, c3, c4]));
  await svg.focus(); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowUp'); const k = await cam();
  ok(`LS-${tag}-11`, 'the arrow keys turn and tilt the focused scene', k.yaw === c0.yaw + 15 && k.pitch > c0.pitch, JSON.stringify(k));
  const bb = await svg.boundingBox(); await p.mouse.move(bb.x + bb.width * 0.3, bb.y + bb.height * 0.5); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * 0.3 + 120, bb.y + bb.height * 0.5, { steps: 6 }); await p.mouse.up(); const d = await cam();
  ok(`LS-${tag}-12`, 'dragging the scene orbits it, and a drag is not taken as a tap', d.yaw !== k.yaw && (await at(p)) === '#/lite/b/ATL', JSON.stringify(d));
  // deep link and reload
  await p.goto(p.url().split('#')[0] + '#/lite/b/MER/2'); await wait(p, '[data-testid=lite-floor-3d]'); await p.reload(); await wait(p, '[data-testid=lite-floor-3d]');
  ok(`LS-${tag}-13`, 'a floor’s address opens it directly and survives a reload', (await at(p)) === '#/lite/b/MER/2');
  const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`LS-${tag}-14`, 'no sideways scroll; no console error; nothing requested off the page', sw <= 0 && !t.errs.length && !t.off.length, `${sw} ${[...t.errs, ...t.off].slice(0, 3).join(' | ')}`);
  await t.close();
}
// every building and floor in the campus model opens in 3D
{ const t = await open('#/lite', { role: 'architect', sw: false }); const p = t.page; const bad = [];
  for (const [b, n] of [['ATL', 7], ['MER', 2], ['FRG', 2], ['BCN', 3], ['HZN', 2], ['NST', 3]]) for (const f of ['', ...Array.from({ length: n }, (_, i) => `/${i + 1}`)]) {
    await p.goto(p.url().split('#')[0] + `#/lite/b/${b}${f}`); const sel = f ? '[data-testid=lite-floor-3d]' : '[data-testid=lite-building-3d]';
    if (!(await p.waitForSelector(sel, { timeout: 8000 }).then(() => true).catch(() => false))) bad.push(`${b}${f}`); }
  ok('LS-all', 'every campus building and each of its floors opens in 3D', !bad.length && !t.errs.length, [...bad, ...t.errs].slice(0, 6).join(' | ')); await t.close(); }
await done();
