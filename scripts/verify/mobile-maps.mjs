#!/usr/bin/env node
// Mobile check of the demonstration's maps (founder 19 Nov 2026 20:16: "the building labels, route contrast, and controls need to remain
// readable on a real mobile viewport, not just in a scaled screenshot"). Emulated phones (Playwright device metrics: CSS width, pixel
// ratio, touch, mobile layout) in Chromium; not a physical handset.
//   node scripts/verify/mobile-maps.mjs [repo] [outdir]   (default: this repository, .local/mobile-maps; needs the demo built and python3 with PIL)
// It writes report.json and one screenshot per phone and view. Contrast is measured from the screenshot's own pixels: each side of a lens
// line, the line against the ground, or its casing against both the line and the ground, whichever is higher (WCAG ratio).
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { spawnSync } from 'node:child_process'; import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repo = process.argv[2] || here; const out = process.argv[3] || path.join(repo, '.local/mobile-maps'); fs.mkdirSync(out, { recursive: true });
const require = createRequire(import.meta.url); const { chromium, devices } = require(path.join(repo, 'node_modules/playwright'));
const demo = path.join(repo, 'apps/demo/dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.vtt': 'text/vtt', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(demo, path.normalize(p)); if (!f.startsWith(demo) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const base = `http://127.0.0.1:${srv.address().port}/`;
const PHONES = (process.env.PHONES || 'iPhone SE,iPhone 13,Pixel 7').split(',');
// [name, role, hash, lens (a Lite lens button to press), view selector]
const VIEWS = (process.env.VIEWS ? JSON.parse(process.env.VIEWS) : [
  ['lite-campus', 'syseng', '#/lite', null, '[data-testid=lite-campus-card]'],
  ['lite-campus-visitor', 'syseng', '#/lite', 'visitor', '[data-testid=lite-campus-card]'],
  ['lite-campus-engineer', 'syseng', '#/lite', 'engineer', '[data-testid=lite-campus-card]'],
  ['lite-building', 'syseng', '#/lite/b/ATL', null, '.l3-stage'],
  ['lite-floor', 'syseng', '#/lite/b/ATL/4', null, '.l3-stage'],
  ['start-map', 'ops', '#/', null, '.emap'],
  ['campus-page', 'ops', '#/campus', null, '.emap'],
]);
const browser = await chromium.launch(); const report = [];
for (const phone of PHONES) {
  const dev = devices[phone]; if (!dev) { console.error('no device', phone); continue; }
  for (const [name, role, hash, lens, viewSel] of VIEWS) {
    const ctx = await browser.newContext({ ...dev, colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block' });
    await ctx.addInitScript((r) => { try { localStorage.setItem('empathia.demo.perspective', r); localStorage.setItem('empathia.theme', 'dark'); } catch { /* none */ } }, role);
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(base + hash, { waitUntil: 'networkidle' }); await page.waitForSelector('main h1', { timeout: 20000 }).catch(() => {});
    if (lens) { const b = page.locator(`[data-testid=lite-lens-${lens}]`); if (await b.count()) await b.click(); else { report.push({ phone, name, skip: `no ${lens} lens for ${role}` }); await ctx.close(); continue; } }
    await page.waitForTimeout(2500);
    const view = page.locator(viewSel).first(); if (!(await view.count())) { report.push({ phone, name, skip: `no ${viewSel}` }); await ctx.close(); continue; }
    await view.scrollIntoViewIfNeeded(); await page.evaluate((s) => { const e = document.querySelector(s); const bar = document.querySelector('header')?.getBoundingClientRect().bottom || 56; if (e) scrollTo(0, e.getBoundingClientRect().top + scrollY - bar - 8); }, viewSel); await page.waitForTimeout(900);
    const m = await page.evaluate((viewSel) => {
      const root = document.querySelector(viewSel); const stage = root.querySelector('.emap__view, .l3-stage') || root; const V = stage.getBoundingClientRect();
      const R = (r) => ({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
      const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
      const pxOf = (e) => { if (e instanceof SVGElement) { const t = e.querySelector('text') || e; const fs = parseFloat(getComputedStyle(t).fontSize); const ctm = t.getScreenCTM(); return +(fs * (ctm ? Math.hypot(ctm.a, ctm.b) : 1)).toFixed(1); } const t = e.querySelector('b') || e; return +parseFloat(getComputedStyle(t).fontSize).toFixed(1); };
      const labels = [...root.querySelectorAll('.emap__pin, .emap__ovt, .emap__rpin, .l3-tag, .l3-label')].filter(vis).map((e) => { const r = e.getBoundingClientRect(); return { k: e.className.baseVal ?? e.className, text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40), r: R(r), px: pxOf(e), inView: r.left >= V.left - 1 && r.right <= V.right + 1 && r.top >= V.top - 1 && r.bottom <= V.bottom + 1 }; });
      const ctrls = [...root.querySelectorAll('.emap__ctrl button, .emap__layers button, .emap__lens button, .emap__crumbs button, .emap__search input, .l3-btn')].filter(vis).map((e) => ({ k: (e.getAttribute('aria-label') || e.textContent || e.getAttribute('placeholder') || '').trim().slice(0, 18), r: R(e.getBoundingClientRect()) }));
      const groups = [...root.querySelectorAll('.emap__ctrl, .emap__layers, .emap__search, .emap__crumbs, .emap__lens, .l3-ctl')].filter(vis).map((e) => ({ k: e.className, r: R(e.getBoundingClientRect()) }));
      const credit = [...root.querySelectorAll('p, span, div, text')].filter((e) => vis(e) && /synthetic/i.test(e.textContent || '') && e.children.length === 0 && /credit/.test(String(e.className?.baseVal ?? e.className))).map((e) => ({ text: e.textContent.trim(), px: pxOf(e), trunc: e.scrollWidth > e.clientWidth + 1, r: R(e.getBoundingClientRect()) }));
      const cases = [...root.querySelectorAll('.emap__ovc')]; const lines = [...root.querySelectorAll('.emap__ovl, .l3-route')].filter((e) => (e.getAttribute('points') || '').length > 0).map((e, li) => { const cs = getComputedStyle(e); const cw = cases[li] ? parseFloat(getComputedStyle(cases[li]).strokeWidth) : parseFloat(cs.strokeWidth); const ctm = e.getScreenCTM(); const pts = (e.getAttribute('points') || '').trim().split(/\s+/).map((p) => p.split(',').map(Number)).map(([x, y]) => ctm ? [x * ctm.a + y * ctm.c + ctm.e, x * ctm.b + y * ctm.d + ctm.f] : [x, y]); return { k: String(e.className.baseVal), stroke: cs.stroke, sw: parseFloat(cs.strokeWidth), cw, pts }; });
      // a bar fixed to the foot of the screen (the phone's tab bar) covers part of the page: nothing under it is measured
      const foot = Math.min(innerHeight, ...[...document.querySelectorAll('nav, div, footer')].filter((e) => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().bottom >= innerHeight - 1 && e.getBoundingClientRect().height < 160 && e.getBoundingClientRect().width > innerWidth * 0.8).map((e) => e.getBoundingClientRect().top));
      return { V: R(V), vw: innerWidth, foot, labels, ctrls, groups, credit, lines, over: document.documentElement.scrollWidth - innerWidth };
    }, viewSel);
    const png = path.join(out, `${phone.replace(/\s+/g, '')}-${name}.png`); await page.screenshot({ path: png });
    // overlaps: label with label, label with a control group, control with control
    const hit = (a, b, pad = 1) => a.x < b.x + b.w - pad && b.x < a.x + a.w - pad && a.y < b.y + b.h - pad && b.y < a.y + a.h - pad;
    const ll = []; m.labels.forEach((a, i) => m.labels.slice(i + 1).forEach((b) => { if (hit(a.r, b.r)) ll.push(`${a.text} × ${b.text}`); }));
    const lc = []; m.labels.forEach((a) => m.groups.forEach((g) => { if (hit(a.r, g.r)) lc.push(`${a.text} × ${g.k.split(' ')[0]}`); }));
    const cc = []; m.ctrls.forEach((a, i) => m.ctrls.slice(i + 1).forEach((b) => { if (hit(a.r, b.r, 0)) cc.push(`${a.k} × ${b.k}`); }));
    const small = m.ctrls.filter((c) => c.r.w < 44 || c.r.h < 44).map((c) => `${c.k} ${c.r.w}×${c.r.h}`);
    // route contrast, from the screenshot's own pixels: the line's centre against the ground beside it (WCAG ratio), pins excluded
    const samples = []; const dpr = dev.deviceScaleFactor || 1;
    m.lines.forEach((ln, li) => { for (let s = 0; s < ln.pts.length - 1; s++) { const [x0, y0] = ln.pts[s], [x1, y1] = ln.pts[s + 1]; const L = Math.hypot(x1 - x0, y1 - y0); if (L < 12) continue; const nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
      for (const t of [0.2, 0.35, 0.5, 0.65, 0.8]) { const cx = x0 + (x1 - x0) * t, cy = y0 + (y1 - y0) * t; if (cx < m.V.x + 4 || cx > m.V.x + m.V.w - 4 || cy < m.V.y + 4 || cy > Math.min(m.V.y + m.V.h, m.foot) - 10) continue; if (m.groups.some((g) => cx > g.r.x - 8 && cx < g.r.x + g.r.w + 8 && cy > g.r.y - 8 && cy < g.r.y + g.r.h + 8)) continue; if (m.labels.some((lb) => cx > lb.r.x - 6 && cx < lb.r.x + lb.r.w + 6 && cy > lb.r.y - 6 && cy < lb.r.y + lb.r.h + 10)) continue;
        const g = ln.cw / 2 + 5, k = (ln.sw + ln.cw) / 4; const P = (o) => [(cx + nx * o) * dpr, (cy + ny * o) * dpr]; samples.push({ li, c: [cx * dpr, cy * dpr], t: [(x1 - x0) / L, (y1 - y0) / L], dpr, a: P(g), b: P(-g), ka: P(k), kb: P(-k) }); } } });
    let contrast = null;
    if (samples.length) { const r = spawnSync('python3', ['-I', '-c', `
import sys, json
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB'); W, H = im.size; S = json.loads(sys.argv[2])
def avg(p, k):
    x, y = int(p[0]), int(p[1]); px = [im.getpixel((min(W-1, max(0, x+i)), min(H-1, max(0, y+j)))) for i in range(-k, k+1) for j in range(-k, k+1)]
    return [sum(c[n] for c in px) / len(px) for n in range(3)]
def lum(c):
    f = lambda v: (v/255)/12.92 if v/255 <= 0.04045 else (((v/255)+0.055)/1.055) ** 2.4
    return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2])
def ratio(a, b):
    la, lb = lum(a), lum(b); return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
out = []
for s in S:
    g = [(avg(s['a'], 2), avg(s['b'], 2))]; ga, gb = g[0]
    best = None
    for d in range(-6, 7):   # a dashed line: find the dash near the sample point
        p = [s['c'][0] + s['t'][0] * d * s['dpr'], s['c'][1] + s['t'][1] * d * s['dpr']]; c = avg(p, 1)
        sc = min(ratio(c, ga), ratio(c, gb))
        if best is None or sc > best[0]: best = (sc, c, d)
    sc, c, d = best
    ka = avg([s['ka'][0] + s['t'][0] * d * s['dpr'], s['ka'][1] + s['t'][1] * d * s['dpr']], 0); kb = avg([s['kb'][0] + s['t'][0] * d * s['dpr'], s['kb'][1] + s['t'][1] * d * s['dpr']], 0)
    # each side on its own: the line stands out there if it contrasts with the ground itself, or if its casing contrasts with both
    side = lambda k, gr: max(ratio(c, gr), min(ratio(c, k), ratio(k, gr)))
    out.append([s['li'], round(min(side(ka, ga), side(kb, gb)), 2)])
print(json.dumps(out))`, png, JSON.stringify(samples)], { encoding: 'utf8' });
      if (r.status === 0) { const v = JSON.parse(r.stdout); const per = {}; v.forEach(([li, x]) => (per[li] ||= []).push(x)); contrast = Object.entries(per).map(([li, xs]) => { xs.sort((a, b) => a - b); return { line: m.lines[li].k, n: xs.length, min: xs[0], median: xs[Math.floor(xs.length / 2)] }; }); } else contrast = r.stderr.slice(0, 200); }
    const row = { phone, vw: m.vw, dpr, name, view: m.V, over: m.over, labels: m.labels.length, smallestLabelPx: Math.min(...m.labels.map((l) => l.px)), labelsUnder11: m.labels.filter((l) => l.px < 11).map((l) => `${l.text} ${l.px}px`), clipped: m.labels.filter((l) => !l.inView).map((l) => l.text), labelOverlaps: ll, labelOverControls: lc, controlsUnder44: small, controlOverlaps: cc, credit: m.credit, contrast, errs };
    report.push(row); console.log(JSON.stringify(row)); await ctx.close();
  }
}
await browser.close(); srv.close(); fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1));
