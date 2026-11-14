/**
 * The device register over real HTTP and a private PostgreSQL database (migration 0031; founder, 14 Nov 2026: the installation team fills
 * the device register at the beginning of the project; the v1.3 rule: networked devices require an IP address and a hostname).
 *
 *   DR-01  a room's register lists every device with its unit, what each still needs, and the totals; nothing registered yet
 *   DR-02  the installer records a networked unit: versioned, audited, current; the room register counts it once its serial is declared
 *   DR-03  forms are refused with their reasons (hostname, IPv4, MAC, firmware); a non-networked class takes no address (422)
 *   DR-04  one value, one unit: a hostname, address or MAC current on another unit in service is refused (409) — by the API, and by the
 *          database as the runtime role; a retired unit takes no entry and frees its values
 *   DR-05  append-only: an entry is never updated or deleted (as the runtime role); the unit's history lists every version and who wrote it
 *   DR-06  authority and tenancy: a designer may not record (403); another tenant cannot see the room's register or the unit (404)
 *   DR-07  the register gates commissioning (founder, 14 Nov 2026): INSTALLED_UNVERIFIED → COMMISSIONING is refused (422) while any
 *          position still needs registering, with the positions named, audited as DENIED and nothing changed; the readiness names the
 *          gate and gives the installer the work; once every unit is registered the systems engineer starts commissioning
 *   node --test tests/security/device-register.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client, mail, registerRoom } from '../integration/harness.mjs';

let h, c, T = {}, ids = {}, R, rows = {};
const J = (x) => JSON.stringify(x);
const call = (persona, method, p, opts = {}) => c.call(method, p, { token: opts.token || T[persona], body: opts.body, headers: opts.headers });
const n = (sql) => Number(h.asSuper(sql));
async function asApp(tenantId, sql, args = []) {
  const k = await h.appConn();
  try { await k.query("SELECT set_config('app.tenant_id', $1, false)", [tenantId]); const r = await k.query(sql, args); return { ok: true, rows: r.rows }; }
  catch (e) { return { ok: false, code: e.code, message: e.message }; }
  finally { await k.end(); }
}
const reg = async (persona = 'syseng') => (await call(persona, 'GET', `/v1/rooms/${R}/register`)).body;

before(async () => {
  h = await setup({ db: 'empathia_test_device_register', port: 4173 }); c = client(h.base);
  for (const r of ['designer', 'syseng', 'opslead', 'installer', 'service']) T[r] = await c.login(r);
  T.x_syseng = await c.login('syseng', 'second-tenant');
  ids.tenant = h.asSuper("SELECT id FROM app.tenant WHERE slug = 'empathia-demo'"); ids.installer = h.asSuper(`SELECT id FROM app.person WHERE email = '${mail('installer')}'`);
  const r = await call('designer', 'POST', '/v1/rooms', { body: { name: 'Device register (synthetic)', template: 'huddle', buildingCode: 'NST', floor: 1 } });
  assert.equal(r.status, 201, J(r.body)); R = r.body.code;
  assert.equal((await call('designer', 'POST', `/v1/rooms/${R}/devices`, { body: { category: 'table', x: 1, y: 1, mount: 'floor' } })).status, 201);
  assert.equal((await call('designer', 'POST', `/v1/rooms/${R}/devices`, { body: { category: 'speaker', x: 1.5, y: 1.5, mount: 'ceiling' } })).status, 201);   // a class that is not networked
  assert.equal((await call('designer', 'POST', `/v1/rooms/${R}/revisions`, { body: { reason: 'synthetic: the huddle as designed' } })).status, 201);
  assert.equal((await call('syseng', 'POST', `/v1/rooms/${R}/classification/approve`, { body: {} })).status, 200);
  for (const [to, who] of [['DESIGN_APPROVED', 'syseng'], ['INSTALLATION_PENDING', 'opslead'], ['INSTALLED_UNVERIFIED', 'installer']]) assert.equal((await call(who, 'POST', `/v1/rooms/${R}/lifecycle`, { body: { to } })).status, 200, `${R} → ${to}`);
});
after(async () => { await h?.app.stop(); });

test('DR-01 — a room’s register lists every device with its unit and what it still needs; nothing is registered yet', async () => {
  const b = await reg();
  assert.ok(b.items.length >= 3, J(b));
  assert.ok(b.items.every((x) => x.asset && /^AS-\d+$/.test(x.asset)), 'every live position holds a unit after the installation is recorded');
  assert.ok(b.items.every((x) => !x.complete && x.missing.includes('serial')), 'no serial is invented');
  assert.ok(b.items.filter((x) => x.networked).every((x) => x.missing.includes('hostname') && x.missing.includes('IP address')));
  assert.deepEqual([b.totals.complete, b.totals.pct], [0, 0]);
  rows.net = b.items.find((x) => x.networked); rows.net2 = b.items.filter((x) => x.networked)[1]; rows.plain = b.items.find((x) => !x.networked);
  assert.ok(rows.net && rows.net2, 'the huddle has at least two networked devices'); assert.ok(rows.plain, J(b.items.map((x) => [x.category, x.networked])));
});

test('DR-02 — the installer records a networked unit: versioned, audited, current; with its serial declared the device is complete', async () => {
  const w = await call('installer', 'PUT', `/v1/assets/${rows.net.asset}/register`, { body: { hostname: 'nst-huddle-01', ip: '10.40.1.21', mac: 'AA-BB-CC-00-11-22', firmware: '2.4.1', location: 'ceiling tile C4' } });
  assert.equal(w.status, 200, J(w.body)); assert.deepEqual([w.body.version, w.body.mac, w.body.networked], [1, 'aa:bb:cc:00:11:22', true]);
  assert.equal((await call('installer', 'POST', `/v1/assets/${rows.net.asset}/identity`, { body: { state: 'DECLARED', serial: 'SYN-SN-DR-0001' } })).status, 200);
  const b = await reg(); const me = b.items.find((x) => x.position === rows.net.position);
  assert.deepEqual([me.complete, me.entry.hostname, me.entry.ip, me.entry.version, me.entry.recordedRole], [true, 'nst-huddle-01', '10.40.1.21', 1, 'installer']);
  assert.equal(b.totals.complete, 1);
  const w2 = await call('installer', 'PUT', `/v1/assets/${rows.net.asset}/register`, { body: { firmware: '2.4.2' } });
  assert.equal(w2.status, 200); assert.deepEqual([w2.body.version, w2.body.hostname, w2.body.firmware], [2, 'nst-huddle-01', '2.4.2'], 'fields not given are kept');
  assert.equal((await call('installer', 'PUT', `/v1/assets/${rows.net.asset}/register`, { body: { firmware: '2.4.2' } })).status, 422, 'nothing changed is refused');
  assert.equal(n(`SELECT count(*) FROM app.audit_event WHERE action = 'asset.register_recorded' AND outcome = 'ALLOWED' AND aggregate_id = '${rows.net.asset}'`), 2);
});

test('DR-03 — values in the wrong form are refused with their reasons; a device class that is not networked takes no address', async () => {
  const bad = await call('installer', 'PUT', `/v1/assets/${rows.net2.asset}/register`, { body: { hostname: '-bad-', ip: '10.40.1.300', mac: 'zz:zz', firmware: '!!' } });
  assert.equal(bad.status, 422, J(bad.body));
  const why = J(bad.body);
  for (const w of ['a hostname is one label', 'an IP address is four numbers', 'a MAC address is six pairs', 'a firmware version is up to 40']) assert.ok(why.includes(w), w);
  const plain = await call('installer', 'PUT', `/v1/assets/${rows.plain.asset}/register`, { body: { ip: '10.40.1.50' } });
  assert.equal(plain.status, 422); assert.match(J(plain.body), /is not a networked device class/);
  assert.equal((await call('installer', 'PUT', `/v1/assets/${rows.plain.asset}/register`, { body: { location: 'under the table' } })).status, 200, 'a location is fine');
});

test('DR-04 — one value, one unit: the API refuses a current hostname, address or MAC on another unit (409), and so does the database; a retired unit frees its values', async () => {
  for (const [body, what] of [[{ hostname: 'NST-HUDDLE-01' }, 'hostname'], [{ ip: '10.40.1.21' }, 'address'], [{ mac: 'aa:bb:cc:00:11:22' }, 'MAC']]) {
    const r = await call('installer', 'PUT', `/v1/assets/${rows.net2.asset}/register`, { body }); assert.equal(r.status, 409, `${what}: ${J(r.body)}`); assert.match(r.body.detail, new RegExp(`^${what} .* is already current on ${rows.net.asset}`));
  }
  const a2 = h.asSuper(`SELECT id FROM app.physical_asset WHERE code = '${rows.net2.asset}'`);
  const sql = "INSERT INTO app.asset_register_entry (tenant_id, asset_id, version, ip, recorded_by, recorded_role, correlation_id) VALUES ($1,$2,1,'10.40.1.21'::inet,$3,'installer','proof')";
  const db = await asApp(ids.tenant, sql, [ids.tenant, a2, ids.installer]); assert.equal(db.ok, false); assert.equal(db.code, '23505', db.message);
  // retire the first unit (replaced): its values are free for the unit that took its place
  const cur = (await call('syseng', 'GET', `/v1/rooms/${R}/positions/${rows.net.position}/history`)).body.installations.find((i) => !i.removedAt);
  const rep = await call('installer', 'POST', `/v1/rooms/${R}/positions/${rows.net.position}/replace`, { body: { expectedInstallation: cur.id, reason: 'synthetic: failed' } }); assert.equal(rep.status, 200, J(rep.body));
  assert.equal((await call('installer', 'PUT', `/v1/assets/${rows.net.asset}/register`, { body: { location: 'returned' } })).status, 422, 'a retired unit takes no entry');
  const take = await call('installer', 'PUT', `/v1/assets/${rep.body.installed.asset}/register`, { body: { hostname: 'nst-huddle-01', ip: '10.40.1.21' } });
  assert.equal(take.status, 200, `the replacement takes the retired unit’s values: ${J(take.body)}`);
});

test('DR-05 — append-only: an entry is never updated or deleted, and the unit’s history lists every version and who wrote it', async () => {
  const a1 = h.asSuper(`SELECT id FROM app.physical_asset WHERE code = '${rows.net.asset}'`);
  const up = await asApp(ids.tenant, "UPDATE app.asset_register_entry SET firmware = 'x' WHERE asset_id = $1", [a1]); assert.equal(up.ok, false); assert.equal(up.code, '42501');
  const del = await asApp(ids.tenant, 'DELETE FROM app.asset_register_entry WHERE asset_id = $1', [a1]); assert.equal(del.ok, false); assert.equal(del.code, '42501');
  const hist = (await call('syseng', 'GET', `/v1/assets/${rows.net.asset}/history`)).body;
  assert.deepEqual(hist.register.map((e) => [e.version, e.firmware, e.byRole]), [[1, '2.4.1', 'installer'], [2, '2.4.2', 'installer']]);
  assert.equal(hist.asset.disposition, 'RETIRED', 'remembered in full after retirement');
});

test('DR-06 — authority and tenancy: a designer may not record (403); another tenant sees neither the room’s register nor the unit (404)', async () => {
  assert.equal((await call('designer', 'PUT', `/v1/assets/${rows.plain.asset}/register`, { body: { location: 'x' } })).status, 403);
  assert.equal((await call('service', 'PUT', `/v1/assets/${rows.plain.asset}/register`, { body: { firmware: '1.0' } })).status, 200, 'a service technician records (work.evidence)');
  assert.equal((await c.call('GET', `/v1/rooms/${R}/register`, { token: T.x_syseng })).status, 404);
  assert.equal((await c.call('GET', `/v1/assets/${rows.plain.asset}/history`, { token: T.x_syseng })).status, 404);
});

test('DR-07 — the register gates commissioning: refused with the positions named, audited, nothing changed; allowed once every unit is registered', async () => {
  const open = (await reg()).items.filter((x) => x.missing.length); assert.ok(open.length > 0, 'the earlier cases left units unregistered');
  const r = await call('syseng', 'POST', `/v1/rooms/${R}/lifecycle`, { body: { to: 'COMMISSIONING' } });
  assert.equal(r.status, 422, J(r.body)); assert.match(r.body.detail, /^the device register is not complete: \d+ of \d+ positions? still need registering before commissioning starts/);
  for (const x of open.slice(0, 4)) assert.ok(r.body.detail.includes(x.position), `${x.position} is named`);
  assert.equal(h.asSuper(`SELECT lifecycle FROM app.room WHERE code = '${R}'`), 'INSTALLED_UNVERIFIED', 'nothing changed');
  assert.ok(n(`SELECT count(*) FROM app.audit_event WHERE aggregate_id = '${R}' AND action = 'room.lifecycle:COMMISSIONING' AND outcome = 'DENIED' AND detail::text LIKE '%device register is not complete%'`) >= 1, 'the refusal is audited with its reason');
  const rd = (await call('syseng', 'GET', `/v1/rooms/${R}/readiness`)).body;
  assert.ok(rd.next.to === 'COMMISSIONING' && rd.next.blockers.some((b) => /device register is not complete/.test(b)), J(rd.next));
  assert.equal(rd.register.missing.length, open.length); assert.ok(rd.outstanding.some((o) => o.who === 'installer' && /device register/.test(o.what) && o.count === open.length), J(rd.outstanding));
  await registerRoom(c, R, T.installer);
  const rd2 = (await call('syseng', 'GET', `/v1/rooms/${R}/readiness`)).body;
  assert.ok(!rd2.next.blockers.some((b) => /device register/.test(b)) && rd2.register.missing.length === 0, J(rd2.next));
  const ok = await call('syseng', 'POST', `/v1/rooms/${R}/lifecycle`, { body: { to: 'COMMISSIONING' } }); assert.equal(ok.status, 200, J(ok.body));
});
