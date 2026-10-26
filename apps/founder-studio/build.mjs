#!/usr/bin/env node
/**
 * Build the Founder Studio into apps/founder-studio/dist:
 *   index.html (Founder-Studio.html in the package), studio/studio.js + studio.css (esbuild bundle of src/),
 *   demonstrators/founder/Empathia-Founder-Edition.html (the 2.5.4 development build, copied byte for byte and hash-checked),
 *   server/ (the local launcher), media/films/ (empty: the founder's films go here), and a build manifest with hashes.
 *
 *   node apps/founder-studio/build.mjs [--founder-edition=<path>] [--no-data]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const app = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(app, '../..');
const dist = path.join(app, 'dist');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const fe = arg('founder-edition', '/home/claude/Empathia_V25/work/source-254/dist/Empathia-Living-Campus-v2.5.4-nomedia.html');

if (!process.argv.includes('--no-data')) execFileSync(process.execPath, [path.join(app, 'scripts/build-data.mjs'), `--founder-edition=${fe}`], { stdio: 'inherit' });

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'studio'), { recursive: true });
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const r = await esbuild.build({
  entryPoints: [path.join(app, 'src/main.tsx')],
  bundle: true, minify: true, sourcemap: true, format: 'iife', target: ['es2022'], jsx: 'automatic',
  outfile: path.join(dist, 'studio/studio.js'),
  loader: { '.json': 'json' },
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'linked',
  metafile: true, logLevel: 'warning',
});
fs.writeFileSync(path.join(dist, 'studio/meta.json'), JSON.stringify(r.metafile));
fs.copyFileSync(path.join(app, 'src/index.html'), path.join(dist, 'index.html'));

// the Founder Edition demonstrator, unchanged
fs.mkdirSync(path.join(dist, 'demonstrators/founder'), { recursive: true });
if (fs.existsSync(fe)) fs.copyFileSync(fe, path.join(dist, 'demonstrators/founder/Empathia-Founder-Edition.html'));
// the launcher and its start scripts
fs.cpSync(path.join(app, 'server'), path.join(dist, 'server'), { recursive: true });
for (const f of fs.readdirSync(path.join(app, 'launch'))) fs.copyFileSync(path.join(app, 'launch', f), path.join(dist, f));
for (const f of fs.readdirSync(dist)) if (/\.(command|sh)$/.test(f)) fs.chmodSync(path.join(dist, f), 0o755);
fs.mkdirSync(path.join(dist, 'media/films'), { recursive: true });
fs.writeFileSync(path.join(dist, 'media/films/README.txt'), 'Put the Empathia film files here (the .mp4 files you received). The studio plays them from this folder.\nFile names must stay exactly as received. Their expected SHA-256 hashes are in studio/films.json.\n');
fs.copyFileSync(path.join(app, 'src/generated/films.json'), path.join(dist, 'studio/films.json'));
fs.copyFileSync(path.join(app, 'src/generated/film-index.json'), path.join(dist, 'server/film-index.json'));

// manifest of everything built, with hashes
const files = [];
const walk = (d) => { for (const n of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, n.name); if (n.isDirectory()) walk(p); else files.push(p); } };
walk(dist);
const man = files.filter((p) => !p.endsWith('BUILD_MANIFEST.json')).map((p) => ({ path: path.relative(dist, p).split(path.sep).join('/'), bytes: fs.statSync(p).size, sha256: sha(fs.readFileSync(p)) })).sort((a, b) => a.path.localeCompare(b.path));
const commit = (() => { try { return execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return 'unknown'; } })();
const dirty = (() => { try { return execFileSync('git', ['-C', repo, 'status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0; } catch { return true; } })();
fs.writeFileSync(path.join(dist, 'BUILD_MANIFEST.json'), JSON.stringify({ product: 'Empathia Founder Studio', classification: 'INTERNAL_ONLY — founder use; contains the Founder Edition and engineering records', sourceCommit: commit, sourceTreeClean: !dirty, builtAt: new Date().toISOString(), files: man }, null, 1));
console.log(`founder-studio: ${man.length} files, studio.js ${(fs.statSync(path.join(dist, 'studio/studio.js')).size / 1024).toFixed(0)} KB, commit ${commit}${dirty ? ' (uncommitted changes)' : ''}`);
