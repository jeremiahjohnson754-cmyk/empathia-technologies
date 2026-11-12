#!/usr/bin/env node
// Unit tests for Scouter's standard kits (apps/demo/src/scouter/profiles.ts), restored 12 Nov 2026 from V2.5.3's v25Scout* lifecycle:
// propose from the evaluations, send, decide by another role, publish with a version, stale with a reason, adopt only when approved.
//   node --test tests/unit/scouter-profiles.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scouter-pf-'));
const src = (p) => JSON.stringify(path.join(repo, 'apps/demo/src', p));
fs.writeFileSync(path.join(tmp, 'e.ts'), `export * as PF from ${src('scouter/profiles.ts')}; export * as E from ${src('scouter/evaluate.ts')}; export * as D from ${src('scouter/data.ts')};`);
await esbuild.build({ entryPoints: [path.join(tmp, 'e.ts')], bundle: true, platform: 'node', format: 'esm', outfile: path.join(tmp, 'o.mjs'), logLevel: 'error' });
const { PF, E, D } = await import(pathToFileURL(path.join(tmp, 'o.mjs')).href);
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
const room = D.ROOMS.find((r) => r.key === 'medium_conf') || D.ROOMS[0];
const evals = E.evaluate(room.key, room, D.cats, D.required);

test('a kit is proposed from the required classes that suit the room, with the template counts and expected tests; never a make or model', () => {
  const r = PF.propose(room.key, room, evals, 'designer', 1); assert.ok(r.ok); const p = r.value;
  assert.equal(p.id, 'SP-001'); assert.equal(p.state, 'PROPOSED'); assert.ok(p.kit.length >= 1);
  for (const k of p.kit) { const e = evals.find((x) => x.key === k.key); assert.ok(e && (e.verdict === 'SUITS' || e.verdict === 'SUITS_WITH_CONDITION')); assert.ok(k.count >= 1); }
  assert.ok(p.expectedTests.length >= 1); assert.match(p.basis, /no makes or models/);
  assert.equal(PF.propose(room.key, room, evals.map((e) => ({ ...e, verdict: 'DOES_NOT_SUIT' })), 'designer', 2).ok, false);
});
test('the lifecycle: send, decide by another role only, publish with the next version, stale with a reason; adoption only when approved or published', () => {
  let p = PF.propose(room.key, room, evals, 'designer', 1).value;
  assert.equal(PF.adoptable(p).ok, false); assert.equal(PF.review(p, 'approve', 'syseng', 'x').ok, false, 'not in review yet');
  p = PF.send(p, 'designer').value; assert.equal(p.state, 'ENGINEERING_REVIEW'); assert.equal(PF.send(p, 'designer').ok, false);
  const self = PF.review(p, 'approve', 'designer', 'fine'); assert.equal(self.ok, false); assert.match(self.why, /cannot decide/);
  assert.equal(PF.review(p, 'reject', 'syseng', '  ').ok, false, 'a rejection says why');
  const ap = PF.review(p, 'approve', 'syseng', 'conditions handled at design'); assert.ok(ap.ok); p = ap.value; assert.equal(p.state, 'APPROVED'); assert.ok(PF.adoptable(p).ok);
  const prev = { ...p, id: 'SP-000', version: 2, state: 'STALE' };
  p = PF.publish(p, 'syseng', [prev, p]).value; assert.equal(p.version, 3); assert.equal(p.state, 'PUBLISHED');
  assert.equal(PF.stale(p, 'syseng', '').ok, false); p = PF.stale(p, 'syseng', 'the catalogue class changed').value; assert.equal(p.state, 'STALE'); assert.equal(PF.adoptable(p).ok, false);
  assert.deepEqual(p.history.map((h) => h.to), ['PROPOSED', 'ENGINEERING_REVIEW', 'APPROVED', 'PUBLISHED', 'STALE']);
});
test('a kit with conditions cannot be approved without saying how they are handled', () => {
  const p0 = PF.propose(room.key, room, evals, 'designer', 1).value; const p = PF.send({ ...p0, kit: [{ ...p0.kit[0], condition: 'needs a second display' }] }, 'designer').value;
  assert.deepEqual(PF.problems(p).length, 1); assert.equal(PF.review(p, 'approve', 'syseng', '').ok, false); assert.ok(PF.review(p, 'approve', 'syseng', 'second display in the design').ok);
});
