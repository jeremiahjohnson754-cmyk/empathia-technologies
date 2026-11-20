import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module'; const require = createRequire('/home/claude/empathia-technologies/package.json');
const { chromium } = require('playwright');
const root = process.argv[2]; const out = process.argv[3]; const pages = process.argv.slice(4);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff': 'font/woff', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; else if (!path.extname(p)) p += '/index.html'; const f = path.join(root, p); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(4391);
const b = await chromium.launch();
for (const [w, h, tag] of [[390, 844, 'phone'], [1440, 900, 'desktop']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }); const pg = await ctx.newPage();
  for (const p of pages) { const [url, sel] = p.split('|'); await pg.goto('http://127.0.0.1:4391' + url); if (sel) await pg.locator(sel).first().scrollIntoViewIfNeeded();
    const over = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const name = `${tag}${url.replace(/[\/#]/g, '_')}.png`; await pg.screenshot({ path: path.join(out, name), fullPage: !sel }); console.log(name, 'overflowX=' + over); }
  await ctx.close(); }
await b.close(); srv.close();
