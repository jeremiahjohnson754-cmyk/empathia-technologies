/** KPI summary (analytics engine). Every ratio shows its definition; a figure with no data shows "—", never 0. */
import { Composition, DataTable, ErrorState, Loading, Notice, Stat, StatusBadge, SEVERITY, LIFECYCLE } from '@empathia/ui';
import type { Summary } from '@empathia/api-client';
import { api, useQuery } from '../api.js';
import { href } from '../router.js';

const pct = (v: number | null) => (v === null ? null : Math.round(v * 1000) / 10);

export function Reports() {
  const q = useQuery<Summary>('report:summary', () => api.call('getV1ReportsSummary'));
  if (q.error) return <section className="page"><ErrorState error={q.error} retry={q.reload} /></section>;
  if (!q.data) return <section className="page"><Loading /></section>;
  const k = q.data; const L = k.commissioning.byLabel;
  return (
    <section className="page">
      <header className="page__head"><div><h1>Reports</h1><p className="lede">Computed from the canonical records{k.scope === 'site-scoped' ? ' of your sites' : ''}. Synthetic data. <a href={href('executive')} data-testid="to-executive">Executive KPI passports →</a></p></div></header>
      <div className="stats">
        <Stat label="Rooms" value={k.rooms.total} />
        <Stat label="Commissioning coverage" value={pct(k.commissioning.coverage.value)} unit="%" definition={k.commissioning.coverage.definition} />
        <Stat label="Passes independently verified" value={pct(k.commissioning.verifiedShare.value)} unit="%" definition={k.commissioning.verifiedShare.definition} />
        <Stat label="Open high/critical issues" value={k.issues.openHighOrCritical} tone={k.issues.openHighOrCritical ? 'bad' : undefined} />
        <Stat label="Mean time to resolve a deficiency" value={k.issues.meanHoursToResolveDeficiency} unit="h" definition={`${k.issues.deficienciesResolved} deficiencies resolved by a verified retest`} />
        <Stat label="Operational performance" value="Not monitored" definition="No live monitoring feed in the starter; uptime is unknown, not good." />
      </div>
      <div className="card stack">
        <h2 className="h3">Applicable tests by result</h2>
        <Composition label="Applicable tests by result" total={k.commissioning.applicableTests} parts={[
          { key: 'v', label: 'Passed, verified', value: L.PASS_VERIFIED || 0, tone: 'ok' }, { key: 'u', label: 'Awaiting verification', value: L.PASS_UNVERIFIED || 0, tone: 'info' },
          { key: 'f', label: 'Failed', value: L.FAIL || 0, tone: 'bad' }, { key: 'o', label: 'Not supported / inconclusive', value: (L.NOT_SUPPORTED || 0) + (L.INCONCLUSIVE || 0), tone: 'warn' },
          { key: 'n', label: 'Not tested', value: L.NOT_TESTED || 0, tone: 'muted' }]} />
      </div>
      <div className="split">
        <div className="card stack"><h2 className="h3">Rooms by lifecycle</h2>
          <DataTable rows={Object.entries(k.rooms.byLifecycle)} rowKey={([s]) => s} dense caption="Rooms by lifecycle" columns={[{ key: 's', header: 'Lifecycle', render: ([s]) => <StatusBadge table={LIFECYCLE} value={s} /> }, { key: 'n', header: 'Rooms', render: ([, n]) => n, align: 'right' }]} /></div>
        <div className="card stack"><h2 className="h3">Issues</h2>
          <DataTable rows={k.issues.byCategorySeverityState} rowKey={(x) => `${x.category}${x.severity}${x.state}`} dense caption="Issues by category, severity and state" columns={[
            { key: 'c', header: 'Category', render: (x) => <span className="ui-meta">{x.category.replace(/_/g, ' ').toLowerCase()}</span> }, { key: 's', header: 'Severity', render: (x) => <StatusBadge table={SEVERITY} value={x.severity} /> },
            { key: 't', header: 'State', render: (x) => x.state }, { key: 'n', header: 'Count', render: (x) => x.n, align: 'right' }]} /></div>
      </div>
      <div className="stats">
        <Stat label="Planned devices" value={k.assets.planned} /><Stat label="Still on a generic model" value={pct(k.assets.genericShare.value)} unit="%" definition={k.assets.genericShare.definition} />
        <Stat label="Work orders open / closed" value={`${k.workOrders['OPEN'] || 0} / ${k.workOrders['CLOSED'] || 0}`} /><Stat label="Evidence objects" value={k.evidence.objects} definition={`${(k.evidence.bytes / 1024).toFixed(1)} KiB stored, content-addressed`} />
      </div>
      <Notice tone="muted">Not a statement about any real estate or customer: the starter runs on synthetic seed data.</Notice>
    </section>
  );
}
