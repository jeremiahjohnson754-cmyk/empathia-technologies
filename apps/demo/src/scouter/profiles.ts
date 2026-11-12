/**
 * Scouter proposals (V2.5.3 v25ScoutPropose/Send/Review/Publish/Stale/Adopt, restored 12 Nov 2026): a standard kit for a kind of room,
 * proposed from Scouter's own evaluations, sent to engineering review, approved or rejected by a role other than the one that proposed it,
 * published as a version, marked stale with a reason, and adopted into a Design a Space concept.
 *
 * What this build cannot back is not carried: V2.5.3 built its profiles from named makes, models and firmware in reference rooms; here a
 * profile names device classes only (the catalogue's), with the template's counts. No setting is pushed to any device; nothing is bought.
 * Pure functions; the page keeps the profiles in this browser.
 */
import type { RoleKey } from '../registry.types.js';
import type { Evaluation, Template } from './evaluate.js';

export type ProfileState = 'PROPOSED' | 'ENGINEERING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'STALE';
export const STATE_LABEL: Readonly<Record<ProfileState, { label: string; tone: 'ok' | 'warn' | 'bad' | 'muted' | 'info' }>> = {
  PROPOSED: { label: 'Proposed', tone: 'info' }, ENGINEERING_REVIEW: { label: 'In engineering review', tone: 'warn' }, APPROVED: { label: 'Approved', tone: 'ok' },
  REJECTED: { label: 'Rejected', tone: 'bad' }, PUBLISHED: { label: 'Published', tone: 'ok' }, STALE: { label: 'Stale', tone: 'muted' },
};
export interface KitLine { key: string; label: string; count: number; condition: string | null }
export interface ProfileEvent { at: string; by: RoleKey; to: ProfileState; note: string }
export interface Profile {
  id: string; roomKey: string; roomLabel: string; name: string; kit: KitLine[]; basis: string; expectedTests: string[];
  state: ProfileState; version: number | null; proposedBy: RoleKey; history: ProfileEvent[]; adopted: number;
}
export type Result<T> = { ok: true; value: T } | { ok: false; why: string };

const TESTS: Record<string, string> = {
  display: 'Display brightness and sightlines from the farthest seat', ledwall: 'LED wall uniformity and viewing distance', projector: 'Projected image brightness against the room light',
  camera: 'Framing check per preset with people in the seats', bar: 'Video bar framing and pickup at the far seats', micceil: 'Speech intelligibility (STIPA) at the far seats',
  mictable: 'Table microphone pickup at every seat', micwireless: 'Wireless frequency coordination and dropout walk', speaker: 'Loudspeaker level map at seat height, ±3 dB',
};
const now = () => new Date().toISOString();

/** A profile from Scouter's evaluations of one room template: the required classes that suit it, with the template's counts. */
export function propose(roomKey: string, tpl: Template, evals: readonly Evaluation[], by: RoleKey, seq: number): Result<Profile> {
  const fit = evals.filter((e) => e.checks.some((c) => c.id === 'required' && c.pass) && (e.verdict === 'SUITS' || e.verdict === 'SUITS_WITH_CONDITION'));
  if (!fit.length) return { ok: false, why: 'No required device class suits this room, so there is nothing to propose.' };
  const n = (k: string) => tpl.items.filter(([c]) => c === k).length;
  const kit = fit.map((e) => ({ key: e.key, label: e.label, count: Math.max(1, n(e.key)), condition: e.condition }));
  return { ok: true, value: {
    id: `SP-${String(seq).padStart(3, '0')}`, roomKey, roomLabel: tpl.label, name: `${tpl.label} · standard kit`, kit,
    basis: `Scouter's evaluation of the ${tpl.label.toLowerCase()} template (${tpl.dims.join(' × ')} m, ${tpl.occ} seats): device classes only, no makes or models`,
    expectedTests: [...new Set(kit.map((k) => TESTS[k.key]).filter(Boolean) as string[])], state: 'PROPOSED', version: null, proposedBy: by,
    history: [{ at: now(), by, to: 'PROPOSED', note: `${kit.length} classes from ${evals.length} evaluated` }], adopted: 0,
  } };
}
const move = (p: Profile, to: ProfileState, by: RoleKey, note: string, patch: Partial<Profile> = {}): Profile => ({ ...p, ...patch, state: to, history: [...p.history, { at: now(), by, to, note }] });

export function send(p: Profile, by: RoleKey): Result<Profile> {
  return p.state === 'PROPOSED' ? { ok: true, value: move(p, 'ENGINEERING_REVIEW', by, 'sent to engineering review') } : { ok: false, why: `It is ${STATE_LABEL[p.state].label.toLowerCase()}; only a proposed profile is sent to review.` };
}
/** What the reviewer must weigh: every condition Scouter attached; a kit with no capture or no display for a room that needs one. */
export function problems(p: Profile): string[] {
  return p.kit.filter((k) => k.condition).map((k) => `${k.label}: ${k.condition}`);
}
/** Approve or reject. Separation of duties: the role that proposed may not decide; a rejection needs its reason. */
export function review(p: Profile, decision: 'approve' | 'reject', by: RoleKey, reason: string): Result<Profile> {
  if (p.state !== 'ENGINEERING_REVIEW') return { ok: false, why: 'Only a profile in engineering review can be decided.' };
  if (by === p.proposedBy) return { ok: false, why: 'The role that proposed this profile cannot decide it. Another engineering role reviews it.' };
  if (decision === 'reject' && !reason.trim()) return { ok: false, why: 'A rejection says why.' };
  if (decision === 'approve' && problems(p).length && !reason.trim()) return { ok: false, why: 'This kit carries conditions; approving it says how they are handled.' };
  return { ok: true, value: move(p, decision === 'approve' ? 'APPROVED' : 'REJECTED', by, reason.trim() || 'approved') };
}
export function publish(p: Profile, by: RoleKey, all: readonly Profile[]): Result<Profile> {
  if (p.state !== 'APPROVED') return { ok: false, why: 'Only an approved profile is published.' };
  const v = Math.max(0, ...all.filter((x) => x.roomKey === p.roomKey && x.version != null).map((x) => x.version!)) + 1;
  return { ok: true, value: move(p, 'PUBLISHED', by, `published as version ${v}`, { version: v }) };
}
export function stale(p: Profile, by: RoleKey, reason: string): Result<Profile> {
  if (p.state !== 'APPROVED' && p.state !== 'PUBLISHED') return { ok: false, why: 'Only an approved or published profile goes stale.' };
  if (!reason.trim()) return { ok: false, why: 'Marking a profile stale says why.' };
  return { ok: true, value: move(p, 'STALE', by, reason.trim()) };
}
/** Adoption: only an approved or published profile; it returns the kit to carry into a concept. */
export function adoptable(p: Profile): Result<KitLine[]> {
  return p.state === 'APPROVED' || p.state === 'PUBLISHED' ? { ok: true, value: p.kit } : { ok: false, why: `It is ${STATE_LABEL[p.state].label.toLowerCase()}: only an approved or published profile can be adopted.` };
}
