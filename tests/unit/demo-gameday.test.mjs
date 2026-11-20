// Game day (Surpass §20, W16): the event state machine as pure functions. Phases in order, data that changes with each phase, faults
// against real stadium records, steps that cannot be skipped, independent verification, holds that really stop kick-off, and a public
// view that never carries infrastructure.   node --test tests/unit/demo-gameday.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-gameday-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as G from './gameday/engine.ts'; export * as S from './estate/stadium.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const { G, S } = await import(pathToFileURL(out).href);
const must = (r) => { assert.ok(r.ok, r.why); return r.state; };
const run = (g, n) => { for (let i = 0; i < n; i += 1) g = must(G.advance(g)); return g; };

test('GD-01 eight phases in order, from before doors to strike, and the clean day runs through them all', () => {
  assert.deepEqual([...G.PHASES], ['pre-open', 'gates', 'warmup', 'first-half', 'halftime', 'second-half', 'exit', 'strike']);
  const end = run(G.start(), 7); assert.equal(end.phase, 'strike'); assert.equal(G.advance(end).ok, false); assert.equal(end.log.length, 8);
});
test('GD-02 every phase changes the data: attendance, concourse load, staffing, queues and the programme feed', () => {
  let g = G.start(); const seen = [];
  for (let i = 0; i < 8; i += 1) { const n = G.numbers(g); seen.push([n.inside, n.concoursePct, n.staffTotal, n.program, G.gates(g).map((x) => x.queueMin).join()].join('|')); if (i < 7) g = must(G.advance(g)); }
  assert.equal(new Set(seen).size, 8); assert.equal(G.numbers(G.start()).inside, 0); assert.equal(G.numbers(run(G.start(), 3)).program, 'LIVE'); assert.ok(G.numbers(run(G.start(), 3)).inside > 60000 * 0.95);
});
test('GD-03 the seat count and every fault’s room are the stadium estate’s own records', () => {
  assert.equal(G.SEATS, S.SEATS); const ids = new Set(S.STADIUM.nodes.map((n) => n.id)); for (const [k, f] of Object.entries(G.FAULTS)) assert.ok(ids.has(f.room), `${k} → ${f.room}`);
});
test('GD-04 a critical fault holds kick-off until it is fixed; a minor one does not', () => {
  let g = run(G.start(), 2); g = must(G.inject(g, 'suite-9-display')); assert.deepEqual(G.holds(g), []);
  g = must(G.inject(g, 'pa-upper')); const r = G.advance(g); assert.equal(r.ok, false); assert.match(r.why, /Upper bowl announcements/); assert.equal(G.report(g).held, true);
  const id = g.incidents.find((i) => i.fault === 'pa-upper').id; g = must(G.respond(g, id, 'ACKNOWLEDGED', 'Venue AV engineer')); g = must(G.respond(g, id, 'DISPATCHED', 'Venue AV engineer')); assert.equal(G.advance(g).ok, false);
  g = must(G.respond(g, id, 'FIXED', 'Venue AV engineer')); assert.equal(G.systems(g).pa, 'AWAITING_CHECK'); g = must(G.advance(g)); assert.equal(g.phase, 'first-half');
});
test('GD-05 steps cannot be skipped, and a fix is verified by someone else', () => {
  let g = must(G.inject(G.start(), 'ribbon-east')); const id = g.incidents[0].id;
  assert.equal(G.respond(g, id, 'FIXED', 'a').ok, false); assert.equal(G.respond(g, 'GD-999', 'ACKNOWLEDGED', 'a').ok, false);
  for (const s of ['ACKNOWLEDGED', 'DISPATCHED', 'FIXED']) g = must(G.respond(g, id, s, 'Venue AV engineer'));
  const self = G.respond(g, id, 'VERIFIED', 'Venue AV engineer'); assert.equal(self.ok, false); assert.match(self.why, /someone other/);
  g = must(G.respond(g, id, 'VERIFIED', 'Venue operations lead')); assert.equal(G.systems(g).ribbons, 'OK'); assert.equal(G.numbers(g).openIncidents, 0); assert.equal(G.respond(g, id, 'VERIFIED', 'x').ok, false);
});
test('GD-06 a gate fault changes what the public is told, and the public view carries no rooms, systems or incidents', () => {
  let g = run(G.start(), 1); const before = G.publicView(g); g = must(G.inject(g, 'gate-c-scanners')); const after = G.publicView(g);
  assert.ok(after.gates.find((x) => x.gate === 'C').queueMin > before.gates.find((x) => x.gate === 'C').queueMin + 10); assert.match(after.notes.join(' '), /Gate D/); assert.notEqual(after.best.gate, 'C');
  g = must(G.inject(g, 'program-return')); g = must(G.inject(g, 'ribbon-east')); const text = JSON.stringify(G.publicView(g));
  assert.ok(!/STA-|GD-0|ribbon|programme return|commentary|broadcast|incident|rack|network/i.test(text), text);
});
test('GD-07 the same fault cannot be opened twice, nothing fails after strike, and the crew cannot stand down with work unverified', () => {
  let g = must(G.inject(run(G.start(), 5), 'suite-9-display')); assert.equal(G.inject(g, 'suite-9-display').ok, false); g = must(G.advance(g)); assert.equal(g.phase, 'exit');
  const r = G.advance(g); assert.equal(r.ok, false); assert.match(r.why, /not yet verified/);
  const id = g.incidents[0].id; for (const s of ['ACKNOWLEDGED', 'DISPATCHED', 'FIXED']) g = must(G.respond(g, id, s, 'a')); g = must(G.respond(g, id, 'VERIFIED', 'b')); g = must(G.advance(g)); assert.equal(G.inject(g, 'pa-upper').ok, false);
});
test('GD-08 the engine is deterministic and never mutates the state it is given', () => {
  const a = G.start(); const frozen = JSON.stringify(a); const b = must(G.inject(must(G.advance(a)), 'pa-upper')); assert.equal(JSON.stringify(a), frozen);
  assert.deepEqual(must(G.inject(must(G.advance(G.start())), 'pa-upper')), b);
});
test('GD-09 the readiness report is computed from the state and says when the next phase is held', () => {
  let g = must(G.inject(run(G.start(), 2), 'program-return')); const r = G.report(g); assert.match(r.title, /warm-up \(T-45 min\)/); assert.ok(r.lines.some((l) => /Broadcast programme chain: degraded/.test(l))); assert.ok(r.lines.some((l) => /^Next phase held/.test(l)));
  assert.ok(G.report(G.start()).lines.every((l) => !/held/.test(l)));
});
// Added 10 Nov 2026 with the camera feed incident (gameday/signal). Additive: every check above is unchanged.
test('GD-10 the camera feed fault is a critical broadcast fault against the camera platform’s own estate record, holds kick-off, and tells guests nothing', () => {
  const f = G.FAULTS['camera-feed']; assert.equal(f.severity, 'critical'); assert.equal(f.system, 'broadcast'); assert.equal(f.owner, 'broadcast'); assert.equal(f.publicNote, null);
  const room = S.STADIUM.nodes.find((n) => n.id === f.room); assert.equal(room.type, 'camera-position'); assert.equal(room.access, 'staff'); assert.ok(S.STADIUM.assets.some((a) => a.room === f.room && a.kind === 'camera'));
  const g = must(G.inject(run(G.start(), 2), 'camera-feed')); assert.equal(G.systems(g).broadcast, 'DEGRADED'); assert.equal(G.advance(g).ok, false); assert.match(G.holds(g).join(' '), /Camera 3/);
  assert.deepEqual(G.publicView(g).notes, []); assert.ok(!/camera|STA-|GD-0/i.test(JSON.stringify(G.publicView(g))));
});
test('GD-11 a step can be recorded with words (what was done, the evidence named); a step without them leaves the record exactly as it was before', () => {
  const g = must(G.inject(G.start(), 'ribbon-east')); const id = g.incidents[0].id;
  const plain = must(G.respond(g, id, 'ACKNOWLEDGED', 'a')); assert.equal('notes' in plain.incidents[0], false); assert.equal(plain.log[plain.log.length - 1].text, `${id} acknowledged by a.`);
  const noted = must(G.respond(plain, id, 'DISPATCHED', 'a', '  procedure:   swap the processor.  ')); assert.deepEqual(noted.incidents[0].notes, { DISPATCHED: 'procedure: swap the processor' }); assert.equal(noted.log[noted.log.length - 1].text, `${id} dispatched by a: procedure: swap the processor.`);
  const next = must(G.respond(noted, id, 'FIXED', 'a')); assert.deepEqual(next.incidents[0].notes, { DISPATCHED: 'procedure: swap the processor' }, 'earlier words are kept');
  assert.equal(must(G.respond(next, id, 'VERIFIED', 'b', 'x'.repeat(900))).incidents[0].notes.VERIFIED.length, 400);
});
