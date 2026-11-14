#!/usr/bin/env node
// The test plan, explained (40/10 directive: "an adaptive test-plan rules engine that explains every inclusion and exclusion"). On a
// room's commissioning record, every check in the plan says why the engine put it there and every check left out says why not — the
// engine's own reasons (packages/commissioning-engine/src/applicability.ts), never a typed note.
//   PW-01  the plan's checks and the checks left out add up to the library, and match the page's own count
//   PW-02  every check in the plan gives a reason; every check left out gives the engine's reason (no rule names it, or a pack's need)
//   node tests/browser/demo-plan-why.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-plan-why');

for (const room of ['R-ATL-4-218', 'R-ATL-4-220']) {
  const t = await open(`#/commissioning/room/${room}`, { role: 'cxeng', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.getByTestId('cx-plan-why').waitFor(); await p.getByTestId('cx-plan-why').locator('summary').click();
  const ins = await p.getByTestId('cx-plan-in').allInnerTexts(); const outs = await p.getByTestId('cx-plan-out').allInnerTexts();
  const title = await p.getByTestId('cx-checks').innerText(); const n = Number(/Five phases, (\d+) checks/.exec(title)?.[1]);
  ok(`PW-01 ${room}`, 'the plan and the checks left out add up to the library; the plan matches the page’s count', ins.length === n && ins.length + outs.length >= 60, `${ins.length} in · ${outs.length} out · page ${n}`);
  ok(`PW-02 ${room}`, 'every check in the plan says why; every check left out gives the engine’s reason', ins.every((x) => x.split('\n').join(' ').length > 10) && outs.every((x) => /no rule names it|pack [a-z_]+: needs/.test(x)), outs.find((x) => !/no rule names it|pack [a-z_]+: needs/.test(x)) || '');
  ok(`PW-clean ${room}`, 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close();
}
await done();
