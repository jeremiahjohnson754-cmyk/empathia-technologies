/**
 * The request context: who is calling (person, tenant, role and its authorities — resolved from the database on every request,
 * never trusted from the browser), the correlation id, and helpers for transactions, authorization, audit and events.
 */
import crypto from 'node:crypto';
import type { PgPool, Queryable } from '../db/pg.js';
import { ApiError } from '../http/errors.js';
import { validateEvent, EVENT_SCHEMA_VERSION } from '@empathia/event-contracts';

export interface Delegated { authority: string; grantorId: string; scope: { sites?: string[]; rooms?: string[]; projects?: string[] }; expiresAt: string; delegationId: string }
export interface Principal { personId: string; name: string; tenantId: string; tenantSlug: string; role: string; authorities: string[]; siteScope: string[] | null; delegated: Delegated[] }

export class RequestContext {
  principal: Principal | null = null;
  constructor(public pool: PgPool, public correlationId: string) {}

  get p(): Principal { if (!this.principal) throw new ApiError('unauthenticated', 'sign in first'); return this.principal; }
  can(authority: string | string[]): boolean {
    const a = this.principal?.authorities || []; const d = (this.principal?.delegated || []).map((x) => x.authority);
    if (a.includes('*')) return true;
    return (Array.isArray(authority) ? authority : [authority]).some((x) => a.includes(x) || d.includes(x));
  }
  /** The delegation that lends the authority, when the principal holds it only by delegation (so the audit can say so). */
  delegationFor(authority: string | string[]): Delegated | null {
    const a = this.principal?.authorities || []; const want = Array.isArray(authority) ? authority : [authority];
    if (a.includes('*') || want.some((x) => a.includes(x))) return null;
    return (this.principal?.delegated || []).find((x) => want.includes(x.authority)) || null;
  }
  /** Separation of duties (ADR-0005): a protected action is refused when the actor is one of the authors of what is being approved. */
  async separate(action: string, aggregate: { type: string; id: string }, authors: Array<string | null | undefined>, what: string): Promise<void> {
    if (authors.filter(Boolean).includes(this.p.personId)) await this.refuse(action, aggregate, [`separation of duties: ${what} cannot be approved by its own author (${this.p.role})`]);
  }
  /** Deny by default. A refusal is audited in its own transaction (so it survives the failed request) and returns 403. */
  async require(authority: string | string[], action: string, aggregate?: { type: string; id: string }): Promise<void> {
    if (this.can(authority)) { const d = this.delegationFor(authority); if (d) await this.audit(null, action, 'ALLOWED', aggregate, { delegated: true, delegationId: d.delegationId, grantorId: d.grantorId, expiresAt: d.expiresAt }); return; }
    const need = Array.isArray(authority) ? authority.join(' or ') : authority;
    await this.audit(null, action, 'DENIED', aggregate, { need, role: this.p.role });
    throw new ApiError('forbidden', `${this.p.role} may not ${action} (needs ${need})`);
  }
  /** One transaction with the tenant and user set, so row-level security applies to every statement inside. */
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T> {
    return this.pool.tx({ tenantId: this.p.tenantId, userId: this.p.personId }, fn);
  }
  /** Append an audit event; returns its id (so a record can point at the Evidence Ledger entry that explains it). */
  async audit(q: Queryable | null, action: string, outcome: 'ALLOWED' | 'DENIED' | 'FAILED', aggregate?: { type: string; id: string }, detail: Record<string, unknown> = {}): Promise<number> {
    const sql = `INSERT INTO app.audit_event (tenant_id, actor_id, actor_role, action, outcome, aggregate_type, aggregate_id, correlation_id, detail) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`;
    const args = [this.p.tenantId, this.p.personId, this.p.role, action, outcome, aggregate?.type ?? null, aggregate?.id ?? null, this.correlationId, detail];
    const r = q ? await q.query<{ id: number }>(sql, args) : await this.tx((t) => t.query<{ id: number }>(sql, args));
    return r.rows[0]!.id;
  }
  /** A rule refusal inside a transaction: the DENIED audit row is written in its own transaction first (the request's transaction is
   *  about to roll back and would take the row with it — red-team RT-01), then the refusal is thrown. */
  async refuse(action: string, aggregate: { type: string; id: string } | undefined, why: string[], detail: Record<string, unknown> = {}): Promise<never> {
    await this.audit(null, action, 'DENIED', aggregate, { why, ...detail });
    throw new ApiError('rule_refused', why[0] || 'refused', why);
  }
  /** Append an event to the transactional outbox (validated against its contract first: a corrupt event aborts the transaction). */
  async emit(q: Queryable, type: string, aggregate: { type: string; id: string; rev: number }, payload: Record<string, unknown>): Promise<string> {
    const problems = validateEvent({ type, aggregateType: aggregate.type, aggregateId: aggregate.id, aggregateRevision: aggregate.rev, payload });
    if (problems.length) throw new ApiError('internal', `event ${type} refused by its contract: ${problems.join('; ')}`);
    const id = crypto.randomUUID();
    await q.query(`INSERT INTO app.outbox_event (id, tenant_id, type, schema_version, aggregate_type, aggregate_id, aggregate_rev, payload, actor_id, correlation_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, this.p.tenantId, type, EVENT_SCHEMA_VERSION, aggregate.type, aggregate.id, aggregate.rev, payload, this.p.personId, this.correlationId]);
    return id;
  }
}
