#!/usr/bin/env node
// A built dist must carry no source map and no development-only API override (red-team RT-05, RT-20). Exit 1 with the offending files.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
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
    for (const k of fs.readdirSync(media).filter((x) => x !== 'founder')) { const f = films.find((x) => x.key === k); if (!f) bad.push(`apps/website/dist/media/${k}: not in films.json`); else if (f.rights?.website?.status !== 'VERIFIED' && m.films?.mode !== 'preview') bad.push(`apps/website/dist/media/${k}: website rights ${f.rights?.website?.status || 'NONE'} in a publishable build`); }
    if (m.films?.mode === 'preview') console.log('dist hygiene: NOTE apps/website/dist is a PREVIEW build (unverified films included) — not publishable'); } }
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
console.log('dist hygiene: no source maps, no dev override');
