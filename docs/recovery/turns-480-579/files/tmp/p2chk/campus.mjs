import { spawn } from 'node:child_process'; import { createRequire } from 'node:module';
const require = createRequire('/home/claude/empathia-technologies/package.json'); const { chromium } = require('playwright');
const srv = spawn(process.execPath, ['apps/demo/server/serve.mjs', '--port=4388'], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 1500));
const b = await chromium.launch();
for (const [w, h] of [[1440, 900], [390, 844]]) { const p = await (await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' })).newPage();
  await p.goto('http://127.0.0.1:4388/#/campus'); await p.waitForTimeout(2500); await p.screenshot({ path: `/tmp/p2chk/campus-${w}.png`, fullPage: w > 1000 ? false : false }); }
await b.close(); srv.kill();
