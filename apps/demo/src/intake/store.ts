/**
 * Sending a request, and following it. A request for a room becomes a project on the decision desk (SUBMITTED: nothing is approved,
 * funded or designed by asking). A request for equipment, a replacement or an event setup goes to ServiceHands as a job. The request
 * keeps a link to what it became, so the person who asked can follow it in their own words without opening either workspace.
 * Kept in this browser only, like the rest of the demonstration; synthetic.
 */
import type { Workspace } from '../workspace/store.js';
import * as S from '../workspace/store.js';
import { load as loadDesk, save as saveDesk, type DecisionState } from '../decisions/store.js';
import { fullName, roomById } from '../campus/canon.js';
import type { RoleKey } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import { kindOf, problems, propose, summarise, type Draft, type Goes, type KindId } from './model.js';

export interface Request { id: string; kind: KindId; goes: Goes; title: string; summary: string; role: RoleKey; at: string; roomId: string | null; projectId: string | null; incidentId: string | null; equipment: Array<{ label: string; count: number; added: number }>; tests: number; date: string | null }
export type Refusal = { why: string[] };
const KEY = 'empathia.demo.requests.v1';
/** The roles the portal admits (registry: intake.request). A request is a request: who asked is recorded, and nothing is granted by asking. */
export const PORTAL_ROLES: readonly RoleKey[] = ['employee', 'exec', 'bpm', 'ops', 'svcmgr', 'syseng', 'designer', 'architect'];
export const mayRequest = (role: RoleKey) => PORTAL_ROLES.includes(role);

export function loadRequests(): Request[] { try { const s = localStorage.getItem(KEY); const l = s ? (JSON.parse(s) as Request[]) : []; return Array.isArray(l) ? l.filter((r) => r && typeof r.id === 'string') : []; } catch { return []; } }
const saveRequests = (l: Request[]) => { try { localStorage.setItem(KEY, JSON.stringify(l.slice(0, 60))); } catch { /* the list lasts the page */ } };

/**
 * Send the request. `w` is the workspace copy being changed (useWorkspace().apply); the decision desk is read and written here.
 * Refused, with the reasons, when the draft is incomplete or the role is not one the portal admits.
 */
export function send(w: Workspace, role: RoleKey, d: Draft, desk: DecisionState = loadDesk()): Refusal | Request {
  if (!mayRequest(role)) return { why: [`The ${ROLES[role].label} does not raise requests here.`] };
  const k = kindOf(d.kind); if (k.goes === 'scouter' || k.goes === 'optimizer') return { why: ['This kind of question opens a tool; it is not sent as a request.'] };
  const errs = Object.values(problems(d)); if (errs.length) return { why: errs };
  const p = propose(d); const { title, summary } = summarise(d, p); const all = loadRequests(); const n = all.reduce((m, r) => Math.max(m, Number(r.id.slice(4)) || 0), 0) + 1; const id = `REQ-${String(n).padStart(4, '0')}`;
  const o = roomById(d.roomId); const who = `Asked by the ${ROLES[role].label} through the request portal (${id}).`;
  const req: Request = { id, kind: d.kind, goes: k.goes, title, summary, role, at: new Date().toISOString(), roomId: o?.id || null, projectId: null, incidentId: null, equipment: (p?.equipment || []).map((e) => ({ label: e.label, count: e.count, added: e.added })), tests: p?.tests.added || 0, date: d.kind === 'event' ? d.date : null };
  if (k.goes === 'desk') {
    const pid = `PRJ-${id}`; desk.projects.push({ id: pid, name: title, roomId: o?.id || null, state: 'SUBMITTED', scopeRev: 1, pitchRev: 0, brief: { rev: 0, scopeRev: 1, authorId: 'requestor' }, approverId: 'exec', romUsd: 0, summary: `${summary} ${who}` });
    desk.events.unshift({ at: req.at, by: 'requestor', type: 'request.submitted', aggregate: pid, detail: `${title} · ${who}`, outcome: 'ALLOWED' }); saveDesk(desk); req.projectId = pid;
  } else {
    if (!o) return { why: ['Choose the room.'] };
    // raised as a requestor: asking is the one thing every admitted role may do; the job's own steps keep their own authorities
    const verb = d.kind === 'replace-device' ? 'Replace' : d.kind === 'event' ? 'Set up' : 'Install';
    const out = S.raiseIncident(w, 'requestor', { roomId: o.id, roomName: fullName(o), buildingKey: o.building, title: `${verb}: ${title}`.slice(0, 118), summary: `${summary} ${who}` });
    if ('why' in out) return out; req.incidentId = out.id;
  }
  saveRequests([req, ...all]); return req;
}

const DESK_WORDS: Record<string, [string, 'info' | 'ok' | 'warn' | 'bad']> = {
  DRAFT: ['Not sent yet', 'info'], SUBMITTED: ['Sent. Waiting for an engineer to review it', 'info'], VENDOR_ACKNOWLEDGED: ['Acknowledged by the delivery partner', 'info'], INTERNAL_ROUTE_RECORDED: ['Being handled by the internal team', 'info'], PITCH_READY: ['The proposal is written', 'info'],
  DECISION_PENDING: ['With the approver for a decision', 'warn'], APPROVED: ['Approved. Waiting for funding', 'ok'], HELD: ['On hold', 'warn'], REJECTED: ['Not approved', 'bad'], FUNDED: ['Funded. Design and installation follow', 'ok'], SUSPENDED: ['Funding withdrawn', 'bad'],
};
const JOB_WORDS: Record<string, [string, 'info' | 'ok' | 'warn' | 'bad']> = {
  OPEN: ['In the ServiceHands queue', 'info'], TRIAGED: ['Reviewed. Waiting for a technician', 'info'], ASSIGNED: ['A technician is assigned', 'info'], ACCEPTED: ['The technician has accepted the job', 'info'], IN_PROGRESS: ['Work is under way', 'warn'], VERIFYING: ['Done. Being checked', 'warn'],
  RESOLVED: ['Done and checked', 'ok'], CLOSED: ['Closed', 'ok'], REOPENED: ['Reopened', 'warn'], CANCELLED: ['Cancelled', 'bad'],
};
/** Where a request stands now, read from what it became; in the asker's words, with the reason when someone gave one. */
export function standing(r: Request, w: Workspace, desk: DecisionState = loadDesk()): { words: string; tone: 'info' | 'ok' | 'warn' | 'bad'; state: string; href: string | null; where: string; reason: string | null } {
  if (r.projectId) { const p = desk.projects.find((x) => x.id === r.projectId); if (!p) return { words: 'The project is no longer on the desk', tone: 'bad', state: 'GONE', href: null, where: 'Decision desk', reason: null };
    const dec = desk.decisions.filter((x) => x.projectId === p.id).sort((a, b) => b.at.localeCompare(a.at))[0]; const [words, tone] = DESK_WORDS[p.state] || [p.state, 'info'];
    return { words, tone, state: p.state, href: '#/intake', where: 'Decision desk', reason: dec && (p.state === 'HELD' || p.state === 'REJECTED') ? dec.reason : null }; }
  if (r.incidentId) { const i = S.incidentOf(w, r.incidentId); if (!i) return { words: 'The job is no longer in ServiceHands', tone: 'bad', state: 'GONE', href: null, where: 'ServiceHands', reason: null };
    const [words, tone] = JOB_WORDS[i.state] || [i.state, 'info']; return { words, tone, state: i.state, href: '#/servicehands', where: 'ServiceHands', reason: null }; }
  return { words: 'Sent', tone: 'info', state: 'SENT', href: null, where: '', reason: null };
}
