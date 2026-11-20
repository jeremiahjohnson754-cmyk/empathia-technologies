/**
 * The IT Onboarding Success Guide (founder's directive of 11 Nov 2026, §08, Product A): "an organization-specific professional
 * onboarding and development program" in four distinct editions. This file is the programme itself: its phases, its items, the
 * knowledge checks, the rubrics and the competency expectations. It is pure and holds NO tenant detail: "No universal public version
 * should expose one company's internal systems." Everything about one organisation (who the manager is, which site, which contacts)
 * is read at the moment of viewing from that organisation's own records (profile.ts), and a field the organisation has not
 * provided is shown as not recorded, never filled in.
 *
 * DRAFT. The programme was written by the engineer of this demonstration from the founder's list of contents. It has not been
 * reviewed by a practising IT manager or AV engineer, and the pages say so. It is general practice in plain words: it names no
 * product an organisation must buy, quotes no standard, and gives no instruction that needs a qualification to follow safely.
 */
export type Phase = 'pre' | 'day1' | 'week1' | 'month1' | 'day60' | 'day90';
export const PHASES: ReadonlyArray<{ id: Phase; title: string; when: string; aim: string }> = [
  { id: 'pre', title: 'Before day one', when: 'The two weeks before the start date', aim: 'The new starter arrives to a desk, an account and a plan, not to a wait.' },
  { id: 'day1', title: 'First day', when: 'Day 1', aim: 'Signed in, safe, and clear on who to ask.' },
  { id: 'week1', title: 'First week', when: 'Days 2 to 5', aim: 'Knows the site, the support model and how a job moves.' },
  { id: 'month1', title: 'First month', when: 'Days 6 to 30', aim: 'Takes a job from assignment to restored with someone watching.' },
  { id: 'day60', title: 'By day 60', when: 'Days 31 to 60', aim: 'Handles ordinary jobs alone and keeps people told.' },
  { id: 'day90', title: 'By day 90', when: 'Days 61 to 90', aim: 'Independent in the core of the role, and able to show someone else.' },
];

/** The founder's list of contents, as topics an item belongs to. */
export const TOPICS = {
  orientation: 'Company and organisational orientation', 'support-model': 'IT support model', 'service-management': 'Help desk and service management', 'systems-tools': 'Systems and tools',
  'identity-access': 'Identity and access', network: 'Network fundamentals', security: 'Cybersecurity', avuc: 'AV and UC systems', troubleshooting: 'Technical troubleshooting', documentation: 'Documentation',
  escalation: 'Escalation', vendors: 'Vendor relationships', 'workplace-ops': 'Workplace operations', stakeholders: 'Stakeholder management', communication: 'Communication practices',
  standards: 'Engineering standards', development: 'Professional development', certification: 'Certification pathways',
} as const;
export type Topic = keyof typeof TOPICS;

export type Kind = 'learn' | 'meet' | 'do' | 'exercise' | 'review';
/** Who says an item is done. The starter never confirms what a manager or a mentor has to see for themselves. */
export type Confirm = 'self' | 'check' | 'mentor' | 'manager';
/** A place in the product an item sends the reader to. Resolved against the reader's own site and people when shown (profile.ts). */
export type Place = 'people-manager' | 'people-mentor' | 'people-champion' | 'people-site' | 'site-rooms' | 'room-guide' | 'servicehands' | 'documentation' | 'knowledge' | 'learn' | 'control';
export interface Item {
  id: string; phase: Phase; topic: Topic; kind: Kind; title: string; /** why it is in the programme, in a line */ why: string; confirm: Confirm;
  /** set when the item is a manager's or a mentor's own task rather than the starter's */ owner?: 'manager' | 'mentor';
  place?: Place; check?: string; /** what good looks like */ rubric?: readonly string[];
  /** a field of the organisation's own that this item depends on (profile.ts); when it is not recorded the item says so */ needs?: string;
}

export const ITEMS: readonly Item[] = [
  // ------------------------------------------------------------------ before day one: the manager's part
  { id: 'pre-start', phase: 'pre', topic: 'orientation', kind: 'do', owner: 'manager', confirm: 'manager', title: 'Confirm the start date, the site and the working hours', why: 'The first message a new starter gets should answer where, when and who meets them.' },
  { id: 'pre-access', phase: 'pre', topic: 'identity-access', kind: 'do', owner: 'manager', confirm: 'manager', title: 'Ask for accounts and access, and confirm they are ready', why: 'A first day spent waiting for an account teaches the wrong thing about the organisation.', needs: 'access',
    rubric: ['Each request names the person, the role and the least access that role needs', 'Ready means tested by someone, not merely approved'] },
  { id: 'pre-kit', phase: 'pre', topic: 'workplace-ops', kind: 'do', owner: 'manager', confirm: 'manager', title: 'Assign equipment and a place to work', why: 'Equipment that arrives in week two is a week of borrowing.', needs: 'equipment' },
  { id: 'pre-mentor', phase: 'pre', topic: 'stakeholders', kind: 'do', owner: 'manager', confirm: 'manager', title: 'Name a mentor and put the first-week meetings in the calendar', why: 'A mentor chosen before day one has time to prepare.', place: 'people-mentor' },
  { id: 'pre-welcome', phase: 'pre', topic: 'orientation', kind: 'learn', confirm: 'self', title: 'Read what the first week holds', why: 'Nobody should have to guess what Monday is.' },
  // ------------------------------------------------------------------ first day
  { id: 'd1-manager', phase: 'day1', topic: 'stakeholders', kind: 'meet', confirm: 'self', title: 'Meet your manager: what the first thirty days are for', why: 'Agree what “going well” means before anything is measured.', place: 'people-manager' },
  { id: 'd1-signin', phase: 'day1', topic: 'identity-access', kind: 'do', confirm: 'self', title: 'Sign in, set up your second sign-in factor, and check you can reach what you were given', why: 'Find what is missing on day one, while it is nobody’s emergency.',
    rubric: ['Signed in on the equipment assigned to you, not a borrowed session', 'Anything you cannot reach is reported the same day, with what you tried'] },
  { id: 'd1-security', phase: 'day1', topic: 'security', kind: 'learn', confirm: 'check', check: 'security', title: 'Security basics: what you never do with a credential', why: 'Support staff are asked for access every day; the habit has to be there before the first request.' },
  { id: 'd1-model', phase: 'day1', topic: 'support-model', kind: 'learn', confirm: 'self', title: 'How support works here: who reports, who triages, who visits, who decides', why: 'Most early mistakes are doing someone else’s part.', place: 'people-site' },
  { id: 'd1-mentor', phase: 'day1', topic: 'stakeholders', kind: 'meet', confirm: 'mentor', title: 'Meet your mentor', why: 'The person you ask the questions you think are too small.', place: 'people-mentor' },
  // ------------------------------------------------------------------ first week
  { id: 'w1-jobs', phase: 'week1', topic: 'service-management', kind: 'learn', confirm: 'check', check: 'service', title: 'Service management: a job from report to verified fix', why: 'Every job has a state, an owner and a record; knowing them is the job.', place: 'servicehands' },
  { id: 'w1-walk', phase: 'week1', topic: 'workplace-ops', kind: 'do', confirm: 'self', title: 'Walk your site and find every room you will look after', why: 'A room you have stood in is a room you can picture when someone calls about it.', place: 'site-rooms' },
  { id: 'w1-room', phase: 'week1', topic: 'avuc', kind: 'learn', confirm: 'check', check: 'room', title: 'How a meeting room works: display, camera, microphones, processor, control', why: 'Faults make sense once you know what each part is for.', place: 'room-guide' },
  { id: 'w1-tools', phase: 'week1', topic: 'systems-tools', kind: 'learn', confirm: 'self', title: 'The systems and tools you will use, and what each is for', why: 'One tool for the record, one for talking, one for monitoring: know which is which.', needs: 'software' },
  { id: 'w1-shadow', phase: 'week1', topic: 'troubleshooting', kind: 'exercise', owner: 'mentor', confirm: 'mentor', title: 'Shadow a visit: your mentor shows a first-response check in a room', why: 'Watch the order someone experienced works in before forming your own.',
    rubric: ['The mentor says what they are checking and why, as they go', 'The starter can repeat the order of the check afterwards'] },
  { id: 'w1-network', phase: 'week1', topic: 'network', kind: 'learn', confirm: 'check', check: 'network', title: 'Network fundamentals for rooms: addresses, switch ports, and what “offline” can mean', why: '“Offline” is a symptom with several causes, and only some are yours to fix.' },
  { id: 'w1-records', phase: 'week1', topic: 'documentation', kind: 'learn', confirm: 'self', title: 'Where things are written down: the room’s record, its guide, and its commissioning documents', why: 'The answer is often already written; know where to look first.', place: 'documentation' },
  { id: 'w1-escalate', phase: 'week1', topic: 'escalation', kind: 'learn', confirm: 'check', check: 'escalation', title: 'Escalation: when to hand on, to whom, and what to write', why: 'A good hand-on saves the next person from starting again.', place: 'people-site' },
  { id: 'w1-champion', phase: 'week1', topic: 'stakeholders', kind: 'meet', confirm: 'self', title: 'Meet the site champion of your site', why: 'They know the rooms and the people; they will be the first to tell you something is wrong.', place: 'people-champion' },
  { id: 'w1-review', phase: 'week1', topic: 'development', kind: 'review', owner: 'manager', confirm: 'manager', title: 'End of the first week: a short conversation, nothing scored', why: 'The cheapest moment to fix a missing account, a wrong assumption or a worry.' },
  // ------------------------------------------------------------------ first month
  { id: 'm1-job', phase: 'month1', topic: 'troubleshooting', kind: 'exercise', confirm: 'mentor', title: 'Take a job from assignment to restored, with your mentor watching', why: 'The first one done properly sets the pattern for the rest.',
    rubric: ['Read the job and the room’s record before going', 'Said what was seen before saying what was wrong', 'Wrote what was done so that someone else could repeat it', 'Checked with the person affected before calling it restored'] },
  { id: 'm1-talk', phase: 'month1', topic: 'communication', kind: 'learn', confirm: 'check', check: 'communication', title: 'Communication: what to say to the person in the room, and what to write on the job', why: 'People forgive a fault sooner than they forgive not being told.' },
  { id: 'm1-standards', phase: 'month1', topic: 'standards', kind: 'learn', confirm: 'self', title: 'Engineering standards: what a standard is, where this organisation keeps its own, and what an exception needs', why: 'A standard is why two rooms behave the same; an exception is a decision someone signed.', place: 'knowledge', needs: 'standards' },
  { id: 'm1-vendors', phase: 'month1', topic: 'vendors', kind: 'learn', confirm: 'self', title: 'Vendors: who supports what at your site, and how a vendor visit is arranged', why: 'Some repairs are someone else’s under an agreement; doing them yourself can void it.', needs: 'vendors' },
  { id: 'm1-writeup', phase: 'month1', topic: 'documentation', kind: 'do', confirm: 'self', title: 'Write up one fix so the next person can use it', why: 'What you learned this month is worth more written down than remembered.', place: 'learn',
    rubric: ['Names the symptom as a user would describe it', 'Says what was checked, in order, and what was found', 'Contains no password, no personal detail and nothing that identifies a person'] },
  { id: 'm1-review', phase: 'month1', topic: 'development', kind: 'review', owner: 'manager', confirm: 'manager', title: 'Thirty-day review', why: 'Compare the month with what was agreed on day one, and agree the next thirty days.' },
  // ------------------------------------------------------------------ by day 60
  { id: 's1-alone', phase: 'day60', topic: 'troubleshooting', kind: 'exercise', confirm: 'mentor', title: 'Handle a job alone; your mentor reads the record afterwards', why: 'Independence is shown by the record, not claimed.',
    rubric: ['The record alone tells the mentor what happened', 'Anything outside the role was handed on, with what had been tried'] },
  { id: 's1-people', phase: 'day60', topic: 'stakeholders', kind: 'learn', confirm: 'self', title: 'Stakeholders: who feels a room’s failure most, and how to keep them told', why: 'The person who booked the room and the person who presents in it are rarely the one who reports the fault.' },
  { id: 's1-ready', phase: 'day60', topic: 'avuc', kind: 'do', confirm: 'self', title: 'Check a room is ready before an important meeting', why: 'Ten minutes before is when a fault costs nothing.', place: 'control' },
  { id: 's1-grow', phase: 'day60', topic: 'development', kind: 'do', confirm: 'manager', title: 'Choose one thing to get better at, with your manager', why: 'One named skill with a date beats a list.' },
  { id: 's1-review', phase: 'day60', topic: 'development', kind: 'review', owner: 'manager', confirm: 'manager', title: 'Sixty-day review', why: 'Is the starter handling ordinary jobs alone, and are people being kept told?' },
  // ------------------------------------------------------------------ by day 90
  { id: 'n1-teach', phase: 'day90', topic: 'communication', kind: 'exercise', confirm: 'mentor', title: 'Show someone else: take a newer colleague or the site champion through one check', why: 'Explaining a check is the proof of understanding it.',
    rubric: ['Explained what each step is for, not only what to press', 'Said where the check stops and a report begins'] },
  { id: 'n1-certs', phase: 'day90', topic: 'certification', kind: 'learn', confirm: 'self', title: 'Certification pathways: what the organisation asks of your role, and what is optional', why: 'Know which learning is required, which is supported, and which is your own choice.', needs: 'training' },
  { id: 'n1-review', phase: 'day90', topic: 'development', kind: 'review', owner: 'manager', confirm: 'manager', title: 'Ninety-day review', why: 'Independent in the core of the role? Agree what the next quarter is for.' },
];
export const itemById = (id: string): Item | null => ITEMS.find((i) => i.id === id) || null;
export const REVIEWS: readonly string[] = ITEMS.filter((i) => i.kind === 'review').map((i) => i.id);

export interface Question { q: string; options: readonly string[]; answer: number; why: string }
export interface Check { id: string; title: string; questions: readonly Question[] }
/** Knowledge checks. Each is passed with every answer right; a check is a count of right answers, never a qualification. */
export const CHECKS: readonly Check[] = [
  { id: 'security', title: 'Security basics', questions: [
    { q: 'A senior colleague phones and asks you to read out a one-time sign-in code so they can “get in quickly”. What do you do?', answer: 2, why: 'A sign-in code is for the person it was sent to. Nobody in support needs yours, and a request that leans on seniority and hurry is how these attacks are made.',
      options: ['Read it out: they are senior', 'Send it by message instead, so there is a record', 'Decline, and report the request the way your organisation asks you to'] },
    { q: 'You find a password written on a note stuck to a room’s equipment. What is the right first step?', answer: 0, why: 'A credential in plain sight is exposed whether or not anyone has used it. It is reported so that it can be changed; removing the note alone leaves the same password in place.',
      options: ['Report it, so the credential is changed', 'Take the note away and say nothing', 'Use it to check that it still works'] },
  ] },
  { id: 'service', title: 'A job from report to verified fix', questions: [
    { q: 'You restore a room’s sound. When is the job finished?', answer: 1, why: 'Restored is what you believe; verified is what the person affected, or a check, confirms. The record keeps the two apart on purpose.',
      options: ['When the sound comes back', 'When it has been checked and the record says what was done', 'When you leave the room'] },
    { q: 'Someone stops you in a corridor and describes a fault. What makes it a job?', answer: 0, why: 'A fault that is only spoken has no owner, no state and no history. Recording it is what lets someone else pick it up.',
      options: ['Recording it, with the room and what they saw', 'Fixing it straight away', 'Remembering to mention it at the next meeting'] },
  ] },
  { id: 'room', title: 'How a meeting room works', questions: [
    { q: 'People in the room can hear the far end, but the far end cannot hear the room. Which part of the room is the first to look at?', answer: 1, why: 'Sound travelling out starts at the microphones and their mute state. The loudspeakers are working: the room hears the far end.',
      options: ['The loudspeakers', 'The microphones, and whether the room is muted', 'The display'] },
    { q: 'What does a room’s touch panel do?', answer: 2, why: 'The panel asks; other equipment does the work. A panel that responds does not prove the equipment behind it did.',
      options: ['It produces the picture and the sound', 'It stores the meeting', 'It sends requests to the equipment that does the work'] },
  ] },
  { id: 'network', title: 'Network fundamentals for rooms', questions: [
    { q: 'A device shows as “offline” in monitoring. What does that tell you for certain?', answer: 0, why: 'Monitoring reports what it could reach. The device may be off, unplugged, on the wrong network or working with its reporting blocked; the room has to be looked at.',
      options: ['Only that monitoring could not reach it', 'That the device has failed', 'That the room cannot be used'] },
    { q: 'You think a room’s fault is in the network switch. What is yours to do?', answer: 1, why: 'A switch serves more than one room, and changing it is the network team’s decision. What helps them is the evidence: which port, what you saw, and when.',
      options: ['Change the switch port’s settings to test the idea', 'Hand it on with what you saw, to the people who run the network', 'Restart the switch'] },
  ] },
  { id: 'escalation', title: 'Escalation', questions: [
    { q: 'Which hand-on helps the next person most?', answer: 2, why: 'What was seen, what was tried and what changed lets the next person start where you stopped.',
      options: ['“Not working, please look”', '“Probably the processor”', '“No picture since nine. Cable and input checked, no change. Panel shows the source as connected.”'] },
    { q: 'When is the right time to hand a job on?', answer: 1, why: 'A hand-on is part of doing the job well. Waiting until every idea is exhausted costs the people waiting for the room.',
      options: ['Only when you have run out of ideas', 'As soon as the fix is outside your role, or the time it is costing is more than the room can bear', 'Never: finishing your own jobs is the point'] },
  ] },
  { id: 'communication', title: 'Communication', questions: [
    { q: 'A meeting starts in five minutes and you cannot fix the room in time. What do you say?', answer: 0, why: 'People can plan around a clear answer. They cannot plan around hope.',
      options: ['What does not work, what still does, and where they can go instead', '“Give me two minutes” and keep trying', 'Nothing until it is fixed'] },
    { q: 'What belongs in the note you leave on a job?', answer: 1, why: 'The record is read by someone who was not there. Facts in order serve them; blame and guesses do not.',
      options: ['Who you think caused it', 'What you saw, what you did, and what state you left the room in', 'As little as possible'] },
  ] },
];
export const checkById = (id: string): Check | null => CHECKS.find((c) => c.id === id) || null;
export function markCheck(id: string, answers: unknown): { score: number; of: number; passed: boolean; wrong: number[] } | null {
  const c = checkById(id); if (!c || !Array.isArray(answers) || answers.length !== c.questions.length) return null;
  if (!answers.every((a, i) => Number.isInteger(a) && (a as number) >= 0 && (a as number) < c.questions[i]!.options.length)) return null;
  const wrong = c.questions.map((q, i) => (answers[i] === q.answer ? -1 : i)).filter((i) => i >= 0);
  return { score: c.questions.length - wrong.length, of: c.questions.length, wrong, passed: wrong.length === 0 };
}

/** What a review looks at. The same five at thirty, sixty and ninety days, so the three can be compared. */
export const COMPETENCIES: ReadonlyArray<{ id: string; title: string; day30: string; day60: string; day90: string }> = [
  { id: 'record', title: 'Keeps the record', day30: 'Every job they touch says what was seen and done', day60: 'Their records can be followed by someone who was not there', day90: 'Their write-ups are used by others' },
  { id: 'diagnose', title: 'Works a fault in order', day30: 'Follows a first-response check with help', day60: 'Works ordinary faults alone, in a sensible order', day90: 'Explains their order to someone else' },
  { id: 'handon', title: 'Hands on well', day30: 'Knows who each kind of problem goes to', day60: 'Hands on early, with what was tried', day90: 'Rarely has a hand-on sent back for more detail' },
  { id: 'people', title: 'Keeps people told', day30: 'Tells the person affected what is happening', day60: 'Gives a clear answer when a fix will not be in time', day90: 'Is asked for by name' },
  { id: 'safe', title: 'Works safely and within the role', day30: 'Knows what the role does not do', day60: 'Stops and asks when a job leaves the role', day90: 'Shows others where the role stops' },
];
export const RATINGS = ['Not yet', 'With help', 'Independently'] as const;
export type Rating = 0 | 1 | 2;

/** Certifications the founder holds and names; examples of a pathway, never a requirement of this demonstration. */
export const PATHWAY_EXAMPLES: readonly string[] = ['CTS (AVIXA)', 'CAPM (PMI)', 'CompTIA Network+'];

export type Edition = 'employee' | 'manager' | 'mentor' | 'administrator';
export const EDITIONS: Readonly<Record<Edition, { title: string; forWhom: string; holds: string }>> = {
  employee: { title: 'Employee edition', forWhom: 'The new starter', holds: 'What to learn, whom to meet, what to do, and how to succeed.' },
  manager: { title: 'Manager edition', forWhom: 'The starter’s manager', holds: 'Milestones, approvals, access readiness, assignment expectations, and progress.' },
  mentor: { title: 'Mentor edition', forWhom: 'The starter’s mentor', holds: 'Coaching plans, demonstrations, technical exercises, and feedback.' },
  administrator: { title: 'Administrator edition', forWhom: 'The person who publishes the guide for the organisation', holds: 'Tenant-specific publishing, version control, localization, and reporting.' },
};
/** The mentor's plan: what to show, watch and say, by phase. Derived from the items a mentor confirms. */
export const mentorItems = (): Item[] => ITEMS.filter((i) => i.confirm === 'mentor');
export const managerItems = (): Item[] => ITEMS.filter((i) => i.confirm === 'manager');
export const starterItems = (): Item[] => ITEMS.filter((i) => !i.owner);
