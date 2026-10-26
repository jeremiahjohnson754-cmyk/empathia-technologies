/**
 * Harmony engine: the rules that let several external systems and Empathia agree on one record without fighting over it.
 *   - source authority: each kind of record has one authority; only the authority may write its canonical value;
 *   - write ownership and control: no write to an external system without an approved change by an engineer, and never to a
 *     read-only or non-VERIFIED adapter;
 *   - deduplication: one observation per (source, kind, externalId) — the latest wins, an older one is dropped;
 *   - conflict detection: two sources disagreeing about a field are surfaced, not silently merged;
 *   - retries: exponential backoff with full jitter, honouring Retry-After; non-retryable errors stop at once;
 *   - rate limiting: a token bucket per adapter;
 *   - health and staleness: a connector with no successful sync within its window is stale.
 * Pure functions plus two small stateful helpers (TokenBucket, the retry loop); no I/O of its own.
 */
import { AdapterError, type AdapterDescriptor, type ApprovedChange, type Observation } from './contract.js';

// ------------------------------------------------------------------------------------------------ authority and writes
export interface AuthorityMap { [kind: string]: string }   // record kind → adapter key (or 'empathia')

/** Who is the authority for a kind of record. Empathia is the authority for its own design, commissioning and evidence records. */
export function authorityFor(kind: string, adapters: AdapterDescriptor[], overrides: AuthorityMap = {}): string {
  if (overrides[kind]) return overrides[kind]!;
  const a = adapters.filter((x) => x.authorityFor.includes(kind));
  if (a.length > 1) throw new Error(`two adapters claim authority for ${kind}: ${a.map((x) => x.key).join(', ')} — configure one`);
  return a[0]?.key ?? 'empathia';
}

/** May this source write the canonical value of this kind? Only its authority may. */
export function mayUpdateCanonical(source: string, kind: string, adapters: AdapterDescriptor[], overrides: AuthorityMap = {}): boolean {
  return authorityFor(kind, adapters, overrides) === source;
}

export const CONTROL_AUTHORITIES = ['baseline.approve', 'room.design.approve'];
/** May Empathia send this change to that system? Returns the reasons it may not (empty = allowed). Deny by default. */
export function mayWrite(d: AdapterDescriptor, change: ApprovedChange | null): string[] {
  const why: string[] = [];
  if (d.maturity !== 'VERIFIED') why.push(`${d.key} is ${d.maturity}: only a VERIFIED adapter may act on a real system`);
  if (d.mode !== 'READ_WRITE') why.push(`${d.key} is ${d.mode}: read-only integrations never write`);
  if (d.capabilities.CONTROL !== 'SUPPORTED') why.push(`${d.key} does not support CONTROL`);
  if (!change) why.push('no approved change');
  else {
    if (!CONTROL_AUTHORITIES.includes(change.approverAuthority)) why.push(`the change was approved with ${change.approverAuthority}; control needs ${CONTROL_AUTHORITIES.join(' or ')}`);
    if (!change.approvedBy) why.push('the change has no approver');
  }
  return why;
}

// ------------------------------------------------------------------------------------------------ deduplication and conflicts
const key = (o: Observation) => `${o.source}|${o.kind}|${o.externalId}`;
/** One observation per (source, kind, externalId); the latest observedAt wins; ties keep the first seen. */
export function dedupe(obs: Observation[]): { kept: Observation[]; dropped: number } {
  const m = new Map<string, Observation>();
  for (const o of obs) { const k = key(o); const p = m.get(k); if (!p || Date.parse(o.observedAt) > Date.parse(p.observedAt)) m.set(k, o); }
  return { kept: [...m.values()], dropped: obs.length - m.size };
}

export interface Conflict { canonicalId: string; kind: string; field: string; values: Array<{ source: string; value: unknown; observedAt: string }>; authority: string }
/** Fields on which sources disagree about the same canonical thing. Surfaced for a person to resolve; the authority's value is shown first. */
export function conflicts(obs: Observation[], adapters: AdapterDescriptor[], fields: string[]): Conflict[] {
  const by = new Map<string, Observation[]>();
  for (const o of obs) if (o.canonicalId) { const k = `${o.canonicalId}|${o.kind}`; (by.get(k) || by.set(k, []).get(k)!).push(o); }
  const out: Conflict[] = [];
  for (const [k, list] of by) {
    const [canonicalId, kind] = k.split('|') as [string, string];
    const sources = new Set(list.map((o) => o.source)); if (sources.size < 2) continue;
    const auth = authorityFor(kind, adapters);
    for (const f of fields) {
      const vals = list.filter((o) => f in o.value).map((o) => ({ source: o.source, value: o.value[f], observedAt: o.observedAt }));
      if (new Set(vals.map((v) => JSON.stringify(v.value))).size > 1) out.push({ canonicalId, kind, field: f, authority: auth, values: vals.sort((a, b) => (a.source === auth ? -1 : b.source === auth ? 1 : 0)) });
    }
  }
  return out;
}

/** Matching an external record to a canonical asset: exact serial or MAC only. A name match is a suggestion, never a match. */
export function matchCanonical(o: Observation, assets: Array<{ id: string; serial?: string | null; mac?: string | null; label?: string }>): { canonicalId: string | null; how: 'serial' | 'mac' | 'none'; suggestion: string | null } {
  const v = o.value as { serial?: string; mac?: string; name?: string };
  const norm = (s?: string | null) => (s || '').trim().toUpperCase().replace(/[:-]/g, '');
  const bySerial = v.serial ? assets.find((a) => a.serial && norm(a.serial) === norm(v.serial)) : undefined;
  if (bySerial) return { canonicalId: bySerial.id, how: 'serial', suggestion: null };
  const byMac = v.mac ? assets.find((a) => a.mac && norm(a.mac) === norm(v.mac)) : undefined;
  if (byMac) return { canonicalId: byMac.id, how: 'mac', suggestion: null };
  const byName = v.name ? assets.find((a) => a.label && a.label.toLowerCase() === v.name!.toLowerCase()) : undefined;
  return { canonicalId: null, how: 'none', suggestion: byName?.id ?? null };
}

// ------------------------------------------------------------------------------------------------ retries, rate limits, staleness
export const RETRY = { attempts: 5, baseMs: 250, capMs: 30_000 };
/** Full-jitter exponential backoff (AWS architecture guidance): random in [0, min(cap, base·2^attempt)]; Retry-After wins when longer. */
export function backoffMs(attempt: number, rnd: () => number = Math.random, retryAfterMs: number | null = null): number {
  const exp = Math.min(RETRY.capMs, RETRY.baseMs * 2 ** attempt);
  return Math.max(Math.floor(rnd() * exp), retryAfterMs ?? 0);
}
export async function withRetry<T>(fn: (attempt: number) => Promise<T>, opts: { attempts?: number; sleep?: (ms: number) => Promise<void>; rnd?: () => number; onRetry?: (e: AdapterError, attempt: number, waitMs: number) => void } = {}): Promise<T> {
  const n = opts.attempts ?? RETRY.attempts; const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  for (let a = 0; ; a += 1) {
    try { return await fn(a); } catch (e) {
      const err = e instanceof AdapterError ? e : new AdapterError('server', (e as Error).message);
      if (!err.retryable || a + 1 >= n) throw err;
      const w = backoffMs(a, opts.rnd, err.retryAfterMs); opts.onRetry?.(err, a, w); await sleep(w);
    }
  }
}

export class TokenBucket {
  private tokens: number; private at: number;
  constructor(private perMinute: number, private burst: number, private now: () => number = Date.now) { this.tokens = burst; this.at = now(); }
  take(): boolean { const t = this.now(); this.tokens = Math.min(this.burst, this.tokens + ((t - this.at) / 60000) * this.perMinute); this.at = t; if (this.tokens < 1) return false; this.tokens -= 1; return true; }
}

/** A connector is stale when its last successful sync is older than its window (default 3 polling intervals). */
export function isStale(lastSuccess: string | null, intervalMs: number, now: Date, windows = 3): boolean {
  return !lastSuccess || now.getTime() - Date.parse(lastSuccess) > intervalMs * windows;
}

/** Credentials must rotate within their policy; returns the reasons a credential is not acceptable. */
export function credentialProblems(ref: { issuedAt: string; expiresAt: string | null } | null, rotateDays: number, now: Date): string[] {
  if (!ref) return ['no credential configured'];
  const why: string[] = [];
  if (ref.expiresAt && Date.parse(ref.expiresAt) <= now.getTime()) why.push('the credential has expired');
  if (now.getTime() - Date.parse(ref.issuedAt) > rotateDays * 86400000) why.push(`the credential is older than its ${rotateDays}-day rotation policy`);
  return why;
}
