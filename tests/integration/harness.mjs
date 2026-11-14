/**
 * Integration-test harness: a fresh database (empathia_test) on the local PostgreSQL, migrated and seeded through the real code,
 * and the real API started in-process on a free port. Credentials come from .local/pg/credentials.json (scripts/db.mjs up).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const api = path.join(repo, 'services/enterprise-api/dist/src');

export async function setup({ db = 'empathia_test', port = 4199, env = {} } = {}) {
  execFileSync(process.execPath, [path.join(repo, 'scripts/db.mjs'), 'up'], { stdio: 'ignore' });
  const c = JSON.parse(fs.readFileSync(path.join(repo, '.local/pg/credentials.json'), 'utf8'));
  const psqlBin = ['/usr/lib/postgresql/16/bin/psql'].find((p) => fs.existsSync(p)) || 'psql';
  const sql = (s, database = 'postgres') => {
    const r = spawnSync(psqlBin, ['-h', '127.0.0.1', '-p', String(c.port), '-U', c.superuser, '-d', database, '-v', 'ON_ERROR_STOP=1', '-qAt', '-c', s], { env: { ...process.env, PGPASSWORD: c.superPassword }, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(r.stderr);
    return r.stdout.trim();
  };
  sql(`DROP DATABASE IF EXISTS ${db} WITH (FORCE)`);
  sql(`CREATE DATABASE ${db} OWNER ${c.owner}`);
  sql(`REVOKE ALL ON DATABASE ${db} FROM PUBLIC; GRANT CONNECT ON DATABASE ${db} TO ${c.app}, ${c.worker};`);
  const urls = {
    DATABASE_URL: `postgres://${c.owner}:${encodeURIComponent(c.ownerPassword)}@127.0.0.1:${c.port}/${db}`,
    APP_DATABASE_URL: `postgres://${c.app}:${encodeURIComponent(c.appPassword)}@127.0.0.1:${c.port}/${db}`,
    WORKER_DATABASE_URL: `postgres://${c.worker}:${encodeURIComponent(c.workerPassword)}@127.0.0.1:${c.port}/${db}`,
  };
  Object.assign(process.env, urls, { NODE_ENV: 'test', PORT: String(port), WORKER: 'off', LOG_LEVEL: 'warn', OBJECT_STORE_DIR: path.join(repo, `.local/objects-${db}`) }, env);
  const { seed } = await import(path.join(api, 'db/seed.js'));
  const seeded = await seed();
  const { start } = await import(path.join(api, 'main.js'));
  const app = await start();
  const { OutboxWorker } = await import(path.join(api, 'worker/outbox.js'));
  const base = `http://127.0.0.1:${port}`;
  // superuser SQL against the test database (for checks the API must not be able to do, and for low-level negative tests)
  const asSuper = (s) => sql(s, db);
  // runtime-role SQL (RLS applies): a raw connection as empathia_app
  const { PgConnection, configFromUrl } = await import(path.join(api, 'db/pg.js'));
  const appConn = async () => { const k = new PgConnection(configFromUrl(urls.APP_DATABASE_URL)); await k.connect(); return k; };
  return { base, app, seeded, urls, asSuper, appConn, drain: () => new OutboxWorker(app.workerPool).drain(), OutboxWorker, creds: c };
}

export const DEV_PASSWORD = 'empathia-dev-only';
export const mail = (role, tenant = 'empathia-demo') => `${role.replace(/_/g, '-')}@${tenant}.empathia.invalid`;

/** A tiny API client: JSON in/out, the bearer token, idempotency keys; returns { status, body, headers }. */
export function client(base) {
  const call = async (method, p, { token, body, headers = {}, raw } = {}) => {
    const r = await fetch(base + p, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers }, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
    const text = await r.text(); let json = null; try { json = text ? JSON.parse(text) : null; } catch { json = text; }
    return { status: r.status, body: json, headers: Object.fromEntries(r.headers) };
  };
  const tokens = {};
  const login = async (role, tenant = 'empathia-demo', who) => {
    const k = `${tenant}/${who || role}`;
    if (!tokens[k]) { const r = await call('POST', '/v1/auth/token', { body: { email: who ? `${who}@${tenant}.empathia.invalid` : mail(role, tenant), password: DEV_PASSWORD, tenant, role } }); if (r.status !== 200) throw new Error(`login ${k}: ${r.status} ${JSON.stringify(r.body)}`); tokens[k] = r.body.accessToken; }
    return tokens[k];
  };
  return { call, login };
}

/**
 * Fill a room's device register so commissioning may start (founder, 14 Nov 2026: the device register is a gate before commissioning).
 * Synthetic values only: a declared serial for every unit; a hostname and a private IPv4 address for every networked unit, unique within
 * this process (`serialOf(item)` may name a unit's serial). `c` is a harness client and `token` the installer's. Returns the register afterwards.
 */
let regSeq = 0;
export async function registerRoom(c, room, token, { serialOf = () => undefined } = {}) {
  const get = async () => (await c.call('GET', `/v1/rooms/${room}/register`, { token })).body;
  const b = await get();
  if (!b || !Array.isArray(b.items)) throw new Error(`register of ${room}: ${JSON.stringify(b).slice(0, 300)}`);
  for (const x of b.items) {
    if (!x.asset || !x.missing.length) continue;
    const n = ++regSeq; const tag = `${process.pid % 200}-${n}`;
    if (x.missing.includes('hostname') || x.missing.includes('IP address')) {
      const w = await c.call('PUT', `/v1/assets/${x.asset}/register`, { token, body: { hostname: `syn-${room.toLowerCase()}-${n}`, ip: `10.${(process.pid % 200) + 20}.${Math.floor(n / 250) % 250}.${(n % 250) + 2}` } });
      if (w.status !== 200) throw new Error(`register ${x.asset}: ${w.status} ${JSON.stringify(w.body).slice(0, 300)}`);
    }
    if (x.missing.includes('serial')) {
      const s = await c.call('POST', `/v1/assets/${x.asset}/identity`, { token, body: { state: 'DECLARED', serial: serialOf(x) || `SYN-SN-${room}-${tag}` } });
      if (s.status !== 200) throw new Error(`identity ${x.asset}: ${s.status} ${JSON.stringify(s.body).slice(0, 300)}`);
    }
  }
  const after = await get();
  const open = after.items.filter((x) => x.missing.length);
  if (open.length) throw new Error(`register of ${room} still open: ${JSON.stringify(open).slice(0, 300)}`);
  return after;
}
