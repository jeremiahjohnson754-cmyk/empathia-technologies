#!/usr/bin/env node
/**
 * The owner's checkpoint scenario, end to end over the real enterprise API (in-process) and a real PostgreSQL database (a private one
 * per run, migrated and seeded through the real code). Synthetic data only.
 *
 *   Build a room in Lite → approve its design → commission it → accept the baseline → change the camera → inspect the affected
 *   dependencies → the new verification requirements → the Room Story and the Pro analytics.
 *
 * Every state is reached through the API by the persona that holds the authority: no SQL writes, no fixtures. Every applicable test is
 * recorded by its responsible role with the evidence kind it accepts and verified by a different person; the room is accepted by
 * someone who neither recorded nor verified (a delegation of customer.accept, ADR-0005). The camera is changed the governed way: the
 * accepted room is recommissioned (ACCEPTED → COMMISSIONING, ADR-0003) and its model substituted; the change is saved as a revision and
 * approved by an engineer who is not its author; the requirements it generates come back from readiness with their reasons.
 *
 * ADR-0012 (C-89 onward): the camera is a POSITION (PA-) with a PHYSICAL UNIT (AS-) installed by a dated installation record; the
 * substitution keeps the position, closes the original unit's installation (SUBSTITUTED) and installs a unit of the new model, and the
 * evidence holds both the position history and each unit's history.
 *
 * Every request and response is saved as evidence (tokens redacted): one JSON file per step under tests/evidence/checkpoint/, plus
 * CHECKPOINT.md and checkpoint.json.
 *   node tests/e2e/checkpoint-room-lifecycle.e2e.mjs [evidence-dir]
 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { setup, client, DEV_PASSWORD, mail } from '../integration/harness.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// the shared engine's sentence builders: the expected acceptance blockers are built with them, so the API's wording and order are the engine's
const CE = await import(pathToFileURL(path.join(repo, 'packages/commissioning-engine/dist/src/index.js')).href);
/** The documented order of the acceptance blockers (CE.ACCEPTANCE_BLOCKER_ORDER): the kind of one blocker sentence. */
const blockerKind = (s) => (/^the design changed while the room is recommissioned/.test(s) ? 'design-binding' : /^\d+ open issue\(s\): /.test(s) ? 'open-issues' : /^\d+ (test\(s\) were last recorded|reopened test\(s\) were re-run)/.test(s) ? 'reopened-tests' : /^acceptance needs every applicable test/.test(s) ? 'acceptance-count' : 'other');
const inOrder = (list) => list.map(blockerKind).every((k, i, a) => k !== 'other' && (i === 0 || CE.ACCEPTANCE_BLOCKER_ORDER.indexOf(a[i - 1]) <= CE.ACCEPTANCE_BLOCKER_ORDER.indexOf(k)));
const out = path.resolve(process.argv[2] || path.join(repo, 'tests/evidence/checkpoint')); fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) if (/^\d{2}-[a-z0-9-]+\.json$/.test(f) || f === 'CHECKPOINT.md' || f === 'checkpoint.json') fs.rmSync(path.join(out, f));   // only this suite's own files
const PORT = 4183; const DB = 'empathia_test_checkpoint_e2e';
const INSTRUMENT = 'SYN-METER-01 (synthetic), calibration record SYN-CAL-2026-09';
const NEW_MODEL = 'SYN-PTZ-12X (synthetic PTZ camera)';
const results = []; let failed = 0; const steps = []; let cur = null; const facts = {};
const ok = (id, name, cond, detail = '') => { const r = { id, name, result: cond ? 'PASS' : 'FAIL', ...(cond ? {} : { detail: String(detail).slice(0, 600) }) }; results.push(r); cur?.assertions.push(r); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name}${cond ? '' : ' — ' + String(detail).slice(0, 400)}`); return !!cond; };
const SECRET = /token|authorization|password|secret/i;
const redact = (v) => (Array.isArray(v) ? v.map(redact) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SECRET.test(k) ? '[REDACTED]' : redact(x)])) : v);
const step = (n, slug, title) => { cur = { file: `${String(n).padStart(2, '0')}-${slug}.json`, step: n, title, exchanges: [], assertions: [] }; steps.push(cur); console.log(`\n— ${cur.file.replace('.json', '')}: ${title}`); };

const h = await setup({ db: DB, port: PORT });
const c = client(h.base);
const tok = (persona) => c.login(persona);
/** One recorded exchange: method, path, persona, status, request and response body (redacted), correlation id. */
const api = async (persona, method, p, opts = {}) => {
  const token = opts.token || (persona ? await tok(persona) : undefined);
  const r = await c.call(method, p, { body: opts.body, raw: opts.raw, headers: opts.headers, token });
  cur.exchanges.push({ method, path: p, persona: persona || 'anonymous', status: r.status,
    ...(opts.raw ? { request: { contentType: opts.headers?.['content-type'], fileName: opts.headers?.['x-file-name'], bytes: opts.raw.length } } : opts.body !== undefined ? { request: redact(opts.body) } : {}),
    body: opts.keep === false ? { omitted: 'large body; see the step that records it in full' } : redact(r.body), correlationId: r.headers['x-correlation-id'] || null });
  return r;
};
/** A fresh sign-in (not cached): the principal is resolved again, so a delegation given since the last sign-in is visible. */
const fresh = async (role) => (await c.call('POST', '/v1/auth/token', { body: { email: mail(role), password: DEV_PASSWORD, tenant: 'empathia-demo', role } })).body.accessToken;
const J = (x) => JSON.stringify(x);
let code, camera; const devices = {};

try {
  // ============================================================================================ 1 · build a room in Lite
  step(1, 'create-room', 'Create the room (Lite: a custom outline with declared dimensions, use and occupancy)');
  const roomBody = { name: 'Checkpoint conference room (synthetic)', template: 'custom', buildingCode: 'NST', floor: 2, unit: 'm', length: '5.5', width: '4.2', ceiling: '2.8', intendedUse: 'Small conference room: six people meet with remote participants by video', occupancy: 6 };
  ok('C-01', 'a person without room.design cannot create a room (403)', (await api('installer', 'POST', '/v1/rooms', { body: roomBody })).status === 403);
  const created = await api('designer', 'POST', '/v1/rooms', { body: roomBody, headers: { 'idempotency-key': 'checkpoint-room-0001' } });
  ok('C-02', 'the designer creates the room: 201 with a canonical room code', created.status === 201 && /^R-PLN-\d{4}$/.test(created.body?.code || ''), J(created.body));
  code = created.body.code; facts.room = code;
  const r0 = await api('designer', 'GET', `/v1/rooms/${code}`);
  ok('C-03', 'the room is PLANNED with declared dimensions and no devices yet', r0.body.room.lifecycle === 'PLANNED' && r0.body.devices.length === 0 && r0.body.room.geometry.confidence === 'declared', J(r0.body.room).slice(0, 300));

  step(2, 'design-devices', 'Design it: add the devices of the Small Conference Room template, including the camera');
  // the Small Conference Room template's device list (packages/domain-data: templates.small_conf), placed inside the 4.2 m × 5.5 m outline
  const plan = [['table', 2.1, 2.8, 'floor'], ['chairs', 2.1, 3.4, 'floor'], ['display', 2.1, 0.1, 'wall'], ['camera', 2.1, 0.15, 'wall'], ['micceil', 2.1, 2.8, 'ceiling'], ['speaker', 2.1, 1.5, 'ceiling'], ['dsp', 0.3, 0.3, 'rack'], ['compute', 0.4, 0.3, 'rack'], ['touch', 2.1, 2.6, 'table'], ['switch', 0.5, 0.3, 'rack']];
  let missingCamera = null;
  for (const [category, x, y, mount] of plan) {
    const d = await api('designer', 'POST', `/v1/rooms/${code}/devices`, { body: { category, x, y, mount }, headers: { 'idempotency-key': `checkpoint-dev-${category}` } });
    if (d.status !== 201) { ok('C-04', `device ${category} added`, false, J(d.body)); continue; }
    devices[category] = d.body.assetId;
    if (category === 'display') missingCamera = (await api('designer', 'GET', `/v1/rooms/${code}`, { keep: false })).body.issues.find((i) => i.key === 'missing-equipment:camera');
  }
  camera = devices.camera; facts.camera = camera;
  ok('C-04', 'all ten devices are added, each with a tenant-unique canonical asset id', Object.keys(devices).length === 10 && Object.values(devices).every((id) => /^PA-\d{4,}$/.test(id)) && new Set(Object.values(devices)).size === 10, J(devices));
  ok('C-05', 'before the camera is added, Lite’s required-equipment rule opens a High design deficiency: the room type needs a camera', missingCamera && missingCamera.severity === 'High' && missingCamera.state === 'OPEN', J(missingCamera));
  const r1 = await api('designer', 'GET', `/v1/rooms/${code}`);
  ok('C-06', 'with the camera in the design the deficiency is resolved, and the camera is proposed into the video path (camera → room compute) and the network', r1.body.issues.find((i) => i.key === 'missing-equipment:camera')?.state === 'RESOLVED' && r1.body.connections.some((x) => x.from === camera && x.to === devices.compute && x.kind === 'signal') && r1.body.connections.some((x) => x.from === camera && x.to === devices.switch && x.kind === 'network'), J(r1.body.connections));
  ok('C-07', 'no open High/Critical design deficiency remains; the plan is compiled server-side with applicable tests', !r1.body.issues.some((i) => i.state === 'OPEN' && ['High', 'Critical'].includes(i.severity)) && r1.body.commissioning.applicable > 0, J(r1.body.issues));

  step(3, 'save-revision', 'Save an immutable design revision');
  const rev = await api('designer', 'POST', `/v1/rooms/${code}/revisions`, { body: { reason: 'checkpoint: the designed conference room' }, headers: { 'idempotency-key': 'checkpoint-rev-0001' } });
  ok('C-08', 'the designer saves revision 2 with its SHA-256', rev.status === 201 && rev.body.revision === 2 && /^[0-9a-f]{64}$/.test(rev.body.sha256), J(rev.body));
  ok('C-09', 'a revision with nothing changed is refused (422)', (await api('designer', 'POST', `/v1/rooms/${code}/revisions`, { body: { reason: 'again' } })).status === 422);

  // ============================================================================================ 2 · approve its design
  step(4, 'approve-classification', 'Approve the classification (an engineer, not the author of the revision)');
  ok('C-10', 'the designer cannot approve the classification (403)', (await api('designer', 'POST', `/v1/rooms/${code}/classification/approve`, { body: {} })).status === 403);
  const cls = await api('syseng', 'POST', `/v1/rooms/${code}/classification/approve`, { body: {} });
  ok('C-11', 'the systems engineer approves the suggested classification', cls.status === 200 && cls.body.approved && cls.body.approved.override === false, J(cls.body));
  facts.archetype = cls.body.approved?.archetypeName;

  step(5, 'drawings', 'Generate the drawing set and approve every drawing');
  const gen = await api('designer', 'POST', `/v1/rooms/${code}/drawings/generate`);
  ok('C-12', 'the designer generates the drawing set (seven drawings, GENERATED)', gen.status === 200 && gen.body.drawings.length === 7 && gen.body.drawings.every((d) => d.state === 'GENERATED'), J(gen.body));
  ok('C-13', 'the designer cannot approve a drawing (403)', (await api('designer', 'POST', `/v1/rooms/${code}/drawings/plan/approve`)).status === 403);
  let drawingsOk = true; for (const d of gen.body.drawings) drawingsOk = (await api('syseng', 'POST', `/v1/rooms/${code}/drawings/${d.kind}/approve`)).status === 200 && drawingsOk;
  const r2 = await api('designer', 'GET', `/v1/rooms/${code}`, { keep: false });
  ok('C-14', 'the systems engineer approves all seven drawings', drawingsOk && r2.body.drawings.every((d) => d.state === 'APPROVED'), J(r2.body.drawings));

  step(6, 'lifecycle-to-commissioning', 'Move the governed lifecycle one step at a time, each step by its authority');
  const move = (persona, to, token) => api(persona, 'POST', `/v1/rooms/${code}/lifecycle`, { body: { to }, token });
  ok('C-15', 'the designer cannot approve the design (403: room.design.approve)', (await move('designer', 'DESIGN_APPROVED')).status === 403);
  ok('C-16', 'one governed step at a time: PLANNED → COMMISSIONING is refused (422)', (await move('syseng', 'COMMISSIONING')).status === 422);
  ok('C-17', 'the systems engineer approves the design (DESIGN_APPROVED)', (await move('syseng', 'DESIGN_APPROVED')).status === 200);
  ok('C-18', 'the installer cannot open the installation window (403: window.approve)', (await move('installer', 'INSTALLATION_PENDING')).status === 403);
  ok('C-19', 'the operations lead approves the installation window (INSTALLATION_PENDING)', (await move('opslead', 'INSTALLATION_PENDING')).status === 200);
  ok('C-20', 'the installer records the installation (INSTALLED_UNVERIFIED)', (await move('installer', 'INSTALLED_UNVERIFIED')).status === 200);
  ok('C-21', 'the installer cannot start commissioning (403: plan.compile)', (await move('installer', 'COMMISSIONING')).status === 403);
  ok('C-22', 'the systems engineer starts commissioning (COMMISSIONING)', (await move('syseng', 'COMMISSIONING')).status === 200);
  const r3 = await api('designer', 'GET', `/v1/rooms/${code}`);
  const rows = r3.body.commissioning.rows.filter((x) => x.applicable);
  facts.applicable = rows.length; facts.approvedRevision = r3.body.room.approvedRevision;
  ok('C-23', 'the room is COMMISSIONING, the approved revision is 2, every applicable test is NOT_TESTED and needs physical execution', r3.body.room.lifecycle === 'COMMISSIONING' && r3.body.room.approvedRevision === 2 && rows.length > 0 && rows.every((x) => x.result === 'NOT_TESTED' && x.status !== 'BLOCKED_BY_PREREQUISITE'), `${rows.length} applicable`);
  const installed = r3.body.devices.filter((d) => !d.furniture);
  const camPos0 = await api('installer', 'GET', `/v1/rooms/${code}/positions/${devices.camera}/history`);
  const unit0 = camPos0.body.current?.asset; facts.cameraUnit = { original: unit0 };
  const unit0h = await api('installer', 'GET', `/v1/assets/${unit0}/history`);
  ok('C-89', 'recording the installation put one physical unit at every non-furniture position — identity UNKNOWN, no serial, no maker — recorded by the installer (ADR-0012)', installed.length === 8 && installed.every((d) => /^AS-\d{4,}$/.test(d.asset) && d.identityState === 'UNKNOWN') && new Set(installed.map((d) => d.asset)).size === 8 && camPos0.body.installations.length === 1 && camPos0.body.installations[0].installedRole === 'installer' && camPos0.body.installations[0].basis === 'RECORDED' && unit0h.body.asset.serial === null && unit0h.body.asset.manufacturer === null, J(installed.map((d) => [d.id, d.asset, d.identityState])));

  // ============================================================================================ 3 · commission it
  step(7, 'evidence', 'Upload one evidence file per applicable test (content-addressed, hashed, retained)');
  const recorder = (row) => row.personas[0];
  const UPLOADERS = ['service', 'installer', 'cxeng', 'dsp_eng', 'video_eng', 'control_eng'];   // roles that hold an evidence authority (work.evidence, field.scan, test.verify*)
  const up = (persona, row) => api(persona, 'POST', '/v1/evidence', { raw: Buffer.from(J({ room: code, test: row.test_id, kind: row.evidence[0], recordedBy: recorder(row), observation: `synthetic ${row.label} observation for the checkpoint scenario`, ...(row.instrument ? { instrument: INSTRUMENT } : {}) })), headers: { 'content-type': 'application/json', 'x-file-name': `${row.test_id}.json` } });
  const sysRow = rows.find((x) => recorder(x) === 'syseng');
  ok('C-24', 'the systems engineer holds no evidence-upload authority (403); the commissioning engineer files the engineering records for the tests the systems engineer records', !sysRow || (await up('syseng', sysRow)).status === 403);
  const evidence = {}; let upOk = true;
  for (const row of rows) { const who = UPLOADERS.includes(recorder(row)) ? recorder(row) : 'cxeng'; const e = await up(who, row); upOk = upOk && e.status === 201 && /^[0-9a-f]{64}$/.test(e.body.sha256); evidence[row.test_id] = e.body; }
  ok('C-25', `one evidence object per applicable test is stored with its SHA-256 and a retention date (${rows.length})`, upOk && Object.values(evidence).every((e) => e.retentionUntil), '');
  const sample = await fetch(`${h.base}/v1/evidence/${evidence[rows[0].test_id].id}/content`, { headers: { authorization: `Bearer ${await tok('cxeng')}` } });
  const sampleText = await sample.text();
  cur.exchanges.push({ method: 'GET', path: `/v1/evidence/${evidence[rows[0].test_id].id}/content`, persona: 'cxeng', status: sample.status, body: sampleText.slice(0, 400) });
  ok('C-26', 'an evidence file reads back byte-for-byte (its hash re-verified on read)', sample.status === 200 && JSON.parse(sampleText).test === rows[0].test_id);

  step(8, 'record-results', 'Record every applicable test: the responsible role, the evidence kind it accepts, the instrument where measured');
  const rec = (persona, row, state = 'PASS') => api(persona, 'POST', `/v1/rooms/${code}/results`, { body: { testId: row.test_id, state, evidenceId: evidence[row.test_id].id, evidenceKind: row.evidence[0], ...(row.instrument ? { instrument: INSTRUMENT } : {}) } });
  const notResponsible = rows.find((x) => !x.personas.includes('designer'));
  ok('C-27', 'the designer is not a responsible role for a commissioning test (403)', (await rec('designer', notResponsible)).status === 403);
  const wrongKind = await api('cxeng', 'POST', `/v1/rooms/${code}/results`, { body: { testId: rows[0].test_id, state: 'PASS', evidenceId: evidence[rows[0].test_id].id, evidenceKind: 'PHOTO_INFERRED_GUESS' } });
  ok('C-28', 'an evidence kind the test does not accept is refused (422)', wrongKind.status === 422, J(wrongKind.body));
  const byRole = {}; let recOk = true;
  for (const row of rows) { const r = await rec(recorder(row), row); recOk = recOk && r.status === 201 && r.body.resultLabel === 'PASS_UNVERIFIED'; byRole[recorder(row)] = (byRole[recorder(row)] || 0) + 1; if (r.status !== 201) console.log('  record', row.test_id, r.status, J(r.body)); }
  facts.recordedBy = byRole;
  ok('C-29', `every applicable test is recorded by its responsible role and is PASS_UNVERIFIED (${Object.entries(byRole).map(([k, v]) => `${k} ${v}`).join(', ')})`, recOk);

  step(9, 'verify-results', 'Verify every result independently (never by its recorder)');
  const cxRow = rows.find((x) => recorder(x) === 'cxeng');
  const self = await api('cxeng', 'POST', `/v1/rooms/${code}/results/${cxRow.test_id}/verify`);
  ok('C-30', 'self-verification is refused: the commissioning engineer cannot verify a result they recorded (422)', [403, 422].includes(self.status) && /independent/.test(J(self.body)), `${self.status} ${J(self.body)}`);
  const fieldRow = rows.find((x) => recorder(x) === 'service');
  ok('C-31', 'the field technician holds no verification authority (403)', !fieldRow || (await api('service', 'POST', `/v1/rooms/${code}/results/${fieldRow.test_id}/verify`)).status === 403);
  const verifier = (row) => (recorder(row) === 'cxeng' ? 'qa_reviewer' : 'cxeng');
  let verOk = true; const byVerifier = {};
  for (const row of rows) { const v = await api(verifier(row), 'POST', `/v1/rooms/${code}/results/${row.test_id}/verify`); verOk = verOk && v.status === 200 && v.body.resultLabel === 'PASS_VERIFIED'; byVerifier[verifier(row)] = (byVerifier[verifier(row)] || 0) + 1; }
  facts.verifiedBy = byVerifier;
  ok('C-32', `every result is PASS_VERIFIED by a different person (${Object.entries(byVerifier).map(([k, v]) => `${k} ${v}`).join(', ')})`, verOk);
  ok('C-33', 'a result is never verified twice (422)', (await api('cxeng', 'POST', `/v1/rooms/${code}/results/${rows.find((x) => verifier(x) === 'cxeng').test_id}/verify`)).status === 422);

  // ============================================================================================ 4 · accept the baseline
  step(10, 'accept-baseline', 'Accept the room as the authorized reviewer; baseline v1 is published');
  ok('C-34', 'the systems engineer cannot accept the room (403: customer.accept)', (await move('syseng', 'ACCEPTED')).status === 403);
  const qaAcc = await move('qa_reviewer', 'ACCEPTED');
  ok('C-35', 'the QA reviewer verified results of this room and is refused the acceptance (422, separation of duties)', qaAcc.status === 422 && /separation of duties/.test(J(qaAcc.body)), J(qaAcc.body));
  const opsId = (await api('opslead', 'GET', '/v1/me')).body.person.id;
  const del = await api('qa_reviewer', 'POST', '/v1/delegations', { body: { granteeId: opsId, authority: 'customer.accept', reason: 'checkpoint (synthetic): QA verified the results and cannot accept; the operations lead accepts', days: 2 }, headers: { 'idempotency-key': 'checkpoint-del-0001' } });
  ok('C-36', 'the QA reviewer lends customer.accept to the operations lead, scoped and expiring (ADR-0005)', del.status === 201 && del.body.id, J(del.body));
  const opsTok = await fresh('opslead');
  const acc = await move('opslead', 'ACCEPTED', opsTok);
  ok('C-37', 'the operations lead — neither recorder nor verifier — accepts the room through the delegation (200)', acc.status === 200 && acc.body.to === 'ACCEPTED', J(acc.body));
  const lin1 = await api('syseng', 'GET', `/v1/rooms/${code}/baselines`);
  const v1 = lin1.body.items?.find((b) => b.version === 1);
  ok('C-38', 'baseline v1 exists and is CURRENT', lin1.status === 200 && lin1.body.items.length === 1 && v1?.state === 'CURRENT' && lin1.body.current?.id === v1.id, J(lin1.body).slice(0, 300));
  ok('C-39', 'v1 binds the approved design revision 2, its hash, the plan, every applicable result PASS_VERIFIED and every evidence object', v1 && v1.design_revision === 2 && /^[0-9a-f]{64}$/.test(v1.design_sha256) && v1.plan_id && Object.keys(v1.results).length === rows.length && Object.values(v1.results).every((x) => x === 'PASS_VERIFIED') && v1.evidence_ids.length === rows.length && v1.published_by === opsId, J(v1).slice(0, 400));
  facts.v1 = { id: v1?.id, designRevision: v1?.design_revision, publishedAt: v1?.published_at };
  const v1Before = J(v1);
  const rev2Before = J((await api('designer', 'GET', `/v1/rooms/${code}`, { keep: false })).body.revisions.find((x) => x.rev_no === 2));

  // ============================================================================================ 5 · change the camera (the governed way)
  step(11, 'recommission', 'An accepted room is not edited directly: it is recommissioned (ACCEPTED → COMMISSIONING, plan.compile)');
  const direct = await api('designer', 'PATCH', `/v1/rooms/${code}/devices/${camera}`, { body: { model: NEW_MODEL } });
  ok('C-40', 'substituting the camera of the ACCEPTED room directly is refused (422) and the refusal names recommissioning', direct.status === 422 && /recommission/i.test(J(direct.body)), `${direct.status} ${J(direct.body)}`);
  ok('C-41', 'the installer cannot recommission the room (403: plan.compile)', (await move('installer', 'COMMISSIONING')).status === 403);
  const recom = await move('syseng', 'COMMISSIONING');
  ok('C-42', 'the systems engineer recommissions the room (ACCEPTED → COMMISSIONING)', recom.status === 200 && recom.body.from === 'ACCEPTED' && recom.body.to === 'COMMISSIONING', J(recom.body));
  const lin2 = await api('syseng', 'GET', `/v1/rooms/${code}/baselines`);
  ok('C-43', 'baseline v1 stays CURRENT while the room is recommissioned', lin2.body.current?.version === 1 && lin2.body.items.length === 1);

  step(12, 'camera-swap', 'Substitute the camera model (the asset keeps its id; the model history is kept)');
  ok('C-44', 'the installer cannot change the design (403: room.design)', (await api('installer', 'PATCH', `/v1/rooms/${code}/devices/${camera}`, { body: { model: NEW_MODEL } })).status === 403);
  const moveCam = await api('designer', 'PATCH', `/v1/rooms/${code}/devices/${camera}`, { body: { x: 1.2 } });
  ok('C-45', 'during recommissioning a device is not moved: only a model substitution is accepted (422)', moveCam.status === 422, `${moveCam.status} ${J(moveCam.body)}`);
  const swap = await api('designer', 'PATCH', `/v1/rooms/${code}/devices/${camera}`, { body: { model: NEW_MODEL } });
  ok('C-46', 'the designer substitutes the camera model (200); the response names the tests the substitution reopens', swap.status === 200 && swap.body.assetId === camera && Array.isArray(swap.body.reverification) && swap.body.reverification.length > 0, `${swap.status} ${J(swap.body)}`);
  const r4 = await api('designer', 'GET', `/v1/rooms/${code}`);
  const cam = r4.body.devices.find((d) => d.id === camera);
  ok('C-47', 'the camera keeps its asset id, carries the new model, and its model history keeps the previous model', cam && cam.model === NEW_MODEL && cam.cat === 'camera' && Array.isArray(cam.modelHistory) && cam.modelHistory.length === 1 && cam.modelHistory[0].model === 'generic' && cam.modelHistory[0].until, J(cam));
  ok('C-48', 'no other device changed: same ten asset ids', r4.body.devices.length === 10 && r4.body.devices.every((d) => Object.values(devices).includes(d.id)));
  const camPos = await api('designer', 'GET', `/v1/rooms/${code}/positions/${camera}/history`);
  const [inst0, inst1] = camPos.body.installations || [];
  facts.cameraUnit.replacement = inst1?.asset;
  ok('C-90', 'the swap produced two installation records for the camera position: the original unit closed SUBSTITUTED, a unit of the new model open; the position keeps its code', camPos.status === 200 && camPos.body.position.code === camera && camPos.body.installations.length === 2 && inst0.asset === facts.cameraUnit.original && inst0.removalReason === 'SUBSTITUTED' && inst0.removedRole === 'designer' && inst1.installReason === 'SUBSTITUTION' && inst1.model === NEW_MODEL && !inst1.removedAt && inst1.asset !== inst0.asset && cam.asset === inst1.asset && swap.body.installation?.installed?.asset === inst1.asset, J(camPos.body.installations));
  const unit0After = await api('designer', 'GET', `/v1/assets/${facts.cameraUnit.original}/history`);
  ok('C-91', 'the original unit’s history survives intact: its own identity (UNKNOWN, model generic) and its installation at the camera position with both ends, actors and reasons', unit0After.status === 200 && J(unit0After.body.asset) === J(unit0h.body.asset) && unit0After.body.installations.length === 1 && unit0After.body.installations[0].position === camera && unit0After.body.installations[0].installReason === 'INITIAL' && unit0After.body.installations[0].removalReason === 'SUBSTITUTED' && unit0After.body.current === null && unit0After.body.asset.model === 'generic', J(unit0After.body).slice(0, 400));

  step(13, 'revision-compare', 'Save the change as a new design revision and compare it with the accepted revision');
  const rev3 = await api('designer', 'POST', `/v1/rooms/${code}/revisions`, { body: { reason: `checkpoint: camera ${camera} substituted during recommissioning` }, headers: { 'idempotency-key': 'checkpoint-rev-0003' } });
  ok('C-49', 'the designer saves revision 3', rev3.status === 201 && rev3.body.revision === 3, J(rev3.body));
  const cmp = await api('designer', 'GET', `/v1/rooms/${code}/revisions/compare?a=${v1?.design_revision}&b=3`);
  ok('C-50', 'the comparison of the accepted revision 2 with revision 3 shows exactly the camera swap', cmp.status === 200 && cmp.body.swapped.length === 1 && cmp.body.swapped[0].id === camera && cmp.body.swapped[0].from === 'camera:generic' && cmp.body.swapped[0].to === `camera:${NEW_MODEL}` && !cmp.body.added.length && !cmp.body.removed.length && !cmp.body.moved.length && !cmp.body.geometry.length, J(cmp.body));

  step(14, 'baseline-and-assurance', 'The accepted baseline is unchanged; Assurance reports the difference from it');
  const lin3 = await api('syseng', 'GET', `/v1/rooms/${code}/baselines`);
  const v1After = J(lin3.body.items?.find((b) => b.version === 1));
  ok('C-51', 'baseline v1 is byte-for-byte unchanged (same JSON before and after the change) and still CURRENT', v1After === v1Before && lin3.body.current?.version === 1, `${v1Before.length} vs ${v1After.length} bytes`);
  const as = await api('opslead', 'GET', `/v1/rooms/${code}/assurance`);
  const presence = as.body.rows?.find((x) => x.k === 'presence');
  ok('C-52', 'Assurance assesses the room against baseline v1 and reports the substitution on the register as drift (recorded, not measured)', as.status === 200 && as.body.state === 'ASSESSED' && as.body.baseline?.version === 1 && presence?.status === 'drift' && presence.ids.includes(camera) && presence.ev === 'INFERRED' && new RegExp(NEW_MODEL.replace(/[()]/g, '.')).test(presence.current), J(presence));
  ok('C-53', 'the remedy proposed is a fix that needs an engineer’s approval, and live health stays NOT_MONITORED', presence?.fix?.requiresApproval === true && presence.fix.approverAuthority === 'baseline.approve' && as.body.liveHealth === 'NOT_MONITORED', J(presence?.fix));
  const rev2After = J((await api('designer', 'GET', `/v1/rooms/${code}`, { keep: false })).body.revisions.find((x) => x.rev_no === 2));
  ok('C-92', 'Assurance labels the change a model substitution with both units named (not an installation change), against the unit accepted in v1; baseline v1 and the accepted revision 2 are byte-for-byte unchanged', J(presence?.changes) === J([{ id: camera, kind: 'MODEL_SUBSTITUTED', fromModel: 'generic', toModel: NEW_MODEL, fromUnit: facts.cameraUnit.original, toUnit: facts.cameraUnit.replacement }]) && as.body.installation?.devices?.find((d) => d.position === camera)?.assetAtBaseline === facts.cameraUnit.original && v1After === v1Before && rev2After === rev2Before, J({ changes: presence?.changes, rev2: rev2After === rev2Before }));

  step(15, 'verification-requirements', 'The new and changed verification requirements, with their reasons (readiness)');
  const rd1 = await api('designer', 'GET', `/v1/rooms/${code}/readiness`);
  const rc1 = rd1.body.recommissioning;
  const reqs = rc1?.reverification || [];
  facts.requirements = reqs.map((t) => ({ testId: t.testId, label: t.label, personas: t.personas, reasons: t.reasons }));
  ok('C-54', 'readiness reports the recommissioning against baseline v1 and the substitution (asset, from, to)', rd1.status === 200 && rc1?.baseline?.version === 1 && rc1.substitutions.length === 1 && rc1.substitutions[0].assetId === camera && rc1.substitutions[0].from === 'generic' && rc1.substitutions[0].to === NEW_MODEL, J(rc1).slice(0, 400));
  ok('C-55', 'it names the tests that must be re-run on the new camera, each with its reasons and its responsible role', reqs.length > 0 && reqs.every((t) => t.rerun && t.reasons.length && t.personas.length && t.assets.includes(camera)) && J(swap.body.reverification.slice().sort()) === J(reqs.map((t) => t.testId).sort()), J(reqs.map((t) => t.testId)));
  const camRows = rows.filter((x) => x.devices.includes(camera)).map((x) => x.test_id);
  ok('C-56', 'every test whose plan row names the camera is required again, and the asset-identity check is required after the substitution', camRows.every((t) => reqs.some((x) => x.testId === t)) && (!rows.some((x) => x.test_id === 'identity_asset') || reqs.some((x) => x.testId === 'identity_asset')), `plan rows naming the camera: ${camRows.join(', ')}`);
  ok('C-57', 'tests that do not depend on the camera are not reopened', reqs.length < rows.length && rows.filter((x) => !reqs.some((t) => t.testId === x.test_id)).every((x) => !x.devices.includes(camera)));
  const b1 = rd1.body.next?.blockers || [];
  ok('C-58', 're-acceptance is blocked with the reasons: the design change needs an approved revision, the reopened tests must be re-run, and the approved drawings no longer match', rd1.body.next?.to === 'ACCEPTED' && b1.some((x) => /approved revision 2 no longer describes it/.test(x)) && b1.some((x) => /re-run/.test(x)) && b1.some((x) => /open issue/.test(x)), J(b1));
  ok('C-59', 'the drawing check opens design deficiencies for the approved equipment schedule and placement plan that no longer match', ['drawing-disagreement:schedule', 'drawing-disagreement:placement'].every((k) => (r4.body.issues || []).some((i) => i.key === k && i.state === 'OPEN')), J((r4.body.issues || []).map((i) => [i.key, i.state])));
  ok('C-60', 'the outstanding actions name who must do what: approve revision 3 (not its author) and re-run per responsible role', rd1.body.outstanding.some((o) => /approve design revision 3/.test(o.what) && /not the author/.test(o.who)) && rd1.body.outstanding.some((o) => /re-run/.test(o.what) && o.count > 0), J(rd1.body.outstanding));
  ok('C-61', 'completion counts only the results that still count: the reopened tests are not verified any more', rd1.body.completion.counts.revalidation === reqs.length && rd1.body.completion.counts.verified === rows.length - reqs.length, J(rd1.body.completion));
  const early = await move('opslead', 'ACCEPTED', opsTok);
  ok('C-62', 'an attempt to re-accept now is refused (422) with the same reasons', early.status === 422 && /re-run/.test(J(early.body)) && /approved revision/.test(J(early.body)), J(early.body));
  ok('C-93', 'the re-acceptance refusal carries the accurate count: the superseded PASS_VERIFIED results count 0', (early.body.reasons || []).some((x) => x.includes(`acceptance counts ${rows.length - reqs.length} of ${rows.length} applicable tests as passed and independently verified; the ${reqs.length} earlier result(s) no longer count`)), J(early.body.reasons));
  const chg = rc1?.changes?.[0];
  ok('C-94', 'readiness names the change with its units (SUBSTITUTED, original → new unit) and each position with its unit and identity state', rc1?.changes?.length === 1 && chg.kind === 'SUBSTITUTED' && chg.assetId === camera && chg.fromAsset === facts.cameraUnit.original && chg.toAsset === facts.cameraUnit.replacement && rd1.body.installations?.devices?.length === 8 && rd1.body.installations.devices.some((d) => d.position === camera && d.asset === facts.cameraUnit.replacement && d.identityState === 'UNKNOWN'), J(rc1?.changes));
  // the documented order (ADR-0012 §5, CE.ACCEPTANCE_BLOCKER_ORDER): the design binding, the open issues, the reopened tests (with the count:
  // they are the only results missing), the general count — each sentence the engine's, and the same list in readiness and in the refusal
  const want1 = [CE.designBindingSentence({ ...rc1.design, substitutions: rc1.substitutions }), `${rd1.body.deficiencies.length} open issue(s): every deficiency is closed with its retest before acceptance`, `${CE.rerunSentence(reqs, ['SUBSTITUTED'])} — acceptance counts ${rows.length - reqs.length} of ${rows.length} applicable tests as passed and independently verified; the ${reqs.length} earlier result(s) no longer count`];
  facts.blockerOrder = { step15: b1.map(blockerKind) };
  ok('C-98', 'the re-acceptance blockers come in the documented order — design binding (approve revision 3: the re-acceptance binds it), open issues, the reopened tests with the count — in the engine’s words, the same list in readiness and in the refusal', J(b1) === J(want1) && J(b1.map(blockerKind)) === J(['design-binding', 'open-issues', 'reopened-tests']) && inOrder(b1) && J(early.body.reasons) === J(b1) && /revision 3 needs approval \(room\.design\.approve, not its author\)/.test(b1[0]), J({ got: b1, want: want1, refusal: early.body.reasons }));

  step(16, 'design-reapproval', 'The design change is approved by an engineer who is not its author; the drawings are regenerated and re-approved');
  ok('C-63', 'the designer (the author of revision 3) holds no design approval (403)', (await api('designer', 'POST', `/v1/rooms/${code}/revisions/3/approve`)).status === 403);
  const ap3 = await api('syseng', 'POST', `/v1/rooms/${code}/revisions/3/approve`);
  ok('C-64', 'the systems engineer approves revision 3: the re-acceptance will bind it', ap3.status === 200 && ap3.body.approvedRevision === 3 && ap3.body.previous === 2, J(ap3.body));
  ok('C-65', 'a revision is approved once (422)', (await api('syseng', 'POST', `/v1/rooms/${code}/revisions/3/approve`)).status === 422);
  const gen2 = await api('designer', 'POST', `/v1/rooms/${code}/drawings/generate`);
  let re = gen2.status === 200; for (const d of gen2.body.drawings || []) re = (await api('syseng', 'POST', `/v1/rooms/${code}/drawings/${d.kind}/approve`)).status === 200 && re;
  const r5 = await api('designer', 'GET', `/v1/rooms/${code}`, { keep: false });
  ok('C-66', 'the regenerated drawings are approved again and the drawing deficiencies resolve', re && r5.body.drawings.every((d) => d.state === 'APPROVED') && ['drawing-disagreement:schedule', 'drawing-disagreement:placement'].every((k) => r5.body.issues.find((i) => i.key === k)?.state === 'RESOLVED'), J(r5.body.issues.map((i) => [i.key, i.state])));

  step(17, 'requirements-after-design-approval', 'What remains is the verification the change requires');
  const rd2 = await api('designer', 'GET', `/v1/rooms/${code}/readiness`);
  const b2 = rd2.body.next?.blockers || [];
  ok('C-67', 'the design requirement is met; the only blocker left is re-running the reopened tests on the new camera', rd2.body.recommissioning?.design?.approvedDescribesDesign === true && b2.length === 1 && /re-run/.test(b2[0]) && reqs.every((t) => b2[0].includes(t.testId)), J(b2));
  const want2 = [`${CE.rerunSentence(reqs, ['SUBSTITUTED'])} — acceptance counts ${rows.length - reqs.length} of ${rows.length} applicable tests as passed and independently verified; the ${reqs.length} earlier result(s) no longer count`];
  facts.blockerOrder.step17 = b2.map(blockerKind);
  ok('C-99', 'after the design approval and the drawings, what is left is exactly the reopened tests with the count, in the engine’s words: no design binding, no open issue, no general count', J(b2) === J(want2) && J(b2.map(blockerKind)) === J(['reopened-tests']) && CE.designBindingSentence({ ...rd2.body.recommissioning.design, substitutions: rd2.body.recommissioning.substitutions }) === null, J({ got: b2, want: want2 }));
  const lin4 = await api('syseng', 'GET', `/v1/rooms/${code}/baselines`);
  ok('C-68', 'baseline v1 is still byte-for-byte unchanged and CURRENT after the design approval', J(lin4.body.items?.find((b) => b.version === 1)) === v1Before && lin4.body.current?.version === 1);

  // ============================================================================================ 6 · inspect the affected dependencies
  step(18, 'affected-dependencies', 'The camera’s dependencies: relationships, connections and dependent devices (graph and Search Party)');
  const g = await api('designer', 'GET', `/v1/graph/PlannedAsset/${camera}?depth=2`);
  const gIds = J(g.body);
  ok('C-69', 'the relationship graph places the camera in its room and feeding the room compute, and connects it to the switch', g.status === 200 && gIds.includes(code) && gIds.includes(devices.compute) && gIds.includes(devices.switch), gIds.slice(0, 300));
  ok('C-70', 'downstream impact of the camera includes the devices it feeds (the room compute and onwards)', Array.isArray(g.body.impact) && g.body.impact.some((n) => n.id === devices.compute), J(g.body.impact));
  const sg = await api('designer', 'GET', `/v1/search/graph/PlannedAsset/${camera}?depth=2`);
  ok('C-71', 'Search Party returns the camera’s neighbourhood with edge provenance', sg.status === 200 && sg.body.edges.length > 0 && sg.body.edges.every((e) => e.provenance) && sg.body.nodes.some((n) => n.id === code), J(sg.body.edges?.slice(0, 4)));
  const sgTests = (sg.body.nodes || []).filter((n) => n.type === 'CommissioningTest').map((n) => n.id);
  ok('C-100', 'D-36: the neighbourhood reads the same on every run — the commissioning tests reached at the same depth come in test-id order (a stable key, not the database’s order), and the radial layout follows the node order', sgTests.length === rows.length && new Set((sg.body.nodes || []).filter((n) => n.type === 'CommissioningTest').map((n) => n.depth)).size === 1 && J(sgTests) === J([...sgTests].sort()) && J((sg.body.layout || []).map((l) => `${l.node.type}:${l.node.id}`)) === J((sg.body.nodes || []).map((n) => `${n.type}:${n.id}`)), J(sgTests.slice(0, 12)));
  const dep = await api('designer', 'POST', '/v1/search/intent', { body: { question: `What depends on ${camera}?`, target: { type: 'PlannedAsset', id: camera } } });
  ok('C-72', 'Search Party answers “what depends on this camera?” with the downstream devices and the affected room', dep.status === 200 && dep.body.intent === 'depends' && dep.body.items.some((i) => i.node.id === devices.compute) && dep.body.items.some((i) => i.node.id === code), J(dep.body).slice(0, 400));
  const con = await api('designer', 'POST', '/v1/search/intent', { body: { question: 'What is connected to this camera?', target: { type: 'PlannedAsset', id: camera } } });
  ok('C-73', 'Search Party lists the camera’s connections (signal to the compute, network to the switch), marked as design-proposed', con.status === 200 && con.body.intent === 'connected' && con.body.items.some((i) => i.node.id === devices.compute) && con.body.items.some((i) => i.node.id === devices.switch), J(con.body).slice(0, 400));
  const su = await api('designer', 'GET', `/v1/search?q=${facts.cameraUnit.replacement}`);
  const unitNode = (su.body.items || []).find((n) => n.type === 'Asset' && n.id === facts.cameraUnit.replacement); const posNode = (su.body.items || []).find((n) => n.type === 'PlannedAsset' && n.id === camera);
  const sgu = await api('designer', 'GET', `/v1/search/graph/Asset/${facts.cameraUnit.replacement}?depth=1`);
  ok('C-95', 'Search Party finds the camera’s current unit, located in the camera position, and shows position · unit · identity on the camera', su.status === 200 && !!unitNode && /identity UNKNOWN/.test(unitNode.subtitle) && !!posNode && posNode.subtitle.includes(`unit ${facts.cameraUnit.replacement} · identity UNKNOWN`) && sgu.status === 200 && sgu.body.edges.some((e) => e.rel === 'LOCATED_IN' && e.to?.id === camera && /asset_installation/.test(e.provenance)), J({ unit: unitNode, pos: posNode?.subtitle }).slice(0, 400));
  const catOf = Object.fromEntries(Object.entries(devices).map(([k, v]) => [v, k]));
  facts.dependencies = { downstream: (g.body.impact || []).map((n) => `${n.id} (${catOf[n.id] || n.type})`), connected: (con.body.items || []).map((i) => `${i.node.id} (${catOf[i.node.id] || i.node.type}; ${i.via})`), dependsSummary: dep.body.summary };

  // ============================================================================================ 7 · the Room Story and the Pro analytics
  step(19, 'room-story', 'The Room Story: room, baselines, service history, audit events (data steward), ledger integrity, read model');
  const story = await api('designer', 'GET', `/v1/rooms/${code}`);
  ok('C-74', 'the room reads back COMMISSIONING (recommissioning) with revision 3 approved and every device', story.status === 200 && story.body.room.lifecycle === 'COMMISSIONING' && story.body.room.approvedRevision === 3 && story.body.revisions.length === 3);
  const ph = await api('designer', 'GET', `/v1/rooms/${code}/positions/${camera}/history`);
  const ah0 = await api('designer', 'GET', `/v1/assets/${facts.cameraUnit.original}/history`); const ah1 = await api('designer', 'GET', `/v1/assets/${facts.cameraUnit.replacement}/history`);
  facts.positionHistory = { design: (ph.body.design?.revisions || []).map((r) => `revision ${r.revision}: ${r.inRevision ? r.model : 'not in the design'}`), installations: (ph.body.installations || []).map((i) => i.sentence) };
  facts.assetHistories = [ah0.body, ah1.body].map((h) => ({ asset: h.asset?.code, model: h.asset?.model, identity: h.asset?.identityState, installations: (h.installations || []).map((i) => i.sentence) }));
  ok('C-96', 'the story keeps the position history (its design: absent from revision 1 — the room was created empty — generic in revision 2, the new model in revision 3) apart from each unit’s own history (one installation each, with both ends)', ph.status === 200 && J((ph.body.design?.revisions || []).map((r) => (r.inRevision ? r.model : null))) === J([null, 'generic', NEW_MODEL]) && J(ph.body.design.modelHistory.map((m) => m.model)) === J(['generic']) && ph.body.installations.length === 2 && ah0.body.installations.length === 1 && ah1.body.installations.length === 1 && ah1.body.current?.position === camera && ah1.body.asset.model === NEW_MODEL && ah0.body.asset.model === 'generic', J(facts.positionHistory));
  const bls = await api('syseng', 'GET', `/v1/rooms/${code}/baselines`);
  ok('C-75', 'the baseline lineage holds v1 (CURRENT) and no other version', bls.body.items.length === 1 && bls.body.current.version === 1);
  const svc = await api('svcmgr', 'GET', `/v1/rooms/${code}/service-history`);
  ok('C-76', 'the service history reads (no work order was needed: no test failed) with the room’s issue events', svc.status === 200 && Array.isArray(svc.body.workOrders) && svc.body.issueEvents.length > 0, J(svc.body).slice(0, 200));
  ok('C-77', 'the designer cannot read the audit trail (403)', (await api('designer', 'GET', `/v1/audit?aggregateType=Room&aggregateId=${code}&limit=500`)).status === 403);
  const integ = await api('steward', 'GET', '/v1/audit/integrity');
  ok('C-78', 'the Evidence Ledger chain verifies end to end (data steward)', integ.status === 200 && integ.body.verified === true && integ.body.checked > 0 && !integ.body.firstBreak, J(integ.body).slice(0, 300));
  facts.integrity = { verified: integ.body.verified, checked: integ.body.checked, head: integ.body.head };
  const aud = await api('steward', 'GET', `/v1/audit?aggregateType=Room&aggregateId=${code}&limit=500`);
  const events = (aud.body.items || []).slice().sort((a, b) => Number(a.seq) - Number(b.seq));
  facts.auditEvents = events.length; facts.auditDenied = events.filter((e) => e.outcome === 'DENIED').length;
  const sealed = events.every((e) => e.seq != null && /^[0-9a-f]{64}$/.test(e.hash || ''));
  const ordered = events.every((e, i) => i === 0 || (Number(e.seq) > Number(events[i - 1].seq) && Number(e.id) > Number(events[i - 1].id) && Date.parse(e.at) >= Date.parse(events[i - 1].at)));
  ok('C-79', `the room’s ${events.length} audit events are sealed into the chain, in order (sequence, id and time agree)`, aud.status === 200 && events.length > 0 && events.length < 500 && sealed && ordered, `${events.length} events, sealed ${sealed}, ordered ${ordered}`);
  const at = (action, nth = 1) => { let k = 0; const e = events.find((x) => x.outcome === 'ALLOWED' && x.action === action && (k += 1) === nth); return e ? Number(e.seq) : NaN; };
  // the acceptance publishes baseline v1 inside its own transaction, so the publication precedes the transition's audit row
  const milestones = [['room.create'], ['room.lifecycle:DESIGN_APPROVED'], ['room.lifecycle:INSTALLATION_PENDING'], ['room.lifecycle:INSTALLED_UNVERIFIED'], ['room.lifecycle:COMMISSIONING'], ['commission.result.record'], ['commission.result.verify'], ['assurance.baseline_published'], ['room.lifecycle:ACCEPTED'], ['room.lifecycle:COMMISSIONING', 2], ['commission.asset_replaced'], ['room.revision.approve']];
  const seqs = milestones.map(([a, n]) => at(a, n));
  facts.milestones = milestones.map(([a, n], i) => ({ action: n ? `${a} (#${n})` : a, seq: seqs[i] }));
  ok('C-80', 'the Room Story reads in order: created → design approved → window → installed → commissioning → results → verification → baseline v1 published by the acceptance → recommissioned → camera replaced → revision approved', seqs.every((s, i) => Number.isFinite(s) && (i === 0 || s > seqs[i - 1])), J(facts.milestones));
  ok('C-81', 'the refusals of the scenario are in the trail too (DENIED, with the actor’s role)', events.some((e) => e.outcome === 'DENIED' && e.actor_role === 'designer') && events.some((e) => e.outcome === 'DENIED' && e.actor_role === 'qa_reviewer' && /ACCEPTED/.test(e.action)));
  const accSeq = at('room.lifecycle:ACCEPTED');
  const delegated = events.filter((e) => e.outcome === 'ALLOWED' && e.detail?.delegated === true && Number(e.seq) < accSeq).pop();   // the authority check that let the acceptance through
  ok('C-82', 'the acceptance is audited as delegated, naming the delegation and its grantor', !!delegated && /ACCEPTED/.test(delegated.action) && delegated.detail.delegationId === del.body.id && delegated.actor_role === 'opslead', J(delegated));
  await h.drain();
  const outbox = await api('secadmin', 'GET', '/v1/admin/outbox?status=DELIVERED');
  const roomEvents = (outbox.body.items || []).filter((e) => e.aggregate_id === code).map((e) => e.type);
  facts.outboxSample = [...new Set(roomEvents)];
  ok('C-83', 'the domain events of the change were delivered by the outbox: room.device_swapped, commission.asset_replaced, room.design_approved', ['room.device_swapped', 'commission.asset_replaced', 'room.design_approved', 'room.design_revision_saved'].every((t) => roomEvents.includes(t)), J(facts.outboxSample));
  const rm = await api('opslead', 'GET', `/v1/read/rooms/${code}`);
  ok('C-84', 'the operational read model is rebuilt from the events: COMMISSIONING, live health NOT_MONITORED', rm.status === 200 && rm.body.lifecycle === 'COMMISSIONING' && (rm.body.live_health ?? rm.body.liveHealth) === 'NOT_MONITORED', J(rm.body).slice(0, 300));

  step(20, 'pro-analytics', 'The Pro analytics: KPI passports, the building rollup, Mission Control, the KPI summary');
  const pp = await api('exec', 'GET', '/v1/executive/passports?days=30');
  const P = (id) => pp.body.passports?.find((x) => x.id === id);
  ok('C-85', 'the 27 KPI passports compute over the records, each with arithmetic or a stated reason (never a silent 0)', pp.status === 200 && pp.body.total === 27 && pp.body.passports.every((x) => (x.state === 'MEASURED' ? x.numerator !== null || x.value !== null : x.value === null && x.reason)), J(pp.body).slice(0, 300));
  facts.passports = { measured: pp.body.measured, total: pp.body.total, rooms_commissioned: P('rooms_commissioned') && { state: P('rooms_commissioned').state, numerator: P('rooms_commissioned').numerator, denominator: P('rooms_commissioned').denominator, value: P('rooms_commissioned').value } };
  const roll = await api('exec', 'GET', '/v1/executive/rollup?level=building&days=30');
  const nst = roll.body.units?.find((u) => u.code === 'NST');
  ok('C-86', 'the building rollup computes the Northstar Annex from its own rooms, and the units add up to the estate', roll.status === 200 && nst && nst.rooms >= 1 && roll.body.units.reduce((n, u) => n + u.rooms, 0) === roll.body.estate.rooms, J(nst).slice(0, 300));
  facts.rollup = nst && { code: nst.code, rooms: nst.rooms };
  const mc = await api('syseng', 'GET', '/v1/mission-control');
  ok('C-87', 'Mission Control reads for the systems engineer', mc.status === 200 && Array.isArray(mc.body.actions), J(mc.body).slice(0, 200));
  const sum = await api('opslead', 'GET', '/v1/reports/summary');
  ok('C-88', 'the KPI summary counts the scenario’s verified results and reports operational performance NOT_MONITORED', sum.status === 200 && sum.body.commissioning.byLabel.PASS_VERIFIED >= rows.length && sum.body.operationalPerformance === 'NOT_MONITORED', J(sum.body.commissioning).slice(0, 300));
  const inst = sum.body.assets?.installations;
  ok('C-97', 'Pro reports the units by identity state (UNKNOWN never counted as known) and says that the 12 superseded PASS_VERIFIED results no longer count', inst && inst.installed >= 8 && inst.byIdentity.UNKNOWN >= 8 && inst.identityKnownShare.value === 0 && inst.unitsTakenOut >= 1 && sum.body.commissioning.superseded?.passVerifiedNotCounting === reqs.length && sum.body.commissioning.superseded.verifiedCountingTowardsAcceptance === sum.body.commissioning.byLabel.PASS_VERIFIED - reqs.length, J({ inst, superseded: sum.body.commissioning.superseded }).slice(0, 400));
} catch (e) {
  ok('C-ERR', 'the scenario ran to the end', false, e.stack || e.message);
} finally {
  await h.app.stop();
}

// ---------------------------------------------------------------------------------------------- evidence
for (const s of steps) fs.writeFileSync(path.join(out, s.file), JSON.stringify({ step: s.step, title: s.title, room: code, at: new Date().toISOString(), assertions: s.assertions, exchanges: s.exchanges }, null, 1) + '\n');
const pass = results.length - failed;
fs.writeFileSync(path.join(out, 'checkpoint.json'), JSON.stringify({ at: new Date().toISOString(), database: DB, pass, fail: failed, facts, results }, null, 1) + '\n');
const md = [
  '# Checkpoint scenario — room lifecycle over the real API', '',
  `GENERATED by \`tests/e2e/checkpoint-room-lifecycle.e2e.mjs\` on ${new Date().toISOString()} against the in-process enterprise API and a private PostgreSQL database (\`${DB}\`), synthetic data only. **${pass} passed, ${failed} failed.**`, '',
  '> Build a room in Lite → approve its design → commission it → accept the baseline → change the camera → inspect affected dependencies → generate new verification requirements → view the resulting Room Story and PRO analytics.', '',
  '## Facts', '',
  `| | |`, `|---|---|`,
  `| Room | \`${facts.room}\` (${facts.archetype || '—'}) |`, `| Camera | \`${facts.camera}\`: \`generic\` → \`${NEW_MODEL}\` |`,
  `| Applicable tests | ${facts.applicable} — recorded by ${Object.entries(facts.recordedBy || {}).map(([k, v]) => `${k} ${v}`).join(', ')}; verified by ${Object.entries(facts.verifiedBy || {}).map(([k, v]) => `${k} ${v}`).join(', ')} |`,
  `| Baselines | v1 CURRENT (design revision ${facts.v1?.designRevision}, published ${facts.v1?.publishedAt}); unchanged byte-for-byte after the change; no v2 (re-acceptance waits for the re-run tests) |`,
  `| Design revisions | 1 created · 2 designed and approved (bound by v1) · 3 the camera substitution, approved during recommissioning |`,
  `| Camera position and units (ADR-0012) | position \`${facts.camera}\` stays; unit \`${facts.cameraUnit?.original}\` (generic, identity UNKNOWN) closed SUBSTITUTED → unit \`${facts.cameraUnit?.replacement}\` (${NEW_MODEL}, identity UNKNOWN) installed |`,
  `| Audit events for the room | ${facts.auditEvents ?? '—'} (${facts.auditDenied ?? '—'} DENIED) |`,
  `| Evidence Ledger integrity | ${facts.integrity ? `verified ${facts.integrity.verified}, ${facts.integrity.checked} events checked, head seq ${facts.integrity.head?.seq} \`${facts.integrity.head?.hash}\`` : '—'} |`,
  `| KPI passports | ${facts.passports ? `${facts.passports.measured} of ${facts.passports.total} measured; rooms_commissioned ${J(facts.passports.rooms_commissioned)}` : '—'} |`, '',
  '## Verification requirements generated by the camera change', '',
  ...(facts.requirements?.length ? ['| Test | Responsible role | Reasons |', '|---|---|---|', ...facts.requirements.map((t) => `| \`${t.testId}\` ${t.label} | ${t.personas.join(', ')} | ${t.reasons.join('; ')} |`)] : ['(none recorded)']), '',
  '## Position history and unit histories of the camera (ADR-0012)', '',
  `- Position \`${facts.camera}\`, design: ${(facts.positionHistory?.design || []).join(' · ') || '—'}`,
  ...(facts.positionHistory?.installations || []).map((x) => `- Position \`${facts.camera}\`, installation: ${x}`),
  ...(facts.assetHistories || []).flatMap((a) => (a.installations || []).map((x) => `- Unit \`${a.asset}\` (${a.model}, identity ${a.identity}): ${x}`)), '',
  '## Affected dependencies of the camera', '',
  `- Downstream (graph impact): ${(facts.dependencies?.downstream || []).join(', ') || '—'}`,
  `- Connected (Search Party): ${(facts.dependencies?.connected || []).join(', ') || '—'}`,
  `- Search Party: ${facts.dependencies?.dependsSummary || '—'}`, '',
  '## Room Story milestones (audit sequence numbers)', '',
  ...(facts.milestones || []).map((m) => `- ${m.seq} · \`${m.action}\``), '',
  '## Steps and assertions', '',
  ...steps.flatMap((s) => [`### ${s.file.replace('.json', '')} — ${s.title}`, '', `${s.exchanges.length} API exchange(s) in [\`${s.file}\`](${s.file}).`, '', ...s.assertions.map((a) => `- ${a.result === 'PASS' ? 'PASS' : '**FAIL**'} ${a.id} ${a.name}${a.detail ? ` — ${a.detail.replace(/\|/g, '\\|').slice(0, 300)}` : ''}`), '']),
  ...(results.some((r) => r.id === 'C-ERR') ? ['### Error', '', '```', results.find((r) => r.id === 'C-ERR').detail, '```', ''] : []),
].join('\n');
fs.writeFileSync(path.join(out, 'CHECKPOINT.md'), md);
console.log(`\n${pass} passed, ${failed} failed — ${path.relative(repo, path.join(out, 'CHECKPOINT.md'))}`); process.exit(failed ? 1 : 0);
