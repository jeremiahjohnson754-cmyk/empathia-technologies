/**
 * The service analytics report: the view on #/v25/service/analytics as a Report (./model.ts), drill included — the trend by period, the
 * vendor scorecard with what needs attention, by building and by project, and every job behind the figures. Synthetic history, said so.
 */
import { SITE, buildingByKey } from '../campus/canon.js';
import { stats, series, byKey, DEFINITIONS, LAYER_LABEL, respondedInSla, restoredInSla, restoreHours, type Period, type VendorRow } from '../service/analytics.js';
import { SLA_HOURS, type ServiceJob } from '../service/history.js';
import type { Drill } from '../pages/ServiceAnalytics.js';
import type { Report } from './model.js';
import type { MadeBy } from './cx.js';

const f1 = (v: number | null) => (v === null ? null : v);
export interface AnalyticsInput { jobs: ServiceJob[]; all: ServiceJob[]; periods: Period[]; months: Period[]; drill: Drill; crumbs: string[]; projName: (id: string) => string; scorecard: VendorRow[] }

export function serviceAnalyticsPackage(x: AnalyticsInput, by: MadeBy): Report {
  const ps = x.periods; const from = ps[0]!.from; const to = ps[ps.length - 1]!.to; const t = stats(x.jobs, from, to); const ser = series(x.jobs, ps);
  const flagged = x.scorecard.filter((v) => v.flags.length);
  const scope = x.crumbs.join(' › ');
  return {
    schema: 'empathia.report/1', id: `SH-ANALYTICS-${x.drill.m}M${x.drill.b ? `-${x.drill.b}` : ''}${x.drill.v ? `-${x.drill.v}` : ''}${x.drill.p ? `-${x.drill.p}` : ''}`, kind: 'service-analytics',
    title: 'Service analytics', subtitle: `${scope} · ${ps[0]!.label} to ${ps[ps.length - 1]!.label} by ${x.drill.g}`,
    scope: { tenant: SITE.enterprise, site: SITE.name, building: x.drill.b ? buildingByKey(x.drill.b)?.name || x.drill.b : 'All buildings', floor: 'All floors', room: 'All rooms', roomId: '' },
    status: { label: flagged.length ? `${flagged.length} vendor${flagged.length === 1 ? '' : 's'} need attention` : 'Within targets', tone: flagged.length ? 'warn' : 'ok', why: flagged.length ? flagged.map((v) => `${v.name}: ${v.flags[0]}`).join('; ') : 'every vendor within the response and restore targets' },
    generatedAt: by.at, role: by.role, build: by.build, primary: 'Jobs',
    provenance: [
      'Synthetic service history: generated from a fixed seed (August 2025 to October 2026), shaped like a service history, plus this browser’s own requests. Not telemetry and not a real organisation’s record.',
      'Each job’s vendor is the one the support agreement names for its building and layer; with no active agreement the internal team serves it.',
      'SLA targets from the service engine, in hours: response 2 / 24 / 48, restore 8 / 48 / 120 (business days counted as 24 h).',
      `Made as ${by.role}: a perspective on the record, which grants no permission.`,
    ],
    headline: `${t.opened} jobs opened in ${scope}; ${t.respondSla ?? '—'}% responded and ${t.restoreSla ?? '—'}% restored within SLA; median time to restore ${t.mttrH ?? '—'} h; first-time fix ${t.ftf ?? '—'}%. ${flagged.length ? `Needs attention: ${flagged.map((v) => v.name).join(', ')}.` : 'Every vendor is within the targets.'}`,
    kpis: [
      { label: 'Jobs opened', value: String(t.opened), note: `${t.closed} closed · ${t.backlog} open at the end` },
      { label: 'Response within SLA', value: t.respondSla === null ? '—' : `${t.respondSla}%`, note: 'target 90%' },
      { label: 'Restore within SLA', value: t.restoreSla === null ? '—' : `${t.restoreSla}%`, note: 'target 85%' },
      { label: 'Median time to restore', value: t.mttrH === null ? '—' : `${t.mttrH} h` },
      { label: 'First-time fix', value: t.ftf === null ? '—' : `${t.ftf}%`, note: `reopen rate ${t.reopen ?? '—'}%` },
    ],
    chart: { title: `Jobs by ${x.drill.g}`, categories: ser.map((s) => s.period.label), series: [{ name: 'Opened', tone: 'info', values: ser.map((s) => s.s.opened) }, { name: 'Closed', tone: 'ok', values: ser.map((s) => s.s.closed) }] },
    sections: [
      { id: 'trend', heading: `Trend by ${x.drill.g}`, table: { title: 'Trend', cols: [{ key: 'p', label: 'Period' }, { key: 'o', label: 'Opened', kind: 'number' }, { key: 'c', label: 'Closed', kind: 'number' }, { key: 'b', label: 'Open at end', kind: 'number' }, { key: 'r', label: 'Response in SLA %', kind: 'number' }, { key: 's', label: 'Restore in SLA %', kind: 'number' }, { key: 'm', label: 'Median restore h', kind: 'number' }, { key: 'f', label: 'First-time fix %', kind: 'number' }],
        rows: ser.map((s) => ({ p: s.period.label, o: s.s.opened, c: s.s.closed, b: s.s.backlog, r: f1(s.s.respondSla), s: f1(s.s.restoreSla), m: f1(s.s.mttrH), f: f1(s.s.ftf) })) } },
      { id: 'vendors', heading: 'Vendor scorecard', text: ['Each vendor against its agreement: targets 90% response and 85% restore within SLA; the last three months compared with the three before.'], bullets: flagged.length ? flagged.flatMap((v) => v.flags.map((f) => `${v.name}: ${f}`)) : ['Every vendor within the targets.'],
        table: { title: 'Vendor scorecard', cols: [{ key: 'v', label: 'Vendor' }, { key: 'j', label: 'Jobs', kind: 'number' }, { key: 'o', label: 'Open', kind: 'number' }, { key: 'r', label: 'Response in SLA %', kind: 'number' }, { key: 's', label: 'Restore in SLA %', kind: 'number' }, { key: 'm', label: 'Median restore h', kind: 'number' }, { key: 'f', label: 'First-time fix %', kind: 'number' }, { key: 'x', label: 'Reopened %', kind: 'number' }, { key: 'a', label: 'Needs attention', kind: 'status' }],
          rows: x.scorecard.map((v) => ({ v: v.name, j: v.jobs, o: v.open, r: f1(v.s.respondSla), s: f1(v.s.restoreSla), m: f1(v.s.mttrH), f: f1(v.s.ftf), x: f1(v.s.reopen), a: v.flags.length ? v.flags.join('; ') : 'Within targets' })) } },
      { id: 'buildings', heading: 'By building', table: { title: 'By building', cols: [{ key: 'b', label: 'Building' }, { key: 'o', label: 'Opened', kind: 'number' }, { key: 's', label: 'Restore in SLA %', kind: 'number' }, { key: 'm', label: 'Median restore h', kind: 'number' }],
        rows: byKey(x.jobs, (j) => j.building, from, to).map((r) => ({ b: buildingByKey(r.key)?.name || r.key, o: r.s.opened, s: f1(r.s.restoreSla), m: f1(r.s.mttrH) })) } },
      { id: 'projects', heading: 'By project', table: { title: 'By project', cols: [{ key: 'p', label: 'Project' }, { key: 'o', label: 'Opened', kind: 'number' }, { key: 's', label: 'Restore in SLA %', kind: 'number' }, { key: 'm', label: 'Median restore h', kind: 'number' }],
        rows: byKey(x.jobs, (j) => j.projectId || 'none', from, to).map((r) => ({ p: x.projName(r.key), o: r.s.opened, s: f1(r.s.restoreSla), m: f1(r.s.mttrH) })) } },
      { id: 'layers', heading: 'By layer', table: { title: 'By layer', cols: [{ key: 'l', label: 'Layer' }, { key: 'o', label: 'Opened', kind: 'number' }, { key: 's', label: 'Restore in SLA %', kind: 'number' }], rows: byKey(x.jobs, (j) => j.layer, from, to).map((r) => ({ l: LAYER_LABEL[r.key], o: r.s.opened, s: f1(r.s.restoreSla) })) } },
      { id: 'jobs', heading: 'The jobs behind the figures', table: { title: 'Jobs', cols: [{ key: 'id', label: 'Job' }, { key: 'at', label: 'Opened', kind: 'date' }, { key: 'room', label: 'Room' }, { key: 'asset', label: 'Asset ID' }, { key: 'layer', label: 'Layer' }, { key: 'sev', label: 'Severity' }, { key: 'v', label: 'Vendor' }, { key: 'resp', label: 'Response', kind: 'status' }, { key: 'rest', label: 'Restore h', kind: 'number' }, { key: 'tgt', label: 'Target h', kind: 'number' }, { key: 'state', label: 'State' }, { key: 'src', label: 'Source' }],
        rows: x.jobs.filter((j) => { const q = Date.parse(j.openedAt); return q >= from && q < to; }).sort((a, b) => a.openedAt.localeCompare(b.openedAt)).map((j) => ({ id: j.id, at: j.openedAt.slice(0, 10), room: `${j.roomName} (${j.roomId})`, asset: j.asset || '', layer: LAYER_LABEL[j.layer], sev: j.severity, v: j.vendorName, resp: j.respondedAt ? (respondedInSla(j) ? 'In SLA' : 'Late') : 'Not yet', rest: restoreHours(j) === null ? null : Math.round(restoreHours(j)! * 10) / 10, tgt: SLA_HOURS[j.severity].restore, state: j.closedAt ? (j.reopened ? 'Closed · reopened' : 'Closed') : 'Open', src: j.source === 'workspace' ? 'this browser' : 'synthetic history' })) } },
      { id: 'definitions', heading: 'How each figure is worked out', facts: DEFINITIONS },
    ],
    dossier: { drill: x.drill, scorecard: x.scorecard.map((v) => ({ vendor: v.vendor, jobs: v.jobs, respondSla: v.s.respondSla, restoreSla: v.s.restoreSla, mttrH: v.s.mttrH, flags: v.flags })), totals: t, synthetic: true },
  };
}
