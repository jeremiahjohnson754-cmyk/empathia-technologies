/**
 * The meeting assistant's scheduler: pure, and the same whichever calendar the facts came from. Given each attendee's working hours
 * (or shift), their busy time and the room's bookings, it proposes ranked slots with the reason for each, and when there is none it
 * says why and which change would produce one. It never books anything: a slot is a proposal until a person confirms it (store.ts).
 *
 * Time: instants are epoch milliseconds; a person's hours are wall-clock times in their own IANA zone, turned into instants through
 * Intl (time.ts), so a slot is right on the days the clocks change and across zones that change on different dates.
 * NOT MODELLED, and said on the page: public holidays, leave, travel time between buildings, and "tentative" as a softer kind of busy.
 */
import { seeded } from '../campus/canon.js';
import { DAY, DAY_SHORT, MIN, fmtDay, fmtRange, fmtTime, hm, intersect, isoDay, localDays, merge, minutesOf, overlaps, subtract, utcOffset, wallToUtc, zoneCity, type Interval } from './time.js';

export interface Hours { /** 0 = Sunday … 6 = Saturday */ days: number[]; start: string; end: string }
export interface Shift extends Hours { name: string }
export interface Busy extends Interval { title: string }
/** One attendee as the scheduler sees them. */
/** Dated working intervals from a rota (a calendar's Shifts), which bind a person instead of a weekly pattern when a calendar supplies them. */
export interface Rota { name: string; list: Interval[] }
export interface Cal { id: string; name: string; tz: string; hours: Hours; shift?: Shift | null; rota?: Rota | null; busy: Busy[]; optional?: boolean }
export interface RoomCal { id: string; name: string; tz: string; busy: Busy[] }
export interface Ask { attendees: Cal[]; room: RoomCal | null; minutes: number; /** search window */ from: number; to: number; max?: number; perDay?: number }
export type WhyKind = 'outside-hours' | 'off-shift' | 'busy' | 'room-taken';
export interface Why { kind: WhyKind; id: string; who: string; detail: string }
export interface Slot { from: number; to: number; reason: string; reasons: string[]; /** optional attendees who cannot make this slot */ without: Array<{ id: string; name: string; why: string }>; local: Array<{ id: string; name: string; tz: string; text: string; optional: boolean }> }
export interface Explanation { lines: string[]; blockers: Array<{ id: string; name: string; kind: WhyKind | 'no-working-time' | 'no-overlap' }> }
export interface Proposal { slots: Slot[]; considered: number; none: Explanation | null }
export const DURATIONS = [15, 30, 45, 60] as const;
export const STEP = 30 * MIN;

/** The hours that bind a person: their shift when the role has one, otherwise their working hours. */
export const bindingHours = (c: Pick<Cal, 'hours' | 'shift'>): Hours => c.shift || c.hours;
/** The working intervals of a person inside [from, to], as instants. */
export function workingIn(c: Pick<Cal, 'tz' | 'hours' | 'shift' | 'rota'>, from: number, to: number): Interval[] {
  if (c.rota) return merge(c.rota.list.filter((i) => i.to > from && i.from < to));
  const h = bindingHours(c); const [sh, sm] = hm(h.start); const [eh, em] = hm(h.end); const out: Interval[] = [];
  for (const day of localDays(c.tz, from - DAY, to)) {
    if (!h.days.includes(day.dow)) continue;
    const a = wallToUtc(c.tz, day.y, day.m, day.d, sh, sm); const b = wallToUtc(c.tz, day.y, day.m, day.d, eh, em);
    if (b > a && b > from && a < to) out.push({ from: a, to: b });
  }
  return out;
}
const hoursWords = (c: Pick<Cal, 'tz' | 'hours' | 'shift' | 'rota'>): string => { if (c.rota) return `on the rota (${c.rota.name}), ${zoneCity(c.tz)} time`; const h = bindingHours(c); return `${h.start}–${h.end} ${zoneCity(c.tz)} time, ${daysWords(h.days)}${c.shift ? ` (${c.shift.name})` : ''}`; };
export function daysWords(days: number[]): string {
  const d = [...new Set(days)].sort((a, b) => a - b); if (!d.length) return 'no days';
  const run = d.every((x, i) => i === 0 || x === d[i - 1]! + 1);
  return run && d.length > 2 ? `${DAY_SHORT[d[0]!]}–${DAY_SHORT[d[d.length - 1]!]}` : d.map((x) => DAY_SHORT[x]).join(', ');
}

/**
 * Busy blocks for the SIMULATED calendar: seeded by the person and the local date, so the same person is busy at the same times on
 * every load and in every test. Zero to three blocks a working day, on the half hour, inside the person's hours. Free/busy only:
 * a block has no subject, because a colleague's calendar would not show one either.
 */
export function seededBusy(c: Pick<Cal, 'id' | 'tz' | 'hours' | 'shift'>, from: number, to: number): Busy[] {
  const h = bindingHours(c); const [sh, sm] = hm(h.start); const [eh, em] = hm(h.end); const out: Busy[] = [];
  const slots = Math.floor(((eh * 60 + em) - (sh * 60 + sm)) / 30); if (slots < 2) return out;
  for (const day of localDays(c.tz, from - DAY, to)) {
    if (!h.days.includes(day.dow)) continue;
    const rng = seeded(`${c.id}|${day.y}-${day.m}-${day.d}`); const n = Math.floor(rng() * 3) + (rng() < 0.3 ? 1 : 0);
    const open = wallToUtc(c.tz, day.y, day.m, day.d, sh, sm);
    for (let i = 0; i < n; i += 1) { const at = Math.floor(rng() * (slots - 1)); const len = 1 + Math.floor(rng() * 3); const a = open + at * 30 * MIN; const b = Math.min(open + slots * 30 * MIN, a + len * 30 * MIN); if (b > from && a < to) out.push({ from: a, to: b, title: 'Busy (simulated calendar)' }); }
  }
  return merge(out).map((x) => ({ ...x, title: 'Busy (simulated calendar)' }));
}

/** Everything that stops [from, to] for the required attendees and the room; empty when the slot stands. Optional attendees are not asked. */
export function conflictsAt(ask: Pick<Ask, 'attendees' | 'room'>, from: number, to: number, opts: { optional?: boolean } = {}): Why[] {
  const out: Why[] = []; const x = { from, to };
  for (const c of ask.attendees) {
    if (!!c.optional !== !!opts.optional) continue;
    const inside = workingIn(c, from - DAY, to + DAY).some((w) => w.from <= from && to <= w.to);
    if (!inside) out.push({ kind: c.shift || c.rota ? 'off-shift' : 'outside-hours', id: c.id, who: c.name, detail: `${c.name} ${c.rota ? 'is off shift (' : c.shift ? `is off shift (${c.shift.name}, ` : 'is outside working hours ('}${hoursWords(c).replace(/ \([^)]*\)$/, '')}); it would be ${fmtRange(c.tz, from, to)} for them` });
    const b = c.busy.find((y) => overlaps(x, y));
    if (b) out.push({ kind: 'busy', id: c.id, who: c.name, detail: `${c.name} is busy ${fmtRange(c.tz, b.from, b.to)} ${zoneCity(c.tz)} time${b.title && !/^Busy/.test(b.title) ? ` (${b.title})` : ''}` });
  }
  if (!opts.optional && ask.room) { const b = ask.room.busy.find((y) => overlaps(x, y)); if (b) out.push({ kind: 'room-taken', id: ask.room.id, who: ask.room.name, detail: `${ask.room.name} is booked ${fmtRange(ask.room.tz, b.from, b.to)}${b.title ? ` (${b.title})` : ''}` }); }
  return out;
}

const localOf = (ask: Ask, from: number, to: number): Slot['local'] => ask.attendees.map((c) => ({ id: c.id, name: c.name, tz: c.tz, optional: !!c.optional, text: `${fmtRange(c.tz, from, to)} · ${zoneCity(c.tz)} (${utcOffset(c.tz, from)})` }));

/**
 * Ranked slots. A slot is offered only when every required attendee is inside their working hours (or shift) and free, and the room
 * (when one is asked for) is free. Slots that also suit every optional attendee come first, then the earliest; no more than `perDay`
 * a day, so the list offers a choice of days rather than one morning.
 */
export function propose(ask: Ask): Proposal {
  const req = ask.attendees.filter((c) => !c.optional); const opt = ask.attendees.filter((c) => c.optional); const len = ask.minutes * MIN;
  if (!req.length || len <= 0 || ask.to <= ask.from) return { slots: [], considered: 0, none: { lines: ['Choose at least one person and a length of time.'], blockers: [] } };
  // each required attendee's free working time, once; candidates are then numbers against numbers
  let free: Interval[] = [{ from: ask.from, to: ask.to }];
  for (const c of req) free = intersect(free, subtract(workingIn(c, ask.from, ask.to), c.busy));
  if (ask.room) free = subtract(free, ask.room.busy);
  const optFree = opt.map((c) => ({ c, free: subtract(workingIn(c, ask.from, ask.to), c.busy), work: workingIn(c, ask.from, ask.to) }));
  const lead = req[0]!; const found: Slot[] = []; let considered = 0;
  for (const f of free) {
    for (let t = Math.ceil(f.from / STEP) * STEP; t + len <= f.to; t += STEP) {
      considered += 1;
      const without = optFree.filter((o) => !o.free.some((w) => w.from <= t && t + len <= w.to)).map((o) => ({ id: o.c.id, name: o.c.name, why: o.work.some((w) => w.from <= t && t + len <= w.to) ? 'busy' : o.c.shift || o.c.rota ? 'off shift' : 'outside working hours' }));
      const shifts = req.filter((c) => c.shift || c.rota);
      const reasons = [req.length === 1 ? `inside ${lead.name === 'You' ? 'your' : `${lead.name}’s`} working hours` : 'inside everyone’s working hours', ...shifts.map((c) => `on ${c.name}’s ${(c.rota?.name || c.shift!.name).toLowerCase()}`), ...(ask.room ? [`${ask.room.name} free`] : []), `${ask.minutes} minutes`, ...without.map((w) => `${w.name} (optional) cannot make it: ${w.why}`)];
      found.push({ from: t, to: t + len, reasons, reason: reasons.join('; '), without, local: localOf(ask, t, t + len) });
    }
  }
  found.sort((a, b) => a.without.length - b.without.length || a.from - b.from);
  const perDay = ask.perDay ?? 3; const max = ask.max ?? 6; const seen: Record<string, number> = {}; const slots: Slot[] = [];
  for (const s of found) { const k = isoDay(lead.tz, s.from); if ((seen[k] || 0) >= perDay) continue; seen[k] = (seen[k] || 0) + 1; slots.push(s); if (slots.length >= max) break; }
  slots.sort((a, b) => a.without.length - b.without.length || a.from - b.from);
  return { slots, considered, none: slots.length ? null : explain(ask) };
}

/** Why no slot exists, from the same facts: who has no working time, whose hours never meet, or who and what fills the time they share. */
export function explain(ask: Ask): Explanation {
  const req = ask.attendees.filter((c) => !c.optional); const lines: string[] = []; const blockers: Explanation['blockers'] = []; const len = ask.minutes * MIN;
  const lead = req[0]; if (!lead) return { lines: ['Choose at least one person.'], blockers };
  const span = `${fmtDay(lead.tz, ask.from)} and ${fmtDay(lead.tz, ask.to - 1)}`;
  const work = req.map((c) => ({ c, w: workingIn(c, ask.from, ask.to) }));
  for (const x of work) if (!x.w.some((i) => i.to - i.from >= len)) { blockers.push({ id: x.c.id, name: x.c.name, kind: 'no-working-time' }); lines.push(`${x.c.name} has no working time between ${span} (${hoursWords(x.c)}).`); }
  if (blockers.length) return { lines, blockers };
  let common: Interval[] = [{ from: ask.from, to: ask.to }]; for (const x of work) common = intersect(common, x.w);
  const fits = (l: Interval[]) => l.filter((i) => i.to - i.from >= len);
  if (!fits(common).length) {
    lines.push(`No ${ask.minutes}-minute time between ${span} is inside everyone’s working hours.`);
    for (const x of work) { lines.push(`${x.c.name}: ${hoursWords(x.c)}${x.c.tz !== lead.tz && x.w[0] ? `, which is ${fmtTime(lead.tz, x.w[0].from)}–${fmtTime(lead.tz, x.w[0].to)} ${zoneCity(lead.tz)} time` : ''}.`); if (x.c.id !== lead.id) blockers.push({ id: x.c.id, name: x.c.name, kind: 'no-overlap' }); }
    return { lines, blockers };
  }
  lines.push(`Everyone’s working hours overlap for ${hoursOf(minutesOf(common))} between ${span}, but none of it is free for ${ask.minutes} minutes.`);
  for (const c of req) { const left = fits(subtract(common, c.busy)); if (!left.length) { blockers.push({ id: c.id, name: c.name, kind: 'busy' }); lines.push(`${c.name} is busy throughout the time everyone shares.`); } else if (c.busy.some((b) => common.some((i) => overlaps(i, b)))) lines.push(`${c.name} is busy for part of it.`); }
  if (ask.room && ask.room.busy.some((b) => common.some((i) => overlaps(i, b)))) { const left = fits(subtract(common, ask.room.busy)); lines.push(left.length ? `${ask.room.name} is booked for part of it.` : `${ask.room.name} is booked throughout the time everyone shares.`); if (!left.length) blockers.push({ id: ask.room.id, name: ask.room.name, kind: 'room-taken' }); }
  return { lines, blockers };
}
const hoursOf = (min: number) => (min >= 120 ? `${Math.round(min / 6) / 10} hours` : `${min} minutes`);

export interface Alternative { kind: 'shorter' | 'later' | 'no-room' | 'backup' | 'optional'; label: string; ask: Ask; slots: number; /** what changed, for the address: the new length, the new first day, the person swapped */ change: { minutes?: number; from?: number; dropRoom?: boolean; swap?: { out: string; in: string }; optional?: string } }
/**
 * Changes that would produce a slot, each tried for real with the same scheduler: a shorter meeting, the following days, without the
 * room, a person made optional, or a backup contact in a person's place. A change that yields nothing is not offered.
 */
export function alternatives(ask: Ask, backups: Record<string, Cal> = {}): Alternative[] {
  const out: Alternative[] = []; const tryIt = (kind: Alternative['kind'], label: string, next: Ask, change: Alternative['change']) => { const n = propose(next).slots.length; if (n) out.push({ kind, label, ask: next, slots: n, change }); };
  const shorter = DURATIONS.filter((d) => d < ask.minutes).sort((a, b) => b - a)[0];
  if (shorter) tryIt('shorter', `Make it ${shorter} minutes`, { ...ask, minutes: shorter }, { minutes: shorter });
  const span = ask.to - ask.from; const lead = ask.attendees.find((c) => !c.optional);
  tryIt('later', `Look at the following days${lead ? ` (from ${fmtDay(lead.tz, ask.to)})` : ''}`, { ...ask, from: ask.to, to: ask.to + span }, { from: ask.to });
  if (ask.room) tryIt('no-room', `Meet without ${ask.room.name}`, { ...ask, room: null }, { dropRoom: true });
  const req = ask.attendees.filter((c) => !c.optional);
  for (const c of req.slice(1)) {
    const b = backups[c.id];
    if (b && !ask.attendees.some((x) => x.id === b.id)) tryIt('backup', `Meet ${b.name} instead of ${c.name}`, { ...ask, attendees: ask.attendees.map((x) => (x.id === c.id ? { ...b, optional: false } : x)) }, { swap: { out: c.id, in: b.id } });
    if (req.length > 2) tryIt('optional', `Make ${c.name} optional`, { ...ask, attendees: ask.attendees.map((x) => (x.id === c.id ? { ...x, optional: true } : x)) }, { optional: c.id });
  }
  return out;
}
