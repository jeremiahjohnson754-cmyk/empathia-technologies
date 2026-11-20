import fs from 'node:fs'; import path from 'node:path';
const repo='/home/claude/empathia-technologies'; const S=process.argv[2];
const { chromium } = await import(path.join(repo,'node_modules/playwright/index.mjs'));
const dir=path.join(repo,'media/brand/concepts'); const files=fs.readdirSync(dir).filter(f=>f.endsWith('.svg')).sort();
const cell=(f,s,bg)=>`<div style="background:${bg};padding:10px;display:grid;place-items:center"><img src="data:image/svg+xml;base64,${fs.readFileSync(path.join(dir,f)).toString('base64')}" width="${s}" height="${s}"></div>`;
const rows=files.map(f=>`<div style="display:flex;gap:8px;align-items:center;font:12px sans-serif"><div style="width:170px">${f}</div>${[256,64,32,16].map(s=>cell(f,s,'#f6f6f4')).join('')}${[256,64,32,16].map(s=>cell(f,s,'#0c0d10')).join('')}</div>`).join('');
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:400},deviceScaleFactor:1});
await p.setContent(`<body style="margin:12px;background:#888;display:grid;gap:8px">${rows}</body>`); await p.screenshot({path:S+'/sheet.png',fullPage:true}); await b.close(); console.log('ok');
