/**
 * Empathia Learn and SIGNAL (P8) through the real API: the library served in sections; a reviewed case written from a resolved work
 * order with the customer's permission, de-identified against the organization's own names (the API checks), SME review by someone
 * other than the proposer, the steward's approval by someone who is neither; training records that never grant authority.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client } from '../integration/harness.mjs';

let h, c, wo, lc; const T = {};
before(async () => {
  h = await setup({ db: 'empathia_learn', port: 4184 });
  c = client(h.base);
  for (const r of ['designer', 'syseng', 'opslead', 'installer', 'cxeng', 'svcmgr', 'service', 'requestor', 'steward', 'dsp_eng']) T[r] = await c.login(r);
  // a resolved work order, the way ServiceHands makes one
  const room = (await c.call('POST', '/v1/rooms', { token: T.designer, body: { name: 'Learn Huddle (synthetic)', template: 'huddle', buildingCode: 'ATL', floor: 9 } })).body.code;
  await c.call('POST', `/v1/rooms/${room}/revisions`, { token: T.designer, body: { reason: 'learn' } }); await c.call('POST', `/v1/rooms/${room}/drawings/generate`, { token: T.designer });
  await c.call('POST', `/v1/rooms/${room}/drawings/plan/approve`, { token: T.syseng }); await c.call('POST', `/v1/rooms/${room}/classification/approve`, { token: T.syseng, body: {} });
  for (const [to, t] of [['DESIGN_APPROVED', 'syseng'], ['INSTALLATION_PENDING', 'opslead'], ['INSTALLED_UNVERIFIED', 'installer'], ['COMMISSIONING', 'syseng']]) await c.call('POST', `/v1/rooms/${room}/lifecycle`, { token: T[t], body: { to } });
  const row = (await c.call('GET', `/v1/rooms/${room}`, { token: T.designer })).body.commissioning.rows.find((x) => x.applicable);
  const ev = (await c.call('POST', '/v1/evidence', { token: T.cxeng, raw: Buffer.from('synthetic'), headers: { 'content-type': 'text/plain', 'x-file-name': 'o.txt' } })).body;
  await c.call('POST', `/v1/rooms/${room}/results`, { token: T.cxeng, body: { testId: row.test_id, state: 'FAIL', evidenceId: ev.id, evidenceKind: row.evidence[0], instrument: 'SYN-METER-01 (synthetic)' } });
  const issue = (await c.call('GET', `/v1/rooms/${room}`, { token: T.designer })).body.issues.find((i) => i.state === 'OPEN' && i.category === 'INSTALLATION_COMMISSIONING_DEFICIENCY').code;
  wo = (await c.call('POST', `/v1/issues/${issue}/work-orders`, { token: T.svcmgr, body: { note: 'learn fixture (synthetic)' } })).body.workOrderId;
});
after(async () => { await h?.app.stop(); });
const svcId = () => h.asSuper("SELECT id FROM app.person WHERE email = 'service@empathia-demo.empathia.invalid'");
const resolve = async () => {
  const steps = [['/triage', T.svcmgr, { severity: 'Standard', scope: 's', risk: 'r', workType: 'break_fix', window: { from: '2026-11-04T08:00:00Z', to: '2026-11-04T10:00:00Z' } }], ['/assign', T.svcmgr, { personId: svcId() }], ['/accept', T.service, {}], ['/preflight', T.service, { safetyBriefed: true, toolsConfirmed: ['service kit'], accessConfirmedBy: 'desk' }], ['/start', T.service, {}], ['/evidence', T.service, { kind: 'note', note: 'cable reseated' }], ['/submit', T.service, {}], ['/verify', T.cxeng, { outcome: 'pass', note: 'ok' }]];
  for (const [p, tok, body] of steps) { const r = await c.call('POST', `/v1/work-orders/${wo}${p}`, { token: tok, body }); assert.equal(r.status, 200, `${p}: ${JSON.stringify(r.body)}`); }
};

test('LRN-1 the SIGNAL library is served in sections: the index is small and counts the whole library; a lesson carries its check; drills, canon and reference resolve; unknown ids are 404', async () => {
  const i = await c.call('GET', '/v1/learn/library', { token: T.requestor }); assert.equal(i.status, 200);
  assert.equal(i.body.counts.lessons, 161); assert.equal(i.body.counts.drills, 146); assert.equal(i.body.counts.canon, 62); assert.equal(i.body.counts.formulas, 125); assert.equal(i.body.counts.glossary, 522);
  assert.ok(JSON.stringify(i.body).length < 120000, 'the index is the small part'); assert.ok(i.body.lessons.every((l) => l.cards === undefined));
  const l = await c.call('GET', `/v1/learn/lessons/${i.body.lessons[0].id}`, { token: T.requestor }); assert.equal(l.status, 200); assert.ok(l.body.cards.length > 0); assert.ok(l.body.quiz === null || l.body.quiz.qs.length > 0);
  const d = await c.call('GET', `/v1/learn/drills/${i.body.drills[0].id}`, { token: T.requestor }); assert.equal(d.status, 200); assert.ok(['route', 'firstfail', 'clues', 'classmatch', 'order', 'triage'].includes(d.body.type));
  assert.equal((await c.call('GET', `/v1/learn/canon/${i.body.canon[0].id}`, { token: T.requestor })).status, 200);
  const r = await c.call('GET', '/v1/learn/reference', { token: T.requestor }); assert.equal(r.body.glossary.length, 522);
  assert.equal((await c.call('GET', '/v1/learn/lessons/nope', { token: T.requestor })).status, 404);
  assert.equal((await c.call('GET', '/v1/learn/library', {})).status, 401);
});

test('LRN-2 a case cannot be proposed from an OPEN work order, without permission, without the de-identification declaration, or with the organization’s own names in the text (checked, with the names returned); a requestor lacks the authority', async () => {
  const body = { title: 'Echo after a DSP preset change', lesson: 'When a preset is re-stored, the AEC reference routing must be re-checked before the room is returned.', permission: true, deidentified: true };
  assert.equal((await c.call('POST', `/v1/work-orders/${wo}/learn-case`, { token: T.requestor, body })).status, 403);
  const open = await c.call('POST', `/v1/work-orders/${wo}/learn-case`, { token: T.cxeng, body }); assert.equal(open.status, 422); assert.match(open.body.detail, /RESOLVED or CLOSED/);
  await resolve();
  const noPerm = await c.call('POST', `/v1/work-orders/${wo}/learn-case`, { token: T.cxeng, body: { ...body, permission: false, deidentified: false } }); assert.equal(noPerm.status, 422);
  assert.ok(noPerm.body.reasons.some((x) => /customer permission/.test(x)) && noPerm.body.reasons.some((x) => /de-identified/.test(x)), JSON.stringify(noPerm.body.reasons));
  const named = await c.call('POST', `/v1/work-orders/${wo}/learn-case`, { token: T.cxeng, body: { ...body, lesson: 'In the Learn Huddle at Atlas Tower the technician Service Technician found the cable loose.' } });
  assert.equal(named.status, 422); const why = named.body.reasons.find((x) => /still names/.test(x)); assert.ok(why && /Learn Huddle|Atlas|Service Technician/.test(why), JSON.stringify(named.body.reasons));
});

test('LRN-3 the commissioning lead proposes; the same person cannot review it (separation of duties); the DSP engineer reviews; the reviewer cannot approve as steward; the steward approves and the event is emitted; a second case for the same work order is refused', async () => {
  const body = { title: 'Echo after a DSP preset change', lesson: 'When a preset is re-stored, the AEC reference routing must be re-checked before the room is returned.', permission: true, permissionNote: 'customer e-mail on file (synthetic)', deidentified: true };
  const r = await c.call('POST', `/v1/work-orders/${wo}/learn-case`, { token: T.cxeng, body }); assert.equal(r.status, 201, JSON.stringify(r.body)); lc = r.body.caseId; assert.match(lc, /^LC-\d{4}$/);
  assert.equal((await c.call('POST', `/v1/work-orders/${wo}/learn-case`, { token: T.cxeng, body })).status, 422, 'one case per work order');
  const self = await c.call('POST', `/v1/learn/cases/${lc}/review`, { token: T.cxeng, body: { decision: 'approve', note: 'mine' } }); assert.equal(self.status, 422); assert.match(self.body.detail, /separation of duties/);
  assert.equal((await c.call('POST', `/v1/learn/cases/${lc}/review`, { token: T.service, body: { decision: 'approve' } })).status, 403, 'a technician is not a subject-matter reviewer');
  const list = (await c.call('GET', '/v1/learn/cases', { token: T.dsp_eng })).body; const mine = list.items.find((x) => x.code === lc); assert.equal(mine.yours.review, true); assert.equal((await c.call('GET', '/v1/learn/cases', { token: T.cxeng })).body.items.find((x) => x.code === lc).yours.review, false);
  const rev = await c.call('POST', `/v1/learn/cases/${lc}/review`, { token: T.dsp_eng, body: { decision: 'approve', note: 'correct and useful' } }); assert.equal(rev.status, 200); assert.equal(rev.body.state, 'SME_REVIEWED');
  assert.equal((await c.call('POST', `/v1/learn/cases/${lc}/approve`, { token: T.dsp_eng })).status, 403, 'the DSP engineer holds no case.approve');
  const sw = await c.call('GET', '/v1/learn/cases', { token: T.steward }); assert.equal(sw.body.items.find((x) => x.code === lc).yours.approve, true);
  const ok = await c.call('POST', `/v1/learn/cases/${lc}/approve`, { token: T.steward }); assert.equal(ok.status, 200, JSON.stringify(ok.body)); assert.equal(ok.body.state, 'APPROVED');
  assert.equal(h.asSuper(`SELECT count(*) FROM app.outbox_event WHERE type = 'training.case_approved' AND aggregate_id = '${lc}'`), '1');
  assert.equal((await c.call('POST', `/v1/learn/cases/${lc}/approve`, { token: T.steward })).status, 422, 'not twice');
});

test('LRN-4 training is recorded per person, append-only, and the record says it never grants authority; a record for an unknown drill is refused; people see only their own', async () => {
  const idx = (await c.call('GET', '/v1/learn/library', { token: T.service })).body;
  const r = await c.call('POST', '/v1/learn/training', { token: T.service, body: { kind: 'drill', itemId: idx.drills[0].id, correct: true, elapsedS: 41 } }); assert.equal(r.status, 201); assert.match(r.body.note, /never grants work authorization/);
  assert.equal((await c.call('POST', '/v1/learn/training', { token: T.service, body: { kind: 'drill', itemId: 'nope', correct: true } })).status, 404);
  const lessonWithQuiz = idx.lessons.find((l) => l.quiz); const full = (await c.call('GET', `/v1/learn/lessons/${lessonWithQuiz.id}`, { token: T.service })).body;
  assert.equal((await c.call('POST', '/v1/learn/training', { token: T.service, body: { kind: 'quiz', itemId: full.quizId, score: 2, total: 3 } })).status, 201);
  const mine = (await c.call('GET', '/v1/learn/training', { token: T.service })).body; assert.equal(mine.items.length, 2);
  assert.equal((await c.call('GET', '/v1/learn/training', { token: T.cxeng })).body.items.length, 0, 'own records only');
  assert.throws(() => h.asSuper('DELETE FROM app.training_record'), /EM001|append-only|refuse/i);
  assert.equal(h.asSuper("SELECT count(*) FROM app.audit_event WHERE action = 'training.drill_completed'"), '1');
});
