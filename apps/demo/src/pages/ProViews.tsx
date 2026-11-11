/**
 * Pro's intelligence pages beside the command center (V2.5.3 #/pro/assets, #/pro/issues, #/pro/ops, #/pro/eng): Asset Intelligence,
 * Issue Intelligence, the Operations Hub and Standards and Engineering — computed from the thirty room records (positions, identities,
 * issues, applicable tests, design findings), the service workspace (incidents, work orders, people, certifications, stock, bookings)
 * and the engineering catalogue the rooms are designed from. Nothing is typed in; what is not known is said to be unknown.
 */
import { readsManual } from '../manual/roles.js';
import type { RoleKey } from '../registry.types.js';
import { PageHero, StatTile, Card, Chip, Donut, List, ListRow, EmptyState, MeterRow, Icon, DataTable, ProgressBar, Tag, type Series } from '@empathia/ui';
import { allRecords, openIssues, type RoomRecord } from '../campus/design.js';
import { BUILDINGS, shortName, roomHref, ARCHETYPE_NAME, TEMPLATE_FOR } from '../campus/canon.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { personaLabel, personaOf } from '../build/store.js';
import * as S from '../workspace/store.js';
import { Foot, Stack, plural, pct } from './viz.js';
import { openable } from './V25Nav.js';

const DAY = 864e5; const DONE = ['CLOSED', 'CANCELLED'];
const roomName = (r: RoomRecord) => `${shortName(r.outline)} — ${r.outline.name}`;
const PRO_TABS = [['#/pro', 'Command center', 'pulse'], ['#/pro/assets', 'Assets', 'device'], ['#/pro/issues', 'Issues', 'alert'], ['#/pro/ops', 'Operations', 'wrench'], ['#/pro/eng', 'Standards', 'book'], ['#/v25/exec', 'Executive', 'chart']] as const;
export function ProTabs({ role, current }: { role: string; current: string }) {
  return <nav className="wk-v25nav" aria-label="Pro pages">{PRO_TABS.filter(([h]) => openable(role, h)).map(([h, l, i]) => <Chip key={h} href={h} small icon={i} selected={h === current}>{l}</Chip>)}</nav>;
}
const count = <T,>(xs: T[], f: (x: T) => string) => { const m = new Map<string, number>(); for (const x of xs) m.set(f(x), (m.get(f(x)) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
const TONES: Series[] = ['accent', 'indigo', 'violet', 'info', 'warn', 'ok', 'muted'];
const topSegs = (xs: Array<[string, number]>, max = 6) => { const keep = xs.slice(0, max - 1); const rest = xs.slice(max - 1).reduce((a, [, n]) => a + n, 0); return [...keep, ...(rest ? [['Other', rest] as [string, number]] : [])].map(([k, v], i) => ({ key: k, label: k, value: v, tone: TONES[i % TONES.length]! })); };

// ------------------------------------------------------------------------------------------------------------ Asset Intelligence
export function AssetsPage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective); const recs = allRecords();
  const pos = recs.flatMap((r) => r.positions.filter((p) => !p.furniture).map((p) => ({ r, p })));
  const ident = (['VERIFIED', 'OBSERVED', 'DECLARED', 'UNKNOWN'] as const).map((k, i) => ({ key: k, label: k.toLowerCase(), value: pos.filter((x) => x.p.identity === k).length, tone: (['ok', 'info', 'warn', 'muted'] as Series[])[i]! }));
  const byCat = topSegs(count(pos, (x) => x.p.catLabel));
  const installed = recs.reduce((a, r) => a + r.installations.filter((i) => !i.removedAt).length, 0); const removed = recs.reduce((a, r) => a + r.installations.filter((i) => i.removedAt).length, 0);
  const rows = recs.map((r) => ({ r, n: r.positions.filter((p) => !p.furniture).length, net: r.positions.filter((p) => !p.furniture && p.layer === 'network').length, verified: r.positions.filter((p) => p.identity === 'VERIFIED').length }));
  return (
    <section className="wk" data-native="workspace" data-testid="pro-assets">
      <PageHero product="pro" icon="device" eyebrow="Pro · Asset Intelligence" title="What the organization owns"
        lede={<>Every device position across the campus, its identity and where it is installed. <b>{plural(pos.length, 'position')}</b> in {plural(recs.length, 'room')}; <b>{ident[3]!.value}</b> carry no verified make, model or serial — a class template, never an invented one.</>}
        meta={[<Chip key="m" small tone="muted">Modelled positions</Chip>, <Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]} />
      <ProTabs role={perspective} current="#/pro/assets" />
      <div className="kit-grid kit-grid--tiles wk-tiles4" data-testid="tiles">
        <StatTile label="Device positions" value={pos.length} icon="device" tone="pro" hint={`${byCat.length} kinds · furniture excluded`} />
        <StatTile label="Identity verified" value={ident[0]!.value} unit={`of ${pos.length}`} icon="check" tone="ok" hint="A person other than the installer confirmed it" />
        <StatTile label="Installations on record" value={installed} icon="link" tone="info" hint={`${removed} removed and kept in the history`} />
        <StatTile label="Networked positions" value={rows.reduce((a, x) => a + x.net, 0)} icon="route" tone="indigo" hint="On the room network layer" />
      </div>
      <div className="wk-g2">
        <Card icon="layers" title="Positions by kind"><Donut label="Device positions by kind" total="positions" segments={byCat} /></Card>
        <Card icon="shield" title="How well each unit is known" sub="Identity states, from verified to unknown"><Donut label="Positions by identity state" total="positions" segments={ident} /></Card>
      </div>
      <Card icon="room" title="By room" sub="Positions, networked positions and verified identities" pad={false}>
        <DataTable responsive dense rows={rows} rowKey={(x) => x.r.outline.id} caption="Device positions by room" columns={[
          { key: 'room', header: 'Room', render: (x) => <a href={roomHref(x.r.outline)}>{roomName(x.r)}</a>, sort: (x) => x.r.outline.id },
          { key: 'arch', header: 'Archetype', render: (x) => ARCHETYPE_NAME[x.r.outline.archetype] || x.r.outline.archetype, minor: true },
          { key: 'n', header: 'Positions', render: (x) => x.n, sort: (x) => x.n, align: 'right' },
          { key: 'net', header: 'Networked', render: (x) => x.net, sort: (x) => x.net, align: 'right', minor: true },
          { key: 'v', header: 'Verified', render: (x) => `${x.verified} of ${x.n}`, sort: (x) => x.verified, align: 'right' },
        ]} />
      </Card>
      <Foot>Positions are modelled from each room's archetype; no device was surveyed, and no make, model or serial is invented.</Foot>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------------------ Issue Intelligence
export function IssuesPage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective); const { w } = useWorkspace(); const recs = allRecords();
  const room = recs.flatMap((r) => r.issues.map((i) => ({ r, i })));
  const open = room.filter((x) => x.i.state !== 'RESOLVED');
  const rec = w.incidents.filter((i) => i.recurrenceOf);
  const bySource = topSegs(count(room, (x) => /engine/.test(x.i.source) ? 'Design check' : /field|WO-/.test(x.i.source) ? 'Field report' : 'Commissioning'), 4);
  const sev = (['High', 'Medium', 'Low'] as const).map((s, k) => ({ key: s, label: s, value: open.filter((x) => x.i.severity === s).length, tone: (['bad', 'warn', 'info'] as Series[])[k]! }));
  const rooms = count(open, (x) => x.r.outline.id).length;
  return (
    <section className="wk" data-native="workspace" data-testid="pro-issues">
      <PageHero product="pro" icon="alert" eyebrow="Pro · Issue Intelligence" title="How and where it fails"
        lede={<><b>{plural(open.length, 'room issue')}</b> open in <b>{plural(rooms, 'room')}</b>, beside <b>{plural(w.incidents.filter((i) => !DONE.includes(i.state)).length, 'service job')}</b>; <b>{rec.length}</b> {rec.length === 1 ? 'job is a recurrence' : 'jobs are recurrences'} of an earlier one in the same room.</>}
        meta={[<Chip key="m" small tone="muted">Synthetic records</Chip>, <Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]} />
      <ProTabs role={perspective} current="#/pro/issues" />
      <div className="kit-grid kit-grid--tiles wk-tiles4" data-testid="tiles">
        <StatTile label="Open room issues" value={open.length} unit={`of ${room.length}`} icon="alert" tone="pro" />
        <StatTile label="High severity open" value={sev[0]!.value} icon="alert" tone="bad" />
        <StatTile label="Service jobs open" value={w.incidents.filter((i) => !DONE.includes(i.state)).length} icon="ticket" tone="servicehands" href="#/servicehands" />
        <StatTile label="Recurrences" value={rec.length} icon="undo" tone="apex" href="#/v25/apex" hint="Diagnosed by APEX before another visit" />
      </div>
      <div className="wk-g2">
        <Card icon="pulse" title="Open by severity"><Donut label="Open room issues by severity" total="open" segments={sev} /></Card>
        <Card icon="filter" title="Where issues come from" sub="Every room issue, by the check that found it"><Donut label="Room issues by source" total="issues" segments={bySource} /></Card>
      </div>
      <Card icon="building" title="Open issues by building">
        <ul className="wk-bars">{BUILDINGS.map((b) => { const xs = open.filter((x) => x.r.outline.building === b.key); const svc = w.incidents.filter((i) => i.buildingKey === b.key && !DONE.includes(i.state)).length;
          return <li key={b.key}><span>{b.short}</span><Stack label={b.name} total={Math.max(1, ...BUILDINGS.map((bb) => open.filter((x) => x.r.outline.building === bb.key).length + w.incidents.filter((i) => i.buildingKey === bb.key && !DONE.includes(i.state)).length))} parts={[{ key: 'h', label: 'high', value: xs.filter((x) => x.i.severity === 'High').length, tone: 'bad' }, { key: 'm', label: 'medium', value: xs.filter((x) => x.i.severity === 'Medium').length, tone: 'warn' }, { key: 'l', label: 'low', value: xs.filter((x) => x.i.severity === 'Low').length, tone: 'info' }, { key: 's', label: 'service jobs', value: svc, tone: 'servicehands' }]} /><b>{xs.length + svc}</b></li>; })}</ul>
      </Card>
      <div className="wk-g2">
        <Card icon="inbox" title="Open room issues" sub="Most serious first">
          {open.length ? <List label="Open room issues">{[...open].sort((a, b) => ['High', 'Medium', 'Low'].indexOf(a.i.severity) - ['High', 'Medium', 'Low'].indexOf(b.i.severity)).map((x) => <ListRow key={`${x.r.outline.id}:${x.i.id}`} title={x.i.title} sub={`${roomName(x.r)} · ${x.i.source}`} href={roomHref(x.r.outline)} chevron trailing={<Chip small tone={x.i.severity === 'High' ? 'bad' : x.i.severity === 'Medium' ? 'warn' : 'info'}>{x.i.severity}</Chip>} />)}</List> : <EmptyState title="No room issue is open" icon="check" />}
        </Card>
        <Card icon="undo" tone="apex" title="Incident patterns" sub="Jobs that came back in the same room">
          {rec.length ? <List label="Recurrences">{rec.map((i) => <ListRow key={i.id} title={`${i.id} repeats ${i.recurrenceOf}`} sub={`${i.roomName} · ${i.title}`} href={`#/v25/apex?incident=${i.id}`} chevron leading={<Icon name="spark" />} />)}</List> : <EmptyState title="No recurrence on record" icon="check" />}
        </Card>
      </div>
      <Foot>Issues are synthetic; the severities and sources are the records' own.</Foot>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------------------ Operations Hub
export function OpsHubPage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective); const { w } = useWorkspace(); const now = Date.now();
  const wos = w.workOrders; const openWo = wos.filter((x) => !['DONE', 'CANCELLED'].includes(x.state));
  const certs = w.staff.flatMap((s) => Object.entries(s.certs).map(([k, c]) => ({ s, k, days: Math.round((Date.parse(c.expires) - now) / DAY) }))).sort((a, b) => a.days - b.days);
  const stock = Object.entries(w.stock).map(([part, s]) => ({ part, ...s, age: Math.round((now - Date.parse(s.checkedAt)) / DAY) }));
  const stale = stock.filter((s) => s.age > S.STALE_STOCK_DAYS);
  const bookings = Object.entries(w.bookings).flatMap(([room, bs]) => bs.map((b) => ({ room, ...b })));
  return (
    <section className="wk" data-native="workspace" data-testid="pro-ops">
      <PageHero product="pro" icon="wrench" eyebrow="Pro · Operations Hub" title="The people, parts and windows behind the work"
        lede={<><b>{plural(openWo.length, 'work order')}</b> open; <b>{plural(certs.filter((c) => c.days < 0).length, 'certification')}</b> expired and <b>{certs.filter((c) => c.days >= 0 && c.days <= 60).length}</b> due within 60 days; <b>{plural(stale.length, 'stock check')}</b> older than {S.STALE_STOCK_DAYS} days.</>}
        meta={[<Chip key="m" small tone="muted">Synthetic people and stock</Chip>, <Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]}
        actions={<a className="ui-btn" href="#/service">Dispatch board</a>} />
      <ProTabs role={perspective} current="#/pro/ops" />
      <div className="kit-grid kit-grid--tiles wk-tiles4" data-testid="tiles">
        <StatTile label="Work orders open" value={openWo.length} unit={`of ${wos.length}`} icon="ticket" tone="pro" href="#/service" />
        <StatTile label="People in the pool" value={w.staff.length} icon="users" tone="info" hint={`${w.staff.filter((s) => s.leave).length} on leave · ${w.staff.filter((s) => !s.internal).length} from a partner`} />
        <StatTile label="Certifications due" value={certs.filter((c) => c.days <= 60).length} icon="calendar" tone="warn" hint="Expired or within 60 days" />
        <StatTile label="Stale stock checks" value={stale.length} unit={`of ${stock.length}`} icon="clock" tone={stale.length ? 'bad' : 'ok'} />
      </div>
      <div className="wk-g2">
        <Card icon="users" title="Capacity this period" sub="Hours left for each person">
          <div className="wk-lifebars">{w.staff.map((s) => <ProgressBar key={s.id} small label={`${s.name}${s.leave ? ' · on leave' : ''}`} value={s.capacity.remaining} max={Math.max(...w.staff.map((x) => x.capacity.remaining))} valueText={`${s.capacity.remaining} h`} tone={s.leave ? 'muted' : 'info'} />)}</div>
        </Card>
        <Card icon="calendar" title="Certifications" sub="Soonest to expire first · a lab result is evidence, never a certification">
          <List label="Certifications by expiry">{certs.slice(0, 6).map((c) => <ListRow key={`${c.s.id}:${c.k}`} title={c.s.name} sub={c.k} trailing={<Chip small tone={c.days < 0 ? 'bad' : c.days <= 60 ? 'warn' : 'ok'}>{c.days < 0 ? `expired ${-c.days} d ago` : `${c.days} d left`}</Chip>} />)}</List>
        </Card>
      </div>
      <div className="wk-g2">
        <Card icon="inbox" title="Stock" sub={`A check older than ${S.STALE_STOCK_DAYS} days is not trusted by the preflight`}>
          <List label="Parts in stock">{stock.map((s) => <ListRow key={s.part} title={s.part} sub={`${s.location} · checked ${s.age} d ago`} trailing={<><Tag tone={s.onHand ? 'ok' : 'bad'}>{`${s.onHand} on hand`}</Tag>{s.age > S.STALE_STOCK_DAYS ? <Chip small tone="warn">stale</Chip> : null}</>} />)}</List>
        </Card>
        <Card icon="clock" title="Room bookings in the work windows" sub="A booked room cannot be worked in">
          {bookings.length ? <List label="Bookings">{bookings.map((b) => <ListRow key={`${b.room}:${b.from}`} title={b.title} sub={`${b.room} · ${b.from.replace('T', ' ')} → ${b.to.slice(11)}`} leading={<Icon name="calendar" />} />)}</List> : <EmptyState title="No booking in the windows" icon="check" />}
        </Card>
      </div>
      <Foot>People, partners, stock and bookings are synthetic.</Foot>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------------------ Standards and Engineering
export function StandardsPage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective); const recs = allRecords();
  const arch = count(recs, (r) => r.outline.archetype).map(([k, n]) => { const rs = recs.filter((r) => r.outline.archetype === k); return { k, n, name: ARCHETYPE_NAME[k] || k, template: TEMPLATE_FOR[k]?.template || 'custom', note: TEMPLATE_FOR[k]?.note, tests: Math.round(rs.reduce((a, r) => a + r.counts.applicable, 0) / rs.length), findings: rs.reduce((a, r) => a + r.findings.length, 0), conform: rs.filter((r) => r.counts.applicable && r.counts.verified === r.counts.applicable).length }; });
  const findings = recs.flatMap((r) => r.findings.map((f) => ({ r, f })));
  const bySev = count(findings, (x) => String(x.f.severity));
  const conform = recs.filter((r) => r.counts.applicable && r.counts.verified === r.counts.applicable).length;
  return (
    <section className="wk" data-native="workspace" data-testid="pro-eng">
      <PageHero product="pro" icon="book" eyebrow="Pro · Standards and Engineering" title="The standards every room is built to"
        lede={<><b>{plural(arch.length, 'archetype')}</b> across the campus, each designed from an engineering template; <b>{conform}</b> of {recs.length} rooms have every applicable test verified, and the design checks raised <b>{plural(findings.length, 'finding')}</b>.</>}
        meta={[<Chip key="m" small tone="muted">Class templates · modelled</Chip>, <Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]}
        actions={<><a className="ui-btn" href="#/v25/build">Build a Room</a>{readsManual(perspective as RoleKey) ? <a className="ui-btn" href="#/manual" data-testid="eng-manual">Engineering standards manual</a> : null}</>} />
      <ProTabs role={perspective} current="#/pro/eng" />
      <div className="kit-grid kit-grid--tiles wk-tiles4" data-testid="tiles">
        <StatTile label="Archetypes in use" value={arch.length} icon="layers" tone="pro" />
        <StatTile label="Rooms fully verified" value={conform} unit={`of ${recs.length}`} icon="check" tone="ok" />
        <StatTile label="Design findings" value={findings.length} icon="alert" tone="warn" hint={bySev.map(([k, n]) => `${n} ${k.toLowerCase()}`).join(' · ')} />
        <StatTile label="Average applicable tests" value={Math.round(recs.reduce((a, r) => a + r.counts.applicable, 0) / recs.length)} icon="shield" tone="info" hint="Per room, judged by the engine" />
      </div>
      <Card icon="layers" title="Archetypes and their templates" sub="How many rooms follow each, the tests that apply and how many conform" pad={false}>
        <DataTable responsive dense rows={arch} rowKey={(x) => x.k} caption="Archetypes" columns={[
          { key: 'name', header: 'Archetype', render: (x) => <b>{x.name}</b>, sort: (x) => x.name },
          { key: 't', header: 'Template', render: (x) => <>{x.template}{x.note ? <span className="wk-r__m">{x.note}</span> : null}</>, minor: true },
          { key: 'n', header: 'Rooms', render: (x) => x.n, sort: (x) => x.n, align: 'right' },
          { key: 'tests', header: 'Tests per room', render: (x) => x.tests, sort: (x) => x.tests, align: 'right', minor: true },
          { key: 'c', header: 'Fully verified', render: (x) => `${x.conform} of ${x.n}`, sort: (x) => x.conform, align: 'right' },
          { key: 'f', header: 'Findings', render: (x) => x.findings, sort: (x) => x.findings, align: 'right' },
        ]} />
      </Card>
      <Card icon="building" title="Conformance by building" sub="Rooms with every applicable test verified">
        <ul className="kit-meters">{BUILDINGS.map((b) => { const rs = recs.filter((r) => r.outline.building === b.key); const c = rs.filter((r) => r.counts.applicable && r.counts.verified === r.counts.applicable).length; return rs.length ? <MeterRow key={b.key} label={b.name} sub={`${c} of ${plural(rs.length, 'room')}`} value={pct(c, rs.length)} /> : null; })}</ul>
      </Card>
      <Foot>Templates are engineering classes from the catalogue; a room designed from one is modelled, never surveyed.</Foot>
    </section>
  );
}
export const openRoomIssues = (r: RoomRecord) => openIssues(r).length;
