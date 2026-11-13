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
fs.writeFileSync(entry, `export * as M from ${src('campus/metrics.ts')}; export * as canon from ${src('campus/canon.ts')}; export * as design from ${src('campus/design.ts')}; export * as S from ${src('workspace/store.ts')}; export * as MI from ${src('campus/mission.ts')};`);
await esbuild.build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: path.join(tmp, 'out.mjs'), logLevel: 'error' });
const { M, design, S, canon, MI } = await import(pathToFileURL(path.join(tmp, 'out.mjs')).href);
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
  // 10 Nov 2026: 45 → 90 and 2 → 7 sites. The Enterprise estate now holds the founder's 90 rooms (docs/surpass/ENTERPRISE_90_ROOMS.md): the 45
  // of the plan unchanged, then rows 46–90 on the campus and five more fictional sites. Every screen shows all of them.
  const N = canon.CAMPUS_ROOMS.length; assert.equal(N, 140);   // 13 Nov 2026: + V2.5.3's 50 rooms the estate lacked (founder: "use as many of v2.5.3's rooms as you can"): 90 → 140
  assert.equal(c.rooms, N); assert.equal(c.buildings.length, 6); assert.equal(c.sites.length, 7);
  const all = [...c.buildings, ...c.sites];
  assert.equal(all.reduce((s, b) => s + b.rooms, 0), N);
  assert.equal(all.reduce((s, b) => s + b.open, 0), c.open);
  assert.equal(all.reduce((s, b) => s + b.devices, 0), c.devices);
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

test('Mission Control: every room sits on exactly one station of the flow; intake counts the requests', () => {
  const st = MI.flow(w, null, recs);
  assert.deepEqual(st.map((s) => s.key), ['intake', 'design', 'procurement', 'installation', 'commissioning', 'acceptance', 'service', 'operating']);
  assert.equal(st.filter((s) => s.key !== 'intake').reduce((n, s) => n + s.count, 0), recs.length);
  assert.equal(st[0].count, 2, 'the two programme requests');
  assert.equal(MI.flow(w, { code: 'RB-1', name: 'Draft' }, recs)[0].count, 3, 'a Build a Room draft joins intake');
  assert.equal(st.find((s) => s.key === 'acceptance').rooms[0].id, 'R-ATL-4-218', 'the reference room waits at acceptance (v2 pending)');
  const w2 = structuredClone(w); for (const i of w2.incidents) i.state = 'CLOSED';
  assert.ok(MI.flow(w2, null, recs).find((s) => s.key === 'service').count < st.find((s) => s.key === 'service').count, 'closing the live requests moves rooms out of Service');
});

test('Mission Control: priorities name whose work they are; View as changes what comes first; nothing the role cannot open', () => {
  const all = MI.priorities(w, recs);
  assert.ok(all.length > 3); assert.equal(new Set(all.map((p) => p.id)).size, all.length, 'one row per record');
  assert.ok(all.every((p) => ['Take action', 'Resume', 'Review'].includes(p.verb) && p.href.startsWith('#/') && p.whose.length));
  const tri = all.find((p) => p.id === 'ISS-0417'); assert.equal(tri.verb, 'Take action'); assert.equal(tri.tone, 'bad');
  assert.equal(all.find((p) => p.id === 'ISS-0421').verb, 'Resume', 'a triaged request is resumed, not triaged again');
  const yes = () => true;
  const sm = MI.prioritiesFor('svcmgr', yes, all), ex = MI.prioritiesFor('exec', yes, all);
  assert.ok(sm.mine.some((p) => p.id === 'ISS-0417') && !ex.mine.some((p) => p.id === 'ISS-0417'), 'triage is the service manager’s, not the executive’s');
  assert.ok(ex.mine.some((p) => p.id === 'PRJ-NST-TH'), 'funding the approved project is the executive’s');
  assert.equal(MI.prioritiesFor('visitor', () => false, all).mine.length + MI.prioritiesFor('visitor', () => false, all).others.length, 0, 'an address the role cannot open is never offered (D44)');
  const order = { bad: 0, warn: 1, info: 2 }; for (let i = 1; i < all.length; i++) assert.ok(order[all[i - 1].tone] <= order[all[i].tone], 'most severe first');
});

test('Mission Control: series are month-end counts from dated records; incidents, active rooms and the insight follow the workspace', () => {
  const S12 = MI.series(w, 12, recs);
  for (const k of ['verified', 'accepted', 'activity', 'requests']) { assert.equal(S12[k].values.length, 12); assert.ok(S12[k].values.every((v) => Number.isInteger(v) && v >= 0)); }
  for (let i = 1; i < 12; i++) assert.ok(S12.verified.values[i] >= S12.verified.values[i - 1], 'cumulative verified never falls');
  assert.equal(S12.verified.values[11], recs.reduce((n, r) => n + r.events.filter((e) => e.type === 'commission.result_verified').length, 0));
  const inc = MI.incidents(w); assert.equal(inc.length, w.incidents.length); assert.ok(inc[0].live, 'live requests first');
  assert.ok(MI.activeRooms(w, recs).some((a) => a.id === 'R-ATL-4-218'));
  assert.match(MI.insight(w, recs).text, /2 live service requests/);
  assert.equal(MI.savedWork(w, null).length, 0); assert.equal(MI.savedWork(w, { code: 'RB-1', name: 'Huddle', createdAt: new Date().toISOString() })[0].href, '#/v25/build');
});

test('room facts: positions and models (device classes), declared PoE against the switch budget, modeled camera coverage, drift dimensions', () => {
  const F = M.roomFacts(design.roomRecord('R-ATL-4-218'));
  assert.equal(F.positions, 11); assert.ok(F.models >= 5 && F.models <= F.positions);
  assert.ok(F.poe && F.poe.draw > 0 && F.poe.budget === 370 && /declared/.test(F.poe.source), JSON.stringify(F.poe));
  assert.ok(F.coverage && F.coverage.seats > 0 && F.coverage.covered <= F.coverage.seats && /modeled/i.test(F.coverage.source), JSON.stringify(F.coverage));
  assert.ok(F.drift.dimensions >= 2 && F.drift.items.includes('a unit replaced'));
  const nst = M.roomFacts(design.roomRecord('R-NST-2-101')); assert.equal(nst.positions, 0, 'the earlier town hall record holds no device positions; none are invented'); assert.equal(nst.poe, null); assert.equal(nst.drift.dimensions, 0, 'never handed over: no drift');
  for (const r of recs) { const f = M.roomFacts(r); assert.ok(f.models <= f.positions); if (f.poe) assert.ok(f.poe.draw >= 0); }
});

test('summary print (for the report)', () => {
  const c = M.campusStats(w);
  console.log(JSON.stringify({ score: c.score, scored: c.scored, healthy: c.healthy, monitor: c.monitor, action: c.action, unscored: c.unscored, open: c.open, devices: c.devices, verifiedPct: c.verifiedPct, buildings: c.buildings.map((b) => [b.b.key, b.score, b.rooms, b.open, b.verifiedPct]) }));
});
