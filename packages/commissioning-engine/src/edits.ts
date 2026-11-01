/**
 * Which design edits a room accepts now (D-39) — one rule, one wording, for the enterprise API and the investor demonstration.
 *
 *   PLANNED                                   every edit: add, remove, move or swap a device, change its model, add or remove a connection,
 *                                             change the room's name, use or occupancy
 *   COMMISSIONING while an accepted room is   a model substitution at a position only (the position keeps its id; the old unit is closed
 *   recommissioned (a CURRENT baseline,        SUBSTITUTED and a unit of the new model installed: planReplacement); moving a device has its
 *   ADR-0003)                                 own sentence; everything else is PLANNED-only
 *   any other state                           nothing: "the design is <state>: changes need a change order" (ACCEPTED adds how to recommission)
 *
 * A like-for-like replacement of the unit at a position is field work, not a design edit: `planReplacement` governs it (INSTALLED_UNVERIFIED
 * or COMMISSIONING). A category swap is not an operation of the API: it is a removal and then an addition, and is refused or allowed as
 * they are. The sentences are the API's (rooms.ts), byte for byte. Pure: the caller knows the lifecycle and whether the room is recommissioned.
 */
export const DESIGN_EDITS = ['add-device', 'remove-device', 'move-device', 'substitute-model', 'swap-category', 'add-connection', 'remove-connection', 'edit-room'] as const;
export type DesignEdit = (typeof DESIGN_EDITS)[number];

/** Why the design edit is refused now, in the API's words; null when it is accepted (authority is the caller's own check, made first). */
export function designEditRefusal(f: { room: string; lifecycle: string; recommissioning: boolean; edit: DesignEdit }): string | null {
  if (f.lifecycle === 'PLANNED') return null;
  if (f.recommissioning) {
    if (f.edit === 'substitute-model') return null;
    if (f.edit === 'move-device') return `${f.room} is being recommissioned: only a model substitution is accepted (the asset keeps its id and its position); moving a device needs a change order`;
  }
  return `the design is ${f.lifecycle}: changes need a change order${f.lifecycle === 'ACCEPTED' ? ' — an accepted room is recommissioned first (ACCEPTED → COMMISSIONING, plan.compile); a device model can then be substituted' : ''}`;
}
