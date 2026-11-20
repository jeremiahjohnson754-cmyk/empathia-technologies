// Lite studio model (apps/demo/src/lite/studio.ts) against V2.5.3's v25LiteGeometry / v25LiteCreate / v25LitePredict / v25LiteCorrect /
// v25LiteAdd / v25LiteMove / v25LiteVariant (read as text). Restored 12 Nov 2026.   node --test tests/unit/lite-studio.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lite-studio-')); const entry = path.join(tmp, 'e.ts');
fs.writeFileSync(entry, `export * as s from ${JSON.stringify(path.join(repo, 'apps/demo/src/lite/studio.ts'))}; export * as d from ${JSON.stringify(path.join(repo, 'apps/demo/src/campus/design.ts'))};`);
await esbuild.build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: path.join(tmp, 'o.mjs'), logLevel: 'error' });
const { s, d } = await import(pathToFileURL(path.join(tmp, 'o.mjs')).href);
test('LS-01 geometry: a room gives the campus model (not a survey) at ±30 %; no room gives the archetype, conceptual, ±100 %', () => {
  const r = d.roomRecord('R-ATL-4-218'); const g = s.geometryFor({ room: r });
  assert.equal(g.dims.length.source, 'MODEL'); assert.equal(g.dims.length.value, r.outline.dims[1]); assert.equal(g.dims.width.value, r.outline.dims[0]); assert.match(g.dims.length.basis, /not a survey/);
  const a = s.geometryFor({ archetype: 'HUD' }); assert.equal(a.capacity, 4); assert.equal(a.dims.length.source, 'ARCHETYPE'); assert.equal(a.dims.length.uncertainty, `±${a.dims.length.value} m`);
  const m = s.createModel('LM-1', { archetype: 'HUD' }); assert.equal(m.confidence, 'CONCEPTUAL'); assert.equal(s.createModel('LM-2', { room: r }).confidence, 'MODELED');
});
test('LS-02 create: the recipe’s placements in the room, seats in the seating zone, proposed test points; the townhall’s stage and extra points', () => {
  const m = s.createModel('LM-1', { room: d.roomRecord('R-ATL-4-218') }); const { width: W, length: L } = m.geometry;
  assert.equal(m.seats.length, m.capacity); assert.ok(m.placements.every((p) => p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= L && p.state === 'MODELED'));
  const z = m.zones.find((x) => x.kind === 'seating').rect; assert.ok(m.seats.every((q) => q.x >= z[0] && q.x <= z[2] && q.y >= z[1] && q.y <= z[3]));
  assert.equal(m.testPoints.length, 3); assert.ok(m.testPoints.every((t) => t.state === 'PROPOSED'));
  const t = s.createModel('LM-T', { archetype: 'TWN' }); assert.ok(t.zones.some((x) => x.kind === 'stage')); assert.equal(t.testPoints.length, 7); assert.equal(t.placements.filter((p) => p.kind === 'speaker').length, 16);
});
test('LS-03 predict: a camera aimed at the audience covers seats in front of it within its half-angle; reach circles count seats once', () => {
  const m = { geometry: { width: 6, length: 8, height: 3 }, seats: [{ id: 'a', x: 3, y: 4 }, { id: 'b', x: 0.1, y: 0.5 }, { id: 'c', x: 3, y: 7 }],
    placements: [{ id: 'C', kind: 'camera', label: 'Camera 1', x: 3, y: 0.2, z: 1.8, state: 'MODELED', source: '', hfov: 90, aim: 'audience' }, { id: 'M1', kind: 'micceil', label: 'm', x: 3, y: 4, z: 2.7, state: 'MODELED', source: '', reach: 2 }, { id: 'M2', kind: 'micceil', label: 'm', x: 3, y: 5, z: 2.7, state: 'MODELED', source: '', reach: 2 }] };
  const p = s.predict(m); assert.equal(p.fov[0].seatsCovered, 2); assert.equal(p.mic.seatsCovered, 2);   // c sits exactly on M2's 2 m edge: inside, as V2.5.3's <= assert.equal(p.mic.devices, 2); assert.match(p.mic.note, /not a coverage measurement/);
});
test('LS-04 correct, add, move, variant: each needs what V2.5.3 needs and bumps the version; a correction is manually proposed, never verified', () => {
  const m = s.createModel('LM-1', { room: d.roomRecord('R-ATL-4-218') });
  assert.equal(s.correct(m, 'length', 9, '').ok, false); assert.equal(s.correct(m, 'length', -1, 'tape').ok, false);
  const c = s.correct(m, 'length', 9.4, 'tape measurement', '±0.05 m'); assert.ok(c.ok); assert.equal(c.model.version, 2); assert.equal(c.model.dims.length.state, 'MANUALLY_PROPOSED'); assert.equal(c.model.geometry.length, 9.4); assert.equal(c.model.confidence, 'DECLARED');   // a person's word ranks with a request (V2.5.3)
  assert.equal(s.addPlacement(m, 'camera', 99, 1).ok, false); const a = s.addPlacement(m, 'speaker', 1, 1); assert.ok(a.ok); assert.equal(a.model.placements.at(-1).state, 'DESIGNED'); assert.equal(a.model.placements.at(-1).reach, 3.5);
  const mv = s.movePlacement(m, 'PL1', -5, 1); assert.ok(mv.ok); assert.equal(mv.model.placements[0].x, 0); assert.equal(mv.model.placements[0].source, 'designer');
  assert.equal(s.variantOf(m, 'LM-2', ' ').ok, false); const v = s.variantOf(m, 'LM-2', 'second camera'); assert.ok(v.ok); assert.equal(v.model.variantOf, 'LM-1'); assert.equal(v.model.version, 1); assert.match(v.model.name, /variant 1 · v1$/);
});
test('Field Intelligence (V2.5.3 v25LiteToFi, v25LiteReconcile): the package says nothing is measured; an observation changes the model only when accepted, with a reason', () => {
  const m = s.createModel('LM-001', { room: d.roomRecord('R-ATL-4-218') }); const pkg = s.toFi(m);
  assert.equal(pkg.schemaVersion, 'empathia.lite-fi.sync.v2.5'); assert.deepEqual(pkg.protocols.map((p) => p.id), ['PROTO-LAEQ-SEATS', 'PROTO-STIPA', 'PROTO-RT60', 'PROTO-FOV']);
  assert.ok(Object.values(pkg.dims).every((x) => x.verified === false)); assert.match(pkg.note, /nothing .* is a measurement/);
  assert.equal(s.observe(m, 'length', 9.9, ' ').ok, false); assert.equal(s.observe(m, 'length', -1, 'survey').ok, false);
  const o = s.observe(m, 'length', 9.92, 'laser survey'); assert.ok(o.ok); assert.equal(o.model.version, m.version, 'an observation alone changes nothing'); assert.equal(o.model.geometry.length, m.geometry.length);
  assert.equal(s.observe(o.model, 'length', 9.5, 'again').ok, false, 'one open reconciliation per dimension');
  assert.equal(s.reconcile(o.model, 'REC-1', 'accept', '', 'syseng').ok, false);
  const k = s.reconcile(o.model, 'REC-1', 'keep', 'the survey missed the alcove', 'syseng'); assert.ok(k.ok); assert.equal(k.model.geometry.length, m.geometry.length); assert.equal(k.model.reconciliations[0].state, 'KEPT_MODEL');
  const a = s.reconcile(o.model, 'REC-1', 'accept', 'survey with a calibrated meter', 'syseng'); assert.ok(a.ok); assert.equal(a.model.geometry.length, 9.92); assert.equal(a.model.dims.length.source, 'SURVEY'); assert.equal(a.model.dims.length.state, 'FIELD_OBSERVED'); assert.equal(a.model.version, m.version + 1);
});
