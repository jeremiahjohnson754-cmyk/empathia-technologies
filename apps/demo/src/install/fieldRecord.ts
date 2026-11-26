/**
 * Phase 1 installation documentation: the field record and redlines (founder, 14 Nov 2026: "installation teams should tell us how
 * everything is being mounted and have the lite design become like a bluebeam redlining document … where are things mounted, hooked up
 * to, did we change the position of a device during commissioning because of a sprinkler or something in the field … give technicians
 * everything they need").
 *
 * Kept in this browser beside the room's design, one key per room, never written over: every entry names who recorded it and when.
 *   - Mounting: how each device is held (method, height above the finished floor, fixing and backing, a safety tether for overhead
 *     devices), as the installer found and did it.
 *   - Hooked up to: what each device is actually connected to (its port, the other end and its port, the cable label). Each hookup is
 *     compared with the design's proposed connections: "as designed" or "recorded in the field, not in the design".
 *   - Field moves: a device installed somewhere other than its designed position, with the reason (a sprinkler head, a diffuser, a light,
 *     structure…), a note and a photograph. A move is PROPOSED until someone holding room.design.approve, and not its recorder, approves
 *     or rejects it. An approved move is the as-built position; the design is not edited by it, and the checks that name the device are
 *     listed for the commissioning engineer to look at again.
 *   - Markups: notes pinned to the plan (a cloud with text), OPEN until resolved with a resolution.
 * Synthetic: the rooms are the demonstration's; what is recorded here is what a person typed or photographed in this browser.
 */
import type { RoomRecord, Position } from '../campus/design.js';
import { holds, personaLabel } from '../build/store.js';

export const RECORD_AUTHORITIES = ['work.evidence', 'field.scan'];
export const APPROVE_AUTHORITY = 'room.design.approve';
export const MOUNTS: Array<{ id: string; label: string; overhead: boolean }> = [
  { id: 'ceiling-tile', label: 'Ceiling tile with a tile bridge or support', overhead: true },
  { id: 'ceiling-structure', label: 'Ceiling structure (rod, drop or pole)', overhead: true },
  { id: 'wall-bracket', label: 'Wall bracket', overhead: false },
  { id: 'wall-box', label: 'In-wall box or back box', overhead: false },
  { id: 'under-table', label: 'Under or in the table', overhead: false },
  { id: 'rack', label: 'Equipment rack (rack units)', overhead: false },
  { id: 'credenza', label: 'Credenza or AV furniture', overhead: false },
  { id: 'floor', label: 'Floor, floor box or stand', overhead: false },
  { id: 'other', label: 'Other (described in the note)', overhead: false },
];
export const MOVE_REASONS = ['sprinkler head', 'HVAC diffuser or return', 'light fixture', 'structural member', 'ceiling grid or tile layout', 'access panel', 'power or data location', 'sightline or glare', 'client or architect request', 'other'];
export const ENDS_OUTSIDE = ['building network (outside the room)', 'power circuit', 'other room or rack'];

export interface Mounting { method: string; heightM: number | null; fixing: string; backing: string; tether: 'yes' | 'no' | 'n/a'; note: string; by: string; at: string }
export interface Hookup { id: string; device: string; port: string; to: string; toPort: string; cable: string; by: string; at: string }
export interface Photo { dataUrl: string; bytes: number }
export interface Move { id: string; device: string; from: { x: number; y: number }; to: { x: number; y: number }; reason: string; note: string; photo: Photo | null; by: string; at: string; state: 'PROPOSED' | 'APPROVED' | 'REJECTED'; decidedBy?: string; decidedAt?: string; decision?: string }
export interface Markup { id: string; x: number; y: number; text: string; by: string; at: string; state: 'OPEN' | 'RESOLVED'; resolvedBy?: string; resolution?: string }
export interface FieldState { v: 1; mount: Record<string, Mounting[]>; hookups: Hookup[]; moves: Move[]; markups: Markup[]; log: Array<{ at: string; by: string; what: string; outcome: 'ALLOWED' | 'DENIED' }> }

const KEY = (room: string) => `empathia.demo.field.v1.${room}`;
const empty = (): FieldState => ({ v: 1, mount: {}, hookups: [], moves: [], markups: [], log: [] });
export function readField(room: string): FieldState {
  try { const s = localStorage.getItem(KEY(room)); if (s) { const d = JSON.parse(s) as FieldState; if (d && d.v === 1 && Array.isArray(d.moves)) return d; } } catch { /* unavailable or damaged: start empty */ }
  return empty();
}
function save(room: string, s: FieldState): string | null {
  try { localStorage.setItem(KEY(room), JSON.stringify(s)); return null; } catch { return 'this browser could not keep it (storage is full or unavailable); nothing was saved'; }
}
const now = () => new Date().toISOString();
const seq = (xs: Array<{ id: string }>, p: string) => `${p}-${String(xs.length + 1).padStart(3, '0')}`;
export type Result = { ok: true; state: FieldState } | { ok: false; why: string[] };
function deny(room: string, s: FieldState, persona: string, why: string[]): Result { s.log.unshift({ at: now(), by: persona, what: `refused: ${why.join('; ')}`, outcome: 'DENIED' }); save(room, s); return { ok: false, why }; }
function done(room: string, s: FieldState, persona: string, what: string): Result {
  s.log.unshift({ at: now(), by: persona, what, outcome: 'ALLOWED' }); s.log = s.log.slice(0, 300);
  const err = save(room, s); return err ? { ok: false, why: [err] } : { ok: true, state: s };
}
const mayRecord = (persona: string) => RECORD_AUTHORITIES.some((a) => holds(persona, a));
const recordRefusal = (persona: string) => `${personaLabel(persona)} does not record the field record (needs ${RECORD_AUTHORITIES.join(' or ')}): the installation team does`;
export const devicesOf = (r: RoomRecord) => r.positions.filter((p) => !p.furniture);
const deviceOf = (r: RoomRecord, code: string) => devicesOf(r).find((p) => p.code === code) || null;
export const mountOf = (s: FieldState, device: string): Mounting | null => s.mount[device]?.[0] || null;

/** Record how a device is mounted. Every write is a new version on top; the earlier ones stay. */
export function recordMounting(r: RoomRecord, persona: string, device: string, m: { method: string; heightM?: number | string | null; fixing?: string; backing?: string; tether?: string; note?: string }): Result {
  const room = r.outline.id; const s = readField(room);
  if (!mayRecord(persona)) return deny(room, s, persona, [recordRefusal(persona)]);
  const p = deviceOf(r, device); if (!p) return deny(room, s, persona, [`${device} is not a device of ${room}`]);
  const kind = MOUNTS.find((x) => x.id === m.method); const why: string[] = [];
  if (!kind) why.push('choose how the device is mounted');
  const h = m.heightM === '' || m.heightM === undefined || m.heightM === null ? null : Number(m.heightM);
  if (h !== null && !(Number.isFinite(h) && h >= 0 && h <= 15)) why.push('a mounting height is in meters above the finished floor, 0–15');
  const fixing = (m.fixing || '').trim(); const backing = (m.backing || '').trim(); const note = (m.note || '').trim();
  if (kind && kind.id !== 'other' && kind.id !== 'floor' && !fixing) why.push('say how it is fixed (the bracket, anchors or hardware used)');
  if (kind?.id === 'other' && !note) why.push('describe the mounting in the note');
  const tether = (m.tether === 'yes' || m.tether === 'no' ? m.tether : 'n/a') as Mounting['tether'];
  if (kind?.overhead && tether === 'n/a') why.push('an overhead mounting records whether a secondary safety tether is fitted (yes or no)');
  if (why.length) return deny(room, s, persona, why);
  s.mount[device] = [{ method: kind!.id, heightM: h, fixing, backing, tether, note, by: persona, at: now() }, ...(s.mount[device] || [])];
  return done(room, s, persona, `${device} mounted: ${kind!.label}${h !== null ? `, ${h} m AFF` : ''}${fixing ? `, ${fixing}` : ''}`);
}

/** Is this hookup one of the design's proposed connections (either direction)? */
export function asDesigned(r: RoomRecord, h: Pick<Hookup, 'device' | 'to'>): boolean {
  return r.connections.some((c) => (c.from === h.device && c.to === h.to) || (c.to === h.device && c.from === h.to));
}
/** Record what a device is hooked up to, as found in the field. */
export function recordHookup(r: RoomRecord, persona: string, h: { device: string; port: string; to: string; toPort?: string; cable?: string }): Result {
  const room = r.outline.id; const s = readField(room);
  if (!mayRecord(persona)) return deny(room, s, persona, [recordRefusal(persona)]);
  const why: string[] = []; const port = (h.port || '').trim(); const to = (h.to || '').trim();
  if (!deviceOf(r, h.device)) why.push(`${h.device} is not a device of ${room}`);
  if (!port) why.push('name the port on the device (as labeled on it)');
  if (!to) why.push('say what the other end is');
  else if (!deviceOf(r, to) && !ENDS_OUTSIDE.includes(to)) why.push('the other end is a device of this room or one of: ' + ENDS_OUTSIDE.join(', '));
  if (to === h.device) why.push('a device is not hooked up to itself');
  if (s.hookups.some((x) => x.device === h.device && x.port.toLowerCase() === port.toLowerCase())) why.push(`${h.device} port ${port} is already recorded as hooked up`);
  if (why.length) return deny(room, s, persona, why);
  const x: Hookup = { id: seq(s.hookups, 'HK'), device: h.device, port, to, toPort: (h.toPort || '').trim(), cable: (h.cable || '').trim(), by: persona, at: now() };
  s.hookups.push(x);
  return done(room, s, persona, `${x.id} ${h.device}:${port} → ${to}${x.toPort ? `:${x.toPort}` : ''}${x.cable ? ` (cable ${x.cable})` : ''} · ${asDesigned(r, x) ? 'as designed' : 'not in the design'}`);
}

export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
/** Record that a device went in somewhere else than designed, with the reason. PROPOSED until an approver decides. */
export function proposeMove(r: RoomRecord, persona: string, m: { device: string; x: number; y: number; reason: string; note?: string; photo?: Photo | null }): Result {
  const room = r.outline.id; const s = readField(room);
  if (!mayRecord(persona)) return deny(room, s, persona, [recordRefusal(persona)]);
  const p = deviceOf(r, m.device); const why: string[] = []; const [w, l] = r.outline.dims;
  if (!p) why.push(`${m.device} is not a device of ${room}`);
  if (!MOVE_REASONS.includes(m.reason)) why.push('choose why it moved');
  if (m.reason === 'other' && !(m.note || '').trim()) why.push('describe the reason in the note');
  if (!(Number.isFinite(m.x) && Number.isFinite(m.y) && m.x >= 0 && m.x <= w && m.y >= 0 && m.y <= l)) why.push(`the as-built position is inside the room (0–${w} m across, 0–${l} m deep)`);
  if (p && Number.isFinite(m.x) && dist(p, m) < 0.05) why.push('the position is the designed one: nothing moved');
  if (s.moves.some((x) => x.device === m.device && x.state === 'PROPOSED')) why.push(`${m.device} already has a move waiting for a decision`);
  if (why.length) return deny(room, s, persona, why);
  const mv: Move = { id: seq(s.moves, 'FM'), device: m.device, from: { x: p!.x, y: p!.y }, to: { x: Math.round(m.x * 100) / 100, y: Math.round(m.y * 100) / 100 }, reason: m.reason, note: (m.note || '').trim(), photo: m.photo || null, by: persona, at: now(), state: 'PROPOSED' };
  s.moves.push(mv);
  return done(room, s, persona, `${mv.id} ${m.device} moved ${dist(mv.from, mv.to).toFixed(2)} m: ${m.reason}${mv.note ? ` (${mv.note})` : ''}`);
}
/** Approve or reject a field move: room.design.approve, and never by the person who recorded it. */
export function decideMove(r: RoomRecord, persona: string, id: string, approve: boolean, decision = ''): Result {
  const room = r.outline.id; const s = readField(room); const mv = s.moves.find((x) => x.id === id);
  if (!holds(persona, APPROVE_AUTHORITY)) return deny(room, s, persona, [`${personaLabel(persona)} does not decide a field move (needs ${APPROVE_AUTHORITY}): the systems engineer or the designer of record does`]);
  if (!mv) return deny(room, s, persona, [`${id} is not a field move of ${room}`]);
  if (mv.state !== 'PROPOSED') return deny(room, s, persona, [`${id} is already ${mv.state}`]);
  if (mv.by === persona) return deny(room, s, persona, ['separation of duties: a field move is decided by someone other than the person who recorded it']);
  if (!approve && !decision.trim()) return deny(room, s, persona, ['a rejection says why (what the installer should do instead)']);
  mv.state = approve ? 'APPROVED' : 'REJECTED'; mv.decidedBy = persona; mv.decidedAt = now(); mv.decision = decision.trim();
  return done(room, s, persona, `${id} ${mv.state.toLowerCase()}${mv.decision ? `: ${mv.decision}` : ''}`);
}
/** Where a device is as built: its approved move, or its designed position. */
export function asBuilt(s: FieldState, p: Position): { x: number; y: number; moved: Move | null } {
  const mv = [...s.moves].reverse().find((x) => x.device === p.code && x.state === 'APPROVED') || null;
  return mv ? { ...mv.to, moved: mv } : { x: p.x, y: p.y, moved: null };
}
/** The commissioning checks that name a device (the engineer looks at these again after an approved move). */
export const checksNaming = (r: RoomRecord, device: string) => r.analysis.applicability.rows.filter((x) => x.applicable && (x.devices || []).includes(device)).map((x) => x.id);

/** Pin a note (a cloud) to the plan. Anyone who records or approves may add one. */
export function addMarkup(r: RoomRecord, persona: string, m: { x: number; y: number; text: string }): Result {
  const room = r.outline.id; const s = readField(room); const [w, l] = r.outline.dims;
  if (!mayRecord(persona) && !holds(persona, APPROVE_AUTHORITY)) return deny(room, s, persona, [`${personaLabel(persona)} does not mark up the field record: the installation team and the approvers do`]);
  const text = (m.text || '').trim(); const why: string[] = [];
  if (!text) why.push('write what the note says');
  if (!(m.x >= 0 && m.x <= w && m.y >= 0 && m.y <= l)) why.push('pin the note inside the room');
  if (why.length) return deny(room, s, persona, why);
  const mk: Markup = { id: seq(s.markups, 'RL'), x: Math.round(m.x * 100) / 100, y: Math.round(m.y * 100) / 100, text, by: persona, at: now(), state: 'OPEN' };
  s.markups.push(mk);
  return done(room, s, persona, `${mk.id} note: ${text}`);
}
export function resolveMarkup(r: RoomRecord, persona: string, id: string, resolution: string): Result {
  const room = r.outline.id; const s = readField(room); const mk = s.markups.find((x) => x.id === id);
  if (!mayRecord(persona) && !holds(persona, APPROVE_AUTHORITY)) return deny(room, s, persona, [`${personaLabel(persona)} does not resolve field notes`]);
  if (!mk || mk.state !== 'OPEN') return deny(room, s, persona, [`${id} is not an open note of ${room}`]);
  if (!resolution.trim()) return deny(room, s, persona, ['say how it was resolved']);
  mk.state = 'RESOLVED'; mk.resolvedBy = persona; mk.resolution = resolution.trim();
  return done(room, s, persona, `${id} resolved: ${mk.resolution}`);
}

/** What a technician still has to record for this room. */
export function fieldStats(r: RoomRecord, s: FieldState) {
  const ds = devicesOf(r); const mounted = ds.filter((p) => mountOf(s, p.code)).length;
  const hooked = new Set(s.hookups.map((h) => h.device)); const designedEnds = new Set(r.connections.flatMap((c) => [c.from, c.to]));
  return {
    devices: ds.length, mounted, hookups: s.hookups.length, devicesHooked: ds.filter((p) => hooked.has(p.code)).length, needHookup: ds.filter((p) => designedEnds.has(p.code) && !hooked.has(p.code)).length,
    notInDesign: s.hookups.filter((h) => !asDesigned(r, h)).length, proposed: s.moves.filter((m) => m.state === 'PROPOSED').length, approved: s.moves.filter((m) => m.state === 'APPROVED').length,
    openNotes: s.markups.filter((m) => m.state === 'OPEN').length,
  };
}
