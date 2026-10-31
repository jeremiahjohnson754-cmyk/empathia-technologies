#!/usr/bin/env node
/**
 * Verify the Phase 1 static sites exactly as render.yaml declares them, before anything is deployed: each site's staticPublishPath is
 * served with that site's declared headers (static-host behaviour: /dir/ → /dir/index.html), and a real browser (Playwright Chromium)
 * loads every page. A check fails on any CSP violation, console error, failed same-origin request or missing content. No network
 * beyond 127.0.0.1. Run after `node scripts/build.mjs --public`.
 *   node scripts/staging/verify-static.mjs [--out=tests/evidence/STATIC_SITES.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
// render.yaml is read with a minimal parser for the fields this file uses (no YAML dependency): name, staticPublishPath, headers
const sites = []; let cur = null; let hdr = null;
const yamlPath = (process.argv.find((a) => a.startsWith('--yaml=')) || '').slice(7) || path.join(repo, 'render.yaml');
for (const raw of fs.readFileSync(yamlPath, 'utf8').split('\n')) {
  const l = raw.replace(/\s+#.*$/, '');
  let m;
  if ((m = /^\s+name: (.+)$/.exec(l)) && /^\s{4}name:/.test(l)) { cur = { name: m[1].trim(), headers: {} }; sites.push(cur); continue; }
  if (cur && (m = /^\s+staticPublishPath: (.+)$/.exec(l))) { cur.dir = m[1].trim(); continue; }
  if (cur && (m = /^\s+- path: (.+)$/.exec(l))) { hdr = { path: m[1].trim() }; continue; }
  if (cur && hdr && (m = /^\s+name: (.+)$/.exec(l)) && /^\s{8}name:/.test(l)) { hdr.name = m[1].trim(); continue; }
  if (cur && hdr && (m = /^\s+value: (.+)$/.exec(l)) && hdr.name) { cur.headers[hdr.name] = m[1].trim().replace(/^"(.*)"$/, '$1'); hdr = null; }
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
const serve = (site, port) => new Promise((ok) => { const root = path.join(repo, site.dir); const s = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; else if (!path.extname(p)) p += '/index.html';
  const f = path.join(root, path.normalize(p)); if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', ...site.headers }); fs.createReadStream(f).pipe(res); }); s.listen(port, '127.0.0.1', () => ok(s)); });

const { chromium } = require('playwright');
const results = []; const rec = (id, name, ok, detail = '') => { results.push({ id, site: name.split(':')[0], name, result: ok ? 'PASS' : 'FAIL', detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ` — ${detail}` : ''}`); };
const browser = await chromium.launch(); const servers = [];
try {
  for (const [i, site] of sites.entries()) {
    if (!site.dir || !fs.existsSync(path.join(repo, site.dir, 'index.html'))) { rec(`S${i}`, `${site.name}: built`, false, `${site.dir} has no index.html (run node scripts/build.mjs --public)`); continue; }
    const port = 4240 + i; servers.push(await serve(site, port)); const base = `http://127.0.0.1:${port}`;
    rec(`${site.name}-H`, `${site.name}: declares CSP, nosniff, frame denial, HSTS`, ['Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Strict-Transport-Security'].every((h) => site.headers[h]), Object.keys(site.headers).join(', '));
    const pages = site.name === 'empathia-website' ? fs.readdirSync(path.join(repo, site.dir), { withFileTypes: true }).filter((d) => d.isDirectory() && fs.existsSync(path.join(repo, site.dir, d.name, 'index.html'))).map((d) => `/${d.name}/`).concat(['/']) : ['/#/investor'];
    for (const pg of pages) {
      const page = await browser.newPage(); const problems = [];
      page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text().slice(0, 140)}`); });
      page.on('pageerror', (e) => problems.push(`page error: ${e.message.slice(0, 140)}`));
      page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()}`));
      page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) problems.push(`${r.status()} ${r.url()}`); });
      await page.goto(base + pg, { waitUntil: 'networkidle' });
      if (site.name === 'empathia-demo') await page.waitForTimeout(800);
      const text = await page.locator('body').innerText();
      if (text.trim().length < 200) problems.push(`little content (${text.trim().length} chars)`);
      if (site.name === 'empathia-website') { const forms = await page.locator('form[data-lead]').count(); if (forms) { const st = await page.locator('form[data-lead] [data-status]').first().innerText(); if (!/not configured/.test(st)) problems.push('a lead form does not say it is not configured'); if (!(await page.locator('form[data-lead] button[type=submit]').first().isDisabled())) problems.push('a lead form can be submitted without an API'); } }
      if (site.name === 'empathia-demo' && !/synthetic/i.test(text)) problems.push('the demo does not say its data is synthetic');
      rec(`${site.name}${pg}`, `${site.name}: ${pg} renders under the declared headers with no CSP violation or error`, !problems.length, problems.slice(0, 3).join(' | '));
      await page.close();
    }
  }
} finally { await browser.close(); for (const s of servers) s.close(); }
const out = (process.argv.find((a) => a.startsWith('--out=')) || '').slice(6);
const report = { at: new Date().toISOString(), sites: sites.map((s) => ({ name: s.name, dir: s.dir, headers: Object.keys(s.headers) })), results, pass: results.filter((r) => r.result === 'PASS').length, fail: results.filter((r) => r.result === 'FAIL').length };
if (out) fs.writeFileSync(path.resolve(repo, out), JSON.stringify(report, null, 2) + '\n');
console.log(`\nPASS ${report.pass} · FAIL ${report.fail}`); process.exit(report.fail ? 1 : 0);
