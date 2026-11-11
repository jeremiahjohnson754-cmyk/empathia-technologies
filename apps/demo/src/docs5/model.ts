/**
 * Phase 5 in the demonstration: the room profile and context that @empathia/proof-registry's documentation rules read, derived from the
 * room's own record; who may do what; and the one tracked room, Atlas 4.218, whose seeded history is generated from its record so that
 * every reference in it is one of the room's own positions or one of its dossier's evidence records.
 *
 * Only the room of the commissioning dossier has a tracker. Every other room has its applicability (what would be required, and why),
 * which is a pure function of its record.
 */
import { DOSSIER_4218 as D, fixtureHistory, replay, type Actor, type DeliverableType, type DocAuthority, type DocContext, type DocSet, type RoomProfile, type Working } from '@empathia/proof-registry';
import { roomRecord, type RoomRecord } from '../campus/design.js';
import { ROLES } from '../access/policy.js';
import type { RoleKey } from '../registry.types.js';

import { DOC_ROLES } from './roles.js';
export { DOC_ROLES };
const has = (list: readonly RoleKey[], role: string) => (list as readonly string[]).includes(role);
/** The authority of a role, for the engine: it judges stored events by the role they name, not by who is looking. */
export const docPolicy = (role: string): DocAuthority => ({ assign: has(DOC_ROLES.assign, role), submit: has(DOC_ROLES.submit, role), review: has(DOC_ROLES.review, role), acknowledge: has(DOC_ROLES.acknowledge, role), recordVendor: has(DOC_ROLES.vendor, role) });
export const actorOf = (role: RoleKey): Actor => ({ role, label: ROLES[role].label });
/** A site champion reads what they are asked to acknowledge, and nothing else of the engineering record. */
export const mayRead = (role: RoleKey, acknowledgers: readonly Actor[]) => role !== 'sitechamp' || acknowledgers.some((a) => a.role === 'sitechamp');

const NETWORKED = new Set(['switch', 'compute', 'encoder', 'bar', 'scheduler']);
const PROGRAMMABLE = new Set(['dsp', 'compute', 'control', 'touch', 'switcher', 'encoder', 'bar', 'scheduler']);
const hw = (r: RoomRecord) => r.positions.filter((p) => !p.furniture);
/** What the rules need to know about a room, read from its record. Rooms of the demonstration are installed by the organisation's own
 *  installer (every installation on record says so), so no room here is vendor-installed. */
export function profileOf(r: RoomRecord): RoomProfile {
  const h = hw(r); const cats = new Set(h.map((p) => p.cat)); const seats = r.outline.capacity;
  return { roomId: r.outline.id, name: r.outline.name, size: seats <= 6 ? 'huddle' : seats <= 20 ? 'meeting' : seats <= 80 ? 'large' : 'venue', seats, devices: h.length,
    hasDsp: cats.has('dsp'), hasCameras: cats.has('camera') || cats.has('bar'), hasNetwork: r.connections.some((c) => c.kind === 'network') || h.some((p) => NETWORKED.has(p.cat)),
    hasControl: cats.has('control') || cats.has('touch'), hasRack: cats.has('rack'), hasProgrammable: h.some((p) => PROGRAMMABLE.has(p.cat)), vendorInstalled: false };
}
/** The revision of the room record that documents are written against: the newest baseline's. */
export const revisionOf = (r: RoomRecord): number => Math.max(1, ...r.baselines.map((b) => b.revision || 0));
export const countsOf = (r: RoomRecord): Record<string, number> => { const out: Record<string, number> = {}; for (const p of hw(r)) out[p.catLabel.toLowerCase()] = (out[p.catLabel.toLowerCase()] || 0) + 1; return out; };
export function contextOf(r: RoomRecord, w: Working | null): DocContext {
  return { roomRevision: revisionOf(r), positions: hw(r).map((p) => p.code), counts: countsOf(r),
    evidence: w ? w.tests.filter((t) => t.evidence && !t.evidence.startsWith(DOC_EVIDENCE)).map((t) => t.evidence!) : [],   // a document recorded as a test's evidence is not something the packet must contain: it would have to contain itself
    tests: w ? w.tests.map((t) => ({ id: t.id, name: t.name, settled: t.result === 'PASS' && !!t.evidence && (!t.changed || !!t.verifiedBy) })) : [],
    deficiencies: w ? w.deficiencies.map((x) => ({ id: x.id, open: x.state !== 'CLOSED' })) : [] };
}

/** the evidence reference a document takes when it is recorded on the dossier as a test's evidence */
export const DOC_EVIDENCE = 'DOC-'; export const evidenceIdOf = (t: DeliverableType, revision: number) => `${DOC_EVIDENCE}${t}-r${revision}`;
export const TRACKED_ROOM = D.room.id; export const TRACKED_REPORT = D.id;
/** The dossier's tests that stand for a document: that test is the document's single gate at acceptance. */
export const REPRESENTS: Partial<Record<DeliverableType, string>> = { signal_flow: 'T-SIM-025', config_backup: 'T-SIM-026', asset_list: 'T-SIM-027', training_materials: 'T-SIM-028', commissioning_results: 'T-SIM-016' };
export const testOfDoc = (t: DeliverableType): string | null => REPRESENTS[t] ?? null;
export const docOfTest = (id: string): DeliverableType | null => (Object.entries(REPRESENTS).find(([, v]) => v === id)?.[0] as DeliverableType | undefined) ?? null;

let cached: { set: DocSet; record: RoomRecord } | null = null;
/**
 * The documentation of Atlas 4.218 as the reference report describes it (SIM-REPORT-2026-11-08-001): the signal flow drawing issued, the
 * configuration backup stored with its checksum, the asset list matching the register, the operator guide issued with one
 * acknowledgement outstanding, and the commissioning results returned for the missing camera preset verification (DEF-SIM-002).
 * Everything else the room needs is on file. Synthetic: no file exists behind any of it.
 */
export function trackedSet(): { set: DocSet; record: RoomRecord } | null {
  if (cached) return cached; const record = roomRecord(TRACKED_ROOM); if (!record) return null;
  const profile = profileOf(record); const ctx = contextOf(record, replay(D, []));
  const a = (k: RoleKey) => actorOf(k);
  const history = fixtureHistory(profile, ctx, { reviewer: a('qa'), assigner: a('ipm'), from: '2026-10-20T09:00:00Z', represents: REPRESENTS,
    actors: { designer: a('designer'), syseng: a('syseng'), installer: a('installer'), cxeng: a('cxeng'), svcmgr: a('svcmgr'), ipm: a('ipm') },
    hold: { commissioning_results: { packetWithout: ['EV-SIM-016'], correction: 'The final camera preset verification (T-SIM-016) is missing from the packet. See DEF-SIM-002.' }, training_materials: { acknowledgedBy: ['ops'] } } });
  cached = { set: { id: TRACKED_REPORT, profile, represents: REPRESENTS, history }, record };
  return cached;
}

export const STATE_WORD: Record<string, { label: string; tone: 'ok' | 'warn' | 'bad' | 'info' | 'muted' }> = {
  NOT_APPLICABLE: { label: 'Does not apply', tone: 'muted' }, NOT_STARTED: { label: 'Not started', tone: 'bad' }, ASSIGNED: { label: 'Assigned', tone: 'warn' }, SUBMITTED: { label: 'Awaiting review', tone: 'info' },
  CORRECTION_REQUESTED: { label: 'Correction requested', tone: 'bad' }, ACCEPTED: { label: 'Accepted', tone: 'ok' }, OUTDATED: { label: 'Outdated', tone: 'bad' },
};
export const bytes = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} kB` : `${n} bytes`);
