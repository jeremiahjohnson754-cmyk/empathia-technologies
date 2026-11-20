/**
 * Larkspur Exchange Convention Centre — the canonical estate (v1.8.1 §9, Surpass §22). A fictional multi-hall convention and
 * exhibition campus programmed at the scale of the largest North American centres: thirteen exhibit halls in four hall groups
 * (about 269,000 m², 2.9 million square feet, of exhibit floor), exactly 225 meeting and breakout rooms, three ballrooms, a keynote
 * theatre, and the production, service and back-of-house rooms behind them. The scale benchmark is the publicly stated program of a
 * large real centre (checked 9 November 2026); nothing else is taken from it: the plan, hall names and identity here are original.
 * Every count is DESIGNED for this demonstration, not surveyed, and nothing here is a statement of code compliance.
 * The event in residence is a fictional trade show in the four Meridian halls; its exhibitors are invented and no real organisation,
 * association or show is represented. Booths belong to the event edition, not to the building. Exit routes are not shown: a venue's
 * emergency plan is its own document, and nothing here stands in for it.
 */
import type { Estate, EstateNode, Asset, Route, AssetKind } from './model.js';
const W = 'convention' as const; const S = 'SYNTHETIC' as const;
const nodes: EstateNode[] = []; const assets: Asset[] = [];
const add = (n: Omit<EstateNode, 'world' | 'provenance'>) => { nodes.push({ ...n, world: W, provenance: S }); return n.id; };
interface Kit { kind: AssetKind; label: string; cls: string; qty: number }
const K = (kind: AssetKind, label: string, cls: string, qty = 1): Kit => ({ kind, label, cls, qty });
function room(id: string, name: string, parent: string, type: string, capacity: number, dims: [number, number, number], o: Partial<EstateNode> & { kit?: Kit[]; temp?: boolean } = {}) {
  const { kit, temp, ...rest } = o;
  add({ id, kind: 'room', type, name, parent, access: 'members', capacity, dims, stepFree: true, commissioning: kit && kit.length ? 'ACCEPTED' : 'NOT_APPLICABLE', ...rest });
  (kit || []).forEach((k, i) => assets.push({ id: `${id}-${temp ? 'T' : 'A'}${String(i + 1).padStart(2, '0')}`, world: W, room: id, kind: k.kind, label: temp ? `${k.label} (temporary, this event)` : k.label, cls: k.cls, qty: k.qty, installed: temp ? 2026 : rest.refreshed || 2022, state: rest.commissioning === 'DESIGNED' ? 'PLANNED' : 'IN_SERVICE', provenance: S }));
}
export const EVENT = { id: 'CNV-EVT-2026', name: 'Signal & Space Expo 2026', days: 3, note: 'A fictional regional AV and IT trade show' } as const;
add({ id: 'CNV', kind: 'world', type: 'convention-centre', name: 'Larkspur Exchange Convention Centre', parent: null, access: 'public' });
add({ id: 'CNV-V', kind: 'venue', type: 'venue', name: 'Larkspur Exchange', parent: 'CNV', access: 'public', plan: { x: 0, y: 0, w: 900, h: 470 }, note: 'Four hall groups on the hall level, with a meeting level above each' });
export const ZONES = [['CNV-Z-PUB', 'Arrival and public areas', 'public'], ['CNV-Z-EXPO', 'Expo hall', 'members'], ['CNV-Z-SES', 'Sessions and meetings', 'members'], ['CNV-Z-PRD', 'Production and broadcast', 'staff'], ['CNV-Z-OPS', 'Venue operations', 'staff']] as const;
for (const [id, name, access] of ZONES) add({ id, kind: 'district', type: 'zone', name, parent: 'CNV-V', access });
add({ id: 'CNV-L1', kind: 'level', type: 'level', name: 'Hall level', parent: 'CNV-V', access: 'public' }); add({ id: 'CNV-L2', kind: 'level', type: 'level', name: 'Meeting level', parent: 'CNV-V', access: 'public' });
const G = (z: string) => ZONES.find((x) => x[0] === z)![1];
// ---- arrival ----
room('CNV-REG', 'Registration', 'CNV-L1', 'registration', 400, [40, 18, 8], { access: 'public', group: G('CNV-Z-PUB'), layout: 'Twelve badge desks, self-service kiosks and an accessibility desk', plan: { x: 220, y: 395, w: 330, h: 55 }, kit: [K('signage', 'Wayfinding displays', 'Interactive signage display', 6), K('led', 'Welcome wall', 'Direct-view LED wall'), K('loudspeaker', 'Paging loudspeakers', 'Ceiling loudspeaker', 20)], refreshed: 2023 });
add({ id: 'CNV-CONC', kind: 'space', type: 'concourse', name: 'Main Concourse', parent: 'CNV-L1', spans: ['CNV-ENT', 'CNV-REG', 'CNV-EXPO', 'CNV-HBR', 'CNV-SMT', 'CNV-GDN', 'CNV-KEY'], access: 'public', group: G('CNV-Z-PUB'), stepFree: true, plan: { x: 40, y: 345, w: 840, h: 34 }, note: 'Joins the four hall groups; lifts and escalators to the meeting level at every core' });
room('CNV-FOOD', 'Food court', 'CNV-L1', 'food-service', 260, [30, 16, 5], { access: 'public', group: G('CNV-Z-PUB'), layout: 'Five counters and 260 seats', kit: [K('signage', 'Menu boards', 'Signage display', 5)], refreshed: 2022 });

add({ id: 'CNV-ENT', kind: 'space', type: 'entrance', name: 'Main entrance', parent: 'CNV-L1', access: 'public', group: G('CNV-Z-PUB'), stepFree: true, note: 'Level doors from the forecourt and the drop-off' });
room('CNV-AID', 'First aid', 'CNV-L1', 'first-aid', 8, [7, 5, 3], { access: 'public', group: G('CNV-Z-PUB'), layout: 'Staffed during show hours' });
room('CNV-QUIET', 'Quiet room', 'CNV-L1', 'quiet-room', 10, [6, 5, 3], { access: 'public', group: G('CNV-Z-PUB'), layout: 'Low light, soft seating and no announcements' });
// ---- thirteen exhibit halls in four groups, and the booths of this event ----
const N2 = (n: number) => String(n).padStart(2, '0');
export const HALL_GROUPS = [['CNV-EXPO', 'Meridian Halls', 'ABCD', 'M'], ['CNV-HBR', 'Harbor Halls', 'EFG', 'H'], ['CNV-SMT', 'Summit Halls', 'HIJK', 'S'], ['CNV-GDN', 'Garden Halls', 'LM', 'G']] as const;
export const HALLS: string[] = []; export const HALL_DIMS: [number, number, number] = [230, 90, 12];
const SLOT: Record<string, [number, number]> = { A: [0, 0], B: [1, 0], C: [2, 0], D: [3, 0], E: [0, 1], F: [1, 1], G: [2, 1], H: [0, 2], I: [1, 2], J: [2, 2], K: [3, 2] };
for (const [gid, gname, letters] of HALL_GROUPS) {
  add({ id: gid, kind: 'space', type: 'hall-group', name: gname, parent: 'CNV-L1', access: 'members', group: G('CNV-Z-EXPO'), stepFree: true, note: `${letters.length} exhibit halls that open into one another when their operable walls are raised${gid === 'CNV-EXPO' ? `; in use by ${EVENT.name}` : '; not in use by this event'}` });
  for (const L of letters) { const id = `${gid}-${L}`; HALLS.push(id); const slot = SLOT[L];
    room(id, `Hall ${L}`, gid, 'expo-hall', Math.round(HALL_DIMS[0] * HALL_DIMS[1] / 2), HALL_DIMS, { group: gname, layout: 'A clear-span hall; floor boxes on a nine-metre grid; an operable wall to the next hall. Occupancy is a planning assumption of one person to two square metres', refreshed: gid === 'CNV-EXPO' ? 2024 : gid === 'CNV-GDN' ? 2016 : 2021,
      plan: slot ? { x: 220 + slot[0] * 166, y: 40 + slot[1] * 100, w: 158, h: 92 } : { x: 40, y: L === 'L' ? 150 : 250, w: 170, h: 88 },
      kit: [K('loudspeaker', 'Hall paging system', 'Horn loudspeaker', 32), K('network', 'Floor network', 'Access switch, 48 port', 12), K('signage', 'Hall entrance displays', 'Signage display', 4)] });
    add({ id: `CNV-DOCK-${L}`, kind: 'space', type: 'loading-dock', name: `Hall ${L} loading dock`, parent: 'CNV-L1', spans: [id], access: 'staff', group: G('CNV-Z-OPS'), stepFree: true, capacity: 8, note: 'Eight loading positions opening directly onto the hall floor' });
    for (const n of [1, 2]) room(`CNV-IDF-${L}${n}`, `Hall ${L} network room ${n}`, 'CNV-L1', 'network-room', 2, [5, 4, 3], { access: 'restricted', group: G('CNV-Z-OPS'), kit: [K('network', 'Distribution switches', 'Access switch, 48 port', 3)], refreshed: 2023 });
    for (const n of [1, 2, 3, 4]) room(`CNV-WC-${L}${n}`, `Hall ${L} restrooms ${n}`, 'CNV-L1', 'restrooms', 40, [14, 8, 3], { access: 'public', group: G('CNV-Z-PUB'), layout: 'Includes accessible and all-gender rooms' });
    room(`CNV-STO-${L}`, `Hall ${L} store`, 'CNV-L1', 'storage', 4, [20, 12, 5], { access: 'staff', group: G('CNV-Z-OPS'), layout: 'Venue inventory and exhibitor freight holding' });
  }
}
export const BOOTHS: string[] = [];
/** The eight exhibitors the expo journey names (all invented), at the booths it puts them in. Every other booth is let, but its exhibitor is not part of this demonstration. */
export const EXHIBITORS: Record<string, readonly [string, string]> = { A1: ['Quillfinch Audio', 'Audio'], A2: ['Tamber & Rook Displays', 'Displays'], A3: ['Osmoor Networks', 'Networks'], A4: ['Pelliwick Controls', 'Control'], B1: ['Harrowgate Collaboration', 'Collaboration'], B2: ['Venn & Sable Acoustics', 'Audio'], B3: ['Lumenwake Projection', 'Displays'], B4: ['Corrie Fold Systems', 'Networks'] };
const SIZES = [[3, 3], [3, 6], [6, 6], [6, 9]] as const; const ROWS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; export const BOOTHS_PER_ROW = 12;
for (const L of 'ABCD') ROWS.split('').forEach((row, r) => { for (let n = 1; n <= BOOTHS_PER_ROW; n += 1) {
  const local = `${row}${n}`; const num = L === 'A' ? local : `${L}-${local}`; const id = `CNV-BTH-${num}`; const [w, d] = SIZES[(r * 3 + n) % 4]!; const ex = L === 'A' ? EXHIBITORS[local] : undefined; BOOTHS.push(id);
  add({ id, kind: 'space', type: 'booth', name: `Booth ${L === 'A' ? local : `${L}·${local}`}`, parent: `CNV-EXPO-${L}`, access: 'members', group: ex ? ex[1] : 'Exhibitor not shown', capacity: Math.round((w * d) / 1.4), stepFree: true, note: `${w} × ${d} m, row ${row} of Hall ${L}. ${ex ? `${ex[0]} (an invented exhibitor at ${EVENT.name})` : 'Let for this event; the exhibitor is not part of this demonstration'}` });
} });
// ---- sessions ----
const present = (n: number): Kit[] => [K('projector', 'Projection', n > 150 ? 'Laser projector, 12,000 lumen class' : 'Laser projector, 7,000 lumen class', n > 150 ? 2 : 1), K('microphone', 'Lectern and wireless microphones', 'Gooseneck and wireless set'), K('loudspeaker', 'Room loudspeakers', n > 150 ? 'Column loudspeaker' : 'Ceiling loudspeaker', n > 150 ? 4 : 8), K('processor', 'Audio processor', 'Digital signal processor'), K('control', 'Room control panel', 'Touch panel, 10 inch class'), K('assistive', 'Assistive listening', 'Assistive listening transmitter')];
room('CNV-KEY', 'Keynote Theatre', 'CNV-L1', 'keynote-hall', 1800, [54, 40, 10], { group: G('CNV-Z-SES'), layout: 'Theatre seating for 1,800, a stage with a centre screen and two side screens, a camera riser and thirty wheelchair positions', plan: { x: 40, y: 40, w: 170, h: 100 }, refreshed: 2024,
  kit: [K('led', 'Centre stage screen', 'Direct-view LED wall'), K('projector', 'Side screens', 'Laser projector, 20,000 lumen class', 2), K('loudspeaker', 'Main loudspeaker system', 'Line array loudspeaker', 2), K('loudspeaker', 'Delay loudspeakers', 'Column loudspeaker', 6), K('processor', 'Front-of-house console', 'Digital mixing console'), K('camera', 'Image-magnification cameras', 'Broadcast camera chain', 3), K('lighting', 'Stage lighting', 'LED stage fixture', 60), K('assistive', 'Assistive listening', 'Assistive listening transmitter'), K('intercom', 'Production intercom', 'Intercom matrix')] });
export const BREAKOUTS: string[] = [];
const BRK: [string, number, [number, number, number], string, 'ACCEPTED' | 'COMMISSIONING' | 'DESIGNED', number][] = [
  ['1', 220, [22, 16, 5], 'Theatre, 220', 'ACCEPTED', 2024], ['2', 220, [22, 16, 5], 'Theatre, 220', 'ACCEPTED', 2024], ['3', 140, [17, 13, 4.2], 'Theatre, 140', 'ACCEPTED', 2022], ['4', 140, [17, 13, 4.2], 'Classroom, 80 at tables', 'ACCEPTED', 2022],
  ['5', 96, [14, 11, 4], 'Theatre, 96', 'COMMISSIONING', 2026], ['6', 96, [14, 11, 4], 'Rounds, eight tables of eight', 'ACCEPTED', 2021], ['7', 60, [12, 9, 3.6], 'Theatre, 60', 'ACCEPTED', 2021], ['8', 60, [12, 9, 3.6], 'Hollow square, 32', 'ACCEPTED', 2019],
  ['9', 48, [10, 8.5, 3.4], 'Classroom, 30 at tables', 'DESIGNED', 2026], ['10', 48, [10, 8.5, 3.4], 'Theatre, 48', 'ACCEPTED', 2019],
];
for (const [num, cap, dims, layout, cx, year] of BRK) { const id = `CNV-SR-${num.padStart(2, '0')}`; BREAKOUTS.push(id); room(id, `Session Room ${num}`, 'CNV-L2', 'breakout-room', cap, dims, { group: G('CNV-Z-SES'), layout, commissioning: cx, refreshed: year, kit: present(cap) }); }
/** The other 215 of the centre's 225 meeting and breakout rooms, in four families above the hall groups. Session Rooms 1 to 10 are the first ten of the Meridian family. */
export const MEETING_ROOMS: string[] = [...BREAKOUTS];
const smallKit: Kit[] = [K('display', 'Room display', 'Flat panel, 75 inch class'), K('camera', 'Room camera', 'Fixed wide camera'), K('microphone', 'Table microphone', 'Table array microphone'), K('compute', 'Room computer', 'Conferencing appliance'), K('signage', 'Booking panel', 'Room booking panel')];
const SHAPES: [number, [number, number, number], string][] = [[220, [22, 16, 5], 'Theatre, 220'], [140, [17, 13, 4.2], 'Theatre, 140'], [96, [14, 11, 4], 'Theatre, 96'], [60, [12, 9, 3.6], 'Classroom, 36 at tables'], [48, [10, 8.5, 3.4], 'Theatre, 48'], [32, [9, 7, 3.2], 'Hollow square, 32'], [24, [8, 6, 3], 'One table for 24'], [16, [7.5, 4.6, 2.9], 'Boardroom table for 16'], [12, [6, 4.6, 2.9], 'Boardroom table for 12']];
for (const [, gname, , fam, from, count] of [[...HALL_GROUPS[0], 211, 50], [...HALL_GROUPS[1], 201, 45], [...HALL_GROUPS[2], 201, 70], [...HALL_GROUPS[3], 201, 50]] as const) for (let k = 0; k < count; k += 1) {
  const num = `${fam}${from + k}`; const id = `CNV-MR-${num}`; const [cap, dims, layout] = SHAPES[(k * 4 + fam.charCodeAt(0)) % SHAPES.length]!; MEETING_ROOMS.push(id); const big = cap >= 48;
  room(id, `${gname.split(' ')[0]} ${from + k}`, 'CNV-L2', big ? 'breakout-room' : 'meeting-room', cap, dims, { group: `${gname.split(' ')[0]} meeting level`, layout, refreshed: [2024, 2022, 2021, 2019, 2017][(k + fam.charCodeAt(0)) % 5]!, commissioning: 'ACCEPTED', kit: big ? present(cap) : smallKit });
}
for (const [n, name, cap, dims] of [['1', 'Larkspur Ballroom', 2000, [60, 40, 9]], ['2', 'Meridian Ballroom', 1200, [48, 30, 8]], ['3', 'Garden Ballroom', 800, [38, 26, 7]]] as const)
  room(`CNV-BALL-${n}`, name, 'CNV-L2', 'ballroom', cap, [...dims] as [number, number, number], { group: G('CNV-Z-SES'), layout: `Divisible into three; ${cap} at a reception or ${Math.round(cap * 0.55)} at rounds`, refreshed: 2023, kit: [K('projector', 'Projection', 'Laser projector, 20,000 lumen class', 3), K('loudspeaker', 'Ballroom loudspeakers', 'Ceiling loudspeaker', 48), K('processor', 'Room-combining processor', 'Digital signal processor', 2), K('microphone', 'Wireless microphones', 'Wireless handheld set', 8), K('lighting', 'House and stage lighting', 'LED stage fixture', 40), K('assistive', 'Assistive listening', 'Assistive listening transmitter'), K('control', 'Room control panels', 'Touch panel, 10 inch class', 3)] });
for (let i = 1; i <= 8; i += 1) room(`CNV-EXS-${N2(i)}`, `Executive Suite ${i}`, 'CNV-L2', 'executive-suite', 14, [8, 6, 3], { access: 'restricted', group: G('CNV-Z-SES'), layout: 'A boardroom table for 14 with a private lounge', kit: smallKit, refreshed: 2023 });
room('CNV-VIP', 'VIP Lounge', 'CNV-L2', 'vip-lounge', 40, [14, 9, 3.4], { access: 'restricted', group: G('CNV-Z-SES'), layout: 'Lounge seating and two private meeting pods', kit: [K('display', 'Lounge display', 'Flat panel, 75 inch class')], refreshed: 2023 });
room('CNV-EXM', 'Exhibitor Meeting Suite', 'CNV-L1', 'exhibitor-meeting', 24, [10, 8, 3.2], { group: G('CNV-Z-SES'), layout: 'Three bookable meeting tables for exhibitors', kit: [K('display', 'Suite display', 'Flat panel, 65 inch class')], refreshed: 2022 });
// ---- production and broadcast ----
const prd = (id: string, name: string, type: string, lv: string, cap: number, dims: [number, number, number], kit: Kit[], o: Partial<EstateNode> = {}) => room(id, name, lv, type, cap, dims, { access: 'staff', group: G('CNV-Z-PRD'), kit, refreshed: 2024, ...o });
prd('CNV-SPK', 'Speaker Preparation Room', 'speaker-prep', 'CNV-L1', 12, [8, 6, 3], [K('display', 'Confidence monitor', 'Flat panel, 55 inch class'), K('compute', 'Slide check station', 'Workstation', 2)], { access: 'members', layout: 'Slide check, a timer and a feed of the stage' });
prd('CNV-GRN-1', 'Green Room 1', 'green-room', 'CNV-L1', 8, [6, 5, 3], [K('display', 'Programme monitor', 'Flat panel, 43 inch class')], { access: 'restricted' }); prd('CNV-GRN-2', 'Green Room 2', 'green-room', 'CNV-L1', 6, [5, 4.5, 3], [], { access: 'restricted' });
prd('CNV-PCR', 'Production Control Room', 'production-control', 'CNV-L1', 10, [10, 7, 3.2], [K('router', 'Show switcher', 'Production switcher'), K('router', 'Video router', 'Video routing matrix'), K('compute', 'Playback servers', 'Media server', 2), K('intercom', 'Production intercom', 'Intercom matrix'), K('display', 'Multiviewer', 'Flat panel, 55 inch class', 4)], { layout: 'Runs the Keynote Theatre: screens, cameras, playback and comms' });
prd('CNV-STR', 'Streaming Suite', 'streaming', 'CNV-L1', 6, [7, 5, 3], [K('capture', 'Streaming encoders', 'Capture and streaming encoder', 4), K('compute', 'Captioning workstation', 'Workstation'), K('network', 'Contribution uplink', 'Bonded uplink router', 2)], { layout: 'Encodes the keynote and four breakouts, with live captions' });
prd('CNV-PRS', 'Press Room', 'press-room', 'CNV-L2', 40, [12, 9, 3.2], [K('display', 'Programme monitors', 'Flat panel, 55 inch class', 2), K('router', 'Press audio split', 'Press distribution amplifier')], { access: 'members' });
// temporary equipment of this event, in the rooms it was built into
room('CNV-DEMO', 'Demonstration Stage', 'CNV-EXPO-A', 'demo-stage', 120, [14, 10, 6], { group: G('CNV-Z-EXPO'), layout: 'A raised stage with 120 seats on the hall floor, built for this event', commissioning: 'COMMISSIONING', temp: true, refreshed: 2026,
  kit: [K('led', 'Stage backdrop', 'Direct-view LED wall'), K('loudspeaker', 'Stage loudspeakers', 'Column loudspeaker', 4), K('microphone', 'Presenter microphones', 'Wireless headset set', 3), K('processor', 'Stage console', 'Digital mixing console'), K('camera', 'Stage camera', 'PTZ camera'), K('network', 'Stage network', 'Access switch, 24 port')] });
// ---- venue operations ----
const ops = (id: string, name: string, type: string, cap: number, dims: [number, number, number], o: Partial<EstateNode> & { kit?: Kit[] } = {}) => room(id, name, 'CNV-L1', type, cap, dims, { access: 'staff', group: G('CNV-Z-OPS'), ...o });
ops('CNV-EXS', 'Exhibitor Services Desk', 'exhibitor-support', 16, [10, 6, 3.2], { access: 'members', layout: 'Power, rigging, internet and AV orders for exhibitors' });
ops('CNV-EVO', 'Event Offices', 'office', 30, [18, 10, 3]); ops('CNV-BRK', 'Staff Break Room', 'staff-room', 40, [12, 8, 3]); ops('CNV-STO', 'Equipment Store', 'storage', 4, [22, 12, 5], { layout: 'Venue AV inventory and exhibitor freight holding' });
ops('CNV-TEC', 'Venue Technology Room', 'technical', 4, [10, 7, 3.2], { access: 'restricted', layout: 'Core network and AV distribution; entry by named access only', kit: [K('network', 'Core switches', 'Core switch', 2), K('router', 'AV-over-IP core', 'AV network switch', 2), K('compute', 'Venue servers', 'Rack server', 4)], refreshed: 2023 });
for (const [n, name] of [['2', 'Harbor Registration'], ['3', 'Summit Registration'], ['4', 'Garden Registration']] as const) room(`CNV-REG-${n}`, name, 'CNV-L1', 'registration', 300, [34, 16, 8], { access: 'public', group: G('CNV-Z-PUB'), layout: 'Badge desks, self-service kiosks and an accessibility desk', kit: [K('signage', 'Wayfinding displays', 'Interactive signage display', 4), K('loudspeaker', 'Paging loudspeakers', 'Ceiling loudspeaker', 16)], refreshed: 2022 });
for (const [n, name] of [['2', 'Harbor entrance'], ['3', 'Summit entrance'], ['4', 'Garden entrance']] as const) add({ id: `CNV-ENT-${n}`, kind: 'space', type: 'entrance', name, parent: 'CNV-L1', access: 'public', group: G('CNV-Z-PUB'), stepFree: true, note: 'Level doors from the forecourt and the drop-off' });
for (const [n, name] of [['2', 'Harbor food court'], ['3', 'Summit food court'], ['4', 'Garden café']] as const) room(`CNV-FOOD-${n}`, name, 'CNV-L1', 'food-service', 220, [28, 15, 5], { access: 'public', group: G('CNV-Z-PUB'), layout: 'Four counters and 220 seats', kit: [K('signage', 'Menu boards', 'Signage display', 4)], refreshed: 2022 });
for (let i = 2; i <= 4; i += 1) room(`CNV-AID-${i}`, `First aid ${['', '', 'Harbor', 'Summit', 'Garden'][i]}`, 'CNV-L1', 'first-aid', 8, [7, 5, 3], { access: 'public', group: G('CNV-Z-PUB'), layout: 'Staffed during show hours' });
for (let i = 1; i <= 12; i += 1) room(`CNV-WC-M${N2(i)}`, `Meeting level restrooms ${i}`, 'CNV-L2', 'restrooms', 30, [12, 8, 3], { access: 'public', group: G('CNV-Z-PUB'), layout: 'Includes accessible and all-gender rooms' });
const core = (prefix: string, label: string, type: string, count: number, access: EstateNode['access'], stepFree: boolean, note: string) => { for (let i = 1; i <= count; i += 1) add({ id: `${prefix}${N2(i)}`, kind: 'space', type, name: `${label} ${i}`, parent: 'CNV-V', spans: ['CNV-L1', 'CNV-L2'], access, group: access === 'public' ? G('CNV-Z-PUB') : G('CNV-Z-OPS'), stepFree, note }); };
core('CNV-LIFT-', 'Public lift core', 'lift', 16, 'public', true, 'Two lifts between the hall level and the meeting level');
core('CNV-SLIFT-', 'Service lift', 'lift', 8, 'staff', true, 'Goods and staff');
core('CNV-ESC-', 'Escalator bank', 'escalator', 12, 'public', false, 'Between the concourse and the meeting level; not step-free');
core('CNV-STAIR-', 'Stair core', 'stair', 20, 'public', false, 'Between the hall level and the meeting level');
for (let i = 2; i <= 4; i += 1) ops(`CNV-PCR-${i}`, `Production Control Room ${i}`, 'production-control', 8, [9, 6, 3.2], { group: G('CNV-Z-PRD'), kit: [K('router', 'Show switcher', 'Production switcher'), K('compute', 'Playback servers', 'Media server', 2), K('intercom', 'Production intercom', 'Intercom matrix')], refreshed: 2022 });
for (let i = 3; i <= 6; i += 1) ops(`CNV-GRN-${i}`, `Green Room ${i}`, 'green-room', 6, [5, 4.5, 3], { access: 'restricted', group: G('CNV-Z-PRD') });
for (let i = 2; i <= 6; i += 1) ops(`CNV-BRK-${i}`, `Staff Break Room ${i}`, 'staff-room', 30, [10, 7, 3]);
for (let i = 2; i <= 6; i += 1) ops(`CNV-EVO-${i}`, `Event Office ${i}`, 'office', 12, [9, 6, 3], { access: 'members', layout: 'Let to the organiser of the event in the halls beside it' });
for (const [n, name] of [['1', 'Main Kitchen'], ['2', 'Ballroom Kitchen'], ['3', 'Garden Kitchen']] as const) ops(`CNV-KIT-${n}`, name, 'kitchen', 40, [26, 16, 4]);
ops('CNV-SEC', 'Security Control Room', 'security', 10, [9, 7, 3], { access: 'restricted' }); for (const n of ['1', '2']) ops(`CNV-WKS-${n}`, `Technical Workshop ${n}`, 'workshop', 8, [12, 8, 3.6]);
add({ id: 'CNV-YARD', kind: 'space', type: 'marshalling-yard', name: 'Marshalling Yard', parent: 'CNV-L1', access: 'staff', group: G('CNV-Z-OPS'), stepFree: true, note: 'Vehicles are held and called to a dock position by time slot' });
add({ id: 'CNV-ROAD', kind: 'space', type: 'service-road', name: 'Service Road', parent: 'CNV-L1', spans: ['CNV-YARD', ...'ABCDEFGHIJKLM'.split('').map((L) => `CNV-DOCK-${L}`)], access: 'staff', group: G('CNV-Z-OPS'), stepFree: true, note: 'A one-way road behind every hall, out of public sight' });
const R = (id: string, from: string, to: string, minutes: number, stepFree: boolean, via: string, note?: string): Route => ({ id, from, to, minutes, stepFree, via, ...(note ? { note } : {}) });
const routes: Route[] = [
  R('CNV-RT-01', 'CNV-REG', 'CNV-EXPO-A', 3, true, 'the Main Concourse'), R('CNV-RT-02', 'CNV-REG', 'CNV-KEY', 2, true, 'the Main Concourse'), R('CNV-RT-03', 'CNV-REG', 'CNV-SR-01', 5, true, 'the west lifts to the meeting level'),
  R('CNV-RT-04', 'CNV-REG', 'CNV-SR-01', 4, false, 'the west escalators', 'Escalators; not step-free'), R('CNV-RT-05', 'CNV-EXPO-A', 'CNV-FOOD', 2, true, 'the Main Concourse'), R('CNV-RT-06', 'CNV-KEY', 'CNV-SR-05', 6, true, 'the east lifts to the meeting level'),
  R('CNV-RT-07', 'CNV-REG', 'CNV-DEMO', 5, true, 'the Main Concourse and row C of Hall A'), R('CNV-RT-09', 'CNV-REG', 'CNV-SMT-H', 9, true, 'the Main Concourse, heading south'), R('CNV-RT-10', 'CNV-REG', 'CNV-BALL-1', 7, true, 'the west lifts and the meeting-level bridge'), R('CNV-RT-11', 'CNV-REG', 'CNV-BALL-1', 6, false, 'the west escalators and the meeting-level bridge', 'Escalators; not step-free'), R('CNV-RT-08', 'CNV-REG', 'CNV-EXS', 3, true, 'the Main Concourse'),
];
export const CONVENTION: Estate = { world: W, version: 'lxc-2026.11.2', name: 'Larkspur Exchange Convention Centre', fictional: true, nodes, assets, routes };
