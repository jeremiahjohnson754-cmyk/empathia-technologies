#!/usr/bin/env node
/**
 * Before-change screenshots for the 60/10 transformation (VISUAL_EVIDENCE.md): the website's pages and the Living Campus's landmark
 * pages, in light and dark, at 320, 390, 768, 1200, 1440 and 1920 px, from the built apps served locally. Nothing leaves the machine;
 * a request to another origin is counted and reported. Writes PNGs and an index.json to the folder given (default .local/visual-baseline).
 *   node scripts/visual-baseline.mjs [outdir] [--only=website|demo] [--widths=390,1440]
 */
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import net from 'node:net'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const out = path.resolve(process.argv.slice(2).find((a) => !a.startsWith('--')) || path.join(repo, '.local/visual-baseline')); fs.mkdirSync(out, { recursive: true });
const WIDTHS = (arg('widths') || '320,390,768,1200,1440,1920').split(',').map(Number); const only = arg('only');
const freePort = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
async function serve(app) { const port = await freePort(); const srv = spawn(process.execPath, [path.join(repo, `apps/${app}/server/serve.mjs`), `--port=${port}`], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 700)); return { base: `http://127.0.0.1:${port}/`, srv }; }
const WEBSITE = ['', 'platform', 'products', 'products/pro', 'products/lite', 'products/learn', 'how-it-works', 'pricing', 'founder', 'proof', 'trust', 'contact'];
const DEMO = ['#/investor', '#/lite', '#/lite/room/R-ATL-4-218', '#/lite/optimize', '#/story', '#/learn', '#/campus/scouter', '#/studio/new/hybrid', '#/v25/build', '#/search', '#/manual'];
const index = []; const browser = await chromium.launch();
for (const [app, pages] of [['website', WEBSITE], ['demo', DEMO]]) {
  if (only && only !== app) continue; if (!fs.existsSync(path.join(repo, `apps/${app}/dist/index.html`))) { console.log(`${app} not built: NOT RUN`); continue; }
  const { base, srv } = await serve(app);
  for (const scheme of ['light', 'dark']) for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: Math.round(w * 0.65) < 640 ? 800 : Math.round(w * 0.65) }, colorScheme: scheme, deviceScaleFactor: 1 }); const page = await ctx.newPage(); const off = [];
    page.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) off.push(r.url()); });
    for (const p of pages) {
      const url = app === 'website' ? `${base}${p}` : `${base}${p}`; await page.goto(url); await page.waitForTimeout(app === 'demo' ? 900 : 400);
      const name = `${app}-${(p || 'home').replace(/[#/?=&]+/g, '_').replace(/^_+|_+$/g, '') || 'home'}-${scheme}-${w}.png`;
      await page.screenshot({ path: path.join(out, name), fullPage: true }); const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      index.push({ app, page: p || '/', scheme, width: w, file: name, overflowPx: over });
    }
    if (off.length) index.push({ app, scheme, width: w, offOrigin: off.slice(0, 5) }); await ctx.close();
  }
  srv.kill();
}
await browser.close(); fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify({ at: new Date().toISOString(), widths: WIDTHS, shots: index }, null, 1));
console.log(`${index.filter((x) => x.file).length} screenshots in ${out}; ${index.filter((x) => x.overflowPx > 0).length} with horizontal overflow; ${index.filter((x) => x.offOrigin).length} contexts with off-origin requests`);
