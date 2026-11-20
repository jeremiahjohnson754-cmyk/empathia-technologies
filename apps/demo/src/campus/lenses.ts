/**
 * The campus map's Assets and Coverage lenses (founder, 19 Nov 2026 09:09 F: "the campus map everywhere shows Pro's asset and issue
 * intelligence and Search Party coverage maps"). Per building, from the records only:
 *   - ASSETS (Pro · Asset Intelligence): service on units — jobs of the last twelve months that named a unit (the synthetic service
 *     history) per 100 of the building's device positions (the room records; furniture not counted). Device identities would be the
 *     other natural measure, but no position on record is verified yet (every one is UNKNOWN), so a map of them would be one flat colour.
 *   - COVERAGE (Search Party · people and support): rooms nobody on record knows first-hand ÷ the building's rooms. A room is known
 *     first-hand when a site champion or backup has worked in it (confirmed access for a job, raised a report from it) or is based on
 *     its floor (connect/directory.ts › familiarity); "looks after the whole building" is not first-hand.
 * A building with nothing to divide by has no value (null), never a zero.
 */
import { allRecords } from './design.js';
import { WINDOW_FROM, WINDOW_TO } from './heat.js';
import { syntheticHistory } from '../service/history.js';
import { BUILDINGS, roomsIn } from './canon.js';
import { familiarity, people } from '../connect/directory.js';
import type { Workspace } from '../workspace/store.js';

export interface AssetFacts { positions: number; jobs: number; units: number }
export function assetsByBuilding(): Record<string, AssetFacts> {
  const out: Record<string, AssetFacts> = Object.fromEntries(BUILDINGS.map((b) => [b.key, { positions: 0, jobs: 0, units: 0 }]));
  for (const r of allRecords()) { const a = out[r.outline.building]; if (!a) continue; a.positions += r.positions.filter((p) => !p.furniture).length; }
  const units: Record<string, Set<string>> = {};
  for (const j of syntheticHistory()) {
    if (!j.asset || j.openedAt < WINDOW_FROM || j.openedAt >= WINDOW_TO) continue; const a = out[j.building]; if (!a) continue;
    a.jobs += 1; (units[j.building] ||= new Set()).add(j.asset);
  }
  for (const [k, u] of Object.entries(units)) out[k]!.units = u.size;
  return out;
}
/** jobs on units per 100 device positions over the twelve months (null when the building has no positions) */
export const unitServiceRate = (a: AssetFacts | undefined): number | null => (a && a.positions ? (100 * a.jobs) / a.positions : null);

export interface CoverFacts { rooms: number; firstHand: number; who: string[] }
export function coverageByBuilding(w: Workspace | null): Record<string, CoverFacts> {
  const ps = people().filter((p) => p.kind === 'champion' || p.kind === 'backup');
  return Object.fromEntries(BUILDINGS.map((b) => {
    const rooms = roomsIn(b.key); const who = new Set<string>(); let firstHand = 0;
    for (const o of rooms) {
      const by = ps.filter((p) => { const k = familiarity(p, o, w); return !!k && k.level !== 'building'; });
      if (by.length) { firstHand += 1; by.forEach((p) => who.add(p.name)); }
    }
    return [b.key, { rooms: rooms.length, firstHand, who: [...who] }];
  }));
}
/** rooms without first-hand knowledge as a share of the building's rooms, in percent (null when it has no rooms) */
export const uncoveredPct = (c: CoverFacts | undefined): number | null => (c && c.rooms ? (100 * (c.rooms - c.firstHand)) / c.rooms : null);
