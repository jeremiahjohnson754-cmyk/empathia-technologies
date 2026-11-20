// A second service technician whose permissions are actively tested (migration 0041; founder, 17 Nov 2026, 19:05: "a second
// technician whose permissions are actively tested"). A real enterprise API on a real database; every check goes to the API or to
// the database. Until 0041 a sandbox had one technician, so nothing about assignment could be refused to anybody.
//   ST-01  a sandbox opens with two service technicians: two people, two seats, one role; a session names its seat; a seat nobody
//          holds is refused; the second person is the sandbox's own and joins no other organization
//   ST-02  the second technician's field certificate is recorded and not verified: it counts for nothing; its holder, its recorder
//          and the other technician cannot verify it; each technician sees their own credentials only
//   ST-03  the hard gates: the first technician passes, the second is refused with the reason (recorded, not yet verified); Search
//          Party says the same; neither technician may see the ranking; "assign anyway" is refused and nothing is assigned
//   ST-04  a job assigned to the first technician is theirs: the second cannot accept it, record its preflight, start it, record
//          evidence on it or hand it over, at any state; each refusal is in the audit trail and the job does not move
//   ST-05  nobody verifies their own work, and a colleague of the same role does not verify it either: verification is the
//          commissioning engineer's
//   ST-06  verified by the data steward, the credential counts at once: the second technician passes the gates and can be assigned
//          the next job; that job is then closed to the first technician in the same way
//   ST-07  revoked, the credential stops counting at once: the second technician is refused the job after
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict';
import { setup, client, registerRoom } from '../integration/harness.mjs';

let h, c, sb; const T = {}; const J = (x) => JSON.stringify(x); let ROOM = '', R = '';
const call = (token, method, p, o = {}) => c.call(method, p, { token, ...o });
const session = (role, seat) => c.call('POST', '/v1/demo/sessions', { body: { sandboxId: sb.id, key: sb.key, role, ...(seat !== undefined ? { seat } : {}) } });
const wo = async (code, token = T.svcmgr) => (await call(token, 'GET', `/v1/work-orders/${code}`)).body;
const denied = (action) => Number(h.asSuper(`SELECT count(*) FROM app.audit_event WHERE action = '${action}' AND outcome = 'DENIED'`));
const refused = async (r, re, what) => { assert.ok([403, 422].includes(r.status), `${what}: ${r.status} ${J(r.body)}`); assert.match(J(r.body), re, what); };
/** a failed result on a test opens a deficiency; a work order is raised on it and triaged */
const job = async (n) => {
  // the n-th applicable check of the room that is recorded on an observation (which one it is does not matter here: a failed result opens a deficiency)
  const row = (await call(T.cxeng, 'GET', R)).body.commissioning.rows.filter((x) => x.applicable && !x.instrument && x.evidence.includes('FIELD_OBSERVED'))[n]; const testId = row.test_id;
  const ev = (await call(T.cxeng, 'POST', '/v1/evidence', { raw: `synthetic observation: ${testId} did not pass`, headers: { 'content-type': 'text/plain', 'x-file-name': `${testId}.txt` } })).body.id;
  const f = await call(T.cxeng, 'POST', `${R}/results`, { body: { testId, state: 'FAIL', evidenceId: ev, evidenceKind: 'FIELD_OBSERVED', instrument: 'SYN-METER-01 (synthetic), calibration record SYN-CAL-2026-09' } }); assert.equal(f.status, 201, J(f.body));
  const issue = h.asSuper(`SELECT i.code FROM app.room_issue i JOIN app.room r ON r.id = i.room_id WHERE i.key = 'test-failed:${testId}' AND r.code = '${ROOM}'`);
  const made = await call(T.svcmgr, 'POST', `/v1/issues/${issue}/work-orders`, { body: { note: 'handed over from commissioning (synthetic)' } }); assert.equal(made.status, 201, J(made.body)); const code = made.body.workOrderId;
  assert.equal((await call(T.svcmgr, 'POST', `/v1/work-orders/${code}/triage`, { body: { severity: 'Standard', scope: `${testId} did not pass (synthetic)`, risk: 'the room waits on it (synthetic)', window: { from: new Date(Date.now() + 864e5).toISOString(), to: new Date(Date.now() + 864e5 + 4 * 36e5).toISOString() } } })).status, 200);
  return { code, issue };
};
const PREFLIGHT = { safetyBriefed: true, toolsConfirmed: ['service kit'], accessConfirmedBy: 'building reception (synthetic)' };

before(async () => {
  h = await setup({ db: 'empathia_second_tech', port: 4156, env: { DEMO_SESSIONS: 'on' } }); c = client(h.base); h.asSuper('UPDATE app.demo_config SET enabled = true');
  const o = await c.call('POST', '/v1/demo/sandboxes', { body: {} }); assert.equal(o.status, 201, J(o.body)); sb = o.body.sandbox; T.people = o.body.personas;
  for (const role of ['syseng', 'installer', 'cxeng', 'svcmgr', 'steward', 'exec', 'service']) T[role] = (await session(role)).body.accessToken;
  T.tech1 = T.service; T.tech2 = (await session('service', 2)).body.accessToken;
  ROOM = (await call(T.cxeng, 'GET', '/v1/rooms?limit=50')).body.items.find((r) => r.canonicalRef !== 'UNI-SCI-110').code; R = `/v1/rooms/${ROOM}`;
  await registerRoom(c, ROOM, T.installer); assert.equal((await call(T.syseng, 'POST', `${R}/lifecycle`, { body: { to: 'COMMISSIONING' } })).status, 200);
});
after(async () => { await h.app.stop(); });

test('ST-01 a sandbox has two service technicians: two people, two seats, one role; a session names its seat', async () => {
  const techs = T.people.filter((p) => p.role === 'service'); assert.equal(techs.length, 2, J(T.people.map((p) => p.role)));
  assert.deepEqual(techs.map((p) => p.seat), [1, 2]); assert.notEqual(techs[0].id, techs[1].id); assert.match(techs[0].name, /^Service Technician \(synthetic\)$/); assert.match(techs[1].name, /^Service Technician 2 \(synthetic\)$/);
  assert.ok(T.people.filter((p) => p.role !== 'service').every((p) => p.seat === 1), 'every other role has one person');
  const me1 = (await call(T.tech1, 'GET', '/v1/me')).body; const me2 = (await call(T.tech2, 'GET', '/v1/me')).body; T.id1 = techs[0].id; T.id2 = techs[1].id;
  assert.equal(J(me1).includes(T.id1), true, J(me1)); assert.equal(J(me2).includes(T.id2), true, J(me2)); assert.equal(J(me2).includes(T.id1), false, 'the second seat is not the first person');
  assert.equal((await session('service', 1)).status, 200); const none = await session('service', 3); assert.equal(none.status, 400, J(none.body)); assert.match(J(none.body), /has 2 service: seat 3 is not one of them/);
  const exec2 = await session('exec', 2); assert.equal(exec2.status, 400, J(exec2.body)); assert.equal((await session('service', 0)).status, 400); assert.equal((await session('service', 'two')).status, 400);
  // the second person is the sandbox's own, by the same boundary as the first, and joins no other organization
  const mail = h.asSuper(`SELECT email FROM app.person WHERE id = '${T.id2}'`); assert.match(mail, /^service-2@sbx-[0-9a-f]{16}\.empathia\.invalid$/);
  assert.throws(() => h.asSuper(`INSERT INTO app.membership (tenant_id, person_id, role_key) SELECT t.id, '${T.id2}', 'service' FROM app.tenant t WHERE t.slug NOT LIKE 'sbx-%' LIMIT 1`), /joins no other tenant/);
  // the same authorities, because the same role: what differs between them is decided by records, not by the session
  const auth = (m) => J([...(m.authorities || m.principal?.authorities || [])].sort()); assert.equal(auth(me1), auth(me2));
});

test('ST-02 the second technician’s certificate is recorded and not verified: it counts for nothing, and neither its holder, its recorder nor a colleague verifies it', async () => {
  const all = (await call(T.svcmgr, 'GET', `/v1/competencies?person=${T.id2}`)).body.items; assert.equal(all.length, 1, J(all)); const cred = all[0]; T.cred = cred.id;
  assert.deepEqual([cred.competency, cred.state, cred.countsForDispatch], ['cert.av_field', 'PENDING_VERIFICATION', false]);
  for (const [who, name] of [[T.tech2, 'its holder'], [T.tech1, 'the other technician'], [T.svcmgr, 'its recorder'], [T.exec, 'an executive']]) {
    const r = await call(who, 'POST', `/v1/competencies/${cred.id}/verify`, { body: { note: 'looks right to me (synthetic)' } }); assert.equal(r.status, 403, `${name}: ${r.status} ${J(r.body)}`); }
  assert.equal((await call(T.svcmgr, 'GET', `/v1/competencies?person=${T.id2}`)).body.items[0].state, 'PENDING_VERIFICATION');
  // a technician sees their own credentials only
  const mine2 = (await call(T.tech2, 'GET', '/v1/competencies')).body.items; assert.ok(mine2.length === 1 && mine2[0].person.id === T.id2, J(mine2));
  const peek = (await call(T.tech2, 'GET', `/v1/competencies?person=${T.id1}`)).body.items; assert.ok(peek.every((x) => x.person.id === T.id2), 'asking for a colleague’s credentials returns one’s own');
  const mine1 = (await call(T.tech1, 'GET', '/v1/competencies')).body.items; assert.ok(mine1.length >= 3 && mine1.every((x) => x.person.id === T.id1 && x.state === 'VERIFIED'), J(mine1));
});

test('ST-03 the hard gates: the first passes, the second is refused with the reason; Search Party says the same; "assign anyway" is refused', async () => {
  const a = await job(0); T.A = a.code; T.issueA = a.issue;
  const cands = (await call(T.svcmgr, 'GET', `/v1/work-orders/${T.A}/candidates`)).body;
  assert.deepEqual(cands.eligible.map((x) => x.id), [T.id1], J(cands)); assert.deepEqual(cands.ineligible.map((x) => x.id), [T.id2]);
  const why = cands.ineligible[0].hardFails; assert.ok(why.some((f) => /recorded, not yet verified by someone other than its recorder and its holder \(it counts for nothing until then\)/.test(f)), J(why));
  assert.ok(!why.some((f) => /not held$/.test(f)), 'the reason is the precise one'); assert.deepEqual(cands.ineligible[0].pending.map((x) => [x.id, x.competency]), [[T.cred, 'cert.av_field']]);
  const view = await wo(T.A); assert.deepEqual(view.candidates.ineligible.map((x) => x.id), [T.id2]); assert.equal(view.candidates.none, false);
  // Search Party reads the same gates
  const sp = await call(T.svcmgr, 'POST', '/v1/search/intent', { body: { question: 'who is qualified to fix this', target: { type: 'RoomIssue', id: T.issueA } } }); assert.equal(sp.status, 200, J(sp.body));
  assert.match(J(sp.body), /Service Technician \(synthetic\)/); assert.match(J(sp.body), /not yet verified/, 'the answer says why the second technician is not qualified');
  // the technicians do not see who the gates admit
  for (const t of [T.tech1, T.tech2]) { assert.equal((await call(t, 'GET', `/v1/work-orders/${T.A}/candidates`)).status, 403); assert.equal((await wo(T.A, t)).candidates, null); assert.equal((await call(t, 'POST', `/v1/work-orders/${T.A}/assign`, { body: { personId: T.id2 } })).status, 403, 'a technician assigns nobody, themselves included'); }
  // "assign anyway"
  const n0 = denied('work_order.assign'); const any = await call(T.svcmgr, 'POST', `/v1/work-orders/${T.A}/assign`, { body: { personId: T.id2 } });
  assert.equal(any.status, 422, J(any.body)); assert.match(J(any.body), /fails a hard gate/); assert.match(J(any.body), /not yet verified/); assert.equal(denied('work_order.assign'), n0 + 1);
  const still = await wo(T.A); assert.equal(still.state, 'TRIAGED'); assert.equal(still.assignee, null);
  const stranger = await call(T.svcmgr, 'POST', `/v1/work-orders/${T.A}/assign`, { body: { personId: T.people.find((p) => p.role === 'exec').id } }); assert.equal(stranger.status, 422); assert.match(J(stranger.body), /not in this organization’s service pool/);
});

test('ST-04 a job assigned to the first technician is theirs: the second cannot accept it, preflight it, start it, record on it or hand it over', async () => {
  assert.equal((await call(T.svcmgr, 'POST', `/v1/work-orders/${T.A}/assign`, { body: { personId: T.id1 } })).status, 200);
  const W = `/v1/work-orders/${T.A}`; const state = async () => (await wo(T.A)).state; const n = () => Number(h.asSuper(`SELECT count(*) FROM app.audit_event WHERE outcome = 'DENIED' AND action LIKE 'work_order.%'`)); const n0 = n();
  await refused(await call(T.tech2, 'POST', `${W}/accept`), /accepted by the technician it was assigned to/, 'accept as the second'); assert.equal(await state(), 'ASSIGNED');
  await refused(await call(T.tech2, 'POST', `${W}/preflight`, { body: PREFLIGHT }), /accepted job|assigned technician/, 'preflight before acceptance, as the second');
  assert.equal((await call(T.tech1, 'POST', `${W}/accept`)).status, 200);
  await refused(await call(T.tech2, 'POST', `${W}/preflight`, { body: PREFLIGHT }), /the assigned technician records the preflight/, 'preflight as the second'); assert.equal((await wo(T.A)).preflight, null);
  await refused(await call(T.tech2, 'POST', `${W}/start`), /the assigned technician starts the work/, 'start as the second');
  const pf = await call(T.tech1, 'POST', `${W}/preflight`, { body: PREFLIGHT }); assert.equal(pf.status, 200, J(pf.body)); assert.equal(pf.body.ok ?? pf.body.preflight?.ok, true, J(pf.body));
  await refused(await call(T.tech2, 'POST', `${W}/start`), /the assigned technician starts the work/, 'start as the second, preflight passed'); assert.equal(await state(), 'ACCEPTED');
  assert.equal((await call(T.tech1, 'POST', `${W}/start`)).status, 200);
  await refused(await call(T.tech2, 'POST', `${W}/evidence`, { body: { kind: 'note', note: 'I was there too (synthetic)' } }), /the assigned technician records the work/, 'evidence as the second'); assert.equal((await wo(T.A)).evidenceCount, 0);
  await refused(await call(T.tech2, 'POST', `${W}/submit`), /the assigned technician records the work/, 'hand-over as the second');
  assert.equal((await call(T.tech1, 'POST', `${W}/evidence`, { body: { kind: 'note', note: 'pickup zones remapped to the seats (synthetic)' } })).status, 200);
  await refused(await call(T.tech2, 'POST', `${W}/submit`), /the assigned technician records the work/, 'hand-over as the second, with evidence on the job'); assert.equal(await state(), 'IN_PROGRESS');
  assert.equal((await call(T.tech1, 'POST', `${W}/submit`)).status, 200); assert.equal(await state(), 'VERIFYING');
  assert.ok(n() - n0 >= 7, `each refusal is in the audit trail (${n() - n0})`);
  // the second technician can read the job (same organization), and it shows them no step that is theirs to take
  const seen = await wo(T.A, T.tech2); assert.equal(seen.code, T.A); assert.equal(seen.assignee.id, T.id1);
});

test('ST-05 nobody verifies their own work, and a colleague of the same role does not verify it either', async () => {
  const W = `/v1/work-orders/${T.A}`;
  for (const [who, name] of [[T.tech1, 'the technician who did it'], [T.tech2, 'the other technician'], [T.svcmgr, 'the service manager']]) { const r = await call(who, 'POST', `${W}/verify`, { body: { outcome: 'pass', note: 'done (synthetic)' } }); assert.equal(r.status, 403, `${name}: ${r.status} ${J(r.body)}`); }
  assert.equal((await wo(T.A)).state, 'VERIFYING');
  const v = await call(T.cxeng, 'POST', `${W}/verify`, { body: { outcome: 'pass', note: 'every seat picked up on the meter (synthetic)' } }); assert.equal(v.status, 200, J(v.body)); assert.equal((await wo(T.A)).state, 'RESOLVED');
});

test('ST-06 verified by the data steward, the credential counts at once: the second technician passes, takes the next job, and it is closed to the first', async () => {
  const b = await job(1); T.B = b.code; const W = `/v1/work-orders/${T.B}`;
  const before6 = (await call(T.svcmgr, 'GET', `${W}/candidates`)).body; assert.deepEqual(before6.ineligible.map((x) => x.id), [T.id2], 'still refused on the new job');
  const ok = await call(T.steward, 'POST', `/v1/competencies/${T.cred}/verify`, { body: { note: 'checked against the issuer record (synthetic)' } }); assert.equal(ok.status, 200, J(ok.body));
  const cred = (await call(T.svcmgr, 'GET', `/v1/competencies?person=${T.id2}`)).body.items[0]; assert.deepEqual([cred.state, cred.countsForDispatch], ['VERIFIED', true]); assert.match(cred.decidedBy, /Data steward/i);
  const again = await call(T.steward, 'POST', `/v1/competencies/${T.cred}/verify`, { body: { note: 'again (synthetic)' } }); assert.ok([409, 422].includes(again.status), `a decision is made once (${again.status})`);
  const now = (await call(T.svcmgr, 'GET', `${W}/candidates`)).body; assert.deepEqual(now.eligible.map((x) => x.id).sort(), [T.id1, T.id2].sort(), J(now)); assert.equal(now.ineligible.length, 0);
  const a = await call(T.svcmgr, 'POST', `${W}/assign`, { body: { personId: T.id2 } }); assert.equal(a.status, 200, J(a.body)); assert.equal((await wo(T.B)).assignee.id, T.id2);
  // and now the first technician is the one refused, by the same rules
  await refused(await call(T.tech1, 'POST', `${W}/accept`), /accepted by the technician it was assigned to/, 'accept as the first'); assert.equal((await call(T.tech2, 'POST', `${W}/accept`)).status, 200);
  await refused(await call(T.tech1, 'POST', `${W}/preflight`, { body: PREFLIGHT }), /the assigned technician records the preflight/, 'preflight as the first');
  assert.equal((await call(T.tech2, 'POST', `${W}/preflight`, { body: PREFLIGHT })).status, 200); await refused(await call(T.tech1, 'POST', `${W}/start`), /the assigned technician starts the work/, 'start as the first');
  assert.equal((await call(T.tech2, 'POST', `${W}/start`)).status, 200); await refused(await call(T.tech1, 'POST', `${W}/evidence`, { body: { kind: 'note', note: 'mine (synthetic)' } }), /the assigned technician records the work/, 'evidence as the first');
  assert.equal((await wo(T.B)).state, 'IN_PROGRESS');
});

test('ST-07 revoked, the credential stops counting at once', async () => {
  const c7 = await job(2); const W = `/v1/work-orders/${c7.code}`;
  assert.ok((await call(T.svcmgr, 'GET', `${W}/candidates`)).body.eligible.some((x) => x.id === T.id2), 'eligible before the revocation');
  assert.equal((await call(T.tech2, 'POST', `/v1/competencies/${T.cred}/revoke`, { body: { reason: 'not mine to revoke (synthetic)' } })).status, 403);
  const rv = await call(T.steward, 'POST', `/v1/competencies/${T.cred}/revoke`, { body: { reason: 'the issuer withdrew it (synthetic)' } }); assert.equal(rv.status, 200, J(rv.body));
  const after7 = (await call(T.svcmgr, 'GET', `${W}/candidates`)).body; assert.ok(after7.ineligible.some((x) => x.id === T.id2) && !after7.eligible.some((x) => x.id === T.id2), J(after7));
  const any = await call(T.svcmgr, 'POST', `${W}/assign`, { body: { personId: T.id2 } }); assert.equal(any.status, 422, J(any.body)); assert.match(J(any.body), /fails a hard gate/);
});
