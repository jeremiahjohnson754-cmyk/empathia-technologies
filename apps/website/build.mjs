#!/usr/bin/env node
/**
 * Build the public site into apps/website/dist: one pre-rendered index.html per page, 404.html, site.css (tokens + site styles), theme-init.js
 * (the shared theme script, before first paint), site.js (menu, theme switch, lead forms), the brand marks, the product captures, sitemap.xml, robots.txt
 * and a manifest with hashes. Budgets: home document 48 KB (it now carries the nine product tiles), site.js 8 KB, theme-init.js 512 B, the
 * three preloaded faces 88 KB (D38), product captures 1.4 MB. The public site carries no demo data.
 *   node apps/website/build.mjs [--api=https://api.example] [--base=https://www.example] [--demo=https://demo.example] [--films=auto|preview|off]
 * Films enter the site only when VERIFIED for the website in films.json (auto); --films=preview is an owner-review build (noindex).
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
const { renderAll } = await import(tmp + '?t=' + Date.now());
// the public URL and the lead API: --base/--api, else the environment (a Render static site provides RENDER_EXTERNAL_URL at build time)
const base = arg('base', process.env.WEBSITE_BASE_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, ''); const api = arg('api', process.env.WEBSITE_API_URL || '').replace(/\/$/, '');
const demoUrl = arg('demo', process.env.WEBSITE_DEMO_URL || 'https://empathia-demo.onrender.com').replace(/\/$/, '');
// films: a film enters the published site only when its rights for the website are VERIFIED (apps/website/films.json). --films=preview
// builds every film whose renditions exist, marks every page as a preview and keeps search engines out; it is for owner review only.
const filmsMode = arg('films', process.env.WEBSITE_FILMS || 'auto'); if (!['auto', 'preview', 'off'].includes(filmsMode)) { console.error('--films is auto, preview or off'); process.exit(2); }
const catalogue = JSON.parse(fs.readFileSync(path.join(app, 'films.json'), 'utf8')).films; const mediaSrc = path.join(app, 'media');
const hasMedia = (k) => ['720.mp4', 'poster.webp', 'poster.jpg', 'captions.vtt'].every((f) => fs.existsSync(path.join(mediaSrc, k, f)));
const films = filmsMode === 'off' ? [] : catalogue.filter((f) => filmsMode === 'preview' ? hasMedia(f.key) : f.rights?.website?.status === 'VERIFIED');
for (const f of films) if (!hasMedia(f.key)) { console.error(`film ${f.key} is VERIFIED for the website but its renditions are missing in apps/website/media/${f.key} (node scripts/media/prepare-web-films.mjs)`); process.exit(1); }
const excluded = catalogue.filter((f) => !films.includes(f)).map((f) => ({ key: f.key, status: f.rights?.website?.status || 'NONE', media: hasMedia(f.key) }));
const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };
const vttText = (t) => { const lines = []; for (const block of t.replace(/\r/g, '').split(/\n\n+/)) { const l = block.split('\n').filter((x) => x && !/-->/.test(x) && !/^WEBVTT/.test(x) && !/^\d+$/.test(x) && !/^NOTE/.test(x)); if (l.length) lines.push(l.join(' ').replace(/<[^>]+>/g, '')); } return lines; };
const transcripts = Object.fromEntries(films.map((f) => [f.key, vttText(fs.readFileSync(path.join(mediaSrc, f.key, 'captions.vtt'), 'utf8'))]));
// brand (D39): the shared helper when the tokens package carries it; otherwise the same files copied directly (small shield as favicon)
// brand, Inter and the theme script from @empathia/design-tokens (D7, D9, D38, D39): brand/, fonts/ and theme-init.js copied into dist;
// decorate() puts theme-init (blocking, before first paint), the three website preloads and the icon links into every page's <head>
const { shipBrandAndType, tokenCss } = await import(path.join(repo, 'packages/design-tokens/brand.mjs'));
const decorate = shipBrandAndType(dist, { base: '/', preload: 'website', themeInit: true });
// product captures of the investor demonstration (dark, D43): only those listed with their hashes in PROVENANCE.json enter the site
const capDir = path.join(mediaSrc, 'product'); const prov = fs.existsSync(path.join(capDir, 'PROVENANCE.json')) ? JSON.parse(fs.readFileSync(path.join(capDir, 'PROVENANCE.json'), 'utf8')) : { captures: {} };
const captures = {};
for (const [id, c] of Object.entries(prov.captures || {})) {
  const files = Object.entries(c.files || {}); if (!files.length || !files.every(([f]) => fs.existsSync(path.join(capDir, f)))) continue;
  for (const [f, sha] of files) { const buf = fs.readFileSync(path.join(capDir, f)); if (crypto.createHash('sha256').update(buf).digest('hex') !== sha) { console.error(`capture ${f} does not match its PROVENANCE.json hash`); process.exit(1); } copy(path.join(capDir, f), path.join(dist, 'media/product', f)); }
  captures[id] = { w: c.width, h: c.height, route: c.route };
}
const rendered = renderAll({ films, transcripts, demoUrl, preview: filmsMode === 'preview', captures }, { api: api || null, base });
const PATHS = rendered.map((r) => r.path).filter((p) => p !== '/404');
for (const r of rendered) { if (r.path === '/404') { fs.writeFileSync(path.join(dist, '404.html'), decorate(r.html)); continue; } const dir = path.join(dist, r.path === '/' ? '' : r.path); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'index.html'), decorate(r.html)); }
// media: the founder portrait (owner-supplied for the website, metadata stripped) and the films built in
for (const f of fs.readdirSync(path.join(mediaSrc, 'founder'))) copy(path.join(mediaSrc, 'founder', f), path.join(dist, 'media/founder', f));
for (const f of films) for (const x of ['720.mp4', 'poster.webp', 'poster.jpg', 'captions.vtt']) copy(path.join(mediaSrc, f.key, x), path.join(dist, 'media', f.key, x));
const css = [tokenCss(), `/* apps/website/src/styles/site.css */\n${fs.readFileSync(path.join(app, 'src/styles/site.css'), 'utf8')}`].join('\n');
fs.writeFileSync(path.join(dist, 'site.css'), css);
fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PATHS.map((p) => `  <url><loc>${base}${p}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(dist, 'robots.txt'), filmsMode === 'preview' ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
const walk = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(dist); const manifest = { app: '@empathia/website', builtAt: new Date().toISOString(), base: base || null, api: api || null, demoUrl, films: { mode: filmsMode, included: films.map((f) => f.key), excluded }, pages: PATHS.length, files: Object.fromEntries(files.map((f) => [path.relative(dist, f), { bytes: fs.statSync(f).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') }])) };
fs.writeFileSync(path.join(dist, 'BUILD_MANIFEST.json'), JSON.stringify(manifest, null, 2));
const home = manifest.files['index.html'].bytes, js = manifest.files['site.js'].bytes;
const themeJs = manifest.files['theme-init.js'].bytes; const fonts = ['inter-400.woff2', 'inter-600.woff2', 'inter-display-800.woff2'].reduce((a, f) => a + manifest.files[`fonts/${f}`].bytes, 0);   // the three preloaded faces (D38)
const capBytes = Object.entries(manifest.files).filter(([f]) => f.startsWith('media/product/')).reduce((a, [, v]) => a + v.bytes, 0);
if (home > 48 * 1024 || js > 8 * 1024 || themeJs > 512 || fonts > 88 * 1024 || capBytes > 1400 * 1024) { console.error(`BUDGET EXCEEDED: index.html ${home} B (limit 49152), site.js ${js} B (limit 8192), theme-init.js ${themeJs} B (limit 512), fonts ${fonts} B (limit 90112, D38), captures ${capBytes} B (limit 1433600)`); process.exit(1); }
console.log(`website built: ${PATHS.length} pages, films ${filmsMode}: ${films.map((f) => f.key).join(', ') || 'none'} (excluded: ${excluded.map((e) => `${e.key} ${e.status}`).join(', ') || 'none'}), index.html ${(home / 1024).toFixed(1)} KiB, site.js ${(js / 1024).toFixed(1)} KiB, site.css ${(manifest.files['site.css'].bytes / 1024).toFixed(1)} KiB`);
