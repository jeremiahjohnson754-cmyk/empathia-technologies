/**
 * Shared helper for the documentation generators: a fresh, migrated PostgreSQL database on the local cluster (node scripts/db.mjs up),
 * created and dropped with the superuser credentials in .local/pg/credentials.json. Credentials are never printed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const BIN = '/usr/lib/postgresql/16/bin';
const bin = (n) => (fs.existsSync(path.join(BIN, n)) ? path.join(BIN, n) : n);

export async function freshDb(name) {
  execFileSync(process.execPath, [path.join(repo, 'scripts/db.mjs'), 'up'], { stdio: 'ignore' });
  const c = JSON.parse(fs.readFileSync(path.join(repo, '.local/pg/credentials.json'), 'utf8'));
  const env = { ...process.env, PGPASSWORD: c.superPassword };
  const sql = (s, database = 'postgres') => {
    const r = spawnSync(bin('psql'), ['-h', '127.0.0.1', '-p', String(c.port), '-U', c.superuser, '-d', database, '-v', 'ON_ERROR_STOP=1', '-qAtX', '-F', '\t', '-c', s], { env, encoding: 'utf8', maxBuffer: 64 << 20 });
    if (r.status !== 0) throw new Error(r.stderr);
    return r.stdout.replace(/\n$/, '');
  };
  sql(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  sql(`CREATE DATABASE ${name} OWNER ${c.owner}`);
  sql(`REVOKE ALL ON DATABASE ${name} FROM PUBLIC; GRANT CONNECT ON DATABASE ${name} TO ${c.app};`);
  const urls = {
    DATABASE_URL: `postgres://${c.owner}:${encodeURIComponent(c.ownerPassword)}@127.0.0.1:${c.port}/${name}`,
    APP_DATABASE_URL: `postgres://${c.app}:${encodeURIComponent(c.appPassword)}@127.0.0.1:${c.port}/${name}`,
  };
  const { migrate } = await import(path.join(repo, 'services/enterprise-api/dist/src/db/migrate.js'));
  const applied = await migrate(urls.DATABASE_URL);
  const q = (s) => sql(s, name);
  const dump = (args) => { const r = spawnSync(bin('pg_dump'), ['-h', '127.0.0.1', '-p', String(c.port), '-U', c.superuser, ...args, name], { env, encoding: 'utf8', maxBuffer: 64 << 20 }); if (r.status !== 0) throw new Error(r.stderr); return r.stdout; };
  return { name, urls, q, dump, applied, drop: () => sql(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`) };
}
