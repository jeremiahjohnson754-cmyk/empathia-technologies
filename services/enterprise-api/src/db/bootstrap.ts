/**
 * Operator bootstrap for a real (non-synthetic) environment such as Render staging. Runs as the schema owner (DATABASE_URL), after the
 * migrations, never in a request path. It is the documented substitute for the missing platform-operator API (docs/operations/
 * CUSTOMER_ONBOARDING.md, "Gaps"). Idempotent; refuses to touch the synthetic seed's tenants; creates no password: the first security
 * administrator signs in through the configured OIDC provider (OIDC_LINK_BY_EMAIL=on binds the verified email to this person once).
 *   node services/enterprise-api/dist/src/db/bootstrap.js --tenant=acme-staging --tenant-name="Acme (staging)" \
 *        --site=SITE-HQ:"Headquarters" --building=HQ1:"Main building":6:SITE-HQ --admin-email=it-admin@acme.example --admin-name="IT Admin"
 * Every step it takes is written to the tenant's audit trail (action platform.bootstrap.*, actor recorded as the operator) and so enters
 * the Evidence Ledger chain. Everything after this — people, roles, rooms — goes through the API (invitations, etc.).
 */
import crypto from 'node:crypto';
import { PgConnection, PgPool, configFromUrl } from './pg.js';
import { loadPolicy } from './policy.js';

const SEEDED = ['empathia-demo', 'second-tenant', 'empathia-founder'];
const arg = (k: string) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : undefined; };
const all = (k: string) => process.argv.filter((x) => x.startsWith(`--${k}=`)).map((x) => x.slice(k.length + 3));

export async function bootstrap(ownerUrl: string, o: { tenant: string; tenantName: string; synthetic: boolean; sites: Array<{ code: string; name: string }>; buildings: Array<{ code: string; name: string; floors: number; site: string }>; adminEmail: string; adminName: string; operator: string }) {
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(o.tenant)) throw new Error('--tenant is a slug (lower-case letters, digits, hyphens)');
  if (SEEDED.includes(o.tenant)) throw new Error(`${o.tenant} is a synthetic seed tenant; choose another slug`);
  if (!/^[^@\s]+@[^@\s]+$/.test(o.adminEmail)) throw new Error('--admin-email is an email address');
  for (const b of o.buildings) if (!o.sites.some((s) => s.code === b.site)) throw new Error(`building ${b.code} names site ${b.site}, which is not given with --site`);
  const owner = new PgConnection(configFromUrl(ownerUrl)); await owner.connect();
  const pool = new PgPool(configFromUrl(ownerUrl), 1);
  const correlationId = `bootstrap-${crypto.randomUUID()}`;
  try {
    const roles = await loadPolicy(owner);
    if (!(await owner.query("SELECT 1 FROM app.role WHERE key = 'secadmin'")).rowCount) throw new Error('the policy has no secadmin role');
    const tenantId = (await owner.query<{ id: string }>('INSERT INTO app.tenant (slug, name, synthetic) VALUES ($1,$2,$3) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id', [o.tenant, o.tenantName, o.synthetic])).rows[0]!.id;
    const person = (await owner.query<{ id: string }>('INSERT INTO app.person (email, display_name) VALUES ($1,$2) ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name RETURNING id', [o.adminEmail.toLowerCase(), o.adminName])).rows[0]!.id;
    const made = await pool.tx({ tenantId }, async (q) => {
      const audit = (action: string, aggregate: { type: string; id: string }, detail: Record<string, unknown>) => q.query('INSERT INTO app.audit_event (tenant_id, actor_id, actor_role, action, outcome, aggregate_type, aggregate_id, correlation_id, detail) VALUES ($1,NULL,$2,$3,$4,$5,$6,$7,$8)',
        [tenantId, 'platform-operator', action, 'ALLOWED', aggregate.type, aggregate.id, correlationId, { operator: o.operator, ...detail }]);
      await audit('platform.bootstrap.tenant', { type: 'Tenant', id: o.tenant }, { name: o.tenantName, synthetic: o.synthetic, rolesLoaded: roles });
      const siteIds: Record<string, string> = {};
      for (const s of o.sites) { siteIds[s.code] = (await q.query<{ id: string }>('INSERT INTO app.site (tenant_id, code, name) VALUES ($1,$2,$3) ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id', [tenantId, s.code, s.name])).rows[0]!.id; await audit('platform.bootstrap.site', { type: 'Site', id: s.code }, { name: s.name }); }
      for (const b of o.buildings) { await q.query('INSERT INTO app.building (tenant_id, site_id, code, name, floors) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, floors = EXCLUDED.floors', [tenantId, siteIds[b.site], b.code, b.name, b.floors]); await audit('platform.bootstrap.building', { type: 'Building', id: b.code }, { name: b.name, site: b.site, floors: b.floors }); }
      const m = await q.query("INSERT INTO app.membership (tenant_id, person_id, role_key, site_scope) VALUES ($1,$2,'secadmin',NULL) ON CONFLICT (tenant_id, person_id, role_key) DO UPDATE SET revoked_at = NULL RETURNING person_id", [tenantId, person]);
      await audit('platform.bootstrap.admin', { type: 'Person', id: person }, { email: o.adminEmail.toLowerCase(), role: 'secadmin', signIn: 'OIDC (no password)' });
      return { sites: o.sites.length, buildings: o.buildings.length, admin: m.rowCount };
    });
    return { tenant: o.tenant, tenantId, synthetic: o.synthetic, rolesLoaded: roles, ...made, adminEmail: o.adminEmail.toLowerCase(), correlationId, next: 'sign in as the administrator through OIDC, then invite people with POST /v1/admin/invitations' };
  } finally { await owner.end(); await pool.end(); }
}

if (process.argv[1] && /bootstrap\.js$/.test(process.argv[1])) {
  const url = process.env['DATABASE_URL'];
  if (!url) { console.error('DATABASE_URL (the schema owner) is required'); process.exit(2); }
  const sites = all('site').map((s) => { const [code, ...n] = s.split(':'); return { code: code!, name: n.join(':') || code! }; });
  const buildings = all('building').map((b) => { const [code, name, floors, site] = b.split(':'); return { code: code!, name: name || code!, floors: Number(floors || 1), site: site! }; });
  bootstrap(url, { tenant: arg('tenant') || '', tenantName: arg('tenant-name') || '', synthetic: process.argv.includes('--synthetic'), sites, buildings, adminEmail: arg('admin-email') || '', adminName: arg('admin-name') || 'Security administrator', operator: arg('operator') || process.env['USER'] || 'operator' })
    .then((r) => { console.log(JSON.stringify(r, null, 1)); process.exit(0); }, (e) => { console.error(`bootstrap refused: ${(e as Error).message}`); process.exit(1); });
}
