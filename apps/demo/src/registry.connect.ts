/**
 * Pages of the Connect slice (owner: agent/connect-people-actions; founder, 11 November 2026): the people directory with site
 * champions as a first-class record, and the schedule-aware meeting assistant. Contract: registry.types.ts and README-routes.md.
 *
 * Who may open them is composed from V2.5.3's own authorities in connect/access.ts (entity SupportPath, field person.contact,
 * action comms.compose, areas scheduler and search.people); the Site Champion role is added when the policy has it. A person's
 * profile is refined by its address: a role is admitted to a profile only when it may see that person's contact details.
 */
import type { PageDef } from './registry.types.js';
import { directoryAuthority, meetAuthority, profileAuthority } from './connect/access.js';

export const CONNECT_PAGES: readonly PageDef[] = [
  {
    id: 'people', title: 'People', purpose: 'Who looks after each site and each kind of work: site champions and their backups, the named holder of each role, how current each entry is, and the ways to contact them', product: 'search-party',
    path: '/people', alias: ['/people/:id'], authority: directoryAuthority(),
    authorityFor: (params) => (params['id'] ? profileAuthority(params['id']) : undefined),
    load: () => import('./connect/PeoplePage.js'),
    search: { keywords: 'people directory person contact site champion backup technician engineer manager who knows room teams email call phone availability working hours time zone shift', aliases: ['people', 'directory', 'site champion', 'who knows this room', 'contacts'] },
  },
  {
    id: 'meet', title: 'Schedule a meeting', purpose: 'Find a time that suits everyone’s working hours, shifts, time zones and the room; review it; confirm it. Nothing is recorded before the confirmation, and nothing is sent', product: 'search-party',
    path: '/meet', authority: meetAuthority(),
    load: () => import('./connect/MeetPage.js'),
    search: { keywords: 'meeting schedule book calendar time slot availability invite teams outlook room booking time zone', aliases: ['schedule a meeting', 'book a meeting', 'meeting assistant', 'meet'] },
  },
];
