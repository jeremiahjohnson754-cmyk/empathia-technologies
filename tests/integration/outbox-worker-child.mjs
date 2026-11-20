#!/usr/bin/env node
/**
 * TEST-ONLY outbox worker child process, used by tests/integration/outbox.test.mjs to kill a real worker with SIGKILL at a controlled
 * point. All fault injection lives in this file; the production worker (services/enterprise-api/src/worker/outbox.ts) has no fault hook.
 *
 * Gate: it refuses to start unless EMPATHIA_OUTBOX_FAULT_INJECTION=test-only and the database it is given is named empathia_test_*.
 *
 * The child runs the real OutboxWorker (from services/enterprise-api/dist) as the empathia_worker role with the real handlers, plus one
 * fault point chosen by OUTBOX_CHILD_MODE. At the fault point it prints a marker line on stdout and then waits forever, so the parent
 * can observe the database at exactly that moment and then kill the process:
 *   pause-in-tx           after the real internal handlers ran for the first event, inside the delivery transaction, before COMMIT
 *                         (marker: PAUSED_IN_TX <event id>)
 *   pause-after-external  after the local stub sink accepted the event (an effect outside the database), before the worker records
 *                         the delivery receipt (marker: EXTERNAL_DONE <event id> <idempotency key>)
 * When the tick ends without reaching the fault point it prints TICK_DONE and exits.
 *
 * Environment: OUTBOX_CHILD_DB_URL (empathia_worker URL), OUTBOX_CHILD_APP (application_name), OUTBOX_CHILD_MODE,
 * OUTBOX_STUB_URL (pause-after-external), OUTBOX_CHILD_LEASE_MS, OUTBOX_CHILD_EXTERNAL_TIMEOUT_MS.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { localStubSinkAdapter } from './outbox-stub-sink.mjs';

const env = process.env;
const refuse = (why) => { process.stderr.write(`outbox-worker-child refused: ${why}\n`); process.exit(2); };
if (env.EMPATHIA_OUTBOX_FAULT_INJECTION !== 'test-only') refuse('set EMPATHIA_OUTBOX_FAULT_INJECTION=test-only (fault injection is for tests only)');
let dbName = '';
try { dbName = new URL(env.OUTBOX_CHILD_DB_URL || '').pathname.replace(/^\//, ''); } catch { refuse('OUTBOX_CHILD_DB_URL is not a URL'); }
if (!/^empathia_test_/.test(dbName)) refuse(`the database must be a test database (empathia_test_*), not "${dbName}"`);
const mode = env.OUTBOX_CHILD_MODE || '';
if (!['pause-in-tx', 'pause-after-external'].includes(mode)) refuse(`unknown OUTBOX_CHILD_MODE "${mode}"`);

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const api = path.join(repo, 'services/enterprise-api/dist/src');
const { OutboxWorker, readModelHandler, notificationHandler } = await import(path.join(api, 'worker/outbox.js'));
const { PgPool, configFromUrl } = await import(path.join(api, 'db/pg.js'));

const app = env.OUTBOX_CHILD_APP || 'outbox-test-child';
const pool = new PgPool({ ...configFromUrl(env.OUTBOX_CHILD_DB_URL), applicationName: app }, 2);
const say = (s) => process.stdout.write(`${s}\n`);
const forever = () => new Promise(() => { setInterval(() => {}, 1 << 30); });
let fired = false;

const handlers = [readModelHandler, notificationHandler];
const externalSinks = [];
if (mode === 'pause-in-tx') {
  const pauseInTx = async (_q, e) => { if (fired) return; fired = true; say(`PAUSED_IN_TX ${e.id}`); await forever(); };
  Object.defineProperty(pauseInTx, 'name', { value: 'test-fault-pause-in-tx' });
  handlers.push(pauseInTx);
}
if (mode === 'pause-after-external') {
  const stub = localStubSinkAdapter({ url: env.OUTBOX_STUB_URL, workerApplication: app });
  externalSinks.push({ name: stub.name, async deliver(e, key, signal) { await stub.deliver(e, key, signal); if (!fired) { fired = true; say(`EXTERNAL_DONE ${e.id} ${key}`); await forever(); } } });
}

const worker = new OutboxWorker(pool, handlers, 3600000, { externalSinks, workerId: app, leaseMs: Number(env.OUTBOX_CHILD_LEASE_MS || 2000), externalTimeoutMs: Number(env.OUTBOX_CHILD_EXTERNAL_TIMEOUT_MS || 1000) });
say(`READY ${process.pid}`);
const n = await worker.tick();
say(`TICK_DONE ${n}`);
await pool.end();
