#!/usr/bin/env node
// Rooms: every one of the 45 rooms (the thirty, then rooms 31–45 of the plan; changed 2026-11-04: every screen shows all 45) opens in the same room view at 1440 (no error, no overflow), a sample at 390 and 768, in light and
// dark. The view: 3D and plan on a dark stage, layers, a device panel with position · asset · identity, tabs (arrow keys), tests from the
// engine, history (baselines, the pending exception), coverage; deep links (?tab=, ?device=) and reload keep the state.
//   node tests/browser/demo-rooms.test.mjs
import path from 'node:path'; import fs from 'node:fs';
import { harness, VIEWPORTS, SCHEMES, repo } from './demo-spaces-lib.mjs';
const { ok, open, done, out } = await harness('demo-rooms');
// 10 Nov 2026: the estate is the founder's 90 rooms (docs/surpass/ENTERPRISE_90_ROOMS.md); rows 46–90 are the X(...) rows of canon.ts
const ids = [...fs.readFileSync(path.join(repo, 'apps/demo/src/campus/canon.ts'), 'utf8').matchAll(/^ {2}[RPX]\((?:\d+, )?'(R-[A-Z]+-\d+-\d+)'/gm)].map((m) => m[1]);
if (ids.length !== 140) { console.error(`expected 140 room ids in canon.ts, read ${ids.length}`); process.exit(1); }   // 13 Nov 2026: + V2.5.3's 50 rooms (founder): 90 → 140
const href = (id) => { const [, b, f] = /^R-([A-Z]+)-(\d+)-/.exec(id); return `#/campus/${b}/${Number(f)}/${id}`; };
const SAMPLE = ['R-ATL-4-218', 'R-NST-2-101', 'R-HZN-1-400', 'R-BCN-3-225', 'R-MER-1-130'];

for (const scheme of SCHEMES) for (const vp of VIEWPORTS) {
  const tag = `${scheme}-${vp[2]}`; const t = await open(vp, scheme, { hash: '#/campus' });
  const list = vp[2] === 'desktop' ? ids : SAMPLE; const bad = [];
  for (const id of list) {
    await t.go(href(id), 220);
    const v = await t.page.evaluate(() => ({ room: document.querySelector('[data-testid="room-view"]')?.getAttribute('data-room'), stage: !!document.querySelector('[data-testid="room-3d"]'), over: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
    if (v.room !== id || !v.stage || v.over > 0) bad.push(`${id} ${JSON.stringify(v)}`);
  }
  ok(`RM-${tag}-01`, `${list.length === ids.length ? `all ${ids.length} rooms open` : `a sample of ${list.length} rooms opens`} in the room view with a 3D stage and no overflow`, list.length >= 5 && !bad.length && (vp[2] !== 'desktop' || (list.length === ids.length && ids.length === 140)), bad.slice(0, 3).join(' | '));   // 13 Nov 2026: 90 → 140 (V2.5.3's 50 rooms)
  await t.go(href('R-ATL-4-218'), 300);
  const lum = await t.page.evaluate(() => { const m = getComputedStyle(document.querySelector('[data-testid="room-stage"]')).backgroundColor.match(/\d+/g).map(Number); return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; });
  ok(`RM-${tag}-02`, 'the room stage stays dark in either theme (D36)', lum < 0.25, lum);
  ok(`RM-${tag}-03`, 'the reference room says acceptance is held by the engine and why', /COMMISSIONING → ACCEPTED: held by the engine/.test(await t.text()) && /open issue/.test(await t.text()));
  // a device on the 3D stage, by keyboard
  const dev = t.page.locator('[data-testid="room-3d"] [role="button"]').first(); await dev.focus(); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(150);
  const panel = await t.page.locator('[data-testid="identity"]').innerText().catch(() => '');
  ok(`RM-${tag}-04`, 'a device opens with the keyboard and shows position, asset and identity together', /position\s+A-0\d+/.test(panel) && /asset\s+AS-\d+/.test(panel) && /identity\s+UNKNOWN/.test(panel), panel);
  await t.page.click('.seg button:has-text("Plan")'); await t.page.waitForTimeout(120);
  ok(`RM-${tag}-05`, 'the plan view replaces the 3D view', (await t.page.locator('[data-testid="room-plan"]').count()) === 1 && (await t.page.locator('[data-testid="room-3d"]').count()) === 0);
  const before = await t.page.locator('[data-testid="room-plan"] [role="button"]').count();
  await t.page.click('.layers label:has-text("Audio") input'); await t.page.waitForTimeout(100);
  const after = await t.page.locator('[data-testid="room-plan"] [role="button"]').count();
  ok(`RM-${tag}-06`, 'turning a layer off removes its devices from the stage', after < before && after > 0, `${before} → ${after}`);
  // the camera: same position, two installations
  await t.go(`${href('R-ATL-4-218')}?device=A-0106`, 300);
  const cam = await t.page.locator('[data-testid="device-detail"]').innerText().catch(() => '');
  ok(`RM-${tag}-07`, 'a deep link opens the camera: the position kept its code, the unit changed (AS-0112 current, the earlier unit removed)', /AS-0112/.test(cam) && /removed/.test(cam) && /current/.test(cam), cam.slice(0, 300));
  // tabs: arrow keys, deep link, reload
  await t.page.focus('#room-tab-overview'); await t.page.keyboard.press('ArrowRight'); await t.page.waitForTimeout(150);
  ok(`RM-${tag}-08`, 'the tabs move with the arrow keys and update the address', /tab=devices/.test(await t.page.evaluate(() => location.hash)) && (await t.page.locator('[data-testid="device-table"]').count()) === 1);
  await t.go(`${href('R-ATL-4-218')}?tab=tests`, 250); await t.page.reload(); await t.page.waitForTimeout(500);
  const tests = await t.page.locator('[data-testid="test-table"] tbody tr').count();
  ok(`RM-${tag}-09`, 'the tests tab survives a reload and lists the engine-judged tests', tests > 20 && /reopened by the camera replacement/.test(await t.text()), tests);
  await t.go(`${href('R-ATL-4-218')}?tab=history`, 250);
  const hist = await t.text();
  ok(`RM-${tag}-10`, 'history: v1 CURRENT, v2 PENDING_ACCEPTANCE and EXC-4218-01 pending approval with no reviewer', /v1 CURRENT/.test(hist) && /v2 PENDING_ACCEPTANCE/.test(hist) && /EXC-4218-01/.test(hist) && /PENDING APPROVAL/.test(hist), hist.slice(0, 200));
  await t.go(`${href('R-NST-2-101')}?tab=devices`, 250);
  ok(`RM-${tag}-11`, 'a room whose earlier record holds no devices says so instead of inventing them', /No devices recorded/.test(await t.text()));
  await t.go(`${href('R-HZN-1-400')}?tab=coverage`, 250);
  const cov = await t.text();
  ok(`RM-${tag}-12`, 'coverage states complete / modelled / gaps (no invented identity, no live monitoring)', /modeled/i.test(cov) && /gap/.test(cov) && /UNKNOWN/.test(cov) && /OPERATIONAL is never claimed/.test(cov));
  await t.go(`${href('R-ATL-4-218')}?tab=nonsense&device=NOPE`, 250);
  ok(`RM-${tag}-13`, 'an unknown tab or device in the address falls back to the room view', (await t.page.locator('[data-testid="room-stage"]').count()) === 1);
  ok(`RM-${tag}-14`, 'no horizontal overflow, no page error, no request leaves the page', (await t.overflow()) <= 0 && !t.errs.length && !t.ext.length, [await t.overflow(), ...t.errs, ...t.ext].join(' | '));
  if (vp[2] !== 'tablet') { await t.go(href('R-ATL-4-218'), 300); await t.page.screenshot({ path: path.join(out, `${tag}-reference-room.png`), fullPage: true }); }
  await t.close();
}
// a 320 px phone: the reference room still fits; every interactive element on the stage has an accessible name
{ const t = await open([320, 640], SCHEMES[0], { hash: href('R-ATL-4-218') }); await t.page.waitForTimeout(400);
  const names = await t.page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="room-stage"] [role="button"], [data-testid="room-stage"] button')).filter((e) => !(e.getAttribute('aria-label') || e.textContent.trim())).length);
  ok('RM-320', 'at 320 px the room view has no horizontal overflow and every stage control is named', (await t.overflow()) <= 0 && names === 0 && !t.errs.length, `${await t.overflow()} / unnamed ${names}`);
  await t.close(); }
// reduced motion: the stage renders without animation and the view still works
{ const t = await open([1440, 900], SCHEMES[0], { hash: href('R-ATL-7-112'), reducedMotion: 'reduce' }); await t.page.waitForTimeout(300);
  ok('RM-reduced-motion', 'under reduced motion the room view renders and rotates', (await t.page.locator('[data-testid="room-3d"]').count()) === 1 && (await t.page.click('button:has-text("Rotate")').then(() => true, () => false)) && !t.errs.length);
  await t.close(); }
await done();
