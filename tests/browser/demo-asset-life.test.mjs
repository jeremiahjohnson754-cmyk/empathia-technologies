#!/usr/bin/env node
// One asset's life by its asset ID (founder, 14 Nov 2026: "asset ID is one of the most crucial pieces to how you connect everything end
// to end"; a replaced asset ID leaves the inventory but is never reused and is fully remembered).
//   AL-01  the page finds assets by ID and says how many IDs are on record and how many are retired (kept, never reissued)
//   AL-02  the reference room's replacement camera AS-0112: in service, installed replacing the retired unit; following back to that
//          unit shows it retired, with its history and "replaced by AS-0112"; following forward returns
//   AL-03  an ID never issued is said to be on no record; a device ID (PA-…) is explained as a position, not a unit
//   AL-04  from service analytics, a job's asset link opens that asset, whose life lists the job with its vendor and SLA
//   AL-05  from the device register, an asset link opens the asset; a visitor is not shown the page; phone width does not scroll sideways
//   node tests/browser/demo-asset-life.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-asset-life');
const found = (p) => p.getByTestId('asset-life').getAttribute('data-found');
const kinds = (p) => p.getByTestId('al-stop').evaluateAll((els) => els.map((e) => e.dataset.kind));

{ const t = await open('#/v25/asset', { role: 'cxeng', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.getByTestId('al-find').waitFor(); const count = await p.getByTestId('al-count').innerText();
  const m = count.match(/([\d,]+) asset IDs on record · (\d+) retired/);
  ok('AL-01', 'the page finds assets by ID and counts the IDs on record and the retired ones (kept, never reissued)', !!m && Number(m[1].replace(/,/g, '')) > 1000 && Number(m[2]) >= 1 && /never reissued/.test(count), count);

  await p.getByTestId('al-input').fill('as-0112'); await p.getByTestId('al-input').press('Enter');
  await p.waitForFunction(() => document.querySelector('[data-testid=asset-life]')?.getAttribute('data-found') === 'in-service');
  const k1 = await kinds(p); const prev = await p.getByTestId('al-prev').innerText().catch(() => '');
  await p.getByTestId('al-prev').click(); await p.waitForFunction(() => document.querySelector('[data-testid=asset-life]')?.getAttribute('data-found') === 'retired');
  const k2 = await kinds(p); const tl = await p.getByTestId('al-timeline').innerText(); const old = (await p.locator('h1').innerText()).match(/AS-\d{4}/)?.[0];
  await p.getByTestId('al-next').click(); await p.waitForFunction(() => document.querySelector('[data-testid=asset-life]')?.getAttribute('data-found') === 'in-service');
  ok('AL-02', 'AS-0112 is in service, installed replacing a retired unit; that unit is shown retired with its history and "replaced by AS-0112"; forward returns',
    k1[0] === 'installed' && /Back to AS-\d{4}/.test(prev) && k2.includes('installed') && k2.includes('retired') && k2.includes('replaced') && /Replaced by AS-0112/.test(tl) && /never issued again/.test(tl) && old !== 'AS-0112', `${JSON.stringify(k1)} · ${old} ${JSON.stringify(k2)}`);

  await p.evaluate(() => { location.hash = '#/v25/asset?a=AS-9999'; }); await p.getByTestId('al-none').waitFor(); const n1 = await p.getByTestId('al-none').innerText();
  await p.evaluate(() => { location.hash = '#/v25/asset?a=PA-0007'; }); await p.waitForFunction(() => /not an asset ID/.test(document.querySelector('[data-testid=al-none]')?.textContent || ''));
  ok('AL-03', 'an ID never issued is on no record; a device ID is explained as a position, not a unit', /AS-9999 is not on the estate’s record/.test(n1) && /names a position, not a unit/.test(await p.getByTestId('al-none').innerText()));
  ok('AL-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close(); }

{ const t = await open('#/v25/service/analytics', { role: 'svcmgr', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  const link = p.locator('[data-testid=san-job] a[href^="#/v25/asset"]').first(); await link.waitFor();
  const row = link.locator('xpath=ancestor::tr'); const job = (await row.locator('th').innerText()).trim(); const code = (await link.innerText()).trim();
  await link.click(); await p.getByTestId('al-timeline').waitFor();
  const tl = await p.getByTestId('al-timeline').innerText();
  ok('AL-04', 'a service job’s asset link opens that asset, whose life lists the job with its vendor and its restore time against the SLA', new RegExp(`Service ${job}`).test(tl) && /restored in \d+ h against \d+ h|not restored yet/.test(tl) && (await p.locator('h1').innerText()).includes(code), `${job} ${code}`);
  await t.close(); }

{ const t = await open('#/commissioning/room/R-ATL-4-218', { role: 'installer', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  const a = p.getByTestId('reg-asset-link').first(); await a.waitFor(); const code = (await a.innerText()).trim(); await a.click();
  await p.getByTestId('al-timeline').waitFor(); const fromRegister = (await p.locator('h1').innerText()).includes(code);
  await t.close();
  const v = await open('#/v25/asset?a=AS-0112', { role: 'visitor', sw: false }); await v.page.waitForTimeout(800); const visitorSees = await v.page.getByTestId('asset-life').count(); await v.close();
  const ph = await open('#/v25/asset?a=AS-0112', { role: 'cxeng', sw: false, w: 390, h: 844 }); await ph.page.getByTestId('al-timeline').waitFor();
  const over = await ph.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); await ph.close();
  ok('AL-05', 'the device register’s asset link opens the asset; a visitor is not shown the page; at phone width nothing scrolls sideways', fromRegister && visitorSees === 0 && over <= 0, `${code} · visitor ${visitorSees} · overflow ${over}px`); }
await done();
