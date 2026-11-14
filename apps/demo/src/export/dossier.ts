/**
 * The commissioning dossier (#/dossier/<report>) as a Report (./model.ts), so the six writers make its PDF, Word, Excel, PowerPoint,
 * CSV and JSON from the one replay of the record the page shows: the snapshot plus whatever was recorded after it in this browser.
 *
 * Redaction follows the reader, as the page's JSON and CSV always have (proof/exports.ts): the engineering file carries each test's
 * evidence reference and who recorded and verified it; the executive file carries only whether evidence exists, so an evidence
 * reference never reaches a reader who may not open the evidence. The page offers the engineering file only to a role that sees it.
 *
 * What it never does: count a pending test as passed, present a waiver as a pass, or present a site champion's attestation as an
 * approval. A control (a mandatory safety or security test) is marked as never waivable in every format.
 */
import { DOSSIER_4218 as D, type Working, type WorkingTest } from '@empathia/proof-registry';
import { SITE } from '../campus/canon.js';
import type { Report, Section, Tone } from './model.js';
import type { MadeBy } from './cx.js';

export type Redaction = 'executive' | 'engineering';
const RESULT = { PASS: 'Pass', PENDING: 'Pending', FAIL: 'Fail' } as const;
const SIGNOFF: Record<Working['signoff'], string> = { TESTS_OPEN: 'Tests still open', AWAITING_FIRST: 'Awaiting the first approval', AWAITING_SECOND: 'Awaiting the second approval', COMPLETE: 'Both approvals given' };
const WAIVER: Record<string, string> = { STANDING: 'Standing', AWAITING_REVIEW: 'Awaiting engineering review', EXPIRED: 'Run out', MOOT: 'No longer needed', VOID: 'Covers nothing' };
const DEF: Record<string, string> = { OPEN: 'Open', CORRECTED_AWAITING_RETEST: 'Corrected, awaiting retest', CLOSED: 'Closed' };
const ymd = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '');
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function dossierPackage(w: Working, redaction: Redaction, by: MadeBy): Report {
  const eng = redaction === 'engineering'; const t = w.totals;
  const accepted = w.acceptance === 'ACCEPTED';
  const tone: Tone = accepted ? 'ok' : w.tests.some((x) => x.result === 'FAIL') ? 'bad' : 'warn';
  const standing = w.waivers.filter((x) => x.state === 'STANDING');
  const disciplines = [...new Set(w.tests.map((x) => x.discipline))];
  const waivedUntil = (x: WorkingTest) => standing.find((s) => s.test === x.id)?.expires ?? '';
  const why = accepted ? `final acceptance recorded${standing.length ? ` over ${plural(standing.length, 'standing waiver')}` : ''}`
    : `${plural(w.open.length, 'item')} stand${w.open.length === 1 ? 's' : ''} between the record and acceptance`;
  const testCols = [
    { key: 'id', label: 'Test' }, { key: 'discipline', label: 'Discipline' }, { key: 'name', label: 'What it proves' }, { key: 'result', label: 'Result', kind: 'status' as const },
    ...(eng ? [{ key: 'evidence', label: 'Evidence' }, { key: 'recorded', label: 'Recorded by' }, { key: 'verified', label: 'Verified by' }] : [{ key: 'has', label: 'Evidence on file' }]),
    { key: 'control', label: 'Control' }, { key: 'waived', label: 'Waived until', kind: 'date' as const },
  ];
  const sections: Section[] = [
    { id: 'decision', heading: 'Acceptance decision', text: [accepted ? `Final acceptance is recorded: ${why}.` : `Final acceptance is held: ${why}.`, 'A passing simulation is not commissioning; this dossier records what was tested and evidenced, and nothing is rounded towards green.'],
      facts: [['Acceptance', accepted ? 'Accepted' : 'Held'], ['Final sign-off', SIGNOFF[w.signoff]],
        ['First approval', w.firstApproval ? `${w.firstApproval.by.label}, ${ymd(w.firstApproval.at)}${w.firstApproval.waivers ? `, over ${plural(w.firstApproval.waivers, 'waiver')}` : ''}` : 'Not given'],
        ['Second approval', w.secondApproval ? `${w.secondApproval.by.label}, ${ymd(w.secondApproval.at)}${w.secondApproval.waivers ? `, over ${plural(w.secondApproval.waivers, 'waiver')}` : ''}` : 'Not given'],
        ['Basis', w.changed ? 'The reference snapshot and the events recorded after it in this browser' : 'The reference snapshot, unchanged']],
      bullets: w.open.length ? w.open.map((b) => `${b.test ? `${b.test}: ` : ''}${b.reason}`) : ['Nothing stands between the record and acceptance.'] },
    { id: 'scope', heading: 'Scope', facts: [['Report', D.id], ['Project', D.project], ['Room', `${D.room.name} (${D.room.id})`], ['Site', D.room.site], ['Asset', `${D.asset.id}, ${D.asset.kind} (a class of device; no make, model or serial)`], ['Scope', D.scope], ['Snapshot made', ymd(D.generatedAt)]] },
    { id: 'tests', heading: 'Tests', text: [eng ? 'Every test with its evidence reference and who recorded and verified it.' : 'Every test with its result and whether evidence is on file. Evidence references are in the engineering export.'],
      table: { title: 'Tests', cols: testCols, note: 'A control is a mandatory safety or security test and is never waived.',
        rows: w.tests.map((x) => ({ id: x.id, discipline: x.discipline, name: x.name, result: RESULT[x.result],
          ...(eng ? { evidence: x.evidence ?? '', recorded: x.recordedBy?.label ?? '', verified: x.verifiedBy?.label ?? '' } : { has: x.evidence ? 'Yes' : 'No' }),
          control: x.control ? 'Yes: never waived' : '', waived: waivedUntil(x) })) } },
    { id: 'deficiencies', heading: 'Deficiencies', table: { title: 'Deficiencies', cols: [{ key: 'id', label: 'Deficiency' }, { key: 'sev', label: 'Severity' }, { key: 'test', label: 'Test' }, { key: 'statement', label: 'Statement' }, { key: 'owner', label: 'Owner' }, { key: 'action', label: 'Action' }, { key: 'state', label: 'State', kind: 'status' }],
      rows: w.deficiencies.map((x) => ({ id: x.id, sev: x.severity, test: x.test, statement: x.statement, owner: x.owner, action: x.action, state: DEF[x.state] || x.state })) } },
    { id: 'blockers', heading: 'What holds acceptance', table: { title: 'Blockers', cols: [{ key: 'test', label: 'Test' }, { key: 'reason', label: 'Why it blocks' }],
      rows: w.blockers.map((b) => ({ test: b.test ?? '', reason: b.reason })), note: 'Each blocker must clear, or be waived where the rules allow, before the first approval can be given.' } },
    { id: 'waivers', heading: 'Waivers', text: ['A waiver accepts a stated risk for a stated time. It never bypasses security, tenant isolation, authorisation, evidence integrity or a mandatory safety test, and nobody approves their own.'],
      table: { title: 'Waivers', cols: [{ key: 'test', label: 'Test' }, { key: 'kind', label: 'Kind' }, { key: 'state', label: 'State', kind: 'status' }, { key: 'risk', label: 'Risk accepted' }, { key: 'until', label: 'Stands until', kind: 'date' }, { key: 'by', label: 'Granted by' }, { key: 'review', label: 'Engineering review' }],
        rows: w.waivers.map((x) => ({ test: x.test, kind: x.kind === 'business' ? 'Business-risk acceptance' : 'Technical deviation', state: WAIVER[x.state] || x.state, risk: x.risk, until: x.expires, by: x.by.label, review: x.review ? `${x.review.by.label}: ${x.review.finding}` : '' })) } },
    { id: 'attestations', heading: 'Site champion attestations', text: ['An attestation is a local statement by the site champion. It is recorded beside the dossier and is not an approval.'],
      table: { title: 'Attestations', cols: [{ key: 'at', label: 'Date', kind: 'date' }, { key: 'by', label: 'By' }, { key: 'statement', label: 'Statement' }], rows: w.attestations.map((a) => ({ at: ymd(a.at), by: a.by.label, statement: a.statement })) } },
  ];
  return {
    schema: 'empathia.report/1', id: `${D.id}-${redaction}`, kind: 'commissioning-dossier', title: 'Commissioning dossier', subtitle: `${D.room.name} · ${eng ? 'engineering' : 'executive'} export`,
    scope: { tenant: SITE.enterprise, site: SITE.name, building: 'Atlas Tower', floor: 'Floor 4', room: D.room.name, roomId: D.room.id },
    status: { label: accepted ? 'Accepted' : 'Held', tone, why }, generatedAt: by.at, role: by.role, build: by.build, primary: 'Tests',
    provenance: [
      'Synthetic demonstration: every room, person and record is invented and connected to no real system.',
      `Reference snapshot ${D.id} (${ymd(D.generatedAt)})${w.changed ? ', with the events recorded after it in this browser replayed over it' : ', unchanged'}.`,
      eng ? 'Engineering redaction: evidence references and the people who recorded and verified each test are included.' : 'Executive redaction: evidence references are left out; each test says only whether evidence is on file.',
      `Made as ${by.role}: a perspective on the record, which grants no permission.`,
    ],
    headline: `${D.room.name}: final acceptance ${accepted ? 'recorded' : 'held'}. ${t.pass} of ${t.tests} tests pass, ${t.pending} pending, ${t.fail} failing; evidence for ${t.evidence} of ${t.tests}.${w.open.length ? ` ${plural(w.open.length, 'item')} open.` : ''}`,
    kpis: [
      { label: 'Tests passing', value: `${t.pass} of ${t.tests}`, note: `${t.pending} pending · ${t.fail} failing` },
      { label: 'Evidence on file', value: `${t.evidence} of ${t.tests}`, note: t.awaitingVerification ? `${t.awaitingVerification} awaiting independent verification` : 'nothing awaits verification' },
      { label: 'Open deficiencies', value: String(w.deficiencies.filter((x) => x.state !== 'CLOSED').length), note: `${w.deficiencies.length} on record` },
      { label: 'Standing waivers', value: String(standing.length), note: `${w.waivers.length} on record` },
      { label: 'Final sign-off', value: SIGNOFF[w.signoff] },
    ],
    chart: { title: 'Results by discipline', categories: disciplines, series: (['PASS', 'PENDING', 'FAIL'] as const).map((k) => ({ name: RESULT[k], tone: ({ PASS: 'ok', PENDING: 'warn', FAIL: 'bad' } as const)[k], values: disciplines.map((d) => w.tests.filter((x) => x.discipline === d && x.result === k).length) })) },
    sections,
    dossier: {
      report: D.id, redaction, basis: w.changed ? 'working' : 'snapshot', acceptance: w.acceptance, signoff: w.signoff,
      tests: w.tests.map((x) => ({ id: x.id, discipline: x.discipline, result: x.result, control: x.control ?? null, ...(eng ? { evidence: x.evidence, recordedBy: x.recordedBy?.role ?? null, verifiedBy: x.verifiedBy?.role ?? null } : { hasEvidence: !!x.evidence }), changed: x.changed })),
      deficiencies: w.deficiencies.map((x) => ({ id: x.id, severity: x.severity, test: x.test, state: x.state })),
      waivers: w.waivers.map((x) => ({ test: x.test, kind: x.kind, state: x.state, expires: x.expires })),
      blockers: w.blockers, attestations: w.attestations.map((a) => ({ at: a.at, approval: false })),
    },
  };
}
