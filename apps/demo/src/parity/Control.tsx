/**
 * #/control (Empathia Control: one room-control language), #/control/<room> (a room's panel, simulated), #/control/space and
 * #/control/commons (the shared spaces: lobbies, coffee points and the commons, with their signage zones), and #/scheduler,
 * #/scheduler/<room> (the panel at the door of each room). SIMULATED CONTROL: no command leaves the page; the sessions are generated from
 * the room id and the demonstration clock, never a real calendar.
 */
import { useEffect, useState } from 'react';
import { PageHero, Card, StatTile, Tag, EmptyState, Segmented, StatusDot, Icon, type IconName } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { allows } from '../access/policy.js';
import { ROOMS, BUILDINGS, roomById, shortName, fullName, roomHref, type RoomOutline } from '../campus/canon.js';
import { DEMO_NOW, roomRecord, type RoomRecord } from '../campus/design.js';
import { canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { RoomPanel, useRoomSentence, type ModeKey } from '../control/Panel.js';
import { sessionsOf, busyAt, nextOf, hhmm, SIGNAGE, plural } from './core.js';
import { useCore, honest, Crumbs, Zone, FactsTable } from './ui.js';

const MODES: Array<{ key: string; label: string; sub: string; who: string; icon: IconName }> = [
  { key: 'room', label: 'Room', sub: 'The room before and between sessions', who: 'Every room', icon: 'room' },
  { key: 'meet', label: 'Meet', sub: 'A hybrid meeting: join, share, be seen and heard', who: 'Every room', icon: 'users' },
  { key: 'present', label: 'Present', sub: 'Sources, presenter and audience, displays and presets', who: 'From collaboration rooms up', icon: 'play' },
  { key: 'live', label: 'Live', sub: 'An event with an audience: scenes, microphone groups and the stream', who: 'Town halls, studios, events', icon: 'spark' },
  { key: 'engineer', label: 'Engineer', sub: 'What the room is made of and how it is doing', who: 'Engineering roles', icon: 'wrench' },
];
const LIVE = ['TWN', 'TWR', 'CTL', 'AUD', 'STU'];
const modesFor = (o: RoomOutline, eng: boolean) => MODES.filter((m) => m.key === 'room' || m.key === 'meet' || (m.key === 'present' && o.capacity >= 8) || (m.key === 'live' && LIVE.includes(o.archetype)) || (m.key === 'engineer' && eng));


export default function ControlPage(p: PageProps) {
  const seg = p.hash.replace(/^#\/?/, '').split(/[?~]/)[0]!.split('/').filter(Boolean);
  const body = seg[0] === 'scheduler' || seg[0] === 'lite' || seg[0] === 'qr' ? (seg[1] && seg[0] === 'scheduler' ? <DoorPanel {...p} id={decodeURIComponent(seg[1])} /> : <Scheduler />)
    : seg[1] === 'space' || seg[1] === 'commons' ? <Spaces /> : seg[1] ? <RoomControl {...p} id={decodeURIComponent(seg[1])} /> : <Language {...p} />;
  return <div className="pa" data-native="" data-testid="parity-control">{body}</div>;
}

function Language({ role }: PageProps) {
  const eng = allows({ field: 'control.engineer' }, role);
  return (
    <>
      <PageHero eyebrow="Lite · Empathia Control" title="Empathia Control" product="lite" icon="settings" lede="One room-control language for every room on campus. One sentence, one room, one dock, five modes."
        meta={honest(['Simulated control', 'warn'], ['Prototype · not production monitoring', 'muted'])} actions={<><a className="ui-btn ui-btn--primary" href="#/control/R-ATL-4-218">Open the boardroom panel</a><a className="ui-btn" href="#/control/space">Shared spaces</a></>} />
      <div className="pa-split">
        <Card title="The language" icon="book" sub="Original to Empathia">
          <FactsTable facts={[['One sentence', 'The top line says what the room is doing now, in words. Nothing has to be decoded.'], ['One room', 'The plan is this room, drawn from the same layout Lite uses. What a control changes lights up where it is.'], ['One dock', 'Microphone, volume, camera, share and session keep the same five places in every room. A place the room has no use for stays, marked as not in this room.'], ['Five modes', 'Room, Meet, Present, Live and Engineer. A room shows the ones it supports, always in that order.'], ['Help is never hidden', 'Help and the room guide sit at the top right of every mode.']]} />
        </Card>
        <Card title="Five modes" icon="layers" sub={eng ? 'All five are open to your role' : 'Engineer mode is for engineering roles'}>
          <ol className="pa-steps">{MODES.map((m) => <li key={m.key} data-state={m.key === 'engineer' && !eng ? undefined : 'done'}><div><div className="pa-steps__t">{m.label}</div><p className="pa-steps__s">{m.sub} · {m.who}</p></div></li>)}</ol>
        </Card>
      </div>
      <Zone title="Every room’s panel" note={`${ROOMS.length} rooms · tap one to open its panel`}>
        <div className="kit-grid">{BUILDINGS.map((b) => { const rs = ROOMS.filter((r) => r.building === b.key); return rs.length ? (
          <Card key={b.key} title={b.name} icon="building" sub={`${plural(rs.length, 'room')} · ${rs.filter((r) => !busyAt(r.id)).length} free now`}>
            <ul className="pa-queue">{rs.map((r) => { const busy = busyAt(r.id); return <li key={r.id}><a className="pa-inc" href={`#/control/${r.id}`}><span className={`pa-inc__sev kit-s--${busy ? 'warn' : 'ok'}`} aria-hidden="true" /><span><span className="pa-inc__t">{shortName(r)} — {r.name}</span><br /><span className="pa-inc__s">{modesFor(r, eng).map((m) => m.label).join(' · ')}</span></span><span>{busy ? <Tag tone="warn">in a session</Tag> : <Tag tone="ok">free</Tag>}</span></a></li>; })}</ul>
          </Card>) : null; })}</div>
      </Zone>
    </>
  );
}

function RoomControl({ role, id, can, query }: PageProps & { id: string }) {
  const o = roomById(id); const rec = o ? roomRecord(o.id) : null;
  const eng = allows({ field: 'control.engineer' }, role);
  const avail = o ? modesFor(o, eng) : [];
  const [mode, setMode] = useState(query.get('mode') && avail.some((m) => m.key === query.get('mode')) ? query.get('mode')! : 'room');
  const [tick, setTick] = useState(0);
  // a link to another mode of the same room (?mode=engineer) changes the mode; found by the role-matrix check, 10 Nov
  const asked = query.get('mode'); useEffect(() => { if (asked && avail.some((m) => m.key === asked)) setMode(asked); }, [asked, id]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!o || !rec) return <EmptyState title="No room has this address" icon="room" action={<a className="ui-btn" href="#/control">Every room’s panel</a>}>Nothing in the campus records is called <code>{id}</code>.</EmptyState>;
  return <RoomControlBody o={o} rec={rec} role={role} use={can('control.use')} eng={eng} mode={mode} setMode={setMode} avail={avail} tick={tick} bump={() => setTick((n) => n + 1)} />;
}
/** The room's page once the room is known: the sentence is the heading and follows every press. */
function RoomControlBody({ o, rec, role, use, eng, mode, setMode, avail, tick, bump }: { o: RoomOutline; rec: RoomRecord; role: PageProps['role']; use: boolean; eng: boolean; mode: string; setMode: (m: string) => void; avail: typeof MODES; tick: number; bump: () => void }) {
  const busy = busyAt(o.id); const next = nextOf(o.id); const sentence = useRoomSentence(rec, tick);
  const opens = (href: string) => { const x = resolve(href.split('?')[0]!); return !!x && canOpen(role, x); };
  return (
    <>
      <Crumbs items={[['Empathia Control', '#/control'], [shortName(o)]]} />
      <PageHero compact eyebrow={`${fullName(o)} · panel`} title={<span data-testid="rc-sentence">{sentence}</span>} product="lite" icon="settings" lede={`${o.capacity} seats · ${rec.archetypeName} · ${plural(rec.positions.filter((p) => !p.furniture).length, 'device')} in the design · ${busy ? `in a session (${busy.title})` : next ? `free until ${hhmm(next.from)}` : 'free for the rest of the day'}`}
        meta={honest(['Simulated control: nothing is sent', 'warn'])} actions={<><a className="ui-btn" href={roomHref(o)}>Room guide and 3D</a>{opens('#/here') && <a className="ui-btn" href={`#/here/${o.id}`}>I am in this room</a>}<a className="ui-btn ui-btn--quiet" href={`#/scheduler/${o.id}`}>Door panel</a></>} />
      <Segmented label="Mode" value={mode} onChange={setMode} options={avail.map((m) => ({ value: m.key, label: m.label, icon: m.icon }))} />
      <p className="pa-note" data-testid="rc-mode">{MODES.find((m) => m.key === mode)!.sub}.</p>
      <RoomPanel r={rec} role={role} use={use} mode={mode as ModeKey} onChange={bump} />
      {mode === 'engineer' && eng && (
        <Card title="What the room is made of" icon="wrench" sub="Engineer mode: positions from the design, identity as the record keeps it">
          <div className="pa-table-wrap"><table className="pa-table"><thead><tr><th scope="col">Position</th><th scope="col">Class</th><th scope="col">Layer</th><th scope="col">Identity</th></tr></thead>
            <tbody>{rec.positions.filter((p) => !p.furniture).map((p) => <tr key={p.code}><th scope="row" className="pa-mono">{p.code}</th><td>{p.catLabel}</td><td>{p.layer}</td><td>{p.identity.toLowerCase()}</td></tr>)}</tbody></table></div>
        </Card>
      )}
      <Card title="Today in this room" icon="calendar" sub="Generated sessions on the demonstration clock">
        <div className="pa-timeline">{sessionsOf(o.id).map((s) => <div key={s.from} className="pa-slot" data-now={s.from <= DEMO_NOW && s.to > DEMO_NOW}><time>{hhmm(s.from)}–{hhmm(s.to)}</time><span>{s.title}</span></div>)}</div>
      </Card>
    </>
  );
}

function Spaces() {
  return (
    <>
      <Crumbs items={[['Empathia Control', '#/control'], ['Shared spaces']]} />
      <PageHero eyebrow="Lite · shared spaces" title="Lobbies, commons and coffee points" product="lite" icon="map" lede="The spaces between rooms: what their screens show, who may change it, and the rule that lets a priority message through."
        meta={honest(['Simulated control: nothing is published', 'warn'], ['Synthetic data', 'warn'])} actions={<a className="ui-btn" href="#/v14/signage">The signage control plane</a>} />
      <div className="kit-grid">{SIGNAGE.map(([id, name, b, purpose, ch, rule, displays]) => (
        <Card key={id} title={name} icon="map" sub={`${BUILDINGS.find((x) => x.key === b)?.name} · ${plural(displays, 'display')} · ${plural(ch, 'channel')}`} footer={<span className="pa-mono">{id}</span>}>
          <p>{purpose}</p><p className="pa-note"><Icon name="alert" size={14} /> {rule}</p>
        </Card>))}</div>
    </>
  );
}

function Scheduler() {
  const free = ROOMS.filter((r) => !busyAt(r.id)); const busy = ROOMS.length - free.length;
  return (
    <>
      <PageHero eyebrow="Lite · room scheduler" title="Room scheduler" product="lite" icon="calendar" lede="The panel at the door of each room: whether it is free, what comes next, what the room can do, and the way into its guide."
        meta={honest(['Simulated control', 'warn'], ['Synthetic sessions, not a real calendar', 'muted'])} />
      <div className="kit-grid kit-grid--tiles">
        <StatTile label="Available now" value={free.length} unit={` of ${ROOMS.length}`} icon="check" hint={`at ${hhmm(DEMO_NOW)} UTC on the demonstration clock`} />
        <StatTile label="Occupied" value={busy} icon="users" hint="in a session" />
        <StatTile label="Sessions today" value={ROOMS.reduce((s, r) => s + sessionsOf(r.id).length, 0)} icon="calendar" hint="generated per room" />
      </div>
      {BUILDINGS.map((b) => { const rs = ROOMS.filter((r) => r.building === b.key); if (!rs.length) return null; return (
        <Zone key={b.key} title={b.name} note={`${rs.filter((r) => !busyAt(r.id)).length} free`}>
          <ul className="pa-queue">{rs.map((r) => { const s = busyAt(r.id); const n = nextOf(r.id); return (
            <li key={r.id}><a className="pa-inc" href={`#/scheduler/${r.id}`}><Icon name="clock" size={18} />
              <span><span className="pa-inc__t">{shortName(r)} — {r.name}</span><br /><span className="pa-inc__s">{s ? `In ${s.title} until ${hhmm(s.to)}` : n ? `Available until ${hhmm(n.from)}` : 'Available for the rest of the day'} · seats {r.capacity}</span></span>
              <StatusDot state={s ? 'monitor' : 'healthy'} label={s ? 'Occupied' : 'Available'} /></a></li>); })}</ul>
        </Zone>); })}
    </>
  );
}

function DoorPanel({ id }: PageProps & { id: string }) {
  const o = roomById(id);
  if (!o) return <EmptyState title="No room has this address" icon="room" action={<a className="ui-btn" href="#/scheduler">Every room</a>} />;
  const s = busyAt(o.id); const n = nextOf(o.id);
  return (
    <>
      <Crumbs items={[['Room scheduler', '#/scheduler'], [shortName(o)]]} />
      <div className={`pa-panel-door kit-s--${s ? 'warn' : 'ok'}`} data-testid="door-panel">
        <h1 className="pa-panel-door__state">{shortName(o)}: {s ? 'in use' : 'available'}</h1>
        <p className="pa-note">{fullName(o)} · seats {o.capacity}</p>
        <p>{s ? `${s.title} until ${hhmm(s.to)}` : n ? `Free until ${hhmm(n.from)} — next: ${n.title}` : 'Free for the rest of the day'}</p>
        <div className="pa-row-actions"><a className="ui-btn ui-btn--primary" href={`#/control/${o.id}`}>Open the room panel</a><a className="ui-btn" href={roomHref(o)}>Room guide</a></div>
        <p className="pa-note">Simulated: booking from this panel is not connected to any calendar.</p>
      </div>
      <Card title="Today" icon="calendar"><div className="pa-timeline">{sessionsOf(o.id).map((x) => <div key={x.from} className="pa-slot" data-now={x.from <= DEMO_NOW && x.to > DEMO_NOW}><time>{hhmm(x.from)}–{hhmm(x.to)}</time><span>{x.title}</span></div>)}</div></Card>
    </>
  );
}
