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
 *   R-07  the self-check switch (DEMO_SELF_CHECK): off as declared, nothing runs; on, the deployment check runs inside the service
 *         against its own address and every line is in the service's log
 *   R-08  a plain pg_dump with the owner's URL is refused (row-level security is forced on the owner): the export must be the platform's
 *   R-09  recovery: an export made with the platform's privileges restores into an empty database as the owner; migrations, every
 *         table's rows, forced row-level security and every tenant's audit chain are verified against the source; the API starts on
 *         the restored copy, and a sandbox opened before the export opens with its key and reads the same thread
 *   R-10  the verification is not a formality: one audit row changed and one row removed in the restored copy are both reported
 *   R-11  rotating the three secrets (the session secret and the two runtime-role passwords) is a restart with new values: every
 *         session issued before stops, the old database password no longer connects, and a sandbox still opens with its key
 *   R-12  an expired sandbox: its key opens nothing, a session issued before stops, the visitor is told why, and its records are kept
 * The database is a PostgreSQL cluster of its own, created for the run and removed after it, and its owner is what the platform gives:
 * a role that is NOT a superuser and may create roles. That matters. The first rehearsal used the development cluster's superuser as
 * the owner and passed a restart that then failed on Render (17 Nov 2026: "permission denied to alter role" — a role that is not a
 * superuser may not name SUPERUSER or BYPASSRLS in ALTER ROLE, even to deny them). In a cluster of its own the two runtime roles do
 * not exist before the first start, so the first start creates them and the restart re-passwords them, as on Render.
 * Writes tests/evidence/RENDER_DEMO_REHEARSAL.json. Limits, stated: the rehearsal cluster has no TLS, so PGSSLMODE=require is rehearsed
 * as disable; there is no Render proxy, no container, no free-plan sleep; the owner's attributes beyond "not a superuser, may create
 * roles" are an assumption about the platform's user. Those are seen only on Render.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rt = path.resolve(repo, (process.argv.find((a) => a.startsWith('--rt=')) || '--rt=.local/demo-rt').slice(5));
// --assemble: build the runtime tree first (what the image's last build step does), so one command rehearses a checkout that is built
if (process.argv.includes('--assemble')) { const a = spawnSync(process.execPath, [path.join(repo, 'deploy/render/assemble-runtime.mjs'), `--out=${rt}`], { cwd: repo, encoding: 'utf8' }); if (a.status !== 0) { console.error(a.stderr || a.stdout); process.exit(2); } }
const BIN = ['/usr/lib/postgresql/16/bin', '/usr/local/opt/postgresql@16/bin', '/opt/homebrew/opt/postgresql@16/bin', '/usr/pgsql-16/bin'].find((d) => fs.existsSync(path.join(d, 'initdb'))) || '';
const DB = 'empathia_demo';   // the Blueprint's databaseName
const rnd = () => crypto.randomBytes(24).toString('base64url');
// the cluster's own superuser is used to set the stage and to look at the result; the service never has it
const creds = { port: 0, superuser: 'rehearsal_admin', superPassword: rnd(), owner: 'empathia_owner', ownerPassword: rnd(), plain: 'plain_owner', plainPassword: rnd(), app: 'empathia_app', appPassword: rnd(), worker: 'empathia_worker', workerPassword: rnd() };
const url = (u, p, db = DB) => `postgres://${u}:${encodeURIComponent(p)}@127.0.0.1:${creds.port}/${db}`;
const psql = (db, sql, user = creds.superuser, pass = creds.superPassword) => spawnSync(path.join(BIN, 'psql'), ['-h', '127.0.0.1', '-p', String(creds.port), '-U', user, '-d', db, '-v', 'ON_ERROR_STOP=1', '-qAt', '-c', sql], { env: { ...process.env, PGPASSWORD: pass }, encoding: 'utf8' });
// PostgreSQL refuses to run as root; on a root-only machine it runs as the postgres system user (as scripts/db.mjs does)
const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
const asPg = (cmd, args) => (isRoot ? spawnSync('runuser', ['-u', 'postgres', '--', path.join(BIN, cmd), ...args], { encoding: 'utf8' }) : spawnSync(path.join(BIN, cmd), args, { encoding: 'utf8' }));
const pgBase = path.join(repo, '.local/demo-rehearsal-pg'); const pgData = path.join(pgBase, 'data');
const clusterDown = () => { if (fs.existsSync(path.join(pgData, 'PG_VERSION'))) asPg('pg_ctl', ['-D', pgData, '-m', 'immediate', '-w', 'stop']); if (isRoot && fs.existsSync(pgBase)) { try { execFileSync('chown', ['-R', String(process.getuid()), pgBase]); } catch { /* removed below either way */ } } fs.rmSync(pgBase, { recursive: true, force: true }); };
const clusterUp = async () => {
  clusterDown(); creds.port = await freePort(); fs.mkdirSync(pgData, { recursive: true });
  const pw = path.join(pgBase, '.pw'); fs.writeFileSync(pw, creds.superPassword, { mode: 0o600 }); if (isRoot) execFileSync('chown', ['-R', 'postgres', pgBase]);
  const i = asPg('initdb', ['-D', pgData, '-U', creds.superuser, '--pwfile', pw, '-A', 'scram-sha-256', '-E', 'UTF8', '--locale=C.UTF-8']); fs.rmSync(pw, { force: true });
  if (i.status !== 0) throw new Error(`initdb failed: ${(i.stderr || i.stdout || '').slice(-400)}`);
  fs.appendFileSync(path.join(pgData, 'postgresql.conf'), `\n# a rehearsal cluster: thrown away\nlisten_addresses = '127.0.0.1'\nport = ${creds.port}\nunix_socket_directories = '${os.tmpdir()}'\npassword_encryption = 'scram-sha-256'\nfsync = off\n`);
  const st = asPg('pg_ctl', ['-D', pgData, '-l', path.join(pgBase, 'server.log'), '-w', 'start']); if (st.status !== 0) throw new Error(`pg_ctl start failed: ${(st.stderr || st.stdout || '').slice(-400)}`);
  // the platform's default user, as far as it is known: owns the database, is not a superuser, may create roles (V-1 passed on Render)
  const made = psql('postgres', `CREATE ROLE ${creds.owner} LOGIN PASSWORD '${creds.ownerPassword}' NOSUPERUSER CREATEROLE CREATEDB; CREATE ROLE ${creds.plain} LOGIN PASSWORD '${creds.plainPassword}' NOSUPERUSER NOCREATEROLE`);
  const dbs = [psql('postgres', `CREATE DATABASE ${DB} OWNER ${creds.owner}`), psql('postgres', `CREATE DATABASE ${DB}_v1 OWNER ${creds.plain}`)];
  if (made.status !== 0 || dbs.some((d) => d.status !== 0)) throw new Error(`the rehearsal cluster could not be prepared: ${made.stderr}${dbs.map((d) => d.stderr).join('')}`);
  return psql('postgres', 'SHOW server_version').stdout.trim();
};
const steps = []; const step = (id, name, ok, detail = '') => { steps.push({ id, name, result: ok ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ` — ${String(detail).slice(0, 300)}` : ''}`); return ok; };
const freePort = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const waitFor = async (u, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fetch(u); if (r.status === 200) return true; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 300)); } return false; };

// ---- the service, as the Blueprint declares it (a small reader for this one file: keys and literal values; no YAML library needed)
const bp = fs.readFileSync(path.join(repo, 'deploy/render/demo.render.yaml'), 'utf8');
const command = ((bp.match(/^\s*dockerCommand:\s*(.+)$/m) || [])[1] || '').trim();
// the command names a script the Dockerfile copies into the image; here it is copied into the runtime tree the same way
const script = (command.match(/^sh (deploy\/render\/[\w.-]+\.sh)$/) || [])[1];
// every file the Dockerfile copies into the image beside the assembled tree (COPY --from=build /src/<p> /app/<p>) is copied the same way
const extras = [...fs.readFileSync(path.join(repo, 'deploy/render/Dockerfile'), 'utf8').matchAll(/^COPY --from=build \/src\/(\S+) \/app\/(\S+)$/gm)].filter((m) => m[1] === m[2]).map((m) => m[1]);
const copied = script && extras.includes(script);
if (copied && fs.existsSync(path.join(rt, 'services'))) for (const f of extras) { fs.mkdirSync(path.dirname(path.join(rt, f)), { recursive: true }); fs.copyFileSync(path.join(repo, f), path.join(rt, f)); }
const sh = script && copied ? command : null;
const envOf = () => { const out = {}; const re = /- key: (\S+)[^\n]*\n\s+(value|generateValue|fromDatabase):\s*([^\n]*)/g; let m; while ((m = re.exec(bp))) out[m[1]] = m[2] === 'value' ? m[3].trim().replace(/^"(.*)"$/, '$1') : `<${m[2]}>`; return out; };
const declared = envOf();
if (!sh || !fs.existsSync(path.join(rt, 'services/enterprise-api/dist/src/main.js'))) { console.error(!sh ? 'the Blueprint\'s start command is not a script the Dockerfile copies into the image' : `no runtime tree at ${rt}: run node scripts/build.mjs && node deploy/render/assemble-runtime.mjs --out=.local/demo-rt`); process.exit(2); }

const port = await freePort(); const base = `http://127.0.0.1:${port}`; const objects = fs.mkdtempSync(path.join(repo, '.local/demo-rehearsal-objects-'));
const sessionSecret = crypto.randomBytes(32).toString('base64');   // what generateValue gives: 256 random bits, base64; lives in this process only
const envFor = (ownerUrl, extra = {}) => { const e = { PATH: process.env.PATH, PORT: String(port), OBJECT_STORE_DIR: objects };
  for (const [k, v] of Object.entries(declared)) e[k] = v === '<fromDatabase>' ? ownerUrl : k === 'DEMO_SESSION_SECRET' ? sessionSecret : k === 'EMPATHIA_APP_PASSWORD' ? creds.appPassword : k === 'EMPATHIA_WORKER_PASSWORD' ? creds.workerPassword : v;
  e.PGSSLMODE = 'disable'; return { ...e, ...extra }; };   // the one declared value the local cluster cannot honour (no TLS): stated in the header
let api = null; let log = ''; let recovery = null;
// The command is run as its words, with no shell around it, in a process group of its own. An earlier version wrapped it in `sh -c`;
// stopping that stopped the wrapper and left the API running, so the "restart" was answered by the process that had never stopped.
const argv = sh ? sh.split(/\s+/) : [];
const start = (ownerUrl, extra) => { log = ''; api = spawn(argv[0], argv.slice(1), { cwd: rt, env: envFor(ownerUrl, extra), stdio: ['ignore', 'pipe', 'pipe'], detached: true }); api.stdout.on('data', (d) => { log += d; }); api.stderr.on('data', (d) => { log += d; }); return api; };
const signal = (sig) => { try { process.kill(-api.pid, sig); } catch { /* the group is gone */ } };
const groupAlive = () => { try { process.kill(-api.pid, 0); return true; } catch { return false; } };
// stops the whole group (the API and anything the start script left beside it) and returns only when nothing answers on the port
const stop = async () => { if (!api) return true; signal('SIGTERM'); const t = Date.now(); while (groupAlive() && Date.now() - t < 8000) await new Promise((r) => setTimeout(r, 100)); if (groupAlive()) { signal('SIGKILL'); await new Promise((r) => setTimeout(r, 300)); }
  try { await fetch(`${base}/health`, { signal: AbortSignal.timeout(1000) }); return false; } catch { return true; } };
process.on('exit', () => { if (api) signal('SIGKILL'); });
const smoke = (args) => spawnSync(process.execPath, [path.join(repo, 'scripts/staging/demo-smoke.mjs'), base, ...args], { encoding: 'utf8', timeout: 300000 });
const count = (sql) => Number(psql(DB, sql).stdout.trim());

let SUPER = '';   // the owner's URL: what DATABASE_URL is on Render. (The name is historical: it is not a superuser.)
let pgVersion = '';
try {
  pgVersion = await clusterUp(); SUPER = url(creds.owner, creds.ownerPassword);

  // R-06 first: a database whose owner cannot create roles
  const v1 = spawnSync(argv[0], argv.slice(1), { cwd: rt, env: { ...envFor(url(creds.plain, creds.plainPassword, `${DB}_v1`)), PORT: String(await freePort()) }, encoding: 'utf8', timeout: 60000 });
  step('R-06', 'V-1: with an owner that cannot create roles the start command stops before the API starts', v1.status !== 0 && /V-1 failed/.test(v1.stderr) && !/listening|"msg":"started"/.test(v1.stdout + v1.stderr) && Number(psql(`${DB}_v1`, "SELECT count(*) FROM information_schema.schemata WHERE schema_name = 'app'").stdout.trim()) === 0 && count("SELECT count(*) FROM pg_roles WHERE rolname IN ('empathia_app','empathia_worker')") === 0, v1.stderr.trim().slice(0, 200));

  start(SUPER); const up = await waitFor(`${base}/health`); const firstRoles = (log.match(/"roles":(\[[^\]]*\])/) || [])[1] || '';
  const health = up ? await (await fetch(`${base}/health`)).json() : null; const migs = fs.readdirSync(path.join(repo, 'database/migrations')).filter((f) => /^\d{4}_.*\.sql$/.test(f)).length;
  step('R-01', 'the start command, as written in the Blueprint, prepares an empty database as an owner that is not a superuser — creating the two runtime roles — and brings the API up in production, demonstration mode', up && health.authMode === 'demo' && health.demoSessions === true && health.database.migrationsApplied === migs && declared.NODE_ENV === 'production' && declared.AUTH_MODE === 'demo' && (firstRoles.match(/"action":"created"/g) || []).length === 2 && count(`SELECT count(*) FROM pg_roles WHERE rolname = '${creds.owner}' AND NOT rolsuper AND rolcreaterole`) === 1,
    up ? `${migs} migrations · authMode ${health.authMode} · roles created ×${(firstRoles.match(/"action":"created"/g) || []).length} · ${Object.keys(declared).length} variables from the Blueprint · PostgreSQL ${pgVersion}` : log.trim().split('\n').slice(-3).join(' | '));
  if (!up) throw new Error('the API did not come up');

  const out = path.join(repo, '.local/demo-rehearsal-smoke.json'); const s1 = smoke([`--origin=${declared.CORS_ORIGINS}`, `--json=${out}`]);
  const sm = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : { passed: 0, failed: -1, results: [] };
  step('R-02', 'the deployment check passes against it: permissions, unauthorized access, isolation, persistence, cross-origin, reset', s1.status === 0 && sm.failed === 0 && sm.passed === 12, s1.status === 0 ? `${sm.passed} passed, ${sm.failed} failed` : (s1.stdout + s1.stderr).split('\n').filter((l) => /^FAIL/.test(l)).join(' | ').slice(0, 380));

  // R-03: a sandbox opened before a restart, with something recorded in it
  const j = async (method, p, { token, body } = {}) => { const r = await fetch(base + p, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
  const o = await j('POST', '/v1/demo/sandboxes', { body: {} }); const fr = `/v1/rooms/${o.body.scenario.room}/field-record`; const dev = (await j('GET', fr, { token: o.body.session.accessToken })).body.devices[0].asset;
  await j('PUT', `${fr}/mounting/${dev}`, { token: o.body.session.accessToken, body: { method: 'floor', note: 'before the restart (synthetic)' } });
  const before = { thread: (await j('GET', `/v1/rooms/${o.body.scenario.room}/thread`, { token: o.body.session.accessToken })).body.stages, migrations: count('SELECT count(*) FROM app_meta.schema_migration'), sandboxes: count('SELECT count(*) FROM app.demo_sandbox'), roles: count('SELECT count(*) FROM app.role') };
  const wentDown = await stop(); start(SUPER); const again = wentDown && await waitFor(`${base}/health`); const secondRoles = (log.match(/"roles":(\[[^\]]*\])/) || [])[1] || ''; const repassworded = (secondRoles.match(/"action":"password set"/g) || []).length === 2;
  const s = again ? await j('POST', '/v1/demo/sessions', { body: { sandboxId: o.body.sandbox.id, key: o.body.sandbox.key, role: 'exec' } }) : { status: 0 };
  const after = again && s.status === 200 ? (await j('GET', `/v1/rooms/${o.body.scenario.room}/thread`, { token: s.body.accessToken })).body.stages : null;
  const old = again ? await j('GET', '/v1/me', { token: o.body.session.accessToken }) : { status: 0 };
  step('R-03', 'a restart: the same command runs again as the same owner — the role step finds the roles and sets their passwords — and changes nothing; a sandbox opened before it opens with its key after it and reads the same record; a session issued before it is still good',
    again && repassworded && s.status === 200 && JSON.stringify(after) === JSON.stringify(before.thread) && old.status === 200 && count('SELECT count(*) FROM app_meta.schema_migration') === before.migrations && count('SELECT count(*) FROM app.demo_sandbox') === before.sandboxes && count('SELECT count(*) FROM app.role') === before.roles,
    !wentDown ? 'the API was still answering after it was stopped: no restart took place' : again && !repassworded ? `the role step on restart: ${log.trim().split('\n').filter((l) => /roles/.test(l)).join(' | ').slice(0, 200) || 'no line'}` : again ? `stopped, nothing answering, started again · roles: password set ×${(secondRoles.match(/"action":"password set"/g) || []).length} · session from the key ${s.status} · same thread ${JSON.stringify(after) === JSON.stringify(before.thread)} · earlier session ${old.status} · ${before.migrations} migrations, ${before.sandboxes} sandboxes, unchanged` : `did not come up again: ${log.trim().split('\n').slice(-2).join(' | ').slice(0, 240)}`);

  // R-07: the switch. Off (every start so far): nothing ran. On: the same check runs from inside, into the log.
  const quiet = !/SELF-CHECK/.test(log) && declared.DEMO_SELF_CHECK === 'off';
  const down2 = await stop(); start(SUPER, { DEMO_SELF_CHECK: 'on' }); const t0 = Date.now(); while (Date.now() - t0 < 180000 && !/SELF-CHECK finished/.test(log)) await new Promise((r) => setTimeout(r, 500));
  const inside = (log.match(/^SELF-CHECK .*$/gm) || []); const verdict = inside.find((l) => /demo-smoke .*: \d+ passed, \d+ failed/.test(l)) || '';
  step('R-07', 'the self-check: off as declared, nothing runs; switched on, the deployment check runs inside the service against its own address and its lines are in the log',
    quiet && down2 && /: 12 passed, 0 failed/.test(verdict) && inside.filter((l) => /^SELF-CHECK PASS SM-/.test(l)).length === 12 && !inside.some((l) => /^SELF-CHECK FAIL/.test(l)) && /SELF-CHECK finished: exit 0/.test(log) && (await waitFor(`${base}/health`, 5000)),
    `declared ${declared.DEMO_SELF_CHECK} · ${inside.length} lines · ${verdict.replace(/^SELF-CHECK demo-smoke \S+ /, '') || 'no verdict'}`);

  const others = count('SELECT count(*) FROM app.tenant t WHERE NOT EXISTS (SELECT 1 FROM app.demo_sandbox s WHERE s.tenant_id = t.id)'); const ids = count('SELECT count(*) FROM app.person WHERE password_hash IS NOT NULL OR external_subject IS NOT NULL');
  step('R-04', 'the database holds sandboxes and nothing else: no other tenant, nobody with a password or a provider subject', others === 0 && ids === 0 && count('SELECT count(*) FROM app.tenant') === count('SELECT count(*) FROM app.demo_sandbox'), `${count('SELECT count(*) FROM app.tenant')} tenants, all sandboxes · ${ids} sign-in identities`);

  const asApp = (sql) => psql(DB, sql, creds.app, creds.appPassword);
  const denied = ['SELECT * FROM app.demo_sandbox', 'UPDATE app.demo_config SET enabled = false', "INSERT INTO app.tenant (slug, name) VALUES ('forged', 'forged')"].map((q) => /permission denied/.test(asApp(q).stderr));
  const bare = count("SELECT count(*) FROM pg_roles WHERE rolname IN ('empathia_app','empathia_worker') AND rolcanlogin AND NOT (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication)");
  step('R-05', 'the runtime roles are not the owner and can do nothing but sign in: the API\'s role cannot read the sandbox table, change the setting, or create a tenant', denied.every(Boolean) && bare === 2 && asApp('SELECT count(*) FROM app.room').stdout.trim() === '0', `permission denied ×${denied.filter(Boolean).length} of 3 · roles with no attribute but LOGIN: ${bare} of 2 · rooms visible without a tenant: ${asApp('SELECT count(*) FROM app.room').stdout.trim()}`);

  // ---- recovery (scripts/ops/restore-verify.mjs; docs/operations/DEMO_BACKUP_AND_RECOVERY.md)
  const { manifest, verify, restore, privileges, reapplyPrivileges } = await import('../../scripts/ops/restore-verify.mjs');
  const superUrl = (db) => url(creds.superuser, creds.superPassword, db); const ownerUrl = (db) => url(creds.owner, creds.ownerPassword, db); const dump = path.join(os.tmpdir(), `empathia-demo-rehearsal-${creds.port}.dir.tar.gz`);
  const pgDump = (user, pass, out, format = 'custom') => spawnSync(path.join(BIN, 'pg_dump'), ['-h', '127.0.0.1', '-p', String(creds.port), '-U', user, '-d', DB, `--format=${format}`, '-f', out], { env: { ...process.env, PGPASSWORD: pass }, encoding: 'utf8' });
  const asOwner = pgDump(creds.owner, creds.ownerPassword, `${dump}.owner`); fs.rmSync(`${dump}.owner`, { force: true });
  step('R-08', 'a plain pg_dump with the owner’s URL is refused: row-level security is forced on the owner, so the export has to be the platform’s', asOwner.status !== 0 && /row-level security policy/.test(asOwner.stderr), asOwner.stderr.trim().split('\n')[0].slice(0, 160));

  await stop();   // nothing writes while the source is described and exported
  psql(DB, 'SELECT app.seal_audit_all()');   // what the worker does continuously: every committed row is in its tenant's chain
  // The export is made the way the platform's is: a directory-format dump in a .dir.tar.gz. The cluster's superuser stands in for the platform.
  const source = manifest(superUrl(DB)); const exportDir = dump.replace(/\.dir\.tar\.gz$/, ''); fs.rmSync(exportDir, { recursive: true, force: true }); const tE = Date.now();
  // as the platform makes it: the first drill on a real export (17 Nov 2026) found no privilege entry in it, so the stand-in has none either
  let exported = spawnSync(path.join(BIN, 'pg_dump'), ['-h', '127.0.0.1', '-p', String(creds.port), '-U', creds.superuser, '-d', DB, '--format=directory', '--no-privileges', '-f', exportDir], { env: { ...process.env, PGPASSWORD: creds.superPassword }, encoding: 'utf8' });
  if (exported.status === 0) exported = spawnSync('tar', ['-czf', dump, '-C', path.dirname(exportDir), path.basename(exportDir)], { encoding: 'utf8' });
  fs.rmSync(exportDir, { recursive: true, force: true }); const exportSeconds = (Date.now() - tE) / 1000; const exportBytes = exported.status === 0 ? fs.statSync(dump).size : 0;
  // what an export cannot hold: something recorded after it. The service runs again on the source and the installer records a second mounting
  start(SUPER); const upAgain = await waitFor(`${base}/health`); const sx = upAgain ? await j('POST', '/v1/demo/sessions', { body: { sandboxId: o.body.sandbox.id, key: o.body.sandbox.key, role: 'installer' } }) : { status: 0 };
  const lateWrite = sx.status === 200 ? await j('PUT', `${fr}/mounting/${dev}`, { token: sx.body.accessToken, body: { method: 'wall-bracket', heightM: 1.4, fixing: 'bracket and four anchors (synthetic)', backing: 'plywood backing (synthetic)', note: 'after the export (synthetic)' } }) : { status: 0 };
  const lateVersion = Number(lateWrite.body?.version || 0); const lateWhy = lateVersion ? '' : ` (up ${upAgain}, session ${sx.status}, write ${lateWrite.status} ${String(lateWrite.body?.detail || '').slice(0, 80)})`; await stop();
  psql('postgres', `CREATE DATABASE ${DB}_restored OWNER ${creds.owner}`);
  let restored = false; let why = exported.status === 0 ? '' : exported.stderr.trim().slice(0, 200); const tR = Date.now(); if (exported.status === 0) { try { restored = restore(dump, ownerUrl(`${DB}_restored`)); } catch (e) { why = e.message; } }
  const restoreSeconds = (Date.now() - tR) / 1000; const tV = Date.now();
  // the privileges the export does not carry: put back from a database at the same migration level (here the source itself), then compared with it
  let privs = { before: -1, applied: 0, left: -1 }; if (restored) { try { const want = privileges(superUrl(DB)); const diff = (have) => want.filter((l) => !have.includes(l)).length + have.filter((l) => !want.includes(l)).length; privs.before = diff(privileges(superUrl(`${DB}_restored`))); privs.applied = reapplyPrivileges(superUrl(DB), ownerUrl(`${DB}_restored`)); privs.left = diff(privileges(superUrl(`${DB}_restored`))); } catch (e) { why = e.message; } }
  const checks = restored ? [...verify(superUrl(`${DB}_restored`), source), { id: 'RV-05', title: 'privileges put back from a migrated reference equal it', result: privs.before > 0 && privs.applied > 0 && privs.left === 0 ? 'PASS' : 'FAIL', detail: `${privs.before} differences as restored, ${privs.applied} entries applied, ${privs.left} differences afterwards` }] : []; const verifySeconds = (Date.now() - tV) / 1000; const owned = restored ? Number(psql(`${DB}_restored`, `SELECT count(*) FROM pg_tables WHERE schemaname = 'app' AND tableowner <> '${creds.owner}'`).stdout.trim()) : -1;
  let served = false; let sameThread = false; let copyVersion = -1; const tS = Date.now(); let serveSeconds = 0;
  if (restored && checks.every((x) => x.result === 'PASS')) { start(ownerUrl(`${DB}_restored`)); served = await waitFor(`${base}/health`); serveSeconds = (Date.now() - tS) / 1000;
    const s2 = served ? await j('POST', '/v1/demo/sessions', { body: { sandboxId: o.body.sandbox.id, key: o.body.sandbox.key, role: 'exec' } }) : { status: 0 };
    sameThread = s2.status === 200 && JSON.stringify((await j('GET', `/v1/rooms/${o.body.scenario.room}/thread`, { token: s2.body.accessToken })).body.stages) === JSON.stringify(before.thread);
    copyVersion = s2.status === 200 ? Number((await j('GET', fr, { token: s2.body.accessToken })).body.devices.find((d) => d.asset === dev)?.mounting?.version || 0) : -1; }
  recovery = { rows: source.rows, tables: Object.keys(source.tables).length, chains: source.auditHeads.length, exportBytes, exportSeconds, restoreSeconds, verifySeconds, serveSeconds, totalSeconds: restoreSeconds + verifySeconds + serveSeconds,
    lost: 'whatever was recorded after the export was made: here one mounting (version ' + lateVersion + ' on the source, version ' + copyVersion + ' in the copy)', measuredOn: 'this workstation, a local PostgreSQL cluster; not the platform' };
  step('R-09', 'recovery: an export made with the platform’s privileges restores into an empty database as the owner; migrations, rows, forced row-level security and every audit chain are verified against the source; the privileges the export does not carry are put back and equal the source’s; the API starts on the restored copy and a sandbox opened before the export opens with its key and reads the same thread',
    restored && checks.length === 5 /* 17 Nov 2026: RV-05, the privileges, joined the four after the first drill on a real export */ && checks.every((x) => x.result === 'PASS') && owned === 0 && served && sameThread && lateVersion === 2 && copyVersion === 1,
    restored ? `${checks.map((x) => `${x.id} ${x.result}`).join(' · ')} · ${source.rows} rows, ${source.auditHeads.length} chains · objects not the owner’s: ${owned} · API on the copy ${served} · same thread ${sameThread} · recorded after the export: on the source v${lateVersion}${lateWhy}, in the copy v${copyVersion} (lost, as it must be) · export ${exportSeconds.toFixed(1)} s (${Math.round(exportBytes / 1024)} KiB), restore ${restoreSeconds.toFixed(1)} s, verify ${verifySeconds.toFixed(1)} s, serving again ${serveSeconds.toFixed(1)} s${checks.filter((x) => x.result === 'FAIL').map((x) => ` · ${x.id}: ${x.detail}`).join('')}` : `not restored: ${why}`);

  await stop();
  const harm = psql(`${DB}_restored`, "SET session_replication_role = replica; UPDATE app.audit_event SET detail = coalesce(detail, '{}'::jsonb) || '{\"changed\": true}'::jsonb WHERE id = (SELECT id FROM app.audit_event WHERE seq IS NOT NULL ORDER BY tenant_id, seq OFFSET 3 LIMIT 1); DELETE FROM app.field_mounting WHERE ctid = (SELECT ctid FROM app.field_mounting LIMIT 1)");
  const damaged = restored ? verify(superUrl(`${DB}_restored`), source) : []; const r = (id) => damaged.find((x) => x.id === id) || { result: 'NOT RUN', detail: '' };
  step('R-10', 'the verification is not a formality: one audit row changed and one row removed in the restored copy are both reported', harm.status === 0 && r('RV-02').result === 'FAIL' && /1 hashes differ/.test(r('RV-02').detail) && r('RV-04').result === 'FAIL' && /app\.field_mounting/.test(r('RV-04').detail) && r('RV-01').result === 'PASS',
    harm.status === 0 ? `RV-02 ${r('RV-02').result}: ${r('RV-02').detail.slice(0, 90)} | RV-04 ${r('RV-04').result}: ${r('RV-04').detail.slice(0, 120)}` : harm.stderr.trim().slice(0, 200));
  fs.rmSync(dump, { force: true });

  // ---- secrets and expiry (docs/operations/DEMO_SECRETS_AND_SESSIONS.md)
  { const fresh = { DEMO_SESSION_SECRET: crypto.randomBytes(32).toString('base64'), EMPATHIA_APP_PASSWORD: rnd(), EMPATHIA_WORKER_PASSWORD: rnd() };
    const wentDown = await stop(); start(SUPER, fresh); const up2 = wentDown && await waitFor(`${base}/health`);
    const oldSession = up2 ? await j('GET', '/v1/me', { token: o.body.session.accessToken }) : { status: 0 };
    const viaKey = up2 ? await j('POST', '/v1/demo/sessions', { body: { sandboxId: o.body.sandbox.id, key: o.body.sandbox.key, role: 'exec' } }) : { status: 0 };
    const same = viaKey.status === 200 && JSON.stringify((await j('GET', `/v1/rooms/${o.body.scenario.room}/thread`, { token: viaKey.body.accessToken })).body.stages) === JSON.stringify(before.thread);
    const oldPw = psql(DB, 'SELECT 1', creds.app, creds.appPassword); const newPw = psql(DB, 'SELECT 1', creds.app, fresh.EMPATHIA_APP_PASSWORD);
    step('R-11', 'rotating the three secrets is a restart with new values: every session issued before stops, the old database password no longer connects, and a sandbox still opens with its key and reads the same thread',
      up2 && oldSession.status === 401 && same && oldPw.status !== 0 && /password authentication failed/.test(oldPw.stderr) && newPw.status === 0, `earlier session ${oldSession.status} · session from the key ${viaKey.status}, same thread ${same} · old role password ${oldPw.status !== 0 ? 'refused' : 'STILL ACCEPTED'} · new one ${newPw.status === 0 ? 'accepted' : 'refused'}`);

    const tid = psql(DB, `SELECT tenant_id FROM app.demo_sandbox WHERE id = '${o.body.sandbox.id}'`).stdout.trim(); const kept0 = count(`SELECT count(*) FROM app.audit_event WHERE tenant_id = '${tid}'`);
    const aged = psql(DB, `UPDATE app.demo_sandbox SET expires_at = now() - interval '1 minute' WHERE id = '${o.body.sandbox.id}'`);
    const afterExpiry = await j('GET', '/v1/me', { token: viaKey.body?.accessToken }); const keyNow = await j('POST', '/v1/demo/sessions', { body: { sandboxId: o.body.sandbox.id, key: o.body.sandbox.key, role: 'exec' } });
    step('R-12', 'an expired sandbox: its key opens nothing, a session issued before stops, the visitor is told why, and its records are kept', aged.status === 0 && afterExpiry.status === 401 && keyNow.status === 401 && /expired/.test(String(keyNow.body?.detail)) && count(`SELECT count(*) FROM app.audit_event WHERE tenant_id = '${tid}'`) >= kept0 && kept0 > 0 && count(`SELECT count(*) FROM app.room WHERE tenant_id = '${tid}'`) === 1,
      aged.status === 0 ? `session ${afterExpiry.status} · key ${keyNow.status} “${String(keyNow.body?.detail).slice(0, 80)}” · ${kept0} audit rows and the room still in the database` : aged.stderr.trim().slice(0, 200)); }
} catch (e) { step('R-XX', 'the rehearsal could not be completed', false, (e && e.message) || String(e)); }
finally { await stop(); try { clusterDown(); } catch { /* reported by the next run, which removes it first */ } fs.rmSync(objects, { recursive: true, force: true }); }

const want = ['R-01', 'R-02', 'R-03', 'R-04', 'R-05', 'R-06', 'R-07', 'R-08', 'R-09', 'R-10', 'R-11', 'R-12']; for (const id of want) if (!steps.some((x) => x.id === id)) step(id, 'NOT RUN', false, 'an earlier step stopped the rehearsal');
const pass = steps.filter((x) => x.result === 'PASS').length; const fail = steps.length - pass;
let commit = ''; try { commit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).stdout.trim(); } catch { /* not a checkout */ }
fs.mkdirSync(path.join(repo, 'tests/evidence'), { recursive: true });
fs.writeFileSync(path.join(repo, 'tests/evidence/RENDER_DEMO_REHEARSAL.json'), JSON.stringify({ at: new Date().toISOString(), commit, blueprint: 'deploy/render/demo.render.yaml', startCommand: sh, passed: pass, failed: fail, steps, recovery,
  smoke: fs.existsSync(path.join(repo, '.local/demo-rehearsal-smoke.json')) ? JSON.parse(fs.readFileSync(path.join(repo, '.local/demo-rehearsal-smoke.json'), 'utf8')).results : [],
  database: `a PostgreSQL ${pgVersion} cluster created for this run and removed after it; owner: not a superuser, may create roles`,
  limits: 'No TLS in the rehearsal cluster (PGSSLMODE rehearsed as disable); no Render proxy, container or free-plan sleep; the owner\'s attributes beyond "not a superuser, may create roles" are an assumption about the platform\'s user. The image build and the edge are seen only on Render.' }, null, 1) + '\n');
console.log(`\nPASS ${pass} · FAIL ${fail}`); process.exit(fail ? 1 : 0);
