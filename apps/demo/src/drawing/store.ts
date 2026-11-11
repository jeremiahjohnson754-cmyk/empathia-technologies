/**
 * The record of a drawing review, and the engineer's part in it (founder, §10: "Human engineers must approve consequential designs
 * and commissioning conclusions").
 *
 *  - Saving a review records what was read and found, with the documents by name, revision and a fingerprint of their text. The
 *    documents themselves are not kept in the shared record.
 *  - A blocker (a contradiction between documents, an overlap, an unknown scale, required equipment missing) is settled only by an
 *    engineer's written decision. The decision does not edit the finding: both stand in the record, and the finding then reads as
 *    VERIFIED by that person.
 *  - Approval needs every blocker decided, and comes from a role other than the one that saved the review. It approves the REVIEW,
 *    as read from these documents; it installs nothing, changes no room's record and is not a design release.
 * Who may do which is V2.5.3's own: `build.design` to read and save a drawing, `design.decide` to decide and approve.
 */
import type { RoleKey } from '../registry.types.js';
import { ROLES, allows } from '../access/policy.js';
import type * as S from '../workspace/store.js';
import { deny, log, personaOf, type WX } from '../hardening/kit.js';
import type { Doc } from './read.js';
import type { Finding } from './review.js';

export const MAY_REVIEW = { action: 'build.design' } as const; export const MAY_DECIDE = { action: 'design.decide' } as const;
export interface Decision { finding: string; at: string; by: RoleKey; note: string }
export interface SavedReview {
  id: string; name: string; at: string; by: RoleKey; revision: string; docs: Array<{ id: string; name: string; kind: Doc['kind']; revision: string; fingerprint: string }>;
  roomType: string | null; room: { width: number; length: number } | null; scale: 'EXTRACTED' | 'OBSERVED' | null; devices: number;
  findings: Finding[]; notReviewed: string[]; assumptions: string[]; checklist: Array<{ id: string; label: string }>; decisions: Decision[]; approval: { at: string; by: RoleKey } | null;
}
export const fingerprint = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return `${h.toString(36)}-${s.length}`; };
const isDate = (x: unknown): x is string => typeof x === 'string' && !Number.isNaN(Date.parse(x));
type WD = WX & { di?: { reviews: SavedReview[] } };
/** Stored reviews, read as untrusted: a decision or an approval by a role that could not have made it is dropped. */
export function reviewsOf(w: S.Workspace | null): SavedReview[] {
  const list = (w as WD | null)?.di?.reviews; if (!Array.isArray(list)) return [];
  return list.filter((r) => r && /^DR-\d{4}$/.test(String(r.id)) && typeof r.name === 'string' && isDate(r.at) && Array.isArray(r.findings) && Array.isArray(r.docs) && allows(MAY_REVIEW, r.by)).slice(0, 40).map((r) => {
    const decisions = (Array.isArray(r.decisions) ? r.decisions : []).filter((d) => d && isDate(d.at) && typeof d.note === 'string' && d.note.trim().length >= 12 && allows(MAY_DECIDE, d.by) && r.findings.some((f) => f.id === d.finding));
    const open = r.findings.filter((f) => f.blocker && !decisions.some((d) => d.finding === f.id)); const a = r.approval;
    return { ...r, decisions, approval: a && isDate(a.at) && allows(MAY_DECIDE, a.by) && a.by !== r.by && open.length === 0 ? a : null }; });
}
export const openBlockers = (r: SavedReview): Finding[] => r.findings.filter((f) => f.blocker && !r.decisions.some((d) => d.finding === f.id));
export type ReviewState = 'NEEDS_DECISIONS' | 'READY_FOR_APPROVAL' | 'APPROVED';
export const stateOf = (r: SavedReview): ReviewState => (r.approval ? 'APPROVED' : openBlockers(r).length ? 'NEEDS_DECISIONS' : 'READY_FOR_APPROVAL');
/** How a finding is known once the record is taken into account: a decided finding is VERIFIED by the person who decided it. */
export const classOf = (r: SavedReview, f: Finding) => (r.decisions.some((d) => d.finding === f.id) ? 'VERIFIED' as const : f.cls);

export type Refusal = { why: string[] };
export interface ReviewInput { name: string; revision: string; docs: readonly Doc[]; roomType: string | null; room: { width: number; length: number } | null; scale: 'EXTRACTED' | 'OBSERVED' | null; devices: number; findings: Finding[]; notReviewed: string[]; assumptions: string[]; checklist: Array<{ id: string; label: string }> }
export function saveReview(w: S.Workspace, role: RoleKey, x: ReviewInput): Refusal | SavedReview {
  const persona = personaOf(role);
  if (!allows(MAY_REVIEW, role)) return deny(w, persona, 'drawing.review_saved', 'drawing', [`The ${ROLES[role].label} does not review drawings. It is design work.`]);
  const name = x.name.replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 80); if (!name) return { why: ['Name the package, so the review can be found again.'] };
  if (!x.docs.length) return { why: ['There is no document to review.'] };
  const wd = w as WD; const list = (wd.di ||= { reviews: [] }).reviews = reviewsOf(w); if (list.length >= 40) return { why: ['Forty reviews are already saved.'] };
  const r: SavedReview = { id: `DR-${String(list.length + 1).padStart(4, '0')}`, name, at: new Date().toISOString(), by: role, revision: x.revision.slice(0, 12), docs: x.docs.map((d) => ({ id: d.id, name: d.name.slice(0, 80), kind: d.kind, revision: d.revision, fingerprint: fingerprint(d.text) })),
    roomType: x.roomType, room: x.room, scale: x.scale, devices: x.devices, findings: x.findings.slice(0, 80), notReviewed: x.notReviewed.slice(0, 10), assumptions: x.assumptions.slice(0, 10), checklist: x.checklist.slice(0, 80), decisions: [], approval: null };
  list.unshift(r); const b = r.findings.filter((f) => f.blocker).length;
  log(w, persona, 'drawing.review_saved', r.id, `${r.id}: review of ${r.name}, revision ${r.revision || 'not stated'} (${r.docs.length} documents, ${r.devices} devices, ${r.findings.length} findings, ${b} for an engineer to decide). Nothing was approved`);
  return r;
}
/** An engineer's written decision on one finding. It settles the finding without changing it. */
export function decide(w: S.Workspace, role: RoleKey, reviewId: string, findingId: string, note: string): Refusal | { ok: true } {
  const persona = personaOf(role);
  if (!allows(MAY_DECIDE, role)) return deny(w, persona, 'drawing.decided', reviewId, [`A decision on a drawing is an engineer’s. The ${ROLES[role].label} cannot make one.`]);
  const list = ((w as WD).di ||= { reviews: [] }).reviews = reviewsOf(w); const r = list.find((x) => x.id === reviewId); if (!r) return { why: ['There is no such review.'] };
  if (r.approval) return { why: ['The review is approved. A new decision needs a new review.'] };
  const f = r.findings.find((x) => x.id === findingId); if (!f) return { why: ['There is no such finding in this review.'] };
  const text = note.replace(/[\u0000-\u001f<>]/g, ' ').trim(); if (text.length < 12) return { why: ['Write what was decided and why (at least 12 characters).'] }; if (text.length > 400) return { why: ['Keep the decision under 400 characters.'] };
  r.decisions = [...r.decisions.filter((d) => d.finding !== findingId), { finding: findingId, at: new Date().toISOString(), by: role, note: text }];
  log(w, persona, 'drawing.decided', reviewId, `${reviewId}: the ${ROLES[role].label} decided “${f.text.slice(0, 90)}” · ${text.slice(0, 120)}`);
  return { ok: true };
}
/** Approve the review. Every blocker has a decision, and the approver's role is not the one that saved it. */
export function approve(w: S.Workspace, role: RoleKey, reviewId: string): Refusal | { ok: true } {
  const persona = personaOf(role);
  if (!allows(MAY_DECIDE, role)) return deny(w, persona, 'drawing.approved', reviewId, [`Approving a drawing review is an engineer’s. The ${ROLES[role].label} cannot.`]);
  const list = ((w as WD).di ||= { reviews: [] }).reviews = reviewsOf(w); const r = list.find((x) => x.id === reviewId); if (!r) return { why: ['There is no such review.'] };
  if (r.approval) return { why: [`The review was approved by the ${ROLES[r.approval.by].label}.`] };
  if (r.by === role) return deny(w, persona, 'drawing.approved', reviewId, [`The ${ROLES[role].label} saved this review, so another engineering role approves it. Nobody approves their own.`]);
  const open = openBlockers(r); if (open.length) return deny(w, persona, 'drawing.approved', reviewId, [`${open.length} ${open.length === 1 ? 'finding still needs' : 'findings still need'} an engineer’s decision: ${open.slice(0, 3).map((f) => f.text.slice(0, 70)).join(' · ')}${open.length > 3 ? ' …' : ''}`]);
  r.approval = { at: new Date().toISOString(), by: role };
  log(w, persona, 'drawing.approved', reviewId, `${reviewId}: the review of ${r.name} was approved by the ${ROLES[role].label}, as read from ${r.docs.length} documents. It is not a design release and changes no room’s record`);
  return { ok: true };
}
