/**
 * The portfolio brief: commissioning and assurance across an estate, or one building of it, as a Report (./model.ts). It is the
 * executive end of the flagship enterprise journey: the same rooms the pages count, drilled up by building and by room type and down to
 * every room, with the rooms to act on first. Every figure is a count over the room records and the workspace's service requests,
 * through the rules the command centres show (campus/cxRecord.ts, campus/asRecord.ts, assurance/model.ts).
 *
 * The workbook is the drill-down: each level is a sheet with a frozen, filterable header, so a reader can filter by building or state
 * without the page. The deck is the drill-up: the estate, then the buildings, then the rooms that need someone.
 */
import { openIssues, type RoomRecord } from '../campus/design.js';
import { SITE, BUILDINGS, buildingByKey, shortName, ARCHETYPE_NAME } from '../campus/canon.js';
import { cxState, CX_LABEL, type CxState } from '../campus/cxRecord.js';
import { asState, AS_LABEL, type AsState } from '../campus/asRecord.js';
import { readyCheckOf, criticalityOf, assuranceTrend, READY_OUT } from '../assurance/model.js';
import type * as S from '../workspace/store.js';
import type { Report } from './model.js';
import type { MadeBy } from './cx.js';

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const CX_ORDER: CxState[] = ['blocked', 'progress', 'conditions', 'notstarted', 'accepted'];
const AS_ORDER: AsState[] = ['failed', 'drift', 'none', 'matched'];

export function estatePackage(all: RoomRecord[], incidents: S.Incident[], by: MadeBy, building?: string): Report {
  const recs = building ? all.filter((r) => r.outline.building === building) : all; const B = building ? buildingByKey(building) : undefined;
  const rows = recs.map((r) => { const cx = cxState(r); const as = asState(r, incidents); const rc = readyCheckOf(r, incidents); return { r, cx, as, rc, open: openIssues(r), crit: criticalityOf(r) }; });
  const ncx = (k: CxState) => rows.filter((x) => x.cx.state === k).length; const nas = (k: AsState) => rows.filter((x) => x.as.state === k).length;
  const verified = recs.reduce((a, r) => a + r.counts.verified, 0); const applicable = recs.reduce((a, r) => a + r.counts.applicable, 0);
  const defs = rows.flatMap((x) => x.open.map((i) => ({ x, i })));
  const attention = rows.filter((x) => x.cx.state === 'blocked' || x.as.state === 'failed' || x.rc.out === 'attention' || x.as.state === 'drift')
    .sort((a, b) => (a.cx.state === 'blocked' || a.as.state === 'failed' ? 0 : 1) - (b.cx.state === 'blocked' || b.as.state === 'failed' ? 0 : 1) || ['Mission critical', 'High', 'Standard'].indexOf(a.crit) - ['Mission critical', 'High', 'Standard'].indexOf(b.crit));
  const blds = BUILDINGS.map((b) => ({ b, xs: rows.filter((x) => x.r.outline.building === b.key) })).filter((g) => g.xs.length);
  const others = rows.filter((x) => !BUILDINGS.some((b) => b.key === x.r.outline.building));
  const groups: Array<{ b: { key: string; name: string; short: string }; xs: typeof rows }> = [...blds, ...(others.length ? [{ b: { key: 'regional', name: 'Regional sites', short: 'Regional' }, xs: others }] : [])];
  const types = [...new Set(rows.map((x) => x.r.outline.archetype))].map((a) => ({ a, xs: rows.filter((x) => x.r.outline.archetype === a) })).sort((p, q) => q.xs.length - p.xs.length);
  const trend = assuranceTrend(incidents, recs);
  const where = B ? B.name : SITE.name; const first = attention[0];
  const status = ncx('blocked') || nas('failed') ? { label: 'Action needed', tone: 'bad' as const, why: `${plural(ncx('blocked'), 'room')} blocked in commissioning, ${plural(nas('failed'), 'room')} failed an assurance check` } : nas('drift') ? { label: 'Drift to review', tone: 'warn' as const, why: `${plural(nas('drift'), 'room')} drifted from their baseline` } : { label: 'As commissioned', tone: 'ok' as const, why: 'every accepted room matches its baseline' };
  const byGroup = (g: { b: { key: string; name: string }; xs: typeof rows }) => { const v = g.xs.reduce((a, x) => a + x.r.counts.verified, 0); const ap = g.xs.reduce((a, x) => a + x.r.counts.applicable, 0);
    return { name: g.b.name, rooms: g.xs.length, accepted: g.xs.filter((x) => x.cx.state === 'accepted').length, conditions: g.xs.filter((x) => x.cx.state === 'conditions').length, blocked: g.xs.filter((x) => x.cx.state === 'blocked').length, progress: g.xs.filter((x) => x.cx.state === 'progress' || x.cx.state === 'notstarted').length, matched: g.xs.filter((x) => x.as.state === 'matched').length, drift: g.xs.filter((x) => x.as.state === 'drift').length, failed: g.xs.filter((x) => x.as.state === 'failed').length, tests: `${pct(v, ap)}%`, defs: g.xs.reduce((a, x) => a + x.open.length, 0) }; };
  return {
    schema: 'empathia.report/1', id: `EST-${building || 'CAMPUS'}`, kind: 'portfolio-brief', title: 'Commissioning and assurance portfolio', subtitle: `${where}: ${plural(recs.length, 'room')}`,
    scope: { tenant: SITE.enterprise, site: SITE.name, building: B?.name || 'All buildings', floor: 'All floors', room: 'All rooms', roomId: building || 'ALL' },
    status, generatedAt: by.at, role: by.role, build: by.build, primary: 'Rooms',
    provenance: [
      'Synthetic demonstration: every room, person and request is invented and connected to no real system.',
      'Counts over the room records as recorded: no room was surveyed, no test was run on real equipment and nothing is monitored live. Assurance is simulated discovery from the records.',
      `Made as ${by.role}: a perspective on the records, which grants no permission.`,
    ],
    headline: `${where}: ${ncx('accepted')} of ${recs.length} rooms accepted, ${ncx('conditions')} with conditions, ${ncx('blocked')} blocked; ${pct(verified, applicable)}% of applicable tests verified. Assurance: ${nas('matched')} match their baseline, ${nas('drift')} drifted, ${nas('failed')} failed.${first ? ` First to act on: ${shortName(first.r.outline)} — ${first.cx.state === 'blocked' ? first.cx.why : first.as.why}.` : ''}`,
    kpis: [
      { label: 'Rooms accepted', value: `${ncx('accepted')} of ${recs.length}`, note: `${ncx('conditions')} more with conditions` },
      { label: 'Blocked', value: String(ncx('blocked')), note: rows.filter((x) => x.cx.state === 'blocked').slice(0, 2).map((x) => shortName(x.r.outline)).join(', ') || 'none' },
      { label: 'Tests verified', value: `${pct(verified, applicable)}%`, note: `${verified.toLocaleString('en-US')} of ${applicable.toLocaleString('en-US')} applicable` },
      { label: 'Match their baseline', value: `${nas('matched')}`, note: `${nas('drift')} drift · ${nas('failed')} failed · ${nas('none')} never accepted` },
      { label: 'Open deficiencies', value: String(defs.length), note: `${defs.filter((d) => d.i.severity === 'High').length} high` },
      { label: 'Need attention before next use', value: String(rows.filter((x) => x.rc.out === 'attention').length), note: 'from the ready check' },
    ],
    chart: { title: 'Rooms by commissioning state, by building', categories: groups.map((g) => g.b.short), series: (['accepted', 'conditions', 'blocked', 'progress'] as const).map((k) => ({ name: k === 'progress' ? 'In progress or not started' : CX_LABEL[k].label, tone: ({ accepted: 'ok', conditions: 'warn', blocked: 'bad', progress: 'muted' } as const)[k], values: groups.map((g) => g.xs.filter((x) => (k === 'progress' ? x.cx.state === 'progress' || x.cx.state === 'notstarted' : x.cx.state === k)).length) })) },
    sections: [
      { id: 'brief', heading: 'In brief', text: [`${status.label}: ${status.why}.`], bullets: [
        `${ncx('accepted')} rooms accepted, ${ncx('conditions')} accepted with conditions, ${ncx('blocked')} blocked, ${ncx('progress')} in commissioning, ${ncx('notstarted')} not started.`,
        `${pct(verified, applicable)}% of the tests the engine judged applicable are passed and verified by someone other than the person who recorded them.`,
        `Assurance: ${nas('matched')} rooms match their commissioned baseline, ${nas('drift')} drifted, ${nas('failed')} failed a check, ${nas('none')} have never been accepted.`,
        ...(attention.slice(0, 5).map((x) => `${shortName(x.r.outline)} (${x.crit.toLowerCase()}): ${x.cx.state === 'blocked' ? `blocked — ${x.cx.why}` : x.as.state === 'failed' ? `failed — ${x.as.why}` : x.as.state === 'drift' ? `drift — ${x.as.why}` : `next use: ${READY_OUT[x.rc.out].label.toLowerCase()}`}.`)),
      ] },
      { id: 'buildings', heading: 'By building', text: ['The estate drilled up: one row per building (regional sites together).'],
        table: { title: 'Buildings', cols: [{ key: 'name', label: 'Building' }, { key: 'rooms', label: 'Rooms', kind: 'number' }, { key: 'accepted', label: 'Accepted', kind: 'number' }, { key: 'conditions', label: 'Conditions', kind: 'number' }, { key: 'blocked', label: 'Blocked', kind: 'number' }, { key: 'progress', label: 'In progress', kind: 'number' }, { key: 'matched', label: 'Match', kind: 'number' }, { key: 'drift', label: 'Drift', kind: 'number' }, { key: 'failed', label: 'Failed', kind: 'number' }, { key: 'tests', label: 'Tests verified' }, { key: 'defs', label: 'Open deficiencies', kind: 'number' }],
          rows: groups.map(byGroup) } },
      { id: 'types', heading: 'By room type', table: { title: 'Room types', cols: [{ key: 'type', label: 'Room type' }, { key: 'rooms', label: 'Rooms', kind: 'number' }, { key: 'accepted', label: 'Accepted', kind: 'number' }, { key: 'blocked', label: 'Blocked', kind: 'number' }, { key: 'drift', label: 'Drift or failed', kind: 'number' }, { key: 'defs', label: 'Open deficiencies', kind: 'number' }],
        rows: types.map((t) => ({ type: ARCHETYPE_NAME[t.a] || t.a, rooms: t.xs.length, accepted: t.xs.filter((x) => x.cx.state === 'accepted').length, blocked: t.xs.filter((x) => x.cx.state === 'blocked').length, drift: t.xs.filter((x) => x.as.state === 'drift' || x.as.state === 'failed').length, defs: t.xs.reduce((a, x) => a + x.open.length, 0) })) } },
      { id: 'attention', heading: 'Rooms to act on first', text: ['Blocked or failed first, then by criticality; drift and rooms that need attention before their next use follow.'],
        table: { title: 'Attention', cols: [{ key: 'room', label: 'Room' }, { key: 'crit', label: 'Criticality' }, { key: 'cx', label: 'Commissioning', kind: 'status' }, { key: 'as', label: 'Assurance', kind: 'status' }, { key: 'why', label: 'Why' }, { key: 'ready', label: 'Next use', kind: 'status' }],
          rows: attention.map((x) => ({ room: `${shortName(x.r.outline)} — ${x.r.outline.name}`, crit: x.crit, cx: CX_LABEL[x.cx.state].label, as: AS_LABEL[x.as.state].label, why: x.cx.state === 'blocked' ? x.cx.why : x.as.why, ready: READY_OUT[x.rc.out].label })) } },
      { id: 'rooms', heading: 'Every room', text: ['The estate drilled down: one row per room. In the workbook, filter this sheet by building, type or state.'],
        table: { title: 'Rooms', cols: [{ key: 'id', label: 'Room id' }, { key: 'room', label: 'Room' }, { key: 'building', label: 'Building' }, { key: 'floor', label: 'Floor', kind: 'number' }, { key: 'type', label: 'Room type' }, { key: 'crit', label: 'Criticality' }, { key: 'cx', label: 'Commissioning', kind: 'status' }, { key: 'as', label: 'Assurance', kind: 'status' }, { key: 'tests', label: 'Tests verified' }, { key: 'open', label: 'Open issues', kind: 'number' }, { key: 'baseline', label: 'Baseline' }],
          rows: [...rows].sort((a, b) => CX_ORDER.indexOf(a.cx.state) - CX_ORDER.indexOf(b.cx.state) || AS_ORDER.indexOf(a.as.state) - AS_ORDER.indexOf(b.as.state) || a.r.outline.id.localeCompare(b.r.outline.id)).map((x) => { const cur = x.r.baselines.find((b) => b.state === 'CURRENT');
            return { id: x.r.outline.id, room: `${shortName(x.r.outline)} — ${x.r.outline.name}`, building: buildingByKey(x.r.outline.building)?.name || x.r.outline.building, floor: x.r.outline.floor, type: x.r.archetypeName, crit: x.crit, cx: CX_LABEL[x.cx.state].label, as: AS_LABEL[x.as.state].label, tests: `${x.r.counts.verified} of ${x.r.counts.applicable}`, open: x.open.length, baseline: cur ? `v${cur.version} · ${cur.at.slice(0, 10)}` : '—' }; }) } },
      { id: 'deficiencies', heading: 'Open deficiencies', table: { title: 'Deficiencies', cols: [{ key: 'room', label: 'Room' }, { key: 'id', label: 'ID' }, { key: 'title', label: 'Deficiency' }, { key: 'sev', label: 'Severity', kind: 'status' }, { key: 'src', label: 'Source' }],
        rows: defs.sort((a, b) => ['High', 'Medium', 'Low'].indexOf(a.i.severity) - ['High', 'Medium', 'Low'].indexOf(b.i.severity)).map((d) => ({ room: shortName(d.x.r.outline), id: d.i.id, title: d.i.title, sev: d.i.severity === 'High' ? 'Open · high' : d.i.severity, src: d.i.source })) } },
      { id: 'trend', heading: 'Assurance over four weeks', text: ['Each week, the rooms with a baseline by then, read as their worst state that week.'],
        table: { title: 'Trend', cols: [{ key: 'week', label: 'Week' }, { key: 'match', label: 'Match', kind: 'number' }, { key: 'drift', label: 'Drift', kind: 'number' }, { key: 'fail', label: 'Failed', kind: 'number' }, { key: 'total', label: 'Rooms read', kind: 'number' }], rows: trend.map((t) => ({ week: t.label, match: t.match, drift: t.drift, fail: t.fail, total: t.total })) } },
    ],
    dossier: {
      scope: { building: building || null, rooms: recs.length },
      counts: { commissioning: Object.fromEntries(CX_ORDER.map((k) => [k, ncx(k)])), assurance: Object.fromEntries(AS_ORDER.map((k) => [k, nas(k)])), testsVerified: verified, testsApplicable: applicable, openDeficiencies: defs.length },
      rooms: rows.map((x) => ({ id: x.r.outline.id, building: x.r.outline.building, archetype: x.r.outline.archetype, criticality: x.crit, commissioning: x.cx.state, assurance: x.as.state, ready: x.rc.out, openIssues: x.open.map((i) => i.id) })),
      trend,
    },
  };
}
