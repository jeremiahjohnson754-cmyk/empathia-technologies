// SIGNAL result pop-ups (apps/demo/src/signal/pops.ts) against the reference gate.js popResult / showPop and quest.js questObjectiveFor.
// Restored 12 Nov 2026.   node --test tests/unit/signal-pops.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'signal-pops-')), 'p.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'apps/demo/src/signal/pops.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const X = await import(pathToFileURL(out).href);

const opt = (letter, label, extra) => ({ letter, label, result: '', consequence: '', chips: [], badges: [], canonical: false, fail: null, requires_loadout: null, weight: {}, ...extra });
const D1 = { type: 'decision', id: 'BR-1', prompt: 'p', happening: '', clock: null, known: [], unknown: [], risk: '', timer_s: 30, timeout: null, hints: [{ id: 'h1', keep: 0.5, text: '' }], note: '', lab: null,
  options: [opt('A', 'Listen first', { canonical: true, weight: { merit: 4, trust: { Ray: 2 } } }), opt('B', 'Push the fader', { fail: 'It rings.', weight: { merit: -3, trust: { Ray: -1 } } }), opt('C', 'Ask Ana', { weight: { merit: 1 } })] };
const items = [{ type: 'quest', title: 'Q', kind: 'Main', level: 'L1', party: [], stakes: '', clock: '', reward: '', rumor: '', objectives: [{ key: 'BR-1', text: 'Hear it before you touch it' }, { key: 'core', text: 'Prove the fix on the bench' }, { key: 'incident', text: 'Close the call' }, { key: 'disc:1', text: 'Find a clue' }] },
  D1, { type: 'mount', kind: 'drill', id: 'DR-1', label: null, gate: null }, { type: 'mount', kind: 'incident', id: 'IN-1', label: null, gate: null }, { type: 'discovery', id: 'X1', teaser: '', title: '', body: '', thread: 't', who: null }, { type: 'discovery', id: 'X2', teaser: '', title: '', body: '', thread: 't', who: null }];
const gates = [{ index: 1, kind: 'decision', id: 'BR-1', tier: 'hard', twist: false, core: false }, { index: 2, kind: 'drill', id: 'DR-1', tier: 'hard', twist: false, core: true },
  { index: 3, kind: 'incident', id: 'IN-1', tier: 'soft', twist: false, core: false }, { index: 4, kind: 'lab', id: 'L-OPT', tier: 'opt', twist: false, core: false }];
const pieces = { gates, quizzes: {}, lessons: {} };
const M = { dec: { 'BR-1': { k: [0.5], o: { A: { m: 4, t: { Ray: 2 }, c: 1 }, B: { m: -3, t: { Ray: -1 }, f: 1 }, C: { m: 1, t: {} } } } }, quests: {}, discoveries: { X1: { ch: 'c1' }, X2: { ch: 'c1' } },
  chq: { c1: { dec: ['BR-1'], core: ['drill', 'DR-1'], soft: [['incident', 'IN-1']], twist: [], md: [], disc: 2 } }, talk: {}, roles: [], domains: [], lanes: {}, sysmaps: {}, dom: {}, totals: {} };
const P = (x = {}) => ({ v: 2, chapters: {}, clock: 'on', gates: true, last: null, quizzes: {}, skips: {}, drills: {}, incidents: {}, labs: {}, reviews: {}, meltdowns: {}, bosses: {}, challenges: {}, ...x });
const S = (x = {}) => ({ choices: {}, talks: {}, found: [], done: false, ...x });

test('PO-01 a decision card: the choice, the verdict with merit (hints keep their share) and trust, the quest objective it completes, the next page open', () => {
  const s = S({ choices: { 'BR-1': { letter: 'A', first: 'A', changes: 0, hints: 1 } } }), p = P({ chapters: { c1: s } });
  const b = X.gatePop(gates[0], items, s, p, pieces, M, 'c1', {});
  assert.equal(b.title, 'CHOICE LOCKED IN'); assert.equal(b.kicker, 'C1 · QUEST UPDATED'); assert.equal(b.tone, 'ok');
  assert.deepEqual(b.lines, ['You chose: Listen first', '★ The professional call. Merit +2', 'Trust Ray +2', 'Quest: ✓ Hear it before you touch it', 'The next page is open.']);
  const c = X.gatePop(gates[0], items, S({ choices: { 'BR-1': { letter: 'B', first: 'B', changes: 0, hints: 0 } } }), p, pieces, M, 'c1', {});
  assert.equal(c.tone, 'bad'); assert.equal(c.lines[1], '✕ A costly call. Merit -3'); assert.equal(X.gatePop(gates[0], items, S({ choices: { 'BR-1': { letter: 'C', hints: 0 } } }), p, pieces, M, 'c1', {}).tone, 'mid');
});
test('PO-02 a timeout: "THE CLOCK DECIDED FOR YOU", in red, with the replay line', () => {
  const s = S({ choices: { 'BR-1': { letter: 'TIMEOUT', first: 'TIMEOUT', changes: 0, hints: 0 } } }); const b = X.gatePop(gates[0], items, s, P(), pieces, M, 'c1', {});
  assert.equal(b.title, 'THE CLOCK DECIDED FOR YOU'); assert.equal(b.tone, 'bad'); assert.match(b.lines[0], /You froze/); assert.match(b.lines[1], /Replay the card/);
});
test('PO-03 drill, incident, lab, boss, check, meltdown and review cards say how it went; the last gate says every gate is cleared', () => {
  const s = S({ choices: { 'BR-1': { letter: 'A', hints: 0 } } });
  const p = P({ drills: { 'DR-1': { passed: true, tries: 1, first: true } }, incidents: { 'IN-1': { best: 'partial' } } });
  const d = X.gatePop(gates[1], items, s, p, pieces, M, 'c1', {}); assert.equal(d.title, 'DRILL COMPLETE'); assert.equal(d.lines[0], '✓ Passed.'); assert.ok(d.lines.includes('Quest: ✓ Prove the fix on the bench'));
  const i = X.gatePop(gates[2], items, s, p, pieces, M, 'c1', {}); assert.equal(i.title, 'INCIDENT CLOSED'); assert.equal(i.tone, 'mid'); assert.equal(i.lines[0], '◐ Restored, not proven.'); assert.equal(i.lines.at(-1), 'Every gate in this chapter is cleared.');
  assert.equal(X.gatePop({ ...gates[1], kind: 'lab', id: 'LB' }, items, s, P({ labs: { LB: { passed: false } } }), pieces, M, 'c1', {}).lines[0], '✕ Not passed — the fix is shown in the lab. Try again in Practice.');
  assert.equal(X.gatePop({ ...gates[1], kind: 'boss', id: 'BOSS-S1' }, items, s, P({ bosses: { 'BOSS-S1': { passed: true, tries: 2 } } }), pieces, M, 'c1', {}).lines[0], '✓ Boss cleared in 2 runs. The next season is open.');
  const q = X.gatePop({ ...gates[1], kind: 'quiz', id: 'Q1', core: false }, items, s, P({ quizzes: { Q1: { best: 3, total: 4 } } }), pieces, M, 'c1', {}); assert.equal(q.title, 'CHECK COMPLETE'); assert.equal(q.lines[0], 'Score 3 / 4 · the explanations stay open above'); assert.equal(q.tone, 'mid');
  assert.equal(X.gatePop({ ...gates[1], kind: 'lesson', id: 'FB2', core: false }, items, s, P({ quizzes: { 'Q-FB2': { best: 2, total: 2 } } }), pieces, M, 'c1', { FB2: 'Q-FB2' }).lines[0], 'Score 2 / 2 · clean sheet');
  assert.match(X.gatePop({ ...gates[1], kind: 'meltdown', id: 'MD1', core: false }, items, s, P({ meltdowns: { MD1: { last: 'proven', grade: 'A' } } }), pieces, M, 'c1', {}).lines[0], /Contained and proven · rating A/);
  assert.equal(X.gatePop({ ...gates[1], kind: 'review', id: 'S1', core: false }, items, s, P({ reviews: { S1: { score: 81, pass: true } } }), pieces, M, 'c1', {}).title, 'SEASON PASSED');
});
test('PO-04 which gates raise a card: done by playing (a skip does not), never an optional piece', () => {
  const s = S({ choices: { 'BR-1': { letter: 'A', hints: 0 } } });
  const k = X.doneKeys(pieces, s, P({ skips: { 'incident:IN-1': 1 }, labs: { 'L-OPT': { passed: true } } }));
  assert.deepEqual([...k], ['decision:BR-1']);
});
test('PO-05 the chapter card: the quest rating with the reference’s line, discoveries found, the chapter it unlocks (or the end of the novel)', () => {
  const s = S({ choices: { 'BR-1': { letter: 'A', hints: 0 } }, found: ['X1'] }), p = P({ chapters: { c1: s }, drills: { 'DR-1': { passed: true } }, incidents: { 'IN-1': { best: 'proven' } } });
  const b = X.chapterPop('First light', items, s, p, M, 'c1', {}, { title: 'Second light' });
  assert.equal(b.title, 'CHAPTER COMPLETE'); assert.equal(b.kicker, 'C1 · QUEST LOG');
  assert.deepEqual(b.lines, ['First light is finished.', 'Quest rating S · 9 / 10 — Flawless. People will tell this one about you.', '🔎 Discoveries 1 / 2', 'Unlocked: Second light']);
  assert.equal(X.chapterPop('Last', items, S(), P(), null, 'c1', {}, null).lines.at(-1), 'You reached the end of the novel so far.');
});
