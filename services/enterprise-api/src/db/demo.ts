/**
 * Demonstration sandboxes are off until the schema owner turns them on for a database (ADR-0013). This is that switch, and the caps.
 *   node dist/src/db/demo.js status
 *   node dist/src/db/demo.js enable [--max-live 200] [--ttl-hours 72] [--per-remote-hour 12]
 *   node dist/src/db/demo.js disable        (no new sandbox opens; live ones run to their expiry)
 * Enabling is refused for a deployment that signs real people in (AUTH_MODE=oidc): the demonstration is its own deployment.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PgConnection, configFromUrl } from './pg.js';
import { loadConfig } from '../config.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const flag = (argv: string[], k: string): number | undefined => { const i = argv.indexOf(k); if (i < 0) return undefined; const v = Number(argv[i + 1]); if (!Number.isInteger(v)) throw new Error(`${k} takes a whole number`); return v; };

export async function demoConfig(ownerUrl: string, cmd: 'status' | 'enable' | 'disable', caps: { maxLive?: number; ttlHours?: number; perRemoteHour?: number } = {}) {
  const c = new PgConnection(configFromUrl(ownerUrl)); await c.connect();
  try {
    if (cmd === 'enable') await c.query('UPDATE app.demo_config SET enabled = true, max_live = coalesce($1, max_live), ttl_hours = coalesce($2, ttl_hours), per_remote_hour = coalesce($3, per_remote_hour), updated_at = now()', [caps.maxLive ?? null, caps.ttlHours ?? null, caps.perRemoteHour ?? null]);
    if (cmd === 'disable') await c.query('UPDATE app.demo_config SET enabled = false, updated_at = now()');
    const cfg = (await c.query<{ enabled: boolean; max_live: number; ttl_hours: number; per_remote_hour: number }>('SELECT enabled, max_live, ttl_hours, per_remote_hour FROM app.demo_config')).rows[0]!;
    const n = (await c.query<{ live: number; total: number }>('SELECT count(*) FILTER (WHERE closed_at IS NULL AND expires_at > now())::int AS live, count(*)::int AS total FROM app.demo_sandbox')).rows[0]!;
    return { ...cfg, live: n.live, everOpened: n.total };
  } finally { await c.end(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  (async () => {
    const argv = process.argv.slice(2); const cmd = argv[0];
    if (cmd !== 'status' && cmd !== 'enable' && cmd !== 'disable') throw new Error('usage: demo.js status | enable [--max-live N] [--ttl-hours N] [--per-remote-hour N] | disable');
    const cfg = loadConfig(repo);
    if (cmd === 'enable' && cfg.authMode === 'oidc') throw new Error('refused: this deployment signs real people in (AUTH_MODE=oidc). Demonstration sandboxes run as their own deployment (AUTH_MODE=demo) on their own database');
    console.log(JSON.stringify(await demoConfig(cfg.ownerDatabaseUrl, cmd, { maxLive: flag(argv, '--max-live'), ttlHours: flag(argv, '--ttl-hours'), perRemoteHour: flag(argv, '--per-remote-hour') })));
  })().catch((e) => { console.error((e as Error).message); process.exit(1); });
}
