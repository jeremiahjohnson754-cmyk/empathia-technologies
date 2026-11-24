/**
 * Empathia MissionProof — readiness for an event that must not fail (Enterprise 3.0 directive 1, capability 7; journey J8, and the
 * last step of J6B-VOICE). One synthetic mission: the company town hall. Its readiness is never typed in: each dependency is read
 * from a record that already exists (the host room's lifecycle, the calling evidence of VOICE, the uplink FLOW reads, the service
 * job) and carries the evidence state of that record. The roll-up rule is the simplest that is safe: one dependency that is not
 * ready makes the mission not ready; an unknown is never counted as ready. A rehearsal is a declaration someone records, kept in
 * this browser. Post-event learning and archiving are specified, not built. No React: the unit suite runs it.
 */
import { driftOf, type Workspace } from '../workspace/store.js';
import type { RoleKey } from '../registry.types.js';
import { roomRecord } from '../campus/design.js';
import { roomById, fullName } from '../campus/canon.js';
import { SHARED_LINK, VOICE_ROOM, caseView, type CaseId, type EvidenceState } from '../voice/model.js';
import { jobView, callingReading } from '../voice/job.js';

export type Ready = 'READY' | 'AT_RISK' | 'NOT_READY' | 'UNKNOWN';
export const READY_WORD: Record<Ready, string> = { READY: 'Ready', AT_RISK: 'At risk', NOT_READY: 'Not ready', UNKNOWN: 'Unknown' };
export interface Dep { id: string; title: string; owner: string; ready: Ready; basis: EvidenceState; why: string; href?: string; hrefLabel?: string }
export const MISSION = { id: 'MP-TOWNHALL-01', name: 'Company town hall', when: 'Thursday 26 November 2026, 15:00 UTC (synthetic)', hostRoom: 'R-NST-2-101', remoteRooms: SHARED_LINK.rooms,
  contingency: ['If the Atlas floor 4 uplink is at risk on the day: the three rooms on switch ATL-4A join from rooms on another switch (declared playbook, synthetic).', 'If the host room is not accepted in time: the town hall is hosted from an accepted room, and the change is recorded as a decision.'] };
export interface Rehearsal { at: string; by: RoleKey; note: string }
const KEY = 'empathia.demo.mission.v1';
export function loadRehearsals(): Rehearsal[] { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]') as Rehearsal[]; return Array.isArray(v) ? v : []; } catch { return []; } }
export function recordRehearsal(by: RoleKey, note: string): Rehearsal[] { const all = [{ at: new Date().toISOString(), by, note: note.trim().slice(0, 200) }, ...loadRehearsals()]; try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* lasts the page */ } return all; }

export interface Readiness { deps: Dep[]; overall: Ready; notReady: number; says: string }
/**
 * Which calling evidence is on record for the mission now: the reading Assurance and APEX read (voice/job.ts callingReading), in which
 * the later session exists only once the repair has been verified by a second person. MissionProof reads this unless the address asks
 * for another case; before 24 Nov 2026 it read the degraded call by default whatever the records said, so after a verified repair and
 * a cleared retest the page still opened on "at risk" until someone picked the other case by hand.
 */
export const caseOnRecord = (w: Workspace): CaseId => callingReading(w, VOICE_ROOM)?.vcase ?? 'degraded';
export function readiness(w: Workspace, vcase: CaseId, rehearsals: Rehearsal[]): Readiness {
  const host = roomRecord(MISSION.hostRoom); const hostName = roomById(MISSION.hostRoom) ? fullName(roomById(MISSION.hostRoom)!) : MISSION.hostRoom; const accepted = !!host && ['ACCEPTED', 'OPERATIONAL'].includes(host.lifecycle);
  const v = caseView(vcase); const job = jobView(w, VOICE_ROOM); const drift = driftOf(w, VOICE_ROOM).filter((d) => d.subject === 'Calling'); const openDrift = drift.find((d) => !d.cleared) || null; const clearedDrift = drift.find((d) => !!d.cleared && d.incidentId === job?.incident.id) || null; const cq = `#/voice/callpath/${VOICE_ROOM}${vcase === 'degraded' ? '' : `?case=${vcase}`}`;
  const calling: Pick<Dep, 'ready' | 'why' | 'basis'> = v.verdict === 'UNKNOWN' ? { ready: 'UNKNOWN', basis: 'UNKNOWN', why: v.verdictWhy }
    : v.verdict === 'OUTSIDE_POLICY' ? { ready: 'AT_RISK', basis: 'SIMULATED', why: `${v.verdictWhy} ${job ? `Job ${job.incident.id} is ${job.incident.state}${job.verified ? ', verified, but no later session shows the call within targets' : ''}.` : 'No job has been raised.'}` }
    // 24 Nov 2026 (founder directive, completion §6): a verified repair is not readiness while Assurance still holds an open drift record
    // for this room's calling. The record is cleared only by an Assurance retest; until then the dependency is unknown, not ready.
    : job?.verified && openDrift ? { ready: 'UNKNOWN', basis: 'SIMULATED', why: `The repair (${job.incident.id}) is verified by ${job.incident.verifiedBy} and a later simulated session is within the declared targets, but Assurance drift record ${openDrift.id} is still open. Only an Assurance retest clears it; until then this is not counted ready.` }
    : job?.verified ? { ready: 'READY', basis: 'SIMULATED', why: `The repair (${job.incident.id}) is verified by ${job.incident.verifiedBy}, and a later simulated session is within the declared targets${clearedDrift ? `; Assurance's retest cleared drift record ${clearedDrift.id}` : ''}. Ready on simulated evidence only.` }
    : { ready: 'UNKNOWN', basis: 'SIMULATED', why: `A later simulated session is within targets, but ${job ? `job ${job.incident.id} is not verified` : 'no repair is on record'}: the cause is not shown to be gone.` };
  const uplink: Pick<Dep, 'ready' | 'why' | 'basis'> = vcase === 'degraded' ? { ready: 'AT_RISK', basis: 'SIMULATED', why: 'Simulated interface counters show discards rising on the ATL-4A uplink. Three remote rooms share it.' }
    // 24 Nov 2026: the later window belongs to the same later session as the call's. It is read as the uplink's state only when that
    // session is on record, which is after a verified repair. Before this, picking the "after the repair" case in the address made the
    // uplink read ready on any workspace, repaired or not.
    : vcase === 'retest' && !job?.verified ? { ready: 'UNKNOWN', basis: 'SIMULATED', why: `A later window without discards is shown, but ${job ? `job ${job.incident.id} is not verified` : 'no repair is on record'}: it is not read as the uplink's state.` }
    : vcase === 'retest' ? { ready: 'READY', basis: 'SIMULATED', why: 'Simulated interface counters show no discards in the later window. Ready on simulated evidence only.' }
    : { ready: 'UNKNOWN', basis: 'UNKNOWN', why: 'There is no current observation of the uplink.' };
  const deps: Dep[] = [
    { id: 'host', title: `Host room: ${hostName}`, owner: 'Commissioning Engineer', ready: accepted ? 'READY' : 'NOT_READY', basis: 'DECLARED', why: accepted ? `The room is ${host!.lifecycle} with an accepted baseline.` : `The room is ${host?.lifecycle || 'not on record'}: it has no accepted baseline, so it cannot be counted ready.`, href: `#/commissioning/room/${MISSION.hostRoom}`, hrefLabel: 'Its commissioning record' },
    { id: 'calling', title: 'Calling from Atlas 4.218 (a remote room)', owner: 'UC / Voice Administrator', ...calling, href: cq, hrefLabel: 'Its CallPath in VOICE' },
    { id: 'uplink', title: `Shared uplink of switch ${SHARED_LINK.to} (${MISSION.remoteRooms.length} remote rooms)`, owner: 'AV Operations Lead', ...uplink, href: `#/flow/link/${SHARED_LINK.to}${vcase === 'degraded' ? '' : `?case=${vcase}`}`, hrefLabel: 'The uplink in FLOW' },
    { id: 'rehearsal', title: 'Rehearsal', owner: 'AV Operations Lead', ready: rehearsals.length ? 'READY' : 'NOT_READY', basis: 'DECLARED', why: rehearsals.length ? `Recorded ${rehearsals[0]!.at.slice(0, 16).replace('T', ' ')} UTC${rehearsals[0]!.note ? `: ${rehearsals[0]!.note}` : ''}. A declaration, not a test result.` : 'No rehearsal is recorded.' },
    { id: 'contingency', title: 'Contingency playbook', owner: 'Service Manager', ready: 'READY', basis: 'DECLARED', why: `${MISSION.contingency.length} declared responses are on file.` },
  ];
  const notReady = deps.filter((d) => d.ready !== 'READY').length;
  const overall: Ready = deps.some((d) => d.ready === 'NOT_READY') ? 'NOT_READY' : deps.some((d) => d.ready === 'AT_RISK') ? 'AT_RISK' : deps.some((d) => d.ready === 'UNKNOWN') ? 'UNKNOWN' : 'READY';
  return { deps, overall, notReady, says: notReady ? `${notReady} of ${deps.length} dependencies stand between this town hall and ready.` : 'Every dependency is ready, on declared and simulated evidence. That is not a verified result.' };
}
export const WHY = 'Enterprise 3.0 directive 1 (MissionProof): readiness of an event is read by those who run, support and sponsor it; a rehearsal is recorded by the operations lead';
