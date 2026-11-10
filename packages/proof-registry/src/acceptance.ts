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
 */
import type { Dossier, DossierTest, Deficiency, TestResult } from './seed.js';

export interface Actor { role: string; label: string }
/** What the caller's access policy lets this actor do. The rules below are applied on top of it, never instead of it. */
export interface Authority { record: boolean; verify: boolean; raise: boolean; /** may give the first approval of the final sign-off */ accept: boolean; /** may give the second */ countersign: boolean }
export type DossierEvent =
  | { kind: 'RETEST'; test: string; result: 'PASS' | 'FAIL'; evidence: string | null; by: Actor; at: string }
  | { kind: 'EVIDENCE'; test: string; evidence: string; by: Actor; at: string }
  | { kind: 'VERIFY'; test: string; by: Actor; at: string }
  | { kind: 'RAISE'; test: string; id: string; statement: string; by: Actor; at: string }
  | { kind: 'ACCEPT'; by: Actor; at: string }
  | { kind: 'COUNTERSIGN'; by: Actor; at: string };

export interface WorkingTest extends DossierTest { recordedBy: Actor | null; verifiedBy: Actor | null; changed: boolean }
export interface WorkingDeficiency extends Omit<Deficiency, 'state'> { state: Deficiency['state'] | 'CLOSED'; raisedAfterSnapshot: boolean }
export interface Blocker { test: string | null; reason: string }
export interface Working {
  tests: WorkingTest[]; deficiencies: WorkingDeficiency[];
  totals: { tests: number; pass: number; pending: number; fail: number; evidence: number; awaitingVerification: number };
  blockers: Blocker[]; acceptance: 'HELD' | 'ACCEPTED'; acceptedBy: Actor | null; acceptedAt: string | null; changed: boolean;
  /** Phase 6. TESTS_OPEN: blockers stand. AWAITING_FIRST: ready for the first approval. AWAITING_SECOND: first given. COMPLETE: both. */
  signoff: 'TESTS_OPEN' | 'AWAITING_FIRST' | 'AWAITING_SECOND' | 'COMPLETE'; firstApproval: { by: Actor; at: string } | null; secondApproval: { by: Actor; at: string } | null;
}

export function replay(d: Dossier, events: readonly DossierEvent[]): Working {
  const tests: WorkingTest[] = d.tests.map((t) => ({ ...t, recordedBy: null, verifiedBy: null, changed: false }));
  const defs: WorkingDeficiency[] = d.deficiencies.map((x) => ({ ...x, raisedAfterSnapshot: false }));
  const byId = (id: string) => tests.find((t) => t.id === id);
  let first: { by: Actor; at: string } | null = null; let second: { by: Actor; at: string } | null = null;
  for (const e of events) {
    if (e.kind === 'ACCEPT') { first = { by: e.by, at: e.at }; second = null; continue; }
    if (e.kind === 'COUNTERSIGN') { if (first && e.by.role !== first.by.role) second = { by: e.by, at: e.at }; continue; }   // a second approval with no first, or from the first's own role, is not one
    const t = byId(e.test); if (!t) continue;
    first = null; second = null;                                                    // an approval covers the record as it stood: any later result, evidence, verification or deficiency withdraws it
    if (e.kind === 'RETEST') { t.result = e.result; t.evidence = e.evidence ?? t.evidence; t.recordedBy = e.by; t.verifiedBy = null; t.changed = true; delete t.note; }
    else if (e.kind === 'EVIDENCE') { t.evidence = e.evidence; t.recordedBy = e.by; t.verifiedBy = null; t.changed = true; }
    else if (e.kind === 'VERIFY') t.verifiedBy = e.by;
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
  if (blockers.length || (first && worked(first.by))) { first = null; second = null; } if (second && worked(second.by)) second = null;
  const accepted = !!first && !!second; const acceptedBy = first?.by ?? null; const acceptedAt = second?.at ?? null;
  const signoff: Working['signoff'] = blockers.length ? 'TESTS_OPEN' : !first ? 'AWAITING_FIRST' : !second ? 'AWAITING_SECOND' : 'COMPLETE';
  return { tests, deficiencies: defs, totals: { tests: tests.length, pass: n('PASS'), pending: n('PENDING'), fail: n('FAIL'), evidence: tests.filter((t) => t.evidence).length, awaitingVerification: tests.filter((t) => t.changed && t.result === 'PASS' && t.evidence && !t.verifiedBy).length },
    blockers, acceptance: accepted ? 'ACCEPTED' : 'HELD', acceptedBy: accepted ? acceptedBy : null, acceptedAt: accepted ? acceptedAt : null, changed: events.length > 0, signoff, firstApproval: first, secondApproval: second };
}

/** Try one step. Returns the new event list, or the reason it is refused; a refusal changes nothing. */
export function attempt(d: Dossier, events: readonly DossierEvent[], e: DossierEvent, may: Authority): { events: DossierEvent[] } | { refused: string } {
  const w = replay(d, events);
  if (w.acceptance === 'ACCEPTED') return { refused: 'The dossier is accepted and closed. A change after acceptance is a new commissioning cycle.' };
  if (e.kind === 'ACCEPT') {
    if (!may.accept) return { refused: 'This role cannot record acceptance.' };
    if (w.blockers.length) { const first = w.blockers.slice(0, 3).map((b) => `${b.test} ${b.reason}`).join('; '); return { refused: `Acceptance stays held: ${w.blockers.length} ${w.blockers.length === 1 ? 'blocker stands' : 'blockers stand'} (${first}${w.blockers.length > 3 ? '; and more' : ''}).` }; }
    // the policy's own description of an acceptor: someone who neither recorded nor verified what is being accepted
    if (w.tests.some((x) => x.recordedBy?.role === e.by.role || x.verifiedBy?.role === e.by.role)) return { refused: 'Acceptance is independent of the work it accepts: a role that recorded or verified a result in this dossier cannot also accept it.' };
    if (w.firstApproval) return { refused: `The first approval is already recorded, by the ${w.firstApproval.by.label}. The dossier now waits for the second.` };
    return { events: [...events, e] };
  }
  if (e.kind === 'COUNTERSIGN') {
    if (!may.countersign) return { refused: 'This role cannot give the second approval.' };
    if (w.blockers.length) return { refused: `The second approval cannot be given while ${w.blockers.length} ${w.blockers.length === 1 ? 'blocker stands' : 'blockers stand'}.` };
    if (!w.firstApproval) return { refused: 'The second approval follows the first, and the first has not been given.' };
    if (w.firstApproval.by.role === e.by.role) return { refused: 'The two approvals come from two different roles.' };
    if (w.tests.some((x) => x.recordedBy?.role === e.by.role || x.verifiedBy?.role === e.by.role)) return { refused: 'Acceptance is independent of the work it accepts: a role that recorded or verified a result in this dossier cannot also approve it.' };
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
