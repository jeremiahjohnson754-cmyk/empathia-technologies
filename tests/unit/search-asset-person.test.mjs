// Search Party by asset ID and by person (founder, 14 Nov 2026: the asset ID connects everything end to end; track everyone that touched
// the project for dispatch and Search Party).
//   SA-01  every asset ID on record is a searchable unit, in service or retired; a retired unit says it is never reissued
//   SA-02  the unit is tracked from its position; a replacement is a recorded succession between the two units
//   SA-03  a person is searchable, and their rooms and units are their neighbours (involved in); experience is said not to be a credential
//   node --test tests/unit/search-asset-person.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'search-asset-')), 'm.mjs');
// the estate merges this browser's Build a Room draft: there is no browser here, so localStorage is absent and the draft is none
await esbuild.build({ stdin: { contents: "export { buildEstate } from './search/estate.ts'; export { search, neighbourhood, nodeKey } from '@empathia/search-party'; export { allAssetCodes, findAsset } from './campus/assetLife.ts';", resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', define: { 'process.env.DEMO_BUILD_ID': '"test"' } });
const M = await import(pathToFileURL(out).href);
const est = M.buildEstate();

test('SA-01 every asset ID on record is a searchable unit; a retired one says it is never reissued', () => {
  const codes = M.allAssetCodes(); const units = est.nodes.filter((n) => n.type === 'Asset');
  assert.equal(units.length, codes.length, 'one unit per asset ID, current or retired');
  const r = M.search(est, { q: 'AS-0112', type: null, limit: 5 }); assert.equal(r.items[0]?.id, 'AS-0112'); assert.equal(r.items[0].href, '#/v25/asset?a=AS-0112');
  const retired = codes.find((c) => !M.findAsset(c).current); const n = est.nodes.find((x) => x.type === 'Asset' && x.id === retired);
  assert.match(n.subtitle, /^RETIRED .* never reissued/);
});

test('SA-02 the unit is tracked from its position; a replacement is a succession between the two units', () => {
  const tracked = est.edges.filter((e) => e.rel === 'TRACKED_AS' && e.to.id === 'AS-0112'); assert.equal(tracked.length, 1); assert.equal(tracked[0].from.type, 'PlannedAsset');
  const prev = M.findAsset('AS-0112').replaced; assert.ok(prev, 'AS-0112 replaced a unit');
  assert.ok(est.edges.some((e) => e.rel === 'SUCCEEDS' && e.from.id === 'AS-0112' && e.to.id === prev));
});

test('SA-03 a person is searchable; their rooms and units are their neighbours; experience is not a credential', () => {
  const r = M.search(est, { q: 'Ana Reyes', type: null, limit: 5 }); const ana = r.items.find((x) => x.type === 'Person' && x.id === 'tech-ana');
  assert.ok(ana, JSON.stringify(r.items.map((x) => [x.type, x.id]))); assert.match(ana.subtitle, /not a credential/); assert.equal(ana.href, '#/v25/people?p=tech-ana');
  const rooms = est.edges.filter((e) => e.rel === 'INVOLVES' && e.to.id === 'tech-ana' && e.from.type === 'Room');
  assert.ok(rooms.length >= 3, `${rooms.length} rooms`);
});
