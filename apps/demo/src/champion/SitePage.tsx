/**
 * #/site — the Site Champion's own place (founder, 11 Nov 2026: "a distinct governed role with its own permission model, Mission
 * Control, profile … relevant workflows, and scoped access"; "the human connection between local workplace technology, employees,
 * support organizations, and institutional knowledge").
 *
 * One site, the champion's own. Four things a champion does, each a real write to the shared workspace through champion/store.ts:
 * confirm that a planned visit can get in; say that a room's name, number and place match the record; say what they saw at the door;
 * and add what only someone on site knows, as a candidate for review. Everything else here is reading: the problems on record at the
 * site, who is coming, who supports the site and how a problem escalates, and the rooms themselves with the way into each.
 * What a champion cannot do is said on the page, once: no engineering setting, no test, no approval, no administration.
 */
import { useMemo, useState } from 'react';
import { PageHero, Card, Chip, Notice, Icon, EmptyState } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { CHAMPION_SITES, canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { buildingByKey, roomById, roomsIn, shortName } from '../campus/canon.js';
import { allRecords } from '../campus/design.js';
import { roomIssues } from '../campus/metrics.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { championView, confirmAccess, confirmOccupancy, contribute, verifyRoom } from './store.js';
import { startView } from './start.js';
import { contributions } from './recognition.js';
import { approvedSiteNotes } from './approved.js';
import { readDocs } from '../docs5/store.js';
import { TRACKED_REPORT, TRACKED_ROOM } from '../docs5/model.js';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const LIVE = new Set(['OPEN', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'RESTORED', 'PENDING_VERIFICATION']);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function SitePage({ role, can }: PageProps) {
  const { w, apply } = useWorkspace(); const c = championView(w);
  const site = CHAMPION_SITES[0]!; const B = buildingByKey(site); const rooms = useMemo(() => roomsIn(site).sort((a, b) => a.floor - b.floor || a.number.localeCompare(b.number)), [site]);
  const recs = useMemo(() => new Map(allRecords().map((r) => [r.outline.id, r])), []);
  const [said, setSaid] = useState<string | null>(null); const [no, setNo] = useState<string | null>(null);
  const [noteRoom, setNoteRoom] = useState(rooms[0]?.id || ''); const [note, setNote] = useState('');
  const [floor, setFloor] = useState<number | 'all'>('all');
  const opens = (href: string) => { const x = resolve(href.split('?')[0]!); return !!x && canOpen(role, x); };
  const act = (fn: Parameters<typeof apply>[0], ok: string) => { const r = apply(fn) as { why?: string[] } | unknown; const why = r && typeof r === 'object' && 'why' in (r as object) ? (r as { why: string[] }).why : null; setNo(why ? why.join(' ') : null); setSaid(why ? null : ok); return !why; };

  const visits = w.workOrders.filter((x) => x.buildingKey === site && !['DONE', 'CANCELLED'].includes(x.state));
  const live = w.incidents.filter((x) => x.buildingKey === site && LIVE.has(x.state));
  const cover = w.staff.filter((s) => s.sites.includes(site));
  const withProblem = rooms.filter((r) => { const rec = recs.get(r.id); return rec ? roomIssues(rec, w).some((i) => i.state !== 'RESOLVED') : false; });
  const floors = [...new Set(rooms.map((r) => r.floor))]; const shown = rooms.filter((r) => floor === 'all' || r.floor === floor);
  const toConfirm = visits.filter((x) => !x.access);
  // Phase 5: a document of a room at this site that the champion is asked to acknowledge (the operator guide)
  const toRead = roomById(TRACKED_ROOM)?.building === site ? (readDocs()?.docs ?? []).filter((d) => d.acknowledgements.outstanding.some((a) => a.role === role)) : [];

  const start = startView(c, rooms.length, opens(`#/docs/${TRACKED_REPORT}`) ? toRead.length : null, { site: '#/site', docs: null, profile: null });

  return (
    <div className="pa sc" data-native="" data-testid="site" data-site={site}>
      <PageHero eyebrow="Site Champion" title={`${B?.name || site}: your site`} product="lite" icon="map"
        lede={`${plural(rooms.length, 'room')} on ${plural(floors.length, 'floor')}. ${withProblem.length ? `${plural(withProblem.length, 'room')} ${withProblem.length === 1 ? 'has' : 'have'} a problem on record.` : 'No room has a problem on record.'} ${toConfirm.length ? `${plural(toConfirm.length, 'visit')} ${toConfirm.length === 1 ? 'waits' : 'wait'} for you to confirm access.` : ''}`}
        meta={[<Chip key="s" small tone="warn">Synthetic data</Chip>, <Chip key="r" small tone="muted">One site · {B?.short || site}</Chip>]} />

      {no ? <div role="alert" className="sc-msg sc-msg--no" data-testid="site-refused"><Icon name="alert" size={18} /><span>{no}</span></div> : null}
      {said && !no ? <p role="status" className="sc-msg sc-msg--ok" data-testid="site-done"><Icon name="check" size={18} /><span>{said}</span></p> : null}

      {opens('#/site/start') ? <p className="sc-start" data-testid="site-start" data-done={start.done}><Icon name="book" size={18} /><span>{start.complete ? 'Getting started: everything on your list is done.' : `Getting started: ${start.done} of ${start.total} done.`} <a href="#/site/start">{start.complete ? 'Read the lessons again' : 'Open your list'}</a></span></p> : null}

      {toRead.length && opens(`#/docs/${TRACKED_REPORT}`) ? <p role="status" className="sc-msg sc-msg--ok" data-testid="site-to-read"><Icon name="book" size={18} /><span>{toRead.map((d) => <span key={d.type}>The {d.title.toLowerCase()} of {roomById(TRACKED_ROOM) ? shortName(roomById(TRACKED_ROOM)!) : 'a room here'} is accepted and waiting for you to read and acknowledge it. <a href={`#/docs/${TRACKED_REPORT}/${d.type}`}>Open it</a></span>)}</span></p> : null}

      <div className="sc-grid">
        <Card title="Visits to your site" icon="calendar" sub="Someone is coming to work on a room. Say they can get in." testId="site-visits">
          {visits.length ? <ul className="sc-list">{visits.map((x) => { const r = roomById(x.roomId); const tech = w.staff.find((s) => s.id === x.techId); return (
            <li key={x.id} data-visit={x.id} data-access={x.access ? 'confirmed' : 'open'}>
              <div><b>{x.title}</b><span>{r ? shortName(r) : x.roomId} · {tech ? tech.name.replace(' (synthetic)', '') : 'nobody assigned yet'}{x.window ? ` · ${when(x.window.from)}` : ' · no time set yet'}</span>
                {x.access ? <span className="sc-ok"><Icon name="check" size={14} /> Access confirmed by {x.access.confirmedBy}</span> : null}</div>
              {!x.access && can('site.access') ? <button type="button" className="ui-btn ui-btn--primary" data-act="access" onClick={() => act((n) => confirmAccess(n, role, x.id), `Access confirmed for ${x.id}. The technician will see it before they set out. Nothing else about the job changed.`)}>Confirm access</button> : null}
            </li>); })}</ul> : <EmptyState title="No visit is planned" icon="calendar">When a job is raised for a room here, it appears with who is coming.</EmptyState>}
        </Card>

        <Card title="Problems on record here" icon="alert" sub="Reported and being followed. You can add what you see." testId="site-issues">
          {live.length ? <ul className="sc-list">{live.map((x) => { const r = roomById(x.roomId); return (
            <li key={x.id} data-issue={x.id}><div><b>{x.title}</b><span>{r ? shortName(r) : x.roomName} · {x.state.toLowerCase().replace(/_/g, ' ')} · reported {when(x.openedAt)}</span></div>
              {opens(`#/here/${x.roomId}`) ? <a className="ui-btn" href={`#/here/${x.roomId}?step=wrong`}>I am in that room</a> : null}</li>); })}</ul>
            : <EmptyState title="Nothing is open" icon="check">No problem is being followed at this site.</EmptyState>}
          <div className="sc-actions">{opens('#/servicehands/new') ? <a className="ui-btn" href="#/servicehands/new" data-testid="site-report">Report a problem</a> : null}{opens('#/here') ? <a className="ui-btn" href="#/here">Walk into a room</a> : null}</div>
        </Card>

        <Card title="Who supports this site" icon="users" sub="The order a problem travels in. You start it; you do not have to chase it." testId="site-support">
          <ol className="sc-path">
            <li><b>You report it</b><span>From the room, in plain words. It becomes a job with a number.</span></li>
            <li><b>The Service Manager triages</b><span>Decides how urgent it is and who goes.</span></li>
            <li><b>A Service Engineer visits</b><span>{cover.length ? `${plural(cover.length, 'engineer')} ${cover.length === 1 ? 'covers' : 'cover'} this site: ${cover.map((s) => s.name.replace(' (synthetic)', '')).join(', ')}.` : 'No engineer is recorded for this site.'}</span></li>
            <li><b>The Systems Engineer is brought in</b><span>Only when the fix needs a design or configuration change.</span></li>
          </ol>
          <p className="sc-note">Names are synthetic. {opens('#/people') ? <a href={`#/people?site=${site}`} data-testid="site-people">The people of this site, whether they are at work now, and how to reach them</a> : null}</p>
        </Card>

        <Card title="What you know about a room" icon="info" sub="Something only someone on site knows. It is kept as a note for review, never as fact." testId="site-notes">
          <form className="sc-form" noValidate onSubmit={(e) => { e.preventDefault(); if (act((n) => contribute(n, role, noteRoom, note), 'Your note is recorded as a candidate. A reviewer decides whether it becomes part of the room’s guidance.')) setNote(''); }}>
            <div className="ui-field"><label htmlFor="sc-room">Room</label><select id="sc-room" value={noteRoom} onChange={(e) => setNoteRoom(e.target.value)} data-testid="site-note-room">{rooms.map((r) => <option key={r.id} value={r.id}>{shortName(r)} · {r.name}</option>)}</select></div>
            <div className="ui-field"><label htmlFor="sc-note">What you know</label><textarea id="sc-note" rows={3} maxLength={400} value={note} onChange={(e) => setNote(e.target.value)} data-testid="site-note-text" /></div>
            <div className="sc-actions"><button type="submit" className="ui-btn" data-testid="site-note-go">Add the note</button></div>
          </form>
          {c.notes.length ? <ul className="sc-notes" data-testid="site-note-list">{c.notes.slice(0, 6).map((n) => { const r = roomById(n.roomId); return <li key={n.id}><p>{n.text}</p><span>{r ? shortName(r) : n.roomId} · {when(n.at)} · <Chip small tone="muted">Awaiting review</Chip></span></li>; })}</ul> : null}
        </Card>
      </div>

      <Card title="What you have done for this site" icon="check" sub="Counts from the record. Nobody is scored, rated or compared." testId="site-done-for">
        <dl className="sc-counts">{contributions(w, approvedSiteNotes(w)).map((x) => <div key={x.id} data-count={x.id} data-n={x.n}><dt>{x.label}</dt><dd><b>{x.n}</b><span className="ui-meta"> · {x.from}</span></dd></div>)}</dl>
      </Card>

      <section className="sc-rooms" aria-labelledby="sc-rooms-h">
        <header><h2 id="sc-rooms-h">The rooms of your site</h2>
          <div className="sc-floors" role="group" aria-label="Floor">{(['all', ...floors] as Array<number | 'all'>).map((f) => <button key={String(f)} type="button" className="ui-btn ui-btn--sm" aria-pressed={floor === f} onClick={() => setFloor(f)}>{f === 'all' ? 'All floors' : `Floor ${f}`}</button>)}</div></header>
        <ul className="sc-roomlist" data-testid="site-rooms">{shown.map((r) => { const rec = recs.get(r.id); const k = rec ? roomIssues(rec, w).filter((i) => i.state !== 'RESOLVED').length : 0; const v = c.verified[r.id]; const o = c.occupancy[r.id]; return (
          <li key={r.id} data-room={r.id} data-verified={v ? 'yes' : 'no'}>
            <div className="sc-room__id"><b>{shortName(r)}</b><span>{r.name} · floor {r.floor} · seats {r.capacity}</span>
              <span className="sc-room__facts">{k ? <Chip small tone="warn">{plural(k, 'problem')} on record</Chip> : <Chip small tone="ok">No problem on record</Chip>}{v ? <Chip small tone="muted">Checked on site {when(v.at)}</Chip> : null}{o ? <Chip small tone="muted">Seen {o.state === 'free' ? 'free' : 'in use'} {when(o.at)}</Chip> : null}</span></div>
            <div className="sc-room__acts">
              {opens(`#/here/${r.id}`) ? <a className="ui-btn ui-btn--sm" href={`#/here/${r.id}`}>Walk in</a> : null}
              {can('site.verify') ? <button type="button" className="ui-btn ui-btn--sm" data-act="verify" onClick={() => act((n) => verifyRoom(n, role, r.id, ''), `${shortName(r)}: you checked its name, number and place against the record.`)}>{v ? 'Check again' : 'Details match'}</button> : null}
              {can('site.occupancy') ? <><button type="button" className="ui-btn ui-btn--sm" data-act="in-use" onClick={() => act((n) => confirmOccupancy(n, role, r.id, 'in-use'), `${shortName(r)} recorded as in use, as you saw it now.`)}>In use</button><button type="button" className="ui-btn ui-btn--sm" data-act="free" onClick={() => act((n) => confirmOccupancy(n, role, r.id, 'free'), `${shortName(r)} recorded as free, as you saw it now.`)}>Free</button></> : null}
            </div>
          </li>); })}</ul>
      </section>

      <Notice tone="info">
        <b>What a Site Champion does, and does not.</b> You report, confirm access for a visit, check that a room matches its record, say what you saw at the door, add what you know, and attest to how a room works for the people who use it. You do not change equipment settings, record or verify tests, approve commissioning, assign work or administer anything: those stay with the roles that answer for them. Everything you do here is for {B?.name || site} only.
      </Notice>
    </div>
  );
}
