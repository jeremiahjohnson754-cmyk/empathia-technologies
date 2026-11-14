/**
 * What the installation team records at the start of commissioning, kept in this browser beside the room record: the device register
 * entries (serial, hostname, IP address, firmware, mounting location per device) and the install documentation of phase 1 (a photograph
 * before the installation and one after). One key per room; every write names the person and the time, and is refused when it would
 * break a rule: a value in the wrong form, a serial already registered to another unit of the same class anywhere on the estate, or an
 * address or hostname already used by another device.
 *
 * The values are synthetic: a demonstration connected to no system. Photographs are scaled down in the browser before they are kept.
 */
import { validateEntry, type DeviceEntry } from './registers.js';

export interface InstallPhoto { dataUrl: string; by: string; at: string; note: string; bytes: number }
export interface RegisterState { v: 1; entries: Record<string, DeviceEntry & { category: string }>; photos: { before?: InstallPhoto; after?: InstallPhoto }; log: Array<{ at: string; by: string; what: string }> }
const KEY = (room: string) => `empathia.demo.register.v1.${room}`;
const PREFIX = 'empathia.demo.register.v1.';
const empty = (): RegisterState => ({ v: 1, entries: {}, photos: {}, log: [] });

export function readRegister(room: string): RegisterState {
  try { const s = localStorage.getItem(KEY(room)); if (s) { const d = JSON.parse(s) as RegisterState; if (d && d.v === 1 && d.entries && d.photos && Array.isArray(d.log)) return d; } } catch { /* unavailable or damaged: start empty */ }
  return empty();
}
function save(room: string, s: RegisterState): string | null {
  try { localStorage.setItem(KEY(room), JSON.stringify(s)); return null; } catch { return 'this browser could not keep it (storage is full or unavailable); nothing was saved'; }
}
/** every room's register in this browser (for the estate-wide uniqueness of serials, hostnames and addresses) */
function allRegisters(): Array<[string, RegisterState]> {
  const out: Array<[string, RegisterState]> = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIX)) out.push([k.slice(PREFIX.length), readRegister(k.slice(PREFIX.length))]); } } catch { /* none readable */ }
  return out;
}

export type Patch = Partial<Pick<DeviceEntry, 'serial' | 'hostname' | 'ip' | 'firmware' | 'location'>>;
/** Record what was read on site for one device. Returns the reasons it is refused, or null when kept. */
export function writeEntry(room: string, device: string, category: string, networked: boolean, patch: Patch, by: string): string[] | null {
  const clean: Patch = {}; for (const [k, v] of Object.entries(patch)) (clean as Record<string, string>)[k] = String(v ?? '').trim();
  const why = validateEntry(clean, networked); if (why.length) return why;
  const s = readRegister(room); const prev = s.entries[device];
  if (prev?.serial && clean.serial !== undefined && clean.serial !== prev.serial) return [`${device} already carries serial ${prev.serial}: a recorded serial is final — a different serial is a different unit (replace the unit instead)`];
  for (const [r, other] of allRegisters()) for (const [d, e] of Object.entries(other.entries)) {
    if (r === room && d === device) continue;
    if (clean.serial && e.serial === clean.serial && e.category === category) return [`serial ${clean.serial} is already registered to ${d} in ${r}: one unit, one serial`];
    if (clean.hostname && e.hostname?.toLowerCase() === clean.hostname.toLowerCase()) return [`hostname ${clean.hostname} is already used by ${d} in ${r}`];
    if (clean.ip && e.ip === clean.ip) return [`address ${clean.ip} is already used by ${d} in ${r}`];
  }
  const at = new Date().toISOString();
  const merged = { ...(prev || {}), ...Object.fromEntries(Object.entries(clean).filter(([, v]) => v)), category, by, at } as DeviceEntry & { category: string };
  s.entries[device] = merged;
  s.log.unshift({ at, by, what: `${device}: ${Object.entries(clean).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ') || 'no change'}` }); s.log = s.log.slice(0, 200);
  const err = save(room, s); return err ? [err] : null;
}

/** Keep a before- or after-installation photograph (already scaled down by the caller). Any member of the installation team may. */
export function setInstallPhoto(room: string, which: 'before' | 'after', photo: Omit<InstallPhoto, 'at'>): string[] | null {
  if (!/^data:image\/(jpeg|png);base64,/.test(photo.dataUrl)) return ['a photograph is a JPEG or PNG image'];
  if (photo.bytes > 400_000) return ['the photograph is too large to keep here even after scaling (at most 400 KB)'];
  if (which === 'after' && !readRegister(room).photos.before) return ['record the photograph before the installation first: the after photograph is compared with it'];
  const s = readRegister(room); const at = new Date().toISOString();
  s.photos[which] = { ...photo, note: photo.note.trim().slice(0, 200), at };
  s.log.unshift({ at, by: photo.by, what: `${which === 'before' ? 'before-installation' : 'after-installation'} photograph${photo.note.trim() ? `: ${photo.note.trim().slice(0, 80)}` : ''}` });
  const err = save(room, s); return err ? [err] : null;
}

/** Scale an image file down in the browser (longest side 960 px, JPEG 0.82) and return it as a data URL with its size. */
export async function scalePhoto(file: File): Promise<{ dataUrl: string; bytes: number }> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('choose a JPEG, PNG or WebP photograph');
  const url = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = () => rej(new Error('the file could not be read')); fr.readAsDataURL(file); });
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('the file is not a readable image')); i.src = url; });
  const k = Math.min(1, 960 / Math.max(img.naturalWidth, img.naturalHeight)); const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(img.naturalWidth * k)); cv.height = Math.max(1, Math.round(img.naturalHeight * k));
  cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
  const dataUrl = cv.toDataURL('image/jpeg', 0.82); return { dataUrl, bytes: Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75) };
}
