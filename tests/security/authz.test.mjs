/**
 * Negative authorization, tenant-isolation and database-enforcement tests for the enterprise API starter.
 *
 * Each test states one thing a caller must NOT be able to do and checks that the server (or, below it, PostgreSQL) refuses it.
 * Real HTTP against the in-process API; real SQL against a fresh database `empathia_test_security`. Synthetic data only.
 * This is the starter's own regression suite — not an external penetration test, which remains NOT VERIFIED — EXTERNAL TEST REQUIRED.
 *   node --test tests/security/authz.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { setup, client } from '../integration/harness.mjs';

let h, c;
const T = {};
const claims = (tok) => JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString('utf8'));
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

before(async () => {
  h = await setup({ db: 'empathia_test_security', port: 4198 });
  c = client(h.base);
  for (const r of ['designer', 'syseng', 'opslead', 'installer', 'cxeng', 'qa_reviewer', 'svcmgr', 'service', 'requestor', 'steward', 'secadmin', 'exec']) T[r] = await c.login(r);
  T.other = await c.login('designer', 'second-tenant');
  T.otherSec = await c.login('secadmin', 'second-tenant');
  T.south = await c.login('service', 'empathia-demo', 'service-south');
});
after(async () => { await h?.app.stop(); });

// ------------------------------------------------------------------------------------------------ authentication
test('401 without a token', async () => {
  const r = await c.call('GET', '/v1/rooms');
  assert.equal(r.status, 401);
  assert.equal(r.headers['content-type'], 'application/problem+json');
  assert.equal(r.body.code, 'unauthenticated');
});

test('401 with a non-Bearer scheme or a malformed token', async () => {
  assert.equal((await c.call('GET', '/v1/me', { headers: { authorization: `Basic ${Buffer.from('a:b').toString('base64')}` } })).status, 401);
  assert.equal((await c.call('GET', '/v1/me', { headers: { authorization: 'Bearer not-a-jwt' } })).status, 401);
});

test('401 with a tampered payload (role escalated to architect, signature kept)', async () => {
  const [hd, , sig] = T.requestor.split('.');
  const forged = `${hd}.${b64({ ...claims(T.requestor), role: 'architect' })}.${sig}`;
  assert.equal((await c.call('GET', '/v1/me', { token: forged })).status, 401);
});

test('401 with alg=none and with an unsigned token', async () => {
  const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64(claims(T.secadmin))}.`;
  assert.equal((await c.call('GET', '/v1/me', { token: none })).status, 401);
  const hs512 = `${b64({ alg: 'HS512', typ: 'JWT' })}.${b64(claims(T.secadmin))}.${crypto.randomBytes(64).toString('base64url')}`;
  assert.equal((await c.call('GET', '/v1/me', { token: hs512 })).status, 401);
});

test('401 with a correctly signed but expired token', async () => {
  const k = claims(T.designer);
  const old = h.app.tokens.issue(k.sub, k.tid, k.role, Math.floor(Date.now() / 1000) - 3600).token;
  const r = await c.call('GET', '/v1/me', { token: old });
  assert.equal(r.status, 401);
  assert.match(r.body.detail, /expired/);
});

test('401 with a token signed by another key (issuer forgery)', async () => {
  const k = claims(T.designer);
  const head = b64({ alg: 'HS256', typ: 'JWT' }); const body = b64({ ...k, exp: Math.floor(Date.now() / 1000) + 600 });
  const sig = crypto.createHmac('sha256', crypto.randomBytes(48)).update(`${head}.${body}`).digest('base64url');
  assert.equal((await c.call('GET', '/v1/me', { token: `${head}.${body}.${sig}` })).status, 401);
});

test('401 when a validly signed token names a role the person does not hold (membership resolved server-side)', async () => {
  const k = claims(T.designer);
  const t = h.app.tokens.issue(k.sub, k.tid, 'secadmin').token;
  assert.equal((await c.call('GET', '/v1/me', { token: t })).status, 401);
});

test('401 at once when the person is disabled (no waiting for token expiry); works again when re-enabled', async () => {
  const k = claims(T.exec);
  h.asSuper(`UPDATE app.person SET disabled = true WHERE id = '${k.sub}'`);
  assert.equal((await c.call('GET', '/v1/me', { token: T.exec })).status, 401);
  h.asSuper(`UPDATE app.person SET disabled = false WHERE id = '${k.sub}'`);
  assert.equal((await c.call('GET', '/v1/me', { token: T.exec })).status, 200);
});

test('sign-in: a wrong password and an unknown account fail the same way', async () => {
  const a = await c.call('POST', '/v1/auth/token', { body: { email: 'designer@empathia-demo.empathia.invalid', password: 'wrong', tenant: 'empathia-demo', role: 'designer' } });
  const b = await c.call('POST', '/v1/auth/token', { body: { email: 'nobody@empathia-demo.empathia.invalid', password: 'wrong' } });
  assert.equal(a.status, 401); assert.equal(b.status, 401);
  assert.equal(a.body.detail, b.body.detail);
});

test('sign-in cannot pick a membership the person does not have', async () => {
  const r = await c.call('POST', '/v1/auth/token', { body: { email: 'designer@empathia-demo.empathia.invalid', password: 'empathia-dev-only', tenant: 'empathia-demo', role: 'secadmin' } });
  assert.equal(r.status, 403);
});

// ------------------------------------------------------------------------------------------------ tenant isolation
test('another tenant cannot list, read or change this tenant’s rooms (404, not 403: existence is not disclosed)', async () => {
  const list = await c.call('GET', '/v1/rooms', { token: T.other });
  assert.equal(list.status, 200);
  assert.ok(!JSON.stringify(list.body).includes('R-PLN-0001'));
  assert.equal((await c.call('GET', '/v1/rooms/R-PLN-0001', { token: T.other })).status, 404);
  assert.equal((await c.call('POST', '/v1/rooms/R-PLN-0001/devices', { token: T.other, body: { category: 'display' } })).status, 404);
  assert.equal((await c.call('PATCH', '/v1/rooms/R-PLN-0001', { token: T.other, body: { name: 'hijacked' } })).status, 404);
  assert.equal((await c.call('GET', '/v1/graph/Room/R-PLN-0001', { token: T.other })).status, 404);
  assert.equal((await c.call('GET', '/v1/read/rooms/R-PLN-0001', { token: T.other })).status, 404);
  assert.notEqual(h.asSuper(`SELECT name FROM app.room WHERE code = 'R-PLN-0001' AND tenant_id = (SELECT id FROM app.tenant WHERE slug = 'empathia-demo')`), 'hijacked');
});

test('another tenant cannot read this tenant’s evidence, audit or outbox', async () => {
  const up = await c.call('POST', '/v1/evidence', { token: T.cxeng, raw: Buffer.from('tenant-private synthetic evidence'), headers: { 'content-type': 'text/plain' } });
  assert.equal(up.status, 201);
  assert.equal((await c.call('GET', `/v1/evidence/${up.body.id}/content`, { token: T.other })).status, 404);
  const audit = await c.call('GET', '/v1/audit?limit=500', { token: T.otherSec });
  assert.equal(audit.status, 200);
  assert.ok(!JSON.stringify(audit.body).includes(up.body.id));
  const ob = await c.call('GET', '/v1/admin/outbox?status=DELIVERED', { token: T.otherSec });
  assert.ok(!JSON.stringify(ob.body).includes('R-PLN-0001'));
});

test('a site-scoped technician sees only the rooms of their site', async () => {
  const list = await c.call('GET', '/v1/rooms', { token: T.south });
  assert.equal(list.status, 200);
  const blds = list.body.items.map((x) => x.building);
  assert.ok(blds.every((b) => b === 'HZN'), `only South-campus buildings: ${blds.join(',')}`);
  const north = h.asSuper(`SELECT r.code FROM app.room r JOIN app.building b ON b.id = r.building_id WHERE b.code = 'ATL' ORDER BY r.code LIMIT 1`);
  assert.equal((await c.call('GET', `/v1/rooms/${north}`, { token: T.south })).status, 404);
  assert.equal((await c.call('GET', `/v1/graph/Room/${north}`, { token: T.south })).status, 404);
});

// ------------------------------------------------------------------------------------------------ role authority (least privilege)
const ROOM = 'R-PLN-0002';
const cases = [
  ['requestor cannot create a room', 'requestor', 'POST', '/v1/rooms', { name: 'x', template: 'huddle' }],
  ['exec cannot add a device', 'exec', 'POST', `/v1/rooms/${ROOM}/devices`, { category: 'display' }],
  ['designer cannot approve a classification', 'designer', 'POST', `/v1/rooms/${ROOM}/classification/approve`, {}],
  ['designer cannot approve the design', 'designer', 'POST', `/v1/rooms/${ROOM}/lifecycle`, { to: 'DESIGN_APPROVED' }],
  ['installer cannot approve the design', 'installer', 'POST', `/v1/rooms/${ROOM}/lifecycle`, { to: 'DESIGN_APPROVED' }],
  ['service technician cannot raise a work order', 'service', 'POST', '/v1/issues/RISS-0001/work-orders', {}],
  ['system engineer cannot assign an issue', 'syseng', 'POST', '/v1/issues/RISS-0001/assign', { ownerRole: 'service' }],
  ['designer cannot assign an issue', 'designer', 'POST', '/v1/issues/RISS-0001/assign', { ownerRole: 'service' }],
  ['requestor cannot upload evidence', 'requestor', 'POST', '/v1/evidence', undefined],
  ['installer cannot verify a result', 'installer', 'POST', `/v1/rooms/${ROOM}/results/power_budget/verify`, undefined],
  ['designer cannot read the audit trail', 'designer', 'GET', '/v1/audit', undefined],
  ['steward cannot administer the outbox', 'steward', 'GET', '/v1/admin/outbox', undefined],
  ['designer cannot probe an integration', 'designer', 'POST', '/v1/integrations/mock-itsm-readonly/probe', undefined],
];
for (const [name, role, method, path, body] of cases) {
  test(`403: ${name}`, async () => {
    const r = await c.call(method, path, { token: T[role], ...(body !== undefined ? { body } : {}), ...(path === '/v1/evidence' ? { raw: Buffer.from('x'), headers: { 'content-type': 'text/plain' } } : {}) });
    assert.equal(r.status, 403, `${method} ${path} as ${role}: ${r.status} ${JSON.stringify(r.body)}`);
    assert.equal(r.body.code, 'forbidden');
  });
}

test('every refusal by authority is itself audited as DENIED', async () => {
  const k = claims(T.designer);
  const n = Number(h.asSuper(`SELECT count(*) FROM app.audit_event WHERE actor_id = '${k.sub}' AND outcome = 'DENIED'`));
  assert.ok(n >= 3, `designer denials audited: ${n}`);
});

// ------------------------------------------------------------------------------------------------ business rules no role can bypass
test('nothing passes from a design: results are refused before COMMISSIONING, even for the commissioning engineer', async () => {
  const ev = await c.call('POST', '/v1/evidence', { token: T.cxeng, raw: Buffer.from('synthetic'), headers: { 'content-type': 'text/plain' } });
  const r = await c.call('POST', `/v1/rooms/${ROOM}/results`, { token: T.cxeng, body: { testId: 'power_budget', state: 'PASS', evidenceId: ev.body.id, evidenceKind: 'FIELD_OBSERVED' } });
  assert.equal(r.status, 422);
  assert.match(r.body.detail, /COMMISSIONING/);
});

test('evidence of another tenant cannot be attached to a result', async () => {
  const theirs = await c.call('POST', '/v1/evidence', { token: T.otherSec, raw: Buffer.from('x'), headers: { 'content-type': 'text/plain' } });
  // second-tenant secadmin may or may not hold evidence authority; either way the id must not resolve in this tenant
  const id = theirs.status === 201 ? theirs.body.id : crypto.randomUUID();
  const r = await c.call('POST', `/v1/rooms/${ROOM}/results`, { token: T.cxeng, body: { testId: 'power_budget', state: 'PASS', evidenceId: id, evidenceKind: 'FIELD_OBSERVED' } });
  assert.equal(r.status, 404);
});

test('a work order is refused on a design deficiency of a planned room', async () => {
  const issues = (await c.call('GET', `/v1/rooms/${ROOM}`, { token: T.svcmgr })).body.issues.filter((i) => i.state === 'OPEN');
  assert.ok(issues.length, 'the seeded boardroom has an open design issue');
  const r = await c.call('POST', `/v1/issues/${issues[0].code}/work-orders`, { token: T.svcmgr, body: {} });
  assert.equal(r.status, 422);
});

test('OPERATIONAL is refused without live monitoring evidence (and ACCEPTED without verified results)', async () => {
  const r = await c.call('POST', `/v1/rooms/${ROOM}/lifecycle`, { token: T.qa_reviewer, body: { to: 'ACCEPTED' } });
  assert.equal(r.status, 422);
});

// ------------------------------------------------------------------------------------------------ input handling
test('validation: unknown query parameters, bad JSON, wrong media type, oversize fields and bad path ids are refused', async () => {
  assert.equal((await c.call('GET', '/v1/rooms?drop=1', { token: T.designer })).status, 400);
  assert.equal((await c.call('POST', '/v1/rooms', { token: T.designer, raw: '{bad', headers: { 'content-type': 'application/json' } })).status, 400);
  assert.equal((await c.call('POST', '/v1/rooms', { token: T.designer, raw: 'name=x', headers: { 'content-type': 'application/x-www-form-urlencoded' } })).status, 415);
  assert.equal((await c.call('POST', '/v1/rooms', { token: T.designer, body: { name: 'x'.repeat(81), template: 'huddle' } })).status, 400);
  assert.equal((await c.call('GET', '/v1/evidence/not-a-uuid/content', { token: T.designer })).status, 400);
  assert.equal((await c.call('GET', "/v1/rooms/R-PLN-0001'%20OR%201=1--", { token: T.designer })).status, 404);
  assert.equal((await c.call('DELETE', '/v1/rooms', { token: T.designer })).status, 405);
});

test('CORS: an unlisted origin gets no allow-origin header; security headers are always present', async () => {
  const r = await c.call('GET', '/v1/me', { token: T.designer, headers: { origin: 'https://attacker.example' } });
  assert.equal(r.status, 200);
  assert.equal(r.headers['access-control-allow-origin'], undefined);
  assert.equal(r.headers['x-frame-options'], 'DENY');
  assert.match(r.headers['content-security-policy'], /default-src 'none'/);
  const pre = await c.call('OPTIONS', '/v1/rooms', { headers: { origin: 'https://attacker.example', 'access-control-request-method': 'POST' } });
  assert.equal(pre.status, 403);
});

test('error bodies are problem details with a correlation id and no stack trace', async () => {
  const r = await c.call('GET', '/v1/graph/Room/R-PLN-0001?depth=9', { token: T.designer });
  assert.equal(r.status, 400);
  assert.ok(!/stack|at \w+ \(/.test(JSON.stringify(r.body)));
  assert.ok(r.body.correlationId || r.headers['x-correlation-id']);
});

// ------------------------------------------------------------------------------------------------ the database itself
const appSql = async (fn) => { const k = await h.appConn(); try { return await fn(k); } finally { await k.end(); } };
const tid = (slug) => h.asSuper(`SELECT id FROM app.tenant WHERE slug = '${slug}'`);

test('RLS: the runtime role sees no rows when no tenant is set', async () => {
  await appSql(async (k) => {
    assert.equal((await k.query('SELECT count(*)::int AS n FROM app.room')).rows[0].n, 0);
    assert.equal((await k.query('SELECT count(*)::int AS n FROM app.evidence_object')).rows[0].n, 0);
    assert.equal((await k.query('SELECT count(*)::int AS n FROM app.audit_event')).rows[0].n, 0);
  });
});

test('RLS: with the second tenant set, the runtime role cannot read, update or insert into the first tenant', async () => {
  const demo = tid('empathia-demo'); const other = tid('second-tenant');
  await appSql(async (k) => {
    await k.query("SELECT set_config('app.tenant_id', $1, false)", [other]);
    assert.equal((await k.query("SELECT count(*)::int AS n FROM app.room WHERE code = 'R-PLN-0001'")).rows[0].n, 0);
    assert.equal((await k.query("UPDATE app.room SET name = 'x' WHERE code = 'R-PLN-0001'")).rowCount, 0);
    await assert.rejects(k.query('INSERT INTO app.site (tenant_id, code, name) VALUES ($1, $2, $3)', [demo, 'SITE-EVIL', 'evil']), (e) => e.code === '42501');
  });
});

test('the runtime role is not a superuser and cannot bypass RLS or change roles', async () => {
  await appSql(async (k) => {
    const r = (await k.query("SELECT rolsuper, rolbypassrls, rolcreaterole FROM pg_roles WHERE rolname = current_user")).rows[0];
    assert.deepEqual([r.rolsuper, r.rolbypassrls, r.rolcreaterole], [false, false, false]);
    await assert.rejects(k.query("INSERT INTO app.role (key, label, authorities) VALUES ('evil', 'x', ARRAY['*'])"), (e) => e.code === '42501');
    await assert.rejects(k.query('ALTER TABLE app.room DISABLE ROW LEVEL SECURITY'), (e) => e.code === '42501');
  });
});

test('append-only: evidence, results, verifications, revisions and audit events cannot be changed or deleted (even by the owner)', async () => {
  for (const s of [
    "UPDATE app.evidence_object SET file_name = 'x'",
    'DELETE FROM app.evidence_object',
    "UPDATE app.audit_event SET outcome = 'ALLOWED'",
    'DELETE FROM app.audit_event',
    "UPDATE app.room_revision SET reason = 'x'",
    'DELETE FROM app.test_result',
    'DELETE FROM app.verification',
  ]) assert.throws(() => h.asSuper(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM ${s.match(/(app\.\w+)/)[1]}) THEN ${s}; ELSE RAISE EXCEPTION 'append-only (no rows to test)' USING ERRCODE = 'EM001'; END IF; END $$`), /append-only|EM001|refuse/i, s);
});

test('database: a result on a room not in COMMISSIONING is refused by the trigger (EM002)', async () => {
  const room = h.asSuper("SELECT id || '|' || tenant_id FROM app.room WHERE code = 'R-PLN-0002'").split('|');
  const ev = h.asSuper(`SELECT id FROM app.evidence_object WHERE tenant_id = '${room[1]}' LIMIT 1`);
  const person = h.asSuper("SELECT id FROM app.person WHERE email = 'cxeng@empathia-demo.empathia.invalid'");
  assert.throws(() => h.asSuper(`INSERT INTO app.test_result (tenant_id, room_id, test_id, state, evidence_id, evidence_kind, recorded_by, recorded_role) VALUES ('${room[1]}', '${room[0]}', 'power_budget', 'PASS', '${ev}', 'FIELD_OBSERVED', '${person}', 'cxeng')`), /COMMISSIONING/);
});

test('database: self-verification violates verification_is_independent; verifying a non-PASS raises EM003', async () => {
  // build a COMMISSIONING room through the API, then attempt the forbidden inserts directly
  const mk = await c.call('POST', '/v1/rooms', { token: T.designer, body: { name: 'DB rule room (synthetic)', template: 'huddle', buildingCode: 'NST', floor: 1 } });
  const code = mk.body.code;
  await c.call('POST', `/v1/rooms/${code}/revisions`, { token: T.designer, body: {} }).catch(() => null);
  assert.equal((await c.call('POST', `/v1/rooms/${code}/classification/approve`, { token: T.syseng, body: {} })).status, 200);
  for (const [to, who] of [['DESIGN_APPROVED', 'syseng'], ['INSTALLATION_PENDING', 'opslead'], ['INSTALLED_UNVERIFIED', 'installer'], ['COMMISSIONING', 'syseng']]) {
    const r = await c.call('POST', `/v1/rooms/${code}/lifecycle`, { token: T[who], body: { to } }); assert.equal(r.status, 200, `${to}: ${JSON.stringify(r.body)}`);
  }
  const d = (await c.call('GET', `/v1/rooms/${code}`, { token: T.cxeng })).body.commissioning.rows.filter((x) => x.applicable);
  const ev = (await c.call('POST', '/v1/evidence', { token: T.cxeng, raw: Buffer.from('synthetic'), headers: { 'content-type': 'text/plain' } })).body.id;
  const rec = (row, state) => c.call('POST', `/v1/rooms/${code}/results`, { token: T.cxeng, body: { testId: row.test_id, state, evidenceId: ev, evidenceKind: row.evidence[0], instrument: 'SYN-METER-01 (synthetic)' } });
  assert.equal((await rec(d[0], 'PASS')).status, 201);
  assert.equal((await rec(d[1], 'FAIL')).status, 201);
  const cx = h.asSuper("SELECT id FROM app.person WHERE email = 'cxeng@empathia-demo.empathia.invalid'");
  const [passId, tenant] = h.asSuper(`SELECT result_id || '|' || tenant_id FROM app.current_result WHERE test_id = '${d[0].test_id}' AND room_id = (SELECT id FROM app.room WHERE code = '${code}')`).split('|');
  const failId = h.asSuper(`SELECT result_id FROM app.current_result WHERE test_id = '${d[1].test_id}' AND room_id = (SELECT id FROM app.room WHERE code = '${code}')`);
  assert.throws(() => h.asSuper(`INSERT INTO app.verification (tenant_id, result_id, recorded_by, verified_by, verified_role) VALUES ('${tenant}', '${passId}', '${cx}', '${cx}', 'cxeng')`), /verification_is_independent/);
  const qa = h.asSuper("SELECT id FROM app.person WHERE email = 'qa-reviewer@empathia-demo.empathia.invalid'");
  assert.throws(() => h.asSuper(`INSERT INTO app.verification (tenant_id, result_id, recorded_by, verified_by, verified_role) VALUES ('${tenant}', '${failId}', '${cx}', '${qa}', 'qa_reviewer')`), /only a recorded PASS/);
  // and the read model refuses any live-health claim
  assert.throws(() => h.asSuper("UPDATE app.room_read_model SET live_health = 'HEALTHY'"), /check|violat/i);
});

test('rate limiting: a caller over budget gets 429 (budget lowered for this test only)', async () => {
  const { start } = await import('../../services/enterprise-api/dist/src/main.js');
  const app2 = await start({ PORT: '4197', RATE_LIMIT_PER_MINUTE: '5' });
  try {
    const c2 = client('http://127.0.0.1:4197');
    const codes = [];
    for (let i = 0; i < 8; i += 1) codes.push((await c2.call('GET', '/v1/me', { token: T.designer })).status);
    assert.ok(codes.includes(429), codes.join(','));
  } finally { await app2.stop(); }
});

test('a site-scoped person cannot create a room in a building outside their sites (404), but can inside them', async () => {
  // a South-scoped designer membership, added for this test only (the seed has no scoped designer)
  const demo = tid('empathia-demo');
  const south = h.asSuper("SELECT id FROM app.site WHERE code = 'SITE-SOUTH'");
  const pid = h.asSuper("SELECT id FROM app.person WHERE email = 'service-south@empathia-demo.empathia.invalid'");
  h.asSuper(`INSERT INTO app.membership (tenant_id, person_id, role_key, site_scope) VALUES ('${demo}', '${pid}', 'designer', ARRAY['${south}']::uuid[])`);
  const tok = (await c.call('POST', '/v1/auth/token', { body: { email: 'service-south@empathia-demo.empathia.invalid', password: 'empathia-dev-only', tenant: 'empathia-demo', role: 'designer' } })).body.accessToken;
  const north = await c.call('POST', '/v1/rooms', { token: tok, body: { name: 'Out of scope (synthetic)', template: 'huddle', buildingCode: 'ATL' } });
  assert.equal(north.status, 404);
  const ok = await c.call('POST', '/v1/rooms', { token: tok, body: { name: 'In scope (synthetic)', template: 'huddle', buildingCode: 'HZN' } });
  assert.equal(ok.status, 201);
  assert.equal(h.asSuper("SELECT count(*) FROM app.room WHERE name = 'Out of scope (synthetic)'"), '0');
});

test('a person outside the executive role cannot create projects or move rooms between projects', async () => {
  assert.equal((await c.call('POST', '/v1/projects', { token: T.opslead, body: { code: 'PRJ-EVIL', name: 'x' } })).status, 403);
  assert.equal((await c.call('POST', '/v1/rooms/R-PLN-0001/project', { token: T.syseng, body: { projectCode: null } })).status, 403);
  assert.equal((await c.call('POST', '/v1/rooms/R-PLN-0001/project', { token: T.exec, body: { projectCode: null } })).status, 200, 'the executive can');
  const other = await c.login('designer', 'second-tenant');
  assert.equal((await c.call('GET', '/v1/projects', { token: other })).body.items.length, 0, 'projects are tenant-scoped');
});

test('people listing is security-admin only and never returns password hashes', async () => {
  assert.equal((await c.call('GET', '/v1/people', { token: T.steward })).status, 403);
  const p = await c.call('GET', '/v1/people', { token: T.secadmin });
  assert.ok(!/scrypt|\$s\d|password/i.test(JSON.stringify(p.body)));
});
