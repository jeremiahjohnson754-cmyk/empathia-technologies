/**
 * Lifecycle refresh planning (founder, 14 Nov 2026: "lifecycle refresh planning … for ops lead and internal engineers in pro … a separate
 * thing that makes refresh planning every year and multi year strat planning — it's asset management made easy").
 *
 * Built on the asset spine: every unit in service now (asset ID, position, room, building, class, installed date), its service history by
 * asset ID, and the units already taken out. From these and a service life per device class, it gives:
 *   - the year each unit falls due for refresh (installed + service life), and the units already past it;
 *   - the annual plan: the units due in a chosen year, room by room, with a suggestion to refresh a room in one window when most of its
 *     units fall due within a year of each other;
 *   - the multi-year strategy: units due per year and class, and per building, over a 1-, 3-, 5- or 7-year horizon;
 *   - the units the service record argues to look at sooner (repeated break-fix jobs in the last 12 months) — an argument, never a move.
 *
 * Honest about its basis:
 *   - A service life is a PLANNING ASSUMPTION, declared here and editable on the page. It is not a manufacturer's end-of-life or end-of-
 *     support date (none is recorded); a planner sets their own.
 *   - Cost appears only when the planner declares a planning figure per class; none is assumed. The figures are theirs, not a quotation.
 *   - The estate, installations and service history are the demonstration's synthetic records.
 */
import { allRecords, C, DEMO_NOW, type RoomRecord } from '../campus/design.js';
import type { ServiceJob } from '../service/history.js';

const YEAR_MS = 365.25 * 24 * 3600 * 1000;
export const NOW_YEAR = new Date(DEMO_NOW).getUTCFullYear();

/** Starting planning assumptions, in years, by device class: editable; never presented as end-of-life data. */
export const DEFAULT_LIFE: Record<string, number> = {
  display: 7, ledwall: 8, projector: 6, camera: 6, bar: 5, micceil: 7, mictable: 7, micwireless: 6, speaker: 10, dsp: 8, amp: 10, compute: 4,
  switch: 6, control: 8, touch: 6, scheduler: 5, switcher: 7, encoder: 6, rack: 15, pdu: 10, lighting: 10, occsensor: 8, seccam: 6, iot: 5, hvac: 15,
};
export const LIFE_BASIS = 'planning assumption: a service life per device class, set by the planner — not a manufacturer end-of-life or end-of-support date (none is recorded)';
export const FURNITURE = new Set(['table', 'chairs', 'lectern']);
export const classLabel = (cat: string) => (C.categories as Record<string, { label?: string }>)[cat]?.label || cat;

export interface Assumptions { life: Record<string, number>; cost: Record<string, number>; currency: string; serviceSignal: number }
export const defaultAssumptions = (): Assumptions => ({ life: { ...DEFAULT_LIFE }, cost: {}, currency: 'USD', serviceSignal: 3 });

export interface Unit {
  asset: string; position: string; label: string; cat: string; room: string; roomName: string; building: string; lifecycle: string;
  installedAt: string; life: number; dueYear: number; ageYears: number; overdue: boolean;
  /** break-fix jobs against this asset in the 12 months before the demonstration's date */
  breakFix12: number; signal: string | null;
}

/** Every unit in service now (current installation, not furniture), with its refresh year under the assumptions. */
export function unitsInService(a: Assumptions, jobs: readonly ServiceJob[], records: readonly RoomRecord[] = allRecords()): Unit[] {
  const since = DEMO_NOW - YEAR_MS; const bf = new Map<string, number>();
  for (const j of jobs) if (j.asset && j.kind === 'break-fix' && Date.parse(j.openedAt) >= since && Date.parse(j.openedAt) <= DEMO_NOW) bf.set(j.asset, (bf.get(j.asset) || 0) + 1);
  const out: Unit[] = [];
  for (const r of records) {
    for (const i of r.installations) {
      if (i.removedAt) continue;
      const p = r.positions.find((x) => x.code === i.position); const cat = p?.cat || 'unknown';
      if (p?.furniture || FURNITURE.has(cat)) continue;
      const life = a.life[cat] ?? DEFAULT_LIFE[cat] ?? 7; const t = Date.parse(i.installedAt);
      const dueYear = new Date(t + life * YEAR_MS).getUTCFullYear(); const n = bf.get(i.asset) || 0;
      out.push({
        asset: i.asset, position: i.position, label: p?.label || i.position, cat, room: r.outline.id, roomName: r.outline.name, building: r.outline.building, lifecycle: r.lifecycle,
        installedAt: i.installedAt, life, dueYear, ageYears: Math.round(((DEMO_NOW - t) / YEAR_MS) * 10) / 10, overdue: dueYear <= NOW_YEAR,
        breakFix12: n, signal: n >= a.serviceSignal ? `${n} break-fix jobs against this unit in the last 12 months: worth looking at before ${dueYear}` : null,
      });
    }
  }
  return out.sort((x, y) => x.dueYear - y.dueYear || x.building.localeCompare(y.building) || x.room.localeCompare(y.room) || x.asset.localeCompare(y.asset));
}

export const costOf = (a: Assumptions, us: readonly Unit[]): number | null => {
  if (!us.length) return 0;
  if (!us.every((u) => Number.isFinite(a.cost[u.cat]))) return null;   // only when the planner declared a figure for every class involved
  return us.reduce((s, u) => s + (a.cost[u.cat] as number), 0);
};

export interface RoomPlan { room: string; roomName: string; building: string; due: Unit[]; total: number; bundle: { suggest: boolean; why: string } }
/** The annual plan: units due in `year` (and, for the first year, those already past due), room by room. */
export function annualPlan(units: readonly Unit[], year: number): RoomPlan[] {
  const inYear = units.filter((u) => u.dueYear === year || (year === NOW_YEAR + 1 && u.dueYear <= NOW_YEAR));
  const rooms = new Map<string, Unit[]>(); for (const u of inYear) rooms.set(u.room, [...(rooms.get(u.room) || []), u]);
  return [...rooms.entries()].map(([room, due]) => {
    const all = units.filter((u) => u.room === room); const near = all.filter((u) => Math.abs(u.dueYear - year) <= 1);
    const suggest = all.length > 1 && near.length / all.length >= 0.5 && near.length > due.length;
    return {
      room, roomName: due[0]!.roomName, building: due[0]!.building, due, total: all.length,
      bundle: { suggest, why: suggest ? `${near.length} of the room’s ${all.length} units fall due within a year of ${year}: refreshing them in one window means one disruption and one recommissioning` : `${due.length} of ${all.length} units due; the rest are not due within a year` },
    };
  }).sort((x, y) => x.building.localeCompare(y.building) || x.room.localeCompare(y.room));
}

export interface YearRow { year: number; units: number; byClass: Record<string, number>; byBuilding: Record<string, number>; rooms: number; cost: number | null }
/** The multi-year strategy: per year from next year over `horizon` years; the first year carries what is already past due. */
export function strategy(units: readonly Unit[], horizon: number, a: Assumptions): YearRow[] {
  const rows: YearRow[] = [];
  for (let k = 1; k <= horizon; k++) {
    const year = NOW_YEAR + k;
    const us = units.filter((u) => u.dueYear === year || (k === 1 && u.dueYear <= NOW_YEAR));
    const byClass: Record<string, number> = {}; const byBuilding: Record<string, number> = {};
    for (const u of us) { byClass[u.cat] = (byClass[u.cat] || 0) + 1; byBuilding[u.building] = (byBuilding[u.building] || 0) + 1; }
    rows.push({ year, units: us.length, byClass, byBuilding, rooms: new Set(us.map((u) => u.room)).size, cost: costOf(a, us) });
  }
  return rows;
}

/** Units already taken out (replaced or retired): their asset IDs are never reissued; the plan never counts them. */
export function takenOut(records: readonly RoomRecord[] = allRecords()) {
  return records.flatMap((r) => r.installations.filter((i) => i.removedAt).map((i) => ({ asset: i.asset, room: r.outline.id, removedAt: i.removedAt!, reason: i.removalReason || i.reason })));
}

/** Plain-text CSV of the units in service with their refresh year: for the planner's spreadsheet (the basis travels with it). */
export function planCsv(units: readonly Unit[], a: Assumptions): string {
  const esc = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const head = ['asset', 'position', 'device', 'class', 'room', 'room name', 'building', 'installed', 'service life (years, assumption)', 'refresh year', 'past due', 'break-fix jobs (12 months)', `planning figure (${a.currency}, declared)`];
  const lines = units.map((u) => [u.asset, u.position, u.label, classLabel(u.cat), u.room, u.roomName, u.building, u.installedAt.slice(0, 10), u.life, u.dueYear, u.overdue ? 'yes' : 'no', u.breakFix12, Number.isFinite(a.cost[u.cat]) ? a.cost[u.cat] : ''].map(esc).join(','));
  return [`# ${LIFE_BASIS}; synthetic records`, head.map(esc).join(','), ...lines].join('\n');
}
