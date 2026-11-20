#!/usr/bin/env node
// Lifecycle refresh planning (#/pro/refresh; founder, 14 Nov 2026).
//   RF-01  the operations lead sees the units in service, the strategy chart and the first wave; the annual plan opens on it
//   RF-02  changing one class's service life is kept and changes the plan; reset restores the starting assumptions
//   RF-03  no planning figure is shown until one is declared for every class involved
//   RF-04  phone width for the systems engineer: nothing scrolls sideways; an employee is not admitted; no console error
//   node tests/browser/demo-refresh.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-refresh');
{ const t = await open('#/pro/refresh', { role: 'ops', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.evaluate(() => localStorage.removeItem('empathia.demo.refresh.v1')); await p.reload(); await p.getByTestId('refresh-plan').waitFor();
  const k = await p.getByTestId('rp-kpis').innerText(); const y0 = await p.getByTestId('refresh-plan').getAttribute('data-year');
  ok('RF-01', 'units in service, the first wave and the annual plan on it', /Units in service\s*\n?\s*[\d,]{3,}/.test(k) && /First wave\s*\n?\s*20\d\d/.test(k) && k.includes(y0) && (await p.locator('[data-testid=rp-annual] tr[data-room]').count()) > 0, `${y0} · ${k.replace(/\n/g, ' ').slice(0, 140)}`);
  await p.getByLabel('Service life of UC room compute').fill('6'); await p.waitForTimeout(300);
  const y1 = await p.getByTestId('refresh-plan').getAttribute('data-year'); const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('empathia.demo.refresh.v1') || '{}').life?.compute);
  await p.getByRole('button', { name: 'Reset to the starting assumptions' }).click(); await p.waitForTimeout(300); const y2 = await p.getByTestId('refresh-plan').getAttribute('data-year');
  ok('RF-02', 'a longer compute life moves the first wave and is kept; reset restores it', Number(y1) > Number(y0) && kept === 6 && y2 === y0, `${y0} → ${y1} → ${y2}`);
  const none = /no planning figure declared/.test(await p.getByTestId('rp-annual').innerText());
  const classes = await p.locator('[data-testid=rp-assumptions] tr[data-class]').evaluateAll((xs) => xs.map((x) => x.getAttribute('data-class')));
  for (const c of classes) await p.locator(`[data-testid=rp-assumptions] tr[data-class="${c}"] input[aria-label^="Planning figure"]`).fill('1000');
  await p.waitForTimeout(300); const money = await p.getByTestId('rp-kpis').innerText();
  ok('RF-03', 'no figure until declared for every class; then the total is shown', none && /\$[\d,]+/.test(money), money.replace(/\n/g, ' ').slice(-80));
  ok('RF-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await p.evaluate(() => localStorage.removeItem('empathia.demo.refresh.v1')); await t.close(); }
{ const t = await open('#/pro/refresh', { role: 'syseng', sw: false, w: 390, h: 844 }); const p = t.page; p.setDefaultTimeout(20000); await p.getByTestId('refresh-plan').waitFor();
  const sw = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); await t.close();
  const e = await open('#/pro/refresh', { role: 'employee', sw: false }); await e.page.waitForTimeout(1500); const denied = !(await e.page.getByTestId('refresh-plan').count()); await e.close();
  ok('RF-04', 'phone width: nothing scrolls sideways; an employee is not admitted', sw <= 1 && denied, `sw ${sw} denied ${denied}`); }
await done();
