/**
 * Core Replay: a room's life as stages in lifecycle order, each standing on a record and saying how sure it is (recorded, inferred or
 * reconstructed, not yet, not held). Built read-only from the demonstration workspace and the engine-judged design; building it never
 * writes anything. The reference room carries the approved post-change state (PA-0007: AS-0097 → AS-0112; baseline v2 current, v1
 * preserved): the tests the replacement reopens are the engine's applicable tests that name that position — never a hand-typed list.
 */
import type * as S from '../workspace/store.js';
import { roomOf, referenceDesign, SWAP, type RoomRec } from '../fi/rooms.js';
import { roomRecord, type RoomRecord } from '../campus/design.js';
import { buildingByKey } from '../campus/canon.js';

export type StageStatus = 'recorded' | 'modeled' | 'archive' | 'ahead' | 'none';
export const STATUS_TEXT: Record<StageStatus, string> = { recorded: 'Recorded', modeled: 'Modeled (designed from a template, not surveyed)', archive: 'Inferred or reconstructed', ahead: 'Not yet', none: 'Not held in this demonstration' };
export interface Stage { key: string; label: string; at: string | null; status: StageStatus; title: string; detail: string; ids: string[]; focus: string[]; assetAt: Record<string, string>; baseline: number | null }

const D = (s: string) => new Date(s).toISOString();
const ago = (days: number) => new Date(Date.now() - days * 864e5).toISOString();   // the post-change dates sit relative to the workspace's own incident dates
/** The tests the like-for-like replacement at PA-0007 reopens: applicable tests that name the position. */
export function reopenedBySwap() { const r = referenceDesign(); return { applicable: r.rows.length, reopened: r.rows.filter((x) => x.devices.includes(SWAP.pa)) }; }

export function stagesOf(roomId: string, w: Pick<S.Workspace, 'incidents' | 'workOrders'>): Stage[] {
  const room = roomOf(roomId); if (!room) return [];
  const incs = w.incidents.filter((i) => i.roomId === roomId).sort((a, b) => a.openedAt.localeCompare(b.openedAt));
  const before = Object.fromEntries(room.positions.map((p) => [p.pa, p.pa === SWAP.pa && room.reference ? SWAP.from : p.asset]));
  const after = Object.fromEntries(room.positions.map((p) => [p.pa, p.asset]));
  const st = (o: Partial<Stage> & Pick<Stage, 'key' | 'label' | 'status' | 'title' | 'detail'>): Stage => ({ at: null, ids: [], focus: [], assetAt: before, baseline: null, ...o });
  const out: Stage[] = [];
  if (room.reference) {
    const r = reopenedBySwap();
    out.push(st({ key: 'request', label: 'Request', at: D('2025-02-10'), status: 'recorded', title: 'A boardroom for hybrid board meetings', detail: 'Requested by the board office for fourteen people, with remote directors on every call.', ids: ['REQ-0218'] }));
    out.push(st({ key: 'requirements', label: 'Requirements', at: D('2025-02-24'), status: 'recorded', title: '9 requirements, 6 of them must-have', detail: 'Every seat heard and seen at the far end; one-touch join; the room usable by a guest without help.', ids: ['REQ-0218'] }));
    out.push(st({ key: 'design', label: 'Design', at: D('2025-04-02'), status: 'recorded', title: `Boardroom template at 6.2 × 9.6 m: ${room.positions.length} device positions`, detail: `The commissioning engine judges ${r.applicable} tests applicable to this design.`, ids: ['DSN-0218-r3'], focus: room.positions.map((p) => p.pa) }));
    out.push(st({ key: 'evaluation', label: 'Evaluation', status: 'archive', at: D('2025-04-20'), title: 'Devices scored against the requirement', detail: 'Reconstructed from the design notes; the scoring sheet itself is not held.', ids: [] }));
    out.push(st({ key: 'budget', label: 'Budget', at: D('2025-05-06'), status: 'recorded', title: 'Costed estimate approved', detail: 'A rough order of magnitude first, then a costed estimate. Figures are synthetic and not a quote.', ids: ['BUD-0218'] }));
    out.push(st({ key: 'build', label: 'Build', at: D('2025-07-14'), status: 'recorded', title: `${room.positions.length} devices installed`, detail: `Front camera position ${SWAP.pa} installed with physical asset ${SWAP.from}.`, ids: ['PRJ-0218-BUILD'], focus: [SWAP.pa] }));
    out.push(st({ key: 'commissioning', label: 'Commissioning', at: D('2025-08-04'), status: 'recorded', title: `${r.applicable} applicable tests recorded and independently verified`, detail: 'Each result recorded by its responsible role and verified by another.', ids: ['CX-0218-v1'] }));
    out.push(st({ key: 'baseline1', label: 'Baseline v1', at: D('2025-08-11'), status: 'recorded', title: 'Baseline v1 accepted', detail: 'What the room was proven to do. Everything later is compared with it; it is never overwritten.', ids: ['BL-4-218-v1'], baseline: 1 }));
    const echo = incs.find((i) => i.id === 'ISS-0380');
    if (echo) out.push(st({ key: 'issue1', label: 'Issue', at: echo.openedAt, status: 'recorded', title: `${echo.id}: ${echo.title}`, detail: `${echo.summary} State ${echo.state}.`, ids: [echo.id], focus: ['PA-0013'], baseline: 1 }));
    out.push(st({ key: 'change', label: 'Unit replaced', at: ago(30), status: 'recorded', title: `Front camera ${SWAP.from} replaced by ${SWAP.to} (${SWAP.model})`, detail: `The position ${SWAP.pa} stays; the physical asset changes. ${SWAP.from}'s own history stays with it. The replacement reopens ${r.reopened.length} of ${r.applicable} tests: the ones that name ${SWAP.pa}.`, ids: [SWAP.pa, SWAP.to], focus: [SWAP.pa], assetAt: after, baseline: 1 }));
    out.push(st({ key: 'reverify', label: 'Reverification', at: ago(27), status: 'recorded', title: `${r.reopened.length} reopened tests executed again and independently verified`, detail: 'The earlier PASS_VERIFIED results on the removed unit are kept as history and never count toward the replacement’s acceptance.', ids: r.reopened.slice(0, 4).map((x) => x.id), focus: [SWAP.pa], assetAt: after, baseline: 1 }));
    out.push(st({ key: 'baseline2', label: 'Baseline v2', at: ago(25), status: 'recorded', title: 'Baseline v2 current; v1 preserved', detail: `v2 records ${SWAP.to} at ${SWAP.pa}. Changing the camera's model would be a detectable deviation from both baselines.`, ids: ['BL-4-218-v2', 'BL-4-218-v1'], assetAt: after, baseline: 2 }));
    out.push(st({ key: 'exception', label: 'Exception', at: ago(14), status: 'archive', title: 'EXC-4218-01: viewing distance — proposed, pending approval', detail: 'Not a valid acceptance until the source requirement permits an exception and an authorized independent reviewer approves it with evidence, rationale, scope and revision binding.', ids: ['EXC-4218-01'], focus: ['PA-0005', 'PA-0006'], assetAt: after, baseline: 2 }));
  } else {
    out.push(st({ key: 'request', label: 'Request', status: 'none', title: 'Not held', detail: `${room.name} was in use before this record began. Nothing has been made up to fill the gap.` }));
    out.push(st({ key: 'build', label: 'Build', status: 'archive', at: D('2024-11-04'), title: `${room.positions.length || 'No'} device position${room.positions.length === 1 ? '' : 's'} on record`, detail: 'Reconstructed from the installation records; the original design is not held.', focus: room.positions.map((p) => p.pa) }));
  }
  for (const i of incs) {
    if (room.reference && i.id === 'ISS-0380') continue;
    const done = ['RESOLVED', 'CLOSED'].includes(i.state);
    out.push(st({ key: `inc-${i.id}`, label: done ? 'Issue and fix' : 'Open issue', at: i.openedAt, status: 'recorded', title: `${i.id}: ${i.title}`, detail: `${i.summary} Now ${i.state}${i.verifiedBy ? ', verified independently' : ''}.`, ids: [i.id, ...(i.workOrderId ? [i.workOrderId] : [])], assetAt: after, baseline: room.reference ? 2 : null }));
  }
  out.push(st({ key: 'next', label: 'Next', status: 'ahead', title: 'What has not happened yet', detail: room.reference ? 'The open issue is restored and verified; the exception is approved or withdrawn. Neither is shown as done.' : 'Commissioning against a baseline has not been recorded for this room.', assetAt: after, baseline: room.reference ? 2 : null }));
  return out;
}

// ---- every other campus room (18 Nov, D18-13: the map's room card offered Core Replay for all 140 rooms, but only the four rooms above
// had a replay; the rest landed on "Room not found"). A room's replay is built from its own canonical record (campus/design.ts): its
// design as modeled, its dated events, installations, removals and baselines in date order, its issues (undated: the record holds no
// date for them), and what blocks its next step. Nothing is made up to fill a gap: what the record does not hold is shown as not held.
/** the campus record as a room the replay page can draw (its device positions, in metres) */
export function recordRoom(id: string): RoomRec | null {
  const r = roomRecord(id); if (!r) return null; const o = r.outline;
  const live = (code: string) => r.installations.find((x) => x.position === code && !x.removedAt)?.asset || '—';
  return { id: o.id, name: `${buildingByKey(o.building)?.short || o.building} ${o.number} ${o.name}`, building: o.building as RoomRec['building'], archetype: o.archetype, w: o.dims[0], d: o.dims[1], reference: false,
    positions: r.positions.map((p) => ({ pa: p.code, asset: live(p.code), cat: p.cat, label: p.label, x: p.x, y: p.y, networked: false })) };
}
const human = (t: string) => t.replace(/[._]/g, ' ').replace(/\b\w/, (c) => c.toUpperCase());
export function stagesFromRecord(rec: RoomRecord): Stage[] {
  const after = Object.fromEntries(rec.positions.map((p) => [p.code, rec.installations.find((x) => x.position === p.code && !x.removedAt)?.asset || '—']));
  const st = (o: Partial<Stage> & Pick<Stage, 'key' | 'label' | 'status' | 'title' | 'detail'>): Stage => ({ at: null, ids: [], focus: [], assetAt: after, baseline: null, ...o });
  const o = rec.outline; const cur = rec.baselines.find((b) => b.state === 'CURRENT');
  const head: Stage[] = [st({ key: 'request', label: 'Request', status: 'none', title: 'Not held', detail: `The request for ${o.name} is not in this demonstration's records. Nothing has been made up to fill the gap.` }),
    st({ key: 'design', label: 'Design', status: o.kind === 'designed' ? 'modeled' : 'archive', title: `${rec.archetypeName} at ${o.dims[0]} × ${o.dims[1]} m: ${rec.positions.length} device position${rec.positions.length === 1 ? '' : 's'}`, detail: o.kind === 'designed' ? `Designed from the ${rec.archetypeName} template${rec.templateNote ? ` (${rec.templateNote})` : ''}: layout and devices are modeled, never surveyed.` : 'Reconstructed from the earlier records; the original design is not held.', focus: rec.positions.map((p) => p.code), ids: [o.id] })];
  const dated: Stage[] = [];
  rec.events.forEach((e, k) => dated.push(st({ key: `ev-${k}`, label: human(e.type), at: e.at, status: 'recorded', title: e.detail, detail: `By ${e.by}${e.outcome ? `; ${e.outcome === 'DENIED' ? 'refused' : 'allowed'}` : ''}${e.scenario ? `; scenario ${e.scenario}` : ''}.` })));
  const installs = new Map<string, number>(); rec.installations.forEach((x) => installs.set(x.installedAt.slice(0, 10), (installs.get(x.installedAt.slice(0, 10)) || 0) + 1));
  [...installs.entries()].forEach(([d, n], k) => dated.push(st({ key: `in-${k}`, label: 'Install', at: new Date(d).toISOString(), status: 'recorded', title: `${n} device${n === 1 ? '' : 's'} installed`, detail: 'From the installation records (position, asset, who, basis).', focus: rec.installations.filter((x) => x.installedAt.startsWith(d)).map((x) => x.position) })));
  rec.installations.filter((x) => x.removedAt).forEach((x, k) => dated.push(st({ key: `rm-${k}`, label: 'Unit removed', at: x.removedAt!, status: 'recorded', title: `${x.asset} removed from ${x.position}`, detail: `${x.removalReason || 'Reason not recorded'}. Its history stays with the asset.`, focus: [x.position], ids: [x.asset, x.position] })));
  rec.baselines.forEach((b) => dated.push(st({ key: `bl-${b.version}`, label: `Baseline v${b.version}`, at: b.at, status: b.state === 'PENDING_ACCEPTANCE' ? 'ahead' : 'recorded', title: `Baseline v${b.version} ${b.state === 'CURRENT' ? 'current' : b.state === 'SUPERSEDED' ? 'superseded (preserved)' : 'pending acceptance'}`, detail: b.note, baseline: b.version })));
  dated.sort((a, b) => (a.at || '').localeCompare(b.at || ''));
  const tail: Stage[] = rec.issues.map((i) => st({ key: `is-${i.id}`, label: i.state === 'RESOLVED' ? 'Issue and fix' : 'Open issue', status: 'recorded', title: `${i.id}: ${i.title}`, detail: `${i.severity} severity, ${i.state.toLowerCase().replace('_', ' ')}; found by ${i.source}. The record holds no date for it.`, focus: i.positions, ids: [i.id], baseline: cur?.version ?? null }));
  tail.push(st({ key: 'next', label: 'Next', status: 'ahead', title: rec.nextStep ? `Next: ${rec.nextStep.to.toLowerCase().replace(/_/g, ' ')}` : 'Where the record ends', detail: rec.nextStep?.blockers.length ? `Blocked until: ${rec.nextStep.blockers.join('; ')}.` : 'Nothing further is recorded for this room yet.', baseline: cur?.version ?? null }));
  return [...head, ...dated, ...tail];
}
