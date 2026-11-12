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
