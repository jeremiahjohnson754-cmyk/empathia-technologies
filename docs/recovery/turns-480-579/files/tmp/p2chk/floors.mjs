import { spawn } from 'node:child_process'; import { createRequire } from 'node:module';
const require = createRequire('/home/claude/empathia-technologies/package.json'); const { chromium } = require('playwright');
const srv = spawn(process.execPath, ['apps/demo/server/serve.mjs', '--port=4390'], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 1500));
const b = await chromium.launch();
for (const [w, h, route, name] of [[1440, 900, 'ATL/4', 'f-atl4-1440'], [390, 844, 'ATL/4', 'f-atl4-390'], [1440, 900, 'NST/2', 'f-nst2-1440'], [1440, 900, 'MER/1', 'f-mer1-1440']]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' })).newPage();
  await p.goto('http://127.0.0.1:4390/#/campus/' + route); await p.waitForTimeout(1500);
  const fig = await p.$('.cv__plate'); if (fig) await fig.screenshot({ path: `/tmp/p2chk/${name}.png` }); else console.log('no plate', route);
}
await b.close(); srv.kill();
