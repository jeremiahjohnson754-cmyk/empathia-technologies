/**
 * Where a device is: one answer, read by every product (founder, 17 Nov 2026: "The critical requirement is one shared source of
 * truth. If someone moves a camera in Engineering, its coordinates should update in Lite, its relevant commissioning checks should be
 * reassessed, and Assurance should preserve the revision history. Not three different products pretending to agree.").
 *
 * A position has a designed place (the design; changed only by a design edit, which makes a revision) and, once the installation
 * team has moved it and someone else has approved the move, an as-built place (the field record; migration 0034). Neither overwrites
 * the other. Until 17 Nov 2026 the field record read both, the room as Engineering reads it returned the designed place alone and
 * unlabelled, and the baseline Assurance takes recorded no place at all. They now all call this:
 *   designed   where the design puts it
 *   asBuilt    where the approved field move put it, with the move, who decided and when; null if it was never moved
 *   proposed   a move still waiting for a decision; null if there is none
 *   current    asBuilt if there is one, otherwise designed, with `basis` saying which
 *   history    every move of the position, oldest first, whatever was decided
 */
import type { Queryable } from '../db/pg.js';

export interface Point { x: number; y: number }
export interface PlacementMove { move: string; state: 'PROPOSED' | 'APPROVED' | 'REJECTED'; from: Point; to: Point; metres: number; reason: string; by: string; at: string; decidedBy: string | null; decidedAt: string | null }
export interface Placement {
  designed: Point & { mount: string };
  asBuilt: (Point & { move: string; decidedBy: string | null; decidedAt: string }) | null;
  proposed: (Point & { move: string; by: string; at: string }) | null;
  current: Point; basis: 'DESIGNED' | 'AS_BUILT';
  history: PlacementMove[];
}
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Every position of a room, by its code (PA-…). */
export async function placementsOf(q: Queryable, roomId: string): Promise<Map<string, Placement>> {
  const ps = (await q.query<{ id: string; code: string; x: string; y: string; mount: string }>('SELECT id, code, x, y, mount FROM app.planned_asset WHERE room_id = $1 AND removed_at IS NULL ORDER BY code', [roomId])).rows;
  const ms = (await q.query<{ code: string; position_id: string; state: PlacementMove['state']; from_x: string; from_y: string; to_x: string; to_y: string; reason: string; by: string; recorded_at: string; decided: string | null; decided_at: string | null }>(
    `SELECT m.code, m.position_id, m.state, m.from_x, m.from_y, m.to_x, m.to_y, m.reason, p.display_name AS by, m.recorded_at, d.display_name AS decided, m.decided_at
       FROM app.field_move m JOIN app.person p ON p.id = m.recorded_by LEFT JOIN app.person d ON d.id = m.decided_by WHERE m.room_id = $1 ORDER BY m.recorded_at, m.code`, [roomId])).rows;
  const out = new Map<string, Placement>();
  for (const p of ps) {
    const mine = ms.filter((m) => m.position_id === p.id);
    const history: PlacementMove[] = mine.map((m) => ({ move: m.code, state: m.state, from: { x: Number(m.from_x), y: Number(m.from_y) }, to: { x: Number(m.to_x), y: Number(m.to_y) },
      metres: round2(Math.hypot(Number(m.from_x) - Number(m.to_x), Number(m.from_y) - Number(m.to_y))), reason: m.reason, by: m.by, at: m.recorded_at, decidedBy: m.decided, decidedAt: m.decided_at }));
    // the as-built place is the approved move decided last
    const approved = history.filter((m) => m.state === 'APPROVED' && m.decidedAt).sort((a, b) => Date.parse(a.decidedAt!) - Date.parse(b.decidedAt!)).pop() || null;
    const waiting = history.find((m) => m.state === 'PROPOSED') || null;
    const designed = { x: Number(p.x), y: Number(p.y), mount: p.mount };
    out.set(p.code, { designed, asBuilt: approved ? { ...approved.to, move: approved.move, decidedBy: approved.decidedBy, decidedAt: approved.decidedAt! } : null,
      proposed: waiting ? { ...waiting.to, move: waiting.move, by: waiting.by, at: waiting.at } : null,
      current: approved ? { ...approved.to } : { x: designed.x, y: designed.y }, basis: approved ? 'AS_BUILT' : 'DESIGNED', history });
  }
  return out;
}
