/**
 * What the failure map can compare per building (founder, 18 Nov 2026 15:38: "Issue count. Issues per room. Issues per device. Issues per
 * room-month or another appropriate exposure period. Severity-weighted incident burden. Repeated issues versus unique incidents. And
 * health-risk colors must distinguish unknown from genuinely healthy").
 *
 * Two sources, each named wherever a value is shown:
 *   - NOW: the open issues of the room records and the live service workspace (campus/metrics.ts), with the rooms and device positions
 *     they are counted against: count, per 10 rooms, per 10 devices;
 *   - THE LAST 12 MONTHS: the synthetic service history (service/history.ts), break-fix jobs opened from 1 Nov 2025 to 1 Nov 2026:
 *     jobs per room-month (exposure: every room of the building for the twelve months, as the synthetic history assumes every room in
 *     service), severity-weighted burden (Mission critical 5, High 3, Standard 1 — a stated weighting, not a standard) and the share of
 *     jobs that repeat (the same room and layer had an earlier job in the window, or the job reopened).
 * A building with nothing to divide by has no value (null), never a zero: it is drawn without a glow and named as unknown.
 */
import { allRecords, DEMO_NOW } from './design.js';
import { syntheticHistory, type ServiceJob, type Severity } from '../service/history.js';

export const WINDOW_MONTHS = 12;
export const WINDOW_FROM = new Date(Date.UTC(2025, 10, 1)).toISOString();   // 1 Nov 2025
export const WINDOW_TO = new Date(DEMO_NOW).toISOString();
export const BURDEN_WEIGHT: Record<Severity, number> = { 'Mission critical': 5, High: 3, Standard: 1 };

export interface Exposure { rooms: number; devices: number; roomMonths: number; jobs: number; burden: number; repeats: number; unique: number }

/** the twelve-month window's break-fix jobs, oldest first, each marked repeat or unique */
export function windowJobs(hist: ServiceJob[] = syntheticHistory()): Array<ServiceJob & { repeat: boolean }> {
  const inWin = hist.filter((j) => j.kind === 'break-fix' && j.openedAt >= WINDOW_FROM && j.openedAt < WINDOW_TO).sort((a, b) => a.openedAt.localeCompare(b.openedAt) || a.id.localeCompare(b.id));
  const seen = new Set<string>();
  return inWin.map((j) => { const k = `${j.roomId}|${j.layer}`; const repeat = seen.has(k) || j.reopened; seen.add(k); return { ...j, repeat }; });
}

export function exposureByBuilding(hist: ServiceJob[] = syntheticHistory()): Record<string, Exposure> {
  const out: Record<string, Exposure> = {};
  for (const r of allRecords()) { const b = r.outline.building; const e = (out[b] ||= { rooms: 0, devices: 0, roomMonths: 0, jobs: 0, burden: 0, repeats: 0, unique: 0 }); e.rooms += 1; e.devices += r.positions.filter((p) => !p.furniture).length; e.roomMonths += WINDOW_MONTHS; }
  for (const j of windowJobs(hist)) { const e = out[j.building]; if (!e) continue; e.jobs += 1; e.burden += BURDEN_WEIGHT[j.severity]; if (j.repeat) e.repeats += 1; else e.unique += 1; }
  return out;
}
