/**
 * Lifecycle gates for a planned room: which authority a transition needs and which conditions block it.
 * Ported from `v25RoomLifecycle` (src/v25-60-room.js). Pure: the caller (enterprise API) checks the authority server-side,
 * applies the transition in a transaction and writes the audit event.
 */
import { ROOM_LIFECYCLE, type ApplicabilityRow, type RecordedResult, type RoomLifecycle } from '@empathia/domain-types';
import { resultCounts, resultWords } from './results.js';
import { reverificationBlockers, type ChangeKind, type ReverificationState } from './substitution.js';

/** The authority each target state requires (the demonstrator's policy names). */
export const LIFECYCLE_AUTHORITY: Record<RoomLifecycle, string> = {
  PLANNED: 'room.design.approve',
  DESIGN_APPROVED: 'room.design.approve',
  INSTALLATION_PENDING: 'window.approve',
  INSTALLED_UNVERIFIED: 'work.evidence',
  COMMISSIONING: 'plan.compile',
  ACCEPTED: 'customer.accept',
  OPERATIONAL: 'handoff.accept',
};

export interface LifecycleFacts {
  from: RoomLifecycle | string;
  to: RoomLifecycle;
  classificationApproved: boolean;
  openIssues: Array<{ severity: string }>;
  savedRevisions: number;
  rows: ApplicabilityRow[];
  results: Record<string, RecordedResult> | undefined;
  hasBaseline: boolean;
  /** Live monitoring evidence on the installed room. The synthetic demonstrator and the starter never have it. */
  hasLiveMonitoringEvidence: boolean;
  /**
   * The tests a change of unit at a position reopened (a model substitution or a like-for-like replacement, ADR-0012), and the kinds
   * of change behind them. A reopened test whose current result predates the change (`rerun`) is SUPERSEDED: whatever its label — even
   * PASS_VERIFIED — it never counts towards an acceptance. Omitted = no change of unit.
   */
  reverification?: readonly ReverificationState[];
  changeKinds?: readonly ChangeKind[];
}

/** Returns the reasons a transition is refused; an empty list means the transition is allowed (authority still to be checked). */
export function lifecycleBlockers(f: LifecycleFacts): string[] {
  const i = ROOM_LIFECYCLE.indexOf(f.from as RoomLifecycle);
  const j = ROOM_LIFECYCLE.indexOf(f.to);
  // two governed backward steps: a design is sent back to PLANNED, and an accepted room is RECOMMISSIONED (ADR-0003: the current baseline
  // stays current until the re-acceptance publishes the next version; every other result stays bound to the version it was accepted in)
  const backward = (f.to === 'PLANNED' && f.from === 'DESIGN_APPROVED') || (f.to === 'COMMISSIONING' && f.from === 'ACCEPTED');
  if (j !== i + 1 && !backward) return [`no transition ${f.from} → ${f.to}: the room moves one governed step at a time`];
  const why: string[] = [];
  if (f.to === 'DESIGN_APPROVED') {
    if (!f.classificationApproved) why.push('the room classification is not approved by an engineer');
    const hi = f.openIssues.filter((x) => x.severity === 'High' || x.severity === 'Critical').length;
    if (hi) why.push(`${hi} open High/Critical design deficiencies`);
    if (!f.savedRevisions) why.push('no saved revision');
  }
  if (f.to === 'ACCEPTED') {
    const app = f.rows.filter((r) => r.applicable);
    const appIds = new Set(app.map((r) => r.id));
    // superseded results never count: a result recorded on the previous unit is taken out of the counts, whatever its label
    const rv = (f.reverification || []).filter((t) => appIds.has(t.testId));
    const superseded = new Set(rv.filter((t) => t.rerun).map((t) => t.testId));
    const counted = app.filter((r) => !superseded.has(r.id));
    const gap = counted.some((r) => r.result !== 'PASS_VERIFIED');
    const C = resultCounts(counted, f.results);
    if (!app.length || gap) {
      why.push(`acceptance needs every applicable test executed, passed and independently verified with evidence: ${C.verified} of ${app.length} passed and independently verified (${C.recorded} recorded: ${resultWords(C).replace(/^\d+ passed and independently verified, /, '')}; ${C.notTested} not tested${superseded.size ? `; ${superseded.size} recorded before a change of device and no longer counted` : ''})`);
    }
    // the tests a change of unit reopened (one wording with the demonstration); when they are the only gap, the count goes with them
    const rb = reverificationBlockers(rv, f.changeKinds);
    if (rb.length && superseded.size && !gap) rb[0] = `${rb[0]} — acceptance counts ${C.verified} of ${app.length} applicable tests as passed and independently verified; the ${superseded.size} earlier result(s) no longer count`;
    if (f.openIssues.length) why.push(`${f.openIssues.length} open issue(s): every deficiency is closed with its retest before acceptance`);
    why.push(...rb);
  }
  if (f.to === 'OPERATIONAL') {
    if (!f.hasBaseline) why.push('no accepted, signed baseline');
    if (!f.hasLiveMonitoringEvidence) why.push('operational status needs live monitoring evidence on the installed room; without it the room stays ACCEPTED');
  }
  return why;
}
