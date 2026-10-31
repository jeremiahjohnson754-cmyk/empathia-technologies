/**
 * Field Intelligence (P7) on @empathia/field-intelligence, persisted.
 *   v1.3 — the plan for a room from its planned assets: capabilities DECLARED or UNKNOWN, claimed observations downgraded, pairs
 *          NOT_TESTED, monitoring NOT_RUN. Computed on read; nothing is executed.
 *   v1.4 — Physical Validation sessions: a licence per site × archetype (granted by the security/platform administrator; a licence
 *          opens requests, never proofs) → eligibility → the five-step safety preflight by different authorities → a dry run that emits
 *          nothing → the commissioning lead's authorization → two-confirmation arming by the consenting operator → a run that is a
 *          labelled SIMULATION with scripted abnormal branches → E-stop. The engine decides every step with the caller's authorities;
 *          the person id is the actor identity, so "the consenting operator" is a real person, not a role.
 * Every step updates the session row (the engine's record is the row), audits, and refuses with the engine's reasons.
 */
import { FI13, FIPV, BRANCHES, composePlan, createSession, eligibility, preflight, dryRun, authorize, arm, run, estop, isRefusal, type Session, type Actor, type PreflightInput, type PvTest } from '@empathia/field-intelligence';
import type { Queryable } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import { ApiError, notFound } from '../http/errors.js';
import { findRoom } from './rooms.js';

const actor = (ctx: RequestContext): Actor => ({ persona: ctx.p.personId, can: (a) => ctx.can(a), now: new Date().toISOString() });
const ARCH = (cls: Record<string, unknown> | null): string => String((cls && (cls['archetype'] as string)) || 'HUD');

export async function plan(ctx: RequestContext, roomRef: string) {
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, roomRef);
    const assets = (await q.query<{ code: string; label: string; category: string }>('SELECT code, label, category FROM app.planned_asset WHERE room_id = $1 AND removed_at IS NULL AND NOT furniture ORDER BY code', [room.id])).rows;
    const p = composePlan(assets.map((a) => ({ id: a.code, name: a.label, category: a.category })));
    return { room: { code: room.code, name: room.name, archetype: ARCH(room.approved_class || room.classification) }, plan: p, constants: { scriptVersion: FI13.scriptVersion, modes: FI13.modes, intervalMinutes: FI13.intervalMinutes, limitations: FI13.limitations }, note: 'PLAN_ONLY: nothing on this page was executed; every capability is DECLARED or UNKNOWN until a procedure records evidence.' };
  });
}

// ---------------------------------------------------------------------------------------------------------- licences
export async function licences(ctx: RequestContext) {
  return ctx.tx(async (q) => {
    const sites = (await q.query<{ id: string; code: string; name: string }>('SELECT id, code, name FROM app.site ORDER BY code')).rows;
    const rows = (await q.query<{ site_id: string; archetype: string; granted: boolean; note: string | null; granted_at: string; by: string }>('SELECT l.site_id, l.archetype, l.granted, l.note, l.granted_at, p.display_name AS by FROM app.fi_licence l JOIN app.person p ON p.id = l.granted_by')).rows;
    const archetypes = FIPV.licensePolicy.map((p) => p.archetype);
    return { sites: sites.map((s) => ({ code: s.code, name: s.name, licences: archetypes.map((a) => { const r = rows.find((x) => x.site_id === s.id && x.archetype === a); const pol = FIPV.licensePolicy.find((p) => p.archetype === a)!; return { archetype: a, granted: !!r?.granted, note: r?.note || null, by: r?.by || null, at: r?.granted_at || null, policy: pol.recommendation, tier: pol.tier }; }) })), mayGrant: ctx.can('license.grant'), adapters: FIPV.adapters };
  });
}
export async function setLicence(ctx: RequestContext, body: { siteCode: string; archetype: string; granted: boolean; note?: string }) {
  await ctx.require('license.grant', 'grant or revoke a Physical Validation licence', { type: 'Site', id: body.siteCode });
  if (!FIPV.licensePolicy.some((p) => p.archetype === body.archetype)) throw new ApiError('validation', `archetype is one of ${FIPV.licensePolicy.map((p) => p.archetype).join(', ')}`);
  return ctx.tx(async (q) => {
    const site = (await q.query<{ id: string }>('SELECT id FROM app.site WHERE code = $1', [body.siteCode])).rows[0]; if (!site) throw notFound(`site ${body.siteCode}`);
    await q.query('INSERT INTO app.fi_licence (tenant_id, site_id, archetype, granted, granted_by, note) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (tenant_id, site_id, archetype) DO UPDATE SET granted = EXCLUDED.granted, granted_by = EXCLUDED.granted_by, granted_at = now(), note = EXCLUDED.note', [ctx.p.tenantId, site.id, body.archetype, body.granted, ctx.p.personId, body.note || null]);
    await ctx.audit(q, body.granted ? 'license.grant' : 'license.revoke', 'ALLOWED', { type: 'Site', id: body.siteCode }, { archetype: body.archetype, note: body.note || null });
    return { siteCode: body.siteCode, archetype: body.archetype, granted: body.granted, note: 'A licence opens requests, never proofs: the v1.3 plan and an independent qualified upload remain available without one.' };
  });
}

// ---------------------------------------------------------------------------------------------------------- sessions
interface Row { id: string; code: string; room_id: string; state: string; terminal: boolean; session: Session; created_by: string; created_at: string; updated_at: string; room_code: string; room_name: string; site_id: string; creator: string }
const SELECT = 'SELECT s.*, r.code AS room_code, r.name AS room_name, b.site_id, p.display_name AS creator FROM app.fi_session s JOIN app.room r ON r.id = s.room_id AND r.tenant_id = s.tenant_id JOIN app.building b ON b.id = r.building_id AND b.tenant_id = r.tenant_id JOIN app.person p ON p.id = s.created_by';
const scope = (ctx: RequestContext, n: number) => (ctx.p.siteScope && ctx.p.siteScope.length ? { sql: ` AND b.site_id = ANY($${n}::uuid[])`, args: [ctx.p.siteScope] } : { sql: '', args: [] as unknown[] });
async function find(ctx: RequestContext, q: Queryable, code: string, lock = false): Promise<Row> {
  const sc = scope(ctx, 2); const r = (await q.query<Row>(`${SELECT} WHERE s.code = $1${sc.sql}${lock ? ' FOR UPDATE OF s' : ''}`, [code, ...sc.args])).rows[0];
  if (!r) throw notFound(`session ${code}`); return r;
}
/** What the preflight still needs, read from the record (the engine's own list is on the step response; this one is on every read). */
const stillMissing = (s: Session): string[] => s.state !== 'SAFETY_PREFLIGHT' ? [] : [[!s.approvals.protocol, 'protocol approval'], [!s.approvals.window, 'maintenance window'], [!s.approvals.operator, 'operator consent'], [!s.instrument, 'instrument calibration'], [s.safety.emergencyStop !== 'VERIFIED_LOCAL', 'emergency stop verification']].filter(([m]) => m).map(([, l]) => l as string);
const view = (ctx: RequestContext, r: Row, extra: Record<string, unknown> = {}) => {
  const s = r.session;
  return { code: r.code, missing: stillMissing(s), room: { code: r.room_code, name: r.room_name }, state: r.state, terminal: r.terminal, createdBy: r.creator, createdAt: r.created_at, updatedAt: r.updated_at, session: s, stepLabel: (FIPV.stepLabel as Record<string, string>)[s.state] || s.state,
    yours: { eligibility: ctx.can(['protocol.approve', 'tests.verify.all', 'fipv.review', 'plan.compile']), protocol: ctx.can('protocol.approve'), window: ctx.can(['window.approve', 'access.approve', 'occupancy.confirm']), operator: ctx.can(['work.accept', 'test.verify', 'work.evidence']), instrument: ctx.can(['work.evidence', 'test.verify', 'protocol.approve']), dryRun: ctx.can(['work.accept', 'test.verify']), authorize: ctx.can(['tests.verify.all', 'fipv.review']), arm: ctx.can(['work.accept', 'test.verify']) && s.safety.localOperator === ctx.p.personId, run: ctx.can(['work.accept', 'test.verify', 'tests.verify.all']) },
    branches: BRANCHES, adapters: FIPV.adapters, ...extra };
};

export async function listSessions(ctx: RequestContext) {
  const sc = scope(ctx, 1);
  const rows = (await ctx.tx((q) => q.query<Row>(`${SELECT} WHERE true${sc.sql} ORDER BY s.created_at DESC LIMIT 200`, sc.args))).rows;
  return { items: rows.map((r) => ({ code: r.code, room: { code: r.room_code, name: r.room_name }, archetype: r.session.archetype, state: r.state, terminal: r.terminal, simulated: r.session.simulated, points: r.session.points.length, tests: r.session.tests.length, createdBy: r.creator, createdAt: r.created_at })) };
}
export async function getSession(ctx: RequestContext, code: string) { return ctx.tx(async (q) => view(ctx, await find(ctx, q, code))); }

/** Proposes a session: measurement points and tests. The points come from the request (seats, from the Lite model); the tests name their adapter. */
export async function propose(ctx: RequestContext, roomRef: string, body: { points: Array<{ id: string; label: string }>; tests: Array<{ id: string; label: string; adapter: string }> }) {
  await ctx.require(['plan.compile', 'protocol.approve'], 'propose a Physical Validation session', { type: 'Room', id: roomRef });
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, roomRef);
    const bad = body.tests.filter((t) => !FIPV.adapters.some((a) => a.id === t.adapter)); if (bad.length) throw new ApiError('validation', `unknown adapter ${bad.map((t) => t.adapter).join(', ')}; adapters: ${FIPV.adapters.map((a) => a.id).join(', ')}`);
    const code = (await q.query<{ c: string }>("SELECT app.next_code('fi_session', 'FIS-') AS c")).rows[0]!.c;
    const s = createSession(code, room.code, ARCH(room.approved_class || room.classification), body.points, body.tests as PvTest[], actor(ctx));
    await q.query('INSERT INTO app.fi_session (tenant_id, room_id, code, state, terminal, session, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)', [ctx.p.tenantId, room.id, code, s.state, s.terminal, JSON.stringify(s), ctx.p.personId]);
    await ctx.audit(q, 'fipv.propose', 'ALLOWED', { type: 'FiSession', id: code }, { roomCode: room.code, points: s.points.length, tests: s.tests.map((t) => t.id) });
    return { sessionId: code, state: s.state };
  });
}

type StepResult = Session | { why: string[] } | { missing: string[]; session: Session };
async function apply(ctx: RequestContext, code: string, action: string, fn: (s: Session, a: Actor, q: Queryable, r: Row) => Promise<StepResult> | StepResult, detail: Record<string, unknown> = {}) {
  return ctx.tx(async (q) => {
    const r = await find(ctx, q, code, true);
    const out = await fn(r.session, actor(ctx), q, r);
    if (isRefusal(out)) await ctx.refuse(action, { type: 'FiSession', id: code }, out.why, detail);
    const s = 'session' in (out as object) ? (out as { session: Session }).session : (out as Session);
    const missing = 'missing' in (out as object) ? (out as { missing: string[] }).missing : [];
    await q.query('UPDATE app.fi_session SET state = $2, terminal = $3, session = $4, updated_at = now() WHERE id = $1', [r.id, s.state, s.terminal, JSON.stringify(s)]);
    await ctx.audit(q, action, 'ALLOWED', { type: 'FiSession', id: code }, { from: r.state, to: s.state, ...detail, ...(missing.length ? { missing } : {}) });
    return view(ctx, { ...r, session: s, state: s.state, terminal: s.terminal }, missing.length ? { missing } : {});
  });
}

export const checkEligibility = (ctx: RequestContext, code: string) => apply(ctx, code, 'fipv.eligibility', async (s, a, q, r) => {
  const lic = (await q.query<{ granted: boolean }>('SELECT granted FROM app.fi_licence WHERE site_id = $1 AND archetype = $2', [r.site_id, s.archetype])).rows[0];
  return eligibility(s, a, !!lic?.granted);
});
export const stepPreflight = (ctx: RequestContext, code: string, input: PreflightInput) => apply(ctx, code, `fipv.preflight.${input.step}`, (s, a) => preflight(s, a, input), { step: input.step });
export const doDryRun = (ctx: RequestContext, code: string) => apply(ctx, code, 'fipv.dry_run', (s, a) => dryRun(s, a));
export const doAuthorize = (ctx: RequestContext, code: string, yes: boolean) => apply(ctx, code, 'fipv.authorize', (s, a) => authorize(s, a, yes), { yes });
/** Arming: only the consenting operator (a person), two confirmations. `real` asks for a real run, which this build cannot provide (NOT_CONFIGURED) — the honest exit. */
export const doArm = (ctx: RequestContext, code: string, body: { confirm1: boolean; confirm2: boolean; real?: boolean }) => apply(ctx, code, 'fipv.arm', (s, a) => arm(s, a, body.confirm1, body.confirm2, !body.real), { real: !!body.real });
export const doRun = (ctx: RequestContext, code: string, branch: string | null) => apply(ctx, code, 'fipv.run', (s, a) => run(s, a, (branch || null) as never), { branch });
export const doEstop = (ctx: RequestContext, code: string) => apply(ctx, code, 'fipv.estop', (s, a) => estop(s, a));
