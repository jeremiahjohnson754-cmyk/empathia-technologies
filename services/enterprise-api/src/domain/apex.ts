/**
 * APEX (P6-B): diagnosis with its evidence, on @empathia/apex-engine, persisted per deficiency.
 *   open   — the seven layers cite this room's real records (planned assets by category); hypotheses are ranked with their caveats;
 *   act    — tiers A0–A5: explain (cite or abstain), propose, compare read-only against the room's current baseline, stage a real
 *            ServiceHands work order (A3, through the same code the service manager uses), execute bounded (A4: signed runbook, owner
 *            approval, window, occupancy, the real adapter state — NOT_CONFIGURED in this build — allowlist, rate limit, dry run; the
 *            only runs are labelled simulations with branches), critical (A5: human-led);
 *   review — the diagnosis is reviewed by a verifier, and the event says which hypothesis and tier.
 * Every outcome, blocked ones included, is a result on the case and an audit record. Site scope reaches a case through its room.
 */
import { openCase as engineOpen, act as engineAct, APEX_LAYERS, TIERS, RUNBOOKS, type Hypothesis, type Layer, type Tier, type ActInput, type Outcome } from '@empathia/apex-engine';
import type { Queryable } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import { ApiError, notFound } from '../http/errors.js';
import { createWorkOrder } from './commissioning.js';

/** The authorities that may open a case and act on it (the demonstrator's APEX gates); any one of them suffices. */
export const APEX_ACT = ['service.triage', 'tests.verify.all', 'service.verify', 'baseline.approve', 'review.dsp', 'review.camera', 'review.touch'];
export const APEX_OPEN = [...APEX_ACT, 'provenance.review'];
export const APEX_REVIEW = ['tests.verify.all', 'service.verify', 'baseline.approve'];

interface CaseRow { id: string; code: string; issue_id: string; room_id: string; symptom_key: string; layers: unknown[]; hypotheses: Hypothesis[]; actions: Array<Outcome & { at: string; by: string; byRole: string; hypothesisId: string }>; review: { verdict: string; by: string; byRole: string; at: string } | null; opened_by: string; opened_at: string; issue_code: string; issue_title: string; room_code: string; room_name: string; site_id: string; opener: string }
const SELECT = `SELECT c.*, i.code AS issue_code, i.title AS issue_title, r.code AS room_code, r.name AS room_name, b.site_id, p.display_name AS opener FROM app.apex_case c JOIN app.room_issue i ON i.id = c.issue_id AND i.tenant_id = c.tenant_id JOIN app.room r ON r.id = c.room_id AND r.tenant_id = c.tenant_id JOIN app.building b ON b.id = r.building_id AND b.tenant_id = r.tenant_id JOIN app.person p ON p.id = c.opened_by`;
const scope = (ctx: RequestContext, n: number) => (ctx.p.siteScope && ctx.p.siteScope.length ? { sql: ` AND b.site_id = ANY($${n}::uuid[])`, args: [ctx.p.siteScope] } : { sql: '', args: [] as unknown[] });
async function find(ctx: RequestContext, q: Queryable, code: string, lock = false): Promise<CaseRow> {
  const sc = scope(ctx, 2); const r = (await q.query<CaseRow>(`${SELECT} WHERE c.code = $1${sc.sql}${lock ? ' FOR UPDATE OF c' : ''}`, [code, ...sc.args])).rows[0];
  if (!r) throw notFound(`APEX case ${code}`); return r;
}

/** The room's records cited per layer: planned assets by category. Nothing is invented; a layer with no record cites nothing. */
async function citer(q: Queryable, roomId: string): Promise<(layer: Layer) => string[]> {
  const assets = (await q.query<{ code: string; category: string; label: string }>('SELECT code, category, label FROM app.planned_asset WHERE room_id = $1 AND removed_at IS NULL AND NOT furniture ORDER BY code', [roomId])).rows;
  const by = (re: RegExp) => assets.filter((a) => re.test(a.category)).map((a) => `${a.code} ${a.label}`);
  return (layer) => layer === 'physical' ? assets.slice(0, 3).map((a) => `${a.code} ${a.label}`) : layer === 'network' ? by(/switch|network|codec|bar/i) : layer === 'media' ? by(/display|speaker|mic|dsp|audio|camera|bar/i) : layer === 'control' ? by(/touch|control|panel/i) : layer === 'compute' ? by(/codec|compute|bar|pc/i) : [];
}

export async function listCases(ctx: RequestContext) {
  const sc = scope(ctx, 1);
  const rows = (await ctx.tx((q) => q.query<CaseRow>(`${SELECT} WHERE true${sc.sql} ORDER BY c.opened_at DESC LIMIT 200`, sc.args))).rows;
  return { items: rows.map((c) => ({ code: c.code, issue: { code: c.issue_code, title: c.issue_title }, room: { code: c.room_code, name: c.room_name }, symptomKey: c.symptom_key, hypotheses: c.hypotheses.length, actions: c.actions.length, reviewed: !!c.review, openedAt: c.opened_at, openedBy: c.opener })) };
}

export async function openCase(ctx: RequestContext, issueCode: string) {
  await ctx.require(APEX_OPEN, 'open an APEX case', { type: 'RoomIssue', id: issueCode });
  return ctx.tx(async (q) => {
    const sc = scope(ctx, 2);
    const i = (await q.query<{ id: string; title: string; rationale: string; room_id: string; state: string; room_code: string }>(`SELECT i.id, i.title, i.rationale, i.room_id, i.state, r.code AS room_code FROM app.room_issue i JOIN app.room r ON r.id = i.room_id JOIN app.building b ON b.id = r.building_id WHERE i.code = $1${sc.sql}`, [issueCode, ...sc.args])).rows[0];
    if (!i) throw notFound(`issue ${issueCode}`);
    const existing = (await q.query<{ code: string }>('SELECT code FROM app.apex_case WHERE issue_id = $1', [i.id])).rows[0];
    if (existing) return { caseId: existing.code, existing: true };
    const c = engineOpen(`${i.title} ${i.rationale}`, await citer(q, i.room_id));
    const code = (await q.query<{ c: string }>("SELECT app.next_code('apex', 'APX-') AS c")).rows[0]!.c;
    await q.query('INSERT INTO app.apex_case (tenant_id, issue_id, room_id, code, symptom_key, layers, hypotheses, opened_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [ctx.p.tenantId, i.id, i.room_id, code, c.key, JSON.stringify(c.layers), JSON.stringify(c.hypotheses), ctx.p.personId]);
    await ctx.audit(q, 'apex.open', 'ALLOWED', { type: 'ApexCase', id: code }, { issueCode, symptomKey: c.key, hypotheses: c.hypotheses.length });
    return { caseId: code, existing: false, symptomKey: c.key, hypotheses: c.hypotheses.map((h) => ({ id: h.id, confidence: h.confidence, tier: h.action.tier })) };
  });
}

async function context(ctx: RequestContext, q: Queryable, c: CaseRow) {
  const b = (await q.query<{ version: number; n: number }>("SELECT version, (SELECT count(*)::int FROM jsonb_each_text(results)) AS n FROM app.assurance_baseline WHERE room_id = $1 AND state = 'CURRENT'", [c.room_id])).rows[0];
  // the real adapter state: the integration catalogue knows MOCK (declared, local) or CONTRACT_ONLY; nothing in this build is SUPPORTED_VERIFIED
  const integ = (await q.query<{ key: string; state: string }>("SELECT key, state FROM app.integration WHERE key IN ('mock-dsp-readback', 'mock-device-inventory')")).rows;
  const st = (k: string): 'NOT_CONFIGURED' | 'DECLARED' | 'SUPPORTED_VERIFIED' => (integ.find((x) => x.key === k)?.state === 'MOCK' ? 'DECLARED' : 'NOT_CONFIGURED');
  const adapters = { 'ADP-DSP': st('mock-dsp-readback'), 'ADP-CAM': 'NOT_CONFIGURED' as const, 'ADP-NET': st('mock-device-inventory') };
  const priorA4 = c.actions.filter((a) => a.tier === 'A4' && a.runbook && !['BLOCKED', 'DRY_RUN', 'HUMAN_LED'].includes(a.outcome)).length;
  return { baseline: b ? { version: b.version, evidence: b.n } : null, adapters, priorA4 };
}

export async function getCase(ctx: RequestContext, code: string) {
  return ctx.tx(async (q) => {
    const c = await find(ctx, q, code); const cx = await context(ctx, q, c);
    const wo = (await q.query<{ code: string; state: string }>('SELECT code, state FROM app.work_order WHERE issue_id = $1 ORDER BY created_at DESC LIMIT 1', [c.issue_id])).rows[0] || null;
    return { code: c.code, issue: { code: c.issue_code, title: c.issue_title }, room: { code: c.room_code, name: c.room_name }, symptomKey: c.symptom_key, openedAt: c.opened_at, openedBy: c.opener,
      layers: c.layers, hypotheses: c.hypotheses, actions: c.actions, review: c.review, workOrder: wo, ...cx,
      tiers: Object.entries(TIERS).map(([id, t]) => ({ id, ...t })), runbooks: Object.entries(RUNBOOKS).map(([id, r]) => ({ id, ...r })), layerLabels: APEX_LAYERS.map(([k, l]) => ({ key: k, label: l })),
      yours: { act: ctx.can(APEX_ACT), review: ctx.can(APEX_REVIEW) } };
  });
}

export async function actOn(ctx: RequestContext, code: string, body: ActInput & { hypothesisId: string }) {
  await ctx.require(APEX_ACT, 'act on an APEX hypothesis', { type: 'ApexCase', id: code });
  return ctx.tx(async (q) => {
    const c = await find(ctx, q, code, true);
    const h = c.hypotheses.find((x) => x.id === body.hypothesisId);
    if (!h) throw new ApiError('validation', `no hypothesis ${body.hypothesisId} on ${code}`);
    const cx = await context(ctx, q, c);
    // A3 stages a REAL work order through the service manager's code path: whoever lacks service.assign/triage is refused there, and the refusal is the outcome
    let staged: { ok: boolean; id?: string; why?: string[] } | null = null;
    const tier: Tier = body.tier || h.action.tier;
    if (tier === 'A3') {
      const prior = (await q.query<{ code: string }>('SELECT code FROM app.work_order WHERE issue_id = $1 LIMIT 1', [c.issue_id])).rows[0];
      if (prior) staged = { ok: false, why: [`${c.issue_code} already has work order ${prior.code}`] };
      else if (!ctx.can(['service.assign', 'service.triage'])) { staged = { ok: false, why: ['staging a work order needs service.assign or service.triage (the service manager); this role holds neither'] }; await ctx.audit(q, 'apex.a3_stage', 'DENIED', { type: 'ApexCase', id: code }, { why: staged.why }); }
      else { try { const r = await createWorkOrder(ctx, c.issue_code, { note: `staged by APEX ${code} from hypothesis ${h.id}: ${h.text}` }); staged = { ok: true, id: r.workOrderId }; } catch (e) { staged = { ok: false, why: [(e as Error).message] }; } }
    }
    const o = engineAct(h, { ...body, tier }, { ...cx, stageWorkOrder: () => staged ?? { ok: false, why: ['no work-order staging for this tier'] } });
    const rec = { ...o, at: new Date().toISOString(), by: ctx.p.name, byRole: ctx.p.role, hypothesisId: h.id };
    await q.query('UPDATE app.apex_case SET actions = $2::jsonb || actions WHERE id = $1', [c.id, JSON.stringify([rec])]);
    await ctx.audit(q, `apex.${o.tier.toLowerCase()}`, o.outcome === 'REFUSED' ? 'DENIED' : 'ALLOWED', { type: 'ApexCase', id: code }, { hypothesisId: h.id, outcome: o.outcome, runbook: o.runbook || null, simulated: !!o.simulated, branch: o.branch || null });
    if (o.compensation) await ctx.audit(q, 'workflow.compensation_requested', 'ALLOWED', { type: 'ApexCase', id: code }, { detail: o.detail.slice(0, 200) });
    return { caseId: code, ...rec };
  });
}

export async function review(ctx: RequestContext, code: string, verdict: string) {
  await ctx.require(APEX_REVIEW, 'review an APEX diagnosis', { type: 'ApexCase', id: code });
  return ctx.tx(async (q) => {
    const c = await find(ctx, q, code, true);
    const top = c.hypotheses[0]!;
    const r = { verdict, by: ctx.p.name, byRole: ctx.p.role, at: new Date().toISOString() };
    await q.query('UPDATE app.apex_case SET review = $2 WHERE id = $1', [c.id, r]);
    await ctx.emit(q, 'apex.diagnosis_reviewed', { type: 'ApexCase', id: code, rev: 1 + c.actions.length }, { incidentId: c.issue_code, hypothesisId: top.id, tier: top.action.tier });
    await ctx.audit(q, 'apex.diagnosis_reviewed', 'ALLOWED', { type: 'ApexCase', id: code }, { verdict });
    return { caseId: code, review: r };
  });
}
