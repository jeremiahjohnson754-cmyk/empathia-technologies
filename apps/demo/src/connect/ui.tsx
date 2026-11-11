/**
 * The contact action bar and the "who knows this room" list (founder, 11 Nov 2026: Message in Teams, Send Email, Copy Email, Copy
 * Contact, Call, Schedule Meeting, View Availability, Open Profile, Find Backup Contact; "distinguish opening an app from completing
 * an action"). Each action says what it will do before it does it; after a jump the bar says the app was opened and that nothing
 * was sent. A role that may not see someone's contact details is shown who they are and how to ask, never the address or number.
 */
import { useState } from 'react';
import { Chip, Icon } from '@empathia/ui';
import type { RoleKey } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import { buildingByKey } from '../campus/canon.js';
import type { Workspace } from '../workspace/store.js';
import { APPS, linkFor, type AppId } from './apps.js';
import { availabilityLine, freshnessOf, isWorking, type Knower, type Person } from './directory.js';
import { maySchedule, maySeeContact, opened } from './store.js';

type Apply = <T,>(fn: (w: Workspace) => T) => T;
const today = () => new Date().toISOString().slice(0, 10);
const first = (name: string) => name.split(' ')[0];

export function Freshness({ p }: { p: Person }) {
  const f = freshnessOf(p, today());
  return f.state === 'confirmed' ? <Chip small tone="ok">Details confirmed {f.days === 0 ? 'today' : `${f.days} days ago`}</Chip> : f.state === 'stale' ? <Chip small tone="warn">Details last confirmed {f.days} days ago</Chip> : <Chip small tone="bad">Details never confirmed</Chip>;
}

/** The action bar for one person. `about` is the context carried into a draft (a room's name, an issue's number): never private notes. */
export function ContactBar({ p, role, about, apply, meetHref }: { p: Person; role: RoleKey; about?: string; apply?: Apply; meetHref?: string }) {
  const [said, setSaid] = useState<string | null>(null); const sees = maySeeContact(role, p);
  if (!sees) return <p className="cn-note" data-testid="contact-hidden">The {ROLES[role].label} is not shown {first(p.name)}’s contact details. {role === 'visitor' ? 'Ask your host or the front desk.' : 'Report the problem or send a request, and it reaches the right person.'}</p>;
  const draft = about ? `About ${about}: ` : '';
  const jump = (id: AppId, href: string) => () => { apply?.((w) => opened(w, role, id, p.id, about || '')); setSaid(APPS[id].opened); void href; };
  const copy = async (text: string, what: string) => { try { await navigator.clipboard.writeText(text); setSaid(`${what} copied.`); } catch { setSaid(`Copy is not available here. ${what}: ${text}`); } };
  const links: Array<[AppId, string | null]> = [['teams.chat', linkFor('teams.chat', { users: [p.upn], message: draft })], ['mail', linkFor('mail', { users: [p.upn], subject: about ? `About ${about}` : '' })], ['teams.call', linkFor('teams.call', { users: [p.upn] })], ['tel', linkFor('tel', { number: p.phone })]];
  const card = `${p.name}\n${p.title}\n${p.upn}\n${p.phone}\n${availabilityLine(p, new Date())}`;
  return (
    <div className="cn-bar" data-testid="contact-bar" data-person={p.id}>
      <div className="cn-bar__acts" role="group" aria-label={`Reach ${p.name}`}>
        {links.map(([id, href]) => href ? <a key={id} className={`ui-btn ui-btn--sm${id === (p.prefers === 'teams' ? 'teams.chat' : p.prefers === 'email' ? 'mail' : 'tel') ? ' ui-btn--primary' : ''}`} href={href} target="_blank" rel="noopener noreferrer" data-app={id} title={APPS[id].opens} onClick={jump(id, href)}>{APPS[id].label}</a> : null)}
        <button type="button" className="ui-btn ui-btn--sm" data-act="copy-email" onClick={() => copy(p.upn, 'Address')}>Copy address</button>
        <button type="button" className="ui-btn ui-btn--sm" data-act="copy-card" onClick={() => copy(card, 'Contact details')}>Copy contact</button>
        {maySchedule(role) && meetHref ? <a className="ui-btn ui-btn--sm" href={meetHref} data-act="schedule">Schedule a meeting</a> : null}
      </div>
      <p className="cn-bar__what">Each button opens an application. You write, send or call there; Empathia sends nothing. {first(p.name)} prefers {p.prefers === 'teams' ? 'a Teams message' : p.prefers === 'email' ? 'email' : 'a call'}.</p>
      <p className="cn-bar__addr"><span className="cn-sel" data-testid="contact-address">{p.upn}</span> · <span className="cn-sel">{p.phone}</span></p>
      {said ? <p role="status" className="cn-said" data-testid="contact-said"><Icon name="check" size={16} /><span>{said}</span></p> : null}
    </div>
  );
}

/** One person, as a row: who, what they are to this room or site, whether they are at work, and how fresh their details are. */
export function PersonRow({ k, role, about, apply, roomId }: { k: Knower; role: RoleKey; about?: string; apply?: Apply; roomId?: string }) {
  const p = k.person; const b = buildingByKey(p.site);
  return (
    <li className="cn-person" data-person={p.id} data-working={k.working ? 'yes' : 'no'}>
      <div className="cn-person__who"><span className="cn-ava" data-r={p.roleKey || undefined} aria-hidden="true">{p.name.split(' ').map((x) => x[0]).join('').slice(0, 2)}</span>
        <div><a href={`#/people/${p.id}`} className="cn-person__name">{p.name}</a><span>{p.title}{p.organisation ? ` · ${p.organisation}` : ''}{b && p.kind === 'role' ? ` · based at ${b.short}` : ''}</span></div></div>
      <p className="cn-person__why">{k.why}</p>
      <p className="cn-person__facts"><Chip small tone={k.working ? 'ok' : 'muted'}>{availabilityLine(p, new Date())}</Chip><Freshness p={p} /></p>
      <ContactBar p={p} role={role} about={about} apply={apply} meetHref={`#/meet?with=${p.id}${roomId ? `&room=${roomId}` : ''}`} />
    </li>
  );
}

export { isWorking };
