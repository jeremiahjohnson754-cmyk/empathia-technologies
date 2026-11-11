/**
 * The organisation's edition of the manual, and the record kept against it (founder, §08 Product C: "Preserve standard revisions,
 * exception approvals, and compliance evidence").
 *
 * Rules that are code here:
 *  - THE EDITION. The manual's text is fixed in this demonstration. What an organisation owns is its edition: the values it has
 *    settled, each with its source, and its additions for a building. The person who holds the standard works on a copy; nothing
 *    in the copy is in force until a REVISION is adopted, with a note and a date to review it by. The earlier revision is kept,
 *    archived, with the values it had, so a room can be judged against the revision in force when its set was made.
 *    Adopting a revision is the organisation's act. It does not review the manual's text, which stays a draft (content.ts).
 *  - A SET OF REQUIREMENTS for a room (workflow.ts) is saved by a design role, with the revision it was made from. Each requirement
 *    is then found met or not met, in writing, by an engineering role OTHER than the one that saved the set. A requirement under an
 *    approved exception that is still in date reads as excepted. Saving a set approves nothing and changes no room's record.
 *  - AN EXCEPTION is asked for in writing (what, the technical reason, the risk, what reduces it, until when, the way back) and is
 *    decided, in writing, by an engineering role other than the one that asked. A rule the manual marks as never waived cannot be
 *    asked for at all (founder, 11 Nov 02:25: no waiver bypasses critical security, authorization, evidence integrity or mandatory
 *    safety; nobody approves their own). An approved exception past its date reads as LAPSED until it is closed.
 *  - Stored state is untrusted: anything of the wrong shape, or recorded by a role that could not have recorded it, reads as absent.
 * Every act, allowed or refused, writes one ledger line.
 *
 * ASSUMPTION awaiting the founder (docs/surpass/ENGINEERING_CHECKPOINT.md): the Product Architect holds the standard.
 */
import type { RoleKey } from '../registry.types.js';
import { ROLE_KEYS, ROLES, allows } from '../access/policy.js';
import { MAN_ROLES, isOwner } from './roles.js';
import type * as S from '../workspace/store.js';
import { roomById } from '../campus/canon.js';
import { deny, log, personaOf, type WX } from '../hardening/kit.js';
import { ALL_PRINCIPLES, principleById, valueById } from './content.js';
import { neverExcepted, type Generated, type HeldValue, type SiteAddition } from './workflow.js';
export { neverExcepted };

export const MAY_BUILD = { action: 'build.design' } as const; export const MAY_DECIDE = { action: 'design.decide' } as const;
export { MAN_ROLES, isOwner };

export type Refusal = { why: string[] };
export interface Revision { rev: number; at: string; by: RoleKey; note: string; reviewBy: string; state: 'IN_FORCE' | 'ARCHIVED'; values: Record<string, HeldValue>; siteAdds: SiteAddition[] }
export interface WorkingValue extends HeldValue { at: string; by: RoleKey }
export type ExceptionKind = 'temporary' | 'permanent';
export interface Exception {
  id: string; room: string; principle: string; kind: ExceptionKind; reason: string; risk: string; mitigation: string; wayBack: string;
  /** temporary: the day it ends. permanent: the day it is looked at again. */ until: string;
  at: string; by: RoleKey; decision: { at: string; by: RoleKey; approved: boolean; note: string } | null; closed: { at: string; by: RoleKey; note: string } | null;
}
export type ExceptionState = 'REQUESTED' | 'APPROVED' | 'REFUSED' | 'LAPSED' | 'CLOSED';
export interface Finding { met: boolean; note: string; at: string; by: RoleKey }
export interface SavedSet {
  id: string; room: string; roomName: string; rev: number; at: string; by: RoleKey; archetypeName: string; access: string[]; assumptions: string[];
  requirements: Array<{ id: string; origin: string; text: string; noWaiver: boolean }>; tests: string[]; gaps: number; findings: Record<string, Finding>;
}
export interface ManualState { revisions: Revision[]; values: Record<string, WorkingValue>; siteAdds: SiteAddition[]; exceptions: Exception[]; sets: SavedSet[] }

const DAY = 864e5;
const isDate = (x: unknown): x is string => typeof x === 'string' && !Number.isNaN(Date.parse(x));
const rec = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
const text = (s: unknown, n: number) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) : '');
const isRole = (x: unknown): x is RoleKey => typeof x === 'string' && (ROLE_KEYS as readonly string[]).includes(x);
const seedRevision = (seededAt: string): Revision => ({ rev: 1, at: seededAt, by: 'architect', note: 'First edition for this organisation, seeded with the demonstration. No value is set.', reviewBy: new Date(Date.parse(seededAt) + 180 * DAY).toISOString(), state: 'IN_FORCE', values: {}, siteAdds: [] });

const readValues = (v: unknown): Record<string, HeldValue> => { const out: Record<string, HeldValue> = {}; for (const [id, x] of Object.entries(rec(v))) { const r = rec(x); const value = text(r['value'], 60); const source = text(r['source'], 160); if (valueById(id) && value && source.length >= 8) out[id] = { value, source }; } return out; };
const readAdds = (v: unknown): SiteAddition[] => (Array.isArray(v) ? v : []).map(rec).filter((a) => /^SA-\d{3}$/.test(String(a['id'])) && typeof a['building'] === 'string' && principleById(String(a['principle'])) && text(a['text'], 300).length >= 12 && isDate(a['at']) && isRole(a['by']) && isOwner(a['by'])).slice(0, 40)
  .map((a) => ({ id: a['id'] as string, building: (a['building'] as string).slice(0, 8), principle: a['principle'] as string, text: text(a['text'], 300), at: a['at'] as string, by: a['by'] as string }));

type WM = WX & { manual?: ManualState };
/** Read without creating. */
export function manualView(w: S.Workspace | null): ManualState {
  const m = rec((w as WM | null)?.manual);
  const revs = (Array.isArray(m['revisions']) ? m['revisions'] : []).map(rec).filter((r) => isDate(r['at']) && isDate(r['reviewBy']) && text(r['note'], 300).length >= 12 && isRole(r['by']) && isOwner(r['by'])).slice(-24);
  const revisions: Revision[] = revs.length ? revs.map((r, i) => ({ rev: i + 1, at: r['at'] as string, by: r['by'] as RoleKey, note: text(r['note'], 300), reviewBy: r['reviewBy'] as string, state: i === revs.length - 1 ? 'IN_FORCE' as const : 'ARCHIVED' as const, values: readValues(r['values']), siteAdds: readAdds(r['siteAdds']) }))
    : [seedRevision(w?.seededAt && isDate(w.seededAt) ? w.seededAt : new Date(0).toISOString())];
  const values: Record<string, WorkingValue> = {};
  for (const [id, x] of Object.entries(rec(m['values']))) { const r = rec(x); const h = readValues({ [id]: r })[id]; if (h && isDate(r['at']) && isRole(r['by']) && isOwner(r['by'])) values[id] = { ...h, at: r['at'], by: r['by'] }; }
  const exceptions: Exception[] = (Array.isArray(m['exceptions']) ? m['exceptions'] : []).map(rec).filter((e) => /^EX-\d{4}$/.test(String(e['id'])) && roomById(String(e['room'])) && principleById(String(e['principle'])) && !neverExcepted(principleById(String(e['principle']))!)
    && (e['kind'] === 'temporary' || e['kind'] === 'permanent') && isDate(e['until']) && isDate(e['at']) && isRole(e['by']) && allows(MAY_BUILD, e['by']) && text(e['reason'], 400).length >= 20).slice(0, 60).map((e) => {
    const d = rec(e['decision']); const c = rec(e['closed']); const by = e['by'] as RoleKey;
    const decision = isDate(d['at']) && isRole(d['by']) && allows(MAY_DECIDE, d['by']) && d['by'] !== by && typeof d['approved'] === 'boolean' && text(d['note'], 400).length >= 12 ? { at: d['at'], by: d['by'], approved: d['approved'], note: text(d['note'], 400) } : null;
    const closed = decision?.approved && isDate(c['at']) && isRole(c['by']) && text(c['note'], 300).length >= 12 ? { at: c['at'], by: c['by'], note: text(c['note'], 300) } : null;
    return { id: e['id'] as string, room: e['room'] as string, principle: e['principle'] as string, kind: e['kind'] as ExceptionKind, reason: text(e['reason'], 400), risk: text(e['risk'], 300), mitigation: text(e['mitigation'], 300), wayBack: text(e['wayBack'], 300), until: e['until'] as string, at: e['at'] as string, by, decision, closed };
  });
  const sets: SavedSet[] = (Array.isArray(m['sets']) ? m['sets'] : []).map(rec).filter((s) => /^RS-\d{4}$/.test(String(s['id'])) && roomById(String(s['room'])) && Number.isInteger(s['rev']) && isDate(s['at']) && isRole(s['by']) && allows(MAY_BUILD, s['by']) && Array.isArray(s['requirements'])).slice(0, 40).map((s) => {
    const by = s['by'] as RoleKey; const requirements = (s['requirements'] as unknown[]).map(rec).filter((r) => typeof r['id'] === 'string' && typeof r['text'] === 'string').slice(0, 120).map((r) => ({ id: (r['id'] as string).slice(0, 12), origin: text(r['origin'], 10), text: text(r['text'], 700), noWaiver: r['noWaiver'] === true }));
    const findings: Record<string, Finding> = {};
    for (const [id, x] of Object.entries(rec(s['findings']))) { const f = rec(x); if (requirements.some((r) => r.id === id) && typeof f['met'] === 'boolean' && text(f['note'], 400).length >= 12 && isDate(f['at']) && isRole(f['by']) && allows(MAY_DECIDE, f['by']) && f['by'] !== by) findings[id] = { met: f['met'], note: text(f['note'], 400), at: f['at'], by: f['by'] }; }
    return { id: s['id'] as string, room: s['room'] as string, roomName: text(s['roomName'], 80), rev: s['rev'] as number, at: s['at'] as string, by, archetypeName: text(s['archetypeName'], 60), access: (Array.isArray(s['access']) ? s['access'] : []).filter((a): a is string => typeof a === 'string').slice(0, 8), assumptions: (Array.isArray(s['assumptions']) ? s['assumptions'] : []).map((a) => text(a, 200)).filter(Boolean).slice(0, 8),
      requirements, tests: (Array.isArray(s['tests']) ? s['tests'] : []).filter((t): t is string => typeof t === 'string').slice(0, 120), gaps: Number.isInteger(s['gaps']) ? Math.max(0, s['gaps'] as number) : 0, findings };
  });
  return { revisions, values, siteAdds: readAdds(m['siteAdds']), exceptions, sets };
}
const st = (w: S.Workspace): ManualState => { const v = manualView(w); (w as WM).manual = v; return v; };

export const inForce = (s: ManualState): Revision => s.revisions[s.revisions.length - 1]!;
export type Freshness = 'CURRENT' | 'DUE' | 'OVERDUE';
/** A revision is due for review in its last thirty days and overdue after its date. */
export function freshnessOf(s: ManualState, now: number): { state: Freshness; rev: Revision; days: number } {
  const rev = inForce(s); const days = Math.ceil((Date.parse(rev.reviewBy) - now) / DAY); return { state: days < 0 ? 'OVERDUE' : days <= 30 ? 'DUE' : 'CURRENT', rev, days };
}
/** What the working copy holds that the revision in force does not: values set or changed, additions made. */
export function pending(s: ManualState): { values: string[]; adds: string[] } {
  const r = inForce(s); return { values: Object.keys(s.values).filter((id) => r.values[id]?.value !== s.values[id]!.value || r.values[id]?.source !== s.values[id]!.source), adds: s.siteAdds.filter((a) => !r.siteAdds.some((x) => x.id === a.id)).map((a) => a.id) };
}

// ---------------------------------------------------------------------------------------------------- the edition (the owner's)
const ownerOnly = (w: S.Workspace, role: RoleKey, type: string, what: string): Refusal | null => (isOwner(role) ? null : deny(w, personaOf(role), type, 'manual', [`${what} is for the person who holds the standard (the ${MAN_ROLES.owner.map((r) => ROLES[r].label).join(' or ')}). The ${ROLES[role].label} does not.`]));

/** Settle one value in the working copy. It comes into force with the next revision. */
export function setValue(w: S.Workspace, role: RoleKey, id: string, value: string, source: string): Refusal | { ok: true } {
  const no = ownerOnly(w, role, 'manual.value_set', 'Settling a value'); if (no) return no;
  const def = valueById(id); if (!def) return { why: ['The manual names no such value.'] };
  const v = text(value, 60); const src = text(source, 160);
  if (!v) return { why: ['Write the value, with its unit.'] };
  if (src.length < 8) return { why: ['Say where the value comes from: the standard your organisation licenses, the maker’s specification, or your own measured baseline. A value without a source is not recorded.'] };
  const s = st(w); s.values[id] = { value: v, source: src, at: new Date().toISOString(), by: role };
  log(w, personaOf(role), 'manual.value_set', 'manual', `${def.name} was set in the working copy, with its source (${src.slice(0, 80)}). It is not in force until a revision is adopted`);
  return { ok: true };
}
/** Add a stricter requirement for one building. An addition tightens the manual and never loosens it: that is the reviewer's to judge; the product records who added what. */
export function addForSite(w: S.Workspace, role: RoleKey, building: string, principle: string, words: string): Refusal | { ok: true; id: string } {
  const no = ownerOnly(w, role, 'manual.site_addition', 'Adding a requirement for a building'); if (no) return no;
  const p = principleById(principle); if (!p) return { why: ['Name the rule the addition belongs to.'] };
  const b = text(building, 8); if (!b) return { why: ['Choose the building.'] };
  const t = text(words, 300); if (t.length < 12) return { why: ['Write the addition (at least 12 characters).'] };
  const s = st(w); if (s.siteAdds.length >= 40) return { why: ['Forty additions are already recorded.'] };
  const id = `SA-${String(s.siteAdds.length + 1).padStart(3, '0')}`; s.siteAdds.push({ id, building: b, principle, text: t, at: new Date().toISOString(), by: role });
  log(w, personaOf(role), 'manual.site_addition', 'manual', `${id}: an addition to ${principle} for ${b} was written in the working copy. It is not in force until a revision is adopted`);
  return { ok: true, id };
}
/** Adopt the working copy as the revision in force. The earlier revision is kept, archived, as it stood. */
export function adopt(w: S.Workspace, role: RoleKey, note: string, reviewInDays = 180): Refusal | { ok: true; rev: number } {
  const no = ownerOnly(w, role, 'manual.revision_adopted', 'Adopting a revision'); if (no) return no;
  const n = text(note, 300); if (n.length < 12) return { why: ['Say what changed and why (at least 12 characters). A revision nobody was told about counts as a failure.'] };
  if (!Number.isInteger(reviewInDays) || reviewInDays < 30 || reviewInDays > 730) return { why: ['Choose a review date between 30 days and two years away.'] };
  const s = st(w); if (s.revisions.length >= 24) return { why: ['Twenty-four revisions are kept in this demonstration.'] };
  const at = new Date(); const prev = inForce(s); const values: Record<string, HeldValue> = { ...prev.values }; for (const [id, v] of Object.entries(s.values)) values[id] = { value: v.value, source: v.source };
  const p = pending(s); prev.state = 'ARCHIVED';
  s.revisions.push({ rev: prev.rev + 1, at: at.toISOString(), by: role, note: n, reviewBy: new Date(at.getTime() + reviewInDays * DAY).toISOString(), state: 'IN_FORCE', values, siteAdds: s.siteAdds.map((a) => ({ ...a })) });
  log(w, personaOf(role), 'manual.revision_adopted', 'manual', `Revision ${prev.rev + 1} of the organisation’s edition was adopted (${p.values.length} values and ${p.adds.length} building additions brought into force; review in ${reviewInDays} days). Revision ${prev.rev} is archived as it stood. The manual’s own text was not reviewed by this act · ${n.slice(0, 100)}`);
  return { ok: true, rev: prev.rev + 1 };
}

// ---------------------------------------------------------------------------------------------------------------- exceptions
export function exceptionState(e: Exception, now: number): ExceptionState {
  if (e.closed) return 'CLOSED'; if (!e.decision) return 'REQUESTED'; if (!e.decision.approved) return 'REFUSED'; return Date.parse(e.until) < now ? 'LAPSED' : 'APPROVED';
}
/** The approved exception, still in date, that covers this rule in this room. */
export const covering = (s: ManualState, room: string, principle: string, now: number): Exception | undefined => s.exceptions.find((e) => e.room === room && e.principle === principle && exceptionState(e, now) === 'APPROVED');
export interface ExceptionRequest { room: string; principle: string; kind: ExceptionKind; reason: string; risk: string; mitigation: string; wayBack: string; until: string }
export function requestException(w: S.Workspace, role: RoleKey, x: ExceptionRequest, now = Date.now()): Refusal | { ok: true; id: string } {
  const persona = personaOf(role);
  if (!allows(MAY_BUILD, role)) return deny(w, persona, 'manual.exception_requested', 'manual', [`An exception is asked for by the people who design the room. The ${ROLES[role].label} does not.`]);
  const p = principleById(x.principle); if (!p) return { why: ['Name the rule the room would depart from.'] };
  const room = roomById(x.room); if (!room) return { why: ['Choose the room.'] };
  const never = neverExcepted(p); if (never) return deny(w, persona, 'manual.exception_requested', x.room, [`${p.id} is never excepted. ${never}`]);
  const why: string[] = []; const reason = text(x.reason, 400); const risk = text(x.risk, 300); const mitigation = text(x.mitigation, 300); const wayBack = text(x.wayBack, 300);
  if (reason.length < 20) why.push('Give the technical reason (at least 20 characters). Convenience, a deadline or a supplier’s preference is not, alone, a reason.');
  if (risk.length < 12) why.push('Say what the room risks by departing from the rule.');
  if (mitigation.length < 12) why.push('Say what reduces that risk.');
  if (x.kind !== 'temporary' && x.kind !== 'permanent') why.push('Say whether the exception is temporary or permanent.');
  if (x.kind === 'temporary' && wayBack.length < 12) why.push('A temporary exception says how the room returns to the standard.');
  const until = isDate(x.until) ? Date.parse(x.until) : NaN;
  if (Number.isNaN(until) || until <= now) why.push(x.kind === 'permanent' ? 'Give the date the exception is looked at again. It must be in the future.' : 'Give the date the exception ends. It must be in the future.');
  else if (until > now + 3 * 365 * DAY) why.push('Choose a date within three years. An exception is looked at again sooner than that.');
  if (why.length) return { why };
  const s = st(w); if (s.exceptions.length >= 60) return { why: ['Sixty exceptions are already recorded.'] };
  if (s.exceptions.some((e) => e.room === x.room && e.principle === x.principle && ['REQUESTED', 'APPROVED'].includes(exceptionState(e, now)))) return { why: [`An exception to ${p.id} for this room is already open.`] };
  const id = `EX-${String(s.exceptions.length + 1).padStart(4, '0')}`;
  s.exceptions.unshift({ id, room: x.room, principle: p.id, kind: x.kind, reason, risk, mitigation, wayBack, until: new Date(until).toISOString(), at: new Date().toISOString(), by: role, decision: null, closed: null });
  log(w, persona, 'manual.exception_requested', x.room, `${id}: a ${x.kind} exception to ${p.id} was asked for in ${room.name}, ${x.kind === 'permanent' ? 'to be looked at again on' : 'until'} ${new Date(until).toISOString().slice(0, 10)}. Nothing is approved`);
  return { ok: true, id };
}
export function decideException(w: S.Workspace, role: RoleKey, id: string, approved: boolean, note: string): Refusal | { ok: true } {
  const persona = personaOf(role);
  if (!allows(MAY_DECIDE, role)) return deny(w, persona, 'manual.exception_decided', id, [`An exception is decided by an engineer who may decide a design. The ${ROLES[role].label} cannot.`]);
  const s = st(w); const e = s.exceptions.find((x) => x.id === id); if (!e) return { why: ['There is no such exception.'] };
  if (e.decision) return { why: [`It was ${e.decision.approved ? 'approved' : 'refused'} by the ${ROLES[e.decision.by].label}.`] };
  if (e.by === role) return deny(w, persona, 'manual.exception_decided', id, [`The ${ROLES[role].label} asked for this exception, so another engineering role decides it. Nobody approves their own.`]);
  const n = text(note, 400); if (n.length < 12) return { why: ['Write the decision and its reason (at least 12 characters).'] };
  e.decision = { at: new Date().toISOString(), by: role, approved, note: n };
  log(w, persona, 'manual.exception_decided', id, `${id}: the exception to ${e.principle} in ${roomById(e.room)?.name || e.room} was ${approved ? 'approved' : 'refused'} by the ${ROLES[role].label} · ${n.slice(0, 120)}`);
  return { ok: true };
}
/** Close an approved exception: the room is back on the standard, or the exception is withdrawn. */
export function closeException(w: S.Workspace, role: RoleKey, id: string, note: string): Refusal | { ok: true } {
  const persona = personaOf(role);
  if (!allows(MAY_BUILD, role) && !allows(MAY_DECIDE, role)) return deny(w, persona, 'manual.exception_closed', id, [`Closing an exception is engineering work. The ${ROLES[role].label} cannot.`]);
  const s = st(w); const e = s.exceptions.find((x) => x.id === id); if (!e) return { why: ['There is no such exception.'] };
  if (e.closed) return { why: ['It is already closed.'] }; if (!e.decision?.approved) return { why: ['Only an approved exception is closed.'] };
  const n = text(note, 300); if (n.length < 12) return { why: ['Say how the room returned to the standard, or why the exception was withdrawn (at least 12 characters).'] };
  e.closed = { at: new Date().toISOString(), by: role, note: n };
  log(w, persona, 'manual.exception_closed', id, `${id}: the exception to ${e.principle} was closed · ${n.slice(0, 120)}`);
  return { ok: true };
}
/** Rules excepted often enough to ask whether the standard should change (rule E-06). Counted over approved exceptions, open or closed. */
export function repeated(s: ManualState, atLeast = 3): Array<{ principle: string; n: number }> {
  const n = new Map<string, number>(); for (const e of s.exceptions) if (e.decision?.approved) n.set(e.principle, (n.get(e.principle) || 0) + 1);
  return [...n].filter(([, c]) => c >= atLeast).map(([principle, c]) => ({ principle, n: c })).sort((a, b) => b.n - a.n || a.principle.localeCompare(b.principle));
}

// ------------------------------------------------------------------------------------------------- sets and compliance evidence
export function saveSet(w: S.Workspace, role: RoleKey, g: Generated): Refusal | { ok: true; id: string } {
  const persona = personaOf(role);
  if (!allows(MAY_BUILD, role)) return deny(w, persona, 'manual.set_saved', g.room, [`A set of requirements is saved by the people who design the room. The ${ROLES[role].label} does not.`]);
  if (!roomById(g.room)) return { why: ['Choose a room of the estate.'] }; if (!g.requirements.length) return { why: ['There is no requirement to save.'] };
  const s = st(w); if (s.sets.length >= 40) return { why: ['Forty sets are already saved.'] };
  const id = `RS-${String(s.sets.length + 1).padStart(4, '0')}`; const rev = inForce(s).rev;
  s.sets.unshift({ id, room: g.room, roomName: g.roomName, rev, at: new Date().toISOString(), by: role, archetypeName: g.archetypeName, access: [...g.access], assumptions: [...g.assumptions], requirements: g.requirements.map((r) => ({ id: r.id, origin: r.origin, text: r.text, noWaiver: !!r.noWaiver })), tests: g.template.map((t) => t.id), gaps: g.gaps.length, findings: {} });
  log(w, persona, 'manual.set_saved', g.room, `${id}: ${g.requirements.length} design requirements and a commissioning template of ${g.template.length} tests were saved for ${g.roomName}, from revision ${rev} (${g.gaps.length} gaps stated). Nothing was approved and the room’s record is unchanged`);
  return { ok: true, id };
}
/** Record, in writing, whether one requirement of a saved set is met. Not by the role that saved the set. */
export function recordFinding(w: S.Workspace, role: RoleKey, setId: string, requirement: string, met: boolean, note: string): Refusal | { ok: true } {
  const persona = personaOf(role);
  if (!allows(MAY_DECIDE, role)) return deny(w, persona, 'manual.finding_recorded', setId, [`Whether a requirement is met is an engineer’s finding. The ${ROLES[role].label} cannot record one.`]);
  const s = st(w); const set = s.sets.find((x) => x.id === setId); if (!set) return { why: ['There is no such set.'] };
  if (set.by === role) return deny(w, persona, 'manual.finding_recorded', setId, [`The ${ROLES[role].label} saved this set, so another engineering role reviews it. Nobody reviews their own.`]);
  const r = set.requirements.find((x) => x.id === requirement); if (!r) return { why: ['The set has no such requirement.'] };
  const n = text(note, 400); if (n.length < 12) return { why: ['Write what was seen (at least 12 characters): the drawing, the sheet or the record that shows it.'] };
  set.findings[requirement] = { met, note: n, at: new Date().toISOString(), by: role };
  log(w, persona, 'manual.finding_recorded', setId, `${setId}: ${requirement} was found ${met ? 'met' : 'NOT met'} for ${set.roomName} by the ${ROLES[role].label} · ${n.slice(0, 120)}`);
  return { ok: true };
}
export type RowState = 'OPEN' | 'MET' | 'NOT_MET' | 'EXCEPTED';
/** A requirement's standing: an approved exception in date covers it; otherwise the reviewer's finding; otherwise open. A never-waived rule is never excepted. */
export function rowState(s: ManualState, set: SavedSet, requirement: string, now: number): RowState {
  const r = set.requirements.find((x) => x.id === requirement); const f = set.findings[requirement];
  if (f?.met) return 'MET'; if (r && !r.noWaiver && covering(s, set.room, requirement, now)) return 'EXCEPTED'; return f ? 'NOT_MET' : 'OPEN';
}
export type SetState = 'IN_REVIEW' | 'NOT_MET' | 'REVIEWED';
export function setState(s: ManualState, set: SavedSet, now: number): { state: SetState; met: number; excepted: number; notMet: number; open: number } {
  const c = { met: 0, excepted: 0, notMet: 0, open: 0 };
  for (const r of set.requirements) { const k = rowState(s, set, r.id, now); if (k === 'MET') c.met++; else if (k === 'EXCEPTED') c.excepted++; else if (k === 'NOT_MET') c.notMet++; else c.open++; }
  return { state: c.notMet ? 'NOT_MET' : c.open ? 'IN_REVIEW' : 'REVIEWED', ...c };
}
/** How many of the manual's rules are never waived: for the page, and a test that the marking has not been thinned. */
export const neverWaived = () => ALL_PRINCIPLES.filter((p) => neverExcepted(p)).map((p) => p.id);
