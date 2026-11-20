#!/usr/bin/env node
// Phase 1 field record and redlines (#/install/redline; founder, 14 Nov 2026: "have the lite design become like a bluebeam redlining
// document … where are things mounted, hooked up to, did we change the position of a device … because of a sprinkler").
//   FL-01  the installer opens the room's field record from Lite: the plan shows every device; choosing one opens its panel
//   FL-02  the installer records a mounting and a hookup; the plan marks the device mounted; the hookup is compared with the design
//   FL-03  the installer records a field move by clicking the plan (reason: sprinkler head); it waits for a decision, drawn dashed
//   FL-04  the systems engineer approves it; the plan draws the as-built position with a red arrow; the installer cannot decide
//   FL-05  a note is pinned on the plan and resolved
//   FL-06  phone width: nothing scrolls sideways; an employee is not admitted; no console error; nothing requested off the page
//   node tests/browser/demo-field-redline.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-field-redline');
const ROOM = 'R-ATL-4-218';
const clickPlan = async (p, fx, fy) => { const room = p.locator('[data-testid=fr-svg] .fr__room'); await room.scrollIntoViewIfNeeded(); const b = await room.boundingBox(); await room.click({ position: { x: b.width * fx, y: b.height * fy }, force: true }); await p.waitForTimeout(200); };

{ const t = await open(`#/lite/room/${ROOM}?mode=engineer`, { role: 'installer', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.evaluate((k) => localStorage.removeItem(k), `empathia.demo.field.v1.${ROOM}`);
  const st = p.locator('[data-testid=lite-room-3d]'); await st.waitFor();
  await st.locator('.l3-hitbtn[aria-label^="Cam"], .l3-hitbtn[aria-label*="camera" i]').first().click(); await p.getByTestId('lite-dev-field').click();
  await p.getByTestId('field-redline').waitFor(); await p.getByTestId('fr-device').waitFor();
  const n = await p.locator('[data-testid=fr-svg] [data-device]').count(); const head = await p.getByTestId('fr-device').locator('h2, h3').first().innerText();
  ok('FL-01', 'from Lite the installer opens the field record on the chosen device; the plan shows every device', n >= 5 && /A-\d+/.test(head) && (await p.getByTestId('field-redline').getAttribute('data-room')) === ROOM, `${n} devices · ${head}`);
  const dev = (await p.getByTestId('fr-device').locator('.fr__panel').getAttribute('data-device'));
  await p.getByLabel(`Mounting method of ${dev}`).selectOption('wall-bracket'); await p.getByLabel(`Mounting height of ${dev}`).fill('1.9'); await p.getByLabel(`Fixing of ${dev}`).fill('camera shelf, 2 × toggle bolts');
  await p.getByRole('button', { name: 'Record the mounting' }).click(); await p.getByTestId('fr-mount-current').waitFor();
  const opts = await p.getByLabel(`Other end of the hookup from ${dev}`).locator('option').allInnerTexts();
  await p.getByLabel(`Port on ${dev}`).fill('LAN'); await p.getByLabel(`Other end of the hookup from ${dev}`).selectOption({ index: 1 }); await p.getByLabel('Cable label').fill('C-4218-01');
  await p.getByRole('button', { name: 'Record the hookup' }).click(); await p.getByTestId('fr-hookups').waitFor();
  const hk = await p.getByTestId('fr-hookups').innerText(); const mounted = await p.locator(`[data-testid=fr-svg] [data-device="${dev}"].is-mounted`).count();
  ok('FL-02', 'a mounting and a hookup are recorded; the plan marks the device mounted; the hookup says how it compares with the design', mounted === 1 && /as designed|not in the design/.test(hk) && opts.length > 2, hk.slice(0, 120));
  await p.getByRole('button', { name: /record a move/ }).click(); await clickPlan(p, 0.3, 0.3); await p.getByTestId('fr-move-form').waitFor();
  await p.getByLabel('Reason for the move').selectOption('sprinkler head'); await p.getByLabel('Move note').fill('sprinkler head at the designed position');
  await p.getByRole('button', { name: 'Record the move' }).click(); await p.locator('[data-move][data-state=PROPOSED]').waitFor();
  ok('FL-03', 'a field move is recorded from the plan with its reason; it waits for a decision and is drawn dashed', (await p.locator('.fr__move--proposed').count()) === 1 && /sprinkler head/.test(await p.getByTestId('fr-moves').innerText()));
  const noDecide = await p.getByRole('button', { name: /^Approve FM-/ }).count();
  await p.evaluate(() => localStorage.setItem('empathia.demo.perspective', 'syseng')); await p.reload(); await p.getByTestId('fr-moves').waitFor();
  await p.getByRole('button', { name: /^Approve FM-/ }).click(); await p.locator('[data-move][data-state=APPROVED]').waitFor();
  ok('FL-04', 'the systems engineer approves the move: the plan draws the as-built position with the arrow; the installer had no decision to take', noDecide === 0 && (await p.locator('.fr__move--approved').count()) === 1 && (await p.locator('[data-testid=fr-svg] .is-moved').count()) === 1);
  await p.getByRole('radio', { name: 'Add a note' }).or(p.getByRole('button', { name: 'Add a note' })).first().click(); await p.waitForTimeout(200); await clickPlan(p, 0.15, 0.85); await p.getByTestId('fr-note-form').waitFor();
  await p.getByLabel('Note text').fill('access panel above the credenza'); await p.getByRole('button', { name: 'Pin the note' }).click(); await p.locator('[data-testid=fr-notes] [data-state=OPEN]').waitFor();
  const nid = await p.locator('[data-testid=fr-notes] [data-state=OPEN]').first().getAttribute('data-note');
  await p.getByLabel(`Resolution of ${nid}`).fill('credenza shifted 300 mm; panel clear'); await p.getByRole('button', { name: `Resolve ${nid}` }).click(); await p.locator(`[data-testid=fr-notes] [data-note="${nid}"][data-state=RESOLVED]`).waitFor();
  ok('FL-05', 'a note is pinned on the plan and resolved with its resolution', (await p.locator('[data-testid=fr-svg] .fr__note--resolved').count()) === 1);
  ok('FL-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close(); }

{ const t = await open(`#/install/redline?room=${ROOM}`, { role: 'installer', sw: false, w: 390, h: 844 }); const p = t.page; p.setDefaultTimeout(20000);
  await p.getByTestId('field-redline').waitFor(); const sw = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); await t.close();
  const e = await open(`#/install/redline?room=${ROOM}`, { role: 'employee', sw: false }); await e.page.waitForTimeout(1500); const denied = !(await e.page.getByTestId('field-redline').count()); await e.close();
  ok('FL-06', 'phone width: nothing scrolls sideways; an employee is not admitted', sw <= 1 && denied, `sw ${sw} denied ${denied}`); }
await done();
