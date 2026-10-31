/**
 * Evidence Ledger integrity (P1, ADR-0010). The audit trail is a per-tenant SHA-256 hash chain (migration 0024): every committed event
 * is sealed, after commit, with the next sequence number, the previous event's hash and its own hash over a canonical serialization of
 * every column. Verification is recomputed here, in the API process, with Node's crypto (not by the database function that sealed it):
 * a changed field, a deleted or re-ordered event, or a re-pointed link breaks the chain at a named sequence number.
 * Limits, stated in every answer: events are unsealed between commit and the next seal; someone who can rewrite an event AND every later
 * hash inside the database is detectable only against a head hash kept outside it — hence the head is returned for external record.
 */
import crypto from 'node:crypto';
import type { RequestContext } from '../auth/context.js';

export const LEDGER_READ = ['provenance.review', 'policy.configure'];
const ZERO = Buffer.alloc(32);

export async function integrity(ctx: RequestContext) {
  await ctx.require(LEDGER_READ, 'verify the evidence ledger');
  return ctx.tx(async (q) => {
    const sealedNow = (await q.query<{ n: number }>('SELECT app.seal_audit($1) AS n', [ctx.p.tenantId])).rows[0]!.n;
    let prevSeq = 0; let prevHash = ZERO; let checked = 0; let firstBreak: { seq: number; reason: string } | null = null; let headAt: string | null = null;
    for (;;) {
      const rows = (await q.query<{ seq: string; prev_hash: string; hash: string; canon: string; at: string }>(
        "SELECT e.seq, encode(e.prev_hash, 'hex') AS prev_hash, encode(e.hash, 'hex') AS hash, app.audit_canonical(e) AS canon, e.at FROM app.audit_event e WHERE e.seq > $1 ORDER BY e.seq LIMIT 2000", [prevSeq])).rows;
      if (!rows.length) break;
      for (const r of rows) {
        const seq = Number(r.seq); const ph = Buffer.from(r.prev_hash, 'hex'); const h = Buffer.from(r.hash, 'hex');
        if (!firstBreak) {
          if (seq !== prevSeq + 1) firstBreak = { seq, reason: `sequence gap: ${prevSeq} is followed by ${seq} (an event is missing)` };
          else if (!ph.equals(prevHash)) firstBreak = { seq, reason: 'the link to the previous event does not match its hash (re-pointed or re-ordered)' };
          else if (!crypto.createHash('sha256').update(Buffer.concat([ph, Buffer.from(r.canon, 'utf8')])).digest().equals(h)) firstBreak = { seq, reason: 'the event’s content no longer matches its sealed hash (changed after sealing)' };
        }
        prevSeq = seq; prevHash = h; headAt = r.at; checked += 1;
      }
    }
    const unsealed = (await q.query<{ n: number }>('SELECT count(*)::int AS n FROM app.audit_event WHERE seq IS NULL')).rows[0]!.n;
    return {
      verified: !firstBreak && checked > 0, checked, unsealed, sealedNow, firstBreak,
      head: checked ? { seq: prevSeq, hash: prevHash.toString('hex'), at: headAt } : null,
      checkedAt: new Date().toISOString(),
      method: 'SHA-256 chain per tenant: hash = sha256(previous hash ‖ canonical event); recomputed in the API process, independently of the sealing function',
      limits: [
        'Events committed since the last seal are not yet in the chain (this check seals first; events committed during the check may remain unsealed).',
        'The chain proves nothing about changes made before migration 0024 sealed the existing events.',
        'Someone able to rewrite an event and every later hash inside the database is detected only by comparing this head with one recorded outside the database.',
      ],
    };
  });
}
