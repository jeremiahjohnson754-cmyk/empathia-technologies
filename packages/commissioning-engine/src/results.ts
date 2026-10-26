/**
 * Commissioning results: the single result vocabulary and the acceptance counts.
 *
 * Rule (audit 253 F-03 and rc3 R3-2): a recorded PASS is PASS_UNVERIFIED until a different person verifies it. No surface, export,
 * event or API returns a bare `PASS`. Ported from `v25RoomResultLabel`, `v25RoomResultCounts`, `v25RoomResultWords`.
 */
import type { ApplicabilityRow, RecordedResult, ResultCounts, ResultLabel } from '@empathia/domain-types';

export function resultLabel(r: RecordedResult | null | undefined): ResultLabel {
  if (!r) return 'NOT_TESTED';
  if (r.state === 'PASS') return r.verified && r.verified.by && r.verified.by !== r.by ? 'PASS_VERIFIED' : 'PASS_UNVERIFIED';
  return r.state;
}

export function resultCounts(rows: ApplicabilityRow[], results: Record<string, RecordedResult> | undefined): ResultCounts {
  const app = rows.filter((r) => r.applicable);
  const R = results || {};
  const L = app.map((r) => resultLabel(R[r.id]));
  const n = (x: ResultLabel) => L.filter((y) => y === x).length;
  return {
    applicable: app.length,
    recorded: L.filter((x) => x !== 'NOT_TESTED').length,
    verified: n('PASS_VERIFIED'),
    awaiting: n('PASS_UNVERIFIED'),
    failed: n('FAIL'),
    notSupported: n('NOT_SUPPORTED'),
    inconclusive: n('INCONCLUSIVE'),
    notTested: n('NOT_TESTED'),
  };
}

export function resultWords(c: ResultCounts): string {
  return [`${c.verified} passed and independently verified`, `${c.awaiting} passed awaiting verification`, `${c.failed} failed`]
    .concat(c.notSupported ? [`${c.notSupported} not supported`] : [])
    .concat(c.inconclusive ? [`${c.inconclusive} inconclusive`] : [])
    .join(', ');
}

/** Acceptance is possible only when every applicable test is PASS_VERIFIED. Returns the blocking reasons (empty = acceptable). */
export function acceptanceBlockers(c: ResultCounts): string[] {
  const why: string[] = [];
  if (c.applicable === 0) why.push('no applicable tests have been judged');
  if (c.verified < c.applicable) why.push(`${c.applicable - c.verified} of ${c.applicable} applicable tests are not passed and independently verified (${resultWords(c)}, ${c.notTested} not tested)`);
  return why;
}
