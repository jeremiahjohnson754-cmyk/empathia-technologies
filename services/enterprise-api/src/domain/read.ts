/** Read-side queries. Every read runs inside a tenant-scoped transaction (row-level security) and respects site scope. */
import { Graph, neighbourhood, impact, type Edge } from '@empathia/relationship-engine';
import { resultCounts } from '@empathia/commissioning-engine';
import type { RequestContext } from '../auth/context.js';
import { drawingStates, findRoom, load } from './rooms.js';
import { invalid, notFound } from '../http/errors.js';

export async function listRooms(ctx: RequestContext, opts: { lifecycle?: string | null; after?: string | null; limit?: number }) {
  const limit = Math.min(Math.max(opts.limit || 50, 1), 200);
  return ctx.tx(async (q) => {
    const args: unknown[] = [limit + 1]; let where = 'true';
    if (opts.lifecycle) { args.push(opts.lifecycle); where += ` AND r.lifecycle = $${args.length}`; }
    if (opts.after) { args.push(opts.after); where += ` AND r.code > $${args.length}`; }
    if (ctx.p.siteScope?.length) { args.push(ctx.p.siteScope); where += ` AND b.site_id = ANY($${args.length}::uuid[])`; }
    const rows = (await q.query<Record<string, unknown>>(`SELECT r.code, r.name, r.lifecycle, r.template, r.occupancy, b.code AS building, r.classification->>'archetypeName' AS archetype, r.rev, r.updated_at FROM app.room r JOIN app.building b ON b.id = r.building_id WHERE ${where} ORDER BY r.code LIMIT $1`, args)).rows;
    const more = rows.length > limit; const items = rows.slice(0, limit);
    return { items, next: more ? String(items[items.length - 1]!['code']) : null };
  });
}

export async function getRoom(ctx: RequestContext, ref: string) {
  return ctx.tx(async (q) => {
    const L = await load(ctx, q, ref);
    const plan = (await q.query<Record<string, unknown>>('SELECT id, design_rev, engine_version, rule_version, library_size, applicable, context, trigger, compiled_at FROM app.cx_plan WHERE room_id = $1 ORDER BY compiled_at DESC, id DESC LIMIT 1', [L.room.id])).rows[0] || null;
    const rows = plan ? (await q.query<Record<string, unknown>>('SELECT test_id, label, pack, domain, phase, tier, applicable, status, why, personas, evidence, instrument, devices FROM app.cx_plan_row WHERE plan_id = $1 ORDER BY applicable DESC, phase, tier, test_id', [plan['id']])).rows : [];
    const labels = new Map((await q.query<{ test_id: string; result_label: string }>('SELECT test_id, result_label FROM app.current_result WHERE room_id = $1', [L.room.id])).rows.map((r) => [r.test_id, r.result_label]));
    const withResult: Array<Record<string, unknown> & { result: string }> = rows.map((r) => ({ ...r, result: labels.get(String(r['test_id'])) || 'NOT_TESTED' }));   // R3-2: never a bare PASS
    const issues = (await q.query<Record<string, unknown>>('SELECT code, key, category, check_name, severity, title, rationale, assets, state, owner_role, resolution, first_seen_rev, last_seen_rev, created_at, updated_at FROM app.room_issue WHERE room_id = $1 ORDER BY state, severity, code', [L.room.id])).rows;
    const revisions = (await q.query<Record<string, unknown>>('SELECT rev_no, reason, sha256, created_by, created_at FROM app.room_revision WHERE room_id = $1 ORDER BY rev_no', [L.room.id])).rows;
    const drawings = (await drawingStates(q, L)).map(({ kind, state, revNo, approvedBy }) => ({ kind, state, revNo, approvedBy }));
    const counts = resultCounts(withResult.map((r) => ({ id: String(r['test_id']), applicable: !!r['applicable'], result: r.result } as never)), L.results);
    return {
      room: { code: L.room.code, id: L.room.id, name: L.room.name, lifecycle: L.room.lifecycle, template: L.room.template, intendedUse: L.room.intended_use, occupancy: L.room.occupancy, unit: L.room.unit, geometry: L.room.geometry, rev: L.room.rev, approvedRevision: L.room.approved_revision, classification: L.room.classification, approvedClassification: L.room.approved_class, liveHealth: 'NOT_MONITORED' },
      devices: L.input.devices, connections: L.input.connections, drawings, revisions, issues,
      commissioning: plan ? { planId: plan['id'], engineVersion: plan['engine_version'], ruleVersion: plan['rule_version'], library: plan['library_size'], applicable: plan['applicable'], context: plan['context'], compiledAt: plan['compiled_at'], counts, rows: withResult } : null,
    };
  });
}

export async function revisions(ctx: RequestContext, ref: string, a: number, b: number) {
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref);
    const rows = (await q.query<{ rev_no: number; snapshot: { devices: Array<{ id: string; label: string; x: number; y: number; mount: string; model: string; cat: string }>; connections: Array<{ id: string }>; geometry: Record<string, unknown> } }>('SELECT rev_no, snapshot FROM app.room_revision WHERE room_id = $1 AND rev_no = ANY($2::int[])', [room.id, [a, b]])).rows;
    const A = rows.find((r) => r.rev_no === a); const B = rows.find((r) => r.rev_no === b);
    if (!A || !B) throw notFound('revision');
    const ia = new Map(A.snapshot.devices.map((x) => [x.id, x])); const ib = new Map(B.snapshot.devices.map((x) => [x.id, x]));
    const ca = new Set(A.snapshot.connections.map((c) => c.id)); const cb = new Set(B.snapshot.connections.map((c) => c.id));
    const moved = []; const swapped = [];
    for (const [id, x] of ib) { const y = ia.get(id); if (!y) continue; if (Math.hypot(x.x - y.x, x.y - y.y) > 0.05 || x.mount !== y.mount) moved.push({ id, from: [y.x, y.y, y.mount], to: [x.x, x.y, x.mount] }); if (x.model !== y.model || x.cat !== y.cat) swapped.push({ id, from: `${y.cat}:${y.model}`, to: `${x.cat}:${x.model}` }); }
    return {
      a, b, geometry: ['lengthM', 'widthM', 'ceiling', 'shape'].filter((k) => A.snapshot.geometry[k] !== B.snapshot.geometry[k]).map((k) => ({ field: k, from: A.snapshot.geometry[k], to: B.snapshot.geometry[k] })),
      added: B.snapshot.devices.filter((x) => !ia.has(x.id)).map((x) => ({ id: x.id, label: x.label })), removed: A.snapshot.devices.filter((x) => !ib.has(x.id)).map((x) => ({ id: x.id, label: x.label })),
      moved, swapped, connectionsAdded: [...cb].filter((x) => !ca.has(x)), connectionsRemoved: [...ca].filter((x) => !cb.has(x)),
    };
  });
}

export async function serviceHistory(ctx: RequestContext, ref: string) {
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref);
    const wo = (await q.query<Record<string, unknown>>('SELECT w.code, w.state, w.assigned_role, w.note, w.created_at, w.closed_at, w.closing_note, i.code AS issue FROM app.work_order w JOIN app.room_issue i ON i.id = w.issue_id WHERE i.room_id = $1 ORDER BY w.created_at', [room.id])).rows;
    const events = (await q.query<Record<string, unknown>>('SELECT e.kind, e.detail, e.at, i.code AS issue FROM app.issue_event e JOIN app.room_issue i ON i.id = e.issue_id WHERE i.room_id = $1 ORDER BY e.id', [room.id])).rows;
    return { room: room.code, workOrders: wo, issueEvents: events };
  });
}

export async function readModel(ctx: RequestContext, ref?: string) {
  return ctx.tx(async (q) => {
    if (ref) { const room = await findRoom(ctx, q, ref); const r = (await q.query('SELECT * FROM app.room_read_model WHERE room_id = $1', [room.id])).rows[0]; if (!r) throw notFound(`read model for ${room.code} (not built yet: the outbox worker builds it)`); return r; }
    const scope = ctx.p.siteScope?.length ? ' JOIN app.room r ON r.id = m.room_id JOIN app.building b ON b.id = r.building_id WHERE b.site_id = ANY($1::uuid[])' : '';
    return { items: (await q.query(`SELECT m.* FROM app.room_read_model m${scope} ORDER BY m.room_code`, scope ? [ctx.p.siteScope] : [])).rows };
  });
}

export async function graph(ctx: RequestContext, type: string, id: string, depth: number) {
  if (!/^[A-Za-z]{2,40}$/.test(type)) throw invalid('type must be a node type name');
  if (!Number.isInteger(depth) || depth < 1 || depth > 4) throw invalid('depth is 1 to 4');
  return ctx.tx(async (q) => {
    const rows = (await q.query<{ from_type: string; from_id: string; rel: string; to_type: string; to_id: string; provenance: string }>('SELECT from_type, from_id, rel, to_type, to_id, provenance FROM app.relationship WHERE removed_at IS NULL')).rows;
    // visibility: rooms (and what hangs off them) outside the caller's site scope are not shown
    let visibleRooms: Set<string> | null = null;
    if (ctx.p.siteScope?.length) visibleRooms = new Set((await q.query<{ code: string }>('SELECT r.code FROM app.room r JOIN app.building b ON b.id = r.building_id WHERE b.site_id = ANY($1::uuid[])', [ctx.p.siteScope])).rows.map((r) => r.code));
    const g = new Graph(rows.map((r): Edge => ({ from: { type: r.from_type, id: r.from_id }, rel: r.rel, to: { type: r.to_type, id: r.to_id }, provenance: r.provenance })));
    // a planned asset or a room issue belongs to its room: outside the scope, it is invisible too (not just the room node)
    const owner = new Map<string, string>();
    for (const r of rows) { if (r.rel === 'PLANS_DEVICE' && r.from_type === 'Room') owner.set(`${r.to_type}:${r.to_id}`, r.from_id); if (r.rel === 'AFFECTS' && r.to_type === 'Room') owner.set(`${r.from_type}:${r.from_id}`, r.to_id); }
    const canSee = (n: { type: string; id: string }) => !visibleRooms || (n.type === 'Room' ? visibleRooms.has(n.id) : !owner.has(`${n.type}:${n.id}`) || visibleRooms.has(owner.get(`${n.type}:${n.id}`)!));
    const start = { type, id };
    if (!canSee(start) || (!g.outgoing(start).length && !g.incoming(start).length)) throw notFound(`${type} ${id} in the graph`);
    return { start, depth, nodes: neighbourhood(g, start, depth, canSee), impact: impact(g, start, undefined, canSee) };
  });
}
