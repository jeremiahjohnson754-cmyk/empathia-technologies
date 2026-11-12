// SIGNAL live incidents (packages/ui/src/incidents.ts) against the founder's build package: docs/04-engine-specs.md §7, the reference
// runtime (app.js openIncident) and the package's own solver record (qa/incident-paths.json: for each of the 121 incidents a path that
// ends proven inside the clock, the seconds it takes, that declaring at the start fails, its boundary-ending actions and refusals).
// Restored 11 Nov 2026.   node --test tests/unit/signal-incidents.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'signal-incidents-')), 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'packages/ui/src/incidents.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const I = await import(pathToFileURL(out).href);
const data = path.join(repo, 'packages/signal-canon/data');
const app = JSON.parse(fs.readFileSync(path.join(data, 'app-data.json'), 'utf8'));
const paths = JSON.parse(fs.readFileSync(path.join(data, 'qa/incident-paths.json'), 'utf8'));
const incs = app.incidentOrder.map((id) => ({ ...app.incidents[id], id }));
const byId = (inc, id) => inc.actions.find((a) => a.id === id);
const play = (inc, ids, factor = 1) => ids.reduce((s, id) => { const a = byId(inc, id); assert.ok(a, `${inc.id}: action ${id}`); assert.ok(I.available(a, s) && !I.hidden(a, s), `${inc.id}: ${id} is open when the path reaches it`); return a.calc ? I.answerCalc(inc, s, a, a.calc.answer).state : I.act(inc, s, a); }, I.begin(inc, factor));

test('SI-01 every one of the 121 incidents ends proven on its recorded path, inside the clock, in the recorded seconds', () => {
  assert.equal(incs.length, 121); assert.equal(Object.keys(paths).length, 121);
  for (const inc of incs) { const p = paths[inc.id]; assert.ok(p, inc.id); assert.equal(p.clock, inc.clock, inc.id);
    const s = play(inc, p.path); assert.equal(s.over, false, `${inc.id} still running`); assert.equal(s.total - s.left, p.seconds, `${inc.id} seconds`);
    const e = I.declare(inc, s); assert.equal(e.end.outcome, 'proven', `${inc.id}: ${e.end.head}`); }
});

test('SI-02 declaring at the start fails every incident as declared while still broken; the boundary actions end it as a boundary failure', () => {
  let ends = 0;
  for (const inc of incs) { const p = paths[inc.id]; const d = I.declare(inc, I.begin(inc, 1)); assert.equal(d.end.outcome, p.declare_at_start, inc.id); assert.equal(d.end.why, 'declared'); if (!inc.heads?.fail) assert.match(d.end.head, /declared resolved while still broken/); else assert.equal(d.end.head, inc.heads.fail, 'an incident’s own headline replaces the generic one');
    for (const id of p.boundary_ends) { const a = byId(inc, id); const s0 = I.begin(inc, 1); if (!I.available(a, s0) || I.hidden(a, s0)) continue; const s = I.act(inc, s0, a); ends += 1;
      assert.equal(s.over, true); assert.equal(s.end.outcome, 'fail'); assert.equal(s.end.why, 'boundary'); assert.match(s.end.head, /boundary/); assert.equal(s.end.text, a.end); } }
  assert.ok(ends > 0);
});

test('SI-03 a refusal logs the reason, counts a boundary test, spends its time and moves trust, and the incident goes on', () => {
  let n = 0;
  for (const inc of incs) for (const id of paths[inc.id].refusals) { const a = byId(inc, id); const s0 = I.begin(inc, 1); if (!I.available(a, s0) || I.hidden(a, s0)) continue;
    const s = I.act(inc, s0, a); n += 1; assert.equal(s.over, false); assert.equal(s.boundary, 1); assert.equal(s.total - s.left, I.costOf(a, s0)); assert.ok(s.log.some((l) => l.text === `✕ ${a.stop}`));
    assert.equal(I.act(inc, s, a), s, `${inc.id}: a used action is not open again`); }
  assert.ok(n > 50, `${n} refusals reached from the start`);
});

test('SI-04 evidence lost is lost for good; trust stays within 0–5; `once: false` actions repeat; `not` flags close an action', () => {
  const inc = { id: 'X', title: 'x', domain: 'd', priority: 'p', page: '', brief: '', briefing: '', opening: 'go', clock: 100, deadline: 'DOORS', status: { a: { label: 'A', v: 'DOWN', ok: 'UP' } }, trust: { Crew: 4 }, evidence: { log: { l: 'the log', s: 'MEASURED' } }, win: { restored: ['a'], proven: ['p'] }, outcomes: { proven: 'P', partial: 'Q', fail: 'F' }, expert: [],
    actions: [{ id: 'wipe', label: 'Restart', cost: 5, text: 'gone', lose: ['log'], trust: { Crew: 3 } }, { id: 'read', label: 'Read the log', cost: 5, text: 'read', gain: ['log'], set: ['p'] }, { id: 'look', label: 'Look', cost: 1, text: 'looked', once: false }, { id: 'fix', label: 'Fix', cost: 10, text: 'fixed', status: { a: 'UP' }, not: ['p'] }] };
  let s = I.begin(inc, 1); s = I.act(inc, s, inc.actions[0]); assert.deepEqual([s.ev, s.lost, s.trust.Crew], [{}, { log: 1 }, 5]);
  s = I.act(inc, s, inc.actions[1]); assert.deepEqual(s.ev, {}, 'lost evidence cannot be gained back'); assert.equal(s.flags.p, 1);
  s = I.act(inc, s, inc.actions[2]); s = I.act(inc, s, inc.actions[2]); assert.equal(s.log.filter((l) => l.text === 'looked').length, 2);
  assert.equal(I.available(inc.actions[3], s), false, 'closed by its not flag'); assert.equal(I.declare(inc, s).end.outcome, 'fail');
  const u = I.act(inc, I.begin(inc, 1), inc.actions[3]); assert.equal(u.status.a, 'UP'); assert.equal(I.declare(inc, u).end.outcome, 'partial', 'restored but not proven');
  assert.deepEqual(I.begin({ ...inc, startEv: ['log'] }, 1).ev, { log: 1 }, 'an incident can start with evidence on the board');
  const t = I.begin({ ...inc, trust: { Crew: 0 } }, 1); assert.equal(I.act(inc, t, { ...inc.actions[0], id: 'z', trust: { Crew: -2 } }).trust.Crew, 0);
});

test('SI-05 the clock: actions and seconds spend it; running out ends the incident; relaxed doubles it; off never ends it', () => {
  const inc = incs[0]; let s = I.begin(inc, 1); assert.equal(s.total, inc.clock); assert.equal(I.begin(inc, 2).total, inc.clock * 2);
  s = I.tick(inc, s, inc.clock - 1); assert.equal(s.over, false); s = I.tick(inc, s, 1); assert.equal(s.over, true); assert.equal(s.end.why, 'clock'); assert.match(s.end.head, /clock ran out/);
  const off = I.tick(inc, I.begin(inc, 0), inc.clock * 3); assert.equal(off.over, false); assert.equal(I.debrief(inc, off).clockLeft, 'timer off');
});

test('SI-06 a calculation: right within tolerance runs the action; wrong costs the penalty and does not run it', () => {
  const found = incs.flatMap((inc) => inc.actions.filter((a) => a.calc).map((a) => [inc, a])); assert.ok(found.length > 0, 'incidents carry calculations');
  for (const [inc, a] of found) { const c = a.calc; assert.equal(I.calcRight(c, c.answer), true); const tol = c.tol != null ? c.tol : Math.abs(c.answer) * 0.02; assert.equal(I.calcRight(c, c.answer + tol * 2 + 1), false);
    let s = I.begin(inc, 1); for (const id of paths[inc.id].path) { if (id === a.id) break; const b = byId(inc, id); s = b.calc ? I.answerCalc(inc, s, b, b.calc.answer).state : I.act(inc, s, b); }
    if (!I.available(a, s) || I.hidden(a, s)) continue;
    const w = I.answerCalc(inc, s, a, c.answer + tol * 2 + 1); assert.equal(w.right, false); assert.equal(w.state.used[a.id], undefined); assert.equal(s.left - w.state.left, c.penalty || 10); }
});

test('SI-07 the record keeps the best outcome and the first, with why it ended; the debrief grid is the reference’s', () => {
  let r = I.recordIncident(undefined, 'fail', 'clock'); r = I.recordIncident(r, 'proven', 'declared'); r = I.recordIncident(r, 'partial', 'declared');
  assert.deepEqual(r, { best: 'proven', runs: 3, first: 'fail', firstWhy: 'clock' });
  assert.deepEqual(I.readIncident(r), r); for (const j of [null, {}, { ...r, best: 'won' }, { ...r, runs: 0 }, { ...r, firstWhy: 'x' }]) assert.equal(I.readIncident(j), null, JSON.stringify(j));
  const inc = incs[0]; const s = I.declare(inc, play(inc, paths[inc.id].path)); const d = I.debrief(inc, s);
  assert.deepEqual([d.service, d.proof, d.boundaries], ['Restored', 'Proven', '0 tested']); assert.ok(I.TRUST_WORDS.includes(d.trust)); assert.ok(d.lessons.length > 0 && d.lessons.every((l) => /^[✓✕] /.test(l)));
});
