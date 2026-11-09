// Shared harness for the investor demonstration's operational-workspace suites (demo-dispatch, demo-servicehands, demo-replay,
// demo-fi-scan, demo-decisions, demo-destructive, demo-enquiry, learn-labs, demo-hardening): serves the built dist on the suite's own port,
// runs every check at 390, 768 and 1440 px, collects page errors, console errors and any request that leaves the page, and writes the
// result as JSON. Colour scheme: PW_COLOR_SCHEME (or tests/browser/color-scheme.mjs) — the evidence file name carries it.
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
export const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
export const VIEWPORTS = [[1440, 900, 'desktop'], [768, 1024, 'tablet'], [390, 844, 'phone']];
export const SCHEME = process.env.PW_COLOR_SCHEME || 'light';

export async function suite(name, port, body) {
  const out = path.join(repo, 'tests/evidence/demo-ops'); fs.mkdirSync(out, { recursive: true });
  const results = []; let failed = 0;
  const ok = (id, label, cond, detail = '') => { results.push({ id, name: label, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${label}${cond ? '' : ' — ' + String(detail).slice(0, 300)}`); };
  const srv = spawn(process.execPath, [path.join(repo, 'apps/demo/server/serve.mjs'), `--port=${port}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((r) => { srv.stdout.on('data', () => r()); srv.stderr.on('data', () => r()); setTimeout(r, 2500); });
  const base = `http://127.0.0.1:${port}/`;
  const browser = await chromium.launch();
  /** A fresh page with error/request capture; `allow` filters expected console errors (e.g. a deliberately failed chunk). */
  const open = async (w, h, opts = {}) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: opts.reducedMotion || 'no-preference', ...(process.env.PW_COLOR_SCHEME ? {} : { colorScheme: 'light' }) });
    const page = await ctx.newPage(); const errs = []; const ext = [];
    page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !(opts.allow && opts.allow.test(m.text()))) errs.push(m.text()); });
    page.on('request', (r) => { if (!r.url().startsWith(base)) ext.push(r.url()); });
    if (opts.stubTally) await ctx.route('https://tally.so/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub of the hosted enquiry form</title>' }));
    return { ctx, page, errs, ext };
  };
  const goto = async (page, hash, persp) => {
    if (persp) await page.evaluate((p) => { try { localStorage.setItem('empathia.demo.perspective', p); } catch {} }, persp).catch(() => {});
    await page.goto(base + hash); await page.waitForSelector('main h1', { timeout: 8000 }).catch(() => {});
    await page.waitForFunction(() => !document.querySelector('[data-testid=workspace-loading]'), null, { timeout: 8000 }).catch(() => {});
    if (persp && (await page.locator('.persp select').count())) { const cur = await page.locator('.persp select').inputValue(); if (cur !== persp) { await page.selectOption('.persp select', persp); await page.waitForTimeout(120);
      // 2026-11-09: since the merged shell (D44), switching role on an address that is not that role's work lands the role on its own
      // home. goto means "open THIS address as THIS role", so return to the address: the role then sees what the shell gives it there
      // (the screen, or the owl page). Without this, checks made after a switch read the role's home instead of the address under test.
      if (await page.evaluate((h) => location.hash !== h, hash)) { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(200); await page.waitForSelector('main h1', { timeout: 8000 }).catch(() => {}); }
    } }
  };
  const over = (page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const text = (page) => page.evaluate(() => document.querySelector('main')?.innerText || '');
  /** Interactive controls under 44 px on a phone (visible ones, inside main or the dialog). */
  const smallTargets = (page) => page.evaluate(() => Array.from(document.querySelectorAll('main button, main a.ui-btn, main select, main input:not([type=hidden]):not([type=checkbox]):not([type=radio]), .sg-dialog button, .sg-dialog input'))
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && r.height < 43.5; }).map((e) => `${e.tagName}:${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30)}:${Math.round(e.getBoundingClientRect().height)}`));
  const clearState = (page) => page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('empathia.demo.') && k !== 'empathia.demo.perspective') localStorage.removeItem(k); });
  const h = { ok, open, goto, over, text, smallTargets, clearState, base, browser, VIEWPORTS };
  try { await body(h); } catch (e) { ok(`${name}-crash`, 'the suite ran to the end', false, e.stack || e.message); }
  finally { await browser.close(); srv.kill(); }
  fs.writeFileSync(path.join(out, `${name}-${SCHEME}.json`), JSON.stringify({ at: new Date().toISOString(), scheme: SCHEME, pass: results.length - failed, fail: failed, tests: results.length, results }, null, 1));
  console.log(`\n${results.length - failed} passed, ${failed} failed`); process.exit(failed ? 1 : 0);
}
