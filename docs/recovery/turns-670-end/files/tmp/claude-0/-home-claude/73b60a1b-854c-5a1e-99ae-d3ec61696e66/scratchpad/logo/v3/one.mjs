import fs from 'node:fs'; import path from 'node:path';
const { chromium } = await import('/home/claude/empathia-technologies/node_modules/playwright/index.mjs');
const [,, file, out, bg='#0c0d10', size='900'] = process.argv;
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:+size,height:+size}});
await p.setContent(`<body style="margin:0;background:${bg};display:grid;place-items:center;height:100vh"><img src="data:image/svg+xml;base64,${fs.readFileSync(file).toString('base64')}" width="${+size-40}" height="${+size-40}"></body>`);
await p.screenshot({path:out}); await b.close();
