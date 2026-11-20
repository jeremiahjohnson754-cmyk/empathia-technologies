/**
 * Dispatch mutations on the shared demonstration workspace: assignment through the explained match (preference overrides need a reason,
 * hard gates never move), reassignment with a reason to an eligible person, and withdrawing an assignment. Each step goes through the
 * service engine's transition table and guards; every outcome, refusals included, is a ledger event.
 */
import { SERVICE_TRANSITIONS, serviceBlockers, type ServiceState } from '@empathia/service-engine';
import * as S from '../workspace/store.js';
import { deny, dx, log, need, now, type WX } from '../hardening/kit.js';
import { labEvidence } from '../learn/store.js';
import { assignmentBlockers, match, poolOf, reassignBlockers } from './engine.js';

export const today = () => now().slice(0, 10);
export function matchFor(w: WX, incidentId: string, prefs: { language?: string | null; timeZone?: string | null } = {}) {
  const inc = S.incidentOf(w, incidentId); if (!inc) return null;
  const wo = inc.workOrderId ? S.workOrderOf(w, inc.workOrderId) : undefined;
  const exclude = inc.recurrenceOf ? w.incidents.filter((i) => i.id === inc.recurrenceOf).flatMap((i) => i.history.filter((h) => h.to === 'ACCEPTED').map((h) => h.by)) : [];
  return match(poolOf(w.staff), { workType: wo?.workType || 'break_fix', roomId: inc.roomId, buildingKey: inc.buildingKey, window: wo?.window || null, excludeIds: exclude, language: prefs.language || null, timeZone: prefs.timeZone || null }, today(), labEvidence());
}
function step(w: WX, persona: string, inc: S.Incident, to: ServiceState, facts: Partial<Parameters<typeof serviceBlockers>[1]>): S.Refusal | null {
  const t = SERVICE_TRANSITIONS.find((x) => x.from === inc.state && x.to === to);
  const n = need(w, persona, t?.authority || 'service.assign', `service.${to.toLowerCase()}`, inc.id); if (n) return n;
  const wo = inc.workOrderId ? S.workOrderOf(w, inc.workOrderId) : undefined;
  const why = serviceBlockers(to, { state: inc.state, actorId: persona, technicianId: wo?.techId || null, recorderIds: wo?.evidence.map((e) => e.by) || [], severity: inc.severity, roomId: inc.roomId, ...facts });
  if (why.length) return deny(w, persona, `service.${to.toLowerCase()}`, inc.id, why);
  inc.state = to; inc.history.push({ to, at: now(), by: persona }); return null;
}
function ensureWorkOrder(w: WX, inc: S.Incident): S.WorkOrder {
  let wo = inc.workOrderId ? S.workOrderOf(w, inc.workOrderId) : undefined;
  if (!wo) { wo = { id: `WO-${String(++w.seq.wo).padStart(4, '0')}`, incidentId: inc.id, roomId: inc.roomId, buildingKey: inc.buildingKey, workType: 'break_fix', title: inc.title, state: 'OPEN', techId: null, window: null, access: null, safety: null, toolsConfirmed: [], parts: [], evidence: [], preflight: null, openedAt: now() }; w.workOrders.push(wo); inc.workOrderId = wo.id; log(w, 'system', 'service.work_order_opened', wo.id, `${wo.title} (${inc.id})`); }
  return wo;
}
const ago = (h: number) => new Date(Date.now() - h * 36e5).toISOString().slice(0, 16);
const adopt = (w: WX, techId: string) => { if (!w.staff.some((s) => s.id === techId)) { const f = poolOf(w.staff).find((s) => s.id === techId); if (f) w.staff.push(structuredClone(f)); } };

/** Assign the incident's work order to a person: an explicit, labelled demonstration action; never automatic. */
export function dispatchAssign(w: WX, persona: string, incidentId: string, techId: string, reason: string | null): S.Refusal | null {
  const inc = S.incidentOf(w, incidentId); if (!inc) return { why: ['no such incident'] };
  const n = need(w, persona, 'service.assign', 'service.assigned', inc.id); if (n) return n;
  if (inc.state !== 'TRIAGED') return deny(w, persona, 'service.assigned', inc.id, [`a job is assigned once it is TRIAGED (now ${inc.state})`]);
  const m = matchFor(w, inc.id)!; const b = assignmentBlockers(m.rows, techId, reason);
  if (b.why.length) return deny(w, persona, 'service.assigned', inc.id, b.why);
  const wo = ensureWorkOrder(w, inc);
  const r = step(w, persona, inc, 'ASSIGNED', { technicianId: techId, eligible: true }); if (r) return r;
  adopt(w, techId); wo.techId = techId; wo.state = 'ASSIGNED'; if (!wo.window) wo.window = { from: ago(-26), to: ago(-29) };
  const who = m.rows.find((x) => x.id === techId)!;
  if (b.override) dx(w).overrides.unshift({ woId: wo.id, techId, reason: reason!.trim(), by: persona, at: now(), rankWas: b.rankWas! });
  log(w, persona, 'service.dispatch', wo.id, `${who.name} assigned (rank ${who.rank} of ${m.eligible.length} eligible${b.override ? `; preference override: ${reason!.trim()}` : ''})`);
  return null;
}
export function dispatchReassign(w: WX, persona: string, incidentId: string, toId: string, reason: string): S.Refusal | null {
  const inc = S.incidentOf(w, incidentId); if (!inc) return { why: ['no such incident'] };
  const n = need(w, persona, 'service.assign', 'service.reassigned', inc.id); if (n) return n;
  const wo = inc.workOrderId ? S.workOrderOf(w, inc.workOrderId) : undefined;
  const m = matchFor(w, inc.id)!;
  const why = reassignBlockers(m.rows, wo?.techId || null, toId, reason, inc.state);
  if (why.length || !wo) return deny(w, persona, 'service.reassigned', inc.id, why.length ? why : ['no work order']);
  const from = wo.techId!; adopt(w, toId); wo.techId = toId; wo.state = 'ASSIGNED';
  if (inc.state === 'ACCEPTED') { inc.state = 'ASSIGNED'; inc.history.push({ to: 'ASSIGNED', at: now(), by: persona }); }
  dx(w).reassigned.unshift({ woId: wo.id, from, to: toId, reason: reason.trim(), by: persona, at: now() });
  log(w, persona, 'service.reassigned', wo.id, `${S.techOf(w, from)?.name || from} → ${S.techOf(w, toId)?.name || toId}: ${reason.trim()} (the new technician accepts it again)`);
  return null;
}
/** Withdraw an assignment back to the triaged queue (safeguarded: a reason, and Undo restores the previous state). */
export function dispatchWithdraw(w: WX, persona: string, incidentId: string, reason: string): S.Refusal | null {
  const inc = S.incidentOf(w, incidentId); if (!inc) return { why: ['no such incident'] };
  const n = need(w, persona, 'service.assign', 'service.withdrawn', inc.id); if (n) return n;
  if (!['ASSIGNED', 'ACCEPTED'].includes(inc.state)) return deny(w, persona, 'service.withdrawn', inc.id, [`an assignment is withdrawn while ASSIGNED or ACCEPTED (now ${inc.state})`]);
  if (!reason || reason.trim().length < 8) return deny(w, persona, 'service.withdrawn', inc.id, ['a withdrawal records its reason']);
  const wo = S.workOrderOf(w, inc.workOrderId!)!; const was = wo.techId;
  wo.techId = null; wo.state = 'OPEN'; inc.state = 'TRIAGED'; inc.history.push({ to: 'TRIAGED', at: now(), by: persona });
  log(w, persona, 'service.withdrawn', wo.id, `assignment of ${S.techOf(w, was)?.name || was} withdrawn: ${reason.trim()}`);
  return null;
}
