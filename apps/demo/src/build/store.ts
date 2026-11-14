/**
 * Build a Room for the investor demonstration: the real commissioning engine (the same package the enterprise API runs), a synthetic
 * room held in the page, and the demonstration's perspective standing in for the signed-in person. Nothing leaves the page; nothing is
 * authenticated — the perspective is a view and the rules below are the engine's own, so a refusal here is the refusal the product gives.
 * The draft is kept in localStorage as a convenience for this viewer only (wrapped: storage may be unavailable) and can be reset.
 */
import {
  analyzeRoom, defaultCatalog, outlineFor, templateDevices, newDevice, proposeConnections, parseLength, lifecycleBlockers, LIFECYCLE_AUTHORITY, area as polyArea,
  recordBlockers, buildResult, verifyBlockers, resultLabel, drawingInput, DRAWING_KINDS, registerBlocker, type RoomAnalysis,
} from '@empathia/commissioning-engine';
import { validateEntry, missingOf, isNetworked } from '../campus/registers.js';
import type { RoomDesignInput, PlannedDevice, Connection, RecordedResult, RoomLifecycle } from '@empathia/domain-types';
import PERSONAS from '@empathia/domain-data/data/V25_PERSONAS.json' with { type: 'json' };

export const C = defaultCatalog;
const P = PERSONAS as unknown as Record<string, { label: string; authority: string[] }>;
/** The demonstration perspectives map to the persona whose permissions they show (ADR-0006: a view, never authentication). */
export const PERSPECTIVE_PERSONA: Record<string, string> = { visitor: 'requestor', employee: 'requestor', exec: 'exec', service: 'service', svcmgr: 'svcmgr', syseng: 'syseng', designer: 'designer', installer: 'installer', cxeng: 'cxeng', ipm: 'ipm', bpm: 'bpm', ops: 'opslead', steward: 'steward', architect: 'architect', qa: 'qa_reviewer', sitechamp: 'sitechamp' };
export const personaOf = (perspective: string) => PERSPECTIVE_PERSONA[perspective] || 'requestor';
/** A Site Champion is an employee who is also their site's champion (the persona's base is `employee`): they hold what the requestor
 *  holds (asking and reporting) and the champion's own three authorities, and nothing more (founder, 11 Nov 2026). */
export const holds = (persona: string, authority: string) => persona === 'architect' || (P[persona]?.authority || []).includes(authority) || (persona === 'sitechamp' && (P['requestor']?.authority || []).includes(authority));
export const personaLabel = (persona: string) => P[persona]?.label || persona;

export interface Draft {
  code: string; name: string; unit: 'm' | 'ft'; createdBy: string; createdAt: string;
  design: RoomDesignInput;
  /** who saved the latest design change (separation of duties: that person does not approve it) */
  lastEditedBy: string;
  revisions: Array<{ n: number; by: string; at: string; hash: string; reason: string; devices?: Array<{ id: string; label: string; cat: string; x: number; y: number }> }>;
  approvedRevision: number | null;
  drawings: Record<string, { state: 'DRAFT' | 'GENERATED' | 'APPROVED' | 'REVIEW_REQUIRED'; input: string; by?: string }>;
  events: Array<{ at: string; by: string; type: string; detail: string; outcome: 'ALLOWED' | 'DENIED' }>;
  baseline: Baseline | null;
  /** every published version (superseded ones included): a baseline is never overwritten */
  baselines: Baseline[];
  seq: { pa: number; cn: number };
  /** redlines on the drawings (V2.5.3 v25RoomRedline, restored 12 Nov 2026): an open one holds that drawing's approval */
  redlines?: Redline[];
  /** commissioning deficiencies (V2.5.3 v25RoomCxIssue): one per failed test, resolved only by a verified retest */
  issues?: CxIssue[];
  /** files recorded against the room (V2.5.3 v25RoomImportRecord): what each can and cannot give; nothing is read from them here */
  imports?: ImportRecord[];
  /** the device register the installer fills after the installation (founder, 14 Nov 2026): commissioning does not start until it is complete */
  register?: Record<string, RegisterEntry>;
}
export interface RegisterEntry { serial?: string; hostname?: string; ip?: string; by: string; at: string }
export interface ImportRecord { id: string; name: string; kind: 'photo' | 'plan_image' | 'pdf' | 'cad' | 'other'; size: number; support: string; confidence: string; missing: string[]; by: string; at: string }
export interface CxIssue { id: string; key: string; test: string; label: string; severity: 'High' | 'Medium'; state: 'OPEN' | 'RESOLVED'; owner: string | null; seen: number; evidence: Array<{ at: string; finding: string }>; resolution?: string; hypotheses?: Hypothesis[] }
export interface Hypothesis { cause: string; basis: string; state: 'HYPOTHESIS' }
export interface Redline { id: string; drawing: string; text: string; by: string; at: string; revision: number; state: 'OPEN' | 'RESOLVED'; resolution?: string; resolvedBy?: string }
export interface Baseline { version: number; at: string; by: string; revision: number | null; results: Record<string, string>; devices: Array<{ id: string; cat: string; label: string }>; state: 'CURRENT' | 'SUPERSEDED' }
export type Refusal = { why: string[] };
export const refused = (why: string[]): Refusal => ({ why });

const KEY = 'empathia.demo.build-a-room.v1';
export function loadDraft(): Draft | null { try { const s = localStorage.getItem(KEY); if (!s) return null; const d = JSON.parse(s) as Draft; if (!d.baselines) d.baselines = d.baseline ? [{ ...d.baseline, devices: [], state: 'CURRENT' }] : []; return d; } catch { return null; } }
export function saveDraft(d: Draft | null): void { try { if (d) localStorage.setItem(KEY, JSON.stringify(d)); else localStorage.removeItem(KEY); } catch { /* storage unavailable: the draft lasts the page */ } }

const now = () => new Date().toISOString();
const hash = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };   // display hash of a drawing/revision input (the API uses SHA-256)
const log = (d: Draft, by: string, type: string, detail: string, outcome: 'ALLOWED' | 'DENIED' = 'ALLOWED') => { d.events.unshift({ at: now(), by, type, detail, outcome }); d.events = d.events.slice(0, 200); };

export interface CreateInput { name: string; template: string; unit: 'm' | 'ft'; length?: string; width?: string; ceiling?: string; occupancy?: string; intendedUse?: string; shape: 'rect' | 'lshape' }

/** Mirrors `rooms.createRoom` of the enterprise API: declared dimensions are parsed (feet and inches accepted), missing ones are MODELED from the template and say so; nothing is silently substituted for a typed value. */
export function createDraft(input: CreateInput, persona: string): Draft | Refusal {
  if (!holds(persona, 'room.design')) return refused([`${personaLabel(persona)} does not hold room.design: a designer or systems engineer creates a room`]);
  const T = C.templates[input.template]; if (!T) return refused([`unknown template ${input.template}`]);
  if (!input.name.trim()) return refused(['the room needs a name']);
  const prov: Record<string, string> = {};
  const val = (k: 'length' | 'width' | 'ceiling', i: 0 | 1 | 2) => { const v = input[k]; if (v != null && v.trim() !== '') { const m = parseLength(v, input.unit); if (!m) { prov[k] = 'UNREADABLE'; return null; } prov[k] = 'DECLARED'; return m; } prov[k] = 'MODELED'; return T.dims![i]; };
  const L = val('length', 0), W = val('width', 1), H = val('ceiling', 2);
  const bad = (['length', 'width', 'ceiling'] as const).filter((k) => prov[k] === 'UNREADABLE');
  if (bad.length) return refused([`${bad.join(', ')}: not readable — use metres, feet, or feet and inches like 24' 6" (nothing is substituted for a value you typed)`]);
  if (!(L! > 0.5 && W! > 0.5 && H! > 1.8 && L! < 200 && W! < 200 && H! < 30)) return refused([`dimensions out of range (length ${L} m, width ${W} m, ceiling ${H} m)`]);
  const points = outlineFor(input.shape, W!, L!);
  const seq = { pa: 0, cn: 0 }; const nextId = () => `PA-${String(++seq.pa).padStart(4, '0')}`;
  const devices = templateDevices(input.template, points, nextId, C);
  const design: RoomDesignInput = {
    template: input.template, intendedUse: (input.intendedUse || T.use || '').trim(), occupancy: Number(input.occupancy) || T.occ || 4, lifecycle: 'PLANNED', coreRoomId: 'R-DEMO-0001',
    geometry: { shape: input.shape, points, ceiling: H!, lengthM: L!, widthM: W!, provenance: prov as never, confidence: Object.values(prov).every((p) => p === 'DECLARED') ? 'declared' : 'modeled' },
    devices, connections: [], classification: { approved: null }, results: {},
  };
  design.connections = proposeConnections(design, () => `CN-${String(++seq.cn).padStart(4, '0')}`, undefined, C);
  const d: Draft = { code: 'R-DEMO-0001', name: input.name.trim(), unit: input.unit, createdBy: persona, createdAt: now(), design, lastEditedBy: persona, revisions: [], approvedRevision: null, drawings: {}, events: [], baseline: null, baselines: [], seq };
  log(d, persona, 'room.design_created', `${d.name} from template ${T.label}; ${devices.length} devices, ${design.connections.length} proposed connections; dimensions ${Object.entries(prov).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  refreshDrawings(d);
  return d;
}

export const analysis = (d: Draft): RoomAnalysis => analyzeRoom(d.design, C);

function refreshDrawings(d: Draft) {
  const cls = { approved: d.design.classification.approved as never, suggested: analysis(d).classification as never };
  for (const kind of Object.keys(DRAWING_KINDS)) {
    const input = hash(drawingInput({ ...d.design, classification: cls }, kind));
    const cur = d.drawings[kind];
    if (!cur) d.drawings[kind] = { state: 'GENERATED', input };
    else if (cur.input !== input) d.drawings[kind] = { state: cur.state === 'APPROVED' ? 'REVIEW_REQUIRED' : 'GENERATED', input, ...(cur.by ? { by: cur.by } : {}) };
  }
}
function touchDesign(d: Draft, persona: string) {
  d.lastEditedBy = persona;
  // a change after approval sends the design back for approval (as the API does: approved classification goes stale when the suggestion moves)
  const a = d.design.classification.approved; const s = analysis(d).classification;
  if (a && !a.override && a.archetype !== s.archetype) d.design.classification.approved = { ...a, stale: true };
  refreshDrawings(d);
}

export function addDevice(d: Draft, persona: string, cat: string, pos: { x: number; y: number }): Draft | Refusal {
  if (!holds(persona, 'room.design')) return refused([`${personaLabel(persona)} does not hold room.design`]);
  if (d.design.lifecycle !== 'PLANNED' && d.design.lifecycle !== 'COMMISSIONING') return refused([`devices are planned while the room is PLANNED, or changed during (re)commissioning (this one is ${d.design.lifecycle})`]);
  if (!C.categories[cat]) return refused([`unknown equipment category ${cat}`]);
  const id = `PA-${String(++d.seq.pa).padStart(4, '0')}`;
  const dev = newDevice(id, cat, d.design.devices.filter((x) => !x.removed), { x: pos.x, y: pos.y }, '', C);
  d.design.devices.push(dev);
  const added = proposeConnections(d.design, () => `CN-${String(++d.seq.cn).padStart(4, '0')}`, id, C);
  d.design.connections.push(...added);
  log(d, persona, 'room.device_added', `${dev.label} (${cat}) at ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)} m; ${added.length} connections proposed`);
  touchDesign(d, persona); return d;
}
export function removeDevice(d: Draft, persona: string, id: string): Draft | Refusal {
  if (!holds(persona, 'room.design')) return refused([`${personaLabel(persona)} does not hold room.design`]);
  if (d.design.lifecycle !== 'PLANNED' && d.design.lifecycle !== 'COMMISSIONING') return refused([`devices are planned while the room is PLANNED, or changed during (re)commissioning (this one is ${d.design.lifecycle})`]);
  const dev = d.design.devices.find((x) => x.id === id && !x.removed); if (!dev) return refused([`no device ${id}`]);
  dev.removed = true; for (const c of d.design.connections) if (!c.removed && (c.from === id || c.to === id)) c.removed = true;
  log(d, persona, 'room.device_removed', `${dev.label} (${dev.cat}) and its connections`);
  touchDesign(d, persona); return d;
}
const editable = (d: Draft, persona: string): string[] => !holds(persona, 'room.design') ? [`${personaLabel(persona)} does not hold room.design`] : d.design.lifecycle !== 'PLANNED' && d.design.lifecycle !== 'COMMISSIONING' ? [`devices are planned while the room is PLANNED, or changed during (re)commissioning (this one is ${d.design.lifecycle})`] : [];
const clampIn = (v: number, hi: number) => Math.round(Math.min(hi, Math.max(0, v)) * 100) / 100;
/** Move a device (V2.5.3 Build a Room's move, restored 12 Nov 2026): inside the room's outline box, logged; connections follow the device. */
export function moveDevice(d: Draft, persona: string, id: string, dx: number, dy: number): Draft | Refusal {
  const no = editable(d, persona); if (no.length) return refused(no);
  const dev = d.design.devices.find((x) => x.id === id && !x.removed); if (!dev) return refused([`no device ${id}`]);
  const x = clampIn(dev.x + dx, d.design.geometry.widthM), y = clampIn(dev.y + dy, d.design.geometry.lengthM);
  if (x === dev.x && y === dev.y) return refused([`${dev.label} is already at the edge of the room`]);
  log(d, persona, 'room.device_moved', `${dev.label} from ${dev.x.toFixed(2)}, ${dev.y.toFixed(2)} to ${x.toFixed(2)}, ${y.toFixed(2)} m`); dev.x = x; dev.y = y;
  touchDesign(d, persona); return d;
}
/** Duplicate a device: a new identity of the same class beside it, with its own proposed connections. */
export function duplicateDevice(d: Draft, persona: string, id: string): Draft | Refusal {
  const dev = d.design.devices.find((x) => x.id === id && !x.removed); if (!dev) return refused([`no device ${id}`]);
  const r = addDevice(d, persona, dev.cat, { x: clampIn(dev.x + 0.5, d.design.geometry.widthM), y: dev.y }); if ('why' in r) return r;
  r.events[0]!.detail += ` (a duplicate of ${dev.id})`; return r;
}
/** Swap a device for another class of the same group: the old identity is retired (never rewritten) and a new one takes its place. */
export function swapDevice(d: Draft, persona: string, id: string, cat: string): Draft | Refusal {
  const no = editable(d, persona); if (no.length) return refused(no);
  const dev = d.design.devices.find((x) => x.id === id && !x.removed); if (!dev) return refused([`no device ${id}`]);
  const K = C.categories[cat], K0 = C.categories[dev.cat]; if (!K || !K0) return refused([`unknown equipment category ${cat}`]);
  if (cat === dev.cat) return refused([`${dev.label} is already a ${K.label.toLowerCase()}`]);
  if (K.group !== K0.group) return refused([`a ${K0.label.toLowerCase()} swaps only within its group (${K0.group}); ${K.label.toLowerCase()} is ${K.group}`]);
  const at = { x: dev.x, y: dev.y }; const r = removeDevice(d, persona, id); if ('why' in r) return r;
  const r2 = addDevice(r, persona, cat, at); if ('why' in r2) return r2; const nid = r2.design.devices[r2.design.devices.length - 1]!.id; r2.events[0]!.detail += ` (swapped for ${dev.id}, ${dev.label}; now ${nid})`; return r2;
}
/** Remove one proposed connection, with a reason (editing a connection, V2.5.3): the proposal is retired, never deleted. */
export function removeConnection(d: Draft, persona: string, cid: string, reason: string): Draft | Refusal {
  const no = editable(d, persona); if (no.length) return refused(no);
  const c = d.design.connections.find((x) => x.id === cid && !x.removed); if (!c) return refused([`no connection ${cid}`]);
  if (!reason.trim()) return refused(['removing a proposed connection says why']);
  c.removed = true; log(d, persona, 'room.connection_removed', `${c.id} ${c.from} → ${c.to} (${c.kind}): ${reason.trim()}`); touchDesign(d, persona); return d;
}
/** Compare two saved revisions by device identity (revisions saved before 12 Nov carry no snapshot and cannot be compared). */
export function compareRevisions(d: Draft, a: number, b: number): { added: string[]; removed: string[]; moved: string[] } | Refusal {
  const A = d.revisions.find((r) => r.n === a), B = d.revisions.find((r) => r.n === b);
  if (!A?.devices || !B?.devices) return refused(['one of these revisions was saved without a device snapshot']);
  const ma = new Map(A.devices.map((x) => [x.id, x])), mb = new Map(B.devices.map((x) => [x.id, x]));
  return { added: B.devices.filter((x) => !ma.has(x.id)).map((x) => `${x.id} ${x.label}`), removed: A.devices.filter((x) => !mb.has(x.id)).map((x) => `${x.id} ${x.label}`),
    moved: B.devices.filter((x) => { const o = ma.get(x.id); return o && (Math.abs(o.x - x.x) > 0.005 || Math.abs(o.y - x.y) > 0.005); }).map((x) => `${x.id} ${x.label}`) };
}
export function saveRevision(d: Draft, persona: string, reason: string): Draft | Refusal {
  if (!holds(persona, 'room.design')) return refused([`${personaLabel(persona)} does not hold room.design`]);
  const h = hash(JSON.stringify([d.design.geometry, d.design.devices.filter((x) => !x.removed), d.design.connections.filter((c) => !c.removed)]));
  const last = d.revisions[d.revisions.length - 1];
  if (last && last.hash === h) return refused(['nothing changed since the last revision']);
  d.revisions.push({ n: d.revisions.length + 1, by: persona, at: now(), hash: h, reason: reason.trim() || 'design change', devices: d.design.devices.filter((x) => !x.removed).map((x) => ({ id: x.id, label: x.label, cat: x.cat, x: x.x, y: x.y })) });
  d.lastEditedBy = persona;
  log(d, persona, 'room.design_revision_saved', `revision ${d.revisions.length} (${h})`); return d;
}
export function approveClassification(d: Draft, persona: string, override?: { archetype: string; reason: string }): Draft | Refusal {
  if (!holds(persona, 'room.classify.approve')) return refused([`${personaLabel(persona)} does not hold room.classify.approve: a systems engineer approves the classification`]);
  const author = d.revisions.length ? d.revisions[d.revisions.length - 1]!.by : d.lastEditedBy;
  if (author === persona) { log(d, persona, 'room.classify.approve', `refused: ${personaLabel(persona)} authored the latest design change (separation of duties, ADR-0005)`, 'DENIED'); return refused([`${personaLabel(persona)} saved the latest design change and does not approve it: separation of duties — switch to another perspective, or have a designer save the revision`]); }
  const s = analysis(d).classification;
  if (override) { if (!C.archetypes[override.archetype]) return refused([`unknown archetype ${override.archetype}`]); if ((override.reason || '').trim().length < 10) return refused(['an override needs a reason of at least 10 characters']); }
  d.design.classification.approved = { archetype: override ? override.archetype : s.archetype, override: !!override, reason: override ? override.reason : 'suggestion accepted', by: persona };
  log(d, persona, 'room.classification_approved', `${d.design.classification.approved.archetype}${override ? ' (override: ' + override.reason + ')' : ' (suggestion accepted)'}`);
  refreshDrawings(d); return d;
}
/** Segments cross (proper intersection), for the outline check. */
function cross(a: [number, number], b: [number, number], c: [number, number], d: [number, number]): boolean {
  const o = (p: [number, number], q: [number, number], r: [number, number]) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}
/** Check an outline (V2.5.3 v25RoomPolyCheck): 3 to 24 corners, no edge crossing another, an area of at least 2 m²; moved to start at 0, 0. */
export function checkOutline(points: Array<[number, number]>): { points: Array<[number, number]>; shift: [number, number]; area: number; w: number; l: number } | { why: string } {
  if (points.length < 3 || points.length > 24) return { why: `an outline has 3 to 24 corners (this one has ${points.length})` };
  if (points.some((p) => !p.every((v) => Number.isFinite(v) && Math.abs(v) < 200))) return { why: 'every corner is two numbers in metres, within 200 m' };
  const n = points.length; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { if (j === i + 1 || (i === 0 && j === n - 1)) continue; if (cross(points[i]!, points[(i + 1) % n]!, points[j]!, points[(j + 1) % n]!)) return { why: `edges ${i + 1} and ${j + 1} cross: an outline goes round the room once` }; }
  const minX = Math.min(...points.map((p) => p[0])), minY = Math.min(...points.map((p) => p[1]));
  const pts = points.map(([x, y]) => [Math.round((x - minX) * 100) / 100, Math.round((y - minY) * 100) / 100] as [number, number]); const a = polyArea({ points: pts });
  if (a < 2) return { why: `the outline encloses ${a} m²; a room needs at least 2 m²` };
  return { points: pts, shift: [minX, minY], area: a, w: Math.max(...pts.map((p) => p[0])), l: Math.max(...pts.map((p) => p[1])) };
}
/** Parse "x,y; x,y; …" (metres or feet by the room's unit). */
export function parseOutline(text: string, unit: 'm' | 'ft'): Array<[number, number]> | null {
  const k = unit === 'ft' ? 0.3048 : 1; const parts = text.split(/[;\n]+/).map((x) => x.trim()).filter(Boolean);
  const pts = parts.map((p) => p.split(/[,\s]+/).filter(Boolean).map(Number)); if (!pts.length || pts.some((p) => p.length !== 2 || p.some((v) => !Number.isFinite(v)))) return null;
  return pts.map(([x, y]) => [Math.round(x! * k * 100) / 100, Math.round(y! * k * 100) / 100]);
}
/** Draw the room's outline (V2.5.3 v25RoomOutline): devices move with the outline's origin; length and width become DECLARED. */
export function setOutline(d: Draft, persona: string, text: string): Draft | Refusal {
  const no = editable(d, persona); if (no.length) return refused(no);
  const pts = parseOutline(text, d.unit); if (!pts) return refused(['outline not readable: write corners as x,y separated by semicolons, for example 0,0; 6,0; 6,4; 0,4']);
  const o = checkOutline(pts); if ('why' in o) return refused([`outline refused: ${o.why}`]);
  for (const x of d.design.devices) { x.x = Math.round((x.x - o.shift[0]) * 100) / 100; x.y = Math.round((x.y - o.shift[1]) * 100) / 100; }
  const prov = { ...(d.design.geometry.provenance as Record<string, string>), length: 'DECLARED', width: 'DECLARED', outline: 'DECLARED' };
  d.design.geometry = { ...d.design.geometry, shape: 'custom', points: o.points, lengthM: o.l, widthM: o.w, provenance: prov as never, confidence: Object.values(prov).every((p) => p === 'DECLARED') ? 'declared' : 'modeled' };
  log(d, persona, 'room.geometry_updated', `outline drawn: ${o.points.length} corners, ${o.area} m², ${o.w} × ${o.l} m`); touchDesign(d, persona); return d;
}
/** Confirm the scale (V2.5.3): one edge measured on site; the outline and the devices are scaled so that edge has that length. */
export function confirmScale(d: Draft, persona: string, edge: number, measured: string): Draft | Refusal {
  const no = editable(d, persona); if (no.length) return refused(no);
  const P = d.design.geometry.points; const a = P[edge - 1], b = P[edge % P.length]; if (!a || !b) return refused([`the outline has ${P.length} edges; edge ${edge} does not exist`]);
  const m = parseLength(measured, d.unit); if (!m) return refused(['the measured length is not readable']);
  const was = Math.hypot(b[0] - a[0], b[1] - a[1]); const k = m / was; if (!(k > 0.25 && k < 4)) return refused([`a factor of ${k.toFixed(2)} is not a scale correction: check the edge and the measurement`]);
  const sc = (v: number) => Math.round(v * k * 100) / 100;
  d.design.geometry = { ...d.design.geometry, points: P.map(([x, y]) => [sc(x), sc(y)] as [number, number]), lengthM: sc(d.design.geometry.lengthM), widthM: sc(d.design.geometry.widthM), provenance: { ...(d.design.geometry.provenance as Record<string, string>), scale: 'DECLARED' } as never };
  for (const x of d.design.devices) { x.x = sc(x.x); x.y = sc(x.y); }
  log(d, persona, 'room.scale_confirmed', `edge ${edge} measured ${m} m (was ${was.toFixed(2)} m): scaled by ${k.toFixed(3)}`); touchDesign(d, persona); return d;
}
/** A redline on a drawing: text (at most 400 characters), the revision it was made against, its author. An approved drawing that is
 *  redlined goes back to REVIEW_REQUIRED. */
export function addRedline(d: Draft, persona: string, kind: string, text: string): Draft | Refusal {
  if (!holds(persona, 'room.design') && !holds(persona, 'design.release')) return refused([`${personaLabel(persona)} does not hold room.design`]);
  const dr = d.drawings[kind]; if (!dr) return refused([`no drawing ${kind}`]); if (!text.trim()) return refused(['a redline needs text']);
  const list = d.redlines || (d.redlines = []); const r: Redline = { id: `RL-${list.length + 1}`, drawing: kind, text: text.trim().slice(0, 400), by: persona, at: now(), revision: d.revisions.length, state: 'OPEN' };
  list.push(r); if (dr.state === 'APPROVED') d.drawings[kind] = { ...dr, state: 'REVIEW_REQUIRED' };
  log(d, persona, 'room.redline_added', `${r.id} on ${DRAWING_KINDS[kind]} (rev ${r.revision}): ${r.text}`); return d;
}
/** Resolve a redline with what was done about it. */
export function resolveRedline(d: Draft, persona: string, id: string, resolution: string): Draft | Refusal {
  if (!holds(persona, 'room.design') && !holds(persona, 'design.release')) return refused([`${personaLabel(persona)} does not hold room.design`]);
  const r = (d.redlines || []).find((x) => x.id === id); if (!r) return refused([`no redline ${id}`]); if (r.state !== 'OPEN') return refused([`${id} is already resolved`]);
  if (!resolution.trim()) return refused(['resolving a redline says what was done']);
  r.state = 'RESOLVED'; r.resolution = resolution.trim().slice(0, 400); r.resolvedBy = persona;
  log(d, persona, 'room.redline_resolved', `${id}: ${r.resolution}`); return d;
}
export function approveDrawing(d: Draft, persona: string, kind: string): Draft | Refusal {
  if (!holds(persona, 'design.release') && !holds(persona, 'room.design.approve')) return refused([`${personaLabel(persona)} does not hold design.release`]);
  const dr = d.drawings[kind]; if (!dr) return refused([`no drawing ${kind}`]);
  if (!d.design.classification.approved || d.design.classification.approved.stale) return refused(['drawings are approved after the classification is approved (and still current)']);
  const open = (d.redlines || []).filter((r) => r.drawing === kind && r.state === 'OPEN'); if (open.length) return refused([`${open.length} open redline${open.length === 1 ? '' : 's'} on ${DRAWING_KINDS[kind]}: resolve ${open.length === 1 ? 'it' : 'them'} first (${open.map((r) => r.id).join(', ')})`]);
  d.drawings[kind] = { ...dr, state: 'APPROVED', by: persona };
  log(d, persona, 'room.drawing_approved', `${DRAWING_KINDS[kind]} (input ${dr.input})`); return d;
}

export function transition(d: Draft, persona: string, to: RoomLifecycle): Draft | Refusal {
  const need = LIFECYCLE_AUTHORITY[to];
  if (!holds(persona, need)) { log(d, persona, `room.lifecycle:${to}`, `refused: needs ${need}`, 'DENIED'); return refused([`${personaLabel(persona)} may not move a room to ${to} (needs ${need})`]); }
  const a = analysis(d);
  const why = lifecycleBlockers({ from: d.design.lifecycle, to, classificationApproved: !!d.design.classification.approved && !d.design.classification.approved.stale, openIssues: a.checks, savedRevisions: d.revisions.length, rows: a.applicability.rows, results: d.design.results, hasBaseline: !!d.baseline, hasLiveMonitoringEvidence: false });
  // the device register gates the start of commissioning (founder, 14 Nov 2026); a recommissioning after acceptance is not gated by it
  if (to === 'COMMISSIONING' && d.design.lifecycle === 'INSTALLED_UNVERIFIED') { const rows = registerRows(d); const open = rows.filter((x) => x.missing.length); if (open.length) why.push(registerBlocker(open.map((x) => ({ position: x.id, asset: null, missing: x.missing })), rows.length)); }
  if (why.length) { log(d, persona, `room.lifecycle:${to}`, `refused: ${why.join('; ')}`, 'DENIED'); return refused(why); }
  // separation of duties (ADR-0005): the design is not approved by its author; a room is not accepted by whoever recorded or verified its results
  if (to === 'DESIGN_APPROVED') { const author = d.revisions[d.revisions.length - 1]!.by; if (author === persona) { log(d, persona, `room.lifecycle:${to}`, 'refused: the author of the design does not approve it (separation of duties)', 'DENIED'); return refused([`${personaLabel(persona)} saved the design revision and does not approve it (separation of duties)`]); } }
  if (to === 'ACCEPTED') { const authors = new Set(Object.values(d.design.results || {}).flatMap((r) => [r.by, r.verified?.by]).filter(Boolean)); if (authors.has(persona)) { log(d, persona, `room.lifecycle:${to}`, 'refused: a recorder or verifier of the results does not accept them (separation of duties)', 'DENIED'); return refused([`${personaLabel(persona)} recorded or verified results of this room and does not accept it (separation of duties)`]); } }
  const from = d.design.lifecycle; d.design.lifecycle = to;
  if (to === 'DESIGN_APPROVED') d.approvedRevision = d.revisions.length;
  if (to === 'PLANNED') d.approvedRevision = null;
  if (to === 'ACCEPTED') {
    const labels = Object.fromEntries(a.applicability.rows.filter((r) => r.applicable).map((r) => [r.id, resultLabel(d.design.results?.[r.id])]));
    d.baselines = d.baselines || [];
    for (const b of d.baselines) if (b.state === 'CURRENT') b.state = 'SUPERSEDED';
    const next: Baseline = { version: d.baselines.length + 1, at: now(), by: persona, revision: d.approvedRevision, results: labels, devices: live(d.design.devices).filter((x) => !(x as PlannedDevice).furniture).map((x) => ({ id: x.id, cat: (x as PlannedDevice).cat, label: (x as PlannedDevice).label })), state: 'CURRENT' };
    d.baselines.push(next); d.baseline = next;
  }
  log(d, persona, 'room.lifecycle_changed', `${from} → ${to}${to === 'ACCEPTED' ? ` · baseline v${d.baseline!.version} published` : ''}`); return d;
}

export function record(d: Draft, persona: string, testId: string, input: { state: string; kind: string; ref: string; instrument?: string }): Draft | Refusal {
  const row = analysis(d).applicability.rows.find((r) => r.id === testId);
  const why = recordBlockers(d.design.lifecycle, row, persona, { state: input.state, evidence: { kind: input.kind, ref: input.ref, instrument: input.instrument || null } });
  if (why.length) { log(d, persona, 'test.recorded', `${testId} refused: ${why.join('; ')}`, 'DENIED'); return refused(why); }
  d.design.results = d.design.results || {};
  d.design.results[testId] = buildResult(d.design.results[testId], persona, { state: input.state, evidence: { kind: input.kind, ref: input.ref, instrument: input.instrument || null } }, now());
  log(d, persona, 'test.recorded', `${testId} ${input.state} → ${resultLabel(d.design.results[testId])} (${input.kind}: ${input.ref})`);
  if (input.state === 'FAIL' && row) {
    const list = d.issues || (d.issues = []); const key = `test-failed:${testId}`; const i = list.find((x) => x.key === key);
    const ev = { at: now(), finding: `FAIL recorded by ${personaLabel(persona)} (${input.kind} ${input.ref})` };
    if (i) { i.state = 'OPEN'; i.seen += 1; i.evidence.push(ev); delete i.resolution; log(d, persona, 'room.issue_updated', `${i.id}: the test failed again`); }
    else { const n: CxIssue = { id: `CXI-${list.length + 1}`, key, test: testId, label: `${row.label} failed`, severity: row.tier === 1 ? 'High' : 'Medium', state: 'OPEN', owner: null, seen: 1, evidence: [ev] }; list.push(n); log(d, persona, 'room.issue_created', `${n.id}: ${n.label} (${n.severity}); in the commissioning deficiency queue, unassigned`); }
  }
  return d;
}
/** Assign a commissioning deficiency (V2.5.3 v25RoomAssignIssue): only a role that assigns issues, only to a persona of this demonstration. */
export function assignIssue(d: Draft, persona: string, id: string, owner: string): Draft | Refusal {
  if (!holds(persona, 'issue.assign') && !holds(persona, 'route.internal')) return refused([`${personaLabel(persona)} cannot assign room issues (Service Manager, Operations Lead)`]);
  const i = (d.issues || []).find((x) => x.id === id); if (!i) return refused([`no issue ${id}`]); if (i.state !== 'OPEN') return refused([`${id} is resolved`]);
  if (!P[owner]) return refused(['assign to a persona of this demonstration']);
  i.owner = owner; log(d, persona, 'room.issue_assigned', `${id} to ${personaLabel(owner)}`); return d;
}
export function verify(d: Draft, persona: string, testId: string): Draft | Refusal {
  if (!holds(persona, 'test.verify') && !holds(persona, 'tests.verify.all') && !holds(persona, 'customer.accept')) return refused([`${personaLabel(persona)} does not hold a verification authority`]);
  const r = d.design.results?.[testId]; const why = verifyBlockers(r, persona);
  if (why.length) { log(d, persona, 'test.verified', `${testId} refused: ${why.join('; ')}`, 'DENIED'); return refused(why); }
  r!.verified = { by: persona, at: now() };
  log(d, persona, 'test.verified', `${testId} PASS_VERIFIED by ${personaLabel(persona)}`);
  // a verified retest resolves the deficiency its failure opened (V2.5.3 v25RoomCxRetest)
  const i = (d.issues || []).find((x) => x.key === `test-failed:${testId}` && x.state === 'OPEN');
  if (i && r!.state === 'PASS') { i.state = 'RESOLVED'; i.resolution = `retest ${testId} PASS by ${personaLabel(r!.by)}, verified by ${personaLabel(persona)} (evidence ${r!.evidence.kind} ${r!.evidence.ref})`; log(d, persona, 'room.issue_resolved', `${i.id}: ${i.resolution}`); }
  return d;
}
export const results = (d: Draft) => d.design.results || ({} as Record<string, RecordedResult>);
export const live = (xs: Array<PlannedDevice | Connection>) => xs.filter((x) => !x.removed);

/** The commissioning workbook (V2.5.3 v25RoomWorkbook/v25RoomWorkbookSheets, restored 12 Nov 2026): Dashboard (its counts are
 *  formulas over the Testing sheet), Project, Equipment, Testing (a list of result values), Design checks, Redlines, About. Results
 *  typed into the file are not read back: a result counts only when it is recorded here with evidence and verified by someone else. */
export function workbookSheets(d: Draft): import('./xlsx.js').Sheet[] {
  const a = analysis(d); const res = results(d); const devs = live(d.design.devices) as PlannedDevice[];
  const testing = a.applicability.rows.map((r) => { const R = res[r.id]; const lbl = r.applicable ? resultLabel(R) : 'N/A';
    return [r.id, r.label, String(r.phase), r.domain || '', r.applicable ? 'YES' : 'NO', r.applicable ? r.why.join('; ') : (r as { justification?: string }).justification || '', ((r as { evidence?: string[] }).evidence || []).join('/'), lbl, R && r.applicable ? `${R.evidence.kind} ${R.evidence.ref}` : '', R && r.applicable ? R.by : '', R && r.applicable && R.verified ? R.verified.by : ''] as Array<string>; });
  const n = testing.length + 1; const cnt = (c: number, v: string) => testing.filter((t) => t[c] === v).length;
  return [
    { name: 'Dashboard', header: ['field', 'value'], rows: [['room', d.name], ['canonical room id', d.code], ['revision', d.revisions.length], ['lifecycle', d.design.lifecycle], ['applicable (counted from the Testing sheet)', { f: `COUNTIF(Testing!E2:E${n},"YES")`, v: cnt(4, 'YES') }],
      ['not yet tested (counted from the Testing sheet)', { f: `COUNTIF(Testing!H2:H${n},"NOT_TESTED")`, v: cnt(7, 'NOT_TESTED') }], ['passed and independently verified (counted)', { f: `COUNTIF(Testing!H2:H${n},"PASS_VERIFIED")`, v: cnt(7, 'PASS_VERIFIED') }],
      ['results entered in this file', 'are not read back into the demonstrator: a result counts only when recorded there with evidence and independently verified']] },
    { name: 'Project', header: ['field', 'value'], rows: [['template', C.templates[d.design.template]?.label || d.design.template], ['room type (approved)', d.design.classification.approved?.archetype || 'not approved'], ['room type (suggested)', a.classification.archetypeName], ['intended use', d.design.intendedUse], ['occupancy', d.design.occupancy], ['dimensions (m)', `${d.design.geometry.lengthM} × ${d.design.geometry.widthM} × ${d.design.geometry.ceiling}`], ['dimension provenance', Object.entries(d.design.geometry.provenance as Record<string, string>).map(([k, v]) => `${k} ${v}`).join(', ')]] },
    { name: 'Equipment', header: ['asset_id', 'role', 'category', 'mount', 'x_m', 'y_m', 'provenance'], rows: devs.filter((x) => !x.furniture).map((x) => [x.id, x.label, C.categories[x.cat]?.label || x.cat, x.mount, x.x, x.y, 'DECLARED (design) · class template, no make or model']) },
    { name: 'Testing', header: ['test_id', 'label', 'phase', 'domain', 'applicable', 'why', 'evidence_accepted', 'result', 'evidence_ref', 'recorded_by', 'verified_by'], rows: testing, validations: [{ col: 7, list: ['NOT_TESTED', 'PASS_UNVERIFIED', 'FAIL', 'NOT_SUPPORTED', 'INCONCLUSIVE', 'N/A'] }] },
    { name: 'Design checks', header: ['key', 'severity', 'title', 'rationale', 'assets'], rows: a.checks.map((c) => [c.key, c.severity, c.title, c.rationale, c.assets.join(' ')]) },
    { name: 'Redlines', header: ['id', 'drawing', 'revision', 'state', 'text', 'by', 'resolution'], rows: (d.redlines || []).map((r) => [r.id, DRAWING_KINDS[r.drawing] || r.drawing, r.revision, r.state, r.text, r.by, r.resolution || '']) },
    { name: 'About', header: ['field', 'value'], rows: [['generated', now()], ['from', 'Empathia demonstrator, Build a Room (synthetic data)'], ['note', 'Nothing in this workbook is a measurement. Results come only from the record.']] },
  ];
}

const IMPORT_SUPPORT: Record<ImportRecord['kind'], string> = {
  photo: 'conceptual layout only: no dimensions are taken from a photograph',
  plan_image: 'a scaled plan: its dimensions count only after the outline is drawn and the scale confirmed here',
  pdf: 'stored as a reference: PDF pages are not rendered or measured here',
  cad: 'NOT SUPPORTED here: DWG, RVT or IFC need engineering tools; record the file and enter the geometry',
  other: 'NOT SUPPORTED',
};
export const importKind = (name: string): ImportRecord['kind'] => { const e = (/\.([a-z0-9]+)$/i.exec(name)?.[1] || '').toLowerCase(); return ['jpg', 'jpeg', 'heic', 'webp'].includes(e) ? 'photo' : ['png', 'svg', 'tif', 'tiff'].includes(e) ? 'plan_image' : e === 'pdf' ? 'pdf' : ['dwg', 'dxf', 'rvt', 'ifc'].includes(e) ? 'cad' : 'other'; };
/** Record a file against the room: its name, size and kind only (its content is not read), what it can support and what is still missing. */
export function importRecord(d: Draft, persona: string, file: { name: string; size: number }): Draft | Refusal {
  if (!holds(persona, 'room.design')) return refused([`${personaLabel(persona)} does not hold room.design`]);
  if (!file.name.trim()) return refused(['a file needs a name']); if (file.size > 50 * 1024 * 1024) return refused(['files over 50 MB are not recorded here']);
  const kind = importKind(file.name); const g = d.design.geometry.provenance as Record<string, string>; const missing: string[] = [];
  if (!(kind === 'plan_image' && g.scale === 'DECLARED')) missing.push('confirmed dimensions (draw the outline and confirm its scale)'); if (g.ceiling !== 'DECLARED') missing.push('ceiling height'); if (kind === 'photo') missing.push('a scaled plan or a survey');
  const list = d.imports || (d.imports = []); const r: ImportRecord = { id: `IMP-${list.length + 1}`, name: file.name.slice(0, 120), kind, size: file.size, support: IMPORT_SUPPORT[kind], confidence: kind === 'plan_image' && g.scale === 'DECLARED' ? 'scale confirmed' : kind === 'plan_image' ? 'scale not confirmed' : 'low', missing, by: persona, at: now() };
  list.push(r); log(d, persona, 'room.record_imported', `${r.id} ${r.name} (${kind}, ${Math.round(file.size / 1024)} KB): ${r.support}`); return d;
}

/** The APEX hand-off for a deficiency (V2.5.3 v25RoomApex): design-side hypotheses from the records — a design check on the same
 *  devices, a device swapped after review, a device still a class template — each recorded as a HYPOTHESIS, never as a verified fault. */
export function apex(d: Draft, persona: string, issueId: string): Draft | Refusal {
  if (!['test.verify', 'tests.verify.all', 'rfi.resolve', 'design.release'].some((a) => holds(persona, a))) return refused([`${personaLabel(persona)} cannot run APEX analysis`]);
  const i = (d.issues || []).find((x) => x.id === issueId); if (!i) return refused([`no issue ${issueId}`]);
  const row = analysis(d).applicability.rows.find((r) => r.id === i.test) as { devices?: string[] } | undefined; const assets = new Set(row?.devices || []);
  const hyps: Hypothesis[] = [];
  for (const c of analysis(d).checks) { const shared = c.assets.filter((a) => assets.has(a)); if (shared.length) hyps.push({ cause: `design check ${c.key}: ${c.title}`, basis: `shares ${shared.join(', ')} with this deficiency`, state: 'HYPOTHESIS' }); }
  for (const e of d.events) { const m = /\(swapped for (PA-\d+), ([^;]+); now (PA-\d+)\)/.exec(e.detail); if (m && e.type === 'room.device_added' && assets.has(m[3]!)) hyps.push({ cause: `${m[2]} (${m[1]}) was swapped after the design was reviewed`, basis: e.detail, state: 'HYPOTHESIS' }); }
  const tpl = [...assets].map((a) => d.design.devices.find((x) => x.id === a && !x.removed)).filter(Boolean) as PlannedDevice[];
  if (tpl.length) hyps.push({ cause: `${tpl.map((x) => x.label).join(', ')} ${tpl.length === 1 ? 'is' : 'are'} still a class template`, basis: 'the installed model was never recorded in the design', state: 'HYPOTHESIS' });
  if (!hyps.length) hyps.push({ cause: 'no design-side cause found in the records', basis: 'only physical inspection can tell', state: 'HYPOTHESIS' });
  i.hypotheses = hyps; log(d, persona, 'room.hypothesis_recorded', `${i.id}: ${hyps.length} APEX hypotheses recorded (not verified faults)`); return d;
}

// ------------------------------------------------------------------------------------------------ the device register (founder, 14 Nov 2026)
/** Each live device of the room with what its register row still needs: the serial for every unit; the hostname and IP address for a networked one. */
export function registerRows(d: Draft) {
  return (live(d.design.devices) as PlannedDevice[]).filter((x) => !x.furniture).map((x) => {
    const e = d.register?.[x.id] || null; const net = isNetworked(x.cat);
    return { id: x.id, label: x.label, cat: x.cat, networked: net, entry: e, missing: missingOf(net, e as never) };
  });
}
export const REGISTER_AUTHORITIES = ['work.evidence', 'field.scan'];
/** The installer records what was read on site for one device. Refused with its reasons: authority, stage, form, a serial already final, a value used by another device. */
export function registerDevice(d: Draft, persona: string, id: string, patch: { serial?: string; hostname?: string; ip?: string }): Draft | Refusal {
  const deny = (why: string[]) => { log(d, persona, 'room.register', `refused: ${why.join('; ')}`, 'DENIED'); return refused(why); };
  if (!REGISTER_AUTHORITIES.some((a) => holds(persona, a))) return deny([`${personaLabel(persona)} does not record the device register (needs ${REGISTER_AUTHORITIES.join(' or ')}): the installation team does`]);
  if (['PLANNED', 'DESIGN_APPROVED', 'INSTALLATION_PENDING'].includes(d.design.lifecycle)) return deny([`nothing is installed yet (${d.design.lifecycle}): the register records units read on site after the installation`]);
  const row = registerRows(d).find((x) => x.id === id); if (!row) return deny([`${id} is not a live device of this room`]);
  const clean: Record<string, string> = {}; for (const [k, v] of Object.entries(patch)) if (v !== undefined) clean[k] = String(v).trim();
  const why = validateEntry(clean, row.networked); if (why.length) return deny(why);
  const prev = d.register?.[id];
  if (prev?.serial && clean.serial && clean.serial !== prev.serial) return deny([`${id} already carries serial ${prev.serial}: a recorded serial is final (a different serial is a different unit)`]);
  for (const [other, e] of Object.entries(d.register || {})) {
    if (other === id) continue;
    if (clean.hostname && e.hostname?.toLowerCase() === clean.hostname.toLowerCase()) return deny([`hostname ${clean.hostname} is already ${other}'s`]);
    if (clean.ip && e.ip === clean.ip) return deny([`IP address ${clean.ip} is already ${other}'s`]);
  }
  d.register = d.register || {};
  d.register[id] = { ...(prev || {}), ...Object.fromEntries(Object.entries(clean).filter(([, v]) => v)), by: persona, at: now() } as RegisterEntry;
  log(d, persona, 'room.register', `${id} (${row.label}): ${Object.entries(clean).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  return d;
}
/** Demonstration convenience: register every device still open with synthetic values, each labelled SYN, by the same rules. */
export function registerAllSynthetic(d: Draft, persona: string): Draft | Refusal {
  const rows = registerRows(d).filter((x) => x.missing.length); let n = Object.keys(d.register || {}).length;
  for (const x of rows) {
    n += 1;
    const r = registerDevice(d, persona, x.id, { serial: x.entry?.serial ? undefined : `SYN-${d.code}-${x.id}`.slice(0, 40), ...(x.networked ? { hostname: x.entry?.hostname ? undefined : `syn-${d.code}-${x.id}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 63), ip: x.entry?.ip ? undefined : `10.90.${Math.floor(n / 250)}.${(n % 250) + 2}` } : {}) });
    if ('why' in r) return r;
  }
  return d;
}
