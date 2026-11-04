#!/usr/bin/env node
/**
 * Product captures for the website, taken from the built investor demonstration (apps/demo/dist) in the DARK theme only (founder
 * decision D43), at 1280×800, reduced motion, settled. Writes <id>-1280.webp and <id>-640.webp into apps/website/media/product/ with
 * PROVENANCE.json (route, viewport, colour scheme, commit, sha256, "synthetic demonstration data"). The website build admits only files
 * whose hashes are listed there. Run after `node scripts/build.mjs`; re-run whenever the demonstration changes.
 *   node apps/website/scripts/captures.mjs [--only=lite,pro]
 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const repo = path.resolve(app, '../..');
const require = createRequire(import.meta.url); const { chromium } = require(path.join(repo, 'node_modules/playwright'));
const demo = path.join(repo, 'apps/demo/dist'); const out = path.join(app, 'media/product'); fs.mkdirSync(out, { recursive: true });
if (!fs.existsSync(path.join(demo, 'index.html'))) { console.error('build the demonstration first: node scripts/build.mjs'); process.exit(1); }
// the uplifted demonstration (2026-11-04): Mission Control is shown by its isometric campus, ServiceHands by its home; "room" is not a
// product but the room record (#/room, Atlas 4.218), which the home page's acceptance chapter uses
const ROUTES = { 'mission-control': '#/campus', lite: '#/v25/build', pro: '#/v25/exec', 'search-party': '#/search', servicehands: '#/servicehands', commissioning: '#/v25/build', apex: '#/v25/apex', field: '#/v25/fi', learn: '#/v25/learn', room: '#/room' };
// Build a Room starts empty: describe the default room first; the commissioning capture then opens its checks and plan
const draft = async (page) => { const f = page.locator('form.build__form'); if (await f.count()) { await f.locator('button[type=submit], button').last().click(); await page.waitForTimeout(600); } };
const PREP = { lite: draft, commissioning: async (page) => { await draft(page); await page.getByText(/^Checks & plan/).first().click(); await page.waitForTimeout(500); } };
// the perspective whose view the capture shows (creating a room needs room.design; KPI passports are read by the executive)
const PERSPECTIVE = { lite: 'designer', commissioning: 'designer', pro: 'exec' };
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(demo, path.normalize(p)); if (!f.startsWith(demo) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404).end(); return; } res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const base = `http://127.0.0.1:${srv.address().port}/`;
const commit = (spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8' }).stdout || 'unknown').trim();
const provPath = path.join(out, 'PROVENANCE.json'); const prov = fs.existsSync(provPath) ? JSON.parse(fs.readFileSync(provPath, 'utf8')) : {};
prov.$description = 'Captures of the synthetic investor demonstration for the website (dark only, D43). The website build admits only these files with these hashes.'; prov.captures ||= {};
const browser = await chromium.launch(); const tmp = path.join(repo, '.local/captures'); fs.mkdirSync(tmp, { recursive: true });
try {
  for (const [id, route] of Object.entries(ROUTES)) {
    if (only.length && !only.includes(id)) continue;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark', reducedMotion: 'reduce', deviceScaleFactor: 1 });
    await ctx.addInitScript((as) => { try { localStorage.setItem('empathia.theme', 'dark'); if (as) localStorage.setItem('empathia.demo.perspective', as); } catch { /* none */ } }, PERSPECTIVE[id] || '');
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(base + route, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200); if (PREP[id]) await PREP[id](page).catch((e) => errs.push(String(e)));
    const loading = await page.evaluate(() => /Loading…|Loading\.\.\.|Not migrated yet/.test(document.body.innerText.slice(0, 3000)));
    if (errs.length || loading) { console.error(`SKIP ${id}: ${errs[0] || 'still loading or not migrated'}`); delete prov.captures[id]; await ctx.close(); continue; }
    const png = path.join(tmp, `${id}.png`); await page.screenshot({ path: png }); await ctx.close();
    const r = spawnSync('python3', ['-I', '-c', `import sys\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert('RGB')\nim.save(sys.argv[2],'WEBP',quality=72,method=6)\nim.resize((640,400),Image.LANCZOS).save(sys.argv[3],'WEBP',quality=74,method=6)`, png, path.join(out, `${id}-1280.webp`), path.join(out, `${id}-640.webp`)], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
    const files = Object.fromEntries([`${id}-1280.webp`, `${id}-640.webp`].map((f) => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(out, f))).digest('hex')]));
    prov.captures[id] = { route, viewport: '1280x800', colorScheme: 'dark', reducedMotion: true, commit, capturedAt: new Date().toISOString(), data: 'synthetic demonstration data', width: 1280, height: 800, files };
    console.log(`captured ${id} ${route} ${Object.keys(files).map((f) => `${f} ${fs.statSync(path.join(out, f)).size} B`).join(', ')}`);
  }
} finally { await browser.close(); srv.close(); }
fs.writeFileSync(provPath, JSON.stringify(prov, null, 1) + '\n');
