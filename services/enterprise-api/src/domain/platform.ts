/** Sign-in (development provider), the caller's profile, notifications, audit, integrations, knowledge, AI requests and outbox admin. */
import crypto from 'node:crypto';
import { asJson, type PgPool } from '../db/pg.js';
import type { RequestContext, Principal } from '../auth/context.js';
import type { Hs256Tokens } from '../auth/jwt.js';
import { verifyPassword } from '../auth/password.js';
import { ApiError, invalid, notFound } from '../http/errors.js';

interface Membership { tenant_id: string; tenant_slug: string; tenant_name: string; role_key: string; authorities: string[]; site_scope: string[] | null }

export async function signIn(pool: PgPool, tokens: Hs256Tokens, body: { email: string; password: string; tenant?: string; role?: string }) {
  const p = (await pool.query<{ id: string; display_name: string; password_hash: string | null; disabled: boolean }>('SELECT * FROM app.auth_person_by_email($1)', [body.email])).rows[0];
  const ok = verifyPassword(body.password, p?.password_hash ?? null);           // same work whether or not the account exists
  if (!p || !ok || p.disabled) throw new ApiError('unauthenticated', 'the email or password is not right');
  const ms = (await pool.query<Membership>('SELECT * FROM app.auth_memberships($1)', [p.id])).rows;
  const pick = ms.filter((m) => (!body.tenant || m.tenant_slug === body.tenant) && (!body.role || m.role_key === body.role));
  if (!pick.length) throw new ApiError('forbidden', 'no membership matches that tenant and role');
  if (new Set(pick.map((m) => `${m.tenant_slug}/${m.role_key}`)).size > 1) {
    throw new ApiError('conflict', 'several memberships match: choose a tenant and a role', pick.map((m) => `${m.tenant_slug}/${m.role_key}`));
  }
  const m = pick[0]!;
  const t = tokens.issue(p.id, m.tenant_id, m.role_key);
  return { accessToken: t.token, tokenType: 'Bearer', expiresIn: t.expiresIn, tenant: m.tenant_slug, role: m.role_key, person: p.display_name };
}

/** Resolve the caller from the database on every request: a revoked membership or a disabled person stops working at once. */
export async function resolvePrincipal(pool: PgPool, personId: string, tenantId: string, role: string): Promise<Principal | null> {
  const ms = (await pool.query<Membership>('SELECT * FROM app.auth_memberships($1)', [personId])).rows;
  const m = ms.find((x) => x.tenant_id === tenantId && x.role_key === role);
  if (!m) return null;
  const p = (await pool.query<{ display_name: string; disabled: boolean }>('SELECT * FROM app.auth_person($1)', [personId])).rows[0];
  if (!p || p.disabled) return null;
  const d = (await pool.query<{ authority: string; grantor_id: string; scope: Record<string, string[]>; expires_at: string; delegation_id: string }>('SELECT * FROM app.auth_delegations($1, $2)', [personId, tenantId])).rows;
  return { personId, name: p?.display_name || '', tenantId, tenantSlug: m.tenant_slug, role: m.role_key, authorities: m.authorities, siteScope: m.site_scope && m.site_scope.length ? m.site_scope : null,
    delegated: d.map((x) => ({ authority: x.authority, grantorId: x.grantor_id, scope: x.scope || {}, expiresAt: x.expires_at, delegationId: x.delegation_id })) };
}

/**
 * OIDC: map the provider's subject to a person (binding a verified email on first sign-in when allowed), then pick the membership the
 * request asks for (X-Empathia-Tenant / X-Empathia-Role headers); with exactly one membership the headers may be omitted.
 */
export async function resolveOidcPrincipal(pool: PgPool, claims: { sub: string; email?: string; email_verified?: boolean }, tenantSlug: string, role: string, linkByEmail: boolean): Promise<Principal | null> {
  let p = (await pool.query<{ id: string; display_name: string; disabled: boolean }>('SELECT * FROM app.auth_person_by_subject($1)', [claims.sub])).rows[0];
  if (!p && linkByEmail && claims.email && claims.email_verified === true) p = (await pool.query<{ id: string; display_name: string; disabled: boolean }>('SELECT * FROM app.auth_bind_subject($1, $2)', [claims.email, claims.sub])).rows[0];
  if (!p || p.disabled) return null;
  const ms = (await pool.query<Membership>('SELECT * FROM app.auth_memberships($1)', [p.id])).rows;
  const m = tenantSlug || role ? ms.find((x) => (!tenantSlug || x.tenant_slug === tenantSlug) && (!role || x.role_key === role)) : (ms.length === 1 ? ms[0] : undefined);
  if (!m) return null;
  return resolvePrincipal(pool, p.id, m.tenant_id, m.role_key);
}

export async function me(ctx: RequestContext) {
  return { person: { id: ctx.p.personId, name: ctx.p.name }, tenant: ctx.p.tenantSlug, role: ctx.p.role, authorities: ctx.p.authorities, siteScope: ctx.p.siteScope, delegated: ctx.p.delegated };
}

export async function notifications(ctx: RequestContext) {
  return ctx.tx(async (q) => ({ items: (await q.query('SELECT id, kind, title, link, created_at, read_at FROM app.notification WHERE to_role = $1 OR to_person = $2 ORDER BY id DESC LIMIT 100', [ctx.p.role, ctx.p.personId])).rows }));
}

export async function auditTrail(ctx: RequestContext, aggregateType: string | null, aggregateId: string | null, limit: number) {
  await ctx.require(['provenance.review', 'policy.configure'], 'read the audit trail');
  return ctx.tx(async (q) => {
    const args: unknown[] = [Math.min(Math.max(limit || 100, 1), 500)]; let where = 'true';
    if (aggregateType) { args.push(aggregateType); where += ` AND aggregate_type = $${args.length}`; }
    if (aggregateId) { args.push(aggregateId); where += ` AND aggregate_id = $${args.length}`; }
    return { items: (await q.query(`SELECT id, at, actor_id, actor_role, action, outcome, aggregate_type, aggregate_id, correlation_id, detail, seq, encode(hash, 'hex') AS hash FROM app.audit_event WHERE ${where} ORDER BY id DESC LIMIT $1`, args)).rows };
  });
}

export async function integrations(pool: PgPool) {
  return { items: (await pool.query('SELECT key, category, vendor, product, state, mode, note FROM app.integration ORDER BY category, vendor, product')).rows, note: 'Catalogue only: no partnership, certification or live connection is implied. Only VERIFIED rows (none today) carry evidence of a tested connection.' };
}

/** Probe an integration. MOCK rows answer from a local mock labelled MOCK; everything else is NOT_CONFIGURED. Never a network call. */
export async function probeIntegration(ctx: RequestContext, key: string) {
  await ctx.require(['adapter.allowlist', 'policy.configure'], 'probe an integration');
  const r = (await ctx.pool.query<{ key: string; state: string; product: string }>('SELECT key, state, product FROM app.integration WHERE key = $1', [key])).rows[0];
  if (!r) throw notFound(`integration ${key}`);
  await ctx.audit(null, 'integration.probe', 'ALLOWED', { type: 'Integration', id: key }, { state: r.state });
  if (r.state !== 'MOCK') throw new ApiError('not_configured', `${r.product} is ${r.state}: no adapter is configured, and none is called`);
  return { key, state: 'MOCK', label: 'MOCK — synthetic response from a local mock, not the vendor system', health: { reachable: 'MOCK', devices: 3, at: new Date().toISOString() } };
}

export async function knowledge(ctx: RequestContext, text: string | null) {
  return ctx.tx(async (q) => {
    const rows = (await q.query<{ id: string; title: string; source: string; version: number; body: string; allowed_roles: string[] }>('SELECT id, title, source, version, body, allowed_roles FROM app.knowledge_document')).rows;
    const allowed = rows.filter((r) => r.allowed_roles.includes('*') || r.allowed_roles.includes(ctx.p.role));
    const words = (text || '').toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    const scored = allowed.map((r) => ({ r, s: words.reduce((a, w) => a + (r.body.toLowerCase().split(w).length - 1) + 3 * (r.title.toLowerCase().includes(w) ? 1 : 0), 0) })).filter((x) => !words.length || x.s > 0).sort((a, b) => b.s - a.s);
    return { items: scored.slice(0, 20).map(({ r, s }) => ({ id: r.id, title: r.title, source: r.source, version: r.version, score: s, excerpt: r.body.slice(0, 280) })), hiddenByPermission: rows.length - allowed.length > 0 ? 'some documents are not visible to your role' : null };
  });
}

/** AI requests are logged; generation is NOT_CONFIGURED in the starter. Retrieval (permission-aware) still returns the sources. */
export async function aiRequest(ctx: RequestContext, body: { purpose: string; prompt: string }) {
  if (!body.prompt || body.prompt.length > 4000) throw invalid('prompt is 1–4000 characters');
  const sources = (await knowledge(ctx, body.prompt)).items.slice(0, 3).map((x) => ({ id: x.id, title: x.title, source: x.source }));
  await ctx.tx(async (q) => {
    await q.query('INSERT INTO app.ai_request (tenant_id, person_id, purpose, prompt_sha256, outcome, sources) VALUES ($1,$2,$3,$4,$5,$6)', [ctx.p.tenantId, ctx.p.personId, String(body.purpose || 'ask').slice(0, 80), crypto.createHash('sha256').update(body.prompt).digest('hex'), 'NOT_CONFIGURED', asJson(sources)]);
    await ctx.audit(q, 'ai.request', 'FAILED', { type: 'AIRequest', id: 'n/a' }, { outcome: 'NOT_CONFIGURED', sources: sources.length });
  });
  throw new ApiError('not_configured', 'No AI model is configured in the starter. The request was logged; the permitted sources below are what an answer would have to cite.', sources.map((s) => `${s.title} (${s.source})`));
}

/** Outbox events of the caller's tenant (row-level security), never their payloads. A PENDING event can be held behind an earlier
 *  undelivered event of the same aggregate (worker/outbox.ts): aggregate_rev shows where it sits. */
export async function outboxAdmin(ctx: RequestContext, status: string) {
  await ctx.require('policy.configure', 'read the outbox');
  if (!['PENDING', 'DELIVERED', 'DEAD_LETTER'].includes(status)) throw invalid('status is PENDING, DELIVERED or DEAD_LETTER');
  return ctx.tx(async (q) => ({ items: (await q.query('SELECT id, type, aggregate_type, aggregate_id, aggregate_rev, status, attempts, next_attempt_at, last_error, occurred_at, delivered_at FROM app.outbox_event WHERE status = $1 ORDER BY occurred_at DESC LIMIT 200', [status])).rows }));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Replay one dead-lettered event (security admin, policy.configure). A reason is required. Only a DEAD_LETTER event can be replayed
 * (409 otherwise, so a duplicate request never requeues twice); an event of another tenant, or none, is 404 with the same answer.
 * The audit event (Evidence Ledger) records who, when, why, the prior status, attempts and last error, and the outcome; refusals are
 * audited too. Handlers that already took effect for the event (their delivery receipts) are not run again by the replay.
 */
export async function outboxRetry(ctx: RequestContext, id: string, body: { reason?: string }) {
  await ctx.require('policy.configure', 'retry a dead-lettered event');
  const reason = String(body?.reason ?? '').trim();
  if (reason.length < 5 || reason.length > 1000) throw invalid('a reason (5–1000 characters) is required to replay an event');
  const aggregate = { type: 'OutboxEvent', id: id.slice(0, 80) };
  const missing = async (): Promise<never> => { await ctx.audit(null, 'outbox.retry', 'DENIED', aggregate, { reason, outcome: 'NOT_FOUND' }); throw notFound('outbox event'); };
  if (!UUID_RE.test(id)) return missing();
  const out = await ctx.tx(async (q) => {
    const e = (await q.query<{ status: string; attempts: number; last_error: string | null; type: string; aggregate_type: string; aggregate_id: string; aggregate_rev: number }>(
      'SELECT status, attempts, last_error, type, aggregate_type, aggregate_id, aggregate_rev FROM app.outbox_event WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!e) return { refused: 'NOT_FOUND' as const };
    if (e.status !== 'DEAD_LETTER') return { refused: 'NOT_DEAD_LETTER' as const, status: e.status };
    await q.query(`UPDATE app.outbox_event SET status = 'PENDING', attempts = 0, next_attempt_at = now(), last_error = NULL, lease_owner = NULL, lease_until = NULL WHERE id = $1`, [id]);
    await ctx.audit(q, 'outbox.retry', 'ALLOWED', aggregate, { reason, priorStatus: e.status, priorAttempts: e.attempts, lastError: e.last_error, eventType: e.type, eventAggregate: { type: e.aggregate_type, id: e.aggregate_id, rev: e.aggregate_rev }, outcome: 'REQUEUED' });
    return { id, status: 'PENDING', priorAttempts: e.attempts };
  });
  if ('refused' in out) {
    if (out.refused === 'NOT_FOUND') return missing();
    await ctx.audit(null, 'outbox.retry', 'DENIED', aggregate, { reason, status: out.status, outcome: 'REFUSED_NOT_DEAD_LETTERED' });
    throw new ApiError('conflict', `only a dead-lettered event can be replayed; this one is ${out.status}`);
  }
  return out;
}
