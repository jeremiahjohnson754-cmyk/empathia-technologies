// Lays out direction.html in Chrome and writes one compact JSON per .frame (boxes, text runs, SVGs) that
// figma-build.js turns into editable Figma layers. Run from the main repo root (playwright):
//   node /home/claude/wt-design/docs/design/direction/extract.mjs <direction.html> <outdir>
import { createRequire } from 'node:module'; import fs from 'node:fs';
const require = createRequire(process.cwd() + '/');
const { chromium } = require('playwright');
const [,, html, out] = process.argv;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const p = await b.newPage({ viewport: { width: 1520, height: 1100 } });
await p.goto('file://' + html); await p.waitForTimeout(300);
const frames = await p.$$eval('.frame', (fs) => fs.map((F) => {
  const R = F.getBoundingClientRect(); const items = [];
  const rgba = (s) => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); const a = v[3] ?? 1; return a === 0 ? null : [+(v[0] / 255).toFixed(3), +(v[1] / 255).toFixed(3), +(v[2] / 255).toFixed(3), +a.toFixed(3)]; };
  const grad = (s) => { if (!s || s === 'none') return null; const ang = (s.match(/(-?\d+)deg/) || [0, 180])[1]; const cols = [...s.matchAll(/rgba?\([^)]+\)(\s+[\d.]+%)?/g)].map((m) => [rgba(m[0]) || [0, 0, 0, 0], m[1] ? parseFloat(m[1]) / 100 : null]); if (cols.length < 2) return null; cols.forEach((c, i) => { if (c[1] == null) c[1] = i / (cols.length - 1); }); return { r: s.startsWith('radial') ? 'R' : 'L', a: +ang, s: cols }; };
  const walk = (el, depth) => {
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect(); const x = Math.round(r.left - R.left), y = Math.round(r.top - R.top), w = Math.round(r.width), h = Math.round(r.height);
    if (w <= 0 || h <= 0 || x > R.width || y > R.height) return;
    if (el.tagName.toLowerCase() === 'svg') { const s = el.cloneNode(true); s.setAttribute('width', w); s.setAttribute('height', h); s.removeAttribute('class'); s.removeAttribute('style'); items.push({ t: 'v', x, y, w, h, svg: s.outerHTML.replace(/currentColor/g, cs.color) }); return; }
    if (el !== F) {
      const bg = rgba(cs.backgroundColor), g = grad(cs.backgroundImage), bw = parseFloat(cs.borderTopWidth) || 0, bc = rgba(cs.borderTopColor);
      const bb = parseFloat(cs.borderBottomWidth) || 0, bbc = rgba(cs.borderBottomColor);
      const rad = parseFloat(cs.borderTopLeftRadius) || 0; const blur = (cs.filter.match(/blur\(([\d.]+)px/) || [])[1];
      const sh = cs.boxShadow !== 'none' && /0px\s+(\d+)px\s+(\d+)px\s+-?\d+px/.test(cs.boxShadow) && !cs.boxShadow.includes('inset') ? 1 : (cs.boxShadow.match(/(\d+)px (\d+)px -\d+px/) ? 1 : 0);
      const op = +cs.opacity;
      if (bg || g || (bw && bc) || (bb && bbc)) items.push({ t: 'r', x, y, w, h, bg, g, bw: bw && bc ? bw : 0, bc, bb: !bw && bb && bbc ? [bb, bbc] : null, rad: Math.min(rad, Math.min(w, h) / 2), blur: blur ? +blur : 0, sh, op: op < 1 ? op : undefined, cl: cs.overflow === 'hidden' ? 1 : 0 });
    }
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.textContent.trim()) {
        const rg = document.createRange(); rg.selectNodeContents(n); const rs = [...rg.getClientRects()]; if (!rs.length) continue;
        const L = Math.min(...rs.map((q) => q.left)), T = Math.min(...rs.map((q) => q.top)), Rt = Math.max(...rs.map((q) => q.right)), B = Math.max(...rs.map((q) => q.bottom));
        const pc = getComputedStyle(n.parentElement); const tt = pc.textTransform === 'uppercase' ? n.textContent.toUpperCase() : n.textContent;
        items.push({ t: 'x', x: Math.round(L - R.left), y: Math.round(T - R.top), w: Math.ceil(Rt - L) + 2, h: Math.round(B - T), s: tt.replace(/\s+/g, ' ').trim(), fs: parseFloat(pc.fontSize), fw: +pc.fontWeight, lh: parseFloat(pc.lineHeight) || null, ls: parseFloat(pc.letterSpacing) || 0, c: rgba(pc.color), al: pc.textAlign === 'center' ? 'C' : 'L', ml: rs.length > 1 ? 1 : 0, op: +getComputedStyle(n.parentElement.closest('[style*=opacity]') || n.parentElement).opacity });
      } else if (n.nodeType === 1) walk(n, depth + 1);
    }
  };
  walk(F, 0);
  return { name: F.dataset.name, w: Math.round(R.width), h: Math.round(R.height), bg: getComputedStyle(F).backgroundColor, items };
}));
fs.mkdirSync(out, { recursive: true });
frames.forEach((f, i) => fs.writeFileSync(`${out}/f${String(i + 1).padStart(2, '0')}.json`, JSON.stringify(f)));
console.log(frames.map((f, i) => `${i + 1} ${f.name} ${f.items.length} ${JSON.stringify(f).length}`).join('\n'));
await b.close();
