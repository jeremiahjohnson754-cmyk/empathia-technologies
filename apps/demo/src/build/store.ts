/**
 * Build a Room for the investor demonstration: the real commissioning engine (the same package the enterprise API runs), a synthetic
 * room held in the page, and the demonstration's perspective standing in for the signed-in person. Nothing leaves the page; nothing is
 * authenticated — the perspective is a view and the rules below are the engine's own, so a refusal here is the refusal the product gives.
 * The draft is kept in localStorage as a convenience for this viewer only (wrapped: storage may be unavailable) and can be reset.
 */
import {
  analyzeRoom, defaultCatalog, outlineFor, templateDevices, newDevice, proposeConnections, parseLength, lifecycleBlockers, LIFECYCLE_AUTHORITY,
  recordBlockers, buildResult, verifyBlockers, resultLabel, drawingInput, DRAWING_KINDS, reopenedBySubstitution, type RoomAnalysis,
} from '@empathia/commissioning-engine';
import type { RoomDesignInput, PlannedDevice, Connection, RecordedResult, RoomLifecycle, ResultCounts, ResultLabel } from '@empathia/domain-types';
import PERSONAS from '@empathia/domain-data/data/V25_PERSONAS.json' with { type: 'json' };

export const C = defaultCatalog;
const P = PERSONAS as unknown as Record<string, { label: string; authority: string[] }>;
/** The 14 demonstration perspectives map to the persona whose permissions they show (ADR-0006: a view, never authentication). */
export const PERSPECTIVE_PERSONA: Record<string, string> = { visitor: 'requestor', employee: 'requestor', exec: 'exec', service: 'service', svcmgr: 'svcmgr', syseng: 'syseng', designer: 'designer', installer: 'installer', cxeng: 'cxeng', ipm: 'ipm', bpm: 'bpm', ops: 'opslead', steward: 'steward', architect: 'architect', qa: 'qa_reviewer' };
export const personaOf = (perspective: string) => PERSPECTIVE_PERSONA[perspective] || 'requestor';
export const holds = (persona: string, authority: string) => persona === 'architect' || (P[persona]?.authority || []).includes(authority);
export const personaLabel = (persona: string) => P[persona]?.label || persona;

export interface Draft {
  code: string; name: string; unit: 'm' | 'ft'; createdBy: string; createdAt: string;
  design: RoomDesignInput;
  /** who saved the latest design change (separation of duties: that person does not approve it) */
  lastEditedBy: string;
  revisions: Array<{ n: number; by: string; at: string; hash: string; reason: string }>;
  approvedRevision: number | null;
  drawings: Record<string, { state: 'DRAFT' | 'GENERATED' | 'APPROVED' | 'REVIEW_REQUIRED'; input: string; by?: string }>;
  events: DraftEvent[];
  baseline: Baseline | null;
  /** every published version (superseded ones included): a baseline is never overwritten */
  baselines: Baseline[];
  /** devices substituted while the accepted room is recommissioned, oldest first (kept after the re-acceptance: never deleted) */
  substitutions: Substitution[];
  seq: { pa: number; cn: number };
}
/**
 * A device substituted while an accepted room is recommissioned (ADR-0003). The tests it reopens are judged, when it happens, by the
 * commissioning engine's `reopenedBySubstitution` — the rule the enterprise API runs — on the plan the earlier results were recorded
 * against. Their earlier results stay in the record (and in its history once re-run); they no longer count towards the re-acceptance.
 */
export interface Substitution {
  /** the substituted device (the one whose results no longer count), its label and category */
  assetId: string; label: string; category: string;
  /** the change in words: the substituted category → the device that replaced it */
  from: string; to: string;
  /** the device that replaced it (in Build a Room a different category is a new planned asset) */
  replacedBy: string;
  at: string; by: string;
  /** the baseline that was CURRENT when it happened: the re-acceptance against it is what the reopened tests block */
  baselineVersion: number;
  /** each reopened test with the engine's reason and the number of result records it had then (a later record is a re-run) */
  reopened: Array<{ testId: string; reason: string; records: number }>;
}
/** One ledger event of the draft. A change to the room also carries a structured `change` (actor = `by`, what, from, to, why, affected objects). */
export interface DraftEvent { at: string; by: string; type: string; detail: string; outcome: 'ALLOWED' | 'DENIED'; change?: DraftChange }
export interface DraftChange { what: 'device added' | 'device removed' | 'device swapped'; from: string | null; to: string | null; /** the reason the person gave; '' = none given (never invented) */ why: string; affected: Affected[] }
/** An object a change touched, with what happened to it and the page that shows it. The impact panel appends the engines' findings. */
export interface Affected { kind: 'device' | 'connection' | 'test' | 'baseline' | 'kpi' | 'station' | 'drawing' | 'classification'; id: string; label: string; effect: string; href: string }
export interface Baseline { version: number; at: string; by: string; revision: number | null; results: Record<string, string>; devices: Array<{ id: string; cat: string; label: string }>; state: 'CURRENT' | 'SUPERSEDED' }
export type Refusal = { why: string[] };
export const refused = (why: string[]): Refusal => ({ why });

const KEY = 'empathia.demo.build-a-room.v1';
export function loadDraft(): Draft | null { try { const s = localStorage.getItem(KEY); if (!s) return null; const d = JSON.parse(s) as Draft; if (!d.baselines) d.baselines = d.baseline ? [{ ...d.baseline, devices: [], state: 'CURRENT' }] : []; if (!d.substitutions) d.substitutions = []; return d; } catch { return null; } }
export function saveDraft(d: Draft | null): void { try { if (d) localStorage.setItem(KEY, JSON.stringify(d)); else localStorage.removeItem(KEY); } catch { /* storage unavailable: the draft lasts the page */ } }

const now = () => new Date().toISOString();
const hash = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };   // display hash of a drawing/revision input (the API uses SHA-256)
const log = (d: Draft, by: string, type: string, detail: string, outcome: 'ALLOWED' | 'DENIED' = 'ALLOWED', change?: DraftChange) => { d.events.unshift({ at: now(), by, type, detail, outcome, ...(change ? { change } : {}) }); d.events = d.events.slice(0, 200); };
const DESIGN_HREF = '#/v25/build?tab=design';
const devRef = (x: PlannedDevice, effect: string): Affected => ({ kind: 'device', id: x.id, label: `${x.label} (${x.cat})`, effect, href: DESIGN_HREF });
const connRef = (c: Connection, effect: string): Affected => ({ kind: 'connection', id: c.id, label: `${c.from} → ${c.to} (${c.kind})`, effect, href: DESIGN_HREF });

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
  const d: Draft = { code: 'R-DEMO-0001', name: input.name.trim(), unit: input.unit, createdBy: persona, createdAt: now(), design, lastEditedBy: persona, revisions: [], approvedRevision: null, drawings: {}, events: [], baseline: null, baselines: [], substitutions: [], seq };
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

const CHANGE_STATES = ['PLANNED', 'COMMISSIONING'];
export function addDevice(d: Draft, persona: string, cat: string, pos: { x: number; y: number }, why = ''): Draft | Refusal {
  if (!holds(persona, 'room.design')) return refused([`${personaLabel(persona)} does not hold room.design`]);
  if (!CHANGE_STATES.includes(d.design.lifecycle)) return refused([`devices are planned while the room is PLANNED, or changed during (re)commissioning (this one is ${d.design.lifecycle})`]);
  if (!C.categories[cat]) return refused([`unknown equipment category ${cat}`]);
  const id = `PA-${String(++d.seq.pa).padStart(4, '0')}`;
  const dev = newDevice(id, cat, d.design.devices.filter((x) => !x.removed), { x: pos.x, y: pos.y }, '', C);
  d.design.devices.push(dev);
  const added = proposeConnections(d.design, () => `CN-${String(++d.seq.cn).padStart(4, '0')}`, id, C);
  d.design.connections.push(...added);
  log(d, persona, 'room.device_added', `${dev.label} (${cat}) at ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)} m; ${added.length} connections proposed`, 'ALLOWED',
    { what: 'device added', from: null, to: `${dev.label} (${cat})`, why: why.trim(), affected: [devRef(dev, 'added'), ...added.map((c) => connRef(c, 'proposed (MODELED)'))] });
  touchDesign(d, persona); return d;
}
export function removeDevice(d: Draft, persona: string, id: string, why = ''): Draft | Refusal {
  if (!holds(persona, 'room.design')) return refused([`${personaLabel(persona)} does not hold room.design`]);
  if (!CHANGE_STATES.includes(d.design.lifecycle)) return refused([`devices are planned while the room is PLANNED, or changed during (re)commissioning (this one is ${d.design.lifecycle})`]);
  const dev = d.design.devices.find((x) => x.id === id && !x.removed); if (!dev) return refused([`no device ${id}`]);
  const gone: Connection[] = [];
  dev.removed = true; for (const c of d.design.connections) if (!c.removed && (c.from === id || c.to === id)) { c.removed = true; gone.push(c); }
  log(d, persona, 'room.device_removed', `${dev.label} (${dev.cat}) and its connections`, 'ALLOWED',
    { what: 'device removed', from: `${dev.label} (${dev.cat})`, to: null, why: why.trim(), affected: [devRef(dev, 'removed'), ...gone.map((c) => connRef(c, 'removed'))] });
  touchDesign(d, persona); return d;
}
/** Replace one device by a device of another category at the same place (a camera swapped for a video bar, …): one change, one event.
 *  The new device gets a new planned-asset id — a different category is a different device, not a model substitution. */
export function swapDevice(d: Draft, persona: string, id: string, cat: string, why = ''): Draft | Refusal {
  if (!holds(persona, 'room.design')) return refused([`${personaLabel(persona)} does not hold room.design`]);
  if (!CHANGE_STATES.includes(d.design.lifecycle)) return refused([`devices are planned while the room is PLANNED, or changed during (re)commissioning (this one is ${d.design.lifecycle})`]);
  const old = d.design.devices.find((x) => x.id === id && !x.removed); if (!old) return refused([`no device ${id}`]);
  if (!C.categories[cat]) return refused([`unknown equipment category ${cat}`]);
  if (cat === old.cat) return refused([`${old.label} is already a ${C.categories[cat]!.label}: pick another category to swap it for`]);
  // an accepted room under recommissioning: the substitution is judged on the plan the earlier results were recorded against (before the swap)
  const recom = recommissioningBaseline(d);
  const planBefore = recom ? analysis(d).applicability.rows.filter((r) => r.applicable) : [];
  const gone: Connection[] = [];
  old.removed = true; for (const c of d.design.connections) if (!c.removed && (c.from === id || c.to === id)) { c.removed = true; gone.push(c); }
  const nid = `PA-${String(++d.seq.pa).padStart(4, '0')}`;
  const dev = newDevice(nid, cat, d.design.devices.filter((x) => !x.removed), { x: old.x, y: old.y, rot: old.rot }, '', C);
  d.design.devices.push(dev);
  const added = proposeConnections(d.design, () => `CN-${String(++d.seq.cn).padStart(4, '0')}`, nid, C);
  d.design.connections.push(...added);
  const reopened: Affected[] = [];
  if (recom) {
    // the commissioning engine's rule, the one the enterprise API runs: a result recorded on the substituted device no longer counts
    const sub = { assetId: old.id, label: old.label, category: old.cat, from: old.cat, to: `${dev.label} (${cat}, ${nid})` };
    const res = results(d);
    const tests = reopenedBySubstitution(planBefore.map((r) => ({ testId: r.id, domain: r.domain, devices: r.devices, label: r.label })), [sub]);
    d.substitutions = [...(d.substitutions || []), { ...sub, replacedBy: nid, at: now(), by: persona, baselineVersion: recom.version, reopened: tests.map((t) => ({ testId: t.testId, reason: t.reasons[0]!, records: recordCount(res[t.testId]) })) }];
    for (const t of tests) reopened.push({ kind: 'test', id: t.testId, label: t.row.label, effect: REOPENED, href: '#/v25/build?tab=checks' });
  }
  log(d, persona, 'room.device_swapped', `${old.label} (${old.cat}, ${old.id}) → ${dev.label} (${cat}, ${nid}) at ${old.x.toFixed(1)}, ${old.y.toFixed(1)} m; ${gone.length} connections removed, ${added.length} proposed${recom ? `; ${reopened.length} tests reopened against baseline v${recom.version} (results recorded on ${old.label} no longer count towards the re-acceptance)` : ''}`, 'ALLOWED',
    { what: 'device swapped', from: `${old.label} (${old.cat})`, to: `${dev.label} (${cat})`, why: why.trim(), affected: [devRef(old, 'removed'), devRef(dev, 'added'), ...gone.map((c) => connRef(c, 'removed')), ...added.map((c) => connRef(c, 'proposed (MODELED)')), ...reopened] });
  touchDesign(d, persona); return d;
}

// ------------------------------------------------------------------------------------------------ recommissioning: re-verification after a substitution
/** What the record says of a reopened test until it is re-run (the Impact panel, the plan, the results and the story say it the same way). */
export const PREVIOUS_DEVICE = 'recorded on the previous device · must be re-run and verified again';
export const REOPENED = `reopened: ${PREVIOUS_DEVICE}`;
/** The number of result records a test has (the current one and its history): a record made after a substitution has a higher number. */
const recordCount = (r: RecordedResult | undefined) => (r ? (r.history || []).length + 1 : 0);
/** The CURRENT baseline of an accepted room that is being recommissioned (ACCEPTED → COMMISSIONING); null in every other state. */
export function recommissioningBaseline(d: Draft): Baseline | null {
  return d.design.lifecycle === 'COMMISSIONING' && d.baseline && d.baseline.state === 'CURRENT' ? d.baseline : null;
}
/** The substitutions made under the current baseline while it is being recommissioned. */
export const activeSubstitutions = (d: Draft): Substitution[] => { const b = recommissioningBaseline(d); return b ? (d.substitutions || []).filter((s) => s.baselineVersion === b.version) : []; };

/** A reopened test as the API's readiness reports it: the reasons (one per substitution), its current result and whether it is still to re-run. */
export interface Reverification { testId: string; label: string; domain: string; personas: string[]; assets: string[]; reasons: string[]; substitutedAt: string; result: ResultLabel; recordedAt: string | null; rerun: boolean }
/** The applicable tests the substitutions under the current baseline reopened. `rerun`: its result was recorded before the latest of them. */
export function reverification(d: Draft, a: RoomAnalysis = analysis(d)): Reverification[] {
  const subs = activeSubstitutions(d); if (!subs.length) return [];
  const res = results(d);
  return a.applicability.rows.filter((r) => r.applicable).flatMap((r) => {
    const by = subs.flatMap((s) => s.reopened.filter((t) => t.testId === r.id).map((t) => ({ s, t })));
    if (!by.length) return [];
    const cur = res[r.id];
    return [{ testId: r.id, label: r.label, domain: r.domain, personas: r.personas || [], assets: by.map((x) => x.s.assetId), reasons: by.map((x) => x.t.reason), substitutedAt: by[by.length - 1]!.s.at,
      result: resultLabel(cur), recordedAt: cur?.at ?? null, rerun: recordCount(cur) <= Math.max(...by.map((x) => x.t.records)) }];
  });
}
/** The re-acceptance waits for every reopened test: re-run after the substitution, then passed and verified by a different person. */
export function reverificationBlockers(rv: Reverification[]): string[] {
  const why: string[] = [];
  const rerun = rv.filter((t) => t.rerun);
  // the enterprise API's wording (rooms.recommissionBlockers)
  if (rerun.length) why.push(`${rerun.length} test(s) were last recorded before the substitution and must be re-run on the changed design and verified independently: ${rerun.map((t) => t.testId).join(', ')}`);
  const unverified = rv.filter((t) => !t.rerun && t.result !== 'PASS_VERIFIED');
  if (unverified.length) why.push(`${unverified.length} reopened test(s) were re-run after the substitution and are not yet passed and verified by a different person: ${unverified.map((t) => `${t.testId} (${t.result})`).join(', ')}`);
  return why;
}
/** The result counts that still count: a reopened test whose result predates the substitution is taken out of them and counted as reopened. */
export function countsNow(d: Draft, a: RoomAnalysis = analysis(d)): ResultCounts & { reopened: number } {
  const stale = new Set(reverification(d, a).filter((t) => t.rerun).map((t) => t.testId));
  const res = results(d); const L = a.applicability.rows.filter((r) => r.applicable && !stale.has(r.id)).map((r) => resultLabel(res[r.id]));
  const n = (x: ResultLabel) => L.filter((y) => y === x).length;
  return { applicable: L.length + stale.size, recorded: L.filter((x) => x !== 'NOT_TESTED').length, verified: n('PASS_VERIFIED'), awaiting: n('PASS_UNVERIFIED'), failed: n('FAIL'), notSupported: n('NOT_SUPPORTED'), inconclusive: n('INCONCLUSIVE'), notTested: n('NOT_TESTED'), reopened: stale.size };
}
/** Every condition on a lifecycle transition, as reasons (empty = allowed; authority and separation of duties are checked apart): the
 *  engine's gates and, for a re-acceptance, the tests a substitution reopened — as the enterprise API adds them to its refusal. */
export function lifecycleConditions(d: Draft, to: RoomLifecycle, a: RoomAnalysis = analysis(d)): string[] {
  const why = lifecycleBlockers({ from: d.design.lifecycle, to, classificationApproved: !!d.design.classification.approved && !d.design.classification.approved.stale, openIssues: a.checks, savedRevisions: d.revisions.length, rows: a.applicability.rows, results: d.design.results, hasBaseline: !!d.baseline, hasLiveMonitoringEvidence: false });
  if (to === 'ACCEPTED') why.push(...reverificationBlockers(reverification(d, a)));
  return why;
}
export function saveRevision(d: Draft, persona: string, reason: string): Draft | Refusal {
  if (!holds(persona, 'room.design')) return refused([`${personaLabel(persona)} does not hold room.design`]);
  const h = hash(JSON.stringify([d.design.geometry, d.design.devices.filter((x) => !x.removed), d.design.connections.filter((c) => !c.removed)]));
  const last = d.revisions[d.revisions.length - 1];
  if (last && last.hash === h) return refused(['nothing changed since the last revision']);
  d.revisions.push({ n: d.revisions.length + 1, by: persona, at: now(), hash: h, reason: reason.trim() || 'design change' });
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
export function approveDrawing(d: Draft, persona: string, kind: string): Draft | Refusal {
  if (!holds(persona, 'design.release') && !holds(persona, 'room.design.approve')) return refused([`${personaLabel(persona)} does not hold design.release`]);
  const dr = d.drawings[kind]; if (!dr) return refused([`no drawing ${kind}`]);
  if (!d.design.classification.approved || d.design.classification.approved.stale) return refused(['drawings are approved after the classification is approved (and still current)']);
  d.drawings[kind] = { ...dr, state: 'APPROVED', by: persona };
  log(d, persona, 'room.drawing_approved', `${DRAWING_KINDS[kind]} (input ${dr.input})`); return d;
}

export function transition(d: Draft, persona: string, to: RoomLifecycle): Draft | Refusal {
  const need = LIFECYCLE_AUTHORITY[to];
  if (!holds(persona, need)) { log(d, persona, `room.lifecycle:${to}`, `refused: needs ${need}`, 'DENIED'); return refused([`${personaLabel(persona)} may not move a room to ${to} (needs ${need})`]); }
  const a = analysis(d);
  const why = lifecycleConditions(d, to, a);
  if (why.length) { log(d, persona, `room.lifecycle:${to}`, `refused: ${why.join('; ')}`, 'DENIED'); return refused(why); }
  // separation of duties (ADR-0005): the design is not approved by its author; a room is not accepted by whoever recorded or verified its results
  if (to === 'DESIGN_APPROVED') { const author = d.revisions[d.revisions.length - 1]!.by; if (author === persona) { log(d, persona, `room.lifecycle:${to}`, 'refused: the author of the design does not approve it', 'DENIED'); return refused([`${personaLabel(persona)} saved the design revision and does not approve it (separation of duties)`]); } }
  if (to === 'ACCEPTED') { const authors = new Set(Object.values(d.design.results || {}).flatMap((r) => [r.by, r.verified?.by]).filter(Boolean)); if (authors.has(persona)) { log(d, persona, `room.lifecycle:${to}`, 'refused: a recorder or verifier of the results does not accept them', 'DENIED'); return refused([`${personaLabel(persona)} recorded or verified results of this room and does not accept it (separation of duties)`]); } }
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
  log(d, persona, 'room.lifecycle_changed', `${from} → ${to}${to === 'ACCEPTED' ? ` · baseline v${d.baseline!.version} published${d.baselines.length > 1 ? `, v${d.baseline!.version - 1} SUPERSEDED and kept unchanged` : ''}` : ''}`); return d;
}

export function record(d: Draft, persona: string, testId: string, input: { state: string; kind: string; ref: string; instrument?: string }): Draft | Refusal {
  const row = analysis(d).applicability.rows.find((r) => r.id === testId);
  const why = recordBlockers(d.design.lifecycle, row, persona, { state: input.state, evidence: { kind: input.kind, ref: input.ref, instrument: input.instrument || null } });
  if (why.length) { log(d, persona, 'test.recorded', `${testId} refused: ${why.join('; ')}`, 'DENIED'); return refused(why); }
  d.design.results = d.design.results || {};
  d.design.results[testId] = buildResult(d.design.results[testId], persona, { state: input.state, evidence: { kind: input.kind, ref: input.ref, instrument: input.instrument || null } }, now());
  log(d, persona, 'test.recorded', `${testId} ${input.state} → ${resultLabel(d.design.results[testId])} (${input.kind}: ${input.ref})`); return d;
}
export function verify(d: Draft, persona: string, testId: string): Draft | Refusal {
  if (!holds(persona, 'test.verify') && !holds(persona, 'tests.verify.all') && !holds(persona, 'customer.accept')) return refused([`${personaLabel(persona)} does not hold a verification authority`]);
  const r = d.design.results?.[testId]; const why = verifyBlockers(r, persona);
  if (why.length) { log(d, persona, 'test.verified', `${testId} refused: ${why.join('; ')}`, 'DENIED'); return refused(why); }
  r!.verified = { by: persona, at: now() };
  log(d, persona, 'test.verified', `${testId} PASS_VERIFIED by ${personaLabel(persona)}`); return d;
}
export const results = (d: Draft) => d.design.results || ({} as Record<string, RecordedResult>);
export const live = (xs: Array<PlannedDevice | Connection>) => xs.filter((x) => !x.removed);
