/**
 * The rooms the operational workspaces share, on the same synthetic estate as Search Party (src/search/estate.ts): their device
 * positions and, for the reference room Atlas 4.218, the approved canonical post-change state (owner decision 2026-11-01 07:41 CT):
 * camera position PA-0106 now holds physical asset AS-0112 and baseline v2 is current; v1 and its evidence history are preserved.
 * The reference room's design is the commissioning engine's own boardroom template at the room's declared size (Build a Room's
 * createDraft), so its positions, and the tests the engine judges applicable, come from the engine, never from a hand-typed list.
 * Plan coordinates are metres in the room. Everything here is invented.
 */
import { createDraft, type Draft } from '../build/store.js';
import { analyzeRoom } from '@empathia/commissioning-engine';

/** Physical assets at the reference room's positions; PA-0007 held AS-0097 until the approved like-for-like swap to AS-0112. */
export const REFERENCE_ASSET: Record<string, string> = { 'PA-0005': 'A-0101', 'PA-0015': 'A-0102', 'PA-0013': 'A-0103', 'PA-0009': 'A-0104', 'PA-0017': 'A-0105', 'PA-0007': 'AS-0112' };
export const SWAP = { pa: 'PA-0007', from: 'AS-0097', to: 'AS-0112', model: 'same model (like-for-like)', baselineFrom: 1, baselineTo: 2 } as const;
let ref: { draft: Draft; rows: Array<{ id: string; label: string; domain: string; devices: string[] }> } | null = null;
export function referenceDesign() {
  if (!ref) {
    const d = createDraft({ name: 'Atlas 4.218 Boardroom', template: 'boardroom', unit: 'm', shape: 'rect', length: '9.6', width: '6.2', ceiling: '2.9', occupancy: '14', intendedUse: 'Board meetings and hybrid calls' }, 'syseng') as Draft;
    const a = analyzeRoom(d.design);
    ref = { draft: d, rows: a.applicability.rows.filter((r) => r.applicable).map((r) => ({ id: r.id, label: r.label, domain: r.domain, devices: r.devices || [] })) };
  }
  return ref;
}
function referencePositions(): Pos[] {
  return referenceDesign().draft.design.devices.filter((x) => !x.furniture && x.cat !== 'rack').map((x) => ({ pa: x.id, asset: REFERENCE_ASSET[x.id] || `AS-01${x.id.slice(-2)}`, cat: x.cat, label: x.label, x: x.x, y: x.y, networked: !['speaker', 'amp'].includes(x.cat) }));
}

export interface Pos { pa: string; asset: string; cat: string; label: string; x: number; y: number; networked: boolean }
export interface RoomRec { id: string; name: string; building: 'ATL' | 'NST'; archetype: string; w: number; d: number; positions: Pos[]; reference: boolean }

export const ROOMS: RoomRec[] = [
  { id: 'R-ATL-4-218', name: 'Atlas 4.218 Boardroom', building: 'ATL', archetype: 'BRD', w: 6.2, d: 9.6, reference: true, positions: referencePositions() },
  { id: 'R-ATL-4-220', name: 'Atlas 4.220 Huddle', building: 'ATL', archetype: 'HUD', w: 3.6, d: 3.0, reference: false, positions: [
    { pa: 'PA-0201', asset: 'A-0201', cat: 'bar', label: 'Video bar', x: 1.8, y: 0.15, networked: true },
    { pa: 'PA-0202', asset: 'A-0202', cat: 'compute', label: 'UC room compute', x: 2.6, y: 0.3, networked: true },
  ] },
  { id: 'R-ATL-4-231', name: 'Atlas 4.231 Training', building: 'ATL', archetype: 'TRN', w: 10.5, d: 8.0, reference: false, positions: [
    { pa: 'PA-0301', asset: 'A-0301', cat: 'projector', label: 'Projector', x: 5.2, y: 4.0, networked: false },
    { pa: 'PA-0302', asset: 'A-0302', cat: 'control', label: 'Control processor', x: 10.1, y: 0.5, networked: true },
  ] },
  { id: 'R-NST-2-101', name: 'Northstar Town Hall', building: 'NST', archetype: 'TWN', w: 18, d: 14, reference: false, positions: [] },
];
export const roomOf = (id: string) => ROOMS.find((r) => r.id === id) || null;

export type Provenance = 'KNOWN' | 'INFERRED' | 'SIMULATED';
export const PROVENANCE_TEXT: Record<Provenance, string> = {
  KNOWN: 'Known: read from a record or the synthetic collector export',
  INFERRED: 'Inferred: concluded from other records, not observed',
  SIMULATED: 'Simulated: produced by the scan replay, not measured by an instrument',
};
export interface Finding { id: string; step: number; pa: string | null; text: string; provenance: Provenance; source: string }

/** The scan findings for a room, in sweep order (step 0–60). Deterministic; nothing is measured, so nothing says "measured". */
export function findingsOf(roomId: string): Finding[] {
  const r = roomOf(roomId); if (!r) return [];
  const f: Finding[] = [];
  r.positions.forEach((p, i) => {
    const step = Math.round(((i + 1) / (r.positions.length + 1)) * 50);
    f.push({ id: `${r.id}:${p.pa}:id`, step, pa: p.pa, provenance: 'KNOWN', source: 'installation record', text: `${p.label} at ${p.pa} is asset ${p.asset}${p.networked ? ', on access switch ATL-4A (port table, synthetic collector export 2026-10-28)' : ''}` });
    if (p.cat === 'micceil') f.push({ id: `${r.id}:${p.pa}:level`, step: step + 4, pa: p.pa, provenance: 'SIMULATED', source: 'scan replay', text: 'Speech test level at the microphone sits 6 dB under its commissioned value (scan replay figure; no instrument was used)' });
    if (p.cat === 'dsp') f.push({ id: `${r.id}:${p.pa}:aec`, step: step + 3, pa: p.pa, provenance: 'INFERRED', source: 'incident history + design', text: 'Echo cancellation reference likely follows the wrong output after the last re-tune (inferred from ISS-0380 and ISS-0417; not observed)' });
    if (p.cat === 'camera' && (!r.reference || p.pa === SWAP.pa)) f.push({ id: `${r.id}:${p.pa}:preset`, step: step + 2, pa: p.pa, provenance: 'SIMULATED', source: 'scan replay', text: 'Preset 1 frames the table within the policy window (pan +4°, tilt −6°); the viewing-distance exception EXC-4218-01 is still a proposal' });
  });
  if (!r.positions.length) f.push({ id: `${r.id}:none`, step: 10, pa: null, provenance: 'KNOWN', source: 'room record', text: 'No device positions are recorded for this room yet: the scan has nothing to observe, and says so' });
  return f.sort((a, b) => a.step - b.step);
}
