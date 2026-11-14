/**
 * #/v25/service/analytics — ServiceHands analytics (founder, 14 Nov 2026): the service history by month and by quarter, by project, by
 * building and layer, and a scorecard that keeps each vendor accountable to its agreement. Drill down by clicking: a month in a chart, a
 * vendor, a building or a project narrows everything on the page (the state is in the address, so a drilled view can be shared), and the
 * jobs behind any figure are listed at the bottom with their room and asset ID. Drill up with the path above the charts.
 *
 * The history is SYNTHETIC (./service/history.ts): seeded, deterministic, labelled on every chart, never telemetry.
 */
import { useMemo } from 'react';
import { PageHero, StatTile, Card, Tag, Segmented, Notice } from '@empathia/ui';
import { syntheticHistory, workspaceJobs, vendorName, INTERNAL, SLA_HOURS, type ServiceJob } from '../service/history.js';
import { stats, months, quarters, series, vendorScorecard, byKey, LAYER_LABEL, DEFINITIONS, respondedInSla, restoredInSla, restoreHours, type Period } from '../service/analytics.js';
import { buildingByKey } from '../campus/canon.js';
import { load as loadDesk } from '../decisions/store.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { personaOf, personaLabel } from '../build/store.js';
import { TrendChart } from './TrendChart.js';
import { ExportMenu } from '../export/ExportMenu.js';
import { serviceAnalyticsPackage } from '../export/serviceAnalytics.js';

export interface Drill { m: 6 | 12 | 15; g: 'month' | 'quarter'; b: string | null; v: string | null; p: string | null; at: string | null }
export function drillOf(hash: string): Drill {
  const q = new URLSearchParams(hash.split('?')[1] || '');
  const m = Number(q.get('m')); return { m: (m === 6 || m === 12 ? m : 15) as Drill['m'], g: q.get('g') === 'quarter' ? 'quarter' : 'month', b: q.get('b'), v: q.get('v'), p: q.get('p'), at: q.get('at') };
}
const href = (d: Drill, patch: Partial<Drill>) => { const n = { ...d, ...patch }; const q = new URLSearchParams(); if (n.m !== 15) q.set('m', String(n.m)); if (n.g !== 'month') q.set('g', n.g); for (const k of ['b', 'v', 'p', 'at'] as const) if (n[k]) q.set(k, n[k]!); const s = q.toString(); return `#/v25/service/analytics${s ? `?${s}` : ''}`; };
const go = (h: string) => { location.hash = h; };
const f1 = (v: number | null, u = '') => (v === null ? '—' : `${v}${u}`);
const delta = (now: number | null, then: number | null, goodUp: boolean) => (now === null || then === null ? null : { d: Math.round((now - then) * 10) / 10, good: goodUp ? now >= then : now <= then });

export function ServiceAnalyticsPage({ perspective, hash }: { perspective: string; hash: string }) {
  const persona = personaOf(perspective); const { w } = useWorkspace(); const d = drillOf(hash);
  const desk = useMemo(() => loadDesk(), []);
  const projectOf = useMemo(() => { const m = new Map(desk.projects.filter((p) => p.roomId).map((p) => [p.roomId!, p.id])); return (room: string) => m.get(room) || null; }, [desk]);
  const all = useMemo<ServiceJob[]>(() => [...syntheticHistory(projectOf), ...workspaceJobs(w, projectOf)], [w, projectOf]);
  const ps = useMemo(() => (d.g === 'quarter' ? quarters(d.m) : months(d.m)) as Period[], [d.m, d.g]);
  const scope = all.filter((j) => (!d.b || j.building === d.b) && (!d.v || j.vendor === d.v) && (!d.p || (d.p === 'none' ? !j.projectId : j.projectId === d.p)));
  const ser = series(scope, ps); const from = ps[0]!.from; const to = ps[ps.length - 1]!.to;
  const ms = months(d.m); const total = stats(scope, from, to);
  const last3 = stats(scope, ms[Math.max(0, ms.length - 3)]!.from, to); const prev3 = stats(scope, ms[Math.max(0, ms.length - 6)]!.from, ms[Math.max(0, ms.length - 3)]!.from);
  const card = vendorScorecard(all.filter((j) => (!d.b || j.building === d.b) && (!d.p || (d.p === 'none' ? !j.projectId : j.projectId === d.p))), months(d.m));
  const picked = d.at ? ps.find((p) => p.key === d.at) || null : null;
  const jobs = scope.filter((j) => { const t = Date.parse(j.openedAt); return picked ? t >= picked.from && t < picked.to : t >= from && t < to; }).sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  const projName = (id: string) => (id === 'none' ? 'No project (running the estate)' : desk.projects.find((p) => p.id === id)?.name || id);
  const crumbs: Array<[string, string]> = [['The estate', href(d, { b: null, v: null, p: null, at: null })]];
  if (d.b) crumbs.push([buildingByKey(d.b)?.name || d.b, href(d, { v: null, p: null, at: null })]);
  if (d.p) crumbs.push([projName(d.p), href(d, { v: null, at: null })]);
  if (d.v) crumbs.push([vendorName(d.v), href(d, { at: null })]);
  if (picked) crumbs.push([picked.label, hash]);
  const level = picked ? 'period' : d.v ? 'vendor' : d.p ? 'project' : d.b ? 'building' : 'estate';
  const vendorRow = d.v ? card.find((x) => x.vendor === d.v) : null;
  const made = { role: personaLabel(persona), at: new Date().toISOString(), build: process.env.DEMO_BUILD_ID || 'dev' };
  return (
    <section className="wk san" data-native="workspace" data-testid="service-analytics" data-level={level}>
      <PageHero product="servicehands" icon="chart" eyebrow="ServiceHands · analytics" title="Service, measured"
        lede={<>How service is going, month by month and quarter by quarter: by building, by project, and by vendor, so every vendor is held to its agreement. Click a month, a vendor, a building or a project to drill in. <b>Synthetic service history</b> (seeded, August 2025 to October 2026) plus this browser’s own requests; nothing here is telemetry.</>} />
      <nav className="san__path" aria-label="Drill path" data-testid="san-path">{crumbs.map(([l, h], i) => <span key={l + i}>{i ? <span aria-hidden="true"> › </span> : null}{i === crumbs.length - 1 ? <b aria-current="page">{l}</b> : <a href={h}>{l}</a>}</span>)}</nav>
      <div className="san__controls">
        <Segmented label="Period" value={String(d.m) as '6' | '12' | '15'} onChange={(v) => go(href(d, { m: Number(v) as Drill['m'], at: null }))} options={[{ value: '6', label: '6 months' }, { value: '12', label: '12 months' }, { value: '15', label: '15 months' }]} />
        <Segmented label="Group by" value={d.g} onChange={(v) => go(href(d, { g: v as Drill['g'], at: null }))} options={[{ value: 'month', label: 'Month' }, { value: 'quarter', label: 'Quarter' }]} />
      </div>
      <div className="kit-grid kit-grid--tiles wk-tiles5" data-testid="san-kpis">
        <StatTile label="Jobs opened" value={total.opened} hint={`${total.closed} closed · ${total.backlog} open at the end`} />
        <StatTile label="Response within SLA" value={total.respondSla ?? '—'} unit={total.respondSla === null ? undefined : '%'} tone={(total.respondSla ?? 100) < 90 ? 'warn' : 'ok'} hint={deltaText(delta(last3.respondSla, prev3.respondSla, true), ' pts')} />
        <StatTile label="Restore within SLA" value={total.restoreSla ?? '—'} unit={total.restoreSla === null ? undefined : '%'} tone={(total.restoreSla ?? 100) < 85 ? 'warn' : 'ok'} hint={deltaText(delta(last3.restoreSla, prev3.restoreSla, true), ' pts')} />
        <StatTile label="Median time to restore" value={total.mttrH ?? '—'} unit={total.mttrH === null ? undefined : 'h'} hint={deltaText(delta(last3.mttrH, prev3.mttrH, false), ' h')} />
        <StatTile label="First-time fix" value={total.ftf ?? '—'} unit={total.ftf === null ? undefined : '%'} hint={`reopen rate ${f1(total.reopen, '%')}`} />
      </div>
      <div className="san__charts">
        <TrendChart testId="san-volume" title={`Jobs by ${d.g}: opened, closed and open at the end (synthetic history)`} labels={ser.map((x) => x.period.label)} unit=""
          series={[{ name: 'Opened', tone: 'info', values: ser.map((x) => x.s.opened) }, { name: 'Closed', tone: 'ok', values: ser.map((x) => x.s.closed) }, { name: 'Open at the end', tone: 'warn', dashed: true, values: ser.map((x) => x.s.backlog) }]}
          onPick={(i) => go(href(d, { at: ser[i]!.period.key }))} />
        <TrendChart testId="san-sla" title={`SLA attainment by ${d.g} (synthetic history)`} labels={ser.map((x) => x.period.label)} unit="%" max={100} band={{ at: 90, label: 'target 90%' }}
          series={[{ name: 'Response within SLA', tone: 'info', values: ser.map((x) => x.s.respondSla) }, { name: 'Restore within SLA', tone: 'violet', values: ser.map((x) => x.s.restoreSla) }]}
          onPick={(i) => go(href(d, { at: ser[i]!.period.key }))} />
        <TrendChart testId="san-mttr" title={`Median time to restore by ${d.g}, hours (synthetic history)`} labels={ser.map((x) => x.period.label)} unit=" h"
          series={[{ name: 'Median time to restore', tone: 'indigo', values: ser.map((x) => x.s.mttrH) }]} onPick={(i) => go(href(d, { at: ser[i]!.period.key }))} />
      </div>
      {vendorRow ? <div data-testid="san-vendor-note"><Notice tone={vendorRow.flags.length ? 'warn' : 'ok'}><b>{vendorRow.name}</b>{vendorRow.flags.length ? `: ${vendorRow.flags.join('; ')}.` : ': within every target over this period.'} Last three months against the three before: response within SLA {f1(vendorRow.recent.respondSla, '%')} (was {f1(vendorRow.earlier.respondSla, '%')}), median time to restore {f1(vendorRow.recent.mttrH, ' h')} (was {f1(vendorRow.earlier.mttrH, ' h')}).</Notice></div> : null}
      <Card icon="users" title="Vendor scorecard" sub="Each vendor against its agreement: targets 90% response and 85% restore within SLA. Click a vendor to drill in." testId="san-vendors">
        <div className="san__scroll"><table className="pa-table san__table"><thead><tr><th scope="col">Vendor</th><th scope="col">Jobs</th><th scope="col">Open</th><th scope="col">Response in SLA</th><th scope="col">Restore in SLA</th><th scope="col">Median restore</th><th scope="col">First-time fix</th><th scope="col">Reopened</th><th scope="col">Needs attention</th></tr></thead>
          <tbody>{card.map((x) => <tr key={x.vendor} data-testid="san-vendor" data-vendor={x.vendor} data-flags={x.flags.length} className={d.v === x.vendor ? 'on' : ''}>
            <th scope="row"><a href={href(d, { v: d.v === x.vendor ? null : x.vendor, at: null })}>{x.name}</a>{x.vendor === INTERNAL ? <div className="ui-meta">no agreement covers it</div> : null}</th>
            <td className="num">{x.jobs}</td><td className="num">{x.open}</td><td className="num">{f1(x.s.respondSla, '%')}</td><td className="num">{f1(x.s.restoreSla, '%')}</td><td className="num">{f1(x.s.mttrH, ' h')}</td><td className="num">{f1(x.s.ftf, '%')}</td><td className="num">{f1(x.s.reopen, '%')}</td>
            <td>{x.flags.length ? <ul className="plain san__flags">{x.flags.map((f) => <li key={f}><Tag tone="warn">!</Tag> {f}</li>)}</ul> : <Tag tone="ok">Within targets</Tag>}</td></tr>)}</tbody></table></div>
      </Card>
      <div className="wk-g2">
        <Card icon="building" title={`By building, by ${d.g}`} sub="Jobs opened; click a building to drill in" testId="san-buildings">
          <div className="san__scroll"><table className="pa-table san__table"><thead><tr><th scope="col">Building</th>{ps.map((p) => <th key={p.key} scope="col">{p.label}</th>)}<th scope="col">Restore in SLA</th></tr></thead>
            <tbody>{byKey(all.filter((j) => (!d.v || j.vendor === d.v) && (!d.p || (d.p === 'none' ? !j.projectId : j.projectId === d.p))), (j) => j.building, from, to).map((r) => { const mine = all.filter((j) => j.building === r.key && (!d.v || j.vendor === d.v)); return <tr key={r.key} className={d.b === r.key ? 'on' : ''}><th scope="row"><a href={href(d, { b: d.b === r.key ? null : r.key, at: null })}>{buildingByKey(r.key)?.short || r.key}</a></th>{ps.map((p) => <td key={p.key} className="num">{stats(mine, p.from, p.to).opened}</td>)}<td className="num">{f1(r.s.restoreSla, '%')}</td></tr>; })}</tbody></table></div>
        </Card>
        <Card icon="calendar" title={`By project, by ${d.g}`} sub="Projects from the decision desk; the rest is running the estate" testId="san-projects">
          <div className="san__scroll"><table className="pa-table san__table"><thead><tr><th scope="col">Project</th>{ps.map((p) => <th key={p.key} scope="col">{p.label}</th>)}<th scope="col">Restore in SLA</th></tr></thead>
            <tbody>{byKey(all.filter((j) => (!d.b || j.building === d.b) && (!d.v || j.vendor === d.v)), (j) => j.projectId || 'none', from, to).map((r) => { const mine = all.filter((j) => (j.projectId || 'none') === r.key && (!d.b || j.building === d.b) && (!d.v || j.vendor === d.v)); return <tr key={r.key} className={d.p === r.key ? 'on' : ''}><th scope="row"><a href={href(d, { p: d.p === r.key ? null : r.key, at: null })}>{projName(r.key)}</a></th>{ps.map((p) => <td key={p.key} className="num">{stats(mine, p.from, p.to).opened}</td>)}<td className="num">{f1(r.s.restoreSla, '%')}</td></tr>; })}</tbody></table></div>
        </Card>
      </div>
      <Card icon="layers" title="By layer" sub="Where the work is" testId="san-layers">
        <ul className="san__layers">{byKey(scope, (j) => j.layer, from, to).map((r) => <li key={r.key}><b>{LAYER_LABEL[r.key]}</b> <span className="num">{r.s.opened}</span> <span className="ui-meta">jobs · restore in SLA {f1(r.s.restoreSla, '%')} · median {f1(r.s.mttrH, ' h')}</span></li>)}</ul>
      </Card>
      <Card icon="ticket" title={`The jobs behind the figures${picked ? `: ${picked.label}` : ''}`} sub={`${jobs.length} job${jobs.length === 1 ? '' : 's'} in this view, newest first; each names its room and the unit (asset ID) it was about`} testId="san-jobs">
        <div className="san__scroll"><table className="pa-table san__table"><thead><tr><th scope="col">Job</th><th scope="col">Opened</th><th scope="col">Room</th><th scope="col">Asset</th><th scope="col">Layer</th><th scope="col">Severity</th><th scope="col">Vendor</th><th scope="col">Response</th><th scope="col">Restore</th><th scope="col">State</th></tr></thead>
          <tbody>{jobs.slice(0, 25).map((j) => { const rh = restoreHours(j); return <tr key={j.id} data-testid="san-job"><th scope="row">{j.source === 'workspace' ? <a href={`#/v25/service?id=${j.id}`}>{j.id}</a> : j.id}</th><td>{j.openedAt.slice(0, 10)}</td><td><a href={`#/commissioning/room/${j.roomId}`}>{j.roomName}</a></td><td>{j.asset ? <a href={`#/v25/asset?a=${j.asset}`}><code>{j.asset}</code></a> : '—'}</td><td>{LAYER_LABEL[j.layer]}</td><td>{j.severity}</td><td>{j.vendorName}</td>
            <td>{j.respondedAt ? <Tag tone={respondedInSla(j) ? 'ok' : 'bad'}>{respondedInSla(j) ? 'in SLA' : 'late'}</Tag> : '—'}</td><td>{rh === null ? '—' : <><Tag tone={restoredInSla(j) ? 'ok' : 'bad'}>{Math.round(rh)} h</Tag> <span className="ui-meta">target {SLA_HOURS[j.severity].restore} h</span></>}</td><td>{j.closedAt ? 'Closed' : 'Open'}{j.reopened ? ' · reopened' : ''}</td></tr>; })}</tbody></table></div>
        {jobs.length > 25 ? <p className="wk-note">The newest 25 of {jobs.length} are listed; click a month in a chart to narrow them, and every one is in the exported workbook.</p> : null}
      </Card>
      <ExportMenu testId="san-export" title="Service analytics report" by={personaLabel(persona)} sub="This view (with its drill) as six files: the trends, the vendor scorecard, by building and project, and every job behind it"
        make={() => serviceAnalyticsPackage({ jobs: scope, all, periods: ps, months: ms, drill: d, crumbs: crumbs.map((c) => c[0]), projName, scorecard: card }, made)} />
      <details className="ln-dom" data-testid="san-defs"><summary><b>How each figure is worked out</b></summary><dl className="san__defs">{DEFINITIONS.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        <p className="wk-note">The history is synthetic: generated from a fixed seed so every visit and every test sees the same jobs, shaped like a service history and labelled wherever it appears. Each job’s vendor is the one the support agreement names for its building and layer; where no active agreement covers it, the internal team serves it and the scorecard says so.</p></details>
    </section>
  );
}
function deltaText(x: { d: number; good: boolean } | null, u: string) { return x === null ? 'last 3 months vs the 3 before: —' : `last 3 months vs the 3 before: ${x.d > 0 ? '+' : ''}${x.d}${u} ${x.good ? '(better)' : '(worse)'}`; }
