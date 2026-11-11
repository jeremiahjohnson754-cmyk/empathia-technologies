/**
 * #/people — the people of the estate; #/people/<id> — one person; #/people?room=<room> — "Who knows this room?".
 * (Founder, 11 Nov 2026: "knowing who actually understands the rooms at a particular site can be just as important as knowing which
 * technician is assigned a ticket.") Everyone here is synthetic and the page says so. Who a person is, what they answer for and
 * whether they are at work is shown to every signed-in role; their address and number only to roles permitted to see them.
 */
import { useMemo, useState } from 'react';
import { PageHero, Card, Chip, EmptyState, Notice } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { buildingByKey, fullName, roomById, shortName } from '../campus/canon.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { ALL_BUILDINGS, availabilityLine, directory, hoursOf, isWorking, personById, roomsOf, whoKnows, type Person } from './directory.js';
import { ContactBar, Freshness, PersonRow } from './ui.js';

const CAN = 'Reports problems, confirms access for a visit, checks a room against its record, says what they saw, adds what they know, and attests to how a room works for the people who use it.';
const CANNOT = 'Does not change equipment settings, record or verify tests, approve commissioning, assign work or administer anything.';

function Profile({ p, role, apply, roomId }: { p: Person; role: PageProps['role']; apply: ReturnType<typeof useWorkspace>['apply']; roomId?: string }) {
  const { w } = useWorkspace(); const rooms = roomsOf(p); const b = buildingByKey(p.site); const now = new Date(); const esc = p.escalatesTo.map((id) => personById(id, w)).filter(Boolean) as Person[];
  const champ = p.kind === 'champion' || p.kind === 'backup'; const about = roomId && roomById(roomId) ? shortName(roomById(roomId)!) : undefined;
  return (
    <div className="pa cn" data-native="" data-testid="person" data-person={p.id}>
      <PageHero compact eyebrow={champ ? 'Site Champion' : p.kind === 'technician' ? 'Service' : 'Support'} title={p.name} product="search-party" icon="user" lede={`${p.title}${p.organisation ? `, ${p.organisation}` : ''}. ${availabilityLine(p, now)}.`}
        meta={[<Chip key="s" small tone="warn">Synthetic person</Chip>, <Freshness key="f" p={p} />]} />
      <div className="cn-grid">
        <Card title={`Reach ${p.name.split(' ')[0]}`} icon="link" sub={about ? `About ${about}` : 'Opens an application; nothing is sent from here'} testId="person-reach">
          <ContactBar p={p} role={role} about={about} apply={apply} meetHref={`#/meet?with=${p.id}${roomId ? `&room=${roomId}` : ''}`} />
        </Card>
        <Card title="When" icon="clock" sub="In their own time zone" testId="person-when">
          <dl className="cn-kv"><div><dt>Now</dt><dd>{availabilityLine(p, now)}</dd></div><div><dt>Working day</dt><dd>{hoursOf(p).start} to {hoursOf(p).end}, Monday to Friday{p.shift ? ` · ${p.shift.name} shift` : ''}</dd></div><div><dt>Time zone</dt><dd>{p.tz.replace(/_/g, ' ')} <span className="cn-note">(a modelling assumption for this fictional site)</span></dd></div><div><dt>Languages</dt><dd>{p.languages.join(', ')}</dd></div></dl>
        </Card>
        <Card title={champ ? `Knows ${b?.name || p.site}` : p.kind === 'technician' ? 'Covers' : 'Answers for'} icon="building" sub={champ ? `${rooms.length} rooms and the people who use them` : p.kind === 'technician' ? `${p.sites.length} ${p.sites.length === 1 ? 'site' : 'sites'}, ${rooms.length} rooms` : 'Every site of the estate'} testId="person-knows">
          {p.kind === 'role' ? <p className="cn-note">The {p.title} answers for the whole estate; a problem reaches them through the escalation path, not directly.</p>
            : <ul className="cn-rooms">{rooms.slice(0, 12).map((id) => { const r = roomById(id)!; return <li key={id}><a href={`#/here/${id}`}>{fullName(r)}</a></li>; })}{rooms.length > 12 ? <li className="cn-note">and {rooms.length - 12} more{champ ? <> · <a href="#/lite">find a room</a></> : null}</li> : null}</ul>}
        </Card>
        <Card title="Hands a problem to" icon="route" sub="The authorised escalation path, in order" testId="person-escalates">
          {esc.length ? <ol className="cn-esc">{esc.map((x) => <li key={x.id}><a href={`#/people/${x.id}`}>{x.name}</a><span>{x.title} · {isWorking(x, now) ? 'at work now' : 'not at work now'}</span></li>)}</ol> : <p className="cn-note">Nobody further: this is where escalation ends.</p>}
        </Card>
      </div>
      {champ ? <Notice tone="info"><b>What a Site Champion does, and does not.</b> {CAN} {CANNOT}</Notice> : null}
      <p className="cn-note"><a href="#/people">Everyone</a>{roomId ? <> · <a href={`#/people?room=${roomId}`}>Who knows {about}</a></> : null}</p>
    </div>
  );
}

export default function PeoplePage({ role, params, query }: PageProps) {
  const { w, apply } = useWorkspace(); const all = useMemo(() => directory(w), [w]); const [q, setQ] = useState('');
  const roomId = query.get('room') || undefined; const room = roomId ? roomById(roomId) : undefined; const site = query.get('site') || '';
  const one = params['id'] ? all.find((p) => p.id === params['id']) : undefined;
  if (params['id'] && !one) return <div className="pa cn" data-native="" data-testid="person-missing"><h1 className="ui-visually-hidden">Person not found</h1><EmptyState title="Nobody with that identifier" icon="search" action={<a className="ui-btn" href="#/people">Everyone</a>}>The directory holds the demonstration’s synthetic people only.</EmptyState></div>;
  if (one) return <Profile p={one} role={role} apply={apply} roomId={room ? roomId : undefined} />;
  const text = q.trim().toLowerCase(); const match = (p: Person) => (!text || `${p.name} ${p.title} ${buildingByKey(p.site)?.name || ''} ${p.organisation || ''}`.toLowerCase().includes(text)) && (!site || p.sites.includes(site));
  const champs = all.filter((p) => (p.kind === 'champion' || p.kind === 'backup') && match(p)); const techs = all.filter((p) => p.kind === 'technician' && match(p)); const roles = all.filter((p) => p.kind === 'role' && match(p));
  const knowers = room ? whoKnows(room.id, new Date(), w) : [];
  return (
    <div className="pa cn" data-native="" data-testid="people">
      <PageHero compact eyebrow="Search Party · people" title={room ? `Who knows ${shortName(room)}` : site ? `The people of ${buildingByKey(site)?.name || site}` : 'People'} product="search-party" icon="users"
        lede={room ? `${room.name}. In the order to try them, with the reason for each. The person who knows a site’s rooms comes before the person assigned its tickets.` : 'Site champions, the engineers who cover each site, and where a problem escalates. Whether each is at work now, in their own time zone.'}
        meta={[<Chip key="s" small tone="warn">Synthetic people</Chip>, <Chip key="n" small tone="muted">{all.length} in the directory</Chip>]} />
      {room ? <ol className="cn-people" data-testid="who-knows" data-room={room.id}>{knowers.map((k) => <PersonRow key={k.person.id} k={k} role={role} about={shortName(room)} apply={apply} roomId={room.id} />)}</ol> : <>
        <div className="cn-find"><div className="ui-field"><label htmlFor="cn-q">Find a person, a role or a site</label><input id="cn-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" data-testid="people-q" /></div>
          <div className="ui-field"><label htmlFor="cn-site">Site</label><select id="cn-site" value={site} onChange={(e) => { location.hash = e.target.value ? `#/people?site=${e.target.value}` : '#/people'; }} data-testid="people-site"><option value="">Every site</option>{ALL_BUILDINGS.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}</select></div></div>
        {[['Site champions', champs, 'The person on site who knows the rooms, and their backup'], ['Service engineers', techs, 'Assigned the jobs for the sites they cover'], ['Where it escalates', roles, 'One holder of each support role']].map(([title, list, sub]) => (list as Person[]).length ? (
          <section key={title as string} className="cn-sec" aria-label={title as string}><h2>{title as string}</h2><p className="cn-note">{sub as string}</p>
            <ul className="cn-list" data-testid="people-list">{(list as Person[]).map((p) => <li key={p.id} data-person={p.id}><a href={`#/people/${p.id}`}><b>{p.name}</b><span>{p.title}{p.organisation ? ` · ${p.organisation}` : ''}</span></a><Chip small tone={isWorking(p, new Date()) ? 'ok' : 'muted'}>{isWorking(p, new Date()) ? 'At work now' : 'Not at work now'}</Chip></li>)}</ul></section>) : null)}
        {!champs.length && !techs.length && !roles.length ? <EmptyState title="Nobody matches" icon="search">Try a name, “champion”, or a building.</EmptyState> : null}
      </>}
      <p className="cn-note">Everyone here is invented. Addresses are on a reserved domain and numbers are in the range reserved for fiction: the applications will open, and will not find these people. With a connected directory the same buttons carry real addresses.</p>
    </div>
  );
}
