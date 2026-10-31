/**
 * The governed project lifecycle (ADR-0008, P5) over real HTTP and a real database: intake → review → brief → approval → collaborative
 * design → execution/handoff → operational transition. One request is carried the whole way; every gate is tried the wrong way first.
 *   - intake: the nine types; a request without intent is refused by the guard; only the requester submits; submission creates the project
 *   - review: an internal route needs a documented exception; the routed supplier (and only it) may acknowledge
 *   - brief: versioned against the scope revision; the brief’s author cannot be selected as approver; the selector cannot select themself
 *   - approval: only the selected approver (or a valid delegate) decides, and only the current scope revision; a hold needs a reason and
 *     a review date; funding must name the approved scope revision; a finance outage never auto-approves; a withdrawal suspends;
 *     a scope revision reopens with a new approval chain and the history intact
 *   - collaborative design: a revision needs files/model + DIVR + reason; a domain review is never by the author; an open RFI blocks the
 *     release; the author never releases; geometry must be approved for construction (the room’s own lifecycle)
 *   - execution/handoff: the rule pack version is pinned from the engine; the work order is accepted by its assigned technician only;
 *     TESTS_VERIFIED is refused until every applicable test is independently verified (read from the rooms); documents and photos; the
 *     customer acceptance; handoff needs a support owner; BASELINED needs every room’s current baseline
 *   - operational transition: the rooms stay ACCEPTED (OPERATIONAL needs live monitoring evidence that does not exist) — refused honestly
 *   - isolation: a second tenant cannot see the project; a site-scoped technician outside the site gets 404
 *   node --test tests/security/project-lifecycle.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client, DEV_PASSWORD } from '../integration/harness.mjs';

let h, c, T = {}, ids = {}, req, prj, room, evidence;
const instrument = 'SYN-METER-01 (synthetic), calibration record SYN-CAL-2026-09';
const get = (tok = T.opslead) => c.call('GET', `/v1/projects/${prj}`, { token: tok });
const deliver = (to, tok, extra = {}) => c.call('POST', `/v1/projects/${prj}/delivery`, { token: tok, body: { to, ...extra } });
const moveRoom = (to, tok) => c.call('POST', `/v1/rooms/${room}/lifecycle`, { token: tok, body: { to } });
const fresh = async (role) => (await c.call('POST', '/v1/auth/token', { body: { email: `${role}@empathia-demo.empathia.invalid`, password: DEV_PASSWORD, tenant: 'empathia-demo', role } })).body.accessToken;
const audit = async (pred) => (await c.call('GET', '/v1/audit?limit=300', { token: T.secadmin })).body.items.find(pred);

before(async () => {
  h = await setup({ db: 'empathia_test_projects', port: 4198 }); c = client(h.base);
  for (const r of ['requestor', 'opslead', 'syseng', 'exec', 'finance', 'designer', 'dsp_eng', 'video_eng', 'svcmgr', 'service', 'installer', 'cxeng', 'qa_reviewer', 'secadmin', 'steward']) T[r] = await c.login(r);
  for (const r of ['requestor', 'opslead', 'exec', 'finance', 'designer', 'service', 'qa_reviewer']) ids[r] = h.asSuper(`SELECT id FROM app.person WHERE email = '${r.replace(/_/g, '-')}@empathia-demo.empathia.invalid'`);
  // a supplier contact (vendor.acknowledge) is not among the seeded demo logins: one is added as a test fixture with a scoped membership
  h.asSuper(`INSERT INTO app.person (email, display_name, password_hash) SELECT 'vendor@empathia-demo.empathia.invalid', 'Supplier contact (synthetic)', password_hash FROM app.person WHERE email = 'requestor@empathia-demo.empathia.invalid' ON CONFLICT (email) DO NOTHING`);
  h.asSuper(`INSERT INTO app.membership (tenant_id, person_id, role_key) SELECT t.id, p.id, 'vendor' FROM app.tenant t, app.person p WHERE t.slug = 'empathia-demo' AND p.email = 'vendor@empathia-demo.empathia.invalid' ON CONFLICT DO NOTHING`);
  // likewise a business project manager (scope.revise), the only persona that reopens a held project
  h.asSuper(`INSERT INTO app.person (email, display_name, password_hash) SELECT 'bpm@empathia-demo.empathia.invalid', 'Business Project Manager (synthetic)', password_hash FROM app.person WHERE email = 'requestor@empathia-demo.empathia.invalid' ON CONFLICT (email) DO NOTHING`);
  h.asSuper(`INSERT INTO app.membership (tenant_id, person_id, role_key) SELECT t.id, p.id, 'bpm' FROM app.tenant t, app.person p WHERE t.slug = 'empathia-demo' AND p.email = 'bpm@empathia-demo.empathia.invalid' ON CONFLICT DO NOTHING`);
  T.vendor = await c.login('vendor'); T.bpm = await c.login('bpm');
  T.south = await c.login('service', 'empathia-demo', 'service-south');
  T.second = await c.login('syseng', 'second-tenant');
  const up = await c.call('POST', '/v1/evidence', { token: T.cxeng, raw: Buffer.from('synthetic project observation'), headers: { 'content-type': 'text/plain', 'x-file-name': 'prj.txt' } });
  assert.equal(up.status, 201); evidence = up.body;
});
after(async () => { await h?.app.stop(); });

test('INT-1 — the catalogue carries nine request types and the two demonstrator machines; a request without intent is refused by the guard, with the refusal audited', async () => {
  const cat = await c.call('GET', '/v1/projects/catalogue', { token: T.requestor });
  assert.equal(cat.status, 200); assert.equal(cat.body.requestTypes.length, 9); assert.equal(cat.body.governance.length, 11); assert.equal(cat.body.delivery.length, 11);
  const bad = await c.call('POST', '/v1/requests', { token: T.requestor, body: { type: 'new_room', title: 'Huddle for the north team (synthetic)', intent: '', siteCode: 'SITE-NORTH', buildingCode: 'NST', provisionalRoom: 'Northstar 2 · new huddle', photoPolicy: 'LOCATION_VERIFICATION_REQUIRED' }, headers: { 'idempotency-key': 'req-0001' } });
  assert.equal(bad.status, 201);
  const sub = await c.call('POST', `/v1/requests/${bad.body.code}/submit`, { token: T.requestor });
  assert.equal(sub.status, 422, JSON.stringify(sub.body)); assert.deepEqual(sub.body.reasons, ['usage intent missing', 'photos required by the owner policy']);
  assert.ok(await audit((e) => e.outcome === 'DENIED' && e.action === 'request.submit' && e.aggregate_id === bad.body.code), 'the guard refusal is audited');
  const unknown = await c.call('POST', '/v1/requests', { token: T.requestor, body: { type: 'something_else', title: 'x', intent: 'x', siteCode: 'SITE-NORTH' } });
  assert.equal(unknown.status, 400);
});

test('INT-2 — a valid request with dimensions that carry provenance is submitted by its requester only; submission creates the project in SUBMITTED and emits request.submitted', async () => {
  const r = await c.call('POST', '/v1/requests', { token: T.requestor, body: { type: 'new_room', title: 'Northstar 2 huddle (synthetic)', intent: 'Four people meet with two remote colleagues; the room must be bookable and simple.', constraints: 'No construction before the quarter closes.', siteCode: 'SITE-NORTH', buildingCode: 'NST', provisionalRoom: 'Northstar 2 · new huddle', archetype: 'HUD', capacity: 4, dimensions: [{ name: 'length', value: 4.2, unit: 'm', source: 'MANUALLY_PROPOSED', uncertainty: '±0.2 m' }], plans: [{ name: 'nst-2-plan.pdf' }] }, headers: { 'idempotency-key': 'req-0002' } });
  assert.equal(r.status, 201, JSON.stringify(r.body)); req = r.body.code; assert.match(req, /^REQ-\d{4}$/);
  const guessed = await c.call('POST', '/v1/requests', { token: T.requestor, body: { type: 'room_refresh', title: 'x', intent: 'y', siteCode: 'SITE-NORTH', dimensions: [{ name: 'width', value: 3, unit: 'm', source: '', uncertainty: '' }] } });
  assert.equal(guessed.status, 400, 'a dimension without source and uncertainty is not accepted');
  const notMine = await c.call('POST', `/v1/requests/${req}/submit`, { token: T.opslead });
  assert.equal(notMine.status, 403, 'submitting is request.submit (the requester role)');
  const sub = await c.call('POST', `/v1/requests/${req}/submit`, { token: T.requestor });
  assert.equal(sub.status, 200, JSON.stringify(sub.body)); prj = sub.body.project; assert.equal(prj, req.replace('REQ-', 'PRJ-REQ-'));
  const p = await get(); assert.equal(p.status, 200); assert.equal(p.body.governance, 'SUBMITTED'); assert.equal(p.body.stage.stage, 'review'); assert.equal(p.body.request.dimensions[0].uncertainty, '±0.2 m');
  const ev = h.asSuper(`SELECT count(*) FROM app.outbox_event WHERE type = 'request.submitted' AND aggregate_id = '${req}'`); assert.equal(Number(ev), 1);
  assert.equal((await c.call('GET', '/v1/requests', { token: T.requestor })).body.items.length, 2, 'the requester sees their own two requests');
  assert.equal((await c.call('GET', '/v1/requests', { token: T.exec })).body.items.length, 2);
});

test('REV-1 — review: an internal route needs a documented exception; a supplier who was not routed cannot acknowledge; the route is recorded by the operations lead', async () => {
  const short = await c.call('POST', `/v1/projects/${prj}/route`, { token: T.opslead, body: { route: 'internal', exceptionReason: 'short' } });
  assert.equal(short.status, 422); assert.match(JSON.stringify(short.body), /documented exception/);
  const notVendor = await c.call('POST', `/v1/projects/${prj}/route`, { token: T.vendor, body: { route: 'vendor' } });
  assert.equal(notVendor.status, 422, JSON.stringify(notVendor.body)); assert.match(JSON.stringify(notVendor.body), /not the vendor this request was sent to/);
  const ok = await c.call('POST', `/v1/projects/${prj}/route`, { token: T.opslead, body: { route: 'internal', exceptionReason: 'no framework supplier covers the north campus this quarter; in-house AV team delivers' } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body)); assert.equal(ok.body.governance, 'INTERNAL_ROUTE_RECORDED');
  const again = await c.call('POST', `/v1/projects/${prj}/route`, { token: T.opslead, body: { route: 'internal', exceptionReason: 'no framework supplier covers the north campus this quarter' } });
  assert.equal(again.status, 422, 'one governed step at a time');
});

test('REV-2 — a routed supplier acknowledges its own request (vendor_in_scope) on a second request', async () => {
  const r = await c.call('POST', '/v1/requests', { token: T.requestor, body: { type: 'camera_replacement', title: 'Atlas 4.218 camera (synthetic)', intent: 'Replace the failed camera with the standard model.', siteCode: 'SITE-NORTH', buildingCode: 'ATL', vendorEmail: 'vendor@empathia-demo.empathia.invalid' }, headers: { 'idempotency-key': 'req-0003' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const sub = await c.call('POST', `/v1/requests/${r.body.code}/submit`, { token: T.requestor }); assert.equal(sub.status, 200, JSON.stringify(sub.body));
  const ack = await c.call('POST', `/v1/projects/${sub.body.project}/route`, { token: T.vendor, body: { route: 'vendor' } });
  assert.equal(ack.status, 200, JSON.stringify(ack.body)); assert.equal(ack.body.governance, 'VENDOR_ACKNOWLEDGED');
  const wd = await c.call('POST', `/v1/requests/${r.body.code}/withdraw`, { token: T.requestor, body: { reason: 'the camera started working again (synthetic)' } });
  assert.equal(wd.status, 200, JSON.stringify(wd.body)); assert.equal(wd.body.state, 'WITHDRAWN');
});

test('BRF-1 — the brief is versioned against the scope revision; selecting the approver: not the brief’s author, not yourself, and only someone who holds project.decide', async () => {
  const noBrief = await c.call('POST', `/v1/projects/${prj}/approver`, { token: T.opslead, body: { approverEmail: 'exec@empathia-demo.empathia.invalid' } });
  assert.equal(noBrief.status, 422); assert.match(JSON.stringify(noBrief.body), /one governed step|PITCH_READY|no transition/);
  const b = await c.call('POST', `/v1/projects/${prj}/brief`, { token: T.opslead, body: { summary: 'A four-seat huddle room on Northstar 2 with one display, a video bar and a scheduling panel.', requirements: ['Video call with two remote participants', 'Bookable from the calendar', 'Wireless presentation'], assumptions: ['Existing network drop within 5 m'], romUsd: 18000, comparableRooms: ['R-NST-2-101'] } });
  assert.equal(b.status, 201, JSON.stringify(b.body)); assert.equal(b.body.briefRev, 1); assert.equal(b.body.scopeRev, 1); assert.equal(b.body.governance, 'PITCH_READY');
  assert.equal((await get()).body.briefs[0].content.romLabel, 'INITIAL_ROM (before design; not a quote)');
  const self = await c.call('POST', `/v1/projects/${prj}/approver`, { token: T.opslead, body: { approverEmail: 'opslead@empathia-demo.empathia.invalid' } });
  assert.equal(self.status, 422); assert.match(JSON.stringify(self.body), /author of the brief|select themself/);
  const notEligible = await c.call('POST', `/v1/projects/${prj}/approver`, { token: T.opslead, body: { approverEmail: 'designer@empathia-demo.empathia.invalid' } });
  assert.equal(notEligible.status, 422); assert.match(JSON.stringify(notEligible.body), /not an eligible approver/);
  const ok = await c.call('POST', `/v1/projects/${prj}/approver`, { token: T.opslead, body: { approverEmail: 'exec@empathia-demo.empathia.invalid' } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body)); assert.equal(ok.body.governance, 'DECISION_PENDING');
});

test('APR-1 — the decision: the wrong scope revision is refused; a hold needs a reason and a review date; a hold is reopened by a scope revision (new chain, history kept); the delegate decides only through a valid delegation', async () => {
  const wrongRev = await c.call('POST', `/v1/projects/${prj}/decision`, { token: T.exec, body: { decision: 'APPROVED', scopeRev: 2 } });
  assert.equal(wrongRev.status, 422); assert.match(JSON.stringify(wrongRev.body), /different scope revision/);
  const holdBad = await c.call('POST', `/v1/projects/${prj}/decision`, { token: T.exec, body: { decision: 'HELD', scopeRev: 1, reason: 'later' } });
  assert.equal(holdBad.status, 422); assert.match(JSON.stringify(holdBad.body), /hold needs a reason/); assert.match(JSON.stringify(holdBad.body), /review date/);
  const hold = await c.call('POST', `/v1/projects/${prj}/decision`, { token: T.exec, body: { decision: 'HELD', scopeRev: 1, reason: 'wait for the quarter close before committing capital', reviewDate: '2026-12-01' } });
  assert.equal(hold.status, 200, JSON.stringify(hold.body)); assert.equal(hold.body.governance, 'HELD');
  const noFund = await c.call('POST', `/v1/projects/${prj}/funding`, { token: T.finance, body: { amount: 18000, currency: 'USD', costCenter: 'CC-AV-01', scopeRev: 1 } });
  assert.equal(noFund.status, 422, 'a held project is not funded');
  // reopen: a new scope revision returns the project to its route; the first brief and the hold stay in the record
  const scope = await c.call('POST', `/v1/projects/${prj}/scope`, { token: T.opslead, body: { reason: 'scope revised: one display instead of two' } });
  assert.equal(scope.status, 403, 'scope.revise is the business project manager’s, not the operations lead’s');
  const scope2 = await c.call('POST', `/v1/projects/${prj}/scope`, { token: T.bpm, body: { reason: 'scope revised: one display instead of two' } });
  assert.equal(scope2.status, 200, JSON.stringify(scope2.body)); assert.equal(scope2.body.scopeRev, 2); assert.equal(scope2.body.governance, 'INTERNAL_ROUTE_RECORDED');
  const stale = await c.call('POST', `/v1/projects/${prj}/approver`, { token: T.opslead, body: { approverEmail: 'exec@empathia-demo.empathia.invalid' } });
  assert.equal(stale.status, 422, 'the old brief (scope rev 1) does not carry scope rev 2');
  const b2 = await c.call('POST', `/v1/projects/${prj}/brief`, { token: T.opslead, body: { summary: 'Revised: a four-seat huddle room on Northstar 2 with one display, a video bar and a scheduling panel.', requirements: ['Video call with two remote participants', 'Bookable from the calendar'], romUsd: 15000 } });
  assert.equal(b2.status, 201, JSON.stringify(b2.body)); assert.equal(b2.body.briefRev, 2); assert.equal(b2.body.scopeRev, 2);
  assert.equal((await c.call('POST', `/v1/projects/${prj}/approver`, { token: T.opslead, body: { approverEmail: 'exec@empathia-demo.empathia.invalid' } })).status, 200);
  const rec = (await get()).body; assert.equal(rec.briefs.length, 2); assert.equal(rec.decisions.length, 1); assert.equal(rec.decisions[0].decision, 'HELD');
  // a delegate: the executive lends project.decide to the finance lead for a day; finance decides, audited as delegated
  const del = await c.call('POST', '/v1/delegations', { token: T.exec, body: { granteeId: ids.finance, authority: 'project.decide', reason: 'synthetic: executive travelling', days: 1 }, headers: { 'idempotency-key': 'del-prj-0001' } });
  assert.equal(del.status, 201, JSON.stringify(del.body));
  const byDelegate = await c.call('POST', `/v1/projects/${prj}/decision`, { token: await fresh('finance'), body: { decision: 'APPROVED', scopeRev: 2 } });   // a fresh token carries the delegation
  assert.equal(byDelegate.status, 200, JSON.stringify(byDelegate.body)); assert.equal(byDelegate.body.delegated, true); assert.equal(byDelegate.body.governance, 'APPROVED');
  assert.ok(await audit((e) => e.action === 'project.decide' && e.outcome === 'ALLOWED' && e.actor_role === 'finance' && e.detail && e.detail.delegated === true), 'the delegated decision is audited as delegated');
});

test('APR-2 — funding names the approved scope revision; a finance outage keeps it pending; funded opens delivery at ENGINEERING_REVIEW; withdrawal suspends', async () => {
  const outage = await c.call('POST', `/v1/projects/${prj}/funding`, { token: T.finance, body: { amount: 15000, currency: 'USD', costCenter: 'CC-AV-01', scopeRev: 2, financeOutage: true } });
  assert.equal(outage.status, 422); assert.match(JSON.stringify(outage.body), /never auto-approved/);
  const wrong = await c.call('POST', `/v1/projects/${prj}/funding`, { token: T.finance, body: { amount: 15000, currency: 'USD', costCenter: 'CC-AV-01', scopeRev: 1 } });
  assert.equal(wrong.status, 422); assert.match(JSON.stringify(wrong.body), /scope revision 1, the approved scope is 2/);
  const design = await deliver('DESIGN_DRAFT', T.syseng);
  assert.equal(design.status, 422); assert.match(JSON.stringify(design.body), /not FUNDED/);
  const ok = await c.call('POST', `/v1/projects/${prj}/funding`, { token: T.finance, body: { amount: 15000, currency: 'USD', costCenter: 'CC-AV-01', scopeRev: 2 } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body)); assert.equal(ok.body.governance, 'FUNDED'); assert.equal(ok.body.delivery, 'ENGINEERING_REVIEW');
  const byRequester = await c.call('POST', `/v1/requests/${req}/withdraw`, { token: T.requestor, body: { reason: 'changed my mind (synthetic)' } });
  assert.equal(byRequester.status, 422, 'a funded project is suspended by finance, not withdrawn by its requester');
});

test('DSN-1 — collaborative design: the room is created and put in the project; a revision needs files or a model, a DIVR and a reason; the review is never by the author; an open RFI and unapproved geometry block the release; the author never releases', async () => {
  const r = await c.call('POST', '/v1/rooms', { token: T.designer, body: { name: 'Northstar 2 huddle (synthetic)', template: 'huddle', buildingCode: 'NST', floor: 2 }, headers: { 'idempotency-key': 'prj-room-0001' } });
  assert.equal(r.status, 201, JSON.stringify(r.body)); room = r.body.code;
  assert.equal((await c.call('POST', `/v1/rooms/${room}/project`, { token: T.exec, body: { projectCode: prj } })).status, 200);
  assert.equal((await deliver('DESIGN_DRAFT', T.syseng)).status, 200);
  const thin = await c.call('POST', `/v1/projects/${prj}/design-revisions`, { token: T.designer, body: { reason: 'first layout' } });
  assert.equal(thin.status, 201, JSON.stringify(thin.body));
  const noDivr = await deliver('DESIGN_REVIEW', T.designer);
  assert.equal(noDivr.status, 422); assert.match(JSON.stringify(noDivr.body), /no design files or Lite model/); assert.match(JSON.stringify(noDivr.body), /Design Intent/);
  const rev = await c.call('POST', `/v1/projects/${prj}/design-revisions`, { token: T.designer, body: { reason: 'layout with the room model and the DIVR', liteModelRoom: room, files: [{ name: 'nst-2-huddle-layout.pdf', kind: 'layout' }], divr: { intent: 'Four seats facing one display; camera at eye height; speech intelligibility at every seat', verificationPlan: ['STI at each seat', 'camera framing at 4 seats'] }, domainsNeeded: ['dsp', 'camera'] } });
  assert.equal(rev.status, 201, JSON.stringify(rev.body)); assert.equal(rev.body.revision, 2);
  assert.equal((await deliver('DESIGN_REVIEW', T.designer)).status, 200);
  const selfReview = await c.call('POST', `/v1/projects/${prj}/design-revisions/2/review`, { token: T.designer, body: { domain: 'dsp', decision: 'APPROVED' } });
  assert.equal(selfReview.status, 403, 'review.dsp is the audio engineer’s');
  const dsp = await c.call('POST', `/v1/projects/${prj}/design-revisions/2/review`, { token: T.dsp_eng, body: { domain: 'dsp', decision: 'APPROVED', note: 'single bar; acceptable for four seats' } });
  assert.equal(dsp.status, 200, JSON.stringify(dsp.body));
  const rfi = await c.call('POST', `/v1/projects/${prj}/design-revisions/2/rfis`, { token: T.video_eng, body: { question: 'Is the display height compatible with the camera line of sight?' } });
  assert.equal(rfi.status, 201, JSON.stringify(rfi.body));
  const early = await deliver('DESIGN_RELEASED', T.syseng);
  assert.equal(early.status, 422, JSON.stringify(early.body)); const why = JSON.stringify(early.body);
  assert.match(why, /camera review missing/); assert.match(why, /1 open RFI/); assert.match(why, /not approved for construction/);
  const selfResolve = await c.call('POST', `/v1/projects/${prj}/rfis/${rfi.body.rfi}/resolve`, { token: T.video_eng, body: { answer: 'yes' } });
  assert.equal(selfResolve.status, 403, 'rfi.resolve is the systems engineer’s');
  assert.equal((await c.call('POST', `/v1/projects/${prj}/rfis/${rfi.body.rfi}/resolve`, { token: T.syseng, body: { answer: 'Yes: display centre at 1.35 m, camera on top edge at 1.75 m, within the archetype limit.' } })).status, 200);
  assert.equal((await c.call('POST', `/v1/projects/${prj}/design-revisions/2/review`, { token: T.video_eng, body: { domain: 'camera', decision: 'APPROVED' } })).status, 200);
  // the room's own design approval (geometry approved for construction) through the room lifecycle
  assert.equal((await c.call('POST', `/v1/rooms/${room}/devices`, { token: T.designer, body: { category: 'display', x: 1, y: 1, mount: 'wall' } })).status, 201);
  assert.equal((await c.call('POST', `/v1/rooms/${room}/revisions`, { token: T.designer, body: { reason: 'synthetic: the designed layout' } })).status, 201);
  assert.equal((await c.call('POST', `/v1/rooms/${room}/classification/approve`, { token: T.syseng, body: {} })).status, 200);
  assert.equal((await moveRoom('DESIGN_APPROVED', T.syseng)).status, 200);
  const released = await deliver('DESIGN_RELEASED', T.syseng);
  assert.equal(released.status, 200, JSON.stringify(released.body)); assert.equal(released.body.delivery, 'DESIGN_RELEASED');
  const rec = (await get()).body; assert.equal(rec.design.length, 2); assert.equal(rec.design[0].state, 'SUPERSEDED'); assert.equal(rec.design[1].state, 'RELEASED'); assert.equal(rec.design[1].reviews.length, 2); assert.equal(rec.design[1].rfis[0].resolvedBy, 'Systems Engineer (synthetic)');
});

test('EXE-1 — execution: the plan is compiled with the rule pack version pinned from the engine; the field authorization is the service manager’s attestation; the work order is accepted by its technician only; TESTS_VERIFIED is refused until the room’s own results say so', async () => {
  const plan = await deliver('PLAN_COMPILED', T.syseng);
  assert.equal(plan.status, 200, JSON.stringify(plan.body)); assert.match((await get()).body.rulePackVersion, /\S/);
  const noTech = await deliver('FIELD_AUTHORIZED', T.svcmgr, { technicianQualified: true, siteAccess: false });
  assert.equal(noTech.status, 422); assert.match(JSON.stringify(noTech.body), /site access is not confirmed/);
  assert.equal((await deliver('FIELD_AUTHORIZED', T.svcmgr, { technicianEmail: 'service@empathia-demo.empathia.invalid', technicianQualified: true, siteAccess: true })).status, 200);
  const wrongTech = await deliver('FIELD_ACTIVE', T.south);
  assert.ok([404, 422].includes(wrongTech.status), `${wrongTech.status}: the South-campus technician is outside the site (404) or not the assigned one (422)`);
  assert.equal((await deliver('FIELD_ACTIVE', T.service)).status, 200);
  const early = await deliver('TESTS_VERIFIED', T.cxeng);
  assert.equal(early.status, 422); assert.match(JSON.stringify(early.body), /0 of \d+ applicable tests/);
  // the room is installed and commissioned the governed way; every applicable test is recorded by cxeng and verified by QA
  assert.equal((await moveRoom('INSTALLATION_PENDING', T.opslead)).status, 200);
  assert.equal((await moveRoom('INSTALLED_UNVERIFIED', T.installer)).status, 200);
  assert.equal((await moveRoom('COMMISSIONING', T.syseng)).status, 200);
  const rows = (await c.call('GET', `/v1/rooms/${room}`, { token: T.designer })).body.commissioning.rows.filter((x) => x.applicable);
  for (const t of rows) {
    const rec = await c.call('POST', `/v1/rooms/${room}/results`, { token: T.cxeng, body: { testId: t.test_id, state: 'PASS', evidenceId: evidence.id, evidenceKind: t.evidence[0], instrument } }); assert.equal(rec.status, 201, JSON.stringify(rec.body));
    assert.equal((await c.call('POST', `/v1/rooms/${room}/results/${t.test_id}/verify`, { token: T.qa_reviewer })).status, 200);
  }
  const ok = await deliver('TESTS_VERIFIED', T.cxeng);
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
});

test('HND-1 — handoff: documents need approved drawings and the QA photo sign-off; customer acceptance is the room’s own; handoff needs a support owner; BASELINED needs the current baseline; the project closes', async () => {
  const noDocs = await deliver('DOCUMENTS_APPROVED', T.qa_reviewer, { photosApproved: true });
  assert.equal(noDocs.status, 422); assert.match(JSON.stringify(noDocs.body), /drawings not approved/);
  assert.equal((await c.call('POST', `/v1/rooms/${room}/drawings/generate`, { token: T.designer })).status, 200);
  const kinds = (await c.call('GET', `/v1/rooms/${room}`, { token: T.designer })).body.drawings.map((d) => d.kind);
  assert.equal((await c.call('POST', `/v1/rooms/${room}/drawings/${kinds[0]}/approve`, { token: T.syseng })).status, 200);
  assert.equal((await deliver('DOCUMENTS_APPROVED', T.qa_reviewer, { photosApproved: true })).status, 200);
  const notAccepted = await deliver('CUSTOMER_ACCEPTED', T.opslead);
  assert.equal(notAccepted.status, 403, 'customer.accept is the QA reviewer’s; the verifier of these results is refused by the room (SoD) — so the acceptance goes through a delegation');
  const sod = await deliver('CUSTOMER_ACCEPTED', T.qa_reviewer);
  assert.equal(sod.status, 422); assert.match(JSON.stringify(sod.body), /not ACCEPTED by the customer/);
  // the room is accepted by someone who neither recorded nor verified: QA lends customer.accept to the operations lead (ADR-0005)
  assert.equal((await c.call('POST', '/v1/delegations', { token: T.qa_reviewer, body: { granteeId: ids.opslead, authority: 'customer.accept', reason: 'synthetic: QA verified the results and cannot accept', days: 2 }, headers: { 'idempotency-key': 'del-prj-0002' } })).status, 201);
  const opsTok = await fresh('opslead');
  assert.equal((await moveRoom('ACCEPTED', opsTok)).status, 200);
  assert.equal((await deliver('CUSTOMER_ACCEPTED', opsTok)).status, 200);
  const noOwner = await deliver('HANDED_OFF', T.opslead);
  assert.equal(noOwner.status, 422); assert.match(JSON.stringify(noOwner.body), /no support owner/);
  assert.equal((await deliver('HANDED_OFF', T.opslead, { supportOwnerEmail: 'svcmgr@empathia-demo.empathia.invalid' })).status, 200);
  const bl = await deliver('BASELINED', T.syseng);
  assert.equal(bl.status, 200, JSON.stringify(bl.body)); assert.equal(bl.body.stage.stage, 'operational transition');
  const rec = (await get()).body; assert.equal(rec.state, 'CLOSED'); assert.equal(rec.rooms[0].hasBaseline, true); assert.equal(rec.supportOwner, 'Service Manager (synthetic)');
  assert.equal(Number(h.asSuper(`SELECT count(*) FROM app.outbox_event WHERE type = 'handoff.accepted' AND aggregate_id = '${prj}'`)), 1);
});

test('OPS-1 — operational transition stays honest: the room cannot become OPERATIONAL without live monitoring evidence, and the project says so', async () => {
  const op = await moveRoom('OPERATIONAL', T.opslead);
  assert.equal(op.status, 422); assert.match(JSON.stringify(op.body), /live monitoring evidence/);
  const readiness = await c.call('GET', `/v1/rooms/${room}/readiness`, { token: T.designer });
  assert.equal(readiness.body.liveHealth, 'NOT_MONITORED');
});

test('ISO-1 — a second tenant cannot see the project or the request; a site-scoped technician outside the site gets 404; the record carries the whole audit trail', async () => {
  assert.equal((await get(T.second)).status, 404);
  assert.equal((await c.call('GET', `/v1/requests`, { token: T.second })).body.items.length, 0);
  assert.equal((await get(T.south)).status, 404);
  const rec = (await get()).body;
  assert.ok(rec.audit.some((e) => e.outcome === 'DENIED') && rec.audit.some((e) => e.outcome === 'ALLOWED'), 'refusals and allowed steps are both in the trail');
  assert.ok(rec.audit.length >= 15, `${rec.audit.length} audit rows`);
});
