/**
 * The technical room page at its V2.5.3 addresses: #/room (the reference room, Atlas 4.218), #/room/<id> and #/room~<id>. The same
 * RoomView the campus address shows. An id the campus does not hold lands on a finished screen: what was asked, and every room to pick.
 */
import type { PageProps } from '../registry.types.js';
import { resolve } from '../registry.pages.js';
import { canOpen } from '../access/policy.js';
import { ROOMS, REFERENCE_ROOM_ID, roomById, shortName, buildingByKey } from '../campus/canon.js';
import { roomRecord } from '../campus/design.js';
import { roomHealth } from '../campus/metrics.js';
import { load as loadWorkspace } from '../workspace/store.js';
import { RoomView } from './RoomView.js';
import { StatusDot } from '../spatial/parts.js';

/** The room id at a V2.5.3 room address: '/room/<id>', '/room~<id>' or none (the reference room). */
export function roomIdOf(hash: string, params: Record<string, string>): string {
  if (params.room) return params.room;
  const m = /^#?\/?room~([^?~/]+)/.exec(hash); if (m) { try { return decodeURIComponent(m[1]!); } catch { return m[1]!; } }
  return REFERENCE_ROOM_ID;
}

export default function RoomPage({ role, hash, params, sees }: PageProps) {
  const id = roomIdOf(hash, params);
  const opens = (href: string) => { const r = resolve(href); return !!r && canOpen(role, r); };
  if (!roomById(id)) return <UnknownRoom id={id} />;
  return <RoomView id={id} hash={hash} sees={sees} opens={opens} base={params.room ? `#/room/${encodeURIComponent(id)}` : '#/room'} />;
}

function UnknownRoom({ id }: { id: string }) {
  let w = null; try { w = loadWorkspace(); } catch { /* none */ }
  return (
    <section className="room" data-native="" data-testid="room-unknown">
      <nav aria-label="Breadcrumb" className="crumbs"><ol><li><a href="#/campus">Campus</a></li><li><span aria-current="page">Room</span></li></ol></nav>
      <header className="room__hero">
        <p className="kicker">Not on this campus</p>
        <h1>There is no room “{id.slice(0, 40)}”</h1>
        <p className="room__intent">The demonstration models thirty rooms of the Northstar Innovation Campus. Pick one, or open the reference room.</p>
        <div className="room__acts"><a className="ui-btn ui-btn--primary" href="#/room">Open the reference room (Atlas 4.218)</a><a className="ui-btn" href="#/rooms">Every room in a list</a></div>
      </header>
      <ul className="pick" data-testid="room-pick">{ROOMS.map((o) => { const h = roomHealth(roomRecord(o.id)!, w); return <li key={o.id}><a href={`#/room/${o.id}`}><b>{shortName(o)}</b><span className="ui-meta">{o.name}</span><span className="pick__m"><StatusDot band={h.band} label={h.score == null ? 'not scored' : `${h.score}`} /><span className="ui-meta">{buildingByKey(o.building)?.short}</span></span></a></li>; })}</ul>
    </section>
  );
}
