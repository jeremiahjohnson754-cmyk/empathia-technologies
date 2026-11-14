#!/usr/bin/env node
// A built dist must carry no source map and no development-only API override (red-team RT-05, RT-20). Exit 1 with the offending files.
import fs from 'node:fs'; import crypto from 'node:crypto'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const walk = (d) => fs.readdirSync(d).flatMap((f) => { const x = path.join(d, f); return fs.statSync(x).isDirectory() ? walk(x) : [x]; });
const bad = [];
for (const a of ['apps/enterprise-web/dist', 'apps/demo/dist', 'apps/website/dist', 'apps/founder-studio/dist']) {
  const d = path.join(root, a); if (!fs.existsSync(d)) continue;
  for (const f of walk(d)) {
    if (f.endsWith('.map')) bad.push(path.relative(root, f) + ': source map in dist');
    if (f.endsWith('.js') && a.includes('enterprise-web') && /get\("api"\)/.test(fs.readFileSync(f, 'utf8'))) bad.push(path.relative(root, f) + ': development API override in a production build');
  }
}
// website films: only a film VERIFIED for the website may be in a publishable build (a --films=preview build says so in its manifest)
{ const d = path.join(root, 'apps/website/dist'); const man = path.join(d, 'BUILD_MANIFEST.json'); const media = path.join(d, 'media');
  if (fs.existsSync(man) && fs.existsSync(media)) { const m = JSON.parse(fs.readFileSync(man, 'utf8')); const films = JSON.parse(fs.readFileSync(path.join(root, 'apps/website/films.json'), 'utf8')).films;
    // product captures: only files whose sha256 is listed in apps/website/media/product/PROVENANCE.json (synthetic demonstration, dark, D43)
    const prov = path.join(root, 'apps/website/media/product/PROVENANCE.json'); const listed = new Set(fs.existsSync(prov) ? Object.values(JSON.parse(fs.readFileSync(prov, 'utf8')).captures || {}).flatMap((c) => Object.values(c.files || {})) : []);
    if (fs.existsSync(path.join(media, 'product'))) for (const f of fs.readdirSync(path.join(media, 'product'))) { const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(media, 'product', f))).digest('hex'); if (!listed.has(h)) bad.push(`apps/website/dist/media/product/${f}: not listed in PROVENANCE.json`); }
    // short scenes: only clips VERIFIED for the website in apps/website/broll.json
    if (fs.existsSync(path.join(media, 'broll'))) { const cat = JSON.parse(fs.readFileSync(path.join(root, 'apps/website/broll.json'), 'utf8')).clips; for (const k of fs.readdirSync(path.join(media, 'broll'))) { const c = cat.find((x) => x.key === k); if (!c || c.rights?.website?.status !== 'VERIFIED') bad.push(`apps/website/dist/media/broll/${k}: not VERIFIED in broll.json`); } }
    for (const k of fs.readdirSync(media).filter((x) => x !== 'founder' && x !== 'product' && x !== 'broll')) { const f = films.find((x) => x.key === k); if (!f) bad.push(`apps/website/dist/media/${k}: not in films.json`); else if (f.rights?.website?.status !== 'VERIFIED' && m.films?.mode !== 'preview') bad.push(`apps/website/dist/media/${k}: website rights ${f.rights?.website?.status || 'NONE'} in a publishable build`); }
    if (m.films?.mode === 'preview') console.log('dist hygiene: NOTE apps/website/dist is a PREVIEW build (unverified films included) — not publishable'); } }
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
console.log('dist hygiene: no source maps, no dev override');
