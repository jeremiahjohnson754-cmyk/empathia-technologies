/**
 * Personalisation of the IT Onboarding Success Guide (founder, §08): "Use only permitted tenant-specific information" — employer,
 * department, job role, assigned locations, approved software, support contacts, reporting relationships, internal standards,
 * required training, equipment assignments, access procedures, HR-approved organisational content.
 *
 * Each field is read here, at the moment of viewing, from the organisation's own records in this demonstration (the directory, the
 * access policy, the estate). A field the organisation has not provided is `null` and is shown as "not recorded": nothing is made
 * up to fill it, and nothing about one organisation is written into the programme (program.ts), which every organisation shares.
 */
import type { RoleKey } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import { buildingByKey, roomsIn } from '../campus/canon.js';
import { championOf, holdersOf, personaPerson, type Person } from '../connect/directory.js';
import { HOME_TENANT, tenantName } from '../knowledge/types.js';
import { OB_ROLES } from './roles.js';
import type { Place } from './program.js';

export interface Field { id: string; label: string; value: string | null; /** where the value was read, or who would provide it */ from: string }
export interface Profile {
  tenant: string; starterRole: RoleKey; starter: Person | null; manager: Person | null; mentor: Person | null; champion: Person | null; site: string | null; siteName: string | null; rooms: number;
  fields: Field[];
}
const NOT = 'The organisation’s administrator provides it; none is recorded in this demonstration';

/** The profile of the demonstration's one new starter. Every value comes from a record; what has no record is null. */
export function profile(): Profile {
  const starterRole = OB_ROLES.starter[0]!; const starter = personaPerson(starterRole); const site = starter?.home ?? null; const B = site ? buildingByKey(site) : null;
  const manager = site ? holdersOf(OB_ROLES.manager[0]!, site)[0] || null : null; const mentor = site ? holdersOf(OB_ROLES.mentor[0]!, site)[0] || null : null; const champion = site ? championOf(site) : null;
  const rooms = site ? roomsIn(site).length : 0; const tenant = tenantName(HOME_TENANT);
  const fields: Field[] = [
    { id: 'employer', label: 'Employer', value: `${tenant} (a synthetic organisation)`, from: 'The tenant' },
    { id: 'role', label: 'Job role', value: ROLES[starterRole].label, from: 'The access policy' },
    { id: 'department', label: 'Department', value: null, from: NOT },
    { id: 'locations', label: 'Assigned locations', value: starter ? starter.buildings.map((k) => buildingByKey(k)?.name || k).join(', ') : null, from: 'The directory' },
    { id: 'reporting', label: 'Reports to', value: manager ? `${manager.name}, ${manager.title}` : null, from: 'The directory' },
    { id: 'mentor', label: 'Mentor', value: mentor ? `${mentor.name}, ${mentor.title}` : null, from: 'The directory' },
    { id: 'contacts', label: 'Support contacts', value: [champion ? `${champion.name} (site champion)` : null, manager ? `${manager.name} (service manager)` : null].filter(Boolean).join('; ') || null, from: 'The directory' },
    { id: 'software', label: 'Approved software', value: null, from: NOT },
    { id: 'standards', label: 'Internal standards', value: null, from: 'Read from the Knowledge Ledger by a reader the source lets read them; none is listed here' },
    { id: 'training', label: 'Required training', value: null, from: NOT },
    { id: 'equipment', label: 'Equipment assignments', value: null, from: NOT },
    { id: 'access', label: 'Access procedures', value: null, from: NOT },
    { id: 'vendors', label: 'Vendors and agreements', value: null, from: NOT },
    { id: 'hr', label: 'Organisational content approved by HR', value: null, from: NOT },
  ];
  return { tenant, starterRole, starter, manager, mentor, champion, site, siteName: B?.name || null, rooms, fields };
}
export const fieldOf = (p: Profile, id: string): Field | null => p.fields.find((f) => f.id === id) || null;

/** Where an item sends the reader, for this organisation. Null when the record that would say where does not exist. */
export function placeHref(place: Place, p: Profile): string | null {
  switch (place) {
    case 'people-manager': return p.manager ? `#/people/${p.manager.id}` : null;
    case 'people-mentor': return p.mentor ? `#/people/${p.mentor.id}` : null;
    case 'people-champion': return p.champion ? `#/people/${p.champion.id}` : null;
    case 'people-site': return p.site ? `#/people?site=${p.site}` : null;
    case 'site-rooms': return p.site ? `#/lite/b/${p.site}` : null;
    case 'room-guide': { const r = p.site ? roomsIn(p.site)[0] : null; return r ? `#/guide/room/${r.id}` : null; }
    case 'servicehands': return '#/servicehands';
    case 'documentation': return '#/docs';
    case 'knowledge': return '#/knowledge';
    case 'learn': return '#/learn';
    case 'control': { const r = p.site ? roomsIn(p.site)[0] : null; return r ? `#/control/${r.id}` : null; }
  }
}
