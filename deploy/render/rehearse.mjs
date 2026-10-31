#!/usr/bin/env node
/**
 * Local rehearsal of the Render staging sequence, run from the ASSEMBLED runtime tree (what the image contains), against a throwaway
 * database in the local cluster and a throwaway local OIDC provider. Nothing leaves this machine; nothing is provisioned.
 *   node scripts/build.mjs && node deploy/render/assemble-runtime.mjs --out=/tmp/out && node deploy/render/rehearse.mjs --rt=/tmp/out
 * Steps (as on Render): V-1 role gate (refused as the plain owner, passes for a role-creating user) → bootstrap-roles.sql → migrations
 * (owner) → operator bootstrap (one non-synthetic tenant + its OIDC-only security administrator) → API (AUTH_MODE=oidc, TRUSTED_PROXY=on)
 * and web server from the runtime tree → deployment tests (scripts/staging/smoke.mjs) with a provider-signed token → Host allow-list.
 * Writes tests/evidence/RENDER_REHEARSAL.json. Limits: NODE_ENV=development here because the local provider is http (production
 * requires an https JWKS); no TLS, no Render proxy, no container — those are checked only on Render.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rt = path.resolve((process.argv.find((a) => a.startsWith('--rt=')) || '--rt=/tmp/out').slice(5));
const creds = JSON.parse(fs.readFileSync(path.join(repo, '.local/pg/credentials.json'), 'utf8'));
const BIN = ['/usr/lib/postgresql/16/bin', '/usr/lib/postgresql/17/bin', '/usr/local/pgsql/bin'].find((d) => fs.existsSync(path.join(d, 'psql'))) || '';
const DB = 'empathia_render_rehearsal';
const url = (u, p) => `postgres://${u}:${encodeURIComponent(p)}@127.0.0.1:${creds.port}/${DB}`;
const OWNER = url(creds.owner, creds.ownerPassword), APP = url(creds.app, creds.appPassword), WORKER = url(creds.worker, creds.workerPassword);
const psql = (user, pass, db, args) => spawnSync(path.join(BIN, 'psql'), ['-h', '127.0.0.1', '-p', String(creds.port), '-U', user, '-d', db, '-v', 'ON_ERROR_STOP=1', '-qAt', ...args], { env: { ...process.env, PGPASSWORD: pass }, encoding: 'utf8' });
const steps = []; const step = (name, ok, detail = '') => { steps.push({ name, result: ok ? 'PASS' : 'FAIL', detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`); return ok; };
const node = (args, env, opts = {}) => spawnSync(process.execPath, args, { cwd: rt, env: { ...process.env, ...env }, encoding: 'utf8', ...opts });
const procs = [];
const startProc = (args, env) => { const p = spawn(process.execPath, args, { cwd: rt, env: { PATH: process.env.PATH, ...env }, stdio: ['ignore', 'pipe', 'pipe'] }); let log = ''; p.stdout.on('data', (d) => { log += d; }); p.stderr.on('data', (d) => { log += d; }); procs.push(p); p.logs = () => log; return p; };
const waitFor = async (u, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fetch(u); if (r.status < 500) return true; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 250)); } return false; };

let jwks;
try {
  // database
  psql(creds.superuser, creds.superPassword, 'postgres', ['-c', `DROP DATABASE IF EXISTS ${DB}`]);
  step('create the throwaway database (owner = the schema owner)', psql(creds.superuser, creds.superPassword, 'postgres', ['-c', `CREATE DATABASE ${DB} OWNER ${creds.owner}`]).status === 0);
  const roleSql = path.join(rt, '..', 'bootstrap-roles.sql'); fs.copyFileSync(path.join(repo, 'deploy/render/bootstrap-roles.sql'), roleSql);
  const asOwner = psql(creds.owner, creds.ownerPassword, DB, ['-v', 'app_password=x', '-v', 'worker_password=y', '-f', roleSql]);
  step('V-1 gate refuses a default user that cannot create roles', asOwner.status !== 0 && /V-1 failed/.test(asOwner.stderr), asOwner.stderr.split('\n').find((l) => /V-1/.test(l)) || asOwner.stderr.slice(0, 120));
  const asCreator = psql(creds.superuser, creds.superPassword, DB, ['-v', `app_password=${creds.appPassword}`, '-v', `worker_password=${creds.workerPassword}`, '-f', roleSql]);
  step('bootstrap-roles.sql passes for a role-creating user (idempotent: the roles already exist locally) and reports NOBYPASSRLS', asCreator.status === 0 && /empathia_app\|t\|f\|f/.test(asCreator.stdout) && /empathia_worker\|t\|f\|f/.test(asCreator.stdout), asCreator.stdout.trim().split('\n').slice(-2).join(' / ') || asCreator.stderr.slice(0, 200));
  // migrations, from the runtime tree, as the owner (Render: the pre-deploy command)
  const PRE = { DATABASE_URL: OWNER, APP_DATABASE_URL: APP, WORKER_DATABASE_URL: WORKER };   // Render: the pre-deploy command shares the service's environment
  const mig = node(['services/enterprise-api/dist/src/db/migrate.js'], PRE);
  const nMig = fs.readdirSync(path.join(repo, 'database/migrations')).filter((f) => /^\d{4}_.*\.sql$/.test(f)).length;
  step(`migrations apply from the runtime tree (${nMig})`, mig.status === 0, (mig.stdout + mig.stderr).trim().split('\n').slice(-1)[0]);
  const mig2 = node(['services/enterprise-api/dist/src/db/migrate.js'], PRE);
  step('migrations are idempotent (a second run applies nothing)', mig2.status === 0, (mig2.stdout + mig2.stderr).trim().split('\n').slice(-1)[0]);
  // operator bootstrap
  const boot = node(['services/enterprise-api/dist/src/db/bootstrap.js', '--tenant=rehearsal-staging', '--tenant-name=Rehearsal (staging)', '--site=SITE-HQ:Headquarters', '--building=HQ1:Main building:6:SITE-HQ', '--admin-email=it-admin@rehearsal.example', '--admin-name=IT Admin (rehearsal)', '--operator=rehearsal'], { DATABASE_URL: OWNER });
  step('operator bootstrap: policy + one non-synthetic tenant + its OIDC-only security administrator', boot.status === 0, (boot.status === 0 ? JSON.parse(boot.stdout).rolesLoaded + ' roles' : boot.stderr).toString().slice(0, 160));
  const seedRefused = node(['services/enterprise-api/dist/src/db/bootstrap.js', '--tenant=empathia-demo', '--tenant-name=x', '--admin-email=a@b.c'], { DATABASE_URL: OWNER });
  step('the bootstrap refuses a synthetic seed tenant slug', seedRefused.status !== 0 && /synthetic seed tenant/.test(seedRefused.stderr));
  const nPw = psql(creds.superuser, creds.superPassword, DB, ['-c', "SELECT count(*) FROM app.person WHERE password_hash IS NOT NULL"]).stdout.trim();
  step('no password exists in the environment (OIDC only, no seed)', nPw === '0', `${nPw} people with a password`);
  // local OIDC provider
  const key = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const served = { keys: [{ ...key.publicKey.export({ format: 'jwk' }), kid: 'rehearsal', use: 'sig', alg: 'RS256' }] };
  jwks = http.createServer((req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(served)); }); await new Promise((r) => jwks.listen(4175, '127.0.0.1', r));
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url'); const now = Math.floor(Date.now() / 1000);
  const ISS = 'https://idp.rehearsal.example'; const AUD = 'api://empathia-staging';
  const sign = (c) => { const d = `${b64({ alg: 'RS256', kid: 'rehearsal', typ: 'JWT' })}.${b64(c)}`; return `${d}.${crypto.sign('sha256', Buffer.from(d), key.privateKey).toString('base64url')}`; };
  const token = sign({ iss: ISS, aud: AUD, sub: 'rehearsal-admin-subject', email: 'it-admin@rehearsal.example', email_verified: true, iat: now, nbf: now - 5, exp: now + 600 });
  // API and web from the runtime tree
  const sha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).stdout.trim();
  startProc(['services/enterprise-api/dist/src/main.js'], { NODE_ENV: 'development', AUTH_MODE: 'oidc', OIDC_ISSUER: ISS, OIDC_AUDIENCE: AUD, OIDC_JWKS_URL: 'http://127.0.0.1:4175/jwks', OIDC_LINK_BY_EMAIL: 'on', HOST: '127.0.0.1', PORT: '4174',
    DATABASE_URL: OWNER, APP_DATABASE_URL: APP, WORKER_DATABASE_URL: WORKER, JWT_SECRET: crypto.randomBytes(48).toString('base64url'), CORS_ORIGINS: 'http://127.0.0.1:4173', TRUSTED_PROXY: 'on', OBJECT_STORE_DIR: '/tmp/empathia-rehearsal-objects', RELEASE_SHA: sha, LOG_LEVEL: 'warn' });
  startProc(['apps/enterprise-web/server/serve.mjs'], { WEB_HOST: '127.0.0.1', PORT: '4173', API_URL: 'http://127.0.0.1:4174', WEB_ALLOWED_HOSTS: 'empathia-staging-web.onrender.com' });
  step('the API and the web server start from the runtime tree', (await waitFor('http://127.0.0.1:4174/health')) && (await waitFor('http://127.0.0.1:4173/')), procs.map((p) => p.logs().slice(-200)).join(' | '));
  // deployment tests
  // asynchronous on purpose: the local OIDC provider lives in this process and must keep answering while the tests run
  const smoke = await new Promise((resolve) => { const c = spawn(process.execPath, [path.join(repo, 'scripts/staging/smoke.mjs'), '--api=http://127.0.0.1:4174', '--web=http://127.0.0.1:4173', `--expect-sha=${sha}`, '--expect-auth=oidc', '--tenant=rehearsal-staging', '--role=secadmin', `--out=${path.join(repo, '.local/rehearsal-smoke.json')}`], { env: { ...process.env, EMPATHIA_STAGING_TOKEN: token }, stdio: 'ignore' }); c.on('exit', (status) => resolve({ status })); });
  const sm = JSON.parse(fs.readFileSync(path.join(repo, '.local/rehearsal-smoke.json'), 'utf8'));
  step(`deployment tests (scripts/staging/smoke.mjs): PASS ${sm.pass} · FAIL ${sm.fail} · NOT_RUN ${sm.notRun}`, smoke.status === 0 && sm.fail === 0, sm.results.filter((r) => r.result !== 'PASS').map((r) => `${r.id} ${r.result}: ${r.detail}`).join('; '));
  // the first sign-in bound the provider subject to the bootstrapped administrator
  const bound = psql(creds.superuser, creds.superPassword, DB, ['-c', "SELECT external_subject FROM app.person WHERE email = 'it-admin@rehearsal.example'"]).stdout.trim();
  step('the first OIDC sign-in bound the verified email to the bootstrapped administrator', bound === 'rehearsal-admin-subject', bound);
  // the administrator can invite (the onboarding path after the bootstrap)
  const inv = await fetch('http://127.0.0.1:4174/v1/admin/invitations', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'x-empathia-tenant': 'rehearsal-staging', 'x-empathia-role': 'secadmin', 'content-type': 'application/json', 'idempotency-key': `rehearsal-${Date.now()}` }, body: JSON.stringify({ email: 'tester@rehearsal.example', roleKey: 'designer' }) });
  step('the administrator invites a tester through the API (the onboarding path after the bootstrap)', inv.status === 201, `status ${inv.status}`);
  // Host allow-list on the web server
  const hostOk = await new Promise((r) => http.get({ host: '127.0.0.1', port: 4173, path: '/', headers: { host: 'empathia-staging-web.onrender.com' } }, (res) => { res.resume(); r(res.statusCode); }));
  const hostBad = await new Promise((r) => http.get({ host: '127.0.0.1', port: 4173, path: '/', headers: { host: 'evil.example' } }, (res) => { res.resume(); r(res.statusCode); }));
  const hz = await new Promise((r) => http.get({ host: '127.0.0.1', port: 4173, path: '/healthz', headers: { host: '10.1.2.3:10000' } }, (res) => { let b = ''; res.on('data', (d) => { b += d; }); res.on('end', () => r([res.statusCode, b])); }));
  step('the web server answers its configured public host and refuses any other (421); /healthz answers any host with a bare ok', hostOk === 200 && hostBad === 421 && hz[0] === 200 && hz[1] === 'ok', `allowed ${hostOk}, other ${hostBad}, healthz ${hz[0]}`);
  // ledger after all of the above
  const chain = await (await fetch('http://127.0.0.1:4174/v1/audit/integrity', { headers: { authorization: `Bearer ${token}`, 'x-empathia-tenant': 'rehearsal-staging', 'x-empathia-role': 'secadmin' } })).json();
  step('the bootstrap and every action since are in the tenant’s ledger chain, which verifies', chain.verified === true && chain.checked >= 4, `${chain.checked} events`);
} catch (e) { step('rehearsal aborted', false, `${(e).message}; API log: ${procs[0]?.logs().slice(-600)}`); } finally {
  for (const p of procs) p.kill(); jwks?.close();
  psql(creds.superuser, creds.superPassword, 'postgres', ['-c', `DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`]);
  fs.rmSync('/tmp/empathia-rehearsal-objects', { recursive: true, force: true });
}
const report = { at: new Date().toISOString(), runtimeTree: rt, manifest: JSON.parse(fs.readFileSync(path.join(rt, 'RUNTIME_MANIFEST.json'), 'utf8')).files + ' files', steps, pass: steps.filter((s) => s.result === 'PASS').length, fail: steps.filter((s) => s.result === 'FAIL').length,
  limits: ['NODE_ENV=development: the local OIDC provider is http (production requires https JWKS)', 'no container, no TLS, no Render proxy, no Render Postgres: checked only on Render (deployment tests D1–D10)', 'the web UI has no OIDC sign-in yet: the UI was not exercised as a signed-in user'] };
fs.writeFileSync(path.join(repo, 'tests/evidence/RENDER_REHEARSAL.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`\nREHEARSAL ${report.fail ? 'FAIL' : 'PASS'}: ${report.pass} PASS · ${report.fail} FAIL`);
process.exit(report.fail ? 1 : 0);
