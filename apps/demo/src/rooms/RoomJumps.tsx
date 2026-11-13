/**
 * "Atlas 4.218 in": one room's places across the products (V2.5.3 roomPlaces and its jumps bar, restored 13 Nov 2026 on the founder's
 * word: "have the commissioning assurance links too from v2.5.3"). The same row stands on the room's page in Lite, Assurance,
 * Commissioning, Control, Replay and Compare, naming the same room, so a person moves between products without losing it. Only places the
 * role may open are listed (absent, not disabled). A selected device travels with the link where the next page can select it.
 */
import { useState } from 'react';
import { Icon, type IconName } from '@empathia/ui';
import type { RoleKey } from '../registry.types.js';
import { resolve } from '../registry.pages.js';
import { canOpen } from '../access/policy.js';
import { roomById, shortName } from '../campus/canon.js';

export type RoomPlace = 'lite' | 'assurance' | 'commissioning' | 'control' | 'replay' | 'compare' | 'campus';

export function roomPlaces(roomId: string, may: (href: string) => boolean, device?: string | null): Array<{ key: RoomPlace; label: string; href: string; icon: IconName }> {
  const o = roomById(roomId); if (!o) return [];
  const dev = device ? `device=${encodeURIComponent(device)}` : '';
  const eng = `#/lite/room/${roomId}?mode=engineer`;
  const lite = may(eng) ? `${eng}${dev ? `&${dev}` : ''}` : `#/lite/room/${roomId}${dev ? `?${dev}` : ''}`;
  const all: Array<{ key: RoomPlace; label: string; href: string; icon: IconName }> = [
    { key: 'lite', label: 'Lite', href: lite, icon: 'room' },
    { key: 'assurance', label: 'Assurance', href: `#/assurance/room/${roomId}`, icon: 'shield' },
    { key: 'commissioning', label: 'Commissioning', href: `#/commissioning/room/${roomId}`, icon: 'check' },
    { key: 'control', label: 'Control', href: `#/control/${roomId}`, icon: 'control' },
    { key: 'replay', label: 'Replay', href: `#/replay/${roomId}`, icon: 'clock' },
    { key: 'compare', label: 'Compare', href: `#/compare/commissioned?a=${roomId}`, icon: 'layers' },
    { key: 'campus', label: 'On campus', href: `#/campus/${o.building}/${o.floor}/${roomId}${dev ? `?${dev}` : ''}`, icon: 'map' },
  ];
  return all.filter((p) => may(p.href));
}
/** whether a role may open an address, with its query (Lite's ?mode= has its own authority) */
export const opensFor = (role: RoleKey) => (href: string) => { const r = resolve(href); return !!r && canOpen(role, r); };   // with its query: Lite's ?mode= has its own authority

export function RoomJumps({ roomId, here, opens, device }: { roomId: string; here: RoomPlace; opens: (href: string) => boolean; device?: string | null }) {
  const o = roomById(roomId); const [copied, setCopied] = useState(false);
  if (!o) return null;
  const ps = roomPlaces(roomId, opens, device).filter((p) => p.key !== here);
  if (!ps.length) return null;
  const copy = () => { const url = location.href; const done = () => { setCopied(true); setTimeout(() => setCopied(false), 2200); };
    try { navigator.clipboard?.writeText(url).then(done, done); } catch { done(); } };
  return <nav className="room-jumps" aria-label={`${shortName(o)} elsewhere in Empathia`} data-testid="room-jumps" data-room={roomId}>
    <span className="room-jumps__l">{shortName(o)} in</span>
    {ps.map((p) => <a key={p.key} href={p.href} data-testid={`room-jump-${p.key}`}><Icon name={p.icon} size={14} />{p.label}</a>)}
    <button type="button" className="room-jumps__copy" onClick={copy} data-testid="room-jump-copy" title="Copy a link to this view, with what is selected"><Icon name="link" size={14} />{copied ? 'Copied' : 'Copy link'}</button>
    <span className="ui-sr" role="status">{copied ? 'Link copied' : ''}</span>
  </nav>;
}
