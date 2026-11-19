/**
 * Finding the room a request is about (directive 19 Nov 2026 §04 step 2): by its name or number, the address on its QR label, or the code of
 * a device in it; and the rooms the person has asked about before. Read from the campus records and Search Party's own index; the
 * canonical room id is always the answer, never a new record.
 */
import { CAMPUS_ROOMS, fullName, roomById, ARCHETYPE_NAME, buildingByKey } from '../campus/canon.js';
import { allRecords } from '../campus/design.js';
import { find } from '../search/find.js';
import { roomIn } from './classify.js';
import { loadRecords } from './store.js';

export interface Place { roomId: string; label: string; detail: string; position: string | null; why: string }
const describe = (id: string) => { const o = roomById(id)!; return `${buildingByKey(o.building)?.name || o.building} · floor ${o.floor} · ${ARCHETYPE_NAME[o.archetype] || o.archetype} · ${o.capacity} seats`; };
const DEVICE = /\b(?!R-)([A-Z]{1,3}-\d{3,4})\b/i;

/** Rooms matching what was typed, best first, at most `limit`. A device code finds the room it is in, and names the device. */
export function locate(q: string, limit = 8): Place[] {
  const t = q.trim().slice(0, 120); if (t.length < 2) return [];
  const exact = roomIn(t); if (exact) return [{ roomId: exact, label: fullName(roomById(exact)!), detail: describe(exact), position: null, why: /lite\/room|https?:/i.test(t) ? 'from the QR code’s address' : 'by its number' }];
  const dev = t.match(DEVICE)?.[1]?.toUpperCase();
  if (dev) {
    const out: Place[] = []; for (const r of allRecords()) for (const p of r.positions) if (!p.furniture && (p.code.toUpperCase() === dev || (p.asset || '').toUpperCase() === dev)) out.push({ roomId: r.outline.id, label: fullName(r.outline), detail: describe(r.outline.id), position: p.code, why: `${p.label} (${p.code}${p.asset ? `, asset ${p.asset}` : ''}) is here` });
    if (out.length) return out.slice(0, limit);
  }
  return find(t, 40).filter((h) => h.kind === 'room').map((h) => h.id.slice(5)).filter((id) => roomById(id)).slice(0, limit).map((id) => ({ roomId: id, label: fullName(roomById(id)!), detail: describe(id), position: null, why: 'by its name' }));
}
/** Rooms this browser has asked about, most recent first. */
export function recentRooms(limit = 4): string[] {
  const seen: string[] = []; for (const r of loadRecords()) if (r.roomId && roomById(r.roomId) && !seen.includes(r.roomId)) seen.push(r.roomId); return seen.slice(0, limit);
}
export const roomsOf = (building: string) => CAMPUS_ROOMS.filter((r) => r.building === building);
