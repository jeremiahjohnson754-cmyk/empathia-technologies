/**
 * Device standards (the Pro register's PRO-EN-01, V2.5.3 #/pro/eng): for each device class, the approved model, the firmware baseline and
 * the service life; and the firmware posture of every installed unit against its standard (PRO-AS-03: on baseline, behind it, or not
 * validated).
 *
 * Synthetic, and said so wherever it is shown: the model designations and firmware versions are invented for this demonstration and name
 * no real product or manufacturer. A baseline is either approved (by the engineering review named, on the date given) or proposed and not
 * yet approved; a proposed baseline validates nothing.
 *
 * One rule decides each unit's posture, and "not validated" is never counted as on baseline:
 *   - no standard for its class      → flagged, outside the posture (every installed unit maps to one standard or is flagged)
 *   - its standard carries no firmware (a loudspeaker, a rack) → no firmware, outside the posture
 *   - the baseline is proposed       → not validated
 *   - no installed version on record → not validated
 *   - a version that is not plain numbers, or newer than the baseline → not validated (nothing approved it)
 *   - older than the baseline        → behind;  the same version → on baseline
 * The installed version is the one the installation team recorded in this browser's device register when there is one, otherwise the one
 * the room's synthetic commissioning record carries (accepted and operational rooms only: a room still in commissioning has none yet).
 * The service life is not kept here: it is the refresh plan's planning assumption for the class (refresh/plan.ts lifeOf), one source.
 */
import { allRecords, C, type RoomRecord } from '../campus/design.js';

export type BaselineState = 'approved' | 'proposed';
export interface FirmwareBaseline { version: string; previous: string; state: BaselineState; by: string; at: string }
export interface DeviceStandard { cat: string; id: string; model: string; firmware: FirmwareBaseline | null; note: string }

export const STANDARDS_BASIS = 'synthetic standards: the model designations and firmware versions are invented for this demonstration and name no real product';
const REVIEW = 'Systems engineering review';
const fw = (version: string, previous: string, at: string, state: BaselineState = 'approved'): FirmwareBaseline => ({ version, previous, state, by: state === 'approved' ? REVIEW : 'proposed by systems engineering, awaiting the review', at });
const std = (cat: string, code: string, firmware: FirmwareBaseline | null, note = ''): DeviceStandard => ({ cat, id: `STD-${code}`, model: `Class standard ${code}-S1`, firmware, note });

/** The classes with a standard. Not here, so flagged when installed: the projector (a legacy class, replaced by displays) and the
 * facilities and security classes (lighting, occupancy sensors, security cameras, IoT, HVAC), which other teams' standards govern. */
export const DEVICE_STANDARDS: readonly DeviceStandard[] = [
  std('display', 'DIS', fw('3.4.2', '3.3.9', '2026-08-04')),
  std('ledwall', 'LED', fw('2.1.0', '2.0.6', '2026-06-19')),
  std('camera', 'CAM', fw('5.2.1', '5.1.4', '2026-09-02')),
  std('bar', 'VBR', fw('4.0.3', '3.9.8', '2026-07-21')),
  std('micceil', 'MCL', fw('1.8.0', '1.7.2', '2026-08-26')),
  std('mictable', 'MTB', fw('1.8.0', '1.7.2', '2026-08-26')),
  std('micwireless', 'MWL', fw('6.3.1', '6.2.0', '2026-05-30')),
  std('speaker', 'SPK', null, 'passive: no firmware'),
  std('dsp', 'APR', fw('9.1.2', '9.0.5', '2026-09-15')),
  std('amp', 'AMP', fw('2.6.0', '2.5.1', '2026-04-11')),
  std('compute', 'UCC', fw('24.10.1', '24.6.3', '2026-10-20', 'proposed'), 'the new baseline is under review: nothing on this class is validated until it is approved'),
  std('switch', 'NSW', fw('17.4.2', '17.3.1', '2026-07-08')),
  std('control', 'CPR', fw('3.12.0', '3.11.4', '2026-06-02')),
  std('touch', 'TPN', fw('3.12.0', '3.11.4', '2026-06-02')),
  std('scheduler', 'SCH', fw('2.4.1', '2.3.0', '2026-05-14')),
  std('switcher', 'VSW', fw('1.15.3', '1.14.9', '2026-08-12')),
  std('encoder', 'ENC', fw('4.7.0', '4.6.2', '2026-07-29')),
  std('rack', 'RCK', null, 'passive: no firmware'),
  std('pdu', 'PDU', fw('2.2.4', '2.2.1', '2026-03-23')),
];
const BY_CAT = new Map(DEVICE_STANDARDS.map((s) => [s.cat, s]));
export const standardOf = (cat: string): DeviceStandard | null => BY_CAT.get(cat) ?? null;
export const classLabelOf = (cat: string) => (C.categories as Record<string, { label?: string }>)[cat]?.label || cat;

export interface InstalledDevice { id: string; room: string; building: string; lifecycle: string; position: string; asset: string; cat: string; label: string; standard: DeviceStandard | null }
const FURNITURE = new Set(['table', 'chairs', 'lectern']);
/** The units in service: a current installation (no removal date) at a hardware position; the refresh plan's population. `id` is the
 * Device record's id in the Core (room/position). */
export function installedDevices(records: ReadonlyArray<RoomRecord> = allRecords(), only: string | null = null): InstalledDevice[] {
  const out: InstalledDevice[] = [];
  for (const r of records) {
    if (only && r.outline.building !== only) continue;
    for (const i of r.installations) {
      if (i.removedAt) continue;
      const p = r.positions.find((x) => x.code === i.position); const cat = p?.cat || '';
      if (!p || p.furniture || FURNITURE.has(cat)) continue;
      out.push({ id: `${r.outline.id}/${p.code}`, room: r.outline.id, building: r.outline.building, lifecycle: r.lifecycle, position: p.code, asset: i.asset, cat, label: p.label, standard: standardOf(cat) });
    }
  }
  return out;
}

/** Compares two plain dotted versions ("3.4.2"); null when either is not plain numbers, so it cannot be compared. */
export function compareVersions(a: string, b: string): number | null {
  const ok = /^\d+(\.\d+)*$/; if (!ok.test(a) || !ok.test(b)) return null;
  const x = a.split('.').map(Number); const y = b.split('.').map(Number);
  for (let k = 0; k < Math.max(x.length, y.length); k++) { const d = (x[k] ?? 0) - (y[k] ?? 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
}
const hash = (s: string) => { let h = 2166136261; for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); } return h >>> 0; };
/** The version the room's synthetic commissioning record carries for a unit: accepted and operational rooms only; one unit in eleven
 * (by its asset ID, so always the same ones) still on the version before the baseline. */
export function commissionedVersion(d: InstalledDevice): string | null {
  const f = d.standard?.firmware; if (!f) return null;
  if (d.lifecycle !== 'ACCEPTED' && d.lifecycle !== 'OPERATIONAL') return null;
  return hash(d.asset) % 11 === 0 ? f.previous : f.version;
}

export type Posture = 'on' | 'behind' | 'unvalidated' | 'nofirmware' | 'nostandard';
export interface FirmwareRead { posture: Posture; installed: string | null; source: 'device register' | 'commissioning record' | null; why: string }
export type EntriesOf = (room: string) => Record<string, { firmware?: string } | undefined>;

export function firmwareOf(d: InstalledDevice, entry?: { firmware?: string } | null): FirmwareRead {
  const s = d.standard;
  if (!s) return { posture: 'nostandard', installed: null, source: null, why: `no standard covers the ${classLabelOf(d.cat).toLowerCase()} class` };
  const f = s.firmware;
  if (!f) return { posture: 'nofirmware', installed: null, source: null, why: s.note || 'the class carries no firmware' };
  const typed = entry?.firmware?.trim();
  const installed = typed || commissionedVersion(d); const source = typed ? 'device register' : installed ? 'commissioning record' : null;
  if (f.state !== 'approved') return { posture: 'unvalidated', installed, source, why: `the baseline ${f.version} is proposed, not approved` };
  if (!installed) return { posture: 'unvalidated', installed: null, source: null, why: 'no installed version is on record' };
  const c = compareVersions(installed, f.version);
  if (c === 0) return { posture: 'on', installed, source, why: `on the approved baseline ${f.version}` };
  if (c === -1) return { posture: 'behind', installed, source, why: `behind the approved baseline ${f.version}` };
  if (c === 1) return { posture: 'unvalidated', installed, source, why: `newer than the approved baseline ${f.version}: nothing approved it` };
  return { posture: 'unvalidated', installed, source, why: `"${installed}" cannot be compared with the baseline ${f.version}` };
}

export interface PostureCount { on: InstalledDevice[]; behind: InstalledDevice[]; unvalidated: InstalledDevice[]; nofirmware: InstalledDevice[]; nostandard: InstalledDevice[]; total: number; withFirmware: number }
/** Every installed unit in exactly one posture: the five parts add up to the units in service. */
export function firmwarePosture(devs: ReadonlyArray<InstalledDevice>, entriesOf: EntriesOf): PostureCount {
  const out: PostureCount = { on: [], behind: [], unvalidated: [], nofirmware: [], nostandard: [], total: devs.length, withFirmware: 0 };
  const cache = new Map<string, ReturnType<EntriesOf>>();
  for (const d of devs) {
    if (!cache.has(d.room)) cache.set(d.room, entriesOf(d.room));
    out[firmwareOf(d, cache.get(d.room)![d.position]).posture].push(d);
  }
  out.withFirmware = out.on.length + out.behind.length + out.unvalidated.length;
  return out;
}
/** Each standard with the units it covers, and the units no standard covers. */
export function standardsCoverage(devs: ReadonlyArray<InstalledDevice>) {
  const rows = DEVICE_STANDARDS.map((s) => ({ s, devices: devs.filter((d) => d.standard === s) }));
  return { rows, flagged: devs.filter((d) => !d.standard) };
}
