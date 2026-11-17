#!/usr/bin/env node
// Screenshots of the demo connected to the server (#/connected, ADR-0013): a real enterprise API on a local database, a demo built
// with DEMO_API_URL, a real browser. Synthetic data. Nothing here is the public site: the public build names no server.
//   node scripts/evidence/connected-screens.mjs <out-dir>
// Writes connected-1-open.png (a new sandbox), connected-2-refused.png (a step tried as the wrong person), connected-3-whole.png (the
// whole thread, desktop) and connected-4-phone-resumed.png (the same sandbox opened on a phone-width browser from its resume code).
import { execFileSync, spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(process.argv[2] || path.join(repo, 'tests/evidence/demo-connected')); fs.mkdirSync(out, { recursive: true });
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const { setup } = await import(path.join(repo, 'tests/integration/harness.mjs'));
const API_PORT = 4187; const API = `http://127.0.0.1:${API_PORT}`;
const freePort = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-connected-shots-'));
execFileSync(process.execPath, [path.join(repo, 'apps/demo/build.mjs')], { env: { ...process.env, DEMO_DIST: dist, DEMO_API_URL: API }, stdio: ['ignore', 'ignore', 'inherit'] });
const port = await freePort(); const base = `http://127.0.0.1:${port}`;
const srv = spawn(process.execPath, [path.join(repo, 'apps/demo/server/serve.mjs'), `--port=${port}`], { env: { ...process.env, DEMO_DIST: dist, DEMO_API_URL: API }, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => { srv.stdout.on('data', r); srv.stderr.on('data', r); setTimeout(r, 2500); });
const h = await setup({ db: 'empathia_connected_shots', port: API_PORT, env: { DEMO_SESSIONS: 'on', CORS_ORIGINS: base } });
h.asSuper('UPDATE app.demo_config SET enabled = true');
const browser = await chromium.launch();
const settle = async (p, ms = 420000) => { await p.waitForFunction(() => !document.querySelector('[data-testid=cn-busy]'), null, { timeout: ms }); await p.waitForTimeout(300); };
const page = async (w, hgt, role) => { const ctx = await browser.newContext({ viewport: { width: w, height: hgt }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  await ctx.addInitScript((r) => { try { localStorage.setItem('empathia.demo.perspective', r); } catch { /* */ } }, role); const p = await ctx.newPage(); p.setDefaultTimeout(30000);
  await p.goto(`${base}/#/connected`); await p.waitForFunction(() => document.querySelector('[data-testid=connected]')?.getAttribute('data-state') === 'ready'); return { ctx, p }; };
// the viewport is made as tall as the page, so the sticky header is drawn once, at the top, where it is
const shot = async (p, name) => { const f = path.join(out, name); const w = p.viewportSize().width; const hgt = await p.evaluate(() => document.documentElement.scrollHeight);
  await p.setViewportSize({ width: w, height: Math.min(hgt, 8000) }); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(250); await p.screenshot({ path: f }); console.log(f); };
try {
  const d = await page(1440, 900, 'syseng');
  await d.p.getByTestId('cn-open').click(); await settle(d.p); await d.p.getByTestId('cn-thread').waitFor(); await shot(d.p, 'connected-1-open.png');
  await d.p.getByTestId('cn-try-role').selectOption('designer'); await d.p.getByTestId('cn-try').click(); await settle(d.p); await shot(d.p, 'connected-2-refused.png');
  await d.p.getByTestId('cn-run-all').click(); await settle(d.p);
  if ((await d.p.getByTestId('connected').getAttribute('data-complete')) !== 'yes') throw new Error(`the journey did not complete: ${await d.p.getByTestId('cn-said').innerText()}`);
  await shot(d.p, 'connected-3-whole.png'); const code = await d.p.getByTestId('cn-code').inputValue(); await d.ctx.close();
  const m = await page(390, 844, 'exec');
  await m.p.getByTestId('cn-resume-code').fill(code); await m.p.getByTestId('cn-resume').click(); await settle(m.p); await m.p.getByTestId('cn-thread').waitFor(); await shot(m.p, 'connected-4-phone-resumed.png'); await m.ctx.close();
} finally { await browser.close(); srv.kill(); await h.app.stop(); fs.rmSync(dist, { recursive: true, force: true }); }
process.exit(0);
