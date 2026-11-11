/**
 * Schedule-aware meetings (founder, 11 Nov 2026: "Meeting booking must be genuinely schedule-aware … working hours, shifts, time
 * zones, busy blocks … require confirmation before sending invitations"; "Never silently book meetings").
 *
 * One adapter interface, two implementations:
 *   SIMULATED (this file)  deterministic calendars for the synthetic people: busy blocks generated from the person and the day, the
 *                          room's bookings from the shared workspace, the meetings recorded in this browser. Used by the demonstration.
 *   GRAPH (./graph.ts)     the same interface written to Microsoft Graph's documented calls. It is exercised only against a mock
 *                          transport in tests; it has never been run against a tenant and is not offered in the product.
 * The scheduler below is pure and reads only through the adapter, so it does not know which one it is talking to.
 */
import { hoursOf, isWorking, localTime, type Person } from './directory.js';
import { seeded } from '../campus/canon.js';

export interface Busy { from: string; to: string; what: string }   // ISO instants (UTC)
export interface ScheduleOf { address: string; busy: Busy[]; provenance: 'SIMULATED' | 'MOCK' | 'LIVE' }
export interface CreateRequest { /** client-generated; the same value on every retry of one confirmation */ transactionId: string; subject: string; body: string; start: string; end: string; attendees: readonly string[]; room: string | null; online: boolean }
export type CreateResult = { ok: true; eventId: string; provenance: 'SIMULATED' | 'MOCK' | 'LIVE' } | { ok: false; code: 'unauthorized' | 'forbidden' | 'throttled' | 'conflict' | 'failed'; message: string; retryAfter?: number };
export interface CalendarAdapter {
  id: 'simulated' | 'graph'; provenance: 'SIMULATED' | 'MOCK' | 'LIVE';
  /** which tenant it is connected to; an empty list means none */ connected(): string[];
  getSchedule(addresses: readonly string[], from: string, to: string): ScheduleOf[];
  createEvent(r: CreateRequest): CreateResult;
  cancelEvent(eventId: string): { ok: boolean };
}

const MIN = 60000; const SLOT = 30 * MIN;
const iso = (t: number) => new Date(t).toISOString();
/** Deterministic busy blocks for one person on one of their local days: none to three, inside their working hours, on the half hour. */
export function simulatedBusy(p: Person, from: number, to: number): Busy[] {
  const out: Busy[] = []; const h = hoursOf(p);
  for (let t = Math.floor((from - 24 * 60 * MIN) / SLOT) * SLOT; t < to; t += SLOT) {   // from a day earlier: a working day that began before the window still has blocks inside it
    const lt = localTime(p.tz, new Date(t)); if (lt.hhmm !== h.start || !h.days.includes(lt.weekday)) continue;   // the start of a working day
    const r = seeded(`busy:${p.id}:${lt.date}`); const n = Math.floor(r() * 4); const [sh, sm] = h.start.split(':').map(Number) as [number, number]; const [eh, em] = h.end.split(':').map(Number) as [number, number];
    const slots = Math.floor(((eh * 60 + em) - (sh * 60 + sm)) / 30);
    for (let k = 0; k < n; k += 1) { const at = Math.floor(r() * Math.max(1, slots - 3)); const len = 1 + Math.floor(r() * 3); const what = ['Team meeting', 'Site walk', 'Vendor call', 'Review', 'Training'][Math.floor(r() * 5)]!;
      const s = t + at * SLOT; const e = Math.min(s + len * SLOT, t + slots * SLOT);   // every draw is made whether or not the block is in the window, so a day's blocks are the same whoever asks
      if (e > from && s < to) out.push({ from: iso(s), to: iso(e), what }); }
  }
  return out.sort((a, b) => a.from.localeCompare(b.from));
}

export interface Meeting { id: string; key: string; subject: string; start: string; end: string; attendees: string[]; roomId: string | null; by: string; at: string; state: 'RECORDED' | 'CANCELLED'; eventId: string }
/** The simulated adapter: synthetic people, the room bookings of the workspace, and the meetings recorded in this browser. */
export function simulatedAdapter(people: readonly Person[], roomBusy: (roomId: string) => Busy[], meetings: readonly Meeting[], extra: readonly { address: string; busy: Busy }[] = []): CalendarAdapter {
  const made = new Map<string, string>();
  return {
    id: 'simulated', provenance: 'SIMULATED', connected: () => [],
    getSchedule(addresses, from, to) {
      const a = Date.parse(from); const b = Date.parse(to);
      return addresses.map((address) => {
        const person = people.find((p) => p.upn === address); const live = meetings.filter((m) => m.state === 'RECORDED');
        const mine = live.filter((m) => (person && m.attendees.includes(person.id)) || m.roomId === address).map((m) => ({ from: m.start, to: m.end, what: m.subject }));
        const base = person ? simulatedBusy(person, a, b) : roomBusy(address);
        const added = extra.filter((x) => x.address === address).map((x) => x.busy);
        return { address, busy: [...base, ...mine, ...added].filter((x) => Date.parse(x.to) > a && Date.parse(x.from) < b).sort((x, y) => x.from.localeCompare(y.from)), provenance: 'SIMULATED' as const };
      });
    },
    createEvent(r) { const had = made.get(r.transactionId); if (had) return { ok: true, eventId: had, provenance: 'SIMULATED' }; const id = `SIM-EVT-${r.transactionId.slice(0, 8)}`; made.set(r.transactionId, id); return { ok: true, eventId: id, provenance: 'SIMULATED' }; },
    cancelEvent() { return { ok: true }; },
  };
}

export interface Ask { attendees: readonly Person[]; roomId: string | null; minutes: number; /** search from this instant */ from: Date; /** for this many days */ days: number; max?: number }
export interface Proposal { start: string; end: string; reason: string; local: Array<{ personId: string; label: string }>; rank: number }
export type Proposed = { ok: true; proposals: Proposal[]; provenance: string; checked: number } | { ok: false; why: string; tried: string[]; provenance: string; checked: number };

const overlaps = (s: number, e: number, b: Busy) => Date.parse(b.from) < e && Date.parse(b.to) > s;
/** What stands in the way of [start, end) for these people and this room, in words. Empty means free. Read fresh through the adapter. */
export function conflictsAt(a: CalendarAdapter, ask: Pick<Ask, 'attendees' | 'roomId'>, start: string, end: string): string[] {
  const s = Date.parse(start); const e = Date.parse(end); const why: string[] = [];
  for (const p of ask.attendees) if (!isWorking(p, new Date(s), new Date(e))) why.push(`${p.name} is not at work then (${localTime(p.tz, new Date(s)).label} for them; ${hoursOf(p).start} to ${hoursOf(p).end}${p.shift ? `, ${p.shift.name.toLowerCase()} shift` : ''})`);
  const sched = a.getSchedule([...ask.attendees.map((p) => p.upn), ...(ask.roomId ? [ask.roomId] : [])], start, end);
  for (const p of ask.attendees) { const hit = sched.find((x) => x.address === p.upn)?.busy.find((b) => overlaps(s, e, b)); if (hit) why.push(`${p.name} is busy then (${hit.what})`); }
  if (ask.roomId) { const hit = sched.find((x) => x.address === ask.roomId)?.busy.find((b) => overlaps(s, e, b)); if (hit) why.push(`The room is taken then (${hit.what})`); }
  return why;
}

/**
 * Propose times: half-hour starts from the next half hour, each one inside every attendee's working hours and shift in their own time
 * zone, clear of every busy block, with the room free. Earliest first. When there is none, say why and what to try.
 */
export function propose(a: CalendarAdapter, ask: Ask): Proposed {
  const len = ask.minutes * MIN; const start0 = Math.ceil(ask.from.getTime() / SLOT) * SLOT; const endSearch = start0 + ask.days * 24 * 60 * MIN; const max = ask.max ?? 5;
  if (!ask.attendees.length) return { ok: false, why: 'Choose at least one person to meet.', tried: [], provenance: a.provenance, checked: 0 };
  if (ask.minutes < 15 || ask.minutes > 240) return { ok: false, why: 'A meeting here is between 15 minutes and four hours.', tried: [], provenance: a.provenance, checked: 0 };
  const sched = a.getSchedule([...ask.attendees.map((p) => p.upn), ...(ask.roomId ? [ask.roomId] : [])], iso(start0), iso(endSearch));
  const busyOf = (addr: string) => sched.find((x) => x.address === addr)?.busy || [];
  const out: Proposal[] = []; let checked = 0; let inHours = 0; let roomBlocked = 0; const blockedBy = new Map<string, number>();
  for (let s = start0; s + len <= endSearch && out.length < max; s += SLOT) {
    const e = s + len; checked += 1;
    if (!ask.attendees.every((p) => isWorking(p, new Date(s), new Date(e)))) continue; inHours += 1;
    const busy = ask.attendees.find((p) => busyOf(p.upn).some((b) => overlaps(s, e, b))); if (busy) { blockedBy.set(busy.name, (blockedBy.get(busy.name) || 0) + 1); continue; }
    if (ask.roomId && busyOf(ask.roomId).some((b) => overlaps(s, e, b))) { roomBlocked += 1; continue; }
    const zones = new Set(ask.attendees.map((p) => p.tz)).size;
    out.push({ start: iso(s), end: iso(e), rank: out.length + 1, local: ask.attendees.map((p) => ({ personId: p.id, label: localTime(p.tz, new Date(s)).label })),
      reason: `Inside everyone’s working hours${ask.attendees.some((p) => p.shift) ? ' and shifts' : ''}${zones > 1 ? `, across ${zones} time zones` : ''}; nobody is busy${ask.roomId ? '; the room is free' : ''}` });
  }
  if (out.length) return { ok: true, proposals: out, provenance: a.provenance, checked };
  const tried: string[] = [];
  if (!inHours) { tried.push('Their working hours and shifts never overlap for that long in this period. Try a shorter meeting, or leave out someone who can be told afterwards.'); }
  else { for (const [name, n] of blockedBy) tried.push(`${name} is busy in ${n} of the ${inHours} times that fit everyone’s hours.`); if (roomBlocked) tried.push(`The room is taken in ${roomBlocked} of them. Try another room, or meet without one.`); tried.push('Try a later week, or a shorter meeting.'); }
  return { ok: false, why: `No time in the next ${ask.days} ${ask.days === 1 ? 'day' : 'days'} suits everyone.`, tried, provenance: a.provenance, checked };
}
