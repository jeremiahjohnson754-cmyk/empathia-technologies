/**
 * Where calendar facts come from and where a confirmed meeting goes: ONE interface, two implementations.
 *
 *   SIMULATED  (this file)  what the demonstration uses. Deterministic: people and hours from the directory, busy time seeded from
 *                           the person and the date, the room's bookings from the shared workspace. Nothing leaves the browser.
 *   graph      (graph.ts)   written to Microsoft Graph's published contract and exercised only against a deterministic mock
 *                           transport (graph.mock.ts). MOCK-TESTED. It has never been run against a Microsoft 365 tenant.
 *
 * Both answer the same six questions: who is this person (people), when are they busy and what hours do they work (schedule), what
 * shifts do they have (shifts), which times would work (suggest), record this meeting once (create, with a transaction id supplied
 * by the caller), and cancel it. Every answer carries where it came from. The contract tests (tests/unit/demo-connect.test.mjs) run
 * one suite against both.
 *
 * `connected()` is empty and the page says so: there is no tenant, no test account and no credential anywhere in this demonstration.
 * A real adapter additionally needs what docs/surpass/M365_DEPLOYMENT_AND_TEST_GUIDE.md lists; none of it exists yet.
 */
import { conflictsAt, propose, seededBusy, workingIn, type Ask, type Busy, type Cal, type Hours, type RoomCal, type Shift, type Slot, type Why } from './calendar.js';
import { DAY, MIN, overlaps, type Interval } from './time.js';

export type Provenance = 'SIMULATED' | 'MOCK-TESTED' | 'CONNECTED';
export type FailKind = 'not-authorised' | 'conflict' | 'throttled' | 'not-found' | 'invalid' | 'unavailable';
export type Result<T> = { ok: true; value: T; provenance: Provenance } | { ok: false; kind: FailKind; why: string[]; conflicts?: Why[]; provenance: Provenance };
export interface PersonRef { id: string; name: string; mail: string; title: string | null; phone: string | null }
export interface WorkingHours extends Hours { tz: string }
export interface ScheduleOf { mail: string; busy: Busy[]; /** null when the calendar did not say, or said it in a zone this adapter cannot read: never guessed */ working: WorkingHours | null; note?: string }
export interface ShiftOf { personId: string; from: number; to: number; name: string }
export interface Party { id: string; name: string; mail: string; optional?: boolean }
export interface RoomRef { id: string; name: string; mail: string }
export interface SuggestRequest { parties: Party[]; room: RoomRef | null; minutes: number; from: number; to: number; max?: number }
export interface CreateRequest { transactionId: string; subject: string; body: string; from: number; to: number; parties: Party[]; room: RoomRef | null }
export interface CalEvent { id: string; transactionId: string; subject: string; body: string; from: number; to: number; parties: Party[]; room: RoomRef | null; state: 'RECORDED' | 'CANCELLED'; createdAt: string; cancelledAt?: string; cancelReason?: string }
export interface Created { event: CalEvent; /** true when this transaction id had already produced the event: nothing was created a second time */ again: boolean }
export interface CalendarAdapter {
  id: string; label: string; provenance: Provenance;
  /** what has and has not been validated, in one sentence the interface can show */
  validation: string;
  people(query: string): Promise<Result<PersonRef[]>>;
  schedule(mails: string[], from: number, to: number): Promise<Result<ScheduleOf[]>>;
  shifts(from: number, to: number): Promise<Result<ShiftOf[]>>;
  suggest(req: SuggestRequest): Promise<Result<Slot[]>>;
  create(req: CreateRequest): Promise<Result<Created>>;
  cancel(eventId: string, comment: string): Promise<Result<CalEvent>>;
}

// ------------------------------------------------------------------------------------------------------------ the simulated calendar
export interface SimPerson { id: string; name: string; mail: string; title: string; phone: string; tz: string; hours: Hours; shift: Shift | null }
export interface SimRoom { id: string; name: string; mail: string; tz: string }
/** Everything the simulated calendar knows. The store builds one from the directory, the shared workspace and its own recorded meetings; tests build one in memory. */
export interface SimWorld {
  now: () => number; people: SimPerson[]; rooms: SimRoom[];
  /** bookings of a room from outside this calendar (the shared workspace) */
  roomBookings: (roomId: string) => Busy[];
  /** the meetings this calendar holds; `create` and `cancel` change this list */
  events: CalEvent[]; nextId: () => string;
}
const liveOf = (w: SimWorld) => w.events.filter((e) => e.state === 'RECORDED');
/** A person's busy time in the simulated calendar: seeded blocks, and every recorded meeting they are in. */
export function simBusy(w: SimWorld, p: SimPerson, from: number, to: number, skipEvent?: string): Busy[] {
  const own = liveOf(w).filter((e) => e.id !== skipEvent && e.parties.some((x) => x.id === p.id) && overlaps(e, { from, to })).map((e) => ({ from: e.from, to: e.to, title: `${e.id} · ${e.subject}` }));
  return [...seededBusy(p, from, to), ...own].sort((a, b) => a.from - b.from);
}
export function simRoomBusy(w: SimWorld, roomId: string, from: number, to: number, skipEvent?: string): Busy[] {
  const own = liveOf(w).filter((e) => e.id !== skipEvent && e.room?.id === roomId && overlaps(e, { from, to })).map((e) => ({ from: e.from, to: e.to, title: `${e.id} · ${e.subject}` }));
  // the workspace also carries each recorded meeting as a room booking (so Lite and ServiceHands see it): counted once
  const outside = w.roomBookings(roomId).filter((b) => overlaps(b, { from, to }) && !liveOf(w).some((e) => b.title.startsWith(`${e.id} ·`)) && !(skipEvent && b.title.startsWith(`${skipEvent} ·`)));
  return [...outside, ...own].sort((a, b) => a.from - b.from);
}
const calOf = (w: SimWorld, party: Party, from: number, to: number): Cal | null => { const p = w.people.find((x) => x.id === party.id || x.mail === party.mail); return p ? { id: p.id, name: party.name || p.name, tz: p.tz, hours: p.hours, shift: p.shift, busy: simBusy(w, p, from, to), optional: !!party.optional } : null; };
const roomCal = (w: SimWorld, room: RoomRef | null, from: number, to: number): RoomCal | null => { if (!room) return null; const r = w.rooms.find((x) => x.id === room.id || x.mail === room.mail); return r ? { id: r.id, name: r.name, tz: r.tz, busy: simRoomBusy(w, r.id, from, to) } : null; };
/** The scheduler's question for a request, from the simulated calendar's facts; the parties it does not know are named. */
export function simAsk(w: SimWorld, req: SuggestRequest): { ask: Ask; unknown: string[] } {
  const unknown: string[] = []; const attendees: Cal[] = [];
  for (const party of req.parties) { const c = calOf(w, party, req.from - DAY, req.to + DAY); if (c) attendees.push(c); else unknown.push(party.name || party.mail); }
  if (req.room && !w.rooms.some((x) => x.id === req.room!.id || x.mail === req.room!.mail)) unknown.push(req.room.name);
  return { ask: { attendees, room: roomCal(w, req.room, req.from - DAY, req.to + DAY), minutes: req.minutes, from: req.from, to: req.to, max: req.max }, unknown };
}
const P: Provenance = 'SIMULATED';
const bad = <T,>(kind: FailKind, why: string[], conflicts?: Why[]): Result<T> => ({ ok: false, kind, why, ...(conflicts ? { conflicts } : {}), provenance: P });

/** Record a meeting in the simulated calendar: once per transaction id, and only if every required person and the room are still free. Synchronous: the store calls it inside its one write. */
export function simCreate(w: SimWorld, req: CreateRequest): Result<Created> {
  if (!req.transactionId) return bad('invalid', ['A meeting is recorded with a transaction id, so that it can never be recorded twice.']);
  const had = w.events.find((e) => e.transactionId === req.transactionId && e.state === 'RECORDED'); if (had) return { ok: true, value: { event: had, again: true }, provenance: P };
  if (!req.subject.trim()) return bad('invalid', ['Give the meeting a subject.']);
  if (!(req.to > req.from) || (req.to - req.from) % MIN !== 0) return bad('invalid', ['The meeting needs a start and a later end.']);
  if (req.from < w.now()) return bad('invalid', ['That time has passed. Choose a time that is still to come.']);
  if (!req.parties.some((x) => !x.optional)) return bad('invalid', ['A meeting needs at least one person who must attend.']);
  const { ask, unknown } = simAsk(w, { parties: req.parties, room: req.room, minutes: Math.round((req.to - req.from) / MIN), from: req.from, to: req.to });
  if (unknown.length) return bad('not-found', unknown.map((n) => `${n} is not in this calendar.`));
  const conflicts = conflictsAt(ask, req.from, req.to);
  if (conflicts.length) return bad('conflict', conflicts.map((c) => c.detail), conflicts);
  const event: CalEvent = { id: w.nextId(), transactionId: req.transactionId, subject: req.subject.trim(), body: req.body, from: req.from, to: req.to, parties: req.parties.map((x) => ({ id: x.id, name: x.name, mail: x.mail, optional: !!x.optional })), room: req.room, state: 'RECORDED', createdAt: new Date(w.now()).toISOString() };
  w.events.push(event); return { ok: true, value: { event, again: false }, provenance: P };
}
/** Cancel a recorded meeting. Cancelling one that is already cancelled changes nothing and says so. */
export function simCancel(w: SimWorld, eventId: string, comment: string): Result<CalEvent> {
  const e = w.events.find((x) => x.id === eventId); if (!e) return bad('not-found', [`No meeting ${eventId} is recorded.`]);
  if (e.state === 'CANCELLED') return { ok: true, value: e, provenance: P };
  e.state = 'CANCELLED'; e.cancelledAt = new Date(w.now()).toISOString(); e.cancelReason = comment.trim().slice(0, 300); return { ok: true, value: e, provenance: P };
}
export function simSchedule(w: SimWorld, mails: string[], from: number, to: number): ScheduleOf[] {
  return mails.map((mail) => {
    const p = w.people.find((x) => x.mail === mail); if (p) { const h = p.shift || p.hours; return { mail, busy: simBusy(w, p, from, to), working: { days: h.days, start: h.start, end: h.end, tz: p.tz } }; }
    const r = w.rooms.find((x) => x.mail === mail); if (r) return { mail, busy: simRoomBusy(w, r.id, from, to), working: null, note: 'a room has no working hours' };
    return { mail, busy: [], working: null, note: 'not in this calendar' };
  });
}
/** A person's shifts inside [from, to] as dated intervals: the pattern of the directory, laid on the days of the window. */
export function simShifts(w: SimWorld, from: number, to: number): ShiftOf[] {
  const out: ShiftOf[] = [];
  for (const p of w.people) if (p.shift) for (const i of shiftIntervals(p.tz, p.shift, from, to)) out.push({ personId: p.id, from: i.from, to: i.to, name: p.shift.name });
  return out.sort((a, b) => a.from - b.from || a.personId.localeCompare(b.personId));
}
export const shiftIntervals = (tz: string, shift: Shift, from: number, to: number): Interval[] => workingIn({ tz, hours: shift, shift }, from, to);

export function simulatedAdapter(w: SimWorld): CalendarAdapter {
  const ok = <T,>(value: T): Result<T> => ({ ok: true, value, provenance: P });
  return {
    id: 'simulated', label: 'Simulated calendar (this browser only)', provenance: P,
    validation: 'Simulated: people, hours and busy time are generated for the demonstration. No calendar is read and no invitation leaves this browser.',
    people: async (query) => { const q = query.trim().toLowerCase(); return ok(q.length < 2 ? [] : w.people.filter((p) => p.name.toLowerCase().includes(q) || p.mail.includes(q)).slice(0, 10).map((p) => ({ id: p.id, name: p.name, mail: p.mail, title: p.title, phone: p.phone }))); },
    schedule: async (mails, from, to) => ok(simSchedule(w, mails, from, to)),
    shifts: async (from, to) => ok(simShifts(w, from, to)),
    suggest: async (req) => { const { ask, unknown } = simAsk(w, req); return unknown.length ? bad('not-found', unknown.map((n) => `${n} is not in this calendar.`)) : ok(propose(ask).slots); },
    create: async (req) => simCreate(w, req),
    cancel: async (id, comment) => simCancel(w, id, comment),
  };
}
/** Calendars this demonstration is connected to. None: there is no tenant, no account and no credential. The page states this from here. */
export const connected = (): CalendarAdapter[] => [];
export const CONNECTION_STATEMENT = 'NOT CONNECTED. This demonstration has no Microsoft 365 tenant, no test account and no credential. The calendar is simulated; the Microsoft Graph adapter is written and mock-tested, and has never been validated against a real calendar, a real Teams client or a real phone.';
