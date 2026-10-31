#!/usr/bin/env node
/**
 * Build the enterprise web app into apps/enterprise-web/dist: index.html, app.js (esbuild bundle of src/ with @empathia/ui and
 * @empathia/api-client from source), app.css (design tokens + ui.css + app.css), and a manifest with hashes.
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
// the release stamp written by scripts/build.mjs (or RELEASE_SHA): browser errors carry the same commit as the API's
const releaseSha = process.env.RELEASE_SHA || (() => { try { return JSON.parse(fs.readFileSync(path.join(app, 'src/generated/build-info.json'), 'utf8')).sha; } catch { return 'unknown'; } })();
fs.rmSync(dist, { recursive: true, force: true }); fs.mkdirSync(dist, { recursive: true });
await esbuild.build({
  entryPoints: [path.join(app, 'src/main.tsx')], bundle: true, minify: !dev, sourcemap: 'external', format: 'iife', target: ['es2022'], jsx: 'automatic',
  outfile: path.join(dist, 'app.js'), define: { 'process.env.NODE_ENV': dev ? '"development"' : '"production"', EMPATHIA_DEV_BUILD: dev ? 'true' : 'false', EMPATHIA_RELEASE_SHA: JSON.stringify(releaseSha) }, legalComments: 'linked', logLevel: 'warning',
  alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts'), '@empathia/api-client': path.join(repo, 'packages/api-client/src/index.ts'), '@empathia/observability': path.join(repo, 'packages/observability/src/index.ts') },
});

// source maps never ship (red-team RT-20): moved out of dist, kept for an error tracker under .local/sourcemaps/<app>/
{ const maps = path.join(repo, '.local/sourcemaps', path.basename(app)); fs.mkdirSync(maps, { recursive: true });
  const walk = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
  for (const f of walk(dist).filter((f) => f.endsWith('.map'))) fs.renameSync(f, path.join(maps, path.basename(f))); }
const css = [path.join(repo, 'packages/design-tokens/dist/tokens.css'), path.join(repo, 'packages/ui/src/ui.css'), path.join(app, 'src/styles/app.css')].map((f) => `/* ${path.relative(repo, f)} */\n${fs.readFileSync(f, 'utf8')}`).join('\n');
fs.writeFileSync(path.join(dist, 'app.css'), css);
fs.copyFileSync(path.join(app, 'src/index.html'), path.join(dist, 'index.html'));
const files = fs.readdirSync(dist).filter((f) => fs.statSync(path.join(dist, f)).isFile());
const manifest = { app: '@empathia/enterprise-web', builtAt: new Date().toISOString(), files: Object.fromEntries(files.map((f) => [f, { bytes: fs.statSync(path.join(dist, f)).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(dist, f))).digest('hex') }])) };
fs.writeFileSync(path.join(dist, 'BUILD_MANIFEST.json'), JSON.stringify(manifest, null, 2));
console.log(`enterprise-web built: ${files.map((f) => `${f} ${(manifest.files[f].bytes / 1024).toFixed(0)} KiB`).join(', ')}`);
