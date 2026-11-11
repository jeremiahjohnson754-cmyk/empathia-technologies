/**
 * Pages of the Connect slice (founder's directive of 11 Nov 2026, §02–§05): the people of the estate with "who knows this room",
 * and schedule-aware meetings. V2.5.3 has the people search area and the compose action; the rest is granted by name with the reason.
 */
import type { PageDef, RoleKey } from './registry.types.js';

/** every signed-in role sees who the people are; the Visitor is told to ask their host */
const SIGNED_IN: readonly RoleKey[] = ['employee', 'exec', 'service', 'svcmgr', 'syseng', 'designer', 'installer', 'cxeng', 'ipm', 'bpm', 'ops', 'steward', 'architect', 'qa'];
export const CONNECT_PAGES: readonly PageDef[] = [
  {
    id: 'people', title: 'People', purpose: 'Site champions, the engineers who cover each site and where a problem escalates; who knows a room, in the order to try them', product: 'search-party',
    path: '/people', alias: ['/people/:id'], authority: { roles: SIGNED_IN, why: 'Founder, 11 November 2026: the person who knows a site’s rooms is findable by everyone who works there; a visitor asks their host' },
    sections: [{ id: 'people.contact', label: 'Addresses and numbers', authority: { field: 'person.contact' } }],
    load: () => import('./connect/PeoplePage.js'),
    search: { keywords: 'people person contact site champion who knows this room who to call support engineer escalation teams email phone directory', aliases: ['people', 'who knows this room', 'site champion', 'who to call', 'contacts', 'directory'] },
  },
  {
    id: 'meet', title: 'Find a time', purpose: 'A meeting inside everyone’s working hours, shifts and time zones, recorded only after confirmation', product: 'search-party',
    path: '/meet', authority: { action: 'comms.compose' },
    actions: [{ id: 'meet.confirm', label: 'Confirm and record a meeting', authority: { action: 'comms.compose' } }],
    load: () => import('./connect/MeetPage.js'),
    search: { keywords: 'meeting schedule book time availability calendar working hours shift time zone teams outlook invite', aliases: ['schedule a meeting', 'find a time', 'book a meeting', 'meet'] },
  },
];
