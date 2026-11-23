/**
 * Empathia OMNIPRESENCE — a building's tag opens the building on a phone (Enterprise 3.0 directive 1, capability 8; journey J11).
 * Four claims are kept apart, because a tag settles only one of them:
 *   place      the tag names a building. It can be photographed or copied, so it proves nothing about where the phone is;
 *   identity   who is signed in (here: the demonstration's View-as persona; in the product, the tenant's sign-in);
 *   authority  what that person may do, decided by policy on every request, never by the tag;
 *   presence   that the person is at the room. UNKNOWN until a separate, opted-in proof is given (here: one simulated room anchor).
 * A tag carries a building's key and nothing else: no credential, no address of equipment, no token. `tagProblems` is the check.
 * Control begun from a tag is the existing room panel's (control/store.act: V2.5.3's control.use, the simulated adapter, the ledger);
 * OMNIPRESENCE adds the conditions a phone at the door must also meet, and shows the answer in stages: REQUESTED, ACCEPTED, then
 * OBSERVED or FAILED for each unit. Nothing is sent to equipment. No React: the unit suite runs it.
 */
import type { RoleKey } from '../registry.types.js';
import { ROLES, allows } from '../access/policy.js';
import { buildingByKey, roomsIn, roomById, type RoomOutline } from '../campus/canon.js';
import { roomRecord } from '../campus/design.js';
import { panelOf } from '../control/model.js';
import type { Feedback } from '../control/adapter.js';
import type { EvidenceState } from '../voice/model.js';

export const tagPayload = (base: string, building: string) => `${base}#/omnipresence/b/${building}`;
/** What a tag must never carry. Empty when the payload is clean. */
export function tagProblems(payload: string): string[] {
  let u: URL; try { u = new URL(payload); } catch { return ['an address that cannot be read']; }
  const out: string[] = []; const rest = `${u.pathname}${u.search}${u.hash}`;
  if (u.username || u.password) out.push('a user name or password');
  if (/\b\d{1,3}(\.\d{1,3}){3}\b/.test(rest)) out.push('a network address of equipment');
  if (/(token|key|secret|password|passwd|auth|session|sig|signature|credential)s?=/i.test(rest)) out.push('a token, key or secret');
  if (u.search || !/^#\/omnipresence\/b\/[A-Z]{2,4}$/.test(u.hash)) out.push('more than a building’s key');
  return out;
}
export type Presence = 'none' | 'anchor';
export const presenceOf = (v: string | null): Presence => (v === 'anchor' ? 'anchor' : 'none');
export interface Claim { id: 'place' | 'identity' | 'authority' | 'presence'; title: string; state: EvidenceState; says: string }
export const mayControl = (role: RoleKey) => allows({ action: 'control.use' }, role);
export function claims(role: RoleKey, building: string, presence: Presence): Claim[] {
  const b = buildingByKey(building);
  return [
    { id: 'place', title: 'Place', state: 'DECLARED', says: `The tag names ${b ? b.name : 'a building that is not on record'}. A tag can be photographed or copied: it says which building to open, and proves nothing about where this phone is.` },
    { id: 'identity', title: 'Identity', state: 'DECLARED', says: `You are viewing as the ${ROLES[role].label} (a demonstration persona). In the product this is the tenant’s own sign-in; the tag never signs anyone in.` },
    { id: 'authority', title: 'Authority', state: 'DECLARED', says: mayControl(role) ? `The ${ROLES[role].label} may operate rooms. That comes from the role’s policy, checked again on every request, not from the tag.` : `The ${ROLES[role].label} does not operate rooms. Scanning a tag does not change that.` },
    { id: 'presence', title: 'Presence', state: presence === 'anchor' ? 'SIMULATED' : 'UNKNOWN', says: presence === 'anchor' ? 'A simulated tap of the room’s own anchor, valid for five minutes. In the product this is an opt-in proof (a tag inside the room, or a short-range radio), separate from the building’s tag.' : 'Not proven. Nothing shows that this phone is at a room.' },
  ];
}
export function rooms(building: string, q = ''): RoomOutline[] {
  const t = q.trim().toLowerCase(); return roomsIn(building).filter((r) => !t || `${r.number} ${r.name} ${r.aliases.join(' ')}`.toLowerCase().includes(t)).sort((a, b) => a.floor - b.floor || a.number.localeCompare(b.number));
}
export interface Check { id: 'authority' | 'scope' | 'capability' | 'safety' | 'presence' | 'permission'; title: string; ok: boolean; says: string }
/** Every condition for a command begun from a building's tag. All are evaluated and shown; the command is offered only when all hold. */
export function evaluate(role: RoleKey, building: string, roomId: string, presence: Presence): { allowed: boolean; checks: Check[]; says: string } {
  const room = roomById(roomId); const rec = roomRecord(roomId); const panel = rec ? panelOf(rec) : null; const b = buildingByKey(building);
  const authority = mayControl(role); const scope = !!room && room.building === building; const capability = !!panel && panel.powered.length > 0; const present = presence === 'anchor';
  const allowed = authority && scope && capability && present;
  const checks: Check[] = [
    { id: 'authority', title: 'Authority', ok: authority, says: authority ? `The ${ROLES[role].label} may operate rooms (the same rule as the room’s own panel).` : `The ${ROLES[role].label} does not operate rooms.` },
    { id: 'scope', title: 'Scope', ok: scope, says: scope ? `The room is in ${b?.name || building}, the building the tag names.` : 'The room is not in the building the tag names.' },
    { id: 'capability', title: 'Capability', ok: capability, says: capability ? `The room’s record has ${panel!.powered.length} unit${panel!.powered.length === 1 ? '' : 's'} that can be switched on and off.` : 'The room’s record has nothing that can be switched from here.' },
    { id: 'safety', title: 'Safety policy', ok: true, says: 'From a building’s tag only the room’s on and off is offered. Engineer functions are never offered from a tag (declared policy, synthetic).' },
    { id: 'presence', title: 'Presence', ok: present, says: present ? 'A presence proof was given (simulated room anchor).' : 'No presence proof was given. The declared policy requires one for control begun from a tag.' },
    { id: 'permission', title: 'Short-lived permission', ok: allowed, says: allowed ? 'A five-minute permission for this one room would be issued by the server. Simulated: nothing is issued in the demonstration.' : 'Not issued, because a condition above does not hold.' },
  ];
  const first = checks.find((c) => !c.ok);
  return { allowed, checks, says: allowed ? 'Every condition holds. The command goes to the room’s simulated panel and is written to the ledger.' : `Not offered. ${first!.says}` };
}
export type Stage = 'REQUESTED' | 'ACCEPTED' | 'OBSERVED' | 'FAILED';
export interface ReceiptLine { stage: Stage; says: string; basis: EvidenceState }
/** The answer to a command, in stages. A unit that did not answer well is FAILED and is never folded into "done". */
export function receipt(done: { said: string; feedback: Feedback[]; adapter: string }, role: RoleKey): ReceiptLine[] {
  return [{ stage: 'REQUESTED', says: `${done.said} Requested by the ${ROLES[role].label}; written to the ledger.`, basis: 'DECLARED' },
    { stage: 'ACCEPTED', says: `Accepted by: ${done.adapter}. ${done.feedback.length} command${done.feedback.length === 1 ? '' : 's'}.`, basis: 'SIMULATED' },
    ...done.feedback.map((f): ReceiptLine => ({ stage: f.ok ? 'OBSERVED' : 'FAILED', says: `${f.said}${f.caution ? `. ${f.caution}` : ''}`, basis: f.provenance === 'OBSERVED' ? 'OBSERVED' : 'SIMULATED' }))];
}
