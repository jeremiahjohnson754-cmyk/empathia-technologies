/** scrypt password hashes for the development identity provider: scrypt$N$r$p$salt$hash (base64url). Constant-time comparison. */
import crypto from 'node:crypto';
const N = 16384, R = 8, P = 1, LEN = 32;
export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw.normalize('NFKC'), salt, LEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64url')}$${h.toString('base64url')}`;
}
export function verifyPassword(pw: string, stored: string | null): boolean {
  // always spend the same work, even when there is no account, so timing does not reveal which emails exist
  const parts = (stored || `scrypt$${N}$${R}$${P}$${'A'.repeat(22)}$${'A'.repeat(43)}`).split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, salt, hash] = parts as [string, string, string, string, string, string];
  const got = crypto.scryptSync(pw.normalize('NFKC'), Buffer.from(salt, 'base64url'), LEN, { N: Number(n), r: Number(r), p: Number(p) });
  const want = Buffer.from(hash, 'base64url');
  return !!stored && want.length === got.length && crypto.timingSafeEqual(got, want);
}
