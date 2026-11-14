/**
 * The room domain service: the vertical slice from room creation to the commissioning plan, with every rule enforced on the server.
 *
 * Every mutation: authority check → lock the room row (FOR UPDATE) → lifecycle check → change → bump rev → audit row → outbox event
 * → re-analysis (classification, design checks → issues, drawing staleness, 94-definition applicability) — all in ONE transaction.
 * The rules themselves are @empathia/commissioning-engine, the same code that reproduces the demonstrator on 92 golden cases.
 */
import crypto from 'node:crypto';
import {
  analyzeRoom, polygonCheck, outlineFor, parseLength, templateDevices, newDevice, proposeConnections, drawingInput, DRAWING_KINDS,
  lifecycleBlockers, LIFECYCLE_AUTHORITY, defaultCatalog, area, ENGINE_VERSION, rerunTask, identityOf, revisionApprovalBlockers, designBindingTask, REVISION_APPROVAL,
  type ChangeKind, type UnitChange, type DesignBinding, type DesignSnapshot, type RevisionBinding, type DesignEdit,
} from '@empathia/commissioning-engine';
import type { Connection, PlannedDevice, RecordedResult, RoomDesignInput, RoomLifecycle } from '@empathia/domain-types';
import { ROOM_LIFECYCLE } from '@empathia/domain-types';
import { asJson, type Queryable } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import { publish as publishBaseline } from './baselines.js';
import { ApiError, notFound, refused, invalid } from '../http/errors.js';
import { applyReplacement, planSubstitution, recordRoomInstallation, roomInstallations, failpoint } from './installations.js';
import { substitutionsFrom, changesFrom, reverificationFrom, gateFacts, revisionBindingFrom, designBindingFact, type Substitution, type Reverification, type Change } from './reverification.js';
import { designEditFor, patchEdit } from './design-edits.js';
export type { Substitution, Reverification };

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const C = defaultCatalog;

// ------------------------------------------------------------------------------------------------ loading a design
export interface RoomRow {
  id: string; tenant_id: string; building_id: string; code: string; name: string; floor: number; template: string; intended_use: string; occupancy: number;
  unit: string; geometry: RoomDesignInput['geometry']; lifecycle: RoomLifecycle; classification: Record<string, unknown> | null; approved_class: Record<string, unknown> | null;
  rev: number; approved_revision: number | null; baseline: unknown; created_at: string; updated_at: string; site_id?: string;
}
interface AssetRow { id: string; code: string; category: string; label: string; role: string; model: string; generic: boolean; furniture: boolean; x: string; y: string; z: string; rot: string; mount: string; props: Record<string, unknown>; model_history: unknown[]; lifecycle: string }
interface ConnRow { id: string; code: string; from_code: string; to_code: string; kind: string; why: string }

export interface Loaded { room: RoomRow; assets: AssetRow[]; conns: ConnRow[]; results: Record<string, RecordedResult>; input: RoomDesignInput }

/** Site scope: a member scoped to some sites sees only rooms in buildings of those sites (404 otherwise, never 403: no existence leak). */
function scopeClause(ctx: RequestContext, alias = 'b'): { sql: string; args: unknown[] } {
  const s = ctx.p.siteScope; return s && s.length ? { sql: ` AND ${alias}.site_id = ANY($SCOPE::uuid[])`, args: [s] } : { sql: '', args: [] };
}

export async function findRoom(ctx: RequestContext, q: Queryable, ref: string, lock = false): Promise<RoomRow> {
  const sc = scopeClause(ctx);
  const byId = /^[0-9a-f-]{36}$/i.test(ref);
  const sql = `SELECT r.*, b.site_id FROM app.room r JOIN app.building b ON b.id = r.building_id AND b.tenant_id = r.tenant_id WHERE ${byId ? 'r.id = $1' : 'r.code = $1'}${sc.sql.replace('$SCOPE', '$2')}${lock ? ' FOR UPDATE OF r' : ''}`;
  const r = await q.query<RoomRow>(sql, [ref, ...sc.args]);
  if (!r.rows[0]) throw notFound(`room ${ref}`);
  return r.rows[0];
}

export async function load(ctx: RequestContext, q: Queryable, ref: string, lock = false): Promise<Loaded> {
  const room = await findRoom(ctx, q, ref, lock);
  const assets = (await q.query<AssetRow>('SELECT id, code, category, label, role, model, generic, furniture, x, y, z, rot, mount, props, model_history, lifecycle FROM app.planned_asset WHERE room_id = $1 AND removed_at IS NULL ORDER BY code', [room.id])).rows;
  const conns = (await q.query<ConnRow>(`SELECT c.id, c.code, fa.code AS from_code, ta.code AS to_code, c.kind, c.why FROM app.connection c JOIN app.planned_asset fa ON fa.id = c.from_asset JOIN app.planned_asset ta ON ta.id = c.to_asset WHERE c.room_id = $1 AND c.removed_at IS NULL ORDER BY c.created_at, c.code`, [room.id])).rows;
  const res = (await q.query<{ test_id: string; state: string; evidence_kind: string; evidence_id: string; recorded_by: string; verified_by: string | null }>('SELECT test_id, state, evidence_kind, evidence_id, recorded_by, verified_by FROM app.current_result WHERE room_id = $1', [room.id])).rows;
  const results: Record<string, RecordedResult> = Object.fromEntries(res.map((r) => [r.test_id, { state: r.state as RecordedResult['state'], evidence: { kind: r.evidence_kind, ref: r.evidence_id }, by: r.recorded_by, verified: r.verified_by ? { by: r.verified_by } : null }]));
  const devices: PlannedDevice[] = assets.map((a) => ({ id: a.code, cat: a.category, label: a.label, role: a.role, model: a.model, generic: a.generic, brand: null, modelName: a.generic ? null : a.model, x: Number(a.x), y: Number(a.y), z: Number(a.z), rot: Number(a.rot), mount: a.mount, props: a.props, furniture: a.furniture, lifecycle: a.lifecycle }));
  const connections: Connection[] = conns.map((c) => ({ id: c.code, from: c.from_code, to: c.to_code, kind: c.kind, why: c.why }));
  const input: RoomDesignInput = { template: room.template, intendedUse: room.intended_use, occupancy: room.occupancy, lifecycle: room.lifecycle, coreRoomId: room.code, geometry: room.geometry, devices, connections, classification: { approved: (room.approved_class as never) || null }, results };
  return { room, assets, conns, results, input };
}

// ------------------------------------------------------------------------------------------------ analysis (one transaction)
interface DrawingState { kind: string; state: 'DRAFT' | 'GENERATED' | 'APPROVED' | 'REVIEW_REQUIRED'; revNo: number | null; approvedBy: string | null; currentInput: string; approvedInput: string | null }

export async function drawingStates(q: Queryable, L: Loaded): Promise<DrawingState[]> {
  const rows = (await q.query<{ kind: string; rev_no: number; input_sha256: string; state: string; approved_by: string | null }>(`SELECT DISTINCT ON (kind) kind, rev_no, input_sha256, state, approved_by FROM app.drawing_revision WHERE room_id = $1 ORDER BY kind, rev_no DESC`, [L.room.id])).rows;
  const by = new Map(rows.map((r) => [r.kind, r]));
  const cls = { approved: L.room.approved_class as never, suggested: L.room.classification as never };
  return Object.keys(DRAWING_KINDS).map((kind) => {
    const cur = sha256(drawingInput({ ...L.input, classification: cls }, kind)); const r = by.get(kind);
    if (!r) return { kind, state: 'DRAFT', revNo: null, approvedBy: null, currentInput: cur, approvedInput: null };
    const st = r.input_sha256 !== cur ? 'REVIEW_REQUIRED' : (r.state as DrawingState['state']);
    return { kind, state: st, revNo: r.rev_no, approvedBy: r.approved_by, currentInput: cur, approvedInput: r.state === 'APPROVED' ? r.input_sha256 : null };
  });
}

/** Re-run every dependent analysis and persist what changed. Returns a short summary for the response and the audit. */
export async function analyze(ctx: RequestContext, q: Queryable, roomId: string, trigger: string): Promise<{ applicable: number; openIssues: number; planChanged: boolean }> {
  const L = await load(ctx, q, roomId);
  const a = analyzeRoom(L.input, C);
  // classification: the suggestion is stored; an approval that no longer matches (and was not an override) goes stale
  let approved = L.room.approved_class as ({ archetype: string | null; override: boolean; stale?: boolean } & Record<string, unknown>) | null;
  if (approved && approved.archetype !== a.classification.archetype && !approved.override && !approved.stale) approved = { ...approved, stale: true };
  await q.query('UPDATE app.room SET classification = $2, approved_class = $3 WHERE id = $1', [L.room.id, a.classification, approved]);

  // design checks + drawing disagreements → issues (one per correlation key)
  const dstates = await drawingStates(q, L);
  const drawingFindings = dstates.filter((d) => d.state === 'REVIEW_REQUIRED' && d.approvedInput && ['schedule', 'placement'].includes(d.kind)).map((d) => ({
    key: `drawing-disagreement:${d.kind}`, category: 'DESIGN_DEFICIENCY' as const, check: 'drawing_schedule_disagreement', severity: 'Medium' as const,
    rationale: `the approved ${DRAWING_KINDS[d.kind]!.toLowerCase()} no longer matches the design`, title: `Approved ${DRAWING_KINDS[d.kind]!.toLowerCase()} disagrees with the design`, assets: [], source: 'Drawing Intelligence: revision check', action: 'regenerate and re-approve the drawing',
  }));
  const findings = [...a.checks, ...drawingFindings];
  const revNo = (await q.query<{ n: number }>('SELECT coalesce(max(rev_no), 0) AS n FROM app.room_revision WHERE room_id = $1', [L.room.id])).rows[0]!.n;
  const existing = (await q.query<{ id: string; code: string; key: string; state: string; severity: string; category: string }>('SELECT id, code, key, state, severity, category FROM app.room_issue WHERE room_id = $1', [L.room.id])).rows;
  const ex = new Map(existing.map((i) => [i.key, i]));
  const live = new Set(findings.map((f) => f.key));
  for (const f of findings) {
    const i = ex.get(f.key);
    if (!i) {
      const code = (await q.query<{ c: string }>("SELECT app.next_code('issue', 'RISS-') AS c")).rows[0]!.c;
      const ins = await q.query<{ id: string }>(`INSERT INTO app.room_issue (tenant_id, room_id, code, key, category, check_name, severity, title, rationale, assets, first_seen_rev, last_seen_rev) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) RETURNING id`,
        [ctx.p.tenantId, L.room.id, code, f.key, f.category, f.check, f.severity, f.title, f.rationale, f.assets, revNo]);
      await q.query('INSERT INTO app.issue_event (tenant_id, issue_id, kind, detail, actor_id) VALUES ($1,$2,$3,$4,$5)', [ctx.p.tenantId, ins.rows[0]!.id, 'created', { source: f.source, rationale: f.rationale, revision: revNo, trigger }, ctx.p.personId]);
      await relate(ctx, q, { type: 'RoomIssue', id: code }, 'AFFECTS', { type: 'Room', id: L.room.code }, 'MODELED');
      for (const asset of f.assets) await relate(ctx, q, { type: 'RoomIssue', id: code }, 'ISSUE_ON', { type: 'PlannedAsset', id: asset }, 'MODELED');
      await ctx.emit(q, 'deficiency.identified', { type: 'RoomIssue', id: code, rev: 1 }, { issueId: code, key: f.key, designId: L.room.code, roomId: L.room.code, category: f.category, severity: f.severity });
      await ctx.emit(q, 'issue.created_or_updated', { type: 'RoomIssue', id: code, rev: 1 }, { issueId: code, status: 'OPEN', change: 'created', roomId: L.room.code });
    } else if (i.state === 'RESOLVED') {
      await q.query(`UPDATE app.room_issue SET state = 'OPEN', resolution = NULL, severity = $2, last_seen_rev = $3 WHERE id = $1`, [i.id, f.severity, revNo]);
      await q.query('INSERT INTO app.issue_event (tenant_id, issue_id, kind, detail, actor_id) VALUES ($1,$2,$3,$4,$5)', [ctx.p.tenantId, i.id, 'reopened', { rationale: f.rationale, revision: revNo, trigger }, ctx.p.personId]);
      await ctx.emit(q, 'issue.created_or_updated', { type: 'RoomIssue', id: i.code, rev: 2 }, { issueId: i.code, status: 'OPEN', change: 'reopened', roomId: L.room.code });
    } else if (i.severity !== f.severity) {
      await q.query('UPDATE app.room_issue SET severity = $2, last_seen_rev = $3 WHERE id = $1', [i.id, f.severity, revNo]);
    }
  }
  for (const i of existing) {
    if (i.state === 'OPEN' && i.category === 'DESIGN_DEFICIENCY' && !live.has(i.key)) {
      const resolution = { at: new Date().toISOString(), by: ctx.p.personId, byRole: ctx.p.role, revision: revNo, how: `the design check no longer fires after: ${trigger}`, verification: 'design re-analysis on every change; an engineer reviews the next saved revision' };
      await q.query("SELECT set_config('app.issue_resolution', 'design_check', true)");
      await q.query(`UPDATE app.room_issue SET state = 'RESOLVED', resolution = $2 WHERE id = $1`, [i.id, resolution]);
      await q.query('INSERT INTO app.issue_event (tenant_id, issue_id, kind, detail, actor_id) VALUES ($1,$2,$3,$4,$5)', [ctx.p.tenantId, i.id, 'resolved', resolution, ctx.p.personId]);
      await ctx.emit(q, 'issue.created_or_updated', { type: 'RoomIssue', id: i.code, rev: 2 }, { issueId: i.code, status: 'RESOLVED', change: 'resolved', roomId: L.room.code });
    }
  }

  // applicability: store a new plan only when the judgement changed (every evaluation is still audited)
  const A = a.applicability;
  const signature = sha256(A.rows.map((r) => `${r.id}:${r.applicable}:${r.status}:${r.result || ''}`).join('|'));
  const last = (await q.query<{ signature: string }>('SELECT signature FROM app.cx_plan WHERE room_id = $1 ORDER BY compiled_at DESC, id DESC LIMIT 1', [L.room.id])).rows[0];
  const planChanged = !last || last.signature !== signature;
  if (planChanged) {
    const plan = (await q.query<{ id: string }>(`INSERT INTO app.cx_plan (tenant_id, room_id, design_rev, engine_version, rule_version, library_size, applicable, context, trigger, signature, compiled_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [ctx.p.tenantId, L.room.id, L.room.rev, ENGINE_VERSION, C.rulePack.version, A.library, A.applicable, A.ctx, trigger, signature, ctx.p.personId])).rows[0]!;
    // one multi-row insert for the 94 rows
    const cols = 15; const vals: unknown[] = []; const tuples: string[] = [];
    A.rows.forEach((r, k) => {
      tuples.push(`(${Array.from({ length: cols }, (_, j) => `$${k * cols + j + 1}`).join(',')})`);
      vals.push(ctx.p.tenantId, plan.id, r.id, r.label, r.pack, r.domain, r.phase, r.tier, r.applicable, r.status, asJson(r.applicable ? r.why : [r.justification]), r.personas || [], r.evidence || [], !!r.instrument, r.devices || []);
    });
    await q.query(`INSERT INTO app.cx_plan_row (tenant_id, plan_id, test_id, label, pack, domain, phase, tier, applicable, status, why, personas, evidence, instrument, devices) VALUES ${tuples.join(',')}`, vals);
    await ctx.emit(q, 'commission.applicability_compiled', { type: 'Room', id: L.room.code, rev: L.room.rev }, { designId: L.room.code, applicable: A.applicable, library: A.library, planId: plan.id, trigger });
  }
  await ctx.audit(q, 'room.analyzed', 'ALLOWED', { type: 'Room', id: L.room.code }, { trigger, applicable: A.applicable, findings: findings.length, planChanged, classification: a.classification.archetype });
  return { applicable: A.applicable, openIssues: findings.length, planChanged };
}

/** The stable identifier behind a display code (ADR-0004 graph identity); null when the type has no keyed table yet. */
const KEYED: Record<string, string> = { Room: 'app.room', PlannedAsset: 'app.planned_asset', Building: 'app.building', RoomIssue: 'app.room_issue', Site: 'app.site', Project: 'app.project' };
async function keyOf(q: Queryable, type: string, code: string): Promise<string | null> {
  const t = KEYED[type]; if (!t) return null;
  return (await q.query<{ id: string }>(`SELECT id FROM ${t} WHERE code = $1 LIMIT 1`, [code])).rows[0]?.id ?? null;
}
/** Add a typed graph edge (idempotent). Both ends carry their stable keys when the type is keyed; the display code stays for readers. */
export async function relate(ctx: RequestContext, q: Queryable, from: { type: string; id: string }, rel: string, to: { type: string; id: string }, provenance = 'DECLARED'): Promise<void> {
  const [fk, tk] = await Promise.all([keyOf(q, from.type, from.id), keyOf(q, to.type, to.id)]);
  await q.query(`INSERT INTO app.relationship (tenant_id, from_type, from_id, rel, to_type, to_id, provenance, from_key, to_key) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (tenant_id, from_type, from_id, rel, to_type, to_id) WHERE removed_at IS NULL DO NOTHING`,
    [ctx.p.tenantId, from.type, from.id, rel, to.type, to.id, provenance, fk, tk]);
}
async function unrelate(q: Queryable, fromType: string, fromId: string, rel: string, toType: string, toId: string): Promise<void> {
  await q.query('UPDATE app.relationship SET removed_at = now() WHERE from_type = $1 AND from_id = $2 AND rel = $3 AND to_type = $4 AND to_id = $5 AND removed_at IS NULL', [fromType, fromId, rel, toType, toId]);
}

// ------------------------------------------------------------------------------------------------ helpers for mutations
/** D-39: which design edits the room accepts now is the shared engine's rule (`designEditRefusal`, through domain/design-edits.ts) — every
 *  edit while PLANNED; while an accepted room is recommissioned a model substitution only; nothing otherwise. Build a Room runs the same. */
async function designEdit(q: Queryable, r: RoomRow, edit: DesignEdit): Promise<void> {
  const recom = r.lifecycle === 'COMMISSIONING' ? !!(await recommissioning(q, r)) : false;
  const why = designEditFor(r, recom, edit); if (why) throw refused([why]);
}
export async function bump(q: Queryable, r: RoomRow): Promise<number> { const n = r.rev + 1; await q.query('UPDATE app.room SET rev = $2 WHERE id = $1', [r.id, n]); r.rev = n; return n; }
async function nextCode(q: Queryable, kind: string, prefix: string): Promise<string> { return (await q.query<{ c: string }>('SELECT app.next_code($1, $2) AS c', [kind, prefix])).rows[0]!.c; }
const connRel = (kind: string) => (kind === 'signal' ? 'FEEDS' : 'CONNECTS_TO');

async function insertDevice(ctx: RequestContext, q: Queryable, room: RoomRow, d: PlannedDevice): Promise<string> {
  const r = await q.query<{ id: string }>(`INSERT INTO app.planned_asset (tenant_id, room_id, code, category, label, role, model, generic, furniture, x, y, z, rot, mount, props) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
    [ctx.p.tenantId, room.id, d.id, d.cat, d.label, d.role, d.model, d.generic, !!d.furniture, d.x, d.y, d.z ?? 0, d.rot ?? 0, d.mount, d.props]);
  if (!d.furniture) await relate(ctx, q, { type: 'Room', id: room.code }, 'PLANS_DEVICE', { type: 'PlannedAsset', id: d.id });
  return r.rows[0]!.id;
}
async function insertConnections(ctx: RequestContext, q: Queryable, room: RoomRow, conns: Connection[]): Promise<void> {
  for (const c of conns) {
    await q.query(`INSERT INTO app.connection (tenant_id, room_id, code, from_asset, to_asset, kind, why) SELECT $1, $2, $3, fa.id, ta.id, $6, $7 FROM app.planned_asset fa, app.planned_asset ta WHERE fa.code = $4 AND ta.code = $5`,
      [ctx.p.tenantId, room.id, c.id, c.from, c.to, c.kind, c.why || '']);
    await relate(ctx, q, { type: 'PlannedAsset', id: c.from }, connRel(c.kind), { type: 'PlannedAsset', id: c.to }, 'MODELED');
  }
}
async function proposeFor(ctx: RequestContext, q: Queryable, room: RoomRow, onlyCode?: string): Promise<Connection[]> {
  const L = await load(ctx, q, room.id);
  let k = 0;
  // proposeConnections is pure: it names new connections with placeholders, which get canonical codes here
  const pending = proposeConnections(L.input, () => `__${(k += 1)}`, onlyCode, C);
  for (const c of pending) c.id = await nextCode(q, 'conn', 'CN-');
  await insertConnections(ctx, q, room, pending);
  return pending;
}

// ------------------------------------------------------------------------------------------------ create
export interface CreateRoom { name: string; template: string; buildingCode?: string; floor?: number; unit?: 'm' | 'ft'; length?: string | number; width?: string | number; ceiling?: string | number; intendedUse?: string; occupancy?: number; shape?: string; points?: Array<[number, number]>; projectCode?: string }

export async function createRoom(ctx: RequestContext, input: CreateRoom): Promise<{ code: string; id: string }> {
  await ctx.require('room.design', 'create a room');
  const T = C.templates[input.template];
  if (!T) throw invalid(`unknown template ${input.template}`, [`templates: ${Object.keys(C.templates).join(', ')}`]);
  const unit = input.unit === 'ft' ? 'ft' : 'm';
  const prov: Record<string, string> = {};
  const val = (k: 'length' | 'width' | 'ceiling', i: 0 | 1 | 2) => {
    const v = input[k];
    if (v != null && v !== '') { const m = parseLength(v, unit); if (!m) { prov[k] = 'UNREADABLE'; return null; } prov[k] = 'DECLARED'; return m; }
    prov[k] = 'MODELED'; return T.dims![i];
  };
  const L = val('length', 0); const W = val('width', 1); const H = val('ceiling', 2);
  const bad = (['length', 'width', 'ceiling'] as const).filter((k) => prov[k] === 'UNREADABLE');
  if (bad.length) throw refused([`${bad.join(', ')}: not readable — use metres, feet, or feet and inches like 24' 6" (nothing is substituted for a value you typed)`]);
  if (!(L! > 0.5 && W! > 0.5 && H! > 1.8 && L! < 200 && W! < 200 && H! < 30)) throw refused([`dimensions out of range (length ${L} m, width ${W} m, ceiling ${H} m)`]);
  let points = outlineFor(input.shape || 'rect', W!, L!); let lengthM = L!; let widthM = W!; let shape = input.shape || 'rect';
  if (input.points) { const o = polygonCheck(input.points); if ('why' in o) throw refused([`outline refused: ${o.why}`]); points = o.points; lengthM = o.l; widthM = o.w; shape = 'polygon'; Object.assign(prov, { length: 'DECLARED', width: 'DECLARED', outline: 'DECLARED' }); }
  const geometry = { shape, points, ceiling: H!, lengthM, widthM, provenance: prov, confidence: Object.values(prov).every((p) => p === 'DECLARED') ? 'declared' : 'modeled' };
  return ctx.tx(async (q) => {
    // a site-scoped person can create rooms only in buildings of their own sites (the same 404 as any other unseen record)
    const sc = scopeClause(ctx, 'b');
    const b = (await q.query<{ id: string; code: string }>(`SELECT b.id, b.code FROM app.building b WHERE ${input.buildingCode ? 'b.code = $1' : 'true'}${sc.sql.replace('$SCOPE', input.buildingCode ? '$2' : '$1')} ORDER BY b.code LIMIT 1`, [...(input.buildingCode ? [input.buildingCode] : []), ...sc.args])).rows[0];
    if (!b) throw notFound(`building ${input.buildingCode || '(any)'}`);
    const code = await nextCode(q, 'room', 'R-PLN-');
    let projectId: string | null = null;
    if (input.projectCode) { projectId = (await q.query<{ id: string }>(`SELECT id FROM app.project WHERE code = $1 AND state = 'OPEN'`, [input.projectCode])).rows[0]?.id ?? null; if (!projectId) throw notFound(`open project ${input.projectCode}`); }
    const room = (await q.query<RoomRow>(`INSERT INTO app.room (tenant_id, building_id, code, name, floor, template, intended_use, occupancy, unit, geometry, created_by, project_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [ctx.p.tenantId, b.id, code, String(input.name).slice(0, 80), input.floor ?? 1, input.template, String(input.intendedUse ?? T.use ?? ''), input.occupancy && input.occupancy > 0 ? input.occupancy : T.occ ?? 1, unit, geometry, ctx.p.personId, projectId])).rows[0]!;
    await relate(ctx, q, { type: 'Room', id: code }, 'LOCATED_IN', { type: 'Building', id: b.code });
    const ids: string[] = []; for (let i = 0; i < (T.items || []).length; i += 1) ids.push(await nextCode(q, 'asset', 'PA-'));
    let n = 0; const devs = templateDevices(input.template, points, () => ids[n++]!, C);
    for (const d of devs) await insertDevice(ctx, q, room, d);
    await proposeFor(ctx, q, room);
    await ctx.emit(q, 'room.design_created', { type: 'Room', id: code, rev: 1 }, { designId: code, roomId: code, template: input.template, unit, shape });
    await saveRevisionTx(ctx, q, room, 'created', true);
    await analyze(ctx, q, room.id, 'room created');
    await ctx.audit(q, 'room.create', 'ALLOWED', { type: 'Room', id: code }, { template: input.template, area: area({ points }) });
    return { code, id: room.id };
  });
}

// ------------------------------------------------------------------------------------------------ devices and connections
export async function addDevice(ctx: RequestContext, ref: string, body: { category: string; x?: number; y?: number; mount?: string; rot?: number }) {
  await ctx.require('room.design', 'add a device', { type: 'Room', id: ref });
  if (!C.categories[body.category]) throw invalid(`unknown equipment category ${body.category}`);
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true); await designEdit(q, room, 'add-device');
    const L = await load(ctx, q, room.id);
    const b = { w: Math.max(...room.geometry.points.map((p) => p[0])), l: Math.max(...room.geometry.points.map((p) => p[1])) };
    const code = await nextCode(q, 'asset', 'PA-');
    const dev = newDevice(code, body.category, L.input.devices, { x: body.x ?? b.w / 2, y: body.y ?? b.l / 2, ...(body.mount ? { mount: body.mount } : {}), ...(body.rot != null ? { rot: body.rot } : {}) }, 'added', C);
    await insertDevice(ctx, q, room, dev);
    await proposeFor(ctx, q, room, code);
    const rev = await bump(q, room);
    await ctx.emit(q, 'room.device_added', { type: 'Room', id: room.code, rev }, { designId: room.code, assetId: code, category: body.category });
    const s = await analyze(ctx, q, room.id, `device added ${code}`);
    return { assetId: code, label: dev.label, ...s };
  });
}

export async function changeDevice(ctx: RequestContext, ref: string, assetCode: string, body: { x?: number; y?: number; mount?: string; rot?: number; model?: string; expectedInstallation?: string; asset?: string }) {
  await ctx.require('room.design', 'change a device', { type: 'Room', id: ref });
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true);
    // ADR-0003 change order: an accepted room under recommissioning accepts a model substitution (the asset keeps its id and position;
    // the substitution's time is in the model history, so the results it invalidates are known exactly). Anything else stays PLANNED-only.
    const recom = room.lifecycle === 'PLANNED' ? null : await recommissioning(q, room);
    { const why = designEditFor(room, !!recom, patchEdit(body)); if (why) throw refused([why]); }   // D-39: the shared rule
    if (!recom && (body.expectedInstallation || body.asset)) throw invalid('expectedInstallation and asset apply to a model substitution of an installed room under recommissioning');
    const a = (await q.query<AssetRow & { id: string }>('SELECT * FROM app.planned_asset WHERE room_id = $1 AND code = $2 AND removed_at IS NULL', [room.id, assetCode])).rows[0];
    if (!a) throw notFound(`device ${assetCode} in ${room.code}`);
    // ADR-0012: the position keeps its code; the unit of the previous model is taken out (SUBSTITUTED, its history kept) and a unit of
    // the new model is installed — planned (and refused) before anything is written, applied in this same transaction
    const sub = recom && body.model && body.model !== a.model ? await planSubstitution(ctx, q, room, assetCode, body.model, body) : null;
    const sets: string[] = []; const args: unknown[] = [a.id];
    for (const k of ['x', 'y', 'rot'] as const) if (body[k] != null) { if (!Number.isFinite(body[k])) throw invalid(`${k} must be a number`); args.push(Math.round(body[k]! * 100) / 100); sets.push(`${k} = $${args.length}`); }
    if (body.mount) { if (!['wall', 'ceiling', 'floor', 'table', 'rack'].includes(body.mount)) throw invalid('mount is wall, ceiling, floor, table or rack'); args.push(body.mount); sets.push(`mount = $${args.length}`); }
    let event = 'room.device_moved'; let payload: Record<string, unknown> = { designId: room.code, assetId: assetCode };
    if (body.model && body.model !== a.model) {
      // substitution: same asset id, new model, the previous model kept in the history (and in every earlier revision snapshot)
      const hist = [...(a.model_history as unknown[]), { model: a.model, generic: a.generic, until: new Date().toISOString(), by: ctx.p.personId }];
      args.push(body.model, body.model === 'generic', asJson(hist)); sets.push(`model = $${args.length - 2}`, `generic = $${args.length - 1}`, `model_history = $${args.length}`);
      event = 'room.device_swapped'; payload = { designId: room.code, assetId: assetCode, from: a.model, to: body.model };
    }
    if (!sets.length) throw invalid('nothing to change');
    await q.query(`UPDATE app.planned_asset SET ${sets.join(', ')} WHERE id = $1`, args);
    const rev = await bump(q, room);
    const eventId = await ctx.emit(q, event, { type: 'Room', id: room.code, rev }, payload);
    const unit = sub ? await applyReplacement(ctx, q, sub.pos, sub.plan, sub.spare, { note: `model substitution ${a.model} → ${body.model}`, evidenceId: null, eventId }) : null;
    const s = await analyze(ctx, q, room.id, `${event === 'room.device_swapped' ? 'device swapped' : 'device moved'} ${assetCode}`);
    if (!recom) return { assetId: assetCode, ...s };
    // the substitution reopens the results that covered the replaced unit (the demonstrator's asset replacement, v25CxReplace)
    const subs = substitutions(await load(ctx, q, room.id), recom.published_ms).filter((x) => x.assetId === assetCode);
    const affected = (await reverification(q, room.id, subs)).map((t) => t.testId);
    const planId = (await q.query<{ id: string }>('SELECT id FROM app.cx_plan WHERE room_id = $1 ORDER BY compiled_at DESC, id DESC LIMIT 1', [room.id])).rows[0]?.id || '';
    await ctx.emit(q, 'commission.asset_replaced', { type: 'Room', id: room.code, rev }, { planId, assetId: assetCode, affected, roomId: room.code, from: a.model, to: body.model!, baselineVersion: recom.version, kind: 'SUBSTITUTED', fromAsset: unit?.closed.asset ?? null, toAsset: unit?.opened.asset ?? null, installationId: unit?.opened.installation ?? null });
    failpoint('installation.substitute:after-records');
    await ctx.audit(q, 'commission.asset_replaced', 'ALLOWED', { type: 'Room', id: room.code }, { assetId: assetCode, from: a.model, to: body.model, baselineVersion: recom.version, affected, kind: 'SUBSTITUTED', fromAsset: unit?.closed.asset ?? null, toAsset: unit?.opened.asset ?? null, closedInstallation: unit?.closed.installation ?? null, installation: unit?.opened.installation ?? null });
    return { assetId: assetCode, ...s, reverification: affected, installation: unit ? { closed: unit.closed, installed: unit.opened, model: body.model } : null };
  });
}

export async function removeDevice(ctx: RequestContext, ref: string, assetCode: string) {
  await ctx.require('room.design', 'remove a device', { type: 'Room', id: ref });
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true); await designEdit(q, room, 'remove-device');
    const a = (await q.query<{ id: string }>('UPDATE app.planned_asset SET removed_at = now() WHERE room_id = $1 AND code = $2 AND removed_at IS NULL RETURNING id', [room.id, assetCode])).rows[0];
    if (!a) throw notFound(`device ${assetCode} in ${room.code}`);
    await q.query('UPDATE app.connection SET removed_at = now() WHERE (from_asset = $1 OR to_asset = $1) AND removed_at IS NULL', [a.id]);
    await q.query("UPDATE app.relationship SET removed_at = now() WHERE removed_at IS NULL AND ((from_type = 'PlannedAsset' AND from_id = $1) OR (to_type = 'PlannedAsset' AND to_id = $1))", [assetCode]);
    const rev = await bump(q, room);
    await ctx.emit(q, 'room.device_removed', { type: 'Room', id: room.code, rev }, { designId: room.code, assetId: assetCode });
    return { assetId: assetCode, removed: true, ...(await analyze(ctx, q, room.id, `device removed ${assetCode}`)) };
  });
}

export async function addConnection(ctx: RequestContext, ref: string, body: { from: string; to: string; kind: string }) {
  await ctx.require('room.design', 'add a connection', { type: 'Room', id: ref });
  if (!['network', 'signal', 'control', 'power'].includes(body.kind)) throw invalid('kind is network, signal, control or power');
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true); await designEdit(q, room, 'add-connection');
    const both = (await q.query<{ code: string }>('SELECT code FROM app.planned_asset WHERE room_id = $1 AND code = ANY($2::text[]) AND removed_at IS NULL', [room.id, [body.from, body.to]])).rows;
    if (body.from === body.to || both.length !== 2) throw refused(['a connection needs two different devices of this design']);
    const dup = (await q.query('SELECT 1 FROM app.connection c JOIN app.planned_asset fa ON fa.id = c.from_asset JOIN app.planned_asset ta ON ta.id = c.to_asset WHERE c.room_id = $1 AND fa.code = $2 AND ta.code = $3 AND c.kind = $4 AND c.removed_at IS NULL', [room.id, body.from, body.to, body.kind])).rowCount;
    if (dup) throw refused(['that connection is already proposed']);
    const code = await nextCode(q, 'conn', 'CN-');
    await insertConnections(ctx, q, room, [{ id: code, from: body.from, to: body.to, kind: body.kind, why: 'added by the designer' }]);
    const rev = await bump(q, room);
    await ctx.emit(q, 'room.connection_changed', { type: 'Room', id: room.code, rev }, { designId: room.code, connectionId: code, change: 'added' });
    return { connectionId: code, ...(await analyze(ctx, q, room.id, `connection added ${code}`)) };
  });
}

export async function removeConnection(ctx: RequestContext, ref: string, connCode: string) {
  await ctx.require('room.design', 'remove a connection', { type: 'Room', id: ref });
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true); await designEdit(q, room, 'remove-connection');
    const c = (await q.query<{ kind: string; f: string; t: string }>(`UPDATE app.connection c SET removed_at = now() FROM app.planned_asset fa, app.planned_asset ta WHERE c.room_id = $1 AND c.code = $2 AND c.removed_at IS NULL AND fa.id = c.from_asset AND ta.id = c.to_asset RETURNING c.kind, fa.code AS f, ta.code AS t`, [room.id, connCode])).rows[0];
    if (!c) throw notFound(`connection ${connCode} in ${room.code}`);
    await unrelate(q, 'PlannedAsset', c.f, connRel(c.kind), 'PlannedAsset', c.t);
    const rev = await bump(q, room);
    await ctx.emit(q, 'room.connection_changed', { type: 'Room', id: room.code, rev }, { designId: room.code, connectionId: connCode, change: 'removed' });
    return { connectionId: connCode, removed: true, ...(await analyze(ctx, q, room.id, `connection removed ${connCode}`)) };
  });
}

// ------------------------------------------------------------------------------------------------ revisions
async function saveRevisionTx(ctx: RequestContext, q: Queryable, room: RoomRow, reason: string, initial = false): Promise<{ revision: number; sha256: string } | null> {
  const L = await load(ctx, q, room.id);
  const snapshot = { geometry: L.input.geometry, devices: L.input.devices, connections: L.input.connections, classification: L.room.approved_class || L.room.classification || {} };
  const hash = sha256(JSON.stringify([snapshot.geometry, snapshot.devices, snapshot.connections]));
  const last = (await q.query<{ rev_no: number; sha256: string }>('SELECT rev_no, sha256 FROM app.room_revision WHERE room_id = $1 ORDER BY rev_no DESC LIMIT 1', [room.id])).rows[0];
  if (last && last.sha256 === hash && !initial) return null;
  const n = (last?.rev_no ?? 0) + 1;
  await q.query('INSERT INTO app.room_revision (tenant_id, room_id, rev_no, reason, snapshot, sha256, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)', [ctx.p.tenantId, room.id, n, reason.slice(0, 200), snapshot, hash, ctx.p.personId]);
  await ctx.emit(q, 'room.design_revision_saved', { type: 'Room', id: room.code, rev: room.rev }, { designId: room.code, revision: n, hash });
  return { revision: n, sha256: hash };
}

export async function saveRevision(ctx: RequestContext, ref: string, reason: string) {
  await ctx.require('room.design', 'save a revision', { type: 'Room', id: ref });
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true);
    const r = await saveRevisionTx(ctx, q, room, reason || 'saved');
    if (!r) { const last = (await q.query<{ n: number }>('SELECT max(rev_no) AS n FROM app.room_revision WHERE room_id = $1', [room.id])).rows[0]!.n; throw refused([`nothing changed since revision ${last}`]); }
    const s = await analyze(ctx, q, room.id, `revision ${r.revision} saved`);
    return { ...r, ...s };
  });
}

// ------------------------------------------------------------------------------------------------ recommissioning (ADR-0003): the change order of an accepted room
/** The CURRENT baseline of a room under recommissioning (ACCEPTED → COMMISSIONING): the one state in which an accepted design changes. */
export async function recommissioning(q: Queryable, room: Pick<RoomRow, 'id' | 'lifecycle'>): Promise<{ id: string; version: number; design_revision: number; published_ms: number } | null> {
  if (room.lifecycle !== 'COMMISSIONING') return null;
  return (await q.query<{ id: string; version: number; design_revision: number; published_ms: number }>("SELECT id, version, design_revision, (extract(epoch FROM published_at) * 1000)::float8 AS published_ms FROM app.assurance_baseline WHERE room_id = $1 AND state = 'CURRENT'", [room.id])).rows[0] ?? null;
}

/** Model substitutions since the baseline was published, from each asset's model history (the model it had at acceptance → now). */
const substitutions = (L: Loaded, sinceMs: number): Substitution[] => substitutionsFrom(L.assets, sinceMs);
/**
 * The tests a substitution reopens. The rule is the shared engine's `reopenedBySubstitution` (ported from the demonstrator's asset
 * replacement, v25CxReplace; Build a Room in the investor demonstration calls the same function): every applicable test whose plan row
 * names the substituted asset, the Video tests when a camera is substituted, the Audio tests when a part of the audio chain is, and the
 * asset-identity check. A result recorded before the substitution was obtained on the previous model: it no longer counts for the
 * re-acceptance, and the test is re-run (`rerun`) and verified again. The plan, the results and that bookkeeping are read here.
 */
async function reverification(q: Queryable, roomId: string, subs: Change[]): Promise<Reverification[]> {
  if (!subs.length) return [];
  const plan = (await q.query<{ id: string }>('SELECT id FROM app.cx_plan WHERE room_id = $1 ORDER BY compiled_at DESC, id DESC LIMIT 1', [roomId])).rows[0];
  if (!plan) return [];
  const rows = (await q.query<{ test_id: string; label: string; domain: string; personas: string[]; evidence: string[]; instrument: boolean; devices: string[] }>('SELECT test_id, label, domain, personas, evidence, instrument, devices FROM app.cx_plan_row WHERE plan_id = $1 AND applicable ORDER BY phase, tier, test_id', [plan.id])).rows;
  const res = new Map((await q.query<{ test_id: string; result_label: string; recorded_ms: number; recorded_at: string }>("SELECT test_id, result_label, (extract(epoch FROM recorded_at) * 1000)::float8 AS recorded_ms, to_json(recorded_at) #>> '{}' AS recorded_at FROM app.current_result WHERE room_id = $1", [roomId])).rows.map((r) => [r.test_id, r]));
  return reverificationFrom(rows, res, subs);   // the pure adapter: the shared rule + the API's bookkeeping (domain/reverification.ts)
}

/**
 * The changes of unit that reopen tests now (ADR-0012), and the tests they reopen: while an accepted room is recommissioned, the model
 * substitutions of the design history and the like-for-like replacements recorded since the current baseline was published; otherwise
 * the like-for-like replacements recorded at any time (during installation and first commissioning). Derived from the append-only
 * installation records on every read — never stored separately, so a rolled-back replacement reopens nothing.
 */
export interface ReverificationNow { recommissioning: Awaited<ReturnType<typeof recommissioning>>; changes: UnitChange[]; reverification: Reverification[]; kinds: ChangeKind[] }
export async function reverificationNow(q: Queryable, room: RoomRow, L: Loaded): Promise<ReverificationNow> {
  const recom = await recommissioning(q, room);
  const { facts } = await roomInstallations(q, room.id);
  const changes = changesFrom(L.assets, facts, recom ? recom.published_ms : null);
  return { recommissioning: recom, changes, reverification: await reverification(q, room.id, changes), kinds: [...new Set(changes.map((c) => c.kind))] };
}

export interface RecommissionImpact {
  baseline: { id: string; version: number; designRevision: number };
  substitutions: Substitution[];
  /** every change of unit since the baseline, labelled: SUBSTITUTED (a different model) or REPLACED (another unit of the same model) */
  changes: UnitChange[];
  design: RevisionBinding;
  reverification: Reverification[];
}
/** Everything a recommissioning change requires before the re-acceptance; null when the room is not being recommissioned. */
export async function recommissionImpact(q: Queryable, room: RoomRow, L: Loaded, known?: ReverificationNow): Promise<RecommissionImpact | null> {
  const b = await recommissioning(q, room); if (!b) return null;
  const subs = substitutions(L, b.published_ms);
  const rv = known ?? await reverificationNow(q, room, L);
  const revs = (await q.query<{ rev_no: number; created_by: string; snapshot: DesignSnapshot }>('SELECT rev_no, created_by, snapshot FROM app.room_revision WHERE room_id = $1 AND (rev_no = $2 OR rev_no = (SELECT max(rev_no) FROM app.room_revision WHERE room_id = $1)) ORDER BY rev_no', [room.id, room.approved_revision])).rows;
  return {
    baseline: { id: b.id, version: b.version, designRevision: b.design_revision }, substitutions: subs, changes: rv.changes,
    // whether the approved (and the latest) revision still describes the room: the engine's designKey comparison (binding.ts)
    design: revisionBindingFrom(revs, room.approved_revision, L.input),
    reverification: rv.reverification,
  };
}
/** The design-binding fact of the shared acceptance gate (ADR-0003): the re-acceptance binds an approved revision that describes the room.
 *  The sentence, and its place among the reasons (`ACCEPTANCE_BLOCKER_ORDER`), are the engine's — the demonstration hands it the same fact. */
export const recommissionBinding = (rc: RecommissionImpact | null): DesignBinding | null => (rc ? designBindingFact(rc.design, rc.substitutions) : null);
const rvFacts = (rv: ReverificationNow) => gateFacts(rv.reverification, rv.changes);

/** Approve the saved revision that carries a recommissioning change (the DESIGN_APPROVED rules, applied while the room stays COMMISSIONING). */
export async function approveRevision(ctx: RequestContext, ref: string, revNo: number) {
  await ctx.require(REVISION_APPROVAL.authority, REVISION_APPROVAL.action, { type: 'Room', id: ref });
  if (!Number.isInteger(revNo) || revNo < 1) throw invalid('rev is a revision number');
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true);
    const action = 'room.revision.approve'; const agg = { type: 'Room', id: room.code };
    const rc = await recommissionImpact(q, room, await load(ctx, q, room.id));
    const cls = room.approved_class as { stale?: boolean } | null;
    const open = (await q.query<{ severity: string }>("SELECT severity FROM app.room_issue WHERE room_id = $1 AND state = 'OPEN' AND category = 'DESIGN_DEFICIENCY'", [room.id])).rows;
    // the rule is the engine's (`revisionApprovalBlockers`), the one Build a Room's "Approve revision" runs
    const facts = { room: room.code, lifecycle: room.lifecycle, revision: revNo, classificationApproved: !!cls && !cls.stale, openIssues: open };
    if (!rc) return ctx.refuse(action, agg, revisionApprovalBlockers({ ...facts, binding: null }), { revision: revNo });
    const rev = (await q.query<{ rev_no: number; created_by: string }>('SELECT rev_no, created_by FROM app.room_revision WHERE room_id = $1 AND rev_no = $2', [room.id, revNo])).rows[0];
    if (!rev) throw notFound(`revision ${revNo} of ${room.code}`);
    const why = revisionApprovalBlockers({ ...facts, binding: rc.design });
    if (why.length) await ctx.refuse(action, agg, why, { revision: revNo });
    await ctx.separate(action, agg, [rev.created_by], REVISION_APPROVAL.what);   // ADR-0005: never by the author of the revision
    const previous = room.approved_revision;
    await q.query('UPDATE app.room SET approved_revision = $2 WHERE id = $1', [room.id, revNo]);
    const r = await bump(q, room);
    await ctx.emit(q, 'room.design_approved', { type: 'Room', id: room.code, rev: r }, { designId: room.code, revision: revNo, previous, during: 'recommissioning' });
    await ctx.audit(q, action, 'ALLOWED', agg, { revision: revNo, previous, substitutions: rc.substitutions.map((s) => ({ assetId: s.assetId, from: s.from, to: s.to })) });
    return { revision: revNo, approvedRevision: revNo, previous, ...(await analyze(ctx, q, room.id, `revision ${revNo} approved during recommissioning`)) };
  });
}

// ------------------------------------------------------------------------------------------------ classification and drawings
export async function approveClassification(ctx: RequestContext, ref: string, body: { archetype?: string | null; reason?: string }) {
  await ctx.require('room.classify.approve', 'approve the room classification', { type: 'Room', id: ref });
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true);
    const s = (room.classification || {}) as { archetype?: string | null };
    const arch = body.archetype === undefined ? (s.archetype ?? null) : body.archetype;
    if (arch !== null && !C.archetypes[arch]) throw invalid(`unknown room type ${arch}`);
    const override = arch !== (s.archetype ?? null);
    if (override && !(body.reason && body.reason.trim().length >= 10)) throw refused(['an override of the suggested classification needs a reason (10 characters or more)']);
    { const last = (await q.query<{ created_by: string }>('SELECT created_by FROM app.room_revision WHERE room_id = $1 ORDER BY rev_no DESC LIMIT 1', [room.id])).rows[0]; await ctx.separate('room.classify.approve', { type: 'Room', id: room.code }, [last?.created_by], 'the classification of a design'); }   // ADR-0005
    const approved = { archetype: arch, archetypeName: arch ? C.archetypes[arch]!.name : 'Not a meeting space', override, reason: body.reason || 'suggestion accepted', by: ctx.p.personId, byRole: ctx.p.role, at: new Date().toISOString(), suggestedWas: s.archetype ?? null };
    await q.query('UPDATE app.room SET approved_class = $2 WHERE id = $1', [room.id, approved]);
    const rev = await bump(q, room);
    await ctx.emit(q, 'room.classification_approved', { type: 'Room', id: room.code, rev }, { designId: room.code, archetype: arch || 'NONE', approvedBy: ctx.p.personId, override });
    return { approved, ...(await analyze(ctx, q, room.id, override ? `classification overridden → ${arch}` : 'classification approved')) };
  });
}

export async function generateDrawings(ctx: RequestContext, ref: string) {
  await ctx.require('room.design', 'generate drawings', { type: 'Room', id: ref });
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true);
    const L = await load(ctx, q, room.id); const states = await drawingStates(q, L);
    for (const d of states) {
      await q.query(`UPDATE app.drawing_revision SET state = 'SUPERSEDED' WHERE room_id = $1 AND kind = $2 AND state <> 'SUPERSEDED'`, [room.id, d.kind]);
      await q.query('INSERT INTO app.drawing_revision (tenant_id, room_id, kind, rev_no, design_rev, input_sha256, generated_by) VALUES ($1,$2,$3,$4,$5,$6,$7)', [ctx.p.tenantId, room.id, d.kind, (d.revNo ?? 0) + 1, room.rev, d.currentInput, ctx.p.personId]);
    }
    await ctx.emit(q, 'drawing.revision_generated', { type: 'Room', id: room.code, rev: room.rev }, { designId: room.code, drawing: Object.keys(DRAWING_KINDS).join(',') });
    await analyze(ctx, q, room.id, 'drawings generated');
    return { drawings: (await drawingStates(q, await load(ctx, q, room.id))).map(({ kind, state, revNo }) => ({ kind, state, revNo })) };
  });
}

export async function approveDrawing(ctx: RequestContext, ref: string, kind: string) {
  await ctx.require('room.classify.approve', 'approve a drawing', { type: 'Room', id: ref });
  if (!DRAWING_KINDS[kind]) throw invalid(`unknown drawing ${kind}`);
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true);
    const st = (await drawingStates(q, await load(ctx, q, room.id))).find((d) => d.kind === kind)!;
    if (st.state !== 'GENERATED') throw refused([`only a current GENERATED drawing can be approved (this one is ${st.state})`]);
    await q.query(`UPDATE app.drawing_revision SET state = 'APPROVED', approved_by = $3, approved_at = now() WHERE room_id = $1 AND kind = $2 AND rev_no = $4`, [room.id, kind, ctx.p.personId, st.revNo]);
    await ctx.emit(q, 'drawing.revision_generated', { type: 'Room', id: room.code, rev: room.rev }, { designId: room.code, drawing: kind, approved: true });
    await analyze(ctx, q, room.id, `drawing approved ${kind}`);
    return { kind, state: 'APPROVED', revNo: st.revNo };
  });
}

// ------------------------------------------------------------------------------------------------ lifecycle
export async function transition(ctx: RequestContext, ref: string, to: RoomLifecycle) {
  if (!ROOM_LIFECYCLE.includes(to)) throw invalid(`unknown lifecycle state ${to}`);
  await ctx.require(LIFECYCLE_AUTHORITY[to], `move a room to ${to}`, { type: 'Room', id: ref });
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true);
    const L = await load(ctx, q, room.id);
    const open = (await q.query<{ severity: string }>("SELECT severity FROM app.room_issue WHERE room_id = $1 AND state = 'OPEN'", [room.id])).rows;
    const plan = (await q.query<{ id: string }>('SELECT id FROM app.cx_plan WHERE room_id = $1 ORDER BY compiled_at DESC, id DESC LIMIT 1', [room.id])).rows[0];
    const rows = plan ? (await q.query<{ test_id: string; applicable: boolean }>('SELECT test_id, applicable FROM app.cx_plan_row WHERE plan_id = $1', [plan.id])).rows : [];
    const labels = new Map((await q.query<{ test_id: string; result_label: string }>('SELECT test_id, result_label FROM app.current_result WHERE room_id = $1', [room.id])).rows.map((r) => [r.test_id, r.result_label]));
    const approved = room.approved_class as { stale?: boolean } | null;
    // a result recorded on a unit that has since been replaced or substituted is superseded: it never counts (ADR-0012)
    const rvn = await reverificationNow(q, room, L);
    // a re-acceptance after a recommissioning change binds an approved revision that describes the room, and results obtained on it
    const rc = to === 'ACCEPTED' ? await recommissionImpact(q, room, L, rvn) : null;
    const why = lifecycleBlockers({
      from: room.lifecycle, to, classificationApproved: !!approved && !approved.stale, openIssues: open,
      savedRevisions: (await q.query<{ n: number }>('SELECT count(*)::int AS n FROM app.room_revision WHERE room_id = $1', [room.id])).rows[0]!.n,
      rows: rows.map((r) => ({ id: r.test_id, applicable: r.applicable, result: (labels.get(r.test_id) || 'NOT_TESTED') as never } as never)),
      results: L.results, hasBaseline: !!room.baseline, hasLiveMonitoringEvidence: false, ...rvFacts(rvn), designBinding: recommissionBinding(rc),
    });
    if (why.length) await ctx.refuse(`room.lifecycle:${to}`, { type: 'Room', id: room.code }, why);
    // separation of duties (ADR-0005): the design is not approved by its author; a room is not accepted by whoever recorded or verified its results
    if (to === 'DESIGN_APPROVED') { const last = (await q.query<{ created_by: string }>('SELECT created_by FROM app.room_revision WHERE room_id = $1 ORDER BY rev_no DESC LIMIT 1', [room.id])).rows[0]; await ctx.separate(`room.lifecycle:${to}`, { type: 'Room', id: room.code }, [last?.created_by], 'the design'); }
    if (to === 'ACCEPTED') { const authors = (await q.query<{ recorded_by: string; verified_by: string | null }>('SELECT t.recorded_by, v.verified_by FROM app.current_result c JOIN app.test_result t ON t.id = c.result_id LEFT JOIN app.verification v ON v.result_id = c.result_id WHERE c.room_id = $1', [room.id])).rows.flatMap((x) => [x.recorded_by, x.verified_by]); await ctx.separate(`room.lifecycle:${to}`, { type: 'Room', id: room.code }, authors, 'the acceptance (its recorded and verified results)'); }
    const from = room.lifecycle;
    const extra: string[] = []; const args: unknown[] = [room.id, to];
    if (to === 'DESIGN_APPROVED') { args.push((await q.query<{ n: number }>('SELECT max(rev_no) AS n FROM app.room_revision WHERE room_id = $1', [room.id])).rows[0]!.n); extra.push(`approved_revision = $${args.length}`); }
    if (to === 'PLANNED') extra.push('approved_revision = NULL');
    if (to === 'ACCEPTED') { args.push({ at: new Date().toISOString(), signedBy: ctx.p.personId, revision: room.approved_revision, results: Object.fromEntries(labels), state: 'ACCEPTED_BASELINE', note: 'signed accepted baseline: the as-accepted design and the verified results; not live monitoring' }); extra.push(`baseline = $${args.length}`); }
    await q.query(`UPDATE app.room SET lifecycle = $2${extra.length ? `, ${extra.join(', ')}` : ''} WHERE id = $1`, args);
    if (to === 'INSTALLED_UNVERIFIED') await q.query(`UPDATE app.planned_asset SET lifecycle = 'INSTALLED_UNVERIFIED' WHERE room_id = $1 AND removed_at IS NULL`, [room.id]);
    room.lifecycle = to; const rev = await bump(q, room);
    // ADR-0012: recording the installation records which unit is at each position (identity UNKNOWN until someone records it)
    if (to === 'INSTALLED_UNVERIFIED') await recordRoomInstallation(ctx, q, room, rev);
    if (to === 'ACCEPTED') { const bl = await publishBaseline(ctx, q, room, 'accepted: first baseline (ADR-0003)'); await ctx.emit(q, 'handoff.accepted', { type: 'Room', id: room.code, rev }, { projectId: room.code, roomId: room.code, baselineId: bl.id, version: bl.version }); }
    if (to === 'DESIGN_APPROVED') await ctx.emit(q, 'room.design_approved', { type: 'Room', id: room.code, rev }, { designId: room.code, from, to });
    else await ctx.emit(q, 'room.lifecycle_changed', { type: 'Room', id: room.code, rev }, { designId: room.code, from, to });
    await ctx.audit(q, `room.lifecycle:${to}`, 'ALLOWED', { type: 'Room', id: room.code }, { from, to });
    return { from, to, ...(await analyze(ctx, q, room.id, `lifecycle ${to}`)) };
  });
}

export async function updateRoom(ctx: RequestContext, ref: string, body: { name?: string; intendedUse?: string; occupancy?: number }) {
  await ctx.require('room.design', 'edit the room', { type: 'Room', id: ref });
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true); await designEdit(q, room, 'edit-room');
    const sets: string[] = []; const args: unknown[] = [room.id];
    if (body.name != null) { args.push(String(body.name).slice(0, 80)); sets.push(`name = $${args.length}`); }
    if (body.intendedUse != null) { args.push(String(body.intendedUse).slice(0, 200)); sets.push(`intended_use = $${args.length}`); }
    if (body.occupancy != null) { if (!Number.isInteger(body.occupancy) || body.occupancy < 1 || body.occupancy > 5000) throw invalid('occupancy must be 1–5000'); args.push(body.occupancy); sets.push(`occupancy = $${args.length}`); }
    if (!sets.length) throw invalid('nothing to change');
    await q.query(`UPDATE app.room SET ${sets.join(', ')} WHERE id = $1`, args);
    const rev = await bump(q, room);
    await ctx.emit(q, 'room.geometry_updated', { type: 'Room', id: room.code, rev }, { designId: room.code, fields: Object.keys(body) });
    return analyze(ctx, q, room.id, 'room details changed');
  });
}

export { ApiError };

// ------------------------------------------------------------------------------------------------ readiness (P4-B): where the room stands, what blocks the next step, who may take it, what is outstanding
export async function readiness(ctx: RequestContext, ref: string) {
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref);
    const L = await load(ctx, q, room.id);
    const a = analyzeRoom(L.input, C);
    const open = (await q.query<{ code: string; severity: string; title: string; owner_role: string | null }>("SELECT code, severity, title, owner_role FROM app.room_issue WHERE room_id = $1 AND state = 'OPEN' ORDER BY severity, code", [room.id])).rows;
    const plan = (await q.query<{ id: string }>('SELECT id FROM app.cx_plan WHERE room_id = $1 ORDER BY compiled_at DESC, id DESC LIMIT 1', [room.id])).rows[0];
    const rows = plan ? (await q.query<{ test_id: string; applicable: boolean; personas: string[] }>('SELECT test_id, applicable, personas FROM app.cx_plan_row WHERE plan_id = $1', [plan.id])).rows : [];
    const labels = new Map((await q.query<{ test_id: string; result_label: string }>('SELECT test_id, result_label FROM app.current_result WHERE room_id = $1', [room.id])).rows.map((r) => [r.test_id, r.result_label]));
    const revisions = (await q.query<{ n: number; created_by: string }>('SELECT count(*)::int AS n, max(created_by::text) AS created_by FROM app.room_revision WHERE room_id = $1', [room.id])).rows[0]!;
    const approved = room.approved_class as { stale?: boolean; by?: string; at?: string; archetype?: string } | null;
    const i = ROOM_LIFECYCLE.indexOf(room.lifecycle as RoomLifecycle); const next = ROOM_LIFECYCLE[i + 1] as RoomLifecycle | undefined;
    const applicable = rows.filter((r) => r.applicable); const lab = (id: string) => labels.get(id) || 'NOT_TESTED';
    const rvn = await reverificationNow(q, room, L);   // the tests a change of unit reopened (recommissioning or not)
    const rc = await recommissionImpact(q, room, L, rvn);   // null unless an accepted room is being recommissioned
    const reopened = new Set(rvn.reverification.filter((t) => t.rerun).map((t) => t.testId));
    const counts = { applicable: applicable.length, verified: applicable.filter((r) => lab(r.test_id) === 'PASS_VERIFIED' && !reopened.has(r.test_id)).length, awaiting: applicable.filter((r) => lab(r.test_id) === 'PASS_UNVERIFIED').length, failed: applicable.filter((r) => lab(r.test_id) === 'FAIL').length, other: applicable.filter((r) => ['NOT_SUPPORTED', 'INCONCLUSIVE'].includes(lab(r.test_id))).length, notTested: applicable.filter((r) => lab(r.test_id) === 'NOT_TESTED').length, revalidation: reopened.size };
    const facts = { from: room.lifecycle, classificationApproved: !!approved && !approved.stale, openIssues: open, savedRevisions: revisions.n, rows: rows.map((r) => ({ id: r.test_id, applicable: r.applicable, result: lab(r.test_id) as never } as never)), results: L.results as never, hasBaseline: !!room.baseline, hasLiveMonitoringEvidence: false };
    const blockers = next ? lifecycleBlockers({ ...facts, to: next, ...rvFacts(rvn), designBinding: next === 'ACCEPTED' ? recommissionBinding(rc) : null }) : ['the room is OPERATIONAL: no further governed step'];
    const evidence = (await q.query<{ n: number }>('SELECT count(DISTINCT evidence_id)::int AS n FROM app.test_result WHERE room_id = $1 AND evidence_id IS NOT NULL', [room.id])).rows[0]!.n;
    const baselines = (await q.query<{ version: number; state: string; published_at: string }>('SELECT version, state, published_at FROM app.assurance_baseline WHERE room_id = $1 ORDER BY version', [room.id])).rows;
    const exceptions = (await q.query<{ n: number }>("SELECT count(*)::int AS n FROM app.baseline_exception WHERE room_id = $1 AND state = 'REQUESTED'", [room.id])).rows[0]!.n;
    const measurements = (await q.query<{ provenance: string; approval_state: string; n: number }>('SELECT provenance, approval_state, count(*)::int AS n FROM app.measurement WHERE room_id = $1 GROUP BY 1, 2', [room.id])).rows;
    const approvals = (await q.query<{ action: string; actor_role: string | null; actor_id: string | null; at: string; detail: Record<string, unknown> }>("SELECT action, actor_role, actor_id, at, detail FROM app.audit_event WHERE aggregate_type = 'Room' AND aggregate_id = $1 AND outcome = 'ALLOWED' AND action IN ('room.classification_approved', 'room.lifecycle:DESIGN_APPROVED', 'room.lifecycle:ACCEPTED', 'room.lifecycle:COMMISSIONING', 'assurance.baseline_published', 'room.drawing_approved', 'room.revision.approve') ORDER BY at DESC LIMIT 20", [room.code])).rows;
    const refusals = (await q.query<{ action: string; actor_role: string | null; at: string; detail: Record<string, unknown> }>("SELECT action, actor_role, at, detail FROM app.audit_event WHERE aggregate_type = 'Room' AND aggregate_id = $1 AND outcome = 'DENIED' ORDER BY at DESC LIMIT 10", [room.code])).rows;
    // outstanding actions: who must do what next (derived from the plan and the gate, never invented)
    const outstanding: Array<{ what: string; who: string; count?: number }> = [];
    if (!approved || approved.stale) outstanding.push({ what: approved?.stale ? 're-approve the classification (the design changed)' : 'approve the classification', who: 'room.classify.approve (not the design author)' });
    if (!revisions.n) outstanding.push({ what: 'save a design revision', who: 'room.design' });
    for (const o of open) outstanding.push({ what: `resolve ${o.code} (${o.severity}) ${o.title}`, who: o.owner_role || 'design / service' });
    { const task = rc ? designBindingTask(rc.design) : null; if (task) outstanding.push(task); }
    if (rvn.reverification.length) { const byPersona = new Map<string, number>(); for (const t of rvn.reverification) if (t.rerun) for (const p of t.personas) byPersona.set(p, (byPersona.get(p) || 0) + 1); for (const [p, n] of byPersona) outstanding.push({ what: rerunTask(rvn.kinds), who: p, count: n }); }
    if (room.lifecycle === 'COMMISSIONING') { const byPersona = new Map<string, number>(); for (const r of applicable) if (lab(r.test_id) === 'NOT_TESTED') for (const p of r.personas) byPersona.set(p, (byPersona.get(p) || 0) + 1); for (const [p, n] of byPersona) outstanding.push({ what: 'record results', who: p, count: n }); if (counts.awaiting) outstanding.push({ what: 'verify recorded passes', who: 'an independent verifier (not the recorder)', count: counts.awaiting }); if (counts.failed) outstanding.push({ what: 'remediate and retest failures', who: 'service / commissioning', count: counts.failed }); }
    if (exceptions) outstanding.push({ what: 'decide baseline exceptions', who: 'baseline.approve (not the requester)', count: exceptions });
    const completion = applicable.length ? Math.round((counts.verified / applicable.length) * 100) : null;
    return {
      room: room.code, lifecycle: room.lifecycle, next: next ? { to: next, authority: LIFECYCLE_AUTHORITY[next], blockers, separationOfDuties: next === 'DESIGN_APPROVED' ? 'not the author of the latest revision' : next === 'ACCEPTED' ? 'not a recorder or verifier of the results' : null } : null,
      completion: { percentVerified: completion, basis: 'independently verified applicable tests over applicable tests; design approval never counts as commissioning progress; a result recorded before a recommissioning substitution of a device it covers does not count (revalidation)', counts },
      recommissioning: rc ? { ...rc, note: 'the accepted baseline stays CURRENT until the re-acceptance publishes the next version; the re-acceptance binds the approved revision and results recorded after the substitution' } : null,
      installations: { devices: [...(await roomIdentityList(q, room.id, L))], changes: rvn.changes, reverification: rc ? null : rvn.reverification, note: 'each position (PA-) with the physical unit (AS-) installed there now and its identity state; a change of unit reopens the tests that covered the position (GET /v1/rooms/{room}/positions/{position}/history)' },
      design: { revisions: revisions.n, approvedRevision: room.approved_revision, classification: approved ? { archetype: approved.archetype, stale: !!approved.stale, at: approved.at } : null, checks: a.checks.length },
      deficiencies: open.map((o) => ({ code: o.code, severity: o.severity, title: o.title, owner: o.owner_role })),
      evidence: { objects: evidence, measurements: measurements.map((m) => ({ provenance: m.provenance, approvalState: m.approval_state, n: m.n })) },
      baselines: baselines.map((b) => ({ version: b.version, state: b.state, publishedAt: b.published_at })), exceptionsPending: exceptions,
      outstanding, approvals: approvals.map((e) => ({ what: e.action, by: e.actor_role, at: e.at, detail: e.detail })), refusals: refusals.map((e) => ({ what: e.action, by: e.actor_role, at: e.at, why: (e.detail as { why?: unknown }).why ?? e.detail })),
      liveHealth: 'NOT_MONITORED',
    };
  });
}

/** position · current unit · identity state for every live position of the room (the readiness, the registry and Search Party agree). */
async function roomIdentityList(q: Queryable, roomId: string, L: Loaded) {
  const { facts, assets } = await roomInstallations(q, roomId);
  return L.assets.filter((a) => !a.furniture).map((a) => identityOf(a.code, facts, assets));
}
