/**
 * The demonstration workspace: one persisted, resettable state shared by ServiceHands, APEX, Learn, Mission Control, Executive
 * intelligence and the Evidence ledger — on the same synthetic estate as Search Party and alongside the Build a Room draft. Every
 * mutation goes through a persona authority check (a perspective shows permissions; it is never authentication) and the shared engines
 * (@empathia/service-engine, @empathia/apex-engine); every outcome, refusals included, is an event in the ledger. Reset returns the
 * workspace to its seed so a demonstration replays identically.
 */
import { SERVICE_TRANSITIONS, WORK_NEEDS, candidates, preflight, serviceBlockers, overlaps, type Staff, type ServiceState, type Check } from '@empathia/service-engine';
import { openCase, act, type Hypothesis, type Outcome, type Layer } from '@empathia/apex-engine';
import * as FI from '@empathia/field-intelligence';
import { holds, personaLabel } from '../build/store.js';

export interface Evt { at: string; by: string; type: string; aggregate: string; detail: string; outcome: 'ALLOWED' | 'DENIED' }
export interface Incident { id: string; roomId: string; roomName: string; buildingKey: string; title: string; summary: string; severity: 'Mission critical' | 'High' | 'Standard'; state: ServiceState; openedAt: string; restoredAt: string | null; closedAt: string | null; recurrenceOf: string | null; reopened: boolean; workOrderId: string | null; apexId: string | null; learnCaseId: string | null; history: Array<{ to: ServiceState; at: string; by: string }>; requesterConfirmed: boolean; verifiedBy: string | null }
export interface WorkOrder { id: string; incidentId: string; roomId: string; buildingKey: string; workType: string; title: string; state: 'OPEN' | 'ASSIGNED' | 'ACCEPTED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'; techId: string | null; window: { from: string; to: string } | null; access: { confirmedBy: string } | null; safety: { briefed: boolean; heightPermit?: boolean } | null; toolsConfirmed: string[]; parts: Array<{ part: string; qty: number }>; evidence: Array<{ at: string; by: string; kind: string; note: string }>; preflight: Check[] | null; openedAt: string }
export interface ApexCase { id: string; incidentId: string; roomId: string; key: string; layers: Array<{ layer: Layer; label: string; observations: string[]; cites: string[] }>; hypotheses: Hypothesis[]; actions: Array<Outcome & { at: string; by: string; hypothesisId: string }>; reviewed: { by: string; at: string; verdict: string } | null; openedAt: string }
export interface LearnCase { id: string; incidentId: string; apexId: string | null; title: string; lesson: string; permission: { by: string; at: string } | null; deidentified: boolean; proposedBy: string; proposedAt: string; smeReview: { decision: 'approve' | 'reject'; by: string; at: string; note: string } | null; state: 'PROPOSED' | 'SME_REVIEWED' | 'REJECTED' | 'APPROVED'; approvedBy: string | null }
export interface Training { drillId: string; at: string; by: string; correct: boolean; elapsedS: number }
export interface Workspace { v: 1; seededAt: string; incidents: Incident[]; workOrders: WorkOrder[]; staff: Staff[]; apexCases: ApexCase[]; learnCases: LearnCase[]; events: Evt[]; training: Training[]; fiSessions: FI.Session[]; licenses: Record<string, boolean>; adapters: Record<string, 'NOT_CONFIGURED' | 'DECLARED' | 'SUPPORTED_VERIFIED'>; stock: Record<string, { onHand: number; checkedAt: string; location: string }>; bookings: Record<string, Array<{ from: string; to: string; title: string }>>; seq: { wo: number; apex: number; learn: number; inc: number; fi: number } }
export type Refusal = { why: string[] };
export const refused = (why: string[]): Refusal => ({ why });
const KEY = 'empathia.demo.workspace.v1';
export const now = () => new Date().toISOString();
const DAY = 864e5;
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 36e5).toISOString();

/** The synthetic seed: the same estate Search Party shows (Atlas Tower / Northstar Annex), invented people. */
export function seed(): Workspace {
  const t0 = now();
  const staff: Staff[] = [
    { id: 'tech-ana', name: 'Ana Reyes (synthetic)', internal: true, buildingKey: 'ATL', sites: ['ATL', 'NST'], skills: { 'SK-SVC-1': { level: 'Advanced', n: 14 }, 'SK-VID-1': { level: 'Working', n: 6 }, 'SK-AUD-2': { level: 'Working', n: 3 } }, certs: { 'cert.av_field': { expires: '2027-04-01' }, 'cert.video': { expires: '2027-02-01' }, 'cert.audio': { expires: '2027-06-01' } }, leave: null, capacity: { remaining: 22 }, pastInRoom: 2 },
    { id: 'tech-ben', name: 'Ben Okafor (synthetic)', internal: true, buildingKey: 'NST', sites: ['NST'], skills: { 'SK-SVC-1': { level: 'Working', n: 5 }, 'SK-NET-3': { level: 'Working', n: 4 } }, certs: { 'cert.av_field': { expires: '2027-01-15' }, 'cert.network': { expires: '2026-12-01' } }, leave: null, capacity: { remaining: 30 } },
    { id: 'tech-cara', name: 'Cara Lind — Brightwater AV (synthetic)', internal: false, orgName: 'Brightwater AV Integration', buildingKey: null, sites: ['ATL'], skills: { 'SK-SVC-1': { level: 'Advanced', n: 20 }, 'SK-AUD-2': { level: 'Advanced', n: 9 }, 'SK-VID-1': { level: 'Working', n: 7 } }, certs: { 'cert.av_field': { expires: '2027-09-01' }, 'cert.audio': { expires: '2027-09-01' }, 'cert.video': { expires: '2027-09-01' } }, leave: null, capacity: { remaining: 12 }, agreement: { id: 'SA-BW-02', status: 'Active', buildings: ['ATL'], domains: ['audio', 'video', 'av'] } },
    { id: 'tech-dev', name: 'Dev Shah (synthetic)', internal: true, buildingKey: 'ATL', sites: ['ATL'], skills: { 'SK-SVC-1': { level: 'Working', n: 8 }, 'SK-VID-1': { level: 'Advanced', n: 11 } }, certs: { 'cert.av_field': { expires: '2026-10-01' }, 'cert.video': { expires: '2027-03-01' } }, leave: { from: ago(-2).slice(0, 10), to: ago(-9).slice(0, 10) }, capacity: { remaining: 18 } },
  ];
  const inc = (id: string, roomId: string, roomName: string, buildingKey: string, title: string, summary: string, severity: Incident['severity'], state: ServiceState, openedDaysAgo: number, extra: Partial<Incident> = {}): Incident => ({ id, roomId, roomName, buildingKey, title, summary, severity, state, openedAt: ago(openedDaysAgo), restoredAt: null, closedAt: null, recurrenceOf: null, reopened: false, workOrderId: null, apexId: null, learnCaseId: null, history: [{ to: 'OPEN', at: ago(openedDaysAgo), by: 'requestor' }], requesterConfirmed: false, verifiedBy: null, ...extra });
  const incidents: Incident[] = [
    inc('ISS-0417', 'R-ATL-4-218', 'Atlas 4.218 Boardroom', 'ATL', 'Far-end audio drops out during long calls', 'Remote participants hear echo and then lose the room for a few seconds, mostly in calls over 40 minutes with more than six microphones open.', 'High', 'OPEN', 3),
    inc('ISS-0421', 'R-ATL-4-220', 'Atlas 4.220 Huddle', 'ATL', 'Camera shows no video in meetings', 'The meeting joins without video; the codec reports no video source; the camera LED is off.', 'Standard', 'TRIAGED', 1, { history: [{ to: 'OPEN', at: ago(1), by: 'requestor' }, { to: 'TRIAGED', at: ago(0, 20), by: 'svcmgr' }] }),
    inc('ISS-0398', 'R-ATL-4-231', 'Atlas 4.231 Training', 'ATL', 'Projector blank at the start of class', 'The display is blank although the source is selected on the panel.', 'Standard', 'CLOSED', 21, { restoredAt: ago(20, 6), closedAt: ago(19), verifiedBy: 'cxeng', requesterConfirmed: true, history: [{ to: 'OPEN', at: ago(21), by: 'requestor' }, { to: 'TRIAGED', at: ago(21), by: 'svcmgr' }, { to: 'ASSIGNED', at: ago(20, 20), by: 'svcmgr' }, { to: 'ACCEPTED', at: ago(20, 19), by: 'tech-ana' }, { to: 'IN_PROGRESS', at: ago(20, 9), by: 'tech-ana' }, { to: 'VERIFYING', at: ago(20, 7), by: 'tech-ana' }, { to: 'RESOLVED', at: ago(20, 6), by: 'cxeng' }, { to: 'CLOSED', at: ago(19), by: 'svcmgr' }] }),
    inc('ISS-0402', 'R-NST-2-101', 'Northstar Town Hall', 'NST', 'Calls dropped in several rooms on the annex switch', 'Three rooms on the same access switch report dropped calls on the same afternoon.', 'High', 'RESOLVED', 12, { restoredAt: ago(11, 2), verifiedBy: 'cxeng', history: [{ to: 'OPEN', at: ago(12), by: 'requestor' }, { to: 'TRIAGED', at: ago(12), by: 'svcmgr' }, { to: 'ASSIGNED', at: ago(11, 22), by: 'svcmgr' }, { to: 'ACCEPTED', at: ago(11, 20), by: 'tech-ben' }, { to: 'IN_PROGRESS', at: ago(11, 8), by: 'tech-ben' }, { to: 'VERIFYING', at: ago(11, 4), by: 'tech-ben' }, { to: 'RESOLVED', at: ago(11, 2), by: 'cxeng' }] }),
    inc('ISS-0380', 'R-ATL-4-218', 'Atlas 4.218 Boardroom', 'ATL', 'Echo reported on a board call', 'An earlier echo report in the same room, closed after a DSP re-tune.', 'Standard', 'CLOSED', 45, { restoredAt: ago(44, 3), closedAt: ago(43), verifiedBy: 'cxeng', requesterConfirmed: true, history: [{ to: 'OPEN', at: ago(45), by: 'requestor' }, { to: 'CLOSED', at: ago(43), by: 'svcmgr' }] }),
  ];
  incidents[0]!.recurrenceOf = 'ISS-0380';
  const workOrders: WorkOrder[] = [
    { id: 'WO-0088', incidentId: 'ISS-0417', roomId: 'R-ATL-4-218', buildingKey: 'ATL', workType: 'dsp_upgrade', title: 'Restore far-end audio · Atlas 4.218', state: 'OPEN', techId: null, window: null, access: null, safety: null, toolsConfirmed: [], parts: [{ part: 'processor', qty: 1 }], evidence: [], preflight: null, openedAt: ago(3) },
    { id: 'WO-0081', incidentId: 'ISS-0398', roomId: 'R-ATL-4-231', buildingKey: 'ATL', workType: 'break_fix', title: 'Projector input mapping · Atlas 4.231', state: 'DONE', techId: 'tech-ana', window: { from: ago(20, 10), to: ago(20, 7) }, access: { confirmedBy: 'site champion' }, safety: { briefed: true }, toolsConfirmed: ['service kit'], parts: [], evidence: [{ at: ago(20, 8), by: 'tech-ana', kind: 'photo', note: 'input mapping restored to the commissioned configuration (synthetic photo)' }], preflight: null, openedAt: ago(21) },
  ];
  incidents[0]!.workOrderId = 'WO-0088'; incidents[2]!.workOrderId = 'WO-0081';
  return { v: 1, seededAt: t0, incidents, workOrders, staff, apexCases: [], learnCases: [], training: [], fiSessions: [], licenses: { 'SITE-NORTH:BRD': true, 'SITE-NORTH:TWN': false, 'SITE-NORTH:HUD': false },
    events: [{ at: t0, by: 'system', type: 'workspace.seeded', aggregate: 'Workspace', detail: '5 incidents, 2 work orders, 4 people, synthetic estate', outcome: 'ALLOWED' }],
    adapters: { 'ADP-DSP': 'NOT_CONFIGURED', 'ADP-CAM': 'NOT_CONFIGURED', 'ADP-NET': 'NOT_CONFIGURED' },
    stock: { 'camera unit': { onHand: 2, checkedAt: ago(10), location: 'ATL store' }, 'mounting plate': { onHand: 6, checkedAt: ago(10), location: 'ATL store' }, processor: { onHand: 1, checkedAt: ago(33), location: 'MER store' }, loudspeakers: { onHand: 0, checkedAt: ago(40), location: 'ATL store' } },
    bookings: { 'R-ATL-4-218': [{ from: ago(-1, 2).slice(0, 16), to: ago(-1, 0).slice(0, 16), title: 'Board review' }], 'R-ATL-4-220': [] },
    seq: { wo: 88, apex: 0, learn: 0, inc: 421, fi: 0 } };
}

export function load(): Workspace { try { const s = localStorage.getItem(KEY); if (s) { const w = JSON.parse(s) as Workspace; if (w.v === 1) { if (!w.fiSessions) { w.fiSessions = []; w.licenses = seed().licenses; w.seq.fi = 0; } return w; } } } catch { /* storage unavailable */ } const w = seed(); save(w); return w; }
export function save(w: Workspace | null): void { try { if (w) localStorage.setItem(KEY, JSON.stringify(w)); else localStorage.removeItem(KEY); } catch { /* the workspace lasts the page */ } }
export function reset(): Workspace { const w = seed(); save(w); return w; }

const log = (w: Workspace, by: string, type: string, aggregate: string, detail: string, outcome: 'ALLOWED' | 'DENIED' = 'ALLOWED') => { w.events.unshift({ at: now(), by, type, aggregate, detail, outcome }); w.events = w.events.slice(0, 500); };
const deny = (w: Workspace, by: string, type: string, aggregate: string, why: string[]): Refusal => { log(w, by, type, aggregate, `refused: ${why.join('; ')}`, 'DENIED'); return refused(why); };
const need = (w: Workspace, persona: string, authority: string | string[], type: string, aggregate: string): Refusal | null => { const a = ([] as string[]).concat(authority); return a.some((x) => holds(persona, x)) ? null : deny(w, persona, type, aggregate, [`${personaLabel(persona)} does not hold ${a.join(' or ')}`]); };
export const today = () => now().slice(0, 10);
export const STALE_STOCK_DAYS = 30;
export const stockOf = (w: Workspace, part: string) => { const s = w.stock[part]; if (!s) return { known: false, onHand: 0 }; const ageDays = Math.round((Date.now() - Date.parse(s.checkedAt)) / DAY); return { known: true, onHand: s.onHand, checkedAt: s.checkedAt, ageDays, stale: ageDays > STALE_STOCK_DAYS }; };

// ------------------------------------------------------------------------------------------------------------ ServiceHands
export const incidentOf = (w: Workspace, id: string) => w.incidents.find((i) => i.id === id);
export const workOrderOf = (w: Workspace, id: string) => w.workOrders.find((x) => x.id === id);
export const techOf = (w: Workspace, id: string | null) => (id ? w.staff.find((s) => s.id === id) || null : null);
/** The technician persona acts as a named person of the pool (Ana at Atlas by default) — a perspective, never a login. */
export const techForPersona = (persona: string) => (persona === 'service' ? 'tech-ana' : persona === 'installer' ? 'tech-ben' : null);

export function candidatesFor(w: Workspace, woId: string) {
  const wo = workOrderOf(w, woId); if (!wo) return null;
  const inc = incidentOf(w, wo.incidentId);
  const excludeIds = inc?.recurrenceOf ? w.incidents.filter((i) => i.id === inc.recurrenceOf).flatMap((i) => i.history.filter((h) => h.to === 'ACCEPTED').map((h) => h.by)) : [];
  return candidates(w.staff, { workType: wo.workType, scope: { roomId: wo.roomId, buildingKey: wo.buildingKey }, window: wo.window, excludeIds }, today());
}
function serviceStep(w: Workspace, persona: string, inc: Incident, to: ServiceState, actorId: string, facts: Partial<Parameters<typeof serviceBlockers>[1]> = {}): Refusal | null {
  const t = SERVICE_TRANSITIONS.find((x) => x.from === inc.state && x.to === to);
  const auth = t?.authority || 'service.triage';
  const n = need(w, persona, auth, `service.${to.toLowerCase()}`, inc.id); if (n) return n;
  const wo = inc.workOrderId ? workOrderOf(w, inc.workOrderId) : undefined;
  const why = serviceBlockers(to, { state: inc.state, actorId, technicianId: wo?.techId || null, recorderIds: wo?.evidence.map((e) => e.by) || [], severity: inc.severity, roomId: inc.roomId, ...facts });
  if (why.length) return deny(w, persona, `service.${to.toLowerCase()}`, inc.id, why);
  inc.state = to; inc.history.push({ to, at: now(), by: actorId });
  log(w, persona, `service.${to.toLowerCase()}`, inc.id, `${inc.title} → ${to}${t ? ` (guard ${t.guard})` : ''}`);
  return null;
}
export function triage(w: Workspace, persona: string, incidentId: string, severity: Incident['severity']): Refusal | null {
  const inc = incidentOf(w, incidentId); if (!inc) return refused(['no such incident']);
  inc.severity = severity; return serviceStep(w, persona, inc, 'TRIAGED', persona);
}
export function assign(w: Workspace, persona: string, incidentId: string, techId: string): Refusal | null {
  const inc = incidentOf(w, incidentId); if (!inc) return refused(['no such incident']);
  let wo = inc.workOrderId ? workOrderOf(w, inc.workOrderId) : undefined;
  if (!wo) { wo = { id: `WO-${String(++w.seq.wo).padStart(4, '0')}`, incidentId: inc.id, roomId: inc.roomId, buildingKey: inc.buildingKey, workType: 'break_fix', title: inc.title, state: 'OPEN', techId: null, window: null, access: null, safety: null, toolsConfirmed: [], parts: [], evidence: [], preflight: null, openedAt: now() }; w.workOrders.push(wo); inc.workOrderId = wo.id; }
  const c = candidatesFor(w, wo.id)!; const chosen = [...c.eligible, ...c.ineligible].find((x) => x.id === techId);
  const r = serviceStep(w, persona, inc, 'ASSIGNED', persona, { technicianId: techId, eligible: !!chosen?.hardOk });
  if (r) return r;
  wo.techId = techId; wo.state = 'ASSIGNED'; if (!wo.window) wo.window = { from: ago(-1, 4).slice(0, 16), to: ago(-1, 1).slice(0, 16) };
  log(w, persona, 'service.dispatch', wo.id, `${techOf(w, techId)?.name} assigned (${chosen?.reasons.join(', ') || 'ranked'})`);
  return null;
}
export function accept(w: Workspace, persona: string, incidentId: string): Refusal | null {
  const inc = incidentOf(w, incidentId); if (!inc) return refused(['no such incident']);
  const me = techForPersona(persona) || persona; const r = serviceStep(w, persona, inc, 'ACCEPTED', me); if (r) return r;
  const wo = workOrderOf(w, inc.workOrderId!)!; wo.state = 'ACCEPTED'; return null;
}
export function preflightFor(w: Workspace, woId: string, input: { access?: boolean; safety?: boolean; heightPermit?: boolean; tools?: string[] } = {}) {
  const wo = workOrderOf(w, woId); if (!wo) return null;
  const needs = WORK_NEEDS[wo.workType] || WORK_NEEDS['break_fix']!;
  const parts = (wo.parts.length ? wo.parts : needs.parts.map((p) => ({ part: p, qty: 1 }))).map((p) => ({ ...p, stock: stockOf(w, p.part) }));
  return preflight({ window: wo.window, bookings: w.bookings[wo.roomId] || [], parts, access: input.access ? { confirmedBy: 'site champion (synthetic)' } : wo.access, safety: input.safety !== undefined ? { briefed: input.safety, heightPermit: input.heightPermit } : wo.safety, tools: needs.tools, toolsConfirmed: input.tools || wo.toolsConfirmed, needs, approval: { ok: true, why: 'break/fix on an operational room: no project authorization needed' } });
}
/** Re-plan the work window (12 Nov 2026: without it the seeded job could not pass its preflight through the page, a dead end found by the
 *  staging journey). The service manager (service.assign) moves the window to the first three-hour slot, on the hour, at least a day
 *  ahead, that the room's bookings leave free. The bookings are the synthetic calendar on the record; nothing is booked anywhere. */
export function replanWindow(w: Workspace, persona: string, incidentId: string): Refusal | null {
  const inc = incidentOf(w, incidentId); if (!inc) return refused(['no such incident']);
  const n = need(w, persona, 'service.assign', 'service.replan', inc.id); if (n) return n;
  const wo = workOrderOf(w, inc.workOrderId || ''); if (!wo) return deny(w, persona, 'service.replan', inc.id, ['no work order yet: assign first']);
  const books = w.bookings[wo.roomId] || []; const t0 = new Date(Date.now() + DAY); t0.setUTCMinutes(0, 0, 0); t0.setUTCHours(t0.getUTCHours() + 1);
  for (let h = 0; h < 24 * 14; h += 1) {
    const from = new Date(t0.getTime() + h * 36e5), to = new Date(from.getTime() + 3 * 36e5);
    const win = { from: from.toISOString().slice(0, 16), to: to.toISOString().slice(0, 16) };
    if (!books.some((b) => overlaps(win, b))) { const was = wo.window; wo.window = win; log(w, persona, 'service.replan', wo.id, `window ${was ? `${was.from} → ${was.to}` : 'none'} re-planned to ${win.from} → ${win.to}, clear of the room's bookings (synthetic calendar)`); return null; }
  }
  return deny(w, persona, 'service.replan', wo.id, ['no free three-hour window in the next fourteen days']);
}
/** Recheck a part's stock (12 Nov 2026, same dead end): the count is confirmed as it stands on the synthetic record and its check date
 *  becomes today. There is no inventory system behind it, and the ledger says so. The manager or the assigned technician may do it. */
export function recheckStock(w: Workspace, persona: string, incidentId: string, part: string): Refusal | null {
  const inc = incidentOf(w, incidentId); if (!inc) return refused(['no such incident']);
  const n = need(w, persona, ['service.assign', 'work.start'], 'service.stock', inc.id); if (n) return n;
  const s = w.stock[part]; if (!s) return deny(w, persona, 'service.stock', inc.id, [`${part} is not on the stock record`]);
  s.checkedAt = now(); log(w, persona, 'service.stock', inc.id, `${part}: ${s.onHand} on hand at ${s.location}, rechecked (synthetic record; no inventory system)`); return null;
}
export function start(w: Workspace, persona: string, incidentId: string, input: { access: boolean; safety: boolean; heightPermit: boolean; tools: string[] }): Refusal | null {
  const inc = incidentOf(w, incidentId); if (!inc) return refused(['no such incident']);
  const wo = workOrderOf(w, inc.workOrderId || '')!; const pf = preflightFor(w, wo.id, input)!;
  wo.preflight = pf.checks; if (input.access) wo.access = { confirmedBy: 'site champion (synthetic)' }; wo.safety = { briefed: input.safety, heightPermit: input.heightPermit }; wo.toolsConfirmed = input.tools;
  const me = techForPersona(persona) || persona;
  const r = serviceStep(w, persona, inc, 'IN_PROGRESS', me, { preflightOk: pf.ok }); if (r) return r;
  wo.state = 'IN_PROGRESS'; log(w, persona, 'service.preflight', wo.id, pf.checks.map((c) => `${c.label}: ${c.ok ? 'ok' : c.why}`).join(' · ')); return null;
}
export function recordEvidence(w: Workspace, persona: string, incidentId: string, kind: string, note: string): Refusal | null {
  const inc = incidentOf(w, incidentId); if (!inc) return refused(['no such incident']);
  const n = need(w, persona, 'work.evidence', 'service.evidence', inc.id); if (n) return n;
  const wo = workOrderOf(w, inc.workOrderId || ''); if (!wo || inc.state !== 'IN_PROGRESS') return deny(w, persona, 'service.evidence', inc.id, ['evidence is recorded while the job is IN_PROGRESS']);
  const me = techForPersona(persona) || persona; if (wo.techId !== me) return deny(w, persona, 'service.evidence', inc.id, ['the assigned technician records the work']);
  if (!note.trim()) return deny(w, persona, 'service.evidence', inc.id, ['evidence needs a note']);
  wo.evidence.push({ at: now(), by: me, kind, note: note.trim() }); log(w, persona, 'service.evidence', wo.id, `${kind}: ${note.trim()}`); return null;
}
export function submitForVerification(w: Workspace, persona: string, incidentId: string): Refusal | null {
  const inc = incidentOf(w, incidentId); if (!inc) return refused(['no such incident']);
  const wo = workOrderOf(w, inc.workOrderId || ''); const me = techForPersona(persona) || persona;
  return serviceStep(w, persona, inc, 'VERIFYING', me, { evidence: wo?.evidence.length || 0 });
}
export function verify(w: Workspace, persona: string, incidentId: string): Refusal | null {
  const inc = incidentOf(w, incidentId); if (!inc) return refused(['no such incident']);
  const r = serviceStep(w, persona, inc, 'RESOLVED', persona); if (r) return r;
  inc.restoredAt = now(); inc.verifiedBy = persona; const wo = workOrderOf(w, inc.workOrderId || ''); if (wo) wo.state = 'DONE'; return null;
}
export function close(w: Workspace, persona: string, incidentId: string, requesterConfirmed: boolean): Refusal | null {
  const inc = incidentOf(w, incidentId); if (!inc) return refused(['no such incident']);
  inc.requesterConfirmed = requesterConfirmed;
  const r = serviceStep(w, persona, inc, 'CLOSED', persona, { customerPolicy: { needsCustomerConfirmation: inc.severity !== 'Standard', confirmed: requesterConfirmed } }); if (r) return r;
  inc.closedAt = now(); return null;
}
export function reopen(w: Workspace, persona: string, incidentId: string, reason: string): Refusal | null {
  const inc = incidentOf(w, incidentId); if (!inc) return refused(['no such incident']);
  const r = serviceStep(w, persona, inc, 'REOPENED', persona, { reopenReason: reason || null }); if (r) return r;
  inc.reopened = true; inc.restoredAt = null; const wo = workOrderOf(w, inc.workOrderId || ''); if (wo) { wo.state = 'OPEN'; wo.techId = null; } return null;
}
export function raiseIncident(w: Workspace, persona: string, input: { roomId: string; roomName: string; buildingKey: string; title: string; summary: string }): Refusal | { id: string } {
  const n = need(w, persona, ['request.submit', 'service.triage', 'work.evidence'], 'service.raise', input.roomId); if (n) return n;
  if (!input.title.trim() || !input.roomId) return deny(w, persona, 'service.raise', input.roomId || '-', ['a title and a room are required']);
  const id = `ISS-${String(++w.seq.inc).padStart(4, '0')}`;
  const prior = w.incidents.find((i) => i.roomId === input.roomId && ['RESOLVED', 'CLOSED'].includes(i.state) && i.title.toLowerCase().split(' ')[0] === input.title.toLowerCase().split(' ')[0]);
  w.incidents.unshift({ id, roomId: input.roomId, roomName: input.roomName, buildingKey: input.buildingKey, title: input.title.trim(), summary: input.summary.trim(), severity: 'Standard', state: 'OPEN', openedAt: now(), restoredAt: null, closedAt: null, recurrenceOf: prior?.id || null, reopened: false, workOrderId: null, apexId: null, learnCaseId: null, history: [{ to: 'OPEN', at: now(), by: persona }], requesterConfirmed: false, verifiedBy: null });
  log(w, persona, 'service.raise', id, `${input.title.trim()} · ${input.roomName}${prior ? ` · recurrence of ${prior.id}` : ''}`); return { id };
}

// ------------------------------------------------------------------------------------------------------------ APEX
export const APEX_ACT_AUTHORITIES = ['service.triage', 'tests.verify.all', 'service.verify', 'baseline.approve', 'review.dsp', 'review.camera', 'review.touch'];
export function openApex(w: Workspace, persona: string, incidentId: string, cite: (layer: Layer) => string[]): Refusal | { id: string } {
  const inc = incidentOf(w, incidentId); if (!inc) return refused(['no such incident']);
  const n = need(w, persona, [...APEX_ACT_AUTHORITIES, 'provenance.review'], 'apex.open', inc.id); if (n) return n;
  if (inc.apexId) return { id: inc.apexId };
  const c = openCase(`${inc.title} ${inc.summary}`, cite);
  const id = `APX-${String(++w.seq.apex).padStart(3, '0')}`;
  w.apexCases.unshift({ id, incidentId: inc.id, roomId: inc.roomId, key: c.key, layers: c.layers, hypotheses: c.hypotheses, actions: [], reviewed: null, openedAt: now() });
  inc.apexId = id; log(w, persona, 'apex.opened', id, `${c.key} branch · ${c.hypotheses.length} hypotheses for ${inc.id}`); return { id };
}
export function apexAct(w: Workspace, persona: string, caseId: string, hypId: string, input: Parameters<typeof act>[1], baseline: { version: number; evidence: number } | null): Refusal | Outcome {
  const H = w.apexCases.find((c) => c.id === caseId); if (!H) return refused(['no such case']);
  const n = need(w, persona, APEX_ACT_AUTHORITIES, 'apex.act', H.id); if (n) return n;
  const h = H.hypotheses.find((x) => x.id === hypId); if (!h) return refused(['no such hypothesis']);
  const inc = incidentOf(w, H.incidentId)!;
  const o = act(h, input, { adapters: w.adapters, baseline, priorA4: H.actions.filter((a) => a.tier === 'A4' && a.runbook && !['BLOCKED', 'DRY_RUN', 'HUMAN_LED'].includes(a.outcome)).length,
    stageWorkOrder: () => { if (inc.workOrderId) return { ok: false, why: [`${inc.id} already has work order ${inc.workOrderId}`] }; const id = `WO-${String(++w.seq.wo).padStart(4, '0')}`; w.workOrders.push({ id, incidentId: inc.id, roomId: inc.roomId, buildingKey: inc.buildingKey, workType: 'break_fix', title: `APEX draft · ${h.text}`, state: 'OPEN', techId: null, window: null, access: null, safety: null, toolsConfirmed: [], parts: [], evidence: [], preflight: null, openedAt: now() }); inc.workOrderId = id; return { ok: true, id }; } });
  H.actions.unshift({ ...o, at: now(), by: persona, hypothesisId: hypId });
  log(w, persona, `apex.${o.tier.toLowerCase()}`, H.id, `${o.outcome}: ${o.detail.slice(0, 160)}`, o.outcome === 'REFUSED' ? 'DENIED' : 'ALLOWED');
  if (o.compensation) log(w, persona, 'workflow.compensation_requested', H.id, o.detail.slice(0, 160));
  return o;
}
export function apexReview(w: Workspace, persona: string, caseId: string, verdict: string): Refusal | null {
  const H = w.apexCases.find((c) => c.id === caseId); if (!H) return refused(['no such case']);
  const n = need(w, persona, ['tests.verify.all', 'service.verify', 'baseline.approve'], 'apex.diagnosis_reviewed', H.id); if (n) return n;
  H.reviewed = { by: persona, at: now(), verdict }; log(w, persona, 'apex.diagnosis_reviewed', H.id, verdict); return null;
}

// ------------------------------------------------------------------------------------------------------------ Learn (cases from what actually happened)
export const LEARN_PROPOSE = ['tests.verify.all', 'service.verify', 'baseline.approve', 'case.approve'];
export const LEARN_SME = ['tests.verify.all', 'review.dsp', 'review.camera', 'review.touch', 'baseline.approve'];
export function proposeCase(w: Workspace, persona: string, incidentId: string, input: { title: string; lesson: string; permission: boolean; deidentified: boolean }): Refusal | { id: string } {
  const inc = incidentOf(w, incidentId); if (!inc) return refused(['no such incident']);
  const n = need(w, persona, LEARN_PROPOSE, 'learn.propose', inc.id); if (n) return n;
  const why: string[] = [];
  if (!['RESOLVED', 'CLOSED'].includes(inc.state)) why.push('a case is written from what actually happened: the incident must be RESOLVED or CLOSED');
  if (!input.permission) why.push('customer permission to reuse the incident is required');
  if (!input.deidentified) why.push('the case must be de-identified (no room, person or tenant names)');
  if (/atlas|northstar|\d+\.\d+|reyes|okafor|lind|shah/i.test(`${input.title} ${input.lesson}`)) why.push('the text still names a building, room or person');
  if (!input.lesson.trim()) why.push('a lesson statement is required');
  if (inc.learnCaseId) why.push(`${inc.id} already has case ${inc.learnCaseId}`);
  if (why.length) return deny(w, persona, 'learn.propose', inc.id, why);
  const id = `LC-${String(++w.seq.learn).padStart(3, '0')}`;
  w.learnCases.unshift({ id, incidentId: inc.id, apexId: inc.apexId, title: input.title.trim(), lesson: input.lesson.trim(), permission: { by: persona, at: now() }, deidentified: true, proposedBy: persona, proposedAt: now(), smeReview: null, state: 'PROPOSED', approvedBy: null });
  inc.learnCaseId = id; log(w, persona, 'learn.case_proposed', id, `${input.title.trim()} (from ${inc.id})`); return { id };
}
export function smeReview(w: Workspace, persona: string, caseId: string, decision: 'approve' | 'reject', note: string): Refusal | null {
  const c = w.learnCases.find((x) => x.id === caseId); if (!c) return refused(['no such case']);
  const n = need(w, persona, LEARN_SME, 'learn.sme_review', c.id); if (n) return n;
  if (c.state !== 'PROPOSED') return deny(w, persona, 'learn.sme_review', c.id, [`SME review happens on a PROPOSED case (now ${c.state})`]);
  if (c.proposedBy === persona) return deny(w, persona, 'learn.sme_review', c.id, ['the proposer is not the subject-matter reviewer of their own case (separation of duties)']);
  c.smeReview = { decision, by: persona, at: now(), note }; c.state = decision === 'approve' ? 'SME_REVIEWED' : 'REJECTED';
  log(w, persona, 'learn.sme_review', c.id, `${decision}${note ? `: ${note}` : ''}`); return null;
}
export function approveCase(w: Workspace, persona: string, caseId: string): Refusal | null {
  const c = w.learnCases.find((x) => x.id === caseId); if (!c) return refused(['no such case']);
  const n = need(w, persona, 'case.approve', 'training.case_approved', c.id); if (n) return n;
  if (c.state !== 'SME_REVIEWED') return deny(w, persona, 'training.case_approved', c.id, [`the steward approves an SME-reviewed case (now ${c.state})`]);
  if (c.proposedBy === persona || c.smeReview?.by === persona) return deny(w, persona, 'training.case_approved', c.id, ['the steward is neither the proposer nor the reviewer (separation of duties)']);
  c.state = 'APPROVED'; c.approvedBy = persona; log(w, persona, 'training.case_approved', c.id, c.title); return null;
}
export function recordTraining(w: Workspace, persona: string, drillId: string, correct: boolean, elapsedS: number): void {
  w.training.unshift({ drillId, at: now(), by: persona, correct, elapsedS }); w.training = w.training.slice(0, 200);
  log(w, persona, 'training.drill_completed', drillId, `${correct ? 'correct' : 'incorrect'} in ${elapsedS}s — training performance never grants work authorization`);
}

// ------------------------------------------------------------------------------------------------------------ Field Intelligence v1.4 Physical Validation sessions
const actor = (persona: string): FI.Actor => ({ persona, now: now(), can: (a) => ([] as string[]).concat(a).some((x) => holds(persona, x)) });
export function fiSessionOf(w: Workspace, id: string) { return w.fiSessions.find((s) => s.id === id); }
export function setLicense(w: Workspace, persona: string, key: string, on: boolean): Refusal | null {
  const n = need(w, persona, 'license.grant', 'fipv.license', key); if (n) return n;
  w.licenses[key] = on; log(w, persona, 'fipv.license', key, `${on ? 'granted' : 'revoked'} — a licence opens requests, never proofs`); return null;
}
export function fiPropose(w: Workspace, persona: string, roomId: string, archetype: string, points: FI.Session['points'], tests: FI.PvTest[]): Refusal | { id: string } {
  const n = need(w, persona, ['protocol.approve', 'tests.verify.all', 'fipv.review', 'plan.compile', 'test.verify'], 'fipv.propose', roomId); if (n) return n;
  const id = `FIS-${String(++w.seq.fi).padStart(3, '0')}`;
  w.fiSessions.unshift(FI.createSession(id, roomId, archetype, points, tests, actor(persona)));
  log(w, persona, 'fipv.session_transitioned', id, `none → DRAFT (${roomId}, ${tests.length} test(s), ${points.length} point(s))`); return { id };
}
function fiApply(w: Workspace, persona: string, id: string, type: string, fn: (s: FI.Session, a: FI.Actor) => FI.Session | FI.Refusal | { missing: string[]; session: FI.Session }): Refusal | FI.Session {
  const s = fiSessionOf(w, id); if (!s) return refused(['no such session']);
  const r = fn(s, actor(persona));
  if (FI.isRefusal(r)) return deny(w, persona, type, id, r.why);
  const next = 'session' in r && 'missing' in r ? r.session : (r as FI.Session);
  const i = w.fiSessions.findIndex((x) => x.id === id); w.fiSessions[i] = next;
  const last = next.log[next.log.length - 1];
  log(w, persona, next.state !== s.state ? 'fipv.session_transitioned' : type, id, next.state !== s.state ? `${s.state} → ${next.state}: ${last?.text || ''}` : last?.text || type);
  return next;
}
export const fiEligibility = (w: Workspace, persona: string, id: string) => fiApply(w, persona, id, 'fipv.eligibility', (s, a) => FI.eligibility(s, a, !!w.licenses[`SITE-NORTH:${s.archetype}`]));
export const fiPreflight = (w: Workspace, persona: string, id: string, i: FI.PreflightInput) => fiApply(w, persona, id, `fipv.preflight.${i.step}`, (s, a) => FI.preflight(s, a, i));
export const fiDryRun = (w: Workspace, persona: string, id: string) => fiApply(w, persona, id, 'fipv.dry_run', FI.dryRun);
export const fiAuthorize = (w: Workspace, persona: string, id: string, yes: boolean) => fiApply(w, persona, id, 'fipv.authorize', (s, a) => FI.authorize(s, a, yes));
export const fiArm = (w: Workspace, persona: string, id: string, c1: boolean, c2: boolean) => fiApply(w, persona, id, 'fipv.arm', (s, a) => FI.arm(s, a, c1, c2, true));
export const fiRun = (w: Workspace, persona: string, id: string, branch: typeof FI.BRANCHES[number] | null) => fiApply(w, persona, id, 'fipv.run', (s, a) => FI.run(s, a, branch));
export const fiEstop = (w: Workspace, persona: string, id: string) => fiApply(w, persona, id, 'fipv.estop', FI.estop);
