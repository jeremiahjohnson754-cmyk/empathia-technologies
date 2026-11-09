/**
 * #/v14 and its twenty-one addresses: the V1.4 engineering foundation (overview, Instant Connect, telemetry, signage, service (ITSM),
 * schedules, spatial twin, diagnostics, robotic audio, camera survey, optimize, Operations Ready, fixture graph, contracts, capabilities,
 * phase plan, Integrations Hub, asset identity) and the room-scoped ones (#/v14/<view>/<room>). Nothing here is live: every V1.4 record
 * is a deterministic fixture built from the demonstration's own room records and labelled with its evidence kind.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PageHero, Card, StatTile, Tag, Button, Segmented, EmptyState, ProgressBar } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { ROOMS, BUILDINGS, roomById, shortName, fullName, roomHref } from '../campus/canon.js';
import { openIssues, type RoomRecord } from '../campus/design.js';
import { load as loadWorkspace } from '../workspace/store.js';
import { plural, hhmm, day, SIGNAGE } from './core.js';
import { useCore, honest, Crumbs, Pills, Zone, FactsTable, Bars } from './ui.js';
import { V14_DEPLOY, EV, PHASES, PILLS, CAPS, SCHEMA, DIAG, OPS_STATES, IC_KINDS, IC_STATES, SCH_STATES, CM_TESTS, RB_SAFETY, fixtures, indicators, readiness, tz, demoClock, roomLabel, type Ev } from './v14Model.js';
import { CATS } from './Fabric.js';

export const EvBadge = ({ k }: { k: Ev }) => <span className={`pa-ev kit-s--${EV[k][1]}`}>{EV[k][0]}</span>;
const Banner = () => <p className="pa-tower__banner" role="note"><EvBadge k="DEMO" /><span><b>Nothing here is live.</b> This build holds no credentials, calls no vendor API and reaches no device. Every V1.4 record is a deterministic fixture built from the demonstration’s Core and labelled with its evidence kind. Mode {V14_DEPLOY.mode}, fixed at build time.</span></p>;
const Head = ({ title, sub, phase }: { title: string; sub: string; phase?: number }) => <PageHero compact eyebrow={`Empathia V1.4 · foundation${phase ? ` · phase ${String(phase).padStart(2, '0')} of 14` : ''}`} title={title} lede={sub} product="field" icon="layers" meta={honest(['Demonstrator · simulated data', 'warn'])} />;

function RoomPick({ rooms, value, onChange, view }: { rooms: RoomRecord[]; value: string; onChange: (id: string) => void; view: string }) {
  return <div className="pa-toolbar"><label className="pa-field">Room<select className="pa-select" value={value} onChange={(e) => onChange(e.target.value)} data-testid="v14-room">{rooms.map((r) => <option key={r.outline.id} value={r.outline.id}>{roomLabel(r)}</option>)}</select></label><span className="pa-row-actions"><a href={roomHref(roomById(value)!)}>Room page</a><a href={`#/v14/${view}/${value}`}>Address of this view</a></span></div>;
}
const useRoom = (rooms: RoomRecord[], param: string | undefined, fallback: string) => { const ok = rooms.some((r) => r.outline.id === param); const [id, setId] = useState(ok ? param! : rooms.some((r) => r.outline.id === fallback) ? fallback : rooms[0]!.outline.id); return [rooms.find((r) => r.outline.id === id) || rooms[0]!, setId] as const; };

export default function V14Page(p: PageProps) {
  const view = p.params['view'] || ''; const sub = p.params['sub'];
  const known = PILLS.some((x) => x[0] === view);
  return (
    <div className="pa" data-native="" data-testid="parity-v14">
      {!known ? <EmptyState title={`The V1.4 foundation has no view called “${view}”`} icon="layers" action={<a className="ui-btn" href="#/v14">Overview</a>} /> : (
        <>
          <Pills label="V1.4 foundation" items={PILLS.slice(0, 12).map(([k, l]) => ({ label: l, href: `#/v14${k ? `/${k}` : ''}`, on: view === k }))} />
          <Pills label="V1.4 foundation, more" items={PILLS.slice(12).map(([k, l]) => ({ label: l, href: `#/v14/${k}`, on: view === k }))} />
          <View view={view} sub={sub} {...p} />
        </>
      )}
    </div>
  );
}

function View({ view, sub, role }: PageProps & { view: string; sub?: string }) {
  const core = useCore(); const F = fixtures(); const built = core.rooms.filter((r) => !['PLANNED', 'DESIGN_APPROVED', 'INSTALLATION_PENDING'].includes(r.lifecycle));
  switch (view) {
    case '': return <Overview F={F} />;
    case 'graph': return <Graph F={F} />;
    case 'schema': return <Schema />;
    case 'capabilities': return <Caps />;
    case 'plan': return <Plan />;
    case 'hub': return <Hub />;
    case 'identity': return <Identity rooms={core.rooms} />;
    case 'connect': return <Connect sub={sub} />;
    case 'telemetry': return <Telemetry rooms={built} sub={sub} />;
    case 'signage': return <Signage role={role} />;
    case 'itsm': return <Itsm sub={sub} />;
    case 'schedule': return <Schedule rooms={built} />;
    case 'geometry': return <Geometry rooms={core.rooms} sub={sub} />;
    case 'diagnostics': return <Diagnostics rooms={built} sub={sub} />;
    case 'robot': return <Robot rooms={built} sub={sub} />;
    case 'camera': return <Camera rooms={built} sub={sub} />;
    case 'optimize': return <Optimize rooms={core.rooms} sub={sub} />;
    case 'operations': return <Operations rooms={core.rooms} sub={sub} />;
    default: return null;
  }
}

function Overview({ F }: { F: ReturnType<typeof fixtures> }) {
  return (
    <>
      <PageHero eyebrow="Empathia V1.4 · foundation" title="V1.4 foundation" product="field" icon="layers" lede="One canonical graph, typed contracts and an honest evidence vocabulary. Phase 01 of fourteen." meta={honest(['Demonstrator · simulated data', 'warn'])} />
      <Banner />
      <Zone title="What Phase 01 adds" note="The foundation the fourteen phases build on">
        <div className="kit-grid kit-grid--tiles">
          <StatTile label="Tenant → room graph" value={F.rooms.length} icon="room" hint={`rooms in ${F.buildings} buildings on ${F.sites} site, one tenant, each room with its timezone`} href="#/v14/graph" />
          <StatTile label="UC solutions" value={F.rooms.length} icon="device" hint={Object.entries(F.lanes).map(([l, n]) => `${n} ${l.toLowerCase()}`).join(' · ')} />
          <StatTile label="Assets with interfaces" value={F.assets} icon="link" hint={`${F.interfaces} proposed connections; identity ${Object.entries(F.identity).map(([s, n]) => `${n} ${s.toLowerCase()}`).join(', ')}`} href="#/v14/identity" />
          <StatTile label="Contracts" value={F.contracts} icon="book" hint="typed kinds with tenant, provenance and evidence; a validator runs over every fixture" href="#/v14/schema" />
          <StatTile label="Connectors" value={F.connectors} icon="route" hint="named as categories, every one simulated; none is called" href="#/v14/hub" />
          <StatTile label="Capabilities" value={CAPS.length} icon="check" hint={`${CAPS.filter((c) => c[1] === 'LIVE_VERIFIED').length} verified in this build · ${CAPS.filter((c) => c[1] === 'DEMO').length} demonstrated · ${CAPS.filter((c) => c[1] === 'PROPOSED').length} proposed · ${CAPS.filter((c) => c[1] === 'NOT_AUTHORIZED').length} outside a simulated file`} href="#/v14/capabilities" />
        </div>
      </Zone>
      <Zone title="Evidence vocabulary" note="Every V1.4 figure wears one of these"><div className="pa-chips">{(Object.keys(EV) as Ev[]).map((k) => <EvBadge key={k} k={k} />)}</div></Zone>
      <Zone title="The fourteen phases" note="Where each one is in this build"><ol className="pa-steps">{PHASES.map(([n, t, s, k]) => <li key={n} data-state={n === 1 ? 'done' : undefined}><div><div className="pa-steps__t">{t}</div><p className="pa-steps__s">{s}{k ? <> · <a href={`#/v14/${k}`}>open</a></> : ''}</p></div></li>)}</ol></Zone>
    </>
  );
}
function Graph({ F }: { F: ReturnType<typeof fixtures> }) {
  return (<>
    <Head title="Fixture graph" sub="Tenant → Site → Building → Floor → Room → UC solution → compute → assets → interfaces, with aliases to Core ids." />
    <Banner />
    <ol className="pa-flow">{[['Tenant', 1], ['Site', F.sites], ['Building', F.buildings], ['Floor', F.floors], ['Room', F.rooms.length], ['UC solution', F.rooms.length], ['Asset', F.assets], ['Interface', F.interfaces]].map(([k, n]) => <li key={k} className="pa-flow__node"><b>{k}</b><span className="pa-big">{n}</span><EvBadge k="DEMO" /></li>)}</ol>
    <Card title="Rooms by building" icon="building"><Bars label="Rooms by building" rows={BUILDINGS.map((b) => ({ label: b.name, value: ROOMS.filter((r) => r.building === b.key).length, tone: 'field', href: `#/campus/${b.key}` }))} /></Card>
  </>);
}
function Schema() {
  return (<><Head title="Contracts" sub={`${Object.keys(SCHEMA).length} typed kinds; every record names its tenant, its provenance and its evidence kind, and a validator runs over every fixture.`} /><Banner />
    <div className="kit-grid">{Object.entries(SCHEMA).map(([k, f]) => <Card key={k} title={k} icon="book" sub={`${f.length} fields`}><div className="pa-chips">{f.map((x) => <Tag key={x} tone="muted">{x}</Tag>)}</div></Card>)}</div></>);
}
function Caps() {
  return (<><Head title="Capabilities" sub="What this build can do, with the honest status of each. Two words never appear without their evidence kind: works, live." phase={14} /><Banner />
    <div className="pa-table-wrap"><table className="pa-table"><thead><tr><th scope="col">Capability</th><th scope="col">Status</th><th scope="col">In this build</th></tr></thead><tbody>{CAPS.map(([t, e, n], i) => <tr key={i}><td>{t}</td><td><EvBadge k={e} /></td><td className="pa-note">{n}</td></tr>)}</tbody></table></div></>);
}
function Plan() {
  return (<><Head title="Phase plan" sub="Fourteen phases; one page each. Phase 01 is this foundation; the rest are proposed and simulated here." /><Banner />
    <ol className="pa-steps">{PHASES.map(([n, t, s, k]) => <li key={n} data-state={n === 1 ? 'done' : 'now'}><div><div className="pa-steps__t">{String(n).padStart(2, '0')} · {t} <EvBadge k={n === 1 ? 'LIVE_VERIFIED' : n === 14 ? 'DEMO' : 'PROPOSED'} /></div><p className="pa-steps__s">{s}{k ? <> · <a href={`#/v14/${k}`}>open</a></> : ''}</p></div></li>)}</ol></>);
}
function Hub() {
  const [sort, setSort] = useState<'name' | 'dir'>('name');
  const rows = [...CATS].sort((a, b) => (sort === 'name' ? a.label.localeCompare(b.label) : a.dir.localeCompare(b.dir) || a.label.localeCompare(b.label)));
  return (<><Head title="Integrations Hub" sub={`${CATS.length} connector categories, each with a truthful status. No connector is called from this page.`} phase={3} /><Banner />
    <div className="pa-toolbar"><Segmented small label="Sort" value={sort} onChange={setSort} options={[{ value: 'name', label: 'By name' }, { value: 'dir', label: 'By direction' }]} /></div>
    <div className="pa-table-wrap"><table className="pa-table"><thead><tr><th scope="col">Category</th><th scope="col">Kind</th><th scope="col">Direction</th><th scope="col">Scopes it would read</th><th scope="col">Status</th></tr></thead>
      <tbody>{rows.map((c) => <tr key={c.id}><th scope="row"><a href={`#/fabric/c/${c.id}`}>{c.label}</a></th><td>{c.kind}</td><td>{c.dir}</td><td className="pa-note">{c.reads.join(', ')}</td><td><EvBadge k="PROPOSED" /></td></tr>)}</tbody></table></div></>);
}
function Identity({ rooms }: { rooms: RoomRecord[] }) {
  const hw = rooms.flatMap((r) => r.positions.filter((p) => !p.furniture).map((p) => ({ r, p })));
  const by = (s: string) => hw.filter((x) => x.p.identity === s);
  const bench: Array<[string, string, string]> = [['Serial match', 'A unit whose serial is on the record', 'RESOLVED: the position keeps its identity'], ['Same class, two units', 'A second unit of the same class in a room that holds two', 'AMBIGUOUS, never merged: a person reviews'], ['Address reassigned', 'A class the room does not hold, at an address last seen on another room', 'REVIEW with a weak hint, no merge'], ['Name only', 'A hostname alone', 'NEW: nothing to match on']];
  return (<><Head title="Asset identity" sub="What is known about each unit: its identity state from the room record. No make, model or serial is invented; an ambiguous match is reviewed, never merged." phase={4} /><Banner />
    <div className="kit-grid kit-grid--tiles">{(['VERIFIED', 'OBSERVED', 'DECLARED', 'UNKNOWN'] as const).map((s) => <StatTile key={s} label={s.toLowerCase()} value={by(s).length} unit={` of ${hw.length}`} icon="device" hint={s === 'VERIFIED' ? 'read on site and matched' : s === 'OBSERVED' ? 'seen by a host, not yet matched' : s === 'DECLARED' ? 'named by a person, not seen' : 'a class template on a position'} href={`#/list/Device`} />)}</div>
    <div className="pa-split">
      <Card title="The matcher’s bench" icon="check" sub="Four cases it must get right"><FactsTable facts={bench.map(([a, b, c]) => [a, <>{b} → <b>{c}</b></>] as [string, ReactNode])} /></Card>
      <Card title="Positions still unresolved" icon="alert" sub="UNKNOWN or DECLARED: the record keeps the class, not a unit"><Bars label="Unresolved positions by room" rows={rooms.map((r) => ({ label: shortName(r.outline), value: r.positions.filter((p) => !p.furniture && (p.identity === 'UNKNOWN' || p.identity === 'DECLARED')).length, tone: 'warn', href: roomHref(r.outline) })).filter((x) => x.value).sort((a, b) => b.value - a.value).slice(0, 10)} /></Card>
    </div></>);
}
function Connect({ sub }: { sub?: string }) {
  const kind = IC_KINDS.find((k) => k[0] === sub) || null;
  const [job, setJob] = useState<{ kind: string; target: string; step: number } | null>(null); const timer = useRef<number | null>(null);
  useEffect(() => { if (!job || job.step >= IC_STATES.length - 1) return; timer.current = window.setTimeout(() => setJob((j) => (j ? { ...j, step: j.step + 1 } : j)), 700); return () => { if (timer.current) clearTimeout(timer.current); }; }, [job]);
  const targets = kind ? (kind[0] === 'ESTATE' ? [['ESTATE', 'Every building']] : kind[0] === 'BUILDING' ? BUILDINGS.map((b) => [b.key, b.name]) : kind[0] === 'FLOOR' ? [...new Set(ROOMS.map((r) => `${r.building}-${r.floor}`))].map((f) => [f, `${BUILDINGS.find((b) => b.key === f.split('-')[0])?.name} · floor ${f.split('-')[1]}`]) : ROOMS.map((r) => [r.id, fullName(r)])) : [];
  const approved = (t: string) => ['R-BCN-3-101', 'R-ATL-4-218', 'BCN'].includes(t);
  return (<><Head title="Instant Connect" sub="Select a permitted device, engine, room, floor, building or estate. If it is authorized, press Connect once; if not, send one scoped request. Phase 02 of fourteen." phase={2} /><Banner />
    {!kind ? <Zone title="Choose a scope" note="From one device to the estate; one flow"><div className="kit-grid">{IC_KINDS.map(([k, l, d]) => <a key={k} className="pa-card-link" href={`#/v14/connect/${k}`} data-testid={`ic-${k}`}><h3>{l}</h3><p>{d}</p></a>)}</div></Zone> : (
      <>
        <Crumbs items={[['Instant Connect', '#/v14/connect'], [kind[1]]]} />
        <Zone title={`Scope: ${kind[1].toLowerCase()}`} note={kind[2]}>
          <div className="pa-table-wrap"><table className="pa-table"><thead><tr><th scope="col">Target</th><th scope="col">Authorization</th><th scope="col"></th></tr></thead><tbody>{targets.slice(0, 12).map(([id, l]) => <tr key={id}><th scope="row">{l}</th><td>{approved(id!) ? <EvBadge k="DEMO" /> : <EvBadge k="NOT_AUTHORIZED" />}</td><td>{approved(id!) ? <Button small kind="primary" onClick={() => setJob({ kind: kind[0], target: id!, step: 0 })} testId="ic-connect">Connect</Button> : <Button small onClick={() => setJob({ kind: kind[0], target: id!, step: -1 })}>Send a scoped request</Button>}</td></tr>)}</tbody></table></div>
          {targets.length > 12 ? <p className="pa-note">{targets.length - 12} more targets; two rooms and one building are pre-authorized fixtures.</p> : null}
        </Zone>
      </>)}
    <Zone title="Jobs" note={job ? 'one in this page' : 'none yet'}>
      {job ? <Card title={`${job.kind} · ${job.target}`} icon="route" sub={job.step < 0 ? 'A scoped request was sent; nothing runs until a permitted person approves it (simulated: nobody will)' : `${IC_STATES[job.step]!.replace(/_/g, ' ').toLowerCase()} · simulated clock`} testId="ic-job">
        {job.step >= 0 ? <><div className="pa-state-run">{IC_STATES.map((s, i) => <span key={s} data-on={i === job.step} data-done={i < job.step}>{s.replace(/_/g, ' ').toLowerCase()}</span>)}</div><ProgressBar label="Progress" value={job.step} max={IC_STATES.length - 1} valueText={`${job.step} of ${IC_STATES.length - 1} steps`} tone="field" /></> : <EvBadge k="NOT_AUTHORIZED" />}
      </Card> : <p className="pa-note">Choose a scope above. Two rooms and one building are pre-authorized fixtures; everything else needs a request.</p>}
    </Zone></>);
}
function Telemetry({ rooms, sub }: { rooms: RoomRecord[]; sub?: string }) {
  const [r, setR] = useRoom(rooms, sub, 'R-BCN-3-101'); const ind = indicators(r);
  const pass = ind.filter((i) => i.state === 'pass').length;
  return (<><Head title="Telemetry and Assurance core" sub="Versioned decoders, a deduplicated ledger with raw and normalized views, seven independent indicators, and a room health that nothing can type in." phase={5} /><Banner />
    <RoomPick rooms={rooms} value={r.outline.id} onChange={setR} view="telemetry" />
    <div className="kit-grid kit-grid--tiles"><StatTile label="Indicators passing" value={pass} unit={` of ${ind.length}`} icon="pulse" /><StatTile label="Not measured" value={ind.filter((i) => i.state === 'not measured').length} icon="eye" hint="no false PASS: unmeasured stays unmeasured" /><StatTile label="Open issues" value={openIssues(r).length} icon="alert" /></div>
    <div className="pa-table-wrap"><table className="pa-table" data-testid="tel-matrix"><thead><tr><th scope="col">Indicator</th><th scope="col">State</th><th scope="col">What it says · what it may not claim</th><th scope="col">Evidence</th></tr></thead>
      <tbody>{ind.map((i) => <tr key={i.key} className={i.state === 'fail' ? 'pa-diff' : undefined}><th scope="row">{i.label}</th><td><Tag tone={i.state === 'pass' ? 'ok' : i.state === 'fail' ? 'bad' : 'muted'}>{i.state}</Tag></td><td>{i.note}<br /><span className="pa-note">{i.what}</span></td><td><EvBadge k={i.ev} /></td></tr>)}</tbody></table></div></>);
}
function Signage({ role }: { role: string }) {
  const [alert, setAlert] = useState<{ kind: string; zones: string[]; at: number } | null>(null); const [zones, setZones] = useState<string[]>([]);
  const kinds: Array<[string, string, string]> = [['announcement', 'Announcement', 'Shown on the ticker of the selected screens; no fallback channel'], ['emergency', 'Emergency warning', 'Takes over every selected screen; horn page and status lights as fallback; needs a confirmation'], ['allclear', 'All clear', 'Ends an emergency warning; screens return to their playlist']];
  const may = ['ops', 'svcmgr', 'syseng', 'architect', 'service'].includes(role);
  return (<><Head title="Signage control plane" sub={`${SIGNAGE.reduce((s, z) => s + z[6], 0)} screens in ${SIGNAGE.length} zones across the estate; emergency announcements with acknowledgement and a tested fallback. The certified life-safety system stays the authority and is not driven from here.`} phase={3} /><Banner />
    <div className="pa-split">
      <Card title="Zones" icon="map" sub="Pick the screens an announcement goes to"><ul className="pa-queue">{SIGNAGE.map(([id, name, b, , , , displays]) => <li key={id}><label className="pa-check"><input type="checkbox" checked={zones.includes(id)} onChange={(e) => setZones(e.target.checked ? [...zones, id] : zones.filter((z) => z !== id))} /> {name} · {BUILDINGS.find((x) => x.key === b)?.short} · {plural(displays, 'screen')}</label></li>)}</ul></Card>
      <Card title="Announce" icon="bell" sub={may ? 'Delivered to the simulator only; every screen acknowledges on a simulated clock' : 'Your role may look; publishing is for operations roles'}>
        <div className="pa-row-actions">{kinds.map(([k, l, d]) => <Button key={k} kind={k === 'emergency' ? 'danger' : 'secondary'} disabled={!may || !zones.length} title={d} onClick={() => { if (k === 'emergency' && !confirm('Emergency warning: takes over every selected screen (simulated). Continue?')) return; setAlert({ kind: l, zones, at: Date.now() }); }}>{l}</Button>)}</div>
        <p className="pa-note" aria-live="polite">{alert ? `${alert.kind} sent to ${plural(alert.zones.length, 'zone')} at ${hhmm(alert.at)} UTC; acknowledged by every screen (simulated). ` : zones.length ? `${zones.length} zone(s) selected.` : 'Select at least one zone.'}</p>
        {alert ? <FactsTable facts={[['Integration', 'Signage simulator (demonstrator) · APPROVED_DEMO'], ['Fallback', 'horn page and status lights, tested 12 days ago on the demonstration clock'], ['Life safety', 'not driven from here']]} /> : null}
      </Card>
    </div></>);
}
function Itsm({ sub }: { sub?: string }) {
  const w = loadWorkspace(); const tabs: Array<[string, string]> = [['', 'Current incidents'], ['recurring', 'Recurring issues'], ['resolved', 'Resolved history'], ['unmatched', 'Unmatched'], ['setup', 'Connector and privacy']];
  const tab = tabs.some((t) => t[0] === sub) ? sub! : ''; const [synced, setSynced] = useState(false);
  const inc = w.incidents; const cur = inc.filter((i) => i.state !== 'CLOSED' && i.state !== 'RESOLVED'); const rec = inc.filter((i) => i.recurrenceOf); const res = inc.filter((i) => i.state === 'CLOSED' || i.state === 'RESOLVED');
  const list = tab === 'recurring' ? rec : tab === 'resolved' ? res : tab === 'unmatched' ? [] : cur;
  return (<><Head title="Service workspace" sub="Incidents, recurring issues, pending change and the unmatched queue, read from an ITSM instance the customer authorized. Here the ServiceHands workspace of this browser stands in for it." phase={6} /><Banner />
    <p className="pa-tower__banner"><EvBadge k={synced ? 'SIMULATED' : 'NOT_MEASURED'} /><span>{synced ? `${inc.length} incidents read · ${inc.length} matched to a room · 0 duplicates refused · 0 withheld by the source’s ACL (callers withheld)` : 'The source has not been read in this page: no room is called incident-free on that basis.'}</span><Button small onClick={() => setSynced(true)} testId="itsm-sync">Sync now (read-only, mock)</Button></p>
    <Pills label="Service workspace views" items={tabs.map(([k, l]) => ({ label: l, href: `#/v14/itsm${k ? `/${k}` : ''}`, on: tab === k, count: k === '' ? cur.length : k === 'recurring' ? rec.length : k === 'resolved' ? res.length : k === 'unmatched' ? 0 : undefined }))} />
    {tab === 'setup' ? <Card title="Connector and privacy" icon="shield"><FactsTable facts={[['Mode', 'READ_ONLY: no ticket is created or changed from here'], ['Idempotency', 'one record per source id; a re-read updates, never duplicates'], ['Callers', 'withheld: names and contact details never enter Core'], ['Email', 'none is sent'], ['Source', 'the ServiceHands workspace of this browser (mock instance)']]} /></Card>
      : !synced ? <p className="pa-note">Not read yet: press Sync.</p> : list.length ? <div className="pa-table-wrap"><table className="pa-table"><thead><tr><th scope="col">Number</th><th scope="col">Title</th><th scope="col">Room</th><th scope="col">Priority</th><th scope="col">State</th></tr></thead><tbody>{list.map((i) => <tr key={i.id}><th scope="row">{i.id}</th><td>{i.title}{i.recurrenceOf ? <span className="pa-note"> · recurrence of {i.recurrenceOf}</span> : null}</td><td><a href={roomHref(roomById(i.roomId)!)}>{i.roomName}</a></td><td><Tag tone={i.severity === 'Mission critical' ? 'bad' : i.severity === 'High' ? 'warn' : 'info'}>{i.severity}</Tag></td><td>{i.state.toLowerCase().replace(/_/g, ' ')}</td></tr>)}</tbody></table></div> : <EmptyState title={tab === 'unmatched' ? 'Nothing unmatched' : 'Nothing here'} icon="check" tone="ok">{tab === 'unmatched' ? 'Every incident read names a room on the register.' : 'No record in this state.'}</EmptyState>}</>);
}
function Schedule({ rooms }: { rooms: RoomRecord[] }) {
  const [tick, setTick] = useState(0);
  const jobs = rooms.slice(0, 10).map((r, i) => ({ id: `JOB-${String(i + 1).padStart(3, '0')}`, room: r, type: i % 3 === 0 ? 'Recommissioning proposal (biweekly, room-local midnight)' : 'Monitoring read (900 s policy)', state: SCH_STATES[Math.min(SCH_STATES.length - 1, (i + tick) % SCH_STATES.length)]!, attempts: 1 + ((i + tick) % 2), tz: tz(r.outline) }));
  return (<><Head title="Monitoring and schedules" sub="A 900-second read policy with its effective interval, freshness and missed polls; biweekly room-local midnight recommissioning proposals with approvals; the job queue." phase={7} /><Banner />
    <div className="kit-grid kit-grid--tiles"><StatTile label="Read policy" value={900} unit=" s" icon="clock" hint="effective interval never shorter than the source allows" /><StatTile label="Jobs in the queue" value={jobs.length} icon="ticket" /><StatTile label="Active test classes" value={4} icon="shield" hint="audible audio, robotics, camera sweep, system reset need an approval" /></div>
    <div className="pa-toolbar"><p className="pa-note">Demonstration clock {new Date(demoClock).toISOString().slice(0, 16).replace('T', ' ')} UTC; every room keeps its own timezone, so midnight is room-local.</p><Button small onClick={() => setTick(tick + 1)} testId="sch-tick">Advance the simulated clock</Button></div>
    <div className="pa-table-wrap"><table className="pa-table"><thead><tr><th scope="col">Job</th><th scope="col">Room</th><th scope="col">Type</th><th scope="col">State</th><th scope="col" className="num">Attempts</th><th scope="col">Timezone</th></tr></thead><tbody>{jobs.map((j) => <tr key={j.id}><th scope="row">{j.id}</th><td>{shortName(j.room.outline)}</td><td>{j.type}</td><td><Tag tone={j.state === 'COMPLETE' ? 'ok' : j.state.startsWith('WAITING') || j.state === 'REVIEW_REQUIRED' ? 'warn' : 'info'}>{j.state.toLowerCase().replace(/_/g, ' ')}</Tag></td><td className="num">{j.attempts}</td><td>{j.tz}</td></tr>)}</tbody></table></div></>);
}
function Geometry({ rooms, sub }: { rooms: RoomRecord[]; sub?: string }) {
  const [r, setR] = useRoom(rooms, sub, 'R-ATL-4-218'); const [revs, setRevs] = useState<Array<{ n: number; state: string; prov: string; by: string; note: string }>>([{ n: 1, state: 'APPROVED', prov: r.geometryProvenance, by: 'designer', note: 'from the room record' }]);
  useEffect(() => { setRevs([{ n: 1, state: 'APPROVED', prov: r.geometryProvenance, by: 'designer', note: 'from the room record' }]); }, [r]);
  const [w, l, h] = r.outline.dims;
  return (<><Head title="Spatial twin and AI engine" sub="Versioned geometry with provenance and review; consent-gated AI in five modes. No model is called in this build; a proposal is a rule over the record." phase={8} /><Banner />
    <RoomPick rooms={rooms} value={r.outline.id} onChange={setR} view="geometry" />
    <div className="pa-split">
      <Card title="Current geometry" icon="map" sub={`${w} × ${l} × ${h} m · ${r.geometryProvenance}`}><FactsTable facts={[['Width', `${w} m`], ['Length', `${l} m`], ['Ceiling', `${h} m`], ['Objects', String(r.positions.length)], ['Units', 'metres'], ['Provenance', r.geometryProvenance], ['Head revision', `v${revs[revs.length - 1]!.n} (${revs[revs.length - 1]!.state.toLowerCase()})`]]} />
        <div className="pa-row-actions"><Button small onClick={() => setRevs([...revs, { n: revs.length + 1, state: 'DRAFT', prov: 'approximate (edited in this page)', by: 'you', note: 'a draft; needs a reviewer' }])} testId="geo-draft">New draft revision</Button><Button small kind="quiet" disabled={revs[revs.length - 1]!.state !== 'DRAFT'} onClick={() => setRevs(revs.map((x, i) => (i === revs.length - 1 ? { ...x, state: 'IN_REVIEW' } : x)))}>Submit for review</Button></div>
        <p className="pa-note">Approval propagates to Lite, Optimize and Operations Ready; a draft touches nothing. Kept in this page only.</p></Card>
      <Card title="Revisions" icon="clock"><ol className="pa-steps">{revs.map((x) => <li key={x.n} data-state={x.state === 'APPROVED' ? 'done' : 'now'}><div><div className="pa-steps__t">v{x.n} · {x.state.toLowerCase().replace(/_/g, ' ')}</div><p className="pa-steps__s">{x.prov} · {x.by} · {x.note}</p></div></li>)}</ol>
        <h3 className="pa-zone__note">Consent-gated AI, five modes</h3><div className="pa-chips">{['Suggest a layout', 'Check sightlines', 'Propose coverage', 'Explain a finding', 'Compare with the archetype'].map((m) => <Tag key={m} tone="muted">{m} · consent not given</Tag>)}</div><p className="pa-note">Every mode asks for consent, names its inputs and writes to an audit log; none is on in this demonstration.</p></Card>
    </div></>);
}
function Diagnostics({ rooms, sub }: { rooms: RoomRecord[]; sub?: string }) {
  const [r, setR] = useRoom(rooms, sub, 'R-BCN-3-101'); const [run, setRun] = useState<Array<{ t: typeof DIAG[number]; out: string; ev: Ev }> | null>(null);
  const hw = r.positions.filter((p) => !p.furniture); const iss = openIssues(r);
  const go = () => setRun(DIAG.filter((t) => t[3] !== 'FIELD').map((t) => { const applies = /DSP|audio|Beamformer/.test(t[2]) ? hw.some((p) => p.layer === 'audio') : /Display/.test(t[2]) ? hw.some((p) => p.layer === 'display') : /Switch/.test(t[2]) ? hw.some((p) => p.cat === 'switch') : /Touch/.test(t[2]) ? hw.some((p) => p.cat === 'touch' || p.cat === 'control') : /Camera/.test(t[2]) ? hw.some((p) => p.layer === 'video') : /Signage|Telephony|Codec|Windows/.test(t[2]) ? false : true; const hit = applies && iss.some((i) => i.positions.some((c) => { const p = hw.find((x) => x.code === c); return p && new RegExp(p.layer === 'audio' ? 'DSP|audio|Beamformer' : p.layer === 'display' ? 'Display' : p.layer === 'video' ? 'Camera' : p.layer === 'network' ? 'Switch|Network' : 'Touch|Compute', 'i').test(t[2]); })); return { t, out: !applies ? 'NOT_APPLICABLE' : t[3] === 'CONTROL_APPROVED' ? 'NOT_AUTHORIZED' : hit ? 'FAIL' : 'PASS', ev: !applies ? 'NOT_MEASURED' : t[3] === 'CONTROL_APPROVED' ? 'NOT_AUTHORIZED' : 'SIMULATED' }; }));
  return (<><Head title="Remote diagnostics" sub={`${DIAG.length} allowlisted templates in seven capability groups; claims limited to evidence. Functional tests need a control approval; physical tests need a person in the room.`} phase={9} /><Banner />
    <RoomPick rooms={rooms} value={r.outline.id} onChange={setR} view="diagnostics" />
    <div className="pa-toolbar"><p className="pa-note">{run ? `${run.filter((x) => x.out === 'PASS').length} pass · ${run.filter((x) => x.out === 'FAIL').length} fail · ${run.filter((x) => x.out === 'NOT_AUTHORIZED').length} not authorized · ${run.filter((x) => x.out === 'NOT_APPLICABLE').length} not applicable` : 'No run yet in this page.'}</p><Button kind="primary" onClick={go} testId="dg-run">Run the read-only templates (simulated)</Button></div>
    <div className="pa-table-wrap"><table className="pa-table"><thead><tr><th scope="col">Template</th><th scope="col">Group</th><th scope="col">What it reads</th><th scope="col">Needs</th><th scope="col">Outcome</th></tr></thead><tbody>{DIAG.map((t) => { const x = run?.find((y) => y.t[0] === t[0]); return <tr key={t[0]} className={x?.out === 'FAIL' ? 'pa-diff' : undefined}><th scope="row">{t[0]}</th><td>{t[1].replace(/_/g, ' ').toLowerCase()}</td><td>{t[2]}</td><td><Tag tone={t[3] === 'FIELD' ? 'warn' : t[3] === 'CONTROL_APPROVED' ? 'info' : 'muted'}>{t[3].replace(/_/g, ' ').toLowerCase()}</Tag></td><td>{t[3] === 'FIELD' ? <EvBadge k="NOT_MEASURED" /> : x ? <span className="pa-chips"><Tag tone={x.out === 'PASS' ? 'ok' : x.out === 'FAIL' ? 'bad' : 'muted'}>{x.out.replace(/_/g, ' ').toLowerCase()}</Tag><EvBadge k={x.ev} /></span> : '—'}</td></tr>; })}</tbody></table></div></>);
}
function Robot({ rooms, sub }: { rooms: RoomRecord[]; sub?: string }) {
  const [r, setR] = useRoom(rooms, sub, 'R-BCN-3-101'); const [ctx, setCtx] = useState<Record<string, boolean>>(Object.fromEntries(RB_SAFETY.map(([k]) => [k, k !== 'room_clear' && k !== 'technician'])));
  const [run, setRun] = useState<{ poses: number; halted: boolean } | null>(null); const ok = RB_SAFETY.every(([k]) => ctx[k]);
  const zones = Math.max(1, Math.ceil(r.outline.capacity / 8));
  return (<><Head title="Robotic audio measurement" sub="Safety-gated multi-zone audio tests on a simulator; every value synthetic; no sign-off on virtual values; no audio output." phase={10} /><Banner />
    <RoomPick rooms={rooms} value={r.outline.id} onChange={setR} view="robot" />
    <div className="pa-split">
      <Card title="Safety interlocks" icon="shield" sub="Every one must be true before a plan runs; any one going false halts it"><ul className="pa-queue">{RB_SAFETY.map(([k, l]) => <li key={k}><label className="pa-check"><input type="checkbox" checked={!!ctx[k]} onChange={(e) => { setCtx({ ...ctx, [k]: e.target.checked }); if (!e.target.checked && run) setRun({ ...run, halted: true }); }} /> {l}</label></li>)}</ul></Card>
      <Card title="Plan" icon="route" sub={`${zones} zone(s) for ${r.outline.capacity} seats · ${zones * 4} poses · SPL hard stop 85 dB`}>
        <div className="pa-row-actions"><Button kind="primary" disabled={!ok} onClick={() => setRun({ poses: zones * 4, halted: false })} testId="rb-run">Run the plan (simulated)</Button><Button kind="danger" disabled={!run || run.halted} onClick={() => setRun(run ? { ...run, halted: true } : run)}>E-stop</Button></div>
        <p className="pa-note" aria-live="polite">{!ok ? 'Blocked: an interlock is false. The plan will not start.' : run ? run.halted ? `Halted. ${run.poses} poses planned; the run stopped and nothing is signed.` : `${run.poses} poses measured on the simulator. Every value is synthetic: no sign-off.` : 'Interlocks satisfied; the plan may run.'}</p>
        {run && !run.halted ? <FactsTable facts={[['Result', 'synthetic STI and SPL per pose'], ['Evidence', 'SIMULATED'], ['Sign-off', 'refused on virtual values']]} /> : null}
      </Card>
    </div></>);
}
function Camera({ rooms, sub }: { rooms: RoomRecord[]; sub?: string }) {
  const [r, setR] = useRoom(rooms, sub, 'R-ATL-4-218'); const [consent, setConsent] = useState(false); const [run, setRun] = useState(false);
  const cams = r.positions.filter((p) => p.layer === 'video');
  return (<><Head title="Camera and spatial survey" sub="PTZ limits, field of view from the sheet, tested sectors; no phantom dimensions: a distance comes only from the record." phase={11} /><Banner />
    <RoomPick rooms={rooms} value={r.outline.id} onChange={setR} view="camera" />
    <div className="kit-grid kit-grid--tiles"><StatTile label="Cameras in the design" value={cams.length} icon="eye" /><StatTile label="Farthest seat" value={Math.round(Math.hypot(r.outline.dims[0] / 2, r.outline.dims[1]) * 10) / 10} unit=" m" icon="map" hint="from the recorded dimensions, not measured" /><StatTile label="Image consent" value={consent ? 'given' : 'not given'} icon="shield" hint="no image is taken without it" /></div>
    <div className="pa-toolbar"><label className="pa-check"><input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); if (!e.target.checked) setRun(false); }} /> Consent to simulated test images in this room</label><Button kind="primary" disabled={!cams.length} onClick={() => setRun(true)} testId="cm-run">Run the survey (simulated)</Button></div>
    <div className="pa-table-wrap"><table className="pa-table"><thead><tr><th scope="col">Test</th><th scope="col">Needs</th><th scope="col">Outcome</th></tr></thead><tbody>{CM_TESTS.map(([k, l, ev]) => { const needs = /consent|framing|afaewb/.test(k); const out = !run ? '—' : !cams.length ? 'no camera' : ev === 'NOT_MEASURED' ? 'not measured' : needs && !consent ? 'withheld: no consent' : ev === 'OBSERVED' ? 'observed' : 'pass (simulated)'; return <tr key={k}><th scope="row">{l}</th><td className="pa-note">{needs ? 'image consent' : 'the authorized surface'}</td><td>{run ? <span className="pa-chips"><Tag tone={out.startsWith('pass') || out === 'observed' ? 'ok' : 'muted'}>{out}</Tag><EvBadge k={needs && !consent ? 'NOT_AUTHORIZED' : ev} /></span> : '—'}</td></tr>; })}</tbody></table></div></>);
}
function Optimize({ rooms, sub }: { rooms: RoomRecord[]; sub?: string }) {
  const [r, setR] = useRoom(rooms, sub, 'R-BCN-3-101'); const [mode, setMode] = useState<'room' | 'building' | 'portfolio'>('room'); const [scen, setScen] = useState<string[]>([]);
  const area = r.outline.dims[0] * r.outline.dims[1]; const mics = r.positions.filter((p) => p.cat === 'micceil').length; const uncovered = Math.max(0, Math.round(area / 30) - mics);
  const far = Math.hypot(r.outline.dims[0] / 2, r.outline.dims[1]); const disp = r.positions.filter((p) => p.layer === 'display').length;
  const cands = [uncovered ? { k: 'mic', t: `Add ${plural(uncovered, 'ceiling microphone')} over the uncovered seats`, d: `Microphone +${uncovered} · ${Math.round(area)} m² at about 30 m² per array`, why: 'planning rule: assumption, reach radius from the class sheet' } : null, far > 6 && disp ? { k: 'disp', t: 'Larger display for the back rows', d: `Farthest seat ${far.toFixed(1)} m: an image at least ${(far / 6).toFixed(2)} m tall for detailed content`, why: 'ST-VID-02; display sizes from the catalog, not measured' } : null].filter(Boolean) as Array<{ k: string; t: string; d: string; why: string }>;
  const inputs = 34; const have = 6 + (r.baselines.length ? 10 : 0) + (r.counts.verified ? 8 : 0);
  return (<><Head title="Optimize" sub="Baseline from approved geometry, inventory, telemetry, incidents and the customer’s requirements; deterministic scenarios that cite their inputs; nothing projected is called an improvement." phase={12} /><Banner />
    <div className="pa-toolbar"><RoomPick rooms={rooms} value={r.outline.id} onChange={setR} view="optimize" /><Segmented small label="Scope" value={mode} onChange={setMode} options={[{ value: 'room', label: 'Room Optimize' }, { value: 'building', label: 'Building Optimize' }, { value: 'portfolio', label: 'Portfolio Optimize' }]} /></div>
    {mode === 'room' ? <>
      <Zone title="Quick Optimize" note={`Certainty low: ${have} of ${inputs} inputs measured or approved · missing: ${r.baselines.length ? '' : 'approved geometry, '}recommissioning evidence, customer requirements, noise floor`}>
        {cands.length ? <div className="kit-grid">{cands.map((c) => <Card key={c.k} title={c.t} icon="spark" sub={c.d} footer={<span className="pa-chips"><EvBadge k="MODELED" /><span className="pa-note">{c.why}</span></span>}><Button small disabled={scen.includes(c.k)} onClick={() => setScen([...scen, c.k])} testId={`opt-${c.k}`}>{scen.includes(c.k) ? 'Scenario made' : 'Make it a scenario'}</Button></Card>)}</div> : <EmptyState title="Nothing to propose from the planning rules" icon="check" tone="ok">The record meets the coverage and viewing-distance rules it can be judged by here.</EmptyState>}
      </Zone>
      {scen.length ? <Card title="Scenarios" icon="layers" sub={`${scen.length} in this page · version 1 · state DRAFT`}><FactsTable facts={scen.map((k) => [cands.find((c) => c.k === k)?.t || k, <>projected (MODELED) · impacted criteria: {k === 'mic' ? 'speech intelligibility' : 'viewing distance'} · a change needs approval and a retest · <a href="#/v14/operations">Operations Ready</a></>] as [string, ReactNode])} /></Card> : null}
    </> : mode === 'building' ? <Card title={`${BUILDINGS.find((b) => b.key === r.outline.building)?.name}: rooms below the coverage rule`} icon="building"><Bars label="Uncovered arrays by room" rows={rooms.filter((x) => x.outline.building === r.outline.building).map((x) => ({ label: shortName(x.outline), value: Math.max(0, Math.round((x.outline.dims[0] * x.outline.dims[1]) / 30) - x.positions.filter((p) => p.cat === 'micceil').length), tone: 'warn', href: `#/v14/optimize/${x.outline.id}` })).filter((x) => x.value)} /></Card>
      : <Card title="Portfolio: rooms with a candidate" icon="chart" sub="Counted from the planning rules over every room; none is an improvement until a test says so"><Bars label="Candidates by building" rows={BUILDINGS.map((b) => ({ label: b.name, value: rooms.filter((x) => x.outline.building === b.key && (Math.round((x.outline.dims[0] * x.outline.dims[1]) / 30) > x.positions.filter((p) => p.cat === 'micceil').length || (Math.hypot(x.outline.dims[0] / 2, x.outline.dims[1]) > 6 && x.positions.some((p) => p.layer === 'display')))).length, tone: 'field' })).filter((x) => x.value)} /></Card>}</>);
}
function Operations({ rooms, sub }: { rooms: RoomRecord[]; sub?: string }) {
  const [r, setR] = useRoom(rooms, sub, 'R-ATL-4-218'); const R = readiness(r); const fleet = rooms.map((x) => ({ x, s: readiness(x).state }));
  const by: Record<string, number> = {}; fleet.forEach((f) => { by[f.s] = (by[f.s] || 0) + 1; });
  return (<><Head title="Operations Ready" sub="Criterion-driven handoff: every mandatory criterion satisfied or carrying an approved exception, then signed by a permitted signatory. Nothing here signs on its own." phase={13} /><Banner />
    <RoomPick rooms={rooms} value={r.outline.id} onChange={setR} view="operations" />
    <div className="pa-split">
      <Card title={`${shortName(r.outline)}: ${R.state.replace(/_/g, ' ').toLowerCase()}`} icon={R.state === 'OPERATIONS_READY' ? 'check' : 'alert'} tone={R.state === 'OPERATIONS_READY' ? 'ok' : R.state === 'VALIDATION_FAILED' ? 'bad' : 'warn'} sub={OPS_STATES[R.state]}>
        <div className="pa-table-wrap"><table className="pa-table" data-testid="ops-criteria"><thead><tr><th scope="col">Criterion</th><th scope="col">Mandatory</th><th scope="col">State</th><th scope="col">Why</th></tr></thead><tbody>{R.crit.map((c) => <tr key={c.id} className={c.state === 'FAIL' ? 'pa-diff' : undefined}><th scope="row">{c.label}</th><td>{c.mandatory ? 'yes' : 'no'}</td><td><Tag tone={c.state === 'PASS' ? 'ok' : c.state === 'FAIL' ? 'bad' : c.state === 'NOT_APPLICABLE' ? 'muted' : 'warn'}>{c.state.replace(/_/g, ' ').toLowerCase()}</Tag></td><td className="pa-note">{c.why}</td></tr>)}</tbody></table></div>
        <p className="pa-note">Signing needs a permitted role and every mandatory criterion satisfied; this page does not offer a signature it cannot honour. Acceptance history: {r.baselines.length ? r.baselines.map((b) => `v${b.version} ${day(b.at)}`).join(', ') : 'none'}.</p>
      </Card>
      <Card title="The fleet" icon="grid" sub={`${rooms.length} rooms by readiness state`}><Bars label="Rooms by readiness state" rows={Object.entries(by).sort((a, b) => b[1] - a[1]).map(([s, n]) => ({ label: s.replace(/_/g, ' ').toLowerCase(), value: n, tone: s === 'OPERATIONS_READY' ? 'ok' : s === 'VALIDATION_FAILED' ? 'bad' : 'warn' }))} />
        <h3 className="pa-zone__note">The eleven states</h3><FactsTable facts={Object.entries(OPS_STATES).map(([k, v]) => [k.replace(/_/g, ' ').toLowerCase(), v] as [string, string])} /></Card>
    </div></>);
}
