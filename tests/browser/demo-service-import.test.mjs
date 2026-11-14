#!/usr/bin/env node
// ServiceHands import in a browser: export the queue, bring a file back, see the dry run, raise the ready rows (the rules themselves are
// unit-tested in tests/unit/service-import.test.mjs).
//   SIB-01  the service manager exports the queue as CSV and imports it back: every open request is recognised as already open, none raised
//   SIB-02  a file with ready, refused and formula rows: the dry run shows each with its reason; nothing is raised until Import
//   SIB-03  Import raises only the ready rows, as Standard and OPEN for triage; the import is in the audit trail with the file's SHA-256
//   SIB-04  a technician, who does not triage, is not offered the import
//   SIB-05  the queue exported as a workbook (.xlsx) comes back from its Requests sheet: nothing raised twice
//   node tests/browser/demo-service-import.test.mjs
import fs from 'node:fs';
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-service-import');
const runOf = (p) => p.getByTestId('sh-import-run');
const ws = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('empathia.demo.workspace.v1') || '{}'));

{ const t = await open('#/v25/service', { role: 'svcmgr', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.getByTestId('sh-import').waitFor();
  const [dc] = await Promise.all([p.waitForEvent('download'), p.getByTestId('sh-export').locator('button[data-format=csv]').click()]);
  const csv = fs.readFileSync(await dc.path());
  await p.getByTestId('sh-import-file').setInputFiles({ name: 'queue.csv', mimeType: 'text/csv', buffer: csv });
  await runOf(p).waitFor(); const r1 = { ready: await runOf(p).getAttribute('data-ready'), dup: await runOf(p).getAttribute('data-duplicate'), refused: await runOf(p).getAttribute('data-refused'), closed: (await runOf(p).innerText()).match(/(\d+) closed in the file/)?.[1] };
  ok('SIB-01', 'the queue exported as CSV comes back: every open request recognised as already open, every closed one left closed, nothing raised twice', r1.ready === '0' && Number(r1.dup) >= 3 && r1.refused === '0' && Number(r1.closed) >= 1, JSON.stringify(r1));

  const n0 = (await ws(p)).incidents?.length ?? 0;
  const file = ['Room,Title,Summary,Severity', 'R-ATL-4-220,Display flickers at the end of calls,The left display,High', 'R-ATL-4-231,No sound from the ceiling,,', 'R-ZZZ-9-999,Nowhere room,,', 'R-ATL-4-220,=HYPERLINK("http://example.invalid"),formula,'].join('\n');
  await p.getByTestId('sh-import-file').setInputFiles({ name: 'requests.csv', mimeType: 'text/csv', buffer: Buffer.from(file) });
  await p.waitForFunction(() => document.querySelector('[data-testid=sh-import-run]')?.getAttribute('data-ready') === '2');
  const states = await p.getByTestId('sh-import-row').evaluateAll((els) => els.map((e) => e.dataset.state));
  const reasons = await runOf(p).innerText(); const n1 = (await ws(p)).incidents?.length ?? 0;
  ok('SIB-02', 'the dry run shows each row with its result and reason, and nothing is raised before Import', JSON.stringify(states) === '["ready","ready","refused","refused"]' && /not in the campus record/.test(reasons) && /looks like a spreadsheet formula/.test(reasons) && n1 === n0, `${JSON.stringify(states)} · ${n0}→${n1}`);

  await p.getByTestId('sh-import-go').click(); await p.getByTestId('sh-import-done').waitFor();
  const w = await ws(p); const mine = w.incidents.filter((i) => /Imported from requests\.csv/.test(i.summary));
  const ev = w.events.find((e) => e.type === 'service.imported' && /requests\.csv/.test(e.detail));
  ok('SIB-03', 'Import raises only the ready rows, as Standard and OPEN for triage (the requested High written into the request); the import is audited with its SHA-256', mine.length === 2 && mine.every((i) => i.severity === 'Standard' && i.state === 'OPEN') && mine.some((i) => /Requested severity: High/.test(i.summary)) && !!ev && /SHA-256 [0-9a-f]{64}/.test(ev.detail) && /2 raised, 2 refused/.test(ev.detail), ev?.detail?.slice(0, 160));
  const [dx] = await Promise.all([p.waitForEvent('download'), p.getByTestId('sh-export').locator('button[data-format=xlsx]').click()]);
  await p.getByTestId('sh-import-file').setInputFiles({ name: 'queue.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: fs.readFileSync(await dx.path()) });
  await p.waitForFunction(() => /queue\.xlsx \(sheet Requests\)/.test(document.querySelector('[data-testid=sh-import-run]')?.textContent || ''));
  const rx = { ready: await runOf(p).getAttribute('data-ready'), dup: await runOf(p).getAttribute('data-duplicate'), refused: await runOf(p).getAttribute('data-refused') };
  ok('SIB-05', 'the queue exported as a workbook comes back from its Requests sheet: nothing raised twice, nothing refused', rx.ready === '0' && rx.refused === '0' && Number(rx.dup) >= 1, JSON.stringify(rx));
  ok('SIB-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close(); }

{ const t = await open('#/v25/service', { role: 'service', sw: false }); await t.page.waitForSelector('[data-testid=incidents]'); await t.page.waitForTimeout(300);
  ok('SIB-04', 'a technician, who does not triage, is not offered the import', await t.page.getByTestId('sh-import').count() === 0); await t.close(); }
await done();
