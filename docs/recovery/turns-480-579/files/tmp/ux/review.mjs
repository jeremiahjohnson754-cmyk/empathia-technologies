// Final UX review sweep: every page at 360, 768 and 1440; overflow, broken images, failed requests, console errors, tiny text, clipped text.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire('/home/claude/empathia-technologies/package.json'); const { chromium } = require('playwright');
const [root, port, outDir, ...pages] = process.argv.slice(2);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff': 'font/woff', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.vtt': 'text/vtt', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; else if (!path.extname(p)) p += '/index.html'; const f = path.join(root, p); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(Number(port));
const b = await chromium.launch(); const findings = [];
for (const [w, h] of [[360, 780], [768, 1024], [1440, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }); const pg = await ctx.newPage();
  for (const p of pages) {
    const errs = []; const bad = [];
    const onErr = (e) => errs.push(String(e.message || e)); const onCon = (m) => { if (m.type() === 'error') errs.push(m.text()); }; const onResp = (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); };
    pg.on('pageerror', onErr); pg.on('console', onCon); pg.on('response', onResp);
    await pg.goto(`http://127.0.0.1:${port}${p}`); await pg.waitForTimeout(600);
    await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); });
    await pg.waitForTimeout(400);
    const r = await pg.evaluate(() => {
      const over = document.documentElement.scrollWidth - innerWidth;
      const imgs = Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src'));
      const small = new Set(); const clipped = [];
      for (const el of document.querySelectorAll('body *')) {
        if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('[aria-hidden=true],.sr,.ui-sr,.ui-visually-hidden')) continue;
        const fs = parseFloat(cs.fontSize); if (fs < 12) small.add(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} ${fs}px "${el.textContent.trim().slice(0, 30)}"`);
        if ((cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 2 && cs.whiteSpace !== 'normal') clipped.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} "${el.textContent.trim().slice(0, 40)}"`);
      }
      const offscreen = Array.from(document.querySelectorAll('a,button,input,select,textarea')).filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > innerWidth + 1 || b.left < -1) && !e.closest('[class*=scroll],[style*=overflow]'); }).map((e) => (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30));
      return { over, imgs, small: [...small].slice(0, 6), clipped: clipped.slice(0, 6), offscreen: offscreen.slice(0, 6), h1: (document.querySelector('h1') || {}).textContent || '' };
    });
    const shot = path.join(outDir, `${w}${p.replace(/[\/#?=&]/g, '_') || '_home'}.png`); await pg.screenshot({ path: shot });
    const issues = []; if (r.over > 0) issues.push('overflowX=' + r.over); if (r.imgs.length) issues.push('broken images ' + r.imgs.join(' ')); if (bad.length) issues.push('http ' + bad.slice(0, 3).join(' ')); if (errs.length) issues.push('errors ' + errs.slice(0, 2).join(' | ')); if (r.small.length) issues.push('text<12px ' + r.small.join('; ')); if (r.clipped.length) issues.push('clipped ' + r.clipped.join('; ')); if (r.offscreen.length) issues.push('controls offscreen ' + r.offscreen.join('; '));
    findings.push({ w, p, h1: r.h1.trim().slice(0, 50), issues });
    pg.off('pageerror', onErr); pg.off('console', onCon); pg.off('response', onResp);
  }
  await ctx.close(); }
await b.close(); srv.close();
for (const f of findings) if (f.issues.length) console.log(`${f.w} ${f.p} [${f.h1}]\n   - ${f.issues.join('\n   - ')}`);
console.log(`checked ${findings.length}; with issues ${findings.filter((f) => f.issues.length).length}`);
