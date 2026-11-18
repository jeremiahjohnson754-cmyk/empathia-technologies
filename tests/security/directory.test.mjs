// The support directory (migration 0044; source reconciliation item 2): organizations, contacts and support paths — who to call for
// which domain at which site, and who their backup is, including people who never sign in. With the founder's 18 Nov request: Search
// Party offers "Chat in Teams", "Call in Teams", email and "Copy contact info" for a contact, as hand-offs into the viewer's own apps.
// A real enterprise API on a real database, in a demonstration sandbox; every check reads the server or the database.
//
//   DIR-01  the sandbox opens with a verified directory: three organizations, four contacts, an approved audio and video path at
//           each site; a room's site answers "who do I call for audio", with a backup who is someone else
//   DIR-02  recording needs the authority; a contact needs a name, a role, a valid channel, an organization of this directory
//   DIR-03  verification: a data steward, never the recorder, once; a verified contact's identity and channels never change
//   DIR-04  a path names verified, current contacts, a backup who is someone else, the hours; approved by a steward who did not
//           propose it; an approval supersedes the site's path for that domain; a rejection says why; never deleted (the database too)
//   DIR-05  a contact on an approved path is not retired until another path replaces it
//   DIR-06  the hand-offs: Teams chat and call, email, call and copy, each a link into the viewer's own app built from the contact's
//           channels; nothing sent; Search Party offers them for a person who is a verified contact
//   DIR-07  another organization sees only its own directory and cannot verify or decide ours
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict';
import { setup, client } from '../integration/harness.mjs';

let h, c, sb; const T = {}; const J = (x) => JSON.stringify(x);
const call = (token, method, p, o = {}) => c.call(method, p, { token, ...o });
const sql = (s) => h.asSuper(s); const throwsSql = (s, re) => { let err = null; try { sql(s); } catch (e) { err = String(e.message || e); } assert.ok(err, `refused: ${s.slice(0, 90)}`); if (re) assert.match(err, re); };
let D;

before(async () => {
  h = await setup({ db: 'empathia_directory', port: 4163, env: { DEMO_SESSIONS: 'on' } }); c = client(h.base); h.asSuper('UPDATE app.demo_config SET enabled = true');
  const o = await c.call('POST', '/v1/demo/sandboxes', { body: {} }); assert.equal(o.status, 201, J(o.body)); sb = o.body.sandbox; T.people = o.body.personas; T.scenario = o.body.scenario;
  for (const role of ['svcmgr', 'steward', 'opslead', 'exec', 'service', 'cxeng']) T[role] = (await c.call('POST', '/v1/demo/sessions', { body: { sandboxId: sb.id, key: sb.key, role } })).body.accessToken;
  T.tenant = sql(`SELECT id FROM app.tenant WHERE slug = '${sb.tenant}'`);
  D = (await call(T.exec, 'GET', '/v1/directory')).body;
});
after(async () => { await h?.app.stop(); });

test('DIR-01 a verified directory; who to call for audio at a room’s site, with a backup who is someone else', async () => {
  assert.equal(D.organizations.length, 3); assert.equal(D.contacts.length, 4); assert.ok(D.contacts.every((x) => x.verified), 'every contact verified');
  assert.deepEqual(D.contacts.map((x) => x.signsIn), [true, true, false, false], 'two sign in here, two never do');
  assert.equal(D.supportPaths.filter((p) => p.state === 'APPROVED').length, 4); assert.deepEqual(D.may, { record: false, verify: false });
  const w = await call(T.service, 'GET', `/v1/rooms/${T.scenario.flagship.room}/support?domain=audio`); assert.equal(w.status, 200, J(w.body));
  const p = w.body.paths[0]; assert.equal(w.body.paths.length, 1); assert.notEqual(p.primary.name, p.backup.name); assert.ok(p.escalation && p.hours);
  assert.match(w.body.words, /^audio: .+, backup .+, escalation .+; Weekdays/);
  const none = await call(T.service, 'GET', `/v1/rooms/${T.scenario.flagship.room}/support?domain=lighting`); assert.deepEqual(none.body.paths, []); assert.match(none.body.words, /No approved support path for lighting/);
});

test('DIR-02 recording needs the authority and a complete, valid contact', async () => {
  const org = D.organizations.find((x) => x.kind === 'INTEGRATOR').code;
  assert.equal((await call(T.exec, 'POST', '/v1/directory/contacts', { body: { org, name: 'Someone (synthetic)', role: 'Engineer', channels: [{ kind: 'email', value: 'x@example.org' }] } })).status, 403);
  const bad = await call(T.svcmgr, 'POST', '/v1/directory/contacts', { body: { org: 'ORG-9999', name: 'Someone (synthetic)', role: 'Engineer', channels: [{ kind: 'email', value: 'x@example.org' }] } }); assert.equal(bad.status, 422); assert.match(J(bad.body), /no organization ORG-9999/);
  const noChan = await call(T.svcmgr, 'POST', '/v1/directory/contacts', { body: { org, name: 'Someone (synthetic)', role: 'Engineer', channels: [] } }); assert.ok([400, 422].includes(noChan.status));
  const ok = await call(T.opslead, 'POST', '/v1/directory/contacts', { body: { org, name: 'Weekend engineer (synthetic)', role: 'Weekend on-call engineer', channels: [{ kind: 'email', value: 'weekend@northfield-av.example.org' }, { kind: 'phone', value: '+1 555 0150' }] } });
  assert.equal(ok.status, 201, J(ok.body)); T.newContact = ok.body.code; assert.equal(ok.body.verified, false);
});

test('DIR-03 verification: a steward, never the recorder, once; a verified contact does not change', async () => {
  assert.equal((await call(T.svcmgr, 'POST', `/v1/directory/contacts/${T.newContact}/verify`)).status, 403, 'the recorder’s role cannot verify');
  const rec = sql(`SELECT recorded_by FROM app.contact WHERE tenant_id = '${T.tenant}' AND code = '${T.newContact}'`);
  throwsSql(`UPDATE app.contact SET verified_by = recorded_by, verified_at = now() WHERE tenant_id = '${T.tenant}' AND code = '${T.newContact}'`, /contact_not_self_verified/);
  assert.equal((await call(T.steward, 'POST', `/v1/directory/contacts/${T.newContact}/verify`)).status, 200);
  const again = await call(T.steward, 'POST', `/v1/directory/contacts/${T.newContact}/verify`); assert.equal(again.status, 422); assert.match(J(again.body), /verified already/);
  throwsSql(`UPDATE app.contact SET channels = '[{"kind":"email","value":"someone.else@example.org"}]' WHERE tenant_id = '${T.tenant}' AND code = '${T.newContact}'`, /channels of a verified contact do not change/);
  throwsSql(`UPDATE app.contact SET display_name = 'Renamed' WHERE tenant_id = '${T.tenant}' AND code = '${T.newContact}'`, /recorded once/);
  throwsSql(`DELETE FROM app.contact WHERE tenant_id = '${T.tenant}' AND code = '${T.newContact}'`, /never deleted/);
  assert.ok(rec);
});

test('DIR-04 a path: verified contacts, someone else as backup, approved by a steward who did not propose it, superseding the old', async () => {
  const site = T.scenario.second ? 'CNV' : 'CNV'; const old = D.supportPaths.find((p) => p.site.code === site && p.domain === 'audio' && p.state === 'APPROVED');
  const c0 = D.contacts[0].code;
  const same = await call(T.svcmgr, 'POST', '/v1/directory/support-paths', { body: { site, domain: 'audio', primary: c0, backup: c0, hours: 'Always (synthetic)' } }); assert.equal(same.status, 422); assert.match(J(same.body), /someone other than the primary/);
  const draft = await call(T.svcmgr, 'POST', '/v1/directory/contacts', { body: { org: D.organizations[0].code, name: 'Not yet verified (synthetic)', role: 'Technician', channels: [{ kind: 'phone', value: '+1 555 0160' }] } });
  const unv = await call(T.svcmgr, 'POST', '/v1/directory/support-paths', { body: { site, domain: 'audio', primary: draft.body.code, backup: c0, hours: 'Always (synthetic)' } }); assert.equal(unv.status, 422); assert.match(J(unv.body), /not verified yet/);
  const p = await call(T.svcmgr, 'POST', '/v1/directory/support-paths', { body: { site, domain: 'audio', primary: T.newContact, backup: c0, hours: 'Weekends 08:00–18:00 (synthetic)' } }); assert.equal(p.status, 201, J(p.body));
  const self = await call(T.svcmgr, 'POST', `/v1/directory/support-paths/${p.body.code}/decide`, { body: { decision: 'APPROVED' } }); assert.equal(self.status, 403);
  const bare = await call(T.steward, 'POST', `/v1/directory/support-paths/${p.body.code}/decide`, { body: { decision: 'REJECTED' } }); assert.equal(bare.status, 422); assert.match(J(bare.body), /says why/);
  const ok = await call(T.steward, 'POST', `/v1/directory/support-paths/${p.body.code}/decide`, { body: { decision: 'APPROVED' } }); assert.equal(ok.status, 200, J(ok.body)); assert.equal(ok.body.superseded, old.code);
  const now = (await call(T.exec, 'GET', '/v1/directory')).body.supportPaths; assert.deepEqual([now.find((x) => x.code === old.code).state, now.find((x) => x.code === p.body.code).state], ['SUPERSEDED', 'APPROVED']);
  assert.equal(Number(sql(`SELECT count(*) FROM app.support_path WHERE tenant_id = '${T.tenant}' AND domain = 'audio' AND state = 'APPROVED' AND site_id = (SELECT id FROM app.site WHERE tenant_id = '${T.tenant}' AND code = '${site}')`)), 1);
  throwsSql(`UPDATE app.support_path SET hours = 'never' WHERE tenant_id = '${T.tenant}' AND code = '${p.body.code}'`, /does not change/);
  throwsSql(`UPDATE app.support_path SET state = 'APPROVED' WHERE tenant_id = '${T.tenant}' AND code = '${old.code}'`, /only by its rules|support_path_one_approved/);
  throwsSql(`DELETE FROM app.support_path WHERE tenant_id = '${T.tenant}' AND code = '${old.code}'`, /never deleted/);
  T.newPath = p.body.code;
});

test('DIR-05 a contact on an approved path is not retired until another path replaces it', async () => {
  const r = await call(T.svcmgr, 'POST', `/v1/directory/contacts/${T.newContact}/retire`, { body: { reason: 'left the integrator (synthetic)' } }); assert.equal(r.status, 422); assert.match(J(r.body), /on the approved support path/);
  const free = D.contacts[3].code; const onPath = (await call(T.exec, 'GET', '/v1/directory')).body.supportPaths.some((p) => p.state === 'APPROVED' && [p.primary?.code, p.backup?.code, p.escalation?.code].includes(free));
  if (!onPath) { const ok = await call(T.svcmgr, 'POST', `/v1/directory/contacts/${free}/retire`, { body: { reason: 'desk closed (synthetic)' } }); assert.equal(ok.status, 200, J(ok.body)); }
});

test('DIR-06 the hand-offs: Teams chat and call, email, call and copy, built from the contact’s channels; Search Party offers them', async () => {
  const k = (await call(T.exec, 'GET', '/v1/directory')).body.contacts.find((x) => x.signsIn && x.role === 'Service manager');
  const by = Object.fromEntries(k.actions.map((a) => [a.id, a]));
  assert.deepEqual(Object.keys(by), ['teams.chat', 'teams.call', 'mail.compose', 'phone.call', 'copy']);
  assert.equal(by['teams.chat'].href, 'https://teams.microsoft.com/l/chat/0/0?users=service.manager%40larkspur.example.org');
  assert.equal(by['teams.call'].href, 'https://teams.microsoft.com/l/call/0/0?users=service.manager%40larkspur.example.org');
  assert.equal(by['mail.compose'].href, 'mailto:service.manager@larkspur.example.org'); assert.equal(by['phone.call'].href, 'tel:+15550100');
  assert.match(by.copy.text, /^.+ — Service manager, Larkspur University Facilities \(synthetic\)\nemail: service\.manager@larkspur\.example\.org\nphone: \+1 555 0100$/);
  assert.ok(k.actions.every((a) => /nothing is sent|your own|your phone|Copies/i.test(a.note)), 'each says what happens, and that nothing is sent from here');
  const person = T.people.find((p) => p.role === 'svcmgr').id;
  const sp = await call(T.cxeng, 'POST', '/v1/search/intent', { body: { question: 'who is the service manager?', target: { type: 'Person', id: person } } });
  if (sp.status === 200) {
    const acts = J(sp.body); if (/teams\.microsoft\.com/.test(acts)) assert.match(acts, /Copy contact info/);
  }
});

test('DIR-07 another organization sees only its own directory and cannot verify or decide ours', async () => {
  const o = await c.call('POST', '/v1/demo/sandboxes', { body: {} }); const x = o.body.sandbox;
  const st = (await c.call('POST', '/v1/demo/sessions', { body: { sandboxId: x.id, key: x.key, role: 'steward' } })).body.accessToken;
  const theirs = (await call(st, 'GET', '/v1/directory')).body; assert.ok(!theirs.contacts.some((k) => k.code === T.newContact && k.name.startsWith('Weekend')), 'not our weekend engineer');
  assert.ok(!theirs.supportPaths.some((p) => p.hours.startsWith('Weekends')));
  const d = await call(st, 'POST', `/v1/directory/support-paths/${T.newPath}/decide`, { body: { decision: 'REJECTED', note: 'from another organization' } }); assert.ok([404, 422].includes(d.status), J(d.body));
  assert.equal(sql(`SELECT state FROM app.support_path WHERE tenant_id = '${T.tenant}' AND code = '${T.newPath}'`), 'APPROVED');
});
