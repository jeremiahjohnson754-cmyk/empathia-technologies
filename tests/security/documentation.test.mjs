// Documentation & Submission (migration 0043; 50/10 master directive §3.1 and §9, the V3.9 rules: "Required documentation must be
// present", "Acceptance cannot bypass server-side rules", "Test direct API attempts to bypass each gate"; source reconciliation item 3).
// A real enterprise API on a real database, in a demonstration sandbox; every check reads the server or the database.
//
//   DOC-01  the matrix follows what each room contains: the theatre requires fourteen documents, the huddle room fewer; nothing is
//           approved, nothing signed, 0%
//   DOC-02  a submission needs the authority, a stored file of this organization, a document the room requires, a room that is
//           installed and not accepted, and the previous version decided
//   DOC-03  review: the authority, never the submitter (the database refuses it too), a rejection says what to correct, once; a
//           rejected document is resubmitted as a new version
//   DOC-04  signatures: not before every required document is approved; each side by its own authority; two different people (the
//           database refuses one person on both sides)
//   DOC-05  a change after signing leaves the signatures on the packet they signed: the packet as it stands is unsigned again
//   DOC-06  the acceptance gate: readiness names what is missing; a direct request to accept is refused with the same reason; once
//           every document is approved and both sides have signed the packet as it stands, documentation no longer holds it
//   DOC-07  a submission is immutable and never deleted; another organization sees only its own documents
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict';
import { setup, client, registerRoom, documentRoom } from '../integration/harness.mjs';

let h, c, sb; const T = {}; const J = (x) => JSON.stringify(x); const HALL = 'UNI-SCI-110'; let HUDDLE;
const call = (token, method, p, o = {}) => c.call(method, p, { token, ...o });
const sql = (s) => h.asSuper(s); const throwsSql = (s, re) => { let err = null; try { sql(s); } catch (e) { err = String(e.message || e); } assert.ok(err, `refused: ${s.slice(0, 90)}`); if (re) assert.match(err, re); };
const who = (role) => T.people.find((p) => p.role === role && p.seat === 1).id;
const file = async (token, name) => { const r = await call(token, 'POST', '/v1/evidence', { raw: `synthetic ${name}`, headers: { 'content-type': 'text/plain', 'x-file-name': `${name}.txt` } }); assert.equal(r.status, 201, J(r.body)); return r.body.id; };
const matrix = async (room = HALL, token = T.cxeng) => { const m = await call(token, 'GET', `/v1/rooms/${room}/documentation`); assert.equal(m.status, 200, J(m.body)); return m.body; };
const doc = (room, kind) => `/v1/rooms/${room}/documentation/${kind}`;

before(async () => {
  h = await setup({ db: 'empathia_documentation', port: 4162, env: { DEMO_SESSIONS: 'on' } }); c = client(h.base); h.asSuper('UPDATE app.demo_config SET enabled = true');
  const o = await c.call('POST', '/v1/demo/sandboxes', { body: {} }); assert.equal(o.status, 201, J(o.body)); sb = o.body.sandbox; T.people = o.body.personas;
  for (const role of ['designer', 'syseng', 'installer', 'cxeng', 'exec', 'qa_reviewer', 'opslead']) T[role] = (await c.call('POST', '/v1/demo/sessions', { body: { sandboxId: sb.id, key: sb.key, role } })).body.accessToken;
  HUDDLE = sql(`SELECT r.code FROM app.room r JOIN app.tenant t ON t.id = r.tenant_id WHERE t.slug = '${sb.tenant}' AND r.template = 'huddle' ORDER BY r.code LIMIT 1`);
  T.tenant = sql(`SELECT id FROM app.tenant WHERE slug = '${sb.tenant}'`);
});
after(async () => { await h?.app.stop(); });

test('DOC-01 the matrix follows what each room contains; nothing approved, nothing signed', async () => {
  const m = await matrix(); assert.equal(m.status.required, 14, J(m.status)); assert.deepEqual([m.status.approved, m.status.percent, m.status.complete], [0, 0, false]);
  assert.deepEqual(m.status.unsigned, ['VENDOR', 'INTERNAL']); assert.equal(m.signatures.length, 0); assert.equal(m.packet, null);
  const hd = await matrix(HUDDLE); assert.ok(hd.status.required >= 6 && hd.status.required < 14, `the huddle room requires ${hd.status.required}`);
  assert.deepEqual([m.may.submit, (await matrix(HALL, T.qa_reviewer)).may.review, (await matrix(HALL, T.opslead)).may.sign.VENDOR, (await matrix(HALL, T.syseng)).may.sign.INTERNAL], [true, true, true, true]);
});

test('DOC-02 a submission needs the authority, this organization’s stored file, a required document, an open room, the last version decided', async () => {
  const ev = await file(T.installer, 'as-builts');
  assert.equal((await call(T.exec, 'POST', doc(HALL, 'as_built_drawings'), { body: { evidenceId: ev } })).status, 403);
  const none = await call(T.installer, 'POST', doc(HALL, 'as_built_drawings'), { body: { evidenceId: '00000000-0000-4000-8000-000000000000' } }); assert.equal(none.status, 422, J(none.body)); assert.match(J(none.body), /not one of this organization/);
  const hd = await matrix(HUDDLE); const notNeeded = hd.documents.find((d) => !d.required);
  if (notNeeded) { const r = await call(T.installer, 'POST', doc(HUDDLE, notNeeded.kind), { body: { evidenceId: ev } }); assert.equal(r.status, 422, J(r.body)); assert.match(J(r.body), /does not require/); }
  const made = await call(T.designer, 'POST', '/v1/rooms', { body: { name: 'Not built yet (synthetic)', template: 'huddle', buildingCode: 'ATL', floor: 3 } }); assert.equal(made.status, 201);
  const planned = await call(T.installer, 'POST', doc(made.body.code, 'as_built_drawings'), { body: { evidenceId: ev } }); assert.equal(planned.status, 422); assert.match(J(planned.body), /PLANNED: documents are submitted for an installed room/);
  const ok = await call(T.installer, 'POST', doc(HALL, 'as_built_drawings'), { body: { evidenceId: ev, note: 'rev 2 as installed' } }); assert.equal(ok.status, 201, J(ok.body)); assert.deepEqual([ok.body.version, ok.body.state], [1, 'SUBMITTED']);
  const again = await call(T.installer, 'POST', doc(HALL, 'as_built_drawings'), { body: { evidenceId: ev } }); assert.equal(again.status, 422); assert.match(J(again.body), /still awaiting review/);
  throwsSql(`INSERT INTO app.room_document (tenant_id, room_id, kind, version, evidence_id, submitted_by, submitted_role) SELECT tenant_id, room_id, kind, 2, evidence_id, submitted_by, 'installer' FROM app.room_document WHERE tenant_id = '${T.tenant}' AND kind = 'as_built_drawings'`, /still awaiting review/);
});

test('DOC-03 review: the authority, never the submitter, a rejection says what to correct, once; then a new version', async () => {
  assert.equal((await call(T.installer, 'POST', `${doc(HALL, 'as_built_drawings')}/review`, { body: { decision: 'APPROVED' } })).status, 403, 'the submitter’s role cannot review');
  throwsSql(`UPDATE app.room_document SET state = 'APPROVED', reviewed_by = submitted_by, reviewed_at = now() WHERE tenant_id = '${T.tenant}' AND kind = 'as_built_drawings'`, /room_document_not_self_reviewed/);
  const bare = await call(T.qa_reviewer, 'POST', `${doc(HALL, 'as_built_drawings')}/review`, { body: { decision: 'REJECTED' } }); assert.equal(bare.status, 422); assert.match(J(bare.body), /says what to correct/);
  const no = await call(T.qa_reviewer, 'POST', `${doc(HALL, 'as_built_drawings')}/review`, { body: { decision: 'REJECTED', note: 'Rack 2 is not shown; add it.' } }); assert.equal(no.status, 200, J(no.body)); assert.equal(no.body.state, 'REJECTED');
  const twice = await call(T.qa_reviewer, 'POST', `${doc(HALL, 'as_built_drawings')}/review`, { body: { decision: 'APPROVED' } }); assert.equal(twice.status, 422); assert.match(J(twice.body), /reviewed already \(REJECTED\)/);
  const v2 = await call(T.installer, 'POST', doc(HALL, 'as_built_drawings'), { body: { evidenceId: await file(T.installer, 'as-builts-v2') } }); assert.equal(v2.status, 201); assert.equal(v2.body.version, 2);
  const yes = await call(T.qa_reviewer, 'POST', `${doc(HALL, 'as_built_drawings')}/review`, { body: { decision: 'APPROVED' } }); assert.equal(yes.status, 200); assert.equal(yes.body.status.approved, 1);
  const m = await matrix(); assert.deepEqual(m.documents.find((d) => d.kind === 'as_built_drawings').versions.map((v) => [v.version, v.state]), [[1, 'REJECTED'], [2, 'APPROVED']]);
});

test('DOC-04 signatures: after every document is approved, each side by its own authority, two different people', async () => {
  const early = await call(T.opslead, 'POST', `/v1/rooms/${HALL}/documentation/sign/VENDOR`); assert.equal(early.status, 422, J(early.body)); assert.match(J(early.body), /once every required document is approved \(1 of 14\)/);
  await documentRoom(c, HALL, { submit: T.cxeng, review: T.qa_reviewer, vendor: T.opslead, internal: T.syseng });   // submits and approves the rest, then signs
  const m = await matrix(); assert.equal(m.status.approved, 14); assert.equal(m.status.complete, true, J(m.status)); assert.match(m.packet, /^[0-9a-f]{64}$/);
  assert.deepEqual(m.signatures.map((s) => [s.side, s.current]), [['VENDOR', true], ['INTERNAL', true]]);
  assert.equal((await call(T.syseng, 'POST', `/v1/rooms/${HALL}/documentation/sign/VENDOR`)).status, 403, 'the integrator’s side is not the owner’s to sign');
  const dup = await call(T.syseng, 'POST', `/v1/rooms/${HALL}/documentation/sign/INTERNAL`); assert.equal(dup.status, 422); assert.match(J(dup.body), /on the packet already/);
  // one person on both sides of one packet: refused by the database, whoever writes
  throwsSql(`INSERT INTO app.documentation_signature (tenant_id, room_id, side, packet_sha256, documents, signed_by, signed_role) SELECT tenant_id, room_id, 'INTERNAL', '${'0'.repeat(64)}', '[]', signed_by, 'syseng' FROM app.documentation_signature WHERE tenant_id = '${T.tenant}' AND side = 'VENDOR'`, /two different people|duplicate/);
});

test('DOC-05 a change after signing leaves the signatures on the packet they signed', async () => {
  const before = (await matrix()).packet;
  const v = await call(T.cxeng, 'POST', doc(HALL, 'firmware_list'), { body: { evidenceId: await file(T.cxeng, 'firmware-list-v2'), note: 'DSP firmware updated' } }); assert.equal(v.status, 201, J(v.body));
  const m = await matrix(); assert.equal(m.packet, null, 'a version awaiting review: no packet to sign'); assert.deepEqual(m.status.unsigned, ['VENDOR', 'INTERNAL']); assert.ok(m.signatures.every((s) => !s.current && s.packet === before));
  assert.equal((await call(T.qa_reviewer, 'POST', `${doc(HALL, 'firmware_list')}/review`, { body: { decision: 'APPROVED' } })).status, 200);
  const n = await matrix(); assert.notEqual(n.packet, before); assert.deepEqual(n.status.unsigned, ['VENDOR', 'INTERNAL'], 'the new packet is unsigned');
});

test('DOC-06 the acceptance gate: readiness names it; a direct request to accept is refused for it; signed, it no longer holds', async () => {
  await registerRoom(c, HALL, T.installer); assert.equal((await call(T.syseng, 'POST', `/v1/rooms/${HALL}/lifecycle`, { body: { to: 'COMMISSIONING' } })).status, 200);
  const r = await call(T.qa_reviewer, 'GET', `/v1/rooms/${HALL}/readiness`); const b = r.body.next.blockers; assert.ok(b.some((x) => /^documentation and submission: 14 of 14 required documents approved \(100%\) — signature outstanding/.test(x)), J(b));
  const accept = await call(T.qa_reviewer, 'POST', `/v1/rooms/${HALL}/lifecycle`, { body: { to: 'ACCEPTED' } }); assert.equal(accept.status, 422); assert.match(J(accept.body), /documentation and submission/);
  await documentRoom(c, HALL, { submit: T.cxeng, review: T.qa_reviewer, vendor: T.opslead, internal: T.syseng });
  const after = (await call(T.qa_reviewer, 'GET', `/v1/rooms/${HALL}/readiness`)).body.next.blockers; assert.ok(!after.some((x) => /documentation/.test(x)), J(after)); assert.ok(after.length, 'the tests still hold acceptance');
});

test('DOC-07 a submission is immutable and never deleted; another organization sees only its own', async () => {
  throwsSql(`UPDATE app.room_document SET evidence_id = (SELECT evidence_id FROM app.room_document WHERE tenant_id = '${T.tenant}' AND kind = 'photo_set' LIMIT 1) WHERE tenant_id = '${T.tenant}' AND kind = 'as_built_drawings' AND version = 2`, /immutable/);
  throwsSql(`DELETE FROM app.room_document WHERE tenant_id = '${T.tenant}' AND kind = 'as_built_drawings'`, /never deleted/);
  throwsSql(`DELETE FROM app.documentation_signature WHERE tenant_id = '${T.tenant}'`);
  const o = await c.call('POST', '/v1/demo/sandboxes', { body: {} }); const x = o.body.sandbox;
  const cx = (await c.call('POST', '/v1/demo/sessions', { body: { sandboxId: x.id, key: x.key, role: 'cxeng' } })).body.accessToken;
  const theirs = await matrix(HALL, cx); assert.ok(theirs.documents.every((d) => !d.versions.length), 'their theatre has no documents'); assert.equal(theirs.signatures.length, 0);
  const ev = await file(cx, 'theirs'); const mine = await call(T.installer, 'POST', doc(HALL, 'photo_set'), { body: { evidenceId: ev } }); assert.equal(mine.status, 422); assert.match(J(mine.body), /not one of this organization|awaiting review/);
});
