import { spawn } from 'node:child_process'; import { createRequire } from 'node:module';
const require = createRequire('/home/claude/empathia-technologies/package.json'); const { chromium } = require('playwright');
const srv = spawn(process.execPath, ['apps/demo/server/serve.mjs', '--port=4391'], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 1500));
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })).newPage();
await p.goto('http://127.0.0.1:4391/#/v25/fi/scan/R-ATL-4-218?mode=observe&step=40'); await p.waitForTimeout(2500); await p.screenshot({ path: '/tmp/p2chk/fi-1440-a.png' });
await p.mouse.wheel(0, 800); await p.waitForTimeout(500); await p.screenshot({ path: '/tmp/p2chk/fi-1440-b.png' });
await b.close(); srv.kill();
