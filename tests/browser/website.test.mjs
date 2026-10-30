#!/usr/bin/env node
// The public site, served by its own server from the built dist: every page answers, has a title and description, renders without
// console errors or outside requests, has no sideways scroll at 390 px, the menu works by keyboard, every internal link resolves, the
// forms state plainly that no lead endpoint is configured (none is, in this test), and no page makes a claim the owner forbade.
//   node tests/browser/website.test.mjs [dist] [evidence-dir]
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const dist = path.resolve(process.argv[2] || path.join(repo, 'apps/website/dist')); const out = path.resolve(process.argv[3] || path.join(repo, 'tests/evidence/website')); fs.mkdirSync(out, { recursive: true });
const PORT = 4397; const results = []; let failed = 0;
const ok = (id, name, cond, detail = '') => { results.push({ id, name, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name}${cond ? '' : ' — ' + String(detail).slice(0, 300)}`); };
const srv = spawn(process.execPath, [path.join(repo, 'apps/website/server/serve.mjs'), `--port=${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', () => r()); srv.stderr.on('data', () => r()); setTimeout(r, 2500); });
const base = `http://127.0.0.1:${PORT}`;
const pages = (fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8').match(/<loc>[^<]*<\/loc>/g) || []).map((l) => l.replace(/<\/?loc>/g, '').replace(/^https?:\/\/[^/]+/, '') || '/');
ok('W-00', 'the sitemap lists the pages', pages.length >= 10, pages.join(' '));
const FORBIDDEN = [/\b(aon|kraft heinz|stefanini|khc)\b/i, /SOC ?2 (certified|compliant)/i, /ISO ?27001 (certified|compliant)/i, /\b(award|awards)\b/i, /\btestimonial/i, /\bcustomers? (include|such as|like)\b/i, /\b\d+% (reduction|increase|roi)\b/i, /guaranteed/i, /production[- ]ready/i, /\bpartnered with\b/i];
const browser = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage(); const errs = []; const ext = [];
  page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); page.on('request', (r) => { if (!r.url().startsWith(base)) ext.push(r.url()); });
  const links = new Set();
  for (const p of pages) {
    const r = await page.goto(base + p, { waitUntil: 'load' }); await page.waitForTimeout(150);
    const info = await page.evaluate(() => ({ title: document.title, desc: (document.querySelector('meta[name=description]') || {}).content || '', h1: (document.querySelector('h1') || {}).textContent || '', over: document.documentElement.scrollWidth - document.documentElement.clientWidth, text: document.body.innerText, links: Array.from(document.querySelectorAll('a[href^="/"]')).map((a) => a.getAttribute('href')) }));
    info.links.forEach((l) => links.add(l.split('#')[0]));
    ok(`W-${tag}-${p}`, `${p} answers with a title, a description, one h1 and no sideways scroll`, r.status() === 200 && info.title.length > 8 && info.desc.length > 20 && info.h1.length > 3 && info.over <= 0, JSON.stringify({ status: r.status(), over: info.over, h1: info.h1 }));
    const bad = FORBIDDEN.filter((re) => re.test(info.text)); if (bad.length) ok(`W-claims-${p}`, `${p} makes no forbidden claim`, false, bad.map(String).join(' '));
    if (tag === 'desktop') await page.screenshot({ path: path.join(out, `${tag}-${p.replace(/[^a-z-]/g, '') || 'home'}.png`) });
  }
  ok(`W-${tag}-links`, 'every internal link on the site resolves to a listed page or a section of one', [...links].every((l) => pages.includes(l.replace(/\/$/, '') || '/')), [...links].filter((l) => !pages.includes(l.replace(/\/$/, '') || '/')).join(' '));
  if (tag === 'phone') {
    await page.goto(base + '/'); await page.waitForTimeout(150);
    const before = await page.evaluate(() => getComputedStyle(document.getElementById('nav')).display);
    await page.focus('[data-menu]'); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
    const after = await page.evaluate(() => ({ d: getComputedStyle(document.getElementById('nav')).display, exp: document.querySelector('[data-menu]').getAttribute('aria-expanded') }));
    await page.keyboard.press('Escape'); await page.waitForTimeout(100); const closed = await page.evaluate(() => getComputedStyle(document.getElementById('nav')).display);
    ok('W-phone-menu', 'the phone menu opens by keyboard, reports aria-expanded, and closes on Escape', before === 'none' && after.d !== 'none' && after.exp === 'true' && closed === 'none', JSON.stringify({ before, after, closed }));
    await page.screenshot({ path: path.join(out, 'phone-home.png') });
  }
  await page.goto(base + '/request-demo'); await page.waitForTimeout(150);
  const form = await page.evaluate(() => ({ status: (document.querySelector('[data-status]') || {}).textContent || '', disabled: !!(document.querySelector('form[data-lead] button[type=submit]') || {}).disabled, required: document.querySelectorAll('form[data-lead] [required]').length }));
  ok(`W-${tag}-form`, 'without a configured lead endpoint the form says so and does not pretend to send', /not configured/.test(form.status) && form.disabled && form.required >= 5, JSON.stringify(form));
  ok(`W-${tag}-clean`, 'no page error, no console error, no request outside the site', !errs.length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
  await ctx.close();
}
await browser.close(); srv.kill();
const summary = { at: new Date().toISOString(), pass: results.length - failed, fail: failed, tests: results.length, results };
fs.writeFileSync(path.join(out, 'website.json'), JSON.stringify(summary, null, 1));
console.log(`\n${summary.pass} passed, ${summary.fail} failed`); process.exit(failed ? 1 : 0);
