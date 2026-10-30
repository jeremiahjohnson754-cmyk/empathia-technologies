/**
 * The Founder Studio's private workspace (ADR-0001 §3): workspace state and the founder decision log.
 *
 * Boundary, enforced twice: (1) every operation requires the `founder.workspace` authority, which only the `founder` role carries, and
 * the principal's organization must be the founder organization (slug FOUNDER_TENANT); (2) the founder tables' row-level policy admits
 * a statement only when the transaction set app.founder = on — set here, after (1), never anywhere else — and only for the founder
 * tenant's rows. An enterprise principal therefore cannot reach founder rows through any route, and a founder principal's enterprise
 * reads run in the founder tenant, which holds no customer records. Both directions are tested in tests/security/founder-boundary.test.mjs.
 * Decisions are revisioned: a change appends a revision row (append-only) and bumps the decision's revision; nothing is edited in place.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Queryable, PgPool } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import { ApiError, invalid, notFound } from '../http/errors.js';

export const FOUNDER_TENANT = 'empathia-founder';
export const FOUNDER_AUTHORITY = 'founder.workspace';
const AREAS = ['product', 'engineering', 'commercial', 'operations', 'investor', 'legal'];
const NEXT: Record<string, string[]> = { DRAFT: ['DECIDED', 'WITHDRAWN'], DECIDED: ['REVISITED', 'WITHDRAWN'], REVISITED: ['DECIDED', 'WITHDRAWN'], WITHDRAWN: [] };

async function guard(ctx: RequestContext, action: string, aggregate?: { type: string; id: string }): Promise<void> {
  await ctx.require(FOUNDER_AUTHORITY, action, aggregate);
  if (ctx.p.tenantSlug !== FOUNDER_TENANT) { await ctx.audit(null, action, 'DENIED', aggregate, { why: 'not the founder organization', tenant: ctx.p.tenantSlug }); throw new ApiError('forbidden', 'the founder workspace belongs to the founder organization only'); }
}
const founderTx = <T>(ctx: RequestContext, fn: (q: Queryable) => Promise<T>) => ctx.tx(async (q) => { await q.query("SELECT set_config('app.founder', 'on', true)"); return fn(q); });

export async function getWorkspace(ctx: RequestContext) {
  await guard(ctx, 'read the founder workspace');
  return founderTx(ctx, async (q) => { const r = await q.query('SELECT state, revision, updated_at FROM founder.workspace_state WHERE tenant_id = $1 AND person_id = $2', [ctx.p.tenantId, ctx.p.personId]); return r.rows[0] || { state: {}, revision: 0, updated_at: null }; });
}
export async function putWorkspace(ctx: RequestContext, body: { state: Record<string, unknown>; revision: number }) {
  await guard(ctx, 'write the founder workspace');
  if (JSON.stringify(body.state).length > 200000) throw invalid('the workspace state is too large (200 kB)');
  return founderTx(ctx, async (q) => {
    const cur = await q.query<{ revision: number }>('SELECT revision FROM founder.workspace_state WHERE tenant_id = $1 AND person_id = $2 FOR UPDATE', [ctx.p.tenantId, ctx.p.personId]);
    const have = cur.rows[0]?.revision ?? 0;
    if (body.revision !== have) throw new ApiError('conflict', `the workspace changed elsewhere (you have revision ${body.revision}, the server has ${have}); reload and merge`);
    const r = await q.query<{ revision: number; updated_at: string }>(`INSERT INTO founder.workspace_state (tenant_id, person_id, state, revision) VALUES ($1,$2,$3,1) ON CONFLICT (tenant_id, person_id) DO UPDATE SET state = EXCLUDED.state, revision = founder.workspace_state.revision + 1, updated_at = now() RETURNING revision, updated_at`, [ctx.p.tenantId, ctx.p.personId, body.state]);
    await ctx.audit(q, 'founder.workspace_saved', 'ALLOWED', { type: 'FounderWorkspace', id: ctx.p.personId }, { revision: r.rows[0]!.revision });
    return r.rows[0];
  });
}

export async function listDecisions(ctx: RequestContext) {
  await guard(ctx, 'read founder decisions');
  return founderTx(ctx, async (q) => ({ items: (await q.query('SELECT d.id, d.code, d.title, d.area, d.status, d.revision, d.created_at, d.updated_at, r.rationale, r.options, r.decided_by, r.at AS decided_at FROM founder.decision d JOIN founder.decision_revision r ON r.decision_id = d.id AND r.revision = d.revision WHERE d.tenant_id = $1 ORDER BY d.code', [ctx.p.tenantId])).rows }));
}
export async function createDecision(ctx: RequestContext, body: { title: string; area: string; rationale: string; options?: unknown[] }) {
  await guard(ctx, 'record a founder decision');
  if (!AREAS.includes(body.area)) throw invalid(`area is one of ${AREAS.join(', ')}`);
  return founderTx(ctx, async (q) => {
    const n = await q.query<{ n: string }>(`SELECT COALESCE(MAX(substring(code FROM 4)::int), 0) + 1 AS n FROM founder.decision WHERE tenant_id = $1`, [ctx.p.tenantId]);
    const code = `FD-${String(n.rows[0]!.n).padStart(4, '0')}`;
    const d = await q.query<{ id: string }>('INSERT INTO founder.decision (tenant_id, code, title, area, status, revision, created_by) VALUES ($1,$2,$3,$4,$5,1,$6) RETURNING id', [ctx.p.tenantId, code, body.title.trim(), body.area, 'DRAFT', ctx.p.personId]);
    const id = d.rows[0]!.id;
    await q.query('INSERT INTO founder.decision_revision (tenant_id, decision_id, revision, status, rationale, options, decided_by) VALUES ($1,$2,1,$3,$4,$5,$6)', [ctx.p.tenantId, id, 'DRAFT', body.rationale.trim(), JSON.stringify(body.options || []), ctx.p.personId]);
    await ctx.audit(q, 'founder.decision_recorded', 'ALLOWED', { type: 'FounderDecision', id }, { code, area: body.area });
    return { id, code, status: 'DRAFT', revision: 1 };
  });
}
export async function transitionDecision(ctx: RequestContext, id: string, body: { to: string; rationale: string; options?: unknown[] }) {
  await guard(ctx, 'change a founder decision', { type: 'FounderDecision', id });
  return founderTx(ctx, async (q) => {
    const d = await q.query<{ status: string; revision: number; code: string }>('SELECT status, revision, code FROM founder.decision WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [id, ctx.p.tenantId]);
    if (!d.rowCount) throw notFound(`decision ${id}`);
    const cur = d.rows[0]!;
    if (!(NEXT[cur.status] || []).includes(body.to)) await ctx.refuse('founder.decision_transition', { type: 'FounderDecision', id }, [`a ${cur.status} decision cannot become ${body.to} (allowed: ${(NEXT[cur.status] || []).join(', ') || 'none'})`], { from: cur.status, to: body.to });
    const rev = cur.revision + 1;
    await q.query('INSERT INTO founder.decision_revision (tenant_id, decision_id, revision, status, rationale, options, decided_by) VALUES ($1,$2,$3,$4,$5,$6,$7)', [ctx.p.tenantId, id, rev, body.to, body.rationale.trim(), JSON.stringify(body.options || []), ctx.p.personId]);
    await q.query('UPDATE founder.decision SET status = $3, revision = $4, updated_at = now() WHERE id = $1 AND tenant_id = $2', [id, ctx.p.tenantId, body.to, rev]);
    await ctx.audit(q, 'founder.decision_transition', 'ALLOWED', { type: 'FounderDecision', id }, { code: cur.code, from: cur.status, to: body.to, revision: rev });
    return { id, code: cur.code, status: body.to, revision: rev };
  });
}
export async function decisionHistory(ctx: RequestContext, id: string) {
  await guard(ctx, 'read a founder decision', { type: 'FounderDecision', id });
  return founderTx(ctx, async (q) => { const r = await q.query('SELECT revision, status, rationale, options, decided_by, at FROM founder.decision_revision WHERE decision_id = $1 AND tenant_id = $2 ORDER BY revision', [id, ctx.p.tenantId]); if (!r.rowCount) throw notFound(`decision ${id}`); return { items: r.rows }; });
}

/**
 * Platform-health summary for the Founder Studio (ADR-0007; owner decision 2026-10-30). Governed integration contract:
 *   trigger: founder read · source of truth: tests/evidence (repository) + service health · destination: Founder Studio "Platform" view
 *   fields: suite names/results/counts, build/evidence timestamps, migrations applied, outbox backlog, integration adapter states
 *   authorization: founder.workspace in the founder organization (guard) · classification: CONFIDENTIAL_TECHNICAL
 *   failure: evidence file missing → {available:false, reason} (never a fabricated pass) · audit: every read is audited
 *   boundary: NO tenant, customer, financial or operational records — only aggregate counts of platform state. Enterprise principals: 403.
 */
export async function platformHealth(ctx: RequestContext, deps: { pool: PgPool; health: () => Promise<Record<string, unknown>> }, evidenceDir: string) {
  await guard(ctx, 'read platform health');
  const read = (name: string) => { try { return JSON.parse(fs.readFileSync(path.join(evidenceDir, name), 'utf8')) as Record<string, unknown>; } catch { return null; } };
  const tests = read('TEST_RESULTS.json'); const verify = read('VERIFY_REPORT.json');
  const health = await deps.health();
  const integrations = (await deps.pool.query<{ state: string; n: number }>('SELECT state, count(*)::int AS n FROM app.integration GROUP BY state ORDER BY state')).rows;
  await ctx.audit(null, 'founder.platform_health_read', 'ALLOWED', undefined, { classification: 'CONFIDENTIAL_TECHNICAL' });
  const suites = tests ? ((tests['suites'] || tests['results'] || []) as Array<Record<string, unknown>>).map((s) => ({ name: s['name'] ?? s['suite'], status: s['status'], passed: s['passed'] ?? s['pass'], failed: s['failed'] ?? s['fail'] })) : [];
  return {
    classification: 'CONFIDENTIAL_TECHNICAL', contract: 'ADR-0007', generatedAt: new Date().toISOString(),
    tests: tests ? { available: true, generatedAt: tests['generatedAt'] ?? tests['at'] ?? null, summary: tests['summary'] ?? null, suites } : { available: false, reason: 'tests/evidence/TEST_RESULTS.json is not present on this host: NOT RUN' },
    verification: verify ? { available: true, generatedAt: verify['generatedAt'] ?? null, status: verify['status'] ?? verify['overall'] ?? null } : { available: false, reason: 'VERIFY_REPORT.json not present' },
    service: { status: health['status'], version: health['version'], database: health['database'], worker: health['worker'] ?? null, liveHealth: health['liveHealth'] ?? 'NOT_MONITORED' },
    integrations,
    excluded: ['tenant records', 'customer records', 'financial data', 'operational room/issue/work-order data'],
  };
}
