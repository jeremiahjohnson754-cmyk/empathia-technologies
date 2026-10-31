#!/usr/bin/env node
/**
 * Assemble the runtime tree for the Render staging image (deploy/render/Dockerfile): built artifacts only — no TypeScript/TSX source,
 * no tests, no docs, no Founder Studio, no demonstrators, no .local, no secrets. Run after `node scripts/build.mjs`.
 *   node deploy/render/assemble-runtime.mjs --out=/out
 * Contents: root package.json; services/enterprise-api/{package.json,dist}; packages/<name>/{package.json,dist,data}; database/migrations;
 * apps/enterprise-web/{package.json,dist,server}; node_modules/@empathia/<name> as relative symlinks (the API has no third-party runtime
 * dependency). A RUNTIME_MANIFEST.json lists every file with its SHA-256 so the image contents can be checked against a commit.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve((process.argv.find((a) => a.startsWith('--out=')) || '--out=/out').slice(6));
if (out === root || out.startsWith(root + path.sep) && !out.startsWith(path.join(root, '.local'))) { console.error('--out must be outside the repository (or under .local/)'); process.exit(2); }
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const copy = (rel) => { const s = path.join(root, rel); if (!fs.existsSync(s)) return false; fs.cpSync(s, path.join(out, rel), { recursive: true, dereference: true, filter: (f) => !/\.map$/.test(f) && !/[/\\]test[/\\]/.test(path.relative(root, f) + '/') }); return true; };
const need = (rel) => { if (!copy(rel)) { console.error(`missing ${rel}: run node scripts/build.mjs first`); process.exit(1); } };

need('package.json');
need('services/enterprise-api/package.json'); need('services/enterprise-api/dist/src'); copy('services/enterprise-api/dist/build-info.json');
need('database/migrations');
need('apps/enterprise-web/package.json'); need('apps/enterprise-web/dist'); need('apps/enterprise-web/server');
const linked = [];
// workspace packages the API imports: packages/* and integrations/{contracts,mocks} (browser-side ui and api-client are bundled into
// the web app's dist and are not needed at runtime)
const dirs = [...fs.readdirSync(path.join(root, 'packages')).filter((n) => !['ui', 'api-client'].includes(n)).map((n) => path.join('packages', n)), 'integrations/contracts', 'integrations/mocks'];
for (const dir of dirs) {
  const pj = path.join(dir, 'package.json'); if (!fs.existsSync(path.join(root, pj))) continue;
  const pkg = JSON.parse(fs.readFileSync(path.join(root, pj), 'utf8'));
  copy(pj); copy(path.join(dir, 'dist')); copy(path.join(dir, 'data'));
  const at = path.join(out, 'node_modules', pkg.name); fs.mkdirSync(path.dirname(at), { recursive: true });
  fs.symlinkSync(path.relative(path.dirname(at), path.join(out, dir)), at, 'dir'); linked.push(pkg.name);
}
const files = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isSymbolicLink()) continue; if (e.isDirectory()) walk(p); else files.push(p); } };
walk(out);
const manifest = { assembledAt: new Date().toISOString(), files: files.length, linked, sha256: Object.fromEntries(files.sort().map((f) => [path.relative(out, f), crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')])) };
const src = files.filter((f) => /\.(ts|tsx)$/.test(f) && !/\.d\.ts$/.test(f));
if (src.length) { console.error(`source files in the runtime tree: ${src.slice(0, 5).join(', ')}`); process.exit(1); }
fs.writeFileSync(path.join(out, 'RUNTIME_MANIFEST.json'), JSON.stringify(manifest, null, 1));
console.log(JSON.stringify({ out, files: files.length, linked: linked.length, bytes: files.reduce((n, f) => n + fs.statSync(f).size, 0) }));
