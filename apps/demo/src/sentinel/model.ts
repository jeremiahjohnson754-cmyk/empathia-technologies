/**
 * Empathia SENTINEL — emergency communications assurance for SECONDARY channels (Enterprise 3.0 directive 1, capability 5; journey J7).
 *
 * SIMULATION — NOT A LIFE-SAFETY SYSTEM. SENTINEL never replaces, delays, controls or waits on a certified primary life-safety system
 * (fire alarm, voice evacuation, mass notification). It originates no alert: an alert exists only when an authenticated authoritative
 * source sends one, and no model or rule here can create one. What it does is audit whether a notice that was ALREADY approved for
 * secondary channels reached them, and it keeps three delivery states apart:
 *   REQUESTED     the notice was sent to the route;
 *   ACKNOWLEDGED  the far end said it received it;
 *   RENDERED      there is proof it was shown.
 * A route with no acknowledgement in time is FAILED and stays on the record. An acknowledgement is never reported as rendered.
 * The screens are PRISM's (prism/model.ts): a screen PRISM cannot reach is a route SENTINEL cannot prove. Everything here is one
 * recorded, simulated drill with a fictional source. No React: the unit suite runs it.
 */
import type { Workspace, Incident } from '../workspace/store.js';
import type { EvidenceState } from '../voice/model.js';
import { screens, type Screen } from '../prism/model.js';

export const BANNER = 'SIMULATION — NOT A LIFE-SAFETY SYSTEM';
export const ALERT = { id: 'ALERT-SIM-0001', kind: 'Severe weather notice (drill)', source: 'Northstar Security Operations desk (fictional authoritative source)',
  authentication: 'Signature checked against the source’s registered key (simulated check)', receivedAt: '2026-11-23T15:20:00Z', origin: 'Sent by the source. SENTINEL cannot create, edit or escalate an alert.' };
export const PLAN = { id: 'SRP-NORTH-02', title: 'Preapproved secondary notice for a severe weather drill', approvedBy: 'Site safety lead (synthetic)', approvedOn: '14 October 2026',
  message: 'Severe weather drill. Move away from windows and wait for instructions from building staff.',
  review: 'A qualified life-safety design review is required before any real use. It has not been done for this demonstration.', ackWindowSeconds: 10 };
export type RouteState = 'REQUESTED' | 'ACKNOWLEDGED' | 'RENDERED' | 'FAILED' | 'NOT_STARTED';
export const ROUTE_WORD: Record<RouteState, string> = { NOT_STARTED: 'Not started', REQUESTED: 'Requested', ACKNOWLEDGED: 'Acknowledged, not proven shown', RENDERED: 'Shown, with proof', FAILED: 'Failed' };
export interface Step { state: Exclude<RouteState, 'NOT_STARTED'>; at: number; basis: EvidenceState; says: string }
export interface Route { id: string; channel: 'Signage' | 'Staff desktop notice'; target: string; roomId: string | null; screen: string | null; steps: Step[]; state: RouteState; why: string }

/** Moments of the drill, in seconds after the alert was received; the last is after the acknowledgement window has closed. */
export const MOMENTS = [{ t: -1, label: 'Before the alert' }, { t: 1, label: '+1 s' }, { t: 3, label: '+3 s' }, { t: PLAN.ackWindowSeconds + 1, label: `+${PLAN.ackWindowSeconds + 1} s` }] as const;
export const momentOf = (v: string | null): number => { const n = Number(v); return MOMENTS.some((m) => m.t === n) && v !== null && v !== '' ? n : MOMENTS[MOMENTS.length - 1]!.t; };

function planFor(s: Screen): { steps: Step[]; why: string } {
  const req: Step = { state: 'REQUESTED', at: 0, basis: 'SIMULATED', says: 'Notice sent to the screen’s player' };
  if (!s.reachable) return { steps: [req, { state: 'FAILED', at: PLAN.ackWindowSeconds, basis: 'SIMULATED', says: `No acknowledgement within ${PLAN.ackWindowSeconds} s` }],
    why: s.verdict === 'UNKNOWN' ? 'No player connection is configured for this screen, so no acknowledgement can arrive. Recorded as a failed route.' : 'The player has stopped reporting. No acknowledgement arrived in the window. Recorded as a failed route.' };
  const ack: Step = { state: 'ACKNOWLEDGED', at: 1, basis: 'SIMULATED', says: 'The player acknowledged the notice' };
  return s.provesRender ? { steps: [req, ack, { state: 'RENDERED', at: 3, basis: 'SIMULATED', says: 'Proof-of-play record for the notice' }], why: 'Acknowledged, and the player issued a proof-of-play record for the notice (simulated).' }
    : { steps: [req, ack], why: 'Acknowledged. This player issues no proof of play, so whether the notice was shown is not known and is not claimed.' };
}
const at = (steps: Step[], t: number): RouteState => { const done = steps.filter((x) => x.at <= t); return t < 0 || !done.length ? 'NOT_STARTED' : done[done.length - 1]!.state; };
/** The recorded drill as it stood `t` seconds after the alert. */
export function routes(t: number = MOMENTS[MOMENTS.length - 1]!.t): Route[] {
  const sig: Route[] = screens().map((s) => { const p = planFor(s); return { id: `RT-${s.id}`, channel: 'Signage' as const, target: `${s.label}, ${s.roomName}`, roomId: s.roomId, screen: s.id, steps: p.steps, state: at(p.steps, t), why: p.why }; });
  const desk: Step[] = [{ state: 'REQUESTED', at: 0, basis: 'SIMULATED', says: 'Notice sent to the staff notification gateway (mock)' }, { state: 'ACKNOWLEDGED', at: 1, basis: 'SIMULATED', says: 'The gateway accepted the notice for its group' }];
  return [...sig, { id: 'RT-DESKTOP', channel: 'Staff desktop notice' as const, target: 'Staff notification group NORTH-ALL (mock)', roomId: null, screen: null, steps: desk, state: at(desk, t),
    why: 'The gateway accepted the notice. Per-person delivery and reading are not tracked, by design, so nothing is claimed about who saw it.' }];
}
export function tally(all: Route[]) { const n = (s: RouteState) => all.filter((r) => r.state === s).length; const started = all.some((r) => r.state !== 'NOT_STARTED');
  return { total: all.length, rendered: n('RENDERED'), acknowledged: n('ACKNOWLEDGED'), requested: n('REQUESTED'), failed: n('FAILED'), started,
    says: !started ? `No alert has been received. ${all.length} routes are in the approved plan.` : `${n('RENDERED')} of ${all.length} routes are proven shown; ${n('ACKNOWLEDGED')} acknowledged without proof; ${n('REQUESTED')} awaiting an answer; ${n('FAILED')} failed.` }; }

/** The failed routes of the drill become one real ServiceHands job; this finds it again. */
export const JOB_TITLE = `Secondary notice routes failed in drill ${ALERT.id}`;
export const jobSummary = (failed: Route[]) => `${failed.length} route${failed.length === 1 ? '' : 's'} gave no acknowledgement in the ${PLAN.ackWindowSeconds}-second window: ${failed.map((r) => `${r.target} (${r.screen})`).join('; ')}. From a simulated drill; no real alert was sent.`;
export const jobFor = (w: Workspace): Incident | undefined => w.incidents.find((i) => i.title === JOB_TITLE);

export const NEVER = ['It never replaces, delays, silences or controls a fire alarm, voice evacuation or mass notification system.', 'It never creates an alert. No model, rule or person in Empathia can originate one.',
  'It never waits for confirmation before a primary system operates; primary systems do not depend on it.', 'It never reports an acknowledgement as “shown”.', 'It holds no certification and claims none.'];
