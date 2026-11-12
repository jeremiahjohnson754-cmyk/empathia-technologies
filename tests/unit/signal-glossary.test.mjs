// SIGNAL glossary terms in the story (apps/demo/src/signal/glossary.ts) against the reference ladder.js GL_RX / glMark / wrapFirst.
// Restored 12 Nov 2026.   node --test tests/unit/signal-glossary.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'signal-gl-')), 'g.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'apps/demo/src/signal/glossary.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const G = await import(pathToFileURL(out).href);
const data = (f) => JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data', f), 'utf8'));
const app = data('app-data.json'); const R = G.buildRx(app.glossary);
const T = (term, marks) => ({ id: term, term, d: '', dom: '', f: [], first: null, marks });
test('GL-01 the first use is marked, once per chapter; longest mark wins; word boundaries hold (a hyphen is part of a word)', () => {
  const r = G.buildRx([T('Gain', [['gain', false]]), T('Gain staging', [['gain staging', false]]), T('DMX', [['DMX', true]])]); const used = new Set();
  const a = G.markRun('Check the gain staging, then the gain, then DMX and dmx and pre-gain.', r, used);
  assert.deepEqual(a.filter((x) => x.g).map((x) => [x.t, x.g.term]), [['gain staging', 'Gain staging'], ['gain', 'Gain'], ['DMX', 'DMX']]);
  assert.equal(a.map((x) => x.t).join(''), 'Check the gain staging, then the gain, then DMX and dmx and pre-gain.');
  assert.deepEqual(G.markRun('More gain.', r, used), [{ t: 'More gain.' }]);   // already used in this chapter
});
test('GL-02 emphasis is kept around a marked term; runs of two characters or fewer are not searched', () => {
  const r = G.buildRx([T('Comb filtering', [['comb filtering', false]])]);
  const s = G.markText('It is **comb filtering** again.', r, new Set());
  assert.deepEqual(s.map((x) => [x.t, !!x.b, x.g?.term || null]), [['It is ', false, null], ['comb filtering', true, 'Comb filtering'], [' again.', false, null]]);
});
test('GL-03 a real chapter: each term marked at most once, the text unchanged, and each chapter’s reading text carries marks (460 marks across the whole story’s reading text)', () => {
  let total = 0;
  for (const id of ['s01e00', 's01e01', 's06e03']) { const items = data(`story/${id}.json`).items; const M = G.chapterMarks(items, R); const terms = [];
    for (const [k, segs] of M) { const [n] = k.split(':'); const src = G.readingText(items[Number(n)], Number(n)).find((x) => x[0] === k)[1];
      assert.equal(segs.map((x) => x.t).join(''), src.replace(/\*\*([^*]+)\*\*|\*([^*]+)\*/g, '$1$2'), k); for (const x of segs) if (x.g) terms.push(x.g.term); }
    assert.equal(new Set(terms).size, terms.length, `${id}: a term marked twice`); assert.ok(terms.length >= 1, `${id}: ${terms.length}`); total += terms.length; }
  assert.ok(total >= 8, String(total));
});
test('GL-04 terms you’ll need (glNeeds): the text’s terms, then the formula’s, five for a beginner and seven otherwise', () => {
  const terms = Array.from({ length: 9 }, (_, i) => ({ ...T(`T${i}`, [[`term${i}`, false]]), f: i === 8 ? ['ohm'] : [] }));
  const r = G.buildRx(terms); const text = 'term0 term1 term2 term3 term4 term5 term6 term0';
  assert.deepEqual(G.termsIn(text, r).map((g) => g.term), ['T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6']);
  assert.equal(G.needs(text, ['ohm'], 1, terms, r).length, 5); assert.deepEqual(G.needs('term0', ['ohm'], 2, terms, r).map((g) => g.term), ['T0', 'T8']);
});
