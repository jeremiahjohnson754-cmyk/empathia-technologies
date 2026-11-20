#!/usr/bin/env node
/**
 * The two link-preview images (1200 × 630) for the public sites, so a shared link shows Empathia, not a blank card (founder, 19 Nov 2026
 * 06:08: "getting everything live on both websites ... so we can send and share this all with people"). Committed, like the other brand
 * files; drawn from the brand itself (the emblem, Inter, the dark theme's colours), nothing generated or borrowed.
 *   node packages/design-tokens/make-share-cards.mjs   →  brand/share-website.jpg, brand/share-demo.jpg
 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)); const B = path.join(here, 'brand'); const F = path.join(here, 'fonts'); const repo = path.resolve(here, '../..');
const font = (f, w) => `@font-face{font-family:I;font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(path.join(F, f)).toString('base64')}) format("woff2")}`;
const emblem = `data:image/svg+xml;base64,${fs.readFileSync(path.join(B, 'emblem.svg')).toString('base64')}`;
const CARDS = [
  ['share-website.jpg', 'Empathia Technologies', 'Every room, every device, every decision, with its evidence.', 'Engineering, AV and UC operations, spaces, service and learning in one record.'],
  ['share-demo.jpg', 'Empathia Living Campus', 'The platform, open in your browser.', 'An interactive demonstration on a synthetic campus: rooms, devices, commissioning, service and SIGNAL.'],
];
const html = (name, head, sub) => `<!doctype html><html><head><style>${font('inter-500.woff2', 500)}${font('inter-600.woff2', 600)}${font('inter-display-800.woff2', 800)}
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;background:#070d1a;color:#edf3ff;font-family:I,sans-serif;position:relative;overflow:hidden}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(180,193,220,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(180,193,220,.06) 1px,transparent 1px);background-size:56px 56px}
.glow{position:absolute;right:-180px;top:-220px;width:760px;height:760px;border-radius:50%;background:radial-gradient(closest-side,rgba(69,207,193,.22),transparent)}
.wrap{position:absolute;inset:72px 80px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:20px;font-weight:600;font-size:34px;letter-spacing:-.01em}.brand img{width:76px;height:76px}
h1{margin-top:auto;font-weight:800;font-size:68px;line-height:1.04;letter-spacing:-.025em;max-width:960px}
p{margin-top:24px;font-weight:500;font-size:28px;line-height:1.35;color:#b4c1dc;max-width:900px}.bar{position:absolute;left:0;right:0;bottom:0;height:10px;background:#45cfc1}
</style></head><body><div class="grid"></div><div class="glow"></div><div class="wrap"><div class="brand"><img src="${emblem}" alt="">${name}</div><h1>${head}</h1><p>${sub}</p></div><div class="bar"></div></body></html>`;
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const b = await chromium.launch();
for (const [out, name, head, sub] of CARDS) { const p = await b.newPage({ viewport: { width: 1200, height: 630 } }); await p.setContent(html(name, head, sub)); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: path.join(B, out), type: 'jpeg', quality: 88 }); await p.close(); console.log(`${out}: ${fs.statSync(path.join(B, out)).size} bytes`); }
await b.close();
