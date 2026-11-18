// Pass with Exception for a measured test (migration 0042; 50/10 master directive §3.1, the V3.9 rules: "Pass with Exception also
// requires a deficiency", "Intelligibility failures require dedicated exception records", "Acceptance cannot bypass server-side rules",
// "Test direct API attempts to bypass each gate"). A real enterprise API on a real database, in a demonstration sandbox; every check
// reads the server or the database. The room is the lecture theatre: reverberation measured 1.42 s against at most 1 s, recorded FAIL.
//
//   ME-01  a record is only for a deficiency opened by a failed measured test with a criterion, and says why, the root cause and the
//          mitigation; a role without the authority is refused
//   ME-02  the measured value, metric, unit and limit are the database's, from the measurement the FAIL rests on — never the request's
//   ME-03  the decision: never by the logger, never by a role without baseline.approve, a rejection says why, and only once
//   ME-04  the deficiency is excepted only on its own APPROVED record: no reference, a made-up one, a rejected one and a requested one
//          are each refused through the API; and written straight to the table, the database refuses the same
//   ME-05  a rejected record is followed by a new one; approved, the deficiency is excepted by someone other than its logger
//   ME-06  a record is immutable and never deleted, whoever writes
//   ME-07  readiness: the excepted deficiency no longer blocks acceptance as open, and the test is counted as PASS WITH EXCEPTION,
//          never among the passes
//   ME-08  another organization neither reads nor decides the records; its own room has none
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict';
import { setup, client, registerRoom } from '../integration/harness.mjs';
import { analyseBands, meanOverPositions, syntheticIR } from '@empathia/commissioning-engine/acoustics';

let h, c, sb; const T = {}; const J = (x) => JSON.stringify(x); const HALL = '/v1/rooms/UNI-SCI-110'; const RT = 'reverberation_rt60';
const call = (token, method, p, o = {}) => c.call(method, p, { token, ...o });
const sql = (s) => h.asSuper(s); const throwsSql = (s, re) => { let err = null; try { sql(s); } catch (e) { err = String(e.message || e); } assert.ok(err, `refused: ${s.slice(0, 80)}`); if (re) assert.match(err, re); };
const evidence = async (token, text) => { const r = await call(token, 'POST', '/v1/evidence', { raw: `synthetic: ${text}`, headers: { 'content-type': 'text/plain', 'x-file-name': `${text.replace(/[^a-z0-9]+/gi, '-')}.txt` } }); assert.equal(r.status, 201, J(r.body)); return r.body.id; };
// four reference decays whose T30 (500 Hz and 1 kHz, mean over positions) is the target: the server works the value out again (0040)
const mid = (irs) => { const m = meanOverPositions(irs.map((ir) => analyseBands(ir))); const a = m.find((x) => x.band === '500 Hz').t30.mean; const b = m.find((x) => x.band === '1 kHz').t30.mean; return Math.round(((a + b) / 2) * 100) / 100; };
const decaysFor = (target) => { let d = target; for (let i = 0; i < 40; i++) { const ds = [0, 1, 2, 3].map((k) => Math.round(d * (1 + 0.02 * (k - 1.5)) * 1000) / 1000);
  const got = mid(ds.map((x, k) => syntheticIR(x, { rate: 16000, seed: 20 + k * 13, floorDb: -80 }))); if (got === target) return ds; d = Math.round((d + (target - got) * 0.7) * 1000) / 1000; } throw new Error(`no decays give ${target}`); };
const packageFor = async (token, target) => { const ds = decaysFor(target);
  const body = { kind: 'reverberation analysis package', test: RT, metric: 't30_mid', unit: 's', value: target, synthetic: true, positions: ds.map((x, k) => ({ position: k + 1, response: { synthetic: true, decaySeconds: x, seed: 20 + k * 13, rate: 16000, floorDb: -80 } })) };
  const r = await call(token, 'POST', '/v1/evidence', { raw: JSON.stringify(body), headers: { 'content-type': 'text/plain', 'x-file-name': 'analysis-package.json' } }); assert.equal(r.status, 201, J(r.body)); return r.body.id; };
const who = (role) => T.people.find((p) => p.role === role && p.seat === 1).id;
let ISSUE, OTHER, MEAS; const D = () => `/v1/issues/${ISSUE}/deficiency`; const LOG = (i = ISSUE) => `/v1/issues/${i}/measured-exception`;
const good = { whyPoor: 'Hard parallel side walls give a long decay at 500 Hz and 1 kHz; speech in the back rows smears.', rootCause: 'untreated side walls', mitigation: 'Voice lift with steered columns and captioning on the LED wall until absorption panels are fitted next term.' };

before(async () => {
  h = await setup({ db: 'empathia_measured_exception', port: 4161, env: { DEMO_SESSIONS: 'on' } }); c = client(h.base); h.asSuper('UPDATE app.demo_config SET enabled = true');
  const o = await c.call('POST', '/v1/demo/sandboxes', { body: {} }); assert.equal(o.status, 201, J(o.body)); sb = o.body.sandbox; T.people = o.body.personas;
  for (const role of ['designer', 'syseng', 'installer', 'cxeng', 'exec', 'qa_reviewer', 'opslead', 'steward']) T[role] = (await c.call('POST', '/v1/demo/sessions', { body: { sandboxId: sb.id, key: sb.key, role } })).body.accessToken;
  await registerRoom(c, 'UNI-SCI-110', T.installer); const go = await call(T.syseng, 'POST', `${HALL}/lifecycle`, { body: { to: 'COMMISSIONING' } }); assert.equal(go.status, 200, J(go.body));
  const ev = await packageFor(T.cxeng, 1.42);
  const m = await call(T.cxeng, 'POST', `${HALL}/measurements`, { body: { testId: RT, metric: 't30_mid', unit: 's', value: 1.42, method: 'ISO 3382-2 integrated impulse response, T30', measuredAt: new Date().toISOString(), location: 'four receiver positions', source: 'synthetic reference responses (no room was measured)', provenance: 'SIMULATED', evidenceId: ev } });
  assert.equal(m.status, 201, J(m.body)); MEAS = m.body.id;
  const f = await call(T.cxeng, 'POST', `${HALL}/results`, { body: { testId: RT, state: 'FAIL', evidenceId: ev, evidenceKind: 'INSTRUMENT_MEASURED', instrument: 'SYN-METER-01 (synthetic)', measurementId: MEAS } }); assert.equal(f.status, 201, J(f.body));
  const room = sql(`SELECT r.id FROM app.room r JOIN app.tenant t ON t.id = r.tenant_id WHERE t.slug = '${sb.tenant}' AND r.canonical_ref = 'UNI-SCI-110'`); T.room = room;
  ISSUE = sql(`SELECT code FROM app.room_issue WHERE room_id = '${room}' AND key = 'test-failed:${RT}'`); assert.ok(ISSUE, 'the FAIL opened a deficiency');
  // a FAIL of a test with no criterion: its deficiency is not one a measured exception is for
  const rows = (await call(T.cxeng, 'GET', HALL)).body.commissioning.rows.filter((r) => r.applicable && r.test_id !== RT && r.personas.includes('cxeng') && !/measured/i.test(r.evidence.join(' ')));
  const row = rows[0]; assert.ok(row, 'a test of the theatre without a criterion'); const ev2 = await evidence(T.cxeng, 'observation');
  const f2 = await call(T.cxeng, 'POST', `${HALL}/results`, { body: { testId: row.test_id, state: 'FAIL', evidenceId: ev2, evidenceKind: row.evidence[0], instrument: 'SYN-METER-01 (synthetic)' } }); assert.equal(f2.status, 201, J(f2.body));
  OTHER = sql(`SELECT code FROM app.room_issue WHERE room_id = '${room}' AND key = 'test-failed:${row.test_id}'`); assert.ok(OTHER);
});
after(async () => { await h?.app.stop(); });

test('ME-01 a record is for a failed measured test with a criterion, says why, the root cause and the mitigation, and needs the authority', async () => {
  const other = await call(T.cxeng, 'POST', LOG(OTHER), { body: good }); assert.equal(other.status, 422, J(other.body)); assert.match(J(other.body), /has no criterion for/);
  const thin = await call(T.cxeng, 'POST', LOG(), { body: { whyPoor: 'bad', rootCause: 'x', mitigation: 'later' } }); assert.equal(thin.status, 422, J(thin.body));
  for (const re of [/why the value is poor/, /root cause/, /what mitigates it/]) assert.match(J(thin.body), re);
  const exec = await call(T.exec, 'POST', LOG(), { body: good }); assert.equal(exec.status, 403, J(exec.body));
  assert.equal(Number(sql('SELECT count(*) FROM app.measured_exception')), 0, 'nothing was recorded by the refused requests');
});

test('ME-02 the measured value, metric and limit are the database’s, from the measurement the FAIL rests on', async () => {
  const r = await call(T.cxeng, 'POST', LOG(), { body: good }); assert.equal(r.status, 201, J(r.body)); T.first = r.body.code;
  assert.match(r.body.code, /^EXC-\d{4}$/); assert.deepEqual([r.body.state, r.body.issue, r.body.test, r.body.measurementId], ['REQUESTED', ISSUE, RT, MEAS]);
  assert.deepEqual(r.body.measured, { value: 1.42, metric: 't30_mid', unit: 's' }); assert.deepEqual(r.body.limit, { lower: null, upper: 1, criterionVersion: 1 });
  assert.doesNotMatch(r.body.words, /\bPASS\b(?! WITH EXCEPTION)/, 'never worded as a pass');
  // written to the table directly with other figures, the database replaces them with the measurement's
  throwsSql(`INSERT INTO app.measured_exception (tenant_id, code, room_id, issue_id, test_id, measurement_id, measured_value, upper, why_poor, root_cause, mitigation, logged_by)
    SELECT tenant_id, 'EXC-9001', room_id, id, 'x', '${MEAS}', 0.5, 9, '${good.whyPoor}', 'walls', '${good.mitigation}', '${who('cxeng')}' FROM app.room_issue WHERE code = '${ISSUE}' AND room_id = '${T.room}'`, /not rejected|measured_exception_one_live|duplicate/);
  assert.equal(sql(`SELECT measured_value || ' ' || upper FROM app.measured_exception WHERE code = '${T.first}' AND room_id = '${T.room}'`), '1.42 1.0000');
});

test('ME-03 the decision: never by its logger, never without baseline.approve, a rejection says why, once', async () => {
  const self = await call(T.cxeng, 'POST', `/v1/measured-exceptions/${T.first}/decide`, { body: { decision: 'APPROVED' } }); assert.ok([403, 422].includes(self.status), J(self.body));
  const exec = await call(T.exec, 'POST', `/v1/measured-exceptions/${T.first}/decide`, { body: { decision: 'APPROVED' } }); assert.equal(exec.status, 403, J(exec.body));
  const bare = await call(T.syseng, 'POST', `/v1/measured-exceptions/${T.first}/decide`, { body: { decision: 'REJECTED' } }); assert.equal(bare.status, 422, J(bare.body)); assert.match(J(bare.body), /a rejection says why/);
  const no = await call(T.syseng, 'POST', `/v1/measured-exceptions/${T.first}/decide`, { body: { decision: 'REJECTED', note: 'No mitigation date: say when the panels are fitted.' } }); assert.equal(no.status, 200, J(no.body)); assert.equal(no.body.state, 'REJECTED');
  const again = await call(T.syseng, 'POST', `/v1/measured-exceptions/${T.first}/decide`, { body: { decision: 'APPROVED' } }); assert.equal(again.status, 422, J(again.body)); assert.match(J(again.body), /decided already/);
  // the two rule refusals are on the record's own trail (the two 403s are refused before the record is looked up, by the route's authority)
  const denied = Number(sql(`SELECT count(*) FROM app.audit_event WHERE aggregate_id = '${T.first}' AND outcome = 'DENIED'`)); assert.ok(denied >= 2, `${denied} refusals on the record's audit trail`);
});

test('ME-04 the deficiency is excepted only on its own approved record — through the API and in the table', async () => {
  const day = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
  assert.equal((await call(T.cxeng, 'POST', D(), { body: { step: 'start', ownerRole: 'installer', targetDate: day } })).status, 200);
  const cx = who('cxeng');
  for (const [ref, re] of [['', /its own exception record/], ['EXC-0999', /its own exception record/], [T.first, /REJECTED: only an approved exception record/]]) {
    const r = await call(T.syseng, 'POST', D(), { body: { step: 'except', exceptionRef: ref, requestedBy: cx } }); assert.equal(r.status, 422, `${ref}: ${J(r.body)}`); assert.match(J(r.body), re);
  }
  const next = await call(T.cxeng, 'POST', LOG(), { body: { ...good, mitigation: `${good.mitigation} Panels fitted by ${day}.` } }); assert.equal(next.status, 201, J(next.body)); T.second = next.body.code;
  const early = await call(T.syseng, 'POST', D(), { body: { step: 'except', exceptionRef: T.second, requestedBy: cx } }); assert.equal(early.status, 422); assert.match(J(early.body), /REQUESTED: only an approved/);
  // the same, written straight to the table by a writer that skips the API: refused by the database
  const sys = who('syseng');
  throwsSql(`UPDATE app.room_issue SET workflow = 'ACCEPTED_EXCEPTION', exception_ref = '${T.second}', exception_requested_by = '${cx}', exception_approved_by = '${sys}' WHERE code = '${ISSUE}' AND room_id = '${T.room}'`, /only on its own approved exception record/);
  throwsSql(`UPDATE app.room_issue SET workflow = 'ACCEPTED_EXCEPTION', exception_ref = 'anything', exception_requested_by = '${cx}', exception_approved_by = '${sys}' WHERE code = '${ISSUE}' AND room_id = '${T.room}'`, /only on its own approved exception record/);
  assert.equal(sql(`SELECT workflow FROM app.room_issue WHERE code = '${ISSUE}' AND room_id = '${T.room}'`), 'IN_PROGRESS');
});

test('ME-05 approved, the deficiency is excepted on it by someone other than its logger', async () => {
  const ok = await call(T.syseng, 'POST', `/v1/measured-exceptions/${T.second}/decide`, { body: { decision: 'APPROVED', note: 'Accepted with the mitigation in place.' } }); assert.equal(ok.status, 200, J(ok.body)); assert.match(ok.body.next, /except/);
  const byLogger = await call(T.cxeng, 'POST', D(), { body: { step: 'except', exceptionRef: T.second } }); assert.ok([403, 422].includes(byLogger.status), J(byLogger.body));
  const r = await call(T.syseng, 'POST', D(), { body: { step: 'except', exceptionRef: T.second } }); assert.equal(r.status, 200, J(r.body)); assert.equal(r.body.workflow ?? r.body.state, 'ACCEPTED_EXCEPTION');
  const row = sql(`SELECT i.exception_ref || ' ' || (i.exception_requested_by = x.logged_by) || ' ' || (i.exception_approved_by = x.decided_by) FROM app.room_issue i JOIN app.measured_exception x ON x.issue_id = i.id AND x.code = i.exception_ref WHERE i.code = '${ISSUE}' AND i.room_id = '${T.room}'`);
  assert.equal(row, `${T.second} true true`, 'the deficiency names the record, its logger as requester and its decider as approver');
});

test('ME-06 a record is immutable and never deleted, whoever writes', async () => {
  for (const set of ['measured_value = 0.9', "why_poor = 'it was fine really, nothing to see'", "state = 'REQUESTED', decided_by = NULL, decided_at = NULL", "state = 'REJECTED'"])
    throwsSql(`UPDATE app.measured_exception SET ${set} WHERE code = '${T.second}' AND room_id = '${T.room}'`, /EM020|measured_exception_decided/);
  throwsSql(`DELETE FROM app.measured_exception WHERE code = '${T.first}' AND room_id = '${T.room}'`, /never deleted/);
  const list = await call(T.qa_reviewer, 'GET', `${HALL}/measured-exceptions`); assert.equal(list.status, 200); assert.deepEqual(list.body.items.map((x) => [x.code, x.state]), [[T.first, 'REJECTED'], [T.second, 'APPROVED']]);
});

test('ME-07 readiness: the excepted deficiency does not block acceptance as open, and the test is PASS WITH EXCEPTION, never a pass', async () => {
  const r = await call(T.syseng, 'GET', `${HALL}/readiness`); assert.equal(r.status, 200, J(r.body)); const words = J(r.body.next?.blockers || r.body);
  // two deficiencies were open before ME-05 (the measured one and the other test's); the excepted one no longer counts, the other does
  assert.match(words, /1 PASS WITH EXCEPTION/); assert.match(words, /"1 open issue/); assert.match(words, /0 of 92 passed and independently verified/);
  const other = await call(T.syseng, 'GET', HALL); const label = other.body.commissioning.rows.find((x) => x.test_id === RT); assert.notEqual(label?.result, 'PASS_VERIFIED');
  assert.equal(sql(`SELECT result_label FROM app.current_result WHERE room_id = '${T.room}' AND test_id = '${RT}'`), 'FAIL', 'the result stays a FAIL');
});

test('ME-08 another organization neither reads nor decides the records', async () => {
  const o = await c.call('POST', '/v1/demo/sandboxes', { body: {} }); assert.equal(o.status, 201, J(o.body)); const x = o.body.sandbox;
  const sys = (await c.call('POST', '/v1/demo/sessions', { body: { sandboxId: x.id, key: x.key, role: 'syseng' } })).body.accessToken;
  const mine = await call(sys, 'GET', `${HALL}/measured-exceptions`); assert.equal(mine.status, 200); assert.deepEqual(mine.body.items, [], 'its own theatre has none');
  const d = await call(sys, 'POST', `/v1/measured-exceptions/${T.second}/decide`, { body: { decision: 'REJECTED', note: 'from another organization' } }); assert.equal(d.status, 404, J(d.body));
  const cx = (await c.call('POST', '/v1/demo/sessions', { body: { sandboxId: x.id, key: x.key, role: 'cxeng' } })).body.accessToken;
  const l = await call(cx, 'POST', LOG(), { body: good }); assert.ok([404, 422].includes(l.status), J(l.body));   // their own issue of that code, if any, is not a failed measured test
  assert.equal(Number(sql(`SELECT count(*) FROM app.measured_exception x JOIN app.tenant t ON t.id = x.tenant_id WHERE t.slug = '${x.tenant}'`)), 0);
  assert.equal(sql(`SELECT state FROM app.measured_exception WHERE code = '${T.second}' AND room_id = '${T.room}'`), 'APPROVED');
});
