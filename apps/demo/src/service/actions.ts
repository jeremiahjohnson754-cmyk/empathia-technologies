/**
 * ServiceHands mutations beyond the shared store's service steps (src/workspace/store.ts: triage, accept, start, evidence, hand-over,
 * verify, close, reopen — used as they are): the structured intake, the technician's field notes, blockers and escalations, Field
 * Intelligence findings attached as provenance-labelled evidence, the resolution code and root cause, and cancelling a work order.
 */
import * as S from '../workspace/store.js';
import { deny, log, need, now, sh, shView, holds, type WX } from '../hardening/kit.js';
import { roomOf, type Finding } from '../fi/rooms.js';

export const CATEGORIES: Record<string, { label: string; questions: string[]; workType: string }> = {
  audio: { label: 'Audio: hearing or being heard', workType: 'dsp_upgrade', questions: ['Can people in the room hear the far end?', 'Can the far end hear the room?', 'Does it happen on every call, or only on long ones?'] },
  video: { label: 'Video: camera or framing', workType: 'break_fix', questions: ['Does the camera light come on when a meeting starts?', 'Does the far end see a black picture or no picture at all?', 'Did anyone move or touch the camera?'] },
  display: { label: 'Display or projector', workType: 'break_fix', questions: ['Is the display on (any light or logo)?', 'Is the right source chosen on the panel?', 'Does a laptop connected by cable show?'] },
  control: { label: 'Touch panel or room control', workType: 'break_fix', questions: ['Does the panel respond to a touch?', 'Does it show the room name?', 'Did it work earlier today?'] },
  network: { label: 'Network or joining meetings', workType: 'network_change', questions: ['Do other rooms on this floor have the same problem?', 'Does the room join the meeting at all?', 'When did it start?'] },
  other: { label: 'Something else', workType: 'break_fix', questions: ['What did you expect to happen?', 'What happened instead?', 'When did you first notice?'] },
};
export const ENTRY_POINTS: Record<string, string> = { employee: 'Employee in the room', champion: 'Site champion', technician: 'Technician on site' };
export const RESOLUTION_CODES: Record<string, string> = {
  'RC-CONFIG': 'Configuration restored to the commissioned baseline', 'RC-REPLACE': 'Unit replaced like-for-like', 'RC-CABLE': 'Cable or connector repaired',
  'RC-USER': 'Use of the room explained; nothing faulty', 'RC-NETWORK': 'Network setting corrected', 'RC-VENDOR': 'Vendor defect: workaround in place, case open with the vendor',
};
/** The Learn band recommended from the technical subject of the work: the demonstration's rule, stated as such (not an assessment). */
export const BAND_OF: Record<string, { band: string; why: string }> = {
  break_fix: { band: 'L1', why: 'single-device fault, standard tools' }, room_verification: { band: 'L2', why: 'retesting against a baseline' },
  camera_replacement: { band: 'L2', why: 'unit replacement with presets and reverification' }, dsp_upgrade: { band: 'L3', why: 'audio processing and echo cancellation' },
  network_change: { band: 'L3', why: 'segmentation and multicast' }, new_install: { band: 'L4', why: 'whole-room installation' },
};
const ATTACH_PLACEHOLDERS = ['photo of the panel (synthetic placeholder)', 'photo of the camera (synthetic placeholder)', 'screenshot of the meeting (synthetic placeholder)'];
export { ATTACH_PLACEHOLDERS };

export interface IntakeInput { entry: string; roomId: string; category: string; assetId: string | null; title: string; summary: string; answers: Array<[string, string]>; attachments: string[] }
export function intakeErrors(i: IntakeInput): Record<string, string> {
  const e: Record<string, string> = {};
  if (!ENTRY_POINTS[i.entry]) e.entry = 'Say who is reporting.';
  if (!roomOf(i.roomId)) e.roomId = 'Choose the room.';
  if (!CATEGORIES[i.category]) e.category = 'Choose what kind of problem it is.';
  if (i.title.trim().length < 6) e.title = 'Describe what people experience in a few words (at least 6 characters).';
  if (i.title.length > 120) e.title = 'Keep the title under 120 characters.';
  if (i.summary.length > 600) e.summary = 'Keep the description under 600 characters.';
  return e;
}
export function submitRequest(w: WX, persona: string, i: IntakeInput): S.Refusal | { id: string } {
  const errs = Object.values(intakeErrors(i)); if (errs.length) return deny(w, persona, 'service.raise', i.roomId || '-', errs);
  const r = roomOf(i.roomId)!;
  const out = S.raiseIncident(w, persona, { roomId: r.id, roomName: r.name, buildingKey: r.building, title: i.title, summary: i.summary });
  if ('why' in out) return out;
  sh(w).intake[out.id] = { entry: i.entry, category: i.category, answers: i.answers.filter(([, a]) => a), attachments: i.attachments, assetId: i.assetId };
  log(w, persona, 'service.intake', out.id, `${ENTRY_POINTS[i.entry]} · ${CATEGORIES[i.category]!.label}${i.assetId ? ` · ${i.assetId}` : ''} · ${i.attachments.length} placeholder attachment(s)`);
  return out;
}

const assigned = (w: WX, persona: string, inc: S.Incident) => { const wo = inc.workOrderId ? S.workOrderOf(w, inc.workOrderId) : undefined; return { wo, mine: !!wo && wo.techId === (S.techForPersona(persona) || persona) }; };
export function addNote(w: WX, persona: string, incidentId: string, kind: 'note' | 'blocker' | 'escalation' | 'part', text: string): S.Refusal | null {
  const inc = S.incidentOf(w, incidentId); if (!inc) return { why: ['no such incident'] };
  const n = need(w, persona, ['work.evidence', 'work.accept'], `service.${kind}`, inc.id); if (n) return n;
  const { wo, mine } = assigned(w, persona, inc);
  if (!wo || !mine) return deny(w, persona, `service.${kind}`, inc.id, ['the assigned technician writes the field notes']);
  if (!['ACCEPTED', 'IN_PROGRESS'].includes(inc.state)) return deny(w, persona, `service.${kind}`, inc.id, [`field notes are written while the job is ACCEPTED or IN_PROGRESS (now ${inc.state})`]);
  if (text.trim().length < 4) return deny(w, persona, `service.${kind}`, inc.id, ['the note is empty']);
  (sh(w).notes[wo.id] ||= []).push({ at: now(), by: persona, kind, text: text.trim().slice(0, 400), cleared: null });
  log(w, persona, `service.${kind}`, wo.id, text.trim().slice(0, 160)); return null;
}
export function clearBlocker(w: WX, persona: string, woId: string, index: number, how: string): S.Refusal | null {
  const list = sh(w).notes[woId] || []; const b = list[index];
  if (!b || b.kind !== 'blocker' || b.cleared) return { why: ['no open blocker there'] };
  const n = need(w, persona, ['work.evidence', 'service.assign'], 'service.blocker_cleared', woId); if (n) return n;
  if (how.trim().length < 4) return deny(w, persona, 'service.blocker_cleared', woId, ['say how the blocker was cleared']);
  b.cleared = `${how.trim()} (${persona}, ${now().slice(0, 16)})`; log(w, persona, 'service.blocker_cleared', woId, how.trim()); return null;
}
/** A Field Intelligence finding becomes evidence with its provenance; a scan replay is never "measured". */
export function attachFinding(w: WX, persona: string, incidentId: string, f: Finding): S.Refusal | null {
  const inc = S.incidentOf(w, incidentId); if (!inc) return { why: ['no such incident'] };
  const n = need(w, persona, 'work.evidence', 'service.fi_evidence', inc.id); if (n) return n;
  const { wo, mine } = assigned(w, persona, inc);
  if (!wo || !mine || inc.state !== 'IN_PROGRESS') return deny(w, persona, 'service.fi_evidence', inc.id, ['the assigned technician attaches evidence while the job is IN_PROGRESS']);
  const list = (sh(w).fiEvidence[wo.id] ||= []);
  if (list.some((x) => x.findingId === f.id)) return deny(w, persona, 'service.fi_evidence', inc.id, ['that finding is already attached']);
  list.push({ at: now(), by: persona, findingId: f.id, text: f.text, provenance: f.provenance });
  wo.evidence.push({ at: now(), by: S.techForPersona(persona) || persona, kind: `Field Intelligence finding · ${f.provenance}`, note: f.text });
  log(w, persona, 'service.fi_evidence', wo.id, `${f.provenance}: ${f.text.slice(0, 140)}`); return null;
}
export function recordResolution(w: WX, persona: string, incidentId: string, code: string, rootCause: string): S.Refusal | null {
  const inc = S.incidentOf(w, incidentId); if (!inc) return { why: ['no such incident'] };
  const n = need(w, persona, ['work.evidence', 'service.close'], 'service.resolution', inc.id); if (n) return n;
  const why: string[] = [];
  if (!['IN_PROGRESS', 'VERIFYING', 'RESOLVED'].includes(inc.state)) why.push(`a resolution is recorded once the work is done (now ${inc.state})`);
  if (!RESOLUTION_CODES[code]) why.push('choose a resolution code');
  if (rootCause.trim().length < 10) why.push('state the root cause in a sentence (at least 10 characters)');
  if (why.length) return deny(w, persona, 'service.resolution', inc.id, why);
  sh(w).resolution[inc.id] = { code, rootCause: rootCause.trim().slice(0, 300), by: persona, at: now() };
  log(w, persona, 'service.resolution', inc.id, `${code} · ${rootCause.trim().slice(0, 140)}`); return null;
}
/** Close, with the customer policy of the shared store; a resolution code and root cause come first. */
export function closeIncident(w: WX, persona: string, incidentId: string, confirmed: boolean): S.Refusal | null {
  const inc = S.incidentOf(w, incidentId); if (!inc) return { why: ['no such incident'] };
  if (!sh(w).resolution[inc.id] && holds(persona, 'service.close')) return deny(w, persona, 'service.closed', inc.id, ['record the resolution code and root cause before closing']);
  return S.close(w, persona, inc.id, confirmed);
}
export function cancelWorkOrder(w: WX, persona: string, incidentId: string, reason: string): S.Refusal | null {
  const inc = S.incidentOf(w, incidentId); if (!inc) return { why: ['no such incident'] };
  const n = need(w, persona, 'service.assign', 'service.cancelled', inc.id); if (n) return n;
  const wo = inc.workOrderId ? S.workOrderOf(w, inc.workOrderId) : undefined;
  const why: string[] = [];
  if (!wo) why.push('there is no work order to cancel');
  if (['RESOLVED', 'CLOSED', 'CANCELLED', 'VERIFYING'].includes(inc.state)) why.push(`a ${inc.state} job is not cancelled${inc.state === 'VERIFYING' ? ': the verifier decides it' : ''}`);
  if (reason.trim().length < 8) why.push('a cancellation records its reason');
  if (why.length) return deny(w, persona, 'service.cancelled', inc.id, why);
  sh(w).cancelled[wo!.id] = { reason: reason.trim(), by: persona, at: now(), prevState: inc.state };
  wo!.state = 'CANCELLED'; inc.state = 'CANCELLED'; inc.history.push({ to: 'CANCELLED', at: now(), by: persona });
  log(w, persona, 'service.cancelled', wo!.id, reason.trim()); return null;
}

export const STAGES = ['Request', 'Intake', 'Triage', 'Matching', 'Assignment', 'Dispatch', 'Execution', 'Evidence', 'Validation', 'Resolution', 'Closure', 'Learning'] as const;
export function stageOf(w: WX, inc: S.Incident): number {
  const wo = inc.workOrderId ? S.workOrderOf(w, inc.workOrderId) : undefined; const res = shView(w).resolution[inc.id];   // read-only: stageOf runs while drawing
  switch (inc.state) {
    case 'OPEN': case 'REOPENED': return 2; case 'TRIAGED': return 3; case 'ASSIGNED': return 4; case 'ACCEPTED': return 5;
    case 'IN_PROGRESS': return wo?.evidence.length ? 7 : 6; case 'VERIFYING': return 8; case 'RESOLVED': return res ? 10 : 9;
    case 'CLOSED': return 11; default: return 0;
  }
}

/**
 * How a job is routed — rule-based, every reason stated on the job (V2.5.3's "How requests are routed", on this workspace's records).
 * The first rule that holds decides; the reason names the record that made it hold.
 */
export const ROUTES = {
  diagnose: { label: 'Diagnose first', tone: 'apex', rule: 'A recurrence of a closed job in the same room: APEX diagnoses the cause before another visit, so the same fix is not repeated.' },
  engineered: { label: 'Engineered service', tone: 'info', rule: 'High severity, or work that changes the commissioned configuration (a DSP change, a network change, a replacement): an engineer approves the method and the room is reverified.' },
  quick: { label: 'Quick service', tone: 'teal', rule: 'A known like-for-like fix at standard severity that leaves the room as it was commissioned.' },
} as const;
export type RouteKey = keyof typeof ROUTES;
const CHANGES_CONFIG = new Set(['dsp_upgrade', 'network_change', 'camera_replacement', 'lifecycle_replacement']);
export function routeOf(w: WX, inc: S.Incident): { key: RouteKey; why: string } {
  if (inc.recurrenceOf) return { key: 'diagnose', why: `recurrence of ${inc.recurrenceOf}` };
  const wo = inc.workOrderId ? S.workOrderOf(w, inc.workOrderId) : undefined;
  if (wo && CHANGES_CONFIG.has(wo.workType)) return { key: 'engineered', why: `${wo.workType.replace(/_/g, ' ')} changes the commissioned configuration` };
  if (inc.severity !== 'Standard') return { key: 'engineered', why: `${inc.severity} severity` };
  return { key: 'quick', why: wo ? `${wo.workType.replace(/_/g, ' ')} at standard severity` : 'standard severity, no configuration change asked' };
}
/** The board's lanes: the twelve stages grouped by where the work is. */
export const LANES: Array<{ key: string; title: string; stages: number[] }> = [
  { key: 'intake', title: 'Intake and triage', stages: [0, 1, 2] },
  { key: 'match', title: 'Matching and dispatch', stages: [3, 4, 5] },
  { key: 'field', title: 'In the field', stages: [6, 7] },
  { key: 'verify', title: 'Verify and resolve', stages: [8, 9] },
  { key: 'close', title: 'Closure and learning', stages: [10, 11] },
];
