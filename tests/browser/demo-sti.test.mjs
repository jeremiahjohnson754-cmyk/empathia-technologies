#!/usr/bin/env node
// The STI workflow in a browser (rules: tests/unit/bench-sti.test.mjs). Readings against the project's policy, the intelligibility
// exception requested by the commissioning engineer and approved by someone else, the export.
//   STI-01  example readings (labelled synthetic): below the policy at the position behind the column, named
//   STI-02  an exception without a reason is refused; with reason, measures and expiry it is requested and waits
//   STI-03  its requester cannot approve it (separation of duties, audited); the systems engineer approves it
//   STI-04  phone readings are flagged indicative and cannot found an exception
//   STI-05  the JSON export carries the policy, the readings, the verdict and the approved exception, and says the readings are synthetic
//   STI-06  a visitor is not shown the page; phone width does not scroll sideways; no console error; nothing leaves the page
//   node tests/browser/demo-sti.test.mjs
import fs from 'node:fs';
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-sti');
const as = async (p, role) => { await p.evaluate((r) => localStorage.setItem('empathia.demo.perspective', r), role); await p.reload(); await p.getByTestId('sti-bench').waitFor(); };

{ const t = await open('#/commissioning/instruments/sti', { role: 'cxeng', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.getByTestId('sti-example').click(); await p.getByTestId('sti-result').waitFor();
  ok('STI-01', 'example readings, labelled synthetic: below the policy at the position behind the column', await p.getByTestId('sti-bench').getAttribute('data-verdict') === 'BELOW_POLICY' && /Behind the column/.test(await p.getByTestId('sti-why').innerText()) && await p.getByTestId('sti-synthetic').count() === 1);

  await p.getByTestId('sti-reason').fill('fine'); await p.getByTestId('sti-measures').fill('lectern microphone for questions'); await p.getByTestId('sti-request').click(); await p.getByTestId('sti-refused').waitFor();
  const r1 = await p.getByTestId('sti-refused').innerText();
  await p.getByTestId('sti-reason').fill('The seat behind the column is an overflow seat, not used for presenting or questions.'); await p.getByTestId('sti-request').click(); await p.getByTestId('sti-done').waitFor();
  ok('STI-02', 'an exception without a reason is refused; with one it is requested and waits for approval', /reason says why/.test(r1) && await p.getByTestId('sti-ix').getAttribute('data-state') === 'requested', r1);

  await p.getByTestId('sti-approve').click(); await p.getByTestId('sti-refused').waitFor(); const r2 = await p.getByTestId('sti-refused').innerText();
  await as(p, 'syseng'); await p.getByTestId('sti-approve').click(); await p.getByTestId('sti-done').waitFor();
  const ev = await p.evaluate(() => (JSON.parse(localStorage.getItem('empathia.demo.workspace.v1') || '{}').events || []).filter((e) => e.type.startsWith('sti.')).map((e) => `${e.type}:${e.outcome}`));
  ok('STI-03', 'its requester cannot approve it (separation of duties, audited); the systems engineer approves it', /separation of duties/.test(r2) && await p.getByTestId('sti-ix').getAttribute('data-state') === 'approved' && ev.includes('sti.exception_approved:DENIED') && ev.includes('sti.exception_approved:ALLOWED'), `${r2.slice(0, 120)} · ${ev.join(' ')}`);

  const [d] = await Promise.all([p.waitForEvent('download'), p.getByTestId('sti-export').locator('button[data-format=json]').click()]);
  const j = JSON.parse(fs.readFileSync(await d.path(), 'utf8'));
  ok('STI-05', 'the JSON export: policy, readings, verdict, the approved exception, and the synthetic label', j.entities?.policy?.id === 'POL-STI-MEET-1' && j.entities.readings.length === 5 && j.entities.evaluation.verdict === 'BELOW_POLICY' && j.entities.exceptions[0]?.approvedBy === 'syseng' && /Synthetic readings/.test(j.provenance.join(' ')) && /carried by an approved exception/.test(j.status.label), j.status?.label);

  await as(p, 'cxeng'); await p.getByTestId('sti-chain').selectOption('phone-app'); await p.getByRole('button', { name: 'Clear' }).click();
  await p.getByTestId('sti-example').click(); await p.getByTestId('sti-flags').waitFor();
  await p.getByTestId('sti-reason').fill('The seat behind the column is an overflow seat, not used for presenting or questions.'); await p.getByTestId('sti-measures').fill('lectern microphone for questions'); await p.getByTestId('sti-request').click(); await p.getByTestId('sti-refused').waitFor();
  ok('STI-04', 'phone readings are flagged indicative and cannot found an exception', /indicative only/.test(await p.getByTestId('sti-flags').innerText()) && /indicative readings/.test(await p.getByTestId('sti-refused').innerText()));
  ok('STI-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close(); }

{ const v = await open('#/commissioning/instruments/sti', { role: 'visitor', sw: false }); await v.page.waitForTimeout(800); const seen = await v.page.getByTestId('sti-bench').count(); await v.close();
  const ph = await open('#/commissioning/instruments/sti', { role: 'cxeng', sw: false, w: 390, h: 844 }); await ph.page.getByTestId('sti-example').click(); await ph.page.getByTestId('sti-result').waitFor();
  const over = await ph.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); await ph.close();
  ok('STI-06', 'a visitor is not shown the page; at phone width nothing scrolls sideways', seen === 0 && over <= 0, `visitor ${seen} · overflow ${over}px`); }
await done();
