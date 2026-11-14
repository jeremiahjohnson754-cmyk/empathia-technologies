// Training and simulation never touch the real record (founder, 13 Nov 2026, 16:38: "the security boundary review should include
// negative authorization tests—especially ensuring that training simulations can't modify real ServiceHands incidents or tenant
// data"). The demonstration's side, run on its own code: every training and simulation entry point (the SIGNAL game-day incident,
// drills, the Learn case flow, the Field Intelligence simulated run) is driven by every role, and the operational record — ServiceHands
// incidents, work orders, APEX cases, staff, stock, bookings, licences, adapters — must come out byte-for-byte the same. Only the
// simulation's own state and the append-only ledger may change, and nothing a trainee does can name or move a real incident.
// The API's side (tenant data in Postgres) is tests/security/training-isolation.test.mjs; the pages' side (labs, SIGNAL episodes, Service
// Mode, a timed drill, run in a browser by every role) is tests/browser/demo-training-isolation.test.mjs.
//   node --test tests/unit/training-isolation.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'training-isolation-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as S from './workspace/store.ts'; export * as G from './gameday/engine.ts'; export * as SG from './gameday/signal/store.ts'; export * as SA from './gameday/signal/access.ts'; export { holds } from './build/store.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const { S, G, SG, SA, holds } = await import(pathToFileURL(out).href);

const PERSONAS = Object.keys(JSON.parse(fs.readFileSync(path.join(repo, 'packages/domain-data/data/V25_PERSONAS.json'), 'utf8')));
const AUTHORITIES = [...new Set(Object.values(JSON.parse(fs.readFileSync(path.join(repo, 'packages/domain-data/data/V25_PERSONAS.json'), 'utf8'))).flatMap((p) => p.authority || []))];
/** the operational record: everything a simulation must never change */
const real = (w) => JSON.stringify({ incidents: w.incidents, workOrders: w.workOrders, apexCases: w.apexCases, staff: w.staff, stock: w.stock, bookings: w.bookings, licenses: w.licenses, adapters: w.adapters, learnCases: w.learnCases });
const STADIUM = [...SA.SIGNAL_VERIFY, 'stadium.guest', 'stadium.public', 'stadium.security_lead', null];

test('TI-01 the SIGNAL game-day incident, worked by every stadium role and every campus role, changes only its own state and the ledger', () => {
  const w = S.seed(); const before = real(w); const ev0 = w.events.length; let g = G.start(); let moved = 0; let refused = 0;
  for (const config of STADIUM) for (const label of [config || 'no role', ...PERSONAS]) {
    const a = { config, label };
    const r = SG.simulateLoss(w, g, a); if (r.ok) { g = r.state; moved += 1; } else refused += 1;
    const id = g.incidents.find((i) => i.fault === SA.SIGNAL_FAULT)?.id;
    for (const to of ['ACKNOWLEDGED', 'DISPATCHED', 'FIXED', 'VERIFIED']) { if (!id) break; const s = SG.step(w, g, a, id, to, 'training note'); if (s.ok) { g = s.state; moved += 1; } else refused += 1; }
    if (id) { const n = SG.notRestored(w, g, a, id, 'not back'); if (!n.ok) refused += 1; }
  }
  assert.ok(moved > 0 && refused > 0, `${moved} moved, ${refused} refused`);
  assert.equal(real(w), before, 'a simulation changed the operational record');
  const added = w.events.slice(0, w.events.length - ev0);
  assert.ok(added.length > 0 && added.every((e) => e.type.startsWith('gameday.incident.')), 'only game-day lines are written to the ledger');
  assert.ok(added.every((e) => !w.incidents.some((i) => i.id === e.aggregate)), 'no ledger line names a ServiceHands incident');
});

test('TI-02 a simulation cannot name a real incident: every ServiceHands incident id is refused by the game-day steps, for every role', () => {
  const w = S.seed(); const before = real(w); let g = G.start(); const r = SG.simulateLoss(w, g, { config: 'stadium.broadcast_engineer', label: 'Broadcast engineer' }); assert.ok(r.ok); g = r.state;
  for (const inc of w.incidents) for (const config of STADIUM) for (const to of ['ACKNOWLEDGED', 'DISPATCHED', 'FIXED', 'VERIFIED']) {
    const s = SG.step(w, g, { config, label: config || 'no role' }, inc.id, to);
    assert.equal(s.ok, false, `${config} moved ${inc.id} to ${to}`);
  }
  assert.equal(real(w), before);
  for (const inc of w.incidents) assert.equal(SG.notRestored(w, g, { config: 'stadium.broadcast_engineer', label: 'x' }, inc.id, 'n').ok, false);
});

test('TI-03 drills never grant authority: after fifty correct drills, every role holds exactly what it held, and a refused action is still refused', () => {
  const w = S.seed(); const before = real(w); const held = (p) => AUTHORITIES.filter((a) => holds(p, a)).join();
  const was = Object.fromEntries(PERSONAS.map((p) => [p, held(p)]));
  for (const p of PERSONAS) for (let i = 0; i < 50; i += 1) S.recordTraining(w, p, `D${i}`, true, 30);
  for (const p of PERSONAS) assert.equal(held(p), was[p], `${p}: training changed what it holds`);
  assert.equal(real(w), before, 'training changed the operational record');
  assert.ok(w.training.length === 200, 'the training log is bounded');
  const inc = w.incidents.find((i) => i.state === 'NEW' || i.state === 'TRIAGED' || !['CLOSED', 'CANCELLED'].includes(i.state));
  for (const p of PERSONAS.filter((x) => !holds(x, 'service.triage'))) {
    const snap = real(w); const r = S.triage(w, p, inc.id, 'High');
    assert.ok(r && Array.isArray(r.why), `${p} triaged after training`); assert.equal(real(w), snap, `${p}: a refused triage changed the record`);
  }
});

test('TI-04 a training case is written from what actually happened, and writing it never changes the incident: only the link and the ledger', () => {
  const w = S.seed(); const proposer = PERSONAS.find((p) => S.LEARN_PROPOSE.some((a) => holds(p, a)) && p !== 'architect'); assert.ok(proposer, 'a role may propose a case');
  const open = w.incidents.find((i) => !['RESOLVED', 'CLOSED'].includes(i.state)); const snap = real(w);
  const r = S.proposeCase(w, proposer, open.id, { title: 'A lesson', lesson: 'Check the power first', permission: true, deidentified: true });
  assert.ok(Array.isArray(r.why), 'a case from an unresolved incident is refused'); assert.equal(real(w), snap, 'a refused proposal changed the record');
  for (const p of PERSONAS.filter((x) => !S.LEARN_PROPOSE.some((a) => holds(x, a)))) { const done = w.incidents.find((i) => ['RESOLVED', 'CLOSED'].includes(i.state)); const x = S.proposeCase(w, p, done.id, { title: 'A lesson about a display', lesson: 'Check the input first', permission: true, deidentified: true }); assert.ok(Array.isArray(x.why), `${p} proposed a case`); assert.equal(real(w), snap); }
  const done = w.incidents.find((i) => ['RESOLVED', 'CLOSED'].includes(i.state)); const before = JSON.stringify({ ...done, learnCaseId: null }); const wo = JSON.stringify(w.workOrders); const apex = JSON.stringify(w.apexCases);
  const ok = S.proposeCase(w, proposer, done.id, { title: 'A lesson about a display', lesson: 'Check the input first', permission: true, deidentified: true });
  assert.ok(ok.id, JSON.stringify(ok)); assert.equal(done.learnCaseId, ok.id, 'the incident is linked to its case');
  assert.equal(JSON.stringify({ ...done, learnCaseId: null }), before, 'the incident itself changed'); assert.equal(JSON.stringify(w.workOrders), wo); assert.equal(JSON.stringify(w.apexCases), apex);
});

test('TI-05 the Field Intelligence simulated run, driven by every role as far as it may go (one all the way to a finished run), changes only its own session and the ledger', () => {
  const w = S.seed(); assert.equal(S.setLicense(w, 'architect', 'SITE-NORTH:BRD', true), null);
  const keep = (x) => JSON.stringify({ incidents: x.incidents, workOrders: x.workOrders, apexCases: x.apexCases, staff: x.staff, stock: x.stock, bookings: x.bookings, adapters: x.adapters, learnCases: x.learnCases, licenses: x.licenses });
  const before = keep(w); const reached = new Set(); const inst = { model: 'Sound level meter, class 1', serial: 'SLM-0142', calibrationId: 'CAL-2026-07-118', calibrationDue: '2027-07-01' };
  for (const p of PERSONAS) {
    const s = S.fiPropose(w, p, 'R-ATL-4-218', 'BRD', [{ id: 'TP-1', label: 'seat row 1' }], [{ id: 'LAEQ', label: 'LAeq at seats', adapter: 'ADP-SLM' }]); if (!s.id) continue;
    S.fiEligibility(w, p, s.id);
    for (const i of [{ step: 'protocol', levelLimit: 85 }, { step: 'window', occupied: false, privacyNotice: true }, { step: 'operator', present: true, qualified: true, mfa: true }, { step: 'instrument', instrument: inst }, { step: 'estop', verified: true }]) S.fiPreflight(w, p, s.id, i);
    S.fiDryRun(w, p, s.id); S.fiAuthorize(w, p, s.id, true); S.fiArm(w, p, s.id, true, true); S.fiRun(w, p, s.id, null);
    reached.add(S.fiSessionOf(w, s.id).state);
  }
  assert.ok(reached.has('ACQUIRED'), `a simulated run finished (${[...reached].join(', ')})`); assert.ok(reached.has('SAFETY_PREFLIGHT'), 'and a role without the authorities stopped at the preflight');
  assert.equal(keep(w), before, 'a simulated run changed the operational record');
});
