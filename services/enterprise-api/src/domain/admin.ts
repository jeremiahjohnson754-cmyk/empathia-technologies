/**
 * Administration (ADR-0006/0007; owner decision 2026-10-30): invitations, scoped memberships, the policy model, delegations.
 *   - Invitations are created by a holder of policy.configure for the caller's own tenant only (RLS and the tenant id on the row both
 *     pin it); the one-time token is returned once and only its SHA-256 is stored; acceptance is unauthenticated (the token is the
 *     credential) and atomic in app.accept_invitation; the founder role is grantable only in the founder organization (trigger EM008).
 *   - Memberships: grant/revoke/scope, audited; the administrator cannot grant 'architect' ('*') and cannot change their own membership.
 *   - Policy: the canonical persona → permission mapping (the 22 personas are the roles) and the 14 legacy UI roles mapped to personas
 *     (ADR-0006); a UI role switch is a view preference, never authentication.
 *   - Delegations (ADR-0005): a person lends an authority they hold to another person, scoped, for at most 90 days; revocable by the
 *     grantor or a security administrator; used delegations are audited by RequestContext.require.
 */
import crypto from 'node:crypto';
import PERSONAS from '@empathia/domain-data/data/V25_PERSONAS.json' with { type: 'json' };
import type { RequestContext } from '../auth/context.js';
import { ApiError, invalid, notFound } from '../http/errors.js';
import { hashPassword } from '../auth/password.js';
import type { PgPool } from '../db/pg.js';

const P = PERSONAS as unknown as Record<string, { label: string; base: string; home: string; authority: string[] }>;
const ADMIN = 'policy.configure';
/** The 14 legacy UI roles of V2.5.3 and the persona each one views as (the persona carries the permissions; the UI role carries none). */
export const UI_ROLE_TO_PERSONA: Record<string, string> = { visitor: 'requestor', employee: 'requestor', exec: 'exec', service: 'service', svcmgr: 'svcmgr', syseng: 'syseng', designer: 'designer', installer: 'installer', cxeng: 'cxeng', ipm: 'ipm', bpm: 'bpm', ops: 'opslead', steward: 'steward', architect: 'architect' };
const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export async function createInvitation(ctx: RequestContext, body: { email: string; roleKey: string; siteCodes?: string[]; days?: number }) {
  await ctx.require(ADMIN, 'invite a person', { type: 'Tenant', id: ctx.p.tenantSlug });
  if (!P[body.roleKey] && body.roleKey !== 'founder') throw invalid(`unknown role ${body.roleKey}`);
  if (body.roleKey === 'architect') throw new ApiError('rule_refused', 'the architect role (every authority) is never granted through an invitation');
  const days = body.days ?? 7; if (days < 1 || days > 30) throw invalid('days is between 1 and 30');
  const token = crypto.randomBytes(24).toString('base64url');
  return ctx.tx(async (q) => {
    let scope: string[] | null = null;
    if (body.siteCodes?.length) { const s = (await q.query<{ id: string }>('SELECT id FROM app.site WHERE code = ANY($1)', [body.siteCodes])).rows; if (s.length !== body.siteCodes.length) throw invalid('a site code is unknown in your organization'); scope = s.map((x) => x.id); }
    let id: string;
    try {
      id = (await q.query<{ id: string }>(`INSERT INTO app.invitation (tenant_id, email, role_key, site_scope, token_hash, invited_by, expires_at) VALUES ($1,$2,$3,$4,$5,$6, now() + ($7 || ' days')::interval) RETURNING id`, [ctx.p.tenantId, body.email.toLowerCase(), body.roleKey, scope, sha(token), ctx.p.personId, String(days)])).rows[0]!.id;
    } catch (e) { if (/EM008/.test(String((e as Error).message))) { await ctx.refuse('admin.invite', { type: 'Tenant', id: ctx.p.tenantSlug }, ['the founder role exists only in the founder organization (EM008)']); } throw e; }
    await ctx.audit(q, 'admin.invite', 'ALLOWED', { type: 'Invitation', id }, { email: body.email.toLowerCase(), roleKey: body.roleKey, sites: body.siteCodes || null, days });
    return { id, token, expiresInDays: days, note: 'the token is shown once; only its hash is stored' };
  });
}
export async function listInvitations(ctx: RequestContext) {
  await ctx.require(ADMIN, 'list invitations');
  return ctx.tx(async (q) => ({ items: (await q.query('SELECT id, email, role_key, site_scope, invited_by, created_at, expires_at, accepted_at, accepted_by, revoked_at FROM app.invitation ORDER BY created_at DESC LIMIT 200')).rows }));
}
export async function revokeInvitation(ctx: RequestContext, id: string) {
  await ctx.require(ADMIN, 'revoke an invitation', { type: 'Invitation', id });
  return ctx.tx(async (q) => {
    const r = await q.query('UPDATE app.invitation SET revoked_at = now() WHERE id = $1 AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id', [id]);
    if (!r.rows.length) throw notFound(`an open invitation ${id}`);
    await ctx.audit(q, 'admin.invitation_revoked', 'ALLOWED', { type: 'Invitation', id });
    return { id, revoked: true };
  });
}
/** Unauthenticated: the token is the credential. Rate-limited by the server's public bucket. Nothing about the invitation is revealed before it succeeds. */
export async function acceptInvitation(pool: PgPool, body: { token: string; displayName: string; password: string }) {
  if (body.password.length < 12) throw invalid('the password is at least 12 characters');
  try {
    const r = await pool.query<{ tenant_slug: string; role_key: string; person_id: string }>('SELECT * FROM app.accept_invitation($1, $2, $3)', [sha(body.token), body.displayName, hashPassword(body.password)]);
    const row = r.rows[0]!;
    return { tenant: row.tenant_slug, role: row.role_key, personId: row.person_id, next: 'sign in with your email and the password you chose' };
  } catch (e) { if (/EM007/.test(String((e as Error).message))) throw new ApiError('rule_refused', 'the invitation is unknown, already used, revoked or expired'); throw e; }
}

export async function grantMembership(ctx: RequestContext, body: { personId: string; roleKey: string; siteCodes?: string[] | null }) {
  await ctx.require(ADMIN, 'grant a membership', { type: 'Person', id: body.personId });
  if (body.roleKey === 'architect') throw new ApiError('rule_refused', 'the architect role (every authority) is never granted through administration');
  if (body.personId === ctx.p.personId) await ctx.refuse('admin.membership_grant', { type: 'Person', id: body.personId }, ['an administrator does not change their own memberships (ADR-0005)']);
  return ctx.tx(async (q) => {
    const exists = (await q.query('SELECT 1 FROM app.membership WHERE person_id = $1', [body.personId])).rows.length;   // RLS: only this tenant's memberships are visible
    if (!exists) throw notFound(`person ${body.personId} in your organization`);
    let scope: string[] | null = null;
    if (body.siteCodes?.length) { const s = (await q.query<{ id: string }>('SELECT id FROM app.site WHERE code = ANY($1)', [body.siteCodes])).rows; if (s.length !== body.siteCodes.length) throw invalid('a site code is unknown in your organization'); scope = s.map((x) => x.id); }
    try {
      await q.query('INSERT INTO app.membership (tenant_id, person_id, role_key, site_scope) VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id, person_id, role_key) DO UPDATE SET site_scope = EXCLUDED.site_scope, revoked_at = NULL', [ctx.p.tenantId, body.personId, body.roleKey, scope]);
    } catch (e) { if (/EM008/.test(String((e as Error).message))) await ctx.refuse('admin.membership_grant', { type: 'Person', id: body.personId }, ['the founder role exists only in the founder organization (EM008)']); throw e; }
    await ctx.audit(q, 'admin.membership_grant', 'ALLOWED', { type: 'Person', id: body.personId }, { roleKey: body.roleKey, sites: body.siteCodes || null });
    return { personId: body.personId, roleKey: body.roleKey, siteScope: body.siteCodes || null };
  });
}
export async function revokeMembership(ctx: RequestContext, body: { personId: string; roleKey: string }) {
  await ctx.require(ADMIN, 'revoke a membership', { type: 'Person', id: body.personId });
  if (body.personId === ctx.p.personId) await ctx.refuse('admin.membership_revoke', { type: 'Person', id: body.personId }, ['an administrator does not change their own memberships (ADR-0005)']);
  return ctx.tx(async (q) => {
    const r = await q.query('UPDATE app.membership SET revoked_at = now() WHERE person_id = $1 AND role_key = $2 AND revoked_at IS NULL RETURNING person_id', [body.personId, body.roleKey]);
    if (!r.rows.length) throw notFound(`an active ${body.roleKey} membership of ${body.personId}`);
    await ctx.audit(q, 'admin.membership_revoke', 'ALLOWED', { type: 'Person', id: body.personId }, { roleKey: body.roleKey });
    return { personId: body.personId, roleKey: body.roleKey, revoked: true };
  });
}

/** The policy model: personas (= roles, with their authorities), the UI-role → persona view mapping, the protected actions and their separation-of-duties rule. */
export async function policy(ctx: RequestContext) {
  await ctx.require(ADMIN, 'read the policy model');
  return ctx.tx(async (q) => ({
    personas: (await q.query('SELECT key, label, authorities, description FROM app.role ORDER BY key')).rows,
    uiRoles: Object.entries(UI_ROLE_TO_PERSONA).map(([uiRole, persona]) => ({ uiRole, persona, note: 'a view preference; carries no permission' })),
    separationOfDuties: [
      { action: 'room.design.approve', neverBy: 'the author of the approved revision' }, { action: 'room.classify.approve', neverBy: 'the person who proposed the classification' },
      { action: 'customer.accept', neverBy: 'a recorder or verifier of the results accepted' }, { action: 'baseline.approve', neverBy: 'an author of the bound results, or the previous publisher' },
      { action: 'measurement verification', neverBy: 'the recorder' }, { action: 'baseline exception decision', neverBy: 'the requester' }, { action: 'membership change', neverBy: 'the administrator on their own memberships' },
    ],
    delegation: { maxDays: 90, rule: 'a grantor lends only what they hold; the self-approval rule is never lifted; every delegated use is audited' },
  }));
}

export async function createDelegation(ctx: RequestContext, body: { granteeId: string; authority: string; reason: string; days?: number; scope?: Record<string, unknown> }) {
  // anyone signed in may lend an authority they hold directly (not one delegated to them); the database re-checks the grantor's role at every use
  const days = body.days ?? 14; if (days < 1 || days > 90) throw invalid('days is between 1 and 90');
  if (body.authority === '*') throw invalid('the wildcard authority is never delegated');
  if (!(ctx.p.authorities.includes(body.authority) || ctx.p.authorities.includes('*')) || ctx.p.delegated.some((d) => d.authority === body.authority && !ctx.p.authorities.includes(body.authority))) {
    await ctx.refuse('delegation.create', { type: 'Person', id: body.granteeId }, [`you do not hold ${body.authority} directly, so you cannot lend it`]);
  }
  if (body.granteeId === ctx.p.personId) throw invalid('a delegation names another person');
  return ctx.tx(async (q) => {
    const member = (await q.query('SELECT 1 FROM app.membership WHERE person_id = $1 AND revoked_at IS NULL', [body.granteeId])).rows.length;
    if (!member) throw notFound(`person ${body.granteeId} in your organization`);
    const r = await q.query<{ id: string; expires_at: string }>(`INSERT INTO app.delegation (tenant_id, grantor_id, grantee_id, authority, scope, reason, expires_at) VALUES ($1,$2,$3,$4,$5,$6, now() + ($7 || ' days')::interval) RETURNING id, expires_at`, [ctx.p.tenantId, ctx.p.personId, body.granteeId, body.authority, JSON.stringify(body.scope || {}), body.reason, String(days)]);
    await ctx.audit(q, 'delegation.create', 'ALLOWED', { type: 'Delegation', id: r.rows[0]!.id }, { granteeId: body.granteeId, authority: body.authority, days, scope: body.scope || {} });
    return { id: r.rows[0]!.id, expiresAt: r.rows[0]!.expires_at };
  });
}
export async function listDelegations(ctx: RequestContext) {
  // own delegations (given or received); a security administrator sees the tenant's
  const admin = ctx.p.authorities.includes(ADMIN) || ctx.p.authorities.includes('*');
  return ctx.tx(async (q) => ({ items: (await q.query(admin ? 'SELECT * FROM app.delegation ORDER BY created_at DESC LIMIT 200' : 'SELECT * FROM app.delegation WHERE grantor_id = $1 OR grantee_id = $1 ORDER BY created_at DESC LIMIT 200', admin ? [] : [ctx.p.personId])).rows }));
}
export async function revokeDelegation(ctx: RequestContext, id: string) {
  return ctx.tx(async (q) => {
    const d = (await q.query<{ grantor_id: string; revoked_at: string | null }>('SELECT grantor_id, revoked_at FROM app.delegation WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!d) throw notFound(`delegation ${id}`);
    const admin = ctx.p.authorities.includes(ADMIN) || ctx.p.authorities.includes('*');
    if (d.grantor_id !== ctx.p.personId && !admin) { await ctx.audit(null, 'delegation.revoke', 'DENIED', { type: 'Delegation', id }, { why: 'not the grantor nor a security administrator' }); throw new ApiError('forbidden', 'only the grantor or a security administrator revokes a delegation'); }
    if (d.revoked_at) throw new ApiError('rule_refused', 'the delegation is already revoked');
    await q.query('UPDATE app.delegation SET revoked_at = now(), revoked_by = $2 WHERE id = $1', [id, ctx.p.personId]);
    await ctx.audit(q, 'delegation.revoke', 'ALLOWED', { type: 'Delegation', id });
    return { id, revoked: true };
  });
}
