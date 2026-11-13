/**
 * The canonical campus of the investor demonstration: one site, six buildings, thirty rooms.
 *
 * Identities come from the Living Campus V2.5.3 source (read statically): the five buildings of the Northstar Innovation Campus
 * (`BUILDINGS`), the named rooms (`HEROES`, `ROOM_CONFIGS`, `V14_ROOM_PROGRAM`) with their archetype, capacity and modelled dimensions.
 * The Northstar Annex and three rooms (4.220, 4.231 and the Northstar town hall) keep the records this demonstration already held.
 *
 *   - 1 reference room (R-ATL-4-218): the complete, connected record (design, installations, baselines, a camera replacement).
 *   - 3 rooms that keep the demonstration's earlier records, unchanged.
 *   - 26 rooms designed from their archetypes: modelled layouts and devices, never surveyed; device positions carry a class template
 *     (category), never an invented make, model or serial.
 *
 * Everything here is synthetic. Nothing is measured.
 */

export type RoomKind = 'reference' | 'earlier' | 'designed';

export interface Building {
  key: string;
  name: string;
  short: string;
  purpose: string;
  floors: number;
  opened: number;
  /** campus-map footprint in map units (V2.5.3 `map`) */
  map: { x: number; y: number; w: number; d: number };
  source: string;
}

export interface RoomOutline {
  id: string;
  building: string;
  floor: number;
  number: string;
  name: string;
  archetype: string;
  capacity: number;
  /** [width, length, ceiling] in metres: MODELED unless the kind is reference (from the design record) */
  dims: [number, number, number];
  kind: RoomKind;
  intent: string;
  source: string;
  /** search aliases a person might type for this room */
  aliases: string[];
  /** rooms 31–45 (docs/recovery/ROOMS_PLAN.md): the engine template when it differs from the archetype's, and its note */
  template?: { template: string; note?: string };
  /** archetype sub-type of the rooms plan (AUD auditorium, LEV tiered stage, POD podcast) */
  subtype?: 'AUD' | 'LEV' | 'POD';
  /** a divisible room: the sections its partitions make (combine / split behaviour) */
  divisible?: { sections: string[] };
  /** a control-tower experience: always labelled non-operational in the demonstration */
  nonOperational?: boolean;
  /** the room's one scenario (rooms plan) */
  scenario?: string;
  /** the plan row (31–45), or the estate row (46–90) of the 90-room estate */
  planRow?: number;
  /** rooms 46–90: the sector of the 90-room roster, its row (ADD-01 … ADD-45), the roster's own archetype name and what the room shows */
  sector?: string;
  roster?: { id: string; archetype: string; showcase: string };
}

export const SITE = { id: 'SITE-NORTH', name: 'Northstar Innovation Campus', enterprise: 'Northstar Industries (synthetic)', source: 'V2.5.3 CAMPUS' } as const;

export const BUILDINGS: Building[] = [
  { key: 'ATL', name: 'Atlas HQ', short: 'Atlas', purpose: 'Headquarters and executive workplace', floors: 7, opened: 2018, map: { x: 2.6, y: 2.6, w: 2.1, d: 1.7 }, source: 'V2.5.3 BUILDINGS' },
  { key: 'MER', name: 'Meridian R&D', short: 'Meridian', purpose: 'Research, engineering labs and design review', floors: 2, opened: 2020, map: { x: 0.2, y: 4.1, w: 2.3, d: 2 }, source: 'V2.5.3 BUILDINGS' },
  { key: 'FRG', name: 'Forge Manufacturing', short: 'Forge', purpose: 'Production floor, plant operations and shift handover', floors: 2, opened: 2016, map: { x: 3.5, y: 5.5, w: 3, d: 2.2 }, source: 'V2.5.3 BUILDINGS' },
  { key: 'BCN', name: 'Beacon Learning Center', short: 'Beacon', purpose: 'Training, onboarding and technical learning', floors: 3, opened: 2021, map: { x: 4.6, y: 0, w: 1.9, d: 1.8 }, source: 'V2.5.3 BUILDINGS' },
  { key: 'HZN', name: 'Horizon Media Center', short: 'Horizon', purpose: 'Townhalls, broadcast and production', floors: 2, opened: 2022, map: { x: 6.9, y: 2.7, w: 2.4, d: 2 }, source: 'V2.5.3 BUILDINGS' },
  { key: 'NST', name: 'Northstar Annex', short: 'Northstar', purpose: 'Events and the town hall of the demonstration’s earlier records', floors: 3, opened: 2019, map: { x: 0.4, y: 0.6, w: 1.9, d: 1.6 }, source: 'earlier demonstration record (estate)' },
];

const R = (id: string, name: string, archetype: string, capacity: number, dims: [number, number, number], kind: RoomKind, intent: string, source: string, aliases: string[] = []): RoomOutline => {
  const [, b, f, n] = /^R-([A-Z]+)-(\d+)-(\d+)$/.exec(id)!;
  return { id, building: b!, floor: Number(f), number: `${Number(f)}.${n}`, name, archetype, capacity, dims, kind, intent, source, aliases };
};

/** The thirty rooms, in campus order (building, floor, number). */
export const ROOMS: RoomOutline[] = [
  // ---- the reference room
  R('R-ATL-4-218', 'Executive Boardroom', 'EXE', 14, [6.6, 9.8, 3], 'reference', 'Give the executive team a hybrid room where remote leaders are seen and heard as clearly as the people at the table.', 'V2.5.3 HEROES + HERO_DIMS', ['boardroom', 'executive', '4.218', 'atlas boardroom', 'reference room']),
  // ---- the demonstration's earlier records (unchanged)
  R('R-ATL-4-220', 'Huddle', 'HUD', 6, [3.6, 3, 2.7], 'earlier', 'A small team starts a hybrid conversation in under a minute.', 'earlier demonstration record (estate)', ['huddle', '4.220']),
  R('R-ATL-4-231', 'Training', 'TRN', 24, [11, 8, 3], 'earlier', 'Teach in-room and remote learners together.', 'earlier demonstration record (estate)', ['training', 'classroom', '4.231']),
  R('R-NST-2-101', 'Town Hall', 'TWN', 200, [24, 18, 6], 'earlier', 'Company meetings in the room and to every site.', 'earlier demonstration record (estate)', ['town hall', 'townhall', 'auditorium', 'northstar']),
  // ---- designed from their archetypes (identities from V2.5.3)
  R('R-ATL-2-129', 'Huddle room with an all-in-one board', 'HUD', 5, [4.4, 5.4, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 ROOM_CONFIGS', ['huddle', 'all-in-one', 'board']),
  R('R-ATL-3-213', 'Collaboration room with networked loudspeakers', 'COL', 10, [5.4, 8.5, 2.8], 'designed', 'Support everyday team meetings where remote colleagues take part as equals.', 'V2.5.3 ROOM_CONFIGS', ['collaboration', 'meeting room', 'conference']),
  R('R-ATL-4-128', 'Carpeted collaboration room', 'COL', 10, [5.2, 8.4, 2.8], 'designed', 'Support everyday team meetings where remote colleagues take part as equals.', 'V2.5.3 ROOM_CONFIGS', ['collaboration', 'meeting room', 'conference']),
  R('R-ATL-5-228', 'Executive briefing room with presenter tracking', 'EXE', 12, [7.4, 10.2, 3], 'designed', 'Brief visiting executives with a presenter the remote audience can follow.', 'V2.5.3 ROOM_CONFIGS', ['briefing', 'executive', 'presenter']),
  R('R-ATL-5-305', 'Whiteboarding collaboration', 'WHB', 8, [5.8, 6.4, 2.9], 'designed', 'A whiteboarding room on its own: one all-in-one board carries the camera, microphones and loudspeakers.', 'V2.5.3 V14_ROOM_PROGRAM', ['whiteboard', 'whiteboarding', 'board']),
  R('R-ATL-6-136', 'Boardroom-style room with delegate microphones', 'EXE', 12, [5.6, 8.8, 2.9], 'designed', 'Formal meetings where every delegate is heard.', 'V2.5.3 ROOM_CONFIGS', ['boardroom', 'delegate', 'goosenecks']),
  R('R-ATL-7-112', 'Strategy Room', 'BRD', 18, [7, 11.6, 3.1], 'designed', 'Hold board-level planning sessions with confidential material and outside advisers, in the room and remote.', 'V2.5.3 HEROES + HERO_DIMS', ['boardroom', 'strategy', 'board room']),
  R('R-MER-1-130', 'Whiteboarding collaboration (labs)', 'WHB', 10, [6.2, 7, 3.1], 'designed', 'A whiteboarding room beside the engineering labs.', 'V2.5.3 V14_ROOM_PROGRAM', ['whiteboard', 'whiteboarding']),
  R('R-MER-1-140', 'Design Review Studio', 'COL', 12, [5.6, 8.6, 2.9], 'designed', 'Review drawings and models at full scale with suppliers who join remotely.', 'V2.5.3 HEROES + HERO_DIMS', ['design review', 'studio']),
  R('R-MER-1-251', 'Boardroom under an open deck', 'BRD', 16, [6, 9.6, 3.9], 'designed', 'Leadership meetings under an open ceiling, with conferencing pendants.', 'V2.5.3 ROOM_CONFIGS', ['boardroom', 'open ceiling']),
  R('R-MER-2-120', 'Collaboration room with wall absorbers', 'COL', 10, [6.8, 8.6, 2.9], 'designed', 'Support everyday team meetings where remote colleagues take part as equals.', 'V2.5.3 ROOM_CONFIGS', ['collaboration', 'acoustic']),
  R('R-MER-2-151', 'Treated collaboration room', 'COL', 10, [6.6, 8.2, 3.4], 'designed', 'Support everyday team meetings where remote colleagues take part as equals.', 'V2.5.3 ROOM_CONFIGS', ['collaboration', 'treated']),
  R('R-MER-2-160', 'AV-over-IP presentation', 'AVP', 14, [9.6, 8.2, 3.2], 'designed', 'Sources reach any of three displays through the AV network.', 'V2.5.3 V14_ROOM_PROGRAM', ['presentation', 'av over ip', 'matrix']),
  R('R-MER-2-305', 'Engineering Lab', 'LAB', 12, [8.4, 9, 3.4], 'designed', 'Let engineers review prototypes with remote test sites while sharing live instrument feeds.', 'V2.5.3 HEROES + HERO_DIMS', ['lab', 'engineering', 'laboratory']),
  R('R-FRG-1-104', 'Plant Collaboration', 'PLT', 14, [6.4, 9.6, 3.6], 'designed', 'Give production shifts a place to hand over, review quality data and reach engineering without leaving the floor.', 'V2.5.3 HEROES + HERO_DIMS', ['plant', 'shift', 'production']),
  R('R-FRG-2-220', 'Operations War Room', 'WAR', 16, [8.6, 9.4, 3.2], 'designed', 'Bring a plant-wide response together with live production and safety feeds on screen within two minutes of the call.', 'V2.5.3 HEROES + HERO_DIMS', ['war room', 'operations', 'incident']),
  R('R-BCN-1-110', 'Learning Commons', 'TRN', 24, [11, 8, 3], 'designed', 'Run onboarding sessions and drop-in learning for new starters.', 'V2.5.3 HEROES', ['learning', 'commons', 'training']),
  R('R-BCN-2-121', 'Dual-board training room', 'TRN', 28, [10.8, 9.8, 3], 'designed', 'Teach in-room and remote learners together, with questions from the room audible to everyone.', 'V2.5.3 ROOM_CONFIGS', ['training', 'classroom']),
  R('R-BCN-3-101', 'Training Studio', 'TRN', 32, [12.4, 11.2, 3.2], 'designed', 'Teach hybrid technical courses where remote learners hear every question asked in the room.', 'V2.5.3 HEROES + HERO_DIMS', ['training', 'studio', 'classroom']),
  R('R-BCN-3-217', 'Huddle room with an all-in-one on a stand', 'HUD', 5, [4.2, 5, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 ROOM_CONFIGS', ['huddle']),
  R('R-BCN-3-225', 'Training room with a high open ceiling', 'TRN', 30, [10.4, 12.6, 4.2], 'designed', 'Teach in-room and remote learners together, with questions from the room audible to everyone.', 'V2.5.3 ROOM_CONFIGS', ['training', 'open ceiling']),
  R('R-BCN-3-236', 'Divisible hall', 'TWN', 180, [27, 15, 5], 'designed', 'One room or three: the partitions decide, and nothing may be heard across a closed one.', 'V2.5.3 ROOM_CONFIGS', ['hall', 'divisible', 'townhall']),
  R('R-HZN-1-120', 'Video Tower', 'TWR', 6, [8.4, 6.6, 3.2], 'designed', 'A monitoring wall of displays for the duty engineer, with a switcher for sources.', 'V2.5.3 V14_ROOM_PROGRAM', ['video wall', 'monitoring', 'tower']),
  R('R-HZN-1-221', 'Collaboration room with an interactive display', 'COL', 8, [5, 7, 2.8], 'designed', 'Support everyday team meetings where remote colleagues take part as equals.', 'V2.5.3 ROOM_CONFIGS', ['collaboration', 'interactive display']),
  R('R-HZN-1-400', 'Townhall', 'TWN', 240, [26, 32, 7.5], 'designed', 'Broadcast company-wide events to every site without a single audible dropout.', 'V2.5.3 HEROES + HERO_DIMS', ['townhall', 'town hall', 'auditorium', 'broadcast']),
  R('R-HZN-2-215', 'Production Control', 'CTL', 8, [7.6, 6.4, 3], 'designed', 'Direct live productions and switch feeds for the townhall and the studio.', 'V2.5.3 HEROES + HERO_DIMS', ['control room', 'production', 'gallery']),
];

/**
 * Fictional regional sites of the rooms plan (rows 40, 42 and 45 sit on them). Not campus buildings: the campus map keeps its six.
 */
const PLAN_SITES: Building[] = [
  { key: 'LKS', name: 'Lakeshore Regional Office', short: 'Lakeshore', purpose: 'Regional training and collaboration (fictional regional site)', floors: 2, opened: 2023, map: { x: 0, y: 0, w: 1.6, d: 1.2 }, source: 'rooms plan (fictional regional site)' },
  { key: 'RDG', name: 'Ridgeview Operations Site', short: 'Ridgeview', purpose: 'Regional emergency operations (fictional regional site)', floors: 1, opened: 2024, map: { x: 0, y: 0, w: 1.4, d: 1.2 }, source: 'rooms plan (fictional regional site)' },
];

/**
 * Fictional sites of the 90-room estate (docs/surpass/ENTERPRISE_90_ROOMS.md). The 90-room roster asks for an enterprise with three
 * primary campuses and satellite sites: the Northstar Innovation Campus above, the Westmere and Highfield buildings of a science and
 * learning park, the Eastgate and Stonebridge buildings of a forum and resilience quarter, and one distribution centre. None is on the
 * campus map, which keeps its six buildings; placement, floors and dimensions are MODELED.
 */
export const ESTATE_SITES: Building[] = [
  { key: 'WMR', name: 'Westmere Health and Research Centre', short: 'Westmere', purpose: 'Occupational health, clinical simulation and research collaboration (fictional site, science and learning park)', floors: 3, opened: 2023, map: { x: 0, y: 0, w: 2, d: 1.6 }, source: '90-room estate (fictional site)' },
  { key: 'HFD', name: 'Highfield Academy', short: 'Highfield', purpose: 'The corporate academy: lecture halls, classrooms and maker space (fictional site, science and learning park)', floors: 3, opened: 2024, map: { x: 0, y: 0, w: 2.2, d: 1.8 }, source: '90-room estate (fictional site)' },
  { key: 'EGT', name: 'Eastgate Forum', short: 'Eastgate', purpose: 'Assemblies, hearings, exhibitions and hospitality (fictional site, forum and resilience quarter)', floors: 2, opened: 2022, map: { x: 0, y: 0, w: 2.6, d: 2 }, source: '90-room estate (fictional site)' },
  { key: 'SBR', name: 'Stonebridge Resilience Centre', short: 'Stonebridge', purpose: 'The second operations site: network, security and emergency operations in another region (fictional site, forum and resilience quarter)', floors: 2, opened: 2024, map: { x: 0, y: 0, w: 1.8, d: 1.4 }, source: '90-room estate (fictional site)' },
  { key: 'MBK', name: 'Millbrook Distribution Centre', short: 'Millbrook', purpose: 'Warehouse dispatch and supply-chain operations (fictional satellite site)', floors: 1, opened: 2021, map: { x: 0, y: 0, w: 3, d: 2 }, source: '90-room estate (fictional satellite site)' },
];
/** The estate's campuses and satellites, by building key (the roster's "three primary campuses and optional regional satellite sites"). */
export const ESTATE_GROUPS: ReadonlyArray<{ name: string; kind: 'campus' | 'satellite'; buildings: readonly string[] }> = [
  { name: 'Northstar Innovation Campus', kind: 'campus', buildings: ['ATL', 'MER', 'FRG', 'BCN', 'HZN', 'NST'] },
  { name: 'Science and Learning Park', kind: 'campus', buildings: ['WMR', 'HFD'] },
  { name: 'Forum and Resilience Quarter', kind: 'campus', buildings: ['EGT', 'SBR'] },
  { name: 'Lakeshore Regional Office', kind: 'satellite', buildings: ['LKS'] },
  { name: 'Ridgeview Operations Site', kind: 'satellite', buildings: ['RDG'] },
  { name: 'Millbrook Distribution Centre', kind: 'satellite', buildings: ['MBK'] },
];
/** Every site that is not on the campus map: the two regional sites of the rooms plan, then the five of the 90-room estate. */
export const REGIONAL_SITES: Building[] = [...PLAN_SITES, ...ESTATE_SITES];

const P = (row: number, id: string, name: string, archetype: string, capacity: number, dims: [number, number, number], intent: string, scenario: string, aliases: string[], extra: Partial<RoomOutline> = {}): RoomOutline =>
  ({ ...R(id, name, archetype, capacity, dims, 'designed', intent, `rooms plan row ${row} (docs/recovery/ROOMS_PLAN.md)`, aliases), scenario, planRow: row, ...extra });
const TOWER = { template: 'boardroom', note: 'no control-tower template in the catalogue: designed from the boardroom template' };
const WARR = { template: 'boardroom', note: 'no war-room template in the catalogue: designed from the boardroom template' };

/**
 * Rooms 31–45 of the 45-room plan (docs/recovery/ROOMS_PLAN.md): the founder's named additions, designed from their archetypes like the
 * 26 above (deterministic, seeded, class templates only). Placement (building, floor, number), capacity and dimensions are MODELED for
 * this demonstration; rows 40, 42 and 45 sit on the fictional regional sites (D15). ROOM_MATRIX_45.md was not recovered: names and
 * archetypes follow the plan, the rest is to confirm.
 */
export const PLAN_ROOMS: RoomOutline[] = [
  P(31, 'R-ATL-1-150', 'Executive Town Hall', 'TWN', 160, [20, 16, 6], 'The executive all-hands: leaders on a stage, every site seeing and hearing them as clearly as the room does.', 'The flagship executive all-hands, rehearsed first in Atlas 4.218: stage cameras follow the speaker and remote questions reach the stage.', ['executive town hall', 'all-hands', 'town hall', 'flagship'], { subtype: 'LEV', template: { template: 'townhall' } }),
  P(32, 'R-BCN-1-300', 'Divisible Multipurpose Town Hall', 'DIV', 220, [30, 18, 5.5], 'One hall or three: the partitions decide, and each configuration has its own requirements.', 'Split for three trainings in the morning, combined for an all-hands after lunch: audio, cameras and control follow the partitions.', ['divisible', 'multipurpose', 'town hall', 'partition'], { divisible: { sections: ['A', 'B', 'C'] }, template: { template: 'townhall', note: 'no divisible template in the catalogue: designed from the town hall template' } }),
  P(33, 'R-HZN-1-500', 'Large Auditorium', 'TWN', 400, [32, 28, 9], 'Fixed-seat presentations and lectures with a remote audience.', 'A product keynote to 400 seats and every site: the far rows must see and hear as well as the front.', ['auditorium', 'keynote', 'lecture hall'], { subtype: 'AUD', template: { template: 'auditorium' } }),
  P(34, 'R-HZN-2-300', 'Global Hybrid All-Hands Studio', 'STU', 40, [14, 12, 5], 'Produce the company all-hands for every region from one studio, with a small live audience.', 'A follow-the-sun all-hands: three regional hosts join the studio and the stream stays up across the hand-offs.', ['all-hands studio', 'broadcast studio', 'global']),
  P(35, 'R-MER-1-300', 'Network Operations Center', 'OPS', 16, [12, 9, 3.4], 'Watch the campus network and the rooms that depend on it from one wall.', 'A distribution switch degrades: the wall shows which rooms lose service and who is dispatched (simulated, non-operational).', ['noc', 'network operations', 'control tower'], { nonOperational: true, template: TOWER }),
  P(36, 'R-MER-2-400', 'Security Operations Center', 'OPS', 14, [11, 8.6, 3.2], 'Security analysts see alerts, cameras and the affected spaces together.', 'An after-hours door alarm in Forge: the analyst follows the alert to the space and its camera (simulated, non-operational).', ['soc', 'security operations', 'control tower'], { nonOperational: true, template: TOWER }),
  P(37, 'R-FRG-2-300', 'Major Incident War Room', 'WAR', 18, [9.4, 10, 3.2], 'Bring the major-incident team together with live feeds and a bridge to remote responders.', 'A plant line stops: the incident commander opens the bridge and the feeds are on the wall within two minutes.', ['major incident', 'war room', 'incident'], { template: WARR }),
  P(38, 'R-ATL-6-300', 'Global Operations Control Tower', 'OPS', 24, [16, 12, 4], 'One view of every site’s rooms, services and incidents, with drill-down to the room.', 'Fleet health across every site: a correlation of three alerts points to one shared switch (simulated, non-operational).', ['control tower', 'global operations', 'operations center'], { nonOperational: true, template: TOWER }),
  P(39, 'R-ATL-7-300', 'Executive Boardroom', 'BRD', 20, [8, 13, 3.2], 'Board meetings with directors in the room and remote, every voice heard at the same level.', 'A quarterly board meeting with two remote directors: a second camera angle keeps them equal.', ['executive boardroom', 'boardroom', 'board']),
  P(40, 'R-LKS-1-110', 'Technical Training Lab', 'TRN', 24, [11, 10, 3.2], 'Hands-on technical training at the regional site, with an instructor who can be remote.', 'A remote instructor teaches the Lakeshore lab: the room camera shows the benches.', ['training lab', 'technical training', 'lab']),
  P(41, 'R-MER-2-310', 'Engineering Project War Room', 'WAR', 12, [8, 8.6, 3], 'A project team’s war room: plans on the wall, suppliers joining remotely.', 'A launch-week stand-up: the plan wall and two remote suppliers, every morning at nine.', ['project war room', 'engineering war room'], { template: WARR }),
  P(42, 'R-LKS-2-120', 'Flexible Collaboration Suite', 'DIV', 30, [14, 9, 3], 'Two meeting rooms or one workshop: a movable wall and systems that follow it.', 'Two client meetings in the morning, one workshop in the afternoon: the suite combines without a technician.', ['flexible suite', 'divisible', 'collaboration suite'], { divisible: { sections: ['North', 'South'] }, template: { template: 'medium_conf', note: 'no divisible template in the catalogue: designed from the medium conference template' } }),
  P(43, 'R-HZN-2-220', 'Broadcast Production Control Room', 'CTL', 10, [9, 7, 3.2], 'Direct the broadcast of the auditorium and the studio from one gallery.', 'The keynote goes live: the director cuts between the sources and the stream stays up.', ['broadcast control', 'production control', 'gallery']),
  P(44, 'R-HZN-1-130', 'Podcast and Media Studio', 'STU', 4, [5, 4.6, 2.9], 'Record podcasts and short media with two to four voices.', 'A two-host podcast with one remote guest: three clean voices, no echo.', ['podcast', 'media studio', 'recording'], { subtype: 'POD' }),
  P(45, 'R-RDG-1-100', 'Emergency Operations Center', 'OPS', 20, [13, 10, 3.4], 'Coordinate an emergency response across sites with agencies joining remotely.', 'A severe-weather drill: the regional teams, the campus and an outside agency on one wall (simulated, non-operational).', ['eoc', 'emergency operations', 'control tower'], { nonOperational: true, template: TOWER }),
];

const X = (n: number, id: string, name: string, archetype: string, capacity: number, dims: [number, number, number], intent: string, scenario: string, aliases: string[], sector: string, rosterArchetype: string, showcase: string, extra: Partial<RoomOutline> = {}): RoomOutline =>
  ({ ...R(id, name, archetype, capacity, dims, 'designed', intent, `90-room estate, row ${45 + n} (ADD-${String(n).padStart(2, '0')}; docs/surpass/ENTERPRISE_90_ROOMS.md)`, aliases), scenario, planRow: 45 + n, sector, roster: { id: `ADD-${String(n).padStart(2, '0')}`, archetype: rosterArchetype, showcase }, ...extra });

/**
 * Rooms 46–90 of the 90-room estate: the roster's 45 additions, nine sectors of five (docs/surpass/ENTERPRISE_90_ROOMS.md has the roster,
 * how each row was compared with the first 45, and where a room's name here differs from the roster's and why). Each is designed by
 * the engine from an existing archetype, exactly like the 45 before it: deterministic, seeded, class templates only. Placement,
 * capacity and dimensions are MODELED; no two rooms share their dimensions. The ids of the first 45 are untouched.
 */
export const ESTATE_ROOMS: RoomOutline[] = [
  X(1, 'R-ATL-6-410', 'Global Executive Briefing Center', 'EXE', 26, [13.2, 9.6, 3.4], 'Brief customers and directors with several audiences and sources in one sitting.', 'A customer briefing with three regions joining: content switches between the room, the regions and a product film without a pause.', ['briefing center', 'ebc', 'executive briefing'], 'Corporate collaboration', 'Global Executive Briefing Center', 'multiple audiences, content switching, executive story'),
  X(2, 'R-ATL-5-410', 'Convertible Client Experience Suite', 'DIV', 36, [15.6, 9.2, 3.2], 'One client suite or two rooms: the plan reverses for the next visit.', 'A product review in the morning and two parallel workshops after lunch: the proposed layout is compared with the current one before anything moves.', ['client suite', 'experience suite', 'convertible'], 'Corporate collaboration', 'Convertible Client Experience Suite', 'reversible room plans and proposed mode', { divisible: { sections: ['A', 'B'] } }),
  X(3, 'R-ATL-7-410', 'Boardroom with integrated translation', 'BRD', 22, [8.6, 14.2, 3.2], 'Board meetings in three languages, each listener on their own channel.', 'A supervisory board meeting in three languages: interpreters join remotely and every seat chooses its channel; captions follow the floor language.', ['translation', 'interpretation boardroom', 'language channels'], 'Corporate collaboration', 'Boardroom with Integrated Translation', 'language routing and accessibility'),
  X(4, 'R-ATL-6-420', 'Multisite Immersive Telepresence Room', 'EXE', 12, [7.4, 9.8, 3], 'A standing meeting between sites that feels like one table.', 'The weekly leadership meeting between three sites: when the link between two of them degrades, the dependency view shows which path carries the call.', ['telepresence', 'immersive', 'multisite'], 'Corporate collaboration', 'Multisite Immersive Telepresence Room', 'intersite codecs, latency and dependency graph'),
  X(5, 'R-ATL-3-410', 'Modular Project War Room', 'WAR', 14, [9.2, 8.2, 3], 'A project room whose displays and tables are rearranged for each phase.', 'A bid team moves from planning to review: the display groups are regrouped and the control page follows the new layout.', ['project room', 'modular war room'], 'Corporate collaboration', 'Modular Project War Room', 'reconfigurable displays, collaboration and control'),
  X(6, 'R-HZN-2-410', 'Broadcast Master Control', 'CTL', 8, [9.8, 7.2, 3.2], 'Watch every outgoing programme feed and switch to the reserve path when one fails.', 'The main programme path fails during a stream: master control sees it on the monitoring wall and moves to the reserve path (simulated).', ['master control', 'mcr', 'broadcast'], 'Broadcast and events', 'Broadcast Master Control', 'SDI/IP signal flow, monitoring and failover'),
  X(7, 'R-HZN-1-410', 'Multi-camera Podcast Studio', 'STU', 6, [6.2, 5.4, 3], 'Record a video podcast with up to four hosts and remote guests.', 'A four-host video podcast with two remote guests: each voice on its own channel and a camera preset per seat.', ['video podcast', 'podcast studio', 'multi-camera'], 'Broadcast and events', 'Multi-camera Podcast Studio', 'microphones, DSP, camera presets and remote guest paths', { subtype: 'POD' }),
  X(8, 'R-HZN-2-420', 'Esports Broadcast Gallery', 'CTL', 12, [11.4, 8.4, 3.4], 'Direct a competitive-gaming broadcast with many screens and no visible delay.', 'A company tournament final: the gallery follows ten player screens and the delay from desk to wall stays inside the target (modelled).', ['esports', 'gaming broadcast', 'gallery'], 'Broadcast and events', 'Esports Broadcast Gallery', 'high-density displays, low-latency routing'),
  X(9, 'R-HZN-1-420', 'Live Hybrid Production Theater', 'TWN', 220, [22, 19, 8], 'Stage a produced show for a seated audience and a stream, with assisted listening in the room.', 'A product launch as a produced show: lighting and sound zones follow the cues, and a guest with a hearing aid follows on the assisted-listening system.', ['production theater', 'theatre', 'show'], 'Broadcast and events', 'Live Hybrid Production Theater', 'zones, show-control and assisted listening', { subtype: 'LEV' }),
  X(10, 'R-NST-1-410', 'Outdoor Event Control Compound', 'CTL', 6, [7.2, 4.8, 2.8], 'Run an outdoor event from portable racks that keep working when the weather or the network does not.', 'A summer all-hands on the lawn: rain is forecast and the uplink drops for a minute; the compound carries on from its portable racks (simulated).', ['outdoor event', 'event compound', 'portable racks'], 'Broadcast and events', 'Outdoor Event Control Compound', 'portable racks, weather and network continuity'),
  X(11, 'R-SBR-1-110', 'Global Network Operations Center', 'OPS', 22, [15.4, 11.2, 3.8], 'Follow the network of every site from the second operations site, rack by rack and port by port.', 'An uplink port flaps at a regional site overnight: the wall shows the rack, the port and the rooms behind it, and the incident is opened (simulated, non-operational).', ['global noc', 'network operations', 'noc'], 'Operations / resilience', 'Global Network Operations Center', 'network rack/port topology and incidents', { nonOperational: true }),
  X(12, 'R-SBR-2-120', 'Cybersecurity Operations Center', 'OPS', 16, [12.6, 9.4, 3.4], 'Analysts work a security incident with only the context their role allows.', 'A suspicious sign-in on a room controller: the analyst sees the device and its room; the people named in the meeting are not shown to that role (simulated, non-operational).', ['cyber soc', 'security operations', 'csoc'], 'Operations / resilience', 'Cybersecurity Operations Center', 'privacy and role-scoped incident context', { nonOperational: true }),
  X(13, 'R-SBR-1-130', 'Alternate Emergency Operations Center', 'OPS', 18, [12.2, 10.6, 3.6], 'Take over the emergency response if the primary centre cannot be used.', 'The primary centre loses power in a drill: the alternate centre takes over, and every hand-over step is kept as evidence (simulated, non-operational).', ['alternate eoc', 'emergency operations', 'backup eoc'], 'Operations / resilience', 'Emergency Operations Center', 'redundancy and evidence trail', { nonOperational: true }),
  X(14, 'R-SBR-2-140', 'Critical Incident Briefing Room', 'WAR', 12, [7.8, 7.2, 3], 'Brief the people who must decide during a critical incident, and record what was decided.', 'A high-priority incident reaches its second hour: the briefing escalates to the sponsor and the next three actions are assigned in the room.', ['incident briefing', 'critical incident'], 'Operations / resilience', 'Critical Incident Briefing Room', 'high-priority escalation and workflow orchestration'),
  X(15, 'R-SBR-2-150', 'Backup Disaster Recovery Command Room', 'WAR', 16, [10.4, 8.8, 3.2], 'Command a recovery from the second site, working from the records that are known to be true.', 'A recovery drill: the command room works from the last accepted baseline of each room and marks what is unknown as unknown.', ['disaster recovery', 'dr command', 'backup command'], 'Operations / resilience', 'Backup Disaster Recovery Command Room', 'failover, source of truth and recovery drill'),
  X(16, 'R-WMR-1-110', 'Telemedicine Consultation Suite', 'FOC', 3, [3.8, 4.4, 2.7], 'A private consultation between a clinician and a colleague at another site.', 'An occupational-health consultation with a colleague at a regional site: nothing is heard outside the suite and the call quality is checked before it starts (modelled).', ['telemedicine', 'consultation', 'occupational health'], 'Health / research', 'Telemedicine Consultation Suite', 'audiovisual privacy, call experience and quality'),
  X(17, 'R-WMR-2-120', 'Clinical Simulation Theater', 'STU', 16, [11.6, 9.4, 3.4], 'Run a clinical scenario with a simulator, capture it and replay it for the debrief.', 'A resuscitation scenario for a medical-device team: the operator marks the moments to return to and the debrief replays them.', ['clinical simulation', 'sim theatre', 'debrief'], 'Health / research', 'Clinical Simulation Theater', 'capture, replay and operator controls'),
  X(18, 'R-WMR-1-130', 'Medical Training Auditorium', 'TWN', 180, [19, 17.4, 6.6], 'Lectures with close-up camera views, a stream, and hearing assistance at every seat.', 'A procedure demonstration to 180 seats and a stream: the close-up view is switched to the main screen and the hearing loop covers the whole room (modelled).', ['medical auditorium', 'lecture', 'training auditorium'], 'Health / research', 'Medical Training Auditorium', 'hearing assistance, camera views and lecture streaming', { subtype: 'AUD' }),
  X(19, 'R-WMR-3-140', 'Research Collaboration Laboratory', 'LAB', 12, [9.6, 7.8, 3], 'Share results between research teams without the files leaving the room’s own network.', 'A joint review of trial data with a partner: content is shared to the wall and nothing is stored on the room system after the session.', ['research lab', 'collaboration lab'], 'Health / research', 'Research Collaboration Laboratory', 'secure file/display sharing, asset lifecycle'),
  X(20, 'R-WMR-1-150', 'Clinical Logistics Coordination Room', 'OPS', 10, [8.8, 7.4, 3], 'Coordinate deliveries of clinical equipment to partner hospitals from one wallboard.', 'A delayed delivery to a partner hospital: the wallboard shows the order and the coordinator sees only the data that role may see (simulated, non-operational).', ['hospital logistics', 'clinical logistics', 'coordination'], 'Health / research', 'Hospital Logistics Coordination Room', 'wallboards, uptime and role-scoped data', { nonOperational: true }),
  X(21, 'R-HFD-1-110', 'Hybrid Tiered Lecture Hall', 'TWN', 150, [16.8, 18.6, 6.2], 'Teach a tiered hall and a remote cohort together, with every question heard.', 'A lecture to 150 seats and 60 remote learners: a question from the back row is picked up, and the far tier can read the projected text (modelled).', ['lecture hall', 'tiered', 'lecture theatre'], 'Education', 'Hybrid Tiered Lecture Hall', 'projection geometry and mic pickup coverage', { subtype: 'LEV' }),
  X(22, 'R-HFD-2-120', 'Active Learning Classroom', 'TRN', 36, [12.8, 11.4, 3.2], 'Six groups each with their own display, and a teacher who can show any of them to all.', 'A workshop in six groups: each group shares from its own devices and the teacher sends one group’s work to every display.', ['active learning', 'classroom', 'group displays'], 'Education', 'Active Learning Classroom', 'many display groups and BYOD switching'),
  X(23, 'R-HFD-2-130', 'Interpretation and Language Lab', 'TRN', 20, [9.4, 8.6, 3], 'Practise interpretation with a headset at every desk and a teacher who can listen to any of them.', 'An interpretation class: twenty headsets, the teacher listens in to one desk and plays the source to all.', ['language lab', 'interpretation lab', 'headsets'], 'Education', 'Interpretation & Language Lab', 'headset network, VoIP and signal routing'),
  X(24, 'R-HFD-1-140', 'Academy Multipurpose Auditorium', 'TWN', 320, [26, 23, 8.4], 'Lecture in the morning, ceremony at noon, film in the evening: one auditorium, three modes.', 'Graduation day at the academy: the room changes from lecture mode to ceremony mode, and each mode is commissioned in its own right.', ['multipurpose auditorium', 'academy auditorium', 'ceremony'], 'Education', 'University Multipurpose Auditorium', 'event mode changes and commissioning', { subtype: 'AUD' }),
  X(25, 'R-HFD-3-150', 'Immersive STEM Maker Studio', 'LAB', 18, [11.2, 9.2, 3.6], 'A maker space whose benches, screens and power follow the project.', 'A robotics week: benches are regrouped and the power each bench draws is checked against its circuit (modelled).', ['maker studio', 'stem', 'makerspace'], 'Education', 'Immersive STEM Maker Studio', 'flexible device positions and power loads'),
  X(26, 'R-MBK-1-110', 'Warehouse Dispatch Operations Center', 'OPS', 10, [9.6, 7.6, 3.6], 'Dispatchers follow docks and routes on displays built for a warehouse floor.', 'A dock scanner network drops: dispatch sees which docks are affected and switches to the manual sheet (simulated, non-operational).', ['dispatch', 'warehouse operations', 'docks'], 'Industrial and logistics', 'Warehouse Dispatch Operations Center', 'ruggedized displays, network dependency', { nonOperational: true }),
  X(27, 'R-FRG-1-410', 'Manufacturing Supervisory Control Room', 'CTL', 8, [8.6, 6.8, 3.2], 'Supervise the production lines from operator consoles that only authorised people may use.', 'A shift change in the control room: the incoming supervisor signs in to the console and the outgoing one is signed out (simulated; nothing here controls a line).', ['supervisory control', 'control room', 'plant control'], 'Industrial and logistics', 'Manufacturing Supervisory Control Room', 'operator consoles, safe access controls', { nonOperational: true }),
  X(28, 'R-FRG-2-420', 'Industrial Quality Review Suite', 'PLT', 8, [7.4, 6.2, 3], 'Review a part under a high-resolution camera with the supplier on the call.', 'A returned part is reviewed with its supplier: the inspection camera is shared at full resolution and the capture is kept with the case.', ['quality review', 'inspection', 'quality suite'], 'Industrial and logistics', 'Industrial Quality Review Suite', 'high-resolution inspection and capture'),
  X(29, 'R-FRG-1-430', 'Factory Safety Training Facility', 'TRN', 24, [11.8, 9.6, 3.4], 'Train safe working on simulated equipment, with completion recorded and verified.', 'Lock-out training for a new shift: each learner completes the simulated procedure and a trainer verifies it; the record never authorises work by itself.', ['safety training', 'factory training', 'simulation'], 'Industrial and logistics', 'Factory Safety Training Facility', 'simulation, SIGNAL and verified training'),
  X(30, 'R-MBK-1-120', 'Supply-Chain Visualization Wall', 'TWR', 10, [10.8, 6.4, 3.8], 'One wall of displays for the whole supply chain, each tile with its named source.', 'A port closure: the wall shows which orders are affected and which data source each tile is reading (simulated).', ['supply chain', 'visualization wall', 'video wall'], 'Industrial and logistics', 'Supply-Chain Visualization Wall', 'huge display matrices and data sources'),
  X(31, 'R-EGT-1-110', 'Hybrid Assembly Chamber', 'TWN', 90, [17.4, 15.2, 5.4], 'A chamber for public and shareholder meetings: a queue of speakers, a record, and remote members with an equal voice.', 'A community consultation with remote members: the chair works the speaker queue and the recording is published with the minutes.', ['assembly chamber', 'council chamber', 'hybrid chamber'], 'Civic and hospitality', 'City Council Hybrid Chamber', 'speaker queuing, transparency and recording'),
  X(32, 'R-EGT-2-120', 'Digital Hearing Room', 'BRD', 28, [9.8, 12.4, 3.4], 'Hold a hearing in which evidence is shown only to the people entitled to see it.', 'An arbitration hearing: an exhibit is shown to the panel and the parties, not to the public gallery, and every display of it is logged.', ['hearing room', 'courtroom', 'evidence'], 'Civic and hospitality', 'Digital Courtroom / Hearing Room', 'secure evidence routing and audit policies'),
  X(33, 'R-EGT-1-130', 'Immersive Heritage Gallery', 'SIG', 60, [18.6, 11.8, 4.6], 'An exhibition whose screens and sound follow a schedule and can be followed by every visitor.', 'The gallery changes exhibit at noon: the schedule moves the content, and each exhibit has captions and an audio description.', ['gallery', 'museum', 'immersive exhibit'], 'Civic and hospitality', 'Museum Immersive Gallery', 'exhibit schedules, signage and accessibility', { template: { template: 'studio', note: 'no gallery template in the catalogue: designed from the studio template' } }),
  X(34, 'R-EGT-1-140', 'Divisible Grand Ballroom', 'DIV', 480, [36, 24, 6.8], 'One ballroom or four rooms: the partitions decide which microphones, loudspeakers and cameras belong together.', 'A conference dinner after four breakout sessions: the four sections combine and no microphone from one section is heard in another while the walls are closed.', ['ballroom', 'divisible ballroom', 'banquet'], 'Civic and hospitality', 'Grand Hotel Divisible Ballroom', 'room combine logic, audio and camera zones', { divisible: { sections: ['A', 'B', 'C', 'D'] } }),
  X(35, 'R-EGT-1-150', 'Interactive Visitor Welcome Gallery', 'REC', 30, [14.2, 9.8, 4.2], 'Welcome visitors, show them where to go and let them carry the route on their phone.', 'A visitor arrives for a hearing: the gallery shows the way and a code puts the route on their phone.', ['welcome gallery', 'visitor centre', 'reception'], 'Civic and hospitality', 'Interactive Visitor Welcome Gallery', 'wayfinding, QR navigation, digital signage', { template: { template: 'medium_conf', note: 'no welcome-gallery template in the catalogue: designed from the medium conference template' } }),
  X(36, 'R-MER-1-410', 'AV-over-IP Interoperability Lab', 'AVP', 10, [8.4, 7.6, 3], 'Prove that devices from different makers work together on one network before they reach a room.', 'Two encoder families on one network: the lab checks what each declares against what the other accepts (class templates; nothing is measured here).', ['avoip lab', 'interoperability', 'multicast'], 'Infrastructure engineering', 'AVoIP Interoperability Lab', 'multicast, QoS, device capability profiles'),
  X(37, 'R-MER-1-420', 'Rack and Network Integration Laboratory', 'LAB', 8, [8.2, 6.6, 3.2], 'Build and test a rack before it ships: cables, power and heat.', 'A rack for the Eastgate ballroom is built: every cable is tested, and the power and heat it would draw are modelled against the room’s supply.', ['rack lab', 'integration lab', 'network lab'], 'Infrastructure engineering', 'Rack / Network Integration Laboratory', 'cable tests, UPS and thermal/power models'),
  X(38, 'R-MER-2-430', 'AV Product Certification Bay', 'LAB', 6, [6.8, 5.6, 3], 'Run a candidate device through the tests that would apply to it in a room.', 'A candidate ceiling microphone: the bay generates the test pack that applies and records the result; approval is a person’s decision.', ['certification bay', 'product approval', 'test bay'], 'Infrastructure engineering', 'AV Product Certification Bay', 'test pack generation and approved devices'),
  X(39, 'R-MER-2-440', 'Robotics and Smart-Sensor Prototype Room', 'LAB', 10, [9, 7.2, 3.4], 'Try a measuring robot or a sensor in a room, with permission, before it is trusted.', 'A measuring-robot trial: every step needs an operator present and a permission, and here every run is a labelled simulation.', ['robotics', 'sensor prototype', 'prototype room'], 'Infrastructure engineering', 'Robotics & Smart-Sensor Prototype Room', 'permissioned measurements and simulation'),
  X(40, 'R-ATL-1-410', 'Building Facilities Operations Room', 'OPS', 8, [8, 6.6, 3], 'See rooms, their use and their energy next to the building systems.', 'A quiet Friday: the room shows which floors could be set back and what that would save, as a modelled scenario (simulated, non-operational).', ['facilities operations', 'building operations', 'bms'], 'Infrastructure engineering', 'Building Facilities Operations Room', 'BMS-linked context, space and energy optimization', { nonOperational: true }),
  X(41, 'R-BCN-2-410', 'Multimodal Accessible Collaboration Room', 'COL', 10, [6.4, 7.8, 2.9], 'A meeting room that works by sight, by hearing and by touch.', 'A team with a deaf colleague and a colleague who uses a wheelchair: captions on the display, a hearing loop, and controls within reach from a seated position.', ['accessible', 'captions', 'hearing loop'], 'Future workplace', 'Multimodal Accessible Collaboration Room', 'caption/hearing/controls adaptations'),
  X(42, 'R-ATL-2-410', 'Interview and Privacy Suite', 'FOC', 4, [4.2, 4.8, 2.7], 'Interviews and private conversations that are not overheard or kept.', 'A remote interview: the candidate is not recorded, and the room’s record shows only that the room was used.', ['interview suite', 'privacy', 'hr'], 'Future workplace', 'HR Interview & Privacy Suite', 'role-based information and media privacy'),
  X(43, 'R-LKS-1-410', 'Distributed Coworking Neighborhood', 'WHB', 28, [16.4, 10.6, 3], 'A neighbourhood of shared desks and tables, booked by the hour.', 'A project team books a corner for the week: the neighbourhood shows what is free and how it has been used (modelled, not counted by sensors).', ['coworking', 'hot desk', 'neighbourhood'], 'Future workplace', 'Distributed Coworking Neighborhood', 'utilization and hot-desk integrations'),
  X(44, 'R-HZN-1-430', 'Mobile Executive Broadcast Kit Base', 'STU', 4, [5.2, 4.2, 2.8], 'Where the travelling broadcast kits are kept, checked and sent out.', 'A kit comes back from a site visit: it is checked in, one cable is replaced, and it is booked out again with its history.', ['broadcast kit', 'mobile kit', 'kit base'], 'Future workplace', 'Mobile Executive Broadcast Kit Base', 'portable device lifecycle and deployments'),
  X(45, 'R-NST-1-420', 'Workplace Transformation Showroom', 'COL', 16, [10.2, 8.4, 3.2], 'Show a room as it is beside the room as proposed, with what the change would cost and return.', 'A leadership tour: the current layout and the proposed one stand side by side, with the modelled cost and the modelled benefit of the change.', ['showroom', 'transformation', 'proposed layout'], 'Future workplace', 'Workplace Transformation Showroom', 'proposed vs current design and project ROI'),
];

/** The 45-room campus of the plan: the thirty above, then rooms 31–45. Every campus, Lite and search screen reads this list; `ROOMS` stays the thirty for the stories that speak of thirty (tours, Search Party S5, the website). */
/**
 * V2.5.3's own rooms that the estate lacked (founder, 13 Nov 2026: "use as many of v2.5.3's rooms as you can"). V2.5.3 generated these
 * from its archetypes, building by building; each is taken as V2.5.3 shows it on its own pages: the id, the type, the seats and, where V2.5.3
 * gives one, its canonical geometry (otherwise V2.5.3's own sizing for that type and seat count, liteSpec). Read from the founder's V2.5.3
 * file offline, nothing run but its rendering. Devices come from the class templates for the type, like every designed room. Not yet here:
 * Forge's five plant VoIP zones on floor 0 (the campus model numbers floors from 1).
 */
export const V253_ROOMS: RoomOutline[] = [
  R('R-BCN-1-216', 'Huddle Room', 'HUD', 5, [4.4, 5.2, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['huddle room', '1.216']),
  R('R-BCN-1-224', 'Huddle Room', 'HUD', 6, [4.4, 5.2, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 canonical geometry; capacity as V2.5.3 shows it)', ['huddle room', '1.224']),
  R('R-BCN-1-233', 'Collaboration Room', 'COL', 9, [4.8, 7.8, 2.8], 'designed', 'Support everyday team meetings where remote colleagues take part as equals.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['collaboration room', '1.233']),
  R('R-BCN-2-111', 'Collaboration Room', 'COL', 9, [4.8, 7.8, 2.8], 'designed', 'Support everyday team meetings where remote colleagues take part as equals.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['collaboration room', '2.111']),
  R('R-BCN-2-129', 'Huddle Room', 'HUD', 6, [4.4, 5.2, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 canonical geometry; capacity as V2.5.3 shows it)', ['huddle room', '2.129']),
  R('R-BCN-2-133', 'Huddle Room', 'HUD', 5, [4.4, 5.2, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['huddle room', '2.133']),
  R('R-BCN-3-237', 'Whiteboarding Collaboration', 'WHB', 12, [7.2, 6.8, 3.4], 'designed', 'A whiteboarding room on its own: one all-in-one board carries the camera, microphones and loudspeakers.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 canonical geometry; capacity as V2.5.3 shows it)', ['whiteboarding collaboration', '3.237']),
  R('R-ATL-1-210', 'Collaboration Room', 'COL', 9, [4.8, 7.8, 2.8], 'designed', 'Support everyday team meetings where remote colleagues take part as equals.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['collaboration room', '1.210']),
  R('R-ATL-1-218', 'Focus Room', 'FOC', 2, [3.9, 3.9, 2.7], 'designed', 'Give one or two people a quiet place to join a call without booking a larger room.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 canonical geometry; capacity as V2.5.3 shows it)', ['focus room', '1.218']),
  R('R-ATL-1-228', 'Collaboration Room', 'COL', 9, [4.8, 7.8, 2.8], 'designed', 'Support everyday team meetings where remote colleagues take part as equals.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['collaboration room', '1.228']),
  R('R-ATL-1-233', 'Huddle Room', 'HUD', 5, [4.4, 5.2, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 canonical geometry; capacity as V2.5.3 shows it)', ['huddle room', '1.233']),
  R('R-ATL-2-109', 'Huddle Room', 'HUD', 5, [4.4, 5.2, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 canonical geometry; capacity as V2.5.3 shows it)', ['huddle room', '2.109']),
  R('R-ATL-2-118', 'Collaboration Room', 'COL', 11, [4.8, 8.5, 2.8], 'designed', 'Support everyday team meetings where remote colleagues take part as equals.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['collaboration room', '2.118']),
  R('R-ATL-2-133', 'Focus Room', 'FOC', 3, [3.9, 3.9, 2.7], 'designed', 'Give one or two people a quiet place to join a call without booking a larger room.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 canonical geometry; capacity as V2.5.3 shows it)', ['focus room', '2.133']),
  R('R-ATL-3-218', 'Collaboration Room', 'COL', 12, [4.8, 8.5, 2.8], 'designed', 'Support everyday team meetings where remote colleagues take part as equals.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['collaboration room', '3.218']),
  R('R-ATL-3-224', 'Huddle Room', 'HUD', 5, [4.4, 5.2, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['huddle room', '3.224']),
  R('R-ATL-3-236', 'Focus Room', 'FOC', 2, [3.9, 3.9, 2.7], 'designed', 'Give one or two people a quiet place to join a call without booking a larger room.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 canonical geometry; capacity as V2.5.3 shows it)', ['focus room', '3.236']),
  R('R-ATL-4-119', 'Huddle Room', 'HUD', 4, [4.4, 5.2, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 canonical geometry; capacity as V2.5.3 shows it)', ['huddle room', '4.119']),
  R('R-ATL-4-137', 'Huddle Room', 'HUD', 6, [4.4, 5.4, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 canonical geometry; capacity as V2.5.3 shows it)', ['huddle room', '4.137']),
  R('R-ATL-4-144', 'Huddle Room', 'HUD', 5, [4.4, 5.2, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['huddle room', '4.144']),
  R('R-ATL-5-211', 'Collaboration Room', 'COL', 10, [4.8, 7.8, 2.8], 'designed', 'Support everyday team meetings where remote colleagues take part as equals.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['collaboration room', '5.211']),
  R('R-ATL-5-218', 'Huddle Room', 'HUD', 6, [4.4, 5.2, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['huddle room', '5.218']),
  R('R-ATL-5-236', 'Huddle Room', 'HUD', 6, [4.4, 5.2, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['huddle room', '5.236']),
  R('R-ATL-6-110', 'Collaboration Room', 'COL', 11, [4.8, 8.5, 2.8], 'designed', 'Support everyday team meetings where remote colleagues take part as equals.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['collaboration room', '6.110']),
  R('R-ATL-6-116', 'Huddle Room', 'HUD', 6, [4.4, 5.2, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['huddle room', '6.116']),
  R('R-ATL-6-127', 'Focus Room', 'FOC', 4, [3.9, 3.9, 2.7], 'designed', 'Give one or two people a quiet place to join a call without booking a larger room.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 canonical geometry; capacity as V2.5.3 shows it)', ['focus room', '6.127']),
  R('R-ATL-7-220', 'Huddle Room', 'HUD', 5, [4.4, 5.2, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 canonical geometry; capacity as V2.5.3 shows it)', ['huddle room', '7.220']),
  R('R-ATL-7-227', 'Collaboration Room', 'COL', 12, [4.8, 8.5, 2.8], 'designed', 'Support everyday team meetings where remote colleagues take part as equals.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['collaboration room', '7.227']),
  R('R-ATL-7-232', 'Focus Room', 'FOC', 4, [3.9, 3.9, 2.7], 'designed', 'Give one or two people a quiet place to join a call without booking a larger room.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 canonical geometry; capacity as V2.5.3 shows it)', ['focus room', '7.232']),
  R('R-ATL-7-241', 'Huddle Room', 'HUD', 6, [4.4, 5.2, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 canonical geometry; capacity as V2.5.3 shows it)', ['huddle room', '7.241']),
  R('R-MER-1-220', 'Engineering Lab', 'LAB', 11, [7.9, 8.5, 3.4], 'designed', 'Let engineers review prototypes and instrument feeds with remote test sites.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['engineering lab', '1.220']),
  R('R-MER-1-227', 'Engineering Lab', 'LAB', 20, [8.1, 11.5, 3.4], 'designed', 'Let engineers review prototypes and instrument feeds with remote test sites.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['engineering lab', '1.227']),
  R('R-MER-1-237', 'Huddle Room', 'HUD', 5, [4.4, 5.2, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['huddle room', '1.237']),
  R('R-MER-1-243', 'Focus Room', 'FOC', 2, [3.9, 3.9, 2.7], 'designed', 'Give one or two people a quiet place to join a call without booking a larger room.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 canonical geometry; capacity as V2.5.3 shows it)', ['focus room', '1.243']),
  R('R-MER-2-124', 'Collaboration Room', 'COL', 10, [4.8, 7.8, 2.8], 'designed', 'Support everyday team meetings where remote colleagues take part as equals.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['collaboration room', '2.124']),
  R('R-MER-2-134', 'Focus Room', 'FOC', 2, [3.9, 3.9, 2.7], 'designed', 'Give one or two people a quiet place to join a call without booking a larger room.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 canonical geometry; capacity as V2.5.3 shows it)', ['focus room', '2.134']),
  R('R-MER-2-144', 'Collaboration Room', 'COL', 8, [4.8, 7.1, 2.8], 'designed', 'Support everyday team meetings where remote colleagues take part as equals.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['collaboration room', '2.144']),
  R('R-HZN-1-224', 'Studio', 'STU', 9, [8.4, 9.2, 4.2], 'designed', 'Record and stream presentations with broadcast-quality sound and picture.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; V2.5.3 shows no seat count for its studios: the middle of its studio range (6–12))', ['studio', '1.224']),
  R('R-HZN-1-232', 'Studio', 'STU', 9, [8.4, 9.2, 4.2], 'designed', 'Record and stream presentations with broadcast-quality sound and picture.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; V2.5.3 shows no seat count for its studios: the middle of its studio range (6–12))', ['studio', '1.232']),
  R('R-HZN-2-117', 'Huddle Room', 'HUD', 5, [4.4, 5.2, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['huddle room', '2.117']),
  R('R-HZN-2-129', 'Huddle Room', 'HUD', 6, [4.4, 5.2, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['huddle room', '2.129']),
  R('R-HZN-2-136', 'Huddle Room', 'HUD', 5, [4.4, 5.2, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 canonical geometry; capacity as V2.5.3 shows it)', ['huddle room', '2.136']),
  R('R-FRG-1-218', 'Collaboration Room', 'COL', 11, [4.8, 8.5, 2.8], 'designed', 'Support everyday team meetings where remote colleagues take part as equals.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['collaboration room', '1.218']),
  R('R-FRG-1-226', 'Plant Collaboration', 'PLT', 24, [5.7, 13, 3.6], 'designed', 'Give production shifts a place to hand over and reach engineering without leaving the floor.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['plant collaboration', '1.226']),
  R('R-FRG-1-237', 'Training Room', 'TRN', 28, [9.8, 10.8, 3.1], 'designed', 'Teach in-room and remote learners together, with questions from the room audible to everyone.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['training room', '1.237']),
  R('R-FRG-1-241', 'Huddle Room', 'HUD', 5, [4.4, 5.2, 2.7], 'designed', 'Let a small team start a hybrid conversation in under a minute.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['huddle room', '1.241']),
  R('R-FRG-2-118', 'Plant Collaboration', 'PLT', 14, [5.7, 9.3, 3.6], 'designed', 'Give production shifts a place to hand over and reach engineering without leaving the floor.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['plant collaboration', '2.118']),
  R('R-FRG-2-129', 'Plant Collaboration', 'PLT', 11, [5.5, 8.5, 3.6], 'designed', 'Give production shifts a place to hand over and reach engineering without leaving the floor.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['plant collaboration', '2.129']),
  R('R-FRG-2-136', 'Collaboration Room', 'COL', 16, [5, 10, 3], 'designed', 'Support everyday team meetings where remote colleagues take part as equals.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['collaboration room', '2.136']),
  R('R-FRG-2-141', 'Collaboration Room', 'COL', 8, [4.8, 7.1, 2.8], 'designed', 'Support everyday team meetings where remote colleagues take part as equals.', 'V2.5.3 campus, read from V2.5.3 (V2.5.3 liteSpec for its type and seats; capacity as V2.5.3 shows it)', ['collaboration room', '2.141']),
];

export const CAMPUS_ROOMS: RoomOutline[] = [...ROOMS, ...PLAN_ROOMS, ...ESTATE_ROOMS, ...V253_ROOMS];
/** The first 45 (the rooms plan), for the records and stories that speak of forty-five. */
export const PLAN_45: RoomOutline[] = [...ROOMS, ...PLAN_ROOMS];

export const REFERENCE_ROOM_ID = 'R-ATL-4-218';
export const roomById = (id: string): RoomOutline | undefined => CAMPUS_ROOMS.find((r) => r.id === id);
export const buildingByKey = (k: string): Building | undefined => BUILDINGS.find((b) => b.key === k) || REGIONAL_SITES.find((b) => b.key === k);
export const roomsIn = (b: string, floor?: number): RoomOutline[] => CAMPUS_ROOMS.filter((r) => r.building === b && (floor == null || r.floor === floor));
/** e.g. "Atlas 4.218" */
export const shortName = (r: RoomOutline): string => `${buildingByKey(r.building)?.short || r.building} ${r.number}`;
export const fullName = (r: RoomOutline): string => `${shortName(r)} — ${r.name}`;
export const roomHref = (r: RoomOutline): string => `#/campus/${r.building}/${r.floor}/${r.id}`;

/** Archetype names (V2.5.3 ARCHETYPES). */
export const ARCHETYPE_NAME: Record<string, string> = {
  FOC: 'Focus Room', HUD: 'Huddle Room', COL: 'Collaboration Room', EXE: 'Executive Collaboration', BRD: 'Boardroom', TRN: 'Training Room', TWN: 'Townhall',
  CTL: 'Control Room', LAB: 'Engineering Lab', PLT: 'Plant Collaboration', WAR: 'Operations War Room', STU: 'Studio', WHB: 'Whiteboarding Collaboration', TWR: 'Video Tower', AVP: 'AV-over-IP Presentation',
  // rooms plan (D14): new archetypes
  DIV: 'Divisible Room', REC: 'Reception', SIG: 'Concourse and Signage', OPS: 'Operations Control Tower',
};

/**
 * The engine template each archetype is designed from. Archetypes the commissioning catalogue has no template for use the nearest one and
 * say so (`templateNote`): a class template, never a surveyed room.
 */
export const TEMPLATE_FOR: Record<string, { template: string; note?: string }> = {
  FOC: { template: 'private_office' }, HUD: { template: 'huddle' }, COL: { template: 'medium_conf' }, EXE: { template: 'executive' }, BRD: { template: 'boardroom' },
  TRN: { template: 'training' }, TWN: { template: 'townhall' }, STU: { template: 'studio' },
  CTL: { template: 'studio', note: 'no control-room template in the catalogue: designed from the studio template' },
  LAB: { template: 'medium_conf', note: 'no lab template in the catalogue: designed from the medium conference template' },
  PLT: { template: 'medium_conf', note: 'no plant template in the catalogue: designed from the medium conference template' },
  WAR: { template: 'boardroom', note: 'no war-room template in the catalogue: designed from the boardroom template' },
  WHB: { template: 'collab', note: 'no whiteboarding template in the catalogue: designed from the collaboration-space template' },
  TWR: { template: 'studio', note: 'no video-tower template in the catalogue: designed from the studio template' },
  AVP: { template: 'medium_conf', note: 'no AV-over-IP template in the catalogue: designed from the medium conference template' },
  DIV: { template: 'townhall', note: 'no divisible template in the catalogue: designed from the town hall template' },
  REC: { template: 'lobby' },
  SIG: { template: 'lobby', note: 'no concourse template in the catalogue: designed from the lobby template' },
  OPS: { template: 'boardroom', note: 'no control-tower template in the catalogue: designed from the boardroom template' },
};

/** Deterministic seeded random numbers (FNV-1a seed, mulberry32): the same room always gets the same design. */
export function seeded(seed: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) { h ^= seed.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  let a = h;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
