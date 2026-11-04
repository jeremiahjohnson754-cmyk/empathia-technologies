// Shared harness for the demo shell suites (demo-viewas, demo-phoneshell, demo-access, demo-scouter, demo-rolemotion): serves the built
// demo on a free port, opens contexts with a role already chosen, counts results in the "N passed, M failed" form scripts/test.mjs reads,
// and fails any page that logged a console error or requested anything off the page's origin.
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import net from 'node:net'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
export const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const freePort = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });

export async function harness(name) {
  if (!fs.existsSync(path.join(repo, 'apps/demo/dist/index.html'))) { console.error('build first: node scripts/build.mjs'); process.exit(1); }
  const port = await freePort(); const base = `http://127.0.0.1:${port}/`;
  const srv = spawn(process.execPath, [path.join(repo, 'apps/demo/server/serve.mjs'), `--port=${port}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((r) => { srv.stdout.on('data', r); srv.stderr.on('data', r); setTimeout(r, 2500); });
  const browser = await chromium.launch(); const results = []; let failed = 0; const scheme = process.env.PW_COLOR_SCHEME || 'default';
  const ok = (id, title, cond, detail = '') => { results.push({ id, title, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 300) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${title}${cond ? '' : ' — ' + String(detail).slice(0, 300)}`); };
  /** a page with the role chosen before load; `errs` collects console errors, `reqs` every request path */
  async function open(hash, { role = 'architect', w = 1440, h = 900, theme, reduced, colorScheme } = {}) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference', ...(colorScheme ? { colorScheme } : {}) });
    await ctx.addInitScript(([r, t]) => { try { if (!sessionStorage.getItem('__seeded')) { localStorage.setItem('empathia.demo.perspective', r); if (t) localStorage.setItem('empathia.theme', t); else localStorage.removeItem('empathia.theme'); sessionStorage.setItem('__seeded', '1'); } } catch { /* */ } }, [role, theme || '']);
    const page = await ctx.newPage(); const errs = []; const reqs = []; const off = [];
    page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('request', (r) => { const u = r.url(); if (u.startsWith(base)) reqs.push(u.slice(base.length)); else if (!u.startsWith('data:')) off.push(u); });
    await page.goto(base + hash); await page.waitForSelector('main h1', { timeout: 8000 }).catch(() => undefined); await page.waitForTimeout(250);
    return { ctx, page, errs, reqs, off, close: () => ctx.close() };
  }
  const main = (p) => p.evaluate(() => document.querySelector('main').innerText);
  async function done() {
    await browser.close(); srv.kill();
    const out = path.join(repo, 'tests/evidence/demo-shell'); fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, `${name}-${scheme}.json`), JSON.stringify({ suite: name, scheme, at: new Date().toISOString(), results }, null, 1));
    console.log(`\n${results.length - failed} passed, ${failed} failed`); process.exit(failed ? 1 : 0);
  }
  return { base, ok, open, main, done, scheme };
}
