/**
 * Seed a synthetic organization. Everything here is synthetic: two tenants (the second exists to prove tenant isolation), sites,
 * buildings, one person per role, a site-scoped technician, knowledge documents, the integration catalogue, and three planned rooms
 * created THROUGH THE DOMAIN SERVICE as the seeded Designer (so the seed obeys the same rules as the API).
 *
 * Development passwords: every seeded person signs in with DEV_PASSWORD below, through the development identity provider only
 * (AUTH_MODE=dev). They are documented, synthetic and refused in production (config.ts).
 *   node dist/src/db/seed.js [--reset]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PERSONAS from '@empathia/domain-data/data/V25_PERSONAS.json' with { type: 'json' };
import { PgConnection, PgPool, configFromUrl } from './pg.js';
import { hashPassword } from '../auth/password.js';
import { loadConfig } from '../config.js';
import { RequestContext, type Principal } from '../auth/context.js';
import { createRoom, addDevice } from '../domain/rooms.js';
import { OutboxWorker } from '../worker/outbox.js';
import { migrate } from './migrate.js';
import { loadPolicy } from './policy.js';

export const DEV_PASSWORD = 'empathia-dev-only';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const P = PERSONAS as unknown as Record<string, { label: string; authority: string[]; home: string }>;

export const TENANTS = [
  { slug: 'empathia-demo', name: 'Empathia Demo Estate (synthetic)' },
  { slug: 'second-tenant', name: 'Second Synthetic Tenant' },
  { slug: 'empathia-founder', name: 'Empathia Technologies — founder organization (private)' },   // ADR-0001 §3: the Founder Studio's organization; no sites, no rooms
];
const SITES: Record<string, Array<{ code: string; name: string; buildings: Array<{ code: string; name: string; floors: number }> }>> = {
  'empathia-demo': [
    { code: 'SITE-NORTH', name: 'North Campus (synthetic)', buildings: [{ code: 'ATL', name: 'Atlas Tower (synthetic)', floors: 12 }, { code: 'NST', name: 'Northstar Annex (synthetic)', floors: 3 }] },
    { code: 'SITE-SOUTH', name: 'South Campus (synthetic)', buildings: [{ code: 'HZN', name: 'Horizon Hall (synthetic)', floors: 4 }] },
  ],
  'second-tenant': [{ code: 'SITE-X', name: 'Other Organization Site (synthetic)', buildings: [{ code: 'BX1', name: 'Other Building (synthetic)', floors: 2 }] }],
};
/** Roles a demo tenant gets one person for. `architect` ("*") is deliberately not seeded into the enterprise tenants. */
const DEMO_ROLES = ['requestor', 'opslead', 'syseng', 'exec', 'finance', 'designer', 'dsp_eng', 'video_eng', 'control_eng', 'svcmgr', 'service', 'installer', 'cxeng', 'qa_reviewer', 'steward', 'secadmin'];

const email = (role: string, tenant: string) => `${role.replace(/_/g, '-')}@${tenant}.empathia.invalid`;

export async function seed(opts: { reset?: boolean } = {}) {
  const cfg = loadConfig(repo);
  if (cfg.env === 'production') throw new Error('the synthetic seed is refused in production');
  await migrate(cfg.ownerDatabaseUrl);
  const owner = new PgConnection(configFromUrl(cfg.ownerDatabaseUrl)); await owner.connect();
  const people: Record<string, string> = {};
  const ownerPool = new PgPool(configFromUrl(cfg.ownerDatabaseUrl), 2);
  try {
    if (opts.reset) await owner.simple(`TRUNCATE app.tenant, app.person, app.role, app.integration CASCADE`);
    // roles: the demonstrator's persona policy, unchanged (shared with the production bootstrap, db/policy.ts)
    await loadPolicy(owner);
    const pw = hashPassword(DEV_PASSWORD);
    const tenantIds: Record<string, string> = {};
    for (const t of TENANTS) tenantIds[t.slug] = (await owner.query<{ id: string }>('INSERT INTO app.tenant (slug, name) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id', [t.slug, t.name])).rows[0]!.id;
    const person = async (mail: string, name: string) => (await owner.query<{ id: string }>('INSERT INTO app.person (email, display_name, password_hash) VALUES ($1,$2,$3) ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name RETURNING id', [mail, name, pw])).rows[0]!.id;
    const siteIds: Record<string, string> = {};
    for (const t of TENANTS) {
      await ownerPool.tx({ tenantId: tenantIds[t.slug]! }, async (q) => {
        for (const s of SITES[t.slug] || []) {
          const sid = (await q.query<{ id: string }>('INSERT INTO app.site (tenant_id, code, name) VALUES ($1,$2,$3) ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id', [tenantIds[t.slug], s.code, s.name])).rows[0]!.id;
          siteIds[`${t.slug}/${s.code}`] = sid;
          for (const b of s.buildings) await q.query('INSERT INTO app.building (tenant_id, site_id, code, name, floors) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name', [tenantIds[t.slug], sid, b.code, b.name, b.floors]);
        }
      });
    }
    for (const role of DEMO_ROLES) people[`empathia-demo/${role}`] = await person(email(role, 'empathia-demo'), `${P[role]!.label} (synthetic)`);
    // a technician scoped to the South campus only, and two people in the second tenant
    people['empathia-demo/service-south'] = await person('service-south@empathia-demo.empathia.invalid', 'Service Technician, South campus only (synthetic)');
    for (const role of ['designer', 'syseng', 'secadmin']) people[`second-tenant/${role}`] = await person(email(role, 'second-tenant'), `${P[role]!.label}, second tenant (synthetic)`);
    people['empathia-founder/founder'] = await person(email('founder', 'empathia-founder'), 'Founder (synthetic identity for development)');
    const member = async (tenant: string, key: string, role: string, scope: string[] | null = null) => {
      await ownerPool.tx({ tenantId: tenantIds[tenant]! }, (q) => q.query('INSERT INTO app.membership (tenant_id, person_id, role_key, site_scope) VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id, person_id, role_key) DO UPDATE SET site_scope = EXCLUDED.site_scope, revoked_at = NULL', [tenantIds[tenant], people[`${tenant}/${key}`], role, scope]));
    };
    for (const role of DEMO_ROLES) await member('empathia-demo', role, role);
    await member('empathia-founder', 'founder', 'founder');
    await member('empathia-demo', 'service-south', 'service', [siteIds['empathia-demo/SITE-SOUTH']!]);
    for (const role of ['designer', 'syseng', 'secadmin']) await member('second-tenant', role, role);

    // staff profiles (synthetic): the facts the ServiceHands hard gates read — certifications with expiry, skills, sites, capacity
    const profile = async (tenant: string, key: string, p: { internal?: boolean; orgName?: string | null; buildingKey?: string | null; sites: string[]; skills: Record<string, { level: string; n?: number }>; certs: Record<string, { expires: string }>; leave?: [string, string] | null; capacity: number; agreement?: unknown }) => {
      await ownerPool.tx({ tenantId: tenantIds[tenant]! }, (q) => q.query('INSERT INTO app.staff_profile (tenant_id, person_id, internal, org_name, building_key, sites, skills, certs, leave_from, leave_to, capacity_hours, agreement) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (tenant_id, person_id) DO UPDATE SET sites = EXCLUDED.sites, skills = EXCLUDED.skills, certs = EXCLUDED.certs, leave_from = EXCLUDED.leave_from, leave_to = EXCLUDED.leave_to, capacity_hours = EXCLUDED.capacity_hours, agreement = EXCLUDED.agreement',
        [tenantIds[tenant], people[`${tenant}/${key}`], p.internal ?? true, p.orgName ?? null, p.buildingKey ?? null, p.sites, JSON.stringify(p.skills), '{}', p.leave?.[0] ?? null, p.leave?.[1] ?? null, p.capacity, p.agreement ? JSON.stringify(p.agreement) : null]));
      // ADR-0009: credentials live in app.competency_record — recorded by the service manager, verified by the data steward (never the
      // recorder, never the holder). The gates read nothing else; staff_profile.certs stays empty.
      for (const [competency, c] of Object.entries(p.certs)) {
        const source = competency.startsWith('lic.') ? 'LICENCE' : 'EXTERNAL_CERTIFICATE';
        const issued = `${Number(c.expires.slice(0, 4)) - 2}${c.expires.slice(4)}`;
        await ownerPool.tx({ tenantId: tenantIds[tenant]! }, (q) => q.query(
          `INSERT INTO app.competency_record (tenant_id, person_id, competency, source, issuer, reference, issued_on, expires_on, state, recorded_by, decided_by, decided_at, decision_note)
           SELECT $1,$2,$3,$4,$5,$6,$7,$8,'VERIFIED',$9,$10,now(),'checked against the issuer record (synthetic seed)'
            WHERE NOT EXISTS (SELECT 1 FROM app.competency_record WHERE tenant_id = $1 AND person_id = $2 AND competency = $3 AND reference = $6)`,
          [tenantIds[tenant], people[`${tenant}/${key}`], competency, source, 'Synthetic Credentialing Body', `SYN-${key.toUpperCase()}-${competency.split('.')[1]!.toUpperCase()}`, issued, c.expires, people[`${tenant}/svcmgr`], people[`${tenant}/steward`]]));
      }
    };
    await profile('empathia-demo', 'service', { buildingKey: 'ATL', sites: ['*'], skills: { 'SK-SVC-1': { level: 'Advanced', n: 9 }, 'SK-AUD-1': { level: 'Working', n: 5 }, 'SK-AUD-2': { level: 'Working', n: 3 }, 'SK-VID-1': { level: 'Working', n: 6 } }, certs: { 'cert.av_field': { expires: '2027-09-30' }, 'cert.audio': { expires: '2027-03-31' }, 'cert.video': { expires: '2027-03-31' } }, capacity: 24 });
    await profile('empathia-demo', 'installer', { buildingKey: 'NST', sites: ['ATL', 'NST'], skills: { 'SK-SVC-1': { level: 'Working', n: 4 }, 'SK-VID-1': { level: 'Working', n: 2 } }, certs: { 'cert.av_field': { expires: '2027-01-31' }, 'cert.video': { expires: '2026-10-01' }, 'lic.working_at_height': { expires: '2028-01-01' } }, capacity: 30 });   // the camera certification has lapsed
    await profile('empathia-demo', 'service-south', { buildingKey: 'HZN', sites: ['HZN'], skills: { 'SK-SVC-1': { level: 'Working', n: 7 } }, certs: { 'cert.av_field': { expires: '2027-12-31' }, 'cert.audio': { expires: '2027-12-31' } }, capacity: 12 });   // site access: South only

    // integration catalogue: every entry CONTRACT_ONLY except the three local mocks in integrations/mocks
    const csv = fs.readFileSync(path.join(repo, 'integrations/contracts/INTEGRATION_REGISTRY.csv'), 'utf8').split('\n').filter(Boolean);
    const head = csv[0]!.split(','); const ix = (k: string) => head.indexOf(k);
    const parse = (l: string) => { const out: string[] = []; let cur = ''; let q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; };
    for (const line of csv.slice(1)) {
      const f = parse(line);
      await owner.query('INSERT INTO app.integration (key, category, vendor, product, state, mode, note) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (key) DO UPDATE SET state = EXCLUDED.state, note = EXCLUDED.note',
        [f[ix('integration_id')], f[ix('category')], f[ix('vendor')], f[ix('product_or_api')], 'CONTRACT_ONLY', 'NONE', 'catalogue entry: contract only, no adapter code, nothing connected']);
    }
    for (const [key, cat, product] of [['mock-itsm-readonly', 'Service and ITSM', 'Read-only ITSM ticket feed'], ['mock-dsp-readback', 'Audio and DSP', 'DSP configuration read-back'], ['mock-device-inventory', 'IT and network', 'Network device inventory']] as const)
      await owner.query("INSERT INTO app.integration (key, category, vendor, product, state, mode, note) VALUES ($1,$2,'Empathia (local mock)',$3,'MOCK','READ_ONLY','local mock for development and tests: synthetic responses, no network') ON CONFLICT (key) DO UPDATE SET state = 'MOCK'", [key, cat, product]);

    // knowledge documents (synthetic) with role visibility
    await ownerPool.tx({ tenantId: tenantIds['empathia-demo']! }, async (q) => {
      if ((await q.query('SELECT 1 FROM app.knowledge_document LIMIT 1')).rowCount) return;
      const docs: Array<[string, string, string[], string]> = [
        ['Town hall commissioning protocol (synthetic)', 'KB-0001', ['syseng', 'cxeng', 'qa_reviewer', 'dsp_eng'], 'Town hall rooms need reverberation time (ISO 3382-2) beside speech intelligibility; acoustic tests are instrument-measured, by the DSP engineer, after installation.'],
        ['Camera substitution checklist (synthetic)', 'KB-0002', ['designer', 'syseng', 'video_eng'], 'A camera swap keeps the asset id; approved schedule and placement drawings must be regenerated and re-approved.'],
        ['Service desk etiquette (synthetic)', 'KB-0003', ['*'], 'Every request gets an acknowledgement; a closed work order never passes a commissioning test.'],
        ['Security incident runbook (synthetic)', 'KB-0004', ['secadmin'], 'Restricted: revoke the membership, rotate the signing key, review the audit trail for the correlation id.'],
      ];
      for (const [title, source, roles, body] of docs) await q.query('INSERT INTO app.knowledge_document (tenant_id, title, source, allowed_roles, body) VALUES ($1,$2,$3,$4,$5)', [tenantIds['empathia-demo'], title, source, roles, body]);
    });
  } finally { await owner.end(); await ownerPool.end(); }

  // three planned rooms, created through the domain service as the seeded Designer (runtime role: RLS applies)
  const app = new PgPool(configFromUrl(cfg.databaseUrl), 4);
  try {
    const t = (await app.query<{ tenant_id: string; role_key: string; authorities: string[] }>("SELECT * FROM app.auth_memberships((SELECT id FROM app.auth_person_by_email('designer@empathia-demo.empathia.invalid')))")).rows[0]!;
    const pid = (await app.query<{ id: string }>("SELECT id FROM app.auth_person_by_email('designer@empathia-demo.empathia.invalid')")).rows[0]!.id;
    const ctx = new RequestContext(app, 'seed');
    ctx.principal = { personId: pid, name: 'Designer (synthetic)', tenantId: t.tenant_id, tenantSlug: 'empathia-demo', role: 'designer', authorities: t.authorities, siteScope: null, delegated: [] } as Principal;
    const have = (await ctx.tx((q) => q.query<{ n: number }>('SELECT count(*)::int AS n FROM app.room'))).rows[0]!.n;
    const made: string[] = [];
    if (!have) {
      // one synthetic project for the Atlas rooms (projects are decided by the executive role; the seed writes it as the owner)
      const tid = t.tenant_id;
      await ctx.tx((q) => q.query("INSERT INTO app.project (tenant_id, code, name) VALUES ($1, 'PRJ-ATLAS-AV', 'Atlas Tower AV refresh (synthetic)') ON CONFLICT DO NOTHING", [tid]));
      made.push((await createRoom(ctx, { name: 'Atlas Town Hall (synthetic)', template: 'townhall', buildingCode: 'ATL', length: '26', width: '18', ceiling: '6', projectCode: 'PRJ-ATLAS-AV' })).code);
      made.push((await createRoom(ctx, { name: 'Atlas Boardroom 7.112 (synthetic)', template: 'boardroom', buildingCode: 'ATL', floor: 7, projectCode: 'PRJ-ATLAS-AV' })).code);
      const h = (await createRoom(ctx, { name: 'Horizon Huddle 2.129 (synthetic)', template: 'huddle', buildingCode: 'HZN', floor: 2 })).code; made.push(h);
      await addDevice(ctx, h, { category: 'micceil' });
    }
    const wp = new PgPool(configFromUrl(cfg.workerDatabaseUrl), 1);
    try { await new OutboxWorker(wp).drain(); } finally { await wp.end(); }
    return { tenants: TENANTS.map((x) => x.slug), people: Object.keys(people).length, rooms: made, devPassword: '(see DEV_PASSWORD in src/db/seed.ts)' };
  } finally { await app.end(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  seed({ reset: process.argv.includes('--reset') }).then((r) => console.log(JSON.stringify(r))).catch((e) => { console.error(e.stack || e.message); process.exit(1); });
}
