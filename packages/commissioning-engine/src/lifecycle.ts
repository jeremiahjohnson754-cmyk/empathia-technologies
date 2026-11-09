/**
 * Lifecycle gates for a planned room: which authority a transition needs and which conditions block it.
 * Ported from `v25RoomLifecycle` (src/v25-60-room.js). Pure: the caller (enterprise API) checks the authority server-side,
 * applies the transition in a transaction and writes the audit event.
 */
import { ROOM_LIFECYCLE, type ApplicabilityRow, type RecordedResult, type RoomLifecycle } from '@empathia/domain-types';
import { resultCounts, resultWords } from './results.js';
import { reverificationBlockers, type ChangeKind, type ReverificationState } from './substitution.js';
import { designBindingSentence, type DesignBinding, type RevisionBinding } from './binding.js';

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
  /**
   * The design binding of a re-acceptance (binding.ts): whether the approved revision still describes the room, and the substitutions made
   * while it is recommissioned. Given only while an accepted room is recommissioned; omitted or null = nothing to bind again.
   */
  designBinding?: DesignBinding | null;
}

/**
 * The order of the reasons an acceptance is refused for — one order for the API and the demonstration: the order in which the work has to
 * be done, and by whom (ADR-0012 §5).
 *   1. design-binding  — approve the revision the re-acceptance binds (room.design.approve, not its author): what is accepted is the
 *                        approved design, and the plan the results are recorded against follows from it;
 *   2. open-issues     — every deficiency closed with its retest (the service or design fix may itself change what has to be re-run);
 *   3. reopened-tests  — the tests a change of unit reopened, re-run on the final unit and verified independently (with the count when they
 *                        are the only gap);
 *   4. acceptance-count — the general count of applicable tests not yet passed and independently verified, when other results are missing.
 */
export const ACCEPTANCE_BLOCKER_ORDER = ['design-binding', 'open-issues', 'reopened-tests', 'acceptance-count'] as const;

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
    // in ACCEPTANCE_BLOCKER_ORDER: 1 · the design the re-acceptance binds
    const bound = f.designBinding ? designBindingSentence(f.designBinding) : null;
    if (bound) why.push(bound);
    // 2 · open issues
    if (f.openIssues.length) why.push(`${f.openIssues.length} open issue(s): every deficiency is closed with its retest before acceptance`);
    // 3 · the tests a change of unit reopened (one wording with the demonstration); when they are the only gap, the count goes with them
    const rb = reverificationBlockers(rv, f.changeKinds);
    if (rb.length && superseded.size && !gap) rb[0] = `${rb[0]} — acceptance counts ${C.verified} of ${app.length} applicable tests as passed and independently verified; the ${superseded.size} earlier result(s) no longer count`;
    why.push(...rb);
    // 4 · the general count, when other results are missing
    if (!app.length || gap) {
      why.push(`acceptance needs every applicable test executed, passed and independently verified with evidence: ${C.verified} of ${app.length} passed and independently verified (${C.recorded} recorded: ${resultWords(C).replace(/^\d+ passed and independently verified, /, '')}; ${C.notTested} not tested${superseded.size ? `; ${superseded.size} recorded before a change of device and no longer counted` : ''})`);
    }
  }
  if (f.to === 'OPERATIONAL') {
    if (!f.hasBaseline) why.push('no accepted, signed baseline');
    if (!f.hasLiveMonitoringEvidence) why.push('operational status needs live monitoring evidence on the installed room; without it the room stays ACCEPTED');
  }
  return why;
}

/**
 * Why a saved revision may not be approved while an accepted room is recommissioned (the API's POST /v1/rooms/{room}/revisions/{rev}/approve
 * and Build a Room's "Approve revision" say the same): only while recommissioning (`binding` null otherwise); only the latest saved revision,
 * newer than the approved one, and only if it describes the current design; then the DESIGN_APPROVED rules (an approved, current
 * classification and no open High/Critical design deficiency). Authority (room.design.approve) and separation of duties (never the
 * revision's author) are the callers' checks, worded by `needsAuthority` / `notByItsAuthor`.
 */
export function revisionApprovalBlockers(f: { room: string; lifecycle: string; revision: number; binding: RevisionBinding | null; classificationApproved: boolean; openIssues: Array<{ severity: string }> }): string[] {
  if (!f.binding) return [`a revision is approved here only while an accepted room is recommissioned (${f.room} is ${f.lifecycle}); a design is otherwise approved by the DESIGN_APPROVED step`];
  const b = f.binding; const why: string[] = [];
  if (b.approvedRevision != null && f.revision <= b.approvedRevision) why.push(`revision ${f.revision} is not newer than the approved revision ${b.approvedRevision}`);
  else if (f.revision !== b.latestRevision) why.push(`revision ${f.revision} is not the latest saved revision (${b.latestRevision})`);
  else if (!b.latestDescribesDesign) why.push(`revision ${f.revision} does not describe the current design: save the latest change as a revision first`);
  why.push(...lifecycleBlockers({ from: 'PLANNED', to: 'DESIGN_APPROVED', classificationApproved: f.classificationApproved, openIssues: f.openIssues, savedRevisions: 1, rows: [], results: {}, hasBaseline: true, hasLiveMonitoringEvidence: false }));
  return why;
}
