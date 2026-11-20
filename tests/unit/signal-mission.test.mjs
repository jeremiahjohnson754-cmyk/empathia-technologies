// SIGNAL Mission Control (apps/demo/src/signal/mission.ts) against docs/04-engine-specs.md §14 and the reference app.js points / level /
// elevel / crewTrust / nodeOn. Restored 12 Nov 2026.   node --test tests/unit/signal-mission.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'signal-mc-')), 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'apps/demo/src/signal/mission.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const MC = await import(pathToFileURL(out).href);
const M = { dec: { D1: { k: [0.5], o: { A: { m: 4, t: { Ray: 2 }, c: 1 }, B: { m: -3, t: { Ray: -1, Ana: -2 } } } }, D2: { k: [], o: { A: { m: 2, t: {}, c: 1 } } } }, talk: { T1: [{ Ana: 1 }, { Ana: -1 }] },
  roles: [], domains: ['Audio', 'Method'], lanes: {}, sysmaps: {}, totals: { drills: 9, incidents: 9, labs: 9, chapters: 9, cases: 0 },
  dom: { quiz: { Q1: 'Audio' }, drill: { R1: 'Audio', R2: 'Audio' }, incident: { I1: 'Audio', I2: 'Audio', I3: 'Audio' }, lab: { L1: 'Audio' }, meltdown: { M1: 'Method', M2: 'Method', M3: 'Method' } } };
const P = (x) => ({ chapters: {}, quizzes: {}, drills: {}, incidents: {}, labs: {}, meltdowns: {}, bosses: {}, challenges: {}, ...x });
test('MC-01 points: quiz best, +3 a passed drill, incident 6/3/0, +4 a passed lab, +1 a canonical decision (Method), meltdown 12/6/1, +1 a chapter opened', () => {
  const p = P({ quizzes: { Q1: { best: 4, total: 5, first: 2 } }, drills: { R1: { passed: true, tries: 1, first: true }, R2: { passed: false, tries: 2, first: false } },
    incidents: { I1: { best: 'proven' }, I2: { best: 'partial' }, I3: { best: 'fail' } }, labs: { L1: { passed: true } },
    meltdowns: { M1: { best: 'proven' }, M2: { best: 'partial' }, M3: { best: 'fail' } },
    chapters: { a: { choices: { D1: { letter: 'A', hints: 0 }, D2: { letter: 'TIMEOUT', hints: 0 } }, talks: {} }, b: { choices: { X: { letter: 'A', hints: 0 } }, talks: {} } } });
  const r = MC.points(p, M); assert.equal(r.total, 4 + 3 + 6 + 3 + 4 + 1 + 12 + 6 + 1 + 2); assert.deepEqual(r.dom, { Audio: 20, Method: 20 });
});
test('MC-02 the ladder and the domain levels hold at their thresholds', () => {
  assert.deepEqual([0, 24, 25, 89, 90, 199, 200, 359, 360, 559, 560, 9999].map((n) => MC.level(n).code), ['L0', 'L0', 'L1', 'L1', 'L2', 'L2', 'L3', 'L3', 'L4', 'L4', 'L5', 'L5']);
  assert.equal(MC.level(30).next[0], 90); assert.equal(MC.level(600).next, null); assert.equal(MC.level(200).name, 'Technician');
  assert.deepEqual([0, 2, 3, 7, 8, 14, 15].map(MC.elevel), ['E0', 'E0', 'E1', 'E1', 'E2', 'E2', 'E3']);
});
test('MC-03 crew trust: decisions’ merit and trust (hints keep their share of positive merit; a timeout costs 2) and conversations’ trust', () => {
  const c = MC.crew(P({ chapters: { a: { choices: { D1: { letter: 'A', hints: 1 }, D2: { letter: 'TIMEOUT', hints: 0 } }, talks: { T1: 1 } }, b: { choices: { D1: { letter: 'B', hints: 0 } }, talks: {} } } }), M);
  assert.equal(c.merit, 2 - 2 - 3); assert.deepEqual(c.trust, { Ray: 1, Ana: -3 });
});
test('MC-04 a system lights up when a chapter that meets it is opened, or an incident that proves it ends better than failed', () => {
  const n = { unlock: ['s01e00', 'SM-01'] };
  assert.equal(MC.nodeOn(n, P({})), false); assert.equal(MC.nodeOn(n, P({ chapters: { s01e00: {} } })), true); assert.equal(MC.nodeOn(n, P({ incidents: { 'SM-01': { best: 'fail' } } })), false); assert.equal(MC.nodeOn(n, P({ incidents: { 'SM-01': { best: 'partial' } } })), true);
  assert.equal(MC.currentSeason(P({ last: 's07e03' })), 7); assert.equal(MC.currentSeason(P({ last: 'pro02' })), 1);
});
test('MC-05 the evidence locker counts passes only', () => { const e = MC.evidence(P({ drills: { R1: { passed: true }, R2: { passed: false } }, incidents: { I1: { best: 'proven' }, I2: { best: 'partial' } }, labs: { L1: { passed: false } }, bosses: { S01: { passed: true } }, challenges: { 'a@1': { passed: true }, 'a@2': { passed: false } } }), M);
  assert.deepEqual([e.drills, e.proven, e.labs, e.bosses, e.challenges], [1, 1, 0, 1, 1]); });
test('MC-06 quest objectives and the quest rating, as quest.js counts them', () => {
  const Q = { ...M, dec: { ...M.dec, D3: { k: [], o: { A: { m: 0, t: {}, f: 1 }, B: { m: 0, t: {} } } } }, discoveries: { X1: { ch: 'c1' }, X2: { ch: 'c1' }, Y: { ch: 'c2' } },
    chq: { c1: { dec: ['D1', 'D2', 'D3'], core: ['drill', 'R1'], soft: [['incident', 'I1'], ['quiz', 'Q1']], twist: [['quiz', 'Q1']], md: [], disc: 2 } } };
  const base = P({ chapters: { c1: { choices: { D1: { letter: 'A', hints: 0 }, D2: { letter: 'TIMEOUT', hints: 0 }, D3: { letter: 'B', hints: 0 } }, talks: {}, found: ['X1', 'Y'] } } });
  const od = (p, k) => MC.objectiveDone(p, Q, 'c1', k, {});
  assert.equal(od(base, 'D1'), false); assert.equal(od(base, 'BR-x'), false);
  assert.equal(od(base, 'disc:1'), true); assert.equal(od(base, 'disc:2'), false, 'a discovery from another chapter does not count');
  assert.equal(od(base, 'twist'), false); assert.equal(od({ ...base, quizzes: { Q1: { best: 1, total: 2, first: 1 } } }, 'twist'), true);
  assert.equal(od(base, 'core'), false); assert.equal(od({ ...base, drills: { R1: { passed: false, tries: 1, first: false } } }, 'core'), true);
  let r = MC.questRating(base, Q, 'c1', {}); assert.deepEqual([r.got, r.max], [2 - 1 + 1 + 0 + 0 + 0 + 1, 6 + 3 + 3 + 2 + 2]);
  const full = { ...base, drills: { R1: { passed: true } }, incidents: { I1: { best: 'proven' } }, quizzes: { Q1: { best: 2, total: 2, first: 2 } }, chapters: { c1: { ...base.chapters.c1, choices: { D1: { letter: 'A' }, D2: { letter: 'A' }, D3: { letter: 'B' } }, found: ['X1', 'X2'] } } };
  r = MC.questRating(full, Q, 'c1', {}); assert.deepEqual([r.got, r.max, r.grade], [2 + 2 + 1 + 3 + 3 + 2 + 2, 16, 'S']);
  assert.equal(MC.questRating({ ...full, drills: { R1: { passed: false } } }, Q, 'c1', {}).got, 13, 'a core drill tried but not passed earns 1');
});
