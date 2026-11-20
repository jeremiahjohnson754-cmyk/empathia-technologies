// Vocabulary from the founder's workbooks (migration 0046; source reconciliation item 7): user impact on a deficiency, region and zone
// on a site. A real enterprise API on a real database.
//
//   VOC-01  the user impact of a deficiency: recorded by someone who opens or assigns issues, with why; each change an issue event;
//           refused without why, unchanged, by a role without the authority, and for an incident (whose impact is its report's)
//   VOC-02  a site's region and zone: named by an administrator, audited, read wherever sites are listed; refused to anyone else
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict';
import { setup, client } from '../integration/harness.mjs';

let h, c; const T = {}; const J = (x) => JSON.stringify(x); let ISSUE, SITE;
const call = (who, method, p, body) => c.call(method, p, { token: T[who], body });

before(async () => {
  h = await setup({ db: 'empathia_test_vocabulary', port: 4165 }); c = client(h.base);
  for (const r of ['designer', 'cxeng', 'opslead', 'exec', 'secadmin']) T[r] = await c.login(r);
  const r = await call('designer', 'POST', '/v1/rooms', { name: 'Vocabulary huddle (synthetic)', template: 'huddle', buildingCode: 'NST', floor: 1 }); assert.equal(r.status, 201, J(r.body));
  await call('designer', 'POST', `/v1/rooms/${r.body.code}/devices`, { category: 'camera', x: 0.1, y: 0.1 });   // a second camera with nothing to do raises design issues
  const issues = (await call('cxeng', 'GET', `/v1/rooms/${r.body.code}`)).body.issues || [];
  ISSUE = issues.find((i) => i.state === 'OPEN')?.code; assert.ok(ISSUE, `an open design issue: ${J(issues.map((i) => i.code))}`);
  SITE = (await call('exec', 'GET', '/v1/sites')).body.items[0].code;
});
after(async () => { await h?.app.stop(); });

test('VOC-01 the user impact of a deficiency: with why, an issue event each time, refused otherwise', async () => {
  assert.equal((await call('exec', 'POST', `/v1/issues/${ISSUE}/impact`, { impact: 'major_disruption', why: 'the lecture cannot be streamed' })).status, 403);
  const bare = await call('cxeng', 'POST', `/v1/issues/${ISSUE}/impact`, { impact: 'major_disruption', why: '' }); assert.equal(bare.status, 422); assert.match(J(bare.body), /say why/);
  const ok = await call('cxeng', 'POST', `/v1/issues/${ISSUE}/impact`, { impact: 'major_disruption', why: 'the remote students lose the far end (synthetic)' }); assert.equal(ok.status, 200, J(ok.body)); assert.equal(ok.body.was, null);
  const same = await call('opslead', 'POST', `/v1/issues/${ISSUE}/impact`, { impact: 'major_disruption', why: 'as before (synthetic)' }); assert.equal(same.status, 422); assert.match(J(same.body), /already recorded/);
  const down = await call('opslead', 'POST', `/v1/issues/${ISSUE}/impact`, { impact: 'minor_annoyance', why: 'a workaround is in place (synthetic)' }); assert.equal(down.status, 200);
  const d = (await call('cxeng', 'GET', `/v1/issues/${ISSUE}/deficiency`)).body; assert.equal(d.userImpact, 'minor_annoyance');
  const ev = h.asSuper(`SELECT string_agg(detail->>'to', ',' ORDER BY at) FROM app.issue_event WHERE kind = 'impact' AND issue_id = (SELECT id FROM app.room_issue WHERE code = '${ISSUE}' AND tenant_id = (SELECT id FROM app.tenant WHERE slug = 'empathia-demo'))`);
  assert.equal(ev, 'major_disruption,minor_annoyance');
  const bad = await call('cxeng', 'POST', `/v1/issues/${ISSUE}/impact`, { impact: 'apocalyptic', why: 'synthetic' }); assert.ok([400, 422].includes(bad.status));
});

test('VOC-02 a site’s region and zone: an administrator names them; read with the sites; refused to anyone else', async () => {
  assert.equal((await call('opslead', 'PATCH', `/v1/sites/${SITE}`, { region: 'Midwest', zone: 'North campus' })).status, 403);
  const ok = await call('secadmin', 'PATCH', `/v1/sites/${SITE}`, { region: 'Midwest (synthetic)', zone: 'North campus (synthetic)' }); assert.equal(ok.status, 200, J(ok.body));
  const s = (await call('exec', 'GET', '/v1/sites')).body.items.find((x) => x.code === SITE); assert.deepEqual([s.region, s.zone], ['Midwest (synthetic)', 'North campus (synthetic)']);
  assert.ok(Number(h.asSuper(`SELECT count(*) FROM app.audit_event WHERE action = 'site.place' AND aggregate_id = '${SITE}' AND outcome = 'ALLOWED'`)) >= 1);
  const long = await call('secadmin', 'PATCH', `/v1/sites/${SITE}`, { region: 'x'.repeat(61) }); assert.ok([400, 422].includes(long.status));
});
