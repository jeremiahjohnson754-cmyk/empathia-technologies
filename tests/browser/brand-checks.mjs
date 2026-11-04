// Brand presence checks every surface suite can call (D39): the tab icons and the apple-touch icon resolve with the right type, the web
// app manifest (when linked) is valid and its icons resolve, the theme-init script and the Inter preloads are in <head>, the shell mark
// (when the page has one) is the small shield and actually painted, and no page loads the social raster emblem-1024.png.
//
//   import { brandChecks } from './brand-checks.mjs';
//   const page = await ctx.newPage(); const loaded = watchRequests(page); await page.goto(url);
//   for (const c of await brandChecks(page, { loaded, manifest: true, shellMark: true })) ok(c.id, c.name, c.pass, c.detail);
//
// Each check is { id, name, pass, detail }. `prefix` namespaces the ids (default 'BR').
export function watchRequests(page) { const urls = []; page.on('request', (r) => urls.push(r.url())); return urls; }

export async function brandChecks(page, { loaded = [], manifest = false, shellMark = false, preload = true, themeInit = true, prefix = 'BR' } = {}) {
  const out = []; const add = (id, name, pass, detail = '') => out.push({ id: `${prefix}-${id}`, name, pass: !!pass, detail: String(detail).slice(0, 400) });
  const head = await page.evaluate(() => ({
    icons: [...document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')].map((l) => ({ rel: l.rel, href: l.href, type: l.type, sizes: l.getAttribute('sizes') })),
    manifest: document.querySelector('link[rel="manifest"]')?.href || null,
    init: [...document.head.querySelectorAll('script[src]')].map((s) => s.src).find((s) => /theme-init\.js$/.test(s)) || null,
    initFirst: (() => { const s = [...document.head.querySelectorAll('script[src], link[rel="stylesheet"]')]; return s.length > 0 && s[0].tagName === 'SCRIPT' && /theme-init\.js$/.test(s[0].src); })(),
    preloads: [...document.querySelectorAll('link[rel="preload"][as="font"]')].map((l) => l.href),
  }));
  const fetchInfo = (url) => page.evaluate(async (u) => { try { const r = await fetch(u, { cache: 'no-store' }); const b = await r.arrayBuffer(); return { status: r.status, type: r.headers.get('content-type') || '', bytes: b.byteLength }; } catch (e) { return { status: 0, type: '', bytes: 0, error: String(e) }; } }, url);
  const want = [['icon', /favicon\.svg$/, /image\/svg\+xml/], ['icon', /favicon-32\.png$/, /image\/png/], ['apple-touch-icon', /apple-touch-icon\.png$/, /image\/png/]];
  for (const [rel, re, type] of want) {
    const l = head.icons.find((i) => i.rel === rel && re.test(i.href));
    const info = l ? await fetchInfo(l.href) : null;
    add(`icon-${re.source.replace(/\W+/g, '')}`, `${rel} ${re.source.replace(/\\|\$/g, '')} is linked and served (200, ${type.source.replace(/\\/g, '')})`, l && info.status === 200 && type.test(info.type) && info.bytes > 100, JSON.stringify({ l, info }));
  }
  if (manifest) {
    let m = null; let detail = head.manifest;
    if (head.manifest) { const r = await page.evaluate(async (u) => { try { const x = await fetch(u); return { status: x.status, body: await x.text() }; } catch (e) { return { status: 0, body: String(e) }; } }, head.manifest); try { m = r.status === 200 ? JSON.parse(r.body) : null; } catch { m = null; } detail = JSON.stringify(r).slice(0, 300); }
    const icons = m?.icons || []; const sizes = icons.map((i) => i.sizes);
    const resolved = await Promise.all(icons.map((i) => fetchInfo(new URL(i.src, head.manifest).href)));
    add('manifest', 'the web app manifest is linked, valid, names the app and its 192/512 tile icons resolve', m && m.name && m.short_name && sizes.includes('192x192') && sizes.includes('512x512') && resolved.every((r) => r.status === 200), detail);
  }
  if (preload) {
    if (themeInit) add('theme-init', 'theme-init.js is the first script or stylesheet in <head> (no theme flash)', head.init && head.initFirst, JSON.stringify(head));
    const fonts = await Promise.all(head.preloads.map((u) => fetchInfo(u)));
    add('preload', 'the Inter preloads (two or three faces) resolve as WOFF2', head.preloads.length >= 2 && head.preloads.length <= 3 && head.preloads.every((u) => /inter-[\w-]+\.woff2$/.test(u)) && fonts.every((f) => f.status === 200 && f.bytes > 1000), JSON.stringify({ preloads: head.preloads, fonts }));
  }
  if (shellMark) {
    const mark = await page.evaluate(() => { const el = document.querySelector('.shell__mark'); if (!el) return null; const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return { bg: cs.backgroundImage, src: el.currentSrc || el.getAttribute('src') || null, w: r.width, h: r.height, hidden: el.getAttribute('aria-hidden') || (el.getAttribute('alt') === '' ? 'alt-empty' : null) }; });
    const url = mark && (mark.src || (/url\("?([^")]+)"?\)/.exec(mark.bg) || [])[1]);
    const info = url ? await fetchInfo(url) : null;
    add('shell-mark', 'the shell mark is the small shield (emblem-small.svg), served, 16–48 px and decorative beside the name', mark && /emblem-small\.svg$/.test(url || '') && info?.status === 200 && mark.w >= 16 && mark.w <= 48 && mark.h >= 16 && mark.h <= 48 && mark.hidden, JSON.stringify({ mark, info }));
  }
  add('no-social', 'the page never loads the social raster emblem-1024.png', !loaded.some((u) => /emblem-1024\.png/.test(u)), loaded.filter((u) => /emblem-1024/.test(u)).join(' '));
  return out;
}
