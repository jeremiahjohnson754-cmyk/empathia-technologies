import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EmpathiaClient, ApiProblem, OPERATIONS } from '../src/index.js';

type Seen = { url: string; init: RequestInit };
const fake = (status: number, body: unknown, seen: Seen[]) => (async (url: string | URL | Request, init?: RequestInit) => {
  seen.push({ url: String(url), init: init || {} });
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': status >= 400 ? 'application/problem+json' : 'application/json', 'x-correlation-id': 'corr-12345678' } });
}) as typeof fetch;

test('the generated operation table covers the contract (74 operations) and keeps paths and methods', () => {
  assert.equal(Object.keys(OPERATIONS).length, 74);
  assert.deepEqual(OPERATIONS.getV1RoomsRoom, { method: 'GET', path: '/v1/rooms/{room}', auth: true });
  assert.equal(OPERATIONS.getHealth.auth, false);
});

test('path parameters are encoded, query parameters added, the bearer token and idempotency key sent', async () => {
  const seen: Seen[] = [];
  const api = new EmpathiaClient({ baseUrl: 'http://api.test/', fetch: fake(200, { items: [], next: null }, seen), token: 'tok' });
  await api.call('getV1Rooms', { query: { lifecycle: 'PLANNED', limit: '5' } });
  await api.call('postV1RoomsRoomDevices', { params: { room: 'R-PLN-0001' }, body: { category: 'display' }, idempotencyKey: 'key-00000001' });
  await api.call('getV1GraphTypeId', { params: { type: 'Room', id: 'a/b' } });
  assert.equal(seen[0]!.url, 'http://api.test/v1/rooms?lifecycle=PLANNED&limit=5');
  const h = seen[1]!.init.headers as Record<string, string>;
  assert.equal(h['authorization'], 'Bearer tok');
  assert.equal(h['idempotency-key'], 'key-00000001');
  assert.equal(h['content-type'], 'application/json');
  assert.equal(seen[1]!.init.body, '{"category":"display"}');
  assert.equal(seen[2]!.url, 'http://api.test/v1/graph/Room/a%2Fb');
});

test('a problem response becomes ApiProblem with code, reasons and correlation id; 401 calls onUnauthenticated', async () => {
  let signedOut = 0;
  const api = new EmpathiaClient({ baseUrl: 'http://api.test', token: 't', onUnauthenticated: () => { signedOut += 1; }, fetch: fake(422, { code: 'rule_refused', detail: 'nope', reasons: ['a', 'b'], correlationId: 'c-1' }, []) });
  await assert.rejects(api.call('postV1RoomsRoomLifecycle', { params: { room: 'R-PLN-0001' }, body: { to: 'ACCEPTED' } }), (e: unknown) => e instanceof ApiProblem && e.status === 422 && e.code === 'rule_refused' && e.reasons.length === 2 && e.correlationId === 'c-1');
  const api2 = new EmpathiaClient({ baseUrl: 'http://api.test', token: 't', onUnauthenticated: () => { signedOut += 1; }, fetch: fake(401, { code: 'unauthenticated', detail: 'expired' }, []) });
  await assert.rejects(api2.call('getV1Me'), ApiProblem);
  assert.equal(signedOut, 1);
});

test('an authenticated operation without a token fails locally without a request', async () => {
  const seen: Seen[] = [];
  const api = new EmpathiaClient({ baseUrl: 'http://api.test', fetch: fake(200, {}, seen) });
  await assert.rejects(api.call('getV1Me'), (e: unknown) => e instanceof ApiProblem && e.status === 401);
  assert.equal(seen.length, 0);
});

test('binary evidence goes out with its media type and file name', async () => {
  const seen: Seen[] = [];
  const api = new EmpathiaClient({ baseUrl: 'http://api.test', token: 't', fetch: fake(201, { id: 'x' }, seen) });
  await api.call('postV1Evidence', { body: new TextEncoder().encode('hello'), contentType: 'text/plain', fileName: 'note.txt' });
  const h = seen[0]!.init.headers as Record<string, string>;
  assert.equal(h['content-type'], 'text/plain');
  assert.equal(h['x-file-name'], 'note.txt');
});
