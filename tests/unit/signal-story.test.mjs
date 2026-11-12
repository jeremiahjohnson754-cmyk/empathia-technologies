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
