/**
 * The enterprise API's adapter to the shared design-edit rule (D-39) — pure, no database: rooms.ts runs it on every device, connection and
 * room-detail edit, and the parity test (apps/demo/test/installations.test.mjs) runs Build a Room's edits against it. The rule and its
 * sentences are @empathia/commissioning-engine's `designEditRefusal`.
 */
import { designEditRefusal, type DesignEdit } from '@empathia/commissioning-engine';

/** The edit a device PATCH asks for: a model change alone is a model substitution; a change of position, rotation or mount — or no model — moves the device. */
export const patchEdit = (body: { x?: number | null; y?: number | null; rot?: number | null; mount?: string | null; model?: string | null }): DesignEdit =>
  (body.x != null || body.y != null || body.rot != null || body.mount != null || !body.model ? 'move-device' : 'substitute-model');

/** Why the edit is refused for this room now (null: accepted). `recommissioning`: an accepted room under recommissioning (a CURRENT baseline). */
export const designEditFor = (room: { code: string; lifecycle: string }, recommissioning: boolean, edit: DesignEdit): string | null =>
  designEditRefusal({ room: room.code, lifecycle: room.lifecycle, recommissioning, edit });
