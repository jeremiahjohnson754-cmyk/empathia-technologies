#!/usr/bin/env node
// Empathia's own rooms in Lite (13 Nov 2026, founder on a stadium suite drawn as V2.5.3's boardroom: "This looks terrible … don't have my
// rooms or experiences looking like this"). Every stadium suite is drawn from the suite program: its pieces stand inside the room (the
// balcony seats on the balcony), no two floor-standing pieces overlap, a wheelchair user can get from the door to the lowered rail and to the
// balcony door on a path at least 0.9 m wide, and the drawing is finite from above at every side and from each occupant's eyes.
//   node --test tests/unit/lite-rooms.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lite-rooms-'));
fs.writeFileSync(path.join(tmp, 'entry.ts'), `export * from '${repo}/apps/demo/src/lite/rooms/programs.ts';\nexport { roomScene } from '${repo}/apps/demo/src/lite/rooms/build.ts';\nexport { worldIndex } from '${repo}/apps/demo/src/lite/worlds.ts';\nexport { programFromFixtures } from '${repo}/apps/demo/src/lite/rooms/fromFixtures.ts';\nexport { fixturesFor } from '${repo}/apps/demo/src/lite/fixtures.ts';\n`);
await esbuild.build({ entryPoints: [path.join(tmp, 'entry.ts')], bundle: true, platform: 'node', format: 'esm', outfile: path.join(tmp, 'out.mjs'), logLevel: 'error', jsx: 'automatic' });
const M = await import(pathToFileURL(path.join(tmp, 'out.mjs')).href);
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));

const ix = M.worldIndex('stadium'); const suites = ix.estate.nodes.filter((n) => n.kind === 'room' && n.type === 'suite');
const progOf = (n) => M.programFor({ id: n.id, type: n.type, name: n.name, dims: n.dims, capacity: n.capacity, assets: (ix.assetsOf.get(n.id) || []) });
/** footprints of what stands on the floor: [x0, y0, x1, y1] */
function feet(P) {
  const out = []; const rect = (x, y, w, d, rot = 0, id) => { const t = Math.abs(rot) % 180 === 90; const W = t ? d : w, D = t ? w : d; out.push({ id, r: [x - W / 2, y - D / 2, x + W / 2, y + D / 2] }); };
  for (const p of P.pieces) {
    if (['rail', 'bar', 'sofa', 'lowtable', 'armchair', 'plant'].includes(p.kind)) rect(p.x, p.y, p.w, p.d, p.rot, p.id);
    if (p.kind === 'hightable') { rect(p.x, p.y, p.w, p.d, 0, p.id); (p.at || []).forEach(([x, y], i) => rect(x, y, 0.4, 0.4, 0, `${p.id}-stool-${i}`)); }
    if (p.kind === 'stools') (p.at || []).forEach(([x, y], i) => rect(x, y, 0.4, 0.4, 0, `${p.id}-${i}`));
  }
  return out;
}

test(`all ${suites.length} stadium suites are drawn from the suite program, every piece inside the room or on its balcony`, () => {
  assert.ok(suites.length >= 100, String(suites.length));
  for (const n of suites) { const P = progOf(n); assert.ok(P && P.key === 'suite', n.id);
    for (const p of P.pieces) assert.ok(p.x >= 0 && p.x <= P.w && (p.y >= 0 ? p.y <= P.d : p.kind === 'seats' && p.y > -2.0), `${n.id} ${p.id} at ${p.x},${p.y}`);
    assert.equal(P.pieces.filter((p) => p.kind === 'seats').length * 6, 12, 'twelve balcony seats, as the record says'); }
});
test('no two floor-standing pieces of a suite overlap', () => {
  const P = progOf(suites[0]); const F = feet(P);
  for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) { const a = F[i].r, b = F[j].r;
    assert.ok(a[2] <= b[0] + 0.001 || b[2] <= a[0] + 0.001 || a[3] <= b[1] + 0.001 || b[3] <= a[1] + 0.001, `${F[i].id} overlaps ${F[j].id}`); }
});
test('a wheelchair user can get from the door to the lowered rail and to the balcony door on a path at least 0.9 m wide', () => {
  const P = progOf(suites[0]); const g = 0.05, R = 0.45; const nx = Math.round(P.w / g), ny = Math.round(P.d / g);
  const free = (x, y) => x >= R && x <= P.w - R && y >= R - 0.4 && y <= P.d - R && feet(P).every(({ r }) => x < r[0] - R || x > r[2] + R || y < r[1] - R || y > r[3] + R);
  const ok = Array.from({ length: nx + 1 }, (_, i) => Array.from({ length: ny + 1 }, (_, j) => free(i * g, j * g)));
  const door = P.walls.S.door, slide = P.walls.N.slide; const low = P.pieces.find((p) => p.id === 'rail-low');
  const cell = (x, y) => [Math.round(x / g), Math.round(y / g)]; const [sx, sy] = cell(door.at, P.d - R);
  const seen = new Set([`${sx},${sy}`]); const q = [[sx, sy]]; assert.ok(ok[sx][sy], 'the doorway is clear');
  while (q.length) { const [i, j] = q.shift(); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; const k = `${a},${b}`; if (a < 0 || b < 0 || a > nx || b > ny || seen.has(k) || !ok[a][b]) continue; seen.add(k); q.push([a, b]); } }
  const reach = (x, y) => { const [i, j] = cell(x, y); for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) if (seen.has(`${i + di},${j + dj}`)) return true; return false; };
  assert.ok(reach(low.x, low.y + low.d / 2 + R + 0.05), 'the lowered rail is reachable');
  assert.ok(reach(slide.at, R), 'the balcony door is reachable');
});
test('the suite is drawn with finite geometry from above at every side and from each occupant’s eyes', () => {
  const P = progOf(suites[0]); const finite = (it) => (it.p || [it.at]).every((q) => q.every((v) => Number.isFinite(v)));
  for (const yaw of [24, 114, 204, 294]) { const sc = M.roomScene(P, { cam: { yaw, pitch: 36, zoom: 1 }, eye: null }, { sel: null, names: true }); assert.ok(sc.items.length > 300 && sc.items.every(finite), `yaw ${yaw}`); }
  for (const e of P.eyes) { const sc = M.roomScene(P, { cam: { yaw: e.yaw, pitch: e.pitch, zoom: 1 }, eye: e }, { sel: null, names: false });
    assert.ok(sc.items.length > 500 && sc.items.every(finite), e.key);
    const inRoom = e.x > 0 && e.x < P.w && e.y > 0 && e.y < P.d, onBalcony = e.y < 0 && e.y > -2.0; assert.ok(inRoom || onBalcony, `${e.key} is in the room or on its balcony`); }
});
// 13 Nov 2026: the seven types that were "being redesigned" now have programs of their own
for (const [world, type] of [['convention', 'green-room'], ['convention', 'speaker-prep'], ['convention', 'vip-lounge'], ['stadium', 'press-box'], ['stadium', 'commentary-booth'], ['stadium', 'mix-position'], ['stadium', 'club']]) {
  test(`every ${type} (${world}) is drawn from its program: pieces inside the room, finite from above and from each occupant's eyes`, () => {
    const wx = M.worldIndex(world); const rooms = wx.estate.nodes.filter((n) => n.kind === 'room' && n.type === type); assert.ok(rooms.length >= 1, type);
    const finite = (it) => (it.p || [it.at]).every((q) => q.every((v) => Number.isFinite(v)));
    for (const n of rooms) { const P = M.programFor({ id: n.id, type: n.type, name: n.name, dims: n.dims, capacity: n.capacity, assets: wx.assetsOf.get(n.id) || [] });
      assert.ok(P && P.key === type && P.pieces.length >= 3, n.id);
      for (const q of P.pieces) assert.ok(q.x >= 0 && q.x <= P.w + 0.01 && (q.y >= 0 ? q.y <= P.d + 0.01 : q.kind === 'seats' && q.y > -2.0), `${n.id} ${q.id} at ${q.x},${q.y}`);
      assert.ok(P.eyes.length >= 3, `${n.id} eyes`);
      for (const e of P.eyes) { assert.ok(e.x >= 0 && e.x <= P.w && e.y >= -2 && e.y <= P.d && e.z > 0.9 && e.z < 2.2, `${n.id} ${e.key}`); }
      if (n !== rooms[0]) continue;
      for (const yaw of [24, 204]) { const sc = M.roomScene(P, { cam: { yaw, pitch: 40, zoom: 1 }, eye: null }, { sel: null, names: true }); assert.ok(sc.items.length > 60 && sc.items.every(finite), `${n.id} yaw ${yaw}`); }
      for (const e of P.eyes) { const sc = M.roomScene(P, { cam: { yaw: e.yaw, pitch: e.pitch, zoom: 1 }, eye: e }, { sel: null, names: false }); assert.ok(sc.items.length > 60 && sc.items.every(finite), `${n.id} ${e.key}`); } }
  });
}
test('no room type is left "being redesigned"', () => { assert.equal(M.REDESIGN_TYPES.size, 0); });

// 13 Nov 2026: the rooms furnished by Empathia's fixture rules are drawn by the same renderer
test('every fixture room of the three worlds is drawn by the room renderer: each fixture a piece in its place, finite from two sides and from each eye', () => {
  const finite = (it) => (it.p || [it.at]).every((q) => q.every((v) => Number.isFinite(v))); const done = new Set(); let n = 0;
  for (const world of ['university', 'stadium', 'convention']) { const wx = M.worldIndex(world);
    for (const r of wx.estate.nodes.filter((x) => x.kind === 'room' && x.dims)) { const [L, W] = r.dims; const F = M.fixturesFor(r.type, Math.max(L, W), Math.min(L, W), r.capacity); if (!F || M.hasProgram(r.type)) continue;
      const P = M.programFromFixtures(r.name, r.type, r.dims, F); n++;
      assert.equal(P.pieces.length, F.items.length, r.id); assert.ok(P.pieces.every((p, i) => p.x === F.items[i].x && p.y === F.items[i].y), `${r.id} moved`);
      if (done.has(F.rule)) continue; done.add(F.rule);
      for (const yaw of [208, 28]) assert.ok(M.roomScene(P, { cam: { yaw, pitch: 40, zoom: 1 }, eye: null }, { sel: null, names: true }).items.every(finite), `${r.id} ${yaw}`);
      for (const e of P.eyes) { assert.ok(e.x > 0 && e.x < P.w && e.y > 0 && e.y < P.d, `${r.id} ${e.key} inside`); assert.ok(M.roomScene(P, { cam: { yaw: e.yaw, pitch: e.pitch, zoom: 1 }, eye: e }, { sel: null, names: false }).items.every(finite), `${r.id} ${e.key}`); } } }
  assert.ok(n > 50 && done.size >= 8, `${n} rooms, ${done.size} rules`);
});
