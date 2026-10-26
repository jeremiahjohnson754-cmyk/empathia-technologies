#!/usr/bin/env node
/**
 * One command for the local production starter:
 *   node scripts/dev.mjs            start PostgreSQL, migrate, seed, then run the API (with its outbox worker) on :4100,
 *                                   the enterprise web app on :4200 and the Python intelligence service on :4300
 *   node scripts/dev.mjs --reset    drop and re-seed the development database first
 *   node scripts/dev.mjs --no-python  skip the Python service
 * Ctrl-C stops every process this script started. The database keeps running (node scripts/db.mjs down stops it).
 * Build first: node scripts/build.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const need = [['services/enterprise-api/dist/src/main.js', 'node scripts/build.mjs'], ['apps/enterprise-web/dist/index.html', 'node scripts/build.mjs']];
for (const [f, how] of need) if (!fs.existsSync(path.join(root, f))) { console.error(`missing ${f} — run: ${how}`); process.exit(1); }

const step = (name, args) => { process.stdout.write(`• ${name} … `); const r = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' }); if (r.status !== 0) { console.log('FAILED'); console.error(r.stdout + r.stderr); process.exit(1); } console.log('done'); return r.stdout; };
step('PostgreSQL (local cluster under .local/pg)', ['scripts/db.mjs', process.argv.includes('--reset') ? 'reset' : 'up']);
const seed = step('migrations and synthetic seed', ['services/enterprise-api/dist/src/db/seed.js']);

const kids = [];
const env = { ...process.env };
const tokenFile = path.join(root, '.local/intelligence-token');
if (!fs.existsSync(tokenFile)) fs.writeFileSync(tokenFile, crypto.randomBytes(24).toString('base64url'), { mode: 0o600 });
env.INTELLIGENCE_TOKEN = fs.readFileSync(tokenFile, 'utf8').trim();
const start = (name, cmd, args, cwd = root) => {
  const p = spawn(cmd, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const tag = (d) => String(d).split('\n').filter(Boolean).forEach((l) => console.log(`[${name}] ${l}`));
  p.stdout.on('data', tag); p.stderr.on('data', tag);
  p.on('exit', (c) => { console.log(`[${name}] exited (${c})`); });
  kids.push(p); return p;
};
start('api', process.execPath, ['services/enterprise-api/dist/src/main.js']);
start('web', process.execPath, ['apps/enterprise-web/server/serve.mjs']);
if (!process.argv.includes('--no-python')) start('intelligence', 'python3', ['-I', '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '4300', '--log-level', 'warning'], path.join(root, 'services/intelligence-python'));

console.log(`
Empathia production starter (synthetic data — not production-ready)
  web app        http://127.0.0.1:4200/
  API            http://127.0.0.1:4100/health   ·   OpenAPI http://127.0.0.1:4100/v1/openapi.json
  intelligence   http://127.0.0.1:4300/health   (research prototype on synthetic data)
  sign in        any seeded role; development password in services/enterprise-api/src/db/seed.ts (DEV_PASSWORD)
  seed           ${seed.trim().slice(0, 200)}
Ctrl-C stops these processes.`);
const stop = () => { for (const p of kids) p.kill('SIGTERM'); setTimeout(() => process.exit(0), 500); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
