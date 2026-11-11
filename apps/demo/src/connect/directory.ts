/**
 * The people of the demonstration estate (founder, 11 Nov 2026: "the jumps, shortcuts, workflows and buttons between the people, the
 * process, the technology and communications"; a Site Champion is "the human connection between local workplace technology, employees,
 * support organizations, and institutional knowledge").
 *
 * Every person here is SYNTHETIC and derived from records the demonstration already holds, never typed twice:
 *   - a site champion and a backup for every building of the estate, who know that building's rooms;
 *   - the technicians of the service workspace (the same staff ServiceHands dispatches), with the sites they cover and a shift;
 *   - one holder of each operational role the support path names.
 * Addresses are on the reserved domain `empathia.example`; telephone numbers are in the range reserved for fiction (555-0100 to
 * 555-0199). Time zones are a modelling assumption per campus and are stated as one. Nothing here is a real person or a live directory.
 */
import type { RoleKey } from '../registry.types.js';
import { BUILDINGS, CAMPUS_ROOMS, ESTATE_GROUPS, REGIONAL_SITES, buildingByKey, roomById, seeded, type Building } from '../campus/canon.js';
import type { Workspace } from '../workspace/store.js';

export type PersonKind = 'champion' | 'backup' | 'technician' | 'role';
export interface Hours { /** ISO weekdays, 1 = Monday */ days: readonly number[]; start: string; end: string }
export interface Person {
  id: string; name: string; kind: PersonKind; title: string; roleKey: RoleKey | null;
  /** the building they are based in, and every building they answer for */ site: string; sites: readonly string[];
  tz: string; hours: Hours; /** a shift narrows the working day (technicians) */ shift: (Hours & { name: string }) | null;
  languages: readonly string[]; upn: string; phone: string; prefers: 'teams' | 'email' | 'phone';
  /** the day the contact details were last confirmed (YYYY-MM-DD), or null if never */ confirmedOn: string | null;
  /** who they hand a problem to next, in order (person ids) */ escalatesTo: readonly string[];
  organisation: string | null;
}

/** Modelled, and said to be: one time zone per campus of the fictional estate. */
const TZ_OF_GROUP: Record<string, string> = {
  'Northstar Innovation Campus': 'America/Chicago', 'Science and Learning Park': 'America/New_York', 'Forum and Resilience Quarter': 'Europe/London',
  'Lakeshore Regional Office': 'America/Toronto', 'Ridgeview Operations Site': 'America/Denver', 'Millbrook Distribution Centre': 'America/Chicago',
};
export const tzOfBuilding = (key: string): string => TZ_OF_GROUP[ESTATE_GROUPS.find((g) => g.buildings.includes(key))?.name || ''] || 'America/Chicago';
export const ALL_BUILDINGS: readonly Building[] = [...BUILDINGS, ...REGIONAL_SITES];

const FIRST = ['Amara', 'Bao', 'Chidi', 'Dalia', 'Emre', 'Farah', 'Gustav', 'Hana', 'Idris', 'Jun', 'Kalani', 'Leila', 'Mateo', 'Nadia', 'Oskar', 'Priya', 'Quentin', 'Rosa', 'Sione', 'Tariq', 'Uma', 'Viktor', 'Wen', 'Ximena', 'Yusuf', 'Zofia'];
const LAST = ['Adeyemi', 'Bergstrom', 'Castellanos', 'Dhillon', 'Eriksen', 'Fontaine', 'Greenwood', 'Haddad', 'Ishikawa', 'Jovanovic', 'Kowalczyk', 'Lindqvist', 'Mbeki', 'Novak', 'Oyelaran', 'Petrov', 'Quispe', 'Rahimi', 'Sorensen', 'Tanaka', 'Ueda', 'Valdivia', 'Whitlock', 'Yamada', 'Zielinski'];
const LANGS: Record<string, readonly string[]> = { 'Europe/London': ['English'], 'America/Toronto': ['English', 'French'], 'America/Denver': ['English', 'Spanish'], 'America/Chicago': ['English', 'Spanish'], 'America/New_York': ['English'] };
const ascii = (s: string) => s.normalize('NFD').replace(/[^A-Za-z]/g, '').toLowerCase();
const OFFICE: Hours = { days: [1, 2, 3, 4, 5], start: '08:30', end: '17:00' };
const AS_OF = '2026-11-11';   // the demonstration's reference day for "last confirmed"; freshness is computed against the reader's clock
const daysBefore = (n: number) => new Date(Date.parse(`${AS_OF}T12:00:00Z`) - n * 86400000).toISOString().slice(0, 10);

function make(id: string, seedKey: string, n: number, over: Partial<Person> & Pick<Person, 'kind' | 'title' | 'roleKey' | 'site' | 'sites'>): Person {
  const r = seeded(seedKey); const first = FIRST[Math.floor(r() * FIRST.length)]!; const last = LAST[Math.floor(r() * LAST.length)]!; const tz = tzOfBuilding(over.site);
  const age = Math.floor(r() * 260);   // some contacts are fresh, some stale: the page says which
  return { id, name: `${first} ${last}`, tz, hours: OFFICE, shift: null, languages: LANGS[tz] || ['English'], upn: `${ascii(first)}.${ascii(last)}${n ? n : ''}@empathia.example`, phone: `+1 555 01${String(n % 100).padStart(2, '0')}`,
    prefers: r() < 0.6 ? 'teams' : r() < 0.5 ? 'email' : 'phone', confirmedOn: daysBefore(age), escalatesTo: [], organisation: null, ...over };
}

const ROLE_HOLDERS: Array<[id: string, roleKey: RoleKey, title: string]> = [
  ['p-svcmgr', 'svcmgr', 'Service Manager'], ['p-syseng', 'syseng', 'Systems Engineer'], ['p-ops', 'ops', 'AV Operations Lead'], ['p-cxeng', 'cxeng', 'Commissioning Engineer'], ['p-designer', 'designer', 'Designer'],
];
const SHIFTS: Array<Hours & { name: string }> = [{ name: 'Early', days: [1, 2, 3, 4, 5], start: '06:00', end: '14:00' }, { name: 'Day', days: [1, 2, 3, 4, 5], start: '08:00', end: '16:30' }, { name: 'Late', days: [1, 2, 3, 4, 5], start: '12:00', end: '20:30' }, { name: 'Day', days: [1, 2, 3, 4, 5], start: '09:00', end: '17:30' }];

let cache: { key: string; people: Person[] } | null = null;
/** The directory. Technicians come from the service workspace when one is given (the same people ServiceHands dispatches). */
export function directory(w?: Workspace | null): Person[] {
  const staff = w?.staff || []; const key = staff.map((s) => `${s.id}:${s.sites.join('+')}`).join('|'); if (cache && cache.key === key) return cache.people;
  const people: Person[] = []; let n = 1;
  for (const [id, roleKey, title] of ROLE_HOLDERS) people.push(make(id, `role:${id}`, n++, { kind: 'role', title, roleKey, site: 'ATL', sites: ALL_BUILDINGS.map((b) => b.key) }));
  staff.forEach((s, i) => { const site = s.buildingKey || s.sites[0] || 'ATL'; const clean = s.name.replace(' (synthetic)', ''); const [nm, org] = clean.split(' — ');
    const [first, ...rest] = nm!.split(' '); const upn = `${ascii(first!)}.${ascii(rest.join(''))}@${s.internal ? 'empathia.example' : 'partner.empathia.example'}`;
    people.push({ ...make(s.id, `tech:${s.id}`, n++, { kind: 'technician', title: s.internal ? 'Service Engineer' : 'Service Engineer (partner)', roleKey: 'service', site, sites: s.sites }), name: nm!, upn, shift: SHIFTS[i % SHIFTS.length]!, organisation: org || s.orgName || null, escalatesTo: ['p-svcmgr'] }); });
  for (const b of ALL_BUILDINGS) {
    const champ = make(`sc-${b.key}`, `champion:${b.key}`, n++, { kind: 'champion', title: `Site Champion, ${b.name}`, roleKey: 'sitechamp', site: b.key, sites: [b.key] });
    const backup = make(`sc-${b.key}-b`, `backup:${b.key}`, n++, { kind: 'backup', title: `Backup Site Champion, ${b.name}`, roleKey: 'sitechamp', site: b.key, sites: [b.key], hours: { days: [1, 2, 3, 4, 5], start: '10:00', end: '18:30' } });
    const techs = people.filter((p) => p.kind === 'technician' && p.sites.includes(b.key)).map((p) => p.id);
    champ.escalatesTo = ['p-svcmgr', ...techs, 'p-syseng']; backup.escalatesTo = champ.escalatesTo; people.push(champ, backup);
  }
  // one champion's details were never confirmed: the page must say so rather than present them as good
  const never = people.find((p) => p.id === 'sc-MBK-b'); if (never) never.confirmedOn = null;
  const sm = people.find((p) => p.id === 'p-svcmgr')!; sm.escalatesTo = ['p-ops']; people.find((p) => p.id === 'p-syseng')!.escalatesTo = ['p-ops'];
  cache = { key, people }; return people;
}
export const personById = (id: string, w?: Workspace | null): Person | undefined => directory(w).find((p) => p.id === id);

/** The rooms a person knows or answers for: a champion's building, a technician's sites; estate-wide roles answer for all and list none. */
export function roomsOf(p: Person): string[] { return p.kind === 'role' ? [] : CAMPUS_ROOMS.filter((r) => p.sites.includes(r.building)).map((r) => r.id); }

export type Freshness = 'confirmed' | 'stale' | 'unknown';
/** Contact details confirmed within 180 days are confirmed; older are stale; never confirmed are unknown. `asOf` is YYYY-MM-DD. */
export function freshnessOf(p: Person, asOf: string): { state: Freshness; days: number | null } {
  if (!p.confirmedOn) return { state: 'unknown', days: null };
  const days = Math.round((Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${p.confirmedOn}T00:00:00Z`)) / 86400000);
  return { state: days <= 180 ? 'confirmed' : 'stale', days };
}

// ---- time: always through the platform's own time-zone data, never by adding hours ----
export interface LocalTime { weekday: number; hhmm: string; date: string; label: string }
const fmtCache = new Map<string, Intl.DateTimeFormat>();
const fmt = (tz: string) => { let f = fmtCache.get(tz); if (!f) { f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); fmtCache.set(tz, f); } return f; };
const WD: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
export function localTime(tz: string, at: Date): LocalTime {
  const parts = Object.fromEntries(fmt(tz).formatToParts(at).map((x) => [x.type, x.value])) as Record<string, string>;
  const hhmm = `${parts['hour']}:${parts['minute']}`;
  return { weekday: WD[parts['weekday']!] || 1, hhmm, date: `${parts['year']}-${parts['month']}-${parts['day']}`, label: `${parts['weekday']} ${hhmm}` };
}
const within = (h: Hours, t: LocalTime, endT?: LocalTime) => h.days.includes(t.weekday) && t.hhmm >= h.start && (endT ? endT.hhmm <= h.end && endT.date === t.date : t.hhmm < h.end);
/** Is the person at work at this instant (or for the whole of [at, end])? Their working hours, and their shift when they have one. */
export function isWorking(p: Person, at: Date, end?: Date): boolean {
  const t = localTime(p.tz, at); const e = end ? localTime(p.tz, end) : undefined;
  return within(p.shift ?? p.hours, t, e);
}
/** The hours that apply to a person: the shift when there is one, otherwise the working day. */
export const hoursOf = (p: Person): Hours => p.shift ?? p.hours;
export function availabilityLine(p: Person, at: Date): string {
  const t = localTime(p.tz, at); const h = hoursOf(p); const on = isWorking(p, at);
  return on ? `At work now (${t.label} for them); until ${h.end}${p.shift ? `, ${p.shift.name.toLowerCase()} shift` : ''}` : `Not at work now (${t.label} for them); ${h.start} to ${h.end}, Monday to Friday${p.shift ? `, ${p.shift.name.toLowerCase()} shift` : ''}`;
}

export interface Knower { person: Person; why: string; working: boolean }
/**
 * "Who knows this room?" — in the order to try them: the site's champion, or the backup when the champion is not at work (and it says
 * so); then the technicians who cover the site; then the Service Manager, who is where a problem is escalated. Each with the reason.
 */
export function whoKnows(roomId: string, at: Date, w?: Workspace | null): Knower[] {
  const room = roomById(roomId); if (!room) return []; const b = buildingByKey(room.building); const all = directory(w);
  const champ = all.find((p) => p.id === `sc-${room.building}`); const backup = all.find((p) => p.id === `sc-${room.building}-b`);
  const out: Knower[] = []; const n = CAMPUS_ROOMS.filter((r) => r.building === room.building).length;
  const add = (person: Person | undefined, why: string) => { if (person) out.push({ person, why, working: isWorking(person, at) }); };
  const cw = champ ? isWorking(champ, at) : false;
  if (champ && cw) { add(champ, `Site Champion for ${b?.name || room.building}: knows its ${n} rooms and the people who use them`); add(backup, 'Backup champion for the same site'); }
  else { add(backup, `Backup champion for ${b?.name || room.building}${champ ? `: the champion is not at work now (${localTime(champ.tz, at).label} for them)` : ''}`); add(champ, `Site Champion for ${b?.name || room.building}: knows its ${n} rooms; not at work now`); }
  for (const t of all.filter((p) => p.kind === 'technician' && p.sites.includes(room.building))) add(t, `Service Engineer covering ${b?.short || room.building}${t.organisation ? `, ${t.organisation}` : ''}: assigned the jobs for this site`);
  add(all.find((p) => p.id === 'p-svcmgr'), 'Service Manager: where a problem in any room is triaged and escalated');
  return out;
}
