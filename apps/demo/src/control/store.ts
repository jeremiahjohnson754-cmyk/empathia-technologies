/**
 * A room's panel state, kept per room in this browser, and the one way to change it: `act`. Who may operate a room is V2.5.3's rule
 * (AZ_ACTION control.use), asked of the policy here as well as on the page. Every action that changes something, and every refusal,
 * is written to the workspace ledger with who did it, so an operation of a room is as traceable as a change to its record.
 * Operating a room never changes its commissioned baseline: the panel state is not part of the room record.
 */
import type { Workspace } from '../workspace/store.js';
import { log, deny, personaOf } from '../hardening/kit.js';
import { allows, ROLES } from '../access/policy.js';
import { roomRecord } from '../campus/design.js';
import { roomIssues } from '../campus/metrics.js';
import type { RoleKey } from '../registry.types.js';
import { panelOf, initial, fits, reduce, type Action, type State, type Refusal } from './model.js';
import { adapterFor, type Feedback } from './adapter.js';

const KEY = 'empathia.demo.control.v1';
const all = (): Record<string, unknown> => { try { const s = localStorage.getItem(KEY); const o = s ? JSON.parse(s) : {}; return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch { return {}; } };
export const mayOperate = (role: RoleKey) => allows({ action: 'control.use' }, role);
/** The room's panel state: what was last set here, or the room as found (off) when nothing was, or when what was stored no longer fits the room. */
export function stateOf(roomId: string): State | null { const r = roomRecord(roomId); if (!r) return null; const p = panelOf(r); const s = all()[roomId]; return fits(p, s) ? s : initial(p); }
const keep = (roomId: string, s: State) => { try { localStorage.setItem(KEY, JSON.stringify({ ...all(), [roomId]: s })); } catch { /* the panel lasts the page */ } };

export interface Done { state: State; said: string; feedback: Feedback[]; adapter: string }
/** Operate the room. `w` is the workspace copy being changed (useWorkspace().apply), for the ledger. */
export function act(w: Workspace, role: RoleKey, roomId: string, action: Action): Refusal | Done {
  const r = roomRecord(roomId); if (!r) return { why: ['No room has this address.'] };
  const persona = personaOf(role);
  if (!mayOperate(role)) return deny(w, persona, 'room.control', roomId, [`The ${ROLES[role].label} does not operate rooms.`]);
  const p = panelOf(r); const cur = stateOf(roomId)!; const out = reduce(p, cur, action);
  if ('why' in out) return out;   // nothing changed and nothing was sent: said on the panel, not worth a ledger line
  const known: Record<string, string> = {}; // a problem someone reported about a unit is said when that unit is operated; a design finding on the record is not a fault of the unit
  for (const i of roomIssues(r, w)) if (!/design check/i.test(i.source)) for (const c of i.positions) known[c] ||= i.title;
  const adapter = adapterFor(roomId); const feedback = adapter.send(roomId, out.commands, known);
  keep(roomId, out.state);
  log(w, persona, 'room.control', roomId, `${out.said} · ${out.commands.length} command(s) · ${adapter.provenance.toLowerCase()} · ${ROLES[role].label}`);
  return { state: out.state, said: out.said, feedback, adapter: adapter.label };
}
