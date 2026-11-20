// The failure map's six measures (founder, 18 Nov 2026 15:38: count, per room, per device, per room-month or another exposure period,
// severity-weighted burden, repeated versus unique; unknown never drawn as healthy), checked from the records and the synthetic service
// history they are computed from (apps/demo/src/campus/heat.ts):
//   - every campus room and device position is counted once, in its own building; exposure is twelve room-months per room;
//   - the twelve-month window holds only break-fix jobs opened from 1 Nov 2025 to 1 Nov 2026;
//   - a repeat is a job whose room and layer had an earlier job in the window, or that reopened; repeats + unique = jobs;
//   - the burden is the stated weighting (Mission critical 5, High 3, Standard 1) summed, recomputed here independently.
//   node --test tests/unit/heat-metrics.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'heat-')); const entry = path.join(tmp, 'e.ts'); const out = path.join(tmp, 'm.mjs');
const at = (p) => JSON.stringify(path.join(repo, 'apps/demo/src', p));
fs.writeFileSync(entry, `export * as H from ${at('campus/heat.ts')}; export { allRecords } from ${at('campus/design.ts')}; export { syntheticHistory } from ${at('service/history.ts')}; export { BUILDINGS } from ${at('campus/canon.ts')};`);
await esbuild.build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], loader: { '.css': 'empty', '.svg': 'text', '.png': 'empty', '.webp': 'empty' } });
const { H, allRecords, syntheticHistory, BUILDINGS } = await import(pathToFileURL(out).href);
const ex = H.exposureByBuilding(); const recs = allRecords(); const hist = syntheticHistory();

test('every room and device position is counted once, in its building; twelve room-months per room', () => {
  assert.equal(Object.values(ex).reduce((s, e) => s + e.rooms, 0), recs.length);
  for (const b of BUILDINGS) { const rs = recs.filter((r) => r.outline.building === b.key); const e = ex[b.key];
    assert.equal(e.rooms, rs.length, b.key); assert.equal(e.roomMonths, 12 * rs.length, b.key);
    assert.equal(e.devices, rs.reduce((s, r) => s + r.positions.filter((p) => !p.furniture).length, 0), b.key); }
});
test('the window is twelve months of break-fix jobs, 1 Nov 2025 to 1 Nov 2026, and every one lands in a building', () => {
  const w = H.windowJobs(hist);
  assert.ok(w.length > 50, `${w.length} jobs`);
  assert.ok(w.every((j) => j.kind === 'break-fix' && j.openedAt >= '2025-11-01' && j.openedAt < '2026-11-01T15'));
  assert.equal(Object.values(ex).reduce((s, e) => s + e.jobs, 0), w.length);
  const outside = hist.filter((j) => j.kind === 'break-fix' && (j.openedAt < '2025-11-01' || j.openedAt >= '2026-11-01T15'));
  assert.ok(outside.length > 0, 'the history is longer than the window, so the window really cuts it');
});
test('repeat or unique: the same room and layer seen earlier in the window, or reopened; the two add up to the jobs', () => {
  const w = H.windowJobs(hist); const seen = new Set();
  for (const j of w) { const k = `${j.roomId}|${j.layer}`; assert.equal(j.repeat, seen.has(k) || j.reopened, j.id); seen.add(k); }
  for (const [k, e] of Object.entries(ex)) assert.equal(e.repeats + e.unique, e.jobs, k);
  assert.ok(Object.values(ex).some((e) => e.repeats > 0) && Object.values(ex).some((e) => e.unique > 0));
});
test('the burden is the stated weighting summed (Mission critical 5, High 3, Standard 1), recomputed independently', () => {
  assert.deepEqual(H.BURDEN_WEIGHT, { 'Mission critical': 5, High: 3, Standard: 1 });
  const W = { 'Mission critical': 5, High: 3, Standard: 1 };
  for (const b of BUILDINGS) assert.equal(ex[b.key].burden, H.windowJobs(hist).filter((j) => j.building === b.key).reduce((s, j) => s + W[j.severity], 0), b.key);
});
