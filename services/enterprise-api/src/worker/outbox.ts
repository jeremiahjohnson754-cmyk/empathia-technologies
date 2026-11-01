/**
 * The outbox worker: delivers events at least once to idempotent handlers, in order per aggregate, each under its own tenant.
 * Runs as the database role empathia_worker (migration 0008). Several workers can run at once.
 *
 * Ordering (migration 0027). An aggregate's events (tenant, aggregate_type, aggregate_id) are delivered strictly in (aggregate_rev, seq)
 * order, seq being the order they were appended in. A worker takes an aggregate only under a transaction-scoped advisory lock and only
 * from its head: the earliest event not yet DELIVERED. While that event is pending, retrying (backoff), leased (external delivery in
 * flight) or DEAD_LETTER, the later events of the same aggregate are HELD — never attempted — until it is delivered, which for a
 * dead letter means a security admin's audited replay (POST /v1/admin/outbox/:event/retry). There is no skip. Other aggregates keep
 * flowing, in parallel across workers.
 *
 * Internal handlers (read model, notifications) run inside the delivery transaction with app.tenant_id set to the event's tenant, so
 * row-level security confines their writes to that tenant. Each writes a delivery receipt (app.outbox_delivery) in the same transaction
 * as its effect: a crash anywhere before COMMIT rolls back effects and receipts together (exactly once), and a handler with a receipt
 * is never run again for that event.
 *
 * External sinks (effects outside the database — a Teams/Outlook message, a connector event) are NEVER called inside a transaction.
 * After the internal effects commit, the event is leased to this worker and stays PENDING; the worker then calls the sinks with no
 * transaction open, passing an idempotency key derived from the event id (outbox:<event id>:<sink>), and records each sink's receipt
 * afterwards. A crash between a sink's effect and its receipt means the sink is called again (with the same key) once the lease
 * expires: delivery outside the database is at-least-once, and the consumer deduplicates on the key. No sink is configured in this
 * starter (no real Teams/Outlook connector exists); the tests use a local stub sink.
 *
 * Failures retry with exponential backoff and move to DEAD_LETTER after MAX_ATTEMPTS, where an admin can see and replay them.
 * The worker has no fault-injection hook; crash tests drive it from a test-only child process (tests/integration/outbox-worker-child.mjs).
 */
import os from 'node:os';
import crypto from 'node:crypto';
import type { PgPool, Queryable } from '../db/pg.js';
import { log } from '../log.js';

export const MAX_ATTEMPTS = 8;
export interface OutboxEvent { id: string; tenant_id: string; type: string; aggregate_type: string; aggregate_id: string; aggregate_rev: number; payload: Record<string, unknown>; attempts: number; correlation_id: string }
export type Handler = (q: Queryable, e: OutboxEvent) => Promise<void>;

/** An effect outside the database. deliver() must be idempotent on idempotencyKey: a repeated call with the same key must not repeat the effect. */
export interface ExternalSink {
  /** Stable name (1–80 characters): part of the idempotency key and of the delivery receipt. */
  readonly name: string;
  /** The events this sink takes (default: all). */
  accepts?(e: OutboxEvent): boolean;
  /** Called with no database transaction open. Rejecting (or exceeding the timeout) counts as a failed attempt of the event. */
  deliver(e: OutboxEvent, idempotencyKey: string, signal: AbortSignal): Promise<void>;
}
export interface OutboxWorkerOptions {
  externalSinks?: ExternalSink[];
  /** Recorded on leases and receipts. Default: host:pid:random. */
  workerId?: string;
  /** How long an event with external sinks in flight is reserved for this worker (default 60 s). Must exceed externalTimeoutMs. */
  leaseMs?: number;
  /** Per-call limit for an external sink (default 10 s). */
  externalTimeoutMs?: number;
}

/** The idempotency key an external consumer deduplicates on: derived from the event id, stable across redeliveries. */
export const idempotencyKey = (eventId: string, handler: string) => `outbox:${eventId}:${handler}`;

/** Rebuild the operational read model of the room an event concerns. Idempotent: a full recompute from the canonical tables. */
export const readModelHandler: Handler = async (q, e) => {
  const code = String(e.payload['roomId'] || e.payload['designId'] || '');
  if (!code.startsWith('R-')) return;
  await q.query("SELECT set_config('app.tenant_id', $1, true)", [e.tenant_id]);
  const r = (await q.query<{ id: string; code: string; name: string; lifecycle: string; classification: { archetypeName?: string } | null }>('SELECT id, code, name, lifecycle, classification FROM app.room WHERE code = $1 AND tenant_id = $2', [code, e.tenant_id])).rows[0];
  if (!r) return;
  const devices = (await q.query<{ n: number }>('SELECT count(*)::int AS n FROM app.planned_asset WHERE room_id = $1 AND removed_at IS NULL AND furniture = false', [r.id])).rows[0]!.n;
  const iss = (await q.query<{ open: number; high: number }>("SELECT count(*) FILTER (WHERE state = 'OPEN')::int AS open, count(*) FILTER (WHERE state = 'OPEN' AND severity IN ('High','Critical'))::int AS high FROM app.room_issue WHERE room_id = $1", [r.id])).rows[0]!;
  const plan = (await q.query<{ id: string; applicable: number }>('SELECT id, applicable FROM app.cx_plan WHERE room_id = $1 ORDER BY compiled_at DESC, id DESC LIMIT 1', [r.id])).rows[0];
  const rows = plan ? (await q.query<{ test_id: string; applicable: boolean }>('SELECT test_id, applicable FROM app.cx_plan_row WHERE plan_id = $1', [plan.id])).rows : [];
  const labels = new Map((await q.query<{ test_id: string; result_label: string }>('SELECT test_id, result_label FROM app.current_result WHERE room_id = $1', [r.id])).rows.map((x) => [x.test_id, x.result_label]));
  const L = rows.filter((x) => x.applicable).map((x) => labels.get(x.test_id) || 'NOT_TESTED');
  const n = (k: string) => L.filter((x) => x === k).length;
  const counts = { applicable: L.length, recorded: L.length - n('NOT_TESTED'), verified: n('PASS_VERIFIED'), awaiting: n('PASS_UNVERIFIED'), failed: n('FAIL'), notSupported: n('NOT_SUPPORTED'), inconclusive: n('INCONCLUSIVE'), notTested: n('NOT_TESTED') };
  const label = r.lifecycle === 'PLANNED' ? 'PLANNED — NOT YET COMMISSIONED' : r.lifecycle.replace(/_/g, ' ');
  await q.query(`INSERT INTO app.room_read_model (tenant_id, room_id, room_code, name, lifecycle, lifecycle_label, archetype, devices, open_issues, open_high, applicable_tests, results, last_event_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
    ON CONFLICT (tenant_id, room_id) DO UPDATE SET name = EXCLUDED.name, lifecycle = EXCLUDED.lifecycle, lifecycle_label = EXCLUDED.lifecycle_label, archetype = EXCLUDED.archetype, devices = EXCLUDED.devices,
      open_issues = EXCLUDED.open_issues, open_high = EXCLUDED.open_high, applicable_tests = EXCLUDED.applicable_tests, results = EXCLUDED.results, last_event_at = EXCLUDED.last_event_at, rebuilt_at = now()`,
    [e.tenant_id, r.id, r.code, r.name, r.lifecycle, label, r.classification?.archetypeName ?? null, devices, iss.open, iss.high, plan?.applicable ?? 0, counts]);
};

/** Notifications for the people who must act. Unique per (event, kind, role): delivering twice notifies once. */
export const notificationHandler: Handler = async (q, e) => {
  const note = (role: string, kind: string, title: string, link: string | null) => q.query('INSERT INTO app.notification (tenant_id, to_role, kind, title, link, event_id) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (event_id, kind, to_role) DO NOTHING', [e.tenant_id, role, kind, title, link, e.id]);
  if (e.type === 'issue.assigned') await note(String(e.payload['owner']), 'issue.assigned', `Issue ${e.payload['issueId']} was assigned to your role`, `/v1/issues/${e.payload['issueId']}`);
  if (e.type === 'deficiency.identified' && ['High', 'Critical'].includes(String(e.payload['severity']))) await note('syseng', 'deficiency.high', `${e.payload['severity']} design deficiency in ${e.payload['roomId']}: ${e.payload['key']}`, `/v1/rooms/${e.payload['roomId']}`);
  if (e.type === 'work_order.created') await note('service', 'work_order.created', `Work order ${e.payload['workOrderId']} for ${e.payload['roomId']}`, null);
  if (e.type === 'commission.test_result_submitted' && e.payload['resultLabel'] === 'PASS_UNVERIFIED') await note('qa_reviewer', 'result.awaiting_verification', `${e.payload['testId']} in ${e.payload['roomId']} passed and awaits independent verification`, `/v1/rooms/${e.payload['roomId']}`);
};

interface Row extends OutboxEvent { status: string; due: boolean; leased: boolean }
interface ExternalJob { e: OutboxEvent; sinks: ExternalSink[] }
const COLS = 'id, tenant_id, type, aggregate_type, aggregate_id, aggregate_rev, payload, attempts, correlation_id';
const errText = (err: unknown) => String((err as Error)?.message ?? err).slice(0, 500);
const plain = (e: OutboxEvent): OutboxEvent => ({ id: e.id, tenant_id: e.tenant_id, type: e.type, aggregate_type: e.aggregate_type, aggregate_id: e.aggregate_id, aggregate_rev: e.aggregate_rev, payload: e.payload, attempts: e.attempts, correlation_id: e.correlation_id });

export class OutboxWorker {
  private timer: NodeJS.Timeout | null = null; private busy = false;
  delivered = 0; failed = 0; dead = 0;
  readonly workerId: string;
  private readonly sinks: ExternalSink[]; private readonly leaseMs: number; private readonly externalTimeoutMs: number;
  constructor(private pool: PgPool, private handlers: Handler[] = [readModelHandler, notificationHandler], private intervalMs = 500, opts: OutboxWorkerOptions = {}) {
    this.sinks = opts.externalSinks || [];
    this.workerId = (opts.workerId || `${os.hostname()}:${process.pid}:${crypto.randomBytes(3).toString('hex')}`).slice(0, 120);
    this.externalTimeoutMs = opts.externalTimeoutMs ?? 10000;
    this.leaseMs = opts.leaseMs ?? 60000;
    if (!(this.leaseMs > this.externalTimeoutMs)) throw new Error('OutboxWorker: leaseMs must exceed externalTimeoutMs (an event must not be redelivered while its sink call can still be running)');
    const names = [...this.handlers.map((h, i) => this.handlerName(h, i)), ...this.sinks.map((s) => s.name)];
    for (const s of this.sinks) if (!s.name || s.name.length > 80) throw new Error('OutboxWorker: an external sink needs a name of 1–80 characters');
    if (new Set(this.sinks.map((s) => s.name)).size !== this.sinks.length) throw new Error(`OutboxWorker: external sink names must be unique (${names.join(', ')})`);
  }
  sealed = 0; private ticks = 0;
  /** Every 10th tick, seal committed audit events into each tenant's hash chain (ADR-0010; sealing never runs inside a request). */
  /** The last tick's failure (database unreachable, …), or null. A failing tick never ends the process: it is logged once per outage. */
  lastError: string | null = null;
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick().then(() => { if (this.lastError) { log('info', 'outbox worker recovered', { after: this.lastError }); this.lastError = null; } this.ticks += 1; return this.ticks % 10 === 0 ? this.seal() : 0; })
        .catch((err: unknown) => { const m = (err as Error).message; if (this.lastError !== m) log('error', 'outbox worker tick failed; retrying on the next tick', { error: m }); this.lastError = m; });
    }, this.intervalMs);
  }
  async seal(): Promise<number> {
    try { const n = (await this.pool.tx({}, (q) => q.query<{ n: number }>('SELECT app.seal_audit_all() AS n'))).rows[0]!.n; this.sealed += n; return n; }
    catch (err) { log('warn', 'audit chain seal failed', { error: (err as Error).message }); return 0; }
  }
  stop(): void { if (this.timer) clearInterval(this.timer); this.timer = null; }

  /** A handler's receipt name: its function name, else its position (anonymous test handlers). */
  private handlerName(h: Handler, i: number): string { return (h.name || `handler#${i}`).slice(0, 80); }

  /**
   * Process one batch: up to `batch` events, aggregate by aggregate, each aggregate from its head and in order. Internal effects and
   * receipts commit in one transaction; external sinks are called after it commits, with no transaction open. Returns the number of
   * events taken (delivered, failed or leased for external delivery).
   */
  async tick(batch = 50): Promise<number> {
    if (this.busy) return 0; this.busy = true;
    try {
      const external: ExternalJob[] = [];
      const taken = await this.pool.tx({}, async (q) => {
        // candidate aggregates: those whose head (earliest undelivered event) is pending, due and not leased — oldest head first
        const heads = (await q.query<{ tenant_id: string; aggregate_type: string; aggregate_id: string }>(`
          SELECT tenant_id, aggregate_type, aggregate_id FROM (
            SELECT DISTINCT ON (tenant_id, aggregate_type, aggregate_id) tenant_id, aggregate_type, aggregate_id, status, next_attempt_at, lease_until, seq
              FROM app.outbox_event WHERE status IN ('PENDING', 'DEAD_LETTER')
             ORDER BY tenant_id, aggregate_type, aggregate_id, aggregate_rev, seq) h
           WHERE status = 'PENDING' AND next_attempt_at <= now() AND (lease_until IS NULL OR lease_until <= now())
           ORDER BY seq LIMIT $1`, [batch])).rows;
        let n = 0;
        for (const a of heads) {
          if (n >= batch) break;
          // one worker per aggregate at a time; another worker skips it (and takes the next aggregate) instead of waiting
          const lock = (await q.query<{ ok: boolean }>("SELECT pg_try_advisory_xact_lock(hashtextextended('app.outbox:' || $1 || ':' || $2 || ':' || $3, 0)) AS ok", [a.tenant_id, a.aggregate_type, a.aggregate_id])).rows[0]!;
          if (!lock.ok) continue;
          // re-read under the lock (a fresh snapshot): the aggregate's undelivered events in delivery order
          const run = (await q.query<Row>(`SELECT ${COLS}, status, next_attempt_at <= now() AS due, (lease_until IS NOT NULL AND lease_until > now()) AS leased
              FROM app.outbox_event WHERE tenant_id = $1 AND aggregate_type = $2 AND aggregate_id = $3 AND status IN ('PENDING', 'DEAD_LETTER')
             ORDER BY aggregate_rev, seq LIMIT $4 FOR UPDATE`, [a.tenant_id, a.aggregate_type, a.aggregate_id, batch - n])).rows;
          for (const e of run) {
            if (e.status !== 'PENDING' || !e.due || e.leased) break;            // the head is not deliverable now: hold everything after it
            n += 1;
            const out = await this.deliverInternal(q, e);
            if (Array.isArray(out)) { external.push({ e: plain(e), sinks: out }); break; }   // leased: later events wait for it
            if (out === 'failed') break;
          }
        }
        return n;
      });
      if (external.length) await this.deliverExternal(external);
      return taken;
    } finally { this.busy = false; }
  }

  private acceptingSinks(e: OutboxEvent): ExternalSink[] { return this.sinks.filter((s) => !s.accepts || s.accepts(e)); }

  /** Inside the batch transaction: run the internal handlers that have no receipt yet, under the event's tenant. Returns the external
   *  sinks still to call (the event is then leased to this worker), or the outcome. */
  private async deliverInternal(q: Queryable, e: Row): Promise<'delivered' | 'failed' | ExternalSink[]> {
    await q.query('SAVEPOINT ev');
    try {
      await q.query("SELECT set_config('app.tenant_id', $1, true)", [e.tenant_id]);
      const done = new Set((await q.query<{ k: string }>("SELECT kind || ':' || handler AS k FROM app.outbox_delivery WHERE event_id = $1", [e.id])).rows.map((r) => r.k));
      for (const [i, h] of this.handlers.entries()) {
        const name = this.handlerName(h, i);
        if (done.has(`INTERNAL:${name}`)) continue;
        await h(q, e);
        await q.query("SELECT set_config('app.tenant_id', $1, true)", [e.tenant_id]);   // whatever the handler did with the setting
        await q.query("INSERT INTO app.outbox_delivery (tenant_id, event_id, kind, handler, idempotency_key, worker) VALUES ($1, $2, 'INTERNAL', $3, $4, $5)", [e.tenant_id, e.id, name, idempotencyKey(e.id, name), this.workerId]);
      }
      const pendingSinks = this.acceptingSinks(e).filter((s) => !done.has(`EXTERNAL:${s.name}`));
      if (pendingSinks.length) {
        await q.query('UPDATE app.outbox_event SET lease_owner = $2, lease_until = now() + make_interval(secs => $3) WHERE id = $1', [e.id, this.workerId, this.leaseMs / 1000]);
        await q.query('RELEASE SAVEPOINT ev');
        return pendingSinks;
      }
      await q.query(`UPDATE app.outbox_event SET status = 'DELIVERED', delivered_at = now(), attempts = attempts + 1, lease_owner = NULL, lease_until = NULL WHERE id = $1`, [e.id]);
      await q.query('RELEASE SAVEPOINT ev'); this.delivered += 1;
      return 'delivered';
    } catch (err) {
      await q.query('ROLLBACK TO SAVEPOINT ev');
      await this.recordFailure(q, e, err);
      return 'failed';
    } finally {
      await q.query("SELECT set_config('app.tenant_id', '', true)");
    }
  }

  private async recordFailure(q: Queryable, e: OutboxEvent, err: unknown): Promise<void> {
    const attempts = e.attempts + 1; const dead = attempts >= MAX_ATTEMPTS;
    await q.query(`UPDATE app.outbox_event SET attempts = $2, status = $3, next_attempt_at = now() + make_interval(secs => $4), last_error = $5, lease_owner = NULL, lease_until = NULL WHERE id = $1`, [e.id, attempts, dead ? 'DEAD_LETTER' : 'PENDING', Math.min(2 ** attempts, 600), errText(err)]);
    this.failed += 1; if (dead) this.dead += 1;
    log(dead ? 'error' : 'warn', dead ? 'outbox event dead-lettered' : 'outbox delivery failed', { eventId: e.id, type: e.type, attempts, correlationId: e.correlation_id, error: errText(err) });
  }

  /**
   * After the batch transaction committed: call every pending sink of every leased event with NO transaction open (all calls of the
   * batch settle before any receipt is written), then record receipts and outcomes, one short transaction per event.
   */
  private async deliverExternal(jobs: ExternalJob[]): Promise<void> {
    const results = await Promise.all(jobs.map(async (j) => {
      const outcomes: Array<{ sink: ExternalSink; error: unknown | null }> = [];
      for (const s of j.sinks) outcomes.push({ sink: s, error: await this.callSink(s, j.e).then(() => null, (err: unknown) => err ?? new Error('external sink failed')) });
      return { j, outcomes };
    }));
    for (const { j, outcomes } of results) {
      try {
        await this.pool.tx({ tenantId: j.e.tenant_id }, async (q) => {
          for (const o of outcomes) if (!o.error) await q.query("INSERT INTO app.outbox_delivery (tenant_id, event_id, kind, handler, idempotency_key, worker) VALUES ($1, $2, 'EXTERNAL', $3, $4, $5) ON CONFLICT DO NOTHING", [j.e.tenant_id, j.e.id, o.sink.name, idempotencyKey(j.e.id, o.sink.name), this.workerId]);
          const cur = (await q.query<{ status: string; lease_owner: string | null; attempts: number }>('SELECT status, lease_owner, attempts FROM app.outbox_event WHERE id = $1 FOR UPDATE', [j.e.id])).rows[0];
          if (!cur || cur.status !== 'PENDING') return;
          const failed = outcomes.find((o) => o.error);
          if (failed) {
            // only the lease holder records the failure (a worker whose lease expired leaves the event to its new holder)
            if (cur.lease_owner === this.workerId) await this.recordFailure(q, { ...j.e, attempts: cur.attempts }, new Error(`external sink ${failed.sink.name}: ${errText(failed.error)}`));
            return;
          }
          const want = this.acceptingSinks(j.e).map((s) => s.name);
          const have = new Set((await q.query<{ handler: string }>("SELECT handler FROM app.outbox_delivery WHERE event_id = $1 AND kind = 'EXTERNAL'", [j.e.id])).rows.map((r) => r.handler));
          if (want.every((w) => have.has(w))) {
            await q.query(`UPDATE app.outbox_event SET status = 'DELIVERED', delivered_at = now(), attempts = attempts + 1, lease_owner = NULL, lease_until = NULL WHERE id = $1`, [j.e.id]);
            this.delivered += 1;
          }
        });
      } catch (err) {
        // the receipt could not be recorded: the lease expires and the sink is called again with the same idempotency key
        log('warn', 'outbox external receipt not recorded; the event will be redelivered after its lease', { eventId: j.e.id, error: errText(err) });
      }
    }
  }

  private async callSink(s: ExternalSink, e: OutboxEvent): Promise<void> {
    const ac = new AbortController(); let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, bad) => { timer = setTimeout(() => { ac.abort(); bad(new Error(`timed out after ${this.externalTimeoutMs} ms`)); }, this.externalTimeoutMs); });
    try { await Promise.race([s.deliver(e, idempotencyKey(e.id, s.name), ac.signal), timeout]); } finally { clearTimeout(timer); }
  }

  /** Drain everything currently due (tests and the seed use this). */
  async drain(max = 1000): Promise<number> { let n = 0; for (let i = 0; i < max; i += 1) { const k = await this.tick(); n += k; if (!k) break; } return n; }
}
