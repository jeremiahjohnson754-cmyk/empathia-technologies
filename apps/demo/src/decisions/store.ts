/**
 * Decisions for the investor demonstration: the Decision desk (approve, hold or reject a project against its scope revision; fund it
 * separately; nothing moves to the field without both) on @empathia/project-governance's transition table and guards, and Decision
 * Memory (who decided what, the options weighed, why, and what happened after). Synthetic projects; kept in this browser only.
 */
import { GOVERNANCE_TRANSITIONS, governanceBlockers, type GovernanceState } from '@empathia/project-governance';
import { holds, personaLabel } from '../build/store.js';

export interface Project { id: string; name: string; roomId: string | null; state: GovernanceState; scopeRev: number; pitchRev: number; brief: { rev: number; scopeRev: number; authorId: string }; approverId: string; romUsd: number; summary: string }
export interface DeskDecision { id: string; projectId: string; decision: 'APPROVED' | 'HELD' | 'REJECTED'; by: string; scopeRev: number; pitchRev: number; reason: string; reviewDate: string | null; at: string }
export interface Funding { projectId: string; amount: number; currency: string; costCenter: string; scopeRev: number; by: string; at: string }
export interface Memory { id: string; name: string; on: string | null; options: string[]; why: string; by: string; at: string; after: string | null; seeded: boolean }
export interface DecisionState { v: 1; projects: Project[]; decisions: DeskDecision[]; funding: Funding[]; memory: Memory[]; events: Array<{ at: string; by: string; type: string; aggregate: string; detail: string; outcome: 'ALLOWED' | 'DENIED' }>; seq: number }
export type Refusal = { why: string[] };
const KEY = 'empathia.demo.decisions.v1';
const now = () => new Date().toISOString();
const ago = (d: number) => new Date(Date.now() - d * 864e5).toISOString();

export function seed(): DecisionState {
  return { v: 1, seq: 4, events: [], funding: [], decisions: [
    { id: 'DD-0001', projectId: 'PRJ-NST-SIG', decision: 'HELD', by: 'exec', scopeRev: 1, pitchRev: 1, reason: 'Wait for the wayfinding study before choosing display locations', reviewDate: ago(-21).slice(0, 10), at: ago(9) },
  ], projects: [
    { id: 'PRJ-ATLAS-AV', name: 'Atlas Tower AV refresh', roomId: 'R-ATL-4-218', state: 'DECISION_PENDING', scopeRev: 2, pitchRev: 3, brief: { rev: 3, scopeRev: 2, authorId: 'opslead' }, approverId: 'exec', romUsd: 186000, summary: 'Boardroom and two huddle rooms brought back to the room standard; audio processing replaced.' },
    { id: 'PRJ-NST-TWN', name: 'Northstar Town Hall audio', roomId: 'R-NST-2-101', state: 'DECISION_PENDING', scopeRev: 1, pitchRev: 1, brief: { rev: 1, scopeRev: 1, authorId: 'exec' }, approverId: 'exec', romUsd: 92000, summary: 'Speech intelligibility in the rear third of the hall; the brief was written by the sponsor.' },
    { id: 'PRJ-ATL-CAM', name: 'Atlas 4.218 camera replacement', roomId: 'R-ATL-4-218', state: 'APPROVED', scopeRev: 1, pitchRev: 1, brief: { rev: 1, scopeRev: 1, authorId: 'syseng' }, approverId: 'exec', romUsd: 14500, summary: 'Like-for-like camera replacement at position PA-0106 (asset AS-0112), with reverification.' },
    { id: 'PRJ-NST-SIG', name: 'Northstar signage', roomId: null, state: 'HELD', scopeRev: 1, pitchRev: 1, brief: { rev: 1, scopeRev: 1, authorId: 'opslead' }, approverId: 'exec', romUsd: 41000, summary: 'Lobby and corridor displays for wayfinding and priority messages.' },
  ], memory: [
    { id: 'DEC-0001', name: 'Retest both rear-row fixes in one visit', on: 'R-ATL-4-218', options: ['Two visits, one per fix', 'One visit, both fixes, one retest'], why: 'Each visit closes the boardroom for half a day; one retest proves both fixes against the same baseline.', by: 'syseng', at: ago(30), after: 'Both fixes passed in one visit; the room reopened a day early.', seeded: true },
    { id: 'DEC-0002', name: 'Replace the boardroom camera like-for-like', on: 'PRJ-ATL-CAM', options: ['Like-for-like unit', 'New model with auto-framing'], why: 'A like-for-like unit keeps the position and its presets; a new model would be a design change and need recommissioning of the room.', by: 'syseng', at: ago(12), after: null, seeded: true },
    { id: 'DEC-0003', name: 'Keep the viewing-distance exception as a proposal', on: 'R-ATL-4-218', options: ['Accept EXC-4218-01 now', 'Keep it proposed until an independent reviewer approves'], why: 'The source requirement must permit an exception and an independent reviewer must approve it with evidence and scope.', by: 'architect', at: ago(2), after: null, seeded: true },
  ] };
}
export function load(): DecisionState { try { const s = localStorage.getItem(KEY); if (s) { const d = JSON.parse(s) as DecisionState; if (d.v === 1 && Array.isArray(d.projects)) return d; } } catch { /* storage unavailable or damaged: start from the seed */ } return seed(); }
export function save(d: DecisionState) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* the state lasts the page */ } }

const log = (d: DecisionState, by: string, type: string, aggregate: string, detail: string, outcome: 'ALLOWED' | 'DENIED' = 'ALLOWED') => { d.events.unshift({ at: now(), by, type, aggregate, detail, outcome }); d.events = d.events.slice(0, 200); };
const deny = (d: DecisionState, by: string, type: string, aggregate: string, why: string[]): Refusal => { log(d, by, type, aggregate, `refused: ${why.join('; ')}`, 'DENIED'); return { why }; };

export const MEMORY_AUTHORITIES = ['project.decide', 'brief.approve', 'baseline.approve', 'service.triage', 'scope.revise', 'pitch.submit', 'case.approve'];
export const funded = (d: DecisionState, id: string) => d.funding.find((f) => f.projectId === id) || null;
/** Field work needs both an approval and funding against the same scope revision. */
export function fieldReady(d: DecisionState, p: Project): { ok: boolean; why: string } {
  const f = funded(d, p.id);
  if (!['APPROVED', 'FUNDED'].includes(p.state)) return { ok: false, why: `not approved (${p.state.replace('_', ' ').toLowerCase()})` };
  if (!f) return { ok: false, why: 'approved, not funded' };
  if (f.scopeRev !== p.scopeRev) return { ok: false, why: `funding is for scope revision ${f.scopeRev}, the project is at ${p.scopeRev}` };
  return { ok: true, why: `approved and funded for scope revision ${p.scopeRev}` };
}

export function decide(d: DecisionState, persona: string, projectId: string, decision: 'approve' | 'hold' | 'reject', reason: string, reviewDate: string | null): Refusal | null {
  const p = d.projects.find((x) => x.id === projectId); if (!p) return { why: ['no such project'] };
  const to = ({ approve: 'APPROVED', hold: 'HELD', reject: 'REJECTED' } as const)[decision];
  if (!holds(persona, 'project.decide')) return deny(d, persona, 'project.approval_decided', p.id, [`${personaLabel(persona)} does not hold project.decide`]);
  const why = governanceBlockers(to, { state: p.state, scopeRev: p.scopeRev, request: { siteCode: 'SITE-NORTH', type: 'room_refresh', intent: 'x', photoPolicy: null, photos: 0 }, routedVendorId: null, brief: p.brief, approverId: p.approverId, approverEligible: true, decision: { decision: to, reason: reason.trim() || (to === 'APPROVED' ? `approved as pitched (pitch v${p.pitchRev}, scope revision ${p.scopeRev})` : ''), reviewDate, scopeRev: p.scopeRev }, actorId: persona, delegated: false, delegationExpired: false });
  if (decision === 'hold' && reviewDate && reviewDate <= now().slice(0, 10)) why.push('the review date must be in the future');
  if (why.length) return deny(d, persona, 'project.approval_decided', p.id, why);
  p.state = to;
  const id = `DD-${String(++d.seq).padStart(4, '0')}`;
  d.decisions.unshift({ id, projectId: p.id, decision: to, by: persona, scopeRev: p.scopeRev, pitchRev: p.pitchRev, reason: reason.trim() || `approved as pitched (pitch v${p.pitchRev}, scope revision ${p.scopeRev})`, reviewDate, at: now() });
  log(d, persona, 'project.approval_decided', p.id, `${to} · scope revision ${p.scopeRev} · ${reason.trim() || 'as pitched'}`); return null;
}
export function fund(d: DecisionState, persona: string, projectId: string, f: { amount: number; currency: string; costCenter: string; scopeRev: number }): Refusal | null {
  const p = d.projects.find((x) => x.id === projectId); if (!p) return { why: ['no such project'] };
  if (!holds(persona, 'funding.authorize')) return deny(d, persona, 'project.funding_authorized', p.id, [`${personaLabel(persona)} does not hold funding.authorize (Finance / Budget Authority)`]);
  const why = governanceBlockers('FUNDED', { state: p.state, scopeRev: p.scopeRev, request: { siteCode: 'x', type: 'x', intent: 'x', photoPolicy: null, photos: 0 }, routedVendorId: null, brief: p.brief, approverId: p.approverId, approverEligible: true, actorId: persona, delegated: false, delegationExpired: false, funding: { amount: f.amount, currency: f.currency || null, costCenter: f.costCenter.trim() || null, scopeRev: f.scopeRev } });
  if (why.length) return deny(d, persona, 'project.funding_authorized', p.id, why);
  p.state = 'FUNDED'; d.funding.unshift({ projectId: p.id, amount: f.amount, currency: f.currency, costCenter: f.costCenter.trim(), scopeRev: f.scopeRev, by: persona, at: now() });
  log(d, persona, 'project.funding_authorized', p.id, `${f.currency} ${f.amount} · ${f.costCenter} · scope revision ${f.scopeRev}`); return null;
}
export function record(d: DecisionState, persona: string, m: { name: string; on: string | null; options: string; why: string }): Refusal | { id: string } {
  if (!MEMORY_AUTHORITIES.some((a) => holds(persona, a))) return deny(d, persona, 'decision.recorded', '-', [`${personaLabel(persona)} does not record decisions here`]);
  const why: string[] = [];
  if (m.name.trim().length < 6) why.push('say what was decided (at least 6 characters)'); if (m.name.length > 140) why.push('keep what was decided under 140 characters');
  if (m.why.trim().length < 10) why.push('the rationale is required (at least 10 characters)'); if (m.why.length > 250) why.push('keep the rationale under 250 characters');
  if (why.length) return deny(d, persona, 'decision.recorded', '-', why);
  const id = `DEC-U${String(d.memory.filter((x) => !x.seeded).length + 1).padStart(3, '0')}`;
  d.memory.unshift({ id, name: m.name.trim(), on: m.on || null, options: m.options.split(';').map((x) => x.trim()).filter(Boolean).slice(0, 4), why: m.why.trim(), by: persona, at: now(), after: null, seeded: false });
  log(d, persona, 'decision.recorded', id, m.name.trim()); return { id };
}
export const mayWithdraw = (m: Memory, persona: string) => persona === 'architect' || m.by === persona;
export function withdraw(d: DecisionState, persona: string, id: string): Refusal | null {
  const m = d.memory.find((x) => x.id === id); if (!m) return { why: ['no such decision'] };
  if (!mayWithdraw(m, persona)) return deny(d, persona, 'decision.withdrawn', id, ['only the person who recorded a decision (or the Product Architect) withdraws it']);
  d.memory = d.memory.filter((x) => x.id !== id); log(d, persona, 'decision.withdrawn', id, m.name); return null;
}
export const decidable = (p: Project) => GOVERNANCE_TRANSITIONS.some((t) => t.from === p.state && t.authority === 'project.decide');
