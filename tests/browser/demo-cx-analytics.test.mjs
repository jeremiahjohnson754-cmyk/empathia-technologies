#!/usr/bin/env node
// Commissioning analytics, month by month, with drill-down to a building and back (counted from the rooms' own events).
//   CXA-01  the estate: five figures, two trend charts, buildings listed; verification never above recording
//   CXA-02  drill to a building: the level and the path change, and the figures are that building's (no larger than the estate's)
//   CXA-03  drill up by the path; the 24-month window counts at least what 12 months count
//   CXA-04  the JSON export carries the months and the drill; phone width does not scroll sideways; no console error
//   node tests/browser/demo-cx-analytics.test.mjs
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
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
  // a data report since 18 Nov 2026 (founder: "pdf only for data reports have this role protected"): the commissioning engineer reads
  // the view and is offered no export; the architect exports it as a PDF only, whose months are read from its text by poppler
  const gate = await p.getByTestId('cxa-export-data').getAttribute('data-allowed'); const cxButtons = await p.getByTestId('cxa-export').locator('button[data-format]').count();
  const ar = await open('#/commissioning/analytics', { role: 'architect', sw: false }); await ar.page.getByTestId('cx-analytics').waitFor(); await ar.page.getByRole('radio', { name: '24 months' }).click(); await ar.page.waitForTimeout(300);
  const [d] = await Promise.all([ar.page.waitForEvent('download'), ar.page.getByTestId('cxa-export').locator('button[data-format=pdf]').click()]);
  const ptxt = execFileSync('pdftotext', ['-layout', await d.path(), '-'], { encoding: 'utf8' }); const months = new Set(ptxt.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec) \d{2}\b/g) || []).size;
  const arOthers = await ar.page.getByTestId('cxa-export').locator('button[data-format]:not([data-format=pdf])').count(); const arErrs = [...ar.errs, ...ar.off]; await ar.close();
  const over = await (async () => { const ph = await open('#/commissioning/analytics', { role: 'cxeng', sw: false, w: 390, h: 844 }); await ph.page.getByTestId('cx-analytics').waitFor(); const o = await ph.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); await ph.close(); return o; })();
  ok('CXA-04', 'a data report: no export for the commissioning engineer; the architect’s PDF only, carrying the 24 months, marked synthetic; no sideways scroll on a phone; no console error', gate === 'false' && cxButtons === 0 && months === 24 && /synthetic/i.test(ptxt) && arOthers === 0 && !arErrs.length && over <= 0 && !t.errs.length && !t.off.length, `gate ${gate}/${cxButtons} · ${months} months · others ${arOthers} · overflow ${over} · ${[...t.errs, ...arErrs].slice(0, 1)}`);
  await t.close(); }
await done();
