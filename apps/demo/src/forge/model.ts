/**
 * Empathia FORGE — Room-as-Code (Enterprise 3.0 directive 1, capability 1; journey J3). FORGE compiles a room's approved design record
 * into versioned, reviewable engineering artefacts. It writes nothing of its own: the schema, the bill of materials, the signal paths,
 * the installation list, the acceptance plan and the as-built register are each derived, when the page is opened, from the room's
 * record in Core (campus/design.ts), the same one Lite, Commissioning and Assurance read.
 *
 * The line FORGE does not cross: device configuration. Configuration is generated only for an approved catalogue model that has a
 * vendor-verified capability pack. This estate records every unit as a class template ("spec to verify"), never an invented make or
 * model, and no capability pack exists, so every configuration target is REJECTED, by name, with the reason. FORGE holds no vendor
 * command and invents none. Approval needs a second person: the Designer who prepares a revision cannot approve it. Approval is kept
 * in this browser. No React: the unit suite runs it.
 */
import type { RoleKey } from '../registry.types.js';
import { roomRecord, type RoomRecord } from '../campus/design.js';
import { fullName } from '../campus/canon.js';
import type { EvidenceState } from '../voice/model.js';

export type ArtifactStatus = 'COMPILED' | 'COMPILED_WITH_GAPS' | 'REJECTED' | 'NOT_AVAILABLE';
export const STATUS_WORD: Record<ArtifactStatus, string> = { COMPILED: 'Compiled', COMPILED_WITH_GAPS: 'Compiled, with gaps', REJECTED: 'Rejected', NOT_AVAILABLE: 'Not available' };
export interface Artifact { id: string; title: string; status: ArtifactStatus; basis: EvidenceState; says: string; lines: string[]; href?: string; hrefLabel?: string }
export interface ConfigTarget { position: string; label: string; device: string; status: 'REJECTED'; why: string }
export interface Package { roomId: string; roomName: string; /** false: the design record holds no equipment, so there is nothing to compile, review or approve */ designed: boolean; revision: number; previous: number | null; fingerprint: string; artifacts: Artifact[]; configs: ConfigTarget[]; findings: Array<{ title: string; severity: string; says: string }>; blockers: number; changes: string[]; rollback: string }

/** Categories whose units take configuration. Each needs a verified capability pack for its exact model before FORGE generates anything. */
const CONFIGURABLE = ['dsp', 'switcher', 'compute', 'control', 'touch', 'scheduler', 'switch', 'camera', 'bar', 'display', 'ledwall', 'projector', 'encoder', 'amp', 'micwireless'];
/** Capability packs that have been verified with a vendor. None: the list is here so the page states the truth from one place. */
export const CAPABILITY_PACKS: ReadonlyArray<{ model: string; verifiedBy: string }> = [];
/** FNV-1a over the canonical schema: a content fingerprint for telling two revisions apart. Not a signature and not a security hash. */
export function fingerprint(text: string): string { let h = 0x811c9dc5; for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }
const schemaOf = (r: RoomRecord) => ({ room: r.outline.id, template: r.design.template, dims: r.outline.dims, positions: r.positions.map((p) => [p.code, p.cat, p.x, p.y, p.z, p.rot, p.mount]), connections: r.connections.map((c) => [c.id, c.from, c.to, c.kind]) });

export function compile(roomId: string): Package | null {
  const r = roomRecord(roomId); if (!r) return null;
  const units = r.positions.filter((p) => !p.furniture); const latest = [...r.baselines].sort((a, b) => b.revision - a.revision)[0]; const current = r.baselines.find((b) => b.state === 'CURRENT');
  const revision = latest?.revision ?? 1; const previous = current && current.revision !== revision ? current.revision : null;
  const byCat = new Map<string, number>(); for (const p of units) byCat.set(p.catLabel, (byCat.get(p.catLabel) || 0) + 1);
  const installed = units.filter((p) => p.asset).length; const proposed = r.connections.filter((c) => c.state === 'PROPOSED').length;
  const high = r.findings.filter((f) => f.severity === 'High'); const none = units.length === 0;
  const empty = (id: string, title: string): Artifact => ({ id, title, status: 'NOT_AVAILABLE', basis: 'UNKNOWN', says: 'The design record holds no equipment positions, so there is nothing to derive this from.', lines: [] });
  const artifacts: Artifact[] = none ? [
    { id: 'schema', title: 'Room schema', status: 'COMPILED_WITH_GAPS', basis: 'DECLARED', says: `Geometry only: ${r.outline.dims[0].toFixed(2)} × ${r.outline.dims[1].toFixed(2)} m. No equipment has been designed for this room.`, lines: [`Geometry: ${r.geometryProvenance}`], href: `#/lite/room/${roomId}`, hrefLabel: 'Design the room in Lite' },
    empty('bom', 'Bill of materials'), empty('paths', 'Signal and network paths'), empty('install', 'Installation package'), empty('acceptance', 'Acceptance plan'), empty('asbuilt', 'As-built register'),
  ] : [
    { id: 'schema', title: 'Room schema', status: 'COMPILED', basis: 'DECLARED', says: `Revision ${revision} of the design record: ${r.outline.dims[0].toFixed(2)} × ${r.outline.dims[1].toFixed(2)} m, ${units.length} equipment positions, ${r.connections.length} connections.`,
      lines: [`Template ${r.design.template}`, `Geometry: ${r.geometryProvenance}`], href: `#/lite/room/${roomId}`, hrefLabel: 'The room in Lite' },
    { id: 'bom', title: 'Bill of materials', status: 'COMPILED_WITH_GAPS', basis: 'DECLARED', says: `${units.length} lines in ${byCat.size} categories. Every line is a class template: no approved catalogue model is selected, so this is a list of what is needed, not an order.`,
      lines: [...byCat].map(([k, n]) => `${n} × ${k} (class template; specification to verify)`) },
    { id: 'paths', title: 'Signal and network paths', status: proposed ? 'COMPILED_WITH_GAPS' : 'COMPILED', basis: 'MODELED', says: `${r.connections.length} connections from the design record${proposed ? `; ${proposed} are still proposed and have not been confirmed on site` : ''}.`,
      lines: r.connections.slice(0, 6).map((c) => `${c.id}: ${c.from} → ${c.to} (${c.kind}; ${(c.state || 'state not recorded').toLowerCase()})`).concat(r.connections.length > 6 ? [`and ${r.connections.length - 6} more`] : []) },
    { id: 'install', title: 'Installation package', status: 'COMPILED', basis: 'DECLARED', says: `${units.length} positions with mount and coordinates, for the installer.`, lines: units.slice(0, 4).map((p) => `${p.code} ${p.label}: ${p.mount}, x ${p.x.toFixed(2)} m, y ${p.y.toFixed(2)} m`).concat(units.length > 4 ? [`and ${units.length - 4} more`] : []) },
    { id: 'acceptance', title: 'Acceptance plan', status: 'COMPILED', basis: 'DECLARED', says: `${r.counts.applicable} tests apply to this room, chosen by the commissioning engine from its purpose and equipment. ${r.counts.verified} are verified today.`,
      lines: [`Recorded ${r.counts.recorded}; awaiting ${r.counts.awaiting}; failed ${r.counts.failed}; not tested ${r.counts.notTested}`], href: `#/commissioning/room/${roomId}`, hrefLabel: 'The room’s commissioning record' },
    { id: 'asbuilt', title: 'As-built register', status: installed === units.length ? 'COMPILED' : installed ? 'COMPILED_WITH_GAPS' : 'NOT_AVAILABLE', basis: installed ? 'DECLARED' : 'UNKNOWN',
      says: installed ? `${installed} of ${units.length} positions have an installed asset on record. Identity of every unit is still to be verified on site.` : 'Nothing is recorded as installed.', lines: units.filter((p) => p.asset).slice(0, 4).map((p) => `${p.code}: ${p.asset} (identity ${p.identity.toLowerCase()})`) },
  ];
  const configs: ConfigTarget[] = units.filter((p) => CONFIGURABLE.includes(p.cat)).map((p) => ({ position: p.code, label: p.label, device: p.device, status: 'REJECTED' as const,
    why: 'This unit is a class template, not an approved catalogue model, and no vendor-verified capability pack exists for it. FORGE generates no configuration and no command for it.' }));
  const changes = r.installations.filter((i) => i.removedAt).map((i) => { const next = r.installations.find((x) => x.position === i.position && !x.removedAt); return `${i.position}: ${i.asset} replaced${next ? ` by ${next.asset}` : ''} (${i.removalReason || i.reason})`; });
  return { roomId, roomName: fullName(r.outline), designed: !none, revision, previous, fingerprint: fingerprint(JSON.stringify(schemaOf(r))), artifacts, configs,
    findings: r.findings.map((f) => ({ title: f.title, severity: f.severity, says: f.rationale })), blockers: high.length, changes,
    rollback: previous ? `Revision ${previous} is the accepted baseline (version ${current!.version}) and stays current. Approving revision ${revision} here does not replace it; acceptance in Commissioning does.` : `Revision ${revision} is the room’s only revision; there is nothing earlier to return to.` };
}
/** Rooms the overview offers: the reference room (two revisions), an accepted room, and a room with no equipment designed, where FORGE compiles nothing and says so. */
export const FORGE_ROOMS = ['R-ATL-4-218', 'R-NST-2-101', 'R-EGT-1-150'] as const;

export interface Approval { roomId: string; revision: number; fingerprint: string; by: RoleKey; at: string }
const KEY = 'empathia.demo.forge.v1';
export function loadApprovals(): Approval[] { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]') as Approval[]; return Array.isArray(v) ? v.filter((a) => a && typeof a.roomId === 'string' && typeof a.fingerprint === 'string') : []; } catch { return []; } }
export const AUTHOR: RoleKey = 'designer';
/** May this role approve this package now? The rule, with its reasons, in one place for the page and the unit suite. */
export function mayApprove(by: RoleKey, p: Package, approver: readonly string[]): { ok: boolean; why: string } {
  if (by === AUTHOR) return { ok: false, why: 'The Designer prepares the revision and cannot approve it. Approval needs a second person.' };
  if (!approver.includes(by)) return { ok: false, why: 'Approval is given by the Commissioning Engineer or the Product Architect.' };
  if (!p.designed) return { ok: false, why: 'There is nothing to approve: the room’s design record holds no equipment.' };
  if (p.blockers) return { ok: false, why: `${p.blockers} high-severity design finding${p.blockers === 1 ? '' : 's'} must be resolved or formally excepted first.` };
  return { ok: true, why: 'Approves the compiled artefacts of this exact revision. Rejected configuration targets stay rejected.' };
}
export function approve(by: RoleKey, p: Package): Approval[] { const all = [{ roomId: p.roomId, revision: p.revision, fingerprint: p.fingerprint, by, at: new Date().toISOString() }, ...loadApprovals().filter((a) => !(a.roomId === p.roomId && a.revision === p.revision))]; try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* lasts the page */ } return all; }
/** An approval counts only for the exact content it was given for: a changed schema has a different fingerprint and is unapproved again. */
export const approvalOf = (all: Approval[], p: Package): Approval | undefined => all.find((a) => a.roomId === p.roomId && a.revision === p.revision && a.fingerprint === p.fingerprint);
