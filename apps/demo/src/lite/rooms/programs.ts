/**
 * Room programs (13 Nov 2026): what a room of a given type actually holds, laid out as a designer would, from the estate's record (size,
 * places, equipment classes). A program replaces "the nearest V2.5.3 type" where that type was wrong for the room — a stadium suite is a
 * hospitality box with a glass front on the bowl, not a boardroom. Each program also names the places a person would really be, for the
 * eye-level views. Fictional and illustrative: modelled from the record, never surveyed.
 */
export type Side = 'N' | 'E' | 'S' | 'W';
export interface WallSpec { glass?: boolean; door?: { at: number; w: number; hinge: 'lo' | 'hi' }; slide?: { at: number; w: number }; finish?: string; /** a low wall of this height (an open position) */ parapet?: number; /** no wall (open to the bowl) */ none?: boolean }
export interface Piece { id: string; kind: string; label: string; x: number; y: number; rot?: number; w: number; d: number; h: number; z?: number; at?: Array<[number, number]>; note?: string; device?: string; /** how many (monitors on a desk run, seats in a row) */ n?: number }
/** `pitch` follows the L3 camera: 36 is level, higher looks down (3° for every step of 9 above 36), lower looks up */
export interface EyeSpot { key: string; label: string; says: string; x: number; y: number; z: number; yaw: number; pitch: number }
export interface Program {
  key: string; title: string; summary: string; w: number; d: number; H: number; floor: 'oak' | 'carpet' | 'concrete'; walls: Record<Side, WallSpec>;
  pieces: Piece[]; eyes: EyeSpot[]; lights: Array<[number, number]>; speakers: Array<[number, number]>; outside: 'suite' | 'club' | 'window' | 'open' | null; hero: { yaw: number; pitch: number; zoom?: number };
}
export interface RoomRecord { id: string; type: string; name: string; dims?: [number, number, number]; capacity?: number; assets?: Array<{ kind: string; label: string; cls: string; qty: number; state: string }> }

/** the room types that have an Empathia program, and the ones still being redesigned (shown as such rather than as a wrong layout) */
export const PROGRAM_TYPES = new Set(['suite', 'green-room', 'speaker-prep', 'vip-lounge', 'press-box', 'commentary-booth', 'mix-position', 'club']);
export const REDESIGN_TYPES = new Set<string>([]);
export const hasProgram = (type: string) => PROGRAM_TYPES.has(type);

const yawTo = (x: number, y: number, tx: number, ty: number) => Math.round((Math.atan2(-(tx - x), -(ty - y)) * 180) / Math.PI);

/** A stadium suite: a glass front on the bowl with a balcony of padded seats beyond it; inside, a drink rail along the glass (one end lowered
 *  for a wheelchair user), a lounge on a rug, a high table, a bar with open shelving on the side wall, displays on the side walls, a door
 *  from the members' corridor. The record's "twelve balcony seats" are two rows of six. */
function suite(r: RoomRecord): Program {
  const [L, Wd, H0] = r.dims || [7.5, 5, 3]; const w = Math.max(L, Wd), d = Math.min(L, Wd), H = Math.min(H0 || 3, 3.2);
  const disp = r.assets?.find((a) => a.kind === 'display'); const ctl = r.assets?.find((a) => a.kind === 'control'); const spk = r.assets?.find((a) => a.kind === 'loudspeaker');
  const dev = (a: typeof disp, n?: number) => (a ? `${a.label}${n ? ` ${n}` : ''}: ${a.cls}, ${a.state === 'IN_SERVICE' ? 'in service' : a.state.toLowerCase()} (on record)` : undefined);
  const k = w / 7.5;   // a suite drawn larger or smaller than the standard one keeps its proportions
  const railY = 0.37, stoolY = 0.9; const r0 = 1.75 * k, r1 = Math.min(w - 1.55, 5.85 * k); const n = Math.max(3, Math.floor((r1 - r0 - 0.2) / 0.7));
  const stools: Array<[number, number]> = Array.from({ length: n }, (_, i) => [r0 + 0.45 + i * ((r1 - r0 - 0.9) / Math.max(1, n - 1)), stoolY]);
  const tx = w - 1.35, ty = d * 0.52, lx = w * 0.4; const doorX = w - 0.62;
  const nb = Math.max(2, Math.round(w / 1.25)); const bay = (w / nb) * (Math.floor(nb / 2) - 0.5);   // the middle of a glass bay, not a mullion, in front of the eyes
  const pieces: Piece[] = [
    { id: 'rail', kind: 'rail', label: 'Drink rail along the glass', x: (r0 + r1) / 2, y: railY, w: r1 - r0, d: 0.36, h: 1.05, note: 'stone top at 1.05 m' },
    { id: 'rail-low', kind: 'rail', label: 'Lowered rail for a wheelchair user', x: (0.75 + r0) / 2, y: railY, w: r0 - 0.75, d: 0.36, h: 0.78, note: 'at 0.78 m, knee space under it' },
    { id: 'stools', kind: 'stools', label: `Rail stools (${n})`, x: (r0 + r1) / 2, y: stoolY, w: r1 - r0, d: 0.45, h: 0.76, at: stools, note: 'seat at 0.76 m' },
    { id: 'bar', kind: 'bar', label: 'Bar: stone top, glass-front refrigerator, open shelving', x: 0.33, y: d * 0.6, rot: 90, w: Math.min(2.4, d - 2.5), d: 0.66, h: 0.92 },
    { id: 'shelves', kind: 'shelves', label: 'Open shelving behind the bar', x: 0.13, y: d * 0.6, rot: 90, w: Math.min(2.2, d - 2.7), d: 0.26, h: 0.8, z: 1.45 },
    { id: 'rug', kind: 'rug', label: 'Rug', x: lx, y: d * 0.6, w: 2.9 * k, d: 2.1, h: 0.01 },
    { id: 'sofa', kind: 'sofa', label: 'Three-seat sofa facing the glass', x: lx, y: d * 0.72, w: 2.1, d: 0.88, h: 0.82 },
    { id: 'lowtable', kind: 'lowtable', label: 'Low table', x: lx, y: d * 0.52, w: 1.1, d: 0.6, h: 0.38 },
    { id: 'arm', kind: 'armchair', label: 'Armchair', x: lx + 1.55, y: d * 0.52, rot: -90, w: 0.86, d: 0.88, h: 0.8 },
    { id: 'hightable', kind: 'hightable', label: 'High table for three', x: tx, y: ty, w: 0.75, d: 0.75, h: 1.05, at: [[tx - 0.6, ty], [tx, ty - 0.6], [tx, ty + 0.6]] },
    { id: 'pendants', kind: 'pendants', label: 'Pendant lights over the high table', x: tx, y: ty, w: 0.6, d: 0.3, h: 0.2, z: 1.9 },
    { id: 'plant', kind: 'plant', label: 'Planter', x: 0.42, y: d - 0.38, w: 0.48, d: 0.48, h: 1.7 },
    { id: 'display-1', kind: 'display', label: 'Display on the bar wall', x: 0.04, y: 1.2, rot: 90, w: 1.23, d: 0.05, h: 0.71, z: 1.35, device: dev(disp, 1) },
    { id: 'display-2', kind: 'display', label: 'Display on the far wall', x: w - 0.04, y: d * 0.3, rot: -90, w: 1.23, d: 0.05, h: 0.71, z: 1.35, device: dev(disp, 2) },
    { id: 'panel', kind: 'panel', label: 'Touch panel by the door', x: w - 0.03, y: d - 1.45, rot: -90, w: 0.2, d: 0.03, h: 0.14, z: 1.2, device: dev(ctl) },
    { id: 'balcony-a', kind: 'seats', label: 'Balcony seats, front row (6)', x: w / 2, y: -0.55, w: 3.7, d: 0.5, h: 0.92, z: -0.12, note: 'padded, with arms' },
    { id: 'balcony-b', kind: 'seats', label: 'Balcony seats, back row (6)', x: w / 2, y: -1.5, w: 3.7, d: 0.5, h: 0.92, z: -0.52, note: 'padded, with arms' },
  ];
  const lights: Array<[number, number]> = [[w * 0.25, 1.4], [w * 0.5, 1.4], [w * 0.75, 1.4], [w * 0.3, d * 0.6], [w * 0.6, d * 0.6], [0.9, d * 0.5], [0.9, d * 0.78]];
  const ns = Math.max(1, Math.min(4, spk?.qty || 2)); const speakers: Array<[number, number]> = Array.from({ length: ns }, (_, i): [number, number] => [w * ((i + 1) / (ns + 1)), d * 0.38]);
  const eyes: EyeSpot[] = [
    { key: 'rail', label: 'At the rail', says: 'on a stool at the glass, eyes at 1.5 m, looking at the pitch', x: bay, y: stoolY + 0.05, z: 1.5, yaw: 0, pitch: 66 },
    { key: 'balcony', label: 'Balcony seat', says: 'front row of the balcony, seated, eyes at 1.0 m above the room floor', x: bay, y: -0.5, z: 1.03, yaw: 0, pitch: 69 },
    { key: 'sofa', label: 'On the sofa', says: 'seated in the lounge, eyes at 1.15 m', x: lx, y: d * 0.71, z: 1.15, yaw: 0, pitch: 54 },
    { key: 'door', label: 'Doorway', says: 'just inside the door from the members’ corridor, standing', x: doorX, y: d - 0.3, z: 1.6, yaw: yawTo(doorX, d - 0.3, w * 0.4, 0.6), pitch: 48 },
    { key: 'wheel', label: 'Wheelchair place', says: 'at the lowered rail, eyes at 1.2 m', x: (0.75 + r0) / 2, y: 1.05, z: 1.2, yaw: 0, pitch: 60 },
  ];
  return {
    key: 'suite', title: 'Stadium suite', summary: `A glass front on the bowl and a balcony of ${12} padded seats; inside, a drink rail, a lounge, a high table and a bar.`,
    w, d, H, floor: 'oak', walls: { N: { glass: true, slide: { at: w - 0.75, w: 1.2 } }, S: { door: { at: doorX, w: 0.95, hinge: 'hi' } }, W: { finish: 'url(#rm-slats)' }, E: {} },
    pieces, eyes, lights, speakers, outside: 'suite', hero: { yaw: 24, pitch: 36, zoom: 1.15 },
  };
}

// ---------------------------------------------------------------------------------------------------------------- shared helpers
const sizeOf = (r: RoomRecord, def: [number, number, number]) => { const [L, Wd, H0] = r.dims || def; return { w: Math.max(L, Wd), d: Math.min(L, Wd), H: Math.min(H0 || def[2], 4.5) }; };
const devOf = (r: RoomRecord, kind: string, n?: number) => { const a = r.assets?.find((x) => x.kind === kind); return a ? `${a.label}${n ? ` ${n}` : ''}: ${a.cls}, ${a.state === 'IN_SERVICE' ? 'in service' : a.state.toLowerCase()} (on record)` : undefined; };
const grid = (x0: number, x1: number, y0: number, y1: number, sx: number, sy: number): Array<[number, number]> => { const out: Array<[number, number]> = []; const nx = Math.max(1, Math.floor((x1 - x0) / sx)), ny = Math.max(1, Math.floor((y1 - y0) / sy));
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) out.push([x0 + (x1 - x0) * (i + 0.5) / nx, y0 + (y1 - y0) * (j + 0.5) / ny]); return out; };
const lightGrid = (w: number, d: number, s = 1.8): Array<[number, number]> => grid(0.4, w - 0.4, 0.4, d - 0.4, s, s);
const plain = (door: number, hinge: 'lo' | 'hi' = 'hi'): Record<Side, WallSpec> => ({ N: {}, E: {}, S: { door: { at: door, w: 0.95, hinge } }, W: {} });
const eye = (key: string, label: string, says: string, x: number, y: number, z: number, tx: number, ty: number, pitch = 40): EyeSpot => ({ key, label, says, x, y, z, yaw: yawTo(x, y, tx, ty), pitch });

/** A green room: a dressing counter with a lit mirror along the front wall, a sofa and an armchair round a low table, a coffee station with
 *  a small refrigerator on the side wall, the programme monitor on the other. */
function greenRoom(r: RoomRecord): Program {
  const { w, d, H } = sizeOf(r, [6, 5, 3]); const doorX = w - 0.75; const vx = Math.max(1.6, (w - 1.2) / 2 + 0.1), vw = Math.min(3, w - 1.8); const lx = Math.min(w * 0.4, w - 2.6);
  const pieces: Piece[] = [
    { id: 'vanity', kind: 'vanity', label: 'Dressing counter with a lit mirror', x: vx, y: 0.32, w: vw, d: 0.52, h: 0.76, note: 'mirror lamps over it' },
    { id: 'vchairs', kind: 'chairs', label: 'Chairs at the mirror (2)', x: vx, y: 0.98, w: 1.4, d: 0.5, h: 0.9, at: [[vx - vw / 4, 0.98], [vx + vw / 4, 0.98]] },
    { id: 'rug', kind: 'rug', label: 'Rug', x: lx + 0.5, y: d - 1.25, w: 2.6, d: 1.8, h: 0.01 },
    { id: 'sofa', kind: 'sofa', label: 'Sofa', x: lx, y: d - 0.55, w: Math.min(2.0, w * 0.4), d: 0.88, h: 0.82 },
    { id: 'lowtable', kind: 'lowtable', label: 'Low table', x: lx, y: d - 1.55, w: 0.95, d: 0.55, h: 0.38 },
    { id: 'arm', kind: 'armchair', label: 'Armchair', x: lx + 1.5, y: d - 1.55, rot: -90, w: 0.84, d: 0.88, h: 0.8 },
    { id: 'coffee', kind: 'bar', label: 'Coffee station with a small refrigerator', x: 0.32, y: Math.max(1.9, d * 0.52), rot: 90, w: Math.min(1.6, d - 2.6), d: 0.6, h: 0.92 },
    { id: 'display', kind: 'display', label: 'Programme monitor', x: w - 0.04, y: Math.max(1.4, d * 0.36), rot: -90, w: 0.97, d: 0.05, h: 0.55, z: 1.45, device: devOf(r, 'display') },
    { id: 'plant', kind: 'plant', label: 'Planter', x: w - 0.4, y: 0.42, w: 0.48, d: 0.48, h: 1.4 },
  ];
  return { key: 'green-room', title: 'Green room', summary: 'A dressing counter with a lit mirror, a sofa and armchair, a coffee station and the programme monitor.', w, d, H, floor: 'carpet', walls: { ...plain(doorX), W: { finish: 'url(#rm-slats)' } },
    pieces, lights: lightGrid(w, d, 1.6), speakers: [[w / 2, d / 2]], outside: null, hero: { yaw: 28, pitch: 40, zoom: 1.1 },
    eyes: [eye('mirror', 'At the mirror', 'seated at the dressing counter, eyes at 1.2 m', vx - vw / 4, 1.0, 1.2, vx - vw / 4, 0, 44), eye('sofa', 'On the sofa', 'seated, eyes at 1.15 m', lx, d - 0.6, 1.15, lx, 0, 40),
      eye('door', 'Doorway', 'just inside the door, standing', doorX, d - 0.3, 1.6, w * 0.35, 0.5, 44), eye('wheel', 'Wheelchair place', 'at the low table, eyes at 1.2 m', lx - 0.9, d - 1.55, 1.2, lx + 1.5, d - 1.55, 42)] };
}

/** A speaker preparation room: two slide-check stations on the side wall, a confidence monitor and a countdown timer on the front wall with
 *  a taped rehearsal mark facing them, a table for four, a sofa and a full-length mirror. */
function speakerPrep(r: RoomRecord): Program {
  const { w, d, H } = sizeOf(r, [8, 6, 3]); const doorX = 1.0;
  const pieces: Piece[] = [
    { id: 'station-1', kind: 'taskdesk', label: 'Slide-check station 1', x: 0.42, y: 1.5, rot: -90, w: 1.3, d: 0.7, h: 0.74, device: devOf(r, 'compute', 1) },
    { id: 'station-2', kind: 'taskdesk', label: 'Slide-check station 2', x: 0.42, y: 3.1, rot: -90, w: 1.3, d: 0.7, h: 0.74, device: devOf(r, 'compute', 2) },
    { id: 'confidence', kind: 'display', label: 'Confidence monitor: the slide and the stage feed', x: w / 2, y: 0.04, rot: 180, w: 1.23, d: 0.05, h: 0.71, z: 1.1, device: devOf(r, 'display') },
    { id: 'timer', kind: 'clock', label: 'Countdown timer', x: w / 2 + 1.25, y: 0.03, rot: 180, w: 0.5, d: 0.04, h: 0.2, z: 1.75 },
    { id: 'mark', kind: 'mark', label: 'Rehearsal mark, facing the confidence monitor', x: w / 2, y: 2.2, w: 0.9, d: 0.9, h: 0.01 },
    { id: 'table', kind: 'table', label: 'Table for four', x: w * 0.7, y: d * 0.62, w: 1.6, d: 0.9, h: 0.74, at: [[w * 0.7 - 0.45, d * 0.62 - 0.72], [w * 0.7 + 0.45, d * 0.62 - 0.72], [w * 0.7 - 0.45, d * 0.62 + 0.72], [w * 0.7 + 0.45, d * 0.62 + 0.72]] },
    { id: 'sofa', kind: 'sofa', label: 'Sofa', x: w - 0.5, y: 1.7, rot: -90, w: 2.0, d: 0.88, h: 0.82 },
    { id: 'mirror', kind: 'mirror', label: 'Full-length mirror', x: w - 0.03, y: d - 0.75, rot: -90, w: 0.6, d: 0.03, h: 1.6, z: 0.3 },
    { id: 'plant', kind: 'plant', label: 'Planter', x: 0.42, y: d - 0.45, w: 0.48, d: 0.48, h: 1.3 },
  ];
  return { key: 'speaker-prep', title: 'Speaker preparation room', summary: 'Two slide-check stations, a confidence monitor and timer facing a rehearsal mark, a table for four and a sofa.', w, d, H, floor: 'carpet', walls: plain(doorX, 'lo'),
    pieces, lights: lightGrid(w, d, 2), speakers: [[w * 0.3, d / 2], [w * 0.7, d / 2]], outside: null, hero: { yaw: 30, pitch: 40, zoom: 1.1 },
    eyes: [eye('station', 'At a slide-check station', 'seated, eyes at 1.2 m', 1.15, 1.5, 1.2, 0, 1.5, 44), eye('mark', 'On the rehearsal mark', 'standing, eyes at 1.65 m, facing the confidence monitor', w / 2, 2.2, 1.65, w / 2, 0, 40),
      eye('table', 'At the table', 'seated, eyes at 1.2 m', w * 0.7 - 0.45, d * 0.62 + 0.72, 1.2, w / 2, 0, 40), eye('door', 'Doorway', 'just inside the door, standing', doorX, d - 0.3, 1.6, w * 0.6, 0.6, 42), eye('wheel', 'Wheelchair place', 'at the end of the table, eyes at 1.1 m', w * 0.7 + 1.2, d * 0.62, 1.1, w * 0.7, d * 0.62, 44)] };
}

/** A VIP lounge: two lounge groups on rugs facing a large display, a bar with stools on the side wall, two glass-walled private meeting pods. */
function vipLounge(r: RoomRecord): Program {
  const { w, d, H } = sizeOf(r, [14, 9, 3.4]); const doorX = w * 0.5; const px = w - 2.05, cx = Math.min(5.0, w * 0.36);
  const cluster = (k: string, y: number): Piece[] => [
    { id: `rug-${k}`, kind: 'rug', label: 'Rug', x: cx, y, w: 4.0, d: 2.6, h: 0.01 },
    { id: `sofa-${k}`, kind: 'sofa', label: 'Sofa', x: cx, y: y + 0.95, w: 2.2, d: 0.88, h: 0.82 },
    { id: `table-${k}`, kind: 'lowtable', label: 'Low table', x: cx, y, w: 1.2, d: 0.65, h: 0.38 },
    { id: `arm-${k}-1`, kind: 'armchair', label: 'Armchair', x: cx - 1.55, y, rot: 90, w: 0.86, d: 0.88, h: 0.8 },
    { id: `arm-${k}-2`, kind: 'armchair', label: 'Armchair', x: cx + 1.55, y, rot: -90, w: 0.86, d: 0.88, h: 0.8 }];
  const by = d * 0.5; const stools: Array<[number, number]> = [-1.2, -0.4, 0.4, 1.2].map((o) => [1.2, by + o]);
  const pieces: Piece[] = [
    ...cluster('a', d * 0.28), ...cluster('b', d * 0.72),
    { id: 'bar', kind: 'bar', label: 'Bar: stone top, refrigerator, open shelving', x: 0.33, y: by, rot: 90, w: 3.4, d: 0.66, h: 1.05 },
    { id: 'shelves', kind: 'shelves', label: 'Open shelving behind the bar', x: 0.13, y: by, rot: 90, w: 3.0, d: 0.26, h: 0.8, z: 1.5 },
    { id: 'barstools', kind: 'stools', label: 'Bar stools (4)', x: 1.2, y: by, w: 0.45, d: 2.8, h: 0.76, at: stools, rot: -90 },
    { id: 'pod-1', kind: 'pod', label: 'Private meeting pod 1, for six', x: px, y: d * 0.25, w: 3.9, d: Math.min(3.9, d * 0.46), h: 2.4 },
    { id: 'pod-2', kind: 'pod', label: 'Private meeting pod 2, for six', x: px, y: d * 0.75, w: 3.9, d: Math.min(3.9, d * 0.46), h: 2.4 },
    { id: 'display', kind: 'display', label: 'Lounge display', x: cx, y: 0.04, rot: 180, w: 1.66, d: 0.05, h: 0.94, z: 1.2, device: devOf(r, 'display') },
    { id: 'plant-1', kind: 'plant', label: 'Planter', x: 0.45, y: 0.45, w: 0.48, d: 0.48, h: 1.7 }, { id: 'plant-2', kind: 'plant', label: 'Planter', x: px - 2.4, y: 0.45, w: 0.48, d: 0.48, h: 1.5 },
    { id: 'plant-3', kind: 'plant', label: 'Planter', x: 0.45, y: d - 0.45, w: 0.48, d: 0.48, h: 1.6 },
  ];
  return { key: 'vip-lounge', title: 'VIP lounge', summary: 'Two lounge groups facing the display, a bar with stools, and two glass meeting pods for six.', w, d, H, floor: 'carpet', walls: { N: {}, E: {}, S: { door: { at: doorX, w: 1.6, hinge: 'hi' } }, W: { finish: 'url(#rm-slats)' } },
    pieces, lights: lightGrid(w, d, 2.2), speakers: grid(1, w - 1, 1, d - 1, 3.5, 3.5), outside: null, hero: { yaw: 26, pitch: 42, zoom: 1.05 },
    eyes: [eye('sofa', 'In the lounge', 'on a sofa, eyes at 1.15 m', cx, d * 0.28 + 0.9, 1.15, cx, 0, 40), eye('bar', 'At the bar', 'on a bar stool, eyes at 1.5 m', 1.25, by, 1.5, 0, by, 42),
      eye('pod', 'In a meeting pod', 'seated at the pod table, eyes at 1.2 m', px - 0.4, d * 0.25 + 0.75, 1.2, px + 0.6, d * 0.25 - 0.5, 42), eye('door', 'Doorway', 'just inside the doors, standing', doorX, d - 0.4, 1.6, cx, d * 0.3, 42),
      eye('wheel', 'Wheelchair place', 'beside a lounge group, eyes at 1.1 m', cx, d * 0.28 - 1.2, 1.1, cx, d * 0.28 + 1, 46)] };
}

/** A press box high on the bowl: three tiers of writing positions behind a glass front onto the pitch, monitors along the desks, an aisle
 *  with steps at one end. The record's 120 positions are three rows of 40. */
function pressBox(r: RoomRecord): Program {
  const { w, d, H } = sizeOf(r, [40, 9, 3.4]); const ax = 2.4; const per = Math.max(4, Math.round((r.capacity || 120) / 3)); const mon = Math.max(1, Math.round((r.assets?.find((a) => a.kind === 'display')?.qty || 12) / 3));
  const row = (k: number, y: number, z: number): Piece => { const xs = Array.from({ length: per }, (_, i) => ax + 0.4 + (i + 0.5) * ((w - ax - 0.8) / per)); return { id: `row-${k}`, kind: 'deskrun', label: `Writing positions, row ${k} (${per})`, x: (ax + w) / 2, y, z, w: w - ax - 0.4, d: 0.7, h: 0.74, at: xs.map((x) => [x, y + 0.82] as [number, number]), n: mon, note: 'desk with power and data at each position' }; };
  const pieces: Piece[] = [
    { id: 'tier-2', kind: 'platform', label: 'Second tier, 0.4 m up', x: (ax + w) / 2, y: 3.95, w: w - ax, d: 2.3, h: 0.4 }, { id: 'tier-3', kind: 'platform', label: 'Third tier, 0.8 m up', x: (ax + w) / 2, y: 6.45, w: w - ax, d: 2.7, h: 0.8 },
    { id: 'steps', kind: 'steps', label: 'Aisle steps to the upper tiers', x: ax - 0.6, y: 4.6, w: 1.1, d: 3.6, h: 0.8 },
    row(1, 0.75, 0), row(2, 3.2, 0.4), row(3, 5.6, 0.8),
  ];
  return { key: 'press-box', title: 'Press box', summary: `Three tiers of ${per} writing positions behind a glass front onto the pitch, with monitors along the desks.`, w, d, H, floor: 'carpet', walls: { N: { glass: true }, E: {}, S: { door: { at: 1.2, w: 0.95, hinge: 'lo' } }, W: {} },
    pieces, lights: lightGrid(w, d, 2.6), speakers: grid(1, w - 1, 1, d - 1, w / 6, d / 2), outside: 'window', hero: { yaw: 18, pitch: 44, zoom: 1.0 },
    eyes: [eye('front', 'Front row', 'a writing position in the front row, eyes at 1.2 m', w / 2 + 0.3, 1.6, 1.2, w / 2 + 0.3, -20, 58), eye('top', 'Top row', 'a writing position in the third tier, eyes at 2.0 m', w / 2 + 0.3, 6.45, 2.0, w / 2 + 0.3, -20, 56),
      eye('door', 'Doorway', 'inside the door at the aisle, standing', 1.2, d - 0.4, 1.6, w * 0.3, 0.5, 44), eye('wheel', 'Wheelchair place', 'the front row’s end position, on the floor, eyes at 1.1 m', ax + 0.8, 1.6, 1.1, ax + 0.8, -20, 58)] };
}

/** A commentary booth: a desk along the glass for its commentators, each with a headset and a monitor, the commentary unit on the desk. */
function commentaryBooth(r: RoomRecord): Program {
  const { w, d, H } = sizeOf(r, [4.5, 3, 2.8]); const n = Math.max(2, Math.min(3, r.capacity || 3)); const xs = Array.from({ length: n }, (_, i) => 0.4 + (i + 0.5) * ((w - 0.8) / n));
  const pieces: Piece[] = [
    { id: 'desk', kind: 'deskrun', label: `Commentary desk (${n} positions)`, x: w / 2, y: 0.42, w: w - 0.4, d: 0.62, h: 0.74, at: xs.map((x) => [x, 1.2] as [number, number]), n, note: 'a headset and a monitor at each position', device: devOf(r, 'microphone') },
    { id: 'unit', kind: 'unit', label: 'Commentary unit', x: (xs[0]! + xs[1]!) / 2, y: 0.5, w: 0.44, d: 0.3, h: 0.1, z: 0.74, device: devOf(r, 'processor') },
    { id: 'coats', kind: 'plant', label: 'Planter', x: w - 0.35, y: d - 0.35, w: 0.4, d: 0.4, h: 1.0 },
  ];
  return { key: 'commentary-booth', title: 'Commentary booth', summary: `A desk along the glass for ${n} commentators, each with a headset and a monitor, the commentary unit between them.`, w, d, H, floor: 'carpet', walls: { N: { glass: true }, E: {}, S: { door: { at: 0.75, w: 0.9, hinge: 'lo' } }, W: {} },
    pieces, lights: lightGrid(w, d, 1.5), speakers: [], outside: 'window', hero: { yaw: 22, pitch: 40, zoom: 1.15 },
    eyes: [eye('seat', 'Commentator’s seat', 'at the desk, eyes at 1.2 m, looking at the pitch', xs[Math.floor(n / 2)]!, 1.2, 1.2, xs[Math.floor(n / 2)]!, -20, 60), eye('door', 'Doorway', 'just inside the door, standing', 0.75, d - 0.3, 1.6, w / 2, 0, 46),
      eye('wheel', 'Wheelchair place', 'at the end position, eyes at 1.1 m', xs[0]!, 1.25, 1.1, xs[0]!, -20, 60)] };
}

/** A front-of-house mix position: an open position at the back of the lower bowl behind a low wall, the console on its desk facing the
 *  stage end, two chairs, a rack, the intercom stations on the desk. */
function mixPosition(r: RoomRecord): Program {
  const { w, d, H } = sizeOf(r, [5, 4, 3]);
  const pieces: Piece[] = [
    { id: 'console', kind: 'console', label: 'Mixing console on its desk', x: w / 2, y: 1.4, w: Math.min(2.4, w - 1.2), d: 0.95, h: 1.0, device: devOf(r, 'processor'), note: 'intercom stations at each end' },
    { id: 'chairs', kind: 'taskchairs', label: 'Engineer’s chairs (2)', x: w / 2, y: 2.3, w: 1.2, d: 0.5, h: 1.0, at: [[w / 2 - 0.5, 2.3], [w / 2 + 0.5, 2.3]] },
    { id: 'rack', kind: 'rack', label: 'Equipment rack', x: 0.5, y: d - 0.9, rot: 90, w: 0.6, d: 0.8, h: 1.2 },
  ];
  return { key: 'mix-position', title: 'Front-of-house mix position', summary: 'An open position at the back of the lower bowl: the console on its desk facing the stage end, chairs, a rack.', w, d, H, floor: 'concrete', walls: { N: { none: true }, E: { parapet: 1.1 }, S: { door: { at: w - 0.75, w: 0.95, hinge: 'hi' } }, W: { parapet: 1.1 } },
    pieces, lights: [], speakers: [], outside: 'open', hero: { yaw: 24, pitch: 44, zoom: 1.15 },
    eyes: [eye('seat', 'At the console', 'seated at the console, eyes at 1.25 m', w / 2 - 0.5, 2.3, 1.25, w / 2 - 0.5, -30, 54), eye('stand', 'Standing behind', 'standing behind the console, eyes at 1.65 m', w / 2, d - 0.5, 1.65, w / 2, -30, 52),
      eye('wheel', 'Wheelchair place', 'beside the console, eyes at 1.1 m', w / 2 + 1.35, 2.0, 1.1, w / 2 + 1.35, -30, 54)] };
}

/** A club: a glass front onto the bowl with club seats outside, high tables along the glass, dining in the middle, two island bars, displays
 *  on the columns and, for the Harbor Club, an LED feature wall. A club at pitch level has a solid front. */
function club(r: RoomRecord): Program {
  const { w, d, H } = sizeOf(r, [50, 20, 4.5]); const onBowl = !/-P$/.test(r.id); const cols = grid(4.5, w - 4.5, d * 0.33, d * 0.7, 9, d * 0.37);
  const highs = grid(2, w - 2, 1.1, 1.3, 4.2, 1).map(([x]) => [x, 1.3] as [number, number]);
  const tables = grid(1.5, w - 1.5, d * 0.36, d * 0.62, 3.2, 2.6).filter(([x, y]) => !cols.some(([cx, cy]) => Math.abs(cx - x) < 1.4 && Math.abs(cy - y) < 1.4));
  const bars: Array<[number, number]> = [[w * 0.27, d * 0.82], [w * 0.73, d * 0.82]]; const led = r.assets?.some((a) => a.kind === 'led');
  const pieces: Piece[] = [
    ...highs.map(([x, y], i): Piece => ({ id: `high-${i + 1}`, kind: 'hightable', label: 'High table by the glass', x, y, w: 0.7, d: 0.7, h: 1.05, at: [[x - 0.58, y], [x + 0.58, y], [x, y + 0.58]] })),
    { id: 'dining', kind: 'tables4', label: `Dining tables for four (${tables.length})`, x: w / 2, y: d * 0.5, w: w - 3, d: d * 0.26, h: 0.74, at: tables },
    ...bars.map(([x, y], i): Piece => ({ id: `bar-${i + 1}`, kind: 'island', label: `Island bar ${i + 1}`, x, y, w: Math.min(8, w * 0.2), d: 2.4, h: 1.05 })),
    ...cols.map(([x, y], i): Piece => ({ id: `column-${i + 1}`, kind: 'column', label: 'Column with displays', x, y, w: 0.6, d: 0.6, h: H, device: devOf(r, 'display') })),
    ...(led ? [{ id: 'ledwall', kind: 'ledwall', label: 'LED feature wall', x: w / 2, y: d - 0.04, w: Math.min(16, w * 0.3), d: 0.08, h: 2.6, z: 1.0, device: devOf(r, 'led') } as Piece] : []),
    ...(onBowl ? [{ id: 'clubseats-a', kind: 'seats', label: 'Club seats outside, front row', x: w / 2, y: -0.55, w: w - 1, d: 0.5, h: 0.92, z: -0.12, n: Math.floor((w - 1) / 0.6) } as Piece,
      { id: 'clubseats-b', kind: 'seats', label: 'Club seats outside, back row', x: w / 2, y: -1.5, w: w - 1, d: 0.5, h: 0.92, z: -0.52, n: Math.floor((w - 1) / 0.6) } as Piece] : []),
    { id: 'plant-1', kind: 'plant', label: 'Planter', x: 0.6, y: d - 0.6, w: 0.5, d: 0.5, h: 1.8 }, { id: 'plant-2', kind: 'plant', label: 'Planter', x: w - 0.6, y: d - 0.6, w: 0.5, d: 0.5, h: 1.8 },
  ];
  const t0 = tables[Math.floor(tables.length / 2)] || [w / 2, d / 2];
  return { key: 'club', title: 'Club', summary: `${onBowl ? 'A glass front onto the bowl with club seats outside; ' : ''}high tables, dining for ${tables.length * 4}, two island bars, displays on the columns${led ? ' and an LED feature wall' : ''}.`, w, d, H, floor: 'oak',
    walls: { N: onBowl ? { glass: true, slide: { at: w / 2, w: 2.4 } } : {}, E: {}, S: { door: { at: w * 0.5, w: 1.8, hinge: 'hi' } }, W: {} },
    pieces, lights: lightGrid(w, d, 3.2), speakers: grid(2, w - 2, 2, d - 2, 6, 6), outside: onBowl ? 'club' : null, hero: { yaw: 16, pitch: 46, zoom: 1.0 },
    eyes: [eye('table', 'At a dining table', 'seated, eyes at 1.2 m', t0[0], t0[1] + 0.62, 1.2, t0[0], -10, 44), eye('glass', 'At the glass', 'at a high table by the glass, eyes at 1.5 m', highs[Math.floor(highs.length / 2)]![0], 1.9, 1.5, highs[Math.floor(highs.length / 2)]![0], -20, 56),
      eye('bar', 'At the bar', 'standing at an island bar, eyes at 1.65 m', bars[0]![0], bars[0]![1] - 1.6, 1.65, bars[0]![0] + 3, 1, 40), eye('door', 'Doorway', 'just inside the main doors, standing', w * 0.5, d - 0.5, 1.65, w * 0.5, 0, 42),
      eye('wheel', 'Wheelchair place', 'at the end of a dining row, eyes at 1.1 m', 1.0, t0[1], 1.1, w * 0.4, 0, 42)] };
}

export function programFor(r: RoomRecord): Program | null {
  switch (r.type) {
    case 'suite': return suite(r); case 'green-room': return greenRoom(r); case 'speaker-prep': return speakerPrep(r); case 'vip-lounge': return vipLounge(r);
    case 'press-box': return pressBox(r); case 'commentary-booth': return commentaryBooth(r); case 'mix-position': return mixPosition(r); case 'club': return club(r);
    default: return null;
  }
}
