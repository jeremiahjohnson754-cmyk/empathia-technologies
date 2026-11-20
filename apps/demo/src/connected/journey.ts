/**
 * The connected journey: one room of a sandbox taken from its field record to an APEX case, each step by the person whose work it is,
 * through the enterprise API. A step's state is read from the server every time (never remembered here), so the same sandbox opened in
 * another browser is at the same step. A step is run as its own person; run as anyone else, the server refuses it and its words are shown.
 *
 * Every value written is synthetic and says so. No step is skipped or faked: the checks are recorded one request each, verified one
 * request each by a different person, and the server decides what each request may do.
 */
import type { Connected, Answer } from './client.js';

export interface ThreadIssue { code: string; title: string; state: string; workflow: string; retest: { result: string; evidence: string } | null; fixedBy: string | null; workOrders: string[]; cases: string[] }
export interface ThreadWo { code: string; issue: string; state: string; assigned: boolean; evidence: number; verification: { outcome: string } | null }
export interface FieldStats { devices: number; mounted: number; hookups: number; notInDesign: number; moves: { proposed: number; approved: number; rejected: number }; notes: { open: number; total: number } }
export interface Thread {
  room: { code: string; name: string; lifecycle: string; revision: number };
  stages: Array<{ key: string; product: string; records: Record<string, unknown> }>;
  links: Array<{ from: string; to: string; what: string; keys: Record<string, string | number> }>;
  audit: { aggregates: number; byAggregate: Array<{ type: string; outcome: string; events: number }>; latest: Array<{ at: string; action: string; outcome: string; actor_role: string | null; aggregate_type: string; aggregate_id: string }> };
  complete: boolean; missing: string[];
}
export interface PlanRow { test_id: string; label: string; applicable: boolean; evidence: string[]; result: string }
export interface FieldDevice { asset: string; label: string; designed: { x: number; y: number; mount: string }; asBuilt: { x: number; y: number; moved: string | null }; mounting: { version: number; label: string; heightM: number | null; by: string } | null; hookups: string[] }
export interface FieldRecord { room: { bounds: { w: number; l: number } }; writable: boolean; devices: FieldDevice[]; hookups: Array<{ hookup: string; device: string; port: string; to: string; asDesigned: boolean; removed: unknown }>; moves: Array<{ move: string; device: string; state: string; reason: string; metres: number; by: string; decidedBy: string | null }>; markups: Array<{ markup: string; text: string; state: string }>; stats: FieldStats }
export interface RegisterItem { asset: string | null; position: string; missing: string[]; complete: boolean }
export interface Person { role: string; name: string; id: string }
/** The documentation matrix of the room as the server holds it (0043): what is required, each document's latest state, the signatures. */
export interface Docs { status: { required: number; approved: number; percent: number; unsigned: string[]; complete: boolean }; documents: Array<{ kind: string; label: string; required: boolean; versions: Array<{ version: number; state: string }> }>; signatures: Array<{ side: string; current: boolean }> }
export interface State { thread: Thread; field: FieldRecord; rows: PlanRow[]; register: RegisterItem[]; people: Person[]; acceptanceLent: boolean; docs: Docs }

export const ROLE_LABEL: Record<string, string> = { installer: 'Installer', syseng: 'Systems Engineer', cxeng: 'Commissioning Engineer', svcmgr: 'Service Manager', service: 'Service Technician', qa_reviewer: 'QA Reviewer', opslead: 'Operations Lead', designer: 'Designer', exec: 'Executive', steward: 'Data Steward', requestor: 'Requestor' };
export const TRY_ROLES = ['installer', 'syseng', 'cxeng', 'svcmgr', 'service', 'qa_reviewer', 'opslead', 'designer', 'exec'];
const INSTRUMENT = 'SYN-METER-01 (synthetic), calibration record SYN-CAL-2026-09';
const PRE = ['PLANNED', 'DESIGN_APPROVED', 'INSTALLATION_PENDING', 'INSTALLED_UNVERIFIED'];

const rec = <T,>(s: State, key: string): T => (s.thread.stages.find((x) => x.key === key)?.records || {}) as T;
export const issuesOf = (s: State): ThreadIssue[] => rec<{ issues?: ThreadIssue[] }>(s, 'commissioning').issues || [];
export const wosOf = (s: State): ThreadWo[] => rec<{ workOrders?: ThreadWo[] }>(s, 'service').workOrders || [];
export const registerOf = (s: State) => rec<{ register?: { devices: number; complete: number } }>(s, 'engineering').register || { devices: 0, complete: 0 };
export const fieldOf = (s: State): FieldStats => rec<{ fieldRecord: FieldStats }>(s, 'lite').fieldRecord;
/** The deficiency the journey follows: the first one that was handed to service, else the first open one. */
export const issueOf = (s: State): ThreadIssue | null => { const xs = issuesOf(s); return xs.find((i) => i.workOrders.length) || xs.find((i) => i.state === 'OPEN') || xs[0] || null; };
export const woOf = (s: State): ThreadWo | null => { const i = issueOf(s); return i ? wosOf(s).find((w) => w.issue === i.code) || null : null; };

/** Load everything the journey reads, as one person of the sandbox (any member may read a room they can see). */
export async function load(c: Connected, room: string, role = 'syseng'): Promise<{ state: State | null; refused: Answer | null }> {
  const [t, f, r, g, sb, ops, d] = await Promise.all([c.call<Thread>(role, 'GET', `/v1/rooms/${room}/thread`), c.call<FieldRecord>(role, 'GET', `/v1/rooms/${room}/field-record`),
    c.call<{ commissioning: { rows: PlanRow[] } | null }>(role, 'GET', `/v1/rooms/${room}`), c.call<{ items: RegisterItem[] }>(role, 'GET', `/v1/rooms/${room}/register`),
    c.call<{ personas: Person[] }>(role, 'GET', '/v1/demo/sandbox'), c.call<{ delegated: Array<{ authority: string }> }>('opslead', 'GET', '/v1/me'), c.call<Docs>(role, 'GET', `/v1/rooms/${room}/documentation`)]);
  const bad = [t, f, r, g, sb, ops, d].find((a) => !a.ok); if (bad) return { state: null, refused: bad };
  return { state: { thread: t.body, field: f.body, rows: (r.body.commissioning?.rows || []).filter((x) => x.applicable), register: g.body.items, people: sb.body.personas,
    acceptanceLent: ops.body.delegated.some((x) => x.authority === 'customer.accept'), docs: d.body }, refused: null };
}

/** A step stopped by the server: the request that was refused and the server's own words. */
export class Refused extends Error { constructor(public answer: Answer, public what: string) { super(answer.detail); this.name = 'Refused'; } }
type Run = (c: Connected, s: State, role: string, room: string) => Promise<string>;
export interface Step { id: string; role: string; stage: 'lite' | 'engineering' | 'commissioning' | 'service' | 'assurance' | 'apex'; title: string; what: string; done: (s: State) => boolean; ready: (s: State) => string | null; run: Run }

const must = async <T,>(what: string, a: Promise<Answer<T>>): Promise<T> => { const x = await a; if (!x.ok) throw new Refused(x, what); return x.body; };
const note = async (c: Connected, role: string, label: string): Promise<string> => (await must(`upload the note “${label}”`, c.call<{ id: string }>(role, 'POST', '/v1/evidence', undefined, { text: `synthetic observation: ${label}`, fileName: `${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt` }))).id;
const day = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const tag = () => Math.random().toString(36).slice(2, 8);

export const STEPS: Step[] = [
  { id: 'mount', role: 'installer', stage: 'lite', title: 'Record how a device is mounted', what: 'The installer records the first device: a wall bracket at 1.4 m, with how it is fixed.',
    done: (s) => fieldOf(s).mounted >= 1, ready: (s) => (s.field.writable ? null : 'the field record is closed for this room'),
    run: async (c, s, role, room) => { const d = s.field.devices[0]!; const r = await must('record the mounting', c.call<{ version: number; label: string }>(role, 'PUT', `/v1/rooms/${room}/field-record/mounting/${d.asset}`, { method: 'wall-bracket', heightM: 1.4, fixing: 'bracket and four anchors (synthetic)', backing: 'plywood backing (synthetic)' })); return `${d.asset} mounted: ${r.label}, version ${r.version}.`; } },
  { id: 'move', role: 'installer', stage: 'lite', title: 'Record a field move', what: 'A sprinkler head is where the design put the device: the installer records where it went instead, and why.',
    done: (s) => { const m = fieldOf(s).moves; return m.proposed + m.approved + m.rejected >= 1; }, ready: (s) => (s.field.writable ? null : 'the field record is closed for this room'),
    run: async (c, s, role, room) => { const d = s.field.devices[0]!; const x = d.designed.x + 0.5 <= s.field.room.bounds.w ? d.designed.x + 0.5 : d.designed.x - 0.5;
      const r = await must('record the field move', c.call<{ move: string; metres: number }>(role, 'POST', `/v1/rooms/${room}/field-record/moves`, { device: d.asset, x: Math.round(x * 100) / 100, y: d.designed.y, reason: 'sprinkler head', note: 'clear of the head (synthetic)' })); return `${r.move} proposed: ${d.asset} moved ${r.metres} m. It waits for a decision.`; } },
  { id: 'approve-move', role: 'syseng', stage: 'lite', title: 'Decide the field move', what: 'The systems engineer approves it. The installer who recorded it cannot. The design is not edited: the as-built position is kept beside it.',
    done: (s) => fieldOf(s).moves.approved >= 1, ready: (s) => (s.field.moves.some((m) => m.state === 'PROPOSED') ? null : 'no field move is waiting for a decision'),
    run: async (c, s, role, room) => { const m = s.field.moves.find((x) => x.state === 'PROPOSED')!; await must('approve the field move', c.call(role, 'POST', `/v1/rooms/${room}/field-record/moves/${m.move}/decide`, { approve: true, decision: 'clear of the head; sightline unchanged (synthetic)' })); return `${m.move} approved: that is where ${m.device} is, as built.`; } },
  { id: 'register', role: 'installer', stage: 'engineering', title: 'Fill the device register', what: 'Commissioning does not start on an unfilled register. The installer records a serial for every unit, and a hostname and address for every networked one (synthetic values).',
    done: (s) => { const r = registerOf(s); return r.devices > 0 && r.complete === r.devices; }, ready: () => null,
    run: async (c, s, role, room) => { let n = 0; const t = tag();
      for (const x of s.register) { if (!x.asset || !x.missing.length) continue; n += 1;
        if (x.missing.includes('hostname') || x.missing.includes('IP address')) await must(`register ${x.asset}`, c.call(role, 'PUT', `/v1/assets/${x.asset}/register`, { hostname: `syn-${t}-${n}`, ip: `10.77.${Math.floor(Math.random() * 200) + 20}.${n + 10}` }));
        if (x.missing.includes('serial')) await must(`declare the serial of ${x.asset}`, c.call(role, 'POST', `/v1/assets/${x.asset}/identity`, { state: 'DECLARED', serial: `SYN-SN-${room}-${t}-${n}` })); }
      return `${n} unit${n === 1 ? '' : 's'} registered with synthetic values.`; } },
  { id: 'commission', role: 'syseng', stage: 'commissioning', title: 'Start commissioning', what: 'The systems engineer moves the room to COMMISSIONING. The server checks the register first.',
    done: (s) => !PRE.includes(s.thread.room.lifecycle), ready: (s) => (s.thread.room.lifecycle === 'INSTALLED_UNVERIFIED' ? null : `the room is ${s.thread.room.lifecycle}`),
    run: async (c, _s, role, room) => { await must('start commissioning', c.call(role, 'POST', `/v1/rooms/${room}/lifecycle`, { to: 'COMMISSIONING' })); return 'The room is in COMMISSIONING.'; } },
  { id: 'fail', role: 'cxeng', stage: 'commissioning', title: 'Record a failed check', what: 'The commissioning engineer records the first check as FAIL, with a note as evidence. The server opens a deficiency.',
    done: (s) => issuesOf(s).length >= 1, ready: (s) => (s.thread.room.lifecycle === 'COMMISSIONING' ? null : 'commissioning has not started'),
    run: async (c, s, role, room) => { const row = s.rows[0]!; const ev = await note(c, role, 'the failing observation');
      await must(`record ${row.test_id} as FAIL`, c.call(role, 'POST', `/v1/rooms/${room}/results`, { testId: row.test_id, state: 'FAIL', evidenceId: ev, evidenceKind: row.evidence[0], instrument: INSTRUMENT })); return `${row.label}: FAIL recorded with its evidence. A deficiency is open.`; } },
  { id: 'handoff', role: 'svcmgr', stage: 'service', title: 'Hand the deficiency to ServiceHands', what: 'The service manager raises a work order on the deficiency, triages it and assigns the technician whose verified credentials pass the dispatch gates.',
    done: (s) => { const w = woOf(s); return !!w && w.assigned; }, ready: (s) => (issueOf(s) ? null : 'there is no deficiency yet'),
    run: async (c, s, role) => { const i = issueOf(s)!; const w = woOf(s);
      const code = w ? w.code : (await must('raise the work order', c.call<{ workOrderId: string }>(role, 'POST', `/v1/issues/${i.code}/work-orders`, { note: 'handed over from commissioning (synthetic)' }))).workOrderId;
      if (!w || w.state === 'OPEN') await must('triage the work order', c.call(role, 'POST', `/v1/work-orders/${code}/triage`, { severity: 'High', scope: 'the failing check and its device', risk: 'room under commissioning', workType: 'camera_replacement', window: { from: new Date(Date.now() + 864e5).toISOString(), to: new Date(Date.now() + 864e5 + 4 * 36e5).toISOString() } }));
      const tech = s.people.find((p) => p.role === 'service');
      if (!tech) throw new Error('the sandbox has no technician');
      await must('assign the technician', c.call(role, 'POST', `/v1/work-orders/${code}/assign`, { personId: tech.id })); return `${code} raised on ${i.code}, triaged High and assigned to ${tech.name}.`; } },
  { id: 'work', role: 'service', stage: 'service', title: 'Do the work', what: 'The technician accepts the job, records the preflight, starts, records field evidence and hands it over for verification.',
    done: (s) => { const w = woOf(s); return !!w && ['VERIFYING', 'RESOLVED', 'CLOSED'].includes(w.state); }, ready: (s) => (woOf(s)?.assigned ? null : 'the work order is not assigned yet'),
    run: async (c, s, role) => { const w = woOf(s)!; const p = (x: string, body: unknown = {}) => c.call(role, 'POST', `/v1/work-orders/${w.code}${x}`, body); const at = (x: string) => ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].indexOf(w.state) <= ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].indexOf(x);
      if (at('ASSIGNED')) await must('accept the job', p('/accept'));
      if (at('ACCEPTED')) { await must('record the preflight', p('/preflight', { safetyBriefed: true, toolsConfirmed: ['PTZ service kit', 'laptop with the camera tool'], accessConfirmedBy: 'facilities desk (synthetic)', stock: { 'camera unit': { onHand: 1, checkedAt: new Date().toISOString() }, 'mounting plate': { onHand: 2, checkedAt: new Date().toISOString() } } })); await must('start the work', p('/start')); }
      if (!w.evidence) await must('record the field evidence', p('/evidence', { kind: 'photo', note: 'unit reseated and the cable replaced (synthetic)', ref: 'EV-SYN-WO-1' }));
      await must('hand over for verification', p('/submit')); return `${w.code}: accepted, preflight recorded, work done with evidence, handed over for verification.`; } },
  { id: 'verify-work', role: 'cxeng', stage: 'service', title: 'Verify the work', what: 'Someone who did not do the work verifies it in the room. The technician cannot verify their own job.',
    done: (s) => woOf(s)?.verification?.outcome === 'pass', ready: (s) => (woOf(s)?.state === 'VERIFYING' ? null : 'the work is not waiting for verification'),
    run: async (c, s, role) => { const w = woOf(s)!; await must('verify the work', c.call(role, 'POST', `/v1/work-orders/${w.code}/verify`, { outcome: 'pass', note: 'checked in the room (synthetic)' })); return `${w.code} verified: RESOLVED.`; } },
  { id: 'close-work', role: 'svcmgr', stage: 'service', title: 'Close the work order', what: 'The service manager closes the job. The deficiency stays open: closing a job never passes a test.',
    done: (s) => woOf(s)?.state === 'CLOSED', ready: (s) => (woOf(s)?.state === 'RESOLVED' ? null : 'the work order is not resolved yet'),
    run: async (c, s, role) => { const w = woOf(s)!; await must('close the work order', c.call(role, 'POST', `/v1/work-orders/${w.code}/close`, { note: 'confirmed by the requester (synthetic)', customerConfirmed: true })); return `${w.code} closed. ${w.issue} is still open: its verified retest closes it.`; } },
  { id: 'def-start', role: 'cxeng', stage: 'commissioning', title: 'Start the corrective work on the deficiency', what: 'The commissioning engineer names the owner and a target date.',
    done: (s) => ['IN_PROGRESS', 'PENDING_RETEST', 'CLOSED'].includes(issueOf(s)?.workflow || ''), ready: (s) => (issueOf(s) ? null : 'there is no deficiency yet'),
    run: async (c, s, role) => { const i = issueOf(s)!; await must('start the corrective work', c.call(role, 'POST', `/v1/issues/${i.code}/deficiency`, { step: 'start', ownerRole: 'installer', targetDate: day(10) })); return `${i.code}: in progress, owned by the installer, due ${day(10)}.`; } },
  { id: 'def-fixed', role: 'installer', stage: 'commissioning', title: 'Record the root cause and the correction', what: 'The owner records what was wrong and what was done.',
    done: (s) => ['PENDING_RETEST', 'CLOSED'].includes(issueOf(s)?.workflow || ''), ready: (s) => (issueOf(s)?.workflow === 'IN_PROGRESS' ? null : 'the corrective work has not started'),
    run: async (c, s, role) => { const i = issueOf(s)!; await must('record the correction', c.call(role, 'POST', `/v1/issues/${i.code}/deficiency`, { step: 'fixed', rootCause: 'INSTALLATION', action: 'Unit reseated on its mount and the damaged cable replaced end to end (synthetic)' })); return `${i.code}: root cause INSTALLATION; waiting for a retest.`; } },
  { id: 'retest', role: 'cxeng', stage: 'commissioning', title: 'Retest', what: 'The commissioning engineer retests and records PASS with its evidence.',
    done: (s) => issueOf(s)?.retest?.result === 'PASS', ready: (s) => (issueOf(s)?.workflow === 'PENDING_RETEST' ? null : 'the deficiency is not waiting for a retest'),
    run: async (c, s, role) => { const i = issueOf(s)!; await must('record the retest', c.call(role, 'POST', `/v1/issues/${i.code}/deficiency`, { step: 'retest', result: 'PASS', evidence: 'EV-SYN-RT-1' })); return `${i.code}: retest PASS, evidence EV-SYN-RT-1. It closes when someone else verifies it.`; } },
  { id: 'def-verify', role: 'syseng', stage: 'assurance', title: 'Verify the retest', what: 'Someone who neither fixed it nor retested it verifies. Only then is the deficiency closed.',
    done: (s) => issueOf(s)?.workflow === 'CLOSED', ready: (s) => (issueOf(s)?.retest?.result === 'PASS' ? null : 'there is no passing retest yet'),
    run: async (c, s, role) => { const i = issueOf(s)!; await must('verify the retest', c.call(role, 'POST', `/v1/issues/${i.code}/deficiency`, { step: 'verify' })); return `${i.code} closed by its verified retest.`; } },
  { id: 'pass-all', role: 'cxeng', stage: 'commissioning', title: 'Record the remaining checks', what: 'Every applicable check still without a passing result is recorded, one request each, with a note as evidence (synthetic results: a demonstration, not a commissioning).',
    done: (s) => s.rows.length > 0 && s.rows.every((r) => /^PASS/.test(r.result)), ready: (s) => (s.thread.room.lifecycle === 'COMMISSIONING' ? null : 'the room is not in commissioning'),
    run: async (c, s, role, room) => { const todo = s.rows.filter((r) => !/^PASS/.test(r.result)); const ev = await note(c, role, 'commissioning');
      for (const r of todo) await must(`record ${r.test_id}`, c.call(role, 'POST', `/v1/rooms/${room}/results`, { testId: r.test_id, state: 'PASS', evidenceId: ev, evidenceKind: r.evidence[0], instrument: INSTRUMENT })); return `${todo.length} check${todo.length === 1 ? '' : 's'} recorded as PASS, each waiting for independent verification.`; } },
  { id: 'verify-all', role: 'qa_reviewer', stage: 'commissioning', title: 'Verify every result', what: 'The QA reviewer verifies each result, one request each. A result is never verified by the person who recorded it.',
    done: (s) => s.rows.length > 0 && s.rows.every((r) => r.result === 'PASS_VERIFIED'), ready: (s) => (s.rows.length > 0 && s.rows.every((r) => /^PASS/.test(r.result)) ? null : 'some checks have no passing result yet'),
    run: async (c, s, role, room) => { const todo = s.rows.filter((r) => r.result !== 'PASS_VERIFIED');
      for (const r of todo) await must(`verify ${r.test_id}`, c.call(role, 'POST', `/v1/rooms/${room}/results/${r.test_id}/verify`)); return `${todo.length} result${todo.length === 1 ? '' : 's'} independently verified.`; } },
  { id: 'submit-docs', role: 'installer', stage: 'assurance', title: 'Submit the handover documents', what: 'Documentation & Submission: the documents this room requires follow from what it contains (as-builts, rack elevation, IP schema, DSP file, photographs, screenshots, the commissioning report). One evidence file each (synthetic notes here).',
    done: (s) => rec<{ current: number | null }>(s, 'assurance').current != null || s.docs.documents.filter((d) => d.required).every((d) => d.versions.length && d.versions[d.versions.length - 1]!.state !== 'REJECTED'), ready: (s) => (['INSTALLED_UNVERIFIED', 'COMMISSIONING'].includes(s.thread.room.lifecycle) ? null : 'documents are submitted for an installed room until it is accepted'),
    run: async (c, s, role, room) => { const todo = s.docs.documents.filter((d) => d.required && (!d.versions.length || d.versions[d.versions.length - 1]!.state === 'REJECTED'));
      for (const d of todo) { const ev = await note(c, role, d.label); await must(`submit ${d.label}`, c.call(role, 'POST', `/v1/rooms/${room}/documentation/${d.kind}`, { evidenceId: ev })); }
      return `${todo.length} document${todo.length === 1 ? '' : 's'} submitted for review.`; } },
  { id: 'review-docs', role: 'qa_reviewer', stage: 'assurance', title: 'Review the documents', what: 'The QA reviewer approves each document. Never the person who submitted it.',
    done: (s) => rec<{ current: number | null }>(s, 'assurance').current != null || s.docs.status.approved === s.docs.status.required, ready: (s) => (s.docs.documents.some((d) => d.required && d.versions[d.versions.length - 1]?.state === 'SUBMITTED') ? null : 'no document is waiting for review'),
    run: async (c, s, role, room) => { const todo = s.docs.documents.filter((d) => d.required && d.versions[d.versions.length - 1]?.state === 'SUBMITTED');
      for (const d of todo) await must(`approve ${d.label}`, c.call(role, 'POST', `/v1/rooms/${room}/documentation/${d.kind}/review`, { decision: 'APPROVED' })); return `${todo.length} document${todo.length === 1 ? '' : 's'} approved: ${s.docs.status.required} of ${s.docs.status.required}.`; } },
  { id: 'sign-vendor', role: 'opslead', stage: 'assurance', title: 'Sign the packet for the integrator', what: 'The operations lead signs the documentation packet as it stands, for the integrator.',
    done: (s) => rec<{ current: number | null }>(s, 'assurance').current != null || s.docs.signatures.some((x) => x.side === 'VENDOR' && x.current), ready: (s) => (s.docs.status.approved === s.docs.status.required ? null : 'not every document is approved yet'),
    run: async (c, _s, role, room) => { await must('sign for the integrator', c.call(role, 'POST', `/v1/rooms/${room}/documentation/sign/VENDOR`)); return 'Signed for the integrator.'; } },
  { id: 'sign-internal', role: 'syseng', stage: 'assurance', title: 'Sign the packet for the owner', what: 'The systems engineer signs the same packet for the owner: a second person.',
    done: (s) => rec<{ current: number | null }>(s, 'assurance').current != null || s.docs.signatures.some((x) => x.side === 'INTERNAL' && x.current), ready: (s) => (s.docs.status.approved === s.docs.status.required ? null : 'not every document is approved yet'),
    run: async (c, _s, role, room) => { await must('sign for the owner', c.call(role, 'POST', `/v1/rooms/${room}/documentation/sign/INTERNAL`)); return 'Signed for the owner: the packet carries both signatures.'; } },
  { id: 'lend-acceptance', role: 'qa_reviewer', stage: 'assurance', title: 'Lend the acceptance to the operations lead', what: 'The person who verified does not also accept: the QA reviewer lends the acceptance authority to the operations lead for two days. The loan is a record with a reason and an expiry.',
    done: (s) => s.acceptanceLent || rec<{ current: number | null }>(s, 'assurance').current != null, ready: () => null,
    run: async (c, s, role) => { const ops = s.people.find((p) => p.role === 'opslead'); if (!ops) throw new Error('the sandbox has no operations lead');
      await must('lend the acceptance', c.call(role, 'POST', '/v1/delegations', { granteeId: ops.id, authority: 'customer.accept', reason: 'synthetic: QA verified and does not accept', days: 2 })); return `The acceptance is lent to ${ops.name} for two days.`; } },
  { id: 'accept', role: 'opslead', stage: 'assurance', title: 'Accept the room', what: 'The operations lead accepts. The server publishes baseline v1: the design revision, its hash and the evidence, immutable.',
    done: (s) => rec<{ current: number | null }>(s, 'assurance').current != null, ready: (s) => (!(s.rows.length > 0 && s.rows.every((r) => r.result === 'PASS_VERIFIED')) ? 'not every check is independently verified' : !s.docs.status.complete ? 'the documentation packet is not approved and signed by both sides' : s.acceptanceLent ? null : 'the acceptance has not been lent to the operations lead'),
    run: async (c, _s, role, room) => { await must('accept the room', c.call(role, 'POST', `/v1/rooms/${room}/lifecycle`, { to: 'ACCEPTED' })); return 'Accepted. Baseline v1 is published.'; } },
  { id: 'apex', role: 'cxeng', stage: 'apex', title: 'Open an APEX case on the deficiency', what: 'A diagnosis record on the same issue: hypotheses with what is against each, never a verified fault.',
    done: (s) => (rec<{ cases?: unknown[] }>(s, 'apex').cases || []).length >= 1, ready: (s) => (issueOf(s) ? null : 'there is no deficiency yet'),
    run: async (c, s, role) => { const i = issueOf(s)!; await must('open the case', c.call(role, 'POST', `/v1/issues/${i.code}/apex`, {})); return `A case is open on ${i.code}.`; } },
];
/** The first step not done yet, or null when the journey is complete. */
export const nextStep = (s: State): Step | null => STEPS.find((x) => !x.done(s)) || null;
export const progress = (s: State): { done: number; total: number } => ({ done: STEPS.filter((x) => x.done(s)).length, total: STEPS.length });
