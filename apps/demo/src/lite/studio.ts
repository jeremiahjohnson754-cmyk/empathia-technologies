/**
 * The Lite studio's model (V2.5.3 `#/v25/lite`: v25LiteGeometry, v25LiteCreate, v25LitePredict, v25LiteCorrect, v25LiteAdd, v25LiteMove,
 * v25LiteVariant; read as text, nothing run), restored 12 Nov 2026. A conceptual room model: geometry where every dimension carries its
 * source, its state and its uncertainty; placements from the archetype's recipe; seating and stage zones; proposed test points; and the
 * coverage predicted from the plan — always labelled a prediction. Nothing here is measured, and the model never verifies itself: a
 * measurement can only arrive from Field Intelligence and be reviewed by someone else. Pure.
 */
import type { RoomRecord } from '../campus/design.js';
import { ARCHETYPE_NAME } from '../campus/canon.js';

export type GeoSource = 'SURVEY' | 'DESIGN_APPROVED' | 'PLAN' | 'MODEL' | 'REQUEST' | 'PHOTO' | 'ARCHETYPE';
/** V25_GEO_SOURCE: the confidence word, the state, and the share of the value the uncertainty is. Best first. */
export const GEO_SOURCE: Record<GeoSource, [string, string, number]> = {
  SURVEY: ['SURVEY_VERIFIED', 'FIELD_OBSERVED', 0.05], DESIGN_APPROVED: ['DESIGN_APPROVED', 'ENGINEER_APPROVED_DESIGN_TARGET', 0.1], PLAN: ['EXTRACTED', 'EXTRACTED_UNREVIEWED', 0.15],
  MODEL: ['MODELED', 'MODELED', 0.3], REQUEST: ['DECLARED', 'DECLARED', 0.3], PHOTO: ['PHOTO_INFERRED', 'PHOTO_INFERRED', 0.6], ARCHETYPE: ['CONCEPTUAL', 'MODELED', 1],
};
export type Dim = 'length' | 'width' | 'height';
export interface DimValue { value: number; source: GeoSource; state: string; uncertainty: string; basis: string }
export type Kind = 'display' | 'camera' | 'micceil' | 'micwireless' | 'speaker' | 'touch' | 'sensor';
export const KIND: Record<Kind, string> = { display: 'Display', camera: 'Camera', micceil: 'Ceiling microphone array', micwireless: 'Wireless microphone zone', speaker: 'Loudspeaker', touch: 'Touch panel', sensor: 'Occupancy sensor' };
export interface Placement { id: string; kind: Kind; label: string; x: number; y: number; z: number; state: 'MODELED' | 'DESIGNED'; source: string; hfov?: number; aim?: 'audience' | 'stage'; reach?: number }
export interface Zone { id: string; kind: 'stage' | 'seating'; rect: [number, number, number, number] }
export interface Seat { id: string; x: number; y: number }
export interface TestPoint { id: string; x: number; y: number; zone: string; purpose: string; state: 'PROPOSED' }
export interface Prediction { fov: Array<{ placementId: string; label: string; hfov: number; seatsCovered: number; ofSeats: number; fraction: number }>; mic: Reach; speaker: Reach }
export interface Reach { kind: string; devices: number; seatsCovered: number; ofSeats: number; fraction: number; note: string }
export interface LiteModel {
  id: string; name: string; roomId: string | null; roomName: string | null; archetype: string; version: number; capacity: number;
  geometry: Record<Dim, number>; dims: Record<Dim, DimValue>; confidence: string; worstSource: GeoSource;
  zones: Zone[]; seats: Seat[]; placements: Placement[]; testPoints: TestPoint[]; variants: string[]; variantOf?: string; variantReason?: string;
  history: Array<{ v: number; what: string }>; state: 'CONCEPTUAL';
  /** field observations awaiting a decision (V2.5.3 reconciliations): accept one and the geometry advances by survey */
  reconciliations?: Reconciliation[];
}
export interface Reconciliation { id: string; dimension: Dim; observed: number; modeled: number; source: string; state: 'OPEN' | 'ACCEPTED' | 'KEPT_MODEL'; reason?: string; by?: string }
type Frac = [number, number];
interface Recipe { stage: [number, number, number, number] | null; seating: [number, number, number, number]; mic: number; spk: number; display?: Frac[]; camera?: Frac[]; micceil?: Frac[]; micwireless?: Frac[]; speaker?: Frac[]; touch?: Frac[]; sensor?: Frac[] }
/** V25_LITE_RECIPE, word for word: where each kind goes, as fractions of width and length; microphone and loudspeaker reach in metres. */
export const RECIPE: Record<string, Recipe> = {
  default: { stage: null, seating: [0.12, 0.25, 0.88, 0.92], display: [[0.35, 0.02], [0.65, 0.02]], camera: [[0.5, 0.04]], micceil: [[0.5, 0.45], [0.5, 0.75]], speaker: [[0.2, 0.3], [0.8, 0.3], [0.2, 0.75], [0.8, 0.75]], touch: [[0.9, 0.3]], sensor: [[0.08, 0.5]], mic: 4.5, spk: 3.5 },
  EXE: { stage: null, seating: [0.18, 0.22, 0.82, 0.85], display: [[0.38, 0.02], [0.62, 0.02]], camera: [[0.5, 0.05], [0.5, 0.97]], micceil: [[0.5, 0.4], [0.5, 0.7]], speaker: [[0.15, 0.3], [0.85, 0.3], [0.15, 0.78], [0.85, 0.78]], touch: [[0.9, 0.35]], sensor: [[0.08, 0.5]], mic: 4.5, spk: 3.5 },
  BRD: { stage: null, seating: [0.15, 0.2, 0.85, 0.88], display: [[0.5, 0.02]], camera: [[0.5, 0.05]], micceil: [[0.5, 0.35], [0.5, 0.65]], speaker: [[0.2, 0.3], [0.8, 0.3], [0.2, 0.75], [0.8, 0.75]], touch: [[0.9, 0.3]], sensor: [[0.08, 0.5]], mic: 4.5, spk: 3.5 },
  HUD: { stage: null, seating: [0.2, 0.3, 0.8, 0.85], display: [[0.5, 0.02]], camera: [[0.5, 0.06]], micceil: [[0.5, 0.5]], speaker: [[0.5, 0.08]], touch: [[0.85, 0.4]], sensor: [[0.1, 0.5]], mic: 3.5, spk: 3 },
  TWN: { stage: [0.1, 0.02, 0.9, 0.18], seating: [0.08, 0.26, 0.92, 0.95], display: [[0.3, 0.02], [0.7, 0.02]], camera: [[0.5, 0.2], [0.15, 0.97], [0.85, 0.97]], micceil: [[0.5, 0.1], [0.5, 0.5]], micwireless: [[0.3, 0.6], [0.7, 0.6]],
    speaker: [[0.12, 0.28], [0.37, 0.28], [0.63, 0.28], [0.88, 0.28], [0.12, 0.5], [0.37, 0.5], [0.63, 0.5], [0.88, 0.5], [0.12, 0.72], [0.37, 0.72], [0.63, 0.72], [0.88, 0.72], [0.12, 0.92], [0.37, 0.92], [0.63, 0.92], [0.88, 0.92]], touch: [[0.95, 0.15]], sensor: [[0.05, 0.5], [0.95, 0.5]], mic: 6, spk: 4.5 },
};
/** V2.5.3's archetype capacity ranges (the low end hints a model with no room behind it). */
export const ARCH_CAP: Record<string, [number, number]> = { FOC: [2, 4], HUD: [4, 6], COL: [8, 12], EXE: [10, 14], BRD: [16, 22], TRN: [20, 36], TWN: [180, 260] };
const r1 = (x: number) => Math.round(x * 10) / 10, r2 = (x: number) => Math.round(x * 100) / 100;
const worstOf = (dims: Record<Dim, DimValue>) => (Object.values(dims).reduce((a, d) => (GEO_SOURCE[d.source][2] > GEO_SOURCE[a][2] ? d.source : a), 'SURVEY' as GeoSource));
const confidenceOf = (w: GeoSource) => GEO_SOURCE[w][0];

/** v25LiteGeometry: the best source available for each dimension, and which one it was. A room's record is "the campus model (not a
 *  survey)"; with nothing behind it, the archetype's planning size, marked conceptual with an uncertainty as large as the value. */
export function geometryFor(opts: { room?: RoomRecord | null; archetype?: string }): { arch: string; capacity: number; dims: Record<Dim, DimValue> } {
  const room = opts.room || null; const arch = opts.archetype || room?.outline.archetype || 'COL'; const cap = room?.outline.capacity || (ARCH_CAP[arch] || ARCH_CAP.COL!)[0];
  const base: Record<Dim, number> = { length: r1(Math.sqrt(cap * 2.2) * 2.2), width: r1(Math.sqrt(cap * 2.2) * 1.4), height: arch === 'TWN' ? 5.5 : 3 };
  const dims = {} as Record<Dim, DimValue>; const name = ARCHETYPE_NAME[arch] || arch;
  for (const k of ['length', 'width', 'height'] as Dim[]) dims[k] = { value: base[k], source: 'ARCHETYPE', state: 'MODELED', uncertainty: `±${r1(base[k] * GEO_SOURCE.ARCHETYPE[2])} m`, basis: `${name} archetype, ${cap} seats` };
  if (room) { const [w, l, h] = room.outline.dims; const m: Record<Dim, number> = { length: l, width: w, height: h };
    for (const k of ['length', 'width', 'height'] as Dim[]) if (m[k]) dims[k] = { value: m[k], source: 'MODEL', state: 'MODELED', uncertainty: `±${r1(m[k] * GEO_SOURCE.MODEL[2])} m`, basis: 'the campus model (not a survey)' }; }
  return { arch, capacity: cap, dims };
}
/** v25LitePredict: each camera's design field of view on the plan, and reach circles for microphones and loudspeakers. A prediction. */
export function predict(m: Pick<LiteModel, 'seats' | 'placements' | 'geometry'>): Prediction {
  const seats = m.seats; const cams = m.placements.filter((p) => p.kind === 'camera');
  const fov = cams.map((c) => { const aimY = c.aim === 'stage' ? 0 : m.geometry.length, half = (((c.hfov || 90) / 2) * Math.PI) / 180, fwd = aimY - c.y >= 0;
    const covered = seats.filter((s) => { const ang = Math.atan2(s.x - c.x, fwd ? s.y - c.y : c.y - s.y); return Math.abs(ang) <= half && (fwd ? s.y >= c.y : s.y <= c.y); }).length;
    return { placementId: c.id, label: c.label, hfov: c.hfov || 90, seatsCovered: covered, ofSeats: seats.length, fraction: seats.length ? r2(covered / seats.length) : 0 }; });
  const reach = (list: Placement[], kind: string): Reach => { const covered = new Set<string>(); for (const p of list) for (const s of seats) if (Math.hypot(s.x - p.x, s.y - p.y) <= (p.reach || 4)) covered.add(s.id);
    return { kind, devices: list.length, seatsCovered: covered.size, ofSeats: seats.length, fraction: seats.length ? r2(covered.size / seats.length) : 0, note: `conceptual reach circles (${list[0]?.reach ?? '?'} m); not a coverage measurement` }; };
  return { fov, mic: reach(m.placements.filter((p) => /mic/.test(p.kind)), 'microphone pickup'), speaker: reach(m.placements.filter((p) => p.kind === 'speaker'), 'loudspeaker coverage') };
}
/** v25LiteCreate: geometry, the recipe's placements, the zones, the seats in rows across the seating zone, and proposed test points. */
export function createModel(id: string, opts: { room?: RoomRecord | null; archetype?: string; roomName?: string }): LiteModel {
  const g = geometryFor(opts); const R = RECIPE[g.arch] || RECIPE.default!; const L = g.dims.length.value, W = g.dims.width.value, H = g.dims.height.value;
  const px = (f: Frac) => r2(f[0] * W), py = (f: Frac) => r2(f[1] * L); const place: Placement[] = []; let n = 0;
  for (const k of ['display', 'camera', 'micceil', 'micwireless', 'speaker', 'touch', 'sensor'] as Kind[]) for (const f of R[k] || []) { n += 1;
    place.push({ id: `PL${n}`, kind: k, label: `${KIND[k]} ${place.filter((p) => p.kind === k).length + 1}`, x: px(f), y: py(f), z: k === 'micceil' || k === 'speaker' ? r2(H - 0.3) : k === 'camera' ? 1.8 : 1.2, state: 'MODELED', source: `${g.arch} recipe`,
      ...(k === 'camera' ? { hfov: 90, aim: f[1] < 0.5 ? 'audience' as const : 'stage' as const } : k === 'micceil' || k === 'micwireless' ? { reach: R.mic } : k === 'speaker' ? { reach: R.spk } : {}) }); }
  const zones: Zone[] = []; if (R.stage) zones.push({ id: 'Z-STAGE', kind: 'stage', rect: [px([R.stage[0], 0]), py([0, R.stage[1]]), px([R.stage[2], 0]), py([0, R.stage[3]])] });
  zones.push({ id: 'Z-SEATS', kind: 'seating', rect: [px([R.seating[0], 0]), py([0, R.seating[1]]), px([R.seating[2], 0]), py([0, R.seating[3]])] });
  const zs = zones.find((z) => z.kind === 'seating')!.rect, cap = g.capacity, cols = Math.max(2, Math.round(Math.sqrt((cap * (zs[2] - zs[0])) / Math.max(0.5, zs[3] - zs[1])))), rows = Math.ceil(cap / cols); const seats: Seat[] = [];
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols && seats.length < cap; c += 1) seats.push({ id: `S${seats.length + 1}`, x: r2(zs[0] + ((c + 0.5) * (zs[2] - zs[0])) / cols), y: r2(zs[1] + ((r + 0.5) * (zs[3] - zs[1])) / rows) });
  const tp: TestPoint[] = []; const add = (x: number, y: number, zone: string, purpose: string) => tp.push({ id: `TP${tp.length + 1}`, x: r2(x), y: r2(y), zone, purpose, state: 'PROPOSED' });
  for (const z of zones) { const [x1, y1, x2, y2] = z.rect; add((x1 + x2) / 2, (y1 + y2) / 2, z.id, z.kind === 'stage' ? 'presenter position · SPL/STI reference' : 'seating centre · LAeq, STIPA, RT60');
    if (z.kind === 'seating') { add(x1 + 0.6, y1 + 0.6, z.id, 'front corner · coverage edge'); add(x2 - 0.6, y2 - 0.6, z.id, 'rear corner · coverage edge');
      if (g.arch === 'TWN') { add(x1 + 0.6, y2 - 0.6, z.id, 'rear-left · coverage edge'); add(x2 - 0.6, y1 + 0.6, z.id, 'front-right · coverage edge'); add((x1 + x2) / 2, y2 - 0.6, z.id, 'last row centre · intelligibility'); } } }
  const worst = worstOf(g.dims); const label = opts.room?.outline.number || opts.roomName || ARCHETYPE_NAME[g.arch] || g.arch;
  return { id, name: `Lite · ${label} · v1`, roomId: opts.room?.outline.id || null, roomName: opts.room?.outline.name || opts.roomName || null, archetype: g.arch, version: 1, capacity: cap,
    geometry: { length: L, width: W, height: H }, dims: g.dims, confidence: confidenceOf(worst), worstSource: worst, zones, seats, placements: place, testPoints: tp, variants: [], history: [{ v: 1, what: `built from the ${g.dims.length.source === 'MODEL' ? 'campus model' : 'archetype'}` }], state: 'CONCEPTUAL' };
}
export type Result = { ok: true; model: LiteModel } | { ok: false; why: string };
const bump = (m: LiteModel, patch: Partial<LiteModel>, what: string): LiteModel => ({ ...m, ...patch, version: m.version + 1, history: [...m.history, { v: m.version + 1, what }] });
/** v25LiteCorrect: a person's correction of one dimension needs a positive value and a reason; it is "manually proposed", never verified. */
export function correct(m: LiteModel, dim: Dim, value: number, why: string, uncertainty = 'unknown'): Result {
  if (!(['length', 'width', 'height'] as Dim[]).includes(dim) || !(value > 0)) return { ok: false, why: 'A dimension and a positive value are required.' };
  if (!why.trim()) return { ok: false, why: 'Say why (tape measurement, plan reading, owner statement…).' };
  const dims = { ...m.dims, [dim]: { value, source: 'REQUEST' as GeoSource, state: 'MANUALLY_PROPOSED', uncertainty, basis: `manual correction: ${why.trim()}` } }; const worst = worstOf(dims);
  return { ok: true, model: bump(m, { dims, geometry: { ...m.geometry, [dim]: value }, worstSource: worst, confidence: confidenceOf(worst) }, `${dim} corrected to ${value} m`) };
}
/** v25LiteAdd: a designer's placement, inside the room. */
export function addPlacement(m: LiteModel, kind: Kind, x: number, y: number): Result {
  if (!KIND[kind]) return { ok: false, why: `Unknown kind ${kind}.` }; if (!(x >= 0 && x <= m.geometry.width && y >= 0 && y <= m.geometry.length)) return { ok: false, why: 'The position must be inside the room.' };
  const id = `PL${m.placements.length + 1}`; const p: Placement = { id, kind, label: `${KIND[kind]} ${m.placements.filter((q) => q.kind === kind).length + 1}`, x: r2(x), y: r2(y), z: 1.5, state: 'DESIGNED', source: 'designer',
    ...(kind === 'camera' ? { hfov: 90, aim: 'audience' as const } : /mic/.test(kind) ? { reach: 4.5 } : kind === 'speaker' ? { reach: 3.5 } : {}) };
  return { ok: true, model: bump(m, { placements: [...m.placements, p] }, `${id} added`) };
}
/** v25LiteMove: a placement moved by a designer becomes designed, not modeled. */
export function movePlacement(m: LiteModel, id: string, x: number, y: number): Result {
  if (!m.placements.some((p) => p.id === id)) return { ok: false, why: `No placement ${id}.` };
  const cx = Math.min(m.geometry.width, Math.max(0, x)), cy = Math.min(m.geometry.length, Math.max(0, y));
  return { ok: true, model: bump(m, { placements: m.placements.map((p) => (p.id === id ? { ...p, x: r2(cx), y: r2(cy), source: 'designer', state: 'DESIGNED' } : p)) }, `${id} moved`) };
}
/** v25LiteVariant: a copy at version 1 that remembers what it is a variant of and why. */
export function variantOf(m: LiteModel, newId: string, reason: string): Result {
  if (!reason.trim()) return { ok: false, why: 'A variant needs its reason.' };
  const copy: LiteModel = { ...JSON.parse(JSON.stringify(m)) as LiteModel, id: newId, name: `${m.name.replace(/ · v\d+$/, '')} · variant ${m.variants.length + 1} · v1`, version: 1, variantOf: m.id, variantReason: reason.trim(), variants: [], history: [{ v: 1, what: `variant of ${m.id}: ${reason.trim()}` }] };
  return { ok: true, model: copy };
}

/** The test protocols a model asks Field Intelligence to run (V2.5.3 v25LiteToFi, word for word). Proposed only: nothing is measured here. */
export const PROTOCOLS = [
  { id: 'PROTO-LAEQ-SEATS', metric: 'LAeq', how: '30 s per point', instrument: 'class 1 or 2 sound level meter with current calibration', condition: 'unoccupied' },
  { id: 'PROTO-STIPA', metric: 'STIPA', how: 'validated STIPA protocol and instrument', instrument: 'STIPA signal source and analyser', condition: 'unoccupied, HVAC on' },
  { id: 'PROTO-RT60', metric: 'T20/T30', how: 'validated impulse or interrupted-noise protocol', instrument: 'sound source and analyser', condition: 'unoccupied' },
  { id: 'PROTO-FOV', metric: 'camera FOV', how: 'calibration target scan at known distance', instrument: 'calibration target', condition: 'presets recalled' },
] as const;
/** The package sent to Field Intelligence: geometry with what is verified, the device coordinates, the proposed test points, the protocols. */
export function toFi(m: LiteModel) {
  return { schemaVersion: 'empathia.lite-fi.sync.v2.5', liteId: m.id, roomId: m.roomId || `PROVISIONAL:${m.roomName || m.name}`, geometryVersion: m.version, geometry: m.geometry,
    dims: Object.fromEntries((Object.keys(m.dims) as Dim[]).map((k) => [k, { value: m.dims[k].value, verified: m.dims[k].source === 'SURVEY', state: m.dims[k].state, uncertainty: m.dims[k].uncertainty }])),
    geometryConfidence: m.confidence, seats: m.seats.length, deviceCoordinates: m.placements.map((p) => ({ id: p.id, kind: p.kind, x: p.x, y: p.y, z: p.z, state: p.state })),
    proposedTestPoints: m.testPoints, protocols: PROTOCOLS, note: 'proposed protocols: nothing in this package is a measurement' };
}
/** A field observation of one dimension opens a reconciliation; the model does not change until someone decides. */
export function observe(m: LiteModel, dim: Dim, observed: number, source: string): Result {
  if (!(['length', 'width', 'height'] as Dim[]).includes(dim) || !(observed > 0 && observed < 200)) return { ok: false, why: 'A dimension and a positive observed value are required.' };
  if (!source.trim()) return { ok: false, why: 'Name where the observation comes from (the scan, the survey, the visit).' };
  const list = m.reconciliations || []; if (list.some((r) => r.dimension === dim && r.state === 'OPEN')) return { ok: false, why: `${dim} already has an open reconciliation.` };
  const rec: Reconciliation = { id: `REC-${list.length + 1}`, dimension: dim, observed: r2(observed), modeled: m.geometry[dim], source: source.trim().slice(0, 120), state: 'OPEN' };
  return { ok: true, model: { ...m, reconciliations: [...list, rec] } };
}
/** v25LiteReconcile: accept (the dimension becomes SURVEY, FIELD_OBSERVED, ±0.05 m, and the version moves) or keep the model; a reason either way. */
export function reconcile(m: LiteModel, recId: string, decision: 'accept' | 'keep', reason: string, by: string): Result {
  const r = (m.reconciliations || []).find((x) => x.id === recId); if (!r || r.state !== 'OPEN') return { ok: false, why: 'No open reconciliation.' };
  if (!reason.trim()) return { ok: false, why: 'A reason is required.' };
  const recs = (m.reconciliations || []).map((x) => (x.id === recId ? { ...x, state: decision === 'accept' ? 'ACCEPTED' as const : 'KEPT_MODEL' as const, reason: reason.trim(), by } : x));
  if (decision === 'keep') return { ok: true, model: { ...m, reconciliations: recs } };
  const dims = { ...m.dims, [r.dimension]: { value: r.observed, source: 'SURVEY' as GeoSource, state: 'FIELD_OBSERVED', uncertainty: '±0.05 m', basis: `${r.source} · ${recId}` } }; const worst = worstOf(dims);
  return { ok: true, model: bump(m, { dims, geometry: { ...m.geometry, [r.dimension]: r.observed }, worstSource: worst, confidence: confidenceOf(worst), reconciliations: recs }, `${r.dimension} ${r.observed} m from ${recId} (survey): ${reason.trim()}`) };
}
