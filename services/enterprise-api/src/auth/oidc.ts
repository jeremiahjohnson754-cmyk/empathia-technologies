/**
 * OIDC bearer tokens for production (AUTH_MODE=oidc): RS256 / ES256 JWS verified against the provider's JWKS, with issuer, audience,
 * expiry and not-before checks and a ±30 s clock tolerance. The JWKS is cached (default 10 minutes) and refreshed once when a token
 * names an unknown key id (key rotation); a second unknown kid within the cool-down is refused, so a flood of bad tokens cannot be used
 * to hammer the provider. `alg=none`, HMAC algorithms and any algorithm that does not match the key's use are refused — a token must
 * never be verified with the public key as an HMAC secret. The subject is mapped to a person by app.person.external_subject; when the
 * provider asserts a verified email and OIDC_LINK_BY_EMAIL is on, a first sign-in binds the subject to the existing person with that
 * email (audited through the sign-in path). Tested against a local JWKS (tests/security/oidc.test.mjs); NOT yet verified against a
 * named provider — that needs the owner's tenant and client registration.
 */
import crypto from 'node:crypto';

export interface OidcClaims { sub: string; iss: string; aud: string | string[]; exp: number; nbf?: number; iat?: number; email?: string; email_verified?: boolean; [k: string]: unknown }
export interface OidcOptions { issuer: string; audience: string; jwksUrl: string; cacheMs?: number; fetchImpl?: typeof fetch; clockToleranceS?: number }
interface Jwk { kid?: string; kty: string; alg?: string; use?: string; n?: string; e?: string; crv?: string; x?: string; y?: string }

const ALGS: Record<string, { kty: string; node: string; opts?: Record<string, unknown> }> = {
  RS256: { kty: 'RSA', node: 'sha256', opts: { padding: crypto.constants.RSA_PKCS1_PADDING } },
  RS384: { kty: 'RSA', node: 'sha384', opts: { padding: crypto.constants.RSA_PKCS1_PADDING } },
  RS512: { kty: 'RSA', node: 'sha512', opts: { padding: crypto.constants.RSA_PKCS1_PADDING } },
  PS256: { kty: 'RSA', node: 'sha256', opts: { padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 } },
  ES256: { kty: 'EC', node: 'sha256', opts: { dsaEncoding: 'ieee-p1363' } },
};

export class OidcVerifier {
  private keys = new Map<string, crypto.KeyObject>();
  private fetchedAt = 0; private lastMiss = 0;
  constructor(private o: OidcOptions) {}

  private async loadJwks(force = false): Promise<void> {
    const now = Date.now(); const ttl = this.o.cacheMs ?? 600_000;
    if (!force && this.keys.size && now - this.fetchedAt < ttl) return;
    if (force && now - this.lastMiss < 60_000 && this.keys.size) return;   // one refresh per minute on unknown kid
    const f = this.o.fetchImpl || fetch;
    const r = await f(this.o.jwksUrl, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error(`JWKS fetch failed: ${r.status}`);
    const doc = (await r.json()) as { keys?: Jwk[] };
    const next = new Map<string, crypto.KeyObject>();
    for (const k of doc.keys || []) { if (!k.kid || (k.use && k.use !== 'sig')) continue; if (k.kty !== 'RSA' && k.kty !== 'EC') continue; try { next.set(k.kid, crypto.createPublicKey({ key: k as unknown as JsonWebKey, format: 'jwk' })); } catch { /* skip an unusable key */ } }
    if (!next.size) throw new Error('JWKS has no usable signing key');
    this.keys = next; this.fetchedAt = now; if (force) this.lastMiss = now;
  }

  async verify(token: string): Promise<OidcClaims> {
    const parts = token.split('.'); if (parts.length !== 3) throw new Error('malformed token');
    const [h, p, s] = parts as [string, string, string];
    let head: { alg?: string; kid?: string; typ?: string };
    try { head = JSON.parse(Buffer.from(h, 'base64url').toString('utf8')); } catch { throw new Error('malformed token header'); }
    const alg = ALGS[String(head.alg)]; if (!alg) throw new Error(`unsupported token algorithm ${String(head.alg)}`);
    if (!head.kid) throw new Error('token names no key id');
    await this.loadJwks();
    let key = this.keys.get(head.kid);
    if (!key) { await this.loadJwks(true); key = this.keys.get(head.kid); }
    if (!key) throw new Error('unknown signing key');
    if (key.asymmetricKeyType !== (alg.kty === 'RSA' ? 'rsa' : 'ec')) throw new Error('token algorithm does not match the signing key');
    const ok = crypto.verify(alg.node, Buffer.from(`${h}.${p}`), { key, ...(alg.opts || {}) }, Buffer.from(s, 'base64url'));
    if (!ok) throw new Error('bad token signature');
    let c: OidcClaims; try { c = JSON.parse(Buffer.from(p, 'base64url').toString('utf8')); } catch { throw new Error('malformed token payload'); }
    const now = Math.floor(Date.now() / 1000); const tol = this.o.clockToleranceS ?? 30;
    if (c.iss !== this.o.issuer) throw new Error('token issuer mismatch');
    const aud = Array.isArray(c.aud) ? c.aud : [c.aud]; if (!aud.includes(this.o.audience)) throw new Error('token audience mismatch');
    if (typeof c.exp !== 'number' || now > c.exp + tol) throw new Error('token expired');
    if (typeof c.nbf === 'number' && now + tol < c.nbf) throw new Error('token not yet valid');
    if (!c.sub || typeof c.sub !== 'string') throw new Error('token has no subject');
    return c;
  }
}
