/**
 * Integration sync (Harmony / Field Intelligence starter). For one tenant and one integration: run the adapter through the common
 * contract with retries and a rate limit, deduplicate, match to canonical assets by serial or MAC only, store observations with their
 * evidence label, record sync health, and emit integration.adapter_health_changed when the health changes.
 *
 * Runs inside the API process (POST /v1/integrations/:key/sync) or standalone (services/integration-worker). Only MOCK adapters exist:
 * their observations are SYNTHETIC_MOCK (enforced again by the database, EM004) and nothing downstream treats them as measurements.
 */
import { dedupe, isStale, matchCanonical, TokenBucket, withRetry, AdapterError, type Adapter, type AdapterContext, type Observation } from '@empathia/integration-contracts';
import { MockDeviceInventory, MockDspReadback, MockItsm } from '@empathia/integration-mocks';
import type { RequestContext } from '../auth/context.js';
import { ApiError, notFound } from '../http/errors.js';

/** The adapters this build can run, by registry key. Everything else in the catalogue is CONTRACT_ONLY: no code to run. */
export const RUNNABLE: Record<string, () => Adapter> = {
  'mock-device-inventory': () => new MockDeviceInventory({ seed: 1, devices: 60 }),
  'mock-dsp-readback': () => new MockDspReadback({ seed: 2 }),
  'mock-itsm-readonly': () => new MockItsm({ seed: 3 }),
};
const buckets = new Map<string, TokenBucket>();
export const SYNC_INTERVAL_MS = 5 * 60_000;

export async function syncIntegration(ctx: RequestContext, key: string, opts: { adapter?: Adapter; sleep?: (ms: number) => Promise<void> } = {}) {
  await ctx.require(['adapter.allowlist', 'policy.configure'], 'run an integration sync', { type: 'Integration', id: key });
  const row = (await ctx.pool.query<{ key: string; state: string }>('SELECT key, state FROM app.integration WHERE key = $1', [key])).rows[0];
  if (!row) throw notFound(`integration ${key}`);
  const make = RUNNABLE[key];
  if (!opts.adapter && (!make || row.state !== 'MOCK')) throw new ApiError('not_configured', `${key} is ${row.state}: there is no adapter to run, and nothing is called`);
  const adapter = opts.adapter ?? make!();
  const d = adapter.descriptor;
  const bucket = buckets.get(`${ctx.p.tenantId}|${key}`) || buckets.set(`${ctx.p.tenantId}|${key}`, new TokenBucket(d.rateLimit.requestsPerMinute, d.rateLimit.burst)).get(`${ctx.p.tenantId}|${key}`)!;
  const actx: AdapterContext = { tenant: ctx.p.tenantSlug, credential: null, now: () => new Date(), correlationId: ctx.correlationId };
  const started = new Date();
  let retries = 0; let error: string | null = null; const got: Observation[] = [];
  try {
    const fetchAll = async (fn: (cursor: string | null) => Promise<{ items: Observation[]; next: string | null }>) => {
      let cursor: string | null = null;
      do {
        if (!bucket.take()) throw new AdapterError('rate_limited', `local rate limit for ${key} reached (${d.rateLimit.requestsPerMinute}/min)`);
        const p: { items: Observation[]; next: string | null } = await withRetry(() => fn(cursor), { sleep: opts.sleep, onRetry: () => { retries += 1; } });
        got.push(...p.items); cursor = p.next;
      } while (cursor);
    };
    if (adapter.discover) await fetchAll((c) => adapter.discover!(actx, c));
    else if (adapter.poll) {
      const since = (await ctx.tx((q) => q.query<{ last_success_at: string | null }>('SELECT last_success_at FROM app.integration_sync WHERE integration_key = $1', [key]))).rows[0]?.last_success_at ?? null;
      await fetchAll((c) => adapter.poll!(actx, since ? new Date(since).toISOString() : null, c));
    }
  } catch (e) { error = (e as Error).message; }

  return ctx.tx(async (q) => {
    const { kept, dropped } = dedupe(got);
    const assets = (await q.query<{ code: string; label: string; props: { serial?: string; mac?: string } }>('SELECT code, label, props FROM app.planned_asset WHERE removed_at IS NULL')).rows.map((a) => ({ id: a.code, label: a.label, serial: a.props?.serial ?? null, mac: a.props?.mac ?? null }));
    let matched = 0;
    for (const o of kept) {
      const m = matchCanonical(o, assets); if (m.canonicalId) matched += 1;
      await q.query(`INSERT INTO app.integration_observation (tenant_id, integration_key, kind, external_id, canonical_id, match_how, value, evidence, observed_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (tenant_id, integration_key, kind, external_id) DO UPDATE SET value = EXCLUDED.value, canonical_id = EXCLUDED.canonical_id, match_how = EXCLUDED.match_how, observed_at = EXCLUDED.observed_at, received_at = now()
        WHERE app.integration_observation.observed_at <= EXCLUDED.observed_at`,
        [ctx.p.tenantId, key, o.kind, o.externalId, m.canonicalId, m.how, o.value, o.evidence, o.observedAt]);
    }
    const prev = (await q.query<{ state: string; last_success_at: string | null }>('SELECT state, last_success_at FROM app.integration_sync WHERE integration_key = $1 FOR UPDATE', [key])).rows[0];
    const state = error ? (/credential|unauthorized/i.test(error) ? 'DOWN' : 'DEGRADED') : 'OK';
    await q.query(`INSERT INTO app.integration_sync (tenant_id, integration_key, state, last_attempt_at, last_success_at, last_error, observations, retries) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (tenant_id, integration_key) DO UPDATE SET state = EXCLUDED.state, last_attempt_at = EXCLUDED.last_attempt_at, last_success_at = coalesce(EXCLUDED.last_success_at, app.integration_sync.last_success_at), last_error = EXCLUDED.last_error, observations = EXCLUDED.observations, retries = EXCLUDED.retries`,
      [ctx.p.tenantId, key, state, started, error ? null : started, error, kept.length, retries]);
    if (!prev || prev.state !== state) await ctx.emit(q, 'integration.adapter_health_changed', { type: 'Integration', id: key, rev: 1 }, { adapter: key, state, from: prev?.state ?? null });
    const lastSuccess = error ? prev?.last_success_at ?? null : started.toISOString();
    if (error && isStale(lastSuccess ? new Date(lastSuccess).toISOString() : null, SYNC_INTERVAL_MS, new Date())) await ctx.emit(q, 'integration.connector_stale', { type: 'Integration', id: key, rev: 1 }, { connector: key, lastSuccess });
    await ctx.audit(q, 'integration.sync', error ? 'FAILED' : 'ALLOWED', { type: 'Integration', id: key }, { observations: kept.length, dropped, matched, retries, error });
    return { key, maturity: d.maturity, state, observations: kept.length, duplicatesDropped: dropped, matchedToCanonical: matched, retries, error, evidence: 'SYNTHETIC_MOCK', note: 'Mock data from a local adapter. Not a measurement of any real system, and not used as Assurance evidence.' };
  });
}

export async function observations(ctx: RequestContext, key: string, limit: number) {
  await ctx.require(['adapter.allowlist', 'policy.configure'], 'read integration observations', { type: 'Integration', id: key });
  return ctx.tx(async (q) => {
    const sync = (await q.query('SELECT state, last_attempt_at, last_success_at, last_error, observations, retries FROM app.integration_sync WHERE integration_key = $1', [key])).rows[0] || null;
    const items = (await q.query('SELECT kind, external_id, canonical_id, match_how, value, evidence, observed_at FROM app.integration_observation WHERE integration_key = $1 ORDER BY observed_at DESC, id DESC LIMIT $2', [key, Math.min(Math.max(limit || 50, 1), 500)])).rows;
    return { key, sync, items };
  });
}
