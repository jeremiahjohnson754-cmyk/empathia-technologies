#!/usr/bin/env node
// A ServiceHands job on the same phase engine as commissioning (founder, 14 Nov 2026: ServiceHands' workflow, phase structure and
// universal engine the same as commissioning and assurance). The rules are unit-tested in tests/unit/universal-phases.test.mjs.
//   SP-01  a closed, verified, confirmed job: five phases pass and the sign-off names who signed
//   SP-02  a job waiting for triage: intake partly done, nothing else run, the sign-off waiting with its reasons
//   SP-03  working the job forward (triage) moves its phases: intake passes
//   SP-04  the service record's export carries the phases (JSON: the Phases table)
//   SP-05  the job's work order number opens the work order
//   SP-06  a work order that needs nothing from the person looking (here: waiting for triage) says where it stands and who has the next step
//   SP-07  the job's row of other products wraps inside its card
//   SP-08  a work order with its own sections does not show that card
//   node tests/browser/demo-service-phases.test.mjs
import fs from 'node:fs';
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-service-phases');
const verdicts = (p) => p.getByTestId('sh-phases-phase').evaluateAll((els) => els.map((e) => e.dataset.verdict));

{ const t = await open('#/v25/service?id=ISS-0398', { role: 'svcmgr', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.evaluate(() => localStorage.removeItem('empathia.demo.workspace.v1')); await p.reload(); await p.getByTestId('sh-phases').waitFor();
  const v1 = await verdicts(p); const so = await p.getByTestId('sh-phases-signoff').innerText();
  ok('SP-01', 'a closed, verified, confirmed job: five phases pass and the sign-off names who signed', JSON.stringify(v1) === '["pass","pass","pass","pass","pass"]' && /Signed off/.test(so) && await p.getByTestId('sh-phases').getAttribute('data-signed') === 'true', `${JSON.stringify(v1)} · ${so.replace(/\s+/g, ' ')}`);

  const [d] = await Promise.all([p.waitForEvent('download'), p.getByTestId('sh-record-export').locator('button[data-format=json]').click()]);
  const j = JSON.parse(fs.readFileSync(await d.path(), 'utf8')); const rows = j.tables?.Phases?.rows || [];
  ok('SP-04', 'the service record’s export carries the job phase by phase', rows.length === 10 && rows.every((r) => /^\d · /.test(r.ph)) && rows.some((r) => r.res === 'Done'), `${rows.length} rows`);

  await p.evaluate(() => { location.hash = '#/v25/service?id=ISS-0421'; }); await p.waitForTimeout(400);
  await p.locator('[data-testid=incidents] a[href$="ISS-0421"]').click(); await p.waitForTimeout(300);
  const v2 = await verdicts(p); const waits = await p.getByTestId('sh-phases-waits').innerText().catch(() => '');
  ok('SP-02', 'a job waiting further on: later phases not run; the sign-off waits and says for what', v2.slice(2).every((v) => v === 'notrun' || v === 'partial') && /phase \d/.test(waits) && await p.getByTestId('sh-phases').getAttribute('data-signed') === 'false', `${JSON.stringify(v2)} · ${waits.slice(0, 120)}`);
  ok('SP-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close(); }

// SP-05 (24 Nov 2026): the job names its work order and leads to it. The number was text; the work order page for the same record was one address away and not linked.
{ const t = await open('#/v25/service?id=ISS-0417', { role: 'svcmgr', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.evaluate(() => localStorage.removeItem('empathia.demo.workspace.v1')); await p.reload(); const a = p.getByTestId('svc-wo-link'); await a.waitFor(); const id = (await a.innerText()).trim(); const href = await a.getAttribute('href');
  await a.click(); await p.waitForSelector('main h1'); await p.waitForTimeout(400);
  const at = await p.evaluate(() => ({ hash: location.hash, refused: !!document.querySelector('[data-testid=access-page]'), text: document.querySelector('main')?.innerText.slice(0, 2000) || '' }));
  ok('SP-05', 'the job’s work order number is a link, and it opens that work order', /^WO-\d+$/.test(id) && href === `#/servicehands/wo/${id}` && at.hash === href && !at.refused && at.text.includes(id) && !t.errs.length, JSON.stringify({ id, href, hash: at.hash, refused: at.refused }));
  // SP-06, SP-07 (24 Nov 2026, design pass): on the work order the main column was blank whenever the job needed nothing from the person
  // looking at it, and the row of the same job in the other products scrolled sideways inside its card with its last place cut off.
  await p.evaluate(() => localStorage.setItem('empathia.demo.perspective', 'service')); await p.reload(); await p.waitForSelector('main h1'); await p.waitForTimeout(400);
  const w1 = await p.evaluate(() => { const n = document.querySelector('[data-testid=wo-next]'); const j = document.querySelector('[data-testid=job-jumps]'); const c = j?.closest('.ops-card')?.getBoundingClientRect();
    return { shown: !!n && n.getClientRects().length > 0, says: n?.innerText.slice(0, 200) || '', main: n?.parentElement?.children.length, places: j ? j.querySelectorAll('a').length : 0, cut: j ? [...j.querySelectorAll('a')].filter((a) => { const b = a.getBoundingClientRect(); return b.right > c.right + 1 || b.left < c.left - 1; }).length : -1, scrolls: j ? j.scrollWidth - j.clientWidth : -1 }; });
  ok('SP-06', 'a work order waiting for triage, seen by the technician: the main column says where the job stands and who has the next step', w1.shown && w1.main === 1 && /waiting for triage/.test(w1.says) && /The Service Manager triages it/.test(w1.says), JSON.stringify(w1));
  ok('SP-07', 'the job’s row of other products wraps inside its card: every place is in view, none cut off', w1.places >= 4 && w1.cut === 0 && w1.scrolls <= 1, JSON.stringify({ places: w1.places, cut: w1.cut, scrolls: w1.scrolls }));
  const closed = await p.evaluate(() => JSON.parse(localStorage.getItem('empathia.demo.workspace.v1')).incidents.find((i) => i.id === 'ISS-0398')?.workOrderId || null);
  await p.evaluate((h) => { location.hash = h; }, `#/servicehands/wo/${closed}`); await p.waitForTimeout(600);
  const w2 = await p.evaluate(() => { const n = document.querySelector('[data-testid=wo-next]'); return { there: !!n, shown: !!n && n.getClientRects().length > 0, main: n?.parentElement?.children.length, h1: document.querySelector('main h1')?.textContent }; });
  ok('SP-08', 'a closed work order has its own sections in the main column, so the “nothing to do” card is not shown', !!closed && w2.there && !w2.shown && w2.main > 1, JSON.stringify({ closed, ...w2 }));
  ok('SP-05-clean', 'no console error on the job and its work order', !t.errs.length, t.errs.slice(0, 2).join(' | '));
  await t.close(); }

{ const t = await open('#/v25/service', { role: 'svcmgr', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.evaluate(() => localStorage.removeItem('empathia.demo.workspace.v1')); await p.reload(); await p.waitForSelector('[data-testid=incident]');
  const before = (await verdicts(p))[0]; await p.click('[data-testid=incident] button:has-text("Triage")'); await p.waitForTimeout(300);
  const after = (await verdicts(p))[0];
  ok('SP-03', 'triaging the job moves its intake phase to pass', before !== 'pass' && after === 'pass', `${before} → ${after}`);
  await t.close(); }
await done();
