import { spawn } from 'node:child_process'; import path from 'node:path';
const repo = '/home/claude/empathia-technologies'; const S = process.argv[2];
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const srv = spawn(process.execPath, [path.join(repo, 'apps/demo/server/serve.mjs'), '--port=4462'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2000)); const b = await chromium.launch();
const pages = [['start', '#/investor', null], ['viewas', '#/investor', 'sheet'], ['room', '#/campus/ATL/4/R-ATL-4-218', null], ['search', '#/search?q=projector', null]];
for (const scheme of ['light', 'dark']) for (const [w, h] of [[390, 844], [1440, 900]]) for (const [name, href, act] of pages) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: w < 800 ? 2 : 1 }); const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:4462/' + href); await p.waitForTimeout(2500);
  if (act === 'sheet') { await p.click('[data-testid=viewas-open]'); await p.waitForFunction(() => { const e = document.querySelector('[data-testid=viewas-sheet] .va-list'); return e && !/Counting/.test(e.textContent); }, null, { timeout: 20000 }); await p.waitForTimeout(500); }
  await p.screenshot({ path: `${S}/shots/${name}-${scheme}-${w}.png` }); await ctx.close();
}
await b.close(); srv.kill(); console.log('ok');
