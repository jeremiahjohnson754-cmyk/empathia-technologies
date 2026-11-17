/**
 * Phase 1 installation documentation, on the server: the field record and redlines of a room (migration 0034).
 * Founder, 14 Nov 2026: "installation teams should tell us how everything is being mounted and have the lite design become like a
 * bluebeam redlining document … where are things mounted, hooked up to, did we change the position of a device during commissioning
 * because of a sprinkler or something in the field … give technicians everything they need"; 17 Nov 2026: "make the Phase 1 field
 * records database-backed, too."
 *
 * Four records beside the design, none of which edits it:
 *   mounting   how each device is held, in append-only versions (a correction is the next version; the earlier ones stay)
 *   hookups    what each device is actually connected to, compared with the design's proposed connections: "as designed", or
 *              "recorded in the field, not in the design". Removed once, with a reason; never deleted
 *   moves      a device installed somewhere other than designed, with the reason. PROPOSED until someone holding room.design.approve,
 *              who is not its recorder, decides. An APPROVED move is the as-built position; the checks that name the device and were
 *              recorded before the decision are listed for the commissioning engineer to look at again
 *   markups    notes pinned to the plan, OPEN until resolved with a resolution
 * Written while the room is being installed or commissioned (INSTALLATION_PENDING, INSTALLED_UNVERIFIED, COMMISSIONING). Before that
 * nothing is installed; after acceptance a change is a change order and recommissioning, not a field note.
 * Every write and every refusal is an audit row on the room, so the room's thread carries the field record's history.
 */
import type { Queryable } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import { invalid, notFound } from '../http/errors.js';
import { findRoom, type RoomRow } from './rooms.js';

export const FIELD_RECORD = ['work.evidence', 'field.scan'];
export const FIELD_DECIDE = ['room.design.approve'];
export const FIELD_MARKUP = [...FIELD_RECORD, ...FIELD_DECIDE];
export const MOUNTS: Array<{ id: string; label: string; overhead: boolean }> = [
  { id: 'ceiling-tile', label: 'Ceiling tile with a tile bridge or support', overhead: true },
  { id: 'ceiling-structure', label: 'Ceiling structure (rod, drop or pole)', overhead: true },
  { id: 'wall-bracket', label: 'Wall bracket', overhead: false },
  { id: 'wall-box', label: 'In-wall box or back box', overhead: false },
  { id: 'under-table', label: 'Under or in the table', overhead: false },
  { id: 'rack', label: 'Equipment rack (rack units)', overhead: false },
  { id: 'credenza', label: 'Credenza or AV furniture', overhead: false },
  { id: 'floor', label: 'Floor, floor box or stand', overhead: false },
  { id: 'other', label: 'Other (described in the note)', overhead: false },
];
export const MOVE_REASONS = ['sprinkler head', 'HVAC diffuser or return', 'light fixture', 'structural member', 'ceiling grid or tile layout', 'access panel', 'power or data location', 'sightline or glare', 'client or architect request', 'other'];
export const ENDS_OUTSIDE = ['building network (outside the room)', 'power circuit', 'other room or rack'];
export const WRITABLE = ['INSTALLATION_PENDING', 'INSTALLED_UNVERIFIED', 'COMMISSIONING'];

interface Pos { id: string; code: string; label: string; category: string; x: string; y: string; mount: string }
interface MountRow { position_id: string; version: number; method: string; height_m: string | null; fixing: string; backing: string; tether: string; note: string; by: string; recorded_at: string }
interface HookRow { id: string; code: string; position_id: string; port: string; to_position_id: string | null; to_outside: string | null; to_port: string; cable: string; connection_id: string | null; by: string; recorded_by: string; recorded_at: string; removed_at: string | null; removed_reason: string | null }
interface MoveRow { id: string; code: string; position_id: string; from_x: string; from_y: string; to_x: string; to_y: string; reason: string; note: string; evidence_id: string | null; state: string; by: string; recorded_by: string; recorded_at: string; decided: string | null; decided_at: string | null; decision: string | null }
interface MarkRow { code: string; x: string; y: string; body: string; state: string; by: string; recorded_at: string; resolved: string | null; resolved_at: string | null; resolution: string | null }

const agg = (room: RoomRow) => ({ type: 'Room', id: room.code });
const round2 = (n: number) => Math.round(n * 100) / 100;
const bounds = (room: RoomRow) => ({ w: Math.max(...room.geometry.points.map((p) => p[0]!)), l: Math.max(...room.geometry.points.map((p) => p[1]!)) });
const positions = async (q: Queryable, roomId: string) => (await q.query<Pos>('SELECT id, code, label, category, x, y, mount FROM app.planned_asset WHERE room_id = $1 AND NOT furniture AND removed_at IS NULL ORDER BY code', [roomId])).rows;
const code = async (q: Queryable, kind: string, prefix: string) => (await q.query<{ c: string }>('SELECT app.next_code($1, $2) AS c', [kind, prefix])).rows[0]!.c;

/** The room, locked, its device positions, and the refusal when the lifecycle does not take field notes. */
async function open(ctx: RequestContext, q: Queryable, ref: string, action: string): Promise<{ room: RoomRow; ps: Pos[] }> {
  const room = await findRoom(ctx, q, ref, true);
  if (!WRITABLE.includes(room.lifecycle)) {
    await ctx.refuse(action, agg(room), [['PLANNED', 'DESIGN_APPROVED'].includes(room.lifecycle)
      ? `${room.code} is ${room.lifecycle}: nothing is installed yet, so there is no field record to write`
      : `${room.code} is ${room.lifecycle}: its field record is closed. A change now is a change order (a new revision) and recommissioning`]);
  }
  return { room, ps: await positions(q, room.id) };
}
const device = async (ctx: RequestContext, room: RoomRow, ps: Pos[], asset: string, action: string): Promise<Pos> => {
  const p = ps.find((x) => x.code === asset);
  if (!p) await ctx.refuse(action, agg(room), [`${asset} is not a device of ${room.code}`]);
  return p!;
};

export async function recordMounting(ctx: RequestContext, ref: string, asset: string, body: { method: string; heightM?: number | null; fixing?: string; backing?: string; tether?: string; note?: string }) {
  await ctx.require(FIELD_RECORD, 'record how a device is mounted');
  return ctx.tx(async (q) => {
    const { room, ps } = await open(ctx, q, ref, 'field.mounting.record'); const p = await device(ctx, room, ps, asset, 'field.mounting.record');
    const kind = MOUNTS.find((m) => m.id === body.method); const why: string[] = [];
    if (!kind) why.push(`choose how the device is mounted: ${MOUNTS.map((m) => m.id).join(', ')}`);
    const h = body.heightM === undefined || body.heightM === null ? null : Number(body.heightM);
    if (h !== null && !(Number.isFinite(h) && h >= 0 && h <= 15)) why.push('a mounting height is in metres above the finished floor, 0–15');
    const fixing = (body.fixing || '').trim(); const backing = (body.backing || '').trim(); const note = (body.note || '').trim();
    if (kind && kind.id !== 'other' && kind.id !== 'floor' && !fixing) why.push('say how it is fixed (the bracket, anchors or hardware used)');
    if (kind?.id === 'other' && !note) why.push('describe the mounting in the note');
    const tether = body.tether === 'yes' || body.tether === 'no' ? body.tether : 'n/a';
    if (kind?.overhead && tether === 'n/a') why.push('an overhead mounting records whether a secondary safety tether is fitted (yes or no)');
    if (why.length) await ctx.refuse('field.mounting.record', agg(room), why, { asset });
    const last = (await q.query<{ v: number }>('SELECT coalesce(max(version), 0)::int AS v FROM app.field_mounting WHERE position_id = $1', [p.id])).rows[0]!.v;
    await q.query('INSERT INTO app.field_mounting (tenant_id, room_id, position_id, version, method, height_m, fixing, backing, tether, note, recorded_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
      [ctx.p.tenantId, room.id, p.id, last + 1, kind!.id, h, fixing, backing, tether, note, ctx.p.personId]);
    await ctx.audit(q, 'field.mounting.record', 'ALLOWED', agg(room), { asset, version: last + 1, method: kind!.id, heightM: h, tether });
    return { room: room.code, asset, version: last + 1, method: kind!.id, label: kind!.label, heightM: h, tether, note: last ? `Version ${last + 1}: the ${last === 1 ? 'earlier version is' : `${last} earlier versions are`} kept.` : 'Recorded.' };
  });
}

export async function recordHookup(ctx: RequestContext, ref: string, body: { device: string; port: string; to: string; toPort?: string; cable?: string }) {
  await ctx.require(FIELD_RECORD, 'record what a device is hooked up to');
  return ctx.tx(async (q) => {
    const { room, ps } = await open(ctx, q, ref, 'field.hookup.record'); const p = await device(ctx, room, ps, body.device, 'field.hookup.record');
    const port = (body.port || '').trim(); const to = (body.to || '').trim(); const why: string[] = [];
    const other = ps.find((x) => x.code === to) || null;
    if (!port) why.push('name the port on the device (as labelled on it)');
    if (!to) why.push('say what the other end is');
    else if (!other && !ENDS_OUTSIDE.includes(to)) why.push(`the other end is a device of this room or one of: ${ENDS_OUTSIDE.join(', ')}`);
    if (other && other.id === p.id) why.push('a device is not hooked up to itself');
    if (port && (await q.query('SELECT 1 FROM app.field_hookup WHERE position_id = $1 AND lower(btrim(port)) = lower($2) AND removed_at IS NULL', [p.id, port])).rowCount) why.push(`${p.code} port ${port} is already recorded as hooked up`);
    if (why.length) await ctx.refuse('field.hookup.record', agg(room), why, { device: body.device });
    // the design's proposed connection between the same two devices, either direction, when there is one
    const conn = other ? (await q.query<{ id: string; code: string }>('SELECT id, code FROM app.connection WHERE room_id = $1 AND removed_at IS NULL AND ((from_asset = $2 AND to_asset = $3) OR (from_asset = $3 AND to_asset = $2)) ORDER BY code LIMIT 1', [room.id, p.id, other.id])).rows[0] : undefined;
    const hk = await code(q, 'field_hookup', 'HK-');
    await q.query('INSERT INTO app.field_hookup (tenant_id, room_id, code, position_id, port, to_position_id, to_outside, to_port, cable, connection_id, recorded_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
      [ctx.p.tenantId, room.id, hk, p.id, port, other?.id ?? null, other ? null : to, (body.toPort || '').trim(), (body.cable || '').trim(), conn?.id ?? null, ctx.p.personId]);
    await ctx.audit(q, 'field.hookup.record', 'ALLOWED', agg(room), { hookup: hk, device: p.code, port, to, asDesigned: !!conn, connection: conn?.code ?? null });
    return { room: room.code, hookup: hk, device: p.code, port, to, asDesigned: !!conn, connection: conn?.code ?? null,
      basis: conn ? `as designed (${conn.code}: a proposed connection of the design, recorded here as found)` : 'recorded in the field, not in the design' };
  });
}

export async function removeHookup(ctx: RequestContext, ref: string, hookup: string, reason: string) {
  await ctx.require(FIELD_RECORD, 'remove a recorded hookup');
  return ctx.tx(async (q) => {
    const { room } = await open(ctx, q, ref, 'field.hookup.remove');
    const h = (await q.query<{ id: string; removed_at: string | null }>('SELECT id, removed_at FROM app.field_hookup WHERE room_id = $1 AND code = $2 FOR UPDATE', [room.id, hookup])).rows[0];
    if (!h) throw notFound(`hookup ${hookup}`);
    if (h.removed_at) await ctx.refuse('field.hookup.remove', agg(room), [`${hookup} was already removed`]);
    await q.query('UPDATE app.field_hookup SET removed_at = now(), removed_by = $2, removed_reason = $3 WHERE id = $1', [h.id, ctx.p.personId, reason.trim()]);
    await ctx.audit(q, 'field.hookup.remove', 'ALLOWED', agg(room), { hookup, reason: reason.trim() });
    return { room: room.code, hookup, removed: true, note: 'Removed from the current record; the entry and its reason are kept.' };
  });
}

export async function proposeMove(ctx: RequestContext, ref: string, body: { device: string; x: number; y: number; reason: string; note?: string; evidenceId?: string }) {
  await ctx.require(FIELD_RECORD, 'record a field move');
  return ctx.tx(async (q) => {
    const { room, ps } = await open(ctx, q, ref, 'field.move.propose'); const p = await device(ctx, room, ps, body.device, 'field.move.propose');
    const b = bounds(room); const why: string[] = []; const x = round2(Number(body.x)); const y = round2(Number(body.y)); const note = (body.note || '').trim();
    if (!MOVE_REASONS.includes(body.reason)) why.push(`choose why it moved: ${MOVE_REASONS.join(', ')}`);
    if (body.reason === 'other' && !note) why.push('describe the reason in the note');
    if (!(Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= b.w && y >= 0 && y <= b.l)) why.push(`the as-built position is inside the room (0–${b.w} m across, 0–${b.l} m deep)`);
    // where the device is now: its last approved move, or its designed position
    const last = (await q.query<{ to_x: string; to_y: string }>("SELECT to_x, to_y FROM app.field_move WHERE position_id = $1 AND state = 'APPROVED' ORDER BY decided_at DESC LIMIT 1", [p.id])).rows[0];
    const from = last ? { x: Number(last.to_x), y: Number(last.to_y) } : { x: Number(p.x), y: Number(p.y) };
    if (Number.isFinite(x) && Math.hypot(from.x - x, from.y - y) < 0.05) why.push(`the position is where ${p.code} already is: nothing moved`);
    if ((await q.query("SELECT 1 FROM app.field_move WHERE position_id = $1 AND state = 'PROPOSED'", [p.id])).rowCount) why.push(`${p.code} already has a move waiting for a decision`);
    if (body.evidenceId && !(await q.query('SELECT 1 FROM app.evidence_object WHERE id = $1', [body.evidenceId])).rowCount) why.push('the photograph is an evidence file uploaded to this organization');
    if (why.length) await ctx.refuse('field.move.propose', agg(room), why, { device: body.device });
    const fm = await code(q, 'field_move', 'FM-');
    await q.query('INSERT INTO app.field_move (tenant_id, room_id, code, position_id, from_x, from_y, to_x, to_y, reason, note, evidence_id, recorded_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
      [ctx.p.tenantId, room.id, fm, p.id, from.x, from.y, x, y, body.reason, note, body.evidenceId || null, ctx.p.personId]);
    const metres = round2(Math.hypot(from.x - x, from.y - y));
    await ctx.audit(q, 'field.move.propose', 'ALLOWED', agg(room), { move: fm, device: p.code, from, to: { x, y }, metres, reason: body.reason });
    return { room: room.code, move: fm, device: p.code, state: 'PROPOSED', from, to: { x, y }, metres, reason: body.reason,
      note: 'Proposed. It becomes the as-built position when someone holding room.design.approve, other than its recorder, approves it. The design is not edited.' };
  });
}

/** Checks of the room's plan that name the device and whose current result was recorded before `since` (or have none yet). */
async function recheck(q: Queryable, roomId: string, asset: string, since: string): Promise<Array<{ test: string; label: string; result: string | null; recordedAt: string | null }>> {
  return (await q.query<{ test: string; label: string; result: string | null; recorded_at: string | null }>(
    `SELECT r.test_id AS test, r.label, c.result_label AS result, c.recorded_at
       FROM app.cx_plan_row r LEFT JOIN app.current_result c ON c.room_id = $1 AND c.test_id = r.test_id
      WHERE r.plan_id = (SELECT id FROM app.cx_plan WHERE room_id = $1 ORDER BY compiled_at DESC, id DESC LIMIT 1) AND r.applicable AND $2 = ANY(r.devices) AND (c.recorded_at IS NULL OR c.recorded_at < $3::timestamptz) ORDER BY r.test_id`, [roomId, asset, since])).rows
    .map((x) => ({ test: x.test, label: x.label, result: x.result, recordedAt: x.recorded_at }));
}

export async function decideMove(ctx: RequestContext, ref: string, move: string, body: { approve: boolean; decision?: string }) {
  await ctx.require(FIELD_DECIDE, 'decide a field move');
  return ctx.tx(async (q) => {
    const { room } = await open(ctx, q, ref, 'field.move.decide');
    const m = (await q.query<{ id: string; state: string; recorded_by: string; position_id: string; asset: string }>('SELECT m.id, m.state, m.recorded_by, m.position_id, a.code AS asset FROM app.field_move m JOIN app.planned_asset a ON a.id = m.position_id WHERE m.room_id = $1 AND m.code = $2 FOR UPDATE OF m', [room.id, move])).rows[0];
    if (!m) throw notFound(`field move ${move}`);
    if (m.state !== 'PROPOSED') await ctx.refuse('field.move.decide', agg(room), [`${move} is already ${m.state}`]);
    await ctx.separate('field.move.decide', agg(room), [m.recorded_by], 'a field move');
    const decision = (body.decision || '').trim();
    if (!body.approve && !decision) await ctx.refuse('field.move.decide', agg(room), ['a rejection says why (what the installer should do instead)']);
    const state = body.approve ? 'APPROVED' : 'REJECTED';
    const at = (await q.query<{ decided_at: string }>('UPDATE app.field_move SET state = $2, decided_by = $3, decided_at = now(), decision = $4 WHERE id = $1 RETURNING decided_at', [m.id, state, ctx.p.personId, decision || null])).rows[0]!.decided_at;
    const again = body.approve ? await recheck(q, room.id, m.asset, at) : [];
    await ctx.audit(q, 'field.move.decide', 'ALLOWED', agg(room), { move, device: m.asset, state, decision: decision || null, recheck: again.map((x) => x.test) });
    return { room: room.code, move, device: m.asset, state, recheck: again,
      note: body.approve ? `Approved: this is where ${m.asset} is, as built. The design is not edited${again.length ? `; ${again.length} check${again.length === 1 ? '' : 's'} that name it ${again.length === 1 ? 'was' : 'were'} recorded before the move — the commissioning engineer looks at ${again.length === 1 ? 'it' : 'them'} again` : ''}.` : 'Rejected: the device stays where the design has it; the entry and the reason are kept.' };
  });
}

export async function addMarkup(ctx: RequestContext, ref: string, body: { x: number; y: number; text: string }) {
  await ctx.require(FIELD_MARKUP, 'pin a note to the field record');
  return ctx.tx(async (q) => {
    const { room } = await open(ctx, q, ref, 'field.markup.add'); const b = bounds(room); const x = round2(Number(body.x)); const y = round2(Number(body.y)); const text = (body.text || '').trim(); const why: string[] = [];
    if (!text) why.push('write what the note says');
    if (!(x >= 0 && x <= b.w && y >= 0 && y <= b.l)) why.push('pin the note inside the room');
    if (why.length) await ctx.refuse('field.markup.add', agg(room), why);
    const rl = await code(q, 'field_markup', 'RL-');
    await q.query('INSERT INTO app.field_markup (tenant_id, room_id, code, x, y, body, recorded_by) VALUES ($1,$2,$3,$4,$5,$6,$7)', [ctx.p.tenantId, room.id, rl, x, y, text, ctx.p.personId]);
    await ctx.audit(q, 'field.markup.add', 'ALLOWED', agg(room), { markup: rl, x, y });
    return { room: room.code, markup: rl, state: 'OPEN', x, y };
  });
}

export async function resolveMarkup(ctx: RequestContext, ref: string, markup: string, resolution: string) {
  await ctx.require(FIELD_MARKUP, 'resolve a field note');
  return ctx.tx(async (q) => {
    const { room } = await open(ctx, q, ref, 'field.markup.resolve');
    const m = (await q.query<{ id: string; state: string }>('SELECT id, state FROM app.field_markup WHERE room_id = $1 AND code = $2 FOR UPDATE', [room.id, markup])).rows[0];
    if (!m) throw notFound(`field note ${markup}`);
    if (m.state !== 'OPEN') await ctx.refuse('field.markup.resolve', agg(room), [`${markup} is not an open note of ${room.code}`]);
    if (!resolution.trim()) throw invalid('say how it was resolved');
    await q.query("UPDATE app.field_markup SET state = 'RESOLVED', resolved_by = $2, resolved_at = now(), resolution = $3 WHERE id = $1", [m.id, ctx.p.personId, resolution.trim()]);
    await ctx.audit(q, 'field.markup.resolve', 'ALLOWED', agg(room), { markup });
    return { room: room.code, markup, state: 'RESOLVED' };
  });
}

/** What the field record of a room holds, in numbers (also read by the room's thread). */
export async function fieldStats(q: Queryable, roomId: string) {
  const r = (await q.query<{ devices: number; mounted: number; hookups: number; not_in_design: number; hooked: number; need_hookup: number; proposed: number; approved: number; rejected: number; open_notes: number; notes: number }>(
    `WITH d AS (SELECT id FROM app.planned_asset WHERE room_id = $1 AND NOT furniture AND removed_at IS NULL),
          h AS (SELECT * FROM app.field_hookup WHERE room_id = $1 AND removed_at IS NULL),
          ends AS (SELECT from_asset AS id FROM app.connection WHERE room_id = $1 AND removed_at IS NULL UNION SELECT to_asset FROM app.connection WHERE room_id = $1 AND removed_at IS NULL)
     SELECT (SELECT count(*)::int FROM d) AS devices,
            (SELECT count(DISTINCT m.position_id)::int FROM app.field_mounting m JOIN d ON d.id = m.position_id) AS mounted,
            (SELECT count(*)::int FROM h) AS hookups, (SELECT count(*)::int FROM h WHERE connection_id IS NULL) AS not_in_design,
            (SELECT count(*)::int FROM d WHERE EXISTS (SELECT 1 FROM h WHERE h.position_id = d.id OR h.to_position_id = d.id)) AS hooked,
            (SELECT count(*)::int FROM d JOIN ends ON ends.id = d.id WHERE NOT EXISTS (SELECT 1 FROM h WHERE h.position_id = d.id OR h.to_position_id = d.id)) AS need_hookup,
            (SELECT count(*)::int FROM app.field_move WHERE room_id = $1 AND state = 'PROPOSED') AS proposed,
            (SELECT count(*)::int FROM app.field_move WHERE room_id = $1 AND state = 'APPROVED') AS approved,
            (SELECT count(*)::int FROM app.field_move WHERE room_id = $1 AND state = 'REJECTED') AS rejected,
            (SELECT count(*)::int FROM app.field_markup WHERE room_id = $1 AND state = 'OPEN') AS open_notes,
            (SELECT count(*)::int FROM app.field_markup WHERE room_id = $1) AS notes`, [roomId])).rows[0]!;
  return { devices: r.devices, mounted: r.mounted, hookups: r.hookups, notInDesign: r.not_in_design, devicesHooked: r.hooked, needHookup: r.need_hookup,
    moves: { proposed: r.proposed, approved: r.approved, rejected: r.rejected }, notes: { open: r.open_notes, total: r.notes } };
}

/** The whole field record of a room: per device its designed and as-built position, its mounting and its hookups; the moves; the notes. */
export async function fieldRecord(ctx: RequestContext, ref: string) {
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref); const ps = await positions(q, room.id); const byId = new Map(ps.map((p) => [p.id, p]));
    const mounts = (await q.query<MountRow>('SELECT m.position_id, m.version, m.method, m.height_m, m.fixing, m.backing, m.tether, m.note, p.display_name AS by, m.recorded_at FROM app.field_mounting m JOIN app.person p ON p.id = m.recorded_by WHERE m.room_id = $1 ORDER BY m.position_id, m.version DESC', [room.id])).rows;
    const hooks = (await q.query<HookRow>('SELECT h.id, h.code, h.position_id, h.port, h.to_position_id, h.to_outside, h.to_port, h.cable, h.connection_id, p.display_name AS by, h.recorded_by, h.recorded_at, h.removed_at, h.removed_reason FROM app.field_hookup h JOIN app.person p ON p.id = h.recorded_by WHERE h.room_id = $1 ORDER BY h.code', [room.id])).rows;
    const moves = (await q.query<MoveRow>('SELECT m.id, m.code, m.position_id, m.from_x, m.from_y, m.to_x, m.to_y, m.reason, m.note, m.evidence_id, m.state, p.display_name AS by, m.recorded_by, m.recorded_at, d.display_name AS decided, m.decided_at, m.decision FROM app.field_move m JOIN app.person p ON p.id = m.recorded_by LEFT JOIN app.person d ON d.id = m.decided_by WHERE m.room_id = $1 ORDER BY m.code', [room.id])).rows;
    const marks = (await q.query<MarkRow>('SELECT k.code, k.x, k.y, k.body, k.state, p.display_name AS by, k.recorded_at, r.display_name AS resolved, k.resolved_at, k.resolution FROM app.field_markup k JOIN app.person p ON p.id = k.recorded_by LEFT JOIN app.person r ON r.id = k.resolved_by WHERE k.room_id = $1 ORDER BY k.code', [room.id])).rows;
    const conns = (await q.query<{ id: string; code: string; from_asset: string; to_asset: string; kind: string }>('SELECT id, code, from_asset, to_asset, kind FROM app.connection WHERE room_id = $1 AND removed_at IS NULL ORDER BY code', [room.id])).rows;
    const connCode = new Map(conns.map((c) => [c.id, c.code])); const live = hooks.filter((h) => !h.removed_at);
    const hookView = (h: HookRow) => ({ hookup: h.code, device: byId.get(h.position_id)?.code ?? null, port: h.port, to: h.to_position_id ? byId.get(h.to_position_id)?.code ?? null : h.to_outside, toPort: h.to_port, cable: h.cable,
      asDesigned: !!h.connection_id, connection: h.connection_id ? connCode.get(h.connection_id) ?? null : null, by: h.by, at: h.recorded_at, removed: h.removed_at ? { at: h.removed_at, reason: h.removed_reason } : null });
    const moveView = (m: MoveRow) => ({ move: m.code, device: byId.get(m.position_id)?.code ?? null, state: m.state, from: { x: Number(m.from_x), y: Number(m.from_y) }, to: { x: Number(m.to_x), y: Number(m.to_y) },
      metres: round2(Math.hypot(Number(m.from_x) - Number(m.to_x), Number(m.from_y) - Number(m.to_y))), reason: m.reason, note: m.note, evidenceId: m.evidence_id, by: m.by, at: m.recorded_at,
      decidedBy: m.decided, decidedAt: m.decided_at, decision: m.decision, mayDecide: m.state === 'PROPOSED' && ctx.can(FIELD_DECIDE) && m.recorded_by !== ctx.p.personId });
    const devices = [];
    for (const p of ps) {
      const versions = mounts.filter((m) => m.position_id === p.id); const mv = [...moves].reverse().find((m) => m.position_id === p.id && m.state === 'APPROVED') || null;
      const ends = new Set(conns.filter((c) => c.from_asset === p.id || c.to_asset === p.id).map((c) => c.code));
      devices.push({ asset: p.code, label: p.label, category: p.category, designed: { x: Number(p.x), y: Number(p.y), mount: p.mount },
        asBuilt: mv ? { x: Number(mv.to_x), y: Number(mv.to_y), moved: mv.code } : { x: Number(p.x), y: Number(p.y), moved: null },
        mounting: versions[0] ? { version: versions[0].version, method: versions[0].method, label: MOUNTS.find((k) => k.id === versions[0]!.method)?.label ?? versions[0].method, heightM: versions[0].height_m === null ? null : Number(versions[0].height_m), fixing: versions[0].fixing, backing: versions[0].backing, tether: versions[0].tether, note: versions[0].note, by: versions[0].by, at: versions[0].recorded_at, earlier: versions.length - 1 } : null,
        hookups: live.filter((h) => h.position_id === p.id || h.to_position_id === p.id).map((h) => h.code), designedConnections: [...ends],
        recheck: mv && mv.decided_at ? await recheck(q, room.id, p.code, mv.decided_at) : [] });
    }
    return { room: { code: room.code, name: room.name, lifecycle: room.lifecycle, bounds: bounds(room) }, writable: WRITABLE.includes(room.lifecycle), devices,
      hookups: hooks.map(hookView), moves: moves.map(moveView), markups: marks.map((k) => ({ markup: k.code, x: Number(k.x), y: Number(k.y), text: k.body, state: k.state, by: k.by, at: k.recorded_at, resolvedBy: k.resolved, resolvedAt: k.resolved_at, resolution: k.resolution })),
      designConnections: conns.map((c) => ({ code: c.code, from: byId.get(c.from_asset)?.code ?? null, to: byId.get(c.to_asset)?.code ?? null, kind: c.kind, basis: 'PROPOSED: designed, not traced' })),
      stats: await fieldStats(q, room.id), may: { record: ctx.can(FIELD_RECORD), decide: ctx.can(FIELD_DECIDE), note: ctx.can(FIELD_MARKUP) },
      catalogue: { mounts: MOUNTS, moveReasons: MOVE_REASONS, endsOutside: ENDS_OUTSIDE },
      basis: 'What the installation team recorded, by person and time. The design is not edited by it: an approved move is the as-built position beside the designed one, and a hookup says whether it matches a proposed connection of the design.' };
  });
}
