/**
 * Empathia Lite's model: everything a Lite screen shows is computed here from the campus records (campus/design.ts), the catalogue
 * (class templates only, "spec to verify") and the V2.5.3 Lite records (data/v253.ts). Nothing is typed in; nothing is measured.
 *
 * - lenses (V2.5.3 Lite modes) and layers are admitted by the V2.5.3 authority tables (AZ_LENS, AZ_LAYER) through the shell's policy;
 * - the four states of a room — Designed, Commissioned, Current, Proposed — are derived from its design, baseline, installations,
 *   open issues and the coverage model;
 * - the coverage overlays (camera coverage, microphone pickup, speaker zones, accessibility, infrastructure fit) are MODELED from the
 *   catalogue's declared figures and the planning rules named beside each figure.
 * Pure functions: unit-tested in tests/unit/demo-lite.test.mjs.
 */
import { CAMPUS_ROOMS, BUILDINGS, REGIONAL_SITES, roomById, buildingByKey, shortName, seeded, type RoomOutline, type Building } from '../campus/canon.js';
import { roomRecord, campusRecords, C, openIssues, type RoomRecord, type Position } from '../campus/design.js';
import { allows } from '../access/policy.js';
import { AZ_LENS_HOME } from '../access/v253.js';
import type { RoleKey } from '../registry.types.js';
import { LITE_MODES, LITE_LAYERS, SPACES, GUIDES } from './data/v253.js';

// ------------------------------------------------------------------------------------------------ lenses, layers, overlays
export type Lens = 'visitor' | 'employee' | 'user' | 'engineer' | 'exec' | 'optimize';
export const LENSES = LITE_MODES.map(([key, label, gives, says]) => ({ key: key as Lens, label, gives, says }));
export const lensesFor = (role: RoleKey) => LENSES.filter((l) => allows({ lens: l.key }, role));
/** the role's home lens (V2.5.3 AZ_LENS_HOME), or the first it may use */
export function defaultLens(role: RoleKey): Lens | null {
  const home = (AZ_LENS_HOME as Record<string, string>)[role] as Lens | undefined;
  const open = lensesFor(role);
  return (home && open.some((l) => l.key === home) ? home : open[0]?.key) ?? null;
}
export function lensFor(role: RoleKey, asked: string | null): Lens | null {
  const open = lensesFor(role);
  return asked && open.some((l) => l.key === asked) ? (asked as Lens) : defaultLens(role);
}

export type LiteLayer = 'furniture' | 'av' | 'network' | 'power' | 'control' | 'environment' | 'occupancy' | 'wayfinding';
export const LITE_LAYER_LIST = LITE_LAYERS.map(([key, label, says]) => ({ key: key as LiteLayer, label, says }));
export const layersFor = (role: RoleKey) => LITE_LAYER_LIST.filter((l) => allows({ layer: l.key }, role));
/** which Lite layer a device position belongs to */
export function liteLayerOf(p: Position): LiteLayer {
  if (p.furniture) return 'furniture';
  if (p.layer === 'display' || p.layer === 'video' || p.layer === 'audio') return 'av';
  if (p.layer === 'network') return 'network';
  if (p.layer === 'power') return 'power';
  if (['occsensor', 'lighting', 'hvac', 'iot'].includes(p.cat)) return 'environment';
  return 'control';
}
/** layers a lens shows by default (V2.5.3 LITE_MODE_LAYERS, widened for the technical lenses), within what the role may see */
export function defaultLayers(lens: Lens, role: RoleKey): LiteLayer[] {
  const want: Record<Lens, LiteLayer[]> = {
    visitor: ['furniture', 'wayfinding'], employee: ['furniture', 'wayfinding', 'occupancy'], user: ['furniture', 'av'],
    engineer: ['furniture', 'av', 'network', 'power', 'control'], exec: ['furniture', 'av'], optimize: ['furniture', 'av', 'control'],
  };
  const may = new Set(layersFor(role).map((l) => l.key));
  return want[lens].filter((k) => may.has(k));
}

export type Overlay = 'camera' | 'mic' | 'speaker' | 'sight' | 'access' | 'infra';
export const OVERLAYS: Array<{ key: Overlay; label: string; basis: string; layer: LiteLayer }> = [
  { key: 'camera', label: 'Camera coverage', basis: 'Modeled from the catalogue field of view · not measured', layer: 'av' },
  { key: 'mic', label: 'Microphone pickup', basis: 'Modeled from the catalogue pickup radius · not measured', layer: 'av' },
  { key: 'speaker', label: 'Speaker zones', basis: 'Illustrative coverage model from the catalogue coverage radius', layer: 'av' },
  { key: 'sight', label: 'Sightlines', basis: 'Modeled from display positions and image size (45° and 60° off axis, six image heights) · not measured', layer: 'av' },
  { key: 'access', label: 'Accessibility', basis: 'Planning reference (ADA 2010 tables 221.2.1.1 and 219.3) · to verify on site', layer: 'wayfinding' },
  { key: 'infra', label: 'Infrastructure fit', basis: 'Declared catalogue values (PoE, rack units, outlets) · not measured', layer: 'network' },
];
/** an overlay is offered only to a role that may see its layer (D44: absent, not disabled) */
export const overlaysFor = (role: RoleKey) => OVERLAYS.filter((o) => allows({ layer: o.layer }, role));
export const defaultOverlays = (lens: Lens): Overlay[] => (lens === 'engineer' || lens === 'optimize' ? ['camera', 'mic'] : lens === 'visitor' || lens === 'employee' ? ['access'] : []);

// ------------------------------------------------------------------------------------------------ geometry of a room
export interface Seat { x: number; y: number; wheelchair?: boolean }
export interface Door { x: number; y: number; width: number }
export const ROUTE_CLEAR_M = 0.815;   // ADA 404.2.3 minimum clear opening (32 in), planning reference

/** Seats: each catalogue seating block spread into its declared seat count; an assembly room without blocks gets rows. MODELED. */
export function seatsOf(r: RoomRecord): Seat[] {
  const [w, l] = r.outline.dims; const out: Seat[] = [];
  for (const p of r.positions.filter((x) => x.cat === 'chairs')) {
    const K = C.categories.chairs!; const n = Number(K.props?.['seats']) || 6; const [sw, sd] = K.size || [2.4, 1];
    const rows = sd >= 0.9 ? 2 : 1; const cols = Math.ceil(n / rows);
    for (let i = 0; i < n; i += 1) { const c = i % cols, rr = Math.floor(i / cols); out.push({ x: clamp(p.x - sw / 2 + (sw * (c + 0.5)) / cols, 0.3, w - 0.3), y: clamp(p.y - sd / 2 + (sd * (rr + 0.5)) / rows, 0.3, l - 0.3) }); }
  }
  if (!out.length || out.length < Math.min(r.outline.capacity, 400) * 0.5) {
    // rows facing the front wall (y = 0), from 35 % of the depth to the back: the room's capacity, at most 400 drawn
    out.length = 0; const n = Math.min(r.outline.capacity, 400); const y0 = Math.max(1.5, l * 0.3), y1 = l - 0.6;
    const perRow = Math.max(1, Math.ceil(Math.sqrt((n * (w - 1.2)) / (y1 - y0))));
    const rowsN = Math.ceil(n / perRow);
    for (let i = 0; i < n; i += 1) { const c = i % perRow, rr = Math.floor(i / perRow); out.push({ x: 0.6 + ((w - 1.2) * (c + 0.5)) / perRow, y: y0 + ((y1 - y0) * (rr + 0.5)) / rowsN }); }
  }
  const need = wheelchairSpaces(r);
  // wheelchair spaces at the ends of rows nearest the door (back wall), deterministic
  const byBack = out.map((s, i) => ({ s, i })).sort((a, b) => b.s.y - a.s.y || Math.abs(a.s.x - w * 0.15) - Math.abs(b.s.x - w * 0.15));
  for (let k = 0; k < need && k < byBack.length; k += 1) byBack[k]!.s.wheelchair = true;
  return out;
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** the door: on the back wall (y = length), near one corner — MODELED (the records carry no door) */
export const doorOf = (r: RoomRecord): Door => { const [w, l] = r.outline.dims; return { x: Math.min(w - 0.8, Math.max(0.8, w * 0.15)), y: l, width: w > 12 ? 1.8 : 0.915 }; };
const ASSEMBLY = new Set(['TWN', 'DIV', 'STU']);
/** ADA 2010 table 221.2.1.1 (assembly seating); a meeting room keeps one accessible place at the table. Planning reference. */
export function wheelchairSpaces(r: RoomRecord): number {
  const n = r.outline.capacity;
  if (!ASSEMBLY.has(r.outline.archetype)) return 1;
  if (n <= 3) return 0; if (n <= 25) return 1; if (n <= 50) return 2; if (n <= 150) return 4; if (n <= 300) return 5; if (n <= 500) return 6;
  return 6 + Math.ceil((n - 500) / 150);
}
/** ADA 2010 table 219.3 (assistive listening receivers), where the room has an amplification system. Planning reference. */
export function assistiveReceivers(r: RoomRecord): number {
  if (!r.positions.some((p) => p.cat === 'speaker' || p.cat === 'amp')) return 0;
  const n = r.outline.capacity;
  if (n <= 50) return 2; if (n <= 200) return 2 + Math.ceil((n - 50) / 25); if (n <= 500) return Math.ceil(n / 20);
  if (n <= 1000) return 35 + Math.ceil((n - 500) / 50); return 55 + Math.ceil((n - 1000) / 100);
}

// ------------------------------------------------------------------------------------------------ coverage model
export interface Cone { code: string; x: number; y: number; aim: number; half: number; range: number }
export interface Disc { code: string; x: number; y: number; r: number }
export interface CoverageModel {
  seats: Seat[]; door: Door;
  /** what the microphones must hear: every seat in a meeting room; the stage positions in an assembly room (the audience is not miked) */
  pickup: { targets: Array<{ x: number; y: number }>; of: 'seats' | 'stage positions'; worn: number };
  cones: Cone[]; mics: Disc[]; speakers: Disc[];
  camera: { covered: number; of: number }; mic: { covered: number; of: number }; speaker: { pct: number };
  access: { wheelchair: number; required: number; receivers: number; routeClear: number; routeOk: boolean };
  infra: { poe: number; budget: number; units: number; unitsOf: number; outlets: number; outletsOf: number; networked: number; ports: number; fits: boolean };
  /** display sightlines (V2.5.3 metricsOf, restored 12 Nov 2026): each seat's best view of a display, classed as V2.5.3 classes it */
  sight: Sightlines;
  /** seats inside a loudspeaker's coverage radius */
  speakerSeats: number;
}
export type SightClass = 'CLEAR' | 'MARGINAL' | 'OBSTRUCTED';
export interface SightRay { seat: number; sx: number; sy: number; dx: number; dy: number; dz: number; cls: SightClass; why: string; dist: number; off: number }
export interface Sightlines { na: boolean; rays: SightRay[]; clear: number; marginal: number; obstructed: number; score: number | null }
/** The displays a room's audience looks at: the image centre, its height and the way it faces (towards the seats; a planning assumption,
 *  as is the size of a projected image: three tenths of the room's width at 16:9, at most 2.4 m tall, on the front wall). */
export function displaysOf(positions: Position[], w: number, cx: number, cy: number) {
  const prop = (p: Position, k: string, d: number) => Number(C.categories[p.cat]?.props?.[k]) || d;
  return positions.filter((p) => ['display', 'ledwall', 'projector'].includes(p.cat)).map((p) => {
    const H = p.cat === 'display' ? prop(p, 'diagonal_in', 65) * 0.0254 * 0.4903 : p.cat === 'ledwall' ? (prop(p, 'width_m', 4) * 9) / 16 : Math.min(2.4, (w * 0.3 * 9) / 16);
    const x = p.x, y = p.cat === 'projector' ? 0 : p.y, z = p.cat === 'projector' ? 1.2 : p.z;
    return { code: p.code, x, y, h: Math.round(H * 100) / 100, z: z + H / 2, face: Math.atan2(cy - y, cx - x) };
  });
}
const angDiff = (a: number, b: number) => { let d = Math.abs(a - b) % (2 * Math.PI); if (d > Math.PI) d = 2 * Math.PI - d; return (d * 180) / Math.PI; };
/** Does the segment from (x0,y0) to (x1,y1) cross the box? (Liang–Barsky) */
export function segHitsBox(x0: number, y0: number, x1: number, y1: number, b: { x: number; y: number; w: number; d: number }): boolean {
  let t0 = 0, t1 = 1; const dx = x1 - x0, dy = y1 - y0;
  for (const [p, q] of [[-dx, x0 - (b.x - b.w / 2)], [dx, b.x + b.w / 2 - x0], [-dy, y0 - (b.y - b.d / 2)], [dy, b.y + b.d / 2 - y0]] as const) {
    if (p === 0) { if (q < 0) return false; continue; } const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } }
  return t0 <= t1;
}
/** V2.5.3's sightline classes: more than 60° off a display's centre line, or blocked by something tall (a lectern), is obstructed; more
 *  than 45° off, or beyond six image heights, is marginal; otherwise clear. Each seat takes its best display. Score: clear + half marginal. */
export function sightlines(seats: Seat[], positions: Position[], w: number): Sightlines {
  const cx = seats.length ? seats.reduce((s, x) => s + x.x, 0) / seats.length : w / 2, cy = seats.length ? seats.reduce((s, x) => s + x.y, 0) / seats.length : 0;
  const ds = displaysOf(positions, w, cx, cy); const blockers = positions.filter((p) => p.cat === 'lectern').map((p) => { const sz = C.categories[p.cat]?.size || [0.6, 0.5]; return { x: p.x, y: p.y, w: sz[0]!, d: sz[1]! }; });
  const rays: SightRay[] = []; const rank = { CLEAR: 0, MARGINAL: 1, OBSTRUCTED: 2 } as const;
  seats.forEach((s, i) => { let best: (SightRay & { r: number }) | null = null;
    for (const d of ds) { const dist = Math.hypot(s.x - d.x, s.y - d.y), off = angDiff(Math.atan2(s.y - d.y, s.x - d.x), d.face); let cls: SightClass = 'CLEAR', why = '';
      if (off > 60) { cls = 'OBSTRUCTED'; why = 'more than 60° off the centre line'; } else if (blockers.some((b) => segHitsBox(s.x, s.y, d.x, d.y, b))) { cls = 'OBSTRUCTED'; why = 'blocked by something in the room'; }
      else if (off > 45) { cls = 'MARGINAL'; why = 'more than 45° off the centre line'; } else if (dist > 6 * d.h) { cls = 'MARGINAL'; why = `beyond six image heights (${(6 * d.h).toFixed(1)} m)`; }
      const r = rank[cls] * 100 + dist; if (!best || r < best.r) best = { seat: i, sx: s.x, sy: s.y, dx: d.x, dy: d.y, dz: d.z, cls, why, dist: Math.round(dist * 10) / 10, off: Math.round(off), r }; }
    if (best) { const { r, ...ray } = best; void r; rays.push(ray); } });
  const clear = rays.filter((r) => r.cls === 'CLEAR').length, marginal = rays.filter((r) => r.cls === 'MARGINAL').length;
  return { na: !ds.length, rays, clear, marginal, obstructed: rays.length - clear - marginal, score: ds.length && seats.length ? Math.round(((clear + marginal * 0.5) / seats.length) * 100) : null };
}
const inCone = (c: Cone, s: { x: number; y: number }) => { const d = Math.hypot(s.x - c.x, s.y - c.y); if (d > c.range || d < 0.01) return d < 0.01; let a = Math.atan2(s.y - c.y, s.x - c.x) - c.aim; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return Math.abs(a) <= c.half; };
const inDisc = (d: Disc, s: { x: number; y: number }) => Math.hypot(s.x - d.x, s.y - d.y) <= d.r;

/** The coverage model of a set of positions in a room (the room's current positions unless a state gives others). */
/** One seat more or fewer (the Optimize lens's seat count): fewer drops the last; more adds them in a row behind the last row. MODELED. */
export function adjustSeats(seats: Seat[], delta: number, w: number, l: number): Seat[] {
  if (delta <= 0) return seats.slice(0, Math.max(1, seats.length + delta));
  const y = Math.min(l - 0.3, Math.max(...seats.map((s) => s.y), 0) + 0.9); return [...seats, ...Array.from({ length: delta }, (_, i) => ({ x: clamp(0.6 + ((w - 1.2) * (i + 0.5)) / delta, 0.3, w - 0.3), y }))];
}
export function coverage(r: RoomRecord, positions: Position[] = r.positions, seatDelta = 0): CoverageModel {
  const [w, l] = r.outline.dims; const seats = seatDelta ? adjustSeats(seatsOf(r), seatDelta, w, l) : seatsOf(r); const door = doorOf(r);
  const cx = seats.length ? seats.reduce((s, x) => s + x.x, 0) / seats.length : w / 2, cy = seats.length ? seats.reduce((s, x) => s + x.y, 0) / seats.length : l / 2;
  const prop = (p: Position, k: string, d: number) => Number(C.categories[p.cat]?.props?.[k]) || d;
  const cones: Cone[] = positions.filter((p) => p.cat === 'camera' || p.cat === 'bar').map((p) => ({
    code: p.code, x: p.x, y: p.y, aim: Math.atan2(cy - p.y, cx - p.x), half: (prop(p, 'fov_deg', 70) * Math.PI) / 360,
    // a PTZ camera (12× zoom) frames the room's far wall; a video bar reaches its declared pickup range — planning assumptions
    range: p.cat === 'camera' ? Math.hypot(w, l) : prop(p, 'pickup_m', 4.5) * 1.6,
  }));
  const mics: Disc[] = positions.filter((p) => ['micceil', 'mictable', 'bar'].includes(p.cat)).map((p) => ({ code: p.code, x: p.x, y: p.y, r: prop(p, 'pickup_m', 1.5) }));
  const speakers: Disc[] = positions.filter((p) => p.cat === 'speaker').map((p) => ({ code: p.code, x: p.x, y: p.y, r: prop(p, 'coverage_m', 4) }));
  const camCovered = seats.filter((s) => cones.some((c) => inCone(c, s))).length;
  const assembly = ASSEMBLY.has(r.outline.archetype) && r.outline.capacity > 40;
  const targets = assembly ? Array.from({ length: 5 }, (_, i) => ({ x: w * (0.2 + i * 0.15), y: Math.min(2, l * 0.12) })) : seats;
  // worn or handheld wireless microphones: one voice per declared channel (catalogue), counted towards the targets
  const worn = positions.filter((p) => p.cat === 'micwireless').reduce((s, p) => s + prop(p, 'channels', 4), 0);
  const micCovered = Math.min(targets.length, targets.filter((s) => mics.some((m) => inDisc(m, s))).length + worn);
  // speaker zones: share of a 0.5 m floor grid inside a loudspeaker's coverage radius
  let cells = 0, hit = 0; for (let x = 0.25; x < w; x += 0.5) for (let y = 0.25; y < l; y += 0.5) { cells += 1; if (speakers.some((s) => inDisc(s, { x, y }))) hit += 1; }
  const wheelchair = seats.filter((s) => s.wheelchair).length; const required = wheelchairSpaces(r);
  // infrastructure: declared catalogue figures summed over the positions
  const live = positions.filter((p) => !p.furniture);
  const poe = Math.round(live.reduce((s, p) => s + (C.categories[p.cat]?.poe || 0), 0) * 10) / 10;
  const switches = live.filter((p) => p.cat === 'switch');
  const budget = switches.reduce((s, p) => s + prop(p, 'poe_budget_w', 0), 0);
  const ports = switches.reduce((s, p) => s + prop(p, 'ports', 0), 0);
  const networked = live.filter((p) => C.categories[p.cat]?.net && p.cat !== 'switch').length;
  const rackDev = live.filter((p) => p.mount === 'rack').length; const racks = live.filter((p) => p.cat === 'rack').length;
  const unitsOf = racks * 24; const units = rackDev * (1 + 0); // one rack unit per rack-mounted device: planning assumption
  const pdus = live.filter((p) => p.cat === 'pdu').length; const outletsOf = pdus * 8; const outlets = rackDev;
  const fits = (budget === 0 || poe <= budget) && (unitsOf === 0 || units <= unitsOf) && (outletsOf === 0 || outlets <= outletsOf) && (ports === 0 || networked <= ports);
  return {
    seats, door, pickup: { targets, of: assembly ? 'stage positions' : 'seats', worn }, cones, mics, speakers,
    camera: { covered: camCovered, of: seats.length }, mic: { covered: micCovered, of: targets.length }, speaker: { pct: cells ? Math.round((hit / cells) * 100) : 0 },
    access: { wheelchair, required, receivers: assistiveReceivers(r), routeClear: door.width, routeOk: door.width >= ROUTE_CLEAR_M && wheelchair >= required },
    infra: { poe, budget, units, unitsOf, outlets, outletsOf, networked, ports, fits },
    sight: sightlines(seats, positions, w), speakerSeats: seats.filter((s) => speakers.some((d) => inDisc(d, s))).length,
  };
}
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

// ------------------------------------------------------------------------------------------------ the four states
export type StateKey = 'designed' | 'commissioned' | 'current' | 'proposed';
export const STATES: Array<{ key: StateKey; label: string; says: string }> = [
  { key: 'designed', label: 'Designed', says: 'What was planned' }, { key: 'commissioned', label: 'Commissioned', says: 'What was proven at handover' },
  { key: 'current', label: 'Current', says: 'What exists now' }, { key: 'proposed', label: 'Proposed', says: 'What is being proposed' },
];
export type Mark = 'same' | 'changed' | 'attention' | 'added' | 'moved';
export interface StatePosition extends Position { mark: Mark; note?: string }
export interface RoomState {
  key: StateKey; available: boolean; title: string; summary: string; basis: string;
  positions: StatePosition[]; marks: Record<Mark, number>; cov: CoverageModel;
}

/** Derive one of the four states of a room from its record. */
export function roomState(r: RoomRecord, key: StateKey): RoomState {
  const base = r.positions;
  const marks = (ps: StatePosition[]) => ps.reduce((m, p) => { m[p.mark] += 1; return m; }, { same: 0, changed: 0, attention: 0, added: 0, moved: 0 } as Record<Mark, number>);
  const mk = (title: string, summary: string, basis: string, ps: StatePosition[], available = true): RoomState => ({ key, available, title, summary, basis, positions: ps, marks: marks(ps), cov: coverage(r, ps) });
  const bl = r.baselines.find((b) => b.state === 'CURRENT') || r.baselines[0];
  if (key === 'designed') {
    return mk('The approved design', `${base.filter((p) => !p.furniture).length} device positions from the ${r.archetypeName.toLowerCase()} template${r.templateNote ? ` (${r.templateNote})` : ''}.`, 'Design record · class templates from the catalogue, spec to verify', base.map((p) => ({ ...p, mark: 'same' })));
  }
  if (key === 'commissioned') {
    if (!bl) return mk('Not commissioned yet', `No commissioning baseline: ${r.counts.verified} of ${r.counts.applicable} applicable tests verified so far. The room is ${r.lifecycle.toLowerCase().replace(/_/g, ' ')}.`, 'Commissioning record · no baseline published', base.map((p) => ({ ...p, mark: 'same' })), false);
    const at = bl.at;
    const ps = base.map((p): StatePosition => {
      const was = r.installations.find((i) => i.position === p.code && i.installedAt <= at && (!i.removedAt || i.removedAt > at));
      return was && was.asset !== p.asset ? { ...p, asset: was.asset, mark: 'same', note: `at acceptance: ${was.asset}` } : { ...p, mark: 'same' };
    });
    return mk(`Baseline v${bl.version} (${bl.at.slice(0, 10)})`, `What commissioning proved: ${r.counts.verified} of ${r.counts.applicable} applicable tests verified${bl.state === 'SUPERSEDED' ? '; a later baseline replaces it' : ''}.`, `Commissioning baseline · ${bl.note}`, ps);
  }
  if (key === 'current') {
    const issuePos = new Set(openIssues(r).flatMap((i) => i.positions));
    const moved = openIssues(r).some((i) => /moved/i.test(i.title));
    const ps = base.map((p): StatePosition => {
      const changed = r.installations.some((i) => i.position === p.code && i.removedAt);
      if (issuePos.has(p.code)) return { ...p, mark: 'attention', note: openIssues(r).find((i) => i.positions.includes(p.code))!.title };
      if (moved && p.furniture) return { ...p, x: p.x + 0.6, y: p.y + 0.4, mark: 'moved', note: 'moved since handover (field report)' };
      if (changed) return { ...p, mark: 'changed', note: 'unit replaced after acceptance' };
      return { ...p, mark: 'same' };
    });
    const n = openIssues(r).length;
    return mk('As it stands now', n ? `${n} open issue${n === 1 ? '' : 's'} on the record: ${openIssues(r).map((i) => i.title).join(' · ')}` : 'Matches the record: no open issue, no unit replaced since acceptance.', 'Installations and open issues on the record · no live telemetry', ps);
  }
  // proposed: what would close the gaps the coverage model finds in the current state
  if (r.outline.kind === 'earlier') return mk('Records only', 'This room keeps the demonstration’s earlier record. It is designed only through an explicit, versioned design process that preserves its records (founder, 2 Nov), so nothing is proposed here.', 'Earlier record · no proposal', base.map((p) => ({ ...p, mark: 'same' })), false);
  const cur = roomState(r, 'current'); const cov = cur.cov; const [w, l] = r.outline.dims;
  const add: StatePosition[] = []; let k = 0;
  const pos = (cat: string, label: string, x: number, y: number, note: string): StatePosition => {
    const K = C.categories[cat]!; k += 1;
    return { code: `P-${String(k).padStart(2, '0')}`, cat, catLabel: K.label, label, layer: base.find((b) => b.cat === cat)?.layer || 'video', x, y, z: K.z || 0, rot: 0, mount: K.mount, furniture: false, asset: null, identity: 'UNKNOWN', device: `${K.label} · class template · spec to verify`, provenance: 'proposal (modeled, not approved)', mark: 'added', note };
  };
  const uncovered = (test: (s: Seat) => boolean) => { const u = cov.seats.filter((s) => !test(s)); return u.length ? { x: u.reduce((a, s) => a + s.x, 0) / u.length, y: u.reduce((a, s) => a + s.y, 0) / u.length, n: u.length } : null; };
  const camGap = uncovered((s) => cov.cones.some((c) => inCone(c, s)));
  if (camGap && cov.cones.length) add.push(pos('camera', 'Proposed camera', camGap.x < w / 2 ? w - 0.3 : 0.3, 0.2, `${camGap.n} seats outside every camera's view`));
  const tg = cov.pickup.targets.filter((s) => !cov.mics.some((m) => inDisc(m, s)));
  const micGap = cov.mic.covered < cov.mic.of && tg.length ? { x: tg.reduce((a, s) => a + s.x, 0) / tg.length, y: tg.reduce((a, s) => a + s.y, 0) / tg.length, n: cov.mic.of - cov.mic.covered } : null;
  if (micGap) add.push(pos('micceil', 'Proposed ceiling microphone', clamp(micGap.x, 0.5, w - 0.5), clamp(micGap.y, 0.5, l - 0.5), `${micGap.n} ${cov.pickup.of} beyond every microphone's pickup`));
  if (cov.speakers.length && cov.speaker.pct < 50) add.push(pos('speaker', 'Proposed loudspeaker', w / 2, l * 0.8, `speaker zones cover ${cov.speaker.pct} % of the floor`));
  const ps = [...cur.positions.map((p) => (p.mark === 'moved' ? { ...p, x: p.x - 0.6, y: p.y - 0.4, mark: 'moved' as Mark, note: 'proposed: back to the commissioned layout' } : { ...p })), ...add];
  if (!add.length && !cur.marks.moved) return mk('No change proposed', 'The coverage model finds no gap to close in this room, so nothing is proposed.', 'Proposal · modeled from the current state', cur.positions.map((p) => ({ ...p, mark: p.mark === 'attention' ? 'attention' : 'same' })), false);
  return mk('A proposed change (not approved)', `${add.length} position${add.length === 1 ? '' : 's'} added${cur.marks.moved ? ', furniture back to the commissioned layout' : ''}: ${add.map((a) => a.note).join(' · ') || 'restore the layout'}. A proposal changes nothing until it is approved, re-commissioned and accepted.`, 'Proposal · modeled from the coverage gaps of the current state · not approved', ps);
}

// ------------------------------------------------------------------------------------------------ divisible rooms
export interface Config { key: string; label: string; sections: string[]; x0: number; x1: number }
/** A divisible room's configurations: combined, and each section on its own (the partitions run across the width). */
export function configsOf(o: RoomOutline): Config[] {
  if (!o.divisible) return [];
  const s = o.divisible.sections; const w = o.dims[0];
  return [{ key: 'combined', label: `Combined (${s.join(' + ')})`, sections: s, x0: 0, x1: w }, ...s.map((n, i) => ({ key: n, label: `Section ${n}`, sections: [n], x0: (w * i) / s.length, x1: (w * (i + 1)) / s.length }))];
}
/** What each configuration requires and where its commissioning stands (from the record's untested rows). */
export function configStatus(r: RoomRecord, c: Config): { cameras: number; mics: number; seats: number; commissioned: boolean; note: string } {
  // half-open sections, so a seat or device on a partition line belongs to exactly one section
  const inside = (x: number) => x >= c.x0 && (x < c.x1 || c.x1 >= r.outline.dims[0]);
  const cams = r.positions.filter((p) => (p.cat === 'camera' || p.cat === 'bar') && inside(p.x)).length;
  const mics = r.positions.filter((p) => ['micceil', 'mictable'].includes(p.cat) && inside(p.x)).length;
  const seats = seatsOf(r).filter((s) => inside(s.x)).length;
  const held = r.lifecycle === 'COMMISSIONING' && c.key === 'combined';
  return { cameras: cams, mics, seats, commissioned: !held && !!r.baselines.length, note: c.key === 'combined' ? 'One programme across the hall: audio, cameras and control follow the partitions open.' : `Its own audio, cameras and control while the partitions are closed.` };
}

// ------------------------------------------------------------------------------------------------ campus and readiness
/** A readiness score from the record: verified tests (70) and open issues (30, less by severity). Computed, not measured. */
export function readiness(r: RoomRecord): number {
  const t = r.counts.applicable ? r.counts.verified / r.counts.applicable : 0;
  const pen = openIssues(r).reduce((s, i) => s + (i.severity === 'High' ? 18 : i.severity === 'Medium' ? 10 : 5), 0);
  return Math.max(0, Math.round(t * 70 + Math.max(0, 30 - pen)));
}
export const ALL_SITES: Building[] = [...BUILDINGS, ...REGIONAL_SITES];
export const roomsOf = (b: string, f?: number) => CAMPUS_ROOMS.filter((r) => r.building === b && (f == null || r.floor === f));
export const liteRoomHref = (id: string, q = '') => `#/lite/room/${id}${q ? `?${q}` : ''}`;
export function buildingSummary(b: string) {
  const recs = roomsOf(b).map((o) => roomRecord(o.id)!);
  const scores = recs.map(readiness);
  return { rooms: recs.length, issues: recs.reduce((s, r) => s + openIssues(r).length, 0), score: scores.length ? Math.round(scores.reduce((a, b2) => a + b2, 0) / scores.length) : null, commissioning: recs.filter((r) => r.lifecycle === 'COMMISSIONING').length };
}
export function campusSummary() {
  const recs = campusRecords();
  return { rooms: recs.length, sites: ALL_SITES.length, issues: recs.reduce((s, r) => s + openIssues(r).length, 0), score: Math.round(recs.map(readiness).reduce((a, b) => a + b, 0) / recs.length), accepted: recs.filter((r) => r.lifecycle === 'ACCEPTED').length, commissioning: recs.filter((r) => r.lifecycle === 'COMMISSIONING').length, plan: recs.filter((r) => r.outline.planRow).length };
}

// ------------------------------------------------------------------------------------------------ wayfinding
export interface Route { to: string; label: string; href: string; building: string; floor: number; steps: string[]; minutes: number }
/** A walking route from the Atlas main entrance to a room or space (modeled: buildings by their map positions, floors by lift). */
export function routeTo(id: string): Route | null {
  const space = SPACES.find((s) => s.id === id);
  if (space) return { to: id, label: space.name, href: `#/lite/space/${id}`, building: 'ATL', floor: space.floor, steps: ['Enter Atlas HQ by the main entrance (step-free, automatic doors)', space.floor === 1 ? `${space.name} is on the ground floor: follow the floor signs` : `Take the Atlas lifts to floor ${space.floor}`, `Follow the signs to ${space.name}`], minutes: space.floor === 1 ? 2 : 4 };
  const o = roomById(id); if (!o) return null;
  const B = buildingByKey(o.building)!; const regional = REGIONAL_SITES.some((x) => x.key === o.building);
  const atl = BUILDINGS.find((x) => x.key === 'ATL')!; const dist = Math.hypot(B.map.x - atl.map.x, B.map.y - atl.map.y);
  const steps = regional
    ? [`${B.name} is a fictional regional site, not on the Northstar campus`, `At ${B.short}, enter by the main entrance`, o.floor > 1 ? `Take the lift to floor ${o.floor}` : 'The room is on the ground floor', `Room ${o.number}: ${o.name}`]
    : [
      o.building === 'ATL' ? 'Start at the Atlas main entrance' : `From the Atlas plaza, follow the lit path to ${B.name} (about ${Math.max(1, Math.round(dist * 60))} m)`,
      o.building === 'ATL' ? 'Check in at reception if you are visiting' : `Enter ${B.short} by the entrance facing the plaza`,
      o.floor > 1 ? `Take the ${B.short} lifts to floor ${o.floor}` : 'The room is on the ground floor',
      `Follow the room numbers to ${o.number} (${o.name})`,
    ];
  return { to: id, label: `${shortName(o)} ${o.name}`, href: liteRoomHref(id), building: o.building, floor: o.floor, steps, minutes: regional ? 0 : Math.max(1, Math.round(dist * 0.9 + o.floor * 0.5)) };
}
/** destinations people can pick: every space, then every room, in campus order */
export const DESTINATIONS = [...SPACES.map((s) => ({ id: s.id, label: s.name, group: 'Places' })), ...CAMPUS_ROOMS.map((o) => ({ id: o.id, label: `${shortName(o)} ${o.name}`, group: 'Rooms' }))];

// ------------------------------------------------------------------------------------------------ guides
export const chapterCount = () => GUIDES.reduce((s, g) => s + g.chapters.length, 0);
export const chapterById = (id: string) => { for (const g of GUIDES) { const c = g.chapters.find((x) => x[0] === id); if (c) return { g, c }; } return null; };

/** deterministic simulated occupancy (Occupancy layer): a share of seats, fixed per room */
export function occupancy(r: RoomRecord, seats: Seat[]): boolean[] { const rng = seeded(`${r.outline.id}:occ`); const share = 0.2 + rng() * 0.5; return seats.map(() => rng() < share); }
