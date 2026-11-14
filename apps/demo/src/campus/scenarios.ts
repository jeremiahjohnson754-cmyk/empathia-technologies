/**
 * The five reference commissioning scenarios (40/10 directive §24: Request → Design intent → Device inventory → Generated checklist →
 * Test execution → Measurement → Evidence → Deficiency → Repair → Retest → Documentation → Acceptance → Assurance), each on the room of
 * the synthetic estate closest to the brief, and each stage READ FROM THAT ROOM'S RECORD — nothing typed for the scenario. Where a room's
 * record does not reach a stage, the stage says so; where the record holds a failure, the stage names what the system detected and what it
 * blocks. The rooms are synthetic and labelled; the closeness of each to its brief is stated, not claimed as an exact match.
 */
import { roomRecord, openIssues, type RoomRecord } from './design.js';
import { fullName } from './canon.js';
import { rowsOf, blockers } from './cxRecord.js';
import type { ServiceJob } from '../service/history.js';

export interface Scenario { key: 'A' | 'B' | 'C' | 'D' | 'E'; name: string; brief: string; room: string; fit: string }
export const SCENARIOS: Scenario[] = [
  { key: 'A', name: 'Enterprise Teams room', brief: 'Medium conference room: room compute, displays, camera, ceiling microphone, speakers, touch control, network.', room: 'R-MER-1-140', fit: 'a 12-person collaboration room with compute, display, camera, ceiling microphone, DSP, speakers, touch control and a switch; no scheduling panel on its record' },
  { key: 'B', name: 'Executive boardroom', brief: 'Multiple microphones, DSP, cameras, control, dual displays, advanced audio and video, acoustic validation.', room: 'R-ATL-7-410', fit: 'a 22-person boardroom with ceiling microphones, DSP, amplification, cameras, control and touch, displays, a rack and a switch' },
  { key: 'C', name: 'University lecture hall', brief: 'Lecture capture, reinforcement, presentation, microphones, display, cameras, control, audience coverage, intelligibility.', room: 'R-BCN-3-225', fit: 'a 30-seat training room with ceiling and wireless microphones, reinforcement and a camera; its intelligibility fails under the open ceiling' },
  { key: 'D', name: 'Commentary and broadcast', brief: 'Production equipment, communications, audio paths, monitors, routing, redundancy, operational reliability.', room: 'R-WMR-2-120', fit: 'a 16-person studio (a clinical simulation theatre) with cameras, wireless microphones, a switcher, an encoder, DSP and monitors; not a stadium commentary position — the closest production room on the estate' },
  { key: 'E', name: 'Divisible ballroom', brief: 'Combined and divided modes, multi-zone audio, display and video routing, user workflows, multi-state test sequences.', room: 'R-BCN-1-300', fit: 'a 220-seat divisible room (sections A, B and C) whose combined configuration is not yet commissioned; the split sections are' },
];
export const STAGES = ['Request', 'Design intent', 'Device inventory', 'Generated checklist', 'Test execution', 'Measurement', 'Evidence', 'Deficiency', 'Repair', 'Retest', 'Documentation', 'Acceptance', 'Assurance'] as const;
export type StageState = 'done' | 'open' | 'blocked' | 'not-reached' | 'none';
export interface Stage { name: (typeof STAGES)[number]; state: StageState; detail: string; href: string }

const ACCEPTED = ['ACCEPTED', 'OPERATIONAL'];
export function journey(s: Scenario, jobs: ServiceJob[], projectOf: (room: string) => string | null): { r: RoomRecord; stages: Stage[]; failures: string[] } {
  const r = roomRecord(s.room)!; const room = `#/commissioning/room/${s.room}`;
  const rows = rowsOf(r).filter((x) => x.applicable); const run = rows.filter((x) => x.result && x.result !== 'NOT_TESTED');
  const fails = rows.filter((x) => x.result === 'FAIL'); const inst = rows.filter((x) => x.instrument); const instRun = inst.filter((x) => x.result && x.result !== 'NOT_TESTED');
  const ev = rows.filter((x) => (x.evidence || []).length && x.result && x.result !== 'NOT_TESTED'); const open = openIssues(r); const bl = blockers(r);
  const mine = jobs.filter((j) => j.roomId === s.room); const proj = projectOf(s.room);
  const units = r.installations.filter((i) => !i.removedAt).length; const retired = r.installations.filter((i) => i.removedAt).length;
  const accepted = ACCEPTED.includes(r.lifecycle); const cur = r.baselines.find((b) => b.state === 'CURRENT');
  const st = (name: Stage['name'], state: StageState, detail: string, href = room): Stage => ({ name, state, detail, href });
  const stages: Stage[] = [
    st('Request', proj ? 'done' : 'none', proj ? `project ${proj} on the decision desk` : 'no request on record: delivered under the estate programme', proj ? `#/decisions` : room),
    st('Design intent', 'done', `${r.archetypeName}, ${r.outline.capacity} people${r.outline.intent ? ` · ${r.outline.intent}` : ''}`),
    st('Device inventory', units ? 'done' : 'not-reached', `${r.positions.filter((p) => !p.furniture).length} positions · ${units} units installed${retired ? ` · ${retired} retired` : ''}`),
    st('Generated checklist', rows.length ? 'done' : 'not-reached', `${rows.length} checks in the plan, each with the engine’s reason`),
    st('Test execution', run.length === rows.length && rows.length ? 'done' : run.length ? 'open' : 'not-reached', `${run.length} of ${rows.length} run`),
    st('Measurement', !inst.length ? 'none' : instRun.length === inst.length ? 'done' : instRun.length ? 'open' : 'not-reached', inst.length ? `${instRun.length} of ${inst.length} instrument checks measured` : 'no instrument check in this plan'),
    st('Evidence', ev.length ? (ev.length === run.length ? 'done' : 'open') : 'not-reached', `${ev.length} results carry evidence`),
    st('Deficiency', open.length || fails.length ? 'blocked' : r.issues.length ? 'done' : 'none', open.length || fails.length ? `${open.length} open: ${open.map((i) => `${i.severity} — ${i.title}`).join('; ') || `${fails.length} failed checks`}` : r.issues.length ? `${r.issues.length} found and resolved` : 'none found'),
    st('Repair', mine.length ? (mine.some((j) => !j.restoredAt) ? 'open' : 'done') : open.length ? 'open' : 'none', mine.length ? `${mine.length} service jobs, ${mine.filter((j) => j.restoredAt).length} restored` : open.length ? 'no repair recorded yet' : 'nothing to repair', mine.length ? `#/v25/service/analytics` : room),
    st('Retest', r.reopened.length ? 'open' : fails.length ? 'not-reached' : 'none', r.reopened.length ? `${r.reopened.length} tests reopened by a replacement` : fails.length ? 'the failed checks wait for their retest' : 'nothing to retest'),
    st('Documentation', 'done', 'the completion package exports in six formats from the record', room),
    st('Acceptance', accepted ? 'done' : bl.blocked ? 'blocked' : 'open', accepted ? `accepted (${r.lifecycle.toLowerCase()})` : bl.blocked ? `blocked: ${[bl.critical.length && `${bl.critical.length} critical`, bl.must.length && `${bl.must.length} failed`, bl.missing.length && `${bl.missing.length} not run or unverified`].filter(Boolean).join(', ')}` : 'ready to accept'),
    st('Assurance', cur ? 'done' : accepted ? 'open' : 'not-reached', cur ? `baseline v${cur.version} current` : accepted ? 'accepted; no current baseline' : 'starts at acceptance'),
  ];
  const failures = [...open.map((i) => `${i.severity} deficiency: ${i.title}`), ...fails.map((x) => `failed check: ${x.label}`), ...(bl.blocked && !accepted ? ['acceptance is blocked until these are closed'] : [])];
  return { r, stages, failures };
}
export const scenarioRoomName = (s: Scenario) => fullName(roomRecord(s.room)!.outline);
