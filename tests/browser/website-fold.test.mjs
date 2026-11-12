#!/usr/bin/env node
// 90-1, the first screen of the public site: what a buyer sees before scrolling. On the home page and each page that tells the story,
// the first screen at 1440×900, 1366×768 and 390×844 shows exactly one promise (one h1, fully visible) and its action, fully visible,
// with no more than two actions; depth (products, industries, AI, integrations) starts one scroll or one click further and is never
// removed. The audit and before/after captures are in docs/surpass/FIRST_SCREEN_AUDIT.md.
// Run it in both schemes: PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs tests/browser/website-fold.test.mjs
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const scheme = process.env.PW_COLOR_SCHEME || 'light';
const out = path.join(repo, `tests/evidence/website-fold${scheme === 'dark' ? '-dark' : ''}`); fs.mkdirSync(out, { recursive: true });
const PORT = await new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const results = []; let failed = 0;
const ok = (id, name, cond, detail = '') => { results.push({ id, name, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name}${cond ? '' : ' — ' + String(detail).slice(0, 400)}`); };
const srv = spawn(process.execPath, [path.join(repo, 'apps/website/server/serve.mjs'), `--port=${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', () => r()); srv.stderr.on('data', () => r()); setTimeout(r, 2500); });
const base = `http://127.0.0.1:${PORT}`;
// the home page and the pages that tell the story; the forms, legal pages and the founder's own page are left as they are
const PAGES = ['/', '/products', '/platform', '/solutions', '/how-it-works', '/technology', '/trust', '/proof', '/pricing', '/pilots', '/pilot-partners', '/films'];
const SIZES = [[1440, 900], [1366, 768], [390, 844]];
const browser = await chromium.launch();
try {
  for (const [w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }); const page = await ctx.newPage();
    for (const p of PAGES) {
      await page.goto(base + p, { waitUntil: 'networkidle' });
      const r = await page.evaluate((vh) => {
        const vis = (el) => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && b.top >= 0 && b.bottom <= vh; };
        const main = document.querySelector('main') || document.body; const h1s = [...main.querySelectorAll('h1')];
        const hero = main.querySelector('.hero'); const acts = hero ? [...hero.querySelectorAll('.actions a.btn, .actions button.btn')] : [];
        return { h1s: h1s.length, h1: h1s[0]?.textContent.trim(), h1Visible: !!h1s[0] && vis(h1s[0]), actions: acts.map((a) => a.textContent.trim()), firstActionVisible: !!acts[0] && vis(acts[0]), primary: acts[0]?.classList.contains('btn--primary') };
      }, h);
      ok(`WF-${w}-${p}`, `${p} at ${w}×${h}: one promise and its action are fully on the first screen`, r.h1s === 1 && r.h1Visible && r.actions.length >= 1 && r.actions.length <= 2 && r.firstActionVisible && r.primary, JSON.stringify(r));
      if (p === '/' && w === 1440) await page.screenshot({ path: path.join(out, `home-${w}.png`) });
    }
    await ctx.close();
  }
  // depth is one step further, never removed: the home page still reaches every product, the lifecycle and the proof
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage(); await page.goto(base + '/', { waitUntil: 'networkidle' });
  const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
  ok('WF-depth', 'below the first screen the home page still links the products, how it works, the proof and the pricing', ['/products', '/how-it-works', '/proof', '/pricing'].every((x) => links.some((l) => l === x || l.startsWith(x + '/') || l === x + '/')), links.filter((l) => l.startsWith('/')).slice(0, 30).join(' '));
  await ctx.close();
} catch (e) { ok('WF-crash', 'the suite ran to the end', false, e.stack || e.message); }
await browser.close(); srv.kill();
const summary = { at: new Date().toISOString(), scheme, pass: results.length - failed, fail: failed, tests: results.length, results };
fs.writeFileSync(path.join(out, 'website-fold.json'), JSON.stringify(summary, null, 1));
console.log(`\n${summary.pass} passed, ${summary.fail} failed (${scheme})`); process.exit(failed ? 1 : 0);
