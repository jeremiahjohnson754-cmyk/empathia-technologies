/**
 * Reading what scripts/dev/stall-watch.mjs wrote, and the one rule built on it (used by scripts/test.mjs).
 *
 * The rule: a suite that failed is run once more only if the machine itself stalled for three seconds or more while the suite ran. Both
 * attempts are recorded. A suite that failed on a machine that kept running is a failure and is not run again: this is not a general
 * "retry until green".
 */
import fs from 'node:fs';

export const RERUN_AFTER_STALL_MS = 3000;
/** the stalls that overlap the time a suite ran: { count, longestMs }, or null when there were none (or nothing was watching) */
export function stallsBetween(file, t0, t1) {
  if (!file || !fs.existsSync(file)) return null;
  const xs = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((x) => x && Number.isFinite(x.at) && Number.isFinite(x.lateMs) && x.at >= t0 && x.at - x.lateMs <= t1);
  return xs.length ? { count: xs.length, longestMs: Math.max(...xs.map((x) => x.lateMs)) } : null;
}
/** run it once more? only a failure, and only when the machine stalled long enough during it */
export const rerunAfterStall = (failed, stalled) => !!failed && !!stalled && stalled.longestMs >= RERUN_AFTER_STALL_MS;
