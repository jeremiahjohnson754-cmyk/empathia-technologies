/**
 * What a role configuration is shown of an estate (v1.8.1 §3, D44). The demonstration uses four reader levels (public, members, staff,
 * restricted) so that a fan never sees a rack room and a visitor never sees a locker room. It is presentation: the whole synthetic estate
 * ships with the demonstration, and in the product the signed-in server decides room by room. Choosing a configuration grants nothing.
 */
import type { RoleConfig } from '../worlds/registry.js';
import type { Access, Asset, Estate, EstateNode, Index } from './model.js';
import { maySee, pathOf } from './model.js';

const WALK_IN = new Set(['visitor', 'prospective_student', 'fan', 'away_fan', 'convention_visitor']);
const FRONT_OF_HOUSE = new Set(['guest_services', 'campus_staff', 'student_support', 'convention_event_organizer', 'convention_show_producer', 'event_producer']);
export function readerOf(c: Pick<RoleConfig, 'roleId' | 'purpose'>): Access {
  if (WALK_IN.has(c.roleId)) return 'public';
  if (FRONT_OF_HOUSE.has(c.roleId)) return 'staff';
  switch (c.purpose) {
    case 'audience': case 'teaching': case 'exhibiting': return 'members';
    case 'leadership': return 'staff';
    default: return 'restricted';   // engineering, operations and broadcast production work in the rooms others never enter
  }
}
export const READER_WORDS: Record<Access, string> = {
  public: 'the places anyone may walk into', members: 'public places, and the rooms a ticket, badge or enrolment opens',
  staff: 'public and member places, and staff rooms', restricted: 'every recorded place, including engineering and restricted rooms',
};
export const ACCESS_WORDS: Record<Access, string> = { public: 'Open to everyone', members: 'Ticket, badge or enrolment', staff: 'Staff only', restricted: 'Named access only' };
/** A node is shown only when it and every place above it may be seen: a public cupboard inside a restricted wing stays out of sight. */
export const shown = (ix: Index, reader: Access, id: string): boolean => { const p = pathOf(ix, id); return p.length > 0 && p.every((n) => maySee(reader, n)); };
export const visibleNodes = (ix: Index, reader: Access): EstateNode[] => ix.estate.nodes.filter((n) => shown(ix, reader, n.id));
/** The equipment list is a staff record; everyone else is told what the room offers, in plain words. */
export const seesEquipment = (reader: Access): boolean => reader === 'staff' || reader === 'restricted';
export function offers(assets: readonly Asset[]): string[] {
  const has = (...k: Asset['kind'][]) => assets.some((a) => k.includes(a.kind)); const out: string[] = [];
  if (has('display', 'projector', 'led')) out.push('A screen everyone can see');
  if (has('microphone') && has('loudspeaker')) out.push('Microphones and loudspeakers'); else if (has('loudspeaker')) out.push('Loudspeakers');
  if (has('assistive')) out.push('Assistive listening');
  if (has('capture')) out.push('Recording or streaming');
  if (has('camera') && has('microphone')) out.push('Set up for people joining remotely');
  if (has('signage')) out.push('Information displays');
  return out;
}

export interface Hit { id: string; kind: 'place' | 'equipment'; title: string; where: string; node: string; score: number }
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/**
 * Search Party in context: the same records the estate page shows, found by words. A hit carries the node's own identifier, so a place
 * found here and a place browsed to are one record. Equipment is searched only for readers who are shown equipment.
 */
export function find(ix: Index, reader: Access, words: string, limit = 24): Hit[] {
  const q = norm(words).split(' ').filter(Boolean); if (!q.length) return [];
  const where = (id: string) => pathOf(ix, id).slice(1, -1).map((n) => n.name).join(' › ');
  const score = (hay: string, name: string) => { const h = norm(hay); const n = norm(name); if (!q.every((w) => h.includes(w))) return 0; const inName = q.every((w) => n.includes(w)); return (n === q.join(' ') ? 100 : 0) + (inName ? 40 + Math.round(20 * q.length / Math.max(q.length, n.split(' ').length)) : 0) + (n.startsWith(q[0]!) ? 10 : 0) + 1; };
  const hits: Hit[] = [];
  for (const n of ix.estate.nodes) { if (n.kind === 'world' || !shown(ix, reader, n.id)) continue;
    const s = score(`${n.name} ${n.type.replace(/-/g, ' ')} ${n.group || ''} ${n.layout || ''} ${n.note || ''} ${n.id}`, n.name); if (s) hits.push({ id: n.id, kind: 'place', title: n.name, where: where(n.id), node: n.id, score: s }); }
  if (seesEquipment(reader)) for (const a of ix.estate.assets) { if (!shown(ix, reader, a.room)) continue;
    const s = score(`${a.label} ${a.cls} ${a.kind} ${a.id}`, a.label); if (s) { const r = ix.byId.get(a.room)!; hits.push({ id: a.id, kind: 'equipment', title: `${a.label}${a.qty > 1 ? ` × ${a.qty}` : ''}`, where: `${r.name} · ${a.cls}`, node: a.room, score: s - 1 }); } }
  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'en', { numeric: true })).slice(0, limit);
}
export const totals = (ix: Index, reader: Access, e: Estate = ix.estate) => { const v = visibleNodes(ix, reader); const ids = new Set(v.map((n) => n.id));
  return { places: v.filter((n) => n.kind !== 'world' && n.kind !== 'level').length, rooms: v.filter((n) => n.kind === 'room').length, equipment: seesEquipment(reader) ? e.assets.filter((a) => ids.has(a.room)).reduce((s, a) => s + a.qty, 0) : null, routes: e.routes.filter((r) => ids.has(r.from) && ids.has(r.to)).length, all: e.nodes.filter((n) => n.kind !== 'world' && n.kind !== 'level').length }; };
