/**
 * J6B-VOICE steps 5 and 6, read back from the service engine. VOICE runs no workflow of its own: the calling problem reported from the
 * room IS a ServiceHands incident (workspace/store.ts), and its triage, assignment, field evidence and independent verification are
 * the service machine's own steps with their own guards (the technician cannot verify their own work). This file only reads that
 * record and says what it does and does not prove. No React: the unit suite runs the whole journey on the engine through it.
 */
import type { Workspace, Incident, WorkOrder } from '../workspace/store.js';

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
