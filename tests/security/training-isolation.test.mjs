/**
 * Training never touches the real record, through the real API and its database (founder, 13 Nov 2026, 16:38: "the security boundary
 * review should include negative authorization tests—especially ensuring that training simulations can't modify real ServiceHands
 * incidents or tenant data"). Every role of two tenants records drills and quizzes, with forged fields and with ids of real records,
 * and the operational tables (rooms, issues, work orders, APEX, competencies, people, everything but the training log and the
 * append-only audit and outbox) must hash the same before and after. Training never grants an authority, never cites another
 * person, and never crosses a tenant. The demonstration's side (the SIGNAL game day, the Field Intelligence simulated run, Learn
 * cases) is tests/unit/training-isolation.test.mjs.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client } from '../integration/harness.mjs';

let h, c, wo, room, issue; const T = {}; const B = {};
const ROLES = ['designer', 'syseng', 'opslead', 'installer', 'cxeng', 'svcmgr', 'service', 'requestor', 'steward', 'dsp_eng'];
before(async () => {
  h = await setup({ db: 'empathia_training_iso', port: 4175, env: { RATE_LIMIT_PER_MINUTE: '100000' } }); c = client(h.base);
  for (const r of ROLES) T[r] = await c.login(r);
  for (const r of ['designer', 'secadmin']) B[r] = await c.login(r, 'second-tenant');
  // a real ServiceHands work order, made the way the product makes one (as tests/security/learn.test.mjs does)
  room = (await c.call('POST', '/v1/rooms', { token: T.designer, body: { name: 'Training Isolation Huddle (synthetic)', template: 'huddle', buildingCode: 'ATL', floor: 9 } })).body.code;
  await c.call('POST', `/v1/rooms/${room}/revisions`, { token: T.designer, body: { reason: 'training isolation' } }); await c.call('POST', `/v1/rooms/${room}/drawings/generate`, { token: T.designer });
  await c.call('POST', `/v1/rooms/${room}/drawings/plan/approve`, { token: T.syseng }); await c.call('POST', `/v1/rooms/${room}/classification/approve`, { token: T.syseng, body: {} });
  for (const [to, t] of [['DESIGN_APPROVED', 'syseng'], ['INSTALLATION_PENDING', 'opslead'], ['INSTALLED_UNVERIFIED', 'installer'], ['COMMISSIONING', 'syseng']]) await c.call('POST', `/v1/rooms/${room}/lifecycle`, { token: T[t], body: { to } });
  const row = (await c.call('GET', `/v1/rooms/${room}`, { token: T.designer })).body.commissioning.rows.find((x) => x.applicable);
  const ev = (await c.call('POST', '/v1/evidence', { token: T.cxeng, raw: Buffer.from('synthetic'), headers: { 'content-type': 'text/plain', 'x-file-name': 'o.txt' } })).body;
  await c.call('POST', `/v1/rooms/${room}/results`, { token: T.cxeng, body: { testId: row.test_id, state: 'FAIL', evidenceId: ev.id, evidenceKind: row.evidence[0], instrument: 'SYN-METER-01 (synthetic)' } });
  issue = (await c.call('GET', `/v1/rooms/${room}`, { token: T.designer })).body.issues.find((i) => i.state === 'OPEN').code;
  wo = (await c.call('POST', `/v1/issues/${issue}/work-orders`, { token: T.svcmgr, body: { note: 'training isolation fixture (synthetic)' } })).body.workOrderId;
  assert.ok(room && issue && wo, 'fixture');
});
after(async () => { await h?.app.stop(); });

/** every table of the app schema except the training log and the append-only trails a request may write to */
const APPEND_ONLY = /^(training_record|audit_log|audit_event|outbox|outbox_event|event|ledger|ledger_entry|refresh_token|session|token|login_attempt|rate_limit|idempotency.*|request_log)$/;
const tables = () => h.asSuper("SELECT string_agg(table_name, ',' ORDER BY table_name) FROM information_schema.tables WHERE table_schema = 'app' AND table_type = 'BASE TABLE'").split(',').filter((t) => !APPEND_ONLY.test(t));
const snapshot = () => Object.fromEntries(tables().map((t) => [t, h.asSuper(`SELECT md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) FROM app.${t} x`)]));
const changed = (a, b) => Object.keys({ ...a, ...b }).filter((k) => a[k] !== b[k]);
const train = (token, body) => c.call('POST', '/v1/learn/training', { token, body });

test('TI-API-1 every role of two tenants records drills and quizzes, and no operational table changes: rooms, issues, work orders, APEX, competencies, people', async () => {
  const lib = (await c.call('GET', '/v1/learn/library', { token: T.requestor })).body; const drills = lib.drills.slice(0, 5).map((d) => d.id); const quiz = lib.lessons.find((l) => l.quiz)?.id;
  const t0 = tables(); assert.ok(t0.includes('work_order') && t0.includes('room'), `the operational tables are in the snapshot: ${t0.join(', ')}`);
  const s0 = snapshot(); const n0 = Number(h.asSuper('SELECT count(*) FROM app.training_record'));
  let made = 0;
  for (const tok of [...Object.values(T), ...Object.values(B)]) {
    for (const d of drills) { const r = await train(tok, { kind: 'drill', itemId: d, correct: true, elapsedS: 12 }); assert.equal(r.status, 201, JSON.stringify(r.body)); made += 1; }
    if (quiz) { const q = (await c.call('GET', `/v1/learn/lessons/${quiz}`, { token: tok })).body.quiz; const r = await train(tok, { kind: 'quiz', itemId: Object.keys(lib.quizzes || {})[0] || q?.id || quiz, score: 5, total: 5, correct: true }); if (r.status === 201) made += 1; }
  }
  const s1 = snapshot();
  assert.deepEqual(changed(s0, s1), [], 'training changed an operational table');
  assert.equal(Number(h.asSuper('SELECT count(*) FROM app.training_record')) - n0, made, 'and every training record was written to the training log');
});

test('TI-API-2 a training record cannot carry anything but itself: forged person, tenant, work order, issue or authority fields are refused, and nothing is written', async () => {
  const n0 = Number(h.asSuper('SELECT count(*) FROM app.training_record')); const s0 = snapshot();
  const svc = h.asSuper("SELECT id FROM app.person WHERE email = 'service@empathia-demo.empathia.invalid'");
  for (const extra of [{ personId: svc }, { tenantId: h.asSuper("SELECT id FROM app.tenant WHERE slug = 'second-tenant'") }, { workOrderId: wo }, { issue }, { room }, { authority: 'service.triage' }, { grants: ['work.accept'] }, { state: 'RESOLVED' }]) {
    const r = await train(T.requestor, { kind: 'drill', itemId: 'D1', correct: true, ...extra });
    assert.equal(r.status, 400, `${Object.keys(extra)[0]} was accepted: ${r.status}`);
  }
  assert.equal(Number(h.asSuper('SELECT count(*) FROM app.training_record')), n0); assert.deepEqual(changed(s0, snapshot()), []);
});

test('TI-API-3 a training record cannot point at a real record: the work order, issue and room codes, and injected text, are not drills', async () => {
  const n0 = Number(h.asSuper('SELECT count(*) FROM app.training_record')); const s0 = snapshot();
  for (const itemId of [String(wo), issue, room]) { const r = await train(T.svcmgr, { kind: 'drill', itemId, correct: true }); assert.ok([400, 404].includes(r.status), `${itemId}: ${r.status}`); }
  for (const itemId of ["D1'; UPDATE app.work_order SET state='CLOSED'; --", '../../work-orders/1', 'D1 OR 1=1']) { const r = await train(T.svcmgr, { kind: 'drill', itemId, correct: true }); assert.equal(r.status, 400, itemId); }
  assert.equal(Number(h.asSuper('SELECT count(*) FROM app.training_record')), n0); assert.deepEqual(changed(s0, snapshot()), []);
});

test('TI-API-4 training never grants authority: after perfect training a requester still cannot triage, assign or accept the real work order, nor record a competency for itself', async () => {
  const lib = (await c.call('GET', '/v1/learn/library', { token: T.requestor })).body;
  for (const d of lib.drills.slice(0, 20)) await train(T.requestor, { kind: 'drill', itemId: d.id, correct: true, elapsedS: 5 });
  const s0 = snapshot();
  const tri = await c.call('POST', `/v1/work-orders/${wo}/triage`, { token: T.requestor, body: { severity: 'Standard', scope: 's', risk: 'r', workType: 'break_fix', window: { from: '2026-11-04T08:00:00Z', to: '2026-11-04T10:00:00Z' } } });
  assert.equal(tri.status, 403, JSON.stringify(tri.body));
  const me = h.asSuper("SELECT id FROM app.person WHERE email = 'requestor@empathia-demo.empathia.invalid'");
  const mine = (await c.call('GET', '/v1/learn/training', { token: T.requestor })).body; const refs = (mine.records || mine.items || mine).slice?.(0, 3).map((x) => Number(x.id)) || [];
  for (const [p, body] of [['/accept', {}], ['/assign', { personId: me }]]) { const r = await c.call('POST', `/v1/work-orders/${wo}${p}`, { token: T.requestor, body }); assert.ok([403, 409].includes(r.status), `${p}: ${r.status}`); }
  const comp = await c.call('POST', '/v1/competencies', { token: T.requestor, body: { personId: me, competency: 'service.av_break_fix', source: 'ASSESSMENT', issuer: 'Self (synthetic)', reference: 'TRAINING', issuedOn: '2026-11-01', expiresOn: '2027-11-01', trainingRefs: refs.length ? refs : [1] } });
  assert.equal(comp.status, 403, `a requester recorded its own competency from training: ${comp.status}`);
  assert.deepEqual(changed(s0, snapshot()), []);
});

test('TI-API-5 training stays in its tenant: another tenant sees none of these records, and every record’s tenant is its person’s', async () => {
  const other = (await c.call('GET', '/v1/learn/training', { token: B.designer })).body; const otherRows = other.records || other.items || other;
  const aRecords = new Set(h.asSuper("SELECT string_agg(tr.id::text, ',') FROM app.training_record tr JOIN app.tenant t ON t.id = tr.tenant_id WHERE t.slug = 'empathia-demo'").split(','));
  assert.ok(Array.isArray(otherRows), JSON.stringify(other).slice(0, 200));
  assert.ok(aRecords.size > 10, 'this tenant has training records to protect');
  assert.ok(otherRows.every((r) => !aRecords.has(String(r.id))), 'another tenant read this tenant’s training');
  assert.equal(h.asSuper('SELECT count(*) FROM app.training_record tr WHERE NOT EXISTS (SELECT 1 FROM app.membership m WHERE m.person_id = tr.person_id AND m.tenant_id = tr.tenant_id)'), '0', 'a training record sits in a tenant its person is not a member of');
  const wB = await c.call('GET', `/v1/work-orders/${wo}`, { token: B.designer }); assert.equal(wB.status, 404, 'another tenant can see the work order');
});
