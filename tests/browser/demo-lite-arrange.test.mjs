#!/usr/bin/env node
// Arranging the room in 3D Lite (13 Nov 2026, founder: "let authorized users select, place, rotate, inspect, and reposition objects in the
// 3D environment with synchronized changes and undo/redo … Keep 2D as a precision design tool"). Walked as a person would: an object is
// tapped in the 3D room and moved and turned by the toolbar and the keyboard; one is added from the palette; the 2D precision plan follows,
// and a typed position moves it in 3D too; undo, redo and reset; the arrangement survives a reload; a role without the Optimize lens
// gets no toolbar.
//   node tests/browser/demo-lite-arrange.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-lite-arrange');

for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
  const t = await open('#/lite/room/R-ATL-4-218?mode=optimize', { role: 'architect', w, h, sw: false }); const p = t.page; p.setDefaultTimeout(10000);
  await p.evaluate(() => { try { for (const k of Object.keys(localStorage)) if (k.startsWith('empathia.lite.arrange')) localStorage.removeItem(k); } catch { /* none */ } }); await p.reload();
  const stage = p.getByTestId('lite-room-3d'); await stage.waitFor(); await p.getByTestId('lite-arrange').waitFor();
  ok(`LA-${tag}-01`, 'the Optimize lens opens in the furnished room, with the arrange toolbar and the precision plan', (await p.getByTestId('lite-arr-plan').count()) === 1 && (await p.getByTestId('lite-arr-right').isDisabled()) && /No change yet/.test(await p.getByTestId('lite-arr-count').innerText()));
  // select the table by tapping it in 3D
  const hit = p.locator('[data-testid=lite-room-3d] .l3-hitbtn[aria-label^="Table"], [data-testid=lite-room-3d] .l3-hitbtn[aria-label*="table"]').first();
  await hit.click({ force: true }); await p.waitForTimeout(200);
  const selId = await stage.getAttribute('data-sel'); const lab = await p.locator('.lt-arr__row').nth(1).innerText();
  ok(`LA-${tag}-02`, 'tapping the table in the 3D room selects it for arranging, in 3D and in the plan', !!selId && /table/i.test(lab) && (await p.locator(`[data-testid=lite-arr-plan] [data-obj="${selId}"][aria-pressed=true]`).count()) === 1, `${selId} ${lab.slice(0, 60)}`);
  const x0 = Number(await p.getByTestId('lite-arr-x').inputValue());
  await p.getByTestId('lite-arr-right').click(); await p.getByTestId('lite-arr-right').click(); await p.waitForTimeout(200);
  const x1 = Number(await p.getByTestId('lite-arr-x').inputValue());
  ok(`LA-${tag}-03`, 'moving it in 3D moves it in the plan: two steps right is 50 cm', Math.abs(x1 - x0 - 0.5) < 0.011 && (await stage.getAttribute('data-edits')) === 'yes', `${x0} → ${x1}`);
  await p.getByTestId('lite-arr-turnr').click(); await p.waitForTimeout(150); const r1 = Number(await p.getByTestId('lite-arr-rot').inputValue());
  await p.getByTestId('lite-arr-y').fill('3.5'); await p.getByTestId('lite-arr-y').press('Tab'); await p.waitForTimeout(200);
  ok(`LA-${tag}-04`, 'turning shows in the plan; a position typed in the plan places it, to the centimetre', r1 === 15 && Math.abs(Number(await p.getByTestId('lite-arr-y').inputValue()) - 3.5) < 0.011, `${r1}`);
  // keyboard on the toolbar
  await p.getByTestId('lite-arr-left').focus(); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(150); const x2 = Number(await p.getByTestId('lite-arr-x').inputValue());
  ok(`LA-${tag}-05`, 'with the toolbar focused, an arrow key moves it 25 cm', Math.abs(x1 - 0.25 - x2) < 0.011, `${x1} → ${x2}`);
  // add from the palette
  const n0 = Number(await stage.getAttribute('data-objects'));
  await p.getByTestId('lite-arr-add-camera').click(); await p.waitForTimeout(300);
  const n1 = Number(await stage.getAttribute('data-objects')); const sel2 = await stage.getAttribute('data-sel');
  ok(`LA-${tag}-06`, 'a camera added from the palette appears in the 3D room and in the plan, selected', n1 === n0 + 1 && sel2 === 'addcam1' && (await p.locator('[data-testid=lite-arr-plan] [data-obj="addcam1"]').count()) === 1, `${n0} → ${n1} ${sel2}`);
  await p.getByTestId('lite-arr-turnl').click(); await p.waitForTimeout(150); const aim = Number(await p.getByTestId('lite-arr-rot').inputValue());
  ok(`LA-${tag}-07`, 'the added camera turns by its aim', aim === 255, String(aim));
  // undo, redo, reset
  const c1 = await p.getByTestId('lite-arr-count').innerText();
  await p.getByTestId('lite-arr-undo').click(); await p.getByTestId('lite-arr-undo').click(); await p.waitForTimeout(200); const n2 = Number(await stage.getAttribute('data-objects'));
  await p.getByTestId('lite-arr-redo').click(); await p.waitForTimeout(200); const n3 = Number(await stage.getAttribute('data-objects'));
  ok(`LA-${tag}-08`, 'undo takes the turn and the added camera back; redo brings the camera again', n2 === n0 && n3 === n0 + 1 && /change/.test(c1), `${n2} ${n3}`);
  await p.reload(); await stage.waitFor(); await p.waitForTimeout(300);
  ok(`LA-${tag}-09`, 'the arrangement is kept in this browser across a reload', Number(await stage.getAttribute('data-objects')) === n0 + 1 && /change/.test(await p.getByTestId('lite-arr-count').innerText()));
  await p.getByTestId('lite-arr-reset').click(); await p.waitForTimeout(200);
  ok(`LA-${tag}-10`, '“Back to the room as recorded” clears every change, and can itself be undone', Number(await stage.getAttribute('data-objects')) === n0 && /No change yet/.test(await p.getByTestId('lite-arr-count').innerText()) && !(await p.getByTestId('lite-arr-undo').isDisabled()));
  const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`LA-${tag}-11`, 'no sideways scroll; no console error; nothing requested off the page', sw <= 0 && !t.errs.length && !t.off.length, `${sw} ${[...t.errs, ...t.off].slice(0, 3).join(' | ')}`);
  await t.close();
}
{ const t = await open('#/lite/room/R-ATL-4-218?mode=engineer', { role: 'architect', sw: false }); const p = t.page; await p.getByTestId('lite-room-3d').waitFor(); await p.waitForTimeout(300);
  ok('LA-engineer', 'outside the Optimize lens the room is looked at, not arranged: no toolbar, no plan', (await p.getByTestId('lite-arrange').count()) === 0 && (await p.getByTestId('lite-arr-plan').count()) === 0);
  await t.close(); }
{ const t = await open('#/lite/room/R-ATL-4-218?mode=optimize', { role: 'visitor', sw: false }); const p = t.page; await p.locator('main h1').first().waitFor(); await p.waitForTimeout(600);
  // the Optimize lens is not the visitor's: Lite says so instead of opening the room in it (demo-lite D44)
  ok('LA-visitor', 'a visitor asking for the Optimize lens is not given the arrange toolbar or the plan', (await p.getByTestId('lite-arrange').count()) === 0 && (await p.getByTestId('lite-arr-plan').count()) === 0);
  await t.close(); }
await done();
