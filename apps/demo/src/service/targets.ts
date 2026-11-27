/**
 * The service targets, once (the service-target slice, #320, 27 Nov 2026). Service analytics, the dispatch board, the Pro command
 * center, Issue Intelligence and the set behind "Past their target" all read these hours and this rule. Before, the command center
 * kept its own table in days (1, 2 and 5), so a Mission critical request open 12 h was breached on the dispatch board and not past
 * target in Pro. Business days are counted as 24 h each, and every page that shows a target says so.
 */
import { isOpenRequest } from '../workspace/requests.js';

export type ServiceSeverity = 'Mission critical' | 'High' | 'Standard';
/** Respond and restore targets by severity, in hours (from @empathia/service-engine's SLA words). */
export const SLA_HOURS: Record<ServiceSeverity, { respond: number; restore: number }> = { 'Mission critical': { respond: 2, restore: 8 }, High: { respond: 24, restore: 48 }, Standard: { respond: 48, restore: 120 } };
/** An unknown severity is held to the longest target, never to none. */
export const restoreHoursOf = (severity: string): number => (SLA_HOURS as Record<string, { restore: number }>)[severity]?.restore ?? SLA_HOURS.Standard.restore;

interface RequestLike { state: string; severity: string; openedAt: string; restoredAt: string | null }
/** Past its restore target: restored after the target, or not restored and the target has passed. */
export const pastRestoreTarget = (i: RequestLike, nowMs: number): boolean => {
  const due = Date.parse(i.openedAt) + restoreHoursOf(i.severity) * 36e5;
  return i.restoredAt ? Date.parse(i.restoredAt) > due : nowMs > due;
};
/** The open requests past their restore target: the Pro command center's and Issue Intelligence's "Past their target", and the set req:late. */
export const pastTargetOf = <T extends RequestLike>(incidents: ReadonlyArray<T>, nowMs: number): T[] => incidents.filter((i) => isOpenRequest(i) && pastRestoreTarget(i, nowMs));
/** The targets as words, for the notes beside the figures. */
export const TARGETS_TEXT = (Object.entries(SLA_HOURS) as Array<[string, { restore: number }]>).map(([k, v]) => `${k} ${v.restore} h`).join(' · ');
