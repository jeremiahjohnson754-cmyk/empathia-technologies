/**
 * Lifecycle gates for a planned room: which authority a transition needs and which conditions block it.
 * Ported from `v25RoomLifecycle` (src/v25-60-room.js). Pure: the caller (enterprise API) checks the authority server-side,
 * applies the transition in a transaction and writes the audit event.
 */
import { ROOM_LIFECYCLE, type ApplicabilityRow, type RecordedResult, type RoomLifecycle } from '@empathia/domain-types';
import { resultCounts, resultWords } from './results.js';

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
}

/** Returns the reasons a transition is refused; an empty list means the transition is allowed (authority still to be checked). */
export function lifecycleBlockers(f: LifecycleFacts): string[] {
  const i = ROOM_LIFECYCLE.indexOf(f.from as RoomLifecycle);
  const j = ROOM_LIFECYCLE.indexOf(f.to);
  if (j !== i + 1 && !(f.to === 'PLANNED' && f.from === 'DESIGN_APPROVED')) return [`no transition ${f.from} → ${f.to}: the room moves one governed step at a time`];
  const why: string[] = [];
  if (f.to === 'DESIGN_APPROVED') {
    if (!f.classificationApproved) why.push('the room classification is not approved by an engineer');
    const hi = f.openIssues.filter((x) => x.severity === 'High' || x.severity === 'Critical').length;
    if (hi) why.push(`${hi} open High/Critical design deficiencies`);
    if (!f.savedRevisions) why.push('no saved revision');
  }
  if (f.to === 'ACCEPTED') {
    const app = f.rows.filter((r) => r.applicable);
    if (!app.length || app.some((r) => r.result !== 'PASS_VERIFIED')) {
      const C = resultCounts(f.rows, f.results);
      why.push(`acceptance needs every applicable test executed, passed and independently verified with evidence: ${C.verified} of ${app.length} passed and independently verified (${C.recorded} recorded: ${resultWords(C).replace(/^\d+ passed and independently verified, /, '')}; ${C.notTested} not tested)`);
    }
    if (f.openIssues.length) why.push(`${f.openIssues.length} open issue(s): every deficiency is closed with its retest before acceptance`);
  }
  if (f.to === 'OPERATIONAL') {
    if (!f.hasBaseline) why.push('no accepted, signed baseline');
    if (!f.hasLiveMonitoringEvidence) why.push('operational status needs live monitoring evidence on the installed room; without it the room stays ACCEPTED');
  }
  return why;
}
