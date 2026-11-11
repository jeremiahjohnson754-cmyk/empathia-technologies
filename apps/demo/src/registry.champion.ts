/**
 * The Site Champion's page (founder, 11 Nov 2026). V2.5.3 has no such role, so each grant is to this role by name, with the reason:
 * the platform's persona `sitechamp` holds location.verify, access.coordinate and occupancy.confirm (docs/api/RBAC_MATRIX.md), and
 * those three, with contributing local knowledge, are the only things this page lets anyone do.
 */
import type { PageDef } from './registry.types.js';

const WHY = 'Founder, 11 November 2026: the Site Champion is a dedicated governed role, scoped to their own site';
export const CHAMPION_PAGES: readonly PageDef[] = [
  {
    id: 'site', title: 'My site', purpose: 'The Site Champion’s own site: its rooms, the problems on record, who is coming, who supports it, and what the champion knows', product: 'lite',
    path: '/site', authority: { roles: ['sitechamp'], why: WHY },
    actions: [
      { id: 'site.access', label: 'Confirm access for a visit', authority: { roles: ['sitechamp'], why: `${WHY}; the persona’s access.coordinate` } },
      { id: 'site.verify', label: 'Say a room’s details match its record', authority: { roles: ['sitechamp'], why: `${WHY}; the persona’s location.verify` } },
      { id: 'site.occupancy', label: 'Say what was seen at the door', authority: { roles: ['sitechamp'], why: `${WHY}; the persona’s occupancy.confirm` } },
      { id: 'site.contribute', label: 'Add what you know about a room', authority: { roles: ['sitechamp'], why: `${WHY}; a contribution is a candidate for review, never fact` } },
    ],
    load: () => import('./champion/SitePage.js'),
    search: { keywords: 'site champion my site rooms visits access confirm local knowledge who supports escalation', aliases: ['my site', 'site champion', 'champion'] },
  },
];
