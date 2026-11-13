#!/usr/bin/env node
// V2.5.3's room tabs in Lite (RT_TABS, restored 13 Nov 2026 for the founder's 50/10 Lite directive): Overview, Room states, Design,
// Calculations, Sound, Cameras, Systems, Records. Walked as a person would: by clicking each tab and by the arrow keys; the tab survives a
// reload and a shared link; a device chosen in a tab is selected in the room; a visitor sees Overview only.
//   node tests/browser/demo-lite-tabs.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-lite-tabs');
const NAMES = ['Overview', 'Room states', 'Design', 'Calculations', 'Sound', 'Cameras', 'Systems', 'Records'];
const PANEL = { states: 'lite-rt-states', design: 'lite-rt-design', calc: 'lite-rt-calc', av: 'lite-rt-av', cam: 'lite-rt-cam', systems: 'lite-rt-systems', records: 'lite-rt-records' };

for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
  const t = await open('#/lite/room/R-ATL-4-218?mode=engineer', { role: 'architect', w, h, sw: false }); const p = t.page; p.setDefaultTimeout(10000);
  await p.getByTestId('lite-rtabs').waitFor();
  const names = await p.locator('[data-testid=lite-rtabs] [role=tab]').allInnerTexts();
  ok(`RT-${tag}-01`, 'the room page has V2.5.3’s eight tabs, Overview chosen, and the room’s usual sections under it', names.join() === NAMES.join() && (await p.getByTestId('lite-rtab-overview').getAttribute('aria-selected')) === 'true' && (await p.getByTestId('lite-m-access').count()) === 1, names.join());
  const seen = [];
  for (const [k, id] of Object.entries(PANEL)) { await p.getByTestId(`lite-rtab-${k}`).click(); await p.getByTestId(id).waitFor(); seen.push(`${k}:${(await p.getByTestId(id).innerText()).length > 80}:${new URL(p.url()).hash.includes(`tab=${k}`)}`); }
  ok(`RT-${tag}-02`, 'each tab opens its own subject, with content, and names itself in the address', seen.every((x) => x.endsWith('true:true')), seen.join(' '));
  await p.getByTestId('lite-rtab-states').click(); const states = await p.getByTestId('lite-rt-states').innerText();
  ok(`RT-${tag}-03`, 'Room states compares Designed, Commissioned, Current and Proposed from the record', ['Designed', 'Commissioned', 'Current', 'Proposed'].every((s) => states.includes(s)) && (await p.locator('[data-testid=lite-rt-states] tbody tr').count()) === 4);
  await p.getByTestId('lite-rtab-design').click(); const design = await p.getByTestId('lite-rt-design').innerText();
  ok(`RT-${tag}-04`, 'Design gives the intent, size, seats, the design score and the engine’s design checks', /Design score \d+/.test(design) && /Intent/.test(design) && /Design checks/.test(design) && /sightline|viewing distance/i.test(design), design.slice(0, 160));
  await p.getByTestId('lite-rtab-calc').click(); const calc = await p.getByTestId('lite-rt-calc').innerText();
  ok(`RT-${tag}-05`, 'Calculations names each formula and assumption, with the measurements beside it, labelled estimates', /Sabine/.test(calc) && /0\.057/.test(calc) && /Estimates, not measurements/.test(calc) && (await p.getByTestId('lite-meas').count()) === 1);
  await p.getByTestId('lite-rtab-cam').click(); await p.locator('[data-testid=lite-rt-cam] .lt-rlist button').first().click(); await p.waitForTimeout(250);
  const dev = new URL(p.url()).hash; const card = await p.getByTestId('lite-device').innerText();
  ok(`RT-${tag}-06`, 'a camera chosen in the Cameras tab is selected in the room, and its card opens', /device=A-0/.test(dev) && /Camera|PTZ|camera/i.test(card) && (await p.locator('[data-testid=lite-rt-cam] .lt-rlist button[aria-pressed=true]').count()) === 1, `${dev} ${card.slice(0, 80)}`);
  await p.getByTestId('lite-rtab-records').click(); const rec = await p.getByTestId('lite-rt-records').innerText();
  ok(`RT-${tag}-07`, 'Records gives the lifecycle, baselines, tests and open issues, and the room’s places in the other products', /Baseline/.test(rec) && /applicable verified/.test(rec) && (await p.locator('[data-testid=lite-rt-records] [data-testid=room-jump-assurance]').count()) === 1);
  await p.reload(); await p.getByTestId('lite-rt-records').waitFor();
  ok(`RT-${tag}-08`, 'the chosen tab survives a reload', (await p.getByTestId('lite-rtab-records').getAttribute('aria-selected')) === 'true');
  await p.getByTestId('lite-rtab-records').focus(); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150); const wrap = await p.evaluate(() => document.activeElement?.getAttribute('data-testid'));
  await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(150); const back = await p.evaluate(() => document.activeElement?.getAttribute('data-testid'));
  ok(`RT-${tag}-09`, 'the arrow keys move between tabs (wrapping at the end) and open them; only the chosen tab is in the Tab order', wrap === 'lite-rtab-overview' && back === 'lite-rtab-systems' && (await p.getByTestId('lite-rt-systems').count()) === 1 && (await p.locator('[data-testid=lite-rtabs] [tabindex="0"]').count()) === 1, `${wrap} ${back}`);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`RT-${tag}-10`, 'no sideways scroll; no console error; nothing requested off the page', sw <= 0 && !t.errs.length && !t.off.length, `${sw} ${[...t.errs, ...t.off].slice(0, 3).join(' | ')}`);
  await t.close();
}
{ const t = await open('#/lite/room/R-ATL-4-218?tab=systems', { role: 'visitor', sw: false }); const p = t.page; await p.getByTestId('lite-room').waitFor(); await p.waitForTimeout(300);
  ok('RT-visitor', 'a visitor sees the room without the tabs, and a tab in the address does not open the systems record', (await p.getByTestId('lite-rtabs').count()) === 0 && (await p.getByTestId('lite-rt-systems').count()) === 0);
  await t.close(); }
await done();
