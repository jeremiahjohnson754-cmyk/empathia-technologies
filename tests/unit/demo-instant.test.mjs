// Instant Room's rules (apps/demo/src/instant/model.ts). Founder, 11 Nov 2026, §11: guided capture on a phone; "This photo is blurry.
// Please retake it."; "The left wall is not clearly visible yet."; "Confirm the room width using an actual measurement."; "Do not
// instruct users to open energized equipment, bypass physical security, or enter unsafe areas." Held here: the guidance and its safety
// wording; the sharpness and light check as arithmetic; coverage; measurements; differences from the record as questions, not
// verdicts; a plan only when enough was captured, with every guess listed; and a layout study fed only by what a person recorded.
//   node --test tests/unit/demo-instant.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-instant-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as M from './instant/model.ts'; export * as E from './optimizer/engine.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') } });
const { M, E } = await import(pathToFileURL(out).href);
const W = 160, H = 120; const pic = (f) => { const a = new Uint8ClampedArray(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) a[y * W + x] = f(x, y); return a; };
const SHARP = pic((x, y) => ((x >> 3) + (y >> 3)) % 2 ? 200 : 60); const SOFT = pic((x, y) => 90 + Math.round(60 * (x / W))); const DARK = pic((x, y) => ((x >> 3) + (y >> 3)) % 2 ? 30 : 6); const WHITE = pic((x, y) => ((x >> 3) + (y >> 3)) % 2 ? 255 : 240);
const OK = { verdict: 'ok', sharpness: 999, light: 120, say: 'This photo is sharp and well lit.' }; const BLUR = M.assess(SOFT, W, H, 4000, 3000, 'wide');
const photo = (shot, quality = OK, keptAnyway = false) => ({ shot, key: `CAP-${shot}`, at: '2026-11-11T12:00:00Z', quality, keptAnyway });
const full = (extra = {}) => ({ ...M.emptyCapture('R-ATL-4-218', 'Atlas 4.218'), photos: ['front', 'table', 'corner', 'left', 'right', 'ceiling'].map((s) => photo(s)), width: { m: 6.2, how: 'measured' }, length: { m: 9.4, how: 'measured' }, height: { m: 2.9, how: 'measured' }, seats: 14, ...extra });
const word = (c) => ({ display: 'display', camera: 'camera', micceil: 'ceiling microphone', dsp: 'audio processor' }[c] || c);

test('IR-01 the guided shots: the founder’s wording where he gave it, a scope decides what is asked, and the two shots that could tempt a risk say when to leave them', () => {
  const says = M.SHOTS.map((s) => s.say).join(' | ');
  for (const phrase of ['Stand near the entrance and capture the full front wall.', 'Move to the opposite corner.', 'Capture the conference table and display wall.', 'Take a close-up of the camera model label.', 'Capture the rear of the equipment rack if safely accessible.', 'Move closer to the network label.']) assert.ok(says.includes(phrase), phrase);
  assert.deepEqual(M.shotsFor('room').filter((s) => s.required.includes('room')).map((s) => s.id), ['front', 'corner', 'left', 'right', 'ceiling']); assert.deepEqual(M.shotsFor('front').filter((s) => s.required.includes('front')).map((s) => s.id), ['front', 'table']);
  assert.deepEqual(M.shotsFor('equipment').map((s) => s.id), ['camera-label', 'network-label', 'rack-rear']); assert.deepEqual(M.shotById('rack-rear').required, [], 'the back of the rack is never required');
  assert.match(M.shotById('rack-rear').safety, /without opening anything, moving equipment or reaching over cables\. If the rack is locked, enclosed or behind a panel, leave this shot out/); assert.match(M.shotById('camera-label').safety, /Do not climb or move the camera/);
  const all = JSON.stringify(M.SHOTS); for (const m of all.matchAll(/\b(open|climb|unlock|remove the|unplug|behind the)\b[^.]*\./gi)) assert.match(all.slice(Math.max(0, m.index - 60), m.index + m[0].length), /Do not|without opening|leave this shot out|Only if/, m[0]);
  for (const sc of ['room', 'front', 'equipment']) assert.ok(M.SCOPES[sc].says.length > 30);
});

test('IR-02 a photograph is judged by arithmetic on its pixels: blurred, dark, washed out, too small, or upright for a wall; and it says what to do', () => {
  const a = M.assess(SHARP, W, H, 4000, 3000, 'wide'); assert.equal(a.verdict, 'ok'); assert.ok(a.sharpness > M.SHARP_MIN * 5, `sharp ${a.sharpness}`);
  assert.equal(BLUR.verdict, 'blurry'); assert.equal(BLUR.say, 'This photo is blurry. Please retake it.'); assert.ok(BLUR.sharpness < M.SHARP_MIN, `soft ${BLUR.sharpness}`);
  assert.equal(M.assess(DARK, W, H, 4000, 3000, 'wide').verdict, 'dark'); assert.match(M.assess(DARK, W, H, 4000, 3000, 'wide').say, /too dark/); assert.equal(M.assess(WHITE, W, H, 4000, 3000, 'wide').verdict, 'washed-out');
  assert.equal(M.assess(SHARP, W, H, 400, 300, 'wide').verdict, 'small'); assert.equal(M.assess(SHARP, W, H, 3000, 4000, 'wide').verdict, 'upright'); assert.equal(M.assess(SHARP, W, H, 3000, 4000, 'detail').verdict, 'ok', 'a label may be taken upright');
  for (const [l, w, h] of [[[], 0, 0], [SHARP, 4, 4], [SHARP.slice(0, 50), W, H], [SHARP, 1.5, H]]) assert.equal(M.assess(l, w, h, 4000, 3000, 'wide').verdict, 'small');
  // order: a dark blurred picture is told it is dark, which is what the person can fix first
  assert.equal(M.assess(pic(() => 10), W, H, 4000, 3000, 'wide').verdict, 'dark');
});

test('IR-03 a measurement is a number of metres with how it was found; feet and centimetres are caught by range', () => {
  assert.deepEqual(M.readDim(' 6,25 ', 'measured', 'width'), { ok: { m: 6.25, how: 'measured' } }); assert.deepEqual(M.readDim('2.9', 'estimated', 'height'), { ok: { m: 2.9, how: 'estimated' } });
  assert.match(M.readDim('', 'measured', 'width').why, /in metres, as a number/); assert.match(M.readDim('six', 'measured', 'width').why, /as a number/); assert.match(M.readDim('620', 'measured', 'width').why, /metres, not feet or centimetres/); assert.match(M.readDim('1', 'measured', 'length').why, /outside what a room can be/);
  assert.match(M.readDim('30', 'measured', 'height').why, /outside/); assert.match(M.readDim('6', 'guess', 'width').why, /measured, paced or estimated/);
});

test('IR-04 coverage is which guided shots have a photograph that passed: what is missing is said in the founder’s words, a failed photo is not coverage, and one knowingly kept is', () => {
  const none = M.coverage(M.emptyCapture(null, 'New room')); assert.equal(none.complete, false); assert.deepEqual(none.missing.map((s) => s.id), ['front', 'corner', 'left', 'right', 'ceiling']); assert.ok(none.say.includes('The left wall is not clearly visible yet.')); assert.equal(none.say.length, 5);
  const c = full(); assert.equal(M.coverage(c).complete, true); assert.deepEqual(M.coverage(c).say, []); assert.ok(M.coverage(c).walls.every((w) => w.seen));
  const blurred = full({ photos: [...full().photos.filter((p) => p.shot !== 'left'), photo('left', BLUR)] }); const cb = M.coverage(blurred); assert.equal(cb.complete, false); assert.deepEqual(cb.missing.map((s) => s.id), ['left']); assert.deepEqual(cb.say, ['The left wall is not clearly visible yet.', 'The left wall: This photo is blurry. Please retake it.']);
  assert.equal(M.coverage({ ...blurred, photos: [...blurred.photos, photo('left')] }).complete, true, 'the latest photograph of a shot is the one that counts');
  assert.equal(M.coverage(full({ photos: [...full().photos.filter((p) => p.shot !== 'left'), photo('left', BLUR, true)] })).complete, true, 'kept anyway');
  const eq = M.coverage({ ...M.emptyCapture(null, 'x'), scope: 'equipment' }); assert.deepEqual(eq.missing.map((s) => s.id), ['camera-label', 'network-label']); assert.deepEqual(eq.say, ['Still to take: the camera’s model label.', 'Still to take: the network label.']);
  assert.equal(M.coverage({ ...M.emptyCapture(null, 'x'), scope: 'equipment', photos: [photo('camera-label'), photo('network-label')] }).complete, true, 'the rack is optional');
  assert.equal(M.coverage({ ...M.emptyCapture(null, 'x'), scope: 'front', photos: [photo('front'), photo('table')] }).complete, true);
});

test('IR-05 differences from the room’s record are questions for a person, not verdicts, and nothing is compared that was not captured', () => {
  const rec = { name: 'Atlas 4.218', dims: [9.4, 6.2, 2.9], seats: 14, equipment: { display: 2, camera: 1, micceil: 2 } };
  const d = [{ id: 'a', category: 'display', place: 'front', label: '', shot: 'front' }, { id: 'b', category: 'camera', place: 'front', label: 'PTZ-12', shot: 'camera-label' }, { id: 'c', category: 'micceil', place: 'ceiling', label: '', shot: 'ceiling' }];
  assert.deepEqual(M.findings(full({ details: d }), rec, word), [], 'the same room, whichever way round its sides are given');
  const f = M.findings(full({ width: { m: 7.5, how: 'paced' }, seats: 16, details: [d[0], { id: 'x', category: 'dsp', place: 'rack', label: '', shot: null }] }), rec, word).map((x) => `${x.kind}: ${x.text}`);
  assert.deepEqual(f, ['dimension: You recorded 7.5 m by 9.4 m; the record says 6.2 m by 9.4 m. One of them needs checking, and yours was not measured.', 'seats: You counted 16 seats; the record says 14.', 'not-in-record: You recorded an audio processor; the record lists none.',
    'not-seen: The record lists a camera; you recorded none. It may simply not have been in a photograph.', 'not-seen: The record lists 2 ceiling microphones; you recorded none. It may simply not have been in a photograph.']);
  assert.deepEqual(M.findings(full(), null, word), [{ kind: 'no-record', text: 'This space has no record to compare with. What you captured would be its first.' }]);
  assert.ok(!M.findings(full({ scope: 'front', details: [] }), rec, word).some((x) => x.kind === 'not-seen'), 'the front of a room does not show everything the record lists');
  assert.deepEqual(M.findings(full({ width: null, details: d }), rec, word), [], 'no width, no comparison of size');
});

test('IR-06 a plan is drawn only when enough was captured; it is a rectangle of what was recorded, and every guess in it is listed', () => {
  assert.deepEqual(M.planOf(full({ width: null })).why, ['Confirm the room width using an actual measurement.']); assert.match(M.planOf({ ...full(), scope: 'equipment' }).why[0], /needs the room, not only its equipment/);
  assert.deepEqual(M.planOf(full({ photos: full().photos.filter((p) => p.shot !== 'left') })).why, ['The left wall is not clearly visible yet.']);
  const d = [{ id: 'a', category: 'display', place: 'front', label: '', shot: 'front' }, { id: 'b', category: 'camera', place: 'front', label: 'PTZ-12', shot: 'camera-label' }, { id: 'c', category: 'micceil', place: 'ceiling', label: '', shot: 'ceiling' }, { id: 'r', category: 'dsp', place: 'rack', label: '', shot: null }, { id: 'l', category: 'speaker', place: 'left', label: '', shot: 'left' }];
  const p = M.planOf(full({ details: d })).ok; assert.equal(p.width, 6.2); assert.equal(p.length, 9.4); assert.equal(p.basis, 'MEASURED'); assert.equal(p.markers.length, 5);
  for (const m of p.markers) assert.ok(m.x >= 0 && m.x <= p.width && m.y >= 0 && m.y <= p.length, JSON.stringify(m));
  const at = (id) => p.markers.find((m) => m.id === id); assert.equal(at('a').y, 0); assert.equal(at('b').y, 0); assert.ok(at('a').x < at('b').x, 'two things on one wall are spread along it'); assert.equal(at('l').x, 0); assert.ok(at('r').x > p.width / 2 && at('r').y > p.length / 2);
  assert.deepEqual(p.assumptions, ['The room is drawn as a rectangle. If it is not one, the plan is wrong where the walls are not square.', 'Equipment is drawn on the wall you said, spread evenly along it. Nobody measured where along the wall it is.', 'The rack is drawn in the rear right corner as a placeholder; say where it really is before anyone relies on the plan.']);
  const q = M.planOf(full({ length: { m: 9, how: 'paced' }, height: null, photos: [...full().photos.filter((x) => x.shot !== 'left'), photo('left', BLUR, true)] })).ok; assert.equal(q.basis, 'PART-ESTIMATED');
  assert.ok(q.assumptions.includes('The length (9 m) was paced out, not measured.')); assert.ok(q.assumptions.includes('No height was recorded, so nothing here depends on it.')); assert.ok(q.assumptions.some((a) => /kept although the sharpness and light check did not pass it/.test(a)));
});

test('IR-07 a layout is studied only from what a person recorded, says what it assumed, and its scores are the optimizer’s, marked as modelled', () => {
  assert.match(M.studyInput(full({ seats: null })).why, /how many people/); assert.match(M.studyInput(full({ seats: 4 })).why, /6 to 400/); assert.match(M.studyInput(full({ width: null })).why, /width and length/);
  const s = M.studyInput(full()); assert.deepEqual(s.ok.dims, [6.2, 9.4, 2.9]); assert.equal(s.ok.capacity, 14); assert.deepEqual(s.assumed, ['Step-free access is assumed. Say if the room has steps.', 'The room is studied as a meeting room with seats at tables.']);
  assert.ok(M.studyInput(full({ height: null })).assumed.includes('No height was recorded: the study assumes a 3 m ceiling.'));
  const r = E.compare(s.ok); assert.equal(r.studies.length, 3); for (const st of r.studies) { assert.ok(st.scores.every((x) => x.basis === 'MODELED')); assert.ok(st.layout.seats.length > 0 && st.layout.screens.length > 0); assert.ok(Math.abs(st.layout.depth * st.layout.width - 6.2 * 9.4) < 0.01, 'the study is of the captured room'); }
});
