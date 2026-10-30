#!/usr/bin/env node
// P0 baseline: run the original demonstrators in a browser, measure load, screenshot the key routes, record console errors.
//   node scripts/legacy/baseline-run.mjs <out dir> <label=file-or-url> ... [--routes=#/a,#/b] [--role=architect]
// A file: URL opens as the file; an http URL (the Founder Studio served by its own server) opens as given. Nothing leaves the machine:
// every non-file request is recorded as a finding. One browser; routes visited sequentially.
import fs from 'node:fs'; import path from 'node:path';
const { chromium } = await import('/opt/npm-tools/node_modules/playwright/index.mjs');
const args = process.argv.slice(2); const outDir = args[0]; const opts = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const targets = args.slice(1).filter((a) => !a.startsWith('--')).map((a) => { const i = a.indexOf('='); return { label: a.slice(0, i), src: a.slice(i + 1) }; });
const routes = (opts.routes || '#/investor,#/home,#/campus,#/search,#/room,#/pro,#/lite,#/v25,#/v25/build,#/assurance,#/commissioning,#/servicehands,#/v25/exec,#/learn,#/fabric,#/suite/core').split(',');
fs.mkdirSync(outDir, { recursive: true }); const browser = await chromium.launch(); const report = { generatedAt: new Date().toISOString(), targets: [] };
for (const t of targets) {
  const url = /^https?:/.test(t.src) ? t.src : 'file://' + path.resolve(t.src); const bytes = /^https?:/.test(t.src) ? null : fs.statSync(t.src).size;
  for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage(); const errs = []; const ext = [];
    page.on('pageerror', (e) => errs.push(e.message.slice(0, 200))); page.on('request', (r) => { if (!/^(file|data|blob|about):/.test(r.url()) && !r.url().startsWith(new URL(url).origin)) ext.push(r.url().slice(0, 120)); });
    const t0 = Date.now(); await page.goto(url, { waitUntil: 'load', timeout: 120000 }); const loadMs = Date.now() - t0; await page.waitForTimeout(2500);
    const landing = await page.evaluate(() => ({ hash: location.hash, title: document.title, text: (document.body.innerText || '').slice(0, 300).replace(/\s+/g, ' ') }));
    const shots = [];
    if (opts.role) { try { await page.click('#btn-role', { timeout: 3000 }); await page.waitForTimeout(400); await page.click(`#panel [data-act="set-role"][data-role="${opts.role}"]`, { timeout: 3000 }); await page.waitForTimeout(600); } catch (e) { /* no role panel on this page */ } }
    for (const r of (tag === 'phone' ? routes.slice(0, 4) : routes)) {
      try { await page.evaluate((x) => { location.hash = x; }, r); await page.waitForTimeout(1200); const reached = await page.evaluate(() => location.hash); const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        const name = `${t.label}-${tag}-${r.replace(/[^a-z0-9]+/gi, '_')}.png`; await page.screenshot({ path: path.join(outDir, name), fullPage: false }); shots.push({ route: r, reached, sidewaysScroll: over, shot: name }); } catch (e) { shots.push({ route: r, error: e.message.slice(0, 120) }); }
    }
    report.targets.push({ label: t.label, viewport: tag, url: url.replace(/^file:\/\/.*\//, 'file://…/'), bytes, loadMs, landing, routes: shots, pageErrors: errs, externalRequests: ext });
    await ctx.close();
  }
}
await browser.close(); fs.writeFileSync(path.join(outDir, 'baseline.json'), JSON.stringify(report, null, 1));
for (const t of report.targets) console.log(`${t.label} ${t.viewport}: ${t.bytes ? (t.bytes / 1048576).toFixed(2) + ' MB, ' : ''}load ${t.loadMs} ms, lands on ${t.landing.hash || '(no hash)'}, ${t.routes.filter((r) => !r.error).length}/${t.routes.length} routes shot, ${t.pageErrors.length} page errors, ${t.externalRequests.length} external requests`);
