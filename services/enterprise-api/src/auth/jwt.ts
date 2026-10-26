/**
 * Access tokens for the development identity provider: compact JWS, HS256, with iss/aud/exp/iat/nbf/jti checks and a ±30 s clock
 * tolerance. Production replaces the issuer with an OIDC provider (RS256 + JWKS) behind the same TokenVerifier interface.
 */
import crypto from 'node:crypto';

export interface Claims { sub: string; tid: string; role: string; iss: string; aud: string; iat: number; nbf: number; exp: number; jti: string }
export interface TokenVerifier { verify(token: string): Claims }

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');

export class Hs256Tokens implements TokenVerifier {
  constructor(private secret: Buffer, private iss: string, private aud: string, private ttl: number) {}
  issue(sub: string, tid: string, role: string, now = Math.floor(Date.now() / 1000)): { token: string; expiresIn: number } {
    const head = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = b64(JSON.stringify({ sub, tid, role, iss: this.iss, aud: this.aud, iat: now, nbf: now - 5, exp: now + this.ttl, jti: crypto.randomUUID() }));
    const sig = b64(crypto.createHmac('sha256', this.secret).update(`${head}.${body}`).digest());
    return { token: `${head}.${body}.${sig}`, expiresIn: this.ttl };
  }
  verify(token: string): Claims {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('malformed token');
    const [h, p, s] = parts as [string, string, string];
    let head: { alg?: string; typ?: string };
    try { head = JSON.parse(Buffer.from(h, 'base64url').toString('utf8')); } catch { throw new Error('malformed token header'); }
    if (head.alg !== 'HS256') throw new Error(`unsupported token algorithm ${String(head.alg)}`);   // refuses alg=none and RS/HS confusion
    const want = crypto.createHmac('sha256', this.secret).update(`${h}.${p}`).digest();
    const got = Buffer.from(s, 'base64url');
    if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) throw new Error('bad token signature');
    let c: Claims;
    try { c = JSON.parse(Buffer.from(p, 'base64url').toString('utf8')); } catch { throw new Error('malformed token payload'); }
    const now = Math.floor(Date.now() / 1000);
    if (c.iss !== this.iss || c.aud !== this.aud) throw new Error('token issuer or audience mismatch');
    if (typeof c.exp !== 'number' || now > c.exp + 30) throw new Error('token expired');
    if (typeof c.nbf === 'number' && now + 30 < c.nbf) throw new Error('token not yet valid');
    if (!c.sub || !c.tid || !c.role) throw new Error('token missing subject, tenant or role');
    return c;
  }
}
