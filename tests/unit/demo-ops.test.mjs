// Unit tests for the investor demonstration's operational-workspace logic (apps/demo/src/{dispatch,service,replay,fi,decisions,learn}):
// bundled on the fly with esbuild (no build step), run with node:test.   node --test tests/unit/demo-ops.test.mjs
import { test } from 'node:test'; import assert from 'node:assert/strict'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const entry = `export * as E from './apps/demo/src/dispatch/engine.ts'; export * as A from './apps/demo/src/dispatch/actions.ts'; export * as SF from './apps/demo/src/learn/signalflow.ts';
export * as I from './apps/demo/src/learn/Instruments.tsx'; export * as DS from './apps/demo/src/decisions/store.ts'; export * as H from './apps/demo/src/replay/history.ts'; export * as R from './apps/demo/src/fi/rooms.ts';
export * as SH from './apps/demo/src/service/actions.ts'; export * as W from './apps/demo/src/workspace/store.ts'; export { SAFEGUARDS } from './apps/demo/src/safeguards/Safeguards.tsx';`;
const out = path.join(repo, '.local/unit/demo-ops.mjs'); fs.mkdirSync(path.dirname(out), { recursive: true });
await esbuild.build({ stdin: { contents: entry, resolveDir: repo, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: out, jsx: 'automatic', logLevel: 'error', alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') } });
const { E, A, SF, I, DS, H, R, SH, W, SAFEGUARDS } = await import(pathToFileURL(out).href);
const lib = JSON.parse(fs.readFileSync(path.join(repo, 'packages/domain-data/data/SIGNAL_LIB.json'), 'utf8'));
const today = '2026-11-03';

test('dispatch: every person gets every gate; preferences only for the eligible; no travel estimate', () => {
  const w = W.seed(); const m = E.match(E.poolOf(w.staff), { workType: 'break_fix', roomId: 'R-ATL-4-220', buildingKey: 'ATL' }, today);
  assert.ok(m.eligible.length >= 3, 'three or more eligible people (addendum §9)');
  for (const r of m.rows) { assert.ok(r.gates.length >= 5); if (!r.eligible) assert.equal(r.prefs.length, 0); }
  assert.equal(m.eligible[0].rank, 1); assert.match(m.noTravel, /not estimated/);
  assert.ok(m.rows.every((r) => r.competencies.every((c) => /^Internal competency · /.test(c.label) && ['declared', 'lab-evidenced', 'verified by a reviewer'].includes(c.state))));
});
test('dispatch: a hard gate is never overridden; a preference override needs a reason', () => {
  const w = W.seed(); const m = E.match(E.poolOf(w.staff), { workType: 'dsp_upgrade', roomId: 'R-ATL-4-218', buildingKey: 'ATL' }, today);
  const bad = m.ineligible[0]; assert.match(E.assignmentBlockers(m.rows, bad.id, 'any reason at all here').why[0], /never be overridden/);
  const second = m.eligible[1]; assert.ok(second, 'a second eligible person');
  assert.equal(E.assignmentBlockers(m.rows, second.id, null).why.length, 1);
  const ok = E.assignmentBlockers(m.rows, second.id, 'Knows this DSP from the refresh'); assert.deepEqual(ok.why, []); assert.equal(ok.override, true);
  assert.equal(E.assignmentBlockers(m.rows, m.eligible[0].id, null).override, false);
});
test('dispatch: an expired vendor agreement is a hard gate; declared language is a preference only', () => {
  const w = W.seed(); const m = E.match(E.poolOf(w.staff), { workType: 'dsp_upgrade', roomId: 'R-ATL-4-218', buildingKey: 'ATL', language: 'German' }, today);
  const gus = m.rows.find((r) => r.id === 'tech-gus'); assert.equal(gus.eligible, false); assert.ok(gus.gates.some((g) => g.key === 'vendor' && !g.ok));
  const eli = m.rows.find((r) => r.id === 'tech-eli'); assert.ok(eli.prefs.some((p) => p.label === 'Declared language' && p.points === 5));
});
test('dispatch: assignment through the workspace is a governed step; a double assign is refused', () => {
  const w = W.seed(); const id = 'ISS-0421'; const m = A.matchFor(w, id);
  assert.equal(A.dispatchAssign(w, 'svcmgr', id, m.eligible[0].id, null), null);
  assert.equal(W.incidentOf(w, id).state, 'ASSIGNED');
  assert.match(A.dispatchAssign(w, 'svcmgr', id, m.eligible[0].id, null).why[0], /once it is TRIAGED/);
  assert.match(A.dispatchAssign(W.seed(), 'requestor', id, m.eligible[0].id, null).why[0], /does not hold service.assign/);
  assert.ok(E.reassignBlockers(m.rows, m.eligible[0].id, m.eligible[0].id, 'short', 'ASSIGNED').length >= 2);
  assert.match(E.reassignBlockers(m.rows, 'a', m.eligible[1].id, 'a long enough reason', 'IN_PROGRESS')[0], /work has started/);
});
test('dispatch: SLA and metrics come from the records', () => {
  const now = Date.parse('2026-11-03T12:00:00Z');
  assert.equal(E.slaOf('Mission critical', '2026-11-03T00:00:00Z', null, now).state, 'breached');
  assert.equal(E.slaOf('Standard', '2026-11-03T00:00:00Z', null, now).state, 'ok');
  const M = E.metrics(W.seed().incidents, Date.now()); assert.equal(M.open.value, 2); assert.match(M.open.def, /of 5/); assert.equal(M.waiting.value, 2);
});
test('signal flow: LAB-SF-01 fails as given and passes with the documented fix', () => {
  const L = lib.labs['LAB-SF-01']; let s = SF.initState(L);
  assert.equal(SF.evaluate(L, s).ok, false);
  assert.ok(SF.patchError(L, s, 'room', 'main'));
  s = { ...s, patches: [['pp', 'strm'], ['lp', 'strm'], ['bp', 'strm']], gains: { ...s.gains, pp: 32 } };
  const e = SF.evaluate(L, s); assert.equal(e.ok, true, JSON.stringify(e.results)); assert.ok(Math.abs(e.levels.main - -13.23) < 0.05);
  assert.ok(L.math.every((m) => SF.mathOk(m, String(m.answer))));
});
test('signal flow: every one of the 26 signal-flow labs has nodes, targets and math the simulator can read', () => {
  const sf = lib.labOrder.map((k) => lib.labs[k]).filter((l) => l.type === 'signalflow'); assert.equal(sf.length, 26);
  for (const L of sf) { const e = SF.evaluate(L, SF.initState(L)); assert.equal(e.results.length, L.targets.length, L.id); assert.ok(Array.isArray(L.math || [])); }
});
test('instrument labs: each fault fails as given and is fixable to every check', () => {
  assert.ok(I.audioChecks(I.AUDIO_DEFAULT).some((c) => !c.ok)); assert.ok(I.audioChecks({ ...I.AUDIO_DEFAULT, hpfOn: true, hpf: 100, bands: [0, 2, 4, 0], outGain: -2 }).every((c) => c.ok));
  assert.ok(I.cameraChecks(I.CAMERA_DEFAULT).some((c) => !c.ok)); assert.ok(I.cameraChecks({ shutter: 120, fps: 30, gain: 6, iris: 2.8, wb: 4000 }).every((c) => c.ok));
  assert.ok(I.lightChecks(I.LIGHT_DEFAULT).some((c) => !c.ok));
  const f = I.LIGHT_DEFAULT.map((x) => (x.id === 'key' ? { ...x, dmx: 128, dist: 2.5 } : x.id === 'fill' ? { ...x, dmx: 108, dist: 3, cct: 5600 } : x)); assert.ok(I.lightChecks(f).every((c) => c.ok), JSON.stringify(I.lightChecks(f)));
});
test('decisions: segregation of duties, hold and reject guards, funding bound to the scope revision', () => {
  const d = DS.seed();
  assert.match(DS.decide(d, 'exec', 'PRJ-NST-TWN', 'approve', '', null).why.join(), /authored the brief/);
  assert.ok(DS.decide(d, 'exec', 'PRJ-ATLAS-AV', 'hold', '', null).why.length >= 2);
  assert.match(DS.decide(d, 'architect', 'PRJ-ATLAS-AV', 'approve', '', null).why.join(), /delegation is required/);
  assert.equal(DS.decide(d, 'exec', 'PRJ-ATLAS-AV', 'approve', '', null), null);
  const p = d.projects.find((x) => x.id === 'PRJ-ATLAS-AV'); assert.equal(DS.fieldReady(d, p).ok, false);
  assert.match(DS.fund(d, 'exec', 'PRJ-ATLAS-AV', { amount: 1, currency: 'USD', costCenter: 'CC', scopeRev: 2 }).why[0], /funding.authorize/);
  assert.match(DS.fund(d, 'architect', 'PRJ-ATLAS-AV', { amount: 1, currency: 'USD', costCenter: 'CC', scopeRev: 1 }).why.join(), /scope revision 1/);
  assert.equal(DS.fund(d, 'architect', 'PRJ-ATLAS-AV', { amount: 186000, currency: 'USD', costCenter: 'CC-1', scopeRev: 2 }), null);
  assert.equal(DS.fieldReady(d, p).ok, true);
  assert.match(DS.record(d, 'syseng', { name: 'Something decided', on: null, options: '', why: '' }).why.join(), /rationale/);
  assert.match(DS.withdraw(d, 'syseng', 'DEC-0003').why[0], /only the person who recorded/);
});
test('replay: the reopened tests are the engine’s applicable tests that name PA-0007, and building stages writes nothing', () => {
  const r = H.reopenedBySwap(); const ref = R.referenceDesign();
  assert.ok(r.reopened.length > 0 && r.reopened.length < r.applicable);
  assert.deepEqual(r.reopened.map((x) => x.id), ref.rows.filter((x) => x.devices.includes('PA-0007')).map((x) => x.id));
  const w = W.seed(); const snap = JSON.stringify(w); const st = H.stagesOf('R-ATL-4-218', w);
  assert.equal(JSON.stringify(w), snap); assert.ok(st.some((s) => s.key === 'change' && /AS-0097 replaced by AS-0112/.test(s.title)));
  assert.ok(st.find((s) => s.key === 'exception').title.includes('pending approval'));
  assert.ok(H.stagesOf('R-ATL-4-220', w).some((s) => s.status === 'none'));
});
test('FI findings carry a provenance and never claim a measurement', () => {
  for (const room of R.ROOMS) for (const f of R.findingsOf(room.id)) { assert.ok(['KNOWN', 'INFERRED', 'SIMULATED'].includes(f.provenance)); assert.doesNotMatch(f.text, /\bmeasured\b/i); }
});
test('ServiceHands: intake validation, resolution before closure, FI evidence only by the assigned technician', () => {
  assert.ok(Object.keys(SH.intakeErrors({ entry: '', roomId: '', category: '', assetId: null, title: '', summary: '', answers: [], attachments: [] })).length >= 4);
  const w = W.seed(); const r = SH.submitRequest(w, 'requestor', { entry: 'employee', roomId: 'R-ATL-4-220', category: 'video', assetId: null, title: 'No picture at the far end', summary: '', answers: [], attachments: [] });
  assert.ok(r.id && w.sh.intake[r.id]);
  assert.match(SH.closeIncident(w, 'svcmgr', 'ISS-0402', true).why[0], /resolution code/);
  assert.match(SH.attachFinding(w, 'service', 'ISS-0417', R.findingsOf('R-ATL-4-218')[0]).why[0], /assigned technician/);
});
test('the safeguard registry: every destructive action is named, and irreversible ones are named confirmations', () => {
  assert.ok(SAFEGUARDS.length >= 9); for (const s of SAFEGUARDS) { assert.ok(s.why.length > 20); if (s.reversibility === 'never') assert.equal(s.named, true); }
});
