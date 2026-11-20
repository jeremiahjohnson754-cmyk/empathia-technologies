// The world registry (handoff v1.8 §3, ADR-022) as pure functions: four worlds, 4–6 journeys each, the 52 role configurations kept
// exactly (a no-loss test), the fifteen View-as role keys and the old deep links untouched, selection never an authority, and scoped
// state reset before a new context renders.
//   node --test tests/unit/demo-worlds.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const entry = `export * as W from './worlds/registry.ts'; export * as S from './worlds/scope.ts'; export * as E from './worlds/enterprise.ts'; export * as P from './access/policy.ts'; export * as R from './registry.pages.ts'; export * as C from './campus/canon.ts';`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-worlds-')), 'm.mjs');
await esbuild.build({ stdin: { contents: entry, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', splitting: false, nodePaths: [path.join(repo, 'node_modules')],
  alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') }, plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined); } }] });
const { W, S, E, P, R } = await import(pathToFileURL(out).href);

// The 52, held here on purpose: `<world>.<role_id>|<display_label>`. A change to this list is a change to product data and needs a reason.
const THE_52 = {
  enterprise: ['employee|Employee', 'visitor|Visitor', 'service_technician|Service Technician', 'service_engineer|Service Engineer', 'systems_engineer|Systems Engineer', 'product_architect|Product Architect', 'av_ops_lead|AV Operations Lead', 'commissioning_engineer|Commissioning Engineer', 'network_engineer|Network Engineer', 'executive|Executive', 'msp_manager|MSP Provider Manager', 'tenant_admin|Tenant Administrator', 'learner|Learner/Trainer'],
  stadium: ['fan|Fan', 'away_fan|Away Fan', 'premium_guest|Premium Guest', 'visitor|Visitor', 'guest_services|Guest Services', 'broadcast_engineer|Broadcast Engineer', 'av_it_engineer|AV / IT Engineer', 'event_producer|Event Producer / Show Caller', 'venue_ops_lead|Venue Operations Lead', 'service_technician|Service Technician', 'security_safety_lead|Security / Safety Lead', 'executive|Venue Executive', 'venue_admin|Venue Tenant Administrator', 'msp_engineer|MSP Engineer'],
  university: ['student|Student', 'prospective_student|Prospective Student', 'visitor|Visitor', 'faculty|Faculty / Instructor', 'researcher|Researcher', 'campus_staff|Campus Staff', 'student_support|Student Support / Advisor', 'av_it_engineer|Campus AV / IT Engineer', 'facilities_engineer|Facilities Engineer / Operations', 'learning_designer|Learning Experience Designer', 'university_executive|University Executive', 'tenant_admin|University Tenant Administrator', 'msp_engineer|MSP Engineer'],
  convention: ['convention_attendee|Attendee', 'convention_visitor|Visitor', 'convention_exhibitor|Exhibitor', 'convention_sponsor|Sponsor', 'convention_speaker|Speaker', 'convention_event_organizer|Event Organizer', 'convention_show_producer|Show Producer', 'convention_broadcast_engineer|Broadcast Engineer', 'convention_av_it_engineer|AV/IT Engineer', 'convention_facilities_safety|Facilities & Safety', 'convention_executive|Convention Executive', 'convention_msp_delegated|Delegated MSP Engineer'],
};
const FIFTEEN = ['ops', 'svcmgr', 'service', 'syseng', 'designer', 'installer', 'cxeng', 'ipm', 'bpm', 'steward', 'exec', 'employee', 'visitor', 'architect', 'qa'];
const JOURNEYS = {
  enterprise: ['Explore Workplace', 'Find & Support', 'Engineer & Commission', 'Manage Operations', 'Executive Overview'],
  stadium: ['Attend Game', 'Find Amenities', 'Broadcast & Production', 'Venue Engineering', 'Venue Operations'],
  university: ['Student Life', 'Discover Campus', 'Study & Play', 'Teaching & Research', 'Campus Technology'],
  convention: ['Attend Expo', 'Exhibitor Experience', 'Keynote & Polls', 'Production & Broadcast', 'Venue Operations'],
};
// Addresses an investor may already hold: each must still open the page it always did.
const OLD_LINKS = { '#/investor': 'investor', '#/tours/investor': 'investor', '#/campus/scouter': 'scouter', '#/scouter': 'scouter', '#/v25/scouter': 'scouter', '#/access': 'access', '#/v25/policy': 'policy' };
const OLD_OPEN = ['#/home', '#/campus', '#/campus/ATL', '#/campus/ATL/4/R-ATL-4-218', '#/rooms', '#/search', '#/lite', '#/commissioning', '#/pro/exec', '#/v25/build', '#/parity'];

test('four worlds, each with four to six journeys from the v1.8 table, in its order', () => {
  assert.deepEqual([...W.WORLD_KEYS], ['enterprise', 'stadium', 'university', 'convention']);
  for (const k of W.WORLD_KEYS) {
    const js = W.journeysOf(k); assert.ok(js.length >= 4 && js.length <= 6, `${k}: ${js.length} journeys`);
    assert.deepEqual(js.map((x) => x.title), JOURNEYS[k], k);
    assert.equal(new Set(js.map((x) => x.slug)).size, js.length, `${k}: slugs unique`);
  }
  assert.equal(new Set(W.JOURNEYS.map((x) => x.id)).size, W.JOURNEYS.length);
});

test('no loss: the 52 role configurations, 13 / 14 / 13 / 12, each with its exact id and label', () => {
  assert.equal(W.ROLE_CONFIGS.length, 52); assert.equal(new Set(W.ROLE_CONFIG_IDS).size, 52, 'ids unique');
  for (const [world, n] of [['enterprise', 13], ['stadium', 14], ['university', 13], ['convention', 12]]) {
    const have = W.configsOf(world).map((r) => `${r.roleId}|${r.label}`);
    assert.equal(have.length, n, world); assert.equal(W.WORLDS[world].roleCount, n, `${world} roleCount`);
    assert.deepEqual(have, THE_52[world], `${world}: ids and labels exactly, in the matrix order`);
    for (const r of W.configsOf(world)) { assert.equal(r.id, `${world}.${r.roleId}`); assert.equal(W.configById(r.id), r); assert.ok(r.lens, r.id); }
    // grouped by purpose, never one list: every configuration is in exactly one group, no group holds the whole world
    const groups = W.groupsOf(world); assert.equal(groups.reduce((a, g) => a + g.configs.length, 0), n, `${world} groups cover it`);
    assert.ok(groups.length >= 4 && groups.every((g) => g.configs.length < n && W.PURPOSES[g.purpose].label), `${world} is grouped`);
    assert.equal(W.configById(W.WORLDS[world].defaultConfig)?.world, world, `${world} default belongs to it`);
  }
});

test('no loss: the fifteen View-as role keys and the old deep links are unchanged', () => {
  // Changed 11 Nov 2026 (founder's decision): a sixteenth role, the Site Champion, sits beside the Employee. No loss still means the
  // fifteen earlier keys are all there, in the same order.
  assert.deepEqual(P.ROLE_KEYS.filter((k) => k !== 'sitechamp'), FIFTEEN); assert.equal(P.ROLE_KEYS.length, 16); assert.equal(P.ROLE_KEYS[P.ROLE_KEYS.indexOf('employee') + 1], 'sitechamp'); assert.equal(P.DEFAULT_ROLE, 'architect');
  for (const [href, id] of Object.entries(OLD_LINKS)) assert.equal(R.resolve(href)?.page.id, id, href);
  for (const href of OLD_OPEN) { const at = R.resolve(href); assert.ok(at, `${href} still resolves`); assert.ok(!at.page.id.startsWith('world'), `${href} is not shadowed by a world page`); assert.ok(P.canOpen('architect', at), href); }
  // the world pages claim only their own three patterns
  assert.deepEqual(R.PAGES.filter((p) => p.id.startsWith('world')).map((p) => p.path), ['/worlds', '/world/:world', '/world/:world/:journey']);
  assert.equal(R.resolve('#/worlds')?.page.id, 'worlds'); assert.equal(R.resolve('#/world/stadium')?.page.id, 'world'); assert.equal(R.resolve('#/world/stadium/attend-game?as=stadium.fan')?.page.id, 'world.journey');
  // Enterprise configurations map onto existing keys only
  for (const r of W.configsOf('enterprise')) for (const k of [r.roleKey, r.nearest]) if (k) assert.ok(FIFTEEN.includes(k), `${r.id} → ${k}`);
  assert.ok(W.ROLE_CONFIGS.every((r) => r.world === 'enterprise' || (!r.roleKey && !r.nearest)), 'only Enterprise maps onto View-as keys');
  assert.deepEqual(W.configsOf('enterprise').filter((r) => r.roleKey).map((r) => `${r.roleId}:${r.roleKey}`), ['employee:employee', 'visitor:visitor', 'service_engineer:service', 'systems_engineer:syseng', 'product_architect:architect', 'av_ops_lead:ops', 'commissioning_engineer:cxeng', 'executive:exec']);
});

test('selection is not authority: a world, journey or role configuration cannot open a page the policy denies', () => {
  // 1. every policy answer before …
  const pages = R.PAGES.map((p) => R.resolve(R.hrefOf(p.id))).filter(Boolean);
  const snap = () => JSON.stringify(P.ROLE_KEYS.map((k) => pages.map((at) => P.canOpen(k, at))));
  const before = snap();
  // … 2. select everything there is to select, in every order of world …
  for (const r of W.ROLE_CONFIGS) { const cfg = W.configFor(r.world, r.id); S.enterContext(S.contextOf(r.world, cfg.id, 'visitor')); for (const x of W.JOURNEYS) { W.presents(cfg, x); W.journeyTarget(x, cfg); } }
  // … 3. and the policy answers exactly as it did
  assert.equal(snap(), before);
  assert.ok(P.ROLE_KEYS.some((k) => pages.some((at) => !P.canOpen(k, at))), 'the policy does deny something (the test is not vacuous)');
  // the world pages are open to every role by an explicit list, and say why
  for (const p of R.PAGES.filter((x) => x.id.startsWith('world'))) { assert.deepEqual(P.rolesFor(p.authority), [...P.ROLE_KEYS], p.id); assert.match(p.authority.why, /grants nothing/); assert.equal(p.authorityFor, undefined); }
  // an Enterprise journey leads only where the policy lets the role that opens it go, and never hides a switch
  let switches = 0;
  for (const k of P.ROLE_KEYS) for (const x of W.journeysOf('enterprise')) {
    const t = E.enterpriseTarget(x, k); const at = R.resolve(x.enterprise.href); assert.ok(at, `${x.id} target resolves`);
    if (!t) { assert.ok(!P.canOpen(k, at) && !P.canOpen(x.enterprise.roleKey, at), `${k} ${x.id}`); continue; }
    assert.ok(P.canOpen(t.as, at), `${k} ${x.id}: opened as ${t.as}, which the policy admits`);
    assert.equal(t.switches, !P.canOpen(k, at), `${k} ${x.id}: a switch exactly when the role itself is denied`);
    if (t.switches) { switches += 1; assert.equal(t.as, x.enterprise.roleKey); } else assert.equal(t.as, k);
  }
  assert.ok(switches > 0, 'some roles are denied a journey page and are told it opens as another role');
  // a denying policy means no target at all: nothing is offered
  assert.equal(E.enterpriseTarget(W.journeysOf('enterprise')[0], 'visitor', () => false), null);
  for (const x of W.journeysOf('enterprise')) assert.ok(P.canOpen(x.enterprise.roleKey, R.resolve(x.enterprise.href)), `${x.id}: its own role opens it`);
});

test('presentation gate: public journeys for everyone of the world, restricted ones for the configurations whose work they are', () => {
  for (const w of ['stadium', 'university', 'convention']) {
    const visitor = W.configFor(w, null); assert.equal(visitor.id, W.WORLDS[w].defaultConfig);
    for (const x of W.journeysOf(w)) {
      const who = W.whoPresents(x); assert.ok(who.length > 0, `${x.id} has someone`);
      assert.ok(W.presents(W.configById(x.opensAs), x), `${x.id} opens as a configuration it is presented to`);
      assert.equal(x.module, x.kind === 'public' || x.kind === 'student' ? 'public' : 'pro', `${x.id} chunk`);
      if (x.kind === 'public') assert.equal(who.length, W.configsOf(w).length, `${x.id} is public`);
      else { assert.equal(W.presents(visitor, x), false, `${x.id} is not presented to the visitor`); assert.equal(W.journeyTarget(x, visitor).switches, true); }
      for (const r of W.ROLE_CONFIGS.filter((r) => r.world !== w)) assert.equal(W.presents(r, x), false, `${r.id} is never presented ${x.id}`);
    }
  }
  // engineering journeys need an engineering (or production) configuration of that world; a fan, a student and an attendee never get one
  const eng = W.JOURNEYS.filter((x) => x.kind === 'engineering' && !x.enterprise);
  assert.deepEqual(eng.map((x) => x.id), ['stadium.venue-engineering', 'university.campus-technology']);
  for (const x of eng) for (const r of W.whoPresents(x)) assert.ok(['engineering', 'production'].includes(r.purpose), `${x.id} ← ${r.id}`);
  for (const id of ['stadium.fan', 'stadium.away_fan', 'university.student', 'convention.convention_attendee']) for (const x of W.journeysFor(W.configById(id))) assert.ok(['public', 'student'].includes(x.kind), `${id} sees only public journeys, not ${x.id}`);
  // the student's day is the student's only
  assert.deepEqual(W.whoPresents(W.journeyAt('university', 'student-life')).map((r) => r.id), ['university.student']);
  // a role is never carried into another world, and an unknown one falls to the safe default
  assert.equal(W.configFor('university', 'stadium.av_it_engineer').id, 'university.visitor');
  assert.equal(W.configFor('stadium', 'nope').id, 'stadium.visitor'); assert.equal(W.configFor('stadium', 'stadium.av_it_engineer').id, 'stadium.av_it_engineer');
  assert.equal(W.configFor('convention', 'university.av_it_engineer').id, 'convention.convention_visitor');
  // same label, different worlds: distinct configurations, distinct journeys (V18-JOURNEY-11)
  const [a, b] = [W.configById('stadium.av_it_engineer'), W.configById('university.av_it_engineer')];
  assert.notEqual(a.id, b.id); assert.notDeepEqual(W.journeysFor(a).map((x) => x.id), W.journeysFor(b).map((x) => x.id));
  // addresses: the default configuration is not written into the address, any other is
  assert.equal(W.worldHref('stadium'), '#/world/stadium'); assert.equal(W.worldHref('stadium', 'stadium.visitor'), '#/world/stadium'); assert.equal(W.worldHref('stadium', 'stadium.fan'), '#/world/stadium?as=stadium.fan');
  assert.equal(W.journeyHref(W.journeyAt('stadium', 'venue-engineering'), 'stadium.av_it_engineer'), '#/world/stadium/venue-engineering?as=stadium.av_it_engineer');
});

test('scoped state is reset before the new context renders; late work from the old one is dropped', () => {
  const order = []; const store = S.scopedStore(() => ({ query: '', open: false, selected: null }));
  S.registerScoped(() => order.push('reset'));
  S.enterContext('stadium|stadium.fan|architect'); order.length = 0;
  store.set({ query: 'restroom', open: true, selected: 'wc-nw' }); const started = S.contextEpoch();
  assert.equal(S.enterContext('stadium|stadium.fan|architect'), false, 'same context: nothing is reset');
  assert.deepEqual(store.get(), { query: 'restroom', open: true, selected: 'wc-nw' }); assert.ok(S.current(started));
  // a role switch inside the world
  assert.equal(S.enterContext('stadium|stadium.av_it_engineer|architect'), true); order.push('render');
  assert.deepEqual(order, ['reset', 'render'], 'reset ran before enterContext returned, so before anything renders');
  assert.deepEqual(store.get(), { query: '', open: false, selected: null }); assert.equal(S.current(started), false, 'work started in the old context may not paint');
  // a world switch, and a View-as switch in the same world
  store.set((v) => ({ ...v, query: 'amp' })); assert.equal(S.enterContext('university|university.visitor|architect'), true); assert.equal(store.get().query, '');
  store.set((v) => ({ ...v, selected: 'LIB' })); assert.equal(S.enterContext('university|university.visitor|exec'), true); assert.equal(store.get().selected, null);
  let told = 0; const off = store.subscribe(() => { told += 1; }); S.enterContext('worlds||exec'); assert.equal(told, 1, 'subscribers are told of the reset'); off();
  assert.equal(S.contextOf('a', 'b', 'c'), 'a|b|c');
});

test('the venues are fictional: no real venue, institution, team, league or excluded name anywhere in the registry', () => {
  const text = JSON.stringify({ worlds: W.WORLDS, journeys: W.JOURNEYS, roles: W.ROLE_CONFIGS, purposes: W.PURPOSES });
  for (const bad of [/soldier field/i, /illinois/i, /urbana/i, /mccormick/i, /\bbears\b/i, /\bNFL\b/, /\bAON\b/i, /kraft/i, /heinz/i, /stefanini/i, /\bKHC\b/, /official partner/i]) assert.doesNotMatch(text, bad);
  for (const k of W.WORLD_KEYS) assert.ok(W.WORLDS[k].place && W.WORLDS[k].about, k);
});
