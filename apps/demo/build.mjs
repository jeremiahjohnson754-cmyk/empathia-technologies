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
  const areas = csv.filter((r) => r[0] === 'Living Campus' && r[1] === 'area').map((r) => ({ key: r[2], label: r[3], target: r[7], status: r[10], newRoute: r[8] }));
  fs.mkdirSync(path.join(app, 'src/generated'), { recursive: true }); fs.writeFileSync(path.join(app, 'src/generated/parity.json'), JSON.stringify(areas, null, 1)); }
await esbuild.build({
  entryPoints: [path.join(app, 'src/main.tsx')], bundle: true, minify: !dev, sourcemap: true, format: 'iife', target: ['es2022'], jsx: 'automatic',
  outfile: path.join(dist, 'demo.js'), define: { 'process.env.NODE_ENV': dev ? '"development"' : '"production"' }, legalComments: 'linked', logLevel: 'warning',
  alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
});
const css = [path.join(repo, 'packages/design-tokens/dist/tokens.css'), path.join(repo, 'packages/ui/src/ui.css'), path.join(app, 'src/styles/demo.css')].map((f) => `/* ${path.relative(repo, f)} */\n${fs.readFileSync(f, 'utf8')}`).join('\n');
fs.writeFileSync(path.join(dist, 'demo.css'), css);
fs.copyFileSync(path.join(app, 'src/index.html'), path.join(dist, 'index.html'));
const files = fs.readdirSync(dist).filter((f) => fs.statSync(path.join(dist, f)).isFile());
const manifest = { app: '@empathia/demo', builtAt: new Date().toISOString(), files: Object.fromEntries(files.map((f) => [f, { bytes: fs.statSync(path.join(dist, f)).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(dist, f))).digest('hex') }])) };
fs.writeFileSync(path.join(dist, 'BUILD_MANIFEST.json'), JSON.stringify(manifest, null, 2));
console.log(`demo built: ${files.map((f) => `${f} ${(manifest.files[f].bytes / 1024).toFixed(0)} KiB`).join(', ')}`);
