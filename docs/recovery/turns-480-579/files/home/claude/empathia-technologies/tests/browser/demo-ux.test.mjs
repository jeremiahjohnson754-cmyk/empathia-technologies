#!/usr/bin/env node
// Release-candidate UX regressions found in the final review (2026-10-31): the investor demo at 360, 768 and 1440 px.
//   UX-01 a Search Party result keeps its name readable (no one-letter-per-line wrap) on a narrow phone
//   UX-02 the search box and the type filter wrap instead of squeezing each other
//   UX-03 APEX "Incidents without a case" rows wrap their action instead of squeezing the card
//   UX-04 the product rail starts with "Investor start" and every rail link opens a native page or says plainly where the area runs
//   UX-05 a boundary page (Commissioning) has a sentence-case heading and links to the native pages that run the same engine
//   UX-06 status tags, tab counters and tour dots are at least 12 px
//   node tests/browser/demo-ux.test.mjs [dist] [evidence-dir]
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const out = path.resolve(process.argv[3] || path.join(repo, 'tests/evidence/demo')); fs.mkdirSync(out, { recursive: true });
const PORT = 4395; const results = []; let failed = 0;
const ok = (id, name, cond, detail = '') => { results.push({ id, name, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name}${cond ? '' : ' — ' + String(detail).slice(0, 300)}`); };
const srv = spawn(process.execPath, [path.join(repo, 'apps/demo/server/serve.mjs'), `--port=${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', () => r()); srv.stderr.on('data', () => r()); setTimeout(r, 2500); });
const base = `http://127.0.0.1:${PORT}/`;
const browser = await chromium.launch();
try {
  for (const [w, h, tag] of [[360, 780, 'phone'], [768, 1024, 'tablet'], [1440, 900, 'desktop']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(base + '#/search'); await page.waitForSelector('#spd-q'); await page.fill('#spd-q', 'switch'); await page.waitForTimeout(300);
    const sp = await page.evaluate(() => {
      const names = Array.from(document.querySelectorAll('.sp__list li a > b')).map((b) => { const r = b.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(b).lineHeight) || 20; return { t: b.textContent, lines: Math.round(r.height / lh), w: Math.round(r.width) }; });
      const q = document.getElementById('spd-q').getBoundingClientRect(); const sel = document.querySelector('.sp__search select'); const s = sel ? sel.getBoundingClientRect() : null;
      return { names, over: document.documentElement.scrollWidth - innerWidth, qw: Math.round(q.width), sw: s ? Math.round(s.width) : 0, overlap: s ? (s.left < q.right - 1 && s.top < q.bottom - 1 && q.top < s.bottom - 1) : false };
    });
    const worst = sp.names.reduce((m, n) => Math.max(m, n.lines - Math.ceil(n.t.length / 24)), 0);
    ok(`UX-01-${tag}`, 'a Search Party result name stays readable: no more lines than its length needs (no one-letter-per-line wrap)', sp.names.length > 0 && worst <= 1 && sp.over <= 0, JSON.stringify(sp.names.slice(0, 3)));
    ok(`UX-02-${tag}`, 'the search box and the type filter do not overlap and each keeps a usable width', !sp.overlap && sp.qw >= 140 && sp.sw >= 140, JSON.stringify({ qw: sp.qw, sw: sp.sw, overlap: sp.overlap }));
    await page.goto(base + '#/v25/apex'); await page.waitForTimeout(400);
    const ap = await page.evaluate(() => Array.from(document.querySelectorAll('.svc__list li > span:first-child')).map((s) => Math.round(s.getBoundingClientRect().width)));
    ok(`UX-03-${tag}`, 'APEX incident rows keep each card at least 200 px wide (the action wraps below on a phone)', ap.length > 0 && ap.every((x) => x >= 200), JSON.stringify(ap));
    const rail = await page.evaluate(() => Array.from(document.querySelectorAll('.shell__rail a')).map((a) => ({ t: a.textContent.trim(), href: a.getAttribute('href') })));
    ok(`UX-04a-${tag}`, 'the product rail starts with "Investor start"', rail.length > 0 && /Investor start/.test(rail[0].t), JSON.stringify(rail.map((r) => r.t)));
    const boundary = [];
    for (const r of rail) { await page.goto(base + r.href); await page.waitForTimeout(250); const b = await page.evaluate(() => ({ boundary: !!document.querySelector('.boundary'), native: document.querySelectorAll('[data-testid=boundary-native] a').length, h1: (document.querySelector('h1') || {}).textContent || '' })); if (b.boundary) boundary.push({ ...r, ...b }); }
    ok(`UX-04b-${tag}`, 'every rail link opens a native page, except an area still being migrated, which says so and links to where it runs natively', boundary.every((b) => b.native >= 1), JSON.stringify(boundary));
    await page.goto(base + '#/suite/commission'); await page.waitForTimeout(250);
    const cx = await page.evaluate(() => ({ h1: (document.querySelector('h1') || {}).textContent || '', links: Array.from(document.querySelectorAll('[data-testid=boundary-native] a')).map((a) => a.getAttribute('href')) }));
    let nativeOk = cx.links.length >= 2; for (const l of cx.links) { await page.goto(base + l); await page.waitForTimeout(250); if (await page.locator('.boundary').count()) nativeOk = false; }
    ok(`UX-05-${tag}`, 'the Commissioning boundary page has a sentence-case heading and links only to native pages that run the same engine', /^[A-Z]/.test(cx.h1.trim()) && nativeOk, JSON.stringify(cx));
    await page.goto(base + '#/tours/investor'); await page.waitForTimeout(400);
    const small = await page.evaluate(() => Array.from(document.querySelectorAll('.ui-tag, .ui-tab__count, .tour__dot')).filter((e) => e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => e.className + ' ' + getComputedStyle(e).fontSize));
    ok(`UX-06-${tag}`, 'status tags, tab counters and tour dots are at least 12 px', small.length === 0, small.slice(0, 4).join(' | '));
    ok(`UX-07-${tag}`, 'no page error across these pages', !errs.length, errs.slice(0, 3).join(' | '));
    if (tag === 'phone') await page.goto(base + '#/search').then(() => page.fill('#spd-q', 'switch')).then(() => page.waitForTimeout(300)).then(() => page.screenshot({ path: path.join(out, 'ux-search-phone.png') }));
    await ctx.close();
  }
} finally { await browser.close(); srv.kill(); }
fs.writeFileSync(path.join(out, 'demo-ux.json'), JSON.stringify({ at: new Date().toISOString(), pass: results.length - failed, fail: failed, tests: results.length, results }, null, 1));
console.log(`\n${results.length - failed} passed, ${failed} failed`); process.exit(failed ? 1 : 0);
