#!/usr/bin/env node
/**
 * Bootstrap the workspace's node_modules.
 *
 * Normal machine:   pnpm install            (resolves package.json devDependencies and the workspace:* links)
 * Offline machine:  node scripts/bootstrap.mjs [--offline-deps=/path/to/node_modules]
 *
 * The offline mode exists because the founder's build environment has no package-registry access. It links:
 *   - every workspace package (apps/*, services/*, packages/*, integrations/*) into node_modules/@empathia/<name>, exactly as pnpm would;
 *   - the third-party dev tools listed in package.json from an existing node_modules folder (default /opt/npm-tools/node_modules).
 * It never downloads anything and never edits package.json. It reports any dependency it could not find (NOT_FOUND) and the version it
 * found, so a version drift is visible.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.find((a) => a.startsWith('--offline-deps='));
const offline = arg ? arg.split('=')[1] : ['/opt/npm-tools/node_modules', '/home/claude/.npm-global/lib/node_modules'].find((p) => fs.existsSync(p));
const nm = path.join(root, 'node_modules');
fs.mkdirSync(path.join(nm, '@empathia'), { recursive: true });

const link = (target, at) => {
  try { fs.rmSync(at, { recursive: true, force: true }); } catch { /* not there */ }
  fs.mkdirSync(path.dirname(at), { recursive: true });
  fs.symlinkSync(target, at, 'dir');
};

const report = { workspace: [], thirdParty: [], notFound: [] };
for (const group of ['apps', 'services', 'packages', 'integrations']) {
  const dir = path.join(root, group);
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    const pj = path.join(dir, name, 'package.json');
    if (!fs.existsSync(pj)) continue;
    const pkg = JSON.parse(fs.readFileSync(pj, 'utf8'));
    if (!pkg.name || !pkg.name.startsWith('@empathia/')) continue;
    link(path.join(dir, name), path.join(nm, pkg.name));
    report.workspace.push(pkg.name);
  }
}

const rootPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const wanted = Object.entries(rootPkg.devDependencies || {});
const extra = ['undici-types', 'csstype', 'scheduler', 'playwright-core'];   // transitive packages the tools above need at run time
for (const [name, want] of wanted.concat(extra.map((e) => [e, '*']))) {
  const candidates = [offline, '/home/claude/.npm-global/lib/node_modules', '/opt/node22/lib/node_modules'].filter(Boolean).map((p) => path.join(p, name));
  const found = candidates.find((p) => fs.existsSync(path.join(p, 'package.json')));
  if (!found) { if (want !== '*') report.notFound.push(`${name}@${want}`); continue; }
  const have = JSON.parse(fs.readFileSync(path.join(found, 'package.json'), 'utf8')).version;
  link(found, path.join(nm, name));
  report.thirdParty.push(`${name}@${have}${want !== '*' && want.replace(/^\^/, '') !== have ? ` (package.json asks ${want})` : ''}`);
}
fs.mkdirSync(path.join(nm, '.bin'), { recursive: true });
for (const [bin, rel] of [['tsc', 'typescript/bin/tsc'], ['esbuild', 'esbuild/bin/esbuild']]) {
  const t = path.join(nm, rel);
  if (fs.existsSync(t)) { try { fs.rmSync(path.join(nm, '.bin', bin), { force: true }); } catch { /* */ } fs.symlinkSync(t, path.join(nm, '.bin', bin)); }
}
console.log(JSON.stringify({ mode: 'offline-link', source: offline || null, ...report }, null, 1));
if (report.notFound.length) console.log(`NOT_FOUND: ${report.notFound.join(', ')} — install them with pnpm on a connected machine; the features that need them are reported NOT_RUN.`);
