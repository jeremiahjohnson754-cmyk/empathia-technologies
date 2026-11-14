#!/usr/bin/env node
// People intelligence (founder, 14 Nov 2026: track everyone that touched the project, for dispatch and Search Party; projects done by a
// person increase their experience by complexity and type of work). Experience is evidence from the record, never a credential.
//   PE-01  the service manager sees everyone with worked jobs, most experience first, with the note that experience grants no authority
//   PE-02  filtered to control systems, the list ranks by control experience (each row's figure is its control experience)
//   PE-03  a person: experience by layer (six layers), a quarterly trend, and the rooms worked with each job's weight
//   PE-04  a room's record lists everyone who touched it — people from its jobs, roles from its record — and links to their experience
//   PE-05  dispatch shows each eligible candidate's record experience in the job's layer, beside the engine's ranking (not part of it)
//   PE-06  a visitor is not shown the page; phone width does not scroll sideways; no console error; nothing leaves the page
//   node tests/browser/demo-people.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-people');
const pts = (p) => p.getByTestId('pp-row').evaluateAll((els) => els.map((e) => Number(e.dataset.points)));
const desc = (xs) => xs.every((x, i) => i === 0 || xs[i - 1] >= x);

{ const t = await open('#/v25/people', { role: 'svcmgr', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.getByTestId('pp-list').waitFor(); const all = await pts(p);
  ok('PE-01', 'everyone with worked jobs, most experience first; experience is said to be evidence that grants no authority', all.length >= 8 && desc(all) && all[0] > 0 && /never a credential/.test(await p.getByTestId('pp-note').innerText()), `${all.length} people · top ${all[0]}`);

  await p.getByRole('radio', { name: 'Control' }).click(); await p.waitForFunction(() => document.querySelector('[data-testid=people]')?.getAttribute('data-layer') === 'control');
  const ctl = await pts(p); const firstId = await p.getByTestId('pp-row').first().getAttribute('data-person');
  ok('PE-02', 'filtered to control, the list ranks by control experience', ctl.length >= 3 && desc(ctl) && ctl.every((x) => x > 0), JSON.stringify(ctl.slice(0, 5)));

  await p.getByTestId('pp-row').first().locator('th a').click(); await p.getByTestId('pp-person').waitFor();
  const layers = await p.locator('[data-testid=pp-layers] li').evaluateAll((els) => els.map((e) => [e.dataset.layer, Number(e.dataset.points)]));
  const jobs = await p.getByTestId('pp-job').count(); const control = layers.find((l) => l[0] === 'control')?.[1];
  ok('PE-03', 'a person: experience in six layers, a quarterly trend, the rooms worked with each job’s weight; the control figure matches the list', layers.length === 6 && control === ctl[0] && await p.getByTestId('pp-trend').count() === 1 && jobs >= 1 && (await p.getByTestId('people').getAttribute('data-person')) === firstId, `${JSON.stringify(layers)} · ${jobs} jobs`);
  ok('PE-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close(); }

{ const t = await open('#/commissioning/room/R-ATL-4-218', { role: 'cxeng', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.getByTestId('who-touched').waitFor(); const people = await p.getByTestId('wt-person').count(); const roles = await p.getByTestId('wt-role').count();
  let linked = false; if (people) { await p.getByTestId('wt-person').first().locator('a').click(); await p.getByTestId('pp-person').waitFor(); linked = true; }
  ok('PE-04', 'the room’s record lists everyone who touched it (people from its jobs, roles from its record) and links to a person’s experience', roles >= 1 && (people === 0 || linked), `${people} people · ${roles} roles`);
  await t.close(); }

{ const t = await open('#/v25/service', { role: 'svcmgr', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.evaluate(() => { localStorage.removeItem('empathia.demo.workspace.v1'); }); await p.reload(); await p.waitForSelector('[data-testid=incident]');
  await p.click('[data-testid=incident] button:has-text("Triage")'); await p.waitForSelector('[data-testid=candidates]');
  const xp = await p.getByTestId('cand-experience').allInnerTexts();
  ok('PE-05', 'dispatch shows each eligible candidate’s record experience in the job’s layer, beside the ranking', xp.length >= 1 && xp.every((x) => /record: (\w+ experience [\d.]+ · [A-Z][a-z]+|no worked jobs on record)/.test(x)), JSON.stringify(xp.slice(0, 3)));
  await t.close(); }

{ const v = await open('#/v25/people', { role: 'visitor', sw: false }); await v.page.waitForTimeout(800); const seen = await v.page.getByTestId('people').count(); await v.close();
  const ph = await open('#/v25/people', { role: 'svcmgr', sw: false, w: 390, h: 844 }); await ph.page.getByTestId('pp-list').waitFor();
  const over = await ph.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); await ph.close();
  ok('PE-06', 'a visitor is not shown the page; at phone width nothing scrolls sideways', seen === 0 && over <= 0, `visitor ${seen} · overflow ${over}px`); }
await done();
