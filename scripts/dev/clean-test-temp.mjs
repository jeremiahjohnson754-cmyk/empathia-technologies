#!/usr/bin/env node
/**
 * Remove what earlier test runs left in the temp directory.
 *
 * The suites build into `fs.mkdtempSync(path.join(os.tmpdir(), '<prefix>-'))` directories and did not remove them. Since 24 Nov 2026 a
 * run started by scripts/test.mjs keeps them in one directory and removes it; this script is for what collected before that, and for
 * suites run by hand.
 *
 *   node scripts/dev/clean-test-temp.mjs            list what would go, with sizes (changes nothing)
 *   node scripts/dev/clean-test-temp.mjs --apply    remove it
 *   --older-than=<minutes>   only directories not modified for that long (default 120, so a run in progress is left alone)
 *
 * It removes only directories whose name is one of the prefixes the repository's own tests and scripts pass to mkdtemp, followed by the
 * six characters mkdtemp adds. Anything else in the temp directory is not touched.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const apply = process.argv.includes('--apply');
const older = Number((process.argv.find((a) => a.startsWith('--older-than=')) || '').split('=')[1] || 120) * 60000;
const tmp = fs.realpathSync(process.env.EMPATHIA_CLEAN_TMP || os.tmpdir());

/** every prefix the repository gives mkdtemp under the temp directory */
export function prefixes(root = repo) {
  const found = new Set(['empathia-test-run-']);
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f);
    else if (/\.(mjs|js|ts|py)$/.test(e.name)) { const s = fs.readFileSync(f, 'utf8');
      for (const m of s.matchAll(/mkdtemp(?:Sync)?\(\s*path\.join\(\s*os\.tmpdir\(\)\s*,\s*['"`]([A-Za-z0-9._-]+-)['"`]\s*\)/g)) found.add(m[1]);
      for (const m of s.matchAll(/mkdtemp\(\s*prefix\s*=\s*['"]([A-Za-z0-9._-]+-)['"]/g)) found.add(m[1]); } } };
  for (const d of ['tests', 'scripts', 'deploy', 'apps', 'packages', 'services', 'ml']) if (fs.existsSync(path.join(root, d))) walk(path.join(root, d));
  return [...found].sort();
}
const size = (dir) => { let n = 0; const st = [dir]; while (st.length) { const d = st.pop(); let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; } for (const e of es) { const f = path.join(d, e.name); if (e.isDirectory() && !e.isSymbolicLink()) st.push(f); else { try { n += fs.lstatSync(f).size; } catch { /* gone */ } } } } return n; };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pre = prefixes(); const now = Date.now(); const by = new Map(); let total = 0; let count = 0;
  for (const e of fs.readdirSync(tmp, { withFileTypes: true })) {
    if (!e.isDirectory() || e.isSymbolicLink()) continue;
    const p = pre.find((x) => e.name.startsWith(x) && /^[A-Za-z0-9]{6}$/.test(e.name.slice(x.length))); if (!p) continue;
    const f = path.join(tmp, e.name); let st; try { st = fs.statSync(f); } catch { continue; } if (now - st.mtimeMs < older) continue;
    const b = size(f); total += b; count += 1; const g = by.get(p) || { n: 0, b: 0 }; g.n += 1; g.b += b; by.set(p, g);
    if (apply) fs.rmSync(f, { recursive: true, force: true });
  }
  for (const [p, g] of [...by].sort((a, b) => b[1].b - a[1].b).slice(0, 25)) console.log(`${String(g.n).padStart(5)}  ${(g.b / 2 ** 20).toFixed(0).padStart(6)} MB  ${p}*`);
  console.log(`${apply ? 'removed' : 'would remove'} ${count} directories, ${(total / 2 ** 30).toFixed(2)} GB, from ${tmp} (${pre.length} known prefixes${apply ? '' : '; nothing changed: pass --apply'})`);
}
