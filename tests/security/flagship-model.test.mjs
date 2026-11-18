// The lecture theatre's physical model (founder, 17 Nov 2026, 19:05: "enrich SCI-110's physical model"). A real enterprise API on a
// real database; every check reads the server. Until this the room was the auditorium template as it comes: nine devices and two
// seating blocks for 180 seats.
//   FM-01  the theatre holds what a 180-seat lecture theatre has, each a position of the room on the server: thirty seating blocks
//          that add up to its occupancy, and thirty-six devices by category; every one inside the walls and between floor and ceiling
//   FM-02  the design holds together by the server's own checks: no open design deficiency; every loudspeaker is driven, every
//          microphone and camera goes somewhere, every networked device reaches a switch; the plan was approved on this design
//   FM-03  everything downstream sees the same room: the commissioning plan names only devices that exist and covers the added
//          kinds, the register lists every device, and a sandbox still opens well inside its limits
//   FM-04  a height is part of where a device is: between the floor and the ceiling or refused; changing it is a move, under the
//          same rule as any move (a draft only), and by the designer only
//   FM-05  the room view gives each position its footprint from the server's catalogue, so a page draws furniture as large as it is
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict';
import { setup, client } from '../integration/harness.mjs';

let h, c, sb; const T = {}; const J = (x) => JSON.stringify(x); const HALL = '/v1/rooms/UNI-SCI-110'; let hall; let opened = 0;
const call = (token, method, p, o = {}) => c.call(method, p, { token, ...o });
const EXPECT = { ledwall: 1, display: 3, camera: 3, micceil: 4, mictable: 1, micwireless: 1, speaker: 8, dsp: 1, amp: 2, compute: 1, switch: 2, control: 1, switcher: 1, encoder: 1, pdu: 1, rack: 1, touch: 1, scheduler: 1, occsensor: 1, lighting: 1 };

before(async () => {
  h = await setup({ db: 'empathia_flagship_model', port: 4157, env: { DEMO_SESSIONS: 'on' } }); c = client(h.base); h.asSuper('UPDATE app.demo_config SET enabled = true');
  const t0 = Date.now(); const o = await c.call('POST', '/v1/demo/sandboxes', { body: {} }); opened = Date.now() - t0; assert.equal(o.status, 201, J(o.body)); sb = o.body.sandbox;
  for (const role of ['designer', 'syseng', 'installer', 'cxeng', 'exec']) T[role] = (await c.call('POST', '/v1/demo/sessions', { body: { sandboxId: sb.id, key: sb.key, role } })).body.accessToken;
  hall = (await call(T.designer, 'GET', HALL)).body;
});
after(async () => { await h.app.stop(); });

test('FM-01 the theatre holds what a 180-seat lecture theatre has: thirty seating blocks that add up to its occupancy and thirty-six devices, each inside the room', () => {
  const g = hall.room.geometry; const W = Math.max(...g.points.map((p) => p[0])); const L = Math.max(...g.points.map((p) => p[1])); assert.deepEqual([W, L, g.ceiling, hall.room.occupancy], [16, 20, 6.5, 180]);
  const furn = hall.devices.filter((d) => d.furniture); const devs = hall.devices.filter((d) => !d.furniture);
  const seats = furn.filter((d) => d.cat === 'chairs'); assert.equal(seats.length, 30); assert.equal(seats.reduce((n, d) => n + d.props.seats, 0), hall.room.occupancy, 'the seats on the plan are the room’s occupancy');
  assert.equal(new Set(seats.map((d) => `${d.x},${d.y}`)).size, 30, 'no two blocks in one place'); assert.equal(new Set(seats.map((d) => d.y)).size, 10, 'ten rows'); assert.deepEqual([...new Set(seats.map((d) => d.x))].sort((a, b) => a - b), [3.2, 8, 12.8], 'three blocks a row: two aisles');
  assert.equal(furn.filter((d) => d.cat === 'lectern').length, 1);
  const by = {}; for (const d of devs) by[d.cat] = (by[d.cat] || 0) + 1; assert.deepEqual(by, EXPECT, J(by)); assert.equal(devs.length, 36);
  for (const d of hall.devices) { assert.ok(d.x >= 0 && d.x <= W && d.y >= 0 && d.y <= L, `${d.id} ${d.label} is inside the walls (${d.x}, ${d.y})`); assert.ok(d.z >= 0 && d.z <= g.ceiling, `${d.id} ${d.label} is between floor and ceiling (${d.z})`); }
  // heights that were the category's office-ceiling default (2.7 m) are the theatre's own
  assert.ok(devs.filter((d) => d.cat === 'speaker').every((d) => d.z === 5), 'every loudspeaker is suspended at 5 m'); assert.ok(devs.filter((d) => d.cat === 'micceil').every((d) => d.z === 4.5));
  assert.ok(devs.filter((d) => d.cat === 'camera').every((d) => d.z >= 2.8)); assert.equal(devs.find((d) => d.cat === 'occsensor').z, 6.5);
  assert.ok(devs.every((d) => d.generic === true && d.model === 'generic'), 'every device is a class of device, not a product');
  assert.equal(new Set(hall.devices.map((d) => d.id)).size, hall.devices.length); assert.ok(hall.devices.every((d) => /^PA-\d{4,}$/.test(d.id)));
});

test('FM-02 the design holds together by the server’s own checks, and the plan was approved on this design', () => {
  const open = hall.issues.filter((i) => i.state === 'OPEN'); assert.deepEqual(open, [], J(open.map((i) => i.title)));
  const devs = hall.devices.filter((d) => !d.furniture); const cat = new Map(devs.map((d) => [d.id, d.cat])); const ends = (id) => hall.connections.filter((k) => k.from === id || k.to === id);
  const other = (k, id) => cat.get(k.from === id ? k.to : k.from);
  for (const d of devs.filter((x) => x.cat === 'speaker')) assert.ok(ends(d.id).some((k) => other(k, d.id) === 'amp'), `${d.label} is driven by an amplifier`);
  for (const d of devs.filter((x) => ['micceil', 'mictable', 'micwireless'].includes(x.cat))) assert.ok(ends(d.id).some((k) => other(k, d.id) === 'dsp'), `${d.label} reaches the audio processor`);
  for (const d of devs.filter((x) => x.cat === 'camera')) assert.ok(ends(d.id).length >= 1, `${d.label} is connected`);
  for (const d of devs.filter((x) => ['display', 'ledwall', 'camera', 'micceil', 'dsp', 'amp', 'compute', 'control', 'touch', 'encoder', 'switcher'].includes(x.cat))) assert.ok(ends(d.id).some((k) => other(k, d.id) === 'switch'), `${d.label} reaches a network switch`);
  // capacity: no amplifier drives more loudspeakers than it has channels, no switch carries more than it has ports, and the second switch reaches the first
  for (const a of devs.filter((x) => x.cat === 'amp')) { const n = hall.connections.filter((k) => k.from === a.id && cat.get(k.to) === 'speaker').length; assert.ok(n >= 1 && n <= a.props.channels, `${a.label} drives ${n} of its ${a.props.channels} channels`); }
  const sws = devs.filter((x) => x.cat === 'switch'); for (const s of sws) { const n = hall.connections.filter((k) => k.kind === 'network' && (k.from === s.id || k.to === s.id)).length; assert.ok(n >= 1 && n <= s.props.ports, `${s.label} carries ${n} of its ${s.props.ports} ports`); }
  assert.ok(hall.connections.some((k) => k.kind === 'network' && k.from === sws[1].id && k.to === sws[0].id), 'the second switch uplinks to the first');
  for (const d of devs.filter((x) => x.cat === 'speaker')) assert.equal(hall.connections.filter((k) => k.to === d.id && cat.get(k.from) === 'amp').length, 1, `${d.label} is driven once`);
  assert.ok(hall.connections.every((k) => cat.has(k.from) && cat.has(k.to)), 'every connection joins two devices of this room'); assert.ok(hall.connections.length >= 50, `${hall.connections.length} proposed connections`);
  // approved as designed: the lifecycle the scenario reached needs an approved plan and classification on the current revision
  assert.equal(hall.room.lifecycle, 'INSTALLED_UNVERIFIED'); assert.equal(hall.revisions.length, 1, 'one revision: the design that was approved'); assert.equal(hall.room.approvedRevision, hall.revisions[0].rev_no);
  const plan = hall.drawings.find((d) => d.kind === 'plan'); assert.deepEqual([plan.state, plan.revNo], ['APPROVED', hall.room.approvedRevision], 'the plan drawing is approved on that revision: a device added after it would have sent it back for review');
});

test('FM-03 everything downstream sees the same room: the commissioning plan, the register, and the sandbox’s limits', async () => {
  const ids = new Set(hall.devices.map((d) => d.id)); const rows = hall.commissioning.rows.filter((r) => r.applicable); assert.ok(rows.length >= 90, `${rows.length} applicable tests`);
  assert.ok(rows.every((r) => r.devices.every((d) => ids.has(d))), 'a test names only positions of this room');
  const named = new Set(rows.flatMap((r) => r.devices)); const cats = new Set(hall.devices.filter((d) => named.has(d.id)).map((d) => d.cat));
  for (const k of ['speaker', 'micceil', 'mictable', 'amp', 'dsp', 'camera', 'display', 'ledwall', 'control', 'touch', 'switch']) assert.ok(cats.has(k), `the plan has a test naming a ${k}`);
  // a display test names the displays and the LED wall, and no camera (the catalogue files it under Video, whose usual family is the camera)
  const cal = rows.find((r) => r.test_id === 'video_display_calibration'); const catOf = new Map(hall.devices.map((d) => [d.id, d.cat]));
  assert.deepEqual(cal.devices.map((d) => catOf.get(d)).sort(), ['display', 'display', 'display', 'ledwall']); assert.deepEqual(rows.find((r) => r.test_id === 'video_camera_exposure').devices.map((d) => catOf.get(d)), ['camera', 'camera', 'camera']);
  assert.ok(rows.some((r) => r.test_id === 'reverberation_rt60'));
  const reg = (await call(T.installer, 'GET', `${HALL}/register`)).body.items; assert.equal(reg.length, 36, 'the register lists every device and no furniture'); assert.ok(reg.every((x) => x.missing.length), 'each still to be registered');
  const b = h.asSuper(`SELECT count(*) FROM app.audit_event a JOIN app.tenant t ON t.id = a.tenant_id WHERE t.slug = '${sb.tenant}'`); assert.ok(Number(b) < 400, `a sandbox opens having used ${b} of its 4000 recorded actions`);
  assert.ok(opened < 30000, `the sandbox opened in ${opened} ms`);
});

test('FM-04 a height is between the floor and the ceiling or refused; changing it is a move of a draft, by the designer', async () => {
  const made = await call(T.designer, 'POST', '/v1/rooms', { body: { name: 'Height fixture room (synthetic)', template: 'huddle', buildingCode: 'ATL', floor: 2, ceiling: '2.7' } }); assert.equal(made.status, 201, J(made.body)); const R = `/v1/rooms/${made.body.code}`;
  const over = await call(T.designer, 'POST', `${R}/devices`, { body: { category: 'speaker', x: 1, y: 1, z: 3.1 } }); assert.equal(over.status, 400, J(over.body)); assert.match(J(over.body), /between the floor \(0\) and the ceiling \(2\.7 m\): 3\.1 is not/);
  assert.equal((await call(T.designer, 'POST', `${R}/devices`, { body: { category: 'speaker', x: 1, y: 1, z: -0.2 } })).status, 400);
  assert.equal((await call(T.designer, 'POST', `${R}/devices`, { body: { category: 'speaker', x: 1, y: 1, z: 'high' } })).status, 400);
  const n0 = (await call(T.designer, 'GET', R)).body.devices.length;
  const ok = await call(T.designer, 'POST', `${R}/devices`, { body: { category: 'speaker', x: 1, y: 1, z: 2.4 } }); assert.equal(ok.status, 201, J(ok.body)); const id = ok.body.assetId;
  const dflt = await call(T.designer, 'POST', `${R}/devices`, { body: { category: 'speaker', x: 2, y: 1 } }); assert.equal(dflt.status, 201);
  let devs = (await call(T.designer, 'GET', R)).body.devices; assert.equal(devs.length, n0 + 2, 'the refused requests added nothing'); assert.equal(devs.find((d) => d.id === id).z, 2.4); assert.equal(devs.find((d) => d.id === dflt.body.assetId).z, 2.7, 'without a height the category’s usual one is used');
  assert.equal((await call(T.exec, 'PATCH', `${R}/devices/${id}`, { body: { z: 2 } })).status, 403, 'not the designer');
  assert.equal((await call(T.designer, 'PATCH', `${R}/devices/${id}`, { body: { z: 2.9 } })).status, 400);
  assert.equal((await call(T.designer, 'PATCH', `${R}/devices/${id}`, { body: { z: 2.1 } })).status, 200); devs = (await call(T.designer, 'GET', R)).body.devices; assert.equal(devs.find((d) => d.id === id).z, 2.1);
  // past the draft, a height is no more editable than a position: the theatre is installed
  const speaker = hall.devices.find((d) => d.cat === 'speaker'); const late = await call(T.designer, 'PATCH', `${HALL}/devices/${speaker.id}`, { body: { z: 4 } }); assert.equal(late.status, 422, J(late.body));
  assert.equal((await call(T.designer, 'GET', HALL)).body.devices.find((d) => d.id === speaker.id).z, 5);
  const add = await call(T.designer, 'POST', `${HALL}/devices`, { body: { category: 'speaker', x: 8, y: 8, z: 5 } }); assert.equal(add.status, 422, 'nothing is added to an installed design');
});

test('FM-05 each position carries its footprint from the server’s catalogue', () => {
  const seat = hall.devices.find((d) => d.cat === 'chairs'); assert.deepEqual(seat.footprint, { w: 2.4, d: 1 }); assert.deepEqual(hall.devices.find((d) => d.cat === 'lectern').footprint, { w: 0.6, d: 0.5 });
  assert.ok(hall.devices.every((d) => d.footprint && d.footprint.w > 0 && d.footprint.d > 0), 'every position has one');
  // the rows do not overlap one another at that size
  const seats = hall.devices.filter((d) => d.cat === 'chairs'); for (const a of seats) for (const b of seats) if (a.id < b.id) assert.ok(Math.abs(a.x - b.x) >= 2.4 || Math.abs(a.y - b.y) >= 1, `${a.id} and ${b.id} do not overlap`);
});
