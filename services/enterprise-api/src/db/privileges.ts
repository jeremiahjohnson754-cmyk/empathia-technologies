/**
 * Database privileges: checked at startup, repaired only by the owner, on purpose.
 *
 * Founder, 17 Nov 2026: "The service should verify required privileges on startup. If privileges are missing, it should report an
 * unhealthy state and refuse sensitive operations. Repair should happen through a separate, tightly permissioned migration or
 * recovery process—not by giving the normal application account unrestricted authority to grant its own privileges."
 *
 * Why: the first recovery drill on a real export from the platform (17 Nov 2026) found that the export carries no privileges. A
 * database restored from it has every table closed to the runtime roles and every function open to every role, and the migrations
 * do not put that right, because they are all recorded as applied. Tenant isolation rests on these privileges as much as on
 * row-level security, so a service must not operate on a database where they are not exactly what the migrations make.
 *
 * - database/migrations/PRIVILEGES.json is the list: every privilege on every schema, table, view, sequence, column and routine of
 *   the application's schemas, as the migrations leave them on an empty database. It is generated, never typed, and a test fails
 *   when it is not what the migrations produce.
 * - listPrivileges() reads the same from the catalog. Any role may read the catalog; reading grants nothing.
 * - PrivilegeGate is what the API holds: ok, or not. Too few privileges and too many are both "not".
 * - repairPrivileges() makes the database equal to the list, in one transaction that is rolled back unless the result is exactly
 *   the list. It runs only as the owner of the schema, from a command of its own (below); the runtime roles cannot run it, and the
 *   API never calls it.
 *
 *   node dist/src/db/privileges.js verify            (any of the service's database users; exit 1 when they differ)
 *   node dist/src/db/privileges.js repair            (DATABASE_URL, the owner)
 *   node dist/src/db/privileges.js expected --check  (on a database the migrations have just made: the list is current)
 *   node dist/src/db/privileges.js expected --write  (regenerate the list from such a database, after adding a migration)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PgConnection, configFromUrl } from './pg.js';
import { loadConfig } from '../config.js';
import { repoRoot, migrationsDir } from './migrate.js';

export const expectedFile = path.join(migrationsDir, 'PRIVILEGES.json');
type Q = { query<R = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: R[] }> };
export type Diff = { ok: boolean; expected: number; missing: string[]; unexpected: string[] };

// One row per object and grantee. The owner of the app schema is written <owner>, so the list is the same whatever the owner is called.
// An object nobody has granted on or revoked from is listed with the privileges it has by default: untouched and default are the same.
const LISTING = `
WITH own AS (SELECT nspowner AS oid FROM pg_namespace WHERE nspname = 'app'),
ours AS (SELECT oid, nspname FROM pg_namespace WHERE nspname IN ('app', 'app_meta', 'founder')),
objs AS (
  SELECT 'schema'::text AS kind, quote_ident(n.nspname) AS obj, coalesce(n.nspacl, acldefault('n', n.nspowner)) AS acl FROM pg_namespace n JOIN ours ON ours.oid = n.oid
  UNION ALL
  SELECT CASE WHEN c.relkind = 'S' THEN 'sequence' ELSE 'table' END, quote_ident(n.nspname) || '.' || quote_ident(c.relname),
         coalesce(c.relacl, acldefault((CASE WHEN c.relkind = 'S' THEN 's' ELSE 'r' END)::"char", c.relowner))
    FROM pg_class c JOIN ours n ON n.oid = c.relnamespace WHERE c.relkind IN ('r', 'v', 'm', 'S', 'p')
  UNION ALL
  SELECT 'column', quote_ident(n.nspname) || '.' || quote_ident(c.relname) || ' (' || quote_ident(a.attname) || ')', a.attacl
    FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN ours n ON n.oid = c.relnamespace WHERE a.attacl IS NOT NULL AND NOT a.attisdropped
  UNION ALL
  SELECT 'routine', quote_ident(n.nspname) || '.' || quote_ident(p.proname) || '(' || pg_get_function_identity_arguments(p.oid) || ')', coalesce(p.proacl, acldefault('f', p.proowner))
    FROM pg_proc p JOIN ours n ON n.oid = p.pronamespace
   WHERE NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
  UNION ALL
  SELECT 'default', coalesce(quote_ident(n.nspname), '*') || ' ' || d.defaclobjtype::text || ' for ' || CASE WHEN d.defaclrole = (SELECT oid FROM own) THEN '<owner>' ELSE pg_get_userbyid(d.defaclrole) END, d.defaclacl
    FROM pg_default_acl d LEFT JOIN ours n ON n.oid = d.defaclnamespace WHERE n.oid IS NOT NULL OR d.defaclrole = (SELECT oid FROM own)
)
SELECT o.kind, o.obj,
       CASE WHEN x.grantee = 0 THEN 'PUBLIC' WHEN x.grantee = (SELECT oid FROM own) THEN '<owner>' ELSE pg_get_userbyid(x.grantee) END AS grantee,
       string_agg(x.privilege_type || CASE WHEN x.is_grantable THEN '*' ELSE '' END, ',' ORDER BY x.privilege_type) AS privs
  FROM objs o, LATERAL aclexplode(o.acl) x GROUP BY 1, 2, 3 ORDER BY 1, 2, 3`;

const line = (r: { kind: string; obj: string; grantee: string; privs: string }) => `${r.kind} ${r.obj} :: ${r.grantee} :: ${r.privs}`;
const parse = (l: string) => { const [head, grantee, privs] = l.split(' :: '); const sp = head!.indexOf(' '); return { kind: head!.slice(0, sp), obj: head!.slice(sp + 1), grantee: grantee!, privs: privs! }; };

export async function listPrivileges(q: Q): Promise<string[]> {
  return (await q.query<{ kind: string; obj: string; grantee: string; privs: string }>(LISTING)).rows.map(line).sort();
}

export function loadExpected(): { migration: string; lines: string[] } {
  const j = JSON.parse(fs.readFileSync(expectedFile, 'utf8')) as { migration: string; lines: string[] };
  if (!/^\d{4}$/.test(j.migration) || !Array.isArray(j.lines) || j.lines.length < 50) throw new Error('database/migrations/PRIVILEGES.json is not a privilege list');
  return j;
}
const latestMigrationFile = () => fs.readdirSync(migrationsDir).filter((f) => /^\d{4}_[a-z0-9_]+\.sql$/.test(f)).sort().pop()!.slice(0, 4);

export async function verifyPrivileges(q: Q, expected = loadExpected().lines): Promise<Diff> {
  const have = new Set(await listPrivileges(q)); const want = new Set(expected);
  const missing = expected.filter((l) => !have.has(l)); const unexpected = [...have].filter((l) => !want.has(l));
  return { ok: !missing.length && !unexpected.length, expected: expected.length, missing, unexpected };
}

/**
 * What the API holds. It is ok only after a check found the database's privileges equal to the list. It is checked at start, again
 * every five minutes while ok, and (at most every fifteen seconds) whenever it is not, so a repair is noticed without a restart.
 */
export class PrivilegeGate {
  state: 'ok' | 'mismatch' | 'unverified' = 'unverified';
  missing = 0; unexpected = 0; detail = 'not checked yet'; checkedAt = 0;
  private running: Promise<void> | null = null;
  constructor(private q: Q, private report: (level: 'info' | 'error', msg: string, extra: Record<string, unknown>) => void = () => {}) {}
  get ok() { return this.state === 'ok'; }
  async check(): Promise<void> {
    if (this.running) return this.running;
    this.running = (async () => {
      const was = this.state;
      try {
        const d = await verifyPrivileges(this.q);
        this.state = d.ok ? 'ok' : 'mismatch'; this.missing = d.missing.length; this.unexpected = d.unexpected.length;
        this.detail = d.ok ? `${d.expected} privileges, as the migrations make them` : `${d.missing.length} of ${d.expected} expected privileges are missing and ${d.unexpected.length} are present that should not be`;
        if (!d.ok && was !== 'mismatch') this.report('error', 'database privileges do not match this release: refusing requests', { missing: d.missing.length, unexpected: d.unexpected.length, firstMissing: d.missing.slice(0, 5), firstUnexpected: d.unexpected.slice(0, 5), repair: 'node services/enterprise-api/dist/src/db/privileges.js repair, as the owner' });
        if (d.ok && was !== 'ok') this.report('info', 'database privileges verified', { privileges: d.expected });
      } catch (e) {
        this.state = 'unverified'; this.missing = 0; this.unexpected = 0; this.detail = `the privileges could not be read: ${(e as Error).message}`.slice(0, 200);
        if (was !== 'unverified' || !this.checkedAt) this.report('error', 'database privileges could not be verified: refusing requests', { error: this.detail });
      }
      this.checkedAt = Date.now();
    })().finally(() => { this.running = null; });
    return this.running;
  }
  /** null when requests may be served; otherwise why not. Waits for a fresh check only when the last one did not pass. */
  async blocked(): Promise<string | null> {
    const age = Date.now() - this.checkedAt;
    if (this.ok) { if (age > 300_000) void this.check(); return null; }
    if (age > 15_000) await this.check();
    return this.ok ? null : 'The database privileges do not match this release, so the service is not accepting requests. They are repaired by an operator with the owner’s credential, not by the service.';
  }
  summary() { return { state: this.state, ...(this.ok ? {} : { missing: this.missing, unexpected: this.unexpected }), checkedAt: this.checkedAt ? new Date(this.checkedAt).toISOString() : null }; }
}

const ident = /^[A-Za-z_][A-Za-z0-9_$]*$/;
const roleSql = (g: string, owner: string) => { const r = g === 'PUBLIC' ? 'PUBLIC' : g === '<owner>' ? owner : g; if (r !== 'PUBLIC' && !ident.test(r)) throw new Error(`not a role name the repair will use: ${g}`); return r === 'PUBLIC' ? r : `"${r}"`; };
const onSql = (kind: string, obj: string): { on: string; col: string } => {
  if (!/^[A-Za-z0-9_$."(), \[\]]+$/.test(obj)) throw new Error(`not an object name the repair will use: ${obj}`);
  if (kind === 'schema') return { on: `SCHEMA ${obj}`, col: '' };
  if (kind === 'table') return { on: `TABLE ${obj}`, col: '' };
  if (kind === 'sequence') return { on: `SEQUENCE ${obj}`, col: '' };
  if (kind === 'routine') return { on: `ROUTINE ${obj}`, col: '' };
  if (kind === 'column') { const m = /^(.+) \((.+)\)$/.exec(obj); if (!m) throw new Error(`not a column: ${obj}`); return { on: `TABLE ${m[1]}`, col: ` (${m[2]})` }; }
  throw new Error(`${kind} privileges are not repaired by this command (${obj}): they are not something the migrations set`);
};

/**
 * Make the database's privileges equal to the list. As the owner of the app schema only. One transaction: every (object, grantee)
 * pair that differs has what it holds revoked and what the list names granted; then the privileges are read again, and unless they
 * are exactly the list, everything is rolled back. Nothing is granted that the list does not name.
 */
export async function repairPrivileges(ownerUrl: string): Promise<{ by: string; before: { missing: number; unexpected: number }; pairs: number; statements: number; after: 'equal to the list' }> {
  const c = new PgConnection(configFromUrl(ownerUrl)); await c.connect();
  try {
    const me = (await c.query<{ u: string; owner: string | null; superuser: boolean }>("SELECT current_user AS u, (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname = 'app') AS owner, (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser")).rows[0]!;
    if (!me.owner) throw new Error('there is no app schema in this database: nothing to repair');
    if (me.u !== me.owner) throw new Error(`privileges are repaired by the owner of the schema (${me.owner}) and by no one else; connected as ${me.u}`);
    const expected = loadExpected();
    const at = (await c.query<{ v: string | null }>('SELECT max(version) AS v FROM app_meta.schema_migration')).rows[0]!.v;
    if (at !== expected.migration) throw new Error(`the database is at migration ${at}; the privilege list is for ${expected.migration}. Migrate first, or use the release that matches the database`);
    const before = await verifyPrivileges(c, expected.lines);
    if (before.ok) return { by: me.u, before: { missing: 0, unexpected: 0 }, pairs: 0, statements: 0, after: 'equal to the list' };
    const key = (l: string) => { const p = parse(l); return `${p.kind} ${p.obj} :: ${p.grantee}`; };
    const pairs = [...new Set([...before.missing, ...before.unexpected].map(key))].sort();
    const want = new Map(expected.lines.map((l) => [key(l), parse(l)])); const have = new Map((await listPrivileges(c)).map((l) => [key(l), parse(l)]));
    const stmts: string[] = [];
    for (const k of pairs) {
      const p = have.get(k) || want.get(k)!; const { on, col } = onSql(p.kind, p.obj); const role = roleSql(p.grantee, me.owner);
      if (have.has(k)) stmts.push(`REVOKE ALL PRIVILEGES${col} ON ${on} FROM ${role}`);
      const w = want.get(k);
      if (w) for (const grantable of [false, true]) {
        const privs = w.privs.split(',').filter((x) => x.endsWith('*') === grantable).map((x) => x.replace(/\*$/, '')); if (!privs.length) continue;
        for (const x of privs) if (!/^[A-Z]+$/.test(x)) throw new Error(`not a privilege the repair will grant: ${x}`);
        stmts.push(`GRANT ${privs.map((x) => `${x}${col}`).join(', ')} ON ${on} TO ${role}${grantable ? ' WITH GRANT OPTION' : ''}`);
      }
    }
    await c.simple('BEGIN');
    try {
      for (const s of stmts) await c.simple(s);
      const after = await verifyPrivileges(c, expected.lines);
      if (!after.ok) throw new Error(`after ${stmts.length} statements the privileges still differ from the list (${after.missing.length} missing, ${after.unexpected.length} unexpected; first: ${(after.missing[0] || after.unexpected[0] || '').slice(0, 120)}): nothing was changed`);
      await c.simple('COMMIT');
    } catch (e) { try { await c.simple('ROLLBACK'); } catch { /* the connection is closed below */ } throw e; }
    return { by: me.u, before: { missing: before.missing.length, unexpected: before.unexpected.length }, pairs: pairs.length, statements: stmts.length, after: 'equal to the list' };
  } finally { await c.end(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const cmd = process.argv[2]; const cfg = loadConfig(repoRoot);
  const withConn = async <T>(url: string, fn: (c: PgConnection) => Promise<T>) => { const c = new PgConnection(configFromUrl(url)); await c.connect(); try { return await fn(c); } finally { await c.end(); } };
  (async () => {
    if (cmd === 'verify') {
      const d = await withConn(process.argv.includes('--as-owner') ? cfg.ownerDatabaseUrl : cfg.databaseUrl, (c) => verifyPrivileges(c));
      console.log(JSON.stringify({ privileges: d.ok ? 'equal to the list' : 'DIFFER', expected: d.expected, missing: d.missing.length, unexpected: d.unexpected.length, ...(d.ok ? {} : { firstMissing: d.missing.slice(0, 10), firstUnexpected: d.unexpected.slice(0, 10) }) }));
      process.exit(d.ok ? 0 : 1);
    } else if (cmd === 'repair') {
      console.log(JSON.stringify(await repairPrivileges(cfg.ownerDatabaseUrl)));
    } else if (cmd === 'expected' && (process.argv.includes('--check') || process.argv.includes('--write'))) {
      const lines = await withConn(cfg.ownerDatabaseUrl, (c) => listPrivileges(c)); const migration = latestMigrationFile();
      if (process.argv.includes('--write')) { fs.writeFileSync(expectedFile, JSON.stringify({ about: 'Every privilege in the application’s schemas, as the migrations leave them on an empty database. Generated by services/enterprise-api/src/db/privileges.ts (expected --write); never edited by hand.', migration, lines }, null, 1) + '\n'); console.log(JSON.stringify({ written: lines.length, migration })); return; }
      const e = loadExpected(); const same = e.migration === migration && JSON.stringify(e.lines) === JSON.stringify(lines);
      console.log(JSON.stringify({ list: same ? 'current' : 'STALE', migration: e.migration, latestMigration: migration, inList: e.lines.length, fromMigrations: lines.length, ...(same ? {} : { firstDifference: lines.find((l) => !e.lines.includes(l)) || e.lines.find((l) => !lines.includes(l)) || 'the migration number' }) }));
      process.exit(same ? 0 : 1);
    } else { console.error('usage: privileges.js verify [--as-owner] | repair | expected --check | expected --write'); process.exit(2); }
  })().catch((e) => { console.error((e as Error).message); process.exit(1); });
}
