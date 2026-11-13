/**
 * Room programs (13 Nov 2026): what a room of a given type actually holds, laid out as a designer would, from the estate's record (size,
 * places, equipment classes). A program replaces "the nearest V2.5.3 type" where that type was wrong for the room — a stadium suite is a
 * hospitality box with a glass front on the bowl, not a boardroom. Each program also names the places a person would really be, for the
 * eye-level views. Fictional and illustrative: modelled from the record, never surveyed.
 */
export type Side = 'N' | 'E' | 'S' | 'W';
export interface WallSpec { glass?: boolean; door?: { at: number; w: number; hinge: 'lo' | 'hi' }; slide?: { at: number; w: number }; finish?: string }
export interface Piece { id: string; kind: string; label: string; x: number; y: number; rot?: number; w: number; d: number; h: number; z?: number; at?: Array<[number, number]>; note?: string; device?: string }
/** `pitch` follows the L3 camera: 36 is level, higher looks down (3° for every step of 9 above 36), lower looks up */
export interface EyeSpot { key: string; label: string; says: string; x: number; y: number; z: number; yaw: number; pitch: number }
export interface Program {
  key: string; title: string; summary: string; w: number; d: number; H: number; floor: 'oak' | 'carpet'; walls: Record<Side, WallSpec>;
  pieces: Piece[]; eyes: EyeSpot[]; lights: Array<[number, number]>; speakers: Array<[number, number]>; outside: 'suite' | null; hero: { yaw: number; pitch: number; zoom?: number };
}
export interface RoomRecord { id: string; type: string; name: string; dims?: [number, number, number]; capacity?: number; assets?: Array<{ kind: string; label: string; cls: string; qty: number; state: string }> }

/** the room types that have an Empathia program, and the ones still being redesigned (shown as such rather than as a wrong layout) */
export const PROGRAM_TYPES = new Set(['suite']);
export const REDESIGN_TYPES = new Set(['vip-lounge', 'club', 'press-box', 'commentary-booth', 'green-room', 'speaker-prep', 'mix-position']);
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

export function programFor(r: RoomRecord): Program | null {
  if (r.type === 'suite') return suite(r);
  return null;
}
