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
// the corporate website the demonstration links to (founder page, privacy notice): --website=<url>, DEMO_WEBSITE_URL, or the public site
const website = ((process.argv.find((a) => a.startsWith('--website=')) || '').slice(10) || process.env.DEMO_WEBSITE_URL || 'https://empathia-website.onrender.com').replace(/\/$/, '');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
if (!process.argv.includes('--generate-only')) { fs.rmSync(dist, { recursive: true, force: true }); fs.mkdirSync(dist, { recursive: true }); }
// the legacy area registry from the parity ledger (docs/legacy-parity.csv): generated, never edited
{ const csv = fs.readFileSync(path.join(repo, 'docs/legacy-parity.csv'), 'utf8').split('\n').slice(1).filter(Boolean).map((l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')));
  const row = (r) => ({ key: r[2].replace(/^v25\//, 'v25.'), label: r[3].split(' — ')[0], target: r[7], status: r[10], newRoute: r[8] });
  const areas = csv.filter((r) => r[0] === 'Living Campus' && (r[1] === 'area' || r[1] === 'v25 page')).map(row);   // V2.5 pages resolve as v25.<page>
  fs.mkdirSync(path.join(app, 'src/generated'), { recursive: true }); fs.writeFileSync(path.join(app, 'src/generated/parity.json'), JSON.stringify(areas, null, 1));
  // the demonstrator's role × area visibility matrix (AZ_KEYS × areas), verbatim from the inventory: the policy page shows it, never edits it
  const inv = JSON.parse(fs.readFileSync(path.join(repo, 'legacy/inventory/v253-inventory.json'), 'utf8'));
  fs.writeFileSync(path.join(app, 'src/generated/area-roles.json'), JSON.stringify({ roles: inv.uiRoles, areas: inv.areas.map((a) => ({ key: a.area, label: a.label, roles: a.roles })) }, null, 1)); }
// the operational workspaces, each its own entry (src/hardening/opsRoutes.tsx loads them by these names); the build id versions their URLs
// the shell's own pages are build entries too (shell/<name>.js), so a failed fetch can be retried at a fresh URL (registry.shell.ts)
const SHELL_PAGES = { landing: 'shell/Landing.tsx', scouter: 'scouter/ScouterPage.tsx', policy: 'access/PolicyPage.tsx' };
const WORKSPACES = { dispatch: 'dispatch/Dispatch.tsx', servicehands: 'service/ServiceHands.tsx', replay: 'replay/Replay.tsx', fiscan: 'fi/FiScan.tsx', decisions: 'decisions/Decisions.tsx', labs: 'learn/Labs.tsx', resilience: 'hardening/Resilience.tsx' };
const buildId = crypto.createHash('sha256').update(String(Date.now())).digest('hex').slice(0, 10);
// --generate-only: write the generated sources and stop (scripts/build.mjs runs this before type-checking, so a fresh checkout builds)
if (process.argv.includes('--generate-only')) process.exit(0);
// the SIGNAL library ships beside the bundle and is fetched on demand by Learn (2 MB; never inlined)
fs.mkdirSync(dist, { recursive: true }); fs.copyFileSync(path.join(repo, 'packages/domain-data/data/SIGNAL_LIB.json'), path.join(dist, 'signal-lib.json'));
// static media (narration takes and captions): apps/demo/public/** ships as is beside the bundle
if (fs.existsSync(path.join(app, 'public'))) fs.cpSync(path.join(app, 'public'), dist, { recursive: true });
await esbuild.build({
  // ES modules with code splitting: every page registered with a lazy `load` is its own chunk, fetched only when the role may open it
  // (D44: a forbidden address never downloads its screen). The entry stays demo.js; pages land in chunks/.
  entryPoints: { demo: path.join(app, 'src/main.tsx'), ...Object.fromEntries(Object.entries(WORKSPACES).map(([k, f]) => [`ws/${k}`, path.join(app, 'src', f)])), ...Object.fromEntries(Object.entries(SHELL_PAGES).map(([k, f]) => [`shell/${k}`, path.join(app, 'src', f)])) }, bundle: true, minify: !dev, sourcemap: 'external', format: 'esm', splitting: true, target: ['es2022'], jsx: 'automatic',
  outdir: dist, entryNames: '[dir]/[name]', chunkNames: 'chunks/[name]-[hash]', define: { 'process.env.NODE_ENV': dev ? '"development"' : '"production"', 'process.env.EMPATHIA_WEBSITE_URL': JSON.stringify(website), 'process.env.DEMO_BUILD_ID': JSON.stringify(buildId) }, legalComments: 'linked', logLevel: 'warning',
  // the operational workspaces are entries with stable names (ws/<name>.js): a failed load is retried at a fresh URL (src/hardening/lazy.tsx)
  alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
});

// source maps never ship (red-team RT-20): moved out of dist, kept for an error tracker under .local/sourcemaps/<app>/
{ const maps = path.join(repo, '.local/sourcemaps', path.basename(app)); fs.mkdirSync(maps, { recursive: true });
  const walk = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
  for (const f of walk(dist).filter((f) => f.endsWith('.map'))) fs.renameSync(f, path.join(maps, path.basename(f))); }
// brand, Inter and the theme script from @empathia/design-tokens (D7, D9, D39): files copied into dist, the <head> decorated
const { shipBrandAndType, tokenCss } = await import(path.join(repo, 'packages/design-tokens/brand.mjs'));
const decorate = shipBrandAndType(dist, { preload: 'app', manifest: { name: 'Empathia Living Campus — investor demonstration', shortName: 'Empathia demo' } });
const css = [tokenCss(), ...[path.join(repo, 'packages/ui/src/ui.css'), path.join(app, 'src/styles/demo.css'), path.join(app, 'src/styles/shell.css'), path.join(app, 'src/hardening/ops.css'), path.join(app, 'src/spatial/spaces.css'), path.join(app, 'src/spatial/core.css')].map((f) => `/* ${path.relative(repo, f)} */\n${fs.readFileSync(f, 'utf8')}`)].join('\n');
fs.writeFileSync(path.join(dist, 'demo.css'), css);
fs.writeFileSync(path.join(dist, 'index.html'), decorate(fs.readFileSync(path.join(app, 'src/index.html'), 'utf8')));
// the View-as role is applied before first paint by a tiny same-origin script (the CSP forbids inline scripts), so the role colour is right on the first frame
fs.copyFileSync(path.join(app, 'src/role-boot.js'), path.join(dist, 'role-boot.js'));
const files = (function walk(d, pre = '') { return fs.readdirSync(d).flatMap((f) => fs.statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f), `${pre}${f}/`) : [`${pre}${f}`]); })(dist);
const manifest = { app: '@empathia/demo', builtAt: new Date().toISOString(), files: Object.fromEntries(files.map((f) => [f, { bytes: fs.statSync(path.join(dist, f)).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(dist, f))).digest('hex') }])) };
fs.writeFileSync(path.join(dist, 'BUILD_MANIFEST.json'), JSON.stringify(manifest, null, 2));
console.log(`demo built: ${files.map((f) => `${f} ${(manifest.files[f].bytes / 1024).toFixed(0)} KiB`).join(', ')}`);
