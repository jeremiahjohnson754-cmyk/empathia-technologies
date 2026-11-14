/**
 * Positions, physical assets and installations (ADR-0012) — server-side.
 *
 * A room's planned asset (PA-xxxx) is the logical POSITION: its slot, purpose, mounting, geometry and design history. The hardware is a
 * PHYSICAL ASSET (AS-xxxx) with its own identity and lifecycle, connected to a position by an INSTALLATION record that is dated,
 * append-only and closed exactly once. The rules are @empathia/commissioning-engine `installations.ts` (the investor demonstration runs
 * the same functions); the database (migration 0026) refuses what the rules refuse, as the backstop.
 *
 * Every mutation: authority → lock the room (FOR UPDATE, the same lock every room mutation takes) and the position and the incoming unit
 * → plan → write the installation records → outbox event → audit, in ONE transaction. A failure anywhere rolls all of it back.
 */
import crypto from 'node:crypto';
import {
  planInstall, planReplacement, planIdentity, planRetirement, planRegisterEntry, registerMissing, inventoryOf, identityOf, defaultCatalog, installationSentence, reopenedBySubstitution, IDENTITY_STATES,
  type AssetFact, type InstallationFact, type Disposition, type RetirementReason, type RegisterEntry, type IdentityState, type IncomingUnit, type PositionFact, type ReplacementPlan, type DeviceIdentity, type UnitChange,
} from '@empathia/commissioning-engine';
import type { Queryable } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import { ApiError, invalid, notFound } from '../http/errors.js';
import { bump, findRoom, recommissioning, type RoomRow } from './rooms.js';
import { VERIFY_AUTHORITIES } from './commissioning.js';

/** Record installations and replace units: the field authority that records installation work (the INSTALLED_UNVERIFIED step's). */
export const INSTALL_AUTHORITY = 'work.evidence';
/** Declare or observe a unit's identity: the field authorities that record what is on site. Verifying it: the verification authorities. */
export const IDENTITY_RECORD_AUTHORITIES = ['work.evidence', 'field.scan'];
export const IDENTITY_AUTHORITIES = [...IDENTITY_RECORD_AUTHORITIES, ...VERIFY_AUTHORITIES];

/** A failure injected in tests only: proves that a replacement interrupted part-way rolls back as a whole. It fires only when all three
 *  hold: NODE_ENV=test, EMPATHIA_FAILPOINTS names the point, and the API's database is a test database (name starting empathia_test_),
 *  the same double gate as the outbox fault injection; a production deployment that set the first two by mistake still never fires. */
const TEST_DATABASE = /\/empathia_test_[A-Za-z0-9_]+(\?|$)/;
export function failpoint(name: string): void {
  if (process.env['NODE_ENV'] !== 'test' || !(process.env['EMPATHIA_FAILPOINTS'] || '').split(',').includes(name)) return;
  if (!TEST_DATABASE.test(process.env['APP_DATABASE_URL'] || process.env['DATABASE_URL'] || '')) return;
  throw new Error(`failpoint ${name}`);
}

// ------------------------------------------------------------------------------------------------ reading
interface PositionRow { id: string; code: string; room_id: string; category: string; label: string; role: string; model: string; generic: boolean; furniture: boolean; mount: string; x: string; y: string; z: string; rot: string; lifecycle: string; model_history: Array<{ model: string; generic?: boolean; until: string; by: string }>; removed_at: string | null }
interface AssetRow { id: string; code: string; category: string; manufacturer: string | null; model: string; serial: string | null; identity_state: IdentityState; identity_evidence_id: string | null; identity_by: string | null; identity_at: string | null; origin: string; created_by: string | null; created_at: string; disposition?: Disposition; retired_at?: string | null; retired_by?: string | null; retired_role?: string | null; retirement_reason?: RetirementReason | null; retirement_note?: string | null }
export interface InstallationRow {
  id: string; position: string; position_id: string; room: string; room_name: string; asset: string; asset_id: string; model: string; manufacturer: string | null; serial: string | null; identity_state: IdentityState;
  installed_at: string; effective_basis: InstallationFact['basis']; install_reason: InstallationFact['installReason']; installed_by: string | null; installed_role: string | null; install_note: string | null; install_evidence_id: string | null; install_event_id: string | null; correlation_id: string;
  removed_at: string | null; removal_reason: InstallationFact['removalReason']; removed_by: string | null; removed_role: string | null; removal_note: string | null; removal_evidence_id: string | null; removal_event_id: string | null; removal_correlation_id: string | null;
}
const INSTALLATION_SELECT = `SELECT i.id, pa.code AS position, pa.id AS position_id, r.code AS room, r.name AS room_name, a.code AS asset, a.id AS asset_id, a.model, a.manufacturer, a.serial, a.identity_state,
  i.installed_at, i.effective_basis, i.install_reason, i.installed_by, i.installed_role, i.install_note, i.install_evidence_id, i.install_event_id, i.correlation_id,
  i.removed_at, i.removal_reason, i.removed_by, i.removed_role, i.removal_note, i.removal_evidence_id, i.removal_event_id, i.removal_correlation_id
  FROM app.asset_installation i JOIN app.planned_asset pa ON pa.id = i.position_id AND pa.tenant_id = i.tenant_id JOIN app.room r ON r.id = pa.room_id AND r.tenant_id = pa.tenant_id JOIN app.physical_asset a ON a.id = i.asset_id AND a.tenant_id = i.tenant_id`;
export const fact = (r: InstallationRow): InstallationFact => ({ id: r.id, position: r.position, asset: r.asset, installedAt: r.installed_at, removedAt: r.removed_at, basis: r.effective_basis, installReason: r.install_reason, removalReason: r.removal_reason, installedBy: r.installed_by, removedBy: r.removed_by });
const assetFact = (a: Pick<AssetRow, 'code' | 'category' | 'manufacturer' | 'model' | 'serial' | 'identity_state'> & Partial<AssetRow>): AssetFact => ({ code: a.code, category: a.category, manufacturer: a.manufacturer, model: a.model, serial: a.serial, identityState: a.identity_state,
  disposition: a.disposition || 'IN_SERVICE', retired: a.retired_at ? { at: a.retired_at, by: a.retired_by ?? null, reason: a.retirement_reason!, note: a.retirement_note ?? null } : null });

/** Every installation record of a room's positions (open and closed), oldest first, with the unit each names. */
export async function roomInstallations(q: Queryable, roomId: string): Promise<{ rows: InstallationRow[]; facts: InstallationFact[]; assets: Map<string, AssetFact> }> {
  const rows = (await q.query<InstallationRow>(`${INSTALLATION_SELECT} WHERE pa.room_id = $1 ORDER BY i.installed_at, i.id`, [roomId])).rows;
  const assets = new Map(rows.map((r) => [r.asset, assetFact({ code: r.asset, category: '', manufacturer: r.manufacturer, model: r.model, serial: r.serial, identity_state: r.identity_state })]));
  return { rows, facts: rows.map(fact), assets };
}
/** The identity triple (position · current unit · identity state) of every position of a room: the one reading every surface shows. */
export async function roomIdentities(q: Queryable, roomId: string, positions: string[]): Promise<Map<string, DeviceIdentity>> {
  const { facts, assets } = await roomInstallations(q, roomId);
  return new Map(positions.map((p) => [p, identityOf(p, facts, assets)]));
}
/** The unit open at each position of a room at an instant (the baseline's publication): installation records are append-only and closed
 *  once, so the as-accepted installation is read back exactly. A position whose record starts later (a migrated room) has none. */
export async function unitsAt(q: Queryable, roomId: string, atIso: string): Promise<Map<string, string>> {
  const r = (await q.query<{ position: string; asset: string }>(`SELECT pa.code AS position, a.code AS asset FROM app.asset_installation i JOIN app.planned_asset pa ON pa.id = i.position_id JOIN app.physical_asset a ON a.id = i.asset_id
    WHERE pa.room_id = $1 AND i.installed_at <= $2::timestamptz AND (i.removed_at IS NULL OR i.removed_at > $2::timestamptz)`, [roomId, atIso])).rows;
  return new Map(r.map((x) => [x.position, x.asset]));
}
const positionFact = (p: PositionRow): PositionFact => ({ code: p.code, category: p.category, label: p.label, model: p.model, furniture: p.furniture });
async function lockPosition(q: Queryable, room: RoomRow, code: string): Promise<PositionRow> {
  const p = (await q.query<PositionRow>('SELECT id, code, room_id, category, label, role, model, generic, furniture, mount, x, y, z, rot, lifecycle, model_history, removed_at FROM app.planned_asset WHERE room_id = $1 AND code = $2 AND removed_at IS NULL FOR UPDATE', [room.id, code])).rows[0];
  if (!p) throw notFound(`position ${code} in ${room.code}`);
  return p;
}
async function openInstallation(q: Queryable, positionId: string): Promise<InstallationRow | null> {
  return (await q.query<InstallationRow>(`${INSTALLATION_SELECT} WHERE i.position_id = $1 AND i.removed_at IS NULL FOR UPDATE OF i`, [positionId])).rows[0] ?? null;
}
/** The unit named by a request: an existing (spare) asset, locked, with its open installation elsewhere; or a new unit to register.
 *  A site-scoped caller sees a unit only through a room in their scope (the same 404 as any unseen record: no position elsewhere is named). */
async function incoming(ctx: RequestContext, q: Queryable, body: { asset?: string; manufacturer?: string; serial?: string }): Promise<{ unit: IncomingUnit; row: AssetRow | null }> {
  if (!body.asset) return { unit: { create: { manufacturer: body.manufacturer ?? null, serial: body.serial ?? null } }, row: null };
  const a = (await q.query<AssetRow>('SELECT * FROM app.physical_asset WHERE code = $1 FOR UPDATE', [body.asset])).rows[0];
  if (!a) throw notFound(`asset ${body.asset}`);
  const elsewhere = (await q.query<InstallationRow & { site_id: string }>(`${INSTALLATION_SELECT} JOIN app.building b ON b.id = r.building_id WHERE i.asset_id = $1 AND i.removed_at IS NULL`.replace('SELECT i.id,', 'SELECT b.site_id, i.id,'), [a.id])).rows[0];
  const s = ctx.p.siteScope;
  if (s && s.length) {
    const seen = (await q.query(`SELECT 1 FROM app.asset_installation i JOIN app.planned_asset pa ON pa.id = i.position_id JOIN app.room r ON r.id = pa.room_id JOIN app.building b ON b.id = r.building_id WHERE i.asset_id = $1 AND b.site_id = ANY($2::uuid[]) LIMIT 1`, [a.id, s])).rowCount;
    if (!seen || (elsewhere && !s.includes(elsewhere.site_id))) throw notFound(`asset ${body.asset}`);
  }
  return { unit: { existing: assetFact(a), openElsewhere: elsewhere ? fact(elsewhere) : null }, row: a };
}
async function currentPlanId(q: Queryable, roomId: string): Promise<string> {
  return (await q.query<{ id: string }>('SELECT id FROM app.cx_plan WHERE room_id = $1 ORDER BY compiled_at DESC, id DESC LIMIT 1', [roomId])).rows[0]?.id || '';
}
async function evidenceRef(q: Queryable, id?: string | null): Promise<string | null> {
  if (!id) return null;
  if (!(await q.query('SELECT 1 FROM app.evidence_object WHERE id = $1', [id])).rowCount) throw notFound(`evidence ${id}`);
  return id;
}
/** A refusal: audited in its own transaction (it survives the rollback), then 409 for a conflict (stale or concurrent) or 422. */
async function refuse(ctx: RequestContext, action: string, room: { code: string }, plan: { conflict: boolean; why: string[] }, detail: Record<string, unknown>): Promise<never> {
  if (!plan.conflict) return ctx.refuse(action, { type: 'Room', id: room.code }, plan.why, detail);
  await ctx.audit(null, action, 'DENIED', { type: 'Room', id: room.code }, { why: plan.why, conflict: true, ...detail });
  throw new ApiError('conflict', plan.why[0]!, plan.why);
}

// ------------------------------------------------------------------------------------------------ writing (inside the caller's transaction)
async function registerUnit(ctx: RequestContext, q: Queryable, category: string, u: { model: string; manufacturer: string | null; serial: string | null; identityState: IdentityState }, origin: 'INSTALLATION_RECORD' | 'REGISTERED'): Promise<{ id: string; code: string }> {
  const code = (await q.query<{ c: string }>("SELECT app.next_code('physical_asset', 'AS-') AS c")).rows[0]!.c;
  const declared = u.identityState !== 'UNKNOWN';
  const r = (await q.query<{ id: string }>(`INSERT INTO app.physical_asset (tenant_id, code, category, manufacturer, model, serial, identity_state, identity_by, identity_at, origin, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,${declared ? 'now()' : 'NULL'},$9,$10) RETURNING id`,
    [ctx.p.tenantId, code, category, u.manufacturer, u.model, u.serial, u.identityState, declared ? ctx.p.personId : null, origin, ctx.p.personId])).rows[0]!;
  if (declared) await q.query('INSERT INTO app.asset_identity_event (tenant_id, asset_id, from_state, to_state, manufacturer, serial, note, actor_id, actor_role, correlation_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
    [ctx.p.tenantId, r.id, 'UNKNOWN', u.identityState, u.manufacturer, u.serial, 'declared when the unit was registered', ctx.p.personId, ctx.p.role, ctx.correlationId]);
  return { id: r.id, code };
}
async function openRow(ctx: RequestContext, q: Queryable, id: string, positionId: string, assetId: string, reason: string, note: string | null, evidenceId: string | null, eventId: string | null): Promise<void> {
  await q.query(`INSERT INTO app.asset_installation (id, tenant_id, position_id, asset_id, effective_basis, install_reason, installed_by, installed_role, install_note, install_evidence_id, install_event_id, correlation_id) VALUES ($1,$2,$3,$4,'RECORDED',$5,$6,$7,$8,$9,$10,$11)`,
    [id, ctx.p.tenantId, positionId, assetId, reason, ctx.p.personId, ctx.p.role, note, evidenceId, eventId, ctx.correlationId]);
}

/**
 * The room's installation is recorded (PLANNED … → INSTALLED_UNVERIFIED): every live, non-furniture position that holds no recorded unit
 * gets a new physical asset of its designed model — identity UNKNOWN, no serial, no maker: nothing is claimed that was not recorded — and
 * an INITIAL installation by the person who records the installation. Positions already installed during INSTALLATION_PENDING keep theirs.
 */
export async function recordRoomInstallation(ctx: RequestContext, q: Queryable, room: RoomRow, rev: number): Promise<number> {
  const empty = (await q.query<PositionRow>(`SELECT pa.* FROM app.planned_asset pa WHERE pa.room_id = $1 AND pa.removed_at IS NULL AND NOT pa.furniture AND NOT EXISTS (SELECT 1 FROM app.asset_installation i WHERE i.position_id = pa.id AND i.removed_at IS NULL) ORDER BY pa.code`, [room.id])).rows;
  const planId = await currentPlanId(q, room.id);
  for (const p of empty) {
    const unit = await registerUnit(ctx, q, p.category, { model: p.model, manufacturer: null, serial: null, identityState: 'UNKNOWN' }, 'INSTALLATION_RECORD');
    const id = crypto.randomUUID();
    const eventId = await ctx.emit(q, 'commission.asset_registered', { type: 'Room', id: room.code, rev }, { planId, assetId: unit.code, status: 'INSTALLED', positionId: p.code, roomId: room.code, installationId: id, identityState: 'UNKNOWN' });
    await openRow(ctx, q, id, p.id, unit.id, 'INITIAL', 'recorded with the room’s installation (identity not yet recorded)', null, eventId);
  }
  if (empty.length) await ctx.audit(q, 'asset.installed', 'ALLOWED', { type: 'Room', id: room.code }, { positions: empty.map((p) => p.code), identityState: 'UNKNOWN', basis: 'RECORDED' });
  return empty.length;
}

/**
 * Apply a replacement plan: close the current installation (once) and open the new one, with a new or a spare unit. Called inside the
 * caller's transaction with the room and the position locked; `eventId` is the outbox event that carries the change.
 */
export async function applyReplacement(ctx: RequestContext, q: Queryable, pos: { id: string; category: string }, plan: ReplacementPlan, spare: AssetRow | null, opts: { note: string | null; evidenceId: string | null; eventId: string | null; installationId?: string }): Promise<{ closed: { installation: string; asset: string; reason: string }; opened: { installation: string; asset: string } }> {
  const unit = spare ? { id: spare.id, code: spare.code } : await registerUnit(ctx, q, pos.category, plan.open, 'REGISTERED');
  const closed = (await q.query<{ id: string }>(`UPDATE app.asset_installation SET removed_at = now(), removal_reason = $2, removed_by = $3, removed_role = $4, removal_note = $5, removal_evidence_id = $6, removal_event_id = $7, removal_correlation_id = $8 WHERE id = $1 AND removed_at IS NULL RETURNING id`,
    [plan.close.installation, plan.close.reason, ctx.p.personId, ctx.p.role, opts.note, opts.evidenceId, opts.eventId, ctx.correlationId])).rows[0];
  if (!closed) throw new ApiError('conflict', `the installation ${plan.close.installation} was closed by someone else meanwhile`);
  if (plan.outgoing === 'RETIRE') await retireRow(ctx, q, plan.close.asset, plan.close.reason === 'REPLACED' ? 'REPLACED' : 'DISPOSED', opts.note);
  const id = opts.installationId || crypto.randomUUID();
  await openRow(ctx, q, id, pos.id, unit.id, plan.open.installReason, opts.note, opts.evidenceId, opts.eventId);
  return { closed: { installation: plan.close.installation, asset: plan.close.asset, reason: plan.close.reason }, opened: { installation: id, asset: unit.code } };
}

/** Retire a unit inside the caller's transaction (its installation already closed): out of the inventory for good, code reserved. */
async function retireRow(ctx: RequestContext, q: Queryable, code: string, reason: RetirementReason, note: string | null): Promise<void> {
  const r = await q.query("UPDATE app.physical_asset SET disposition = 'RETIRED', retired_at = now(), retired_by = $2, retired_role = $3, retirement_reason = $4, retirement_note = $5, retirement_correlation_id = $6 WHERE code = $1 AND disposition = 'IN_SERVICE'",
    [code, ctx.p.personId, ctx.p.role, reason, note ? note.slice(0, 500) : null, ctx.correlationId]);
  if (!r.rowCount) throw new ApiError('conflict', `${code} was retired by someone else meanwhile`);
}

// ------------------------------------------------------------------------------------------------ the endpoints
export interface InstallBody { asset?: string; manufacturer?: string; serial?: string; note?: string; evidenceId?: string }
/** Install a unit at an empty position (INSTALLATION_PENDING or INSTALLED_UNVERIFIED): a spare, or a new unit registered here. */
export async function install(ctx: RequestContext, ref: string, positionCode: string, body: InstallBody) {
  await ctx.require(INSTALL_AUTHORITY, 'install a unit', { type: 'Room', id: ref });
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true);
    const pos = await lockPosition(q, room, positionCode);
    const open = await openInstallation(q, pos.id);
    const inc = await incoming(ctx, q, body);
    const plan = planInstall({ lifecycle: room.lifecycle, position: positionFact(pos), open: open ? fact(open) : null, incoming: inc.unit });
    if (!plan.ok) return refuse(ctx, 'asset.install', room, plan, { position: positionCode, asset: body.asset ?? null });
    const evidenceId = await evidenceRef(q, body.evidenceId);
    const unit = inc.row ? { id: inc.row.id, code: inc.row.code } : await registerUnit(ctx, q, pos.category, plan.plan, 'REGISTERED');
    const rev = await bump(q, room);
    const id = crypto.randomUUID();
    const eventId = await ctx.emit(q, 'commission.asset_registered', { type: 'Room', id: room.code, rev }, { planId: await currentPlanId(q, room.id), assetId: unit.code, status: 'INSTALLED', positionId: pos.code, roomId: room.code, installationId: id, identityState: plan.plan.identityState });
    await openRow(ctx, q, id, pos.id, unit.id, 'INITIAL', body.note ?? null, evidenceId, eventId);
    await ctx.audit(q, 'asset.installed', 'ALLOWED', { type: 'Room', id: room.code }, { position: pos.code, asset: unit.code, installationId: id, identityState: plan.plan.identityState });
    return { position: pos.code, asset: unit.code, installation: id, identityState: plan.plan.identityState };
  });
}

export interface ReplaceBody { expectedInstallation: string; reason: string; asset?: string; manufacturer?: string; serial?: string; evidenceId?: string; /** the unit taken out: RETIRE (default) or SPARE */ outgoing?: 'RETIRE' | 'SPARE' }
/**
 * Replace the unit at a position like for like (another unit of the same model), atomically: lock the room and the position, close the
 * old installation, open the new one, write the outbox event and the audit row. The tests the change reopens follow from the
 * installation record itself (`rooms.reverificationNow`): nothing to invalidate separately, so a rolled-back replacement reopens nothing.
 * A different model is a design change: `PATCH /v1/rooms/:room/devices/:asset` (room.design) substitutes it through the same transaction.
 */
export async function replace(ctx: RequestContext, ref: string, positionCode: string, body: ReplaceBody) {
  await ctx.require(INSTALL_AUTHORITY, 'replace a unit', { type: 'Room', id: ref });
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true);
    const pos = await lockPosition(q, room, positionCode);
    const open = await openInstallation(q, pos.id);
    const inc = await incoming(ctx, q, body);
    const recom = await recommissioning(q, room);
    const plan = planReplacement({ lifecycle: room.lifecycle, recommissioning: !!recom, position: positionFact(pos), open: open ? fact(open) : null, expected: body.expectedInstallation, model: inc.row ? inc.row.model : pos.model, incoming: inc.unit, outgoing: body.outgoing });
    if (!plan.ok) return refuse(ctx, 'commission.asset_replaced', room, plan, { position: positionCode, expected: body.expectedInstallation, asset: body.asset ?? null });
    if (plan.plan.kind !== 'REPLACEMENT') return refuse(ctx, 'commission.asset_replaced', room, { conflict: false, why: [`${inc.row?.code} is a ${inc.row?.model}; ${pos.code} is designed for a ${pos.model}: a different model is a design change — substitute it with PATCH /v1/rooms/${room.code}/devices/${pos.code} (room.design)`] }, { position: positionCode });
    const evidenceId = await evidenceRef(q, body.evidenceId);
    const rev = await bump(q, room);
    // the tests the change reopens, by the shared rule on the room's current plan (the same rule as a model substitution)
    const label = pos.label; const fromAsset = open!.asset;
    const planId = await currentPlanId(q, room.id);
    const rows = (await q.query<{ test_id: string; domain: string; devices: string[] }>('SELECT test_id, domain, devices FROM app.cx_plan_row WHERE plan_id = $1 AND applicable ORDER BY phase, tier, test_id', [planId])).rows;
    const installationId = crypto.randomUUID();
    const toAsset = inc.row ? inc.row.code : '(new unit)';
    const affected = reopenedBySubstitution(rows.map((r) => ({ testId: r.test_id, domain: r.domain, devices: r.devices })), [{ assetId: pos.code, label, category: pos.category, from: fromAsset, to: toAsset, kind: 'REPLACED', model: pos.model }]).map((t) => t.testId);
    const eventId = await ctx.emit(q, 'commission.asset_replaced', { type: 'Room', id: room.code, rev }, { planId: planId || 'NO_PLAN', assetId: pos.code, affected, roomId: room.code, kind: 'REPLACED', fromAsset, installationId, closedInstallation: open!.id, model: pos.model, baselineVersion: recom?.version ?? null, reason: body.reason });
    const r = await applyReplacement(ctx, q, pos, plan.plan, inc.row, { note: body.reason, evidenceId, eventId, installationId });
    failpoint('installation.replace:after-records');
    await ctx.audit(q, 'commission.asset_replaced', 'ALLOWED', { type: 'Room', id: room.code }, { position: pos.code, kind: 'REPLACED', fromAsset, toAsset: r.opened.asset, closedInstallation: r.closed.installation, installation: r.opened.installation, model: pos.model, affected, baselineVersion: recom?.version ?? null, reason: body.reason });
    failpoint('installation.replace:after-audit');
    return { position: pos.code, kind: 'REPLACEMENT', closed: r.closed, installed: { ...r.opened, model: pos.model, identityState: plan.plan.open.identityState }, reverification: affected, current: { position: pos.code, asset: r.opened.asset, identityState: plan.plan.open.identityState } };
  });
}

/** Plan a model substitution of a position's unit inside rooms.changeDevice (the PATCH), under the same rules as a replacement. */
export async function planSubstitution(ctx: RequestContext, q: Queryable, room: RoomRow, positionCode: string, model: string, body: { expectedInstallation?: string; asset?: string; outgoing?: 'RETIRE' | 'SPARE' }) {
  const pos = await lockPosition(q, room, positionCode);
  const open = await openInstallation(q, pos.id);
  const inc = await incoming(ctx, q, { asset: body.asset });
  const plan = planReplacement({ lifecycle: room.lifecycle, recommissioning: true, position: positionFact(pos), open: open ? fact(open) : null, expected: body.expectedInstallation ?? null, model, incoming: inc.unit, outgoing: body.outgoing });
  if (!plan.ok) return refuse(ctx, 'room.device_swapped', room, plan, { position: positionCode, model });
  return { pos, open: open!, plan: plan.plan, spare: inc.row };
}

/** A position's history: its design (the model it was designed with and every substitution, across the revisions) kept apart from its
 *  installation timeline (which unit occupied it, from when to when, why, by whom, with what evidence). */
export async function positionHistory(ctx: RequestContext, ref: string, positionCode: string) {
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref);
    const p = (await q.query<PositionRow & { props: unknown; created_at: string }>('SELECT * FROM app.planned_asset WHERE room_id = $1 AND code = $2', [room.id, positionCode])).rows[0];
    if (!p) throw notFound(`position ${positionCode} in ${room.code}`);
    const revs = (await q.query<{ rev_no: number; created_at: string; created_by: string; device: { model: string; cat: string; x: number; y: number; mount: string } | null }>(`SELECT rev_no, created_at, created_by, (SELECT d FROM jsonb_array_elements(snapshot->'devices') d WHERE d->>'id' = $2 LIMIT 1) AS device FROM app.room_revision WHERE room_id = $1 ORDER BY rev_no`, [room.id, positionCode])).rows;
    const rows = (await q.query<InstallationRow>(`${INSTALLATION_SELECT} WHERE i.position_id = $1 ORDER BY i.installed_at, i.id`, [p.id])).rows;
    const facts = rows.map(fact);
    const cur = rows.find((r) => !r.removed_at);
    return {
      position: { code: p.code, room: room.code, label: p.label, category: p.category, role: p.role, model: p.model, generic: p.generic, mount: p.mount, x: Number(p.x), y: Number(p.y), z: Number(p.z), rot: Number(p.rot), lifecycle: p.lifecycle, removedAt: p.removed_at, createdAt: p.created_at },
      design: { model: p.model, modelHistory: p.model_history, revisions: revs.map((r) => ({ revision: r.rev_no, at: r.created_at, by: r.created_by, model: r.device?.model ?? null, category: r.device?.cat ?? null, inRevision: !!r.device })) },
      installations: rows.map((r, i) => ({ ...installationView(r), sentence: installationSentence(facts[i]!) })),
      current: { position: p.code, asset: cur?.asset ?? null, identityState: cur?.identity_state ?? null },
      note: 'the design history (model substitutions) belongs to the position; the installation timeline names the physical units that occupied it — each unit keeps its own history (GET /v1/assets/{asset}/history)',
    };
  });
}
const installationView = (r: InstallationRow) => ({ id: r.id, position: r.position, room: r.room, asset: r.asset, model: r.model, installedAt: r.installed_at, basis: r.effective_basis, installReason: r.install_reason, installedBy: r.installed_by, installedRole: r.installed_role, note: r.install_note, evidenceId: r.install_evidence_id, eventId: r.install_event_id, correlationId: r.correlation_id,
  removedAt: r.removed_at, removalReason: r.removal_reason, removedBy: r.removed_by, removedRole: r.removed_role, removalNote: r.removal_note, removalEvidenceId: r.removal_evidence_id, removalEventId: r.removal_event_id, removalCorrelationId: r.removal_correlation_id });

/** The asset (and its installations) visible to the caller: through a room in the caller's site scope, or a spare when unscoped. */
async function visibleAsset(ctx: RequestContext, q: Queryable, code: string, lock = false): Promise<{ asset: AssetRow; rows: InstallationRow[] }> {
  const a = (await q.query<AssetRow>(`SELECT * FROM app.physical_asset WHERE code = $1${lock ? ' FOR UPDATE' : ''}`, [code])).rows[0];
  if (!a) throw notFound(`asset ${code}`);
  const s = ctx.p.siteScope;
  const rows = (await q.query<InstallationRow>(`${INSTALLATION_SELECT} JOIN app.building b ON b.id = r.building_id WHERE i.asset_id = $1${s && s.length ? ' AND b.site_id = ANY($2::uuid[])' : ''} ORDER BY i.installed_at, i.id`, s && s.length ? [a.id, s] : [a.id])).rows;
  if (s && s.length && !rows.length) throw notFound(`asset ${code}`);
  return { asset: a, rows };
}

/** A unit's history: its identity changes and its installations across positions and rooms — it follows the unit when it moves. */
export async function assetHistory(ctx: RequestContext, code: string) {
  return ctx.tx(async (q) => {
    const { asset: a, rows } = await visibleAsset(ctx, q, code);
    const ev = (await q.query<Record<string, unknown>>('SELECT from_state, to_state, manufacturer, serial, evidence_id, note, actor_id, actor_role, correlation_id, at FROM app.asset_identity_event WHERE asset_id = $1 ORDER BY id', [a.id])).rows;
    const cur = rows.find((r) => !r.removed_at);
    return {
      asset: { code: a.code, category: a.category, manufacturer: a.manufacturer, model: a.model, serial: a.serial, identityState: a.identity_state, identityEvidenceId: a.identity_evidence_id, origin: a.origin, createdAt: a.created_at, createdBy: a.created_by,
        disposition: a.disposition || 'IN_SERVICE', retired: a.retired_at ? { at: a.retired_at, by: a.retired_by, byRole: a.retired_role, reason: a.retirement_reason, note: a.retirement_note } : null },
      identity: ev.map((e) => ({ from: e['from_state'], to: e['to_state'], serial: e['serial'], manufacturer: e['manufacturer'], evidenceId: e['evidence_id'], note: e['note'], by: e['actor_id'], byRole: e['actor_role'], correlationId: e['correlation_id'], at: e['at'] })),
      installations: rows.map((r) => ({ ...installationView(r), roomName: r.room_name, sentence: installationSentence(fact(r)) })),
      register: (await q.query<EntryRow>('SELECT asset_id, version, hostname, host(ip) AS ip, mac::text AS mac, firmware, location, recorded_by, recorded_role, recorded_at FROM app.asset_register_entry WHERE asset_id = $1 ORDER BY version', [a.id])).rows.map((e) => ({ version: e.version, hostname: e.hostname, ip: e.ip, mac: e.mac, firmware: e.firmware, location: e.location, by: e.recorded_by, byRole: e.recorded_role, at: e.recorded_at })),
      current: cur ? { position: cur.position, room: cur.room, installation: cur.id, since: cur.installed_at } : null,
      note: a.origin === 'MIGRATED' ? 'registered by migration 0026 from a position that was already installed: the serial, the maker and the installation date were not on record and are not claimed' : null,
    };
  });
}

export interface IdentityBody { state: string; serial?: string; manufacturer?: string; evidenceId?: string; note?: string }
/** Record what is known of a unit's identity: DECLARED (with a serial), OBSERVED (with evidence), VERIFIED (with evidence, by a
 *  verification authority, never by the person who declared or observed it). It only moves forward; a recorded serial is final. */
export async function recordIdentity(ctx: RequestContext, code: string, body: IdentityBody) {
  if (!(IDENTITY_STATES as readonly string[]).includes(body.state) || body.state === 'UNKNOWN') throw invalid('state is DECLARED, OBSERVED or VERIFIED');
  await ctx.require(body.state === 'VERIFIED' ? VERIFY_AUTHORITIES : IDENTITY_RECORD_AUTHORITIES, `record a unit's identity as ${body.state}`, { type: 'PhysicalAsset', id: code });
  return ctx.tx(async (q) => {
    const { asset: a, rows } = await visibleAsset(ctx, q, code, true);
    const prior = (await q.query<{ actor_id: string }>('SELECT actor_id FROM app.asset_identity_event WHERE asset_id = $1', [a.id])).rows.map((r) => r.actor_id);
    const plan = planIdentity(assetFact(a), body.state, { serial: body.serial, manufacturer: body.manufacturer, evidence: body.evidenceId, actor: ctx.p.personId, priorActors: prior });
    if (!plan.ok) return ctx.refuse('asset.identity_recorded', { type: 'PhysicalAsset', id: a.code }, plan.why, { state: body.state });
    const evidenceId = await evidenceRef(q, plan.plan.evidence);
    // the serial is unique per tenant, maker and model: a duplicate is another unit's identity (23505 → 409 from the database)
    await q.query('UPDATE app.physical_asset SET identity_state = $2, serial = $3, manufacturer = $4, identity_evidence_id = coalesce($5, identity_evidence_id), identity_by = $6, identity_at = now() WHERE id = $1', [a.id, plan.plan.to, plan.plan.serial, plan.plan.manufacturer, evidenceId, ctx.p.personId]);
    await q.query('INSERT INTO app.asset_identity_event (tenant_id, asset_id, from_state, to_state, manufacturer, serial, evidence_id, note, actor_id, actor_role, correlation_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
      [ctx.p.tenantId, a.id, plan.plan.from, plan.plan.to, plan.plan.manufacturer, plan.plan.serial, evidenceId, body.note ?? null, ctx.p.personId, ctx.p.role, ctx.correlationId]);
    const cur = rows.find((r) => !r.removed_at);
    if (cur) {   // an installed unit's identity is a room fact: it travels through the outbox with the room it is in
      const room = await findRoom(ctx, q, cur.room);
      await ctx.emit(q, 'commission.asset_registered', { type: 'Room', id: room.code, rev: room.rev }, { planId: (await currentPlanId(q, room.id)) || 'NO_PLAN', assetId: a.code, status: `IDENTITY_${plan.plan.to}`, positionId: cur.position, roomId: room.code, identityState: plan.plan.to });
    }
    await ctx.audit(q, 'asset.identity_recorded', 'ALLOWED', { type: 'PhysicalAsset', id: a.code }, { from: plan.plan.from, to: plan.plan.to, serial: plan.plan.serial, manufacturer: plan.plan.manufacturer, evidenceId, position: cur?.position ?? null, room: cur?.room ?? null });
    return { asset: a.code, from: plan.plan.from, identityState: plan.plan.to, serial: plan.plan.serial, manufacturer: plan.plan.manufacturer, evidenceId };
  });
}

export interface RetireBody { reason: string; note?: string }
/** Retire a unit that is not installed (a spare that failed, was disposed of or returned): out of the inventory for good. Its code is
 *  never issued again and its history (identity, every installation, the retirement) stays readable. */
export async function retire(ctx: RequestContext, code: string, body: RetireBody) {
  await ctx.require(INSTALL_AUTHORITY, 'retire a unit', { type: 'PhysicalAsset', id: code });
  return ctx.tx(async (q) => {
    const { asset: a, rows } = await visibleAsset(ctx, q, code, true);
    const cur = rows.find((r) => !r.removed_at);
    const plan = planRetirement(assetFact(a), cur ? fact(cur) : null, body?.reason, body?.note);
    if (!plan.ok) { if (plan.conflict) throw new ApiError('conflict', plan.why[0]!, plan.why); return ctx.refuse('asset.retired', { type: 'PhysicalAsset', id: a.code }, plan.why, { reason: body?.reason ?? null }); }
    await retireRow(ctx, q, a.code, plan.plan.reason, plan.plan.note);
    await ctx.audit(q, 'asset.retired', 'ALLOWED', { type: 'PhysicalAsset', id: a.code }, { reason: plan.plan.reason, note: plan.plan.note, model: a.model, serial: a.serial });
    return { asset: a.code, disposition: 'RETIRED', reason: plan.plan.reason, note: plan.plan.note, codeReserved: true };
  });
}

/** The inventory the caller may see: units in service (installed), spares, and the retired register — every code on record, none reused. */
export async function inventory(ctx: RequestContext) {
  return ctx.tx(async (q) => {
    const s = ctx.p.siteScope;
    const assets = (await q.query<AssetRow>('SELECT * FROM app.physical_asset ORDER BY code')).rows;
    const rows = (await q.query<InstallationRow & { site_id: string }>(`${INSTALLATION_SELECT.replace('SELECT i.id,', 'SELECT b.site_id, i.id,')} JOIN app.building b ON b.id = r.building_id ORDER BY i.installed_at, i.id`)).rows;
    // a site-scoped caller sees a unit only through a room in their scope (as everywhere): units never installed in scope are not listed
    const seen = s && s.length ? new Set(rows.filter((r) => s.includes(r.site_id)).map((r) => r.asset)) : null;
    const visible = assets.filter((a) => !seen || seen.has(a.code));
    const inv = inventoryOf(visible.map(assetFact), rows.filter((r) => !seen || seen.has(r.asset)).map(fact));
    const view = (r: (typeof inv.inService)[number]) => ({ asset: r.asset.code, category: r.asset.category, model: r.asset.model, manufacturer: r.asset.manufacturer, serial: r.asset.serial, identityState: r.asset.identityState, position: r.position, installedAt: r.installedAt, placements: r.placements, retired: r.asset.retired ?? null });
    return { inService: inv.inService.map(view), spares: inv.spares.map(view), retired: inv.retired.map(view),
      counts: { inService: inv.inService.length, spares: inv.spares.length, retired: inv.retired.length },
      note: 'a retired unit is out of the inventory for good: it is never installed again, and its code is never issued to another unit; its history stays readable (GET /v1/assets/{asset}/history)' };
  });
}

// ------------------------------------------------------------------------------------------------ the device register (0031)
const networked = (category: string) => !!(defaultCatalog.categories as Record<string, { net?: boolean }>)[category]?.net;
interface EntryRow { asset_id: string; version: number; hostname: string | null; ip: string | null; mac: string | null; firmware: string | null; location: string | null; recorded_by: string; recorded_role: string; recorded_at: string }
const ENTRY_SELECT = 'SELECT DISTINCT ON (asset_id) asset_id, version, hostname, host(ip) AS ip, mac::text AS mac, firmware, location, recorded_by, recorded_role, recorded_at FROM app.asset_register_entry';
const entryOf = (r: EntryRow | undefined): RegisterEntry | null => (r ? { hostname: r.hostname, ip: r.ip, mac: r.mac, firmware: r.firmware, location: r.location } : null);

export interface RegisterBody { hostname?: string | null; ip?: string | null; mac?: string | null; firmware?: string | null; location?: string | null }
/** Record what the installation team read on site about a unit (a new version of its register row; the newest is current). */
export async function recordRegister(ctx: RequestContext, code: string, body: RegisterBody) {
  await ctx.require(IDENTITY_RECORD_AUTHORITIES, 'record a unit in the device register', { type: 'PhysicalAsset', id: code });
  return ctx.tx(async (q) => {
    const { asset: a } = await visibleAsset(ctx, q, code, true);
    const cur = (await q.query<EntryRow>(`${ENTRY_SELECT} WHERE asset_id = $1 ORDER BY asset_id, version DESC`, [a.id])).rows[0];
    const plan = planRegisterEntry(assetFact(a), networked(a.category), entryOf(cur), body || {});
    if (!plan.ok) return ctx.refuse('asset.register_recorded', { type: 'PhysicalAsset', id: a.code }, plan.why, { fields: Object.keys(body || {}) });
    const e = plan.plan;
    // another unit in service whose current entry carries the same hostname, address or MAC: one value, one unit
    const clash = (await q.query<{ code: string; what: string }>(`SELECT a.code, CASE WHEN lower(e.hostname) = lower($2) THEN 'hostname ' || e.hostname WHEN host(e.ip) = $3 THEN 'address ' || host(e.ip) ELSE 'MAC ' || e.mac::text END AS what
      FROM (${ENTRY_SELECT} ORDER BY asset_id, version DESC) e JOIN app.physical_asset a ON a.id = e.asset_id
      WHERE e.asset_id <> $1 AND a.disposition = 'IN_SERVICE' AND ((e.hostname IS NOT NULL AND lower(e.hostname) = lower($2)) OR (e.ip IS NOT NULL AND host(e.ip) = $3) OR (e.mac IS NOT NULL AND e.mac = $4)) LIMIT 1`.replace('host(ip) AS ip, mac::text AS mac', 'ip, mac'),
      [a.id, e.hostname, e.ip, e.mac])).rows[0];
    if (clash) { await ctx.audit(null, 'asset.register_recorded', 'DENIED', { type: 'PhysicalAsset', id: a.code }, { why: [`${clash.what} is already current on ${clash.code}`] }); throw new ApiError('conflict', `${clash.what} is already current on ${clash.code}: one value, one unit`); }
    const version = (cur?.version ?? 0) + 1;
    await q.query('INSERT INTO app.asset_register_entry (tenant_id, asset_id, version, hostname, ip, mac, firmware, location, recorded_by, recorded_role, correlation_id) VALUES ($1,$2,$3,$4,$5::inet,$6::macaddr,$7,$8,$9,$10,$11)',
      [ctx.p.tenantId, a.id, version, e.hostname, e.ip, e.mac, e.firmware, e.location, ctx.p.personId, ctx.p.role, ctx.correlationId]);
    await ctx.audit(q, 'asset.register_recorded', 'ALLOWED', { type: 'PhysicalAsset', id: a.code }, { version, ...e });
    return { asset: a.code, version, ...e, networked: networked(a.category) };
  });
}

/** A room's device register: every live, non-furniture position with the unit installed there, its identity and its current register
 *  row, what each still needs (serial; hostname and IP when networked), and the totals the commissioning page and phase 1 read. */
export async function roomRegister(ctx: RequestContext, ref: string) {
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref);
    const pos = (await q.query<PositionRow>('SELECT id, code, room_id, category, label, role, model, generic, furniture, mount, x, y, z, rot, lifecycle, model_history, removed_at FROM app.planned_asset WHERE room_id = $1 AND removed_at IS NULL AND NOT furniture ORDER BY code', [room.id])).rows;
    const { rows } = await roomInstallations(q, room.id);
    const open = new Map(rows.filter((r) => !r.removed_at).map((r) => [r.position, r]));
    const assetIds = [...open.values()].map((r) => r.asset_id);
    const entries = assetIds.length ? new Map((await q.query<EntryRow>(`${ENTRY_SELECT} WHERE asset_id = ANY($1::uuid[]) ORDER BY asset_id, version DESC`, [assetIds])).rows.map((e) => [e.asset_id, e])) : new Map<string, EntryRow>();
    const items = pos.map((p) => {
      const i = open.get(p.code); const net = networked(p.category); const e = i ? entries.get(i.asset_id) : undefined;
      const a: AssetFact | null = i ? { code: i.asset, category: p.category, manufacturer: i.manufacturer, model: i.model, serial: i.serial, identityState: i.identity_state } : null;
      const missing = registerMissing(a, net, entryOf(e));
      return { position: p.code, label: p.label, category: p.category, networked: net, asset: i?.asset ?? null, serial: i?.serial ?? null, identityState: i?.identity_state ?? null,
        entry: e ? { version: e.version, hostname: e.hostname, ip: e.ip, mac: e.mac, firmware: e.firmware, location: e.location, recordedRole: e.recorded_role, recordedAt: e.recorded_at } : null, missing, complete: !missing.length };
    });
    const done = items.filter((x) => x.complete).length;
    return { room: room.code, items, totals: { devices: items.length, complete: done, networked: items.filter((x) => x.networked).length, pct: items.length ? Math.round((done / items.length) * 100) : 100 },
      rule: 'every unit needs its serial (recorded on its identity); a networked unit also needs a hostname and an IP address (v1.3)' };
  });
}

export type { UnitChange };
