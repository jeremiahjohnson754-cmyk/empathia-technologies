/**
 * The governed project lifecycle (ADR-0008, P5) over the @empathia/project-governance engine: intake → review → brief → approval →
 * collaborative design → execution/handoff → operational transition. Every step is authority-checked (deny by default), guarded by
 * the engine with every reason named, separated where the demonstrator separated it (the brief's author is never its approver; the
 * revision's author never releases it), audited, and emitted on the outbox with the demonstrator's event names. Execution facts are
 * read from the rooms' own governed lifecycle — a project is never "tests verified" by assertion.
 */
import type { Queryable } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import { ApiError, invalid, notFound } from '../http/errors.js';
import { defaultCatalog } from '@empathia/commissioning-engine';
import { EXECUTION_STATES, GOVERNANCE_TRANSITIONS, DELIVERY_TRANSITIONS, REOPEN_FROM, governanceBlockers, deliveryBlockers, stageOf, transition, type GovernanceState, type DeliveryState, type GovernanceFacts, type DeliveryFacts } from '@empathia/project-governance';

interface ProjectRow { id: string; code: string; name: string; state: string; concept_authorized_by: string | null; concept_authorized_at: string | null; concept_scope_rev: number | null; request_id: string | null; type: string | null; governance: GovernanceState; delivery: DeliveryState | null; scope_rev: number; vendor_id: string | null; internal_only: boolean; exception_reason: string | null; approver_id: string | null; support_owner_id: string | null; qa_signoff_by: string | null; rule_pack_version: string | null; field_authorization: Record<string, unknown> | null; created_by: string | null; created_at: string; updated_at: string }
interface RequestRow { id: string; code: string; type: string; title: string; intent: string; constraints: string; site_id: string | null; building_id: string | null; room_id: string | null; provisional_room: string | null; archetype: string | null; capacity: number | null; photo_policy: string; photos: unknown[]; plans: unknown[]; dimensions: unknown[]; programme: boolean; state: string; requester_id: string; vendor_id: string | null; internal_only: boolean; submitted_at: string | null; withdrawn_at: string | null; withdrawn_reason: string | null; project_id: string | null; created_at: string }

const PRJ = (code: string) => ({ type: 'Project', id: code });
const REQ = (code: string) => ({ type: 'Request', id: code });
const DOMAIN_AUTHORITY: Record<string, string> = { dsp: 'review.dsp', camera: 'review.camera', touch: 'review.touch' };

interface RequestTypeRow { key: string; label: string; summary: string; industry: string; source: string; enabled: boolean; sort: number; tenant_id: string | null }
/** The effective request catalogue: platform defaults ∪ the tenant's own rows (a tenant row with a default's key overrides it). */
export async function requestTypes(q: Queryable): Promise<Array<RequestTypeRow & { scope: 'default' | 'tenant' }>> {
  const rows = (await q.query<RequestTypeRow>('SELECT key, label, summary, industry, source, enabled, sort, tenant_id FROM app.request_type ORDER BY tenant_id NULLS FIRST, sort, key')).rows;
  const by = new Map<string, RequestTypeRow & { scope: 'default' | 'tenant' }>();
  for (const r of rows) by.set(r.key, { ...r, scope: r.tenant_id ? 'tenant' : 'default' });
  return [...by.values()].sort((a, b) => a.sort - b.sort || a.key.localeCompare(b.key));
}
export async function catalogue(ctx: RequestContext) {
  return ctx.tx(async (q) => ({ requestTypes: (await requestTypes(q)).map(({ tenant_id: _, ...t }) => t), governance: GOVERNANCE_TRANSITIONS, delivery: DELIVERY_TRANSITIONS, executionStates: EXECUTION_STATES,
    note: 'The two state machines are carried over verbatim from the V2.5.3 demonstrator; a guard refuses with every reason named. The nine default request types are provisionally approved (owner, 2026-10-30); a tenant extends or disables them through POST /v1/admin/request-types. Concept work (preliminary design, feasibility, concept layouts, preliminary budgets) starts on concept authorization; release for construction and every field step need funding (execution authorization).' }));
}
/** Administration: add or change a tenant request type (an industry- or customer-specific kind), or disable a default for this tenant. */
export async function upsertRequestType(ctx: RequestContext, body: { key: string; label?: string; summary?: string; industry?: string; enabled?: boolean; sort?: number }) {
  await ctx.require('policy.configure', 'configure the request catalogue');
  if (!/^[a-z][a-z0-9_]{1,39}$/.test(body.key)) throw invalid('a request type key is lower-case letters, digits and underscores (2–40 characters)');
  return ctx.tx(async (q) => {
    const cur = (await requestTypes(q)).find((t) => t.key === body.key);
    const label = body.label ?? cur?.label; if (!label) throw invalid('a new request type needs a label');
    await q.query(`INSERT INTO app.request_type (tenant_id, key, label, summary, industry, source, enabled, sort, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (tenant_id, key) WHERE tenant_id IS NOT NULL DO UPDATE SET label = EXCLUDED.label, summary = EXCLUDED.summary, industry = EXCLUDED.industry, enabled = EXCLUDED.enabled, sort = EXCLUDED.sort, updated_at = now()`,
      [ctx.p.tenantId, body.key, label, body.summary ?? cur?.summary ?? '', body.industry ?? cur?.industry ?? 'general', cur?.scope === 'default' ? `tenant override of the default (${cur.source})` : 'tenant configuration', body.enabled ?? cur?.enabled ?? true, body.sort ?? cur?.sort ?? 100, ctx.p.personId]);
    await ctx.audit(q, 'admin.request_type_upsert', 'ALLOWED', { type: 'RequestType', id: body.key }, { label, enabled: body.enabled ?? cur?.enabled ?? true, overridesDefault: cur?.scope === 'default' });
    return { key: body.key, label, enabled: body.enabled ?? cur?.enabled ?? true, scope: 'tenant' };
  });
}

async function findRequest(ctx: RequestContext, q: Queryable, code: string, lock = false): Promise<RequestRow> {
  const r = (await q.query<RequestRow>(`SELECT * FROM app.project_request WHERE code = $1${lock ? ' FOR UPDATE' : ''}`, [code])).rows[0];
  if (!r) throw notFound(`request ${code}`);
  if (ctx.p.siteScope?.length && r.site_id && !ctx.p.siteScope.includes(r.site_id)) throw notFound(`request ${code}`);
  return r;
}
export async function findProject(ctx: RequestContext, q: Queryable, code: string, lock = false): Promise<ProjectRow> {
  const p = (await q.query<ProjectRow>(`SELECT * FROM app.project WHERE code = $1${lock ? ' FOR UPDATE' : ''}`, [code])).rows[0];
  if (!p) throw notFound(`project ${code}`);
  if (ctx.p.siteScope?.length && p.request_id) {
    const site = (await q.query<{ site_id: string | null }>('SELECT site_id FROM app.project_request WHERE id = $1', [p.request_id])).rows[0]?.site_id;
    if (site && !ctx.p.siteScope.includes(site)) throw notFound(`project ${code}`);
  }
  return p;
}
const holds = async (q: Queryable, personId: string, authority: string): Promise<boolean> => (await q.query<{ ok: boolean }>(`SELECT EXISTS (SELECT 1 FROM app.membership m JOIN app.role r ON r.key = m.role_key WHERE m.person_id = $1 AND m.tenant_id = app.current_tenant() AND ('*' = ANY(r.authorities) OR $2 = ANY(r.authorities))) AS ok`, [personId, authority])).rows[0]!.ok;

// ------------------------------------------------------------------------------------------------------------ intake
export interface RequestInput { type: string; title: string; intent: string; constraints?: string; siteCode: string; buildingCode?: string; roomCode?: string; provisionalRoom?: string; archetype?: string; capacity?: number; photoPolicy?: string; photos?: Array<{ name: string }>; plans?: Array<{ name: string }>; dimensions?: Array<{ name: string; value: number; unit: string; source: string; uncertainty: string }>; programme?: boolean; vendorEmail?: string | null }
export async function createRequest(ctx: RequestContext, body: RequestInput) {
  await ctx.require('request.submit', 'raise a request');
  return ctx.tx(async (q) => {
    const types = await requestTypes(q); const t = types.find((x) => x.key === body.type);
    if (!t || !t.enabled) throw invalid(`unknown or disabled request type ${body.type}; one of ${types.filter((x) => x.enabled).map((x) => x.key).join(', ')}`);
    const site = (await q.query<{ id: string }>('SELECT id FROM app.site WHERE code = $1', [body.siteCode])).rows[0];
    if (!site) throw invalid(`unknown site ${body.siteCode}`);
    if (ctx.p.siteScope?.length && !ctx.p.siteScope.includes(site.id)) throw invalid(`site ${body.siteCode} is outside your site scope`);
    const building = body.buildingCode ? (await q.query<{ id: string }>('SELECT id FROM app.building WHERE code = $1 AND site_id = $2', [body.buildingCode, site.id])).rows[0] : null;
    if (body.buildingCode && !building) throw invalid(`unknown building ${body.buildingCode} at ${body.siteCode}`);
    const room = body.roomCode ? (await q.query<{ id: string }>('SELECT id FROM app.room WHERE code = $1', [body.roomCode])).rows[0] : null;
    if (body.roomCode && !room) throw invalid(`unknown room ${body.roomCode}`);
    let vendorId: string | null = null;
    if (body.vendorEmail) { const v = (await q.query<{ id: string }>("SELECT p.id FROM app.person p JOIN app.membership m ON m.person_id = p.id AND m.tenant_id = app.current_tenant() WHERE p.email = $1 AND m.role_key = 'vendor'", [body.vendorEmail])).rows[0]; if (!v) throw invalid(`no supplier contact with the email ${body.vendorEmail} in this organization`); vendorId = v.id; }
    const dims = (body.dimensions || []).map((d) => { if (!(d.value > 0) || !d.unit || !d.source || !d.uncertainty) throw invalid('every dimension carries value, unit, source and uncertainty (nothing is guessed)'); return { name: String(d.name), value: Number(d.value), unit: String(d.unit), source: String(d.source), uncertainty: String(d.uncertainty) }; });
    const code = (await q.query<{ c: string }>("SELECT app.next_code('request', 'REQ-') AS c")).rows[0]!.c;
    const r = await q.query<{ id: string }>(`INSERT INTO app.project_request (tenant_id, code, type, title, intent, constraints, site_id, building_id, room_id, provisional_room, archetype, capacity, photo_policy, photos, plans, dimensions, programme, requester_id, vendor_id, internal_only)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id`,
      [ctx.p.tenantId, code, body.type, String(body.title).slice(0, 160), String(body.intent || ''), String(body.constraints || ''), site.id, building?.id || null, room?.id || null, room ? null : body.provisionalRoom || null, body.archetype || null, body.capacity ?? null, body.photoPolicy || 'DOCUMENTATION_REQUIRED',
        JSON.stringify((body.photos || []).map((p) => ({ name: String(p.name), takenAt: new Date().toISOString(), by: ctx.p.personId, locationVerified: false }))), JSON.stringify((body.plans || []).map((p) => ({ name: String(p.name), state: 'UPLOADED', extraction: 'NOT_RUN' }))), JSON.stringify(dims), !!body.programme, ctx.p.personId, vendorId, !vendorId]);
    await ctx.audit(q, 'request.create', 'ALLOWED', REQ(code), { type: body.type, site: body.siteCode });
    return { code, id: r.rows[0]!.id, state: 'DRAFT' };
  });
}

/** Submitting a request creates its project (the demonstrator did the same) in governance state SUBMITTED. */
export async function submitRequest(ctx: RequestContext, code: string) {
  await ctx.require('request.submit', 'submit a request', REQ(code));
  return ctx.tx(async (q) => {
    const r = await findRequest(ctx, q, code, true);
    if (r.requester_id !== ctx.p.personId && !ctx.can('*')) await ctx.refuse('request.submit', REQ(code), ['only the requester submits their own request']);
    if (r.state !== 'DRAFT') await ctx.refuse('request.submit', REQ(code), [`the request is ${r.state}`]);
    const site = r.site_id ? (await q.query<{ code: string }>('SELECT code FROM app.site WHERE id = $1', [r.site_id])).rows[0]?.code || null : null;
    const facts: GovernanceFacts = { state: 'DRAFT', scopeRev: 1, request: { siteCode: site, type: r.type, intent: r.intent, photoPolicy: r.photo_policy, photos: r.photos.length }, routedVendorId: r.vendor_id, brief: null, approverId: null, approverEligible: false, actorId: ctx.p.personId, delegated: false, delegationExpired: false };
    const why = governanceBlockers('SUBMITTED', facts); if (why.length) await ctx.refuse('request.submit', REQ(code), why);
    const pcode = code.replace(/^REQ-/, 'PRJ-REQ-');
    const p = await q.query<{ id: string }>('INSERT INTO app.project (tenant_id, code, name, created_by, request_id, type, governance, vendor_id, internal_only) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id', [ctx.p.tenantId, pcode, r.title, ctx.p.personId, r.id, r.type, 'SUBMITTED', r.vendor_id, !r.vendor_id]);
    await q.query("UPDATE app.project_request SET state = 'SUBMITTED', submitted_at = now(), project_id = $2, updated_at = now() WHERE id = $1", [r.id, p.rows[0]!.id]);
    if (r.room_id) await q.query('UPDATE app.room SET project_id = $2 WHERE id = $1 AND project_id IS NULL', [r.room_id, p.rows[0]!.id]);
    const roomCode = r.room_id ? (await q.query<{ code: string }>('SELECT code FROM app.room WHERE id = $1', [r.room_id])).rows[0]!.code : `PROVISIONAL:${r.provisional_room || 'room'}`;
    await ctx.emit(q, 'request.submitted', { type: 'Request', id: code, rev: 1 }, { requestId: code, siteId: site, roomId: roomCode, photoPolicy: r.photo_policy, projectId: pcode });
    await ctx.audit(q, 'request.submit', 'ALLOWED', REQ(code), { project: pcode });
    return { code, state: 'SUBMITTED', project: pcode };
  });
}

export async function withdrawRequest(ctx: RequestContext, code: string, reason: string) {
  await ctx.require('request.withdraw', 'withdraw a request', REQ(code));
  if (!reason || reason.length < 8) throw invalid('a withdrawal needs a reason');
  return ctx.tx(async (q) => {
    const r = await findRequest(ctx, q, code, true);
    if (r.requester_id !== ctx.p.personId && !ctx.can('*')) await ctx.refuse('request.withdraw', REQ(code), ['only the requester withdraws their own request']);
    if (r.state === 'WITHDRAWN') await ctx.refuse('request.withdraw', REQ(code), ['already withdrawn']);
    if (r.project_id) { const p = (await q.query<ProjectRow>('SELECT * FROM app.project WHERE id = $1', [r.project_id])).rows[0]!; if (['APPROVED', 'FUNDED'].includes(p.governance) || p.delivery) await ctx.refuse('request.withdraw', REQ(code), [`the project ${p.code} is ${p.governance}: an approved project is suspended by finance, not withdrawn by its requester`]); }
    await q.query("UPDATE app.project_request SET state = 'WITHDRAWN', withdrawn_at = now(), withdrawn_reason = $2, updated_at = now() WHERE id = $1", [r.id, reason]);
    await ctx.emit(q, 'request.cancelled', { type: 'Request', id: code, rev: 2 }, { requestId: code, reason });
    await ctx.audit(q, 'request.withdraw', 'ALLOWED', REQ(code), { reason });
    return { code, state: 'WITHDRAWN' };
  });
}

export async function listRequests(ctx: RequestContext) {
  return ctx.tx(async (q) => {
    const scope = ctx.p.siteScope;
    const rows = (await q.query<RequestRow & { site: string | null; project: string | null }>(`SELECT r.*, s.code AS site, p.code AS project FROM app.project_request r LEFT JOIN app.site s ON s.id = r.site_id LEFT JOIN app.project p ON p.id = r.project_id WHERE ${scope?.length ? 'r.site_id = ANY($1::uuid[])' : 'true'} ORDER BY r.created_at DESC`, scope?.length ? [scope] : [])).rows;
    // a requester sees their own requests; everyone else with a project authority sees the tenant's (within site scope)
    const mine = !ctx.can(['route.internal', 'pitch.submit', 'project.decide', 'funding.authorize', 'brief.approve', 'design.submit', 'design.release', 'vendor.acknowledge', 'scope.revise']);
    return { items: rows.filter((r) => !mine || r.requester_id === ctx.p.personId).map((r) => ({ code: r.code, type: r.type, title: r.title, state: r.state, site: r.site, project: r.project, photoPolicy: r.photo_policy, programme: r.programme, createdAt: r.created_at, submittedAt: r.submitted_at })) };
  });
}

// ------------------------------------------------------------------------------------------------------------ governance facts and steps
async function governanceFacts(ctx: RequestContext, q: Queryable, p: ProjectRow, extra: Partial<GovernanceFacts> = {}): Promise<GovernanceFacts> {
  const r = p.request_id ? (await q.query<RequestRow & { site: string | null }>('SELECT r.*, s.code AS site FROM app.project_request r LEFT JOIN app.site s ON s.id = r.site_id WHERE r.id = $1', [p.request_id])).rows[0] : null;
  const brief = (await q.query<{ rev: number; scope_rev: number; author_id: string }>('SELECT rev, scope_rev, author_id FROM app.project_brief WHERE project_id = $1 ORDER BY rev DESC LIMIT 1', [p.id])).rows[0];
  const d = ctx.delegationFor('project.decide');
  return {
    state: p.governance, scopeRev: p.scope_rev,
    request: { siteCode: r?.site || null, type: p.type, intent: r?.intent || null, photoPolicy: r?.photo_policy || null, photos: r?.photos.length || 0 },
    routedVendorId: p.vendor_id, brief: brief ? { rev: brief.rev, scopeRev: brief.scope_rev, authorId: brief.author_id } : null,
    approverId: p.approver_id, approverEligible: p.approver_id ? await holds(q, p.approver_id, 'project.decide') : false,
    actorId: ctx.p.personId, delegated: !!d, delegationExpired: !!d && Date.parse(d.expiresAt) <= Date.now(), ...extra,
  };
}
async function step(ctx: RequestContext, q: Queryable, p: ProjectRow, to: GovernanceState, action: string, facts: GovernanceFacts, detail: Record<string, unknown> = {}) {
  const t = transition(GOVERNANCE_TRANSITIONS, p.governance, to);
  const why = governanceBlockers(to, facts); if (why.length) await ctx.refuse(action, PRJ(p.code), why, { from: p.governance, to });
  await q.query('UPDATE app.project SET governance = $2, updated_at = now() WHERE id = $1', [p.id, to]);
  await ctx.audit(q, action, 'ALLOWED', PRJ(p.code), { from: p.governance, to, guard: t?.guard, ...detail });
}

/** Review: the operations lead records an internal route (documented exception) or the routed supplier acknowledges. */
export async function route(ctx: RequestContext, code: string, body: { route: 'internal' | 'vendor'; exceptionReason?: string }) {
  if (body.route === 'internal') await ctx.require('route.internal', 'route a request internally', PRJ(code)); else await ctx.require('vendor.acknowledge', 'acknowledge a request', PRJ(code));
  return ctx.tx(async (q) => {
    const p = await findProject(ctx, q, code, true);
    if (body.route === 'internal') {
      const facts = await governanceFacts(ctx, q, p, { exceptionReason: body.exceptionReason || null });
      await step(ctx, q, p, 'INTERNAL_ROUTE_RECORDED', 'project.route_internal', facts, { exceptionReason: body.exceptionReason });
      await q.query('UPDATE app.project SET internal_only = true, exception_reason = $2 WHERE id = $1', [p.id, body.exceptionReason]);
      return { code, governance: 'INTERNAL_ROUTE_RECORDED' };
    }
    const facts = await governanceFacts(ctx, q, p, { acknowledgingVendorId: ctx.p.personId });
    await step(ctx, q, p, 'VENDOR_ACKNOWLEDGED', 'vendor.acknowledge', facts);
    await ctx.emit(q, 'vendor.request_acknowledged', { type: 'Project', id: code, rev: p.scope_rev }, { requestId: (await q.query<{ code: string }>('SELECT code FROM app.project_request WHERE id = $1', [p.request_id])).rows[0]?.code || code, projectId: code, vendorId: ctx.p.personId });
    return { code, governance: 'VENDOR_ACKNOWLEDGED' };
  });
}

/** Brief: a versioned engineering brief bound to the current scope revision; submitting it makes the project PITCH_READY. */
export async function submitBrief(ctx: RequestContext, code: string, body: { summary: string; requirements: string[]; assumptions?: string[]; romUsd?: number; comparableRooms?: string[]; spatial?: Record<string, unknown> }) {
  await ctx.require('pitch.submit', 'submit the engineering brief', PRJ(code));
  if (!body.summary || body.summary.length < 20) throw invalid('a brief needs a summary of at least 20 characters');
  if (!Array.isArray(body.requirements) || !body.requirements.length) throw invalid('a brief lists its requirements');
  return ctx.tx(async (q) => {
    const p = await findProject(ctx, q, code, true);
    if (!['VENDOR_ACKNOWLEDGED', 'INTERNAL_ROUTE_RECORDED', 'PITCH_READY'].includes(p.governance)) await ctx.refuse('project.brief_submit', PRJ(code), [`a brief is written after routing and before the decision (the project is ${p.governance})`]);
    const rev = ((await q.query<{ m: number | null }>('SELECT max(rev) AS m FROM app.project_brief WHERE project_id = $1', [p.id])).rows[0]!.m || 0) + 1;
    await q.query('INSERT INTO app.project_brief (tenant_id, project_id, rev, scope_rev, author_id, content) VALUES ($1,$2,$3,$4,$5,$6)', [ctx.p.tenantId, p.id, rev, p.scope_rev, ctx.p.personId, JSON.stringify({ summary: body.summary, requirements: body.requirements, assumptions: body.assumptions || [], romUsd: body.romUsd ?? null, romLabel: body.romUsd != null ? 'INITIAL_ROM (before design; not a quote)' : null, comparableRooms: body.comparableRooms || [], spatial: body.spatial || null })]);
    if (p.governance !== 'PITCH_READY') { const facts = await governanceFacts(ctx, q, p); await step(ctx, q, p, 'PITCH_READY', 'project.brief_submit', facts, { briefRev: rev }); }
    else await ctx.audit(q, 'project.brief_submit', 'ALLOWED', PRJ(code), { briefRev: rev, note: 'a further revision of the brief' });
    await ctx.emit(q, 'project.pitch_deck_submitted', { type: 'Project', id: code, rev: p.scope_rev }, { projectId: code, pitchRev: rev, scopeRev: p.scope_rev });
    return { code, briefRev: rev, scopeRev: p.scope_rev, governance: 'PITCH_READY' };
  });
}

/** Approval chain, step 1: the operations lead selects an eligible approver who did not author the brief. */
export async function selectApprover(ctx: RequestContext, code: string, approverEmail: string) {
  await ctx.require('approver.select', 'select the approver', PRJ(code));
  return ctx.tx(async (q) => {
    const p = await findProject(ctx, q, code, true);
    const a = (await q.query<{ id: string }>('SELECT p.id FROM app.person p JOIN app.membership m ON m.person_id = p.id AND m.tenant_id = app.current_tenant() WHERE p.email = $1', [approverEmail])).rows[0];
    if (!a) throw invalid(`no member with the email ${approverEmail}`);
    const facts = await governanceFacts(ctx, q, { ...p, approver_id: a.id });
    await step(ctx, q, p, 'DECISION_PENDING', 'project.approver_select', facts, { approverId: a.id });
    await q.query('UPDATE app.project SET approver_id = $2 WHERE id = $1', [p.id, a.id]);
    await ctx.emit(q, 'project.approval_requested', { type: 'Project', id: code, rev: p.scope_rev }, { projectId: code, approverId: a.id, pitchRev: facts.brief!.rev, scopeRev: p.scope_rev });
    return { code, governance: 'DECISION_PENDING', approverId: a.id };
  });
}

/** Approval chain, step 2: the selected approver (or a valid delegate) decides the named scope revision. */
export async function decide(ctx: RequestContext, code: string, body: { decision: 'APPROVED' | 'HELD' | 'REJECTED'; scopeRev: number; reason?: string; reviewDate?: string }) {
  await ctx.require('project.decide', 'decide a project', PRJ(code));
  if (!['APPROVED', 'HELD', 'REJECTED'].includes(body.decision)) throw invalid('decision is APPROVED, HELD or REJECTED');
  return ctx.tx(async (q) => {
    const p = await findProject(ctx, q, code, true);
    const d = ctx.delegationFor('project.decide');
    const facts = await governanceFacts(ctx, q, p, { decision: { decision: body.decision, reason: body.reason, reviewDate: body.reviewDate || null, scopeRev: body.scopeRev } });
    await step(ctx, q, p, body.decision, 'project.decide', facts, { decision: body.decision, scopeRev: body.scopeRev, reason: body.reason, delegated: !!d });
    await q.query('INSERT INTO app.project_decision (tenant_id, project_id, decision, scope_rev, decided_by, delegation_id, reason, review_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [ctx.p.tenantId, p.id, body.decision, body.scopeRev, ctx.p.personId, d?.delegationId || null, body.reason || '', body.reviewDate || null]);
    await ctx.emit(q, 'project.approval_decided', { type: 'Project', id: code, rev: p.scope_rev }, { projectId: code, decision: body.decision, approverId: ctx.p.personId, scopeRev: body.scopeRev, reason: body.reason || '(approved)' });
    return { code, governance: body.decision, delegated: !!d };
  });
}

/** Funding: a signed budget against the approved scope revision; a finance outage is reported, never worked around. */
export async function fund(ctx: RequestContext, code: string, body: { amount: number; currency: string; costCenter: string; scopeRev: number; financeOutage?: boolean }) {
  await ctx.require('funding.authorize', 'authorize funding', PRJ(code));
  return ctx.tx(async (q) => {
    const p = await findProject(ctx, q, code, true);
    const facts = await governanceFacts(ctx, q, p, { funding: { amount: Number(body.amount), currency: body.currency || null, costCenter: body.costCenter || null, scopeRev: body.scopeRev, financeOutage: !!body.financeOutage } });
    await step(ctx, q, p, 'FUNDED', 'project.fund', facts, { amount: body.amount, currency: body.currency, scopeRev: body.scopeRev });
    await q.query("INSERT INTO app.project_funding (tenant_id, project_id, kind, amount, currency, cost_center, scope_rev, recorded_by) VALUES ($1,$2,'AUTHORIZED',$3,$4,$5,$6,$7)", [ctx.p.tenantId, p.id, body.amount, body.currency, body.costCenter, body.scopeRev, ctx.p.personId]);
    await q.query("UPDATE app.project SET delivery = coalesce(delivery, 'ENGINEERING_REVIEW') WHERE id = $1", [p.id]);
    await ctx.emit(q, 'project.funding_authorized', { type: 'Project', id: code, rev: p.scope_rev }, { projectId: code, amount: body.amount, currency: body.currency, scopeRev: body.scopeRev, authorityId: ctx.p.personId });
    return { code, governance: 'FUNDED', delivery: p.delivery || 'ENGINEERING_REVIEW' };
  });
}
export async function withdrawFunding(ctx: RequestContext, code: string, reason: string) {
  await ctx.require('funding.withdraw', 'withdraw funding', PRJ(code));
  return ctx.tx(async (q) => {
    const p = await findProject(ctx, q, code, true);
    const facts = await governanceFacts(ctx, q, p, { withdrawalReason: reason || null });
    await step(ctx, q, p, 'SUSPENDED', 'project.funding_withdraw', facts, { reason });
    const last = (await q.query<{ amount: string; currency: string; cost_center: string }>("SELECT amount, currency, cost_center FROM app.project_funding WHERE project_id = $1 AND kind = 'AUTHORIZED' ORDER BY recorded_at DESC LIMIT 1", [p.id])).rows[0];
    await q.query("INSERT INTO app.project_funding (tenant_id, project_id, kind, amount, currency, cost_center, scope_rev, reason, recorded_by) VALUES ($1,$2,'WITHDRAWN',$3,$4,$5,$6,$7,$8)", [ctx.p.tenantId, p.id, last?.amount || 0, last?.currency || 'USD', last?.cost_center || '-', p.scope_rev, reason, ctx.p.personId]);
    await ctx.emit(q, 'project.funding_withdrawn', { type: 'Project', id: code, rev: p.scope_rev }, { projectId: code, reason, authorityId: ctx.p.personId });
    return { code, governance: 'SUSPENDED' };
  });
}

/** Reopening after HELD / REJECTED / SUSPENDED: a new scope revision returns the project to its recorded route; the history stays. */
export async function reviseScope(ctx: RequestContext, code: string, reason: string) {
  await ctx.require('scope.revise', 'revise the scope', PRJ(code));
  if (!reason || reason.length < 8) throw invalid('a scope revision needs a reason');
  return ctx.tx(async (q) => {
    const p = await findProject(ctx, q, code, true);
    if (!REOPEN_FROM.includes(p.governance)) await ctx.refuse('project.scope_revise', PRJ(code), [`a scope revision reopens a HELD, REJECTED or SUSPENDED project (this one is ${p.governance})`]);
    const back: GovernanceState = p.internal_only ? 'INTERNAL_ROUTE_RECORDED' : 'VENDOR_ACKNOWLEDGED';
    await q.query('UPDATE app.project SET scope_rev = scope_rev + 1, governance = $2, approver_id = NULL, updated_at = now() WHERE id = $1', [p.id, back]);
    await ctx.emit(q, 'project.approval_reopened', { type: 'Project', id: code, rev: p.scope_rev + 1 }, { projectId: code, scopeRev: p.scope_rev + 1, reason });
    await ctx.audit(q, 'project.scope_revise', 'ALLOWED', PRJ(code), { from: p.governance, to: back, scopeRev: p.scope_rev + 1, reason });
    return { code, governance: back, scopeRev: p.scope_rev + 1 };
  });
}

/** Concept authorization (owner decision, ADR-0008 §2): an approved brief at the current scope revision authorizes preliminary design,
 *  feasibility studies, concept layouts and preliminary budgets before funding. Not by the brief's author. Execution still needs FUNDED. */
export async function authorizeConcept(ctx: RequestContext, code: string, note?: string) {
  await ctx.require('brief.approve', 'authorize concept work', PRJ(code));
  return ctx.tx(async (q) => {
    const p = await findProject(ctx, q, code, true);
    const brief = (await q.query<{ rev: number; scope_rev: number; author_id: string }>('SELECT rev, scope_rev, author_id FROM app.project_brief WHERE project_id = $1 ORDER BY rev DESC LIMIT 1', [p.id])).rows[0];
    const why: string[] = [];
    if (!brief) why.push('no engineering brief to approve'); else if (brief.scope_rev !== p.scope_rev) why.push(`the brief is for scope revision ${brief.scope_rev}, the project is at ${p.scope_rev}`);
    if (['DRAFT', 'SUBMITTED', 'HELD', 'REJECTED', 'SUSPENDED'].includes(p.governance)) why.push(`the project is ${p.governance}: concept work is authorized on a routed project with a current brief`);
    if (p.concept_scope_rev === p.scope_rev) why.push('concept work is already authorized for this scope revision');
    if (why.length) await ctx.refuse('project.concept_authorize', PRJ(code), why);
    await ctx.separate('project.concept_authorize', PRJ(code), [brief!.author_id], 'the engineering brief');
    await q.query("UPDATE app.project SET concept_authorized_by = $2, concept_authorized_at = now(), concept_scope_rev = scope_rev, delivery = coalesce(delivery, 'ENGINEERING_REVIEW'), updated_at = now() WHERE id = $1", [p.id, ctx.p.personId]);
    await ctx.audit(q, 'project.concept_authorize', 'ALLOWED', PRJ(code), { briefRev: brief!.rev, scopeRev: p.scope_rev, note: note || null, meaning: 'CONCEPT authorization: preliminary design, feasibility, concept layouts, preliminary budgets; not execution' });
    return { code, conceptAuthorized: true, scopeRev: p.scope_rev, delivery: p.delivery || 'ENGINEERING_REVIEW' };
  });
}

// ------------------------------------------------------------------------------------------------------------ collaborative design
export async function proposeDesignRevision(ctx: RequestContext, code: string, body: { reason: string; phase?: 'CONCEPT' | 'DETAILED'; estimateUsd?: number; feasibility?: { finding: string; risks?: string[]; options?: string[] }; files?: Array<{ name: string; kind?: string; sha256?: string }>; liteModelRoom?: string; divr?: { intent: string; verificationPlan: string[] }; domainsNeeded?: string[] }) {
  await ctx.require(['design.submit', 'design.revise'], 'propose a design revision', PRJ(code));
  const domains = body.domainsNeeded || []; for (const d of domains) if (!DOMAIN_AUTHORITY[d]) throw invalid(`unknown review domain ${d} (dsp, camera, touch)`);
  return ctx.tx(async (q) => {
    const p = await findProject(ctx, q, code, true);
    const phase = body.phase || 'DETAILED';
    if (!p.delivery || !['DESIGN_DRAFT', 'DESIGN_REVIEW'].includes(p.delivery)) await ctx.refuse('design.revision_propose', PRJ(code), [`design revisions are proposed while the project is in DESIGN_DRAFT or DESIGN_REVIEW (this one is ${p.delivery || p.governance})`]);
    // concept vs execution authorization (owner decision, ADR-0008 §2): a CONCEPT revision needs concept authorization; a DETAILED design needs funding
    if (p.concept_scope_rev !== p.scope_rev) await ctx.refuse('design.revision_propose', PRJ(code), ['concept work needs concept authorization at the current scope revision (brief.approve)']);
    if (phase === 'DETAILED' && p.governance !== 'FUNDED') await ctx.refuse('design.revision_propose', PRJ(code), [`a DETAILED design needs execution authorization: the project is ${p.governance}, not FUNDED — propose a CONCEPT revision (feasibility, concept layout, preliminary estimate) instead`]);
    const room = body.liteModelRoom ? (await q.query<{ id: string; project_id: string | null }>('SELECT id, project_id FROM app.room WHERE code = $1', [body.liteModelRoom])).rows[0] : null;
    if (body.liteModelRoom && (!room || room.project_id !== p.id)) throw invalid(`${body.liteModelRoom} is not a room of ${code}`);
    await q.query("UPDATE app.project_design_revision SET state = 'SUPERSEDED' WHERE project_id = $1 AND state IN ('DRAFT','IN_REVIEW')", [p.id]);
    const rev = ((await q.query<{ m: number | null }>('SELECT max(rev) AS m FROM app.project_design_revision WHERE project_id = $1', [p.id])).rows[0]!.m || 0) + 1;
    const r = await q.query<{ id: string }>('INSERT INTO app.project_design_revision (tenant_id, project_id, rev, author_id, reason, files, lite_model_room, divr, domains_needed, phase, estimate_usd, feasibility) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id', [ctx.p.tenantId, p.id, rev, ctx.p.personId, body.reason, JSON.stringify(body.files || []), room?.id || null, body.divr ? JSON.stringify({ ...body.divr, recordedBy: ctx.p.personId }) : null, domains, phase, body.estimateUsd ?? null, body.feasibility ? JSON.stringify({ ...body.feasibility, recordedBy: ctx.p.personId, label: 'FEASIBILITY STUDY — concept work, not a release' }) : null]);
    if (p.delivery === 'DESIGN_REVIEW') await q.query("UPDATE app.project SET delivery = 'DESIGN_DRAFT', updated_at = now() WHERE id = $1", [p.id]);   // a new revision invalidates the review in progress (no historical deletion)
    await ctx.emit(q, 'design.revision_proposed', { type: 'Project', id: code, rev }, { projectId: code, revision: rev, reason: body.reason });
    await ctx.audit(q, 'design.revision_propose', 'ALLOWED', PRJ(code), { revision: rev, phase, domains, estimateUsd: body.estimateUsd ?? null });
    return { code, revision: rev, phase, id: r.rows[0]!.id, delivery: 'DESIGN_DRAFT' };
  });
}
export async function reviewDesign(ctx: RequestContext, code: string, rev: number, body: { domain: string; decision: 'APPROVED' | 'CHANGES_REQUESTED'; note?: string }) {
  const auth = DOMAIN_AUTHORITY[body.domain]; if (!auth) throw invalid('domain is dsp, camera or touch');
  await ctx.require(auth, `review the ${body.domain} design`, PRJ(code));
  return ctx.tx(async (q) => {
    const p = await findProject(ctx, q, code);
    const r = (await q.query<{ id: string; author_id: string; state: string }>('SELECT id, author_id, state FROM app.project_design_revision WHERE project_id = $1 AND rev = $2', [p.id, rev])).rows[0];
    if (!r) throw notFound(`revision ${rev} of ${code}`);
    if (r.state !== 'IN_REVIEW') await ctx.refuse('design.review', PRJ(code), [`revision ${rev} is ${r.state}, not IN_REVIEW`]);
    await ctx.separate('design.review', PRJ(code), [r.author_id], `the ${body.domain} review of revision ${rev}`);
    await q.query('INSERT INTO app.project_design_review (tenant_id, revision_id, domain, decision, note, reviewed_by) VALUES ($1,$2,$3,$4,$5,$6)', [ctx.p.tenantId, r.id, body.domain, body.decision, body.note || '', ctx.p.personId]);
    await ctx.audit(q, 'design.review', 'ALLOWED', PRJ(code), { revision: rev, domain: body.domain, decision: body.decision });
    return { code, revision: rev, domain: body.domain, decision: body.decision };
  });
}
export async function raiseRfi(ctx: RequestContext, code: string, rev: number, question: string) {
  await ctx.require(['design.submit', 'design.revise', 'review.dsp', 'review.camera', 'review.touch', 'design.release', 'brief.approve'], 'raise an RFI', PRJ(code));
  if (!question || question.length < 5) throw invalid('an RFI is a question');
  return ctx.tx(async (q) => {
    const p = await findProject(ctx, q, code);
    const r = (await q.query<{ id: string }>('SELECT id FROM app.project_design_revision WHERE project_id = $1 AND rev = $2', [p.id, rev])).rows[0]; if (!r) throw notFound(`revision ${rev} of ${code}`);
    const rcode = (await q.query<{ c: string }>("SELECT app.next_code('rfi', 'RFI-') AS c")).rows[0]!.c;
    await q.query('INSERT INTO app.project_rfi (tenant_id, project_id, revision_id, code, question, raised_by) VALUES ($1,$2,$3,$4,$5,$6)', [ctx.p.tenantId, p.id, r.id, rcode, question, ctx.p.personId]);
    await ctx.audit(q, 'design.rfi_raise', 'ALLOWED', PRJ(code), { rfi: rcode, revision: rev });
    return { code, rfi: rcode, revision: rev };
  });
}
export async function resolveRfi(ctx: RequestContext, code: string, rfi: string, answer: string) {
  await ctx.require('rfi.resolve', 'resolve an RFI', PRJ(code));
  if (!answer || answer.length < 5) throw invalid('an answer is required');
  return ctx.tx(async (q) => {
    const p = await findProject(ctx, q, code);
    const r = (await q.query<{ id: string; raised_by: string; resolved_at: string | null }>('SELECT id, raised_by, resolved_at FROM app.project_rfi WHERE project_id = $1 AND code = $2', [p.id, rfi])).rows[0]; if (!r) throw notFound(`${rfi} of ${code}`);
    if (r.resolved_at) await ctx.refuse('design.rfi_resolve', PRJ(code), [`${rfi} is already resolved`]);
    await ctx.separate('design.rfi_resolve', PRJ(code), [r.raised_by], `the answer to ${rfi}`);
    await q.query('UPDATE app.project_rfi SET answer = $2, resolved_by = $3, resolved_at = now() WHERE id = $1', [r.id, answer, ctx.p.personId]);
    await ctx.audit(q, 'design.rfi_resolve', 'ALLOWED', PRJ(code), { rfi });
    return { code, rfi, state: 'RESOLVED' };
  });
}

// ------------------------------------------------------------------------------------------------------------ delivery facts and steps
async function deliveryFacts(ctx: RequestContext, q: Queryable, p: ProjectRow): Promise<DeliveryFacts> {
  const rev = (await q.query<{ rev: number; phase: 'CONCEPT' | 'DETAILED'; files: unknown[]; lite_model_room: string | null; divr: unknown; reason: string; domains_needed: string[]; author_id: string; id: string; state: string }>('SELECT id, rev, phase, files, lite_model_room, divr, reason, domains_needed, author_id, state FROM app.project_design_revision WHERE project_id = $1 ORDER BY rev DESC LIMIT 1', [p.id])).rows[0];
  const approvals: Record<string, string> = {};
  if (rev) for (const a of (await q.query<{ domain: string; decision: string }>('SELECT DISTINCT ON (domain) domain, decision FROM app.project_design_review WHERE revision_id = $1 ORDER BY domain, reviewed_at DESC', [rev.id])).rows) approvals[a.domain] = a.decision;
  const openRfis = rev ? (await q.query<{ n: number }>('SELECT count(*)::int AS n FROM app.project_rfi WHERE revision_id = $1 AND resolved_at IS NULL', [rev.id])).rows[0]!.n : 0;
  const rooms = (await q.query<{ id: string; code: string; lifecycle: string; approved_revision: number | null }>('SELECT id, code, lifecycle, approved_revision FROM app.room WHERE project_id = $1 ORDER BY code', [p.id])).rows;
  const roomFacts: DeliveryFacts['rooms'] = [];
  for (const r of rooms) {
    const plan = (await q.query<{ id: string }>('SELECT id FROM app.cx_plan WHERE room_id = $1 ORDER BY compiled_at DESC, id DESC LIMIT 1', [r.id])).rows[0];
    const app = plan ? (await q.query<{ test_id: string }>('SELECT test_id FROM app.cx_plan_row WHERE plan_id = $1 AND applicable', [plan.id])).rows.map((x) => x.test_id) : [];
    const labels = new Map((await q.query<{ test_id: string; result_label: string }>('SELECT test_id, result_label FROM app.current_result WHERE room_id = $1', [r.id])).rows.map((x) => [x.test_id, x.result_label]));
    const openIssues = (await q.query<{ n: number }>("SELECT count(*)::int AS n FROM app.room_issue WHERE room_id = $1 AND state = 'OPEN'", [r.id])).rows[0]!.n;
    const drawings = (await q.query<{ n: number }>("SELECT count(*)::int AS n FROM app.drawing_revision WHERE room_id = $1 AND state = 'APPROVED'", [r.id])).rows[0]!.n;
    const baseline = (await q.query<{ n: number }>("SELECT count(*)::int AS n FROM app.assurance_baseline WHERE room_id = $1 AND state = 'CURRENT'", [r.id])).rows[0]!.n;
    roomFacts.push({ code: r.code, lifecycle: r.lifecycle, hasPlan: !!plan, applicable: app.length, verified: app.filter((t) => labels.get(t) === 'PASS_VERIFIED').length, openIssues, drawingsApproved: drawings > 0, photosApproved: !!p.qa_signoff_by, hasBaseline: baseline > 0 });
  }
  // the project's field work order is the field authorization record: assigned by the service manager, accepted by that technician
  const fa = p.field_authorization as { technicianId?: string | null; technicianQualified?: boolean; siteAccess?: boolean; workOrderAccepted?: boolean } | null;
  const wo = fa?.technicianId ? { assigned: 1, accepted: fa.workOrderAccepted ? 1 : 0 } : null;
  return {
    state: p.delivery || 'ENGINEERING_REVIEW', governance: p.governance, conceptAuthorized: p.concept_scope_rev === p.scope_rev,
    revision: rev ? { rev: rev.rev, phase: rev.phase, files: rev.files.length, liteModel: !!rev.lite_model_room, divr: !!rev.divr, reason: rev.reason, domainsNeeded: rev.domains_needed, domainApprovals: approvals, openRfis, authorId: rev.author_id } : null,
    rooms: roomFacts, rulePackVersion: p.rule_pack_version,
    fieldAuthorization: fa ? { technicianQualified: !!fa.technicianQualified, siteAccess: !!fa.siteAccess } : null,
    workOrders: wo,
    supportOwnerId: p.support_owner_id, qaSignoff: !!p.qa_signoff_by, actorId: ctx.p.personId,
  };
}

/** One governed delivery step. The authority comes from the transition table; the guard from the engine over facts read from the rooms. */
export async function deliver(ctx: RequestContext, code: string, to: DeliveryState, body: Record<string, unknown> = {}) {
  const row = DELIVERY_TRANSITIONS.find((t) => t.to === to); if (!row) throw invalid(`unknown delivery state ${to}`);
  await ctx.require(row.authority, `move the project to ${to}`, PRJ(code));
  return ctx.tx(async (q) => {
    const p = await findProject(ctx, q, code, true);
    // concept work (ENGINEERING_REVIEW → DESIGN_DRAFT → DESIGN_REVIEW) runs on concept authorization; execution states need funding (owner decision, ADR-0008 §2)
    if (EXECUTION_STATES.includes(to) && p.governance !== 'FUNDED') await ctx.refuse(`project.delivery:${to}`, PRJ(code), [`execution authorization missing: the project is ${p.governance}, not FUNDED — ${to} is execution, which needs funding`]);
    if (!EXECUTION_STATES.includes(to) && p.concept_scope_rev !== p.scope_rev) await ctx.refuse(`project.delivery:${to}`, PRJ(code), ['concept work needs concept authorization at the current scope revision (brief.approve)']);
    // the step's own record, written before the guard reads the facts (so a refusal names exactly what is still missing)
    if (to === 'PLAN_COMPILED') await q.query('UPDATE app.project SET rule_pack_version = $2 WHERE id = $1', [p.id, defaultCatalog.rulePack.version]);   // pinned from the engine that compiled the plans, never typed in
    if (to === 'FIELD_AUTHORIZED') {
      const tech = typeof body['technicianEmail'] === 'string' ? (await q.query<{ id: string }>("SELECT p.id FROM app.person p JOIN app.membership m ON m.person_id = p.id AND m.tenant_id = app.current_tenant() WHERE p.email = $1 AND m.role_key IN ('service', 'installer')", [body['technicianEmail']])).rows[0] : null;
      if (body['technicianEmail'] && !tech) throw invalid(`no field technician or installer with the email ${String(body['technicianEmail'])}`);
      // the qualification and site-access checks are the service manager's attestation on the record (there is no staff skills registry yet — ADR-0008)
      await q.query('UPDATE app.project SET field_authorization = $2 WHERE id = $1', [p.id, JSON.stringify({ technicianId: tech?.id || null, technicianQualified: !!body['technicianQualified'], siteAccess: !!body['siteAccess'], attestedBy: ctx.p.personId, at: new Date().toISOString() })]);
    }
    if (to === 'FIELD_ACTIVE') {
      const fa = p.field_authorization as { technicianId?: string | null } | null;
      if (!fa?.technicianId || fa.technicianId !== ctx.p.personId) await ctx.refuse('project.delivery:FIELD_ACTIVE', PRJ(code), ['the work order is accepted by the technician it was assigned to']);
      await q.query("UPDATE app.project SET field_authorization = field_authorization || jsonb_build_object('workOrderAccepted', true, 'acceptedAt', now()::text) WHERE id = $1", [p.id]);
    }
    if (to === 'DOCUMENTS_APPROVED') { await ctx.require('photos.approve', 'approve the final photos', PRJ(code)); if (body['photosApproved'] === true) await q.query('UPDATE app.project SET qa_signoff_by = $2 WHERE id = $1', [p.id, ctx.p.personId]); }
    if (to === 'HANDED_OFF' && typeof body['supportOwnerEmail'] === 'string') { const o = (await q.query<{ id: string }>('SELECT p.id FROM app.person p JOIN app.membership m ON m.person_id = p.id AND m.tenant_id = app.current_tenant() WHERE p.email = $1', [body['supportOwnerEmail']])).rows[0]; if (!o) throw invalid(`no member with the email ${body['supportOwnerEmail']}`); await q.query('UPDATE app.project SET support_owner_id = $2 WHERE id = $1', [p.id, o.id]); }
    const fresh = (await q.query<ProjectRow>('SELECT * FROM app.project WHERE id = $1', [p.id])).rows[0]!;
    const facts = await deliveryFacts(ctx, q, fresh);
    const why = deliveryBlockers(to, facts);
    if (why.length) await ctx.refuse(`project.delivery:${to}`, PRJ(code), why, { from: facts.state, to });
    await q.query('UPDATE app.project SET delivery = $2, updated_at = now() WHERE id = $1', [p.id, to]);
    if (to === 'DESIGN_REVIEW') await q.query("UPDATE app.project_design_revision SET state = 'IN_REVIEW' WHERE project_id = $1 AND state = 'DRAFT'", [p.id]);
    if (to === 'DESIGN_RELEASED') { await q.query("UPDATE app.project_design_revision SET state = 'RELEASED' WHERE project_id = $1 AND state = 'IN_REVIEW'", [p.id]); await ctx.emit(q, 'design.approved_for_install', { type: 'Project', id: code, rev: facts.revision!.rev }, { projectId: code, revision: facts.revision!.rev, divrId: `${code}/DIVR-${facts.revision!.rev}` }); }
    if (to === 'HANDED_OFF') for (const r of facts.rooms) { const b = (await q.query<{ id: string }>("SELECT b.id FROM app.assurance_baseline b JOIN app.room r ON r.id = b.room_id WHERE r.code = $1 AND b.state = 'CURRENT'", [r.code])).rows[0]; await ctx.emit(q, 'handoff.accepted', { type: 'Project', id: code, rev: p.scope_rev }, { projectId: code, roomId: r.code, baselineId: b?.id || 'NONE_YET' }); }
    if (to === 'BASELINED') await q.query("UPDATE app.project SET state = 'CLOSED' WHERE id = $1", [p.id]);
    await ctx.audit(q, `project.delivery:${to}`, 'ALLOWED', PRJ(code), { from: facts.state, to, guard: row.guard });
    return { code, delivery: to, stage: stageOf(p.governance, to) };
  });
}

// ------------------------------------------------------------------------------------------------------------ the record
export async function project(ctx: RequestContext, code: string) {
  return ctx.tx(async (q) => {
    const p = await findProject(ctx, q, code);
    const r = p.request_id ? (await q.query<RequestRow & { site: string | null; building: string | null; room: string | null; requester: string }>('SELECT r.*, s.code AS site, b.code AS building, rm.code AS room, pe.display_name AS requester FROM app.project_request r LEFT JOIN app.site s ON s.id = r.site_id LEFT JOIN app.building b ON b.id = r.building_id LEFT JOIN app.room rm ON rm.id = r.room_id JOIN app.person pe ON pe.id = r.requester_id WHERE r.id = $1', [p.request_id])).rows[0] : null;
    const briefs = (await q.query('SELECT b.rev, b.scope_rev AS "scopeRev", pe.display_name AS author, b.content, b.created_at AS "createdAt" FROM app.project_brief b JOIN app.person pe ON pe.id = b.author_id WHERE b.project_id = $1 ORDER BY b.rev', [p.id])).rows;
    const decisions = (await q.query('SELECT d.decision, d.scope_rev AS "scopeRev", pe.display_name AS "decidedBy", d.delegation_id IS NOT NULL AS delegated, d.reason, d.review_date AS "reviewDate", d.decided_at AS "decidedAt" FROM app.project_decision d JOIN app.person pe ON pe.id = d.decided_by WHERE d.project_id = $1 ORDER BY d.decided_at', [p.id])).rows;
    const funding = (await q.query('SELECT f.kind, f.amount, f.currency, f.cost_center AS "costCenter", f.scope_rev AS "scopeRev", f.reason, pe.display_name AS "recordedBy", f.recorded_at AS "recordedAt" FROM app.project_funding f JOIN app.person pe ON pe.id = f.recorded_by WHERE f.project_id = $1 ORDER BY f.recorded_at', [p.id])).rows;
    const revisions = (await q.query<{ id: string; rev: number; phase: string; estimateUsd: string | null; feasibility: unknown; author: string; reason: string; files: unknown[]; divr: unknown; domainsNeeded: string[]; state: string; createdAt: string; liteModelRoom: string | null }>('SELECT dr.id, dr.rev, dr.phase, dr.estimate_usd AS "estimateUsd", dr.feasibility, pe.display_name AS author, dr.reason, dr.files, dr.divr, dr.domains_needed AS "domainsNeeded", dr.state, dr.created_at AS "createdAt", rm.code AS "liteModelRoom" FROM app.project_design_revision dr JOIN app.person pe ON pe.id = dr.author_id LEFT JOIN app.room rm ON rm.id = dr.lite_model_room WHERE dr.project_id = $1 ORDER BY dr.rev', [p.id])).rows;
    const reviews = (await q.query<{ revision_id: string; domain: string; decision: string; note: string; reviewedBy: string; reviewedAt: string }>('SELECT rv.revision_id, rv.domain, rv.decision, rv.note, pe.display_name AS "reviewedBy", rv.reviewed_at AS "reviewedAt" FROM app.project_design_review rv JOIN app.person pe ON pe.id = rv.reviewed_by JOIN app.project_design_revision dr ON dr.id = rv.revision_id WHERE dr.project_id = $1 ORDER BY rv.reviewed_at', [p.id])).rows;
    const rfis = (await q.query<{ revision_id: string; code: string; question: string; raisedBy: string; raisedAt: string; answer: string | null; resolvedBy: string | null; resolvedAt: string | null }>('SELECT f.revision_id, f.code, f.question, a.display_name AS "raisedBy", f.raised_at AS "raisedAt", f.answer, b.display_name AS "resolvedBy", f.resolved_at AS "resolvedAt" FROM app.project_rfi f JOIN app.person a ON a.id = f.raised_by LEFT JOIN app.person b ON b.id = f.resolved_by WHERE f.project_id = $1 ORDER BY f.raised_at', [p.id])).rows;
    const facts = await deliveryFacts(ctx, q, p);
    const gnext = GOVERNANCE_TRANSITIONS.filter((t) => t.from === p.governance).map((t) => ({ to: t.to, authority: t.authority, guard: t.guard }));
    const dnext = p.delivery ? DELIVERY_TRANSITIONS.filter((t) => t.from === p.delivery).map((t) => ({ to: t.to, authority: t.authority, guard: t.guard, blockers: deliveryBlockers(t.to, facts) })) : [];
    const audit = (await q.query("SELECT action, outcome, actor_role AS by, at, detail FROM app.audit_event WHERE aggregate_type = 'Project' AND aggregate_id = $1 ORDER BY at DESC LIMIT 50", [p.code])).rows;
    const names = async (id: string | null) => (id ? (await q.query<{ n: string }>('SELECT display_name AS n FROM app.person WHERE id = $1', [id])).rows[0]?.n || null : null);
    return {
      code: p.code, name: p.name, type: p.type, state: p.state, governance: p.governance, delivery: p.delivery, scopeRev: p.scope_rev, stage: stageOf(p.governance, p.delivery), internalOnly: p.internal_only, exceptionReason: p.exception_reason,
      concept: p.concept_authorized_at ? { by: await names(p.concept_authorized_by), at: p.concept_authorized_at, scopeRev: p.concept_scope_rev, current: p.concept_scope_rev === p.scope_rev } : null, executionAuthorized: p.governance === 'FUNDED',
      approver: await names(p.approver_id), supportOwner: await names(p.support_owner_id), qaSignoffBy: await names(p.qa_signoff_by), rulePackVersion: p.rule_pack_version, fieldAuthorization: p.field_authorization,
      request: r ? { code: r.code, type: r.type, title: r.title, intent: r.intent, constraints: r.constraints, site: r.site, building: r.building, room: r.room, provisionalRoom: r.provisional_room, archetype: r.archetype, capacity: r.capacity, photoPolicy: r.photo_policy, photos: r.photos, plans: r.plans, dimensions: r.dimensions, programme: r.programme, state: r.state, requester: r.requester, submittedAt: r.submitted_at } : null,
      briefs, decisions, funding,
      design: revisions.map((d) => ({ ...d, id: undefined, reviews: reviews.filter((x) => x.revision_id === d.id).map(({ revision_id: _, ...x }) => x), rfis: rfis.filter((x) => x.revision_id === d.id).map(({ revision_id: _, ...x }) => x) })),
      rooms: facts.rooms, next: { governance: gnext, delivery: dnext }, audit,
    };
  });
}
