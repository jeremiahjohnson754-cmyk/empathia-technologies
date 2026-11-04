/**
 * Room records for the canonical campus, generated lazily and deterministically on the commissioning engine the product ships.
 *
 * For every room: a geometry (MODELED, or DECLARED for the reference room's design record), positions placed from the engine's room
 * template for its archetype, connections proposed by the engine's rules, the engine-judged applicable tests, and a lifecycle reached by
 * walking the engine's own gates. Results are recorded and independently verified through the engine's `recordBlockers` / `verifyBlockers`
 * rules with a fixed seed — no result is typed by hand, and a gate that refuses stops the room where it is.
 *
 * Positions carry a stable position code, a physical asset code and an identity state. No serial number, make or model is invented: a
 * position's device is a class template (its category) with "spec to verify".
 */
import {
  analyzeRoom, defaultCatalog, outlineFor, templateDevices, newDevice, proposeConnections, lifecycleBlockers, recordBlockers, buildResult,
  verifyBlockers, resultCounts, type RoomAnalysis,
} from '@empathia/commissioning-engine';
import type { RoomDesignInput, PlannedDevice, Connection, RecordedResult, RoomLifecycle, ApplicabilityRow, DesignFinding } from '@empathia/domain-types';
import { ROOMS, TEMPLATE_FOR, ARCHETYPE_NAME, REFERENCE_ROOM_ID, roomById, seeded, type RoomOutline } from './canon.js';

export const C = defaultCatalog;
/** The demonstration's fixed "now": every generated date is relative to it, so the record never changes between visits. */
export const DEMO_NOW = Date.UTC(2026, 10, 1, 15, 0, 0);
const DAY = 86400000;
const iso = (t: number) => new Date(t).toISOString();

export type Layer = 'display' | 'video' | 'audio' | 'control' | 'network' | 'power' | 'furniture';
const LAYER_OF: Record<string, Layer> = {
  display: 'display', ledwall: 'display', projector: 'display', camera: 'video', bar: 'video', switcher: 'video', encoder: 'video',
  micceil: 'audio', mictable: 'audio', micwireless: 'audio', speaker: 'audio', dsp: 'audio', amp: 'audio',
  compute: 'control', control: 'control', touch: 'control', scheduler: 'control', occsensor: 'control', lighting: 'control', iot: 'control', hvac: 'control', seccam: 'video',
  switch: 'network', rack: 'power', pdu: 'power', table: 'furniture', chairs: 'furniture', lectern: 'furniture',
};
export const layerOf = (cat: string): Layer => LAYER_OF[cat] || 'control';
export const LAYERS: Array<{ key: Layer; label: string }> = [
  { key: 'display', label: 'Displays' }, { key: 'video', label: 'Video' }, { key: 'audio', label: 'Audio' }, { key: 'control', label: 'Control and compute' },
  { key: 'network', label: 'Network' }, { key: 'power', label: 'Racks and power' }, { key: 'furniture', label: 'Furniture' },
];

export type IdentityState = 'UNKNOWN' | 'DECLARED' | 'OBSERVED' | 'VERIFIED';
/** A stable room position (the slot) with the physical unit installed in it now. */
export interface Position {
  code: string;
  cat: string;
  catLabel: string;
  label: string;
  layer: Layer;
  x: number; y: number; z: number; rot: number; mount: string;
  furniture: boolean;
  /** the installed physical asset (null for furniture and for positions with nothing recorded) */
  asset: string | null;
  identity: IdentityState;
  /** what is known about the unit: a class template from the catalogue, never an invented make or serial */
  device: string;
  provenance: string;
}
export interface Installation { position: string; asset: string; installedAt: string; removedAt: string | null; reason: string; removalReason?: string; basis: string; by: string }
export interface RoomEvent { at: string; by: string; type: string; detail: string; outcome?: 'ALLOWED' | 'DENIED'; scenario?: string }
export interface Baseline { version: number; state: 'CURRENT' | 'SUPERSEDED' | 'PENDING_ACCEPTANCE'; revision: number; at: string; by: string | null; note: string }
export interface Issue { id: string; title: string; severity: 'High' | 'Medium' | 'Low'; state: 'OPEN' | 'RESOLVED' | 'PENDING_APPROVAL'; positions: string[]; source: string }
export interface CoverageRow { area: string; state: 'complete' | 'modeled' | 'recorded' | 'gap'; note: string }

export interface RoomRecord {
  outline: RoomOutline;
  archetypeName: string;
  templateNote?: string;
  design: RoomDesignInput;
  analysis: RoomAnalysis;
  positions: Position[];
  connections: Connection[];
  installations: Installation[];
  lifecycle: RoomLifecycle;
  /** the engine's refusal for the next step, if any (empty when the room is where its record ends) */
  nextStep: { to: RoomLifecycle; blockers: string[] } | null;
  events: RoomEvent[];
  baselines: Baseline[];
  issues: Issue[];
  findings: DesignFinding[];
  coverage: CoverageRow[];
  counts: ReturnType<typeof resultCounts>;
  /** tests reopened by a replacement (reference room only) */
  reopened: Array<{ testId: string; reasons: string[] }>;
  exception?: { id: string; state: 'PENDING_APPROVAL'; finding: string; requirement: string; waivability: string; rationale: string; scope: string; revision: number; expiry: string; requester: string; reviewer: null };
  geometryProvenance: string;
}

/** Synthetic people (personas of the demonstration; never real people). */
export const PEOPLE: Record<string, string> = {
  designer: 'Designer (synthetic)', syseng: 'Systems Engineer (synthetic)', installer: 'Installer (synthetic)', cxeng: 'Commissioning Engineer (synthetic)',
  qa_reviewer: 'QA Reviewer (synthetic)', opslead: 'Operations Lead (synthetic)', architect: 'Solution Architect (synthetic)', requestor: 'Requester (synthetic)', svcmgr: 'Service Manager (synthetic)', service: 'Service Technician (synthetic)',
};

/** Rooms whose record ends in COMMISSIONING (open issues or untested), chosen once and kept. */
const HELD: Record<string, { why: string; untested: number; fail?: string; issue?: Omit<Issue, 'id' | 'positions' | 'source'> & { cat: string } }> = {
  'R-BCN-3-101': { why: 'installed this autumn; commissioning in progress', untested: 9 },
  'R-BCN-3-225': { why: 'reverberation under the high open ceiling fails speech intelligibility', untested: 3, fail: 'Audio', issue: { title: 'Speech intelligibility below the room standard under the open ceiling', severity: 'High', state: 'OPEN', cat: 'micceil' } },
  'R-MER-2-160': { why: 'the AV network routes are not yet commissioned', untested: 6 },
};
/** Accepted rooms that carry an open operational issue (Assurance drift or a field report), from the V2.5.3 storylines. */
const OPEN_ISSUE: Record<string, { title: string; severity: 'High' | 'Medium' | 'Low'; cat: string }> = {
  'R-MER-1-140': { title: 'Furniture moved since handover: the camera and ceiling microphone no longer cover every seat', severity: 'Medium', cat: 'camera' },
  'R-MER-2-120': { title: 'Drift against the commissioning baseline on the wall absorbers', severity: 'Low', cat: 'speaker' },
  'R-ATL-7-112': { title: 'Display does not wake from standby on the first try', severity: 'Low', cat: 'display' },
};

/** The earlier records of this demonstration, kept unchanged (positions as recorded; nothing else is invented for them). */
const EARLIER: Record<string, { lifecycle: RoomLifecycle; positions: Array<[string, string, string]>; baseline?: Baseline; note: string }> = {
  'R-ATL-4-220': { lifecycle: 'OPERATIONAL', positions: [['A-0201', 'bar', 'Video bar'], ['A-0202', 'compute', 'UC room compute']], note: 'The earlier record lists two devices and the OPERATIONAL status. The engine would need live monitoring evidence to reach OPERATIONAL; that evidence is not part of a synthetic record.' },
  'R-ATL-4-231': { lifecycle: 'ACCEPTED', positions: [['A-0301', 'projector', 'Projector'], ['A-0302', 'control', 'Control processor']], baseline: { version: 1, state: 'CURRENT', revision: 3, at: iso(DEMO_NOW - 210 * DAY), by: 'syseng', note: 'baseline BL-4-231-v1, design revision 3 (earlier record)' }, note: 'The earlier record lists two devices and baseline v1 (CURRENT, design revision 3).' },
  'R-NST-2-101': { lifecycle: 'COMMISSIONING', positions: [], note: 'The earlier record holds the room and its COMMISSIONING status only; no device positions were recorded.' },
};

const cache = new Map<string, RoomRecord>();
/** The record of one room, generated on first use and kept for the page's lifetime (deterministic: the same every visit). */
export function roomRecord(id: string): RoomRecord | null {
  const hit = cache.get(id); if (hit) return hit;
  const o = roomById(id); if (!o) return null;
  const r = build(o); cache.set(id, r); return r;
}
export const allRecords = (): RoomRecord[] => ROOMS.map((o) => roomRecord(o.id)!);

function build(o: RoomOutline): RoomRecord {
  const rng = seeded(o.id);
  const t = TEMPLATE_FOR[o.archetype] || { template: 'custom' };
  const [w, l, h] = o.dims;
  const points = outlineFor('rect', w, l);
  const geoProv = o.kind === 'reference' ? 'DECLARED' : 'MODELED';
  let seq = 0; const nextPa = () => `PA-${String(++seq).padStart(4, '0')}`;
  let devices: PlannedDevice[];
  const earlier = EARLIER[o.id];
  if (earlier) {
    devices = [];
    for (const [code, cat, label] of earlier.positions) { const d = newDevice(code, cat, devices, { x: w / 2, y: l * (0.2 + 0.5 * devices.length), mount: undefined }, 'earlier record', C); d.label = label; d.role = label; devices.push(d); }
  } else {
    devices = templateDevices(t.template, points, nextPa, C);
    if (o.kind === 'reference') renameReference(devices);
  }
  let cn = 0;
  const design: RoomDesignInput = {
    template: t.template, intendedUse: o.intent, occupancy: o.capacity, lifecycle: 'PLANNED', coreRoomId: o.id,
    geometry: { shape: 'rect', points, ceiling: h, lengthM: l, widthM: w, provenance: { length: geoProv, width: geoProv, ceiling: geoProv }, confidence: geoProv === 'DECLARED' ? 'declared' : 'modeled' },
    devices, connections: [], classification: { approved: { archetype: o.archetype, override: false, by: 'syseng', reason: `archetype ${o.archetype} from the campus record` } }, results: {},
  };
  design.connections = earlier ? [] : proposeConnections(design, () => `CN-${String(++cn).padStart(4, '0')}`, undefined, C);
  const events: RoomEvent[] = []; const ev = (days: number, by: string, type: string, detail: string, outcome: 'ALLOWED' | 'DENIED' = 'ALLOWED') => events.push({ at: iso(DEMO_NOW - days * DAY), by, type, detail, outcome });
  const asset = (i: number) => `AS-${String(assetBase(o.id) + i).padStart(4, '0')}`;
  const hardware = devices.filter((d) => !d.furniture);
  const installations: Installation[] = hardware.map((d, i) => ({ position: d.id, asset: asset(i), installedAt: iso(DEMO_NOW - (420 + Math.floor(rng() * 200)) * DAY), removedAt: null, reason: 'INSTALLED', basis: earlier ? 'known as of the earlier record' : 'synthetic seed (deterministic)', by: 'installer' }));
  const issues: Issue[] = []; let analysis = analyzeRoom(design, C);
  const findings = analysis.checks;
  let lifecycle: RoomLifecycle = 'PLANNED'; let nextStep: RoomRecord['nextStep'] = null;
  const baselines: Baseline[] = [];
  const reopened: RoomRecord['reopened'] = [];
  let exception: RoomRecord['exception'];

  if (earlier) {
    // an earlier record keeps its own status; the engine still judges which tests apply to the devices it lists
    lifecycle = earlier.lifecycle; design.lifecycle = lifecycle; analysis = analyzeRoom(design, C);
    if (earlier.baseline) baselines.push(earlier.baseline);
    ev(400, 'requestor', 'room.created', `${o.id} (earlier demonstration record)`);
    ev(1, 'system', 'record.kept', earlier.note);
  } else {
    // walk the engine's gates, one governed step at a time; a refusal stops the room where it is
    const startDays = 520 + Math.floor(rng() * 160);
    ev(startDays, 'designer', 'room.design_created', `${o.name} designed from the ${t.template} template (${hardware.length} devices, ${design.connections.length} proposed connections)${t.note ? `; ${t.note}` : ''}`);
    ev(startDays - 2, 'syseng', 'room.classification_approved', `archetype ${o.archetype} (${ARCHETYPE_NAME[o.archetype] || o.archetype})`);
    ev(startDays - 3, 'designer', 'room.revision_saved', 'revision 1');
    const step = (to: RoomLifecycle, days: number, by: string, extra: Partial<Parameters<typeof lifecycleBlockers>[0]> = {}): boolean => {
      const why = lifecycleBlockers({ from: lifecycle, to, classificationApproved: true, openIssues: issues.filter((x) => x.state !== 'RESOLVED'), savedRevisions: 1, rows: analysis.applicability.rows, results: design.results, hasBaseline: baselines.some((b) => b.state === 'CURRENT'), hasLiveMonitoringEvidence: false, ...extra });
      if (why.length) { nextStep = { to, blockers: why }; ev(days, by, 'room.lifecycle_refused', `${lifecycle} → ${to}: ${why.join('; ')}`, 'DENIED'); return false; }
      ev(days, by, 'room.lifecycle_changed', `${lifecycle} → ${to}`); lifecycle = to; design.lifecycle = to; analysis = analyzeRoom(design, C); return true;
    };
    // High design deficiencies are design issues: the gate to DESIGN_APPROVED refuses while they are open
    const hi = findings.filter((f) => f.severity === 'High');
    hi.forEach((f, i) => issues.push({ id: `DD-${o.id.slice(2)}-${i + 1}`, title: f.title, severity: 'High', state: 'OPEN', positions: f.assets, source: `engine design check ${f.check}` }));
    const ok = step('DESIGN_APPROVED', startDays - 6, 'syseng')
      && step('INSTALLATION_PENDING', startDays - 40, 'opslead', { openIssues: [] })
      && step('INSTALLED_UNVERIFIED', startDays - 70, 'installer', { openIssues: [] })
      && step('COMMISSIONING', startDays - 74, 'syseng', { openIssues: [] });
    if (ok) {
      const held = HELD[o.id];
      const rows = analysis.applicability.rows.filter((r) => r.applicable);
      const skip = new Set<string>();
      if (held) { const pool = rows.slice().sort((a, b) => a.id.localeCompare(b.id)); for (let i = 0; i < held.untested && pool.length; i += 1) skip.add(pool.splice(Math.floor(rng() * pool.length), 1)[0]!.id); }
      let at = startDays - 80;
      for (const row of rows) {
        if (skip.has(row.id)) continue;
        const fail = held?.fail && row.domain === held.fail && !rows.some((x) => x.domain === held.fail && design.results![x.id]?.state === 'FAIL');
        const recorded = recordAs(row, fail ? 'FAIL' : 'PASS', design, at);
        if (!recorded) continue;
        ev(at, recorded.by, 'commission.result_recorded', `${row.id} ${fail ? 'FAIL' : 'PASS'} (${row.label})`);
        if (!fail) { const v = verifyAs(row, design, at - 1); if (v) ev(at - 1, v, 'commission.result_verified', `${row.id} independently verified`); }
        at -= rng() < 0.3 ? 1 : 0;
      }
      analysis = analyzeRoom(design, C);
      if (held?.issue) { const p = devices.find((d) => d.cat === held.issue!.cat); issues.push({ id: `ISS-${o.id.slice(2)}`, title: held.issue.title, severity: held.issue.severity, state: 'OPEN', positions: p ? [p.id] : [], source: 'commissioning (FAIL recorded)' }); }
      if (o.kind === 'reference') {
        reference(o, design, devices, installations, events, baselines, issues, reopened, at);
        analysis = analyzeRoom(design, C);
        exception = REF_EXCEPTION;
        lifecycle = 'COMMISSIONING';
        // the engine's gate decides: the open sightline finding keeps acceptance held while the exception is pending approval
        const why = lifecycleBlockers({ from: 'COMMISSIONING', to: 'ACCEPTED', classificationApproved: true, openIssues: issues.filter((x) => x.state !== 'RESOLVED'), savedRevisions: 2, rows: analysis.applicability.rows, results: design.results, hasBaseline: true, hasLiveMonitoringEvidence: false });
        nextStep = { to: 'ACCEPTED', blockers: why }; if (why.length) ev(2, 'qa_reviewer', 'room.lifecycle_refused', `COMMISSIONING → ACCEPTED (re-acceptance, v2): ${why.join('; ')}`, 'DENIED');
      } else if (step('ACCEPTED', at - 3, 'qa_reviewer')) {
        baselines.push({ version: 1, state: 'CURRENT', revision: 1, at: iso(DEMO_NOW - (at - 3) * DAY), by: 'qa_reviewer', note: 'published at acceptance' });
        const oi = OPEN_ISSUE[o.id];
        if (oi) { const p = devices.find((d) => d.cat === oi.cat); issues.push({ id: `ISS-${o.id.slice(2)}`, title: oi.title, severity: oi.severity, state: 'OPEN', positions: p ? [p.id] : [], source: 'Assurance / field report after acceptance' }); ev(9, 'svcmgr', 'issue.opened', oi.title); }
        step('OPERATIONAL', 2, 'opslead');   // refused by the engine: no live monitoring evidence in a synthetic record
      }
    }
  }
  const positions: Position[] = devices.map((d) => {
    const inst = installations.find((x) => x.position === d.id && !x.removedAt);
    const K = C.categories[d.cat];
    return { code: d.id, cat: d.cat, catLabel: K?.label || d.cat, label: d.label, layer: layerOf(d.cat), x: d.x, y: d.y, z: Number(d.z) || 0, rot: Number(d.rot) || 0, mount: String(d.mount), furniture: !!d.furniture, asset: d.furniture ? null : inst?.asset || null, identity: 'UNKNOWN', device: d.furniture ? 'furniture' : `${K?.label || d.cat} · class template · spec to verify`, provenance: earlier ? 'earlier record' : o.kind === 'reference' ? 'design record (reference room)' : 'MODELED from the archetype template' };
  });
  const counts = resultCounts(analysis.applicability.rows, design.results);
  const coverage = coverageOf(o, positions, analysis, t.note);
  events.sort((a, b) => b.at.localeCompare(a.at));
  return { outline: o, archetypeName: ARCHETYPE_NAME[o.archetype] || o.archetype, templateNote: t.note, design, analysis, positions, connections: design.connections, installations, lifecycle, nextStep, events, baselines, issues, findings, coverage, counts, reopened, exception, geometryProvenance: geoProv };
}

/** Each room's physical assets get their own block of codes, so codes never collide across rooms. */
function assetBase(id: string): number { if (id === REFERENCE_ROOM_ID) return 101; const i = ROOMS.findIndex((r) => r.id === id); return 1000 + i * 50; }

function recordAs(row: ApplicabilityRow, state: 'PASS' | 'FAIL', d: RoomDesignInput, days: number): RecordedResult | null {
  const persona = (row.personas || []).find((p) => p !== 'architect') || 'cxeng';
  const kind = (row.evidence || [])[0] || 'photo';
  const input = { state, evidence: { kind, ref: `EV-${d.coreRoomId.slice(2)}-${row.id}`, instrument: row.instrument ? 'synthetic instrument (demonstration)' : null } };
  if (recordBlockers(d.lifecycle as string, row, persona, input).length) return null;
  const r = buildResult(d.results![row.id], persona, input, iso(DEMO_NOW - days * DAY));
  d.results![row.id] = r; return r;
}
function verifyAs(row: ApplicabilityRow, d: RoomDesignInput, days: number): string | null {
  const r = d.results![row.id];
  const candidates = [row.verifier, 'qa_reviewer', 'syseng', 'cxeng'].filter(Boolean) as string[];
  const v = candidates.find((p) => !verifyBlockers(r, p).length);
  if (!v || !r) return null;
  r.verified = { by: v, at: iso(DEMO_NOW - days * DAY) }; return v;
}

// ------------------------------------------------------------------------------------------------ the reference room (Atlas 4.218)
/** Position codes for the reference room follow the earlier estate (A-0101 display … A-0105 touch panel), then continue. */
function renameReference(devices: PlannedDevice[]) {
  const fixed: Record<string, string> = { display: 'A-0101', compute: 'A-0102', dsp: 'A-0103', micceil: 'A-0104', touch: 'A-0105' };
  const used = new Set<string>(); let n = 106;
  for (const d of devices) {
    const f = fixed[d.cat];
    if (f && !used.has(f)) { d.id = f; used.add(f); } else d.id = `A-0${n++}`;
  }
}
export const REF_CAMERA_NEW = 'AS-0112';
const REF_EXCEPTION: NonNullable<RoomRecord['exception']> = {
  id: 'EXC-4218-01', state: 'PENDING_APPROVAL', finding: 'sightline:A-0101 (Medium): the farthest seats sit beyond the planning viewing distance for the display',
  requirement: 'REQ-DSN-SIGHTLINE-01 — SYNTHETIC requirement of the synthetic organisation’s design standard (MODELED planning ratio 6–8 × image height)',
  waivability: 'PERMITS_DOCUMENTED_EXCEPTION: an independent reviewer, evidence, rationale, scope, revision binding and an expiry of at most 12 months',
  rationale: 'The two farthest seats are used for note-takers; content is mirrored on the touch panel.', scope: 'seats 13–14 · finding key sightline:A-0101 · position A-0101', revision: 2,
  expiry: iso(DEMO_NOW + 300 * DAY).slice(0, 10), requester: 'designer', reviewer: null,
};

/**
 * The reference room's connected history (owner decisions of 2026-11-01): accepted with baseline v1; recommissioned; the camera unit
 * replaced (AS-0112, same position); the tests the replacement reopens re-run and independently verified; v2 recorded as PENDING
 * ACCEPTANCE; the viewing-distance exception EXC-4218-01 pending approval. v1 remains the last accepted baseline.
 */
function reference(o: RoomOutline, d: RoomDesignInput, devices: PlannedDevice[], inst: Installation[], events: RoomEvent[], baselines: Baseline[], issues: Issue[], reopened: RoomRecord['reopened'], at: number) {
  const ev = (days: number, by: string, type: string, detail: string, outcome: 'ALLOWED' | 'DENIED' = 'ALLOWED') => events.push({ at: iso(DEMO_NOW - days * DAY), by, type, detail, outcome });
  // acceptance of the original design (v1) — the engine's gate decides
  const rows = analyzeRoom(d, C).applicability.rows;
  const why = lifecycleBlockers({ from: 'COMMISSIONING', to: 'ACCEPTED', classificationApproved: true, openIssues: [], savedRevisions: 1, rows, results: d.results, hasBaseline: false, hasLiveMonitoringEvidence: false });
  if (!why.length) { ev(at - 3, 'qa_reviewer', 'room.lifecycle_changed', 'COMMISSIONING → ACCEPTED'); baselines.push({ version: 1, state: 'CURRENT', revision: 1, at: iso(DEMO_NOW - (at - 3) * DAY), by: 'qa_reviewer', note: 'published at acceptance; still the last accepted baseline' }); }
  else ev(at - 3, 'qa_reviewer', 'room.lifecycle_refused', `COMMISSIONING → ACCEPTED: ${why.join('; ')}`, 'DENIED');
  ev(40, 'syseng', 'room.lifecycle_changed', 'ACCEPTED → COMMISSIONING (recommissioning: camera replacement); baseline v1 stays CURRENT');
  // the camera unit is replaced at the same position: the old installation closes, the new one opens, history is kept
  const cam = devices.find((x) => x.cat === 'camera');
  if (cam) {
    const old = inst.find((x) => x.position === cam.id && !x.removedAt)!;
    old.removedAt = iso(DEMO_NOW - 38 * DAY); old.removalReason = 'REPLACED (same position, different unit)';
    inst.push({ position: cam.id, asset: REF_CAMERA_NEW, installedAt: iso(DEMO_NOW - 38 * DAY), removedAt: null, reason: `REPLACED ${old.asset}`, basis: 'scenario record (owner decision 2026-11-01)', by: 'installer' });
    ev(38, 'installer', 'commission.asset_replaced', `${cam.id}: ${old.asset} removed, ${REF_CAMERA_NEW} installed (position code unchanged)`);
    // tests reopened by the replacement (the V2.5.3 v25CxReplace rule): plan rows naming the unit, Video tests for a camera, identity_asset
    for (const r of rows.filter((x) => x.applicable)) {
      const reasons: string[] = [];
      if ((r.devices || []).includes(cam.id)) reasons.push(`its plan row covers ${cam.id}, whose unit was replaced`);
      if (r.domain === 'Video') reasons.push('a camera was replaced and this is a Video test of the room');
      if (r.id === 'identity_asset') reasons.push('identity is always re-checked after a replacement');
      if (!reasons.length) continue;
      reopened.push({ testId: r.id, reasons });
      const prev = d.results![r.id];
      if (prev) {
        // the earlier result stays in history and never counts towards re-acceptance; re-run and verified by a different person
        const persona = (r.personas || []).find((p) => p !== 'architect') || 'cxeng';
        const res = buildResult(prev, persona, { state: 'PASS', evidence: { kind: (r.evidence || [])[0] || 'photo', ref: `EV-4-218-${r.id}-v2`, instrument: r.instrument ? 'synthetic instrument (demonstration)' : null } }, iso(DEMO_NOW - 12 * DAY));
        d.results![r.id] = res; ev(12, persona, 'commission.result_recorded', `${r.id} re-run after the replacement: PASS`);
        const v = ['qa_reviewer', 'syseng', 'cxeng'].find((p) => !verifyBlockers(res, p).length);
        if (v) { res.verified = { by: v, at: iso(DEMO_NOW - 10 * DAY) }; ev(10, v, 'commission.result_verified', `${r.id} independently verified (re-run)`); }
      }
    }
  }
  baselines.push({ version: 2, state: 'PENDING_ACCEPTANCE', revision: 2, at: iso(DEMO_NOW - 6 * DAY), by: null, note: 'recorded with AS-0112; held until acceptance — v1 remains CURRENT' });
  issues.push({ id: 'FND-4218-SIGHTLINE', title: 'Farthest seats beyond the planning viewing distance (sightline:A-0101)', severity: 'Medium', state: 'OPEN', positions: ['A-0101'], source: 'engine design check, re-run on revision 2' });
  issues.push({ id: 'ISS-0417', title: 'Far-end audio drops out during long calls', severity: 'High', state: 'RESOLVED', positions: ['A-0103'], source: 'field report · WO-0088 (earlier record)' });
  ev(6, 'designer', 'policy.exception_requested', 'EXC-4218-01 requested (pending approval by an independent reviewer)');
  void o;
}

function coverageOf(o: RoomOutline, positions: Position[], a: RoomAnalysis, templateNote?: string): CoverageRow[] {
  const hw = positions.filter((p) => !p.furniture).length;
  const rows: CoverageRow[] = [
    { area: 'Identity, archetype, capacity, floor', state: 'complete', note: o.source },
    { area: 'Geometry', state: o.kind === 'reference' ? 'complete' : o.kind === 'earlier' ? 'modeled' : 'modeled', note: o.kind === 'reference' ? 'dimensions from the design record (V2.5.3 HERO_DIMS)' : 'MODELED dimensions; the room has not been surveyed' },
    { area: 'Device positions', state: o.kind === 'reference' ? 'complete' : o.kind === 'earlier' ? 'recorded' : 'modeled', note: o.kind === 'earlier' ? `${hw} positions as the earlier record lists them; the rest of the room is not recorded` : o.kind === 'reference' ? `${hw} positions with installation history` : `${hw} positions placed from the archetype template${templateNote ? ` (${templateNote})` : ''}` },
    { area: 'Physical identity (make, model, serial)', state: 'gap', note: 'UNKNOWN: no serial, make or model is invented; each unit is a class template with "spec to verify"' },
    { area: 'Connections', state: o.kind === 'earlier' ? 'gap' : 'modeled', note: o.kind === 'earlier' ? 'not part of the earlier record' : 'proposed by the engine’s connection rules (MODELED, not traced)' },
    { area: 'Applicable tests', state: 'complete', note: `${a.applicability.applicable} of ${a.applicability.library} judged applicable by the engine` },
    { area: 'Results and history', state: o.kind === 'earlier' ? 'gap' : 'modeled', note: o.kind === 'earlier' ? 'no results were part of the earlier record' : 'synthetic history recorded and verified through the engine’s rules (fixed seed); nothing typed by hand' },
    { area: 'Field Intelligence scan', state: o.kind === 'reference' ? 'modeled' : 'gap', note: o.kind === 'reference' ? 'scan replay designed for the reference room only (simulated)' : 'scan replay designed for the reference room only' },
    { area: 'Live monitoring', state: 'gap', note: 'none: OPERATIONAL is never claimed without live monitoring evidence' },
  ];
  return rows;
}

/** Open issues per building (for the campus glyphs). */
export function openIssuesByBuilding(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of allRecords()) out[r.outline.building] = (out[r.outline.building] || 0) + r.issues.filter((i) => i.state !== 'RESOLVED').length;
  return out;
}
export const openIssues = (r: RoomRecord): Issue[] => r.issues.filter((i) => i.state !== 'RESOLVED');
