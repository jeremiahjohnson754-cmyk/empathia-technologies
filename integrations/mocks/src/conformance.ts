/**
 * The adapter conformance suite: what every adapter (mock or verified) must satisfy before it is registered. Returns the failures.
 * A verified adapter runs this against its sandbox before its maturity may change to VERIFIED.
 */
import type { Adapter, AdapterContext, Observation, Page } from '@empathia/integration-contracts';

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
export async function conformance(a: Adapter, ctx: AdapterContext): Promise<string[]> {
  const f: string[] = []; const d = a.descriptor;
  if (!/^[a-z0-9-]{3,64}$/.test(d.key)) f.push('key must be a lowercase registry id');
  if (!['MOCK', 'CONTRACT_ONLY', 'NOT_CONFIGURED', 'VERIFIED'].includes(d.maturity)) f.push('maturity must be one of the four states');
  if (d.mode === 'READ_ONLY' && (a.control || d.capabilities.CONTROL === 'SUPPORTED')) f.push('a READ_ONLY adapter must not implement CONTROL');
  if (d.maturity !== 'VERIFIED' && d.mode === 'READ_WRITE') f.push('only a VERIFIED adapter may be READ_WRITE');
  if (d.rateLimit.requestsPerMinute <= 0 || d.rateLimit.burst <= 0) f.push('a rate limit is required');
  const h = await a.health(ctx);
  if (h.maturity !== d.maturity) f.push('health must report the adapter’s maturity');
  if (!ISO.test(h.checkedAt)) f.push('health.checkedAt must be ISO-8601 UTC');
  const check = (o: Observation, where: string) => {
    if (o.source !== d.key) f.push(`${where}: source must be the adapter key`);
    if (o.sourceMaturity !== d.maturity) f.push(`${where}: sourceMaturity must be the adapter maturity`);
    if (d.maturity === 'MOCK' && o.evidence !== 'SYNTHETIC_MOCK') f.push(`${where}: a MOCK adapter must label its evidence SYNTHETIC_MOCK`);
    if (!o.externalId) f.push(`${where}: externalId is required`);
    if (!ISO.test(o.observedAt)) f.push(`${where}: observedAt must be ISO-8601 UTC`);
    if (!o.value || typeof o.value !== 'object') f.push(`${where}: value must be an object`);
  };
  for (const [name, fn] of [['discover', a.discover?.bind(a)], ['poll', a.poll ? (c: AdapterContext, cur: string | null) => a.poll!(c, null, cur) : undefined]] as const) {
    if (!fn) continue;
    let cursor: string | null = null; let pages = 0; const seen = new Set<string>();
    do {
      const p: Page<Observation> = await fn(ctx, cursor); pages += 1;
      p.items.forEach((o, i) => { check(o, `${name}[${pages}:${i}]`); if (seen.has(`${o.kind}|${o.externalId}`)) f.push(`${name}: duplicate ${o.externalId} across pages`); seen.add(`${o.kind}|${o.externalId}`); });
      cursor = p.next;
      if (pages > 1000) { f.push(`${name}: pagination does not terminate`); break; }
    } while (cursor);
  }
  return f;
}
