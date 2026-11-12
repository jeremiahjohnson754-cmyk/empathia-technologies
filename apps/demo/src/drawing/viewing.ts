/**
 * Display viewing analysis for a drawing (70/10 task 70-2, first vertical slice, 12 Nov 2026): from the room read off a drawing (its
 * scale calibrated by a person), how large a display must be for the farthest viewer, compared across candidate sizes.
 *
 * The method is the campus standard this product already uses, stated with its arithmetic so anyone can repeat it:
 *   ST-VID-02  the image height is at least one sixth of the distance to the farthest viewer, for detailed content
 *              (equivalently: farthest distance ÷ image height ≤ 6);
 *   the Lite sightline classes  an outermost seat more than 45° off the display's axis is marginal, more than 60° obstructed;
 *   a 16:9 image of diagonal D inches is D × 0.0254 × 9 ÷ √337 m high and D × 0.0254 × 16 ÷ √337 m wide.
 * It is NOT the AVIXA DISCAS method and claims nothing from it; no published standard's text is reproduced. Every input says how it is
 * known (the axes: measured, modeled, assumed, unavailable); candidate sizes are proposals, nothing is selected or bought.
 */
import type { Provenance } from '@empathia/ui';

export const SIZES = [75, 86, 98, 110, 125] as const;
const IN = 0.0254, DIAG = Math.sqrt(16 * 16 + 9 * 9);
export const imageOf = (inches: number) => ({ h: (inches * IN * 9) / DIAG, w: (inches * IN * 16) / DIAG });
const r2 = (n: number) => Math.round(n * 100) / 100;
const deg = (rad: number) => Math.round((rad * 180) / Math.PI);

export interface Fact { label: string; value: string; prov: Provenance; basis: string }
export interface SizeRow { inches: number; h: number; w: number; ratio: number; meets: boolean; fits: boolean; verdict: string }
export interface Viewing {
  facts: Fact[]; far: number; outerAngle: number; outerClass: 'CLEAR' | 'MARGINAL' | 'OBSTRUCTED';
  rows: SizeRow[]; recommend: number | null; recommendation: string; method: string[];
  /** what the overlay draws, in metres from the room's top-left corner */
  geom: { W: number; L: number; display: { x: number; y: number; assumed: boolean }; far: [number, number]; front: [number, number]; backRow: number; frontRow: number };
}
/** Clearances assumed where the drawing shows no seats: 0.6 m from the side and back walls; the first row at 30 % of the depth (Lite's convention). */
export const CLEAR_M = 0.6;

export function viewing(room: { width: number; length: number; cls: 'OBSERVED' | 'EXTRACTED' | 'MODELED' | 'INFERRED' | 'VERIFIED' | 'APPROVED' }, display: { x: number; y: number } | null, sizes: readonly number[] = SIZES): Viewing | null {
  const W = room.width, L = room.length; if (!(W > 1 && L > 1)) return null;
  const d = display && display.x >= 0 && display.x <= W && display.y >= 0 && display.y <= L ? display : { x: W / 2, y: 0 };
  const seatsBack = L - CLEAR_M, side = [CLEAR_M, W - CLEAR_M];
  const farX = side.reduce((a, x) => (Math.hypot(x - d.x, seatsBack - d.y) > Math.hypot(a - d.x, seatsBack - d.y) ? x : a), side[0]!); const far = r2(Math.hypot(farX - d.x, seatsBack - d.y));
  const front = Math.max(1.5, L * 0.3); const outerX = side.reduce((a, x) => (Math.abs(x - d.x) > Math.abs(a - d.x) ? x : a), side[0]!); const outer = Math.atan2(Math.abs(outerX - d.x), Math.max(0.1, front - d.y));
  const outerAngle = deg(outer); const outerClass = outerAngle > 60 ? 'OBSTRUCTED' : outerAngle > 45 ? 'MARGINAL' : 'CLEAR';
  const rows: SizeRow[] = sizes.map((inches) => { const { h, w } = imageOf(inches); const ratio = r2(far / h); const meets = ratio <= 6; const fits = w <= W - 2 * CLEAR_M + 1e-9;
    return { inches, h: r2(h), w: r2(w), ratio, meets, fits, verdict: !fits ? `wider than the wall allows (${r2(w)} m on ${r2(W - 2 * CLEAR_M)} m clear)` : meets ? `meets ST-VID-02 (${ratio} image heights)` : `too small for detailed content (${ratio} image heights; the rule allows 6)` }; });
  const ok = rows.filter((r) => r.meets && r.fits); const rec = ok.length ? ok[0]!.inches : null;
  const prov: Provenance = room.cls === 'OBSERVED' || room.cls === 'VERIFIED' || room.cls === 'APPROVED' ? 'measured' : 'modeled';
  return {
    facts: [
      { label: 'Room', value: `${r2(W)} × ${r2(L)} m`, prov, basis: room.cls === 'OBSERVED' ? 'from the drawing, its scale calibrated by a person' : 'from the drawing’s own dimensions and scale' },
      { label: 'Display wall', value: display ? `display at ${r2(d.x)}, ${r2(d.y)} m` : 'the front wall, centred', prov: display ? 'modeled' : 'assumed', basis: display ? 'the display tag’s position on the plan' : 'no display on the plan: assumed' },
      { label: 'Farthest viewer', value: `${far} m`, prov: 'assumed', basis: `no seats on the plan: back row ${CLEAR_M} m from the back wall, outermost seats ${CLEAR_M} m from the side walls` },
      { label: 'Outermost seat off the display’s axis', value: `${outerAngle}° (${outerClass.toLowerCase()})`, prov: 'assumed', basis: `first row at ${r2(front)} m (30 % of the depth, Lite’s convention); more than 45° is marginal, more than 60° obstructed` },
      { label: 'Eye height and vertical angles', value: 'not modeled', prov: 'unavailable', basis: 'the drawing has no section or elevation' },
    ],
    far, outerAngle, outerClass, rows, recommend: rec,
    geom: { W, L, display: { x: d.x, y: d.y, assumed: !display }, far: [farX, seatsBack], front: [outerX, front], backRow: seatsBack, frontRow: front },
    recommendation: rec ? `The smallest of these sizes that meets ST-VID-02 and fits the wall is ${rec}". A proposal for an engineer: nothing is selected or bought.${outerClass !== 'CLEAR' ? ` The outermost seats sit ${outerAngle}° off axis (${outerClass.toLowerCase()}): a second display or narrower seating is worth considering whatever the size.` : ''}`
      : rows.some((r) => r.meets) ? 'The sizes large enough for the farthest viewer are wider than the wall allows: a second display nearer the back, or a projected image, is the conversation to have.'
      : `None of these sizes meets ST-VID-02 for the farthest viewer (${far} m needs an image at least ${r2(far / 6)} m high): a larger image, a second display, or content designed for general viewing only.`,
    method: [`Image height of a 16:9 display of D inches = D × 0.0254 × 9 ÷ √337 m`, `ST-VID-02: farthest distance ÷ image height ≤ 6 for detailed content`, `Farthest viewer = the longest plan distance from the display to a back-row corner seat`, 'Not the AVIXA DISCAS method; no standard’s text is reproduced'],
  };
}
