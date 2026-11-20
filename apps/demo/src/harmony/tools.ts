/**
 * Harmony's tool registry (founder's directive of 11 Nov 2026: "A user asking Harmony to do something does not grant Harmony permission
 * to do it"; Harmony is never described as professionally certified).
 *
 * Harmony is the one place a person can ask across the products. It does three things and no more:
 *   1. understands the sentence as one registered tool and the room it names;
 *   2. asks the SAME authority the product itself asks (the registry's page authority, and Connect's own rules for names and
 *      scheduling) for the role of the person asking. A role that may not is refused in words; nothing is looked up;
 *   3. answers from the record, each fact with where it came from, or PREPARES a step: a link to the product's own page at its own
 *      review or entry step. Harmony changes nothing itself. Booking, reporting, operating a room, accepting a dossier all still
 *      need the person, on that page, under that page's checks.
 *
 * In this demonstration there is no language model: a sentence is matched to a tool by rule, and what has no tool is answered from
 * the Knowledge Ledger (an approved source, cited) or not at all. Every function here is pure; the page writes the ledger line.
 */
import { whatIsMissing } from '@empathia/proof-registry';
import type { RoleKey } from '../registry.types.js';
import { ROLES, canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { fullName, shortName, type RoomOutline } from '../campus/canon.js';
import { roomRecord } from '../campus/design.js';
import type { Workspace } from '../workspace/store.js';
import { match as coreMatch, roomIn } from '../parity/Ask.js';
import { whoKnows } from '../connect/directory.js';
import { mayKnowWho, maySchedule, maySeeDetails } from '../connect/access.js';
import { holderIn, meetHref } from '../connect/ask.js';
import { DURATIONS } from '../connect/calendar.js';
import { proposeFor, type MeetInput } from '../connect/store.js';
import { fmtRange, zoneCity } from '../connect/time.js';
import { roomGuide } from '../guides/roomGuide.js';
import { TRACKED_REPORT, TRACKED_ROOM } from '../docs5/model.js';
import { readDocs } from '../docs5/store.js';
import { loadEvents as dossierEvents, withDocuments } from '../proof/store.js';
import { DOSSIER_4218, replay } from '@empathia/proof-registry';
import { ABSTAIN, answerFor, readerFor } from '../knowledge/ledger.js';
import { CHAMPION_SITES } from '../access/policy.js';
import { roomById, roomsIn } from '../campus/canon.js';
import { championView } from '../champion/store.js';
import { startView } from '../champion/start.js';
import { allObjects, loadState as knowledgeState } from '../knowledge/store.js';

export type ToolId = 'who' | 'meet' | 'guide' | 'docs' | 'accept' | 'report' | 'operate' | 'start' | 'core' | 'knowledge';
export type Status = 'answered' | 'prepared' | 'refused' | 'needs-room' | 'abstained';
export interface Fact { text: string; /** the record or engine it was read from */ source: string; href?: string }
export interface Next { label: string; href: string; primary?: boolean }
export interface Reply {
  asked: string; tool: ToolId | null; status: Status; /** what Harmony took the sentence to mean */ understood: string; said: string; facts: Fact[]; next: Next[];
  /** the authority the tool stands on, and whether this role holds it */ authority: { stands: string; held: boolean } | null;
  /** always 'nothing': Harmony reads and prepares; the type says so on purpose */ changed: 'nothing';
}
export interface Ctx { role: RoleKey; text: string; room: RoomOutline | null; now: number; w: Workspace | null }
interface Tool {
  id: ToolId; title: string; /** what it does, as the person would say it */ does: string; kind: 'answers' | 'prepares'; needsRoom: boolean; words: RegExp;
  /** the product page whose authority the tool stands on */ stands: (room: RoomOutline | null) => string; standsOn: string;
  example: (room: RoomOutline) => string; run: (c: Ctx) => Pick<Reply, 'status' | 'said' | 'facts' | 'next'>;
}
const opens = (role: RoleKey, href: string): boolean => { const x = resolve(href.replace(/^#/, '').split('?')[0]!); return !!x && canOpen(role, x); };
const label = (r: RoleKey) => ROLES[r].label;
const done = (said: string, facts: Fact[] = [], next: Next[] = []) => ({ status: 'answered' as const, said, facts, next });
const prepared = (said: string, facts: Fact[], next: Next[]) => ({ status: 'prepared' as const, said, facts, next });
const refused = (said: string, next: Next[] = []) => ({ status: 'refused' as const, said, facts: [], next });
export const NOTHING_DONE = 'Harmony changed nothing.';

export const TOOLS: readonly Tool[] = [
  { id: 'meet', title: 'Find a time to meet', does: 'find a time that suits you, a named role and the room, and take you to review it', kind: 'prepares', needsRoom: true, standsOn: 'Schedule a meeting', stands: () => '#/meet',
    words: /\b(book|schedule|arrange|set up|meet)\b.*\bwith\b/, example: (r) => `Book 30 minutes with the systems engineer about ${shortName(r)}`,
    run: ({ role, text, room, now }) => {
      const o = room!; const t = text.toLowerCase();
      if (!maySchedule(role)) return refused(`The ${label(role)} does not schedule meetings here, so no calendar was read. Asking Harmony does not change who may book.`);
      const who = holderIn(text, o.building);
      if (!who || !who.person) return { status: 'abstained', said: `That names no role the directory holds for ${shortName(o)}. Try “the systems engineer”, “the service manager”, “the technician” or “the site champion”.`, facts: [], next: [{ label: 'Who looks after this room', href: `#/people?about=room:${o.id}` }] };
      if (!maySeeDetails(role, who.person)) return refused(`The ${label(role)} is not shown a ${who.person.title.toLowerCase()}’s calendar, so none was read. Asking Harmony does not change that. The site champion for the building can help.`, [{ label: 'Who to contact about this room', href: `#/people?about=room:${o.id}` }]);
      const minutes = (DURATIONS as readonly number[]).find((d) => new RegExp(`\\b${d} ?min`).test(t)) || (/\b(an|one|1) hour\b/.test(t) ? 60 : 30);
      const input: MeetInput = { withIds: [who.person.id], optionalIds: [], roomId: o.id, minutes, fromDay: null, subject: '', about: { kind: 'room', id: o.id } };
      const plan = proposeFor(role, input, now);
      if ('why' in plan) return refused(plan.why.join(' '));
      const s = plan.proposal.slots[0];
      if (!s) return prepared(`${who.person.name} is the ${who.words} for ${shortName(o)}, but no ${minutes}-minute time in the next week suits you both with the room free. ${plan.proposal.none?.lines[0] || ''} Nothing is booked.`.replace(/\s+/g, ' ').trim(), [], [{ label: 'See what would work', href: meetHref(input, 'when') }]);
      return prepared(`${who.person.name} is the ${who.words} for ${shortName(o)}. The first time that suits you both, with the room free, is ${fmtRange(plan.organiser.tz, s.from, s.to)} (${zoneCity(plan.organiser.tz)} time). Nothing is booked: you review it and confirm it yourself, and the calendar is read again when you do.`,
        [{ text: s.reason, source: 'Simulated calendar: working hours, shifts and the room’s bookings' }], [{ label: 'Review this time', href: meetHref(input, 'review', s.from), primary: true }, { label: 'See other times', href: meetHref(input, 'when') }]);
    } },
  { id: 'who', title: 'Who knows this room', does: 'say who to contact about a room, in the order to try them', kind: 'answers', needsRoom: true, standsOn: 'People', stands: () => '#/people',
    words: /\bwho\b.*\b(knows?|contact|ask|call|talk to|reach|responsible|looks? after|owns?)\b|\bsite champion\b/, example: (r) => `Who do I contact about ${shortName(r)}?`,
    run: ({ role, room, now, w }) => {
      const o = room!;
      if (!mayKnowWho(role)) return refused(`The ${label(role)} is not shown who to contact here. Asking Harmony does not change that; your host or the front desk can reach the site’s champion.`);
      const list = whoKnows(o.id, now, w).slice(0, 3); const name = (p: (typeof list)[number]['person']) => (maySeeDetails(role, p) ? p.name : `the ${p.title.toLowerCase()}`);
      if (!list.length) return { status: 'abstained', said: `Nobody is on record for ${shortName(o)}.`, facts: [], next: [] };
      return done(`For ${shortName(o)}, start with ${name(list[0]!.person)}.`, list.map((c) => ({ text: `${maySeeDetails(role, c.person) ? `${c.person.name}: ${c.reason.charAt(0).toLowerCase()}${c.reason.slice(1)}` : c.reason}. ${c.availability.words}.`, source: 'Connect directory (synthetic people)' })),
        [{ label: 'See them, with the ways to reach each', href: `#/people?about=room:${o.id}`, primary: true }]);
    } },
  { id: 'accept', title: 'What stops a room being accepted', does: 'list what still stops the commissioning dossier’s acceptance', kind: 'answers', needsRoom: false, standsOn: 'Commissioning dossier', stands: () => `#/dossier/${TRACKED_REPORT}`,
    words: /\b(accept(ed|ance)?|sign.?off|countersign|hand(ed)? over|handover)\b|\bwhat (stops|blocks|is blocking|is holding)\b/, example: () => 'What stops Atlas 4.218 being accepted?',
    run: () => {
      const SHOWN = 10;   // every item when there are ten or fewer; the sentence says so when there are more
      const ev = dossierEvents(); const w = replay(DOSSIER_4218, ev, new Date().toISOString(), withDocuments(ev)); const n = w.blockers.length;
      const state = w.acceptance === 'ACCEPTED' ? `${DOSSIER_4218.room.name} is accepted.` : n ? `${DOSSIER_4218.room.name} cannot be accepted yet: ${n} open ${n === 1 ? 'item stops' : 'items stop'} it${n > SHOWN ? `; the first ${SHOWN} are listed here and the dossier has them all` : ''}.` : `Nothing stops ${DOSSIER_4218.room.name} now. It waits for ${w.firstApproval ? 'the second approval' : 'the first approval'}.`;
      return done(`${state} Harmony cannot accept, verify or waive anything: those are decisions for named roles on the dossier.`,
        w.blockers.slice(0, SHOWN).map((b) => ({ text: `${b.test ? `${b.test} ` : ''}${b.reason}`, source: b.test ? 'Commissioning dossier: test record' : 'Phase 5: required document', href: b.test ? `#/dossier/${TRACKED_REPORT}?focus=${b.test}` : `#/docs/${TRACKED_REPORT}` })),
        [{ label: 'Open the dossier', href: `#/dossier/${TRACKED_REPORT}`, primary: true }]);
    } },
  { id: 'start', title: 'What is left on a champion’s list', does: 'say what is done and what is left of a Site Champion’s getting-started list', kind: 'answers', needsRoom: false, standsOn: 'Getting started', stands: () => '#/site/start',
    words: /\b(getting[- ]started|onboarding|my (list|training|lessons?)|champion.?s? (list|training|check))\b/, example: () => 'What is left on my getting-started list?',
    run: ({ role, w }) => {
      if (!w) return { status: 'abstained', said: 'The record could not be read.', facts: [], next: [] };
      const site = CHAMPION_SITES[0]!; const docsHref = `#/docs/${TRACKED_REPORT}`; const mayDocs = opens(role, docsHref);
      const waiting = mayDocs && roomById(TRACKED_ROOM)?.building === site ? (readDocs()?.docs ?? []).filter((d) => d.acknowledgements.outstanding.some((a) => a.role === role)).length : mayDocs ? 0 : null;
      const v = startView(championView(w), roomsIn(site).length, waiting, { site: '#/site', docs: mayDocs ? docsHref : null, profile: null }); const left = v.steps.filter((x) => !x.done);
      return done(v.complete ? 'Everything on your list is done. It is a list, not a qualification, and it gives no new permission.' : `${v.done} of ${v.total} done. ${left.length === 1 ? 'One is' : `${left.length} are`} left. It is a list, not a qualification.`,
        left.map((x) => ({ text: `${x.title}: ${x.evidence.charAt(0).toLowerCase()}${x.evidence.slice(1)}`, source: x.by === 'record' ? 'Your list, from the record' : 'Your list, your own word', ...(x.href && x.href.startsWith('#/') ? { href: x.href } : {}) })),
        [{ label: 'Open your list', href: '#/site/start', primary: true }]);
    } },
  { id: 'docs', title: 'What documentation is missing', does: 'say which required documents are not complete, and what would correct each', kind: 'answers', needsRoom: false, standsOn: 'Documentation', stands: () => `#/docs/${TRACKED_REPORT}`,
    words: /\b(documents?|documentation|deliverables?|paperwork|as.?builts?|drawings?)\b.*\b(missing|outstanding|open|needed|late|overdue|incomplete|left)\b|\b(missing|outstanding|overdue|incomplete)\b.*\b(documents?|documentation|deliverables?|paperwork)\b/,
    example: () => 'Which documents are missing for Atlas 4.218?',
    run: ({ role, room }) => {
      if (role === 'sitechamp') return refused('The Site Champion is shown the documents they acknowledge, not the engineering record. Asking Harmony does not change that.', [{ label: 'What you are asked to read', href: `#/docs/${TRACKED_REPORT}` }]);
      if (room && room.id !== TRACKED_ROOM) return { status: 'abstained', said: `Only the room of the commissioning dossier (${DOSSIER_4218.room.name}) has its documentation tracked in this demonstration. What ${shortName(room)} would be asked for is on the applicability page.`, facts: [], next: [{ label: 'What applies to which room', href: '#/docs/applies' }] };
      const w = readDocs(); if (!w) return { status: 'abstained', said: 'The room’s record could not be read.', facts: [], next: [] };
      const lines = whatIsMissing(w).filter((l) => l.finding.kind !== 'overdue').slice(0, 5);
      return done(`${w.met} of ${w.required} required documents are complete for ${DOSSIER_4218.room.name}.${w.blockers.length ? ` ${w.blockers.length} ${w.blockers.length === 1 ? 'stops' : 'stop'} acceptance.` : ''}`,
        lines.map((l) => ({ text: l.text, source: `Phase 5 finding (${l.finding.kind.replace(/_/g, ' ')})`, href: `#/docs/${TRACKED_REPORT}/${l.doc}` })), [{ label: 'Open the documentation', href: `#/docs/${TRACKED_REPORT}`, primary: true }]);
    } },
  { id: 'report', title: 'Report a problem in a room', does: 'take you to say what is wrong in a room', kind: 'prepares', needsRoom: true, standsOn: 'In this room', stands: (r) => `#/here/${r ? r.id : TRACKED_ROOM}`,
    words: /\b(report|problem|broken|fault|not working|isn.?t working|doesn.?t work|won.?t (start|connect|share)|no (sound|picture|audio|video|image))\b/, example: (r) => `The screen in ${shortName(r)} is not working`,
    run: ({ room }) => prepared(`Nothing has been reported. This opens “In this room” for ${shortName(room!)} at the step where you say what is wrong; it asks a few questions first, because some problems are fixed in a minute.`, [], [{ label: `Say what is wrong in ${shortName(room!)}`, href: `#/here/${room!.id}?step=wrong`, primary: true }]) },
  { id: 'operate', title: 'Operate a room', does: 'take you to the room’s own panel', kind: 'prepares', needsRoom: true, standsOn: 'Room Control', stands: (r) => `#/control/${r ? r.id : TRACKED_ROOM}`,
    words: /\b(turn (on|off|up|down)|switch (on|off)|mute|unmute|captions?|subtitles?|volume|louder|quieter|start the meeting|end the meeting)\b/, example: (r) => `Turn on captions in ${shortName(r)}`,
    run: ({ room }) => prepared(`Harmony does not operate rooms. This opens the panel of ${shortName(room!)}, where you make the change yourself. In this demonstration the panel is simulated: nothing in a real room changes.`, [], [{ label: `Open the panel of ${shortName(room!)}`, href: `#/control/${room!.id}`, primary: true }]) },
  { id: 'guide', title: 'How to use a room', does: 'say how a room is used, from its own guide', kind: 'answers', needsRoom: true, standsOn: 'Room guide', stands: () => '#/guide',
    words: /\bhow (do|can|should|would) (i|we|you)\b|\bhow to\b|\bguide\b|\binstructions?\b/, example: (r) => `How do I share my screen in ${shortName(r)}?`,
    run: ({ room, text }) => {
      const r = roomRecord(room!.id); if (!r) return { status: 'abstained', said: `There is no record of ${shortName(room!)}.`, facts: [], next: [] };
      const g = roomGuide(r); const t = text.toLowerCase();
      const want = g.sections.find((s) => (s.id === 'share' && /\b(share|present|screen|laptop|hdmi|wireless)\b/.test(t)) || (s.id === 'sound' && /\b(sound|hear|microphone|mic|volume|audio)\b/.test(t)) || (s.id === 'camera' && /\bcamera|video\b/.test(t)) || (s.id === 'end' && /\b(end|finish|leave)\b/.test(t)) || (s.id === 'start' && /\b(start|join|begin|meeting)\b/.test(t)));
      const secs = want ? [want] : g.sections.slice(0, 3);
      return done(want ? `${want.title} in ${shortName(room!)}: ${want.lead}` : g.summary, secs.flatMap((s) => s.steps.slice(0, want ? 6 : 1).map((x) => ({ text: want ? x.do : `${s.title}: ${x.do}`, source: `Room guide ${g.id}, ${g.revision}, not yet reviewed by a person` }))),
        [{ label: `Open the guide to ${shortName(room!)}`, href: `#/guide/room/${room!.id}`, primary: true }]);
    } },
];
export const toolById = (id: ToolId) => TOOLS.find((t) => t.id === id);

/** Which tools this role may use, and which it may not, with the page each stands on. For the page's "what Harmony can do for you". */
export function toolsFor(role: RoleKey): Array<{ id: ToolId; title: string; does: string; kind: Tool['kind']; standsOn: string; held: boolean }> {
  return TOOLS.map((t) => ({ id: t.id, title: t.title, does: t.does, kind: t.kind, standsOn: t.standsOn, held: opens(role, t.stands(null)) && (t.id !== 'who' || mayKnowWho(role)) && (t.id !== 'meet' || maySchedule(role)) && (t.id !== 'docs' || role !== 'sitechamp') }));
}
export function examplesFor(role: RoleKey, room: RoomOutline): string[] { const held = new Set(toolsFor(role).filter((t) => t.held).map((t) => t.id)); return TOOLS.filter((t) => held.has(t.id)).map((t) => t.example(room)); }

const clean = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 300);
/**
 * Ask Harmony. Pure: reads the records and the stored state, changes nothing, and returns everything the page shows.
 * Order: a registered tool whose words match; then Core's prepared questions (Ask Empathia); then the Knowledge Ledger; else nothing.
 */
export function ask(text: string, role: RoleKey, now: number, w: Workspace | null): Reply {
  // Whatever a tool returns, Harmony never points a role at a page that role cannot open: a link or a fact's address the role may not
  // follow is dropped here, in one place, so no tool can forget.
  const r = answer(text, role, now, w);
  return { ...r, next: r.next.filter((n) => opens(role, n.href)), facts: r.facts.map((f) => (f.href && !opens(role, f.href) ? { text: f.text, source: f.source } : f)) };
}
function answer(text: string, role: RoleKey, now: number, w: Workspace | null): Reply {
  const asked = clean(text); const base = { asked, changed: 'nothing' as const };
  if (asked.length < 3) return { ...base, tool: null, status: 'abstained', understood: 'Nothing was asked.', said: 'Ask a question, or ask for something to be prepared.', facts: [], next: [], authority: null };
  const t = asked.toLowerCase(); const room = roomIn(t);
  const tool = TOOLS.find((x) => x.words.test(t));
  if (tool) {
    const understood = `${tool.title}${room ? `: ${fullName(room)}` : ''}`;
    if (tool.needsRoom && !room) return { ...base, tool: tool.id, status: 'needs-room', understood: tool.title, said: 'Which room? Name it by its number, for example “Atlas 4.218”.', facts: [], next: [], authority: null };
    const stands = tool.stands(room); const held = opens(role, stands);
    if (!held) return { ...base, tool: tool.id, status: 'refused', understood, said: `The ${label(role)} does not have “${tool.standsOn}”, which this stands on, so nothing was looked up. Asking Harmony does not change what a role may do.`, facts: [], next: [], authority: { stands: tool.standsOn, held: false } };
    const r = tool.run({ role, text: asked, room, now, w });
    return { ...base, tool: tool.id, understood, ...r, authority: { stands: tool.standsOn, held: r.status !== 'refused' } };
  }
  const core = opens(role, '#/ask') ? coreMatch(asked, role) : null;
  if (core) return { ...base, tool: 'core', status: 'prepared', understood: `A prepared question about the records: “${core.q.text}”`, said: 'Ask Empathia answers this from Core, with the records it stands on.', facts: [], next: [{ label: 'See the answer and its records', href: `#/ask?q=${encodeURIComponent(asked)}`, primary: true }], authority: { stands: 'Ask Empathia', held: true } };
  if (opens(role, '#/knowledge')) {
    const a = answerFor(allObjects(knowledgeState(), w), readerFor(role), asked);
    if (a.kind === 'answer') return { ...base, tool: 'knowledge', status: 'answered', understood: 'A question for the Knowledge Ledger', said: `From “${a.hit.title}”, an approved source you may read: ${a.lead}`, facts: [{ text: a.hit.citation, source: `Knowledge Ledger: ${a.hit.label}`, href: a.hit.href }], next: [{ label: a.hit.title, href: a.hit.href, primary: true }], authority: { stands: 'Knowledge Ledger', held: true } };
    if (a.kind === 'unapproved') return { ...base, tool: 'knowledge', status: 'abstained', understood: 'A question for the Knowledge Ledger', said: `${ABSTAIN} There is a source you may read that is not approved (${a.hit.label}); it is not given as fact.`, facts: [], next: [{ label: `${a.hit.title} (${a.hit.label})`, href: a.hit.href }], authority: { stands: 'Knowledge Ledger', held: true } };
  }
  return { ...base, tool: null, status: 'abstained', understood: 'Nothing Harmony has a tool for.', said: `${ABSTAIN} Harmony answers from the records and prepares steps in the products; it does not guess.`, facts: [], next: [], authority: null };
}
