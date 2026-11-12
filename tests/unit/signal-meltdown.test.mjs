// SIGNAL meltdowns (packages/ui/src/meltdown.ts) against the founder's build package: docs/04-engine-specs.md §9, the reference runtime
// meltdown.js, and its QA runs (tests/fixtures/signal-meltdown-runs.json, from tools/meltdowntest.py): the expert run ends proven with
// grade S, a boundary action ends the mission, doing nothing fails it. Restored 11 Nov 2026.   node --test tests/unit/signal-meltdown.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'signal-md-')), 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'packages/ui/src/meltdown.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const MD = await import(pathToFileURL(out).href);
const app = JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data/app-data.json'), 'utf8'));
const RUNS = JSON.parse(fs.readFileSync(path.join(repo, 'tests/fixtures/signal-meltdown-runs.json'), 'utf8')).meltdowns;
const LIMITED = () => true;   // the loadout of an untouched record is "limited" throughout (ratings 72); the reference QA ran with that record
const byLabel = (M, S, start) => MD.visible(M, S).find((a) => a.label.startsWith(start) && MD.available(a, S, LIMITED));
function expertRun(M) {
  const R = RUNS[M.id]; let S = MD.begin(M, R.year || [], LIMITED); const done = new Set();
  for (let guard = 0; !S.over && guard < 400; guard += 1) {
    let moved = false;
    for (const e of R.expert) { if (done.has(e.label)) continue; const a = byLabel(M, S, e.label); if (!a) continue;
      S = a.calc ? MD.answerCalc(M, S, a, Number(e.answer), LIMITED).state : MD.act(M, S, a, LIMITED); done.add(e.label); moved = true; break; }
    if (!moved) S = MD.hold(M, S, 30);
  }
  return { S, moves: done.size };
}

test('MD-01 the five meltdowns: the package’s expert run ends contained and proven, with grade S, using every expert move', () => {
  assert.deepEqual(app.meltdownOrder.slice().sort(), Object.keys(RUNS).sort());
  for (const id of app.meltdownOrder) { const M = { ...app.meltdowns[id], id }; const { S, moves } = expertRun(M);
    assert.ok(S.over, `${id} ended`); assert.equal(S.end.outcome, 'proven', `${id}: ${S.end.head} — ${S.end.text}`); assert.equal(S.end.grade, 'S', `${id} grade ${S.end.grade} (${Math.round(S.end.score)})`); assert.equal(moves, RUNS[id].expert.length, `${id} moves`); }
});

test('MD-02 a boundary action ends the mission at once; doing nothing (holding two minutes at a time) loses it', () => {
  for (const id of app.meltdownOrder) { const M = { ...app.meltdowns[id], id }; const R = RUNS[id];
    let S = MD.begin(M, R.year ? [] : [], LIMITED); const b = MD.visible(M, S).find((a) => a.label.startsWith(R.boundary)); assert.ok(b, `${id}: boundary action “${R.boundary}”`);
    let t = S; for (let i = 0; i < 20 && !MD.available(b, t, LIMITED); i += 1) t = MD.hold(M, t, 30);
    const e = MD.act(M, t, b, LIMITED); assert.equal(e.end?.outcome, 'fail', id); assert.equal(e.end.why, 'boundary'); assert.equal(MD.recordMeltdown(undefined, e).firstWhy, 'boundary');
    for (let i = 0; i < 200 && !S.over; i += 1) S = MD.hold(M, S, 120); assert.equal(S.end.outcome, 'fail', `${id} idle: ${S.end.head}`); }
});

test('MD-03 the cascade: inputs are AND of OR-groups; pressure past the grace degrades, past twice it downs; a fix lets it recover; critical dark time accrues', () => {
  const M = { id: 'X', title: 'x', season: 1, chapter: 'x', brief: '', budget: 500, rate: 1, trust: { A: 3 }, events: [], actions: [{ id: 'fix', label: 'Fix A', cost: 0, text: 'fixed', fix: ['A'] }, { id: 'iso', label: 'Isolate C', cost: 0, text: 'isolated', isolate: ['C'] }], objectives: [], win: { proven: [] }, expert: [],
    nodes: [{ id: 'A', label: 'A', col: 0, row: 0, deps: [], start: 'down' }, { id: 'B', label: 'B', col: 0, row: 1, deps: [], start: 'ok' }, { id: 'C', label: 'C', col: 1, row: 0, deps: [['A', 'B']], start: 'ok', grace: 5 }, { id: 'D', label: 'D', col: 2, row: 0, deps: [['A'], ['B']], start: 'ok', grace: 5, crit: true, maxDown: 100 }] };
  let S = MD.advance(M, MD.begin(M), 6); assert.equal(S.n.C.state, 'ok', 'B carries C: one of the OR-group is enough'); assert.equal(S.n.D.state, 'degraded', 'D needs A AND B: after its grace it degrades');
  S = MD.advance(M, S, 5); assert.equal(S.n.D.state, 'down'); assert.ok(S.chain.some((c) => c.node === 'D' && c.to === 'down' && /A/.test(c.from)), 'the cascade names its culprit'); const dark = S.dark.D;
  S = MD.act(M, S, M.actions[0]); S = MD.advance(M, S, 3); assert.notEqual(S.n.D.state, 'down', 'a fix upstream lets it recover'); assert.ok(S.dark.D > dark); assert.equal(MD.act(M, S, M.actions[1]).n.C.state, 'ok', 'state shows on the next second');
  assert.equal(MD.advance(M, MD.act(M, S, M.actions[1]), 1).n.C.state, 'contained');
});

test('MD-04 the record keeps the best outcome and grade, the first outcome, grade and why; the clock reads in story time', () => {
  const M = { ...app.meltdowns['MD-S04'], id: 'MD-S04' }; const win = expertRun(M).S; const lose = (() => { let S = MD.begin(M); for (let i = 0; i < 200 && !S.over; i += 1) S = MD.hold(M, S, 120); return S; })();
  let r = MD.recordMeltdown(undefined, lose); r = MD.recordMeltdown(r, win); r = MD.recordMeltdown(r, lose);
  assert.deepEqual([r.best, r.grade, r.runs, r.last, r.first, r.firstWhy], ['proven', 'S', 3, 'fail', 'fail', 'mission']); assert.equal(MD.clockAt(M, 0), '23:38:00'); assert.equal(MD.clockAt(M, 82), '23:39:22');
});

test('MD-05 the remaining rules: degraded counts half and isolated in full toward dark time; a missed critical objective ends the mission; a refusal is counted; an unmet need un-uses the action and costs a third; an actor missing what it needs fails', () => {
  const base = { id: 'Y', title: 'y', season: 1, chapter: 'y', brief: '', budget: 400, rate: 1, trust: { A: 3 }, events: [], win: { proven: [] }, expert: [], objectives: [],
    nodes: [{ id: 'P', label: 'P', col: 0, row: 0, deps: [], start: 'ok' }, { id: 'K', label: 'K', col: 1, row: 0, deps: [['P']], start: 'ok', grace: 2, crit: true, maxDown: 300 }],
    actions: [{ id: 'cut', label: 'Cut P', cost: 0, text: 'cut', brk: { P: 'degraded' } }, { id: 'iso', label: 'Isolate K', cost: 0, text: 'isolated', isolate: ['K'] }, { id: 'no', label: 'Touch the panel', cost: 9, text: '', stop: 'Not yours.' },
      { id: 'need', label: 'Switch over', cost: 9, text: 'switched', need: { P: 'down' } }] };
  let S = MD.act(base, MD.begin(base), base.actions[0]); S = MD.advance(base, S, 10); assert.equal(S.n.K.state, 'degraded'); const d1 = S.dark.K; S = MD.advance(base, S, 4); assert.equal(S.dark.K - d1, 2, 'four degraded seconds count two');
  S = MD.act(base, S, base.actions[1]); const d2 = S.dark.K; S = MD.advance(base, S, 3); assert.equal(S.dark.K - d2, 3, 'isolated counts in full');
  const r = MD.act(base, MD.begin(base), base.actions[2]); assert.equal(r.stops, 1); assert.equal(r.t, 9); assert.equal(MD.endNow(base, r).end.score < MD.endNow(base, MD.begin(base)).end.score, true, 'a refusal costs five points');
  const n = MD.act(base, MD.begin(base), base.actions[3]); assert.equal(n.used.need, undefined, 'an unmet need leaves the action open'); assert.equal(n.t, 3, 'and costs a third of its time'); assert.ok(n.log.some((l) => /isn’t DOWN/.test(l.text)));
  const O = { ...base, objectives: [{ id: 'o', label: 'Send the alert', at: 2, by: 5, flag: 'sent', crit: true }] }; const o = MD.advance(O, MD.begin(O), 10); assert.equal(o.end.why, 'mission'); assert.match(o.end.text, /Missed a mission-critical objective: Send the alert/);
  const A = { ...base, actors: [{ who: 'Kit', text: 'restores P', onFlag: 'go', need: ['trained'], fix: ['P'], fail: { trained: 'Kit was never trained on it.' } }], actions: [...base.actions, { id: 'go', label: 'Go', cost: 0, text: 'go', set: ['go'] }] };
  const a = MD.advance(A, MD.act(A, MD.begin(A), A.actions[4]), 2); assert.ok(a.log.some((l) => /Kit: Kit was never trained on it\./.test(l.text))); assert.equal(a.saves, 0);
});
