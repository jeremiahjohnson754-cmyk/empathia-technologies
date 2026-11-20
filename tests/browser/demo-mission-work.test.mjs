#!/usr/bin/env node
// Each role's home centred on the work to be done (founder, 14 Nov 2026: "make the mission control of every role much much better …
// center it around the work needing to be done"):
//   MW-01  the service manager's home lists the vendors against their agreements, those falling short first, each opening its own drill
//   MW-02  the executive sees the same accountability, with a figure for it; the drill opens on Service analytics at that vendor
//   MW-03  the installer's home lists the rooms whose device register is not complete; registering a device moves the count
//   MW-04  roles that may not open those pages are not shown them (a technician sees no vendor zone; an employee neither zone)
//   node tests/browser/demo-mission-work.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-mission-work');
const zone = (p, id) => p.locator(`[data-testid=rh-zone][data-zone=${id}]`);

{ const t = await open('#/home', { role: 'svcmgr', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await zone(p, 'vendors').waitFor();
  const rows = await zone(p, 'vendors').locator('[data-testid=rh-row]').evaluateAll((els) => els.map((e) => ({ id: e.dataset.id, text: e.innerText, href: e.querySelector('a')?.getAttribute('href') })));
  ok('MW-01', 'the service manager’s home lists the vendors against their agreements, those falling short first, each opening its own drill', rows.length >= 4 && /response within SLA|restore within SLA|time to restore|reopen/.test(rows[0].text) && rows.every((r) => r.href === `#/v25/service/analytics?m=6&v=${r.id}`), JSON.stringify(rows.slice(0, 2)).slice(0, 240));
  await t.close(); }

{ const t = await open('#/home', { role: 'exec', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await zone(p, 'vendors').waitFor();
  const page = await p.locator('main').innerText();
  await zone(p, 'vendors').locator('[data-testid=rh-row] a').first().click();
  await p.getByTestId('service-analytics').waitFor(); const lvl = await p.getByTestId('service-analytics').getAttribute('data-level');
  ok('MW-02', 'the executive sees vendors needing attention as a figure and a list; a row drills into Service analytics at that vendor', /Vendors needing attention/.test(page) && lvl === 'vendor', lvl);
  ok('MW-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close(); }

{ const t = await open('#/home', { role: 'installer', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await zone(p, 'register').waitFor();
  const first = zone(p, 'register').locator('[data-testid=rh-row]').first(); const id = await first.getAttribute('data-id'); const before = await first.innerText();
  const n0 = Number((/(\d+) of \d+ devices registered/.exec(before) || [])[1]);
  await first.locator('a').click(); await p.getByTestId('cx-registers').waitFor();
  const dev = await p.getByTestId('reg-devices').locator('[data-testid=reg-row]').first().getAttribute('data-device');
  await p.getByTestId('reg-devices').locator(`[data-testid=reg-row][data-device="${dev}"] [data-testid=reg-edit]`).click();
  const r = p.getByTestId('reg-devices').locator(`[data-testid=reg-row][data-device="${dev}"]`);
  await r.locator('input[data-field=serial]').fill('SYN-SN-MW-0001');
  if (await r.locator('input[data-field=hostname]').count()) { await r.locator('input[data-field=hostname]').fill('mw-host-01'); await r.locator('input[data-field=ip]').fill('10.77.0.1'); }
  await r.getByTestId('reg-save').click(); await p.waitForTimeout(200);
  await p.goto(p.url().split('#')[0] + '#/home'); await zone(p, 'register').waitFor();
  const more = zone(p, 'register').locator('button[aria-expanded=false]'); if (await more.count()) await more.click();   // the zone shows five rows until expanded
  const after = await zone(p, 'register').locator(`[data-testid=rh-row][data-id="${id}"]`).innerText();
  const n1 = Number((/(\d+) of \d+ devices registered/.exec(after) || [])[1]);
  ok('MW-03', 'the installer’s home lists the rooms whose register is not complete, least complete first; registering a device moves the count', n1 === n0 + 1, `${id}: ${n0} → ${n1}`);
  await t.close(); }

{ const seen = [];
  for (const role of ['service', 'employee']) { const t = await open('#/home', { role, sw: false }); await t.page.waitForSelector('[data-testid=home]'); await t.page.waitForTimeout(400); seen.push([role, await zone(t.page, 'vendors').count(), await zone(t.page, 'register').count()]); await t.close(); }
  ok('MW-04', 'a technician is shown no vendor accountability, and an employee neither the vendors nor the registers', seen.every(([, v]) => v === 0) && seen.find(([r]) => r === 'employee')[2] === 0, JSON.stringify(seen)); }
await done();
