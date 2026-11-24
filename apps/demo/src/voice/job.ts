/**
 * J6B-VOICE steps 5 and 6, read back from the service engine. VOICE runs no workflow of its own: the calling problem reported from the
 * room IS a ServiceHands incident (workspace/store.ts), and its triage, assignment, field evidence and independent verification are
 * the service machine's own steps with their own guards (the technician cannot verify their own work). This file only reads that
 * record and says what it does and does not prove. No React: the unit suite runs the whole journey on the engine through it.
 */
import type { Workspace, Incident, WorkOrder } from '../workspace/store.js';
import { SHARED_LINK, caseView, flowFor, outsidePolicy, type CaseId, type EvidenceState } from './model.js';

export const VOICE_TITLE = 'Calling problem';
export interface JobStep { key: 'reported' | 'assigned' | 'evidence' | 'verified'; label: string; done: boolean; detail: string }
export interface JobView { incident: Incident; workOrder: WorkOrder | null; steps: JobStep[]; verified: boolean; closedWithoutVerification: boolean; says: string }

/** The newest calling-problem incident for the room, with where it stands. null: nobody has reported one. */
export function jobView(w: Workspace, roomId: string): JobView | null {
  const incident = w.incidents.find((i) => i.roomId === roomId && i.title.startsWith(VOICE_TITLE)); if (!incident) return null;
  const workOrder = incident.workOrderId ? w.workOrders.find((o) => o.id === incident.workOrderId) || null : null;
  const evidence = workOrder?.evidence.length || 0; const verified = !!incident.verifiedBy && ['RESOLVED', 'CLOSED'].includes(incident.state);
  const steps: JobStep[] = [
    { key: 'reported', label: 'Reported from the room', done: true, detail: `${incident.id} · ${incident.state}` },
    { key: 'assigned', label: 'Assigned to a technician authorised for the site', done: !!workOrder?.techId, detail: workOrder?.techId ? `${workOrder.id} · ${workOrder.techId}` : 'not assigned yet' },
    { key: 'evidence', label: 'Field evidence recorded', done: evidence > 0, detail: evidence ? `${evidence} item${evidence === 1 ? '' : 's'} on ${workOrder!.id}` : 'none yet' },
    { key: 'verified', label: 'Verified by someone other than the technician', done: verified, detail: verified ? `verified by ${incident.verifiedBy}` : 'not verified' },
  ];
  const closedWithoutVerification = incident.state === 'CLOSED' && !incident.verifiedBy;
  const says = verified ? 'The repair is verified by an independent reviewer. That closes the job; it does not pass an acceptance test, and Assurance is unchanged by it.'
    : 'The job is open. Nothing about the room’s calling is proved yet.';
  return { incident, workOrder, steps, verified, closedWithoutVerification, says };
}

/**
 * What the room's calling evidence says now, for the products that read it beside their own records: Assurance (evidence beside the
 * accepted baseline) and APEX (evidence beside its seven layers). One rule decides which session is the newest: the later simulated
 * session exists only once the repair has been verified by a second person; until then the degraded session is the newest on record.
 * Nothing here changes a baseline, a test result or a hypothesis: it is a reading, with its state and the way to the CallPath.
 */
export type CallingState = 'OUTSIDE' | 'WITHIN' | 'UNKNOWN';
export const CALLING_WORD: Record<CallingState, string> = { OUTSIDE: 'Outside the declared targets', WITHIN: 'Within the declared targets', UNKNOWN: 'Unknown' };
export interface CallingReading { state: CallingState; vcase: CaseId; basis: EvidenceState; says: string; job: JobView | null; href: string; uplink: string | null }
export function callingReading(w: Workspace, roomId: string): CallingReading | null {
  if (!flowFor(roomId)) return null;
  const job = jobView(w, roomId); const vcase: CaseId = job?.verified ? 'retest' : 'degraded'; const v = caseView(vcase, roomId);
  const href = `#/voice/callpath/${roomId}${vcase === 'degraded' ? '' : `?case=${vcase}`}`; const uplink = SHARED_LINK.rooms.includes(roomId) ? `#/flow/link/${SHARED_LINK.to}?from=voice&room=${roomId}${vcase === 'degraded' ? '' : `&case=${vcase}`}` : null;
  if (!v.observed || v.verdict === 'UNKNOWN') return { state: 'UNKNOWN', vcase, basis: 'UNKNOWN', job, href, uplink, says: 'A call flow is declared for this room and no session has been observed. Nothing is known about its calling.' };
  if (v.verdict === 'WITHIN_POLICY') return { state: 'WITHIN', vcase, basis: 'SIMULATED', job, href, uplink, says: `After the repair verified by ${job!.incident.verifiedBy} (${job!.incident.id}), a later simulated session is within the declared calling targets in every window.` };
  const out = v.samples.filter((x) => outsidePolicy(x).length).length;
  return { state: 'OUTSIDE', vcase, basis: 'SIMULATED', job, href, uplink, says: `The newest simulated session is outside the declared calling targets in ${out} of ${v.samples.length} windows. ${job ? `Job ${job.incident.id} is ${job.incident.state.toLowerCase().replace(/_/g, ' ')}${job.verified ? ' and verified' : ''}.` : 'No job has been raised for it.'}` };
}
