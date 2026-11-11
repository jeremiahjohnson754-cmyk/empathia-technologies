/**
 * Acceptance of a commissioning dossier, as rules (v1.6 report snapshot + v1.8 vertical slice).
 *
 * The reference snapshot never changes. Work done after it (a retest, an evidence record, an independent verification, a deficiency) is a
 * list of events replayed over the snapshot; the totals, the open blockers and whether acceptance can be recorded are all derived from
 * that replay, so no number is ever typed and a held dossier cannot be turned green by editing a field.
 *
 * Rules: a pass needs an evidence record; a result recorded after the snapshot counts only once someone in a different role verifies it;
 * a failure needs a deficiency raised against it; acceptance is refused while any blocker stands, and names the blockers; and the role
 * that accepts is one that neither recorded nor verified any result in the dossier.
 *
 * Final sign-off is the sixth phase, after the five commissioning phases, and takes two approvals in order (founder, 10 Nov 2026):
 * first the Service Manager or the Executive, once everything in commissioning is done; then the Operations Lead or the Systems
 * Engineer. Which roles those are is the caller's policy (`accept` and `countersign`); the order, the independence of both from the
 * work, that the two come from two different roles, and that any new result withdraws an approval already given, are rules here.
 * The dossier is accepted, and closed, only when both stand.
 *
 * Waivers and attestations (founder's directive of 11 Nov 2026, §13). Acceptance is refused while a mandatory item is open "unless a
 * properly authorized documented waiver exists". A waiver names one test, says why in a sentence, and ends on a date at most ninety
 * days on; it never turns the test green (the totals and the open item stay as they are) and the dossier is then accepted WITH
 * WAIVERS, which every reading of it says. A waiver is a documented exception (founder, 11 Nov 2026, 01:42 and 02:25): it carries
 * its reason, the requirement it affects, the evidence it relies on, the risk while it stands, who gave it and when, its end date,
 * who owns closing the item and how. There are two kinds, and the kind is the item's, not the giver's choice: a BUSINESS-RISK
 * acceptance (a documentation or handover item that is late, not failing) is the authorised business decision-maker's; a TECHNICAL
 * deviation (anything else) is the operations authority's and stands only after an engineering review by another role. Never
 * waived: a test that is a security, authorisation, record-integrity, accessibility or mandatory-safety control; a pass with no
 * evidence or awaiting verification (evidence integrity); a failure nobody has raised a deficiency against; an item with an open
 * P1 deficiency. Separation of duties: a role that did the work cannot waive or review; the owner of the fix cannot waive it; the
 * reviewer is not the giver; and neither the giver nor the reviewer of a waiver gives either approval of the final sign-off. The role that waives does not also approve, each
 * approval states how many waivers it was given over, and a waiver that runs out before the second approval withdraws the first.
 * A site champion's attestation is local evidence for the approvers to read: it is recorded and shown, and it approves nothing.
 */
import type { Dossier, DossierTest, Deficiency, TestResult } from './seed.js';

export interface Actor { role: string; label: string }
/** What the caller's access policy lets this actor do. The rules below are applied on top of it, never instead of it. */
export interface Authority { record: boolean; verify: boolean; raise: boolean; /** may give the first approval of the final sign-off */ accept: boolean; /** may give the second */ countersign: boolean; /** may accept a business risk by waiver (the authorised business decision-maker) */ waiveBusiness?: boolean; /** may waive a technical deviation (the operations authority), subject to engineering review */ waiveTechnical?: boolean; /** may give the engineering review a technical waiver needs */ reviewWaiver?: boolean; /** may add a local attestation (the site champion) */ attest?: boolean }
export type DossierEvent =
  | { kind: 'RETEST'; test: string; result: 'PASS' | 'FAIL'; evidence: string | null; by: Actor; at: string }
  | { kind: 'EVIDENCE'; test: string; evidence: string; by: Actor; at: string }
  | { kind: 'VERIFY'; test: string; by: Actor; at: string }
  | { kind: 'RAISE'; test: string; id: string; statement: string; by: Actor; at: string }
  | { kind: 'WAIVE'; test: string; /** why the room can be accepted with the item open */ reason: string; /** the record it relies on */ basis: string; /** what could go wrong while the item is open */ risk: string; /** who closes the item */ owner: string; /** how and when */ plan: string; /** the last day it stands, YYYY-MM-DD */ expires: string; by: Actor; at: string }
  | { kind: 'REVIEW_WAIVER'; test: string; /** the engineering view of the deviation */ finding: string; by: Actor; at: string }
  | { kind: 'ATTEST'; statement: string; by: Actor; at: string }
  | { kind: 'ACCEPT'; by: Actor; at: string; /** how many waivers the approver was shown and approved over */ waivers?: number }
  | { kind: 'COUNTERSIGN'; by: Actor; at: string; waivers?: number };

export const WAIVER_MAX_DAYS = 90; export const WAIVER_MIN_REASON = 30; export const WAIVER_MIN_PLAN = 20; export const WAIVER_MIN_BASIS = 12;
export const CONTROL_WORD = { security: 'security', authorization: 'authorisation', integrity: 'record-integrity', accessibility: 'accessibility', safety: 'mandatory-safety' } as const;
export type WaiverKind = 'technical' | 'business';
/** The kind of exception an open item would be: late paperwork or handover is a business risk; everything else is a technical deviation. */
export const waiverKind = (t: { discipline: string; result: TestResult }): WaiverKind => (t.discipline === 'Documentation' && t.result !== 'FAIL' ? 'business' : 'technical');
export interface Approval { by: Actor; at: string; /** waivers standing when it was given */ waivers: number }
/** STANDING: covers its item. AWAITING_REVIEW: a technical deviation with no engineering review yet; it covers nothing. EXPIRED: its date has passed and the item is open again. MOOT: the item was closed. VOID: it cannot cover what the item now is, or its role did the work. */
export interface WorkingWaiver { test: string; kind: WaiverKind; reason: string; basis: string; risk: string; owner: string; plan: string; expires: string; by: Actor; at: string; review: { by: Actor; at: string; finding: string } | null; covers: string[]; state: 'STANDING' | 'AWAITING_REVIEW' | 'EXPIRED' | 'MOOT' | 'VOID' }
export interface Attestation { statement: string; by: Actor; at: string }

export interface WorkingTest extends DossierTest { recordedBy: Actor | null; verifiedBy: Actor | null; changed: boolean }
export interface WorkingDeficiency extends Omit<Deficiency, 'state'> { state: Deficiency['state'] | 'CLOSED'; raisedAfterSnapshot: boolean }
export interface Blocker { test: string | null; reason: string }
export interface Working {
  tests: WorkingTest[]; deficiencies: WorkingDeficiency[];
  totals: { tests: number; pass: number; pending: number; fail: number; evidence: number; awaitingVerification: number };
  /** what stops acceptance now: the open items no standing waiver covers */ blockers: Blocker[];
  /** every open item, waived or not */ open: Blocker[]; waivers: WorkingWaiver[]; attestations: Attestation[];
  acceptance: 'HELD' | 'ACCEPTED'; acceptedBy: Actor | null; acceptedAt: string | null; changed: boolean;
  /** Phase 6. TESTS_OPEN: blockers stand. AWAITING_FIRST: ready for the first approval. AWAITING_SECOND: first given. COMPLETE: both. */
  signoff: 'TESTS_OPEN' | 'AWAITING_FIRST' | 'AWAITING_SECOND' | 'COMPLETE'; firstApproval: Approval | null; secondApproval: Approval | null;
}

const endOf = (day: string) => Date.parse(`${day}T23:59:59.999Z`);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Open items that come from outside the tests (Phase 5: a required document that is not complete), as they stood at a moment. They
 *  stop acceptance exactly like a test's open item, they name no test, and so no waiver here can cover them. */
export type ExtraBlockers = (at: string) => readonly Blocker[];

/** `asOf` is the moment the record is read (waivers are dated); without it, the time of the last event. */
export function replay(d: Dossier, events: readonly DossierEvent[], asOf?: string, extra?: ExtraBlockers): Working {
  const outside = (t: string): Blocker[] => (extra ? extra(t).filter((b) => b && typeof b.reason === 'string').map((b) => ({ test: null, reason: b.reason })) : []);
  const tests: WorkingTest[] = d.tests.map((t) => ({ ...t, recordedBy: null, verifiedBy: null, changed: false }));
  const defs: WorkingDeficiency[] = d.deficiencies.map((x) => ({ ...x, raisedAfterSnapshot: false }));
  const byId = (id: string) => tests.find((t) => t.id === id);
  let first: Approval | null = null; let second: Approval | null = null;
  const granted = new Map<string, Extract<DossierEvent, { kind: 'WAIVE' }>>(); const reviews = new Map<string, Extract<DossierEvent, { kind: 'REVIEW_WAIVER' }>>(); const attestations: Attestation[] = [];
  const now = asOf ?? events[events.length - 1]?.at ?? d.generatedAt;
  for (const e of events) {
    if (e.kind === 'ATTEST') { if (attestations.length < 20) attestations.push({ statement: e.statement, by: e.by, at: e.at }); continue; }   // read by the approvers; changes nothing
    if (e.kind === 'ACCEPT') { first = { by: e.by, at: e.at, waivers: e.waivers ?? 0 }; second = null; continue; }
    if (e.kind === 'COUNTERSIGN') { if (first && e.by.role !== first.by.role) second = { by: e.by, at: e.at, waivers: e.waivers ?? 0 }; continue; }   // a second approval with no first, or from the first's own role, is not one
    const t = byId(e.test); if (!t) continue;
    first = null; second = null;                                                    // an approval covers the record as it stood: any later result, evidence, verification or deficiency withdraws it
    if (e.kind === 'RETEST') { t.result = e.result; t.evidence = e.evidence ?? t.evidence; t.recordedBy = e.by; t.verifiedBy = null; t.changed = true; delete t.note; }
    else if (e.kind === 'EVIDENCE') { t.evidence = e.evidence; t.recordedBy = e.by; t.verifiedBy = null; t.changed = true; }
    else if (e.kind === 'VERIFY') t.verifiedBy = e.by;
    else if (e.kind === 'WAIVE') { granted.set(e.test, e); reviews.delete(e.test); }                                   // a review is of one waiver, not of the next
    else if (e.kind === 'REVIEW_WAIVER') { if (granted.has(e.test)) reviews.set(e.test, e); }
    else if (e.kind === 'RAISE') defs.push({ id: e.id, severity: 'P2', test: e.test, statement: e.statement, owner: e.by.label, action: `Correct, then retest ${e.test}.`, state: 'OPEN', raisedAfterSnapshot: true });
  }
  // a deficiency closes itself when its test passes and that pass is independently verified; nobody closes one by hand
  for (const x of defs) { const t = byId(x.test); if (t && t.result === 'PASS' && t.evidence && t.changed && t.verifiedBy) x.state = 'CLOSED'; }
  const blockers: Blocker[] = [];
  for (const t of tests) {
    if (t.result === 'FAIL') { blockers.push({ test: t.id, reason: 'fails' }); if (!defs.some((x) => x.test === t.id && x.state !== 'CLOSED')) blockers.push({ test: t.id, reason: 'fails with no deficiency raised' }); }
    else if (t.result === 'PENDING') blockers.push({ test: t.id, reason: 'is pending' });
    else if (!t.evidence) blockers.push({ test: t.id, reason: 'passes with no evidence record' });
    else if (t.changed && !t.verifiedBy) blockers.push({ test: t.id, reason: 'awaits independent verification' });
  }
  for (const x of defs) if (x.state !== 'CLOSED' && !blockers.some((b) => b.test === x.test)) blockers.push({ test: x.test, reason: `has deficiency ${x.id} open` });
  const n = (r: TestResult) => tests.filter((t) => t.result === r).length;
  // approvals stand only over a record with no blocker, and only from roles that did none of the work: a stored event cannot say otherwise
  const worked = (a: Actor) => tests.some((x) => x.recordedBy?.role === a.role || x.verifiedBy?.role === a.role);
  // a waiver covers the open items of its test while its date has not passed; it never covers an unraised failure or an open P1
  const open = blockers;
  const unwaivable = (b: Blocker) => b.reason === 'fails with no deficiency raised' || b.reason === 'passes with no evidence record' || b.reason === 'awaits independent verification' || !!byId(b.test || '')?.control || defs.some((x) => x.test === b.test && x.state !== 'CLOSED' && x.severity === 'P1');
  const long = (v: unknown, n: number) => typeof v === 'string' && v.trim().length >= n;
  const can = (g: Extract<DossierEvent, { kind: 'WAIVE' }>) => !worked(g.by) && DAY.test(g.expires) && long(g.reason, WAIVER_MIN_REASON) && long(g.basis, WAIVER_MIN_BASIS) && long(g.risk, WAIVER_MIN_PLAN) && long(g.owner, 3) && g.owner.trim() !== g.by.label && long(g.plan, WAIVER_MIN_PLAN) && !open.some((b) => b.test === g.test && unwaivable(b));
  const kindOf = (id: string): WaiverKind => { const t = byId(id); return t ? waiverKind(t) : 'technical'; };
  // a technical deviation stands only once another role, which did none of the work, has given its engineering review
  const reviewOf = (g: { test: string; by: Actor }) => { const r = reviews.get(g.test); return r && r.by.role !== g.by.role && !worked(r.by) && long(r.finding, WAIVER_MIN_PLAN) ? r : null; };
  const reviewed = (g: { test: string; by: Actor }) => kindOf(g.test) === 'business' || !!reviewOf(g);
  const coveredAt = (b: Blocker, t: string) => { const g = b.test ? granted.get(b.test) : undefined; return !!g && can(g) && reviewed(g) && endOf(g.expires) >= Date.parse(t); };
  const uncoveredAt = (t: string) => [...open.filter((b) => !coveredAt(b, t)), ...outside(t)];
  const standingAt = (t: string) => [...granted.values()].filter((g) => open.some((b) => b.test === g.test && coveredAt(b, t)));
  // an approval stands only if, when it was given, nothing uncovered was open, its role did none of the work and granted none of the
  // waivers it approved over, and it stated how many waivers there were: a stored event cannot say otherwise
  const sound = (a: Approval) => !uncoveredAt(a.at).length && !worked(a.by) && !standingAt(a.at).some((g) => g.by.role === a.by.role || reviewOf(g)?.by.role === a.by.role) && a.waivers === standingAt(a.at).length;
  if (first && !sound(first)) { first = null; second = null; } if (second && !sound(second)) second = null;
  if (first && !second && uncoveredAt(now).length) first = null;                     // a waiver ran out before the second approval: the record is open again
  const accepted = !!first && !!second; const acceptedBy = first?.by ?? null; const acceptedAt = second?.at ?? null;
  const ref = accepted ? second!.at : now;                                          // an acceptance covers the record as it stood when it was given
  const waivers: WorkingWaiver[] = [...granted.values()].map((g) => { const covers = open.filter((b) => b.test === g.test).map((b) => b.reason);
    const rv = reviewOf(g);
    return { test: g.test, kind: kindOf(g.test), reason: g.reason, basis: String(g.basis ?? ''), risk: String(g.risk ?? ''), owner: String(g.owner ?? ''), plan: String(g.plan ?? ''), expires: g.expires, by: g.by, at: g.at, review: rv ? { by: rv.by, at: rv.at, finding: rv.finding } : null, covers,
      state: !covers.length ? 'MOOT' as const : !can(g) ? 'VOID' as const : !reviewed(g) ? 'AWAITING_REVIEW' as const : endOf(g.expires) >= Date.parse(ref) ? 'STANDING' as const : 'EXPIRED' as const }; });
  const stops = accepted ? [] : uncoveredAt(now);
  const signoff: Working['signoff'] = stops.length ? 'TESTS_OPEN' : !first ? 'AWAITING_FIRST' : !second ? 'AWAITING_SECOND' : 'COMPLETE';
  return { tests, deficiencies: defs, totals: { tests: tests.length, pass: n('PASS'), pending: n('PENDING'), fail: n('FAIL'), evidence: tests.filter((t) => t.evidence).length, awaitingVerification: tests.filter((t) => t.changed && t.result === 'PASS' && t.evidence && !t.verifiedBy).length },
    blockers: stops, open: [...open, ...outside(now)], waivers, attestations, acceptance: accepted ? 'ACCEPTED' : 'HELD', acceptedBy: accepted ? acceptedBy : null, acceptedAt: accepted ? acceptedAt : null, changed: events.length > 0, signoff, firstApproval: first, secondApproval: second };
}

/** Try one step. Returns the new event list, or the reason it is refused; a refusal changes nothing. */
export function attempt(d: Dossier, events: readonly DossierEvent[], e: DossierEvent, may: Authority, extra?: ExtraBlockers): { events: DossierEvent[] } | { refused: string } {
  const w = replay(d, events, e.at, extra); const standing = w.waivers.filter((x) => x.state === 'STANDING');
  const acknowledged = (n: number | undefined): string | null => (n ?? 0) === standing.length ? null
    : `This dossier carries ${standing.length} ${standing.length === 1 ? 'waiver' : 'waivers'}. An approval names how many it is given over: read ${standing.length === 1 ? 'it' : 'them'}, then approve with ${standing.length === 1 ? 'the waiver' : 'the waivers'}.`;
  const waivedIt = (a: Actor) => standing.some((x) => x.by.role === a.role || x.review?.by.role === a.role);
  if (w.acceptance === 'ACCEPTED') return { refused: 'The dossier is accepted and closed. A change after acceptance is a new commissioning cycle.' };
  if (e.kind === 'ACCEPT') {
    if (!may.accept) return { refused: 'This role cannot record acceptance.' };
    if (w.blockers.length) { const first = w.blockers.slice(0, 3).map((b) => `${b.test ? `${b.test} ` : ''}${b.reason}`).join('; '); return { refused: `Acceptance stays held: ${w.blockers.length} ${w.blockers.length === 1 ? 'blocker stands' : 'blockers stand'} (${first}${w.blockers.length > 3 ? '; and more' : ''}).` }; }
    // the policy's own description of an acceptor: someone who neither recorded nor verified what is being accepted
    if (w.tests.some((x) => x.recordedBy?.role === e.by.role || x.verifiedBy?.role === e.by.role)) return { refused: 'Acceptance is independent of the work it accepts: a role that recorded or verified a result in this dossier cannot also accept it.' };
    if (w.firstApproval) return { refused: `The first approval is already recorded, by the ${w.firstApproval.by.label}. The dossier now waits for the second.` };
    if (waivedIt(e.by)) return { refused: 'A waiver and an approval come from different roles: the role that waived an item in this dossier does not also approve it.' };
    const ack = acknowledged(e.waivers); if (ack) return { refused: ack };
    return { events: [...events, e] };
  }
  if (e.kind === 'COUNTERSIGN') {
    if (!may.countersign) return { refused: 'This role cannot give the second approval.' };
    if (w.blockers.length) return { refused: `The second approval cannot be given while ${w.blockers.length} ${w.blockers.length === 1 ? 'blocker stands' : 'blockers stand'}.` };
    if (!w.firstApproval) return { refused: 'The second approval follows the first, and the first has not been given.' };
    if (w.firstApproval.by.role === e.by.role) return { refused: 'The two approvals come from two different roles.' };
    if (w.tests.some((x) => x.recordedBy?.role === e.by.role || x.verifiedBy?.role === e.by.role)) return { refused: 'Acceptance is independent of the work it accepts: a role that recorded or verified a result in this dossier cannot also approve it.' };
    if (waivedIt(e.by)) return { refused: 'A waiver and an approval come from different roles: the role that waived an item in this dossier does not also approve it.' };
    const ack = acknowledged(e.waivers); if (ack) return { refused: ack };
    return { events: [...events, e] };
  }
  if (e.kind === 'ATTEST') {
    if (!may.attest) return { refused: 'This role cannot add a local attestation.' };
    const s = e.statement.trim(); if (s.length < 12) return { refused: 'Say what you saw in the room in a sentence.' }; if (s.length > 400) return { refused: 'Keep the attestation to 400 characters.' };
    if (w.attestations.some((x) => x.by.role === e.by.role && x.statement.trim() === s)) return { refused: 'That attestation is already recorded.' };
    if (w.attestations.length >= 20) return { refused: 'This dossier already holds twenty attestations.' };
    return { events: [...events, e] };
  }
  const t = w.tests.find((x) => x.id === e.test); if (!t) return { refused: `No test ${e.test} in this dossier.` };
  if (e.kind === 'RETEST') {
    if (!may.record) return { refused: 'This role cannot record a test result.' };
    if (t.result === 'PASS' && t.evidence && !t.changed) return { refused: `${t.id} already passes with evidence in the snapshot; there is nothing to retest.` };
    if (e.result === 'PASS' && !(e.evidence || '').trim()) return { refused: 'A pass needs an evidence record. Attach the evidence, then record the result.' };
  } else if (e.kind === 'EVIDENCE') {
    if (!may.record) return { refused: 'This role cannot attach evidence.' };
    if (!e.evidence.trim()) return { refused: 'Name the evidence record.' };
    if (t.evidence) return { refused: `${t.id} already has evidence record ${t.evidence}.` };
  } else if (e.kind === 'VERIFY') {
    if (!may.verify) return { refused: 'This role cannot verify a result.' };
    if (!t.changed) return { refused: `${t.id} has no new result to verify.` };
    if (t.result !== 'PASS') return { refused: `${t.id} does not pass; only a pass is verified.` };
    if (!t.evidence) return { refused: `${t.id} has no evidence record to verify against.` };
    if (t.verifiedBy) return { refused: `${t.id} is already verified.` };
    if (t.recordedBy && t.recordedBy.role === e.by.role) return { refused: 'Verification is independent: it cannot come from the role that recorded the result.' };
  } else if (e.kind === 'WAIVE') {
    if (t.control) return { refused: `${t.id} is ${/^[aeiou]/.test(CONTROL_WORD[t.control]) ? 'an' : 'a'} ${CONTROL_WORD[t.control]} control. It is corrected and retested; it is never waived.` };
    const mine = w.open.filter((b) => b.test === t.id); if (!mine.length) return { refused: `${t.id} has nothing open; there is nothing to waive.` };
    if (mine.some((b) => b.reason === 'passes with no evidence record' || b.reason === 'awaits independent verification')) return { refused: `${t.id} lacks its evidence or its independent verification. Evidence is supplied and verified; its absence is never waived.` };
    const kind = waiverKind(t);
    if (kind === 'business' && !may.waiveBusiness) return { refused: may.waiveTechnical ? `${t.id} is late paperwork or handover, not a technical deviation: accepting that risk is the authorised business decision-maker’s.` : 'This role cannot waive an open item.' };
    if (kind === 'technical' && !may.waiveTechnical) return { refused: may.waiveBusiness ? `${t.id} is a technical deviation: it is waived by the operations authority and stands only after an engineering review.` : 'This role cannot waive an open item.' };
    if (mine.some((b) => b.reason === 'fails with no deficiency raised')) return { refused: `${t.id} fails and nobody has raised a deficiency against it. Raise the deficiency first, so the item that is waived is owned and tracked.` };
    if (w.deficiencies.some((x) => x.test === t.id && x.state !== 'CLOSED' && x.severity === 'P1')) return { refused: `${t.id} has a P1 deficiency open. A P1 is corrected and retested; it is not waived.` };
    if (w.tests.some((x) => x.recordedBy?.role === e.by.role || x.verifiedBy?.role === e.by.role)) return { refused: 'A waiver is independent of the work: a role that recorded or verified a result in this dossier cannot waive an item in it.' };
    if (e.reason.trim().length < WAIVER_MIN_REASON) return { refused: 'A waiver is documented: say why the room can be accepted with this item open, and what happens next.' };
    if (e.reason.length > 600) return { refused: 'Keep the reason to 600 characters.' };
    if ((e.basis || '').trim().length < WAIVER_MIN_BASIS) return { refused: 'Name what the waiver relies on: a record someone else can read, such as the deficiency, an attestation or a booked visit.' };
    if ((e.risk || '').trim().length < WAIVER_MIN_PLAN) return { refused: 'Say what could go wrong while the item is open, and for whom.' };
    if ((e.owner || '').trim().length < 3) return { refused: 'Name who owns closing the item.' };
    if (e.owner.trim() === e.by.label) return { refused: 'Nobody waives an exception they own: the owner of the fix and the giver of the waiver are different roles.' };
    if ((e.plan || '').trim().length < WAIVER_MIN_PLAN) return { refused: 'Say how the item will be closed, and by when.' };
    if (e.basis.length > 200 || e.owner.length > 60 || e.plan.length > 400 || e.risk.length > 400) return { refused: 'Keep what it relies on to 200 characters, the owner to 60, and the risk and the plan to 400 each.' };
    if (!DAY.test(e.expires) || Number.isNaN(endOf(e.expires))) return { refused: 'Give the last day the waiver stands.' };
    if (e.expires <= new Date(e.at).toISOString().slice(0, 10)) return { refused: 'The waiver must stand until a day after today.' };
    if (endOf(e.expires) - Date.parse(e.at) > (WAIVER_MAX_DAYS + 1) * 86400000) return { refused: `A waiver stands for at most ${WAIVER_MAX_DAYS} days. The item is closed by then, or it is waived again and says why.` };
    if (standing.some((x) => x.test === t.id)) return { refused: `${t.id} already has a waiver standing, until ${standing.find((x) => x.test === t.id)!.expires}.` };
    if (w.waivers.some((x) => x.test === t.id && x.state === 'AWAITING_REVIEW')) return { refused: `${t.id} already has a waiver awaiting its engineering review.` };
  } else if (e.kind === 'REVIEW_WAIVER') {
    if (!may.reviewWaiver) return { refused: 'This role cannot give an engineering review of a waiver.' };
    const x = w.waivers.find((v) => v.test === t.id); if (!x) return { refused: `${t.id} has no waiver to review.` };
    if (x.kind !== 'technical') return { refused: `${t.id} is a business-risk acceptance; it takes no engineering review.` };
    if (x.state !== 'AWAITING_REVIEW') return { refused: x.state === 'STANDING' ? `The waiver on ${t.id} is already reviewed.` : `The waiver on ${t.id} is not awaiting review.` };
    if (x.by.role === e.by.role) return { refused: 'The engineering review comes from a different role than the one that gave the waiver.' };
    if (w.tests.some((v) => v.recordedBy?.role === e.by.role || v.verifiedBy?.role === e.by.role)) return { refused: 'The engineering review is independent of the work: a role that recorded or verified a result in this dossier cannot review a waiver in it.' };
    if (e.finding.trim().length < WAIVER_MIN_PLAN) return { refused: 'Give the engineering view: what the deviation means for the room, and any condition on it.' };
    if (e.finding.length > 400) return { refused: 'Keep the review to 400 characters.' };
  } else if (e.kind === 'RAISE') {
    if (!may.raise) return { refused: 'This role cannot raise a deficiency.' };
    if (t.result !== 'FAIL') return { refused: `${t.id} does not fail; a deficiency is raised against a failure.` };
    if (w.deficiencies.some((x) => x.test === t.id && x.state !== 'CLOSED')) return { refused: `${t.id} already has an open deficiency.` };
    if (e.statement.trim().length < 12) return { refused: 'State the deficiency in a sentence.' };
  }
  return { events: [...events, e] };
}

// ---- QR resolution (v1.6 QR Hub): one identifier, one passport, and a stated reason whenever it does not resolve ----
export type QrStatus = 'ACTIVE' | 'REVOKED' | 'REPLACED' | 'EXPIRED';
export interface QrLabel { id: string; tenant: string; entity: 'asset' | 'room'; status: QrStatus; replacedBy?: string; note?: string }
export type QrParse = { ok: true; id: string; tenant: string | null; entity: string | null } | { ok: false; error: 'empty' | 'too_long' | 'malformed' | 'unsupported_version' | 'not_a_demo_label' };
const ID = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9.]+){1,5}$/;

/** Read what a label says. Accepts the demonstration payload or a bare identifier typed by hand; anything else is refused, never guessed. */
export function parseQr(input: string): QrParse {
  const s = (input || '').trim(); if (!s) return { ok: false, error: 'empty' }; if (s.length > 200) return { ok: false, error: 'too_long' };
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) || /[<>"'`\\\s]/.test(s)) return { ok: false, error: s.includes('|') ? 'malformed' : 'not_a_demo_label' };
  if (!s.includes('|')) { const id = s.toUpperCase(); return ID.test(id) && id.length <= 40 ? { ok: true, id, tenant: null, entity: null } : { ok: false, error: 'malformed' }; }
  const parts = s.split('|'); if (parts[0] !== 'EMPATHIA-DEMO' || parts[parts.length - 1] !== 'NOT-LIVE') return { ok: false, error: 'not_a_demo_label' };
  const kv: Record<string, string> = {};
  for (const p of parts.slice(1, -1)) { const i = p.indexOf('='); if (i < 1 || kv[p.slice(0, i)] !== undefined) return { ok: false, error: 'malformed' }; kv[p.slice(0, i)] = p.slice(i + 1); }
  if (Object.keys(kv).some((k) => !['v', 'tenant', 'entity', 'id'].includes(k))) return { ok: false, error: 'malformed' };
  if (kv['v'] !== '1') return { ok: false, error: 'unsupported_version' };
  const id = kv['id'] || ''; if (!ID.test(id) || id.length > 40 || !/^[a-z_]{2,40}$/.test(kv['tenant'] || '') || !/^[a-z_]{2,30}$/.test(kv['entity'] || '')) return { ok: false, error: 'malformed' };
  return { ok: true, id, tenant: kv['tenant']!, entity: kv['entity']! };
}

export type QrResolution =
  | { state: 'RESOLVED'; label: QrLabel }
  | { state: 'REPLACED'; label: QrLabel; current: QrLabel | null }
  | { state: 'REVOKED' | 'EXPIRED'; label: QrLabel }
  | { state: 'NOT_FOUND' };   // also the answer for another tenant's label: whether it exists elsewhere is never disclosed

export function resolveQr(p: Extract<QrParse, { ok: true }>, tenant: string, labels: readonly QrLabel[]): QrResolution {
  if (p.tenant && p.tenant !== tenant) return { state: 'NOT_FOUND' };
  const l = labels.find((x) => x.id === p.id && x.tenant === tenant && (!p.entity || p.entity === x.entity)); if (!l) return { state: 'NOT_FOUND' };
  if (l.status === 'ACTIVE') return { state: 'RESOLVED', label: l };
  if (l.status === 'REPLACED') return { state: 'REPLACED', label: l, current: labels.find((x) => x.id === l.replacedBy && x.tenant === tenant && x.status === 'ACTIVE') || null };
  return { state: l.status, label: l };
}

/** The demonstration tenant's labels: the fixture, and one of each state a label can be in besides active. */
export const DEMO_TENANT = 'corporate_demo';
export const DEMO_LABELS: QrLabel[] = [
  { id: 'SIM-AV-0042', tenant: DEMO_TENANT, entity: 'asset', status: 'ACTIVE' },
  { id: 'SIM-AV-0031', tenant: DEMO_TENANT, entity: 'asset', status: 'REPLACED', replacedBy: 'SIM-AV-0042', note: 'The processor this label was on was replaced.' },
  { id: 'SIM-AV-0017', tenant: DEMO_TENANT, entity: 'asset', status: 'REVOKED', note: 'The label was reported missing and withdrawn.' },
  { id: 'SIM-AV-0009', tenant: DEMO_TENANT, entity: 'asset', status: 'EXPIRED', note: 'A temporary label printed for installation; its period has ended.' },
];
