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

test('the campus has 45 rooms: the thirty, then rows 31–45 of the rooms plan; ids unique; each plan row has one scenario', () => {
  assert.equal(canon.CAMPUS_ROOMS.length, 45);
  assert.equal(canon.ROOMS.length, 30, 'ROOMS stays the thirty for the stories that speak of thirty');
  assert.equal(new Set(canon.CAMPUS_ROOMS.map((r) => r.id)).size, 45);
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
  assert.deepEqual(m.overlaysFor('syseng').map((o) => o.key), ['camera', 'mic', 'speaker', 'access', 'infra']);
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
  assert.equal(m.DESTINATIONS.length, 45 + 14);
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
