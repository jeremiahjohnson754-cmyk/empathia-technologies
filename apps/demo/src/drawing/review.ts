/**
 * Drawing Intelligence, reviewing (founder, §10). What was read from a plan, a schedule and a bill of materials (read.ts) is put
 * together, checked against itself, turned into a design the existing commissioning engine understands, and reviewed by that
 * engine's own rules: the equipment a room type requires, where things sit, and the tests that would apply.
 *
 * The rules here:
 *  - "When documents contradict each other, preserve both sources and request engineering review." A contradiction names both
 *    documents and both values, is never settled here, and blocks approval until an engineer writes what was decided.
 *  - "When devices overlap, raise a conflict." "When scale is unknown, request calibration."
 *  - A check is run only when the package holds what it needs. With no signal flow diagram, signal paths are NOT reviewed, and the
 *    review says so instead of reporting every device as unconnected.
 *  - "Every recommendation should explain the evidence, assumptions, and applicable standards": each finding carries its sources
 *    and how it is known. "Human engineers must approve consequential designs and commissioning conclusions": nothing here approves.
 *  - This is rule-checking on what was read. It is not the judgment of an engineer and does not claim to be.
 */
import type { PlannedDevice, RoomDesignInput } from '@empathia/domain-types';
import { analyzeRoom, defaultCatalog, type Catalog } from '@empathia/commissioning-engine';
import { catFromWords, type BomRead, type Cls, type PlanRead, type ScheduleRead } from './read.js';

export type FindingKind = 'scale-unknown' | 'scale-conflict' | 'no-boundary' | 'overlap' | 'outside' | 'unknown-tag' | 'duplicate' | 'not-in-schedule' | 'not-on-plan' | 'category-contradiction' | 'quantity-contradiction' | 'missing-document' | 'reading-doubt' | 'ports' | 'standard';
export interface Finding {
  id: string; kind: FindingKind; /** a blocker must be resolved by an engineer, with a note, before approval */ blocker: boolean; text: string;
  /** the documents and places it rests on; a contradiction keeps both */ sources: string[]; cls: Cls; /** what would settle it */ ask: string;
}
export interface Device { tag: string; cat: string | null; catCls: Cls; catWhy: string; model: string | null; /** metres from the room's top-left corner, when a scale exists */ x: number | null; y: number | null; posCls: Cls | null; inRoom: boolean | null; network: boolean | null }
export interface Extraction {
  plan: PlanRead | null; schedule: ScheduleRead | null; bom: BomRead | null; devices: Device[]; room: { width: number; length: number; cls: Cls } | null; ports: number; findings: Finding[];
  /** checks that could not be run, and what is missing for each */ notReviewed: string[];
}
const r2 = (n: number) => Math.round(n * 100) / 100;
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function combine(plan: PlanRead | null, schedule: ScheduleRead | null, bom: BomRead | null, C: Catalog = defaultCatalog): Extraction {
  const F: Finding[] = []; const add = (kind: FindingKind, blocker: boolean, text: string, sources: string[], cls: Cls, ask: string, key = '') => F.push({ id: `${kind}:${key || F.length}`, kind, blocker, text, sources, cls, ask });
  const ex: Extraction = { plan, schedule, bom, devices: [], room: null, ports: plan?.ports.length ?? 0, findings: F, notReviewed: [] };
  if (!plan) add('missing-document', true, 'The package has no room plan. Nothing can be placed or checked for position.', [], 'EXTRACTED', 'Add the room plan as an SVG file.', 'plan');
  if (!schedule) add('missing-document', false, 'The package has no device schedule. What each device is comes only from its tag, and models are unknown.', [], 'EXTRACTED', 'Add the device schedule as a CSV file with Tag, Description and Model columns.', 'schedule');
  if (!bom) add('missing-document', false, 'The package has no bill of materials. Quantities cannot be cross-checked.', [], 'EXTRACTED', 'Add the bill of materials as a CSV file with Model and Qty columns.', 'bom');
  ex.notReviewed.push('Signal paths: the package has no signal flow diagram, and this reader does not read one. Whether each microphone reaches the audio processor and each camera reaches the room compute was not checked.');
  ex.notReviewed.push('Camera and microphone coverage of the seats: a plan read this way has no seats.');
  for (const src of [plan, schedule, bom]) for (const d of src?.doubts || []) add(/do not agree with each other/.test(d) ? 'scale-conflict' : /more than once|listed twice/.test(d) ? 'duplicate' : 'reading-doubt', /do not agree|more than once|listed twice/.test(d), d, [src!.doc], 'EXTRACTED', /do not agree/.test(d) ? 'Calibrate: give the real length of one line on the drawing.' : 'An engineer checks the document and says what is right.', `${src!.doc}:${F.length}`);
  const u = plan?.unitsPerMetre ?? null; const b = plan?.boundary ?? null;
  if (plan && !b) add('no-boundary', true, 'The room’s outline could not be found on the plan.', [plan.doc], 'EXTRACTED', 'Provide a plan on which the room is drawn as a rectangle.', 'b');
  if (plan && !u && !plan.doubts.some((d) => /do not agree with each other/.test(d))) add('scale-unknown', true, 'The plan’s scale is unknown: no dimension is written beside a line. Nothing is given in metres.', [plan.doc], 'EXTRACTED', 'Calibrate: give the real length of one line on the drawing.', 'u');
  if (b && u) ex.room = { width: r2(b.w / u), length: r2(b.h / u), cls: 'MODELED' };
  const sched = new Map((schedule?.rows || []).map((r) => [r.tag, r] as const));
  for (const d of plan?.devices || []) {
    const s = sched.get(d.tag); const said = s ? catFromWords(s.description) : null;
    if (said && d.cat && said !== d.cat && !(d.prefix === 'MIC' && /^mic/.test(said))) add('category-contradiction', true, `${d.tag} is drawn with a tag that means ${C.categories[d.cat]?.label.toLowerCase() || d.cat}; the schedule describes it as “${s!.description}”. Both are kept.`, [`${plan!.doc}: tag ${d.tag}`, `${schedule!.doc}: row ${s!.line}`], 'EXTRACTED', 'An engineer says which document is right.', d.tag);
    const cat = said ?? d.cat; const inRoom = b ? d.px >= b.x && d.px <= b.x + b.w && d.py >= b.y && d.py <= b.y + b.h : null;
    ex.devices.push({ tag: d.tag, cat, catCls: said ? 'EXTRACTED' : 'INFERRED', catWhy: said ? `the schedule describes it as “${s!.description}”` : d.note ?? `the prefix “${d.prefix}” is taken to mean ${cat ? C.categories[cat]?.label.toLowerCase() || cat : 'nothing known'}`,
      model: s?.model || null, x: b && u ? r2((d.px - b.x) / u) : null, y: b && u ? r2((d.py - b.y) / u) : null, posCls: b && u ? 'MODELED' : null, inRoom, network: s?.network ?? (cat ? C.categories[cat]?.net ?? null : null) });
    if (!cat) add('unknown-tag', true, `${d.tag} is on the plan, but what it is could not be told: ${d.note}.`, [`${plan!.doc}: tag ${d.tag}`], 'EXTRACTED', 'An engineer says what the device is, or the schedule lists it.', d.tag);
    if (inRoom === false) add('outside', false, `${d.tag} is drawn outside the room’s outline.`, [`${plan!.doc}: tag ${d.tag}`], 'EXTRACTED', 'Check whether it belongs to this room, or whether the outline was read wrongly.', d.tag);
    if (schedule && schedule.rows.length && !s) add('not-in-schedule', false, `${d.tag} is on the plan but not in the schedule.`, [`${plan!.doc}: tag ${d.tag}`, schedule.doc], 'EXTRACTED', 'Add it to the schedule, or remove it from the plan.', d.tag);
  }
  if (plan) for (const r of schedule?.rows || []) if (!plan.devices.some((d) => d.tag === r.tag)) add('not-on-plan', false, `${r.tag} (${r.description || 'no description'}) is in the schedule but not on the plan.`, [`${schedule!.doc}: row ${r.line}`, plan.doc], 'EXTRACTED', 'Draw it on the plan, or remove it from the schedule.', r.tag);
  const P = plan?.devices || []; for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const d = Math.hypot(P[i]!.px - P[j]!.px, P[i]!.py - P[j]!.py); if (u ? d / u < 0.2 : d < 1)
    add('overlap', true, `${P[i]!.tag} and ${P[j]!.tag} are drawn in the same place${u ? ` (${r2(d / u)} m apart)` : ''}.`, [`${plan!.doc}: tags ${P[i]!.tag}, ${P[j]!.tag}`], u ? 'MODELED' : 'EXTRACTED', 'An engineer says whether one is mounted above the other or the drawing is wrong.', `${P[i]!.tag}+${P[j]!.tag}`); }
  if (schedule && bom && bom.rows.length) { const by = new Map<string, number>(); for (const r of schedule.rows) if (r.model) by.set(r.model, (by.get(r.model) || 0) + 1);
    for (const r of bom.rows) { const n = by.get(r.model) || 0; if (n !== r.qty) add('quantity-contradiction', true, `The schedule lists ${n} of model ${r.model}; the bill of materials lists ${r.qty}. Both are kept.`, [`${schedule.doc}: ${count(n, 'row')}`, `${bom.doc}: row ${r.line}`], 'EXTRACTED', 'An engineer says which quantity is right.', r.model); by.delete(r.model); }
    for (const [model, n] of by) add('quantity-contradiction', true, `The schedule lists ${n} of model ${model}; the bill of materials does not list it. Both are kept.`, [`${schedule.doc}: ${count(n, 'row')}`, bom.doc], 'EXTRACTED', 'An engineer says whether it is to be bought.', model); }
  if (plan) { const need = ex.devices.filter((d) => d.network).length; if (need > ex.ports) add('ports', false, `The plan shows ${count(ex.ports, 'network port')}; ${count(need, 'device')} on it ${need === 1 ? 'needs' : 'need'} one. Ports inside a rack or on a switch are not counted here.`, [plan.doc, ...(schedule ? [schedule.doc] : [])], 'MODELED', 'Check the network port plan against the devices.', 'np'); }
  return ex;
}

/** A design the commissioning engine can analyse, when the room's size is known. Positions are metres from the room's corner. */
export function toDesign(ex: Extraction, opts: { template: string; occupancy: number; use: string; ceiling?: number }, C: Catalog = defaultCatalog): { ok: RoomDesignInput } | { why: string } {
  if (!ex.room) return { why: 'The room’s size is not known in metres, so no design can be formed from the drawing. Calibrate the plan first.' };
  const devices: PlannedDevice[] = ex.devices.filter((d) => d.cat && d.x !== null && d.y !== null && C.categories[d.cat!]).map((d) => { const K = C.categories[d.cat!]!;
    return { id: d.tag, cat: d.cat!, label: `${K.label} ${d.tag}`, role: K.label, model: d.model || K.label, generic: !d.model, brand: null, modelName: d.model, x: d.x!, y: d.y!, mount: K.mount as PlannedDevice['mount'], props: { ...(K as unknown as { props?: Record<string, unknown> }).props }, provenance: 'drawing' }; });
  const { width: w, length: l } = ex.room; const ceiling = opts.ceiling ?? 2.7;
  return { ok: { template: opts.template, intendedUse: opts.use, occupancy: opts.occupancy, lifecycle: 'DESIGNING', coreRoomId: 'drawing', devices, connections: [], classification: { approved: null },
    geometry: { shape: 'rect', points: [[0, 0], [w, 0], [w, l], [0, l]], ceiling, lengthM: l, widthM: w, provenance: { length: 'modeled', width: 'modeled', ceiling: opts.ceiling ? 'declared' : 'assumed' }, confidence: 'modeled' } } };
}
export interface StandardsReview { archetype: string | null; archetypeName: string | null; findings: Finding[]; assumptions: string[]; checklist: Array<{ id: string; label: string }>; }
/** Checks that depend on connections or seats, which a plan read this way does not hold: they are listed as not reviewed, not reported. */
const NEEDS_MORE = /^(unresolved_connection|no_network|sightline|coverage|pickup)/;
/**
 * Review the drawing against the standard for a room type, using the commissioning engine's own rules, and draft the checklist of
 * tests that would apply. `archetype` is the room type an engineer names; without one the engine's own suggestion is used and said.
 */
export function standardsReview(ex: Extraction, design: RoomDesignInput, archetype: string | null, C: Catalog = defaultCatalog): StandardsReview {
  const d: RoomDesignInput = archetype && C.archetypes[archetype] ? { ...design, classification: { approved: { archetype, override: true, by: 'reviewer' } } } : design;
  const a = analyzeRoom(d, C); const arch = a.archetype; const A = arch ? C.archetypes[arch] : undefined; const src = [ex.plan?.doc, ex.schedule?.doc].filter(Boolean) as string[];
  const findings: Finding[] = a.checks.filter((k) => !NEEDS_MORE.test(k.check)).map((k) => ({ id: `standard:${k.key}`, kind: 'standard' as const, blocker: k.severity === 'High', text: `${k.title}: ${k.rationale}.`, sources: src, cls: 'MODELED' as const, ask: `${k.action.charAt(0).toUpperCase()}${k.action.slice(1)}, or an engineer records why the room is an exception.` }));
  const assumptions = [archetype && A ? `Reviewed as ${A.name}, the room type the reviewer named.` : `No room type was named. The engine suggests ${A ? A.name : 'none'} from the size, the seats and the equipment; an engineer confirms it.`,
    `The equipment a ${A ? A.name.toLowerCase() : 'room'} requires is this demonstration’s catalogue (${(arch && C.required[arch] || []).join(', ') || 'nothing listed'}). An organisation’s own approved standard would replace it.`,
    design.geometry.provenance.ceiling === 'assumed' ? `No ceiling height is on the plan: ${design.geometry.ceiling} m is assumed.` : `The ceiling height (${design.geometry.ceiling} m) is as the reviewer stated.`, 'Positions are computed from the drawing’s units and its scale. They are not a survey.'];
  const checklist = a.applicability.rows.filter((r) => r.applicable).map((r) => ({ id: r.id, label: r.label }));
  return { archetype: arch, archetypeName: A?.name ?? null, findings, assumptions, checklist };
}

export interface Change { kind: 'added' | 'removed' | 'moved' | 'model' | 'category' | 'room-size'; text: string }
/** "Show me what changed between revision A and revision B": by tag, never by position alone. */
export function diff(a: Extraction, b: Extraction): Change[] {
  const out: Change[] = []; const A = new Map(a.devices.map((d) => [d.tag, d] as const)); const B = new Map(b.devices.map((d) => [d.tag, d] as const));
  for (const [tag, d] of B) if (!A.has(tag)) out.push({ kind: 'added', text: `${tag} was added${d.model ? ` (${d.model})` : ''}.` });
  for (const [tag] of A) if (!B.has(tag)) out.push({ kind: 'removed', text: `${tag} was removed.` });
  for (const [tag, x] of A) { const y = B.get(tag); if (!y) continue;
    if (x.cat !== y.cat) out.push({ kind: 'category', text: `${tag} is now ${y.cat || 'of an unknown kind'}; it was ${x.cat || 'of an unknown kind'}.` });
    if ((x.model || '') !== (y.model || '')) out.push({ kind: 'model', text: `${tag}: the model is now ${y.model || 'not given'}; it was ${x.model || 'not given'}.` });
    if (x.x !== null && y.x !== null && x.y !== null && y.y !== null) { const m = Math.hypot(x.x - y.x, x.y - y.y); if (m >= 0.3) out.push({ kind: 'moved', text: `${tag} moved ${r2(m)} m.` }); }
    else if (a.plan && b.plan) { const pa = a.plan.devices.find((d) => d.tag === tag); const pb = b.plan.devices.find((d) => d.tag === tag); if (pa && pb && Math.hypot(pa.px - pb.px, pa.py - pb.py) > 5) out.push({ kind: 'moved', text: `${tag} moved on the drawing. How far in metres is not known: one of the two revisions has no scale.` }); } }
  if (a.room && b.room && (Math.abs(a.room.width - b.room.width) > 0.05 || Math.abs(a.room.length - b.room.length) > 0.05)) out.push({ kind: 'room-size', text: `The room is now ${b.room.width} m by ${b.room.length} m; it was ${a.room.width} m by ${a.room.length} m.` });
  return out;
}
