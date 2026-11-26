/**
 * The two rules for where a service request stands (26 Nov 2026, metric integrity). Before this file there were three: the campus and
 * Mission Control counted a RESOLVED request as finished, Pro, the assurance pages and the exports counted it as open, and three pages
 * listed states that do not exist. Every page reads these two, and only these two (tests/unit/metric-integrity.test.mjs, MI-10).
 *
 *   OPEN: the problem is not fixed yet. Open, triaged, assigned, accepted, in progress, verifying or reopened. A RESOLVED request is
 *   fixed and checked, so it is not open (campus/definitions.ts, requests.open). Every number labelled "open" counts these.
 *   NOT CLOSED: still on the service board. Every state but closed and cancelled, so a resolved job stays on the board until someone
 *   closes it. Work boards and queues show these; a count of them is never labelled "open".
 */
export const OPEN_REQUEST_STATES: ReadonlySet<string> = new Set(['OPEN', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'VERIFYING', 'REOPENED']);
export const isOpenRequest = (i: { state: string }): boolean => OPEN_REQUEST_STATES.has(i.state);
export const isUnclosedRequest = (i: { state: string }): boolean => i.state !== 'CLOSED' && i.state !== 'CANCELLED';
/** When an open request stopped being open (its last move to resolved, closed or cancelled), or null while it is open: a trend of
 *  open requests ends on the open count only if a request leaves it when it was fixed, not when it was closed. */
export function requestFixedAt(i: { state: string; openedAt: string; closedAt?: string | null; history?: ReadonlyArray<{ to: string; at: string }> }): string | null {
  if (isOpenRequest(i)) return null;
  const last = [...(i.history || [])].reverse().find((h) => !OPEN_REQUEST_STATES.has(h.to));
  return last?.at || i.closedAt || i.openedAt;
}
