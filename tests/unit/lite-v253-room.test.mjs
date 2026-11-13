#!/usr/bin/env node
// The furnished rooms (13 Nov 2026, founder 50/10 Lite directive): V2.5.3's own room code (apps/demo/src/lite/v253/vendor.js) on this
// campus's room records. Every room V2.5.3 could draw is drawn in every state, lens and coverage set with finite geometry; the hero rooms
// keep their own arrangements; the rooms V2.5.3 never drew are named, not drawn with invented furniture; the vendored module is V2.5.3's code.
//   node --test tests/unit/lite-v253-room.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lite-v253-'));
await esbuild.build({ entryPoints: [path.join(repo, 'apps/demo/src/lite/v253/v253room.ts')], bundle: true, platform: 'node', format: 'esm', outfile: path.join(tmp, 'out.mjs'), logLevel: 'error' });
const M = await import(pathToFileURL(path.join(tmp, 'out.mjs')).href);
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
const STATES = ['designed', 'commissioned', 'current', 'proposed'];
const LENSES = ['visitor', 'employee', 'user', 'engineer', 'exec', 'optimize'];
const ALL_LAYERS = ['furniture', 'av', 'network', 'power', 'control', 'environment', 'occupancy', 'wayfinding'];
const ALL_COVER = ['fov', 'mic', 'spk', 'sight', 'acoustic'];
const finite = (it) => (it.p || [it.at]).every((q) => q.every((n) => Number.isFinite(n)));
// the town halls and control rooms V2.5.3 had no general layout for (it drew those types only as its own named hero rooms)
const NOT_DRAWN = ['R-NST-2-101', 'R-BCN-3-236', 'R-ATL-1-150', 'R-HZN-1-500', 'R-HZN-2-220', 'R-HZN-2-410', 'R-HZN-2-420', 'R-HZN-1-420', 'R-NST-1-410', 'R-WMR-1-130', 'R-HFD-1-110', 'R-HFD-1-140', 'R-FRG-1-410', 'R-EGT-1-110'];

// 13 Nov 2026: the founder chose to draw these 14 from V2.5.3's own townhall and control-room layouts, scaled to each room (was: left undrawn)
test('every room is drawn (the founder’s 90 and V2.5.3’s 50); the 14 V2.5.3 never drew are exactly the town halls and control rooms, each scaled from V2.5.3’s layout for its type', () => {
  const ids = M.v253RoomIds(); assert.equal(ids.length, 140);   // 13 Nov 2026: + V2.5.3's 50 rooms
  assert.deepEqual(ids.filter((id) => !M.v253Drawable(id)), []);
  assert.deepEqual(ids.filter((id) => M.v253ScaledFrom(id)).sort(), [...NOT_DRAWN].sort());
});

test('a scaled room keeps inside its own walls, borrows V2.5.3’s design but not its story, and seats about its capacity within V2.5.3’s blocks', () => {
  for (const id of NOT_DRAWN) {
    const L = M.v253Layout(id, 'current'); const src = M.v253ScaledFrom(id);
    assert.ok(L.objs.every((o) => o.x >= -0.01 && o.y >= -0.01 && o.x <= L.w + 0.01 && o.y <= L.d + 0.01), `${id}: an object outside the room`);
    if (/townhall/.test(src)) {
      assert.ok(L.objs.some((o) => o.kind === 'stage') && L.objs.filter((o) => o.kind === 'seatblock').length === 4, `${id}: stage and four seating blocks`);
      assert.ok(!L.wireless || (!L.wireless.drop && !L.wireless.zone), `${id}: Horizon 1.400's dropped-channel story is not carried`);
      assert.ok(L.seats.length >= 40, `${id}: ${L.seats.length} seats`);
    } else assert.ok(L.objs.filter((o) => o.kind === 'display').length === 4 && L.objs.filter((o) => o.kind === 'desk').length === 2, `${id}: the control room's wall and two desks`);
  }
});

test('every room, in every state and lens, with no layers or with every layer and coverage on, from four sides: finite geometry, never empty', () => {
  const bad = []; let n = 0;
  for (const id of M.v253RoomIds()) for (const state of STATES) for (const mode of LENSES) for (const [layers, cover] of [[[], []], [ALL_LAYERS, ALL_COVER]]) for (const yaw of [30, 120, 210, 300]) {
    const r = M.v253Room(id, { mode, state, layers, cover }, { yaw, small: false }); n += 1;
    if (!r || !r.sc.items.length || !r.sc.items.every(finite)) bad.push(`${id} ${state} ${mode} ${yaw}`);
  }
  assert.equal(n, 140 * 4 * 6 * 2 * 4); assert.deepEqual(bad.slice(0, 5), []);
});

test('Atlas 4.218 keeps V2.5.3’s own hero arrangement: one table for fourteen, two 86-inch displays, two cameras, two ceiling arrays, four loudspeakers, rack, touch panel, lectern', () => {
  const L = M.v253Layout('R-ATL-4-218', 'current'); assert.equal(L.hero, true);
  const k = L.objs.reduce((m, o) => ({ ...m, [o.kind]: (m[o.kind] || 0) + 1 }), {});
  assert.deepEqual({ table: k.table, chair: k.chair, display: k.display, camera: k.camera, micceil: k.micceil, spk: k.spk, rack: k.rack, touch: k.touch, lectern: k.lectern }, { table: 1, chair: 14, display: 2, camera: 2, micceil: 2, spk: 4, rack: 1, touch: 1, lectern: 1 });
  assert.equal(L.w, 6.6); assert.equal(L.d, 9.8);
  assert.ok(L.objs.filter((o) => o.kind === 'display').every((o) => o.inches === 86));
});

test('each piece of equipment in the drawing is tied to its device on the record, so tapping it opens that device', () => {
  const L = M.v253Layout('R-ATL-4-218', 'current'); const tied = L.objs.filter((o) => o.deviceId);
  assert.ok(tied.length >= 8); assert.ok(tied.every((o) => o.deviceId.startsWith('R-ATL-4-218:')));
  const r = M.v253Room('R-ATL-4-218', { mode: 'engineer', state: 'current', layers: ['furniture', 'av'], cover: [] }, { yaw: 30, small: false });
  const hits = r.sc.items.filter((i) => i.t === 'h'); assert.ok(hits.length >= 10); assert.ok(hits.every((h) => h.o && /Opens its card/.test(h.label)));
});

test('a visitor sees the room but opens no cards (V2.5.3); every other role may', () => {
  M.setV253Role('visitor'); const v = M.v253Room('R-ATL-4-218', { mode: 'visitor', state: 'current', layers: ['furniture', 'wayfinding'], cover: [] }, { yaw: 30, small: false });
  M.setV253Role('architect'); const a = M.v253Room('R-ATL-4-218', { mode: 'employee', state: 'current', layers: ['furniture', 'wayfinding'], cover: [] }, { yaw: 30, small: false });
  assert.equal(v.sc.items.filter((i) => i.t === 'h').length, 0); assert.ok(a.sc.items.filter((i) => i.t === 'h').length > 0);
  assert.ok(v.sc.items.some((i) => i.t === 'x' && i.text === 'Way in'));
});

test('the states come from the records: an open issue marks its device in the current state; a proposal’s added positions are drawn as added', () => {
  const cur = M.v253Layout('R-ATL-4-218', 'current'); const des = M.v253Layout('R-ATL-4-218', 'designed');
  assert.ok(cur.objs.some((o) => o.flag) && !des.objs.some((o) => o.flag), 'the current state flags the device with an open issue; the design does not');
  const curN = M.v253Room('R-HZN-1-400', { mode: 'engineer', state: 'current', layers: ALL_LAYERS, cover: [] }, { yaw: 30, small: false }).L.objs.length;
  const pro = M.v253Room('R-HZN-1-400', { mode: 'engineer', state: 'proposed', layers: ALL_LAYERS, cover: [] }, { yaw: 30, small: false }).L;
  assert.ok(pro.objs.length > curN && pro.objs.some((o) => o.added && o.proposed));
});

test('the vendored module is V2.5.3’s code, regenerated byte for byte from the founder’s file (where that private file is present)', (t) => {
  const legacy = path.join(repo, 'legacy/source/v253/Empathia-Living-Campus-V2.5.3-offline.html');
  if (!fs.existsSync(legacy)) { t.skip('NOT RUN: the V2.5.3 file is engineer-private and not in this checkout'); return; }
  const out = execFileSync(process.execPath, [path.join(repo, 'scripts/legacy/vendor-v253-room.mjs'), '--check'], { encoding: 'utf8' });
  assert.match(out, /matches V2\.5\.3/);
});

test('no figure V2.5.3’s acoustic engine computed is shown without that engine: the rear-row speech-intelligibility label is left out, never 0.00', () => {
  for (const id of ['R-BCN-3-101', 'R-ATL-4-218', 'R-HZN-1-400']) for (const state of STATES) {
    const r = M.v253Room(id, { mode: 'engineer', state, layers: ALL_LAYERS, cover: ALL_COVER }, { yaw: 30, small: false });
    assert.ok(!r.sc.items.some((i) => i.t === 'x' && /STI/.test(i.text)), `${id} ${state}`);
  }
});

test('all nine of V2.5.3’s hero rooms are on this campus and drawn with their own arrangements, not a template', () => {
  const heroes = M.v253RoomIds().filter((id) => M.v253Layout(id, 'current')?.hero && !M.v253ScaledFrom(id)).sort();
  assert.deepEqual(heroes, ['R-ATL-4-218', 'R-ATL-7-112', 'R-BCN-3-101', 'R-FRG-1-104', 'R-FRG-2-220', 'R-HZN-1-400', 'R-HZN-2-215', 'R-MER-1-140', 'R-MER-2-305']);
});
