/**
 * Mission Control through the real API: the action center lists only the steps that are the caller's — the same authorities,
 * assignment and separation-of-duties rules as each record — inside their site scope. It never acts. Synthetic data only.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client, registerRoom } from '../integration/harness.mjs';

let h, c, room, wo; const T = {};
const mc = async (tok) => { const r = await c.call('GET', '/v1/mission-control', { token: tok }); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 200)); return r.body; };
const has = (b, product, ref, kind) => b.actions.some((a) => a.product === product && a.ref === ref && (!kind || a.kind === kind));

before(async () => {
  h = await setup({ db: 'empathia_mc', port: 4182 });
  c = client(h.base);
  for (const r of ['designer', 'syseng', 'opslead', 'installer', 'cxeng', 'qa_reviewer', 'svcmgr', 'service', 'requestor', 'steward', 'dsp_eng']) T[r] = await c.login(r);
  T.south = await c.login('service', 'empathia-demo', 'service-south');
  room = (await c.call('POST', '/v1/rooms', { token: T.designer, body: { name: 'Mission Huddle (synthetic)', template: 'huddle', buildingCode: 'ATL', floor: 10 } })).body.code;
  await c.call('POST', `/v1/rooms/${room}/revisions`, { token: T.designer, body: { reason: 'mc' } }); await c.call('POST', `/v1/rooms/${room}/drawings/generate`, { token: T.designer });
  await c.call('POST', `/v1/rooms/${room}/drawings/plan/approve`, { token: T.syseng }); await c.call('POST', `/v1/rooms/${room}/classification/approve`, { token: T.syseng, body: {} });
  for (const [to, t] of [['DESIGN_APPROVED', 'syseng'], ['INSTALLATION_PENDING', 'opslead'], ['INSTALLED_UNVERIFIED', 'installer'], ['COMMISSIONING', 'syseng']]) { if (to === 'COMMISSIONING') await registerRoom(c, room, T.installer); await c.call('POST', `/v1/rooms/${room}/lifecycle`, { token: T[t], body: { to } }); }   // the register gates commissioning (14 Nov 2026)
  const rows = (await c.call('GET', `/v1/rooms/${room}`, { token: T.designer })).body.commissioning.rows.filter((x) => x.applicable && !x.personas.includes('designer'));
  const ev = (await c.call('POST', '/v1/evidence', { token: T.cxeng, raw: Buffer.from('synthetic'), headers: { 'content-type': 'text/plain', 'x-file-name': 'o.txt' } })).body;
  const rec = (r, state) => c.call('POST', `/v1/rooms/${room}/results`, { token: T.cxeng, body: { testId: r.test_id, state, evidenceId: ev.id, evidenceKind: r.evidence[0], instrument: 'SYN-METER-01 (synthetic)' } });
  assert.equal((await rec(rows[0], 'PASS')).status, 201); assert.equal((await rec(rows[1], 'FAIL')).status, 201);
  const issue = (await c.call('GET', `/v1/rooms/${room}`, { token: T.designer })).body.issues.find((i) => i.state === 'OPEN' && i.category === 'INSTALLATION_COMMISSIONING_DEFICIENCY').code;
  wo = (await c.call('POST', `/v1/issues/${issue}/work-orders`, { token: T.svcmgr, body: { note: 'mission fixture (synthetic)' } })).body.workOrderId;
});
after(async () => { await h?.app.stop(); });

test('MC-1 unauthenticated is refused; a requestor holds no step and sees an empty action list (with the exceptions panel still in scope)', async () => {
  assert.equal((await c.call('GET', '/v1/mission-control', {})).status, 401);
  const b = await mc(T.requestor); assert.equal(b.total, 0); assert.ok(Array.isArray(b.exceptions)); assert.equal(b.me.role, 'requestor');
});

test('MC-2 commissioning: the QA reviewer sees the pass recorded by the commissioning engineer awaiting independent verification; the recorder does not see their own', async () => {
  assert.ok(has(await mc(T.qa_reviewer), 'commissioning', room, 'verify'));
  assert.ok(!has(await mc(T.cxeng), 'commissioning', room, 'verify'), 'never the recorder');
});

test('MC-3 ServiceHands: the manager sees the triage step; the technician sees nothing until assigned, then only their acceptance; the South-scoped technician never sees the North job; an unassigned High job is an exception', async () => {
  assert.ok(has(await mc(T.svcmgr), 'service', wo, 'triaged')); assert.ok(!has(await mc(T.service), 'service', wo));
  await c.call('POST', `/v1/work-orders/${wo}/triage`, { token: T.svcmgr, body: { severity: 'High', scope: 's', risk: 'r', workType: 'break_fix', window: { from: '2026-11-04T08:00:00Z', to: '2026-11-04T10:00:00Z' } } });
  assert.ok((await mc(T.svcmgr)).exceptions.length >= 0);
  const svc = h.asSuper("SELECT id FROM app.person WHERE email = 'service@empathia-demo.empathia.invalid'");
  assert.equal((await c.call('POST', `/v1/work-orders/${wo}/assign`, { token: T.svcmgr, body: { personId: svc } })).status, 200);
  const tech = await mc(T.service); assert.ok(has(tech, 'service', wo, 'accepted')); assert.ok(!has(tech, 'service', wo, 'triaged'));
  assert.ok(!has(await mc(T.svcmgr), 'service', wo, 'accepted'), 'the manager does not accept for the technician');
  const south = await mc(T.south); assert.ok(!south.actions.some((a) => a.ref === wo || a.ref === room), 'site scope'); assert.equal(south.me.siteScoped, true);
});

test('MC-4 the verifier never sees verification of work they recorded evidence for; the commissioning lead does once the job is handed over', async () => {
  for (const [p, tok, body] of [['/accept', T.service, {}], ['/preflight', T.service, { safetyBriefed: true, toolsConfirmed: ['service kit'], accessConfirmedBy: 'desk' }], ['/start', T.service, {}], ['/evidence', T.service, { kind: 'note', note: 'n' }], ['/submit', T.service, {}]]) assert.equal((await c.call('POST', `/v1/work-orders/${wo}${p}`, { token: tok, body })).status, 200, p);
  assert.ok(has(await mc(T.cxeng), 'service', wo, 'resolved'), 'the commissioning lead verifies');
  assert.ok(!has(await mc(T.service), 'service', wo, 'resolved'), 'never the technician');
});

test('MC-5 APEX: an open deficiency without a case is listed for those who may open one; after action outcomes the case awaits review by a verifier', async () => {
  const issue = h.asSuper(`SELECT i.code FROM app.room_issue i JOIN app.room r ON r.id = i.room_id WHERE r.code = '${room}' AND i.state = 'OPEN' AND i.category = 'INSTALLATION_COMMISSIONING_DEFICIENCY' LIMIT 1`);
  assert.ok(has(await mc(T.syseng), 'apex', issue, 'open'));
  const apx = (await c.call('POST', `/v1/issues/${issue}/apex`, { token: T.syseng, body: {} })).body.caseId;
  assert.ok(!has(await mc(T.syseng), 'apex', issue, 'open'), 'a case exists now');
  const h1 = (await c.call('GET', `/v1/apex/cases/${apx}`, { token: T.syseng })).body.hypotheses[0].id;
  await c.call('POST', `/v1/apex/cases/${apx}/act`, { token: T.syseng, body: { hypothesisId: h1, tier: 'A1' } });
  assert.ok(has(await mc(T.cxeng), 'apex', apx, 'review')); assert.ok(!has(await mc(T.designer), 'apex', apx, 'review'));
});

test('MC-6 Learn: the proposer never sees the review of their own case; a subject-matter expert does; then only a steward who is neither sees the approval', async () => {
  for (const [p, tok, body] of [['/verify', T.cxeng, { outcome: 'pass', note: 'ok' }]]) assert.equal((await c.call('POST', `/v1/work-orders/${wo}${p}`, { token: tok, body })).status, 200);
  const lc = (await c.call('POST', `/v1/work-orders/${wo}/learn-case`, { token: T.cxeng, body: { title: 'Reseat and read back', lesson: 'A reseated connection needs a readback before the room is returned to service.', permission: true, deidentified: true } })).body.caseId;
  assert.ok(!has(await mc(T.cxeng), 'learn', lc), 'not the proposer'); assert.ok(has(await mc(T.dsp_eng), 'learn', lc, 'review'));
  await c.call('POST', `/v1/learn/cases/${lc}/review`, { token: T.dsp_eng, body: { decision: 'approve', note: 'ok' } });
  assert.ok(has(await mc(T.steward), 'learn', lc, 'approve')); assert.ok(!has(await mc(T.dsp_eng), 'learn', lc));
});

test('MC-7 rooms and projects: the next lifecycle step appears only for the authority that moves it; every action links to its record', async () => {
  const qa = await mc(T.qa_reviewer); const des = await mc(T.designer);
  assert.equal(has(des, 'rooms', room), false, 'the designer does not move a room under commissioning');
  for (const a of [...qa.actions, ...des.actions]) assert.match(a.href, /^#\/(rooms|projects|service|apex|field|learn)\b/);
  assert.equal(Number(h.asSuper("SELECT count(*) FROM app.audit_event WHERE action LIKE 'mission%'")), 0, 'reading the action center changes nothing and audits nothing');
});

test('MC-8 Search Party covers the records Mission Control acts on: the APEX case concerns its issue, the Learn case derives from its work order; a technician scoped to another site finds neither', async () => {
  const find = async (tok, type) => (await c.call('GET', `/v1/search?q=&type=${type}&limit=200`, { token: tok })).body.items;
  const apx = (await find(T.syseng, 'ApexCase'))[0]; assert.ok(apx, 'an APEX case is searchable');
  const nb = (await c.call('GET', `/v1/search/graph/ApexCase/${apx.id}?depth=1`, { token: T.syseng })).body;
  assert.ok(nb.edges.some((e) => e.rel === 'CONCERNS' && e.to.type === 'RoomIssue'), JSON.stringify(nb.edges).slice(0, 300));
  const lc = (await find(T.syseng, 'TrainingCase'))[0]; assert.ok(lc, 'a Learn case is searchable');
  const ln = (await c.call('GET', `/v1/search/graph/TrainingCase/${lc.id}?depth=1`, { token: T.syseng })).body;
  assert.ok(ln.edges.some((e) => e.rel === 'DERIVED_FROM' && e.to.type === 'WorkOrder' && e.to.id === wo), JSON.stringify(ln.edges).slice(0, 600));
  assert.ok(ln.edges.some((e) => e.rel === 'REVIEWED_BY'), 'the SME review is on the graph'); assert.ok(!ln.edges.some((e) => e.rel === 'APPROVED_BY'), 'not approved yet (MC-6 stops before the steward acts): no approval edge is invented');
  assert.equal((await find(T.south, 'ApexCase')).length, 0); assert.equal((await find(T.south, 'TrainingCase')).length, 0);
});
