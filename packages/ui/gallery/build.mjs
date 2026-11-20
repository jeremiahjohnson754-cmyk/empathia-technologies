#!/usr/bin/env node
/**
 * Build the @empathia/ui gallery (Storybook equivalent) into packages/ui/gallery/dist: index.html, gallery.js (esbuild bundle with
 * @empathia/ui from source), gallery.css (design tokens + ui.css + gallery layout). The token sheet is read from
 * packages/design-tokens/dist/tokens.css at build time (light = :root, dark = :root[data-theme="dark"]).
 *   node packages/ui/gallery/build.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const dist = path.join(here, 'dist');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tokensCss = fs.readFileSync(path.join(repo, 'packages/design-tokens/dist/tokens.css'), 'utf8');
const block = (re) => { const m = re.exec(tokensCss); const o = {}; if (m) for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) o[d[1]] = d[2].trim(); return o; };
const base = block(/^:root\s*\{([^}]*)\}/m);
const dark = block(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/);
const lightOverride = block(/:root\[data-theme="light"\]\s*\{([^}]*)\}/);
// tokens.css is dark-first: bare :root holds dark values; light values come from the light blocks
const tokens = Object.keys(base).map((name) => ({ name, dark: dark[name] ?? base[name], light: lightOverride[name] ?? base[name] }));
fs.rmSync(dist, { recursive: true, force: true }); fs.mkdirSync(dist, { recursive: true });
await esbuild.build({
  entryPoints: [path.join(here, 'gallery.tsx')], bundle: true, minify: true, sourcemap: false, format: 'iife', target: ['es2022'], jsx: 'automatic',
  outfile: path.join(dist, 'gallery.js'), define: { 'process.env.NODE_ENV': '"production"', __TOKENS__: JSON.stringify(tokens) }, legalComments: 'linked', logLevel: 'warning',
  alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
});
fs.writeFileSync(path.join(dist, 'gallery.css'), [path.join(repo, 'packages/design-tokens/dist/tokens.css'), path.join(repo, 'packages/ui/src/ui.css'), path.join(repo, 'packages/ui/src/kit.css'), path.join(here, 'gallery.css')].map((f) => `/* ${path.relative(repo, f)} */\n${fs.readFileSync(f, 'utf8')}`).join('\n'));
fs.copyFileSync(path.join(here, 'index.html'), path.join(dist, 'index.html'));
console.log(`gallery built: ${tokens.length} tokens; ${fs.readdirSync(dist).join(', ')}`);
