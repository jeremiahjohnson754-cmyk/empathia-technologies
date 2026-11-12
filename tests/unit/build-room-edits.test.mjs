#!/usr/bin/env node
// Build a Room's editing verbs (apps/demo/src/build/store.ts), restored 12 Nov 2026 from V2.5.3: move, duplicate, swap within a group,
// retire a proposed connection with a reason, compare revisions by device identity. Each one refuses where the engine refuses.
//   node --test tests/unit/build-room-edits.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'build-edits-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as B from './build/store.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')] });
const { B } = await import(pathToFileURL(out).href);
process.on('exit', () => fs.rmSync(path.dirname(out), { recursive: true, force: true }));
const draft = () => B.createDraft({ name: 'Test huddle', template: 'huddle', unit: 'm', length: '', width: '', ceiling: '', occupancy: '', intendedUse: '', shape: 'rect' }, 'designer');
const live = (d) => d.design.devices.filter((x) => !x.removed && !x.furniture);

test('move: 25 cm steps inside the room, logged; the visitor and a locked room are refused', () => {
  const d = draft(); const dev = live(d)[0]; const x0 = dev.x;
  const r = B.moveDevice(d, 'designer', dev.id, 0.25, 0); assert.ok(!('why' in r)); assert.equal(r.design.devices.find((x) => x.id === dev.id).x, Math.round(Math.min(d.design.geometry.widthM, x0 + 0.25) * 100) / 100);
  assert.equal(r.events[0].type, 'room.device_moved');
  assert.ok('why' in B.moveDevice(draft(), 'requestor', dev.id, 0.25, 0));
  const edge = draft(); const e = live(edge)[0]; const c1 = B.moveDevice(edge, 'designer', e.id, -999, -999); assert.ok(!('why' in c1)); const at = c1.design.devices.find((x) => x.id === e.id); assert.deepEqual([at.x, at.y], [0, 0], 'clamped to the room');
  const again = B.moveDevice(c1, 'designer', e.id, -0.25, -0.25); assert.ok('why' in again); assert.match(again.why[0], /edge of the room/);
  const locked = draft(); locked.design.lifecycle = 'DESIGN_APPROVED'; assert.ok('why' in B.moveDevice(locked, 'designer', live(locked)[0].id, 0.25, 0));
});
test('duplicate adds a new identity of the same class; swap retires the old identity and stays within its group', () => {
  const d = draft(); const dev = live(d)[0]; const n = live(d).length;
  const r = B.duplicateDevice(d, 'designer', dev.id); assert.ok(!('why' in r)); assert.equal(live(r).length, n + 1); const dup = live(r).at(-1); assert.equal(dup.cat, dev.cat); assert.notEqual(dup.id, dev.id); assert.match(r.events[0].detail, new RegExp(`duplicate of ${dev.id}`));
  const d2 = draft(); const cam = live(d2).find((x) => B.C.categories[x.cat] && Object.entries(B.C.categories).some(([k, c]) => k !== x.cat && c.group === B.C.categories[x.cat].group));
  const other = Object.entries(B.C.categories).find(([k, c]) => k !== cam.cat && c.group === B.C.categories[cam.cat].group)[0];
  const s = B.swapDevice(d2, 'designer', cam.id, other); assert.ok(!('why' in s)); assert.ok(s.design.devices.find((x) => x.id === cam.id).removed); assert.equal(live(s).at(-1).cat, other);
  const far = Object.entries(B.C.categories).find(([, c]) => c.group !== B.C.categories[live(draft())[0].cat].group)[0];
  const no = B.swapDevice(draft(), 'designer', live(draft())[0].id, far); assert.ok('why' in no); assert.match(no.why[0], /swaps only within its group/);
});
test('a proposed connection is retired only with a reason; revisions compare by identity', () => {
  const d = draft(); const c = d.design.connections.find((x) => !x.removed); assert.ok(c, 'the template proposes connections');
  assert.ok('why' in B.removeConnection(d, 'designer', c.id, ' ')); const r = B.removeConnection(d, 'designer', c.id, 'runs through the ceiling void instead'); assert.ok(!('why' in r)); assert.ok(r.design.connections.find((x) => x.id === c.id).removed);
  const e = draft(); B.saveRevision(e, 'designer', 'first'); const dev = live(e)[0]; B.moveDevice(e, 'designer', dev.id, 0.25, 0); B.duplicateDevice(e, 'designer', dev.id); B.saveRevision(e, 'designer', 'second');
  const cmp = B.compareRevisions(e, 1, 2); assert.equal(cmp.added.length, 1); assert.equal(cmp.removed.length, 0); assert.equal(cmp.moved.length, 1); assert.match(cmp.moved[0], new RegExp(dev.id));
  const old = draft(); B.saveRevision(old, 'designer', 'a'); B.duplicateDevice(old, 'designer', live(old)[0].id); B.saveRevision(old, 'designer', 'b'); delete old.revisions[0].devices; assert.ok('why' in B.compareRevisions(old, 1, 2));
});
test('redlines: text required; an open one holds the drawing’s approval and sends an approved drawing back to review; resolving says what was done', () => {
  const d = draft(); const kind = Object.keys(d.drawings)[0];
  assert.ok('why' in B.addRedline(d, 'designer', kind, '  ')); assert.ok('why' in B.addRedline(d, 'requestor', kind, 'x'));
  d.design.classification.approved = { archetype: 'HUD', by: 'syseng' };
  const a = B.approveDrawing(d, 'syseng', kind); assert.ok(!('why' in a)); assert.equal(d.drawings[kind].state, 'APPROVED');
  B.addRedline(d, 'designer', kind, 'camera bracket on the wrong wall'); assert.equal(d.drawings[kind].state, 'REVIEW_REQUIRED'); assert.equal(d.redlines[0].id, 'RL-1'); assert.equal(d.redlines[0].state, 'OPEN');
  const held = B.approveDrawing(d, 'syseng', kind); assert.ok('why' in held); assert.match(held.why[0], /open redline/);
  assert.ok('why' in B.resolveRedline(d, 'designer', 'RL-1', '')); assert.ok(!('why' in B.resolveRedline(d, 'designer', 'RL-1', 'moved to the front wall in rev 2')));
  assert.ok('why' in B.resolveRedline(d, 'designer', 'RL-1', 'again')); assert.ok(!('why' in B.approveDrawing(d, 'syseng', kind)));
});
test('outline: corners go round once, at least 2 m², moved to the origin with the devices; confirming the scale scales both', () => {
  const d = draft(); assert.ok('why' in B.setOutline(d, 'designer', 'not numbers'));
  const bow = B.setOutline(draft(), 'designer', '0,0; 4,4; 4,0; 0,4'); assert.ok('why' in bow); assert.match(bow.why[0], /cross/);
  assert.match(B.setOutline(draft(), 'designer', '0,0; 1,0; 1,1').why[0], /2 m²/);
  const dev = live(d)[0]; const x0 = dev.x, y0 = dev.y;
  const r = B.setOutline(d, 'designer', '1,1; 7,1; 7,5; 4,5; 4,9; 1,9'); assert.ok(!('why' in r)); const g = r.design.geometry;
  assert.deepEqual(g.points[0], [0, 0]); assert.equal(g.shape, 'custom'); assert.deepEqual([g.widthM, g.lengthM], [6, 8]); assert.equal(g.provenance.outline, 'DECLARED');
  const moved = r.design.devices.find((x) => x.id === dev.id); assert.deepEqual([moved.x, moved.y], [Math.round((x0 - 1) * 100) / 100, Math.round((y0 - 1) * 100) / 100]);
  assert.ok('why' in B.confirmScale(r, 'designer', 99, '6')); assert.ok('why' in B.confirmScale(r, 'designer', 1, '60'), 'a factor of 10 is not a correction');
  const s = B.confirmScale(r, 'designer', 1, '6.6'); assert.ok(!('why' in s)); assert.deepEqual(s.design.geometry.points[1], [6.6, 0]); assert.equal(s.design.geometry.widthM, 6.6); assert.equal(s.design.geometry.provenance.scale, 'DECLARED');
});
test('commissioning deficiencies: a failed test opens one, failing again reopens it, an assigner assigns it, only a verified retest resolves it', () => {
  const d = draft(); d.design.lifecycle = 'COMMISSIONING';
  const row = B.analysis(d).applicability.rows.find((r) => r.applicable && !r.instrument); const ev = { kind: row.evidence[0], ref: 'photo 12' };
  const f1 = B.record(d, 'cxeng', row.id, { state: 'FAIL', ...ev }); assert.ok(!('why' in f1), JSON.stringify(f1.why)); assert.equal(d.issues.length, 1);
  const i = d.issues[0]; assert.equal(i.state, 'OPEN'); assert.equal(i.owner, null); assert.equal(i.key, `test-failed:${row.id}`);
  assert.ok('why' in B.assignIssue(d, 'cxeng', i.id, 'installer'), 'the commissioning engineer does not assign'); assert.ok('why' in B.assignIssue(d, 'svcmgr', i.id, 'nobody'));
  assert.ok(!('why' in B.assignIssue(d, 'svcmgr', i.id, 'installer'))); assert.equal(i.owner, 'installer');
  B.record(d, 'cxeng', row.id, { state: 'FAIL', ...ev }); assert.equal(d.issues.length, 1, 'the same failure reopens, never duplicates'); assert.equal(i.seen, 2);
  B.record(d, 'cxeng', row.id, { state: 'PASS', ...ev }); assert.equal(i.state, 'OPEN', 'an unverified pass resolves nothing');
  const v = B.verify(d, 'qa_reviewer', row.id); assert.ok(!('why' in v), JSON.stringify(v.why)); assert.equal(i.state, 'RESOLVED'); assert.match(i.resolution, /verified by/);
});
test('importing a record keeps its name, size and kind only, says what it supports and what is missing; CAD is not supported', () => {
  const d = draft(); assert.equal(B.importKind('plan.SVG'), 'plan_image'); assert.equal(B.importKind('a.dwg'), 'cad'); assert.equal(B.importKind('room.jpeg'), 'photo'); assert.equal(B.importKind('x'), 'other');
  assert.ok('why' in B.importRecord(d, 'requestor', { name: 'a.pdf', size: 10 })); assert.ok('why' in B.importRecord(d, 'designer', { name: 'big.pdf', size: 60 * 1024 * 1024 }));
  B.importRecord(d, 'designer', { name: 'level4.dwg', size: 2048 }); const r = d.imports[0]; assert.equal(r.id, 'IMP-1'); assert.match(r.support, /NOT SUPPORTED/); assert.equal(r.confidence, 'low');
  B.importRecord(d, 'designer', { name: 'plan.png', size: 2048 }); assert.equal(d.imports[1].confidence, 'scale not confirmed'); assert.ok(d.imports[1].missing.some((m) => /confirmed dimensions/.test(m)));
  B.setOutline(d, 'designer', '0,0; 6,0; 6,4; 0,4'); B.confirmScale(d, 'designer', 1, '6'); B.importRecord(d, 'designer', { name: 'plan2.png', size: 2048 }); assert.equal(d.imports[2].confidence, 'scale confirmed');
});
