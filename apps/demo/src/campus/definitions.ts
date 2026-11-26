/**
 * What each operational number in the demonstration means: one entry per metric, read by the pages that show the number (Mission Control's
 * "How these numbers are counted", the campus pages' captions) and by the tests that reconcile the number with its records.
 *
 * 25 Nov 2026, metric integrity (founder's commercial-readiness directive §4.1–4.2, after an external review found counts on the home page
 * that seemed to contradict each other: "2 jobs need you today", "6 rooms need action", "21 decisions are waiting", "33 items"). Each was
 * correct under a definition the page never stated, and two were wrong:
 *   - "21 decisions" counted every priority that is not a Resume, so 18 "Take action" items were called decisions; three are.
 *   - "2 jobs need you today" counted the campus's open service requests, whoever's they are, in a sentence addressed to the viewer.
 * The computations live in campus/metrics.ts and campus/mission.ts; this file holds no logic, only what the number is.
 *
 * Every figure here is MODELED from the demonstration's synthetic records when the page opens. None is measured, monitored or live.
 */
export type Evidence = 'MODELED' | 'NOT_AVAILABLE';
export interface MetricDef {
  id: string;
  /** the label the page uses for the number, the same everywhere it appears */
  label: string;
  meaning: string;
  /** what is counted, and from which records */
  counts: string;
  /** what is deliberately not counted */
  excludes: string;
  /** what the number is a part of, when it is a part */
  denominator: string;
  evidence: Evidence;
  /** when the number is computed and what changes it */
  freshness: string;
  /** who sees which population */
  roles: string;
}

const NOW = 'Computed from the records when the page opens; recomputed when the service workspace changes (a request closed in ServiceHands lowers it at once).';

export const METRICS = {
  'actions.yours': {
    id: 'actions.yours', label: 'Waiting for you',
    meaning: 'Items on record whose work is the viewed role’s, and that the role can open. The headline count of Mission Control.',
    counts: 'Open service requests to triage or continue, design exceptions and baselines to review, commissioning to complete, open room issues and approved projects to fund, each naming the roles whose work it is.',
    excludes: 'Items whose work is another role’s (shown on request as “for other roles”) and items behind a page the role cannot open.',
    denominator: 'A part of every actionable item on record; split by verb into to act on, to resume and to review, which add up to it.',
    evidence: 'MODELED', freshness: NOW,
    roles: 'Role-aware: View as changes it. The Product Architect owns every item.',
  },
  'actions.decisions': {
    id: 'actions.decisions', label: 'Decisions to review',
    meaning: 'The items waiting for yours that a person decides: a design exception, a commissioning baseline, an approved project’s funding.',
    counts: 'Your items whose verb is Review.',
    excludes: 'Triage, repairs, open issues and commissioning, which are work to do or continue, not a decision. (Until 25 Nov 2026 the home page called all of them decisions.)',
    denominator: 'A part of the items waiting for you.',
    evidence: 'MODELED', freshness: NOW, roles: 'Role-aware.',
  },
  'actions.all': {
    id: 'actions.all', label: 'Actionable items on record',
    meaning: 'Every item on record that waits for a person, whoever’s work it is.',
    counts: 'The same items as Waiting for you, for every role, one per record.',
    excludes: 'Nothing that waits for a person; closed and resolved records.',
    denominator: 'The whole population; Waiting for you is the viewed role’s part of it.',
    evidence: 'MODELED', freshness: NOW, roles: 'The same for every role; a role sees only the items it can open.',
  },
  'actions.overdue': {
    id: 'actions.overdue', label: 'Overdue actions',
    meaning: 'Not computed. No record in the demonstration carries a due date, so no item can be called overdue.',
    counts: 'Nothing.', excludes: 'Everything: an age (“2 h ago”) is shown instead, which is not a deadline.', denominator: '—',
    evidence: 'NOT_AVAILABLE', freshness: '—', roles: '—',
  },
  'requests.open': {
    id: 'requests.open', label: 'Open service requests',
    meaning: 'Requests in the service workspace that are not closed or resolved, across the campus, whoever is working them.',
    counts: 'ServiceHands requests in any live state: open, triaged, assigned, accepted, in progress, verifying or reopened.',
    excludes: 'Closed and resolved requests; work orders (counted separately).',
    denominator: 'Each is also an open issue of its room, and one item waiting for the service roles.',
    evidence: 'MODELED', freshness: NOW, roles: 'The same for every role.',
  },
  'rooms.attention': {
    id: 'rooms.attention', label: 'Rooms needing attention',
    meaning: 'Rooms with something open or below Healthy.',
    counts: 'Rooms at risk, rooms with any open issue (record issues and live service requests) and rooms scoring below 88.',
    excludes: 'Rooms that are Healthy with nothing open, and rooms the record cannot score that have nothing open.',
    denominator: 'Of every room on the campus; rooms at risk are a part of it.',
    evidence: 'MODELED', freshness: NOW, roles: 'The same for every role.',
  },
  'rooms.at_risk': {
    id: 'rooms.at_risk', label: 'Rooms at risk',
    meaning: 'Rooms where an open issue is critical (High) or the health score is in Action required (below 75).',
    counts: 'Scored and unscored rooms alike: a room whose record holds no test result but has an open High design deficiency is at risk.',
    excludes: 'Rooms whose open issues are all Medium or Low and whose score is 75 or more.',
    denominator: 'A part of the rooms needing attention. A floor, building or campus with a room at risk is never shown Healthy.',
    evidence: 'MODELED', freshness: NOW, roles: 'The same for every role.',
  },
  'issues.open': {
    id: 'issues.open', label: 'Open issues',
    meaning: 'Issues not resolved, in every room.',
    counts: 'Room record issues not resolved, plus the service workspace’s live requests (one per id; the live record wins).',
    excludes: 'Resolved issues and closed requests.',
    denominator: 'Of every issue on record; critical issues are a part of it.',
    evidence: 'MODELED', freshness: NOW, roles: 'The same for every role.',
  },
  'issues.critical': {
    id: 'issues.critical', label: 'Critical issues',
    meaning: 'Open issues of severity High. A Mission critical or High service request counts as High.',
    counts: 'Open issues as above whose severity is High.',
    excludes: 'Medium and Low issues; Standard service requests (counted as Medium).',
    denominator: 'A part of the open issues. Every room holding one is a room at risk.',
    evidence: 'MODELED', freshness: NOW, roles: 'The same for every role.',
  },
  'health.average': {
    id: 'health.average', label: 'Campus health',
    meaning: 'The average health of the rooms the record can score, with a status that never reads Healthy while a room is at risk.',
    counts: 'Each scored room’s health: 100, less 15 per open High issue, 8 per Medium, 4 per Low, up to 30 for failed tests and up to 20 for tests not yet run. Bands: 88 or more Healthy, 75 to 87 Monitor, below 75 Action required.',
    excludes: 'Rooms whose record holds no test result: they are not scored, never averaged in as healthy, and counted as not scored.',
    denominator: 'An average, not a count: of the scored rooms. The lowest room is shown beside it, because an average hides its range.',
    evidence: 'MODELED', freshness: NOW, roles: 'The same for every role.',
  },
  'rooms.healthy': {
    id: 'rooms.healthy', label: 'Healthy rooms',
    meaning: 'Rooms whose score is 88 or more.',
    counts: 'Scored rooms in the Healthy band. A Healthy room can still have a Medium or Low issue open (it then also needs attention).',
    excludes: 'Rooms in Monitor or Action required, and rooms not scored.',
    denominator: 'Of every room: healthy, monitor, action required and not scored add up to the number of rooms. The first three are the scored rooms.',
    evidence: 'MODELED', freshness: NOW, roles: 'The same for every role.',
  },
} as const satisfies Record<string, MetricDef>;

export type MetricId = keyof typeof METRICS;
/** The definitions Mission Control lists under "How these numbers are counted", in the order the page shows the numbers. */
export const HOME_METRICS: MetricId[] = ['actions.yours', 'actions.decisions', 'rooms.attention', 'rooms.at_risk', 'health.average', 'rooms.healthy', 'issues.critical', 'issues.open', 'requests.open', 'actions.all', 'actions.overdue'];
