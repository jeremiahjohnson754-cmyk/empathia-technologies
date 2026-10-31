/**
 * Search Party over real HTTP and PostgreSQL (P4-A): discovery, facets, neighbourhood, path and intents on the caller's visible
 * catalogue — and the negative side: a site-scoped member cannot find, count, traverse to, path through or ask about records of
 * another site; a second tenant sees nothing of this one; the person directory is not exposed through search; a question the graph
 * cannot answer is UNKNOWN with the reason, never a manufactured answer.
 *   node --test tests/security/search-party.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client } from '../integration/harness.mjs';

let h, c, T = {}, northRoom, southRoom, southWo, northIssue;
before(async () => {
  h = await setup({ db: 'empathia_test_search', port: 4197 }); c = client(h.base);
  for (const r of ['designer', 'syseng', 'secadmin', 'svcmgr', 'requestor']) T[r] = await c.login(r);
  T.south = await c.login('service', 'empathia-demo', 'service-south'); T.other = await c.login('secadmin', 'second-tenant');
  const tenant = h.asSuper("SELECT id FROM app.tenant WHERE slug = 'empathia-demo'");
  const who = h.asSuper("SELECT id FROM app.person WHERE email = 'svcmgr@empathia-demo.empathia.invalid'");
  const mk = (bld, n) => { const room = h.asSuper(`SELECT r.id FROM app.room r JOIN app.building b ON b.id = r.building_id WHERE b.code = '${bld}' ORDER BY r.code LIMIT 1`); const code = h.asSuper(`SELECT code FROM app.room WHERE id = '${room}'`);
    const issue = h.asSuper(`INSERT INTO app.room_issue (tenant_id, room_id, code, key, category, check_name, severity, title, rationale, first_seen_rev, last_seen_rev) VALUES ('${tenant}', '${room}', 'ISS-SP-${n}', 'sp-${n}', 'DESIGN_DEFICIENCY', 'synthetic', 'Medium', 'Synthetic search issue ${n}', 'fixture', 1, 1) RETURNING id`);
    h.asSuper(`INSERT INTO app.work_order (tenant_id, issue_id, code, assigned_role, created_by) VALUES ('${tenant}', '${issue}', 'WO-SP-${n}', 'service', '${who}')`);
    return { room, code, issue: `ISS-SP-${n}`, wo: `WO-SP-${n}` }; };
  const n = mk('ATL', 1); const s = mk('HZN', 2); northRoom = n.code; southRoom = s.code; southWo = s.wo; northIssue = n.issue;
});
after(async () => { await h?.app.stop(); });

test('SP-1 — search ranks, counts facets, lists coverage and the supported intents; type filter and facet filter narrow the set', async () => {
  const r = await c.call('GET', `/v1/search?q=${encodeURIComponent(northRoom)}`, { token: T.designer });
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.items[0].id, northRoom); assert.equal(r.body.items[0].matched, 'id');
  const all = await c.call('GET', '/v1/search?q=', { token: T.designer });
  assert.ok(all.body.total >= 10); assert.ok(all.body.facets.type.Room >= 3 && all.body.facets.type.PlannedAsset >= 5 && all.body.facets.type.RoomIssue >= 2 && all.body.facets.type.WorkOrder >= 2, JSON.stringify(all.body.facets.type));
  assert.ok(all.body.coverage.notes.some((x) => /not modelled/.test(x)), 'coverage is honest about what is not modelled');
  assert.ok(all.body.intents.length >= 8);
  const typed = await c.call('GET', '/v1/search?q=&type=WorkOrder&state=OPEN', { token: T.designer });
  assert.equal(typed.body.total, 2); assert.ok(typed.body.items.every((i) => i.type === 'WorkOrder'));
  const south = await c.call('GET', '/v1/search?q=&type=Room&site=SITE-SOUTH', { token: T.designer });
  assert.ok(south.body.items.every((i) => i.facets.site === 'SITE-SOUTH') && south.body.total >= 1);
  const miss = await c.call('GET', '/v1/search?q=zzz-nothing', { token: T.designer }); assert.equal(miss.body.total, 0); assert.deepEqual(miss.body.facets.type, {});
});

test('SP-2 — neighbourhood: a room reaches its building, site, devices, issue, work order and assigned role, each edge with provenance; layout is bounded and deterministic', async () => {
  const g = await c.call('GET', `/v1/search/graph/Room/${northRoom}?depth=3`, { token: T.designer });
  assert.equal(g.status, 200, JSON.stringify(g.body));
  const types = new Set(g.body.nodes.map((n) => n.type));
  for (const t of ['Room', 'Building', 'Site', 'PlannedAsset', 'RoomIssue', 'WorkOrder', 'PersonRole']) assert.ok(types.has(t), `${t} reachable: ${[...types].join(',')}`);
  assert.ok(g.body.edges.every((e) => e.provenance && e.label && e.inverse));
  assert.ok(g.body.edges.some((e) => /DERIVED/.test(e.provenance)) && g.body.edges.some((e) => /DECLARED|MODELED/.test(e.provenance)));
  assert.equal(g.body.layout.length, g.body.nodes.length); assert.ok(g.body.layout.every((p) => p.x >= 0 && p.x <= 900 && p.y >= 0 && p.y <= 600));
  const g2 = await c.call('GET', `/v1/search/graph/Room/${northRoom}?depth=3`, { token: T.designer }); assert.deepEqual(g2.body.layout, g.body.layout);
  assert.equal((await c.call('GET', '/v1/search/graph/Room/R-NOPE-0001', { token: T.designer })).status, 404);
  assert.equal((await c.call('GET', `/v1/search/graph/Room/${northRoom}?depth=9`, { token: T.designer })).status, 400);
});

test('SP-3 — path: the shortest recorded path between a work order and its site; an unconnected pair says so', async () => {
  const p = await c.call('GET', `/v1/search/path?from=WorkOrder:${southWo}&to=Site:SITE-SOUTH`, { token: T.designer });
  assert.equal(p.status, 200, JSON.stringify(p.body)); assert.equal(p.found, undefined); assert.equal(p.body.found, true); assert.ok(p.body.hops >= 3 && p.body.hops <= 5, `hops ${p.body.hops}`);
  assert.ok(p.body.path.every((e) => e.provenance && e.label));
  assert.equal((await c.call('GET', `/v1/search/path?from=WorkOrder:${southWo}&to=Site:NOPE`, { token: T.designer })).status, 404);
  assert.equal((await c.call('GET', `/v1/search/path?from=garbage&to=Site:SITE-SOUTH`, { token: T.designer })).status, 400);
});

test('SP-4 — intents answer from records or say UNKNOWN: dependency through recorded edges; approvals from the audit; authority holders with SoD exclusions; vendors/ownership/skills honestly unmodelled', async () => {
  const ask = (question, target) => c.call('POST', '/v1/search/intent', { token: T.syseng, body: { question, target } });
  const dev = (await c.call('GET', `/v1/search/graph/Room/${northRoom}?depth=1`, { token: T.syseng })).body.nodes.find((n) => n.type === 'PlannedAsset');
  const dep = await ask('If this device fails, what is affected?', { type: 'PlannedAsset', id: dev.id });
  assert.equal(dep.status, 200, JSON.stringify(dep.body)); assert.equal(dep.body.intent, 'depends'); assert.ok(['ANSWERED', 'UNKNOWN'].includes(dep.body.status)); assert.ok(dep.body.uncertainty.length);
  // approve the classification, then ask who approved
  assert.equal((await c.call('POST', `/v1/rooms/${northRoom}/classification/approve`, { token: T.syseng, body: {} })).status, 200);
  const ap = await ask('Which engineer approved the current design?', { type: 'Room', id: northRoom });
  assert.equal(ap.body.status, 'ANSWERED'); assert.equal(ap.body.confidence, 'OBSERVED'); assert.match(ap.body.summary, /classification .*approved by Systems Engineer/);
  const who = await ask('Who can approve this commissioning exception?', { type: 'Room', id: northRoom });
  assert.equal(who.body.status, 'ANSWERED'); assert.ok(who.body.items.some((i) => /Systems Engineer/.test(i.label))); assert.ok(!who.body.items.some((i) => /Designer/.test(i.label)), 'a designer holds no baseline.approve');
  const vendor = await ask('Which vendor supports this system?', { type: 'PlannedAsset', id: dev.id }); assert.equal(vendor.body.status, 'UNKNOWN'); assert.match(vendor.body.uncertainty[0], /not yet captured/);
  const own = await ask('Who is responsible for this room?', { type: 'Room', id: northRoom }); assert.equal(own.body.status, 'UNKNOWN');
  const diff = await ask('What changed between baseline v1 and v2?', { type: 'Room', id: northRoom }); assert.equal(diff.body.status, 'UNKNOWN'); assert.match(diff.body.summary, /no baseline/);
  const byCode = await ask(`who approved ${northRoom}`); assert.equal(byCode.body.target?.id, northRoom, 'a code in the question resolves the target');
  const none = await ask('Tell me a joke'); assert.equal(none.body.intent, 'none'); assert.equal(none.body.status, 'UNKNOWN');
  const contact = await ask('Who is responsible for this issue?', { type: 'RoomIssue', id: northIssue }); assert.ok(!contact.body.actions.some((a) => a.available && a.kind === 'teams'), 'no pretend Teams message');
});

test('SP-5 — a South-scoped technician cannot find, count, traverse to, path through or ask about North records; the second tenant sees nothing of this estate', async () => {
  const s = await c.call('GET', '/v1/search?q=', { token: T.south });
  assert.equal(s.status, 200); assert.ok(s.body.items.every((i) => !i.facets?.site || i.facets.site === 'SITE-SOUTH'), JSON.stringify(s.body.items.filter((i) => i.facets?.site && i.facets.site !== 'SITE-SOUTH').slice(0, 3)));
  assert.ok(!s.body.items.some((i) => i.id === northRoom || i.id === 'ATL' || i.id === 'SITE-NORTH' || i.id === northIssue));
  assert.equal(s.body.facets.site?.['SITE-NORTH'], undefined, 'no count betrays the North site');
  assert.ok(s.body.coverage.notes.some((x) => /site-scoped/.test(x)));
  assert.equal((await c.call('GET', `/v1/search?q=${northRoom}`, { token: T.south })).body.total, 0, 'searching the exact North code finds nothing');
  assert.equal((await c.call('GET', `/v1/search/graph/Room/${northRoom}`, { token: T.south })).status, 404);
  assert.equal((await c.call('GET', `/v1/search/graph/RoomIssue/${northIssue}`, { token: T.south })).status, 404);
  const southGraph = await c.call('GET', `/v1/search/graph/Room/${southRoom}?depth=4`, { token: T.south });
  assert.equal(southGraph.status, 200); assert.ok(!southGraph.body.nodes.some((n) => n.id === 'SITE-NORTH' || n.id === 'ATL' || n.id === northRoom), 'traversal never crosses into the other site');
  assert.equal((await c.call('GET', `/v1/search/path?from=Room:${southRoom}&to=Room:${northRoom}`, { token: T.south })).status, 404);
  assert.equal((await c.call('POST', '/v1/search/intent', { token: T.south, body: { question: 'who approved this', target: { type: 'Room', id: northRoom } } })).status, 404);
  const other = await c.call('GET', '/v1/search?q=', { token: T.other });
  assert.ok(!other.body.items.some((i) => ['SITE-NORTH', 'SITE-SOUTH', 'ATL', 'HZN', northRoom, southRoom].includes(i.id)), 'tenant isolation');
  assert.equal((await c.call('GET', `/v1/search/graph/Room/${northRoom}`, { token: T.other })).status, 404);
  assert.equal((await c.call('GET', '/v1/search?q=', {})).status, 401);
});

test('SP-6 — people are not a search surface: only persons named by visible records appear, as names; the directory stays behind policy.configure; searches are audited', async () => {
  const r = await c.call('GET', '/v1/search?q=&type=Person', { token: T.requestor });
  assert.equal(r.status, 200);
  for (const p of r.body.items) { assert.ok(!('email' in p)); assert.match(p.provenance, /named by a visible record/); }
  const people = await c.call('GET', '/v1/people', { token: T.requestor }); assert.equal(people.status, 403);
  const au = (await c.call('GET', '/v1/audit?limit=30', { token: T.secadmin })).body.items;
  assert.ok(au.some((e) => e.action === 'search.query') && au.some((e) => e.action === 'search.intent'));
});

test('SP-7 — qualification answers from ServiceHands’ own hard gates over verified competency records (service manager only); competency records are a search surface only for those who record or verify them', async () => {
  const t = await c.call('POST', '/v1/work-orders/WO-SP-1/triage', { token: T.svcmgr, body: { severity: 'High', scope: 'camera', risk: 'r', workType: 'camera_replacement', window: { from: '2026-11-06T08:00:00Z', to: '2026-11-06T12:00:00Z' } } });
  assert.equal(t.status, 200, JSON.stringify(t.body));
  const q = 'Which technician is qualified and available to investigate this issue?';
  const m = await c.call('POST', '/v1/search/intent', { token: T.svcmgr, body: { question: q, target: { type: 'RoomIssue', id: northIssue } } });
  assert.equal(m.status, 200, JSON.stringify(m.body)); assert.equal(m.body.intent, 'qualified'); assert.equal(m.body.status, 'ANSWERED');
  assert.ok(m.body.items.some((i) => /Service Technician \(synthetic\)/.test(i.label)), JSON.stringify(m.body.items));
  assert.ok(m.body.evidence.some((e) => /South campus only.*(site access|Camera and framing: not held)/.test(e)), 'the ineligible are listed with the gates they fail');
  assert.match(m.body.items[0].provenance, /verified competency records/);
  const s = await c.call('POST', '/v1/search/intent', { token: T.syseng, body: { question: q, target: { type: 'RoomIssue', id: northIssue } } });
  assert.notEqual(s.body.status, 'ANSWERED', 'the ranking is the service manager’s: others get the recorded assignments only');
  const mine = (await c.call('GET', '/v1/search?q=&type=Competency&limit=200', { token: T.svcmgr })).body;
  assert.ok(mine.items.length >= 6 && mine.items.every((i) => i.type === 'Competency'));
  assert.equal((await c.call('GET', '/v1/search?q=&type=Competency', { token: T.requestor })).body.items.length, 0, 'a requestor holds no credentials and sees nobody else’s');
  assert.ok((await c.call('GET', '/v1/search?q=&type=Competency', { token: T.south })).body.items.every((i) => /South campus only/.test(i.label)), 'a technician sees only their own');
});
