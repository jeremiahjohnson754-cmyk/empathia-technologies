// Reading a search the way a person meant it (apps/demo/src/search/understand.ts; founder, 10 Nov: "have them search whatever they
// want"). Every count here is recomputed from the room records by the test itself, so an answer can never drift from the records.
//   node --test tests/unit/demo-understand.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-understand-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as U from './search/understand.ts'; export * as D from './campus/design.ts'; export * as K from './campus/canon.ts'; export * as F from './search/find.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') } });
const { U, D, K, F } = await import(pathToFileURL(out).href);
const recs = D.allRecords(); const n = (f) => recs.filter(f).length; const has = (r, cat) => r.positions.some((p) => p.cat === cat);
const labels = (r) => r.filters.map((f) => f.label);

test('UN-01 a sentence becomes conditions, and the answer is the count the records give', () => {
  const r = U.understand('boardrooms over 12 seats at atlas with a camera');
  assert.equal(r.mode, 'answer'); assert.deepEqual(labels(r), ['Boardroom', 'Atlas HQ', 'more than 12 seats', 'has a camera']);
  const want = n((x) => x.outline.archetype === 'BRD' && x.outline.building === 'ATL' && x.outline.capacity > 12 && has(x, 'camera'));
  assert.equal(r.total, want); assert.ok(want > 0); assert.equal(r.lead, `${want} rooms of 90.`); assert.equal(r.rows.length, want);
  for (const row of r.rows) { assert.ok(K.roomById(row.id), row.id); assert.match(row.href, /^#\//); assert.match(row.detail, /camera/); }
});

test('UN-02 each kind of condition, alone, against the records', () => {
  const cases = [
    ['rooms held', (x) => x.lifecycle === 'COMMISSIONING' && x.nextStep && x.nextStep.blockers.length > 0], ['which rooms are in commissioning?', (x) => x.lifecycle === 'COMMISSIONING'], ['accepted rooms', (x) => x.lifecycle === 'ACCEPTED'],
    ['rooms at eastgate', (x) => x.outline.building === 'EGT'], ['rooms at atlas or beacon', (x) => ['ATL', 'BCN'].includes(x.outline.building)], ['studios', (x) => x.outline.archetype === 'STU'], ['lecture halls', (x) => x.outline.archetype === 'TWN'],
    ['rooms on floor 4', (x) => x.outline.floor === 4], ['rooms on the 2nd floor', (x) => x.outline.floor === 2], ['seats>=100', (x) => x.outline.capacity >= 100], ['rooms under 8 seats', (x) => x.outline.capacity < 8], ['rooms up to 8 seats', (x) => x.outline.capacity <= 8],
    ['20+ seats', (x) => x.outline.capacity >= 20], ['rooms between 10 and 20 seats', (x) => x.outline.capacity >= 10 && x.outline.capacity <= 20], ['rooms for 40 people', (x) => x.outline.capacity >= 40],
    ['rooms with a projector', (x) => has(x, 'projector')], ['rooms without a projector', (x) => !has(x, 'projector')], ['rooms with a tv', (x) => has(x, 'display')], ['rooms with a video wall', (x) => has(x, 'ledwall')],
    ['rooms with microphones', (x) => ['micceil', 'mictable', 'micwireless'].some((c) => has(x, c))], ['rooms with a touch panel and a camera', (x) => has(x, 'touch') && has(x, 'camera')], ['rooms with a tv and speakers without a projector', (x) => has(x, 'display') && has(x, 'speaker') && !has(x, 'projector')],
    ['rooms with open issues', (x) => D.openIssues(x).length > 0], ['rooms with no issues', (x) => D.openIssues(x).length === 0],
    ['rooms with audio problems', (x) => D.openIssues(x).some((i) => i.positions.some((p) => x.positions.find((q) => q.code === p)?.layer === 'audio'))],
  ];
  for (const [q, f] of cases) { const r = U.understand(q); assert.equal(r.mode, 'answer', q); assert.equal(r.total, n(f), `${q} → ${labels(r).join(', ')}`); assert.equal(r.unread.length, 0, `${q}: unread ${r.unread}`); }
});

test('UN-03 "camera" is the camera and not the security camera; "video" alone names no equipment; a brand name is never guessed into a word', () => {
  assert.deepEqual(U.categoriesFor('camera'), ['camera']); assert.deepEqual(U.categoriesFor('cameras'), ['camera']); assert.deepEqual(U.categoriesFor('tv'), ['display']); assert.deepEqual(U.categoriesFor('speakers'), ['speaker']);
  assert.deepEqual(U.categoriesFor('microphone').sort(), ['micceil', 'mictable', 'micwireless']); assert.deepEqual(U.categoriesFor('video'), []); assert.deepEqual(U.categoriesFor('video wall'), ['ledwall']);
  assert.equal(U.correct('zoom'), null, '"zoom" is not "room"'); const z = U.understand('zoom'); assert.equal(z.mode, 'empty'); assert.equal(z.fixes.length, 0);
});

test('UN-04 typing mistakes are corrected, and the reading says which words it changed', () => {
  assert.equal(U.distance('baordroom', 'boardroom'), 1, 'two neighbouring letters swapped count once'); assert.equal(U.distance('bordroom', 'boardroom'), 1); assert.equal(U.distance('camera', 'projector') > 2, true);
  for (const [typed, meant] of [['bordrooms', 'boardrooms'], ['baordroom', 'boardroom'], ['commisioning', 'commissioning'], ['meridain', 'meridian'], ['projecter', 'projector'], ['serch', 'search']]) assert.equal(U.correct(typed), meant, typed);
  for (const fine of ['boardroom', 'halls', 'cameras', 'atlas', '4.218', 'tv', 'mic', 'seats']) assert.equal(U.correct(fine), null, `${fine} needs no correction`);
  const r = U.understand('bordrooms at meridain'); assert.deepEqual(r.fixes, [{ from: 'bordrooms', to: 'boardrooms' }, { from: 'meridain', to: 'meridian' }]); assert.equal(r.corrected, 'boardrooms at meridian');
  assert.equal(r.total, n((x) => x.outline.archetype === 'BRD' && x.outline.building === 'MER'));
  const s = U.understand('serch party'); assert.equal(s.mode, 'lookup'); assert.equal(s.hits[0].label, 'Search Party');
});

test('UN-05 counting equipment: "how many cameras" counts positions and the rooms they are in', () => {
  const r = U.understand('how many cameras'); const positions = recs.reduce((s, x) => s + x.positions.filter((p) => p.cat === 'camera').length, 0); const rooms = n((x) => has(x, 'camera'));
  assert.equal(r.subject, 'devices'); assert.equal(r.total, positions); assert.equal(r.lead, `${positions} camera positions in ${rooms} rooms of 90.`);
  const a = U.understand('how many displays in atlas'); assert.equal(a.total, recs.filter((x) => x.outline.building === 'ATL').reduce((s, x) => s + x.positions.filter((p) => p.cat === 'display').length, 0));
  const h = U.understand('how many rooms have a tv'); assert.equal(h.subject, 'rooms'); assert.equal(h.total, n((x) => has(x, 'display')));
});

test('UN-06 largest, smallest and the closest fit', () => {
  const by = [...recs].sort((a, b) => b.outline.capacity - a.outline.capacity);
  const l = U.understand('largest room'); assert.equal(l.rows[0].id, by[0].outline.id); assert.match(l.lead, new RegExp(`${by[0].outline.capacity} seats`)); assert.ok(l.rows.length <= 5);
  const st = recs.filter((x) => x.outline.archetype === 'STU').sort((a, b) => a.outline.capacity - b.outline.capacity); const s = U.understand('smallest studio'); assert.equal(K.roomById(s.rows[0].id).capacity, st[0].outline.capacity);
  const f = U.understand('rooms for 40 people'); const fits = recs.filter((x) => x.outline.capacity >= 40).sort((a, b) => a.outline.capacity - b.outline.capacity); assert.equal(K.roomById(f.rows[0].id).capacity, fits[0].outline.capacity, 'the closest fit comes first, not the biggest room');
});

test('UN-07 never a dead end: with no match, the reading names the single condition to drop and how many rooms that gives', () => {
  const r = U.understand('20+ seats huddle'); assert.equal(r.total, 0); assert.equal(r.lead, 'No room on record meets all of these.'); assert.ok(r.next.length >= 1);
  for (const s of r.next) { const again = U.understand(s.q); assert.ok(again.total > 0, s.q); assert.match(s.label, new RegExp(`: ${again.total} room`), `${s.label} must state the count its search gives`); }
  const none = U.understand('xyzzy plugh'); assert.equal(none.mode, 'empty'); assert.ok(none.next.length >= 4); for (const s of none.next) { const again = U.understand(s.q); assert.ok(again.mode !== 'empty', `starter "${s.q}" must itself find something`); }
  const many = U.understand('rooms at atlas'); assert.ok(many.next.length >= 1, 'a long list offers ways to narrow it');
  for (const s of many.next) { const again = U.understand(s.q); const m = /: (\d+)$/.exec(s.label); assert.ok(m, s.label); assert.equal(again.total, Number(m[1]), s.q); }
});

test('UN-08 the words that describe a reading read back as the same reading', () => {
  for (const q of ['bordrooms over 12 seats at atlas with a camera', 'training rooms without a projector', 'rooms with audio problems', 'status:held site:egt', 'rooms between 10 and 20 seats on the 2nd floor', 'rooms with no issues at forge', 'control rooms under 10 seats',
    'rooms up to 6 seats', 'rooms for 40 people', 'rooms with a tv and speakers without a projector', 'accepted rooms at atlas or beacon over 50 seats', 'war rooms', 'av-over-ip rooms', 'control tower', 'collaboration rooms', 'executive collaboration rooms', 'lecture halls at highfield']) {
    const a = U.understand(q); const b = U.understand(U.canonical(a.filters)); assert.deepEqual(labels(b), labels(a), `${q} → ${U.canonical(a.filters)}`); assert.equal(b.total, a.total, q); assert.equal(b.fixes.length, 0, 'its own words need no correction');
  }
});

test('UN-09 a name is something to open, not a question: room numbers, products and pages stay lookups', () => {
  for (const [q, first] of [['4.218', /4\.218/], ['Search Party', /^Search Party$/], ['the commisioning dashboard', /Mission Control/], ['mic', /microphone/i]]) { const r = U.understand(q); assert.equal(r.mode, 'lookup', q); assert.match(r.hits[0].label, first, q); assert.equal(r.filters.length, 0, q); }
  const who = U.understand('who supports 4.218'); assert.equal(who.mode, 'lookup'); assert.ok(who.loose, 'no record carries every word, so any-word matches are offered and marked as such'); assert.match(who.hits[0].label, /4\.218/);
  const the = U.understand('the boardroom please'); assert.equal(the.mode, 'answer'); assert.equal(the.total, n((x) => x.outline.archetype === 'BRD'), 'small words do not get in the way');
});

test('UN-10 a role that does not see open issues gets no answer built on them, and is told the condition was left out', () => {
  const may = (f) => f !== 'ask.engineering'; const r = U.understand('rooms with audio problems at atlas', { may });
  assert.ok(!r.filters.some((f) => f.kind === 'issues')); assert.match(r.withheld, /not shown to this role/); assert.equal(r.total, n((x) => x.outline.building === 'ATL'));
  for (const row of r.rows) assert.doesNotMatch(row.detail, /issue|audible|drift/i);
  assert.equal(U.understand('rooms with audio problems at atlas').withheld, null);
});

test('UN-11 words the conditions cannot use are named, never silently dropped; long or odd input cannot break it', () => {
  const r = U.understand('how many purple rooms at atlas'); assert.deepEqual(r.unread, ['purple']); assert.equal(r.total, n((x) => x.outline.building === 'ATL'));
  for (const q of ['', '   ', '?', 'a', '4.218 4.218 4.218', 'rooms with', 'with a', 'seats>', 'over', 'between 5 and', '<script>alert(1)</script>', 'x'.repeat(500), 'rooms '.repeat(60), '(((', 'status: site:', '🙂 rooms']) assert.doesNotThrow(() => U.understand(q), q);
  assert.equal(U.understand('').mode, 'empty'); assert.ok(U.understand('').next.length >= 4);
});

test('UN-12 every row opens a room that exists, and no reading invents a room, a count or an organisation', () => {
  const seen = new Set();
  for (const q of ['rooms', 'rooms held', 'largest room', 'how many cameras', 'rooms with a display', 'accepted rooms', 'rooms at highfield', 'labs', 'rooms for 12 people']) { const r = U.understand(q, { limit: 90 }); assert.ok(r.total <= 90 || r.subject === 'devices'); for (const row of r.rows) { const o = K.roomById(row.id); assert.ok(o, row.id); assert.equal(row.href, K.roomHref(o)); assert.equal(row.label, K.fullName(o)); seen.add(row.id); } }
  assert.ok(seen.size > 60, 'between them these readings reach most of the estate'); assert.equal(recs.length, 90);
});

test('UN-13 a question leads the search bar with its answer; a name leads with the thing named', () => {
  for (const q of ['rooms held', 'how many cameras', 'boardrooms over 12 seats at atlas with a camera', 'rooms with a projector', 'largest room', 'rooms on floor 4', 'accepted boardrooms', 'rooms for 40 people']) assert.equal(U.understand(q).question, true, q);
  for (const q of ['atlas 4.218', 'boardroom', 'atlas', '4.218', 'Search Party', 'mic', 'studios', 'eastgate', 'xyzzy']) assert.equal(U.understand(q).question, false, q);
});
