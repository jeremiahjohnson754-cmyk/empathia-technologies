#!/usr/bin/env node
// The other three worlds in Lite (13 Nov 2026): every room of University, Stadium and Convention sits on a level plan inside its floor,
// without overlapping another; every room of a type V2.5.3 had a layout for is drawn by V2.5.3's own room code from the estate's record,
// with finite geometry, and none of another type is furnished.
//   node --test tests/unit/lite-worlds.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lite-worlds-'));
fs.writeFileSync(path.join(tmp, 'entry.ts'), `export * from '${repo}/apps/demo/src/lite/worlds.ts';\nexport * from '${repo}/apps/demo/src/lite/fixtures.ts';\nexport { v253Room, v253Drawable } from '${repo}/apps/demo/src/lite/v253/v253room.ts';\n`);
await esbuild.build({ entryPoints: [path.join(tmp, 'entry.ts')], bundle: true, platform: 'node', format: 'esm', outfile: path.join(tmp, 'out.mjs'), logLevel: 'error' });
const M = await import(pathToFileURL(path.join(tmp, 'out.mjs')).href);
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
const finite = (it) => (it.p || [it.at]).every((q) => q.every((n) => Number.isFinite(n)));

for (const w of M.LITE_WORLDS) {
  test(`${w}: every room is on a level plan, inside the floor, overlapping no other`, () => {
    const ix = M.worldIndex(w); const rooms = ix.estate.nodes.filter((n) => n.kind === 'room' && n.dims); const seen = new Set();
    for (const l of ix.estate.nodes.filter((n) => n.kind === 'level')) {
      const P = M.levelPlan(w, l.id);
      for (const a of P.items) { seen.add(a.id); assert.ok(a.x >= -0.01 && a.y >= -0.01 && a.x + a.w <= P.W + 0.01 && a.y + a.d <= P.D + 0.01, `${a.id} outside ${l.id}`); }
      for (let i = 0; i < P.items.length; i++) for (let j = i + 1; j < P.items.length; j++) { const a = P.items[i], b = P.items[j]; assert.ok(a.x + a.w <= b.x + 0.01 || b.x + b.w <= a.x + 0.01 || a.y + a.d <= b.y + 0.01 || b.y + b.d <= a.y + 0.01, `${a.id} overlaps ${b.id}`); }
    }
    assert.deepEqual(rooms.filter((r) => !seen.has(r.id)).map((r) => r.id), []);
  });
  test(`${w}: each room of a type V2.5.3 drew is furnished by its code, finite from four sides; every other room by Empathia’s own rule, inside its walls`, () => {
    const ix = M.worldIndex(w); let drawn = 0;
    for (const r of ix.estate.nodes.filter((n) => n.kind === 'room' && n.dims)) {
      if (!M.archOf(r)) {
        assert.equal(M.v253Drawable(r.id), false, `${r.id} (${r.type}) should not be drawn as a V2.5.3 room`);
        // 13 Nov 2026 (founder: "furnish every environment"): every other room is furnished by Empathia's own rule, inside its walls
        const [L, W] = r.dims; const w0 = Math.max(L, W), d0 = Math.min(L, W); const F = M.fixturesFor(r.type, w0, d0, r.capacity);
        assert.ok(F && F.items.length >= 1, `${r.id} (${r.type}) has no furnishing rule`);
        assert.ok(F.items.every((f) => f.x - f.w / 2 >= -0.01 && f.x + f.w / 2 <= w0 + 0.01 && f.y - f.d / 2 >= -0.01 && f.y + f.d / 2 <= d0 + 0.01 && [f.x, f.y, f.w, f.d, f.h].every(Number.isFinite)), `${r.id}: a fixture outside the walls`);
        continue;
      }
      assert.ok(M.v253Drawable(r.id), `${r.id} (${r.type}) is not drawable`);
      for (const yaw of [30, 210]) { const s = M.v253Room(r.id, { mode: 'engineer', state: 'current', layers: ['furniture', 'av'], cover: ['fov', 'mic'] }, { yaw, small: false }); assert.ok(s && s.sc.items.length && s.sc.items.every(finite), `${r.id} ${yaw}`); }
      drawn += 1;
    }
    assert.ok(drawn > 20, `${drawn} furnished`);
  });
}
