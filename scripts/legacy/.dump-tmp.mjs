// Dump innerText (+ headings/tabs/buttons) of routes, V2.5.3 offline (network blocked) or demo.
//   node dump.mjs <out.json> <base url> <routes file> [shotsDir]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const [out, base, routesFile, shots] = process.argv.slice(2);
const routes = fs.readFileSync(routesFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
if (base.startsWith('file:')) { await ctx.setOffline(true); await ctx.route('**/*', (r) => /^(file|data|blob):/.test(r.request().url()) ? r.continue() : r.abort()); }
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
await p.goto(base, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(2500);
const res = {};
for (const r of routes) {
  try {
    await p.evaluate((x) => { location.hash = x; }, '#/' + r); await p.waitForTimeout(1300);
    res[r] = await p.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      const t = (main.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 6000);
      const h = [...main.querySelectorAll('h1,h2,h3')].map((e) => e.tagName + ':' + e.textContent.trim().slice(0, 80));
      const tabs = [...main.querySelectorAll('[role=tab],nav a, .tabs a, .tab')].map((e) => e.textContent.trim().slice(0, 40)).filter(Boolean).slice(0, 40);
      const btn = [...main.querySelectorAll('button')].map((e) => e.textContent.trim().slice(0, 40)).filter(Boolean).slice(0, 50);
      const charts = main.querySelectorAll('svg,canvas').length;
      return { h, tabs, btn, charts, t };
    });
    if (shots) await p.screenshot({ path: path.join(shots, r.replace(/[^a-z0-9]+/gi, '_') + '.png'), fullPage: false });
  } catch (e) { res[r] = { err: e.message.slice(0, 100) }; }
}
res.__errors = errs;
fs.writeFileSync(out, JSON.stringify(res, null, 1));
await b.close();
