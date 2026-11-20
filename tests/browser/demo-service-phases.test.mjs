#!/usr/bin/env node
// A ServiceHands job on the same phase engine as commissioning (founder, 14 Nov 2026: ServiceHands' workflow, phase structure and
// universal engine the same as commissioning and assurance). The rules are unit-tested in tests/unit/universal-phases.test.mjs.
//   SP-01  a closed, verified, confirmed job: five phases pass and the sign-off names who signed
//   SP-02  a job waiting for triage: intake partly done, nothing else run, the sign-off waiting with its reasons
//   SP-03  working the job forward (triage) moves its phases: intake passes
//   SP-04  the service record's export carries the phases (JSON: the Phases table)
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

{ const t = await open('#/v25/service', { role: 'svcmgr', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.evaluate(() => localStorage.removeItem('empathia.demo.workspace.v1')); await p.reload(); await p.waitForSelector('[data-testid=incident]');
  const before = (await verdicts(p))[0]; await p.click('[data-testid=incident] button:has-text("Triage")'); await p.waitForTimeout(300);
  const after = (await verdicts(p))[0];
  ok('SP-03', 'triaging the job moves its intake phase to pass', before !== 'pass' && after === 'pass', `${before} → ${after}`);
  await t.close(); }
await done();
