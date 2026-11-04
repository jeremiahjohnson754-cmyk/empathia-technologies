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

// ---- budgets (approved image-performance and weight budgets) ----
{
  const m = JSON.parse(fs.readFileSync(path.join(dist, 'BUILD_MANIFEST.json'), 'utf8')).files; const sum = (re) => Object.entries(m).filter(([f]) => re.test(f)).reduce((a, [, v]) => a + v.bytes, 0);
  const pre = (fs.readFileSync(path.join(dist, 'index.html'), 'utf8').match(/rel="preload" href="\/fonts\/([^"]+)"/g) || []).map((x) => x.match(/fonts\/([^"]+)/)[1]);
  const b = { home: m['index.html'].bytes, js: m['site.js'].bytes, theme: m['theme-init.js'].bytes, faces: pre.length, fonts: pre.reduce((a, f) => a + (m[`fonts/${f}`]?.bytes || 1e9), 0), captures: sum(/^media\/product\//), maxCapture: Math.max(0, ...Object.entries(m).filter(([f]) => /^media\/product\//.test(f)).map(([, v]) => v.bytes)) };
  ok('W-budgets', 'home ≤ 48 KB, site.js ≤ 8 KB, theme-init.js ≤ 512 B, three preloaded Inter faces ≤ 88 KB (D38), captures ≤ 1.4 MB and each ≤ 80 KB', b.home <= 48 * 1024 && b.js <= 8192 && b.theme <= 512 && b.faces === 3 && b.fonts <= 88 * 1024 && b.captures <= 1400 * 1024 && b.maxCapture <= 80 * 1024, JSON.stringify(b));
}

await browser.close(); srv.kill();
const summary = { at: new Date().toISOString(), scheme, pass: results.length - failed, fail: failed, tests: results.length, results };
fs.writeFileSync(path.join(out, 'website.json'), JSON.stringify(summary, null, 1));
console.log(`\n${summary.pass} passed, ${summary.fail} failed (${scheme})`); process.exit(failed ? 1 : 0);
