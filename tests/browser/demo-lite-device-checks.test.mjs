#!/usr/bin/env node
// Lite device → its commissioning checks (40/10 directive: "Lite device → tests"). Tapping a device in the furnished room shows the checks
// the engine names that device on, each with its result label, and links the unit to its whole life by its asset ID.
//   LD-01  a camera in 4.218: at least one commissioning check for it, each with a result label (never a bare PASS)
//   LD-02  its asset link opens the unit's life page on the same asset ID
//   node tests/browser/demo-lite-device-checks.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-lite-device-checks');

{ const t = await open('#/lite/room/R-ATL-4-218?mode=engineer', { role: 'cxeng', sw: false }); const p = t.page; p.setDefaultTimeout(15000);
  const st = p.locator('[data-testid=lite-room-3d]'); await st.waitFor();
  await st.locator('.l3-hitbtn[aria-label^="Cam"], .l3-hitbtn[aria-label*="camera" i]').first().click(); await p.getByTestId('lite-dev-checks').waitFor();
  const checks = await p.getByTestId('lite-dev-check').allInnerTexts();
  ok('LD-01', 'a camera: the commissioning checks the engine names it on, each with its result label', checks.length >= 1 && checks.every((c) => !/^\s*PASS\b/.test(c)), checks.slice(0, 3).join(' | '));
  const asset = (await p.getByTestId('lite-dev-asset').innerText()).match(/AS-\d{4}/)?.[0];
  await p.getByTestId('lite-dev-asset').click(); await p.getByTestId('asset-life').waitFor().catch(() => {});
  const h1 = await p.locator('h1').first().innerText().catch(() => '');
  ok('LD-02', 'the unit’s asset link opens its whole life on the same asset ID', !!asset && h1.includes(asset), `${asset} · ${h1}`);
  ok('LD-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close(); }
await done();
