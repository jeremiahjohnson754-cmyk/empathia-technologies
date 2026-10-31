/**
 * Empathia Learn and SIGNAL (P8).
 *   The SIGNAL library (packages/domain-data/data/SIGNAL_LIB.json — 161 lessons with checks, 146 drills in six kinds, 62 canon cases,
 *   125 formulas, 522 glossary terms; carried over unchanged, provenance in PROVENANCE.json) is served in sections so the index stays
 *   small. Reviewed cases are written from what actually happened: a RESOLVED/CLOSED work order, the customer's permission, text
 *   de-identified against THIS organization's own room, building, site and person names (checked here, not trusted), a subject-matter
 *   review by someone other than the proposer, a steward's approval by someone who is neither. Training records are append-only and
 *   never grant work authorization.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Queryable } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import { ApiError, notFound } from '../http/errors.js';

export const LEARN_PROPOSE = ['tests.verify.all', 'service.verify', 'baseline.approve', 'case.approve', 'service.close'];
export const LEARN_SME = ['tests.verify.all', 'review.dsp', 'review.camera', 'review.touch', 'baseline.approve'];

interface Lib { lessons: Record<string, { domain: string; title: string; sum: string; cards: string[]; quiz?: string }>; lessonOrder: string[]; lessonDomains: string[]; quizzes: Record<string, { title: string; domain: string; qs: unknown[] }>; drills: Record<string, { id: string; type: string; domain: string; time: number; title: string; brief: string }>; drillOrder: string[]; cases: Record<string, { title: string; episode: string; hook: string; learn: string[]; id: string; canon: boolean }>; caseOrder: string[]; formulas: Record<string, unknown>; glossary: Array<{ id: string; term: string; d: string; dom: string }>; labs?: Record<string, unknown>; labOrder?: string[] }
let lib: Lib | null = null;
function library(): Lib {
  if (lib) return lib;
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [path.resolve(here, '../../../../packages/domain-data/data/SIGNAL_LIB.json'), path.resolve(here, '../../../../../packages/domain-data/data/SIGNAL_LIB.json')];
  const f = candidates.find((p) => fs.existsSync(p)); if (!f) throw new ApiError('not_configured', 'the SIGNAL library is not present in this build');
  lib = JSON.parse(fs.readFileSync(f, 'utf8')) as Lib; return lib;
}

export function libraryIndex() {
  const L = library();
  return { version: '1.4.1 (carried over unchanged; see PROVENANCE.json)', domains: L.lessonDomains, lessons: L.lessonOrder.map((id) => ({ id, ...L.lessons[id]!, cards: undefined, quiz: !!L.lessons[id]!.quiz })), drills: L.drillOrder.map((id) => { const d = L.drills[id]!; return { id, type: d.type, domain: d.domain, time: d.time, title: d.title }; }), canon: L.caseOrder.map((id) => { const c = L.cases[id]!; return { id, title: c.title, episode: c.episode, hook: c.hook }; }), counts: { lessons: L.lessonOrder.length, quizzes: Object.keys(L.quizzes).length, drills: L.drillOrder.length, canon: L.caseOrder.length, formulas: Object.keys(L.formulas).length, glossary: L.glossary.length, labs: L.labOrder?.length || 0 }, note: 'Labs (simulators) are in the library but not interactive in this build.' };
}
export function lesson(id: string) { const L = library(); const l = L.lessons[id]; if (!l) throw notFound(`lesson ${id}`); return { id, ...l, quizId: l.quiz || null, quiz: l.quiz ? L.quizzes[l.quiz] || null : null }; }
export function drill(id: string) { const d = library().drills[id]; if (!d) throw notFound(`drill ${id}`); return d; }
export function canon(id: string) { const c = library().cases[id]; if (!c) throw notFound(`canon case ${id}`); return c; }
export function reference() { const L = library(); return { formulas: L.formulas, glossary: L.glossary }; }

// ---------------------------------------------------------------------------------------------------------- reviewed cases
interface Row { id: string; code: string; work_order_id: string; title: string; lesson: string; permission: { by: string; at: string; note: string | null }; deidentified: boolean; state: string; proposed_by: string; proposed_at: string; sme_review: { decision: string; by: string; at: string; note: string } | null; approved_by: string | null; approved_at: string | null; wo_code: string; wo_state: string; proposer: string; reviewer: string | null; approver: string | null }
const SELECT = 'SELECT c.*, w.code AS wo_code, w.state AS wo_state, p.display_name AS proposer, r.display_name AS reviewer, a.display_name AS approver FROM app.learn_case c JOIN app.work_order w ON w.id = c.work_order_id AND w.tenant_id = c.tenant_id JOIN app.person p ON p.id = c.proposed_by LEFT JOIN app.person r ON r.id = (c.sme_review->>\'by\')::uuid LEFT JOIN app.person a ON a.id = c.approved_by';
const view = (ctx: RequestContext, c: Row) => ({ code: c.code, title: c.title, lesson: c.lesson, state: c.state, workOrder: { code: c.wo_code, state: c.wo_state }, permission: c.permission, deidentified: c.deidentified, proposedBy: c.proposer, proposedAt: c.proposed_at, smeReview: c.sme_review ? { ...c.sme_review, by: c.reviewer } : null, approvedBy: c.approver, approvedAt: c.approved_at,
  yours: { review: c.state === 'PROPOSED' && ctx.can(LEARN_SME) && c.proposed_by !== ctx.p.personId, approve: c.state === 'SME_REVIEWED' && ctx.can('case.approve') && c.proposed_by !== ctx.p.personId && c.sme_review?.by !== ctx.p.personId } });

export async function listCases(ctx: RequestContext) {
  const rows = (await ctx.tx((q) => q.query<Row>(`${SELECT} ORDER BY c.proposed_at DESC LIMIT 200`))).rows;
  return { items: rows.map((c) => view(ctx, c)), mayPropose: ctx.can(LEARN_PROPOSE) };
}

/**
 * De-identification is checked against the organization's own names, not a fixed list: the full names of rooms, buildings, sites and
 * people (parenthesised markers such as "(synthetic)" removed), room and building codes as whole words, and a person's surname on its
 * own — unless that last word is a role noun ("Engineer", "Technician", …), because generic vocabulary is not identifying.
 */
const ROLE_NOUNS = new Set(['engineer', 'technician', 'manager', 'lead', 'reviewer', 'administrator', 'admin', 'steward', 'requestor', 'installer', 'designer', 'executive', 'finance', 'officer', 'owner', 'sponsor', 'authority', 'approver', 'architect', 'operator', 'specialist', 'analyst', 'coordinator', 'director', 'founder', 'employee', 'vendor', 'supplier', 'champion']);
async function namesIn(q: Queryable, text: string): Promise<string[]> {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9-]+/g, ' ')} `;
  const has = (needle: string) => t.includes(` ${needle.toLowerCase().replace(/[^a-z0-9-]+/g, ' ').trim()} `);
  const clean = (n: string) => n.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const places = (await q.query<{ n: string; c: string }>('SELECT name AS n, code AS c FROM app.room UNION SELECT name, code FROM app.building UNION SELECT name, code FROM app.site')).rows;
  const people = (await q.query<{ n: string }>('SELECT DISTINCT p.display_name AS n FROM app.person p JOIN app.membership m ON m.person_id = p.id')).rows;
  const hits = new Set<string>();
  for (const { n, c } of places) { const full = clean(n); if (full.length >= 4 && has(full)) hits.add(full); if (c && has(c)) hits.add(c); }
  for (const { n } of people) {
    const full = clean(n); if (full.length >= 4 && has(full)) hits.add(full);
    const parts = full.split(/[\s/]+/).filter(Boolean); const last = parts[parts.length - 1] || '';
    if (parts.length >= 2 && last.length >= 4 && !ROLE_NOUNS.has(last.toLowerCase()) && has(last)) hits.add(last);
  }
  return [...hits];
}

export async function propose(ctx: RequestContext, woCode: string, body: { title: string; lesson: string; permission: boolean; permissionNote?: string; deidentified: boolean }) {
  await ctx.require(LEARN_PROPOSE, 'propose a Learn case', { type: 'WorkOrder', id: woCode });
  return ctx.tx(async (q) => {
    const w = (await q.query<{ id: string; state: string }>('SELECT id, state FROM app.work_order WHERE code = $1', [woCode])).rows[0]; if (!w) throw notFound(`work order ${woCode}`);
    const why: string[] = [];
    if (!['RESOLVED', 'CLOSED'].includes(w.state)) why.push(`a case is written from what actually happened: the work order must be RESOLVED or CLOSED (it is ${w.state})`);
    if (!body.permission) why.push('customer permission to reuse the incident is required');
    if (!body.deidentified) why.push('the case must be declared de-identified (no room, person or organization names)');
    const named = await namesIn(q, `${body.title} ${body.lesson}`); if (named.length) why.push(`the text still names this organization’s places or people: ${named.join(', ')}`);
    if ((await q.query('SELECT 1 FROM app.learn_case WHERE work_order_id = $1', [w.id])).rowCount) why.push(`${woCode} already has a case`);
    if (why.length) await ctx.refuse('learn.propose', { type: 'WorkOrder', id: woCode }, why);
    const code = (await q.query<{ c: string }>("SELECT app.next_code('learn_case', 'LC-') AS c")).rows[0]!.c;
    await q.query('INSERT INTO app.learn_case (tenant_id, work_order_id, code, title, lesson, permission, deidentified, proposed_by) VALUES ($1,$2,$3,$4,$5,$6,true,$7)', [ctx.p.tenantId, w.id, code, body.title.trim(), body.lesson.trim(), { by: ctx.p.personId, at: new Date().toISOString(), note: body.permissionNote || null }, ctx.p.personId]);
    await ctx.audit(q, 'learn.propose', 'ALLOWED', { type: 'LearnCase', id: code }, { workOrder: woCode });
    return { caseId: code, state: 'PROPOSED' };
  });
}
export async function smeReview(ctx: RequestContext, code: string, body: { decision: 'approve' | 'reject'; note: string }) {
  await ctx.require(LEARN_SME, 'review a Learn case', { type: 'LearnCase', id: code });
  return ctx.tx(async (q) => {
    const c = (await q.query<Row>(`${SELECT} WHERE c.code = $1 FOR UPDATE OF c`, [code])).rows[0]; if (!c) throw notFound(`case ${code}`);
    const why: string[] = [];
    if (c.state !== 'PROPOSED') why.push(`SME review happens on a PROPOSED case (now ${c.state})`);
    if (c.proposed_by === ctx.p.personId) why.push('the proposer is not the subject-matter reviewer of their own case (separation of duties)');
    if (why.length) await ctx.refuse('learn.sme_review', { type: 'LearnCase', id: code }, why);
    const state = body.decision === 'approve' ? 'SME_REVIEWED' : 'REJECTED';
    await q.query('UPDATE app.learn_case SET state = $2, sme_review = $3 WHERE id = $1', [c.id, state, { decision: body.decision, by: ctx.p.personId, at: new Date().toISOString(), note: body.note }]);
    await ctx.audit(q, 'learn.sme_review', 'ALLOWED', { type: 'LearnCase', id: code }, { decision: body.decision });
    return { caseId: code, state };
  });
}
export async function approve(ctx: RequestContext, code: string) {
  await ctx.require('case.approve', 'approve a Learn case', { type: 'LearnCase', id: code });
  return ctx.tx(async (q) => {
    const c = (await q.query<Row>(`${SELECT} WHERE c.code = $1 FOR UPDATE OF c`, [code])).rows[0]; if (!c) throw notFound(`case ${code}`);
    const why: string[] = [];
    if (c.state !== 'SME_REVIEWED') why.push(`the steward approves an SME-reviewed case (now ${c.state})`);
    if (c.proposed_by === ctx.p.personId || c.sme_review?.by === ctx.p.personId) why.push('the steward is neither the proposer nor the reviewer (separation of duties)');
    if (why.length) await ctx.refuse('training.case_approved', { type: 'LearnCase', id: code }, why);
    await q.query("UPDATE app.learn_case SET state = 'APPROVED', approved_by = $2, approved_at = now() WHERE id = $1", [c.id, ctx.p.personId]);
    await ctx.emit(q, 'training.case_approved', { type: 'LearnCase', id: code, rev: 3 }, { caseId: code, approverId: ctx.p.personId });
    await ctx.audit(q, 'training.case_approved', 'ALLOWED', { type: 'LearnCase', id: code });
    return { caseId: code, state: 'APPROVED' };
  });
}

// ---------------------------------------------------------------------------------------------------------- training
export async function recordTraining(ctx: RequestContext, body: { kind: 'quiz' | 'drill'; itemId: string; correct?: boolean; score?: number; total?: number; elapsedS?: number }) {
  const L = library();
  if (body.kind === 'drill' && !L.drills[body.itemId]) throw notFound(`drill ${body.itemId}`);
  if (body.kind === 'quiz' && !L.quizzes[body.itemId]) throw notFound(`quiz ${body.itemId}`);
  return ctx.tx(async (q) => {
    await q.query('INSERT INTO app.training_record (tenant_id, person_id, kind, item_id, correct, score, total, elapsed_s) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [ctx.p.tenantId, ctx.p.personId, body.kind, body.itemId, body.correct ?? null, body.score ?? null, body.total ?? null, body.elapsedS ?? null]);
    await ctx.audit(q, body.kind === 'drill' ? 'training.drill_completed' : 'training.quiz_completed', 'ALLOWED', { type: 'Training', id: body.itemId }, { correct: body.correct ?? null, score: body.score ?? null, total: body.total ?? null, note: 'training performance never grants work authorization' });
    return { recorded: true, note: 'Recorded as training. Training performance never grants work authorization.' };
  });
}
export async function myTraining(ctx: RequestContext) {
  const rows = (await ctx.tx((q) => q.query<{ id: string; kind: string; item_id: string; correct: boolean | null; score: number | null; total: number | null; elapsed_s: number | null; at: string }>('SELECT id, kind, item_id, correct, score, total, elapsed_s, at FROM app.training_record WHERE person_id = $1 ORDER BY at DESC LIMIT 200', [ctx.p.personId]))).rows;
  return { items: rows.map((r) => ({ id: Number(r.id), kind: r.kind, itemId: r.item_id, correct: r.correct, score: r.score, total: r.total, elapsedS: r.elapsed_s, at: r.at })), note: 'Your own records only; they never grant work authorization.' };
}
