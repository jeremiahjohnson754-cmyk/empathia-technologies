import fs from 'node:fs';
const { chromium } = await import('/home/claude/empathia-technologies/node_modules/playwright/index.mjs');
const B='/home/claude/empathia-technologies/packages/design-tokens/brand';
const jobs=[['emblem-small.svg','favicon-32.png',32],['app-tile.svg','apple-touch-icon.png',180],['app-tile.svg','icon-192.png',192],['app-tile.svg','icon-512.png',512],['emblem.svg','emblem-1024.png',1024]];
const b=await chromium.launch();
for (const [src,out,s] of jobs){ const p=await b.newPage({viewport:{width:s,height:s}});
  await p.setContent(`<html><body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${fs.readFileSync(B+'/'+src).toString('base64')}" width="${s}" height="${s}" style="display:block"></body></html>`);
  await p.screenshot({path:B+'/'+out, omitBackground:true}); await p.close(); }
await b.close(); console.log('ok');
