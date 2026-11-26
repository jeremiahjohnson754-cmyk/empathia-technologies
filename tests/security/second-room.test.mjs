// The same workflow in another room (founder, 17 Nov 2026, 19:05: "demonstrate the same workflow in another room"; and "the same
// engine can power your enterprise rooms, stadium executive suites, and convention center spaces without creating separate engineering
// systems for each world"). Harbor 201, a session room of the fictional convention centre (canonical estate record CNV-MR-H201), is a room of
// the sandbox like the lecture theatre: made through the same routes, governed by the same rules. This suite takes it through the
// whole of the investor's question — a camera installed in the wrong place, a failed acoustic acceptance, its correction — by the
// API alone, with the second technician doing the work, and checks that the lecture theatre's record is untouched by any of it.
//   SR-01  the session room is a server room of another venue, with its own design and its own criterion; nothing about it is special
//   SR-02  the camera is recorded where it was installed: proposed by the installer, refused to its recorder, approved by the
//          systems engineer; the designed place is kept beside it; the theatre's cameras are where they were
//   SR-03  registered and commissioned; the server works the reverberation out from the evidence, the database judges it against
//          this room's limit (not the theatre's), PASS is refused, FAIL opens a deficiency that states the measurement
//   SR-04  the correction is the second technician's job once the steward verifies their credential: assigned, accepted, preflight,
//          done with evidence, verified by someone else, closed; the first technician is refused each step
//   SR-05  the retest is a new measurement after the correction; the deficiency closes on it, verified by someone else
//   SR-06  every other check recorded and independently verified; acceptance lent and given; baseline 1 keeps the designed place,
//          the as-built place and the measured value with its limit
//   SR-07  two rooms, two records: the theatre is still installed and unverified with no move, no measurement, no deficiency and no
//          baseline; a measurement of one room carries no result in the other; each criterion is its own
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict';
import { setup, client, registerRoom, documentRoom } from '../integration/harness.mjs';
import { analyseBands, meanOverPositions, syntheticIR } from '@empathia/commissioning-engine/acoustics';

let h, c, sb; const T = {}; const J = (x) => JSON.stringify(x); const S = '/v1/rooms/CNV-MR-H201'; const HALL = '/v1/rooms/UNI-SCI-110'; const RT = 'reverberation_rt60'; let suite, cam,   // suite: the session room as the server returned it at the start
 built, WO, ISSUE;
const call = (token, method, p, o = {}) => c.call(method, p, { token, ...o });
const session = async (role, seat) => (await c.call('POST', '/v1/demo/sessions', { body: { sandboxId: sb.id, key: sb.key, role, ...(seat ? { seat } : {}) } })).body.accessToken;
const note = async (token, text) => { const r = await call(token, 'POST', '/v1/evidence', { raw: `synthetic: ${text}`, headers: { 'content-type': 'text/plain', 'x-file-name': `${text.replace(/[^a-z0-9]+/gi, '-')}.txt` } }); assert.equal(r.status, 201, J(r.body)); return r.body.id; };
// an analysis package of four synthetic reference responses whose T30 (500 Hz and 1 kHz) is exactly `target`: what the bench sends
const mid = (irs) => { const m = meanOverPositions(irs.map((ir) => analyseBands(ir))); return Math.round(((m.find((x) => x.band === '500 Hz').t30.mean + m.find((x) => x.band === '1 kHz').t30.mean) / 2) * 100) / 100; };
const decaysFor = (target) => { let d = target; for (let i = 0; i < 40; i++) { const decays = [0, 1, 2, 3].map((k) => Math.round(d * (1 + 0.02 * (k - 1.5)) * 1000) / 1000); const got = mid(decays.map((x, k) => syntheticIR(x, { rate: 16000, seed: 20 + k * 13, floorDb: -80 }))); if (got === target) return decays; d = Math.round((d + (target - got) * 0.7) * 1000) / 1000; } throw new Error(`no reference decays give ${target} s`); };
const measure = async (token, base, value) => { const decays = decaysFor(value);
  const pkg = { kind: 'reverberation analysis package', room: 'CNV-MR-H201', test: RT, metric: 't30_mid', unit: 's', value, synthetic: true, positions: decays.map((x, k) => ({ position: k + 1, response: { synthetic: true, decaySeconds: x, seed: 20 + k * 13, rate: 16000, floorDb: -80 } })) };
  const ev = await call(token, 'POST', '/v1/evidence', { raw: JSON.stringify(pkg), headers: { 'content-type': 'text/plain', 'x-file-name': 'analysis-package.json' } }); assert.equal(ev.status, 201, J(ev.body));
  return call(token, 'POST', `${base}/measurements`, { body: { testId: RT, metric: 't30_mid', unit: 's', value, method: 'ISO 3382-2 integrated impulse response, T30', measuredAt: new Date().toISOString(), location: 'four receiver positions', source: 'synthetic reference responses (no room was measured)', provenance: 'SIMULATED', evidenceId: ev.body.id } }); };
const result = (token, base, state, m, ev) => call(token, 'POST', `${base}/results`, { body: { testId: RT, state, evidenceId: ev, evidenceKind: 'INSTRUMENT_MEASURED', instrument: 'none: simulated reference responses', measurementId: m } });

before(async () => {
  h = await setup({ db: 'empathia_second_room', port: 4158, env: { DEMO_SESSIONS: 'on' } }); c = client(h.base); h.asSuper('UPDATE app.demo_config SET enabled = true');
  const o = await c.call('POST', '/v1/demo/sandboxes', { body: {} }); assert.equal(o.status, 201, J(o.body)); sb = o.body.sandbox; T.people = o.body.personas; T.scenario = o.body.scenario;
  for (const role of ['designer', 'syseng', 'installer', 'cxeng', 'svcmgr', 'steward', 'qa_reviewer', 'opslead', 'exec', 'service']) T[role] = await session(role);
  T.tech1 = T.service; T.tech2 = await session('service', 2); const techs = T.people.filter((p) => p.role === 'service'); T.id1 = techs[0].id; T.id2 = techs[1].id;
  suite = (await call(T.designer, 'GET', S)).body;
});
after(async () => { await h.app.stop(); });

test('SR-01 the session room is a server room of another venue, with its own design and its own criterion', async () => {
  assert.deepEqual([suite.room.canonicalRef, suite.room.name, suite.room.template, suite.room.occupancy, suite.room.lifecycle], ['CNV-MR-H201', 'Harbor 201 (synthetic)', 'townhall', 220, 'INSTALLED_UNVERIFIED']);
  assert.deepEqual([suite.room.geometry.lengthM, suite.room.geometry.widthM, suite.room.geometry.ceiling], [22, 16, 5]); assert.deepEqual(T.scenario.second, { room: suite.room.code, canonicalRef: 'CNV-MR-H201', name: 'Harbor 201 (synthetic)' });
  assert.equal((await call(T.designer, 'GET', `/v1/rooms/${suite.room.code}`)).body.room.id, suite.room.id, 'the canonical identifier and the server code are the same room');
  const rooms = (await call(T.designer, 'GET', '/v1/rooms?limit=50')).body.items; assert.equal(rooms.length, 3); assert.deepEqual(rooms.map((r) => r.canonicalRef).filter(Boolean).sort(), ['CNV-MR-H201', 'UNI-SCI-110']);
  const venue = (await call(T.designer, 'GET', '/v1/sites')).body.items.find((x) => x.code === 'CNV'); assert.ok(venue && /Larkspur Exchange Convention Center \(synthetic\)/.test(venue.name) && venue.buildings.some((b) => b.code === 'CNV-V'), J(venue));
  const devs = suite.devices.filter((d) => !d.furniture); assert.ok(devs.length >= 12 && devs.filter((d) => d.cat === 'camera').length === 3 && devs.some((d) => d.cat === 'micceil') && devs.some((d) => d.cat === 'speaker'), `${devs.length} devices`);
  const crit = (await call(T.cxeng, 'GET', `${S}/criteria`)).body.tests.find((t) => t.test === RT).criterion; assert.deepEqual([crit.version, crit.upper, crit.metric], [1, 0.8, 't30_mid']); assert.match(crit.source, /Harbor 201/);
  const hallCrit = (await call(T.cxeng, 'GET', `${HALL}/criteria`)).body.tests.find((t) => t.test === RT).criterion; assert.equal(hallCrit.upper, 1, 'the theatre’s limit is its own');
});

test('SR-02 the camera is recorded where it was installed: proposed, refused to its recorder, approved by someone else; the designed place is kept', async () => {
  cam = suite.devices.find((d) => d.cat === 'camera'); built = { x: Math.round((cam.x + 0.8) * 100) / 100, y: cam.y };
  const mv = await call(T.installer, 'POST', `${S}/field-record/moves`, { body: { device: cam.id, ...built, reason: 'structural member', note: 'a beam is where the design puts the camera (synthetic)' } }); assert.equal(mv.status, 201, J(mv.body)); const move = mv.body.move;
  assert.equal((await call(T.installer, 'POST', `${S}/field-record/moves/${move}/decide`, { body: { approve: true } })).status, 403, 'not its recorder');
  let at = (await call(T.cxeng, 'GET', S)).body.devices.find((d) => d.id === cam.id).placement; assert.deepEqual([at.basis, at.current.x, at.proposed.x], ['DESIGNED', cam.x, built.x], 'a proposal moves nothing');
  const ok = await call(T.syseng, 'POST', `${S}/field-record/moves/${move}/decide`, { body: { approve: true, decision: 'clear of the beam (synthetic)' } }); assert.equal(ok.status, 200, J(ok.body));
  const d = (await call(T.cxeng, 'GET', S)).body.devices.find((x) => x.id === cam.id); at = d.placement;
  assert.deepEqual([at.basis, at.current.x, at.asBuilt.x, at.designed.x, d.x], ['AS_BUILT', built.x, built.x, cam.x, cam.x], 'as built where it was installed; the design row is untouched');
  const hall = (await call(T.cxeng, 'GET', HALL)).body; assert.ok(hall.devices.every((x) => x.placement.basis === 'DESIGNED' && !x.placement.proposed), 'no device of the theatre moved');
});

test('SR-03 registered and commissioned; the server works the value out, the database judges it against this room’s limit, PASS is refused, FAIL opens a deficiency', async () => {
  const early = await measure(T.cxeng, S, 0.95); assert.equal(early.status, 422, J(early.body)); assert.match(J(early.body), /COMMISSIONING/);
  await registerRoom(c, suite.room.code, T.installer); assert.equal((await call(T.syseng, 'POST', `${S}/lifecycle`, { body: { to: 'COMMISSIONING' } })).status, 200);
  const m = await measure(T.cxeng, S, 0.95); assert.equal(m.status, 201, J(m.body)); assert.deepEqual([m.body.value, m.body.within, m.body.criterion.upper, m.body.validation.recomputed], [0.95, false, 0.8, 0.95]);
  assert.match(m.body.says, /does not meet the criterion \(at most 0\.8 s, version 1\)/, '0.95 s would have met the theatre’s limit of 1 s; this is this room’s');
  const ev = await note(T.cxeng, 'session room reverberation result'); const pass = await result(T.cxeng, S, 'PASS', m.body.id, ev); assert.equal(pass.status, 422, J(pass.body)); assert.match(J(pass.body), /cannot be recorded as PASS/);
  assert.equal((await result(T.cxeng, S, 'FAIL', m.body.id, ev)).status, 201);
  const row = h.asSuper(`SELECT i.code || '|' || i.rationale FROM app.room_issue i JOIN app.room r ON r.id = i.room_id WHERE i.key = 'test-failed:${RT}' AND r.canonical_ref = 'CNV-MR-H201'`); ISSUE = row.split('|')[0];
  assert.match(row, /Measured t30_mid 0\.95 s, criterion at most 0\.8 s \(version 1\), SIMULATED/);
});

test('SR-04 the correction is the second technician’s job once the steward verifies their credential; the first technician is refused each step', async () => {
  const made = await call(T.svcmgr, 'POST', `/v1/issues/${ISSUE}/work-orders`, { body: { note: 'handed over from commissioning (synthetic)' } }); assert.equal(made.status, 201, J(made.body)); WO = `/v1/work-orders/${made.body.workOrderId}`;
  assert.equal((await call(T.svcmgr, 'POST', `${WO}/triage`, { body: { severity: 'High', scope: 'Fit absorptive panels to the side wall (synthetic)', risk: 'the session room cannot be accepted (synthetic)', window: { from: new Date(Date.now() + 864e5).toISOString(), to: new Date(Date.now() + 864e5 + 4 * 36e5).toISOString() } } })).status, 200);
  const before4 = (await call(T.svcmgr, 'GET', `${WO}/candidates`)).body; assert.deepEqual(before4.ineligible.map((x) => x.id), [T.id2]); const cred = before4.ineligible[0].pending[0].id;
  const refused = await call(T.svcmgr, 'POST', `${WO}/assign`, { body: { personId: T.id2 } }); assert.equal(refused.status, 422); assert.match(J(refused.body), /not yet verified/);
  assert.equal((await call(T.steward, 'POST', `/v1/competencies/${cred}/verify`, { body: { note: 'checked against the issuer record (synthetic)' } })).status, 200);
  assert.equal((await call(T.svcmgr, 'POST', `${WO}/assign`, { body: { personId: T.id2 } })).status, 200);
  const no = async (r, re) => { assert.ok([403, 422].includes(r.status), `${r.status} ${J(r.body)}`); assert.match(J(r.body), re); };
  await no(await call(T.tech1, 'POST', `${WO}/accept`), /accepted by the technician it was assigned to/); assert.equal((await call(T.tech2, 'POST', `${WO}/accept`)).status, 200);
  const pf = { safetyBriefed: true, toolsConfirmed: ['service kit'], accessConfirmedBy: 'venue operations desk (synthetic)' };
  await no(await call(T.tech1, 'POST', `${WO}/preflight`, { body: pf }), /the assigned technician records the preflight/); assert.equal((await call(T.tech2, 'POST', `${WO}/preflight`, { body: pf })).body.ok, true);
  await no(await call(T.tech1, 'POST', `${WO}/start`), /the assigned technician starts the work/); assert.equal((await call(T.tech2, 'POST', `${WO}/start`)).status, 200);
  await no(await call(T.tech1, 'POST', `${WO}/evidence`, { body: { kind: 'note', note: 'not mine (synthetic)' } }), /the assigned technician records the work/);
  assert.equal((await call(T.tech2, 'POST', `${WO}/evidence`, { body: { kind: 'photo', note: 'panels fitted to the side wall; photographs taken (synthetic)', ref: 'EV-SYN-SUITE-1' } })).status, 200);
  assert.equal((await call(T.tech2, 'POST', `${WO}/submit`)).status, 200);
  assert.equal((await call(T.tech2, 'POST', `${WO}/verify`, { body: { outcome: 'pass', note: 'mine (synthetic)' } })).status, 403, 'the technician does not verify their own work');
  assert.equal((await call(T.cxeng, 'POST', `${WO}/verify`, { body: { outcome: 'pass', note: 'checked in the room (synthetic)' } })).status, 200);
  const unconfirmed = await call(T.svcmgr, 'POST', `${WO}/close`, { body: { note: 'closed after verification (synthetic)', customerConfirmed: false } }); assert.equal(unconfirmed.status, 422, J(unconfirmed.body));
  assert.equal((await call(T.svcmgr, 'POST', `${WO}/close`, { body: { note: 'closed after verification (synthetic)', customerConfirmed: true } })).status, 200);
  const w = (await call(T.svcmgr, 'GET', WO)).body; assert.deepEqual([w.state, w.assignee.id, w.evidenceCount], ['CLOSED', T.id2, 1]);
  // a closed job passes no test and closes no deficiency
  assert.match((await call(T.cxeng, 'GET', S)).body.commissioning.rows.find((r) => r.test_id === RT).result, /^FAIL/);
});

test('SR-05 the retest is a new measurement after the correction; the deficiency closes on it, verified by someone else', async () => {
  const D = `/v1/issues/${ISSUE}/deficiency`; const step = (token, body) => call(token, 'POST', D, { body }); const day = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
  assert.equal((await step(T.cxeng, { step: 'start', ownerRole: 'service', targetDate: day })).status, 200);
  const causes = (await call(T.cxeng, 'GET', D)).body.rootCauses; const fixed = await step(T.tech2, { step: 'fixed', rootCause: causes.includes('ACOUSTICS') ? 'ACOUSTICS' : causes[0], action: 'Absorptive panels fitted to the side wall (synthetic)' }); assert.equal(fixed.status, 200, J(fixed.body));
  const words = await step(T.cxeng, { step: 'retest', result: 'PASS', evidence: 'it sounds better' }); assert.equal(words.status, 422, J(words.body));
  const m = await measure(T.cxeng, S, 0.7); assert.equal(m.status, 201, J(m.body)); assert.equal(m.body.within, true); const ev = await note(T.cxeng, 'session room retest');
  assert.equal((await result(T.cxeng, S, 'PASS', m.body.id, ev)).status, 201); T.retest = m.body.id;
  const ok = await step(T.cxeng, { step: 'retest', result: 'PASS', evidence: 'typed, not measured' }); assert.equal(ok.status, 200, J(ok.body)); assert.equal(ok.body.retest.evidence, `measurement ${m.body.id}: t30_mid 0.7 s`);
  assert.ok([403, 422].includes((await step(T.cxeng, { step: 'verify' })).status), 'not by whoever retested it');
  const closed = await step(T.syseng, { step: 'verify' }); assert.equal(closed.status, 200, J(closed.body)); assert.equal(closed.body.workflow, 'CLOSED');
});

test('SR-06 every other check recorded and independently verified; acceptance lent and given; baseline 1 keeps the designed place, the as-built place and the measured value', async () => {
  const ev = await note(T.cxeng, 'session room remaining checks'); const rows = () => call(T.cxeng, 'GET', S).then((r) => r.body.commissioning.rows.filter((x) => x.applicable));
  for (const r of (await rows()).filter((x) => !/^PASS/.test(x.result))) { const w = await call(T.cxeng, 'POST', `${S}/results`, { body: { testId: r.test_id, state: 'PASS', evidenceId: ev, evidenceKind: r.evidence[0], instrument: 'SYN-METER-01 (synthetic), calibration record SYN-CAL-2026-09' } }); assert.equal(w.status, 201, `${r.test_id}: ${J(w.body)}`); }
  assert.equal((await call(T.cxeng, 'POST', `${S}/results/${RT}/verify`)).status, 422, 'not by its recorder');
  for (const r of (await rows()).filter((x) => x.result !== 'PASS_VERIFIED')) { const v = await call(T.qa_reviewer, 'POST', `${S}/results/${r.test_id}/verify`); assert.equal(v.status, 200, `${r.test_id}: ${J(v.body)}`); }
  assert.ok([403, 422].includes((await call(T.qa_reviewer, 'POST', `${S}/lifecycle`, { body: { to: 'ACCEPTED' } })).status), 'the verifier does not accept');
  const ops = T.people.find((p) => p.role === 'opslead'); assert.equal((await call(T.qa_reviewer, 'POST', '/v1/delegations', { body: { granteeId: ops.id, authority: 'customer.accept', reason: 'synthetic: QA verified and does not accept', days: 2 } })).status, 201);
  // (added 18 Nov: acceptance also needs the documentation packet approved and signed by both sides, 0043)
  await documentRoom(c, S.replace('/v1/rooms/', ''), { submit: T.installer, review: T.qa_reviewer, vendor: T.opslead, internal: T.syseng });
  const acc = await call(T.opslead, 'POST', `${S}/lifecycle`, { body: { to: 'ACCEPTED' } }); assert.equal(acc.status, 200, J(acc.body));
  const b = (await call(T.syseng, 'GET', `${S}/baselines`)).body.current; assert.equal(b.version, 1);
  const place = b.devices.find((d) => d.id === cam.id).placement; assert.deepEqual([place.basis, place.designed.x, place.asBuilt.x, place.at.x], ['AS_BUILT', cam.x, built.x, built.x]);
  const rt = b.measurements.find((m) => m.test === RT); assert.deepEqual([rt.measurement, rt.value, rt.within, rt.criterion.upper, rt.criterion.version, rt.provenance], [T.retest, 0.7, true, 0.8, 1, 'SIMULATED'], J(rt));
  assert.equal(b.results[RT], 'PASS_VERIFIED'); assert.ok(b.devices.every((d) => suite.devices.some((x) => x.id === d.id)), 'the baseline lists this room’s positions and no other’s');
});

test('SR-07 two rooms, two records: the theatre is untouched, and a measurement of one room carries no result in the other', async () => {
  const hall = (await call(T.cxeng, 'GET', HALL)).body; assert.equal(hall.room.lifecycle, 'INSTALLED_UNVERIFIED'); assert.deepEqual(hall.issues, []);
  assert.deepEqual((await call(T.cxeng, 'GET', `${HALL}/measurements`)).body.items, []); assert.equal((await call(T.syseng, 'GET', `${HALL}/baselines`)).body.current, null);
  assert.ok(hall.commissioning.rows.filter((r) => r.applicable).every((r) => r.result === 'NOT_TESTED'), 'no result on the theatre');
  const field = (await call(T.cxeng, 'GET', `${HALL}/field-record`)).body; assert.equal(J(field).includes(cam.id), false, 'the session room’s camera is not in the theatre’s field record');
  // the theatre, commissioned now, does not take the session room's measurement for its own test
  await registerRoom(c, hall.room.code, T.installer); assert.equal((await call(T.syseng, 'POST', `${HALL}/lifecycle`, { body: { to: 'COMMISSIONING' } })).status, 200);
  const ev = await note(T.cxeng, 'theatre result'); const cross = await result(T.cxeng, HALL, 'PASS', T.retest, ev); assert.equal(cross.status, 422, J(cross.body)); assert.match(J(cross.body), /not a measurement of .* in this room/);
  assert.throws(() => h.asSuper(`INSERT INTO app.test_result (tenant_id, room_id, test_id, state, evidence_id, evidence_kind, instrument, recorded_by, recorded_role, measurement_id)
    SELECT r.tenant_id, r.id, '${RT}', 'PASS', '${ev}', 'INSTRUMENT_MEASURED', 'x', m.recorded_by, 'cxeng', m.id FROM app.measurement m, app.room r WHERE m.id = '${T.retest}' AND r.canonical_ref = 'UNI-SCI-110'`), /not a measurement of .* in this room/);
  // the same value is judged by each room's own limit: 0.95 s failed the session room and meets the theatre
  const m = await measure(T.cxeng, HALL, 0.95); assert.equal(m.status, 201, J(m.body)); assert.deepEqual([m.body.within, m.body.criterion.upper], [true, 1]);
  // and the third room, the huddle, was never touched
  const huddle = (await call(T.cxeng, 'GET', '/v1/rooms?limit=50')).body.items.find((r) => !r.canonicalRef); assert.equal(huddle.lifecycle, 'INSTALLED_UNVERIFIED');
});
