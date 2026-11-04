// Local preview of direction.html: one PNG per .frame. Run from the main repo root so playwright resolves:
//   node /home/claude/wt-design/docs/design/direction/preview.mjs <direction.html> <outdir>
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/');
const { chromium } = require('playwright');
const [,, html, out] = process.argv;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const p = await b.newPage({ viewport: { width: 1520, height: 1100 } });
await p.goto('file://' + html); await p.waitForTimeout(300);
let i = 0;
for (const f of await p.$$('.frame')) { const n = await f.getAttribute('data-name'); await f.screenshot({ path: `${out}/${String(++i).padStart(2, '0')}-${n.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png` }); }
await b.close(); console.log('frames', i);
