/**
 * Demonstration sandboxes and sessions (ADR-0013; founder, 17 Nov 2026: "safe synthetic tenants, authenticated demo sessions, scoped
 * permissions, and a resettable demonstration dataset").
 *
 * A sandbox is a tenant opened for one visitor: its own synthetic people (one per role), one site, one building and one scenario room,
 * and (17 Nov 2026) the flagship engineering room, the university's lecture theatre UNI-SCI-110, on its own campus and building.
 * Its key — returned once, never stored — is the credential that issues a session as one of those people. A session is an ordinary
 * principal: the same routes, the same authorities, the same row-level security, the same audit as any tenant. What is different is the
 * boundary around it: a demonstration token reaches a live sandbox and nothing else, a sandbox is reached by nothing but a demonstration
 * token, and a sandbox is never deleted by the API — a reset closes it and opens another.
 *
 * The scenario is prepared THROUGH THE ROUTE TABLE as the sandbox's own people (`invoke` below applies each route's authority and body
 * contract before its handler), so the room a visitor finds has the history a real one would: who designed it, who approved it, who
 * moved it to installation — each an audit row by a different person.
 */
import crypto from 'node:crypto';
import type { PgPool } from '../db/pg.js';
import { RequestContext } from '../auth/context.js';
import type { Hs256Tokens } from '../auth/jwt.js';
import type { Config } from '../config.js';
import { ApiError, invalid } from '../http/errors.js';
import { enforcedAuthorities, type Router } from '../http/router.js';
import { validate } from '../http/schema.js';
import { resolvePrincipal } from './platform.js';
import { log } from '../log.js';

/** The people a sandbox holds, one per role. Never the architect ("*"), the founder or the security administrator (the database refuses them too). */
export const SANDBOX_ROLES = ['requestor', 'opslead', 'syseng', 'exec', 'finance', 'designer', 'dsp_eng', 'video_eng', 'control_eng', 'svcmgr', 'service', 'installer', 'cxeng', 'qa_reviewer', 'steward'];
export const NOTICE = 'A demonstration sandbox: every person, room, device and record in it is synthetic. It is yours alone until it expires or you reset it; nothing in it reaches a real organization, and nothing typed into it should be personal or confidential.';

export interface DemoDeps { pool: PgPool; tokens: Hs256Tokens | null; cfg: Config['demo'] }
interface Sandbox { sandbox_id: string; tenant_id: string; tenant_slug: string; expires_at: string }
interface Persona { person_id: string; role_key: string; display_name: string }

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const off = () => new ApiError('not_found', 'demonstration sessions are not enabled on this deployment');
const FULL = 'the demonstration has opened every sandbox its database allows; it is refreshed on a schedule, so try again later';
const day = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

/** The tenant is a sandbox that is open and unexpired right now (asked on every request of a demonstration session). */
export const sandboxLive = async (pool: PgPool, tenantId: string): Promise<boolean> => (await pool.query<{ live: boolean }>('SELECT app.demo_sandbox_live($1) AS live', [tenantId])).rows[0]?.live === true;
/** The tenant is, or was, a sandbox (asked for every other kind of token: none of them reaches one). */
export const isSandboxTenant = async (pool: PgPool, tenantId: string): Promise<boolean> => (await pool.query<{ demo: boolean }>('SELECT app.is_demo_tenant($1) AS demo', [tenantId])).rows[0]?.demo === true;

/**
 * What a sandbox may still hold (0035): every write is an audit row, so a ceiling on audit rows bounds every table of the sandbox, and
 * evidence files have their own. Writes stop at the ceiling; reads go on a little longer (refused requests are audit rows too) and stop
 * at a quarter above it. A sandbox that reached its limit is reset by its visitor.
 */
export async function assertBudget(pool: PgPool, tenantId: string, kind: 'read' | 'write' | 'upload'): Promise<void> {
  const b = (await pool.tx({ tenantId }, (q) => q.query<{ writes: number; max_writes: number; evidence: number; max_evidence: number }>('SELECT * FROM app.demo_budget()'))).rows[0];
  if (!b) throw new ApiError('unauthenticated', 'the sandbox behind this demonstration session is closed or has expired: open a new one');
  if (kind === 'upload' && b.evidence >= b.max_evidence) throw new ApiError('rate_limited', `this sandbox holds its ${b.max_evidence} evidence notes: reset it to continue`);
  if (b.writes >= (kind === 'read' ? Math.ceil(b.max_writes * 1.25) : b.max_writes)) throw new ApiError('rate_limited', `this sandbox has recorded its ${b.max_writes} actions: reset it to continue`);
}

const personas = (pool: PgPool, tenantId: string): Promise<Persona[]> => pool.tx({ tenantId }, async (q) =>
  (await q.query<Persona>('SELECT m.person_id, m.role_key, p.display_name FROM app.membership m JOIN app.person p ON p.id = m.person_id WHERE m.revoked_at IS NULL AND NOT p.disabled ORDER BY m.role_key')).rows);
// the ids are the sandbox's own synthetic people: a session needs one to assign a job or lend an authority to a colleague
const describe = (ps: Persona[]) => ps.map((p) => ({ role: p.role_key, name: p.display_name, id: p.person_id }));

/** Whether a connected demonstration is on offer here, and how full it is. No sandbox data. */
export async function status(d: DemoDeps) {
  if (!d.cfg || !d.tokens) return { enabled: false, reason: 'demonstration sessions are not enabled on this deployment' };
  const s = (await d.pool.query<{ enabled: boolean; max_live: number; ttl_hours: number; live: number; opened: number; max_total: number }>('SELECT * FROM app.demo_status()')).rows[0];
  if (!s?.enabled) return { enabled: false, reason: 'demonstration sandboxes are not enabled for this database' };
  if (s.opened >= s.max_total) return { enabled: false, reason: FULL };
  return { enabled: true, live: s.live, maxLive: s.max_live, ttlHours: s.ttl_hours, sessionSeconds: d.cfg.ttlSeconds, roles: SANDBOX_ROLES, notice: NOTICE };
}

/** Run one route as a sandbox person: the central authority check and the body contract first, exactly as the HTTP layer does, then the handler. */
async function invoke(router: Router, ctx: RequestContext, method: string, path: string, body?: unknown): Promise<Record<string, unknown>> {
  const m = router.match(method, path);
  if (!m || 'allowed' in m) throw new Error(`scenario: no route ${method} ${path}`);
  const keys = enforcedAuthorities(m.route);
  if (keys.length) await ctx.require(keys, m.route.action ?? m.route.summary.split(' (')[0]!.slice(0, 80));
  if (m.route.body) { const errs = validate(m.route.body, body ?? {}, 'body'); if (errs.length) throw new Error(`scenario: ${method} ${path}: ${errs[0]}`); }
  const out = await m.route.handler(ctx, { params: m.params, query: new URLSearchParams(), body: body ?? null, raw: null, headers: {} });
  if (out.status >= 300) throw new Error(`scenario: ${method} ${path} answered ${out.status}`);
  return (out.body ?? {}) as Record<string, unknown>;
}

/**
 * The scenario every sandbox starts from: one huddle room, designed, approved and installed — INSTALLED_UNVERIFIED, its device register
 * still to be filled — and a service technician whose credentials were recorded by the service manager and verified by the data steward.
 * Everything after that is the visitor's to do.
 */
export interface Scenario { room: string; flagship: { room: string; canonicalRef: string; name: string } }
/**
 * The flagship engineering room (founder, 17 Nov 2026: "make one University lecture hall the flagship engineering demonstration
 * before expanding all the tools across the estate… the same engine can power your enterprise rooms, stadium executive suites, and
 * convention center spaces without creating separate engineering systems for each world"). It is the university's lecture theatre
 * as the canonical estate has it (apps/demo/src/estate/university.ts): its identifier, its campus and building, its seats and its
 * dimensions. Fictional, like the institution. Here it is a server room like any other, made through the same routes.
 */
export const FLAGSHIP = { canonicalRef: 'UNI-SCI-110', name: 'Lecture Theatre SCI-110 (synthetic)', template: 'auditorium', site: { code: 'UNI-N', name: 'Kestrel Valley University, North Campus (synthetic)' }, building: { code: 'UNI-SCI', name: 'Science Hall (synthetic)', floors: 4 },
  floor: 0, length: '20', width: '16', ceiling: '6.5', occupancy: 180, intendedUse: 'Lectures with capture and reinforcement: a raked theatre, 180 seats, six wheelchair positions at the rear cross-aisle' } as const;

async function seedScenario(pool: PgPool, router: Router, tenantId: string, people: Persona[], correlationId: string): Promise<Scenario> {
  const as = async (role: string): Promise<RequestContext> => {
    const who = people.find((p) => p.role_key === role); if (!who) throw new Error(`scenario: the sandbox has no ${role}`);
    const p = await resolvePrincipal(pool, who.person_id, tenantId, role); if (!p) throw new Error(`scenario: ${role} did not resolve`);
    p.demo = true; const ctx = new RequestContext(pool, correlationId); ctx.principal = p; return ctx;
  };
  const [designer, syseng, opslead, installer, svcmgr, steward] = await Promise.all(['designer', 'syseng', 'opslead', 'installer', 'svcmgr', 'steward'].map(as)) as [RequestContext, RequestContext, RequestContext, RequestContext, RequestContext, RequestContext];
  const room = String((await invoke(router, designer, 'POST', '/v1/rooms', { name: 'Atlas Huddle 4.218 (synthetic)', template: 'huddle', buildingCode: 'ATL', floor: 4 }))['code']);
  await invoke(router, designer, 'POST', `/v1/rooms/${room}/drawings/generate`);
  await invoke(router, syseng, 'POST', `/v1/rooms/${room}/drawings/plan/approve`);
  await invoke(router, syseng, 'POST', `/v1/rooms/${room}/classification/approve`, {});
  for (const [to, who] of [['DESIGN_APPROVED', syseng], ['INSTALLATION_PENDING', opslead], ['INSTALLED_UNVERIFIED', installer]] as const) await invoke(router, who, 'POST', `/v1/rooms/${room}/lifecycle`, { to });
  // the technician's staff facts (what the dispatch gates read), and credentials recorded and verified by two different people
  const tech = people.find((p) => p.role_key === 'service')!;
  await pool.tx({ tenantId, userId: svcmgr.p.personId }, (q) => q.query(
    `INSERT INTO app.staff_profile (tenant_id, person_id, internal, building_key, sites, skills, certs, capacity_hours) VALUES ($1,$2,true,'ATL',$3,$4,'{}',24) ON CONFLICT (tenant_id, person_id) DO NOTHING`,
    [tenantId, tech.person_id, ['*'], JSON.stringify({ 'SK-SVC-1': { level: 'Advanced', n: 9 }, 'SK-AUD-1': { level: 'Working', n: 5 }, 'SK-AUD-2': { level: 'Working', n: 3 }, 'SK-VID-1': { level: 'Working', n: 6 } })]));
  for (const competency of ['cert.av_field', 'cert.audio', 'cert.video']) {
    const rec = await invoke(router, svcmgr, 'POST', '/v1/competencies', { personId: tech.person_id, competency, source: 'EXTERNAL_CERTIFICATE', issuer: 'Synthetic Credentialing Body', reference: `SYN-SERVICE-${competency.split('.')[1]!.toUpperCase()}`, issuedOn: day(-365), expiresOn: day(365) });
    await invoke(router, steward, 'POST', `/v1/competencies/${String(rec['id'])}/verify`, { note: 'checked against the issuer record (synthetic scenario)' });
  }
  // the flagship room: its campus and building first (the sandbox's own records, written as its designer), then the room by the same routes
  await pool.tx({ tenantId, userId: designer.p.personId }, async (q) => {
    const site = (await q.query<{ id: string }>('INSERT INTO app.site (tenant_id, code, name) VALUES ($1,$2,$3) RETURNING id', [tenantId, FLAGSHIP.site.code, FLAGSHIP.site.name])).rows[0]!.id;
    await q.query('INSERT INTO app.building (tenant_id, site_id, code, name, floors) VALUES ($1,$2,$3,$4,$5)', [tenantId, site, FLAGSHIP.building.code, FLAGSHIP.building.name, FLAGSHIP.building.floors]);
  });
  const hall = String((await invoke(router, designer, 'POST', '/v1/rooms', { name: FLAGSHIP.name, template: FLAGSHIP.template, canonicalRef: FLAGSHIP.canonicalRef, buildingCode: FLAGSHIP.building.code, floor: FLAGSHIP.floor, length: FLAGSHIP.length, width: FLAGSHIP.width, ceiling: FLAGSHIP.ceiling, occupancy: FLAGSHIP.occupancy, intendedUse: FLAGSHIP.intendedUse }))['code']);
  await invoke(router, designer, 'POST', `/v1/rooms/${hall}/drawings/generate`);
  await invoke(router, syseng, 'POST', `/v1/rooms/${hall}/drawings/plan/approve`);
  await invoke(router, syseng, 'POST', `/v1/rooms/${hall}/classification/approve`, {});
  for (const [to, who] of [['DESIGN_APPROVED', syseng], ['INSTALLATION_PENDING', opslead], ['INSTALLED_UNVERIFIED', installer]] as const) await invoke(router, who, 'POST', `/v1/rooms/${hall}/lifecycle`, { to });
  return { room, flagship: { room: hall, canonicalRef: FLAGSHIP.canonicalRef, name: FLAGSHIP.name } };
}

function session(d: DemoDeps, sb: Sandbox, who: Persona) {
  const t = d.tokens!.issue(who.person_id, sb.tenant_id, who.role_key);
  return { accessToken: t.token, tokenType: 'Bearer', expiresIn: t.expiresIn, role: who.role_key, person: who.display_name };
}

/** Open a sandbox, prepare its scenario, and sign the visitor in as the installer (the first person with something to do). */
export async function open(d: DemoDeps, router: Router, remote: string, correlationId: string, replace?: { sandboxId: string; key: string }) {
  if (!d.cfg || !d.tokens) throw off();
  const key = crypto.randomBytes(32).toString('base64url');
  let sb: Sandbox;
  try {
    sb = (await d.pool.query<Sandbox>('SELECT * FROM app.demo_open_sandbox($1, $2, $3, $4, $5)', [sha(key), sha(`${d.cfg.remoteSalt}\n${remote}`), SANDBOX_ROLES, replace?.sandboxId ?? null, replace ? sha(replace.key) : null])).rows[0]!;
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'EM012') throw new ApiError('not_found', 'demonstration sandboxes are not enabled for this database');
    if (code === 'EM013') throw new ApiError('rate_limited', 'every demonstration sandbox is in use right now: try again in a little while');
    if (code === 'EM017') throw new ApiError('rate_limited', FULL);
    if (code === 'EM015') throw new ApiError('unauthenticated', 'the sandbox is unknown, closed or expired, or the key is not right');
    if (code === 'EM014') throw new ApiError('rate_limited', 'this address has opened its share of sandboxes for the hour: continue in the one you have, or try again later');
    throw e;
  }
  let scenario: Scenario; const people = await personas(d.pool, sb.tenant_id);
  try { scenario = await seedScenario(d.pool, router, sb.tenant_id, people, correlationId); }
  catch (e) {
    // a sandbox without its scenario is of no use to anyone: close it (its records stay) and say that the opening failed
    await d.pool.query('SELECT app.demo_close_sandbox($1, $2)', [sb.sandbox_id, sha(key)]);
    log('error', 'demonstration scenario failed', { correlationId, sandbox: sb.tenant_slug, error: (e as Error).message });
    throw new ApiError('internal', 'the sandbox could not be prepared');
  }
  return { sandbox: { id: sb.sandbox_id, key, tenant: sb.tenant_slug, expiresAt: sb.expires_at }, personas: describe(people), scenario,
    session: session(d, sb, people.find((p) => p.role_key === 'installer')!), notice: NOTICE,
    keyNote: 'The key is shown once. It signs you in as any person of this sandbox, here or in another browser, until the sandbox expires or is reset.' };
}

async function byKey(d: DemoDeps, sandboxId: string, key: string): Promise<Sandbox> {
  const sb = (await d.pool.query<Sandbox>('SELECT * FROM app.demo_sandbox_by_key($1, $2)', [sandboxId, sha(key)])).rows[0];
  if (!sb) throw new ApiError('unauthenticated', 'the sandbox is unknown, closed or expired, or the key is not right');
  return sb;
}

/** A session as one person of the sandbox the key opens: how a visitor comes back, and how they change role. */
export async function signIn(d: DemoDeps, body: { sandboxId: string; key: string; role: string }) {
  if (!d.cfg || !d.tokens) throw off();
  const sb = await byKey(d, body.sandboxId, body.key);
  const people = await personas(d.pool, sb.tenant_id);
  const who = people.find((p) => p.role_key === body.role);
  if (!who) throw invalid(`this sandbox has no ${body.role}: choose one of ${people.map((p) => p.role_key).join(', ')}`);
  return { ...session(d, sb, who), sandbox: { id: sb.sandbox_id, tenant: sb.tenant_slug, expiresAt: sb.expires_at } };
}

/**
 * Reset: the sandbox the key opens is closed and a new one opened, in one database transaction — a refused opening (the hourly cap)
 * closes nothing. The closed sandbox's sessions stop at once; its records stay where they are, unreachable.
 */
export async function reset(d: DemoDeps, router: Router, body: { sandboxId: string; key: string }, remote: string, correlationId: string) {
  if (!d.cfg || !d.tokens) throw off();
  const old = await byKey(d, body.sandboxId, body.key);
  return { closed: { id: old.sandbox_id, tenant: old.tenant_slug }, ...(await open(d, router, remote, correlationId, body)) };
}

/** The signed-in session's own sandbox: its expiry, its people, its rooms. */
export async function current(ctx: RequestContext) {
  if (!ctx.p.demo) throw new ApiError('not_found', 'this session is not a demonstration session');
  return ctx.tx(async (q) => {
    const sb = (await q.query<{ sandbox_id: string; tenant_slug: string; created_at: string; expires_at: string }>('SELECT * FROM app.demo_sandbox_current()')).rows[0];
    if (!sb) throw new ApiError('unauthenticated', 'the sandbox behind this demonstration session is closed or has expired: open a new one');
    const people = (await q.query<Persona>('SELECT m.person_id, m.role_key, p.display_name FROM app.membership m JOIN app.person p ON p.id = m.person_id WHERE m.revoked_at IS NULL ORDER BY m.role_key')).rows;
    const rooms = (await q.query<{ code: string; name: string; lifecycle: string }>('SELECT code, name, lifecycle FROM app.room ORDER BY code')).rows;
    return { sandbox: { id: sb.sandbox_id, tenant: sb.tenant_slug, createdAt: sb.created_at, expiresAt: sb.expires_at }, you: { role: ctx.p.role, name: ctx.p.name }, personas: describe(people), rooms, notice: NOTICE };
  });
}
