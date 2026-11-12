// SIGNAL boss levels (packages/ui/src/boss.ts) against the founder's build package: docs/04-engine-specs.md §12, the reference runtime
// chal_boss.js and its QA (qa/chaltest.log "boss S01…S12 cleared"; qa/chalboss.log). Every one of the twelve bosses clears on the intended
// answers — the trace in order, the right calls, each challenge stage passed with the recipe at the season's level, and from Season 8 the
// commission (every must-ask question within the budget, the scope, the best design, the exact estimate and the intended savings) — and
// every way of failing ends the run. Restored 12 Nov 2026.   node --test tests/unit/signal-boss.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { recipes } from '../fixtures/signal-challenge-recipes.mjs';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'signal-boss-'));
for (const [n, e] of [['b', 'packages/ui/src/boss.ts'], ['c', 'packages/ui/src/challenges/index.ts']]) await esbuild.build({ entryPoints: [path.join(repo, e)], bundle: true, format: 'esm', platform: 'node', outfile: path.join(dir, `${n}.mjs`), logLevel: 'error' });
const B = await import(pathToFileURL(path.join(dir, 'b.mjs')).href), C = await import(pathToFileURL(path.join(dir, 'c.mjs')).href), R = recipes(C);
const BOSSES = JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data/app-data.json'), 'utf8')).bosses;
const IDS = Object.keys(BOSSES);

/** Play one stage on its intended answer; returns the outcome. */
function playRight(boss, s) {
  if (s.type === 'trace') { let d = 0, out; for (let k = 0; k < s.items.length; k += 1) ({ done: d, out } = B.traceTap(s, d, k)); return out; }
  if (s.type === 'call') return B.callPick(s.opts.find((o) => o.ok));
  if (s.type === 'chal') { if (s.chal === 'reach-cues') return playCues(boss.lv); const ch = C.byId(s.chal), r = ch.evaluate({ ...ch.init(boss.lv), ...R[s.chal](boss.lv) }, boss.lv), sc = C.scoreResult(r); return sc.passed ? { ok: true } : { ok: false, title: C.headline(r), why: '' }; }
  if (s.type === 'ask') { let a = B.askStart(s); const want = new Set(); for (const q of s.qs) if (q.kind === 'must') { if (q.after) want.add(q.after); want.add(q.id); }
    for (const id of s.qs.map((q) => q.id).filter((id) => want.has(id))) { const r = B.askQuestion(s, a, id); a = r.state; if (r.out) return r.out; } return B.askClose(s, a).out; }
  if (s.type === 'scope') return B.scopeIssue(s, s.items.map((it) => it.c));
  if (s.type === 'design') return B.designIssue(s, bestDesign(s));
  if (s.type === 'cost') { const e = B.costEstimate(s, B.estimate(s).T); if (!e.ok) return e; return B.costPresent(s, (s.ve || []).map((v) => !!v.pick)); }
  throw new Error(s.type);
}
const bestDesign = (s) => Object.fromEntries(s.slots.map((sl) => [sl.id, sl.opts.findIndex((o) => o.best)]));
function playCues(lv) { const Q = C.Reach, S = Q.song(lv), W = Q.windows(1), keys = { 1: [3, 1, 5, 3, 8, 7], 2: [3, 1, 4, 5, 8, 3, 5, 7], 3: [2, 1, 4, 5, 8, 3, 8, 5, 7], 4: [2, 1, 4, 5, 8, 3, 8, 5, 7] }[lv]; let r = Q.cueStart(S), i = 0;
  for (let t = 0; t <= S.len; t += 1 / 60) { while (i < S.cues.length && t >= S.cues[i].t + 0.02) { r = Q.cueFire(S, r, keys[i], t, lv, W); i += 1; } r = Q.cueTick(S, r, t, W); } return C.scoreResult(Q.cueFinish(S, r, lv, W)).passed ? { ok: true } : { ok: false }; }

for (const id of IDS) test(`${id}: the intended run clears every stage`, () => {
  const boss = BOSSES[id]; let rec = B.beginRun(undefined);
  boss.steps.forEach((s, i) => { const out = playRight(boss, s); assert.ok(out && out.ok, `${id} stage ${i + 1} (${B.stepMode(s)}): ${out && out.title} ${out && out.why}`); rec = B.reached(rec, i + 1); });
  rec = B.won(rec, boss, 1); assert.deepEqual(rec, { tries: 1, passed: true, best: boss.steps.length, at: 1, firstRun: 1 });
});
test('the shape matches the spec: a trace, five challenges in five modes, two or three calls; a commission from Season 8', () => {
  for (const id of IDS) { const b = BOSSES[id], t = (k) => b.steps.filter((s) => s.type === k);
    assert.equal(t('trace').length, 1, id); assert.equal(t('chal').length, 5, id); assert.deepEqual(new Set(t('chal').map((s) => s.mode)), new Set(['hear', 'see', 'reach', 'build', 'record']), id); assert.ok(t('call').length >= 2 && t('call').length <= 3, id);
    assert.equal(B.hasCommission(b), b.se >= 8, id); for (const s of t('chal')) assert.equal(C.byId(s.chal).mode, s.mode, `${id} ${s.chal}`); }
});
test('timers per stage and level follow §12, times the factor; none when timers are off', () => {
  const b = (lv) => ({ lv }); const per = { call: [25, 20, 16, 12], trace: [60, 50, 42, 35], chal: [300, 260, 220, 190], ask: [170, 160, 150, 140], scope: [120, 115, 110, 110], design: [280, 280, 280, 300], cost: [240, 240, 240, 230] };
  for (const [type, secs] of Object.entries(per)) for (const lv of [1, 2, 3, 4]) { assert.equal(B.stageSecs(b(lv), { type }, 1), secs[lv - 1], `${type} L${lv}`); assert.equal(B.stageSecs(b(lv), { type }, 2), 2 * secs[lv - 1]); assert.equal(B.stageSecs(b(lv), { type }, 0), 0); }
  for (const id of IDS) for (const s of BOSSES[id].steps) if (s.secs) assert.equal(B.stageSecs(BOSSES[id], s, 1), s.secs);
  assert.equal(B.lowClock(10, 25), true); assert.equal(B.lowClock(11, 25), false); assert.equal(B.lowClock(45, 300), true); assert.equal(B.lowClock(46, 300), false);
});
test('a wrong tap in the trace ends the run, and says where the signal goes', () => { for (const id of IDS) { const s = BOSSES[id].steps.find((x) => x.type === 'trace'); const r = B.traceTap(s, 1, 2); assert.equal(r.out.ok, false); assert.equal(r.out.title, 'Lost the trace'); assert.match(r.out.why, new RegExp(`After “${s.items[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}”`)); assert.equal(r.done, 1); } });
test('every wrong call ends the run with its own reason', () => { for (const id of IDS) for (const s of BOSSES[id].steps.filter((x) => x.type === 'call')) { assert.equal(s.opts.filter((o) => o.ok).length, 1, id); for (const o of s.opts.filter((x) => !x.ok)) { const r = B.callPick(o); assert.equal(r.ok, false); assert.equal(r.title, 'Wrong call'); assert.equal(r.why, o.why); } } });
const commission = (type) => IDS.filter((id) => BOSSES[id].se >= 8).map((id) => [id, BOSSES[id].steps.find((s) => s.type === type)]);
test('ask: a trap question ends the meeting at once', () => { for (const [id, s] of commission('ask')) for (const q of s.qs.filter((x) => x.kind === 'trap' && !x.after)) { const r = B.askQuestion(s, B.askStart(s), q.id); assert.equal(r.out?.title, 'Wrong question', id); assert.equal(r.state.done, true); } });
test('ask: closing without a must-ask question ends the run; follow-ups open only after their question', () => { for (const [id, s] of commission('ask')) {
  const r = B.askClose(s, B.askStart(s)); assert.equal(r.out.title, 'Needs missed', id); assert.match(r.out.why, /more must-ask question/);
  const fu = s.qs.find((q) => q.after); assert.ok(!B.askOpen(s, B.askStart(s)).includes(fu)); assert.equal(B.askQuestion(s, B.askStart(s), fu.id).state.asked.length, 0);
  let a = B.askStart(s); a = B.askQuestion(s, a, fu.after).state; assert.ok(B.askOpen(s, a).includes(fu));
} });
test('ask: spending the budget on waste closes the meeting short of the must-asks', () => { for (const [id, s] of commission('ask')) { let a = B.askStart(s), out; const filler = s.qs.filter((q) => q.kind !== 'trap' && q.kind !== 'must' && !q.after);
  for (const q of [...filler, ...filler]) { const r = B.askQuestion(s, a, q.id); a = r.state; out = r.out || out; if (a.done) break; }
  if (filler.length >= s.slots) assert.equal(out.title, 'Needs missed', id); else assert.equal(a.left, s.slots - filler.length); } });
test('scope: slips beyond the allowance end the run; one allowed slip is named', () => { for (const [id, s] of commission('scope')) {
  const wrong = s.items.map((it) => s.groups.find((g) => g !== it.c)); assert.equal(B.scopeIssue(s, wrong).title, 'Scope wrong', id);
  const one = s.items.map((it, i) => (i === 0 ? s.groups.find((g) => g !== it.c) : it.c)), r = B.scopeIssue(s, one);
  if (s.allow) { assert.equal(r.ok, true); assert.match(r.msg, /One slip/); } else assert.equal(r.ok, false);
} });
test('design: any boundary-crossing option ends the run; so does a missed requirement or a broken limit', () => { for (const [id, s] of commission('design')) {
  const best = bestDesign(s);
  for (const [k, sl] of s.slots.entries()) sl.opts.forEach((o, j) => { if (!o.bad) return; const r = B.designIssue(s, { ...best, [sl.id]: j }); assert.equal(r.title, 'Boundary crossed', `${id} ${k}`); assert.equal(r.why, o.bad); });
  let broke = 0; for (const sl of s.slots) sl.opts.forEach((o, j) => { if (o.best || o.bad) return; const r = B.designIssue(s, { ...best, [sl.id]: j }); if (!r.ok) { broke += 1; assert.equal(r.title, 'Design rejected'); } });
  assert.ok(broke > 0, `${id}: some non-best option must fail`);
  assert.equal(B.designIssue(s, {}).ok, false);
} });
test('design: limits read max, min and a multiple of another total', () => {
  const t = { w: 100, z: 40 }; assert.equal(B.limitOk({ k: 'w', max: 100 }, t), true); assert.equal(B.limitOk({ k: 'w', max: 99 }, t), false); assert.equal(B.limitOk({ k: 'w', min: 101 }, t), false); assert.equal(B.limitOk({ k: 'w', min: 100 }, t), true);
  assert.equal(B.limitOk({ k: 'w', maxk: 'z', mult: 2.5 }, t), true); assert.equal(B.limitOk({ k: 'w', maxk: 'z', mult: 2.4 }, t), false); assert.equal(B.limitValue({ k: 'w', scale: 3.412 }, t), 341.2);
});
test('cost: the estimate matches the build package’s own check, and only a total within tolerance passes', () => { for (const [id, s] of commission('cost')) {
  const E = B.estimate(s); assert.ok(Math.abs(E.T - s._check.T) < 1e-6, id); assert.deepEqual(E.S, s._check.sums);
  assert.equal(B.costEstimate(s, E.T + s.tol).ok, true); assert.equal(B.costEstimate(s, E.T + s.tol + 1).title, 'Estimate wrong'); assert.match(B.costEstimate(s, 1).why, /The estimate is/);
} });
test('cost: cutting a requirement or staying over the budget ends the run', () => { for (const [id, s] of commission('cost')) {
  const hurt = s.ve.findIndex((v) => v.hurts); assert.ok(hurt >= 0); const on = s.ve.map((v) => !!v.pick); on[hurt] = true; assert.equal(B.costPresent(s, on).title, 'Requirement cut', id);
  if (B.estimate(s).T > s.budget) assert.equal(B.costPresent(s, s.ve.map(() => false)).title, 'Over budget', id);
} });
test('cost: typed totals read dollar signs, commas and spaces', () => { assert.equal(B.parseTotal('$140,140'), 140140); assert.equal(B.parseTotal(' 97 850.5 '), 97850.5); assert.equal(B.parseTotal('about 9k'), null); assert.equal(B.parseTotal(''), null); });
test('every stage has a time-out with its reference wording', () => { const seen = new Set(); for (const id of IDS) for (const s of BOSSES[id].steps) { const r = B.timeoutOutcome(s); assert.equal(r.ok, false); seen.add(r.title); } assert.deepEqual([...seen].sort(), ['No call made', 'Out of time']); });
test('records: runs count up, the furthest stage is kept, a pass is kept', () => {
  let r = B.beginRun(undefined); r = B.reached(r, 3); r = B.beginRun(r); r = B.reached(r, 1); assert.deepEqual(r, { tries: 2, passed: false, best: 3 });
  assert.deepEqual(B.readBoss({ tries: 2.7, passed: 'yes', best: -1 }), { tries: 2, passed: false, best: 0 }); assert.equal(B.readBoss({ tries: 'x' }), null); assert.equal(B.readBoss(null), null);
});
// Synthetic boundaries the canon data cannot reach on its own (found by mutation testing, 12 Nov).
test('ask: the last question in the budget closes the meeting', () => {
  const s = { type: 'ask', slots: 2, qs: [{ id: 'a', q: 'A?', a: '', kind: 'good' }, { id: 'b', q: 'B?', a: '', kind: 'waste' }, { id: 'm', q: 'M?', a: '', kind: 'must', why: 'It decides the design.' }] };
  let r = B.askQuestion(s, B.askStart(s), 'a'); assert.equal(r.state.done, false); r = B.askQuestion(s, r.state, 'b'); assert.equal(r.state.done, true); assert.equal(r.out.title, 'Needs missed');
  r = B.askQuestion(s, B.askStart(s), 'm'); r = B.askQuestion(s, r.state, 'a'); assert.equal(r.out.ok, true); assert.equal(B.askQuestion(s, r.state, 'b').state, r.state);
});
test('design: a requirement no chosen block meets rejects the design', () => {
  const s = { type: 'design', needs: [{ id: 'x', label: 'X', why: 'Asked for.' }], limits: [], slots: [{ id: 'one', label: 'One', opts: [{ n: 'Meets', meets: ['x'] }, { n: 'Does not', meets: [] }] }] };
  assert.equal(B.designIssue(s, { one: 0 }).ok, true); const r = B.designIssue(s, { one: 1 }); assert.equal(r.title, 'Design rejected'); assert.match(r.why, /Requirement not met — X/);
});
test('records: the run that first cleared the boss is kept', () => { let r = B.beginRun(undefined); r = B.beginRun(r); r = B.won(r, { steps: [1, 2] }, 5); assert.equal(r.firstRun, 2); r = B.won(B.beginRun(r), { steps: [1, 2] }, 6); assert.equal(r.firstRun, 2); assert.equal(r.tries, 3); });
