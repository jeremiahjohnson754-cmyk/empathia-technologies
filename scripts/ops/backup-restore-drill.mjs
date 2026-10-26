#!/usr/bin/env node
/**
 * Backup-and-restore drill for the production starter (docs/operations/BACKUP_AND_RESTORE.md).
 *
 *  1. create a scratch database empathia_ops_g, migrate and seed it through the real code (services/enterprise-api/dist/src/db/seed.js);
 *  2. start the real API in-process against it and upload evidence files as the commissioning engineer (so evidence rows and
 *     content-addressed objects exist);
 *  3. pg_dump -Fc the database; pg_restore it into empathia_ops_g_restore;
 *  4. compare: row count of every table in schemas app and app_meta; the (id, sha256) list of every evidence row; RLS ENABLED+FORCED
 *     flags per table; the set of user triggers; the runtime role still sees zero rows without a tenant (RLS functional after restore);
 *  5. object store: copy the content-addressed directory, re-hash every copied object and check each evidence row's object verifies;
 *  6. drop both databases and remove the scratch object directories.
 * Writes docs/operations/BACKUP_RESTORE_DRILL.json. Exit 1 on any mismatch. Never prints credentials.
 *   node scripts/ops/backup-restore-drill.mjs        (needs: node scripts/db.mjs up; services/enterprise-api built)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BIN = '/usr/lib/postgresql/16/bin';
const bin = (n) => (fs.existsSync(path.join(BIN, n)) ? path.join(BIN, n) : n);
const DB = 'empathia_ops_g', RDB = 'empathia_ops_g_restore', PORT = 4597;
const scratch = path.join(repo, '.local/ops-drill'); fs.rmSync(scratch, { recursive: true, force: true }); fs.mkdirSync(scratch, { recursive: true });
const objects = path.join(scratch, 'objects'), objectsCopy = path.join(scratch, 'objects-restored'), dump = path.join(scratch, `${DB}.dump`);

execFileSync(process.execPath, [path.join(repo, 'scripts/db.mjs'), 'up'], { stdio: 'ignore' });
const c = JSON.parse(fs.readFileSync(path.join(repo, '.local/pg/credentials.json'), 'utf8'));
const superEnv = { ...process.env, PGPASSWORD: c.superPassword };
const psql = (sql, db = 'postgres', user = c.superuser, pw = c.superPassword) => {
  const r = spawnSync(bin('psql'), ['-h', '127.0.0.1', '-p', String(c.port), '-U', user, '-d', db, '-v', 'ON_ERROR_STOP=1', '-qAt', '-c', sql], { env: { ...process.env, PGPASSWORD: pw }, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr.trim());
  return r.stdout.trim();
};
const makeDb = (name) => { psql(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`); psql(`CREATE DATABASE ${name} OWNER ${c.owner}`); psql(`REVOKE ALL ON DATABASE ${name} FROM PUBLIC; GRANT CONNECT ON DATABASE ${name} TO ${c.app};`); };
const url = (user, pw, db) => `postgres://${user}:${encodeURIComponent(pw)}@127.0.0.1:${c.port}/${db}`;
const result = { drill: 'backup-restore', at: new Date().toISOString(), postgres: '', database: DB, restoredInto: RDB, steps: [], checks: [], result: 'FAIL' };
const step = (s) => { result.steps.push(s); console.log(`• ${s}`); };
const check = (name, ok, detail) => { result.checks.push({ check: name, result: ok ? 'PASS' : 'FAIL', ...detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); };

try {
  result.postgres = psql('SHOW server_version');
  // 1. migrate + seed through the real code
  makeDb(DB);
  Object.assign(process.env, { DATABASE_URL: url(c.owner, c.ownerPassword, DB), APP_DATABASE_URL: url(c.app, c.appPassword, DB), NODE_ENV: 'test', PORT: String(PORT), WORKER: 'off', LOG_LEVEL: 'error', OBJECT_STORE_DIR: objects });
  const api = path.join(repo, 'services/enterprise-api/dist/src');
  const seeded = await (await import(path.join(api, 'db/seed.js'))).seed();
  step(`migrated and seeded ${DB}: ${seeded.rooms.length} rooms, ${seeded.people} people`);

  // 2. evidence through the real API
  const app = await (await import(path.join(api, 'main.js'))).start();
  try {
    const base = `http://127.0.0.1:${PORT}`;
    const tok = (await (await fetch(`${base}/v1/auth/token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'cxeng@empathia-demo.empathia.invalid', password: 'empathia-dev-only', tenant: 'empathia-demo', role: 'cxeng' }) })).json()).accessToken;
    for (const [i, body] of ['synthetic field observation A', 'synthetic field observation B', '{"synthetic":true,"reading_db":42}'].entries()) {
      const r = await fetch(`${base}/v1/evidence`, { method: 'POST', headers: { authorization: `Bearer ${tok}`, 'content-type': i === 2 ? 'application/json' : 'text/plain', 'x-file-name': `drill-${i}.txt` }, body });
      if (r.status !== 201) throw new Error(`evidence upload ${i}: ${r.status}`);
    }
    const { OutboxWorker } = await import(path.join(api, 'worker/outbox.js'));
    await new OutboxWorker(app.pool).drain();
  } finally { await app.stop(); }
  step('uploaded 3 evidence files through POST /v1/evidence as the commissioning engineer; drained the outbox');

  // 3. dump and restore
  const t0 = Date.now();
  execFileSync(bin('pg_dump'), ['-h', '127.0.0.1', '-p', String(c.port), '-U', c.superuser, '-Fc', '-f', dump, DB], { env: superEnv });
  const dumpMs = Date.now() - t0; const dumpBytes = fs.statSync(dump).size;
  const dumpSha = crypto.createHash('sha256').update(fs.readFileSync(dump)).digest('hex');
  makeDb(RDB);
  const t1 = Date.now();
  execFileSync(bin('pg_restore'), ['-h', '127.0.0.1', '-p', String(c.port), '-U', c.superuser, '-d', RDB, '--exit-on-error', dump], { env: superEnv });
  const restoreMs = Date.now() - t1;
  step(`pg_dump -Fc: ${dumpBytes} bytes in ${dumpMs} ms (sha256 ${dumpSha.slice(0, 16)}…); pg_restore into ${RDB} in ${restoreMs} ms`);
  Object.assign(result, { dump: { format: 'custom (-Fc)', bytes: dumpBytes, sha256: dumpSha, dumpMs, restoreMs } });

  // 4. compare
  const tables = psql("SELECT n.nspname || '.' || c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND n.nspname IN ('app', 'app_meta') ORDER BY 1", DB).split('\n').filter(Boolean);
  const counts = (db) => Object.fromEntries(tables.map((t) => [t, Number(psql(`SELECT count(*) FROM ${t}`, db))]));
  const a = counts(DB), b = counts(RDB);
  const diff = tables.filter((t) => a[t] !== b[t]);
  check('row count of every table in app and app_meta', diff.length === 0, { tables: tables.length, rows: Object.values(a).reduce((x, y) => x + y, 0), mismatched: diff, counts: a });
  const evq = "SELECT coalesce(string_agg(id::text || ':' || sha256 || ':' || bytes, ',' ORDER BY id), '') FROM app.evidence_object";
  const e1 = psql(evq, DB), e2 = psql(evq, RDB);
  check('evidence rows: identical (id, sha256, bytes)', e1 === e2 && e1.length > 0, { evidenceRows: e1 ? e1.split(',').length : 0, digest: crypto.createHash('sha256').update(e1).digest('hex') });
  const rlsq = "SELECT string_agg(c.relname || ':' || c.relrowsecurity || ':' || c.relforcerowsecurity, ',' ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'app' AND c.relkind = 'r'";
  const r1 = psql(rlsq, DB), r2 = psql(rlsq, RDB);
  const forced = r2.split(',').filter((x) => x.endsWith(':true:true')).length;
  check('row-level security ENABLED and FORCED flags identical after restore', r1 === r2, { tablesForced: forced, tablesEnabledOnly: r2.split(',').filter((x) => x.endsWith(':true:false')).map((x) => x.split(':')[0]) });
  const trq = "SELECT string_agg(c.relname || '.' || t.tgname, ',' ORDER BY c.relname, t.tgname) FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'app' AND NOT t.tgisinternal";
  const t1s = psql(trq, DB), t2s = psql(trq, RDB);
  check('append-only and rule triggers identical after restore', t1s === t2s && /evidence_append_only/.test(t2s), { triggers: t2s.split(',').length });
  const appCount = psql('SELECT count(*) FROM app.room', RDB, c.app, c.appPassword);
  check('runtime role sees no rows without a tenant in the restored database (RLS functional)', appCount === '0', { roomsVisibleWithoutTenant: Number(appCount) });
  let appendOnly = false; try { psql('DELETE FROM app.evidence_object', RDB); } catch (e) { appendOnly = /append-only/.test(e.message); }
  check('evidence stays append-only in the restored database (DELETE refused, EM001)', appendOnly, {});
  const migq = "SELECT string_agg(version || ':' || sha256, ',' ORDER BY version) FROM app_meta.schema_migration";
  const mig1 = psql(migq, DB), mig2 = psql(migq, RDB);
  check('migration ledger (versions and sha256) identical', mig1 === mig2, { migrations: mig2.split(',').length });

  // 5. object store: content-addressed copy and re-verification
  fs.cpSync(objects, objectsCopy, { recursive: true });
  const files = []; const walk = (d) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else files.push(p); } }; walk(objectsCopy);
  const badHash = files.filter((f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') !== path.basename(f));
  const rows = psql("SELECT string_agg(storage_key || '=' || sha256, ',') FROM app.evidence_object", RDB).split(',').filter(Boolean);
  const missing = rows.filter((r) => { const [k, h] = r.split('='); const f = path.join(objectsCopy, k); return !fs.existsSync(f) || crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') !== h; });
  check('object store copy: every object re-hashes to its name, and every restored evidence row finds its object', badHash.length === 0 && missing.length === 0 && files.length > 0, { objects: files.length, badHash: badHash.length, evidenceRowsWithoutObject: missing.length });
  result.result = result.checks.every((x) => x.result === 'PASS') ? 'PASS' : 'FAIL';
} catch (e) {
  result.error = e.message; check('drill ran to completion', false, { error: e.message.slice(0, 500) });
} finally {
  try { psql(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`); psql(`DROP DATABASE IF EXISTS ${RDB} WITH (FORCE)`); result.steps.push(`dropped ${DB} and ${RDB}`); } catch (e) { result.steps.push(`cleanup failed: ${e.message}`); }
  fs.rmSync(scratch, { recursive: true, force: true }); result.steps.push('removed the scratch dump and object directories');
}
fs.writeFileSync(path.join(repo, 'docs/operations/BACKUP_RESTORE_DRILL.json'), JSON.stringify(result, null, 2) + '\n');
console.log(`\nbackup-restore drill ${result.result} — docs/operations/BACKUP_RESTORE_DRILL.json`);
process.exit(result.result === 'PASS' ? 0 : 1);
