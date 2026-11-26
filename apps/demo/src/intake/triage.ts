/**
 * The professional side of Intake, first part (founder directive 19 Nov 2026 §06 AV Operations Lead and Site Champion, §05 J, §10):
 * routing a request made in the person's own words, asking the requester a question, closing a duplicate with its reason, and confirming
 * where a provisional space is. Each is a recorded event on the request (request.triaged, request.clarification_requested,
 * request.clarification_answered, request.closed, location.verified), by a role entitled to it; the request keeps the person's original
 * words whatever it becomes (§05 J: "Support classification correction and rerouting without losing the original request").
 *
 * Nothing here approves, funds or assigns: routing to the decision desk makes a SUBMITTED project, routing to ServiceHands an OPEN job.
 * Kept in this browser; synthetic.
 */
import type { RoleKey } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import type { Workspace } from '../workspace/store.js';
import * as S from '../workspace/store.js';
import { load as loadDesk, save as saveDesk, type DecisionState } from '../decisions/store.js';
import { fullName, roomById } from '../campus/canon.js';
import { loadRecords, stateOf, send, type Request, type RequestEvent, type Question, type Triage } from './store.js';
import { blank } from './model.js';

/** Who may route requests and ask the requester questions: the operations lead's work, which the systems engineer, the service manager and
 *  the platform architect share (directive §06). */
export const TRIAGE_ROLES: readonly RoleKey[] = ['ops', 'syseng', 'svcmgr', 'architect'];
/** Who may confirm where a provisional space is: the site's champion, or an engineer who has been there (directive §06 Site Champion:
 *  "Location verification when authorized"). */
export const VERIFY_ROLES: readonly RoleKey[] = ['sitechamp', 'syseng', 'ops', 'architect'];
export type Refusal = { why: string[] };
export type { Question, Triage };

const KEY = 'empathia.demo.requests.v1';
const write = (l: Request[]) => { try { localStorage.setItem(KEY, JSON.stringify(l.slice(0, 60))); return true; } catch { return false; } };
const ev = (r: Request, type: string, by: RoleKey, detail: string): RequestEvent => ({ v: 1, at: new Date().toISOString(), type, by, detail, correlation: r.id });
type Rec = Request;
function change(id: string, fn: (r: Rec) => Rec | Refusal): Rec | Refusal {
  const all = loadRecords() as Rec[]; const at = all.findIndex((r) => r.id === id); if (at < 0) return { why: [`${id} is not here.`] };
  const out = fn(all[at]!); if ('why' in out) return out; return write(all.map((x, i) => (i === at ? out : x))) ? out : { why: ['This browser could not keep the change: its storage is full or switched off.'] };
}
export const questionOf = (r: Request): Question | null => r.question || null;
export const triageOf = (r: Request): Triage | null => r.triage || null;
/** A request waits on the person who asked when it carries a question they have not answered. */
export const awaitsRequester = (r: Request): boolean => { const q = questionOf(r); return !!q && !q.answer; };

/** What waits for triage: requests in the person's own words not yet routed, newest first; then provisional spaces whose location is not
 *  confirmed. */
export function queue(): { route: Request[]; verify: Request[]; asked: Request[] } {
  const sent = loadRecords().filter((r) => stateOf(r) === 'SUBMITTED');
  return { route: sent.filter((r) => r.goes === 'triage' && !triageOf(r) && !awaitsRequester(r)), asked: sent.filter((r) => awaitsRequester(r)), verify: sent.filter((r) => r.provisional && r.provisional.location !== 'VERIFIED') };
}

/** Ask the requester a question. The request waits for them (its standing says so) until they answer. */
export function ask(role: RoleKey, id: string, text: string): Rec | Refusal {
  if (!TRIAGE_ROLES.includes(role)) return { why: [`The ${ROLES[role].label} does not triage requests.`] };
  const t = text.trim(); if (t.length < 8 || t.length > 400) return { why: ['Ask the question in a sentence (8 to 400 characters).'] };
  return change(id, (r) => { if (stateOf(r) !== 'SUBMITTED') return { why: [`${id} is not a sent request.`] }; if (awaitsRequester(r)) return { why: [`${id} already has a question waiting for an answer.`] };
    return { ...r, question: { text: t, by: role, at: new Date().toISOString(), answer: null }, history: [...(r.history || []), ev(r, 'request.clarification_requested', role, t)] }; });
}
/** The requester answers. Only the role that asked for the request answers its question. */
export function answer(role: RoleKey, id: string, text: string): Rec | Refusal {
  const t = text.trim(); if (t.length < 2 || t.length > 600) return { why: ['Answer in a few words (up to 600 characters).'] };
  return change(id, (r) => { if (r.role !== role) return { why: [`Only the ${ROLES[r.role].label} who asked for ${id} answers its questions.`] }; const q = r.question; if (!q || q.answer) return { why: ['There is no question waiting.'] };
    return { ...r, question: { ...q, answer: { text: t, at: new Date().toISOString(), by: role } }, history: [...(r.history || []), ev(r, 'request.clarification_answered', role, t)] }; });
}

/** Route a request made in the person's own words: to the decision desk as a project, or to ServiceHands as a job for a room. The
 *  person's words stay the request's own; the routing is recorded with the note that explains it. */
export function route(w: Workspace, role: RoleKey, id: string, to: 'desk' | 'servicehands', note: string, roomId: string | null, desk: DecisionState = loadDesk()): Rec | Refusal {
  if (!TRIAGE_ROLES.includes(role)) return { why: [`The ${ROLES[role].label} does not triage requests.`] };
  const n = note.trim(); if (n.length < 6) return { why: ['Say in a few words why it goes there (it is shown to the person who asked).'] };
  const room = roomId ? roomById(roomId) : null; if (to === 'servicehands' && !room) return { why: ['A job in ServiceHands needs the room.'] };
  return change(id, (r) => {
    if (stateOf(r) !== 'SUBMITTED' || r.goes !== 'triage') return { why: [`${id} is not waiting to be routed.`] }; if (triageOf(r)) return { why: [`${id} was routed already.`] };
    if (awaitsRequester(r)) return { why: [`${id} is waiting for the answer to a question.`] };
    const who = `Routed by the ${ROLES[role].label} from request ${r.id} (the person's own words: “${(r.need || r.summary).slice(0, 200)}”).`; const now = new Date().toISOString(); let projectId: string | null = null; let incidentId: string | null = null;
    if (to === 'desk') { projectId = `PRJ-${r.id}`; desk.projects.push({ id: projectId, name: r.title, roomId: room?.id || null, state: 'SUBMITTED', scopeRev: 1, pitchRev: 0, brief: { rev: 0, scopeRev: 1, authorId: 'requestor' }, approverId: 'exec', romUsd: 0, summary: `${r.summary} ${who} ${n}` });
      desk.events.unshift({ at: now, by: role, type: 'request.triaged', aggregate: projectId, detail: `${r.title} · ${who}`, outcome: 'ALLOWED' }); saveDesk(desk); }
    else { const out = S.raiseIncident(w, 'requestor', { roomId: room!.id, roomName: fullName(room!), buildingKey: room!.building, title: r.title.slice(0, 118), summary: `${r.summary} ${who} ${n}` }); if ('why' in out) return out; incidentId = out.id; }
    return { ...r, roomId: room?.id || r.roomId, projectId, incidentId, triage: { outcome: to, by: role, at: now, note: n, duplicateOf: null }, history: [...(r.history || []), ev(r, 'request.triaged', role, `${to === 'desk' ? `To the decision desk as project ${projectId}` : `To ServiceHands as job ${incidentId}`}: ${n}`)] };
  });
}
/** Close a request without routing it: a duplicate of another (named), or not something Intake handles, always with the reason. */
export function close(role: RoleKey, id: string, reason: string, duplicateOf: string | null): Rec | Refusal {
  if (!TRIAGE_ROLES.includes(role)) return { why: [`The ${ROLES[role].label} does not triage requests.`] };
  const n = reason.trim(); if (n.length < 8) return { why: ['Say why, in a sentence: the person who asked reads it.'] };
  if (duplicateOf && !loadRecords().some((x) => x.id === duplicateOf && x.id !== id)) return { why: [`${duplicateOf} is not a request here.`] };
  return change(id, (r) => { if (stateOf(r) !== 'SUBMITTED' || r.goes !== 'triage' || triageOf(r)) return { why: [`${id} is not waiting to be routed.`] };
    return { ...r, triage: { outcome: 'closed', by: role, at: new Date().toISOString(), note: n, duplicateOf }, history: [...(r.history || []), ev(r, 'request.closed', role, `${duplicateOf ? `Same as ${duplicateOf}. ` : ''}${n}`)] }; });
}
/** Confirm where a provisional space is, with what was seen. The space stays provisional (requested, not built); only its location is
 *  now verified, by whom and when. */
export function verifyLocation(role: RoleKey, id: string, note: string): Rec | Refusal {
  if (!VERIFY_ROLES.includes(role)) return { why: [`The ${ROLES[role].label} does not confirm locations.`] };
  const n = note.trim(); if (n.length < 8) return { why: ['Say what you saw, in a sentence: “Visited; the old print room on floor 2, east side.”'] };
  return change(id, (r) => { const p = r.provisional; if (!p) return { why: [`${id} has no provisional space.`] }; if (p.location === 'VERIFIED') return { why: ['Its location is already confirmed.'] };
    if (role === r.role) return { why: ['The person who asked for the space does not also confirm where it is.'] };
    return { ...r, provisional: { ...p, location: 'VERIFIED', verifiedBy: role, verifiedAt: new Date().toISOString(), verifiedNote: n }, history: [...(r.history || []), ev(r, 'location.verified', role, `${p.id}: ${n}`)] }; });
}

/** The Living Campus examples (directive §20 Deliverable D: "credible, deterministic example requests … Enterprise, Stadium, University,
 *  and Convention contexts"): five requests, the same engine, different places and people. Added to this browser only when someone asks for
 *  them, each sent by the role named, marked as an example wherever it is listed. Fictional venues and synthetic data. */
export const EXAMPLES: Array<{ key: string; context: 'Enterprise' | 'University' | 'Stadium' | 'Convention'; role: RoleKey; draft: () => ReturnType<typeof blank> }> = [
  { key: 'ex-enterprise-room', context: 'Enterprise', role: 'sitechamp', draft: () => blank('new-room', { need: 'The design team on level 3 needs a project room where eight people can review drawings with colleagues joining on video.', use: 'meet', people: 8, building: 'ATL', floor: 3, goals: ['video', 'present'], place: { name: 'Level 3 project room', building: '' } }) },
  { key: 'ex-enterprise-camera', context: 'Enterprise', role: 'employee', draft: () => blank('add-devices', { need: 'People at the far end of the boardroom table cannot see the shared screen; a second display would help.', roomId: 'R-ATL-4-218', building: 'ATL', adds: [{ cat: 'display', qty: 1 }], goals: ['displays'] }) },
  { key: 'ex-university', context: 'University', role: 'bpm', draft: () => blank('change-room', { need: 'The tiered lecture hall should let remote students ask questions and be heard by everyone in the room.', roomId: 'R-HFD-1-110', building: 'HFD', goals: ['teach', 'audio', 'access'], when: 'half' }) },
  { key: 'ex-stadium', context: 'Stadium', role: 'exec', draft: () => blank('general', { need: 'Harborlight Stadium needs its press conference room ready for live-streamed briefings before the season opener. It is not in the campus records yet.', goals: [] }) },
  { key: 'ex-convention', context: 'Convention', role: 'ops', draft: () => blank('general', { need: 'Hall A of the Larkspur Exchange Convention Center needs a temporary streaming setup for the keynote, and the gear returned afterward.', goals: [] }) },
];
/** Add the examples that are not here yet. Each is sent through the same `send` as any request (its project or job is created the same way). */
export function addExamples(w: Workspace, desk: DecisionState = loadDesk()): { added: string[]; refused: string[] } {
  const have = new Set(loadRecords().map((r) => r.example).filter(Boolean)); const added: string[] = []; const refused: string[] = [];
  for (const x of EXAMPLES) { if (have.has(x.key)) continue; const r = send(w, x.role, x.draft(), desk); if ('why' in r) { refused.push(`${x.key}: ${r.why.join(' ')}`); continue; }
    change(r.id, (q) => ({ ...q, example: x.key, history: [...(q.history || []), ev(q, 'request.example_marked', x.role, `${x.context} example from the Living Campus (synthetic)`)] })); added.push(r.id); }
  return { added, refused };
}
