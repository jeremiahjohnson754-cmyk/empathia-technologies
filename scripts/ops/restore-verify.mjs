#!/usr/bin/env node
/**
 * Restore a logical export into an EMPTY database and verify what came back (founder, 17 Nov 2026: "automated database
 * backup/export and recovery planning"). An export that has never been restored is a hope, not a backup: this is the drill.
 *
 *   node scripts/ops/restore-verify.mjs restore --dump=<file or directory> --into=<owner URL of an empty database> --verify-as=<URL of a role that reads every row> [--manifest=<json>] [--json=<report>]
 *   node scripts/ops/restore-verify.mjs verify  --db=<URL of a role that reads every row> [--manifest=<json>] [--json=<report>]
 *   node scripts/ops/restore-verify.mjs manifest --db=<URL of a role that reads every row> --out=<json>
 *
 * restore   pg_restore --no-owner --exit-on-error, run AS THE OWNER the service will use, so every object (and every SECURITY DEFINER
 *           function) is the owner's again. Privileges are restored with it, so the runtime roles must exist first
 *           (bootstrap.js --roles). It refuses a database that already has an app schema.
 * verify    RV-01 every migration of this checkout is recorded, in order, and nothing else
 *           RV-02 the Evidence Ledger: every sealed row's hash recomputed from its content and its predecessor; no gap in any tenant's chain
 *           RV-03 tenant isolation came back with the data: row-level security is forced on the tables that had it, with their policies
 *           RV-04 (with --manifest) the same rows in every table and the same head of every tenant's chain as the source had
 * manifest  what a database holds: rows per table, migrations, and each tenant's chain head. Taken from the source, kept beside the
 *           export, it is what RV-04 compares against. A head kept outside the database is also what makes a rewritten chain detectable.
 *
 * The URLs: verify and manifest must read across tenants. Row-level security is forced on the owner in this schema, so the owner
 * reads nothing without a tenant; they need a role that bypasses it (a scratch cluster's superuser, or the platform's own tooling).
 * For the same reason pg_dump with the owner's URL is refused ("query would be affected by row-level security policy"): the export
 * has to be the platform's. docs/operations/DEMO_BACKUP_AND_RECOVERY.md.
 * No URL, password or row content is printed.
 */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BIN = ['/usr/lib/postgresql/16/bin', '/usr/local/opt/postgresql@16/bin', '/opt/homebrew/opt/postgresql@16/bin', '/usr/pgsql-16/bin', '/usr/bin'].find((d) => fs.existsSync(path.join(d, 'pg_restore'))) || '';
const envOf = (url) => { const u = new URL(url); return { ...process.env, PGHOST: u.hostname, PGPORT: u.port || '5432', PGUSER: decodeURIComponent(u.username), PGPASSWORD: decodeURIComponent(u.password), PGDATABASE: u.pathname.slice(1), ...(u.searchParams.get('sslmode') ? { PGSSLMODE: u.searchParams.get('sslmode') } : {}) }; };
const sql = (url, q) => { const r = spawnSync(path.join(BIN, 'psql'), ['-v', 'ON_ERROR_STOP=1', '-qAt', '-F', '\t', '-c', q], { env: envOf(url), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); if (r.status !== 0) throw new Error((r.stderr || '').trim().split('\n')[0] || 'psql failed'); return r.stdout.trim(); };
const rows = (url, q) => { const out = sql(url, q); return out ? out.split('\n').map((l) => l.split('\t')) : []; };

/** What the database holds. Every count is an exact count(*), table by table. */
export function manifest(url) {
  const tables = rows(url, "SELECT schemaname || '.' || tablename FROM pg_tables WHERE schemaname IN ('app', 'app_meta') ORDER BY 1").map((r) => r[0]);
  const counts = {}; for (const t of tables) counts[t] = Number(sql(url, `SELECT count(*) FROM ${t}`));
  const heads = rows(url, "SELECT tenant_id, max(seq), encode((array_agg(hash ORDER BY seq DESC))[1], 'hex') FROM app.audit_event WHERE seq IS NOT NULL GROUP BY tenant_id ORDER BY tenant_id").map(([tenant, seq, hash]) => ({ tenant, seq: Number(seq), hash }));
  const migrations = rows(url, 'SELECT version FROM app_meta.schema_migration ORDER BY version').map((r) => r[0]);
  const [enabled, forced, policies] = rows(url, "SELECT count(*) FILTER (WHERE c.relrowsecurity), count(*) FILTER (WHERE c.relrowsecurity AND c.relforcerowsecurity), (SELECT count(*) FROM pg_policies WHERE schemaname = 'app') FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'app' AND c.relkind = 'r'")[0].map(Number);
  return { at: new Date().toISOString(), serverVersion: sql(url, 'SHOW server_version'), tables: counts, rows: Object.values(counts).reduce((a, b) => a + b, 0), migrations, auditHeads: heads, rls: { enabled, forced, policies } };
}

export function verify(url, source = null) {
  const out = []; const ok = (id, title, pass, detail = '') => out.push({ id, title, result: pass ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) });
  // a migration is recorded by its number and the SHA-256 of its file, as the migration runner wrote it
  const dir = path.join(repo, 'database/migrations'); const want = fs.readdirSync(dir).filter((f) => /^\d{4}_[a-z0-9_]+\.sql$/.test(f)).sort().map((f) => `${f.slice(0, 4)} ${crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f), 'utf8')).digest('hex')}`);
  const have = rows(url, 'SELECT version, sha256 FROM app_meta.schema_migration ORDER BY version').map((r) => `${r[0]} ${r[1]}`); const same = JSON.stringify(want) === JSON.stringify(have);
  ok('RV-01', 'every migration of this checkout is recorded with the content it has here, and nothing else', same, `${have.length} recorded, ${want.length} in the checkout${same ? ', the same content' : ` · first difference: ${(want.find((f, k) => f !== have[k]) || have.find((f, k) => f !== want[k]) || '').slice(0, 17)}…`}`);
  // each sealed row: its hash is sha256(previous hash || its canonical content); its previous hash is the hash of the row before it; the sequence has no gap
  const chain = rows(url, `WITH c AS (SELECT e.tenant_id, e.seq, e.hash, e.prev_hash, sha256(e.prev_hash || convert_to(app.audit_canonical(e), 'UTF8')) AS again,
      lag(e.hash) OVER (PARTITION BY e.tenant_id ORDER BY e.seq) AS before, lag(e.seq) OVER (PARTITION BY e.tenant_id ORDER BY e.seq) AS before_seq FROM app.audit_event e WHERE e.seq IS NOT NULL)
    SELECT count(*), count(*) FILTER (WHERE hash IS DISTINCT FROM again), count(*) FILTER (WHERE (seq = 1 AND prev_hash <> decode(repeat('00', 32), 'hex')) OR (seq > 1 AND prev_hash IS DISTINCT FROM before)),
      count(*) FILTER (WHERE seq <> coalesce(before_seq, 0) + 1), count(DISTINCT tenant_id), (SELECT count(*) FROM app.audit_event WHERE seq IS NULL) FROM c`)[0].map(Number);
  ok('RV-02', 'the Evidence Ledger: every sealed row’s hash recomputed from its content and its predecessor; no gap in any tenant’s chain', chain[0] > 0 && chain[1] === 0 && chain[2] === 0 && chain[3] === 0, `${chain[0]} sealed rows in ${chain[4]} chains · ${chain[1]} hashes differ · ${chain[2]} broken links · ${chain[3]} gaps · ${chain[5]} rows not yet sealed`);
  const now = manifest(url);
  ok('RV-03', 'tenant isolation came back with the data: row-level security is forced on the tables that had it, with their policies', now.rls.forced > 20 && now.rls.policies >= now.rls.forced && (!source || (source.rls.forced === now.rls.forced && source.rls.enabled === now.rls.enabled && source.rls.policies === now.rls.policies)),
    `${now.rls.forced} tables forced, ${now.rls.enabled - now.rls.forced} enabled without force, ${now.rls.policies} policies${source ? ` · source ${source.rls.forced}, ${source.rls.enabled - source.rls.forced}, ${source.rls.policies}` : ' · no source manifest to compare with'}`);
  if (source) {
    const diff = Object.keys({ ...source.tables, ...now.tables }).filter((t) => source.tables[t] !== now.tables[t]);
    const heads = JSON.stringify(source.auditHeads) === JSON.stringify(now.auditHeads);
    ok('RV-04', 'the same rows in every table and the same head of every tenant’s chain as the source had', !diff.length && heads && now.rows === source.rows, `${now.rows} rows in ${Object.keys(now.tables).length} tables (source ${source.rows}) · tables that differ: ${diff.slice(0, 4).map((t) => `${t} ${source.tables[t]}→${now.tables[t]}`).join(', ') || 'none'} · chain heads ${heads ? 'the same' : 'DIFFER'}`);
  }
  return out;
}

export function restore(dump, into) {
  const has = sql(into, "SELECT count(*) FROM information_schema.schemata WHERE schema_name = 'app'");
  if (has !== '0') throw new Error('the target database already has an app schema: restore only into an empty database');
  // the platform's export is a directory-format dump in a .dir.tar.gz: unpacked beside nothing else, restored from the directory that holds toc.dat
  let from = dump; let tmp = '';
  if (/\.(tar\.gz|tgz)$/.test(dump)) {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'restore-verify-')); const x = spawnSync('tar', ['-xzf', dump, '-C', tmp, '--no-same-owner'], { encoding: 'utf8' });
    if (x.status !== 0) { fs.rmSync(tmp, { recursive: true, force: true }); throw new Error(`the archive could not be unpacked: ${(x.stderr || '').trim().slice(0, 200)}`); }
    const toc = fs.readdirSync(tmp, { recursive: true }).map(String).find((f) => path.basename(f) === 'toc.dat');
    if (!toc) { fs.rmSync(tmp, { recursive: true, force: true }); throw new Error('the archive holds no directory-format dump (no toc.dat)'); }
    from = path.join(tmp, path.dirname(toc));
  }
  try {
    const r = spawnSync(path.join(BIN, 'pg_restore'), ['--no-owner', '--exit-on-error', '--dbname', envOf(into).PGDATABASE, from], { env: envOf(into), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) throw new Error(`pg_restore stopped: ${(r.stderr || '').trim().split('\n').slice(-2).join(' | ').slice(0, 300)}`);
    return true;
  } finally { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('='); const cmd = process.argv[2];
  try {
    if (cmd === 'manifest' && arg('db') && arg('out')) { const m = manifest(arg('db')); fs.writeFileSync(arg('out'), JSON.stringify(m, null, 1) + '\n'); console.log(`manifest: ${m.rows} rows in ${Object.keys(m.tables).length} tables · ${m.migrations.length} migrations · ${m.auditHeads.length} chains`); }
    else if ((cmd === 'verify' && arg('db')) || (cmd === 'restore' && arg('dump') && arg('into') && arg('verify-as'))) {
      if (cmd === 'restore') { restore(arg('dump'), arg('into')); console.log('restored'); }
      const res = verify(cmd === 'restore' ? arg('verify-as') : arg('db'), arg('manifest') ? JSON.parse(fs.readFileSync(arg('manifest'), 'utf8')) : null);
      for (const x of res) console.log(`${x.result} ${x.id} ${x.title} — ${x.detail}`);
      const fail = res.filter((x) => x.result === 'FAIL').length; if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify({ at: new Date().toISOString(), passed: res.length - fail, failed: fail, results: res }, null, 1) + '\n');
      console.log(`restore-verify: ${res.length - fail} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
    } else { console.error('usage: restore-verify.mjs restore --dump=… --into=… --verify-as=… [--manifest=…] | verify --db=… [--manifest=…] | manifest --db=… --out=…'); process.exit(2); }
  } catch (e) { console.error(`restore-verify: ${(e && e.message) || e}`); process.exit(1); }
}
