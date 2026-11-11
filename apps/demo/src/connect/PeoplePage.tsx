/**
 * #/people — the people directory, and #/people/<id> — one person: who they are, what they look after, how current the entry is,
 * and the ways to contact them. A site champion's profile is a first-class record: the site and rooms they know (from records), who
 * they escalate to and in what order, what the records say about their building, what they may and may not do, and how they keep
 * the entry true. What a role is shown follows access.ts: a role that may only be told who to contact sees the site champions and
 * their backups; a role that may see contact details sees everyone it may contact.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHero, Tag, Notice, Field, Button } from '@empathia/ui';
import type { PageProps, RoleKey } from '../registry.types.js';
import { ROLES, canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { ESTATE_GROUPS, buildingByKey, shortName } from '../campus/canon.js';
import {
  ALL_BUILDINGS, CHAMPION_PERSONA, ONBOARDING, availabilityAt, baseFloor, championMay, championMayNot, escalationOf, findPeople, floorsOf, freshnessOf, groupOf,
  localKnowledge, people, personById, responsibleFor, roomsKnown, FRESH_DAYS, type Person,
} from './directory.js';
import { mayBrowse, mayCurate, maySeeDetails, visibleTo } from './access.js';
import { ContactBar, ReturnBanner, WhoKnows, useConnect, SYNTHETIC_NOTE } from './ContactBar.js';
import { addNote, busyOf, confirmEntry } from './store.js';
import { daysWords } from './calendar.js';
import { DAY, utcOffset, zoneCity } from './time.js';

const FRESH_TONE = { confirmed: 'ok', stale: 'warn', unknown: 'muted' } as const;
const FRESH_WORD = { confirmed: 'Confirmed', stale: 'Stale', unknown: 'Never confirmed' } as const;
const KIND_WORD = { champion: 'Site champion', backup: 'Backup site champion', role: '' } as const;
const CHANNEL_WORD = { teams: 'Teams message', email: 'Email', phone: 'Telephone' } as const;
const plural = (n: number, one: string, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;
const opensFor = (role: RoleKey) => (href: string) => { const r = resolve(href.split('?')[0]!); return !!r && canOpen(role, r); };

export default function PeoplePage({ role, params, query, hash }: PageProps) {
  const id = params['id'];
  if (id) { const p = personById(id); return p && maySeeDetails(role, p) ? <Profile key={p.id} role={role} p={p} hash={hash} /> : <Unknown />; }
  return <Directory role={role} query={query} hash={hash} />;
}
function Unknown() {
  return <section className="cx" data-native="" data-testid="people-unknown"><PageHero eyebrow="People" icon="users" product="search-party" title="Nobody in the directory has this address" lede="Nothing was guessed from it. Open the directory and choose a person." actions={<a className="ui-btn ui-btn--primary" href="#/people">Open the directory</a>} /></section>;
}

function Directory({ role, query, hash }: Pick<PageProps, 'role' | 'query' | 'hash'>) {
  const { st, w, now } = useConnect(); const all = useMemo(() => visibleTo(role, people()), [role]); const browse = mayBrowse(role);
  const [q, setQ] = useState(query.get('q') || ''); const [group, setGroup] = useState(''); const [kind, setKind] = useState<'' | 'champions' | 'roles'>('');
  const about = (query.get('about') || '').split(':'); const aboutKind = (['room', 'building', 'device', 'issue'] as const).find((k) => k === about[0]); const aboutId = about.slice(1).join(':');
  const found = useMemo(() => { const base = q.trim().length >= 2 ? findPeople(q, 200).filter((p) => all.includes(p)) : all; return base.filter((p) => (!group || p.group === group) && (!kind || (kind === 'champions' ? p.kind !== 'role' : p.kind === 'role'))); }, [q, group, kind, all]);
  const fresh = useMemo(() => { const n = { confirmed: 0, stale: 0, unknown: 0 }; for (const p of all) n[freshnessOf(p, st.confirmed).state] += 1; return n; }, [all, st]);
  const groups = ESTATE_GROUPS.filter((g) => all.some((p) => p.group === g.name));
  return (
    <section className="cx" data-native="" data-testid="people-page" data-shown={found.length} data-all={all.length}>
      <PageHero eyebrow="Search Party · People" icon="users" product="search-party" title="People" lede={browse ? 'Who looks after each site and each kind of work, how to reach them, and how current each entry is.' : 'The site champion and the backup for every building: the people who know the rooms.'}
        meta={[<Tag key="s" tone="warn">Synthetic people</Tag>, <span key="n" data-testid="people-count">{plural(all.length, 'person', 'people')} shown to the {ROLES[role].label}</span>, <span key="f">{fresh.confirmed} confirmed · {fresh.stale} stale · {fresh.unknown} never confirmed</span>]} />
      <ReturnBanner hash={hash} />
      {aboutKind && aboutId && <WhoKnows role={role} kind={aboutKind} id={aboutId} />}
      <div className="cx-filters">
        <Field label="Find a person" hint="A name, a role, a building, or a language.">{(fid, by) => <input id={fid} aria-describedby={by} type="search" autoComplete="off" value={q} maxLength={60} onChange={(e) => setQ(e.target.value)} data-testid="people-find" />}</Field>
        <Field label="Part of the estate">{(fid) => <select id={fid} value={group} onChange={(e) => setGroup(e.target.value)} data-testid="people-group"><option value="">Every site</option>{groups.map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}</select>}</Field>
        {browse && <Field label="Kind">{(fid) => <select id={fid} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} data-testid="people-kind"><option value="">Everyone</option><option value="champions">Site champions and backups</option><option value="roles">Operational roles</option></select>}</Field>}
      </div>
      <p className="ui-muted" role="status" aria-live="polite" data-testid="people-status">{found.length ? `${plural(found.length, 'person', 'people')}${q.trim() ? ` matching “${q.trim()}”` : ''}` : `Nobody ${q.trim() ? `matches “${q.trim()}”` : 'is listed'}. Try a first name, a building such as “Atlas”, or “champion”.`}</p>
      <ul className="cx-list" data-testid="people-list">{found.slice(0, 80).map((p) => { const a = availabilityAt(p, now, busyOf(st, w, role, p, now - DAY, now + DAY)); const f = freshnessOf(p, st.confirmed); return (
        <li key={p.id}><a className="cx-card" href={`#/people/${p.id}`} data-person={p.id} data-kind={p.kind}>
          <span className="cx-card__h"><b>{p.name}</b><span>{p.title}{p.org ? ` · ${p.org}` : ''}</span></span>
          <span className="cx-card__m">{p.buildings.map((k) => buildingByKey(k)?.short || k).join(', ')} · {zoneCity(p.tz)} time{p.shift ? ` · ${p.shift.name.toLowerCase()}` : ''}</span>
          <span className="cx-card__t"><Tag tone={a.available ? 'ok' : 'muted'}>{a.available ? 'Working now' : a.state === 'busy' ? 'Busy now' : a.state === 'off-shift' ? 'Off shift' : 'Out of hours'}</Tag> <Tag tone={FRESH_TONE[f.state]}>{FRESH_WORD[f.state]}</Tag></span>
        </a></li>); })}</ul>
      {found.length > 80 && <p className="ui-meta">{found.length - 80} more: narrow the list with a name or a site.</p>}
      <p className="ui-meta cx-foot">{SYNTHETIC_NOTE} Every building has a site champion and a backup; each operational role has a named holder for each part of the estate. Time zones are this directory’s own assumption: the estate records carry no geography. An entry is “confirmed” for {FRESH_DAYS} days after it was last confirmed, counted to the records’ date.</p>
    </section>
  );
}

function Profile({ role, p, hash }: { role: RoleKey; p: Person; hash: string }) {
  const { st, w, now, refresh } = useConnect(); const opens = opensFor(role); const head = useRef<HTMLHeadingElement>(null);
  const [note, setNote] = useState(''); const [refused, setRefused] = useState<string[] | null>(null); const [said, setSaid] = useState(''); const [allRooms, setAllRooms] = useState(false);
  const resp = useMemo(() => responsibleFor(p), [p]); const f = freshnessOf(p, st.confirmed); const B = buildingByKey(p.home); const g = groupOf(p.home);
  const champion = p.kind !== 'role'; const knows = useMemo(() => (champion ? roomsKnown(p, w) : []), [p, w, champion]); const esc = useMemo(() => (champion ? escalationOf(p) : []), [p, champion]);
  const notes = st.notes[p.id] || []; const curate = mayCurate(role, p); const h = p.shift || p.hours;
  useEffect(() => { head.current?.focus({ preventScroll: true }); }, [p.id]);
  const confirmNow = () => { const out = confirmEntry(role, p.id, Date.now()); if ('why' in out) { setRefused(out.why); setSaid(''); } else { setRefused(null); setSaid(`Entry confirmed as current on ${out.on}.`); } refresh(); };
  const add = () => { const out = addNote(role, p.id, note, Date.now()); if ('why' in out) { setRefused(out.why); setSaid(''); } else { setRefused(null); setNote(''); setSaid('Note added to this profile. It stays in this browser and is never placed in a message.'); } refresh(); };
  const shown = allRooms ? knows : knows.slice(0, 8);
  return (
    <section className="cx" data-native="" data-testid="person-page" data-person={p.id} data-kind={p.kind} data-freshness={f.state}>
      <nav aria-label="Breadcrumb" className="crumbs"><ol><li><a href="#/people">People</a></li><li><span aria-current="page">{p.name}</span></li></ol></nav>
      <PageHero compact eyebrow={champion ? `${KIND_WORD[p.kind]} · ${B?.name || p.home}` : `${p.title} · ${g?.name || ''}`} icon="user" product="search-party" title={<span tabIndex={-1} ref={head} className="cx-h1">{p.name}</span>}
        lede={resp.summary + '.'} meta={[<Tag key="s" tone="warn">Synthetic person</Tag>, <Tag key="f" tone={FRESH_TONE[f.state]}>{f.words}</Tag>, <span key="z">{zoneCity(p.tz)} time ({utcOffset(p.tz, now)})</span>]} />
      <ReturnBanner hash={hash} />
      <div className="cx-cols">
        <div className="cx-main">
          <section aria-labelledby="cx-contact-h"><h2 className="build__h" id="cx-contact-h">Contact {p.name.split(' ')[0]}</h2><ContactBar role={role} person={p} onChange={refresh} /></section>

          <section aria-labelledby="cx-resp-h" data-testid="person-responsible" data-rooms={resp.rooms} data-devices={resp.devices}><h2 className="build__h" id="cx-resp-h">What {p.name.split(' ')[0]} looks after</h2>
            <p>{resp.summary}.</p>
            <ul className="cx-chips">{resp.buildings.map((b) => <li key={b.key}>{opens(`#/lite/b/${b.key}`) ? <a href={`#/lite/b/${b.key}`}>{b.name}</a> : b.name} <span className="ui-meta">{plural(floorsOf(b.key).reduce((n, x) => n + x.rooms.length, 0), 'room')}</span></li>)}</ul>
            <p className="ui-meta">Counted from the estate records: the rooms of the buildings this person is listed for, and the equipment positions on those rooms’ records.</p>
          </section>

          {champion && <>
            <section aria-labelledby="cx-may-h" data-testid="champion-may"><h2 className="build__h" id="cx-may-h">What a site champion may and may not do</h2>
              <div className="cx-two">
                <div><h3 className="cx-h3">May</h3><ul className="cx-yes">{championMay().map((x) => <li key={x}>{x}</li>)}<li>Report a problem in a room, and say what was seen</li><li>Add what they know about the site to this profile</li></ul></div>
                <div><h3 className="cx-h3">May not, whatever the title</h3><ul className="cx-no" data-testid="champion-maynot">{championMayNot().map((x) => <li key={x}>{x}</li>)}</ul></div>
              </div>
              <p className="ui-meta">The three permissions are the {CHAMPION_PERSONA.label} persona’s own in the product’s catalogue ({CHAMPION_PERSONA.authority.join(', ')}; scope: {CHAMPION_PERSONA.scope || 'site'}). Nothing engineering, administrative or to do with commissioning sign-off comes with being a champion.</p>
            </section>

            <section aria-labelledby="cx-knows-h" data-testid="champion-knows" data-rooms={knows.length}><h2 className="build__h" id="cx-knows-h">Rooms {p.name.split(' ')[0]} knows</h2>
              <p>{B?.name}: {floorsOf(p.home).map((x) => `floor ${x.floor} (${plural(x.rooms.length, 'room')})`).join(', ')}. Based on floor {baseFloor(p) ?? '—'}.</p>
              <ul className="cx-rooms">{shown.map((k) => <li key={k.room.id} data-level={k.level}>{opens(`#/lite/room/${k.room.id}`) ? <a href={`#/lite/room/${k.room.id}`}>{shortName(k.room)} — {k.room.name}</a> : `${shortName(k.room)} — ${k.room.name}`} <Tag tone={k.level === 'worked' ? 'ok' : k.level === 'floor' ? 'info' : 'muted'}>{k.level === 'worked' ? 'Has worked in it' : k.level === 'floor' ? 'On their floor' : 'In their building'}</Tag><span className="ui-meta">{k.why}</span></li>)}</ul>
              {knows.length > 8 && !allRooms && <p><button type="button" className="ui-btn ui-btn--sm" onClick={() => setAllRooms(true)} data-testid="champion-allrooms">Show all {knows.length} rooms</button></p>}
              <p className="ui-meta">Familiarity is read from records, never claimed: jobs in a room whose access the site champion confirmed, reports raised by the site champion, then the floor they are based on.</p>
            </section>

            <section aria-labelledby="cx-esc-h" data-testid="champion-escalation"><h2 className="build__h" id="cx-esc-h">Who {p.name.split(' ')[0]} escalates to, in order</h2>
              <ol className="cx-esc">{esc.map((s) => <li key={s.role} data-role={s.role}><b>{s.title}</b>{s.person ? <> — {maySeeDetails(role, s.person) && opens(`#/people/${s.person.id}`) ? <a href={`#/people/${s.person.id}`}>{s.person.name}</a> : s.person.name}</> : <> — nobody is named for this building</>}<span className="ui-meta">{s.when}</span></li>)}</ol>
              <p className="ui-meta">The path is by role; the person named is the holder for {B?.name}. Facilities and security contacts are not modelled in this demonstration.</p>
            </section>

            <section aria-labelledby="cx-local-h" data-testid="champion-local"><h2 className="build__h" id="cx-local-h">Local knowledge</h2>
              <ul className="cx-facts">{localKnowledge(p).map((x) => <li key={x}>{x}</li>)}</ul>
              {notes.length > 0 && <><h3 className="cx-h3">Added by people who know the site</h3><ul className="cx-notes" data-testid="champion-notes">{notes.map((n) => <li key={n.at}>{n.text} <span className="ui-meta">{n.at.slice(0, 10)} · {ROLES[n.role as RoleKey]?.label || n.role}</span></li>)}</ul></>}
              {curate && <div className="cx-form" data-testid="champion-note-form"><Field label="Add something the records do not know" hint="For example which room’s blinds stick, or where the spare remote is kept. Kept in this browser; never placed in a message.">{(fid, by) => <textarea id={fid} aria-describedby={by} rows={2} maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} data-testid="champion-note" />}</Field><Button onClick={add} testId="champion-note-add">Add the note</Button></div>}
              <p className="ui-meta">The first list is computed from the estate records. Notes are a contribution: a site champion adds them for their own site, and the Data Steward can.</p>
            </section>

            <section aria-labelledby="cx-onb-h" data-testid="champion-onboarding"><h2 className="build__h" id="cx-onb-h">A champion’s first weeks</h2>
              <ol className="cx-esc">{ONBOARDING.map((o) => <li key={o.label}><b>{opens(o.href(p)) ? <a href={o.href(p)}>{o.label}</a> : o.label}</b><span className="ui-meta">{o.why}</span></li>)}</ol>
              <p className="ui-meta">Not tracked: this demonstration does not record whether a champion has done these.</p>
            </section>
          </>}
        </div>

        <aside className="cx-side" aria-label={`About ${p.name}`}>
          <dl className="cx-facts-dl" data-testid="person-facts">
            <div><dt>Role</dt><dd>{p.title}{p.org ? ` (${p.org}, a fictional partner)` : ''}</dd></div>
            <div><dt>Based in</dt><dd>{B?.name}{g ? `, ${g.name}` : ''}</dd></div>
            <div><dt>Time zone</dt><dd>{p.tz} · {utcOffset(p.tz, now)} today</dd></div>
            <div><dt>{p.shift ? 'Shift' : 'Working hours'}</dt><dd>{p.shift ? `${p.shift.name}: ` : ''}{h.start}–{h.end}, {daysWords(h.days)}</dd></div>
            <div><dt>Languages</dt><dd>{p.languages.join(', ')}</dd></div>
            <div><dt>Prefers</dt><dd>{CHANNEL_WORD[p.channel]}</dd></div>
            <div><dt>Also known as</dt><dd>{p.aliases.join(', ')}</dd></div>
            <div><dt>Entry</dt><dd data-testid="person-freshness"><Tag tone={FRESH_TONE[f.state]}>{FRESH_WORD[f.state]}</Tag> {f.on ? `Last confirmed ${f.on}` : 'Nobody has confirmed this entry'}{f.days != null ? ` (${plural(f.days, 'day')} before the records’ date)` : ''}</dd></div>
          </dl>
          {curate && <p><Button onClick={confirmNow} testId="person-confirm">Confirm this entry is current</Button></p>}
          <p className="cx-said" role="status" aria-live="polite" data-testid="person-said">{said}</p>
          {refused && <div data-testid="person-refused"><Notice tone="bad"><ul>{refused.map((x) => <li key={x}>{x}</li>)}</ul></Notice></div>}
          <p className="ui-meta">Listed for: {p.buildings.map((k) => ALL_BUILDINGS.find((b) => b.key === k)?.name || k).join(', ')}.</p>
        </aside>
      </div>
    </section>
  );
}
