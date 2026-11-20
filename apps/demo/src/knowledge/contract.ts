/**
 * The knowledge contract (founder's directive of 11 Nov 2026, §07–§09). One definition of a knowledge object, of who may read it and of
 * how far it may be trusted, shared by everything that stores, searches, cites or teaches knowledge: the Technical Knowledge Ledger,
 * the three publications (IT Onboarding Success Guide, End User Success & Training Guide, AV Engineering Standards & Design Manual),
 * Search Party, Ask Empathia and the learning products. This file is owned by the integrator: lanes import it and do not redefine it.
 *
 * Three rules are code here, not prose:
 *  1. Trust zones. "Empathia must not automatically combine private customer information into one universally accessible database."
 *     Every object is in exactly one of five zones. A tenant-private object is readable only inside its own tenant, by a reader the
 *     source lets read it; nothing a reader may not read reaches them as a result, a snippet, a summary, a citation, a count or a
 *     related-object line (`mayRead` is the single test, and `redactFor` is how a list is cut down).
 *  2. Promotion. A zone-5 object (an unverified observation or an AI-generated candidate) is "never silently promoted": `promote`
 *     refuses without a named human reviewer of the right kind, and a tenant-private object becomes shared only with the tenant's
 *     recorded consent, anonymised, and reviewed.
 *  3. Authority. When two sources disagree the higher in the founder's ten-step hierarchy wins and the other is shown as superseded,
 *     never hidden (`compareAuthority`). An approved object past its review date is stale and says so (`freshness`).
 *
 * Pure: no storage, no clock (the caller passes `asOf`), no rendering. Everything in the demonstration is synthetic.
 */
import type { RoleKey } from '../registry.types.js';

/** §07 "separate knowledge trust zones". */
export type TrustZone = 1 | 2 | 3 | 4 | 5;
export const ZONES: Readonly<Record<TrustZone, { name: string; holds: string; readers: string }>> = {
  1: { name: 'Public or licensed', holds: 'Official documentation, permitted vendor material, founder-owned approved content and approved public references', readers: 'Everyone' },
  2: { name: 'Empathia-authored, reviewed', holds: 'Original explanations, diagrams, simulations, methods and approved procedures', readers: 'Everyone' },
  3: { name: 'Tenant-private', holds: 'A customer’s own standards, incidents, contacts, room records, procedures and documents', readers: 'That customer only, and only those its source lets read it' },
  4: { name: 'Shared with consent', holds: 'A customer contribution released for wider use: agreed, anonymised and reviewed', readers: 'Everyone' },
  5: { name: 'Unverified', holds: 'Observations and AI-generated candidates awaiting review', readers: 'Reviewers of the owning tenant; shown to others never as fact' },
};

/** §07 "source quality hierarchy": 1 is the strongest. */
export type SourceAuthority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export const AUTHORITIES: Readonly<Record<SourceAuthority, string>> = {
  1: 'Law or mandatory regulation', 2: 'Licensed, current standard from a standards body', 3: 'Official manufacturer documentation',
  4: 'Approved organisational engineering standard', 5: 'Verified laboratory or field measurement', 6: 'Expert-reviewed internal procedure',
  7: 'Documented operational evidence', 8: 'Model or simulation, labelled as such', 9: 'Unverified community submission', 10: 'Unreviewed AI-generated suggestion',
};

export type ContentType = 'concept' | 'term' | 'reference-card' | 'diagram' | 'calculation' | 'decision-tree' | 'procedure' | 'case-study' | 'failure-pattern' | 'reference-architecture' | 'lesson' | 'exercise' | 'assessment' | 'standard' | 'chapter';
export type ApprovalState = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SUPERSEDED' | 'ARCHIVED';
/** What may be done with the source's own text. `metadata-only`: title, number, applicability and an authorised link may be stored; the text may not (§07: "Do not reproduce copyrighted standards without proper licensing"). */
export type UseRights = 'empathia-original' | 'founder-owned' | 'licensed-reproduction' | 'metadata-only' | 'tenant-owned' | 'tenant-shared-with-consent' | 'unknown';

/** Where a statement came from, exactly enough to open it again. */
export interface SourceRef {
  /** the system or document: 'empathia', 'sharepoint:<site>/<library>/<path>', 'standard:<body> <number>', 'manufacturer:<doc id>' */
  system: string; title: string; version: string | null; authority: SourceAuthority; rights: UseRights;
  /** an authorised link, when one may be given; never a guessed address */ link?: string;
  /** how the statement was obtained from the source (§10's ladder, used wherever a machine read something) */
  derivation?: 'OBSERVED' | 'EXTRACTED' | 'MODELED' | 'INFERRED' | 'VERIFIED' | 'APPROVED'; confidence?: number;
}

/** Who may see an object beyond its zone: the source's own access list, carried with the object and re-checked on every read. */
export interface Acl {
  /** roles that may read; empty means every role inside the audience the zone allows */ roles: readonly RoleKey[];
  /** directory groups (for imported documents): a reader needs at least one, when any are named */ groups: readonly string[];
}

/** §07 "knowledge object schema". Optional fields are those that do not apply to every content type. */
export interface KnowledgeObject {
  id: string; title: string; topic: string; domain: string; contentType: ContentType;
  difficulty: 'foundation' | 'practitioner' | 'advanced'; audience: string; roles: readonly RoleKey[]; objectives: readonly string[];
  zone: TrustZone; /** the owning tenant; null only for zones 1 and 2 */ tenant: string | null; acl: Acl;
  sources: readonly SourceRef[]; state: ApprovalState;
  reviewer: string | null; reviewedOn: string | null; /** the next review is due on this day (YYYY-MM-DD) */ reviewBy: string | null;
  /** the body, as plain paragraphs; absent when rights are metadata-only */ body?: readonly string[];
  deviceClasses?: readonly string[]; archetypes?: readonly string[]; prerequisites?: readonly string[]; relatedStandards?: readonly string[];
  calculations?: readonly string[]; safety?: readonly string[]; verification?: string;
  /** stable ids of rooms, devices, people, issues, products or other objects this is about */ related?: readonly string[];
  tags?: readonly string[]; supersedes?: string; /** for zone 4: the consent record and how it was anonymised */ consent?: { by: string; on: string; anonymised: string };
}

/** Who is asking. `groups` are the reader's directory groups inside their tenant (empty in the demonstration unless a scenario sets them). */
export interface Reader { tenant: string; role: RoleKey; groups: readonly string[]; /** may review unverified knowledge of their tenant */ reviewer?: boolean }

const inAcl = (o: KnowledgeObject, r: Reader): boolean =>
  (o.acl.roles.length === 0 || o.acl.roles.includes(r.role)) && (o.acl.groups.length === 0 || o.acl.groups.some((g) => r.groups.includes(g)));

/**
 * The one access test. Deny by default: an object whose zone and ownership do not agree is unreadable by anyone.
 * Returns the reason for a refusal so a caller can log it; a refusal is never shown to the reader as "exists but hidden".
 */
export function mayRead(o: KnowledgeObject, r: Reader): { ok: true } | { ok: false; why: string } {
  if (![1, 2, 3, 4, 5].includes(o.zone)) return { ok: false, why: 'unknown zone' };
  if ((o.zone === 1 || o.zone === 2) && o.tenant !== null) return { ok: false, why: 'a universal object cannot belong to a tenant' };
  if ((o.zone === 3 || o.zone === 5) && !o.tenant) return { ok: false, why: 'a private object with no owner' };
  if (o.zone === 4 && !(o.consent && o.consent.by && o.consent.anonymised)) return { ok: false, why: 'shared without a consent record' };
  if (o.zone === 3 || o.zone === 5) { if (o.tenant !== r.tenant) return { ok: false, why: 'another tenant’s private knowledge' }; }
  if (o.zone === 5 && !r.reviewer) return { ok: false, why: 'unverified knowledge is read by its tenant’s reviewers only' };
  if (!inAcl(o, r)) return { ok: false, why: 'the source does not let this reader read it' };
  return { ok: true };
}
/** Cut a list down to what the reader may read. The result carries no trace of what was removed (no count, no placeholder). */
export const redactFor = <T extends KnowledgeObject>(list: readonly T[], r: Reader): T[] => list.filter((o) => mayRead(o, r).ok);

/** May this object be shown as fact? Only an approved object in zones 1 to 4. A draft, a superseded or an archived object that a reader
 *  may read is shown with its state (a draft manual stays a draft: §08 "Preserve their draft status"), and never as fact. */
export const isFact = (o: KnowledgeObject): boolean => o.state === 'APPROVED' && o.zone !== 5;

/** The strongest source an object rests on (1 is strongest); an object with no source is as weak as an unreviewed suggestion. */
export const authorityOf = (o: KnowledgeObject): SourceAuthority => (o.sources.length ? (Math.min(...o.sources.map((s) => s.authority)) as SourceAuthority) : 10);
/** Negative when `a` outranks `b`. Ties are broken by the later review, then by id, so the order is total and repeatable. */
export function compareAuthority(a: KnowledgeObject, b: KnowledgeObject): number {
  return authorityOf(a) - authorityOf(b) || (b.reviewedOn || '').localeCompare(a.reviewedOn || '') || a.id.localeCompare(b.id);
}

export type Freshness = 'CURRENT' | 'DUE' | 'STALE' | 'NEVER_REVIEWED';
/** `asOf` and the dates are YYYY-MM-DD. DUE: within thirty days of its review date. STALE: past it. */
export function freshness(o: KnowledgeObject, asOf: string): Freshness {
  if (!o.reviewedOn || !o.reviewBy) return 'NEVER_REVIEWED';
  if (o.reviewBy < asOf) return 'STALE';
  const days = (Date.parse(`${o.reviewBy}T00:00:00Z`) - Date.parse(`${asOf}T00:00:00Z`)) / 86400000;
  return days <= 30 ? 'DUE' : 'CURRENT';
}

/** May the body of the source be stored and shown, or only its title, number, applicability and link? */
export const mayReproduce = (s: SourceRef): boolean => s.rights === 'empathia-original' || s.rights === 'founder-owned' || s.rights === 'licensed-reproduction' || s.rights === 'tenant-owned' || s.rights === 'tenant-shared-with-consent';

export interface Promotion { to: TrustZone; by: { name: string; kind: 'human-reviewer' | 'tenant-admin' | 'ai' | 'system' }; on: string; consent?: KnowledgeObject['consent'] }
/**
 * Move an object between zones. Returns the new object, or why it is refused; a refusal changes nothing.
 *  5 → 3  a human reviewer of the owning tenant approves an observation as that tenant's knowledge.
 *  3 → 4  the tenant's administrator consents, the text is anonymised, and a human reviewer approves it.
 *  anything → 1 or 2 is authored and reviewed by Empathia; it is never reached by promoting a tenant's object.
 */
export function promote(o: KnowledgeObject, p: Promotion): { object: KnowledgeObject } | { refused: string } {
  if (p.by.kind === 'ai' || p.by.kind === 'system') return { refused: 'Knowledge is promoted by a named person. A model or an automation proposes; it does not approve.' };
  if (!p.by.name.trim()) return { refused: 'Name the reviewer.' };
  if (o.zone === 5 && p.to === 3) { if (p.by.kind !== 'human-reviewer') return { refused: 'An observation is approved by a reviewer.' };
    return { object: { ...o, zone: 3, state: 'APPROVED', reviewer: p.by.name, reviewedOn: p.on } }; }
  if (o.zone === 3 && p.to === 4) {
    if (!p.consent || !p.consent.by.trim() || !p.consent.anonymised.trim()) return { refused: 'Sharing a customer’s knowledge needs that customer’s recorded consent and a statement of how it was anonymised.' };
    if (o.state !== 'APPROVED') return { refused: 'Only approved knowledge is shared.' };
    if (p.by.kind !== 'human-reviewer') return { refused: 'A shared contribution is reviewed by a person before it is released.' };
    return { object: { ...o, zone: 4, tenant: o.tenant, consent: p.consent, reviewer: p.by.name, reviewedOn: p.on, acl: { roles: o.acl.roles, groups: [] } } }; }
  if (p.to === 1 || p.to === 2) return { refused: 'Universal knowledge is authored and reviewed by Empathia. A customer’s object is shared with consent (zone 4); it is not turned into universal knowledge.' };
  return { refused: `There is no path from zone ${o.zone} to zone ${p.to}.` };
}

/** How a citation reads wherever knowledge is quoted: title, version, what kind of source it is, and whether it is current. */
export function cite(o: KnowledgeObject, asOf: string): string {
  const s = [...o.sources].sort((a, b) => a.authority - b.authority)[0];
  const f = freshness(o, asOf); const age = f === 'STALE' ? ' · review overdue' : f === 'NEVER_REVIEWED' ? ' · not reviewed' : '';
  return `${o.title}${s ? ` · ${s.title}${s.version ? ` ${s.version}` : ''} · ${AUTHORITIES[s.authority]}` : ' · no source recorded'}${isFact(o) ? '' : ' · not approved'}${age}`;
}
