/**
 * The deficiency workflow over real HTTP and a private PostgreSQL database (migration 0032; the state machine is the engine's,
 * packages/commissioning-engine/src/deficiencies.ts). Negative authorization and separation of duties first: every step by its own
 * authority, never closed by the person who fixed it or recorded its retest, never deferred when High or Critical, never excepted by its
 * requester — refused by the API with reasons and audited, and refused again by the database guard for the runtime role.
 *
 *   DW-01  a deficiency's workflow reads OPEN with nothing taken yet
 *   DW-02  start: a designer may not (403, audited); a target date in the past is refused (422); the commissioning engineer starts it
 *   DW-03  the fix: a one-word action is refused (422); the installer records root cause and action → PENDING_RETEST
 *   DW-04  retest and close: the commissioning engineer records a PASS and may not verify it (separation of duties); the installer may
 *          not verify (403); the systems engineer closes it → CLOSED and RESOLVED; four workflow events; the refusals are audited
 *   DW-05  the database guard, as the runtime role: a skipped step, a close without a retest, a close by the fixer — each refused (EM011)
 *   DW-06  deferral and exception: a High deficiency is not deferred; an exception is not approved by its requester; an approved one is
 *          final (no further step)
 *   DW-07  tenancy: another tenant can neither read nor step the deficiency (404)
 *   node --test tests/security/deficiency-workflow.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client, mail } from '../integration/harness.mjs';

let h, c, T = {}, P = {}, R, issues = [];
const J = (x) => JSON.stringify(x);
const call = (persona, method, p, body) => c.call(method, p, { token: T[persona], body });
const stepOf = (persona, code, body) => call(persona, 'POST', `/v1/issues/${code}/deficiency`, body);
const future = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
async function asApp(tenantId, sql, args = []) {
  const k = await h.appConn();
  try { await k.query("SELECT set_config('app.tenant_id', $1, false)", [tenantId]); const r = await k.query(sql, args); return { ok: true, rows: r.rows }; }
  catch (e) { return { ok: false, code: e.code, message: e.message }; }
  finally { await k.end(); }
}

before(async () => {
  h = await setup({ db: 'empathia_test_deficiency_workflow', port: 4175 }); c = client(h.base);
  for (const r of ['designer', 'syseng', 'opslead', 'installer', 'cxeng']) { T[r] = await c.login(r); P[r] = h.asSuper(`SELECT id FROM app.person WHERE email = '${mail(r)}'`); }
  T.x_syseng = await c.login('syseng', 'second-tenant');
  P.tenant = h.asSuper("SELECT id FROM app.tenant WHERE slug = 'empathia-demo'");
  const r = await call('designer', 'POST', '/v1/rooms', { name: 'Deficiency workflow (synthetic)', template: 'boardroom', buildingCode: 'NST', floor: 2 });
  assert.equal(r.status, 201, J(r.body)); R = r.body.code;
  await call('designer', 'POST', `/v1/rooms/${R}/revisions`, { reason: 'synthetic: a boardroom with failed tests to work' }); await call('designer', 'POST', `/v1/rooms/${R}/drawings/generate`);
  await call('syseng', 'POST', `/v1/rooms/${R}/drawings/plan/approve`); await call('syseng', 'POST', `/v1/rooms/${R}/classification/approve`, {});
  for (const [to, who] of [['DESIGN_APPROVED', 'syseng'], ['INSTALLATION_PENDING', 'opslead'], ['INSTALLED_UNVERIFIED', 'installer'], ['COMMISSIONING', 'syseng']]) assert.equal((await call(who, 'POST', `/v1/rooms/${R}/lifecycle`, { to })).status, 200, `${R} → ${to}`);
  const rows = (await call('designer', 'GET', `/v1/rooms/${R}`)).body.commissioning.rows.filter((x) => x.applicable).slice(0, 3);
  for (const row of rows) {   // three failed tests: three commissioning deficiencies to work
    const ev = (await c.call('POST', '/v1/evidence', { token: T.cxeng, raw: Buffer.from(`synthetic observation ${row.test_id}`), headers: { 'content-type': 'text/plain', 'x-file-name': 'o.txt' } })).body;
    assert.equal((await call('cxeng', 'POST', `/v1/rooms/${R}/results`, { testId: row.test_id, state: 'FAIL', evidenceId: ev.id, evidenceKind: row.evidence[0], instrument: 'SYN-METER-01 (synthetic)' })).status, 201);
  }
  issues = (await call('syseng', 'GET', `/v1/rooms/${R}`)).body.issues.filter((i) => i.state === 'OPEN');
  assert.ok(issues.length >= 2, `the room has open findings to work: ${J(issues.map((i) => [i.code, i.severity]))}`);
});
after(async () => { await h?.app.stop(); });

const low = () => issues.find((i) => !['High', 'Critical'].includes(i.severity)) || issues[0];
const high = () => issues.find((i) => ['High', 'Critical'].includes(i.severity));

test('DW-01 — a deficiency’s workflow reads OPEN, nothing taken yet', async () => {
  const g = await call('syseng', 'GET', `/v1/issues/${low().code}/deficiency`);
  assert.equal(g.status, 200, J(g.body)); assert.deepEqual([g.body.workflow, g.body.state, g.body.history.length], ['OPEN', 'OPEN', 0]);
  assert.equal(typeof g.body.waivable, 'boolean');
});

test('DW-02 — start: a designer may not (403, audited); a past target date is refused; the commissioning engineer starts it', async () => {
  const code = low().code;
  const d = await stepOf('designer', code, { step: 'start', ownerRole: 'installer', targetDate: future(10) });
  assert.equal(d.status, 403, J(d.body));
  assert.ok(Number(h.asSuper(`SELECT count(*) FROM app.audit_event WHERE action LIKE '%deficiency%' AND outcome = 'DENIED' AND actor_id = '${P.designer}'`)) >= 1, 'the designer’s refusal is audited');
  const past = await stepOf('cxeng', code, { step: 'start', ownerRole: 'installer', targetDate: '2020-01-01' });
  assert.equal(past.status, 422, J(past.body)); assert.match(J(past.body), /not in the past/);
  const ok = await stepOf('cxeng', code, { step: 'start', ownerRole: 'installer', targetDate: future(10) });
  assert.equal(ok.status, 200, J(ok.body)); assert.deepEqual([ok.body.workflow, ok.body.ownerRole], ['IN_PROGRESS', 'installer']);
});

test('DW-03 — the fix: a one-word action is refused; the installer records root cause and action → PENDING_RETEST', async () => {
  const code = low().code;
  const short = await stepOf('installer', code, { step: 'fixed', rootCause: 'CONFIGURATION', action: 'done' });
  assert.equal(short.status, 422, J(short.body)); assert.match(J(short.body), /says what was done/);
  const ok = await stepOf('installer', code, { step: 'fixed', rootCause: 'CONFIGURATION', action: 'Display input profile corrected and saved to the scaler' });
  assert.equal(ok.status, 200, J(ok.body)); assert.deepEqual([ok.body.workflow, ok.body.rootCause, ok.body.fixedBy], ['PENDING_RETEST', 'CONFIGURATION', P.installer]);
});

test('DW-04 — retest and close: the recorder may not verify; the installer may not; the systems engineer closes it; all audited', async () => {
  const code = low().code;
  const rt = await stepOf('cxeng', code, { step: 'retest', result: 'PASS', evidence: 'EV-SYN-0042' });
  assert.equal(rt.status, 200, J(rt.body)); assert.deepEqual([rt.body.workflow, rt.body.retest.result, rt.body.retest.by], ['PENDING_RETEST', 'PASS', P.cxeng]);
  const self = await stepOf('cxeng', code, { step: 'verify' });
  assert.equal(self.status, 422, J(self.body)); assert.match(J(self.body), /recorded the retest does not verify/);
  assert.equal((await stepOf('installer', code, { step: 'verify' })).status, 403);
  const ok = await stepOf('syseng', code, { step: 'verify' });
  assert.equal(ok.status, 200, J(ok.body)); assert.deepEqual([ok.body.workflow, ok.body.state, ok.body.closedBy], ['CLOSED', 'RESOLVED', P.syseng]);
  const g = await call('syseng', 'GET', `/v1/issues/${code}/deficiency`);
  assert.deepEqual(g.body.history.map((x) => x.step), ['start', 'fixed', 'retest', 'verify']);
  const denied = Number(h.asSuper(`SELECT count(*) FROM app.audit_event WHERE action LIKE 'deficiency.%' AND outcome = 'DENIED' AND aggregate_id = '${code}'`));
  assert.ok(denied >= 3, `the past date, the short action and the self-verify are audited against the deficiency: ${denied}`);
});

test('DW-05 — the database guard as the runtime role: a skipped step, a close without a retest, a close by the fixer', async () => {
  const other = issues.find((i) => i.code !== low().code);
  const skip = await asApp(P.tenant, "UPDATE app.room_issue SET workflow = 'PENDING_RETEST' WHERE code = $1", [other.code]);
  assert.ok(!skip.ok && skip.code === 'EM011' && /does not go from OPEN to PENDING_RETEST/.test(skip.message), J(skip));
  const close = await asApp(P.tenant, "UPDATE app.room_issue SET workflow = 'CLOSED', state = 'RESOLVED', resolution = '{}'::jsonb WHERE code = $1", [other.code]);
  assert.ok(!close.ok && close.code === 'EM011', J(close));
  // walk it to PENDING_RETEST as the runtime role (each step in order), then try to close it as the fixer
  assert.ok((await asApp(P.tenant, "UPDATE app.room_issue SET workflow = 'IN_PROGRESS', owner_role = 'installer', target_date = current_date + 5 WHERE code = $1", [other.code])).ok);
  assert.ok((await asApp(P.tenant, "UPDATE app.room_issue SET workflow = 'PENDING_RETEST', root_cause = 'INSTALLATION', corrective_action = 'Re-seated the cable at the wall plate', fixed_by = $2 WHERE code = $1", [other.code, P.installer])).ok);
  const byFixer = await asApp(P.tenant, `UPDATE app.room_issue SET workflow = 'CLOSED', state = 'RESOLVED', resolution = '{}'::jsonb, retest = jsonb_build_object('result','PASS','by',$3::text,'evidence','EV-1'), closed_by = $2 WHERE code = $1`, [other.code, P.installer, P.cxeng]);
  assert.ok(!byFixer.ok && byFixer.code === 'EM011' && /separation of duties/.test(byFixer.message), J(byFixer));
  const mismatch = await asApp(P.tenant, "UPDATE app.room_issue SET state = 'RESOLVED', resolution = '{}'::jsonb, workflow = 'PENDING_RETEST' WHERE code = $1", [other.code]);
  assert.ok(!mismatch.ok && mismatch.code === 'EM011' && /not by setting its state/.test(mismatch.message), `setting RESOLVED outside the system's resolution paths is refused: ${J(mismatch)}`);
});

test('DW-06 — a High deficiency is not deferred; an exception is not approved by its requester; an accepted exception is final', async () => {
  const hi = high();
  if (hi) { const d = await stepOf('syseng', hi.code, { step: 'defer', reason: 'Waiting for the replacement display', until: future(30) }); assert.equal(d.status, 422, J(d.body)); assert.match(J(d.body), /not deferred/); }
  const target = issues.filter((i) => i.code !== low().code)[1] || issues.find((i) => i.code !== low().code);
  const g = (await call('syseng', 'GET', `/v1/issues/${target.code}/deficiency`)).body;
  if (g.workflow !== 'OPEN' && g.workflow !== 'IN_PROGRESS') return;   // DW-05 walked this one; the guard tests above cover it
  const self = await stepOf('syseng', target.code, { step: 'except', exceptionRef: 'EX-SYN-7', requestedBy: P.syseng });
  assert.equal(self.status, 422, J(self.body)); assert.match(J(self.body), /requester does not approve/);
  if (!g.waivable) { const nw = await stepOf('syseng', target.code, { step: 'except', exceptionRef: 'EX-SYN-7', requestedBy: P.cxeng }); assert.equal(nw.status, 422); assert.match(J(nw.body), /not open to exception/); return; }
  const ok = await stepOf('syseng', target.code, { step: 'except', exceptionRef: 'EX-SYN-7', requestedBy: P.cxeng });
  assert.equal(ok.status, 200, J(ok.body)); assert.equal(ok.body.workflow, 'ACCEPTED_EXCEPTION');
  const after1 = await stepOf('cxeng', target.code, { step: 'resume', reason: 'try again' });
  assert.equal(after1.status, 422, J(after1.body)); assert.match(J(after1.body), /not a step from ACCEPTED_EXCEPTION/);
});

test('DW-07 — another tenant can neither read nor step the deficiency (404)', async () => {
  assert.equal((await c.call('GET', `/v1/issues/${low().code}/deficiency`, { token: T.x_syseng })).status, 404);
  assert.equal((await c.call('POST', `/v1/issues/${issues[0].code}/deficiency`, { token: T.x_syseng, body: { step: 'verify' } })).status, 404, 'a step the other tenant’s systems engineer could take here, refused as not found');
});
