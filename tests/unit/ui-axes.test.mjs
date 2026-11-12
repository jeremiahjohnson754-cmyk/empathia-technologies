#!/usr/bin/env node
// The five axes of the Experience Language (packages/ui/src/Axes.tsx, 60/10 P1): every value says its axis and its value in words,
// each axis has its own shape (class), and confidence never shows a number the caller did not give.
//   node --test tests/unit/ui-axes.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ui-axes-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as A from './packages/ui/src/Axes.tsx'; export { createElement as h } from 'react'; export { renderToStaticMarkup as render } from 'react-dom/server';`, resolveDir: repo, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" } });
const { A, h, render } = await import(pathToFileURL(out).href);
process.on('exit', () => fs.rmSync(path.dirname(out), { recursive: true, force: true }));
const text = (html) => html.replace(/<[^>]+>/g, '');

test('every value of every axis says its axis and its value in words', () => {
  for (const v of A.AXES.conditions) { const t = text(render(h(A.ConditionChip, { value: v }))); assert.match(t, /^Condition: /); assert.match(t.toLowerCase(), new RegExp(v)); }
  for (const v of A.AXES.provenances) { const t = text(render(h(A.ProvenanceChip, { value: v }))); assert.match(t, /^Provenance: /); assert.match(t.toLowerCase(), new RegExp(v)); }
  for (const v of A.AXES.workflows) { const t = text(render(h(A.WorkflowChip, { value: v }))); assert.match(t, /^Workflow: /); assert.match(t.toLowerCase(), new RegExp(v)); }
  for (const v of A.AXES.maturities) { const t = text(render(h(A.MaturityChip, { value: v }))); assert.match(t, /^Maturity: /); assert.match(t.toLowerCase(), new RegExp(v)); }
});
test('each axis has its own shape, so a simulated reading and a simulated capability are not the same chip', () => {
  const p = render(h(A.ProvenanceChip, { value: 'simulated' })), m = render(h(A.MaturityChip, { value: 'simulated' })), c = render(h(A.ConditionChip, { value: 'nominal' }));
  assert.match(p, /class="ax ax--prov /); assert.match(m, /class="ax ax--mat /); assert.match(c, /class="ax ax--cond /); assert.notEqual(text(p), text(m));
  assert.match(p, /data-axis="Provenance"/); assert.match(m, /data-axis="Maturity"/);
});
test('confidence shows the method and only the bounds it is given; no invented percentage', () => {
  const t = text(render(h(A.ConfidenceChip, { method: 'Class template radius' }))); assert.equal(t, 'Confidence: Class template radius'); assert.ok(!/%|\d/.test(t));
  assert.match(text(render(h(A.ConfidenceChip, { method: 'Calibrated meter', bounds: '±0.7 dB' }))), /±0\.7 dB/);
});
