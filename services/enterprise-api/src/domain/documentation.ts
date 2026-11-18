/**
 * Documentation & Submission of a room (migration 0043; engine documentation.ts; 50/10 §3.1 and §9, V3.9: "Required documentation must
 * be present"). The matrix, the submissions, their review and the two signatures, each through its own authority:
 *
 *   submit   someone who records field work or verifies tests (work.evidence, photo.submit, test.verify, tests.verify.all)
 *   review   someone who approves documents or photographs (documents.approve, photos.approve), never the submitter
 *   sign     VENDOR: the integrator's operations lead (window.approve); INTERNAL: the owner's design authority (baseline.approve);
 *            two different people, over the packet as it stands (the database computes the packet)
 *
 * The acceptance gate (rooms.ts) takes `documentationFact`; nothing here moves the room.
 */
import { requiredDocuments, documentationStatus, signatureBlockers, DOCUMENT_SPECS, DOCUMENT_KINDS, type DocumentKind, type DocumentationFact, type SignatureSide } from '@empathia/commissioning-engine';
import type { Queryable } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import { invalid, notFound } from '../http/errors.js';
import { findRoom, type RoomRow } from './rooms.js';

export const SUBMIT = ['work.evidence', 'photo.submit', 'test.verify', 'tests.verify.all'];
export const REVIEW = ['documents.approve', 'photos.approve'];
export const SIGN: Record<SignatureSide, string[]> = { VENDOR: ['window.approve'], INTERNAL: ['baseline.approve'] };
export const ANY_SIGN = [...SIGN.VENDOR, ...SIGN.INTERNAL];
const OPEN = ['INSTALLED_UNVERIFIED', 'COMMISSIONING'];
const agg = (room: RoomRow) => ({ type: 'Room', id: room.code });

interface DocRow { id: string; kind: DocumentKind; version: number; evidence_id: string; note: string | null; submitted_by: string; submitted_role: string; submitted_at: string;
  state: 'SUBMITTED' | 'APPROVED' | 'REJECTED'; reviewed_by: string | null; reviewed_at: string | null; review_note: string | null; file_name: string; sha256: string }
interface SigRow { side: SignatureSide; packet_sha256: string; signed_by: string; signed_role: string; signed_at: string; name: string | null }

async function categories(q: Queryable, roomId: string): Promise<string[]> {
  return (await q.query<{ cat: string }>('SELECT DISTINCT category AS cat FROM app.planned_asset WHERE room_id = $1 AND removed_at IS NULL AND NOT furniture', [roomId])).rows.map((r) => r.cat);
}
async function rows(q: Queryable, roomId: string): Promise<DocRow[]> {
  return (await q.query<DocRow>(`SELECT d.id, d.kind, d.version, d.evidence_id, d.note, d.submitted_by, d.submitted_role, d.submitted_at, d.state, d.reviewed_by, d.reviewed_at, d.review_note, e.file_name, e.sha256
     FROM app.room_document d JOIN app.evidence_object e ON e.id = d.evidence_id WHERE d.room_id = $1 ORDER BY d.kind, d.version`, [roomId])).rows;
}
async function packet(q: Queryable, roomId: string): Promise<string | null> {
  return (await q.query<{ h: string | null }>('SELECT app.documentation_packet($1) AS h', [roomId])).rows[0]!.h;
}
async function signatures(q: Queryable, roomId: string): Promise<SigRow[]> {
  return (await q.query<SigRow>('SELECT s.side, s.packet_sha256, s.signed_by, s.signed_role, s.signed_at, p.display_name AS name FROM app.documentation_signature s LEFT JOIN app.person p ON p.id = s.signed_by WHERE s.room_id = $1 ORDER BY s.signed_at', [roomId])).rows;
}

/** The documentation fact of the acceptance gate, from the database. */
export async function documentationFact(q: Queryable, roomId: string): Promise<DocumentationFact> {
  const required = requiredDocuments(await categories(q, roomId)).map((d) => d.kind);
  const latest = new Map<DocumentKind, DocRow>(); for (const r of await rows(q, roomId)) latest.set(r.kind, r);
  const h = await packet(q, roomId); const sigs = await signatures(q, roomId);
  return { required, states: Object.fromEntries([...latest].map(([k, r]) => [k, r.state])), signed: { VENDOR: !!h && sigs.some((s) => s.side === 'VENDOR' && s.packet_sha256 === h), INTERNAL: !!h && sigs.some((s) => s.side === 'INTERNAL' && s.packet_sha256 === h) } };
}

/** The matrix of a room: every required document with its versions, the percentage, what is missing, and the signatures. */
export async function matrix(ctx: RequestContext, ref: string) {
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref); const all = await rows(q, room.id); const f = await documentationFact(q, room.id); const s = documentationStatus(f);
    const h = await packet(q, room.id); const sigs = await signatures(q, room.id);
    const req = new Set(f.required);
    return {
      room: { code: room.code, name: room.name, lifecycle: room.lifecycle },
      status: { ...s, open: OPEN.includes(room.lifecycle) },
      documents: DOCUMENT_SPECS.map((d) => ({ kind: d.kind, label: d.label, photo: d.photo, required: req.has(d.kind),
        versions: all.filter((r) => r.kind === d.kind).map((r) => ({ version: r.version, state: r.state, evidenceId: r.evidence_id, fileName: r.file_name, sha256: r.sha256, note: r.note,
          submittedBy: r.submitted_by, submittedRole: r.submitted_role, submittedAt: r.submitted_at, reviewedBy: r.reviewed_by, reviewedAt: r.reviewed_at, reviewNote: r.review_note })) })),
      packet: h, signatures: sigs.map((x) => ({ side: x.side, by: x.signed_by, name: x.name, role: x.signed_role, at: x.signed_at, packet: x.packet_sha256, current: !!h && x.packet_sha256 === h })),
      may: { submit: ctx.can(SUBMIT) && OPEN.includes(room.lifecycle), review: ctx.can(REVIEW), sign: { VENDOR: ctx.can(SIGN.VENDOR), INTERNAL: ctx.can(SIGN.INTERNAL) } },
      basis: 'The documents this room requires follow from what it contains. Each is one evidence file, versioned, reviewed by someone other than its submitter. The packet is signed by the integrator and the owner, two different people; a change to any document after a signature leaves that signature on the packet it signed, not on this one. Acceptance waits for all of it.',
    };
  });
}

/** Submit a version of one document. */
export async function submit(ctx: RequestContext, ref: string, kind: string, body: { evidenceId?: string; note?: string }) {
  await ctx.require(SUBMIT, 'submit a room document');
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true); const why: string[] = [];
    if (!(DOCUMENT_KINDS as readonly string[]).includes(kind)) throw invalid(`document is one of ${DOCUMENT_KINDS.join(', ')}`);
    if (!OPEN.includes(room.lifecycle)) why.push(`${room.code} is ${room.lifecycle}: documents are submitted for an installed room until it is accepted`);
    const req = requiredDocuments(await categories(q, room.id)).map((d) => d.kind);
    if (!req.includes(kind as DocumentKind)) why.push(`${room.code} does not require ${DOCUMENT_SPECS.find((d) => d.kind === kind)!.label.toLowerCase()}: nothing it contains calls for it`);
    if (!body.evidenceId || !/^[0-9a-f-]{36}$/.test(body.evidenceId)) why.push('a document is a stored evidence file: upload it first and name it');
    else if (!(await q.query('SELECT 1 FROM app.evidence_object WHERE id = $1', [body.evidenceId])).rowCount) why.push('the evidence named is not one of this organization’s files');
    const last = (await q.query<{ version: number; state: string }>('SELECT version, state FROM app.room_document WHERE room_id = $1 AND kind = $2 ORDER BY version DESC LIMIT 1', [room.id, kind])).rows[0];
    if (last?.state === 'SUBMITTED') why.push(`version ${last.version} is still awaiting review`);
    if (why.length) await ctx.refuse('document.submit', agg(room), why, { kind });
    const version = (last?.version ?? 0) + 1;
    await q.query('INSERT INTO app.room_document (tenant_id, room_id, kind, version, evidence_id, note, submitted_by, submitted_role) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [ctx.p.tenantId, room.id, kind, version, body.evidenceId, String(body.note ?? '').trim().slice(0, 1000) || null, ctx.p.personId, ctx.p.role]);
    await ctx.audit(q, 'document.submit', 'ALLOWED', agg(room), { kind, version, evidenceId: body.evidenceId });
    return { room: room.code, kind, version, state: 'SUBMITTED', status: documentationStatus(await documentationFact(q, room.id)) };
  });
}

/** Review the latest version of one document: APPROVED, or REJECTED with why; never by its submitter. */
export async function review(ctx: RequestContext, ref: string, kind: string, body: { decision?: string; note?: string }) {
  await ctx.require(REVIEW, 'review a room document');
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true);
    if (!(DOCUMENT_KINDS as readonly string[]).includes(kind)) throw invalid(`document is one of ${DOCUMENT_KINDS.join(', ')}`);
    if (!['APPROVED', 'REJECTED'].includes(String(body.decision))) throw invalid('decision is APPROVED or REJECTED');
    const d = (await q.query<{ id: string; version: number; state: string; submitted_by: string }>('SELECT id, version, state, submitted_by FROM app.room_document WHERE room_id = $1 AND kind = $2 ORDER BY version DESC LIMIT 1 FOR UPDATE', [room.id, kind])).rows[0];
    if (!d) throw notFound(`${kind} of ${room.code}`);
    await ctx.separate('document.review', agg(room), [d.submitted_by], 'a submitted document');
    const why: string[] = [];
    if (d.state !== 'SUBMITTED') why.push(`version ${d.version} was reviewed already (${d.state}); a change is a new version`);
    if (!OPEN.includes(room.lifecycle)) why.push(`${room.code} is ${room.lifecycle}: its documentation was fixed when it was accepted`);
    if (body.decision === 'REJECTED' && String(body.note ?? '').trim().length < 5) why.push('a rejection says what to correct');
    if (why.length) await ctx.refuse('document.review', agg(room), why, { kind });
    await q.query('UPDATE app.room_document SET state = $2, reviewed_by = $3, reviewed_at = now(), review_note = $4 WHERE id = $1', [d.id, body.decision, ctx.p.personId, String(body.note ?? '').trim() || null]);
    await ctx.audit(q, 'document.review', 'ALLOWED', agg(room), { kind, version: d.version, decision: body.decision });
    return { room: room.code, kind, version: d.version, state: body.decision, status: documentationStatus(await documentationFact(q, room.id)) };
  });
}

/** Sign the packet as it stands, for one side. */
export async function sign(ctx: RequestContext, ref: string, side: string) {
  if (side !== 'VENDOR' && side !== 'INTERNAL') throw invalid('side is VENDOR or INTERNAL');
  await ctx.require(SIGN[side], `sign the documentation packet for the ${side === 'VENDOR' ? 'integrator' : 'owner'}`);
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true); const f = await documentationFact(q, room.id); const h = await packet(q, room.id);
    const other = (await signatures(q, room.id)).find((s) => s.side !== side && s.packet_sha256 === h)?.signed_by ?? null;
    const why = signatureBlockers(f, side, ctx.p.personId, other);
    if (!OPEN.includes(room.lifecycle)) why.unshift(`${room.code} is ${room.lifecycle}: the packet is signed before acceptance`);
    if (why.length) await ctx.refuse('document.sign', agg(room), why, { side });
    await q.query('INSERT INTO app.documentation_signature (tenant_id, room_id, side, packet_sha256, documents, signed_by, signed_role) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [ctx.p.tenantId, room.id, side, '0'.repeat(64), '[]', ctx.p.personId, ctx.p.role]);
    const after = await documentationFact(q, room.id);
    await ctx.audit(q, 'document.sign', 'ALLOWED', agg(room), { side, packet: await packet(q, room.id) });
    return { room: room.code, side, packet: await packet(q, room.id), status: documentationStatus(after) };
  });
}
