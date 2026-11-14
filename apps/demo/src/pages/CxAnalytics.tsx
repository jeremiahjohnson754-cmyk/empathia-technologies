/**
 * #/commissioning/analytics — commissioning measured month by month (founder, 14 Nov 2026: "add more trend analysis wherever it makes
 * sense"; the analytics drill down and up): results recorded and independently verified, failures found, rooms accepted, refused steps,
 * from the room records' own events; drill to a building (?b=) and back. Synthetic records, labelled; nothing typed.
 */
import { useMemo } from 'react';
import { PageHero, Card, StatTile, Segmented } from '@empathia/ui';
import { allRecords } from '../campus/design.js';
import { BUILDINGS, buildingByKey, shortName, roomHref } from '../campus/canon.js';
import { months } from '../service/analytics.js';
import { personaOf, personaLabel } from '../build/store.js';
import { TrendChart } from './TrendChart.js';
import { ExportMenu } from '../export/ExportMenu.js';
import type { Report } from '../export/model.js';
import { SITE } from '../campus/canon.js';

type Ev = { at: string; type: string; detail: string; outcome?: string; room: string; building: string };
export function CxAnalyticsPage({ perspective, hash }: { perspective: string; hash: string }) {
  const persona = personaOf(perspective); const q = new URLSearchParams(hash.split('?')[1] || ''); const b = q.get('b'); const n = q.get('m') === '24' ? 24 : 12;
  const recs = useMemo(() => allRecords(), []);
  const evs = useMemo<Ev[]>(() => recs.flatMap((r) => r.events.map((e) => ({ at: e.at, type: e.type, detail: e.detail, outcome: e.outcome, room: r.outline.id, building: r.outline.building }))), [recs]);
  const scope = evs.filter((e) => !b || e.building === b); const ms = months(n);
  const per = ms.map((m) => { const inM = scope.filter((e) => { const t = Date.parse(e.at); return t >= m.from && t < m.to; });
    return { m, recorded: inM.filter((e) => e.type === 'commission.result_recorded').length, verified: inM.filter((e) => e.type === 'commission.result_verified').length,
      failed: inM.filter((e) => e.type === 'commission.result_recorded' && /\bFAIL\b/.test(e.detail)).length, accepted: inM.filter((e) => e.type === 'room.lifecycle_changed' && /→ ACCEPTED$/.test(e.detail)).length,
      refused: inM.filter((e) => e.outcome === 'DENIED').length }; });
  const sum = (k: 'recorded' | 'verified' | 'failed' | 'accepted' | 'refused') => per.reduce((s, x) => s + x[k], 0);
  const vr = sum('recorded') ? Math.round((100 * sum('verified')) / sum('recorded')) : null;
  const byB = BUILDINGS.map((x) => { const e = evs.filter((y) => y.building === x.key && Date.parse(y.at) >= ms[0]!.from); return { key: x.key, name: x.name, recorded: e.filter((y) => y.type === 'commission.result_recorded').length, accepted: e.filter((y) => y.type === 'room.lifecycle_changed' && /→ ACCEPTED$/.test(y.detail)).length, refused: e.filter((y) => y.outcome === 'DENIED').length }; }).filter((x) => x.recorded || x.accepted || x.refused);
  const accRooms = scope.filter((e) => e.type === 'room.lifecycle_changed' && /→ ACCEPTED$/.test(e.detail) && Date.parse(e.at) >= ms[0]!.from).sort((x, y) => y.at.localeCompare(x.at));
  const go = (p: Record<string, string | null>) => { const s = new URLSearchParams(); const v = { b, m: n === 24 ? '24' : null, ...p }; for (const [k, x] of Object.entries(v)) if (x) s.set(k, x); location.hash = `#/commissioning/analytics${s.toString() ? `?${s}` : ''}`; };
  const made = { role: personaLabel(persona), at: new Date().toISOString(), build: process.env.DEMO_BUILD_ID || 'dev' };
  const report = (): Report => ({ schema: 'empathia.report/1', id: `CX-ANALYTICS-${n}M${b ? `-${b}` : ''}`, kind: 'commissioning-analytics', title: 'Commissioning analytics', subtitle: `${b ? buildingByKey(b)?.name : 'The estate'} · last ${n} months by month`,
    scope: { tenant: SITE.enterprise, site: SITE.name, building: b ? buildingByKey(b)?.name || b : 'All buildings', floor: 'All floors', room: 'All rooms', roomId: '' },
    status: { label: `${sum('accepted')} rooms accepted`, tone: 'muted', why: `${sum('recorded')} results recorded, ${vr ?? '—'}% verified, ${sum('failed')} failures, ${sum('refused')} refused steps` }, generatedAt: made.at, role: made.role, build: made.build, primary: 'Months',
    provenance: ['Synthetic room records: every figure is counted from the rooms’ own events (results recorded and verified, lifecycle changes, refusals).', `Made as ${made.role}: a perspective on the record, which grants no permission.`],
    headline: `${sum('recorded')} results recorded and ${sum('verified')} independently verified; ${sum('failed')} failures found; ${sum('accepted')} rooms accepted; ${sum('refused')} steps refused.`,
    kpis: [{ label: 'Results recorded', value: String(sum('recorded')) }, { label: 'Verified', value: vr === null ? '—' : `${vr}%` }, { label: 'Failures found', value: String(sum('failed')) }, { label: 'Rooms accepted', value: String(sum('accepted')) }, { label: 'Refused steps', value: String(sum('refused')) }],
    chart: { title: 'Results by month', categories: per.map((x) => x.m.label), series: [{ name: 'Recorded', tone: 'info', values: per.map((x) => x.recorded) }, { name: 'Verified', tone: 'ok', values: per.map((x) => x.verified) }] },
    sections: [
      { id: 'months', heading: 'Month by month', table: { title: 'Months', cols: [{ key: 'm', label: 'Month' }, { key: 'r', label: 'Recorded', kind: 'number' }, { key: 'v', label: 'Verified', kind: 'number' }, { key: 'f', label: 'Failures', kind: 'number' }, { key: 'a', label: 'Accepted', kind: 'number' }, { key: 'x', label: 'Refused', kind: 'number' }], rows: per.map((x) => ({ m: x.m.label, r: x.recorded, v: x.verified, f: x.failed, a: x.accepted, x: x.refused })) } },
      { id: 'buildings', heading: 'By building', table: { title: 'Buildings', cols: [{ key: 'b', label: 'Building' }, { key: 'r', label: 'Recorded', kind: 'number' }, { key: 'a', label: 'Accepted', kind: 'number' }, { key: 'x', label: 'Refused', kind: 'number' }], rows: byB.map((x) => ({ b: x.name, r: x.recorded, a: x.accepted, x: x.refused })) } },
      { id: 'accepted', heading: 'Rooms accepted', table: { title: 'Accepted', cols: [{ key: 'at', label: 'When', kind: 'date' }, { key: 'room', label: 'Room' }], rows: accRooms.map((e) => ({ at: e.at.slice(0, 10), room: e.room })) } },
    ], dossier: { months: per.map((x) => ({ month: x.m.key, recorded: x.recorded, verified: x.verified, failed: x.failed, accepted: x.accepted, refused: x.refused })), building: b, synthetic: true } });
  return (
    <section className="wk san" data-native="workspace" data-testid="cx-analytics" data-level={b ? 'building' : 'estate'}>
      <PageHero product="commissioning" icon="chart" eyebrow="Commissioning · analytics" title="Commissioning, measured"
        lede={<>Results recorded and independently verified, failures found, rooms accepted and steps refused — month by month, from the rooms’ own records. Click a building to drill in. Synthetic records. Acting as <b>{personaLabel(persona)}</b>.</>} />
      <nav className="san__path" aria-label="Drill path" data-testid="cxa-path"><a href="#/commissioning/analytics" onClick={(e) => { e.preventDefault(); go({ b: null }); }}>The estate</a>{b ? <> › <b aria-current="page">{buildingByKey(b)?.name || b}</b></> : null}</nav>
      <Segmented label="Window" value={String(n)} onChange={(v) => go({ m: v === '24' ? '24' : null })} options={[{ value: '12', label: '12 months' }, { value: '24', label: '24 months' }]} />
      <div className="kit-grid kit-grid--tiles wk-tiles5" data-testid="cxa-kpis">
        <StatTile label="Results recorded" value={sum('recorded')} /><StatTile label="Independently verified" value={vr ?? '—'} unit={vr === null ? undefined : '%'} tone={vr !== null && vr < 95 ? 'warn' : 'ok'} />
        <StatTile label="Failures found" value={sum('failed')} /><StatTile label="Rooms accepted" value={sum('accepted')} /><StatTile label="Steps refused" value={sum('refused')} hint="a gate holding, recorded" />
      </div>
      <div className="san__charts">
        <TrendChart testId="cxa-results" title="Results recorded and verified, by month (synthetic records)" labels={per.map((x) => x.m.label)} unit="" series={[{ name: 'Recorded', tone: 'info', values: per.map((x) => x.recorded) }, { name: 'Verified', tone: 'ok', dashed: true, values: per.map((x) => x.verified) }]} />
        <TrendChart testId="cxa-accepted" title="Rooms accepted and steps refused, by month" labels={per.map((x) => x.m.label)} unit="" kind="bar" series={[{ name: 'Accepted', tone: 'ok', values: per.map((x) => x.accepted) }, { name: 'Refused', tone: 'warn', values: per.map((x) => x.refused) }]} />
      </div>
      {!b ? <Card icon="building" title="By building" sub="Click a building to drill in" testId="cxa-buildings">
        <div className="san__scroll"><table className="pa-table san__table"><thead><tr><th scope="col">Building</th><th scope="col">Recorded</th><th scope="col">Accepted</th><th scope="col">Refused</th></tr></thead>
          <tbody>{byB.map((x) => <tr key={x.key} data-testid="cxa-building" data-b={x.key}><th scope="row"><a href={`#/commissioning/analytics?b=${x.key}`} onClick={(e) => { e.preventDefault(); go({ b: x.key }); }}>{x.name}</a></th><td className="num">{x.recorded}</td><td className="num">{x.accepted}</td><td className="num">{x.refused}</td></tr>)}</tbody></table></div>
      </Card> : null}
      <Card icon="check" title={`Rooms accepted in the last ${n} months`} sub="Newest first" testId="cxa-rooms">
        <ul className="plain">{accRooms.slice(0, 15).map((e) => { const r = recs.find((x) => x.outline.id === e.room)!; return <li key={e.room + e.at}><span className="ui-mono">{e.at.slice(0, 10)}</span> · <a href={roomHref(r.outline)}>{shortName(r.outline)} · {r.outline.name}</a></li>; })}{!accRooms.length ? <li className="ui-muted">None in this window.</li> : null}</ul>
      </Card>
      <ExportMenu testId="cxa-export" title="Commissioning analytics" by={personaLabel(persona)} sub="This view, with its drill, as six files" make={report} />
    </section>
  );
}
