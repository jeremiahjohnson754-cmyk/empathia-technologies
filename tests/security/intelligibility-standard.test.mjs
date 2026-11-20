// The commissioning standard's intelligibility rule (migration 0048). Founder, 19 Nov 2026 03:36, priority 2: "Protect the adaptive
// commissioning requirements, including Pass with Exception, intelligibility exceptions, mandatory deficiency records, documentation
// gates, measurement workbenches, and baseline acceptance." The standard's control rule: "STI <= 0.40 or Fail/Marginal routes to
// intelligibility exceptions"; V3.9: "Intelligibility failures require dedicated exception records", "Test direct API attempts to
// bypass each gate". A real enterprise API on a real database, in demonstration sandboxes; every check reads the server or the database.
// The room is the lecture theatre, which has no site criterion for speech intelligibility.
//
//   IS-01  a site criterion for sti may be stricter than the standard, never looser: a lower limit of 0.40 or less, or none, is refused
//          by the API and by the database
//   IS-02  with no site criterion, an STI of 0.40 or less is never a PASS: citing it is refused, through the API and at the table
//   IS-03  nor is a PASS citing nothing while the latest STI of the test is at or below the floor
//   IS-04  recorded as FAIL it opens the deficiency, and that deficiency has its own exception record: the standard's floor is its limit,
//          with no criterion version, never a site limit the room does not have
//   IS-05  the deficiency is excepted only on its own approved record: through the API and written straight to the table
//   IS-06  readiness counts the test as PASS WITH EXCEPTION, never among the passes; the result stays FAIL
//   IS-07  above the floor, with no site criterion, a PASS is recorded as before; with a site criterion above the floor, a failed STI's
//          record rests on that criterion
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict';
import { setup, client, registerRoom } from '../integration/harness.mjs';

let h, c; const T = {}; const U = {}; const J = (x) => JSON.stringify(x); const HALL = '/v1/rooms/UNI-SCI-110'; const STI = 'audio_intelligibility';
const call = (token, method, p, o = {}) => c.call(method, p, { token, ...o });
const sql = (s) => h.asSuper(s); const throwsSql = (s, re) => { let err = null; try { sql(s); } catch (e) { err = String(e.message || e); } assert.ok(err, `refused: ${s.slice(0, 80)}`); if (re) assert.match(err, re); };
const evidence = async (token, text) => { const r = await call(token, 'POST', '/v1/evidence', { raw: `synthetic: ${text}`, headers: { 'content-type': 'text/plain', 'x-file-name': `${text.replace(/[^a-z0-9]+/gi, '-')}.txt` } }); assert.equal(r.status, 201, J(r.body)); return r.body.id; };
const measure = async (t, value) => { const ev = await evidence(t.cxeng, `STIPA readings ${value} ${Math.random().toString(36).slice(2, 7)}`);
  const r = await call(t.cxeng, 'POST', `${HALL}/measurements`, { body: { testId: STI, metric: 'sti', unit: 'index', value, method: 'IEC 60268-16 STIPA', measuredAt: new Date().toISOString(), location: 'six listener positions', source: 'synthetic STIPA readings (no room was measured)', provenance: 'SIMULATED', evidenceId: ev } });
  assert.equal(r.status, 201, J(r.body)); return { id: r.body.id, ev }; };
const result = (t, state, m, evidenceId) => call(t.cxeng, 'POST', `${HALL}/results`, { body: { testId: STI, state, evidenceId: evidenceId ?? m.ev, evidenceKind: 'INSTRUMENT_MEASURED', instrument: 'SYN-STIPA-01 (synthetic), calibration record SYN-CAL-2026-09', ...(m ? { measurementId: m.id } : {}) } });
const sandbox = async (t) => {
  const o = await c.call('POST', '/v1/demo/sandboxes', { body: {} }); assert.equal(o.status, 201, J(o.body)); const sb = o.body.sandbox; t.people = o.body.personas; t.tenant = sb.tenant;
  for (const role of ['designer', 'syseng', 'installer', 'cxeng', 'exec', 'qa_reviewer', 'opslead']) t[role] = (await c.call('POST', '/v1/demo/sessions', { body: { sandboxId: sb.id, key: sb.key, role } })).body.accessToken;
  await registerRoom(c, 'UNI-SCI-110', t.installer); const go = await call(t.syseng, 'POST', `${HALL}/lifecycle`, { body: { to: 'COMMISSIONING' } }); assert.equal(go.status, 200, J(go.body));
  t.room = sql(`SELECT r.id FROM app.room r JOIN app.tenant x ON x.id = r.tenant_id WHERE x.slug = '${sb.tenant}' AND r.canonical_ref = 'UNI-SCI-110'`);
  t.who = (role) => t.people.find((p) => p.role === role && p.seat === 1).id;
};
let ISSUE; const D = () => `/v1/issues/${ISSUE}/deficiency`;
const good = { whyPoor: 'STIPA at the back rows is 0.36: hard side walls and a long decay smear speech beyond the third row.', rootCause: 'untreated side walls', mitigation: 'Voice lift with steered columns and live captions on the LED wall until absorption is fitted next term.' };

before(async () => {
  h = await setup({ db: 'empathia_intelligibility', port: 4164, env: { DEMO_SESSIONS: 'on' } }); c = client(h.base); h.asSuper('UPDATE app.demo_config SET enabled = true');
  await sandbox(T);
  const row = (await call(T.cxeng, 'GET', HALL)).body.commissioning.rows.find((r) => r.test_id === STI); assert.ok(row?.applicable, 'speech intelligibility applies to the theatre');
  assert.equal(sql(`SELECT count(*) FROM app.acceptance_criterion WHERE room_id = '${T.room}' AND test_id = '${STI}'`), '0', 'no site criterion for sti');
});
after(async () => { await h?.app.stop(); });

test('IS-01 a criterion for sti is stricter than the standard, never looser: through the API and at the table', async () => {
  for (const body of [{ metric: 'sti', lower: 0.4, source: 'brief (synthetic)' }, { metric: 'sti', lower: 0.35, source: 'brief (synthetic)' }, { metric: 'sti', upper: 0.9, source: 'brief (synthetic)' }]) {
    const r = await call(T.syseng, 'PUT', `${HALL}/criteria/${STI}`, { body }); assert.equal(r.status, 422, J(r.body)); assert.match(J(r.body), /routes a speech transmission index of 0\.40 or less/);
  }
  throwsSql(`INSERT INTO app.acceptance_criterion (tenant_id, room_id, test_id, version, metric, unit, lower, source, set_by) SELECT tenant_id, id, '${STI}', 1, 'sti', 'index', 0.40, 'written to the table', '${T.who('syseng')}' FROM app.room WHERE id = '${T.room}'`, /lower limit above/);
  assert.equal(sql(`SELECT count(*) FROM app.acceptance_criterion WHERE room_id = '${T.room}' AND test_id = '${STI}'`), '0', 'nothing was set');
});

test('IS-02 with no site criterion, an STI of 0.40 or less is never a PASS: through the API and at the table', async () => {
  for (const v of [0.4, 0.36]) {
    const m = await measure(T, v); const r = await result(T, 'PASS', m); assert.equal(r.status, 422, `${v}: ${J(r.body)}`); assert.match(J(r.body), /at or below the commissioning standard/);
    assert.equal(sql(`SELECT within IS NULL FROM app.measurement WHERE id = '${m.id}'`), 't', 'no site criterion: no judgement of its own');
    throwsSql(`INSERT INTO app.test_result (tenant_id, room_id, test_id, state, evidence_id, evidence_kind, instrument, recorded_by, recorded_role, measurement_id)
      SELECT tenant_id, '${T.room}', '${STI}', 'PASS', '${m.ev}', 'INSTRUMENT_MEASURED', 'SYN-STIPA-01', '${T.who('cxeng')}', 'cxeng', '${m.id}' FROM app.room WHERE id = '${T.room}'`, /routes it to an intelligibility exception/);
    T.low = m;
  }
  assert.equal(sql(`SELECT count(*) FROM app.test_result WHERE room_id = '${T.room}' AND test_id = '${STI}'`), '0', 'no result was recorded');
});

test('IS-03 nor is a PASS citing nothing while the latest STI is at or below the floor', async () => {
  const ev = await evidence(T.cxeng, 'a walk-through, no instrument');
  const r = await result(T, 'PASS', null, ev); assert.equal(r.status, 422, J(r.body)); assert.match(J(r.body), /latest speech transmission index/);
  throwsSql(`INSERT INTO app.test_result (tenant_id, room_id, test_id, state, evidence_id, evidence_kind, instrument, recorded_by, recorded_role)
    SELECT tenant_id, '${T.room}', '${STI}', 'PASS', '${ev}', 'INSTRUMENT_MEASURED', 'SYN-STIPA-01', '${T.who('cxeng')}', 'cxeng' FROM app.room WHERE id = '${T.room}'`, /a PASS cites a measurement above it/);
});

test('IS-04 recorded as FAIL it opens the deficiency, whose exception record names the standard’s floor, not a site limit', async () => {
  const f = await result(T, 'FAIL', T.low); assert.equal(f.status, 201, J(f.body));
  ISSUE = sql(`SELECT code FROM app.room_issue WHERE room_id = '${T.room}' AND key = 'test-failed:${STI}' AND state = 'OPEN'`); assert.ok(ISSUE, 'the FAIL opened a deficiency');
  const exec = await call(T.exec, 'POST', `/v1/issues/${ISSUE}/measured-exception`, { body: good }); assert.equal(exec.status, 403, J(exec.body));
  const r = await call(T.cxeng, 'POST', `/v1/issues/${ISSUE}/measured-exception`, { body: good }); assert.equal(r.status, 201, J(r.body)); T.exc = r.body.code;
  assert.deepEqual(r.body.measured, { value: 0.36, metric: 'sti', unit: 'index' }); assert.deepEqual(r.body.limit, { lower: 0.4, upper: null, criterionVersion: null });
  assert.equal(r.body.basis, 'commissioning standard'); assert.match(r.body.words, /the commissioning standard/); assert.doesNotMatch(r.body.words, /criterion version/);
  assert.equal(sql(`SELECT (criterion_id IS NULL) || ' ' || (criterion_version IS NULL) || ' ' || lower FROM app.measured_exception WHERE code = '${T.exc}' AND room_id = '${T.room}'`), 'true true 0.4000');
  // the table's own rule: a record with no criterion is the standard's, an STI at the floor, and nothing else
  throwsSql(`UPDATE app.measured_exception SET lower = 0.30 WHERE code = '${T.exc}' AND room_id = '${T.room}'`, /EM020|immutable/);
});

test('IS-05 the deficiency is excepted only on its own approved record — through the API and at the table', async () => {
  const day = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
  assert.equal((await call(T.cxeng, 'POST', D(), { body: { step: 'start', ownerRole: 'installer', targetDate: day } })).status, 200);
  const early = await call(T.syseng, 'POST', D(), { body: { step: 'except', exceptionRef: T.exc, requestedBy: T.who('cxeng') } }); assert.equal(early.status, 422, J(early.body)); assert.match(J(early.body), /REQUESTED: only an approved/);
  throwsSql(`UPDATE app.room_issue SET workflow = 'ACCEPTED_EXCEPTION', exception_ref = 'anything', exception_requested_by = '${T.who('cxeng')}', exception_approved_by = '${T.who('syseng')}' WHERE code = '${ISSUE}' AND room_id = '${T.room}'`, /only on its own approved exception record/);
  const self = await call(T.cxeng, 'POST', `/v1/measured-exceptions/${T.exc}/decide`, { body: { decision: 'APPROVED' } }); assert.ok([403, 422].includes(self.status), J(self.body));
  const ok = await call(T.syseng, 'POST', `/v1/measured-exceptions/${T.exc}/decide`, { body: { decision: 'APPROVED', note: 'Accepted with voice lift and captions in place.' } }); assert.equal(ok.status, 200, J(ok.body));
  const r = await call(T.syseng, 'POST', D(), { body: { step: 'except', exceptionRef: T.exc } }); assert.equal(r.status, 200, J(r.body)); assert.equal(r.body.workflow ?? r.body.state, 'ACCEPTED_EXCEPTION');
});

test('IS-06 readiness counts PASS WITH EXCEPTION, never a pass; the result stays FAIL', async () => {
  const r = await call(T.syseng, 'GET', `${HALL}/readiness`); assert.equal(r.status, 200, J(r.body)); const words = J(r.body.next?.blockers || r.body);
  assert.match(words, /1 PASS WITH EXCEPTION/); assert.match(words, /0 of \d+ passed and independently verified/);
  assert.equal(sql(`SELECT result_label FROM app.current_result WHERE room_id = '${T.room}' AND test_id = '${STI}'`), 'FAIL');
});

test('IS-07 above the floor with no criterion a PASS is as before; with a site criterion, a failed STI rests on it', async () => {
  await sandbox(U);
  const hi = await measure(U, 0.52); const p = await result(U, 'PASS', hi); assert.equal(p.status, 201, J(p.body));
  const set = await call(U.syseng, 'PUT', `${HALL}/criteria/${STI}`, { body: { metric: 'sti', lower: 0.55, source: 'Lecture capture brief: STIPA 0.55 at every seat (synthetic)' } }); assert.equal(set.status, 200, J(set.body));
  const lo = await measure(U, 0.38); assert.equal(sql(`SELECT within FROM app.measurement WHERE id = '${lo.id}'`), 'f', 'judged against the site criterion');
  const pass = await result(U, 'PASS', lo); assert.equal(pass.status, 422, J(pass.body));
  const f = await result(U, 'FAIL', lo); assert.equal(f.status, 201, J(f.body));
  const issue = sql(`SELECT code FROM app.room_issue WHERE room_id = '${U.room}' AND key = 'test-failed:${STI}' AND state = 'OPEN'`); assert.ok(issue);
  const r = await call(U.cxeng, 'POST', `/v1/issues/${issue}/measured-exception`, { body: good }); assert.equal(r.status, 201, J(r.body));
  assert.deepEqual(r.body.limit, { lower: 0.55, upper: null, criterionVersion: 1 }); assert.equal(r.body.basis, 'site criterion');
});
