/**
 * Connect in Ask Empathia (parity/Ask.tsx hosts these two prepared questions): "who do I contact about <room>?" and
 * "book 30 minutes with the systems engineer about <room>". Both are answered from the directory and the scheduler.
 * Asking never books: the booking question ends with a link to the review step of #/meet, where the same authority check and the
 * same explicit confirmation apply as for anyone who arrives there by hand. A role that may not schedule, or may not see that
 * person's calendar, is told so and nothing is looked up.
 */
import type { ReactNode } from 'react';
import type { RoleKey } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import { REFERENCE_ROOM_ID, roomById, shortName, type RoomOutline } from '../campus/canon.js';
import type { Core, Rec } from '../parity/core.js';
import { DURATIONS } from './calendar.js';
import { holdersOf, championOf, backupOf, operationalRoles, whoKnows, type Person } from './directory.js';
import { mayKnowWho, maySchedule, maySeeDetails } from './access.js';
import { proposeFor, type MeetInput } from './store.js';
import { fmtRange, zoneCity } from './time.js';

interface AskAnswer { lead: ReactNode; cites: Rec[]; more?: Array<[string, string]> }
export interface ConnectQuestion { id: string; group: 'The workplace'; text: string; words: RegExp; needsRoom?: boolean; answer: (c: Core, room: RoomOutline | null, role: RoleKey, asked?: string) => AskAnswer }
const REF = roomById(REFERENCE_ROOM_ID)!;
const roomRecs = (c: Core, o: RoomOutline) => c.byType.Room.filter((x) => x.id === o.id);
/** The role a sentence names: its label ("systems engineer"), the word "technician", or the site champion. */
export function holderIn(text: string, buildingKey: string): { person: Person | null; words: string } | null {
  const t = text.toLowerCase();
  if (/\bbackup\b/.test(t)) return { person: backupOf(buildingKey), words: 'backup site champion' };
  if (/\bchampion\b/.test(t)) return { person: championOf(buildingKey), words: 'site champion' };
  for (const r of operationalRoles()) { const label = ROLES[r].label.toLowerCase(); if (t.includes(label) || (r === 'service' && /\btechnician\b/.test(t))) return { person: holdersOf(r, buildingKey)[0] || null, words: label }; }
  return null;
}
export const meetHref = (i: MeetInput, step: 'when' | 'review', slot?: number) => { const q = new URLSearchParams({ with: i.withIds.join(',') }); if (i.roomId) q.set('room', i.roomId); if (i.about) q.set('about', `${i.about.kind}:${i.about.id}`); if (i.minutes !== 30) q.set('min', String(i.minutes)); q.set('step', step); if (slot) q.set('slot', String(slot)); return `#/meet?${q}`; };

export const CONNECT_QUESTIONS: ConnectQuestion[] = [
  { id: 'contact', group: 'The workplace', text: `Who do I contact about ${shortName(REF)}?`, words: /\bwho\b.*\b(contact|ask|call|talk to|reach|knows?)\b|\bsite champion\b/, needsRoom: true,
    answer: (c, o, role) => {
      if (!mayKnowWho(role)) return { lead: <>The {ROLES[role].label} is not shown who to contact here.</>, cites: [] };
      const list = whoKnows(o!.id, Date.now(), null); const first = list[0]; const tech = list.find((x) => x.relation === 'technician');
      const name = (p: Person) => (maySeeDetails(role, p) ? p.name : `the ${p.title.toLowerCase()}`);
      return { lead: first ? <>For {shortName(o!)}, start with <b>{name(first.person)}</b>: {first.reason.charAt(0).toLowerCase()}{first.reason.slice(1)}. {first.promoted ? `${first.promoted}. ` : ''}{list[1] && list[1].relation !== 'technician' ? <>If they cannot be reached, {name(list[1].person)} ({list[1].relation === 'backup' ? 'the backup' : 'the site champion'}). </> : null}{tech ? <>For a fault, {name(tech.person)}: {tech.reason.charAt(0).toLowerCase()}{tech.reason.slice(1)}. </> : null}Everyone named is synthetic.</> : <>Nobody is listed for {shortName(o!)}.</>,
        cites: roomRecs(c, o!), more: [['See them, with the ways to contact each', `#/people?about=room:${o!.id}`]] };
    } },
  { id: 'meet', group: 'The workplace', text: 'Book 30 minutes with the systems engineer.', words: /\b(book|schedule|arrange|set up)\b.*\bwith\b/, needsRoom: true,
    answer: (c, o, role, asked = '') => {
      const text = asked || `book 30 minutes with the systems engineer about ${shortName(REF)}`; const room = o!; const who = holderIn(text, room.building);
      const minutes = (DURATIONS as readonly number[]).find((d) => new RegExp(`\\b${d} ?min`).test(text.toLowerCase())) || (/\b(an|one|1) hour\b/.test(text.toLowerCase()) ? 60 : 30);
      const cites = roomRecs(c, room);
      if (!maySchedule(role)) return { lead: <>The {ROLES[role].label} does not schedule meetings here, so nothing was looked up. Asking does not change who may book.</>, cites };
      if (!who || !who.person) return { lead: <>That names no role this directory can find for {shortName(room)}. Try “the systems engineer”, “the service manager”, “the technician” or “the site champion”.</>, cites, more: [['Who looks after this room', `#/people?about=room:${room.id}`]] };
      if (!maySeeDetails(role, who.person)) return { lead: <>The {ROLES[role].label} may not schedule with a {who.person.title.toLowerCase()}: their calendar is not shown to this role. Asking does not change that. The site champion for the building can help.</>, cites, more: [['Who to contact about this room', `#/people?about=room:${room.id}`]] };
      const input: MeetInput = { withIds: [who.person.id], optionalIds: [], roomId: room.id, minutes, fromDay: null, subject: '', about: { kind: 'room', id: room.id } };
      const plan = proposeFor(role, input, Date.now());
      if ('why' in plan) return { lead: <>{plan.why.join(' ')}</>, cites };
      const s = plan.proposal.slots[0];
      return s
        ? { lead: <><b>{who.person.name}</b> is the {who.words} for {shortName(room)}. The first time that suits you both, with the room free, is <b>{fmtRange(plan.organiser.tz, s.from, s.to)}</b> ({zoneCity(plan.organiser.tz)} time): {s.reason}. <b>Nothing is booked.</b> Review it and confirm it yourself; the calendar is read again when you do. Simulated calendar, synthetic people.</>, cites, more: [['Review this meeting', meetHref(input, 'review', s.from)], ['See the other times', meetHref(input, 'when')]] }
        : { lead: <><b>{who.person.name}</b> is the {who.words} for {shortName(room)}, but no {minutes}-minute time in the next week suits you both with the room free. {plan.proposal.none?.lines[0] || ''} Nothing is booked.</>, cites, more: [['See what would work', meetHref(input, 'when')]] };
    } },
];

