/**
 * Asking for a room or a device (founder, 10 Nov): one portal any person can finish, technical or not. A request is a few plain answers;
 * everything the records already hold is filled in; and before it is sent the person sees what they are asking for: the proposed room
 * drawn by the same design engine that designs every room here, or the room they named with the added equipment marked.
 *
 * Pure: this file reads the records and the engine and returns values. Nothing is ordered, priced or changed by a request. No figure
 * is invented: sizes come from the rooms of the same kind already on record (MODELED), equipment from the engine's room template, and
 * the tests listed are the ones the engine judges applicable to that equipment.
 */
import { analyzeRoom, defaultCatalog, outlineFor, templateDevices, newDevice, proposeConnections } from '@empathia/commissioning-engine';
import type { RoomDesignInput, PlannedDevice } from '@empathia/domain-types';
import { BUILDINGS, REGIONAL_SITES, CAMPUS_ROOMS, ARCHETYPE_NAME, fullName, roomById, type RoomOutline } from '../campus/canon.js';
import { roomRecord, layerOf, LAYERS, type Position, type Layer } from '../campus/design.js';

const C = defaultCatalog;
export type KindId = 'new-room' | 'change-room' | 'add-devices' | 'replace-device' | 'event' | 'evaluate-device' | 'improve-room';
export type Goes = 'desk' | 'servicehands' | 'scouter' | 'optimizer';
export interface Kind { id: KindId; label: string; blurb: string; needs: 'place' | 'room' | 'device' | 'category'; goes: Goes; then: string }
/** What a person can ask for, in their words, and where each request goes. */
export const KINDS: Kind[] = [
  { id: 'new-room', label: 'A new room', blurb: 'A room that does not exist yet.', needs: 'place', goes: 'desk', then: 'The request goes to the decision desk as a project. An engineer reviews the proposed design before anything is approved or bought.' },
  { id: 'add-devices', label: 'More equipment in a room', blurb: 'A second display, a camera, more microphones.', needs: 'room', goes: 'servicehands', then: 'The request goes to ServiceHands as an installation job. The tests that the new equipment makes necessary are added to the room’s commissioning.' },
  { id: 'replace-device', label: 'Replace a device', blurb: 'Something has failed or is worn out.', needs: 'device', goes: 'servicehands', then: 'The request goes to ServiceHands. After the swap, the tests that depend on that device are run again before the room is accepted.' },
  { id: 'change-room', label: 'Change how a room works', blurb: 'A different use, layout or way of meeting.', needs: 'room', goes: 'desk', then: 'The request goes to the decision desk as a project against that room. An engineer writes the brief.' },
  { id: 'event', label: 'An event or temporary setup', blurb: 'Extra equipment for a day, then back to normal.', needs: 'room', goes: 'servicehands', then: 'The request goes to ServiceHands as a setup job with a date, and a second job to put the room back.' },
  { id: 'evaluate-device', label: 'Check a device before buying', blurb: 'Ask whether a kind of device suits the standard.', needs: 'category', goes: 'scouter', then: 'Scouter compares it with what is already in the estate. Nothing is requested until you decide.' },
  { id: 'improve-room', label: 'Make a room work better', blurb: 'Seats that cannot see or hear; a layout that fights the room.', needs: 'room', goes: 'optimizer', then: 'Space Optimizer models the room and proposes options. You can send one as a request from there.' },
];
export const kindOf = (id: string): Kind => KINDS.find((k) => k.id === id) || KINDS[0]!;

/** What a new room is for, in plain words, and the kind of room that means at each size. */
export const USES: Array<{ id: string; label: string; pick: (people: number) => [archetype: string, template: string] }> = [
  { id: 'meet', label: 'Meetings, with some people joining remotely', pick: (n) => (n <= 5 ? ['HUD', 'huddle'] : n <= 12 ? ['COL', 'medium_conf'] : n <= 24 ? ['BRD', 'boardroom'] : ['TWN', 'townhall']) },
  { id: 'lead', label: 'Leadership meetings and presentations', pick: (n) => (n <= 16 ? ['EXE', 'executive'] : n <= 24 ? ['BRD', 'boardroom'] : ['TWN', 'townhall']) },
  { id: 'teach', label: 'Training and teaching', pick: (n) => (n <= 60 ? ['TRN', 'training'] : ['TWN', 'townhall']) },
  { id: 'gather', label: 'Town halls and large gatherings', pick: () => ['TWN', 'townhall'] },
  { id: 'focus', label: 'Focus work and short calls', pick: () => ['FOC', 'private_office'] },
  { id: 'record', label: 'Recording and streaming', pick: () => ['STU', 'studio'] },
];
export const WHEN: Array<[string, string]> = [['month', 'Within a month'], ['quarter', 'Within three months'], ['half', 'Within six months'], ['none', 'No date in mind']];
export const MATTERS: Array<[string, string]> = [['Standard', 'Another room will do meanwhile'], ['High', 'Work is delayed without it'], ['Mission critical', 'The business notices at once']];
export const SITES = [...BUILDINGS, ...REGIONAL_SITES];

export interface Add { cat: string; qty: number }
export interface Draft { kind: KindId; need: string; use: string; people: number; building: string; floor: number; roomId: string; position: string; like: boolean; adds: Add[]; category: string; when: string; matters: string; date: string }
export const blank = (kind: KindId = 'new-room', from: Partial<Draft> = {}): Draft => ({ kind, need: '', use: 'meet', people: 8, building: 'ATL', floor: 1, roomId: '', position: '', like: true, adds: [], category: 'camera', when: 'quarter', matters: 'Standard', date: '', ...from });
/** Equipment a person may ask to add, in everyday words (furniture and building plant are not requested here). */
export const ADDABLE = ['display', 'camera', 'micceil', 'mictable', 'micwireless', 'speaker', 'touch', 'scheduler', 'projector', 'bar', 'ledwall', 'lectern'].filter((c) => C.categories[c]);
export const catName = (cat: string) => String((C.categories[cat] as { label?: string } | undefined)?.label || cat).replace(/\s*\(.*\)/, '');
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2) : 0; };
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The size a room of this kind needs for this many people, from the rooms of the same kind already on record: their median floor area
 * a seat, their median proportions and ceiling. MODELED, and said to be; a surveyor's drawing replaces it.
 */
export function sizeFor(archetype: string, people: number): { w: number; l: number; h: number; basis: string } {
  const same = CAMPUS_ROOMS.filter((r) => r.archetype === archetype && r.capacity > 0); const pool = same.length >= 2 ? same : CAMPUS_ROOMS;
  const perSeat = median(pool.map((r) => (r.dims[0] * r.dims[1]) / r.capacity)); const ratio = median(pool.map((r) => Math.max(r.dims[0], r.dims[1]) / Math.min(r.dims[0], r.dims[1]))); const h = median(pool.map((r) => r.dims[2]));
  const floor = Math.max(people * perSeat, Math.min(...pool.map((r) => r.dims[0] * r.dims[1]))); const w = Math.sqrt(floor / ratio);
  return { w: r1(w), l: r1(w * ratio), h: r1(h), basis: `Size modelled from the ${plural(pool.length, 'room')} ${same.length >= 2 ? `of this kind (${ARCHETYPE_NAME[archetype] || archetype})` : 'on record'}: ${r1(perSeat)} m² a seat. Not surveyed` };
}

export interface Proposal {
  title: string; where: string; archetype: string; archetypeName: string; w: number; l: number; h: number;
  positions: Position[]; /** codes of the positions this request adds or replaces: drawn differently in the preview */ marked: string[];
  equipment: Array<{ cat: string; label: string; layer: Layer; count: number; added: number }>;
  /** total: tests that apply to the room as proposed. added: the ones this request causes to be run (all of them for a new room).
   *  fresh: how many of those are of a kind the room did not have before. */
  tests: { total: number; added: number; fresh: number; byDomain: Array<[domain: string, count: number]>; examples: string[] };
  findings: Array<{ title: string; severity: string }>; engineReads: string; basis: string[];
}
const toPosition = (d: PlannedDevice, provenance: string): Position => ({ code: d.id, cat: d.cat, catLabel: catName(d.cat), label: d.label, layer: layerOf(d.cat), x: d.x, y: d.y, z: Number(d.z) || 0, rot: Number(d.rot) || 0, mount: String(d.mount), furniture: !!d.furniture, asset: null, identity: 'UNKNOWN', device: d.furniture ? 'furniture' : `${catName(d.cat)} · class template · spec to verify`, provenance });
const designOf = (o: { template: string; intent: string; people: number; w: number; l: number; h: number; archetype?: string; roomId?: string }, devices: PlannedDevice[]): RoomDesignInput => {
  const points = outlineFor('rect', o.w, o.l); let cn = 0;
  const d: RoomDesignInput = { template: o.template, intendedUse: o.intent, occupancy: o.people, lifecycle: 'PLANNED', coreRoomId: o.roomId || 'REQUEST', geometry: { shape: 'rect', points, ceiling: o.h, lengthM: o.l, widthM: o.w, provenance: { length: 'MODELED', width: 'MODELED', ceiling: 'MODELED' }, confidence: 'modeled' }, devices, connections: [], results: {},
    classification: { approved: o.archetype ? { archetype: o.archetype, override: false, by: 'syseng', reason: 'archetype from the campus record' } : null } };
  d.connections = proposeConnections(d, () => `CN-${String(++cn).padStart(4, '0')}`, undefined, C); return d;
};
/** Where an added device is first drawn: by what it is, never on top of another. The designer moves it; this is only so it can be seen. */
function place(cat: string, i: number, n: number, w: number, l: number, taken: ReadonlyArray<{ x: number; y: number }> = []): { x: number; y: number } {
  const layer = layerOf(cat); const across = (k: number, of: number) => r1((w * (k + 1)) / (of + 1));
  const first = layer === 'display' || layer === 'video' ? { x: across(i, n), y: layer === 'video' ? 0.55 : 0.3 } : layer === 'audio' ? { x: across(i, n), y: r1(l * (0.35 + 0.3 * (i % 2))) } : { x: r1(w - 0.5), y: r1(l - 0.6 - 0.5 * i) };
  // step sideways (then along) until it is clear of everything already drawn, staying inside the walls
  const clear = (p: { x: number; y: number }) => taken.every((t) => Math.hypot(t.x - p.x, t.y - p.y) >= 0.7);
  for (let k = 0; k < 24; k++) { const dx = Math.ceil(k / 2) * 0.75 * (k % 2 ? 1 : -1); const p = { x: r1(Math.min(w - 0.3, Math.max(0.3, first.x + dx))), y: first.y }; if (clear(p)) return p; }
  for (let k = 1; k < 12; k++) { const p = { x: first.x, y: r1(Math.min(l - 0.3, first.y + 0.75 * k)) }; if (clear(p)) return p; }
  return first;
}
const tally = (positions: Position[], marked: string[]) => { const by = new Map<string, { cat: string; label: string; layer: Layer; count: number; added: number }>(); for (const p of positions) { if (p.furniture) continue; const e = by.get(p.cat) || { cat: p.cat, label: p.catLabel, layer: p.layer, count: 0, added: 0 }; e.count++; if (marked.includes(p.code)) e.added++; by.set(p.cat, e); }
  const order = LAYERS.map((x) => x.key); return [...by.values()].sort((a, b) => order.indexOf(a.layer) - order.indexOf(b.layer) || a.label.localeCompare(b.label)); };
const TOUCH: Record<Layer, RegExp> = { display: /display|video/i, video: /video|camera/i, audio: /audio|acoustic/i, control: /control/i, network: /network/i, power: /power/i, furniture: /^$/ };
/**
 * The tests a request causes to be run. A new room: every applicable test. A change to a room: the tests of a kind the room did not
 * have before, and the tests that depend on the devices added or replaced (their own, the unit's identity, and their discipline's).
 */
const testsOf = (d: RoomDesignInput, before: Set<string> | null, marked: PlannedDevice[] = []) => { const a = analyzeRoom(d, C); const rows = a.applicability.rows.filter((r) => r.applicable);
  const layers = [...new Set(marked.map((m) => layerOf(m.cat)))]; const codes = marked.map((m) => m.id);
  const run = before ? rows.filter((r) => !before.has(r.id) || (marked.length > 0 && (r.id === 'identity_asset' || (r.devices || []).some((c) => codes.includes(c)) || layers.some((l) => TOUCH[l].test(r.domain))))) : rows;
  const by = new Map<string, number>(); for (const r of run) by.set(r.domain, (by.get(r.domain) || 0) + 1);
  return { a, tests: { total: rows.length, added: run.length, fresh: before ? run.filter((r) => !before.has(r.id)).length : rows.length, byDomain: [...by].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])), examples: run.slice(0, 5).map((r) => r.label) } }; };

/** What the request would look like, or null while it does not yet say enough to draw. */
export function propose(d: Draft): Proposal | null {
  const k = kindOf(d.kind);
  if (d.kind === 'new-room') {
    const use = USES.find((u) => u.id === d.use) || USES[0]!; const people = Math.max(1, Math.min(600, Math.round(d.people) || 1)); const [archetype, template] = use.pick(people); const size = sizeFor(archetype, people);
    let seq = 0; const devices = templateDevices(template, outlineFor('rect', size.w, size.l), () => `PA-${String(++seq).padStart(4, '0')}`, C);
    const marked: string[] = []; for (const add of d.adds) for (let i = 0; i < add.qty; i++) { const id = `PA-${String(++seq).padStart(4, '0')}`; devices.push(newDevice(id, add.cat, devices, place(add.cat, i, add.qty, size.w, size.l, devices.filter((x) => !x.furniture)), 'asked for in the request', C)); marked.push(id); }
    const design = designOf({ template, intent: `${use.label}${d.need ? `: ${d.need}` : ''}`, people, ...size }, devices); const { a, tests } = testsOf(design, null);
    const positions = devices.map((x) => toPosition(x, marked.includes(x.id) ? 'asked for in the request' : `engine room template (${template})`)); const site = SITES.find((b) => b.key === d.building) || SITES[0]!;
    return { title: `New ${(ARCHETYPE_NAME[archetype] || archetype).toLowerCase()} for ${people} at ${site.name}`, where: `${site.name}, floor ${d.floor}`, archetype, archetypeName: ARCHETYPE_NAME[archetype] || archetype, ...size, positions, marked, equipment: tally(positions, marked), tests,
      findings: a.checks.slice(0, 4).map((f) => ({ title: f.title, severity: String(f.severity) })), engineReads: a.classification.archetypeName ? `The design engine reads this as ${a.classification.archetypeName} (${a.classification.sizeCategory}, ${a.classification.complexity} complexity).` : '',
      basis: [size.basis, `Equipment from the engine’s ${template.replace(/_/g, ' ')} room template: class templates, no make or model chosen`, 'Tests are the ones the engine judges applicable to this equipment; none has been run'] };
  }
  if (k.needs === 'category') return null;
  const o = roomById(d.roomId); const rec = o ? roomRecord(o.id) : null; if (!o || !rec) return null;
  const [w, l, h] = o.dims; const base = rec.design.devices.filter((x) => !x.removed); const before = new Set(rec.analysis.applicability.rows.filter((r) => r.applicable).map((r) => r.id));
  const devices = base.map((x) => ({ ...x })); const marked: string[] = []; let seq = devices.length;
  if (d.kind === 'add-devices' || d.kind === 'event') for (const add of d.adds) for (let i = 0; i < add.qty; i++) { const id = `NEW-${String(++seq).padStart(3, '0')}`; devices.push(newDevice(id, add.cat, devices, place(add.cat, i, add.qty, w, l, devices.filter((x) => !x.furniture)), d.kind === 'event' ? 'temporary, for the event' : 'asked for in the request', C)); marked.push(id); }
  if (d.kind === 'replace-device' && devices.some((x) => x.id === d.position)) marked.push(d.position);
  const design = designOf({ template: rec.design.template, intent: o.intent, people: o.capacity, w, l, h, archetype: o.archetype, roomId: o.id }, devices); const { a, tests } = testsOf(design, before, devices.filter((x) => marked.includes(x.id)));
  const positions = devices.map((x) => toPosition(x, marked.includes(x.id) ? (d.kind === 'replace-device' ? 'to be replaced' : 'asked for in the request') : 'the room’s record'));
  const hit = d.kind === 'replace-device' ? rec.positions.find((p) => p.code === d.position) : null; const t = tests;
  const what = d.kind === 'replace-device' ? (hit ? `Replace ${hit.label} in ${fullName(o)}` : `Replace a device in ${fullName(o)}`)
    : d.kind === 'add-devices' ? `Add ${d.adds.filter((x) => x.qty > 0).map((x) => plural(x.qty, catName(x.cat).toLowerCase())).join(', ') || 'equipment'} to ${fullName(o)}`
    : d.kind === 'event' ? `Event setup in ${fullName(o)}${d.date ? ` on ${d.date}` : ''}` : `Change ${fullName(o)}`;
  const site = SITES.find((b) => b.key === o.building);
  return { title: what, where: `${site?.name || o.building}, floor ${o.floor}`, archetype: o.archetype, archetypeName: ARCHETYPE_NAME[o.archetype] || o.archetype, w, l, h, positions, marked, equipment: tally(positions, marked), tests: t,
    findings: a.checks.filter((f) => !rec.findings.some((x) => x.check === f.check && x.title === f.title)).slice(0, 4).map((f) => ({ title: f.title, severity: String(f.severity) })), engineReads: '',
    basis: [`The room as its record holds it: ${plural(rec.positions.filter((p) => !p.furniture).length, 'device')}, ${rec.lifecycle.toLowerCase().replace(/_/g, ' ')}`, ...(marked.length && d.kind !== 'replace-device' ? ['Added equipment is drawn where it can be seen; the designer decides where it goes'] : []), d.kind === 'replace-device' ? 'Tests listed are the ones that depend on that device; they are run again after the swap' : 'Tests listed are the ones the added equipment makes applicable; none has been run'] };
}

/** What the records already know about the subject of the request, so nobody is asked for it. */
export function known(d: Draft): Array<[label: string, value: string, source: string]> {
  const o: RoomOutline | undefined = roomById(d.roomId); const rec = o ? roomRecord(o.id) : null; if (!o || !rec) return [];
  const open = rec.issues.filter((i) => i.state !== 'RESOLVED');
  return [['Room', fullName(o), 'campus record'], ['Kind of room', ARCHETYPE_NAME[o.archetype] || o.archetype, 'campus record'], ['Seats', String(o.capacity), 'campus record'], ['Size', `${o.dims[0]} × ${o.dims[1]} m, ceiling ${o.dims[2]} m`, rec.geometryProvenance === 'DECLARED' ? 'design record' : 'modelled'],
    ['Equipment', plural(rec.positions.filter((p) => !p.furniture).length, 'device'), 'room record'], ['State', rec.lifecycle.toLowerCase().replace(/_/g, ' '), 'commissioning record'], ['Open issues', open.length ? open.map((i) => i.title).slice(0, 2).join('; ') : 'none', 'room record']];
}

/** What stops the request being sent, by field, in words a person can act on. Empty when it can go. */
export function problems(d: Draft): Record<string, string> {
  const e: Record<string, string> = {}; const k = kindOf(d.kind);
  if (d.need.trim().length < 6) e.need = 'Say in a sentence what you need (at least 6 characters).'; if (d.need.length > 600) e.need = 'Keep it under 600 characters.';
  if (k.needs === 'place') { if (!SITES.some((b) => b.key === d.building)) e.building = 'Choose the building.'; const b = SITES.find((x) => x.key === d.building); if (b && (d.floor < 1 || d.floor > b.floors || !Number.isInteger(d.floor))) e.floor = `${b.name} has floors 1 to ${b.floors}.`; if (!(d.people >= 1 && d.people <= 600)) e.people = 'Say how many people, from 1 to 600.'; if (!USES.some((u) => u.id === d.use)) e.use = 'Choose what the room is for.'; }
  if (k.needs === 'room' || k.needs === 'device') { if (!roomById(d.roomId)) e.roomId = 'Choose the room.'; }
  if (k.needs === 'device' && roomById(d.roomId) && !roomRecord(d.roomId)!.positions.some((p) => p.code === d.position && !p.furniture)) e.position = 'Choose the device to replace.';
  if ((d.kind === 'add-devices' || d.kind === 'event') && !d.adds.some((a) => a.qty > 0)) e.adds = d.kind === 'event' ? 'Choose the extra equipment the event needs.' : 'Choose what to add.';
  if (d.adds.some((a) => !ADDABLE.includes(a.cat) || a.qty < 0 || a.qty > 12 || !Number.isInteger(a.qty))) e.adds = 'Up to 12 of each kind of equipment.';
  if (d.kind === 'event' && !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) e.date = 'Say the day of the event.';
  if (k.needs === 'category' && !C.categories[d.category]) e.category = 'Choose the kind of device.';
  return e;
}
/** Where a hand-off kind sends the person instead of raising a request. */
export function handoff(d: Draft): string | null {
  if (d.kind === 'evaluate-device') return `#/scouter?category=${encodeURIComponent(d.category)}`;
  if (d.kind === 'improve-room') return roomById(d.roomId) ? `#/optimizer/enterprise/${encodeURIComponent(d.roomId)}` : null;
  return null;
}
/** The request as the records will hold it: a title and a summary anyone can read, built from the answers and the proposal. */
export function summarise(d: Draft, p: Proposal | null): { title: string; summary: string } {
  const k = kindOf(d.kind); const when = WHEN.find((w) => w[0] === d.when)?.[1] || ''; const matters = MATTERS.find((m) => m[0] === d.matters)?.[1] || '';
  const title = (p?.title || k.label).slice(0, 118);
  const bits = [d.need.trim(), p ? `${p.where}.` : '', p && p.equipment.length ? `Equipment: ${p.equipment.map((e) => `${e.count} × ${e.label}${e.added ? ` (${e.added} ${d.kind === 'replace-device' ? 'to replace' : d.kind === 'event' ? 'for the event' : 'new'})` : ''}`).join(', ')}.` : '', p ? `${d.kind === 'new-room' ? 'Tests that apply' : d.kind === 'replace-device' ? 'Tests to run again' : 'Tests to run'}: ${p.tests.added}${p.tests.fresh && d.kind !== 'new-room' ? ` (${p.tests.fresh} new to this room)` : ''}.` : '', when && d.kind !== 'event' ? `Wanted: ${when.toLowerCase()}.` : '', matters ? `If it waits: ${matters.toLowerCase()}.` : ''];
  return { title, summary: bits.filter(Boolean).join(' ').slice(0, 590) };
}
