// SIGNAL's field calculator (packages/ui/src/fieldcalc.ts), restored 18 Nov 2026 from the standalone's calcEval and helpers.
//   FC-01  arithmetic, precedence, right-associative powers, unary minus, the reference's symbols (× ÷ − π) and functions (degrees for trig)
//   FC-02  the reference's error words: missing ), unknown name, a function without ( ), unexpected input, not a finite number
//   FC-03  the fourteen helpers, in the reference's order, give hand-worked answers; an empty box says "fill every box"
//   FC-04  no eval: an expression with code in it is refused, not run
//   node --test tests/unit/field-calc.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fcalc-')), 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'packages/ui/src/fieldcalc.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const C = await import(pathToFileURL(out).href);

test('FC-01 arithmetic', () => {
  assert.equal(C.calcEval('2+3*4'), 14); assert.equal(C.calcEval('(2+3)*4'), 20); assert.equal(C.calcEval('2^3^2'), 512); assert.equal(C.calcEval('-2^2'), 4);   // the reference binds unary minus tighter than ^: (−2)² (kept as the reference has it)
  assert.equal(C.calcEval('6÷3×2−1'), 3); assert.ok(Math.abs(C.calcEval('π') - Math.PI) < 1e-12); assert.equal(C.calcEval('sqrt(16)+log(1000)'), 7);
  assert.ok(Math.abs(C.calcEval('sin(30)') - 0.5) < 1e-12); assert.ok(Math.abs(C.calcEval('ln(e)') - 1) < 1e-12); assert.equal(C.calcEval('abs(-3)'), 3); assert.equal(C.calcEval('1.5e3'), 1500);
  assert.deepEqual(C.calcRun('1.7/343*1000'), { ok: true, text: '4.956268' });
});
test('FC-02 the reference’s error words', () => {
  assert.equal(C.calcRun('(1+2').text, '⚠ missing )'); assert.equal(C.calcRun('foo(2)').text, '⚠ unknown foo'); assert.equal(C.calcRun('sqrt 4').text, '⚠ sqrt needs ( )');
  assert.equal(C.calcRun('2+').text, '⚠ unexpected "end"'); assert.equal(C.calcRun('1/0').text, '⚠ not a finite number'); assert.equal(C.calcRun('3)4').text, '⚠ unexpected ")"'); assert.equal(C.calcRun('3 4').text, '34');   // spaces are removed before reading, as in the reference
});
test('FC-03 the helpers', () => {
  assert.equal(C.HELPERS.length, 14); assert.equal(C.HELPERS[0].label, 'dB → ratio (V/pressure)'); assert.equal(C.HELPERS[13].label, 'field width 2·d·tan(θ/2)');
  const h = (label, ...v) => C.helperRun(C.HELPERS.find((x) => x.label === label), v.map(String));
  assert.equal(h('dB → ratio (V/pressure)', 6), '1.9953 ×'); assert.equal(h('power ratio → dB', 2), '3.0103 dB'); assert.equal(h('distance → delay', 34.3), '100 ms');
  assert.equal(h('usable hosts in /n', 24), '254 hosts'); assert.equal(h('current I = P / V', 1800, 120), '15 A'); assert.equal(h('wavelength', 343), '1 m');
  assert.equal(h('inverse square Δ', 1, 2), '-6.0206 dB'); assert.equal(h('3rd-order IM 2a − b', 500, 501), '499 MHz'); assert.equal(h('FFT bin → Hz', 10, 48000, 4096), '117.1875 Hz');
  assert.equal(C.helperRun(C.HELPERS[0], ['']), 'fill every box');
});
test('FC-04 no eval', () => {
  globalThis.__pwned = false; const r = C.calcRun('globalThis.__pwned=true'); assert.equal(r.ok, false); assert.equal(globalThis.__pwned, false);
  assert.equal(C.calcRun('alert(1)').text, '⚠ unknown alert');
});
