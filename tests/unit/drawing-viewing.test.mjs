#!/usr/bin/env node
// Display viewing analysis from a drawing (apps/demo/src/drawing/viewing.ts, 70/10 task 70-2): the arithmetic is reproducible, the rule
// is the campus standard ST-VID-02 (farthest ÷ image height ≤ 6), every input says how it is known, and nothing is selected.
//   node --test tests/unit/drawing-viewing.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dr-view-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as V from './apps/demo/src/drawing/viewing.ts';`, resolveDir: repo, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const { V } = await import(pathToFileURL(out).href);
process.on('exit', () => fs.rmSync(path.dirname(out), { recursive: true, force: true }));

test('a 16:9 image: height and width by hand', () => {
  const { h, w } = V.imageOf(98); assert.ok(Math.abs(h - 98 * 0.0254 * 9 / Math.sqrt(337)) < 1e-12); assert.ok(Math.abs(h - 1.22) < 0.01); assert.ok(Math.abs(w - 2.17) < 0.01);
});
test('a 10 × 14 m room, display centred on the front wall: the farthest viewer and the sizes compared, the smallest that works recommended', () => {
  const v = V.viewing({ width: 10, length: 14, cls: 'OBSERVED' }, null);
  const far = Math.hypot(5 - 0.6, 14 - 0.6); assert.equal(v.far, Math.round(far * 100) / 100);
  for (const r of v.rows) { assert.equal(r.ratio, Math.round((v.far / V.imageOf(r.inches).h) * 100) / 100); assert.equal(r.meets, r.ratio <= 6); }
  const first = v.rows.find((r) => r.meets && r.fits); assert.equal(v.recommend, first ? first.inches : null);
  assert.equal(v.facts.find((f) => f.label === 'Room').prov, 'measured', 'a person calibrated the scale'); assert.equal(v.facts.find((f) => f.label === 'Display wall').prov, 'assumed');
  assert.equal(v.facts.find((f) => /Eye height/.test(f.label)).prov, 'unavailable'); assert.ok(v.method.some((m) => /Not the AVIXA DISCAS method/.test(m)));
  assert.match(v.recommendation, /nothing is selected or bought|None of these sizes|second display/);
});
test('a long narrow room where nothing fits, and a small room where 75" already works', () => {
  const big = V.viewing({ width: 4, length: 30, cls: 'MODELED' }, null); assert.equal(big.recommend, null); assert.match(big.recommendation, /None of these sizes|wider than the wall/); assert.equal(big.facts[0].prov, 'modeled');
  const small = V.viewing({ width: 5, length: 5, cls: 'MODELED' }, { x: 2.5, y: 0.1 }); assert.equal(small.recommend, 75); assert.equal(small.facts.find((f) => f.label === 'Display wall').prov, 'modeled');
  assert.equal(V.viewing({ width: 0.5, length: 9, cls: 'MODELED' }, null), null);
});
