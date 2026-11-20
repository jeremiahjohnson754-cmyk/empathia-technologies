/**
 * Where a panel's commands go. An adapter takes the commands a panel action produced and returns what the room answered, one answer per
 * command, each with where the answer came from. The panel never talks to equipment itself.
 *
 * SIMULATED is the only adapter in this demonstration: it answers as the room would and marks every answer SIMULATED. Nothing leaves the
 * browser. A unit with an open problem on the room's record still answers, and the answer carries that problem, so an operator is not
 * told "done" about a unit the record says is faulty.
 *
 * A real adapter (a control processor's API, a vendor cloud, a gateway on the customer's network) would implement the same contract
 * and would additionally need: the customer's written authorisation for each room, credentials held server-side and never in the page,
 * a dry run, a rate limit, an emergency stop, and every command in the audit ledger before it is sent. None of that exists yet, so
 * `connected()` is always empty and the page says so. (Standing rule: no unauthorised discovery or device control.)
 */
import type { Command } from './model.js';

export type Provenance = 'SIMULATED' | 'OBSERVED';
export interface Feedback { target: string; verb: Command['verb']; value: Command['value']; ok: boolean; said: string; provenance: Provenance; caution?: string }
export interface Adapter { id: string; label: string; provenance: Provenance; /** rooms this adapter is authorised and able to reach */ reaches: (roomId: string) => boolean; send: (roomId: string, commands: Command[], known: Record<string, string>) => Feedback[] }

const WORD: Record<Command['verb'], (v: Command['value']) => string> = {
  power: (v) => (v ? 'reports on' : 'reports standby'), route: (v) => `reports ${v === 'off' ? 'no input' : `input ${v}`}`, volume: (v) => `reports level ${v}`, mute: (v) => (v ? 'reports output muted' : 'reports output on'),
  'mic-mute': (v) => (v ? 'reports microphones muted' : 'reports microphones on'), camera: (v) => (v ? 'reports the lens open' : 'reports the lens closed'), preset: (v) => `reports preset ${v}`,
};
export const SIMULATED: Adapter = {
  id: 'simulated', label: 'Simulated room (no equipment is contacted)', provenance: 'SIMULATED', reaches: () => true,
  send: (_roomId, commands, known) => commands.map((c) => ({ target: c.target, verb: c.verb, value: c.value, ok: true, said: `${c.target} ${WORD[c.verb](c.value)}`, provenance: 'SIMULATED' as const, ...(known[c.target] ? { caution: `The room’s record has an open problem on this unit: ${known[c.target]}` } : {}) })),
};
/** Adapters that reach real equipment. None is written; the list is here so the page states the truth from one place. */
export const connected = (): Adapter[] => [];
export const adapterFor = (roomId: string): Adapter => connected().find((a) => a.reaches(roomId)) || SIMULATED;
