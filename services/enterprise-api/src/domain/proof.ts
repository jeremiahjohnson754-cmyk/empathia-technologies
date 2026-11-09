/**
 * The Proof Registry over the database (v1.8 workstream A, ADR-021). The rules of a claim live in @empathia/proof-registry — the same
 * module the website and the demonstration bundle — so what the API stores, what it publishes and what the two public sites show are
 * decided by one piece of code.
 *
 * Who may do what, each checked on the server:
 *   - anyone, unauthenticated: read the PUBLIC projection of approved public claims. The row-level policy admits those rows only inside
 *     a transaction flagged app.proof_public, and each row is sanitized again by publicProjection (no tenant, verifier, owner, approval
 *     state, or evidence reference that is not an approved derivative). An unknown, unapproved, revoked or blocked claim is one 404.
 *   - a member of a tenant: read that tenant's TENANT-scope claims; STAFF-scope claims need policy.configure.
 *   - policy.configure (security administrator): create and move the tenant's own claims.
 *   - founder.workspace in the founder organization: create and move PUBLIC claims. No enterprise role can publish a public claim.
 * Every create and move is audited and appended to the claim's history. A claim is never deleted; it is revoked.
 */
import type { PgPool, Queryable } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import { ApiError, invalid, notFound, refused } from '../http/errors.js';
import { validateClaim, publicProjection, transition, effectiveState, SCHEMA_VERSION, type ProofClaim, type PublicClaim, type ClaimAction } from '@empathia/proof-registry';
import { FOUNDER_TENANT, FOUNDER_AUTHORITY } from './founder.js';

export const CLAIM_ACTIONS: ClaimAction[] = ['request_publication', 'approve_publication', 'reject_publication', 'revoke_publication', 'revoke', 'block', 'degrade'];
const COLS = `c.id, c.claim_id, c.capability_id, c.product, c.world, c.scope, c.environment, c.data_kind, c.verification_state, c.implementation_revision, c.verification_method, c.verifier_identity,
  c.verified_at, c.expires_at, c.source_type, c.source_freshness_at, c.limitations, c.claim_text_public, c.public_approval, c.owner, c.revision,
  COALESCE((SELECT json_agg(json_build_object('id', e.evidence_id, 'derivative', e.approved_derivative) ORDER BY e.evidence_id) FROM app.proof_evidence e WHERE e.claim_uuid = c.id), '[]'::json) AS evidence`;
interface Row { id: string; claim_id: string; capability_id: string; product: string; world: string | null; scope: ProofClaim['scope']; environment: ProofClaim['environment']; data_kind: ProofClaim['data_kind']; verification_state: ProofClaim['verification_state'];
  implementation_revision: string; verification_method: string | null; verifier_identity: string | null; verified_at: Date | string; expires_at: Date | string | null; source_type: string; source_freshness_at: Date | string | null;
  limitations: string[]; claim_text_public: string | null; public_approval: ProofClaim['public_approval']; owner: string; revision: number; evidence: Array<{ id: string; derivative: boolean }> }
const iso = (v: Date | string | null): string | null => (v === null ? null : new Date(v).toISOString().replace('.000Z', 'Z'));

/** A stored row as the contract's claim. `tenant` is the slug a TENANT or STAFF claim names; a public claim names none. */
function toClaim(r: Row, tenant: string | null): ProofClaim {
  return { schema_version: SCHEMA_VERSION, claim_id: r.claim_id, capability_id: r.capability_id, product: r.product, world: r.world, tenant_id: r.scope === 'PUBLIC_SANITIZED' ? null : tenant, scope: r.scope,
    environment: r.environment, data_kind: r.data_kind, verification_state: r.verification_state, implementation_revision: r.implementation_revision, verification_method: r.verification_method, verifier_identity: r.verifier_identity,
    verified_at: iso(r.verified_at)!, expires_at: iso(r.expires_at), source_type: r.source_type, source_freshness_at: iso(r.source_freshness_at), evidence_ids: r.evidence.map((e) => e.id), limitations: r.limitations,
    claim_text_public: r.claim_text_public, public_approval: r.public_approval, owner: r.owner, approved_derivative_ids: r.evidence.filter((e) => e.derivative).map((e) => e.id) };
}

// ------------------------------------------------------------------------------------------------ public reads (no principal)
const publicTx = <T>(pool: PgPool, fn: (q: Queryable) => Promise<T>) => pool.tx({}, async (q) => { await q.query("SELECT set_config('app.proof_public', 'on', true)"); return fn(q); });

export async function listPublic(pool: PgPool, now = new Date()): Promise<{ schema_version: string; as_of: string; claims: PublicClaim[] }> {
  const rows = await publicTx(pool, async (q) => (await q.query<Row>(`SELECT ${COLS} FROM app.proof_claim c ORDER BY c.claim_id`)).rows);
  const claims = rows.map((r) => publicProjection(toClaim(r, null), now)).filter((c): c is PublicClaim => !!c);
  return { schema_version: SCHEMA_VERSION, as_of: now.toISOString(), claims };
}
export async function getPublic(pool: PgPool, claimId: string, now = new Date()): Promise<PublicClaim> {
  const none = new ApiError('not_found', 'no published claim has that identifier');   // the same answer for unknown, unapproved, revoked, blocked and private
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{3,127}$/.test(claimId)) throw none;
  const row = await publicTx(pool, async (q) => (await q.query<Row>(`SELECT ${COLS} FROM app.proof_claim c WHERE c.claim_id = $1`, [claimId])).rows[0]);
  const p = row ? publicProjection(toClaim(row, null), now) : null;
  if (!p) throw none;
  return p;
}

// ------------------------------------------------------------------------------------------------ tenant reads and writes
const isFounder = (ctx: RequestContext) => ctx.can(FOUNDER_AUTHORITY) && ctx.p.tenantSlug === FOUNDER_TENANT;

export async function listMine(ctx: RequestContext) {
  const staff = ctx.can('policy.configure') || isFounder(ctx);
  return ctx.tx(async (q) => {
    const rows = (await q.query<Row>(`SELECT ${COLS} FROM app.proof_claim c WHERE c.owner_tenant_id = $1 ${staff ? '' : "AND c.scope = 'TENANT'"} ORDER BY c.claim_id`, [ctx.p.tenantId])).rows;
    const now = new Date();
    return { items: rows.map((r) => { const c = toClaim(r, ctx.p.tenantSlug); const e = effectiveState(c, now); return { ...c, revision: r.revision, effective_state: e.state, downgrade_reason: e.reason }; }) };
  });
}

/** Who may write a claim of this scope: the founder organization for public claims, a security administrator for the tenant's own. */
async function guardWrite(ctx: RequestContext, scope: ProofClaim['scope'], action: string, aggregate?: { type: string; id: string }): Promise<void> {
  if (scope === 'PUBLIC_SANITIZED') {
    await ctx.require(FOUNDER_AUTHORITY, action, aggregate);
    if (ctx.p.tenantSlug !== FOUNDER_TENANT) { await ctx.audit(null, action, 'DENIED', aggregate, { why: 'public claims are governed by the founder organization', tenant: ctx.p.tenantSlug }); throw new ApiError('forbidden', 'a public claim is published by the founder organization only'); }
  } else await ctx.require('policy.configure', action, aggregate);
}

export type ClaimInput = Omit<ProofClaim, 'schema_version' | 'tenant_id' | 'public_approval'> & { schema_version?: string };
export async function createClaim(ctx: RequestContext, input: ClaimInput) {
  const scope = input.scope;
  if (!['PUBLIC_SANITIZED', 'TENANT', 'STAFF'].includes(scope)) throw invalid('scope is PUBLIC_SANITIZED, TENANT or STAFF');
  await guardWrite(ctx, scope, 'create a proof claim', { type: 'ProofClaim', id: String(input.claim_id).slice(0, 128) });
  // a claim always starts unpublished: publication is requested and approved as separate, recorded steps
  const claim: ProofClaim = { ...input, schema_version: SCHEMA_VERSION, tenant_id: scope === 'PUBLIC_SANITIZED' ? null : ctx.p.tenantSlug, public_approval: 'NOT_REQUESTED', world: input.world ?? null,
    approved_derivative_ids: (input.approved_derivative_ids || []).filter((x) => input.evidence_ids.includes(x)) };
  const errors = validateClaim(claim); if (errors.length) throw invalid(errors[0]!, errors);
  return ctx.tx(async (q) => {
    const dup = await q.query(`SELECT 1 FROM app.proof_claim WHERE owner_tenant_id = $1 AND claim_id = $2`, [ctx.p.tenantId, claim.claim_id]);
    if (dup.rowCount) throw refused([`a claim ${claim.claim_id} already exists; a claim is revised by its transitions, never replaced`]);
    let id: string;
    try {
      id = (await q.query<{ id: string }>(
        `INSERT INTO app.proof_claim (owner_tenant_id, claim_id, capability_id, product, world, scope, environment, data_kind, verification_state, implementation_revision, verification_method, verifier_identity,
           verified_at, expires_at, source_type, source_freshness_at, limitations, claim_text_public, public_approval, owner, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'NOT_REQUESTED',$19,$20) RETURNING id`,
        [ctx.p.tenantId, claim.claim_id, claim.capability_id, claim.product, claim.world ?? null, claim.scope, claim.environment, claim.data_kind, claim.verification_state, claim.implementation_revision, claim.verification_method ?? null,
          claim.verifier_identity ?? null, claim.verified_at, claim.expires_at ?? null, claim.source_type, claim.source_freshness_at ?? null, claim.limitations, claim.claim_text_public ?? null, claim.owner, ctx.p.personId])).rows[0]!.id;
    } catch (e) { if (/proof_claim_public_id|duplicate key/.test(String((e as Error).message))) throw refused([`a public claim ${claim.claim_id} already exists`]); throw e; }
    const derived = new Set(claim.approved_derivative_ids || []);
    for (const ev of claim.evidence_ids) await q.query('INSERT INTO app.proof_evidence (owner_tenant_id, claim_uuid, evidence_id, approved_derivative) VALUES ($1,$2,$3,$4)', [ctx.p.tenantId, id, ev, derived.has(ev)]);
    await q.query(`INSERT INTO app.proof_claim_event (owner_tenant_id, claim_uuid, action, to_state, to_approval, by_person, by_role) VALUES ($1,$2,'create',$3,'NOT_REQUESTED',$4,$5)`, [ctx.p.tenantId, id, claim.verification_state, ctx.p.personId, ctx.p.role]);
    await ctx.audit(q, 'proof.claim_created', 'ALLOWED', { type: 'ProofClaim', id }, { claimId: claim.claim_id, scope: claim.scope, state: claim.verification_state, dataKind: claim.data_kind });
    return { ...claim, revision: 1 };
  });
}

export async function moveClaim(ctx: RequestContext, claimId: string, body: { action: ClaimAction; note?: string }) {
  if (!CLAIM_ACTIONS.includes(body.action)) throw invalid(`action is one of ${CLAIM_ACTIONS.join(', ')}`);
  return ctx.tx(async (q) => {
    const row = (await q.query<Row>(`SELECT ${COLS} FROM app.proof_claim c WHERE c.owner_tenant_id = $1 AND c.claim_id = $2 FOR UPDATE OF c`, [ctx.p.tenantId, claimId])).rows[0];
    if (!row) throw notFound('the claim');
    await guardWrite(ctx, row.scope, `${body.action.replace(/_/g, ' ')} on a proof claim`, { type: 'ProofClaim', id: row.id });
    const before = toClaim(row, ctx.p.tenantSlug); const r = transition(before, body.action);
    // the refusal is audited outside this transaction, which is about to roll back
    if ('refused' in r) { await ctx.audit(null, `proof.${body.action}`, 'DENIED', { type: 'ProofClaim', id: row.id }, { why: r.refused }); throw refused([r.refused]); }
    await q.query(`UPDATE app.proof_claim SET verification_state = $3, public_approval = $4, revision = revision + 1, updated_at = now() WHERE owner_tenant_id = $1 AND id = $2`, [ctx.p.tenantId, row.id, r.claim.verification_state, r.claim.public_approval]);
    await q.query(`INSERT INTO app.proof_claim_event (owner_tenant_id, claim_uuid, action, from_state, to_state, from_approval, to_approval, by_person, by_role, note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [ctx.p.tenantId, row.id, body.action, before.verification_state, r.claim.verification_state, before.public_approval, r.claim.public_approval, ctx.p.personId, ctx.p.role, body.note?.trim() || null]);
    await ctx.audit(q, `proof.${body.action}`, 'ALLOWED', { type: 'ProofClaim', id: row.id }, { claimId, from: [before.verification_state, before.public_approval], to: [r.claim.verification_state, r.claim.public_approval] });
    return { ...r.claim, revision: row.revision + 1 };
  });
}

export async function claimHistory(ctx: RequestContext, claimId: string) {
  return ctx.tx(async (q) => {
    const row = (await q.query<{ id: string; scope: string }>('SELECT id, scope FROM app.proof_claim WHERE owner_tenant_id = $1 AND claim_id = $2', [ctx.p.tenantId, claimId])).rows[0];
    if (!row) throw notFound('the claim');
    if (row.scope !== 'TENANT' && !(ctx.can('policy.configure') || isFounder(ctx))) throw notFound('the claim');
    const ev = await q.query('SELECT action, from_state, to_state, from_approval, to_approval, by_role, note, at FROM app.proof_claim_event WHERE claim_uuid = $1 ORDER BY id', [row.id]);
    return { claimId, events: ev.rows };
  });
}

/** Seed the registry's synthetic fixtures into the founder organization, approved for publication (development and tests only). */
export async function seedClaims(q: Queryable, founderTenantId: string, founderPersonId: string, claims: ProofClaim[]): Promise<number> {
  let n = 0;
  for (const c of claims) {
    if (validateClaim(c).length || c.scope !== 'PUBLIC_SANITIZED') continue;
    const r = await q.query<{ id: string }>(
      `INSERT INTO app.proof_claim (owner_tenant_id, claim_id, capability_id, product, world, scope, environment, data_kind, verification_state, implementation_revision, verification_method, verifier_identity,
         verified_at, expires_at, source_type, source_freshness_at, limitations, claim_text_public, public_approval, owner, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) ON CONFLICT (owner_tenant_id, claim_id) DO NOTHING RETURNING id`,
      [founderTenantId, c.claim_id, c.capability_id, c.product, c.world ?? null, c.scope, c.environment, c.data_kind, c.verification_state, c.implementation_revision, c.verification_method ?? null, c.verifier_identity ?? null,
        c.verified_at, c.expires_at ?? null, c.source_type, c.source_freshness_at ?? null, c.limitations, c.claim_text_public ?? null, c.public_approval, c.owner, founderPersonId]);
    if (!r.rows[0]) continue;
    const derived = new Set(c.approved_derivative_ids || []);
    for (const ev of c.evidence_ids) await q.query('INSERT INTO app.proof_evidence (owner_tenant_id, claim_uuid, evidence_id, approved_derivative) VALUES ($1,$2,$3,$4)', [founderTenantId, r.rows[0].id, ev, derived.has(ev)]);
    await q.query(`INSERT INTO app.proof_claim_event (owner_tenant_id, claim_uuid, action, to_state, to_approval, by_person, by_role, note) VALUES ($1,$2,'create',$3,$4,$5,'founder','synthetic seed')`, [founderTenantId, r.rows[0].id, c.verification_state, c.public_approval, founderPersonId]);
    n += 1;
  }
  return n;
}
