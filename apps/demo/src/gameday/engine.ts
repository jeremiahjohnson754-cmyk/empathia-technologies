/**
 * Game day at Harborlight Stadium (Surpass §20, W16): a real event clock and state machine over the canonical stadium records.
 * Pure and deterministic: the same actions always give the same state. Every change of phase changes the synthetic data the
 * dashboards read (attendance, queues, concourse load, staffing, system states), and a fault is a record against a real estate room
 * that has to be acknowledged, dispatched, fixed and then verified by someone else before it stops holding the event.
 *
 * Everything is SIMULATED: no feed, count or device state here is live or measured. The public view is a projection that carries
 * gates, queues and step-free advice only — never rooms, systems or incidents.
 */
export const PHASES = ['pre-open', 'gates', 'warmup', 'first-half', 'halftime', 'second-half', 'exit', 'strike'] as const;
export type Phase = (typeof PHASES)[number];
export const PHASE: Record<Phase, { label: string; at: number; attendance: number; concourse: number; staff: Record<Team, number>; program: Feed }> = {
  'pre-open': { label: 'Before doors', at: -180, attendance: 0, concourse: 0, staff: { gates: 40, concessions: 120, medical: 12, broadcast: 60, technology: 18 }, program: 'REHEARSAL' },
  gates: { label: 'Gates open', at: -90, attendance: 0.35, concourse: 0.55, staff: { gates: 220, concessions: 480, medical: 36, broadcast: 85, technology: 24 }, program: 'REHEARSAL' },
  warmup: { label: 'Warm-up', at: -45, attendance: 0.8, concourse: 0.7, staff: { gates: 220, concessions: 520, medical: 36, broadcast: 96, technology: 24 }, program: 'REHEARSAL' },
  'first-half': { label: 'First half', at: 0, attendance: 0.97, concourse: 0.15, staff: { gates: 90, concessions: 520, medical: 40, broadcast: 96, technology: 24 }, program: 'LIVE' },
  halftime: { label: 'Half-time', at: 50, attendance: 0.97, concourse: 0.9, staff: { gates: 60, concessions: 560, medical: 40, broadcast: 96, technology: 24 }, program: 'LIVE' },
  'second-half': { label: 'Second half', at: 65, attendance: 0.96, concourse: 0.12, staff: { gates: 60, concessions: 420, medical: 40, broadcast: 96, technology: 24 }, program: 'LIVE' },
  exit: { label: 'Full time and exit', at: 115, attendance: 0.2, concourse: 0.85, staff: { gates: 200, concessions: 140, medical: 40, broadcast: 70, technology: 20 }, program: 'OFF' },
  strike: { label: 'Strike', at: 175, attendance: 0, concourse: 0, staff: { gates: 20, concessions: 40, medical: 8, broadcast: 30, technology: 18 }, program: 'OFF' },
};
export type Team = 'gates' | 'concessions' | 'medical' | 'broadcast' | 'technology';
export type Feed = 'REHEARSAL' | 'LIVE' | 'OFF';
export type Severity = 'critical' | 'major' | 'minor';
export type Step = 'OPEN' | 'ACKNOWLEDGED' | 'DISPATCHED' | 'FIXED' | 'VERIFIED';
export const STEPS: readonly Step[] = ['OPEN', 'ACKNOWLEDGED', 'DISPATCHED', 'FIXED', 'VERIFIED'];
/** The faults a visitor can inject. Each names a real record in the stadium estate, the system it degrades and what the public would notice. */
export const FAULTS = {
  'ribbon-east': { title: 'East ribbon board shows no picture', room: 'STA-LED', system: 'ribbons', severity: 'major', effect: 'DEGRADED', publicNote: null, owner: 'technology' },
  'pa-upper': { title: 'Upper bowl announcements are not heard in sections 301 to 312', room: 'STA-PA', system: 'pa', severity: 'critical', effect: 'DEGRADED', publicNote: 'Announcements in the upper north sections are also shown on the video boards.', owner: 'technology' },
  'program-return': { title: 'Programme return to the commentary booths has dropped', room: 'STA-BCR', system: 'broadcast', severity: 'critical', effect: 'DEGRADED', publicNote: null, owner: 'broadcast' },
  'suite-9-display': { title: 'Suite 9 displays show no television picture', room: 'STA-STE-009', system: 'suites', severity: 'minor', effect: 'DEGRADED', publicNote: null, owner: 'technology' },
  'gate-c-scanners': { title: 'Ticket scanners at Gate C are offline', room: 'STA-GATE-C', system: 'gates', severity: 'major', effect: 'DEGRADED', publicNote: 'Gate C is slow. Gate D, next along, has a step-free lane and a shorter queue.', owner: 'gates' },
} as const satisfies Record<string, { title: string; room: string; system: SystemKey; severity: Severity; effect: 'DEGRADED' | 'DOWN'; publicNote: string | null; owner: Team }>;
export type FaultId = keyof typeof FAULTS;
export type SystemKey = 'pa' | 'boards' | 'ribbons' | 'broadcast' | 'suites' | 'gates';
export const SYSTEM_LABEL: Record<SystemKey, string> = { pa: 'Bowl public address', boards: 'Main video boards', ribbons: 'Ribbon boards', broadcast: 'Broadcast programme chain', suites: 'Suite television', gates: 'Gate ticket scanning' };
export interface Incident { id: string; fault: FaultId; openedIn: Phase; step: Step; by: Partial<Record<Step, string>> }
export interface Entry { phase: Phase; text: string }
export interface GameDay { phase: Phase; incidents: Incident[]; log: Entry[]; seq: number }
export const SEATS = 62200;
export const start = (): GameDay => ({ phase: 'pre-open', incidents: [], log: [{ phase: 'pre-open', text: 'Event day opened. Systems in rehearsal.' }], seq: 0 });

const open = (g: GameDay) => g.incidents.filter((i) => i.step !== 'VERIFIED');
/** A system is degraded while a fault against it is not yet fixed; fixed-but-unverified reads as "restored, awaiting check". */
export function systems(g: GameDay): Record<SystemKey, 'OK' | 'DEGRADED' | 'AWAITING_CHECK'> {
  const s: Record<SystemKey, 'OK' | 'DEGRADED' | 'AWAITING_CHECK'> = { pa: 'OK', boards: 'OK', ribbons: 'OK', broadcast: 'OK', suites: 'OK', gates: 'OK' };
  for (const i of open(g)) { const k = FAULTS[i.fault].system; if (i.step === 'FIXED') { if (s[k] === 'OK') s[k] = 'AWAITING_CHECK'; } else s[k] = 'DEGRADED'; }
  return s;
}
/** What stops the next phase. Kick-off is held by any critical fault that is not yet fixed; gates cannot open with scanning down everywhere (not modelled) or the PA unverified. */
export function holds(g: GameDay): string[] {
  const next = PHASES[PHASES.indexOf(g.phase) + 1]; if (!next) return ['The event is over.'];
  const out: string[] = [];
  if (next === 'first-half' || next === 'second-half') for (const i of open(g)) if (FAULTS[i.fault].severity === 'critical' && STEPS.indexOf(i.step) < STEPS.indexOf('FIXED')) out.push(`${FAULTS[i.fault].title} (critical, ${i.step.toLowerCase()})`);
  if (next === 'gates') for (const i of open(g)) if (FAULTS[i.fault].system === 'pa' && i.step !== 'FIXED') out.push(`${FAULTS[i.fault].title}: the public address must work before the public enters`);
  if (next === 'strike' && open(g).length) out.push(`${open(g).length} incident${open(g).length === 1 ? '' : 's'} not yet verified: close them before the crew stands down`);
  return out;
}
export type Result = { ok: true; state: GameDay } | { ok: false; why: string };
export function advance(g: GameDay): Result {
  const h = holds(g); if (h.length) return { ok: false, why: `Held: ${h.join('; ')}.` };
  const next = PHASES[PHASES.indexOf(g.phase) + 1]!; return { ok: true, state: { ...g, phase: next, log: [...g.log, { phase: next, text: `${PHASE[next].label}. Programme feed ${PHASE[next].program.toLowerCase()}.` }] } };
}
export function inject(g: GameDay, fault: FaultId): Result {
  if (g.phase === 'strike') return { ok: false, why: 'The event is over; nothing is running to fail.' };
  if (open(g).some((i) => i.fault === fault)) return { ok: false, why: 'That fault is already open.' };
  const id = `GD-${String(g.seq + 1).padStart(3, '0')}`; return { ok: true, state: { ...g, seq: g.seq + 1, incidents: [...g.incidents, { id, fault, openedIn: g.phase, step: 'OPEN', by: { OPEN: 'simulation' } }], log: [...g.log, { phase: g.phase, text: `${id} opened: ${FAULTS[fault].title}.` }] } };
}
/** Move an incident one step. Steps cannot be skipped, and the person who verifies cannot be the person who fixed it. */
export function respond(g: GameDay, id: string, to: Step, who: string): Result {
  const i = g.incidents.find((x) => x.id === id); if (!i) return { ok: false, why: 'No such incident.' };
  if (STEPS.indexOf(to) !== STEPS.indexOf(i.step) + 1) return { ok: false, why: `${id} is ${i.step.toLowerCase()}; the next step is ${(STEPS[STEPS.indexOf(i.step) + 1] || 'none').toLowerCase()}.` };
  if (to === 'VERIFIED' && i.by.FIXED === who) return { ok: false, why: 'A fix is verified by someone other than the person who made it.' };
  const n: Incident = { ...i, step: to, by: { ...i.by, [to]: who } };
  return { ok: true, state: { ...g, incidents: g.incidents.map((x) => (x.id === id ? n : x)), log: [...g.log, { phase: g.phase, text: `${id} ${to.toLowerCase()} by ${who}.` }] } };
}
export interface GateView { gate: 'A' | 'B' | 'C' | 'D'; open: boolean; queueMin: number; stepFree: true }
/** Queue minutes by gate: a function of the phase, and of a scanner fault at that gate. */
export function gates(g: GameDay): GateView[] {
  const base = g.phase === 'gates' ? 9 : g.phase === 'warmup' ? 14 : g.phase === 'first-half' ? 3 : g.phase === 'exit' ? 6 : 0; const isOpen = !['pre-open', 'strike'].includes(g.phase);
  const cDown = open(g).some((i) => i.fault === 'gate-c-scanners' && STEPS.indexOf(i.step) < STEPS.indexOf('FIXED'));
  return (['A', 'B', 'C', 'D'] as const).map((gate, k) => ({ gate, open: isOpen, stepFree: true as const, queueMin: !isOpen ? 0 : Math.round(base * [1, 0.8, 1.1, 0.7][k]!) + (gate === 'C' && cDown ? 18 : 0) + (gate === 'D' && cDown ? 4 : 0) }));
}
export const numbers = (g: GameDay) => { const p = PHASE[g.phase]; return { minute: p.at, inside: Math.round(SEATS * p.attendance), concoursePct: Math.round(p.concourse * 100), staff: p.staff, staffTotal: Object.values(p.staff).reduce((a, b) => a + b, 0), program: open(g).some((i) => i.fault === 'program-return' && STEPS.indexOf(i.step) < STEPS.indexOf('FIXED')) && p.program === 'LIVE' ? 'LIVE, RETURN DEGRADED' : p.program, openIncidents: open(g).length }; };
/** What a fan is shown: gates, queues and plain advice. No rooms, no systems, no incident records. */
export function publicView(g: GameDay): { phase: string; gates: GateView[]; notes: string[]; best: GateView | null } {
  const gs = gates(g); const notes = open(g).filter((i) => STEPS.indexOf(i.step) < STEPS.indexOf('FIXED')).map((i): string | null => FAULTS[i.fault].publicNote).filter((n): n is string => !!n);
  return { phase: PHASE[g.phase].label, gates: gs, notes, best: gs.some((x) => x.open) ? [...gs].filter((x) => x.open).sort((a, b) => a.queueMin - b.queueMin)[0]! : null };
}
/** The readiness report: every line computed from the state. */
export function report(g: GameDay): { title: string; lines: string[]; held: boolean } {
  const n = numbers(g); const sys = systems(g); const h = holds(g);
  return { title: `Readiness at ${PHASE[g.phase].label.toLowerCase()} (T${n.minute >= 0 ? '+' : ''}${n.minute} min)`, held: h.length > 0 && g.phase !== 'strike',
    lines: [`${n.inside.toLocaleString('en-GB')} of ${SEATS.toLocaleString('en-GB')} inside; concourses at ${n.concoursePct}% of planned load`, `${n.staffTotal.toLocaleString('en-GB')} staff on post`, `Programme feed: ${n.program.toLowerCase()}`,
      ...(Object.keys(sys) as SystemKey[]).map((k) => `${SYSTEM_LABEL[k]}: ${sys[k] === 'OK' ? 'working' : sys[k] === 'DEGRADED' ? 'degraded' : 'restored, awaiting an independent check'}`),
      ...g.incidents.map((i) => `${i.id} ${FAULTS[i.fault].title} — ${i.step.toLowerCase()}`), ...(h.length && g.phase !== 'strike' ? [`Next phase held: ${h.join('; ')}`] : [])] };
}
