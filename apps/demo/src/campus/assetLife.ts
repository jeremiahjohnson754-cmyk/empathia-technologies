/**
 * One asset's life, end to end (founder, 14 Nov 2026: "asset ID is one of the most crucial pieces to how you connect everything end to
 * end … a replaced device/asset ID must be removed from the asset inventory but the record of that identifier must never be used again
 * but be fully remembered").
 *
 * The asset ID (AS-…) is the physical unit; the device ID (PA-…) is the position it is installed at. This joins, by the asset ID alone,
 * everything the demonstration's records hold about one unit: where and when it was installed and by whom, what the installation team
 * registered for it (serial, hostname, address, firmware), which accepted baselines it was part of, the room issues at its position while
 * it was there, every service job raised against it (with vendor and SLA), and — if it was taken out — when, why, and the unit that
 * replaced it. A retired asset ID stays findable here forever and is never shown as available.
 *
 * Synthetic: the rooms, installations and service history are the demonstration's seeded records; register values are what a person
 * typed into this browser. Nothing here contacts a device.
 */
import { allRecords, type RoomRecord, type Installation, type Position } from './design.js';
import { fullName } from './canon.js';
import type { DeviceEntry } from './registers.js';
import { SLA_HOURS, type ServiceJob } from '../service/history.js';
import { restoreHours, restoredInSla } from '../service/analytics.js';

export const ASSET_RE = /^AS-\d{4}$/;
export interface AssetHit { code: string; room: RoomRecord; inst: Installation; position: Position | null; current: boolean; replacedBy: string | null; replaced: string | null }
export type StopKind = 'installed' | 'registered' | 'baseline' | 'issue' | 'service' | 'retired' | 'replaced';
export interface Stop { at: string; kind: StopKind; title: string; detail: string; by?: string; tone: 'ok' | 'warn' | 'bad' | 'muted' | 'info'; href?: string }

let index: Map<string, { room: string; i: number }> | null = null;
function idx() {
  if (index) return index; index = new Map();
  for (const r of allRecords()) r.installations.forEach((x, i) => { if (!index!.has(x.asset)) index!.set(x.asset, { room: r.outline.id, i }); });
  return index;
}
/** every asset ID the estate's records have ever used, current or retired (never to be issued again) */
export const allAssetCodes = () => [...idx().keys()].sort();

export function findAsset(code: string): AssetHit | null {
  const k = code.trim().toUpperCase(); const at = idx().get(k); if (!at) return null;
  const room = allRecords().find((r) => r.outline.id === at.room)!; const inst = room.installations[at.i]!;
  const position = room.positions.find((p) => p.code === inst.position) || null;
  const next = inst.removedAt ? room.installations.find((x) => x.position === inst.position && x.installedAt === inst.removedAt && x !== inst) || null : null;
  const prev = room.installations.find((x) => x.position === inst.position && x.removedAt === inst.installedAt && x !== inst) || null;
  return { code: k, room, inst, position, current: !inst.removedAt, replacedBy: next?.asset ?? null, replaced: prev?.asset ?? null };
}

const roomHref = (r: RoomRecord) => `#/commissioning/room/${r.outline.id}`;
/** the stops of one asset's life, oldest first */
export function lifeOf(hit: AssetHit, jobs: ServiceJob[], entry: DeviceEntry | null): Stop[] {
  const { room: r, inst } = hit; const out: Stop[] = []; const from = Date.parse(inst.installedAt); const to = inst.removedAt ? Date.parse(inst.removedAt) : Infinity;
  const where = `${hit.position?.label || inst.position} (${inst.position}) in ${fullName(r.outline)}`;
  out.push({ at: inst.installedAt, kind: 'installed', title: hit.replaced ? `Installed, replacing ${hit.replaced}` : 'Installed', detail: `${where}. ${inst.basis}.`, by: inst.by, tone: 'info', href: roomHref(r) });
  if (entry && hit.current) out.push({ at: entry.at, kind: 'registered', title: 'Registered by the installation team', detail: [entry.serial && `serial ${entry.serial}`, entry.hostname && `hostname ${entry.hostname}`, entry.ip && `IP ${entry.ip}`, entry.firmware && `firmware ${entry.firmware}`, entry.location && `at ${entry.location}`].filter(Boolean).join(' · ') || 'an entry with no fields yet', by: entry.by, tone: 'ok', href: roomHref(r) });
  for (const b of r.baselines) { const t = Date.parse(b.at); if (t >= from && t < to) out.push({ at: b.at, kind: 'baseline', title: `In baseline v${b.version} (${b.state.toLowerCase().replace(/_/g, ' ')})`, detail: b.note, by: b.by || undefined, tone: b.state === 'CURRENT' ? 'ok' : 'muted', href: roomHref(r) }); }
  for (const j of jobs.filter((x) => x.asset === hit.code)) {
    const h = restoreHours(j); const sla = SLA_HOURS[j.severity];
    out.push({ at: j.openedAt, kind: 'service', title: `Service ${j.id}: ${j.kind} (${j.severity})`, detail: `${j.vendorName}${j.agreement ? ` under ${j.agreement}` : ' (no agreement covers it)'} · ${h === null ? 'not restored yet' : `restored in ${Math.round(h)} h against ${sla.restore} h`}${j.reopened ? ' · reopened' : ''}${j.source === 'synthetic-history' ? ' · synthetic history' : ''}`, tone: h === null ? 'warn' : restoredInSla(j) ? 'ok' : 'bad', href: j.source === 'workspace' ? `#/v25/service?id=${j.id}` : `#/v25/service/analytics?v=${j.vendor}` });
  }
  if (inst.removedAt) {
    out.push({ at: inst.removedAt, kind: 'retired', title: `Retired: ${(inst.removalReason || 'removed').toLowerCase()}`, detail: `Out of the inventory. ${hit.code} stays on record with this history and is never issued again.`, tone: 'muted', href: roomHref(r) });
    if (hit.replacedBy) out.push({ at: inst.removedAt, kind: 'replaced', title: `Replaced by ${hit.replacedBy}`, detail: `The position ${inst.position} now holds ${hit.replacedBy}; the tests the swap touches are reopened on the room's record.`, tone: 'info', href: `#/v25/asset?a=${hit.replacedBy}` });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
/** the room issues at the asset's position (the record carries no issue dates, so these are listed beside the timeline, not on it) */
export const issuesAt = (hit: AssetHit) => hit.room.issues.filter((i) => i.positions.includes(hit.inst.position));
