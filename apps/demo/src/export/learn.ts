/**
 * Empathia Learn as a Report (./model.ts): the governed cases (each lesson with its source incident, the customer's permission, the
 * de-identification, the SME review and the steward's approval) and the record of the person it is made for (their readiness, the
 * drills they answered and the labs they passed), as #/v25/learn shows them.
 *
 * What it never does: carry another person's training record (a perspective's practice is its own), present practice as a credential
 * or as authority to work, or carry a case that is not de-identified beyond its identifier and state.
 */
import { SITE } from '../campus/canon.js';
import type * as S from '../workspace/store.js';
import type { LabResult } from '../learn/store.js';
import type { Report } from './model.js';
import type { MadeBy } from './cx.js';

const STATE: Record<string, string> = { PROPOSED: 'Proposed', SME_REVIEWED: 'SME reviewed', REJECTED: 'Rejected', APPROVED: 'Approved' };
const ymd = (s: string | null | undefined) => (s ? s.slice(0, 10) : '');
export interface LearnInput { persona: string; personaLabel: (k: string) => string; labs: LabResult[]; drillTitle?: (id: string) => string | undefined; readiness: { points: number; level: string; drills: number; cases: number; next: { name: string; need: number } | null } }

export function learnPackage(w: S.Workspace, x: LearnInput, by: MadeBy): Report {
  const L = x.personaLabel; const cases = w.learnCases;
  const mine = w.training.filter((t) => t.by === x.persona); const labs = x.labs.filter((l) => l.persona === x.persona);
  const approved = cases.filter((c) => c.state === 'APPROVED');
  const states = ['PROPOSED', 'SME_REVIEWED', 'APPROVED', 'REJECTED'];
  return {
    schema: 'empathia.report/1', id: `LEARN-${x.persona}`, kind: 'learn-record', title: 'Learn record', subtitle: `Reviewed cases and ${L(x.persona)}’s practice`,
    scope: { tenant: SITE.enterprise, site: SITE.name, building: 'All buildings', floor: 'All floors', room: 'All rooms', roomId: '' },
    status: { label: x.readiness.level, tone: 'muted', why: `${x.readiness.points} readiness points; practice evidence only, never an authorization to work` },
    generatedAt: by.at, role: by.role, build: by.build, primary: 'Cases',
    provenance: [
      'Synthetic demonstration: every room, person and record is invented and connected to no real system.',
      'A case reaches Learn only with the customer’s permission, de-identified, after an SME review and the data steward’s approval.',
      'Training performance is practice evidence. It is never a credential and never grants authority to work.',
      `This file carries the training record of ${L(x.persona)} only. Made as ${by.role}: a perspective on the record, which grants no permission.`,
    ],
    headline: `${approved.length} of ${cases.length} cases approved for Learn. ${L(x.persona)}: ${x.readiness.level.toLowerCase()} (${x.readiness.points} points), ${x.readiness.drills} drills passed, ${labs.filter((l) => l.passed).length} labs passed.`,
    kpis: [
      { label: 'Cases approved', value: `${approved.length} of ${cases.length}`, note: `${cases.filter((c) => c.state === 'PROPOSED').length} awaiting SME review` },
      { label: 'Readiness', value: x.readiness.level, note: x.readiness.next ? `${x.readiness.next.need} points to ${x.readiness.next.name.toLowerCase()}` : 'top level' },
      { label: 'Drills passed', value: String(x.readiness.drills), note: `${mine.length} attempts on record` },
      { label: 'Labs passed', value: String(labs.filter((l) => l.passed).length), note: `${labs.length} attempted` },
    ],
    chart: { title: 'Cases by state', categories: states.map((s) => STATE[s]!), series: [{ name: 'Cases', tone: 'info', values: states.map((s) => cases.filter((c) => c.state === s).length) }] },
    sections: [
      { id: 'rule', heading: 'How a case reaches Learn', bullets: ['Written from a resolved or closed service request, by a role that may propose one.', 'The customer’s permission to reuse it is recorded, and the lesson is de-identified: no room, person or tenant names.', 'An SME reviews it; the data steward, who is neither the proposer nor the reviewer, approves it.', 'An approved case links the lesson to the request’s evidence chain. It grants nobody any authority.'] },
      { id: 'cases', heading: 'Cases', table: { title: 'Cases', cols: [{ key: 'id', label: 'Case' }, { key: 'title', label: 'Title' }, { key: 'lesson', label: 'Lesson' }, { key: 'state', label: 'State', kind: 'status' }, { key: 'inc', label: 'Source request' }, { key: 'apex', label: 'APEX case' }, { key: 'perm', label: 'Permission' }, { key: 'deid', label: 'De-identified' }, { key: 'sme', label: 'SME review' }, { key: 'appr', label: 'Approved by' }],
        rows: cases.map((c) => ({ id: c.id, title: c.deidentified ? c.title : '(withheld: not de-identified)', lesson: c.deidentified ? c.lesson : '(withheld: not de-identified)', state: STATE[c.state] || c.state, inc: c.incidentId, apex: c.apexId || '', perm: c.permission ? `recorded ${ymd(c.permission.at)}` : 'Not obtained', deid: c.deidentified ? 'Yes' : 'No', sme: c.smeReview ? `${c.smeReview.decision === 'approve' ? 'Approved' : 'Rejected'} by ${L(c.smeReview.by)}, ${ymd(c.smeReview.at)}` : '', appr: c.approvedBy ? L(c.approvedBy) : '' })) } },
      { id: 'drills', heading: `${L(x.persona)}’s drills`, text: ['Each attempt as the ledger recorded it.'], table: { title: 'Drills', cols: [{ key: 'at', label: 'When' }, { key: 'drill', label: 'Drill' }, { key: 'ok', label: 'Result', kind: 'status' }, { key: 's', label: 'Seconds', kind: 'number' }],
        rows: mine.map((t) => ({ at: t.at.slice(0, 16).replace('T', ' '), drill: x.drillTitle?.(t.drillId) || t.drillId, ok: t.correct ? 'Correct' : 'Not correct', s: Math.round(t.elapsedS) })) } },
      { id: 'labs', heading: `${L(x.persona)}’s labs`, text: ['Simulated instruments. A passed lab is evidence on the person’s internal record, never a credential.'], table: { title: 'Labs', cols: [{ key: 'title', label: 'Lab' }, { key: 'domain', label: 'Domain' }, { key: 'mode', label: 'Mode' }, { key: 'ok', label: 'Result', kind: 'status' }, { key: 'n', label: 'Attempts', kind: 'number' }, { key: 'at', label: 'Last', kind: 'date' }],
        rows: labs.map((l) => ({ title: l.title, domain: l.domain, mode: l.mode, ok: l.passed ? 'Passed' : 'Not passed yet', n: l.attempts, at: ymd(l.at) })) } },
    ],
    dossier: {
      persona: x.persona, readiness: x.readiness,
      cases: cases.map((c) => ({ id: c.id, state: c.state, incidentId: c.incidentId, apexId: c.apexId, permission: !!c.permission, deidentified: c.deidentified, smeReview: c.smeReview?.decision ?? null, approvedBy: c.approvedBy })),
      training: mine.map((t) => ({ drillId: t.drillId, at: t.at, correct: t.correct })), labs: labs.map((l) => ({ lab: l.lab, passed: l.passed, attempts: l.attempts })),
    },
  };
}
