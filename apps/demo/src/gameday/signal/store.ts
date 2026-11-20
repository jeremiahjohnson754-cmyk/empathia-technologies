/**
 * The one way the incident page changes anything. Each call does three things, in this order:
 *   1. asks who is acting (signal/access.ts): the technical roles work the incident, and the roles that may open it check the fix;
 *   2. asks the game-day engine to make the move (gameday/engine.ts): the engine keeps the order of the steps and refuses a check
 *      by the role that made the fix. No rule of the engine is repeated or relaxed here;
 *   3. writes who did what to the shared workspace ledger (workspace/store.ts › events), refusals included, in the same event shape
 *      every other page writes, so the ledger page shows the stadium's line beside the campus's.
 * It returns the new event state for the caller to keep (gameday/store.ts), or the reasons it was refused.
 */
import type { Workspace } from '../../workspace/store.js';
import { deny, log } from '../../hardening/kit.js';
import { FAULTS, inject, respond, type GameDay, type Step } from '../engine.js';
import { mayOpenSignal, mayVerifySignal, mayWorkSignal } from './access.js';
import { FAULT, incidentOf } from './model.js';

/** Who is acting: a stadium role configuration (its address form and its label). */
export interface Actor { config: string; label: string }
export type Done = { ok: true; state: GameDay; said: string; id: string } | { ok: false; why: string[] };
export const VENUE = 'Harborlight Stadium (fictional), simulated event';
const TYPE = (s: string) => `gameday.incident.${s.toLowerCase()}`;
const refuse = (w: Workspace, a: Actor, type: string, aggregate: string, why: string[]): Done => ({ ok: false, why: deny(w, a.label, type, aggregate, why).why });
const STEP_WORD: Record<Step, string> = { OPEN: 'opened', ACKNOWLEDGED: 'acknowledged', DISPATCHED: 'dispatched', FIXED: 'recorded as fixed', VERIFIED: 'verified' };

/** Start the scenario from the incident page: the same `inject` the game-day page uses, so there is one incident and one state. */
export function simulateLoss(w: Workspace, g: GameDay, a: Actor): Done {
  if (!mayWorkSignal(a.config)) return refuse(w, a, TYPE('opened'), FAULT, [`The ${a.label} does not start this scenario. It is started by the stadium’s broadcast and engineering roles.`]);
  const r = inject(g, FAULT); if (!r.ok) return refuse(w, a, TYPE('opened'), FAULT, [r.why]);
  const i = incidentOf(r.state)!;
  log(w, a.label, TYPE('opened'), i.id, `${FAULTS[FAULT].title} · scenario started by the ${a.label} · ${VENUE}`);
  return { ok: true, state: r.state, said: `${i.id} opened.`, id: i.id };
}

/** Move the incident one step as this role, with the words to keep (the procedure taken, what was done, the evidence named). */
export function step(w: Workspace, g: GameDay, a: Actor, id: string, to: Step, note?: string): Done {
  const type = TYPE(to); const i = g.incidents.find((x) => x.id === id);
  if (!mayOpenSignal(a.config)) return refuse(w, a, type, id, [`The ${a.label} is not shown game-day incidents.`]);
  if (!i || i.fault !== FAULT) return refuse(w, a, type, id, ['This is not the camera feed incident.']);
  if (to === 'VERIFIED' ? !mayVerifySignal(a.config) : !mayWorkSignal(a.config)) return refuse(w, a, type, id, [`The ${a.label} checks a fix. Acknowledging, dispatching and fixing are for the stadium’s broadcast and engineering roles.`]);
  const r = respond(g, id, to, a.label, note); if (!r.ok) return refuse(w, a, type, id, [r.why]);
  log(w, a.label, type, id, `${FAULTS[FAULT].title} · ${STEP_WORD[to]} by the ${a.label}${note ? ` · ${note.trim().slice(0, 300)}` : ''} · ${VENUE}`);
  return { ok: true, state: r.state, said: `${id} ${STEP_WORD[to]}.`, id };
}

/** The procedure did not bring the picture back: nothing moves in the engine (the incident stays dispatched and still holds what it held); the attempt is written down. */
export function notRestored(w: Workspace, g: GameDay, a: Actor, id: string, note: string): Done {
  const i = g.incidents.find((x) => x.id === id); const type = TYPE('not_restored');
  if (!mayWorkSignal(a.config)) return refuse(w, a, type, id, [`The ${a.label} does not record work on this incident.`]);
  if (!i || i.fault !== FAULT) return refuse(w, a, type, id, ['This is not the camera feed incident.']);
  if (i.step !== 'DISPATCHED') return refuse(w, a, type, id, [`${id} is ${i.step.toLowerCase()}. An attempt is recorded once the procedure has been started.`]);
  log(w, a.label, type, id, `${FAULTS[FAULT].title} · not restored · ${note.trim().slice(0, 300)} · ${VENUE}`);
  return { ok: true, state: g, said: `${id}: recorded as not restored. It stays dispatched.`, id };
}

/** The ledger's lines about one incident, newest first. */
export const ledgerOf = (w: Workspace, id: string) => w.events.filter((e) => e.aggregate === id && e.type.startsWith('gameday.incident.'));
