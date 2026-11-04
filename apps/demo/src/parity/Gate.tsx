/**
 * #/gate (the welcome page, V2.5.3's first touch): who you are today, the search bar, and the way into your work. Choosing a role is the
 * demonstration's View as (D1): it changes what is shown and grants nothing.
 */
import { useState } from 'react';
import { PageHero, Icon, Chip } from '@empathia/ui';
import type { PageProps, RoleKey } from '../registry.types.js';
import { ROLES, ROLE_KEYS, tabsFor } from '../access/policy.js';
import { useViewAs } from '../viewas/context.js';
import { ROOMS, BUILDINGS } from '../campus/canon.js';
import { honest, Zone } from './ui.js';

const GROUPS: Array<[string, RoleKey[]]> = [
  ['Using the workplace', ['visitor', 'employee', 'exec']],
  ['Running the rooms', ['ops', 'svcmgr', 'service', 'syseng']],
  ['Building the rooms', ['designer', 'installer', 'cxeng', 'ipm', 'bpm']],
  ['Keeping the record', ['steward', 'architect']],
];

export default function GatePage({ role }: PageProps) {
  const v = useViewAs(); const [q, setQ] = useState('');
  const go = (e: { preventDefault(): void }) => { e.preventDefault(); const t = q.trim(); location.hash = t ? `#/find?q=${encodeURIComponent(t.slice(0, 120))}` : '#/find'; };
  const home = tabsFor(role, () => true)[0];
  return (
    <div className="pa" data-testid="parity-gate">
      <PageHero eyebrow="Empathia · welcome" title="Welcome to the Northstar campus" product="lite" icon="home"
        lede={`${ROOMS.length} rooms in ${BUILDINGS.length} buildings, one record of each. Tell us who you are today and the campus arranges itself around your work.`}
        meta={honest(['Synthetic data', 'warn'], ['Choosing a role grants nothing', 'muted'])}
        actions={home ? <a className="ui-btn ui-btn--primary" href={home.href}>Continue as {ROLES[role].label}</a> : undefined} />
      <form className="pa-ask" role="search" aria-label="Search the campus" onSubmit={go}>
        <label className="ui-sr" htmlFor="pa-gate-q">Search rooms, devices, people, vendors, projects, issues and standards</label>
        <input id="pa-gate-q" value={q} onChange={(e) => setQ(e.target.value)} maxLength={120} placeholder="Search rooms, devices, people, projects, issues…" autoComplete="off" />
        <button className="ui-btn ui-btn--primary" type="submit"><Icon name="search" size={16} /> Search</button>
      </form>
      <div className="pa-chips">{['Atlas 4.218', 'Where is the training room?', 'Rooms free now'].map((x) => <Chip key={x} small href={x === 'Rooms free now' ? '#/scheduler' : `#/find?q=${encodeURIComponent(x)}`}>{x}</Chip>)}</div>
      {GROUPS.map(([g, keys]) => (
        <Zone key={g} title={g}>
          <div className="kit-grid">{keys.filter((k) => ROLE_KEYS.includes(k)).map((k) => (
            <button key={k} type="button" className="pa-card-link" aria-pressed={role === k} onClick={() => v.switchTo(k)} data-testid={`gate-role-${k}`}>
              <span className="pa-card-link__h"><span className="pa-ticon kit-s--accent" aria-hidden="true">{ROLES[k].initials}</span>{ROLES[k].label}</span>
              <span className="pa-card-link__p">{ROLES[k].blurb}</span>
              <span className="pa-card-link__meta">{role === k ? 'You are viewing as this role' : `Opens on ${ROLES[k].home}`}</span>
            </button>))}</div>
        </Zone>
      ))}
    </div>
  );
}
