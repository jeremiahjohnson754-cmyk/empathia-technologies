/**
 * Administration and the founder platform-health boundary (owner decision 2026-10-30; ADR-0006/0007), over real HTTP:
 *   - only a security administrator invites; the invitation is pinned to the administrator's tenant; the founder role cannot be
 *     granted in an enterprise tenant (EM008, audited); architect is never invited; the token is shown once and only its hash is stored;
 *   - the invitee accepts with the token once (second use refused), then signs in with the role and site scope the invitation carried;
 *   - memberships: grant/scope/revoke by the administrator, never their own; a second tenant's administrator cannot touch this tenant's people;
 *   - the policy model is readable by the administrator only and maps the 14 legacy UI roles to personas;
 *   - founder platform health: the founder reads an aggregate (no tenant data, excluded list present, audited); every enterprise role is refused.
 *   node --test tests/security/administration.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client } from '../integration/harness.mjs';

let h, c, T = {}, invite, serviceId;
before(async () => {
  h = await setup({ db: 'empathia_test_admin', port: 4195 }); c = client(h.base);
  for (const r of ['secadmin', 'service', 'syseng', 'requestor', 'opslead']) T[r] = await c.login(r);
  T.secadmin2 = await c.login('secadmin', 'second-tenant'); T.founder = await c.login('founder', 'empathia-founder');
  serviceId = h.asSuper("SELECT id FROM app.person WHERE email = 'service@empathia-demo.empathia.invalid'");
});
after(async () => { await h?.app.stop(); });

test('ADM-1 — only the security administrator invites; founder and architect roles are refused; the token is returned once and stored hashed', async () => {
  const body = { email: 'new-engineer@empathia-demo.empathia.invalid', roleKey: 'syseng', siteCodes: ['SITE-SOUTH'], days: 3 };
  assert.equal((await c.call('POST', '/v1/admin/invitations', { token: T.service, body, headers: { 'idempotency-key': 'inv-0000' } })).status, 403);
  assert.equal((await c.call('POST', '/v1/admin/invitations', { token: T.syseng, body, headers: { 'idempotency-key': 'inv-0000' } })).status, 403);
  const f = await c.call('POST', '/v1/admin/invitations', { token: T.secadmin, body: { ...body, roleKey: 'founder' }, headers: { 'idempotency-key': 'inv-0001' } });
  assert.equal(f.status, 422, JSON.stringify(f.body)); assert.match(JSON.stringify(f.body), /founder organization/);
  assert.equal((await c.call('POST', '/v1/admin/invitations', { token: T.secadmin, body: { ...body, roleKey: 'architect' }, headers: { 'idempotency-key': 'inv-0002' } })).status, 422);
  assert.equal((await c.call('POST', '/v1/admin/invitations', { token: T.secadmin, body: { ...body, siteCodes: ['SITE-X'] }, headers: { 'idempotency-key': 'inv-0003' } })).status, 400, 'another tenant’s site code is unknown here');
  const r = await c.call('POST', '/v1/admin/invitations', { token: T.secadmin, body, headers: { 'idempotency-key': 'inv-0004' } });
  assert.equal(r.status, 201, JSON.stringify(r.body)); invite = r.body;
  assert.match(invite.token, /^[A-Za-z0-9_-]{32}$/);
  assert.equal(h.asSuper(`SELECT count(*) FROM app.invitation WHERE token_hash = '${invite.token}'`), '0', 'the token itself is never stored');
  assert.equal(h.asSuper(`SELECT count(*) FROM app.invitation WHERE token_hash = encode(sha256('${invite.token}'::bytea), 'hex')`), '1');
  const list = await c.call('GET', '/v1/admin/invitations', { token: T.secadmin });
  assert.equal(list.body.items.length, 1); assert.equal(list.body.items[0].role_key, 'syseng'); assert.ok(!('token' in list.body.items[0]));
  assert.equal((await c.call('GET', '/v1/admin/invitations', { token: T.secadmin2 })).body.items.length, 0, 'the second tenant sees no invitation of this tenant');
  const denied = (await c.call('GET', '/v1/audit?limit=50', { token: T.secadmin })).body.items.find((e) => e.outcome === 'DENIED' && /EM008|founder organization/.test(JSON.stringify(e.detail)));
  assert.ok(denied, 'the founder-role refusal is audited');
});

test('ADM-2 — the invitee accepts once with the token (a wrong or reused token is refused), then signs in with the invited role and site scope', async () => {
  const accept = (token, password = 'synthetic-pass-phrase-01') => c.call('POST', '/v1/public/invitations/accept', { body: { token, displayName: 'New Engineer (synthetic)', password } });
  assert.equal((await accept('x'.repeat(32))).status, 422);
  assert.equal((await accept(invite.token, 'short')).status, 400);
  const ok = await accept(invite.token);
  assert.equal(ok.status, 200, JSON.stringify(ok.body)); assert.equal(ok.body.tenant, 'empathia-demo'); assert.equal(ok.body.role, 'syseng');
  assert.equal((await accept(invite.token)).status, 422, 'a token is accepted once');
  const signin = await c.call('POST', '/v1/auth/token', { body: { email: 'new-engineer@empathia-demo.empathia.invalid', password: 'synthetic-pass-phrase-01', tenant: 'empathia-demo', role: 'syseng' } });
  assert.equal(signin.status, 200, JSON.stringify(signin.body));
  const me = await c.call('GET', '/v1/me', { token: signin.body.accessToken });
  assert.equal(me.status, 200); assert.equal(me.body.role, 'syseng'); assert.equal(me.body.tenant, 'empathia-demo');
  assert.equal((me.body.siteScope || []).length, 1, 'scoped to the one invited site');
  const sites = await c.call('GET', '/v1/sites', { token: signin.body.accessToken });
  assert.deepEqual((sites.body.items || sites.body.sites || sites.body).map((s) => s.code), ['SITE-SOUTH']);
});

test('ADM-3 — memberships: grant and scope by the administrator; never their own; never architect; the second tenant’s administrator cannot reach this tenant’s people', async () => {
  const me = h.asSuper("SELECT id FROM app.person WHERE email = 'secadmin@empathia-demo.empathia.invalid'");
  assert.equal((await c.call('POST', '/v1/admin/memberships', { token: T.secadmin, body: { personId: me, roleKey: 'syseng' } })).status, 422, 'own membership refused');
  assert.equal((await c.call('POST', '/v1/admin/memberships', { token: T.secadmin, body: { personId: serviceId, roleKey: 'architect' } })).status, 422);
  assert.equal((await c.call('POST', '/v1/admin/memberships', { token: T.secadmin, body: { personId: serviceId, roleKey: 'founder' } })).status, 422, 'EM008');
  assert.equal((await c.call('POST', '/v1/admin/memberships', { token: T.secadmin2, body: { personId: serviceId, roleKey: 'installer' } })).status, 404, 'not a person of the second tenant');
  assert.equal((await c.call('POST', '/v1/admin/memberships', { token: T.service, body: { personId: serviceId, roleKey: 'installer' } })).status, 403);
  const g = await c.call('POST', '/v1/admin/memberships', { token: T.secadmin, body: { personId: serviceId, roleKey: 'installer', siteCodes: ['SITE-NORTH'] } });
  assert.equal(g.status, 200, JSON.stringify(g.body));
  const si = await c.call('POST', '/v1/auth/token', { body: { email: 'service@empathia-demo.empathia.invalid', password: 'empathia-dev-only', tenant: 'empathia-demo', role: 'installer' } });
  assert.equal(si.status, 200, JSON.stringify(si.body));
  const sites = await c.call('GET', '/v1/sites', { token: si.body.accessToken });
  assert.deepEqual((sites.body.items || sites.body.sites || sites.body).map((s) => s.code), ['SITE-NORTH']);
  assert.equal((await c.call('POST', '/v1/admin/memberships/revoke', { token: T.secadmin, body: { personId: serviceId, roleKey: 'installer' } })).status, 200);
  assert.equal((await c.call('POST', '/v1/admin/memberships/revoke', { token: T.secadmin, body: { personId: serviceId, roleKey: 'installer' } })).status, 404, 'already revoked');
  assert.equal((await c.call('POST', '/v1/auth/token', { body: { email: 'service@empathia-demo.empathia.invalid', password: 'empathia-dev-only', tenant: 'empathia-demo', role: 'installer' } })).status, 403, 'a revoked membership no longer signs in (the account exists; the membership is gone)');
  assert.equal((await c.call('GET', '/v1/me', { token: T.service })).status, 200, 'the technician’s own role is untouched');
});

test('ADM-4 — the policy model: 22 personas with authorities, 14 UI roles mapped to personas (a view preference), separation-of-duties rules; administrator only', async () => {
  assert.equal((await c.call('GET', '/v1/admin/policy', { token: T.syseng })).status, 403);
  const p = await c.call('GET', '/v1/admin/policy', { token: T.secadmin });
  assert.equal(p.status, 200);
  assert.ok(p.body.personas.length >= 22, `${p.body.personas.length} personas`);
  assert.equal(p.body.uiRoles.length, 14);
  assert.ok(p.body.uiRoles.every((u) => p.body.personas.some((x) => x.key === u.persona)), 'every UI role maps to a persona that exists');
  assert.ok(p.body.separationOfDuties.length >= 6);
  assert.equal(p.body.delegation.maxDays, 90);
});

test('FH-1 — founder platform health: the founder reads aggregate platform state only; every enterprise role is refused; the read is audited', async () => {
  for (const r of ['secadmin', 'syseng', 'service', 'requestor', 'opslead', 'secadmin2']) assert.equal((await c.call('GET', '/v1/founder/platform-health', { token: T[r] })).status, 403, r);
  const r = await c.call('GET', '/v1/founder/platform-health', { token: T.founder });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.classification, 'CONFIDENTIAL_TECHNICAL');
  assert.ok(Array.isArray(r.body.excluded) && r.body.excluded.includes('customer records'));
  assert.ok('available' in r.body.tests, 'the test evidence says whether it is available rather than fabricating a pass');
  assert.ok(r.body.service.database, 'service health present');
  const text = JSON.stringify(r.body);
  for (const leak of ['R-PLN-', 'empathia-demo', 'SITE-', 'second-tenant', '@empathia-demo']) assert.ok(!text.includes(leak), `no tenant data: ${leak}`);
  const row = h.asSuper("SELECT count(*) FROM app.audit_event WHERE action = 'founder.platform_health_read' AND outcome = 'ALLOWED'");
  assert.equal(row, '1');
});
