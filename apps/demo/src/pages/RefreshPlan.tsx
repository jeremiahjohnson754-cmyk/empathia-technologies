/**
 * #/pro/refresh — lifecycle refresh planning (founder, 14 Nov 2026: "lifecycle refresh planning … for ops lead and internal engineers
 * in pro … refresh planning every year and multi year strat planning — it's asset management made easy").
 *
 * The plan is read from the asset spine (refresh/plan.ts): every unit in service by asset ID, its installed date and class, under a
 * service life per class the planner sets. The annual plan lists the units due in a year, room by room; the strategy counts the years
 * ahead by class and building. Service lives and planning figures are the planner's declared assumptions, kept in this browser; nothing
 * here is a manufacturer's end-of-life date or a price. Synthetic records.
 */
import { useMemo, useState } from 'react';
import { PageHero, Card, StatTile, Segmented, Tag, Notice } from '@empathia/ui';
import { BUILDINGS, buildingByKey, SITE } from '../campus/canon.js';
import { allRecords } from '../campus/design.js';
import { syntheticHistory } from '../service/history.js';
import { personaOf, personaLabel } from '../build/store.js';
import { TrendChart } from './TrendChart.js';
import { ExportMenu } from '../export/ExportMenu.js';
import type { Report } from '../export/model.js';
import * as R from '../refresh/plan.js';

const KEY = 'empathia.demo.refresh.v1';
function load(): R.Assumptions {
  const d = R.defaultAssumptions();
  try { const s = localStorage.getItem(KEY); if (s) { const x = JSON.parse(s) as Partial<R.Assumptions>; return { ...d, ...x, life: { ...d.life, ...(x.life || {}) }, cost: { ...(x.cost || {}) } }; } } catch { /* unavailable: the starting assumptions */ }
  return d;
}
function keep(a: R.Assumptions) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* this browser cannot keep it: the plan still shows */ } }
const money = (n: number | null, cur: string) => (n === null ? 'no planning figure declared' : new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n));
const assetHref = (a: string) => `#/v25/asset?a=${a}`;

export function RefreshPlanPage({ perspective, hash }: { perspective: string; hash: string }) {
  const persona = personaOf(perspective); const q = new URLSearchParams(hash.split('?')[1] || '');
  const [a, setA] = useState<R.Assumptions>(load);
  const set = (x: R.Assumptions) => { setA(x); keep(x); };
  const [horizon, setHorizon] = useState<number>(Number(q.get('h')) || 5);
  const b = q.get('b') || '';
  const jobs = useMemo(() => syntheticHistory(), []);
  const records = useMemo(() => allRecords(), []);
  const all = useMemo(() => R.unitsInService(a, jobs, records), [a, jobs, records]);
  const units = useMemo(() => all.filter((u) => !b || u.building === b), [all, b]);
  const rows = useMemo(() => R.strategy(units, horizon, a), [units, horizon, a]);
  const firstWave = rows.find((r) => r.units > 0)?.year ?? null;
  const [year, setYear] = useState<number | null>(null); const y = year ?? firstWave ?? R.NOW_YEAR + 1;
  const plan = useMemo(() => R.annualPlan(units, y), [units, y]);
  const dueInPlan = plan.reduce((s, r) => s + r.due.length, 0);
  const inHorizon = rows.reduce((s, r) => s + r.units, 0); const roomsTouched = new Set(units.filter((u) => u.dueYear <= R.NOW_YEAR + horizon).map((u) => u.room)).size;
  const signals = units.filter((u) => u.signal);
  const classes = [...new Set(units.map((u) => u.cat))].sort((x, z) => R.classLabel(x).localeCompare(R.classLabel(z)));
  const planCost = R.costOf(a, plan.flatMap((r) => r.due)); const horizonCost = R.costOf(a, units.filter((u) => u.dueYear <= R.NOW_YEAR + horizon));
  const go = (p: Record<string, string | null>) => { const s = new URLSearchParams(); const v: Record<string, string | null> = { b: b || null, h: horizon !== 5 ? String(horizon) : null, ...p }; for (const [k, x] of Object.entries(v)) if (x) s.set(k, x); location.hash = `#/pro/refresh${s.toString() ? `?${s}` : ''}`; };
  const topClasses = classes.map((c) => [c, rows.reduce((s, r) => s + (r.byClass[c] || 0), 0)] as const).filter(([, n]) => n > 0).sort((x, z) => z[1] - x[1]);

  const made = { role: personaLabel(persona), at: new Date().toISOString(), build: process.env.DEMO_BUILD_ID || 'dev' };
  const report = (): Report => ({
    schema: 'empathia.report/1', id: `REFRESH-${R.NOW_YEAR + 1}-${R.NOW_YEAR + horizon}${b ? `-${b}` : ''}`, kind: 'refresh-plan', title: 'Lifecycle refresh plan',
    subtitle: `${b ? buildingByKey(b)?.name || b : 'The estate'} · annual plan ${y} · strategy ${R.NOW_YEAR + 1}–${R.NOW_YEAR + horizon}`,
    scope: { tenant: SITE.enterprise, site: SITE.name, building: b ? buildingByKey(b)?.name || b : 'All buildings', floor: 'All floors', room: 'All rooms', roomId: '' },
    status: { label: `${inHorizon} units due in ${horizon} years`, tone: 'muted', why: `first wave ${firstWave ?? 'none in the window'}; ${dueInPlan} units in ${plan.length} rooms in ${y}` },
    generatedAt: made.at, role: made.role, build: made.build,
    provenance: [`Service lives: ${R.LIFE_BASIS}.`, Object.keys(a.cost).length ? `Planning figures per class are the planner’s declared figures (${a.currency}), not quotations.` : 'No planning figure was declared: the plan carries no cost.', 'Synthetic records: the estate’s installations (asset ID, installed date, class) and its service history.', `Made as ${made.role}: a perspective on the record, which grants no permission.`],
    headline: `${units.length} units in service; ${inHorizon} fall due by ${R.NOW_YEAR + horizon} under the declared service lives; the first wave is ${firstWave ?? 'beyond the window'}. ${y}: ${dueInPlan} units in ${plan.length} rooms.`,
    kpis: [{ label: 'Units in service', value: String(units.length) }, { label: `Due by ${R.NOW_YEAR + horizon}`, value: String(inHorizon) }, { label: 'Rooms touched', value: String(roomsTouched) }, { label: 'First wave', value: String(firstWave ?? '—') }, { label: `Planning figure ${R.NOW_YEAR + 1}–${R.NOW_YEAR + horizon}`, value: money(horizonCost, a.currency) }],
    chart: { title: 'Units falling due per year', categories: rows.map((r) => String(r.year)), series: [{ name: 'Units', tone: 'info', values: rows.map((r) => r.units) }, { name: 'Rooms', tone: 'muted', values: rows.map((r) => r.rooms) }] },
    primary: 'Units in service',
    sections: [
      { id: 'strategy', heading: `Strategy ${R.NOW_YEAR + 1}–${R.NOW_YEAR + horizon}`, table: { title: 'Years', cols: [{ key: 'y', label: 'Year' }, { key: 'u', label: 'Units', kind: 'number' }, { key: 'r', label: 'Rooms', kind: 'number' }, { key: 'c', label: 'Planning figure' }, { key: 'k', label: 'Largest classes' }], rows: rows.map((r) => ({ y: String(r.year), u: r.units, r: r.rooms, c: money(r.cost, a.currency), k: Object.entries(r.byClass).sort((x, z) => z[1] - x[1]).slice(0, 3).map(([c, n]) => `${R.classLabel(c)} ${n}`).join(', ') })) } },
      { id: 'annual', heading: `Annual plan ${y}`, text: [plan.length ? `${dueInPlan} units in ${plan.length} rooms; ${plan.filter((r) => r.bundle.suggest).length} rooms suggested for one refresh window.` : `Nothing falls due in ${y} under these service lives.`], table: { title: `Rooms ${y}`, cols: [{ key: 'room', label: 'Room' }, { key: 'b', label: 'Building' }, { key: 'due', label: 'Units due', kind: 'number' }, { key: 'of', label: 'Of', kind: 'number' }, { key: 'w', label: 'One window?' }], rows: plan.map((r) => ({ room: `${r.room} ${r.roomName}`, b: r.building, due: r.due.length, of: r.total, w: r.bundle.suggest ? 'suggested' : '' })) } },
      { id: 'assumptions', heading: 'Assumptions', facts: classes.map((c) => [R.classLabel(c), `${a.life[c] ?? R.DEFAULT_LIFE[c]} years${Number.isFinite(a.cost[c]) ? ` · ${money(a.cost[c]!, a.currency)} each (declared)` : ''}`] as [string, string]) },
      { id: 'units', heading: 'Units in service', table: { title: 'Units in service', cols: [{ key: 'asset', label: 'Asset' }, { key: 'device', label: 'Device' }, { key: 'room', label: 'Room' }, { key: 'inst', label: 'Installed', kind: 'date' }, { key: 'life', label: 'Life (years)', kind: 'number' }, { key: 'due', label: 'Refresh year' }, { key: 'bf', label: 'Break-fix (12 mo)', kind: 'number' }], rows: units.map((u) => ({ asset: u.asset, device: `${u.label} (${R.classLabel(u.cat)})`, room: u.room, inst: u.installedAt.slice(0, 10), life: u.life, due: String(u.dueYear), bf: u.breakFix12 })) } },
    ],
    dossier: { horizon, year: y, building: b || null, assumptions: a, basis: R.LIFE_BASIS, strategy: rows, synthetic: true },
  });

  return (
    <section className="wk san" data-native="workspace" data-testid="refresh-plan" data-horizon={horizon} data-year={y}>
      <PageHero product="commissioning" icon="calendar" eyebrow="Pro · asset lifecycle" title="Refresh planning"
        lede={<>Every unit in service, by asset ID, with the year it falls due under the service life you set for its class: this year’s plan room by room, and the years ahead. Service lives are your planning assumptions, not manufacturer end-of-life dates. Synthetic records. Acting as <b>{personaLabel(persona)}</b>.</>} />
      <div className="san__controls">
        <Segmented label="Strategy horizon" value={String(horizon)} onChange={(v) => { setHorizon(Number(v)); setYear(null); }} options={[1, 3, 5, 7].map((n) => ({ value: String(n), label: `${n} year${n === 1 ? '' : 's'}` }))} />
        <label className="kit-field">Building <select aria-label="Building" value={b} onChange={(e) => { setYear(null); go({ b: e.target.value || null }); }}><option value="">All buildings</option>{BUILDINGS.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}</select></label>
      </div>
      <div className="kit-grid kit-grid--tiles wk-tiles5" data-testid="rp-kpis">
        <StatTile label="Units in service" value={units.length} hint="current installations, by asset ID" />
        <StatTile label={`Due by ${R.NOW_YEAR + horizon}`} value={inHorizon} />
        <StatTile label="Rooms touched" value={roomsTouched} />
        <StatTile label="First wave" value={firstWave ?? '—'} hint={firstWave ? undefined : 'nothing falls due in the window'} />
        <StatTile label="Planning figure" value={horizonCost === null ? '—' : money(horizonCost, a.currency)} hint={horizonCost === null ? 'declare a figure per class below' : 'your declared figures'} />
      </div>
      <TrendChart testId="rp-chart" kind="bar" title={`Units falling due per year, ${R.NOW_YEAR + 1}–${R.NOW_YEAR + horizon} (the first year carries anything already past due)`} labels={rows.map((r) => String(r.year))} unit="" series={[{ name: 'Units', tone: 'info', values: rows.map((r) => r.units) }, { name: 'Rooms', tone: 'muted', values: rows.map((r) => r.rooms) }]} onPick={(i) => setYear(rows[i]!.year)} />

      <Card icon="calendar" title={`Annual plan · ${y}`} sub="The units due that year, room by room; pick a year" testId="rp-annual">
        <p className="build__row">{rows.map((r) => <button key={r.year} type="button" className={`ui-btn ui-btn--sm${r.year === y ? ' ui-btn--primary' : ''}`} aria-pressed={r.year === y} onClick={() => setYear(r.year)}>{r.year} · {r.units}</button>)}</p>
        {!plan.length ? <Notice tone="info">Nothing falls due in {y} under these service lives{firstWave && firstWave !== y ? <>: the first wave is {firstWave}</> : null}.</Notice> : <>
          <p className="ui-muted" data-testid="rp-annual-summary">{dueInPlan} units in {plan.length} rooms · {plan.filter((r) => r.bundle.suggest).length} rooms suggested for one refresh window · planning figure {money(planCost, a.currency)}</p>
          <div className="san__scroll"><table className="pa-table san__table"><thead><tr><th scope="col">Room</th><th scope="col">Units due</th><th scope="col">Window</th></tr></thead><tbody>
            {plan.slice(0, 60).map((r) => <tr key={r.room} data-room={r.room} data-bundle={r.bundle.suggest ? 'yes' : 'no'}>
              <td><a href={`#/commissioning/room/${r.room}`}>{r.room}</a> {r.roomName} <span className="ui-muted">· {r.building}</span></td>
              <td>{r.due.length} of {r.total}: {r.due.slice(0, 4).map((u, k) => <span key={u.asset}>{k ? ', ' : ''}<a href={assetHref(u.asset)}>{u.asset}</a> {u.label}</span>)}{r.due.length > 4 ? ` +${r.due.length - 4}` : ''}</td>
              <td>{r.bundle.suggest ? <Tag tone="info">one window suggested</Tag> : null} <span className="ui-muted">{r.bundle.why}</span></td>
            </tr>)}
          </tbody></table></div>
          {plan.length > 60 && <p className="ui-muted">{plan.length - 60} more rooms in the export.</p>}
        </>}
      </Card>

      <Card icon="chart" title={`Strategy · ${R.NOW_YEAR + 1}–${R.NOW_YEAR + horizon}`} sub="Units due per year by device class" testId="rp-strategy">
        <div className="san__scroll"><table className="pa-table san__table"><thead><tr><th scope="col">Class</th>{rows.map((r) => <th key={r.year} scope="col">{r.year}</th>)}<th scope="col">Life</th></tr></thead><tbody>
          {topClasses.map(([c]) => <tr key={c} data-class={c}><th scope="row">{R.classLabel(c)}</th>{rows.map((r) => <td key={r.year}>{r.byClass[c] || ''}</td>)}<td>{a.life[c]} y</td></tr>)}
          <tr><th scope="row">All units</th>{rows.map((r) => <td key={r.year}><b>{r.units}</b></td>)}<td /></tr>
          <tr><th scope="row">Planning figure</th>{rows.map((r) => <td key={r.year}>{r.cost === null ? '—' : money(r.cost, a.currency)}</td>)}<td /></tr>
        </tbody></table></div>
        {!b && <div className="san__scroll"><table className="pa-table san__table" data-testid="rp-buildings"><thead><tr><th scope="col">Building</th>{rows.map((r) => <th key={r.year} scope="col">{r.year}</th>)}</tr></thead><tbody>
          {BUILDINGS.filter((x) => rows.some((r) => r.byBuilding[x.key])).map((x) => <tr key={x.key}><th scope="row"><a href={`#/pro/refresh?b=${x.key}`} onClick={(e) => { e.preventDefault(); setYear(null); go({ b: x.key }); }}>{x.name}</a></th>{rows.map((r) => <td key={r.year}>{r.byBuilding[x.key] || ''}</td>)}</tr>)}
        </tbody></table></div>}
      </Card>

      <Card icon="wrench" title="Worth a look sooner" sub={`Units with ${a.serviceSignal} or more break-fix jobs in the last 12 months: an argument from the service record, never a change to the plan`} testId="rp-signals">
        {signals.length ? <ul className="build__list">{signals.slice(0, 20).map((u) => <li key={u.asset}><a href={assetHref(u.asset)}>{u.asset}</a> {u.label} · {u.room} · due {u.dueYear} <span className="ui-muted">{u.signal}</span></li>)}</ul>
          : <p className="ui-muted">No unit had {a.serviceSignal} or more break-fix jobs in the last 12 months.</p>}
        <label className="kit-field">Signal at <input type="number" min={1} max={20} aria-label="Break-fix jobs that signal a unit" value={a.serviceSignal} onChange={(e) => set({ ...a, serviceSignal: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} /> break-fix jobs</label>
      </Card>

      <Card icon="settings" title="Your planning assumptions" sub="A service life per class (years) and, if you want costs, a planning figure per unit. Kept in this browser." testId="rp-assumptions">
        <Notice tone="info">{R.LIFE_BASIS}. A planning figure is yours, not a quotation; without one for every class involved, no total is shown.</Notice>
        <div className="san__scroll"><table className="pa-table san__table"><thead><tr><th scope="col">Class</th><th scope="col">Units</th><th scope="col">Service life (years)</th><th scope="col">Planning figure ({a.currency} per unit)</th></tr></thead><tbody>
          {classes.map((c) => <tr key={c} data-class={c}><th scope="row">{R.classLabel(c)}</th><td>{units.filter((u) => u.cat === c).length}</td>
            <td><input type="number" min={1} max={30} aria-label={`Service life of ${R.classLabel(c)}`} value={a.life[c] ?? R.DEFAULT_LIFE[c] ?? 7} onChange={(e) => { const v = Math.max(1, Math.min(30, Math.round(Number(e.target.value) || 1))); setYear(null); set({ ...a, life: { ...a.life, [c]: v } }); }} /></td>
            <td><input type="number" min={0} step={50} aria-label={`Planning figure for ${R.classLabel(c)}`} value={Number.isFinite(a.cost[c]) ? a.cost[c] : ''} placeholder="none" onChange={(e) => { const cost = { ...a.cost }; if (e.target.value === '') delete cost[c]; else cost[c] = Math.max(0, Number(e.target.value) || 0); set({ ...a, cost }); }} /></td></tr>)}
        </tbody></table></div>
        <p className="build__row"><button type="button" className="ui-btn ui-btn--sm" onClick={() => { setYear(null); set(R.defaultAssumptions()); }}>Reset to the starting assumptions</button></p>
      </Card>

      <ExportMenu testId="rp-export" title="Refresh plan" by={personaLabel(persona)} sub="The annual plan, the strategy, the assumptions and every unit, as six files" make={report} />
    </section>
  );
}
