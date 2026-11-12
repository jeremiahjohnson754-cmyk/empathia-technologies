/** V2.5.3's rt60Of, restored 12 Nov 2026: Sabine's RT60 = 0.161 × V ÷ A at 1 kHz, A from the room's surfaces and its seats. The records
 *  hold no finishes, so the finishes are ASSUMED (V2.5.3's own absorption table): carpet floor, acoustic tile ceiling, plasterboard walls
 *  with a tenth of glass. An estimate for comparing rooms, never evidence: a commissioning measurement is. */
export const ABSORB = { carpet: 0.3, tile: 0.7, wall: 0.08, glass: 0.04, seat: 0.22, person: 0.42 } as const;
export const RT60_ASSUMED = 'carpet floor, acoustic tile ceiling, plasterboard walls with 10 % glass';
export function rt60Estimate(dims: readonly number[], seats: number, people = 0): number {
  const [w, l, h] = dims as [number, number, number]; const V = w * l * h, Sf = w * l, Sw = 2 * h * (w + l);
  const A = Sf * ABSORB.carpet + Sf * ABSORB.tile + Sw * (0.1 * ABSORB.glass + 0.9 * ABSORB.wall) + seats * ABSORB.seat + people * ABSORB.person;
  return Math.round(((0.161 * V) / A) * 100) / 100;
}
