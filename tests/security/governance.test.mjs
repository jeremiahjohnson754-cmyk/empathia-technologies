/**
 * Owner decisions of 2026-10-30 (RT-04 baselines, RT-14/15 measurements, RT-16 separation of duties + delegations), over real HTTP
 * and a real database. One room is taken through the whole governed lifecycle to ACCEPTED, which publishes baseline v1.
 *   - SoD: the author of a design cannot approve it; the verifier of the results cannot accept the room; the recorder cannot verify
 *     their own measurement; the requester cannot decide their own exception; a publisher cannot republish results they verified.
 *   - Delegation: a QA reviewer lends customer.accept to the operations lead for 3 days; the operations lead accepts the room; the
 *     audit row says it was delegated; a person cannot lend what they do not hold; a revoked delegation stops working at once.
 *   - Baselines: v1 at acceptance binds the approved revision, hash, plan, results and evidence; it is immutable (EM005); after a
 *     change, a new version supersedes v1 (lineage kept); an exception is decided by someone other than its requester.
 *   - Measurements: provenance is preserved; a SIMULATED value is never VERIFIED; dBFS is never recorded as SPL; an uncalibrated field
 *     value is not VERIFIED; a calibrated field value verified by a different person is.
 *   node --test tests/security/governance.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client, registerRoom } from '../integration/harness.mjs';

let h, c, T = {}, code, evidence, rows, ids = {};
const instrument = 'SYN-METER-01 (synthetic), calibration record SYN-CAL-2026-09';
const room = (tok = T.designer) => c.call('GET', `/v1/rooms/${code}`, { token: tok });
const move = (to, tok) => c.call('POST', `/v1/rooms/${code}/lifecycle`, { token: tok, body: { to } });
const audit = async (pred) => (await c.call('GET', '/v1/audit?limit=200', { token: T.secadmin })).body.items.find(pred);

before(async () => {
  h = await setup({ db: 'empathia_test_gov', port: 4194 }); c = client(h.base);
  for (const r of ['designer', 'syseng', 'opslead', 'installer', 'cxeng', 'qa_reviewer', 'secadmin', 'service', 'requestor']) T[r] = await c.login(r);
  for (const r of ['designer', 'syseng', 'opslead', 'qa_reviewer', 'cxeng', 'secadmin', 'service']) ids[r] = h.asSuper(`SELECT id FROM app.person WHERE email = '${r.replace(/_/g, '-')}@empathia-demo.empathia.invalid'`);
  const r = await c.call('POST', '/v1/rooms', { token: T.designer, body: { name: 'Governance Huddle (synthetic)', template: 'huddle', buildingCode: 'NST', floor: 1 }, headers: { 'idempotency-key': 'gov-create-0001' } });
  assert.equal(r.status, 201, JSON.stringify(r.body)); code = r.body.code;
  const up = await c.call('POST', '/v1/evidence', { token: T.cxeng, raw: Buffer.from('synthetic governance observation'), headers: { 'content-type': 'text/plain', 'x-file-name': 'gov.txt' } });
  assert.equal(up.status, 201); evidence = up.body;
});
after(async () => { await h?.app.stop(); });

test('SoD-1 — the classification and the design are approved by someone other than their author; the author’s attempt is an audited rule refusal', async () => {
  // the syseng edits the design (becomes the latest revision's author) and is then refused to approve it
  const dev = await c.call('POST', `/v1/rooms/${code}/devices`, { token: T.syseng, body: { category: 'display', x: 1, y: 1, mount: 'wall' } });
  assert.equal(dev.status, 201, JSON.stringify(dev.body));
  const rev = await c.call('POST', `/v1/rooms/${code}/revisions`, { token: T.syseng, body: { reason: 'synthetic: syseng adds the display' } });
  assert.equal(rev.status, 201, JSON.stringify(rev.body));
  const self = await c.call('POST', `/v1/rooms/${code}/classification/approve`, { token: T.syseng, body: {} });
  assert.equal(self.status, 422, JSON.stringify(self.body)); assert.match(JSON.stringify(self.body), /not .*approve|author|separat/i);
  assert.ok(await audit((e) => e.outcome === 'DENIED' && e.actor_role === 'syseng' && /classify/.test(JSON.stringify(e))), 'the self-approval refusal is audited');
  // the designer saves the next revision; now the syseng is not the author and may approve
  const dev2 = await c.call('POST', `/v1/rooms/${code}/devices`, { token: T.designer, body: { category: 'table', x: 2, y: 1, mount: 'floor' } });
  assert.equal(dev2.status, 201, JSON.stringify(dev2.body));
  assert.equal((await c.call('POST', `/v1/rooms/${code}/revisions`, { token: T.designer, body: { reason: 'synthetic: designer adds a table' } })).status, 201);
  assert.equal((await c.call('POST', `/v1/rooms/${code}/classification/approve`, { token: T.syseng, body: {} })).status, 200);
  assert.equal((await move('DESIGN_APPROVED', T.syseng)).status, 200);
  assert.equal((await move('INSTALLATION_PENDING', T.opslead)).status, 200);
  assert.equal((await move('INSTALLED_UNVERIFIED', T.installer)).status, 200);
  await registerRoom(c, code, T.installer);   // the device register gates commissioning (founder, 14 Nov 2026)
  assert.equal((await move('COMMISSIONING', T.syseng)).status, 200);
  rows = (await room()).body.commissioning.rows.filter((x) => x.applicable);
  assert.ok(rows.length >= 2, `${rows.length} applicable tests`);
});

test('SoD-2 — every applicable test is recorded by the commissioning engineer and verified by QA; QA (the verifier) is then refused to accept the room', async () => {
  for (const r of rows) {
    const rec = await c.call('POST', `/v1/rooms/${code}/results`, { token: T.cxeng, body: { testId: r.test_id, state: 'PASS', evidenceId: evidence.id, evidenceKind: r.evidence[0], instrument } });
    assert.equal(rec.status, 201, `${r.test_id}: ${JSON.stringify(rec.body)}`);
    const v = await c.call('POST', `/v1/rooms/${code}/results/${r.test_id}/verify`, { token: T.qa_reviewer });
    assert.equal(v.status, 200, `${r.test_id}: ${JSON.stringify(v.body)}`);
  }
  const acc = await move('ACCEPTED', T.qa_reviewer);
  assert.equal(acc.status, 422, JSON.stringify(acc.body)); assert.match(JSON.stringify(acc.body), /verified|separat|author/i);
  assert.equal((await room()).body.room.lifecycle, 'COMMISSIONING');
});

test('DEL-1 — a person cannot lend an authority they do not hold; the QA reviewer lends customer.accept to the operations lead for 3 days', async () => {
  const no = await c.call('POST', '/v1/delegations', { token: T.opslead, body: { granteeId: ids.service, authority: 'customer.accept', reason: 'synthetic: should be refused', days: 3 }, headers: { 'idempotency-key': 'del-0000' } });
  assert.equal(no.status, 422, JSON.stringify(no.body));
  const star = await c.call('POST', '/v1/delegations', { token: T.qa_reviewer, body: { granteeId: ids.opslead, authority: '*', reason: 'synthetic: wildcard', days: 3 }, headers: { 'idempotency-key': 'del-0001' } });
  assert.equal(star.status, 400);
  const d = await c.call('POST', '/v1/delegations', { token: T.qa_reviewer, body: { granteeId: ids.opslead, authority: 'customer.accept', reason: 'synthetic: QA reviewer on leave; operations lead accepts the governance room', days: 3 }, headers: { 'idempotency-key': 'del-0002' } });
  assert.equal(d.status, 201, JSON.stringify(d.body)); ids.delegation = d.body.id;
  const me = await c.call('GET', '/v1/me', { token: T.opslead });
  assert.ok((me.body.delegated || []).some((x) => x.authority === 'customer.accept'), JSON.stringify(me.body.delegated));
  assert.ok(!me.body.authorities.includes('customer.accept'), 'the delegated authority is not a direct authority');
  const mine = await c.call('GET', '/v1/delegations', { token: T.service });
  assert.equal(mine.body.items.length, 0, 'a third person sees no delegation');
});

test('BL-1 — the operations lead accepts the room through the delegation (audited as delegated) and baseline v1 is published, bound to revision, hash, plan, results and evidence', async () => {
  const acc = await move('ACCEPTED', T.opslead);
  assert.equal(acc.status, 200, JSON.stringify(acc.body));
  const used = await audit((e) => e.actor_role === 'opslead' && e.outcome === 'ALLOWED' && /"delegated":true/.test(JSON.stringify(e.detail)) && JSON.stringify(e.detail).includes(ids.delegation));
  assert.ok(used, 'the delegated acceptance is audited with the delegation id');
  const lin = await c.call('GET', `/v1/rooms/${code}/baselines`, { token: T.syseng });
  assert.equal(lin.status, 200, JSON.stringify(lin.body));
  assert.equal(lin.body.items.length, 1); const b = lin.body.current;
  assert.equal(b.version, 1); assert.equal(b.state, 'CURRENT');
  const d = (await room()).body;
  assert.equal(b.design_revision, d.room.approved_revision ?? d.room.approvedRevision ?? b.design_revision);
  assert.match(b.design_sha256, /^[0-9a-f]{64}$/);
  assert.ok(b.plan_id, 'bound to a commissioning plan');
  assert.deepEqual(Object.keys(b.results).sort(), rows.map((r) => r.test_id).sort());
  assert.ok(Object.values(b.results).every((v) => v === 'PASS_VERIFIED'));
  assert.deepEqual(b.evidence_ids, [evidence.id]);
  assert.equal(b.published_by, ids.opslead);
  const a = await c.call('GET', `/v1/rooms/${code}/assurance`, { token: T.syseng });
  assert.equal(a.status, 200); assert.equal(a.body.baseline?.version ?? a.body.baselineVersion, 1, JSON.stringify(a.body).slice(0, 300));
  const ev = h.asSuper(`SELECT count(*) FROM app.outbox_event WHERE type = 'handoff.accepted'`);
  assert.equal(ev, '1', 'handoff.accepted emitted once');
});

test('BL-2 — a baseline is immutable: UPDATE of its binding and DELETE are refused by the database (EM005); only the state transition is allowed', async () => {
  const id = h.asSuper(`SELECT id FROM app.assurance_baseline WHERE state = 'CURRENT' LIMIT 1`);
  assert.throws(() => h.asSuper(`UPDATE app.assurance_baseline SET results = '{}'::jsonb WHERE id = '${id}'`), /EM005/);
  assert.throws(() => h.asSuper(`UPDATE app.assurance_baseline SET design_revision = 99 WHERE id = '${id}'`), /EM005/);
  assert.throws(() => h.asSuper(`DELETE FROM app.assurance_baseline WHERE id = '${id}'`), /EM005|refuse|append/i);
});

test('BL-3 — recommissioning: ACCEPTED → COMMISSIONING is a governed step (plan.compile); a retest is recorded and verified; the re-acceptance publishes v2, which supersedes v1 in the lineage; v1 is never changed', async () => {
  assert.equal((await move('COMMISSIONING', T.installer)).status, 403);
  assert.equal((await move('INSTALLED_UNVERIFIED', T.installer)).status, 422, 'only the recommissioning step goes backward');
  assert.equal((await move('COMMISSIONING', T.syseng)).status, 200);
  assert.equal((await c.call('GET', `/v1/rooms/${code}/baselines`, { token: T.syseng })).body.current.version, 1, 'the baseline stays current while recommissioning');
  const r0 = rows[0];
  const rec = await c.call('POST', `/v1/rooms/${code}/results`, { token: T.cxeng, body: { testId: r0.test_id, state: 'PASS', evidenceId: evidence.id, evidenceKind: r0.evidence[0], instrument } });
  assert.equal(rec.status, 201, JSON.stringify(rec.body));
  assert.equal((await c.call('POST', `/v1/rooms/${code}/results/${r0.test_id}/verify`, { token: T.qa_reviewer })).status, 200);
  assert.equal((await move('ACCEPTED', T.qa_reviewer)).status, 422, 'the verifier still cannot accept');
  assert.equal((await move('ACCEPTED', T.opslead)).status, 200, 'the delegated acceptor re-accepts');
  const lin = (await c.call('GET', `/v1/rooms/${code}/baselines`, { token: T.syseng })).body;
  assert.equal(lin.items.length, 2);
  assert.equal(lin.items[0].version, 1); assert.equal(lin.items[0].state, 'SUPERSEDED'); assert.equal(lin.items[0].superseded_by, ids.opslead);
  assert.equal(lin.current.version, 2); assert.equal(lin.current.supersedes, lin.items[0].id);
  assert.notEqual(lin.items[0].id, lin.current.id);
  assert.deepEqual(lin.items[0].results, lin.current.results, 'same labels (all PASS_VERIFIED) — the version differs by the result objects it binds');
  assert.equal(h.asSuper(`SELECT count(*) FROM app.outbox_event WHERE type = 'assurance.baseline_superseded'`), '1');
  assert.equal(h.asSuper(`SELECT count(*) FROM app.outbox_event WHERE type = 'handoff.accepted'`), '2');
});

test('BL-4 — an exception is requested by the technician and decided by the systems engineer; the requester cannot decide it', async () => {
  const req = await c.call('POST', `/v1/rooms/${code}/baselines/exceptions`, { token: T.cxeng, body: { kind: 'TEMPORARY_WAIVER', dimension: 'acoustics', rationale: 'synthetic: HVAC retrofit raises the noise floor until November' } });
  assert.equal(req.status, 201, JSON.stringify(req.body));
  const selfDecide = await c.call('POST', `/v1/baseline-exceptions/${req.body.id}/decide`, { token: T.cxeng, body: { decision: 'APPROVED' } });
  assert.equal(selfDecide.status, 403, 'cxeng holds no baseline.approve');
  const req2 = await c.call('POST', `/v1/rooms/${code}/baselines/exceptions`, { token: T.syseng, body: { kind: 'KNOWN_GAP', dimension: 'lighting', rationale: 'synthetic: requested by the syseng to test self-decision' } });
  assert.equal(req2.status, 201);
  const own = await c.call('POST', `/v1/baseline-exceptions/${req2.body.id}/decide`, { token: T.syseng, body: { decision: 'APPROVED' } });
  assert.equal(own.status, 422, JSON.stringify(own.body));
  const ok = await c.call('POST', `/v1/baseline-exceptions/${req.body.id}/decide`, { token: T.syseng, body: { decision: 'APPROVED', note: 'synthetic: until the retrofit is commissioned' } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal((await c.call('POST', `/v1/baseline-exceptions/${req.body.id}/decide`, { token: T.syseng, body: { decision: 'REJECTED' } })).status, 422, 'decided once');
  assert.throws(() => h.asSuper(`UPDATE app.baseline_exception SET decided_by = requested_by WHERE id = '${req.body.id}'`), /check|violat/i, 'the database refuses decided_by = requested_by');
});

test('DEL-2 — a revoked delegation stops working at once; a delegation of an authority the grantor lost is not honoured', async () => {
  const rv = await c.call('POST', `/v1/delegations/${ids.delegation}/revoke`, { token: T.service });
  assert.equal(rv.status, 403, 'a third person cannot revoke');
  assert.equal((await c.call('POST', `/v1/delegations/${ids.delegation}/revoke`, { token: T.qa_reviewer })).status, 200);
  const me = await c.call('GET', '/v1/me', { token: T.opslead });
  assert.ok(!(me.body.delegated || []).some((x) => x.authority === 'customer.accept'), 'revoked delegation gone from the principal');
  // a fresh delegation, then the grantor's membership is revoked: the database function no longer returns it
  const d = await c.call('POST', '/v1/delegations', { token: T.qa_reviewer, body: { granteeId: ids.opslead, authority: 'customer.accept', reason: 'synthetic: second delegation', days: 1 }, headers: { 'idempotency-key': 'del-0003' } });
  assert.equal(d.status, 201);
  assert.ok((await c.call('GET', '/v1/me', { token: T.opslead })).body.delegated.some((x) => x.authority === 'customer.accept'));
  h.asSuper(`UPDATE app.membership SET revoked_at = now() WHERE person_id = '${ids.qa_reviewer}' AND role_key = 'qa_reviewer'`);
  assert.ok(!(await c.call('GET', '/v1/me', { token: T.opslead })).body.delegated.some((x) => x.authority === 'customer.accept'), 'a grantor who no longer holds the authority lends nothing');
  h.asSuper(`UPDATE app.membership SET revoked_at = NULL WHERE person_id = '${ids.qa_reviewer}' AND role_key = 'qa_reviewer'`);
});

test('MEAS-1 — provenance is preserved; dBFS is never recorded as SPL; SIMULATED and uncalibrated values are never VERIFIED; the recorder cannot verify; a calibrated field value verified by QA is', async () => {
  const post = (tok, body, key) => c.call('POST', `/v1/rooms/${code}/measurements`, { token: tok, body, headers: { 'idempotency-key': key } });
  const base = { metric: 'noise_floor', unit: 'dB(A)', method: 'LAeq 60 s', measuredAt: '2026-10-30T15:00:00Z', location: 'seat 3, 1.2 m', source: 'SYN-METER-01' };
  assert.equal((await post(T.requestor, { ...base, value: 35, provenance: 'OBSERVED' }, 'meas-0000')).status, 403);
  const dbfs = await post(T.cxeng, { ...base, value: -18, method: 'peak level from the recording file (dBFS)', provenance: 'INFERRED' }, 'meas-0001');
  assert.equal(dbfs.status, 422, JSON.stringify(dbfs.body)); assert.match(JSON.stringify(dbfs.body), /dBFS/);
  assert.equal((await post(T.cxeng, { ...base, value: 35, provenance: 'FIELD_MEASURED' }, 'meas-0002')).status, 400, 'a field measurement names its instrument');
  const sim = await post(T.cxeng, { ...base, value: 33, method: 'acoustic model (synthetic)', source: 'room model v3', provenance: 'SIMULATED' }, 'meas-0003');
  assert.equal(sim.status, 201, JSON.stringify(sim.body)); assert.equal(sim.body.provenance, 'SIMULATED'); assert.equal(sim.body.approvalState, 'UNREVIEWED');
  const unc = await post(T.cxeng, { ...base, value: 36.2, provenance: 'FIELD_MEASURED', instrumentId: 'SYN-METER-02', calibrationStatus: 'EXPIRED', uncertainty: 1.5, uncertaintyUnit: 'dB' }, 'meas-0004');
  assert.equal(unc.status, 201);
  const cal = await post(T.cxeng, { ...base, value: 35.8, provenance: 'FIELD_MEASURED', instrumentId: 'SYN-METER-01', calibrationStatus: 'CALIBRATED', calibrationDue: '2027-03-01', uncertainty: 0.7, uncertaintyUnit: 'dB' }, 'meas-0005');
  assert.equal(cal.status, 201);
  const verify = (tok, id, decision = 'VERIFIED') => c.call('POST', `/v1/measurements/${id}/verify`, { token: tok, body: { decision } });
  assert.equal((await verify(T.cxeng, cal.body.id)).status, 422, 'the recorder cannot verify');
  const s = await verify(T.qa_reviewer, sim.body.id); assert.equal(s.status, 422); assert.match(JSON.stringify(s.body), /SIMULATED/);
  const u = await verify(T.qa_reviewer, unc.body.id); assert.equal(u.status, 422); assert.match(JSON.stringify(u.body), /EXPIRED|calibrat/i);
  assert.equal((await verify(T.qa_reviewer, unc.body.id, 'REJECTED')).status, 200, 'rejecting an uncalibrated value is allowed');
  const ok = await verify(T.qa_reviewer, cal.body.id); assert.equal(ok.status, 200, JSON.stringify(ok.body)); assert.equal(ok.body.approvalState, 'VERIFIED');
  assert.equal((await verify(T.qa_reviewer, cal.body.id)).status, 422, 'decided once');
  const list = (await c.call('GET', `/v1/rooms/${code}/measurements`, { token: T.syseng })).body.items;
  assert.equal(list.length, 3);
  const byId = Object.fromEntries(list.map((m) => [m.id, m]));
  assert.equal(byId[sim.body.id].provenance, 'SIMULATED'); assert.equal(byId[sim.body.id].approval_state, 'UNREVIEWED');
  assert.equal(byId[cal.body.id].approval_state, 'VERIFIED'); assert.equal(Number(byId[cal.body.id].uncertainty), 0.7); assert.equal(byId[cal.body.id].approved_by, ids.qa_reviewer);
  assert.throws(() => h.asSuper(`UPDATE app.measurement SET provenance = 'FIELD_MEASURED' WHERE id = '${sim.body.id}'`), /EM006/, 'provenance never changes');
  assert.throws(() => h.asSuper(`UPDATE app.measurement SET approval_state = 'VERIFIED', approved_by = recorded_by WHERE id = '${unc.body.id}'`), /EM006|check|violat/i);
  assert.ok(await audit((e) => e.outcome === 'DENIED' && e.actor_role === 'qa_reviewer' && /measurement\.verify/.test(JSON.stringify(e))), 'refused verifications are audited');
});

test('BL-5 — a model substitution is the change order of an accepted room: refused while ACCEPTED, accepted during recommissioning (only a substitution); it reopens the tests that covered the unit, the re-acceptance waits for an approved revision (never its author) and for results recorded after the substitution, and then binds both', async () => {
  const bar = (await room()).body.devices.find((d) => d.cat === 'bar').id;
  const swap = (tok, body) => c.call('PATCH', `/v1/rooms/${code}/devices/${bar}`, { token: tok, body });
  const ready = async () => (await c.call('GET', `/v1/rooms/${code}/readiness`, { token: T.designer })).body;
  const v2 = JSON.stringify((await c.call('GET', `/v1/rooms/${code}/baselines`, { token: T.syseng })).body.current);
  const direct = await swap(T.designer, { model: 'SYN-BAR-2 (synthetic)' });
  assert.equal(direct.status, 422); assert.match(JSON.stringify(direct.body), /recommissioned first/);
  assert.equal((await move('COMMISSIONING', T.syseng)).status, 200, 'recommissioning');
  assert.equal((await swap(T.designer, { x: 1 })).status, 422, 'a device is not moved during recommissioning');
  const s1 = await swap(T.designer, { model: 'SYN-BAR-2 (synthetic)' });
  assert.equal(s1.status, 200, JSON.stringify(s1.body)); assert.equal(s1.body.assetId, bar);
  const dev = (await room()).body.devices.find((d) => d.id === bar);
  assert.equal(dev.model, 'SYN-BAR-2 (synthetic)'); assert.deepEqual(dev.modelHistory.map((m) => m.model), ['generic']);
  let rd = await ready();
  assert.equal(rd.recommissioning.substitutions[0].assetId, bar); assert.equal(rd.recommissioning.baseline.version, 2);
  const reopened = rd.recommissioning.reverification.filter((t) => t.rerun).map((t) => t.testId);
  assert.ok(reopened.length > 0 && reopened.length < rows.length, `${reopened.length} of ${rows.length} reopened`);
  assert.deepEqual([...s1.body.reverification].sort(), [...reopened].sort(), 'the substitution names the tests it reopens');
  assert.ok(rd.recommissioning.reverification.every((t) => t.reasons.length && t.assets.includes(bar)));
  assert.ok(rows.filter((r) => r.devices.includes(bar)).every((r) => reopened.includes(r.test_id)), 'every test whose plan row names the unit is reopened');
  assert.equal(rd.completion.counts.revalidation, reopened.length);
  assert.ok(Number(h.asSuper(`SELECT count(*) FROM app.outbox_event WHERE type = 'commission.asset_replaced' AND aggregate_id = '${code}'`)) === 1);
  // the re-acceptance is refused with both reasons (the acceptor holds customer.accept through a fresh delegation)
  assert.equal((await c.call('POST', '/v1/delegations', { token: T.qa_reviewer, body: { granteeId: ids.opslead, authority: 'customer.accept', reason: 'synthetic: re-acceptance after the substitution', days: 1 }, headers: { 'idempotency-key': 'del-0005' } })).status, 201);
  const early = await move('ACCEPTED', T.opslead);
  assert.equal(early.status, 422, JSON.stringify(early.body)); assert.match(JSON.stringify(early.body), /approved revision \d+ no longer describes it/); assert.match(JSON.stringify(early.body), /re-run on the changed design/);
  // the design approval: the latest revision must describe the design; never by its author
  const before = (await room()).body.room.approvedRevision;
  assert.equal((await c.call('POST', `/v1/rooms/${code}/revisions/${before}/approve`, { token: T.syseng })).status, 422, 'the approved revision is not approved again');
  const r1 = await c.call('POST', `/v1/rooms/${code}/revisions`, { token: T.syseng, body: { reason: 'synthetic: the substituted bar, saved by the syseng' } });
  assert.equal(r1.status, 201, JSON.stringify(r1.body));
  const own = await c.call('POST', `/v1/rooms/${code}/revisions/${r1.body.revision}/approve`, { token: T.syseng });
  assert.equal(own.status, 422, JSON.stringify(own.body)); assert.match(JSON.stringify(own.body), /separation of duties/);
  assert.equal((await c.call('POST', `/v1/rooms/${code}/revisions/${r1.body.revision}/approve`, { token: T.designer })).status, 403, 'room.design.approve');
  // a second substitution by the designer, saved by the designer: the systems engineer may approve it now
  assert.equal((await swap(T.designer, { model: 'SYN-BAR-3 (synthetic)' })).status, 200);
  assert.equal((await c.call('POST', `/v1/rooms/${code}/revisions/${r1.body.revision}/approve`, { token: T.qa_reviewer })).status, 403);
  const stale = await c.call('POST', `/v1/rooms/${code}/revisions/${r1.body.revision}/approve`, { token: T.syseng });
  assert.equal(stale.status, 422, 'a revision that no longer describes the design is not approved');
  const r2 = await c.call('POST', `/v1/rooms/${code}/revisions`, { token: T.designer, body: { reason: 'synthetic: the second substitution' } });
  assert.equal(r2.status, 201);
  const ap = await c.call('POST', `/v1/rooms/${code}/revisions/${r2.body.revision}/approve`, { token: T.syseng });
  assert.equal(ap.status, 200, JSON.stringify(ap.body)); assert.equal(ap.body.approvedRevision, r2.body.revision); assert.equal(ap.body.previous, before);
  assert.ok(await audit((e) => e.action === 'room.revision.approve' && e.outcome === 'ALLOWED' && e.actor_role === 'syseng'), 'the approval is audited');
  rd = await ready();
  assert.equal(rd.recommissioning.design.approvedDescribesDesign, true);
  assert.equal(rd.next.blockers.length, 1, JSON.stringify(rd.next.blockers)); assert.match(rd.next.blockers[0], /re-run/);
  assert.equal(JSON.stringify((await c.call('GET', `/v1/rooms/${code}/baselines`, { token: T.syseng })).body.current), v2, 'the current baseline is untouched while recommissioning');
  // the reopened tests are re-run on the new unit and verified independently; then the re-acceptance publishes v3, bound to the approved revision
  // ADR-0012 (owner, 2026-10-31): a re-run cites evidence obtained after the change of unit — the evidence uploaded before the substitution
  // (and cited by the superseded results) is refused, so the re-run uploads its own
  const t0 = rd.recommissioning.reverification[0]; const r0 = rows.find((x) => x.test_id === t0.testId);
  const old = await c.call('POST', `/v1/rooms/${code}/results`, { token: T.cxeng, body: { testId: t0.testId, state: 'PASS', evidenceId: evidence.id, evidenceKind: r0.evidence[0], instrument } });
  assert.equal(old.status, 422, JSON.stringify(old.body)); assert.match(JSON.stringify(old.body), /uploaded .*before the change of unit/);
  const fresh = (await c.call('POST', '/v1/evidence', { token: T.cxeng, raw: Buffer.from('synthetic governance re-run observation, after the substitution'), headers: { 'content-type': 'text/plain', 'x-file-name': 'gov-rerun.txt' } })).body;
  for (const t of rd.recommissioning.reverification) {
    const r = rows.find((x) => x.test_id === t.testId);
    assert.equal((await c.call('POST', `/v1/rooms/${code}/results`, { token: T.cxeng, body: { testId: t.testId, state: 'PASS', evidenceId: fresh.id, evidenceKind: r.evidence[0], instrument } })).status, 201);
    assert.equal((await c.call('POST', `/v1/rooms/${code}/results/${t.testId}/verify`, { token: T.qa_reviewer })).status, 200);
  }
  rd = await ready();
  assert.ok(rd.recommissioning.reverification.every((t) => !t.rerun && t.result === 'PASS_VERIFIED')); assert.equal(rd.completion.counts.revalidation, 0); assert.deepEqual(rd.next.blockers, []);
  const acc = await move('ACCEPTED', T.opslead);
  assert.equal(acc.status, 200, JSON.stringify(acc.body));
  const lin = (await c.call('GET', `/v1/rooms/${code}/baselines`, { token: T.syseng })).body;
  assert.equal(lin.items.length, 3); assert.equal(lin.current.version, 3); assert.equal(lin.current.design_revision, r2.body.revision, 'v3 binds the revision approved during recommissioning');
  assert.equal(lin.items[1].state, 'SUPERSEDED');
  const as = (await c.call('GET', `/v1/rooms/${code}/assurance`, { token: T.syseng })).body;
  assert.notEqual(as.rows.find((r) => r.k === 'presence').status, 'drift', 'the new baseline holds the substituted model');
});
