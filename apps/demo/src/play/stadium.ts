/**
 * Harborlight Stadium (the fictional venue of worlds/stadium) as 3D geometry for Stadium LIVE (task #182): a bowl of two seating tiers
 * on a rounded-rectangle plan around a 105 × 68 m pitch, a suite band between them, a canopy, four light towers, two end scoreboards,
 * a ribbon board, PA clusters, the broadcast gallery, and a crowd of simple figures seated by section. Inspired by the kind of place
 * only: no real venue's drawings, signage, team marks or brands. Metres; x along the pitch, z across it, y up. Every level and
 * position is MODELED.
 */
import type { V3 } from './gl.js';

export type Atmos = 'pregame' | 'live' | 'halftime' | 'concert' | 'postgame' | 'empty' | 'rehearsal';
export const ATMOS: Record<Atmos, { label: string; fill: number; night: boolean; excite: number; lights: string; board: string; sky: V3; note: string }> = {
  pregame: { label: 'Pregame', fill: 0.55, night: false, excite: 0.45, lights: '#FFF4D6', board: 'Welcome to Harborlight · kick-off 19:30', sky: [0.62, 0.74, 0.9], note: 'Gates open; the bowl fills; warm-ups on the pitch.' },
  live: { label: 'Live game', fill: 0.94, night: true, excite: 0.8, lights: '#F4F7FF', board: 'HARBORLIGHT 1 – 0 VISITORS · 23′', sky: [0.06, 0.09, 0.18], note: 'Full house under the lights.' },
  halftime: { label: 'Halftime', fill: 0.8, night: true, excite: 0.4, lights: '#E8F0FF', board: 'Halftime · HARBORLIGHT 1 – 0 VISITORS', sky: [0.06, 0.09, 0.18], note: 'Concourses busy; a presentation on the pitch.' },
  concert: { label: 'Concert', fill: 0.97, night: true, excite: 0.95, lights: '#B26BFF', board: 'Harborlight Live · tonight', sky: [0.04, 0.03, 0.1], note: 'A stage at the west end; colored washes over the floor; the bowl full.' },
  postgame: { label: 'Postgame', fill: 0.4, night: true, excite: 0.25, lights: '#F4F7FF', board: 'Full time · HARBORLIGHT 2 – 1 VISITORS', sky: [0.06, 0.09, 0.18], note: 'The bowl empties; egress routes lit.' },
  empty: { label: 'Empty stadium', fill: 0, night: false, excite: 0, lights: '#FFFFFF', board: 'Harborlight Stadium', sky: [0.66, 0.78, 0.92], note: 'No event: maintenance and tours.' },
  rehearsal: { label: 'Technical rehearsal', fill: 0.03, night: true, excite: 0.05, lights: '#9FD8FF', board: 'REHEARSAL · test pattern', sky: [0.08, 0.1, 0.16], note: 'Crew only: PA tuning, camera checks, light cues.' },
};
export const PITCH = { L: 105, W: 68 };
const SE = 4; const sg = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 2 / SE);
/** a point on the bowl's plan at angle θ and scale (a, b) */
export const ring = (t: number, a: number, b: number): [number, number] => [a * sg(Math.cos(t)), b * sg(Math.sin(t))];
export const SEGS = 96;
export const theta = (i: number) => (i / SEGS) * Math.PI * 2;
/** sections: 24 around the bowl, 4 segments each; the away supporters sit in 3 sections at the south-west corner */
export const SECTIONS = 24; export const AWAY = [14, 15, 16];
export const sectionOf = (seg: number) => Math.floor(seg / (SEGS / SECTIONS));
export const sectionName = (s: number, upper: boolean) => `${upper ? 2 : 1}${String(s + 1).padStart(2, '0')}`;

export interface Tier { a0: number; b0: number; a1: number; b1: number; y0: number; y1: number; rows: number; upper: boolean }
export const TIERS: Tier[] = [
  { a0: 60, b0: 43, a1: 80, b1: 62, y0: 1.2, y1: 13, rows: 14, upper: false },
  { a0: 86, b0: 68, a1: 104, b1: 84, y0: 19, y1: 36, rows: 12, upper: true },
];
/** a row's footprint between two angles: a quad on the plan, and its height */
export function rowQuad(t: Tier, row: number, i: number): { pts: Array<[number, number]>; y: number } {
  const f0 = row / t.rows, f1 = (row + 1) / t.rows; const a0 = t.a0 + (t.a1 - t.a0) * f0, b0 = t.b0 + (t.b1 - t.b0) * f0, a1 = t.a0 + (t.a1 - t.a0) * f1, b1 = t.b0 + (t.b1 - t.b0) * f1;
  const th0 = theta(i), th1 = theta(i + 1); return { pts: [ring(th0, a0, b0), ring(th1, a0, b0), ring(th1, a1, b1), ring(th0, a1, b1)], y: t.y0 + (t.y1 - t.y0) * f1 };
}
/** a seeded random number, so the crowd is the same crowd every time */
export const rnd = (n: number) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };

export interface Device { id: string; label: string; kind: 'pa' | 'camera' | 'board' | 'ap' | 'light' | 'rack'; at: V3; status: 'ok' | 'warn' | 'fault'; info: string }
export const DEVICES: Device[] = [
  { id: 'PA-N', label: 'PA cluster north', kind: 'pa', at: [0, 30, -70], status: 'ok', info: 'Line-array cluster for the north stand · DSP zone N · amplifier rack R2 · class template, no make or model' },
  { id: 'PA-S', label: 'PA cluster south', kind: 'pa', at: [0, 30, 70], status: 'ok', info: 'Line-array cluster for the south stand · DSP zone S · amplifier rack R2' },
  { id: 'PA-E', label: 'PA cluster east', kind: 'pa', at: [92, 30, 0], status: 'warn', info: 'Line-array cluster for the east end · DSP zone E · one amplifier channel reports a high temperature (simulated)' },
  { id: 'PA-W', label: 'PA cluster west', kind: 'pa', at: [-92, 30, 0], status: 'ok', info: 'Line-array cluster for the west end · DSP zone W' },
  { id: 'CAM-1', label: 'Broadcast camera 1 (center)', kind: 'camera', at: [0, 15, 48], status: 'ok', info: 'Main game camera on the south gantry · fiber to the broadcast gallery' },
  { id: 'CAM-4', label: 'Broadcast camera 4 (goal line)', kind: 'camera', at: [52.5, 1.5, 36], status: 'fault', info: 'Goal-line camera · no signal at the router (simulated fault): an incident would be raised through Field Intelligence and ServiceHands' },
  { id: 'BRD-E', label: 'Scoreboard east', kind: 'board', at: [108, 34, 0], status: 'ok', info: 'Video board · processor in the east technical room · content from the production gallery' },
  { id: 'BRD-W', label: 'Scoreboard west', kind: 'board', at: [-108, 34, 0], status: 'ok', info: 'Video board · processor in the west technical room' },
  { id: 'AP-112', label: 'Wireless access points, section 112', kind: 'ap', at: [30, 9, 55], status: 'warn', info: 'High density under the seats · coverage MODELED, not surveyed: one point offline (simulated)' },
  { id: 'LT-NE', label: 'Light tower north-east', kind: 'light', at: [95, 48, -75], status: 'ok', info: 'Field lighting · scene control from the production gallery' },
  { id: 'RK-BG', label: 'Broadcast gallery racks', kind: 'rack', at: [0, 16, 64], status: 'ok', info: 'Production switcher, replay, intercom · the gallery overlooking the halfway line' },
];
/** the deterministic event timeline the replay steps through */
export const TIMELINE: Array<{ t: string; atmos: Atmos; board: string; excite: number; cheer: 'home' | 'away' | null; text: string }> = [
  { t: '18:00', atmos: 'pregame', board: 'Gates open · kick-off 19:30', excite: 0.35, cheer: null, text: 'Gates open; wayfinding boards show the quickest gates.' },
  { t: '19:30', atmos: 'live', board: 'KICK-OFF · HARBORLIGHT 0 – 0 VISITORS', excite: 0.7, cheer: null, text: 'Kick-off under the lights.' },
  { t: '19:53', atmos: 'live', board: 'GOAL · HARBORLIGHT 1 – 0 · 23′', excite: 1, cheer: 'home', text: 'Home goal: the bowl erupts; the boards and ribbon go to the home color.' },
  { t: '20:15', atmos: 'halftime', board: 'Halftime · HARBORLIGHT 1 – 0 VISITORS', excite: 0.4, cheer: null, text: 'Halftime: concourses fill; a presentation on the pitch.' },
  { t: '20:52', atmos: 'live', board: 'GOAL · VISITORS · 1 – 1 · 61′', excite: 0.85, cheer: 'away', text: 'Away goal: the south-west corner celebrates.' },
  { t: '21:07', atmos: 'live', board: 'GOAL · HARBORLIGHT 2 – 1 · 76′', excite: 1, cheer: 'home', text: 'Home goal again.' },
  { t: '21:22', atmos: 'postgame', board: 'Full time · HARBORLIGHT 2 – 1 VISITORS', excite: 0.3, cheer: null, text: 'Full time: egress routes lit, the bowl empties.' },
];
/** a modeled level at a section, dBA (A-weighted, simulated): crowd-only, from fill and excitement, with the assumptions stated */
export function modeledDba(section: number, fill: number, excite: number, cheer: 'home' | 'away' | null): number {
  if (fill <= 0.01) return 45; const away = AWAY.includes(section);
  const burst = cheer === 'home' ? (away ? 0 : 8) : cheer === 'away' ? (away ? 9 : -2) : 0;
  return Math.round(Math.min(112, 62 + 34 * fill * (0.4 + 0.6 * excite) + burst + (rnd(section) - 0.5) * 3));
}
export const DBA_ASSUMPTIONS = 'MODELED, not measured: crowd sound only, A-weighted, at a seat in the middle of each section; 62 dBA plus up to 34 dB with fill and excitement, ±1.5 dB section variation, +8–9 dB in a cheering section. No microphone measured this; a consumer phone is not a calibrated meter.';
