/**
 * Who may see whom, reach whom and schedule (D44: a role never sees what it cannot use; a refused action is not rendered).
 *
 * Every rule is one of the legacy product's own authorities (access/v253.ts), read through the policy:
 *   - who to contact (a name, a role and the reason): V2.5.3 entity `SupportPath` — every signed-in role, never a visitor;
 *   - a person's address and number: V2.5.3 field `person.contact`. A site champion and their backup are the exception the role
 *     exists for: they are the published contact of a site, so their details are shown to everyone who may be told who to contact;
 *   - opening Teams, mail or the phone for a person: their details, and V2.5.3 action `comms.compose`;
 *   - scheduling: V2.5.3 area `scheduler` and action `comms.compose`, with people whose details the role may see;
 *   - browsing the whole directory: V2.5.3 area `search.people`.
 * The Site Champion role (`sitechamp`) is read from ROLE_KEYS at run time: when the policy has it, a champion may be told who to
 * contact, may reach and schedule, and may see the details of the people of their own site only. Being a champion grants nothing
 * else here: no engineering, administrative or sign-off authority is derived from the title (directory.ts › championMayNot).
 * This is a demonstration of authorization, not security: the whole synthetic directory is in the page.
 */
import type { Authority, RoleKey } from '../registry.types.js';
import { allows, ROLE_KEYS } from '../access/policy.js';
import { holds, personaOf } from '../build/store.js';
import { championRole, personaPerson, personById, type Person } from './directory.js';

export const WHO: Authority = { entity: 'SupportPath' };
export const DETAILS: Authority = { field: 'person.contact' };
export const COMPOSE: Authority = { action: 'comms.compose' };
export const SCHEDULER: Authority = { area: 'scheduler' };
export const PEOPLE_AREA: Authority = { area: 'search.people' };

const isChampion = (role: RoleKey, keys: readonly string[] = ROLE_KEYS) => role === championRole(keys);
/** May this role be told who to contact about a room, a device, a building or an issue? */
export const mayKnowWho = (role: RoleKey, keys?: readonly string[]) => allows(WHO, role) || isChampion(role, keys);
/** Does a champion's own site include this person? (A champion's site is the buildings of the person the role stands for.) */
const ownSite = (role: RoleKey, p: Person) => { const me = personaPerson(role); return !!me && p.buildings.some((b) => me.buildings.includes(b)); };
/** May this role see this person's address and number? */
export function maySeeDetails(role: RoleKey, p: Person, keys?: readonly string[]): boolean {
  if (p.kind !== 'role') return mayKnowWho(role, keys);
  return allows(DETAILS, role) || (isChampion(role, keys) && ownSite(role, p));
}
/** May this role open Teams, mail or the phone for this person? */
export const mayReach = (role: RoleKey, p: Person, keys?: readonly string[]) => maySeeDetails(role, p, keys) && (allows(COMPOSE, role) || isChampion(role, keys));
/** May this role use the meeting assistant at all? (With whom is `maySeeDetails`, asked for every attendee.) */
export const maySchedule = (role: RoleKey, keys?: readonly string[]) => (allows(SCHEDULER, role) && allows(COMPOSE, role)) || isChampion(role, keys);
/** May this role browse the whole directory? A champion browses their own site. */
export const mayBrowse = (role: RoleKey, keys?: readonly string[]) => allows(PEOPLE_AREA, role) || isChampion(role, keys);
/** The people a role is shown in the directory. */
export const visibleTo = (role: RoleKey, list: Person[], keys?: readonly string[]) => (mayBrowse(role, keys) ? list.filter((p) => maySeeDetails(role, p, keys)) : mayKnowWho(role, keys) ? list.filter((p) => p.kind !== 'role') : []);
/**
 * May this role confirm a directory entry or add a local note to a champion's profile? The Data Steward publishes profiles
 * (persona authority `profile.publish`); a site champion keeps their own site's entries.
 */
export const mayCurate = (role: RoleKey, p: Person, keys?: readonly string[]) => holds(personaOf(role), 'profile.publish') || (isChampion(role, keys) && ownSite(role, p) && p.kind !== 'role');

const rolesWhere = (test: (r: RoleKey) => boolean): RoleKey[] => ROLE_KEYS.filter(test);
const WHY = 'Connect (founder, 11 Nov 2026): composed from V2.5.3’s own authorities — entity SupportPath, field person.contact, action comms.compose, areas scheduler and search.people — with the Site Champion role added when the policy has it (apps/demo/src/connect/access.ts)';
/** The authority of the directory page, of one person's profile, and of the meeting assistant, as the page registry needs them. */
export const directoryAuthority = (): Authority => ({ roles: rolesWhere((r) => mayKnowWho(r)), why: WHY });
export const profileAuthority = (personId: string): Authority | undefined => { const p = personById(personId); return p ? { roles: rolesWhere((r) => maySeeDetails(r, p)), why: WHY } : undefined; };
export const meetAuthority = (): Authority => ({ roles: rolesWhere((r) => maySchedule(r)), why: WHY });
