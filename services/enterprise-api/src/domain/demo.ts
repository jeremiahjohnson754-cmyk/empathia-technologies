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
/** The people a sandbox opens with: one for each role, and a second service technician (0041). The technician is the only role that
 *  holds work.accept, so with one of them the service pool had one member and nothing about assignment could be refused to anybody. */
export const SANDBOX_PEOPLE = [...SANDBOX_ROLES, 'service'];
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
  (await q.query<Persona>('SELECT m.person_id, m.role_key, p.display_name FROM app.membership m JOIN app.person p ON p.id = m.person_id WHERE m.revoked_at IS NULL AND NOT p.disabled ORDER BY m.role_key, length(p.email), p.email')).rows);   // within a role: the first person, then -2 (0041)
// the ids are the sandbox's own synthetic people: a session needs one to assign a job or lend an authority to a colleague
// seat: which person of that role, from 1. A session names a role and, where the role has more than one person, a seat.
const describe = (ps: Persona[]) => ps.map((p, i) => ({ role: p.role_key, name: p.display_name, id: p.person_id, seat: ps.slice(0, i).filter((x) => x.role_key === p.role_key).length + 1 }));

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
export interface Scenario { room: string; flagship: { room: string; canonicalRef: string; name: string }; second: { room: string; canonicalRef: string; name: string } }
/**
 * The flagship engineering room (founder, 17 Nov 2026: "make one University lecture hall the flagship engineering demonstration
 * before expanding all the tools across the estate… the same engine can power your enterprise rooms, stadium executive suites, and
 * convention center spaces without creating separate engineering systems for each world"). It is the university's lecture theatre
 * as the canonical estate has it (apps/demo/src/estate/university.ts): its identifier, its campus and building, its seats and its
 * dimensions. Fictional, like the institution. Here it is a server room like any other, made through the same routes.
 */
export const FLAGSHIP = { criterion: { test: 'reverberation_rt60', metric: 't30_mid', upper: 1, source: 'Acoustic brief for SCI-110, speech use (synthetic)' }, canonicalRef: 'UNI-SCI-110', name: 'Lecture Theatre SCI-110 (synthetic)', template: 'auditorium', site: { code: 'UNI-N', name: 'Kestrel Valley University, North Campus (synthetic)' }, building: { code: 'UNI-SCI', name: 'Science Hall (synthetic)', floors: 4 },
  floor: 0, length: '20', width: '16', ceiling: '6.5', occupancy: 180, intendedUse: 'Lectures with capture and reinforcement: a raked theatre, 180 seats, six wheelchair positions at the rear cross-aisle' } as const;

/**
 * What the lecture theatre has beyond its template (founder, 17 Nov 2026, 19:05: "enrich SCI-110's physical model"). The auditorium
 * template gives a 300-seat hall nine devices and two seating blocks; for 180 seats that was a sketch. These are added by the
 * sandbox's designer through POST /v1/rooms/{room}/devices, the route anyone would use, before the drawings are generated and the
 * design approved — so the design checks, the proposed connections, the commissioning plan and the register all see them.
 *
 * Positions are in metres: x across from the left wall, y from the front wall, z above the floor at the device (the floor is raked;
 * the rake is not modelled, so z is a height above the flat floor of the plan). Every device is a class of device, generic, with
 * the catalogue's own properties. It is a synthetic design for a fictional room: plausible, not a design for any real room.
 *
 *   seating      30 blocks of six in ten rows of three (two aisles): 180 seats, the room's stated occupancy
 *   display      a relay display on each side wall at mid-depth, and a confidence display on the rear wall facing the lectern
 *   cameras      an audience camera at the front and a second presenter camera at the rear, with the template's rear camera
 *   microphones  four suspended over the seating for questions from the floor, one at the lectern, with the template's wireless system
 *   loudspeakers six more, suspended in three pairs down the room behind the template's front pair: eight, four metres of coverage each
 *   equipment    a second amplifier for them, a control processor, a video switcher and a stream encoder for lecture capture, a second
 *                network switch (the devices need more ports than one has), a power distribution unit and the rack itself
 *   control      a touch panel beside the lectern, a scheduling panel by the rear door, an occupancy sensor, the lighting control
 */
type Add = { category: string; x: number; y: number; z?: number; rot?: number };
const SEAT_ROWS = 10; const SEAT_X = [3.2, 8, 12.8]; const seatAt = (i: number) => ({ x: SEAT_X[i % 3]!, y: Math.round((5 + Math.floor(i / 3) * 1.4) * 100) / 100 });
export const FLAGSHIP_MODEL: { heights: Record<string, number>; add: Add[]; seats: number } = {
  // the template's own devices, by category: the rear camera above the cross-aisle, the front loudspeakers suspended like the others
  heights: { camera: 3.2, speaker: 5 },
  add: [
    // the second switch and the second amplifier first: the engine proposes each connection to the first switch with a free port and the
    // first amplifier with a free channel, so they have to be there when the devices that need them arrive
    { category: 'switch', x: 15.52, y: 11 }, { category: 'amp', x: 15.52, y: 7 },
    { category: 'display', x: 0.15, y: 11, z: 3, rot: 90 }, { category: 'display', x: 15.85, y: 11, z: 3, rot: 270 }, { category: 'display', x: 10, y: 19.85, z: 2.6, rot: 180 },
    { category: 'camera', x: 3, y: 0.3, z: 2.8, rot: 0 }, { category: 'camera', x: 5, y: 19.4, z: 3.2, rot: 180 },
    { category: 'micceil', x: 5, y: 8, z: 4.5 }, { category: 'micceil', x: 11, y: 8, z: 4.5 }, { category: 'micceil', x: 5, y: 14, z: 4.5 }, { category: 'micceil', x: 11, y: 14, z: 4.5 }, { category: 'mictable', x: 8, y: 2.05, z: 1.1 },
    { category: 'speaker', x: 4, y: 10, z: 5 }, { category: 'speaker', x: 12, y: 10, z: 5 }, { category: 'speaker', x: 4, y: 14, z: 5 }, { category: 'speaker', x: 12, y: 14, z: 5 }, { category: 'speaker', x: 4, y: 18, z: 5 }, { category: 'speaker', x: 12, y: 18, z: 5 },
    { category: 'control', x: 15.52, y: 8 }, { category: 'switcher', x: 15.52, y: 9 }, { category: 'encoder', x: 15.52, y: 10 }, { category: 'pdu', x: 15.52, y: 12 }, { category: 'rack', x: 15.3, y: 13.2 },
    { category: 'touch', x: 8.95, y: 2, z: 1.1 }, { category: 'scheduler', x: 15.9, y: 19, rot: 270 }, { category: 'occsensor', x: 8, y: 10, z: 6.5 }, { category: 'lighting', x: 0.1, y: 1.5, rot: 90 },
  ],
  seats: SEAT_ROWS * SEAT_X.length * 6,
};

/**
 * A second engineering room, in another world (founder, 17 Nov 2026, 19:05: "demonstrate the same workflow in another room"; and
 * earlier the same day: "the same engine can power your enterprise rooms, stadium executive suites, and convention center spaces
 * without creating separate engineering systems for each world"). It is Harbor 201, a 220-seat session room of the convention
 * centre as the canonical estate has it (apps/demo/src/estate/convention.ts: CNV-MR-H201, theatre layout, 22 × 16 × 5 m). The venue
 * is fictional and the room is a server room like any other, made through the same routes by the same people: nothing about it is
 * special-cased. It is the town-hall template as it comes (its seating blocks are a sketch of 220 seats, and the page says how many
 * are drawn), with one reverberation criterion for speech. A session room and not a boardroom because the catalogue applies the
 * reverberation test to assembly rooms only: in a boardroom there would be no acoustic acceptance of this kind to fail.
 * Everything after "installed" is the visitor's to do, with the same page and the same rules as the lecture theatre.
 */
export const SECOND = { criterion: { test: 'reverberation_rt60', metric: 't30_mid', upper: 0.8, source: 'Acoustic brief for Harbor 201, speech and presentation use (synthetic)' }, canonicalRef: 'CNV-MR-H201', name: 'Harbor 201 (synthetic)', template: 'townhall',
  site: { code: 'CNV', name: 'Larkspur Exchange Convention Centre (synthetic)' }, building: { code: 'CNV-V', name: 'Larkspur Exchange (synthetic)', floors: 2 },
  floor: 2, length: '22', width: '16', ceiling: '5', occupancy: 220, intendedUse: 'Conference sessions with capture and reinforcement: theatre seating for 220' } as const;

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
  // the second technician (0041): a staff profile like any other, and the field certificate the work needs RECORDED by the service
  // manager and left unverified. It counts for nothing until someone other than its recorder and its holder verifies it, so the
  // dispatch gate refuses this person, with that reason, and "assign anyway" is refused. Verifying it is the visitor's to do.
  const tech2 = people.filter((p) => p.role_key === 'service')[1];
  if (tech2) {
    await pool.tx({ tenantId, userId: svcmgr.p.personId }, (q) => q.query(
      `INSERT INTO app.staff_profile (tenant_id, person_id, internal, building_key, sites, skills, certs, capacity_hours) VALUES ($1,$2,true,'ATL',$3,$4,'{}',24) ON CONFLICT (tenant_id, person_id) DO NOTHING`,
      [tenantId, tech2.person_id, ['*'], JSON.stringify({ 'SK-SVC-1': { level: 'Working', n: 4 }, 'SK-AUD-1': { level: 'Working', n: 2 } })]));
    await invoke(router, svcmgr, 'POST', '/v1/competencies', { personId: tech2.person_id, competency: 'cert.av_field', source: 'EXTERNAL_CERTIFICATE', issuer: 'Synthetic Credentialing Body', reference: 'SYN-SERVICE2-AV_FIELD', issuedOn: day(-30), expiresOn: day(700) });
  }
  // the flagship room: its campus and building first (the sandbox's own records, written as its designer), then the room by the same routes
  await pool.tx({ tenantId, userId: designer.p.personId }, async (q) => {
    const site = (await q.query<{ id: string }>('INSERT INTO app.site (tenant_id, code, name) VALUES ($1,$2,$3) RETURNING id', [tenantId, FLAGSHIP.site.code, FLAGSHIP.site.name])).rows[0]!.id;
    await q.query('INSERT INTO app.building (tenant_id, site_id, code, name, floors) VALUES ($1,$2,$3,$4,$5)', [tenantId, site, FLAGSHIP.building.code, FLAGSHIP.building.name, FLAGSHIP.building.floors]);
  });
  const hall = String((await invoke(router, designer, 'POST', '/v1/rooms', { name: FLAGSHIP.name, template: FLAGSHIP.template, canonicalRef: FLAGSHIP.canonicalRef, buildingCode: FLAGSHIP.building.code, floor: FLAGSHIP.floor, length: FLAGSHIP.length, width: FLAGSHIP.width, ceiling: FLAGSHIP.ceiling, occupancy: FLAGSHIP.occupancy, intendedUse: FLAGSHIP.intendedUse }))['code']);
  // the theatre's own equipment and seating (FLAGSHIP_MODEL), added to the draft as its designer: the template's devices first get
  // their heights and its two seating blocks their places in the rows, then the rest is added, one request each
  { const D = `/v1/rooms/${hall}/devices`; const first = ((await invoke(router, designer, 'GET', `/v1/rooms/${hall}`))['devices'] as Array<{ id: string; cat: string; furniture?: boolean }>);
    let seat = 0;
    for (const d of first) {
      if (d.cat === 'chairs') await invoke(router, designer, 'PATCH', `${D}/${d.id}`, seatAt(seat++));
      else if (FLAGSHIP_MODEL.heights[d.cat] != null) await invoke(router, designer, 'PATCH', `${D}/${d.id}`, { z: FLAGSHIP_MODEL.heights[d.cat] });
    }
    // the rest in one request: each added as a single add would add it, the room analysed once (a sandbox opened in 24.5 s on staging)
    const rest: Add[] = []; for (; seat < SEAT_ROWS * SEAT_X.length; seat++) rest.push({ category: 'chairs', ...seatAt(seat) } as Add);
    await invoke(router, designer, 'POST', `${D}/batch`, { devices: [...rest, ...FLAGSHIP_MODEL.add] });
  }
  // what DESIGN_APPROVED approves is the latest saved revision: the theatre's equipment and seating are saved as revision 2 by its designer
  await invoke(router, designer, 'POST', `/v1/rooms/${hall}/revisions`, { reason: 'the theatre\u2019s own equipment and seating (synthetic)' });
  await invoke(router, designer, 'POST', `/v1/rooms/${hall}/drawings/generate`);
  await invoke(router, syseng, 'POST', `/v1/rooms/${hall}/drawings/plan/approve`);
  await invoke(router, syseng, 'POST', `/v1/rooms/${hall}/classification/approve`, {});
  for (const [to, who] of [['DESIGN_APPROVED', syseng], ['INSTALLATION_PENDING', opslead], ['INSTALLED_UNVERIFIED', installer]] as const) await invoke(router, who, 'POST', `/v1/rooms/${hall}/lifecycle`, { to });
  // what the lecture theatre has to meet for reverberation, set by the design authority through the same route anyone would use (0037).
  // It is the one criterion the scenario sets: the other measured tests have none until someone sets one.
  await invoke(router, syseng, 'PUT', `/v1/rooms/${hall}/criteria/${FLAGSHIP.criterion.test}`, { metric: FLAGSHIP.criterion.metric, upper: FLAGSHIP.criterion.upper, source: FLAGSHIP.criterion.source });
  // the second engineering room: its venue first, then the room, by the same routes and the same people
  await pool.tx({ tenantId, userId: designer.p.personId }, async (q) => {
    const site = (await q.query<{ id: string }>('INSERT INTO app.site (tenant_id, code, name) VALUES ($1,$2,$3) RETURNING id', [tenantId, SECOND.site.code, SECOND.site.name])).rows[0]!.id;
    await q.query('INSERT INTO app.building (tenant_id, site_id, code, name, floors) VALUES ($1,$2,$3,$4,$5)', [tenantId, site, SECOND.building.code, SECOND.building.name, SECOND.building.floors]);
  });
  const suite = String((await invoke(router, designer, 'POST', '/v1/rooms', { name: SECOND.name, template: SECOND.template, canonicalRef: SECOND.canonicalRef, buildingCode: SECOND.building.code, floor: SECOND.floor, length: SECOND.length, width: SECOND.width, ceiling: SECOND.ceiling, occupancy: SECOND.occupancy, intendedUse: SECOND.intendedUse }))['code']);
  await invoke(router, designer, 'POST', `/v1/rooms/${suite}/drawings/generate`);
  await invoke(router, syseng, 'POST', `/v1/rooms/${suite}/drawings/plan/approve`);
  await invoke(router, syseng, 'POST', `/v1/rooms/${suite}/classification/approve`, {});
  for (const [to, who] of [['DESIGN_APPROVED', syseng], ['INSTALLATION_PENDING', opslead], ['INSTALLED_UNVERIFIED', installer]] as const) await invoke(router, who, 'POST', `/v1/rooms/${suite}/lifecycle`, { to });
  await invoke(router, syseng, 'PUT', `/v1/rooms/${suite}/criteria/${SECOND.criterion.test}`, { metric: SECOND.criterion.metric, upper: SECOND.criterion.upper, source: SECOND.criterion.source });
  return { room, flagship: { room: hall, canonicalRef: FLAGSHIP.canonicalRef, name: FLAGSHIP.name }, second: { room: suite, canonicalRef: SECOND.canonicalRef, name: SECOND.name } };
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
    sb = (await d.pool.query<Sandbox>('SELECT * FROM app.demo_open_sandbox($1, $2, $3, $4, $5)', [sha(key), sha(`${d.cfg.remoteSalt}\n${remote}`), SANDBOX_PEOPLE, replace?.sandboxId ?? null, replace ? sha(replace.key) : null])).rows[0]!;
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
export async function signIn(d: DemoDeps, body: { sandboxId: string; key: string; role: string; seat?: number }) {
  if (!d.cfg || !d.tokens) throw off();
  const sb = await byKey(d, body.sandboxId, body.key);
  const people = await personas(d.pool, sb.tenant_id);
  const ofRole = people.filter((p) => p.role_key === body.role); const who = ofRole[(body.seat ?? 1) - 1];
  if (!ofRole.length) throw invalid(`this sandbox has no ${body.role}: choose one of ${[...new Set(people.map((p) => p.role_key))].join(', ')}`);
  if (!who) throw invalid(`this sandbox has ${ofRole.length} ${body.role}: seat ${body.seat} is not one of them`);
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
