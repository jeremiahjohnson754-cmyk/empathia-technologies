/**
 * The outbox worker: delivers events at least once, in order of occurrence, to idempotent handlers.
 * Claims a batch with FOR UPDATE SKIP LOCKED (several workers can run), retries with exponential backoff, and moves an event to
 * DEAD_LETTER after MAX_ATTEMPTS, where an admin can see it and retry it (/v1/admin/outbox). Runs as the database role empathia_worker,
 * the only role the cross-tenant outbox, notification and read-model policies admit (migration 0008).
 */
import type { PgPool, Queryable } from '../db/pg.js';
import { log } from '../log.js';

export const MAX_ATTEMPTS = 8;
export interface OutboxEvent { id: string; tenant_id: string; type: string; aggregate_type: string; aggregate_id: string; aggregate_rev: number; payload: Record<string, unknown>; attempts: number; correlation_id: string }
export type Handler = (q: Queryable, e: OutboxEvent) => Promise<void>;

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

export class OutboxWorker {
  private timer: NodeJS.Timeout | null = null; private busy = false;
  delivered = 0; failed = 0; dead = 0;
  constructor(private pool: PgPool, private handlers: Handler[] = [readModelHandler, notificationHandler], private intervalMs = 500) {}
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
  /** Process one batch. Returns the number of events handled. */
  async tick(batch = 50): Promise<number> {
    if (this.busy) return 0; this.busy = true;
    try {
      return await this.pool.tx({}, async (q) => {
        const evs = (await q.query<OutboxEvent>(`SELECT id, tenant_id, type, aggregate_type, aggregate_id, aggregate_rev, payload, attempts, correlation_id FROM app.outbox_event WHERE status = 'PENDING' AND next_attempt_at <= now() ORDER BY occurred_at, id LIMIT $1 FOR UPDATE SKIP LOCKED`, [batch])).rows;
        for (const e of evs) {
          await q.query('SAVEPOINT ev');
          try {
            for (const h of this.handlers) await h(q, e);
            await q.query(`UPDATE app.outbox_event SET status = 'DELIVERED', delivered_at = now(), attempts = attempts + 1 WHERE id = $1`, [e.id]);
            await q.query('RELEASE SAVEPOINT ev'); this.delivered += 1;
          } catch (err) {
            await q.query('ROLLBACK TO SAVEPOINT ev');
            const attempts = e.attempts + 1; const dead = attempts >= MAX_ATTEMPTS;
            await q.query(`UPDATE app.outbox_event SET attempts = $2, status = $3, next_attempt_at = now() + make_interval(secs => $4), last_error = $5 WHERE id = $1`, [e.id, attempts, dead ? 'DEAD_LETTER' : 'PENDING', Math.min(2 ** attempts, 600), String((err as Error).message).slice(0, 500)]);
            this.failed += 1; if (dead) this.dead += 1;
            log(dead ? 'error' : 'warn', dead ? 'outbox event dead-lettered' : 'outbox delivery failed', { eventId: e.id, type: e.type, attempts, correlationId: e.correlation_id, error: (err as Error).message });
          }
        }
        return evs.length;
      });
    } finally { this.busy = false; }
  }
  /** Drain everything currently due (tests and the seed use this). */
  async drain(max = 50): Promise<number> { let n = 0; for (let i = 0; i < max; i += 1) { const k = await this.tick(); n += k; if (!k) break; } return n; }
}
