/**
 * Phase 1 field records on the server (founder, 17 Nov 2026: "make the Phase 1 field records database-backed, too"; 14 Nov: "how
 * everything is being mounted … hooked up to … did we change the position of a device during commissioning because of a sprinkler").
 * The real API on a real database; synthetic data only.
 *
 *   FRS-01  the lifecycle gate: nothing is recorded on a room that is not being installed yet; the record is readable at any time
 *   FRS-02  mounting: who may; what a mounting must say; corrections are new versions and the earlier ones stay (the database refuses
 *           an UPDATE, a DELETE and a version out of order)
 *   FRS-03  hookups: "as designed" names the design's proposed connection, anything else is "recorded in the field, not in the
 *           design"; a port is hooked up once; a hookup is removed with a reason and never deleted
 *   FRS-04  field moves: proposed with a reason by the installation team; decided by someone holding room.design.approve who is not
 *           the recorder (the database enforces it); an approved move is the as-built position and the design is not edited
 *   FRS-05  an approved move during commissioning lists the checks that name the device and were recorded before it; a result
 *           recorded afterwards is no longer listed
 *   FRS-06  notes pinned to the plan: added by the installation team and the approvers; resolved once, with a resolution
 *   FRS-07  the room's thread carries the field record and its audit history, refusals included; the same on a new session
 *   FRS-08  tenancy, site scope and sign-in: another tenant, a technician scoped to another site and nobody at all get nothing
 *   FRS-09  after acceptance the field record is closed: a change is a change order, not a field note
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client, DEV_PASSWORD, mail, registerRoom } from '../integration/harness.mjs';

let h, c, room, planned, D, conn; const T = {}; const J = (x) => JSON.stringify(x);
const call = (who, method, p, o = {}) => c.call(method, p, { token: o.token || T[who], body: o.body, headers: o.headers, raw: o.raw });
const fr = async (who = 'installer', r = room) => { const x = await call(who, 'GET', `/v1/rooms/${r}/field-record`); assert.equal(x.status, 200, J(x.body)); return x.body; };
const base = () => `/v1/rooms/${room}/field-record`;
const n = (s) => Number(h.asSuper(s));
const refused = async (x, re, status = 422) => { const r = await x; assert.equal(r.status, status, J(r.body)); if (re) assert.match(J(r.body), re); return r.body; };
const fresh = async (role) => (await c.call('POST', '/v1/auth/token', { body: { email: mail(role), password: DEV_PASSWORD, tenant: 'empathia-demo', role } })).body.accessToken;
const who = (r) => h.asSuper(`SELECT id FROM app.person WHERE email = '${mail(r)}'`);
const lifecycle = async (r, steps) => { for (const [to, p] of steps) { if (to === 'COMMISSIONING') await registerRoom(c, r, T.installer); const x = await call(p, 'POST', `/v1/rooms/${r}/lifecycle`, { body: { to } }); assert.equal(x.status, 200, `${to}: ${J(x.body)}`); } };

before(async () => {
  h = await setup({ db: 'empathia_field', port: 4179 }); c = client(h.base);
  for (const r of ['designer', 'syseng', 'opslead', 'installer', 'service', 'cxeng', 'qa_reviewer', 'steward', 'exec']) T[r] = await c.login(r);
  T.x_syseng = await c.login('syseng', 'second-tenant'); T.south = await c.login('service', 'empathia-demo', 'service-south');
  const make = async (name, floor) => (await call('designer', 'POST', '/v1/rooms', { body: { name, template: 'huddle', buildingCode: 'ATL', floor } })).body.code;
  room = await make('Field Huddle (synthetic)', 5); planned = await make('Still Planned (synthetic)', 6);
  D = (await fr('designer')).devices.map((d) => d.asset); assert.ok(D.length >= 3, `devices ${D}`);
  // a proposed connection of the design between the first two devices (the template may already have one)
  const dc = (await fr('designer')).designConnections.find((x) => (x.from === D[0] && x.to === D[1]) || (x.from === D[1] && x.to === D[0]));
  conn = dc ? dc.code : (await call('designer', 'POST', `/v1/rooms/${room}/connections`, { body: { from: D[0], to: D[1], kind: 'signal' } })).body.code;
  // (added 18 Nov: DESIGN_APPROVED approves the latest saved revision and refuses a design changed since it; the added connection is saved)
  if (!dc) await call('designer', 'POST', `/v1/rooms/${room}/revisions`, { body: { reason: 'connection added' } });
  await call('designer', 'POST', `/v1/rooms/${room}/drawings/generate`); await call('syseng', 'POST', `/v1/rooms/${room}/drawings/plan/approve`); await call('syseng', 'POST', `/v1/rooms/${room}/classification/approve`, { body: {} });
  conn = (await fr('designer')).designConnections.find((x) => (x.from === D[0] && x.to === D[1]) || (x.from === D[1] && x.to === D[0])).code;
});
after(async () => { await h?.app.stop(); });

test('FRS-01 nothing is recorded on a room that is not being installed yet; the record is readable at any time', async () => {
  const r = await fr('exec', planned); assert.deepEqual([r.room.lifecycle, r.writable, r.hookups.length, r.moves.length, r.markups.length], ['PLANNED', false, 0, 0, 0]);
  assert.ok(r.devices.every((d) => d.mounting === null && d.asBuilt.moved === null && d.asBuilt.x === d.designed.x)); assert.deepEqual(r.stats.moves, { proposed: 0, approved: 0, rejected: 0 });
  const a = r.devices[0].asset; const d0 = n(`SELECT count(*) FROM app.audit_event WHERE aggregate_id = '${planned}' AND outcome = 'DENIED'`);
  await refused(call('installer', 'PUT', `/v1/rooms/${planned}/field-record/mounting/${a}`, { body: { method: 'wall-bracket', fixing: 'bracket and four anchors' } }), /nothing is installed yet/);
  await refused(call('installer', 'POST', `/v1/rooms/${planned}/field-record/moves`, { body: { device: a, x: 1, y: 1, reason: 'sprinkler head' } }), /nothing is installed yet/);
  await refused(call('installer', 'POST', `/v1/rooms/${planned}/field-record/markups`, { body: { x: 1, y: 1, text: 'early' } }), /nothing is installed yet/);
  assert.equal(n(`SELECT count(*) FROM app.audit_event WHERE aggregate_id = '${planned}' AND outcome = 'DENIED'`), d0 + 3, 'each refusal is on the room’s audit trail');
  assert.equal(n('SELECT (SELECT count(*) FROM app.field_mounting) + (SELECT count(*) FROM app.field_move) + (SELECT count(*) FROM app.field_markup)'), 0);
  await lifecycle(room, [['DESIGN_APPROVED', 'syseng'], ['INSTALLATION_PENDING', 'opslead']]); assert.equal((await fr()).writable, true);
});

test('FRS-02 mounting: who may, what it must say, and corrections as versions the database keeps', async () => {
  const put = (who, asset, body) => call(who, 'PUT', `${base()}/mounting/${asset}`, { body });
  for (const p of ['designer', 'syseng', 'cxeng', 'exec']) assert.equal((await put(p, D[0], { method: 'wall-bracket', fixing: 'x' })).status, 403, `${p} does not record the field record`);
  await refused(put('installer', D[0], { method: 'wall-bracket' }), /how it is fixed/);
  await refused(put('installer', D[0], { method: 'ceiling-tile', fixing: 'tile bridge' }), /safety tether/);
  await refused(put('installer', D[0], { method: 'other' }), /describe the mounting/);
  await refused(put('installer', D[0], { method: 'glue', fixing: 'x' }), null, 400); await refused(put('installer', D[0], { method: 'wall-bracket', fixing: 'x', heightM: 20 }), null, 400);
  await refused(put('installer', 'PA-9999', { method: 'floor' }), /not a device of/);
  const v1 = await put('installer', D[0], { method: 'ceiling-tile', heightM: 2.7, fixing: 'tile bridge across two T-bars', backing: 'none', tether: 'no', note: 'tether to follow' }); assert.equal(v1.status, 200, J(v1.body)); assert.equal(v1.body.version, 1);
  const v2 = await put('service', D[0], { method: 'ceiling-tile', heightM: 2.7, fixing: 'tile bridge across two T-bars', tether: 'yes', note: 'tether fitted to structure' }); assert.equal(v2.status, 200, J(v2.body)); assert.equal(v2.body.version, 2); assert.match(v2.body.note, /earlier version is kept/);
  assert.equal((await put('installer', D[1], { method: 'floor' })).status, 200, 'a floor mounting needs no fixing');
  const d = (await fr()).devices.find((x) => x.asset === D[0]); assert.deepEqual([d.mounting.version, d.mounting.tether, d.mounting.heightM, d.mounting.earlier], [2, 'yes', 2.7, 1]); assert.match(d.mounting.by, /Service Technician/);
  assert.deepEqual([(await fr()).stats.mounted, (await fr()).stats.devices], [2, D.length]);
  // the database: append-only, versions in order, overhead mountings state their tether, and only a device of the room
  assert.equal(n('SELECT count(*) FROM app.field_mounting'), 3);
  assert.throws(() => h.asSuper("UPDATE app.field_mounting SET tether = 'yes' WHERE version = 1"), /append-only/); assert.throws(() => h.asSuper('DELETE FROM app.field_mounting'), /append-only/);
  const row = "SELECT tenant_id, room_id, position_id, {V}, {M}, '{F}', '{T}', recorded_by FROM app.field_mounting WHERE version = 2";
  const ins = (v, m, f, t) => h.asSuper(`INSERT INTO app.field_mounting (tenant_id, room_id, position_id, version, method, fixing, tether, recorded_by) ${row.replace('{V}', v).replace('{M}', `'${m}'`).replace('{F}', f).replace('{T}', t)}`);
  assert.throws(() => ins(7, 'wall-bracket', 'x', 'n/a'), /does not follow/); assert.throws(() => ins(3, 'ceiling-structure', 'rod', 'n/a'), /field_mounting_overhead_tether/); assert.throws(() => ins(3, 'rack', '', 'n/a'), /field_mounting_fixing/);
  assert.throws(() => h.asSuper(`INSERT INTO app.field_mounting (tenant_id, room_id, position_id, version, method, tether, recorded_by) SELECT m.tenant_id, (SELECT id FROM app.room WHERE code = '${planned}'), m.position_id, 3, 'floor', 'n/a', m.recorded_by FROM app.field_mounting m WHERE version = 2`), /device position of this room/);
});

test('FRS-03 hookups: as designed or not in the design; one hookup per port; removed with a reason, never deleted', async () => {
  const post = (who, body) => call(who, 'POST', `${base()}/hookups`, { body });
  assert.equal((await post('designer', { device: D[0], port: 'HDMI 1', to: D[1] })).status, 403);
  const a = await post('installer', { device: D[0], port: 'HDMI 1', to: D[1], toPort: 'IN 2', cable: 'C-014' }); assert.equal(a.status, 201, J(a.body)); assert.deepEqual([a.body.asDesigned, a.body.connection], [true, conn]); assert.match(a.body.hookup, /^HK-\d{4}$/);
  const b = await post('installer', { device: D[0], port: 'PoE', to: 'building network (outside the room)', cable: 'C-015' }); assert.equal(b.status, 201, J(b.body)); assert.equal(b.body.asDesigned, false); assert.match(b.body.basis, /not in the design/);
  const e = await post('service', { device: D[2], port: 'USB-C', to: D[0] }); assert.equal(e.status, 201, J(e.body));
  await refused(post('installer', { device: D[0], port: 'hdmi 1', to: D[2] }), /already recorded as hooked up/);
  await refused(post('installer', { device: D[0], port: 'AUX', to: D[0] }), /not hooked up to itself/);
  await refused(post('installer', { device: D[0], port: 'AUX', to: 'the moon' }), /the other end is a device of this room or one of/);
  await refused(post('installer', { device: 'PA-9999', port: 'AUX', to: D[0] }), /not a device of/);
  let r = await fr(); assert.deepEqual([r.stats.hookups, r.stats.notInDesign], [3, r.hookups.filter((x) => !x.asDesigned).length]); assert.ok(r.stats.notInDesign >= 1);
  assert.ok(r.devices.find((x) => x.asset === D[1]).hookups.includes(a.body.hookup), 'the other end lists the hookup too'); assert.ok(r.designConnections.every((x) => /PROPOSED/.test(x.basis)));
  // removal: with a reason, once; the port is free again; the entry stays
  assert.equal((await call('installer', 'POST', `${base()}/hookups/${b.body.hookup}/remove`, { body: { reason: '' } })).status, 400);
  assert.equal((await call('designer', 'POST', `${base()}/hookups/${b.body.hookup}/remove`, { body: { reason: 'not mine' } })).status, 403);
  assert.equal((await call('installer', 'POST', `${base()}/hookups/${b.body.hookup}/remove`, { body: { reason: 'recorded on the wrong port' } })).status, 200);
  await refused(call('installer', 'POST', `${base()}/hookups/${b.body.hookup}/remove`, { body: { reason: 'again' } }), /already removed/); assert.equal((await call('installer', 'POST', `${base()}/hookups/HK-9999/remove`, { body: { reason: 'unknown' } })).status, 404);
  assert.equal((await post('installer', { device: D[0], port: 'PoE', to: 'building network (outside the room)' })).status, 201, 'the port is free again');
  r = await fr(); assert.equal(r.hookups.find((x) => x.hookup === b.body.hookup).removed.reason, 'recorded on the wrong port'); assert.equal(r.hookups.length, 4); assert.equal(r.stats.hookups, 3);
  assert.throws(() => h.asSuper(`DELETE FROM app.field_hookup WHERE code = '${a.body.hookup}'`), /never deleted/); assert.throws(() => h.asSuper(`UPDATE app.field_hookup SET port = 'HDMI 2' WHERE code = '${a.body.hookup}'`), /immutable/);
  assert.throws(() => h.asSuper(`UPDATE app.field_hookup SET removed_at = NULL, removed_by = NULL, removed_reason = NULL WHERE code = '${b.body.hookup}'`), /immutable/);
});

test('FRS-04 field moves: proposed with a reason; decided by an approver who is not the recorder; as built beside the design', async () => {
  const d = (await fr()).devices.find((x) => x.asset === D[0]); const bounds = (await fr()).room.bounds; const to = { x: Math.round((d.designed.x + 0.6) * 100) / 100, y: d.designed.y };
  const design = async () => { const r = (await call('designer', 'GET', `/v1/rooms/${room}`)).body; const a = r.devices.find((x) => (x.code || x.id) === D[0]); return [r.room.rev, Number(a.x), Number(a.y)]; }; const before = await design();
  const post = (p, body) => call(p, 'POST', `${base()}/moves`, { body });
  assert.equal((await post('syseng', { device: D[0], ...to, reason: 'sprinkler head' })).status, 403, 'the approver does not record the move');
  await refused(post('installer', { device: D[0], ...to, reason: 'because' }), null, 400); await refused(post('installer', { device: D[0], ...to, reason: 'other' }), /describe the reason/);
  await refused(post('installer', { device: D[0], x: bounds.w + 2, y: 1, reason: 'sprinkler head' }), /inside the room/); await refused(post('installer', { device: D[0], x: d.designed.x, y: d.designed.y, reason: 'sprinkler head' }), /nothing moved/);
  const photo = (await call('installer', 'POST', '/v1/evidence', { raw: Buffer.from('synthetic photograph: the sprinkler head beside the designed position'), headers: { 'content-type': 'text/plain', 'x-file-name': 'sprinkler.txt' } })).body;
  await refused(post('installer', { device: D[0], ...to, reason: 'sprinkler head', evidenceId: '00000000-0000-4000-8000-000000000000' }), /evidence file uploaded to this organization/);
  const m = await post('installer', { device: D[0], ...to, reason: 'sprinkler head', note: '450 mm from the head, per the fire contractor (synthetic)', evidenceId: photo.id }); assert.equal(m.status, 201, J(m.body)); assert.deepEqual([m.body.state, m.body.metres], ['PROPOSED', 0.6]);
  await refused(post('installer', { device: D[0], x: to.x + 0.3, y: to.y, reason: 'light fixture' }), /already has a move waiting/);
  let r = await fr(); assert.deepEqual(r.devices.find((x) => x.asset === D[0]).asBuilt, { x: d.designed.x, y: d.designed.y, moved: null }, 'a proposed move is not the as-built position');
  assert.equal((await fr('syseng')).moves[0].mayDecide, true); assert.equal((await fr('installer')).moves[0].mayDecide, false);
  // deciding: an approver, never the recorder
  const decide = (p, mv, body) => call(p, 'POST', `${base()}/moves/${mv}/decide`, { body });
  for (const p of ['installer', 'service', 'designer', 'cxeng']) assert.equal((await decide(p, m.body.move, { approve: true })).status, 403, p);
  assert.throws(() => h.asSuper(`UPDATE app.field_move SET state = 'APPROVED', decided_by = recorded_by, decided_at = now() WHERE code = '${m.body.move}'`), /field_move_separation/);
  assert.throws(() => h.asSuper(`UPDATE app.field_move SET to_x = to_x + 1 WHERE code = '${m.body.move}'`), /does not change/);
  const ok = await decide('syseng', m.body.move, { approve: true, decision: 'clear of the head; sightline unchanged' }); assert.equal(ok.status, 200, J(ok.body)); assert.equal(ok.body.state, 'APPROVED');
  await refused(decide('syseng', m.body.move, { approve: false, decision: 'changed my mind' }), /already APPROVED/); assert.equal((await decide('syseng', 'FM-9999', { approve: true })).status, 404);
  r = await fr(); assert.deepEqual(r.devices.find((x) => x.asset === D[0]).asBuilt, { ...to, moved: m.body.move }); assert.deepEqual(r.devices.find((x) => x.asset === D[0]).designed.x, d.designed.x);
  assert.deepEqual(await design(), before, 'the design — its revision and the device’s designed position — is not edited by a field move');
  // a rejection says why; a rejected move is not the as-built position; the next move starts from where the device is
  const m2 = await post('service', { device: D[1], x: Math.max(0, r.devices.find((x) => x.asset === D[1]).designed.x - 0.4), y: r.devices.find((x) => x.asset === D[1]).designed.y, reason: 'HVAC diffuser or return' }); assert.equal(m2.status, 201, J(m2.body));
  await refused(decide('syseng', m2.body.move, { approve: false }), /says why/); assert.equal((await decide('syseng', m2.body.move, { approve: false, decision: 'keep the designed position; move the diffuser grille instead' })).body.state, 'REJECTED');
  const m3 = await post('installer', { device: D[0], x: to.x + 0.25, y: to.y, reason: 'light fixture' }); assert.equal(m3.status, 201, J(m3.body)); assert.deepEqual(m3.body.from, to, 'from the as-built position, not the designed one');
  r = await fr(); assert.deepEqual(r.stats.moves, { proposed: 1, approved: 1, rejected: 1 }); assert.equal(r.devices.find((x) => x.asset === D[1]).asBuilt.moved, null);
  assert.throws(() => h.asSuper(`DELETE FROM app.field_move WHERE code = '${m2.body.move}'`), /never deleted/);
  assert.throws(() => h.asSuper(`UPDATE app.field_move SET state = 'APPROVED' WHERE code = '${m2.body.move}'`), /decided once/);
  assert.equal((await decide('syseng', m3.body.move, { approve: false, decision: 'superseded on site (synthetic)' })).status, 200);
});

test('FRS-05 an approved move during commissioning lists the checks that name the device and were recorded before it', async () => {
  await lifecycle(room, [['INSTALLED_UNVERIFIED', 'installer'], ['COMMISSIONING', 'syseng']]);
  const rows = (await call('designer', 'GET', `/v1/rooms/${room}`)).body.commissioning.rows.filter((x) => x.applicable);
  const named = n(`SELECT count(*) FROM app.cx_plan_row r WHERE r.plan_id = (SELECT p.id FROM app.cx_plan p JOIN app.room x ON x.id = p.room_id WHERE x.code = '${room}' ORDER BY p.compiled_at DESC, p.id DESC LIMIT 1) AND r.applicable AND cardinality(r.devices) > 0`);
  const dev = h.asSuper(`SELECT r.devices[1] || ' ' || r.test_id FROM app.cx_plan_row r WHERE r.plan_id = (SELECT p.id FROM app.cx_plan p JOIN app.room x ON x.id = p.room_id WHERE x.code = '${room}' ORDER BY p.compiled_at DESC, p.id DESC LIMIT 1) AND r.applicable AND cardinality(r.devices) > 0 ORDER BY r.test_id LIMIT 1`);
  assert.ok(named > 0, 'the huddle plan names devices in its checks (if it stops doing so, this test must not pass by default)');
  const [asset, testId] = dev.split(' '); const row = rows.find((x) => x.test_id === testId); const cur = (await fr()).devices.find((x) => x.asset === asset);
  const ev = (await call('cxeng', 'POST', '/v1/evidence', { raw: Buffer.from('synthetic observation before the move'), headers: { 'content-type': 'text/plain', 'x-file-name': 'before.txt' } })).body;
  const rec = () => call('cxeng', 'POST', `/v1/rooms/${room}/results`, { body: { testId, state: 'PASS', evidenceId: ev.id, evidenceKind: row.evidence[0], instrument: 'SYN-METER-01 (synthetic), calibration record SYN-CAL-2026-09' } });
  assert.equal((await rec()).status, 201);
  const m = await call('installer', 'POST', `${base()}/moves`, { body: { device: asset, x: Math.round((cur.asBuilt.x + 0.5) * 100) / 100, y: cur.asBuilt.y, reason: 'sprinkler head' } }); assert.equal(m.status, 201, J(m.body));
  const ok = await call('syseng', 'POST', `${base()}/moves/${m.body.move}/decide`, { body: { approve: true } }); assert.equal(ok.status, 200, J(ok.body));
  assert.ok(ok.body.recheck.some((x) => x.test === testId && /PASS/.test(x.result)), J(ok.body.recheck)); assert.match(ok.body.note, /looks at (it|them) again/);
  assert.ok((await fr()).devices.find((x) => x.asset === asset).recheck.some((x) => x.test === testId));
  assert.equal((await rec()).status, 201, 'recorded again after the move');
  assert.ok(!(await fr()).devices.find((x) => x.asset === asset).recheck.some((x) => x.test === testId), 'a result recorded after the move is not listed');
});

test('FRS-06 notes pinned to the plan: added by the installation team and the approvers; resolved once, with a resolution', async () => {
  const post = (p, body) => call(p, 'POST', `${base()}/markups`, { body });
  for (const p of ['designer', 'cxeng', 'exec']) assert.equal((await post(p, { x: 1, y: 1, text: 'x' })).status, 403, p);
  const a = await post('installer', { x: 1.2, y: 0.8, text: 'Sprinkler main runs here: keep 450 mm clear (synthetic)' }); assert.equal(a.status, 201, J(a.body)); assert.match(a.body.markup, /^RL-\d{4}$/);
  const b = await post('syseng', { x: 2, y: 1, text: 'Confirm the display height with the architect (synthetic)' }); assert.equal(b.status, 201, J(b.body));
  await refused(post('installer', { x: 999, y: 1, text: 'outside' }), /inside the room/); assert.equal((await post('installer', { x: 1, y: 1, text: '' })).status, 400);
  assert.equal((await call('installer', 'POST', `${base()}/markups/${a.body.markup}/resolve`, { body: { resolution: '' } })).status, 400);
  assert.equal((await call('designer', 'POST', `${base()}/markups/${a.body.markup}/resolve`, { body: { resolution: 'x' } })).status, 403);
  assert.equal((await call('service', 'POST', `${base()}/markups/${a.body.markup}/resolve`, { body: { resolution: 'Device moved clear of the main (FM-0001)' } })).status, 200);
  await refused(call('service', 'POST', `${base()}/markups/${a.body.markup}/resolve`, { body: { resolution: 'again' } }), /not an open note/);
  const r = await fr(); assert.deepEqual(r.stats.notes, { open: 1, total: 2 }); assert.match(r.markups.find((x) => x.markup === a.body.markup).resolvedBy, /Service Technician/);
  assert.throws(() => h.asSuper(`UPDATE app.field_markup SET body = 'rewritten' WHERE code = '${b.body.markup}'`), /resolved once/); assert.throws(() => h.asSuper(`DELETE FROM app.field_markup WHERE code = '${a.body.markup}'`), /never deleted/);
});

test('FRS-07 the thread carries the field record and its audit history, refusals included; the same on a new session', async () => {
  const t = (await call('syseng', 'GET', `/v1/rooms/${room}/thread`)).body; const f = t.stages.find((s) => s.key === 'lite').records.fieldRecord; const r = await fr();
  assert.deepEqual(f, r.stats); assert.ok(f.mounted >= 2 && f.moves.approved >= 1 && f.hookups === 3);
  const db = n(`SELECT count(*) FROM app.audit_event WHERE aggregate_id = '${room}'`); const fieldRows = n(`SELECT count(*) FROM app.audit_event WHERE aggregate_id = '${room}' AND action LIKE 'field.%'`);
  assert.equal(t.audit.byAggregate.filter((a) => a.type === 'Room').reduce((s, a) => s + a.events, 0), db); assert.ok(fieldRows >= 20, `${fieldRows} field audit rows`);
  assert.ok(n(`SELECT count(*) FROM app.audit_event WHERE aggregate_id = '${room}' AND action LIKE 'field.%' AND outcome = 'DENIED'`) >= 8, 'refusals are part of the field record’s history');
  const again = await call('x', 'GET', `/v1/rooms/${room}/field-record`, { token: await fresh('qa_reviewer') }); assert.equal(again.status, 200);
  const strip = (x) => ({ ...x, moves: x.moves.map(({ mayDecide, ...m }) => m), may: null }); assert.deepEqual(strip(again.body), strip(r), 'another person on a new session reads the same record');
  const v = await call('steward', 'GET', '/v1/audit/integrity'); assert.equal(v.body.verified, true, J(v.body));
});

test('FRS-08 tenancy, site scope and sign-in', async () => {
  assert.equal((await call('x', 'GET', `/v1/rooms/${room}/field-record`, { token: T.x_syseng })).status, 404); assert.equal((await call('x', 'POST', `${base()}/markups`, { token: T.x_syseng, body: { x: 1, y: 1, text: 'x' } })).status, 404);
  const id = (await call('designer', 'GET', `/v1/rooms/${room}`)).body.room.id; assert.equal((await call('x', 'GET', `/v1/rooms/${id}/field-record`, { token: T.x_syseng })).status, 404);
  assert.equal((await call('x', 'GET', `/v1/rooms/${room}/field-record`, { token: T.south })).status, 404, 'a technician scoped to the South campus does not see a North room');
  assert.equal((await call('x', 'PUT', `${base()}/mounting/${D[2]}`, { token: T.south, body: { method: 'floor' } })).status, 404);
  assert.equal((await c.call('GET', `/v1/rooms/${room}/field-record`)).status, 401); assert.equal((await c.call('POST', `${base()}/moves`, { body: { device: D[0], x: 1, y: 1, reason: 'sprinkler head' } })).status, 401);
  // another tenant's rows cannot be read with the runtime role without that tenant set (row-level security is forced)
  const k = await h.appConn(); try { assert.equal((await k.query('SELECT count(*)::int AS n FROM app.field_move')).rows[0].n, 0); } finally { await k.end(); }
});

test('FRS-09 after acceptance the field record is closed', async () => {
  const rows = (await call('designer', 'GET', `/v1/rooms/${room}`)).body.commissioning.rows.filter((x) => x.applicable);
  const ev = (await call('cxeng', 'POST', '/v1/evidence', { raw: Buffer.from('synthetic observation: commissioning'), headers: { 'content-type': 'text/plain', 'x-file-name': 'cx.txt' } })).body;
  for (const r of rows) assert.equal((await call('cxeng', 'POST', `/v1/rooms/${room}/results`, { body: { testId: r.test_id, state: 'PASS', evidenceId: ev.id, evidenceKind: r.evidence[0], instrument: 'SYN-METER-01 (synthetic), calibration record SYN-CAL-2026-09' } })).status, 201, r.test_id);
  for (const r of rows) assert.equal((await call('qa_reviewer', 'POST', `/v1/rooms/${room}/results/${r.test_id}/verify`)).status, 200, r.test_id);
  assert.equal((await call('qa_reviewer', 'POST', '/v1/delegations', { body: { granteeId: who('opslead'), authority: 'customer.accept', reason: 'synthetic: QA verified and does not accept', days: 2 } })).status, 201);
  const acc = await call('x', 'POST', `/v1/rooms/${room}/lifecycle`, { body: { to: 'ACCEPTED' }, token: await fresh('opslead') }); assert.equal(acc.status, 200, J(acc.body));
  const r = await fr(); assert.equal(r.writable, false); const before = JSON.stringify(r.stats);
  await refused(call('installer', 'PUT', `${base()}/mounting/${D[2]}`, { body: { method: 'floor' } }), /field record is closed.*change order/);
  await refused(call('installer', 'POST', `${base()}/moves`, { body: { device: D[2], x: 1, y: 1, reason: 'sprinkler head' } }), /field record is closed/);
  await refused(call('syseng', 'POST', `${base()}/markups`, { body: { x: 1, y: 1, text: 'late' } }), /field record is closed/);
  assert.equal(JSON.stringify((await fr()).stats), before);
});
