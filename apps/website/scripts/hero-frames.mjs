#!/usr/bin/env node
/**
 * The home page's opening sequence (founder directive 18 Nov 2026 17:25 §4: "a fully modeled conference room … technical overlays appear
 * … the floor … the building … the campus … an enterprise estate … a service event appears"), made only of the running demonstration:
 * each frame is an element capture of the demonstration's own 3D stage or map, dark theme, reduced motion, synthetic data. Nothing is
 * drawn or generated. Writes apps/website/media/hero/<id>-1200.webp (one size: see opening.tsx) and PROVENANCE.json (route, element, commit, sha256); the
 * website build copies only files listed there by name and hash, and the dist hygiene check refuses any other.
 * Run after `node scripts/build.mjs`:  node apps/website/scripts/hero-frames.mjs
 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const repo = path.resolve(app, '../..');
const require = createRequire(import.meta.url); const { chromium } = require(path.join(repo, 'node_modules/playwright'));
const demo = path.join(repo, 'apps/demo/dist'); const out = path.join(app, 'media/hero'); fs.mkdirSync(out, { recursive: true });
if (!fs.existsSync(path.join(demo, 'index.html'))) { console.error('build the demonstration first: node scripts/build.mjs'); process.exit(1); }
// in story order; `as` is the perspective whose view the frame shows; `trim` (top, right, bottom, left, as fractions) takes the stage's
// own buttons off the edge of the picture before the 16:10 crop: the picture is the product's render, its controls are not shown
export const FRAMES = [
  { id: 'room', label: 'A room', route: '#/lite/room/R-ATL-4-218', el: 'lite-room-3d', trim: [0.07, 0.12, 0, 0.02], as: 'employee', what: 'Atlas 4.218, furnished, in 3D' },
  { id: 'overlays', label: 'Its systems', route: '#/lite/room/R-ATL-4-218?mode=engineer', el: 'lite-room-3d', trim: [0.07, 0.12, 0, 0.02], as: 'syseng', what: 'the same room with camera coverage and microphone pickup drawn on it' },
  { id: 'floor', label: 'Its floor', route: '#/lite/b/ATL/4', el: 'lite-floor-3d', trim: [0.02, 0.09, 0, 0], as: 'syseng', what: 'floor 4 of Atlas HQ, every room on it' },
  { id: 'building', label: 'Its building', route: '#/lite/b/ATL', el: 'lite-building-3d', trim: [0.02, 0.09, 0, 0], as: 'syseng', what: 'Atlas HQ, its floors drawn apart' },
  { id: 'campus', label: 'The campus', route: '#/lite', el: 'lite-campus-3d', trim: [0.17, 0.09, 0, 0],   // 19 Nov: the Lite campus is the map, whose search and Campus button sit along its top edge
    as: 'syseng', what: 'the demonstration campus, every building' },
  { id: 'estate', label: 'The estate', route: '#/pro/issues', el: 'pro-failure-map', trim: [0, 0, 0, 0], as: 'ops', what: 'the failure map: every building’s open issues, from the same records' },
];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.glb': 'model/gltf-binary' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(demo, path.normalize(p)); if (!f.startsWith(demo) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const base = `http://127.0.0.1:${srv.address().port}/`;
  const commit = (spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8' }).stdout || 'unknown').trim();
  const prov = { $description: 'The home page opening sequence: element captures of the running demonstration (dark, reduced motion, synthetic data). The website build copies only these files with these hashes.', frames: {} };
  const browser = await chromium.launch(); const tmp = path.join(repo, '.local/captures'); fs.mkdirSync(tmp, { recursive: true });
  try {
    for (const fr of FRAMES) {
      const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, colorScheme: 'dark', reducedMotion: 'reduce', deviceScaleFactor: 1.5 });
      await ctx.addInitScript((as) => { try { localStorage.setItem('empathia.theme', 'dark'); localStorage.setItem('empathia.demo.perspective', as); } catch { /* none */ } }, fr.as);
      const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
      await page.goto(base + fr.route, { waitUntil: 'networkidle' }); await page.waitForSelector(`[data-testid=${fr.el}]`, { timeout: 15000 }); await page.waitForSelector(`[data-ground=ready] [data-testid=${fr.el}], [data-testid=${fr.el}][data-ground=ready], [data-testid=${fr.el}]:not([data-ground])`, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(1800);   // a stage on the aerial imagery is captured once its ground is painted (19 Nov)
      if (errs.length) { console.error(`FAIL ${fr.id}: ${errs[0]}`); process.exit(1); }
      const png = path.join(tmp, `hero-${fr.id}.png`); await page.locator(`[data-testid=${fr.el}]`).first().screenshot({ path: png }); await ctx.close();
      // 16:10, centred, so every frame lands in the same box
      const r = spawnSync('python3', ['-I', '-c', `import sys\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert('RGB')\nW,H=im.size\nT,R,B,L=[float(x) for x in sys.argv[4].split(',')]\nim=im.crop((int(W*L),int(H*T),int(W*(1-R)),int(H*(1-B))))\nW,H=im.size\nt=16/10\nif W/H>t:\n  w=int(H*t); im=im.crop(((W-w)//2,0,(W-w)//2+w,H))\nelse:\n  h=int(W/t); im=im.crop((0,(H-h)//2,W,(H-h)//2+h))\nim.resize((1200,750),Image.LANCZOS).save(sys.argv[2],'WEBP',quality=66,method=6)`, png, path.join(out, `${fr.id}-1200.webp`), '-', fr.trim.join(',')], { encoding: 'utf8' });
      if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
      const files = Object.fromEntries([`${fr.id}-1200.webp`].map((f) => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(out, f))).digest('hex')]));
      prov.frames[fr.id] = { route: fr.route, element: `[data-testid=${fr.el}]`, trim: fr.trim, perspective: fr.as, shows: fr.what, colorScheme: 'dark', reducedMotion: true, commit, capturedAt: new Date().toISOString(), data: 'synthetic demonstration data', files };
      console.log(`captured ${fr.id} ${fr.route} ${Object.keys(files).map((f) => `${f} ${fs.statSync(path.join(out, f)).size} B`).join(', ')}`);
    }
  } finally { await browser.close(); srv.close(); }
  fs.writeFileSync(path.join(out, 'PROVENANCE.json'), JSON.stringify(prov, null, 1) + '\n');
}
