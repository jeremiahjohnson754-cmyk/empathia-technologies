/**
 * The one write path of the Connect slice: recording a meeting after an explicit confirmation, cancelling it, and noting that an
 * application was opened. Founder, 11 Nov 2026: "Never silently book meetings. Never send invitations without the required user
 * authorization." So a meeting exists here only after `confirm`, which checks who is asking, checks the time AGAIN through the
 * adapter, and uses the caller's key so that one confirmation can never make two meetings. What is recorded is recorded in the
 * demonstration's SIMULATED calendar and says so: no invitation leaves the browser, and nothing here is described as sent.
 */
import type { RoleKey } from '../registry.types.js';
import { ROLES, allows } from '../access/policy.js';
import { roomById, shortName } from '../campus/canon.js';
import type * as S from '../workspace/store.js';
import { deny, log, personaOf, type WX } from '../hardening/kit.js';
import { directory, personById, type Person } from './directory.js';
import { APPS, type AppId } from './apps.js';
import { conflictsAt, propose, simulatedAdapter, type Ask, type Busy, type CalendarAdapter, type Meeting, type Proposed } from './calendar.js';

export type Refusal = { why: string[] };
export interface ConnectState { meetings: Meeting[]; keys: Record<string, string> }
type WC = WX & { cn?: ConnectState };
const cn = (w: S.Workspace): ConnectState => ((w as WC).cn ||= { meetings: [], keys: {} });
/** Read without creating. Stored state is untrusted: anything of the wrong shape reads as empty. */
export function connectView(w: S.Workspace | null): ConnectState {
  const c = (w as WC | null)?.cn; if (!c || typeof c !== 'object' || !Array.isArray(c.meetings)) return { meetings: [], keys: {} };
  const ok = (m: Meeting) => m && typeof m.id === 'string' && typeof m.start === 'string' && typeof m.end === 'string' && Array.isArray(m.attendees) && !Number.isNaN(Date.parse(m.start)) && !Number.isNaN(Date.parse(m.end));
  return { meetings: c.meetings.filter(ok).slice(0, 200), keys: c.keys && typeof c.keys === 'object' && !Array.isArray(c.keys) ? c.keys : {} };
}

/** Who may propose and record a meeting: whoever V2.5.3 lets compose a message (everyone but the Visitor and the Document Reviewer). */
export const maySchedule = (role: RoleKey): boolean => allows({ action: 'comms.compose' }, role);
/**
 * Who may see a person's address and number. A site champion is the published local contact of a site, so every signed-in role sees
 * a champion's; anyone else's follow V2.5.3's `person.contact`. The Visitor sees no contact details at all.
 */
export const maySeeContact = (role: RoleKey, p: Person): boolean => (p.kind === 'champion' || p.kind === 'backup' ? role !== 'visitor' && role !== 'qa' : allows({ field: 'person.contact' }, role));

const roomBusy = (w: S.Workspace) => (roomId: string): Busy[] => (w.bookings[roomId] || []).map((b) => ({ from: new Date(`${b.from.slice(0, 16)}:00Z`).toISOString(), to: new Date(`${b.to.slice(0, 16)}:00Z`).toISOString(), what: b.title }));
/** The calendar the demonstration reads: simulated, and it says so on every answer. */
export const adapterFor = (w: S.Workspace): CalendarAdapter => simulatedAdapter(directory(w), roomBusy(w), connectView(w).meetings);
export const proposeFor = (w: S.Workspace, ask: Ask): Proposed => propose(adapterFor(w), ask);

export interface Confirmation { /** made once when the review opens; sent again unchanged on every retry */ key: string; subject: string; attendeeIds: readonly string[]; roomId: string | null; start: string; end: string; note: string }
export function confirmProblems(c: Confirmation, w: S.Workspace): string[] {
  const why: string[] = [];
  if (!/^[A-Za-z0-9-]{8,64}$/.test(c.key)) why.push('The confirmation has no valid key.');
  if (c.subject.trim().length < 3) why.push('Say what the meeting is about.'); if (c.subject.length > 120) why.push('Keep the subject under 120 characters.');
  if (!c.attendeeIds.length || c.attendeeIds.length > 12) why.push('Choose between one and twelve people.');
  if (c.attendeeIds.some((id) => !personById(id, w))) why.push('One of the people is not in the directory.');
  if (new Set(c.attendeeIds).size !== c.attendeeIds.length) why.push('A person is listed twice.');
  const s = Date.parse(c.start); const e = Date.parse(c.end);
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) why.push('The time is not valid.'); else if ((e - s) / 60000 < 15 || (e - s) / 60000 > 240) why.push('A meeting here is between 15 minutes and four hours.');
  if (c.roomId && !roomById(c.roomId)) why.push('That room is not on record.');
  if (c.note.length > 600) why.push('Keep the note under 600 characters.');
  return why;
}

/** Record the meeting. Returns it, or why not; a refusal changes nothing except the ledger line that says it was refused. */
export function confirm(w: S.Workspace, role: RoleKey, c: Confirmation, now: Date = new Date()): Refusal | (Meeting & { repeated?: boolean }) {
  const persona = personaOf(role);
  if (!maySchedule(role)) return deny(w, persona, 'meeting.recorded', c.roomId || 'meeting', [`The ${ROLES[role].label} does not schedule meetings here.`]);
  const errs = confirmProblems(c, w); if (errs.length) return { why: errs };
  const state = cn(w); const had = state.keys[c.key];
  if (had) { const m = state.meetings.find((x) => x.id === had); if (m) return { ...m, repeated: true }; }   // the same confirmation again: the same meeting, nothing new
  if (Date.parse(c.start) <= now.getTime()) return { why: ['That time has passed. Ask for times again.'] };
  const attendees = c.attendeeIds.map((id) => personById(id, w)!); const a = adapterFor(w);
  const conflicts = conflictsAt(a, { attendees, roomId: c.roomId }, c.start, c.end);   // read again, now: what was free when it was proposed may not be
  if (conflicts.length) return deny(w, persona, 'meeting.recorded', c.roomId || 'meeting', [`That time is no longer free. ${conflicts.join('. ')}.`, 'Nothing was recorded. Ask for times again.']);
  const made = a.createEvent({ transactionId: c.key, subject: c.subject.trim(), body: c.note.trim(), start: c.start, end: c.end, attendees: attendees.map((p) => p.upn), room: c.roomId, online: true });
  if (!made.ok) return deny(w, persona, 'meeting.recorded', c.roomId || 'meeting', [made.message, 'Nothing was recorded.']);
  const id = `MTG-${String(state.meetings.length + 1).padStart(4, '0')}`;
  const m: Meeting = { id, key: c.key, subject: c.subject.trim(), start: c.start, end: c.end, attendees: [...c.attendeeIds], roomId: c.roomId, by: ROLES[role].label, at: now.toISOString(), state: 'RECORDED', eventId: made.eventId };
  state.meetings.push(m); state.keys[c.key] = id;
  if (c.roomId) (w.bookings[c.roomId] ||= []).push({ from: c.start.slice(0, 16), to: c.end.slice(0, 16), title: m.subject });
  const room = c.roomId ? roomById(c.roomId) : null;
  log(w, persona, 'meeting.recorded', id, `${m.subject} · ${attendees.map((p) => p.name).join(', ')}${room ? ` · ${shortName(room)}` : ''} · recorded in the simulated calendar after confirmation; no invitation left this browser`);
  return m;
}

export function cancel(w: S.Workspace, role: RoleKey, meetingId: string): Refusal | { ok: true } {
  const persona = personaOf(role); const state = cn(w); const m = state.meetings.find((x) => x.id === meetingId);
  if (!maySchedule(role)) return deny(w, persona, 'meeting.cancelled', meetingId, [`The ${ROLES[role].label} does not cancel meetings here.`]);
  if (!m) return { why: ['No such meeting.'] }; if (m.state === 'CANCELLED') return { why: [`${m.id} is already cancelled.`] };
  if (m.by !== ROLES[role].label && role !== 'architect') return deny(w, persona, 'meeting.cancelled', m.id, [`${m.id} was recorded by the ${m.by}. The person who recorded it cancels it.`]);
  m.state = 'CANCELLED';
  if (m.roomId && w.bookings[m.roomId]) w.bookings[m.roomId] = w.bookings[m.roomId]!.filter((b) => !(b.from === m.start.slice(0, 16) && b.to === m.end.slice(0, 16) && b.title === m.subject));
  log(w, persona, 'meeting.cancelled', m.id, `${m.subject} cancelled in the simulated calendar; the room and the people are free again`);
  return { ok: true };
}

/** An application was opened for a person. That is all that is known, and all that is written: nothing was sent, called or booked. */
export function opened(w: S.Workspace, role: RoleKey, app: AppId, personId: string, about: string): Refusal | { ok: true } {
  const p = personById(personId, w); const persona = personaOf(role); if (!p) return { why: ['No such person.'] };
  if (!maySeeContact(role, p)) return deny(w, persona, 'contact.opened', personId, [`The ${ROLES[role].label} is not shown this person’s contact details.`]);
  const a = APPS[app]; if (!a || a.status === 'unverified') return { why: ['That link is not offered.'] };
  log(w, persona, 'contact.opened', personId, `${a.label}: ${a.app} opened for ${p.name}${about ? ` about ${about.slice(0, 80)}` : ''} (opened only; nothing was sent by Empathia)`);
  return { ok: true };
}
