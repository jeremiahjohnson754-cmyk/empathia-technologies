#!/usr/bin/env node
/**
 * The recovery drill on a real export from the platform (founder, 17 Nov 2026: "Please validate the archive and perform the
 * restoration rehearsal in an isolated environment. Verify row integrity, migration hashes, tenant isolation, audit-chain
 * integrity, recovery time, and data-loss boundaries. Do not overwrite the active staging database, change production, or create
 * additional paid resources without approval.").
 *
 *   NODE_USE_ENV_PROXY=1 node scripts/ops/platform-export-drill.mjs --archive=<the platform's .dir.tar.gz> [--api=<the hosted API, for comparison>] [--json=<report>]
 *
 * Where it runs: a PostgreSQL cluster of its own under .local/recovery-drill/, on 127.0.0.1, created for the drill and removed after
 * it. The staging database is never connected to (it accepts no connection from outside its private network): the hosted API is
 * only read, over HTTPS, for comparison. Nothing is created on the platform.
 *
 *   D-01  the archive is sound: gzip, members, one table of contents that pg_restore reads
 *   D-02  what it holds: rows per table, counted in the archive itself
 *   D-03  it restores into an empty database as an owner who is not a superuser, and every object is that owner's
 *   D-04  row integrity: every table holds exactly the rows the archive holds
 *   D-05  migration hashes (RV-01)      D-06  audit chains recomputed (RV-02)      D-07  row-level security forced (RV-03)
 *   D-08  privileges: the platform's export carries none. The service refuses on such a copy; the runtime role cannot repair; the
 *         owner's repair command does; the result equals a freshly migrated reference
 *   D-09  tenant isolation in effect: the runtime role reads nothing without a tenant and one tenant's rows with it
 *   D-10  the service starts on the copy with its own start command and answers ok
 *   D-11  the data-loss boundary: the marker recorded before the export is in the copy, the one recorded after it is not
 *   D-12  staging is as it was: the hosted API answers, on the same release, and still holds what was recorded after the export
 *
 * The export is unpacked into an empty directory of its own. No URL, password, key or row content is printed or written.
 */
import fs from 'node:fs'; import os from 'node:os'; import net from 'node:net'; import path from 'node:path'; import crypto from 'node:crypto';
import { spawn, spawnSync, execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { restore, verify, manifest, privileges } from './restore-verify.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d = '') => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const archive = path.resolve(arg('archive')); if (!arg('archive') || !fs.existsSync(archive)) { console.error('usage: platform-export-drill.mjs --archive=<.dir.tar.gz> [--api=<hosted API>] [--json=<report>]'); process.exit(2); }
const drillState = fs.existsSync(path.join(repo, '.local/recovery-drill.json')) ? JSON.parse(fs.readFileSync(path.join(repo, '.local/recovery-drill.json'), 'utf8')) : null;
const hosted = (arg('api') || drillState?.api || '').replace(/\/$/, '');
const BIN = ['/usr/lib/postgresql/16/bin', '/usr/local/opt/postgresql@16/bin', '/opt/homebrew/opt/postgresql@16/bin', '/usr/pgsql-16/bin'].find((d) => fs.existsSync(path.join(d, 'initdb'))) || '';
const base = path.join(repo, '.local/recovery-drill'); const pgData = path.join(base, 'pg/data'); const unpacked = path.join(base, 'archive'); const rt = path.join(repo, '.local/demo-rt');
const rnd = () => crypto.randomBytes(24).toString('base64url'); const DB = 'empathia_demo';
const creds = { port: 0, superuser: 'drill_admin', superPassword: rnd(), owner: 'empathia_owner', ownerPassword: rnd(), appPassword: rnd(), workerPassword: rnd() };
const url = (u, p, db = DB) => `postgres://${u}:${encodeURIComponent(p)}@127.0.0.1:${creds.port}/${db}`;
const psql = (sql, user = creds.superuser, pass = creds.superPassword, pre = '') => spawnSync(path.join(BIN, 'psql'), ['-h', '127.0.0.1', '-p', String(creds.port), '-U', user, '-d', DB, '-v', 'ON_ERROR_STOP=1', '-qAt', '-F', '\t', '-c', pre + sql], { env: { ...process.env, PGPASSWORD: pass }, encoding: 'utf8', maxBuffer: 64 << 20 });
const one = (sql, ...a) => { const r = psql(sql, ...a); if (r.status !== 0) throw new Error((r.stderr || '').trim().split('\n')[0]); return r.stdout.trim(); };
const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
const asPg = (cmd, args) => (isRoot ? spawnSync('runuser', ['-u', 'postgres', '--', path.join(BIN, cmd), ...args], { encoding: 'utf8' }) : spawnSync(path.join(BIN, cmd), args, { encoding: 'utf8' }));
const freePort = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const clusterDown = () => { if (fs.existsSync(path.join(pgData, 'PG_VERSION'))) asPg('pg_ctl', ['-D', pgData, '-m', 'immediate', '-w', 'stop']); const pg = path.dirname(pgData); if (isRoot && fs.existsSync(pg)) { try { execFileSync('chown', ['-R', String(process.getuid()), pg]); } catch { /* removed below */ } } fs.rmSync(pg, { recursive: true, force: true }); };
const steps = []; const step = (id, name, ok, detail = '') => { steps.push({ id, name, result: ok ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 600) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ` — ${String(detail).slice(0, 420)}` : ''}`); return ok; };
const http = async (b, method, p, { token, body } = {}) => { try { const r = await fetch(b + p, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000) }); return { status: r.status, body: await r.json().catch(() => null) }; } catch (e) { return { status: 0, body: null, error: String(e.message || e) }; } };
const secs = (t) => Math.round((Date.now() - t) / 100) / 10;
let api = null; const stopApi = async () => { if (!api) return; try { process.kill(-api.pid, 'SIGTERM'); } catch { /* gone */ } const t = Date.now(); const alive = () => { try { process.kill(-api.pid, 0); return true; } catch { return false; } }; while (alive() && Date.now() - t < 8000) await new Promise((r) => setTimeout(r, 100)); if (alive()) { try { process.kill(-api.pid, 'SIGKILL'); } catch { /* gone */ } } api = null; };
process.on('exit', () => { if (api) { try { process.kill(-api.pid, 'SIGKILL'); } catch { /* gone */ } } });

const report = { drill: 'a logical export made by the platform, restored and verified in an isolated database', at: new Date().toISOString(), where: 'this workstation: a PostgreSQL cluster created for the drill on 127.0.0.1 and removed after it; not the platform', archive: {}, timings: {}, loss: {}, limits: [] };
try {
  // ------------------------------------------------------------------ D-01 the archive
  const t0 = Date.now(); const bytes = fs.statSync(archive).size; const sha = crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
  const gz = spawnSync('gzip', ['-t', archive]); const members = spawnSync('tar', ['-tvzf', archive], { encoding: 'utf8', maxBuffer: 64 << 20 }).stdout.trim().split('\n');
  const kinds = members.map((l) => l[0]); const names = spawnSync('tar', ['-tzf', archive], { encoding: 'utf8', maxBuffer: 64 << 20 }).stdout.trim().split('\n');
  const safe = kinds.every((k) => k === '-' || k === 'd') && names.every((n) => !path.isAbsolute(n) && !n.split('/').includes('..'));
  fs.rmSync(unpacked, { recursive: true, force: true }); fs.mkdirSync(unpacked, { recursive: true });
  const x = safe && gz.status === 0 ? spawnSync('tar', ['-xzf', archive, '-C', unpacked, '--no-same-owner', '--no-same-permissions'], { encoding: 'utf8' }) : { status: 1 };
  const tocs = x.status === 0 ? fs.readdirSync(unpacked, { recursive: true }).map(String).filter((f) => path.basename(f) === 'toc.dat') : []; const dir = tocs.length === 1 ? path.join(unpacked, path.dirname(tocs[0])) : '';
  const toc = dir ? spawnSync(path.join(BIN, 'pg_restore'), ['-l', dir], { encoding: 'utf8', maxBuffer: 64 << 20 }) : { status: 1, stdout: '' };
  const head = (k) => (new RegExp(`^;\\s+${k}: (.*)$`, 'm').exec(toc.stdout) || [])[1] || ''; const created = (/^; Archive created at (\S+ \S+)/m.exec(toc.stdout) || [])[1] || '';
  const requested = (names.map((n) => /(\d{4}-\d\d-\d\dT\d\d:\d\dZ)/.exec(n)).find(Boolean) || [])[1] || '';
  report.archive = { bytes, sha256: sha, members: names.length, format: head('Format'), database: head('dbname'), entries: Number(head('TOC Entries')), dumpedFrom: head('Dumped from database version'), dumpedBy: head('Dumped by pg_dump version'), requestedAt: requested, createdAtServerTime: created };
  report.timings.validateSeconds = secs(t0);
  if (!step('D-01', 'the archive is sound: it decompresses, holds only plain files in relative paths, and pg_restore reads its one table of contents', gz.status === 0 && safe && toc.status === 0 && head('Format') === 'DIRECTORY',
    `${bytes} bytes, sha256 ${sha.slice(0, 16)}…, ${names.length} members · ${head('Format')} format of database ${head('dbname')}, ${head('TOC Entries')} entries · dumped from PostgreSQL ${head('Dumped from database version')} · requested ${requested}, written ${created} (the database server's clock, UTC)`)) throw new Error('the archive is not usable');

  // ------------------------------------------------------------------ D-02 the rows in the archive itself
  // a table's data file is COPY text: one row a line (a newline inside a value is written \n), ended by a line holding \.
  const inArchive = {}; for (const m of toc.stdout.matchAll(/^(\d+); \d+ \d+ TABLE DATA (\S+) (\S+) /gm)) { const f = path.join(dir, `${m[1]}.dat`); let n = 0; if (fs.existsSync(f)) { for (const l of fs.readFileSync(f, 'utf8').split('\n')) { if (l === '\\.') break; n += 1; } } else n = NaN; inArchive[`${m[2]}.${m[3].replace(/"/g, '')}`] = n; }
  const archiveRows = Object.values(inArchive).reduce((a, b) => a + b, 0); report.archive.tables = Object.keys(inArchive).length; report.archive.rows = archiveRows;
  step('D-02', 'what the archive holds, counted in the archive itself', Object.keys(inArchive).length > 50 && Number.isFinite(archiveRows) && archiveRows > 0, `${archiveRows} rows in ${Object.keys(inArchive).length} tables · ${Object.values(inArchive).filter((n) => n === 0).length} tables empty`);

  // ------------------------------------------------------------------ D-03 an isolated database; restore as an owner who is not a superuser
  const tC = Date.now(); clusterDown(); creds.port = await freePort(); fs.mkdirSync(pgData, { recursive: true });
  const pw = path.join(path.dirname(pgData), '.pw'); fs.writeFileSync(pw, creds.superPassword, { mode: 0o600 }); if (isRoot) execFileSync('chown', ['-R', 'postgres', path.dirname(pgData)]);
  const init = asPg('initdb', ['-D', pgData, '-U', creds.superuser, '--pwfile', pw, '-A', 'scram-sha-256', '-E', 'UTF8', '--locale=C.UTF-8']); fs.rmSync(pw, { force: true }); if (init.status !== 0) throw new Error(`initdb failed: ${(init.stderr || '').slice(-300)}`);
  fs.appendFileSync(path.join(pgData, 'postgresql.conf'), `\n# a drill cluster: thrown away\nlisten_addresses = '127.0.0.1'\nport = ${creds.port}\nunix_socket_directories = '${os.tmpdir()}'\npassword_encryption = 'scram-sha-256'\n`);
  const st = asPg('pg_ctl', ['-D', pgData, '-l', path.join(path.dirname(pgData), 'server.log'), '-w', 'start']); if (st.status !== 0) throw new Error(`the drill cluster did not start: ${(st.stderr || st.stdout || '').slice(-300)}`);
  const mk = spawnSync(path.join(BIN, 'psql'), ['-h', '127.0.0.1', '-p', String(creds.port), '-U', creds.superuser, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-qAt', '-c', `CREATE ROLE ${creds.owner} LOGIN PASSWORD '${creds.ownerPassword}' NOSUPERUSER CREATEROLE CREATEDB`, '-c', `CREATE DATABASE ${DB} OWNER ${creds.owner}`], { env: { ...process.env, PGPASSWORD: creds.superPassword }, encoding: 'utf8' }); if (mk.status !== 0) throw new Error(`the drill database could not be made: ${mk.stderr}`);
  report.timings.clusterSeconds = secs(tC);
  const ownerUrl = url(creds.owner, creds.ownerPassword); const superUrl = url(creds.superuser, creds.superPassword);
  // the Blueprint's own environment for the service, with this cluster in place of the platform's database
  const bp = fs.readFileSync(path.join(repo, 'deploy/render/demo.render.yaml'), 'utf8'); const declared = {}; for (const m of bp.matchAll(/- key: (\S+)[^\n]*\n\s+(value|generateValue|fromDatabase):\s*([^\n]*)/g)) declared[m[1]] = m[2] === 'value' ? m[3].trim().replace(/^"(.*)"$/, '$1') : `<${m[2]}>`;
  const port = await freePort(); const local = `http://127.0.0.1:${port}`; const objects = fs.mkdtempSync(path.join(base, 'objects-'));
  const env = { PATH: process.env.PATH, PORT: String(port), OBJECT_STORE_DIR: objects }; for (const [k, v] of Object.entries(declared)) env[k] = v === '<fromDatabase>' ? ownerUrl : k === 'DEMO_SESSION_SECRET' ? crypto.randomBytes(32).toString('base64') : k === 'EMPATHIA_APP_PASSWORD' ? creds.appPassword : k === 'EMPATHIA_WORKER_PASSWORD' ? creds.workerPassword : v;
  env.PGSSLMODE = 'disable';   // the drill cluster has no TLS
  env.WORKER = 'off';          // the copy is looked at, not operated: nothing that was pending at the export is processed by the drill
  if (!fs.existsSync(path.join(rt, 'services/enterprise-api/dist/src/main.js'))) { const a = spawnSync(process.execPath, [path.join(repo, 'deploy/render/assemble-runtime.mjs'), `--out=${rt}`], { cwd: repo, encoding: 'utf8' }); if (a.status !== 0) throw new Error('the runtime tree could not be assembled (node scripts/build.mjs first)'); }
  const tR = Date.now();
  // privileges are restored with the data, so the two runtime roles exist first: made by the service's own first preparation step
  const roles = spawnSync(process.execPath, ['services/enterprise-api/dist/src/db/bootstrap.js', '--roles'], { cwd: rt, env, encoding: 'utf8' }); if (roles.status !== 0) throw new Error(`the runtime roles could not be made: ${(roles.stderr || roles.stdout || '').trim().split('\n').pop().slice(0, 200)}`);
  let restored = null; let why = ''; try { restored = restore(dir, ownerUrl); } catch (e) { why = e.message; }
  report.timings.restoreSeconds = secs(tR);
  const notOwners = restored ? Number(one(`SELECT (SELECT count(*) FROM pg_tables WHERE schemaname IN ('app','app_meta','founder') AND tableowner <> '${creds.owner}') + (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname IN ('app','app_meta','founder') AND pg_get_userbyid(p.proowner) <> '${creds.owner}')`)) : -1;
  const ownerAttrs = one(`SELECT rolsuper::int + rolbypassrls::int FROM pg_roles WHERE rolname = '${creds.owner}'`);
  report.skippedPlatformExtensions = restored ? restored.skippedPlatformExtensions : [];
  if (!step('D-03', 'it restores into an empty database as an owner who is not a superuser, and every table and function is that owner’s', !!restored && notOwners === 0 && ownerAttrs === '0',
    restored ? `pg_restore --exit-on-error finished in ${report.timings.restoreSeconds} s · objects not the owner’s: ${notOwners} · left out, by name: ${report.skippedPlatformExtensions.join(', ') || 'nothing'} (the platform’s own extension; no migration creates it)` : why)) throw new Error('the restore did not complete');

  // ------------------------------------------------------------------ D-04…D-07 what came back
  const tV = Date.now(); const now = manifest(superUrl);
  // every table of every schema the export holds (the manifest covers the two application schemas; the export also has the founder schema)
  const inDb = {}; for (const t of one("SELECT schemaname || '.' || tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY 1").split('\n').filter(Boolean)) inDb[t] = Number(one(`SELECT count(*) FROM ${t}`));
  const dbRows = Object.values(inDb).reduce((a, b) => a + b, 0); const differ = Object.keys({ ...inArchive, ...inDb }).filter((t) => inArchive[t] !== inDb[t]);
  step('D-04', 'row integrity: the database holds exactly the tables the archive holds, and every table exactly the rows the archive holds', !differ.length && dbRows === archiveRows, `${dbRows} rows in ${Object.keys(inDb).length} tables in the database, ${archiveRows} in ${Object.keys(inArchive).length} in the archive · tables that differ: ${differ.slice(0, 5).map((t) => `${t} ${inArchive[t]}→${inDb[t]}`).join(', ') || 'none'}`);
  const rv = verify(superUrl); const ids = { 'RV-01': 'D-05', 'RV-02': 'D-06', 'RV-03': 'D-07' }; for (const r of rv) step(ids[r.id] || r.id, `${r.title} (${r.id})`, r.result === 'PASS', r.detail);
  report.restored = { rows: dbRows, tables: Object.keys(inDb).length, migrations: now.migrations.length, chains: now.auditHeads.length, sealedAuditRows: now.auditHeads.reduce((a, h) => a + h.seq, 0), rls: now.rls, sandboxes: Number(one("SELECT count(*) FROM app.tenant WHERE slug LIKE 'sbx-%'")) };

  report.timings.verifySeconds = secs(tV);

  // ------------------------------------------------------------------ D-08 privileges: the export carries none
  // The reference: a second database in the drill's cluster, made the way the service makes one (roles, then every migration).
  const tP = Date.now(); const mkRef = spawnSync(path.join(BIN, 'psql'), ['-h', '127.0.0.1', '-p', String(creds.port), '-U', creds.superuser, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-qAt', '-c', `CREATE DATABASE ${DB}_reference OWNER ${creds.owner}`], { env: { ...process.env, PGPASSWORD: creds.superPassword }, encoding: 'utf8' }); if (mkRef.status !== 0) throw new Error(`the reference database could not be made: ${mkRef.stderr}`);
  const refEnv = { ...env, DATABASE_URL: url(creds.owner, creds.ownerPassword, `${DB}_reference`) };
  for (const s of ['bootstrap.js --roles', 'migrate.js']) { const r = spawnSync(process.execPath, [`services/enterprise-api/dist/src/db/${s.split(' ')[0]}`, ...s.split(' ').slice(1)], { cwd: rt, env: refEnv, encoding: 'utf8' }); if (r.status !== 0) throw new Error(`the reference database could not be prepared (${s}): ${(r.stderr || r.stdout || '').trim().split('\n').pop().slice(0, 200)}`); }
  const refUrl = url(creds.superuser, creds.superPassword, `${DB}_reference`); const want = privileges(refUrl); const asRestored = privileges(superUrl);
  const missing = (have) => want.filter((l) => !have.includes(l)).length + have.filter((l) => !want.includes(l)).length;
  const refused = psql('SELECT count(*) FROM app.audit_event', 'empathia_app', creds.appPassword); const openFns = Number(one("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname IN ('app','app_meta','founder') AND p.prosecdef AND has_function_privilege('public', p.oid, 'EXECUTE')"));
  const refOpenFns = Number(spawnSync(path.join(BIN, 'psql'), ['-h', '127.0.0.1', '-p', String(creds.port), '-U', creds.superuser, '-d', `${DB}_reference`, '-qAt', '-c', "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname IN ('app','app_meta','founder') AND p.prosecdef AND has_function_privilege('public', p.oid, 'EXECUTE')"], { env: { ...process.env, PGPASSWORD: creds.superPassword }, encoding: 'utf8' }).stdout.trim());
  // by design or not, a migrated database leaves these open to every role: named here so they can be reviewed (the drill does not judge them)
  report.securityDefinerOpenToEveryRoleInAMigratedDatabase = spawnSync(path.join(BIN, 'psql'), ['-h', '127.0.0.1', '-p', String(creds.port), '-U', creds.superuser, '-d', `${DB}_reference`, '-qAt', '-c', "SELECT n.nspname || '.' || p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname IN ('app','app_meta','founder') AND p.prosecdef AND has_function_privilege('public', p.oid, 'EXECUTE') ORDER BY 1"], { env: { ...process.env, PGPASSWORD: creds.superPassword }, encoding: 'utf8' }).stdout.trim().split('\n').filter(Boolean);
  const before = missing(asRestored);
  // the service on the copy as it is: it must say unhealthy and refuse. Then the repair: refused to the runtime role, done by the owner.
  const cmdLine0 = (/dockerCommand:\s*(.+)/.exec(bp) || [])[1].trim().split(/\s+/);
  api = spawn(cmdLine0[0], cmdLine0.slice(1), { cwd: rt, env, stdio: ['ignore', 'ignore', 'ignore'], detached: true });
  let h0 = { status: 0 }; const tU = Date.now(); while (Date.now() - tU < 60000) { h0 = await http(local, 'GET', '/health'); if (h0.status) break; await new Promise((r) => setTimeout(r, 300)); }
  const unhealthy = h0.status === 503 && h0.body?.status === 'unhealthy' && h0.body?.privileges?.state === 'mismatch';
  const r0 = drillState ? await http(local, 'POST', '/v1/demo/sessions', { body: { sandboxId: drillState.sandboxId, key: drillState.key, role: 'exec' } }) : await http(local, 'GET', '/v1/demo');
  const refusedReq = r0.status === 503 && r0.body?.code === 'unavailable'; await stopApi();
  const repair = (extra) => spawnSync(process.execPath, ['services/enterprise-api/dist/src/db/privileges.js', 'repair'], { cwd: rt, env: { ...env, ...extra }, encoding: 'utf8' });
  const repairAsApp = repair({ DATABASE_URL: url('empathia_app', creds.appPassword) }); const appRefused = repairAsApp.status !== 0 && /by the owner of the schema/.test(repairAsApp.stderr) && missing(privileges(superUrl)) === before;
  const repairAsOwner = repair({}); let applied = 0; let aclWhy = ''; if (repairAsOwner.status === 0) applied = JSON.parse(repairAsOwner.stdout).statements; else aclWhy = (repairAsOwner.stderr || '').trim().slice(0, 200);
  const after = privileges(superUrl); const left = missing(after); const leftLines = [...want.filter((l) => !after.includes(l)).map((l) => `reference only: ${l}`), ...after.filter((l) => !want.includes(l)).map((l) => `copy only: ${l}`)];
 report.timings.privilegesSeconds = secs(tP);
  report.findings = [{ id: 'F-1', finding: 'the platform’s logical export carries no privileges', detail: `${restored.privilegeEntries} privilege entries among the archive’s ${report.archive.entries}. Restored as it is: ${want.filter((l) => !asRestored.includes(l)).length} of the ${want.length} privilege lines of a freshly migrated database are not what the copy has; the service’s runtime role is ${refused.status !== 0 ? `refused (${(refused.stderr || '').trim().split('\n')[0].replace(/^ERROR:\s*/, '')})` : 'not refused'}; ${openFns} security-definer functions can be run by any role (${refOpenFns} in a migrated database).`, consequence: 'a service started on a copy restored from an export, with nothing more done, answers "degraded": it cannot read its own schema', remedy: 'the service says unhealthy and refuses requests on such a copy; an operator runs the repair command as the owner; the result is compared with a freshly migrated reference database (this step)' },
    ...(report.skippedPlatformExtensions.length ? [{ id: 'F-2', finding: `the export includes the platform’s own extension (${report.skippedPlatformExtensions.join(', ')})`, detail: 'no migration creates it and an owner who is not a superuser cannot', consequence: 'pg_restore --exit-on-error stops on it', remedy: 'its entries are left out by name through pg_restore’s list' }] : [])];
  report.failSafe = { healthOnTheCopyAsRestored: `${h0.status} ${h0.body?.status || ''}`, requestRefused: refusedReq, repairAsTheRuntimeRole: appRefused ? 'refused, nothing changed' : 'NOT REFUSED', repairAsTheOwnerStatements: applied };
  step('D-08', 'privileges: the export carries none. On the copy as restored the service answers unhealthy and refuses requests; the runtime role cannot repair them; the owner’s repair command does; afterwards every privilege in the copy equals a freshly migrated reference', restored.privilegeEntries === 0 ? (unhealthy && refusedReq && appRefused && applied > 0 && left === 0 && want.length > 100) : left === 0,
    `${restored.privilegeEntries} privilege entries in the archive · as restored, ${want.filter((l) => !asRestored.includes(l)).length} of the reference’s ${want.length} privilege lines are not what the copy has; the runtime role is ${refused.status !== 0 ? 'refused the schema' : 'let in'}; ${openFns} security-definer functions open to every role (reference ${refOpenFns}) · the service on it: /health ${h0.status} ${h0.body?.status || ''}, a request ${r0.status} ${r0.body?.code || ''} · repair as the runtime role: ${appRefused ? 'refused, nothing changed' : 'NOT REFUSED'} · as the owner: ${applied} statements${aclWhy ? ` (${aclWhy})` : ''} · afterwards ${left} lines differ${left ? `: ${leftLines.slice(0, 3).join(' | ').slice(0, 200)}` : ''}`);
  const tV2 = Date.now();

  // ------------------------------------------------------------------ D-09 isolation in effect, as the service's own runtime role
  const tenants = one("SELECT tenant_id FROM app.audit_event GROUP BY tenant_id ORDER BY count(*) DESC, tenant_id LIMIT 2").split('\n').filter(Boolean);
  const asApp = (sql, tenant) => psql(sql, 'empathia_app', creds.appPassword, tenant ? `SET app.tenant_id = '${tenant}'; ` : '');
  const none = asApp('SELECT count(*) FROM app.audit_event'); const [a, b] = tenants; const trueA = Number(one(`SELECT count(*) FROM app.audit_event WHERE tenant_id = '${a}'`)); const total = Number(one('SELECT count(*) FROM app.audit_event'));
  const seenA = asApp('SELECT count(*), count(*) FILTER (WHERE tenant_id::text <> current_setting(\'app.tenant_id\')) FROM app.audit_event', a).stdout.trim().split('\t').map(Number);
  const reachB = b ? asApp(`SELECT count(*) FROM app.audit_event WHERE tenant_id = '${b}'`, a).stdout.trim() : 'n/a';
  const write = b ? asApp(`WITH u AS (UPDATE app.room SET name = name WHERE tenant_id = '${b}' RETURNING 1) SELECT count(*) FROM u`, a) : { status: 0, stdout: '0' }; const theirs = b ? Number(one(`SELECT count(*) FROM app.room WHERE tenant_id = '${b}'`)) : 0;
  const appAttrs = one("SELECT string_agg(rolname || ':' || (rolsuper::int + rolbypassrls::int + rolcreaterole::int + rolcreatedb::int), ',' ORDER BY rolname) FROM pg_roles WHERE rolname IN ('empathia_app','empathia_worker')");
  step('D-09', 'tenant isolation is in effect in the copy: the runtime role reads nothing without a tenant, exactly one tenant’s rows with it, and cannot reach or change another’s', (none.status !== 0 || none.stdout.trim() === '0') && seenA[0] === trueA && seenA[1] === 0 && trueA > 0 && trueA < total && (reachB === '0' || reachB === 'n/a') && (write.status !== 0 || write.stdout.trim() === '0') && theirs > 0 && appAttrs === 'empathia_app:0,empathia_worker:0',
    `audit rows: ${total} in all · with no tenant: ${none.status !== 0 ? 'refused' : none.stdout.trim()} · as one sandbox: ${seenA[0]} (its own ${trueA}), another tenant’s among them ${seenA[1]} · asked for another sandbox’s by name: ${reachB} · an update aimed at another sandbox’s ${theirs} room(s): ${write.status !== 0 ? 'refused' : `changed ${write.stdout.trim()} rows`} · runtime roles’ elevated attributes ${appAttrs}`);
  report.timings.verifySeconds = Math.round((report.timings.verifySeconds + secs(tV2)) * 10) / 10;

  // ------------------------------------------------------------------ D-10 the service on the copy
  const tS = Date.now(); const cmdLine = (/dockerCommand:\s*(.+)/.exec(bp) || [])[1].trim().split(/\s+/); let log = '';
  api = spawn(cmdLine[0], cmdLine.slice(1), { cwd: rt, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true }); api.stdout.on('data', (d) => { log += d; }); api.stderr.on('data', (d) => { log += d; });
  let health = { status: 0 }; while (Date.now() - tS < 90000) { health = await http(local, 'GET', '/health'); if (health.status === 200 && health.body?.status === 'ok') break; if (health.status === 200 && Date.now() - tS > 20000) break; await new Promise((r) => setTimeout(r, 300)); }
  report.timings.serveSeconds = secs(tS); const hostedHealth = hosted ? await http(hosted, 'GET', '/health') : { status: 0 };
  const sameMigrations = !hosted || hostedHealth.body?.database?.migrationsApplied === health.body?.database?.migrationsApplied;
  step('D-10', 'the service starts on the copy with the Blueprint’s own start command (roles, migrations, sandboxes on, then the API) and answers ok, with its database reachable', health.status === 200 && health.body?.status === 'ok' && health.body?.database?.reachable === true && sameMigrations,
    health.status === 200 && health.body?.status !== 'ok' ? `/health answered "${health.body?.status}": ${String(health.body?.database?.error || '').slice(0, 120)}` : health.status === 200 ? `/health ok in ${report.timings.serveSeconds} s · ${health.body.database.migrationsApplied} migrations applied${hosted ? ` (the hosted API reports ${hostedHealth.body?.database?.migrationsApplied})` : ''} · nothing new applied: ${Number(one('SELECT count(*) FROM app_meta.schema_migration'))} recorded` : `no answer: ${log.trim().split('\n').slice(-2).join(' | ').slice(0, 300)}`);

  // ------------------------------------------------------------------ D-11 the data-loss boundary
  if (drillState && health.status === 200) {
    const open = async (b) => { const s = await http(b, 'POST', '/v1/demo/sessions', { body: { sandboxId: drillState.sandboxId, key: drillState.key, role: 'exec' } }); if (s.status !== 200) return { status: s.status, version: -1 }; const f = await http(b, 'GET', `/v1/rooms/${drillState.room}/field-record`, { token: s.body.accessToken }); return { status: s.status, version: Number(f.body?.devices?.find((d) => d.asset === drillState.device)?.mounting?.version || 0) }; };
    const copy = await open(local); const live = hosted ? await open(hosted) : { status: 0, version: -1 };
    const before = copy.version >= drillState.before.version; const after = !!drillState.after && copy.version >= drillState.after.version;
    report.loss = { markerBefore: drillState.before.at, exportRequested: requested, exportWritten: created, markerAfter: drillState.after?.at || null, inTheCopy: { before, after }, copyVersion: copy.version, hostedVersion: live.version,
      boundary: `everything recorded up to the export (requested ${requested}, written ${created} UTC) is in the copy; everything recorded after it is not`, minutesBeforeToAfter: drillState.after ? Math.round((Date.parse(drillState.after.at) - Date.parse(drillState.before.at)) / 6000) / 10 : null };
    step('D-11', 'the data-loss boundary: the sandbox opens on the copy with its own key; the mounting recorded before the export is there, the one recorded after it is not', copy.status === 200 && before && !!drillState.after && !after && (!hosted || live.version === drillState.after.version),
      `marker before ${drillState.before.at} (version ${drillState.before.version}): ${before ? 'in the copy' : 'MISSING'} · export requested ${requested}, written ${created} · marker after ${drillState.after?.at || 'not made'} (version ${drillState.after?.version || '?'}): ${after ? 'IN THE COPY' : 'not in the copy'} · the copy holds version ${copy.version}${hosted ? `, staging holds version ${live.version}` : ''}`);
    report.staging = { release: hostedHealth.body?.release?.sha || null, markerVersionAfterTheDrill: live.version };
  } else step('D-11', 'the data-loss boundary', false, drillState ? 'the service did not answer on the copy' : 'there are no markers: run scripts/ops/recovery-drill.mjs mark before the export and mark-after after it');
  await stopApi();

  // ------------------------------------------------------------------ D-12 staging as it was
  if (hosted) { const h = await http(hosted, 'GET', '/health'); const d = await http(hosted, 'GET', '/v1/demo');
    step('D-12', 'staging is as it was: the hosted API answers on the same release and still holds what was recorded after the export; the drill connected to no database but its own', h.status === 200 && h.body?.release?.sha === hostedHealth.body?.release?.sha && report.staging?.markerVersionAfterTheDrill === drillState?.after?.version,
      `hosted /health ${h.status}, release ${String(h.body?.release?.sha || '').slice(0, 7)}, ${h.body?.database?.migrationsApplied} migrations · ${d.body?.live} live sandboxes there now, ${report.restored.sandboxes} sandbox tenants in the copy · every database connection of the drill went to 127.0.0.1:${creds.port}`); }
  report.timings.recoverySeconds = Math.round((report.timings.validateSeconds + report.timings.restoreSeconds + report.timings.privilegesSeconds + report.timings.verifySeconds + report.timings.serveSeconds) * 10) / 10;
  report.limits = ['measured on this workstation with a local disk and a database of this size; not the platform’s restore time', 'the time to create a new database instance on the platform, and to point the service at it and redeploy, is not in these figures', 'the copy was verified against the archive and against its own hashes; the staging database cannot be read from here, so it was compared only through the hosted API (migrations applied, the drill’s own record)', 'the platform keeps an export for 7 days; no copy is kept off the platform by any schedule yet', 'point-in-time recovery has not been exercised'];
} catch (e) { step('D-XX', 'the drill stopped', false, (e && e.message) || e); }
finally { await stopApi(); clusterDown(); fs.rmSync(unpacked, { recursive: true, force: true }); for (const f of fs.existsSync(base) ? fs.readdirSync(base) : []) if (f.startsWith('objects-')) fs.rmSync(path.join(base, f), { recursive: true, force: true }); }
const failed = steps.filter((s) => s.result === 'FAIL').length; report.passed = steps.length - failed; report.failed = failed; report.steps = steps;
if (arg('json')) fs.writeFileSync(path.resolve(arg('json')), JSON.stringify(report, null, 1) + '\n');
console.log(`\nrecovery drill: ${steps.length - failed} passed, ${failed} failed${report.timings.recoverySeconds ? ` · archive in hand to the service answering on the verified copy: ${report.timings.recoverySeconds} s (validate ${report.timings.validateSeconds}, restore ${report.timings.restoreSeconds}, privileges ${report.timings.privilegesSeconds}, verify ${report.timings.verifySeconds}, serve ${report.timings.serveSeconds})` : ''}`);
process.exit(failed ? 1 : 0);
