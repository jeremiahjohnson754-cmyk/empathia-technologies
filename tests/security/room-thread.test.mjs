/**
 * The digital thread on the server (founder, 16 Nov 2026: "a full enterprise-grade digital thread still needs durable records,
 * relationship integrity, audit history, and reliable cross-session persistence"). One room is taken through the real API from a failed
 * commissioning test to an accepted baseline and a diagnosis, and GET /v1/rooms/:room/thread is read at each point. Synthetic data only.
 *
 *   TH-01  before anything is handed over the thread has its six stages, lists the open deficiency and says what is missing
 *   TH-02  the handoff: a designer is refused (403, audited); the service manager raises the work order; the thread links the
 *          deficiency to the work order by the keys the database holds
 *   TH-03  the work order runs the service machine to CLOSED; the deficiency is still OPEN and the thread says so
 *   TH-04  the deficiency closes only by a retest with evidence verified by someone else; the thread carries the retest evidence
 *   TH-05  every applicable test passes and is verified, the room is accepted, baseline v1 is published; the thread shows it CURRENT
 *   TH-06  an APEX case is opened on the deficiency: hypotheses with caveats; the thread is then complete, with every link
 *   TH-07  durable and cross-session: a different person, on a new session, reads the same thread; the rows and their foreign keys
 *          are in the database; a work order cannot exist without its issue (the database refuses it)
 *   TH-08  tenancy: another tenant can neither read the thread nor raise a work order or a case on the deficiency (404)
 *   TH-09  the audit history: the thread's audit summary counts exactly the audit rows of its room, issues, work orders and cases,
 *          allowed and refused, and the tenant's audit chain verifies
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client, DEV_PASSWORD, mail, registerRoom, documentRoom } from '../integration/harness.mjs';

let h, c, room, issue, wo, apx, failed; const T = {}; const J = (x) => JSON.stringify(x);
const instrument = 'SYN-METER-01 (synthetic), calibration record SYN-CAL-2026-09';
const call = (persona, method, p, opts = {}) => c.call(method, p, { token: opts.token || T[persona], body: opts.body, headers: opts.headers, raw: opts.raw });
const thread = async (persona = 'syseng', token) => { const r = await call(persona, 'GET', `/v1/rooms/${room}/thread`, { token }); assert.equal(r.status, 200, J(r.body)); return r.body; };
const stage = (t, k) => t.stages.find((s) => s.key === k).records;
const fresh = async (role, tenant = 'empathia-demo') => (await c.call('POST', '/v1/auth/token', { body: { email: mail(role, tenant), password: DEV_PASSWORD, tenant, role } })).body.accessToken;
const evidence = async (label) => (await call('cxeng', 'POST', '/v1/evidence', { raw: Buffer.from(`synthetic observation: ${label}`), headers: { 'content-type': 'text/plain', 'x-file-name': `${label}.txt` } })).body;
const who = (r) => h.asSuper(`SELECT id FROM app.person WHERE email = '${mail(r)}'`);
const future = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

before(async () => {
  h = await setup({ db: 'empathia_thread', port: 4183 }); c = client(h.base);
  for (const r of ['designer', 'syseng', 'opslead', 'installer', 'cxeng', 'svcmgr', 'service', 'qa_reviewer', 'steward']) T[r] = await c.login(r);
  T.x_syseng = await c.login('syseng', 'second-tenant');
  room = (await call('designer', 'POST', '/v1/rooms', { body: { name: 'Thread Huddle (synthetic)', template: 'huddle', buildingCode: 'ATL', floor: 4 } })).body.code;
  await call('designer', 'POST', `/v1/rooms/${room}/revisions`, { body: { reason: 'thread' } }); await call('designer', 'POST', `/v1/rooms/${room}/drawings/generate`);
  await call('syseng', 'POST', `/v1/rooms/${room}/drawings/plan/approve`); await call('syseng', 'POST', `/v1/rooms/${room}/classification/approve`, { body: {} });
  for (const [to, p] of [['DESIGN_APPROVED', 'syseng'], ['INSTALLATION_PENDING', 'opslead'], ['INSTALLED_UNVERIFIED', 'installer'], ['COMMISSIONING', 'syseng']]) {
    if (to === 'COMMISSIONING') await registerRoom(c, room, T.installer);
    assert.equal((await call(p, 'POST', `/v1/rooms/${room}/lifecycle`, { body: { to } })).status, 200, to); }
  const row = (await call('designer', 'GET', `/v1/rooms/${room}`)).body.commissioning.rows.find((x) => x.applicable); failed = row;
  const ev = await evidence('the failing observation');
  assert.equal((await call('cxeng', 'POST', `/v1/rooms/${room}/results`, { body: { testId: row.test_id, state: 'FAIL', evidenceId: ev.id, evidenceKind: row.evidence[0], instrument } })).status, 201);
  issue = (await call('designer', 'GET', `/v1/rooms/${room}`)).body.issues.find((i) => i.state === 'OPEN').code;
});
after(async () => { await h?.app.stop(); });

test('TH-01 before the handoff: six stages, the open deficiency, and what is missing', async () => {
  const t = await thread();
  assert.deepEqual(t.stages.map((s) => s.key), ['lite', 'engineering', 'commissioning', 'service', 'assurance', 'apex']);
  assert.deepEqual([t.room.code, t.room.lifecycle], [room, 'COMMISSIONING']);
  assert.ok(stage(t, 'lite').positions >= 3); assert.ok(stage(t, 'engineering').revisions.length >= 1 && /^[0-9a-f]{64}$/.test(stage(t, 'engineering').revisions[0].sha256));
  assert.equal(stage(t, 'engineering').register.complete, stage(t, 'engineering').register.devices, 'the register gate was met');
  const i = stage(t, 'commissioning').issues.find((x) => x.code === issue); assert.deepEqual([i.state, i.workflow, i.workOrders.length, i.cases.length], ['OPEN', 'OPEN', 0, 0]);
  assert.equal(t.complete, false); for (const m of [/handed to service/, /accepted baseline/, /APEX case/]) assert.ok(t.missing.some((x) => m.test(x)), `${m} in ${t.missing.join(' | ')}`);
  assert.deepEqual(t.links.map((l) => `${l.from}>${l.to}`), ['lite>engineering', 'engineering>commissioning']);
});

test('TH-02 the handoff: the designer is refused and audited; the service manager raises the work order; the thread links them', async () => {
  const no = await call('designer', 'POST', `/v1/issues/${issue}/work-orders`, { body: { note: 'not mine to raise' } }); assert.equal(no.status, 403);
  const r = await call('svcmgr', 'POST', `/v1/issues/${issue}/work-orders`, { body: { note: 'handed over from commissioning (synthetic)' } }); assert.equal(r.status, 201, J(r.body)); wo = r.body.workOrderId;
  const t = await thread(); const l = t.links.find((x) => x.from === 'commissioning' && x.to === 'service');
  assert.deepEqual(l.keys, { issue, workOrder: wo }); assert.deepEqual(stage(t, 'service').workOrders.map((w) => [w.code, w.issue, w.state]), [[wo, issue, 'OPEN']]);
  assert.deepEqual(stage(t, 'commissioning').issues.find((x) => x.code === issue).workOrders, [wo]);
});

test('TH-03 the work order runs to CLOSED; the deficiency is still OPEN and the thread says so', async () => {
  const w = (p, persona, body) => call(persona, 'POST', `/v1/work-orders/${wo}${p}`, { body: body ?? {} }); const ok = async (x, l) => { const r = await x; assert.equal(r.status, 200, `${l}: ${J(r.body)}`); return r.body; };
  await ok(w('/triage', 'svcmgr', { severity: 'High', scope: 'the failing check and its device', risk: 'room under commissioning', workType: 'camera_replacement', window: { from: new Date(Date.now() + 864e5).toISOString(), to: new Date(Date.now() + 864e5 + 4 * 36e5).toISOString() } }), 'triage');
  await ok(w('/assign', 'svcmgr', { personId: who('service') }), 'assign'); await ok(w('/accept', 'service'), 'accept');
  await ok(w('/preflight', 'service', { safetyBriefed: true, toolsConfirmed: ['PTZ service kit', 'laptop with the camera tool'], accessConfirmedBy: 'facilities desk (synthetic)', stock: { 'camera unit': { onHand: 1, checkedAt: new Date().toISOString() }, 'mounting plate': { onHand: 2, checkedAt: new Date().toISOString() } } }), 'preflight');
  await ok(w('/start', 'service'), 'start'); assert.equal((await w('/submit', 'service')).status, 422, 'no evidence yet');
  await ok(w('/evidence', 'service', { kind: 'photo', note: 'unit reseated and the cable replaced', ref: 'EV-SYN-WO-1' }), 'evidence'); await ok(w('/submit', 'service'), 'submit');
  assert.equal((await w('/verify', 'service', { outcome: 'pass', note: 'mine' })).status, 403, 'the technician does not verify their own work');
  assert.equal((await ok(w('/verify', 'cxeng', { outcome: 'pass', note: 'checked in the room (synthetic)' }), 'verify')).state, 'RESOLVED');
  assert.equal((await ok(w('/close', 'svcmgr', { note: 'confirmed by the requester (synthetic)', customerConfirmed: true }), 'close')).state, 'CLOSED');
  const t = await thread(); const s = stage(t, 'service').workOrders[0];
  assert.deepEqual([s.state, s.evidence, s.verification.outcome, s.assigned], ['CLOSED', 1, 'pass', true]);
  const i = stage(t, 'commissioning').issues.find((x) => x.code === issue); assert.deepEqual([i.state, i.workflow], ['OPEN', 'OPEN'], 'closing the work order did not resolve the deficiency');
  assert.deepEqual(stage(t, 'assurance').openIssues, [issue]); assert.ok(t.missing.some((x) => /verified retest/.test(x)), t.missing.join(' | '));
});

test('TH-04 the deficiency closes only by a retest with evidence, verified by someone else; the thread carries the evidence', async () => {
  const step = (persona, body) => call(persona, 'POST', `/v1/issues/${issue}/deficiency`, { body });
  assert.equal((await step('cxeng', { step: 'start', ownerRole: 'installer', targetDate: future(10) })).status, 200);
  assert.equal((await step('installer', { step: 'fixed', rootCause: 'INSTALLATION', action: 'Unit reseated on its mount and the damaged cable replaced end to end' })).status, 200);
  const rt = await step('cxeng', { step: 'retest', result: 'PASS', evidence: 'EV-SYN-RT-1' }); assert.equal(rt.status, 200, J(rt.body));
  const self = await step('cxeng', { step: 'verify' }); assert.ok([403, 422].includes(self.status), `the retester does not verify: ${self.status}`);
  const done = await step('syseng', { step: 'verify' }); assert.equal(done.status, 200, J(done.body));
  const t = await thread(); const i = stage(t, 'commissioning').issues.find((x) => x.code === issue);
  assert.deepEqual([i.state, i.workflow, i.retest.result, i.retest.evidence], ['RESOLVED', 'CLOSED', 'PASS', 'EV-SYN-RT-1']);
  assert.deepEqual(stage(t, 'assurance').closedByRetest.map((x) => [x.issue, x.evidence]), [[issue, 'EV-SYN-RT-1']]); assert.deepEqual(stage(t, 'assurance').openIssues, []);
  assert.deepEqual(t.links.find((x) => x.from === 'service' && x.to === 'assurance').keys, { issue, evidence: 'EV-SYN-RT-1' });
});

test('TH-05 every applicable test passes and is verified by someone else; the room is accepted; baseline v1 is CURRENT in the thread', async () => {
  const rows = (await call('designer', 'GET', `/v1/rooms/${room}`)).body.commissioning.rows.filter((x) => x.applicable); const e = await evidence('commissioning');
  for (const r of rows) assert.equal((await call('cxeng', 'POST', `/v1/rooms/${room}/results`, { body: { testId: r.test_id, state: 'PASS', evidenceId: e.id, evidenceKind: r.evidence[0], instrument } })).status, 201, r.test_id);
  for (const r of rows) assert.equal((await call('qa_reviewer', 'POST', `/v1/rooms/${room}/results/${r.test_id}/verify`)).status, 200, r.test_id);
  assert.equal((await call('qa_reviewer', 'POST', '/v1/delegations', { body: { granteeId: who('opslead'), authority: 'customer.accept', reason: 'synthetic: QA verified and does not accept', days: 2 } })).status, 201);
  // (added 18 Nov: acceptance also needs the documentation packet approved and signed by both sides, 0043)
  await documentRoom(c, room, { submit: T.installer, review: T.qa_reviewer, vendor: T.opslead, internal: T.syseng });
  const acc = await call('opslead', 'POST', `/v1/rooms/${room}/lifecycle`, { body: { to: 'ACCEPTED' }, token: await fresh('opslead') }); assert.equal(acc.status, 200, J(acc.body));
  const t = await thread(); const a = stage(t, 'assurance');
  assert.equal(t.room.lifecycle, 'ACCEPTED'); assert.equal(a.current, 1); assert.deepEqual(a.baselines.map((b) => [b.version, b.state]), [[1, 'CURRENT']]);
  assert.ok(/^[0-9a-f]{64}$/.test(a.baselines[0].designSha256) && a.baselines[0].evidence >= 1);
  assert.ok(t.links.some((x) => x.from === 'commissioning' && x.to === 'assurance' && x.keys.baseline === 1));
});

test('TH-06 an APEX case on the deficiency holds hypotheses with caveats; the thread is complete with every link', async () => {
  const r = await call('cxeng', 'POST', `/v1/issues/${issue}/apex`, { body: {} }); assert.equal(r.status, 201, J(r.body)); apx = r.body.code || r.body.id || r.body.caseId;
  const t = await thread(); const cases = stage(t, 'apex').cases; assert.equal(cases.length, 1); apx = cases[0].code;
  assert.equal(cases[0].issue, issue); assert.ok(cases[0].hypotheses >= 1 && cases[0].leading.caveat && cases[0].leading.confidence !== 'high', J(cases[0]));
  assert.equal(t.complete, true, t.missing.join(' | ')); assert.deepEqual(t.missing, []);
  assert.deepEqual(t.links.map((l) => `${l.from}>${l.to}`).sort(), ['commissioning>assurance', 'commissioning>service', 'engineering>commissioning', 'lite>engineering', 'service>apex', 'service>assurance']);
  assert.deepEqual(t.links.find((x) => x.to === 'apex').keys, { issue, case: apx });
});

test('TH-07 durable and cross-session: another person on a new session reads the same thread; the keys are foreign keys the database enforces', async () => {
  const a = await thread('syseng'); const b = await thread('qa_reviewer', await fresh('qa_reviewer'));
  assert.deepEqual([b.room, b.stages, b.links, b.complete], [a.room, a.stages, a.links, a.complete], 'the same record for a different person on a new session');
  const n = (s) => Number(h.asSuper(s));
  assert.equal(n(`SELECT count(*) FROM app.work_order w JOIN app.room_issue i ON i.id = w.issue_id JOIN app.room r ON r.id = i.room_id WHERE w.code = '${wo}' AND i.code = '${issue}' AND r.code = '${room}' AND w.tenant_id = i.tenant_id AND i.tenant_id = r.tenant_id`), 1);
  assert.equal(n(`SELECT count(*) FROM app.apex_case c JOIN app.room_issue i ON i.id = c.issue_id JOIN app.room r ON r.id = c.room_id WHERE c.code = '${apx}' AND i.code = '${issue}' AND r.code = '${room}' AND c.tenant_id = i.tenant_id`), 1);
  assert.ok(n("SELECT count(*) FROM pg_constraint WHERE contype = 'f' AND conrelid = 'app.work_order'::regclass AND confrelid = 'app.room_issue'::regclass") >= 1, 'work_order → room_issue is a foreign key');
  assert.ok(n("SELECT count(*) FROM pg_constraint WHERE contype = 'f' AND conrelid = 'app.apex_case'::regclass AND confrelid = 'app.room_issue'::regclass") >= 1, 'apex_case → room_issue is a foreign key');
  assert.throws(() => h.asSuper(`INSERT INTO app.work_order (tenant_id, issue_id, code, assigned_role, created_by) SELECT tenant_id, gen_random_uuid(), 'WO-999999', 'service', created_by FROM app.work_order WHERE code = '${wo}'`), 'a work order with no issue is refused by the database');
  assert.equal(n(`SELECT count(*) FROM app.assurance_baseline b JOIN app.room r ON r.id = b.room_id WHERE r.code = '${room}' AND b.version = 1 AND b.state = 'CURRENT'`), 1);
});

test('TH-08 tenancy: another tenant can neither read the thread nor act on the deficiency (404)', async () => {
  assert.equal((await call('x', 'GET', `/v1/rooms/${room}/thread`, { token: T.x_syseng })).status, 404);
  const xw = await call('x', 'POST', `/v1/issues/${issue}/work-orders`, { token: T.x_syseng, body: { note: 'x' } }); assert.ok([403, 404].includes(xw.status) && Number(h.asSuper(`SELECT count(*) FROM app.work_order w JOIN app.room_issue i ON i.id = w.issue_id WHERE i.code = '${issue}'`)) === 1, `another tenant raises nothing: ${xw.status}`);
  assert.equal((await call('x', 'POST', `/v1/issues/${issue}/apex`, { token: T.x_syseng, body: {} })).status, 404);
  assert.equal((await c.call('GET', `/v1/rooms/${room}/thread`, {})).status, 401, 'no session, no thread');
});

test('TH-09 the audit history: the summary counts exactly the audit rows of the thread, allowed and refused; the chain verifies', async () => {
  const t = await thread(); const ids = [room, issue, wo, apx].map((x) => `'${x}'`).join(',');
  // 17 Nov 2026: a request refused by the central authority check is now recorded on the record its path names (http/server.ts aimedAt),
  // in the caller's own tenant. The other tenant's refused attempt in TH-08 is therefore a row of THAT tenant's audit naming this issue's
  // code, so the count here is this tenant's — which is what the thread, read under row-level security, has always counted.
  const db = Number(h.asSuper(`SELECT count(*) FROM app.audit_event e JOIN app.tenant t ON t.id = e.tenant_id WHERE t.slug = 'empathia-demo' AND e.aggregate_id IN (${ids})`));
  assert.equal(Number(h.asSuper(`SELECT count(*) FROM app.audit_event e JOIN app.tenant t ON t.id = e.tenant_id WHERE t.slug = 'second-tenant' AND e.aggregate_id IN (${ids}) AND e.outcome = 'ALLOWED'`)), 0, 'another tenant never acted on these records');
  assert.equal(t.audit.byAggregate.reduce((s, a) => s + a.events, 0), db); assert.ok(db >= 20, `${db} audit rows`);
  assert.ok(t.audit.byAggregate.some((a) => a.outcome === 'DENIED'), 'refusals are part of the history'); assert.ok(t.audit.byAggregate.some((a) => a.type === 'WorkOrder' && a.outcome === 'ALLOWED'));
  assert.equal(t.audit.latest.length, Math.min(12, db)); assert.ok(t.audit.latest.every((e) => e.action && e.at));
  // the tenant's whole audit chain is sealed and recomputed by the API: no gap, no re-pointed link, no changed content
  const v = await call('steward', 'GET', '/v1/audit/integrity'); assert.equal(v.status, 200, J(v.body));
  assert.equal(v.body.verified, true, J(v.body)); assert.equal(v.body.firstBreak, null); assert.ok(v.body.checked >= db && /^[0-9a-f]{64}$/.test(v.body.head.hash));
  const sealed = (await thread()).audit.byAggregate; assert.ok(sealed.every((a) => a.firstSeq && a.lastSeq), 'after sealing, every event of the thread has its place in the chain');
});
