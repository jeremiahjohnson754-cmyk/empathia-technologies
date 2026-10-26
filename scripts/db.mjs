#!/usr/bin/env node
/**
 * A local PostgreSQL 16 for development and tests, without Docker: initdb + pg_ctl into .local/pg (git-ignored).
 *
 *   node scripts/db.mjs up       create (first time) and start; prints DATABASE_URL and APP_DATABASE_URL
 *   node scripts/db.mjs down     stop
 *   node scripts/db.mjs status   running or not
 *   node scripts/db.mjs reset    stop, delete the local cluster, create it again (destroys local dev data only)
 *
 * With Docker available, `docker compose up db` (docker-compose.yml) gives the same database instead; set DATABASE_URL.
 * Credentials: random passwords generated at first run into .local/pg/credentials.json (mode 600), SCRAM-SHA-256 only.
 * Two roles: `empathia_owner` (owns the schema, runs migrations) and `empathia_app` (the API's runtime role: no BYPASSRLS, not
 * a superuser, so row-level security applies to it).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(repo, '.local/pg');
const data = path.join(base, 'data');
const credsFile = path.join(base, 'credentials.json');
// the port chosen when the cluster was created wins (so a second checkout on another port keeps it), then EMPATHIA_PG_PORT, then 55432
const PORT = Number((fs.existsSync(credsFile) && JSON.parse(fs.readFileSync(credsFile, 'utf8')).port) || process.env.EMPATHIA_PG_PORT || 55432);
const BIN = ['/usr/lib/postgresql/16/bin', '/usr/local/opt/postgresql@16/bin', '/opt/homebrew/opt/postgresql@16/bin', '/usr/pgsql-16/bin']
  .find((d) => fs.existsSync(path.join(d, 'initdb'))) || '';
const bin = (n) => (BIN ? path.join(BIN, n) : n);
const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
// PostgreSQL refuses to run as root; on a root-only machine (containers) run it as the `postgres` system user.
const run = (cmd, args, opts = {}) => {
  const r = isRoot ? spawnSync('runuser', ['-u', 'postgres', '--', cmd, ...args], { encoding: 'utf8', ...opts }) : spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return r;
};
const running = () => run(bin('pg_ctl'), ['-D', data, 'status']).status === 0;

function creds() {
  if (fs.existsSync(credsFile)) {
    const c = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
    // clusters created before the worker role existed get one now (KV-08)
    if (!c.worker) { c.worker = 'empathia_worker'; c.workerPassword = crypto.randomBytes(18).toString('base64url'); fs.writeFileSync(credsFile, JSON.stringify(c, null, 1), { mode: 0o600 }); }
    return c;
  }
  const c = { superuser: 'empathia_admin', superPassword: crypto.randomBytes(18).toString('base64url'), owner: 'empathia_owner', ownerPassword: crypto.randomBytes(18).toString('base64url'), app: 'empathia_app', appPassword: crypto.randomBytes(18).toString('base64url'), worker: 'empathia_worker', workerPassword: crypto.randomBytes(18).toString('base64url'), database: 'empathia', port: PORT };
  fs.mkdirSync(base, { recursive: true });
  fs.writeFileSync(credsFile, JSON.stringify(c, null, 1), { mode: 0o600 });
  return c;
}

function init() {
  const c = creds();
  if (fs.existsSync(path.join(data, 'PG_VERSION'))) return c;
  fs.mkdirSync(data, { recursive: true });
  const pw = path.join(base, '.pw'); fs.writeFileSync(pw, c.superPassword, { mode: 0o600 });
  if (isRoot) { execFileSync('chown', ['-R', 'postgres', base]); }
  const r = run(bin('initdb'), ['-D', data, '-U', c.superuser, '--pwfile', pw, '-A', 'scram-sha-256', '-E', 'UTF8', '--locale=C.UTF-8']);
  fs.rmSync(pw, { force: true });
  if (r.status !== 0) throw new Error(`initdb failed: ${r.stderr || r.stdout}`);
  fs.appendFileSync(path.join(data, 'postgresql.conf'), `\n# empathia local development\nlisten_addresses = '127.0.0.1'\nport = ${PORT}\nunix_socket_directories = '${base}'\npassword_encryption = 'scram-sha-256'\nlog_min_duration_statement = 500\n`);
  return c;
}

function start() {
  const c = init();
  if (!running()) {
    const r = run(bin('pg_ctl'), ['-D', data, '-l', path.join(base, 'server.log'), '-w', 'start']);
    if (r.status !== 0) throw new Error(`pg_ctl start failed: ${r.stderr || r.stdout}\n${fs.existsSync(path.join(base, 'server.log')) ? fs.readFileSync(path.join(base, 'server.log'), 'utf8').slice(-2000) : ''}`);
  }
  // create the database and the two roles (idempotent)
  const psql = (sql, db = 'postgres') => run(bin('psql'), ['-h', '127.0.0.1', '-p', String(PORT), '-U', c.superuser, '-d', db, '-v', 'ON_ERROR_STOP=1', '-qAt', '-c', sql], { env: { ...process.env, PGPASSWORD: c.superPassword } });
  const q = (s) => s.replace(/'/g, "''");
  const steps = [
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${c.owner}') THEN CREATE ROLE ${c.owner} LOGIN PASSWORD '${q(c.ownerPassword)}'; END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${c.app}') THEN CREATE ROLE ${c.app} LOGIN PASSWORD '${q(c.appPassword)}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE; END IF; END $$;`,
    // the outbox worker's own role: the only role the cross-tenant worker policies admit (migration 0008)
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${c.worker}') THEN CREATE ROLE ${c.worker} LOGIN PASSWORD '${q(c.workerPassword)}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE; END IF; END $$;`,
  ];
  for (const s of steps) { const r = psql(s); if (r.status !== 0) throw new Error(r.stderr); }
  if (psql(`SELECT 1 FROM pg_database WHERE datname = '${c.database}'`).stdout.trim() !== '1') { const r = psql(`CREATE DATABASE ${c.database} OWNER ${c.owner}`); if (r.status !== 0) throw new Error(r.stderr); }
  psql(`REVOKE ALL ON DATABASE ${c.database} FROM PUBLIC; GRANT CONNECT ON DATABASE ${c.database} TO ${c.app}, ${c.worker};`);
  return c;
}

const urls = (c) => ({
  DATABASE_URL: `postgres://${c.owner}:${encodeURIComponent(c.ownerPassword)}@127.0.0.1:${c.port}/${c.database}`,
  APP_DATABASE_URL: `postgres://${c.app}:${encodeURIComponent(c.appPassword)}@127.0.0.1:${c.port}/${c.database}`,
  WORKER_DATABASE_URL: `postgres://${c.worker}:${encodeURIComponent(c.workerPassword)}@127.0.0.1:${c.port}/${c.database}`,
});

const cmd = process.argv[2] || 'status';
if (!BIN && cmd !== 'status') { console.error('PostgreSQL 16 binaries were not found. Install PostgreSQL 16, or run `docker compose up db` and set DATABASE_URL.'); process.exit(2); }
if (cmd === 'up') { const c = start(); fs.writeFileSync(path.join(base, 'env'), Object.entries(urls(c)).map(([k, v]) => `${k}=${v}`).join('\n') + '\n', { mode: 0o600 }); console.log(JSON.stringify({ state: 'running', port: c.port, envFile: path.relative(repo, path.join(base, 'env')) })); }
else if (cmd === 'down') { if (running()) run(bin('pg_ctl'), ['-D', data, '-m', 'fast', '-w', 'stop']); console.log(JSON.stringify({ state: 'stopped' })); }
else if (cmd === 'reset') { if (running()) run(bin('pg_ctl'), ['-D', data, '-m', 'fast', '-w', 'stop']); fs.rmSync(base, { recursive: true, force: true }); const c = start(); fs.writeFileSync(path.join(base, 'env'), Object.entries(urls(c)).map(([k, v]) => `${k}=${v}`).join('\n') + '\n', { mode: 0o600 }); console.log(JSON.stringify({ state: 'running', reset: true, port: c.port })); }
else { console.log(JSON.stringify({ state: BIN && fs.existsSync(data) && running() ? 'running' : 'stopped', bin: BIN || null })); }
