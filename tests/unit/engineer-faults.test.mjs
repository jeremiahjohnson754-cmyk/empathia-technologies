// Failure handling on the Engineer start page (apps/demo/src/build/store.ts FAULTS; V2.5.5 Engineer Edition, read on 16 Nov 2026):
// an injected fault makes the product's own refusal, with its reason, and leaves nothing half-done.
//   EF-01  only an engineering persona injects a fault; an unknown fault is refused
//   EF-02  missing geometry: a new room is refused and nothing is created; switched off, the room is created
//   EF-03  conflicting id, rejected approval, Drawing Intelligence unavailable: each step is refused, logged DENIED, and the state is unchanged
//   EF-04  invalid evidence: a result is not recorded and the workbook is refused; with the faults off every step goes through
//   node --test tests/unit/engineer-faults.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'faults-')), 'm.mjs');
await esbuild.build({ stdin: { contents: "export * as S from './build/store.ts'; export { ENG_DEMOS } from './engineer/demos.ts';", resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', define: { 'process.env.DEMO_BUILD_ID': '"test"' } });
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const { S, ENG_DEMOS } = await import(pathToFileURL(out).href);
const make = () => S.createDraft({ name: 'Fault Huddle (synthetic)', template: 'huddle', width: '4', length: '5', height: '2.7', unit: 'm', occupancy: 6, intendedUse: 'meetings' }, 'designer');
const off = () => { for (const [k] of S.FAULTS) S.setFault('syseng', k, false); };

test('EF-01 only an engineering persona injects a fault', () => {
  assert.match(S.setFault('designer', 'rejectApproval', true).why[0], /does not inject faults/); assert.deepEqual(S.faultsOn(), {});
  assert.match(S.setFault('syseng', 'nope', true).why[0], /unknown fault/);
  assert.equal(S.setFault('cxeng', 'invalidEvidence', true), null); assert.equal(S.faulted('invalidEvidence'), true); off(); assert.deepEqual(S.faultsOn(), {});
  assert.deepEqual(S.FAULTS.map(([k]) => k), ['missingGeometry', 'conflictingId', 'rejectApproval', 'invalidEvidence', 'integrationDown']);
});

test('EF-02 missing geometry: a new room is refused; switched off, it is created', () => {
  S.setFault('syseng', 'missingGeometry', true); const r = make(); assert.ok('why' in r && /fault injected \(missing geometry\)/.test(r.why[0]), JSON.stringify(r).slice(0, 200));
  off(); const d = make(); assert.ok(!('why' in d), JSON.stringify(d).slice(0, 300));
});

test('EF-03 conflicting id, rejected approval, Drawing Intelligence unavailable: refused, logged, unchanged', () => {
  const d = make(); assert.ok(!('why' in d)); const n = d.design.devices.length; const cat = d.design.devices[0].cat;
  S.setFault('syseng', 'conflictingId', true); const a = S.addDevice(d, 'designer', cat, { x: 1, y: 1 }); assert.ok('why' in a && /conflicting asset id/.test(a.why[0]) && /A-\d+/.test(a.why[0]));
  assert.equal(d.design.devices.length, n); assert.equal(d.events[0].outcome, 'DENIED'); off();
  assert.ok(!('why' in S.saveRevision(d, 'designer', 'first')));
  S.setFault('syseng', 'rejectApproval', true); const c = S.approveClassification(d, 'syseng'); assert.ok('why' in c && /approval rejected/.test(c.why[0]));
  assert.ok(!d.design.classification.approved, 'still proposed'); assert.equal(d.design.lifecycle, 'PLANNED'); assert.equal(d.events[0].outcome, 'DENIED'); off();
  assert.ok(!('why' in S.approveClassification(d, 'syseng')));
  const kind = Object.keys(d.drawings)[0]; const before = JSON.stringify(d.drawings[kind]);
  S.setFault('syseng', 'integrationDown', true); const g = S.approveDrawing(d, 'syseng', kind); assert.ok('why' in g && /drawing intelligence unavailable/.test(g.why[0])); assert.equal(JSON.stringify(d.drawings[kind]), before); off();
});

test('EF-04 invalid evidence: no result is recorded and the workbook is refused; the sheets name files that exist', () => {
  S.setFault('cxeng', 'invalidEvidence', true); assert.match(S.workbookRefusal()[0], /invalid test evidence/); off(); assert.equal(S.workbookRefusal(), null);
  for (const D of ENG_DEMOS) { for (const [f] of [...D.source, ...D.tests]) assert.ok(fs.existsSync(path.join(repo, f)), `${D.key}: ${f} exists`); for (const k of D.faults) assert.ok(S.FAULTS.some(([key]) => key === k)); }
  assert.deepEqual(ENG_DEMOS.map((D) => D.key), ['design', 'cx', 'handoff']);
});
