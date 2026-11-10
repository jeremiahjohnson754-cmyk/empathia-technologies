// The canonical estates (v1.8.1 §3, §6, §7, §9) as data: one model, three seeded worlds, the founder's exact University numbers, stable
// unique identifiers, a clean hierarchy, access that never leaks restricted rooms to a public reader, and fictional names only.
//   node --test tests/unit/demo-estates.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-estates-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as M from './estate/index.ts'; export * as U from './estate/university.ts'; export * as S from './estate/stadium.ts'; export * as C from './estate/convention.ts'; export * as JS from './worlds/stadium/data.public.ts'; export * as JU from './worlds/university/data.public.ts'; export * as RD from './estate/reader.ts'; export * as WR from './worlds/registry.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', jsx: 'automatic', alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') }, nodePaths: [path.join(repo, 'node_modules')] });
const { M, U, S, C, JS, JU, RD, WR } = await import(pathToFileURL(out).href);
const ALL = [U.UNIVERSITY, S.STADIUM, C.CONVENTION];
const count = (e, type) => M.ofType(e, type).length;

test('ES-01 every estate passes the model’s own validation', () => { for (const e of ALL) assert.deepEqual(M.validate(e), [], e.name); });
test('ES-02 identifiers are unique within and across estates, and carry their world’s prefix', () => {
  const seen = new Set(); const prefix = { university: 'UNI', stadium: 'STA', convention: 'CNV' };
  for (const e of ALL) for (const x of [...e.nodes, ...e.assets, ...e.routes]) { assert.ok(!seen.has(x.id), `duplicate ${x.id}`); seen.add(x.id); assert.ok(x.id === prefix[e.world] || x.id.startsWith(`${prefix[e.world]}-`), x.id); }
});
test('ES-03 University: exactly 38 classrooms, split 10 / 8 / 8 / 6 / 6 across the five schools', () => {
  const rooms = M.ofType(U.UNIVERSITY, 'classroom'); assert.equal(rooms.length, 38);
  assert.deepEqual(U.SCHOOLS.map((s) => [s.name, s.classrooms]), [['Engineering & Computing', 10], ['Business & Innovation', 8], ['Health & Applied Sciences', 8], ['Arts, Media & Communication', 6], ['Humanities & Social Sciences', 6]]);
  for (const s of U.SCHOOLS) assert.equal(rooms.filter((r) => r.group === s.name).length, s.classrooms, s.name);
});
test('ES-04 University: exactly four dormitory buildings and three campuses', () => {
  assert.equal(count(U.UNIVERSITY, 'dormitory'), 4); assert.equal(U.DORMS.length, 4);
  assert.equal(U.UNIVERSITY.nodes.filter((n) => n.kind === 'campus').length, 3);
});
// ES-05 and ES-06 changed (9 Nov, founder's Surpass directive §20 and §22): the stadium is programmed at the 60,000 to 65,000 seat
// benchmark and the convention centre at the scale of the largest centres, superseding the smaller first programs. The checks follow.
test('ES-05 Stadium: 60,000 to 65,000 seats counted from its records, with every district and the rooms each needs', () => {
  const e = S.STADIUM; assert.equal(e.nodes.filter((n) => n.kind === 'district').length, 5);
  const seats = [...M.ofType(e, 'seating-section'), ...M.ofType(e, 'suite')].reduce((t, n) => t + n.capacity, 0);
  assert.ok(seats >= 60000 && seats <= 65000, String(seats)); assert.equal(S.SEATS, seats); assert.equal(e.nodes.find((n) => n.id === 'STA-V').capacity, seats);
  for (const [t, min] of [['gate', 4], ['entrance', 4], ['security-screening', 4], ['concourse', 4], ['seating-section', 130], ['suite', 100], ['club', 3], ['concession', 30], ['restrooms', 30], ['accessible-restroom', 12], ['family-room', 4], ['first-aid', 3], ['guest-services', 4], ['retail', 5], ['lift', 14], ['escalator', 8], ['stair', 12], ['ramp', 4],
    ['locker-room', 3], ['coaches-room', 2], ['team-meeting', 2], ['medical', 1], ['training-room', 1], ['recovery', 2], ['broadcast-control', 1], ['production-gallery', 1], ['replay', 1], ['audio-control', 1], ['commentary-booth', 6], ['camera-position', 12], ['press-box', 1], ['press-conference', 1], ['interview-studio', 2],
    ['display-control', 1], ['network-room', 16], ['electrical-room', 8], ['plant-room', 6], ['operations-centre', 1], ['security', 1], ['kitchen', 3], ['storage', 6], ['loading-dock', 1], ['meeting-room', 8]]) assert.ok(count(e, t) >= min, `${t}: ${count(e, t)} < ${min}`);
  assert.equal(count(e, 'seating-section'), S.SECTIONS.length); assert.equal(count(e, 'suite'), S.SUITES.length);
  assert.ok(M.ofType(e, 'seating-section').filter((n) => n.stepFree).length >= 40, 'accessible seating in every part of the bowl');
});
test('ES-06 Convention: thirteen halls in four groups near 2.9 million square feet, exactly 225 meeting and breakout rooms, a show of over a thousand booths', () => {
  const e = C.CONVENTION; assert.equal(count(e, 'hall-group'), 4); assert.equal(count(e, 'expo-hall'), 13); assert.equal(C.HALLS.length, 13);
  const sqft = M.ofType(e, 'expo-hall').reduce((t, n) => t + n.dims[0] * n.dims[1], 0) * 10.7639; assert.ok(sqft > 2.7e6 && sqft < 3.1e6, String(Math.round(sqft)));
  assert.equal(count(e, 'breakout-room') + count(e, 'meeting-room'), 225); assert.equal(C.MEETING_ROOMS.length, 225); assert.equal(new Set(C.MEETING_ROOMS).size, 225);
  assert.equal(count(e, 'booth'), C.BOOTHS.length); assert.ok(C.BOOTHS.length >= 1000); assert.equal(count(e, 'keynote-hall'), 1); assert.equal(count(e, 'ballroom'), 3);
  for (const [t, min] of [['registration', 4], ['entrance', 4], ['food-service', 4], ['restrooms', 60], ['first-aid', 4], ['loading-dock', 13], ['network-room', 26], ['lift', 20], ['escalator', 12], ['stair', 20], ['production-control', 4], ['green-room', 6], ['kitchen', 3], ['executive-suite', 8], ['storage', 13]]) assert.ok(count(e, t) >= min, `${t}: ${count(e, t)}`);
  assert.equal(M.ofType(e, 'loading-dock').reduce((t, n) => t + n.capacity, 0), 104);
  for (const id of C.BOOTHS) assert.ok(/^CNV-EXPO-[ABCD]$/.test(e.nodes.find((n) => n.id === id).parent), id);   // booths belong to the show's halls only
  const sizes = new Set(C.MEETING_ROOMS.map((id) => e.nodes.find((n) => n.id === id).capacity)); assert.ok(sizes.size >= 8, 'rooms are not identical shells');
});
test('ES-07 a public reader is never handed a staff or restricted node; restricted needs the highest level', () => {
  for (const e of ALL) { const pub = e.nodes.filter((n) => M.maySee('public', n)); assert.ok(pub.length > 0 && pub.every((n) => n.access === 'public'), e.name);
    assert.ok(e.nodes.filter((n) => n.access === 'restricted').every((n) => !M.maySee('staff', n) && M.maySee('restricted', n)), e.name); }
  assert.equal(M.maySee('public', S.STADIUM.nodes.find((n) => n.id === 'STA-LKR-H')), false);
});
test('ES-08 every room resolves to one path from its world, and every asset and route points at a real node', () => {
  for (const e of ALL) { const ix = M.indexOf(e);
    for (const n of e.nodes.filter((x) => x.kind === 'room')) { const p = M.pathOf(ix, n.id); assert.equal(p[0].kind, 'world', n.id); assert.equal(p[p.length - 1].id, n.id); }
    for (const a of e.assets) assert.ok(ix.byId.has(a.room), a.id); for (const r of e.routes) assert.ok(ix.byId.has(r.from) && ix.byId.has(r.to), r.id); }
});
test('ES-09 every record is marked synthetic, every estate fictional, and equipment is a class, never a make', () => {
  const makes = /\b(crestron|extron|qsc|biamp|shure|cisco|poly|logitech|sony|samsung|lg|barco|christie|epson|panasonic|sennheiser|yamaha|bose|jbl|harman|amx|kramer|zoom|teams|webex|dante)\b/i;
  for (const e of ALL) { assert.equal(e.fictional, true); for (const x of [...e.nodes, ...e.assets]) assert.equal(x.provenance, 'SYNTHETIC', x.id);
    for (const a of e.assets) assert.ok(!makes.test(`${a.label} ${a.cls}`), `${a.id} ${a.cls}`); }
});
test('ES-10 no real organisation, venue, association or show is named', () => {
  const banned = /\b(avixa|infocomm|ise\b|nab show|playstation|aon|kraft|heinz|stefanini|khc|nfl|nba|mlb|nhl|fifa|ncaa)\b/i;
  for (const e of ALL) for (const n of e.nodes) assert.ok(!banned.test(`${n.name} ${n.note || ''} ${n.layout || ''}`), n.id);
});
test('ES-11 step-free and stepped routes are both recorded where both exist, so an access need can be answered', () => {
  for (const e of ALL) { assert.ok(e.routes.some((r) => r.stepFree) && e.routes.some((r) => !r.stepFree), e.name); for (const r of e.routes) assert.ok(r.minutes > 0 && r.via.length > 3, r.id); }
});
test('ES-12 the registry serves the three seeded worlds and does not pretend the Enterprise adapter exists', () => {
  assert.deepEqual(Object.keys(M.ESTATES).sort(), ['convention', 'stadium', 'university']); assert.equal(M.estateOf('enterprise'), undefined);
});

// One ecosystem: a place a journey screen names is a record in the estate, under the same name. The journeys keep their own small plans
// for now; this is the guard that the two never drift apart while they are joined up.
test('ES-13 Stadium: every seat the match-day journey tickets, and every gate, kitchen, lift and help point it names, is an estate record', () => {
  const names = new Set(S.STADIUM.nodes.map((n) => n.name)); const ids = new Set(S.STADIUM.nodes.map((n) => n.id));
  for (const t of [...JS.TICKETS, JS.VISITING]) assert.ok(ids.has(`STA-SEC-${t.section}`), t.label);
  assert.equal(S.VISITING_SECTION, `STA-SEC-${JS.VISITING.section}`);
  for (const a of JS.AMENITIES.filter((x) => x.kind !== 'water')) assert.ok(names.has(a.label), a.label);
  const platform = JS.TICKETS.find((t) => t.platform); assert.equal(S.STADIUM.nodes.find((n) => n.id === `STA-SEC-${platform.section}`).stepFree, true);
});
test('ES-14 University: every building, green and stop on the campus-day map is an estate record', () => {
  const names = new Set(U.UNIVERSITY.nodes.map((n) => n.name));
  for (const x of [...JU.SPOTS, ...JU.STOPS]) assert.ok(names.has(x.label), x.label);
  assert.ok(U.UNIVERSITY.nodes.some((n) => n.id === 'UNI-SCI-110' && n.type === 'lecture-theatre'));
});
test('ES-15 Convention: the hall, theatre, session rooms, help points and the eight named exhibitors of the expo journey are estate records', () => {
  const names = new Set(C.CONVENTION.nodes.map((n) => n.name));
  for (const x of ['Hall A', 'Keynote Theatre', 'Session Room 1', 'Session Room 2', 'Food court', 'Main entrance', 'Registration', 'First aid', 'Quiet room']) assert.ok(names.has(x), x);
  const src = fs.readFileSync(path.join(repo, 'apps/demo/src/worlds/convention/ConventionPublic.tsx'), 'utf8');
  for (const [booth, [name]] of Object.entries(C.EXHIBITORS)) { assert.ok(names.has(`Booth ${booth}`)); assert.ok(src.includes(`name: '${name}', booth: '${booth}'`), `${name} at ${booth}`); }
});

// The reader rules and Search Party in context (estate/reader.ts)
const cfg = (id) => WR.ROLE_CONFIGS.find((r) => r.id === id);
test('ES-16 all 52 role configurations resolve to a reader level; walk-in roles are public and never more', () => {
  assert.equal(WR.ROLE_CONFIGS.length, 52);
  for (const r of WR.ROLE_CONFIGS) assert.ok(M.ACCESS_ORDER.includes(RD.readerOf(r)), r.id);
  for (const id of ['stadium.fan', 'stadium.away_fan', 'stadium.visitor', 'university.visitor', 'university.prospective_student', 'convention.convention_visitor']) assert.equal(RD.readerOf(cfg(id)), 'public', id);
  assert.equal(RD.readerOf(cfg('university.student')), 'members'); assert.equal(RD.readerOf(cfg('stadium.guest_services')), 'staff'); assert.equal(RD.readerOf(cfg('stadium.av_it_engineer')), 'restricted');
});
test('ES-17 a place found by words is the record browsed to: same identifier, one record', () => {
  const ix = M.indexOf(U.UNIVERSITY); const hits = RD.find(ix, 'members', 'lecture theatre sci-110');
  assert.equal(hits[0].node, 'UNI-SCI-110'); assert.equal(hits[0].id, ix.byId.get('UNI-SCI-110').id); assert.equal(hits[0].kind, 'place');
});
test('ES-18 search never returns what the reader is not shown: no locker room for a fan, no equipment below staff', () => {
  const ix = M.indexOf(S.STADIUM);
  assert.equal(RD.find(ix, 'public', 'locker').length, 0); assert.equal(RD.find(ix, 'members', 'locker').length, 0); assert.ok(RD.find(ix, 'restricted', 'locker').some((h) => h.node === 'STA-LKR-H'));
  assert.ok(RD.find(ix, 'public', 'first aid').some((h) => h.node === 'STA-FA-NE'));
  assert.ok(RD.find(ix, 'members', 'switcher').every((h) => h.kind === 'place')); assert.ok(RD.find(ix, 'staff', 'switcher').some((h) => h.kind === 'equipment' && h.node === 'STA-BCR'));
  for (const reader of M.ACCESS_ORDER) for (const h of RD.find(ix, reader, 'room', 200)) assert.ok(RD.shown(ix, reader, h.node), `${reader} ${h.node}`);
});
test('ES-19 a public place inside a place the reader cannot see stays hidden; totals grow with the reader and never invent equipment for the public', () => {
  const ix = M.indexOf(U.UNIVERSITY); const inner = U.UNIVERSITY.nodes.find((n) => n.id.startsWith('UNI-RSH-L')); assert.equal(RD.shown(ix, 'public', inner.id), false);
  for (const e of ALL) { const i = M.indexOf(e); const t = M.ACCESS_ORDER.map((r) => RD.totals(i, r)); for (let k = 1; k < t.length; k++) assert.ok(t[k].places >= t[k - 1].places, e.name);
    assert.equal(t[0].equipment, null); assert.equal(t[3].places, t[3].all); assert.equal(t[3].equipment, e.assets.reduce((s, a) => s + a.qty, 0)); }
});
test('ES-20 what a room offers is said in plain words, from its equipment only', () => {
  const ix = M.indexOf(U.UNIVERSITY); const o = RD.offers(ix.assetsOf.get('UNI-SCI-110')); assert.ok(o.includes('A screen everyone can see')); assert.deepEqual(RD.offers([]), []);
});

test('ES-21 the space program is counted from the records and shrinks with the reader', () => {
  for (const e of ALL) { const ix = M.indexOf(e); const full = RD.program(ix, 'restricted'); const pub = RD.program(ix, 'public');
    assert.equal(full.reduce((t, r) => t + r.count, 0), e.nodes.filter((n) => !['world', 'venue', 'campus', 'district', 'level'].includes(n.kind)).length, e.name);
    assert.ok(pub.reduce((t, r) => t + r.count, 0) < full.reduce((t, r) => t + r.count, 0)); for (const r of pub) assert.ok(full.find((x) => x.type === r.type).count >= r.count); }
  const pubStadium = RD.program(M.indexOf(S.STADIUM), 'public').map((r) => r.type); for (const t of ['locker-room', 'network-room', 'broadcast-control', 'suite']) assert.ok(!pubStadium.includes(t), t);
});
