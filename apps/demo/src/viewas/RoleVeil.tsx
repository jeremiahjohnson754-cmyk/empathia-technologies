/**
 * The role veil (V2.5.3 roleVeil): on every switch, a ~0.9 s card in the new role's colour — initials, name, domain and where the switch
 * lands. Purely visual: aria-hidden, pointer-events none, it never takes or traps focus (the switch is announced by the live region).
 * Skipped under reduced motion and during guided tours, as in V2.5.3.
 */
import { useEffect, useState } from 'react';
import type { RoleKey } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import { reducedMotion } from './role.js';

export interface VeilShow { role: RoleKey; lands: string; n: number }
export function RoleVeil({ show }: { show: VeilShow | null }) {
  const [on, setOn] = useState<VeilShow | null>(null);
  useEffect(() => {
    if (!show || reducedMotion()) return;
    setOn(show); const t = setTimeout(() => setOn(null), 950); return () => clearTimeout(t);
  }, [show?.n]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!on) return null;
  const r = ROLES[on.role];
  return (
    <div className="veil" data-role-veil={on.role} data-r={on.role} aria-hidden="true">
      <div className="veil__b">
        <span className="veil__ava">{r.initials}</span>
        <i className="veil__bar" />
        <b className="veil__name">{r.label}</b>
        <span className="veil__dom">{r.domain} · {on.lands}</span>
      </div>
    </div>
  );
}
