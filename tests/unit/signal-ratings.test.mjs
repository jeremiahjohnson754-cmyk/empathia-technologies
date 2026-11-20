// SIGNAL story ratings, season reviews and the loadout (apps/demo/src/signal/ratings.ts) against the founder's build package:
// docs/04-engine-specs.md §10 and the reference runtime ratings.js. Expected figures below are worked by hand from those rules.
// Restored 11 Nov 2026.   node --test tests/unit/signal-ratings.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'signal-ratings-'));
await esbuild.build({ entryPoints: { r: path.join(repo, 'apps/demo/src/signal/ratings.ts'), s: path.join(repo, 'apps/demo/src/signal/story.ts') }, bundle: true, format: 'esm', platform: 'node', outdir: dir, outExtension: { '.js': '.mjs' }, logLevel: 'error' });
const R = await import(pathToFileURL(path.join(dir, 'r.mjs')).href); const S = await import(pathToFileURL(path.join(dir, 's.mjs')).href);
const { buildRatingsIndex } = await import(pathToFileURL(path.join(repo, 'apps/demo/signal-ratings-index.mjs')).href);
const X = buildRatingsIndex(JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data/app-data.json'), 'utf8')));
const ch = JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data/story/s01e00.json'), 'utf8')); const d2 = ch.items.find((i) => i.id === 'BR-S01E00-02');
const withChoice = (letters) => { let st = S.emptyChapter(); for (const l of letters) st = S.choose(st, d2, l).state; return { ...S.emptyProgress(), chapters: { s01e00: st } }; };
const scores = (r) => Object.fromEntries(Object.entries(r.dims).map(([k, v]) => [k, v.score]));

test('RT-01 with nothing done every rating is the neutral prior (72), the Story Score 72, a pass, and the loadout limited throughout', () => {
  const r = R.ratingsFor(S.emptyProgress(), X, 12); assert.deepEqual(scores(r), { comp: 72, evid: 72, trust: 72, safe: 72, debt: 72, lead: 72 }); assert.deepEqual([r.score, r.pass, r.seen, r.debt], [72, true, 0, 0]);
  assert.ok(Object.values(R.loadoutOf(r)).every((x) => x.lvl === 1)); assert.equal(Object.keys(R.loadoutOf(r)).length, 6);
});

test('RT-02 a failing first call (evid and debt, severity 3) pulls comp to 48, trust and debt to 36, evid to 29: Story Score 49, below the pass mark', () => {
  const r = R.ratingsFor(withChoice(['A']), X, 1); assert.deepEqual(scores(r), { comp: 48, evid: 29, trust: 36, safe: 72, debt: 36, lead: 72 }); assert.deepEqual([r.score, r.pass, r.debt, r.seen], [49, false, 1, 1]);
  assert.ok(r.notes.some((n) => /A failing call/.test(n.t)) && r.notes.length <= 6);
  assert.deepEqual(scores(R.ratingsFor(withChoice(['A', 'C']), X, 1)), scores(r), 'the first attempt counts; changing it later does not rewrite the record');
});

test('RT-03 the canonical first call lifts comp and debt to 81, trust to 86, evid to 89: Story Score 80', () => {
  const r = R.ratingsFor(withChoice(['C']), X, 1); assert.deepEqual(scores(r), { comp: 81, evid: 89, trust: 86, safe: 72, debt: 81, lead: 72 }); assert.equal(r.score, 80); assert.equal(r.debt, 0);
});

test('RT-04 scope: a review counts seasons up to its own; a season-only view counts just that season', () => {
  assert.equal(R.ratingsFor(withChoice(['A']), X, 0).seen, 0, 'the Prologue’s view does not see Season 1'); assert.equal(R.ratingsFor(withChoice(['A']), X, 2, 2).seen, 0);
});

test('RT-05 the other first attempts: a boundary-failed incident, a lab passed on the third test, a drill missed then passed, a weak quiz, a skipped check', () => {
  const P = { ...S.emptyProgress(), incidents: { 'SM-01': { best: 'fail', runs: 1, first: 'fail', firstWhy: 'boundary' } } };
  assert.deepEqual(scores(R.ratingsFor(P, X, 1)), { comp: 43, evid: 72, trust: 59, safe: 36, debt: 72, lead: 72 });   // safe 2.16/6; comp 2.16/5; trust 2.36/4
  const L = { ...S.emptyProgress(), labs: { 'LAB-SF-01': { passed: true, done: true, tries: 3, passTry: 3 } } }; const rl = scores(R.ratingsFor(L, X, 1)); assert.equal(rl.comp, Math.round((100 * (2.16 + 0.45 * 1.5)) / 4.5)); assert.equal(rl.evid, Math.round((100 * 2.61) / 4));
  const D = { ...S.emptyProgress(), drills: { 'C-01': { passed: true, tries: 2, first: false } } }; const rd = scores(R.ratingsFor(D, X, 1)); assert.equal(rd.comp, Math.round((100 * 2.61) / 4)); assert.equal(rd.evid, Math.round((100 * 2.61) / 4), 'a clue drill also counts for evidence');
  const Q = { ...S.emptyProgress(), quizzes: { 'Q-TW-S01E00-R': { best: 3, total: 3, first: 1 } } }; assert.equal(scores(R.ratingsFor(Q, X, 1)).comp, Math.round((100 * (2.16 + 1 / 3)) / 4));
  const K = { ...S.emptyProgress(), skips: { 'lesson:FB1': 1 } }; const rk = R.ratingsFor(K, X, 1); assert.deepEqual([scores(rk).comp, scores(rk).debt, rk.debt], [Math.round(216 / 3.6), Math.round(216 / 3.4), 1]);
});

test('RT-06 the loadout: 80 or more is full, 65 or more limited, below bare minimum; the Season 9 review locks it; retrying a season forgets only that season', () => {
  const r = R.ratingsFor(withChoice(['A']), X, 1); const lo = R.loadoutOf(r); assert.equal(lo.team.lvl, 1); assert.equal(lo.budget.lvl, 0); assert.equal(lo.monitoring.lvl, 0);
  assert.equal(R.loadoutOf(R.ratingsFor(withChoice(['C']), X, 1)).monitoring.lvl, 2);
  assert.equal(R.submitReview(withChoice(['A']), X, 1, 5).loadout, undefined); assert.ok(R.submitReview(withChoice(['A']), X, 9, 5).loadout); assert.equal(R.submitReview(withChoice(['A']), X, 1, 5).pass, false);
  const P = { ...withChoice(['A']), quizzes: { 'Q-TW-S01E00-R': { best: 1, total: 3, first: 1 } }, reviews: { S1: { score: 49, pass: false, at: 1, dims: {} } } };
  const back = R.retrySeason(P, X, 1); assert.deepEqual(back.chapters.s01e00.choices, {}); assert.deepEqual(back.quizzes, {}); assert.deepEqual(back.reviews, {});
  assert.deepEqual(R.retrySeason(P, X, 2).chapters.s01e00.choices, P.chapters.s01e00.choices, 'another season’s retry leaves Season 1 alone');
});

test('RT-07 the review gate opens only on a pass; a stored review that contradicts its own score is not read', () => {
  const g = { index: 65, kind: 'review', id: 'S1', tier: 'hard', twist: false, core: false }; const pc = { gates: [g], quizzes: {}, lessons: {} };
  assert.equal(S.gateDone(g, S.emptyChapter(), { ...S.emptyProgress(), reviews: { S1: { score: 49, pass: false, at: 1, dims: {} } } }, pc), false);
  assert.equal(S.gateDone(g, S.emptyChapter(), { ...S.emptyProgress(), reviews: { S1: { score: 72, pass: true, at: 1, dims: {} } } }, pc), true);
  assert.equal(S.readReview({ score: 49, pass: true, at: 1, dims: {} }), null); assert.deepEqual(S.readReview({ score: 70, pass: true, at: 1, dims: { comp: 70, x: 1 } }).dims, { comp: 70 });
});

test('RT-08 a failed safety call costs safety twice over (1.5w as judgment, 2w as a boundary); later quizzes weigh by their tier; at most two notes per rating', () => {
  const P = { ...S.emptyProgress(), chapters: { s01e00: { ...S.emptyChapter(), choices: { 'BR-S01E00-04': { letter: 'A', first: 'A', changes: 0, hints: 0 } } } } };
  assert.equal(scores(R.ratingsFor(P, X, 1)).safe, Math.round(216 / (3 + 4.5 + 6)), 'w = 3: 2.16 over 13.5');
  const Q = { ...S.emptyProgress(), quizzes: { 'Q-TW-S04E01-1': { best: 1, total: 2, first: 0 } } }; assert.equal(scores(R.ratingsFor(Q, X, 4)).comp, Math.round(216 / 4.25), 'tier 2 weighs 1.25');
  const K = { ...S.emptyProgress(), skips: { 'lesson:FB1': 1, 'quiz:Q-TW-S01E00-R': 1, 'lesson:FB2': 1, 'quiz:Q-TW-S01E01-R': 1 } }; const rk = R.ratingsFor(K, X, 1);
  assert.equal(rk.notes.filter((n) => n.dim === 'comp').length, 2); assert.equal(rk.debt, 4);
});
