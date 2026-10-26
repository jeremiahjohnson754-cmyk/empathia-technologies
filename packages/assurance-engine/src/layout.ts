/**
 * What differs between two layouts of the same room: objects moved, added and removed; seats are counted, not listed; camera presets
 * whose aim changed. Port of `layoutDiff` (2.5.4 src/57-derive-assure.js lines 17–24), thresholds unchanged:
 *   moved   — the same object more than MOVE_M metres away, or turned more than TURN_DEG degrees;
 *   preset  — a camera preset aimed more than PRESET_DEG degrees differently.
 */
export const MOVE_M = 0.12;
export const TURN_DEG = 3;
export const PRESET_DEG = 1.5;

export interface LayoutObject { id: string; kind: string; label?: string; x: number; y: number; rot?: number; presets?: Array<{ name: string; aim: number }> }
export interface Layout { objs: LayoutObject[]; seats?: number }
export interface Moved { o: LayoutObject; from: LayoutObject; d: number; rot: number }
export interface LayoutDiff { moved: Moved[]; added: LayoutObject[]; removed: LayoutObject[]; seatsMoved: number; seatsWas: number; seatsNow: number; presets: Array<{ cam: string; i: number; name: string; was: number; now: number; off: number }> }

/** Smallest difference between two angles in degrees (0–180). */
export function angDiff(a: number, b: number): number { const d = Math.abs(((a - b) % 360 + 540) % 360 - 180); return d; }

export function layoutDiff(A: Layout, B: Layout): LayoutDiff {
  const a = new Map(A.objs.map((o) => [o.id, o]));
  const moved: Moved[] = []; const added: LayoutObject[] = []; const removed: LayoutObject[] = []; let seatsMoved = 0;
  for (const o of B.objs) {
    const p = a.get(o.id);
    if (!p) { if (o.kind === 'chair') continue; added.push(o); continue; }
    a.delete(o.id);
    const d = Math.hypot(p.x - o.x, p.y - o.y); const rot = angDiff(p.rot || 0, o.rot || 0);
    if (d > MOVE_M || rot > TURN_DEG) { if (o.kind === 'chair') seatsMoved += 1; else moved.push({ o, from: p, d, rot }); }
  }
  for (const p of a.values()) if (p.kind !== 'chair') removed.push(p);
  const presets: LayoutDiff['presets'] = [];
  for (const c of B.objs.filter((x) => x.presets?.length)) {
    const p = A.objs.find((x) => x.id === c.id); if (!p?.presets) continue;
    c.presets!.forEach((q, i) => { const w = p.presets![i]; if (w && angDiff(w.aim, q.aim) > PRESET_DEG) presets.push({ cam: c.id, i, name: q.name, was: w.aim, now: q.aim, off: Math.round(angDiff(w.aim, q.aim)) }); });
  }
  const seatsWas = A.seats ?? A.objs.filter((o) => o.kind === 'chair').length;
  const seatsNow = B.seats ?? B.objs.filter((o) => o.kind === 'chair').length;
  return { moved, added, removed, seatsMoved, seatsWas, seatsNow, presets };
}
