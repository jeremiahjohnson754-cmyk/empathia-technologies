// The six SIGNAL drill kinds (packages/ui/src/drills.ts) against the founder's build package: docs/04-engine-specs.md §4 and the
// reference runtime (app.js drillRoute … drillOrder, recordDrill, shuffle, hashSeed). Restored 11 Nov 2026. Run on all 146 drills of
// packages/signal-canon/data/app-data.json, unedited.   node --test tests/unit/signal-drills.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'signal-drills-')), 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'packages/ui/src/drills.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const D = await import(pathToFileURL(out).href);
const app = JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data/app-data.json'), 'utf8'));
const all = app.drillOrder.map((id) => ({ ...app.drills[id], id }));
const of = (t) => all.filter((d) => d.type === t);
// the reference's own functions, verbatim in behaviour, to compare against
const refShuffle = (a, seed) => { a = a.slice(); let x = seed || 7; for (let i = a.length - 1; i > 0; i--) { x = (x * 9301 + 49297) % 233280; const j = Math.floor(x / 233280 * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
const refSeed = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000; return h + 11; };

test('SD-01 the library holds 146 drills of six kinds, in the reference’s counts', () => {
  const c = Object.fromEntries(['route', 'firstfail', 'clues', 'classmatch', 'order', 'triage'].map((t) => [t, of(t).length]));
  assert.deepEqual(c, { route: 13, firstfail: 27, clues: 20, classmatch: 30, order: 38, triage: 18 }); assert.equal(all.length, 146);
});

test('SD-02 the seeded shuffle is the reference’s, so every drill opens in the same order as there', () => {
  for (const d of all) { assert.equal(D.hashSeed(d.id), refSeed(d.id)); }
  for (const d of of('route')) assert.deepEqual(D.routePool(d), refShuffle(d.pool, refSeed(d.id)));
  for (const d of of('clues')) assert.deepEqual(D.clueOrder(d), refShuffle(d.clues.map((_, i) => i), refSeed(d.id)));
});

test('SD-03 an ordering never opens already in order, keeps every step once, and only the right order passes', () => {
  for (const d of of('order')) {
    const o = D.orderStart(d); assert.deepEqual([...o].sort((a, b) => a - b), d.items.map((_, i) => i), d.id); assert.ok(o.some((v, i) => v !== i), `${d.id} starts solved`);
    assert.equal(D.gradeOrder(d, d.items.map((_, i) => i)).pass, true, d.id); const g = D.gradeOrder(d, o); assert.equal(g.pass, false); assert.equal(g.lines.length, o.filter((v, i) => v !== i).length);
  }
  assert.deepEqual(D.move([0, 1, 2], 0, -1), [0, 1, 2]); assert.deepEqual(D.move([0, 1, 2], 1, 1), [0, 2, 1]);
});

test('SD-04 triage is scored against the best plan the budget allows (every subset keeping the commitments), not all the risk on the table', () => {
  let differs = 0;
  for (const d of of('triage')) {
    const best = D.triageBest(d); const total = d.items.reduce((n, it) => n + it.L * it.I, 0); if (best < total) differs += 1;
    // find a best plan by brute force and check it passes; skipping a commitment always fails; one over budget always fails
    let plan = null; for (let m = 0; m < 1 << d.items.length && !plan; m++) { const on = d.items.map((_, i) => i).filter((i) => m & (1 << i)); const t = D.triageTotals(d, on); if (t.cost <= d.budget && t.risk === best && d.items.every((it, i) => !it.must || on.includes(i))) plan = on; }
    assert.ok(plan, d.id); assert.equal(D.gradeTriage(d, plan).pass, true, `${d.id} best plan`);
    const must = d.items.findIndex((it) => it.must); if (must >= 0) assert.equal(D.gradeTriage(d, plan.filter((i) => i !== must)).pass, false, `${d.id} skipped commitment`);
    assert.equal(D.gradeTriage(d, d.items.map((_, i) => i)).pass, d.items.reduce((n, it) => n + it.cost, 0) <= d.budget, `${d.id} everything`);
  }
  assert.ok(differs > 0, 'on some drills the best plan retires less than everything on the table, which is why the rule matters');
});

test('SD-05 clues pass with enough key cards and no card that destroys evidence; a destroying card fails and says so', () => {
  for (const d of of('clues')) {
    const keys = d.clues.map((c, i) => [c, i]).filter(([c]) => c.k === 'key').map(([, i]) => i); const need = d.need || d.pick;
    assert.ok(keys.length >= need, d.id); const filler = d.clues.map((c, i) => [c, i]).filter(([c]) => c.k !== 'key' && c.k !== 'destroys').map(([, i]) => i);
    const good = [...keys.slice(0, need), ...filler].slice(0, d.pick); if (good.length === d.pick) assert.equal(D.gradeClues(d, good).pass, true, d.id);
    const dz = d.clues.findIndex((c) => c.k === 'destroys'); if (dz >= 0) { const g = D.gradeClues(d, [...keys.slice(0, d.pick - 1), dz]); assert.equal(g.pass, false); assert.match(g.lines[0], /destroys evidence/); }
  }
});

test('SD-06 class match offers the eight failure classes unless the drill sorts into its own groups; misses up to the allowance pass', () => {
  let eight = 0, own = 0;
  for (const d of of('classmatch')) {
    const { list, custom } = D.classesFor(d); if (custom) own += 1; else { eight += 1; assert.equal(list.length, 8); }
    for (const it of d.items) assert.ok(list.includes(it.c), `${d.id}: ${it.c} is offered`);
    const right = Object.fromEntries(d.items.map((it, i) => [i, it.c])); assert.equal(D.gradeClassmatch(d, right).pass, true);
    const wrong = { ...right }; for (let i = 0; i <= (d.allow || 0); i++) wrong[i] = list.find((c) => c !== d.items[i].c); assert.equal(D.gradeClassmatch(d, wrong).pass, false, d.id);
  }
  assert.ok(eight > 0 && own > 0, `${eight} on the eight classes, ${own} on their own groups`);
});

test('SD-07 route and first failure: only the canon’s answer passes, and every wrong answer says why and what was right', () => {
  for (const d of of('route')) { const right = Object.fromEntries(d.slots.map((s, i) => [i, s.answer])); assert.equal(D.gradeRoute(d, right).pass, true);
    const decoy = d.pool.find((p) => !d.slots.some((s) => s.answer === p)); const g = D.gradeRoute(d, { ...right, 0: decoy }); assert.equal(g.pass, false); assert.match(g.lines[0], new RegExp(`It should be ${d.slots[0].answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.match(D.gradeRoute(d, {}).lines[0], /left empty/); }
  for (const d of of('firstfail')) { assert.equal(D.gradeFirstfail(d, d.answer).pass, true); const w = (d.answer + 1) % d.stages.length; const g = D.gradeFirstfail(d, w); assert.equal(g.pass, false); assert.match(g.lines[1], new RegExp(`at ${d.stages[d.answer].name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)); }
});

test('SD-08 a try is recorded as the reference does: passed once stays passed, tries count, the first result never changes; the clock is the drill’s own, doubled relaxed, none off', () => {
  let r = D.recordDrill(undefined, false); r = D.recordDrill(r, true); r = D.recordDrill(r, false); assert.deepEqual(r, { passed: true, tries: 3, first: false });
  assert.deepEqual(D.readDrill({ passed: true, tries: 2, first: false }), { passed: true, tries: 2, first: false });
  for (const j of [null, {}, { passed: 'yes', tries: 1, first: true }, { passed: true, tries: 0, first: true }, { passed: true, tries: 1.5, first: true }]) assert.equal(D.readDrill(j), null, JSON.stringify(j));
  const d = all[0]; assert.equal(D.clockFor(d, 1), d.time); assert.equal(D.clockFor(d, 2), d.time * 2); assert.equal(D.clockFor(d, 0), null);
  assert.equal(D.fmt(95), '1:35'); assert.equal(D.fmt(-3), '0:00'); assert.equal(D.fmt(59.2), '1:00');
  assert.match(D.timeoutVerdict(d).lines[0], /not deciding is still a decision/);
});

test('SD-09 the rules hold where the canon’s own drills never reach: a shuffle that lands solved is reversed; need below pick; a destroying card among enough keys; the first result kept', () => {
  let id = null; for (let i = 0; i < 500 && !id; i++) { const c = `X-${i}`; if (refShuffle([0, 1, 2], refSeed(c)).every((v, k) => v === k)) id = c; }
  assert.ok(id, 'an id whose shuffle lands in order'); assert.deepEqual(D.orderStart({ id, type: 'order', items: ['a', 'b', 'c'], why: [] }), [2, 1, 0]);
  const cl = { id: 'X-C', type: 'clues', pick: 3, need: 2, clues: [{ t: 'k1', k: 'key', why: '' }, { t: 'k2', k: 'key', why: '' }, { t: 'w', k: 'weak', why: '' }, { t: 'zap', k: 'destroys', why: '' }] };
  assert.equal(D.gradeClues(cl, [0, 1, 2]).pass, true, 'two keys meet a need of two though three are picked');
  const g = D.gradeClues(cl, [0, 1, 3]); assert.equal(g.pass, false, 'enough keys, but evidence destroyed'); assert.match(g.lines[0], /destroys evidence/);
  assert.deepEqual(D.recordDrill(D.recordDrill(undefined, false), true), { passed: true, tries: 2, first: false });
});
