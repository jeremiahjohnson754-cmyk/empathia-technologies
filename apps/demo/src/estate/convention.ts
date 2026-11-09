/**
 * Larkspur Exchange Convention Centre — the canonical estate (v1.8.1 §9). A fictional regional centre: one divisible expo hall, a
 * general-session hall, ten breakout rooms, meeting and VIP rooms, and the production and operations rooms behind them. The event in
 * residence is a fictional trade show; its exhibitors are invented and no real organisation, association or show is represented.
 * Booths belong to the event edition, not to the building: they are spaces inside the expo hall with their own identifiers.
 * Exit routes are not shown: a venue's emergency plan is its own document, and nothing here stands in for it.
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
add({ id: 'CNV-V', kind: 'venue', type: 'venue', name: 'Larkspur Exchange', parent: 'CNV', access: 'public', plan: { x: 0, y: 0, w: 900, h: 560 }, note: 'Two levels: the hall level and the meeting level' });
export const ZONES = [['CNV-Z-PUB', 'Arrival and public areas', 'public'], ['CNV-Z-EXPO', 'Expo hall', 'members'], ['CNV-Z-SES', 'Sessions and meetings', 'members'], ['CNV-Z-PRD', 'Production and broadcast', 'staff'], ['CNV-Z-OPS', 'Venue operations', 'staff']] as const;
for (const [id, name, access] of ZONES) add({ id, kind: 'district', type: 'zone', name, parent: 'CNV-V', access });
add({ id: 'CNV-L1', kind: 'level', type: 'level', name: 'Hall level', parent: 'CNV-V', access: 'public' }); add({ id: 'CNV-L2', kind: 'level', type: 'level', name: 'Meeting level', parent: 'CNV-V', access: 'public' });
const G = (z: string) => ZONES.find((x) => x[0] === z)![1];
// ---- arrival ----
room('CNV-REG', 'Registration Lobby', 'CNV-L1', 'registration', 400, [40, 18, 8], { access: 'public', group: G('CNV-Z-PUB'), layout: 'Twelve badge desks, self-service kiosks and an accessibility desk', plan: { x: 40, y: 430, w: 300, h: 90 }, kit: [K('signage', 'Wayfinding displays', 'Interactive signage display', 6), K('led', 'Welcome wall', 'Direct-view LED wall'), K('loudspeaker', 'Paging loudspeakers', 'Ceiling loudspeaker', 20)], refreshed: 2023 });
add({ id: 'CNV-CONC', kind: 'space', type: 'concourse', name: 'Main Concourse', parent: 'CNV-L1', spans: ['CNV-REG', 'CNV-EXPO', 'CNV-KEY'], access: 'public', group: G('CNV-Z-PUB'), stepFree: true, plan: { x: 40, y: 380, w: 820, h: 40 }, note: 'Runs the length of the building; lifts and escalators to the meeting level at both ends' });
room('CNV-FOOD', 'Market Hall', 'CNV-L1', 'food-service', 260, [30, 16, 5], { access: 'public', group: G('CNV-Z-PUB'), layout: 'Five counters and 260 seats', kit: [K('signage', 'Menu boards', 'Signage display', 5)], refreshed: 2022 });
for (const [n, lv] of [['A', 'CNV-L1'], ['B', 'CNV-L1'], ['C', 'CNV-L2']] as const) room(`CNV-WC-${n}`, `Restrooms ${n}`, lv, 'restrooms', 40, [14, 8, 3], { access: 'public', group: G('CNV-Z-PUB'), layout: 'Includes accessible and all-gender rooms' });
// ---- expo hall (divisible) and booths of this event ----
room('CNV-EXPO', 'Exhibit Hall', 'CNV-L1', 'expo-hall', 4200, [108, 72, 11], { group: G('CNV-Z-EXPO'), layout: 'A clear-span hall divisible into halls A and B by an operable wall; floor boxes on a nine-metre grid', plan: { x: 360, y: 40, w: 500, h: 330 }, kit: [K('loudspeaker', 'Hall paging system', 'Horn loudspeaker', 32), K('network', 'Floor network', 'Access switch, 48 port', 12), K('signage', 'Hall entrance displays', 'Signage display', 4)], refreshed: 2021 });
for (const h of ['A', 'B']) add({ id: `CNV-EXPO-${h}`, kind: 'space', type: 'hall-division', name: `Hall ${h}`, parent: 'CNV-EXPO', access: 'members', group: G('CNV-Z-EXPO'), stepFree: true, note: 'One half of the Exhibit Hall when the operable wall is closed' });
export const BOOTHS: string[] = [];
const SIZES = [[3, 3], [3, 6], [6, 6], [6, 9]] as const; const KINDS = ['Collaboration', 'Displays and LED', 'Audio', 'Control and automation', 'Networking', 'Broadcast and streaming', 'Signage', 'Services'];
for (let i = 0; i < 64; i += 1) {
  const aisle = 100 + Math.floor(i / 8) * 100; const num = aisle + (i % 8) * 2 + 1; const id = `CNV-BTH-${num}`; const [w, d] = SIZES[(i * 5 + Math.floor(i / 8)) % 4]!; BOOTHS.push(id);
  add({ id, kind: 'space', type: 'booth', name: `Booth ${num}`, parent: i < 32 ? 'CNV-EXPO-A' : 'CNV-EXPO-B', access: 'members', group: KINDS[(i * 3) % KINDS.length]!, capacity: Math.round((w * d) / 1.4), stepFree: true, note: `${w} × ${d} m. Exhibitor ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) || ''}-${num} (invented for ${EVENT.name})` });
}
// ---- sessions ----
const present = (n: number): Kit[] => [K('projector', 'Projection', n > 150 ? 'Laser projector, 12,000 lumen class' : 'Laser projector, 7,000 lumen class', n > 150 ? 2 : 1), K('microphone', 'Lectern and wireless microphones', 'Gooseneck and wireless set'), K('loudspeaker', 'Room loudspeakers', n > 150 ? 'Column loudspeaker' : 'Ceiling loudspeaker', n > 150 ? 4 : 8), K('processor', 'Audio processor', 'Digital signal processor'), K('control', 'Room control panel', 'Touch panel, 10 inch class'), K('assistive', 'Assistive listening', 'Assistive listening transmitter')];
room('CNV-KEY', 'General Session Hall', 'CNV-L1', 'keynote-hall', 1800, [54, 40, 10], { group: G('CNV-Z-SES'), layout: 'Theatre seating for 1,800, a stage with a centre screen and two side screens, a camera riser and thirty wheelchair positions', plan: { x: 40, y: 40, w: 300, h: 330 }, refreshed: 2024,
  kit: [K('led', 'Centre stage screen', 'Direct-view LED wall'), K('projector', 'Side screens', 'Laser projector, 20,000 lumen class', 2), K('loudspeaker', 'Main loudspeaker system', 'Line array loudspeaker', 2), K('loudspeaker', 'Delay loudspeakers', 'Column loudspeaker', 6), K('processor', 'Front-of-house console', 'Digital mixing console'), K('camera', 'Image-magnification cameras', 'Broadcast camera chain', 3), K('lighting', 'Stage lighting', 'LED stage fixture', 60), K('assistive', 'Assistive listening', 'Assistive listening transmitter'), K('intercom', 'Production intercom', 'Intercom matrix')] });
export const BREAKOUTS: string[] = [];
const BRK: [string, number, [number, number, number], string, 'ACCEPTED' | 'COMMISSIONING' | 'DESIGNED', number][] = [
  ['201', 220, [22, 16, 5], 'Theatre, 220', 'ACCEPTED', 2024], ['202', 220, [22, 16, 5], 'Theatre, 220', 'ACCEPTED', 2024], ['203', 140, [17, 13, 4.2], 'Theatre, 140', 'ACCEPTED', 2022], ['204', 140, [17, 13, 4.2], 'Classroom, 80 at tables', 'ACCEPTED', 2022],
  ['205', 96, [14, 11, 4], 'Theatre, 96', 'COMMISSIONING', 2026], ['206', 96, [14, 11, 4], 'Rounds, eight tables of eight', 'ACCEPTED', 2021], ['207', 60, [12, 9, 3.6], 'Theatre, 60', 'ACCEPTED', 2021], ['208', 60, [12, 9, 3.6], 'Hollow square, 32', 'ACCEPTED', 2019],
  ['209', 48, [10, 8.5, 3.4], 'Classroom, 30 at tables', 'DESIGNED', 2026], ['210', 48, [10, 8.5, 3.4], 'Theatre, 48', 'ACCEPTED', 2019],
];
for (const [num, cap, dims, layout, cx, year] of BRK) { const id = `CNV-BR-${num}`; BREAKOUTS.push(id); room(id, `Breakout ${num}`, 'CNV-L2', 'breakout-room', cap, dims, { group: G('CNV-Z-SES'), layout, commissioning: cx, refreshed: year, kit: present(cap) }); }
for (const [num, cap] of [['221', 14], ['222', 14], ['223', 10], ['224', 8]] as const) room(`CNV-MR-${num}`, `Meeting Room ${num}`, 'CNV-L2', 'meeting-room', cap, [cap > 10 ? 7.5 : 5.5, 4.6, 2.9], { group: G('CNV-Z-SES'), layout: `Boardroom table for ${cap}`, refreshed: 2023, kit: [K('display', 'Room display', 'Flat panel, 75 inch class'), K('camera', 'Room camera', 'Fixed wide camera'), K('microphone', 'Table microphone', 'Table array microphone'), K('compute', 'Room computer', 'Conferencing appliance'), K('signage', 'Booking panel', 'Room booking panel')] });
room('CNV-VIP', 'VIP Lounge', 'CNV-L2', 'vip-lounge', 40, [14, 9, 3.4], { access: 'restricted', group: G('CNV-Z-SES'), layout: 'Lounge seating and two private meeting pods', kit: [K('display', 'Lounge display', 'Flat panel, 75 inch class')], refreshed: 2023 });
room('CNV-EXM', 'Exhibitor Meeting Suite', 'CNV-L1', 'exhibitor-meeting', 24, [10, 8, 3.2], { group: G('CNV-Z-SES'), layout: 'Three bookable meeting tables for exhibitors', kit: [K('display', 'Suite display', 'Flat panel, 65 inch class')], refreshed: 2022 });
// ---- production and broadcast ----
const prd = (id: string, name: string, type: string, lv: string, cap: number, dims: [number, number, number], kit: Kit[], o: Partial<EstateNode> = {}) => room(id, name, lv, type, cap, dims, { access: 'staff', group: G('CNV-Z-PRD'), kit, refreshed: 2024, ...o });
prd('CNV-SPK', 'Speaker Preparation Room', 'speaker-prep', 'CNV-L1', 12, [8, 6, 3], [K('display', 'Confidence monitor', 'Flat panel, 55 inch class'), K('compute', 'Slide check station', 'Workstation', 2)], { access: 'members', layout: 'Slide check, a timer and a feed of the stage' });
prd('CNV-GRN-1', 'Green Room 1', 'green-room', 'CNV-L1', 8, [6, 5, 3], [K('display', 'Programme monitor', 'Flat panel, 43 inch class')], { access: 'restricted' }); prd('CNV-GRN-2', 'Green Room 2', 'green-room', 'CNV-L1', 6, [5, 4.5, 3], [], { access: 'restricted' });
prd('CNV-PCR', 'Production Control Room', 'production-control', 'CNV-L1', 10, [10, 7, 3.2], [K('router', 'Show switcher', 'Production switcher'), K('router', 'Video router', 'Video routing matrix'), K('compute', 'Playback servers', 'Media server', 2), K('intercom', 'Production intercom', 'Intercom matrix'), K('display', 'Multiviewer', 'Flat panel, 55 inch class', 4)], { layout: 'Runs the General Session: screens, cameras, playback and comms' });
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
for (const n of ['1', '2']) ops(`CNV-IDF-${n}`, `Network Room ${n}`, 'network-room', 2, [5, 4, 3], { access: 'restricted', kit: [K('network', 'Distribution switches', 'Access switch, 48 port', 3)], refreshed: 2023 });
add({ id: 'CNV-DOCK', kind: 'space', type: 'loading-dock', name: 'Loading Docks', parent: 'CNV-L1', spans: ['CNV-EXPO', 'CNV-STO'], access: 'staff', group: G('CNV-Z-OPS'), stepFree: true, note: 'Six bays opening directly onto the hall floor' });
const R = (id: string, from: string, to: string, minutes: number, stepFree: boolean, via: string, note?: string): Route => ({ id, from, to, minutes, stepFree, via, ...(note ? { note } : {}) });
const routes: Route[] = [
  R('CNV-RT-01', 'CNV-REG', 'CNV-EXPO', 3, true, 'the Main Concourse'), R('CNV-RT-02', 'CNV-REG', 'CNV-KEY', 2, true, 'the Main Concourse'), R('CNV-RT-03', 'CNV-REG', 'CNV-BR-201', 5, true, 'the west lifts to the meeting level'),
  R('CNV-RT-04', 'CNV-REG', 'CNV-BR-201', 4, false, 'the west escalators', 'Escalators; not step-free'), R('CNV-RT-05', 'CNV-EXPO', 'CNV-FOOD', 2, true, 'the Main Concourse'), R('CNV-RT-06', 'CNV-KEY', 'CNV-BR-205', 6, true, 'the east lifts to the meeting level'),
  R('CNV-RT-07', 'CNV-EXPO', 'CNV-DEMO', 2, true, 'aisle 300 of Hall A'), R('CNV-RT-08', 'CNV-REG', 'CNV-EXS', 3, true, 'the Main Concourse'),
];
export const CONVENTION: Estate = { world: W, version: 'lxc-2026.11.1', name: 'Larkspur Exchange Convention Centre', fictional: true, nodes, assets, routes };
