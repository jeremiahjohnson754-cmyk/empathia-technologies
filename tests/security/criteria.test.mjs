// Acceptance criteria, measurements judged against them, and the results that rest on them (migration 0037; founder, 17 Nov 2026:
// "the measurement benches writing directly to authoritative server records").
//
// Every check goes to the API or to the database; none goes through a page. The rule under test: where a room has a criterion for a
// test, a result cites a measurement judged against the criterion in force, and PASS needs that measurement to meet it and to be a
// field measurement on a calibrated instrument — or, in a demonstration sandbox only, a SIMULATED value.
//
//   CR-01  a sandbox opens with one criterion on the lecture theatre (reverberation), set by the design authority; the other measured
//          tests have none, and the scenario room has none
//   CR-02  a criterion is set only by the design authority, only for a metric the test is measured in, with a limit in range and a
//          source; a changed limit is a new version and the earlier one stays; the database refuses edits and skipped versions
//   CR-03  a measurement for a test is refused before commissioning, without an evidence file, in the wrong metric or unit, out of
//          range, and from a role that is not responsible for the test
//   CR-04  the database judges the value: a request cannot say "within", and a row written straight to the table is judged the same way
//   CR-05  with a criterion, a result without a measurement is refused; PASS on a measurement that misses the limit is refused; FAIL on
//          it is recorded and opens a deficiency that states what was measured against what
//   CR-06  PASS on a measurement that meets the limit is recorded and waits for independent verification, and the measurement says it
//          was cited
//   CR-07  when the limit changes, a measurement judged against the old version no longer carries a result: measure again
//   CR-08  provenance: an uncalibrated field measurement and an inferred value pass nothing, even within the limit
//   CR-09  outside a sandbox a SIMULATED value passes nothing — through the API, and again when the row is written to the table directly
//   CR-10  a room with no criterion for a test is as before: its result needs no measurement, and a measurement of it has no verdict
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict';
import { setup, client, registerRoom } from '../integration/harness.mjs';

let h, c; const T = {}; const J = (x) => JSON.stringify(x); const HALL = '/v1/rooms/UNI-SCI-110'; const RT = 'reverberation_rt60';
const call = (token, method, p, o = {}) => c.call(method, p, { token, ...o });
const evidence = async (token, text) => { const r = await call(token, 'POST', '/v1/evidence', { raw: `synthetic: ${text}`, headers: { 'content-type': 'text/plain', 'x-file-name': `${text.replace(/[^a-z0-9]+/gi, '-')}.txt` } }); assert.equal(r.status, 201, J(r.body)); return r.body.id; };
const reading = (o = {}) => ({ testId: RT, metric: 't30_mid', unit: 's', value: 1.42, method: 'ISO 3382-2 integrated impulse response, T30', measuredAt: new Date().toISOString(), location: 'four receiver positions', source: 'synthetic reference responses (no room was measured)', provenance: 'SIMULATED', ...o });
const measure = async (token, base, o = {}) => call(token, 'POST', `${base}/measurements`, { body: reading({ evidenceId: o.evidenceId || await evidence(token, `impulse responses ${Math.random().toString(36).slice(2, 8)}`), ...o }) });
const result = (token, base, state, measurementId, evidenceId, testId = RT) => call(token, 'POST', `${base}/results`, { body: { testId, state, evidenceId, evidenceKind: 'INSTRUMENT_MEASURED', instrument: 'SYN-METER-01 (synthetic), calibration record SYN-CAL-2026-09', ...(measurementId ? { measurementId } : {}) } });

before(async () => {
  h = await setup({ db: 'empathia_criteria', port: 4153, env: { DEMO_SESSIONS: 'on' } }); c = client(h.base); h.asSuper('UPDATE app.demo_config SET enabled = true');
  const o = await c.call('POST', '/v1/demo/sandboxes', { body: {} }); assert.equal(o.status, 201, J(o.body)); const sb = o.body.sandbox; T.scenario = o.body.scenario?.room || sb.room;
  for (const role of ['designer', 'syseng', 'installer', 'cxeng', 'exec', 'qa_reviewer']) T[role] = (await c.call('POST', '/v1/demo/sessions', { body: { sandboxId: sb.id, key: sb.key, role } })).body.accessToken;
});
after(async () => { await h.app.stop(); });

test('CR-01 a sandbox opens with one criterion on the lecture theatre, set by the design authority; nothing else has one', async () => {
  const k = await call(T.cxeng, 'GET', `${HALL}/criteria`); assert.equal(k.status, 200, J(k.body));
  const rt = k.body.tests.find((t) => t.test === RT); assert.ok(rt?.criterion, 'reverberation has a criterion');
  assert.deepEqual([rt.criterion.metric, rt.criterion.unit, rt.criterion.lower, rt.criterion.upper, rt.criterion.version], ['t30_mid', 's', null, 1, 1]);
  assert.match(rt.criterion.source, /synthetic/); assert.match(rt.criterion.setBy, /Systems Engineer/); assert.equal(rt.criterion.words, 'at most 1 s'); assert.equal(k.body.sandbox, true);
  const others = k.body.tests.filter((t) => t.test !== RT); assert.equal(others.length, 4, J(others.map((t) => t.test))); assert.ok(others.every((t) => t.criterion === null), 'no limit is invented for the other measured tests');
  assert.equal(rt.mayMeasure, false, 'not in commissioning yet');
  const rooms = (await call(T.cxeng, 'GET', '/v1/rooms?limit=50')).body.items; const scenario = rooms.find((r) => r.canonicalRef !== 'UNI-SCI-110');
  const s = await call(T.cxeng, 'GET', `/v1/rooms/${scenario.code}/criteria`); assert.equal(s.status, 200); assert.equal(s.body.versions.length, 0, 'the scenario room has no criterion'); T.scenario = scenario.code;
});

test('CR-02 a criterion is the design authority’s, for a metric the test is measured in, with a limit and a source; a change is a new version', async () => {
  const put = (token, t, body) => call(token, 'PUT', `${HALL}/criteria/${t}`, { body });
  assert.equal((await put(T.designer, 'audio_noise_floor', { metric: 'laeq', upper: 35, source: 'brief (synthetic)' })).status, 403, 'a designer does not hold room.design.approve');
  assert.equal((await put(T.cxeng, 'audio_noise_floor', { metric: 'laeq', upper: 35, source: 'brief (synthetic)' })).status, 403, 'the person who measures does not set what is measured against');
  for (const [t, body, re] of [['audio_noise_floor', { metric: 'laeq', source: 'brief (synthetic)' }, /lower limit, an upper limit, or both/], ['audio_noise_floor', { metric: 't30_mid', upper: 1, source: 'brief (synthetic)' }, /measured as laeq/],
    ['audio_noise_floor', { metric: 'laeq', upper: 400, source: 'brief (synthetic)' }, /not a limit for it/], ['audio_noise_floor', { metric: 'laeq', lower: 40, upper: 30, source: 'brief (synthetic)' }, /not above the upper/],
    ['network_reachability', { metric: 'laeq', upper: 35, source: 'brief (synthetic)' }, /not an instrument-measured test/]]) {
    const r = await put(T.syseng, t, body); assert.equal(r.status, 422, J(r.body)); assert.match(J(r.body), re);
  }
  const v1 = await put(T.syseng, 'audio_noise_floor', { metric: 'laeq', upper: 35, source: 'Acoustic brief, background noise (synthetic)' }); assert.equal(v1.status, 200, J(v1.body)); assert.equal(v1.body.version, 1);
  const v2 = await put(T.syseng, 'audio_noise_floor', { metric: 'laeq', upper: 38, source: 'Revised with the client: ventilation as installed (synthetic)' }); assert.equal(v2.body.version, 2); assert.match(v2.body.note, /version 1 keep that judgement/);
  const k = (await call(T.cxeng, 'GET', `${HALL}/criteria`)).body; const vs = k.versions.filter((v) => v.test === 'audio_noise_floor');
  assert.deepEqual(vs.map((v) => [v.version, v.upper, v.inForce]), [[1, 35, false], [2, 38, true]], 'the earlier version stays, and is not in force');
  assert.equal(k.tests.find((t) => t.test === 'audio_noise_floor').criterion.version, 2);
  // the database: no edit, no delete, no skipped version, whoever asks
  assert.throws(() => h.asSuper("UPDATE app.acceptance_criterion SET upper = 99 WHERE test_id = 'audio_noise_floor'"), /append-only|may not be changed|refuse|immutable/i);
  assert.throws(() => h.asSuper("DELETE FROM app.acceptance_criterion WHERE test_id = 'audio_noise_floor'"), /append-only|may not be changed|refuse|immutable/i);
  assert.throws(() => h.asSuper("INSERT INTO app.acceptance_criterion (tenant_id, room_id, test_id, version, metric, unit, upper, source, set_by) SELECT tenant_id, room_id, test_id, 7, metric, unit, 30, 'skipping ahead', set_by FROM app.acceptance_criterion WHERE test_id = 'audio_noise_floor' AND version = 1"), /does not follow/);
});

test('CR-03 a measurement for a test is refused before commissioning, without evidence, in the wrong metric or unit, out of range, or from a role that is not responsible', async () => {
  const early = await measure(T.cxeng, HALL); assert.equal(early.status, 422, J(early.body)); assert.match(J(early.body), /COMMISSIONING/);
  await registerRoom(c, 'UNI-SCI-110', T.installer); const go = await call(T.syseng, 'POST', `${HALL}/lifecycle`, { body: { to: 'COMMISSIONING' } }); assert.equal(go.status, 200, J(go.body));
  const ev = await evidence(T.cxeng, 'impulse responses');
  const none = await call(T.cxeng, 'POST', `${HALL}/measurements`, { body: reading() }); assert.equal(none.status, 422); assert.match(J(none.body), /rests on an evidence file/);
  for (const [o, re] of [[{ metric: 'laeq', unit: 'dB(A)', value: 30 }, /measured as t30_mid or t20_mid/], [{ unit: 'ms' }, /t30_mid is recorded in/], [{ value: 45 }, /not a reading of it/], [{ testId: 'not_a_test' }, /does not apply to this room/]]) {
    const r = await measure(T.cxeng, HALL, { evidenceId: ev, ...o }); assert.equal(r.status, 422, J(r.body)); assert.match(J(r.body), re);
  }
  const inst = await measure(T.installer, HALL, { evidenceId: ev }); assert.equal(inst.status, 403, J(inst.body)); assert.match(J(inst.body), /not the responsible role/);
  assert.equal((await measure(T.exec, HALL, { evidenceId: ev })).status, 403);
  assert.equal(Number(h.asSuper("SELECT count(*) FROM app.measurement WHERE test_id IS NOT NULL")), 0, 'none of the refused measurements was written');
  const denied = Number(h.asSuper("SELECT count(*) FROM app.audit_event WHERE action = 'measurement.record' AND outcome = 'DENIED'")); assert.ok(denied >= 5, `${denied} refusals are in the audit trail`);
});

test('CR-04 the database judges the value: a request cannot say "within", and a row written straight to the table is judged the same way', async () => {
  const lie = await call(T.cxeng, 'POST', `${HALL}/measurements`, { body: { ...reading({ evidenceId: await evidence(T.cxeng, 'a') }), within: true } });
  assert.ok([400, 422].includes(lie.status), `a request naming "within" is refused (${lie.status})`); assert.match(J(lie.body), /within/);
  const bad = await measure(T.cxeng, HALL, { value: 1.42 }); assert.equal(bad.status, 201, J(bad.body)); assert.equal(bad.body.within, false); assert.match(bad.body.says, /does not meet the criterion \(at most 1 s, version 1\)/); T.bad = bad.body.id;
  const edge = await measure(T.cxeng, HALL, { value: 1 }); assert.equal(edge.body.within, true, 'at the limit is within it');
  const good = await measure(T.cxeng, HALL, { value: 0.82 }); assert.equal(good.body.within, true); assert.match(good.body.says, /meets the criterion/); T.good = good.body.id;
  // straight to the table, claiming to be within and judged against nothing
  h.asSuper(`INSERT INTO app.measurement (tenant_id, room_id, metric, value, unit, method, measured_at, location, source, provenance, calibration_status, recorded_by, recorded_role, test_id, evidence_id, criterion_id, within)
    SELECT tenant_id, room_id, metric, 1.9, unit, method, now(), location, 'written to the table directly (test)', provenance, calibration_status, recorded_by, recorded_role, test_id, evidence_id, NULL, NULL FROM app.measurement WHERE id = '${T.good}'`);
  assert.equal(h.asSuper("SELECT within::text || ' ' || (criterion_id IS NOT NULL)::text FROM app.measurement WHERE source = 'written to the table directly (test)'"), 'false true', 'the trigger judged it against the criterion in force');
  assert.throws(() => h.asSuper(`UPDATE app.measurement SET within = true WHERE id = '${T.bad}'`), /immutable/);
  const list = (await call(T.cxeng, 'GET', `${HALL}/measurements`)).body.items.filter((m) => m.test_id === RT); assert.equal(list.length, 4);
  assert.ok(list.every((m) => m.criterion_version === 1 && m.evidence_id), 'each names the version it was judged against and its evidence');
});

test('CR-05 with a criterion, a result needs a measurement; PASS on one that misses the limit is refused; FAIL on it opens a deficiency that states the measurement', async () => {
  const ev = await evidence(T.cxeng, 'analysis');
  const bare = await result(T.cxeng, HALL, 'PASS', null, ev); assert.equal(bare.status, 422, J(bare.body)); assert.match(J(bare.body), /has an acceptance criterion on this room \(t30_mid at most 1 s, version 1\): record a measurement and cite it/);
  const bareFail = await result(T.cxeng, HALL, 'FAIL', null, ev); assert.equal(bareFail.status, 422, 'a FAIL without the measurement is refused too');
  const pass = await result(T.cxeng, HALL, 'PASS', T.bad, ev); assert.equal(pass.status, 422, J(pass.body)); assert.match(J(pass.body), /t30_mid 1\.42 s, which does not meet the criterion \(at most 1 s, version 1\): it cannot be recorded as PASS/);
  const other = await result(T.cxeng, HALL, 'PASS', T.good, ev, 'audio_intelligibility'); assert.equal(other.status, 422); assert.match(J(other.body), /not a measurement of audio_intelligibility/);
  assert.equal(Number(h.asSuper(`SELECT count(*) FROM app.test_result t JOIN app.room r ON r.id = t.room_id WHERE r.canonical_ref = 'UNI-SCI-110'`)), 0, 'nothing was recorded by the refused requests');
  const fail = await result(T.cxeng, HALL, 'FAIL', T.bad, ev); assert.equal(fail.status, 201, J(fail.body));
  const issue = h.asSuper("SELECT rationale FROM app.room_issue WHERE key = 'test-failed:reverberation_rt60'"); assert.match(issue, /Measured t30_mid 1\.42 s, criterion at most 1 s \(version 1\), SIMULATED/);
  assert.equal(h.asSuper(`SELECT measurement_id FROM app.test_result WHERE test_id = '${RT}' AND state = 'FAIL'`), T.bad, 'the result names its measurement');
});

test('CR-06 PASS on a measurement that meets the limit is recorded, waits for independent verification, and the measurement says it was cited', async () => {
  const ev = await evidence(T.cxeng, 'retest analysis'); const pass = await result(T.cxeng, HALL, 'PASS', T.good, ev); assert.equal(pass.status, 201, J(pass.body)); assert.equal(pass.body.resultLabel, 'PASS_UNVERIFIED');
  const self = await call(T.cxeng, 'POST', `${HALL}/results/${RT}/verify`); assert.ok([403, 422].includes(self.status), `its recorder does not verify it (${self.status})`); T.selfVerify = JSON.stringify(self.body);
  assert.equal(h.asSuper(`SELECT count(*) FROM app.verification v JOIN app.test_result t ON t.id = v.result_id WHERE t.test_id = '${RT}'`), '0', T.selfVerify);
  const m = (await call(T.cxeng, 'GET', `${HALL}/measurements`)).body.items.find((x) => x.id === T.good); assert.equal(m.cited_by_result, 'PASS');
});

test('CR-07 when the limit changes, a measurement judged against the old version no longer carries a result', async () => {
  const v2 = await call(T.syseng, 'PUT', `${HALL}/criteria/${RT}`, { body: { metric: 't30_mid', upper: 0.9, source: 'Revised brief: lecture capture (synthetic)' } }); assert.equal(v2.status, 200, J(v2.body)); assert.equal(v2.body.version, 2);
  const ev = await evidence(T.cxeng, 'again'); const stale = await result(T.cxeng, HALL, 'PASS', T.good, ev); assert.equal(stale.status, 422, J(stale.body)); assert.match(J(stale.body), /not judged against the criterion in force \(version 2\): measure again/);
  const again = await measure(T.cxeng, HALL, { value: 0.95 }); assert.equal(again.body.within, false, '0.95 s met version 1 and does not meet version 2'); assert.equal(again.body.criterion.version, 2);
  const ok = await measure(T.cxeng, HALL, { value: 0.82 }); assert.equal(ok.body.within, true); T.good2 = ok.body.id;
  assert.equal((await result(T.cxeng, HALL, 'PASS', T.good2, ev)).status, 201);
  assert.equal(h.asSuper(`SELECT within FROM app.measurement WHERE id = '${T.good}'`), 't', 'the earlier judgement is kept as it was made');
});

test('CR-08 an uncalibrated field measurement and an inferred value pass nothing, even within the limit', async () => {
  const ev = await evidence(T.cxeng, 'phone recording');
  const phone = await measure(T.cxeng, HALL, { value: 0.8, provenance: 'FIELD_MEASURED', instrumentId: 'phone microphone (synthetic)', calibrationStatus: 'UNKNOWN' }); assert.equal(phone.status, 201, J(phone.body)); assert.equal(phone.body.within, true);
  const p = await result(T.cxeng, HALL, 'PASS', phone.body.id, ev); assert.equal(p.status, 422, J(p.body)); assert.match(J(p.body), /calibration is UNKNOWN: it is indicative and does not pass/);
  const inferred = await measure(T.cxeng, HALL, { value: 0.8, provenance: 'INFERRED' }); const i = await result(T.cxeng, HALL, 'PASS', inferred.body.id, ev); assert.equal(i.status, 422); assert.match(J(i.body), /INFERRED: a test with a criterion passes on a field measurement/);
  const cal = await measure(T.cxeng, HALL, { value: 0.8, provenance: 'FIELD_MEASURED', instrumentId: 'SYN-ANALYSER-02 (synthetic)', calibrationStatus: 'CALIBRATED', calibrationDue: '2027-09-30' });
  assert.equal((await result(T.cxeng, HALL, 'PASS', cal.body.id, ev)).status, 201, 'a calibrated field measurement within the limit passes');
});

test('CR-09 outside a sandbox a SIMULATED value passes nothing, through the API and at the table', async () => {
  const t = {}; for (const r of ['designer', 'syseng', 'opslead', 'installer', 'cxeng']) t[r] = await c.login(r);
  const made = await call(t.designer, 'POST', '/v1/rooms', { body: { name: 'Criteria fixture room (synthetic)', template: 'auditorium', buildingCode: 'ATL', floor: 1 } }); assert.equal(made.status, 201, J(made.body)); const R = `/v1/rooms/${made.body.code}`;
  for (const [who, p, body] of [[t.designer, '/drawings/generate'], [t.syseng, '/drawings/plan/approve'], [t.syseng, '/classification/approve', {}]]) { const r = await call(who, 'POST', `${R}${p}`, body ? { body } : {}); assert.ok(r.status < 300, `${p}: ${r.status} ${J(r.body)}`); }
  for (const [to, who] of [['DESIGN_APPROVED', t.syseng], ['INSTALLATION_PENDING', t.opslead], ['INSTALLED_UNVERIFIED', t.installer]]) assert.equal((await call(who, 'POST', `${R}/lifecycle`, { body: { to } })).status, 200, to);
  assert.equal((await call(t.syseng, 'PUT', `${R}/criteria/${RT}`, { body: { metric: 't30_mid', upper: 1, source: 'fixture brief (synthetic)' } })).status, 200);
  await registerRoom(c, made.body.code, t.installer); assert.equal((await call(t.syseng, 'POST', `${R}/lifecycle`, { body: { to: 'COMMISSIONING' } })).status, 200);
  assert.equal((await call(t.cxeng, 'GET', `${R}/criteria`)).body.sandbox, false);
  const sim = await measure(t.cxeng, R, { value: 0.8 }); assert.equal(sim.status, 201, J(sim.body)); assert.equal(sim.body.within, true, 'it is judged, as any value is');
  const ev = await evidence(t.cxeng, 'fixture'); const p = await result(t.cxeng, R, 'PASS', sim.body.id, ev); assert.equal(p.status, 422, J(p.body)); assert.match(J(p.body), /SIMULATED: a simulated value is not a measurement of a room and passes nothing outside a demonstration sandbox/);
  // round the API: the same row written to the table by the database's owner is refused by the table
  assert.throws(() => h.asSuper(`INSERT INTO app.test_result (tenant_id, room_id, test_id, state, evidence_id, evidence_kind, instrument, recorded_by, recorded_role, measurement_id)
    SELECT m.tenant_id, m.room_id, m.test_id, 'PASS', '${ev}', 'INSTRUMENT_MEASURED', 'x', m.recorded_by, 'cxeng', m.id FROM app.measurement m WHERE m.id = '${sim.body.id}'`), /does not pass a test that has a criterion/);
  assert.throws(() => h.asSuper(`INSERT INTO app.test_result (tenant_id, room_id, test_id, state, evidence_id, evidence_kind, instrument, recorded_by, recorded_role)
    SELECT m.tenant_id, m.room_id, m.test_id, 'PASS', '${ev}', 'INSTRUMENT_MEASURED', 'x', m.recorded_by, 'cxeng' FROM app.measurement m WHERE m.id = '${sim.body.id}'`), /its result cites a measurement/);
  assert.equal((await result(t.cxeng, R, 'FAIL', sim.body.id, ev)).status, 201, 'a simulated value may still be the reason something is recorded as not passed');
});

test('CR-10 a room with no criterion for a test is as before: no measurement needed, and no verdict on one', async () => {
  const S = `/v1/rooms/${T.scenario}`; await registerRoom(c, T.scenario, T.installer); assert.equal((await call(T.syseng, 'POST', `${S}/lifecycle`, { body: { to: 'COMMISSIONING' } })).status, 200);
  const rows = (await call(T.cxeng, 'GET', S)).body.commissioning.rows.filter((r) => r.applicable); const row = rows[0]; const ev = await evidence(T.cxeng, 'observation');
  const r = await call(T.cxeng, 'POST', `${S}/results`, { body: { testId: row.test_id, state: 'PASS', evidenceId: ev, evidenceKind: row.evidence[0], instrument: 'SYN-METER-01 (synthetic)' } }); assert.equal(r.status, 201, J(r.body));
  const cov = await measure(T.cxeng, HALL, { testId: 'acoustic_coverage', metric: 'laeq_spread', unit: 'dB', value: 4.5 }); assert.equal(cov.status, 201, J(cov.body)); assert.equal(cov.body.within, null); assert.equal(cov.body.criterion, null); assert.match(cov.body.says, /no criterion for acoustic_coverage, so there is no verdict/);
  const plain = await call(T.cxeng, 'POST', `${HALL}/measurements`, { body: { metric: 'spl_laeq', value: 62, unit: 'dB(A)', method: 'observation', measuredAt: new Date().toISOString(), location: 'row 4', source: 'walk-through', provenance: 'OBSERVED' } }); assert.equal(plain.status, 201, J(plain.body)); assert.equal(plain.body.within, undefined, 'a measurement that names no test is the record it always was');
});
