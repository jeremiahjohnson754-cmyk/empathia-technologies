/**
 * The people directory of the demonstration (founder, 11 Nov 2026: "knowing who actually understands the rooms at a particular site
 * can be just as important as knowing which technician is assigned a ticket").
 *
 * Derived, never typed twice: the buildings and rooms are the canonical estate (campus/canon.ts); the operational roles are the
 * roles the access policy admits to the Operations Hub; the technicians of the service workspace (workspace/store.ts) are the same
 * four people here; a site champion's three permissions are the `sitechamp` persona's own (packages/domain-data V25_PERSONAS).
 * For every building: a site champion and a backup. For every operational role: a named holder for each part of the estate.
 *
 * Everything is SYNTHETIC. Names are invented; addresses use the reserved domain empathia.example (RFC 2606) and telephone numbers
 * use ranges set aside for fiction (555-01xx in North America, 020 7946 0xxx in London), so no button here can reach a real person.
 * The estate records carry no geography, so the time zone of each part of the estate is this directory's own modelling assumption
 * (ZONE_OF_GROUP), stated on the page.
 *
 * NOT BUILT in this slice: contact actions for entity types other than person, room, device, building and issue (projects, vendors,
 * work orders, documents); leave and public holidays; photographs; presence.
 */
import PERSONAS from '@empathia/domain-data/data/V25_PERSONAS.json' with { type: 'json' };
import type { RoleKey } from '../registry.types.js';
import { CHAMPION_SITES, ROLES, ROLE_KEYS, rolesFor } from '../access/policy.js';
import { BUILDINGS, REGIONAL_SITES, ESTATE_GROUPS, CAMPUS_ROOMS, buildingByKey, roomById, roomsIn, shortName, roomHref, type Building, type RoomOutline } from '../campus/canon.js';
import { DEMO_NOW, roomRecord } from '../campus/design.js';
import { seed, techForPersona, type Workspace } from '../workspace/store.js';
import type { Busy, Hours, Shift } from './calendar.js';
import { bindingHours, workingIn } from './calendar.js';
import { DAY, fmtDay, fmtTime, overlaps, utcOffset, zoneCity } from './time.js';

// ------------------------------------------------------------------------------------------------------------ the estate, as the directory reads it
export const ALL_BUILDINGS: readonly Building[] = [...BUILDINGS, ...REGIONAL_SITES];
/** The key of the Site Champion role in the policy (docs/api/RBAC_MATRIX.md; the persona `sitechamp`). Read from ROLE_KEYS at run time, never assumed. */
export const CHAMPION_ROLE = 'sitechamp';
export const championRole = (keys: readonly string[] = ROLE_KEYS): RoleKey | null => (keys.includes(CHAMPION_ROLE) ? (CHAMPION_ROLE as RoleKey) : null);
/**
 * Where each part of the estate keeps its clocks. A modelling assumption of this directory: the canonical estate has no geography.
 * The zones are chosen so the demonstration meets the cases a real estate does: the United States and the United Kingdom change their
 * clocks on different dates, and Phoenix does not change them at all.
 */
export const ZONE_OF_GROUP: Readonly<Record<string, string>> = {
  'Northstar Innovation Campus': 'America/Chicago', 'Science and Learning Park': 'America/New_York', 'Forum and Resilience Quarter': 'Europe/London',
  'Lakeshore Regional Office': 'America/New_York', 'Ridgeview Operations Site': 'America/Phoenix', 'Millbrook Distribution Centre': 'America/Los_Angeles',
};
export const groupOf = (buildingKey: string) => ESTATE_GROUPS.find((g) => g.buildings.includes(buildingKey)) || null;
export const groupSlug = (name: string) => name.split(' ')[0]!.toLowerCase();
export const zoneOfBuilding = (buildingKey: string): string => ZONE_OF_GROUP[groupOf(buildingKey)?.name || ''] || 'UTC';

/** The operational roles: the roles the policy admits to the Operations Hub, less the Product Architect (who sees everything and operates nothing). */
export const operationalRoles = (): RoleKey[] => rolesFor({ area: 'pro.ops' }).filter((r) => r !== 'architect' && r !== 'qa' && r !== championRole());

// ------------------------------------------------------------------------------------------------------------ people
export type PersonKind = 'champion' | 'backup' | 'role';
export type Channel = 'teams' | 'email' | 'phone';
export type Freshness = 'confirmed' | 'stale' | 'unknown';
export interface Person {
  id: string; name: string; kind: PersonKind;
  /** the demonstration role whose work this person does; a champion's is the Site Champion role when the policy has it */
  role: RoleKey | null; title: string;
  /** an external partner's organisation (fictional), when the person is not staff */
  org: string | null;
  /** the building the person is based in, and every building they look after */
  home: string; buildings: string[];
  group: string; tz: string; hours: Hours; shift: Shift | null;
  languages: string[]; channel: Channel;
  /** when the entry was last confirmed by the person or the steward (ISO date), or null when nobody has */
  lastConfirmed: string | null;
  aliases: string[]; email: string; phone: string;
  /** the service workspace's own id for the same person, when there is one */
  staffId: string | null;
}

const GIVEN = ['Amara', 'Bao', 'Citlali', 'Dmitri', 'Esi', 'Farrukh', 'Gwenllian', 'Hoku', 'Inés', 'Jarrah', 'Keanu', 'Leilani', 'Mateus', 'Nilufar', 'Oisín', 'Priya', 'Quang', 'Rangi', 'Siobhán', 'Tomasz', 'Uzoma', 'Valentina', 'Wiremu', 'Xochitl', 'Yusuf', 'Zoë', 'Aroha', 'Björn', 'Chidi', 'Delphine', 'Emeka', 'Fatima', 'Goran', 'Hana', 'Idris', 'Jun', 'Kalinda', 'Lior', 'Mele', 'Noor', 'Otylia', 'Paulo', 'Rosalind', 'Sefa', 'Thandi', 'Ulrike', 'Vikram', 'Wanjiru', 'Ximena', 'Yara', 'Zoltán'];
const FAMILY = ['Abara', 'Brightwell', 'Castellan', 'Dlomo', 'Eriksen', 'Fontaine', 'Greywood', 'Halloran', 'Ibarra', 'Jovanić', 'Kahale', 'Lindqvist', 'Mwangi', 'Nakamura', 'O’Rourke', 'Petrov', 'Quispe', 'Rahimi', 'Sandoval', 'Tanaka', 'Ulloa', 'Varga', 'Whitlock', 'Xuereb', 'Yilmaz', 'Zielinski', 'D’Souza', 'Okonkwo', 'Adeyemi', 'Haddad', 'Castillo', 'Paewai', 'Tuala', 'Nyström', 'Achterberg', 'Balogun', 'Carvalho', 'Devlin', 'Ekström', 'Farouk', 'Goldfinch'];
const LANGUAGES = ['Spanish', 'French', 'Portuguese', 'Hindi', 'Mandarin', 'Arabic', 'Welsh', 'Yoruba', 'Polish', 'Tagalog', 'Vietnamese', 'German', 'Swahili', 'Te reo Māori'];
const CHANNELS: Channel[] = ['teams', 'teams', 'email', 'teams', 'phone'];
const WEEK = [1, 2, 3, 4, 5];
/** Hours by kind of work. A service technician works a shift, and the shift is what binds them. */
const HOURS: Record<string, Hours> = {
  champion: { days: WEEK, start: '07:30', end: '16:00' }, backup: { days: WEEK, start: '10:00', end: '18:30' },
  svcmgr: { days: WEEK, start: '08:00', end: '17:00' }, syseng: { days: WEEK, start: '09:00', end: '17:30' }, cxeng: { days: WEEK, start: '08:30', end: '17:00' },
  ops: { days: WEEK, start: '08:00', end: '16:30' }, installer: { days: WEEK, start: '07:00', end: '15:30' }, service: { days: WEEK, start: '08:00', end: '16:30' },
};
export const SHIFTS: readonly Shift[] = [{ name: 'Early shift', days: WEEK, start: '06:00', end: '14:00' }, { name: 'Late shift', days: WEEK, start: '13:00', end: '21:00' }];
/** Roles that work a shift pattern. */
export const SHIFT_ROLES: readonly string[] = ['service'];
export const EMAIL_DOMAIN = 'empathia.example';
/** How long a confirmation stands before the entry is shown as stale. */
export const FRESH_DAYS = 90;

const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hash = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; };
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const PHONE_AREA: Record<string, string> = { 'America/Chicago': '312', 'America/New_York': '212', 'America/Phoenix': '602', 'America/Los_Angeles': '213' };

let cache: Person[] | null = null;
/** Every person of the directory, in a fixed order: for each building its champion and backup, then the holders of each role, by part of the estate. */
export function people(): Person[] {
  if (cache) return cache;
  const out: Person[] = []; const used = new Set<string>(); const perZone: Record<string, number> = {}; let slot = 0;
  const staff = seed().staff; const staffNames = new Set(staff.map((s) => s.name.split(/ [—(]/)[0]!.trim()));
  const invent = (): string => { for (let k = 0; k < GIVEN.length * FAMILY.length; k += 1) { const n = `${GIVEN[(slot + k) % GIVEN.length]} ${FAMILY[(slot * 7 + 3 + k * 11) % FAMILY.length]}`; if (!used.has(n) && !staffNames.has(n)) { slot += 1; used.add(n); return n; } } slot += 1; return `Person ${slot}`; };
  const add = (p: Omit<Person, 'tz' | 'group' | 'email' | 'phone' | 'languages' | 'channel' | 'lastConfirmed' | 'aliases'> & { aliases?: string[] }): void => {
    const g = groupOf(p.home)!; const tz = ZONE_OF_GROUP[g.name] || 'UTC'; const h = hash(p.id); const n = (perZone[tz] = (perZone[tz] || 0) + 1) - 1;
    const phone = tz === 'Europe/London' ? `+44-20-7946-0${String(n).padStart(3, '0')}` : `+1-${PHONE_AREA[tz] || '312'}-555-01${String(n % 100).padStart(2, '0')}`;
    const B = buildingByKey(p.home)!; const first = p.name.split(' ')[0]!;
    out.push({ ...p, group: g.name, tz, email: `${fold(first)}.${fold(p.name.split(' ').slice(1).join(' '))}@${EMAIL_DOMAIN}`, phone,
      languages: ['English', ...(h % 3 ? [LANGUAGES[h % LANGUAGES.length]!] : [])], channel: CHANNELS[h % CHANNELS.length]!,
      lastConfirmed: h % 11 === 0 ? null : iso(DEMO_NOW - (h % 200) * DAY),
      aliases: [...new Set([first, p.title, ...(p.kind === 'role' ? [] : [`${B.short} champion`, `${B.name} champion`]), ...(p.staffId ? [p.staffId] : []), ...(p.aliases || [])])] });
  };
  const champ = championRole();
  for (const b of ALL_BUILDINGS) {
    add({ id: `p-champ-${b.key}`, name: invent(), kind: 'champion', role: champ, title: `Site Champion, ${b.name}`, org: null, home: b.key, buildings: [b.key], hours: HOURS['champion']!, shift: null, staffId: null });
    add({ id: `p-backup-${b.key}`, name: invent(), kind: 'backup', role: champ, title: `Backup Site Champion, ${b.name}`, org: null, home: b.key, buildings: [b.key], hours: HOURS['backup']!, shift: null, staffId: null, aliases: ['backup'] });
  }
  // the service workspace's technicians are the same people here (never a second set of names)
  const roleOfStaff = (id: string): RoleKey => (['service', 'installer'] as RoleKey[]).find((r) => techForPersona(r) === id) || 'service';
  const fromStaff = staff.map((s, i) => ({ s, role: roleOfStaff(s.id), i }));
  for (const g of ESTATE_GROUPS) {
    const here = fromStaff.filter((x) => x.s.sites.some((k) => g.buildings.includes(k)));
    for (const role of operationalRoles()) {
      const scoped = role === 'service' || role === 'installer';
      const have = here.filter((x) => x.role === role);
      for (const x of have) {
        const sites = x.s.sites.filter((k) => g.buildings.includes(k)); const name = x.s.name.split(/ [—(]/)[0]!.trim(); used.add(name);
        add({ id: `p-${x.s.id}`, name, kind: 'role', role, title: ROLES[role].label, org: x.s.internal ? null : x.s.orgName || 'a partner organisation', home: x.s.buildingKey && g.buildings.includes(x.s.buildingKey) ? x.s.buildingKey : sites[0]!, buildings: sites, hours: HOURS[role] || HOURS['service']!, shift: SHIFT_ROLES.includes(role) ? SHIFTS[x.i % SHIFTS.length]! : null, staffId: x.s.id });
      }
      const covered = new Set(have.flatMap((x) => x.s.sites)); const left = scoped ? g.buildings.filter((k) => !covered.has(k)) : have.length ? [] : [...g.buildings];
      if (left.length) add({ id: `p-${role}-${groupSlug(g.name)}`, name: invent(), kind: 'role', role, title: ROLES[role].label, org: null, home: left[0]!, buildings: left, hours: HOURS[role] || HOURS['service']!, shift: SHIFT_ROLES.includes(role) ? SHIFTS[(have.length + 1) % SHIFTS.length]! : null, staffId: null });
    }
  }
  cache = out; return out;
}
export const personById = (id: string): Person | null => people().find((p) => p.id === id) || null;
export const personByEmail = (mail: string): Person | null => people().find((p) => p.email === mail.toLowerCase()) || null;
export const championOf = (buildingKey: string): Person | null => personById(`p-champ-${buildingKey}`);
export const backupOf = (buildingKey: string): Person | null => personById(`p-backup-${buildingKey}`);
/** The holders of a role who look after a building, in directory order. */
export const holdersOf = (role: RoleKey, buildingKey: string): Person[] => people().filter((p) => p.kind === 'role' && p.role === role && p.buildings.includes(buildingKey));
/** The person a demonstration role stands for when it acts (a perspective, never a login): the same mapping the service workspace uses for technicians. */
export function personaPerson(role: RoleKey): Person | null {
  if (role === championRole()) return championOf(CHAMPION_SITES[0] || ALL_BUILDINGS[0]!.key);   // the policy says which site the demonstration's champion is the champion of
  const tech = techForPersona(role); if (tech) return personById(`p-${tech}`);
  return people().find((p) => p.kind === 'role' && p.role === role && p.group === ESTATE_GROUPS[0]!.name) || null;
}
/** The backup for a person: a champion's backup champion (and the reverse); for a role holder, another holder of the same role for the same building. */
export function backupFor(p: Person): Person | null {
  if (p.kind === 'champion') return backupOf(p.home);
  if (p.kind === 'backup') return championOf(p.home);
  return (p.role ? people().find((x) => x.id !== p.id && x.kind === 'role' && x.role === p.role && x.buildings.some((k) => p.buildings.includes(k))) : null) || null;
}

// ------------------------------------------------------------------------------------------------------------ freshness
/** Confirmed within FRESH_DAYS of the records' date, stale after that, unknown when nobody ever confirmed it. `confirmed` is the store's overlay of confirmations made in this browser. */
export function lastConfirmedOf(p: Person, confirmed: Record<string, string> = {}): string | null { const c = confirmed[p.id]; return c && (!p.lastConfirmed || c > p.lastConfirmed) ? c : p.lastConfirmed; }
export function freshnessOf(p: Person, confirmed: Record<string, string> = {}, now = DEMO_NOW): { state: Freshness; days: number | null; on: string | null; words: string } {
  const on = lastConfirmedOf(p, confirmed); if (!on) return { state: 'unknown', days: null, on: null, words: 'Never confirmed' };
  const days = Math.max(0, Math.round((now - Date.parse(`${on}T00:00:00Z`)) / DAY)); const state: Freshness = days <= FRESH_DAYS ? 'confirmed' : 'stale';
  return { state, days, on, words: state === 'confirmed' ? `Confirmed ${on}` : `Last confirmed ${on}, more than ${FRESH_DAYS} days before the records’ date` };
}

// ------------------------------------------------------------------------------------------------------------ what a person looks after (computed)
export interface Responsibility { buildings: Building[]; rooms: number; devices: number; summary: string }
export function responsibleFor(p: Person): Responsibility {
  const bs = p.buildings.map((k) => buildingByKey(k)!).filter(Boolean); const rooms = p.buildings.flatMap((k) => roomsIn(k));
  const devices = rooms.reduce((n, o) => n + (roomRecord(o.id)?.positions.filter((x) => !x.furniture).length || 0), 0);
  const where = bs.map((b) => b.name).join(', '); const n = `${rooms.length} room${rooms.length === 1 ? '' : 's'}`;
  const what: Record<string, string> = {
    service: `Faults and repairs in ${n} and their ${devices} devices`, installer: `Installation and replacement work in ${n}`, svcmgr: `Triage and dispatch for ${n}`,
    syseng: `Design standards and engineering decisions for ${n}`, cxeng: `Commissioning tests and evidence for ${n}`, ops: `Day-to-day operation of ${n}`,
  };
  const summary = p.kind === 'role' ? `${what[p.role || ''] || `Work in ${n}`} · ${where}` : `${p.kind === 'backup' ? 'Stands in for the site champion of' : 'Knows the rooms of'} ${where}: ${n} on ${floorsOf(p.home).length} floor${floorsOf(p.home).length === 1 ? '' : 's'}`;
  return { buildings: bs, rooms: rooms.length, devices, summary };
}
/** The floors of a building that hold rooms, with the rooms on each, busiest first (ties: lower floor first). */
export function floorsOf(buildingKey: string): Array<{ floor: number; rooms: RoomOutline[] }> {
  const m = new Map<number, RoomOutline[]>(); for (const o of roomsIn(buildingKey)) m.set(o.floor, [...(m.get(o.floor) || []), o]);
  return [...m.entries()].map(([floor, rooms]) => ({ floor, rooms })).sort((a, b) => b.rooms.length - a.rooms.length || a.floor - b.floor);
}
/** Where a champion is based: the floor with the most rooms; the backup, the next one (the same floor when the building has one). */
export function baseFloor(p: Person): number | null { const f = floorsOf(p.home); if (!f.length) return null; return (p.kind === 'backup' ? f[1] || f[0] : f[0])!.floor; }

// ------------------------------------------------------------------------------------------------------------ site champions: a first-class entity
type Persona = { label: string; authority: string[]; base?: string; scope?: string; home?: string };
const P = PERSONAS as unknown as Record<string, Persona>;
/** The Site Champion persona of the enterprise catalogue: its three permissions and its scope are read from there. */
export const CHAMPION_PERSONA: Persona = P[CHAMPION_ROLE] || { label: 'Site Champion', authority: [] };
/** What each of the persona's authorities means, in plain words (the keys are the catalogue's; a key with no words here is shown as its key). */
const AUTHORITY_WORDS: Record<string, string> = {
  'location.verify': 'Verify where a room or a piece of equipment is', 'access.coordinate': 'Coordinate access to a room for a technician or a visitor', 'occupancy.confirm': 'Confirm whether a room is in use',
};
/** Capabilities a Site Champion does not get from the title: engineering, administration and commissioning sign-off. Each is checked against the persona, never assumed. */
export const PRIVILEGED: ReadonlyArray<[authority: string, words: string]> = [
  ['room.design', 'Change a room’s design'], ['design.release', 'Release a design'], ['room.classify.approve', 'Approve a room’s classification'],
  ['test.verify', 'Verify a commissioning test'], ['tests.verify.all', 'Verify commissioning tests for a whole room'], ['customer.accept', 'Accept a room at commissioning sign-off'], ['baseline.approve', 'Approve a commissioning baseline'],
  ['service.triage', 'Triage or dispatch service jobs'], ['license.grant', 'Grant licences'], ['profile.publish', 'Publish directory profiles'], ['standard.change', 'Change a standard'],
];
export const championMay = (): string[] => CHAMPION_PERSONA.authority.map((a) => AUTHORITY_WORDS[a] || a);
export const championMayNot = (): string[] => PRIVILEGED.filter(([a]) => !CHAMPION_PERSONA.authority.includes(a)).map(([, w]) => w);

export type Familiarity = 'worked' | 'floor' | 'building';
export interface Knows { room: RoomOutline; level: Familiarity; why: string; count: number }
/**
 * How well a champion knows a room, from records only: jobs in that room whose site access the site champion confirmed and reports
 * the site champion raised (the service workspace), then whether the room is on the floor they are based on, then their building.
 * The workspace does not name which champion confirmed access, so a job counts for the champion of the room's building.
 */
export function familiarity(p: Person, room: RoomOutline, w: Workspace | null): Knows | null {
  if (!p.buildings.includes(room.building)) return null;
  const jobs = w ? w.workOrders.filter((x) => x.roomId === room.id && /site champion/i.test(x.access?.confirmedBy || '')).length : 0;
  const intake = w ? Object.entries((w as Workspace & { sh?: { intake?: Record<string, { entry: string }> } }).sh?.intake || {}).filter(([id, x]) => /site champion/i.test(x.entry) && w.incidents.find((i) => i.id === id)?.roomId === room.id).length : 0;
  const n = p.kind === 'champion' ? jobs + intake : 0; const base = baseFloor(p);
  if (n) return { room, level: 'worked', count: n, why: `${jobs ? `confirmed access for ${jobs} job${jobs === 1 ? '' : 's'} in this room` : ''}${jobs && intake ? ' and ' : ''}${intake ? `raised ${intake} report${intake === 1 ? '' : 's'} from it` : ''}` };
  if (base === room.floor) return { room, level: 'floor', count: 0, why: `based on floor ${room.floor}, where this room is` };
  return { room, level: 'building', count: 0, why: `looks after the whole building; based on floor ${base ?? '—'}` };
}
const LEVEL_ORDER: Record<Familiarity, number> = { worked: 0, floor: 1, building: 2 };
export const roomsKnown = (p: Person, w: Workspace | null): Knows[] => p.buildings.flatMap((k) => roomsIn(k)).map((o) => familiarity(p, o, w)!).filter(Boolean).sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || b.count - a.count || a.room.floor - b.room.floor || a.room.id.localeCompare(b.room.id));

export interface EscalationStep { order: number; role: RoleKey; title: string; when: string; person: Person | null }
/** Who a champion escalates to, in order; each step is a role of the policy and the named holder for the champion's building. */
const ESCALATION: ReadonlyArray<[RoleKey, string]> = [
  ['service', 'Something in a room is not working: the technician who covers the building'],
  ['svcmgr', 'It is urgent, or nobody has picked it up: the manager who triages and dispatches'],
  ['syseng', 'It is about how a room is designed or what standard it follows: the engineer who decides'],
];
export function escalationOf(p: Person): EscalationStep[] {
  return ESCALATION.filter(([r]) => operationalRoles().includes(r)).map(([role, when], i) => ({ order: i + 1, role, title: ROLES[role].label, when, person: holdersOf(role, p.home)[0] || null }));
}
/** What the records say about a champion's building; a real champion would add what the records do not know (store.ts › addNote). */
export function localKnowledge(p: Person): string[] {
  const b = buildingByKey(p.home); if (!b) return []; const rooms = roomsIn(b.key); const floors = floorsOf(b.key); const out: string[] = [];
  out.push(`${b.name} opened in ${b.opened} and is used for ${b.purpose.charAt(0).toLowerCase()}${b.purpose.slice(1)}.`);
  out.push(`${rooms.length} room${rooms.length === 1 ? '' : 's'} on record on ${floors.length} of its ${b.floors} floor${b.floors === 1 ? '' : 's'}${floors[0] ? `; floor ${floors[0].floor} has the most (${floors[0].rooms.length})` : ''}.`);
  const big = [...rooms].sort((a, c) => c.capacity - a.capacity)[0]; if (big) out.push(`The largest room is ${shortName(big)} — ${big.name} (${big.capacity} seats).`);
  const div = rooms.filter((o) => o.divisible); if (div.length) out.push(`${div.map((o) => shortName(o)).join(', ')} ${div.length === 1 ? 'is' : 'are'} divisible: check how the partitions are set before a meeting.`);
  const non = rooms.filter((o) => o.nonOperational); if (non.length) out.push(`${non.map((o) => shortName(o)).join(', ')} ${non.length === 1 ? 'is' : 'are'} a demonstration of an operations room, not a working one.`);
  return out;
}
/** A champion's first weeks, as places in the demonstration (offered on the profile only where the reader may open them). NOT TRACKED: completion is not recorded. */
export const ONBOARDING: ReadonlyArray<{ label: string; href: (p: Person) => string; why: string }> = [
  { label: 'Walk every room of the building', href: (p) => `#/lite/b/${p.home}`, why: 'Know each room by sight before anyone asks about it' },
  { label: 'Read a door label and open the room from it', href: (p) => `#/here/${roomsIn(p.home)[0]?.id || ''}`, why: 'It is how people in a room will find help' },
  { label: 'Report a problem the way an employee would', href: () => '#/servicehands/new', why: 'So you can tell people exactly what to expect' },
  { label: 'Learn the basics of how the rooms work', href: () => '#/learn', why: 'Training for the people who look after rooms' },
];

// ------------------------------------------------------------------------------------------------------------ availability and "who to contact"
export type AvailState = 'available' | 'busy' | 'off-shift' | 'off-hours';
export interface Availability { state: AvailState; available: boolean; words: string; local: string }
/** Whether a person can be reached at an instant: inside their hours or shift and not in a busy block. `busy` is whatever the calendar adapter answered. */
export function availabilityAt(p: Person, at: number, busy: Busy[] = []): Availability {
  const local = `${fmtTime(p.tz, at)} in ${zoneCity(p.tz)} (${utcOffset(p.tz, at)})`;
  const work = workingIn(p, at - DAY, at + 8 * DAY); const now = work.find((w) => w.from <= at && at < w.to);
  if (!now) { const next = work.find((w) => w.from > at); const h = bindingHours(p); return { state: p.shift ? 'off-shift' : 'off-hours', available: false, local, words: `${p.shift ? `Off shift (${p.shift.name.toLowerCase()} ${h.start}–${h.end})` : `Outside working hours (${h.start}–${h.end})`}; it is ${local}${next ? `. Back ${fmtDay(p.tz, next.from)} at ${fmtTime(p.tz, next.from)}` : ''}` }; }
  const b = busy.find((x) => overlaps(x, { from: at, to: at + 1 }));
  if (b) return { state: 'busy', available: false, local, words: `Busy until ${fmtTime(p.tz, b.to)} their time; it is ${local}` };
  return { state: 'available', available: true, local, words: `Working now, until ${fmtTime(p.tz, now.to)} their time; it is ${local}` };
}

export type EntityKind = 'person' | 'room' | 'device' | 'building' | 'issue';
export const ENTITY_KINDS: readonly EntityKind[] = ['person', 'room', 'device', 'building', 'issue'];
export interface Subject { kind: EntityKind; id: string; label: string; roomId: string | null; buildingKey: string | null; href: string | null }
/** The thing a contact is about, resolved from the records; null when no record has that id. A device id is "<room>/<position code>". */
export function subjectOf(kind: EntityKind, id: string, w: Workspace | null): Subject | null {
  if (kind === 'room') { const o = roomById(id); return o ? { kind, id, label: `${shortName(o)} — ${o.name}`, roomId: o.id, buildingKey: o.building, href: roomHref(o) } : null; }
  if (kind === 'building') { const b = buildingByKey(id); return b ? { kind, id, label: b.name, roomId: null, buildingKey: b.key, href: `#/campus/${b.key}` } : null; }
  if (kind === 'device') { const [roomId, code] = id.split('/'); const o = roomById(roomId || ''); const pos = o && roomRecord(o.id)?.positions.find((x) => x.code === code && !x.furniture); return o && pos ? { kind, id, label: `${pos.label} in ${shortName(o)}`, roomId: o.id, buildingKey: o.building, href: `${roomHref(o)}?device=${pos.code}` } : null; }
  if (kind === 'issue') { const i = w?.incidents.find((x) => x.id === id); return i ? { kind, id, label: `${i.id}: ${i.title}`, roomId: i.roomId, buildingKey: i.buildingKey, href: `#/servicehands?id=${i.id}` } : null; }
  const p = personById(id); return p ? { kind, id, label: p.name, roomId: null, buildingKey: p.home, href: `#/people/${p.id}` } : null;
}
export type Relation = 'owner' | 'champion' | 'backup' | 'technician' | 'manager';
export interface Contact { person: Person; relation: Relation; reason: string; availability: Availability; /** set when this contact is listed ahead of the one it stands in for */ promoted: string | null }
export const RELATION_WORD: Record<Relation, string> = { owner: 'Owner', champion: 'Site champion', backup: 'Backup', technician: 'Technician', manager: 'Service manager' };
/**
 * Who to contact about a room, a device, a building or an issue, in order, each with the reason. For a room: who knows it (the site
 * champion) first, then the technician role assigned to it, then the service manager, where a problem is escalated. For a device or
 * an issue the owner comes first: the technician assigned to the job, or the one who covers the building. A backup is listed ahead
 * of the champion whenever the champion is not at work at `at`, and when the champion is busy and the backup is not; the entry says why.
 */
export function contactsFor(s: Subject, at: number, w: Workspace | null, busyOf: (p: Person) => Busy[] = () => []): Contact[] {
  const b = s.buildingKey; if (!b || s.kind === 'person') return [];
  const out: Contact[] = []; const room = s.roomId ? roomById(s.roomId) : null; const B = buildingByKey(b); const bName = B?.name || b;
  const push = (person: Person | null, relation: Relation, reason: string) => { if (person && !out.some((c) => c.person.id === person.id)) out.push({ person, relation, reason, availability: availabilityAt(person, at, busyOf(person)), promoted: null }); };
  const champ = championOf(b); const back = backupOf(b);
  const champReason = champ ? `Site champion for ${bName}${room ? `; ${familiarity(champ, room, w)?.why || ''}` : ''}` : '';
  const techs = holdersOf('service' as RoleKey, b);
  const onShift = techs.find((t) => availabilityAt(t, at, busyOf(t)).available) || techs[0] || null;
  const job = s.kind === 'issue' ? w?.incidents.find((i) => i.id === s.id) : room ? w?.incidents.find((i) => i.roomId === room.id && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(i.state) && w.workOrders.find((x) => x.id === i.workOrderId)?.techId) : undefined;
  const wo = job?.workOrderId ? w?.workOrders.find((x) => x.id === job.workOrderId) : undefined; const assigned = wo?.techId ? personById(`p-${wo.techId}`) : null;
  const techReason = (t: Person) => (assigned && t.id === assigned.id ? `Assigned to ${wo!.id}${s.kind === 'issue' ? '' : ' in this room'}` : `${t.title} for ${bName}${t.shift ? `, ${t.shift.name.toLowerCase()}` : ''}${techs.length > 1 && onShift && t.id === onShift.id && onShift.id !== techs[0]!.id ? '; the first technician for the building is not on shift' : ''}`);
  const tech = assigned || onShift; const mgr = holdersOf('svcmgr' as RoleKey, b)[0] || null;
  if (s.kind === 'room') { push(champ, 'champion', champReason); push(back, 'backup', `Backup site champion for ${bName}`); if (tech) push(tech, 'technician', techReason(tech)); push(mgr, 'manager', `Service Manager for ${bName}: where a problem in any room is triaged and escalated`); }
  else if (s.kind === 'building') { push(champ, 'champion', champReason); push(back, 'backup', `Backup site champion for ${bName}`); push(mgr, 'manager', `Triages and dispatches the jobs of ${bName}`); }
  else if (s.kind === 'device') { if (tech) push(tech, 'owner', `${techReason(tech)}: equipment faults are the technician’s`); push(champ, 'champion', champReason); push(back, 'backup', `Backup site champion for ${bName}`); }
  else { if (assigned) push(assigned, 'owner', techReason(assigned)); else push(mgr, 'owner', `${job?.id || s.id} has no technician yet: the service manager triages and assigns it`); push(champ, 'champion', champReason); push(back, 'backup', `Backup site champion for ${bName}`); if (assigned) push(mgr, 'manager', `Triages and dispatches the jobs of ${bName}`); }
  // a backup moves ahead of the person it stands in for when that person cannot be reached now, and says why
  const ci = out.findIndex((c) => c.relation === 'champion'); const bi = out.findIndex((c) => c.relation === 'backup');
  if (ci >= 0 && bi > ci && !out[ci]!.availability.available && (out[bi]!.availability.available || out[ci]!.availability.state !== 'busy')) {
    const c = out[ci]!; const k = out.splice(bi, 1)[0]!; k.promoted = `Shown before ${c.person.name} because ${c.person.name.split(' ')[0]} is ${c.availability.state === 'busy' ? 'busy' : c.availability.state === 'off-shift' ? 'off shift' : 'outside working hours'} right now`; out.splice(ci, 0, k);
  }
  return out;
}
/** "Who knows this room?": the people of contactsFor for the room, the champion (or the backup standing in) first, then the technician role. */
export const whoKnows = (roomId: string, at: number, w: Workspace | null, busyOf?: (p: Person) => Busy[]): Contact[] => { const s = subjectOf('room', roomId, w); return s ? contactsFor(s, at, w, busyOf) : []; };

// ------------------------------------------------------------------------------------------------------------ finding a person
const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').toLowerCase().replace(/[^a-z0-9.@ -]+/g, ' ').replace(/\s+/g, ' ').trim();
/** People matching what was typed: a name, a role, a building, an alias. Every word must match something of the person. */
export function findPeople(text: string, limit = 12): Person[] {
  const q = norm(text); if (q.length < 2) return [];
  const tokens = q.split(' ').filter(Boolean).slice(0, 6); const scored: Array<[number, Person]> = [];
  for (const p of people()) {
    const name = norm(p.name); const hay = norm([p.name, p.title, p.org || '', ...p.aliases, ...p.buildings, ...p.buildings.map((k) => buildingByKey(k)?.name || ''), p.group, zoneCity(p.tz), ...p.languages].join(' '));
    let score = 0; let all = true;
    for (const t of tokens) { if (name.split(' ').some((x) => x.startsWith(t))) score += 6; else if (hay.includes(t)) score += 2; else { all = false; break; } }
    if (all && score) scored.push([score + (p.kind === 'champion' ? 1 : 0), p]);
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name)).slice(0, limit).map((x) => x[1]);
}
/** The room a sentence names, by its number ("4.218", with a building's name when two share it), its id, or one of its aliases. */
export function roomInText(text: string): RoomOutline | null {
  const t = text.toLowerCase(); const id = /\br-[a-z]{3}-\d+-\d+\b/.exec(t); if (id) return roomById(id[0].toUpperCase()) || null;
  const num = /(\d)\.(\d{3})/.exec(t);
  if (num) { const hits = CAMPUS_ROOMS.filter((r) => r.number === `${num[1]}.${num[2]}`); const b = ALL_BUILDINGS.find((x) => t.includes(x.short.toLowerCase())); return hits.find((r) => !b || r.building === b.key) || hits[0] || null; }
  return CAMPUS_ROOMS.find((r) => r.aliases.some((a) => a.length > 4 && t.includes(a.toLowerCase()))) || null;
}
