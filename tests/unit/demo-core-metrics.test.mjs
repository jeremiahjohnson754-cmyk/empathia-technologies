#!/usr/bin/env node
// Unit tests for the numbers the core screens show (apps/demo/src/campus/metrics.ts): health, building and campus aggregates, the delivery
// spine and "where the room has moved" — each computed from the room records, the programme and the service workspace, never typed in.
//   node --test tests/unit/demo-core-metrics.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-core-'));
const entry = path.join(tmp, 'entry.ts');
const src = (p) => JSON.stringify(path.join(repo, 'apps/demo/src', p));
fs.writeFileSync(entry, `export * as M from ${src('campus/metrics.ts')}; export * as canon from ${src('campus/canon.ts')}; export * as design from ${src('campus/design.ts')}; export * as S from ${src('workspace/store.ts')};`);
await esbuild.build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: path.join(tmp, 'out.mjs'), logLevel: 'error' });
const { M, design, S, canon } = await import(pathToFileURL(path.join(tmp, 'out.mjs')).href);
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
const w = S.seed();
const recs = design.allRecords();

test('health: bands follow V2.5.3 (88+ healthy, 75–87 monitor, below action); a room without results is not scored', () => {
  assert.equal(M.bandOf(88), 'healthy'); assert.equal(M.bandOf(87), 'monitor'); assert.equal(M.bandOf(75), 'monitor'); assert.equal(M.bandOf(74), 'action'); assert.equal(M.bandOf(null), 'none');
  const nst = M.roomHealth(design.roomRecord('R-NST-2-101'), w);
  assert.equal(nst.score, null, 'the town hall record holds no test result');
  for (const r of recs) { const h = M.roomHealth(r, w); if (h.score != null) { assert.ok(h.score >= 0 && h.score <= 100, r.outline.id); assert.equal(h.score, 100 + h.parts.reduce((s, p) => s + p.points, 0) < 0 ? 0 : 100 + h.parts.reduce((s, p) => s + p.points, 0), `${r.outline.id} score is the sum of its stated parts`); } }
});

test('open issues: record issues plus live incidents, one per id, the live state wins', () => {
  const ref = design.roomRecord('R-ATL-4-218');
  const iss = M.roomIssues(ref, w);
  assert.ok(iss.some((i) => i.id === 'ISS-0417' && i.live && i.state === 'OPEN'), 'ISS-0417 is open in the service workspace');
  assert.ok(iss.some((i) => i.id === 'FND-4218-SIGHTLINE'));
  assert.equal(new Set(iss.map((i) => i.id)).size, iss.length);
  // closing the incident in the workspace removes it everywhere
  const w2 = structuredClone(w); w2.incidents.find((i) => i.id === 'ISS-0417').state = 'CLOSED';
  assert.ok(!M.roomIssues(ref, w2).some((i) => i.id === 'ISS-0417'));
  assert.ok(M.roomHealth(ref, w2).score > M.roomHealth(ref, w).score, 'health rises when the High incident closes');
});

test('building and campus aggregates add up from the rooms', () => {
  const c = M.campusStats(w);
  const N = canon.ROOMS.length; assert.equal(c.rooms, N); assert.equal(c.buildings.length, 6);
  assert.equal(c.buildings.reduce((s, b) => s + b.rooms, 0), N);
  assert.equal(c.buildings.reduce((s, b) => s + b.open, 0), c.open);
  assert.equal(c.buildings.reduce((s, b) => s + b.devices, 0), c.devices);
  assert.equal(c.healthy + c.monitor + c.action + c.unscored, N);
  const scores = recs.map((r) => M.roomHealth(r, w).score).filter((s) => s != null);
  assert.equal(c.score, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length));
  assert.equal(c.verified, recs.reduce((s, r) => s + r.counts.verified, 0));
});

test('delivery spine: nine stages Intake → Service, each read from a record', () => {
  const sp = M.spine(design.roomRecord('R-ATL-4-218'), w);
  assert.deepEqual(sp.map((s) => s.label), ['Intake', 'Design', 'Selection', 'Project', 'Procurement', 'Installation', 'Commissioning', 'Acceptance', 'Service']);
  const by = Object.fromEntries(sp.map((s) => [s.key, s]));
  assert.equal(by.intake.state, 'DONE'); assert.match(by.intake.detail, /REQ-0031/);
  assert.match(by.procurement.detail, /184,000 USD/);
  assert.equal(by.acceptance.state, 'BLOCKED', 'v2 is held by the engine');
  assert.equal(by.service.state, 'IN_PROGRESS');
  const designed = M.spine(design.roomRecord('R-ATL-7-112'), w);
  assert.equal(designed.find((s) => s.key === 'intake').state, 'NO_RECORD', 'no request is invented for a designed room');
  for (const r of recs) for (const s of M.spine(r, w)) assert.ok(['DONE', 'IN_PROGRESS', 'BLOCKED', 'NOT_STARTED', 'NO_RECORD'].includes(s.state));
});

test('where the room has moved: the reference camera replacement and the pending baseline', () => {
  const mv = M.moves(design.roomRecord('R-ATL-4-218'));
  assert.ok(mv.some((m) => m.kind === 'unit' && m.to === 'AS-0112'));
  assert.ok(mv.some((m) => m.kind === 'baseline' && /v2 pending/.test(m.to)));
  assert.deepEqual(M.moves(design.roomRecord('R-NST-2-101')), [], 'never accepted: nothing has moved since handover');
});

test('featured rooms start with the reference room and are unique', () => {
  const f = M.featuredRooms(8); assert.equal(f[0].id, 'R-ATL-4-218'); assert.equal(new Set(f.map((x) => x.id)).size, f.length); assert.equal(f.length, 8);
});

test('summary print (for the report)', () => {
  const c = M.campusStats(w);
  console.log(JSON.stringify({ score: c.score, scored: c.scored, healthy: c.healthy, monitor: c.monitor, action: c.action, unscored: c.unscored, open: c.open, devices: c.devices, verifiedPct: c.verifiedPct, buildings: c.buildings.map((b) => [b.b.key, b.score, b.rooms, b.open, b.verifiedPct]) }));
});
