#!/usr/bin/env node
// Unit tests for Design a Space's concept helpers (apps/demo/src/parity/Studio.tsx), restored 12 Nov 2026 from V2.5.3's studio:
// fixes that change the concept, the commissioning rehearsal, object identity across versions, and the import guard.
//   node --test tests/unit/studio-concept.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-concept-'));
await esbuild.build({ entryPoints: [path.join(repo, 'apps/demo/src/parity/Studio.tsx')], bundle: true, platform: 'node', format: 'esm', outfile: path.join(tmp, 'out.mjs'), logLevel: 'error', jsx: 'automatic', loader: { '.css': 'empty', '.json': 'json' } });
const S = await import(pathToFileURL(path.join(tmp, 'out.mjs')).href);
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
const base = { v: 1, id: 'C-x', name: 'Test', from: 'empty', w: 8, l: 6, h: 2.8, seats: 10, items: [] };

test('every failing planning rule carries a fix that makes it pass; a passing rule carries none', () => {
  let c = base; for (let i = 0; i < 4; i++) { const f = S.judge(c).find((v) => v.ok === false && v.fix); if (!f) break; c = f.fix.apply(c); }
  const v = S.judge(c); assert.ok(v.every((x) => x.ok !== false), JSON.stringify(v.map((x) => [x.rule, x.ok])));
  assert.ok(v.every((x) => x.ok === false || !x.fix)); assert.ok(c.items.some((i) => i.k === 'display') && c.items.some((i) => i.k === 'camera') && c.items.some((i) => i.k === 'micceil'));
  const cramped = S.judge({ ...base, seats: 40 }).find((x) => x.rule === 'Space per seat'); assert.equal(cramped.ok, false); assert.equal(cramped.fix.apply({ ...base, seats: 40 }).seats, 26);
});
test('the rehearsal lists the tests the objects need, and only those', () => {
  const none = S.rehearsal(base); assert.ok(!none.some((t) => /STIPA|Framing|brightness|level map/.test(t))); assert.ok(none.some((t) => /Reverberation/.test(t)));
  const full = S.rehearsal({ ...base, items: [{ k: 'micceil', x: 1, y: 1 }, { k: 'camera', x: 1, y: 1 }, { k: 'display', x: 1, y: 1 }, { k: 'speaker', x: 1, y: 1 }] });
  for (const rx of [/STIPA/, /Echo-canceller/, /level map/, /Framing check per preset \(1 camera\)/, /brightness/, /Sightline/]) assert.ok(full.some((t) => rx.test(t)), String(rx));
});
test('ids are stable and unique; the diff counts moved, added and removed by identity', () => {
  const a = S.withIds([{ k: 'camera', x: 1, y: 1 }, { k: 'display', x: 4, y: 0.15 }]); assert.deepEqual(a.map((i) => i.id), ['o1', 'o2']);
  const b = S.withIds([{ ...a[0], x: 1.5 }, { k: 'micceil', x: 3, y: 3 }]); assert.equal(b[1].id, 'o2', 'with the highest id gone, the next number follows the highest kept');
  const c = S.withIds([...a.map((i, n) => (n === 0 ? { ...i, x: 1.5 } : i)), { k: 'micceil', x: 3, y: 3 }]); assert.equal(c[2].id, 'o3');
  assert.deepEqual(S.diffItems(a, [c[0], c[2]]), { moved: 1, added: 1, removed: 1 }); assert.deepEqual(S.diffItems(a, a), { moved: 0, added: 0, removed: 0 });
  assert.equal(S.diffItems([{ ...a[0] }], [{ ...a[0], rot: 15 }]).moved, 1, 'aiming a camera counts as a change');
});
test('import: a concept round-trips; anything malformed, oversized or of an unknown kind is refused; numbers are clamped', () => {
  const c = { ...base, items: S.withIds([{ k: 'camera', x: 2, y: 0.35, rot: 15 }]) };
  const r = S.readConcept(JSON.stringify(c)); assert.equal(r.items.length, 1); assert.equal(r.items[0].rot, 15); assert.match(r.id, /^S-/);
  for (const bad of ['not json', '{}', JSON.stringify({ ...c, v: 2 }), JSON.stringify({ ...c, items: [{ k: 'rocket', x: 1, y: 1 }] }), JSON.stringify({ ...c, items: [{ k: 'camera', x: 'a', y: 1 }] }), JSON.stringify({ ...c, items: Array.from({ length: 201 }, () => ({ k: 'seat', x: 1, y: 1 })) }), JSON.stringify({ ...c, w: null })]) assert.equal(S.readConcept(bad), null, bad.slice(0, 40));
  const big = S.readConcept(JSON.stringify({ ...c, w: 999, seats: 1e6, items: [{ k: 'camera', x: 500, y: -3 }] })); assert.equal(big.w, 40); assert.equal(big.seats, 400); assert.deepEqual([big.items[0].x, big.items[0].y], [40, 0]);
});
