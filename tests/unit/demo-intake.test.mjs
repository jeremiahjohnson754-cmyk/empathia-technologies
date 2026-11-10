// The request portal (apps/demo/src/intake; founder, 10 Nov: any person can ask for a room or equipment, sees what they are asking
// for, and the request goes where it should). The proposal is the design engine's own output: these tests recompute it from the engine
// and the room records, so the preview cannot show a device, a size or a test count the engine did not produce.
//   node --test tests/unit/demo-intake.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-intake-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as I from './intake/model.ts'; export * as T from './intake/store.ts'; export * as D from './campus/design.ts'; export * as K from './campus/canon.ts'; export * as W from './workspace/store.ts'; export * as DS from './decisions/store.ts'; export * as P from './access/policy.ts'; export * as R from './registry.pages.ts'; export * as H from './campus/rolehome.ts'; export * as E from '@empathia/commissioning-engine';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
  plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => (a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined)); } }] });
const { I, T, D, K, W, DS, P, R, H, E } = await import(pathToFileURL(out).href);
const hw = (p) => p.positions.filter((x) => !x.furniture);

test('IN-01 seven kinds of request, each in plain words, each saying where it goes; none promises an order, a price or an approval', () => {
  assert.equal(I.KINDS.length, 7); assert.equal(new Set(I.KINDS.map((k) => k.id)).size, 7);
  for (const k of I.KINDS) { assert.ok(k.label.length >= 6 && k.blurb.length >= 10 && k.then.length >= 40, k.id); assert.ok(['desk', 'servicehands', 'scouter', 'optimizer'].includes(k.goes)); assert.doesNotMatch(`${k.label} ${k.blurb} ${k.then}`, /\b(order(ed)?|purchase|guarantee|approved automatically|certif)/i, k.id); }
  assert.deepEqual(I.KINDS.filter((k) => k.goes === 'servicehands').map((k) => k.id).sort(), ['add-devices', 'event', 'replace-device'], 'equipment, replacements and event setups go to ServiceHands');
  assert.deepEqual(I.KINDS.filter((k) => k.goes === 'desk').map((k) => k.id).sort(), ['change-room', 'new-room']);
});

test('IN-02 a new room is drawn by the design engine: its template, its devices, its applicable tests; the size comes from rooms of the same kind', () => {
  for (const [use, people, archetype, template] of [['meet', 4, 'HUD', 'huddle'], ['meet', 10, 'COL', 'medium_conf'], ['meet', 20, 'BRD', 'boardroom'], ['lead', 12, 'EXE', 'executive'], ['teach', 40, 'TRN', 'training'], ['gather', 200, 'TWN', 'townhall'], ['focus', 1, 'FOC', 'private_office'], ['record', 4, 'STU', 'studio']]) {
    const d = I.blank('new-room', { use, people, need: 'A room for the team to meet' }); const p = I.propose(d); assert.ok(p, use); assert.equal(p.archetype, archetype, `${use} for ${people}`);
    let n = 0; const want = E.templateDevices(template, E.outlineFor('rect', p.w, p.l), () => `PA-${String(++n).padStart(4, '0')}`, E.defaultCatalog);
    assert.deepEqual(p.positions.map((x) => [x.code, x.cat, x.x, x.y]), want.map((x) => [x.id, x.cat, x.x, x.y]), 'the positions are the engine template’s, unchanged');
    assert.equal(p.marked.length, 0); assert.equal(p.tests.added, p.tests.total); assert.ok(p.tests.total > 10, String(p.tests.total));
    const same = K.CAMPUS_ROOMS.filter((r) => r.archetype === archetype); const areas = same.map((r) => (r.dims[0] * r.dims[1]) / r.capacity).sort((a, b) => a - b); const med = areas.length % 2 ? areas[(areas.length - 1) / 2] : (areas[areas.length / 2 - 1] + areas[areas.length / 2]) / 2;
    assert.ok(p.w * p.l >= people * med * 0.9, `${use}: floor ${p.w * p.l} m² for ${people} at ${med} m² a seat`); assert.match(p.basis[0], /modelled from the \d+ rooms? of this kind/); assert.match(p.basis[0], /Not surveyed/);
    assert.match(p.title, new RegExp(`for ${people} at Atlas HQ$`)); assert.equal(p.equipment.reduce((s, e) => s + e.count, 0), hw(p).length);
  }
  const extra = I.propose(I.blank('new-room', { use: 'teach', people: 40, adds: [{ cat: 'camera', qty: 2 }] })); assert.equal(extra.marked.length, 2); assert.equal(extra.equipment.find((e) => e.cat === 'camera').added, 2);
});

test('IN-03 more equipment in a room: the room as its record holds it, plus exactly what was asked for, marked; the tests are the engine’s', () => {
  const rec = D.roomRecord('R-ATL-7-300'); const before = hw({ positions: rec.positions }).length;
  const d = I.blank('add-devices', { roomId: 'R-ATL-7-300', need: 'A second camera for the far end', adds: [{ cat: 'camera', qty: 1 }, { cat: 'display', qty: 2 }] }); const p = I.propose(d);
  assert.equal(hw(p).length, before + 3); assert.equal(p.marked.length, 3); assert.deepEqual(p.positions.filter((x) => p.marked.includes(x.code)).map((x) => x.cat).sort(), ['camera', 'display', 'display']);
  for (const x of rec.positions) { const y = p.positions.find((q) => q.code === x.code); assert.ok(y && y.x === x.x && y.y === x.y && y.cat === x.cat, `${x.code} is where the record has it`); }
  for (const x of p.positions.filter((q) => p.marked.includes(q.code))) { assert.ok(x.x > 0 && x.x < p.w && x.y > 0 && x.y < p.l, 'a proposed position is inside the room'); assert.equal(x.provenance, 'asked for in the request'); }
  const all = hw(p); for (const x of all.filter((q) => p.marked.includes(q.code))) for (const y of all) if (x !== y) assert.ok(Math.hypot(x.x - y.x, x.y - y.y) >= 0.69, `${x.label} is not drawn on top of ${y.label}`);
  assert.ok(p.tests.added > 0 && p.tests.added <= p.tests.total); assert.ok(p.tests.byDomain.some(([dm]) => /video/i.test(dm)), 'cameras and displays bring the video tests');
  assert.equal(p.tests.byDomain.reduce((s, [, n]) => s + n, 0), p.tests.added); assert.match(p.title, /^Add 1 camera, 2 displays to Atlas 7\.300/);
  assert.deepEqual([p.w, p.l, p.h], rec.outline.dims);
  const none = I.propose(I.blank('add-devices', { roomId: 'R-ATL-7-300' })); assert.equal(none.marked.length, 0); assert.equal(hw(none).length, before);
  assert.equal(I.propose(I.blank('add-devices', { roomId: 'R-NOPE' })), null, 'no room, no picture');
});

test('IN-04 a replacement marks the one device and lists the tests that depend on it; an event marks its temporary equipment', () => {
  const rec = D.roomRecord('R-ATL-7-300'); const disp = rec.positions.find((x) => x.cat === 'display');
  const p = I.propose(I.blank('replace-device', { roomId: 'R-ATL-7-300', position: disp.code, need: 'It flickers' }));
  assert.deepEqual(p.marked, [disp.code]); assert.equal(hw(p).length, hw({ positions: rec.positions }).length, 'nothing is added'); assert.ok(p.tests.added > 0 && p.tests.added < p.tests.total); assert.equal(p.tests.fresh, 0, 'a like-for-like swap brings no new kind of test');
  assert.ok(p.tests.examples.some((t) => /identity/i.test(t)), 'the unit’s identity is confirmed again'); assert.match(p.title, new RegExp(`^Replace ${disp.label} in Atlas 7\\.300`));
  const e = I.propose(I.blank('event', { roomId: 'R-ATL-1-150', adds: [{ cat: 'micwireless', qty: 2 }], date: '2026-12-04', need: 'Quarterly all hands' }));
  assert.equal(e.marked.length, 2); assert.ok(e.positions.filter((x) => e.marked.includes(x.code)).every((x) => x.provenance === 'asked for in the request')); assert.match(e.title, /on 2026-12-04$/); assert.ok(e.tests.byDomain.some(([dm]) => /audio/i.test(dm)));
});

test('IN-05 what is already on record is filled in, from the record, and says where each fact comes from', () => {
  const facts = I.known(I.blank('add-devices', { roomId: 'R-ATL-4-218' })); const o = K.roomById('R-ATL-4-218'); const rec = D.roomRecord(o.id);
  const get = (l) => facts.find((f) => f[0] === l); assert.equal(get('Room')[1], K.fullName(o)); assert.equal(get('Seats')[1], String(o.capacity)); assert.equal(get('Equipment')[1], `${rec.positions.filter((p) => !p.furniture).length} devices`);
  assert.equal(get('State')[1], rec.lifecycle.toLowerCase().replace(/_/g, ' ')); assert.match(get('Open issues')[1], /\w/); assert.equal(get('Size')[2], 'design record', 'the reference room’s size is declared, not modelled');
  for (const f of facts) assert.ok(f[2].length > 3, `${f[0]} names its source`); assert.deepEqual(I.known(I.blank('new-room')), []);
});

test('IN-06 a request cannot be sent while it is missing something, and each gap is said in words a person can act on', () => {
  assert.deepEqual(Object.keys(I.problems(I.blank('new-room'))), ['need']);
  assert.deepEqual(I.problems(I.blank('new-room', { need: 'A room for six people', people: 0 })).people, 'Say how many people, from 1 to 600.');
  assert.match(I.problems(I.blank('new-room', { need: 'A room for six people', building: 'NST', floor: 9 })).floor, /Northstar Annex has floors 1 to 3/);
  assert.deepEqual(Object.keys(I.problems(I.blank('add-devices', { need: 'Another screen please' }))).sort(), ['adds', 'roomId']);
  assert.deepEqual(Object.keys(I.problems(I.blank('replace-device', { need: 'It is broken', roomId: 'R-ATL-7-300' }))), ['position']);
  assert.deepEqual(Object.keys(I.problems(I.blank('replace-device', { need: 'It is broken', roomId: 'R-ATL-7-300', position: 'F-01' }))), ['position'], 'furniture is not a device to replace');
  assert.deepEqual(Object.keys(I.problems(I.blank('event', { need: 'All hands', roomId: 'R-ATL-1-150', adds: [{ cat: 'speaker', qty: 2 }] }))), ['date']);
  assert.ok(I.problems(I.blank('add-devices', { need: 'More cameras', roomId: 'R-ATL-7-300', adds: [{ cat: 'camera', qty: 99 }] })).adds); assert.ok(I.problems(I.blank('add-devices', { need: 'A rack please', roomId: 'R-ATL-7-300', adds: [{ cat: 'hvac', qty: 1 }] })).adds, 'building plant is not requested here');
  assert.deepEqual(I.problems(I.blank('add-devices', { need: 'A second camera', roomId: 'R-ATL-7-300', adds: [{ cat: 'camera', qty: 1 }] })), {});
  for (const msg of Object.values(I.problems(I.blank('event')))) assert.match(msg, /^[A-Z].*\.$/);
});

test('IN-07 sending: a room request becomes a SUBMITTED project on the decision desk; equipment becomes a ServiceHands job; each request keeps its link', () => {
  mem.clear(); const w = W.seed(); const desk = DS.seed(); const jobs = w.incidents.length; const projects = desk.projects.length;
  const a = T.send(w, 'employee', I.blank('new-room', { need: 'A room where six people can meet suppliers on video', people: 6 }), desk);
  assert.equal(a.id, 'REQ-0001'); assert.equal(a.goes, 'desk'); assert.equal(desk.projects.length, projects + 1); const prj = desk.projects.at(-1);
  assert.equal(prj.id, a.projectId); assert.equal(prj.state, 'SUBMITTED'); assert.equal(prj.romUsd, 0, 'no estimate is invented'); assert.match(prj.summary, /Asked by the Employee through the request portal \(REQ-0001\)/); assert.equal(w.incidents.length, jobs, 'a room request raises no job');
  assert.ok(desk.events.some((e) => e.type === 'request.submitted' && e.aggregate === prj.id)); assert.ok(!desk.funding.some((f) => f.projectId === prj.id) && !desk.decisions.some((x) => x.projectId === prj.id), 'asking approves and funds nothing');
  const b = T.send(w, 'svcmgr', I.blank('add-devices', { roomId: 'R-ATL-7-300', need: 'A second camera for the far end', adds: [{ cat: 'camera', qty: 1 }] }), desk);
  assert.equal(b.id, 'REQ-0002'); assert.equal(b.goes, 'servicehands'); assert.equal(w.incidents.length, jobs + 1); const job = w.incidents.find((i) => i.id === b.incidentId);
  assert.equal(job.state, 'OPEN'); assert.equal(job.roomId, 'R-ATL-7-300'); assert.match(job.title, /^Install: Add 1 camera to Atlas 7\.300/); assert.match(job.summary, /Asked by the Service Manager/); assert.equal(job.workOrderId, null, 'ServiceHands assigns it; the request does not');
  assert.equal(desk.projects.length, projects + 1, 'equipment raises no project');
  const c = T.send(w, 'exec', I.blank('replace-device', { roomId: 'R-ATL-7-300', position: D.roomRecord('R-ATL-7-300').positions.find((x) => x.cat === 'display').code, need: 'The display flickers' }), desk); assert.match(w.incidents.find((i) => i.id === c.incidentId).title, /^Replace: Replace Display/);
  assert.deepEqual(T.loadRequests().map((r) => r.id), ['REQ-0003', 'REQ-0002', 'REQ-0001'], 'newest first, kept in this browser');
});

test('IN-08 refusals: an incomplete request, a role the portal does not admit, and a kind that only opens a tool change nothing', () => {
  mem.clear(); const w = W.seed(); const desk = DS.seed(); const snap = JSON.stringify([w.incidents.length, desk.projects.length]);
  assert.deepEqual(T.send(w, 'employee', I.blank('new-room'), desk).why, ['Say in a sentence what you need (at least 6 characters).']);
  for (const role of ['visitor', 'service', 'installer', 'cxeng', 'ipm', 'steward', 'qa']) { const r = T.send(w, role, I.blank('new-room', { need: 'A room for the team' }), desk); assert.ok(r.why && /does not raise requests here/.test(r.why[0]), role); }
  assert.ok(T.send(w, 'employee', I.blank('evaluate-device'), desk).why); assert.ok(T.send(w, 'employee', I.blank('improve-room', { roomId: 'R-ATL-7-300' }), desk).why);
  assert.equal(JSON.stringify([w.incidents.length, desk.projects.length]), snap); assert.deepEqual(T.loadRequests(), []);
  assert.equal(I.handoff(I.blank('evaluate-device', { category: 'camera' })), '#/scouter?category=camera'); assert.equal(I.handoff(I.blank('improve-room', { roomId: 'R-ATL-7-300' })), '#/optimizer/enterprise/R-ATL-7-300'); assert.equal(I.handoff(I.blank('improve-room')), null); assert.equal(I.handoff(I.blank('new-room')), null);
});

test('IN-09 following a request: its standing is read from the project or the job it became, in the asker’s words, with the reason when one was given', () => {
  mem.clear(); const w = W.seed(); const desk = DS.seed();
  const a = T.send(w, 'bpm', I.blank('change-room', { roomId: 'R-ATL-4-220', need: 'Make the huddle room a podcast room' }), desk); let s = T.standing(a, w, desk);
  assert.equal(s.state, 'SUBMITTED'); assert.match(s.words, /Waiting for an engineer/); assert.equal(s.where, 'Decision desk');
  const prj = desk.projects.find((p) => p.id === a.projectId); prj.state = 'HELD'; desk.decisions.push({ id: 'DD-9', projectId: prj.id, decision: 'HELD', by: 'exec', scopeRev: 1, pitchRev: 1, reason: 'Wait for the studio survey', reviewDate: null, at: new Date().toISOString() });
  s = T.standing(a, w, desk); assert.equal(s.words, 'On hold'); assert.equal(s.reason, 'Wait for the studio survey'); prj.state = 'FUNDED'; assert.match(T.standing(a, w, desk).words, /^Funded/); assert.equal(T.standing(a, w, desk).reason, null);
  const b = T.send(w, 'ops', I.blank('event', { roomId: 'R-ATL-1-150', need: 'Quarterly all hands', adds: [{ cat: 'micwireless', qty: 2 }], date: '2026-12-04' }), desk); const job = w.incidents.find((i) => i.id === b.incidentId);
  assert.equal(T.standing(b, w, desk).words, 'In the ServiceHands queue'); job.state = 'IN_PROGRESS'; assert.equal(T.standing(b, w, desk).words, 'Work is under way'); job.state = 'CLOSED'; assert.equal(T.standing(b, w, desk).tone, 'ok');
  w.incidents = w.incidents.filter((i) => i.id !== b.incidentId); assert.equal(T.standing(b, w, desk).state, 'GONE', 'a job that is gone is said to be gone, never shown as done');
});

test('IN-10 the portal is registered for the roles that may ask, they have a shortcut on their start page, and the old address opens it', () => {
  const page = R.resolve('#/request'); assert.ok(page, '#/request resolves');
  const admitted = P.ROLE_KEYS.filter((r) => P.canOpen(r, page));
  assert.deepEqual([...admitted].sort(), [...T.PORTAL_ROLES].sort(), 'the page admits exactly the roles the store lets send');
  for (const r of T.PORTAL_ROLES) { const opens = (href) => { const x = R.resolve(href.split('?')[0]); return !!x && P.canOpen(r, x); }; const j = H.jumpsFor(r, opens); assert.ok(j.some((x) => x.href === '#/request' && x.label === 'Ask for something'), `${r} has the shortcut`); assert.equal(new Set(j.map((x) => x.key)).size, j.length, `${r}: keys are unique`); assert.ok(j.every((x) => !['g', 'h'].includes(x.key))); }
  for (const r of P.ROLE_KEYS.filter((x) => !T.PORTAL_ROLES.includes(x))) { const opens = (href) => { const x = R.resolve(href.split('?')[0]); return !!x && P.canOpen(r, x); }; assert.ok(!H.jumpsFor(r, opens).some((x) => x.href === '#/request'), `${r} is not offered what it cannot open`); }
  const old = R.resolve('#/intake/new'); assert.ok(old); assert.ok(P.canOpen('syseng', old) && !P.canOpen('visitor', old));
});
