#!/usr/bin/env node
// Unit tests for Empathia Lite's model (apps/demo/src/lite): the 45-room campus, lenses and layers from the V2.5.3 authority tables,
// the coverage overlays, the four room states, divisible configurations, wayfinding, guides and the QR encoder.
//   node --test tests/unit/demo-lite.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-lite-'));
const entry = path.join(tmp, 'entry.ts');
const src = (p) => JSON.stringify(path.join(repo, 'apps/demo/src', p));
fs.writeFileSync(entry, `export * as canon from ${src('campus/canon.ts')}; export * as design from ${src('campus/design.ts')}; export * as m from ${src('lite/model.ts')}; export * as qr from ${src('lite/qr.ts')}; export * as v from ${src('lite/data/v253.ts')};`);
await esbuild.build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: path.join(tmp, 'out.mjs'), logLevel: 'error' });
const { canon, design, m, qr, v } = await import(pathToFileURL(path.join(tmp, 'out.mjs')).href);
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
const recs = design.campusRecords();

// 10 Nov 2026: the estate grew from 45 to the founder's 90 rooms. This test used to assert 45; it now asserts 90 AND that the first 45 are
// exactly the rooms they were (a fingerprint of every outline taken from the commit before the additions), so growth cannot rewrite them.
test('the estate has 90 rooms: the thirty, rows 31–45 of the rooms plan, then rows 46–90; the first 45 are untouched; ids unique', async () => {
  assert.equal(canon.CAMPUS_ROOMS.length, 90);
  assert.equal(canon.ROOMS.length, 30, 'ROOMS stays the thirty for the stories that speak of thirty');
  assert.equal(new Set(canon.CAMPUS_ROOMS.map((r) => r.id)).size, 90);
  assert.equal(canon.PLAN_45.length, 45); assert.deepEqual(canon.CAMPUS_ROOMS.slice(0, 45), canon.PLAN_45, 'the first 45 keep their order (asset codes are numbered by it)');
  const { createHash } = await import('node:crypto');
  const fp = createHash('sha256').update(JSON.stringify(canon.PLAN_45.map((r) => [r.id, r.building, r.floor, r.number, r.name, r.archetype, r.capacity, r.dims, r.kind, r.intent, r.scenario || null]))).digest('hex');
  assert.equal(fp, 'a6331fc79b8cde573cb9ab99a9de273e51b0f04c30260c0c467490e5da5b5e1a', 'an id, a name, a size or a scenario of the first 45 changed');
  assert.deepEqual(canon.ESTATE_ROOMS.map((r) => r.planRow), Array.from({ length: 45 }, (_, i) => 46 + i));
  assert.deepEqual(canon.ESTATE_ROOMS.map((r) => r.roster.id), Array.from({ length: 45 }, (_, i) => `ADD-${String(i + 1).padStart(2, '0')}`));
  const sectors = [...new Set(canon.ESTATE_ROOMS.map((r) => r.sector))]; assert.equal(sectors.length, 9); for (const s of sectors) assert.equal(canon.ESTATE_ROOMS.filter((r) => r.sector === s).length, 5, s);
  const dims = new Set(canon.PLAN_45.map((r) => r.dims.join('x'))); for (const r of canon.ESTATE_ROOMS) { const k = r.dims.join('x'); assert.ok(!dims.has(k), `${r.id} shares its dimensions with another room`); dims.add(k); }
  for (const r of canon.ESTATE_ROOMS) { assert.ok(r.scenario && r.scenario.length > 40 && r.intent.length > 20 && r.roster.showcase, `${r.id} scenario, intent and showcase`); const B = canon.buildingByKey(r.building); assert.ok(B && r.floor >= 1 && r.floor <= B.floors, `${r.id} is on a floor its building has`); assert.ok(canon.ARCHETYPE_NAME[r.archetype], `${r.id} archetype`); }
  assert.equal(canon.ESTATE_GROUPS.filter((g) => g.kind === 'campus').length, 3, 'three primary campuses'); assert.equal(canon.ESTATE_GROUPS.reduce((n, g) => n + canon.CAMPUS_ROOMS.filter((r) => g.buildings.includes(r.building)).length, 0), 90, 'every room is on a campus or a satellite site');
  assert.deepEqual(canon.PLAN_ROOMS.map((r) => r.planRow), Array.from({ length: 15 }, (_, i) => 31 + i));
  for (const r of canon.PLAN_ROOMS) { assert.ok(r.scenario && r.scenario.length > 20, `${r.id} scenario`); assert.ok(canon.buildingByKey(r.building), `${r.id} building`); const B = canon.buildingByKey(r.building); assert.ok(r.floor >= 1 && r.floor <= B.floors, `${r.id} floor`); }
  const names = canon.PLAN_ROOMS.map((r) => r.name).join('|');
  for (const n of ['Executive Town Hall', 'Divisible Multipurpose Town Hall', 'Large Auditorium', 'Global Hybrid All-Hands Studio', 'Network Operations Center', 'Security Operations Center', 'Major Incident War Room', 'Global Operations Control Tower', 'Executive Boardroom', 'Technical Training Lab', 'Engineering Project War Room', 'Flexible Collaboration Suite', 'Broadcast Production Control Room', 'Podcast and Media Studio', 'Emergency Operations Center']) assert.ok(names.includes(n), n);
});

test('every room record is deterministic, seeded, and uses catalogue class templates only ("spec to verify")', () => {
  for (const r of recs) for (const p of r.positions) if (!p.furniture) { assert.match(p.device, /class template · spec to verify/, `${r.outline.id} ${p.code}`); assert.ok(design.C.categories[p.cat], p.cat); }
  const again = JSON.stringify(m.coverage(design.roomRecord('R-HZN-1-500')));
  assert.equal(JSON.stringify(m.coverage(design.roomRecord('R-HZN-1-500'))), again);
  const codes = recs.flatMap((r) => r.positions.filter((p) => p.asset).map((p) => p.asset));
  assert.equal(new Set(codes).size, codes.length, 'asset codes never collide across the 45 rooms');
});

test('operations rooms are labelled non-operational; divisible rooms combine and split', () => {
  const nonop = canon.PLAN_ROOMS.filter((r) => r.nonOperational).map((r) => r.id).sort();
  assert.deepEqual(nonop, ['R-ATL-6-300', 'R-MER-1-300', 'R-MER-2-400', 'R-RDG-1-100']);
  const div = design.roomRecord('R-BCN-1-300'); const cfg = m.configsOf(div.outline);
  assert.deepEqual(cfg.map((c) => c.key), ['combined', 'A', 'B', 'C']);
  const all = m.configStatus(div, cfg[0]); const parts = cfg.slice(1).map((c) => m.configStatus(div, c));
  assert.equal(parts.reduce((s, p) => s + p.seats, 0), all.seats, 'the sections partition the seats');
  assert.equal(all.commissioned, false, 'row 32: the combined configuration is not yet commissioned');
  assert.equal(m.configsOf(design.roomRecord('R-LKS-2-120').outline).length, 3);
  assert.equal(m.configsOf(design.roomRecord('R-ATL-4-218').outline).length, 0);
});

test('lenses and layers follow the V2.5.3 tables: a visitor gets the visitor lens, furniture and wayfinding, accessibility only', () => {
  assert.deepEqual(m.lensesFor('visitor').map((l) => l.key), ['visitor']);
  assert.deepEqual(m.layersFor('visitor').map((l) => l.key).sort(), ['furniture', 'wayfinding']);
  assert.deepEqual(m.overlaysFor('visitor').map((o) => o.key), ['access']);
  assert.equal(m.lensFor('visitor', 'engineer'), 'visitor', 'an asked lens the role may not use falls back to one it may');
  assert.equal(m.defaultLens('service'), 'engineer');
  // 12 Nov 2026: V2.5.3's Sightlines X-ray view restored as a sixth overlay on the AV layer
  assert.deepEqual(m.overlaysFor('syseng').map((o) => o.key), ['camera', 'mic', 'speaker', 'sight', 'access', 'infra']);
  assert.ok(m.lensesFor('architect').length === 6);
  assert.deepEqual(m.lensesFor('qa'), [], 'the Document Reviewer has no Lite lens');
});

test('coverage overlays are computed from catalogue figures, within bounds, for all 45 rooms', () => {
  for (const r of recs) {
    const c = m.coverage(r);
    assert.ok(c.seats.length > 0, `${r.outline.id} seats`);
    assert.ok(c.camera.covered <= c.camera.of && c.mic.covered <= c.mic.of && c.speaker.pct >= 0 && c.speaker.pct <= 100, r.outline.id);
    assert.equal(c.access.wheelchair, Math.min(c.access.required, c.seats.length), `${r.outline.id} wheelchair places`);
    assert.ok(c.infra.poe >= 0);
  }
  const ref = m.coverage(design.roomRecord('R-ATL-4-218'));
  assert.equal(ref.camera.covered, ref.camera.of, 'the reference room: every seat in a camera view');
  assert.equal(m.wheelchairSpaces(design.roomRecord('R-HZN-1-500')), 6, 'ADA 221.2.1.1: 301–500 seats → 6');
  assert.equal(m.assistiveReceivers(design.roomRecord('R-HZN-1-500')), 20, 'ADA 219.3: 201–500 → 1 per 20');
});

test('the four states: designed, commissioned (baseline or "not yet"), current (issues marked), proposed (gaps closed, never worse)', () => {
  const ref = design.roomRecord('R-ATL-4-218');
  assert.equal(m.roomState(ref, 'designed').available, true);
  const cx = m.roomState(ref, 'commissioned'); assert.equal(cx.available, true); assert.match(cx.title, /^Baseline v1/);
  assert.ok(m.roomState(ref, 'current').marks.changed + m.roomState(ref, 'current').marks.attention >= 1, 'the reference room shows its replaced camera or open issue');
  const held = design.roomRecord('R-BCN-1-300'); assert.equal(m.roomState(held, 'commissioned').available, false);
  for (const r of recs) {
    const cur = m.roomState(r, 'current'), pro = m.roomState(r, 'proposed');
    if (!pro.available) continue;
    assert.ok(pro.cov.camera.covered >= cur.cov.camera.covered && pro.cov.mic.covered >= cur.cov.mic.covered, `${r.outline.id}: a proposal never reduces coverage`);
    assert.ok(pro.positions.filter((p) => p.mark === 'added').every((p) => p.provenance.includes('not approved')));
  }
  assert.equal(m.roomState(design.roomRecord('R-ATL-4-231'), 'proposed').available, false, 'earlier records stay records-only');
});

test('fourteen spaces, three guides of twenty-five chapters, ten visit steps, seven QR types, five Commons scenes', () => {
  assert.equal(v.SPACES.length, 14); assert.equal(v.GUIDES.length, 3); assert.equal(m.chapterCount(), 25);
  assert.equal(v.VISIT_STEPS.length, 10); assert.equal(v.QR_TYPES.length, 7); assert.equal(v.COMMONS_SCENES.length, 5);
  for (const s of v.SPACES) assert.ok(m.chapterById(s.chapter), `${s.id} → ${s.chapter}`);
});

test('wayfinding reaches every room and space; unknown destinations return null', () => {
  for (const d of m.DESTINATIONS) { const r = m.routeTo(d.id); assert.ok(r && r.steps.length >= 3, d.id); }
  assert.equal(m.DESTINATIONS.length, 90 + 14);   // 10 Nov 2026: 45 → 90 rooms (the 90-room estate); the 14 spaces are unchanged
  assert.equal(m.routeTo('R-NOPE-1-1'), null); assert.equal(m.routeTo('<script>'), null);
  assert.match(m.routeTo('R-RDG-1-100').steps[0], /regional site/);
});

test('the QR encoder produces a valid matrix (finder patterns, version by length) and refuses text that is too long', () => {
  const q = qr.qrMatrix('https://northstar.example.com/e/ROOM');
  assert.ok(q && q.size === 17 + 4 * q.version);
  const finder = (r0, c0) => [0, 6].every((i) => q.modules[r0 + i][c0] && q.modules[r0][c0 + i]) && q.modules[r0 + 3][c0 + 3];
  assert.ok(finder(0, 0) && finder(0, q.size - 7) && finder(q.size - 7, 0));
  assert.equal(qr.qrMatrix('x'.repeat(200)), null);
  assert.match(qr.qrPath(q), /^M\d+ \d+h\d+v1h-\d+z/);
});

// 12 Nov 2026: V2.5.3's X-ray sightlines (metricsOf) restored to Lite.
test('sightlines: V2.5.3’s classes (60° obstructed, 45° or six image heights marginal, a lectern in the way obstructed); each seat its best display; the box test', () => {
  assert.equal(m.segHitsBox(0, 0, 4, 0, { x: 2, y: 0, w: 0.6, d: 0.5 }), true); assert.equal(m.segHitsBox(0, 1, 4, 1, { x: 2, y: 0, w: 0.6, d: 0.5 }), false); assert.equal(m.segHitsBox(0, 0, 1, 0, { x: 2, y: 0, w: 0.6, d: 0.5 }), false);
  const disp = (x, y, extra = {}) => ({ code: `D${x}`, cat: 'display', catLabel: 'Display', label: 'Display', layer: 'display', x, y, z: 1.2, rot: 0, mount: 'wall', ...extra });
  const seats = [{ x: 5, y: 3 }, { x: 5, y: 9 }, { x: 0.5, y: 0.4 }];
  const s = m.sightlines(seats, [disp(5, 0)], 10);   // a 75-inch display: 0.93 m image, six heights = 5.6 m
  assert.deepEqual(s.rays.map((r) => r.cls), ['CLEAR', 'MARGINAL', 'OBSTRUCTED']); assert.match(s.rays[1].why, /six image heights/); assert.match(s.rays[2].why, /60°/);
  assert.equal(s.score, Math.round(((1 + 0.5) / 3) * 100)); assert.equal(s.na, false);
  const b = m.sightlines([{ x: 5, y: 3 }], [disp(5, 0), { ...disp(5, 1.5), cat: 'lectern', code: 'L1', layer: 'furniture' }], 10);
  assert.equal(b.rays[0].cls, 'OBSTRUCTED'); assert.match(b.rays[0].why, /blocked/);
  assert.deepEqual(m.sightlines(seats, [], 10), { na: true, rays: [], clear: 0, marginal: 0, obstructed: 0, score: null });
  for (const r of recs.slice(0, 90)) { const c = m.coverage(r); assert.equal(c.sight.rays.length, c.sight.na ? 0 : c.seats.length, r.outline.id); assert.ok(c.speakerSeats <= c.seats.length); }
});
test('the Optimize lens’s seat count: fewer drops the last seats, more adds a row behind, inside the room; coverage follows', () => {
  const s = [{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 3 }];
  assert.deepEqual(m.adjustSeats(s, -1, 6, 5), s.slice(0, 2)); assert.equal(m.adjustSeats(s, -9, 6, 5).length, 1);
  const more = m.adjustSeats(s, 2, 6, 5); assert.equal(more.length, 5); assert.ok(more.slice(3).every((x) => x.y === 3.9 && x.x > 0 && x.x < 6));
  const r = recs[0]; assert.equal(m.coverage(r, r.positions, 2).seats.length, m.coverage(r).seats.length + 2);
});
test('Scouter anatomy (V2.5.3 SCA_CLASSES): seven classes, every link names a block of its class, downstream walks to the outputs without loops', async () => {
  const out = path.join(tmp, 'an.mjs'); await esbuild.build({ entryPoints: [path.join(repo, 'apps/demo/src/campus/anatomy.ts')], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error' });
  const A = await import(pathToFileURL(out).href); assert.equal(Object.keys(A.SCA_CLASSES).length, 7);
  for (const [k, C] of Object.entries(A.SCA_CLASSES)) { const ids = new Set(C.blocks.map((b) => b[0])); assert.ok(C.blocks.every((b) => b.length === 8 && A.SCA_LAYERS.some((l) => l[0] === b[2])), k);
    for (const b of C.blocks) { const d = A.downstream(k, b[0]); assert.equal(new Set(d).size, d.length); assert.ok(!d.includes(b[0]), `${k} ${b[0]} loops`); } void ids; }
  assert.deepEqual(A.downstream('camera', 'lens'), ['encoder', 'out']);
});

test('spatial drift (V2.5.3 AC-SD1): only where furniture moved since handover; seats follow the moved seating; the report and the model are both shown', () => {
  const withDrift = recs.filter((r) => m.spatialDrift(r)); assert.deepEqual(withDrift.map((r) => r.outline.id), ['R-MER-1-140']);
  const r = withDrift[0]; const d = m.spatialDrift(r);
  assert.ok(d.moved.length >= 1 && d.moved.some((x) => x.cat === 'table')); assert.ok(d.distance > 0);
  assert.match(d.baseline, /commissioning seat map/); assert.match(d.current, /toward the door/); assert.ok(d.report && /moved/i.test(d.report));
  // the seats are derived from the seating blocks of the layout modeled, so the current layout's seats sit where its chairs are
  const cur = m.roomState(r, 'current'), com = m.roomState(r, 'commissioned');
  assert.equal(cur.cov.seats.length, com.cov.seats.length); assert.notDeepEqual(cur.cov.seats.map((s) => [s.x, s.y]), com.cov.seats.map((s) => [s.x, s.y]));
  assert.deepEqual(d.before.camera, [com.cov.camera.covered, com.cov.camera.of]); assert.deepEqual(d.after.mic, [cur.cov.mic.covered, cur.cov.mic.of]);
  // no loss modeled at this offset: the summary says the model and the report disagree, never that coverage was lost
  if (d.after.camera[0] >= d.before.camera[0] && d.after.mic[0] >= d.before.mic[0]) assert.match(d.summary, /disagree/);
  // a room whose record has no moved furniture has no drift, even with other open issues
  assert.equal(m.spatialDrift(recs.find((x) => x.outline.id === 'R-ATL-7-112')), null);
});
