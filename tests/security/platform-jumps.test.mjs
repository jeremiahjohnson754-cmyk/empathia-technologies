// Platform jumps (migration 0047; founder, 18 Nov 2026, 07:49: "add jumps to XiO Cloud, Utelogy, teams pro portal, M365, SharePoint,
// Xyte, Q-SYS, Dante, Appspace, digital signage platforms, Sennheiser, Autodesk, ServiceNow"). A jump is a link the organization points at
// its own portal; it exchanges no data and is not an integration. A real enterprise API on a real database; every address is synthetic
// (example.com hosts, RFC 2606) except the two vendor sign-in addresses the vendor's own documentation gives.
//
//   PJ-01  the catalogue: anyone signed in reads it, with where each jump goes; only documented vendor addresses are offered by default;
//          the note says it is not an integration; who may change it is the server's answer
//   PJ-02  the organization's address: set by the operations lead or the security administrator, audited; refused to everyone else, and
//          refused for anything but https on a named host (http, javascript:, data:, spaces, quotes), an unknown platform, a long address
//   PJ-03  one room's or one unit's own address: recorded by someone who designs, installs, serves or triages it; a new one replaces the
//          old, which is kept; a recorded address is never edited (the database refuses); an unknown room or unit is not found
//   PJ-04  isolation: another organization reads none of this one's addresses and cannot record against its rooms
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict';
import { setup, client } from '../integration/harness.mjs';

let h, c; const T = {}; const J = (x) => JSON.stringify(x); let ROOM; const UNIT = 'AS-9900047';
const call = (who, method, p, body) => c.call(method, p, { token: T[who], body });

before(async () => {
  h = await setup({ db: 'empathia_test_jumps', port: 4166 }); c = client(h.base);
  for (const r of ['requestor', 'service', 'designer', 'installer', 'svcmgr', 'opslead', 'secadmin', 'exec', 'steward']) T[r] = await c.login(r);
  T.other = await c.login('secadmin', 'second-tenant'); T.other_designer = await c.login('designer', 'second-tenant');
  ROOM = (await call('designer', 'GET', '/v1/rooms')).body.items[0].code;
  h.asSuper(`INSERT INTO app.physical_asset (tenant_id, code, category, model, origin, created_by) SELECT t.id, '${UNIT}', 'dsp', 'Synthetic signal processor', 'REGISTERED', (SELECT m.person_id FROM app.membership m WHERE m.tenant_id = t.id LIMIT 1) FROM app.tenant t WHERE t.slug = 'empathia-demo'`);
});
after(async () => { await h?.app.stop(); });

test('PJ-01 the catalogue: read by anyone signed in, documented defaults only, not an integration', async () => {
  const r = await call('requestor', 'GET', '/v1/platforms'); assert.equal(r.status, 200, J(r.body));
  const keys = r.body.items.map((x) => x.key);
  for (const k of ['xio-cloud', 'utelogy', 'teams-rooms-pro', 'm365-admin', 'sharepoint', 'xyte', 'q-sys-reflect', 'dante', 'appspace', 'signage', 'sennheiser', 'autodesk', 'servicenow']) assert.ok(keys.includes(k), k);
  assert.match(r.body.note, /not an integration/); assert.match(r.body.note, /no certification or partnership/);
  const defaults = r.body.items.filter((x) => x.opens).map((x) => [x.key, x.opens, x.defaultUrl?.source]);
  assert.deepEqual(defaults.map((d) => d[0]).sort(), ['m365-admin', 'teams-rooms-pro'], 'only the two addresses the vendor documents for every customer');
  for (const [, url, src] of defaults) { assert.match(url, /^https:\/\/[a-z.]+\.microsoft\.com\/$/); assert.match(src, /^https:\/\/learn\.microsoft\.com\//); }
  assert.equal(r.body.may.configure, false); assert.equal(r.body.may.record, false);
  assert.equal((await call('opslead', 'GET', '/v1/platforms')).body.may.configure, true);
  assert.equal((await call('secadmin', 'GET', '/v1/platforms')).body.may.configure, true);
  assert.equal((await call('designer', 'GET', '/v1/platforms')).body.may.record, true);
  assert.equal((await c.call('GET', '/v1/platforms')).status, 401, 'not without signing in');
});

test('PJ-02 the organization’s address: the operations lead or the security administrator, audited; https on a named host only', async () => {
  for (const who of ['requestor', 'service', 'designer', 'installer', 'svcmgr', 'exec', 'steward']) {
    const r = await call(who, 'PUT', '/v1/platforms/xio-cloud', { url: 'https://xio.example.com/portal' }); assert.equal(r.status, 403, `${who}: ${J(r.body)}`);
  }
  const ok = await call('opslead', 'PUT', '/v1/platforms/xio-cloud', { url: 'https://xio.example.com/portal', label: 'Our device cloud (synthetic)' }); assert.equal(ok.status, 200, J(ok.body));
  const x = (await call('requestor', 'GET', '/v1/platforms')).body.items.find((i) => i.key === 'xio-cloud'); assert.equal(x.opens, 'https://xio.example.com/portal'); assert.equal(x.configured.label, 'Our device cloud (synthetic)');
  assert.equal(h.asSuper("SELECT count(*) FROM app.audit_event WHERE action = 'platform.link' AND aggregate_id = 'xio-cloud' AND outcome = 'ALLOWED'"), '1');
  // the organization's own address replaces a documented default; turned off, the jump goes nowhere
  assert.equal((await call('secadmin', 'PUT', '/v1/platforms/teams-rooms-pro', { url: 'https://rooms.example.com/', enabled: false })).status, 200);
  const t = (await call('requestor', 'GET', '/v1/platforms')).body.items.find((i) => i.key === 'teams-rooms-pro'); assert.equal(t.opens, null); assert.equal(t.configured.enabled, false);
  for (const bad of ['http://xio.example.com/', 'javascript:alert(1)', 'data:text/html,hi', 'https://xio.example.com/a b', 'https://xio.example.com/"x', 'https:///nohost', 'https://' + 'a'.repeat(300) + '.example.com/', 'ftp://example.com/x']) {
    const r = await call('opslead', 'PUT', '/v1/platforms/xio-cloud', { url: bad }); assert.ok([400, 422].includes(r.status), `${bad}: ${r.status} ${J(r.body)}`);
  }
  assert.equal((await call('opslead', 'PUT', '/v1/platforms/not-a-platform', { url: 'https://example.com/' })).status, 404);
  assert.equal((await call('requestor', 'GET', '/v1/platforms')).body.items.find((i) => i.key === 'xio-cloud').opens, 'https://xio.example.com/portal', 'a refused change leaves the address as it was');
});

test('PJ-03 a room’s and a unit’s own address: recorded by the people who work on it, replaced never edited', async () => {
  assert.equal((await call('requestor', 'POST', `/v1/rooms/${ROOM}/platforms`, { platform: 'q-sys-reflect', url: 'https://reflect.example.com/sites/1' })).status, 403);
  assert.equal((await call('exec', 'POST', `/v1/rooms/${ROOM}/platforms`, { platform: 'q-sys-reflect', url: 'https://reflect.example.com/sites/1' })).status, 403);
  const a = await call('designer', 'POST', `/v1/rooms/${ROOM}/platforms`, { platform: 'q-sys-reflect', url: 'https://reflect.example.com/sites/1' }); assert.equal(a.status, 201, J(a.body));
  const b = await call('svcmgr', 'POST', `/v1/rooms/${ROOM}/platforms`, { platform: 'q-sys-reflect', url: 'https://reflect.example.com/sites/2' }); assert.equal(b.status, 201, J(b.body));
  const j = (await call('requestor', 'GET', `/v1/rooms/${ROOM}/platforms`)).body;
  const q = j.items.find((i) => i.key === 'q-sys-reflect'); assert.equal(q.opens, 'https://reflect.example.com/sites/2'); assert.equal(q.own, true);
  assert.ok(j.items.some((i) => i.key === 'xio-cloud' && !i.own && i.opens === 'https://xio.example.com/portal'), 'the organization’s portal where the room has no address of its own');
  assert.ok(j.unset.some((i) => i.key === 'servicenow'), 'what nobody has set is listed as not set, not as a link');
  assert.equal(h.asSuper(`SELECT count(*) FILTER (WHERE replaced_at IS NULL) || '/' || count(*) FROM app.platform_ref WHERE subject = 'room' AND subject_ref = '${ROOM}'`), '1/2', 'the first address is kept, replaced');
  assert.throws(() => h.asSuper(`UPDATE app.platform_ref SET url = 'https://evil.example.com/' WHERE subject_ref = '${ROOM}' AND replaced_at IS NULL`), /never edited/);
  assert.ok([400, 422].includes((await call('designer', 'POST', `/v1/rooms/${ROOM}/platforms`, { platform: 'q-sys-reflect', url: 'http://reflect.example.com/' })).status));
  assert.equal((await call('designer', 'GET', '/v1/rooms/R-NOPE-9999/platforms')).status, 404);
  // a unit: recorded by an installer, read by anyone signed in
  const u = await call('installer', 'POST', `/v1/assets/${UNIT}/platforms`, { platform: 'dante', url: 'https://dante.example.com/devices/42' }); assert.equal(u.status, 201, J(u.body));
  assert.equal((await call('requestor', 'GET', `/v1/assets/${UNIT}/platforms`)).body.items.find((i) => i.key === 'dante').opens, 'https://dante.example.com/devices/42');
  assert.equal((await call('installer', 'GET', '/v1/assets/AS-0000001/platforms')).status, 404);
  assert.ok([400, 422].includes((await call('installer', 'POST', `/v1/assets/${UNIT}/platforms`, { platform: 'autodesk', url: 'https://acc.example.com/' })).status), 'a project’s drawings are not a unit’s platform');
  assert.ok(Number(h.asSuper("SELECT count(*) FROM app.audit_event WHERE action = 'platform.ref' AND outcome = 'ALLOWED'")) >= 3);
});

test('PJ-04 another organization reads none of these addresses and cannot record against these rooms', async () => {
  const o = (await call('other', 'GET', '/v1/platforms')).body; assert.equal(o.items.find((i) => i.key === 'xio-cloud').opens, null);
  assert.equal(o.items.find((i) => i.key === 'teams-rooms-pro').opens, 'https://portal.rooms.microsoft.com/', 'the other organization still has the documented default, not this one’s setting');
  assert.equal((await call('other_designer', 'GET', `/v1/rooms/${ROOM}/platforms`)).status, 404);
  assert.equal((await call('other_designer', 'POST', `/v1/rooms/${ROOM}/platforms`, { platform: 'q-sys-reflect', url: 'https://x.example.com/' })).status, 404);
  assert.equal((await call('other_designer', 'GET', `/v1/assets/${UNIT}/platforms`)).status, 404);
  assert.equal(h.asSuper("SELECT count(*) FROM app.platform_ref r JOIN app.tenant t ON t.id = r.tenant_id WHERE t.slug = 'second-tenant'"), '0');
});
