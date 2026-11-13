/**
 * V2.5.3's rooms in Empathia's look (13 Nov 2026, founder: "make V2.5.3 the foundation that the new Empathia finally surpasses"; "don't
 * have my rooms or experiences looking like this"). V2.5.3's own layout code places every table, chair, display, camera, microphone,
 * loudspeaker, rack, stage and seat block; this reads that layout — the same objects, the same ids, the same positions and sizes, the same
 * glazing and door — and turns it into a program for Empathia's renderer, so the room keeps V2.5.3's arrangement (source fidelity) and is
 * drawn with real materials, light and furniture. V2.5.3's own drawing stays one switch away.
 */
import type { V253Layout, V253Object } from '../v253/vendor.js';
import type { Piece, Program, Side, WallSpec } from './programs.js';

/** V2.5.3's `face` (the way a thing faces, degrees, 0 = +x, 90 = +y) to Empathia's `rot` (0 faces −y) */
const rotOf = (face: number) => (((face + 90) % 360) + 360) % 360;
const FLOOR: Record<string, Program['floor']> = { carpet: 'carpet', timber: 'oak', wood: 'oak', parquet: 'oak', vinyl: 'vinyl', tile: 'vinyl', resin: 'vinyl', concrete: 'concrete' };
const CEILING = new Set(['spk', 'micceil', 'sensor', 'antenna']);

function pieceOf(o: V253Object): Piece | Piece[] | null {
  const base = { id: o.id, label: String(o.label || o.kind), x: o.x, y: o.y, w: o.w, d: o.d, h: o.h, z: o.z || 0, device: o.deviceId ? `${o.label || o.kind} (on record)` : undefined };
  const face = typeof o.face === 'number' ? (o.face as number) : null;
  switch (o.kind) {
    case 'chair': return { ...base, kind: 'chair1', label: 'Chair', rot: rotOf(face ?? 90) };
    case 'table': return { ...base, kind: 'table0', rot: o.rot || 0 };
    case 'display': case 'ledwall': return { ...base, kind: 'display', rot: rotOf(face ?? 90) };
    case 'rack': return { ...base, kind: 'credenza', rot: (o.rot || 0) + 180 };
    case 'desk': return { ...base, kind: 'controldesk', rot: o.rot || 0 };
    case 'lectern': return { ...base, kind: 'lectern', rot: rotOf(face ?? 90), label: 'Lectern' };
    case 'touch': return { ...base, kind: 'touch' };
    case 'bar': return { ...base, kind: 'videobar', rot: rotOf(face ?? 90) };
    case 'camera': return { ...base, kind: 'camera', rot: rotOf(face ?? 90) };
    case 'scheduler': return { ...base, kind: 'panel', rot: rotOf(face ?? 270) };
    case 'stage': return { ...base, kind: 'stage' };
    case 'divider': return { ...base, kind: 'divider' };
    case 'micwireless': return { ...base, kind: 'wireless' };
    case 'seatblock': { const cols = Number(o.cols) || 1, rows = Number(o.rows) || 1, x0 = Number(o.x0), y0 = Number(o.y0), px = Number(o.px) || 0.6, py = Number(o.py) || 0.9;
      const at: Array<[number, number]> = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) at.push([x0 + px * (c + 0.5), y0 + py * (r + 0.5)]);
      return { ...base, kind: 'seatblock', rot: rotOf(face ?? 270), at, label: String(o.label || 'Audience block') }; }
    default: return CEILING.has(o.kind) ? { ...base, kind: 'ceildev' } : { ...base, kind: 'box' };
  }
}

/** A program from V2.5.3's layout of a room. `devices`: ceiling devices (loudspeakers, microphones, sensors) are shown floating at the
 *  ceiling from above, as V2.5.3 showed them, when the lens shows equipment. */
export function programFromV253(L: V253Layout, o: { devices: boolean }): Program {
  const glass = new Set((L.glass as Side[] | undefined) || []); const door = L.door as { wall: Side; at: number; width: number } | undefined;
  const walls = {} as Record<Side, WallSpec>;
  for (const s of ['N', 'E', 'S', 'W'] as Side[]) { const w: WallSpec = {}; if (glass.has(s)) w.glass = true; if (door && door.wall === s) { if (w.glass) w.slide = { at: door.at, w: door.width }; else w.door = { at: door.at, w: door.width, hinge: 'hi' }; } walls[s] = w; }
  const surf = (L.surf as { floor?: string } | undefined) || {}; const pieces: Piece[] = [];
  for (const ob of L.objs) { const p = pieceOf(ob); if (!p) continue; for (const q of Array.isArray(p) ? p : [p]) { if (q.kind === 'ceildev' && !o.devices) q.kind = 'ceildev-hidden'; pieces.push(q); } }
  const spks = ((L.spks as V253Object[] | undefined) || []).map((s) => [s.x, s.y] as [number, number]);
  const lights: Array<[number, number]> = []; const sx = Math.max(1.6, L.w / Math.max(2, Math.round(L.w / 2.2))), sy = Math.max(1.6, L.d / Math.max(2, Math.round(L.d / 2.2)));
  for (let y = sy / 2; y < L.d; y += sy) for (let x = sx / 2; x < L.w; x += sx) lights.push([x, y]);
  return { key: 'v253', title: 'V2.5.3’s layout', summary: 'V2.5.3’s arrangement of this room, drawn by Empathia.', w: L.w, d: L.d, H: Math.min(L.h || 3, 6), floor: FLOOR[surf.floor || ''] || 'carpet',
    walls, pieces, eyes: [], lights: lights.slice(0, 60), speakers: spks, outside: null, hero: { yaw: 30, pitch: 36 } };
}
