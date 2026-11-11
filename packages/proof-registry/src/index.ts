/**
 * The Proof Registry (v1.8 workstream A, ADR-021): one typed record per capability claim, shared by the corporate website, the Living
 * Campus demonstration and the tenant application, so the three never state different things about the same capability.
 *
 * Three questions are kept apart and never collapsed into one green badge (V18-PROOF-02):
 *   - verification_state: how far the IMPLEMENTATION has been verified (SPECIFIED … RELEASED_VERIFIED, or BLOCKED / REVOKED / DEGRADED)
 *   - data_kind:          what KIND OF DATA stands behind the claim (SYNTHETIC … CUSTOMER_OBSERVED)
 *   - public_approval:    whether a person has APPROVED the sanitized public wording
 * plus source freshness (source_freshness_at, expires_at), which downgrades a claim on its own as time passes.
 *
 * The contract is docs/handoff/v1_8/contracts/PROOF_CLAIM_v1_8.schema.json; validateClaim enforces it (and the cross-field rules a JSON
 * schema states less readably). Pure functions only: the API stores claims, this module decides what a claim may say and to whom.
 */
export const SCHEMA_VERSION = '1.8' as const;

export const SCOPES = ['PUBLIC_SANITIZED', 'TENANT', 'STAFF'] as const;
export const ENVIRONMENTS = ['dev', 'test', 'staging', 'production', 'synthetic_demo'] as const;
export const DATA_KINDS = ['SYNTHETIC', 'MODELED', 'IMPORTED', 'LAB_OBSERVED', 'CUSTOMER_OBSERVED'] as const;
export const VERIFICATION_STATES = ['SPECIFIED', 'SYNTHETIC_DEMO', 'IMPLEMENTED_NOT_VERIFIED', 'LAB_VERIFIED', 'CUSTOMER_AUTHORIZED', 'LIVE_OBSERVING', 'DEGRADED', 'BLOCKED', 'REVOKED', 'RELEASED_VERIFIED'] as const;
export const PUBLIC_APPROVALS = ['NOT_REQUESTED', 'PENDING', 'APPROVED', 'REJECTED', 'REVOKED'] as const;

export type Scope = typeof SCOPES[number];
export type Environment = typeof ENVIRONMENTS[number];
export type DataKind = typeof DATA_KINDS[number];
export type VerificationState = typeof VERIFICATION_STATES[number];
export type PublicApproval = typeof PUBLIC_APPROVALS[number];

export interface ProofClaim {
  schema_version: typeof SCHEMA_VERSION;
  claim_id: string;
  capability_id: string;
  product: string;
  world?: string | null;
  tenant_id?: string | null;
  scope: Scope;
  environment: Environment;
  data_kind: DataKind;
  verification_state: VerificationState;
  implementation_revision: string;
  verification_method?: string | null;
  verifier_identity?: string | null;
  verified_at: string;
  expires_at?: string | null;
  source_type: string;
  source_freshness_at?: string | null;
  evidence_ids: string[];
  limitations: string[];
  claim_text_public?: string | null;
  public_approval: PublicApproval;
  owner: string;
  approved_derivative_ids?: string[];
}

/** What an unauthenticated reader is given: never a tenant, a verifier's identity, an owner or an unapproved evidence reference. */
export interface PublicClaim {
  schema_version: typeof SCHEMA_VERSION;
  claim_id: string;
  capability_id: string;
  product: string;
  world: string | null;
  environment: Environment;
  data_kind: DataKind;
  /** the state after expiry, freshness and revocation have been applied at `as_of` */
  verification_state: VerificationState;
  /** the stored state, shown only when the effective one differs, so a downgrade explains itself */
  recorded_state: VerificationState | null;
  downgrade_reason: string | null;
  implementation_revision: string;
  verification_method: string | null;
  verified_at: string;
  expires_at: string | null;
  source_type: string;
  source_freshness_at: string | null;
  evidence_ids: string[];
  limitations: string[];
  claim_text_public: string;
  as_of: string;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const isIso = (v: unknown): v is string => typeof v === 'string' && ISO.test(v) && !Number.isNaN(Date.parse(v));
const KEYS = new Set(['schema_version', 'claim_id', 'capability_id', 'product', 'world', 'tenant_id', 'scope', 'environment', 'data_kind', 'verification_state', 'implementation_revision', 'verification_method', 'verifier_identity', 'verified_at', 'expires_at', 'source_type', 'source_freshness_at', 'evidence_ids', 'limitations', 'claim_text_public', 'public_approval', 'owner', 'approved_derivative_ids']);
const strOrNull = (v: unknown) => v === null || v === undefined || typeof v === 'string';
const uniqueStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string') && new Set(v).size === v.length;

/** Every reason a record is not a valid claim; an empty list means it is one. Unknown fields are refused (additionalProperties: false). */
export function validateClaim(c: unknown): string[] {
  const e: string[] = [];
  if (!c || typeof c !== 'object' || Array.isArray(c)) return ['a claim is an object'];
  const x = c as Record<string, unknown>;
  for (const k of Object.keys(x)) if (!KEYS.has(k)) e.push(`unknown field ${k}`);
  if (x.schema_version !== SCHEMA_VERSION) e.push(`schema_version is ${SCHEMA_VERSION}`);
  if (typeof x.claim_id !== 'string' || x.claim_id.length < 4 || x.claim_id.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(x.claim_id)) e.push('claim_id is 4 to 128 letters, digits, dots, dashes or underscores');
  for (const k of ['capability_id', 'product'] as const) if (typeof x[k] !== 'string' || (x[k] as string).length < 2) e.push(`${k} is required`);
  for (const k of ['implementation_revision', 'source_type', 'owner'] as const) if (typeof x[k] !== 'string' || !(x[k] as string).length) e.push(`${k} is required`);
  if (!SCOPES.includes(x.scope as Scope)) e.push(`scope is one of ${SCOPES.join(', ')}`);
  if (!ENVIRONMENTS.includes(x.environment as Environment)) e.push(`environment is one of ${ENVIRONMENTS.join(', ')}`);
  if (!DATA_KINDS.includes(x.data_kind as DataKind)) e.push(`data_kind is one of ${DATA_KINDS.join(', ')}`);
  if (!VERIFICATION_STATES.includes(x.verification_state as VerificationState)) e.push(`verification_state is one of ${VERIFICATION_STATES.join(', ')}`);
  if (!PUBLIC_APPROVALS.includes(x.public_approval as PublicApproval)) e.push(`public_approval is one of ${PUBLIC_APPROVALS.join(', ')}`);
  if (!isIso(x.verified_at)) e.push('verified_at is a date-time');
  for (const k of ['expires_at', 'source_freshness_at'] as const) if (x[k] !== null && x[k] !== undefined && !isIso(x[k])) e.push(`${k} is a date-time or null`);
  for (const k of ['world', 'tenant_id', 'verification_method', 'verifier_identity', 'claim_text_public'] as const) if (!strOrNull(x[k])) e.push(`${k} is text or null`);
  if (!uniqueStrings(x.evidence_ids)) e.push('evidence_ids is a list of distinct identifiers');
  if (!Array.isArray(x.limitations) || !x.limitations.every((l) => typeof l === 'string')) e.push('limitations is a list of sentences');
  if (x.approved_derivative_ids !== undefined && !uniqueStrings(x.approved_derivative_ids)) e.push('approved_derivative_ids is a list of distinct identifiers');
  if (e.length) return e;
  // cross-field rules: the ones that stop a claim saying more than its data can carry
  if (x.scope === 'PUBLIC_SANITIZED' && x.tenant_id != null) e.push('a public claim names no tenant');
  if (x.scope === 'TENANT' && !x.tenant_id) e.push('a tenant claim names its tenant');
  if (x.data_kind === 'SYNTHETIC' && ['LIVE_OBSERVING', 'LAB_VERIFIED', 'CUSTOMER_AUTHORIZED', 'RELEASED_VERIFIED'].includes(x.verification_state as string)) e.push('synthetic data cannot be lab verified, customer authorized, live or released as verified');
  if (x.environment === 'synthetic_demo' && !['SYNTHETIC', 'MODELED'].includes(x.data_kind as string)) e.push('the synthetic demonstration holds synthetic or modeled data only');
  if (x.verification_state === 'LIVE_OBSERVING') {
    if (x.data_kind !== 'CUSTOMER_OBSERVED') e.push('a live claim rests on customer-observed data');
    if (!x.source_freshness_at) e.push('a live claim states when its source was last fresh');
    if (!x.expires_at) e.push('a live claim expires');
    if (x.scope !== 'TENANT') e.push('a live observation belongs to its tenant; publish an approved derivative instead');
  }
  if (x.verification_state === 'LAB_VERIFIED' && !['LAB_OBSERVED', 'IMPORTED'].includes(x.data_kind as string)) e.push('a lab-verified claim rests on lab-observed or imported data');
  if (['LAB_VERIFIED', 'CUSTOMER_AUTHORIZED', 'LIVE_OBSERVING', 'RELEASED_VERIFIED'].includes(x.verification_state as string)) {
    if (!x.verifier_identity) e.push('a verified claim names who verified it');
    if (!x.verification_method) e.push('a verified claim states its method');
    if (!(x.evidence_ids as string[]).length) e.push('a verified claim cites evidence');
  }
  if (x.public_approval === 'APPROVED') {
    if (x.scope !== 'PUBLIC_SANITIZED') e.push('only a public-scope claim can be approved for publication');
    if (typeof x.claim_text_public !== 'string' || x.claim_text_public.trim().length < 12) e.push('an approved claim has its public wording');
    if (!(x.limitations as string[]).length) e.push('an approved claim states its limitations');
    const derived = new Set((x.approved_derivative_ids as string[] | undefined) || []);
    if ((x.evidence_ids as string[]).some((id) => !derived.has(id))) e.push('every evidence reference on an approved public claim is an approved derivative');
  }
  if (x.expires_at && Date.parse(x.expires_at as string) <= Date.parse(x.verified_at as string)) e.push('expires_at is after verified_at');
  return e;
}

/** How long a live source may go without a fresh reading before the claim stops being shown as live (V18-PROOF: stale downgrade). */
export const LIVE_STALE_MS = 24 * 3600 * 1000;

/** The state a reader is shown at `now`: the stored one, unless revocation, expiry or a stale source has overtaken it. */
export function effectiveState(c: ProofClaim, now: Date | string = new Date()): { state: VerificationState; reason: string | null } {
  const t = typeof now === 'string' ? Date.parse(now) : now.getTime();
  if (c.verification_state === 'REVOKED' || c.public_approval === 'REVOKED') return { state: 'REVOKED', reason: c.verification_state === 'REVOKED' ? null : 'its publication was revoked' };
  if (c.verification_state === 'BLOCKED') return { state: 'BLOCKED', reason: null };
  if (c.expires_at && Date.parse(c.expires_at) <= t) return { state: 'DEGRADED', reason: `its verification expired on ${c.expires_at.slice(0, 10)}` };
  if (c.verification_state === 'LIVE_OBSERVING') {
    const fresh = c.source_freshness_at ? Date.parse(c.source_freshness_at) : NaN;
    if (!(t - fresh <= LIVE_STALE_MS)) return { state: 'DEGRADED', reason: 'its source has not reported within a day' };
  }
  return { state: c.verification_state, reason: null };
}

/** The claim as the public sees it, or null when it must not be published (not approved, not public scope, invalid, revoked or blocked). */
export function publicProjection(c: ProofClaim, now: Date | string = new Date()): PublicClaim | null {
  if (validateClaim(c).length) return null;
  if (c.scope !== 'PUBLIC_SANITIZED' || c.public_approval !== 'APPROVED' || !c.claim_text_public) return null;
  const eff = effectiveState(c, now);
  if (eff.state === 'REVOKED' || eff.state === 'BLOCKED') return null;
  const derived = new Set(c.approved_derivative_ids || []);
  return {
    schema_version: SCHEMA_VERSION, claim_id: c.claim_id, capability_id: c.capability_id, product: c.product, world: c.world ?? null,
    environment: c.environment, data_kind: c.data_kind, verification_state: eff.state,
    recorded_state: eff.state === c.verification_state ? null : c.verification_state, downgrade_reason: eff.reason,
    implementation_revision: c.implementation_revision, verification_method: c.verification_method ?? null,
    verified_at: c.verified_at, expires_at: c.expires_at ?? null, source_type: c.source_type, source_freshness_at: c.source_freshness_at ?? null,
    evidence_ids: c.evidence_ids.filter((id) => derived.has(id)), limitations: [...c.limitations], claim_text_public: c.claim_text_public,
    as_of: typeof now === 'string' ? now : now.toISOString(),
  };
}

export type ClaimAction = 'request_publication' | 'approve_publication' | 'reject_publication' | 'revoke_publication' | 'revoke' | 'block' | 'degrade';
/** The publication and withdrawal moves a person can make, each from stated states only. Returns the changed claim or the reason it is refused. */
export function transition(c: ProofClaim, action: ClaimAction): { claim: ProofClaim } | { refused: string } {
  const next = { ...c };
  switch (action) {
    case 'request_publication':
      if (c.scope !== 'PUBLIC_SANITIZED') return { refused: 'only a public-scope claim can be put forward for publication' };
      if (!['NOT_REQUESTED', 'REJECTED'].includes(c.public_approval)) return { refused: `publication is already ${c.public_approval}` };
      next.public_approval = 'PENDING'; break;
    case 'approve_publication':
      if (c.public_approval !== 'PENDING') return { refused: 'only a pending request can be approved' };
      next.public_approval = 'APPROVED'; break;
    case 'reject_publication':
      if (c.public_approval !== 'PENDING') return { refused: 'only a pending request can be rejected' };
      next.public_approval = 'REJECTED'; break;
    case 'revoke_publication':
      if (c.public_approval !== 'APPROVED') return { refused: 'only an approved publication can be revoked' };
      next.public_approval = 'REVOKED'; break;
    case 'revoke':
      if (c.verification_state === 'REVOKED') return { refused: 'the claim is already revoked' };
      next.verification_state = 'REVOKED'; if (c.public_approval === 'APPROVED' || c.public_approval === 'PENDING') next.public_approval = 'REVOKED'; break;
    case 'block':
      if (['REVOKED', 'BLOCKED'].includes(c.verification_state)) return { refused: `the claim is already ${c.verification_state}` };
      next.verification_state = 'BLOCKED'; break;
    case 'degrade':
      if (!['LAB_VERIFIED', 'CUSTOMER_AUTHORIZED', 'LIVE_OBSERVING', 'RELEASED_VERIFIED'].includes(c.verification_state)) return { refused: 'only a verified claim can be degraded' };
      next.verification_state = 'DEGRADED'; break;
    default: return { refused: 'unknown action' };
  }
  const errors = validateClaim(next);
  return errors.length ? { refused: errors[0]! } : { claim: next };
}

/** Plain wording for each state, the same on every surface. */
export const STATE_LABEL: Record<VerificationState, string> = {
  SPECIFIED: 'Specified', SYNTHETIC_DEMO: 'Synthetic demonstration', IMPLEMENTED_NOT_VERIFIED: 'Implemented, not verified', LAB_VERIFIED: 'Lab verified',
  CUSTOMER_AUTHORIZED: 'Customer authorized', LIVE_OBSERVING: 'Live, observing', DEGRADED: 'Degraded', BLOCKED: 'Blocked', REVOKED: 'Revoked', RELEASED_VERIFIED: 'Released, verified',
};
export const STATE_MEANING: Record<VerificationState, string> = {
  SPECIFIED: 'Written down as a requirement. Nothing is built or tested yet.',
  SYNTHETIC_DEMO: 'Works in the demonstration on invented data. No real equipment or customer source is involved.',
  IMPLEMENTED_NOT_VERIFIED: 'The code exists. Nobody independent has verified it yet.',
  LAB_VERIFIED: 'Verified against lab equipment or imported instrument data by a named verifier.',
  CUSTOMER_AUTHORIZED: 'A customer has authorized the source. Observation has not started.',
  LIVE_OBSERVING: 'Reading an authorized customer source now. Shown only to that customer.',
  DEGRADED: 'Was verified, but its verification expired or its source went stale. Treat it as unverified.',
  BLOCKED: 'Cannot proceed until a stated blocker is cleared.',
  REVOKED: 'Withdrawn. It must not be relied on.',
  RELEASED_VERIFIED: 'Released, and verified in the released build by a named verifier.',
};
export const DATA_LABEL: Record<DataKind, string> = { SYNTHETIC: 'Synthetic data', MODELED: 'Modeled data', IMPORTED: 'Imported data', LAB_OBSERVED: 'Lab-observed data', CUSTOMER_OBSERVED: 'Customer-observed data' };

export * from './acceptance.js';
export * from './documentation.js';
export { SEED_CLAIMS, DOSSIER_4218, QR_PAYLOAD_4218, type Dossier, type DossierTest, type Deficiency, type TestResult } from './seed.js';
