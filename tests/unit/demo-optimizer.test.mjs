// The Space Optimizer engine (v1.8.1 §11) as pure functions: nine dimensions, three options, one engine for every world, stated rules,
// scores that move the way the rule says they must, and nothing presented as measured.
//   node --test tests/unit/demo-optimizer.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-optimizer-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as O from './optimizer/engine.ts'; export * as M from './estate/index.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const { O, M } = await import(pathToFileURL(out).href);
const node = (w, id) => M.ESTATES[w].nodes.find((n) => n.id === id);
const room = (dims, capacity, extra = {}) => ({ id: 'T', dims, capacity, type: 'classroom', layout: 'Rows of movable tables', stepFree: true, ...extra });
const sc = (s, d) => O.scoreOf(s, d);

test('SO-01 nine dimensions, in the directive’s order, each with a label and a stated rule', () => {
  assert.deepEqual([...O.DIMENSIONS], ['video', 'sightlines', 'capture', 'reproduction', 'efficiency', 'accessibility', 'infrastructure', 'supportability', 'purpose']);
  assert.deepEqual(O.DIMENSIONS.map((d) => O.DIMENSION_LABEL[d]), ['Video coverage', 'Sightlines', 'Audio capture', 'Audio reproduction', 'Spatial efficiency', 'Accessibility', 'Infrastructure fit', 'Supportability', 'Purpose fit']);
  for (const d of O.DIMENSIONS) assert.ok(O.RULE_TEXT[d].length > 30, d);
});
test('SO-02 exactly three options, A, B and C, each with a summary and a trade-off', () => {
  assert.deepEqual(O.OPTIONS.map((o) => o.key), ['A', 'B', 'C']); for (const o of O.OPTIONS) assert.ok(o.summary.length > 20 && o.tradeoff.length > 20);
});
test('SO-03 every study scores all nine dimensions between 0 and 100, marked MODELED, with a reason in words', () => {
  for (const e of Object.values(M.ESTATES)) for (const n of e.nodes.filter(O.studiable)) for (const s of O.compare(n).studies) {
    assert.equal(s.scores.length, 9, n.id); for (const x of s.scores) { assert.ok(Number.isInteger(x.score) && x.score >= 0 && x.score <= 100, `${n.id} ${s.option.key} ${x.dimension} ${x.score}`); assert.equal(x.basis, 'MODELED'); assert.ok(x.detail.length > 5); } }
});
test('SO-04 one engine serves every world: a saved study exists and resolves in each seeded world', () => {
  assert.deepEqual(Object.keys(O.SAVED).sort(), ['convention', 'stadium', 'university']);
  for (const [w, id] of Object.entries(O.SAVED)) { const n = node(w, id); assert.ok(n && O.studiable(n), id); assert.equal(O.compare(n).studies.length, 3); }
});
test('SO-05 the study is deterministic: the same room gives the same layout and scores every time', () => {
  const n = node('university', 'UNI-ENG-110'); assert.deepEqual(O.compare(n).studies.map((s) => s.scores), O.compare(n).studies.map((s) => s.scores)); assert.deepEqual(O.layoutFor(n, O.OPTIONS[2]), O.layoutFor(n, O.OPTIONS[2]));
});
test('SO-06 sightlines follow the rule: a deeper room with the same ceiling loses the back rows on one screen, and repeaters win them back', () => {
  const shallow = O.study(room([9, 8, 3], 30), O.OPTIONS[0]); const deep = O.study(room([18, 8, 3], 60), O.OPTIONS[0]); const deepC = O.study(room([18, 8, 3], 60), O.OPTIONS[2]);
  assert.ok(sc(deep, 'sightlines') < sc(shallow, 'sightlines'), `${sc(deep, 'sightlines')} < ${sc(shallow, 'sightlines')}`); assert.ok(sc(deepC, 'sightlines') > sc(deep, 'sightlines'));
});
test('SO-07 audio capture follows the rule: one front microphone reaches few seats; ceiling microphones reach nearly all', () => {
  const r = room([12, 9, 3], 40); assert.ok(sc(O.study(r, O.OPTIONS[0]), 'capture') < 40); assert.ok(sc(O.study(r, O.OPTIONS[1]), 'capture') >= 85);
});
test('SO-08 more overhead equipment never scores as easier to support', () => {
  for (const e of Object.values(M.ESTATES)) for (const n of e.nodes.filter(O.studiable)) { const [a, , c] = O.compare(n).studies; assert.ok(sc(a, 'supportability') >= sc(c, 'supportability'), n.id); assert.ok(c.layout.counts.overhead > a.layout.counts.overhead, n.id); }
});
test('SO-09 accessibility: a room with steps cannot score full marks, and wheelchair positions must see and hear to count', () => {
  const stepped = O.study(room([12, 9, 3], 40, { stepFree: false }), O.OPTIONS[2]); assert.ok(sc(stepped, 'accessibility') < 100); assert.match(stepped.scores.find((x) => x.dimension === 'accessibility').detail, /step-free entry/);
  const ok = O.study(room([12, 9, 3], 40), O.OPTIONS[2]); assert.ok(ok.layout.seats.filter((s) => s.wheelchair).length >= 2);
});
test('SO-10 seats never leave the room, never overlap, and never exceed the seats asked for', () => {
  for (const e of Object.values(M.ESTATES)) for (const n of e.nodes.filter(O.studiable)) for (const o of O.OPTIONS) { const L = O.layoutFor(n, o); const fixed = L.seats.filter((s) => !s.wheelchair);
    assert.ok(fixed.length <= n.capacity, n.id); for (const s of L.seats) assert.ok(s.x >= 0 && s.x <= L.width && s.y >= 0 && s.y <= L.depth, `${n.id} ${o.key} ${s.x},${s.y} in ${L.width}×${L.depth}`);
    assert.equal(new Set(fixed.map((s) => `${s.x},${s.y}`)).size, fixed.length, `${n.id} ${o.key}`); }
});
test('SO-11 purpose fit is the weighted sum of the other eight, and the weights of each room kind sum to 1', () => {
  for (const k of ['rows', 'theatre', 'groups', 'tables']) assert.ok(Math.abs(Object.values(O.weightsFor(k)).reduce((a, b) => a + b, 0) - 1) < 1e-9, k);
  const n = node('convention', 'CNV-SR-05'); const s = O.study(n, O.OPTIONS[1]); const w = O.weightsFor(O.seatingOf(n)); assert.equal(sc(s, 'purpose'), Math.round(s.scores.slice(0, 8).reduce((t, x) => t + x.score * w[x.dimension], 0)));
});
test('SO-12 when options are within three points the easier one to support is preferred, and the close ones are named', () => {
  for (const e of Object.values(M.ESTATES)) for (const n of e.nodes.filter(O.studiable)) { const c = O.compare(n); assert.ok(c.close.includes(c.best)); assert.ok(c.top - sc(c.best, 'purpose') <= O.CLOSE, n.id); for (const s of c.close) assert.ok(sc(c.best, 'supportability') >= sc(s, 'supportability'), n.id); }
});
test('SO-13 efficiency reports seats that do not fit rather than hiding them', () => {
  const s = O.study(room([6, 5, 3], 60), O.OPTIONS[0]); assert.ok(sc(s, 'efficiency') < 60); assert.match(s.scores.find((x) => x.dimension === 'efficiency').detail, /of 60 seats fit/);
});
test('SO-14 no make, no standard body and no claim of measurement appears in any rule or result', () => {
  const text = JSON.stringify([O.RULE_TEXT, O.OPTIONS, O.compare(node('stadium', 'STA-PCR')).studies.map((s) => s.scores)]);
  assert.ok(!/avixa|infocomm|measured|certified|compliant|guarantee/i.test(text));
});
