/**
 * Connect in Search Party (one line hosts it in search/SearchParty.tsx): people found by what was typed, and "who knows this room?"
 * as an answer when the search asks it or when a room or a building is the record in focus. Shown only to a role that may be told
 * who to contact (access.ts); a person appears only for a role that may see them.
 */
import type { RoleKey } from '../registry.types.js';
import { REFERENCE_ROOM_ID, roomById, shortName } from '../campus/canon.js';
import { ALL_BUILDINGS, findPeople, roomInText } from './directory.js';
import { mayKnowWho, visibleTo } from './access.js';
import { WhoKnows } from './ContactBar.js';
import { zoneCity } from './time.js';

const WHO_WORDS = /\bwho (knows|do i (contact|ask|call)|looks after|to (contact|ask|call))\b|\bsite champion\b|\bchampion (for|of)\b/i;
/** People matching the search, and "who knows this room?" when the search asks it or a room or building is the record in focus. */
export function ConnectSearch({ q, focus, role }: { q: string; focus: { type: string; id: string } | null; role: RoleKey }) {
  if (!mayKnowWho(role)) return null;
  const text = q.trim(); const asked = WHO_WORDS.test(text) ? roomInText(text) : null;
  const building = !asked && WHO_WORDS.test(text) ? ALL_BUILDINGS.find((b) => new RegExp(`\\b(${b.short}|${b.name})\\b`, 'i').test(text)) : null;
  const found = text.length >= 2 && !asked && !building ? visibleTo(role, findPeople(text, 8)) : [];
  const fRoom = focus?.type === 'Room' && roomById(focus.id) ? focus.id : null; const fBuilding = focus?.type === 'Building' && ALL_BUILDINGS.some((b) => b.key === focus.id) ? focus.id : null;
  if (!asked && !building && !found.length && !fRoom && !fBuilding) return text ? null : <p className="cx-hint ui-muted" data-testid="sp-people-hint">People are part of the search: type a name, or ask <a href={`#/search?q=${encodeURIComponent(`who knows ${shortName(roomById(REFERENCE_ROOM_ID)!)}`)}`}>who knows {shortName(roomById(REFERENCE_ROOM_ID)!)}</a>.</p>;
  return (
    <div className="cx-search" data-testid="sp-connect">
      {asked && <WhoKnows role={role} kind="room" id={asked.id} heading={`Who knows ${shortName(asked)}?`} />}
      {building && <WhoKnows role={role} kind="building" id={building.key} heading={`Who to contact about ${building.name}`} />}
      {!asked && fRoom && <WhoKnows role={role} kind="room" id={fRoom} />}
      {!building && fBuilding && <WhoKnows role={role} kind="building" id={fBuilding} />}
      {found.length > 0 && <section aria-labelledby="cx-sp-people-h" data-testid="sp-people-hits" data-count={found.length}><h2 className="build__h" id="cx-sp-people-h">People</h2>
        <ul className="cx-list">{found.map((p) => <li key={p.id}><a className="cx-card" href={`#/people/${p.id}`} data-person={p.id}><span className="cx-card__h"><b>{p.name}</b><span>{p.title}</span></span><span className="cx-card__m">{p.buildings.map((k) => ALL_BUILDINGS.find((b) => b.key === k)?.short || k).join(', ')} · {zoneCity(p.tz)} time</span></a></li>)}</ul>
        <p className="ui-meta">Synthetic people, from the directory. <a href={`#/people?q=${encodeURIComponent(text)}`}>Open the directory with this search</a></p></section>}
    </div>
  );
}

