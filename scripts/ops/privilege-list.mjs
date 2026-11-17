#!/usr/bin/env node
/**
 * The privilege list the service checks itself against (database/migrations/PRIVILEGES.json), regenerated or checked on a database
 * that the migrations have just made (docs/operations/DATABASE_PRIVILEGES.md: "After adding a migration: regenerate the list in the
 * same commit").
 *
 *   node scripts/ops/privilege-list.mjs --write     after adding a migration
 *   node scripts/ops/privilege-list.mjs --check     the list is what the migrations produce (exit 1 otherwise)
 *
 * It makes a scratch database in the local development cluster (scripts/db.mjs up), runs every migration into it as the owner, asks
 * the service's own command for the list, and drops the database. Nothing else is touched.
 */
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync, execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const mode = process.argv.includes('--write') ? '--write' : process.argv.includes('--check') ? '--check' : '';
if (!mode) { console.error('usage: privilege-list.mjs --write | --check'); process.exit(2); }
execFileSync(process.execPath, [path.join(repo, 'scripts/db.mjs'), 'up'], { stdio: 'ignore' });
const c = JSON.parse(fs.readFileSync(path.join(repo, '.local/pg/credentials.json'), 'utf8')); const db = `empathia_privlist_${process.pid}`;
const psql = ['/usr/lib/postgresql/16/bin/psql', '/usr/local/opt/postgresql@16/bin/psql', '/opt/homebrew/opt/postgresql@16/bin/psql'].find((p) => fs.existsSync(p)) || 'psql';
const su = (sql) => { const r = spawnSync(psql, ['-h', '127.0.0.1', '-p', String(c.port), '-U', c.superuser, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-qAt', '-c', sql], { env: { ...process.env, PGPASSWORD: c.superPassword }, encoding: 'utf8' }); if (r.status !== 0) throw new Error(r.stderr.trim()); };
const url = (u, p) => `postgres://${u}:${encodeURIComponent(p)}@127.0.0.1:${c.port}/${db}`;
const env = { ...process.env, DATABASE_URL: url(c.owner, c.ownerPassword), APP_DATABASE_URL: url(c.app, c.appPassword), WORKER_DATABASE_URL: url(c.worker, c.workerPassword) };
const api = path.join(repo, 'services/enterprise-api/dist/src/db'); let code = 1;
try {
  su(`CREATE DATABASE ${db} OWNER ${c.owner}`);
  const m = spawnSync(process.execPath, [path.join(api, 'migrate.js')], { env, encoding: 'utf8' }); if (m.status !== 0) throw new Error(`the migrations did not run: ${(m.stderr || m.stdout).trim().split('\n').pop()}`);
  const r = spawnSync(process.execPath, [path.join(api, 'privileges.js'), 'expected', mode], { env, encoding: 'utf8' }); console.log((r.stdout || r.stderr).trim()); code = r.status ?? 1;
} catch (e) { console.error(`privilege-list: ${e.message}`); } finally { try { su(`DROP DATABASE IF EXISTS ${db} WITH (FORCE)`); } catch { /* left for the next reset */ } }
process.exit(code);
