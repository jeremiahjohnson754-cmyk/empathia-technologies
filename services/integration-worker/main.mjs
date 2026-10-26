#!/usr/bin/env node
/**
 * Integration worker: runs every runnable integration's sync for one tenant, then repeats every SYNC_INTERVAL_MS (5 minutes).
 * It is a second process of the same modular monolith — it reuses the enterprise API's domain module (src/integrations/sync.ts) and
 * database access, so the rules are the same in both places. Extracting it into its own deployable later needs no rule changes.
 *
 * It acts as a named service identity and is authorized like any person: the account must hold adapter.allowlist or policy.configure
 * in the tenant (development default: the seeded security administrator). Production gives it a dedicated non-human account.
 *   node services/integration-worker/main.mjs [--once] [--tenant=empathia-demo]
 *   env: WORKER_ACCOUNT_EMAIL, WORKER_ACCOUNT_ROLE, plus the database settings of the API (.local/pg/env)
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const api = path.join(repo, 'services/enterprise-api/dist/src');
const { loadConfig } = await import(path.join(api, 'config.js'));
const { PgPool, configFromUrl } = await import(path.join(api, 'db/pg.js'));
const { RequestContext } = await import(path.join(api, 'auth/context.js'));
const { resolvePrincipal } = await import(path.join(api, 'domain/platform.js'));
const { syncIntegration, RUNNABLE, SYNC_INTERVAL_MS } = await import(path.join(api, 'integrations/sync.js'));
const { log } = await import(path.join(api, 'log.js'));

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const tenant = arg('tenant', 'empathia-demo');
const email = process.env.WORKER_ACCOUNT_EMAIL || `secadmin@${tenant}.empathia.invalid`;
const role = process.env.WORKER_ACCOUNT_ROLE || 'secadmin';
const cfg = loadConfig(repo);
const pool = new PgPool({ ...configFromUrl(cfg.databaseUrl), applicationName: 'empathia-integration-worker' }, 2);

async function principal() {
  const p = (await pool.query('SELECT id FROM app.auth_person_by_email($1)', [email])).rows[0];
  if (!p) throw new Error(`worker account ${email} not found`);
  const m = (await pool.query('SELECT * FROM app.auth_memberships($1)', [p.id])).rows.find((x) => x.tenant_slug === tenant && x.role_key === role);
  if (!m) throw new Error(`worker account has no ${role} membership in ${tenant}`);
  return resolvePrincipal(pool, p.id, m.tenant_id, role);
}

async function round() {
  const out = [];
  for (const key of Object.keys(RUNNABLE)) {
    const ctx = new RequestContext(pool, `worker-${Date.now()}-${key}`);
    ctx.principal = await principal();
    try { out.push(await syncIntegration(ctx, key)); } catch (e) { out.push({ key, error: e.message }); log('warn', 'integration sync failed', { key, error: e.message }); }
  }
  return out;
}

const once = process.argv.includes('--once');
const results = await round();
console.log(JSON.stringify({ tenant, at: new Date().toISOString(), results: results.map((r) => ({ key: r.key, state: r.state, observations: r.observations, error: r.error ?? null })) }));
if (once) { await pool.end(); process.exit(results.some((r) => r.error && !r.state) ? 1 : 0); }
const timer = setInterval(() => { round().catch((e) => log('error', 'worker round failed', { error: e.message })); }, SYNC_INTERVAL_MS);
const stop = async () => { clearInterval(timer); await pool.end(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
