import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRetry, mayWrite, type AdapterContext } from '@empathia/integration-contracts';
import { MockDeviceInventory, MockDspReadback, MockItsm, conformance } from '../src/index.js';

const ctx: AdapterContext = { tenant: 'empathia-demo', credential: null, now: () => new Date('2026-10-26T12:00:00Z'), correlationId: 'test-0001' };

test('all three mocks pass the conformance suite', async () => {
  for (const a of [new MockDeviceInventory(), new MockDspReadback(), new MockItsm()]) assert.deepEqual(await conformance(a, ctx), [], a.descriptor.key);
});

test('mocks are deterministic for a seed and paginate completely', async () => {
  const a = new MockDeviceInventory({ seed: 9, devices: 60, pageSize: 25 }); const b = new MockDeviceInventory({ seed: 9, devices: 60, pageSize: 25 });
  const all = async (m: MockDeviceInventory) => { const out = []; let c: string | null = null; do { const p = await m.discover(ctx, c); out.push(...p.items); c = p.next; } while (c); return out; };
  const x = await all(a); const y = await all(b);
  assert.equal(x.length, 60); assert.deepEqual(x, y);
  assert.ok(x.every((o) => o.evidence === 'SYNTHETIC_MOCK'));
});

test('injected faults: retryable ones are retried to success; an expired credential is not retried', async () => {
  const m = new MockDspReadback({ faults: ['timeout', 'rate_limited', 'server'] });
  const p = await withRetry(() => m.poll(ctx, null, null), { sleep: async () => {}, rnd: () => 0 });
  assert.equal(p.items.length, 16); assert.equal(m.calls, 4);
  const u = new MockDspReadback({ faults: ['unauthorized'] });
  await assert.rejects(withRetry(() => u.poll(ctx, null, null), { sleep: async () => {} }), /credential refused/);
  assert.equal(u.calls, 1);
  assert.equal((await new MockItsm({ faults: ['unauthorized'] }).health(ctx)).state, 'DOWN');
});

test('webhooks: a signed, fresh delivery is accepted; unsigned, tampered and replayed ones are refused', async () => {
  const m = new MockItsm(); const body = Buffer.from(JSON.stringify({ id: 'INC9', state: 'open', room: 'SYN-ROOM-1', summary: 'x' })); const ts = '2026-10-26T11:59:00Z';
  const ok = await m.receiveWebhook(ctx, { 'x-mock-timestamp': ts, 'x-mock-signature': m.sign(body, ts) }, body);
  assert.equal(ok[0]!.externalId, 'INC9');
  await assert.rejects(m.receiveWebhook(ctx, {}, body), /unsigned/);
  await assert.rejects(m.receiveWebhook(ctx, { 'x-mock-timestamp': ts, 'x-mock-signature': m.sign(Buffer.from('{}'), ts) }, body), /bad webhook signature/);
  const old = '2026-10-26T11:00:00Z';
  await assert.rejects(m.receiveWebhook(ctx, { 'x-mock-timestamp': old, 'x-mock-signature': m.sign(body, old) }, body), /replay/);
});

test('no mock can be written to', () => {
  for (const a of [new MockDeviceInventory(), new MockDspReadback(), new MockItsm()]) assert.ok(mayWrite(a.descriptor, { id: 'c', target: 't', action: 'a', parameters: {}, approvedBy: 'p', approverAuthority: 'baseline.approve', approvedAt: '2026-10-26T00:00:00Z', reversible: true }).length > 0);
});
