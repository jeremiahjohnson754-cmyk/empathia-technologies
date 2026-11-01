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
import { setup, client, repo } from './harness.mjs';
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
  for (const r of ['secadmin', 'designer', 'steward', 'opslead']) T[r] = await c.login(r);
  T.otherSec = await c.login('secadmin', 'second-tenant');
  T.otherDesigner = await c.login('designer', 'second-tenant');
  for (const slug of ['empathia-demo', 'second-tenant']) TID[slug] = (await one('SELECT id FROM app.tenant WHERE slug = $1', [slug])).id;
  // the stub inspects the database at the moment of every call: is the calling worker inside a transaction, and has every earlier
  // event of the same aggregate already been delivered (committed)?
  stub = await startLocalStubSink({
    port: STUB_PORT,
    inspect: async (call) => {
      const tx = await one('SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name = $1 AND xact_start IS NOT NULL', [call.workerApplication]);
      const a = call.body?.aggregate || {};
      const earlier = await one("SELECT count(*)::int AS n FROM app.outbox_event WHERE tenant_id = $1 AND aggregate_type = $2 AND aggregate_id = $3 AND aggregate_rev < $4 AND status <> 'DELIVERED'", [call.body?.tenantId, a.type, a.id, a.rev]);
      return { workerInTransaction: tx.n > 0, earlierUndelivered: earlier.n };
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
             VALUES ($1, $2, $3, '1.0.0', $4, $5, $6, $7, $8, coalesce($9::timestamptz, now()))`,
    [id, r.tenant ?? TID['empathia-demo'], r.type ?? 'room.geometry_updated', r.aggType ?? 'Room', r.aggId, r.rev, JSON.stringify(r.payload ?? { designId: r.aggId, fields: ['synthetic'] }), `outbox-test-${crypto.randomUUID()}`, r.at ?? null]);
  }
  return ids;
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
test('ordering: three concurrent workers deliver each room\'s events in aggregate_rev order; different rooms flow in parallel', { timeout: 60000 }, async () => {
  const rooms = ['R-ORD-01', 'R-ORD-02', 'R-ORD-03', 'R-ORD-04', 'R-ORD-05', 'R-ORD-06'];
  const t0 = Date.now() - 60000;
  const rows = [];
  for (let rev = 1; rev <= 8; rev += 1) for (const [i, r] of rooms.entries()) rows.push({ aggId: r, rev, at: new Date(t0 + rev * 1000 + i).toISOString() });
  const ids = await insertEvents(rows);
  const seen = []; const violations = [];
  const probe = (who) => named('test-order-probe', async (qq, e) => {
    if (!e.aggregate_id.startsWith('R-ORD-0')) return;
    await sleep(Math.random() * 6);
    const n = (await qq.query("SELECT count(*)::int AS n FROM app.outbox_event WHERE tenant_id = $1 AND aggregate_type = $2 AND aggregate_id = $3 AND aggregate_rev < $4 AND status <> 'DELIVERED'", [e.tenant_id, e.aggregate_type, e.aggregate_id, e.aggregate_rev])).rows[0].n;
    if (n) violations.push(`${who}: ${e.aggregate_id} rev ${e.aggregate_rev} handled while ${n} earlier rev(s) were not delivered`);
    seen.push({ who, room: e.aggregate_id, rev: e.aggregate_rev });
  });
  const ws = ['a', 'b', 'c'].map((x) => ({ x, w: worker(`outbox-test-order-${x}`, [outbox.readModelHandler, outbox.notificationHandler, probe(x)]) }));
  const deadline = Date.now() + 40000;
  const left = async () => (await one("SELECT count(*)::int AS n FROM app.outbox_event WHERE id = ANY($1::uuid[]) AND status <> 'DELIVERED'", [ids])).n;
  await Promise.all(ws.map(async ({ w }) => { while (Date.now() < deadline && (await left()) > 0) { if (!(await w.tick(4))) await sleep(3); } }));
  assert.equal(await left(), 0, 'every event delivered');
  assert.deepEqual(violations, [], 'no later rev was handled before an earlier one was delivered');
  for (const r of rooms) assert.deepEqual(seen.filter((s) => s.room === r).map((s) => s.rev), [1, 2, 3, 4, 5, 6, 7, 8], `${r} in rev order, each once`);
  const by = new Set(seen.map((s) => s.who));
  assert.ok(by.size >= 2, `the work was shared by several workers in parallel (${[...by].join(',')})`);
});

test(`ordering: effects outside the database (${STUB_LABEL}) leave in aggregate_rev order, one at a time per room, never inside a transaction`, { timeout: 60000 }, async () => {
  stub.reset();
  const rooms = ['R-ORD-X1', 'R-ORD-X2', 'R-ORD-X3', 'R-ORD-X4'];
  const t0 = Date.now() - 60000;
  const rows = [];
  for (let rev = 1; rev <= 5; rev += 1) for (const [i, r] of rooms.entries()) rows.push({ aggId: r, rev, at: new Date(t0 + rev * 1000 + i).toISOString() });
  const ids = await insertEvents(rows);
  const ws = ['a', 'b', 'c'].map((x) => { const app = `outbox-test-ext-${x}`; return worker(app, undefined, { externalSinks: [localStubSinkAdapter({ url: stub.url, workerApplication: app, accepts: (e) => e.aggregate_id.startsWith('R-ORD-X') })] }); });
  const deadline = Date.now() + 40000;
  const left = async () => (await one("SELECT count(*)::int AS n FROM app.outbox_event WHERE id = ANY($1::uuid[]) AND status <> 'DELIVERED'", [ids])).n;
  await Promise.all(ws.map(async (w) => { while (Date.now() < deadline && (await left()) > 0) { if (!(await w.tick(4))) await sleep(3); } }));
  assert.equal(await left(), 0, 'every event delivered');
  assert.equal(stub.effects.size, ids.length, 'one effect per event');
  for (const r of rooms) assert.deepEqual(stub.calls.filter((x) => x.body.aggregate.id === r).map((x) => x.body.aggregate.rev), [1, 2, 3, 4, 5], `${r}: external calls in rev order`);
  assert.deepEqual(stub.calls.filter((x) => x.earlierUndelivered > 0).map((x) => `${x.body.aggregate.id}#${x.body.aggregate.rev}`), [], 'no call while an earlier rev of the room was undelivered');
  assert.deepEqual(stub.calls.filter((x) => x.workerInTransaction), [], 'no external call inside a database transaction');
  assert.ok(new Set(stub.calls.map((x) => x.workerApplication)).size >= 2, 'several workers delivered in parallel');
});

test('ordering: a later rev never overtakes an earlier one that is retrying or dead-lettered; other rooms keep flowing; a replay releases the held events in order', { timeout: 60000 }, async () => {
  const t0 = Date.now() - 60000;
  const ids = await insertEvents([1, 2, 3].flatMap((rev) => [{ aggId: 'R-ORD-HOLD', rev, at: new Date(t0 + rev * 1000).toISOString() }, { aggId: 'R-ORD-FREE', rev, at: new Date(t0 + rev * 1000 + 1).toISOString() }]));
  const hold = ids.filter((_, i) => i % 2 === 0); const free = ids.filter((_, i) => i % 2 === 1);
  let failing = true; const handled = [];
  const flaky = named('test-flaky-handler', async (_q, e) => {
    if (!e.aggregate_id.startsWith('R-ORD-HOLD') && !e.aggregate_id.startsWith('R-ORD-FREE')) return;
    if (failing && e.id === hold[0]) throw new Error('injected failure of R-ORD-HOLD rev 1 (outbox test)');
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
  assert.deepEqual(handled.filter((x) => x.startsWith('R-ORD-HOLD')), [], 'no R-ORD-HOLD event was handled');
  assert.deepEqual(handled.filter((x) => x.startsWith('R-ORD-FREE')), ['R-ORD-FREE#1', 'R-ORD-FREE#2', 'R-ORD-FREE#3']);
  // the security admin sees the dead letter and the held events, fixes the cause and replays: rev 1, 2, 3 in order
  const dl = await c.call('GET', '/v1/admin/outbox?status=DEAD_LETTER', { token: T.secadmin });
  assert.ok(dl.body.items.some((x) => x.id === hold[0]));
  const pend = await c.call('GET', '/v1/admin/outbox?status=PENDING', { token: T.secadmin });
  for (const id of hold.slice(1)) assert.ok(pend.body.items.some((x) => x.id === id), 'held events are visible as PENDING');
  failing = false;
  const r = await c.call('POST', `/v1/admin/outbox/${hold[0]}/retry`, { token: T.secadmin, body: { reason: 'synthetic: the flaky handler was fixed (outbox ordering test)' } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  await drainWith(w);
  assert.deepEqual(handled.filter((x) => x.startsWith('R-ORD-HOLD')), ['R-ORD-HOLD#1', 'R-ORD-HOLD#2', 'R-ORD-HOLD#3']);
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

test('real Teams / Outlook connector idempotency', { skip: 'NOT RUN: no real Teams or Outlook connector exists in this repository; deduplication is proven only against the local stub sink' }, () => {});
