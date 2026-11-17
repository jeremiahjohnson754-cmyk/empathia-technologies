/**
 * Demonstration sandboxes and sessions (ADR-0013; founder, 17 Nov 2026: "safe synthetic tenants, authenticated demo sessions, scoped
 * permissions, and a resettable demonstration dataset"; and 12 Nov: "negative authorization tests — especially ensuring that training
 * simulations can't modify real ServiceHands incidents or tenant data"). Everything here goes through the real API on a real database;
 * the "standard" tenants are the seeded synthetic ones, standing in for a customer's.
 *
 *   DS-01  off until the schema owner enables it: no sandbox opens, and the runtime role can neither read nor switch the setting
 *   DS-02  a sandbox opens with its scenario: one installed room, fifteen synthetic people, a key shown once and stored only as a hash
 *   DS-03  isolation: a sandbox reads and writes its own rows only — not a standard tenant's, not another sandbox's — and the reverse
 *   DS-04  the token boundary, both ways: no sign-in token reaches a sandbox, no demonstration token reaches a standard tenant, a
 *          demonstration token is not accepted under the sign-in secret, and a sandbox person cannot sign in with a password
 *   DS-05  the key is the credential: a wrong key, an unknown sandbox and a role the sandbox does not hold all get nothing
 *   DS-06  scoped permissions: a session may do what its role may do and no more; refusals are audited in the sandbox
 *   DS-07  the whole thread in a sandbox, by demonstration sessions only — the field record, the register, commissioning, service,
 *          acceptance, APEX — and the same thread on a session made later from the key
 *   DS-08  reset: the old sessions and the old key stop at once, the new sandbox is pristine, and nothing was deleted
 *   DS-09  expiry: an expired sandbox answers 401 to its sessions and to its key
 *   DS-10  caps: the live cap and the hourly cap per address refuse with 429; disabling stops new sandboxes and leaves live ones running
 *   DS-11  database guards: a sandbox takes no outside person, no privileged role and no invitation; its people join no other tenant
 *   DS-12  not a file store: uploads are short text notes; anything else, or anything long, is refused
 *   DS-13  the standard tenants hold exactly the rows they held before, and both audit chains verify
 *   DS-14  the demonstration deployment (AUTH_MODE=demo): sign-in tokens, the development sign-in and the public forms are all refused
 *          there; production needs its own secret; a deployment is the product or the demonstration, never both
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import { setup, client, DEV_PASSWORD, mail, registerRoom, repo } from '../integration/harness.mjs';

let h, c, A, B, std, demoApp, snapshot; const J = (x) => JSON.stringify(x);
const api = path.join(repo, 'services/enterprise-api/dist/src');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const n = (s) => Number(h.asSuper(s));
const open = async () => { const r = await c.call('POST', '/v1/demo/sandboxes', { body: {} }); assert.equal(r.status, 201, J(r.body)); return { ...r.body.sandbox, room: r.body.scenario.room, first: r.body.session.accessToken, raw: r.body }; };
const as = async (sb, role) => { const r = await c.call('POST', '/v1/demo/sessions', { body: { sandboxId: sb.id, key: sb.key, role } }); assert.equal(r.status, 200, `${role}: ${J(r.body)}`); return r.body.accessToken; };
const call = (token, method, p, o = {}) => c.call(method, p, { token, body: o.body, headers: o.headers, raw: o.raw });
const tenantOf = (slug) => h.asSuper(`SELECT id FROM app.tenant WHERE slug = '${slug}'`);
/** rows of the tenants that are not sandboxes, table by table: what a sandbox must never change */
const standardRows = () => Object.fromEntries(['room', 'planned_asset', 'room_issue', 'work_order', 'apex_case', 'assurance_baseline', 'test_result', 'evidence_object', 'membership', 'competency_record', 'audit_event']
  .map((t) => [t, n(`SELECT count(*) FROM app.${t} x WHERE NOT EXISTS (SELECT 1 FROM app.demo_sandbox s WHERE s.tenant_id = x.tenant_id)`)]));

before(async () => {
  h = await setup({ db: 'empathia_demo_sbx', port: 4172, env: { DEMO_SESSIONS: 'on' } }); c = client(h.base);
  std = { designer: await c.login('designer'), syseng: await c.login('syseng'), steward: await c.login('steward') };
  std.room = (await call(std.designer, 'POST', '/v1/rooms', { body: { name: 'Standard Huddle (synthetic)', template: 'huddle', buildingCode: 'ATL', floor: 3 } })).body.code;
});
after(async () => { await demoApp?.stop(); await h?.app.stop(); });

test('DS-01 off until the schema owner enables it; the runtime role can neither read nor switch the setting', async () => {
  const s = await c.call('GET', '/v1/demo'); assert.equal(s.status, 200); assert.equal(s.body.enabled, false); assert.match(s.body.reason, /not enabled for this database/);
  const r = await c.call('POST', '/v1/demo/sandboxes', { body: {} }); assert.equal(r.status, 404, J(r.body)); assert.equal(n('SELECT count(*) FROM app.demo_sandbox'), 0); assert.equal(n("SELECT count(*) FROM app.tenant WHERE slug LIKE 'sbx-%'"), 0);
  const k = await h.appConn();
  try {
    for (const q of ['SELECT * FROM app.demo_config', 'UPDATE app.demo_config SET enabled = true', 'SELECT * FROM app.demo_sandbox', "INSERT INTO app.tenant (slug, name) VALUES ('sbx-0000000000000000', 'forged')"])
      await assert.rejects(k.query(q), /permission denied/, q);
  } finally { await k.end(); }
  h.asSuper('UPDATE app.demo_config SET enabled = true');
  snapshot = standardRows();
  const on = (await c.call('GET', '/v1/demo')).body; assert.deepEqual([on.enabled, on.live, on.maxLive, on.ttlHours], [true, 0, 200, 72]); assert.ok(!on.roles.some((x) => ['architect', 'founder', 'secadmin'].includes(x)));
});

test('DS-02 a sandbox opens with its scenario; the key is shown once and stored only as a hash', async () => {
  A = await open(); B = await open();
  assert.match(A.key, /^[A-Za-z0-9_-]{43}$/); assert.match(A.tenant, /^sbx-[0-9a-f]{16}$/); assert.notEqual(A.tenant, B.tenant); assert.notEqual(A.key, B.key);
  assert.equal(h.asSuper(`SELECT key_hash FROM app.demo_sandbox WHERE id = '${A.id}'`), sha(A.key));
  assert.equal(n(`SELECT count(*) FROM app.demo_sandbox WHERE key_hash = '${A.key}' OR remote_hash LIKE '%127.0.0.1%'`), 0, 'neither the key nor the address is stored');
  assert.equal(A.raw.personas.length, 15); assert.ok(A.raw.personas.every((p) => / \(synthetic\)$/.test(p.name))); assert.match(A.raw.notice, /synthetic/);
  const me = await call(A.first, 'GET', '/v1/me'); assert.equal(me.status, 200, J(me.body)); assert.deepEqual([me.body.role, me.body.tenant], ['installer', A.tenant]);
  const cur = await call(A.first, 'GET', '/v1/demo/sandbox'); assert.equal(cur.status, 200, J(cur.body));
  assert.deepEqual(cur.body.rooms.map((r) => [r.code, r.lifecycle]), [[A.room, 'INSTALLED_UNVERIFIED']]); assert.equal(cur.body.sandbox.tenant, A.tenant);
  // the scenario has the history of a real room: designed, approved and installed by different people, each an audit row of this sandbox
  const who = h.asSuper(`SELECT string_agg(DISTINCT actor_role, ',' ORDER BY actor_role) FROM app.audit_event WHERE tenant_id = '${tenantOf(A.tenant)}' AND outcome = 'ALLOWED'`);
  for (const role of ['designer', 'installer', 'opslead', 'steward', 'svcmgr', 'syseng']) assert.ok(who.split(',').includes(role), `${role} in ${who}`);
  const t = await call(await as(A, 'syseng'), 'GET', `/v1/rooms/${A.room}/thread`); assert.equal(t.status, 200, J(t.body));
  const eng = t.body.stages.find((s) => s.key === 'engineering').records; assert.ok(eng.register.devices >= 3 && eng.register.complete < eng.register.devices, 'the register is the visitor’s to fill');
  assert.equal(n(`SELECT count(*) FROM app.person WHERE email LIKE '%@${A.tenant}.empathia.invalid' AND (password_hash IS NOT NULL OR external_subject IS NOT NULL)`), 0, 'sandbox people have no password and no provider subject');
  assert.equal(n(`SELECT count(*) FROM app.competency_record WHERE tenant_id = '${tenantOf(A.tenant)}' AND state = 'VERIFIED' AND recorded_by <> decided_by`), 3);
});

test('DS-03 isolation: a sandbox reads and writes its own rows only, and nobody else reads or writes them', async () => {
  const a = await as(A, 'designer'); const b = await as(B, 'designer'); const aSys = await as(A, 'syseng');
  assert.deepEqual((await call(a, 'GET', '/v1/rooms')).body.items.map((r) => r.code), [A.room]);
  // room codes are per tenant (two tenants may both have an R-…-0001), so every cross-tenant attempt names the other tenant's room by its uuid
  const idOf = async (token, code) => (await call(token, 'GET', `/v1/rooms/${code}`)).body.room.id;
  const ra = { id: await idOf(a, A.room) }; const rb = { id: await idOf(b, B.room) }; const rs = { id: await idOf(std.designer, std.room) };
  assert.equal(new Set([ra.id, rb.id, rs.id]).size, 3); assert.equal(A.room, B.room, 'the scenario is the same in every sandbox: the same code, two rooms');
  for (const [who, token, room] of [['sandbox A → the standard tenant', a, rs.id], ['sandbox A → sandbox B', a, rb.id], ['sandbox B → sandbox A', b, ra.id], ['the standard tenant → sandbox A', std.designer, ra.id]]) {
    assert.equal((await call(token, 'GET', `/v1/rooms/${room}`)).status, 404, who); assert.equal((await call(token, 'GET', `/v1/rooms/${room}/thread`)).status, 404, who);
    assert.equal((await call(token, 'POST', `/v1/rooms/${room}/devices`, { body: { category: 'micceil' } })).status, 404, who);
  }
  const before = n(`SELECT count(*) FROM app.planned_asset WHERE tenant_id = '${tenantOf(B.tenant)}'`);
  assert.equal((await call(aSys, 'POST', `/v1/rooms/${rb.id}/lifecycle`, { body: { to: 'COMMISSIONING' } })).status, 404, 'B’s room by its uuid, from A');
  assert.equal((await call(a, 'DELETE', `/v1/rooms/${rb.id}/devices/PA-0001`)).status, 404); assert.equal(n(`SELECT count(*) FROM app.planned_asset WHERE tenant_id = '${tenantOf(B.tenant)}'`), before);
  assert.equal((await call(std.syseng, 'POST', `/v1/rooms/${ra.id}/lifecycle`, { body: { to: 'COMMISSIONING' } })).status, 404, 'a standard session cannot move a sandbox room');
  // people: a sandbox lists its own; the standard tenant's are not there
  const comp = (await call(await as(A, 'svcmgr'), 'GET', '/v1/competencies')).body; assert.ok(comp.pool.length >= 1 && comp.items.length === 3);
  assert.ok(comp.pool.every((p) => n(`SELECT count(*) FROM app.membership WHERE person_id = '${p.id}' AND tenant_id = '${tenantOf(A.tenant)}'`) === 1));
});

test('DS-04 the token boundary holds both ways', async () => {
  const { Hs256Tokens } = await import(path.join(api, 'auth/jwt.js')); const cfg = h.app.cfg;
  const sbxInstaller = h.asSuper(`SELECT id FROM app.person WHERE email = 'installer@${A.tenant}.empathia.invalid'`); const stdDesigner = h.asSuper(`SELECT id FROM app.person WHERE email = '${mail('designer')}'`);
  // a sandbox person has no password: the development sign-in gives nothing
  const pw = await c.call('POST', '/v1/auth/token', { body: { email: `installer@${A.tenant}.empathia.invalid`, password: DEV_PASSWORD } }); assert.equal(pw.status, 401);
  // a sign-in token for a sandbox person (only the server could mint one): refused — a sandbox is reached only with a demonstration session
  const signIn = h.app.tokens.issue(sbxInstaller, tenantOf(A.tenant), 'installer').token;
  const r1 = await call(signIn, 'GET', `/v1/rooms/${A.room}`); assert.equal(r1.status, 401, J(r1.body)); assert.match(r1.body.detail, /only with a demonstration session/);
  // a demonstration token for a person of a standard tenant (signed with the real demonstration secret): refused — not a live sandbox
  const demoSigner = new Hs256Tokens(cfg.demo.secret, cfg.demo.issuer, cfg.demo.audience, 600);
  const r2 = await call(demoSigner.issue(stdDesigner, tenantOf('empathia-demo'), 'designer').token, 'GET', `/v1/rooms/${std.room}`); assert.equal(r2.status, 401, J(r2.body)); assert.match(r2.body.detail, /closed or has expired/);
  // a demonstration-audience token signed with the sign-in secret, and a sign-in-audience token signed with the demonstration secret: bad signatures
  const wrong1 = new Hs256Tokens(cfg.jwtSecret, cfg.demo.issuer, cfg.demo.audience, 600).issue(sbxInstaller, tenantOf(A.tenant), 'installer').token;
  const wrong2 = new Hs256Tokens(cfg.demo.secret, cfg.jwtIssuer, cfg.jwtAudience, 600).issue(stdDesigner, tenantOf('empathia-demo'), 'designer').token;
  for (const t of [wrong1, wrong2]) { const r = await call(t, 'GET', '/v1/me'); assert.equal(r.status, 401); assert.match(r.body.detail, /bad token signature/); }
  assert.notEqual(cfg.demo.secret.toString(), cfg.jwtSecret.toString());
  // a role the token names but the person does not hold in that sandbox: no principal
  const lifted = demoSigner.issue(sbxInstaller, tenantOf(A.tenant), 'syseng').token; assert.equal((await call(lifted, 'GET', '/v1/me')).status, 401);
  // a person of sandbox A named with sandbox B's tenant: no membership there, no principal
  assert.equal((await call(demoSigner.issue(sbxInstaller, tenantOf(B.tenant), 'installer').token, 'GET', '/v1/me')).status, 401);
});

test('DS-05 the key is the credential: a wrong key, an unknown sandbox and a role the sandbox does not hold get nothing', async () => {
  const post = (body) => c.call('POST', '/v1/demo/sessions', { body });
  const otherKey = crypto.randomBytes(32).toString('base64url');
  assert.equal((await post({ sandboxId: A.id, key: otherKey, role: 'installer' })).status, 401);
  assert.equal((await post({ sandboxId: A.id, key: B.key, role: 'installer' })).status, 401, 'B’s key does not open A');
  assert.equal((await post({ sandboxId: crypto.randomUUID(), key: A.key, role: 'installer' })).status, 401);
  assert.equal((await post({ sandboxId: A.id, key: 'short', role: 'installer' })).status, 400);
  for (const role of ['secadmin', 'architect', 'founder']) { const r = await post({ sandboxId: A.id, key: A.key, role }); assert.equal(r.status, 400, role); assert.match(r.body.detail, /this sandbox has no/); }
  assert.equal((await post({ sandboxId: A.id, key: A.key, role: 'installer', tenant: 'empathia-demo' })).status, 400, 'no way to name another tenant');
  assert.equal((await c.call('GET', '/v1/demo/sandbox')).status, 401); assert.equal((await call(std.designer, 'GET', '/v1/demo/sandbox')).status, 404, 'a standard session has no sandbox');
});

test('DS-06 scoped permissions: a session does what its role may do and no more; refusals are audited in the sandbox', async () => {
  const tid = tenantOf(A.tenant); const denied = () => n(`SELECT count(*) FROM app.audit_event WHERE tenant_id = '${tid}' AND outcome = 'DENIED'`); const d0 = denied();
  const designer = await as(A, 'designer'); const installer = await as(A, 'installer'); const cxeng = await as(A, 'cxeng'); const requestor = await as(A, 'requestor');
  assert.equal((await call(designer, 'POST', `/v1/rooms/${A.room}/classification/approve`, { body: {} })).status, 403, 'the designer does not approve the classification');
  assert.equal((await call(installer, 'POST', `/v1/rooms/${A.room}/lifecycle`, { body: { to: 'COMMISSIONING' } })).status, 403, 'the installer does not start commissioning');
  assert.equal((await call(requestor, 'POST', '/v1/rooms', { body: { name: 'Mine (synthetic)', template: 'huddle' } })).status, 403);
  assert.equal((await call(cxeng, 'GET', '/v1/people')).status, 403, 'nobody in a sandbox holds policy.configure');
  assert.equal((await call(designer, 'POST', '/v1/admin/invitations', { body: { email: 'someone@example.invalid', roleKey: 'designer' } })).status >= 400, true);
  assert.ok(denied() >= d0 + 4, 'each refusal is an audit row of the sandbox');
  assert.equal(n(`SELECT count(*) FROM app.audit_event WHERE outcome = 'DENIED' AND tenant_id = '${tenantOf('empathia-demo')}' AND at > now() - interval '5 minutes' AND actor_id IN (SELECT person_id FROM app.membership WHERE tenant_id = '${tid}')`), 0);
  // the register gate is the product's own: commissioning does not start on an unfilled register, whoever asks
  const gate = await call(await as(A, 'syseng'), 'POST', `/v1/rooms/${A.room}/lifecycle`, { body: { to: 'COMMISSIONING' } }); assert.equal(gate.status, 422, J(gate.body)); assert.match(J(gate.body), /device register is not complete/);
});

test('DS-07 the whole thread in a sandbox, by demonstration sessions only; the same thread on a session made later from the key', async () => {
  const T = {}; for (const r of ['designer', 'syseng', 'opslead', 'installer', 'cxeng', 'svcmgr', 'service', 'qa_reviewer', 'steward']) T[r] = await as(A, r);
  const room = A.room; const instrument = 'SYN-METER-01 (synthetic), calibration record SYN-CAL-2026-09'; const ok = async (x, l, want = 200) => { const r = await x; assert.equal(r.status, want, `${l}: ${J(r.body)}`); return r.body; };
  const evidence = async (label) => ok(call(T.cxeng, 'POST', '/v1/evidence', { raw: Buffer.from(`synthetic observation: ${label}`), headers: { 'content-type': 'text/plain', 'x-file-name': `${label}.txt` } }), 'evidence', 201);
  // the field record first (founder: "inspect a device, update its field record, complete a commissioning workflow, switch roles…")
  const f0 = await ok(call(T.installer, 'GET', `/v1/rooms/${room}/field-record`), 'field record'); const dev = f0.devices[0]; const fx = dev.designed.x + 0.5 <= f0.room.bounds.w ? dev.designed.x + 0.5 : dev.designed.x - 0.5;
  await ok(call(T.installer, 'PUT', `/v1/rooms/${room}/field-record/mounting/${dev.asset}`, { body: { method: 'wall-bracket', heightM: 1.4, fixing: 'bracket and four anchors (synthetic)' } }), 'mounting');
  const mv = await ok(call(T.installer, 'POST', `/v1/rooms/${room}/field-record/moves`, { body: { device: dev.asset, x: Math.round(fx * 100) / 100, y: dev.designed.y, reason: 'sprinkler head', note: 'clear of the head (synthetic)' } }), 'move', 201);
  assert.equal((await call(T.installer, 'POST', `/v1/rooms/${room}/field-record/moves/${mv.move}/decide`, { body: { approve: true } })).status, 403, 'the installer does not approve their own move, in a sandbox as anywhere');
  await ok(call(T.syseng, 'POST', `/v1/rooms/${room}/field-record/moves/${mv.move}/decide`, { body: { approve: true, decision: 'clear of the head' } }), 'approve move');
    await registerRoom(c, room, T.installer); await ok(call(T.syseng, 'POST', `/v1/rooms/${room}/lifecycle`, { body: { to: 'COMMISSIONING' } }), 'commissioning');
  const rows = (await call(T.designer, 'GET', `/v1/rooms/${room}`)).body.commissioning.rows.filter((x) => x.applicable); const ev = await evidence('the failing observation');
  await ok(call(T.cxeng, 'POST', `/v1/rooms/${room}/results`, { body: { testId: rows[0].test_id, state: 'FAIL', evidenceId: ev.id, evidenceKind: rows[0].evidence[0], instrument } }), 'fail', 201);
  const issue = (await call(T.designer, 'GET', `/v1/rooms/${room}`)).body.issues.find((i) => i.state === 'OPEN').code;
  assert.equal((await call(T.designer, 'POST', `/v1/issues/${issue}/work-orders`, { body: { note: 'not mine to raise' } })).status, 403);
  const wo = (await ok(call(T.svcmgr, 'POST', `/v1/issues/${issue}/work-orders`, { body: { note: 'handed over from commissioning (synthetic)' } }), 'handoff', 201)).workOrderId;
  const w = (p, who, body) => call(T[who], 'POST', `/v1/work-orders/${wo}${p}`, { body: body ?? {} }); const tech = (await call(T.svcmgr, 'GET', '/v1/competencies')).body.pool.find((p) => /Technician/.test(p.name)).id;
  await ok(w('/triage', 'svcmgr', { severity: 'High', scope: 'the failing check and its device', risk: 'room under commissioning', workType: 'camera_replacement', window: { from: new Date(Date.now() + 864e5).toISOString(), to: new Date(Date.now() + 864e5 + 4 * 36e5).toISOString() } }), 'triage');
  await ok(w('/assign', 'svcmgr', { personId: tech }), 'assign'); await ok(w('/accept', 'service'), 'accept');
  await ok(w('/preflight', 'service', { safetyBriefed: true, toolsConfirmed: ['PTZ service kit', 'laptop with the camera tool'], accessConfirmedBy: 'facilities desk (synthetic)', stock: { 'camera unit': { onHand: 1, checkedAt: new Date().toISOString() }, 'mounting plate': { onHand: 2, checkedAt: new Date().toISOString() } } }), 'preflight');
  await ok(w('/start', 'service'), 'start'); await ok(w('/evidence', 'service', { kind: 'photo', note: 'unit reseated and the cable replaced', ref: 'EV-SYN-WO-1' }), 'wo evidence'); await ok(w('/submit', 'service'), 'submit');
  assert.equal((await w('/verify', 'service', { outcome: 'pass', note: 'mine' })).status, 403, 'the technician does not verify their own work, in a sandbox as anywhere');
  await ok(w('/verify', 'cxeng', { outcome: 'pass', note: 'checked in the room (synthetic)' }), 'verify'); await ok(w('/close', 'svcmgr', { note: 'confirmed by the requester (synthetic)', customerConfirmed: true }), 'close');
  const step = (who, body) => call(T[who], 'POST', `/v1/issues/${issue}/deficiency`, { body });
  await ok(step('cxeng', { step: 'start', ownerRole: 'installer', targetDate: new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10) }), 'def start');
  await ok(step('installer', { step: 'fixed', rootCause: 'INSTALLATION', action: 'Unit reseated on its mount and the damaged cable replaced end to end' }), 'def fixed');
  await ok(step('cxeng', { step: 'retest', result: 'PASS', evidence: 'EV-SYN-RT-1' }), 'def retest'); assert.ok([403, 422].includes((await step('cxeng', { step: 'verify' })).status)); await ok(step('syseng', { step: 'verify' }), 'def verify');
  const e2 = await evidence('commissioning');
  for (const r of rows) await ok(call(T.cxeng, 'POST', `/v1/rooms/${room}/results`, { body: { testId: r.test_id, state: 'PASS', evidenceId: e2.id, evidenceKind: r.evidence[0], instrument } }), r.test_id, 201);
  for (const r of rows) await ok(call(T.qa_reviewer, 'POST', `/v1/rooms/${room}/results/${r.test_id}/verify`), `verify ${r.test_id}`);
  const ops = (await call(T.qa_reviewer, 'GET', '/v1/demo/sandbox')).body; assert.ok(ops.personas.some((p) => p.role === 'opslead'));
  const opsId = h.asSuper(`SELECT id FROM app.person WHERE email = 'opslead@${A.tenant}.empathia.invalid'`);
  await ok(call(T.qa_reviewer, 'POST', '/v1/delegations', { body: { granteeId: opsId, authority: 'customer.accept', reason: 'synthetic: QA verified and does not accept', days: 2 } }), 'delegation', 201);
  await ok(call(await as(A, 'opslead'), 'POST', `/v1/rooms/${room}/lifecycle`, { body: { to: 'ACCEPTED' } }), 'accept');
  await ok(call(T.cxeng, 'POST', `/v1/issues/${issue}/apex`, { body: {} }), 'apex', 201);
  const t = await ok(call(T.syseng, 'GET', `/v1/rooms/${room}/thread`), 'thread'); assert.equal(t.complete, true, t.missing.join(' | ')); assert.equal(t.room.lifecycle, 'ACCEPTED');
  const fld = t.stages.find((x) => x.key === 'lite').records.fieldRecord; assert.deepEqual([fld.mounted, fld.moves.approved], [1, 1], 'the field record is part of the same durable thread');
  assert.deepEqual(t.links.map((l) => `${l.from}>${l.to}`).sort(), ['commissioning>assurance', 'commissioning>service', 'engineering>commissioning', 'lite>engineering', 'service>apex', 'service>assurance']);
  // later, from the key alone (another browser, another day): a different person reads the same record
  const again = await ok(call(await as(A, 'exec'), 'GET', `/v1/rooms/${room}/thread`), 'thread again');
  assert.deepEqual([again.room, again.stages, again.links, again.complete], [t.room, t.stages, t.links, t.complete]);
  // and all of it is in sandbox A: B's room is where it was, the standard room too
  assert.equal((await call(await as(B, 'syseng'), 'GET', `/v1/rooms/${B.room}/thread`)).body.room.lifecycle, 'INSTALLED_UNVERIFIED'); assert.equal((await call(std.designer, 'GET', `/v1/rooms/${std.room}/thread`)).body.room.lifecycle, 'PLANNED');
  const v = await ok(call(T.steward, 'GET', '/v1/audit/integrity'), 'chain'); assert.equal(v.verified, true, J(v)); assert.ok(v.checked >= 60, `${v.checked} audit rows in the sandbox chain`);
});

test('DS-08 reset: the old sessions and key stop at once; the new sandbox is pristine; nothing was deleted', async () => {
  const oldToken = await as(A, 'syseng'); const oldTenant = tenantOf(A.tenant); const rowsBefore = n(`SELECT count(*) FROM app.audit_event WHERE tenant_id = '${oldTenant}'`);
  assert.equal((await c.call('POST', '/v1/demo/sandboxes/reset', { body: { sandboxId: A.id, key: B.key } })).status, 401, 'another sandbox’s key resets nothing');
  const r = await c.call('POST', '/v1/demo/sandboxes/reset', { body: { sandboxId: A.id, key: A.key } }); assert.equal(r.status, 201, J(r.body));
  const N = { ...r.body.sandbox, room: r.body.scenario.room }; assert.notEqual(N.id, A.id); assert.notEqual(N.tenant, A.tenant); assert.notEqual(N.key, A.key); assert.equal(r.body.closed.id, A.id);
  const dead = await call(oldToken, 'GET', '/v1/me'); assert.equal(dead.status, 401, J(dead.body)); assert.match(dead.body.detail, /closed or has expired/);
  assert.equal((await call(A.first, 'GET', `/v1/rooms/${A.room}/thread`)).status, 401);
  assert.equal((await c.call('POST', '/v1/demo/sessions', { body: { sandboxId: A.id, key: A.key, role: 'syseng' } })).status, 401, 'the old key opens nothing');
  assert.equal((await c.call('POST', '/v1/demo/sandboxes/reset', { body: { sandboxId: A.id, key: A.key } })).status, 401, 'a closed sandbox is not reset twice');
  const fresh = (await call(await as(N, 'syseng'), 'GET', `/v1/rooms/${N.room}/thread`)).body; assert.equal(fresh.room.lifecycle, 'INSTALLED_UNVERIFIED'); assert.equal(fresh.complete, false);
  assert.deepEqual(fresh.stages.find((s) => s.key === 'commissioning').records.issues, []); assert.deepEqual(fresh.stages.find((s) => s.key === 'service').records.workOrders, []);
  // the closed sandbox's records are all still there — append-only stays append-only — and no session reaches them
  assert.equal(n(`SELECT count(*) FROM app.audit_event WHERE tenant_id = '${oldTenant}'`), rowsBefore); assert.equal(n(`SELECT count(*) FROM app.assurance_baseline WHERE tenant_id = '${oldTenant}'`), 1);
  assert.equal(h.asSuper(`SELECT closed_reason FROM app.demo_sandbox WHERE id = '${A.id}'`), 'reset');
  A = N;
});

test('DS-09 expiry: an expired sandbox answers 401 to its sessions and to its key', async () => {
  const X = await open(); const t = await as(X, 'designer'); assert.equal((await call(t, 'GET', '/v1/me')).status, 200);
  h.asSuper(`UPDATE app.demo_sandbox SET expires_at = now() - interval '1 second' WHERE id = '${X.id}'`);
  assert.equal((await call(t, 'GET', '/v1/me')).status, 401); assert.equal((await call(t, 'POST', '/v1/rooms', { body: { name: 'Late (synthetic)', template: 'huddle' } })).status, 401);
  assert.equal((await c.call('POST', '/v1/demo/sessions', { body: { sandboxId: X.id, key: X.key, role: 'designer' } })).status, 401);
  assert.equal((await c.call('POST', '/v1/demo/sandboxes/reset', { body: { sandboxId: X.id, key: X.key } })).status, 401);
});

test('DS-10 caps: the live cap and the hourly cap per address refuse with 429; disabling stops new sandboxes and leaves live ones running', async () => {
  const live = (await c.call('GET', '/v1/demo')).body.live; const made = n('SELECT count(*) FROM app.demo_sandbox'); const tenants = n('SELECT count(*) FROM app.tenant');
  h.asSuper(`UPDATE app.demo_config SET max_live = ${live}`);
  const full = await c.call('POST', '/v1/demo/sandboxes', { body: {} }); assert.equal(full.status, 429, J(full.body)); assert.match(full.body.detail, /in use/);
  h.asSuper(`UPDATE app.demo_config SET max_live = 200, per_remote_hour = ${made}`);
  const fast = await c.call('POST', '/v1/demo/sandboxes', { body: {} }); assert.equal(fast.status, 429, J(fast.body)); assert.match(fast.body.detail, /this address/);
  assert.equal((await c.call('POST', '/v1/demo/sandboxes/reset', { body: { sandboxId: B.id, key: B.key } })).status, 429, 'a reset is an opening too'); assert.equal((await call(await as(B, 'designer'), 'GET', '/v1/me')).status, 200, 'and a refused reset closes nothing');
  h.asSuper('UPDATE app.demo_config SET enabled = false, per_remote_hour = 1000');
  assert.equal((await c.call('POST', '/v1/demo/sandboxes', { body: {} })).status, 404); assert.equal((await c.call('GET', '/v1/demo')).body.enabled, false);
  assert.equal((await call(await as(B, 'designer'), 'GET', `/v1/rooms/${B.room}`)).status, 200, 'a live sandbox runs to its expiry');
  assert.deepEqual([n('SELECT count(*) FROM app.demo_sandbox'), n('SELECT count(*) FROM app.tenant')], [made, tenants], 'a refused opening leaves nothing behind');
  h.asSuper('UPDATE app.demo_config SET enabled = true');
});

test('DS-11 database guards: a sandbox takes no outside person, no privileged role and no invitation; its people join no other tenant', async () => {
  const sb = tenantOf(B.tenant); const real = tenantOf('empathia-demo'); const outsider = h.asSuper(`SELECT id FROM app.person WHERE email = '${mail('designer')}'`); const insider = h.asSuper(`SELECT id FROM app.person WHERE email = 'designer@${B.tenant}.empathia.invalid'`);
  assert.throws(() => h.asSuper(`INSERT INTO app.membership (tenant_id, person_id, role_key) VALUES ('${sb}', '${outsider}', 'designer')`), /holds only its own synthetic people/);
  assert.throws(() => h.asSuper(`INSERT INTO app.membership (tenant_id, person_id, role_key) VALUES ('${real}', '${insider}', 'designer')`), /joins no other tenant/);
  for (const role of ['secadmin', 'architect']) assert.throws(() => h.asSuper(`INSERT INTO app.membership (tenant_id, person_id, role_key) VALUES ('${sb}', '${insider}', '${role}')`), /not a sandbox role/, role);
  assert.throws(() => h.asSuper(`INSERT INTO app.membership (tenant_id, person_id, role_key) VALUES ('${sb}', '${insider}', 'founder')`));
  assert.throws(() => h.asSuper(`INSERT INTO app.invitation (tenant_id, email, role_key, token_hash, invited_by, expires_at) VALUES ('${sb}', 'x@example.invalid', 'designer', '${sha('t')}', '${insider}', now() + interval '1 day')`), /does not invite people/);
  assert.throws(() => h.asSuper(`SELECT * FROM app.demo_open_sandbox('${sha('k')}', '${sha('r')}', ARRAY['designer','secadmin'])`), /not a sandbox role/);
  // one sandbox per tenant, and a sandbox row cannot be pointed at a standard tenant by the runtime role (it cannot write the table at all: DS-01)
  assert.throws(() => h.asSuper(`INSERT INTO app.demo_sandbox (tenant_id, key_hash, remote_hash, expires_at) VALUES ('${sb}', '${sha('a')}', '${sha('b')}', now() + interval '1 hour')`), /duplicate key/);
});

test('DS-12 not a file store: uploads are short text notes; anything else, or anything long, is refused', async () => {
  const t = await as(B, 'cxeng'); const up = (raw, type) => call(t, 'POST', '/v1/evidence', { raw, headers: { 'content-type': type, 'x-file-name': 'note.txt' } });
  assert.equal((await up(Buffer.from('synthetic observation'), 'text/plain')).status, 201);
  assert.equal((await up(Buffer.alloc(2048, 1), 'application/octet-stream')).status, 415); assert.equal((await up(Buffer.from('%PDF-1.7 synthetic'), 'application/pdf')).status, 415); assert.equal((await up(Buffer.alloc(64, 1), 'image/png')).status, 415);
  assert.equal((await up(Buffer.alloc(20 * 1024, 0x61), 'text/plain')).status, 413);
  const long = await call(await as(B, 'designer'), 'POST', '/v1/rooms', { body: { name: 'Long (synthetic)', template: 'huddle', intendedUse: 'x'.repeat(70 * 1024) } }); assert.equal(long.status, 413, J(long.body));
  // the same upload from a standard session is the standard rule (no demonstration limit applies outside a sandbox)
  const cx = await c.login('cxeng'); assert.equal((await call(cx, 'POST', '/v1/evidence', { raw: Buffer.alloc(20 * 1024, 0x61), headers: { 'content-type': 'text/plain', 'x-file-name': 'std.txt' } })).status, 201);
});

test('DS-13 the standard tenants hold exactly the rows they held before, and both audit chains verify', async () => {
  const now = standardRows();
  // what this file itself did in the standard tenant since the snapshot: one evidence upload by its own commissioning engineer (DS-12), with its audit row
  const own = { evidence_object: 1, audit_event: n(`SELECT count(*) FROM app.audit_event WHERE tenant_id = '${tenantOf('empathia-demo')}' AND action LIKE 'evidence.%' AND at > now() - interval '10 minutes'`) };
  for (const [table, count] of Object.entries(snapshot)) assert.equal(now[table] - (own[table] || 0), count, `${table}: a sandbox changed a standard tenant`);
  assert.equal(n(`SELECT count(*) FROM app.audit_event e WHERE NOT EXISTS (SELECT 1 FROM app.demo_sandbox s WHERE s.tenant_id = e.tenant_id) AND e.actor_id IN (SELECT m.person_id FROM app.membership m JOIN app.demo_sandbox s ON s.tenant_id = m.tenant_id)`), 0, 'no sandbox person ever acted in a standard tenant');
  const v = await call(std.steward, 'GET', '/v1/audit/integrity'); assert.equal(v.status, 200, J(v.body)); assert.equal(v.body.verified, true, J(v.body));
  const vb = await call(await as(B, 'steward'), 'GET', '/v1/audit/integrity'); assert.equal(vb.body.verified, true, J(vb.body));
});

test('DS-14 the demonstration deployment accepts demonstration sessions only; production needs its own secret; never both at once', async () => {
  const { loadConfig } = await import(path.join(api, 'config.js')); const secret = crypto.randomBytes(48).toString('base64url');
  const base = { NODE_ENV: 'production', AUTH_MODE: 'demo' };
  assert.throws(() => loadConfig(repo, base), /DEMO_SESSION_SECRET is required in production/);
  assert.throws(() => loadConfig(repo, { ...base, DEMO_SESSION_SECRET: 'short' }), /at least 32 bytes/);
  assert.throws(() => loadConfig(repo, { ...base, DEMO_SESSION_SECRET: secret, JWT_SECRET: secret }), /must differ from JWT_SECRET/);
  const prod = loadConfig(repo, { ...base, DEMO_SESSION_SECRET: secret }); assert.equal(prod.authMode, 'demo'); assert.ok(prod.demo && prod.demo.audience !== prod.jwtAudience);
  assert.throws(() => loadConfig(repo, { NODE_ENV: 'production', AUTH_MODE: 'dev', DEMO_SESSIONS: 'on' }), /AUTH_MODE=dev is refused in production/);
  assert.throws(() => loadConfig(repo, { AUTH_MODE: 'oidc', OIDC_ISSUER: 'https://idp.invalid', OIDC_AUDIENCE: 'a', OIDC_JWKS_URL: 'https://idp.invalid/jwks', DEMO_SESSIONS: 'on' }), /refused with AUTH_MODE=oidc/);
  assert.equal(loadConfig(repo, { AUTH_MODE: 'dev', DEMO_SESSIONS: '' }).demo, null, 'off unless asked for');
  // a second process on the same database, in demonstration mode
  const { start } = await import(path.join(api, 'main.js')); demoApp = await start({ AUTH_MODE: 'demo', PORT: '4178' }); const d = client('http://127.0.0.1:4178');
  assert.equal((await d.call('GET', '/health')).body.authMode, 'demo'); assert.equal((await d.call('GET', '/v1/demo')).body.enabled, true);
  assert.equal((await d.call('POST', '/v1/auth/token', { body: { email: mail('designer'), password: DEV_PASSWORD } })).status, 404, 'no development sign-in');
  const dev = await d.call('GET', '/v1/me', { token: std.designer }); assert.equal(dev.status, 401); assert.match(dev.body.detail, /demonstration sessions only/);
  assert.equal((await d.call('GET', `/v1/rooms/${std.room}`, { token: std.designer })).status, 401, 'a standard tenant is unreachable from the demonstration deployment');
  for (const [m, p, body] of [['POST', '/v1/public/leads', { kind: 'contact' }], ['GET', '/v1/public/proof/claims'], ['POST', '/v1/public/invitations/accept', { token: 'x', displayName: 'x', password: 'x' }]]) {
    const r = await d.call(m, p, { body }); assert.equal(r.status, 404, `${p}: ${J(r.body)}`); assert.match(r.body.detail, /not part of the demonstration deployment/); }
  const s = await d.call('POST', '/v1/demo/sessions', { body: { sandboxId: B.id, key: B.key, role: 'designer' } }); assert.equal(s.status, 200, J(s.body));
  assert.equal((await d.call('GET', `/v1/rooms/${B.room}`, { token: s.body.accessToken })).status, 200, 'the demonstration itself works there');
  // two processes with the same demonstration secret and the same database serve the same sessions (how the deployment scales out)
  assert.equal((await call(s.body.accessToken, 'GET', `/v1/rooms/${B.room}`)).status, 200);
});
