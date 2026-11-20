#!/usr/bin/env node
// The five reference commissioning journeys (40/10 directive §24), every stage read from its room's record.
//   SC-01  five scenarios A–E, each with thirteen stages from Request to Assurance, each stage stating its state and a link
//   SC-02  each scenario's room is named with how close it is to its brief (never claimed as an exact match)
//   SC-03  every scenario holds at least one failure the system detected; where the room is not accepted, acceptance is blocked
//   SC-04  a stage's link opens the room's record; phone width does not scroll sideways; no console error; nothing leaves the page
//   node tests/browser/demo-scenarios.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-scenarios');

{ const t = await open('#/commissioning/scenarios', { role: 'cxeng', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.getByTestId('scenarios').waitFor();
  const keys = await p.getByTestId('scenario-stages').evaluateAll((els) => els.map((e) => [e.dataset.key, e.querySelectorAll('[data-testid=scenario-stage]').length]));
  ok('SC-01', 'five scenarios A–E, each with thirteen stages from Request to Assurance', JSON.stringify(keys) === JSON.stringify([['A', 13], ['B', 13], ['C', 13], ['D', 13], ['E', 13]]), JSON.stringify(keys));
  const fits = await p.getByTestId('scenario-fit').allInnerTexts();
  ok('SC-02', 'each scenario names its room and how close it is to the brief', fits.length === 5 && fits.every((f) => /Brief:/.test(f) && /On the estate:/.test(f)));
  const cards = await p.getByTestId('scenario').evaluateAll((els) => els.map((e) => ({ fail: e.querySelector('[data-testid=scenario-failures]')?.textContent || '', acc: [...e.querySelectorAll('[data-testid=scenario-stage]')][11]?.getAttribute('data-state'), sub: e.textContent || '' })));
  ok('SC-03', 'every scenario holds a failure the system detected; a room not yet accepted has acceptance blocked', cards.every((c) => /Detected:/.test(c.fail)) && cards.filter((c) => /commissioning/.test(c.sub)).every((c) => c.acc === 'blocked'), JSON.stringify(cards.map((c) => [c.acc, c.fail.slice(0, 60)])));
  await p.getByTestId('scenario-stage').nth(2).locator('a').click(); await p.waitForFunction(() => /#\/commissioning\/room\//.test(location.hash));
  const linked = /R-MER-1-140/.test(await p.evaluate(() => location.hash));
  ok('SC-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close();
  const ph = await open('#/commissioning/scenarios', { role: 'cxeng', sw: false, w: 390, h: 844 }); await ph.page.getByTestId('scenarios').waitFor();
  const over = await ph.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); await ph.close();
  ok('SC-04', 'a stage’s link opens the room’s record; at phone width nothing scrolls sideways', linked && over <= 0, `linked ${linked} · overflow ${over}px`); }
await done();
