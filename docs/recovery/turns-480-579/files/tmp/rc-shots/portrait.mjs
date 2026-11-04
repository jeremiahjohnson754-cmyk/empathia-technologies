import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire('/home/claude/empathia-technologies/package.json'); const { chromium } = require('playwright');
const root = 'apps/website/dist'; const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff': 'font/woff', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; else if (!path.extname(p)) p += '/index.html'; const f = path.join(root, p); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(4392);
const b = await chromium.launch(); const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
for (const u of ['/', '/founder']) { await pg.goto('http://127.0.0.1:4392' + u); const img = pg.locator('img[src*="founder"]').first(); await img.scrollIntoViewIfNeeded(); await pg.waitForTimeout(800);
  const s = await img.evaluate((i) => ({ complete: i.complete, w: i.naturalWidth, cur: i.currentSrc, vis: getComputedStyle(i).opacity + '/' + getComputedStyle(i).visibility, box: i.getBoundingClientRect().width }));
  console.log(u, JSON.stringify(s)); await pg.screenshot({ path: `/tmp/rc-shots/portrait${u.replace(/\//g, '_')}.png` }); }
await b.close(); srv.close();
