/*
 * The demonstration's offline worker. apps/demo/build.mjs writes dist/sw.js from this file, filling in the build's shell version and
 * the list of shell files (every file of the app's code: the page, the bundle, the style sheet, fonts, brand marks and every page chunk).
 *
 * What it does, in one place:
 *   install   saves the whole shell or nothing. A half-saved app would fail offline with no warning, so a failed file fails the install
 *             and the half-filled cache is removed; the browser tries again on the next visit.
 *   activate  keeps this shell and the one before it (a page still open on the previous build can finish its session offline),
 *             removes older shells, and takes control of open pages.
 *   fetch     same-origin GET only. Code without a hash in its name (the page, demo.js, demo.css, ws/*, shell/*) is fetched from the
 *             network first, so a connected visitor always gets what is published; the saved copy answers when the network fails or
 *             takes longer than four seconds. Hashed chunks never change, so the saved copy answers first. Data (SIGNAL chapters, the
 *             library, narration) is answered from the saved copy when there is one and refreshed behind it. A ranged request (audio
 *             seeking) is answered from a saved whole file when there is one; otherwise it goes to the network untouched.
 *
 * It never caches a response that is not 200, never touches another origin, and holds nothing but files this site publishes: the
 * demonstration's own state lives in the page's localStorage and is not this worker's business.
 */
const VERSION = '__VERSION__';
const SHELL = `ed-shell-${VERSION}`;
const DATA = 'ed-data-v1';
const PRECACHE = __PRECACHE__;
const SCOPE = self.registration.scope;
const abs = (p) => new URL(p, SCOPE).href;
const INSHELL = new Set(PRECACHE);
const NETWORK_WAIT_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    try {
      for (let i = 0; i < PRECACHE.length; i += 8) {
        await Promise.all(PRECACHE.slice(i, i + 8).map(async (p) => {
          // a hashed chunk held from an earlier build is the same bytes: copy it, do not download it again
          if (p.startsWith('chunks/')) { const held = await caches.match(abs(p)); if (held) { await cache.put(abs(p), held); return; } }
          const res = await fetch(new Request(abs(p), { cache: 'reload' }));
          if (res.status !== 200) throw new Error(`${p}: ${res.status}`);
          if (p === 'index.html') await cache.put(SCOPE, res.clone());
          await cache.put(abs(p), res);
        }));
      }
    } catch (e) { await caches.delete(SHELL); throw e; }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const older = (await caches.keys()).filter((k) => k.startsWith('ed-shell-') && k !== SHELL);
    for (const k of older.slice(0, -1)) await caches.delete(k);
    await self.clients.claim();
  })());
});

/** The saved copy of a shell file: this build's first, then the previous build's. */
const saved = async (key) => (await (await caches.open(SHELL)).match(key)) || caches.match(key);

async function networkFirst(request, key) {
  let timer;
  const late = new Promise((ok) => { timer = setTimeout(() => ok(undefined), NETWORK_WAIT_MS); });
  const net = fetch(request).catch(() => null);
  const first = await Promise.race([net, late]); clearTimeout(timer);
  if (first && first.status === 200) return first;
  const copy = await saved(key);
  if (copy) return copy;
  return (await net) || Response.error();
}

async function cacheFirst(request) {
  const copy = await caches.match(request.url);
  if (copy) return copy;
  const res = await fetch(request);
  if (res.status === 200) { const c = await caches.open(DATA); await c.put(request.url, res.clone()); }
  return res;
}

async function savedThenFresh(event, request) {
  const cache = await caches.open(DATA);
  const copy = await cache.match(request.url);
  const fresh = fetch(request).then(async (r) => { if (r.status === 200) await cache.put(request.url, r.clone()); return r; });
  if (copy) { event.waitUntil(fresh.catch(() => undefined)); return copy; }
  return fresh;
}

/** A ranged request answered from a saved whole file (audio and video seek this way), or null when there is no saved copy. */
async function rangeFromSaved(request) {
  const copy = await caches.match(request.url);
  if (!copy) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
  if (!m || (m[1] === '' && m[2] === '')) return null;
  const buf = await copy.arrayBuffer(); const size = buf.byteLength;
  const start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1]);
  const end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(buf.slice(start, end + 1), { status: 206, headers: { 'Content-Type': copy.headers.get('Content-Type') || 'application/octet-stream', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(SCOPE)) return;
  const path = new URL(request.url).href.slice(SCOPE.length).split(/[?#]/)[0];
  if (path === 'sw.js' || path === 'BUILD_MANIFEST.json') return;
  if (request.headers.has('range')) { event.respondWith(rangeFromSaved(request).then((r) => r || fetch(request))); return; }
  if (request.mode === 'navigate' || path === '' || path === 'index.html') { event.respondWith(networkFirst(request, abs('index.html'))); return; }
  if (path.startsWith('chunks/')) { event.respondWith(cacheFirst(request)); return; }
  if (INSHELL.has(path)) { event.respondWith(networkFirst(request, abs(path))); return; }
  event.respondWith(savedThenFresh(event, request));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'version' && event.ports[0]) event.ports[0].postMessage({ version: VERSION, files: PRECACHE.length });
});
