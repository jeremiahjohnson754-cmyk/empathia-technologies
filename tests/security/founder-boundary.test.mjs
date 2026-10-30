/**
 * The Founder Studio boundary (ADR-0001 §3), both directions, over real HTTP and a real database:
 *   - the founder's persistent workflow works for the founder (workspace state with optimistic concurrency; decisions with
 *     revisioned, append-only transitions; every step audited);
 *   - no enterprise principal — security administrator, architect-like roles, a second tenant — can read or write founder records
 *     through any founder route, and the audit records the denial;
 *   - the founder principal cannot read enterprise records: people are refused (403), tenant-scoped lists are empty, a demo room is
 *     not found, the audit trail it may not read is refused;
 *   - a tampered token (founder subject with an enterprise tenant claim) is refused at resolution.
 *   node --test tests/security/founder-boundary.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client } from '../integration/harness.mjs';

let h, c, founder, secadmin, syseng, other, decisionId, demoRoom;
before(async () => {
  h = await setup({ db: 'empathia_test_founder', port: 4197 }); c = client(h.base);
  founder = await c.login('founder', 'empathia-founder'); secadmin = await c.login('secadmin'); syseng = await c.login('syseng'); other = await c.login('secadmin', 'second-tenant');
  const rooms = await c.call('GET', '/v1/rooms', { token: syseng }); demoRoom = rooms.body.items?.[0]?.code || rooms.body.rooms?.[0]?.code || null;
});
after(async () => { await h?.app.stop(); });

test('the founder signs in to the founder organization with only the founder authority', async () => {
  const me = await c.call('GET', '/v1/me', { token: founder });
  assert.equal(me.status, 200); assert.equal(me.body.tenant, 'empathia-founder'); assert.equal(me.body.role, 'founder');
  assert.deepEqual(me.body.authorities, ['founder.workspace']);
});
test('workspace state persists for the founder with optimistic concurrency', async () => {
  const empty = await c.call('GET', '/v1/founder/workspace', { token: founder }); assert.equal(empty.status, 200); assert.equal(empty.body.revision, 0);
  const put = await c.call('PUT', '/v1/founder/workspace', { token: founder, body: { state: { theme: 'dark', scenario: { townhall: [1, 2] }, notes: { 'build-a-room': 'synthetic note' } }, revision: 0 } });
  assert.equal(put.status, 200, JSON.stringify(put.body)); assert.equal(put.body.revision, 1);
  const stale = await c.call('PUT', '/v1/founder/workspace', { token: founder, body: { state: { theme: 'light' }, revision: 0 } }); assert.equal(stale.status, 409);
  const got = await c.call('GET', '/v1/founder/workspace', { token: founder }); assert.equal(got.body.state.notes['build-a-room'], 'synthetic note'); assert.equal(got.body.revision, 1);
});
test('a founder decision is recorded, moved through its states with rationale, and keeps every revision', async () => {
  const r = await c.call('POST', '/v1/founder/decisions', { token: founder, body: { title: 'Pilot scope: one building first', area: 'commercial', rationale: 'Bounded scope keeps the readiness report honest.', options: [{ option: 'one building' }, { option: 'one site' }] } });
  assert.equal(r.status, 201, JSON.stringify(r.body)); assert.match(r.body.code, /^FD-\d{4}$/); decisionId = r.body.id;
  const bad = await c.call('POST', `/v1/founder/decisions/${decisionId}/transition`, { token: founder, body: { to: 'REVISITED', rationale: 'cannot revisit a draft' } }); assert.equal(bad.status, 422);
  const ok = await c.call('POST', `/v1/founder/decisions/${decisionId}/transition`, { token: founder, body: { to: 'DECIDED', rationale: 'One building: the readiness report covers every room in scope.' } });
  assert.equal(ok.status, 200); assert.equal(ok.body.status, 'DECIDED'); assert.equal(ok.body.revision, 2);
  const hist = await c.call('GET', `/v1/founder/decisions/${decisionId}/history`, { token: founder }); assert.equal(hist.body.items.length, 2); assert.equal(hist.body.items[0].status, 'DRAFT'); assert.equal(hist.body.items[1].status, 'DECIDED');
  const list = await c.call('GET', '/v1/founder/decisions', { token: founder }); assert.equal(list.body.items.length, 1); assert.equal(list.body.items[0].status, 'DECIDED');
  const bad2 = await c.call('POST', `/v1/founder/decisions/${decisionId}/transition`, { token: founder, body: { to: 'DECIDED', rationale: 'again' } }); assert.equal(bad2.status, 422);
});
test('no enterprise principal reaches founder records through any founder route, and each denial is audited', async () => {
  for (const [who, tok] of [['secadmin', secadmin], ['syseng', syseng], ['second-tenant secadmin', other]]) {
    for (const [m, p, body] of [['GET', '/v1/founder/workspace'], ['PUT', '/v1/founder/workspace', { state: {}, revision: 0 }], ['GET', '/v1/founder/decisions'], ['POST', '/v1/founder/decisions', { title: 'x', area: 'product', rationale: 'x' }], ['GET', `/v1/founder/decisions/${decisionId}/history`], ['POST', `/v1/founder/decisions/${decisionId}/transition`, { to: 'WITHDRAWN', rationale: 'x' }]]) {
      const r = await c.call(m, p, { token: tok, body }); assert.equal(r.status, 403, `${who} ${m} ${p} → ${r.status}`);
    }
  }
  assert.equal((await c.call('GET', '/v1/founder/decisions')).status, 401);
  const denied = (await c.call('GET', '/v1/audit', { token: secadmin })).body.items.filter((e) => e.outcome === 'DENIED' && /founder/.test(e.action));
  assert.ok(denied.length >= 6, `denials audited: ${denied.length}`);
  const list = await c.call('GET', '/v1/founder/decisions', { token: founder }); assert.equal(list.body.items.length, 1, 'founder records unchanged by the denied attempts');
});
test('the founder principal cannot read enterprise records', async () => {
  assert.equal((await c.call('GET', '/v1/people', { token: founder })).status, 403);
  assert.equal((await c.call('GET', '/v1/audit', { token: founder })).status, 403);
  assert.equal((await c.call('GET', '/v1/admin/leads', { token: founder })).status, 403);
  const rooms = await c.call('GET', '/v1/rooms', { token: founder }); assert.equal(rooms.status, 200); assert.equal((rooms.body.items || rooms.body.rooms || []).length, 0, 'the founder tenant holds no rooms');
  const sites = await c.call('GET', '/v1/sites', { token: founder }); assert.equal(sites.status, 200); assert.equal((sites.body.items || sites.body.sites || []).length, 0);
  if (demoRoom) assert.equal((await c.call('GET', `/v1/rooms/${demoRoom}`, { token: founder })).status, 404, 'a demo room is not found from the founder organization');
  assert.equal((await c.call('POST', '/v1/rooms', { token: founder, body: { name: 'x', template: 'huddle', buildingCode: 'ATL', floor: 1 } })).status, 403);
});
test('a token that claims the founder subject in an enterprise tenant is refused', async () => {
  const forged = await c.call('POST', '/v1/auth/token', { body: { email: 'founder@empathia-founder.empathia.invalid', password: 'empathia-dev-only', tenant: 'empathia-demo', role: 'secadmin' } });
  assert.ok([401, 403, 404].includes(forged.status), `status ${forged.status}`);
});
