/** The speech-intelligibility report: the readings with their meter and conditions, the project's policy, the verdict with its reasons
 *  and flags, and any intelligibility exception with its requester and approver. Synthetic readings are labelled; no STI is computed. */
import { SITE } from '../campus/canon.js';
import type { Report } from './model.js';
import type { MadeBy } from './cx.js';
import type { Reading, Policy, Evaluation, ExceptionRecord, Chain } from '../bench/sti.js';

export const CHAIN_WORD: Record<Chain, string> = { 'meter-calibrated': 'STI meter, calibration on file', meter: 'STI meter, no calibration on file', 'phone-app': 'Phone or app (indicative only)' };
export function stiPackage(x: { readings: Reading[]; policy: Policy; ev: Evaluation; exceptions: ExceptionRecord[]; synthetic: boolean; room: string }, by: MadeBy): Report {
  const { ev, policy: p } = x; const approved = x.exceptions.filter((e) => e.approvedBy);
  const carried = ev.verdict === 'BELOW_POLICY' && approved.some((e) => ev.short.every((s) => e.positions.includes(s)));
  return {
    schema: 'empathia.report/1', id: `STI-${by.at.slice(0, 10)}-${x.readings.length}P`, kind: 'speech-intelligibility', title: 'Speech intelligibility (STI)', subtitle: `${x.room} · ${p.name}`,
    scope: { tenant: SITE.enterprise, site: SITE.name, building: '—', floor: '—', room: x.room, roomId: '' },
    status: { label: ev.verdict === 'MEETS_POLICY' ? 'Meets the project policy' : ev.verdict === 'NO_VERDICT' ? 'No verdict' : carried ? 'Below the policy, carried by an approved exception' : 'Below the project policy', tone: ev.verdict === 'MEETS_POLICY' ? 'ok' : ev.verdict === 'NO_VERDICT' ? 'muted' : carried ? 'warn' : 'bad', why: [...ev.why, ...ev.flags].join('; ') || 'every position and the mean meet the policy' },
    generatedAt: by.at, role: by.role, build: by.build, primary: 'Readings',
    provenance: [
      ...(x.synthetic ? ['Synthetic readings: example values entered for the demonstration, not a measurement of any room.'] : []),
      'STI values as reported by the meter at each position; this report computes no STI and reproduces no standard.',
      `Thresholds are the project's policy ${p.id} (“${p.name}”), not a requirement quoted from a standard.`,
      ...(ev.indicative ? ['Includes phone or app readings: indicative only, not commissioning evidence.'] : []),
      'A comparison with the policy is not a commissioning result on its own: the test is recorded with these readings as evidence and verified by someone else.',
      `Made as ${by.role}: a perspective on the record, which grants no permission.`,
    ],
    headline: `${ev.n} position${ev.n === 1 ? '' : 's'}; mean STI ${ev.mean?.toFixed(2) ?? '—'}, lowest ${ev.min?.toFixed(2) ?? '—'}. ${ev.verdict === 'MEETS_POLICY' ? 'Meets the policy.' : ev.why.join('; ') + '.'}`,
    kpis: [{ label: 'Positions', value: String(ev.n), note: `policy needs ${p.minPositions}` }, { label: 'Mean STI', value: ev.mean?.toFixed(2) ?? '—', note: `policy ${p.minMean.toFixed(2)}` }, { label: 'Lowest', value: ev.min?.toFixed(2) ?? '—', note: `policy ${p.minEach.toFixed(2)} at each position` }, { label: 'Exceptions', value: String(x.exceptions.length), note: `${approved.length} approved` }],
    chart: { title: 'STI by position', categories: ev.readings.map((r) => r.position), series: [{ name: 'STI', tone: 'info', values: ev.readings.map((r) => r.sti) }] },
    sections: [
      { id: 'policy', heading: 'The project policy', facts: [['Policy', `${p.id} · ${p.name}`], ['At each position', `at least ${p.minEach.toFixed(2)}`], ['Mean', `at least ${p.minMean.toFixed(2)}`], ['Positions', `at least ${p.minPositions}`], ['Life-safety', p.lifeSafety ? 'yes: no exception carries a shortfall' : 'no']] },
      { id: 'readings', heading: 'Readings', table: { title: 'Readings', cols: [{ key: 'pos', label: 'Position' }, { key: 'sti', label: 'STI', kind: 'number' }, { key: 'ok', label: 'Against the policy', kind: 'status' }, { key: 'occ', label: 'Occupied' }, { key: 'meter', label: 'Meter' }, { key: 'chain', label: 'Chain' }, { key: 'at', label: 'When', kind: 'date' }],
        rows: ev.readings.map((r) => ({ pos: r.position, sti: r.sti, ok: r.ok ? 'Meets' : 'Below', occ: r.occupied ? 'yes' : 'no', meter: r.meter, chain: CHAIN_WORD[r.chain], at: r.at.slice(0, 10) })) } },
      { id: 'verdict', heading: 'Verdict', bullets: [...(ev.why.length ? ev.why : ['every position and the mean meet the policy']), ...ev.flags.map((f) => `Flag: ${f}`)] },
      { id: 'exceptions', heading: 'Intelligibility exceptions', table: { title: 'Exceptions', cols: [{ key: 'id', label: 'Record' }, { key: 'pos', label: 'Positions' }, { key: 'reason', label: 'Reason' }, { key: 'measures', label: 'Compensating measures' }, { key: 'exp', label: 'Expires', kind: 'date' }, { key: 'req', label: 'Requested by' }, { key: 'appr', label: 'Approved by' }, { key: 'state', label: 'State', kind: 'status' }],
        rows: x.exceptions.map((e) => ({ id: e.id, pos: e.positions.join(', '), reason: e.reason, measures: e.measures, exp: e.expires, req: e.requestedBy, appr: e.approvedBy || '', state: e.approvedBy ? 'Approved' : 'Requested' })) } },
    ],
    dossier: { policy: p, readings: x.readings, evaluation: { verdict: ev.verdict, mean: ev.mean, min: ev.min, n: ev.n, why: ev.why, flags: ev.flags }, exceptions: x.exceptions, synthetic: x.synthetic },
  };
}
