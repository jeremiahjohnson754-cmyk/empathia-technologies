// The demonstration's offline worker and its build step (founder, 10 Nov: field products work offline). The worker template is run
// here in a sandbox with an in-memory cache store and a scripted network, so every branch is exercised without a browser: the atomic
// install, what is kept across builds, network-first with the four-second fallback, cache-first chunks, saved-then-fresh data, ranged
// answers from a saved file, and everything the worker must leave alone.   node --test tests/unit/demo-offline.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TEMPLATE = fs.readFileSync(path.join(repo, 'apps/demo/src/offline/sw.template.js'), 'utf8');
const SCOPE = 'https://demo.test/app/';
const FILES = ['index.html', 'demo.js', 'demo.css', 'ws/dispatch.js', 'chunks/Lite-AAAA1111.js', 'chunks/Room-BBBB2222.js', 'signal/index.json'];

/** An in-memory CacheStorage that behaves like the browser's for what the worker uses: creation order, clones, exact-URL keys. */
function cacheStore() {
  const stores = new Map();
  const cache = (m) => ({
    async match(k) { const r = m.get(String(k.url || k)); return r ? r.clone() : undefined; },
    async put(k, res) { m.set(String(k.url || k), res.clone()); },
    async delete(k) { return m.delete(String(k.url || k)); },
    _m: m,
  });
  return {
    async open(n) { if (!stores.has(n)) stores.set(n, new Map()); return cache(stores.get(n)); },
    async keys() { return [...stores.keys()]; },
    async delete(n) { return stores.delete(n); },
    async match(k) { for (const m of stores.values()) { const r = m.get(String(k.url || k)); if (r) return r.clone(); } return undefined; },
    _stores: stores,
  };
}
/** Boot one worker build. `net` maps a URL to a status, a body, a thrown failure ('down') or a promise that never settles ('hang'). */
function boot({ version = 'v1', files = FILES, caches = cacheStore(), net = {} } = {}) {
  const handlers = {}; const calls = []; const timers = []; let skipped = false; let claimed = false;
  const fetchFn = async (req) => {
    const url = String(req.url || req); calls.push(url);
    const rule = url in net ? net[url] : net['*'];
    if (rule === 'down') throw new TypeError('Failed to fetch');
    if (rule === 'hang') return new Promise(() => {});
    if (typeof rule === 'number') return new Response(`status ${rule}`, { status: rule });
    const body = rule === undefined ? `net:${url.slice(SCOPE.length)}` : rule;
    return new Response(body, { status: 200, headers: { 'Content-Type': url.endsWith('.mp3') ? 'audio/mpeg' : 'text/plain' } });
  };
  const self = { registration: { scope: SCOPE }, addEventListener: (t, f) => { handlers[t] = f; }, skipWaiting: async () => { skipped = true; }, clients: { claim: async () => { claimed = true; } } };
  const ctx = vm.createContext({ self, caches, fetch: fetchFn, Response, Request, URL, Promise, Error, TypeError, JSON, Math, Number, String, Set,
    setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length; }, clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].f = null; } });
  vm.runInContext(TEMPLATE.replace("'__VERSION__'", JSON.stringify(version)).replace('__PRECACHE__', JSON.stringify(files)), ctx);
  const life = async (type) => { let p; handlers[type]({ waitUntil: (x) => { p = x; } }); await p; };
  /** dispatch a fetch event; resolves to the Response, or null when the worker did not answer (the browser handles it itself) */
  const get = async (p, { method = 'GET', mode, range, url } = {}) => {
    const req = { url: url || SCOPE + p, method, mode: mode || 'cors', headers: new Headers(range ? { range } : {}) };
    let answer = null; const waits = [];
    handlers.fetch({ request: req, respondWith: (r) => { answer = r; }, waitUntil: (w) => waits.push(w) });
    const res = answer ? await answer : null; await Promise.all(waits);
    return res;
  };
  const fire = (ms) => { for (const t of timers) if (t.f && t.ms === ms) { const f = t.f; t.f = null; f(); } };
  return { caches, calls, net, life, get, fire, timers, handlers, get skipped() { return skipped; }, get claimed() { return claimed; } };
}
const text = async (r) => (r ? r.text() : null);

test('OFU-01 install saves every shell file, the page under the site root too, then takes over', async () => {
  const w = boot(); await w.life('install');
  const shell = w.caches._stores.get('ed-shell-v1'); assert.ok(shell);
  for (const f of FILES) assert.ok(shell.has(SCOPE + f), f);
  assert.ok(shell.has(SCOPE), 'the page answers the site root'); assert.equal(shell.size, FILES.length + 1); assert.equal(w.skipped, true);
});
test('OFU-02 install is all or nothing: one missing file fails it and the half-filled shell is removed', async () => {
  const w = boot({ net: { [SCOPE + 'demo.css']: 404 } });
  await assert.rejects(w.life('install'), /demo\.css: 404/);
  assert.equal(w.caches._stores.has('ed-shell-v1'), false); assert.equal(w.skipped, false);
  const d = boot({ net: { [SCOPE + 'chunks/Room-BBBB2222.js']: 'down' } }); await assert.rejects(d.life('install')); assert.equal(d.caches._stores.has('ed-shell-v1'), false);
});
test('OFU-03 a hashed chunk held from an earlier build is copied, not downloaded again', async () => {
  const caches = cacheStore(); const a = boot({ caches }); await a.life('install');
  const b = boot({ caches, version: 'v2', files: [...FILES, 'chunks/New-CCCC3333.js'] }); await b.life('install');
  const fetched = b.calls.map((u) => u.slice(SCOPE.length));
  assert.ok(!fetched.includes('chunks/Lite-AAAA1111.js') && !fetched.includes('chunks/Room-BBBB2222.js'), 'held chunks are not fetched');
  assert.ok(fetched.includes('chunks/New-CCCC3333.js') && fetched.includes('demo.js'), 'new chunks and unhashed code are fetched');
  assert.equal(caches._stores.get('ed-shell-v2').size, FILES.length + 2);
});
test('OFU-04 activate keeps this shell and the one before it, removes older ones, and takes control of open pages', async () => {
  const caches = cacheStore();
  for (const v of ['v1', 'v2', 'v3']) { const w = boot({ caches, version: v }); await w.life('install'); await w.life('activate'); assert.equal(w.claimed, true); }
  await (await caches.open('ed-data-v1')).put(SCOPE + 'signal/story/s01e01.json', new Response('kept'));
  const w = boot({ caches, version: 'v4' }); await w.life('install'); await w.life('activate');
  assert.deepEqual((await caches.keys()).sort(), ['ed-data-v1', 'ed-shell-v3', 'ed-shell-v4']);
});
test('OFU-05 the page comes from the network when it answers, and from the saved copy when it fails or errors', async () => {
  const w = boot(); await w.life('install');
  assert.equal(await text(await w.get('', { mode: 'navigate' })), 'net:');   // published version when connected
  w.net['*'] = 'down'; assert.equal(await text(await w.get('', { mode: 'navigate' })), 'net:index.html');   // the copy saved at install
  w.net['*'] = 503; assert.equal(await text(await w.get('index.html')), 'net:index.html');
  w.net['*'] = 'down'; assert.equal(await text(await w.get('#/lite', { mode: 'navigate', url: SCOPE + '#/lite' })), 'net:index.html');
});
test('OFU-06 a network that neither answers nor fails gives way to the saved copy after four seconds', async () => {
  const w = boot(); await w.life('install'); w.net['*'] = 'hang';
  let done = false; const p = w.get('demo.js').then((r) => { done = true; return r; });
  await new Promise((r) => setImmediate(r)); assert.equal(done, false, 'still waiting for the network');
  assert.ok(w.timers.some((t) => t.ms === 4000)); w.fire(4000);
  assert.equal(await text(await p), 'net:demo.js');
});
test('OFU-07 a workspace asked for with a build id or a retry number is answered from its saved file offline', async () => {
  const w = boot(); await w.life('install'); w.net['*'] = 'down';
  assert.equal(await text(await w.get('ws/dispatch.js?v=abc123')), 'net:ws/dispatch.js');
  assert.equal(await text(await w.get('ws/dispatch.js?v=abc123&retry=2')), 'net:ws/dispatch.js');
});
test('OFU-08 a hashed chunk is answered from the saved copy without touching the network; an unknown one is fetched once and kept', async () => {
  const w = boot(); await w.life('install'); const before = w.calls.length;
  assert.equal(await text(await w.get('chunks/Lite-AAAA1111.js')), 'net:chunks/Lite-AAAA1111.js'); assert.equal(w.calls.length, before);
  assert.equal(await text(await w.get('chunks/Later-DDDD4444.js')), 'net:chunks/Later-DDDD4444.js'); assert.equal(w.calls.length, before + 1);
  w.net['*'] = 'down'; assert.equal(await text(await w.get('chunks/Later-DDDD4444.js')), 'net:chunks/Later-DDDD4444.js');
});
test('OFU-09 data is kept when first opened, answered from the saved copy afterwards, and refreshed behind it; a failed response is never kept', async () => {
  const w = boot(); await w.life('install');
  const u = 'signal/story/s01e01.json'; w.net[SCOPE + u] = 'first';
  assert.equal(await text(await w.get(u)), 'first');
  w.net[SCOPE + u] = 'second'; assert.equal(await text(await w.get(u)), 'first', 'the saved copy answers at once');
  assert.equal(await text(await w.get(u)), 'second', 'and the refresh behind it is what answers next');
  w.net[SCOPE + u] = 'down'; assert.equal(await text(await w.get(u)), 'second');
  w.net[SCOPE + 'signal/story/missing.json'] = 404; assert.equal((await w.get('signal/story/missing.json')).status, 404);
  assert.equal(w.caches._stores.get('ed-data-v1').has(SCOPE + 'signal/story/missing.json'), false);
  w.net[SCOPE + 'signal/story/missing.json'] = 'down'; await assert.rejects(w.get('signal/story/missing.json'));
});
test('OFU-10 a ranged request is answered from a saved whole file with the right bytes; without a saved file it goes to the network', async () => {
  const w = boot(); await w.life('install'); const u = 'media/narration/tour.mp3';
  await (await w.caches.open('ed-data-v1')).put(SCOPE + u, new Response('0123456789', { headers: { 'Content-Type': 'audio/mpeg' } }));
  w.net['*'] = 'down';
  const a = await w.get(u, { range: 'bytes=2-5' }); assert.equal(a.status, 206); assert.equal(await a.text(), '2345'); assert.equal(a.headers.get('Content-Range'), 'bytes 2-5/10'); assert.equal(a.headers.get('Content-Type'), 'audio/mpeg');
  const b = await w.get(u, { range: 'bytes=7-' }); assert.equal(await b.text(), '789'); assert.equal(b.headers.get('Content-Range'), 'bytes 7-9/10');
  const c = await w.get(u, { range: 'bytes=-3' }); assert.equal(await c.text(), '789');
  const d = await w.get(u, { range: 'bytes=4-99' }); assert.equal(await d.text(), '456789'); assert.equal(d.headers.get('Content-Length'), '6');
  const e = await w.get(u, { range: 'bytes=20-30' }); assert.equal(e.status, 416); assert.equal(e.headers.get('Content-Range'), 'bytes */10');
  w.net['*'] = undefined; const f = await w.get('media/narration/other.mp3', { range: 'bytes=0-3' }); assert.equal(await f.text(), 'net:media/narration/other.mp3');
});
test('OFU-11 the worker leaves alone what is not its business: writes, other origins, its own file and the build manifest', async () => {
  const w = boot(); await w.life('install');
  assert.equal(await w.get('demo.js', { method: 'POST' }), null);
  assert.equal(await w.get('', { url: 'https://elsewhere.test/app/demo.js' }), null);
  assert.equal(await w.get('', { url: 'https://demo.test/other/demo.js' }), null, 'outside the worker’s scope');
  assert.equal(await w.get('sw.js'), null); assert.equal(await w.get('BUILD_MANIFEST.json'), null);
});
test('OFU-12 the worker answers which build it holds', async () => {
  const w = boot({ version: 'abc123def456' }); let got = null;
  w.handlers.message({ data: { type: 'version' }, ports: [{ postMessage: (m) => { got = m; } }] });
  assert.equal(got.version, 'abc123def456'); assert.equal(got.files, FILES.length);
  w.handlers.message({ data: { type: 'anything-else' }, ports: [] }); w.handlers.message({ data: null, ports: [] });
});

// ---------------------------------------------------------------------------------------------------------- the build step
const { shipOffline } = await import(pathToFileURL(path.join(repo, 'apps/demo/build.offline.mjs')).href);
function fixture(extra = {}) {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-offline-'));
  const files = { 'index.html': '<html>', 'demo.js': 'js', 'demo.css': 'css', 'manifest.webmanifest': '{}', 'demo.js.LEGAL.txt': 'legal', 'BUILD_MANIFEST.json': '{}', 'chunks/Lite-AAAA1111.js': 'lite', 'ws/dispatch.js': 'ws', 'fonts/inter-400.woff2': 'font',
    'signal-lib.json': '{"lib":1}', 'signal/defs.svg': '<svg/>', 'signal/flags.json': '{}', 'media/narration/tour.mp3': 'audio', 'media/narration/tour.vtt': 'WEBVTT',
    'signal/index.json': JSON.stringify({ seasons: { 1: 'The Sanctuary' }, chapters: [{ id: 'pro01', season: 0 }, { id: 's01e01', season: 1 }, { id: 's01e02', season: 1 }] }),
    'signal/story/pro01.json': '{}', 'signal/art/pro01.json': '{}', 'signal/story/s01e01.json': '{"a":1}', 'signal/art/s01e01.json': '{}', 'signal/story/s01e02.json': '{}', 'signal/art/s01e02.json': '{}',
    // Added 11 Nov 2026: each chapter's quizzes, lessons and gates (signal/pieces/<id>.json) are kept with its season since they play in the story.
    'signal/pieces/pro01.json': '{}', 'signal/pieces/s01e01.json': '{}', 'signal/pieces/s01e02.json': '{}', ...extra };
  for (const [f, body] of Object.entries(files)) { if (body === null) continue; fs.mkdirSync(path.dirname(path.join(dist, f)), { recursive: true }); fs.writeFileSync(path.join(dist, f), body); }
  return dist;
}
const app = path.join(repo, 'apps/demo');
const shellOf = (dist) => JSON.parse(/const PRECACHE = (\[.*?\]);/s.exec(fs.readFileSync(path.join(dist, 'sw.js'), 'utf8'))[1]);

test('OFU-13 the shell is the app’s code and the story’s contents list; chapters, the library, media and build records stay out of it', () => {
  const dist = fixture(); const r = shipOffline(app, dist); const shell = shellOf(dist);
  assert.deepEqual(shell, ['chunks/Lite-AAAA1111.js', 'demo.css', 'demo.js', 'fonts/inter-400.woff2', 'index.html', 'manifest.webmanifest', 'offline-packs.json', 'signal/flags.json', 'signal/index.json', 'ws/dispatch.js']);
  assert.equal(r.files, shell.length); assert.match(r.version, /^[0-9a-f]{12}$/);
  const sw = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8'); assert.ok(sw.includes(`const VERSION = "${r.version}"`)); assert.ok(!sw.includes('__VERSION__') && !sw.includes('__PRECACHE__'));
});
test('OFU-14 the same files give the same shell version; changing any shell file changes it; changing a chapter does not', () => {
  const a = shipOffline(app, fixture()).version; assert.equal(shipOffline(app, fixture()).version, a);
  assert.notEqual(shipOffline(app, fixture({ 'demo.js': 'js2' })).version, a);
  assert.notEqual(shipOffline(app, fixture({ 'chunks/Lite-AAAA1111.js': null, 'chunks/Lite-EEEE5555.js': 'lite' })).version, a, 'a renamed chunk is a new shell');
  assert.equal(shipOffline(app, fixture({ 'signal/story/s01e01.json': '{"a":2}' })).version, a);
});
test('OFU-15 packs: one per season with its chapters and the shared drawings, the library, the narration; every named file exists and sizes are real', () => {
  const dist = fixture(); shipOffline(app, dist); const { packs } = JSON.parse(fs.readFileSync(path.join(dist, 'offline-packs.json'), 'utf8'));
  assert.deepEqual(packs.map((p) => p.id), ['story-0', 'story-1', 'library', 'narration']);
  const s1 = packs[1]; assert.equal(s1.chapters, 2); assert.equal(s1.label, 'SIGNAL story: Season 1, The Sanctuary'); assert.equal(packs[0].label, 'SIGNAL story: Prologue');
  assert.deepEqual(s1.files, ['signal/defs.svg', 'signal/story/s01e01.json', 'signal/art/s01e01.json', 'signal/pieces/s01e01.json', 'signal/story/s01e02.json', 'signal/art/s01e02.json', 'signal/pieces/s01e02.json'] /* pieces added 11 Nov 2026, as above */);
  assert.equal(s1.bytes, '{"a":1}'.length + 2 + 2 + 2 + 2 + 2); /* + the two pieces files, 11 Nov 2026 */ assert.equal(s1.sharedBytes, '<svg/>'.length);
  for (const p of packs) for (const f of p.files) assert.ok(fs.existsSync(path.join(dist, f)), `${p.id} → ${f}`);
  assert.deepEqual(packs[3].files.sort(), ['media/narration/tour.mp3', 'media/narration/tour.vtt']);
});
test('OFU-16 the build refuses a pack that names a missing chapter file, and a shell without the page', () => {
  assert.throws(() => shipOffline(app, fixture({ 'signal/art/s01e02.json': null })), /names a file the build did not write: signal\/art\/s01e02\.json/);
  assert.throws(() => shipOffline(app, fixture({ 'demo.css': null })), /offline shell is missing demo\.css/);
});
test('OFU-17 the worker a build writes installs and serves in the sandbox exactly as the template does', async () => {
  const dist = fixture(); const r = shipOffline(app, dist); const shell = shellOf(dist);
  const w = boot({ version: r.version, files: shell }); await w.life('install'); await w.life('activate');
  w.net['*'] = 'down'; assert.equal(await text(await w.get('signal/index.json')), 'net:signal/index.json', 'the story’s contents list opens offline');
  await assert.rejects(w.get('signal/story/s01e01.json'), 'a chapter that was never opened or kept is not there offline');
});
