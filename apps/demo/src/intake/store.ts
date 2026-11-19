/**
 * Requests as records (founder directive 19 Nov 2026, "The definitive Intake experience" §04, §07, §10). A request is a record from the
 * moment the person moves past its first step: it has its id (REQ-0001…) as a DRAFT, keeps its answers, photos and history, survives a
 * refresh and a closed tab, and becomes SUBMITTED, with the same id, when it is sent. Sending a request for a room creates a project on the
 * decision desk (SUBMITTED: nothing is approved, funded or designed by asking); equipment, a replacement or an event setup goes to
 * ServiceHands as a job; a request in the person's own words waits for the AV operations team to route it. The request keeps a link to
 * what it became, so the person who asked can follow it in their own words without opening either workspace.
 *
 * Kept in this browser only, like the rest of the demonstration; synthetic. Events follow the repository's convention (`request.*`,
 * `room.*`, as the API's outbox names them), each with its version, actor, time and the request id as correlation.
 */
import type { Workspace } from '../workspace/store.js';
import * as S from '../workspace/store.js';
import { load as loadDesk, save as saveDesk, type DecisionState } from '../decisions/store.js';
import { fullName, roomById } from '../campus/canon.js';
import type { RoleKey } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import { blank, cardOf, kindOf, problems, propose, siteName, summarise, KINDS, OTHER_BUILDING, type CardId, type Draft, type Goes, type KindId } from './model.js';

export type RecordState = 'DRAFT' | 'SUBMITTED' | 'WITHDRAWN';
/** The owner policy for photographs (directive §04 step 4), with why it applies. */
export type PhotoPolicy = 'OPTIONAL_REFERENCE' | 'DOCUMENTATION_REQUIRED' | 'LOCATION_VERIFICATION_REQUIRED';
/** A photograph or file the person added. The original stays on their device: the record keeps its name, type, size, fingerprint
 *  (SHA-256), when and by whom it was added, which checklist item it answers, and a small preview made in the browser. Nothing is read
 *  from it: no size, no device, no dimension (§04: "Absolutely never invent measured room dimensions from an ordinary photograph"). */
export interface Attachment { id: string; name: string; type: string; bytes: number; sha256: string; at: string; by: RoleKey; item: string | null; preview: string | null; note: string;
  /** what the photograph shows is where the person says it is: documented, not verified (§04) */ location: 'DOCUMENTED' }
/** A space the records do not hold yet: requested, not built, and not an operational room (§04 step 2). */
export interface Provisional { id: string; name: string; building: string; buildingName: string; floor: number; at: string; by: RoleKey; state: 'AWAITING_REVIEW';
  /** where it is: as the requester documented it, until someone entitled confirms it on site */ location: 'DOCUMENTED' | 'VERIFIED'; verifiedBy?: RoleKey; verifiedAt?: string; verifiedNote?: string }
/** A question to the person who asked, and their answer (triage.ts). */
export interface Question { text: string; by: RoleKey; at: string; answer: { text: string; at: string; by: RoleKey } | null }
/** How a request in the person's own words was routed, or why it was closed (triage.ts). */
export interface Triage { outcome: 'desk' | 'servicehands' | 'closed'; by: RoleKey; at: string; note: string; duplicateOf: string | null }
export interface RequestEvent { v: 1; at: string; type: string; by: RoleKey; detail: string; correlation: string }

export interface Request { id: string; kind: KindId; goes: Goes; title: string; summary: string; role: RoleKey; at: string; roomId: string | null; projectId: string | null; incidentId: string | null; equipment: Array<{ label: string; count: number; added: number }>; tests: number; date: string | null;
  /** the person's own words, kept as written (requests raised before 13 Nov 2026 carry them only inside the summary) */ need?: string;
  /** the size Empathia proposed, with its basis (a new room) */ size?: { w: number; l: number; h: number; basis: string } | null;
  /** since 19 Nov 2026: requests are records from their first answer. Requests stored before carry no state and were sent. */
  state?: RecordState; card?: CardId; draft?: Draft; step?: string; updated?: string; submittedAt?: string | null;
  attachments?: Attachment[]; provisional?: Provisional | null; policy?: PhotoPolicy; goals?: string[]; history?: RequestEvent[]; question?: Question | null; triage?: Triage | null }
export type Refusal = { why: string[] };
const KEY = 'empathia.demo.requests.v1';
/** The roles the portal admits (registry: intake.request). A request is a request: who asked is recorded, and nothing is granted by asking. */
/** `sitechamp` since 11 Nov 2026: a Site Champion is an employee who is also their site's champion, and asks as one. */
export const PORTAL_ROLES: readonly RoleKey[] = ['employee', 'sitechamp', 'exec', 'bpm', 'ops', 'svcmgr', 'syseng', 'designer', 'architect'];
export const mayRequest = (role: RoleKey) => PORTAL_ROLES.includes(role);
export const stateOf = (r: Request): RecordState => r.state || 'SUBMITTED';
/** At most this many photographs and files on one request: the previews are kept in this browser. */
export const MAX_ATTACHMENTS = 8;

/** Every record, drafts included, newest first. */
export function loadRecords(): Request[] { try { const s = localStorage.getItem(KEY); const l = s ? (JSON.parse(s) as Request[]) : []; return Array.isArray(l) ? l.filter((r) => r && typeof r.id === 'string' && /^REQ-\d{4,}$/.test(r.id)) : []; } catch { return []; } }
/** The requests that were sent (what the room pages, the exports and the decision desk see). Drafts are the asker's own. */
export function loadRequests(): Request[] { return loadRecords().filter((r) => stateOf(r) === 'SUBMITTED'); }
export const recordById = (id: string): Request | null => loadRecords().find((r) => r.id === id) || null;
/** Write the records. A browser that refuses (storage full) is retried without photo previews, so a request is never lost to a picture;
 *  the result says whether previews had to be dropped. */
function saveRecords(l: Request[]): { ok: boolean; previewsDropped: boolean } {
  const kept = l.slice(0, 60);
  try { localStorage.setItem(KEY, JSON.stringify(kept)); return { ok: true, previewsDropped: false }; } catch { /* full: drop previews */ }
  try { localStorage.setItem(KEY, JSON.stringify(kept.map((r) => ({ ...r, attachments: (r.attachments || []).map((a) => ({ ...a, preview: null })) })))); return { ok: true, previewsDropped: true }; } catch { return { ok: false, previewsDropped: true }; }
}
const nextId = (all: Request[]) => `REQ-${String(all.reduce((m, r) => Math.max(m, Number(r.id.slice(4)) || 0), 0) + 1).padStart(4, '0')}`;
const ev = (r: Request, type: string, by: RoleKey, detail: string, at = new Date().toISOString()): RequestEvent => ({ v: 1, at, type, by, detail, correlation: r.id });

/** The photo policy that applies, and why, in words the person can act on. The names are the platform's (the API's project_request and the
 *  governance package, where LOCATION_VERIFICATION_REQUIRED means a photograph is needed before the request can be submitted). The
 *  demonstration asks that of nobody: a new space needs documentation before design, which the site champion or an engineer can supply
 *  when they confirm where it is (§04: "Do not force employees to produce documents they do not possess unless policy requires them"). */
export function policyFor(d: Draft): { policy: PhotoPolicy; why: string } {
  if (d.kind === 'new-room') return { policy: 'DOCUMENTATION_REQUIRED', why: 'Before an engineer designs a new space, they need photographs or a plan of it. You can send without any: someone on site (the site champion or an engineer) confirms where the space is and can take them then.' };
  if (d.kind === 'general' && !roomById(d.roomId)) return { policy: 'OPTIONAL_REFERENCE', why: 'Photos are optional. Add them if they help explain what you need.' };
  return { policy: 'OPTIONAL_REFERENCE', why: 'Photos are optional. The room is already on record, so nobody needs a photo to find it.' };
}
/** The photographs that would help, for this kind of request only (§04 step 4: "Only display checklist items applicable"). */
export function photoChecklist(d: Draft): Array<[id: string, label: string]> {
  const room: Array<[string, string]> = [['front', 'Show the front of the room'], ['back', 'Show the opposite wall'], ['ceiling', 'Show the ceiling']];
  if (d.kind === 'new-room') return [...room, ['constraints', 'Show anything in the way: columns, windows, doors, furniture that stays']];
  if (d.kind === 'change-room' || d.kind === 'add-devices' || d.kind === 'event') return [['front', 'Show the front of the room'], ['installed', 'Show the technology installed now'], ['constraints', 'Show anything in the way']];
  if (d.kind === 'replace-device') return [['device', 'Show the device to replace'], ['label', 'Show its label, if you can reach it safely']];
  return [['any', 'Show what you mean']];
}

/** Save the answers so far. The first save gives the request its id and a `request.drafted` event; later saves update it. A request that
 *  was already sent is never changed here. */
export function saveDraft(role: RoleKey, d: Draft, id: string | null, step: string, explicit = false): Refusal | Request {
  if (!mayRequest(role)) return { why: [`The ${ROLES[role].label} does not raise requests here.`] };
  const all = loadRecords(); const now = new Date().toISOString(); const at = id ? all.findIndex((r) => r.id === id) : -1;
  if (at >= 0 && stateOf(all[at]!) !== 'DRAFT') return { why: [`${id} has already been sent; it is followed on its own page.`] };
  const k = kindOf(d.kind); const p = propose(d); const { title } = summarise(d, p);
  const base: Request = at >= 0 ? all[at]! : { id: nextId(all), kind: d.kind, goes: k.goes, title, summary: '', role, at: now, roomId: null, projectId: null, incidentId: null, equipment: [], tests: 0, date: null, state: 'DRAFT', attachments: [], provisional: null, history: [] };
  const r: Request = { ...base, kind: d.kind, goes: k.goes, card: cardOf(d.kind), title, roomId: roomById(d.roomId)?.id || null, draft: d, step, updated: now, goals: [...(d.goals || [])], policy: policyFor(d).policy, need: d.need.trim() };
  r.history = [...(base.history || []), ...(at < 0 ? [ev(r, 'request.drafted', role, `Started: ${k.label.toLowerCase()}`, now)] : explicit ? [ev(r, 'request.updated', role, 'Saved to finish later', now)] : [])];
  const out = saveRecords(at >= 0 ? all.map((x, i) => (i === at ? r : x)) : [r, ...all]);
  return out.ok ? r : { why: ['This browser could not keep the draft: its storage is full or switched off. Nothing was lost from the page; copy your answers before leaving.'] };
}
/** Discard a draft (the asker's own; a sent request is withdrawn on its own page, never discarded). */
export function discardDraft(id: string): Refusal | { ok: true } {
  const all = loadRecords(); const r = all.find((x) => x.id === id); if (!r) return { why: [`${id} is not here.`] };
  if (stateOf(r) !== 'DRAFT') return { why: [`${id} has been sent and is kept.`] };
  saveRecords(all.filter((x) => x.id !== id)); return { ok: true };
}

/** Read a file the person chose into an attachment: its fingerprint, and a preview no wider than 320 px for an image. The file is not kept. */
export async function readAttachment(file: File, role: RoleKey, item: string | null): Promise<Attachment | Refusal> {
  const OK = /^(image\/(jpeg|png|webp|heic|heif|gif)|application\/pdf)$/; const EXT = /\.(jpe?g|png|webp|heic|heif|gif|pdf|dwg|dxf|rvt|ifc|vsdx)$/i;
  if (!OK.test(file.type) && !EXT.test(file.name)) return { why: [`${file.name}: photographs (JPEG, PNG, WebP, HEIC), PDF and drawings (DWG, DXF, RVT, IFC, VSDX) are accepted.`] };
  if (file.size > 50 * 1024 * 1024) return { why: [`${file.name} is larger than 50 MB.`] };
  const buf = await file.arrayBuffer(); let sha256 = '';
  try { const h = await crypto.subtle.digest('SHA-256', buf); sha256 = [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join(''); } catch { sha256 = ''; }
  let preview: string | null = null;
  if (/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
    try { const bmp = await createImageBitmap(new Blob([buf], { type: file.type })); const k = Math.min(1, 320 / Math.max(bmp.width, bmp.height)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
      c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height); preview = c.toDataURL('image/jpeg', 0.7); bmp.close?.(); } catch { preview = null; }
  }
  return { id: `AT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, name: file.name.slice(0, 120), type: file.type || 'application/octet-stream', bytes: file.size, sha256, at: new Date().toISOString(), by: role, item, preview, note: '', location: 'DOCUMENTED' };
}
/** Add attachments to a draft, with a `document.added` event each. Refused past the limit or on a sent request. */
export function attach(id: string, role: RoleKey, items: Attachment[]): Refusal | { record: Request; previewsDropped: boolean; duplicates: number } {
  const all = loadRecords(); const at = all.findIndex((r) => r.id === id); if (at < 0) return { why: [`${id} is not here.`] }; const r = all[at]!;
  if (stateOf(r) !== 'DRAFT') return { why: [`${id} has been sent.`] };
  const have = r.attachments || []; if (have.length + items.length > MAX_ATTACHMENTS) return { why: [`Up to ${MAX_ATTACHMENTS} photographs and files on one request (${have.length} added).`] };
  const fresh = items.filter((a) => !a.sha256 || !have.some((h) => h.sha256 === a.sha256)); const dup = items.length - fresh.length;
  const next: Request = { ...r, attachments: [...have, ...fresh], updated: new Date().toISOString(), history: [...(r.history || []), ...fresh.map((a) => ev(r, 'document.added', role, `${a.name}${a.item ? ` (${a.item})` : ''}`))] };
  const out = saveRecords(all.map((x, i) => (i === at ? next : x)));
  if (!out.ok) return { why: ['This browser could not keep the photographs: its storage is full or switched off.'] };
  return { record: out.previewsDropped ? { ...next, attachments: next.attachments!.map((a) => ({ ...a, preview: null })) } : next, previewsDropped: out.previewsDropped, duplicates: dup };
}
export function detach(id: string, attId: string): Refusal | Request {
  const all = loadRecords(); const at = all.findIndex((r) => r.id === id); if (at < 0) return { why: [`${id} is not here.`] }; const r = all[at]!;
  if (stateOf(r) !== 'DRAFT') return { why: [`${id} has been sent; its attachments are kept.`] };
  const next = { ...r, attachments: (r.attachments || []).filter((a) => a.id !== attId), updated: new Date().toISOString() }; saveRecords(all.map((x, i) => (i === at ? next : x))); return next;
}

/** Requests already open for the same room: the person's own here, the decision desk's projects, and the room's ServiceHands jobs
 *  (directive §04 step 2: duplicate detection). Shown, never blocking: a second need in the same room is a real request. */
export function alreadyOpen(w: Workspace | null, roomId: string, exceptId: string | null = null, desk: DecisionState = loadDesk()): Array<{ id: string; title: string; where: string; href: string | null }> {
  if (!roomById(roomId)) return [];
  const mine = loadRequests().filter((r) => r.roomId === roomId && r.id !== exceptId).map((r) => ({ id: r.id, title: r.title, where: 'Asked for from this browser', href: `#/requests/${r.id}` }));
  const linked = new Set(loadRequests().flatMap((r) => [r.projectId, r.incidentId]).filter(Boolean) as string[]);
  const projects = desk.projects.filter((p) => p.roomId === roomId && !['REJECTED', 'SUSPENDED'].includes(p.state) && !linked.has(p.id)).map((p) => ({ id: p.id, title: p.name, where: 'A project on the decision desk', href: null }));
  const jobs = w ? w.incidents.filter((i) => i.roomId === roomId && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(i.state) && !linked.has(i.id)).map((i) => ({ id: i.id, title: i.title, where: 'A job in ServiceHands', href: null })) : [];
  return [...mine, ...projects, ...jobs].slice(0, 6);
}

/**
 * Send the request. `w` is the workspace copy being changed (useWorkspace().apply); the decision desk is read and written here.
 * Refused, with the reasons, when the draft is incomplete or the role is not one the portal admits. With `id`, the draft of that id is
 * the one sent, and keeps its id. Sending twice sends once: a request already sent is returned as it is (no second project or job).
 * When ServiceHands refuses the job, the draft stays a draft, with its answers: nothing the person wrote is lost.
 */
export function send(w: Workspace, role: RoleKey, d: Draft, desk: DecisionState = loadDesk(), id: string | null = null): Refusal | Request {
  if (!mayRequest(role)) return { why: [`The ${ROLES[role].label} does not raise requests here.`] };
  const all = loadRecords(); const prior = id ? all.find((r) => r.id === id) || null : null;
  if (prior && stateOf(prior) === 'SUBMITTED') return prior;
  const k = kindOf(d.kind); if (k.goes === 'scouter' || k.goes === 'optimizer' || k.goes === 'report') return { why: ['This kind of question opens a tool; it is not sent as a request.'] };
  const errs = Object.values(problems(d)); if (errs.length) return { why: errs };
  const p = propose(d); const { title, summary } = summarise(d, p); const rid = prior?.id || nextId(all); const now = new Date().toISOString();
  const o = roomById(d.roomId); const who = `Asked by the ${ROLES[role].label} through the request portal (${rid}).`;
  const req: Request = { ...(prior || {}), id: rid, kind: d.kind, goes: k.goes, title, summary, role, at: prior?.at || now, roomId: o?.id || null, projectId: null, incidentId: null, equipment: (p?.equipment || []).map((e) => ({ label: e.label, count: e.count, added: e.added })), tests: p?.tests.added || 0, date: d.kind === 'event' ? d.date : null, need: d.need.trim(), size: p && d.kind === 'new-room' ? { w: p.w, l: p.l, h: p.h, basis: p.basis[0] || 'from rooms of the same kind on record' } : null,
    state: 'SUBMITTED', card: cardOf(d.kind), draft: d, step: 'review', updated: now, submittedAt: now, attachments: prior?.attachments || [], provisional: null, policy: policyFor(d).policy, goals: [...(d.goals || [])], history: [...(prior?.history || [])] };
  if (!prior) req.history!.push(ev(req, 'request.drafted', role, `Started: ${k.label.toLowerCase()}`, now));
  if (d.kind === 'new-room') {
    const name = d.place?.name.trim() || `${p?.archetypeName || 'Room'} for ${d.people}`; const pid = `PRV-${rid.slice(4)}`;
    req.provisional = { id: pid, name, building: d.building, buildingName: siteName(d), floor: d.floor, at: now, by: role, state: 'AWAITING_REVIEW', location: 'DOCUMENTED' };
    req.history!.push(ev(req, 'room.provisional_created', role, `${pid}: ${name}, ${siteName(d)}, floor ${d.floor}${d.building === OTHER_BUILDING ? ' (the building is not on record either)' : ''}. Awaiting review; not an operational room`, now));
  }
  if (k.goes === 'desk') {
    const pid = `PRJ-${rid}`; desk.projects.push({ id: pid, name: title, roomId: o?.id || null, state: 'SUBMITTED', scopeRev: 1, pitchRev: 0, brief: { rev: 0, scopeRev: 1, authorId: 'requestor' }, approverId: 'exec', romUsd: 0, summary: `${summary} ${who}` });
    desk.events.unshift({ at: now, by: 'requestor', type: 'request.submitted', aggregate: pid, detail: `${title} · ${who}`, outcome: 'ALLOWED' }); saveDesk(desk); req.projectId = pid;
  } else if (k.goes === 'servicehands') {
    if (!o) return { why: ['Choose the room.'] };
    // raised as a requestor: asking is the one thing every admitted role may do; the job's own steps keep their own authorities
    const verb = d.kind === 'replace-device' ? 'Replace' : d.kind === 'event' ? 'Set up' : 'Install';
    const out = S.raiseIncident(w, 'requestor', { roomId: o.id, roomName: fullName(o), buildingKey: o.building, title: `${verb}: ${title}`.slice(0, 118), summary: `${summary} ${who}` });
    if ('why' in out) return out; req.incidentId = out.id;
  }
  req.history!.push(ev(req, 'request.submitted', role, k.goes === 'desk' ? `To the decision desk as project ${req.projectId}` : k.goes === 'servicehands' ? `To ServiceHands as job ${req.incidentId}` : 'To the AV operations team, to be routed', now));
  const rest = all.filter((r) => r.id !== rid); saveRecords([req, ...rest]); return req;
}

const DESK_WORDS: Record<string, [string, 'info' | 'ok' | 'warn' | 'bad']> = {
  DRAFT: ['Not sent yet', 'info'], SUBMITTED: ['Sent. Waiting for an engineer to review it', 'info'], VENDOR_ACKNOWLEDGED: ['Acknowledged by the delivery partner', 'info'], INTERNAL_ROUTE_RECORDED: ['Being handled by the internal team', 'info'], PITCH_READY: ['The proposal is written', 'info'],
  DECISION_PENDING: ['With the approver for a decision', 'warn'], APPROVED: ['Approved. Waiting for funding', 'ok'], HELD: ['On hold', 'warn'], REJECTED: ['Not approved', 'bad'], FUNDED: ['Funded. Design and installation follow', 'ok'], SUSPENDED: ['Funding withdrawn', 'bad'],
};
/** Who acts next on a project, and what they do, by its state (the governance states; never a named person, never a date). */
const DESK_NEXT: Record<string, [owner: string, next: string]> = {
  SUBMITTED: ['Systems engineering', 'An engineer reviews the request and writes the brief: what the room must do, and what is still unknown.'],
  VENDOR_ACKNOWLEDGED: ['The delivery partner', 'The partner prepares the proposal.'], INTERNAL_ROUTE_RECORDED: ['The internal team', 'The team prepares the proposal.'],
  PITCH_READY: ['Systems engineering', 'The proposal goes to the approver.'], DECISION_PENDING: ['The approver', 'The approver approves, holds or declines it, with a reason.'],
  APPROVED: ['Finance', 'Funding is decided separately from approval.'], HELD: ['The approver', 'It waits for what the approver asked for; the reason is below.'], REJECTED: ['Nobody', 'Not approved. The reason is below; you can ask again with a changed request.'],
  FUNDED: ['Engineering and the installers', 'The design is completed, then installation is planned.'], SUSPENDED: ['Finance', 'Funding was withdrawn; the project waits.'],
};
const JOB_WORDS: Record<string, [string, 'info' | 'ok' | 'warn' | 'bad']> = {
  OPEN: ['In the ServiceHands queue', 'info'], TRIAGED: ['Reviewed. Waiting for a technician', 'info'], ASSIGNED: ['A technician is assigned', 'info'], ACCEPTED: ['The technician has accepted the job', 'info'], IN_PROGRESS: ['Work is under way', 'warn'], VERIFYING: ['Done. Being checked', 'warn'],
  RESOLVED: ['Done and checked', 'ok'], CLOSED: ['Closed', 'ok'], REOPENED: ['Reopened', 'warn'], CANCELLED: ['Cancelled', 'bad'],
};
const JOB_NEXT: Record<string, [string, string]> = {
  OPEN: ['Service management', 'The service manager reviews the job and decides who goes, and when.'], TRIAGED: ['Service management', 'A technician is assigned.'], ASSIGNED: ['The technician', 'The technician accepts the job and plans the visit.'],
  ACCEPTED: ['The technician', 'The technician does the work at the agreed time.'], IN_PROGRESS: ['The technician', 'The work is being done.'], VERIFYING: ['Service management', 'The work is checked before the job is closed.'],
  RESOLVED: ['Nobody', 'Done and checked.'], CLOSED: ['Nobody', 'Closed.'], REOPENED: ['Service management', 'The job is open again.'], CANCELLED: ['Nobody', 'Cancelled.'],
};
export interface Standing { words: string; tone: 'info' | 'ok' | 'warn' | 'bad'; state: string; href: string | null; where: string; reason: string | null;
  /** who acts next (a team or a role, never a named person) and what they do (directive §07) */ owner: string; next: string }
/** Where a request stands now, read from what it became; in the asker's words, with the reason when someone gave one. */
export function standing(r: Request, w: Workspace, desk: DecisionState = loadDesk()): Standing {
  if (stateOf(r) === 'DRAFT') return { words: 'Not sent yet', tone: 'info', state: 'DRAFT', href: null, where: '', reason: null, owner: 'You', next: 'Finish the request and send it. It is kept in this browser until you do.' };
  if (r.question && !r.question.answer) return { words: 'A question for you', tone: 'warn', state: 'CLARIFICATION', href: null, where: '', reason: null, owner: 'You', next: `Answer the question from the ${ROLES[r.question.by].label}: “${r.question.text}” The request carries on when you do.` };
  if (r.triage?.outcome === 'closed') return { words: r.triage.duplicateOf ? `Closed: the same as ${r.triage.duplicateOf}` : 'Closed', tone: 'info', state: 'CLOSED', href: r.triage.duplicateOf ? `#/requests/${r.triage.duplicateOf}` : null, where: '', reason: r.triage.note, owner: 'Nobody', next: r.triage.duplicateOf ? `Follow ${r.triage.duplicateOf} instead.` : 'Nothing more happens with this request. Ask again if the need changes.' };
  if (r.projectId) { const p = desk.projects.find((x) => x.id === r.projectId); if (!p) return { words: 'The project is no longer on the desk', tone: 'bad', state: 'GONE', href: null, where: 'Decision desk', reason: null, owner: 'Nobody', next: 'Ask again if it is still needed.' };
    const dec = desk.decisions.filter((x) => x.projectId === p.id).sort((a, b) => b.at.localeCompare(a.at))[0]; const [words, tone] = DESK_WORDS[p.state] || [p.state, 'info']; const [owner, next] = DESK_NEXT[p.state] || ['Systems engineering', 'The project moves on.'];
    const verify = r.provisional && r.provisional.location !== 'VERIFIED' && p.state === 'SUBMITTED' ? ' First, someone on site confirms where the new space is.' : '';
    return { words, tone, state: p.state, href: '#/intake', where: 'Decision desk', reason: dec && (p.state === 'HELD' || p.state === 'REJECTED') ? dec.reason : null, owner, next: `${next}${verify}` }; }
  if (r.incidentId) { const i = S.incidentOf(w, r.incidentId); if (!i) return { words: 'The job is no longer in ServiceHands', tone: 'bad', state: 'GONE', href: null, where: 'ServiceHands', reason: null, owner: 'Nobody', next: 'Ask again if it is still needed.' };
    const [words, tone] = JOB_WORDS[i.state] || [i.state, 'info']; const [owner, next] = JOB_NEXT[i.state] || ['Service management', 'The job moves on.']; return { words, tone, state: i.state, href: '#/servicehands', where: 'ServiceHands', reason: null, owner, next }; }
  if (r.goes === 'triage') return { words: 'Sent. Waiting for the AV operations team', tone: 'info', state: 'SUBMITTED', href: null, where: 'AV operations', reason: null, owner: 'AV operations', next: 'The team reads it and decides where it goes. They may ask you a question first.' };
  return { words: 'Sent', tone: 'info', state: 'SENT', href: null, where: '', reason: null, owner: '—', next: '' };
}

/** A draft restored from a record: the answers as saved, filled out with today's defaults for anything an older draft lacked. */
export const draftOf = (r: Request): Draft => ({ ...blank(r.kind), ...(r.draft || {}), kind: KINDS.some((k) => k.id === r.draft?.kind) ? r.draft!.kind : r.kind });
