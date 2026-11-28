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
import { isOpenRequest } from '../workspace/requests.js';
import { Foot, Stack, plural, pct } from './viz.js';
import { openable } from './V25Nav.js';
import { TrendChart } from './TrendChart.js';
import { syntheticHistory, workspaceJobs, monthKey } from '../service/history.js';
import { pastTargetOf, TARGETS_TEXT } from '../service/targets.js';
import { loadAssumptions, refreshExposure, lifeOf, LIFE_BASIS, NOW_YEAR } from '../refresh/plan.js';
import { installedDevices, firmwarePosture, standardsCoverage, classLabelOf, STANDARDS_BASIS } from '../standards/devices.js';
import { months, stats, LAYER_LABEL } from '../service/analytics.js';
import { campusStats, recordIssues } from '../campus/metrics.js';
import { CampusMap, Stage } from '../spatial/Spatial.js';
import { readRegister } from '../campus/registerStore.js';
import { deviceRegister, retiredRegister } from '../campus/registers.js';

const DAY = 864e5; const roomName = (r: RoomRecord) => `${shortName(r.outline)} — ${r.outline.name}`;
const PRO_TABS = [['#/pro', 'Command center', 'pulse'], ['#/pro/assets', 'Assets', 'device'], ['#/pro/issues', 'Issues', 'alert'], ['#/pro/ops', 'Operations', 'wrench'], ['#/pro/eng', 'Standards', 'book'], ['#/v25/exec', 'Executive', 'chart']] as const;
export function ProTabs({ role, current }: { role: string; current: string }) {
  return <nav className="wk-v25nav pro-tabs" aria-label="Pro pages">{PRO_TABS.filter(([h]) => openable(role, h)).map(([h, l, i]) => <Chip key={h} href={h} icon={i} selected={h === current}>{l}</Chip>)}</nav>;
}
const count = <T,>(xs: T[], f: (x: T) => string) => { const m = new Map<string, number>(); for (const x of xs) m.set(f(x), (m.get(f(x)) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
const TONES: Series[] = ['accent', 'indigo', 'violet', 'info', 'warn', 'ok', 'muted'];
const topSegs = (xs: Array<[string, number]>, max = 6) => { const keep = xs.slice(0, max - 1); const rest = xs.slice(max - 1).reduce((a, [, n]) => a + n, 0); return [...keep, ...(rest ? [['Other', rest] as [string, number]] : [])].map(([k, v], i) => ({ key: k, label: k, value: v, tone: TONES[i % TONES.length]! })); };

// ------------------------------------------------------------------------------------------------------------ Asset Intelligence
/** The building a jump from the campus map carries (`?building=ATL`, founder 19 Nov 2026 09:09 F: "jumps that keep the selection"):
 *  the page reads that building only, says so, and offers the whole campus back. An unknown key is ignored. */
export const buildingParam = (hash: string | undefined): string | null => { const k = /[?&]building=([A-Z]{2,4})(?:&|$)/.exec(hash || '')?.[1]; return k && BUILDINGS.some((b) => b.key === k) ? k : null; };
const OnlyChip = ({ only, base }: { only: string | null; base: string }) => only ? <Chip small tone="accent">{BUILDINGS.find((b) => b.key === only)!.name} only · <a href={base} data-testid="pro-only-all">the whole campus</a></Chip> : null;

export function AssetsPage({ perspective, hash }: { perspective: string; hash?: string }) {
  const persona = personaOf(perspective); const { w } = useWorkspace(); const only = buildingParam(hash); const recs = allRecords().filter((r) => !only || r.outline.building === only);
  const pos = recs.flatMap((r) => r.positions.filter((p) => !p.furniture).map((p) => ({ r, p })));
  const ident = (['VERIFIED', 'OBSERVED', 'DECLARED', 'UNKNOWN'] as const).map((k, i) => ({ key: k, label: k.toLowerCase(), value: pos.filter((x) => x.p.identity === k).length, tone: (['ok', 'info', 'warn', 'muted'] as Series[])[i]! }));
  const byCat = topSegs(count(pos, (x) => x.p.catLabel));
  const installed = recs.reduce((a, r) => a + r.installations.filter((i) => !i.removedAt).length, 0); const removed = recs.reduce((a, r) => a + r.installations.filter((i) => i.removedAt).length, 0);
  const rows = recs.map((r) => ({ r, n: r.positions.filter((p) => !p.furniture).length, net: r.positions.filter((p) => !p.furniture && p.layer === 'network').length, verified: r.positions.filter((p) => p.identity === 'VERIFIED').length }));
  return (
    <section className="wk" data-native="workspace" data-testid="pro-assets" data-building={only || ''}>
      <ProTabs role={perspective} current="#/pro/assets" />
      <PageHero product="pro" plain icon="device" eyebrow="Pro · what the organization owns" title="Asset Intelligence"
        lede={<>Every device position across the campus, its identity and where it is installed. <b>{plural(pos.length, 'position')}</b> in {plural(recs.length, 'room')}; <b>{ident[3]!.value}</b> carry no verified make, model or serial — a class template, never an invented one.</>}
        meta={[<OnlyChip key="o" only={only} base="#/pro/assets" />, <Chip key="m" small tone="muted">Modeled positions</Chip>, <Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]} />
      <div className="kit-grid kit-grid--tiles wk-tiles4 pro-strip" data-testid="tiles">
        <StatTile label="Device positions" value={pos.length} icon="device" tone="pro" hint={`${byCat.length} kinds · furniture excluded`} />
        <StatTile label="Identity verified" value={ident[0]!.value} unit={`of ${pos.length}`} icon="check" tone="ok" hint="A person other than the installer confirmed it" />
        <StatTile label="Installations on record" value={installed} icon="link" tone="info" hint={`${removed} removed and kept in the history`} />
        <StatTile label="Networked positions" value={rows.reduce((a, x) => a + x.net, 0)} icon="route" tone="indigo" hint="On the room network layer" />
      </div>
      {(() => { const reg = recs.map((r) => deviceRegister(r, readRegister(r.outline.id).entries)).flat(); const done = reg.filter((x) => x.complete).length;
        const retired = recs.reduce((a, r) => a + retiredRegister(r).length, 0); const hist = syntheticHistory().filter((j) => !only || j.building === only); const ms = months(12);
        const onUnits = hist.filter((j) => j.asset && Date.parse(j.openedAt) >= ms[ms.length - 3]!.from).length;
        const docs = recs.filter((r) => r.coverage.length && r.coverage.every((c) => c.state === 'complete' || c.state === 'recorded')).length;
        const cs = campusStats(w); const units = new Set(hist.filter((j) => j.asset).map((j) => j.asset));
        return <>
          <div className="kit-grid kit-grid--tiles wk-tiles4 pro-strip" data-testid="tiles-2">
            <StatTile label="Device register" value={pct(done, reg.length)} unit="%" icon="device" tone="info" hint={`${done} of ${reg.length} registered by installation teams in this browser`} />
            <StatTile label="Retired units" value={retired} icon="undo" tone="muted" hint="Out of the inventory; codes never reused" />
            <StatTile label="Service on units, 3 months" value={onUnits} icon="ticket" tone="servicehands" hint={`jobs naming a unit · ${units.size} units ever serviced (synthetic history)`} href="#/v25/service/analytics?m=6" />
            <StatTile label="Documentation complete" value={docs} unit={`of ${recs.length}`} icon="book" tone="ok" hint="rooms whose every document area is recorded" />
          </div>
          <div className="wk-g2">
            <Card icon="building" title="Buildings" sub="Campus, building, room, device: health is modeled from the records">
              <List label="Buildings">{cs.buildings.filter((b) => b.rooms && (!only || b.b.key === only)).map((b) => <ListRow key={b.b.key} title={b.b.name} sub={`${plural(b.rooms, 'room')} · ${plural(b.devices, 'device position')} · ${b.open} open issue${b.open === 1 ? '' : 's'}${b.verifiedPct != null ? ` · ${b.verifiedPct}% of tests verified` : ''}`} href={`#/commissioning?b=${b.b.key}`} trailing={<Tag tone={b.band === 'healthy' ? 'ok' : b.band === 'monitor' ? 'warn' : 'bad'}>{b.score ?? '—'}</Tag>} />)}</List>
            </Card>
            <Card icon="chart" title="Service on units, by month" sub="Jobs that named a unit, by layer · synthetic service history">
              <TrendChart testId="pro-assets-trend" title="Jobs naming a unit, by month (synthetic history)" labels={ms.map((m) => m.label)} unit=""
                series={(['audio', 'video', 'display', 'control'] as const).map((l, k) => ({ name: LAYER_LABEL[l], tone: (['info', 'violet', 'warn', 'indigo'] as const)[k]!, values: ms.map((m) => hist.filter((j) => j.asset && j.layer === l && monthKey(j.openedAt) === m.key).length) }))} />
            </Card>
          </div>
        </>; })()}
      {(() => { const x = refreshExposure(loadAssumptions(), syntheticHistory(), only, 3);
        // the refresh plan's own figures and assumptions (MI-28); its page opens on the same horizon and building where the role may open it
        // the forecast by year is the refresh plan's, for the roles that plan (ops, syseng, cxeng, architect): others see the units and those
        // due this year or earlier (the review of 17d52076: the service manager saw a forecast it may not open)
        const plans = openable(perspective, '#/pro/refresh'); const rp = plans ? `#/pro/refresh?h=3${only ? `&b=${only}` : ''}` : undefined;
        return <Card icon="calendar" title="Refresh exposure" sub="By planned service life, as the refresh plan counts it" testId="pro-life">
          <div className={`kit-grid kit-grid--tiles ${plans ? 'wk-tiles3' : ''}`}>
            <StatTile testId="pro-life-in" label="Units in service" value={x.inService} icon="device" tone="info" href={rp} hint="current installations, by asset ID" />
            <StatTile testId="pro-life-past" label={`Due in ${NOW_YEAR} or earlier`} value={x.past} unit={`of ${x.inService.toLocaleString('en-US')}`} icon="clock" tone={x.past ? 'warn' : 'ok'} href={rp} hint="their planned life ends this year or has ended" />
            {plans ? <StatTile testId="pro-life-due" label={`Due by ${x.lastYear}`} value={x.dueBy} icon="calendar" tone="pro" href={rp} hint="past due included, as the refresh plan's first year carries it" /> : null}
          </div>
          {plans ? <TrendChart testId="pro-life-years" kind="bar" title={`Units falling due per year, ${x.years[0]!.year}–${x.lastYear} (the first year carries anything already past due)`} labels={x.years.map((y) => String(y.year))} unit="" series={[{ name: 'Units', tone: 'warn', values: x.years.map((y) => y.units) }]} /> : null}
          <p className="wk-note">The service life is a {LIFE_BASIS}. No warranty date is on record.</p>
        </Card>; })()}
      {(() => { const x = firmwarePosture(installedDevices(recs), (room) => readRegister(room).entries);
        // PRO-AS-03: each unit in service against its class standard's firmware baseline (standards/devices.ts, MI-31); the five parts add up to
        // the units in service above. The sets are campus-wide, so a one-building view does not link to them (as Issue Intelligence's).
        const link = (k: string) => !only && openable(perspective, `#/set/${k}`) ? `#/set/${k}` : undefined;
        return <Card icon="shield" title="Firmware posture" sub="Each unit in service against its class standard's approved firmware baseline" testId="pro-fw">
          <div className="kit-grid kit-grid--tiles wk-tiles3">
            <StatTile testId="pro-fw-on" label="On baseline" value={x.on.length} unit={`of ${x.withFirmware.toLocaleString('en-US')}`} icon="check" tone="ok" href={link('fw:on')} hint="the installed version is the approved baseline" />
            <StatTile testId="pro-fw-behind" label="Behind baseline" value={x.behind.length} icon="clock" tone={x.behind.length ? 'warn' : 'ok'} href={link('fw:behind')} hint="on a version older than the approved baseline" />
            <StatTile testId="pro-fw-unv" label="Not validated" value={x.unvalidated.length} icon="alert" tone="muted" href={link('fw:unvalidated')} hint="baseline only proposed, no version on record, or a version no baseline approved" />
          </div>
          <p className="wk-note">Outside the posture: {(() => { const n = (k: string, v: number, id: string) => { const h = link(k); const t = v.toLocaleString('en-US'); return h ? <a href={h} data-testid={id}><b>{t}</b></a> : <b data-testid={id}>{t}</b>; };
            return <>{n('fw:nofirmware', x.nofirmware.length, 'pro-fw-nofw')} units carry no firmware (loudspeakers and racks) and {n('std:none', x.nostandard.length, 'pro-fw-nostd')} no standard covers</>; })()}, so {x.total.toLocaleString('en-US')} in all. Not validated is never counted as on baseline. The installed version is the one the installation team records on the room's device register in this browser, else the room's synthetic commissioning record, which leaves one unit in eleven one version behind; the baselines are {STANDARDS_BASIS}.{openable(perspective, '#/pro/eng') ? <> <a href="#/pro/eng" data-testid="pro-fw-standards">The device standards</a>.</> : null}</p>
        </Card>; })()}
      {(() => { const c = campusStats(w); const tiles = Object.fromEntries(c.buildings.map((b) => [b.b.key, { score: b.score, band: b.band, issues: b.open, rooms: b.rooms }]));
        return <Card icon="map" title="Where units need service" sub="The campus map on the Assets lens: jobs that named a unit in twelve months, per 100 device positions"><div data-testid="pro-asset-map"><Stage label="Asset map" testId="pro-asset-stage"><CampusMap tiles={tiles} lens="assets" current={only || undefined} onOpen={(b) => { location.hash = `#/pro/assets?building=${b.key}`; }} /></Stage></div></Card>; })()}
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
      <Foot>Positions are modeled from each room's archetype; no device was surveyed, and no make, model or serial is invented.</Foot>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------------------ Issue Intelligence
/** Issue Intelligence's service figures (the Pro register's PRO-IS-01, #320; MI-27). The live two are this browser's requests: open, and
 * past their restore target by the dispatch board's rule. The twelve-month three are Service analytics' own (stats over the synthetic
 * history and the workspace's jobs, the same months). "Escalated" is not counted: no record carries an escalation. */
export function issueKpis(w: S.Workspace, nowMs: number, only: string | null = null) {
  const inc = w.incidents.filter((i) => !only || i.buildingKey === only);
  const jobs = [...syntheticHistory(), ...workspaceJobs(w)].filter((j) => !only || j.building === only); const ms = months(12);
  const s = stats(jobs, ms[0]!.from, ms[ms.length - 1]!.to);
  const mon = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return { open: inc.filter(isOpenRequest), late: pastTargetOf(inc, nowMs), mttrH: s.mttrH, restoreSla: s.restoreSla, reopen: s.reopen, closed: s.closed, escalated: null as number | null, from: mon(ms[0]!.from), to: mon(ms[ms.length - 1]!.from) };
}
export function IssuesPage({ perspective, hash }: { perspective: string; hash?: string }) {
  const persona = personaOf(perspective); const { w } = useWorkspace(); const only = buildingParam(hash); const recs = allRecords().filter((r) => !only || r.outline.building === only);
  const inc = w.incidents.filter((i) => !only || i.buildingKey === only);
  const room = recs.flatMap((r) => r.issues.map((i) => ({ r, i })));
  // the record half of issues.open: a record issue that a live request of the same id overrides is that request, which the page counts
  // with the service jobs, so the two halves add up to the campus map's open issues once per id (MI-13)
  const open = recs.flatMap((r) => recordIssues(r, w.incidents).map((i) => ({ r, i })));
  const rec = inc.filter((i) => i.recurrenceOf);
  const bySource = topSegs(count(room, (x) => /engine/.test(x.i.source) ? 'Design check' : /field|WO-/.test(x.i.source) ? 'Field report' : 'Commissioning'), 4);
  const sev = (['High', 'Medium', 'Low'] as const).map((s, k) => ({ key: s, label: s, value: open.filter((x) => x.i.severity === s).length, tone: (['bad', 'warn', 'info'] as Series[])[k]! }));
  const rooms = count(open, (x) => x.r.outline.id).length;
  return (
    <section className="wk" data-native="workspace" data-testid="pro-issues" data-building={only || ''}>
      <ProTabs role={perspective} current="#/pro/issues" />
      <PageHero product="pro" plain icon="alert" eyebrow="Pro · how and where it fails" title="Issue Intelligence"
        lede={<><b>{plural(open.length, 'room issue')}</b> open in <b>{plural(rooms, 'room')}</b>, beside <b>{plural(inc.filter((i) => isOpenRequest(i)).length, 'service job')}</b>; <b>{rec.length}</b> {rec.length === 1 ? 'job is a recurrence' : 'jobs are recurrences'} of an earlier one in the same room.</>}
        meta={[<OnlyChip key="o" only={only} base="#/pro/issues" />, <Chip key="m" small tone="muted">Synthetic records</Chip>, <Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]} />
      <div className="kit-grid kit-grid--tiles wk-tiles4 pro-strip" data-testid="tiles">
        <StatTile label="Open room issues" value={open.length} unit={`of ${room.length}`} icon="alert" tone="pro" />
        <StatTile label="High-severity room issues" value={sev[0]!.value} icon="alert" tone="bad" />
        <StatTile label="Service jobs open" testId="pro-jobs-open" value={inc.filter((i) => isOpenRequest(i)).length} icon="ticket" tone="servicehands" href="#/servicehands" />
        <StatTile label="Recurrences" value={rec.length} icon="undo" tone="apex" href="#/v25/apex" hint="Diagnosed by APEX before another visit" />
      </div>
      {(() => { const k = issueKpis(w, Date.now(), only);
        // each figure opens its records where this role may open them: the set of late issues, and Service analytics for the same twelve
        // months and building (the review of af85e226: technicians and systems engineers were sent to a page they may not open)
        const lateHref = !only && openable(perspective, '#/set/iss:late') ? '#/set/iss:late' : undefined;
        const svcHref = openable(perspective, '#/v25/service/analytics') ? `#/v25/service/analytics?m=12${only ? `&b=${only}` : ''}` : undefined;
        return <><div className="kit-grid kit-grid--tiles wk-tiles4 pro-strip" data-testid="pro-issues-service">
          <StatTile testId="pro-late" label="Past their target" value={k.late.length} unit={`of ${k.open.length}`} icon="clock" tone="bad" href={lateHref} hint={`open requests not restored within their target (${TARGETS_TEXT}), or restored after it`} />
          <StatTile testId="pro-mttr" label="Median time to restore" value={k.mttrH} unit=" h" icon="clock" tone="info" href={svcHref} hint={`median of the jobs restored, opened ${k.from} through ${k.to}, as Service analytics counts them`} />
          <StatTile testId="pro-in-target" label="Restored within target" value={k.restoreSla} unit="%" icon="check" tone="ok" href={svcHref} hint={`of the jobs restored, opened ${k.from} through ${k.to}`} />
          <StatTile testId="pro-reopened" label="Reopened after closure" value={k.reopen} unit="%" icon="undo" tone="warn" href={svcHref} hint={`of ${plural(k.closed, 'job')} closed, ${k.from} through ${k.to}`} />
        </div>
        <p className="wk-note" data-testid="pro-escalated">Escalated and still open: not counted, because no record in this demonstration carries an escalation.</p></>; })()}
      {/* #234 (founder 13:42, 14:00): the failure map — the same campus map with the Issues lens, counts and rates per 10 rooms, the source and
          its time, each building drilling to its rooms. One map component, so it agrees with Campus and Mission Control. */}
      {(() => { const c = campusStats(w); const tiles = Object.fromEntries(c.buildings.map((b) => [b.b.key, { score: b.score, band: b.band, issues: b.open, rooms: b.rooms }]));
        return <Card icon="map" title="Where it fails" sub="Open room issues on the campus map: counts or per 10 rooms; select a building for its rooms"><div data-testid="pro-failure-map"><Stage label="Failure map" testId="pro-map-stage"><CampusMap tiles={tiles} lens="issues" current={only || undefined} onOpen={(b) => { location.hash = `#/campus/${b.key}`; }} /></Stage></div></Card>; })()}
      <div className="wk-g2">
        <Card icon="pulse" title="Open by severity"><Donut label="Open room issues by severity" total="open" segments={sev} /></Card>
        <Card icon="filter" title="Where issues come from" sub="Every room issue, by the check that found it"><Donut label="Room issues by source" total="issues" segments={bySource} /></Card>
      </div>
      {(() => { const hist = syntheticHistory().filter((j) => !only || j.building === only); const ms = months(12);
        const repeat = [...hist.reduce((m, j) => m.set(j.roomId, [...(m.get(j.roomId) || []), j]), new Map<string, typeof hist>()).entries()].map(([id, js]) => ({ id, name: js[0]!.roomName, n: js.length, layers: [...new Set(js.map((j) => j.layer))] })).sort((a, b) => b.n - a.n).slice(0, 6);
        return <div className="wk-g2" data-testid="pro-issues-trends">
          <Card icon="chart" title="Issues by month and layer" sub="Opened in the synthetic service history · click through to Service analytics">
            <TrendChart testId="pro-issues-trend" title="Jobs opened by layer, by month (synthetic history)" labels={ms.map((m) => m.label)} unit=""
              series={(['audio', 'video', 'display', 'control', 'network'] as const).map((l, k) => ({ name: LAYER_LABEL[l], tone: (['info', 'violet', 'warn', 'indigo', 'ok'] as const)[k]!, values: ms.map((m) => hist.filter((j) => j.layer === l && monthKey(j.openedAt) === m.key).length) }))} />
            {openable(perspective, '#/v25/service/analytics') ? <p className="wk-note">Response, restore and reopening by vendor and month: <a href={`#/v25/service/analytics?m=12${only ? `&b=${only}` : ''}`}>Service analytics</a></p> : null}
          </Card>
          <Card icon="undo" title="Rooms that keep coming back" sub="Most service jobs in fifteen months · synthetic history">
            <List label="Rooms with the most service jobs">{repeat.map((r) => <ListRow key={r.id} title={r.name} sub={`${r.layers.map((l) => LAYER_LABEL[l]).join(', ')}`} href={`#/commissioning/room/${r.id}`} trailing={<Tag tone="warn">{r.n}</Tag>} />)}</List>
          </Card>
        </div>; })()}
      {/* the bars follow the page's building filter, with that building's service jobs (re-review of c7bcc0aa, MC-open-05) */}
      {(() => { const shown = only ? BUILDINGS.filter((b) => b.key === only) : BUILDINGS; const svcOf = (k: string) => inc.filter((i) => i.buildingKey === k && isOpenRequest(i)).length;
        return <Card icon="building" title="Open issues by building">
        <ul className="wk-bars">{shown.map((b) => { const xs = open.filter((x) => x.r.outline.building === b.key); const svc = svcOf(b.key);
          return <li key={b.key}><span>{b.short}</span><Stack label={b.name} total={Math.max(1, ...shown.map((bb) => open.filter((x) => x.r.outline.building === bb.key).length + svcOf(bb.key)))} parts={[{ key: 'h', label: 'high', value: xs.filter((x) => x.i.severity === 'High').length, tone: 'bad' }, { key: 'm', label: 'medium', value: xs.filter((x) => x.i.severity === 'Medium').length, tone: 'warn' }, { key: 'l', label: 'low', value: xs.filter((x) => x.i.severity === 'Low').length, tone: 'info' }, { key: 's', label: 'service jobs', value: svc, tone: 'servicehands' }]} /><b>{xs.length + svc}</b></li>; })}</ul>
      </Card>; })()}
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
      <ProTabs role={perspective} current="#/pro/ops" />
      <PageHero product="pro" plain icon="wrench" eyebrow="Pro · the people, parts and windows behind the work" title="Operations Hub"
        lede={<><b>{plural(openWo.length, 'work order')}</b> open; <b>{plural(certs.filter((c) => c.days < 0).length, 'certification')}</b> expired and <b>{certs.filter((c) => c.days >= 0 && c.days <= 60).length}</b> due within 60 days; <b>{plural(stale.length, 'stock check')}</b> older than {S.STALE_STOCK_DAYS} days.</>}
        meta={[<Chip key="m" small tone="muted">Synthetic people and stock</Chip>, <Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]}
        actions={<a className="ui-btn" href="#/service">Dispatch board</a>} />
      <div className="kit-grid kit-grid--tiles wk-tiles4 pro-strip" data-testid="tiles">
        <StatTile label="Work orders open" value={openWo.length} unit={`of ${wos.length}`} icon="ticket" tone="pro" href="#/service" />
        <StatTile label="People in the pool" value={w.staff.length} icon="users" tone="info" hint={`${w.staff.filter((s) => s.leave).length} on leave · ${w.staff.filter((s) => !s.internal).length} from a partner`} />
        <StatTile label="Certifications due" value={certs.filter((c) => c.days <= 60).length} icon="calendar" tone="warn" hint="Expired or within 60 days" />
        <StatTile label="Stale stock checks" value={stale.length} unit={`of ${stock.length}`} icon="clock" tone={stale.length ? 'bad' : 'ok'} />
      </div>
      {(() => { const hist = syntheticHistory(); const ms = months(12); const ser = ms.map((m) => stats(hist, m.from, m.to));
        return <Card icon="chart" title="Service against its targets, by month" sub="Response and restore within SLA · synthetic service history" testId="pro-ops-trend">
          <TrendChart testId="pro-ops-sla" title="SLA attainment by month (synthetic history)" labels={ms.map((m) => m.label)} unit="%" max={100} band={{ at: 90, label: 'target 90%' }}
            series={[{ name: 'Response within SLA', tone: 'info', values: ser.map((x) => x.respondSla) }, { name: 'Restore within SLA', tone: 'violet', values: ser.map((x) => x.restoreSla) }]} />
          <p className="wk-note">Each vendor against its agreement: <a href="#/v25/service/analytics">the vendor scorecard</a>.</p>
        </Card>; })()}
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
      <ProTabs role={perspective} current="#/pro/eng" />
      <PageHero product="pro" plain icon="book" eyebrow="Pro · Standards and Engineering" title="The standards every room is built to"
        lede={<><b>{plural(arch.length, 'archetype')}</b> across the campus, each designed from an engineering template; <b>{conform}</b> of {recs.length} rooms have every applicable test verified, and the design checks raised <b>{plural(findings.length, 'finding')}</b>.</>}
        meta={[<Chip key="m" small tone="muted">Class templates · modeled</Chip>, <Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]}
        actions={<><a className="ui-btn" href="#/v25/build">Build a Room</a>{readsManual(perspective as RoleKey) ? <a className="ui-btn" href="#/manual" data-testid="eng-manual">Engineering standards manual</a> : null}</>} />
      <div className="kit-grid kit-grid--tiles wk-tiles4 pro-strip" data-testid="tiles">
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
      {(() => { const cov = standardsCoverage(installedDevices(recs)); const a = loadAssumptions(); const plans = openable(perspective, '#/pro/refresh'); const sets = openable(perspective, '#/set/std:none');
        const flaggedBy = count(cov.flagged, (d) => classLabelOf(d.cat));
        // PRO-EN-01: the device standards, the units each covers (the set std:<class>), the units none covers (flagged, std:none); the service
        // life is the refresh plan's planning assumption for the class (lifeOf, MI-33), linked to the plan where the role may open it
        return <Card icon="device" title="Device standards" sub="Per device class: the approved model, the firmware baseline and the service life" pad={false} testId="eng-standards"
          footer={<p className="wk-note">{cov.flagged.length ? <><b>Flagged:</b> {sets ? <a href="#/set/std:none" data-testid="std-flagged">{plural(cov.flagged.length, 'unit')}</a> : <span data-testid="std-flagged">{plural(cov.flagged.length, 'unit')}</span>} in service {cov.flagged.length === 1 ? 'has' : 'have'} no standard ({flaggedBy.map(([k, n]) => `${k} ${n}`).join(', ')}): a projector is a legacy class, and facilities and security classes follow other teams' standards. </> : <span data-testid="std-flagged">0 units are flagged: every unit in service has a standard. </span>}
            These are {STANDARDS_BASIS}. The service life is the refresh plan's {LIFE_BASIS}. A proposed baseline validates nothing until it is approved.</p>}>
          <DataTable responsive dense rows={cov.rows} rowKey={(x) => x.s.id} caption="Device standards" columns={[
            { key: 'cls', header: 'Class', render: (x) => <b data-std={x.s.cat}>{classLabelOf(x.s.cat)}</b>, sort: (x) => classLabelOf(x.s.cat) },
            { key: 'model', header: 'Approved model', render: (x) => <>{x.s.model}<span className="wk-r__m">{x.s.id}</span></>, minor: true },
            { key: 'fw', header: 'Firmware baseline', render: (x) => x.s.firmware ? <>{x.s.firmware.version} <Tag tone={x.s.firmware.state === 'approved' ? 'ok' : 'warn'}>{x.s.firmware.state}</Tag><span className="wk-r__m">{x.s.firmware.state === 'approved' ? `${x.s.firmware.by}, ${x.s.firmware.at}` : `${x.s.firmware.by} (${x.s.firmware.at}); ${x.s.note}`}</span></> : <span className="ui-muted">{x.s.note}</span> },
            { key: 'life', header: 'Service life', render: (x) => { const t = `${lifeOf(a, x.s.cat)} years`; return plans ? <a href="#/pro/refresh" data-testid={`std-life-${x.s.cat}`}>{t}</a> : <span data-testid={`std-life-${x.s.cat}`}>{t}</span>; }, sort: (x) => lifeOf(a, x.s.cat), align: 'right' },
            { key: 'n', header: 'Units in service', render: (x) => sets ? <a href={`#/set/std:${x.s.cat}`} data-testid={`std-units-${x.s.cat}`}>{x.devices.length.toLocaleString('en-US')}</a> : <span data-testid={`std-units-${x.s.cat}`}>{x.devices.length.toLocaleString('en-US')}</span>, sort: (x) => x.devices.length, align: 'right' },
          ]} />
        </Card>; })()}
      <Card icon="building" title="Conformance by building" sub="Rooms with every applicable test verified">
        <ul className="kit-meters">{BUILDINGS.map((b) => { const rs = recs.filter((r) => r.outline.building === b.key); const c = rs.filter((r) => r.counts.applicable && r.counts.verified === r.counts.applicable).length; return rs.length ? <MeterRow key={b.key} label={b.name} sub={`${c} of ${plural(rs.length, 'room')}`} value={pct(c, rs.length)} /> : null; })}</ul>
      </Card>
      <Foot>Templates are engineering classes from the catalog; a room designed from one is modeled, never surveyed.</Foot>
    </section>
  );
}
export const openRoomIssues = (r: RoomRecord) => openIssues(r).length;
