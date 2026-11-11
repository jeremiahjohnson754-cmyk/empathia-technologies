#!/usr/bin/env node
// The public site, served by its own server from the built dist: every page answers, has a title and description, renders without
// console errors or outside requests, has no sideways scroll at 1440 / 768 / 390 px, the menu works by keyboard, every internal link
// resolves, enquiries open the founder's hosted form honestly, and no page makes a claim the owner forbade. Since the LEI rebuild it also
// covers: the nine products in canonical order everywhere (D37/D40/D42), Scouter inside Lite (D41), the redirects of the superseded
// product pages, the not-found page with the Agora Owl (D39), the brand marks, the System/Light/Dark choice (D9), the founder section
// (task #337), the thirty-room wording, the dark-only captures (D43), budgets, and destructive checks (bad addresses, methods, storage).
// Run it in both schemes: PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs tests/browser/website.test.mjs
//   node tests/browser/website.test.mjs [dist] [evidence-dir]
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const scheme = process.env.PW_COLOR_SCHEME || 'light';
const dist = path.resolve(process.argv[2] || path.join(repo, 'apps/website/dist')); const out = path.resolve(process.argv[3] || path.join(repo, `tests/evidence/website${scheme === 'dark' ? '-dark' : ''}`)); fs.mkdirSync(out, { recursive: true });
// a free port (the suite used the fixed 4397; parallel suites collided)
const PORT = await new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const results = []; let failed = 0;
const ok = (id, name, cond, detail = '') => { results.push({ id, name, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name}${cond ? '' : ' — ' + String(detail).slice(0, 300)}`); };
const srv = spawn(process.execPath, [path.join(repo, 'apps/website/server/serve.mjs'), `--port=${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', () => r()); srv.stderr.on('data', () => r()); setTimeout(r, 2500); });
const base = `http://127.0.0.1:${PORT}`;
const pages = (fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8').match(/<loc>[^<]*<\/loc>/g) || []).map((l) => l.replace(/<\/?loc>/g, '').replace(/^https?:\/\/[^/]+/, '') || '/');
ok('W-00', 'the sitemap lists the pages', pages.length >= 10, pages.join(' '));
// capabilities that are NOT implemented at this commit (docs/legacy-parity.md): they may appear only as planned or designed, never as present
const NOT_YET = [/short-lived (download )?(url|link)s? (are|is)\b/i, /baseline[s]? (are|is) (immutable|versioned)/i, /no name-based joins/i, /collectors are outbound-only/i, /dispatch preflight (is|are) (in place|enforced)/i, /multi-factor .* (is|are) (in place|enabled)/i];
const FORBIDDEN = [/\b(aon|kraft heinz|stefanini|khc)\b/i, /SOC ?2 (certified|compliant)/i, /ISO ?27001 (certified|compliant)/i, /\b(award|awards)\b/i, /\btestimonial/i, /\bcustomers? (include|such as|like)\b/i, /\b\d+% (reduction|increase|roi)\b/i, /guaranteed/i, /production[- ]ready/i, /\bpartnered with\b/i, /real-time monitoring/i, /\b100 ?%/];
const CANON = ['Mission Control', 'Lite', 'Pro', 'Search Party', 'ServiceHands', 'Commissioning & Assurance', 'APEX', 'Field Intelligence', 'Learn'];
const SLUGS = ['mission-control', 'lite', 'pro', 'search-party', 'servicehands', 'commissioning', 'apex', 'field-intelligence', 'learn'];
const TALLY = 'https://tally.so/r/VpG0Vy';
const browser = await chromium.launch();
const newCtx = (o = {}) => browser.newContext({ ...o });
const watch = (page, errs, ext, allow404 = false) => { page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !(allow404 && /status of 404/.test(m.text()))) errs.push(m.text()); }); page.on('request', (r) => { if (!r.url().startsWith(base)) ext.push(r.url()); }); };

// ---- the original sweep, now at three widths (the tablet width is new; the desktop and phone ids are unchanged) ----
for (const [w, h, tag] of [[1440, 900, 'desktop'], [768, 1024, 'tablet'], [390, 844, 'phone']]) {
  const ctx = await newCtx({ viewport: { width: w, height: h } }); const page = await ctx.newPage(); const errs = []; const ext = []; watch(page, errs, ext);
  const links = new Set();
  for (const p of pages) {
    const r = await page.goto(base + p, { waitUntil: 'load' }); await page.waitForTimeout(120);
    const info = await page.evaluate(() => ({ title: document.title, desc: (document.querySelector('meta[name=description]') || {}).content || '', h1: (document.querySelector('h1') || {}).textContent || '', h1n: document.querySelectorAll('h1').length, over: document.documentElement.scrollWidth - document.documentElement.clientWidth, text: document.body.innerText, links: Array.from(document.querySelectorAll('a[href^="/"]')).map((a) => a.getAttribute('href')), broken: Array.from(document.images).filter((i) => i.complete && i.loading !== 'lazy' && i.naturalWidth === 0).map((i) => i.src) }));
    info.links.forEach((l) => links.add(l.split('#')[0]));
    ok(`W-${tag}-${p}`, `${p} answers with a title, a description, one h1 and no sideways scroll`, r.status() === 200 && info.title.length > 8 && info.desc.length > 20 && info.h1.trim().length >= 3 && info.h1n === 1 && info.over <= 0 && !info.broken.length, JSON.stringify({ status: r.status(), over: info.over, h1: info.h1, h1n: info.h1n, broken: info.broken }));
    const bad = FORBIDDEN.filter((re) => re.test(info.text)); if (bad.length) ok(`W-claims-${p}`, `${p} makes no forbidden claim`, false, bad.map(String).join(' '));
    const inPlace = await page.evaluate(() => Array.from(document.querySelectorAll('section')).filter((s) => /In place in the product/.test((s.querySelector('h2') || {}).textContent || '')).map((s) => s.innerText).join('\n'));
    const early = NOT_YET.filter((re) => re.test(info.text.replace(/Planned, not yet in place[\s\S]*?(?=\n[A-Z][^\n]{3,}\n)/, ''))); if (early.length || NOT_YET.some((re) => re.test(inPlace))) ok(`W-notyet-${p}`, `${p} does not present an unbuilt capability as present`, false, early.map(String).join(' '));
    if (tag === 'desktop') await page.screenshot({ path: path.join(out, `${tag}-${p.replace(/[^a-z-]/g, '') || 'home'}.png`) });
  }
  ok(`W-${tag}-links`, 'every internal link on the site resolves to a listed page or a section of one', [...links].every((l) => pages.includes(l.replace(/\/$/, '') || '/')), [...links].filter((l) => !pages.includes(l.replace(/\/$/, '') || '/')).join(' '));
  if (tag === 'phone') {
    await page.goto(base + '/'); await page.waitForTimeout(150);
    const before = await page.evaluate(() => getComputedStyle(document.getElementById('nav')).display);
    await page.focus('[data-menu]'); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
    const after = await page.evaluate(() => ({ d: getComputedStyle(document.getElementById('nav')).display, exp: document.querySelector('[data-menu]').getAttribute('aria-expanded') }));
    await page.keyboard.press('Escape'); await page.waitForTimeout(100); const closed = await page.evaluate(() => ({ d: getComputedStyle(document.getElementById('nav')).display, focus: document.activeElement?.hasAttribute('data-menu') }));
    ok('W-phone-menu', 'the phone menu opens by keyboard, reports aria-expanded, and closes on Escape', before === 'none' && after.d !== 'none' && after.exp === 'true' && closed.d === 'none' && closed.focus, JSON.stringify({ before, after, closed }));
    await page.screenshot({ path: path.join(out, 'phone-home.png') });
    // targets: every button, menu entry, theme choice and footer link is at least 44 px tall on a phone (inline links in prose excepted)
    await page.click('[data-menu]'); await page.waitForTimeout(100);
    const small = await page.evaluate(() => Array.from(document.querySelectorAll('.btn, .menu, .nav__links > li > a, .pmenu > summary, .theme button, .foot a, .lost__dest a')).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 43.5; }).map((e) => `${e.className || e.tagName}:${e.textContent.trim().slice(0, 20)}:${Math.round(e.getBoundingClientRect().height)}`));
    ok('W-phone-targets', 'controls are at least 44 px tall on a phone', !small.length, small.slice(0, 6).join(' | '));
  }
  // CHANGED 2026-11-03: the h1 length check is >= 3 (was > 3): "Pro" and "APEX" are product names the founder fixed (D42); one h1 per page,
  // the broken-image check and the h1 count are added, nothing is relaxed beyond that one character.
  // CHANGED 2026-11-03 (rebuild of the founder-approved Tally integration, 2026-10-31 20:18 CT): the site's own form is rendered only in a
  // build given an API; the default build opens the founder's hosted Tally form instead. The old assertion (the disabled form says "not
  // configured") is replaced by a stronger one: no form of the site's own, no pretended success, and the hosted-form entry point present.
  await page.goto(base + '/request-demo'); await page.waitForTimeout(150);
  const form = await page.evaluate(() => ({ forms: document.querySelectorAll('form[data-lead]').length, success: /\b(received|sent successfully|thank you for)\b/i.test(document.querySelector('main').innerText), links: Array.from(document.querySelectorAll('a[data-enquiry]')).map((a) => a.getAttribute('href')) }));
  ok(`W-${tag}-form`, 'without a configured lead endpoint no site form is shown, nothing pretends to send, and the hosted form is offered', form.forms === 0 && !form.success && form.links.includes(`${TALLY}?source=website-demo`), JSON.stringify(form));
  ok(`W-${tag}-clean`, 'no page error, no console error, no request outside the site', !errs.length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
  await ctx.close();
}

// ---- the nine products in canonical order, everywhere (D37, D40, D42), and Scouter inside Lite (D41) ----
{
  const ctx = await newCtx({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage();
  await page.goto(base + '/'); await page.waitForTimeout(150);
  const seq = await page.evaluate(() => ({
    menu: Array.from(document.querySelectorAll('.pmenu__panel li b')).map((b) => b.textContent),
    home: Array.from(document.querySelectorAll('main .tiles h3')).map((h) => h.textContent),
    foot: Array.from(document.querySelectorAll('.foot [data-p]')).map((a) => a.textContent.trim()),
    hrefs: Array.from(document.querySelectorAll('.pmenu__panel li a')).map((a) => a.getAttribute('href')),
  }));
  const same = (a) => a.join('|') === CANON.join('|');
  ok('W-canon-menu', 'the products menu lists the nine in canonical order', same(seq.menu) && seq.hrefs.join('|') === SLUGS.map((s) => `/products/${s}`).join('|'), seq.menu.join(' · '));
  ok('W-canon-home', 'the home tiles list the nine in canonical order', same(seq.home), seq.home.join(' · '));
  ok('W-canon-footer', 'the footer lists the nine in canonical order', same(seq.foot), seq.foot.join(' · '));
  await page.goto(base + '/products'); const prod = await page.evaluate(() => Array.from(document.querySelectorAll('main .tiles h3')).map((h) => h.textContent));
  ok('W-canon-products', 'the products page lists the nine in canonical order', same(prod), prod.join(' · '));
  ok('W-canon-pages', 'exactly the nine product pages exist; the superseded ones are gone', SLUGS.every((s) => pages.includes(`/products/${s}`)) && pages.filter((p) => p.startsWith('/products/')).length === 9 && !pages.includes('/products/scouter') && !pages.includes('/products/assurance-apex'), pages.filter((p) => p.startsWith('/products/')).join(' '));
  const shared = (await import(path.join(repo, 'packages/ui/src/products.ts')).catch(() => null));
  if (shared) ok('W-canon-shared', 'the website follows the shared list (packages/ui/src/products.ts)', shared.checkProductOrder(seq.menu).length === 0, shared.checkProductOrder(seq.menu).join('; '));
  for (const [i, s] of SLUGS.entries()) {
    await page.goto(base + `/products/${s}`); await page.waitForTimeout(80);
    const p = await page.evaluate(() => ({ h1: document.querySelector('h1').textContent, label: document.querySelector('.hero--product .label')?.textContent, pc: getComputedStyle(document.querySelector('.hero__band')).backgroundColor, others: Array.from(document.querySelectorAll('main .tiles h3')).map((h) => h.textContent) }));
    ok(`W-product-${s}`, `/products/${s}: its name, its position of nine, its own colour, and the other eight in order`, p.h1 === CANON[i] && p.label?.includes(`${String(i + 1).padStart(2, '0')} of 9`) && p.pc !== 'rgba(0, 0, 0, 0)' && p.others.join('|') === CANON.filter((_, j) => j !== i).join('|'), JSON.stringify(p));
  }
  await page.goto(base + '/products/lite');
  const sc = await page.evaluate(() => ({ sec: !!document.querySelector('section#scouter h2'), h2: document.querySelector('#scouter h2')?.textContent, jump: !!document.querySelector('a[href="#scouter"]') }));
  await page.goto(base + '/'); const disc = await page.evaluate(() => ({ menu: document.querySelector('.pmenu__panel a[href="/products/lite"]')?.textContent || '', tile: document.querySelector('.tile[data-product="lite"]')?.textContent || '' }));
  ok('W-scouter', 'Scouter is discoverable inside Lite: its own section (#scouter) on the Lite page, a jump link, and named in the menu and on the home tile', sc.sec && sc.h2 === 'Scouter' && sc.jump && /Scouter/.test(disc.menu) && /Scouter/.test(disc.tile), JSON.stringify({ sc, disc }));
  // product colours: nine distinct values in the current scheme
  const cols = await page.evaluate(() => Array.from(document.querySelectorAll('.spectrum i')).map((i) => getComputedStyle(i).backgroundColor));
  ok('W-colours', 'the spectrum carries nine distinct product colours', cols.length === 9 && new Set(cols).size === 9, cols.join(' '));
  await ctx.close();
}

// ---- redirects of the superseded pages, and the not-found page with the owl ----
{
  const red = {}; for (const [from, to] of Object.entries(JSON.parse(fs.readFileSync(path.join(repo, 'apps/website/redirects.json'), 'utf8')))) { const r = await fetch(base + from, { redirect: 'manual' }); red[from] = `${r.status} ${r.headers.get('location')}`; ok(`W-redirect-${from}`, `${from} redirects permanently to ${to}`, r.status === 301 && r.headers.get('location') === to, red[from]); }
  const yaml = fs.readFileSync(path.join(repo, 'render.yaml'), 'utf8'); const rm = JSON.parse(fs.readFileSync(path.join(repo, 'apps/website/redirects.json'), 'utf8'));
  ok('W-redirect-render', 'render.yaml declares the same redirects as the website server', Object.entries(rm).every(([f, t]) => new RegExp(`type: redirect\\s+source: ${f.replace(/[/]/g, '\\/')}\\s+destination: ${t.replace(/[/#]/g, (c) => '\\' + c)}`).test(yaml)), '');
  const ctx = await newCtx({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage(); const errs = []; const ext = []; watch(page, errs, ext, true);   // the document's own 404 status is expected here
  const r = await page.goto(base + '/no-such-page'); await page.waitForTimeout(150);
  const nf = await page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent || '', home: !!document.querySelector('main a[href="/"]'), owl: document.querySelector('img[data-owl]')?.getAttribute('src'), alt: document.querySelector('img[data-owl]')?.getAttribute('alt'), asked: document.querySelector('[data-asked]')?.textContent, robots: document.querySelector('meta[name=robots]')?.content, dest: document.querySelectorAll('.lost__dest a').length }));
  ok('W-404', 'an unknown address answers 404 with the designed page: h1, the address asked for, the way home, the main destinations, the Agora Owl (decorative), noindex', r.status() === 404 && /isn’t part of the site/.test(nf.h1) && nf.home && nf.owl === '/brand/owl.svg' && nf.alt === '' && nf.asked === '/no-such-page' && /noindex/.test(nf.robots || '') && nf.dest >= 4, JSON.stringify({ status: r.status(), ...nf }));
  // destructive: markup in the address is shown as text, never parsed
  await page.goto(base + '/%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E'); await page.waitForTimeout(100);
  const xss = await page.evaluate(() => ({ text: document.querySelector('[data-asked]')?.textContent || '', injected: !!document.querySelector('[data-asked] img') }));
  ok('W-404-xss', 'markup in an unknown address is shown as text, not injected', !xss.injected && xss.text.includes('<img'), JSON.stringify(xss));
  // a static host without the redirect rules still explains the move (the 404 page knows the map)
  await page.route(base + '/products/scouter', (rt) => rt.fulfill({ status: 404, contentType: 'text/html', body: fs.readFileSync(path.join(dist, '404.html')) }));
  await page.goto(base + '/products/scouter'); await page.waitForTimeout(150);
  const mv = await page.evaluate(() => ({ shown: !document.querySelector('[data-moved]').hidden, href: document.querySelector('[data-moved] a')?.getAttribute('href') }));
  ok('W-404-moved', 'the not-found page names where a moved page lives now', mv.shown && mv.href === '/products/lite#scouter', JSON.stringify(mv));
  ok('W-404-clean', 'the not-found page has no page error and no outside request', !errs.length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
  const owlElsewhere = []; for (const p of pages) { const html = fs.readFileSync(path.join(dist, p === '/' ? '' : p, 'index.html'), 'utf8'); if (/owl\.svg/.test(html)) owlElsewhere.push(p); }
  ok('W-owl-only', 'the owl appears on the not-found page only; every other page carries the one primary mark', !owlElsewhere.length, owlElsewhere.join(' '));
  // destructive requests against the server
  const bad = await fetch(base + '/%E0%A4%A'); const after = await fetch(base + '/'); const post = await fetch(base + '/', { method: 'POST', body: 'x' }); const trav = await fetch(base + '/..%2f..%2fpackage.json'); const head = await fetch(base + '/nope', { method: 'HEAD' });
  ok('W-server-hostile', 'malformed escapes, traversal and HEAD answer 404, other methods 405, and the server keeps serving', bad.status === 404 && after.status === 200 && post.status === 405 && trav.status === 404 && head.status === 404, [bad.status, after.status, post.status, trav.status, head.status].join(' '));
  await ctx.close();
}

// ---- brand marks (D39) ----
{
  const ctx = await newCtx({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage(); const big = [];
  page.on('request', (r) => { if (/emblem-1024/.test(r.url())) big.push(r.url()); });
  await page.goto(base + '/'); await page.waitForTimeout(150);
  const b = await page.evaluate(async () => { const icon = document.querySelector('link[rel=icon]')?.getAttribute('href'); const res = icon ? await fetch(icon) : null; const hdr = document.querySelector('.brand img'); const foot = document.querySelector('.lockup img'); return { icon, status: res?.status, type: res?.headers.get('content-type'), hdr: hdr?.getAttribute('src'), hdrW: hdr?.getBoundingClientRect().width, hdrOk: hdr?.naturalWidth > 0, foot: foot?.getAttribute('src'), lockup: document.querySelector('.lockup')?.textContent }; });
  ok('W-brand', 'the small shield in the header and as the favicon, the flagship aspis in the footer lockup, no social-card raster loaded', b.status === 200 && /svg|png/.test(b.type || '') && b.hdr === '/brand/emblem-small.svg' && b.hdrOk && b.hdrW === 32 && b.foot === '/brand/emblem.svg' && /THE LIVING SYSTEM/.test(b.lockup || '') && !big.length, JSON.stringify(b));
  await ctx.close();
}

// ---- System / Light / Dark (D9) ----
{
  const ctx = await newCtx({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage(); const errs = []; watch(page, errs, []);
  await page.goto(base + '/'); await page.waitForTimeout(100);
  const st = () => page.evaluate(() => ({ attr: document.documentElement.getAttribute('data-theme'), pressed: Array.from(document.querySelectorAll('[data-theme-set][aria-pressed=true]')).map((b) => b.dataset.themeSet), stored: localStorage.getItem('empathia.theme'), bg: getComputedStyle(document.body).backgroundColor }));
  const lum = (rgb) => { const [r, g, b] = rgb.match(/\d+/g).map(Number); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const s0 = await st();
  await page.click('[data-theme-set=dark]'); const s1 = await st();
  await page.click('[data-theme-set=light]'); const s2 = await st();
  await page.reload(); const s3 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.click('[data-theme-set=system]'); const s4 = await st();
  ok('W-theme', 'the theme choice follows the system by default, Dark and Light win when chosen, the choice survives a reload, System returns to the device setting', s0.pressed.join() === 'system' && s1.attr === 'dark' && s1.pressed.join() === 'dark' && lum(s1.bg) < 60 && s2.attr === 'light' && lum(s2.bg) > 200 && s3 === 'light' && s4.attr === null && s4.pressed.join() === 'system', JSON.stringify({ s0, s1, s2, s3, s4 }));
  // destructive: rapid double taps settle on the last choice; back/forward keeps the choice
  await page.click('[data-theme-set=dark]', { clickCount: 2 }); await page.click('[data-theme-set=light]'); await page.click('[data-theme-set=dark]');
  await page.goto(base + '/platform'); await page.goBack(); const s5 = await st();
  ok('W-theme-rapid', 'rapid taps settle on the last choice, and back/forward keeps it', s5.attr === 'dark' && s5.pressed.join() === 'dark' && s5.stored === 'dark', JSON.stringify(s5));
  await page.click('[data-theme-set=system]');
  ok('W-theme-clean', 'no error while switching themes', !errs.length, errs.join(' | '));
  // body text contrast in both themes
  const contrast = []; for (const t of ['light', 'dark']) { await page.click(`[data-theme-set=${t}]`); contrast.push(await page.evaluate(() => { const L = (c) => { const v = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; }; const cs = getComputedStyle(document.body); const a = L(cs.color), b = L(cs.backgroundColor); const lede = L(getComputedStyle(document.querySelector('.lede')).color); return { body: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), lede: (Math.max(lede, b) + 0.05) / (Math.min(lede, b) + 0.05) }; })); }
  ok('W-theme-contrast', 'body and secondary text keep at least 4.5:1 in the light and the dark theme', contrast.every((c) => c.body >= 4.5 && c.lede >= 4.5), JSON.stringify(contrast));
  await page.click('[data-theme-set=system]'); await ctx.close();
  // destructive: storage blocked entirely (private modes, strict settings): the page still works, the switch still switches
  const c2 = await newCtx({ viewport: { width: 1440, height: 900 } }); await c2.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  const p2 = await c2.newPage(); const e2 = []; p2.on('pageerror', (e) => e2.push(e.message)); await p2.goto(base + '/'); await p2.click('[data-theme-set=dark]');
  const blocked = await p2.evaluate(() => document.documentElement.getAttribute('data-theme'));
  ok('W-theme-nostorage', 'with storage blocked the page loads without error and the choice still applies for the page', !e2.length && blocked === 'dark', JSON.stringify({ e2, blocked }));
  await c2.close();
}

// ---- enquiries: the hosted form, honestly, with source attribution (founder 2026-10-31 20:18, 21:46, 21:51) ----
{
  const ctx = await newCtx({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage();
  const expect = { '/': ['founder'], '/founder': ['founder'], '/request-demo': ['website-demo'], '/pilot-partners': ['website-pilot', 'website-partner'], '/about': ['website-investor'], '/contact': ['website-demo', 'website-pilot', 'website-partner', 'website-investor', 'website-contact'] };
  for (const [p, sources] of Object.entries(expect)) {
    await page.goto(base + p);
    const links = await page.evaluate(() => Array.from(document.querySelectorAll('a[data-enquiry]')).map((a) => ({ s: a.dataset.enquiry, href: a.getAttribute('href'), target: a.target, rel: a.rel, name: a.textContent, disc: document.getElementById(a.getAttribute('aria-describedby') || '')?.textContent || '' })));
    const good = links.every((l) => l.href === `${TALLY}?source=${l.s}` && l.target === '_blank' && /noopener/.test(l.rel) && /noreferrer/.test(l.rel) && /new tab/.test(l.name) && /tally\.so/.test(l.disc) && /area of interest/.test(l.disc));
    ok(`W-enquiry-${p}`, `${p}: each enquiry opens the hosted form in a new tab with its source, says so, and carries the disclosure`, good && sources.every((s) => links.some((l) => l.s === s)), JSON.stringify(links.map((l) => [l.s, l.href, l.target, l.rel])));
  }
  const src = fs.readFileSync(path.join(repo, 'apps/website/src/enquiry.ts'), 'utf8');
  const demoSrc = ['apps/demo/src/enquiry.ts'].map((f) => path.join(repo, f)).find((f) => fs.existsSync(f));
  if (demoSrc) ok('W-enquiry-source', 'the website and the demonstration name the same hosted form', fs.readFileSync(demoSrc, 'utf8').includes(TALLY) && src.includes(TALLY));
  await page.goto(base + '/privacy');
  const priv = await page.evaluate(() => document.getElementById('enquiries')?.innerText || '');
  ok('W-privacy', 'the privacy notice names Tally as processor, the controller, EU storage, the US email sub-processor, the source parameter and retention; no claim that enquiries go to Empathia’s own service', /Tally/.test(priv) && /controller/.test(priv) && /processor/.test(priv) && /Europe/.test(priv) && /US email/.test(priv) && /which button you used/.test(priv) && /kept only as long as needed/.test(priv) && !/Empathia's own service/.test(await page.evaluate(() => document.body.innerText)), priv.slice(0, 200));
  await ctx.close();
}

// ---- the founder section (task #337; founder 2026-10-31 21:35, 21:42, 21:46) at three widths ----
for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
  const ctx = await newCtx({ viewport: { width: w, height: h } }); await ctx.route('https://tally.so/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' }));
  const page = await ctx.newPage(); await page.goto(base + '/'); await page.waitForTimeout(150);
  const f = await page.evaluate(() => { const blk = document.querySelector('[data-founder=home]'); const about = blk.querySelector('a[data-founder-about]'); const conn = blk.querySelector('a[data-enquiry=founder]'); const img = blk.querySelector('.portrait img'); const ir = img.getBoundingClientRect(); const nr = blk.querySelector('.founder__name').getBoundingClientRect();
    return { about: about && { href: about.getAttribute('href'), target: about.target }, conn: conn && { href: conn.getAttribute('href'), target: conn.target, text: conn.textContent }, creds: Array.from(blk.querySelectorAll('.creds abbr')).map((a) => a.textContent), quote: blk.querySelector('.philosophy p')?.textContent.length || 0, img: img.currentSrc || img.src, imgW: ir.width, nameSize: parseFloat(getComputedStyle(blk.querySelector('.founder__name')).fontSize), stacked: ir.bottom <= nr.top + 1, overflow: blk.scrollWidth > blk.clientWidth + 1, private: /private (channel|line)(?! that)/i.test(blk.innerText.replace(/not a private channel/i, '')) }; });
  const imgs = await page.evaluate(() => Array.from(document.querySelectorAll('main img')).map((i) => i.getAttribute('src')).filter((s) => /founder|portrait|person/i.test(s || '')));
  ok(`W-founder-${w}`, `founder section at ${w}: two distinct CTAs (About → /founder same tab; Connect → the hosted form, new tab, source=founder), only CTS/CAPM/Network+, the supplied portrait, a prominent name, the philosophy as focal point${w < 720 ? ', stacked' : ''}`,
    f.about?.href === '/founder' && !f.about.target && f.conn?.href === `${TALLY}?source=founder` && f.conn.target === '_blank' && /Connect with the founder/.test(f.conn.text) && f.creds.join(',') === 'CTS,CAPM,Network+' && f.quote > 100 && /\/media\/founder\//.test(f.img) && imgs.every((s) => s.startsWith('/media/founder/')) && f.nameSize >= 36 && f.imgW >= 280 && (w >= 720 || f.stacked) && !f.overflow && !f.private, JSON.stringify(f));
  if (w === 1440) {
    const [popup] = await Promise.all([page.waitForEvent('popup', { timeout: 4000 }).catch(() => null), page.click('[data-founder=home] a[data-enquiry=founder]')]);
    ok('W-founder-click', 'a real click on "Connect with the founder" opens the hosted form (stubbed) in a new tab while the page stays put', !!popup && popup.url().startsWith(`${TALLY}?source=founder`) && page.url() === base + '/', popup?.url());
    await page.goto(base + '/founder'); const fp = await page.evaluate(() => ({ h1: document.querySelector('h1').textContent, creds: Array.from(document.querySelectorAll('.creds abbr')).map((a) => a.textContent), about: !!document.querySelector('main a[data-founder-about]'), conn: document.querySelectorAll('main a[data-enquiry=founder]').length, extra: /\b(PMP|CISSP|CCNA|MBA|Ph\.?D|certified (by|in))\b/.test(document.querySelector('main').innerText) }));
    ok('W-founder-page', '/founder: his name as h1, only the three credentials, Connect with the founder (no self-link to the biography), no other qualification claimed', fp.h1 === 'Jeremiah Johnson' && fp.creds.join(',') === 'CTS,CAPM,Network+' && !fp.about && fp.conn >= 1 && !fp.extra, JSON.stringify(fp));
  }
  await ctx.close();
}

// ---- content the founder fixed: the thirty rooms; captures dark only (D43); reduced motion; no-script products menu ----
{
  const ctx = await newCtx({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const page = await ctx.newPage();
  const ROOMS = /one is the complete reference room, three keep the demonstration[’']s earlier records and twenty-six are designed from their archetypes: modelled layouts and devices, never surveyed\./;
  for (const p of ['/', '/platform']) { await page.goto(base + p); ok(`W-rooms-${p}`, `${p} states the thirty demonstration rooms in the approved wording`, ROOMS.test(await page.evaluate(() => document.body.innerText))); }
  await page.goto(base + '/'); const anim = await page.evaluate(() => getComputedStyle(document.querySelector('.spectrum i')).animationName);
  ok('W-reduced-motion', 'nothing animates for readers who ask for reduced motion', anim === 'none', anim);
  const prov = JSON.parse(fs.readFileSync(path.join(repo, 'apps/website/media/product/PROVENANCE.json'), 'utf8')).captures;
  ok('W-captures-dark', 'every product capture is from the synthetic demonstration in the dark theme (D43), with its route and hashes', Object.values(prov).length >= 1 && Object.values(prov).every((c) => c.colorScheme === 'dark' && c.data === 'synthetic demonstration data' && c.route && Object.keys(c.files).length === 2), Object.keys(prov).join(' '));
  for (const s of SLUGS) {
    await page.goto(base + `/products/${s}`); await page.waitForTimeout(100);
    const c = await page.evaluate(() => { const i = document.querySelector('.hero--product .shot img'); return i ? { ok: i.complete && i.naturalWidth > 0, alt: i.alt, w: i.getAttribute('width'), h: i.getAttribute('height'), cap: i.closest('figure').textContent } : null; });
    if (c) ok(`W-capture-${s}`, `/products/${s} shows its capture, loaded, described, sized, and labelled synthetic`, c.ok && c.alt.length > 20 && c.w && c.h && /Synthetic demonstration data/.test(c.cap), JSON.stringify(c));
  }
  await ctx.close();
  const c3 = await newCtx({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false }); const p3 = await c3.newPage(); await p3.goto(base + '/'); await p3.click('.pmenu > summary');
  ok('W-nojs-products', 'the products menu opens without JavaScript', await p3.evaluate(() => document.querySelector('.pmenu').open && getComputedStyle(document.querySelector('.pmenu__panel')).display !== 'none'));
  await c3.close();
  // destructive: the script fails to load (a lost connection, a bad deploy): the page still reads, its links and enquiries still work
  const c5 = await newCtx({ viewport: { width: 390, height: 844 } }); await c5.route('**/site.js', (r) => r.abort()); const p5 = await c5.newPage(); const e5 = []; p5.on('pageerror', (e) => e5.push(e.message));
  await p5.goto(base + '/founder'); const nf5 = await p5.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, conn: document.querySelector('a[data-enquiry=founder]')?.getAttribute('href'), visible: getComputedStyle(document.querySelector('.philosophy')).visibility }));
  ok('W-nosite-js', 'without site.js the founder page still reads and its enquiry link still works', !e5.length && nf5.h1 === 'Jeremiah Johnson' && nf5.conn === `${TALLY}?source=founder` && nf5.visible === 'visible', JSON.stringify(nf5));
  await c5.close();
  const c4 = await newCtx({ viewport: { width: 1440, height: 900 } }); const p4 = await c4.newPage(); await p4.goto(base + '/');
  await p4.focus('.pmenu > summary'); await p4.keyboard.press('Enter'); const opened = await p4.evaluate(() => document.querySelector('.pmenu').open);
  await p4.keyboard.press('Escape'); const closed = await p4.evaluate(() => ({ open: document.querySelector('.pmenu').open, focus: document.activeElement?.tagName }));
  ok('W-products-keyboard', 'the products menu opens with Enter, closes with Escape and returns focus to its button', opened && !closed.open && closed.focus === 'SUMMARY', JSON.stringify({ opened, closed }));
  await c4.close();
}

// ---- the quality uplift (docs/recovery/QUALITY_UPLIFT.md, 2026-11-04): the V2.5.3 atmosphere, the home story told with the product's
// own screens, layout at 320 px, and nothing drawn over the words. Added, nothing above relaxed. ----
{
  const prov = JSON.parse(fs.readFileSync(path.join(repo, 'apps/website/media/product/PROVENANCE.json'), 'utf8')).captures;
  const ctx = await newCtx({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage(); const errs = []; watch(page, errs, []);
  await page.goto(base + '/'); await page.waitForTimeout(200);
  const home = await page.evaluate(() => {
    const hero = document.querySelector('.hero--home'); const cs = getComputedStyle(hero);
    const chapters = Array.from(document.querySelectorAll('.chapter')).map((c) => ({ p: c.dataset.p, h: c.querySelector('h3')?.textContent || '', img: c.querySelector('.shot img')?.getAttribute('src') || '', links: Array.from(c.querySelectorAll('.chapter__go a')).map((a) => a.getAttribute('href')) }));
    const chip = Array.from(document.querySelectorAll('.stage__chip li')).map((l) => l.textContent);
    const cells = document.querySelectorAll('.mix__cells li').length; const key = Array.from(document.querySelectorAll('.mix__key b')).reduce((a, b) => a + Number(b.textContent), 0);
    const cards = Array.from(document.querySelectorAll('main .card, main .tile, main .states > div')).map((e) => getComputedStyle(e).boxShadow);
    return { bg: cs.backgroundImage, chapters, chip, cells, key, n: document.querySelector('.campus__n')?.childNodes[0]?.textContent, nSize: parseFloat(getComputedStyle(document.querySelector('.campus__n')).fontSize), flat: cards.filter((s) => s === 'none').length, cardCount: cards.length };
  });
  // the story follows the lifecycle (design, prove, run, learn), not the product order: the products' own order is checked above (W-canon)
  const inOrder = home.chapters.map((c) => c.p).join('|') === 'lite|commissioning|servicehands|apex';
  ok('W-uplift-hero', 'the home hero is a gradient panel with a glow, and its counts come from the records (9 products, 30 rooms, 1 record)', /radial-gradient/.test(home.bg) && /linear-gradient/.test(home.bg) && home.chip.join('|') === '9products|30rooms|1record', JSON.stringify({ bg: home.bg.slice(0, 80), chip: home.chip }));
  ok('W-uplift-story', 'the home page tells the lifecycle in four chapters, in lifecycle order, each with its product’s own dark capture (when captured; the acceptance chapter shows the room record) and a link to its product page', home.chapters.length === 4 && inOrder && home.chapters.every((c) => c.h.length > 10 && c.links.every((l) => /^\/products\//.test(l)) && (!prov[c.p] || c.img === `/media/product/${c.p}-1280.webp` || (c.p === 'commissioning' && prov.room && c.img === '/media/product/room-1280.webp'))), JSON.stringify(home.chapters));
  ok('W-uplift-rooms', 'the thirty rooms are drawn as thirty cells whose key adds up to thirty, and the number is display-sized', home.cells === 30 && home.key === 30 && home.n === '30' && home.nSize >= 80, JSON.stringify({ cells: home.cells, key: home.key, n: home.n, size: home.nSize }));
  ok('W-uplift-layered', 'every card, tile and evidence card is a layered surface (it carries a shadow) in this scheme', home.cardCount >= 18 && home.flat === 0, JSON.stringify({ cards: home.cardCount, flat: home.flat }));
  // The founder page carries the founder's own words verbatim (2026-11-01 05:42 and 05:46 CT): the overview beneath his name, the founding
  // story as its own section, and "My Cinderella shoe." as its own final line with generous space.
  await page.goto(base + '/founder', { waitUntil: 'load' }); await page.waitForTimeout(120);
  const fs1 = await page.evaluate(() => { const b = document.querySelector('[data-founder-bio]'); const st = document.querySelector('[data-founding-story]'); const ps = st ? [...st.querySelectorAll('p')] : []; const last = ps[ps.length - 1]; const prev = ps[ps.length - 2];
    return { bio: b ? b.textContent : '', h: st ? st.querySelector('h3').textContent : '',   /* CHANGED 2026-11-11: h3, was h2. His words now sit inside the section "How Search Party came to be" (its h2), so "The Missing Piece" is one level down; the text checked is the same */ n: ps.length, last: last ? last.textContent : '', gap: last && prev ? last.getBoundingClientRect().top - prev.getBoundingClientRect().bottom : 0, img: !!document.querySelector('.portrait img[src*="/media/founder/"]') }; });
  ok('W-founder-bio', '/founder shows the founder\'s professional overview beneath his name, verbatim', fs1.bio.startsWith('Jeremiah Johnson is an AV/IT technology leader with over eight years of experience') && fs1.bio.endsWith('through a unified, evidence-driven platform.'), fs1.bio.slice(0, 80));
  ok('W-founder-story', '/founder tells "The Missing Piece" in his words and closes with "My Cinderella shoe." on its own line, with generous space', fs1.h === 'The Missing Piece' && fs1.n === 6 && fs1.last === 'My Cinderella shoe.' && fs1.gap >= 40, JSON.stringify(fs1));
  ok('W-founder-portrait', '/founder shows the supplied portrait', fs1.img);
  for (const s of ['lite', 'apex']) {
    await page.goto(base + `/products/${s}`); const pb = await page.evaluate(() => getComputedStyle(document.querySelector('.hero--product')).backgroundImage);
    ok(`W-uplift-product-${s}`, `/products/${s}: the hero's glow is tinted by the product's own colour`, /radial-gradient/.test(pb) && pb !== 'none', pb.slice(0, 120));
  }
  ok('W-uplift-clean', 'no error on the uplifted pages', !errs.length, errs.join(' | '));
  await ctx.close();
  // 320 px (the narrowest phone the audit covers): no sideways scroll, the hero stage stacks, nothing overlaps the words
  const c320 = await newCtx({ viewport: { width: 320, height: 720 } }); const p320 = await c320.newPage();
  for (const p of ['/', '/products/lite', '/founder', '/contact']) {
    await p320.goto(base + p); await p320.waitForTimeout(100);
    const r = await p320.evaluate(() => { const over = document.documentElement.scrollWidth - document.documentElement.clientWidth; const card = document.querySelector('.stage__card'); const cap = document.querySelector('.stage .shot figcaption'); let hit = false; if (card && cap) { const a = card.getBoundingClientRect(), b = cap.getBoundingClientRect(); hit = a.top < b.bottom - 1 && a.bottom > b.top + 1; } const wide = Array.from(document.querySelectorAll('main h1, main h2, main h3, main p, main .btn')).filter((e) => e.getBoundingClientRect().right > innerWidth + 1).length; return { over, hit, wide }; });
    ok(`W-uplift-320-${p}`, `${p} at 320 px: no sideways scroll, no text or button past the edge, the record card never covers the caption`, r.over <= 0 && !r.wide && !r.hit, JSON.stringify(r));
  }
  await c320.close();
}

// ---- the concept composition (docs/recovery/inspiration/website-concept.png, 2026-11-04): glass product tiles, the workflow, estates and
// architecture strips, a closing band with a drawn room, and /films always present. Taken without the concept's unearned claims. Added. ----
{
  const ctx = await newCtx({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage(); const errs = []; watch(page, errs, []);
  await page.goto(base + '/'); await page.waitForTimeout(150);
  const h = await page.evaluate(() => {
    const rail = Array.from(document.querySelectorAll('.hero--home .glass__tile')).map((t) => ({ p: t.dataset.p, name: t.querySelector('a')?.textContent, href: t.querySelector('a')?.getAttribute('href'), r: t.getBoundingClientRect().height }));
    const strip = (id) => { const s = document.querySelector(`[data-strip="${id}"]`); return s ? { tag: s.querySelector('.strip__items').tagName, n: s.querySelectorAll('.strip__item').length, text: s.textContent, links: Array.from(s.querySelectorAll('a')).map((a) => a.getAttribute('href')), h2: s.querySelector('h2')?.id, label: s.getAttribute('aria-labelledby') } : null; };
    const band = document.querySelector('.band--drawn'); const svg = band?.querySelector('svg.drawing');
    return { rail, flow: strip('flow'), estates: strip('estates'), arch: strip('architecture'), band: !!band, drawingHidden: svg?.getAttribute('aria-hidden') === 'true', bandImgs: band ? band.querySelectorAll('img').length : -1 };
  });
  ok('W-concept-rail', 'the home hero ends in nine glass product tiles, in canonical order, each a link to its product page and at least 44 px tall', h.rail.map((r) => r.name).join('|') === CANON.join('|') && h.rail.every((r) => /^\/products\//.test(r.href) && r.r >= 44), JSON.stringify(h.rail.map((r) => r.name)));
  ok('W-concept-flow', 'the workflow strip is an ordered list of five moves, each linking its product page', h.flow && h.flow.tag === 'OL' && h.flow.n === 5 && h.flow.links.length === 5 && h.flow.links.every((l) => /^\/products\//.test(l)) && h.flow.label === h.flow.h2, JSON.stringify(h.flow && { n: h.flow.n, links: h.flow.links }));
  ok('W-concept-estates', 'the estates strip names six estates and says that no customer is named and no deployment is claimed', h.estates && h.estates.n === 6 && /No customer is named and no deployment/.test(h.estates.text), h.estates?.text.slice(0, 120));
  ok('W-concept-arch', 'the architecture strip claims only what the product enforces (no SOC 2 / ISO / certification) and links the trust page', h.arch && h.arch.n === 5 && !/SOC|ISO|certif|complian|real-time|live telemetry/i.test(h.arch.text) && h.arch.links.includes('/trust'), h.arch?.text.slice(0, 160));
  ok('W-concept-band', 'the closing band carries a drawn room (decorative svg), never a photograph', h.band && h.drawingHidden && h.bandImgs === 0, JSON.stringify({ band: h.band, hidden: h.drawingHidden, imgs: h.bandImgs }));
  const f = await page.goto(base + '/films'); await page.waitForTimeout(100);
  const fm = await page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, pending: document.querySelectorAll('[data-film-pending]').length, videos: document.querySelectorAll('video').length, srcs: Array.from(document.querySelectorAll('video source')).map((s) => s.getAttribute('src')), why: /once its rights for the website are confirmed/.test(document.body.textContent), foot: !!document.querySelector('.foot a[href="/films"]') }));
  // CHANGED 2026-11-10 (founder: the Collabora-SING film is "just for the corporate website section for Collabora-SING"): a film marked
  // `exclusive` in films.json belongs to its own section and must NOT be on /films, cleared or not. So the count on /films is now taken
  // over the films that belong there (`listed`), and a new condition requires that no exclusive film appears on the page at all. The
  // last condition (no uncleared film is shipped) still runs over the whole catalogue; nothing is relaxed for the films listed here.
  const catalogue = JSON.parse(fs.readFileSync(path.join(repo, 'apps/website/films.json'), 'utf8')).films; const listed = catalogue.filter((x) => !x.exclusive); const cleared = listed.filter((x) => x.rights?.website?.status === 'VERIFIED').length;
  const strays = catalogue.filter((x) => x.exclusive && (fm.srcs.some((s) => s.includes(`/media/${x.key}/`)) || fs.readFileSync(path.join(dist, 'films/index.html'), 'utf8').includes(x.key)));
  ok('W-films-page', '/films exists in every build: cleared films play, every other film is listed by title only with the reason, no uncleared film is shipped, and a film exclusive to another section is not here', f.status() === 200 && fm.h1 && pages.includes('/films') && fm.pending + fm.videos === listed.length && fm.videos >= cleared && !strays.length && (!fm.pending || fm.why) && fm.foot && !fs.readdirSync(path.join(dist, 'media')).some((d) => catalogue.some((c) => c.key === d && c.rights?.website?.status !== 'VERIFIED')), JSON.stringify(fm));
  for (const w of [320, 390]) {
    await page.setViewportSize({ width: w, height: 800 });
    for (const p of ['/', '/platform', '/films', '/solutions']) {
      await page.goto(base + p); await page.waitForTimeout(80);
      const r = await page.evaluate(() => { const vw = document.documentElement.clientWidth; const over = document.documentElement.scrollWidth - vw; const wide = Array.from(document.querySelectorAll('.glass__tile, .strip__item, .strip__panel, .filmcard, .band--drawn .wrap, .drawing')).filter((e) => { const b = e.getBoundingClientRect(); return b.width && (b.right > vw + 0.5 || b.left < -0.5); }).map((e) => e.className.baseVal ?? e.className); return { over, wide }; });
      ok(`W-concept-${w}-${p}`, `${p} at ${w} px: the glass tiles, strips, film cards and drawn band stay inside the page`, r.over <= 0 && !r.wide.length, JSON.stringify(r));
    }
  }
  ok('W-concept-clean', 'no error on the concept pages', !errs.length, errs.join(' | '));
  await ctx.close();
}

// ---- Collabora-SING and the founder's picture (founder, 2026-11-10). Added; nothing above is relaxed. ----
// Collabora-SING is a product in development with its own section, /collabora-sing. Its film (key SYNCLAB) plays there and nowhere else,
// never by itself; it is silent, so it carries a text description of what is shown instead of captions of speech; the page says, beside
// the player, that nothing in it is a measurement and that no pilot has been run; no figure from the film is repeated anywhere.
{
  const KEY = 'SYNCLAB'; const HOME = '/collabora-sing'; const film = JSON.parse(fs.readFileSync(path.join(repo, 'apps/website/films.json'), 'utf8')).films.find((x) => x.key === KEY);
  const built = fs.existsSync(path.join(dist, 'media', KEY, '720.mp4')); const [FW, FH] = film.frame || [1280, 720];   // 1280 × 776: the 56 px label band and the 720p picture under it
  const ctx = await newCtx({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage(); const errs = []; const ext = []; watch(page, errs, ext); const reqs = []; page.on('request', (q) => reqs.push(q.url().replace(base, '')));
  const r = await page.goto(base + HOME, { waitUntil: 'load' }); await page.waitForTimeout(200);
  const pg = await page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, label: document.querySelector('.hero .label')?.textContent, status: document.querySelector('[data-collabora-status]')?.textContent || '', text: document.querySelector('main').innerText, title: document.title, desc: document.querySelector('meta[name=description]')?.content || '', foot: document.querySelector('.foot a[href="/collabora-sing"]')?.textContent || '', productsNav: Array.from(document.querySelectorAll('.pmenu__panel li b')).map((b) => b.textContent) }));
  ok('WC-page', 'the Collabora-SING section exists, is in the sitemap and the footer, names the product as its one h1, is labelled "In Development" (label, title, footer link) and says so in its first paragraph and its description', r.status() === 200 && pages.includes(HOME) && pg.h1 === 'Collabora-SING' && pg.label === 'In Development' && /is a product in development/.test(pg.status) && /In Development/.test(pg.title) && /in development/i.test(pg.desc) && /\(In Development\)/.test(pg.foot), JSON.stringify({ status: r.status(), h1: pg.h1, label: pg.label, foot: pg.foot }));
  ok('WC-honest', 'the section says the pilot has not been run yet, gives no result, and does not count Collabora-SING among the nine products', /The pilot has not been run yet/.test(pg.status) && /no result/i.test(pg.status) && /The pilot has not been run yet\. This page gives no result, no measurement, no latency figure, no customer, no partner and no date/.test(pg.text) && /not one of the nine/.test(pg.text) && !pg.productsNav.some((n) => /collabora/i.test(n)) && !pages.some((p) => p.startsWith('/products/') && /collabora/i.test(p)), pg.status);
  // no figure from the film anywhere a reader or a search engine can see it: page text, title, description, the two text tracks
  const tracks = built ? ['captions.vtt', 'descriptions.vtt'].map((f) => fs.readFileSync(path.join(dist, 'media', KEY, f), 'utf8')) : ['', ''];
  const FIGURE = /\d\s?(ms|milliseconds?|kb\/s|kbps)\b|\d\s?%|±\s?\d/i; const cueText = (t) => t.split('\n').filter((l) => !/-->/.test(l)).join('\n');   // timing lines carry cue positions ("line:6%"), which are not figures
  const seen = [pg.text, pg.title, pg.desc, film.summary, film.disclosure, film.qualifier || '', ...tracks.map(cueText)].filter((t) => FIGURE.test(t)).map((t) => (t.match(FIGURE) || [''])[0] + ' in: ' + t.slice(0, 50));
  ok('WC-no-figures', 'no latency, jitter, loss or offset figure appears in the page text, its title or description, the film\'s catalogue text or its text tracks', !seen.length, seen.join(' | '));
  const claims = [/\b(we|our team|empathia) (measured|found|proved|showed|achieved)\b/i, /\bresults? (show|shows|showed|prove|confirm)/i, /\b(lower|faster|better) (latency|than)\b/i, /\bpartner(ed|ship)? with\b/i, /\b(universit|conservator|college|orchestra|choir)\w*/i];
  ok('WC-no-claims', 'the section claims no finding, comparison, partner or institution', !claims.some((re) => re.test(pg.text)), claims.filter((re) => re.test(pg.text)).map(String).join(' '));

  if (!built) ok('WC-film', `the film is VERIFIED in films.json (${film.rights?.website?.status}) but is not in this build: nothing about the player could be checked`, false, 'apps/website/dist/media/SYNCLAB/720.mp4 is missing');
  else {
    const v = await page.evaluate(() => { const vs = Array.from(document.querySelectorAll('video')); const v = vs[0]; if (!v) return { n: 0 }; const fig = v.closest('figure'); const q = fig.querySelector('[data-film-qualifier]'); const qr = q?.getBoundingClientRect(); const vr = v.getBoundingClientRect(); const det = fig.querySelector('[data-film-description]');
      return { n: vs.length, src: v.querySelector('source')?.getAttribute('src'), type: v.querySelector('source')?.getAttribute('type'), autoplayAttr: v.hasAttribute('autoplay'), autoplay: v.autoplay, loop: v.loop, paused: v.paused, preload: v.getAttribute('preload'), controls: v.controls, inline: v.playsInline, poster: v.getAttribute('poster'), started: v.currentTime, net: v.networkState,
        tracks: Array.from(v.querySelectorAll('track')).map((t) => ({ kind: t.kind, src: t.getAttribute('src'), lang: t.srclang, label: t.label, def: t.default })), modes: Array.from(v.textTracks).map((t) => t.mode),
        qualifier: q?.textContent || '', qVisible: !!qr && qr.width > 200 && qr.height > 20 && getComputedStyle(q).visibility === 'visible', qAbove: !!qr && qr.bottom <= vr.top + 1 && vr.top - qr.bottom < 40, describedby: (v.getAttribute('aria-describedby') || '').split(' ').map((id) => !!document.getElementById(id)),
        cap: fig.querySelector('figcaption')?.textContent || '', how: fig.querySelector('[data-film-how]')?.textContent || '', howVisible: (fig.querySelector('[data-film-how]')?.getBoundingClientRect().height || 0) > 10,
        summary: det?.querySelector('summary')?.textContent || '', cues: det ? Array.from(det.querySelectorAll('li')).map((li) => ({ time: li.querySelector('.film__time')?.textContent || '', text: li.querySelector('p')?.textContent || '' })) : [] }; });
    await page.waitForTimeout(1500); const still = await page.evaluate(() => { const v = document.querySelector('video'); return { paused: v.paused, t: v.currentTime }; });
    const early = reqs.filter((u) => /\.mp4|\.vtt/.test(u));   // before anyone presses play: the poster may load, the film and its text tracks may not
    ok('WC-film', 'the section has one player for the film, with controls, a poster and its own renditions; it does not autoplay, does not loop, and nothing of the film is loaded or played until the viewer asks', v.n === 1 && v.src === `/media/${KEY}/720.mp4` && v.type === 'video/mp4' && !v.autoplayAttr && !v.autoplay && !v.loop && v.paused && still.paused && still.t === 0 && v.preload === 'none' && v.controls && v.inline && v.poster === `/media/${KEY}/poster.webp` && reqs.includes(`/media/${KEY}/poster.webp`) && !early.length, JSON.stringify({ ...v, cues: v.cues.length, still, early }));
    // the poster: a real frame, not black (the film opens on black), in both formats
    const poster = await page.evaluate(async (src) => { const im = new Image(); im.src = src; await im.decode(); const c = document.createElement('canvas'); c.width = 160; c.height = 90; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 160, 90); const d = g.getImageData(0, 0, 160, 90).data; let sum = 0, bright = 0; for (let i = 0; i < d.length; i += 4) { const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; sum += l; if (l > 150) bright += 1; } return { w: im.naturalWidth, h: im.naturalHeight, mean: sum / (d.length / 4), bright: bright / (d.length / 4) }; }, `/media/${KEY}/poster.webp`);
    const jpg = await fetch(base + `/media/${KEY}/poster.jpg`);
    ok('WC-poster', 'the poster is a frame from inside the film, in the rendition\'s own proportions, with picture and legible text in it (not the black opening frame), and a JPEG of it exists', poster.w >= 1280 && Math.abs(poster.w / poster.h - FW / FH) < 0.01 && poster.mean > 20 && poster.bright > 0.005 && jpg.status === 200 && /image\/jpeg/.test(jpg.headers.get('content-type') || ''), JSON.stringify(poster));
    // silent film: no audio stream in the rendition at all (so it cannot play sound, by itself or otherwise); captions say so; nothing is spoken
    const mp4 = fs.readFileSync(path.join(dist, 'media', KEY, '720.mp4')); const hasBox = (s) => mp4.includes(Buffer.from(s, 'latin1'));
    const cueLines = (t) => t.replace(/\r/g, '').split(/\n\n+/).filter((b) => /-->/.test(b) && !/^NOTE\b/.test(b)).map((b) => b.split('\n').filter((l) => !/-->/.test(l) && !/^\d+$/.test(l)).join(' '));
    const capCues = cueLines(tracks[0]); const descCues = cueLines(tracks[1]);
    ok('WC-silent', 'the rendition has a video stream and no audio stream; its captions track holds one cue that says the film is silent; no word is presented as spoken', hasBox('vide') && !hasBox('soun') && mp4.length < 8 * 1024 * 1024 && capCues.length === 1 && /no sound/i.test(capCues[0]) && /silent/i.test(capCues[0]) && !/\b(narrator|voice-?over|speaker)\b|\bsays:|\[music\]/i.test(tracks.join('\n').replace(/^NOTE[\s\S]*?\n\n/gm, '')) && /0:35 · no sound · text description below/.test(v.cap), JSON.stringify({ vide: hasBox('vide'), soun: hasBox('soun'), bytes: mp4.length, capCues }));
    const kinds = v.tracks.map((t) => t.kind).join(',');
    ok('WC-tracks', 'two WebVTT tracks: captions (off until chosen, so nothing covers the film\'s own text) and a description of what is shown; both load from this site as text/vtt', kinds === 'captions,descriptions' && v.tracks.every((t) => t.lang === 'en' && t.label && !t.def && t.src.startsWith(`/media/${KEY}/`)) && v.modes.every((m) => m !== 'showing') && tracks.every((t) => t.startsWith('WEBVTT')) && (await Promise.all(v.tracks.map((t) => fetch(base + t.src).then((x) => x.status === 200 && /text\/vtt/.test(x.headers.get('content-type') || ''))))).every(Boolean), JSON.stringify(v.tracks));
    // the description: every scene, with its times, the on-screen words quoted, and the film's own disclaimers in it; the same text is the descriptions track
    const scenes = ['01 Hypothesis', '02 Bench', '03 Network', '04 Musician', '05 Blind test', '06 Telemetry', '07 Analyzer', '08 Evidence', 'End card'];
    const quoted = ['What if we transmitted the performance... instead of only the sound?', 'One performance, two ways to send it.', 'Five network conditions, one stage at a time.', 'A real player at a real keyboard.', 'Twenty trials. Nobody in the room knows which is which.', 'DEMO DATA not a measurement', 'Every note is stamped at five moments.', 'No pilot data yet', 'This is the plan. The pilot has not been run yet.', 'NOT YET MEASURED', 'COLLABORA-SING SYNCLAB'];
    const all = v.cues.map((c) => c.text).join('\n');
    ok('WC-description', 'the text description under the player covers the eight scenes and the end card in order, each with its start and end time, quotes the on-screen words, and matches the descriptions track cue for cue', v.cues.length === 9 && scenes.every((s, i) => v.cues[i].text.startsWith(s)) && v.cues.every((c) => /^From \d:\d\d – to \d:\d\d$/.test(c.time.replace(/\s+/g, ' ').trim())) && v.cues[0].time.includes('0:00') && v.cues[8].time.includes('0:35') && quoted.every((q) => all.includes(q)) && descCues.length === 9 && descCues.every((c, i) => c === v.cues[i].text) && /text description/i.test(v.summary), JSON.stringify({ n: v.cues.length, times: v.cues.map((c) => c.time), missing: quoted.filter((q) => !all.includes(q)) }));
    ok('WC-described-as-shown', 'the page says, outside the collapsed description, that the film has no sound, that its words are written on screen, and that the description is of what is shown and was not spoken', v.howVisible && /no sound and no narration/.test(v.how) && /written on screen/.test(v.how) && /of what is shown/.test(v.how) && /Nothing in it was spoken/.test(v.how), v.how);
    // the qualifier sits directly above the player, always visible (the film's own disclaimers are on screen only briefly)
    ok('WC-qualifier', 'directly above the player, always visible and tied to it: every figure in the film is demonstration data and not a measurement, the labels show how results WILL be classified, and no pilot has been run; the end card\'s "real networks, real instruments, real musicians" is marked as the plan\'s aim, never stated as done', v.qVisible && v.qAbove && v.describedby.length === 2 && v.describedby.every(Boolean) && /Every figure shown in it is demonstration data, not a measurement/.test(v.qualifier) && /will be classified once a pilot runs/.test(v.qualifier) && /No pilot has been run/.test(v.qualifier) && /\[The last line is the plan’s aim\./.test(v.cues[8].text) && !/real networks?[,·]? real instruments?[,·]? (and )?real musicians?/i.test(pg.text), JSON.stringify({ q: v.qualifier, visible: v.qVisible, above: v.qAbove }));
    // it plays when asked, as the 1280×720 film of 35 s, with no audio decoded, from this site only; and it can be sought to its last scene
    const play = await page.evaluate(async () => { const v = document.querySelector('video'); if (!v.canPlayType('video/mp4; codecs="avc1.64001f"')) return { can: false }; try { await v.play(); } catch (e) { return { can: true, err: String(e) }; } await new Promise((r) => setTimeout(r, 1800)); const o = { can: true, t: v.currentTime, paused: v.paused, w: v.videoWidth, h: v.videoHeight, d: v.duration, audio: v.webkitAudioDecodedByteCount, video: v.webkitVideoDecodedByteCount, muted: v.muted }; v.currentTime = 31; await new Promise((r) => setTimeout(r, 1500)); o.sought = v.currentTime; v.pause(); return o; });
    if (!play.can) { console.log('NOT_RUN WC-play this browser cannot decode H.264: playing the film was not tested'); results.push({ id: 'WC-play', name: 'the film plays when asked', result: 'NOT_RUN', detail: 'the test browser has no H.264 decoder' }); }
    else ok('WC-play', `pressing play plays the ${FW} × ${FH}, 35-second film from this site, with no sound decoded, and it can be sought to its last scene`, !play.err && play.t > 0.5 && !play.paused && play.w === FW && play.h === FH && Math.abs(play.d - 35) < 0.2 && play.audio === 0 && play.video > 0 && play.sought >= 31 && play.sought < 35 && reqs.includes(`/media/${KEY}/720.mp4`), JSON.stringify(play));
    // the label burned into the film (founder, 2026-11-10: what qualifies the figures must be IN the film, not only beside it). Read from
    // the decoded picture at the start, at 0:20 (figures on screen) and on the end card: a dark band above the 720p picture (where the player's controls never
    // sit) carrying light amber lettering across most of its width, and the page shows the whole frame (nothing of the band or the picture is cropped away).
    const LABEL = 'IN DEVELOPMENT · DEMONSTRATION DATA · NO PILOT HAS BEEN RUN';
    if (play.can && !play.err) {
      const band = await page.evaluate(async ([fw, fh, bandH]) => { const v = document.querySelector('video'); const c = document.createElement('canvas'); c.width = fw; c.height = fh; const g = c.getContext('2d', { willReadFrequently: true }); const out = [];
        const read = (src) => { g.drawImage(src, 0, 0, fw, fh); const d = g.getImageData(0, 4, fw, bandH - 10).data; let amber = 0, dark = 0, minX = fw, maxX = 0; for (let i = 0; i < d.length; i += 4) { const r = d[i], gr = d[i + 1], b = d[i + 2]; if (r > 190 && gr > 160 && b < 200 && r - b > 40) { amber += 1; const x = (i / 4) % fw; if (x < minX) minX = x; if (x > maxX) maxX = x; } else if (r < 40 && gr < 40 && b < 50) dark += 1; } const n = d.length / 4; return { amber: +(amber / n).toFixed(3), dark: +(dark / n).toFixed(3), span: +((maxX - minX) / fw).toFixed(2) }; };
        for (const t of [0.2, 20, 34.6]) { v.currentTime = t; await new Promise((r) => { v.addEventListener('seeked', r, { once: true }); setTimeout(r, 3000); }); await new Promise((r) => setTimeout(r, 150)); out.push({ t, at: +v.currentTime.toFixed(1), ...read(v) }); }
        const im = new Image(); im.src = v.getAttribute('poster'); await im.decode(); out.push({ t: 'poster', ...read(im) });
        const fr = v.closest('.film__frame').getBoundingClientRect(); return { out, ratio: fr.width / fr.height, fit: getComputedStyle(v).objectFit, wAttr: v.getAttribute('width'), hAttr: v.getAttribute('height') }; }, [FW, FH, film.burnedLabel?.band || 0]);
      ok('WC-label', `the web rendition carries "${LABEL}" for its whole length (read at the start, at 0:20 and on the end card, and on the poster): light lettering across most of a dark band above the picture, and the page shows the whole frame uncropped`, film.burnedLabel?.text === LABEL && film.burnedLabel.band === FH - 720 && band.out.length === 4 && band.out.every((b) => b.amber > 0.04 && b.amber < 0.4 && b.dark > 0.5 && b.span > 0.8) && Math.abs(band.ratio - FW / FH) < 0.01 && band.wAttr === String(FW) && band.hAttr === String(FH), JSON.stringify(band));
    } else { console.log('NOT_RUN WC-label the film could not be decoded in this browser: the burned-in label was not read'); results.push({ id: 'WC-label', name: 'the burned-in label is present for the whole film', result: 'NOT_RUN', detail: 'no H.264 decoder' }); }
  }
  // the film lives in this section only: no other page, and no script or stylesheet, carries its key, its files or a player for it
  const elsewhere = []; for (const p of [...pages.filter((x) => x !== HOME), '/404']) { const html = fs.readFileSync(p === '/404' ? path.join(dist, '404.html') : path.join(dist, p === '/' ? '' : p, 'index.html'), 'utf8'); if (html.includes(KEY) || /synclab/i.test(html)) elsewhere.push(p); }
  for (const f of ['site.js', 'pilot.js', 'site.css']) if (fs.readFileSync(path.join(dist, f), 'utf8').includes(KEY)) elsewhere.push(f);
  ok('WC-only-here', `no page other than ${HOME} (${pages.length - 1} pages and the not-found page checked), and no script or stylesheet, references the film's key or files; films.json keeps it exclusive to this section`, !elsewhere.length && film.exclusive === true && film.placement.join() === HOME, elsewhere.join(' '));
  await page.goto(base + '/'); await page.waitForTimeout(150); const homeVideos = await page.evaluate((k) => document.querySelectorAll(`[data-film="${k}"], video source[src*="/media/${k}/"]`).length, KEY);
  await page.goto(base + '/films'); const filmsPage = await page.evaluate((k) => ({ text: document.querySelector('main').textContent, videos: document.querySelectorAll(`[data-film="${k}"], video source[src*="/media/${k}/"]`).length }), KEY);
  ok('WC-not-elsewhere', 'the home page has no player for this film, and the films page neither plays nor lists it', homeVideos === 0 && !/collabora|synclab/i.test(filmsPage.text) && filmsPage.videos === 0, JSON.stringify({ homeVideos, films: filmsPage.videos }));
  ok('WC-clean', 'no page error, no console error and no request outside the site on the section, before, during and after playing the film', !errs.length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
  await ctx.close();
  // phone and narrow phone: nothing past the edge, the player and the tables inside the page, controls tall enough, focus visible by keyboard
  for (const w of [390, 320]) {
    const c = await newCtx({ viewport: { width: w, height: 844 } }); const p = await c.newPage(); await p.goto(base + HOME); await p.waitForTimeout(150);
    const m = await p.evaluate(() => { const vw = document.documentElement.clientWidth; const wide = Array.from(document.querySelectorAll('main h1, main h2, main h3, main p, main .btn, main video, main .film__frame, main .plan, main .plan__table, main .tag, main .film__qualifier')).filter((e) => { const b = e.getBoundingClientRect(); return b.width && (b.right > vw + 0.5 || b.left < -0.5); }).map((e) => e.className || e.tagName);
      const short = Array.from(document.querySelectorAll('main .btn, main summary')).filter((e) => e.getBoundingClientRect().height < 43.5).map((e) => e.textContent.trim().slice(0, 24)); return { over: document.documentElement.scrollWidth - vw, wide, short }; });
    ok(`WC-phone-${w}`, `the section at ${w} px: no sideways scroll, nothing past the edge, buttons and the description toggle at least 44 px tall`, m.over <= 0 && !m.wide.length && !m.short.length, JSON.stringify(m));
    if (w === 390 && built) {
      await p.focus('[data-film-description] > summary'); await p.keyboard.press('Tab'); await p.keyboard.press('Shift+Tab');
      const fo = await p.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); return { tag: e.tagName, ring: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2 }; });
      await p.keyboard.press('Enter'); const open = await p.evaluate(() => document.querySelector('[data-film-description]').open);
      await p.focus('video'); const vf = await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return document.activeElement.tagName === 'VIDEO' && s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2 && parseFloat(s.outlineOffset) < 0; });   // drawn inside the frame, which clips anything outside it
      ok('WC-keyboard', 'the description opens from the keyboard with a visible focus ring, and the player takes keyboard focus with a visible ring', fo.tag === 'SUMMARY' && fo.ring && open && vf, JSON.stringify({ fo, open, vf }));
    }
    await c.close();
  }
  // reduced motion: the section adds no animation of its own, and the film still does not start by itself
  const cr = await newCtx({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const prm = await cr.newPage(); await prm.goto(base + HOME); await prm.waitForTimeout(600);
  const rm = await prm.evaluate(() => ({ moving: Array.from(document.querySelectorAll('[data-collabora] *')).filter((e) => { const s = getComputedStyle(e); return (s.animationName && s.animationName !== 'none') || parseFloat(s.transitionDuration) > 0; }).length, paused: document.querySelector('video') ? document.querySelector('video').paused : true }));
  ok('WC-reduced-motion', 'for readers who ask for reduced motion nothing in the section animates and the film stays still until asked', rm.moving === 0 && rm.paused, JSON.stringify(rm)); await cr.close();

  // the founder's picture (supplied 2026-11-10): on the home page and the founder page, whole, with its intrinsic size and a name-only alternative text
  const ALT = 'Jeremiah Johnson, founder of Empathia Technologies';
  for (const [p, sel, w] of [['/', '[data-founder=home]', 1440], ['/founder', '[data-founder=founder]', 1440], ['/founder', '[data-founder=founder]', 390]]) {
    const c = await newCtx({ viewport: { width: w, height: 900 } }); const pp = await c.newPage(); const e2 = []; const x2 = []; watch(pp, e2, x2); await pp.goto(base + p, { waitUntil: 'load' });
    await pp.locator(`${sel} .portrait img`).scrollIntoViewIfNeeded(); await pp.waitForFunction((s) => { const i = document.querySelector(`${s} .portrait img`); return i.complete && i.naturalWidth > 0; }, sel, { timeout: 8000 }).catch(() => {});
    const im = await pp.evaluate((s) => { const i = document.querySelector(`${s} .portrait img`); const b = i.getBoundingClientRect(); const src = i.closest('picture').querySelector('source'); return { n: document.querySelectorAll('main .portrait img').length, alt: i.alt, wAttr: i.getAttribute('width'), hAttr: i.getAttribute('height'), loaded: i.complete && i.naturalWidth > 0, nw: i.naturalWidth, nh: i.naturalHeight, cur: (i.currentSrc || '').replace(location.origin, ''), boxW: b.width, boxH: b.height, fit: getComputedStyle(i).objectFit, srcset: i.getAttribute('srcset'), webp: src?.getAttribute('srcset'), sizes: i.getAttribute('sizes'), over: document.documentElement.scrollWidth - document.documentElement.clientWidth }; }, sel);
    ok(`WF-portrait-${p}-${w}`, `${p} at ${w} px shows the founder's picture once, loaded from this site, whole (square, as supplied), with its intrinsic width and height stated and the alternative text "${ALT}"`,
      im.n === 1 && im.alt === ALT && im.wAttr === '960' && im.hAttr === '960' && im.loaded && im.nw > 0 && im.nw === im.nh && /^\/media\/founder\/(320|640|960)\.(webp|jpg)$/.test(im.cur) && Math.abs(im.boxW - im.boxH) <= 1 && im.boxW >= 280 && /320w.*640w.*960w/.test(im.srcset) && /320\.webp 320w.*960\.webp 960w/.test(im.webp || '') && !!im.sizes && im.over <= 0 && !e2.length && !x2.length, JSON.stringify({ ...im, e2, x2 }));
    await c.close();
  }
  const founderFiles = fs.readdirSync(path.join(dist, 'media/founder')).sort();
  ok('WF-portrait-files', 'the site ships the three sizes of the picture in WebP and JPEG and none of the earlier portrait files; no alternative text on the site describes the founder beyond his name and role', founderFiles.join() === '320.jpg,320.webp,640.jpg,640.webp,960.jpg,960.webp' && pages.every((p) => { const html = fs.readFileSync(path.join(dist, p === '/' ? '' : p, 'index.html'), 'utf8'); return (html.match(/<img[^>]*media\/founder[^>]*>/g) || []).every((t) => t.includes(`alt="${ALT}"`)) && !/media\/founder\/(480|800|1200)\./.test(html); }), founderFiles.join());
  // ADDED 2026-11-11 (a defect seen in the screenshots): in the founder page's closing band the button was stretched to the height of the
  // disclosure beside it. The button keeps its own height and the disclosure sits under it, at desktop and phone width.
  for (const w of [1440, 390]) {
    const c = await newCtx({ viewport: { width: w, height: 900 } }); const pp = await c.newPage(); await pp.goto(base + '/founder', { waitUntil: 'load' });
    const b = await pp.evaluate(() => { const band = document.querySelector('main .band'); const btn = band.querySelector('a[data-enquiry=founder]').getBoundingClientRect(); const d = band.querySelector('.disclosure').getBoundingClientRect(); return { h: Math.round(btn.height), under: d.top >= btn.bottom, left: Math.abs(d.left - btn.left) < 2 }; });
    ok(`WF-band-${w}`, `/founder at ${w} px: the closing band's button keeps a button's height (44 to 72 px) and its disclosure sits under it, aligned with it`, b.h >= 44 && b.h <= 72 && b.under && b.left, JSON.stringify(b)); await c.close();
  }
}

// ---- the founder page: the Search Party founding story and the ten-second introduction (founder, 10 and 11 Nov 2026). Added. ----
// His words (apps/website/src/founder.ts) are rendered exactly as they stand and the file itself is pinned by hash; everything else
// in the story is the company's plain description (no employer, customer, endorsement, date or number). The introduction plays once
// per session when the plate is in view, can be paused and replayed, never moves the page, never blocks a link, and its resting
// composition is what a visitor without script or with reduced motion sees from the start.
{
  const crypto = await import('node:crypto'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
  const src = fs.readFileSync(path.join(repo, 'apps/website/src/founder.ts'), 'utf8');
  const W = await import('data:text/javascript;base64,' + Buffer.from((await esbuild.transform(src, { loader: 'ts', format: 'esm' })).code).toString('base64'));
  const WORDS_SHA = '34443e64c28233a071758d7a4a112210422b05b24cb41e7b06706f85426f9797';   // sha256 of JSON [FOUNDER_BIO, FOUNDING_STORY, FOUNDING_STORY_CLOSE] as the founder supplied them (commit f45cc78)
  ok('WS-words-pinned', 'the founder\'s own words in apps/website/src/founder.ts are byte-for-byte the words he supplied (five paragraphs, then "My Cinderella shoe.")', crypto.createHash('sha256').update(JSON.stringify([W.FOUNDER_BIO, W.FOUNDING_STORY, W.FOUNDING_STORY_CLOSE])).digest('hex') === WORDS_SHA && W.FOUNDING_STORY.length === 5 && W.FOUNDING_STORY_CLOSE === 'My Cinderella shoe.');
  const FOUR = ['People', 'Process', 'Technology', 'Communication']; const APPROACH = ['Start with a real operational problem.', 'Understand the relationships around it.', 'Build a system that improves the entire workflow.'];
  const ctx = await newCtx({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const page = await ctx.newPage(); const errs = []; const ext = []; watch(page, errs, ext);
  await page.goto(base + '/founder', { waitUntil: 'load' }); await page.waitForTimeout(150);
  const st = await page.evaluate(() => { const sec = document.querySelector('[data-origin]'); const words = sec.querySelector('[data-founding-story]'); const kids = [...words.children]; const ps = kids.filter((e) => e.tagName === 'P'); const last = kids[kids.length - 1]; const prev = kids[kids.length - 2];
    const clone = sec.cloneNode(true); clone.querySelectorAll('.origin__n, .approach span, [data-founding-story], figure.shot').forEach((e) => e.remove());
    return { id: sec.id, h2: sec.querySelector('h2').textContent, parts: [...sec.querySelectorAll('[data-origin-part]')].map((e) => e.dataset.originPart), heads: [...sec.querySelectorAll('h3')].map((h) => h.textContent), wordsTags: kids.map((e) => e.tagName).join(','), h: kids[0].textContent, ps: ps.map((p) => p.textContent), lastIsClose: last.tagName === 'P' && last === ps[ps.length - 1], gap: last.getBoundingClientRect().top - prev.getBoundingClientRect().bottom, lastLines: Math.round(last.getBoundingClientRect().height / parseFloat(getComputedStyle(last).lineHeight)),
      bio: document.querySelector('[data-founder-bio]').textContent, request: sec.querySelector('[data-origin-part=request]').innerText, layers: [...sec.querySelectorAll('[data-holds] .holds__links li')].map((li) => ({ id: li.dataset.layer, name: li.querySelector('b').textContent, asks: li.querySelector('span').textContent })), cols: [...sec.querySelectorAll('.holds__cols span')].map((s) => s.textContent), holdsNote: sec.querySelector('[data-holds] figcaption').textContent,
      became: sec.querySelector('[data-origin-part=became]').innerText, links: [...sec.querySelectorAll('[data-origin-part=became] a')].map((a) => a.getAttribute('href')), synthetic: sec.querySelector('[data-origin-synthetic]').textContent, approach: [...sec.querySelectorAll('[data-approach] li')].map((li) => li.lastChild.textContent), ours: clone.innerText, creds: [...document.querySelectorAll('main .creds abbr')].map((a) => a.textContent), h1n: document.querySelectorAll('h1').length }; });
  ok('WS-verbatim', 'the rendered text equals the constants: the overview is FOUNDER_BIO; the block of his words is the heading "The Missing Piece", then FOUNDING_STORY paragraph for paragraph in his order, then FOUNDING_STORY_CLOSE, and nothing else is inside it', st.bio === W.FOUNDER_BIO && st.h === 'The Missing Piece' && st.wordsTags === 'H3,P,P,P,P,P,P' && st.ps.length === 6 && W.FOUNDING_STORY.every((t, i) => st.ps[i] === t) && st.ps[5] === W.FOUNDING_STORY_CLOSE, JSON.stringify({ tags: st.wordsTags, n: st.ps.length }));
  ok('WS-close', '"My Cinderella shoe." is the last line of his words, on one line of its own, with generous space above it', st.lastIsClose && st.ps[5] === 'My Cinderella shoe.' && st.gap >= 40 && st.lastLines === 1, JSON.stringify({ gap: st.gap, lines: st.lastLines }));
  ok('WS-structure', 'the story is one section, #search-party-story, "How Search Party came to be", in five parts in order: the request, what the list could not hold, his words, what it became, the approach', st.id === 'search-party-story' && st.h2 === 'How Search Party came to be' && st.parts.join() === 'request,list,words,became,approach' && st.heads.join('|') === 'The request|What the list could not hold|The Missing Piece|What it became|The approach it set' && st.h1n === 1, JSON.stringify({ parts: st.parts, heads: st.heads }));
  ok('WS-request', 'the request is told only as he told it: a plain infrastructure task, a contacts list, in his phrase “a simple contacts-list request”', /plain infrastructure task/.test(st.request) && /contacts list/.test(st.request) && st.request.includes('“a simple contacts-list request”') && W.FOUNDING_STORY.join(' ').includes('a simple contacts-list request'), st.request.slice(0, 200));
  ok('WS-layers', 'what the list could not hold is drawn from one record: the four words in the company\'s order, each with the question a list has no column for; the list itself holds a name, a role and a number; the drawing says it is not any organisation\'s record', st.layers.map((l) => l.name).join() === FOUR.join() && st.layers.map((l) => l.id).join() === FOUR.map((x) => x.toLowerCase()).join() && st.layers.every((l) => /\?$/.test(l.asks) && l.asks.length > 20) && new Set(st.layers.map((l) => l.asks)).size === 4 && st.cols.join() === 'Name,Role,Number' && /not the record of any organisation/.test(st.holdsNote), JSON.stringify(st.layers));
  const sp = await (async () => { await page.goto(base + '/products/search-party', { waitUntil: 'load' }); return page.evaluate(() => { const o = document.querySelector('[data-sp-origin]'); const p = o?.querySelector('p:not(.eyebrow)'); return { lede: document.querySelector('.hero .lede').textContent, origin: p?.textContent || '', sentences: (p?.textContent.match(/[.!?](\s|$)/g) || []).length, link: o?.querySelector('a')?.getAttribute('href'), demo: document.querySelector('.hero a.btn--primary').getAttribute('href') }; }); })();
  ok('WS-became', 'what it became is described from the Search Party product record (its own description, word for word), with find / connected / same record, the plain statement that the demonstration runs on synthetic data, and links to the product page and to Search Party in the demonstration', st.became.includes(sp.lede) && /Find a room, a device, a person or an issue\./.test(st.became) && /See how they are connected/.test(st.became) && /same record every other product reads/.test(st.became) && /^The demonstration runs on synthetic data: every person, room and device in it is invented\./.test(st.synthetic) && st.links[0] === '/products/search-party' && st.links[1] === sp.demo && /#\/search$/.test(st.links[1]), JSON.stringify(st.links));
  ok('WS-approach', 'the approach is three short lines, in the directive\'s words, stated as the company\'s approach and not as a quotation', st.approach.join('|') === APPROACH.join('|') && !/[“”"]/.test(st.approach.join('')) && /how Empathia approaches a product/.test(st.ours), st.approach.join(' | '));
  const banned = [/\bemployer/i, /\bmanager/i, /\bcustomer/i, /\bclient/i, /\bsponsor/i, /\bendors/i, /\btestimonial/i, /\bformer(ly)?\b/i, /\bworked (at|for)\b/i, /\b(inc|llc|ltd|corp)\b\.?/i, /\b(best|leading|revolutionary|world-class|unique|groundbreaking|award)\b/i, /\d/];
  ok('WS-plain', 'outside his own words the story names no employer, manager, customer or site, claims no endorsement, uses no superlative and gives no date or number; only the three credentials appear on the page', !banned.some((re) => re.test(st.ours)) && st.creds.join() === 'CTS,CAPM,Network+', banned.filter((re) => re.test(st.ours)).map(String).join(' ') + ' ' + (st.ours.match(/\d[^\n]{0,30}/) || [''])[0]);
  const others = pages.filter((p) => p.startsWith('/products/') && p !== '/products/search-party').filter((p) => /data-sp-origin/.test(fs.readFileSync(path.join(dist, p, 'index.html'), 'utf8')));
  ok('WS-product', 'the Search Party product page (and no other product page) carries the short version: two sentences, his phrase in quotation marks, and a link to /founder#search-party-story', sp.sentences === 2 && sp.origin.includes('“a simple contacts-list request”') && sp.link === '/founder#search-party-story' && !others.length, JSON.stringify({ n: sp.sentences, link: sp.link, others }));
  await page.goto(base + '/founder#search-party-story', { waitUntil: 'load' }); await page.waitForTimeout(250);
  const anchorTop = await page.evaluate(() => document.getElementById('search-party-story').getBoundingClientRect().top);
  ok('WS-anchor', 'the link /founder#search-party-story opens the page at the story', anchorTop >= -2 && anchorTop < 200, String(anchorTop));
  ok('WS-clean', 'no page error, no console error and no request outside the site on the founder page and the Search Party page', !errs.length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | ')); await ctx.close();
  for (const w of [1440, 768, 390, 320]) {
    const c = await newCtx({ viewport: { width: w, height: 844 }, reducedMotion: 'reduce' }); const p = await c.newPage(); await p.goto(base + '/founder'); await p.waitForTimeout(150);
    const m = await p.evaluate(() => { const vw = document.documentElement.clientWidth; const wide = [...document.querySelectorAll('[data-founder=founder] *, [data-origin] *')].filter((e) => { if ((e.closest('svg') && e.tagName !== 'svg') || e.matches('.reveal__glow')) return false;   // the glow is clipped by the plate; SVG children are positioned by the drawing
        const b = e.getBoundingClientRect(); return b.width && (b.right > vw + 0.5 || b.left < -0.5); }).map((e) => (e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className) || e.tagName);
      const short = [...document.querySelectorAll('[data-origin] .btn')].filter((e) => e.getBoundingClientRect().height < 43.5).map((e) => e.textContent.trim().slice(0, 24)); const plate = document.querySelector('.reveal__plate').getBoundingClientRect(); const img = document.querySelector('.reveal .portrait img').getBoundingClientRect();
      return { over: document.documentElement.scrollWidth - vw, wide: wide.slice(0, 5), short, plateIn: plate.left >= 0 && plate.right <= vw, square: Math.abs(img.width - img.height) <= 1, imgInPlate: img.left >= plate.left && img.right <= plate.right && img.top >= plate.top && img.bottom <= plate.bottom, share: +(img.width * img.height / (plate.width * plate.height)).toFixed(2) }; });
    ok(`WS-width-${w}`, `the founder page at ${w} px: no sideways scroll, nothing past the edge, buttons at least 44 px tall; the photograph is whole, square and inside its plate, and is most of it`, m.over <= 0 && !m.wide.length && !m.short.length && m.plateIn && m.square && m.imgInPlate && m.share >= 0.6, JSON.stringify(m)); await c.close();
  }

  // -- the ten-second introduction --
  const boxes = () => { const at = (e) => { let x = 0, y = 0; for (let n = e; n; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return [x, y]; }; return ['.reveal__plate', '.reveal .portrait img', '.founder__name', '[data-founder-bio]', '.creds', '.philosophy', '.founder__ctas', '.reveal__bar', '#search-party-story'].map((s) => { const e = document.querySelector(s); return [s, e.offsetWidth, e.offsetHeight, ...at(e)].join(':'); }).join(' '); };   // layout boxes (offsets), which a transform does not change
  const init = () => { window.__fr = { log: [], cls: 0 }; const rec = () => window.__fr.log.push([document.documentElement.getAttribute('data-fr') || 'rest', performance.now()]); new MutationObserver(rec).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-fr'] }); try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__fr.cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch { window.__fr.cls = -1; } };
  const seek = (ms) => { for (const a of document.getAnimations()) if (String(a.animationName).startsWith('rv-')) a.currentTime = ms; };   // the introduction's own animations only (the page also has scroll-driven ones)
  const probe = () => { const q = (s) => document.querySelector(s); const cs = (s, pe) => getComputedStyle(q(s), pe); const m = (s) => new DOMMatrix(cs(s).transform);
    return { photo: (({ a, b, c, d, f }) => ({ a, b, c, d, f: +f.toFixed(1) }))(m('.reveal__photo')), img: cs('.reveal .portrait img').transform, light: +(m('.reveal__shade i').e / q('.reveal__shade i').offsetWidth).toFixed(3), line: +m('.rv-line.rv-d1:not(.rv-line--halo)').a.toFixed(2), line4: +m('.rv-line.rv-d4:not(.rv-line--halo)').a.toFixed(2), node1: +(+cs('.rv-n1').opacity).toFixed(2), node4: +(+cs('.rv-n4').opacity).toFixed(2), name: +(+cs('.founder__name').opacity).toFixed(2), cred3: +(+cs('.creds li:nth-child(3)').opacity).toFixed(2), bio: cs('[data-founder-bio]').opacity, quote: cs('.philosophy').opacity, cta: cs('.founder__ctas').opacity, dust: +(+cs('.rv-dust--far').opacity).toFixed(2) }; };
  const ui = () => { const c = document.querySelector('[data-reveal-ctl]'); const t = c.querySelector('[data-reveal-toggle]'); const r = c.querySelector('[data-reveal-replay]'); const vis = (e) => !e.hidden && !c.hidden && e.getBoundingClientRect().height > 0; return { state: document.documentElement.getAttribute('data-fr') || 'rest', ctl: !c.hidden, toggle: vis(t), toggleName: t.textContent, replay: vis(r), replayName: r.textContent, h: [t, r].filter(vis).map((e) => Math.round(e.getBoundingClientRect().height)), anims: document.getAnimations().filter((a) => String(a.animationName).startsWith('rv-')).length, styled: document.querySelectorAll('[style]').length, played: (() => { try { return sessionStorage.getItem('empathia.founderReveal'); } catch { return 'x'; } })() }; };

  // without script: the resting composition, no controls, nothing moving
  const c0 = await newCtx({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false }); const p0 = await c0.newPage(); await p0.goto(base + '/founder', { waitUntil: 'load' }); await p0.waitForTimeout(400);
  const restShot = await p0.locator('.reveal__plate').screenshot(); const heroRest = await p0.locator('.hero--founder').screenshot(); await c0.close();
  // reduced motion: the same composition, no controls that do nothing, nothing recorded as played
  const c1 = await newCtx({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const p1 = await c1.newPage(); await p1.addInitScript(init); await p1.goto(base + '/founder', { waitUntil: 'load' }); await p1.waitForTimeout(700);
  const rm = await p1.evaluate(ui); const rmLog = await p1.evaluate(() => window.__fr.log.length); const rmShot = await p1.locator('.reveal__plate').screenshot(); const rmHero = await p1.locator('.hero--founder').screenshot(); const restBoxes = await p1.evaluate(boxes); await c1.close();
  ok('WR-reduced-motion', 'with reduced motion: no animation, the resting composition (the plate pixel for pixel the page without script), no controls shown, and the session is not marked as played', rm.state === 'rest' && rmLog === 0 && rm.anims === 0 && !rm.ctl && !rm.toggle && !rm.replay && rm.played === null && Buffer.compare(rmShot, restShot) === 0 && rmHero.length > 0 && heroRest.length > 0,   /* 11 Nov: the whole-hero screenshots are no longer compared byte for byte. Measured: two captures of the same resting hero in two browser contexts differ by up to 25/255 on the edges of the plate's thin diagonal lines (1,757 pixels in a 348×76 region), which is rasterisation, not content. The plate itself is still compared pixel for pixel here, and every box of the hero by position in WR-no-shift. */ JSON.stringify({ ...rm, log: rmLog, plateSame: Buffer.compare(rmShot, restShot) === 0, heroSame: Buffer.compare(rmHero, heroRest) === 0 }));

  // the full sequence, in real time, once
  const c2 = await newCtx({ viewport: { width: 1440, height: 900 } }); await c2.route('https://tally.so/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' }));
  const p2 = await c2.newPage(); const e2 = []; const x2 = []; watch(p2, e2, x2); await p2.addInitScript(init); await p2.goto(base + '/founder', { waitUntil: 'domcontentloaded' });
  await p2.waitForFunction(() => document.documentElement.getAttribute('data-fr') === 'run', null, { timeout: 5000 }).catch(() => {});
  const first = await p2.evaluate(() => window.__fr.log.map((x) => x[0]).join()); const startUi = await p2.evaluate(ui); const startBoxes = await p2.evaluate(boxes);
  // frames by the animations' own clock: the order of the sequence, and the photograph never scaled, skewed or rotated in any of them
  await p2.evaluate(() => { for (const a of document.getAnimations()) if (String(a.animationName).startsWith('rv-')) a.pause(); });
  const frames = {}; for (const t of [0, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9.9]) { await p2.evaluate(seek, t * 1000); frames[t] = await p2.evaluate(probe); }
  const pure = Object.values(frames).every((f) => f.photo.a === 1 && f.photo.d === 1 && f.photo.b === 0 && f.photo.c === 0 && f.img === 'none' && f.bio === '1' && f.quote === '1' && f.cta === '1');
  ok('WR-photo', 'in every sampled frame (0 to 9.9 s) the photograph is the same picture at the same size: its frame only rides a few pixels (no scale, skew or rotation), the image itself is never transformed, and the overview, the quotation and the links stay fully visible', pure && frames[0].photo.f > 0 && frames[0].photo.f <= 8 && frames[9.9].photo.f === 0, JSON.stringify(Object.fromEntries(Object.entries(frames).map(([t, f]) => [t, f.photo.f]))));
  ok('WR-order', 'the sequence runs in its order: darkness (the light has not moved at 0.5 s), the key light crosses the photograph (under way at 2 s, across by 4 s), the lines draw towards the four words (none at 3 s, all by 5 s), the words appear (none at 4 s, all by 6 s), the name and the credentials set in (hidden at 3 s, name by 5 s, credentials by 7 s), and the dust is gone by the end',
    frames[0].light === 0 && frames[0.5].light === 0 && frames[2].light > 0.05 && frames[2].light < 0.45 && frames[3].light > frames[2].light && frames[4].light >= 0.58 && frames[3].line === 0 && frames[5].line === 1 && frames[5].line4 === 1 && frames[4].node1 === 0 && frames[6].node1 === 1 && frames[6].node4 === 1 && frames[3].name === 0 && frames[5].name === 1 && frames[5].cred3 < 1 && frames[7].cred3 === 1 && frames[2].dust > 0.5 && frames[9.9].dust === 0, JSON.stringify(frames));
  // let it play out for real from the start, measuring its length and any layout shift
  await p2.evaluate(() => { for (const a of document.getAnimations()) if (String(a.animationName).startsWith('rv-')) { a.currentTime = 0; a.play(); } window.__fr.t0 = performance.now(); });
  await p2.waitForTimeout(1200); const midUi = await p2.evaluate(ui);
  // a link inside the hero is clickable while it plays, and scrolling is not held
  const hit = await p2.evaluate(() => { const a = document.querySelector('[data-founder=founder] a[data-enquiry=founder]'); a.scrollIntoView({ block: 'center' }); const b = a.getBoundingClientRect(); const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return a === top || a.contains(top); });
  const [popup] = await Promise.all([p2.waitForEvent('popup', { timeout: 4000 }).catch(() => null), p2.click('[data-founder=founder] a[data-enquiry=founder]')]); if (popup) await popup.close();
  const y0 = await p2.evaluate(() => scrollY); await p2.mouse.wheel(0, 500); await p2.waitForTimeout(200); const scrolled = (await p2.evaluate(() => scrollY)) - y0; await p2.keyboard.press('Escape'); await p2.waitForTimeout(100); const afterKeys = await p2.evaluate(() => document.documentElement.getAttribute('data-fr')); await p2.evaluate(() => scrollTo(0, 0));
  ok('WR-links', 'while the sequence plays a link in the hero is the element under the pointer and a real click on it opens its page; the wheel scrolls the page; Escape and scrolling leave the sequence running', hit && !!popup && popup.url().startsWith(`${TALLY}?source=founder`) && scrolled >= 400 && afterKeys === 'run', JSON.stringify({ hit, popup: popup?.url(), scrolled, afterKeys }));
  await p2.waitForFunction(() => !document.documentElement.hasAttribute('data-fr'), null, { timeout: 15000 }).catch(() => {});
  const end = await p2.evaluate(() => ({ ms: (window.__fr.log.findLast((x) => x[0] === 'rest') || [0, 0])[1] - window.__fr.t0, cls: window.__fr.cls, log: window.__fr.log.map((x) => x[0]) })); const endUi = await p2.evaluate(ui); const endBoxes = await p2.evaluate(boxes); await p2.waitForTimeout(150); const endShot = await p2.locator('.reveal__plate').screenshot();
  ok('WR-start', 'the first paint is already the opening frame (armed in <head>), and the sequence starts by itself once the plate is in view, marking the session; Pause and Replay are real buttons with names, at least 44 px tall', first === 'armed,run' && startUi.state === 'run' && startUi.played === '1' && midUi.ctl && midUi.toggle && midUi.replay && /^Pause the introduction$/.test(midUi.toggleName) && /^Replay the introduction$/.test(midUi.replayName) && midUi.h.every((h) => h >= 44) && midUi.anims > 20, JSON.stringify({ first, startUi, midUi }));
  ok('WR-ten-seconds', 'the sequence lasts ten seconds (9.6 to 10.6 s measured) and then settles to the resting composition by itself: no attribute, no animation left, only Replay offered', end.ms >= 9600 && end.ms <= 10600 && endUi.state === 'rest' && endUi.anims === 0 && endUi.replay && !endUi.toggle, JSON.stringify({ ms: Math.round(end.ms), endUi }));
  ok('WR-no-shift', 'nothing on the page moves: the layout-shift total over the whole sequence is 0, and the plate, the photograph, the name, the overview, the credentials, the quotation, the links, the control bar and the story below have the same boxes at the start, at the end, and on the page without motion', end.cls === 0 && startBoxes === endBoxes && endBoxes === restBoxes, JSON.stringify({ cls: end.cls, startBoxes, endBoxes, restBoxes }));
  ok('WR-rest', 'after the sequence the plate is, pixel for pixel, the plate of the page without script', Buffer.compare(endShot, restShot) === 0, `${endShot.length} vs ${restShot.length} bytes`);
  // replay, then pause: a paused sequence does not move (two screenshots 500 ms apart are identical), and Play carries on from there
  await p2.click('[data-reveal-replay]'); await p2.waitForTimeout(1500); const re = await p2.evaluate(ui); const reT = await p2.evaluate(() => document.getAnimations().find((a) => a.animationName === 'rv-clock')?.currentTime ?? -1);
  await p2.click('[data-reveal-toggle]'); await p2.mouse.move(2, 2); await p2.waitForTimeout(600); await p2.locator('.hero--founder').screenshot(); /* 11 Nov, was a fixed 120 ms with the pointer left on the button. Measured (four frames, half a second apart, and document.getAnimations()): the introduction was frozen in every frame; the only pixels that changed, once, were the 58×44 of the button under the pointer, losing its hover colour when the first screenshot scrolled the page. The pointer is now moved off, the buttons' own colour transitions are given time to end, and one screenshot is taken and thrown away so that any scrolling has happened before the two that are compared. */ const pa = await p2.evaluate(ui); const s1 = await p2.locator('.hero--founder').screenshot(); const t1 = await p2.evaluate(() => document.getAnimations().find((a) => a.animationName === 'rv-clock').currentTime); await p2.waitForTimeout(500); const s2 = await p2.locator('.hero--founder').screenshot(); const t2 = await p2.evaluate(() => document.getAnimations().find((a) => a.animationName === 'rv-clock').currentTime);
  await p2.focus('[data-reveal-toggle]'); await p2.keyboard.press('Enter'); await p2.waitForTimeout(400); const pl = await p2.evaluate(ui); const t3 = await p2.evaluate(() => document.getAnimations().find((a) => a.animationName === 'rv-clock').currentTime);
  ok('WR-replay', 'Replay starts the sequence again from its beginning', re.state === 'run' && reT > 800 && reT < 2600 && re.toggle, JSON.stringify({ re, reT }));
  ok('WR-pause', 'Pause freezes it (the clock stands still and two screenshots half a second apart are identical) and the button becomes Play; Play, from the keyboard, carries on from the same moment', pa.state === 'paused' && /^Play the introduction$/.test(pa.toggleName) && t1 === t2 && Buffer.compare(s1, s2) === 0 && pl.state === 'run' && /^Pause/.test(pl.toggleName) && t3 > t2 && t3 < t2 + 1500, JSON.stringify({ pa: pa.state, t1, t2, t3, same: Buffer.compare(s1, s2) === 0 }));
  // once per session: a reload in the same tab rests; a new session plays again
  await p2.reload({ waitUntil: 'load' }); await p2.waitForTimeout(700); const again = await p2.evaluate(ui); const againLog = await p2.evaluate(() => window.__fr.log.length);
  const c3 = await newCtx({ viewport: { width: 1440, height: 900 } }); const p3 = await c3.newPage(); await p3.goto(base + '/founder#search-party-story', { waitUntil: 'load' }); await p3.waitForTimeout(900); const below = await p3.evaluate(ui);
  await p3.evaluate(() => scrollTo(0, 0)); await p3.waitForFunction(() => document.documentElement.getAttribute('data-fr') === 'run', null, { timeout: 5000 }).catch(() => {}); const seen = await p3.evaluate(ui); await c3.close();
  ok('WR-once', 'it plays once per session: a reload in the same tab shows the resting composition with Replay and starts nothing; a new session arriving below the hero holds the opening frame, unplayed, and starts only when the plate comes into view', again.state === 'rest' && againLog === 0 && again.replay && !again.toggle && again.anims === 0 && below.state === 'armed' && below.played === null && !below.ctl && seen.state === 'run' && seen.played === '1', JSON.stringify({ again, below: below.state, seen: seen.state }));
  ok('WR-clean', 'no page error, no console error, no request outside the site, no inline style anywhere on the page; the script is the founder page\'s only (no other page loads it) and is under 4 KB; the introduction has no audio or video element', !e2.length && !x2.length && endUi.styled === 0 && pages.filter((p) => p !== '/founder').every((p) => !/founder\.js/.test(fs.readFileSync(path.join(dist, p === '/' ? '' : p, 'index.html'), 'utf8'))) && /<script src="\/founder\.js"><\/script>/.test(fs.readFileSync(path.join(dist, 'founder/index.html'), 'utf8')) && fs.statSync(path.join(dist, 'founder.js')).size <= 4096 && !/<(audio|video)\b/.test(fs.readFileSync(path.join(dist, 'founder/index.html'), 'utf8')), [...e2, ...x2].slice(0, 3).join(' | ') + ` styled ${endUi.styled}`);
  await c2.close();
  // the plate's drawing comes from the same four words, and its line lengths are what the stylesheet's two distances say
  const c4 = await newCtx({ viewport: { width: 390, height: 844 } }); const p4 = await c4.newPage(); await p4.addInitScript(init); await p4.goto(base + '/founder', { waitUntil: 'load' }); await p4.waitForFunction(() => document.documentElement.getAttribute('data-fr') === 'run', null, { timeout: 5000 }).catch(() => {});
  const ph0 = await p4.evaluate(boxes); const geo = await p4.evaluate(() => { const tr = (g) => (g.getAttribute('transform').match(/translate\(([\d.]+) ([\d.]+)\)/) || []).slice(1).map(Number); const nodes = [...document.querySelectorAll('.rv-node')].map((n) => ({ name: n.querySelector('text').textContent, id: n.dataset.layer, at: tr(n.parentElement) })); const lines = [...document.querySelectorAll('.rv-links > g')].map((g) => ({ from: tr(g), len: +g.querySelector('.rv-line:not(.rv-line--halo)').getAttribute('x2') })); return { nodes, lines, sr: document.querySelector('.reveal > .sr').textContent, hidden: document.querySelector('.reveal__fx').getAttribute('aria-hidden'), alt: document.querySelector('.reveal .portrait img').alt }; });
  const css = fs.readFileSync(path.join(dist, 'site.css'), 'utf8'); const lens = geo.lines.map((l, i) => +Math.hypot(geo.nodes[i].at[0] - l.from[0], geo.nodes[i].at[1] - l.from[1]).toFixed(2));
  ok('WR-motif', 'the lines run from the photograph\'s lower edge to the four words (People, Process, Technology, Communication, the same four as the story\'s drawing); each line\'s length is the distance to its word and matches the stylesheet; the drawing is hidden from assistive technology, the words are given as text, and the photograph keeps its name-only alternative text', geo.nodes.map((n) => n.name).join() === FOUR.join() && geo.lines.length === 4 && geo.lines.every((l, i) => Math.abs(l.len - lens[i]) < 0.02 && css.includes(`translateX(${l.len}px)`)) && FOUR.every((w) => geo.sr.includes(w)) && geo.hidden === 'true' && geo.alt === 'Jeremiah Johnson, founder of Empathia Technologies', JSON.stringify({ lens, lines: geo.lines.map((l) => l.len) }));
  await p4.evaluate(() => { for (const a of document.getAnimations()) if (String(a.animationName).startsWith('rv-')) a.currentTime = 9800; }); await p4.waitForFunction(() => !document.documentElement.hasAttribute('data-fr'), null, { timeout: 5000 }).catch(() => {}); const ph1 = await p4.evaluate(boxes); const phEnd = await p4.evaluate(() => ({ cls: window.__fr.cls, over: document.documentElement.scrollWidth - document.documentElement.clientWidth })); const phUi = await p4.evaluate(ui); await c4.close();
  ok('WR-phone', 'on a phone (390 px) the sequence runs and settles with no layout shift, no sideways scroll, the same boxes before and after, and a Replay button at least 44 px tall', phEnd.cls === 0 && phEnd.over <= 0 && ph0 === ph1 && phUi.state === 'rest' && phUi.replay && phUi.h.every((h) => h >= 44), JSON.stringify({ phEnd, phUi, same: ph0 === ph1 }));
}

// ---- budgets (approved image-performance and weight budgets) ----
{
  const m = JSON.parse(fs.readFileSync(path.join(dist, 'BUILD_MANIFEST.json'), 'utf8')).files; const sum = (re) => Object.entries(m).filter(([f]) => re.test(f)).reduce((a, [, v]) => a + v.bytes, 0);
  const pre = (fs.readFileSync(path.join(dist, 'index.html'), 'utf8').match(/rel="preload" href="\/fonts\/([^"]+)"/g) || []).map((x) => x.match(/fonts\/([^"]+)/)[1]);
  const b = { home: m['index.html'].bytes, js: m['site.js'].bytes, theme: m['theme-init.js'].bytes, faces: pre.length, fonts: pre.reduce((a, f) => a + (m[`fonts/${f}`]?.bytes || 1e9), 0), captures: sum(/^media\/product\//), maxCapture: Math.max(0, ...Object.entries(m).filter(([f]) => /^media\/product\//.test(f)).map(([, v]) => v.bytes)) };
  ok('W-budgets', 'home ≤ 48 KB, site.js ≤ 8 KB, theme-init.js ≤ 512 B, three preloaded Inter faces ≤ 88 KB (D38), captures ≤ 1.4 MB and each ≤ 80 KB', b.home <= 48 * 1024 && b.js <= 8192 && b.theme <= 512 && b.faces === 3 && b.fonts <= 88 * 1024 && b.captures <= 1400 * 1024 && b.maxCapture <= 80 * 1024, JSON.stringify(b));
}

await browser.close(); srv.kill();
// CHANGED 2026-11-10: a check can now be NOT_RUN (the film's playback, in a browser without an H.264 decoder). It is counted apart and
// printed apart, never as a pass: before, `pass` was every result that had not failed.
const notRun = results.filter((x) => x.result === 'NOT_RUN').length;
const summary = { at: new Date().toISOString(), scheme, pass: results.length - failed - notRun, fail: failed, notRun, tests: results.length, results };
fs.writeFileSync(path.join(out, 'website.json'), JSON.stringify(summary, null, 1));
console.log(`\n${summary.pass} passed, ${summary.fail} failed${notRun ? `, ${notRun} not run` : ''} (${scheme})`); process.exit(failed ? 1 : 0);
