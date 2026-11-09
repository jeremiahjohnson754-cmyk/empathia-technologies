/**
 * Kestrel Valley University — the canonical estate (v1.8.1 §7). A fictional institution: three connected campuses, five schools,
 * exactly 38 canonical classrooms, four dormitory buildings, and the places a campus day passes through. Every record is synthetic.
 * Lecture theatres, laboratories, studios and computer labs exist as well and are typed differently, so the classroom count stays 38.
 * Student rooms are never listed one by one: a residential floor is a single restricted record with a room count and nothing else.
 */
import type { Estate, EstateNode, Asset, Route, Access, Commissioning, AssetKind } from './model.js';
import { pick } from './model.js';

const W = 'university' as const; const S = 'SYNTHETIC' as const;
const nodes: EstateNode[] = []; const assets: Asset[] = [];
const add = (n: Omit<EstateNode, 'world' | 'provenance'>) => { nodes.push({ ...n, world: W, provenance: S }); return n.id; };
add({ id: 'UNI', kind: 'world', type: 'university', name: 'Kestrel Valley University', parent: null, access: 'public' });
for (const [id, name, note, x, y, w, h] of [['UNI-C', 'Central Campus', 'Administration, the Quad, the library, the union and the humanities', 300, 180, 300, 220], ['UNI-N', 'North Campus', 'Engineering, computing, science, health and research', 300, 0, 620, 160], ['UNI-S', 'South Campus', 'Business, arts and media, recreation and the residences', 0, 420, 900, 180]] as const)
  add({ id, kind: 'campus', type: 'campus', name, parent: 'UNI', access: 'public', note, plan: { x, y, w, h } });

export const SCHOOLS = [
  { key: 'ENG', name: 'Engineering & Computing', classrooms: 10 }, { key: 'BUS', name: 'Business & Innovation', classrooms: 8 }, { key: 'HAS', name: 'Health & Applied Sciences', classrooms: 8 },
  { key: 'AMC', name: 'Arts, Media & Communication', classrooms: 6 }, { key: 'HSS', name: 'Humanities & Social Sciences', classrooms: 6 },
] as const;
const school = (k: string) => SCHOOLS.find((s) => s.key === k)!.name;

function building(id: string, name: string, campus: string, type: string, levels: number, plan: [number, number, number, number], o: Partial<EstateNode> = {}) {
  add({ id, kind: 'building', type, name, parent: campus, access: 'public', plan: { x: plan[0], y: plan[1], w: plan[2], h: plan[3] }, stepFree: true, ...o });
  for (let l = 0; l < levels; l += 1) add({ id: `${id}-L${l}`, kind: 'level', type: 'level', name: l === 0 ? 'Ground floor' : `Level ${l}`, parent: id, access: o.access || 'public' });
}
// ---- buildings ----
building('UNI-ENG', 'Engineering Centre', 'UNI-N', 'academic', 3, [470, 40, 130, 90], { group: school('ENG') });
building('UNI-CMP', 'Computing Hall', 'UNI-N', 'academic', 3, [620, 40, 110, 90], { group: school('ENG') });
building('UNI-SCI', 'Science Hall', 'UNI-N', 'academic', 3, [320, 40, 130, 90], { group: school('HAS') });
building('UNI-HLT', 'Health Sciences Building', 'UNI-N', 'academic', 3, [750, 40, 130, 90], { group: school('HAS') });
building('UNI-RSH', 'Marlow Research Building', 'UNI-N', 'research', 2, [900, 60, 110, 70], { access: 'staff' });
building('UNI-HUM', 'Humanities Building', 'UNI-C', 'academic', 3, [470, 200, 120, 70], { group: school('HSS') });
building('UNI-LIB', 'Hollis Library', 'UNI-C', 'library', 4, [320, 200, 130, 70]);
building('UNI-ADM', 'Founders Hall', 'UNI-C', 'administration', 2, [320, 320, 110, 60], { note: 'Administration, registrar and admissions' });
building('UNI-SUN', 'Student Union', 'UNI-C', 'student-life', 3, [450, 320, 140, 60]);
building('UNI-WEL', 'Wellbeing Centre', 'UNI-C', 'student-services', 2, [610, 200, 90, 60], { note: 'Health and counselling' });
building('UNI-PAC', 'Ashby Auditorium', 'UNI-C', 'performance', 2, [610, 290, 100, 80]);
building('UNI-BUS', 'Business & Innovation Hall', 'UNI-S', 'academic', 3, [40, 450, 150, 80], { group: school('BUS') });
building('UNI-ART', 'Arts Hall', 'UNI-S', 'academic', 2, [210, 450, 110, 80], { group: school('AMC'), stepFree: false, accessNote: 'The upper floor has no lift; ground-floor rooms are step-free' });
building('UNI-MED', 'Media Centre', 'UNI-S', 'academic', 2, [340, 450, 110, 80], { group: school('AMC') });
building('UNI-REC', 'Recreation Centre', 'UNI-S', 'recreation', 2, [470, 450, 130, 80]);
building('UNI-FAC', 'Facilities Yard', 'UNI-S', 'facilities', 1, [980, 470, 80, 60], { access: 'staff' });
export const DORMS = [['UNI-RSA', 'Alder House', 4, 620], ['UNI-RSB', 'Birch House', 5, 720], ['UNI-RSC', 'Cedar House', 4, 820], ['UNI-RSD', 'Dunlin House', 3, 920]] as const;
for (const [id, name, floors, x] of DORMS) building(id, name, 'UNI-S', 'dormitory', floors + 1, [x, 450, 80, 80], { group: 'Residences', access: 'public', note: 'A residence: its common rooms are for residents; student rooms are not listed' });

// ---- rooms ----
interface Kit { kind: AssetKind; label: string; cls: string; qty: number }
const K = (kind: AssetKind, label: string, cls: string, qty = 1): Kit => ({ kind, label, cls, qty });
function room(id: string, name: string, level: string, type: string, capacity: number, dims: [number, number, number], o: Partial<EstateNode> & { kit?: Kit[] } = {}) {
  const { kit, ...rest } = o;
  add({ id, kind: 'room', type, name, parent: level, access: 'members', capacity, dims, stepFree: true, commissioning: kit && kit.length ? 'ACCEPTED' : 'NOT_APPLICABLE', ...rest });
  (kit || []).forEach((k, i) => assets.push({ id: `${id}-A${String(i + 1).padStart(2, '0')}`, world: W, room: id, kind: k.kind, label: k.label, cls: k.cls, qty: k.qty, installed: rest.refreshed || 2022, state: rest.commissioning === 'DESIGNED' ? 'PLANNED' : 'IN_SERVICE', provenance: S }));
}
/** Classroom templates: layout, seats, dimensions and the teaching kit the layout calls for. Generic equipment classes only. */
const T: Record<string, { cap: number; dims: [number, number, number]; layout: string; kit: Kit[]; hybrid: Kit[] }> = {
  seminar: { cap: 20, dims: [8, 6.5, 3], layout: 'One table, twenty seats, a display on the short wall', kit: [K('display', 'Teaching display', 'Flat panel, 75 inch class'), K('control', 'Wall control panel', 'Touch panel, 7 inch class'), K('loudspeaker', 'Ceiling loudspeakers', 'Ceiling loudspeaker', 4)], hybrid: [K('camera', 'Room camera', 'Fixed wide camera'), K('microphone', 'Ceiling microphone', 'Ceiling array microphone'), K('compute', 'Room computer', 'Conferencing appliance')] },
  flat: { cap: 36, dims: [10.5, 8.5, 3], layout: 'Rows of movable tables facing a teaching wall', kit: [K('display', 'Teaching displays', 'Flat panel, 86 inch class', 2), K('microphone', 'Lectern microphone', 'Gooseneck microphone'), K('loudspeaker', 'Ceiling loudspeakers', 'Ceiling loudspeaker', 6), K('processor', 'Audio processor', 'Digital signal processor'), K('control', 'Lectern control panel', 'Touch panel, 10 inch class')], hybrid: [K('camera', 'Presenter camera', 'PTZ camera'), K('camera', 'Audience camera', 'Fixed wide camera'), K('microphone', 'Ceiling microphones', 'Ceiling array microphone', 2), K('capture', 'Lecture capture', 'Capture and streaming encoder')] },
  active: { cap: 42, dims: [13, 10.5, 3.2], layout: 'Seven group tables of six, each with its own display', kit: [K('display', 'Group displays', 'Flat panel, 55 inch class', 7), K('display', 'Teaching display', 'Flat panel, 86 inch class'), K('router', 'Group display switching', 'AV-over-IP switching'), K('microphone', 'Wireless microphone', 'Wireless handheld and lapel set'), K('loudspeaker', 'Ceiling loudspeakers', 'Ceiling loudspeaker', 8), K('processor', 'Audio processor', 'Digital signal processor'), K('control', 'Teaching station panel', 'Touch panel, 10 inch class'), K('assistive', 'Assistive listening', 'Assistive listening transmitter')], hybrid: [K('camera', 'Room cameras', 'PTZ camera', 2), K('microphone', 'Ceiling microphones', 'Ceiling array microphone', 3)] },
  computer: { cap: 30, dims: [11.5, 9, 3], layout: 'Thirty workstations in rows, with a teaching station', kit: [K('projector', 'Teaching projector', 'Laser projector, 6,000 lumen class'), K('compute', 'Student workstations', 'Desktop workstation', 30), K('microphone', 'Lectern microphone', 'Gooseneck microphone'), K('loudspeaker', 'Ceiling loudspeakers', 'Ceiling loudspeaker', 6), K('control', 'Teaching station panel', 'Touch panel, 10 inch class'), K('network', 'Room switch', 'Access switch, 48 port')], hybrid: [K('capture', 'Lecture capture', 'Capture and streaming encoder'), K('camera', 'Presenter camera', 'PTZ camera')] },
  tiered: { cap: 64, dims: [14, 12, 4.5], layout: 'Four tiered rows in a horseshoe around a teaching well', kit: [K('projector', 'Twin projection', 'Laser projector, 8,000 lumen class', 2), K('microphone', 'Lectern and wireless microphones', 'Gooseneck and wireless set'), K('loudspeaker', 'Front loudspeakers', 'Column loudspeaker', 2), K('loudspeaker', 'Fill loudspeakers', 'Ceiling loudspeaker', 6), K('processor', 'Audio processor', 'Digital signal processor'), K('control', 'Lectern control panel', 'Touch panel, 10 inch class'), K('assistive', 'Assistive listening', 'Assistive listening transmitter')], hybrid: [K('camera', 'Presenter and audience cameras', 'PTZ camera', 2), K('microphone', 'Audience microphones', 'Ceiling array microphone', 3), K('capture', 'Lecture capture', 'Capture and streaming encoder')] },
  studio: { cap: 24, dims: [11, 9, 3.6], layout: 'Open floor with movable benches and a demonstration wall', kit: [K('display', 'Demonstration display', 'Flat panel, 86 inch class'), K('camera', 'Overhead demonstration camera', 'Fixed document camera'), K('loudspeaker', 'Wall loudspeakers', 'Surface loudspeaker', 4), K('control', 'Wall control panel', 'Touch panel, 7 inch class')], hybrid: [K('camera', 'Room camera', 'PTZ camera'), K('microphone', 'Ceiling microphone', 'Ceiling array microphone')] },
  skills: { cap: 24, dims: [12, 9, 3], layout: 'Eight teaching bays around a central demonstration bay', kit: [K('display', 'Bay displays', 'Flat panel, 43 inch class', 4), K('camera', 'Demonstration camera', 'PTZ camera'), K('microphone', 'Wireless microphone', 'Wireless lapel set'), K('loudspeaker', 'Ceiling loudspeakers', 'Ceiling loudspeaker', 6), K('processor', 'Audio processor', 'Digital signal processor'), K('control', 'Wall control panel', 'Touch panel, 7 inch class')], hybrid: [K('capture', 'Session recording', 'Capture and streaming encoder')] },
};
/** The 38 canonical classrooms: [building, level, room number, template, hybrid?, commissioning, year refreshed]. Order never changes an id. */
const C: [string, number, string, keyof typeof T, boolean, Commissioning, number][] = [
  ['ENG', 1, '101', 'active', true, 'ACCEPTED', 2025], ['ENG', 1, '104', 'flat', true, 'ACCEPTED', 2024], ['ENG', 1, '110', 'tiered', true, 'COMMISSIONING', 2026], ['ENG', 2, '201', 'flat', false, 'ACCEPTED', 2021], ['ENG', 2, '204', 'seminar', true, 'ACCEPTED', 2023], ['ENG', 2, '212', 'studio', false, 'ACCEPTED', 2020],
  ['CMP', 1, '102', 'computer', true, 'ACCEPTED', 2024], ['CMP', 1, '106', 'computer', false, 'ACCEPTED', 2019], ['CMP', 2, '203', 'active', true, 'DESIGNED', 2026], ['CMP', 2, '208', 'seminar', false, 'ACCEPTED', 2022],
  ['BUS', 0, '010', 'tiered', true, 'ACCEPTED', 2025], ['BUS', 0, '014', 'tiered', true, 'ACCEPTED', 2023], ['BUS', 1, '103', 'flat', true, 'ACCEPTED', 2024], ['BUS', 1, '107', 'flat', false, 'ACCEPTED', 2020], ['BUS', 1, '112', 'active', true, 'COMMISSIONING', 2026], ['BUS', 2, '202', 'seminar', true, 'ACCEPTED', 2023], ['BUS', 2, '205', 'seminar', false, 'ACCEPTED', 2021], ['BUS', 2, '209', 'computer', false, 'ACCEPTED', 2022],
  ['SCI', 1, '105', 'flat', true, 'ACCEPTED', 2024], ['SCI', 1, '109', 'flat', false, 'ACCEPTED', 2019], ['SCI', 2, '206', 'active', true, 'ACCEPTED', 2025], ['SCI', 2, '211', 'seminar', false, 'ACCEPTED', 2021],
  ['HLT', 1, '101', 'skills', true, 'ACCEPTED', 2025], ['HLT', 1, '108', 'skills', false, 'ACCEPTED', 2022], ['HLT', 2, '202', 'flat', true, 'COMMISSIONING', 2026], ['HLT', 2, '207', 'seminar', true, 'ACCEPTED', 2023],
  ['ART', 0, '004', 'studio', false, 'ACCEPTED', 2020], ['ART', 0, '009', 'studio', true, 'ACCEPTED', 2024], ['ART', 1, '103', 'seminar', false, 'ACCEPTED', 2018],
  ['MED', 0, '006', 'computer', true, 'ACCEPTED', 2024], ['MED', 1, '102', 'flat', true, 'ACCEPTED', 2023], ['MED', 1, '107', 'seminar', true, 'DESIGNED', 2026],
  ['HUM', 0, '012', 'tiered', true, 'ACCEPTED', 2022], ['HUM', 1, '101', 'flat', false, 'ACCEPTED', 2019], ['HUM', 1, '105', 'flat', true, 'ACCEPTED', 2024], ['HUM', 1, '109', 'seminar', false, 'ACCEPTED', 2020], ['HUM', 2, '203', 'seminar', true, 'ACCEPTED', 2023], ['HUM', 2, '207', 'active', true, 'ACCEPTED', 2025],
];
const SCHOOL_OF: Record<string, string> = { ENG: 'ENG', CMP: 'ENG', BUS: 'BUS', SCI: 'HAS', HLT: 'HAS', ART: 'AMC', MED: 'AMC', HUM: 'HSS' };
C.forEach(([b, l, num, tpl, hybrid, cx, year], i) => {
  const t = T[tpl]!; const bn = nodes.find((n) => n.id === `UNI-${b}`)!; const upperNoLift = b === 'ART' && l > 0;
  // a little honest variety within a template: a room is never exactly the drawing
  const cap = t.cap + pick([0, -2, 2, 0, -4, 4], i); const dims: [number, number, number] = [+(t.dims[0] + pick([0, 0.4, -0.3, 0.6], i)).toFixed(1), +(t.dims[1] + pick([0, -0.2, 0.3], i)).toFixed(1), t.dims[2]];
  room(`UNI-${b}-${num}`, `${bn.name} ${l}.${num.slice(1)}`, `UNI-${b}-L${l}`, 'classroom', cap, dims, { group: school(SCHOOL_OF[b]!), layout: t.layout + (hybrid ? '. Equipped for hybrid teaching' : ''), commissioning: cx, refreshed: year,
    stepFree: !upperNoLift, ...(upperNoLift ? { accessNote: 'Reached by stairs only; a ground-floor room is offered on request' } : {}), kit: [...t.kit, ...(hybrid ? t.hybrid : [])], note: tpl });
});
// other teaching and research spaces (not classrooms)
const AV = [K('projector', 'Projection', 'Laser projector, 10,000 lumen class', 2), K('microphone', 'Lectern and wireless microphones', 'Gooseneck and wireless set'), K('loudspeaker', 'Main loudspeakers', 'Line array loudspeaker', 2), K('processor', 'Audio processor', 'Digital signal processor'), K('camera', 'Capture cameras', 'PTZ camera', 2), K('capture', 'Lecture capture', 'Capture and streaming encoder'), K('assistive', 'Assistive listening', 'Assistive listening transmitter'), K('control', 'Lectern control panel', 'Touch panel, 10 inch class')];
room('UNI-SCI-LT1', 'Science Hall Lecture Theatre', 'UNI-SCI-L0', 'lecture-theatre', 180, [20, 16, 6.5], { group: school('HAS'), layout: 'Raked theatre, 180 seats, six wheelchair positions at the rear cross-aisle', refreshed: 2024, kit: AV });
room('UNI-BUS-LT1', 'Innovation Hall Lecture Theatre', 'UNI-BUS-L0', 'lecture-theatre', 140, [18, 15, 6], { group: school('BUS'), layout: 'Raked theatre, 140 seats', refreshed: 2023, kit: AV });
room('UNI-HUM-LT1', 'Humanities Lecture Theatre', 'UNI-HUM-L0', 'lecture-theatre', 120, [17, 14, 5.5], { group: school('HSS'), layout: 'Raked theatre, 120 seats', refreshed: 2019, commissioning: 'ACCEPTED', kit: AV.slice(0, 6) });
room('UNI-ENG-MKR', 'Maker Studio', 'UNI-ENG-L0', 'maker-space', 32, [16, 12, 4.2], { group: school('ENG'), layout: 'Benches, a tool wall and a demonstration bench with an overhead camera', refreshed: 2023, kit: [K('display', 'Demonstration display', 'Flat panel, 75 inch class'), K('camera', 'Bench camera', 'Fixed document camera'), K('loudspeaker', 'Wall loudspeakers', 'Surface loudspeaker', 4)] });
room('UNI-ENG-ELB', 'Electronics Laboratory', 'UNI-ENG-L0', 'laboratory', 28, [14, 11, 3.4], { group: school('ENG'), layout: 'Fourteen two-person benches with supplies and instruments', refreshed: 2022, kit: [K('display', 'Instruction displays', 'Flat panel, 65 inch class', 2), K('microphone', 'Wireless microphone', 'Wireless lapel set'), K('loudspeaker', 'Ceiling loudspeakers', 'Ceiling loudspeaker', 6)] });
room('UNI-CMP-LAB1', 'Computing Lab A', 'UNI-CMP-L0', 'computer-lab', 40, [15, 11, 3], { group: school('ENG'), layout: 'Forty open-access workstations', refreshed: 2024, kit: [K('compute', 'Workstations', 'Desktop workstation', 40), K('network', 'Room switch', 'Access switch, 48 port'), K('signage', 'Availability sign', 'Small signage display')] });
room('UNI-CMP-LAB2', 'Computing Lab B', 'UNI-CMP-L0', 'computer-lab', 24, [11, 9, 3], { group: school('ENG'), layout: 'Twenty-four workstations with dual monitors', refreshed: 2021, kit: [K('compute', 'Workstations', 'Desktop workstation', 24), K('network', 'Room switch', 'Access switch, 48 port')] });
room('UNI-SCI-LAB1', 'Teaching Laboratory 1', 'UNI-SCI-L0', 'laboratory', 30, [15, 11, 3.4], { group: school('HAS'), layout: 'Wet lab, fifteen benches', refreshed: 2021, kit: [K('display', 'Instruction display', 'Flat panel, 75 inch class'), K('microphone', 'Wireless microphone', 'Wireless lapel set'), K('loudspeaker', 'Ceiling loudspeakers', 'Ceiling loudspeaker', 6)] });
room('UNI-HLT-SIM', 'Clinical Simulation Suite', 'UNI-HLT-L0', 'laboratory', 16, [13, 10, 3], { group: school('HAS'), access: 'staff', layout: 'Two simulation bays, a control room and a debrief room', refreshed: 2025, kit: [K('camera', 'Bay cameras', 'PTZ camera', 4), K('microphone', 'Bay microphones', 'Ceiling array microphone', 2), K('capture', 'Session recording', 'Capture and streaming encoder'), K('display', 'Debrief display', 'Flat panel, 75 inch class'), K('intercom', 'Control room talkback', 'Intercom station')] });
room('UNI-MED-TVS', 'Television Studio', 'UNI-MED-L0', 'studio', 30, [14, 11, 6], { group: school('AMC'), layout: 'Studio floor with a lighting grid and a control gallery', refreshed: 2024, kit: [K('camera', 'Studio cameras', 'Studio camera chain', 3), K('router', 'Vision mixing', 'Production switcher'), K('processor', 'Audio console', 'Digital mixing console'), K('lighting', 'Lighting grid', 'LED studio fixture', 18), K('intercom', 'Production intercom', 'Intercom matrix')] });
room('UNI-ART-REC', 'Recital Room', 'UNI-ART-L0', 'performance', 90, [15, 11, 6], { group: school('AMC'), access: 'public', layout: 'Flat floor, 90 loose seats, a small stage', refreshed: 2018, kit: [K('loudspeaker', 'Stage loudspeakers', 'Column loudspeaker', 2), K('microphone', 'Stage microphones', 'Condenser microphone', 4), K('processor', 'Audio console', 'Digital mixing console'), K('assistive', 'Assistive listening', 'Assistive listening transmitter')] });
room('UNI-RSH-L01', 'Research Laboratory 1', 'UNI-RSH-L0', 'laboratory', 12, [12, 9, 3.2], { access: 'restricted', layout: 'Research benches; entry by named access only', refreshed: 2023 });
room('UNI-RSH-L02', 'Research Laboratory 2', 'UNI-RSH-L1', 'laboratory', 12, [12, 9, 3.2], { access: 'restricted', layout: 'Research benches; entry by named access only', refreshed: 2023 });
// library, union, services, performance, recreation
const sr = [K('display', 'Room display', 'Flat panel, 55 inch class'), K('compute', 'Wireless sharing', 'Wireless presentation receiver'), K('signage', 'Booking panel', 'Room booking panel')];
for (const [n, cap] of [['A', 6], ['B', 6], ['C', 8], ['D', 4]] as const) room(`UNI-LIB-SR${n}`, `Study Room ${n}`, 'UNI-LIB-L1', 'study-room', cap, [4.5, cap > 6 ? 4.2 : 3.4, 2.8], { layout: `Bookable group study room for ${cap}`, refreshed: 2023, kit: sr });
room('UNI-LIB-RDG', 'Reading Room', 'UNI-LIB-L2', 'reading-room', 120, [28, 16, 5], { access: 'public', layout: 'Silent study, 120 seats' });
room('UNI-LIB-TEC', 'Technology Help Desk', 'UNI-LIB-L0', 'support', 12, [9, 6, 3], { access: 'public', layout: 'Walk-up help for devices, accounts and classroom technology', kit: [K('signage', 'Queue display', 'Small signage display')], refreshed: 2024 });
room('UNI-SUN-DIN', 'Dining Commons', 'UNI-SUN-L0', 'dining', 320, [34, 22, 5], { access: 'public', layout: 'Five counters and 320 seats', kit: [K('signage', 'Menu boards', 'Signage display', 6), K('loudspeaker', 'Background and paging loudspeakers', 'Ceiling loudspeaker', 16)], refreshed: 2022 });
room('UNI-SUN-CAF', 'Quad Coffee', 'UNI-SUN-L0', 'cafe', 40, [10, 7, 3.4], { access: 'public', layout: 'Coffee bar with forty seats facing the Quad' });
room('UNI-SUN-BKS', 'University Bookstore', 'UNI-SUN-L0', 'retail', 60, [16, 11, 3.4], { access: 'public', layout: 'Books, supplies and university goods' });
room('UNI-SUN-SOC1', 'Societies Room 1', 'UNI-SUN-L1', 'student-organization', 24, [9, 7, 3], { layout: 'Bookable by student societies', kit: sr, refreshed: 2022 });
room('UNI-SUN-SOC2', 'Societies Room 2', 'UNI-SUN-L1', 'student-organization', 16, [7, 6, 3], { layout: 'Bookable by student societies', kit: sr, refreshed: 2022 });
room('UNI-SUN-CAR', 'Career Services', 'UNI-SUN-L2', 'student-services', 18, [10, 8, 3], { access: 'public', layout: 'Drop-in desk and four interview rooms' });
room('UNI-ADM-REG', 'Registrar', 'UNI-ADM-L0', 'administration', 20, [11, 8, 3], { access: 'public', layout: 'Enrolment, records and timetabling counter' });
room('UNI-ADM-ADS', 'Admissions', 'UNI-ADM-L0', 'administration', 24, [11, 9, 3], { access: 'public', layout: 'Visitor and applicant reception', kit: [K('display', 'Welcome display', 'Flat panel, 65 inch class')], refreshed: 2023 });
room('UNI-ADM-FAC', 'Faculty Offices', 'UNI-ADM-L1', 'office', 40, [26, 14, 3], { access: 'staff', layout: 'Shared and single offices' });
room('UNI-WEL-HLT', 'Health Service', 'UNI-WEL-L0', 'student-services', 20, [14, 9, 3], { access: 'public', layout: 'Reception and consulting rooms; what happens inside is private and not recorded here' });
room('UNI-WEL-CNS', 'Counselling Service', 'UNI-WEL-L1', 'student-services', 12, [12, 8, 3], { access: 'public', layout: 'Reception and private rooms; what happens inside is private and not recorded here' });
room('UNI-PAC-AUD', 'Ashby Auditorium', 'UNI-PAC-L0', 'auditorium', 620, [34, 26, 12], { access: 'public', layout: 'Raked stalls and a balcony, 620 seats, twelve wheelchair positions', refreshed: 2021, kit: [K('loudspeaker', 'Main loudspeaker system', 'Line array loudspeaker', 2), K('processor', 'Front-of-house console', 'Digital mixing console'), K('projector', 'Cinema projection', 'Laser projector, 20,000 lumen class'), K('camera', 'Event cameras', 'PTZ camera', 3), K('lighting', 'Stage lighting', 'LED stage fixture', 48), K('assistive', 'Assistive listening', 'Assistive listening transmitter'), K('intercom', 'Production intercom', 'Intercom matrix')] });
room('UNI-REC-FIT', 'Fitness Suite', 'UNI-REC-L0', 'recreation', 90, [26, 18, 4.5], { layout: 'Cardio, weights and two studios', kit: [K('signage', 'Class schedule displays', 'Signage display', 3), K('loudspeaker', 'Zone loudspeakers', 'Surface loudspeaker', 10)], refreshed: 2022 });
room('UNI-REC-CRT', 'Sports Hall', 'UNI-REC-L0', 'recreation', 400, [44, 26, 9], { access: 'public', layout: 'Three courts with retractable seating for 400', kit: [K('display', 'Scoreboard', 'LED scoreboard'), K('loudspeaker', 'Hall loudspeakers', 'Horn loudspeaker', 8)], refreshed: 2020 });
room('UNI-FAC-NOC', 'Campus Technology Room', 'UNI-FAC-L0', 'technical', 6, [9, 6, 3], { access: 'restricted', layout: 'Core network and AV distribution; entry by named access only', kit: [K('network', 'Core switches', 'Core switch', 2), K('router', 'AV-over-IP core', 'AV network switch', 2)], refreshed: 2024 });
// dormitories: common rooms are rooms; a residential floor is one restricted record, never a list of student rooms
for (const [id, name, floors] of DORMS) {
  room(`${id}-LNG`, `${name} Lounge`, `${id}-L0`, 'common-lounge', 40, [12, 9, 3.2], { access: 'restricted', layout: 'Sofas, a shared screen and a games corner', kit: [K('display', 'Shared screen', 'Flat panel, 75 inch class'), K('compute', 'Wireless sharing', 'Wireless presentation receiver')], refreshed: 2023 });
  room(`${id}-STU`, `${name} Study Room`, `${id}-L0`, 'study-room', 16, [8, 6, 3], { access: 'restricted', layout: 'Quiet study, sixteen seats', kit: sr.slice(0, 2), refreshed: 2023 });
  room(`${id}-KIT`, `${name} Community Kitchen`, `${id}-L0`, 'kitchen', 14, [8, 5.5, 3], { access: 'restricted', layout: 'Shared cooking and a long table' });
  room(`${id}-LDY`, `${name} Laundry`, `${id}-L0`, 'laundry', 8, [6, 4.5, 2.8], { access: 'restricted', layout: 'Washers and dryers' });
  room(`${id}-MDA`, `${name} Media Room`, `${id}-L0`, 'media-room', 18, [8, 6, 3], { access: 'restricted', layout: 'A projector, tiered sofas and a console shelf', kit: [K('projector', 'Media projector', 'Laser projector, 4,000 lumen class'), K('loudspeaker', 'Surround loudspeakers', 'Surface loudspeaker', 5)], refreshed: 2022 });
  room(`${id}-OFF`, `${name} Residence Office`, `${id}-L0`, 'office', 4, [5, 4, 2.8], { access: 'staff', layout: 'Residential life staff' });
  for (let f = 1; f <= floors; f += 1) add({ id: `${id}-RF${f}`, kind: 'space', type: 'residential-floor', name: `Residential floor ${f}`, parent: `${id}-L${f}`, access: 'restricted', group: 'Residences', capacity: 24, stepFree: true, note: 'Twenty-four student rooms. Rooms and residents are not listed, in the demonstration or anywhere else' });
}
// outdoor and shared spaces that cross buildings
add({ id: 'UNI-QUAD', kind: 'space', type: 'quad', name: 'The Quad', parent: 'UNI-C', spans: ['UNI-LIB', 'UNI-HUM', 'UNI-SUN', 'UNI-ADM'], access: 'public', stepFree: true, plan: { x: 440, y: 275, w: 150, h: 40 }, note: 'The central green; every Central Campus building opens onto it' });
add({ id: 'UNI-PLZ', kind: 'space', type: 'plaza', name: 'Union Plaza', parent: 'UNI-C', spans: ['UNI-SUN', 'UNI-PAC'], access: 'public', stepFree: true, plan: { x: 600, y: 375, w: 110, h: 30 } });
add({ id: 'UNI-NCT', kind: 'space', type: 'courtyard', name: 'North Court', parent: 'UNI-N', spans: ['UNI-ENG', 'UNI-CMP', 'UNI-SCI'], access: 'public', stepFree: true, plan: { x: 450, y: 135, w: 280, h: 22 } });
add({ id: 'UNI-RGN', kind: 'space', type: 'garden', name: 'Residence Green', parent: 'UNI-S', spans: DORMS.map((d) => d[0]), access: 'public', stepFree: true, plan: { x: 620, y: 535, w: 380, h: 30 } });
for (const [id, name, c, x, y] of [['UNI-STN', 'North Loop stop', 'UNI-N', 600, 4], ['UNI-STC', 'Union stop', 'UNI-C', 520, 385], ['UNI-STS', 'Residence stop', 'UNI-S', 800, 575]] as const)
  add({ id, kind: 'space', type: 'transit-stop', name, parent: c, access: 'public', stepFree: true, plan: { x, y, w: 24, h: 14 }, note: 'Campus shuttle; times in the demonstration are a synthetic timetable' });

const R = (id: string, from: string, to: string, minutes: number, stepFree: boolean, via: string, note?: string): Route => ({ id, from, to, minutes, stepFree, via, ...(note ? { note } : {}) });
const routes: Route[] = [
  R('UNI-RT-01', 'UNI-QUAD', 'UNI-NCT', 7, true, 'the Science Walk, a level path with dropped kerbs'), R('UNI-RT-02', 'UNI-QUAD', 'UNI-NCT', 5, false, 'the Library steps', 'Fourteen steps; not step-free'),
  R('UNI-RT-03', 'UNI-QUAD', 'UNI-BUS', 9, true, 'South Avenue'), R('UNI-RT-04', 'UNI-QUAD', 'UNI-RGN', 11, true, 'South Avenue and the Residence Green path'),
  R('UNI-RT-05', 'UNI-STC', 'UNI-STN', 6, true, 'the campus shuttle', 'A low-floor vehicle'), R('UNI-RT-06', 'UNI-STC', 'UNI-STS', 5, true, 'the campus shuttle', 'A low-floor vehicle'),
  R('UNI-RT-07', 'UNI-RGN', 'UNI-REC', 4, true, 'the Residence Green path'), R('UNI-RT-08', 'UNI-NCT', 'UNI-HLT', 3, true, 'the covered link'), R('UNI-RT-09', 'UNI-PLZ', 'UNI-PAC', 1, true, 'the plaza doors'),
  R('UNI-RT-10', 'UNI-BUS', 'UNI-ART', 3, true, 'South Avenue'), R('UNI-RT-11', 'UNI-QUAD', 'UNI-LIB', 2, true, 'the east ramp'), R('UNI-RT-12', 'UNI-QUAD', 'UNI-SUN', 2, true, 'the Quad path'),
];
export const UNIVERSITY: Estate = { world: W, version: 'kvu-2026.11.1', name: 'Kestrel Valley University', fictional: true, nodes, assets, routes };
