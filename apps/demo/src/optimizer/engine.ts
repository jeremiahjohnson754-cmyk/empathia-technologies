/**
 * The Space Optimizer engine (v1.8.1 §11): one room, three ways to equip it (A, B, C), nine dimensions each. Pure functions on the
 * canonical estate record (estate/model.ts) — the room's own length, width, height and seats — so every world uses the same engine.
 *
 * Everything here is a PLANNING MODEL, not a measurement and not a design sign-off. Each dimension is a stated rule applied to modelled
 * seat positions; the rules and their figures are exported (RULES) and printed beside every score. A real room needs a survey, a
 * drawing and an engineer. Equipment is a class, never a make.
 */
import type { EstateNode } from '../estate/model.js';

export const DIMENSIONS = ['video', 'sightlines', 'capture', 'reproduction', 'efficiency', 'accessibility', 'infrastructure', 'supportability', 'purpose'] as const;
export type Dimension = (typeof DIMENSIONS)[number];
export const DIMENSION_LABEL: Record<Dimension, string> = { video: 'Video coverage', sightlines: 'Sightlines', capture: 'Audio capture', reproduction: 'Audio reproduction', efficiency: 'Spatial efficiency', accessibility: 'Accessibility', infrastructure: 'Infrastructure fit', supportability: 'Supportability', purpose: 'Purpose fit' };
/** The planning figures. Changing one changes every study; each is shown to the reader with the score it produces. */
export const RULES = {
  farthestViewer: 6, closestViewer: 1, offAxisDeg: 45,          // image heights; degrees off the screen's centre line
  imageBottomM: 1.2, ceilingClearM: 0.3, aspect: 16 / 9,
  cameraFovDeg: 100, cameraRangeM: 11, micRadiusM: 2.6, earHeightM: 1.2, ceilingSpeakerHalfAngleDeg: 45, frontSpeakerRangeM: 12, frontSpeakerHalfAngleDeg: 60,
  aisleM: 0.9, wheelchairPer: 50, assistiveFromSeats: 50, signalRunM: 15, sparePorts: 0.2, minCeilingForOverheadM: 2.7,
  ceilingDevicesEasy: 4, classesEasy: 8,
} as const;
export const RULE_TEXT: Record<Dimension, string> = {
  video: `A seat counts when it is inside a camera’s ${RULES.cameraFovDeg}° view and within ${RULES.cameraRangeM} m of it.`,
  sightlines: `A seat counts when it is between ${RULES.closestViewer} and ${RULES.farthestViewer} image heights from a screen and no more than ${RULES.offAxisDeg}° off its centre line.`,
  capture: `A seat counts when it is within ${RULES.micRadiusM} m of a microphone.`,
  reproduction: `A seat counts when it is inside a loudspeaker’s cone at ear height (${RULES.earHeightM} m): ${RULES.ceilingSpeakerHalfAngleDeg}° either side below a ceiling loudspeaker, or within ${RULES.frontSpeakerRangeM} m in front of a column.`,
  efficiency: 'Floor area per seat against the usual band for this kind of room; seats that do not fit count against it.',
  accessibility: `Step-free entry, a wheelchair position for every ${RULES.wheelchairPer} seats and one more, ${RULES.aisleM} m aisles, assistive listening from ${RULES.assistiveFromSeats} seats, and those positions able to see and hear.`,
  infrastructure: `Screens fit the wall, the longest signal run is under ${RULES.signalRunM} m or carried on the network, the switch has ${RULES.sparePorts * 100}% spare ports, and the ceiling is at least ${RULES.minCeilingForOverheadM} m for overhead devices.`,
  supportability: `Starts at 100: less for each overhead device beyond ${RULES.ceilingDevicesEasy}, each equipment class beyond ${RULES.classesEasy}, and equipment that cannot be reached from the floor.`,
  purpose: 'The eight scores above, weighted for what this kind of room is for.',
};

export type Seating = 'rows' | 'tables' | 'theatre' | 'groups';
export interface Pt { x: number; y: number }
export interface Seat extends Pt { wheelchair?: boolean }
export interface Screen extends Pt { /** unit vector the screen faces */ nx: number; ny: number; heightM: number; widthM: number; repeater?: boolean }
export interface Camera extends Pt { nx: number; ny: number }
export interface Speaker extends Pt { kind: 'ceiling' | 'front'; nx?: number; ny?: number }
export interface OptionSpec {
  key: 'A' | 'B' | 'C'; name: string; summary: string; tradeoff: string;
  /** which wall is the front: the room is then `depth` deep from that wall and `width` across */
  front: 'short' | 'long'; repeaters: boolean; overheadAudio: boolean; secondCamera: boolean;
}
export interface Layout { depth: number; width: number; height: number; seats: Seat[]; wanted: number; screens: Screen[]; cameras: Camera[]; mics: Pt[]; speakers: Speaker[]; counts: { devices: number; overhead: number; classes: number; networked: number; ports: number; longestRunM: number; networkVideo: boolean; reachable: boolean; wheelchair: number; assistive: boolean } }
export interface Score { dimension: Dimension; score: number; detail: string; basis: 'MODELED' }
export interface Study { room: string; option: OptionSpec; layout: Layout; scores: Score[]; perSeat: Record<'video' | 'sightlines' | 'capture' | 'reproduction', boolean[]> }

const PITCH: Record<Seating, { w: number; d: number; band: [number, number] }> = { rows: { w: 0.75, d: 1.5, band: [1.9, 2.8] }, tables: { w: 0.8, d: 1.8, band: [2.2, 3.4] }, theatre: { w: 0.55, d: 0.95, band: [0.8, 1.5] }, groups: { w: 1.1, d: 1.9, band: [2.6, 3.8] } };
export function seatingOf(n: Pick<EstateNode, 'type' | 'layout' | 'capacity'>): Seating {
  const l = (n.layout || '').toLowerCase();
  if (/theatre|raked|loose seats/.test(l) || ['lecture-theatre', 'keynote-hall', 'performance'].includes(n.type)) return 'theatre';
  if (/group tables|rounds|bays/.test(l)) return 'groups';
  if (/one table|boardroom|hollow/.test(l)) return 'tables';
  return 'rows';
}
const WEIGHTS: Record<Seating, Record<Exclude<Dimension, 'purpose'>, number>> = {
  rows: { video: 0.12, sightlines: 0.2, capture: 0.13, reproduction: 0.17, efficiency: 0.08, accessibility: 0.15, infrastructure: 0.08, supportability: 0.07 },
  theatre: { video: 0.1, sightlines: 0.22, capture: 0.08, reproduction: 0.22, efficiency: 0.08, accessibility: 0.15, infrastructure: 0.08, supportability: 0.07 },
  groups: { video: 0.12, sightlines: 0.18, capture: 0.18, reproduction: 0.14, efficiency: 0.1, accessibility: 0.14, infrastructure: 0.07, supportability: 0.07 },
  tables: { video: 0.18, sightlines: 0.16, capture: 0.2, reproduction: 0.14, efficiency: 0.06, accessibility: 0.12, infrastructure: 0.07, supportability: 0.07 },
};
export const weightsFor = (s: Seating) => WEIGHTS[s];

export const OPTIONS: readonly OptionSpec[] = [
  { key: 'A', name: 'One front, short wall', summary: 'One image and one camera on the short wall; loudspeakers at the front.', tradeoff: 'Least equipment and easiest to look after. The back of a deep room is far from the screen and the microphones.', front: 'short', repeaters: false, overheadAudio: false, secondCamera: false },
  { key: 'B', name: 'One front, long wall', summary: 'The room is turned: the image and camera sit on the long wall, with ceiling microphones and loudspeakers.', tradeoff: 'Everyone is closer to the screen, but the outer seats look at it from the side and fewer seats may fit.', front: 'long', repeaters: false, overheadAudio: true, secondCamera: false },
  { key: 'C', name: 'Front and repeaters', summary: 'Short-wall front, with repeater screens part-way back, a second camera, and ceiling microphones and loudspeakers throughout.', tradeoff: 'The most even picture and sound. More overhead equipment to install, power, network and maintain.', front: 'short', repeaters: true, overheadAudio: true, secondCamera: true },
];

const r1 = (n: number) => Math.round(n * 10) / 10;
const grid = (from: number, to: number, step: number): number[] => { const n = Math.max(1, Math.round((to - from) / step)); const s = (to - from) / n; return Array.from({ length: n }, (_, i) => from + s * (i + 0.5)); };

/** Place seats, screens, cameras, microphones and loudspeakers for one option. x runs across the room, y from the front wall back. */
export function layoutFor(room: Pick<EstateNode, 'dims' | 'capacity' | 'type' | 'layout' | 'stepFree'>, o: OptionSpec): Layout {
  const [a, b, height] = room.dims || [8, 6, 3]; const long = Math.max(a, b); const short = Math.min(a, b);
  const depth = o.front === 'short' ? long : short; const width = o.front === 'short' ? short : long; const wanted = room.capacity || 0; const seating = seatingOf(room);
  const imageH = r1(Math.max(0.6, Math.min(height - RULES.imageBottomM - RULES.ceilingClearM, depth / RULES.farthestViewer)));
  const screenCount = o.front === 'long' && width > 3.2 * imageH * RULES.aspect ? 2 : 1;
  const screens: Screen[] = Array.from({ length: screenCount }, (_, i) => ({ x: width * (i + 1) / (screenCount + 1), y: 0, nx: 0, ny: 1, heightM: imageH, widthM: r1(imageH * RULES.aspect) }));
  const frontClear = Math.max(1.8, RULES.closestViewer * imageH + 0.6);
  // seats: a grid between the side aisles, from the front clearance to the rear aisle, with a centre aisle in wide rooms
  const p = PITCH[seating]; const usableW = width - 2 * RULES.aisleM; const centreAisle = usableW > 9 ? RULES.aisleM : 0; const cols = Math.max(1, Math.floor((usableW - centreAisle) / p.w)); const rows = Math.max(1, Math.floor((depth - frontClear - RULES.aisleM) / p.d));
  const wcWanted = wanted ? Math.ceil(wanted / RULES.wheelchairPer) + 1 : 0; const seats: Seat[] = [];
  for (let r = 0; r < rows && seats.length < wanted; r += 1) for (let c = 0; c < cols && seats.length < wanted; c += 1) {
    const half = cols / 2; const x0 = RULES.aisleM + (usableW - centreAisle - cols * p.w) / 2 + c * p.w + p.w / 2 + (centreAisle && c >= half ? centreAisle : 0);
    seats.push({ x: r1(x0), y: r1(frontClear + r * p.d + p.d / 2) });
  }
  // wheelchair positions: on the rear cross-aisle (step-free rooms only), unless repeaters let them sit mid-room with a screen of their own
  const wheelchair = room.stepFree === false ? 0 : wcWanted; const wcY = o.repeaters ? Math.min(depth - RULES.aisleM / 2, frontClear + Math.ceil(rows / 2) * p.d) : depth - RULES.aisleM / 2;
  for (let i = 0; i < wheelchair; i += 1) seats.push({ x: r1(RULES.aisleM / 2 + (i % 2 ? width - RULES.aisleM : 0) + (i > 1 ? (i % 2 ? -1 : 1) * 1.0 * Math.floor(i / 2) : 0)), y: r1(wcY), wheelchair: true });
  if (o.repeaters) { const y = r1(frontClear + Math.max(1, Math.floor(rows / 2)) * p.d - p.d / 2); const h = r1(Math.max(0.5, imageH * 0.6)); for (const x of [0.15, width - 0.15]) screens.push({ x, y, nx: x < width / 2 ? 0.5 : -0.5, ny: 0.866, heightM: h, widthM: r1(h * RULES.aspect), repeater: true }); }
  const cameras: Camera[] = [{ x: width / 2, y: 0.1, nx: 0, ny: 1 }]; if (o.secondCamera) cameras.push({ x: width / 2, y: depth - 0.1, nx: 0, ny: -1 });
  const seatedTo = seats.filter((s) => !s.wheelchair).reduce((m, s) => Math.max(m, s.y), frontClear);
  const mics: Pt[] = o.overheadAudio ? grid(frontClear - 0.5, seatedTo + 0.8, RULES.micRadiusM * 1.5).flatMap((y) => grid(RULES.aisleM, width - RULES.aisleM, RULES.micRadiusM * 1.5).map((x) => ({ x: r1(x), y: r1(y) }))) : [{ x: width / 2, y: frontClear - 0.8 }];
  const cone = Math.max(0.6, (height - RULES.earHeightM) * Math.tan(RULES.ceilingSpeakerHalfAngleDeg * Math.PI / 180));
  const speakers: Speaker[] = o.overheadAudio ? grid(frontClear - 0.5, depth - 0.3, cone * 1.4).flatMap((y) => grid(0.3, width - 0.3, cone * 1.4).map((x): Speaker => ({ kind: 'ceiling', x: r1(x), y: r1(y) }))) : [{ kind: 'front', x: 0.6, y: 0.2, nx: 0.25, ny: 0.97 }, { kind: 'front', x: width - 0.6, y: 0.2, nx: -0.25, ny: 0.97 }];
  const overhead = (o.overheadAudio ? mics.length + speakers.length : 0) + (o.repeaters ? 2 : 0); const networked = screens.length + cameras.length + (o.overheadAudio ? mics.length + Math.ceil(speakers.length / 8) : 1) + 3;
  const ports = networked <= 20 ? 24 : 48; const longestRunM = r1((o.repeaters || o.secondCamera ? depth : depth * 0.4) + width / 2 + height);
  const classes = 5 + (o.overheadAudio ? 2 : 1) + (o.repeaters ? 1 : 0) + (o.secondCamera ? 1 : 0) + (wanted >= RULES.assistiveFromSeats ? 1 : 0);
  return { depth, width, height, seats, wanted, screens, cameras, mics, speakers, counts: { devices: screens.length + cameras.length + mics.length + speakers.length + 4, overhead, classes, networked, ports, longestRunM, networkVideo: o.repeaters || o.secondCamera, reachable: !o.overheadAudio || height <= 3.6, wheelchair, assistive: wanted >= RULES.assistiveFromSeats } };
}

const rad = (d: number) => d * Math.PI / 180;
const sees = (s: Pt, sc: Screen) => { const dx = s.x - sc.x; const dy = s.y - sc.y; const d = Math.hypot(dx, dy); if (d < RULES.closestViewer * sc.heightM || d > RULES.farthestViewer * sc.heightM) return false; const n = Math.hypot(sc.nx, sc.ny); return (dx * sc.nx + dy * sc.ny) / (d * n) >= Math.cos(rad(RULES.offAxisDeg)); };
const seen = (s: Pt, c: Camera) => { const dx = s.x - c.x; const dy = s.y - c.y; const d = Math.hypot(dx, dy); return d <= RULES.cameraRangeM && d > 0 && (dx * c.nx + dy * c.ny) / d >= Math.cos(rad(RULES.cameraFovDeg / 2)); };
const heard = (s: Pt, m: Pt) => Math.hypot(s.x - m.x, s.y - m.y) <= RULES.micRadiusM;
const hears = (s: Pt, sp: Speaker, h: number) => { const dx = s.x - sp.x; const dy = s.y - sp.y; const d = Math.hypot(dx, dy); if (sp.kind === 'ceiling') return d <= Math.max(0.6, (h - RULES.earHeightM) * Math.tan(rad(RULES.ceilingSpeakerHalfAngleDeg))); return d <= RULES.frontSpeakerRangeM && d > 0 && (dx * (sp.nx || 0) + dy * (sp.ny || 1)) / d >= Math.cos(rad(RULES.frontSpeakerHalfAngleDeg)); };
const pct = (xs: boolean[]) => (xs.length ? Math.round(100 * xs.filter(Boolean).length / xs.length) : 0);
const of = (xs: boolean[]) => `${xs.filter(Boolean).length} of ${xs.length} seats`;

export function study(room: Pick<EstateNode, 'id' | 'dims' | 'capacity' | 'type' | 'layout' | 'stepFree'>, o: OptionSpec): Study {
  const L = layoutFor(room, o); const seating = seatingOf(room); const c = L.counts;
  const perSeat = { video: L.seats.map((s) => L.cameras.some((k) => seen(s, k))), sightlines: L.seats.map((s) => L.screens.some((k) => sees(s, k))), capture: L.seats.map((s) => L.mics.some((m) => heard(s, m))), reproduction: L.seats.map((s) => L.speakers.some((k) => hears(s, k, L.height))) };
  const placed = L.seats.filter((s) => !s.wheelchair).length; const fit = L.wanted ? Math.min(1, placed / L.wanted) : 1; const per = placed ? (L.depth * L.width) / placed : 0; const [lo, hi] = PITCH[seating].band;
  const band = per >= lo && per <= hi ? 100 : per < lo ? Math.max(0, 100 - (lo - per) / lo * 200) : Math.max(0, 100 - (per - hi) / hi * 100);
  const wcIdx = L.seats.map((s, i) => (s.wheelchair ? i : -1)).filter((i) => i >= 0); const wcNeed = L.wanted ? Math.ceil(L.wanted / RULES.wheelchairPer) + 1 : 0;
  const acc: [string, boolean][] = [['step-free entry', room.stepFree !== false], [`${wcNeed} wheelchair positions`, c.wheelchair >= wcNeed], [`${RULES.aisleM} m aisles`, L.width - 2 * RULES.aisleM > 0.5], ['assistive listening where needed', L.wanted < RULES.assistiveFromSeats || c.assistive], ['wheelchair positions can see a screen', wcIdx.length > 0 && wcIdx.every((i) => perSeat.sightlines[i])], ['wheelchair positions can hear', wcIdx.length > 0 && wcIdx.every((i) => perSeat.reproduction[i])]];
  const front = L.screens.filter((s) => !s.repeater); const wallNeed = front.reduce((s, x) => s + x.widthM, 0) + 0.3 * (front.length + 1);
  const inf: [string, boolean][] = [['screens fit the front wall', wallNeed <= L.width], [`longest signal run ${c.longestRunM} m`, c.longestRunM <= RULES.signalRunM || c.networkVideo], [`${c.networked} networked devices on ${c.ports} ports`, c.networked * (1 + RULES.sparePorts) <= c.ports], ['ceiling high enough for overhead devices', c.overhead === 0 || L.height >= RULES.minCeilingForOverheadM]];
  const sup = Math.max(0, 100 - Math.min(40, Math.max(0, c.overhead - RULES.ceilingDevicesEasy) * 2) - Math.max(0, c.classes - RULES.classesEasy) * 5 - (c.reachable ? 0 : 15));
  const words = (xs: [string, boolean][]) => { const f = xs.filter((x) => !x[1]).map((x) => x[0]); return f.length ? `Not met: ${f.join('; ')}` : `All ${xs.length} checks met`; };
  const eight: Score[] = [
    { dimension: 'video', score: pct(perSeat.video), detail: `${of(perSeat.video)} in view of ${L.cameras.length === 1 ? 'the camera' : `${L.cameras.length} cameras`}`, basis: 'MODELED' },
    { dimension: 'sightlines', score: pct(perSeat.sightlines), detail: `${of(perSeat.sightlines)}; image ${L.screens[0]!.heightM} m high${L.screens.some((s) => s.repeater) ? ', with two repeaters' : front.length > 1 ? `, ${front.length} side by side` : ''}`, basis: 'MODELED' },
    { dimension: 'capture', score: pct(perSeat.capture), detail: `${of(perSeat.capture)} within reach of ${L.mics.length === 1 ? 'the front microphone' : `${L.mics.length} ceiling microphones`}`, basis: 'MODELED' },
    { dimension: 'reproduction', score: pct(perSeat.reproduction), detail: `${of(perSeat.reproduction)} covered by ${L.speakers.length} ${L.speakers[0]!.kind === 'ceiling' ? 'ceiling' : 'front'} loudspeakers`, basis: 'MODELED' },
    { dimension: 'efficiency', score: Math.round(band * fit), detail: `${placed} of ${L.wanted} seats fit; ${r1(per)} m² a seat (usual ${lo} to ${hi})`, basis: 'MODELED' },
    { dimension: 'accessibility', score: Math.round(100 * acc.filter((x) => x[1]).length / acc.length), detail: words(acc), basis: 'MODELED' },
    { dimension: 'infrastructure', score: Math.round(100 * inf.filter((x) => x[1]).length / inf.length), detail: words(inf), basis: 'MODELED' },
    { dimension: 'supportability', score: sup, detail: `${c.devices} devices, ${c.overhead} overhead, ${c.classes} equipment classes${c.reachable ? '' : '; overhead equipment needs access equipment'}`, basis: 'MODELED' },
  ];
  const w = WEIGHTS[seating]; const purpose = Math.round(eight.reduce((s, x) => s + x.score * w[x.dimension as Exclude<Dimension, 'purpose'>], 0));
  return { room: room.id, option: o, layout: L, perSeat, scores: [...eight, { dimension: 'purpose', score: purpose, detail: `Weighted for a ${seating === 'rows' ? 'teaching or presentation room in rows' : seating === 'theatre' ? 'theatre-style room' : seating === 'groups' ? 'group-work room' : 'meeting table'}`, basis: 'MODELED' }] };
}
export const scoreOf = (s: Study, d: Dimension): number => s.scores.find((x) => x.dimension === d)!.score;
/** Options within this many points of the best are too close for a planning model to separate; the easier one to look after is preferred. */
export const CLOSE = 3;
export function compare(room: Parameters<typeof study>[0]): { studies: Study[]; best: Study; close: Study[]; top: number } {
  const studies = OPTIONS.map((o) => study(room, o)); const top = Math.max(...studies.map((s) => scoreOf(s, 'purpose')));
  const close = studies.filter((s) => top - scoreOf(s, 'purpose') <= CLOSE).sort((a, b) => scoreOf(b, 'supportability') - scoreOf(a, 'supportability') || scoreOf(b, 'purpose') - scoreOf(a, 'purpose'));
  return { studies, best: close[0]!, close, top };
}
/** Can this room be studied? It needs its size and a number of seats. */
export const studiable = (n: EstateNode): boolean => n.kind === 'room' && !!n.dims && !!n.capacity && n.capacity >= 6 && n.capacity <= 400;
/** One saved study per world (v1.8.1 §11): the room each world opens first. */
export const SAVED: Record<string, string> = { university: 'UNI-ENG-110', stadium: 'STA-PCR', convention: 'CNV-SR-05' };
