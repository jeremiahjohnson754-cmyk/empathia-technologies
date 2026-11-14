/**
 * The estate's command centers — Pro (#/pro), Assurance (#/assurance) and Commissioning (#/commissioning) — the V2.5.3 composition
 * (hero with the sentence that matters, five measures, needs attention, which way it is moving) computed from the thirty room records
 * of the canonical campus (campus/design.ts: lifecycle, baselines, issues, test results, all synthetic and deterministic) and the
 * service workspace's incidents. Every rule that sorts a room into a state is written below and shown on the page; nothing is typed in.
 */
import { useMemo, useState } from 'react';
import { PageHero, StatTile, Card, Chip, Donut, List, ListRow, EmptyState, MeterRow, Segmented, Icon, ProgressBar, StatusDot, Tag, type Series, type HealthState } from '@empathia/ui';
import { allRecords, openIssues, type RoomRecord } from '../campus/design.js';
import { cxState, type CxState } from '../campus/cxRecord.js';
import { asState, type AsState } from '../campus/asRecord.js';
import { BUILDINGS, shortName, roomHref } from '../campus/canon.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { personaLabel, personaOf } from '../build/store.js';
import type * as S from '../workspace/store.js';
import { Foot, Stack, plural, pct, weekCounts, weekBacklog, deltaOf } from './viz.js';
import { V25Nav } from './V25Nav.js';
import { ProTabs } from './ProViews.js';
import { AssuranceTabs, CxTabs } from './AssuranceViews.js';
import { AssuranceInsights } from './AssuranceHome.js';
import { readyList } from '../assurance/model.js';

const DONE = ['CLOSED', 'CANCELLED'];
const DAY = 864e5;
const roomName = (r: RoomRecord) => `${shortName(r.outline)} — ${r.outline.name}`;
const accepted = (r: RoomRecord) => r.lifecycle === 'ACCEPTED' || r.lifecycle === 'OPERATIONAL';
const current = (r: RoomRecord) => r.baselines.find((b) => b.state === 'CURRENT') || null;
const pending = (r: RoomRecord) => r.baselines.find((b) => b.state === 'PENDING_ACCEPTANCE') || null;

// ------------------------------------------------------------------------------------------------------------ the rules
export type { CxState };
export const CX: Record<CxState, { label: string; tone: Series; rule: string }> = {
  accepted: { label: 'Accepted', tone: 'ok', rule: 'Accepted or operational, with a current baseline and no open deficiency.' },
  conditions: { label: 'Accepted with conditions', tone: 'warn', rule: 'Accepted, but a deficiency is open or no baseline is on record: usable, with something still owed.' },
  blocked: { label: 'Blocked', tone: 'bad', rule: 'In commissioning with a failed test or an open high-severity deficiency, or held for an independent approval: acceptance cannot be given yet.' },
  progress: { label: 'In commissioning', tone: 'info', rule: 'Tests are being recorded and verified; nothing has failed.' },
  notstarted: { label: 'Not started', tone: 'muted', rule: 'Planned, design-approved or installing: no tests recorded yet.' },
};
export { cxState };
export type { AsState };
export const AS: Record<AsState, { label: string; tone: Series; rule: string }> = {
  matched: { label: 'Matches its baseline', tone: 'ok', rule: 'A current baseline, no open issue and no change waiting: the room behaves as it was commissioned.' },
  drift: { label: 'Drifted', tone: 'warn', rule: 'A current baseline, but an issue is open in the room or a changed configuration waits for a new baseline.' },
  failed: { label: 'Failed a check', tone: 'bad', rule: 'A recorded test failed, or a high-severity issue is open.' },
  none: { label: 'No baseline', tone: 'muted', rule: 'Never accepted against a baseline: there is nothing to compare it with.' },
};
export { asState };
/** Ready for its next session: matches (or drifted without a high issue), accepted, and no service job open in the room. */
const ready = (r: RoomRecord, incidents: S.Incident[]) => accepted(r) && !!current(r) && !openIssues(r).some((i) => i.severity === 'High') && !incidents.some((i) => i.roomId === r.outline.id && !DONE.includes(i.state));

function useEstate() {
  const { w } = useWorkspace();
  const recs = useMemo(() => allRecords(), []);
  return { w, recs };
}
const byBuilding = <T,>(recs: RoomRecord[], f: (r: RoomRecord) => T) => BUILDINGS.map((b) => ({ b, rooms: recs.filter((r) => r.outline.building === b.key) })).filter((x) => x.rooms.length).map((x) => ({ ...x, vals: x.rooms.map(f) }));
const quarterOf = (iso: string) => { const d = new Date(iso); return `${d.getUTCFullYear()} Q${Math.floor(d.getUTCMonth() / 3) + 1}`; };
function Legend({ items }: { items: Array<{ key: string; label: string; tone: Series }> }) { return <ul className="wk-legend">{items.map((x) => <li key={x.key} className={`kit-s--${x.tone}`}><i aria-hidden="true" />{x.label}</li>)}</ul>; }
function Rules<K extends string>({ table }: { table: Record<K, { label: string; tone: Series; rule: string }> }) {
  return <details className="wk-rules"><summary>How a room is sorted</summary><dl className="wk-kv">{(Object.keys(table) as K[]).map((k) => [<dt key={`${k}t`}><Chip small tone={table[k].tone}>{table[k].label}</Chip></dt>, <dd key={`${k}d`}>{table[k].rule}</dd>])}</dl></details>;
}

// ------------------------------------------------------------------------------------------------------------ Commissioning
export function CommissioningPage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective); const { recs } = useEstate();
  const [bld, setBld] = useState('all');
  const scope = bld === 'all' ? recs : recs.filter((r) => r.outline.building === bld);
  const st = scope.map((r) => ({ r, ...cxState(r) }));
  const n = (k: CxState) => st.filter((x) => x.state === k).length;
  const defs = scope.flatMap((r) => openIssues(r).map((i) => ({ r, i })));
  const attention = st.filter((x) => x.state === 'blocked' || x.state === 'progress' || x.state === 'conditions').sort((a, b) => ['blocked', 'progress', 'conditions'].indexOf(a.state) - ['blocked', 'progress', 'conditions'].indexOf(b.state));
  const first = st.find((x) => x.state === 'blocked');
  const baselines = scope.flatMap((r) => r.baselines.map((b) => ({ r, b })));
  const quarters = [...new Set(baselines.map((x) => quarterOf(x.b.at)))].sort();
  const verified = scope.reduce((a, r) => a + r.counts.verified, 0); const applicable = scope.reduce((a, r) => a + r.counts.applicable, 0);
  const bname = bld === 'all' ? 'the campus' : BUILDINGS.find((b) => b.key === bld)?.name || bld;
  return (
    <section className="wk" data-native="workspace" data-testid="commissioning">
      <PageHero product="commissioning" icon="shield" eyebrow="Commissioning · command center" title="Commissioning"
        lede={<>Commissioning proves two things: the system was installed correctly, and the space supports its intended human experience. <b>{plural(n('blocked'), 'room')}</b> {n('blocked') === 1 ? 'is' : 'are'} blocked and <b>{n('conditions')}</b> accepted with conditions{first ? <>; <b>{roomName(first.r)}</b> comes first: {first.why}</> : null}. <b>{plural(defs.length, 'deficiency', 'deficiencies')}</b> open in {bname}.</>}
        meta={[<Chip key="s" small tone="muted">Synthetic records · simulated tests</Chip>, <Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]}
        aside={<ScoreBlock value={verified} max={applicable} label="Applicable tests verified" />} />
      <V25Nav role={perspective} current="#/commissioning" />
      <CxTabs role={perspective} current="#/commissioning" />
      <div className="wk-filters"><Segmented label="Building" value={bld} onChange={setBld} options={[{ value: 'all', label: 'All buildings' }, ...BUILDINGS.map((b) => ({ value: b.key, label: b.short }))]} /></div>
      <div className="kit-grid kit-grid--tiles wk-tiles5" data-testid="tiles">
        <StatTile label="Accepted" value={n('accepted')} unit={`of ${scope.length}`} icon="check" tone="ok" hint="Every required check passed" />
        <StatTile label="With conditions" value={n('conditions')} icon="alert" tone="warn" hint="Usable, with something still owed" />
        <StatTile label="Blocked" value={n('blocked')} icon="lock" tone="bad" hint="Acceptance cannot be given yet" />
        <StatTile label="In commissioning" value={n('progress')} icon="clock" tone="info" hint="Tests being recorded" />
        <StatTile label="Not started" value={n('notstarted')} icon="inbox" tone="muted" hint="No tests recorded yet" />
      </div>
      <div className="wk-g2 wk-g2--wide">
        <Card icon="alert" tone="commissioning" title="Needs attention" sub="Blocked first, then in commissioning, then accepted with conditions" testId="cx-attention">
          {attention.length ? <List label="Rooms that need attention">{attention.slice(0, 8).map((x) => <ListRow key={x.r.outline.id} title={roomName(x.r)} sub={x.why} href={roomHref(x.r.outline)} chevron leading={<Icon name="room" />} trailing={<Chip small tone={CX[x.state].tone}>{CX[x.state].label}</Chip>} />)}</List> : <EmptyState title="No room needs attention" icon="check" />}
          {attention.length > 8 ? <p className="wk-note">{attention.length - 8} more in this scope.</p> : null}
        </Card>
        <Card icon="pulse" title="Where the rooms stand" sub={`${plural(scope.length, 'room')} by commissioning state`}>
          <Donut label="Rooms by commissioning state" total="rooms" segments={(Object.keys(CX) as CxState[]).map((k) => ({ key: k, label: CX[k].label, value: n(k), tone: CX[k].tone }))} />
          <Rules table={CX} />
        </Card>
      </div>
      <Card icon="chart" title="Which way it is moving" sub="Baselines recorded, by quarter · current, superseded or waiting for acceptance">
        <Legend items={[{ key: 'c', label: 'Current', tone: 'ok' }, { key: 's', label: 'Superseded', tone: 'info' }, { key: 'p', label: 'Waiting for acceptance', tone: 'warn' }]} />
        {quarters.length ? <ul className="wk-bars" data-testid="cx-moving">{quarters.map((q) => { const xs = baselines.filter((x) => quarterOf(x.b.at) === q); const c = (s: string) => xs.filter((x) => x.b.state === s).length;
          return <li key={q}><span>{q}</span><Stack label={`${q} baselines`} total={Math.max(...quarters.map((qq) => baselines.filter((x) => quarterOf(x.b.at) === qq).length))} parts={[{ key: 'c', label: 'current', value: c('CURRENT'), tone: 'ok' }, { key: 's', label: 'superseded', value: c('SUPERSEDED'), tone: 'info' }, { key: 'p', label: 'waiting', value: c('PENDING_ACCEPTANCE'), tone: 'warn' }]} /><b>{xs.length}</b></li>; })}</ul>
          : <EmptyState title="No baseline recorded in this scope" icon="inbox" />}
      </Card>
      <Card icon="building" title="Tests verified, by building" sub="Verified by someone other than the person who recorded them, of the tests the engine judged applicable">
        <ul className="kit-meters">{byBuilding(scope, (r) => r.counts).map(({ b, vals }) => { const v = vals.reduce((a, c) => a + c.verified, 0); const a = vals.reduce((s, c) => s + c.applicable, 0); return <MeterRow key={b.key} label={b.name} sub={`${v} of ${a} tests · ${plural(vals.length, 'room')}`} value={pct(v, a)} max={100} />; })}</ul>
      </Card>
      <Foot>Commissioning here is simulated on synthetic records: no room was surveyed and no test was run on real equipment.</Foot>
    </section>
  );
}
function ScoreBlock({ value, max, label }: { value: number; max: number; label: string }) {
  const p = pct(value, max); const state: HealthState = p >= 85 ? 'healthy' : p >= 70 ? 'monitor' : 'action';
  return <div className="wk-score"><span className="wk-score__v">{p}<small>%</small></span><span className="wk-score__l">{label}</span><span className="wk-score__s">{value.toLocaleString('en-GB')} of {max.toLocaleString('en-GB')}</span><StatusDot state={state} /></div>;
}

// ------------------------------------------------------------------------------------------------------------ Assurance
export function AssurancePage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective); const { w, recs } = useEstate();
  const st = recs.map((r) => ({ r, ...asState(r, w.incidents) }));
  const n = (k: AsState) => st.filter((x) => x.state === k).length;
  const attention = st.filter((x) => x.state === 'failed' || x.state === 'drift').sort((a, b) => (a.state === 'failed' ? 0 : 1) - (b.state === 'failed' ? 0 : 1));
  const first = attention[0];
  const rl = readyList(w.incidents, recs); const nAtt = rl.filter((x) => x.out === 'attention').length;
  return (
    <section className="wk" data-native="workspace" data-testid="assurance">
      <PageHero product="commissioning" icon="pulse" eyebrow="Assurance · command center" title="Assurance"
        lede={<>Is the estate still behaving the way it was designed and commissioned to behave? <b>{plural(n('failed'), 'room')}</b> failed a check and <b>{n('drift')}</b> drifted from their baseline{first ? <>; <b>{roomName(first.r)}</b> comes first: {first.why}</> : null}. {nAtt ? <><b>{plural(nAtt, 'high or mission-critical room')}</b> {nAtt === 1 ? 'needs' : 'need'} attention before the next session.</> : <>Every high and mission-critical room is ready for its next session.</>}</>}
        meta={[<Chip key="s" small tone="muted">Modelled · not live monitoring</Chip>, <Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]}
        aside={<ScoreBlock value={n('matched')} max={recs.length} label="Rooms that match their baseline" />} />
      <V25Nav role={perspective} current="#/assurance" />
      <AssuranceTabs role={perspective} current="#/assurance" />
      <div className="kit-grid kit-grid--tiles wk-tiles5" data-testid="tiles">
        <StatTile label="Match their baseline" value={n('matched')} unit={`of ${recs.length}`} icon="check" tone="ok" hint="Commissioned rooms behaving as accepted" />
        <StatTile label="Drifted" value={n('drift')} icon="filter" tone="warn" hint="An issue open or a change waiting" />
        <StatTile label="Failed a check" value={n('failed')} icon="alert" tone="bad" hint="A failed test or a high issue" />
        <StatTile label="No baseline" value={n('none')} icon="inbox" tone="muted" hint="Nothing to compare with" />
        <StatTile label="Ready for the next session" value={rl.filter((x) => x.out === 'ready').length} unit={`of ${rl.length}`} icon="calendar" tone="commissioning" href="#/assurance/ready" hint={`${rl.filter((x) => x.out === 'note').length} with a note · ${rl.filter((x) => x.out === 'attention').length} need attention · high and mission-critical rooms`} />
      </div>
      <div className="wk-g2 wk-g2--wide">
        <Card icon="alert" tone="commissioning" title="Needs attention" sub="Failed first, then drift · open a room for its record" testId="as-attention">
          {attention.length ? <List label="Rooms that need attention">{attention.slice(0, 8).map((x) => <ListRow key={x.r.outline.id} title={roomName(x.r)} sub={x.why} href={roomHref(x.r.outline)} chevron leading={<Icon name="room" />} trailing={<Chip small tone={AS[x.state].tone}>{AS[x.state].label}</Chip>} />)}</List> : <EmptyState title="Every room matches its baseline" icon="check" />}
        </Card>
        <Card icon="pulse" title="Where the estate stands" sub={`${plural(recs.length, 'room')} against their baselines`}>
          <Donut label="Rooms by assurance state" total="rooms" segments={(Object.keys(AS) as AsState[]).map((k) => ({ key: k, label: AS[k].label, value: n(k), tone: AS[k].tone }))} />
          <Rules table={AS} />
        </Card>
      </div>
      <Card icon="building" title="By building" sub="Each building's rooms by assurance state">
        <Legend items={(Object.keys(AS) as AsState[]).map((k) => ({ key: k, label: AS[k].label, tone: AS[k].tone }))} />
        <ul className="wk-bars" data-testid="as-buildings">{byBuilding(recs, (r) => asState(r, w.incidents).state).map(({ b, vals }) => <li key={b.key}><span>{b.short}</span><Stack label={b.name} parts={(Object.keys(AS) as AsState[]).map((k) => ({ key: k, label: AS[k].label, value: vals.filter((v) => v === k).length, tone: AS[k].tone }))} /><b>{vals.length}</b></li>)}</ul>
      </Card>
      <AssuranceInsights role={perspective} w={w} />
      <Foot>Assurance here is modelled from synthetic records; nothing is monitored live, and no claim of operational health is made without live evidence.</Foot>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------------------ Pro
/** The service target by severity (the demonstration's stated policy): restore within this many days of opening. */
export const TARGET_DAYS: Record<string, number> = { 'Mission critical': 1, High: 2, Standard: 5 };
export function ProPage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective); const { w, recs } = useEstate();
  const now = Date.now();
  const inc = w.incidents.filter((i) => !DONE.includes(i.state) && !i.restoredAt);
  const late = (i: S.Incident) => (now - Date.parse(i.openedAt)) / DAY > (TARGET_DAYS[i.severity] ?? 5);
  const roomIssues = recs.flatMap((r) => openIssues(r).map((i) => ({ r, i })));
  const sevSegs = [['High', 'bad'], ['Medium', 'warn'], ['Low', 'info']].map(([s, t]) => ({ key: s!, label: s!, value: roomIssues.filter((x) => x.i.severity === s).length + inc.filter((i) => (s === 'High' ? i.severity !== 'Standard' : s === 'Medium' ? i.severity === 'Standard' : false)).length, tone: t as Series }));
  const needRooms = new Set([...roomIssues.map((x) => x.r.outline.id), ...inc.map((i) => i.roomId), ...recs.filter((r) => cxState(r).state === 'blocked').map((r) => r.outline.id)]);
  const devices = recs.reduce((a, r) => a + r.positions.filter((p) => !p.furniture).length, 0);
  const backlog = weekBacklog(w.incidents, (i) => i.openedAt, (i) => i.restoredAt || i.closedAt);
  const working = [...inc.map((i) => ({ key: i.id, title: i.title, sub: `${i.roomName} · ${i.severity} · opened ${Math.round((now - Date.parse(i.openedAt)) / DAY)} d ago${late(i) ? ` · past its ${TARGET_DAYS[i.severity] ?? 5}-day target` : ''}`, href: i.workOrderId ? `#/servicehands/wo/${i.workOrderId}` : `#/servicehands?id=${i.id}`, tone: (i.severity === 'Standard' ? 'warn' : 'bad') as Series, chip: late(i) ? 'Past target' : i.state, rank: late(i) ? 0 : 1 })),
    ...roomIssues.map(({ r, i }) => ({ key: `${r.outline.id}:${i.id}`, title: i.title, sub: `${roomName(r)} · ${i.severity} · ${i.source}`, href: roomHref(r.outline), tone: (i.severity === 'High' ? 'bad' : i.severity === 'Medium' ? 'warn' : 'info') as Series, chip: i.severity, rank: i.severity === 'High' ? 1 : i.severity === 'Medium' ? 2 : 3 }))].sort((a, b) => a.rank - b.rank);
  return (
    <section className="wk" data-native="workspace" data-testid="pro">
      <ProTabs role={perspective} current="#/pro" />
      <PageHero product="pro" plain icon="chart" eyebrow="Pro · command center" title="Command center"
        lede={<>What is open right now, how it stands against its target, and where to look next. <b>{plural(working.length, 'issue')}</b> open across <b>{plural(needRooms.size, 'room')}</b>; <b>{inc.filter(late).length}</b> service {inc.filter(late).length === 1 ? 'job is' : 'jobs are'} past target.</>}
        meta={[<Chip key="s" small tone="muted">Modelled · not production monitoring</Chip>, <Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]}
        actions={<><a className="ui-btn ui-btn--primary" href="#/v25/exec">Executive passports</a><a className="ui-btn" href="#/service">Dispatch board</a></>} />
      <div className="kit-grid kit-grid--tiles wk-tiles4" data-testid="tiles">
        <StatTile label="Open issues" value={working.length} icon="alert" tone="pro" hint={`${inc.length} service jobs · ${roomIssues.length} room deficiencies`} />
        <StatTile label="Past their target" value={inc.filter(late).length} unit={`of ${inc.length}`} icon="clock" tone="bad" spark={backlog} delta={deltaOf(backlog, 'down', 'open vs 4 wk ago', { level: true })} />
        <StatTile label="Rooms that need action" value={needRooms.size} unit={`of ${recs.length}`} icon="room" tone="warn" href="#/assurance" hint="An issue open or commissioning blocked" />
        <StatTile label="Devices on record" value={devices} icon="device" tone="info" hint="Modelled positions, class templates only" />
      </div>
      <div className="wk-g2 wk-g2--wide">
        <Card icon="inbox" tone="pro" title="Working now" sub="Past target first, then by severity" testId="pro-working">
          {working.length ? <List label="Open issues">{working.slice(0, 8).map((x) => <ListRow key={x.key} title={x.title} sub={x.sub} href={x.href} chevron leading={<Icon name="alert" />} trailing={<Chip small tone={x.tone}>{x.chip}</Chip>} />)}</List> : <EmptyState title="Nothing is open" icon="check" />}
          {working.length > 8 ? <p className="wk-note">{working.length - 8} more open.</p> : null}
        </Card>
        <Card icon="pulse" title="Open issues by severity" sub="Service jobs and room deficiencies together">
          <Donut label="Open issues by severity" total="open" segments={sevSegs} />
          <p className="wk-note">Targets to restore: {Object.entries(TARGET_DAYS).map(([k, v]) => `${k} ${v} d`).join(' · ')} — the demonstration's stated policy.</p>
        </Card>
      </div>
      <Card icon="building" title="Buildings in good standing" sub="Share of each building's rooms accepted with no open issue">
        <ul className="kit-meters">{byBuilding(recs, (r) => cxState(r).state === 'accepted' && !w.incidents.some((i) => i.roomId === r.outline.id && !DONE.includes(i.state))).map(({ b, vals }) => <MeterRow key={b.key} label={b.name} sub={`${vals.filter(Boolean).length} of ${plural(vals.length, 'room')}`} value={pct(vals.filter(Boolean).length, vals.length)} href={`#/campus/${b.key}`} />)}</ul>
      </Card>
      <Card icon="book" title="Lifecycle at a glance" sub="Rooms by where they are, from planned to operational">
        <div className="wk-lifebars">{(['PLANNED', 'DESIGN_APPROVED', 'INSTALLATION_PENDING', 'INSTALLED_UNVERIFIED', 'COMMISSIONING', 'ACCEPTED', 'OPERATIONAL'] as const).map((l) => { const k = recs.filter((r) => r.lifecycle === l).length; return <ProgressBar key={l} small label={l.replace(/_/g, ' ').toLowerCase()} value={k} max={recs.length} valueText={String(k)} tone={l === 'ACCEPTED' || l === 'OPERATIONAL' ? 'ok' : l === 'COMMISSIONING' ? 'info' : 'muted'} />; })}</div>
        <p className="wk-note"><Tag tone="muted">OPERATIONAL</Tag> is never claimed without live monitoring evidence; the earlier record that says so is shown as it was recorded.</p>
      </Card>
      <Foot>Pro here reads the demonstration's synthetic records; it is not production monitoring.</Foot>
    </section>
  );
}
