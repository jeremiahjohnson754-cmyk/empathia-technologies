/**
 * Analytics engine (starter): KPI calculations over the canonical tables, inside the caller's tenant and site scope.
 *
 * Mechanism: SQL aggregation (deterministic). No sampling, no estimation, no model. Every figure states its denominator, and a figure
 * with no data is null rather than 0 so that "nothing measured" is not reported as "zero problems".
 * Live operational performance is NOT_MONITORED: the starter has no monitoring feed, so no uptime or health KPI is computed.
 */
import type { RequestContext } from '../auth/context.js';
import { findRoom, load, reverificationNow } from './rooms.js';

const ratio = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 1000 : null);

export async function summary(ctx: RequestContext) {
  return ctx.tx(async (q) => {
    const scope = ctx.p.siteScope;
    const args: unknown[] = scope?.length ? [scope] : [];
    // the rooms the caller may see; every other figure joins through this set (row-level security already limits it to the tenant)
    const S = `(SELECT r.id FROM app.room r JOIN app.building b ON b.id = r.building_id${scope?.length ? ' WHERE b.site_id = ANY($1::uuid[])' : ''})`;

    const lifecycle = Object.fromEntries((await q.query<{ lifecycle: string; n: number }>(`SELECT r.lifecycle, count(*)::int AS n FROM app.room r JOIN ${S} s ON s.id = r.id GROUP BY 1 ORDER BY 1`, args)).rows.map((r) => [r.lifecycle, r.n]));
    const rooms = Object.values(lifecycle).reduce((a, b) => a + b, 0);

    // results: the latest compiled plan of each room, and the current result of each applicable test
    const res = (await q.query<{ label: string; n: number }>(`
      WITH latest AS (SELECT DISTINCT ON (p.room_id) p.id, p.room_id FROM app.cx_plan p JOIN ${S} s ON s.id = p.room_id ORDER BY p.room_id, p.compiled_at DESC, p.id DESC)
      SELECT coalesce(cr.result_label, 'NOT_TESTED') AS label, count(*)::int AS n
        FROM latest l JOIN app.cx_plan_row pr ON pr.plan_id = l.id AND pr.applicable
        LEFT JOIN app.current_result cr ON cr.room_id = l.room_id AND cr.test_id = pr.test_id
       GROUP BY 1`, args)).rows;
    const labels: Record<string, number> = Object.fromEntries(res.map((r) => [r.label, r.n]));
    const applicable = res.reduce((a, r) => a + r.n, 0);
    const recorded = applicable - (labels['NOT_TESTED'] || 0);
    const passed = (labels['PASS_VERIFIED'] || 0) + (labels['PASS_UNVERIFIED'] || 0);

    // a current PASS_VERIFIED recorded on a unit that has since been replaced or substituted is still its label, but it no longer counts
    // (ADR-0012): the summary says how many, so no stale verification is presented as the room's state
    let superseded = 0; let supersededVerified = 0;
    for (const r of (await q.query<{ id: string }>(`SELECT r.id FROM app.room r JOIN ${S} s ON s.id = r.id WHERE r.lifecycle = 'COMMISSIONING' ORDER BY r.code`, args)).rows) {
      const rv = await reverificationNow(q, await findRoom(ctx, q, r.id), await load(ctx, q, r.id));
      superseded += rv.reverification.filter((t) => t.rerun).length; supersededVerified += rv.reverification.filter((t) => t.rerun && t.result === 'PASS_VERIFIED').length;
    }
    const issues = (await q.query<{ category: string; severity: string; state: string; n: number }>(`SELECT i.category, i.severity, i.state, count(*)::int AS n FROM app.room_issue i JOIN ${S} s ON s.id = i.room_id GROUP BY 1, 2, 3 ORDER BY 1, 2, 3`, args)).rows;
    const open = issues.filter((i) => i.state === 'OPEN');
    const resolved = (await q.query<{ n: number; hours: number | null }>(`
      SELECT count(*)::int AS n, avg(extract(epoch FROM (e.at - i.created_at)) / 3600)::float AS hours
        FROM app.room_issue i JOIN ${S} s ON s.id = i.room_id
        JOIN LATERAL (SELECT min(ev.at) AS at FROM app.issue_event ev WHERE ev.issue_id = i.id AND ev.kind = 'resolved') e ON e.at IS NOT NULL
       WHERE i.category = 'INSTALLATION_COMMISSIONING_DEFICIENCY'`, args)).rows[0]!;

    const wo = (await q.query<{ state: string; n: number }>(`SELECT w.state, count(*)::int AS n FROM app.work_order w JOIN app.room_issue i ON i.id = w.issue_id JOIN ${S} s ON s.id = i.room_id GROUP BY 1`, args)).rows;
    const assets = (await q.query<{ n: number; generic: number; models: number }>(`SELECT count(*)::int AS n, count(*) FILTER (WHERE a.generic)::int AS generic, count(DISTINCT a.model)::int AS models FROM app.planned_asset a JOIN ${S} s ON s.id = a.room_id WHERE a.removed_at IS NULL AND NOT a.furniture`, args)).rows[0]!;
    // ADR-0012: positions, the units installed at them, and what is known of each unit's identity
    const inst = (await q.query<{ positions: number; installed: number; unknown: number; declared: number; observed: number; verified: number; migrated: number; replaced: number }>(`
      SELECT count(DISTINCT a.id)::int AS positions, count(i.id)::int AS installed,
             count(*) FILTER (WHERE pa.identity_state = 'UNKNOWN')::int AS unknown, count(*) FILTER (WHERE pa.identity_state = 'DECLARED')::int AS declared,
             count(*) FILTER (WHERE pa.identity_state = 'OBSERVED')::int AS observed, count(*) FILTER (WHERE pa.identity_state = 'VERIFIED')::int AS verified,
             count(*) FILTER (WHERE i.effective_basis = 'KNOWN_AS_OF_MIGRATION')::int AS migrated,
             (SELECT count(*)::int FROM app.asset_installation x JOIN app.planned_asset y ON y.id = x.position_id JOIN ${S} s2 ON s2.id = y.room_id WHERE x.removal_reason IN ('REPLACED', 'SUBSTITUTED')) AS replaced
        FROM app.planned_asset a JOIN ${S} s ON s.id = a.room_id
        LEFT JOIN app.asset_installation i ON i.position_id = a.id AND i.removed_at IS NULL LEFT JOIN app.physical_asset pa ON pa.id = i.asset_id
       WHERE a.removed_at IS NULL AND NOT a.furniture`, args)).rows[0]!;
    const ev = (await q.query<{ n: number; bytes: string | null }>(`SELECT count(*)::int AS n, sum(e.bytes)::text AS bytes FROM app.evidence_object e WHERE e.id IN (SELECT tr.evidence_id FROM app.test_result tr JOIN ${S} s ON s.id = tr.room_id)`, args)).rows[0]!;

    return {
      scope: scope?.length ? 'site-scoped' : 'tenant',
      rooms: { total: rooms, byLifecycle: lifecycle },
      commissioning: {
        applicableTests: applicable,
        byLabel: labels,
        coverage: { value: ratio(recorded, applicable), definition: 'tests with any recorded result ÷ applicable tests (latest plan of each room)' },
        verifiedShare: { value: ratio(labels['PASS_VERIFIED'] || 0, passed), definition: 'PASS_VERIFIED ÷ all recorded passes (PASS_VERIFIED + PASS_UNVERIFIED)' },
        firstTimeFailRate: { value: ratio(labels['FAIL'] || 0, recorded), definition: 'current FAIL results ÷ recorded results' },
        superseded: { results: superseded, passVerifiedNotCounting: supersededVerified, verifiedCountingTowardsAcceptance: (labels['PASS_VERIFIED'] || 0) - supersededVerified, definition: 'current results recorded on a unit that has since been replaced or substituted (rooms being commissioned): their label is kept as recorded (byLabel), but they never count towards an acceptance and must be re-run' },
      },
      issues: {
        open: open.reduce((a, i) => a + i.n, 0),
        openHighOrCritical: open.filter((i) => ['High', 'Critical'].includes(i.severity)).reduce((a, i) => a + i.n, 0),
        byCategorySeverityState: issues,
        deficienciesResolved: resolved.n,
        meanHoursToResolveDeficiency: resolved.n ? Math.round((resolved.hours || 0) * 10) / 10 : null,
      },
      workOrders: Object.fromEntries(wo.map((w) => [w.state, w.n])),
      assets: { planned: assets.n, genericModels: assets.generic, distinctModels: assets.models, genericShare: { value: ratio(assets.generic, assets.n), definition: 'planned devices still on a generic model ÷ planned devices' },
      installations: { positions: inst.positions, installed: inst.installed, byIdentity: { UNKNOWN: inst.unknown, DECLARED: inst.declared, OBSERVED: inst.observed, VERIFIED: inst.verified }, knownAsOfMigration: inst.migrated, unitsTakenOut: inst.replaced,
        identityKnownShare: { value: ratio(inst.declared + inst.observed + inst.verified, inst.installed), definition: 'installed units with a recorded identity (DECLARED, OBSERVED or VERIFIED) ÷ installed units; UNKNOWN is never counted as known' } } },
      evidence: { objects: ev.n, bytes: Number(ev.bytes || 0) },
      operationalPerformance: 'NOT_MONITORED',
      note: 'Computed from synthetic starter data. Not a statement about any real estate or customer.',
    };
  });
}
