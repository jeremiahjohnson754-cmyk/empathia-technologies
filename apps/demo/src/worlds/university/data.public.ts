/**
 * Kestrel Valley University — the public model: the campus plan, routes, a sample student's day, dining, shuttles and the circuit quest.
 * Entirely fictional and synthetic: no real institution, timetable, transit feed or menu is represented, and no student record exists.
 */
import type { Place, Pt, Zone, OpenState } from '../kit.js';

export const VIEW = [600, 400] as const;
const b = (id: string, label: string, short: string, x: number, y: number, w: number, h: number, kind = 'building'): Zone => ({ id, label, short, x, y, w, h, kind });
export const ZONES: Zone[] = [
  { id: 'quad', label: 'The Quad', short: 'Quad', x: 215, y: 150, w: 170, h: 100, kind: 'green', round: true },
  b('WEL', 'Welcome Centre', 'Welcome', 30, 300, 110, 60), b('LIB', 'Hollis Library', 'Library', 230, 40, 140, 70), b('SCI', 'Science Hall', 'Science', 420, 60, 130, 70),
  b('ENG', 'Engineering Centre', 'Engineering', 440, 180, 130, 70), b('UNI', 'Student Union', 'Union', 230, 290, 140, 70), b('ART', 'Arts Hall', 'Arts', 40, 60, 130, 70),
  b('RES', 'Residence Court', 'Residence', 40, 170, 120, 80), b('SPT', 'Sports Pavilion', 'Sports', 430, 300, 130, 60),
];
export interface Spot { id: string; label: string; at: Pt; steps: boolean; about: string }
const c = (id: string): Pt => { const z = ZONES.find((x) => x.id === id)!; return [z.x + z.w / 2, z.y + z.h / 2]; };
export const SPOTS: Spot[] = [
  { id: 'WEL', label: 'Welcome Centre', at: c('WEL'), steps: false, about: 'Visitor desk, tours and parking validation' },
  { id: 'LIB', label: 'Hollis Library', at: c('LIB'), steps: true, about: 'Study floors and the quiet reading room' },
  { id: 'SCI', label: 'Science Hall', at: c('SCI'), steps: false, about: 'Lecture theatre SCI-110 and teaching labs' },
  { id: 'ENG', label: 'Engineering Centre', at: c('ENG'), steps: false, about: 'Maker studio and electronics labs' },
  { id: 'UNI', label: 'Student Union', at: c('UNI'), steps: false, about: 'Dining hall, societies and the shuttle stop' },
  { id: 'ART', label: 'Arts Hall', at: c('ART'), steps: true, about: 'Recital room and studios' },
  { id: 'RES', label: 'Residence Court', at: c('RES'), steps: false, about: 'First-year residences' },
  { id: 'SPT', label: 'Sports Pavilion', at: c('SPT'), steps: false, about: 'Courts and the fitness suite' },
];
export const spot = (id: string) => SPOTS.find((s) => s.id === id)!;
export const STOPS: Place[] = [{ id: 'stop-n', label: 'North Loop stop', x: 300, y: 22, kind: 'stop', short: 'S' }, { id: 'stop-u', label: 'Union stop', x: 300, y: 376, kind: 'stop', short: 'S' }];
export const TOUR = ['WEL', 'LIB', 'SCI', 'UNI'];

export type Mode = 'walk' | 'cycle' | 'shuttle';
const SPEED: Record<Mode, number> = { walk: 80, cycle: 240, shuttle: 300 };   // metres a minute, MODELED
const m = (p: Pt, q: Pt) => Math.hypot(p[0] - q[0], p[1] - q[1]) * 1.6;
const QUAD: Pt = [300, 200];
export interface Route { points: Pt[]; steps: string[]; metres: number; minutes: number }
/** A route between two places. MODELED from the plan; the step-free option uses the level entrances and adds a little distance. */
export function route(from: string, to: string, mode: Mode, stepFree: boolean): Route | null {
  if (from === to) return null;
  const a = spot(from); const z = spot(to);
  const stop = (s: Spot) => [...STOPS].sort((p, q) => m(s.at, [p.x, p.y]) - m(s.at, [q.x, q.y]))[0]!;
  let points: Pt[]; const steps: string[] = [];
  if (mode === 'shuttle') {
    const s1 = stop(a); const s2 = stop(z);
    if (s1.id === s2.id) { points = [a.at, QUAD, z.at]; steps.push(`Both are nearest the ${s1.label}: walking is quicker`, `Walk across the Quad to ${z.label}`); mode = 'walk'; }
    else { points = [a.at, [s1.x, s1.y], [s2.x, s2.y], z.at]; steps.push(`Walk to the ${s1.label}`, `Ride the campus loop to the ${s2.label} (low-floor shuttle)`, `Walk to ${z.label}`); }
  } else { points = [a.at, QUAD, z.at]; steps.push(`Leave ${a.label} toward the Quad`, mode === 'cycle' ? 'Cycle the shared path around the Quad' : 'Cross the Quad on the main path', `Arrive at ${z.label}`); }
  let metres = points.slice(1).reduce((n, p, i) => n + m(points[i]!, p), 0);
  if (stepFree && (a.steps || z.steps)) { metres += 60; steps.push(`Step-free: use the level entrance on the east side of ${z.steps ? z.label : a.label} (the main entrance has steps)`); }
  else if (stepFree) steps.push('Step-free: this way has no steps');
  const ride = mode === 'shuttle' ? 6 : 0;
  return { points, steps, metres: Math.round(metres / 10) * 10, minutes: Math.max(1, Math.round(metres / SPEED[mode]) + ride) };
}

// ---- a sample student's day (synthetic; shown only to the Student configuration)
export const CLASSES = [
  { at: '09:00', what: 'Circuits and Signals — lecture', where: 'Science Hall, SCI-110', spot: 'SCI' },
  { at: '11:00', what: 'Engineering Design — studio', where: 'Engineering Centre, maker studio', spot: 'ENG' },
  { at: '14:00', what: 'Writing for Engineers — seminar', where: 'Arts Hall, room 204', spot: 'ART' },
];
export const REMINDERS = [{ id: 'r1', text: 'Circuits problem set 4 is due Friday (a pointer to your course site, not the work itself)' }, { id: 'r2', text: 'Library book due tomorrow' }, { id: 'r3', text: 'Advising drop-in, Thursday 15:00, Student Union' }];
export const DINING: { hall: string; state: OpenState; age: number | null; menu: { item: string; allergens: string }[] }[] = [
  { hall: 'Union Dining Hall', state: 'Open', age: 25, menu: [{ item: 'Lentil curry with rice', allergens: 'mustard' }, { item: 'Baked pasta', allergens: 'wheat, milk' }, { item: 'Salad bar', allergens: 'varies by item' }] },
  { hall: 'Library Café', state: 'Unknown', age: null, menu: [{ item: 'Filter coffee and pastries', allergens: 'wheat, milk, egg' }] },
];
export const SHUTTLES: { stop: string; route: string; mins: number | null; age: number | null }[] = [
  { stop: 'Union stop', route: 'Campus loop, clockwise', mins: 6, age: 2 }, { stop: 'North Loop stop', route: 'Campus loop, clockwise', mins: 14, age: 2 }, { stop: 'Union stop', route: 'Town link', mins: null, age: null },
];
export const OFFICE_HOURS = [{ who: 'Circuits and Signals teaching team', when: 'Tuesday 13:00–14:00', where: 'Science Hall, room 118' }, { who: 'Student support desk', when: 'Weekdays 09:00–17:00', where: 'Student Union' }];

// ---- the circuit quest (original; each answer explains itself)
export interface Round { id: string; prompt: string; given: string; options: { label: string; right: boolean; why: string }[] }
export const QUEST: Round[] = [
  { id: 'q1', prompt: 'Light the LED without burning it out: which resistor goes in series?', given: '9 V supply · LED drops 2 V · the LED wants 15–20 mA',
    options: [{ label: '100 Ω', right: false, why: '(9 − 2) V ÷ 100 Ω = 70 mA. Far too much: the LED would fail.' }, { label: '220 Ω', right: false, why: '7 V ÷ 220 Ω ≈ 32 mA. Still over 20 mA.' }, { label: '390 Ω', right: true, why: '7 V ÷ 390 Ω ≈ 18 mA. Inside 15–20 mA: bright and safe.' }, { label: '1 kΩ', right: false, why: '7 V ÷ 1000 Ω = 7 mA. Safe, but dim: below 15 mA.' }] },
  { id: 'q2', prompt: 'Two resistors in series share one current. What is it?', given: '11 V supply · 220 Ω and 330 Ω in series',
    options: [{ label: '10 mA', right: false, why: 'That would need 1.1 kΩ in total. Series resistances add: 220 + 330 = 550 Ω.' }, { label: '20 mA', right: true, why: '220 + 330 = 550 Ω, and 11 V ÷ 550 Ω = 20 mA.' }, { label: '50 mA', right: false, why: 'That is 11 V ÷ 220 Ω: it ignores the second resistor.' }] },
  { id: 'q3', prompt: 'Two equal resistors in parallel. What current leaves the supply?', given: '5 V supply · two 1 kΩ resistors in parallel',
    options: [{ label: '2.5 mA', right: false, why: 'That treats them as in series (2 kΩ). In parallel the paths add.' }, { label: '5 mA', right: false, why: 'That is one branch. There are two, each carrying 5 mA.' }, { label: '10 mA', right: true, why: 'Each branch carries 5 V ÷ 1 kΩ = 5 mA; together 10 mA (500 Ω in total).' }] },
];
export const CATALOGUE = ['Computing: sort the packets', 'Mathematics: tile the quad', 'Food science: the emulsion lab', 'History: the campus timeline', 'AV: route the signal'];
