/**
 * ServiceHands analytics: what the service history says, by month, by quarter, by project, by building and layer, and by vendor, so each
 * vendor is held to the agreement it signed. Every figure is computed from the jobs handed in (./history.ts) by the definitions below;
 * nothing is estimated or smoothed.
 *
 * Definitions (stated on the page and in every export):
 *   opened / closed      jobs opened, or closed, in the period
 *   backlog              jobs open at the end of the period (opened before its end, not closed by then)
 *   response within SLA  of the jobs opened in the period that were responded to: responded within the severity's response target
 *   restore within SLA   of the jobs opened in the period that were restored: restored within the severity's restore target
 *   time to restore      the median hours from opened to restored, over the jobs restored
 *   first-time fix       of the jobs closed: fixed at the first visit
 *   reopen rate          of the jobs closed: reopened after closure
 */
import { SLA_HOURS, monthStart, monthKey, quarterKey, MONTHS, type ServiceJob, type Layer } from './history.js';

const H = 3600e3;
const med = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };
const pctOf = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);
export const respondedInSla = (j: ServiceJob) => !!j.respondedAt && (Date.parse(j.respondedAt) - Date.parse(j.openedAt)) / H <= SLA_HOURS[j.severity].respond;
export const restoredInSla = (j: ServiceJob) => !!j.restoredAt && (Date.parse(j.restoredAt) - Date.parse(j.openedAt)) / H <= SLA_HOURS[j.severity].restore;
export const restoreHours = (j: ServiceJob) => (j.restoredAt ? (Date.parse(j.restoredAt) - Date.parse(j.openedAt)) / H : null);

export interface Stats { opened: number; closed: number; backlog: number; respondSla: number | null; restoreSla: number | null; mttrH: number | null; ftf: number | null; reopen: number | null; critical: number }
/** the measures of one set of jobs over [from, to) */
export function stats(jobs: ServiceJob[], from: number, to: number): Stats {
  const opened = jobs.filter((j) => { const t = Date.parse(j.openedAt); return t >= from && t < to; });
  const closed = jobs.filter((j) => j.closedAt && Date.parse(j.closedAt) >= from && Date.parse(j.closedAt) < to);
  const backlog = jobs.filter((j) => Date.parse(j.openedAt) < to && (!j.closedAt || Date.parse(j.closedAt) >= to)).length;
  const resp = opened.filter((j) => j.respondedAt); const rest = opened.filter((j) => j.restoredAt);
  return { opened: opened.length, closed: closed.length, backlog, respondSla: pctOf(resp.filter(respondedInSla).length, resp.length), restoreSla: pctOf(rest.filter(restoredInSla).length, rest.length),
    mttrH: (() => { const m = med(rest.map((j) => restoreHours(j)!)); return m === null ? null : Math.round(m * 10) / 10; })(),
    ftf: pctOf(closed.filter((j) => j.firstTimeFix).length, closed.length), reopen: pctOf(closed.filter((j) => j.reopened).length, closed.length), critical: opened.filter((j) => j.severity === 'Mission critical').length };
}

export interface Period { key: string; label: string; from: number; to: number }
/** the last `n` whole months before the demonstration's month, oldest first */
export function months(n = MONTHS): Period[] {
  return Array.from({ length: n }, (_, i) => { const back = n - i; const from = monthStart(back); const to = monthStart(back - 1); return { key: monthKey(from), label: new Date(from).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }), from, to }; });
}
/** the calendar quarters those months fall in (a partial quarter at either end is marked) */
export function quarters(n = MONTHS): Array<Period & { partial: boolean }> {
  const ms = months(n); const out: Array<Period & { partial: boolean; count: number }> = [];
  for (const m of ms) { const k = quarterKey(m.from); const q = out.find((x) => x.key === k); if (q) { q.to = m.to; q.count++; } else out.push({ key: k, label: k, from: m.from, to: m.to, partial: false, count: 1 }); }
  return out.map((q) => ({ key: q.key, label: q.count < 3 ? `${q.label} (${q.count} mo)` : q.label, from: q.from, to: q.to, partial: q.count < 3 }));
}
export const series = (jobs: ServiceJob[], ps: Period[]) => ps.map((p) => ({ period: p, s: stats(jobs, p.from, p.to) }));

export interface VendorRow { vendor: string; name: string; jobs: number; open: number; s: Stats; recent: Stats; earlier: Stats; flags: string[] }
/** the vendor scorecard over the periods `ps`, with the last three months against the three before them, and what needs attention */
export function vendorScorecard(jobs: ServiceJob[], ps: Period[], target = { respond: 90, restore: 85 }): VendorRow[] {
  const from = ps[0]!.from; const to = ps[ps.length - 1]!.to;
  const r0 = ps[Math.max(0, ps.length - 3)]!.from; const e0 = ps[Math.max(0, ps.length - 6)]!.from;
  const ids = [...new Set(jobs.map((j) => j.vendor))];
  return ids.map((v) => {
    const mine = jobs.filter((j) => j.vendor === v); const s = stats(mine, from, to); const recent = stats(mine, r0, to); const earlier = stats(mine, e0, r0);
    const flags: string[] = [];
    if (s.respondSla !== null && s.respondSla < target.respond) flags.push(`response within SLA ${s.respondSla}% (target ${target.respond}%)`);
    if (s.restoreSla !== null && s.restoreSla < target.restore) flags.push(`restore within SLA ${s.restoreSla}% (target ${target.restore}%)`);
    if (recent.mttrH !== null && earlier.mttrH !== null && recent.mttrH > earlier.mttrH * 1.2) flags.push(`time to restore rising: ${earlier.mttrH} h → ${recent.mttrH} h over the last three months`);
    if (recent.reopen !== null && recent.reopen >= 15) flags.push(`reopen rate ${recent.reopen}% in the last three months`);
    return { vendor: v, name: mine[0]!.vendorName, jobs: s.opened, open: mine.filter((j) => !j.closedAt).length, s, recent, earlier, flags };
  }).sort((a, b) => b.flags.length - a.flags.length || b.jobs - a.jobs);
}

export function byKey<K extends string>(jobs: ServiceJob[], key: (j: ServiceJob) => K | null, from: number, to: number): Array<{ key: K; s: Stats }> {
  const keys = [...new Set(jobs.map(key).filter((k): k is K => !!k))];
  return keys.map((k) => ({ key: k, s: stats(jobs.filter((j) => key(j) === k), from, to) })).sort((a, b) => b.s.opened - a.s.opened);
}
export const LAYER_LABEL: Record<Layer, string> = { audio: 'Audio', video: 'Video', display: 'Display', control: 'Control', network: 'Network', power: 'Power' };
export const DEFINITIONS: Array<[string, string]> = [
  ['Opened / closed', 'jobs opened, or closed, in the period'], ['Backlog', 'jobs open at the end of the period'],
  ['Response within SLA', 'of the jobs opened in the period and responded to: within the severity’s response target (2 h, 24 h, 48 h)'],
  ['Restore within SLA', 'of the jobs opened in the period and restored: within the severity’s restore target (8 h, 48 h, 120 h; business days counted as 24 h)'],
  ['Time to restore', 'median hours from opened to restored'], ['First-time fix', 'of the jobs closed: fixed at the first visit'], ['Reopen rate', 'of the jobs closed: reopened after closure'],
];
