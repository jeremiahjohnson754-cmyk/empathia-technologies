/**
 * The common integration interface. Every adapter — a local mock today, a verified adapter later — implements `Adapter`.
 * The interface separates the six capability families of the integration registry (DISCOVER, READ, OBSERVE, CONTROL, VERIFY,
 * ORCHESTRATE) and makes the dangerous ones explicit: an adapter that can CONTROL a device must say so, and a control call needs an
 * approved change with an engineer's authority (see harmony.ts `mayWrite`). Nothing in this package opens a network connection.
 *
 * Maturity is stated, never implied: MOCK | CONTRACT_ONLY | NOT_CONFIGURED | VERIFIED. Only VERIFIED adapters (none today) may feed
 * operational decisions such as Assurance evidence.
 */

export type Maturity = 'MOCK' | 'CONTRACT_ONLY' | 'NOT_CONFIGURED' | 'VERIFIED';
export type Capability = 'DISCOVER' | 'READ' | 'OBSERVE' | 'CONTROL' | 'VERIFY' | 'ORCHESTRATE';
/** How the adapter reaches the system: from the cloud API, through an on-site edge bridge, or by receiving webhooks. */
export type ConnectionModel = 'CLOUD_API' | 'EDGE_BRIDGE' | 'WEBHOOK' | 'FILE_IMPORT' | 'NONE';
/** Read-only monitoring versus active control: sensitive building infrastructure is read-only unless an engineer approves otherwise. */
export type Mode = 'READ_ONLY' | 'READ_WRITE' | 'NONE';

export interface AdapterDescriptor {
  key: string;                       // the integration registry id, e.g. "mock-itsm-readonly"
  category: string;
  /** Target platform as named in the internal registry — interface planning only; no partnership or certification is implied. */
  target: string;
  maturity: Maturity;
  mode: Mode;
  connection: ConnectionModel;
  capabilities: Partial<Record<Capability, 'SUPPORTED' | 'NOT_SUPPORTED' | 'NOT_CONFIGURED' | 'NOT_APPLICABLE'>>;
  /** Kinds of records this adapter is the AUTHORITY for (Harmony: only the authority may write the canonical field). */
  authorityFor: string[];
  rateLimit: { requestsPerMinute: number; burst: number };
  auth: AuthRequirement;
}

export type AuthRequirement =
  | { kind: 'none'; why: string }
  | { kind: 'oauth2_client_credentials'; scopes: string[]; rotateDays: number }
  | { kind: 'api_key'; header: string; rotateDays: number }
  | { kind: 'mutual_tls'; rotateDays: number };

/** A secret is never stored in the browser or the database row of the integration: only a reference to the tenant's secret store. */
export interface CredentialRef { ref: string; issuedAt: string; expiresAt: string | null }

export interface Health { state: 'OK' | 'DEGRADED' | 'DOWN' | 'NOT_CONFIGURED'; checkedAt: string; latencyMs: number | null; detail: string; maturity: Maturity }

/** A normalized observation: what an external system says about one thing, with where it came from and how it is known. */
export interface Observation {
  source: string;                    // adapter key
  sourceMaturity: Maturity;
  kind: 'device.inventory' | 'device.state' | 'device.firmware' | 'dsp.parameter' | 'ticket';
  /** The external system's own id for the thing (natural key within the source). */
  externalId: string;
  /** The canonical id when it is known (PA-0001, R-PLN-0001 …); null when it still needs matching. */
  canonicalId: string | null;
  observedAt: string;
  value: Record<string, unknown>;
  /** Provenance of the value as Empathia labels it: a MOCK source is never MEASURED evidence. */
  evidence: 'MEASURED' | 'REPORTED' | 'SYNTHETIC_MOCK';
}

export interface Page<T> { items: T[]; next: string | null }

export interface AdapterContext { tenant: string; credential: CredentialRef | null; now: () => Date; signal?: AbortSignal; correlationId: string }

/** Errors an adapter may raise. Harmony decides what to retry. */
export class AdapterError extends Error {
  constructor(public kind: 'timeout' | 'rate_limited' | 'unauthorized' | 'not_found' | 'server' | 'malformed' | 'not_configured' | 'refused', message: string, public retryAfterMs: number | null = null) { super(message); this.name = 'AdapterError'; }
  get retryable(): boolean { return this.kind === 'timeout' || this.kind === 'rate_limited' || this.kind === 'server'; }
}

export interface Adapter {
  descriptor: AdapterDescriptor;
  health(ctx: AdapterContext): Promise<Health>;
  /** DISCOVER: what exists (devices, rooms, queues), paged. */
  discover?(ctx: AdapterContext, cursor: string | null): Promise<Page<Observation>>;
  /** READ / OBSERVE: current state since a watermark, paged. */
  poll?(ctx: AdapterContext, since: string | null, cursor: string | null): Promise<Page<Observation>>;
  /** Webhooks: verify and normalize one delivery (signature checked by the adapter; never trusted unsigned). */
  receiveWebhook?(ctx: AdapterContext, headers: Record<string, string>, body: Buffer): Promise<Observation[]>;
  /** CONTROL: present only on adapters that can act. Harmony refuses unless the change is approved (see mayWrite). */
  control?(ctx: AdapterContext, change: ApprovedChange): Promise<{ accepted: boolean; detail: string }>;
}

export interface ApprovedChange { id: string; target: string; action: string; parameters: Record<string, unknown>; approvedBy: string; approverAuthority: string; approvedAt: string; reversible: boolean }
