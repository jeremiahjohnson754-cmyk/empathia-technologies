/**
 * One room's record across the products, read from the durable records (founder, 16 Nov 2026: "a full enterprise-grade digital thread
 * still needs durable records, relationship integrity, audit history, and reliable cross-session persistence").
 *
 * Nothing is stored for the thread itself: it is assembled, in one transaction, from the rows the products write.
 *   Lite            app.room, app.planned_asset
 *   Engineering     app.room_revision, app.connection, the device register (asset_installation, asset_register_entry)
 *   Commissioning   the room's readiness (plan, results, verification) and app.room_issue with its deficiency workflow
 *   ServiceHands    app.work_order, each bound to its issue by a NOT NULL foreign key, with its evidence and verification
 *   Assurance       app.assurance_baseline (versioned, immutable) and what still holds acceptance
 *   APEX            app.apex_case, each bound to its issue and room
 * The relationships are the database's own foreign keys within one tenant (row-level security is forced on every table), so a thread
 * can only ever join one tenant's rows. `links` lists the keys that tie one stage to the next. `audit` summarises the hash-chained
 * audit trail of every aggregate in the thread (allowed and refused), so the history of the thread is the audit trail, not a copy.
 * Closing a work order never resolves its issue: an issue is resolved by its verified retest or by the system's own design check.
 */
import type { RequestContext } from '../auth/context.js';
import { findRoom, readiness } from './rooms.js';
import { registerItems } from './installations.js';
import { fieldStats } from './fieldRecord.js';

const DONE = ['RESOLVED', 'CLOSED'];
export async function roomThread(ctx: RequestContext, ref: string) {
  const rd = await readiness(ctx, ref) as { next: { to: string; blockers: string[] } | null; completion: unknown; counts?: Record<string, number>; register: { devices: number; complete: number } };
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref);
    const one = async <T,>(sql: string, args: unknown[]) => (await q.query<T>(sql, args)).rows;
    const assets = (await one<{ n: number; furniture: number }>('SELECT count(*) FILTER (WHERE NOT furniture)::int AS n, count(*) FILTER (WHERE furniture)::int AS furniture FROM app.planned_asset WHERE room_id = $1 AND removed_at IS NULL', [room.id]))[0]!;
    const conns = (await one<{ n: number }>('SELECT count(*)::int AS n FROM app.connection WHERE room_id = $1 AND removed_at IS NULL', [room.id]))[0]!.n;
    const revs = await one<{ rev_no: number; sha256: string; created_at: string }>('SELECT rev_no, sha256, created_at FROM app.room_revision WHERE room_id = $1 ORDER BY rev_no', [room.id]);
    const reg = await registerItems(q, room.id);
    const field = await fieldStats(q, room.id);
    const allIssues = await one<{ id: string; code: string; title: string; severity: string; category: string; check_name: string; state: string; workflow: string; retest: { result: string; evidence: string; by: string; at: string } | null; fixed_by: string | null; closed_by: string | null; resolution: Record<string, unknown> | null; created_at: string }>(
      'SELECT id, code, title, severity, category, check_name, state, workflow, retest, fixed_by, closed_by, resolution, created_at FROM app.room_issue WHERE room_id = $1 ORDER BY created_at, code', [room.id]);
    const wos = await one<{ code: string; issue: string; state: string; severity: string | null; work_type: string; assigned: boolean; evidence: Array<{ kind: string; ref?: string | null; at: string }>; verification: { outcome: string; at: string } | null; created_at: string; closed_at: string | null; reopen_count: number }>(
      'SELECT w.code, i.code AS issue, w.state, w.severity, w.work_type, (w.assigned_to IS NOT NULL) AS assigned, w.evidence, w.verification, w.created_at, w.closed_at, w.reopen_count FROM app.work_order w JOIN app.room_issue i ON i.id = w.issue_id AND i.tenant_id = w.tenant_id WHERE i.room_id = $1 ORDER BY w.created_at, w.code', [room.id]);
    const cases = await one<{ code: string; issue: string; symptom_key: string; hypotheses: Array<{ text: string; confidence: string; caveat: string }>; actions: unknown[]; review: { verdict?: string } | null; opened_at: string }>(
      'SELECT c.code, i.code AS issue, c.symptom_key, c.hypotheses, c.actions, c.review, c.opened_at FROM app.apex_case c JOIN app.room_issue i ON i.id = c.issue_id AND i.tenant_id = c.tenant_id WHERE c.room_id = $1 ORDER BY c.opened_at, c.code', [room.id]);
    const baselines = await one<{ version: number; state: string; design_revision: number; design_sha256: string; published_at: string; evidence: number }>(
      'SELECT version, state, design_revision, design_sha256, published_at, COALESCE(array_length(evidence_ids, 1), 0)::int AS evidence FROM app.assurance_baseline WHERE room_id = $1 ORDER BY version', [room.id]);
    // 0039: an operational incident is an issue of a room in service. It is listed with ServiceHands, not among commissioning's
    // deficiencies; everything else here that reads "issues" means the deficiencies.
    const issues = allIssues.filter((i) => i.category !== 'OPERATIONAL_INCIDENT'); const incidents = allIssues.filter((i) => i.category === 'OPERATIONAL_INCIDENT');
    const ids = [room.code, ...allIssues.map((i) => i.code), ...wos.map((w) => w.code), ...cases.map((c) => c.code)];
    const audit = await one<{ aggregate_type: string; outcome: string; n: number; first_seq: string; last_seq: string }>(
      'SELECT aggregate_type, outcome, count(*)::int AS n, min(seq)::text AS first_seq, max(seq)::text AS last_seq FROM app.audit_event WHERE aggregate_id = ANY($1::text[]) GROUP BY 1, 2 ORDER BY 1, 2', [ids]);
    const lastAudit = await one<{ at: string; action: string; outcome: string; actor_role: string | null; aggregate_type: string; aggregate_id: string; seq: string }>(
      'SELECT at, action, outcome, actor_role, aggregate_type, aggregate_id, seq::text AS seq FROM app.audit_event WHERE aggregate_id = ANY($1::text[]) ORDER BY at DESC, id DESC LIMIT 12', [ids]);

    const open = issues.filter((i) => i.state === 'OPEN'); const current = baselines.find((b) => b.state === 'CURRENT') || null;
    const closedByRetest = issues.filter((i) => i.state === 'RESOLVED' && i.workflow === 'CLOSED' && i.retest?.result === 'PASS');
    const links: Array<{ from: string; to: string; what: string; keys: Record<string, string | number> }> = [
      { from: 'lite', to: 'engineering', what: 'the room and its device positions', keys: { room: room.code, revision: room.rev } },
      { from: 'engineering', to: 'commissioning', what: 'the design revision the plan was compiled from', keys: { room: room.code, revision: room.rev } },
      ...wos.map((w) => ({ from: 'commissioning', to: 'service', what: 'the deficiency handed to service (work_order.issue_id)', keys: { issue: w.issue, workOrder: w.code } })),
      ...closedByRetest.map((i) => ({ from: 'service', to: 'assurance', what: 'the verified retest that closed the deficiency', keys: { issue: i.code, evidence: i.retest!.evidence } })),
      ...(current ? [{ from: 'commissioning', to: 'assurance', what: 'the baseline published by the acceptance', keys: { baseline: current.version, revision: current.design_revision } }] : []),
      ...cases.map((c) => ({ from: 'service', to: 'apex', what: 'the issue the case was opened on (apex_case.issue_id)', keys: { issue: c.issue, case: c.code } })),
    ];
    const missing: string[] = [];
    if (!issues.length) missing.push('no deficiency on this room’s record');
    if (!wos.length) missing.push('no deficiency has been handed to service');
    else if (!wos.some((w) => DONE.includes(w.state))) missing.push(`${wos[0]!.code} is not resolved yet`);
    if (wos.length && !closedByRetest.length) missing.push('no deficiency has been closed by a verified retest');
    if (!current) missing.push('no accepted baseline');
    if (!cases.length) missing.push('no APEX case on the room');
    return {
      room: { code: room.code, name: room.name, lifecycle: room.lifecycle, revision: room.rev, approvedRevision: room.approved_revision },
      stages: [
        { key: 'lite', product: 'Lite', records: { room: room.code, positions: assets.n, furniture: assets.furniture, template: room.template,
          // Phase 1 installation documentation (0034): what the installation team recorded beside the design — mounting, hookups, field moves, notes
          fieldRecord: field } },
        { key: 'engineering', product: 'Engineering', records: { revisions: revs.map((r) => ({ revision: r.rev_no, sha256: r.sha256, at: r.created_at })), classification: room.approved_class, connections: { count: conns, basis: 'PROPOSED: designed, not traced' }, register: { devices: reg.length, complete: reg.filter((x) => x.complete).length } } },
        { key: 'commissioning', product: 'Commissioning', records: { lifecycle: room.lifecycle, completion: rd.completion, next: rd.next,
          issues: issues.map((i) => ({ code: i.code, title: i.title, severity: i.severity, category: i.category, check: i.check_name, state: i.state, workflow: i.workflow, retest: i.retest, fixedBy: i.fixed_by, closedBy: i.closed_by, workOrders: wos.filter((w) => w.issue === i.code).map((w) => w.code), cases: cases.filter((c) => c.issue === i.code).map((c) => c.code) })) } },
        { key: 'service', product: 'ServiceHands', records: { incidents: incidents.map((i) => ({ code: i.code, title: i.title, severity: i.severity, kind: i.check_name, state: i.state, workflow: i.workflow, workOrders: wos.filter((w) => w.issue === i.code).map((w) => w.code) })), workOrders: wos.map((w) => ({ code: w.code, issue: w.issue, state: w.state, severity: w.severity, workType: w.work_type, assigned: w.assigned, evidence: w.evidence.length, verification: w.verification ? { outcome: w.verification.outcome, at: w.verification.at } : null, openedAt: w.created_at, closedAt: w.closed_at, reopened: w.reopen_count })),
          rule: 'closing a work order never resolves its issue: the verified retest does' } },
        { key: 'assurance', product: 'Assurance', records: { baselines: baselines.map((b) => ({ version: b.version, state: b.state, designRevision: b.design_revision, designSha256: b.design_sha256, publishedAt: b.published_at, evidence: b.evidence })), current: current ? current.version : null, openIssues: open.map((i) => i.code), closedByRetest: closedByRetest.map((i) => ({ issue: i.code, evidence: i.retest!.evidence, retestBy: i.retest!.by, closedBy: i.closed_by })) } },
        { key: 'apex', product: 'APEX', records: { cases: cases.map((c) => ({ code: c.code, issue: c.issue, symptom: c.symptom_key, hypotheses: c.hypotheses.length, leading: c.hypotheses[0] ? { text: c.hypotheses[0].text, confidence: c.hypotheses[0].confidence, caveat: c.hypotheses[0].caveat } : null, actions: c.actions.length, review: c.review?.verdict ?? null, openedAt: c.opened_at })),
          rule: 'hypotheses with what is against them; never a verified fault' } },
      ],
      links,
      audit: { basis: 'the hash-chained audit trail of the room, its issues, work orders and cases (allowed and refused)', aggregates: ids.length, byAggregate: audit.map((a) => ({ type: a.aggregate_type, outcome: a.outcome, events: a.n, firstSeq: a.first_seq, lastSeq: a.last_seq })), latest: lastAudit },
      complete: !missing.length, missing,
      integrity: 'work_order.issue_id and apex_case.issue_id are NOT NULL foreign keys within the tenant; every table forces row-level security; baselines are immutable versions',
    };
  });
}
