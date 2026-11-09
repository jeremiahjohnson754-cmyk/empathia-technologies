// The canonical estates (v1.8.1 §3, §6, §7, §9) as data: one model, three seeded worlds, the founder's exact University numbers, stable
// unique identifiers, a clean hierarchy, access that never leaks restricted rooms to a public reader, and fictional names only.
//   node --test tests/unit/demo-estates.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-estates-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as M from './estate/index.ts'; export * as U from './estate/university.ts'; export * as S from './estate/stadium.ts'; export * as C from './estate/convention.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const { M, U, S, C } = await import(pathToFileURL(out).href);
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
test('ES-05 Stadium: public, premium, team, broadcast and operations districts, with the rooms each needs', () => {
  const e = S.STADIUM; assert.equal(e.nodes.filter((n) => n.kind === 'district').length, 5);
  for (const t of ['gate', 'concourse', 'seating-section', 'suite', 'locker-room', 'broadcast-control', 'press-conference', 'commentary-booth', 'camera-position', 'operations-centre', 'first-aid', 'guest-services']) assert.ok(count(e, t) >= 1, t);
  assert.equal(count(e, 'seating-section'), S.SECTIONS.length); assert.equal(count(e, 'suite'), S.SUITES.length);
});
test('ES-06 Convention: one expo hall with booths, a keynote hall, and eight to twelve breakouts', () => {
  const e = C.CONVENTION; assert.equal(count(e, 'expo-hall'), 1); assert.equal(count(e, 'keynote-hall'), 1);
  const b = count(e, 'breakout-room'); assert.ok(b >= 8 && b <= 12, String(b)); assert.equal(count(e, 'booth'), C.BOOTHS.length); assert.ok(C.BOOTHS.length >= 40);
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
