/**
 * Assurance for one room: its accepted baseline against what the starter knows about it now (@empathia/assurance-engine).
 *
 * The starter has no monitoring feed, no discovery agent and no field survey, so most dimensions are honestly `unknown`; the register
 * comparison (presence) is the only one it can make from records. The response says so in `coverage`. When a feed exists, it fills
 * `Current` (device state, firmware, signature, layout survey, environment, reports) and the same rules run unchanged.
 */
import { assess, type Baseline, type Current, ENGINE_VERSION } from '@empathia/assurance-engine';
import type { RequestContext } from '../auth/context.js';
import { findRoom, load } from './rooms.js';

export async function roomAssurance(ctx: RequestContext, ref: string) {
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref);
    const b = room.baseline as { at: string; signedBy: string; revision: number | null; state: string } | null;
    if (!b) return { room: room.code, state: 'NO_BASELINE', engineVersion: ENGINE_VERSION, reason: `Assurance compares a room with its accepted, signed baseline. ${room.code} is ${room.lifecycle}: it has none yet (a room gets one when it is ACCEPTED).` };
    const snap = (await q.query<{ snapshot: { devices: Array<{ id: string; cat: string; label: string; x: number; y: number; rot: number; furniture: boolean }> } }>('SELECT snapshot FROM app.room_revision WHERE room_id = $1 AND rev_no = $2', [room.id, b.revision ?? 0])).rows[0]?.snapshot;
    const L = await load(ctx, q, room.id);
    const baseline: Baseline = {
      id: `${room.code}@${b.at}`, version: 1, signedAt: b.at, signedBy: b.signedBy, capacity: room.occupancy, configSignature: null, documents: [],
      devices: (snap?.devices || []).filter((d) => !d.furniture).map((d) => ({ id: d.id, category: d.cat, label: d.label })),
      layout: snap ? { objs: snap.devices.map((d) => ({ id: d.id, kind: d.cat, label: d.label, x: d.x, y: d.y, rot: d.rot })) } : null,
    };
    const current: Current = { now: new Date().toISOString(), devices: L.input.devices.filter((d) => !d.furniture).map((d) => ({ id: d.id, category: d.cat, label: d.label, state: null })), layout: null, seats: null, configSignature: null, documentsMissing: null, environment: null, signals: null, checks: [] };
    const a = assess(baseline, current);
    await ctx.audit(q, 'assurance.assess', 'ALLOWED', { type: 'Room', id: room.code }, { worst: a.worst, remedy: a.remedy, assessed: a.coverage.assessed });
    return { room: room.code, state: 'ASSESSED', engineVersion: ENGINE_VERSION, baseline: { signedAt: b.at, revision: b.revision }, liveHealth: 'NOT_MONITORED', note: 'No monitoring feed, discovery agent or field survey is connected: dimensions without evidence are NOT ASSESSED, never assumed to match.', ...a };
  });
}
