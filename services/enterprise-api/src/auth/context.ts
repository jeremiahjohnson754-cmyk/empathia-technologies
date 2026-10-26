/**
 * The request context: who is calling (person, tenant, role and its authorities — resolved from the database on every request,
 * never trusted from the browser), the correlation id, and helpers for transactions, authorization, audit and events.
 */
import crypto from 'node:crypto';
import type { PgPool, Queryable } from '../db/pg.js';
import { ApiError } from '../http/errors.js';
import { validateEvent, EVENT_SCHEMA_VERSION } from '@empathia/event-contracts';

export interface Principal { personId: string; name: string; tenantId: string; tenantSlug: string; role: string; authorities: string[]; siteScope: string[] | null }

export class RequestContext {
  principal: Principal | null = null;
  constructor(public pool: PgPool, public correlationId: string) {}

  get p(): Principal { if (!this.principal) throw new ApiError('unauthenticated', 'sign in first'); return this.principal; }
  can(authority: string | string[]): boolean {
    const a = this.principal?.authorities || [];
    if (a.includes('*')) return true;
    return (Array.isArray(authority) ? authority : [authority]).some((x) => a.includes(x));
  }
  /** Deny by default. A refusal is audited in its own transaction (so it survives the failed request) and returns 403. */
  async require(authority: string | string[], action: string, aggregate?: { type: string; id: string }): Promise<void> {
    if (this.can(authority)) return;
    const need = Array.isArray(authority) ? authority.join(' or ') : authority;
    await this.audit(null, action, 'DENIED', aggregate, { need, role: this.p.role });
    throw new ApiError('forbidden', `${this.p.role} may not ${action} (needs ${need})`);
  }
  /** One transaction with the tenant and user set, so row-level security applies to every statement inside. */
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T> {
    return this.pool.tx({ tenantId: this.p.tenantId, userId: this.p.personId }, fn);
  }
  async audit(q: Queryable | null, action: string, outcome: 'ALLOWED' | 'DENIED' | 'FAILED', aggregate?: { type: string; id: string }, detail: Record<string, unknown> = {}): Promise<void> {
    const sql = `INSERT INTO app.audit_event (tenant_id, actor_id, actor_role, action, outcome, aggregate_type, aggregate_id, correlation_id, detail) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`;
    const args = [this.p.tenantId, this.p.personId, this.p.role, action, outcome, aggregate?.type ?? null, aggregate?.id ?? null, this.correlationId, detail];
    if (q) await q.query(sql, args); else await this.tx((t) => t.query(sql, args));
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
