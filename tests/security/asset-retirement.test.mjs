/**
 * Asset IDs end to end (migration 0030; founder, 14 Nov 2026: "every asset (device) must have a unique one so a replaced device/asset ID
 * must be removed from the asset inventory but the record of that identifier must never be used again but be fully remembered").
 * Over real HTTP and a private PostgreSQL database, migrated and seeded through the real code. Synthetic data only.
 *
 *   AR-01  a like-for-like replacement retires the unit it takes out by default: out of the inventory, history intact, code reserved
 *   AR-02  a retired unit is never installed again — not through the API (422), not by direct SQL as the runtime role (EM009)
 *   AR-03  a retirement is final: no way back to service, no second retirement, no identity change afterwards (API and database)
 *   AR-04  a spare is retired on purpose with its reason; an installed unit cannot be retired (409); the reasons are a closed list (400/422)
 *   AR-05  codes are never reused: every unit ever registered keeps its code; the next unit gets a new one; a code cannot be inserted twice
 *   AR-06  authority and tenancy: a designer may not retire (403); another tenant cannot see the units (404, absent from its inventory)
 *   node --test tests/security/asset-retirement.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client, mail } from '../integration/harness.mjs';

let h, c, T = {}, ids = {}, R, P, units = {};
const J = (x) => JSON.stringify(x);
const call = (persona, method, p, opts = {}) => c.call(method, p, { token: opts.token || T[persona], body: opts.body, headers: opts.headers });
const move = (code, to, persona) => call(persona, 'POST', `/v1/rooms/${code}/lifecycle`, { body: { to } });
const n = (sql) => Number(h.asSuper(sql));
async function asApp(tenantId, sql, args = []) {   // a CONSTRAINT PROOF: one statement as the runtime role, tenant set
  const k = await h.appConn();
  try { await k.query("SELECT set_config('app.tenant_id', $1, false)", [tenantId]); const r = await k.query(sql, args); return { ok: true, rows: r.rows }; }
  catch (e) { return { ok: false, code: e.code, message: e.message }; }
  finally { await k.end(); }
}
const current = async (room, pos) => (await call('syseng', 'GET', `/v1/rooms/${room}/positions/${pos}/history`)).body.installations.find((i) => !i.removedAt);

before(async () => {
  h = await setup({ db: 'empathia_test_asset_retirement', port: 4174 }); c = client(h.base);
  for (const r of ['designer', 'syseng', 'opslead', 'installer']) T[r] = await c.login(r);
  T.x_syseng = await c.login('syseng', 'second-tenant');   // the second tenant seeds designer, syseng and secadmin
  ids.tenant = h.asSuper("SELECT id FROM app.tenant WHERE slug = 'empathia-demo'"); ids.installer = h.asSuper(`SELECT id FROM app.person WHERE email = '${mail('installer')}'`);
  const r = await call('designer', 'POST', '/v1/rooms', { body: { name: 'Asset retirement (synthetic)', template: 'huddle', buildingCode: 'NST', floor: 1 } });
  assert.equal(r.status, 201, J(r.body)); R = r.body.code;
  assert.equal((await call('designer', 'POST', `/v1/rooms/${R}/devices`, { body: { category: 'table', x: 1, y: 1, mount: 'floor' } })).status, 201);
  assert.equal((await call('designer', 'POST', `/v1/rooms/${R}/revisions`, { body: { reason: 'synthetic: the huddle as designed' } })).status, 201);
  assert.equal((await call('syseng', 'POST', `/v1/rooms/${R}/classification/approve`, { body: {} })).status, 200);
  for (const [to, who] of [['DESIGN_APPROVED', 'syseng'], ['INSTALLATION_PENDING', 'opslead'], ['INSTALLED_UNVERIFIED', 'installer']]) assert.equal((await move(R, to, who)).status, 200, `${R} → ${to}`);
  P = (await call('syseng', 'GET', `/v1/rooms/${R}`)).body.devices.find((d) => d.cat === 'bar').id;
});
after(async () => { await h?.app.stop(); });

test('AR-01 — a like-for-like replacement retires the unit it takes out: out of the inventory, its history intact, its code reserved', async () => {
  const cur = await current(R, P); units.first = cur.asset;
  const inv0 = (await call('syseng', 'GET', '/v1/assets')).body;
  assert.ok(inv0.inService.some((x) => x.asset === cur.asset), 'installed: in service');
  const rep = await call('installer', 'POST', `/v1/rooms/${R}/positions/${P}/replace`, { body: { expectedInstallation: cur.id, reason: 'synthetic: the bar failed on site' } });
  assert.equal(rep.status, 200, J(rep.body)); units.second = rep.body.installed.asset;
  assert.notEqual(units.second, units.first, 'the incoming unit gets a new code');
  const hist = (await call('syseng', 'GET', `/v1/assets/${units.first}/history`)).body;
  assert.equal(hist.asset.disposition, 'RETIRED'); assert.equal(hist.asset.retired.reason, 'REPLACED'); assert.equal(hist.asset.retired.byRole, 'installer');
  assert.equal(hist.installations.length, 1); assert.equal(hist.installations[0].removalReason, 'REPLACED'); assert.equal(hist.current, null);
  const inv = (await call('syseng', 'GET', '/v1/assets')).body;
  assert.ok(!inv.inService.some((x) => x.asset === units.first) && !inv.spares.some((x) => x.asset === units.first), 'no longer in the inventory');
  assert.ok(inv.retired.some((x) => x.asset === units.first && x.retired.reason === 'REPLACED' && x.placements === 1), 'remembered in the retired register');
  assert.ok(inv.inService.some((x) => x.asset === units.second && x.position === P));
});

test('AR-02 — a retired unit is never installed again: the API refuses it (422) and the database refuses it as the runtime role (EM009)', async () => {
  const cur = await current(R, P);
  const back = await call('installer', 'POST', `/v1/rooms/${R}/positions/${P}/replace`, { body: { expectedInstallation: cur.id, reason: 'synthetic: put the old bar back', asset: units.first } });
  assert.equal(back.status, 422, J(back.body)); assert.match(back.body.detail, new RegExp(`^${units.first} was retired \\(replaced, \\d{4}-\\d{2}-\\d{2}\\): a retired unit is never installed again, and its code is never reused`));
  assert.equal((await current(R, P)).id, cur.id, 'nothing changed at the position');
  const aid = h.asSuper(`SELECT id FROM app.physical_asset WHERE code = '${units.first}'`); const pid = h.asSuper(`SELECT p.id FROM app.planned_asset p JOIN app.room r ON r.id = p.room_id WHERE r.code = '${R}' AND p.code = '${P}'`);
  const ins = await asApp(ids.tenant, "INSERT INTO app.asset_installation (tenant_id, position_id, asset_id, installed_at, removed_at, removal_reason, removed_by, removal_correlation_id, effective_basis, install_reason, installed_by, correlation_id) VALUES ($1,$2,$3, now() - interval '20 years', now() - interval '19 years', 'REMOVED', $4, 'proof', 'RECORDED', 'INITIAL', $4, 'proof')", [ids.tenant, pid, aid, ids.installer]);
  assert.equal(ins.ok, false); assert.equal(ins.code, 'EM009', `even a historical row for a retired unit is refused: ${ins.message}`);
  assert.equal(n(`SELECT count(*) FROM app.audit_event WHERE action = 'commission.asset_replaced' AND outcome = 'DENIED' AND aggregate_id = '${R}'`) >= 1, true, 'the refusal is audited');
});

test('AR-03 — a retirement is final: no way back to service, no second retirement, no identity change (API and database)', async () => {
  const again = await call('installer', 'POST', `/v1/assets/${units.first}/retire`, { body: { reason: 'DISPOSED' } });
  assert.equal(again.status, 422, J(again.body)); assert.match(again.body.detail, /is already retired .*final/);
  const id = await call('installer', 'POST', `/v1/assets/${units.first}/identity`, { body: { state: 'DECLARED', serial: 'SYN-SN-RET-0001' } });
  assert.equal(id.status, 422, J(id.body)); assert.match(id.body.detail, /is retired: its identity is final/);
  const aid = h.asSuper(`SELECT id FROM app.physical_asset WHERE code = '${units.first}'`);
  for (const [sql, why] of [
    ["UPDATE app.physical_asset SET disposition = 'IN_SERVICE', retired_at = NULL, retired_by = NULL, retirement_reason = NULL, retirement_correlation_id = NULL WHERE id = $1", 'back to service'],
    ["UPDATE app.physical_asset SET retirement_note = 'rewritten' WHERE id = $1", 'rewriting the retirement'],
    ["UPDATE app.physical_asset SET identity_state = 'DECLARED', serial = 'SYN-SN-RET-0002', identity_by = identity_by, identity_at = now() WHERE id = $1", 'an identity change after retirement'],
  ]) { const r = await asApp(ids.tenant, sql, [aid]); assert.equal(r.ok, false, why); assert.equal(r.code, 'EM009', `${why}: ${r.message}`); }
  const del = await asApp(ids.tenant, 'DELETE FROM app.physical_asset WHERE id = $1', [aid]);
  assert.equal(del.ok, false); assert.equal(del.code, '42501', 'no DELETE grant: the record is remembered');
});

test('AR-04 — a spare is retired on purpose with its reason; an installed unit cannot be retired (409); the reasons are a closed list', async () => {
  const cur = await current(R, P);
  const keep = await call('installer', 'POST', `/v1/rooms/${R}/positions/${P}/replace`, { body: { expectedInstallation: cur.id, reason: 'synthetic: swap, keep the old one as a spare', outgoing: 'SPARE' } });
  assert.equal(keep.status, 200, J(keep.body)); units.third = keep.body.installed.asset;
  let inv = (await call('syseng', 'GET', '/v1/assets')).body;
  assert.ok(inv.spares.some((x) => x.asset === units.second), 'kept as a spare, in service');
  const installed = await call('installer', 'POST', `/v1/assets/${units.third}/retire`, { body: { reason: 'FAILED' } });
  assert.equal(installed.status, 409, J(installed.body)); assert.match(installed.body.detail, /is installed at .* replace or remove it there first/);
  assert.equal((await call('installer', 'POST', `/v1/assets/${units.second}/retire`, { body: { reason: 'BROKEN' } })).status, 400, 'not one of the reasons');
  const ok = await call('installer', 'POST', `/v1/assets/${units.second}/retire`, { body: { reason: 'RETURNED_TO_VENDOR', note: 'synthetic: RMA' } });
  assert.equal(ok.status, 200, J(ok.body)); assert.deepEqual([ok.body.disposition, ok.body.reason, ok.body.codeReserved], ['RETIRED', 'RETURNED_TO_VENDOR', true]);
  inv = (await call('syseng', 'GET', '/v1/assets')).body;
  assert.ok(!inv.spares.some((x) => x.asset === units.second) && inv.retired.some((x) => x.asset === units.second && x.retired.note === 'synthetic: RMA'));
  assert.equal(n(`SELECT count(*) FROM app.audit_event WHERE action = 'asset.retired' AND outcome = 'ALLOWED' AND aggregate_id = '${units.second}'`), 1);
});

test('AR-05 — codes are never reused: every unit ever registered keeps its code, the next unit gets a new one, a code cannot be inserted twice', async () => {
  const all = h.asSuper("SELECT string_agg(code, ',' ORDER BY code) FROM app.physical_asset").split(',');
  assert.equal(new Set(all).size, all.length, 'no code appears twice');
  for (const u of [units.first, units.second, units.third]) assert.ok(all.includes(u), `${u} is on record`);
  const cur = await current(R, P);
  const next = await call('installer', 'POST', `/v1/rooms/${R}/positions/${P}/replace`, { body: { expectedInstallation: cur.id, reason: 'synthetic: one more swap' } });
  assert.equal(next.status, 200); assert.ok(!all.includes(next.body.installed.asset), 'a new unit never takes a code on record, retired or not');
  const dup = await asApp(ids.tenant, "INSERT INTO app.physical_asset (tenant_id, code, category, model, identity_state, origin, created_by) VALUES ($1, $2, 'bar', 'generic', 'UNKNOWN', 'REGISTERED', $3)", [ids.tenant, units.first, ids.installer]);
  assert.equal(dup.ok, false); assert.equal(dup.code, '23505', 'a retired code cannot be issued again (unique per tenant)');
});

test('AR-06 — authority and tenancy: a designer may not retire (403); another tenant cannot see the units, retired or not (404, absent)', async () => {
  assert.equal((await call('designer', 'POST', `/v1/assets/${units.third}/retire`, { body: { reason: 'DISPOSED' } })).status, 403);
  for (const u of [units.first, units.third]) assert.equal((await c.call('GET', `/v1/assets/${u}/history`, { token: T.x_syseng })).status, 404, u);
  const x = (await c.call('GET', '/v1/assets', { token: T.x_syseng })).body;
  assert.ok(![...x.inService, ...x.spares, ...x.retired].some((r) => [units.first, units.second, units.third].includes(r.asset)), 'another tenant’s inventory names none of these units');
});
