#!/usr/bin/env node
// ServiceHands analytics in a browser (founder, 14 Nov 2026: "ServiceHands analytics that can be measured by project per quarter per
// monthly trend analysis … specific vendor analytics so individual vendor(s) are always kept accountable"; 21:37: "advanced drill-down and
// drill-up in all analytics"). The measures themselves are unit-tested (tests/unit/service-analytics.test.mjs); here the page is walked:
// the scorecard puts the vendor needing attention first, a vendor and a month drill in, the path drills back up, quarters group the same
// jobs, the export carries exactly the view on screen, the gate holds, and the page fits a phone.
//   node tests/browser/demo-service-analytics.test.mjs
import fs from 'node:fs';
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-service-analytics');
const level = (p) => p.getByTestId('service-analytics').getAttribute('data-level');
const tableRows = (p, id) => p.getByTestId(id).locator('details table tbody tr').count();

{ const t = await open('#/v25/service/analytics', { role: 'svcmgr', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.getByTestId('service-analytics').waitFor();
  const kpis = await p.getByTestId('san-kpis').innerText(); const opened = Number((/Jobs opened\s+(\d+)/.exec(kpis) || [])[1]);
  const vendors = await p.getByTestId('san-vendor').evaluateAll((els) => els.map((e) => ({ v: e.dataset.vendor, f: Number(e.dataset.flags) })));
  const months = await tableRows(p, 'san-volume');
  ok('SAB-01', 'the page opens on fifteen months: the KPIs, three trend charts with their numbers, and a scorecard that puts the vendors needing attention first', opened > 200 && months === 15 && vendors.length >= 4 && vendors[0].f > 0 && vendors.some((x) => x.v === 'VN-COBALT' && x.f > 0) && vendors.some((x) => x.f === 0) && /synthetic/i.test(await p.locator('main').innerText()), `${opened} jobs, ${months} months, ${JSON.stringify(vendors.slice(0, 3))}`);

  // drill into a vendor: everything narrows to it, the notice says what needs attention, the path shows the level
  await p.locator('[data-testid=san-vendor][data-vendor="VN-COBALT"] th a').click(); await p.waitForFunction(() => document.querySelector('[data-testid=service-analytics]')?.getAttribute('data-level') === 'vendor');
  const path = await p.getByTestId('san-path').innerText(); const vendorsOfJobs = await p.getByTestId('san-job').evaluateAll((els) => [...new Set(els.map((e) => e.children[6].textContent))]);
  ok('SAB-02', 'a vendor drills in: the path, the notice and every job listed are that vendor’s', /Cobalt Ridge Systems/.test(path) && vendorsOfJobs.length === 1 && vendorsOfJobs[0] === 'Cobalt Ridge Systems' && /^Cobalt Ridge Systems: .*(response|restore|time to restore)/.test(await p.getByTestId('san-vendor-note').innerText()), `${path} · ${vendorsOfJobs.join(',')}`);

  // drill into a month from the chart (the hash carries it), then back up to the estate through the path
  await p.evaluate(() => { location.hash = location.hash.replace(/$/, location.hash.includes('?') ? '&at=2026-09' : '?at=2026-09'); });
  await p.waitForFunction(() => document.querySelector('[data-testid=service-analytics]')?.getAttribute('data-level') === 'period');
  const sept = await p.getByTestId('san-job').evaluateAll((els) => els.map((e) => e.children[1].textContent));
  await p.getByTestId('san-path').getByRole('link', { name: 'The estate' }).click(); await p.waitForFunction(() => document.querySelector('[data-testid=service-analytics]')?.getAttribute('data-level') === 'estate');
  ok('SAB-03', 'a month drills in (only that month’s jobs, of that vendor) and the path drills back up to the estate', sept.length > 0 && sept.every((d) => d.startsWith('2026-09')) && await level(p) === 'estate', `${sept.length} jobs in Sep 26`);

  // quarters: the same jobs grouped by calendar quarter, partial quarters marked
  await p.getByRole('radio', { name: 'Quarter' }).or(p.getByRole('button', { name: 'Quarter' })).first().click(); await p.waitForTimeout(300);
  const qLabels = await p.getByTestId('san-volume').locator('details table tbody th').allTextContents();
  ok('SAB-04', 'grouped by quarter: six calendar quarters, the partial ones at either end marked', qLabels.length === 6 && /2025 Q3 \(2 mo\)/.test(qLabels[0]) && /2026 Q4 \(1 mo\)/.test(qLabels[5]), qLabels.join(' | '));

  // the export is the view on screen
  await p.evaluate(() => { location.hash = '#/v25/service/analytics?v=VN-COBALT'; }); await p.waitForFunction(() => document.querySelector('[data-testid=service-analytics]')?.getAttribute('data-level') === 'vendor');
  const kv = await p.getByTestId('san-kpis').innerText(); const openedV = Number((/Jobs opened\s+(\d+)/.exec(kv) || [])[1]);
  const [dj] = await Promise.all([p.waitForEvent('download'), p.getByTestId('san-export').locator('button[data-format=json]').click()]); const j = JSON.parse(fs.readFileSync(await dj.path(), 'utf8'));
  const [dx] = await Promise.all([p.waitForEvent('download'), p.getByTestId('san-export').locator('button[data-format=xlsx]').click()]);
  const jobs = j.tables.Jobs.rows;
  ok('SAB-05', 'the export carries exactly the drilled view: the same count of jobs, all the vendor’s, with the scorecard and the definitions', j.kind === 'service-analytics' && jobs.length === openedV && jobs.every((r) => r.v === 'Cobalt Ridge Systems') && j.tables['Vendor scorecard'].rows.length >= 4 && !!j.tables['Trend'] && dx.suggestedFilename().endsWith('.xlsx') && /synthetic/i.test(j.provenance.join(' ')), `${jobs.length} / ${openedV}`);
  ok('SAB-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close(); }

{ // the gate: a technician and an employee are not shown vendor performance; the ServiceHands page links it only for those who may open it
  const out = [];
  for (const role of ['service', 'employee']) { const t = await open('#/v25/service/analytics', { role, sw: false }); const p = t.page; await p.waitForTimeout(1200); out.push([role, await p.getByTestId('service-analytics').count()]); await t.close(); }
  const t = await open('#/v25/service', { role: 'svcmgr', sw: false }); const link = await t.page.getByTestId('svc-analytics-link').count(); await t.close();
  const t2 = await open('#/v25/service', { role: 'service', sw: false }); await t2.page.waitForTimeout(800); const link2 = await t2.page.getByTestId('svc-analytics-link').count(); await t2.close();
  ok('SAB-06', 'the gate: a service technician and an employee cannot open it, and ServiceHands links it only for a role that may', out.every(([, n]) => n === 0) && link === 1 && link2 === 0, JSON.stringify(out) + ` links ${link}/${link2}`); }

{ const t = await open('#/v25/service/analytics', { role: 'exec', sw: false, w: 390, h: 844 }); const p = t.page; await p.getByTestId('service-analytics').waitFor(); await p.waitForTimeout(300);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('SAB-phone', 'the executive opens it on a phone: it fits (tables scroll in their own frames)', sw <= 0, `${sw}px`); await t.close(); }
await done();
