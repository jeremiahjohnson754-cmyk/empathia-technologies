#!/usr/bin/env node
// Screenshots for the master directive's RESPONSIVE_VISUAL_EVIDENCE/ (20 Nov 2026): the flagship pages of both sites at the directive's
// eight widths, the top of each page as a visitor first sees it (the viewport, not the whole page), JPEG, light theme, reduced motion.
// With --before=<dir> --label=before it shoots another build (a worktree's dist) into the same folder under its own label, so a change
// can be compared side by side. Real Chromium screenshots of the built sites served locally; nothing is drawn or edited afterwards.
//   node scripts/verify/experience-shots.mjs [--out=docs/qa/experience-2026-11-20/RESPONSIVE_VISUAL_EVIDENCE] [--label=after]
//        [--demo=apps/demo/dist] [--site=apps/website/dist] [--only=demo|site] [--widths=320,390]
//        [--demo-url=https://…] [--site-url=https://…]   (shoot a deployed build instead, e.g. staging before a change: --label=before)
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const require = createRequire(path.join(repo, 'package.json'));
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const out = path.resolve(repo, arg('out', 'docs/qa/experience-2026-11-20/RESPONSIVE_VISUAL_EVIDENCE')); const label = arg('label', 'after');
const WIDTHS = arg('widths', '320,360,390,430,768,1024,1440,1920').split(',').map(Number); const only = arg('only', '');
const H = (w) => (w < 600 ? Math.round(w * 2.165) : w < 1100 ? Math.round(w * 1.33) : Math.round(w * 0.5625));   // phone 9:19.5, tablet 3:4, desktop 16:9
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json' };
const serve = (dir, port) => new Promise((ok) => { const s = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); let f = path.join(dir, p); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); if (!fs.existsSync(f)) f = path.join(dir, 'index.html'); r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }); s.listen(port, '127.0.0.1', () => ok(s)); });
const SETS = [
  ['site', arg('site', 'apps/website/dist'), [['site-home', '/'], ['site-platform', '/platform/'], ['site-pricing', '/pricing/']]],
  ['demo', arg('demo', 'apps/demo/dist'), [['demo-campus-map', '/#/campus'], ['demo-expo-live', '/#/play/expo'], ['demo-stadium-live', '/#/play/stadium'], ['demo-search-party', '/#/search?q=4.218&type=Room&focus=Room%3AR-ATL-4-218'], ['demo-results', '/#/find?q=camera'], ['demo-lite-room', '/#/lite/room/R-ATL-4-218']]],
].filter(([k]) => !only || k === only);
const { chromium } = require('playwright'); const browser = await chromium.launch(); fs.mkdirSync(out, { recursive: true }); const made = [];
let port = 4390;
for (const [kind, dir, pages] of SETS) {
  const remote = arg(`${kind}-url`, ''); const s = remote ? null : await serve(path.resolve(repo, dir), ++port); const base = remote ? remote.replace(/\/$/, '') : `http://127.0.0.1:${port}`;
  for (const [name, url] of pages) for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: H(w) }, reducedMotion: 'reduce', colorScheme: 'light', serviceWorkers: 'block', ...(w < 600 ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.addInitScript(() => { try { localStorage.setItem('empathia.demo.perspective', 'architect'); } catch { /* none */ } window.SIGNAL_NOPOP = true; });
    const p = await ctx.newPage(); await p.goto(base + url, { waitUntil: 'load' }).catch(() => undefined);
    await p.waitForSelector('main h1, h1', { timeout: 10000 }).catch(() => undefined); await p.waitForTimeout(kind === 'demo' ? 2200 : 900);
    const f = `${name}-${w}-${label}.jpg`; await p.screenshot({ path: path.join(out, f), type: 'jpeg', quality: 72 }); made.push(f); await ctx.close();
  }
  s?.close();
}
await browser.close(); console.log(`${made.length} screenshots in ${path.relative(repo, out)}`);
