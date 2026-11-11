/**
 * What is recorded about the demonstration's one new starter, and who may record it (see roles.ts). Kept in the shared workspace so
 * the manager, the mentor and the starter see the same record, with one ledger line for every act, allowed or refused.
 *
 * Rules that are code here:
 *  - An item is done by whoever its `confirm` names, and by nobody else: the starter's own word, a passed check (marked here, never
 *    by a page), the mentor, or the manager. A starter cannot confirm a mentor's or a manager's item; a manager cannot mark the
 *    starter's learning as done.
 *  - A review is the manager's record of a conversation: five ratings and a note. It can be written while items are open; the page
 *    shows which. A MILESTONE is never clicked: it is met when every item of its phase is done and its review is recorded.
 *  - Publishing is the administrator's: a revision with a note and a date to review it by. The earlier revision is kept as archived.
 *    The programme's text is fixed in this demonstration; publishing records a revision, it does not edit one.
 *  - Stored state is untrusted: anything of the wrong shape reads as empty.
 */
import type { RoleKey } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import type * as S from '../workspace/store.js';
import { deny, log, personaOf, type WX } from '../hardening/kit.js';
import { CHECKS, COMPETENCIES, ITEMS, PHASES, REVIEWS, checkById, itemById, markCheck, type Item, type Phase, type Rating } from './program.js';
import { isAdministrator, isManager, isMentor, isStarter, seesProgress } from './roles.js';

export type Refusal = { why: string[] };
export interface Done { at: string; by: RoleKey; note: string }
export interface Review { at: string; ratings: Record<string, Rating>; note: string }
export interface Revision { rev: number; at: string; by: RoleKey; note: string; reviewBy: string; state: 'PUBLISHED' | 'ARCHIVED' }
export interface ObState { done: Record<string, Done>; checks: Record<string, { at: string; score: number; of: number; passed: boolean; tries: number }>; reviews: Record<string, Review>; revisions: Revision[] }
const DAY = 864e5;
/** The guide as first published in the demonstration: one revision, due for review 180 days after the workspace was seeded. */
const seedRevision = (seededAt: string): Revision => ({ rev: 1, at: seededAt, by: 'architect', note: 'First publication for this organisation (seeded with the demonstration).', reviewBy: new Date(Date.parse(seededAt) + 180 * DAY).toISOString(), state: 'PUBLISHED' });
const isDate = (x: unknown): x is string => typeof x === 'string' && !Number.isNaN(Date.parse(x));
const rec = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, unknown>;

type WO = WX & { ob?: ObState };
/** Read without creating. Unknown items, checks and reviews are dropped, and so is anything recorded by a role that could not have. */
export function obView(w: S.Workspace | null): ObState {
  const o = rec((w as WO | null)?.ob); const out: ObState = { done: {}, checks: {}, reviews: {}, revisions: [] };
  for (const [id, v] of Object.entries(rec(o['done']))) { const it = itemById(id); const d = rec(v); if (!it || !isDate(d['at']) || typeof d['by'] !== 'string' || !mayComplete(d['by'] as RoleKey, it)) continue; out.done[id] = { at: d['at'], by: d['by'] as RoleKey, note: typeof d['note'] === 'string' ? d['note'].slice(0, 300) : '' }; }
  for (const [id, v] of Object.entries(rec(o['checks']))) { const c = checkById(id); const k = rec(v); if (!c || !isDate(k['at']) || !Number.isInteger(k['score']) || k['of'] !== c.questions.length || (k['score'] as number) < 0 || (k['score'] as number) > c.questions.length) continue;
    out.checks[id] = { at: k['at'], score: k['score'] as number, of: c.questions.length, passed: k['score'] === c.questions.length, tries: Number.isInteger(k['tries']) && (k['tries'] as number) > 0 ? Math.min(k['tries'] as number, 999) : 1 }; }
  for (const [id, v] of Object.entries(rec(o['reviews']))) { const r = rec(v); if (!REVIEWS.includes(id) || !isDate(r['at'])) continue; const ratings: Record<string, Rating> = {};
    for (const c of COMPETENCIES) { const x = rec(r['ratings'])[c.id]; if (x === 0 || x === 1 || x === 2) ratings[c.id] = x; } if (Object.keys(ratings).length !== COMPETENCIES.length) continue;
    out.reviews[id] = { at: r['at'], ratings, note: typeof r['note'] === 'string' ? r['note'].slice(0, 600) : '' }; }
  const revs = Array.isArray(o['revisions']) ? o['revisions'].map(rec).filter((r) => Number.isInteger(r['rev']) && isDate(r['at']) && isDate(r['reviewBy']) && typeof r['note'] === 'string' && typeof r['by'] === 'string' && isAdministrator(r['by'] as RoleKey)) : [];
  out.revisions = revs.length ? revs.map((r, i) => ({ rev: i + 1, at: r['at'] as string, by: r['by'] as RoleKey, note: (r['note'] as string).slice(0, 300), reviewBy: r['reviewBy'] as string, state: i === revs.length - 1 ? 'PUBLISHED' as const : 'ARCHIVED' as const })).slice(-24) : [seedRevision(w?.seededAt && isDate(w.seededAt) ? w.seededAt : new Date(0).toISOString())];
  // a check that is passed is what completes its item: the two are never stored apart
  for (const it of ITEMS) if (it.confirm === 'check') { const k = it.check ? out.checks[it.check] : undefined; if (k?.passed) out.done[it.id] = { at: k.at, by: 'service', note: '' }; else delete out.done[it.id]; }
  return out;
}
const ob = (w: S.Workspace): ObState => { const v = obView(w); (w as WO).ob = v; return v; };

/** May this role be the one who completes this item? */
export function mayComplete(role: RoleKey, it: Item): boolean {
  return it.confirm === 'manager' ? isManager(role) : it.confirm === 'mentor' ? isMentor(role) : isStarter(role);
}
const WHO: Record<Item['confirm'], string> = { self: 'the starter', check: 'the starter, by passing its check', mentor: 'the mentor', manager: 'the manager' };

/** Mark an item done: the starter's own word, or the mentor's or manager's confirmation, as the item says. */
export function completeItem(w: S.Workspace, role: RoleKey, id: string, note = ''): Refusal | { ok: true } {
  const persona = personaOf(role); const it = itemById(id); if (!it) return { why: ['There is no such item in the programme.'] };
  if (it.kind === 'review') return { why: ['A review is recorded with its ratings, not ticked.'] };
  if (it.confirm === 'check') return deny(w, persona, 'onboard.item_done', id, ['This item is done by passing its check. Nobody ticks it.']);
  if (!mayComplete(role, it)) return deny(w, persona, 'onboard.item_done', id, [`“${it.title}” is confirmed by ${WHO[it.confirm]}. The ${ROLES[role].label} cannot say it is done.`]);
  const text = note.trim(); if (text.length > 300) return { why: ['Keep the note under 300 characters.'] };
  if (it.confirm === 'mentor' && it.kind === 'exercise' && text.length < 12) return { why: ['Say in a sentence what you saw and what to work on next (at least 12 characters). An exercise is confirmed with its feedback.'] };
  const s = ob(w); if (s.done[id]) return { ok: true };
  s.done[id] = { at: new Date().toISOString(), by: role, note: text };
  log(w, persona, 'onboard.item_done', id, `“${it.title}” ${it.confirm === 'self' ? 'marked done by the starter (their own word)' : `confirmed by ${WHO[it.confirm]}`}${text ? ` · ${text.slice(0, 120)}` : ''}`);
  return { ok: true };
}
/** A knowledge check, marked here. Only the starter takes it; the result is a count. */
export function takeCheck(w: S.Workspace, role: RoleKey, id: string, answers: unknown): Refusal | { ok: true; score: number; of: number; passed: boolean; wrong: number[] } {
  const persona = personaOf(role); const c = checkById(id); if (!c) return { why: ['There is no such check.'] };
  if (!isStarter(role)) return deny(w, persona, 'onboard.check_taken', id, [`The check is the starter’s own. The ${ROLES[role].label} does not take it for them.`]);
  const r = markCheck(id, answers); if (!r) return { why: ['Answer every question, one choice each.'] };
  const s = ob(w); const tries = (s.checks[id]?.tries ?? 0) + 1; s.checks[id] = { at: new Date().toISOString(), score: r.score, of: r.of, passed: r.passed, tries: Math.min(tries, 999) }; (w as WO).ob = obView(w);
  log(w, persona, 'onboard.check_taken', id, `Check “${c.title}”: ${r.score} of ${r.of}, ${r.passed ? 'passed' : 'not passed'} (try ${tries}; a count of right answers, not a qualification)`);
  return { ok: true, ...r };
}
/** A review: the manager's record of a conversation at the end of the first week, and at thirty, sixty and ninety days. */
export function recordReview(w: S.Workspace, role: RoleKey, id: string, ratings: unknown, note: string): Refusal | { ok: true } {
  const persona = personaOf(role); const it = itemById(id); if (!it || it.kind !== 'review') return { why: ['There is no such review.'] };
  if (!isManager(role)) return deny(w, persona, 'onboard.review_recorded', id, [`A review is written by the starter’s manager. The ${ROLES[role].label} cannot record one${isStarter(role) ? ', and nobody rates themselves' : ''}.`]);
  const r = rec(ratings); const clean: Record<string, Rating> = {}; for (const c of COMPETENCIES) { const x = r[c.id]; if (x !== 0 && x !== 1 && x !== 2) return { why: [`Give a rating for “${c.title}”.`] }; clean[c.id] = x; }
  const text = note.trim(); if (text.length < 12) return { why: ['Say in a sentence what was agreed (at least 12 characters).'] }; if (text.length > 600) return { why: ['Keep the note under 600 characters.'] };
  ob(w).reviews[id] = { at: new Date().toISOString(), ratings: clean, note: text };
  log(w, persona, 'onboard.review_recorded', id, `“${it.title}” recorded by the manager (five ratings and a note; the note is shown to the starter and the manager only)`);
  return { ok: true };
}
/** Publish a revision of the guide for this organisation. The earlier one is kept, archived. */
export function publish(w: S.Workspace, role: RoleKey, note: string, reviewInDays = 180): Refusal | { ok: true; rev: number } {
  const persona = personaOf(role);
  if (!isAdministrator(role)) return deny(w, persona, 'onboard.published', 'onboard:guide', [`Publishing the guide is the administrator’s. The ${ROLES[role].label} cannot publish a revision.`]);
  const text = note.trim(); if (text.length < 12) return { why: ['Say what changed in this revision (at least 12 characters).'] }; if (text.length > 300) return { why: ['Keep the note under 300 characters.'] };
  if (!Number.isInteger(reviewInDays) || reviewInDays < 30 || reviewInDays > 365) return { why: ['Set a review date between 30 and 365 days away.'] };
  const s = ob(w); const at = new Date().toISOString(); s.revisions = [...s.revisions.map((r) => ({ ...r, state: 'ARCHIVED' as const })), { rev: s.revisions.length + 1, at, by: role, note: text, reviewBy: new Date(Date.parse(at) + reviewInDays * DAY).toISOString(), state: 'PUBLISHED' as const }].slice(-24);
  const rev = s.revisions[s.revisions.length - 1]!.rev;
  log(w, persona, 'onboard.published', 'onboard:guide', `Revision ${rev} of the IT Onboarding Success Guide published for this organisation; to be reviewed within ${reviewInDays} days · ${text.slice(0, 120)}`);
  return { ok: true, rev };
}

// ------------------------------------------------------------------------------------------------------------ what is derived
export type Freshness = 'CURRENT' | 'DUE' | 'STALE';
/** Is the published revision still inside its review date? DUE in the last thirty days before it; STALE after. */
export function freshnessOf(s: ObState, now: number): { state: Freshness; rev: Revision; days: number } {
  const rev = s.revisions[s.revisions.length - 1]!; const days = Math.ceil((Date.parse(rev.reviewBy) - now) / DAY);
  return { state: days < 0 ? 'STALE' : days <= 30 ? 'DUE' : 'CURRENT', rev, days };
}
export interface PhaseView { phase: Phase; title: string; when: string; aim: string; items: Array<{ item: Item; done: Done | null }>; done: number; total: number; review: string | null; reviewed: boolean; /** every item done and, where the phase has one, its review recorded */ met: boolean }
export function phases(s: ObState): PhaseView[] {
  return PHASES.map((p) => { const items = ITEMS.filter((i) => i.phase === p.id).map((item) => ({ item, done: item.kind === 'review' ? (s.reviews[item.id] ? { at: s.reviews[item.id]!.at, by: 'svcmgr' as RoleKey, note: '' } : null) : s.done[item.id] || null }));
    const review = items.find((x) => x.item.kind === 'review')?.item.id || null; const done = items.filter((x) => x.done).length;
    return { phase: p.id, title: p.title, when: p.when, aim: p.aim, items, done, total: items.length, review, reviewed: review ? !!s.reviews[review] : true, met: done === items.length }; });
}
/** What an administrator is shown: counts, never a note, a rating or an answer. */
export function report(s: ObState): { items: { done: number; total: number }; checks: { passed: number; total: number }; reviews: { recorded: number; total: number }; milestones: { met: number; total: number }; byPhase: Array<{ phase: Phase; title: string; done: number; total: number; met: boolean }> } {
  const ph = phases(s);
  return { items: { done: ph.reduce((n, p) => n + p.done, 0), total: ITEMS.length }, checks: { passed: CHECKS.filter((c) => s.checks[c.id]?.passed).length, total: CHECKS.length }, reviews: { recorded: REVIEWS.filter((r) => s.reviews[r]).length, total: REVIEWS.length },
    milestones: { met: ph.filter((p) => p.met).length, total: ph.length }, byPhase: ph.map((p) => ({ phase: p.phase, title: p.title, done: p.done, total: p.total, met: p.met })) };
}
/**
 * The record as one role may see it: the single place personal detail is cut down. The starter and the manager see everything; the
 * mentor sees the items a mentor confirms and whether the others are done, with no review; the administrator and every other
 * reader of the programme see no person's progress at all (the administrator gets `report`).
 */
export function viewFor(role: RoleKey, s: ObState): ObState {
  const sees = seesProgress(role);
  if (sees === 'own' || sees === 'manager') return s;
  if (sees === 'mentor') return { done: Object.fromEntries(Object.entries(s.done).map(([id, d]) => [id, itemById(id)?.confirm === 'mentor' ? d : { ...d, note: '' }])), checks: Object.fromEntries(Object.entries(s.checks).map(([id, k]) => [id, { ...k, score: k.passed ? k.of : 0, tries: 0 }])), reviews: {}, revisions: s.revisions };
  return { done: {}, checks: {}, reviews: {}, revisions: s.revisions };
}
