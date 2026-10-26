/**
 * Design construction rules: outline validation, template instantiation, the proposed-connection rules, and the canonical inputs a
 * drawing is generated from. Ported from `v25RoomPolyCheck`, `v25RoomCreate` (template part), `v25RoomAddInternal`,
 * `v25RoomAutoConnect` and `v25RoomDrawingInput` (src/v25-60-room.js). Pure: ids come from the caller.
 */
import type { Connection, PlannedDevice, RoomDesignInput } from '@empathia/domain-types';
import { type Catalog, defaultCatalog } from './catalog.js';
import { box, shapes } from './geometry.js';

const r3 = (v: number) => Math.round(v * 1000) / 1000;
const r2 = (v: number) => Math.round(v * 100) / 100;

export interface OutlineOk { points: Array<[number, number]>; w: number; l: number; area: number; shift: [number, number] }

/** A drawn outline: 3–40 distinct corners in metres, no crossing or touching edges, ≥ 2 m², extent 0.5–200 m; shifted to 0,0. */
export function polygonCheck(points: unknown): OutlineOk | { why: string } {
  if (!Array.isArray(points)) return { why: 'an outline is a list of corners' };
  let p = points.map((q) => [Number(q && q[0]), Number(q && q[1])] as [number, number]);
  if (p.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) return { why: 'every corner needs two numbers in metres' };
  p = p.filter((q, i) => { const n = p[(i + 1) % p.length]!; return i === p.length - 1 ? Math.hypot(q[0] - p[0]![0], q[1] - p[0]![1]) > 0.01 : Math.hypot(q[0] - n[0], q[1] - n[1]) > 0.01; });
  if (p.length < 3 || p.length > 40) return { why: `an outline needs 3 to 40 distinct corners (${p.length} given)` };
  const mx = Math.min(...p.map((q) => q[0])); const my = Math.min(...p.map((q) => q[1]));
  const pts = p.map(([x, y]) => [r3(x - mx), r3(y - my)] as [number, number]);
  const w = Math.max(...pts.map((q) => q[0])); const l = Math.max(...pts.map((q) => q[1]));
  if (w < 0.5 || l < 0.5 || w > 200 || l > 200) return { why: `the outline is ${w} m by ${l} m: each side of its extent must be between 0.5 m and 200 m` };
  const orient = (a: number[], b: number[], c: number[]) => Math.sign((b[0]! - a[0]!) * (c[1]! - a[1]!) - (b[1]! - a[1]!) * (c[0]! - a[0]!));
  const onSeg = (a: number[], b: number[], c: number[]) => Math.min(a[0]!, b[0]!) - 1e-9 <= c[0]! && c[0]! <= Math.max(a[0]!, b[0]!) + 1e-9 && Math.min(a[1]!, b[1]!) - 1e-9 <= c[1]! && c[1]! <= Math.max(a[1]!, b[1]!) + 1e-9;
  const cross = (a: number[], b: number[], c: number[], e: number[]) => {
    const o1 = orient(a, b, c), o2 = orient(a, b, e), o3 = orient(c, e, a), o4 = orient(c, e, b);
    if (o1 !== o2 && o3 !== o4) return true;
    return (o1 === 0 && onSeg(a, b, c)) || (o2 === 0 && onSeg(a, b, e)) || (o3 === 0 && onSeg(c, e, a)) || (o4 === 0 && onSeg(c, e, b));
  };
  const n = pts.length;
  for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) {
    if (j === i + 1 || (i === 0 && j === n - 1)) continue;
    if (cross(pts[i]!, pts[(i + 1) % n]!, pts[j]!, pts[(j + 1) % n]!)) return { why: `edges ${i + 1} and ${j + 1} cross or touch: an outline must not cross itself` };
  }
  let a = 0;
  for (let i = 0; i < n; i += 1) { const [x1, y1] = pts[i]!; const [x2, y2] = pts[(i + 1) % n]!; a += x1 * y2 - x2 * y1; }
  a = Math.abs(a / 2);
  if (a < 2) return { why: `the outline encloses ${a.toFixed(2)} m²: at least 2 m² is needed` };
  return { points: pts, w, l, area: r2(a), shift: [mx, my] };
}

/** A new planned device of a category, positioned and labelled as the demonstrator does (`<Label> <n>`). */
export function newDevice(id: string, cat: string, existing: PlannedDevice[], pos: { x?: number; y?: number; z?: number; rot?: number; mount?: string }, note = '', C: Catalog = defaultCatalog): PlannedDevice {
  const K = C.categories[cat];
  if (!K) throw new Error(`unknown equipment category ${cat}`);
  const role = `${K.label} ${existing.filter((x) => x.cat === cat && !x.removed).length + 1}`;
  return {
    id, cat, label: role, role, model: 'generic', generic: true, brand: null, modelName: null,
    x: r2(pos.x || 0), y: r2(pos.y || 0), z: pos.z != null ? pos.z : K.z ?? 0, rot: Number(pos.rot) || 0, mount: pos.mount || K.mount,
    props: { ...(K.props || {}) }, furniture: !!K.furniture, lifecycle: 'PLANNED', modelHistory: [], provenance: 'DECLARED',
    ...(note ? { note } : {}),
  } as PlannedDevice;
}

/** The template's devices at the template's relative positions, scaled to the outline's bounding box. */
export function templateDevices(template: string, outline: Array<[number, number]>, nextId: () => string, C: Catalog = defaultCatalog): PlannedDevice[] {
  const T = C.templates[template] || C.templates['custom']!;
  const { w, l } = box({ points: outline });
  const out: PlannedDevice[] = [];
  for (const [cat, fx, fy, rot] of T.items || []) out.push(newDevice(nextId(), cat, out, { x: fx * w, y: fy * l, rot }, 'template', C));
  return out;
}

export const outlineFor = (shape: string, widthM: number, lengthM: number): Array<[number, number]> =>
  ((shapes as Record<string, (w: number, l: number) => Array<[number, number]>>)[shape] || shapes.rect)(widthM, lengthM).map(([x, y]) => [r3(x), r3(y)] as [number, number]);

/**
 * The proposed-connection rules: networked device → switch; microphone → audio processor; amplifier/processor → loudspeaker;
 * processor → amplifier; camera → room compute; compute → display; compute ↔ processor; touch panel → controller.
 * Returns only the NEW connections (existing identical ones are not duplicated). `onlyId` limits the rules to one device.
 */
export function proposeConnections(d: Pick<RoomDesignInput, 'devices' | 'connections'>, nextConnId: () => string, onlyId?: string, C: Catalog = defaultCatalog): Connection[] {
  const live = d.devices.filter((x) => !x.removed && !x.furniture);
  const first = (cats: string[]) => live.find((x) => cats.includes(x.cat));
  const sw = first(['switch']); const dsp = first(['dsp']); const comp = first(['compute']); const amp = first(['amp']); const swr = first(['switcher']);
  const all = [...d.connections]; const added: Connection[] = [];
  const want = (from: PlannedDevice | undefined, to: PlannedDevice | undefined, kind: string, why: string) => {
    if (!from || !to || from.id === to.id) return;
    if (onlyId && from.id !== onlyId && to.id !== onlyId) return;
    if (all.some((c) => !c.removed && c.from === from.id && c.to === to.id && c.kind === kind)) return;
    const c: Connection = { id: nextConnId(), from: from.id, to: to.id, kind, state: 'PROPOSED', why };
    all.push(c); added.push(c);
  };
  for (const x of live) {
    const K = C.categories[x.cat]!;
    if (K.net && sw && x.cat !== 'switch') want(x, sw, 'network', 'networked device → room switch');
    if (['micceil', 'mictable', 'micwireless'].includes(x.cat)) want(x, dsp, 'signal', 'microphone → audio processor');
    if (x.cat === 'speaker') want(amp || dsp, x, 'signal', `${amp ? 'amplifier' : 'audio processor'} → loudspeaker`);
    if (x.cat === 'amp') want(dsp, x, 'signal', 'audio processor → amplifier');
    if (['camera', 'bar'].includes(x.cat)) want(x, comp || swr, 'signal', 'camera → room compute');
    if (['display', 'ledwall', 'projector'].includes(x.cat)) want(swr || comp, x, 'signal', 'room compute → display');
    if (x.cat === 'dsp' && comp) want(comp, x, 'signal', 'room compute ↔ audio processor (far-end audio)');
    if (x.cat === 'touch' && (comp || first(['control']))) want(x, first(['control']) || comp, 'control', 'touch panel → controller');
  }
  return added;
}

export const DRAWING_KINDS: Record<string, string> = {
  plan: 'Dimensioned 2D plan', placement: 'Equipment placement plan', schedule: 'Equipment schedule', relationships: 'Proposed device relationship diagram',
  signal: 'Signal-flow schematic', network: 'Proposed network relationship view', summary: 'Engineering summary',
};

/**
 * The canonical input a drawing is generated from (the demonstrator hashes the same structure). When the input of an APPROVED
 * drawing changes, that drawing becomes REVIEW_REQUIRED. The caller hashes the returned JSON (the API uses SHA-256).
 */
export function drawingInput(d: Pick<RoomDesignInput, 'geometry' | 'devices' | 'connections'> & { classification?: { approved?: { archetype: string | null } | null; suggested?: { archetype: string | null; complexity: string } | null } }, kind: string): string {
  const live = d.devices.filter((x) => !x.removed);
  const conns = d.connections.filter((c) => !c.removed);
  if (kind === 'plan') return JSON.stringify([d.geometry]);
  if (kind === 'schedule' || kind === 'placement') return JSON.stringify([d.geometry, live.map((x) => [x.id, x.cat, x.model, x.x, x.y, x.mount, x.label])]);
  if (kind === 'summary') return JSON.stringify([d.geometry, live.map((x) => [x.id, x.cat, x.model, x.x, x.y, x.mount]), conns.map((c) => [c.from, c.to, c.kind]), [d.classification?.approved?.archetype, d.classification?.suggested?.archetype, d.classification?.suggested?.complexity]]);
  return JSON.stringify([live.map((x) => [x.id, x.cat, x.model]), conns.map((c) => [c.from, c.to, c.kind])]);
}
