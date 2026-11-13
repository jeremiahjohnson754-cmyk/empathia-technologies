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
  // pan, fit, wheel and double-click (13 Nov 2026, 50/10 C: pan and fit-to-screen); the plain wheel is left to scroll the page, as in V2.5.3
  const pan = async () => (await svg.getAttribute('data-pan')).split(',').map(Number);
  await p.mouse.move(bb.x + bb.width * 0.4, bb.y + bb.height * 0.5); await p.keyboard.down('Shift'); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * 0.4 + 90, bb.y + bb.height * 0.5 + 40, { steps: 6 }); await p.mouse.up(); await p.keyboard.up('Shift');
  const pn = await pan(); const yp = await cam();
  ok(`LS-${tag}-12b`, 'Shift-drag pans the scene without turning it', pn[0] > 0 && pn[1] > 0 && yp.yaw === d.yaw, JSON.stringify([pn, yp]));
  await svg.focus(); await p.keyboard.press('Shift+ArrowLeft'); const pk = await pan();
  ok(`LS-${tag}-12c`, 'Shift with an arrow key pans too', pk[0] < pn[0], JSON.stringify(pk));
  // the plain wheel scrolls the page, so the stage is measured again before each pointer action (13 Nov 2026)
  const fresh = async () => { await svg.scrollIntoViewIfNeeded(); return svg.boundingBox(); };
  let fb = await fresh(); const z0 = (await cam()).zoom; await p.mouse.move(fb.x + fb.width * 0.5, fb.y + fb.height * 0.5); await p.mouse.wheel(0, -200); await p.waitForTimeout(100); const z1 = (await cam()).zoom;
  fb = await fresh(); await p.mouse.move(fb.x + fb.width * 0.5, fb.y + fb.height * 0.5); await p.keyboard.down('Control'); await p.mouse.wheel(0, -200); await p.keyboard.up('Control'); await p.waitForTimeout(100); const z2 = (await cam()).zoom;
  ok(`LS-${tag}-12d`, 'the plain wheel does not zoom (the page scrolls); Ctrl with the wheel zooms', z1 === z0 && z2 > z1, JSON.stringify([z0, z1, z2]));
  await p.locator('[data-testid=lite-building-3d]').getByRole('button', { name: 'Fit to the view' }).click(); const ft = await cam(); const pf = await pan();
  ok(`LS-${tag}-12e`, '“Fit to the view” brings the whole scene back (zoom 1, no pan) and keeps the angle', ft.zoom === 1 && pf[0] === 0 && pf[1] === 0 && ft.yaw === yp.yaw, JSON.stringify([ft, pf]));
  fb = await fresh(); await p.mouse.dblclick(fb.x + fb.width * 0.04, fb.y + fb.height * 0.04); await p.waitForTimeout(100); const rs = await cam();   // an empty corner, not a floor (a floor is a link)
  ok(`LS-${tag}-12f`, 'a double click resets the view (V2.5.3)', rs.yaw === c0.yaw && rs.pitch === c0.pitch && rs.zoom === c0.zoom && (await at(p)) === '#/lite/b/ATL', JSON.stringify(rs));
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
// the furnished room (13 Nov 2026): V2.5.3's own room drawing is the hero; the technical overlay is one tap away; objects open their cards
for (const [w, h, tag] of [[1440, 900, 'desktop'], [412, 915, 'phone']]) {
  const t = await open('#/lite/room/R-ATL-4-218?mode=engineer', { role: 'architect', w, h, sw: false }); const p = t.page; p.setDefaultTimeout(10000);
  const st = p.locator('[data-testid=lite-room-3d]'); await st.waitFor();
  const kinds = await st.getAttribute('data-kinds'); const top = await st.evaluate((e) => Math.round(e.getBoundingClientRect().top));
  ok(`LS-${tag}-R1`, '4.218 opens on the furnished room: V2.5.3’s own layout for it (a table, 14 chairs, two displays, two cameras, ceiling microphones, loudspeakers, the rack, the touch panel, the lectern)', (await st.getAttribute('data-hero')) === 'yes' && /table:1/.test(kinds) && /chair:14/.test(kinds) && /display:2/.test(kinds) && /camera:2/.test(kinds) && /micceil:2/.test(kinds) && /rack:1/.test(kinds) && /touch:1/.test(kinds) && /lectern:1/.test(kinds), kinds);
  ok(`LS-${tag}-R2`, 'the room is high on the page (right under its name and the lenses)', top < h * 0.62, String(top));
  const svgOf = () => st.locator('svg.l3-svg').innerHTML(); const polys = () => st.locator('svg.l3-svg polygon').count();
  const camOv = p.getByTestId('lite-ov-camera'); if ((await camOv.getAttribute('aria-checked')) === 'true') { await camOv.click(); await p.waitForTimeout(200); }
  const p0 = await polys(); await camOv.click(); await p.waitForTimeout(200); const p1 = await polys();
  ok(`LS-${tag}-R3`, 'switching camera coverage on draws the cameras’ views in the furnished room', p1 > p0 && (await camOv.getAttribute('aria-checked')) === 'true' && /ov=[^&]*camera/.test(await p.evaluate(() => location.hash)), `${p0} → ${p1}`);
  const seen = new Set(); for (const k of ['designed', 'commissioned', 'current', 'proposed']) { await p.getByTestId(`lite-state-${k}`).click(); await p.waitForTimeout(200); seen.add((await st.getAttribute('data-state')) + ':' + (await svgOf()).length); }
  ok(`LS-${tag}-R4`, 'the states draw the room differently: the current state marks the device with an open issue, the proposed state adds what the proposal adds (designed and commissioned may match, as they did in V2.5.3)', new Set([...seen].map((x) => x.split(':')[1])).size >= 2 && seen.size === 4, [...seen].join(' '));
  // a proposal that adds equipment draws it, marked as added (Horizon's townhall: the proposal adds positions the coverage model asks for)
  { const q = await open('#/lite/room/R-HZN-1-400?mode=engineer', { role: 'architect', w, h, sw: false }); const s2 = q.page.locator('[data-testid=lite-room-3d]'); await s2.waitFor(); const n0 = Number(await s2.getAttribute('data-objects'));
    await q.page.getByTestId('lite-state-proposed').click(); await q.page.waitForTimeout(250); const n1 = Number(await s2.getAttribute('data-objects'));
    ok(`LS-${tag}-R4b`, 'the proposed state draws what the proposal adds, as added objects', n1 > n0, `${n0} → ${n1}`); await q.close(); }
  await p.getByTestId('lite-state-current').click(); await p.waitForTimeout(150);
  const s0 = await svgOf(); await st.getByRole('button', { name: 'Turn right' }).click(); await p.waitForTimeout(150); const s1 = await svgOf();
  ok(`LS-${tag}-R5`, 'turning the room redraws it from the new side (faces turn towards or away)', s0 !== s1 && Number(await st.locator('svg.l3-svg').getAttribute('data-yaw')) === 75);
  const cam = st.locator('.l3-hitbtn[aria-label^="Cam"], .l3-hitbtn[aria-label*="camera" i]').first(); const camN = await st.locator('.l3-hitbtn[aria-label^="Cam"], .l3-hitbtn[aria-label*="camera" i]').count();
  if (camN) { await cam.click(); await p.waitForTimeout(250); }
  const dev = await p.getByTestId('lite-device').innerText();
  ok(`LS-${tag}-R6`, 'each piece of equipment is a named button; tapping a camera opens its card beside the room, and the camera is outlined', camN >= 1 && /Position/.test(dev) && /Identity/.test(dev) && (await st.getAttribute('data-sel')) !== '' && (await p.locator('[data-testid=lite-card]').count()) === 1, `${camN} ${dev.slice(0, 80)}`);
  const table = st.locator('.l3-hitbtn[aria-label^="Table"]').first(); if (await table.count()) { await table.click(); await p.waitForTimeout(200); }
  ok(`LS-${tag}-R7`, 'tapping the table shows what it is, its size and where it stands, from the room type’s layout (modelled)', /Table/.test(await p.getByTestId('lite-furn-card').innerText().catch(() => '')) && /× /.test(await p.getByTestId('lite-device').innerText()));
  // V2.5.3's "Show sound in the room": first reflections drawn in the furnished room, labelled as a model (13 Nov 2026)
  const l0 = await st.locator('svg.l3-svg polyline').count(); await p.getByTestId('lite-x-acoustic').click(); await p.waitForTimeout(200); const l1 = await st.locator('svg.l3-svg polyline').count();
  ok(`LS-${tag}-R7b`, '“Sound in the room” draws first reflections to the farthest seat and says it is a training and engineering model, not a certified simulation', l1 > l0 && /not a certified acoustic simulation/.test(await p.getByTestId('lite-acoustic-note').innerText()) && /ac=1/.test(await p.evaluate(() => location.hash)), `${l0} → ${l1}`);
  await p.getByTestId('lite-x-acoustic').click(); await p.waitForTimeout(100);
  // a button eases the camera there (V2.5.3 l3ViewTo); the scene marks itself moving until it arrives
  await st.getByRole('button', { name: 'Turn left' }).click(); const mv = await st.locator('svg.l3-svg[data-moving]').count(); await p.waitForTimeout(400); const mv2 = await st.locator('svg.l3-svg[data-moving]').count();
  ok(`LS-${tag}-R7c`, 'a turn by the button is eased and then settles', mv === 1 && mv2 === 0, `${mv} ${mv2}`);
  await p.getByTestId('lite-view-tech').click(); await p.waitForSelector('[data-testid=lite-3d]');
  ok(`LS-${tag}-R8`, '“Technical overlay” swaps to the positions-and-signal drawing, and the address keeps it (view=tech)', /view=tech/.test(await p.evaluate(() => location.hash)) && (await p.locator('[data-testid=lite-room-3d]').count()) === 0);
  // the view is a setting of the page, like the overlays: it is kept in the address (a reload keeps it) without adding a history step
  await p.reload(); await p.waitForSelector('[data-testid=lite-3d]'); await p.getByTestId('lite-view-room').click(); await st.waitFor();
  ok(`LS-${tag}-R9`, 'a reload keeps the technical overlay; “Furnished room” returns to the room and drops view=tech from the address', (await p.locator('[data-testid=lite-3d]').count()) === 0 && !/view=/.test(await p.evaluate(() => location.hash)));
  const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`LS-${tag}-R10`, 'no sideways scroll; no console error; nothing requested off the page', sw <= 0 && !t.errs.length && !t.off.length, `${sw} ${[...t.errs, ...t.off].slice(0, 3).join(' | ')}`);
  await t.close();
}
// a room type V2.5.3 never drew opens on the technical overlay and says why; a visitor sees the furnished room but opens no cards (V2.5.3)
// 13 Nov 2026 (founder: "second option"): a town hall V2.5.3 never drew is drawn from V2.5.3's townhall, scaled to it, and says so
{ const t = await open('#/lite/room/R-HZN-1-500', { role: 'architect', sw: false }); const p = t.page; const st = p.locator('[data-testid=lite-room-3d]'); await st.waitFor();
  const kinds = await st.getAttribute('data-kinds'); const note = await p.getByTestId('lite-scaled-note').innerText();
  ok('LS-R11', 'a town hall V2.5.3 never drew is furnished from V2.5.3’s townhall scaled to its 32 × 28 m: stage, four seating blocks, LED wall, cameras; the page says it is scaled and how many of its seats are drawn', /stage:1/.test(kinds) && /seatblock:4/.test(kinds) && /ledwall:1/.test(kinds) && /camera:3/.test(kinds) && /townhall \(Horizon 1\.400\), scaled to its 32 × 28 m/.test(note) && /of its 400 seats are drawn/.test(note) && !t.errs.length, `${kinds} | ${note}`);
  await p.goto(p.url().split('#')[0] + '#/lite/room/R-FRG-1-410'); await st.waitFor(); const k2 = await st.getAttribute('data-kinds');
  ok('LS-R11b', 'a control room V2.5.3 never drew is furnished from V2.5.3’s control room: the display wall and two desks', /display:4/.test(k2) && /desk:2/.test(k2) && /control room \(Horizon 2\.215\)/.test(await p.getByTestId('lite-scaled-note').innerText()), k2);
  await t.close(); }
{ const t = await open('#/lite/room/R-ATL-4-218', { role: 'visitor', sw: false }); const p = t.page; await p.waitForSelector('[data-testid=lite-room-3d]');
  ok('LS-R12', 'a visitor sees the furnished room, with the way in, and no object buttons (V2.5.3: a visitor opens no cards)', (await p.locator('[data-testid=lite-room-3d] .l3-hitbtn').count()) === 0 && Number(await p.getByTestId('lite-room-3d').getAttribute('data-objects')) > 0 && !t.errs.length);
  await t.close(); }
// 50/10 I: the flagship room journey across products, as a person walks it. The room and device ids must survive every hop and Back.
{ const t = await open('#/lite/room/R-ATL-4-218?mode=engineer', { role: 'architect', sw: false }); const p = t.page; p.setDefaultTimeout(10000); const st = p.locator('[data-testid=lite-room-3d]'); await st.waitFor();
  const camBtn = st.locator('.l3-hitbtn[aria-label^="Cam"], .l3-hitbtn[aria-label*="camera" i]').first(); await camBtn.click(); await p.waitForTimeout(200);
  const code = (await p.locator('[data-testid=lite-device] dd.mono').first().innerText()).trim();
  ok('LS-J1', '4.218 in Lite: tapping a camera in the furnished room names its position', /^[A-Z]-\d{4}$/.test(code), code);
  await p.getByRole('link', { name: /Open in the technical room view/ }).click(); await p.waitForSelector('[data-testid=room-view]');
  const h1 = await p.evaluate(() => location.hash); const panel = await p.getByTestId('device-panel').innerText();
  ok('LS-J2', 'the technical room view opens on the same room with the same device selected', h1 === `#/campus/ATL/4/R-ATL-4-218?device=${encodeURIComponent(code)}` && (await p.getByTestId('room-view').getAttribute('data-room')) === 'R-ATL-4-218' && panel.includes(code), `${h1} ${panel.slice(0, 80)}`);
  await p.goBack(); await st.waitFor();
  ok('LS-J3', 'Back returns to 4.218 in Lite, furnished', (await p.evaluate(() => location.hash)).startsWith('#/lite/room/R-ATL-4-218') && (await p.getByTestId('lite-room').getAttribute('data-room')) === 'R-ATL-4-218');
  await p.getByRole('link', { name: 'Search Party from this room' }).click(); await p.waitForFunction(() => location.hash.startsWith('#/search')); await p.waitForTimeout(400);
  ok('LS-J4', 'Search Party opens focused on the same room', (await p.evaluate(() => location.hash)) === '#/search?focus=Room:R-ATL-4-218' && /4\.218/.test(await p.locator('main').innerText()));
  await p.goBack(); await st.waitFor();
  await p.getByRole('link', { name: 'find the way' }).click(); await p.waitForFunction(() => location.hash.startsWith('#/lite/way')); await p.waitForTimeout(300);
  ok('LS-J5', 'Wayfinding opens with 4.218 as the destination', (await p.evaluate(() => location.hash)) === '#/lite/way?to=R-ATL-4-218' && /4\.218/.test(await p.locator('main').innerText()));
  await p.goBack(); await st.waitFor();
  ok('LS-J6', 'back in Lite, still 4.218; no console error and nothing requested off the page on the whole journey', (await p.getByTestId('lite-room').getAttribute('data-room')) === 'R-ATL-4-218' && !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close(); }
await done();
