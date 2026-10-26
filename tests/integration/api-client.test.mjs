/**
 * The typed client (packages/api-client) against the live starter API: the hand-written response types must describe what the
 * server actually returns (checked by key), and server refusals must surface as ApiProblem.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './harness.mjs';
import { EmpathiaClient, ApiProblem } from '@empathia/api-client';

let h, api;
before(async () => { h = await setup({ db: 'empathia_test_client', port: 4196 }); api = new EmpathiaClient({ baseUrl: h.base }); });
after(async () => { await h?.app.stop(); });

const keys = (o) => Object.keys(o).sort();

test('sign in and read the principal', async () => {
  const t = await api.signIn({ email: 'designer@empathia-demo.empathia.invalid', password: 'empathia-dev-only', tenant: 'empathia-demo', role: 'designer' });
  assert.deepEqual(keys(t), ['accessToken', 'expiresIn', 'person', 'role', 'tenant', 'tokenType']);
  const me = await api.call('getV1Me');
  assert.deepEqual(keys(me), ['authorities', 'person', 'role', 'siteScope', 'tenant']);
});

test('room list, room detail and the KPI summary have the declared shapes', async () => {
  const list = await api.call('getV1Rooms', { query: { limit: '2' } });
  assert.deepEqual(keys(list), ['items', 'next']);
  assert.deepEqual(keys(list.items[0]), ['archetype', 'building', 'code', 'lifecycle', 'name', 'occupancy', 'rev', 'template', 'updated_at']);
  assert.equal(list.next, 'R-PLN-0002');
  const d = await api.call('getV1RoomsRoom', { params: { room: 'R-PLN-0001' } });
  assert.deepEqual(keys(d), ['commissioning', 'connections', 'devices', 'drawings', 'issues', 'revisions', 'room']);
  for (const k of ['code', 'id', 'name', 'lifecycle', 'template', 'geometry', 'rev', 'classification']) assert.ok(k in d.room, `room.${k}`);
  for (const k of ['test_id', 'applicable', 'personas', 'evidence', 'result']) assert.ok(k in d.commissioning.rows[0], `row.${k}`);
  for (const k of ['code', 'severity', 'state', 'category']) assert.ok(!d.issues.length || k in d.issues[0], `issue.${k}`);
  const s = await api.call('getV1ReportsSummary');
  assert.deepEqual(keys(s), ['assets', 'commissioning', 'evidence', 'issues', 'note', 'operationalPerformance', 'rooms', 'scope', 'workOrders']);
});

test('a refusal arrives as ApiProblem with the server’s code and correlation id', async () => {
  await assert.rejects(api.call('postV1RoomsRoomLifecycle', { params: { room: 'R-PLN-0001' }, body: { to: 'DESIGN_APPROVED' } }),
    (e) => e instanceof ApiProblem && e.status === 403 && e.code === 'forbidden' && /^[\w-]{8,}$/.test(e.correlationId));
});
