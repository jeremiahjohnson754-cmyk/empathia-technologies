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
  /** the plan row (31–45) */
  planRow?: number;
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
export const REGIONAL_SITES: Building[] = [
  { key: 'LKS', name: 'Lakeshore Regional Office', short: 'Lakeshore', purpose: 'Regional training and collaboration (fictional regional site)', floors: 2, opened: 2023, map: { x: 0, y: 0, w: 1.6, d: 1.2 }, source: 'rooms plan (fictional regional site)' },
  { key: 'RDG', name: 'Ridgeview Operations Site', short: 'Ridgeview', purpose: 'Regional emergency operations (fictional regional site)', floors: 1, opened: 2024, map: { x: 0, y: 0, w: 1.4, d: 1.2 }, source: 'rooms plan (fictional regional site)' },
];

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

/** The 45-room campus of the plan: the thirty above, then rooms 31–45. Every campus, Lite and search screen reads this list; `ROOMS` stays the thirty for the stories that speak of thirty (tours, Search Party S5, the website). */
export const CAMPUS_ROOMS: RoomOutline[] = [...ROOMS, ...PLAN_ROOMS];

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
