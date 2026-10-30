#!/usr/bin/env node
/**
 * Build the public site into apps/website/dist: one pre-rendered index.html per page, site.css (tokens + site styles), site.js
 * (menu + lead forms), sitemap.xml, robots.txt, and a manifest with hashes. Budget: the home page document under 40 KB, site.js under
 * 8 KB — the public site carries no demo data.
 *   node apps/website/build.mjs [--api=https://api.example] [--base=https://www.example]
 */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const app = path.dirname(fileURLToPath(import.meta.url)); const repo = path.resolve(app, '../..'); const dist = path.join(app, 'dist');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
fs.rmSync(dist, { recursive: true, force: true }); fs.mkdirSync(dist, { recursive: true });
await esbuild.build({ entryPoints: [path.join(app, 'src/main.ts')], bundle: true, minify: true, sourcemap: 'external', format: 'iife', target: ['es2022'], jsx: 'automatic', outfile: path.join(dist, 'site.js'), define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'linked', logLevel: 'warning' });

// source maps never ship (red-team RT-20): moved out of dist, kept for an error tracker under .local/sourcemaps/<app>/
{ const maps = path.join(repo, '.local/sourcemaps', path.basename(app)); fs.mkdirSync(maps, { recursive: true });
  const walk = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
  for (const f of walk(dist).filter((f) => f.endsWith('.map'))) fs.renameSync(f, path.join(maps, path.basename(f))); }
// the pre-renderer runs in Node: bundle it to a temporary ESM file and import it
const tmp = path.join(repo, '.local/website-prerender.mjs'); fs.mkdirSync(path.dirname(tmp), { recursive: true });
await esbuild.build({ entryPoints: [path.join(app, 'src/prerender.tsx')], bundle: true, platform: 'node', format: 'esm', target: ['node22'], jsx: 'automatic', outfile: tmp, banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" }, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'warning' });
const { renderPage, PATHS } = await import(tmp + '?t=' + Date.now());
const base = arg('base', ''); const api = arg('api', '');
for (const p of PATHS) { const dir = path.join(dist, p === '/' ? '' : p); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'index.html'), renderPage(p, { api: api || null, base }).html); }
const css = [path.join(repo, 'packages/design-tokens/dist/tokens.css'), path.join(app, 'src/styles/site.css')].map((f) => `/* ${path.relative(repo, f)} */\n${fs.readFileSync(f, 'utf8')}`).join('\n');
fs.writeFileSync(path.join(dist, 'site.css'), css);
fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PATHS.map((p) => `  <url><loc>${base}${p}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
const walk = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(dist); const manifest = { app: '@empathia/website', builtAt: new Date().toISOString(), base: base || null, api: api || null, pages: PATHS.length, files: Object.fromEntries(files.map((f) => [path.relative(dist, f), { bytes: fs.statSync(f).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') }])) };
fs.writeFileSync(path.join(dist, 'BUILD_MANIFEST.json'), JSON.stringify(manifest, null, 2));
const home = manifest.files['index.html'].bytes, js = manifest.files['site.js'].bytes;
if (home > 40 * 1024 || js > 8 * 1024) { console.error(`BUDGET EXCEEDED: index.html ${home} B (limit 40960), site.js ${js} B (limit 8192)`); process.exit(1); }
console.log(`website built: ${PATHS.length} pages, index.html ${(home / 1024).toFixed(1)} KiB, site.js ${(js / 1024).toFixed(1)} KiB, site.css ${(manifest.files['site.css'].bytes / 1024).toFixed(1)} KiB`);
