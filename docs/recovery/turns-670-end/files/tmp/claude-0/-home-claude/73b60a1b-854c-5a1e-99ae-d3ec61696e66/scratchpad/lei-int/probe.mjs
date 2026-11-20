import { spawn } from 'node:child_process'; import path from 'node:path';
const repo = '/home/claude/empathia-technologies';
const { chromium } = await import(path.join(repo, 'node_modules/playwright/index.mjs'));
const srv = spawn(process.execPath, [path.join(repo, 'apps/demo/server/serve.mjs'), '--port=4461'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2000));
const b = await chromium.launch();
for (const w of [360, 1440]) {
  const p = await b.newPage({ viewport: { width: w, height: 800 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://127.0.0.1:4461/#/investor'); await p.waitForTimeout(3000);
  const r = await p.evaluate(() => { const e = document.querySelector('[data-testid=viewas-open]'); const t = document.querySelector('[data-testid=theme-switch]');
    const box = (x) => x ? (({ x: a, y, width, height }) => ({ a: Math.round(a), y: Math.round(y), w: Math.round(width), h: Math.round(height) }))(x.getBoundingClientRect()) : null;
    return { va: !!e, vaBox: box(e), vaStyle: e ? getComputedStyle(e).visibility + '/' + getComputedStyle(e).display : null, theme: box(t), actions: document.querySelector('.shell__actions, .shell__bar')?.outerHTML.slice(0, 1500) }; });
  console.log(w, JSON.stringify(r, null, 1), errs);
  await p.screenshot({ path: `/tmp/claude-0/-home-claude/73b60a1b-854c-5a1e-99ae-d3ec61696e66/scratchpad/lei-int/probe-${w}.png` });
}
await b.close(); srv.kill();
