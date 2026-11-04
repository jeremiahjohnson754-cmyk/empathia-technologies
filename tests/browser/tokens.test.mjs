#!/usr/bin/env node
// Design tokens v2 in a real browser: the built tokens.css + fonts.css + theme-init.js on a scratch page served from a free port.
// Checks the theme contract (system default, a stored manual choice always wins, data-theme on any element, stages stay dark), that
// theme-init applies the choice before first paint, that the self-hosted Inter faces load, and that the colour-scheme helper works.
//   node tests/browser/tokens.test.mjs                 (needs node packages/design-tokens/build-tokens.mjs)
//   PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs tests/browser/tokens.test.mjs
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const dist = path.join(repo, 'packages/design-tokens/dist');
const T = JSON.parse(fs.readFileSync(path.join(repo, 'packages/design-tokens/tokens.json'), 'utf8'));
let failed = 0, passed = 0;
const ok = (id, name, cond, detail = '') => { if (cond) passed += 1; else failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name}${cond ? '' : ' — ' + String(detail).slice(0, 300)}`); };
const forced = process.env.EMPATHIA_FORCED_COLOR_SCHEME || null;

const page = (theme) => `<!doctype html><html lang="en"${theme ? ` data-theme="${theme}"` : ''}><head><meta charset="utf-8"><script src="/theme-init.js"></script>
<link rel="preload" href="/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/tokens.css">
<style>body{background:var(--bg);color:var(--tx);font-family:var(--font-sans)} h1{font:800 40px var(--font-display)}</style></head>
<body><h1 id="h">Empathia</h1><p id="p">The living system</p><section id="inv" data-theme="light"><b id="inv-b">light island</b></section>
<section id="inv2" data-theme="dark"><b id="inv2-b">dark island</b></section><div id="stage" data-stage><b id="stage-b">stage</b></div></body></html>`;
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); const theme = u.searchParams.get('theme');
  if (u.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html', 'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'" }); return res.end(page(theme)); }
  const f = path.join(dist, path.normalize(u.pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!f.startsWith(dist) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  const type = { '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2' }[path.extname(f)] || 'application/octet-stream';
  res.writeHead(200, { 'content-type': type }); res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const probe = (p) => p.evaluate(() => { const v = (el, k) => getComputedStyle(el).getPropertyValue(k).trim(); const $ = (id) => document.getElementById(id);
  return { attr: document.documentElement.getAttribute('data-theme'), bg: v(document.documentElement, '--bg'), scheme: v(document.documentElement, 'color-scheme'), inv: v($('inv-b'), '--bg'), inv2: v($('inv2-b'), '--bg'), stage: v($('stage-b'), '--bg'), accent: v(document.documentElement, '--accent'), mc: v(document.documentElement, '--p-mission-control') }; });
const D = T.color.bg.dark, L = T.color.bg.light;

try {
  // the colour-scheme helper: a context with no colorScheme gets the forced one
  { const ctx = await browser.newContext(); const p = await ctx.newPage(); await p.goto(base + '/');
    const dark = await p.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches);
    ok('TK-01', `contexts follow PW_COLOR_SCHEME (${forced || 'unset → light default'})`, forced === 'dark' ? dark : !dark, `dark=${dark}`); await ctx.close(); }

  for (const sys of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: sys }); const p = await ctx.newPage();
    await p.goto(base + '/'); let s = await probe(p);
    ok(`TK-sys-${sys}-1`, `system ${sys}, nothing chosen: the page follows the system (D9)`, s.bg === (sys === 'dark' ? D : L) && s.scheme === sys && s.attr === null, JSON.stringify(s));
    ok(`TK-sys-${sys}-2`, `system ${sys}: data-theme on an element applies to its subtree both ways`, s.inv === L && s.inv2 === D, JSON.stringify(s));
    ok(`TK-sys-${sys}-3`, `system ${sys}: a spatial stage stays Graphite (D36)`, s.stage === D, JSON.stringify(s));
    ok(`TK-sys-${sys}-4`, `system ${sys}: teal is the accent, products have their own colours`, s.accent === T.color.accent[sys] && s.mc === T.product['mission-control'][sys], JSON.stringify(s));
    // a page authored dark-only follows the system once theme-init runs (nothing stored)
    await p.goto(base + '/?theme=dark'); s = await probe(p);
    ok(`TK-sys-${sys}-5`, `system ${sys}: theme-init lifts an authored dark-only theme when nothing is chosen`, s.attr === null && s.bg === (sys === 'dark' ? D : L), JSON.stringify(s));
    for (const choice of ['light', 'dark']) {
      await p.evaluate((c) => localStorage.setItem('empathia.theme', c), choice);
      await p.goto(base + '/'); s = await probe(p);
      ok(`TK-${sys}-${choice}`, `system ${sys}, ${choice} chosen: the manual choice wins (D9)`, s.attr === choice && s.bg === (choice === 'dark' ? D : L) && s.stage === D, JSON.stringify(s));
    }
    await p.evaluate(() => localStorage.setItem('empathia.theme', 'system')); await p.goto(base + '/'); s = await probe(p);
    ok(`TK-sys-${sys}-6`, `system ${sys}, System chosen: follows the system again`, s.attr === null && s.bg === (sys === 'dark' ? D : L), JSON.stringify(s));
    await ctx.close();
  }
  // no flash: with Light stored on a dark device, data-theme="light" is already on <html> when <body> is first parsed. theme-init is a
  // blocking script ahead of the render-blocking stylesheets, so no frame can be painted with the system's theme first.
  { const ctx = await browser.newContext({ colorScheme: 'dark' }); const p = await ctx.newPage(); await p.goto(base + '/');
    await p.evaluate(() => localStorage.setItem('empathia.theme', 'light'));
    await p.addInitScript(() => { window.__first = null; new MutationObserver(() => { if (document.body && window.__first === null) window.__first = document.documentElement.getAttribute('data-theme'); }).observe(document, { childList: true, subtree: true }); });
    await p.goto(base + '/'); const first = await p.evaluate(() => window.__first);
    ok('TK-noflash', 'a stored Light choice on a dark device is in force when <body> first exists (no flash)', first === 'light', `data-theme when <body> appeared: ${first}`); await ctx.close(); }
  // storage blocked: the page still renders, as authored
  { const ctx = await browser.newContext({ colorScheme: 'light' }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
    await p.goto(base + '/?theme=dark'); const s = await probe(p);
    ok('TK-storage-blocked', 'storage that throws: no error, the page keeps its authored theme', errs.length === 0 && s.attr === 'dark' && s.bg === D, JSON.stringify({ errs, s })); await ctx.close(); }
  // Inter: the faces load from /fonts and the heading uses Inter Display 800
  { const ctx = await browser.newContext(); const p = await ctx.newPage(); const reqs = []; p.on('request', (r) => reqs.push(r.url()));
    await p.goto(base + '/'); await p.evaluate(() => document.fonts.ready);
    const f = await p.evaluate(async () => { await document.fonts.load('800 40px "Inter Display"'); await document.fonts.load('400 15px Inter'); return { display: document.fonts.check('800 40px "Inter Display"'), body: document.fonts.check('400 15px Inter'), family: getComputedStyle(document.getElementById('p')).fontFamily, loaded: [...document.fonts].filter((x) => x.status === 'loaded').map((x) => `${x.family} ${x.weight}`) }; });
    ok('TK-fonts-1', 'Inter and Inter Display load from the self-hosted WOFF2 (D7)', f.display && f.body && /^"?Inter"?,/.test(f.family), JSON.stringify(f));
    ok('TK-fonts-2', 'fonts come from this origin only', reqs.every((u) => u.startsWith(base)), reqs.filter((u) => !u.startsWith(base)).join(' '));
    await ctx.close(); }
} finally { await browser.close(); server.close(); }
console.log(`\n${passed}/${passed + failed} PASS${forced ? ` (PW_COLOR_SCHEME=${forced})` : ''}`);
process.exit(failed ? 1 : 0);
