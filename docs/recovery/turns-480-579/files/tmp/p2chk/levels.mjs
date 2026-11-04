import { spawn } from 'node:child_process'; import { createRequire } from 'node:module';
const require = createRequire('/home/claude/empathia-technologies/package.json'); const { chromium } = require('playwright');
const srv = spawn(process.execPath, ['apps/demo/server/serve.mjs', '--port=4389'], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 1500));
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })).newPage();
await p.goto('http://127.0.0.1:4389/#/campus'); await p.waitForTimeout(2000);
await p.getByText('Atlas Tower').first().click(); await p.waitForTimeout(1500); await p.screenshot({ path: '/tmp/p2chk/bld.png' }); console.log(await p.evaluate(() => location.hash));
const floorLinks = await p.$$eval('a[href*="#/campus/"]', (as) => as.map((a) => a.getAttribute('href'))); console.log(floorLinks.slice(0, 20));
const f4 = floorLinks.find((h) => /\/4$|-4$|L04|F04/.test(h)); if (f4) { await p.goto('http://127.0.0.1:4389/' + f4); await p.waitForTimeout(1500); await p.screenshot({ path: '/tmp/p2chk/floor.png' }); console.log(f4); }
await b.close(); srv.kill();
