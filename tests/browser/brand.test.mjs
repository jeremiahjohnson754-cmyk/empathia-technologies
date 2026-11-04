#!/usr/bin/env node
// The brand (D39) and type (D7) on the three built surfaces, each served by its own server: tab icons, manifest, theme-init first in
// <head>, Inter preloads, the social raster never loaded, CSP clean — at 390 and 1440. Uses tests/browser/brand-checks.mjs.
//   node tests/browser/brand.test.mjs        (needs node scripts/build.mjs)
//   PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs tests/browser/brand.test.mjs
import { spawn } from 'node:child_process'; import net from 'node:net'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { brandChecks, watchRequests } from './brand-checks.mjs';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
let failed = 0, passed = 0;
const ok = (id, name, cond, detail = '') => { if (cond) passed += 1; else failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name}${cond ? '' : ' — ' + String(detail).slice(0, 300)}`); };
const freePort = () => new Promise((r) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const servers = [];
const start = async (app) => { const port = await freePort(); const srv = spawn(process.execPath, [path.join(repo, `apps/${app}/server/serve.mjs`), `--port=${port}`], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, FONT_KIT_ID: '' } }); servers.push(srv);
  await new Promise((r) => { srv.stdout.on('data', r); srv.stderr.on('data', r); setTimeout(r, 2500); }); return `http://127.0.0.1:${port}`; };
const SURFACES = [
  // the website keeps its authored dark theme until its Paper composition lands, so no theme-init there yet (website slice)
  { app: 'website', paths: ['/', '/products/'], manifest: false, shellMark: false, themeInit: false },
  { app: 'demo', paths: ['/'], manifest: true, shellMark: true },
  { app: 'enterprise-web', paths: ['/'], manifest: true, shellMark: false },   // the shell renders after sign-in; its mark is checked in the demo
];
const browser = await chromium.launch();
try {
  for (const s of SURFACES) {
    const base = await start(s.app);
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      for (const p of s.paths) {
        const page = await ctx.newPage(); const loaded = watchRequests(page); const errs = [];
        page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
        const r = await page.goto(base + p, { waitUntil: 'load' }); await page.waitForTimeout(300);
        if (s.shellMark) await page.locator('.shell__mark').first().waitFor({ timeout: 5000 }).catch(() => {});
        ok(`BR-${s.app}-${w}${p}-200`, `${s.app} ${p} at ${w}: answers 200`, r.status() === 200, r.status());
        for (const c of await brandChecks(page, { loaded, manifest: s.manifest, shellMark: s.shellMark, themeInit: s.themeInit !== false, prefix: `BR-${s.app}-${w}${p}` })) ok(c.id, `${s.app} ${p} at ${w}: ${c.name}`, c.pass, c.detail);
        const csp = errs.filter((e) => /Content Security Policy|Refused to/i.test(e));
        ok(`BR-${s.app}-${w}${p}-csp`, `${s.app} ${p} at ${w}: the brand and type files raise no CSP violation or failed load`, !csp.length && !errs.some((e) => /brand\/|fonts\/|theme-init|manifest/.test(e)), errs.join(' | '));
        await page.close();
      }
      await ctx.close();
    }
  }
} finally { await browser.close(); for (const s of servers) s.kill(); }
console.log(`\n${passed}/${passed + failed} PASS${process.env.EMPATHIA_FORCED_COLOR_SCHEME ? ` (PW_COLOR_SCHEME=${process.env.EMPATHIA_FORCED_COLOR_SCHEME})` : ''}`);
process.exit(failed ? 1 : 0);
