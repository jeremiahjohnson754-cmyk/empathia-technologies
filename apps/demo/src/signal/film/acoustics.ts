/**
 * Ten Seats, the acoustics behind the film's playable scenes (S01E01, CASE-001). Pure functions, so the unit test can check them.
 *
 * The canon gives the mechanism and its numbers (panels 27, 28, 39, 40, 43, 62): the sound from the mains and a second copy from the
 * fill, bounced off the ceiling, reach the same seat at two times. Each seat's path difference ΔL sets a delay Δt = ΔL / c, and the sum
 * cancels at odd multiples of 1 / (2Δt) — a comb. Seat 13: ΔL ≈ 1.7 m → Δt ≈ 4.96 ms → first notch ≈ 101 Hz, then every ≈ 202 Hz.
 * Seat 12: ΔL ≈ 1.4 m → ≈ 123 Hz, every ≈ 245 Hz. Fill down 6 dB → the notches get shallower, not gone. After the re-aim the ten
 * seats' deep notches are gone and the balcony front is weaker.
 *
 * Every other number here (the other eight seats' ΔL, the reflection gains, the balcony level) is ILLUSTRATIVE: chosen to behave as
 * the canon says, not measured anywhere. The film says so beside every plot.
 */
export const C = 343;   // speed of sound, m/s (the canon's figure)
export interface Seat { id: string; row: number; seat: number; dl: number; hollow: boolean; side?: boolean; balcony?: boolean }
/** The ten hollow seats (rows 7–9, centre) and the seats around them. Seats 12 and 13 of row 8 carry the canon's own ΔL. */
export const SEATS: Seat[] = [
  { id: 'R7-11', row: 7, seat: 11, dl: 1.2, hollow: true }, { id: 'R7-12', row: 7, seat: 12, dl: 1.5, hollow: true }, { id: 'R7-13', row: 7, seat: 13, dl: 1.8, hollow: true },
  { id: 'R8-10', row: 8, seat: 10, dl: 1.1, hollow: true }, { id: 'R8-11', row: 8, seat: 11, dl: 1.25, hollow: true }, { id: 'R8-12', row: 8, seat: 12, dl: 1.4, hollow: true },
  { id: 'R8-13', row: 8, seat: 13, dl: 1.7, hollow: true }, { id: 'R8-14', row: 8, seat: 14, dl: 1.95, hollow: true },
  { id: 'R9-12', row: 9, seat: 12, dl: 1.55, hollow: true }, { id: 'R9-13', row: 9, seat: 13, dl: 1.85, hollow: true },
  // the seats around them: the reflection reaches them late and weak, so no comb you would hear
  { id: 'R8-9', row: 8, seat: 9, dl: 3.4, hollow: false, side: true }, { id: 'R8-15', row: 8, seat: 15, dl: 3.6, hollow: false, side: true },
  { id: 'R4-12', row: 4, seat: 12, dl: 4.8, hollow: false }, { id: 'R11-12', row: 11, seat: 12, dl: 4.2, hollow: false },
  { id: 'BAL-F', row: 0, seat: 12, dl: 0, hollow: false, balcony: true },
];
export const TEN = SEATS.filter((s) => s.hollow);
export type FillState = 'up' | 'off' | 'reaimed';
export interface Rig { fill: FillState; fillDb: number; eq: boolean }
export const RIG_START: Rig = { fill: 'up', fillDb: 0, eq: false };
/** How strong the ceiling's copy is at a seat, relative to the direct sound (illustrative gains). */
export function reflection(s: Seat, rig: Rig): number {
  if (s.balcony || rig.fill === 'off') return 0;
  const lvl = 10 ** (rig.fillDb / 20);
  if (rig.fill === 'reaimed') return (s.hollow ? 0.12 : 0.08) * lvl;
  return (s.hollow ? 0.8 : 0.1) * lvl;
}
export const delayMs = (s: Seat) => (s.dl / C) * 1000;
export const firstNotch = (s: Seat) => C / (2 * s.dl);
export const notchSpacing = (s: Seat) => C / s.dl;
/** The seat's response in dB at frequency f: |1 + g·e^(−j2πfΔt)|, with the fill's mid-band EQ cut when one was made before measuring. */
export function responseDb(s: Seat, rig: Rig, f: number): number {
  if (s.balcony) return rig.fill === 'up' ? 2.5 + rig.fillDb * 0.4 : rig.fill === 'reaimed' ? -3.5 : -4.5;   // the fill used to reach the balcony front
  let g = reflection(s, rig);
  if (rig.eq && f > 180 && f < 700) g *= 0.6;   // BR-S01E01-01 A: an EQ cut "in the mids" on the fill before any baseline
  const w = 2 * Math.PI * f * (s.dl / C);
  const re = 1 + g * Math.cos(w); const im = -g * Math.sin(w);
  const side = s.side && rig.fill === 'off' ? -3 : 0;   // BR-S01E01-02 B: fill off thins the side rows
  return 20 * Math.log10(Math.max(1e-4, Math.hypot(re, im))) + side;
}
export const FREQS: number[] = Array.from({ length: 160 }, (_, i) => 50 * (2000 / 50) ** (i / 159));   // 50 Hz – 2 kHz, log spaced
export const curve = (s: Seat, rig: Rig) => FREQS.map((f) => responseDb(s, rig, f));
/** The deepest dip below 2 kHz and the first notch the seat shows, as an analyzer would read them. */
export function reading(s: Seat, rig: Rig): { first: number | null; depth: number; delay: number } {
  const c = curve(s, rig); const depth = Math.min(...c);
  if (s.balcony) return { first: null, depth: Math.round(depth * 10) / 10, delay: 0 };   // a level, not a comb: no reflection path there
  if (depth > -3) return { first: null, depth: Math.round(depth * 10) / 10, delay: Math.round(delayMs(s) * 100) / 100 };
  return { first: Math.round(firstNotch(s)), depth: Math.round(depth * 10) / 10, delay: Math.round(delayMs(s) * 100) / 100 };
}
/** "If they move when I move one seat, no EQ setting fixes all ten": the ten seats' first notches, all different. */
export const notchesMove = (ids: string[], rig: Rig) => new Set(ids.map((id) => reading(SEATS.find((s) => s.id === id)!, rig).first)).size === ids.length;
