/**
 * The design a re-acceptance binds (ADR-0003, ADR-0012) — one rule, one wording, for the enterprise API and the investor demonstration.
 *
 * While an accepted room is recommissioned, its CURRENT baseline binds the design revision it was accepted against. A change to the design
 * (a model substitution at a position; in Build a Room also a device of another category, a device added or removed) means that the
 * approved revision no longer describes the room. The re-acceptance publishes the next baseline against the approved revision, so the change
 * is first saved as a revision and approved — room.design.approve, never by the revision's author. A like-for-like replacement (another
 * unit of the same model) changes no design: there is nothing to re-approve.
 *
 * Pure: the callers read the revisions (the API from app.room_revision, the demonstration from its draft) and say, for each, whether it
 * describes the current design — by comparing `designKey` of the revision's snapshot with `designKey` of the design now.
 */

/** The part of a design a re-acceptance compares: devices (id, category, model, position, mount) and connections — not their lifecycle. */
export interface DesignSnapshot {
  devices: ReadonlyArray<{ id: string; cat: string; model: string; x: number | string; y: number | string; mount: string; removed?: boolean }>;
  connections: ReadonlyArray<{ id: string; removed?: boolean }>;
}
/** A comparison key for a design (a removed device or connection is not part of it). Two designs describe the same room when their keys are equal. */
export const designKey = (s: DesignSnapshot): string =>
  JSON.stringify([s.devices.filter((d) => !d.removed).map((d) => [d.id, d.cat, d.model, Number(d.x), Number(d.y), d.mount]).sort(), s.connections.filter((c) => !c.removed).map((c) => c.id).sort()]);

/** Whether the approved revision, and the latest saved one, describe the current design. */
export interface RevisionBinding {
  approvedRevision: number | null; latestRevision: number | null; latestAuthor: string | null;
  approvedDescribesDesign: boolean; latestDescribesDesign: boolean;
}
/** A design change named in the binding sentence: the position (or device) and its change in words (from → to). */
export interface DesignChange { assetId: string; from: string; to: string }
/** The design-binding fact of the acceptance gate: the revisions, plus the substitutions made while the room is recommissioned. */
export interface DesignBinding extends RevisionBinding { substitutions: readonly DesignChange[] }

/** The binding from the saved revisions (each says whether it describes the current design) and the approved revision number. */
export function revisionBinding(revisions: ReadonlyArray<{ n: number; by: string | null; describes: boolean }>, approvedRevision: number | null): RevisionBinding {
  let latest: { n: number; by: string | null; describes: boolean } | null = null;
  for (const r of revisions) if (!latest || r.n > latest.n) latest = r;
  const approved = approvedRevision == null ? undefined : revisions.find((r) => r.n === approvedRevision);
  return { approvedRevision, latestRevision: latest?.n ?? null, latestAuthor: latest?.by ?? null, approvedDescribesDesign: !!approved && approved.describes, latestDescribesDesign: !!latest && latest.describes };
}

/** Why the re-acceptance waits for a design approval — null when the approved revision describes the room. */
export function designBindingSentence(b: DesignBinding): string | null {
  if (b.approvedDescribesDesign) return null;
  const subs = b.substitutions || [];
  return `the design changed while the room is recommissioned${subs.length ? ` (${subs.map((s) => `${s.assetId} ${s.from} → ${s.to}`).join(', ')})` : ''} and the approved revision ${b.approvedRevision} no longer describes it: ${b.latestDescribesDesign ? `revision ${b.latestRevision} needs approval` : 'save the change as a revision and have it approved'} (room.design.approve, not its author) — the re-acceptance binds the approved revision`;
}

/** The outstanding task and who does it, while the approved revision does not describe the room (readiness and the demonstration alike). */
export function designBindingTask(b: RevisionBinding): { what: string; who: string } | null {
  if (b.approvedDescribesDesign) return null;
  return b.latestDescribesDesign
    ? { what: `approve design revision ${b.latestRevision} (it carries the change made during recommissioning)`, who: 'room.design.approve (not the author of the revision)' }
    : { what: 'save the change made during recommissioning as a design revision', who: 'room.design' };
}

// ------------------------------------------------------------------------------------------------ refusals of an approval (one wording)
/** A person without the authority an action needs (the API's deny-by-default check). */
export const needsAuthority = (who: string, action: string, need: string) => `${who} may not ${action} (needs ${need})`;
/** Separation of duties (ADR-0005): what is approved is never approved by its own author. */
export const notByItsAuthor = (what: string, who: string) => `separation of duties: ${what} cannot be approved by its own author (${who})`;
/** The action and authority of a design-revision approval during recommissioning (POST /v1/rooms/{room}/revisions/{rev}/approve). */
export const REVISION_APPROVAL = { action: 'approve a design revision', authority: 'room.design.approve', what: 'the design' } as const;
