/**
 * ServiceHands lifecycle (P6-A) through the real API on @empathia/service-engine: hard-gated assignment with an explained ranking,
 * the technician's acceptance and preflight, evidence, separated verification, the customer closure policy and reopening —
 * each step by its authority, each refusal with the guard's reasons and an audit record. Synthetic data only.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client } from '../integration/harness.mjs';

let h, c, room, issue, wo, wo2; const T = {};
const instrument = 'SYN-METER-01 (synthetic), calibration record SYN-CAL-2026-09';
const who = (mail) => h.asSuper(`SELECT id FROM app.person WHERE email = '${mail}@empathia-demo.empathia.invalid'`);

before(async () => {
  h = await setup({ db: 'empathia_svc', port: 4189 });
  c = client(h.base);
  for (const r of ['designer', 'syseng', 'opslead', 'installer', 'cxeng', 'svcmgr', 'service', 'requestor']) T[r] = await c.login(r);
  // a commissioning deficiency on a room under commissioning (the path the API test proves) → one work order
  room = (await c.call('POST', '/v1/rooms', { token: T.designer, body: { name: 'Service Huddle (synthetic)', template: 'huddle', buildingCode: 'ATL', floor: 4 } })).body.code;
  await c.call('POST', `/v1/rooms/${room}/revisions`, { token: T.designer, body: { reason: 'svc' } }); await c.call('POST', `/v1/rooms/${room}/drawings/generate`, { token: T.designer });
  await c.call('POST', `/v1/rooms/${room}/drawings/plan/approve`, { token: T.syseng }); await c.call('POST', `/v1/rooms/${room}/classification/approve`, { token: T.syseng, body: {} });
  const move = (to, tok) => c.call('POST', `/v1/rooms/${room}/lifecycle`, { token: tok, body: { to } });
  await move('DESIGN_APPROVED', T.syseng); await move('INSTALLATION_PENDING', T.opslead); await move('INSTALLED_UNVERIFIED', T.installer); await move('COMMISSIONING', T.syseng);
  const d = (await c.call('GET', `/v1/rooms/${room}`, { token: T.designer })).body;
  const row = d.commissioning.rows.find((x) => x.applicable);
  const ev = (await c.call('POST', '/v1/evidence', { token: T.cxeng, raw: Buffer.from('synthetic observation'), headers: { 'content-type': 'text/plain', 'x-file-name': 'o.txt' } })).body;
  await c.call('POST', `/v1/rooms/${room}/results`, { token: T.cxeng, body: { testId: row.test_id, state: 'FAIL', evidenceId: ev.id, evidenceKind: row.evidence[0], instrument } });
  issue = (await c.call('GET', `/v1/rooms/${room}`, { token: T.designer })).body.issues.find((i) => i.state === 'OPEN').code;
  wo = (await c.call('POST', `/v1/issues/${issue}/work-orders`, { token: T.svcmgr, body: { note: 'camera dropped from the call (synthetic)' } })).body.workOrderId;
});
after(async () => { await h?.app.stop(); });

const call = (p, tok, body) => c.call(p === '' || p === '/candidates' ? 'GET' : 'POST', `/v1/work-orders/${wo}${p}`, { token: tok, ...(p === '' || p === '/candidates' ? {} : { body: body ?? {} }) });
const audited = (action, outcome) => Number(h.asSuper(`SELECT count(*) FROM app.audit_event WHERE action = '${action}' AND outcome = '${outcome}' AND aggregate_id = '${wo}'`));

test('SVC-1 a new work order is OPEN; closing it is refused (one governed step at a time) and audited; the record names the next steps with who may take them', async () => {
  const r = await call('/close', T.svcmgr, { note: 'skip the machine' });
  assert.equal(r.status, 422); assert.match(r.body.detail, /no transition OPEN → CLOSED/); assert.equal(audited('work_order.close', 'DENIED'), 1);
  const d = await call('', T.svcmgr); assert.equal(d.status, 200); assert.equal(d.body.state, 'OPEN');
  assert.deepEqual(d.body.nextSteps.map((s) => [s.to, s.authority, s.yours]), [['TRIAGED', 'service.triage', true]]);
  assert.ok(d.body.nextSteps[0].blockers.includes('severity is not set'));
  assert.equal((await call('', T.service)).body.nextSteps[0].yours, false, 'the technician sees the step but not as theirs');
  assert.equal((await call('', T.requestor)).status, 200, 'a requestor may read the record (site scope applies through the room)');
});

test('SVC-2 triage: the technician cannot (403, no body read); the manager sets severity → SLA, scope, risk, work type; the record keeps it', async () => {
  assert.equal((await call('/triage', T.service, { severity: 'High', scope: 'x', risk: 'y' })).status, 403);
  assert.equal((await call('/triage', T.svcmgr, { severity: 'Urgent', scope: 'x', risk: 'y' })).status, 400, 'severity is one of the SLA classes');
  const r = await call('/triage', T.svcmgr, { severity: 'High', scope: 'camera and its cabling in R-ATL-4', risk: 'room in daily use', workType: 'camera_replacement', window: { from: '2026-11-03T08:00:00Z', to: '2026-11-03T12:00:00Z' } });
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.state, 'TRIAGED'); assert.equal(r.body.sla.respond, 'next business day');
  const d = (await call('', T.svcmgr)).body; assert.equal(d.triage.scope, 'camera and its cabling in R-ATL-4'); assert.equal(d.workType, 'camera_replacement'); assert.deepEqual(d.need.certs, ['cert.av_field', 'cert.video']);
});

test('SVC-3 candidates are hard-gated before any ranking: the South technician’s site access and missing camera certification fail by name; the installer (no work.accept) is not in the pool; the eligible one is ranked with reasons; the ranking is on the record for the manager only', async () => {
  assert.equal((await call('/candidates', T.service)).status, 403);
  const r = await call('/candidates', T.svcmgr); assert.equal(r.status, 200, JSON.stringify(r.body));
  const svc = who('service'), inst = who('installer'), south = who('service-south');
  assert.deepEqual(r.body.eligible.map((x) => x.id), [svc]);
  assert.ok(r.body.eligible[0].reasons.some((x) => /based in ATL/.test(x)) && r.body.eligible[0].score > 0);
  assert.ok(!r.body.eligible.concat(r.body.ineligible).some((x) => x.id === inst), 'the installer holds no work.accept: not in the service pool at all (least privilege, not a gate)');
  const s = r.body.ineligible.find((x) => x.id === south); assert.ok(s, 'the South technician is in the pool');
  assert.ok(s.hardFails.some((x) => /site access: ATL not in approved sites/.test(x)) && s.hardFails.some((x) => /Camera and framing: not held/.test(x)), JSON.stringify(s.hardFails));
  const d = (await call('', T.svcmgr)).body; assert.ok(d.candidates && d.candidates.eligible.length === 1);
  assert.equal((await call('', T.service)).body.candidates, null, 'the ranking is not shown to those who cannot assign');
});

test('SVC-4 assigning an ineligible person is refused with the gates that fail; an outsider is refused; the eligible technician is assigned with the explained score; the event carries the site scope', async () => {
  const bad = await call('/assign', T.svcmgr, { personId: who('service-south') });
  assert.equal(bad.status, 422); assert.ok(bad.body.reasons.some((x) => /site access: ATL not in approved sites/.test(x)), JSON.stringify(bad.body));
  assert.equal((await call('/assign', T.svcmgr, { personId: who('designer') })).status, 422, 'not in the service pool');
  const r = await call('/assign', T.svcmgr, { personId: who('service') }); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.state, 'ASSIGNED'); assert.ok(r.body.reasons.length > 0);
  assert.equal(h.asSuper(`SELECT count(*) FROM app.outbox_event WHERE type = 'work_order.assigned' AND payload->>'workOrderId' = '${wo}'`), '1');
  assert.equal((await call('', T.svcmgr)).body.assignment.score, r.body.score);
});

test('SVC-5 only the assigned technician accepts (another technician with the authority is refused by the guard); the manager cannot', async () => {
  const south = await c.login('service', 'empathia-demo', 'service-south');
  const other = await call('/accept', south); assert.equal(other.status, 404, 'South scope: the North job is not even visible');
  assert.equal((await call('/accept', T.svcmgr)).status, 403);
  const r = await call('/accept', T.service); assert.equal(r.status, 200); assert.equal(r.body.state, 'ACCEPTED');
  assert.equal((await call('/accept', T.service)).status, 422, 'not twice');
});

test('SVC-6 the dispatch preflight is recorded check by check; a failed check blocks the start with the reason; a complete one lets the technician start', async () => {
  let p = await call('/preflight', T.service, { safetyBriefed: true, toolsConfirmed: ['PTZ service kit'] });
  assert.equal(p.status, 200, JSON.stringify(p.body)); assert.equal(p.body.ok, false);
  const failed = p.body.checks.filter((x) => !x.ok).map((x) => x.id); assert.deepEqual(failed.sort(), ['access', 'parts', 'tools']);
  const s = await call('/start', T.service); assert.equal(s.status, 422); assert.match(s.body.detail, /dispatch preflight has a failed check/);
  p = await call('/preflight', T.service, { safetyBriefed: true, toolsConfirmed: ['PTZ service kit', 'laptop with the camera tool'], accessConfirmedBy: 'facilities desk (synthetic)', stock: { 'camera unit': { onHand: 1, checkedAt: new Date().toISOString() }, 'mounting plate': { onHand: 2, checkedAt: new Date().toISOString() } } });
  assert.equal(p.body.ok, true, JSON.stringify(p.body.checks));
  assert.equal((await call('/start', T.svcmgr)).status, 403, 'the manager does not start field work');
  const r = await call('/start', T.service); assert.equal(r.status, 200); assert.equal(r.body.state, 'IN_PROGRESS');
});

test('SVC-7 evidence is recorded by the technician only; hand-over needs evidence; a manager cannot record or hand over', async () => {
  assert.equal((await call('/submit', T.service)).status, 422, 'no evidence yet');
  assert.equal((await call('/evidence', T.svcmgr, { kind: 'note', note: 'x' })).status, 403);
  assert.equal((await call('/evidence', T.service, { kind: 'photo', note: 'camera reseated, cable replaced', ref: 'EV-SYN-1' })).status, 200);
  assert.equal((await call('/evidence', T.service, { kind: 'readback', note: 'camera answers on the network again' })).status, 200);
  const r = await call('/submit', T.service); assert.equal(r.status, 200); assert.equal(r.body.state, 'VERIFYING');
  assert.equal(h.asSuper(`SELECT count(*) FROM app.outbox_event WHERE type = 'service.field_completed' AND payload->>'workOrderId' = '${wo}'`), '1');
});

test('SVC-8 verification is separated: the technician cannot verify their own work; a failed verification keeps the job VERIFYING with the record; a pass resolves it', async () => {
  const own = await call('/verify', T.service, { outcome: 'pass', note: 'looks fine' }); assert.equal(own.status, 403, 'no service.verify authority');
  assert.equal((await call('/verify', T.svcmgr, { outcome: 'pass', note: 'x' })).status, 403, 'the manager is not the verifier');
  const f = await call('/verify', T.cxeng, { outcome: 'fail', note: 'framing preset 2 still off' }); assert.equal(f.status, 200); assert.equal(f.body.state, 'VERIFYING');
  assert.equal((await call('', T.cxeng)).body.verification.outcome, 'fail');
  assert.equal((await call('/evidence', T.service, { kind: 'note', note: 'preset 2 re-stored' })).status, 200);
  assert.equal((await call('/submit', T.service)).status, 422, 'already handed over; the record is updated in place');
  const r = await call('/verify', T.cxeng, { outcome: 'pass', note: 'retested in the call (synthetic)' }); assert.equal(r.status, 200); assert.equal(r.body.state, 'RESOLVED');
  assert.equal(h.asSuper(`SELECT count(*) FROM app.outbox_event WHERE type = 'service.repair_verified' AND payload->>'workOrderId' = '${wo}'`), '1');
});

test('SVC-9 closure under the customer policy: High severity needs the requester’s confirmation; the commissioning test and the deficiency are untouched by the closure', async () => {
  const no = await call('/close', T.svcmgr, { note: 'done' }); assert.equal(no.status, 422); assert.match(no.body.detail, /requester’s confirmation/);
  const r = await call('/close', T.svcmgr, { note: 'confirmed by the requester by e-mail (synthetic)', customerConfirmed: true }); assert.equal(r.status, 200); assert.equal(r.body.state, 'CLOSED');
  const d = (await c.call('GET', `/v1/rooms/${room}`, { token: T.designer })).body;
  assert.equal(d.issues.find((i) => i.code === issue).state, 'OPEN', 'closing a work order never resolves the deficiency');
  assert.ok(d.commissioning.rows.some((x) => x.result === 'FAIL'), 'closing a work order never passes a test');
});

test('SVC-10 reopening needs a reason and only from RESOLVED; the events and audit tell the whole story; events are append-only', async () => {
  assert.equal((await call('/reopen', T.svcmgr, { reason: 'recurred' })).status, 422, 'CLOSED is final; a recurrence is a new work order');
  wo2 = (await c.call('POST', `/v1/issues/${issue}/work-orders`, { token: T.svcmgr, body: { note: 'second (synthetic)' } })).body.workOrderId;
  const c2 = (p, tok, body) => c.call(p === '' ? 'GET' : 'POST', `/v1/work-orders/${wo2}${p}`, { token: tok, ...(p === '' ? {} : { body: body ?? {} }) });
  const steps = [['/triage', T.svcmgr, { severity: 'Standard', scope: 's', risk: 'r', workType: 'break_fix', window: { from: '2026-11-04T08:00:00Z', to: '2026-11-04T10:00:00Z' } }], ['/assign', T.svcmgr, { personId: who('service') }], ['/accept', T.service], ['/preflight', T.service, { safetyBriefed: true, toolsConfirmed: ['service kit'], accessConfirmedBy: 'desk' }], ['/start', T.service], ['/evidence', T.service, { kind: 'note', note: 'n' }], ['/submit', T.service], ['/verify', T.cxeng, { outcome: 'pass', note: 'ok' }]];
  for (const [p, tok, body] of steps) { const r = await c2(p, tok, body); assert.equal(r.status, 200, `${p}: ${JSON.stringify(r.body)}`); }
  assert.equal((await c2('/reopen', T.svcmgr, { reason: '' })).status, 400);
  const r = await c2('/reopen', T.svcmgr, { reason: 'recurrence: dropped again on 2026-11-05' }); assert.equal(r.status, 200); assert.equal(r.body.state, 'REOPENED'); assert.equal(r.body.reopenCount, 1);
  assert.equal((await c2('/assign', T.svcmgr, { personId: who('service') })).status, 422, 'a reopened job is triaged again first');
  assert.equal((await c2('/triage', T.svcmgr, { severity: 'High', scope: 's', risk: 'r' })).status, 200);
  const ev = (await c2('', T.svcmgr)).body.events.map((e) => e.kind);
  assert.deepEqual(ev, ['work_order.triage', 'work_order.assign', 'work_order.accept', 'work_order.preflight', 'work_order.start', 'work_order.evidence', 'work_order.submit', 'work_order.verify', 'work_order.reopen', 'work_order.triage']);
  assert.throws(() => h.asSuper(`DELETE FROM app.work_order_event WHERE work_order_id = (SELECT id FROM app.work_order WHERE code = '${wo2}')`), /EM001|append-only|refuse/i);
  const list = await c.call('GET', '/v1/work-orders?state=TRIAGED', { token: T.svcmgr }); assert.equal(list.status, 200); assert.ok(list.body.items.some((x) => x.code === wo2)); assert.equal(list.body.states.length, 9);
});

test('SVC-11 recurrence comes from records: the second job on the same issue names the closed first one and its own reopening; a third job while one is active is refused (audited); Mission Control lists the recurring fault', async () => {
  const d = (await c.call('GET', `/v1/work-orders/${wo2}`, { token: T.svcmgr })).body;
  assert.equal(d.recurrence.recurring, true); assert.deepEqual(d.recurrence.priorWorkOrders.map((x) => [x.code, x.state]), [[wo, 'CLOSED']]); assert.equal(d.recurrence.reopenCount, 1);
  assert.match(d.recurrence.basis, /same issue/);
  assert.equal((await c.call('GET', `/v1/work-orders/${wo}`, { token: T.svcmgr })).body.recurrence.recurring, false, 'the first job had no earlier job');
  const third = await c.call('POST', `/v1/issues/${issue}/work-orders`, { token: T.svcmgr, body: { note: 'third (synthetic)' } });
  assert.equal(third.status, 422); assert.match(third.body.detail, new RegExp(`${wo2} is already active`));
  assert.equal(Number(h.asSuper(`SELECT count(*) FROM app.audit_event WHERE action = 'work_order.create' AND outcome = 'DENIED' AND aggregate_id = '${issue}'`)), 1);
  const mc = (await c.call('GET', '/v1/mission-control', { token: T.svcmgr })).body;
  const ex = mc.exceptions.find((e) => e.ref === wo2); assert.ok(ex, JSON.stringify(mc.exceptions).slice(0, 300)); assert.match(ex.title, /recurring fault/); assert.match(ex.detail, /1 earlier work order on this issue in 90 days; reopened 1×/);
});
