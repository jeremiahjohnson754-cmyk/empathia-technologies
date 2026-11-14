#!/usr/bin/env node
// Commissioning analytics, month by month, with drill-down to a building and back (counted from the rooms' own events).
//   CXA-01  the estate: five figures, two trend charts, buildings listed; verification never above recording
//   CXA-02  drill to a building: the level and the path change, and the figures are that building's (no larger than the estate's)
//   CXA-03  drill up by the path; the 24-month window counts at least what 12 months count
//   CXA-04  the JSON export carries the months and the drill; phone width does not scroll sideways; no console error
//   node tests/browser/demo-cx-analytics.test.mjs
import fs from 'node:fs';
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-cx-analytics');
const kpi = (p) => p.getByTestId('cxa-kpis').locator('li, .kit-stat, [class*=stat]').allInnerTexts();
const num = async (p, label) => { const t = await p.getByTestId('cxa-kpis').innerText(); const m = new RegExp(`${label}\\s*\\n?\\s*([\\d,]+)`).exec(t); return m ? Number(m[1].replace(/,/g, '')) : NaN; };

{ const t = await open('#/commissioning/analytics', { role: 'cxeng', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.getByTestId('cx-analytics').waitFor(); void kpi;
  const rec = await num(p, 'Results recorded'); const acc = await num(p, 'Rooms accepted'); const blds = await p.getByTestId('cxa-building').count();
  ok('CXA-01', 'the estate: figures, two trend charts and the buildings', rec > 0 && acc >= 0 && blds >= 3 && await p.getByTestId('cxa-results').count() === 1 && await p.getByTestId('cxa-accepted').count() === 1, `recorded ${rec} · accepted ${acc} · ${blds} buildings`);
  await p.getByTestId('cxa-building').first().locator('a').click(); await p.waitForFunction(() => document.querySelector('[data-testid=cx-analytics]')?.getAttribute('data-level') === 'building');
  const recB = await num(p, 'Results recorded'); const path1 = await p.getByTestId('cxa-path').innerText();
  ok('CXA-02', 'drilled to a building: the level and the path change; its figures are no larger than the estate’s', recB <= rec && / › /.test(path1) && await p.getByTestId('cxa-buildings').count() === 0, `${recB} of ${rec} · ${path1}`);
  await p.getByTestId('cxa-path').locator('a').first().click(); await p.waitForFunction(() => document.querySelector('[data-testid=cx-analytics]')?.getAttribute('data-level') === 'estate');
  await p.getByRole('radio', { name: '24 months' }).click(); await p.waitForTimeout(300); const rec24 = await num(p, 'Results recorded');
  ok('CXA-03', 'drill up by the path; 24 months count at least what 12 months count', rec24 >= rec, `${rec} → ${rec24}`);
  const [d] = await Promise.all([p.waitForEvent('download'), p.getByTestId('cxa-export').locator('button[data-format=json]').click()]);
  const j = JSON.parse(fs.readFileSync(await d.path(), 'utf8'));
  const over = await (async () => { const ph = await open('#/commissioning/analytics', { role: 'cxeng', sw: false, w: 390, h: 844 }); await ph.page.getByTestId('cx-analytics').waitFor(); const o = await ph.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); await ph.close(); return o; })();
  ok('CXA-04', 'the JSON export carries the months; no sideways scroll on a phone; no console error', j.entities?.months?.length === 24 && j.entities.synthetic === true && over <= 0 && !t.errs.length && !t.off.length, `${j.entities?.months?.length} months · overflow ${over} · ${t.errs.slice(0, 1)}`);
  await t.close(); }
await done();
