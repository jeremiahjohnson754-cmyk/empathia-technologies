/**
 * The deficiency state machine (40/10 Commissioning Engineering Workstation directive: "Open, In Progress, Pending Retest, Closed,
 * Accepted Exception, Deferred"), shared by the API and the demonstration. Deterministic and side-effect free: every function takes the
 * deficiency and the step and returns either the next state or the reasons it is refused.
 *
 *   OPEN ──start──▶ IN_PROGRESS ──fixed──▶ PENDING_RETEST ──retest PASS + verified by another person──▶ CLOSED
 *     │                 │   ▲                    │
 *     │                 │   └──── retest FAIL ───┘
 *     ├─────────────────┴──▶ ACCEPTED_EXCEPTION   (an approved exception record; never for a rule that is not open to exception)
 *     └─────────────────┴──▶ DEFERRED             (a reason, a target date in the future, approved by someone other than the owner)
 *                               └──resume──▶ OPEN  (by hand, or due() says the date has passed)
 *   CLOSED ──reopen (a reason; the regression found)──▶ OPEN
 *
 * Rules that hold on every step:
 *   - the corrective action is recorded with what was done (root cause and action) before a retest is asked for;
 *   - a retest records a result and the evidence it rests on; CLOSED needs a PASS and a verifier who is neither the one who fixed it
 *     nor the one who recorded the retest (separation of duties);
 *   - an exception is never available for a deficiency against safety, security, evidence integrity, tenant isolation or separation of
 *     duties (`waivable: false`), and its approver is never its requester;
 *   - a deferral never applies to a High/Critical deficiency in a room about to be accepted (acceptance waits instead);
 *   - every step names its actor and time; nothing is deleted, history only grows.
 */
export type DeficiencyState = 'OPEN' | 'IN_PROGRESS' | 'PENDING_RETEST' | 'CLOSED' | 'ACCEPTED_EXCEPTION' | 'DEFERRED';
export const DEFICIENCY_STATES: DeficiencyState[] = ['OPEN', 'IN_PROGRESS', 'PENDING_RETEST', 'CLOSED', 'ACCEPTED_EXCEPTION', 'DEFERRED'];
export type DeficiencySeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export const ROOT_CAUSES = ['DESIGN', 'INSTALLATION', 'CONFIGURATION', 'EQUIPMENT_FAULT', 'FIRMWARE', 'INFRASTRUCTURE', 'ACOUSTICS', 'OTHER'] as const;
export type RootCause = (typeof ROOT_CAUSES)[number];

export interface DeficiencyStep { at: string; by: string; from: DeficiencyState; to: DeficiencyState; note: string }
export interface Deficiency {
  id: string; title: string; severity: DeficiencySeverity; state: DeficiencyState;
  /** the rule the deficiency is against may be excepted (false for safety, security, evidence, tenant isolation, separation of duties) */
  waivable: boolean;
  owner: string | null; openedAt: string; targetDate: string | null;
  rootCause: RootCause | null; action: string | null; fixedBy: string | null;
  retest: { result: 'PASS' | 'FAIL'; evidence: string; by: string; at: string } | null;
  exception: { id: string; requestedBy: string; approvedBy: string } | null;
  deferral: { reason: string; until: string; approvedBy: string } | null;
  closedBy: string | null; history: DeficiencyStep[];
}
export type DeficiencyAction =
  | { kind: 'start'; owner: string; targetDate: string }
  | { kind: 'fixed'; rootCause: RootCause; action: string }
  | { kind: 'retest'; result: 'PASS' | 'FAIL'; evidence: string }
  | { kind: 'verify' }
  | { kind: 'except'; exceptionId: string; requestedBy: string }
  | { kind: 'defer'; reason: string; until: string; acceptanceDue: boolean }
  | { kind: 'resume'; reason: string }
  | { kind: 'reopen'; reason: string };
export type StepResult = { ok: true; next: Deficiency } | { ok: false; why: string[] };

const isoDay = /^\d{4}-\d{2}-\d{2}/;
const FROM: Record<DeficiencyAction['kind'], DeficiencyState[]> = {
  start: ['OPEN'], fixed: ['IN_PROGRESS'], retest: ['PENDING_RETEST'], verify: ['PENDING_RETEST'],
  except: ['OPEN', 'IN_PROGRESS'], defer: ['OPEN', 'IN_PROGRESS'], resume: ['DEFERRED'], reopen: ['CLOSED'],
};

/** the steps a deficiency in its present state can take (before who is acting and with what is checked) */
export const stepsFrom = (s: DeficiencyState) => (Object.keys(FROM) as Array<DeficiencyAction['kind']>).filter((k) => FROM[k].includes(s));

export function newDeficiency(x: { id: string; title: string; severity: DeficiencySeverity; waivable: boolean; openedAt: string; by: string }): Deficiency {
  return { id: x.id, title: x.title, severity: x.severity, state: 'OPEN', waivable: x.waivable, owner: null, openedAt: x.openedAt, targetDate: null, rootCause: null, action: null, fixedBy: null, retest: null, exception: null, deferral: null, closedBy: null, history: [{ at: x.openedAt, by: x.by, from: 'OPEN', to: 'OPEN', note: 'opened' }] };
}

/** Take one step. `by` is who acts and `at` when; the caller has already checked the actor's authority for the step. */
export function step(d: Deficiency, a: DeficiencyAction, by: string, at: string): StepResult {
  const why: string[] = [];
  if (!FROM[a.kind].includes(d.state)) return { ok: false, why: [`${a.kind} is not a step from ${d.state} (from ${d.state}: ${stepsFrom(d.state).join(', ') || 'none'})`] };
  const n: Deficiency = { ...d, history: [...d.history] }; let to: DeficiencyState = d.state; let note = '';
  switch (a.kind) {
    case 'start':
      if (!a.owner.trim()) why.push('an owner is named'); if (!isoDay.test(a.targetDate)) why.push('a target date is set');
      else if (a.targetDate.slice(0, 10) < at.slice(0, 10)) why.push('the target date is not in the past');
      n.owner = a.owner.trim(); n.targetDate = a.targetDate.slice(0, 10); to = 'IN_PROGRESS'; note = `owner ${n.owner}, target ${n.targetDate}`; break;
    case 'fixed':
      if (!ROOT_CAUSES.includes(a.rootCause)) why.push(`the root cause is one of ${ROOT_CAUSES.join(', ')}`);
      if (a.action.trim().length < 10) why.push('the corrective action says what was done (at least a sentence)');
      n.rootCause = a.rootCause; n.action = a.action.trim(); n.fixedBy = by; n.retest = null; to = 'PENDING_RETEST'; note = `${a.rootCause}: ${n.action}`; break;
    case 'retest':
      if (!a.evidence.trim()) why.push('a retest rests on evidence (its reference)');
      n.retest = { result: a.result, evidence: a.evidence.trim(), by, at };
      if (a.result === 'FAIL') { to = 'IN_PROGRESS'; note = `retest FAIL (${a.evidence.trim()}): back to the owner`; } else { to = 'PENDING_RETEST'; note = `retest PASS (${a.evidence.trim()}), awaiting verification`; }
      break;
    case 'verify':
      if (!d.retest || d.retest.result !== 'PASS') why.push('a passing retest is recorded first');
      if (d.fixedBy === by) why.push('the person who fixed it does not verify the fix (separation of duties)');
      if (d.retest?.by === by) why.push('the person who recorded the retest does not verify it (separation of duties)');
      n.closedBy = by; to = 'CLOSED'; note = `verified closed on ${d.retest?.evidence ?? '—'}`; break;
    case 'except':
      if (!d.waivable) why.push('this deficiency is against a rule that is not open to exception (safety, security, evidence, tenant isolation or separation of duties)');
      if (!a.exceptionId.trim()) why.push('an approved exception record is referenced');
      if (a.requestedBy === by) why.push('the exception’s requester does not approve it');
      n.exception = { id: a.exceptionId.trim(), requestedBy: a.requestedBy, approvedBy: by }; to = 'ACCEPTED_EXCEPTION'; note = `exception ${a.exceptionId.trim()}, requested by ${a.requestedBy}`; break;
    case 'defer':
      if (a.reason.trim().length < 10) why.push('a deferral gives its reason');
      if (!isoDay.test(a.until) || a.until.slice(0, 10) <= at.slice(0, 10)) why.push('a deferral runs to a date in the future');
      if (d.owner && d.owner === by) why.push('the owner does not approve deferring their own deficiency');
      if (a.acceptanceDue && (d.severity === 'High' || d.severity === 'Critical')) why.push(`a ${d.severity} deficiency is not deferred past acceptance: acceptance waits for it instead`);
      n.deferral = { reason: a.reason.trim(), until: a.until.slice(0, 10), approvedBy: by }; to = 'DEFERRED'; note = `deferred to ${a.until.slice(0, 10)}: ${a.reason.trim()}`; break;
    case 'resume':
      if (!a.reason.trim()) why.push('a resumption gives its reason');
      n.deferral = null; to = 'OPEN'; note = `resumed: ${a.reason.trim()}`; break;
    case 'reopen':
      if (a.reason.trim().length < 10) why.push('a reopening says what regressed');
      n.closedBy = null; n.retest = null; to = 'OPEN'; note = `reopened: ${a.reason.trim()}`; break;
  }
  if (why.length) return { ok: false, why };
  n.state = to; n.history.push({ at, by, from: d.state, to, note }); return { ok: true, next: n };
}

/** a deferral whose date has passed is due to resume; an open deficiency past its target date is late */
export function due(d: Deficiency, today: string): { resume: boolean; late: boolean; ageDays: number } {
  const t = today.slice(0, 10); const age = Math.max(0, Math.round((Date.parse(t) - Date.parse(d.openedAt.slice(0, 10))) / 864e5));
  return { resume: d.state === 'DEFERRED' && !!d.deferral && d.deferral.until <= t, late: ['OPEN', 'IN_PROGRESS', 'PENDING_RETEST'].includes(d.state) && !!d.targetDate && d.targetDate < t, ageDays: age };
}
/** what a deficiency in this state means for the room's acceptance */
export function blocksAcceptance(d: Deficiency): boolean { return ['OPEN', 'IN_PROGRESS', 'PENDING_RETEST'].includes(d.state) || (d.state === 'DEFERRED' && (d.severity === 'High' || d.severity === 'Critical')); }
