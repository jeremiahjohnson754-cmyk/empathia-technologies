/**
 * Executive passports (P6-C): the 27 KPI passports of @empathia/kpi-engine computed over this tenant's records, in the caller's
 * site scope. Every passport states numerator, denominator, window, coverage, freshness and confidence; a KPI whose source does not
 * exist in this starter (usage sessions, standards, SOP/SOW, device support ends, field scans, standardization profiles) is
 * NOT_MEASURABLE with the reason — never 0%. The page shows what the engine returns; nothing is computed in the browser.
 */
import { passports as compute, KPIS, type Records, type Passport } from '@empathia/kpi-engine';
import type { RequestContext } from '../auth/context.js';
import { invalid } from '../http/errors.js';

export async function passports(ctx: RequestContext, daysRaw?: string) {
  const days = daysRaw ? Number(daysRaw) : 90;
  if (![30, 90, 180, 365].includes(days)) throw invalid('days is one of 30, 90, 180, 365');
  return ctx.tx(async (q) => {
    const scope = ctx.p.siteScope; const args: unknown[] = scope?.length ? [scope] : [];
    const S = `(SELECT r.id FROM app.room r JOIN app.building b ON b.id = r.building_id${scope?.length ? ' WHERE b.site_id = ANY($1::uuid[])' : ''})`;
    const now = new Date().toISOString();
    const projects = (await q.query<{ code: string; governance: string; delivery: string | null; updated_at: string; request_code: string | null; funded_at: string | null }>(
      `SELECT p.code, p.governance, p.delivery, p.updated_at, rq.code AS request_code, (SELECT min(f.recorded_at) FROM app.project_funding f WHERE f.project_id = p.id AND f.kind = 'AUTHORIZED') AS funded_at
         FROM app.project p LEFT JOIN app.project_request rq ON rq.id = p.request_id`)).rows;
    const hist = (await q.query<{ aggregate_id: string; to: string; at: string }>(`SELECT aggregate_id, detail->>'to' AS "to", at FROM app.audit_event WHERE aggregate_type = 'Project' AND outcome = 'ALLOWED' AND detail ? 'to' ORDER BY at`)).rows;
    const decisions = (await q.query<{ code: string; decision: string; scope_rev: number; decided_at: string }>('SELECT p.code, d.decision, d.scope_rev, d.decided_at FROM app.project_decision d JOIN app.project p ON p.id = d.project_id')).rows;
    const funding = (await q.query<{ code: string; kind: 'AUTHORIZED' | 'WITHDRAWN'; amount: string; currency: string; recorded_at: string }>('SELECT p.code, f.kind, f.amount, f.currency, f.recorded_at FROM app.project_funding f JOIN app.project p ON p.id = f.project_id')).rows;
    const requests = (await q.query<{ code: string; project_code: string | null; submitted_at: string | null }>('SELECT rq.code, p.code AS project_code, rq.submitted_at FROM app.project_request rq LEFT JOIN app.project p ON p.request_id = rq.id')).rows;
    const wos = (await q.query<{ code: string; state: string; created_at: string; resolved_at: string | null; closed_at: string | null; work_type: string; room_code: string }>(
      `SELECT w.code, w.state, w.created_at, w.closed_at, w.work_type, r.code AS room_code, (SELECT min(e.at) FROM app.work_order_event e WHERE e.work_order_id = w.id AND e.kind = 'work_order.verify' AND e.detail->>'outcome' = 'pass') AS resolved_at
         FROM app.work_order w JOIN app.room_issue i ON i.id = w.issue_id JOIN app.room r ON r.id = i.room_id JOIN ${S} s ON s.id = r.id`, args)).rows;
    const issues = (await q.query<{ code: string; state: string; room_code: string; created_at: string; resolved_at: string | null; reopened: boolean }>(
      `SELECT i.code, i.state, r.code AS room_code, i.created_at, (SELECT min(e.at) FROM app.issue_event e WHERE e.issue_id = i.id AND e.kind = 'resolved') AS resolved_at, EXISTS (SELECT 1 FROM app.issue_event e WHERE e.issue_id = i.id AND e.kind = 'reopened') AS reopened
         FROM app.room_issue i JOIN app.room r ON r.id = i.room_id JOIN ${S} s ON s.id = r.id WHERE i.category = 'INSTALLATION_COMMISSIONING_DEFICIENCY'`, args)).rows;
    const rooms = (await q.query<{ code: string; lifecycle: string; devices: number; b_version: number | null; b_at: string | null; b_devices: number | null; b_verified: number | null; b_applicable: number | null; b_exceptions: number | null }>(
      `SELECT r.code, r.lifecycle, (SELECT count(*)::int FROM app.planned_asset a WHERE a.room_id = r.id AND a.removed_at IS NULL) AS devices,
              b.version AS b_version, b.published_at AS b_at, jsonb_array_length(b.devices) AS b_devices,
              (SELECT count(*)::int FROM jsonb_each_text(b.results) x WHERE x.value = 'PASS_VERIFIED') AS b_verified, (SELECT count(*)::int FROM jsonb_each_text(b.results)) AS b_applicable,
              (SELECT count(*)::int FROM app.baseline_exception x WHERE x.baseline_id = b.id) AS b_exceptions
         FROM app.room r JOIN ${S} s ON s.id = r.id LEFT JOIN app.assurance_baseline b ON b.room_id = r.id AND b.state = 'CURRENT'`, args)).rows;
    const R: Records = {
      now,
      projects: projects.map((p) => ({ id: p.code, governance: p.governance, delivery: p.delivery, updatedAt: p.updated_at, fundedAt: p.funded_at, requestId: p.request_code, history: hist.filter((h) => h.aggregate_id === p.code).map((h) => ({ to: h.to, at: h.at })) })),
      decisions: decisions.map((d) => ({ projectId: d.code, decision: d.decision, scopeRev: d.scope_rev, at: d.decided_at })),
      funding: funding.map((f) => ({ projectId: f.code, kind: f.kind, amount: Number(f.amount), currency: f.currency, at: f.recorded_at })),
      workOrders: wos.map((w) => ({ id: w.code, state: w.state, openedAt: w.created_at, resolvedAt: w.resolved_at, closedAt: w.closed_at, kind: w.work_type, roomId: w.room_code })),
      incidents: issues.map((i) => ({ id: i.code, state: i.state, roomId: i.room_code, openedAt: i.created_at, restoredAt: i.resolved_at, recurrenceOf: null, reopened: i.reopened })),
      requests: requests.map((r) => ({ id: r.code, projectId: r.project_code, submittedAt: r.submitted_at })),
      rooms: rooms.map((r) => ({ id: r.code, requiresCommissioning: r.lifecycle !== 'PLANNED', devices: r.devices, baseline: r.b_version ? { version: r.b_version, publishedAt: r.b_at!, devicesBound: r.b_devices || 0, verifiedTests: r.b_verified || 0, applicableTests: r.b_applicable || 0, exceptions: r.b_exceptions || 0 } : null, instrumented: false, eligibleForUsage: r.lifecycle === 'OPERATIONAL' })),
      documents: [], standards: [], sops: [], sows: [], devices: [], sessions: [], profiles: [], fieldScans: [], consentedParticipation: false,
    };
    const out: Passport[] = compute(R, days);
    const sources = { projects: projects.length, decisions: decisions.length, funding: funding.length, requests: requests.length, workOrders: wos.length, deficiencies: issues.length, rooms: rooms.length, baselines: rooms.filter((r) => r.b_version).length,
      absent: ['documents', 'standards', 'sops', 'sows', 'device support ends', 'usage sessions', 'standardization profiles', 'field scans', 'consented participation'] };
    return { now, days, version: out[0]?.version || null, measured: out.filter((p) => p.state === 'MEASURED').length, total: KPIS.length, passports: out, sources, note: 'Figures are computed from this organization’s records in your site scope. A passport whose source does not exist in this starter is NOT_MEASURABLE, never 0%. Operational performance stays NOT_MONITORED.' };
  });
}
