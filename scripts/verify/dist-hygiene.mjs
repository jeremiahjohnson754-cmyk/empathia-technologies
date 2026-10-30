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
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
console.log('dist hygiene: no source maps, no dev override');
