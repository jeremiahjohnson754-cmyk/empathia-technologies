/**
 * Writing down what happened in the room (#/here, the last step). Three outcomes, each written where the people who need it will
 * find it:
 *   fixed     — the person fixed it with a step: kept in the room's history (this browser) and in the workspace ledger, so the next
 *               person and the technicians see that it happened, how often, and which step worked.
 *   reported  — it is still wrong: a ServiceHands job, raised with the steps already tried and the equipment the symptom points at,
 *               so the technician does not start from nothing. The shared store decides recurrence, as for any job.
 *   joined    — it is already reported: nothing new is raised; "seen again" is added to that job with what this person tried.
 * Who may report is V2.5.3's rule (AZ_ACTION issue.report), asked of the policy here as well as on the page: a role without it is
 * refused with the reason, and nothing is written. Synthetic; kept in this browser only.
 */
import * as S from '../workspace/store.js';
import { hr, holds, log, personaOf, sh, type WX } from '../hardening/kit.js';
import { allows, ROLES } from '../access/policy.js';
import { fullName, roomById } from '../campus/canon.js';
import { roomRecord } from '../campus/design.js';
import type { RoleKey } from '../registry.types.js';
import { RESULT_WORD, repeats, stepsFor, suspectsOf, symptomOf, type SymptomId, type Visit } from './model.js';

const KEY = 'empathia.demo.here.v1';
export type Refusal = { why: string[] };
export const mayReport = (role: RoleKey) => allows({ action: 'issue.report' }, role);
export const isTechnical = (role: RoleKey) => allows({ field: 'technical' }, role);

export function loadVisits(): Visit[] { try { const s = localStorage.getItem(KEY); const l = s ? (JSON.parse(s) as Visit[]) : []; return Array.isArray(l) ? l.filter((v) => v && typeof v.id === 'string' && typeof v.roomId === 'string' && Array.isArray(v.tried)) : []; } catch { return []; } }
const saveVisits = (l: Visit[]) => { try { localStorage.setItem(KEY, JSON.stringify(l.slice(0, 80))); } catch { /* the list lasts the page */ } };

export interface Outcome { roomId: string; symptom: SymptomId; note: string; tried: Array<{ id: string; result: 'fixed' | 'same' | 'skipped' }>; outcome: 'fixed' | 'reported' | 'joined'; joinId?: string | null }
/** What is wrong with an outcome before it is written; empty when it can be. */
export function outcomeProblems(o: Outcome): string[] {
  const why: string[] = [];
  if (!roomById(o.roomId)) why.push('Choose the room.');
  const s = symptomOf(o.symptom); if (!s) why.push('Say what is wrong.');
  if (o.note.length > 400) why.push('Keep the note under 400 characters.');
  if (s?.id === 'other' && o.outcome !== 'joined' && o.note.trim().length < 8) why.push('Say what you notice in a few words (at least 8 characters).');
  if (o.outcome === 'fixed' && !o.tried.some((t) => t.result === 'fixed')) why.push('Mark the step that fixed it.');
  if (o.outcome === 'joined' && !o.joinId) why.push('Choose the report this belongs to.');
  return why;
}

/** Write the outcome. `w` is the workspace copy being changed (useWorkspace().apply). Returns the visit, or the reasons it was refused. */
export function record(w: S.Workspace, role: RoleKey, o: Outcome): Refusal | Visit {
  const errs = outcomeProblems(o); if (errs.length) return { why: errs };
  const room = roomById(o.roomId)!; const r = roomRecord(room.id)!; const s = symptomOf(o.symptom)!; const tech = isTechnical(role);
  if (o.outcome !== 'fixed' && !mayReport(role)) return { why: [`The ${ROLES[role].label} does not report problems here. Tell your host or the front desk, who can.`] };
  const steps = stepsFor(r, s.id, tech ? 'technician' : 'person'); const text = (id: string) => steps.find((x) => x.id === id)?.do || id;
  const tried = o.tried.filter((t) => steps.some((x) => x.id === t.id)).map((t) => ({ id: t.id, text: text(t.id), result: t.result }));
  const sus = suspectsOf(r, s, w); const all = loadVisits(); const n = all.reduce((m, v) => Math.max(m, Number(v.id.slice(4)) || 0), 0) + 1;
  const persona = personaOf(role); const who = `${ROLES[role].label} in the room`; const note = o.note.trim().slice(0, 400);
  const v: Visit = { id: `VIS-${String(n).padStart(4, '0')}`, roomId: room.id, roomName: fullName(room), role, at: new Date().toISOString(), symptom: s.id, group: s.group, note, tried, outcome: o.outcome, incidentId: null, fixedBy: null, suspects: sus.codes };
  const pairs = tried.map((t) => [t.text, RESULT_WORD[t.result]] as [string, string]);
  if (o.outcome === 'fixed') {
    v.fixedBy = tried.find((t) => t.result === 'fixed')!.text; const again = repeats(all, room.id, s.group) + 1;
    log(w, persona, 'room.fixed_in_room', room.id, `${s.title} · fixed by: ${v.fixedBy}${again > 1 ? ` · ${again} times in 30 days` : ''} · ${who} (${v.id})`);
  } else if (o.outcome === 'joined') {
    const inc = S.incidentOf(w, o.joinId || '');
    if (!inc || inc.roomId !== room.id) return { why: ['That report is not for this room.'] };
    if (['RESOLVED', 'CLOSED', 'CANCELLED'].includes(inc.state)) return { why: [`${inc.id} is ${inc.state.toLowerCase()}. Report it as a new problem so it is looked at again.`] };
    (hr(w as WX).seen[inc.id] ||= []).push({ at: v.at, by: persona, who, note, tried: pairs });
    log(w, persona, 'service.seen_again', inc.id, `${who} saw it again${note ? `: ${note.slice(0, 120)}` : ''} · ${tried.length} step(s) tried (${v.id})`); v.incidentId = inc.id;
  } else {
    // raised with the role's own persona when it may raise a job; otherwise as a requestor, as the request portal does: reporting is the
    // one thing every admitted role may do here, and the job's own steps keep their own authorities
    const by = ['request.submit', 'service.triage', 'work.evidence'].some((a) => holds(persona, a)) ? persona : 'requestor';
    const triedWords = tried.length ? ` Tried in the room: ${tried.map((t, i) => `${i + 1}) ${t.text} ${RESULT_WORD[t.result]}.`).join(' ')}` : ' No step was tried in the room.';
    const points = sus.positions.length ? ` Points at: ${sus.stages.map((g) => g.positions.map((p) => `${p.label} (${p.code})`).join(', ')).join(' → ')}.` : '';
    const out = S.raiseIncident(w, by, { roomId: room.id, roomName: fullName(room), buildingKey: room.building, title: (s.id === 'other' ? note : s.title).slice(0, 118), summary: `${note ? `${note} ` : ''}Reported from the room by the ${ROLES[role].label} (${v.id}).${triedWords}${points}`.slice(0, 1400) });
    if ('why' in out) return out;
    sh(w as WX).intake[out.id] = { entry: who, category: s.group, answers: pairs, attachments: [], assetId: null }; v.incidentId = out.id;
  }
  saveVisits([v, ...all]); return v;
}
