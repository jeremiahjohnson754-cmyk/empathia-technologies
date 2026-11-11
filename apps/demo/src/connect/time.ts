/**
 * Time for the people directory and the meeting assistant. Every conversion between an instant and a wall clock goes through
 * `Intl.DateTimeFormat` with an IANA zone, so daylight-saving changes are the platform's, never arithmetic done by hand here.
 * Pure: no clock is read in this file; callers pass the instant.
 */
export interface Wall { y: number; m: number; d: number; hh: number; mm: number; ss: number; /** 0 = Sunday */ dow: number }
export interface Interval { from: number; to: number }
export const MIN = 60_000; export const HOUR = 3_600_000; export const DAY = 86_400_000;

const fmts = new Map<string, Intl.DateTimeFormat>();
const fmt = (tz: string): Intl.DateTimeFormat => {
  let f = fmts.get(tz);
  if (!f) { f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' }); fmts.set(tz, f); }
  return f;
};
const DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
export const DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** Is this a zone the platform knows? (An unknown zone is refused where it is entered, never guessed.) */
export function isZone(tz: string): boolean { try { fmt(tz); return true; } catch { return false; } }

/** The wall clock in a zone at an instant. */
export function wallOf(tz: string, ms: number): Wall {
  const o: Record<string, string> = {}; for (const p of fmt(tz).formatToParts(new Date(ms))) o[p.type] = p.value;
  return { y: Number(o['year']), m: Number(o['month']), d: Number(o['day']), hh: Number(o['hour']) % 24, mm: Number(o['minute']), ss: Number(o['second']), dow: DOW[o['weekday']!] ?? 0 };
}
/** How far the zone's wall clock is ahead of UTC at an instant, in milliseconds. */
export function offsetMs(tz: string, ms: number): number { const w = wallOf(tz, ms); return Date.UTC(w.y, w.m - 1, w.d, w.hh, w.mm, w.ss) - Math.floor(ms / 1000) * 1000; }
/**
 * The instant at which a zone's wall clock reads y-m-d hh:mm. Where the clocks go forward and that wall time does not exist, the
 * instant just after the gap is returned; where they go back and it happens twice, the first of the two.
 */
export function wallToUtc(tz: string, y: number, m: number, d: number, hh: number, mm: number): number {
  const guess = Date.UTC(y, m - 1, d, hh, mm); const a = guess - offsetMs(tz, guess); const b = guess - offsetMs(tz, a);
  const hit = (t: number) => { const w = wallOf(tz, t); return w.y === y && w.m === m && w.d === d && w.hh === hh && w.mm === mm; };
  if (a === b) return a;
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return hit(lo) ? lo : hit(hi) ? hi : hi;
}
export const hm = (s: string): [number, number] => { const [h, m] = s.split(':'); return [Number(h), Number(m)]; };
export const isHm = (s: unknown): s is string => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** Every local calendar date of a zone that touches [from, to], in order. */
export function localDays(tz: string, from: number, to: number): Array<{ y: number; m: number; d: number; dow: number }> {
  const w = wallOf(tz, from); const out: Array<{ y: number; m: number; d: number; dow: number }> = [];
  for (let i = 0; i < 400; i += 1) {
    const c = new Date(Date.UTC(w.y, w.m - 1, w.d + i, 12)); const day = { y: c.getUTCFullYear(), m: c.getUTCMonth() + 1, d: c.getUTCDate(), dow: c.getUTCDay() };
    if (wallToUtc(tz, day.y, day.m, day.d, 0, 0) > to) break;
    out.push(day);
  }
  return out;
}

const two = (n: number) => String(n).padStart(2, '0');
/** "14:30" */
export const fmtTime = (tz: string, ms: number): string => { const w = wallOf(tz, ms); return `${two(w.hh)}:${two(w.mm)}`; };
/** "Mon 16 Nov" */
export const fmtDay = (tz: string, ms: number): string => { const w = wallOf(tz, ms); return `${DAY_SHORT[w.dow]} ${w.d} ${MONTH[w.m - 1]}`; };
/** "Mon 16 Nov, 14:30–15:00" (the end's day is said when it differs) */
export function fmtRange(tz: string, from: number, to: number): string {
  const sameDay = fmtDay(tz, from) === fmtDay(tz, to);
  return `${fmtDay(tz, from)}, ${fmtTime(tz, from)}–${sameDay ? '' : `${fmtDay(tz, to)} `}${fmtTime(tz, to)}`;
}
/** "2026-11-16" in a zone */
export const isoDay = (tz: string, ms: number): string => { const w = wallOf(tz, ms); return `${w.y}-${two(w.m)}-${two(w.d)}`; };
/** "UTC−6", "UTC+5:30", "UTC" */
export function utcOffset(tz: string, ms: number): string {
  const o = Math.round(offsetMs(tz, ms) / MIN); if (!o) return 'UTC';
  const a = Math.abs(o); return `UTC${o < 0 ? '−' : '+'}${Math.floor(a / 60)}${a % 60 ? `:${two(a % 60)}` : ''}`;
}
/** "+02:00" / "-06:00" / "+00:00": the offset as ISO 8601 writes it */
export function isoOffset(tz: string, ms: number): string { const o = Math.round(offsetMs(tz, ms) / MIN); const a = Math.abs(o); return `${o < 0 ? '-' : '+'}${two(Math.floor(a / 60))}:${two(a % 60)}`; }
/** An instant as ISO 8601 with the zone's own offset: "2026-11-16T14:30:00-06:00" */
export function isoLocal(tz: string, ms: number): string { const w = wallOf(tz, ms); return `${w.y}-${two(w.m)}-${two(w.d)}T${two(w.hh)}:${two(w.mm)}:${two(w.ss)}${isoOffset(tz, ms)}`; }
/** The city a zone is named after: "America/Los_Angeles" → "Los Angeles" */
export const zoneCity = (tz: string): string => (tz.split('/').pop() || tz).replace(/_/g, ' ');
export const overlaps = (a: Interval, b: Interval): boolean => a.from < b.to && b.from < a.to;
/** Sorted, merged intervals. */
export function merge(list: Interval[]): Interval[] {
  const s = [...list].filter((x) => x.to > x.from).sort((a, b) => a.from - b.from); const out: Interval[] = [];
  for (const x of s) { const last = out[out.length - 1]; if (last && x.from <= last.to) last.to = Math.max(last.to, x.to); else out.push({ from: x.from, to: x.to }); }
  return out;
}
/** The parts of `a` not covered by `cuts`. */
export function subtract(a: Interval[], cuts: Interval[]): Interval[] {
  let out = merge(a);
  for (const c of merge(cuts)) out = out.flatMap((x) => (!overlaps(x, c) ? [x] : [...(x.from < c.from ? [{ from: x.from, to: c.from }] : []), ...(c.to < x.to ? [{ from: c.to, to: x.to }] : [])]));
  return out;
}
/** The parts common to both lists. */
export function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = []; for (const x of merge(a)) for (const y of merge(b)) { const from = Math.max(x.from, y.from); const to = Math.min(x.to, y.to); if (to > from) out.push({ from, to }); }
  return out;
}
export const minutesOf = (list: Interval[]): number => Math.round(list.reduce((n, x) => n + (x.to - x.from), 0) / MIN);
