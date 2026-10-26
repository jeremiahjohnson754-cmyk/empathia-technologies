/**
 * Enterprise API integration tests — the vertical slice over real HTTP against a real PostgreSQL database.
 *
 *   Room → DB record → Device → Graph → Drawing revision → Cx plan → Issue → Service → Evidence → Read model
 *
 * Runs the API in-process (services/enterprise-api/dist) on 127.0.0.1:4199 against a fresh database `empathia_test` on the local
 * cluster (node scripts/db.mjs up). Synthetic data only. This proves the starter's behaviour on this machine; it is not a
 * production security assessment.
 *   node --test tests/integration/api.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client } from './harness.mjs';

let h, c, code, row, failRow, evidence, issueCode, workOrder;
const T = {};
const instrument = 'SYN-METER-01 (synthetic), calibration record SYN-CAL-2026-09';

before(async () => {
  h = await setup({ db: 'empathia_test_api', port: 4199 });
  c = client(h.base);
  for (const r of ['designer', 'syseng', 'opslead', 'installer', 'cxeng', 'qa_reviewer', 'svcmgr', 'service', 'requestor', 'steward', 'secadmin']) T[r] = await c.login(r);
});
after(async () => { await h?.app.stop(); });

const room = (tok = T.designer) => c.call('GET', `/v1/rooms/${code}`, { token: tok });
const move = (to, tok) => c.call('POST', `/v1/rooms/${code}/lifecycle`, { token: tok, body: { to } });
const upload = (tok, text = 'synthetic field observation', type = 'text/plain') => c.call('POST', '/v1/evidence', { token: tok, raw: Buffer.from(text), headers: { 'content-type': type, 'x-file-name': 'observation.txt' } });

test('health: database reachable, migrations applied, live health NOT_MONITORED, never production-ready', async () => {
  const r = await c.call('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'ok');
  assert.equal(r.body.database.reachable, true);
  assert.ok(r.body.database.migrationsApplied >= 5);
  assert.equal(r.body.liveHealth, 'NOT_MONITORED');
  assert.match(r.body.note, /not production-ready/);
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.equal(r.headers['cache-control'], 'no-store');
});

test('slice 1 — the designer creates a room: one database record, server-side classification and a compiled plan', async () => {
  const r = await c.call('POST', '/v1/rooms', { token: T.designer, body: { name: 'Slice Huddle (synthetic)', template: 'huddle', buildingCode: 'NST', floor: 2 }, headers: { 'idempotency-key': 'slice-create-0001' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  code = r.body.code;
  assert.match(code, /^R-PLN-\d{4}$/);
  assert.equal(h.asSuper(`SELECT count(*) FROM app.room WHERE code = '${code}'`), '1');
  const d = await room();
  assert.equal(d.status, 200);
  assert.equal(d.body.room.lifecycle, 'PLANNED');
  assert.equal(d.body.room.classification.archetype, 'HUD');
  assert.ok(d.body.devices.length > 0);
  assert.ok(d.body.commissioning.applicable > 0);
  assert.ok(d.body.commissioning.rows.every((x) => x.result !== 'PASS'), 'no bare PASS label');
  assert.ok(d.body.commissioning.rows.filter((x) => x.applicable).every((x) => x.result === 'NOT_TESTED'));
});

test('slice 2 — a device gets a tenant-unique canonical asset id and appears in the relationship graph', async () => {
  const r = await c.call('POST', `/v1/rooms/${code}/devices`, { token: T.designer, body: { category: 'display', x: 1, y: 1, mount: 'wall' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.match(r.body.assetId, /^PA-\d{4,}$/);
  T.asset = r.body.assetId;
  const g = await c.call('GET', `/v1/graph/Room/${code}?depth=1`, { token: T.designer });
  assert.equal(g.status, 200, JSON.stringify(g.body));
  assert.ok(JSON.stringify(g.body.nodes).includes(T.asset), 'the new asset is a neighbour of its room');
});

test('slice 3 — revision and drawings: an immutable revision, a generated drawing set, approval by the engineer only', async () => {
  const rev = await c.call('POST', `/v1/rooms/${code}/revisions`, { token: T.designer, body: { reason: 'slice' } });
  assert.equal(rev.status, 201);
  assert.match(rev.body.sha256, /^[0-9a-f]{64}$/);
  const again = await c.call('POST', `/v1/rooms/${code}/revisions`, { token: T.designer, body: { reason: 'nothing changed' } });
  assert.equal(again.status, 422, 'a revision with no change is refused');
  const gen = await c.call('POST', `/v1/rooms/${code}/drawings/generate`, { token: T.designer });
  assert.equal(gen.status, 200);
  assert.ok(gen.body.drawings.length >= 5);
  assert.equal((await c.call('POST', `/v1/rooms/${code}/drawings/plan/approve`, { token: T.designer })).status, 403, 'the designer cannot approve a drawing');
  const ok = await c.call('POST', `/v1/rooms/${code}/drawings/plan/approve`, { token: T.syseng });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  // revisions are immutable in the database
  assert.throws(() => h.asSuper(`UPDATE app.room_revision SET reason = 'edited' WHERE room_id = (SELECT id FROM app.room WHERE code = '${code}')`), /EM001|append-only|refuse/i);
});

test('slice 4 — classification approval and the governed lifecycle to COMMISSIONING, each step by its authority', async () => {
  assert.equal((await c.call('POST', `/v1/rooms/${code}/classification/approve`, { token: T.designer, body: {} })).status, 403);
  assert.equal((await c.call('POST', `/v1/rooms/${code}/classification/approve`, { token: T.syseng, body: { archetype: 'BRD', reason: 'short' } })).status, 422, 'an override needs a reason of at least 10 characters');
  assert.equal((await c.call('POST', `/v1/rooms/${code}/classification/approve`, { token: T.syseng, body: {} })).status, 200);
  assert.equal((await move('DESIGN_APPROVED', T.designer)).status, 403);
  assert.equal((await move('COMMISSIONING', T.syseng)).status, 422, 'one governed step at a time');
  assert.equal((await move('DESIGN_APPROVED', T.syseng)).status, 200);
  assert.equal((await move('INSTALLATION_PENDING', T.installer)).status, 403);
  assert.equal((await move('INSTALLATION_PENDING', T.opslead)).status, 200);
  assert.equal((await move('INSTALLED_UNVERIFIED', T.installer)).status, 200);
  assert.equal((await move('COMMISSIONING', T.installer)).status, 403);
  assert.equal((await move('COMMISSIONING', T.syseng)).status, 200);
  const d = await room();
  assert.equal(d.body.room.lifecycle, 'COMMISSIONING');
  const app = d.body.commissioning.rows.filter((x) => x.applicable);
  row = app.find((x) => !x.personas.includes('designer'));
  failRow = app.find((x) => x !== row);
  assert.ok(row && failRow);
});

test('slice 5 — evidence is stored content-addressed, hashed, retained and re-verified on read', async () => {
  assert.equal((await upload(T.requestor)).status, 403, 'a requestor cannot upload evidence');
  assert.equal((await upload(T.cxeng, '<script>', 'text/html')).status, 415);
  const r = await upload(T.cxeng);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  evidence = r.body;
  assert.match(evidence.sha256, /^[0-9a-f]{64}$/);
  assert.ok(evidence.retentionUntil);
  const get = await fetch(`${h.base}/v1/evidence/${evidence.id}/content`, { headers: { authorization: `Bearer ${T.cxeng}` } });
  assert.equal(get.status, 200);
  assert.equal(await get.text(), 'synthetic field observation');
  assert.throws(() => h.asSuper(`DELETE FROM app.evidence_object WHERE id = '${evidence.id}'`), /EM001|append-only|refuse/i, 'evidence is append-only');
});

test('slice 6 — a FAIL opens one commissioning deficiency; ServiceHands work order closes without passing the test', async () => {
  const rec = (tok, r, state) => c.call('POST', `/v1/rooms/${code}/results`, { token: tok, body: { testId: r.test_id, state, evidenceId: evidence.id, evidenceKind: r.evidence[0], instrument } });
  const f = await rec(T.cxeng, failRow, 'FAIL');
  assert.equal(f.status, 201, JSON.stringify(f.body));
  assert.equal(f.body.resultLabel, 'FAIL');
  let d = await room();
  const iss = d.body.issues.find((i) => i.key === `test-failed:${failRow.test_id}` && i.state === 'OPEN');
  assert.ok(iss, 'a deficiency was opened');
  assert.equal(iss.category, 'INSTALLATION_COMMISSIONING_DEFICIENCY');
  issueCode = iss.code;
  // designer and system engineer cannot assign; the operations lead can
  assert.equal((await c.call('POST', `/v1/issues/${issueCode}/assign`, { token: T.designer, body: { ownerRole: 'service' } })).status, 403);
  assert.equal((await c.call('POST', `/v1/issues/${issueCode}/assign`, { token: T.syseng, body: { ownerRole: 'service' } })).status, 403);
  assert.equal((await c.call('POST', `/v1/issues/${issueCode}/assign`, { token: T.opslead, body: { ownerRole: 'service' } })).status, 200);
  // the service manager raises a work order; the field technician cannot
  assert.equal((await c.call('POST', `/v1/issues/${issueCode}/work-orders`, { token: T.service, body: {} })).status, 403);
  const wo = await c.call('POST', `/v1/issues/${issueCode}/work-orders`, { token: T.svcmgr, body: { assignedRole: 'service', note: 'reseat and retest (synthetic)' } });
  assert.equal(wo.status, 201, JSON.stringify(wo.body));
  workOrder = wo.body.workOrderId;
  const closed = await c.call('POST', `/v1/work-orders/${workOrder}/close`, { token: T.svcmgr, body: { note: 'field work done (synthetic)' } });
  assert.equal(closed.status, 200);
  d = await room();
  assert.equal(d.body.issues.find((i) => i.code === issueCode).state, 'OPEN', 'closing a work order never resolves the deficiency');
  assert.equal(d.body.commissioning.rows.find((x) => x.test_id === failRow.test_id).result, 'FAIL', 'closing a work order never passes a test');
  const hist = await c.call('GET', `/v1/rooms/${code}/service-history`, { token: T.svcmgr });
  assert.equal(hist.status, 200);
  assert.ok(JSON.stringify(hist.body).includes(workOrder));
});

test('slice 7 — a PASS is PASS_UNVERIFIED until a different person verifies it; the verified retest resolves the deficiency', async () => {
  const rec = (tok, r, state) => c.call('POST', `/v1/rooms/${code}/results`, { token: tok, body: { testId: r.test_id, state, evidenceId: evidence.id, evidenceKind: r.evidence[0], instrument } });
  const notResponsible = await rec(T.designer, row, 'PASS');
  assert.equal(notResponsible.status, 403, 'the designer is not a responsible role');
  const p = await rec(T.cxeng, row, 'PASS');
  assert.equal(p.status, 201);
  assert.equal(p.body.resultLabel, 'PASS_UNVERIFIED');
  assert.equal((await c.call('POST', `/v1/rooms/${code}/results/${row.test_id}/verify`, { token: T.cxeng })).status, 422, 'self-verification is refused');
  assert.equal((await c.call('POST', `/v1/rooms/${code}/results/${row.test_id}/verify`, { token: T.designer })).status, 403);
  const v = await c.call('POST', `/v1/rooms/${code}/results/${row.test_id}/verify`, { token: T.qa_reviewer });
  assert.equal(v.status, 200, JSON.stringify(v.body));
  assert.equal(v.body.resultLabel, 'PASS_VERIFIED');
  assert.equal((await c.call('POST', `/v1/rooms/${code}/results/${row.test_id}/verify`, { token: T.qa_reviewer })).status, 422, 'never verified twice');
  // a FAIL cannot be verified
  assert.equal((await c.call('POST', `/v1/rooms/${code}/results/${failRow.test_id}/verify`, { token: T.qa_reviewer })).status, 422);
  // retest of the failed test: PASS by cxeng, verified by qa → the deficiency resolves
  assert.equal((await rec(T.cxeng, failRow, 'PASS')).status, 201);
  assert.equal((await c.call('POST', `/v1/rooms/${code}/results/${failRow.test_id}/verify`, { token: T.qa_reviewer })).status, 200);
  const d = await room();
  assert.equal(d.body.issues.find((i) => i.code === issueCode).state, 'RESOLVED');
  const labels = Object.fromEntries(d.body.commissioning.rows.map((x) => [x.test_id, x.result]));
  assert.equal(labels[row.test_id], 'PASS_VERIFIED');
  assert.equal(labels[failRow.test_id], 'PASS_VERIFIED');
  // acceptance is refused while other applicable tests are untested
  const acc = await move('ACCEPTED', T.qa_reviewer);
  assert.equal(acc.status, 422);
  assert.match(JSON.stringify(acc.body), /independently verified/);
});

test('slice 8 — the outbox builds the read model and notifications; live health stays NOT_MONITORED', async () => {
  await h.drain();
  const rm = await c.call('GET', `/v1/read/rooms/${code}`, { token: T.opslead });
  assert.equal(rm.status, 200, JSON.stringify(rm.body));
  const m = Array.isArray(rm.body.items) ? rm.body.items[0] : rm.body;
  assert.equal(m.lifecycle, 'COMMISSIONING');
  assert.equal(m.live_health ?? m.liveHealth, 'NOT_MONITORED');
  assert.equal((m.results.verified), 2);
  assert.equal(h.asSuper(`SELECT count(*) FROM app.outbox_event WHERE status <> 'DELIVERED'`), '0');
  const n = await c.call('GET', '/v1/notifications', { token: T.qa_reviewer });
  assert.ok(n.body.items.some((x) => x.kind === 'result.awaiting_verification'));
  const ns = await c.call('GET', '/v1/notifications', { token: T.service });
  assert.ok(ns.body.items.some((x) => x.kind === 'work_order.created'));
  assert.throws(() => h.asSuper(`UPDATE app.room_read_model SET live_health = 'HEALTHY'`), /check|violat/i, 'no live health claim without monitoring');
});

test('slice 9 — the audit trail records allowed and denied decisions (steward reads it; the designer cannot)', async () => {
  assert.equal((await c.call('GET', '/v1/audit', { token: T.designer })).status, 403);
  const a = await c.call('GET', `/v1/audit?aggregateType=Room&aggregateId=${code}&limit=200`, { token: T.steward });
  assert.equal(a.status, 200);
  const s = JSON.stringify(a.body);
  assert.match(s, /DENIED/);
  assert.match(s, /commission\.result\.verify/);
});

// ------------------------------------------------------------------------------------------------ idempotency
test('idempotency: the same key and body replays the first response; a different body is refused', async () => {
  const body = { name: 'Idem Room (synthetic)', template: 'small_conf', buildingCode: 'NST', floor: 1 };
  const a = await c.call('POST', '/v1/rooms', { token: T.designer, body, headers: { 'idempotency-key': 'idem-room-0001' } });
  const b = await c.call('POST', '/v1/rooms', { token: T.designer, body, headers: { 'idempotency-key': 'idem-room-0001' } });
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  assert.equal(b.headers['idempotent-replay'], 'true');
  assert.deepEqual(b.body, a.body);
  assert.equal(h.asSuper(`SELECT count(*) FROM app.room WHERE name = 'Idem Room (synthetic)'`), '1');
  const x = await c.call('POST', '/v1/rooms', { token: T.designer, body: { ...body, name: 'Other' }, headers: { 'idempotency-key': 'idem-room-0001' } });
  assert.equal(x.status, 422, 'reuse of a key with a different payload: 422 (IETF Idempotency-Key header draft)');
  assert.equal(x.body.code, 'idempotency_mismatch');
  assert.equal((await c.call('POST', '/v1/rooms', { token: T.designer, body, headers: { 'idempotency-key': 'bad key!' } })).status, 400);
});

// ------------------------------------------------------------------------------------------------ outbox dead letter
test('outbox: a failing handler retries with backoff and dead-letters after 8 attempts; an admin retry delivers it', async () => {
  await c.call('PATCH', '/v1/rooms/R-PLN-0002', { token: T.designer, body: { intendedUse: 'Board meetings (synthetic, dead-letter test)' } });
  const pending = Number(h.asSuper(`SELECT count(*) FROM app.outbox_event WHERE status = 'PENDING'`));
  assert.ok(pending > 0);
  const bad = new h.OutboxWorker(h.app.workerPool, [async () => { throw new Error('injected handler failure (test)'); }]);
  for (let i = 0; i < 8; i += 1) { await bad.tick(); h.asSuper(`UPDATE app.outbox_event SET next_attempt_at = now() WHERE status = 'PENDING'`); }
  assert.equal(h.asSuper(`SELECT count(*) FROM app.outbox_event WHERE status = 'PENDING'`), '0');
  assert.equal(Number(h.asSuper(`SELECT count(*) FROM app.outbox_event WHERE status = 'DEAD_LETTER' AND attempts = 8`)), pending);
  assert.equal((await c.call('GET', '/v1/admin/outbox?status=DEAD_LETTER', { token: T.designer })).status, 403);
  const list = await c.call('GET', '/v1/admin/outbox?status=DEAD_LETTER', { token: T.secadmin });
  assert.equal(list.status, 200);
  const ids = list.body.items.map((e) => e.id);
  assert.equal(ids.length, pending);
  for (const id of ids) assert.equal((await c.call('POST', `/v1/admin/outbox/${id}/retry`, { token: T.secadmin })).status, 200);
  await h.drain();
  assert.equal(h.asSuper(`SELECT count(*) FROM app.outbox_event WHERE status <> 'DELIVERED'`), '0');
});

// ------------------------------------------------------------------------------------------------ OpenAPI contract
test('OpenAPI: every route is documented with its method, and every authenticated route documents 401/403', async () => {
  const doc = (await c.call('GET', '/v1/openapi.json')).body;
  assert.match(doc.openapi, /^3\.1/);
  const routes = h.app.router.routes;
  let n = 0;
  for (const r of routes) {
    const p = r.path.replace(/:([A-Za-z]+)/g, '{$1}');
    const op = doc.paths[p]?.[r.method.toLowerCase()];
    assert.ok(op, `${r.method} ${r.path} is in the OpenAPI document`);
    if (r.auth) { assert.ok(op.responses['401'] && op.responses['403'], `${r.method} ${r.path} documents 401 and 403`); assert.ok(op.security?.length, `${r.method} ${r.path} declares security`); }
    n += 1;
  }
  const documented = Object.values(doc.paths).reduce((k, ops) => k + Object.keys(ops).filter((m) => ['get', 'post', 'patch', 'put', 'delete'].includes(m)).length, 0);
  assert.equal(documented, n, 'no documented operation without a route');
});

// ------------------------------------------------------------------------------------------------ organization, projects, reporting
test('organization: sites with buildings, the role catalogue, people (security admin only, audited)', async () => {
  const s = await c.call('GET', '/v1/sites', { token: T.designer });
  assert.equal(s.status, 200);
  assert.deepEqual(s.body.items.map((x) => x.code), ['SITE-NORTH', 'SITE-SOUTH']);
  assert.ok(s.body.items[0].buildings.some((b) => b.code === 'ATL' && b.rooms >= 2));
  const r = await c.call('GET', '/v1/roles', { token: T.designer });
  assert.ok(r.body.items.find((x) => x.key === 'syseng').authorities.includes('room.classify.approve'));
  assert.equal((await c.call('GET', '/v1/people', { token: T.designer })).status, 403);
  const p = await c.call('GET', '/v1/people', { token: T.secadmin });
  assert.equal(p.status, 200);
  assert.ok(p.body.items.length >= 17);
  assert.ok(p.body.items.some((x) => x.email === 'service-south@empathia-demo.empathia.invalid' && x.siteScope.join() === 'SITE-SOUTH'));
  assert.ok(p.body.items.every((x) => !('password_hash' in x) && !('passwordHash' in x)), 'no credential material in the response');
});

test('projects: the executive creates a project and scopes rooms into it; the designer cannot', async () => {
  const exec = await c.login('exec');
  const seeded = await c.call('GET', '/v1/projects', { token: T.designer });
  assert.deepEqual(seeded.body.items.find((x) => x.code === 'PRJ-ATLAS-AV').rooms.map((r) => r.code), ['R-PLN-0001', 'R-PLN-0002']);
  assert.equal((await c.call('POST', '/v1/projects', { token: T.designer, body: { code: 'PRJ-NST-HUDDLES', name: 'Northstar huddles (synthetic)' } })).status, 403);
  assert.equal((await c.call('POST', '/v1/projects', { token: exec, body: { code: 'prj-lower', name: 'x' } })).status, 400);
  const mk = await c.call('POST', '/v1/projects', { token: exec, body: { code: 'PRJ-NST-HUDDLES', name: 'Northstar huddles (synthetic)' } });
  assert.equal(mk.status, 201);
  assert.equal((await c.call('POST', `/v1/rooms/${code}/project`, { token: T.designer, body: { projectCode: 'PRJ-NST-HUDDLES' } })).status, 403);
  assert.equal((await c.call('POST', `/v1/rooms/${code}/project`, { token: exec, body: { projectCode: 'PRJ-NST-HUDDLES' } })).status, 200);
  const after = await c.call('GET', '/v1/projects', { token: T.designer });
  assert.deepEqual(after.body.items.find((x) => x.code === 'PRJ-NST-HUDDLES').rooms.map((r) => r.code), [code]);
  assert.equal((await c.call('POST', `/v1/rooms/${code}/project`, { token: exec, body: { projectCode: null } })).status, 200);
});

test('reporting: KPI summary counts match the database, states its definitions, and reports operational performance NOT_MONITORED', async () => {
  const r = await c.call('GET', '/v1/reports/summary', { token: T.opslead });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const k = r.body;
  assert.equal(k.rooms.total, Number(h.asSuper('SELECT count(*) FROM app.room WHERE tenant_id = (SELECT id FROM app.tenant WHERE slug = \'empathia-demo\')')));
  assert.equal(k.commissioning.byLabel.PASS_VERIFIED, 2);
  assert.equal(k.issues.deficienciesResolved, 1);
  assert.equal(k.workOrders.CLOSED, 1);
  assert.ok(k.commissioning.coverage.value > 0 && k.commissioning.coverage.value < 1);
  assert.equal(k.commissioning.verifiedShare.value, 1);
  assert.match(k.commissioning.coverage.definition, /applicable/);
  assert.equal(k.operationalPerformance, 'NOT_MONITORED');
  assert.ok(!('PASS' in k.commissioning.byLabel), 'no bare PASS label');
  // the site-scoped technician sees only the South campus
  const south = await c.login('service', 'empathia-demo', 'service-south');
  const s = await c.call('GET', '/v1/reports/summary', { token: south });
  assert.equal(s.body.scope, 'site-scoped');
  assert.equal(s.body.rooms.total, Number(h.asSuper("SELECT count(*) FROM app.room r JOIN app.building b ON b.id = r.building_id WHERE b.code = 'HZN'")));
});

// ------------------------------------------------------------------------------------------------ assurance
test('assurance: a room without an accepted baseline reports NO_BASELINE; with one, dimensions without evidence are not assessed', async () => {
  const none = await c.call('GET', '/v1/rooms/R-PLN-0002/assurance', { token: T.opslead });
  assert.equal(none.status, 200);
  assert.equal(none.body.state, 'NO_BASELINE');
  // Fixture: an accepted baseline written directly (reaching ACCEPTED through the API needs every applicable test verified — covered
  // by the acceptance rules elsewhere). The baseline references revision 1; the current design has one more device than revision 1.
  h.asSuper(`UPDATE app.room SET lifecycle = 'ACCEPTED', baseline = jsonb_build_object('at', '2026-10-01T00:00:00Z', 'signedBy', 'fixture', 'revision', 1, 'state', 'ACCEPTED_BASELINE') WHERE code = '${code}'`);
  const a = await c.call('GET', `/v1/rooms/${code}/assurance`, { token: T.opslead });
  assert.equal(a.status, 200, JSON.stringify(a.body));
  assert.equal(a.body.state, 'ASSESSED');
  assert.equal(a.body.rows.length, 17);
  const presence = a.body.rows.find((r) => r.k === 'presence');
  assert.equal(presence.status, 'drift', 'the device added after revision 1 is not in the baseline');
  assert.equal(presence.fix.approverAuthority, 'baseline.approve');
  assert.ok(a.body.rows.filter((r) => !['presence'].includes(r.k) && r.status !== 'na').every((r) => r.status === 'unknown'), 'no evidence → not assessed');
  assert.ok(a.body.coverage.assessed <= 1);
  assert.equal(a.body.liveHealth, 'NOT_MONITORED');
  h.asSuper(`UPDATE app.room SET lifecycle = 'COMMISSIONING', baseline = NULL WHERE code = '${code}'`);
});

// ------------------------------------------------------------------------------------------------ integrations (Harmony starter)
test('integrations: a MOCK adapter syncs through the contract; observations are SYNTHETIC_MOCK, idempotent and tenant-scoped', async () => {
  assert.equal((await c.call('POST', '/v1/integrations/mock-device-inventory/sync', { token: T.designer })).status, 403);
  const s1 = await c.call('POST', '/v1/integrations/mock-device-inventory/sync', { token: T.secadmin });
  assert.equal(s1.status, 200, JSON.stringify(s1.body));
  assert.equal(s1.body.state, 'OK'); assert.equal(s1.body.observations, 60); assert.equal(s1.body.evidence, 'SYNTHETIC_MOCK');
  const s2 = await c.call('POST', '/v1/integrations/mock-device-inventory/sync', { token: T.secadmin });
  assert.equal(s2.body.observations, 60);
  assert.equal(h.asSuper("SELECT count(*) FROM app.integration_observation WHERE integration_key = 'mock-device-inventory'"), '60', 'a second sync updates, it does not duplicate');
  assert.equal(h.asSuper("SELECT count(*) FROM app.integration_observation WHERE evidence <> 'SYNTHETIC_MOCK'"), '0');
  const obs = await c.call('GET', '/v1/integrations/mock-device-inventory/observations?limit=5', { token: T.secadmin });
  assert.equal(obs.body.items.length, 5); assert.equal(obs.body.sync.state, 'OK');
  assert.equal(h.asSuper("SELECT count(*) FROM app.outbox_event WHERE type = 'integration.adapter_health_changed'"), '1', 'health changed once (none → OK)');
  const other = await c.login('secadmin', 'second-tenant');
  assert.equal((await c.call('GET', '/v1/integrations/mock-device-inventory/observations', { token: other })).body.items.length, 0);
  // a catalogue entry has no adapter: nothing runs and nothing is called
  const key = h.asSuper("SELECT key FROM app.integration WHERE state = 'CONTRACT_ONLY' ORDER BY key LIMIT 1");
  const nc = await c.call('POST', `/v1/integrations/${key}/sync`, { token: T.secadmin });
  assert.equal(nc.status, 501); assert.equal(nc.body.code, 'not_configured');
  // the database refuses a measurement claim from a MOCK source
  assert.throws(() => h.asSuper("UPDATE app.integration_observation SET evidence = 'MEASURED' WHERE id = (SELECT min(id) FROM app.integration_observation)"), /only SYNTHETIC_MOCK/);
});

// ------------------------------------------------------------------------------------------------ knowledge fabric and governed assistant
test('knowledge: search is permission-aware — a restricted document never appears for another role, and citations name their source', async () => {
  const sec = await c.call('GET', '/v1/knowledge?q=revoke%20membership', { token: T.secadmin });
  assert.equal(sec.status, 200);
  assert.ok(sec.body.items.some((d) => d.source === 'KB-0004'));
  const des = await c.call('GET', '/v1/knowledge?q=revoke%20membership', { token: T.designer });
  assert.ok(!des.body.items.some((d) => d.source === 'KB-0004'), 'the security runbook is invisible to a designer');
  assert.equal(des.body.hiddenByPermission, 'some documents are not visible to your role');
  const all = await c.call('GET', '/v1/knowledge?q=commissioning', { token: T.requestor });
  assert.ok(all.body.items.every((d) => d.source === 'KB-0003'), 'a requestor sees only documents open to every role');
});

test('governed assistant: generation is NOT_CONFIGURED (501); the request is logged by hash, the permitted sources are returned, the refusal is audited', async () => {
  const r = await c.call('POST', '/v1/ai/requests', { token: T.cxeng, body: { purpose: 'ask', prompt: 'What does the town hall commissioning protocol require?' } });
  assert.equal(r.status, 501);
  assert.equal(r.body.code, 'not_configured');
  assert.ok(r.body.reasons.some((x) => /KB-0001/.test(x)), 'the permitted source is cited');
  const row = h.asSuper("SELECT outcome || '|' || length(prompt_sha256) FROM app.ai_request ORDER BY created_at DESC LIMIT 1");
  assert.equal(row, 'NOT_CONFIGURED|64', 'logged as a hash, not the prompt text');
  const des = await c.call('POST', '/v1/ai/requests', { token: T.designer, body: { prompt: 'security incident runbook revoke' } });
  assert.equal(des.status, 501);
  assert.ok(!(des.body.reasons || []).some((x) => /KB-0004/.test(x)), 'retrieval for the assistant obeys the same permissions');
  assert.equal(h.asSuper("SELECT count(*) FROM app.audit_event WHERE action = 'ai.request' AND outcome = 'FAILED'"), '2');
});
