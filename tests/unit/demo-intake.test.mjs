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
await esbuild.build({ stdin: { contents: `export * as I from './intake/model.ts'; export * as T from './intake/store.ts'; export * as TR from './intake/triage.ts'; export * as D from './campus/design.ts'; export * as K from './campus/canon.ts'; export * as W from './workspace/store.ts'; export * as DS from './decisions/store.ts'; export * as P from './access/policy.ts'; export * as R from './registry.pages.ts'; export * as H from './campus/rolehome.ts'; export * as E from '@empathia/commissioning-engine';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
  plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => (a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined)); } }] });
const { I, T, TR, D, K, W, DS, P, R, H, E } = await import(pathToFileURL(out).href);
const hw = (p) => p.positions.filter((x) => !x.furniture);

// IN-01 changed 19 Nov 2026: the founder's Intake directive (§02, §05 G and J) adds a fault ("Something is not working", which opens
// ServiceHands' problem report) and a request in the person's own words ("Something else", routed by the AV operations team): nine kinds.
test('IN-01 nine kinds of request, each in plain words, each saying where it goes; none promises an order, a price or an approval', () => {
  assert.equal(I.KINDS.length, 9); assert.equal(new Set(I.KINDS.map((k) => k.id)).size, 9);
  for (const k of I.KINDS) { assert.ok(k.label.length >= 6 && k.blurb.length >= 10 && k.then.length >= 40, k.id); assert.ok(['desk', 'servicehands', 'scouter', 'optimizer', 'triage', 'report'].includes(k.goes)); assert.doesNotMatch(`${k.label} ${k.blurb} ${k.then}`, /\b(order(ed)?|purchase|guarantee|approved automatically|certif)/i, k.id); }
  assert.deepEqual(I.KINDS.filter((k) => k.goes === 'servicehands').map((k) => k.id).sort(), ['add-devices', 'event', 'replace-device'], 'equipment, replacements and event setups go to ServiceHands');
  assert.deepEqual(I.KINDS.filter((k) => k.goes === 'desk').map((k) => k.id).sort(), ['change-room', 'new-room']);
  assert.deepEqual(I.KINDS.filter((k) => k.goes === 'triage').map((k) => k.id), ['general']); assert.deepEqual(I.KINDS.filter((k) => k.goes === 'report').map((k) => k.id), ['problem']);
  // the front door's four choices cover every kind exactly once
  assert.deepEqual(I.CARDS.map((c) => c.id), ['create', 'improve', 'equipment', 'help']); assert.deepEqual(I.CARDS.flatMap((c) => c.kinds).sort(), I.KINDS.map((k) => k.id).sort());
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

// ── 19 Nov 2026: requests as records (founder directive "The definitive Intake experience" §03, §04, §07, §10) ──────────────────────
test('IN-11 a draft is a record from its first save: its own id, its answers, a request.drafted event; sending keeps the id and sends once', () => {
  mem.clear(); const w = W.load(); const desk = DS.load();
  const d = I.blank('new-room', { need: 'A project room for the design team', people: 6, goals: ['video', 'present'], place: { name: 'Level 2 project room', building: '' } });
  const a = T.saveDraft('employee', d, null, 'what'); assert.ok(!a.why, JSON.stringify(a)); assert.match(a.id, /^REQ-\d{4}$/); assert.equal(a.state, 'DRAFT'); assert.deepEqual(a.history.map((e) => e.type), ['request.drafted']);
  assert.equal(T.loadRequests().length, 0, 'a draft is not a sent request'); assert.equal(T.loadRecords().length, 1);
  const b = T.saveDraft('employee', { ...d, people: 8 }, a.id, 'needs'); assert.equal(b.id, a.id); assert.equal(b.draft.people, 8); assert.equal(T.loadRecords().length, 1, 'saving again updates the same record');
  const r = T.send(w, 'employee', T.draftOf(T.recordById(a.id)), desk, a.id); assert.ok(!r.why, JSON.stringify(r)); assert.equal(r.id, a.id, 'the draft is sent with its id'); assert.equal(r.state, 'SUBMITTED');
  assert.ok(r.projectId && desk.projects.some((p) => p.id === r.projectId && p.state === 'SUBMITTED'));
  assert.deepEqual(r.history.map((e) => e.type), ['request.drafted', 'room.provisional_created', 'request.submitted']); for (const e of r.history) { assert.equal(e.v, 1); assert.equal(e.correlation, r.id); assert.ok(e.at && e.by); }
  assert.ok(r.provisional && /^PRV-\d{4}$/.test(r.provisional.id) && r.provisional.state === 'AWAITING_REVIEW' && r.provisional.location === 'DOCUMENTED' && r.provisional.name === 'Level 2 project room');
  assert.equal(r.policy, 'DOCUMENTATION_REQUIRED', 'needed before design, never to send: nobody is made to produce a photograph to ask'); assert.deepEqual(r.goals, ['video', 'present']);
  const n = desk.projects.length; const again = T.send(w, 'employee', T.draftOf(r), desk, a.id); assert.equal(again.id, r.id); assert.equal(desk.projects.length, n, 'sending twice creates nothing twice (scenario 18)');
  assert.ok(T.saveDraft('employee', d, a.id, 'what').why, 'a sent request is not changed as a draft'); assert.ok(T.discardDraft(a.id).why, 'a sent request is not discarded');
  const s = T.standing(r, w, desk); assert.equal(s.owner, 'Systems engineering'); assert.match(s.next, /someone on site confirms where the new space is/);
});

test('IN-12 a refused job keeps the draft: nothing the person wrote is lost when ServiceHands refuses (directive §10)', () => {
  mem.clear(); const w = W.load(); const desk = DS.load(); const room = K.CAMPUS_ROOMS[0].id;
  const d = I.blank('add-devices', { roomId: room, building: K.roomById(room).building, need: 'One more display for the far end', adds: [{ cat: 'display', qty: 1 }] });
  const a = T.saveDraft('employee', d, null, 'needs'); const r = T.send(w, 'visitor', d, desk, a.id); assert.ok(r.why, 'the visitor does not raise requests');
  assert.equal(T.recordById(a.id).state, 'DRAFT'); assert.equal(T.recordById(a.id).draft.need, d.need);
});

test('IN-13 a draft can be discarded, a sent request cannot; drafts survive a reload (they are in storage, not in the page)', () => {
  mem.clear(); const a = T.saveDraft('employee', I.blank('general', { need: 'We need to move two displays to the new wing' }), null, 'what');
  const raw = JSON.parse(mem.get('empathia.demo.requests.v1')); assert.equal(raw[0].id, a.id, 'kept in local storage'); assert.equal(raw[0].draft.need, 'We need to move two displays to the new wing');
  assert.deepEqual(T.discardDraft(a.id), { ok: true }); assert.equal(T.loadRecords().length, 0);
});

test('IN-14 a request in the person’s own words goes to the AV operations team, titled by its first sentence, with no project or job', () => {
  mem.clear(); const w = W.load(); const desk = DS.load(); const before = desk.projects.length; const inc = w.incidents.length;
  const r = T.send(w, 'employee', I.blank('general', { need: 'We need to retire the old projector in the basement. It is never used.' }), desk);
  assert.ok(!r.why, JSON.stringify(r)); assert.equal(r.goes, 'triage'); assert.equal(r.title, 'We need to retire the old projector in the basement'); assert.equal(r.projectId, null); assert.equal(r.incidentId, null);
  assert.equal(desk.projects.length, before); assert.equal(w.incidents.length, inc); const s = T.standing(r, w, desk); assert.equal(s.owner, 'AV operations'); assert.match(s.words, /AV operations team/);
  assert.ok(T.send(w, 'employee', I.blank('problem', { need: 'The display flickers', roomId: K.CAMPUS_ROOMS[0].id }), desk).why, 'a fault opens ServiceHands’ report; it is not sent as a request');
  assert.equal(I.handoff(I.blank('problem', { roomId: K.CAMPUS_ROOMS[0].id })), `#/servicehands/new?room=${encodeURIComponent(K.CAMPUS_ROOMS[0].id)}`);
});

test('IN-15 a size the person gives is used and labelled as theirs; half a size or a nonsense one is refused, never guessed', () => {
  const base = { use: 'meet', people: 8, need: 'A room for eight' };
  const g = I.propose(I.blank('new-room', { ...base, dims: { w: 5, l: 7.5, h: null } })); assert.equal(g.w, 5); assert.equal(g.l, 7.5); assert.match(g.basis[0], /Size as you gave it: 5 × 7.5 m; ceiling modelled/);
  const m = I.propose(I.blank('new-room', base)); assert.match(m.basis[0], /^Size modeled from/);
  assert.ok(I.problems(I.blank('new-room', { ...base, dims: { w: 5, l: null, h: null } })).dims, 'one side only'); assert.ok(I.problems(I.blank('new-room', { ...base, dims: { w: 500, l: 7, h: null } })).dims, 'out of range');
  assert.ok(I.problems(I.blank('new-room', { ...base, dims: { w: 5, l: 7, h: 1 } })).dims, 'a ceiling of 1 m');
  const other = I.blank('new-room', { ...base, building: I.OTHER_BUILDING, floor: 3 }); assert.ok(I.problems(other).building, 'a building not on record needs its name');
  const named = { ...other, place: { name: '', building: 'Riverside Annex' } }; assert.deepEqual(Object.keys(I.problems(named)), []); assert.match(I.propose(named).title, /Riverside Annex$/);
});

test('IN-16 the front door reads a description by word lists: the thirteen phrasings of the directive each start somewhere sensible, and nothing invents a room', async () => {
  const esb = path.join(path.dirname(out), 'c.mjs');
  await esbuild.build({ stdin: { contents: `export * as X from './intake/classify.ts'; export * as L from './intake/locate.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: esb, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
    plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => (a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined)); } }] });
  const { X, L } = await import(pathToFileURL(esb).href);
  const want = [['I need a new meeting room.', 'new-room'], ['We want to upgrade our conference room.', 'change-room'], ['I need another camera.', 'add-devices'], ['Our current equipment is outdated.', 'replace-device'],
    ['I need to replace a broken device.', 'replace-device'], ["We're opening a new office.", 'new-room'], ['I need help planning a town hall.', 'event'], ['We want to add digital signage.', 'change-room'],
    ['I need someone to assess a space.', 'general'], ['We need to relocate some equipment.', 'general'], ['We need to retire a room or device.', 'general'], ['I need AV help.', 'general'], ["I'm not sure what technology we need.", 'general'],
    ['The display in 4.218 keeps flickering', 'problem'], ['We need a new training room for forty apprentices', 'new-room'], ['A new hybrid meeting space on floor 3', 'new-room']];
  for (const [t, k] of want) { const r = X.read(t); assert.equal(r.kind, k, t); assert.ok(r.basis.length > 20); }
  assert.equal(X.read('The display in 4.218 keeps flickering').roomId, 'R-ATL-4-218'); assert.equal(X.read('https://northstar.example.com/e/#/lite/room/R-ATL-4-218?mode=employee').roomId, 'R-ATL-4-218', 'a QR code’s address names its room');
  assert.equal(X.read('lunch').confident, false, 'nothing matched: own words, said so'); assert.equal(X.read('lunch').kind, 'general'); assert.equal(X.read('  '), null);
  assert.ok(X.read('We need better audio for hybrid meetings').goals.includes('audio') && X.read('We need better audio for hybrid meetings').goals.includes('video'));
  assert.match(X.read('I need a new meeting room').basis, /^Matched by word lists, not by AI: /, 'never presented as AI');
  // the locator: a room number, a QR address, a device code, a name; and an unknown code finds nothing
  assert.equal(L.locate('4.218')[0].roomId, 'R-ATL-4-218'); assert.equal(L.locate('#/lite/room/R-ATL-4-218?mode=employee')[0].roomId, 'R-ATL-4-218');
  const rec = D.roomRecord('R-ATL-4-218'); const dev = rec.positions.find((p) => !p.furniture); const hit = L.locate(dev.code)[0]; assert.equal(hit.roomId, 'R-ATL-4-218'); assert.equal(hit.position, dev.code);
  assert.deepEqual(L.locate('ZZ-9999'), []); assert.ok(L.locate('boardroom').length >= 1);
});

test('IN-17 triage: a request in the person’s own words is routed by the operations lead with a note, keeping the words; a job needs a room', () => {
  mem.clear(); const w = W.load(); const desk = DS.load(); const words = 'We need to move two displays from the old lobby to the new wing.';
  const r = T.send(w, 'employee', I.blank('general', { need: words }), desk); assert.equal(TR.queue().route.map((x) => x.id).join(), r.id);
  assert.ok(TR.route(w, 'employee', r.id, 'desk', 'A relocation project', null, desk).why, 'the employee does not triage');
  assert.ok(TR.route(w, 'sitechamp', r.id, 'desk', 'A relocation project', null, desk).why && TR.ask('sitechamp', r.id, 'Which wing, and by when?').why && TR.close('sitechamp', r.id, 'Not ours to route, says the champion', null).why, 'the Site Champion confirms locations; routing, questions and closing are not theirs');
  assert.ok(TR.route(w, 'ops', r.id, 'servicehands', 'Two displays to move', null, desk).why, 'a job needs the room');
  assert.ok(TR.route(w, 'ops', r.id, 'desk', 'x', null, desk).why, 'a note is required');
  const n = desk.projects.length; const t = TR.route(w, 'ops', r.id, 'desk', 'A relocation is a small project: engineering checks the new wing first.', null, desk);
  assert.ok(!t.why, JSON.stringify(t)); assert.equal(t.projectId, `PRJ-${r.id}`); assert.equal(desk.projects.length, n + 1); assert.equal(desk.projects.at(-1).state, 'SUBMITTED');
  assert.equal(t.need, words, 'the person’s words are kept'); assert.equal(t.triage.outcome, 'desk'); assert.equal(t.history.at(-1).type, 'request.triaged'); assert.equal(TR.queue().route.length, 0);
  assert.ok(TR.route(w, 'ops', r.id, 'desk', 'Again, by mistake', null, desk).why, 'routed once'); assert.equal(T.standing(t, w, desk).owner, 'Systems engineering');
});

test('IN-18 a question to the requester: the request waits for them, only they answer, and it goes back to the queue answered', () => {
  mem.clear(); const w = W.load(); const desk = DS.load(); const r = T.send(w, 'employee', I.blank('general', { need: 'The room needs better sound.' }), desk);
  assert.ok(TR.ask('employee', r.id, 'Which room do you mean?').why); const a = TR.ask('ops', r.id, 'Which room do you mean, and when is it used most?');
  assert.ok(!a.why); assert.equal(T.standing(a, w, desk).owner, 'You'); assert.equal(T.standing(a, w, desk).words, 'A question for you'); assert.equal(TR.queue().route.length, 0); assert.equal(TR.queue().asked.length, 1);
  assert.ok(TR.ask('ops', r.id, 'A second question while the first waits?').why, 'one question at a time');
  assert.ok(TR.answer('ops', r.id, 'Atlas 4.218').why, 'only the requester answers'); const b = TR.answer('employee', r.id, 'Atlas 4.218, every Monday morning');
  assert.ok(!b.why); assert.equal(b.question.answer.text, 'Atlas 4.218, every Monday morning'); assert.deepEqual(b.history.slice(-2).map((e) => e.type), ['request.clarification_requested', 'request.clarification_answered']); assert.equal(TR.queue().route.length, 1);
});

test('IN-19 closing a duplicate names the request it duplicates and says why; the requester is pointed to it', () => {
  mem.clear(); const w = W.load(); const desk = DS.load(); const a = T.send(w, 'employee', I.blank('general', { need: 'The lobby screen is too small.' }), desk); const b = T.send(w, 'employee', I.blank('general', { need: 'The lobby screen is too small to read.' }), desk);
  assert.ok(TR.close('ops', b.id, 'short', null).why); assert.ok(TR.close('ops', b.id, 'The same need, asked twice.', 'REQ-9999').why, 'the duplicate must exist');
  const c = TR.close('ops', b.id, 'The same need, asked twice.', a.id); assert.ok(!c.why); const s = T.standing(c, w, desk); assert.equal(s.state, 'CLOSED'); assert.equal(s.href, `#/requests/${a.id}`); assert.match(s.words, new RegExp(a.id));
});

test('IN-20 a provisional space’s location is confirmed by a champion or an engineer, never by the person who asked; the space stays provisional', () => {
  mem.clear(); const w = W.load(); const desk = DS.load(); const r = T.send(w, 'employee', I.blank('new-room', { need: 'A room for the design team', people: 6, place: { name: 'Old print room', building: '' } }), desk);
  assert.equal(TR.queue().verify.length, 1); assert.match(T.standing(r, w, desk).next, /someone on site confirms/);
  assert.ok(TR.verifyLocation('visitor', r.id, 'I looked at it from the corridor').why); assert.ok(TR.verifyLocation('sitechamp', r.id, 'short').why);
  const asker = T.send(w, 'sitechamp', I.blank('new-room', { need: 'A room for the site team', people: 4 }), desk); assert.ok(TR.verifyLocation('sitechamp', asker.id, 'It is my own request, seen today').why, 'not by the person who asked');
  const v = TR.verifyLocation('sitechamp', r.id, 'Visited: the old print room, floor 1, east side, empty.'); assert.ok(!v.why, JSON.stringify(v));
  assert.equal(v.provisional.location, 'VERIFIED'); assert.equal(v.provisional.state, 'AWAITING_REVIEW', 'still provisional'); assert.equal(v.history.at(-1).type, 'location.verified');
  assert.doesNotMatch(T.standing(v, w, desk).next, /someone on site confirms/); assert.equal(TR.queue().verify.length, 1, 'the champion’s own request still waits for someone else');
});

test('IN-21 who may open a request’s page: the person who asked, the people who work on it, the champion of its site; nobody else', () => {
  const at = { id: 'REQ-0001', role: 'employee', roomId: 'R-ATL-4-218', provisional: null }; const away = { ...at, roomId: K.CAMPUS_ROOMS.find((r) => r.building !== 'ATL').id }; const own = { ...at, roomId: null };
  assert.ok(T.mayView('employee', at)); for (const r of ['ops', 'syseng', 'svcmgr', 'architect', 'designer', 'exec', 'bpm']) assert.ok(T.mayView(r, at), r);
  assert.ok(T.mayView('sitechamp', at), 'at the champion’s site'); assert.ok(!T.mayView('sitechamp', away), 'not at the champion’s site'); assert.ok(!T.mayView('sitechamp', own), 'not about a room');
  for (const r of ['visitor', 'installer', 'service', 'qa']) assert.ok(!T.mayView(r, at), r);
  assert.ok(T.mayView('sitechamp', { ...own, provisional: { building: 'ATL' } }), 'a new space at the champion’s site');
});

test('IN-22 the Living Campus examples: five requests from an enterprise, a university, a stadium and a convention centre, sent through the same engine, marked, added once', () => {
  mem.clear(); const w = W.load(); const desk = DS.load(); const o = TR.addExamples(w, desk);
  assert.deepEqual(o.refused, []); assert.equal(o.added.length, 5); const recs = T.loadRequests(); assert.equal(recs.length, 5); assert.ok(recs.every((r) => r.example && r.history.at(-1).type === 'request.example_marked'));
  assert.deepEqual([...new Set(TR.EXAMPLES.map((x) => x.context))].sort(), ['Convention', 'Enterprise', 'Stadium', 'University']);
  const by = (k) => recs.find((r) => r.example === k); assert.ok(by('ex-enterprise-room').provisional && by('ex-enterprise-room').projectId); assert.ok(by('ex-enterprise-camera').incidentId); assert.equal(by('ex-stadium').goes, 'triage');
  assert.equal(new Set(recs.map((r) => r.role)).size, 5, 'five different people'); assert.equal(TR.queue().route.length, 2, 'the stadium and the convention centre wait to be routed');
  assert.equal(TR.addExamples(w, desk).added.length, 0, 'added once');
});

