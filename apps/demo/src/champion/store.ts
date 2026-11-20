/**
 * What a Site Champion does as a champion (founder, 11 Nov 2026: "a distinct governed role … scoped access"). The platform's persona
 * `sitechamp` holds exactly three authorities: location.verify, access.coordinate, occupancy.confirm. Each is one function here, plus
 * the contribution of local knowledge. Every one of them: needs this role and that authority; works only inside the champion's own
 * site; validates what it is given; refuses in words; writes the shared workspace (so ServiceHands and the room see it) and one
 * ledger line, allowed or refused. None of them changes a device, a design, a test, a job's state or an approval.
 */
import type { RoleKey } from '../registry.types.js';
import { CHAMPION_SITES, ROLES } from '../access/policy.js';
import { roomById, shortName } from '../campus/canon.js';
import type * as S from '../workspace/store.js';
import { deny, holds, log, personaOf, type WX } from '../hardening/kit.js';
import { CHECK, LESSONS, PASS_MARK, READABLE, mark, type CheckResult } from './start.js';

export type Refusal = { why: string[] };
export interface Note { id: string; roomId: string; text: string; at: string; by: string; /** a champion's note is a candidate until someone qualified reviews it; it is never shown as fact */ state: 'CANDIDATE' }
/** The champion's own first weeks: what they have marked as read (when), and the last try at the check. */
export interface StartState { read: Record<string, string>; check: { at: string; score: number; of: number; passed: boolean } | null; tries: number }
export interface ChampionState { verified: Record<string, { at: string; by: string; note: string }>; occupancy: Record<string, { at: string; by: string; state: 'in-use' | 'free' }>; notes: Note[]; start: StartState }
const EMPTY_START = (): StartState => ({ read: {}, check: null, tries: 0 });
const EMPTY = (): ChampionState => ({ verified: {}, occupancy: {}, notes: [], start: EMPTY_START() });
/** Stored state is untrusted: only the ids a champion can mark, each with a date; a check only when its numbers agree with each other. */
function startOf(v: unknown): StartState {
  const o = (v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Partial<StartState>; const out = EMPTY_START();
  for (const id of READABLE) { const at = (o.read as Record<string, unknown> | undefined)?.[id]; if (typeof at === 'string' && !Number.isNaN(Date.parse(at))) out.read[id] = at; }
  const k = o.check; if (k && typeof k === 'object' && typeof k.at === 'string' && !Number.isNaN(Date.parse(k.at)) && Number.isInteger(k.score) && k.of === CHECK.length && k.score >= 0 && k.score <= k.of && typeof k.passed === 'boolean') out.check = { at: k.at, score: k.score, of: k.of, passed: k.passed && k.score >= PASS_MARK };
  out.tries = Number.isInteger(o.tries) && (o.tries as number) > 0 ? Math.min(o.tries as number, 999) : out.check ? 1 : 0;
  return out;
}
type WC = WX & { ch?: ChampionState };
const ch = (w: S.Workspace): ChampionState => { const c = ((w as WC).ch ||= EMPTY()); c.start = startOf(c.start); return c; };
/** Read without creating; stored state is untrusted, so anything that is not the right shape reads as empty. */
export function championView(w: S.Workspace | null): ChampionState {
  const c = (w as WC | null)?.ch; if (!c || typeof c !== 'object') return EMPTY();
  const rec = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, never>;
  return { verified: rec(c.verified), occupancy: rec(c.occupancy), notes: Array.isArray(c.notes) ? c.notes.filter((n) => n && typeof n.text === 'string' && typeof n.roomId === 'string').slice(0, 200) : [], start: startOf(c.start) };
}

export const isChampion = (role: RoleKey): boolean => role === 'sitechamp';
/** Is this room, or this building, in the champion's own site? */
export const inSite = (buildingKey: string | null | undefined): boolean => !!buildingKey && CHAMPION_SITES.includes(buildingKey);
export const roomInSite = (roomId: string): boolean => inSite(roomById(roomId)?.building);

/** The one gate every champion action passes: the role, the persona's authority, and the site. */
function gate(w: S.Workspace, role: RoleKey, authority: string, type: string, aggregate: string, buildingKey: string | null | undefined): Refusal | null {
  const persona = personaOf(role);
  if (!isChampion(role) || !holds(persona, authority)) return deny(w, persona, type, aggregate, [`The ${ROLES[role].label} does not do this. It is the Site Champion’s, for their own site.`]);
  if (!inSite(buildingKey)) return deny(w, persona, type, aggregate, ['That is outside your site. A champion acts for the rooms of their own site only.']);
  return null;
}

/** access.coordinate: the champion confirms that a planned visit can get into the room. It records who confirmed; it starts nothing. */
export function confirmAccess(w: S.Workspace, role: RoleKey, woId: string): Refusal | { ok: true } {
  const wo = w.workOrders.find((x) => x.id === woId); if (!wo) return { why: ['No such visit.'] };
  const g = gate(w, role, 'access.coordinate', 'site.access_confirmed', wo.id, wo.buildingKey); if (g) return g;
  if (['DONE', 'CANCELLED'].includes(wo.state)) return deny(w, personaOf(role), 'site.access_confirmed', wo.id, [`${wo.id} is ${wo.state.toLowerCase()}; there is no visit to confirm.`]);
  if (wo.access) return { why: [`Access for ${wo.id} is already confirmed, by ${wo.access.confirmedBy}.`] };
  wo.access = { confirmedBy: 'the Site Champion' };
  log(w, personaOf(role), 'site.access_confirmed', wo.id, `Access to ${shortName(roomById(wo.roomId)!) || wo.roomId} confirmed by the Site Champion for ${wo.title}`);
  return { ok: true };
}

/** location.verify: the champion has stood in the room and its name, number and place match the record (or says what does not). */
export function verifyRoom(w: S.Workspace, role: RoleKey, roomId: string, note: string): Refusal | { ok: true } {
  const room = roomById(roomId); if (!room) return { why: ['Choose a room.'] };
  const g = gate(w, role, 'location.verify', 'site.location_verified', roomId, room.building); if (g) return g;
  const text = note.trim(); if (text.length > 300) return { why: ['Keep the note under 300 characters.'] };
  ch(w).verified[roomId] = { at: new Date().toISOString(), by: 'Site Champion', note: text };
  log(w, personaOf(role), 'site.location_verified', roomId, `${shortName(room)}: name, number and place checked on site by the Site Champion${text ? ` · ${text.slice(0, 120)}` : ''}`);
  return { ok: true };
}

/** occupancy.confirm: what the champion saw at the door, at this moment. An observation by a person, not a sensor and not a booking. */
export function confirmOccupancy(w: S.Workspace, role: RoleKey, roomId: string, state: 'in-use' | 'free'): Refusal | { ok: true } {
  const room = roomById(roomId); if (!room) return { why: ['Choose a room.'] };
  const g = gate(w, role, 'occupancy.confirm', 'site.occupancy_confirmed', roomId, room.building); if (g) return g;
  if (state !== 'in-use' && state !== 'free') return { why: ['Say whether the room is in use or free.'] };
  ch(w).occupancy[roomId] = { at: new Date().toISOString(), by: 'Site Champion', state };
  log(w, personaOf(role), 'site.occupancy_confirmed', roomId, `${shortName(room)} seen ${state === 'free' ? 'free' : 'in use'} by the Site Champion (an observation, not a sensor)`);
  return { ok: true };
}

/** Local knowledge: something about a room that only someone on site knows. Kept as a candidate, never shown as fact. */
export function contribute(w: S.Workspace, role: RoleKey, roomId: string, text: string): Refusal | Note {
  const room = roomById(roomId); if (!room) return { why: ['Choose the room the note is about.'] };
  const persona = personaOf(role);
  if (!isChampion(role)) return deny(w, persona, 'site.knowledge_contributed', roomId, [`The ${ROLES[role].label} does not add site notes here.`]);
  if (!inSite(room.building)) return deny(w, persona, 'site.knowledge_contributed', roomId, ['That room is outside your site.']);
  const t = text.trim(); if (t.length < 12) return { why: ['Say it in a sentence (at least 12 characters).'] }; if (t.length > 400) return { why: ['Keep the note under 400 characters.'] };
  const c = ch(w); if (c.notes.some((n) => n.roomId === roomId && n.text === t)) return { why: ['That note is already recorded for this room.'] };
  if (c.notes.length >= 200) return { why: ['This site already holds two hundred notes.'] };
  const n: Note = { id: `SN-${String(c.notes.length + 1).padStart(4, '0')}`, roomId, text: t, at: new Date().toISOString(), by: 'Site Champion', state: 'CANDIDATE' };
  c.notes.unshift(n);
  log(w, persona, 'site.knowledge_contributed', roomId, `${shortName(room)}: a site note was added as a candidate, awaiting review (${n.id})`);
  return n;
}

// ------------------------------------------------------------------------------------------------------------ the champion's first weeks
const TITLE_OF: Record<string, string> = { ...Object.fromEntries(LESSONS.map((l) => [l.id, `the lesson “${l.title}”`])), support: 'who supports the site' };
/** The champion says they have read a lesson, or who supports the site. Their word, once; it grants nothing. */
export function markRead(w: S.Workspace, role: RoleKey, id: string): Refusal | { ok: true } {
  const persona = personaOf(role);
  if (!isChampion(role)) return deny(w, persona, 'site.start_read', 'site:start', [`The ${ROLES[role].label} does not have a champion’s list. It is the Site Champion’s own.`]);
  if (!READABLE.includes(id)) return { why: ['There is no such lesson.'] };
  const c = ch(w); if (c.start.read[id]) return { ok: true };
  c.start.read[id] = new Date().toISOString();
  log(w, persona, 'site.start_read', 'site:start', `The Site Champion marked ${TITLE_OF[id]} as read (their own word; it grants nothing)`);
  return { ok: true };
}
/** The check: marked here, never by the page. All six lessons are read first. The result is a count, not a qualification. */
export function answerCheck(w: S.Workspace, role: RoleKey, answers: unknown): Refusal | ({ ok: true } & CheckResult) {
  const persona = personaOf(role);
  if (!isChampion(role)) return deny(w, persona, 'site.start_checked', 'site:start', [`The ${ROLES[role].label} does not take the champion’s check.`]);
  const c = ch(w); const left = LESSONS.filter((l) => !c.start.read[l.id]);
  if (left.length) return { why: [`Read the lessons first: ${left.length} of ${LESSONS.length} ${left.length === 1 ? 'is' : 'are'} not marked as read (${left.map((l) => `“${l.title}”`).join(', ')}).`] };
  const r = mark(answers); if (!r) return { why: ['Answer every question, one choice each.'] };
  c.start.check = { at: new Date().toISOString(), score: r.score, of: r.of, passed: r.passed }; c.start.tries = Math.min(c.start.tries + 1, 999);
  // the result is the champion's own: the ledger, which other roles read, records that the check was taken and nothing about how it went
  log(w, persona, 'site.start_checked', 'site:start', `The champion’s check was taken (try ${c.start.tries}). The result is the champion’s own and is not written here; it is a check of understanding, not a qualification`);
  return { ok: true, ...r };
}
