// Lifecycle refresh planning (apps/demo/src/refresh/plan.ts; founder, 14 Nov 2026): every unit in service appears once with its refresh
// year (installed + the class's declared service life); units taken out never count; the annual plan and the multi-year strategy agree
// with the units; a room is suggested for one window only when most of its units fall due together; cost exists only when declared.
//   RP-01  every current, non-furniture unit appears exactly once; taken-out units and furniture never do; refresh year = installed + life
//   RP-02  the multi-year strategy sums to the units due in its window; the annual plan for a year lists exactly that year's units
//   RP-03  changing a class's service life moves only that class's units
//   RP-04  cost: none without a declared figure for every class involved; with figures it is the sum of the declared figures
//   RP-05  the service signal names repeated break-fix jobs and never changes a refresh year; the CSV carries the basis
//   node --test tests/unit/refresh-plan.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-')), 'm.mjs');
await esbuild.build({ stdin: { contents: "export * as R from './refresh/plan.ts'; export * as H from './service/history.ts'; export { allRecords } from './campus/design.ts';", resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', define: { 'process.env.DEMO_BUILD_ID': '"test"' } });
const { R, H, allRecords } = await import(pathToFileURL(out).href);
const jobs = H.syntheticHistory(); const A = R.defaultAssumptions(); const units = R.unitsInService(A, jobs);

test('RP-01 every unit in service appears once, with its refresh year; taken-out units and furniture never', () => {
  const current = allRecords().flatMap((r) => r.installations.filter((i) => !i.removedAt).map((i) => ({ i, p: r.positions.find((p) => p.code === i.position) }))).filter((x) => !x.p?.furniture && !R.FURNITURE.has(x.p?.cat));
  assert.ok(units.length > 50, `${units.length} units`);
  assert.equal(units.length, current.length); assert.equal(new Set(units.map((u) => u.asset)).size, units.length, 'one row per asset ID');
  const out = new Set(R.takenOut().map((x) => x.asset)); assert.ok(out.size > 0, 'the estate has taken-out units');
  assert.ok(units.every((u) => !out.has(u.asset) || current.some((c) => c.i.asset === u.asset)), 'a unit taken out is not in the plan');
  for (const u of units.slice(0, 40)) assert.equal(u.dueYear, new Date(Date.parse(u.installedAt) + u.life * 365.25 * 864e5).getUTCFullYear(), u.asset);
  assert.ok(units.every((u) => u.life === (A.life[u.cat] ?? 7)));
  assert.match(R.LIFE_BASIS, /not a manufacturer end-of-life/);
});

test('RP-02 the strategy sums to the units due in its window; the annual plan lists exactly that year’s units', () => {
  for (const h of [1, 3, 5, 7]) {
    const rows = R.strategy(units, h, A); const last = R.NOW_YEAR + h;
    assert.equal(rows.reduce((s, r) => s + r.units, 0), units.filter((u) => u.dueYear <= last).length, `horizon ${h}`);
    for (const r of rows) { assert.equal(Object.values(r.byClass).reduce((s, n) => s + n, 0), r.units); assert.equal(Object.values(r.byBuilding).reduce((s, n) => s + n, 0), r.units); }
  }
  assert.ok(R.strategy(units, 7, A).some((r) => r.units > 0), 'something falls due within seven years');
  for (const y of [R.NOW_YEAR + 1, R.NOW_YEAR + 3, R.NOW_YEAR + 5]) {
    const plan = R.annualPlan(units, y); const n = plan.reduce((s, r) => s + r.due.length, 0);
    assert.equal(n, R.strategy(units, y - R.NOW_YEAR, A).at(-1).units, String(y));
    for (const r of plan) {
      assert.ok(r.due.every((u) => u.room === r.room)); assert.equal(r.total, units.filter((u) => u.room === r.room).length);
      const near = units.filter((u) => u.room === r.room && Math.abs(u.dueYear - y) <= 1).length;
      assert.equal(r.bundle.suggest, r.total > 1 && near / r.total >= 0.5 && near > r.due.length, `${r.room} ${y}`);
    }
  }
});

test('RP-03 changing one class’s service life moves only that class', () => {
  const cat = units.find((u) => u.cat === 'compute')?.cat || units[0].cat;
  const B = { ...A, life: { ...A.life, [cat]: A.life[cat] + 2 } }; const v = R.unitsInService(B, jobs);
  const by = new Map(v.map((u) => [u.asset, u]));
  for (const u of units) { const w = by.get(u.asset); if (u.cat === cat) assert.equal(w.dueYear - u.dueYear >= 1, true, u.asset); else assert.equal(w.dueYear, u.dueYear, u.asset); }
});

test('RP-04 cost exists only when declared for every class involved, and is the sum of the declared figures', () => {
  const rows = R.strategy(units, 5, A); assert.ok(rows.every((r) => r.cost === null || r.units === 0), 'no figure declared: no cost');
  const cats = [...new Set(units.map((u) => u.cat))]; const some = { ...A, cost: { [cats[0]]: 1000 } };
  const mixed = R.strategy(units, 5, some).filter((r) => r.units && Object.keys(r.byClass).some((c) => c !== cats[0]));
  assert.ok(mixed.every((r) => r.cost === null), 'a class without a figure: no partial total presented as the cost');
  const full = { ...A, cost: Object.fromEntries(cats.map((c, k) => [c, 100 * (k + 1)])) };
  for (const r of R.strategy(units, 5, full)) assert.equal(r.cost, Object.entries(r.byClass).reduce((s, [c, n]) => s + n * full.cost[c], 0));
});

test('RP-05 the service signal names repeated break-fix jobs and never moves a refresh year; the CSV carries the basis', () => {
  const low = { ...A, serviceSignal: 1 }; const v = R.unitsInService(low, jobs);
  const flagged = v.filter((u) => u.signal); assert.ok(flagged.length > 0, 'some unit had a break-fix job in the last year');
  assert.ok(flagged.every((u) => u.breakFix12 >= 1 && new RegExp(`${u.breakFix12} break-fix`).test(u.signal)));
  const by = new Map(units.map((u) => [u.asset, u.dueYear])); assert.ok(v.every((u) => by.get(u.asset) === u.dueYear), 'a signal is an argument, never a move');
  const csv = R.planCsv(units, A).split('\n'); assert.match(csv[0], /planning assumption/); assert.equal(csv.length, units.length + 2);
  assert.match(csv[1], /^asset,position,device,class/);
});
