/**
 * Harborlight Stadium — the public model: the bowl, its gates and amenities, sample tickets and the match-day timeline.
 * Entirely fictional and synthetic. Nothing here describes the venue's systems: that is data.pro.ts, a separate chunk.
 */
import type { Place, Pt, Zone } from '../kit.js';
import type { OpenState } from '../kit.js';

export const VIEW = [600, 400] as const;
const sec = (id: string, x: number, y: number, w: number, h: number, kind = 'stand'): Zone => ({ id, label: `Section ${id}`, short: id, x, y, w, h, kind });
export const ZONES: Zone[] = [
  { id: 'bowl', label: 'Concourse', short: '', x: 20, y: 20, w: 560, h: 360, kind: 'ring', round: true },
  { id: 'pitch', label: 'Pitch', x: 205, y: 150, w: 190, h: 100, kind: 'field' },
  sec('101', 150, 84, 72, 56), sec('102', 226, 84, 72, 56), sec('103', 302, 84, 72, 56), sec('104', 378, 84, 72, 56),
  sec('111', 150, 260, 72, 56), sec('112', 226, 260, 72, 56), sec('113', 302, 260, 72, 56), sec('114', 378, 260, 72, 56),
  sec('121', 96, 150, 100, 46), sec('122', 96, 204, 100, 46),
  sec('131', 404, 150, 100, 46), sec('132', 404, 204, 100, 46, 'visiting'),
];
export const centre = (id: string): Pt => { const z = ZONES.find((x) => x.id === id)!; return [z.x + z.w / 2, z.y + z.h / 2]; };

export type AmenityKind = 'gate' | 'food' | 'restroom' | 'accessible-restroom' | 'first-aid' | 'guest-services' | 'water' | 'lift';
export interface Amenity extends Place { kind: AmenityKind; state: OpenState; age: number | null; stepFree: boolean; menu?: { item: string; price: string; allergens: string }[] }
const a = (id: string, label: string, kind: AmenityKind, x: number, y: number, state: OpenState, age: number | null, stepFree = true, short?: string): Amenity => ({ id, label, kind, x, y, state, age, stepFree, short: short ?? label.slice(0, 1) });
export const AMENITIES: Amenity[] = [
  a('gate-a', 'Gate A (north-west)', 'gate', 92, 62, 'Open', 6, true, 'A'), a('gate-b', 'Gate B (north-east)', 'gate', 508, 62, 'Open', 6, true, 'B'),
  a('gate-c', 'Gate C (south-east)', 'gate', 508, 338, 'Busy', 4, true, 'C'), a('gate-d', 'Gate D (south-west)', 'gate', 92, 338, 'Open', 9, true, 'D'),
  { ...a('food-n', 'North Kitchen', 'food', 300, 52, 'Open', 12, true, 'F'), menu: [{ item: 'Grilled flatbread', price: '9.50', allergens: 'wheat, milk' }, { item: 'Rice bowl', price: '11.00', allergens: 'soy, sesame' }, { item: 'Fruit cup', price: '5.00', allergens: 'none declared' }] },
  { ...a('food-e', 'East Grill', 'food', 548, 200, 'Busy', 3, true, 'F'), menu: [{ item: 'Burger', price: '12.00', allergens: 'wheat, milk, egg' }, { item: 'Plant burger', price: '12.50', allergens: 'wheat, soy' }, { item: 'Fries', price: '6.00', allergens: 'none declared' }] },
  { ...a('food-s', 'South Counter', 'food', 300, 350, 'Unknown', null, true, 'F'), menu: [{ item: 'Hot pretzel', price: '6.50', allergens: 'wheat' }] },
  a('wc-nw', 'Restrooms north-west', 'restroom', 150, 46, 'Open', 20, false, 'R'), a('wc-se', 'Restrooms south-east', 'restroom', 450, 356, 'Open', 20, false, 'R'),
  a('wc-acc-w', 'Accessible restroom west', 'accessible-restroom', 52, 200, 'Open', 15, true, 'AR'), a('wc-acc-e', 'Accessible restroom east', 'accessible-restroom', 548, 250, 'Closed', 31, true, 'AR'),
  a('aid-ne', 'First aid north-east', 'first-aid', 450, 46, 'Open', 8, true, '+'), a('guest-sw', 'Guest services south-west', 'guest-services', 150, 356, 'Open', 10, true, 'G'),
  a('water-w', 'Water refill west', 'water', 60, 150, 'Open', 40, true, 'W'), a('water-e', 'Water refill east', 'water', 540, 150, 'Unknown', null, true, 'W'),
  a('lift-sw', 'Lift south-west', 'lift', 200, 340, 'Open', 5, true, 'L'), a('lift-ne', 'Lift north-east', 'lift', 400, 60, 'Open', 5, true, 'L'),
];
export const amenity = (id: string) => AMENITIES.find((x) => x.id === id)!;
export const KIND_LABEL: Record<AmenityKind, string> = { gate: 'Gates', food: 'Food and drink', restroom: 'Restrooms', 'accessible-restroom': 'Accessible restrooms', 'first-aid': 'First aid', 'guest-services': 'Guest services', water: 'Water', lift: 'Lifts' };

export interface Ticket { id: string; label: string; section: string; row: string; seat: string; gate: string; lift: string; stairs: string; platform?: boolean }
export const TICKETS: Ticket[] = [
  { id: 't-113', label: 'Section 113 · row 12 · seat 7', section: '113', row: '12', seat: '7', gate: 'gate-c', lift: 'lift-sw', stairs: 'Stair S4: 18 steps down to row 12' },
  { id: 't-102', label: 'Section 102 · row 4 · seat 18', section: '102', row: '4', seat: '18', gate: 'gate-a', lift: 'lift-ne', stairs: 'Stair N2: 31 steps down to row 4' },
  { id: 't-121', label: 'Section 121 · wheelchair platform · space 3', section: '121', row: 'platform', seat: '3', gate: 'gate-d', lift: 'lift-sw', stairs: 'No stairs: the platform is on the concourse level', platform: true },
];
export const VISITING: Ticket = { id: 't-132', label: 'Section 132 · row 9 · seat 21 (visiting section)', section: '132', row: '9', seat: '21', gate: 'gate-b', lift: 'lift-ne', stairs: 'Stair E3: 22 steps down to row 9' };

/** Metres between two plan points. MODELED from the drawing (1 plan unit ≈ 0.45 m); never surveyed. */
export const metres = (p: Pt, q: Pt) => Math.round(Math.hypot(p[0] - q[0], p[1] - q[1]) * 0.45 / 5) * 5;
export interface Way { points: Pt[]; steps: string[]; metres: number }
/** The way from a ticket's gate to its seat. Step-free goes by the lift; otherwise by the stair. */
export function wayTo(t: Ticket, stepFree: boolean): Way {
  const g = amenity(t.gate); const end = centre(t.section); const lift = amenity(t.lift);
  const points: Pt[] = stepFree && !t.platform ? [[g.x, g.y], [lift.x, lift.y], end] : [[g.x, g.y], end];
  const m = points.slice(1).reduce((n, p, i) => n + metres(points[i]!, p), 0);
  const steps = [`Enter at ${g.label}`, ...(stepFree && !t.platform ? [`Follow the concourse to ${lift.label}`, 'Take the lift to the seating level: no stairs on this way'] : [t.platform ? 'Stay on the concourse level' : 'Follow the concourse to your section', t.stairs]), `Section ${t.section}, ${t.row === 'platform' ? `platform space ${t.seat}` : `row ${t.row}, seat ${t.seat}`}`];
  return { points, steps, metres: m };
}
/** Amenities of a kind, nearest the section first (MODELED distance). */
export const nearest = (section: string, kinds: readonly AmenityKind[]) => AMENITIES.filter((x) => kinds.includes(x.kind)).map((x) => ({ x, m: metres(centre(section), [x.x, x.y]) })).sort((p, q) => p.m - q.m);

export const TIMELINE: { at: string; what: string }[] = [
  { at: '−90 min', what: 'Gates open' }, { at: '−30 min', what: 'Teams warm up' }, { at: '0', what: 'Kick-off' }, { at: '+45 min', what: 'Half-time: concourse busiest' }, { at: '+105 min', what: 'Full time: exits by the nearest gate' },
];
export const FIXTURE = 'Home side v Visiting side — a synthetic fixture';
