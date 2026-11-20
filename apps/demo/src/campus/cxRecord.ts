/**
 * The commissioning composition of one room record (V2.5.3's five phases, the three reasons acceptance is blocked, the result
 * labels), shared by the page (pages/RoomRecords.tsx) and the completion package (export/cx.ts) so a downloaded report can never
 * say something the page does not. Computed from the record; nothing typed in. No DOM, so it runs in Node too.
 */
import { openIssues, type RoomRecord } from './design.js';
import { runPhases, type PhaseItem } from '../phases/universal.js';

export interface CxRow { id: string; label: string; pack: string | null; domain: string; phase: number; tier: number; applicable: boolean; result?: string; evidence?: string[]; verifier?: string; instrument?: boolean; devices?: string[]; justification?: string[] | string; why?: string[] }
export const rowsOf = (r: RoomRecord): CxRow[] => ((r.analysis.applicability as unknown as { rows?: CxRow[] }).rows || []);
export const PHASES: Array<[number, string, string]> = [[1, 'Readiness', 'Is everything in place to start?'], [2, 'Physical QA', 'Is it installed where and how the design says?'], [3, 'Infrastructure and platform', 'Is it connected, registered and on the validated versions?'], [4, 'Functional', 'Does each function work, end to end?'], [5, 'Operational and experience', 'Can people use the room for what it is for?']];
export type CxTone = 'ok' | 'warn' | 'bad' | 'muted';
export const RES: Record<string, { label: string; tone: CxTone }> = { PASS_VERIFIED: { label: 'Pass', tone: 'ok' }, PASS_UNVERIFIED: { label: 'Pass · awaiting verification', tone: 'warn' }, FAIL: { label: 'Fail', tone: 'bad' }, NOT_SUPPORTED: { label: 'Not supported', tone: 'muted' }, INCONCLUSIVE: { label: 'Inconclusive', tone: 'warn' }, NOT_TESTED: { label: 'Not run', tone: 'muted' } };
export const res = (x?: string) => RES[x || 'NOT_TESTED'] || RES.NOT_TESTED!;
export const ymd = (s?: string | null) => (s ? s.slice(0, 10) : '—');

/** The five phases on the universal phase engine (phases/universal.ts): a verified pass is pass, a FAIL fails, an untested row is pending,
 *  any other result (awaiting verification, not supported, …) has run. Same verdicts as before the engine was shared. */
export function phaseStats(r: RoomRecord) {
  const rows = rowsOf(r).filter((x) => x.applicable);
  const items: PhaseItem[] = rows.map((x) => ({ id: x.id, phase: x.phase, label: x.id, why: '', result: x.result === 'PASS_VERIFIED' ? 'pass' : x.result === 'FAIL' ? 'fail' : !x.result || x.result === 'NOT_TESTED' ? 'pending' : 'ran' }));
  const run = runPhases(PHASES.map(([n, name, q]) => ({ n, name, q })), items);
  return run.map((p) => { const ps = rows.filter((x) => x.phase === p.n); return { n: p.n, name: p.name, q: p.q, rows: ps, pass: p.pass, fail: p.fail, run: p.pass + p.ran + p.fail, verdict: p.verdict }; });
}
export const VERDICT: Record<string, string> = { none: 'No applicable check', pass: 'Pass', fail: 'Fail', notrun: 'Not run', partial: 'Partial' };
/** Why acceptance is blocked (V2.5.3's three reasons), from the record. */
export function blockers(r: RoomRecord) {
  const rows = rowsOf(r).filter((x) => x.applicable); const open = openIssues(r);
  const critical = open.filter((i) => i.severity === 'High'); const missing = rows.filter((x) => !x.result || x.result === 'NOT_TESTED' || x.result === 'PASS_UNVERIFIED'); const must = rows.filter((x) => x.result === 'FAIL');
  const exceptions = open.filter((i) => i.severity !== 'High');
  return { critical, missing, must, exceptions, blocked: !!(critical.length || missing.length || must.length) };
}
/** The requirement each domain of the archetype's table states (the trace view). */
export const REQ_OF: Record<string, string> = { Audio: 'Every seat is heard clearly by the far end', Video: 'Every intended seat is seen by the far end', Display: 'Every seat can read the content', Network: 'The room reaches its services on the validated path', Compute: 'A meeting starts with one touch', Control: 'Every control does what its label says', Power: 'The room returns to a working state after a power interruption', Change: 'A change to the room is traced and approved' };
export const MUST = new Set(['Audio', 'Video', 'Network', 'Change']);
export const DESIGN_RE: Record<string, RegExp> = { Audio: /mic|dsp|speaker|amp/, Video: /camera|bar/, Display: /display|ledwall|projector|switcher/, Network: /switch|encoder/, Compute: /compute/, Control: /control|touch|scheduler/, Power: /rack/ };
/** One row per requirement: requirement → design positions → checks → evidence → result. */
export function traceRows(r: RoomRecord) {
  const rows = rowsOf(r).filter((x) => x.applicable);
  return [...new Set(rows.map((x) => x.domain))].slice(0, 8).map((d) => {
    const cs = rows.filter((x) => x.domain === d); const design = r.positions.filter((p) => !p.furniture && DESIGN_RE[d]?.test(p.cat));
    const fail = cs.find((x) => x.result === 'FAIL'); const nr = cs.filter((x) => !x.result || x.result === 'NOT_TESTED'); const ev = cs.flatMap((x) => x.evidence || []).filter((x, i, a) => a.indexOf(x) === i);
    return { domain: d, requirement: REQ_OF[d] || `${d} as the standard requires`, priority: MUST.has(d) ? 'Must have' : 'Should have', design, checks: cs, evidence: ev, fail, notRun: nr, result: (fail ? 'FAIL' : nr.length ? 'Not yet proven' : 'PROVEN') as 'FAIL' | 'Not yet proven' | 'PROVEN' };
  });
}
export const accepted = (r: RoomRecord) => r.lifecycle === 'ACCEPTED' || r.lifecycle === 'OPERATIONAL';
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const current = (r: RoomRecord) => r.baselines.find((b) => b.state === 'CURRENT') || null;
export type CxState = 'accepted' | 'conditions' | 'blocked' | 'progress' | 'notstarted';
export const CX_LABEL: Record<CxState, { label: string; tone: CxTone }> = { accepted: { label: 'Accepted', tone: 'ok' }, conditions: { label: 'Accepted with conditions', tone: 'warn' }, blocked: { label: 'Blocked', tone: 'bad' }, progress: { label: 'In commissioning', tone: 'warn' }, notstarted: { label: 'Not started', tone: 'muted' } };
/** The estate's commissioning state of a room (pages/Estate.tsx shows it; the completion package states it). */
export function cxState(r: RoomRecord): { state: CxState; why: string } {
  const open = openIssues(r); const high = open.filter((i) => i.severity === 'High');
  if (accepted(r)) return open.length ? { state: 'conditions', why: `${plural(open.length, 'open deficiency', 'open deficiencies')}: ${open[0]!.title}` } : !current(r) ? { state: 'conditions', why: 'no baseline on record (earlier record)' } : { state: 'accepted', why: `baseline v${current(r)!.version} current` };
  if (r.lifecycle === 'COMMISSIONING') {
    if (r.counts.failed) return { state: 'blocked', why: `${plural(r.counts.failed, 'test')} failed${high.length ? `; ${high[0]!.title}` : ''}` };
    if (high.length) return { state: 'blocked', why: high[0]!.title };
    if (r.exception) return { state: 'blocked', why: `${r.exception.id} waits for an independent reviewer` };
    return { state: 'progress', why: r.counts.notTested ? `${r.counts.notTested} of ${r.counts.applicable} tests still to record` : r.nextStep?.blockers[0] || 'awaiting acceptance' };
  }
  return { state: 'notstarted', why: r.nextStep?.blockers[0] || r.lifecycle.replace(/_/g, ' ').toLowerCase() };
}
