/**
 * Start the enterprise API (and, unless WORKER=off, the in-process outbox worker).
 *   node dist/src/main.js            (after node scripts/db.mjs up, migrate and seed — or use node scripts/dev.mjs)
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, type Config } from './config.js';
import { PgPool, configFromUrl } from './db/pg.js';
import { Hs256Tokens } from './auth/jwt.js';
import { LocalObjectStore } from './storage/objectStore.js';
import { buildRoutes } from './modules/routes.js';
import { createServer } from './http/server.js';
import { OutboxWorker } from './worker/outbox.js';
import { log } from './log.js';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

export async function start(over: Partial<Record<string, string>> = {}) {
  const cfg: Config = loadConfig(repoRoot, over);
  const pool = new PgPool({ ...configFromUrl(cfg.databaseUrl), applicationName: 'empathia-enterprise-api' }, 10);
  const tokens = new Hs256Tokens(cfg.jwtSecret, cfg.jwtIssuer, cfg.jwtAudience, cfg.tokenTtlSeconds);
  const store = new LocalObjectStore(cfg.objectStoreDir);
  const workerPool = new PgPool({ ...configFromUrl(cfg.workerDatabaseUrl), applicationName: 'empathia-outbox-worker' }, 2);
  const worker = new OutboxWorker(workerPool, undefined, cfg.workerIntervalMs);
  const health = async () => {
    const t0 = Date.now();
    try {
      const db = (await pool.query<{ v: string; m: number }>("SELECT current_setting('server_version') AS v, app.migrations_applied() AS m")).rows[0]!;
      return { status: 'ok', service: 'empathia-enterprise-api', version: '0.1.0', database: { reachable: true, serverVersion: db.v, migrationsApplied: db.m, ms: Date.now() - t0 }, authMode: cfg.authMode, objectStore: store.kind, worker: { delivered: worker.delivered, failed: worker.failed, deadLettered: worker.dead }, liveHealth: 'NOT_MONITORED', note: 'production starter on synthetic data — not production-ready' };
    } catch (e) { return { status: 'degraded', database: { reachable: false, error: (e as Error).message } }; }
  };
  const router = buildRoutes({ pool, tokens, store, health, authMode: cfg.authMode });
  const server = createServer(cfg, router, pool, tokens);
  await new Promise<void>((ok) => server.listen(cfg.port, cfg.host, ok));
  if (process.env['WORKER'] !== 'off') worker.start();
  log('info', 'enterprise-api listening', { url: `http://${cfg.host}:${cfg.port}`, authMode: cfg.authMode, env: cfg.env });
  const stop = async () => { worker.stop(); await new Promise((ok) => server.close(() => ok(null))); await pool.end(); await workerPool.end(); };
  return { server, pool, workerPool, worker, tokens, router, cfg, stop };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  start().then(({ stop }) => {
    const bye = () => { log('info', 'shutting down'); void stop().then(() => process.exit(0)); };
    process.on('SIGINT', bye); process.on('SIGTERM', bye);
  }).catch((e) => { log('error', 'failed to start', { error: (e as Error).message }); process.exit(1); });
}
