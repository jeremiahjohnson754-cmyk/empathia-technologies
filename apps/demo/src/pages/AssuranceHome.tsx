/**
 * The rest of the Assurance command center, after V2.5.3's (13 Nov 2026): which way the estate is moving, what the findings call for
 * with a rough order of magnitude priced by V2.5.3's eighteen-component cost model, what to open next, the room health check and
 * coverage, and the design reviews. Computed by assurance/model.ts from the room records and the service workspace; every rule is shown.
 */
import { Card, Chip, Icon, List, ListRow, EmptyState, StatTile, type Series } from '@empathia/ui';
import { allRecords, openIssues } from '../campus/design.js';
import { roomHref, shortName } from '../campus/canon.js';
import type * as S from '../workspace/store.js';
import { Stack, plural, pct } from './viz.js';
import { openable } from './V25Nav.js';
import { REMEDY, BUDGET_COMPONENTS, assuranceEstate, assuranceTrend, readyList, plannedChanges, maintenanceSignals, designReviews, costScope, scopeOf, usdRange, isLayoutIssue, incidentCat, roomLabel, REVIEW_RULE, CRIT_RULE, type Remedy } from '../assurance/model.js';

const DONE = ['CLOSED', 'CANCELLED'];

export function AssuranceInsights({ role, w }: { role: string; w: S.Workspace }) {
  const recs = allRecords(); const E = assuranceEstate(w.incidents, recs); const tr = assuranceTrend(w.incidents, recs);
  const now = tr[3]!; const then = tr.find((x) => x.total) || tr[0]!; const share = (x: typeof now) => pct(x.match, x.total);
  const ready = readyList(w.incidents, recs); const att = ready.filter((x) => x.out === 'attention');
  const waiting = plannedChanges(recs, w.incidents); const sig = maintenanceSignals(w.incidents, recs); const reviews = designReviews(recs);
  const max = Math.max(...tr.map((x) => x.total));
  // the room health check: devices with a fault on record, and the seats they reach
  const faulty = recs.map((r) => { const iss = openIssues(r).filter((i) => !isLayoutIssue(i)); const jobs = w.incidents.filter((i) => i.roomId === r.outline.id && !DONE.includes(i.state));
    return { r, devices: new Set([...iss.flatMap((i) => i.positions), ...jobs.map((j) => incidentCat(j))]).size, layout: openIssues(r).some(isLayoutIssue) }; });
  const devFault = faulty.filter((x) => x.devices); const layout = faulty.filter((x) => x.layout);
  const step = (href: string, icon: Parameters<typeof Icon>[0]['name'], tone: Series, t: string, s: string, n: number | '', id: string) => openable(role, href) ? <ListRow key={id} testId={`as-next-${id}`} title={t} sub={s} href={href} chevron leading={<Icon name={icon} />} trailing={n !== '' ? <Chip small tone={tone}>{String(n)}</Chip> : undefined} /> : null;
  const steps = [
    att.length ? step('#/assurance/ready', 'check', 'bad', 'Clear the ready checks that need attention', 'High and mission-critical rooms, least ready first', att.length, 'ready') : null,
    E.byRemedy.recommission.n ? step(`#/assurance/room/${E.byRemedy.recommission.rows[0]!.r.outline.id}/recommission`, 'shield', 'info', 'Recommission the rooms that only need it', `Settings or documents moved; nothing has to be bought. ${shortName(E.byRemedy.recommission.rows[0]!.r.outline)} first`, E.byRemedy.recommission.n, 'recommission') : null,
    waiting.length ? step('#/assurance/change', 'route', 'info', 'Simulate a validation plan before each planned change', `${waiting[0]!.name}${waiting.length > 1 ? `, and ${waiting.length - 1} more` : ''}`, waiting.length, 'change') : null,
    sig.length ? step('#/assurance/signals', 'pulse', 'warn', 'Inspect the devices that show early signs', 'The records point the same way. No failure date is predicted.', sig.length, 'signals') : null,
  ].filter(Boolean);
  // the estimate, by component, across every room with a remedy
  const comp = BUDGET_COMPONENTS.map(([k, label, kind]) => { let lo = 0; let hi = 0; for (const x of E.withRemedy) { const l = costScope(scopeOf(x.r, x.remedy!, w.incidents)).lines.find((y) => y.k === k)!; lo += l.lo; hi += l.hi; } return { k, label, kind, lo, hi }; }).filter((x) => x.hi);
  return (<>
    <div className="wk-g2">
      <Card icon="chart" title="Which way it is moving" sub="Weekly scheduled run of every room with a baseline, last four weeks" testId="as-trend">
        <ul className="wk-legend"><li className="kit-s--ok"><i aria-hidden="true" />Matched</li><li className="kit-s--warn"><i aria-hidden="true" />Found drift</li><li className="kit-s--bad"><i aria-hidden="true" />Found a failure</li></ul>
        <ul className="wk-bars">{tr.map((x) => <li key={x.w}><span>{x.label}</span><Stack label={`${x.label}: assurance runs`} total={max} parts={[{ key: 'm', label: 'matched', value: x.match, tone: 'ok' }, { key: 'd', label: 'found drift', value: x.drift, tone: 'warn' }, { key: 'f', label: 'found a failure', value: x.fail, tone: 'bad' }]} /><b>{x.total}</b></li>)}</ul>
        <p className="wk-note">{now.total ? <>This week <b>{now.match}</b> of {plural(now.total, 'run')} matched the baseline ({share(now)}%){then !== now && then.total ? <>; {then.label.toLowerCase()} it was {then.match} of {then.total} ({share(then)}%)</> : null}.</> : 'No run is recorded this week.'} A modelled schedule: each run finds what the record held that day. A room still being commissioned has no baseline to run against, so it is counted under failed checks above, not here.</p>
      </Card>
      <Card icon="arrow-right" title="What to open next" testId="as-next">
        {steps.length ? <List label="What to open next">{steps}</List> : <EmptyState title="Nothing is waiting" icon="check" />}
      </Card>
    </div>
    <Card icon="layers" title="What the findings call for" sub="Each room is sorted into the mildest remedy its findings allow" testId="as-remedy" action={openable(role, '#/budget') ? <a className="ui-btn ui-btn--small" href="#/budget">Budgeting</a> : undefined}>
      <ul className="as-remedy">{REMEDY.map((k) => { const b = E.byRemedy[k.key as Remedy]; return <li key={k.key} data-testid={`as-remedy-${k.key}`}>
        <details><summary><span className={`as-remedy__n kit-s--${b.n ? k.tone : 'muted'}`}>{b.n}</span><span className="as-remedy__t"><b>{k.label}</b><span>{b.n ? <>{usdRange(b.lo, b.hi)} · {k.what}</> : 'None'}</span></span></summary>
          <p className="wk-note">{k.rule}</p>
          {b.n ? <List label={k.label}>{b.rows.map((x) => <ListRow key={x.r.outline.id} title={roomLabel(x.r)} sub={`${usdRange(x.lo, x.hi)} · ${x.crit.toLowerCase()}`} href={`#/assurance/room/${x.r.outline.id}`} chevron leading={<Icon name="room" />} />)}</List> : null}
        </details></li>; })}</ul>
      <p className="wk-note">Priced with V2.5.3’s eighteen-component cost model, at its rates (labour $95–140, engineering $120–165, commissioning $110–150 an hour) and its catalog ranges: synthetic exposure <b>{usdRange(E.lo, E.hi)}</b> across {plural(E.withRemedy.length, 'room')}. Each figure is rounded on its own, so the rows may not add up to the total exactly. <Chip small tone="warn">ROM estimate · not a quote</Chip></p>
      <details className="wk-rules" data-testid="as-cost-lines"><summary>How the estimate is built</summary><dl className="wk-kv">{comp.map((c) => [<dt key={`${c.k}t`}>{c.label}{c.kind !== 'capex' ? <Chip small tone="muted">{c.kind === 'opex' ? 'a year' : 'reserve'}</Chip> : null}</dt>, <dd key={`${c.k}d`}>{usdRange(c.lo, c.hi)}</dd>])}</dl></details>
    </Card>
    <Card icon="pulse" title="Room health check and coverage" sub="From the faults on record and the seats they reach" testId="as-health">
      <div className="kit-grid kit-grid--tiles wk-tiles3">
        <StatTile label="Rooms with a device fault" value={devFault.length} icon="alert" tone="bad" hint={`${devFault.reduce((a, x) => a + x.devices, 0)} devices or parts of a room: open issues and service jobs`} />
        <StatTile label="Seats in those rooms" value={devFault.reduce((a, x) => a + x.r.outline.capacity, 0)} icon="room" tone="warn" hint="At risk until the fault is cleared" />
        <StatTile label="Seats in rooms with layout drift" value={layout.reduce((a, x) => a + x.r.outline.capacity, 0)} icon="layers" tone="warn" hint={`${plural(layout.length, 'room')}: only the spatial model sees these`} />
      </div>
      <p className="wk-note">A device fault is seen by the service desk; a seat that the camera or microphones no longer reach is seen only by the spatial model of the room. {CRIT_RULE}</p>
    </Card>
    <Card icon="book" title="Design reviews" sub={`${plural(reviews.length, 'room')} under the review rule`} testId="as-reviews">
      {reviews.length ? <List label="Design reviews">{reviews.slice(0, 6).map((x) => <ListRow key={x.r.outline.id} title={roomLabel(x.r)} sub={`Score ${x.score} · ${[...new Set(x.r.findings.map((f) => f.check.replace(/_/g, ' ')))].join(', ')} · ${plural(x.r.findings.length, 'finding')}`} href={roomHref(x.r.outline)} chevron leading={<Icon name="book" />} trailing={<Chip small tone={x.high ? 'bad' : 'warn'}>{x.high ? 'High check' : 'Under 70'}</Chip>} />)}</List> : <EmptyState title="No room is under review" icon="check" />}
      {reviews.length > 6 ? <p className="wk-note">{reviews.length - 6} more rooms under review.</p> : null}
      <p className="wk-note">{REVIEW_RULE}</p>
    </Card>
  </>);
}
