// SIGNAL challenges (packages/ui/src/challenges/*.ts) against the founder's build package: docs/04-engine-specs.md §13, the reference
// runtime chal_*.js and its QA (qa/chaltest.log via tools/chaltest.py): at every level the untouched start fails exactly as the
// reference's does, and the recipe a working engineer would dial in passes 100/100 ★★★. Restored 12 Nov 2026.
//   node --test tests/unit/signal-challenges.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'signal-ch-')), 'c.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'packages/ui/src/challenges/index.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const C = await import(pathToFileURL(out).href);
import { recipes } from '../fixtures/signal-challenge-recipes.mjs';
const LOG = JSON.parse(fs.readFileSync(path.join(repo, 'tests/fixtures/signal-challenge-log.json'), 'utf8'));
const run = (id, lv, patch) => { const ch = C.byId(id); const s = { ...ch.init(lv), ...(patch ? patch(lv, ch.init(lv)) : {}) }; return C.headline(ch.evaluate(s, lv)); };

const RECIPES = recipes(C);
for (const id of Object.keys(RECIPES)) for (const lv of [1, 2, 3, 4]) {
  test(`${id} L${lv}: the start fails as the reference's does`, () => assert.equal(run(id, lv), LOG[`${id} L${lv} start`]));
  test(`${id} L${lv}: the recipe passes`, () => assert.equal(run(id, lv, RECIPES[id]), LOG[`${id} L${lv} recipe`]));
}

for (const [lv, label, fx] of [[1, 'A lava lamp', 'lava'], [1, 'UV blacklight bar', 'uv']]) test(`reach-light L${lv} joke: ${label}`, () => assert.equal(run('reach-light', lv, () => ({ fx })), LOG[`reach-light L${lv} joke: ${label}`]));

// reach-cues is live: the reference QA fired each cue's key 0.02 s after it (on the beat) and, badly, key 5 every time 0.45 s late.
const CUE_KEYS = { 1: [3, 1, 5, 3, 8, 7], 2: [3, 1, 4, 5, 8, 3, 5, 7], 3: [2, 1, 4, 5, 8, 3, 8, 5, 7], 4: [2, 1, 4, 5, 8, 3, 8, 5, 7] };
function playCues(lv, keyOf, late) {
  const R = C.Reach, S = R.song(lv), W = R.windows(1); let r = R.cueStart(S), t = 0, i = 0;
  for (; t <= S.len; t += 1 / 60) { while (i < S.cues.length && t >= S.cues[i].t + late) { r = R.cueFire(S, r, keyOf(i), t, lv, W); i += 1; } r = R.cueTick(S, r, t, W); }
  return C.headline(R.cueFinish(S, r, lv, W));
}
for (const lv of [1, 3]) test(`reach-cues L${lv}: played on the beat`, () => assert.equal(playCues(lv, (i) => CUE_KEYS[lv][i], 0.02), LOG[`reach-cues L${lv} played on the beat`]));
test('reach-cues L1: late and repetitive', () => assert.equal(playCues(1, () => 5, 0.45), LOG['reach-cues L1 late and repetitive']));
test('reach-cues: stopping the show is a must-pass failure', () => { const S = C.Reach.song(2); assert.match(C.headline(C.Reach.cueFinish(S, C.Reach.cueStart(S), 2, C.Reach.windows(1), true)), /NOT YET · 0\/100/); });

const JOKES = [['build-studio', 'A computer mouse', { comp: 'mouse2' }], ['build-studio', 'A smoke detector', { mic: 'smoke' }], ['build-studio', 'A spreadsheet', { daw: 'sheet' }], ['build-studio', 'Bluetooth earbuds', { mon: 'bt2' }], ['build-studio', 'A garden hose', { cable: 'hose' }],
  ['build-stream', 'A microwave oven', { cap: 'micro' }], ['build-stream', 'A walkie-talkie', { mic: 'walkie' }], ['build-stream', 'A doorbell camera', { cam: 'door' }]];
for (const [id, label, patch] of JOKES) test(`${id} L1 joke: ${label}`, () => assert.equal(run(id, 1, () => patch), LOG[`${id} L1 joke: ${label}`]));
test('build-rf L2: every mic on one frequency', () => assert.equal(run('build-rf', 2, () => Object.fromEntries([0, 1, 2, 3, 4, 5].map((i) => [`f${i}`, 530]))), LOG['build-rf L2 all on one']));
test('record-loud L2: turning the emergency alert down', () => assert.equal(run('record-loud', 2, () => ({ alertEdited: true })), LOG['record-loud L2 alert edit']));

test('every challenge in the log is registered, and every registered one is tested', () => {
  const logged = new Set(Object.keys(LOG).map((k) => k.split(' ')[0])); assert.deepEqual([...logged].sort(), C.CHALLENGES.map((c) => c.id).sort());
  assert.equal(C.CHALLENGES.length, 13); for (const m of C.MODES) assert.ok(C.CHALLENGES.some((c) => c.mode === m.id), m.id);
});
test('a timeout adds a must-pass failure to otherwise perfect work', () => { const ch = C.byId('record-take'); const r = ch.evaluate({ ...ch.init(1), ...RECIPES['record-take'](1) }, 1); assert.match(C.headline(C.withTimeout(ch, r)), /^✖ NOT YET/); });
test('records keep the first score, the best score and a pass once earned', () => { let r = C.recordChal(undefined, 40, false, 1); r = C.recordChal(r, 90, true, 2); r = C.recordChal(r, 10, false, 3); assert.deepEqual(r, { tries: 3, best: 90, first: 40, passed: true, last: 10, at: 3 }); });
test('every control references a key the state holds (or an action), at every level', () => {
  for (const ch of C.CHALLENGES) for (const lv of [1, 2, 3, 4]) { const s = ch.init(lv); for (const c of ch.controls(lv, { ...s, pos: 'foh' })) if (c.kind !== 'action') assert.ok(c.key in s, `${ch.id} L${lv} ${c.key}`); }
});
test('readouts render at every level from the start state', () => { for (const ch of C.CHALLENGES) for (const lv of [1, 2, 3, 4]) { const r = ch.readout(ch.init(lv), lv); assert.ok(Array.isArray(r) && r.length > 0, ch.id); } });

// Boundary rules the start/recipe runs cannot reach (each one was found by mutation testing, 12 Nov).
const chk = (id, lv, st, label) => { const r = C.byId(id).evaluate(st, lv); assert.ok(r.checks, `${id}: expected checks, got an instant failure`); const c = r.checks.find((x) => x.label.startsWith(label)); assert.ok(c, `${id}: no check "${label}"`); return c; };
const full = (id, lv, patch) => ({ ...C.byId(id).init(lv), ...RECIPES[id](lv), ...patch });
test('stars: 95 earns three, 85 two, 70 one', () => assert.deepEqual([95, 94, 85, 84, 70, 69].map(C.stars), ['★★★', '★★☆', '★★☆', '★☆☆', '★☆☆', '☆☆☆']));
test('hear-comp: any output peak above 0 dBFS is an instant clip, below it is not', () => {
  const at = (mk) => ({ ...full('hear-comp', 1), mk }); assert.ok(C.Hear.vocalStats(at(9.5)).peak > 0 && C.Hear.vocalStats(at(9.5)).peak < 1);
  assert.ok('instant' in C.byId('hear-comp').evaluate(at(9.5), 1)); assert.ok('checks' in C.byId('hear-comp').evaluate(at(9), 1));
});
test('hear-comp: hiss between phrases is judged against the level’s floor', () => {
  const loud = { thr: -60, ratio: 20, att: 0.2, rel: 30, knee: 0, mk: 14 }, v = C.Hear.vocalStats(loud); assert.ok(v.peak < 0 && v.noise > -62 && v.noise < -45, 'hiss above −62 dBFS, no clip'); assert.equal(chk('hear-comp', 3, loud, 'Quiet between phrases').ok, false); assert.equal(chk('hear-comp', 3, full('hear-comp', 3), 'Quiet between phrases').ok, true);
});
test('hear-eq: Mastery holds ±1.5 dB where Advanced allows ±2', () => {
  const off = (lv) => ({ ...full('hear-eq', lv), p1g: full('hear-eq', lv).p1g + 1.8 }); assert.equal(chk('hear-eq', 4, off(4), 'The guitar matches itself').ok, false); assert.equal(chk('hear-eq', 3, off(3), 'The guitar matches itself').ok, true);
});
test('see-focus L3: the background must be soft (≥ 12 px)', () => { const s = full('see-focus', 3, { N: 5.6, nd: 0 }); assert.ok(C.See.camera(s, 3).bbPx > 1 && C.See.camera(s, 3).bbPx < 12); assert.equal(chk('see-focus', 3, s, 'Background soft').ok, false); assert.equal(chk('see-focus', 3, full('see-focus', 3), 'Background soft').ok, true); });
test('reach-cues: a missed cue costs 10 of crowd once, after the accepted window', () => {
  const R = C.Reach, S = R.song(1), W = R.windows(1), t = S.cues[0].t + W[2] + 0.01; let r = R.cueStart(S); r = { ...r, lastChange: t };
  const a = R.cueTick(S, r, t, W); assert.equal(a.crowd, 40); assert.equal(a.missed[0], true); assert.equal(R.cueTick(S, a, t + 0.01, W).crowd, 40);
  assert.equal(R.cueTick(S, r, S.cues[0].t + W[2] - 0.01, W).crowd, 50);
});
test('reach-cues: relaxed and untimed settings widen the windows', () => { assert.deepEqual(C.Reach.windows(2).map((x) => +x.toFixed(3)), [0.192, 0.48, 0.96]); assert.deepEqual(C.Reach.windows(0).map((x) => +x.toFixed(3)), [0.264, 0.66, 1.32]); });
test('build-studio: furniture absorbs by its sabins at 125 Hz, 500 Hz and 2 kHz', () => { const b = C.byId('build-studio').init(1), d = [0, 1, 2].map((i) => C.Build.room({ ...b, sofa: true })[i].A - C.Build.room(b)[i].A); assert.deepEqual(d.map((x) => +x.toFixed(6)), [0.6, 1.4, 1.6]); });
test('build-rf: the TV channel carries a 250 kHz guard band', () => { const kinds = (f) => C.Build.rf({ ...full('build-rf', 2), f0: f }, 2).conf.filter((c) => c.i === 0).map((c) => c.k); assert.ok(kinds(523.9).includes('tv')); assert.ok(!kinds(523.7).includes('tv')); assert.ok(kinds(530.2).includes('tv')); assert.ok(!kinds(530.3).includes('tv')); });
test('record-panel: the automixer keeps a neighbour 15 dB further down', () => { const s = full('record-panel', 2); assert.equal(+(C.Record.panel({ ...s, auto: false }, 2).worst - C.Record.panel(s, 2).worst).toFixed(6), 15); });
test('record-take L2: a close mic needs a pop filter', () => { assert.equal(chk('record-take', 2, full('record-take', 2, { pop: false, d: 15 }), 'No popped plosives').ok, true); assert.equal(chk('record-take', 2, full('record-take', 2, { pop: false, d: 14 }), 'No popped plosives').ok, false); });
test('record-loud: the relative gate drops segments 10 LU under the ungated average', () => {
  const st = full('record-loud', 1, { g5: -15 }), R = C.Record.loudness(st), prog = R.seg.filter((s) => !s.locked), E = (a) => 10 * Math.log10(a.reduce((e, s) => e + s.d * 10 ** (s.L / 10), 0) / a.reduce((t, s) => t + s.d, 0));
  const kept = prog.filter((s) => s.L > E(prog) - 10); assert.ok(kept.length < prog.length); assert.equal(+R.I.toFixed(6), +E(kept).toFixed(6));
});
test('record-loud L3: more than 4 dB of limiting is squashing', () => { assert.equal(chk('record-loud', 3, full('record-loud', 3, { g6: 5 }), 'Not squashed').ok, true); assert.equal(chk('record-loud', 3, full('record-loud', 3, { g6: 6 }), 'Not squashed').ok, false); });
test('hear-eq: the strummed guitar is the reference’s (3.4 s at 48 kHz, peak at −6 dBFS) and its analyser outline peaks at 0 dB with energy across the guitar’s range', () => {
  const g = C.Hear.guitar(); assert.equal(g.length, Math.round(48000 * 3.4)); assert.ok(Math.abs(g.reduce((m, v) => Math.max(m, Math.abs(v)), 0) - 0.5) < 1e-6); assert.equal(C.Hear.guitar(), g);
  const r = C.Hear.guitarThirds(); assert.equal(r.length, C.Hear.THIRDS.length); assert.equal(Math.max(...r), 0); const at = (f) => r[C.Hear.THIRDS.indexOf(f)];
  assert.ok(at(100) > -20 && at(250) > -20, 'the low strings are there'); assert.ok(at(20) < at(100) - 10, 'nothing much below the low E');
});
