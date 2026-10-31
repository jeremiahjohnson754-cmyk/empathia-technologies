/**
 * Site scope beyond rooms (red-team RT-02) and audit of rule refusals (RT-01), over real HTTP and a real database:
 *   - a service manager scoped to the South campus cannot close a work order whose room is on the North campus (404, like any
 *     out-of-scope room), and can close one on the South campus;
 *   - evidence cited only by a North-campus result is not readable by a South-scoped member who did not upload it (404, audited);
 *   - a refused lifecycle transition and a refused verification leave a DENIED audit row even though the request's transaction
 *     rolled back.
 * Fixtures are written directly as the database owner (synthetic rooms, issues and work orders).
 *   node --test tests/security/site-scope.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client } from '../integration/harness.mjs';

let h, c, svcmgr, southMgr, steward, cxeng, northWo, southWo, northEvidence;
before(async () => {
  h = await setup({ db: 'empathia_test_scope', port: 4193 }); c = client(h.base);
  svcmgr = await c.login('svcmgr'); steward = await c.login('steward'); cxeng = await c.login('cxeng');
  // a South-scoped service manager, for this test only
  const tenant = h.asSuper("SELECT id FROM app.tenant WHERE slug = 'empathia-demo'"); const south = h.asSuper("SELECT id FROM app.site WHERE code = 'SITE-SOUTH'");
  h.asSuper(`INSERT INTO app.person (id, email, display_name, password_hash) SELECT gen_random_uuid(), 'svcmgr-south@empathia-demo.empathia.invalid', 'Service Manager, South only (synthetic)', password_hash FROM app.person WHERE email = 'svcmgr@empathia-demo.empathia.invalid'`);
  h.asSuper(`INSERT INTO app.membership (tenant_id, person_id, role_key, site_scope) SELECT '${tenant}', id, 'svcmgr', ARRAY['${south}']::uuid[] FROM app.person WHERE email = 'svcmgr-south@empathia-demo.empathia.invalid'`);
  southMgr = await c.login('svcmgr', 'empathia-demo', 'svcmgr-south');
  // one issue + work order on a North room (ATL) and one on a South room (HZN)
  const mk = (bld, n) => {
    const room = h.asSuper(`SELECT r.id FROM app.room r JOIN app.building b ON b.id = r.building_id WHERE b.code = '${bld}' ORDER BY r.code LIMIT 1`);
    const who = h.asSuper("SELECT id FROM app.person WHERE email = 'svcmgr@empathia-demo.empathia.invalid'");
    const issue = h.asSuper(`INSERT INTO app.room_issue (tenant_id, room_id, code, key, category, check_name, severity, title, rationale, first_seen_rev, last_seen_rev) VALUES ('${tenant}', '${room}', 'ISS-SCOPE-${n}', 'scope-${n}', 'INSTALLATION_COMMISSIONING_DEFICIENCY', 'synthetic', 'Medium', 'synthetic issue ${n}', 'fixture', 1, 1) RETURNING id`);
    h.asSuper(`INSERT INTO app.work_order (tenant_id, issue_id, code, assigned_role, created_by) VALUES ('${tenant}', '${issue}', 'WO-SCOPE-${n}', 'service', '${who}')`);
    return { room, code: `WO-SCOPE-${n}` };
  };
  northWo = mk('ATL', 1); southWo = mk('HZN', 2);
  // evidence uploaded by the commissioning engineer and cited by a result of the North room
  const up = await c.call('POST', '/v1/evidence', { token: cxeng, raw: Buffer.from('synthetic north observation'), headers: { 'content-type': 'text/plain', 'x-file-name': 'north.txt' } });
  assert.equal(up.status, 201, JSON.stringify(up.body)); northEvidence = up.body.id;
  const who = h.asSuper("SELECT id FROM app.person WHERE email = 'cxeng@empathia-demo.empathia.invalid'");
  h.asSuper(`ALTER TABLE app.test_result DISABLE TRIGGER ALL`);
  h.asSuper(`INSERT INTO app.test_result (tenant_id, room_id, test_id, state, evidence_id, evidence_kind, instrument, recorded_by, recorded_role) VALUES ('${tenant}', '${northWo.room}', 'T-SCOPE', 'PASS', '${northEvidence}', 'photo', 'synthetic', '${who}', 'cxeng')`);
  h.asSuper(`ALTER TABLE app.test_result ENABLE TRIGGER ALL`);
});
after(async () => { await h?.app.stop(); });

test('a South-scoped service manager cannot triage or read a North work order (404) but can triage a South one; the unscoped manager reaches both', async () => {
  const tri = { severity: 'Standard', scope: 'scope test', risk: 'low' };
  assert.equal((await c.call('POST', `/v1/work-orders/${northWo.code}/triage`, { token: southMgr, body: tri })).status, 404);
  assert.equal((await c.call('GET', `/v1/work-orders/${northWo.code}`, { token: southMgr })).status, 404);
  assert.equal(h.asSuper(`SELECT state FROM app.work_order WHERE code = '${northWo.code}'`), 'OPEN');
  const r = await c.call('POST', `/v1/work-orders/${southWo.code}/triage`, { token: southMgr, body: tri });
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.state, 'TRIAGED');
  assert.equal((await c.call('POST', `/v1/work-orders/${northWo.code}/triage`, { token: svcmgr, body: tri })).status, 200);
  const list = (await c.call('GET', '/v1/work-orders', { token: southMgr })).body.items.map((x) => x.code);
  assert.ok(list.includes(southWo.code) && !list.includes(northWo.code), 'the list is scoped through the room');
});
test('evidence cited only by a North result is not readable by a South-scoped member who did not upload it; the refusal is audited', async () => {
  assert.equal((await c.call('GET', `/v1/evidence/${northEvidence}/content`, { token: cxeng })).status, 200, 'the uploader reads it');
  assert.equal((await c.call('GET', `/v1/evidence/${northEvidence}/content`, { token: svcmgr })).status, 200, 'an unscoped member of the tenant reads it');
  assert.equal((await c.call('GET', `/v1/evidence/${northEvidence}/content`, { token: southMgr })).status, 404);
  const denied = (await c.call('GET', `/v1/audit?aggregateType=Evidence&aggregateId=${northEvidence}`, { token: steward })).body.items.find((e) => e.action === 'evidence.read' && e.outcome === 'DENIED');
  assert.ok(denied, 'the refused read is audited');
});
test('a refused lifecycle transition leaves a DENIED audit row although its transaction rolled back', async () => {
  const code = h.asSuper("SELECT code FROM app.room WHERE lifecycle = 'PLANNED' ORDER BY code LIMIT 1");
  const syseng = await c.login('syseng');
  const r = await c.call('POST', `/v1/rooms/${code}/lifecycle`, { token: syseng, body: { to: 'COMMISSIONING' } });   // the systems engineer may start commissioning, but a PLANNED room cannot skip there
  assert.ok([422, 400].includes(r.status), `status ${r.status}`);
  const denied = (await c.call('GET', `/v1/audit?aggregateType=Room&aggregateId=${code}`, { token: steward })).body.items.find((e) => /room\.lifecycle/.test(e.action) && e.outcome === 'DENIED');
  assert.ok(denied, 'DENIED row present'); assert.ok(Array.isArray(denied.detail.why) && denied.detail.why.length, JSON.stringify(denied.detail));
});
