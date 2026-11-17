#!/usr/bin/env node
/**
 * Local rehearsal of the demonstration staging (deploy/render/demo.render.yaml), run from the ASSEMBLED runtime tree — what the image
 * contains — against a throwaway database in the local cluster. Nothing leaves this machine; nothing is provisioned.
 *   node scripts/build.mjs && node deploy/render/rehearse-demo.mjs --assemble        (--rt=<dir> to rehearse a tree assembled elsewhere)
 * It takes the service's start command and environment FROM THE BLUEPRINT FILE, so what is rehearsed is what Render is given:
 *   R-01  the start command, as written, prepares an empty database and brings the API up in production, demonstration mode
 *   R-02  the deployment check (scripts/staging/demo-smoke.mjs) passes against it: correct permissions, attempted unauthorized access,
 *         isolation, persistence, cross-origin, reset
 *   R-03  a restart (a free instance sleeps and wakes; a deploy restarts): the same command runs again on the prepared database and
 *         changes nothing; a sandbox opened before the restart opens with its key after it, and reads the same record
 *   R-04  the database holds sandboxes and nothing else: no tenant that is not one, nobody with a password or a provider subject
 *   R-05  the runtime role is not the owner: it cannot read the sandbox table or the setting, and cannot create a tenant
 *   R-06  V-1: with an owner that cannot create roles the start command stops before the API starts
 * Writes tests/evidence/RENDER_DEMO_REHEARSAL.json. Limits, stated: the local cluster has no TLS, so PGSSLMODE=require is rehearsed as
 * disable; there is no Render proxy, no container, no free-plan sleep; the runtime-role passwords are the local cluster's (the role
 * step would otherwise re-password the roles every local test uses). Those are seen only on Render.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rt = path.resolve(repo, (process.argv.find((a) => a.startsWith('--rt=')) || '--rt=.local/demo-rt').slice(5));
// --assemble: build the runtime tree first (what the image's last build step does), so one command rehearses a checkout that is built
if (process.argv.includes('--assemble')) { const a = spawnSync(process.execPath, [path.join(repo, 'deploy/render/assemble-runtime.mjs'), `--out=${rt}`], { cwd: repo, encoding: 'utf8' }); if (a.status !== 0) { console.error(a.stderr || a.stdout); process.exit(2); } }
spawnSync(process.execPath, [path.join(repo, 'scripts/db.mjs'), 'up'], { cwd: repo, encoding: 'utf8' });
const creds = JSON.parse(fs.readFileSync(path.join(repo, '.local/pg/credentials.json'), 'utf8'));
const BIN = ['/usr/lib/postgresql/16/bin', '/usr/lib/postgresql/17/bin', '/usr/local/pgsql/bin'].find((d) => fs.existsSync(path.join(d, 'psql'))) || '';
const DB = 'empathia_demo_rehearsal';
const url = (u, p, db = DB) => `postgres://${u}:${encodeURIComponent(p)}@127.0.0.1:${creds.port}/${db}`;
const psql = (db, sql, user = creds.superuser, pass = creds.superPassword) => spawnSync(path.join(BIN, 'psql'), ['-h', '127.0.0.1', '-p', String(creds.port), '-U', user, '-d', db, '-v', 'ON_ERROR_STOP=1', '-qAt', '-c', sql], { env: { ...process.env, PGPASSWORD: pass }, encoding: 'utf8' });
const steps = []; const step = (id, name, ok, detail = '') => { steps.push({ id, name, result: ok ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ` — ${String(detail).slice(0, 300)}` : ''}`); return ok; };
const freePort = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const waitFor = async (u, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fetch(u); if (r.status === 200) return true; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 300)); } return false; };

// ---- the service, as the Blueprint declares it (a small reader for this one file: keys and literal values; no YAML library needed)
const bp = fs.readFileSync(path.join(repo, 'deploy/render/demo.render.yaml'), 'utf8');
const command = ((bp.match(/^\s*dockerCommand:\s*(.+)$/m) || [])[1] || '').trim();
// the command names a script the Dockerfile copies into the image; here it is copied into the runtime tree the same way
const script = (command.match(/^sh (deploy\/render\/[\w.-]+\.sh)$/) || [])[1];
const copied = script && new RegExp(`COPY --from=build /src/${script} /app/${script}`).test(fs.readFileSync(path.join(repo, 'deploy/render/Dockerfile'), 'utf8'));
if (script && copied && fs.existsSync(path.join(rt, 'services'))) { fs.mkdirSync(path.dirname(path.join(rt, script)), { recursive: true }); fs.copyFileSync(path.join(repo, script), path.join(rt, script)); }
const sh = script && copied ? command : null;
const envOf = () => { const out = {}; const re = /- key: (\S+)[^\n]*\n\s+(value|generateValue|fromDatabase):\s*([^\n]*)/g; let m; while ((m = re.exec(bp))) out[m[1]] = m[2] === 'value' ? m[3].trim().replace(/^"(.*)"$/, '$1') : `<${m[2]}>`; return out; };
const declared = envOf();
if (!sh || !fs.existsSync(path.join(rt, 'services/enterprise-api/dist/src/main.js'))) { console.error(!sh ? 'the Blueprint\'s start command is not a script the Dockerfile copies into the image' : `no runtime tree at ${rt}: run node scripts/build.mjs && node deploy/render/assemble-runtime.mjs --out=.local/demo-rt`); process.exit(2); }

const port = await freePort(); const base = `http://127.0.0.1:${port}`; const objects = fs.mkdtempSync(path.join(repo, '.local/demo-rehearsal-objects-'));
const sessionSecret = crypto.randomBytes(32).toString('base64');   // what generateValue gives: 256 random bits, base64; lives in this process only
const envFor = (ownerUrl) => { const e = { PATH: process.env.PATH, PORT: String(port), OBJECT_STORE_DIR: objects };
  for (const [k, v] of Object.entries(declared)) e[k] = v === '<fromDatabase>' ? ownerUrl : k === 'DEMO_SESSION_SECRET' ? sessionSecret : k === 'EMPATHIA_APP_PASSWORD' ? creds.appPassword : k === 'EMPATHIA_WORKER_PASSWORD' ? creds.workerPassword : v;
  e.PGSSLMODE = 'disable'; return e; };   // the one declared value the local cluster cannot honour (no TLS): stated in the header
let api = null; let log = '';
const start = (ownerUrl) => { log = ''; api = spawn('sh', ['-c', sh], { cwd: rt, env: envFor(ownerUrl), stdio: ['ignore', 'pipe', 'pipe'] }); api.stdout.on('data', (d) => { log += d; }); api.stderr.on('data', (d) => { log += d; }); return api; };
const stop = () => new Promise((r) => { if (!api || api.exitCode !== null) return r(); api.once('exit', r); api.kill('SIGTERM'); setTimeout(() => api.kill('SIGKILL'), 5000).unref(); });
const smoke = (args) => spawnSync(process.execPath, [path.join(repo, 'scripts/staging/demo-smoke.mjs'), base, ...args], { encoding: 'utf8', timeout: 300000 });
const count = (sql) => Number(psql(DB, sql).stdout.trim());

const SUPER = url(creds.superuser, creds.superPassword);   // stands in for Render's default user: owns the database and may create roles
try {
  psql('postgres', `DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`); psql('postgres', `CREATE DATABASE ${DB}`);

  // R-06 first, on the still-empty database: an owner that cannot create roles
  psql('postgres', `GRANT ALL ON DATABASE ${DB} TO ${creds.owner}`);
  const v1 = spawnSync('sh', ['-c', sh], { cwd: rt, env: { ...envFor(url(creds.owner, creds.ownerPassword)), PORT: String(await freePort()) }, encoding: 'utf8', timeout: 60000 });
  step('R-06', 'V-1: with an owner that cannot create roles the start command stops before the API starts', v1.status !== 0 && /V-1 failed/.test(v1.stderr) && !/listening|"msg":"started"/.test(v1.stdout + v1.stderr) && count("SELECT count(*) FROM information_schema.schemata WHERE schema_name = 'app'") === 0, v1.stderr.trim().slice(0, 200));

  start(SUPER); const up = await waitFor(`${base}/health`);
  const health = up ? await (await fetch(`${base}/health`)).json() : null; const migs = fs.readdirSync(path.join(repo, 'database/migrations')).filter((f) => /^\d{4}_.*\.sql$/.test(f)).length;
  step('R-01', 'the start command, as written in the Blueprint, prepares an empty database and brings the API up in production, demonstration mode', up && health.authMode === 'demo' && health.demoSessions === true && health.database.migrationsApplied === migs && declared.NODE_ENV === 'production' && declared.AUTH_MODE === 'demo',
    up ? `${migs} migrations · authMode ${health.authMode} · ${Object.keys(declared).length} variables from the Blueprint` : log.trim().split('\n').slice(-3).join(' | '));
  if (!up) throw new Error('the API did not come up');

  const out = path.join(repo, '.local/demo-rehearsal-smoke.json'); const s1 = smoke([`--origin=${declared.CORS_ORIGINS}`, `--json=${out}`]);
  const sm = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : { passed: 0, failed: -1, results: [] };
  step('R-02', 'the deployment check passes against it: permissions, unauthorized access, isolation, persistence, cross-origin, reset', s1.status === 0 && sm.failed === 0 && sm.passed === 12, s1.status === 0 ? `${sm.passed} passed, ${sm.failed} failed` : (s1.stdout + s1.stderr).split('\n').filter((l) => /^FAIL/.test(l)).join(' | ').slice(0, 380));

  // R-03: a sandbox opened before a restart, with something recorded in it
  const j = async (method, p, { token, body } = {}) => { const r = await fetch(base + p, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
  const o = await j('POST', '/v1/demo/sandboxes', { body: {} }); const fr = `/v1/rooms/${o.body.scenario.room}/field-record`; const dev = (await j('GET', fr, { token: o.body.session.accessToken })).body.devices[0].asset;
  await j('PUT', `${fr}/mounting/${dev}`, { token: o.body.session.accessToken, body: { method: 'floor', note: 'before the restart (synthetic)' } });
  const before = { thread: (await j('GET', `/v1/rooms/${o.body.scenario.room}/thread`, { token: o.body.session.accessToken })).body.stages, migrations: count('SELECT count(*) FROM app_meta.schema_migration'), sandboxes: count('SELECT count(*) FROM app.demo_sandbox'), roles: count('SELECT count(*) FROM app.role') };
  await stop(); start(SUPER); const again = await waitFor(`${base}/health`);
  const s = again ? await j('POST', '/v1/demo/sessions', { body: { sandboxId: o.body.sandbox.id, key: o.body.sandbox.key, role: 'exec' } }) : { status: 0 };
  const after = again && s.status === 200 ? (await j('GET', `/v1/rooms/${o.body.scenario.room}/thread`, { token: s.body.accessToken })).body.stages : null;
  const old = again ? await j('GET', '/v1/me', { token: o.body.session.accessToken }) : { status: 0 };
  step('R-03', 'a restart: the same command runs again and changes nothing; a sandbox opened before it opens with its key after it and reads the same record; a session issued before it is still good',
    again && s.status === 200 && JSON.stringify(after) === JSON.stringify(before.thread) && old.status === 200 && count('SELECT count(*) FROM app_meta.schema_migration') === before.migrations && count('SELECT count(*) FROM app.demo_sandbox') === before.sandboxes && count('SELECT count(*) FROM app.role') === before.roles,
    again ? `session from the key ${s.status} · same thread ${JSON.stringify(after) === JSON.stringify(before.thread)} · earlier session ${old.status} · ${before.migrations} migrations, ${before.sandboxes} sandboxes, unchanged` : log.trim().split('\n').slice(-3).join(' | '));

  const others = count('SELECT count(*) FROM app.tenant t WHERE NOT EXISTS (SELECT 1 FROM app.demo_sandbox s WHERE s.tenant_id = t.id)'); const ids = count('SELECT count(*) FROM app.person WHERE password_hash IS NOT NULL OR external_subject IS NOT NULL');
  step('R-04', 'the database holds sandboxes and nothing else: no other tenant, nobody with a password or a provider subject', others === 0 && ids === 0 && count('SELECT count(*) FROM app.tenant') === count('SELECT count(*) FROM app.demo_sandbox'), `${count('SELECT count(*) FROM app.tenant')} tenants, all sandboxes · ${ids} sign-in identities`);

  const asApp = (sql) => psql(DB, sql, creds.app, creds.appPassword);
  const denied = ['SELECT * FROM app.demo_sandbox', 'UPDATE app.demo_config SET enabled = false', "INSERT INTO app.tenant (slug, name) VALUES ('forged', 'forged')"].map((q) => /permission denied/.test(asApp(q).stderr));
  step('R-05', 'the runtime role is not the owner: it cannot read the sandbox table, change the setting, or create a tenant', denied.every(Boolean) && asApp('SELECT count(*) FROM app.room').stdout.trim() === '0', `permission denied ×${denied.filter(Boolean).length} of 3 · rooms visible without a tenant: ${asApp('SELECT count(*) FROM app.room').stdout.trim()}`);
} catch (e) { step('R-XX', 'the rehearsal could not be completed', false, (e && e.message) || String(e)); }
finally { await stop(); psql('postgres', `DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`); fs.rmSync(objects, { recursive: true, force: true }); }

const want = ['R-01', 'R-02', 'R-03', 'R-04', 'R-05', 'R-06']; for (const id of want) if (!steps.some((x) => x.id === id)) step(id, 'NOT RUN', false, 'an earlier step stopped the rehearsal');
const pass = steps.filter((x) => x.result === 'PASS').length; const fail = steps.length - pass;
let commit = ''; try { commit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).stdout.trim(); } catch { /* not a checkout */ }
fs.mkdirSync(path.join(repo, 'tests/evidence'), { recursive: true });
fs.writeFileSync(path.join(repo, 'tests/evidence/RENDER_DEMO_REHEARSAL.json'), JSON.stringify({ at: new Date().toISOString(), commit, blueprint: 'deploy/render/demo.render.yaml', startCommand: sh, passed: pass, failed: fail, steps,
  smoke: fs.existsSync(path.join(repo, '.local/demo-rehearsal-smoke.json')) ? JSON.parse(fs.readFileSync(path.join(repo, '.local/demo-rehearsal-smoke.json'), 'utf8')).results : [],
  limits: 'Local cluster without TLS (PGSSLMODE rehearsed as disable); no Render proxy, container or free-plan sleep; the cluster superuser stands in for Render\'s default database user; runtime-role passwords are the local cluster\'s. V-1 on Render Postgres, the image build and the edge are seen only on Render.' }, null, 1) + '\n');
console.log(`\nPASS ${pass} · FAIL ${fail}`); process.exit(fail ? 1 : 0);
