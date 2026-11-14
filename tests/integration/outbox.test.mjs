/**
 * Outbox delivery guarantees — the owner's four validation requirements, against a real PostgreSQL 16 and real worker processes:
 *   1. duplicate delivery after a worker crash: a real worker child is killed with SIGKILL at a controlled point. Internal effects
 *      (read model, notifications) apply exactly once; an effect outside the database is delivered at least once and deduplicated by
 *      the consumer on an idempotency key derived from the event id, with a per-(event, handler) delivery receipt; no external call is
 *      made while the worker holds a database transaction. The external consumer is the LOCAL STUB SINK (tests/integration/
 *      outbox-stub-sink.mjs) — no real Teams/Outlook connector exists, so real-connector idempotency is NOT RUN;
 *   2. event ordering per aggregate (room) with three concurrent workers, through retries and dead letters (later events are held);
 *   3. cross-tenant isolation: tenant context per event, writes confined to the event's tenant, admin access, payloads;
 *   4. controlled dead-letter replay: security admin only, a reason, 409 unless dead-lettered, no double delivery, audited in the
 *      Evidence Ledger (who, when, why, prior attempts, last error, outcome) with /v1/audit/integrity still verifying.
 * Fault injection is test-only: tests/integration/outbox-worker-child.mjs (gated by EMPATHIA_OUTBOX_FAULT_INJECTION=test-only and an
 * empathia_test_* database). Synthetic data only. API on 127.0.0.1:4310, local stub sink on 127.0.0.1:4311, database empathia_test_outbox_main.
 *   node --test tests/integration/outbox.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { setup, client, repo, registerRoom } from './harness.mjs';
import { startLocalStubSink, localStubSinkAdapter, STUB_LABEL } from './outbox-stub-sink.mjs';

const DB = 'empathia_test_outbox_main';
const API_PORT = 4310; const STUB_PORT = 4311;
const api = path.join(repo, 'services/enterprise-api/dist/src');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let h, c, su, stub, PgPool, configFromUrl, outbox;
const T = {}; const TID = {}; const pools = [];

/** SQL as the database superuser (bypasses RLS): observation of what the API and the worker roles cannot see. */
const q = async (text, params = []) => (await su.query(text, params)).rows;
const one = async (text, params = []) => (await q(text, params))[0];

before(async () => {
  h = await setup({ db: DB, port: API_PORT });
  c = client(h.base);
  ({ PgPool, configFromUrl } = await import(path.join(api, 'db/pg.js')));
  outbox = await import(path.join(api, 'worker/outbox.js'));
  const { PgConnection } = await import(path.join(api, 'db/pg.js'));
  su = new PgConnection({ host: '127.0.0.1', port: h.creds.port, user: h.creds.superuser, password: h.creds.superPassword, database: DB }); await su.connect();
  for (const r of ['secadmin', 'designer', 'steward', 'opslead', 'syseng', 'installer', 'cxeng', 'svcmgr', 'service']) T[r] = await c.login(r);
  T.otherSec = await c.login('secadmin', 'second-tenant');
  T.otherDesigner = await c.login('designer', 'second-tenant');
  for (const slug of ['empathia-demo', 'second-tenant']) TID[slug] = (await one('SELECT id FROM app.tenant WHERE slug = $1', [slug])).id;
  // the stub inspects the database at the moment of every call: is the calling worker inside a transaction, and has every earlier
  // event of the same aggregate already been delivered (committed)? "Earlier" is the commit order the database assigned (aggregate_seq,
  // migration 0027) — the order delivery follows (D-37); the earlier comparison of the producer's aggregate_rev is kept beside it
  stub = await startLocalStubSink({
    port: STUB_PORT,
    inspect: async (call) => {
      const tx = await one('SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name = $1 AND xact_start IS NOT NULL', [call.workerApplication]);
      const a = call.body?.aggregate || {};
      const seq = await one('SELECT aggregate_seq FROM app.outbox_event WHERE id = $1', [call.body?.eventId]);
      const earlier = await one("SELECT count(*)::int AS n FROM app.outbox_event WHERE tenant_id = $1 AND aggregate_type = $2 AND aggregate_id = $3 AND aggregate_seq < $4 AND status <> 'DELIVERED'", [call.body?.tenantId, a.type, a.id, seq?.aggregate_seq]);
      const earlierRev = await one("SELECT count(*)::int AS n FROM app.outbox_event WHERE tenant_id = $1 AND aggregate_type = $2 AND aggregate_id = $3 AND aggregate_rev < $4 AND status <> 'DELIVERED'", [call.body?.tenantId, a.type, a.id, a.rev]);
      return { workerInTransaction: tx.n > 0, earlierUndelivered: earlier.n, earlierRevUndelivered: earlierRev.n, seq: seq ? Number(seq.aggregate_seq) : null };
    },
  });
  await h.drain();
});
after(async () => {
  await stub?.close();
  for (const p of pools) await p.end();
  await su?.end();
  await h?.app.stop();
});

/** A worker with its own pool and application_name (several workers = several connections = real concurrency in the database). */
function worker(app, handlers = [outbox.readModelHandler, outbox.notificationHandler], options = {}) {
  const pool = new PgPool({ ...configFromUrl(h.urls.WORKER_DATABASE_URL), applicationName: app }, 2); pools.push(pool);
  return new outbox.OutboxWorker(pool, handlers, 3600000, { workerId: app, ...options });
}
const named = (name, fn) => Object.defineProperty(fn, 'name', { value: name });

/** Insert synthetic outbox events (as the superuser, as ctx.emit would inside a business transaction). Returns their ids in input order. */
async function insertEvents(rows) {
  const ids = [];
  for (const r of rows) {
    const id = crypto.randomUUID(); ids.push(id);
    await q(`INSERT INTO app.outbox_event (id, tenant_id, type, schema_version, aggregate_type, aggregate_id, aggregate_rev, payload, correlation_id, occurred_at)
             VALUES ($1, $2, $3, $10, $4, $5, $6, $7, $8, coalesce($9::timestamptz, now()))`,
    [id, r.tenant ?? TID['empathia-demo'], r.type ?? 'room.geometry_updated', r.aggType ?? 'Room', r.aggId, r.rev, JSON.stringify(r.payload ?? { designId: r.aggId, fields: ['synthetic'] }), `outbox-test-${crypto.randomUUID()}`, r.at ?? null, r.schema ?? '1.0.0']);
  }
  return ids;
}
/** Real rooms (created through the API, so they exist in the tenant) for events that concern a room. */
async function makeRooms(n, token = T.designer, buildingCode = 'NST') {
  const codes = [];
  for (let i = 0; i < n; i += 1) {
    const r = await c.call('POST', '/v1/rooms', { token, body: { name: `Outbox Test Room ${crypto.randomUUID().slice(0, 8)} (synthetic)`, template: 'huddle', buildingCode, floor: 1 } });
    assert.equal(r.status, 201, JSON.stringify(r.body)); codes.push(r.body.code);
  }
  await h.drain();
  return codes;
}
const statusOf = async (id) => one('SELECT status, attempts, last_error FROM app.outbox_event WHERE id = $1', [id]);
async function drainWith(w, max = 200) { let n = 0; for (let i = 0; i < max; i += 1) { const k = await w.tick(); n += k; if (!k) break; } return n; }
/** Fail every attempt of the given events (test-only failing handler) until they dead-letter. */
async function deadLetter(ids, why = 'injected handler failure (outbox test)') {
  const bad = worker(`outbox-test-bad-${crypto.randomUUID().slice(0, 8)}`, [named('test-always-fails', async (_q, e) => { if (ids.includes(e.id)) throw new Error(why); }), outbox.readModelHandler, outbox.notificationHandler]);
  for (let i = 0; i < outbox.MAX_ATTEMPTS + 2; i += 1) { await bad.tick(); await q("UPDATE app.outbox_event SET next_attempt_at = now() WHERE status = 'PENDING' AND id = ANY($1::uuid[])", [ids]); }
  for (const id of ids) assert.equal((await statusOf(id)).status, 'DEAD_LETTER', `event ${id} dead-lettered`);
}

/** Start the test-only worker child and wait for a marker line. */
function child(mode, app, extra = {}) {
  const p = spawn(process.execPath, [path.join(repo, 'tests/integration/outbox-worker-child.mjs')], {
    env: { ...process.env, EMPATHIA_OUTBOX_FAULT_INJECTION: 'test-only', OUTBOX_CHILD_DB_URL: h.urls.WORKER_DATABASE_URL, OUTBOX_CHILD_APP: app, OUTBOX_CHILD_MODE: mode, OUTBOX_STUB_URL: stub.url, LOG_LEVEL: 'error', ...extra },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const lines = []; let buf = ''; let err = ''; let exit = null;
  p.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { lines.push(buf.slice(0, i)); buf = buf.slice(i + 1); } });
  p.stderr.on('data', (d) => { err += d; });
  const exited = new Promise((ok) => p.once('exit', (code, signal) => { exit = { code, signal }; ok(exit); }));
  const waitFor = async (re, ms = 15000) => {
    const t0 = Date.now();
    for (;;) {
      const hit = lines.find((l) => re.test(l)); if (hit) return hit;
      const done = lines.find((l) => /^TICK_DONE/.test(l));
      if (done) throw new Error(`the worker finished its tick (${done}) without reaching the fault point ${re}; stdout=${JSON.stringify(lines)} stderr=${err.slice(-800)}`);
      if (exit) throw new Error(`the worker child exited (${JSON.stringify(exit)}) before ${re}; stderr=${err.slice(-800)}`);
      if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${re}; stdout=${JSON.stringify(lines)} stderr=${err.slice(-800)}`);
      await sleep(20);
    }
  };
  const kill = async () => { if (!exit) p.kill('SIGKILL'); const e = await exited; for (let i = 0; i < 250; i += 1) { if ((await one('SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name = $1', [app])).n === 0) break; await sleep(20); } return e; };
  return { pid: p.pid, waitFor, kill, exited, stderr: () => err };
}

// ================================================================================================ 1. duplicate delivery after a crash
test('crash: a worker SIGKILLed inside the delivery transaction leaves no internal effect; the redelivery applies it exactly once', { timeout: 60000 }, async () => {
  const before = await one("SELECT m.rebuilt_at FROM app.room_read_model m JOIN app.room r ON r.id = m.room_id WHERE r.code = 'R-PLN-0001' AND r.tenant_id = $1", [TID['empathia-demo']]);
  const [id] = await insertEvents([{ type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-CRASH-1', rev: 1, payload: { issueId: 'ISS-SYN-CRASH-1', owner: 'opslead', roomId: 'R-PLN-0001' } }]);
  const app = 'outbox-test-child-in-tx';
  const k = child('pause-in-tx', app);
  try {
    assert.equal(await k.waitFor(/^PAUSED_IN_TX /), `PAUSED_IN_TX ${id}`);
    const s = await q('SELECT state FROM pg_stat_activity WHERE application_name = $1 AND xact_start IS NOT NULL', [app]);
    assert.ok(s.some((x) => x.state === 'idle in transaction'), `the child is inside its delivery transaction (${JSON.stringify(s)})`);
    assert.equal((await one('SELECT count(*)::int AS n FROM app.notification WHERE event_id = $1', [id])).n, 0, 'nothing is visible before COMMIT');
  } finally { assert.equal((await k.kill()).signal, 'SIGKILL'); }
  // after the crash: the transaction rolled back as a whole
  assert.deepEqual(await statusOf(id), { status: 'PENDING', attempts: 0, last_error: null });
  assert.equal((await one('SELECT count(*)::int AS n FROM app.notification WHERE event_id = $1', [id])).n, 0, 'no notification from the killed delivery');
  const mid = await one("SELECT m.rebuilt_at FROM app.room_read_model m JOIN app.room r ON r.id = m.room_id WHERE r.code = 'R-PLN-0001' AND r.tenant_id = $1", [TID['empathia-demo']]);
  assert.equal(mid?.rebuilt_at, before?.rebuilt_at, 'the read model was not touched by the killed delivery');
  // a fresh worker redelivers: exactly one notification, the read model rebuilt, the event delivered on its first counted attempt
  await drainWith(worker('outbox-test-redeliver-1'));
  assert.equal((await statusOf(id)).status, 'DELIVERED');
  assert.equal((await statusOf(id)).attempts, 1);
  assert.equal((await one('SELECT count(*)::int AS n FROM app.notification WHERE event_id = $1', [id])).n, 1, 'exactly one notification');
  const after = await one("SELECT m.rebuilt_at FROM app.room_read_model m JOIN app.room r ON r.id = m.room_id WHERE r.code = 'R-PLN-0001' AND r.tenant_id = $1", [TID['empathia-demo']]);
  assert.notEqual(after.rebuilt_at, before?.rebuilt_at, 'the read model was rebuilt by the redelivery');
  await drainWith(worker('outbox-test-redeliver-1b'));
  assert.equal((await one('SELECT count(*)::int AS n FROM app.notification WHERE event_id = $1', [id])).n, 1, 'still exactly one after another drain');
});

test(`crash: SIGKILL after the external effect and before its receipt — the redelivery reuses the idempotency key and the ${STUB_LABEL} applies the effect once; no external call inside a transaction`, { timeout: 60000 }, async () => {
  stub.reset();
  const [id] = await insertEvents([{ type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-CRASH-2', rev: 1, payload: { issueId: 'ISS-SYN-CRASH-2', owner: 'cxeng', roomId: 'R-PLN-0001' } }]);
  const app = 'outbox-test-child-external';
  const leaseMs = 4000;
  const k = child('pause-after-external', app, { OUTBOX_CHILD_LEASE_MS: String(leaseMs), OUTBOX_CHILD_EXTERNAL_TIMEOUT_MS: '1000' });
  let marker;
  try { marker = await k.waitFor(/^EXTERNAL_DONE /); } finally { assert.equal((await k.kill()).signal, 'SIGKILL'); }
  const key = marker.split(' ')[2];
  assert.equal(marker.split(' ')[1], id);
  assert.ok(key.includes(id), `the idempotency key is derived from the event id (${key})`);
  assert.equal(stub.calls.length, 1); assert.equal(stub.effects.size, 1);
  assert.equal(stub.calls[0].key, key);
  assert.equal(stub.calls[0].workerInTransaction, false, 'the external call was made outside any database transaction');
  // the internal effects committed before the external call; the event is not delivered until the external receipt exists
  assert.equal((await one('SELECT count(*)::int AS n FROM app.notification WHERE event_id = $1', [id])).n, 1);
  assert.equal((await statusOf(id)).status, 'PENDING', 'not DELIVERED: the external receipt was never recorded');
  const receipts = async () => q('SELECT kind, handler, idempotency_key, delivered_at FROM app.outbox_delivery WHERE event_id = $1 ORDER BY kind, handler', [id]);
  const r1 = await receipts();
  assert.deepEqual(r1.map((r) => `${r.kind}:${r.handler}`), ['INTERNAL:notificationHandler', 'INTERNAL:readModelHandler']);
  const rm1 = await one("SELECT m.rebuilt_at FROM app.room_read_model m JOIN app.room r ON r.id = m.room_id WHERE r.code = 'R-PLN-0001' AND r.tenant_id = $1", [TID['empathia-demo']]);

  const wApp = 'outbox-test-redeliver-2';
  const w = worker(wApp, undefined, { externalSinks: [localStubSinkAdapter({ url: stub.url, workerApplication: wApp })], leaseMs: 5000, externalTimeoutMs: 2000 });
  await drainWith(w);
  assert.equal(stub.calls.length, 1, 'the dead worker\'s lease is respected: no redelivery before it expires');
  await sleep(leaseMs + 300);
  await drainWith(w);
  assert.equal(stub.calls.length, 2, 'at-least-once: the external call is repeated after the crash');
  assert.equal(stub.calls[1].key, key, 'with the same idempotency key');
  assert.equal(stub.effects.size, 1, `the ${STUB_LABEL} deduplicated it: one effect`);
  assert.ok(stub.calls.every((x) => x.workerInTransaction === false), 'no external call was made inside a database transaction');
  assert.equal((await statusOf(id)).status, 'DELIVERED');
  assert.equal((await one('SELECT count(*)::int AS n FROM app.notification WHERE event_id = $1', [id])).n, 1, 'internal effects still exactly once');
  const rm2 = await one("SELECT m.rebuilt_at FROM app.room_read_model m JOIN app.room r ON r.id = m.room_id WHERE r.code = 'R-PLN-0001' AND r.tenant_id = $1", [TID['empathia-demo']]);
  assert.equal(rm2.rebuilt_at, rm1.rebuilt_at, 'the internal handlers did not run again (their receipts were found)');
  const r2 = await receipts();
  assert.deepEqual(r2.map((r) => `${r.kind}:${r.handler}`), ['EXTERNAL:local-stub-sink', 'INTERNAL:notificationHandler', 'INTERNAL:readModelHandler']);
  assert.equal(r2.find((r) => r.kind === 'EXTERNAL').idempotency_key, key);
  for (const r of r1) assert.equal(r2.find((x) => x.handler === r.handler).delivered_at, r.delivered_at, 'internal receipts unchanged');
  await drainWith(w);
  assert.equal(stub.calls.length, 2, 'the receipt stops any further call');
  // receipts are tenant data: the other tenant cannot see them
  const k2 = await h.appConn();
  try { await k2.query("SELECT set_config('app.tenant_id', $1, false)", [TID['second-tenant']]); assert.equal((await k2.query('SELECT count(*)::int AS n FROM app.outbox_delivery')).rows[0].n, 0); } finally { await k2.end(); }
});

// ================================================================================================ 2. ordering per aggregate
test('ordering: three concurrent workers deliver each room\'s events in commit order (aggregate_seq; here also aggregate_rev order); different rooms flow in parallel', { timeout: 60000 }, async () => {
  const rooms = await makeRooms(6);
  const t0 = Date.now() - 60000;
  const rows = [];
  for (let rev = 1; rev <= 8; rev += 1) for (const [i, r] of rooms.entries()) rows.push({ aggId: r, rev, at: new Date(t0 + rev * 1000 + i).toISOString() });
  const ids = await insertEvents(rows);
  const seen = []; const violations = []; const revViolations = [];
  // D-37: "earlier" is the commit order the database assigned (aggregate_seq, the order delivery follows); the producer's rev is checked beside it
  const probe = (who) => named('test-order-probe', async (qq, e) => {
    if (!rooms.includes(e.aggregate_id)) return;
    await sleep(Math.random() * 6);
    const seq = Number((await qq.query('SELECT aggregate_seq FROM app.outbox_event WHERE id = $1', [e.id])).rows[0].aggregate_seq);
    const n = (await qq.query("SELECT count(*)::int AS n FROM app.outbox_event WHERE tenant_id = $1 AND aggregate_type = $2 AND aggregate_id = $3 AND aggregate_seq < $4 AND status <> 'DELIVERED'", [e.tenant_id, e.aggregate_type, e.aggregate_id, seq])).rows[0].n;
    if (n) violations.push(`${who}: ${e.aggregate_id} seq ${seq} (rev ${e.aggregate_rev}) handled while ${n} event(s) committed before it were not delivered`);
    const nRev = (await qq.query("SELECT count(*)::int AS n FROM app.outbox_event WHERE tenant_id = $1 AND aggregate_type = $2 AND aggregate_id = $3 AND aggregate_rev < $4 AND status <> 'DELIVERED'", [e.tenant_id, e.aggregate_type, e.aggregate_id, e.aggregate_rev])).rows[0].n;
    if (nRev) revViolations.push(`${who}: ${e.aggregate_id} rev ${e.aggregate_rev} handled while ${nRev} earlier rev(s) were not delivered`);
    seen.push({ who, room: e.aggregate_id, rev: e.aggregate_rev, seq });
  });
  const ws = ['a', 'b', 'c'].map((x) => ({ x, w: worker(`outbox-test-order-${x}`, [outbox.readModelHandler, outbox.notificationHandler, probe(x)]) }));
  const deadline = Date.now() + 40000;
  const left = async () => (await one("SELECT count(*)::int AS n FROM app.outbox_event WHERE id = ANY($1::uuid[]) AND status <> 'DELIVERED'", [ids])).n;
  await Promise.all(ws.map(async ({ w }) => { while (Date.now() < deadline && (await left()) > 0) { if (!(await w.tick(4))) await sleep(3); } }));
  assert.equal(await left(), 0, 'every event delivered');
  assert.deepEqual(violations, [], 'no event was handled before every event committed before it (aggregate_seq) was delivered');
  assert.deepEqual(revViolations, [], 'no later rev was handled before an earlier one was delivered');
  for (const r of rooms) assert.deepEqual(seen.filter((s) => s.room === r).map((s) => s.rev), [1, 2, 3, 4, 5, 6, 7, 8], `${r} in rev order, each once`);
  for (const r of rooms) {
    const handled = seen.filter((s) => s.room === r).map((s) => s.seq);
    const committed = (await q("SELECT aggregate_seq FROM app.outbox_event WHERE tenant_id = $1 AND aggregate_type = 'Room' AND aggregate_id = $2 AND id = ANY($3::uuid[]) ORDER BY aggregate_seq", [TID['empathia-demo'], r, ids])).map((x) => Number(x.aggregate_seq));
    assert.deepEqual(handled, committed, `${r}: handled in commit order (aggregate_seq ${committed.join(', ')}), each once`);
  }
  const by = new Set(seen.map((s) => s.who));
  assert.ok(by.size >= 2, `the work was shared by several workers in parallel (${[...by].join(',')})`);
});

test(`ordering: effects outside the database (${STUB_LABEL}) leave in commit order (aggregate_seq; here also aggregate_rev order), one at a time per room, never inside a transaction`, { timeout: 60000 }, async () => {
  stub.reset();
  const rooms = await makeRooms(4);
  const t0 = Date.now() - 60000;
  const rows = [];
  for (let rev = 1; rev <= 5; rev += 1) for (const [i, r] of rooms.entries()) rows.push({ aggId: r, rev, at: new Date(t0 + rev * 1000 + i).toISOString() });
  const ids = await insertEvents(rows);
  const ws = ['a', 'b', 'c'].map((x) => { const app = `outbox-test-ext-${x}`; return worker(app, undefined, { externalSinks: [localStubSinkAdapter({ url: stub.url, workerApplication: app, accepts: (e) => ids.includes(e.id) })] }); });
  const deadline = Date.now() + 40000;
  const left = async () => (await one("SELECT count(*)::int AS n FROM app.outbox_event WHERE id = ANY($1::uuid[]) AND status <> 'DELIVERED'", [ids])).n;
  await Promise.all(ws.map(async (w) => { while (Date.now() < deadline && (await left()) > 0) { if (!(await w.tick(4))) await sleep(3); } }));
  assert.equal(await left(), 0, 'every event delivered');
  assert.equal(stub.effects.size, ids.length, 'one effect per event');
  for (const r of rooms) assert.deepEqual(stub.calls.filter((x) => x.body.aggregate.id === r).map((x) => x.body.aggregate.rev), [1, 2, 3, 4, 5], `${r}: external calls in rev order`);
  assert.deepEqual(stub.calls.filter((x) => x.earlierUndelivered > 0).map((x) => `${x.body.aggregate.id}#seq${x.seq}`), [], 'no call while an event of the room committed before it (aggregate_seq) was undelivered');
  assert.deepEqual(stub.calls.filter((x) => x.earlierRevUndelivered > 0).map((x) => `${x.body.aggregate.id}#${x.body.aggregate.rev}`), [], 'no call while an earlier rev of the room was undelivered');
  for (const r of rooms) { const s = stub.calls.filter((x) => x.body.aggregate.id === r).map((x) => x.seq); assert.ok(s.every((v, i) => Number.isFinite(v) && (i === 0 || v > s[i - 1])), `${r}: external calls in commit order (aggregate_seq ${s.join(', ')})`); }
  assert.deepEqual(stub.calls.filter((x) => x.workerInTransaction), [], 'no external call inside a database transaction');
  assert.ok(new Set(stub.calls.map((x) => x.workerApplication)).size >= 2, 'several workers delivered in parallel');
});

test('ordering: a later rev never overtakes an earlier one that is retrying or dead-lettered; other rooms keep flowing; a replay releases the held events in order', { timeout: 60000 }, async () => {
  const [HOLD, FREE] = await makeRooms(2);
  const t0 = Date.now() - 60000;
  const ids = await insertEvents([1, 2, 3].flatMap((rev) => [{ aggId: HOLD, rev, at: new Date(t0 + rev * 1000).toISOString() }, { aggId: FREE, rev, at: new Date(t0 + rev * 1000 + 1).toISOString() }]));
  const hold = ids.filter((_, i) => i % 2 === 0); const free = ids.filter((_, i) => i % 2 === 1);
  let failing = true; const handled = [];
  const flaky = named('test-flaky-handler', async (_q, e) => {
    if (!ids.includes(e.id)) return;
    if (failing && e.id === hold[0]) throw new Error(`injected failure of ${HOLD} rev 1 (outbox test)`);
    handled.push(`${e.aggregate_id}#${e.aggregate_rev}`);
  });
  const w = worker('outbox-test-hold', [outbox.readModelHandler, outbox.notificationHandler, flaky]);
  const heldOk = async (when) => { for (const id of hold.slice(1)) assert.deepEqual(await statusOf(id), { status: 'PENDING', attempts: 0, last_error: null }, `${when}: a later rev is held, never attempted`); };
  await drainWith(w);
  assert.equal((await statusOf(hold[0])).status, 'PENDING'); assert.equal((await statusOf(hold[0])).attempts, 1);
  await heldOk('while rev 1 waits for its retry');
  for (const id of free) assert.equal((await statusOf(id)).status, 'DELIVERED', 'another room is not blocked');
  await q('UPDATE app.outbox_event SET next_attempt_at = now() WHERE id = ANY($1::uuid[])', [hold]);
  await drainWith(w);
  assert.equal((await statusOf(hold[0])).attempts, 2);
  await heldOk('while rev 1 is retrying');
  await q('UPDATE app.outbox_event SET attempts = $2, next_attempt_at = now() WHERE id = $1', [hold[0], outbox.MAX_ATTEMPTS - 1]);
  await drainWith(w);
  assert.equal((await statusOf(hold[0])).status, 'DEAD_LETTER');
  for (let i = 0; i < 3; i += 1) { await q('UPDATE app.outbox_event SET next_attempt_at = now() WHERE id = ANY($1::uuid[])', [hold]); await drainWith(w); }
  await heldOk('while rev 1 is dead-lettered');
  assert.deepEqual(handled.filter((x) => x.startsWith(`${HOLD}#`)), [], 'no event of the held room was handled');
  assert.deepEqual(handled.filter((x) => x.startsWith(`${FREE}#`)), [`${FREE}#1`, `${FREE}#2`, `${FREE}#3`]);
  // the security admin sees the dead letter and the held events, fixes the cause and replays: rev 1, 2, 3 in order
  const dl = await c.call('GET', '/v1/admin/outbox?status=DEAD_LETTER', { token: T.secadmin });
  assert.ok(dl.body.items.some((x) => x.id === hold[0]));
  const pend = await c.call('GET', '/v1/admin/outbox?status=PENDING', { token: T.secadmin });
  for (const id of hold.slice(1)) assert.ok(pend.body.items.some((x) => x.id === id), 'held events are visible as PENDING');
  failing = false;
  const r = await c.call('POST', `/v1/admin/outbox/${hold[0]}/retry`, { token: T.secadmin, body: { reason: 'synthetic: the flaky handler was fixed (outbox ordering test)' } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  await drainWith(w);
  assert.deepEqual(handled.filter((x) => x.startsWith(`${HOLD}#`)), [`${HOLD}#1`, `${HOLD}#2`, `${HOLD}#3`]);
  for (const id of hold) assert.equal((await statusOf(id)).status, 'DELIVERED');
});

// ================================================================================================ 3. cross-tenant isolation
test('tenancy: every event is handled under its own tenant\'s context, and its notifications land in that tenant', { timeout: 60000 }, async () => {
  const A = TID['empathia-demo']; const B = TID['second-tenant'];
  const rows = [];
  for (let i = 1; i <= 4; i += 1) {
    rows.push({ tenant: A, type: 'issue.assigned', aggType: 'RoomIssue', aggId: `ISS-SYN-TEN-A-${i}`, rev: 1, payload: { issueId: `ISS-SYN-TEN-A-${i}`, owner: 'opslead', marker: 'tenant-A' } });
    rows.push({ tenant: B, type: 'issue.assigned', aggType: 'RoomIssue', aggId: `ISS-SYN-TEN-B-${i}`, rev: 1, payload: { issueId: `ISS-SYN-TEN-B-${i}`, owner: 'syseng', marker: 'tenant-B' } });
  }
  const ids = await insertEvents(rows);
  const ctx = [];
  const ctxProbe = named('test-tenant-context-probe', async (qq, e) => { if (ids.includes(e.id)) ctx.push({ id: e.id, tenant: e.tenant_id, setting: (await qq.query("SELECT coalesce(current_setting('app.tenant_id', true), '') AS t")).rows[0].t }); });
  await drainWith(worker('outbox-test-tenancy', [ctxProbe, outbox.readModelHandler, outbox.notificationHandler]));
  assert.equal(ctx.length, ids.length);
  assert.deepEqual(ctx.filter((x) => x.setting !== x.tenant), [], 'each handler ran with app.tenant_id = the event\'s tenant');
  for (const [i, id] of ids.entries()) {
    const n = await q('SELECT tenant_id FROM app.notification WHERE event_id = $1', [id]);
    assert.deepEqual(n.map((x) => x.tenant_id), [rows[i].tenant], 'one notification, in the event\'s own tenant');
  }
});

test('tenancy: a handler cannot write into another tenant — the database refuses it under the event\'s tenant context', { timeout: 60000 }, async () => {
  const A = TID['empathia-demo']; const B = TID['second-tenant'];
  // a (test-only) handler that tries to write into the other tenant is refused by the database itself
  const room = await c.call('POST', '/v1/rooms', { token: T.otherDesigner, body: { name: 'Isolation Room (synthetic)', template: 'huddle', buildingCode: 'BX1', floor: 1 } });
  assert.equal(room.status, 201, JSON.stringify(room.body));
  const bRoom = await one('SELECT id, code FROM app.room WHERE code = $1 AND tenant_id = $2', [room.body.code, B]);
  await h.drain();
  const [hostileId] = await insertEvents([{ tenant: A, type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-TEN-HOSTILE', rev: 1, payload: { issueId: 'ISS-SYN-TEN-HOSTILE', owner: 'opslead' } }]);
  const refused = {};
  const hostile = named('test-cross-tenant-writer', async (qq, e) => {
    if (e.id !== hostileId) return;
    const attempt = async (what, sqlText, params) => { await qq.query('SAVEPOINT hostile'); try { await qq.query(sqlText, params); refused[what] = 'WRITTEN'; } catch (err) { refused[what] = err.code; } await qq.query('ROLLBACK TO SAVEPOINT hostile'); };
    await attempt('notification', "INSERT INTO app.notification (tenant_id, to_role, kind, title, event_id) VALUES ($1, 'syseng', 'test.cross_tenant', 'cross-tenant write (synthetic)', $2)", [B, e.id]);
    await attempt('read_model', "INSERT INTO app.room_read_model (tenant_id, room_id, room_code, name, lifecycle, lifecycle_label, devices, open_issues, open_high, applicable_tests, results, last_event_at) VALUES ($1, $2, $3, 'hijacked (synthetic)', 'PLANNED', 'x', 0, 0, 0, 0, '{}'::jsonb, now()) ON CONFLICT (tenant_id, room_id) DO UPDATE SET name = 'hijacked (synthetic)'", [B, bRoom.id, bRoom.code]);
  });
  await drainWith(worker('outbox-test-hostile', [hostile, outbox.readModelHandler, outbox.notificationHandler]));
  assert.deepEqual(refused, { notification: '42501', read_model: '42501' }, 'row-level security refuses the cross-tenant writes');
  assert.equal((await one("SELECT count(*)::int AS n FROM app.notification WHERE tenant_id = $1 AND kind = 'test.cross_tenant'", [B])).n, 0);
  assert.equal((await one("SELECT count(*)::int AS n FROM app.room_read_model WHERE tenant_id = $1 AND name = 'hijacked (synthetic)'", [B])).n, 0);
  assert.equal((await statusOf(hostileId)).status, 'DELIVERED', 'the event itself is delivered in its own tenant');
});

test('tenancy: a security admin of another tenant cannot list or replay this tenant\'s events, and cannot tell that they exist', { timeout: 60000 }, async () => {
  const [id] = await insertEvents([{ type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-TEN-DL', rev: 1, payload: { issueId: 'ISS-SYN-TEN-DL', owner: 'opslead', marker: 'tenant-A-private' } }]);
  await deadLetter([id]);
  const before = await statusOf(id);
  const aIds = (await q('SELECT id FROM app.outbox_event WHERE tenant_id = $1', [TID['empathia-demo']])).map((x) => x.id);
  for (const s of ['DEAD_LETTER', 'PENDING', 'DELIVERED']) {
    const l = await c.call('GET', `/v1/admin/outbox?status=${s}`, { token: T.otherSec });
    assert.equal(l.status, 200);
    assert.deepEqual(l.body.items.filter((x) => aIds.includes(x.id)), [], `${s}: none of tenant A's events`);
    assert.ok(!JSON.stringify(l.body).includes('tenant-A-private'));
  }
  assert.ok((await c.call('GET', '/v1/admin/outbox?status=DEAD_LETTER', { token: T.secadmin })).body.items.some((x) => x.id === id), 'tenant A\'s own admin sees it');
  const reason = { reason: 'synthetic cross-tenant probe (outbox test)' };
  const strip = (b) => { const { correlationId, ...rest } = b || {}; return { ...rest, detail: String(rest.detail || '').replace(/[0-9a-f-]{36}/g, '<id>') }; };
  const real = await c.call('POST', `/v1/admin/outbox/${id}/retry`, { token: T.otherSec, body: reason });
  const ghost = await c.call('POST', `/v1/admin/outbox/${crypto.randomUUID()}/retry`, { token: T.otherSec, body: reason });
  assert.equal(real.status, 404, 'refused as not found, not as forbidden');
  assert.equal(ghost.status, 404);
  assert.deepEqual(strip(real.body), strip(ghost.body), 'an existing foreign event and a non-existent one get the same answer');
  assert.equal((await c.call('POST', '/v1/admin/outbox/not-a-uuid/retry', { token: T.otherSec, body: reason })).status, 404, 'a malformed id is simply not found');
  assert.deepEqual(await statusOf(id), before, 'the event is untouched');
  // clean up: tenant A's admin replays it (covered in detail below)
  assert.equal((await c.call('POST', `/v1/admin/outbox/${id}/retry`, { token: T.secadmin, body: { reason: 'synthetic: cleanup after the isolation test' } })).status, 200);
  await h.drain();
});

test(`tenancy: payloads never cross tenants — each external delivery (${STUB_LABEL}) carries one event of one tenant; the admin list carries no payload`, { timeout: 60000 }, async () => {
  stub.reset();
  const A = TID['empathia-demo']; const B = TID['second-tenant'];
  const ids = await insertEvents([
    { tenant: A, type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-PAY-A', rev: 1, payload: { issueId: 'ISS-SYN-PAY-A', owner: 'opslead', marker: 'payload-of-tenant-A' } },
    { tenant: B, type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-PAY-B', rev: 1, payload: { issueId: 'ISS-SYN-PAY-B', owner: 'syseng', marker: 'payload-of-tenant-B' } },
  ]);
  const app = 'outbox-test-payloads';
  await drainWith(worker(app, undefined, { externalSinks: [localStubSinkAdapter({ url: stub.url, workerApplication: app, accepts: (e) => ids.includes(e.id) })] }));
  assert.equal(stub.calls.length, 2);
  for (const call of stub.calls) {
    const want = call.body.tenantId === A ? 'payload-of-tenant-A' : 'payload-of-tenant-B';
    assert.equal(call.body.payload.marker, want, 'the payload belongs to the tenant it is delivered for');
    assert.ok(!JSON.stringify(call.body).includes(want === 'payload-of-tenant-A' ? 'payload-of-tenant-B' : 'payload-of-tenant-A'));
  }
  for (const [tok, own, other] of [[T.secadmin, ids[0], ids[1]], [T.otherSec, ids[1], ids[0]]]) {
    const l = await c.call('GET', '/v1/admin/outbox?status=DELIVERED', { token: tok });
    assert.ok(l.body.items.some((x) => x.id === own)); assert.ok(!l.body.items.some((x) => x.id === other));
    assert.ok(l.body.items.every((x) => !('payload' in x)), 'the admin list never returns payloads');
  }
});

// ================================================================================================ 4. controlled dead-letter replay
test('replay: security admin only, with a reason; 409 unless dead-lettered; a duplicate request never delivers twice; fully audited; the ledger still verifies', { timeout: 60000 }, async () => {
  const [id, id2] = await insertEvents([
    { type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-REPLAY-1', rev: 1, payload: { issueId: 'ISS-SYN-REPLAY-1', owner: 'opslead' } },
    { type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-REPLAY-2', rev: 1, payload: { issueId: 'ISS-SYN-REPLAY-2', owner: 'opslead' } },
  ]);
  await deadLetter([id, id2], 'injected connector timeout (synthetic, outbox replay test)');
  const reason = 'synthetic: the connector outage is over (outbox replay test)';
  const path1 = `/v1/admin/outbox/${id}/retry`;
  // only the existing security-admin authority (policy.configure)
  assert.equal((await c.call('POST', path1, { token: T.designer, body: { reason } })).status, 403);
  assert.equal((await c.call('POST', path1, { token: T.steward, body: { reason } })).status, 403);
  // a reason is required
  for (const body of [undefined, {}, { reason: '' }, { reason: '   ' }]) assert.equal((await c.call('POST', path1, { token: T.secadmin, body })).status, 400, `reason required: ${JSON.stringify(body)}`);
  assert.equal((await statusOf(id)).status, 'DEAD_LETTER', 'refused requests change nothing');
  // the replay
  const r = await c.call('POST', path1, { token: T.secadmin, body: { reason } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.status, 'PENDING');
  assert.deepEqual(await statusOf(id), { status: 'PENDING', attempts: 0, last_error: null });
  // a duplicate request: refused (409), the event is requeued once
  const dup = await c.call('POST', path1, { token: T.secadmin, body: { reason } });
  assert.equal(dup.status, 409, JSON.stringify(dup.body));
  await h.drain();
  assert.equal((await statusOf(id)).status, 'DELIVERED');
  assert.equal((await one('SELECT count(*)::int AS n FROM app.notification WHERE event_id = $1', [id])).n, 1, 'delivered once');
  assert.equal((await c.call('POST', path1, { token: T.secadmin, body: { reason } })).status, 409, 'a delivered event cannot be replayed');
  // two concurrent replays of the same dead letter: exactly one wins
  const both = await Promise.all([1, 2].map(() => c.call('POST', `/v1/admin/outbox/${id2}/retry`, { token: T.secadmin, body: { reason } })));
  assert.deepEqual(both.map((x) => x.status).sort(), [200, 409]);
  await h.drain();
  assert.equal((await one('SELECT count(*)::int AS n FROM app.notification WHERE event_id = $1', [id2])).n, 1, 'delivered once');
  // the Evidence Ledger: who, when, why, prior attempts, last error, outcome
  const trail = await c.call('GET', `/v1/audit?aggregateType=OutboxEvent&aggregateId=${id}&limit=50`, { token: T.secadmin });
  assert.equal(trail.status, 200);
  const ok = trail.body.items.filter((x) => x.action === 'outbox.retry' && x.outcome === 'ALLOWED');
  assert.equal(ok.length, 1, 'one successful replay');
  const me = await c.call('GET', '/v1/me', { token: T.secadmin });
  assert.equal(ok[0].actor_id, me.body.person.id); assert.equal(ok[0].actor_role, 'secadmin');
  assert.ok(ok[0].at);
  assert.equal(ok[0].detail.reason, reason);
  assert.equal(ok[0].detail.priorStatus, 'DEAD_LETTER');
  assert.equal(ok[0].detail.priorAttempts, outbox.MAX_ATTEMPTS);
  assert.match(ok[0].detail.lastError, /injected connector timeout/);
  assert.equal(ok[0].detail.outcome, 'REQUEUED');
  const denied = trail.body.items.filter((x) => x.action === 'outbox.retry' && x.outcome === 'DENIED');
  assert.ok(denied.some((x) => x.detail.outcome === 'REFUSED_NOT_DEAD_LETTERED' && x.detail.status === 'PENDING'), 'the duplicate request is audited as refused');
  assert.ok(denied.some((x) => x.detail.status === 'DELIVERED'));
  const integrity = await c.call('GET', '/v1/audit/integrity', { token: T.secadmin });
  assert.equal(integrity.status, 200);
  assert.equal(integrity.body.verified, true, JSON.stringify(integrity.body.firstBreak));
  assert.equal(integrity.body.firstBreak, null);
});

test('replay: bounded and explicit — one event per request, no bulk replay route; an Idempotency-Key repeat returns the first answer without requeueing again', { timeout: 60000 }, async () => {
  const posts = h.app.router.routes.filter((r) => r.method === 'POST' && r.path.startsWith('/v1/admin/outbox'));
  assert.deepEqual(posts.map((r) => r.path), ['/v1/admin/outbox/:event/retry'], 'the only replay route names exactly one event');
  assert.ok(posts[0].body?.required?.includes('reason'), 'the route declares a required reason');
  const [id] = await insertEvents([{ type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-REPLAY-3', rev: 1, payload: { issueId: 'ISS-SYN-REPLAY-3', owner: 'opslead' } }]);
  await deadLetter([id]);
  const body = { reason: 'synthetic: replay with an idempotency key (outbox test)' };
  const a = await c.call('POST', `/v1/admin/outbox/${id}/retry`, { token: T.secadmin, body, headers: { 'idempotency-key': `outbox-replay-${id}` } });
  const b = await c.call('POST', `/v1/admin/outbox/${id}/retry`, { token: T.secadmin, body, headers: { 'idempotency-key': `outbox-replay-${id}` } });
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  assert.equal(b.headers['idempotent-replay'], 'true');
  assert.deepEqual(b.body, a.body);
  const trail = await c.call('GET', `/v1/audit?aggregateType=OutboxEvent&aggregateId=${id}&limit=50`, { token: T.secadmin });
  assert.equal(trail.body.items.filter((x) => x.action === 'outbox.retry' && x.outcome === 'ALLOWED').length, 1, 'requeued once');
  await h.drain();
  assert.equal((await one('SELECT count(*)::int AS n FROM app.notification WHERE event_id = $1', [id])).n, 1);
});

// ================================================================================================ 5. replay identity and traceability
const identity = async (id) => one(`SELECT id, tenant_id, type, schema_version, aggregate_type, aggregate_id, aggregate_rev, payload::text AS payload_text, md5(payload::text) AS payload_md5,
  correlation_id, occurred_at, actor_id, seq FROM app.outbox_event WHERE id = $1`, [id]);

test(`replay identity: a replayed event keeps its id, type, schema version, aggregate (type, id, rev), tenant, payload bytes, correlation id, occurrence time and append order; its receipts and the ${STUB_LABEL} see the same event id`, { timeout: 60000 }, async () => {
  stub.reset();
  const payload = { issueId: 'ISS-SYN-IDENT-1', owner: 'opslead', roomId: 'R-PLN-0001', note: 'synthetic — “quotes”, ünïcode, 0.10' };
  const [id] = await insertEvents([{ type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-IDENT-1', rev: 3, payload }]);
  const original = await identity(id);
  await deadLetter([id]);
  assert.deepEqual(await identity(id), original, 'dead-lettering changes no identity field');
  const r = await c.call('POST', `/v1/admin/outbox/${id}/retry`, { token: T.secadmin, body: { reason: 'synthetic: identity test replay' } });
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.id, id);
  assert.deepEqual(await identity(id), original, 'the replay changes no identity field');
  const app = 'outbox-test-identity';
  await drainWith(worker(app, undefined, { externalSinks: [localStubSinkAdapter({ url: stub.url, workerApplication: app, accepts: (e) => e.id === id })] }));
  assert.equal((await statusOf(id)).status, 'DELIVERED');
  assert.deepEqual(await identity(id), original, 'nor does the delivery after it');
  assert.equal((await one('SELECT count(*)::int AS n FROM app.outbox_event WHERE correlation_id = $1', [original.correlation_id])).n, 1, 'the replay re-delivers the same row; it never creates a copy');
  const receipts = await q('SELECT event_id, tenant_id, kind, handler, idempotency_key FROM app.outbox_delivery WHERE idempotency_key LIKE $1 ORDER BY kind, handler', [`outbox:${id}:%`]);
  assert.deepEqual(receipts.map((x) => `${x.kind}:${x.handler}`), ['EXTERNAL:local-stub-sink', 'INTERNAL:notificationHandler', 'INTERNAL:readModelHandler']);
  assert.ok(receipts.every((x) => x.event_id === id && x.tenant_id === original.tenant_id), 'every receipt references the original event and tenant');
  assert.equal(stub.calls.length, 1);
  assert.equal(stub.calls[0].body.eventId, id); assert.equal(stub.calls[0].key, `outbox:${id}:local-stub-sink`);
  assert.deepEqual(stub.calls[0].body.payload, payload, 'the consumer receives the original payload');
  assert.deepEqual(stub.calls[0].body.aggregate, { type: 'RoomIssue', id: 'ISS-SYN-IDENT-1', rev: 3 });
  assert.equal((await one('SELECT count(*)::int AS n FROM app.notification WHERE event_id = $1', [id])).n, 1);
});

test('replay traceability: each replay is linked both ways — the event records its replay count and latest replay audit record; each replay audit record names the event and its original correlation id', { timeout: 60000 }, async () => {
  const [id] = await insertEvents([{ type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-TRACE-1', rev: 1, payload: { issueId: 'ISS-SYN-TRACE-1', owner: 'opslead' } }]);
  const corr = (await identity(id)).correlation_id;
  const listed = async (status) => (await c.call('GET', `/v1/admin/outbox?status=${status}`, { token: T.secadmin })).body.items.find((x) => x.id === id);
  await deadLetter([id]);
  const before = await listed('DEAD_LETTER');
  assert.equal(before.replay_count, 0, 'the admin listing shows the replay count');
  assert.equal(before.last_replay_audit_id, null);
  assert.equal(before.correlation_id, corr);
  const r1 = await c.call('POST', `/v1/admin/outbox/${id}/retry`, { token: T.secadmin, body: { reason: 'synthetic: first replay (traceability test)' } });
  assert.equal(r1.status, 200, JSON.stringify(r1.body));
  await deadLetter([id], 'injected failure after the first replay (outbox test)');
  const r2 = await c.call('POST', `/v1/admin/outbox/${id}/retry`, { token: T.secadmin, body: { reason: 'synthetic: second replay (traceability test)' } });
  assert.equal(r2.status, 200, JSON.stringify(r2.body));
  await h.drain();
  const ev = await listed('DELIVERED');
  assert.equal(ev.replay_count, 2);
  assert.equal(ev.correlation_id, corr, 'the original correlation id is kept');
  const trail = await c.call('GET', `/v1/audit?aggregateType=OutboxEvent&aggregateId=${id}&limit=50`, { token: T.secadmin });
  const replays = trail.body.items.filter((x) => x.action === 'outbox.retry' && x.outcome === 'ALLOWED').sort((a, b) => Number(a.id) - Number(b.id));
  assert.equal(replays.length, 2, 'one audit record per replay');
  assert.equal(String(ev.last_replay_audit_id), String(replays[1].id), 'event → its latest replay audit record');
  assert.equal(String(r2.body.auditId), String(replays[1].id), 'the replay answer names its audit record');
  replays.forEach((a, i) => {
    assert.equal(a.aggregate_type, 'OutboxEvent'); assert.equal(a.aggregate_id, id, 'audit record → event');
    assert.equal(a.detail.replayNumber, i + 1);
    assert.equal(a.detail.eventCorrelationId, corr, 'audit record → the event\'s original correlation id');
    assert.match(a.detail.reason, i ? /second/ : /first/);
  });
  assert.equal(replays[0].correlation_id, r1.headers['x-correlation-id'], 'the audit record carries the replay request\'s own correlation id');
  assert.equal(replays[1].detail.priorAttempts, outbox.MAX_ATTEMPTS); assert.match(replays[1].detail.lastError, /after the first replay/);
});

// ================================================================================================ 6. failure kinds
test('failures are distinguishable in the record and the admin listing: TRANSIENT (retrying, with next_attempt_at), PERMANENT (attempts exhausted), NON_RETRYABLE (fails its contract)', { timeout: 60000 }, async () => {
  const kind = async (id) => one('SELECT status, attempts, failure_kind, last_error, next_attempt_at > now() AS later FROM app.outbox_event WHERE id = $1', [id]);
  const [pId] = await insertEvents([{ type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-KIND-P', rev: 1, payload: { issueId: 'ISS-SYN-KIND-P', owner: 'opslead' } }]);
  await deadLetter([pId], 'injected persistent failure (outbox test)');
  const [tId, nId] = await insertEvents([
    { type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-KIND-T', rev: 1, payload: { issueId: 'ISS-SYN-KIND-T', owner: 'opslead' } },
    { type: 'room.teleported', aggType: 'RoomIssue', aggId: 'ISS-SYN-KIND-N', rev: 1, payload: { issueId: 'ISS-SYN-KIND-N', owner: 'opslead' } },
  ]);
  await drainWith(worker('outbox-test-kind', [named('test-fails-once', async (_q, e) => { if (e.id === tId) throw new Error('injected transient failure (outbox test)'); }), outbox.readModelHandler, outbox.notificationHandler]));
  assert.deepEqual(await kind(tId), { status: 'PENDING', attempts: 1, failure_kind: 'TRANSIENT', last_error: 'injected transient failure (outbox test)', later: true }, 'TRANSIENT: retrying later');
  assert.deepEqual(await kind(pId), { status: 'DEAD_LETTER', attempts: outbox.MAX_ATTEMPTS, failure_kind: 'PERMANENT', last_error: 'injected persistent failure (outbox test)', later: true }, 'PERMANENT: attempts exhausted');
  const n = await kind(nId);
  assert.equal(n.status, 'DEAD_LETTER'); assert.equal(n.attempts, 1, 'NON_RETRYABLE: dead-lettered on its first attempt'); assert.equal(n.failure_kind, 'NON_RETRYABLE');
  assert.match(n.last_error, /unknown event type room\.teleported/);
  const pend = (await c.call('GET', '/v1/admin/outbox?status=PENDING', { token: T.secadmin })).body.items.find((x) => x.id === tId);
  assert.equal(pend.failure_kind, 'TRANSIENT'); assert.ok(Date.parse(pend.next_attempt_at) > Date.now(), 'the listing shows when it retries');
  const dl = (await c.call('GET', '/v1/admin/outbox?status=DEAD_LETTER', { token: T.secadmin })).body.items;
  assert.equal(dl.find((x) => x.id === pId).failure_kind, 'PERMANENT');
  assert.equal(dl.find((x) => x.id === nId).failure_kind, 'NON_RETRYABLE');
  await q('UPDATE app.outbox_event SET next_attempt_at = now() WHERE id = $1', [tId]);
  await h.drain();
  assert.equal((await statusOf(tId)).status, 'DELIVERED', 'the transient failure recovered');
});

// ================================================================================================ 7. malformed and unauthorized events
test('malformed events are dead-lettered at once as NON_RETRYABLE with their reason: never handed to a handler, never retried; later events of the aggregate stay held', { timeout: 60000 }, async () => {
  const A = TID['empathia-demo']; const B = TID['second-tenant'];
  const aOnly = (await one('SELECT code FROM app.room WHERE tenant_id = $1 AND code NOT IN (SELECT code FROM app.room WHERE tenant_id = $2) ORDER BY code LIMIT 1', [A, B])).code;
  const ok = (k) => ({ issueId: `ISS-SYN-BAD-${k}`, owner: 'opslead' });
  const [passRoom] = await makeRooms(1);
  const cases = [
    ['unknown type', { type: 'room.teleported', aggType: 'RoomIssue', aggId: 'ISS-SYN-BAD-1', rev: 1, payload: ok(1) }, /unknown event type room\.teleported/],
    ['payload fails the contract', { type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-BAD-2', rev: 1, payload: { issueId: 'ISS-SYN-BAD-2' } }, /missing payload field owner/],
    ['payload is not an object', { type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-BAD-3', rev: 1, payload: 'synthetic text, not an object' }, /payload is not an object/],
    ['bare PASS result label', { type: 'commission.test_result_submitted', aggType: 'Room', aggId: passRoom, rev: 1, payload: { planId: 'SYN', testId: 'SYN', state: 'RECORDED', evidence: 'SYN', resultLabel: 'PASS' } }, /resultLabel PASS/],
    ['negative aggregate rev', { type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-BAD-5', rev: -1, payload: ok(5) }, /aggregateRevision must be a non-negative integer/],
    ['empty aggregate id', { type: 'issue.assigned', aggType: 'RoomIssue', aggId: '', rev: 1, payload: ok(6) }, /missing aggregateId/],
    ['unsupported schema version', { type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-BAD-7', rev: 1, payload: ok(7), schema: '2.0.0' }, /schema version 2\.0\.0/],
    ['aggregate room of another tenant', { tenant: B, type: 'room.geometry_updated', aggType: 'Room', aggId: aOnly, rev: 1, payload: { designId: aOnly } }, new RegExp(`room ${aOnly} is not a room of the event's tenant`)],
    ['payload room of another tenant', { tenant: B, type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-BAD-9', rev: 1, payload: { ...ok(9), roomId: aOnly } }, new RegExp(`room ${aOnly} is not a room of the event's tenant`)],
  ];
  const ids = await insertEvents(cases.map(([, row]) => row));
  const [laterId] = await insertEvents([{ type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-BAD-1', rev: 2, payload: ok(1) }]);
  const seen = [];
  const probe = named('test-sees-events', async (_q, e) => { seen.push(e.id); });
  const w = worker('outbox-test-malformed', [probe, outbox.readModelHandler, outbox.notificationHandler]);
  await drainWith(w);
  for (let i = 0; i < 2; i += 1) { await q('UPDATE app.outbox_event SET next_attempt_at = now() WHERE id = ANY($1::uuid[])', [[...ids, laterId]]); await drainWith(w); }
  const handed = cases.filter((_, i) => seen.includes(ids[i])).map(([what]) => what);
  assert.deepEqual(handed, [], 'no handler was handed a malformed event');
  for (const [i, [what, , why]] of cases.entries()) {
    const s = await one('SELECT status, attempts, failure_kind, last_error FROM app.outbox_event WHERE id = $1', [ids[i]]);
    assert.equal(s.status, 'DEAD_LETTER', `${what}: dead-lettered`);
    assert.equal(s.attempts, 1, `${what}: not retried`);
    assert.equal(s.failure_kind, 'NON_RETRYABLE', `${what}: NON_RETRYABLE`);
    assert.match(s.last_error || '', why, `${what}: with its reason`);
  }
  assert.equal((await one('SELECT count(*)::int AS n FROM app.notification WHERE event_id = ANY($1::uuid[])', [ids])).n, 0);
  assert.deepEqual(await statusOf(laterId), { status: 'PENDING', attempts: 0, last_error: null }, 'the next event of the aggregate stays held behind it');
});

test('replaying a NON_RETRYABLE event that still fails its contract is refused (422) with the reason; once the cause is gone it can be replayed; payloads cannot be edited through the API', { timeout: 60000 }, async () => {
  const [badId] = await insertEvents([{ type: 'room.teleported', aggType: 'RoomIssue', aggId: 'ISS-SYN-REPLAY-BAD', rev: 1, payload: { issueId: 'ISS-SYN-REPLAY-BAD', owner: 'opslead' } }]);
  // an event for the next room the second tenant will create: it fails (no such room in the tenant) until that room exists
  const [first] = await makeRooms(1, T.otherDesigner, 'BX1');
  const next = `R-PLN-${String(Number(first.slice(-4)) + 1).padStart(4, '0')}`;
  const [lateId] = await insertEvents([{ tenant: TID['second-tenant'], type: 'room.geometry_updated', aggType: 'Room', aggId: next, rev: 1, payload: { designId: next } }]);
  await h.drain();
  for (const id of [badId, lateId]) assert.equal((await statusOf(id)).status, 'DEAD_LETTER', 'precondition: the malformed event was dead-lettered, not delivered');
  for (const id of [badId, lateId]) assert.equal((await one('SELECT failure_kind FROM app.outbox_event WHERE id = $1', [id])).failure_kind, 'NON_RETRYABLE');
  const reason = { reason: 'synthetic: replay of a malformed event (outbox test)' };
  const refused = await c.call('POST', `/v1/admin/outbox/${badId}/retry`, { token: T.secadmin, body: reason });
  assert.equal(refused.status, 422, JSON.stringify(refused.body));
  assert.ok(refused.body.reasons.some((x) => /unknown event type room\.teleported/.test(x)), 'the refusal names the contract failure');
  assert.equal((await statusOf(badId)).status, 'DEAD_LETTER', 'nothing was requeued');
  const trail = await c.call('GET', `/v1/audit?aggregateType=OutboxEvent&aggregateId=${badId}&limit=20`, { token: T.secadmin });
  assert.ok(trail.body.items.some((x) => x.action === 'outbox.retry' && x.outcome === 'DENIED' && x.detail.outcome === 'REFUSED_CONTRACT' && x.detail.problems.some((p) => /unknown event type/.test(p))), 'the refusal is audited with the reason');
  assert.equal((await c.call('POST', `/v1/admin/outbox/${lateId}/retry`, { token: T.otherSec, body: reason })).status, 422, 'still no such room');
  const [made] = await makeRooms(1, T.otherDesigner, 'BX1');
  assert.equal(made, next, 'precondition: the room the event names now exists in its tenant');
  const roomEvents = async () => q("SELECT status, attempts FROM app.outbox_event WHERE tenant_id = $1 AND aggregate_type = 'Room' AND aggregate_id = $2 AND id <> $3", [TID['second-tenant'], next, lateId]);
  const held = await roomEvents();
  assert.ok(held.length > 0 && held.every((x) => x.status === 'PENDING' && x.attempts === 0), 'the new room\'s own events (from the API) are held behind the dead letter of the same aggregate');
  const accepted = await c.call('POST', `/v1/admin/outbox/${lateId}/retry`, { token: T.otherSec, body: { reason: 'synthetic: the room now exists (outbox test)' } });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
  await h.drain();
  assert.equal((await statusOf(lateId)).status, 'DELIVERED');
  assert.ok((await roomEvents()).every((x) => x.status === 'DELIVERED'), 'and flow once it is delivered');
  // no route edits an event: the replay body accepts a reason only, and the outbox has no write route besides the replay
  assert.equal((await c.call('POST', `/v1/admin/outbox/${badId}/retry`, { token: T.secadmin, body: { ...reason, payload: { owner: 'opslead' } } })).status, 400);
  assert.equal((await c.call('POST', `/v1/admin/outbox/${badId}/retry`, { token: T.secadmin, body: { ...reason, type: 'issue.assigned' } })).status, 400);
  const writes = h.app.router.routes.filter((r) => r.method !== 'GET' && /outbox/.test(r.path)).map((r) => `${r.method} ${r.path}`);
  assert.deepEqual(writes, ['POST /v1/admin/outbox/:event/retry']);
});

test('constraint proof (database grants, row-level security and constraints — not worker logic): roles that must not write events cannot; an existing event\'s identity and payload cannot be rewritten; an unknown tenant or a missing rev cannot be stored', { timeout: 60000 }, async () => {
  const A = TID['empathia-demo']; const B = TID['second-tenant'];
  const [id] = await insertEvents([{ type: 'issue.assigned', aggType: 'RoomIssue', aggId: 'ISS-SYN-CONSTRAINT', rev: 1, payload: { issueId: 'ISS-SYN-CONSTRAINT', owner: 'opslead' } }]);
  const original = await identity(id);
  const ins = "INSERT INTO app.outbox_event (tenant_id, type, schema_version, aggregate_type, aggregate_id, aggregate_rev, payload, correlation_id) VALUES ($1, 'issue.assigned', '1.0.0', 'RoomIssue', 'ISS-SYN-FORGED', 1, '{\"issueId\":\"ISS-SYN-FORGED\",\"owner\":\"opslead\"}', 'forged')";
  const refusedWith = (code, re) => (e) => e.code === code && re.test(e.message);
  // the worker role: no INSERT grant on the outbox at all, and no UPDATE of identity columns
  const { PgConnection } = await import(path.join(api, 'db/pg.js'));
  const w = new PgConnection(configFromUrl(h.urls.WORKER_DATABASE_URL)); await w.connect();
  try {
    await w.query("SELECT set_config('app.tenant_id', $1, false)", [A]);
    await assert.rejects(w.query(ins, [A]), refusedWith('42501', /permission denied/), 'empathia_worker cannot insert an event');
    for (const col of ['payload', 'type', 'aggregate_rev', 'tenant_id', 'correlation_id']) await assert.rejects(w.query(`UPDATE app.outbox_event SET ${col} = ${col} WHERE id = $1`, [id]), refusedWith('42501', /permission denied/), `empathia_worker cannot rewrite ${col}`);
  } finally { await w.end(); }
  // the runtime role: may append only for its own tenant (row-level security), and may not rewrite an event
  const k = await h.appConn();
  try {
    await assert.rejects(k.query(ins, [A]), refusedWith('42501', /row-level security/), 'empathia_app without a tenant context cannot insert');
    await k.query("SELECT set_config('app.tenant_id', $1, false)", [A]);
    await assert.rejects(k.query(ins, [B]), refusedWith('42501', /row-level security/), 'empathia_app cannot insert an event for another tenant');
    for (const [col, v] of [['payload', "'{\"issueId\":\"x\",\"owner\":\"x\"}'::jsonb"], ['type', "'issue.created_or_updated'"], ['aggregate_type', "'Room'"], ['aggregate_id', "'ISS-SYN-OTHER'"], ['aggregate_rev', '99'], ['tenant_id', `'${B}'::uuid`], ['correlation_id', "'rewritten'"], ['schema_version', "'1.9.0'"], ['occurred_at', 'now()']]) {
      await assert.rejects(k.query(`UPDATE app.outbox_event SET ${col} = ${v} WHERE id = $1`, [id]), refusedWith('42501', /permission denied/), `empathia_app cannot rewrite ${col}`);
    }
    await assert.rejects(k.query('DELETE FROM app.outbox_event WHERE id = $1', [id]), refusedWith('42501', /permission denied/), 'empathia_app cannot delete an event');
    await k.query('BEGIN'); await k.query(ins, [A]); await k.query('ROLLBACK');   // positive control: its own tenant, as ctx.emit does
  } finally { await k.end(); }
  // constraints, whoever writes: an unknown tenant (foreign key) and a missing rev (NOT NULL) are refused even for the superuser
  await assert.rejects(q(ins, [crypto.randomUUID()]), (e) => e.code === '23503', 'an unknown tenant is refused by the foreign key');
  await assert.rejects(q("INSERT INTO app.outbox_event (tenant_id, type, schema_version, aggregate_type, aggregate_id, aggregate_rev, payload, correlation_id) VALUES ($1, 'issue.assigned', '1.0.0', 'RoomIssue', 'ISS-SYN-NOREV', NULL, '{}', 'x')", [A]), (e) => e.code === '23502', 'a missing rev is refused (NOT NULL)');
  assert.deepEqual(await identity(id), original, 'the event is exactly as it was written');
  await h.drain();
});

// ================================================================================================ 8. per-aggregate commit order (not the producer's rev)
/** Handle every event of the given aggregates with one worker and return the order they were handed to a handler, per aggregate. */
async function deliveryOrder(app, keys) {
  const seen = {};
  const probe = named('test-delivery-order', async (_q, e) => { const k = `${e.aggregate_type}/${e.aggregate_id}`; if (keys.includes(k)) (seen[k] ||= []).push(e.id); });
  await drainWith(worker(app, [probe, outbox.readModelHandler, outbox.notificationHandler]));
  return seen;
}
/** The append (commit) order of an aggregate's events: seq is taken at INSERT, and these producers commit one request after another. */
const appendOrder = async (tenant, type, id) => q('SELECT id, type, aggregate_rev FROM app.outbox_event WHERE tenant_id = $1 AND aggregate_type = $2 AND aggregate_id = $3 ORDER BY seq', [tenant, type, id]);

test('commit order: a producer that sends a lower rev after a higher rev on the same room is delivered in commit order, and cannot choose its own sequence', { timeout: 60000 }, async () => {
  const [room] = await makeRooms(1);
  const ids = [];
  for (const rev of [6, 1, 3]) ids.push(...await insertEvents([{ aggId: room, rev }]));   // three commits, in this order
  const order = await deliveryOrder('outbox-test-commit-order', [`Room/${room}`]);
  assert.deepEqual(order[`Room/${room}`], ids, 'delivered in commit order (rev 6, then 1, then 3), not in rev order');
  const seqs = await q('SELECT id, aggregate_seq FROM app.outbox_event WHERE id = ANY($1::uuid[])', [ids]);
  const s = ids.map((id) => Number(seqs.find((x) => x.id === id).aggregate_seq));
  assert.ok(s[0] < s[1] && s[1] < s[2], `aggregate_seq follows commit order (${s.join(', ')})`);
  const forged = crypto.randomUUID();
  await q("INSERT INTO app.outbox_event (id, tenant_id, type, schema_version, aggregate_type, aggregate_id, aggregate_rev, aggregate_seq, payload, correlation_id) VALUES ($1, $2, 'room.geometry_updated', '1.0.0', 'Room', $3, 8, 1, $4, 'forged-seq')", [forged, TID['empathia-demo'], room, JSON.stringify({ designId: room })]);
  assert.ok(Number((await one('SELECT aggregate_seq FROM app.outbox_event WHERE id = $1', [forged])).aggregate_seq) > s[2], 'a sequence supplied by the producer is ignored: the database assigns the next one');
  await h.drain();
});

test('commit order with real producers: a commissioning failure (Room rev 1) after the room\'s lifecycle events, and a work order reopened then reassigned (rev 6, then 2), are delivered in commit order', { timeout: 90000 }, async () => {
  await h.drain();
  const A = TID['empathia-demo'];
  const instrument = 'SYN-METER-01 (synthetic), calibration record SYN-CAL-2026-09';
  const ok = (r, what) => { assert.ok(r.status < 300, `${what}: ${r.status} ${JSON.stringify(r.body)}`); return r.body; };
  const room = ok(await c.call('POST', '/v1/rooms', { token: T.designer, body: { name: 'Outbox Order Huddle (synthetic)', template: 'huddle', buildingCode: 'ATL', floor: 4 } }), 'room').code;
  const rev = await c.call('POST', `/v1/rooms/${room}/revisions`, { token: T.designer, body: { reason: 'outbox order' } });
  assert.ok(rev.status === 201 || rev.status === 200 || (rev.status === 422 && /nothing changed/.test(rev.body.detail)), JSON.stringify(rev.body));   // revision 1 may already exist
  ok(await c.call('POST', `/v1/rooms/${room}/drawings/generate`, { token: T.designer }), 'drawings');
  ok(await c.call('POST', `/v1/rooms/${room}/drawings/plan/approve`, { token: T.syseng }), 'drawing approve');
  ok(await c.call('POST', `/v1/rooms/${room}/classification/approve`, { token: T.syseng, body: {} }), 'classification');
  for (const [to, tok] of [['DESIGN_APPROVED', T.syseng], ['INSTALLATION_PENDING', T.opslead], ['INSTALLED_UNVERIFIED', T.installer], ['COMMISSIONING', T.syseng]]) { if (to === 'COMMISSIONING') await registerRoom(c, room, T.installer); ok(await c.call('POST', `/v1/rooms/${room}/lifecycle`, { token: tok, body: { to } }), to); }   // the register gates commissioning (14 Nov 2026)
  const d = ok(await c.call('GET', `/v1/rooms/${room}`, { token: T.designer }), 'room detail');
  const row = d.commissioning.rows.find((x) => x.applicable);
  const ev = ok(await c.call('POST', '/v1/evidence', { token: T.cxeng, raw: Buffer.from('synthetic observation (outbox order)'), headers: { 'content-type': 'text/plain', 'x-file-name': 'o.txt' } }), 'evidence');
  ok(await c.call('POST', `/v1/rooms/${room}/results`, { token: T.cxeng, body: { testId: row.test_id, state: 'FAIL', evidenceId: ev.id, evidenceKind: row.evidence[0], instrument } }), 'FAIL result');
  const issue = ok(await c.call('GET', `/v1/rooms/${room}`, { token: T.designer }), 'room').issues.find((i) => i.state === 'OPEN').code;
  const wo = ok(await c.call('POST', `/v1/issues/${issue}/work-orders`, { token: T.svcmgr, body: { note: 'outbox order (synthetic)' } }), 'work order').workOrderId;
  const tech = (await one("SELECT id FROM app.person WHERE email = 'service@empathia-demo.empathia.invalid'")).id;
  const w = (p, tok, body) => c.call('POST', `/v1/work-orders/${wo}${p}`, { token: tok, body: body ?? {} });
  for (const [p, tok, body] of [['/triage', T.svcmgr, { severity: 'Standard', scope: 's', risk: 'r', workType: 'break_fix', window: { from: '2026-11-04T08:00:00Z', to: '2026-11-04T10:00:00Z' } }], ['/assign', T.svcmgr, { personId: tech }], ['/accept', T.service],
    ['/preflight', T.service, { safetyBriefed: true, toolsConfirmed: ['service kit'], accessConfirmedBy: 'desk' }], ['/start', T.service], ['/evidence', T.service, { kind: 'note', note: 'n' }], ['/submit', T.service], ['/verify', T.cxeng, { outcome: 'pass', note: 'ok' }],
    ['/reopen', T.svcmgr, { reason: 'recurrence (synthetic, outbox order)' }], ['/triage', T.svcmgr, { severity: 'High', scope: 's', risk: 'r' }], ['/assign', T.svcmgr, { personId: tech }], ['/accept', T.service]]) ok(await w(p, tok, body), p);
  const roomEvents = await appendOrder(A, 'Room', room); const woEvents = await appendOrder(A, 'WorkOrder', wo);
  // preconditions: these producers really do send a lower rev after a higher one
  const failAt = roomEvents.findIndex((x) => x.type === 'commission.test_failed');
  assert.ok(failAt > 0 && roomEvents.slice(0, failAt).some((x) => x.aggregate_rev > roomEvents[failAt].aggregate_rev), `room: commission.test_failed (rev ${roomEvents[failAt]?.aggregate_rev}) is appended after higher revs`);
  const revs = woEvents.map((x) => `${x.type}@${x.aggregate_rev}`);
  assert.ok(revs.indexOf('incident.reopened@6') >= 0 && revs.lastIndexOf('work_order.assigned@2') > revs.indexOf('incident.reopened@6'), `work order: a new assignment (rev 2) after the reopen (rev 6): ${revs.join(' ')}`);
  const order = await deliveryOrder('outbox-test-real-producers', [`Room/${room}`, `WorkOrder/${wo}`]);
  const label = (list, all) => (list || []).map((id) => { const x = all.find((y) => y.id === id); return `${x.type}@${x.aggregate_rev}`; });
  assert.deepEqual({ room: label(order[`Room/${room}`], roomEvents), workOrder: label(order[`WorkOrder/${wo}`], woEvents) },
    { room: label(roomEvents.map((x) => x.id), roomEvents), workOrder: revs }, 'the room\'s and the work order\'s events are delivered in commit order');
  assert.deepEqual(order[`Room/${room}`], roomEvents.map((x) => x.id));
  assert.deepEqual(order[`WorkOrder/${wo}`], woEvents.map((x) => x.id));
});

test('commit order under concurrency: concurrent API transactions on the same room all succeed, and their sequences follow commit order', { timeout: 60000 }, async () => {
  const [room] = await makeRooms(1);
  for (let round = 0; round < 5; round += 1) {
    const rs = await Promise.all([1, 2, 3].map((i) => c.call('PATCH', `/v1/rooms/${room}`, { token: T.designer, body: { intendedUse: `concurrent change ${round}.${i} (synthetic)` } })));
    assert.deepEqual(rs.map((r) => r.status), [200, 200, 200], JSON.stringify(rs.map((r) => r.body)));
  }
  // the room row lock orders the transactions: the one holding it commits first and has the lower room rev
  const ev = await q("SELECT aggregate_rev, aggregate_seq FROM app.outbox_event WHERE tenant_id = $1 AND aggregate_type = 'Room' AND aggregate_id = $2 AND type = 'room.geometry_updated' ORDER BY aggregate_rev", [TID['empathia-demo'], room]);
  assert.equal(ev.length, 15);
  const s = ev.map((x) => Number(x.aggregate_seq));
  assert.deepEqual([...s].sort((a, b) => a - b), s, 'aggregate_seq increases with the commit order');
  assert.equal(new Set(s).size, s.length, 'no two events share a sequence');
  await h.drain();
});

test('commit order without deadlocks: two transactions emitting on the same two aggregates in opposite orders both commit, and agree on the order', { timeout: 60000 }, async () => {
  const [room] = await makeRooms(1);
  const A = TID['empathia-demo'];
  const ins = (k, aggType, aggId, rev, payload) => k.query("INSERT INTO app.outbox_event (tenant_id, type, schema_version, aggregate_type, aggregate_id, aggregate_rev, payload, correlation_id) VALUES ($1, $2, '1.0.0', $3, $4, $5, $6, 'outbox-deadlock-test') RETURNING id",
    [A, aggType === 'Room' ? 'room.geometry_updated' : 'issue.assigned', aggType, aggId, rev, JSON.stringify(payload)]).then((r) => r.rows[0].id);
  const issue = 'ISS-SYN-DEADLOCK-1';
  for (let round = 0; round < 10; round += 1) {
    const k1 = await h.appConn(); const k2 = await h.appConn();
    try {
      for (const k of [k1, k2]) { await k.query("SELECT set_config('app.tenant_id', $1, false)", [A]); await k.query('BEGIN'); }
      // T1: the room, then the issue; T2: the issue, then the room (as a room mutation and an issue mutation might)
      const r1 = await ins(k1, 'Room', room, 40 + round, { designId: room });
      const i2 = await ins(k2, 'RoomIssue', issue, 1, { issueId: issue, owner: 'opslead' });
      const [i1, r2] = await Promise.all([ins(k1, 'RoomIssue', issue, 2, { issueId: issue, owner: 'opslead' }), ins(k2, 'Room', room, 1, { designId: room })]);
      const done = await Promise.allSettled([k1.query('COMMIT'), k2.query('COMMIT')]);
      assert.deepEqual(done.map((x) => x.status), ['fulfilled', 'fulfilled'], `round ${round}: both commit (${done.map((x) => x.reason?.code || '').join(',')})`);
      const seq = async (id) => Number((await one('SELECT aggregate_seq FROM app.outbox_event WHERE id = $1', [id])).aggregate_seq);
      const [sr1, sr2, si1, si2] = [await seq(r1), await seq(r2), await seq(i1), await seq(i2)];
      assert.equal(Math.sign(sr1 - sr2), Math.sign(si1 - si2), `round ${round}: the transaction that committed first is first on both aggregates (room ${sr1}/${sr2}, issue ${si1}/${si2})`);
    } finally { await k1.end(); await k2.end(); }
  }
  const order = await deliveryOrder('outbox-test-deadlock', [`Room/${room}`, `RoomIssue/${issue}`]);
  for (const [type, id] of [['Room', room], ['RoomIssue', issue]]) {
    const bySeq = (await q('SELECT id FROM app.outbox_event WHERE tenant_id = $1 AND aggregate_type = $2 AND aggregate_id = $3 AND correlation_id = $4 ORDER BY aggregate_seq', [A, type, id, 'outbox-deadlock-test'])).map((x) => x.id);
    assert.deepEqual(order[`${type}/${id}`].filter((x) => bySeq.includes(x)), bySeq, `${type}: delivered in sequence order`);
  }
});

test('real Teams / Outlook connector idempotency', { skip: 'NOT RUN: no real Teams or Outlook connector exists in this repository; deduplication is proven only against the local stub sink' }, () => {});
