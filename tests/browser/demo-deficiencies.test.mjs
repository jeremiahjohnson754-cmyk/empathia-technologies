#!/usr/bin/env node
// The deficiency workbench: one deficiency worked from Open to Closed through the engine's state machine, by the people who may take each
// step, with the engine's refusals shown and every step in the audit trail (the rules themselves: packages/commissioning-engine/test/
// deficiencies.test.ts).
//   DF-01  the commissioning engineer starts it: an owner and a target date; Open → In progress
//   DF-02  the commissioning engineer cannot record the fix (not their authority), and the refusal is audited
//   DF-03  the installer records the fix: a one-word action is refused; root cause and action → Pending retest
//   DF-04  the commissioning engineer records a passing retest on evidence, and cannot then verify it (separation of duties)
//   DF-05  the systems engineer verifies and closes it; the history has every step; the audit trail has every step and refusal
//   DF-06  phone width does not scroll sideways; no console error; nothing leaves the page
//   node tests/browser/demo-deficiencies.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-deficiencies');
const after = (p) => p.locator('[data-testid=df-done], [data-testid=df-refused]').first().waitFor();
const state = (p) => p.getByTestId('df-states').getAttribute('data-state');
const as = async (p, role) => { await p.evaluate((r) => localStorage.setItem('empathia.demo.perspective', r), role); await p.reload(); await p.getByTestId('df-bench').waitFor(); };
const events = (p) => p.evaluate(() => (JSON.parse(localStorage.getItem('empathia.demo.workspace.v1') || '{}').events || []).filter((e) => e.type.startsWith('deficiency.')));

{ const t = await open('#/commissioning/deficiencies', { role: 'cxeng', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.getByTestId('df-bench').waitFor(); const s0 = await state(p);
  await p.getByTestId('df-do-start').click(); await after(p); const r1 = await p.getByTestId('df-refused').count() ? await p.getByTestId('df-refused').innerText() : '';
  ok('DF-01', 'the commissioning engineer names the owner and a target date: Open → In progress', s0 === 'OPEN' && await state(p) === 'IN_PROGRESS' && /Installer/.test(await p.getByTestId('df-facts').innerText()), `${s0} → ${await state(p)} ${r1}`);

  await p.getByTestId('df-action').fill('AEC reference re-routed to the far-end output'); await p.getByTestId('df-do-fixed').click(); await p.getByTestId('df-refused').waitFor();
  const r2 = await p.getByTestId('df-refused').innerText(); const ev2 = await events(p);
  ok('DF-02', 'the commissioning engineer cannot record the fix (it needs work.evidence), and the refusal is in the audit trail', /does not hold work\.evidence/.test(r2) && await state(p) === 'IN_PROGRESS' && ev2.some((e) => e.type === 'deficiency.fixed' && e.outcome === 'DENIED'), r2);

  await as(p, 'installer');
  await p.getByTestId('df-action').fill('done'); await p.getByTestId('df-do-fixed').click(); await p.getByTestId('df-refused').waitFor(); const r3 = await p.getByTestId('df-refused').innerText();
  await p.getByTestId('df-cause').selectOption('CONFIGURATION'); await p.getByTestId('df-action').fill('AEC reference re-routed to the far-end output'); await p.getByTestId('df-do-fixed').click(); await p.getByTestId('df-done').waitFor();
  ok('DF-03', 'the installer records the fix: a one-word action is refused; with root cause and action it goes to Pending retest', /says what was done/.test(r3) && await state(p) === 'PENDING_RETEST' && /configuration · AEC reference/.test(await p.getByTestId('df-facts').innerText()), r3);

  await as(p, 'cxeng');
  await p.getByTestId('df-evidence').fill('EV-0042'); await p.getByTestId('df-do-retest').click(); await p.getByTestId('df-done').waitFor();
  const retest = await p.getByTestId('df-facts').innerText();
  await p.getByTestId('df-do-verify').click(); await p.getByTestId('df-refused').waitFor(); const r4 = await p.getByTestId('df-refused').innerText();
  ok('DF-04', 'a passing retest on EV-0042 is recorded; its recorder cannot verify it (separation of duties)', /PASS on EV-0042/.test(retest) && /recorded the retest does not verify it/.test(r4) && await state(p) === 'PENDING_RETEST', r4);

  await as(p, 'syseng');
  await p.getByTestId('df-do-verify').click(); await p.getByTestId('df-done').waitFor();
  const hist = await p.getByTestId('df-history').locator('li').count(); const ev = await events(p);
  ok('DF-05', 'the systems engineer verifies and closes it; five steps in its history; every step and refusal in the audit trail', await state(p) === 'CLOSED' && hist === 5
    && ['start', 'fixed', 'retest', 'verify'].every((k) => ev.some((e) => e.type === `deficiency.${k}` && e.outcome === 'ALLOWED')) && ev.filter((e) => e.outcome === 'DENIED').length >= 3, `${await state(p)} · history ${hist} · ${ev.length} events`);
  ok('DF-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close(); }

{ const ph = await open('#/commissioning/deficiencies', { role: 'cxeng', sw: false, w: 390, h: 844 }); await ph.page.getByTestId('df-bench').waitFor();
  const over = await ph.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('DF-06', 'at phone width the workbench does not scroll the page sideways', over <= 0, `${over}px`); await ph.close(); }
await done();
