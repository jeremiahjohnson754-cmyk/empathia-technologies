#!/usr/bin/env node
// The other three worlds in Lite (13 Nov 2026): University, Stadium and the convention centre walked as on the Enterprise campus — the
// world in 3D, a building or level by tapping the scene, a level with its rooms, a furnished room drawn by V2.5.3's code from the estate's
// record, back up by the page's links and Back; a room of a type V2.5.3 never drew says so; deep links survive a reload.
//   node tests/browser/demo-lite-worlds.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-lite-worlds');
const at = (p) => p.evaluate(() => location.hash);

for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
  for (const world of ['university', 'stadium', 'convention']) {
    const t = await open(`#/lite/w/${world}`, { role: 'architect', w, h, sw: false }); const p = t.page; p.setDefaultTimeout(15000);
    await p.getByTestId('lw-world-3d').waitFor(); const n = await p.locator('[data-testid=lw-world-3d] .l3-hitbtn').count();
    ok(`LW-${tag}-${world}-01`, `${world}: the world opens in 3D, each ${world === 'university' ? 'building' : 'level'} a button on the scene`, n >= (world === 'university' ? 10 : 2), String(n));
    // down by tapping the scene on a desktop; on a phone the scene's targets crowd, so the list under it is used (it opens the same places)
    if (tag === 'desktop') await p.locator('[data-testid=lw-world-3d] .l3-hitbtn').first().click(); else await p.locator('[data-testid=lw-tops] a').first().click(); await p.waitForTimeout(400);
    const h1 = await at(p);
    if (world === 'university') { await p.getByTestId('lw-place-3d').waitFor(); if (tag === 'desktop') await p.locator('[data-testid=lw-place-3d] .l3-hitbtn').last().click(); else await p.locator('[data-testid^=lw-lv-]').last().click(); }
    await p.getByTestId('lw-level-3d').waitFor(); const lv = await at(p);
    ok(`LW-${tag}-${world}-02`, 'tapping the scene goes down to a level drawn in 3D, each room a button', /\/f\//.test(lv) && (await p.locator('[data-testid=lw-level-3d] .l3-hitbtn').count()) >= 1, `${h1} ${lv}`);
    await p.locator('[data-testid=lw-rooms] a').first().click(); await p.getByTestId('lw-room').waitFor();
    // 13 Nov 2026: a room may now be drawn by Empathia's own program (a stadium suite) rather than V2.5.3's layout for the nearest type; either
    // counts as furnished here (changed from "drawn by V2.5.3's layout" only)
    const furn = await p.getByTestId('lw-room').getAttribute('data-furnished'); const stage = furn === 'designed' ? 'rm-room-3d' : 'lite-room-3d'; const objs = Number(await p.locator(`[data-testid=${stage}]`).getAttribute('data-objects').catch(() => '0'));
    ok(`LW-${tag}-${world}-03`, 'the first room of the level is furnished — by V2.5.3’s layout for its type or Empathia’s program — with its equipment record beside it', (furn === 'yes' || furn === 'designed') && objs > 5 && (await p.getByTestId('lw-equipment').count()) === 1, `${furn} ${objs}`);
    if (furn === 'designed') { await p.getByTestId('rm-eye-door').click(); await p.waitForTimeout(300); ok(`LW-${tag}-${world}-04`, 'the designed room can be seen from the doorway', (await p.getByTestId('rm-room-3d').getAttribute('data-eye')) === 'door'); }
    else { await p.getByTestId('lw-ov-camera').click(); await p.waitForTimeout(200);
      ok(`LW-${tag}-${world}-04`, 'coverage switches draw on the furnished room', (await p.getByTestId('lw-ov-camera').getAttribute('aria-checked')) === 'true'); }
    const room = await at(p); await p.reload(); await p.getByTestId('lw-room').waitFor();
    ok(`LW-${tag}-${world}-05`, 'a room’s address survives a reload', (await at(p)) === room);
    await p.goBack(); await p.getByTestId('lw-level-3d').waitFor();
    ok(`LW-${tag}-${world}-06`, 'Back returns to the level', (await at(p)) === lv);
    await p.getByTestId('lw-up-world').click(); await p.getByTestId('lw-world-3d').waitFor();
    const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`LW-${tag}-${world}-07`, 'the page’s own link goes back up to the world; no sideways scroll; no console error; nothing off the page', (await at(p)) === `#/lite/w/${world}` && sw <= 0 && !t.errs.length && !t.off.length, `${sw} ${[...t.errs, ...t.off].slice(0, 3).join(' | ')}`);
    await t.close();
  }
}
{ const t = await open('#/lite/w/stadium/r/STA-FB-N', { role: 'architect', sw: false }); const p = t.page; await p.getByTestId('lw-room').waitFor();
  // 13 Nov 2026 (founder: "furnish every environment"): a kitchen, which V2.5.3 never drew, is furnished by Empathia's own rule, said so
  const fx = p.getByTestId('lw-fixture-3d'); const n = Number(await fx.getAttribute('data-objects'));
  ok('LW-empathia-furnished', 'a kitchen is furnished by Empathia’s own layout (counters, cooking line, refrigeration, serving counter), labelled as such and as illustrative', (await p.getByTestId('lw-room').getAttribute('data-furnished')) === 'empathia' && n >= 4 && (await fx.getAttribute('data-rule')) === 'kitchen' && /Empathia’s own layout/.test(await p.locator('main').innerText()) && /Illustrative/.test(await p.locator('main').innerText()) && (await p.locator('[data-testid=lite-room-3d]').count()) === 0, String(n));
  // 13 Nov 2026: the fixture room is drawn by Empathia's room renderer, whose line under the stage says what a tapped piece is (rm-says;
  // was lw-fixture-sel); the button is pressed as the keyboard would, so another target over it on the stage cannot take the tap
  await fx.locator('.l3-hitbtn').first().focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  ok('LW-empathia-inspect', 'tapping a fixture says what it is and its size', /m high · illustrative/.test(await p.getByTestId('rm-says').innerText()));
  await t.close(); }
{ const t = await open('#/lite', { role: 'architect', sw: false }); const p = t.page; await p.getByTestId('lite-worlds').waitFor(); const tiles = await p.locator('[data-testid=lite-worlds] a').count();
  await p.getByTestId('lite-worlds').getByRole('link', { name: /Harborlight Stadium/ }).click(); await p.getByTestId('lw-world-3d').waitFor();
  ok('LW-home', 'the Lite home leads to each of the other three worlds', (await at(p)) === '#/lite/w/stadium' && tiles === 3, String(tiles));
  await t.close(); }
{ const t = await open('#/lite/w/atlantis', { role: 'architect', sw: false }); const p = t.page; await p.waitForTimeout(800);
  ok('LW-unknown', 'an unknown world says so', /Not in Lite/.test(await p.locator('main').innerText()));
  await t.close(); }
await done();
