#!/usr/bin/env node
// V2.5.3's rooms in Empathia's look (13 Nov 2026, founder: "make V2.5.3 the foundation that the new Empathia finally surpasses"). For every
// one of the 140 campus rooms, V2.5.3's own layout becomes a program for Empathia's renderer with every object kept — the same ids, the
// same positions — and the room is drawn with finite geometry from two sides and from a seat at eye level.
//   node --test tests/unit/lite-v253-look.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lite-v253-look-'));
fs.writeFileSync(path.join(tmp, 'entry.ts'), `export { programFromV253 } from '${repo}/apps/demo/src/lite/rooms/fromV253.ts';\nexport { roomScene } from '${repo}/apps/demo/src/lite/rooms/build.ts';\nexport { v253Layout, v253RoomIds } from '${repo}/apps/demo/src/lite/v253/v253room.ts';\nexport { eyeSpot } from '${repo}/apps/demo/src/lite/V253Room.tsx';\n`);
await esbuild.build({ entryPoints: [path.join(tmp, 'entry.ts')], bundle: true, platform: 'node', format: 'esm', outfile: path.join(tmp, 'out.mjs'), logLevel: 'error', jsx: 'automatic' });
const M = await import(pathToFileURL(path.join(tmp, 'out.mjs')).href);
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
const finite = (it) => (it.p || [it.at]).every((q) => q.every((v) => Number.isFinite(v)));

test('every campus room’s V2.5.3 layout becomes an Empathia program with every object kept, and draws finite', () => {
  const ids = M.v253RoomIds(); assert.equal(ids.length, 140);
  for (const id of ids) { const L = M.v253Layout(id); assert.ok(L, id); const P = M.programFromV253(L, { devices: true });
    assert.deepEqual(P.pieces.map((p) => p.id).sort(), L.objs.map((o) => o.id).sort(), `${id}: objects kept`);
    for (const o of L.objs) { const p = P.pieces.find((q) => q.id === o.id); assert.ok(Math.abs(p.x - o.x) < 1e-9 && Math.abs(p.y - o.y) < 1e-9, `${id} ${o.id} moved`); }
    for (const yaw of [30, 210]) { const sc = M.roomScene(P, { cam: { yaw, pitch: 36, zoom: 1 }, eye: null }, { sel: null, names: false }); assert.ok(sc.items.length > 40 && sc.items.every(finite), `${id} yaw ${yaw}`); }
    const e = M.eyeSpot(L, 'seat'); const sc = M.roomScene(P, { cam: { yaw: e.yaw, pitch: 36, zoom: 1 }, eye: e }, { sel: null, names: false }); assert.ok(sc.items.every(finite), `${id} seat`); }
});
test('a room’s walls follow V2.5.3’s glazing and door', () => {
  const L = M.v253Layout('R-ATL-4-218'); const P = M.programFromV253(L, { devices: false });
  for (const s of L.glass) assert.ok(P.walls[s].glass, `${s} glazed`); assert.ok(P.walls[L.door.wall].door || P.walls[L.door.wall].slide, 'door kept');
});
