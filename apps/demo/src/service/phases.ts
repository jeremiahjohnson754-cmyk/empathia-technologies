/**
 * A ServiceHands job on the universal phase engine (phases/universal.ts) — the same structure as commissioning: five phases with a
 * question each, items worked out from the record, one verdict rule, and a sign-off that waits for every phase and is never by someone
 * who did the work. Every item is read from the incident, its work order and its history; nothing is typed in.
 *
 *   1 Intake         Is the request on the record, in a known room, triaged?
 *   2 Dispatch       Is the right person assigned through the hard gates, with the preflight passed and the job accepted?
 *   3 Field work     Was the work done, with evidence?
 *   4 Verification   Was the fix verified by someone other than the technician?
 *   5 Confirmation   Did the requester confirm it works (or the policy not ask)?
 *   + Close-out sign-off by the service manager.
 */
import { runPhases, signOff, type PhaseDef, type PhaseItem, type ItemResult } from '../phases/universal.js';
import { roomRecord } from '../campus/design.js';
import type * as S from '../workspace/store.js';

export const SERVICE_PHASES: PhaseDef[] = [
  { n: 1, name: 'Intake', q: 'Is the request on the record, in a known room, triaged?' },
  { n: 2, name: 'Dispatch', q: 'Is the right person assigned through the hard gates, preflight passed, job accepted?' },
  { n: 3, name: 'Field work', q: 'Was the work done, with evidence?' },
  { n: 4, name: 'Verification', q: 'Was the fix verified by someone other than the technician?' },
  { n: 5, name: 'Confirmation', q: 'Did the requester confirm it works?' },
];
const ORDER = ['OPEN', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'VERIFYING', 'RESOLVED', 'CLOSED'];
const reached = (inc: S.Incident, s: string) => inc.state !== 'CANCELLED' && ORDER.indexOf(inc.state) >= ORDER.indexOf(s);
const when = (inc: S.Incident, s: string) => inc.history.find((h) => h.to === s) || null;

export function serviceItems(inc: S.Incident, wo: S.WorkOrder | null): PhaseItem[] {
  const it = (id: string, phase: number, label: string, result: ItemResult, why: string, h?: { by: string; at: string } | null): PhaseItem => ({ id, phase, label, result, why, by: h?.by ?? null, at: h?.at ?? null });
  const tri = when(inc, 'TRIAGED'); const asg = when(inc, 'ASSIGNED'); const acc = when(inc, 'ACCEPTED'); const ip = when(inc, 'IN_PROGRESS'); const res = when(inc, 'RESOLVED'); const clo = when(inc, 'CLOSED');
  const pre = wo?.preflight || null; const preFail = pre?.filter((c) => !c.ok) || [];
  const ev = wo?.evidence || [];
  return [
    it('SH-1.1', 1, 'Request recorded with its room', roomRecord(inc.roomId) ? 'pass' : 'fail', roomRecord(inc.roomId) ? `${inc.roomName} (${inc.roomId})` : 'the room is not on the campus record', inc.history[0] || null),
    it('SH-1.2', 1, 'Triaged: severity and scope set', tri ? 'pass' : 'pending', tri ? `${inc.severity}` : 'waiting for triage', tri),
    it('SH-2.1', 2, 'Assigned through the hard gates', asg && wo?.techId ? 'pass' : 'pending', wo?.techId ? `technician ${wo.techId}` : 'nobody assigned yet', asg),
    it('SH-2.2', 2, 'Dispatch preflight passed', !pre ? (reached(inc, 'IN_PROGRESS') ? 'ran' : 'pending') : preFail.length ? 'fail' : 'pass', !pre ? 'no preflight on the record' : preFail.length ? preFail.map((c) => c.label).join(', ') : `${pre.length} checks passed`),
    it('SH-2.3', 2, 'Accepted by the technician', acc ? 'pass' : 'pending', acc ? 'accepted' : 'not accepted yet', acc),
    it('SH-3.1', 3, 'Work started on site', ip ? 'pass' : 'pending', ip ? 'in progress' : 'not started', ip),
    it('SH-3.2', 3, 'Field evidence recorded', ev.length ? 'pass' : reached(inc, 'VERIFYING') ? 'fail' : 'pending', ev.length ? `${ev.length} item${ev.length === 1 ? '' : 's'}: ${ev.map((e) => e.kind).join(', ')}` : 'no evidence recorded', ev[0] ? { by: ev[0].by, at: ev[0].at } : null),
    it('SH-4.1', 4, 'Fix verified by someone other than the technician', res && inc.verifiedBy ? (inc.verifiedBy === wo?.techId ? 'fail' : 'pass') : inc.state === 'VERIFYING' ? 'ran' : 'pending', res && inc.verifiedBy ? `verified by ${inc.verifiedBy}` : inc.state === 'VERIFYING' ? 'the fix is awaiting verification' : 'not verified yet', res),
    it('SH-4.2', 4, 'Not a reopened fix', inc.reopened ? 'fail' : res ? 'pass' : 'pending', inc.reopened ? 'the job was reopened after it was resolved' : res ? 'held since it was resolved' : '—'),
    it('SH-5.1', 5, 'The requester confirmed it works', inc.requesterConfirmed ? 'pass' : clo ? 'ran' : 'pending', inc.requesterConfirmed ? 'confirmed' : clo ? 'closed without the requester’s confirmation (allowed by the policy)' : 'waiting for the requester', null),
  ];
}
export function servicePhases(inc: S.Incident, wo: S.WorkOrder | null) {
  const run = runPhases(SERVICE_PHASES, serviceItems(inc, wo)); const clo = when(inc, 'CLOSED');
  return { run, signOff: clo ? { done: true, by: clo.by, at: clo.at, ...signOff(run, clo.by) } : { done: false, by: null, at: null, ...signOff(run, null) } };
}
