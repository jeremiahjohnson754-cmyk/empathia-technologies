// Importing service requests (founder, 14 Nov 2026: "the same export and import file system as commissioning and apex … do the same for
// ServiceHands"). The importer's rules on hostile and ordinary files: a dry run writes nothing; formula-looking cells are refused, never
// run; unknown rooms, missing titles and bad severities are refused with reasons; duplicates are skipped; a requested severity is never
// applied (triage decides); Empathia's own CSV and JSON exports of the queue round-trip.
//   node --test tests/unit/service-import.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'service-import-')), 'm.mjs');
await esbuild.build({ stdin: { contents: "export * as I from './service/importer.ts'; export * as S from './workspace/store.ts'; export { serviceQueuePackage } from './export/service.ts'; export { render } from './export/render.ts';", resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', define: { 'process.env.DEMO_BUILD_ID': '"test"' }, external: ['docx', 'pptxgenjs', 'pdf-lib', 'jszip'] });
const { I, S, serviceQueuePackage, render } = await import(pathToFileURL(out).href);
const real = (w) => JSON.stringify({ incidents: w.incidents, workOrders: w.workOrders });

test('SI-01 the CSV parser: quotes, doubled quotes, commas and line breaks inside quotes, CRLF, a BOM, blank lines', () => {
  assert.deepEqual(I.parseCsv('﻿a,b\r\n"x, y","say ""hi""\nthere"\r\n\r\n,z\n'), [['a', 'b'], ['x, y', 'say "hi"\nthere'], ['', 'z']]);
});

test('SI-02 a dry run reads, checks every row and writes nothing; reasons are given per row', () => {
  const w = S.seed(); const before = real(w); const ev = w.events.length;
  const csv = ['# exported_as: someone', 'Room,Title,Summary,Severity',
    'R-ATL-4-220,Display flickers at the end of calls,The left display,High',
    'Atlas 4.231 Training (R-ATL-4-231),No sound from the ceiling,,standard',
    'R-ZZZ-9-999,Nowhere room,,',
    'R-ATL-4-220,,missing title,',
    'R-ATL-4-220,=HYPERLINK("http://example.invalid"),formula title,',
    'R-ATL-4-220,Remote cannot see content,,urgent',
    "R-ATL-4-220,'=1+1 is a literal,an exported cell,",
    'R-ATL-4-220,Display flickers at the end of calls,same again,'].join('\n');
  const r = I.dryRun('requests.csv', csv, w);
  assert.equal(r.fatal, null); assert.equal(real(w), before, 'nothing written'); assert.equal(w.events.length, ev);
  const st = r.rows.map((x) => [x.line, x.state]);
  assert.deepEqual(st, [[3, 'ready'], [4, 'ready'], [5, 'refused'], [6, 'refused'], [7, 'refused'], [8, 'refused'], [9, 'ready'], [10, 'duplicate']]);
  assert.match(r.rows[2].why[0], /not in the campus record/); assert.match(r.rows[3].why.join(), /no title/); assert.match(r.rows[4].why.join(), /looks like a spreadsheet formula/);
  assert.match(r.rows[5].why.join(), /severity “urgent” is not one of/); assert.equal(r.rows[6].title, '=1+1 is a literal', 'Empathia’s own apostrophe-protected cell comes back as text');
  assert.equal(r.rows[1].severity, 'Standard'); assert.equal(r.rows[1].roomId, 'R-ATL-4-231');
  assert.deepEqual([r.ready, r.refused, r.duplicate], [3, 4, 1]);
});

test('SI-03 committing raises only the ready rows, through the hand-raised rule; severity is requested, never applied', () => {
  const w = S.seed(); const n0 = w.incidents.length;
  const r = I.dryRun('requests.csv', 'Room,Title,Severity\nR-ATL-4-220,Display flickers at the end of calls,Mission critical\nR-ZZZ-9-999,Nowhere,\n', w);
  const c = I.commit(r, w, 'svcmgr', S.raiseIncident);
  assert.equal(c.made.length, 1); assert.equal(w.incidents.length, n0 + 1);
  const inc = w.incidents.find((i) => i.id === c.made[0]);
  assert.equal(inc.severity, 'Standard', 'an import never decides severity'); assert.equal(inc.state, 'OPEN');
  assert.match(inc.summary, /Requested severity: Mission critical \(for triage to decide\)\. Imported from requests\.csv, line 2\./);
  const visitor = I.commit(I.dryRun('again.csv', 'Room,Title\nR-ATL-4-220,Another thing to look at\n', w), w, 'visitor', S.raiseIncident);
  assert.equal(visitor.made.length, 0); assert.equal(visitor.refused.length, 1, 'a role that may not raise requests imports none');
});

test('SI-04 Empathia’s own exports of the queue come back: the CSV and the JSON dossier, every open request a duplicate of itself', async () => {
  const w = S.seed(); const rep = serviceQueuePackage(w, { role: 'Service Manager', at: '2026-11-14T00:00:00Z', build: 'test' });
  const csv = new TextDecoder().decode((await render(rep, 'csv')).bytes); const json = new TextDecoder().decode((await render(rep, 'json')).bytes);
  for (const [name, text] of [['queue.csv', csv], ['queue.json', json]]) {
    const r = I.dryRun(name, text, w); assert.equal(r.fatal, null, `${name}: ${r.fatal}`);
    assert.equal(r.rows.length, w.incidents.length, name);
    const open = w.incidents.filter((i) => !['CLOSED', 'CANCELLED'].includes(i.state)).length;
    assert.equal(r.duplicate, open, `${name}: each open request is recognised as already here`);
    assert.equal(r.refused, 0, `${name}: ${JSON.stringify(r.rows.filter((x) => x.state === 'refused').map((x) => x.why))}`);
    assert.equal(r.closed, w.incidents.length - open, `${name}: a closed request in the file is not raised again`); assert.equal(r.ready, 0, name);
  }
});

test('SI-05 limits and the wrong files: too many rows, too large, no header, a JSON that is not a queue export', () => {
  const w = S.seed();
  assert.match(I.dryRun('x.csv', 'Room,Title\n' + 'R-ATL-4-220,Something to look at\n'.repeat(201), w).fatal, /at most 200 rows/);
  assert.match(I.dryRun('x.csv', 'x'.repeat(1_000_001), w).fatal, /over 1 MB/);
  assert.match(I.dryRun('x.csv', 'Where,What\nR-ATL-4-220,thing\n', w).fatal, /names no room column or no title column/);
  assert.match(I.dryRun('x.json', '{"schema":"something-else"}', w).fatal, /Empathia service queue export/);
  assert.match(I.dryRun('x.json', '{oops', w).fatal, /could not be read/);
});
