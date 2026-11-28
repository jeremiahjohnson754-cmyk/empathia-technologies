/**
 * "The records behind a number" (V2.5.3 #/set/<key>): every set is a rule over the Core records, stated in words where it is shown, and
 * the authority of each family is V2.5.3's own (12-authz.js azArea for #/set: dev → set.devices, iss → set.issues, as → assurance.*, …).
 */
import type { Authority } from '../registry.types.js';
import { type Core, type Rec } from './core.js';
import { needsAttention } from '../campus/metrics.js';
import { TARGETS_TEXT } from '../service/targets.js';
import { installedDevices, firmwarePosture, standardOf, classLabelOf, STANDARDS_BASIS, type Posture } from '../standards/devices.js';
import { readRegister } from '../campus/registerStore.js';

export interface SetDef { key: string; title: string; how: string; items: (c: Core) => Rec[] }
export interface Family { key: string; label: string; blurb: string; sets: SetDef[] }
const room = (c: Core, pred: (id: string) => boolean) => c.byType.Room.filter((r) => pred(r.id));
const rec = (c: Core, id: string) => c.rooms.find((r) => r.outline.id === id)!;
// the device standards and the firmware posture (standards/devices.ts, PRO-EN-01 and PRO-AS-03): the Device records of the units counted
const units = (c: Core, ids: Set<string>) => c.byType.Device.filter((d) => ids.has(d.id));
const inPosture = (c: Core, p: Posture) => { const x = firmwarePosture(installedDevices(c.rooms), (room) => readRegister(room).entries); return units(c, new Set(x[p].map((d) => d.id))); };
const POSTURE_HOW = `against its class standard's approved firmware baseline; the installed version is the one this browser's device register records, else the room's commissioning record (${STANDARDS_BASIS})`;
/** one set per device standard, `std:<class>`: the units the standard covers (named by key, not listed among the family's sets) */
const standardSet = (key: string): SetDef | undefined => { const cat = key.slice(4); const s = standardOf(cat); if (!s) return undefined;
  return { key, title: `Units covered by ${s.id}`, how: `Units in service whose class is ${classLabelOf(cat).toLowerCase()}, covered by the standard ${s.id} (${STANDARDS_BASIS}).`, items: (c) => units(c, new Set(installedDevices(c.rooms).filter((d) => d.cat === cat).map((d) => d.id))) }; };
export const FAMILIES: Family[] = [
  { key: 'dev', label: 'Devices', blurb: 'Devices behind a number', sets: [
    { key: 'dev:all', title: 'Every device position', how: 'Every hardware position of every room design; furniture is left out.', items: (c) => c.byType.Device.filter((d) => d.state !== 'End') },
    { key: 'dev:support', title: 'Devices covered by a support agreement', how: 'In service in a building and layer an active support agreement covers (stage rule, inferred).', items: (c) => c.byType.Device.filter((d) => d.state === 'Support') },
    { key: 'dev:uncovered', title: 'Devices in service with no agreement', how: 'In service, but no active agreement covers their building and layer: who would fix it is not on record.', items: (c) => c.byType.Device.filter((d) => d.state === 'In service') },
    { key: 'dev:planned', title: 'Devices not yet installed', how: 'Positions in a design whose room has no installation for them yet.', items: (c) => c.byType.Device.filter((d) => d.state === 'Planned') },
    { key: 'dev:removed', title: 'Units removed from service', how: 'Installations with a removal date and the reason recorded.', items: (c) => c.byType.Device.filter((d) => d.state === 'End') },
  ] },
  { key: 'fw', label: 'Firmware and standards', blurb: 'Units behind a standards or firmware figure', sets: [
    { key: 'fw:on', title: 'Units on their firmware baseline', how: `Units in service whose installed version is the approved baseline, ${POSTURE_HOW}.`, items: (c) => inPosture(c, 'on') },
    { key: 'fw:behind', title: 'Units behind their firmware baseline', how: `Units in service on a version older than the approved baseline, ${POSTURE_HOW}.`, items: (c) => inPosture(c, 'behind') },
    { key: 'fw:unvalidated', title: 'Units whose firmware is not validated', how: `Units in service whose version no approved baseline validates: the baseline is only proposed, no version is on record, or the version is newer than the baseline or cannot be compared with it; ${POSTURE_HOW}. Never counted as on baseline.`, items: (c) => inPosture(c, 'unvalidated') },
    { key: 'std:none', title: 'Units no standard covers', how: 'Units in service whose class has no device standard: flagged, not dropped (the projector, a legacy class; facilities and security classes follow other teams\' standards).', items: (c) => inPosture(c, 'nostandard') },
  ] },
  { key: 'room', label: 'Rooms', blurb: 'Rooms behind a number', sets: [
    { key: 'room:all', title: 'Every room', how: 'The thirty rooms of the campus records.', items: (c) => c.byType.Room },
    { key: 'room:issues', title: 'Rooms with an open issue', how: 'At least one open issue: on the record and not resolved, or a live service request that is open (one per id).', items: (c) => room(c, (id) => c.openIssues(rec(c, id)).length > 0) },
    { key: 'room:monitor', title: 'Rooms needing attention', how: 'Mission Control’s rooms needing attention: rooms at risk, rooms with any open issue (on the record or a live service request) and rooms scoring below 88 by the campus health rule.', items: (c) => room(c, (id) => { const r = rec(c, id); return needsAttention(c.health(r), c.openIssues(r)); }) },
    { key: 'room:commissioning', title: 'Rooms in commissioning', how: 'Lifecycle COMMISSIONING or INSTALLED_UNVERIFIED: installed, not yet accepted.', items: (c) => c.byType.Room.filter((r) => r.state === 'COMMISSIONING' || r.state === 'INSTALLED_UNVERIFIED') },
  ] },
  { key: 'iss', label: 'Issues', blurb: 'Issues behind a number', sets: [
    { key: 'iss:open', title: 'Open issues', how: 'Every issue not resolved or canceled: room records and the ServiceHands workspace of this browser.', items: (c) => c.byType.Issue.filter((i) => i.state !== 'RESOLVED' && i.state !== 'CANCELLED') },
    { key: 'iss:high', title: 'Open high-severity issues', how: 'Open, and High or Mission critical.', items: (c) => c.byType.Issue.filter((i) => i.state !== 'RESOLVED' && i.state !== 'CANCELLED' && i.tone === 'bad') },
    // the issues, not the Request records: every role that may open the issues family may see Issue records (the review of af85e226)
    { key: 'iss:late', title: 'Open issues past their target', how: `Service requests in the ServiceHands workspace of this browser that are open and were not restored within their severity's restore target (${TARGETS_TEXT}, business days counted as 24 h), or were restored after it: the dispatch board's and Service analytics' rule.`, items: (c) => { const late = new Set(c.lateIssues(Date.now())); return c.byType.Issue.filter((i) => late.has(i.id)); } },
    { key: 'iss:resolved', title: 'Resolved issues', how: 'Issues whose state is RESOLVED.', items: (c) => c.byType.Issue.filter((i) => i.state === 'RESOLVED') },
  ] },
  { key: 'doc', label: 'Documents', blurb: 'Documents behind a number', sets: [
    { key: 'doc:all', title: 'Every document on record', how: 'Design summaries, commissioning reports, as-built drawings and room guides the room records hold.', items: (c) => c.byType.Document },
    { key: 'doc:asbuilt', title: 'As-built drawings', how: 'Rooms with installations past design approval.', items: (c) => c.byType.Document.filter((d) => d.state === 'As-built drawing') },
  ] },
  { key: 'chg', label: 'Changes', blurb: 'Changes behind a number', sets: [
    { key: 'chg:all', title: 'Every recorded change', how: 'Every lifecycle event of every room, newest first.', items: (c) => [...c.byType.LifecycleEvent].sort((a, b) => Date.parse(b.at || '') - Date.parse(a.at || '')) },
    { key: 'chg:denied', title: 'Refused steps', how: 'Lifecycle events the engine refused (outcome DENIED), with why.', items: (c) => c.byType.LifecycleEvent.filter((e) => e.tone === 'warn') },
  ] },
  { key: 'as', label: 'Assurance', blurb: 'Assurance results behind a number', sets: [
    { key: 'as:ready', title: 'Rooms ready for use', how: 'Lifecycle ACCEPTED or OPERATIONAL.', items: (c) => c.byType.Room.filter((r) => r.state === 'ACCEPTED' || r.state === 'OPERATIONAL') },
    { key: 'as:worst', title: 'The ten rooms with the lowest health', how: 'The campus health rule, lowest first; a room the record cannot score is left out.', items: (c) => c.byType.Room.map((r) => ({ r, s: c.health(rec(c, r.id)).score })).filter((x): x is { r: Rec; s: number } => x.s != null).sort((a, b) => a.s - b.s || a.r.id.localeCompare(b.r.id)).slice(0, 10).map((x) => x.r) },
    { key: 'as:baselines', title: 'Rooms with a commissioning baseline', how: 'At least one baseline version on record.', items: (c) => room(c, (id) => rec(c, id).baselines.length > 0) },
  ] },
];
export const ALL_SETS = FAMILIES.flatMap((f) => f.sets.map((s) => ({ ...s, family: f })));
export const setOf = (key: string) => ALL_SETS.find((s) => s.key === key) ?? (key.startsWith('std:') ? (() => { const d = standardSet(key); return d ? { ...d, family: FAMILIES.find((f) => f.key === 'fw')! } : undefined; })() : undefined);
export const familyOf = (key: string) => FAMILIES.find((f) => f.key === (key.split(':')[0] === 'std' ? 'fw' : key.split(':')[0]));
/** V2.5.3 azArea for #/set/<key> (12-authz.js), verbatim in effect */
/** V2.5.3's family names (#/set/devices …) are kept as aliases of the short keys, so every legacy address still opens its family —
 * for the roles V2.5.3 gave that family to (the authority reads the same alias the page does). */
export const LEGACY_FAMILY: Record<string, string> = { devices: 'dev', rooms: 'room', issues: 'iss', docs: 'doc', changes: 'chg' };
export function setAuthority(key: string): Authority {
  const k = key.split('@')[0]!.split(':'); k[0] = LEGACY_FAMILY[k[0]!] ?? k[0]!;
  if (k[0] === 'as') return { area: k[1] === 'ready' ? 'assurance.ready' : k[1] === 'worst' || k[1] === 'remedy' ? 'assurance.portfolio' : k[1] === 'baselines' ? 'assurance.history' : k[1] === 'signals' || k[1] === 'maint' ? 'assurance.signals' : 'assurance.room' };
  const m: Record<string, string> = { pc: 'assurance.change', cm: 'commissioning', dev: 'set.devices', fw: 'set.devices', std: 'set.devices', room: 'set.rooms', iss: 'set.issues', pt: 'set.issues', gov: 'search.quality', conf: 'search.quality', doc: 'set.docs', chg: 'set.changes', mw: 'scouter', sc: 'scouter', pf: 'budget', fin: 'budget', eng: 'intake', sh: 'servicehands', svc: 'service', pj: 'projects', ar: 'search.vault', dec: 'decisions', ppl: 'search.people' };
  return { area: m[k[0]!] || 'none' };
}
