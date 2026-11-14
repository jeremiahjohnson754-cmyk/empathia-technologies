/**
 * APEX (P6-B) through the real API on @empathia/apex-engine: a case per deficiency with layers that cite the room's records, tiered
 * action where every outcome (blocked, refused, human-led) is a result, A3 staging a real work order through the service manager's
 * path, A4 blocked by the real adapter state and simulated only when labelled, a reviewed diagnosis. Synthetic data only.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client, registerRoom } from '../integration/harness.mjs';

let h, c, room, issue, apx; const T = {};
before(async () => {
  h = await setup({ db: 'empathia_apex', port: 4188 });
  c = client(h.base);
  for (const r of ['designer', 'syseng', 'opslead', 'installer', 'cxeng', 'svcmgr', 'service', 'requestor', 'dsp_eng']) T[r] = await c.login(r);
  room = (await c.call('POST', '/v1/rooms', { token: T.designer, body: { name: 'APEX Boardroom (synthetic)', template: 'boardroom', buildingCode: 'ATL', floor: 5 } })).body.code;
  await c.call('POST', `/v1/rooms/${room}/revisions`, { token: T.designer, body: { reason: 'apex' } }); await c.call('POST', `/v1/rooms/${room}/drawings/generate`, { token: T.designer });
  await c.call('POST', `/v1/rooms/${room}/drawings/plan/approve`, { token: T.syseng }); await c.call('POST', `/v1/rooms/${room}/classification/approve`, { token: T.syseng, body: {} });
  for (const [to, t] of [['DESIGN_APPROVED', 'syseng'], ['INSTALLATION_PENDING', 'opslead'], ['INSTALLED_UNVERIFIED', 'installer'], ['COMMISSIONING', 'syseng']]) { if (to === 'COMMISSIONING') await registerRoom(c, room, T.installer); await c.call('POST', `/v1/rooms/${room}/lifecycle`, { token: T[t], body: { to } }); }   // the register gates commissioning (14 Nov 2026)
  const d = (await c.call('GET', `/v1/rooms/${room}`, { token: T.designer })).body;
  // a failed display test: the symptom names the display, so the engine opens the 'display' branch (layers with observations to cite)
  const row = d.commissioning.rows.find((x) => x.applicable && /display/i.test(x.label || x.test_id || '')) || d.commissioning.rows.find((x) => x.applicable);
  const ev = (await c.call('POST', '/v1/evidence', { token: T.cxeng, raw: Buffer.from('synthetic'), headers: { 'content-type': 'text/plain', 'x-file-name': 'o.txt' } })).body;
  await c.call('POST', `/v1/rooms/${room}/results`, { token: T.cxeng, body: { testId: row.test_id, state: 'FAIL', evidenceId: ev.id, evidenceKind: row.evidence[0], instrument: 'SYN-METER-01 (synthetic)' } });
  issue = (await c.call('GET', `/v1/rooms/${room}`, { token: T.designer })).body.issues.find((i) => i.state === 'OPEN' && i.category === 'INSTALLATION_COMMISSIONING_DEFICIENCY').code;
});
after(async () => { await h?.app.stop(); });

const act = (tok, body) => c.call('POST', `/v1/apex/cases/${apx}/act`, { token: tok, body });
const audited = (action, outcome) => Number(h.asSuper(`SELECT count(*) FROM app.audit_event WHERE action = '${action}' AND outcome = '${outcome}' AND aggregate_id = '${apx}'`));

test('APX-1 opening a case needs an APEX authority (a requestor is refused, audited); the commissioning lead opens it; the layers cite the room’s own planned assets; hypotheses are ranked with caveats; a second open returns the same case', async () => {
  assert.equal((await c.call('POST', `/v1/issues/${issue}/apex`, { token: T.requestor, body: {} })).status, 403);
  const r = await c.call('POST', `/v1/issues/${issue}/apex`, { token: T.cxeng, body: {} });
  assert.equal(r.status, 201, JSON.stringify(r.body)); apx = r.body.caseId; assert.match(apx, /^APX-\d{4}$/); assert.ok(r.body.hypotheses.length >= 1);
  const d = (await c.call('GET', `/v1/apex/cases/${apx}`, { token: T.cxeng })).body;
  const assets = h.asSuper(`SELECT string_agg(code, ',') FROM app.planned_asset WHERE room_id = (SELECT id FROM app.room WHERE code = '${room}') AND removed_at IS NULL`).split(',');
  const physical = d.layers.find((l) => l.layer === 'physical');
  assert.ok(physical.cites.length > 0 && physical.cites.every((x) => assets.some((a) => x.startsWith(a))), `cites are this room's assets: ${physical.cites}`);
  const conf = { high: 3, medium: 2, low: 1, none: 0 }; for (let i = 1; i < d.hypotheses.length; i++) assert.ok(conf[d.hypotheses[i - 1].confidence] >= conf[d.hypotheses[i].confidence], 'ranked by confidence');
  assert.ok(d.hypotheses.every((x) => x.caveat && x.action.tier));
  assert.deepEqual(Object.values(d.adapters).sort(), ['DECLARED', 'DECLARED', 'NOT_CONFIGURED'], 'the real adapter state: two local mocks are DECLARED, nothing is SUPPORTED_VERIFIED');
  assert.equal(d.baseline, null, 'no accepted baseline for a room under commissioning');
  const again = await c.call('POST', `/v1/issues/${issue}/apex`, { token: T.svcmgr, body: {} }); assert.equal(again.body.caseId, apx); assert.equal(again.body.existing, true);
  assert.equal((await c.call('GET', `/v1/apex/cases/${apx}`, { token: T.requestor })).body.yours.act, false, 'readable; not actionable for a requestor');
});

test('APX-2 A0 explains with a cite or abstains; A1 proposes; A2 compares read-only and says NOT_VERIFIED without a baseline; a requestor cannot act', async () => {
  const d = (await c.call('GET', `/v1/apex/cases/${apx}`, { token: T.cxeng })).body; const top = d.hypotheses[0];
  assert.equal((await act(T.requestor, { hypothesisId: top.id, tier: 'A0' })).status, 403);
  const a0 = await act(T.cxeng, { hypothesisId: top.id, tier: 'A0' }); assert.equal(a0.status, 200); assert.ok(['EXPLAINED', 'ABSTAINED'].includes(a0.body.outcome), a0.body.outcome);
  const a1 = await act(T.cxeng, { hypothesisId: top.id, tier: 'A1' }); assert.equal(a1.body.outcome, 'PROPOSED');
  const a2 = await act(T.cxeng, { hypothesisId: top.id, tier: 'A2' }); assert.equal(a2.body.outcome, 'COMPARED'); assert.match(a2.body.detail, /NOT_VERIFIED|no accepted baseline/);
  assert.equal((await act(T.cxeng, { hypothesisId: 'nope', tier: 'A0' })).status, 400);
  assert.equal((await c.call('GET', `/v1/apex/cases/${apx}`, { token: T.cxeng })).body.actions.length, 3);
});

test('APX-3 A3 stages a REAL work order only through a role that may raise one: the commissioning lead is refused (DENIED audit), the service manager stages WO-… and it appears in the service queue; a second staging is refused because the deficiency already has one', async () => {
  const d = (await c.call('GET', `/v1/apex/cases/${apx}`, { token: T.cxeng })).body; const top = d.hypotheses[0];
  const no = await act(T.cxeng, { hypothesisId: top.id, tier: 'A3' }); assert.equal(no.status, 200); assert.equal(no.body.outcome, 'REFUSED'); assert.match(no.body.detail, /service\.assign or service\.triage/);
  assert.equal(audited('apex.a3_stage', 'DENIED'), 1); assert.equal(audited('apex.a3', 'DENIED'), 1);
  const yes = await act(T.svcmgr, { hypothesisId: top.id, tier: 'A3' }); assert.equal(yes.body.outcome, 'DRAFT_STAGED', JSON.stringify(yes.body)); assert.match(yes.body.workOrderId, /^WO-\d{4}$/);
  const q = (await c.call('GET', '/v1/work-orders', { token: T.svcmgr })).body.items.find((w) => w.code === yes.body.workOrderId); assert.ok(q && q.state === 'OPEN');
  assert.equal(h.asSuper(`SELECT note FROM app.work_order WHERE code = '${yes.body.workOrderId}'`).startsWith(`staged by APEX ${apx}`), true);
  const twice = await act(T.svcmgr, { hypothesisId: top.id, tier: 'A3' }); assert.equal(twice.body.outcome, 'REFUSED'); assert.match(twice.body.detail, /already has work order/);
});

test('APX-4 A4 is blocked step by step — unsigned/safety runbook is human-led; missing owner approval, missing window, occupancy, then the REAL adapter state (NOT_CONFIGURED) — and only a labelled simulation runs: dry run first, then the bounded simulation, with the compensation branch audited', async () => {
  const d = (await c.call('GET', `/v1/apex/cases/${apx}`, { token: T.cxeng })).body;
  const a4 = d.hypotheses.find((x) => x.action.tier === 'A4' && x.action.runbook && d.runbooks.find((r) => r.id === x.action.runbook)?.signedBy) || d.hypotheses[0];
  const rb = { hypothesisId: a4.id, tier: 'A4', runbook: a4.action.runbook && d.runbooks.find((r) => r.id === a4.action.runbook)?.signedBy ? a4.action.runbook : 'RB-AEC-RESET' };
  const steps = [[{}, /owner approval missing/], [{ ownerApproved: true }, /no preauthorized window/], [{ ownerApproved: true, window: '2026-11-03 07:00–08:00', occupied: true }, /occupied/], [{ ownerApproved: true, window: '2026-11-03 07:00–08:00' }, /unsupported vendor adapter|NOT_CONFIGURED|DECLARED/]];
  for (const [extra, re] of steps) { const r = await act(T.syseng, { ...rb, ...extra }); assert.equal(r.status, 200); assert.equal(r.body.outcome, 'BLOCKED', JSON.stringify(r.body)); assert.match(r.body.detail, re); }
  const unsigned = await act(T.syseng, { ...rb, runbook: 'RB-VLAN-ROUTE', ownerApproved: true, window: 'w' }); assert.equal(unsigned.body.outcome, 'HUMAN_LED');
  const dry = await act(T.syseng, { ...rb, ownerApproved: true, window: '2026-11-03 07:00–08:00', simulate: true }); assert.equal(dry.body.outcome, 'DRY_RUN'); assert.equal(dry.body.simulated, true);
  const run = await act(T.syseng, { ...rb, ownerApproved: true, window: '2026-11-03 07:00–08:00', simulate: true, dryRunDone: true }); assert.equal(run.body.outcome, 'EXECUTED_SIMULATED'); assert.equal(run.body.verification, 'REQUIRED');
  const rate = await act(T.syseng, { ...rb, ownerApproved: true, window: '2026-11-03 07:00–08:00', simulate: true, dryRunDone: true }); assert.equal(rate.body.outcome, 'BLOCKED'); assert.match(rate.body.detail, /rate limit/);
  const d2 = (await c.call('GET', `/v1/apex/cases/${apx}`, { token: T.cxeng })).body; assert.equal(d2.priorA4, 1);
  // a compensation branch on another signed runbook: the rollback is audited as a compensation request
  const other = await act(T.syseng, { hypothesisId: a4.id, tier: 'A4', runbook: 'RB-POE-CYCLE', ownerApproved: true, window: 'w', simulate: true, dryRunDone: true, branch: 'lost_signal' });
  assert.equal(other.body.outcome, 'ROLLED_BACK'); assert.equal(other.body.compensation, true);
  assert.equal(audited('workflow.compensation_requested', 'ALLOWED'), 1);
  assert.equal(h.asSuper(`SELECT count(*) FROM app.audit_event WHERE action = 'apex.a4' AND aggregate_id = '${apx}'`), '9', 'every A4 outcome, blocked ones included, is audited');
});

test('APX-5 the review needs a verifier (the technician is refused); the commissioning lead’s verdict is recorded and the event names the top hypothesis and tier; site scope hides the case from a South-scoped manager', async () => {
  assert.equal((await c.call('POST', `/v1/apex/cases/${apx}/review`, { token: T.service, body: { verdict: 'x' } })).status, 403);
  assert.equal((await c.call('POST', `/v1/apex/cases/${apx}/review`, { token: T.cxeng, body: { verdict: '' } })).status, 400);
  const r = await c.call('POST', `/v1/apex/cases/${apx}/review`, { token: T.cxeng, body: { verdict: 'root cause confirmed in the call (synthetic)' } }); assert.equal(r.status, 200); assert.equal(r.body.review.byRole, 'cxeng');
  const ev = h.asSuper(`SELECT payload::text FROM app.outbox_event WHERE type = 'apex.diagnosis_reviewed' AND aggregate_id = '${apx}'`); assert.match(ev, /hypothesisId/); assert.match(ev, /"tier": ?"A[0-5]"/);
  const south = await c.login('service', 'empathia-demo', 'service-south');
  assert.equal((await c.call('GET', `/v1/apex/cases/${apx}`, { token: south })).status, 404);
  assert.equal((await c.call('GET', '/v1/apex/cases', { token: south })).body.items.length, 0);
  assert.equal((await c.call('GET', '/v1/apex/cases', { token: T.cxeng })).body.items[0].reviewed, true);
});
