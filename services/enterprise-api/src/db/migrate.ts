/**
 * Apply database/migrations/NNNN_*.sql in order, each in its own transaction, as the schema owner. Applied migrations are recorded
 * with their SHA-256; an applied migration whose file has changed is refused (write a new migration instead).
 *   node dist/src/db/migrate.js [--status]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PgConnection, configFromUrl } from './pg.js';
import { loadConfig } from '../config.js';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
export const migrationsDir = path.join(repoRoot, 'database/migrations');

export async function migrate(ownerUrl: string, opts: { statusOnly?: boolean } = {}): Promise<{ applied: string[]; already: string[] }> {
  const c = new PgConnection(configFromUrl(ownerUrl)); await c.connect();
  try {
    await c.simple(`CREATE SCHEMA IF NOT EXISTS app_meta; CREATE TABLE IF NOT EXISTS app_meta.schema_migration (version text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    const done = new Map((await c.query<{ version: string; sha256: string }>('SELECT version, sha256 FROM app_meta.schema_migration')).rows.map((r) => [r.version, r.sha256]));
    const files = fs.readdirSync(migrationsDir).filter((f) => /^\d{4}_[a-z0-9_]+\.sql$/.test(f)).sort();
    const applied: string[] = []; const already: string[] = [];
    for (const f of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf8'); const sha = crypto.createHash('sha256').update(sql).digest('hex'); const v = f.slice(0, 4);
      if (done.has(v)) { if (done.get(v) !== sha) throw new Error(`migration ${f} was applied with a different content (sha ${done.get(v)!.slice(0, 12)}); never edit an applied migration — add a new one`); already.push(f); continue; }
      if (opts.statusOnly) { applied.push(`${f} (pending)`); continue; }
      await c.simple(`BEGIN;\n${sql}\n;INSERT INTO app_meta.schema_migration (version, sha256) VALUES ('${v}', '${sha}');\nCOMMIT;`).catch(async (e) => { try { await c.simple('ROLLBACK'); } catch { /* */ } throw new Error(`migration ${f} failed: ${e.message}`); });
      applied.push(f);
    }
    return { applied, already };
  } finally { await c.end(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const cfg = loadConfig(repoRoot);
  migrate(cfg.ownerDatabaseUrl, { statusOnly: process.argv.includes('--status') }).then((r) => { console.log(JSON.stringify(r)); }).catch((e) => { console.error(e.message); process.exit(1); });
}
