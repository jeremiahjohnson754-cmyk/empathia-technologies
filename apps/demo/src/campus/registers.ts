/**
 * The room register and the device register: where commissioning begins (founder, 14 Nov 2026: "I want the device register and room
 * register in the beginning of commissioning framework … the installation team to fill out the device register so we can get every
 * device and asset ID and asset information at the beginning of the project", and the control rules of the founder's v1.3 workbook:
 * every phase is keyed by the room ID; networked devices require an IP address and a hostname).
 *
 * Identity comes from the record and is never typed: the device ID is the position (PA-…), the asset ID is the physical unit installed
 * there (AS-…). What the installation team adds is what they read on site — serial, hostname, IP address, firmware, mounting location —
 * kept in this browser beside the record (./registerStore.ts). A unit the record shows as replaced is out of the inventory: it is listed in
 * the retired register with its history, and its code is never shown as available again.
 *
 * Synthetic: the values are what a person types into a demonstration connected to no system. Nothing here contacts a device.
 */
import { C, type RoomRecord, type Position } from './design.js';
import { fullName } from './canon.js';

export interface DeviceEntry { serial?: string; hostname?: string; ip?: string; firmware?: string; location?: string; by: string; at: string }
export interface RegisterRow {
  device: string; asset: string | null; category: string; label: string; layer: string; mount: string; networked: boolean;
  entry: DeviceEntry | null; missing: string[]; complete: boolean; installedAt: string | null; installedBy: string | null;
}
export interface RetiredRow { asset: string; device: string; label: string; installedAt: string; retiredAt: string; reason: string; replacedBy: string | null }

/** networked: the catalogue says the category is on the network (a switch is the network itself and is registered like any device) */
export const isNetworked = (cat: string) => !!C.categories[cat]?.net;

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const HOST = /^(?=.{1,63}$)[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$/;
/** Checks what a person typed; returns the reasons it is refused (empty = accepted). Values are trimmed by the caller. */
export function validateEntry(e: Partial<DeviceEntry>, networked: boolean): string[] {
  const why: string[] = [];
  if (e.serial !== undefined && e.serial && !/^[A-Za-z0-9][A-Za-z0-9._/-]{2,39}$/.test(e.serial)) why.push('a serial is 3–40 letters, digits, dots, dashes or slashes, as printed on the label');
  if (e.hostname !== undefined && e.hostname && !HOST.test(e.hostname)) why.push('a hostname is one label of letters, digits and dashes (at most 63), not starting or ending with a dash');
  if (e.ip !== undefined && e.ip && !IPV4.test(e.ip)) why.push('an IP address is four numbers 0–255 separated by dots');
  if (e.firmware !== undefined && e.firmware && !/^[A-Za-z0-9][A-Za-z0-9._ -]{0,39}$/.test(e.firmware)) why.push('a firmware version is up to 40 letters, digits, dots, dashes or spaces');
  if (!networked && (e.ip || e.hostname)) why.push('this device class is not on the network: it has no IP address or hostname');
  return why;
}

/** What a complete register row needs: the serial for every unit; the hostname and IP address for a networked one (v1.3 rule). */
export function missingOf(networked: boolean, e: DeviceEntry | null): string[] {
  const m: string[] = [];
  if (!e?.serial) m.push('serial');
  if (networked && !e?.hostname) m.push('hostname');
  if (networked && !e?.ip) m.push('IP address');
  return m;
}

export function deviceRegister(r: RoomRecord, entries: Record<string, DeviceEntry>): RegisterRow[] {
  return r.positions.filter((p: Position) => !p.furniture).map((p) => {
    const inst = r.installations.find((i) => i.position === p.code && !i.removedAt) || null;
    const net = isNetworked(p.cat); const e = entries[p.code] || null; const missing = missingOf(net, e);
    return { device: p.code, asset: p.asset, category: p.catLabel, label: p.label, layer: p.layer, mount: p.mount, networked: net, entry: e, missing, complete: !missing.length, installedAt: inst?.installedAt ?? null, installedBy: inst?.by ?? null };
  });
}

/** Units the record shows taken out of a position: retired from the inventory, their codes reserved, their history kept. */
export function retiredRegister(r: RoomRecord): RetiredRow[] {
  return r.installations.filter((i) => i.removedAt).map((i) => {
    const next = r.installations.find((x) => x.position === i.position && x.installedAt === i.removedAt && x !== i) || null;
    const p = r.positions.find((x) => x.code === i.position);
    return { asset: i.asset, device: i.position, label: p?.label || i.position, installedAt: i.installedAt, retiredAt: i.removedAt!, reason: (i.removalReason || 'REMOVED').split(' ')[0]!, replacedBy: next?.asset ?? null };
  });
}

/** Every asset code the record has ever used in this room, current or retired: none may be issued again. */
export const codesOnRecord = (r: RoomRecord) => [...new Set(r.installations.map((i) => i.asset))];

/** The room register row (v1.3 Room Register): every field read from the record; nothing typed. */
export function roomRegister(r: RoomRecord): Array<[string, string]> {
  const o = r.outline; const cats = r.positions.filter((p) => !p.furniture);
  const count = (c: string[]) => cats.filter((p) => c.includes(p.cat)).length;
  return [
    ['Room ID', o.id], ['Room', fullName(o)], ['Room type', r.archetypeName], ['Capacity', `${o.capacity} people`],
    ['Primary use', o.intent || '—'], ['Displays', String(count(['display', 'ledwall', 'projector']))], ['Cameras', String(count(['camera', 'bar']))],
    ['Microphones', String(count(['micceil', 'mictable', 'micwireless', 'bar']))], ['Divisible', o.divisible ? `yes (${o.divisible.sections.join(', ')})` : 'no'],
    ['Devices to register', String(cats.length)], ['Lifecycle', r.lifecycle.replace(/_/g, ' ').toLowerCase()],
  ];
}

export function registerStats(rows: RegisterRow[]) {
  const done = rows.filter((x) => x.complete).length; const net = rows.filter((x) => x.networked);
  return { total: rows.length, done, pct: rows.length ? Math.round((done / rows.length) * 100) : 100, networked: net.length, netDone: net.filter((x) => x.complete).length, missingSerial: rows.filter((x) => x.missing.includes('serial')).length, missingIp: rows.filter((x) => x.missing.includes('IP address')).length };
}
