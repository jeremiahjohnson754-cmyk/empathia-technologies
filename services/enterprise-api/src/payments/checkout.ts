/**
 * Hosted checkout, provider-agnostic (handoff v1.8 §4.1/§4.3, ADR-023; V18-PILOT-07/08/09).
 *
 * The API never sees a card or a bank detail: it asks a provider for a hosted checkout session and later receives the provider's signed
 * webhook. `CheckoutProvider` is that seam. ONE provider exists in this build: the LOCAL SANDBOX, which makes no network call, holds no
 * provider key and moves no money. A real provider is another implementation of the same interface and needs the owner's processor
 * account; until one is configured, PILOT_PAYMENT_PROVIDER is unset and checkouts answer 501 not_configured.
 *
 * Webhook authenticity (the sandbox follows the scheme hosted processors use, so the verification code is the real one):
 *   header  x-empathia-signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, `${t}.${rawBody}`)>
 *   the HMAC is compared in constant time; the timestamp must be within the tolerance (default 300 s) of the server's clock — an old
 *   capture cannot be replayed later, and a replay inside the window is caught by the event id (app.payment_event, unique).
 * The secret comes from the environment (PILOT_WEBHOOK_SECRET, at least 32 bytes). There is no default and none is ever in the repository.
 */
import crypto from 'node:crypto';
import { ApiError } from '../http/errors.js';

export type ProviderEventType = 'checkout.completed' | 'checkout.failed' | 'payment.refunded' | 'payment.disputed' | 'payment.dispute_won' | 'payment.dispute_lost';
export const PROVIDER_EVENT_TYPES: readonly ProviderEventType[] = ['checkout.completed', 'checkout.failed', 'payment.refunded', 'payment.disputed', 'payment.dispute_won', 'payment.dispute_lost'];
/** What a verified webhook says, in this API's own words (each provider maps its events to this). */
export interface ProviderEvent {
  id: string; type: ProviderEventType;
  /** when the provider created the event (ISO) */
  createdAt: string;
  sessionId: string; amountCents: number; currency: string;
  /** set by this API when it created the session and echoed back by the provider inside the signed body */
  tenantId: string; pilotCode: string;
}
export interface CheckoutSession { provider: string; sessionId: string; /** where the buyer pays: the provider's hosted page */ url: string; expiresAt: string; mode: 'SANDBOX' | 'LIVE' }
export interface CheckoutProvider {
  readonly name: string; readonly mode: 'SANDBOX' | 'LIVE';
  createSession(input: { tenantId: string; pilotCode: string; sku: string; amountCents: number; currency: string; description: string }): Promise<CheckoutSession>;
  /** Verifies the signature and freshness of a raw webhook body and returns its event; throws ApiError('unauthenticated') otherwise. */
  verifyWebhook(raw: Buffer, headers: Record<string, string | string[] | undefined>, now?: Date): ProviderEvent;
}

export const SIGNATURE_HEADER = 'x-empathia-signature';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hmac = (secret: string, t: number, raw: Buffer | string) => crypto.createHmac('sha256', secret).update(`${t}.`).update(raw).digest();

/** Constant-time signature check with a timestamp tolerance. Every failure is the same 401: a caller learns nothing about which part failed. */
export function verifySignature(secret: string, raw: Buffer, header: string, toleranceSeconds: number, now: Date = new Date()): void {
  const bad = () => new ApiError('unauthenticated', 'the webhook signature was not accepted');
  const parts = new Map(header.split(',').map((p) => { const i = p.indexOf('='); return [p.slice(0, i).trim(), p.slice(i + 1).trim()] as const; }));
  const t = Number(parts.get('t')); const v1 = parts.get('v1') || '';
  if (!Number.isSafeInteger(t) || !/^[0-9a-f]{64}$/.test(v1)) throw bad();
  const expected = hmac(secret, t, raw); const given = Buffer.from(v1, 'hex');
  const same = given.length === expected.length && crypto.timingSafeEqual(given, expected);
  // the freshness check runs whether or not the signature matched, so timing does not tell the two apart
  const fresh = Math.abs(Math.floor(now.getTime() / 1000) - t) <= toleranceSeconds;
  if (!same || !fresh) throw bad();
}
/** The signature header for a body — used by the sandbox simulator and by tests; a real provider signs on its own side. */
export function signPayload(secret: string, raw: Buffer | string, at: Date = new Date()): string {
  const t = Math.floor(at.getTime() / 1000);
  return `t=${t},v1=${hmac(secret, t, raw).toString('hex')}`;
}

/** The local sandbox: sessions are random ids, the "hosted page" is a sandbox: address nothing can open, and no network call is made. */
export class LocalSandboxProvider implements CheckoutProvider {
  readonly name = 'sandbox'; readonly mode = 'SANDBOX' as const;
  constructor(private secret: string, private toleranceSeconds: number) {}
  async createSession(input: { tenantId: string; pilotCode: string }): Promise<CheckoutSession> {
    const sessionId = `cs_sandbox_${crypto.randomBytes(18).toString('base64url')}`;
    return { provider: this.name, sessionId, url: `sandbox://checkout/${sessionId}?pilot=${encodeURIComponent(input.pilotCode)}`, expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), mode: this.mode };
  }
  verifyWebhook(raw: Buffer, headers: Record<string, string | string[] | undefined>, now: Date = new Date()): ProviderEvent {
    verifySignature(this.secret, raw, String(headers[SIGNATURE_HEADER] || ''), this.toleranceSeconds, now);
    // only a body whose signature was accepted is parsed
    let b: { id?: unknown; type?: unknown; created?: unknown; data?: { sessionId?: unknown; amountCents?: unknown; currency?: unknown; metadata?: { tenantId?: unknown; pilotCode?: unknown } } };
    try { b = JSON.parse(raw.toString('utf8')); } catch { throw new ApiError('validation', 'the webhook body is not JSON'); }
    const d = b.data || {}; const m = d.metadata || {};
    const okShape = typeof b.id === 'string' && /^evt_[A-Za-z0-9_-]{6,120}$/.test(b.id) && typeof b.type === 'string' && (PROVIDER_EVENT_TYPES as readonly string[]).includes(b.type)
      && Number.isSafeInteger(b.created) && typeof d.sessionId === 'string' && /^cs_sandbox_[A-Za-z0-9_-]{8,80}$/.test(d.sessionId) && Number.isSafeInteger(d.amountCents) && (d.amountCents as number) >= 0
      && typeof d.currency === 'string' && typeof m.tenantId === 'string' && UUID.test(m.tenantId) && typeof m.pilotCode === 'string' && /^PLT-[0-9]{4,10}$/.test(m.pilotCode);
    if (!okShape) throw new ApiError('validation', 'the webhook body does not have the shape of a sandbox provider event');
    return { id: b.id as string, type: b.type as ProviderEventType, createdAt: new Date((b.created as number) * 1000).toISOString(), sessionId: d.sessionId as string, amountCents: d.amountCents as number, currency: String(d.currency).toUpperCase(), tenantId: (m.tenantId as string).toLowerCase(), pilotCode: m.pilotCode as string };
  }
}

export interface PaymentConfig { enabled: boolean; provider: CheckoutProvider | null; why: string }
/**
 * Read at each use (tests switch it; a deployment sets it once). The sandbox is refused in production: a deployment that takes real
 * money must configure a real provider, and a sandbox event must never grant anything there.
 *   PILOT_CHECKOUT=off                  ADR-023 rollback: no new checkout; existing pilots stay readable
 *   PILOT_PAYMENT_PROVIDER=sandbox      the local sandbox (never in production)
 *   PILOT_WEBHOOK_SECRET=<≥32 bytes>    the webhook signing secret
 *   PILOT_WEBHOOK_TOLERANCE_SECONDS     default 300
 */
export function paymentConfig(env: Record<string, string | undefined> = process.env): PaymentConfig {
  const name = env['PILOT_PAYMENT_PROVIDER'] || '';
  if (!name) return { enabled: false, provider: null, why: 'no payment provider is configured on this deployment (PILOT_PAYMENT_PROVIDER): no checkout can be created and nothing is charged' };
  if (name !== 'sandbox') return { enabled: false, provider: null, why: `payment provider "${name}" is not implemented in this build: only the local sandbox exists` };
  if (env['NODE_ENV'] === 'production') return { enabled: false, provider: null, why: 'the sandbox payment provider is refused in production' };
  const secret = env['PILOT_WEBHOOK_SECRET'] || '';
  if (Buffer.byteLength(secret) < 32) return { enabled: false, provider: null, why: 'PILOT_WEBHOOK_SECRET is missing or shorter than 32 bytes: webhooks cannot be verified, so no checkout is created' };
  const tol = Number(env['PILOT_WEBHOOK_TOLERANCE_SECONDS'] || 300);
  return { enabled: true, provider: new LocalSandboxProvider(secret, Number.isFinite(tol) && tol > 0 ? tol : 300), why: '' };
}
export const checkoutOpen = (env: Record<string, string | undefined> = process.env) => env['PILOT_CHECKOUT'] !== 'off';
