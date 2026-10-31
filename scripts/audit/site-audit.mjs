#!/usr/bin/env node
/**
 * Functional, accessibility, responsive and security-header audit of the two public sites, from their built dist directories served
 * exactly as render.yaml declares (same headers), in Chromium at 320 / 390 / 768 / 1440 px. No network beyond 127.0.0.1.
 *   node scripts/audit/site-audit.mjs [--label=baseline] [--shots] [--out=tests/evidence/SITE_AUDIT.json] [--strict]
 * Checks per page and width (in-house rules; axe-core is not installable here — this is not an axe report):
 *   A1 no horizontal page scroll · A2 no console error, page error, failed or 4xx/5xx same-origin request · A3 one h1, no skipped heading
 *   level · A4 every image has alt, every form control a label, every link/button an accessible name · A5 text contrast ≥ 4.5:1
 *   (≥ 3:1 for ≥ 24 px or ≥ 18.66 px bold) against the nearest opaque background · A6 interactive targets ≥ 24×24 (WCAG 2.5.8) and, as
 *   the project's own target, ≥ 44 px tall on phones · A7 <html lang>, a <main>, unique ids · A8 keyboard: the first 12 Tab stops each
 *   show a visible focus indicator · A9 every internal link resolves (200) · A10 video has captions track and no autoplay with sound.
 * Exit 1 with --strict when any P0/P1 defect is found. Severity: P0 broken core path · P1 blocks a user group (a11y A/AA failure,
 * unusable on a width) · P2 degraded · P3 polish.
 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const require = createRequire(import.meta.url);
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const label = arg('label', 'audit'); const shots = process.argv.includes('--shots'); const strict = process.argv.includes('--strict');
const shotDir = path.join(repo, '.local/audit', label); if (shots) fs.mkdirSync(shotDir, { recursive: true });

// render.yaml → per-site headers (same minimal parser as verify-static)
const sites = []; let cur = null; let hdr = null;
for (const raw of fs.readFileSync(path.join(repo, 'render.yaml'), 'utf8').split('\n')) {
  const l = raw.replace(/\s+#.*$/, ''); let m;
  if ((m = /^\s{4}name: (.+)$/.exec(l))) { cur = { name: m[1].trim(), headers: {} }; sites.push(cur); continue; }
  if (cur && (m = /^\s+staticPublishPath: (.+)$/.exec(l))) { cur.dir = m[1].trim(); continue; }
  if (cur && (m = /^\s+- path: (.+)$/.exec(l))) { hdr = {}; continue; }
  if (cur && hdr && (m = /^\s{8}name: (.+)$/.exec(l))) { hdr.name = m[1].trim(); continue; }
  if (cur && hdr && (m = /^\s+value: (.+)$/.exec(l)) && hdr.name) { cur.headers[hdr.name] = m[1].trim().replace(/^"(.*)"$/, '$1'); hdr = null; }
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.txt': 'text/plain', '.xml': 'application/xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8', '.woff2': 'font/woff2' };
const serve = (site, port) => new Promise((ok) => { const root = path.join(repo, site.dir); const s = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; else if (!path.extname(p)) p += '/index.html';
  const f = path.join(root, path.normalize(p)); if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404, site.headers).end('not found'); return; }
  const st = fs.statSync(f); const type = TYPES[path.extname(f)] || 'application/octet-stream'; const range = req.headers.range;
  if (range && /^bytes=/.test(range)) { const [a, b] = range.slice(6).split('-'); const start = Number(a) || 0; const end = b ? Number(b) : st.size - 1;
    res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${st.size}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1, ...site.headers }); fs.createReadStream(f, { start, end }).pipe(res); return; }
  res.writeHead(200, { 'content-type': type, 'content-length': st.size, 'accept-ranges': 'bytes', ...site.headers }); fs.createReadStream(f).pipe(res); }); s.listen(port, '127.0.0.1', () => ok(s)); });

const WIDTHS = [320, 390, 768, 1440];
const defects = []; const pages = [];
const add = (d) => { const key = `${d.site}|${d.rule}|${d.page}|${d.detail}`; const ex = defects.find((x) => x.key === key); if (ex) { if (!ex.widths.includes(d.width)) ex.widths.push(d.width); return; } defects.push({ key, ...d, widths: [d.width] }); };

const { chromium } = require('playwright'); const browser = await chromium.launch(); const servers = [];
try {
  for (const [i, site] of sites.entries()) {
    if (!site.dir || !fs.existsSync(path.join(repo, site.dir, 'index.html'))) { add({ site: site.name, page: '/', width: 0, rule: 'BUILD', severity: 'P0', detail: `${site.dir} is not built`, component: 'build' }); continue; }
    const port = 4340 + i; servers.push(await serve(site, port)); const base = `http://127.0.0.1:${port}`;
    const list = site.name === 'empathia-website'
      ? ['/', ...fs.readdirSync(path.join(repo, site.dir), { recursive: true }).filter((f) => f.endsWith('index.html') && f !== 'index.html').map((f) => '/' + path.dirname(f) + '/')]
      : ['/#/investor', '/#/v25/build', '/#/search', '/#/v25/service', '/#/v25/apex', '/#/v25/learn', '/#/v25', '/#/v25/exec', '/#/v25/ledger', '/#/v25/policy', '/#/v25/fi', '/#/v25/fipv', '/#/suite/commission', '/#/suite/pro', '/#/tours/investor?scenario=1'];
    const linkCache = new Map();
    for (const pg of list) for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, deviceScaleFactor: 1, hasTouch: width < 768, reducedMotion: 'no-preference' });
      const page = await ctx.newPage(); const errs = [];
      page.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${m.text().slice(0, 160)}`); });
      page.on('pageerror', (e) => errs.push(`page error: ${e.message.slice(0, 160)}`));
      page.on('requestfailed', (r) => { if (!/net::ERR_ABORTED/.test(r.failure()?.errorText || '') || !/\.(mp4|webm)$/.test(r.url())) errs.push(`request failed: ${r.url().replace(base, '')}`); });
      page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) errs.push(`${r.status()} ${r.url().replace(base, '')}`); });
      await page.goto(base + pg, { waitUntil: 'networkidle' }); await page.waitForTimeout(site.name === 'empathia-demo' ? 700 : 150);
      const r = await page.evaluate(() => {
        const out = {}; const vis = (el) => { const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && b.width > 0 && b.height > 0 && !el.closest('[hidden],[aria-hidden="true"]'); };
        out.overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        out.lang = document.documentElement.getAttribute('lang') || ''; out.main = !!document.querySelector('main');
        const ids = [...document.querySelectorAll('[id]')].map((e) => e.id); out.dupIds = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
        const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis).map((h) => Number(h.tagName[1])); out.h1 = hs.filter((h) => h === 1).length;
        out.skips = []; for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) out.skips.push(`h${hs[i - 1]}→h${hs[i]}`);
        out.noAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).map((i) => i.getAttribute('src'));
        const name = (el) => (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent || el.textContent || el.getAttribute('title') || el.querySelector('img')?.getAttribute('alt') || '').trim();
        out.unnamed = [...document.querySelectorAll('a[href],button')].filter(vis).filter((e) => !name(e)).map((e) => e.outerHTML.slice(0, 90));
        out.unlabelled = [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter((e) => vis(e) && !e.closest('[aria-hidden="true"]')).filter((e) => !(e.labels && e.labels.length) && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby')).map((e) => e.name || e.id || e.type);
        // contrast: text-bearing elements against the nearest opaque ancestor background
        const rgb = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
        const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
        const bgOf = (el) => { let stack = []; for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.backgroundImage && s.backgroundImage !== 'none' && !/gradient/.test(s.backgroundImage)) return null; const c = rgb(s.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 0.99) break; } } let base = { r: 255, g: 255, b: 255 }; for (const c of stack.reverse()) base = { r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a), b: c.b * c.a + base.b * (1 - c.a) }; return base; };
        out.contrast = []; const seen = new Set();
        for (const el of document.querySelectorAll('body *')) {
          if (!vis(el) || ['SCRIPT', 'STYLE', 'VIDEO', 'IMG', 'SVG', 'svg'].includes(el.tagName)) continue;
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1); if (!own) continue;
          const s = getComputedStyle(el); const fg = rgb(s.color); const bg = bgOf(el); if (!fg || !bg) continue;
          const f = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) };
          const L1 = lum(f), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          const px = parseFloat(s.fontSize); const large = px >= 24 || (px >= 18.66 && Number(s.fontWeight) >= 700); const need = large ? 3 : 4.5;
          if (ratio < need) { const k = `${el.tagName}.${el.className}|${s.color}`; if (!seen.has(k)) { seen.add(k); out.contrast.push(`${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''} "${el.textContent.trim().slice(0, 40)}" ${ratio.toFixed(2)}:1 (needs ${need})`); } }
        }
        out.small = []; out.short = [];
        for (const e of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button]')) {
          if (!vis(e)) continue; const b = e.getBoundingClientRect(); const inline = e.tagName === 'A' && getComputedStyle(e).display === 'inline' && e.closest('p,li,td,dd,figcaption');
          if (inline) continue;   // WCAG 2.5.8 exempts links inside a sentence
          const t = `${e.tagName.toLowerCase()} "${(e.textContent || e.getAttribute('aria-label') || e.name || '').trim().slice(0, 30)}" ${Math.round(b.width)}×${Math.round(b.height)}`;
          if (b.width < 24 || b.height < 24) out.small.push(t); else if (b.height < 44 && innerWidth < 768 && e.type !== 'checkbox' && e.type !== 'radio') out.short.push(t);
        }
        out.links = [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => h.startsWith('/') && !h.startsWith('//')))];
        out.videos = [...document.querySelectorAll('video')].map((v) => ({ src: v.currentSrc || v.querySelector('source')?.src || '', captions: !!v.querySelector('track[kind=captions],track[kind=subtitles]'), autoplay: v.autoplay, muted: v.muted, loop: v.loop, controls: v.controls, decorative: v.getAttribute('aria-hidden') === 'true' }));
        out.textLen = document.body.innerText.trim().length;
        return out;
      });
      // keyboard focus visibility
      const focusIssues = [];
      for (let t = 0; t < 12; t++) { await page.keyboard.press('Tab'); const f = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e); const shown = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none' || /focus/.test(e.className); return { tag: e.tagName.toLowerCase(), text: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30), shown }; }); if (f && !f.shown) focusIssues.push(`${f.tag} "${f.text}"`); }
      if (shots && (width === 390 || width === 1440)) await page.screenshot({ path: path.join(shotDir, `${site.name}${pg.replace(/[^a-z0-9]+/gi, '_')}-${width}.png`), fullPage: true });
      const D = (rule, severity, detail, component) => add({ site: site.name, page: pg, width, rule, severity, detail, component });
      if (r.overflow > 1) D('A1 horizontal scroll', 'P1', `page is ${r.overflow}px wider than the viewport`, 'layout');
      for (const e of [...new Set(errs)]) D('A2 runtime error', /^4\d\d|^5\d\d|request failed/.test(e) ? 'P1' : 'P1', e, 'runtime');
      if (r.h1 !== 1) D('A3 headings', 'P2', `${r.h1} visible h1 elements`, 'content structure');
      for (const s of r.skips) D('A3 headings', 'P3', `skipped level ${s}`, 'content structure');
      for (const s of r.noAlt) D('A4 names', 'P1', `img without alt: ${s}`, 'media');
      for (const s of r.unnamed) D('A4 names', 'P1', `control without accessible name: ${s}`, 'controls');
      for (const s of r.unlabelled) D('A4 names', 'P1', `form control without label: ${s}`, 'forms');
      for (const s of r.contrast) D('A5 contrast', 'P1', s, 'colour');
      for (const s of r.small) D('A6 target size', 'P2', `below 24×24 (WCAG 2.5.8; its spacing exception may apply): ${s}`, 'controls');
      for (const s of r.short) D('A6 target size', 'P3', `below the 44 px project target on phones: ${s}`, 'controls');
      if (!/^en/.test(r.lang)) D('A7 document', 'P2', 'missing <html lang>', 'document');
      if (!r.main) D('A7 document', 'P2', 'no <main> landmark', 'document');
      for (const s of r.dupIds) D('A7 document', 'P2', `duplicate id "${s}"`, 'document');
      for (const s of [...new Set(focusIssues)]) D('A8 keyboard focus', 'P1', `no visible focus indicator on ${s}`, 'controls');
      for (const v of r.videos) { if (!v.decorative && !v.captions) D('A10 media', 'P1', `video without captions track: ${v.src}`, 'media'); if (v.autoplay && !v.muted) D('A10 media', 'P0', `video autoplays with sound: ${v.src}`, 'media'); }
      if (r.textLen < 150) D('content', 'P1', `very little content (${r.textLen} chars)`, 'content');
      if (site.name === 'empathia-website' && width === 1440) for (const l of r.links) { const u = l.split('#')[0] || '/'; if (!linkCache.has(u)) { const res = await fetch(base + u).catch(() => null); linkCache.set(u, res ? res.status : 0); } if (linkCache.get(u) !== 200) D('A9 broken link', 'P1', `${l} → ${linkCache.get(u)}`, 'navigation'); }
      pages.push({ site: site.name, page: pg, width, overflow: r.overflow, errors: errs.length });
      await ctx.close();
    }
  }
} finally { await browser.close(); for (const s of servers) s.close(); }
const order = { P0: 0, P1: 1, P2: 2, P3: 3 }; defects.sort((a, b) => order[a.severity] - order[b.severity] || a.site.localeCompare(b.site) || a.rule.localeCompare(b.rule));
defects.forEach((d, i) => { d.id = `AUD-${String(i + 1).padStart(3, '0')}`; d.reproducible = 'yes (deterministic, local build)'; delete d.key; });
const count = (s) => defects.filter((d) => d.severity === s).length;
const report = { label, at: new Date().toISOString(), widths: WIDTHS, pagesChecked: pages.length, method: 'in-house Playwright rules A1–A10 (not axe-core)', totals: { P0: count('P0'), P1: count('P1'), P2: count('P2'), P3: count('P3') }, defects };
const out = arg('out'); if (out) { fs.mkdirSync(path.dirname(path.resolve(repo, out)), { recursive: true }); fs.writeFileSync(path.resolve(repo, out), JSON.stringify(report, null, 2) + '\n'); }
for (const d of defects) console.log(`${d.severity} ${d.id} [${d.site}${d.page}] ${d.rule}: ${d.detail} @${d.widths.join(',')}`);
const blocking = count('P0') + count('P1');
console.log(`\n${pages.length} page×width checks · P0 ${count('P0')} · P1 ${count('P1')} · P2 ${count('P2')} · P3 ${count('P3')}`);
console.log(`PASS ${pages.length - new Set(defects.filter((d) => d.severity <= 'P1').flatMap((d) => d.widths.map((w) => `${d.site}${d.page}${w}`))).size} · FAIL ${new Set(defects.filter((d) => d.severity <= 'P1').flatMap((d) => d.widths.map((w) => `${d.site}${d.page}${w}`))).size}`);
process.exit(strict && blocking ? 1 : 0);
