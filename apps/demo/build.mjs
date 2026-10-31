#!/usr/bin/env node
/**
 * Build the investor demo into apps/demo/dist: index.html, demo.js (esbuild bundle of src/ with @empathia/ui and
 * @empathia/api-client from source), demo.css (design tokens + ui.css + demo.css), and a manifest with hashes.
 *   node apps/enterprise-web/build.mjs [--dev]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const app = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(app, '../..');
const dist = path.join(app, 'dist');
const dev = process.argv.includes('--dev');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
fs.rmSync(dist, { recursive: true, force: true }); fs.mkdirSync(dist, { recursive: true });
// the legacy area registry from the parity ledger (docs/legacy-parity.csv): generated, never edited
{ const csv = fs.readFileSync(path.join(repo, 'docs/legacy-parity.csv'), 'utf8').split('\n').slice(1).filter(Boolean).map((l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')));
  const row = (r) => ({ key: r[2].replace(/^v25\//, 'v25.'), label: r[3].split(' — ')[0], target: r[7], status: r[10], newRoute: r[8] });
  const areas = csv.filter((r) => r[0] === 'Living Campus' && (r[1] === 'area' || r[1] === 'v25 page')).map(row);   // V2.5 pages resolve as v25.<page>
  fs.mkdirSync(path.join(app, 'src/generated'), { recursive: true }); fs.writeFileSync(path.join(app, 'src/generated/parity.json'), JSON.stringify(areas, null, 1));
  // the demonstrator's role × area visibility matrix (AZ_KEYS × areas), verbatim from the inventory: the policy page shows it, never edits it
  const inv = JSON.parse(fs.readFileSync(path.join(repo, 'legacy/inventory/v253-inventory.json'), 'utf8'));
  fs.writeFileSync(path.join(app, 'src/generated/area-roles.json'), JSON.stringify({ roles: inv.uiRoles, areas: inv.areas.map((a) => ({ key: a.area, label: a.label, roles: a.roles })) }, null, 1)); }
// the SIGNAL library ships beside the bundle and is fetched on demand by Learn (2 MB; never inlined)
fs.mkdirSync(dist, { recursive: true }); fs.copyFileSync(path.join(repo, 'packages/domain-data/data/SIGNAL_LIB.json'), path.join(dist, 'signal-lib.json'));
await esbuild.build({
  entryPoints: [path.join(app, 'src/main.tsx')], bundle: true, minify: !dev, sourcemap: 'external', format: 'iife', target: ['es2022'], jsx: 'automatic',
  outfile: path.join(dist, 'demo.js'), define: { 'process.env.NODE_ENV': dev ? '"development"' : '"production"' }, legalComments: 'linked', logLevel: 'warning',
  alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
});

// source maps never ship (red-team RT-20): moved out of dist, kept for an error tracker under .local/sourcemaps/<app>/
{ const maps = path.join(repo, '.local/sourcemaps', path.basename(app)); fs.mkdirSync(maps, { recursive: true });
  const walk = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
  for (const f of walk(dist).filter((f) => f.endsWith('.map'))) fs.renameSync(f, path.join(maps, path.basename(f))); }
const css = [path.join(repo, 'packages/design-tokens/dist/tokens.css'), path.join(repo, 'packages/ui/src/ui.css'), path.join(app, 'src/styles/demo.css')].map((f) => `/* ${path.relative(repo, f)} */\n${fs.readFileSync(f, 'utf8')}`).join('\n');
fs.writeFileSync(path.join(dist, 'demo.css'), css);
fs.copyFileSync(path.join(app, 'src/index.html'), path.join(dist, 'index.html'));
const files = fs.readdirSync(dist).filter((f) => fs.statSync(path.join(dist, f)).isFile());
const manifest = { app: '@empathia/demo', builtAt: new Date().toISOString(), files: Object.fromEntries(files.map((f) => [f, { bytes: fs.statSync(path.join(dist, f)).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(dist, f))).digest('hex') }])) };
fs.writeFileSync(path.join(dist, 'BUILD_MANIFEST.json'), JSON.stringify(manifest, null, 2));
console.log(`demo built: ${files.map((f) => `${f} ${(manifest.files[f].bytes / 1024).toFixed(0)} KiB`).join(', ')}`);
