/**
 * The assurance report of one room, as a Report (./model.ts): does the room still behave as it was commissioned? The seventeen
 * dimensions over seven layers, the Commissioned ↔ current changes with their recommendations, the ready check for the next session,
 * the service requests about the room and the baseline history: every figure from the room's record and the workspace's requests,
 * through the rules #/assurance/room/:id shows (campus/asRecord.ts, assurance/model.ts).
 *
 * What it never does: present a dimension as measured (no telemetry exists in a synthetic record; a dimension with nothing to differ
 * reads as commissioned and says so), or turn a person's report into a measurement.
 */
import { openIssues, PEOPLE, type RoomRecord } from '../campus/design.js';
import { SITE, buildingByKey, shortName, fullName } from '../campus/canon.js';
import { assuranceDims, changeCards, asState, AS_LABEL, DIM_LABEL, LAYERS } from '../campus/asRecord.js';
import { readyCheckOf, criticalityOf, READY_OUT } from '../assurance/model.js';
import { ymd } from '../campus/cxRecord.js';
import type * as S from '../workspace/store.js';
import type { Report } from './model.js';
import type { MadeBy } from './cx.js';

const who = (k?: string | null) => (k ? PEOPLE[k] || k.replace(/_/g, ' ') : '—');
const DONE = ['CLOSED', 'CANCELLED'];

export function asPackage(r: RoomRecord, incidents: S.Incident[], by: MadeBy): Report {
  const o = r.outline; const b = buildingByKey(o.building); const dims = assuranceDims(r, incidents); const cards = changeCards(r);
  const st = asState(r, incidents); const L = AS_LABEL[st.state]; const rc = readyCheckOf(r, incidents);
  const inc = incidents.filter((i) => i.roomId === o.id); const openInc = inc.filter((i) => !DONE.includes(i.state));
  const cur = r.baselines.find((x) => x.state === 'CURRENT'); const fw = r.positions.filter((p) => !p.furniture);
  const n = { match: dims.filter((d) => d.state === 'match').length, drift: dims.filter((d) => d.state === 'drift').length, failed: dims.filter((d) => d.state === 'failed').length, reported: dims.filter((d) => d.state === 'reported').length };
  const off = dims.filter((d) => d.state !== 'match');
  return {
    schema: 'empathia.report/1', id: `AS-${o.id}`, kind: 'assurance-report', title: 'Assurance report', subtitle: fullName(o),
    scope: { tenant: SITE.enterprise, site: SITE.name, building: b?.name || o.building, floor: `Floor ${o.floor}`, room: shortName(o), roomId: o.id },
    status: { label: L.label, tone: L.tone, why: st.why }, generatedAt: by.at, role: by.role, build: by.build, primary: 'Dimensions',
    provenance: [
      'Synthetic demonstration: every room, person and record is invented and connected to no real system.',
      'Simulated discovery from the records: nothing was measured and no device was contacted. Where a synthetic record holds no telemetry, the dimension reads as commissioned and says so.',
      'A service request is evidence that a person observed something; Assurance does not turn it into a measurement.',
      `Made as ${by.role}: a perspective on the record, which grants no permission. A prototype, not production monitoring.`,
    ],
    headline: `${shortName(o)}: ${L.label.toLowerCase()} (${st.why}). ${n.match} of 17 dimensions match the commissioned state${off.length ? `; ${off.length} differ: ${off.slice(0, 3).map((d) => d.name).join(', ')}${off.length > 3 ? ` and ${off.length - 3} more` : ''}` : ''}. Next session: ${READY_OUT[rc.out].label.toLowerCase()}.`,
    kpis: [
      { label: 'Dimensions matching', value: `${n.match} of 17`, note: `${n.drift} drift · ${n.failed} failed · ${n.reported} reported by people` },
      { label: 'Changes since handover', value: String(cards.length), note: cards.length ? cards.slice(0, 2).map((c) => c.what).join('; ') : 'nothing changed' },
      { label: 'Ready for the next session', value: READY_OUT[rc.out].label, note: rc.first ? `${rc.first.label}: ${rc.first.why}` : 'every check that applies passes' },
      { label: 'Open service requests', value: String(openInc.length), note: `${inc.length} on record for this room` },
      { label: 'Identified units', value: `${fw.filter((p) => p.identity !== 'UNKNOWN').length} of ${fw.length}`, note: 'no make, model or serial is invented' },
      { label: 'Baseline', value: cur ? `v${cur.version}` : '—', note: cur ? `accepted ${ymd(cur.at)}` : 'never accepted: nothing to compare with' },
    ],
    chart: { title: 'Dimensions by layer', categories: LAYERS, series: (['match', 'failed', 'drift', 'reported'] as const).map((k) => ({ name: DIM_LABEL[k], values: LAYERS.map((Ly) => dims.filter((d) => d.layer === Ly && d.state === k).length) })) },
    sections: [
      { id: 'finding', heading: 'What Assurance found', text: [`${L.label}: ${st.why}.`],
        bullets: off.length ? off.map((d) => `${d.layer} · ${d.name}: ${DIM_LABEL[d.state].toLowerCase()} — ${d.note}`) : ['Every value Assurance compares reads the same as the commissioned state.'] },
      { id: 'scope', heading: 'Room and criticality', facts: [['Room', `${fullName(o)} (${o.id})`], ['Building', `${b?.name || o.building}, floor ${o.floor}`], ['Room type', r.archetypeName], ['Criticality', criticalityOf(r)], ['Lifecycle', r.lifecycle.replace(/_/g, ' ').toLowerCase()], ['Baseline', cur ? `v${cur.version} · ${cur.note}` : 'none']] },
      { id: 'dims', heading: 'Seventeen dimensions', text: ['Each dimension compares one aspect of the room now with its commissioned baseline, read from the records.'],
        table: { title: 'Dimensions', cols: [{ key: 'layer', label: 'Layer' }, { key: 'name', label: 'Dimension' }, { key: 'what', label: 'What it compares' }, { key: 'state', label: 'State', kind: 'status' }, { key: 'note', label: 'Why' }],
          rows: dims.map((d) => ({ layer: d.layer, name: d.name, what: d.what, state: d.state === 'match' ? 'Match' : d.state === 'drift' ? 'Drift' : d.state === 'failed' ? 'Failed' : 'Reported', note: d.note })) } },
      { id: 'changes', heading: 'Commissioned ↔ current', text: ['One row per value that changed since handover, with what it was, what it is and what to do.'],
        table: { title: 'Changes', cols: [{ key: 'what', label: 'What changed' }, { key: 'dim', label: 'Where' }, { key: 'before', label: 'Commissioned' }, { key: 'now', label: 'Current' }, { key: 'diff', label: 'Difference' }, { key: 'rec', label: 'Recommendation' }], rows: cards.map((c) => ({ what: c.what, dim: c.dim, before: c.before, now: c.now, diff: c.diff, rec: c.rec })) } },
      { id: 'ready', heading: 'Ready for the next session', text: [`${READY_OUT[rc.out].label}: ${READY_OUT[rc.out].rule}`],
        table: { title: 'Ready check', cols: [{ key: 'label', label: 'Check' }, { key: 'out', label: 'Result', kind: 'status' }, { key: 'why', label: 'Why' }], rows: rc.checks.map((c) => ({ label: c.label, out: c.out === 'na' ? 'Not applicable' : READY_OUT[c.out].label, why: c.why })) } },
      { id: 'requests', heading: 'Service requests about this room', table: { title: 'Service requests', cols: [{ key: 'id', label: 'Request' }, { key: 'title', label: 'Title' }, { key: 'sev', label: 'Severity' }, { key: 'state', label: 'State', kind: 'status' }, { key: 'opened', label: 'Opened', kind: 'date' }, { key: 'apex', label: 'APEX case' }],
        rows: inc.map((i) => ({ id: i.id, title: i.title, sev: i.severity, state: DONE.includes(i.state) ? 'Closed' : i.state.replace(/_/g, ' ').toLowerCase(), opened: ymd(i.openedAt), apex: i.apexId || '' })) } },
      { id: 'issues', heading: 'Open issues on the record', table: { title: 'Open issues', cols: [{ key: 'id', label: 'ID' }, { key: 'title', label: 'Issue' }, { key: 'sev', label: 'Severity' }, { key: 'src', label: 'Source' }], rows: openIssues(r).map((i) => ({ id: i.id, title: i.title, sev: i.severity, src: i.source })) } },
      { id: 'history', heading: 'Baseline history', table: { title: 'Baselines', cols: [{ key: 'v', label: 'Version', kind: 'number' }, { key: 'state', label: 'State', kind: 'status' }, { key: 'rev', label: 'Design revision', kind: 'number' }, { key: 'at', label: 'Date', kind: 'date' }, { key: 'by', label: 'By' }, { key: 'note', label: 'Note' }], rows: r.baselines.map((x) => ({ v: x.version, state: x.state === 'CURRENT' ? 'Current' : x.state === 'SUPERSEDED' ? 'Superseded' : 'Pending acceptance', rev: x.revision, at: ymd(x.at), by: who(x.by), note: x.note })) } },
    ],
    dossier: {
      room: { id: o.id, building: o.building, floor: o.floor, archetype: o.archetype, criticality: criticalityOf(r) }, state: st.state,
      dimensions: dims.map((d) => ({ layer: d.layer, name: d.name, state: d.state, note: d.note, measured: false })),
      changes: cards, ready: { outcome: rc.out, checks: rc.checks.map((c) => ({ key: c.key, outcome: c.out, why: c.why })) },
      requests: inc.map((i) => ({ id: i.id, state: i.state, severity: i.severity, apexId: i.apexId, workOrderId: i.workOrderId })),
      baselines: r.baselines.map((x) => ({ version: x.version, state: x.state, at: x.at })),
    },
  };
}
