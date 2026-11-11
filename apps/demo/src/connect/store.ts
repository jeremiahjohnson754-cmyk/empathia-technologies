/**
 * Connect's one write path. Everything that changes because of a contact action or a meeting goes through here: an authority check
 * (access.ts), validation, a refusal with the reason, and a line in the shared workspace ledger. State is kept in this browser
 * (`empathia.demo.connect.v1`) beside the shared workspace; a stored state that cannot be read starts clean.
 *
 * A meeting is a two-step act. `proposeFor` only reads. `confirm` is the single place a meeting is recorded: it reads the calendar
 * AGAIN at that moment (fresh from storage, so a booking made in another tab counts), refuses with who or what is in the way, and is
 * idempotent on the transaction key it is given: the same key always yields the same one meeting. The room's booking is written to
 * the shared workspace, where ServiceHands' preflight and the Operations Hub read it.
 *
 * What is recorded is honest about what it is: a meeting in this demonstration's SIMULATED calendar. No invitation leaves this
 * browser. Opening another app is logged as `contact.opened`; nothing here claims a message, a call or an invitation was delivered.
 */
import type { RoleKey } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import * as S from '../workspace/store.js';
import { log, deny, personaOf } from '../hardening/kit.js';
import { CAMPUS_ROOMS, roomById, shortName } from '../campus/canon.js';
import { DURATIONS, alternatives, explain, propose, type Alternative, type Ask, type Busy, type Cal, type Proposal } from './calendar.js';
import { simAsk, simBusy, simCancel, simCreate, type CalEvent, type Party, type RoomRef, type SimPerson, type SimWorld } from './adapter.js';
import { ALL_BUILDINGS, EMAIL_DOMAIN, ZONE_OF_GROUP, backupFor, people, personById, personaPerson, subjectOf, zoneOfBuilding, type EntityKind, type Person, type Subject } from './directory.js';
import { mayCurate, mayReach, maySchedule, maySeeDetails } from './access.js';
import { APP_JUMPS, jumpById } from './apps.js';
import { DAY, HOUR, MIN, fmtRange, isoDay, utcOffset, wallToUtc, zoneCity } from './time.js';

const KEY = 'empathia.demo.connect.v1';
export type Refusal = { why: string[] };
export interface Note { at: string; by: string; role: string; text: string }
export interface Meeting extends CalEvent { organiser: { id: string; name: string; role: RoleKey }; about: { kind: EntityKind; id: string; label: string } | null; by: string }
export interface State { v: 1; seq: number; meetings: Meeting[]; confirmed: Record<string, string>; notes: Record<string, Note[]> }
const fresh = (): State => ({ v: 1, seq: 0, meetings: [], confirmed: {}, notes: {} });
const isMeeting = (m: unknown): m is Meeting => { const x = m as Meeting; return !!x && typeof x.id === 'string' && typeof x.transactionId === 'string' && Number.isFinite(x.from) && Number.isFinite(x.to) && x.to > x.from && Array.isArray(x.parties) && (x.state === 'RECORDED' || x.state === 'CANCELLED') && !!x.organiser && typeof x.organiser.id === 'string'; };
/** The stored state, or a clean one when nothing is stored or what is stored cannot be trusted. */
export function loadState(): State {
  try {
    const s = localStorage.getItem(KEY); if (!s) return fresh(); const o = JSON.parse(s) as Partial<State>;
    if (!o || o.v !== 1 || !Array.isArray(o.meetings) || typeof o.seq !== 'number' || !o.meetings.every(isMeeting)) return fresh();
    const rec = (x: unknown) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
    return { v: 1, seq: Math.max(0, Math.floor(o.seq)), meetings: o.meetings, confirmed: rec(o.confirmed) as Record<string, string>, notes: rec(o.notes) as Record<string, Note[]> };
  } catch { return fresh(); }
}
export function saveState(st: State): void { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* the state lasts the page */ } }
export const STATE_KEY = KEY;

// ------------------------------------------------------------------------------------------------------------ the simulated calendar, over the directory and the workspace
export const roomMail = (roomId: string) => `room.${roomId.toLowerCase()}@${EMAIL_DOMAIN}`;
export const roomRef = (roomId: string): RoomRef | null => { const o = roomById(roomId); return o ? { id: o.id, name: shortName(o), mail: roomMail(o.id) } : null; };
const simOf = (p: Person): SimPerson => ({ id: p.id, name: p.name, mail: p.email, title: p.title, phone: p.phone, tz: p.tz, hours: p.hours, shift: p.shift });
/**
 * Who a role is when it schedules. A role that stands for a person of the directory is that person; any other role is "you": a
 * colleague at the first campus with ordinary office hours, said on the page, so that the organiser's own calendar is part of every answer.
 */
export function organiserOf(role: RoleKey): SimPerson {
  const p = personaPerson(role); if (p) return simOf(p);
  return { id: `you-${role}`, name: `You (${ROLES[role].label})`, mail: `you.${role}@${EMAIL_DOMAIN}`, title: ROLES[role].label, phone: '', tz: ZONE_OF_GROUP[Object.keys(ZONE_OF_GROUP)[0]!]!, hours: { days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00' }, shift: null };
}
/** A workspace booking is kept as UTC wall time without a zone ("2026-11-12T15:00"); here it is an interval. */
export const bookingsOf = (w: S.Workspace, roomId: string): Busy[] => (w.bookings[roomId] || []).map((b) => ({ from: Date.parse(`${b.from.slice(0, 16)}:00Z`), to: Date.parse(`${b.to.slice(0, 16)}:00Z`), title: b.title })).filter((b) => Number.isFinite(b.from) && Number.isFinite(b.to) && b.to > b.from);
const stamp = (ms: number) => new Date(ms).toISOString().slice(0, 16);
export function worldOf(st: State, w: S.Workspace, role: RoleKey, now: () => number): SimWorld {
  const me = organiserOf(role); const ppl = people().map(simOf);
  return { now, people: ppl.some((p) => p.id === me.id) ? ppl : [...ppl, me], rooms: CAMPUS_ROOMS.map((o) => ({ id: o.id, name: shortName(o), mail: roomMail(o.id), tz: zoneOfBuilding(o.building) })),
    roomBookings: (roomId) => bookingsOf(w, roomId), events: st.meetings, nextId: () => `MTG-${String(++st.seq).padStart(4, '0')}` };
}
/** A person's busy time as the simulated calendar answers it (seeded blocks and the meetings recorded here). */
export const busyOf = (st: State, w: S.Workspace, role: RoleKey, p: Person, from: number, to: number): Busy[] => simBusy(worldOf(st, w, role, () => from), simOf(p), from, to);

// ------------------------------------------------------------------------------------------------------------ proposing (reads only)
export interface MeetInput { withIds: string[]; optionalIds: string[]; roomId: string | null; minutes: number; /** the first day to look at, as the organiser's local date (YYYY-MM-DD), or null for now */ fromDay: string | null; subject: string; about: { kind: EntityKind; id: string } | null }
export const SEARCH_DAYS = 7; export const MAX_ATTENDEES = 8;
export interface Plan { organiser: SimPerson; parties: Party[]; room: RoomRef | null; ask: Ask; proposal: Proposal; alternatives: Alternative[]; from: number; to: number; about: Subject | null; subject: string }
/** What is wrong with a request before any calendar is read; empty when it can go on. Names nobody the role may not see. */
export function inputProblems(role: RoleKey, input: MeetInput, w: S.Workspace | null): string[] {
  const why: string[] = [];
  if (!maySchedule(role)) return [`The ${ROLES[role].label} does not schedule meetings here.`];
  const ids = [...new Set(input.withIds)];
  if (!ids.length) why.push('Choose who to meet.');
  if (ids.length > MAX_ATTENDEES) why.push(`Choose at most ${MAX_ATTENDEES} people.`);
  for (const id of ids) { const p = personById(id); if (!p) why.push('One of the people chosen is not in the directory.'); else if (!maySeeDetails(role, p)) why.push(`The ${ROLES[role].label} may not schedule with a ${p.title}: their calendar is not shown to this role.`); }
  if (!(DURATIONS as readonly number[]).includes(input.minutes)) why.push(`Choose ${DURATIONS.join(', ')} minutes.`);
  if (input.roomId && !roomById(input.roomId)) why.push('That room is not on record.');
  if (input.fromDay && !/^\d{4}-\d{2}-\d{2}$/.test(input.fromDay)) why.push('The first day is not a date.');
  if (input.subject.length > 120) why.push('Keep the subject under 120 characters.');
  if (input.about && !subjectOf(input.about.kind, input.about.id, w)) why.push('What the meeting is about is not on record.');
  return [...new Set(why)];
}
const partyOf = (p: SimPerson, optional = false): Party => ({ id: p.id, name: p.name, mail: p.mail, optional });
/** The subject a meeting gets when the person typed none: what it is about, or who it is with. */
export const defaultSubject = (input: MeetInput, w: S.Workspace | null): string => { const a = input.about ? subjectOf(input.about.kind, input.about.id, w) : null; const first = personById(input.withIds[0] || ''); return a ? `About ${a.label}` : first ? `Meeting with ${first.name}` : 'Meeting'; };
/** The search window: from the next half hour (or the start of the day asked for, when that is later), for SEARCH_DAYS days. */
export function windowOf(me: SimPerson, fromDay: string | null, now: number): { from: number; to: number } {
  let from = Math.ceil((now + 30 * MIN) / (30 * MIN)) * 30 * MIN;
  if (fromDay) { const [y, m, d] = fromDay.split('-').map(Number); const start = wallToUtc(me.tz, y!, m!, d!, 0, 0); if (start > from) from = start; }
  return { from, to: from + SEARCH_DAYS * DAY };
}
/** Ranked slots for a request, with the reason for each; or why there is none and which changes would produce one. Reads only: nothing is recorded. */
export function proposeFor(role: RoleKey, input: MeetInput, now: number, st: State = loadState(), w: S.Workspace = S.load()): Refusal | Plan {
  const errs = inputProblems(role, input, w); if (errs.length) return { why: errs };
  const world = worldOf(st, w, role, () => now); const me = organiserOf(role); const ids = [...new Set(input.withIds)].filter((id) => id !== me.id);
  const parties: Party[] = [partyOf(me), ...ids.map((id) => partyOf(simOf(personById(id)!), input.optionalIds.includes(id)))];
  const room = input.roomId ? roomRef(input.roomId) : null; const { from, to } = windowOf(me, input.fromDay, now);
  const { ask } = simAsk(world, { parties, room, minutes: input.minutes, from, to });
  const proposal = propose(ask);
  // a backup for each person who must attend, as the scheduler sees them, so "meet the backup instead" can be tried for real
  const backups: Record<string, Cal> = {};
  for (const id of ids) { const b = backupFor(personById(id)!); if (b && maySeeDetails(role, b)) { const s = simOf(b); backups[id] = { id: s.id, name: s.name, tz: s.tz, hours: s.hours, shift: s.shift, busy: simBusy(world, s, from - DAY, to + DAY + SEARCH_DAYS * DAY) }; } }
  const alts = proposal.slots.length ? [] : alternatives({ ...ask, attendees: ask.attendees.map((c) => ({ ...c, busy: simBusy(world, world.people.find((p) => p.id === c.id)!, from - DAY, to + DAY + SEARCH_DAYS * DAY) })), room: ask.room && { ...ask.room, busy: [...bookingsOf(w, ask.room.id), ...st.meetings.filter((m) => m.state === 'RECORDED' && m.room?.id === ask.room!.id).map((m) => ({ from: m.from, to: m.to, title: m.id }))] } }, backups);
  return { organiser: me, parties, room, ask, proposal, alternatives: alts, from, to, about: input.about ? subjectOf(input.about.kind, input.about.id, w) : null, subject: input.subject.trim() || defaultSubject(input, w) };
}
export { explain };

/** A transaction key for a request and a slot: the same request for the same time always has the same key, in any tab, after any reload. UUID-shaped, as Graph's example is. */
export function keyFor(role: RoleKey, input: MeetInput, slot: { from: number; to: number }): string {
  const text = JSON.stringify([organiserOf(role).id, [...new Set(input.withIds)].sort(), [...new Set(input.optionalIds)].sort(), input.roomId || '', slot.from, slot.to, input.about ? `${input.about.kind}:${input.about.id}` : '']);
  const h = (seed: number) => { let x = seed >>> 0; for (let i = 0; i < text.length; i += 1) { x ^= text.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16).padStart(8, '0'); };
  const a = h(0x811c9dc5); const b = h(0x9e3779b9); const c = h(0x85ebca6b); const d = h(0xc2b2ae35);
  return `${a}-${b.slice(0, 4)}-4${b.slice(5, 8)}-8${c.slice(1, 4)}-${c.slice(4)}${d}`.toUpperCase();
}
/** What an invitation for this meeting would say. Shown at the review step and kept with the meeting; it is not sent anywhere. */
export function invitationText(p: { subject: string; parties: Party[]; room: RoomRef | null; from: number; to: number; about: Subject | null; organiser: SimPerson }, tzOf: (id: string) => string): string {
  const lines = [`${p.subject}`, '', `Organiser: ${p.organiser.name}`, 'When:'];
  for (const x of p.parties) lines.push(`  ${x.name}${x.optional ? ' (optional)' : ''}: ${fmtRange(tzOf(x.id), p.from, p.to)}, ${zoneCity(tzOf(x.id))} time (${utcOffset(tzOf(x.id), p.from)})`);
  lines.push(`Where: ${p.room ? p.room.name : 'No room: an online meeting'}`); if (p.about) lines.push(`About: ${p.about.label}`);
  lines.push('', 'Everyone named here is synthetic. This text is what an invitation would say; this demonstration sends nothing.');
  return lines.join('\n');
}

// ------------------------------------------------------------------------------------------------------------ confirming, cancelling (the writes)
export interface Confirmed { meeting: Meeting; again: boolean; said: string }
export const RECORDED_STATEMENT = 'Recorded in this demonstration’s simulated calendar. No invitation left this browser.';
/**
 * Record the meeting. Reads the workspace and the calendar afresh, so anything booked since the proposal (in this tab or another)
 * is seen; refuses with who or what conflicts; and returns the meeting already recorded when the key has been confirmed before.
 */
export function confirm(role: RoleKey, input: MeetInput, slot: { from: number; to: number }, key: string, now: number): Refusal | Confirmed {
  const w = S.load(); const st = loadState(); const persona = personaOf(role); const agg = input.about ? `${input.about.kind}:${input.about.id}` : 'Meeting';
  if (!maySchedule(role)) { const r = deny(w, persona, 'meeting.refused', agg, [`The ${ROLES[role].label} does not schedule meetings here.`]); S.save(w); return r; }
  const errs = inputProblems(role, input, w); if (errs.length) return { why: errs };
  if (!key || key !== keyFor(role, input, slot)) return { why: ['This confirmation does not match what was reviewed. Review the meeting again.'] };
  const had = st.meetings.find((m) => m.transactionId === key && m.state === 'RECORDED');
  if (had) return { meeting: had, again: true, said: `${had.id} was already recorded; nothing was recorded a second time.` };
  const world = worldOf(st, w, role, () => now); const me = organiserOf(role); const ids = [...new Set(input.withIds)].filter((id) => id !== me.id);
  const parties: Party[] = [partyOf(me), ...ids.map((id) => partyOf(simOf(personById(id)!), input.optionalIds.includes(id)))];
  const room = input.roomId ? roomRef(input.roomId) : null; const about = input.about ? subjectOf(input.about.kind, input.about.id, w) : null; const subject = input.subject.trim() || defaultSubject(input, w);
  const tzOf = (id: string) => world.people.find((p) => p.id === id)?.tz || me.tz;
  const out = simCreate(world, { transactionId: key, subject, body: invitationText({ subject, parties, room, from: slot.from, to: slot.to, about, organiser: me }, tzOf), from: slot.from, to: slot.to, parties, room });
  if (!out.ok) { const r = deny(w, persona, 'meeting.refused', agg, out.why); S.save(w); return r; }
  const m = out.value.event as Meeting; m.organiser = { id: me.id, name: me.name, role }; m.about = about ? { kind: about.kind, id: about.id, label: about.label } : null; m.by = persona;
  if (room) (w.bookings[room.id] ||= []).push({ from: stamp(m.from), to: stamp(m.to), title: `${m.id} · ${subject}` });
  log(w, persona, 'meeting.recorded', agg, `${m.id} · ${subject} · ${fmtRange(me.tz, m.from, m.to)} ${zoneCity(me.tz)} time · ${parties.length} people${room ? ` · ${room.name}` : ''} · simulated calendar; no invitation left this browser`);
  saveState(st); S.save(w);
  return { meeting: m, again: false, said: RECORDED_STATEMENT };
}
/** Cancel a recorded meeting: the person who recorded it only. The room's booking is removed from the workspace; the meeting is kept, as cancelled. */
export function cancelMeeting(role: RoleKey, id: string, reason: string, now: number): Refusal | Meeting {
  const w = S.load(); const st = loadState(); const persona = personaOf(role); const m = st.meetings.find((x) => x.id === id);
  if (!m) return { why: [`No meeting ${id} is recorded here.`] };
  if (!maySchedule(role) || m.organiser.role !== role) { const r = deny(w, persona, 'meeting.cancel_refused', m.id, [`${m.id} was recorded by the ${ROLES[m.organiser.role]?.label || m.organiser.role}; only they cancel it.`]); S.save(w); return r; }
  if (m.state === 'CANCELLED') return m;
  const out = simCancel(worldOf(st, w, role, () => now), id, reason); if (!out.ok) return { why: out.why };
  if (m.room && w.bookings[m.room.id]) w.bookings[m.room.id] = w.bookings[m.room.id]!.filter((b) => !b.title.startsWith(`${m.id} ·`));
  log(w, persona, 'meeting.cancelled', m.about ? `${m.about.kind}:${m.about.id}` : 'Meeting', `${m.id} · ${m.subject}${reason.trim() ? ` · ${reason.trim().slice(0, 160)}` : ''} · simulated calendar; no cancellation left this browser`);
  saveState(st); S.save(w); return m;
}
/** The recorded meetings a role is shown: the ones it organised. */
export const meetingsOf = (st: State, role: RoleKey): Meeting[] => st.meetings.filter((m) => m.organiser.role === role).sort((a, b) => b.from - a.from);
/** Recorded meetings still to come in a room: what "this room is booked" is said from, beside the workspace's own bookings. */
export const meetingsInRoom = (st: State, roomId: string, now: number): Meeting[] => st.meetings.filter((m) => m.state === 'RECORDED' && m.room?.id === roomId && m.to > now).sort((a, b) => a.from - b.from);

// ------------------------------------------------------------------------------------------------------------ contact actions
export interface JumpRecord { jump: string; personId: string; about: { kind: EntityKind; id: string } | null; from: string }
/**
 * Write down that an app was opened for a person. The line says "opened", names the app and what it was about, and nothing else:
 * whether a message was written, a call answered or an invitation sent is not known here and is not claimed.
 */
export function recordJump(role: RoleKey, r: JumpRecord): Refusal | { said: string; app: string } {
  const j = jumpById(r.jump); const p = personById(r.personId); if (!j || !p) return { why: ['That contact action is not available.'] };
  const w = S.load(); const persona = personaOf(role); const about = r.about ? subjectOf(r.about.kind, r.about.id, w) : null; const agg = about ? `${about.kind}:${about.id}` : `person:${p.id}`;
  if (j.status !== 'documented' || !mayReach(role, p)) { const out = deny(w, persona, 'contact.refused', agg, [j.status !== 'documented' ? `${j.label} is not offered: its link format is not on an official page.` : `The ${ROLES[role].label} does not contact a ${p.title} from here.`]); S.save(w); return out; }
  log(w, persona, 'contact.opened', agg, `${j.app} · ${j.label} · ${p.name} (${p.title})${about ? ` · about ${about.label}` : ''} · from ${r.from.slice(0, 80)} · opened only; nothing is known about what was sent`);
  S.save(w); return { app: j.app, said: `Opened ${j.app}. ${j.then.charAt(0).toUpperCase()}${j.then.slice(1)}. Nothing was sent from here.` };
}
export function recordCopy(role: RoleKey, personId: string, what: 'email' | 'card'): Refusal | null {
  const p = personById(personId); if (!p) return { why: ['That person is not in the directory.'] };
  const w = S.load(); const persona = personaOf(role);
  if (!maySeeDetails(role, p)) { const out = deny(w, persona, 'contact.refused', `person:${p.id}`, [`The ${ROLES[role].label} is not shown a ${p.title}’s contact details.`]); S.save(w); return out; }
  log(w, persona, 'contact.copied', `person:${p.id}`, `${what === 'email' ? 'email address' : 'contact card'} of ${p.name} (${p.title}) copied to this device’s clipboard`); S.save(w); return null;
}
/** The words a jump is prefilled with: who is writing, what it is about and what was seen. Only what the caller passes in: never a note from a job or anything read from a record the role was not shown. */
export function composeFor(role: RoleKey, p: Person, about: Subject | null, seen: string | null): { subject: string; body: string } {
  const what = about && about.kind !== 'person' ? about.label : null; const said = (seen || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  return { subject: what ? `About ${what}` : `A question for the ${p.kind === 'role' ? p.title : 'site champion'}`,
    body: [`Hello ${p.name.split(' ')[0]},`, '', what ? `I am writing about ${what}.` : 'I have a question.', ...(said ? [`What I saw: ${said}`] : []), '', `(${ROLES[role].label}, from the Empathia demonstration. Everyone in it is synthetic.)`].join('\n') };
}
/** A contact card as plain text, for copying. */
export const cardOf = (p: Person): string => [p.name, p.title + (p.org ? `, ${p.org}` : ''), `${p.email}`, `${p.phone}`, `${zoneCity(p.tz)} time · ${(p.shift || p.hours).start}–${(p.shift || p.hours).end}${p.shift ? ` (${p.shift.name.toLowerCase()})` : ''}`, 'Synthetic person: this address and number are fictional.'].join('\n');

// ------------------------------------------------------------------------------------------------------------ keeping the directory true (contribution)
/** Confirm that an entry is still right. The Data Steward, or a champion for their own site. Today's date becomes the entry's "last confirmed". */
export function confirmEntry(role: RoleKey, personId: string, now: number): Refusal | { on: string } {
  const p = personById(personId); if (!p) return { why: ['That person is not in the directory.'] };
  const w = S.load(); const st = loadState(); const persona = personaOf(role);
  if (!mayCurate(role, p)) { const out = deny(w, persona, 'directory.refused', `person:${p.id}`, [`The ${ROLES[role].label} does not confirm directory entries. The Data Steward does, and a site champion does for their own site.`]); S.save(w); return out; }
  const on = new Date(now).toISOString().slice(0, 10); st.confirmed[p.id] = on;
  log(w, persona, 'directory.confirmed', `person:${p.id}`, `${p.name} (${p.title}) confirmed as current on ${on}`); saveState(st); S.save(w); return { on };
}
/** Add a local note to a champion's profile: something about the site the records do not know. Kept in this browser; never placed in a message. */
export function addNote(role: RoleKey, personId: string, text: string, now: number): Refusal | Note {
  const p = personById(personId); if (!p) return { why: ['That person is not in the directory.'] };
  const w = S.load(); const st = loadState(); const persona = personaOf(role); const t = text.replace(/\s+/g, ' ').trim();
  if (p.kind === 'role' || !mayCurate(role, p)) { const out = deny(w, persona, 'directory.refused', `person:${p.id}`, [p.kind === 'role' ? 'Local notes are kept on a site champion’s profile.' : `The ${ROLES[role].label} does not add local notes. A site champion does for their own site, and the Data Steward can.`]); S.save(w); return out; }
  if (t.length < 8) return { why: ['Say it in a few words (at least 8 characters).'] };
  if (t.length > 280) return { why: ['Keep the note under 280 characters.'] };
  const n: Note = { at: new Date(now).toISOString(), by: persona, role, text: t }; (st.notes[p.id] ||= []).unshift(n); st.notes[p.id] = st.notes[p.id]!.slice(0, 20);
  log(w, persona, 'directory.note', `person:${p.id}`, `local note added to the profile of ${p.name}: ${t.slice(0, 120)}`); saveState(st); S.save(w); return n;
}
export { APP_JUMPS, ALL_BUILDINGS, HOUR, isoDay };
