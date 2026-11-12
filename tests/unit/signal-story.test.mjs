// The SIGNAL story engine (apps/demo/src/signal/story.ts) against the founder's build package's rules (docs/04-engine-specs.md §1 and
// the reference runtime, app.js hookStory/renderEchoes). Restored 11 Nov 2026 on the founder's instruction to restore SIGNAL in full:
// before that, a failing option was refused and the reader chose again; in the reference it is RECORDED, costs merit and trust, and the
// story goes on. Run on the canon's own first chapter, s01e00, unedited.
//   node --test tests/unit/signal-story.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'signal-story-')), 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'apps/demo/src/signal/story.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const S = await import(pathToFileURL(out).href);
const ch = JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data/story/s01e00.json'), 'utf8'));
const D = ch.items.filter((i) => i.type === 'decision'); const [d2, d3, d4] = D;

test('SS-01 a failing option is recorded, opens the gate and costs its merit and trust; the story goes on with it', () => {
  const s0 = S.emptyChapter(); const at0 = S.reached(ch.items, s0, true);
  assert.equal(ch.items[at0 - 1].id, d2.id, 'the story waits at the first decision');
  const { state, outcome } = S.choose(s0, d2, 'A');
  assert.equal(outcome.kind, 'recorded'); assert.equal(outcome.verdict, 'costly'); assert.equal(outcome.changed, false);
  assert.ok(S.passed(state, d2.id)); assert.ok(S.reached(ch.items, state, true) > at0, 'a costly call does not hold the story');
  const t = S.tally(ch.items, state); assert.equal(t.merit, -4); assert.deepEqual(t.trust, { Walter: -2 }); assert.equal(t.costly, 1); assert.equal(t.made, 1);
  assert.deepEqual(S.weightOf(d2, state.choices[d2.id]), { merit: -4, sev: 3, trust: { Walter: -2 }, verdict: 'costly', option: d2.options[0] });
});

test('SS-02 tapping another option replaces the record and keeps the first choice; the same option again changes nothing', () => {
  let s = S.choose(S.emptyChapter(), d2, 'A').state; const r = S.choose(s, d2, 'C'); s = r.state;
  assert.equal(r.outcome.changed, true); assert.deepEqual(s.choices[d2.id], { letter: 'C', first: 'A', changes: 1, hints: 0 });
  assert.equal(S.tally(ch.items, s).merit, 4, 'the record counts as it is now, as the reference counts it');
  const again = S.choose(s, d2, 'C'); assert.equal(again.state, s); assert.equal(again.outcome.changed, false);
  assert.equal(S.choose(s, d2, 'Z').outcome.kind, 'refused');
});

test('SS-03 a timeout is recorded as a costly call (merit −2, severity 2, no trust); nothing records until Replay, which reopens the decision', () => {
  let s = S.timeOut(S.emptyChapter(), d2, 1); assert.deepEqual(s.choices[d2.id], { letter: 'TIMEOUT', first: 'TIMEOUT', changes: 0, hints: 1 });
  assert.ok(S.passed(s, d2.id)); assert.deepEqual(S.weightOf(d2, s.choices[d2.id]), { merit: -2, sev: 2, trust: {}, verdict: 'costly', option: null });
  const t = S.tally(ch.items, s); assert.equal(t.timedOut, 1); assert.equal(t.costly, 1); assert.equal(t.merit, -2);
  const r = S.choose(s, d2, 'C'); assert.equal(r.outcome.kind, 'refused'); assert.match(r.outcome.why, /Replay it/); assert.equal(r.state, s);
  assert.equal(S.timeOut(S.choose(S.emptyChapter(), d2, 'C').state, d2).choices[d2.id].letter, 'C', 'a timeout after a choice changes nothing');
  s = S.replayDecision(s, d2.id); assert.equal(S.passed(s, d2.id), false); assert.equal(S.choose(s, d2, 'C').outcome.verdict, 'canonical');
});

test('SS-04 hints keep the stated share of positive merit only; a costly call keeps its full cost', () => {
  const s = S.choose(S.emptyChapter(), d2, 'C', { hints: 2 }).state; assert.equal(S.tally(ch.items, s).merit, Math.round(4 * d2.hints[1].keep));
  assert.equal(S.tally(ch.items, S.choose(S.emptyChapter(), d2, 'A', { hints: 3 }).state).merit, -4);
});

test('SS-05 the chapter verdict is the reference’s: all professional; one costly call; two or more; otherwise solid', () => {
  const play = (letters) => D.reduce((s, d, i) => S.choose(s, d, letters[i]).state, S.emptyChapter());
  const v = (letters) => S.chapterVerdict(S.tally(ch.items, play(letters)));
  assert.match(v(['C', 'B', 'B']), /the way a professional would/); assert.match(v(['A', 'B', 'B']), /one costly call/);
  assert.match(v(['A', 'B', 'A']), /^Rough episode/); assert.match(v(['B', 'B', 'B']), /^Solid\./);
  assert.ok(S.complete(ch.items, play(['A', 'A', 'A'])), 'a chapter of costly calls is still complete: the story went on');
});

test('SS-06 echoes: the previous chapter’s recorded choices, each with its mark and consequence, and the merit and trust carried in', () => {
  let s = S.choose(S.emptyChapter(), d2, 'A').state; s = S.timeOut(s, d4); const e = S.echoes(ch.items, s);
  assert.deepEqual(e.made.map((m) => [m.id, m.verdict, m.timedOut]), [[d2.id, 'costly', false], [d4.id, 'costly', true]]);
  assert.equal(e.made[0].label, d2.options[0].label); assert.equal(e.made[0].consequence, d2.options[0].consequence); assert.equal(e.merit, -6); assert.deepEqual(e.trust, { Walter: -2 });
  assert.deepEqual(S.echoes(ch.items, undefined), { made: [], merit: 0, trust: {} }); assert.equal(S.trustLine({ A: 2, B: -1, C: 0 }), 'A +2, B -1');
});

test('SS-07 stored progress of the earlier shape is read as its first and final choices; anything malformed reads as no choice', () => {
  assert.deepEqual(S.readChoice({ letter: 'C', tries: 2, failed: ['A'], hints: 1, timedOut: false }), { letter: 'C', first: 'A', changes: 1, hints: 1 });
  assert.deepEqual(S.readChoice({ letter: 'B', tries: 1, failed: [], hints: 0 }), { letter: 'B', first: 'B', changes: 0, hints: 0 });
  assert.deepEqual(S.readChoice({ letter: '', tries: 2, failed: ['A', 'D'], hints: 0 }), { letter: 'D', first: 'A', changes: 1, hints: 0 });
  for (const junk of [null, 3, 'x', {}, { letter: '<b>', first: 'A' }, { letter: '', failed: ['zz'] }]) assert.equal(S.readChoice(junk), null, JSON.stringify(junk));
  mem.set('empathia.signal.story.v1', JSON.stringify({ v: 1, clock: 'extended', gates: true, last: 's01e00', chapters: { s01e00: { choices: { [d2.id]: { letter: 'C', tries: 2, failed: ['A'], hints: 0 }, bad: 7 }, talks: {}, found: [], done: false } } }));
  const p = S.load(); assert.equal(p.v, 2); assert.equal(p.clock, 'extended'); assert.deepEqual(p.chapters.s01e00.choices, { [d2.id]: { letter: 'C', first: 'A', changes: 1, hints: 0 } });
  mem.set('empathia.signal.story.v1', '{nonsense'); assert.deepEqual(S.load(), S.emptyProgress());
});

test('SS-08 the clock: canon seconds, doubled when extended, none when off or untimed; severity words and weight lines are the reference’s', () => {
  assert.equal(S.seconds(d2, 'on'), 30); assert.equal(S.seconds(d2, 'extended'), 60); assert.equal(S.seconds(d2, 'off'), null); assert.equal(S.seconds(d3, 'on'), null);
  assert.equal(S.weightLine('costly', 3), 'This will cost you — and people saw it.'); assert.equal(S.weightLine('canonical', 2), 'People noticed.'); assert.match(S.weightLine('neutral', 1), /^Not wrong, not the best/);
  assert.deepEqual(Object.keys(S.SEVERITY), ['1', '2', '3']);
});

// Quizzes and lessons inside the story (restored 11 Nov 2026 from the reference gate.js): tiers hard, soft and optional; a soft gate
// holds until it is done or skipped; optional pieces never hold. Run on s01e00's own gates and pieces as the build writes them.
const gates = JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data/gates.json'), 'utf8')).filter((g) => g.chapter === 's01e00');
const app = JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data/app-data.json'), 'utf8'));
const pick = (o, ks) => Object.fromEntries(ks.filter((k) => o[k]).map((k) => [k, o[k]]));
const lessonIds = gates.filter((g) => g.kind === 'lesson').map((g) => g.id); const lessons = pick(app.lessons || app.LESSONS || {}, lessonIds);
const pieces = { gates: gates.map(({ index, kind, id, tier, twist, core }) => ({ index, kind, id, tier, twist, core })), quizzes: {}, lessons };
const ctx = (state, progress) => ({ pieces, progress });

test('SS-09 the story waits at each hard decision, then at the soft twist test; answering or skipping it lets the story go on', () => {
  let s = S.emptyChapter(); let pr = S.emptyProgress();
  assert.equal(S.reached(ch.items, s, true, ctx(s, pr)), 28, 'held at the first decision (index 27)');
  s = S.choose(s, d2, 'C').state; const tw = S.blocking(s, pr, pieces); assert.deepEqual([tw.kind, tw.id, tw.tier], ['quiz', 'Q-TW-S01E00-R', 'soft']);
  assert.equal(S.reached(ch.items, s, true, ctx(s, pr)), 30);
  const answered = S.recordQuiz(pr, 'Q-TW-S01E00-R', 2, 3); assert.equal(S.blocking(s, answered, pieces).id, d3.id, 'any finished score clears it');
  const skipped = S.skip(pr, tw); assert.equal(skipped.skips['quiz:Q-TW-S01E00-R'], 1); assert.equal(S.blocking(s, skipped, pieces).id, d3.id);
});

test('SS-10 a lesson is done when its own check is recorded; hard gates cannot be skipped; a lab holds until fixed or ended; optional pieces never hold', () => {
  let s = S.emptyChapter(); for (const d of D) s = S.choose(s, d, 'B').state; const pr = S.recordQuiz(S.emptyProgress(), 'Q-TW-S01E00-R', 1, 1);
  const L = S.blocking(s, pr, pieces); assert.deepEqual([L.kind, L.id, L.tier], ['lesson', 'FB1', 'soft']);
  assert.ok(lessons.FB1 && lessons.FB1.quiz, 'the lesson names its check'); // changed 11 Nov 2026 when labs became playable: the chapter's core lab (hard) now holds after the lesson; a miss does not clear it,
  // a pass or an ending does (gate.js); then the optional pieces after it never hold
  const done = S.recordQuiz(pr, lessons.FB1.quiz, 0, 4); const lab = S.blocking(s, done, pieces); assert.deepEqual([lab.kind, lab.id, lab.tier], ['lab', 'LAB-SF-01', 'hard']);
  assert.equal(S.blocking(s, S.recordLabTry(done, 'LAB-SF-01', false, false), pieces).id, 'LAB-SF-01', 'a miss keeps it holding');
  assert.equal(S.blocking(s, S.recordLabTry(done, 'LAB-SF-01', false, true), pieces), null, 'an ending (clock, or the fix shown) clears it, as gate.js has it');
  assert.equal(S.blocking(s, S.recordLabTry(S.recordLabTry(done, 'LAB-SF-01', false, true), 'LAB-SF-01', false, false), pieces), null, 'trying again after it ended does not close the story again');
  const hard = pieces.gates.find((g) => g.tier === 'hard'); assert.equal(S.skip(pr, hard), pr); assert.equal(S.gateCleared(hard, S.emptyChapter(), { quizzes: {}, skips: { [S.gateKey(hard)]: 1 } }, pieces), false, 'a forged skip of a hard gate clears nothing'); const opt = pieces.gates.find((g) => g.tier === 'opt'); assert.equal(S.skip(pr, opt), pr);
  assert.deepEqual(S.gateCount(s, pr, pieces), { cleared: 4, total: 6 }); assert.equal(S.complete(ch.items, s, ctx(s, pr)), false); assert.equal(S.complete(ch.items, s, ctx(s, S.skip(pr, L))), false, 'the lab still holds'); assert.equal(S.complete(ch.items, s, ctx(s, S.recordLabTry(S.skip(pr, L), 'LAB-SF-01', true, true))), true);   // total 5 → 6 on 11 Nov 2026: the lab counts now
});

test('SS-11 a quiz record keeps the best score and never changes the first; malformed records read as none', () => {
  let p = S.recordQuiz(S.emptyProgress(), 'Q', 2, 5); p = S.recordQuiz(p, 'Q', 4, 5); p = S.recordQuiz(p, 'Q', 1, 5); p = S.recordQuiz(p, 'Q', 9, 5);
  assert.deepEqual(p.quizzes.Q, { best: 5, total: 5, first: 2 });
  assert.deepEqual(S.readQuiz({ best: 3, total: 4, first: 2 }), { best: 3, total: 4, first: 2 });
  for (const j of [null, {}, { best: 5, total: 4, first: 1 }, { best: 2, total: 4, first: 3 }, { best: -1, total: 4, first: 0 }, { best: 1, total: 0, first: 0 }, { best: 1.5, total: 4, first: 1 }]) assert.equal(S.readQuiz(j), null, JSON.stringify(j));
});

// Chapter locks (restored 12 Nov 2026, reference gate.js gateRefresh): the index is built from the canon exactly as build.signal.mjs builds it.
const canon = (f) => JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data', f), 'utf8'));
const IX = (() => { const gl = canon('gates.json'), lockGates = {}; for (const x of gl) if (x.tier !== 'opt') (lockGates[x.chapter] = lockGates[x.chapter] || []).push([x.kind, x.id, x.tier]);
  const app = canon('app-data.json'); return { lessonQuiz: Object.fromEntries(Object.entries(app.lessons).map(([k, L]) => [k, L.quiz])), chapters: canon('story/index.json').map((c) => ({ id: c.id, title: c.title, gates: lockGates[c.id] || [] })) }; })();
test('SS-12 a new reader: the Prologue and Season 1’s opening chapter are open, everything after is locked, and it waits on s01e00', () => {
  const L = S.chapterLocks(IX, S.emptyProgress()), ids = IX.chapters.map((c) => c.id), at = ids.indexOf('s01e01');
  assert.ok(ids.slice(0, at).every((id) => !L[id])); assert.ok(ids.slice(at).every((id) => L[id])); assert.equal(S.lockedBehind(IX, L).id, 's01e00');
});
test('SS-13 reviewer mode removes every lock without touching progress', () => { const p = { ...S.emptyProgress(), gates: false }; assert.ok(Object.values(S.chapterLocks(IX, p)).every((v) => !v)); assert.equal(S.lockedBehind(IX, S.chapterLocks(IX, p)), null); });
test('SS-14 clearing every hard and soft gate of s01e00 opens s01e01 only; a soft gate may be skipped, a hard one may not', () => {
  const gs = IX.chapters.find((c) => c.id === 's01e00').gates; let p = S.emptyProgress(); const st = S.emptyChapter();
  for (const [kind, id, tier] of gs) { if (kind === 'decision') st.choices[id] = { letter: 'A', first: 'A', changes: 0, hints: 0 };
    else if (tier === 'soft') p = S.skip(p, { kind, id, tier }); else if (kind === 'quiz') p = S.recordQuiz(p, id, 1, 1); else if (kind === 'lesson') p = S.recordQuiz(p, IX.lessonQuiz[id], 1, 1); else if (kind === 'lab') p = S.recordLabTry(p, id, true, true); else if (kind === 'drill') p = S.recordDrillTry(p, id, true); else throw new Error(`unexpected ${kind}`); }
  p = { ...p, chapters: { s01e00: st } }; const L = S.chapterLocks(IX, p);
  assert.equal(L.s01e01, false); assert.equal(L.s01e02, true); assert.equal(S.lockedBehind(IX, L).id, 's01e01');
  const firstHard = gs.find(([k, , t]) => t === 'hard' && k === 'decision'); const st2 = { ...st, choices: { ...st.choices } }; delete st2.choices[firstHard[1]];
  assert.equal(S.chapterLocks(IX, { ...p, chapters: { s01e00: st2 } }).s01e01, true, 'an open decision keeps the next chapter locked');
});
test('SS-15 a boss gate holds the next season until the boss is cleared', () => {
  const i = IX.chapters.findIndex((c) => c.id === 's01e11'), lastS1 = IX.chapters[i], nextC = IX.chapters[i + 1];
  assert.ok(lastS1.gates.some(([k]) => k === 'boss'));
  const done = { gates: true }; // everything before s01e11 open: reviewer flag is per run, so test the boss rule on the chapter itself
  const lite = { gates: [], quizzes: {}, lessons: {} }; const g = { index: 0, kind: 'boss', id: 'S01', tier: 'hard', twist: false, core: false };
  assert.equal(S.gateCleared(g, S.emptyChapter(), { ...S.emptyProgress(), ...done }, lite), false);
  assert.equal(S.gateCleared(g, S.emptyChapter(), { ...S.emptyProgress(), bosses: { S01: { tries: 3, passed: false, best: 7 } } }, lite), false);
  assert.equal(S.gateCleared(g, S.emptyChapter(), { ...S.emptyProgress(), bosses: { S01: { tries: 4, passed: true, best: 8 } } }, lite), true); assert.ok(nextC.id.startsWith('s02'));
});
test('SS-16 boss and challenge records survive storage, and anything malformed is dropped', () => {
  const p = { ...S.emptyProgress(), bosses: { S01: { tries: 2, passed: true, best: 8, at: 5, firstRun: 2 }, X: { tries: 1, passed: true, best: 1 }, S02: { tries: -1, passed: true, best: 1 } }, challenges: { 'hear-eq@2': { tries: 1, best: 90, first: 90, passed: true, last: 90, at: 1 }, 'hear-eq@9': { tries: 1, best: 1, first: 1, passed: false, last: 1, at: 1 }, 'see-moire@1': { tries: 1, best: 50, first: 60, passed: false, last: 50, at: 1 } } };
  S.save(p); const r = S.load(); assert.deepEqual(r.bosses, { S01: { tries: 2, passed: true, best: 8, at: 5, firstRun: 2 } }); assert.deepEqual(Object.keys(r.challenges), ['hear-eq@2']);
  const q = S.recordChalTry(S.recordChalTry(S.emptyProgress(), 'hear-eq@1', 40, false, 1), 'hear-eq@1', 100, true, 2); assert.deepEqual(q.challenges['hear-eq@1'], { tries: 2, best: 100, first: 40, passed: true, last: 100, at: 2 });
});
