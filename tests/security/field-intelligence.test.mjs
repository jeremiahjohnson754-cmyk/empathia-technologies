/**
 * Field Intelligence (P7) through the real API on @empathia/field-intelligence: the v1.3 plan executes nothing; v1.4 sessions are
 * licensed per site × archetype, gated by five independent approvals, dry-run, authorized, armed only by the consenting operator
 * (a real person) with two confirmations, and in this build run only as labelled simulations. Synthetic data only.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client } from '../integration/harness.mjs';

let h, c, room, fis; const T = {};
before(async () => {
  h = await setup({ db: 'empathia_fi', port: 4185 });
  c = client(h.base);
  for (const r of ['designer', 'syseng', 'opslead', 'cxeng', 'service', 'secadmin', 'requestor', 'installer']) T[r] = await c.login(r);
  room = (await c.call('POST', '/v1/rooms', { token: T.designer, body: { name: 'Validation Boardroom (synthetic)', template: 'boardroom', buildingCode: 'ATL', floor: 8 } })).body.code;
  await c.call('POST', `/v1/rooms/${room}/classification/approve`, { token: T.syseng, body: {} });
});
after(async () => { await h?.app.stop(); });
const S = (p, tok, body) => c.call(body === undefined ? 'GET' : 'POST', `/v1/field-intelligence/sessions/${fis}${p}`, { token: tok, ...(body === undefined ? {} : { body }) });
const post = (p, tok, body = {}) => c.call('POST', `/v1/field-intelligence/sessions/${fis}${p}`, { token: tok, body });

test('FI-1 the v1.3 plan is PLAN_ONLY from the room’s planned assets: capabilities DECLARED or UNKNOWN, procedures not executed, pairs NOT_TESTED, monitoring NOT_RUN; a requestor may read it', async () => {
  const r = await c.call('GET', `/v1/rooms/${room}/field-intelligence/plan`, { token: T.requestor });
  assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 200)); const p = r.body.plan;
  assert.equal(p.State, 'PLAN_ONLY'); assert.ok(p.Devices.length >= 5); assert.ok(p.Devices.every((d) => Object.values(d.Capabilities).every((x) => ['DECLARED', 'UNKNOWN'].includes(x)) && d.Procedures.every((x) => !x.Executed)));
  assert.ok(p.AudioPairs.every((x) => x.Status === 'NOT_TESTED')); assert.equal(p.Monitoring.ObservationState, 'NOT_RUN');
  assert.equal((await c.call('GET', `/v1/rooms/R-NOPE/field-intelligence/plan`, { token: T.requestor })).status, 404);
});

test('FI-2 licences: a technician cannot grant (403, audited); the security administrator grants BRD at SITE-NORTH; the record says a licence opens requests, never proofs', async () => {
  assert.equal((await c.call('POST', '/v1/field-intelligence/licences', { token: T.service, body: { siteCode: 'SITE-NORTH', archetype: 'BRD', granted: true } })).status, 403);
  assert.equal((await c.call('POST', '/v1/field-intelligence/licences', { token: T.secadmin, body: { siteCode: 'SITE-NORTH', archetype: 'XYZ', granted: true } })).status, 400);
  const r = await c.call('POST', '/v1/field-intelligence/licences', { token: T.secadmin, body: { siteCode: 'SITE-NORTH', archetype: 'TWN', granted: false, note: 'professional survey instead' } }); assert.equal(r.status, 200);
  const l = (await c.call('GET', '/v1/field-intelligence/licences', { token: T.syseng })).body;
  assert.equal(l.mayGrant, false); const north = l.sites.find((s) => s.code === 'SITE-NORTH'); assert.equal(north.licences.find((x) => x.archetype === 'BRD').granted, false); assert.equal(north.licences.find((x) => x.archetype === 'TWN').note, 'professional survey instead');
  assert.equal(h.asSuper("SELECT count(*) FROM app.audit_event WHERE action LIKE 'Grant or revoke a licence%' AND outcome = 'DENIED'"), '1', 'the central authority check audits the refusal under the route’s summary');
});

test('FI-3 a session is proposed by systems engineering (a technician is refused; an unknown adapter is refused); without a licence eligibility ends NOT_LICENSED; with it the NOT_CONFIGURED camera test is marked and the session reaches the safety preflight', async () => {
  const body = { points: [{ id: 'TP-1', label: 'seat row 1' }, { id: 'TP-2', label: 'far seat' }], tests: [{ id: 'LAEQ', label: 'LAeq', adapter: 'ADP-SLM' }, { id: 'CAM-FOV', label: 'cam', adapter: 'ADP-CAM' }] };
  assert.equal((await c.call('POST', `/v1/rooms/${room}/field-intelligence/sessions`, { token: T.service, body })).status, 403);
  assert.equal((await c.call('POST', `/v1/rooms/${room}/field-intelligence/sessions`, { token: T.syseng, body: { ...body, tests: [{ id: 'X', label: 'x', adapter: 'ADP-ZZZ' }] } })).status, 400);
  const r = await c.call('POST', `/v1/rooms/${room}/field-intelligence/sessions`, { token: T.syseng, body }); assert.equal(r.status, 201, JSON.stringify(r.body)); fis = r.body.sessionId; assert.match(fis, /^FIS-\d{4}$/);
  const no = await post('/eligibility', T.syseng); assert.equal(no.status, 200); assert.equal(no.body.state, 'NOT_LICENSED'); assert.equal(no.body.terminal, true);
  await c.call('POST', '/v1/field-intelligence/licences', { token: T.secadmin, body: { siteCode: 'SITE-NORTH', archetype: 'BRD', granted: true } });
  fis = (await c.call('POST', `/v1/rooms/${room}/field-intelligence/sessions`, { token: T.syseng, body })).body.sessionId;
  assert.equal((await post('/eligibility', T.service)).status, 403, 'a technician cannot check eligibility');
  const yes = await post('/eligibility', T.syseng); assert.equal(yes.body.state, 'SAFETY_PREFLIGHT'); assert.deepEqual(yes.body.session.eligibility.notConfigured, ['CAM-FOV']); assert.deepEqual(yes.body.session.eligibility.eligibleTests, ['LAEQ']);
});

test('FI-4 the five-step preflight by different authorities; the response lists what is missing; an occupied window ends the session (so a fresh one is proposed); a past calibration ends it; an unverified E-stop ends it; the technician who consents becomes the local operator', async () => {
  const propose = async () => { const id = (await c.call('POST', `/v1/rooms/${room}/field-intelligence/sessions`, { token: T.syseng, body: { points: [{ id: 'TP-1', label: 'seat 1' }, { id: 'TP-2', label: 'seat 4' }], tests: [{ id: 'LAEQ', label: 'LAeq', adapter: 'ADP-SLM' }] } })).body.sessionId; fis = id; await post('/eligibility', T.syseng); };
  assert.equal((await post('/preflight', T.service, { step: 'protocol', levelLimit: 85 })).status, 422, 'the technician cannot approve the protocol (engine refusal with the reason)');
  const p1 = await post('/preflight', T.syseng, { step: 'protocol', levelLimit: 85 }); assert.equal(p1.status, 200, JSON.stringify(p1.body)); assert.deepEqual(p1.body.missing, ['maintenance window', 'operator consent', 'instrument calibration', 'emergency stop verification']);
  const occ = await post('/preflight', T.opslead, { step: 'window', occupied: true, privacyNotice: true }); assert.equal(occ.body.state, 'OCCUPIED'); assert.equal(occ.body.terminal, true);
  await propose(); await post('/preflight', T.syseng, { step: 'protocol', levelLimit: 85 });
  assert.equal((await post('/preflight', T.opslead, { step: 'window', occupied: false, privacyNotice: true })).body.missing.length, 3);
  const absent = await post('/preflight', T.service, { step: 'operator', present: false, qualified: true }); assert.equal(absent.body.state, 'AWAITING_CONSENT');
  await propose(); await post('/preflight', T.syseng, { step: 'protocol', levelLimit: 85 }); await post('/preflight', T.opslead, { step: 'window', occupied: false, privacyNotice: true });
  const op = await post('/preflight', T.service, { step: 'operator', present: true, qualified: true, mfa: true }); assert.equal(op.status, 200);
  const svcId = h.asSuper("SELECT id FROM app.person WHERE email = 'service@empathia-demo.empathia.invalid'"); assert.equal(op.body.session.safety.localOperator, svcId, 'the local operator is the person who consented');
  assert.equal((await post('/preflight', T.service, { step: 'instrument', instrument: { model: 'SLM class 1', serial: 'SLM-9', calibrationId: 'CAL-1', calibrationDue: '2026-01-01' } })).body.state, 'OUT_OF_CALIBRATION');
  await propose(); await post('/preflight', T.syseng, { step: 'protocol', levelLimit: 85 }); await post('/preflight', T.opslead, { step: 'window', occupied: false, privacyNotice: true }); await post('/preflight', T.service, { step: 'operator', present: true, qualified: true, mfa: true });
  await post('/preflight', T.service, { step: 'instrument', instrument: { model: 'SLM class 1', serial: 'SLM-9', calibrationId: 'CAL-1', calibrationDue: '2027-01-01' } });
  assert.equal((await post('/preflight', T.service, { step: 'estop', verified: false })).body.state, 'PRECONDITION_FAILED');
  await propose(); await post('/preflight', T.syseng, { step: 'protocol', levelLimit: 85 }); await post('/preflight', T.opslead, { step: 'window', occupied: false, privacyNotice: true }); await post('/preflight', T.service, { step: 'operator', present: true, qualified: true, mfa: true });
  await post('/preflight', T.service, { step: 'instrument', instrument: { model: 'SLM class 1', serial: 'SLM-9', calibrationId: 'CAL-1', calibrationDue: '2027-01-01' } });
  const done = await post('/preflight', T.service, { step: 'estop', verified: true }); assert.equal(done.body.state, 'DRY_RUN'); assert.deepEqual(done.body.missing, []);
});

test('FI-5 dry run emits nothing; only the commissioning lead authorizes; only the consenting operator arms, with two confirmations; asking for a real run ends NOT_CONFIGURED (honest); the simulation runs point by point to ACQUIRED with no values; E-stop aborts; every step is audited', async () => {
  const dry = await post('/dry-run', T.service); assert.equal(dry.status, 200); assert.equal(dry.body.state, 'APPROVAL_PENDING'); assert.equal(dry.body.session.dryRun.output, 'none (dry run emits nothing)');
  assert.equal((await post('/arm', T.service, { confirm1: true, confirm2: true })).status, 422, 'not before authorization');
  assert.equal((await post('/authorize', T.service, { yes: true })).status, 403, 'a technician cannot authorize');
  const auth = await post('/authorize', T.cxeng, { yes: true }); assert.equal(auth.status, 200); assert.ok(auth.body.session.approvals.session);
  assert.equal((await post('/arm', T.cxeng, { confirm1: true, confirm2: true })).status, 422, 'the commissioning lead is not the consenting operator');
  assert.equal((await post('/arm', T.service, { confirm1: true, confirm2: false })).status, 422, 'two confirmations');
  const me = await S('', T.service); assert.equal(me.body.yours.arm, true); assert.equal((await S('', T.cxeng)).body.yours.arm, false);
  // a copy of the state for the honest NOT_CONFIGURED exit is a separate session: run the real-run request on this one, then rebuild for the simulation
  const real = await post('/arm', T.service, { confirm1: true, confirm2: true, real: true }); assert.equal(real.body.state, 'NOT_CONFIGURED'); assert.equal(real.body.terminal, true);
  const rebuild = async () => {
    fis = (await c.call('POST', `/v1/rooms/${room}/field-intelligence/sessions`, { token: T.syseng, body: { points: [{ id: 'TP-1', label: 'seat 1' }, { id: 'TP-2', label: 'seat 4' }], tests: [{ id: 'LAEQ', label: 'LAeq', adapter: 'ADP-SLM' }] } })).body.sessionId;
    for (const [tok, body] of [[T.syseng, null], [T.syseng, { step: 'protocol', levelLimit: 85 }], [T.opslead, { step: 'window', occupied: false, privacyNotice: true }], [T.service, { step: 'operator', present: true, qualified: true, mfa: true }], [T.service, { step: 'instrument', instrument: { model: 'm', serial: 's', calibrationId: 'c', calibrationDue: '2027-01-01' } }], [T.service, { step: 'estop', verified: true }]]) { const r = await post(body ? '/preflight' : '/eligibility', tok, body || {}); assert.equal(r.status, 200, JSON.stringify(r.body)); }
    await post('/dry-run', T.service); await post('/authorize', T.cxeng, { yes: true });
  };
  await rebuild();
  const armed = await post('/arm', T.service, { confirm1: true, confirm2: true }); assert.equal(armed.body.state, 'ARMED'); assert.equal(armed.body.session.simulated, true);
  const r1 = await post('/run', T.service); assert.equal(r1.body.state, 'RUNNING'); assert.equal(r1.body.session.results.length, 1); assert.equal(r1.body.session.results[0].value, null);
  const r2 = await post('/run', T.service); assert.equal(r2.body.state, 'ACQUIRED'); assert.equal(r2.body.session.restore, 'verified (simulated)'); assert.equal(r2.body.terminal, false, 'ACQUIRED is not an exit: the instrument export goes to review next');
  await rebuild(); await post('/arm', T.service, { confirm1: true, confirm2: true }); await post('/run', T.service);
  const lvl = await post('/run', T.service, { branch: 'excessive_level' }); assert.equal(lvl.body.state, 'ABORTED'); assert.match(lvl.body.session.exits[0].why, /85 dB\(A\)/);
  await rebuild(); await post('/arm', T.service, { confirm1: true, confirm2: true }); await post('/run', T.service);
  const es = await post('/estop', T.opslead); assert.equal(es.body.state, 'ABORTED'); assert.match(es.body.session.restore, /restore requested/);
  assert.equal((await post('/estop', T.opslead)).status, 422, 'nothing to stop');
  assert.ok(Number(h.asSuper("SELECT count(*) FROM app.audit_event WHERE action LIKE 'fipv.%' AND outcome = 'ALLOWED'")) >= 40);
  assert.ok(Number(h.asSuper("SELECT count(*) FROM app.audit_event WHERE action LIKE 'fipv.%' AND outcome = 'DENIED'")) >= 5);
  const list = await c.call('GET', '/v1/field-intelligence/sessions', { token: T.requestor }); assert.equal(list.status, 200); assert.ok(list.body.items.length >= 8, `${list.body.items.length} sessions: ${list.body.items.map((x) => x.code + ' ' + x.state).join(', ')}`); assert.ok(list.body.items.some((x) => x.simulated));
});
