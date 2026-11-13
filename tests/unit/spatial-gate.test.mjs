#!/usr/bin/env node
// The spatial completeness gate (13 Nov 2026): every room of the four worlds is drawn, with a floor, walls, light and furniture, pieces
// that can be selected, at least three eye positions, its world's materials and, where V2.5.3 had a layout, every V2.5.3 object in place.
//   node --test tests/unit/spatial-gate.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import { spawnSync } from 'node:child_process'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
test('every room of the four worlds passes the spatial completeness gate (counts, not looks)', () => {
  const r = spawnSync(process.execPath, [path.join(repo, 'scripts/spatial-gate.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr.slice(0, 400)); assert.match(r.stdout, /Room coverage \| rooms drawn of rooms on record \| 140 \/ 140/);
});
