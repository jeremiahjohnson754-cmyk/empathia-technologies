/**
 * A Site Champion's first weeks, tracked (founder, 11 Nov 2026: the Site Champion is "a distinct governed role with its own … profile,
 * onboarding, training"). The directory already lists places to visit (connect/directory.ts › ONBOARDING, not tracked). This is the
 * champion's own list: six short lessons, a check of understanding, and four things the record can see for itself.
 *
 * Honest limits, said on the page: the lessons were written by the engineer of this demonstration and have not been reviewed by a
 * practising AV engineer; the check is a count of right answers, not a qualification; nothing here grants a permission.
 * Nothing in a lesson tells anyone to open equipment, touch power, climb, or get past anything locked: each says to step back and report.
 */
import type { ChampionState } from './store.js';

export interface Lesson { id: string; title: string; points: readonly string[] }
export const LESSONS: readonly Lesson[] = [
  { id: 'role', title: 'What a champion is for', points: [
    'You are the person people on site turn to first. You connect them to support; you are not the support.',
    'You report problems, confirm that a visitor can get into a room, check a room against its record, say what you saw at the door, and add what you know.',
    'You do not change equipment settings, run or verify tests, approve commissioning, assign work or administer anything. Those stay with the roles that answer for them, whatever anyone asks you.',
  ] },
  { id: 'report', title: 'Reporting a problem well', points: [
    'Report from the room: scan its door label, or open “In this room”. The report then carries the right room without you typing it.',
    'Say what you see and hear, not what you think is broken: “the display is black and the panel shows a red bar” helps more than “the display is dead”.',
    'Say whether a meeting is affected now. That decides how fast someone comes.',
    'One report for one problem. If it is already on record, add what you see to it. You get a job number, and you do not have to chase it.',
  ] },
  { id: 'access', title: 'When someone is coming to work on a room', points: [
    'Confirm access only when you know they can get in: the room is free at that time, it is unlocked or you hold the key, and an escort is arranged where your site needs one.',
    'Confirming records your word for the technician to see before they set out. It does not start the job, move it or change anything else about it.',
    'If things change after you confirmed, say so on the job, so the service manager can plan again.',
  ] },
  { id: 'check', title: 'Checking a room, and what you saw at the door', points: [
    'Stand in the room. If its name, number and floor match the door label and the record, choose “Details match”.',
    'If something does not match, say what in the note. Do not mark it as matching, and do not try to correct the record yourself: the people who own it will.',
    '“In use” and “free” mean what you saw at that moment. It is an observation by a person; it is not a booking and it is not a sensor.',
  ] },
  { id: 'note', title: 'What to write in a note', points: [
    'Write what only someone on site knows and the next person would want: “the blinds must be down after three or the camera is washed out by the sun”.',
    'A note is kept as a candidate. Someone else reviews it before it becomes part of the room’s guidance; you cannot approve your own.',
    'Never write a password, a PIN or a door code, and never write about a named person.',
    'A fault is not a note. If something is not working, report it.',
  ] },
  { id: 'safety', title: 'When to step back', points: [
    'Do not open a rack or an equipment cabinet, unplug or move anything on mains power, climb to reach a device in a ceiling, or get past anything that is locked or there for safety.',
    'If you see damage, heat, a smell of burning or exposed wiring: keep people away from it and report it as urgent. Do not investigate.',
    'A room out of use for an afternoon is an inconvenience. Nobody on site is expected to take a risk to avoid one.',
  ] },
];

export interface Question { id: string; q: string; options: readonly string[]; answer: number; why: string; /** must be right to pass, whatever the total */ required?: true }
export const CHECK: readonly Question[] = [
  { id: 'q-report', q: 'A colleague tells you the display in a room is black. What do you do first?', answer: 1, why: 'A report from the room, in plain words, is the champion’s part. The cabinet and the settings belong to the people who answer for them.',
    options: ['Open the cabinet and push the cables back in', 'Report it from the room, saying what you see', 'Change the input settings until a picture appears'] },
  { id: 'q-access', q: 'You confirmed access for a visit. An hour later the room is taken for an all-day event. What now?', answer: 2, why: 'Your confirmation is your word to the technician. When it stops being true, the job is where to say so; confirming never moved or cancelled anything by itself.',
    options: ['Nothing: the confirmation is already recorded', 'Cancel the job yourself', 'Say so on the job, so the service manager can plan again'] },
  { id: 'q-match', q: 'The door label says 4.218. The record calls the same room 4.216. What do you record?', answer: 0, why: 'A check that does not match is as useful as one that does, as long as it says what differs. The record is corrected by its owners.',
    options: ['What does not match, in the note of the check', '“Details match”: it is clearly the same room', 'Nothing, and change the door label'] },
  { id: 'q-note', q: 'Which of these belongs in a site note?', answer: 3, why: 'A note is local knowledge the next person would want. Codes and passwords never go in one, nothing is written about a named person, and a fault is reported, not noted.',
    options: ['The PIN for the room’s touch panel', '“The same person always leaves this room in a mess”', '“The display is not working today”', '“After three the sun washes out the camera unless the blinds are down”'] },
  { id: 'q-free', q: 'You record a room as “free”. What does that say?', answer: 1, why: 'It is what a person saw at one moment. It does not book the room, release a booking or stand in for a sensor.',
    options: ['The room is now booked for you', 'You saw it free at that moment', 'A sensor confirmed nobody is inside'] },
  { id: 'q-safety', q: 'There is a smell of burning near the equipment cabinet in a room. What do you do?', answer: 2, required: true, why: 'Keep people away, leave the cabinet shut, and report it as urgent. Nobody on site is expected to investigate.',
    options: ['Open the cabinet to find what is hot', 'Unplug things until the smell stops', 'Keep people away, leave it shut, and report it as urgent'] },
];
/** Five of the six, and the safety question among them. */
export const PASS_MARK = 5;
/** What a champion marks as read: each lesson, and who supports the site. */
export const READABLE: readonly string[] = [...LESSONS.map((l) => l.id), 'support'];

export interface CheckResult { score: number; of: number; passed: boolean; wrong: string[] }
/** Mark a set of answers. Anything that is not one whole-number choice per question is not an answer. */
export function mark(answers: unknown): CheckResult | null {
  if (!Array.isArray(answers) || answers.length !== CHECK.length) return null;
  if (!answers.every((a, i) => Number.isInteger(a) && (a as number) >= 0 && (a as number) < CHECK[i]!.options.length)) return null;
  const wrong = CHECK.filter((q, i) => answers[i] !== q.answer).map((q) => q.id); const score = CHECK.length - wrong.length;
  return { score, of: CHECK.length, wrong, passed: score >= PASS_MARK && !CHECK.some((q) => q.required && wrong.includes(q.id)) };
}

export type StepId = 'lessons' | 'check' | 'walk' | 'read' | 'note' | 'support';
export interface Step { id: StepId; title: string; why: string; /** who knows it is done: the record, or the champion saying they read it */ by: 'record' | 'you'; done: boolean; evidence: string; href: string | null; cta: string | null }
export interface StartView { steps: Step[]; done: number; total: number; lessonsRead: number; complete: boolean }
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * The list, from the record. `rooms` is how many rooms the site has; `waiting` is how many documents wait for the champion to read
 * and acknowledge (Phase 5), or null when the reader cannot be told.
 */
export function startView(c: ChampionState, rooms: number, waiting: number | null, links: { site: string; docs: string | null; profile: string | null }): StartView {
  const read = c.start.read; const lessonsRead = LESSONS.filter((l) => read[l.id]).length; const checked = Object.keys(c.verified).length; const k = c.start.check;
  const steps: Step[] = [
    { id: 'lessons', by: 'you', title: 'Read the six short lessons', why: 'What the role is for, and where it stops', done: lessonsRead === LESSONS.length, evidence: `${lessonsRead} of ${LESSONS.length} read`, href: '#start-lessons', cta: lessonsRead === LESSONS.length ? null : 'Go to the lessons' },
    { id: 'check', by: 'record', title: 'Answer the check', why: 'Six questions on the lessons; five right, with the safety one among them', done: !!k?.passed, evidence: k ? `${k.passed ? 'Passed' : 'Not passed yet'}: ${k.score} of ${k.of} at the last try` : 'Not taken yet', href: '#start-check', cta: k?.passed ? null : 'Go to the check' },
    { id: 'walk', by: 'record', title: 'Check a first room against its record', why: 'Know your rooms by sight before anyone asks about one', done: checked > 0, evidence: `${checked} of ${plural(rooms, 'room')} checked on site`, href: links.site, cta: checked >= rooms ? null : checked ? 'Check more rooms' : 'Go to your rooms' },
    { id: 'read', by: 'record', title: 'Read what you are asked to read', why: 'An accepted operator guide waits for the people who will be asked about it', done: waiting === 0, evidence: waiting === null ? 'Nothing can be shown to this role' : waiting ? `${plural(waiting, 'document')} waiting for you` : 'Nothing is waiting for you', href: waiting ? links.docs : null, cta: waiting ? 'Open what is waiting' : null },
    { id: 'note', by: 'record', title: 'Add a first note about a room', why: 'Something only someone on site knows, kept for review', done: c.notes.length > 0, evidence: c.notes.length ? `${plural(c.notes.length, 'note')} added, awaiting review` : 'No note yet', href: links.site, cta: c.notes.length ? null : 'Add a note on your site page' },
    { id: 'support', by: 'you', title: 'Know who supports your site, and your backup', why: 'So you can tell a colleague what happens next', done: !!read['support'], evidence: read['support'] ? 'Read' : 'Not read yet', href: '#start-support', cta: read['support'] ? null : 'Go to who supports you' },
  ];
  const done = steps.filter((s) => s.done).length;
  return { steps, done, total: steps.length, lessonsRead, complete: done === steps.length };
}
