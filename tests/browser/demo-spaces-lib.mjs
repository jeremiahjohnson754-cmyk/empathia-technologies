// Shared harness for the spatial and guided suites (demo-campus, demo-rooms, demo-tours, demo-searchbar, demo-search-scenarios):
// serves the built demo on a free port, opens pages at 390 / 768 / 1440 in the colour scheme of PW_COLOR_SCHEME (default: both light and
// dark, one after the other), and records page errors, console errors, requests that leave the page and horizontal overflow.
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import net from 'node:net'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
export const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
export const VIEWPORTS = [[390, 844, 'phone'], [768, 1024, 'tablet'], [1440, 900, 'desktop']];
export const SCHEMES = process.env.PW_COLOR_SCHEME ? [process.env.PW_COLOR_SCHEME] : ['light', 'dark'];

const freePort = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });

export async function harness(name) {
  if (!fs.existsSync(path.join(repo, 'apps/demo/dist/index.html'))) { console.log('demo not built (node scripts/build.mjs)'); process.exit(1); }
  const out = path.join(repo, 'tests/evidence', name); fs.mkdirSync(out, { recursive: true });
  const port = await freePort();
  const srv = spawn(process.execPath, [path.join(repo, 'apps/demo/server/serve.mjs'), `--port=${port}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((r) => { srv.stdout.on('data', () => r()); srv.stderr.on('data', () => r()); setTimeout(r, 2500); });
  const base = `http://127.0.0.1:${port}/`;
  const browser = await chromium.launch();
  const results = []; let failed = 0;
  const ok = (id, title, cond, detail = '') => { results.push({ id, title, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${title}${cond ? '' : ` — ${String(detail).slice(0, 300)}`}`); };
  async function open(viewport, scheme, opts = {}) {
    const [w, h] = viewport;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: opts.reducedMotion || 'no-preference' });
    const page = await ctx.newPage(); const errs = []; const ext = [];
    page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) ext.push(r.url()); });
    const go = async (hash, wait = 250) => { await page.evaluate((x) => { location.hash = x; }, hash).catch(() => {}); await page.waitForTimeout(wait); };
    await page.goto(base + (opts.hash || ''), { waitUntil: 'load' }); await page.waitForTimeout(400);
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const text = () => page.evaluate(() => (document.querySelector('main') || document.body).innerText);
    return { ctx, page, errs, ext, go, overflow, text, close: () => ctx.close() };
  }
  async function done() {
    await browser.close(); srv.kill();
    fs.writeFileSync(path.join(out, 'RESULTS.json'), JSON.stringify({ suite: name, schemes: SCHEMES, results }, null, 1));
    const pass = results.length - failed; console.log(`${pass}/${results.length} PASS`); process.exit(failed ? 1 : 0);
  }
  return { base, ok, open, done, out };
}
