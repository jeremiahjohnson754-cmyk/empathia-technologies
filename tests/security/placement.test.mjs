/**
 * One shared source of truth for where a device is (founder, 17 Nov 2026: "If someone moves a camera in Engineering, its coordinates
 * should update in Lite, its relevant commissioning checks should be reassessed, and Assurance should preserve the revision history.
 * Not three different products pretending to agree."). On the flagship room, UNI-SCI-110, through the routes, as its own people.
 * The baseline at acceptance is checked in demo-sandbox DS-07, which takes a room all the way there.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client } from '../integration/harness.mjs';

let h, c, T = {}, cam, R = '/v1/rooms/UNI-SCI-110'; const J = (x) => JSON.stringify(x);
const call = (token, method, p, o = {}) => c.call(method, p, { token, ...o });
const eng = async (who = 'designer') => (await call(T[who], 'GET', R)).body.devices.find((d) => d.id === cam.id);
const lite = async (who = 'installer') => (await call(T[who], 'GET', `${R}/field-record`)).body.devices.find((d) => d.asset === cam.id);
before(async () => {
  h = await setup({ db: 'empathia_placement', port: 4152, env: { DEMO_SESSIONS: 'on' } }); c = client(h.base); h.asSuper('UPDATE app.demo_config SET enabled = true');
  const o = await c.call('POST', '/v1/demo/sandboxes', { body: {} }); assert.equal(o.status, 201, J(o.body)); const sb = o.body.sandbox;
  for (const role of ['designer', 'syseng', 'installer', 'cxeng', 'exec', 'service']) T[role] = (await c.call('POST', '/v1/demo/sessions', { body: { sandboxId: sb.id, key: sb.key, role } })).body.accessToken;
  cam = (await call(T.cxeng, 'GET', R)).body.devices.find((d) => d.cat === 'camera'); assert.ok(cam, 'the lecture theatre has a camera');
});
after(async () => { await h?.app.stop(); });

test('PL-01 before any move every product gives the designed place, and says it is the designed place', async () => {
  const e = await eng(); const l = await lite();
  assert.deepEqual(e.placement, l.placement); assert.equal(e.placement.basis, 'DESIGNED'); assert.equal(e.placement.asBuilt, null); assert.equal(e.placement.proposed, null); assert.deepEqual(e.placement.history, []);
  assert.deepEqual(e.placement.current, { x: cam.x, y: cam.y }); assert.deepEqual([e.placement.designed.x, e.placement.designed.y], [cam.x, cam.y]);
  const all = (await call(T.cxeng, 'GET', R)).body.devices; assert.ok(all.every((d) => d.placement && d.placement.basis === 'DESIGNED'), 'every position, furniture included, has a placement');
});

test('PL-02 the design of an installed room is not edited: moving the camera as a design change is refused, and nothing moves', async () => {
  const r = await call(T.designer, 'PATCH', `${R}/devices/${cam.id}`, { body: { x: cam.x + 1, y: cam.y } });
  assert.equal(r.status, 422, J(r.body)); assert.match(r.body.detail, /changes need a change order/);
  assert.deepEqual((await eng()).placement.current, { x: cam.x, y: cam.y });
});

let first;
test('PL-03 a move proposed by the installer is a proposal everywhere: every product shows it waiting, and none treats it as the place', async () => {
  const to = { x: cam.x + 1.5, y: cam.y - 0.5 };
  const mv = await call(T.installer, 'POST', `${R}/field-record/moves`, { body: { device: cam.id, ...to, reason: 'sprinkler head', note: 'a sprinkler head is where the design puts the camera (synthetic)' } });
  assert.equal(mv.status, 201, J(mv.body)); first = { move: mv.body.move, to };
  const e = await eng(); const l = await lite('cxeng');
  assert.deepEqual(e.placement, l.placement); assert.equal(e.placement.basis, 'DESIGNED'); assert.deepEqual(e.placement.current, { x: cam.x, y: cam.y });
  assert.deepEqual([e.placement.proposed.x, e.placement.proposed.y, e.placement.proposed.move], [to.x, to.y, first.move]); assert.equal(e.placement.history.length, 1); assert.equal(e.placement.history[0].state, 'PROPOSED');
  assert.deepEqual([e.x, e.y], [cam.x, cam.y], 'the design itself is untouched');
});

test('PL-04 its recorder cannot approve it; approved by someone else, the camera is in one place for Engineering and Lite, with the designed place kept and the move named', async () => {
  assert.equal((await call(T.installer, 'POST', `${R}/field-record/moves/${first.move}/decide`, { body: { approve: true } })).status, 403);
  assert.equal((await call(T.service, 'POST', `${R}/field-record/moves/${first.move}/decide`, { body: { approve: true } })).status, 403, 'nor anyone without the authority');
  assert.equal((await eng()).placement.basis, 'DESIGNED', 'two refusals changed nothing');
  const d = await call(T.syseng, 'POST', `${R}/field-record/moves/${first.move}/decide`, { body: { approve: true, decision: 'clear of the sprinkler head' } }); assert.equal(d.status, 200, J(d.body));
  const e = await eng('exec'); const l = await lite('cxeng');
  assert.deepEqual(e.placement, l.placement, 'one answer, read by two products as two different people'); assert.equal(e.placement.basis, 'AS_BUILT'); assert.deepEqual(e.placement.current, first.to);
  assert.deepEqual([e.placement.asBuilt.x, e.placement.asBuilt.y, e.placement.asBuilt.move], [first.to.x, first.to.y, first.move]); assert.match(e.placement.asBuilt.decidedBy, /Systems Engineer/); assert.ok(Date.parse(e.placement.asBuilt.decidedAt) > 0);
  assert.equal(e.placement.proposed, null); assert.deepEqual([e.placement.designed.x, e.placement.designed.y, e.x, e.y], [cam.x, cam.y, cam.x, cam.y], 'the designed place is still there, beside it');
  assert.deepEqual(l.asBuilt, { ...first.to, moved: first.move }, 'the field record’s own summary agrees with the placement it carries');
  const rev = (await call(T.cxeng, 'GET', R)).body.room.rev; assert.equal(rev, (await call(T.cxeng, 'GET', R)).body.room.rev); assert.equal(Number(h.asSuper(`SELECT count(*) FROM app.planned_asset WHERE code = '${cam.id}' AND x = ${cam.x} AND y = ${cam.y}`)) >= 1, true, 'the design row was not edited');
});

test('PL-05 the checks that depend on the camera are named for reassessment: exactly the applicable tests of the plan that name it', async () => {
  const rows = (await call(T.cxeng, 'GET', R)).body.commissioning.rows.filter((r) => r.applicable && r.devices.includes(cam.id)).map((r) => r.test_id).sort();
  const l = await lite('cxeng'); assert.ok(rows.length >= 3, `${rows.length} tests name the camera`);
  assert.deepEqual(l.recheck.map((r) => r.test).sort(), rows);
  const other = (await call(T.cxeng, 'GET', `${R}/field-record`)).body.devices.filter((d) => d.asset !== cam.id); assert.ok(other.every((d) => d.recheck.length === 0), 'no other device is asked to be looked at again');
});

test('PL-06 a rejected move changes no place and stays in the history; a second approved move becomes the place, and the first stays in the history', async () => {
  const bad = await call(T.installer, 'POST', `${R}/field-record/moves`, { body: { device: cam.id, x: cam.x - 3, y: cam.y - 1, reason: 'other', note: 'tried the other side (synthetic)' } }); assert.equal(bad.status, 201, J(bad.body));
  assert.equal((await call(T.syseng, 'POST', `${R}/field-record/moves/${bad.body.move}/decide`, { body: { approve: false, decision: 'the lectern is in its view from there' } })).status, 200);
  let e = await eng(); assert.deepEqual(e.placement.current, first.to); assert.equal(e.placement.asBuilt.move, first.move); assert.deepEqual(e.placement.history.map((m) => m.state), ['APPROVED', 'REJECTED']);
  const second = { x: cam.x + 2, y: Math.round((cam.y - 0.8) * 100) / 100 };
  const mv = await call(T.installer, 'POST', `${R}/field-record/moves`, { body: { device: cam.id, ...second, reason: 'sightline or glare', note: 'clear of the projector beam (synthetic)' } }); assert.equal(mv.status, 201, J(mv.body));
  assert.deepEqual(mv.body.from, first.to, 'a second move starts from where the camera is, not from the design');
  assert.equal((await call(T.syseng, 'POST', `${R}/field-record/moves/${mv.body.move}/decide`, { body: { approve: true } })).status, 200);
  e = await eng(); const l = await lite('cxeng'); assert.deepEqual(e.placement, l.placement); assert.deepEqual(e.placement.current, second); assert.equal(e.placement.asBuilt.move, mv.body.move);
  assert.deepEqual(e.placement.history.map((m) => [m.move, m.state]), [[first.move, 'APPROVED'], [bad.body.move, 'REJECTED'], [mv.body.move, 'APPROVED']], 'the whole history, in order, whatever was decided');
  assert.ok(e.placement.history.every((m) => m.by && m.at && m.reason && m.metres > 0)); assert.deepEqual([e.placement.designed.x, e.placement.designed.y], [cam.x, cam.y]);
});

test('PL-07 the history is the server’s record: every move and every decision is an audit row of the room, and another tenant sees none of it', async () => {
  const n = Number(h.asSuper("SELECT count(*) FROM app.audit_event WHERE action LIKE 'field.move%' AND outcome = 'ALLOWED' AND tenant_id = (SELECT tenant_id FROM app.room WHERE canonical_ref = 'UNI-SCI-110' ORDER BY created_at DESC LIMIT 1)"));
  assert.ok(n >= 6, `${n} audit rows for three moves and three decisions`);
  const o = await c.call('POST', '/v1/demo/sandboxes', { body: {} }); const t2 = o.body.session.accessToken; const theirs = (await call(t2, 'GET', R)).body.devices.find((d) => d.cat === 'camera');
  assert.equal(theirs.placement.basis, 'DESIGNED'); assert.deepEqual(theirs.placement.history, []);
});
