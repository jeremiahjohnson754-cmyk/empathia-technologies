// Typed launch intents (#232; founder directive 18 Nov 2026 17:25 §6, "Open This Exact Demonstration"): every link from the corporate
// website into the demonstration is a catalogue entry (packages/ui/src/launches.ts), and every entry is checked here against the
// demonstration's OWN registry and policy:
//   - its address is a registered page, and its perspective is a role that may open that page (no launch lands on an access page);
//   - the perspective's label is the role's name in the demonstration;
//   - the room, position and asset it names exist in the synthetic estate (the followed microphone is a ceiling microphone there);
//   - a Lite room launch asks for a lens the perspective may use;
//   - each product page's launch is that product's own demo address on the website (one source, no drift);
//   - the link round-trips; an unknown id, a full address or a protocol-relative way back is refused (no open redirect).
//   node --test tests/unit/launch-intents.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'launch-')); const entry = path.join(tmp, 'e.ts'); const out = path.join(tmp, 'm.mjs');
const at = (p) => JSON.stringify(path.join(repo, p));
fs.writeFileSync(entry, [
  `export * as L from ${at('packages/ui/src/launches.ts')};`,
  `export { resolve } from ${at('apps/demo/src/registry.pages.ts')};`,
  `export { canOpen, ROLE_KEYS, ROLES } from ${at('apps/demo/src/access/policy.ts')};`,
  `export { roomRecord } from ${at('apps/demo/src/campus/design.ts')};`,
  `export { lensFor } from ${at('apps/demo/src/lite/model.ts')};`,
  `export { PRODUCTS as SITE_PRODUCTS } from ${at('apps/website/src/products.ts')};`,
].join('\n'));
await esbuild.build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', jsx: 'automatic', nodePaths: [path.join(repo, 'node_modules')], loader: { '.css': 'empty', '.svg': 'text', '.png': 'empty', '.webp': 'empty', '.mp3': 'empty' } });
const M = await import(pathToFileURL(out).href); const { L } = M;

test('every launch opens a registered page for its own perspective, named as the demonstration names it', () => {
  const ids = L.LAUNCHES.map((l) => l.id); assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  for (const l of L.LAUNCHES) {
    assert.ok(M.ROLE_KEYS.includes(l.perspective), `${l.id}: ${l.perspective} is a role`);
    assert.equal(l.perspectiveLabel, M.ROLES[l.perspective].label, `${l.id}: label`);
    const r = M.resolve('#' + l.route); assert.ok(r, `${l.id}: ${l.route} is a registered page`);
    assert.ok(M.canOpen(l.perspective, r), `${l.id}: ${l.perspective} may open ${l.route}`);
    assert.ok(l.title.length > 4 && l.shows.length > 20, `${l.id}: says what it opens`);
  }
});
test('the followed microphone exists: room R-ATL-4-218, position A-0104, asset AS-0103, a ceiling microphone', () => {
  const r = M.roomRecord(L.FOLLOW_ROOM); assert.ok(r);
  const p = r.positions.find((x) => x.code === L.FOLLOW_POSITION); assert.ok(p, 'position');
  assert.equal(p.asset, L.FOLLOW_ASSET); assert.equal(p.cat, 'micceil');
  for (const l of L.FOLLOW) assert.ok(l.route.includes(L.FOLLOW_ROOM), `${l.id} is about the followed room`);
  const lite = L.FOLLOW.find((l) => l.route.startsWith('/lite/room/')); const q = new URLSearchParams(lite.route.split('?')[1]);
  assert.equal(q.get('device'), L.FOLLOW_POSITION);
  assert.equal(M.lensFor(lite.perspective, q.get('mode')), q.get('mode'), 'the Lite lens it asks for is one the perspective may use');
});
test('each product page opens the demonstration its website page already names (one source)', () => {
  const site = Object.fromEntries(M.SITE_PRODUCTS.filter((p) => p.demo).map((p) => [p.id, p.demo.href]));
  assert.deepEqual(Object.keys(L.PRODUCT_LAUNCHES).sort(), Object.keys(site).sort());
  for (const [id, l] of Object.entries(L.PRODUCT_LAUNCHES)) assert.equal('#' + l.route, site[id], id);
});
test('the link round-trips; unknown ids and unsafe ways back are refused', () => {
  const l = L.FOLLOW[0]; const href = L.launchHref('https://demo.example/', l, '/platform#follow');
  assert.ok(href.startsWith('https://demo.example/#/lite/room/R-ATL-4-218?mode=engineer&device=A-0104&from=site&li=follow-lite&back='), href);
  const q = new URLSearchParams(href.split('#')[1].split('?')[1]); const got = L.readLaunch(q);
  assert.equal(got.launch.id, 'follow-lite'); assert.equal(got.back, '/platform#follow');
  const p = L.PRODUCT_LAUNCHES.servicehands; assert.ok(L.launchHref('https://d.x', p, '/products/servicehands').includes('#/servicehands?from=site&li=product-servicehands'));
  assert.equal(L.readLaunch(new URLSearchParams('from=site&li=nope&back=/')), null, 'unknown id');
  assert.equal(L.readLaunch(new URLSearchParams('li=follow-lite&back=/')), null, 'not from the site');
  for (const bad of ['https://evil.example/', '//evil.example', '/x/../../y', 'javascript:alert(1)', '/a b', '/products?x=1']) {
    assert.equal(L.readLaunch(new URLSearchParams({ from: 'site', li: 'follow-lite', back: bad })).back, '/', bad);
    assert.throws(() => L.launchHref('https://d.x', l, bad), bad);
  }
});
