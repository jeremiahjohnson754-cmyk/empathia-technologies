import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorityFor, mayUpdateCanonical, mayWrite, dedupe, conflicts, matchCanonical, backoffMs, withRetry, TokenBucket, isStale, credentialProblems, AdapterError, type AdapterDescriptor, type Observation, type ApprovedChange } from '../src/index.js';

const desc = (key: string, o: Partial<AdapterDescriptor> = {}): AdapterDescriptor => ({ key, category: 'test', target: 'test', maturity: 'MOCK', mode: 'READ_ONLY', connection: 'NONE', capabilities: { READ: 'SUPPORTED' }, authorityFor: [], rateLimit: { requestsPerMinute: 60, burst: 5 }, auth: { kind: 'none', why: 'mock' }, ...o });
const ob = (source: string, externalId: string, at: string, value: Record<string, unknown>, canonicalId: string | null = null, kind: Observation['kind'] = 'device.inventory'): Observation => ({ source, sourceMaturity: 'MOCK', kind, externalId, canonicalId, observedAt: at, value, evidence: 'SYNTHETIC_MOCK' });
const change: ApprovedChange = { id: 'CH-1', target: 'PA-1', action: 'set', parameters: {}, approvedBy: 'p1', approverAuthority: 'baseline.approve', approvedAt: '2026-10-01T00:00:00Z', reversible: true };

test('source authority: one authority per kind; Empathia by default; two claimants is a configuration error', () => {
  const A = [desc('inv', { authorityFor: ['device.inventory'] }), desc('itsm', { authorityFor: ['ticket'] })];
  assert.equal(authorityFor('device.inventory', A), 'inv');
  assert.equal(authorityFor('commissioning.result', A), 'empathia');
  assert.ok(mayUpdateCanonical('inv', 'device.inventory', A));
  assert.ok(!mayUpdateCanonical('itsm', 'device.inventory', A));
  assert.throws(() => authorityFor('ticket', [...A, desc('itsm2', { authorityFor: ['ticket'] })]), /two adapters claim/);
});

test('writes are denied by default: MOCK, read-only, no CONTROL, no approval or the wrong authority each refuse', () => {
  assert.ok(mayWrite(desc('m'), change).length >= 2);
  const ok = desc('v', { maturity: 'VERIFIED', mode: 'READ_WRITE', capabilities: { CONTROL: 'SUPPORTED' } });
  assert.deepEqual(mayWrite(ok, change), []);
  assert.match(mayWrite(ok, null).join(), /no approved change/);
  assert.match(mayWrite(ok, { ...change, approverAuthority: 'room.design' }).join(), /control needs/);
  assert.match(mayWrite({ ...ok, mode: 'READ_ONLY' }, change).join(), /read-only/);
});

test('dedupe keeps the latest per (source, kind, externalId)', () => {
  const r = dedupe([ob('a', 'x', '2026-10-01T00:00:00Z', { v: 1 }), ob('a', 'x', '2026-10-02T00:00:00Z', { v: 2 }), ob('b', 'x', '2026-10-01T00:00:00Z', { v: 3 })]);
  assert.equal(r.kept.length, 2); assert.equal(r.dropped, 1);
  assert.equal(r.kept.find((o) => o.source === 'a')!.value['v'], 2);
});

test('conflicts are surfaced with the authority first, never merged', () => {
  const A = [desc('inv', { authorityFor: ['device.inventory'] }), desc('other')];
  const c = conflicts([ob('other', '1', '2026-10-01T00:00:00Z', { firmware: '1.0' }, 'PA-1'), ob('inv', '9', '2026-10-01T00:00:00Z', { firmware: '1.2' }, 'PA-1')], A, ['firmware']);
  assert.equal(c.length, 1); assert.equal(c[0]!.values[0]!.source, 'inv'); assert.equal(c[0]!.authority, 'inv');
  assert.equal(conflicts([ob('inv', '9', '2026-10-01T00:00:00Z', { firmware: '1.2' }, 'PA-1')], A, ['firmware']).length, 0);
});

test('canonical matching: serial or MAC only; a name is only a suggestion', () => {
  const assets = [{ id: 'PA-1', serial: 'SN-0001', mac: '00:11:22:33:44:55', label: 'Display 1' }];
  assert.deepEqual(matchCanonical(ob('a', '1', 'x', { serial: 'sn-0001' }), assets), { canonicalId: 'PA-1', how: 'serial', suggestion: null });
  assert.equal(matchCanonical(ob('a', '1', 'x', { mac: '00-11-22-33-44-55' }), assets).how, 'mac');
  assert.deepEqual(matchCanonical(ob('a', '1', 'x', { name: 'display 1' }), assets), { canonicalId: null, how: 'none', suggestion: 'PA-1' });
});

test('retries: retryable errors back off and succeed; non-retryable stop at once; Retry-After is honoured', async () => {
  const waits: number[] = []; let n = 0;
  const v = await withRetry(async () => { n += 1; if (n < 3) throw new AdapterError('rate_limited', 'slow', 2000); return 'ok'; }, { sleep: async (ms) => { waits.push(ms); }, rnd: () => 0 });
  assert.equal(v, 'ok'); assert.deepEqual(waits, [2000, 2000]);
  let m = 0;
  await assert.rejects(withRetry(async () => { m += 1; throw new AdapterError('unauthorized', 'no'); }, { sleep: async () => {} }), /no/);
  assert.equal(m, 1);
  assert.ok(backoffMs(10, () => 0.999999) <= 30000);
});

test('token bucket and staleness and credential rotation', () => {
  let t = 0; const b = new TokenBucket(60, 2, () => t);
  assert.ok(b.take()); assert.ok(b.take()); assert.ok(!b.take());
  t = 1000; assert.ok(b.take(), 'one token per second at 60/min');
  const now = new Date('2026-10-26T00:00:00Z');
  assert.ok(isStale(null, 60000, now)); assert.ok(isStale('2026-10-25T23:56:00Z', 60000, now)); assert.ok(!isStale('2026-10-25T23:58:30Z', 60000, now));
  assert.deepEqual(credentialProblems(null, 90, now), ['no credential configured']);
  assert.match(credentialProblems({ issuedAt: '2026-01-01T00:00:00Z', expiresAt: null }, 90, now).join(), /rotation policy/);
});
