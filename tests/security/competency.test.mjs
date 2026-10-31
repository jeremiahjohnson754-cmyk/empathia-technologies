/**
 * Competency records (ADR-0009) through the real API: the only credentials ServiceHands' hard gates read. Recorded by the service
 * manager, verified by the data steward (never the recorder, never the holder), revocable; an expired or revoked credential stops
 * counting at once; training is supporting evidence, never a credential by itself. Synthetic data only.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client } from '../integration/harness.mjs';

let h, c, room, wo; const T = {};
const who = (mail) => h.asSuper(`SELECT id FROM app.person WHERE email = '${mail}@empathia-demo.empathia.invalid'`);
const list = async (tok, q = '') => { const r = await c.call('GET', `/v1/competencies${q}`, { token: tok }); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 200)); return r.body; };
const cands = async () => { const r = await c.call('GET', `/v1/work-orders/${wo}/candidates`, { token: T.svcmgr }); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 200)); return r.body; };
const today = new Date().toISOString().slice(0, 10);
const plusYears = (n) => `${Number(today.slice(0, 4)) + n}${today.slice(4)}`;

before(async () => {
  h = await setup({ db: 'empathia_comp', port: 4181 });
  c = client(h.base);
  for (const r of ['designer', 'syseng', 'opslead', 'installer', 'cxeng', 'svcmgr', 'service', 'steward', 'requestor']) T[r] = await c.login(r);
  T.south = await c.login('service', 'empathia-demo', 'service-south');
  // a camera deficiency → one work order triaged as a camera replacement (needs cert.av_field + cert.video)
  room = (await c.call('POST', '/v1/rooms', { token: T.designer, body: { name: 'Credential Huddle (synthetic)', template: 'huddle', buildingCode: 'ATL', floor: 6 } })).body.code;
  await c.call('POST', `/v1/rooms/${room}/revisions`, { token: T.designer, body: { reason: 'comp' } }); await c.call('POST', `/v1/rooms/${room}/drawings/generate`, { token: T.designer });
  await c.call('POST', `/v1/rooms/${room}/drawings/plan/approve`, { token: T.syseng }); await c.call('POST', `/v1/rooms/${room}/classification/approve`, { token: T.syseng, body: {} });
  for (const [to, t] of [['DESIGN_APPROVED', 'syseng'], ['INSTALLATION_PENDING', 'opslead'], ['INSTALLED_UNVERIFIED', 'installer'], ['COMMISSIONING', 'syseng']]) await c.call('POST', `/v1/rooms/${room}/lifecycle`, { token: T[t], body: { to } });
  const row = (await c.call('GET', `/v1/rooms/${room}`, { token: T.designer })).body.commissioning.rows.find((x) => x.applicable);
  const ev = (await c.call('POST', '/v1/evidence', { token: T.cxeng, raw: Buffer.from('synthetic'), headers: { 'content-type': 'text/plain', 'x-file-name': 'o.txt' } })).body;
  await c.call('POST', `/v1/rooms/${room}/results`, { token: T.cxeng, body: { testId: row.test_id, state: 'FAIL', evidenceId: ev.id, evidenceKind: row.evidence[0], instrument: 'SYN-METER-01 (synthetic)' } });
  const issue = (await c.call('GET', `/v1/rooms/${room}`, { token: T.designer })).body.issues.find((i) => i.state === 'OPEN').code;
  wo = (await c.call('POST', `/v1/issues/${issue}/work-orders`, { token: T.svcmgr, body: { note: 'credential fixture (synthetic)' } })).body.workOrderId;
  const t = await c.call('POST', `/v1/work-orders/${wo}/triage`, { token: T.svcmgr, body: { severity: 'High', scope: 'camera', risk: 'r', workType: 'camera_replacement', window: { from: '2026-11-05T08:00:00Z', to: '2026-11-05T12:00:00Z' } } });
  assert.equal(t.status, 200, JSON.stringify(t.body));
});
after(async () => { await h?.app.stop(); });

test('COMP-1 seeded credentials carry provenance (recorded by the service manager, verified by the steward); an expired one is shown as expired and does not count; staff profiles carry no certifications', async () => {
  assert.equal((await c.call('GET', '/v1/competencies', {})).status, 401);
  const all = await list(T.svcmgr);
  const svcVideo = all.items.find((x) => x.person.id === who('service') && x.competency === 'cert.video');
  assert.equal(svcVideo.state, 'VERIFIED'); assert.equal(svcVideo.countsForDispatch, true); assert.match(svcVideo.recordedBy, /Service Manager/); assert.match(svcVideo.decidedBy, /steward/i);
  const instVideo = all.items.find((x) => x.person.id === who('installer') && x.competency === 'cert.video');
  assert.equal(instVideo.expired, true); assert.equal(instVideo.countsForDispatch, false, 'the lapsed camera certification does not count');
  assert.ok(!all.items.some((x) => x.person.id === who('service-south') && x.competency === 'cert.video'));
  assert.equal(Number(h.asSuper("SELECT count(*) FROM app.staff_profile WHERE certs <> '{}'::jsonb")), 0, 'the gates have no second source');
  assert.ok(all.pool.some((p) => p.id === who('service')) && !all.pool.some((p) => p.id === who('requestor')), 'the recorder is offered the service pool only');
});

test('COMP-2 credentials are personal records: a technician sees only their own, a requestor sees none, and neither is offered the pool', async () => {
  const mine = await list(T.service); assert.ok(mine.items.length > 0 && mine.items.every((x) => x.person.id === who('service'))); assert.deepEqual(mine.pool, []); assert.equal(mine.mayRecord, false);
  const req = await list(T.requestor); assert.equal(req.items.length, 0);
  assert.equal((await list(T.steward)).items.length, (await list(T.svcmgr)).items.length, 'the verifier sees what the recorder sees');
});

test('COMP-3 recording: only service.assign (403 otherwise, nothing read); dates, catalogue and assessment evidence are validated; cited training must be the holder’s own', async () => {
  const body = { personId: who('service-south'), competency: 'cert.video', source: 'EXTERNAL_CERTIFICATE', issuer: 'Synthetic Credentialing Body', reference: 'SYN-S-VID-1', issuedOn: today, expiresOn: plusYears(2) };
  assert.equal((await c.call('POST', '/v1/competencies', { token: T.service, body })).status, 403);
  assert.equal((await c.call('POST', '/v1/competencies', { token: T.steward, body })).status, 403, 'the verifier does not record');
  assert.equal((await c.call('POST', '/v1/competencies', { token: T.svcmgr, body: { ...body, expiresOn: today, issuedOn: plusYears(1) } })).status, 400);
  assert.equal((await c.call('POST', '/v1/competencies', { token: T.svcmgr, body: { ...body, competency: 'cert.wizardry' } })).status, 400);
  assert.equal((await c.call('POST', '/v1/competencies', { token: T.svcmgr, body: { ...body, source: 'ASSESSMENT' } })).status, 400, 'an assessment cites evidence');
  // the manager's own training cited for the technician is refused (422, audited)
  const lib = (await c.call('GET', '/v1/learn/library', { token: T.svcmgr })).body;
  assert.equal((await c.call('POST', '/v1/learn/training', { token: T.svcmgr, body: { kind: 'drill', itemId: lib.drills[0].id, correct: true } })).status, 201);
  const tid = (await c.call('GET', '/v1/learn/training', { token: T.svcmgr })).body.items[0].id; assert.ok(Number.isInteger(tid));
  const bad = await c.call('POST', '/v1/competencies', { token: T.svcmgr, body: { ...body, source: 'ASSESSMENT', trainingRefs: [tid] } });
  assert.equal(bad.status, 422); assert.match(JSON.stringify(bad.body), /must belong to the person/);
  const ok = await c.call('POST', '/v1/competencies', { token: T.svcmgr, body }); assert.equal(ok.status, 201, JSON.stringify(ok.body)); assert.equal(ok.body.state, 'PENDING_VERIFICATION');
  const s = (await cands()).ineligible.find((x) => x.id === who('service-south'));
  assert.ok(s.hardFails.some((x) => /Camera and framing: not held/.test(x)), 'a pending credential counts for nothing');
});

test('COMP-4 verification is independent: the recorder holds no provenance.review (403); nobody verifies their own credential (422); the database refuses a verifier who recorded it; the steward verifies and the gate reads it at once', async () => {
  const pending = (await list(T.steward)).items.find((x) => x.state === 'PENDING_VERIFICATION' && x.person.id === who('service-south'));
  assert.equal(pending.yours.decide, true);
  assert.equal((await c.call('POST', `/v1/competencies/${pending.id}/verify`, { token: T.svcmgr, body: { note: 'mine' } })).status, 403);
  // a credential for the steward themself, recorded by the manager → the steward may not verify it
  const own = await c.call('POST', '/v1/competencies', { token: T.svcmgr, body: { personId: who('steward'), competency: 'spec.acoustics', source: 'EXTERNAL_CERTIFICATE', issuer: 'Synthetic Credentialing Body', reference: 'SYN-STW-1', issuedOn: today, expiresOn: plusYears(3) } });
  assert.equal(own.status, 201);
  const r = await c.call('POST', `/v1/competencies/${own.body.id}/verify`, { token: T.steward, body: { note: 'self' } });
  assert.equal(r.status, 422); assert.match(JSON.stringify(r.body), /nobody verifies their own/);
  assert.equal(Number(h.asSuper(`SELECT count(*) FROM app.audit_event WHERE action = 'competency.verify' AND outcome = 'DENIED' AND aggregate_id = '${own.body.id}'`)), 1);
  assert.throws(() => h.asSuper(`UPDATE app.competency_record SET state = 'VERIFIED', decided_by = recorded_by, decided_at = now() WHERE id = '${pending.id}'`), /check/i, 'the database refuses a verifier who is the recorder');
  const v = await c.call('POST', `/v1/competencies/${pending.id}/verify`, { token: T.steward, body: { note: 'checked against the issuer register (synthetic)' } });
  assert.equal(v.status, 200, JSON.stringify(v.body)); assert.equal(v.body.countsForDispatch, true);
  assert.equal((await c.call('POST', `/v1/competencies/${pending.id}/verify`, { token: T.steward, body: { note: 'again' } })).status, 422, 'decided once');
  const s = (await cands()).ineligible.find((x) => x.id === who('service-south'));
  assert.ok(!s.hardFails.some((x) => /Camera and framing/.test(x)), JSON.stringify(s.hardFails)); assert.ok(s.hardFails.some((x) => /site access/.test(x)), 'the other gates still apply');
});

test('COMP-5 revocation stops the credential counting at once: the eligible technician becomes ineligible for camera work, with the reason named; only a verified credential is revoked; the history stays', async () => {
  assert.deepEqual((await cands()).eligible.map((x) => x.id), [who('service')]);
  const vid = (await list(T.svcmgr)).items.find((x) => x.person.id === who('service') && x.competency === 'cert.video' && x.state === 'VERIFIED');
  assert.equal((await c.call('POST', `/v1/competencies/${vid.id}/revoke`, { token: T.service, body: { reason: 'self' } })).status, 403);
  const r = await c.call('POST', `/v1/competencies/${vid.id}/revoke`, { token: T.svcmgr, body: { reason: 'issuer withdrew the certificate (synthetic)' } });
  assert.equal(r.status, 200); assert.equal(r.body.countsForDispatch, false);
  assert.equal((await c.call('POST', `/v1/competencies/${vid.id}/revoke`, { token: T.svcmgr, body: { reason: 'again' } })).status, 422);
  const after1 = await cands(); assert.equal(after1.eligible.length, 0); assert.equal(after1.none, true);
  assert.ok(after1.ineligible.find((x) => x.id === who('service')).hardFails.some((x) => /Camera and framing: not held/.test(x)));
  const a = await c.call('POST', `/v1/work-orders/${wo}/assign`, { token: T.svcmgr, body: { personId: who('service') } });
  assert.equal(a.status, 422, 'assignment re-runs the gates with the revoked credential gone');
  const rec = (await list(T.svcmgr)).items.find((x) => x.id === vid.id); assert.equal(rec.state, 'REVOKED'); assert.match(rec.revokeReason, /issuer withdrew/);
  for (const action of ['competency.record', 'competency.verify', 'competency.revoke']) assert.ok(Number(h.asSuper(`SELECT count(*) FROM app.audit_event WHERE action = '${action}' AND outcome = 'ALLOWED'`)) >= 1, action);
});

test('COMP-6 Mission Control lists a pending credential for the steward only — never for its recorder or its holder', async () => {
  const p = await c.call('POST', '/v1/competencies', { token: T.svcmgr, body: { personId: who('service'), competency: 'cert.video', source: 'EXTERNAL_CERTIFICATE', issuer: 'Synthetic Credentialing Body', reference: 'SYN-SVC-VID-2', issuedOn: today, expiresOn: plusYears(2) } });
  const mc = async (tok) => (await c.call('GET', '/v1/mission-control', { token: tok })).body.actions.some((a) => a.ref === p.body.id && a.kind === 'verify-competency');
  assert.equal(await mc(T.steward), true); assert.equal(await mc(T.svcmgr), false); assert.equal(await mc(T.service), false);
});
