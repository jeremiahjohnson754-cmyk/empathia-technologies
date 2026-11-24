/**
 * "Connected to": the row every capability's page carries, naming the capabilities it reads from and hands to (packages/ui families.ts
 * CONNECTIONS, the edges of the platform map). It has the shape of the room row (rooms/RoomJumps.tsx): a label, then links, and only
 * the places this role may open are listed (absent, not disabled). The last link is always the platform map. Founder, 23 Nov 2026:
 * the capabilities must read as one platform, not as seventeen separate products.
 */
import { Icon, CAPABILITIES, connectionsOf, familyOf } from '@empathia/ui';
import type { RoleKey } from '../registry.types.js';
import { opensFor } from '../rooms/RoomJumps.js';

export function Connected({ id, role }: { id: string; role: RoleKey }) {
  const me = CAPABILITIES.find((c) => c.id === id); if (!me) return null; const opens = opensFor(role); const fam = familyOf(id);
  const links = connectionsOf(id).map((c) => ({ ...c, cap: CAPABILITIES.find((x) => x.id === c.other)! })).filter((c) => c.cap?.demo && opens(`#${c.cap.demo}`));
  return <nav className="room-jumps cap-rail" aria-label={`${me.name} and the capabilities it is connected to`} data-testid="cap-rail" data-cap={id}>
    <span className="room-jumps__l">{fam ? `${fam.name} · ` : ''}{me.name} works with</span>
    {links.map((c) => <a key={c.other} href={`#${c.cap.demo}`} title={c.says} data-testid={`cap-rail-${c.other}`}>{c.cap.name}</a>)}
    {opens('#/families') ? <a href="#/families" data-testid="cap-rail-map"><Icon name="layers" size={14} />All seventeen</a> : null}
  </nav>;
}
