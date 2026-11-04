/**
 * #/fabric (the Integration Fabric: how the systems an estate already has would meet Core), #/fabric/c and #/fabric/c/<id> (one connector
 * category) and #/fabric/events (the Event Fabric: one event enters Core and every surface that depends on it reacts). SIMULATED
 * INTEGRATION: no external system is connected; a category describes what it would read, never a vendor or a product.
 */
import { useState, type ReactElement } from 'react';
import { PageHero, Card, StatTile, Tag, Button, EmptyState } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { shortName } from '../campus/canon.js';
import { TYPES, plural, type EntityType } from './core.js';
import { useCore, honest, Crumbs, Pills, Zone, FactsTable, TypeIcon } from './ui.js';

interface Cat { id: string; label: string; kind: string; dir: 'Into Core' | 'Both ways'; reads: string[]; writes?: string[]; feeds: EntityType[] }
export const CATS: Cat[] = [
  { id: 'uc', label: 'Collaboration / UC', kind: 'Meeting platform connector', dir: 'Into Core', reads: ['Room registration', 'Call quality summaries', 'Meeting starts and ends'], feeds: ['Room', 'Issue'] },
  { id: 'net', label: 'Network management', kind: 'Network controller connector', dir: 'Into Core', reads: ['Switch ports', 'Link state', 'Segment membership'], feeds: ['NetworkNode', 'Device'] },
  { id: 'avdm', label: 'AV device management', kind: 'Device management connector', dir: 'Both ways', reads: ['Device state', 'Firmware versions'], writes: ['Configuration signatures a person approved'], feeds: ['Device'] },
  { id: 'itsm', label: 'ITSM', kind: 'Service desk connector', dir: 'Both ways', reads: ['Incidents', 'Assignments'], writes: ['Resolution notes'], feeds: ['Issue', 'Request'] },
  { id: 'bms', label: 'Building management', kind: 'Building systems connector', dir: 'Into Core', reads: ['Air quality points', 'Occupancy'], feeds: ['EnvironmentalSensor'] },
  { id: 'cal', label: 'Calendar and scheduling', kind: 'Calendar connector', dir: 'Into Core', reads: ['Room bookings', 'Free and busy'], feeds: ['Room'] },
  { id: 'idp', label: 'Identity', kind: 'Directory connector', dir: 'Into Core', reads: ['People', 'Groups', 'Roles'], feeds: ['Vendor'] },
  { id: 'cmdb', label: 'Asset register / CMDB', kind: 'Configuration items connector', dir: 'Both ways', reads: ['Configuration items', 'Relationships'], writes: ['Room and device records a person approved'], feeds: ['Device', 'Room'] },
  { id: 'sig', label: 'Signage CMS', kind: 'Signage connector', dir: 'Both ways', reads: ['Players', 'Playlists'], writes: ['Priority messages'], feeds: ['SignageZone'] },
  { id: 'pwr', label: 'Power and racks', kind: 'Power distribution connector', dir: 'Into Core', reads: ['Outlet state', 'Load'], feeds: ['PowerNode'] },
  { id: 'sec', label: 'Physical security', kind: 'Access control connector', dir: 'Into Core', reads: ['Door state', 'Access windows'], feeds: ['Room'] },
  { id: 'tel', label: 'Telephony', kind: 'Voice connector', dir: 'Into Core', reads: ['Registration', 'Line state'], feeds: ['Device'] },
  { id: 'maker', label: 'Maker notices', kind: 'Lifecycle notice feed', dir: 'Into Core', reads: ['End of sale', 'End of support', 'Advisories'], feeds: ['Device', 'Recommendation'] },
  { id: 'fin', label: 'Procurement and finance', kind: 'Finance connector', dir: 'Both ways', reads: ['Purchase orders', 'Committed cost'], writes: ['Approved purchase decisions'], feeds: ['BudgetScenario', 'PurchaseDecision'] },
  { id: 'lms', label: 'Learning', kind: 'Learning platform connector', dir: 'Into Core', reads: ['Course completions'], feeds: ['Document'] },
  { id: 'dms', label: 'Documents', kind: 'Document store connector', dir: 'Into Core', reads: ['Drawings', 'Reports', 'Guides'], feeds: ['Document', 'Design'] },
];

export default function FabricPage(p: PageProps) {
  const seg = p.hash.replace(/^#\/?/, '').split(/[?~]/)[0]!.split('/').filter(Boolean);
  const nav = <Pills label="Fabrics" items={[{ label: 'Integration fabric', href: '#/fabric', on: seg[1] !== 'events' }, { label: 'Event fabric', href: '#/fabric/events', on: seg[1] === 'events' }]} />;
  return <div className="pa" data-testid="parity-fabric">{seg[1] === 'events' ? <Events nav={nav} /> : seg[1] === 'c' && seg[2] ? <Connector id={decodeURIComponent(seg[2])} /> : <Integration nav={nav} list={seg[1] === 'c'} />}</div>;
}

function Integration({ nav, list }: { nav: ReactElement; list: boolean }) {
  const core = useCore(); const both = CATS.filter((c) => c.dir === 'Both ways'); const into = CATS.filter((c) => c.dir === 'Into Core');
  const fed = [...new Set(CATS.flatMap((c) => c.feeds))];
  const card = (c: Cat) => <a key={c.id} className="pa-card-link" href={`#/fabric/c/${c.id}`}><h3>{c.label}</h3><p>{c.kind}</p><span className="pa-chips">{c.reads.map((r) => <Tag key={r} tone="muted">{r}</Tag>)}</span><span className="pa-card-link__meta">{c.dir} · simulated</span></a>;
  return (
    <>
      <Crumbs items={[['Mission Control', '#/home'], ['Integration fabric']]} />
      <PageHero eyebrow="Core · integration fabric" title="Integration Fabric" product="mission-control" icon="link" lede={`How the systems an estate already has would meet Core. ${CATS.length} categories are described; none is connected to anything real.`}
        meta={honest(['Simulated integration', 'warn'], ['No external system is connected', 'muted'], ['Prototype · not production monitoring', 'muted'])} />
      {nav}
      <div className="kit-grid kit-grid--tiles">
        <StatTile label="Connector categories" value={CATS.length} icon="grid" hint="every one simulated" />
        <StatTile label="Into Core" value={into.length} icon="download" hint="the system is the source" />
        <StatTile label="Both ways" value={both.length} icon="route" hint="Core writes back what a person approved" />
        <StatTile label="Core types fed" value={fed.length} unit={` of ${Object.keys(TYPES).length}`} icon="layers" hint="record types in the model" />
      </div>
      {list ? <div className="kit-grid">{CATS.map(card)}</div> : (
        <Zone title="One model in the middle" note="Direction of data">
          <div className="pa-split">
            <div className="kit-grid">{into.map(card)}</div>
            <div className="pa-zone">
              <Card title="Empathia Core" icon="layers" tone="accent" sub="Identity · intent · relationships · state · evidence · time" footer={<a className="ui-btn" href="#/list">Open Core</a>}>
                <p className="pa-kv"><span><b>{core.all.length.toLocaleString('en-US')}</b> records</span><span><b>{Object.keys(TYPES).length}</b> types</span></p>
              </Card>
              <h3 className="pa-zone__note">Both ways</h3><div className="kit-grid">{both.map(card)}</div>
            </div>
          </div>
        </Zone>
      )}
    </>
  );
}

function Connector({ id }: { id: string }) {
  const core = useCore(); const c = CATS.find((x) => x.id === id);
  if (!c) return <EmptyState title="No connector category has this address" icon="link" action={<a className="ui-btn" href="#/fabric/c">Every category</a>} />;
  return (
    <>
      <Crumbs items={[['Integration fabric', '#/fabric'], ['Connectors', '#/fabric/c'], [c.label]]} />
      <PageHero compact eyebrow="Connector category" title={c.label} product="mission-control" icon="link" lede={`${c.kind}. ${c.dir === 'Both ways' ? 'Reads into Core, and writes back only what a person approved.' : 'Reads into Core; the system stays the source.'}`} meta={honest(['Simulated · not connected', 'warn'])} />
      <div className="pa-split">
        <Card title="What it would read" icon="download"><FactsTable facts={[['Direction', c.dir], ['Reads', c.reads.join(', ')], ['Writes', c.writes?.join(', ') || 'nothing'], ['Credentials', 'none held: this page has no secret and calls no API'], ['State', 'Simulated: no system is connected']]} /></Card>
        <Card title="Core types it would feed" icon="layers">{c.feeds.map((t) => <p key={t} className="pa-kv"><TypeIcon type={t} /> <a href={`#/list/${t}`}>{TYPES[t].plural}</a> <span><b>{core.byType[t].length}</b> on record now</span></p>)}</Card>
      </div>
    </>
  );
}

function Events({ nav }: { nav: ReactElement }) {
  const core = useCore(); const [inCore, setIn] = useState(false);
  const units = core.byType.Device.filter((d) => d.sub.startsWith('Ceiling microphone') && d.state !== 'End');
  const installed = units.filter((d) => d.state === 'Support' || d.state === 'In service');
  const rooms = [...new Set(installed.map((d) => d.roomId))].map((id) => core.rooms.find((r) => r.outline.id === id)!).filter(Boolean);
  const critical = rooms.filter((r) => r.outline.capacity >= 14 || ['EXE', 'BRD', 'TWN'].includes(r.outline.archetype));
  const covered = installed.filter((d) => d.state === 'Support').length;
  const ripple: Array<[string, string, string, string]> = [
    ['Empathia Core', 'The event enters Core as a record, linked to every device of the class.', 'No record of the notice', `A lifecycle notice linked to ${plural(installed.length, 'installed unit')} in ${plural(rooms.length, 'room')}`],
    ['Scouter', 'Looks for replacement classes that meet each room’s own requirement.', 'Nothing to evaluate', `${plural(rooms.length, 'room')} get a replacement question, each against its own requirement`],
    ['Pro · Asset Intelligence', 'Devices approaching end of support.', `${covered} of ${installed.length} units covered by an agreement`, `${installed.length} units flagged as leaving support; coverage unchanged until then`],
    ['Budgeting', 'Refresh exposure over the next 24 months.', 'No exposure from this class', `${plural(rooms.length, 'room')} enter the refresh plan; no figure is invented — each needs a quote`],
    ['Commissioning and Assurance', 'A replacement is a change to a commissioned room.', 'Baselines current', `${plural(critical.length, 'room')} above standard criticality would be recommissioned after replacement`],
    ['Mission Control', 'One line on the home page for the people it concerns.', 'Quiet', 'One line: “A microphone class used in the estate leaves support”'],
  ];
  return (
    <>
      <Crumbs items={[['Integration fabric', '#/fabric'], ['Event fabric']]} />
      <PageHero eyebrow="Core · event fabric" title="Event Fabric" product="mission-control" icon="spark" lede="One event enters Core. Watch every surface that depends on it react, each from the same record."
        meta={honest(['Simulated integration', 'warn'], ['No external system is connected', 'muted'])} />
      {nav}
      <Card title="Device support end announcement" icon="bell" sub="Through the maker-notice connector (simulated)">
        <p className="pa-answer__lead">A maker notice says the ceiling microphone class used in the campus designs leaves support in eleven months.</p>
        <FactsTable facts={[['Installed units', `${installed.length} in ${plural(rooms.length, 'room')}`], ['Fully supported today', `${covered} units`], ['Rooms above standard criticality', String(critical.length)], ['In Core', inCore ? 'Yes — linked to every unit of the class' : 'Not yet']]} />
        <div className="pa-row-actions">{inCore ? <Button onClick={() => setIn(false)}>Take it back out</Button> : <Button kind="primary" onClick={() => setIn(true)} testId="fabric-fire">Let the event into Core — simulated</Button>}<span className="pa-note" aria-live="polite">{inCore ? 'The event is in Core: every surface below shows its after state.' : 'Nothing has reacted yet.'}</span></div>
      </Card>
      <Zone title="The ripple" note={inCore ? 'After the event' : 'Before the event'}>
        <ol className="pa-steps" aria-label="Surfaces that react">{ripple.map(([t, s, before, after]) => <li key={t} data-state={inCore ? 'done' : undefined}><div><div className="pa-steps__t">{t}</div><p className="pa-steps__s">{s}</p><p className="pa-kv"><b>{inCore ? 'After' : 'Before'}:</b> {inCore ? after : before}</p></div></li>)}</ol>
      </Zone>
      {inCore && critical.length ? <p className="pa-note">Rooms above standard criticality: {critical.map((r) => shortName(r.outline)).join(', ')}.</p> : null}
    </>
  );
}
