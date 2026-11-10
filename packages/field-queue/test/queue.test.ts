import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, classify, counts, delayMs, drain, empty, enqueue, expectsOf, load, markSending, memoryStore, prune, ready, recover, resolve, save, settle, signedIn, standing, summary, type Entry, type NewEntry, type Queue, type Sent } from '../src/index.js';

const owner = { tenantId: 'tenant-a', personId: 'person-1', deviceId: 'device-1' };
const T0 = '2026-11-10T12:00:00.000Z'; const later = (ms: number) => new Date(Date.parse(T0) + ms).toISOString();
const key = (n: number | string) => `key-${String(n).padStart(4, '0')}-0123456789ab`;
const R1 = 'commissioning/R-ATL-4-218'; const R2 = 'job/WO-0417';
const entry = (n: number, record = R1, extra: Partial<NewEntry> = {}): NewEntry => ({ id: key(n), record, kind: 'test result', method: 'POST', path: `/v1/${record}/results`, body: { test: `T-${n}`, outcome: 'PASS' }, ...extra });
const put = (q: Queue, n: NewEntry, now = T0) => { const r = enqueue(q, n, now); assert.ok(r.ok, r.ok ? '' : r.why); return r.ok ? r.queue : q; };
const get = (q: Queue, n: number | string) => q.entries.find((e) => e.id === key(n))!;
const states = (q: Queue) => [...q.entries].sort((a, b) => a.seq - b.seq).map((e) => `${e.id.slice(4, 8)}:${e.state}`).join(' ');

test('FQ-01 a change is recorded with its key, its place in the order and the device clock; it is waiting, not sent', () => {
  const q = put(put(empty(owner), entry(1)), entry(2));
  assert.deepEqual(q.entries.map((e) => [e.seq, e.state, e.recordedAt, e.attempts]), [[1, 'WAITING', T0, 0], [2, 'WAITING', T0, 0]]);
  assert.equal(q.nextSeq, 3); assert.equal(summary(q).waiting, 2); assert.equal(summary(q).drained, false);
});
test('FQ-02 recording is refused with a reason, never trimmed: a duplicate key, a missing record, an oversized body, a full device', () => {
  const q = put(empty(owner), entry(1));
  const why = (n: NewEntry, lim = LIMITS) => { const r = enqueue(q, n, T0, lim); assert.equal(r.ok, false); return r.ok ? '' : r.why; };
  assert.match(why(entry(1)), /already recorded/);
  assert.match(why({ ...entry(2), id: 'short' }), /idempotency key/);
  assert.match(why({ ...entry(2), record: '' }), /needs the record/); assert.match(why({ ...entry(2), path: 'v1/x' }), /path/);
  assert.match(why({ ...entry(2), body: { note: 'x'.repeat(300 * 1024) } }), /larger than the device may hold/);
  assert.match(why(entry(2), { ...LIMITS, maxWaiting: 1 }), /already holds 1 changes that have not been sent/);
  assert.match(why(entry(2, R1, { after: key(99) })), /not on the device/); assert.match(why(entry(2, R2, { after: key(1) })), /same record/);
  assert.equal(q.entries.length, 1, 'a refused change leaves the queue as it was');
});
test('FQ-03 one record is sent strictly in order; different records do not wait for each other', () => {
  let q = empty(owner); for (const [n, r] of [[1, R1], [2, R1], [3, R2], [4, R1]] as const) q = put(q, entry(n, r));
  assert.deepEqual(ready(q, T0).map((e) => e.id), [key(1), key(3)]);
  q = markSending(q, key(1)); assert.deepEqual(ready(q, T0).map((e) => e.id), [key(3)], 'the second change of the record waits while the first is in flight');
  q = settle(q, key(1), { kind: 'ok', status: 201, version: '7' }, T0); assert.deepEqual(ready(q, T0).map((e) => e.id), [key(2), key(3)]);
});
test('FQ-04 an acknowledged change is SENT with the server’s version; only then does it count', () => {
  let q = put(empty(owner), entry(1)); assert.equal(counts(get(q, 1)), false); assert.match(standing(get(q, 1)), /Not sent yet/);
  q = markSending(q, key(1)); assert.equal(counts(get(q, 1)), false); assert.match(standing(get(q, 1)), /Being sent now/);
  q = settle(q, key(1), { kind: 'ok', status: 200, version: '12', body: { id: 'res-1' } }, later(500));
  const e = get(q, 1); assert.equal(e.state, 'SENT'); assert.deepEqual(e.ack, { status: 200, at: later(500), version: '12', body: { id: 'res-1' } }); assert.equal(counts(e), true); assert.equal(summary(q).drained, true);
});
test('FQ-05 nothing but SENT ever counts, and no wording before it says saved, passed or done', () => {
  for (const s of ['WAITING', 'SENDING', 'CONFLICT', 'REJECTED', 'DISCARDED'] as const) { const e = { ...get(put(empty(owner), entry(1)), 1), state: s } as Entry; assert.equal(counts(e), false, s); assert.doesNotMatch(standing(e), /\b(saved|passed|done|complete|synced)\b/i, s); }
});
test('FQ-06 no answer, a server error or "slow down" is tried again later with the same key, and the wait grows', () => {
  let q = put(empty(owner), entry(1)); const waits: number[] = [];
  for (let i = 1; i <= 5; i += 1) {
    q = markSending(q, key(1)); q = settle(q, key(1), { kind: 'retry', status: i % 2 ? null : 503, reason: 'no answer from the server' }, T0, 0.5);
    const e = get(q, 1); assert.equal(e.state, 'WAITING'); assert.equal(e.id, key(1)); assert.equal(e.attempts, i); waits.push(Date.parse(e.notBefore!) - Date.parse(T0));
    assert.deepEqual(ready(q, T0), [], 'not before its time'); assert.equal(ready(q, e.notBefore!).length, 1);
  }
  assert.deepEqual(waits, [1500, 3000, 6000, 12000, 24000]);
  assert.equal(delayMs(40, 1), LIMITS.maxDelayMs, 'capped'); assert.ok(delayMs(1, 0) >= LIMITS.baseDelayMs / 2, 'never immediate');
  assert.equal(delayMs(1, 0.5, LIMITS, 60000), 60000, 'Retry-After is a floor');
});
test('FQ-07 how a status is read: only 2xx is success; unknown statuses are retried, never taken as success', () => {
  assert.deepEqual([200, 201, 204].map((s) => classify(s)), ['ok', 'ok', 'ok']);
  assert.deepEqual([409, 412].map((s) => classify(s)), ['conflict', 'conflict']);
  assert.deepEqual([400, 403, 404, 410, 422].map((s) => classify(s)), Array(5).fill('rejected'));
  assert.equal(classify(401), 'sign-in');
  assert.deepEqual([null, 301, 302, 408, 425, 429, 500, 502, 503, 504, 599, 100, 0].map((s) => classify(s)), Array(13).fill('retry'));
});
test('FQ-08 a stale change is a CONFLICT: the server’s record is kept beside it and later changes to that record wait', () => {
  let q = put(put(put(empty(owner), entry(1, R1, { expects: '6' })), entry(2, R1)), entry(3, R2));
  q = markSending(q, key(1)); q = settle(q, key(1), { kind: 'conflict', status: 409, server: { version: '8', outcome: 'FAIL', by: 'person-2' } }, T0);
  const e = get(q, 1); assert.equal(e.state, 'CONFLICT'); assert.deepEqual(e.refusal!.server, { version: '8', outcome: 'FAIL', by: 'person-2' }); assert.deepEqual(e.body, { test: 'T-1', outcome: 'PASS' }, 'the device’s own entry is untouched');
  assert.deepEqual(ready(q, later(1e9)).map((x) => x.id), [key(3)], 'the record is held, however long; the other record still goes');
  const s = summary(q); assert.equal(s.conflicts, 1); assert.equal(s.needsPerson, 1); assert.equal(s.drained, false); assert.match(standing(e), /needs your decision/);
});
test('FQ-09 resolving a conflict by sending again makes a new entry with a new key against the server’s version, in the old one’s place', () => {
  let q = put(put(put(empty(owner), entry(1, R1, { expects: '6' })), entry(2, R1, { after: key(1) })), entry(3, R1));
  q = markSending(q, key(1)); q = settle(q, key(1), { kind: 'conflict', status: 409, server: { version: '8' } }, T0);
  assert.equal(resolve(q, key(1), { kind: 'resend', by: 'person-1', newId: key(1), expects: '8' }, T0).ok, false, 'the old key cannot be reused');
  const r = resolve(q, key(1), { kind: 'resend', by: 'person-1', newId: key('1b'), expects: '8' }, T0); assert.ok(r.ok); if (!r.ok) return; q = r.queue;
  assert.equal(get(q, 1).state, 'DISCARDED'); assert.equal(get(q, 1).discardedBy, 'person-1');
  const n = get(q, '1b'); assert.equal(n.supersedes, key(1)); assert.equal(n.expects, '8'); assert.equal(n.state, 'WAITING'); assert.equal(n.attempts, 0); assert.deepEqual(n.body, get(q, 1).body);
  assert.equal(get(q, 2).after, key('1b'), 'the change that followed it now follows the replacement');
  assert.deepEqual(ready(q, T0).map((x) => x.id), [key('1b')]);
  q = markSending(q, key('1b')); q = settle(q, key('1b'), { kind: 'ok', status: 200, version: '9' }, T0);
  assert.deepEqual(ready(q, T0).map((x) => x.id), [key(2)]); assert.equal(expectsOf(q, get(q, 2)), '9');
});
test('FQ-10 resending twice keeps the order: each replacement sits between the entry it replaces and the next one', () => {
  let q = put(put(empty(owner), entry(1, R1, { expects: '1' })), entry(2, R1));
  for (const [from, to] of [[1, 'a1'], ['a1', 'a2'], ['a2', 'a3']] as const) {
    q = markSending(q, key(from)); q = settle(q, key(from), { kind: 'conflict', status: 409 }, T0);
    const r = resolve(q, key(from), { kind: 'resend', by: 'person-1', newId: key(to), expects: '2' }, T0); assert.ok(r.ok); if (r.ok) q = r.queue;
    assert.deepEqual(ready(q, T0).map((x) => x.id), [key(to)]);
  }
  const seqs = q.entries.map((e) => e.seq); assert.equal(new Set(seqs).size, seqs.length, 'no two entries share a position'); assert.ok(get(q, 'a3').seq < get(q, 2).seq);
});
test('FQ-11 discarding is a recorded decision; changes that followed the discarded one are held, never sent as if nothing happened', () => {
  let q = put(put(put(put(empty(owner), entry(1)), entry(2, R1, { after: key(1) })), entry(3, R1, { after: key(2) })), entry(4, R1));
  q = markSending(q, key(1)); q = settle(q, key(1), { kind: 'rejected', status: 422, reason: 'the test is not part of this room’s plan' }, T0);
  assert.equal(get(q, 1).state, 'REJECTED'); assert.match(get(q, 1).refusal!.reason, /not part of this room/); assert.deepEqual(ready(q, T0), []);
  assert.equal(resolve(q, key(1), { kind: 'discard', by: '' }, T0).ok, false, 'a decision needs a person');
  const r = resolve(q, key(1), { kind: 'discard', by: 'person-1' }, later(1000)); assert.ok(r.ok); if (r.ok) q = r.queue;
  assert.equal(states(q), '0001:DISCARDED 0002:REJECTED 0003:REJECTED 0004:WAITING');
  assert.match(get(q, 3).refusal!.reason, /earlier change this one followed was discarded/);
  assert.deepEqual(ready(q, T0).map((x) => x.id), [], 'the record is still held by the changes that need a decision');
  assert.equal(resolve(q, key(4), { kind: 'discard', by: 'person-1' }, T0).ok, false, 'a waiting change is not something to resolve');
  assert.equal(enqueue(q, entry(5, R1, { after: key(1) }), T0).ok, false, 'nothing new can follow a discarded change');
});
test('FQ-12 a second step recorded on top of a first is sent against the version the first was acknowledged with', () => {
  let q = put(put(empty(owner), entry(1, R2, { expects: '3' })), entry(2, R2, { after: key(1), expects: null }));
  assert.equal(expectsOf(q, get(q, 1)), '3'); assert.equal(expectsOf(q, get(q, 2)), null, 'not known until the first is acknowledged');
  q = markSending(q, key(1)); q = settle(q, key(1), { kind: 'ok', status: 200, version: '4' }, T0); assert.equal(expectsOf(q, get(q, 2)), '4');
});
test('FQ-13 a sign-in that expired stops the whole queue without losing or failing anything; signing in resumes it', () => {
  let q = put(put(empty(owner), entry(1, R1)), entry(2, R2));
  q = markSending(q, key(1)); q = settle(q, key(1), { kind: 'sign-in', status: 401 }, T0);
  assert.equal(q.needsSignIn, true); assert.deepEqual(ready(q, later(1e9)), []); assert.equal(get(q, 1).state, 'WAITING'); assert.equal(get(q, 1).attempts, 0, 'not counted as a failed attempt'); assert.equal(summary(q).needsSignIn, true);
  q = signedIn(q); assert.deepEqual(ready(q, T0).map((e) => e.id), [key(1), key(2)]);
});
test('FQ-14 a late or repeated answer changes nothing: only an entry that is in flight can be settled', () => {
  let q = put(empty(owner), entry(1)); const before = JSON.stringify(q);
  assert.equal(JSON.stringify(settle(q, key(1), { kind: 'ok', status: 200 }, T0)), before, 'an answer for an entry that was never sent');
  q = markSending(q, key(1)); q = settle(q, key(1), { kind: 'conflict', status: 409 }, T0); const held = JSON.stringify(q);
  assert.equal(JSON.stringify(settle(q, key(1), { kind: 'ok', status: 200 }, T0)), held, 'a conflict is not turned into a success by a stray answer');
  assert.equal(JSON.stringify(settle(q, key(404), { kind: 'ok', status: 200 }, T0)), held); assert.equal(JSON.stringify(markSending(q, key(1))), held, 'a conflict is not sent again by itself');
});
test('FQ-15 after a crash mid-send the entry waits again with the same key, and says why', () => {
  let q = put(empty(owner), entry(1)); q = markSending(q, key(1)); const store = memoryStore(); save(store, q);
  const l = load(store, owner); assert.equal(l.from, 'stored'); const e = l.queue.entries[0]!;
  assert.equal(e.state, 'WAITING'); assert.equal(e.id, key(1)); assert.equal(e.attempts, 1); assert.match(e.lastError!, /sent again with the same key/);
  assert.deepEqual(recover(recover(l.queue)), l.queue);
});
test('FQ-16 a stored queue that belongs to someone else, or cannot be read, is handed back untouched and is never opened or sent', () => {
  const mine = put(empty(owner), entry(1)); const store = memoryStore(); save(store, mine);
  for (const other of [{ ...owner, personId: 'person-2' }, { ...owner, tenantId: 'tenant-b' }]) {
    const l = load(store, other); assert.equal(l.from, 'quarantined'); assert.equal(l.queue.entries.length, 0); assert.deepEqual(l.queue.owner, other);
    if (l.from === 'quarantined') { assert.equal(l.raw, store.text); assert.match(l.why, /another person or organisation/); }
  }
  for (const bad of ['{not json', '{"v":2,"entries":[]}', JSON.stringify({ ...mine, entries: [{ id: 'x' }] })]) { const l = load(memoryStore(bad), owner); assert.equal(l.from, 'quarantined'); if (l.from === 'quarantined') assert.equal(l.raw, bad); }
  assert.equal(load(memoryStore(), owner).from, 'empty'); assert.equal(load(store, { ...owner, deviceId: 'device-2' }).from, 'stored', 'the same person on a restored device keeps the queue');
});
test('FQ-17 pruning drops only settled entries the server already holds; nothing unsettled is ever pruned, however old', () => {
  let q = empty(owner); for (let n = 1; n <= 4; n += 1) q = put(q, entry(n, `rec/${n}`));
  q = markSending(q, key(1)); q = settle(q, key(1), { kind: 'ok', status: 200 }, T0);
  q = markSending(q, key(2)); q = settle(q, key(2), { kind: 'conflict', status: 409 }, T0);
  q = markSending(q, key(3)); q = settle(q, key(3), { kind: 'ok', status: 200 }, later(6 * 864e5));
  const p = prune(q, later(8 * 864e5)); assert.deepEqual(p.entries.map((e) => e.id), [key(2), key(3), key(4)]);
});

// ------------------------------------------------------------------------------------------------------------ drain
/** A server that keeps one version per record, dedupes by key, and can be told to fail. */
function server() {
  const seen = new Map<string, Sent>(); const version = new Map<string, number>(); const applied: string[] = []; const calls: string[] = [];
  const script: Array<(e: Entry) => Sent | null | 'throw'> = [];
  const send = async (e: Entry, expects: string | null): Promise<Sent> => {
    calls.push(e.id); const forced = script.length ? script.shift()!(e) : null;
    if (forced === 'throw') throw new Error('network down'); if (forced) return forced;
    if (seen.has(e.id)) return seen.get(e.id)!;   // the key was already applied: the stored answer is replayed
    const v = version.get(e.record) ?? 0;
    if (expects !== null && expects !== String(v)) return { status: 409, body: { version: String(v) }, reason: 'the record changed' };
    version.set(e.record, v + 1); applied.push(e.id); const out = { status: 200, version: String(v + 1), body: { ok: true } }; seen.set(e.id, out); return out;
  };
  return { send, applied, calls, script, version, seen };
}
const clock = () => { let t = Date.parse(T0); return { now: () => new Date(t).toISOString(), advance: (ms: number) => { t += ms; } }; };

test('FQ-18 drain sends every record’s changes in order and the queue ends drained; each change is applied exactly once', async () => {
  let q = empty(owner); for (const [n, r] of [[1, R1], [2, R2], [3, R1], [4, R1], [5, R2]] as const) q = put(q, entry(n, r));
  const s = server(); const c = clock(); q = await drain(q, s.send, { now: c.now, rand: () => 0.5 });
  assert.equal(summary(q).drained, true); assert.equal(summary(q).sent, 5);
  assert.deepEqual(s.applied.filter((id) => get(q, Number(id.slice(4, 8))).record === R1), [key(1), key(3), key(4)]); assert.deepEqual(s.applied.filter((id) => get(q, Number(id.slice(4, 8))).record === R2), [key(2), key(5)]);
  assert.equal(new Set(s.applied).size, 5);
});
test('FQ-19 an answer lost after the server applied the change is retried with the same key and is not applied twice', async () => {
  let q = put(empty(owner), entry(1)); const s = server(); const c = clock();
  // the server applies it, but the device never hears: the first call applies then reports "no answer"
  s.script.push((e) => { void s.send; s.version.set(e.record, 1); s.applied.push(e.id); s.seen.set(e.id, { status: 200, version: '1', body: { ok: true } }); return { status: null, reason: 'the connection dropped' }; });
  q = await drain(q, s.send, { now: c.now, rand: () => 0.5 });
  assert.equal(get(q, 1).state, 'WAITING'); assert.equal(counts(get(q, 1)), false, 'not counted while the outcome is unknown');
  c.advance(60_000); q = await drain(q, s.send, { now: c.now, rand: () => 0.5 });
  assert.equal(get(q, 1).state, 'SENT'); assert.deepEqual(s.calls, [key(1), key(1)]); assert.deepEqual(s.applied, [key(1)], 'applied once');
});
test('FQ-20 drain saves before every attempt and after every answer, so a crash at any point can be recovered with nothing lost', async () => {
  let q = put(put(empty(owner), entry(1, R1)), entry(2, R1)); const s = server(); const c = clock(); const store = memoryStore(); const snaps: string[] = [];
  q = await drain(q, s.send, { now: c.now, rand: () => 0.5, onChange: (x) => { save(store, x); snaps.push(states(x)); } });
  assert.deepEqual(snaps, ['0001:SENDING 0002:WAITING', '0001:SENT 0002:WAITING', '0001:SENT 0002:SENDING', '0001:SENT 0002:SENT']);
  // crash at each saved point: load, drain again, and the server has still applied each change once
  for (let cut = 0; cut < 4; cut += 1) {
    const s2 = server(); const st = memoryStore(); let n = 0; let stop = false; let q2 = put(put(empty(owner), entry(1, R1)), entry(2, R1));
    const crashing = async (e: Entry, x: string | null) => { if (stop) throw new Error('app closed'); return s2.send(e, x); };
    await drain(q2, crashing, { now: c.now, rand: () => 0.5, onChange: (x) => { if (!stop) { save(st, x); if (n === cut) stop = true; n += 1; } }, maxRounds: 3 });
    const l = load(st, owner); assert.equal(l.from, 'stored'); c.advance(10 * 60_000);
    q2 = await drain(l.queue, s2.send, { now: c.now, rand: () => 0.5 });
    assert.equal(summary(q2).drained, true, `cut ${cut}`); assert.deepEqual(s2.applied, [key(1), key(2)], `cut ${cut}: each applied once, in order`);
  }
});
test('FQ-21 drain stops a record at a conflict and carries on with the others; it stops entirely when sign-in is needed', async () => {
  let q = empty(owner); q = put(q, entry(1, R1, { expects: '5' })); q = put(q, entry(2, R1)); q = put(q, entry(3, R2)); q = put(q, entry(4, 'room/R-9'));
  const s = server(); const c = clock(); q = await drain(q, s.send, { now: c.now, rand: () => 0.5 });
  assert.equal(states(q), '0001:CONFLICT 0002:WAITING 0003:SENT 0004:SENT'); assert.deepEqual(get(q, 1).refusal!.server, { version: '0' });
  let q2 = put(put(empty(owner), entry(1, R1)), entry(2, R2)); const s2 = server(); s2.script.push(() => ({ status: 401 }));
  q2 = await drain(q2, s2.send, { now: c.now, rand: () => 0.5 }); assert.equal(q2.needsSignIn, true); assert.deepEqual(s2.calls, [key(1)], 'nothing else was sent with an expired sign-in'); assert.equal(states(q2), '0001:WAITING 0002:WAITING');
  q2 = await drain(signedIn(q2), s2.send, { now: c.now, rand: () => 0.5 }); assert.equal(summary(q2).drained, true);
});
test('FQ-22 a send that throws is "no answer": the entry waits and is retried; a long outage never ends in a success that did not happen', async () => {
  let q = put(empty(owner), entry(1)); const s = server(); const c = clock();
  for (let i = 0; i < 6; i += 1) { s.script.push(() => 'throw'); q = await drain(q, s.send, { now: c.now, rand: () => 1 }); assert.equal(get(q, 1).state, 'WAITING'); assert.equal(counts(get(q, 1)), false); c.advance(LIMITS.maxDelayMs); }
  assert.equal(get(q, 1).attempts, 6); assert.deepEqual(s.applied, []);
  q = await drain(q, s.send, { now: c.now, rand: () => 1 }); assert.equal(get(q, 1).state, 'SENT'); assert.deepEqual(s.applied, [key(1)]);
});
