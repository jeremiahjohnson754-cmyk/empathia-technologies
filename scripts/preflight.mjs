#!/usr/bin/env node
/**
 * Preflight: the short validation that comes before the four-hour exact-commit regression.
 *
 * Founder, 25 Nov 2026 07:50 CT, after the regression on 52cdd952 spent four hours finding two failures that a few minutes of the right
 * tests would have found ("Four-hour regression cycles are too expensive to spend discovering failures that a much shorter preflight
 * could catch"). The engineering sequence is now: 1 implementation · 2 preflight validation · 3 cross-product impact testing ·
 * 4 independent review · 5 full exact-commit regression · 6 staging deployment (docs/engineering-handoff/TESTING_AND_EVIDENCE.md).
 * This script is steps 2 and 3. It does not replace step 5, and nothing it prints is evidence of record: it writes to .local/preflight.
 *
 *   node scripts/preflight.mjs                 build (type checks), every non-browser suite, then the browser suites the change reaches
 *   node scripts/preflight.mjs --list          only say which browser suites the change reaches, and why
 *   --base=<rev>   what the change is measured from (default: the commit of the last passing run in tests/REGRESSION_LEDGER.jsonl)
 *   --head=<rev>   measure a committed change instead of the working tree (for --list: "what would preflight have chosen for X")
 *   --no-build     skip the build (only when nothing has changed since the last build)
 *   --keep-going   run every chosen browser suite even after one fails (by default step 3 stops at the first failure)
 *
 * How the browser suites are chosen (step 3), from the code, not by hand:
 *   a. every browser suite whose own file, or a harness it imports, changed;
 *   b. the demo's import graph (static imports and import() of apps/demo/src and the shared packages) gives every module the change
 *      reaches; the page registry (registry*.ts, with the shell entries and workspaces of apps/demo/build.mjs) gives the addresses those
 *      modules serve; every suite that opens one of those addresses is chosen;
 *   c. a change to something many pages share (the shell, App, the interface kit, or a module twelve or more pages reach) also chooses the
 *      suites that walk across products: those are where a shared change shows up on a page nobody thought of (the "Back to …" chip on
 *      the Field Intelligence page, 52cdd952);
 *   d. a change to the website, the tokens or the brand chooses their suites; a change to a shared test library chooses every suite
 *      that imports it.
 * A suite chosen is run once, in the light scheme, by its own file. What it cannot know: a page reached only by a link from another
 * page's text, or a suite that opens addresses built at run time. Step 5 is still the gate.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
const has = (f) => process.argv.includes(f);
const git = (...a) => { const r = spawnSync('git', a, { cwd: root, encoding: 'utf8' }); if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`); return r.stdout.trim(); };
const rel = (f) => path.relative(root, f).split(path.sep).join('/');

// ---- what changed -----------------------------------------------------------------------------------------------------------------
const lastPass = () => { const lines = fs.readFileSync(path.join(root, 'tests/REGRESSION_LEDGER.jsonl'), 'utf8').trim().split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const p = lines.reverse().find((l) => l.fail === 0 && !l.ci); if (!p) throw new Error('no passing run in the ledger: pass --base'); return p.commit; };
const base = arg('base') || lastPass(); const head = arg('head');
const changed = new Set([...(head ? git('diff', '--name-only', base, head) : git('diff', '--name-only', base)).split('\n'), ...(head ? [] : git('ls-files', '--others', '--exclude-standard').split('\n'))].filter(Boolean));

// ---- the demo's import graph --------------------------------------------------------------------------------------------------------
const SRC_DIRS = ['apps/demo/src', ...fs.readdirSync(path.join(root, 'packages')).map((p) => `packages/${p}/src`).filter((d) => fs.existsSync(path.join(root, d)))];
const files = []; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'generated') walk(f); } else if (/\.(tsx?|mjs|js)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) files.push(f); } };
SRC_DIRS.forEach((d) => walk(path.join(root, d)));
const pkgEntry = (name) => { for (const c of ['src/index.ts', 'src/index.tsx', 'src/index.mjs']) { const f = path.join(root, 'packages', name, c); if (fs.existsSync(f)) return f; } return null; };
const resolve = (from, spec) => {
  if (spec.startsWith('@empathia/')) return pkgEntry(spec.slice(10).split('/')[0]);
  if (!spec.startsWith('.')) return null;
  const b = path.resolve(path.dirname(from), spec); const stem = b.replace(/\.(js|mjs|ts|tsx)$/, '');
  for (const c of [b, `${stem}.ts`, `${stem}.tsx`, `${stem}.mjs`, `${stem}.js`, path.join(b, 'index.ts'), path.join(b, 'index.tsx')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return null;
};
const deps = new Map(); const importers = new Map(); const text = new Map();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8'); text.set(f, s); const out = new Set();
  // static imports only: a module named in an import() (the registry's pages) is loaded later and does not shape the importer. Counting
  // those edges made every page reach every other through the registry, and chose 112 of 134 suites for a two-file change.
  for (const m of s.matchAll(/(?:\bfrom\s+|^\s*import\s+)['"]([^'"]+)['"]/gm)) { const t = resolve(f, m[1]); if (t) out.add(t); }
  deps.set(f, out); for (const t of out) { if (!importers.has(t)) importers.set(t, new Set()); importers.get(t).add(f); }
}
const reach = (start) => { const seen = new Set(start); const q = [...start]; while (q.length) { const x = q.pop(); for (const i of importers.get(x) || []) if (!seen.has(i)) { seen.add(i); q.push(i); } } return seen; };

// ---- the page registry: which addresses each module serves -----------------------------------------------------------------------
const buildSrc = fs.readFileSync(path.join(root, 'apps/demo/build.mjs'), 'utf8');
const mapOf = (name) => { const m = new RegExp(`const ${name} = \\{([^}]*)\\}`).exec(buildSrc); return Object.fromEntries([...(m ? m[1] : '').matchAll(/(\w+):\s*'([^']+)'/g)].map((x) => [x[1], path.join(root, 'apps/demo/src', x[2])])); };
const SHELL = mapOf('SHELL_PAGES'); const WORK = mapOf('WORKSPACES');
const pages = [];   // { paths: ['/replay', '/replay/:room'], modules: [abs] }
for (const f of files.filter((x) => /apps\/demo\/src\/registry[^/]*\.ts$/.test(x))) {
  const s = text.get(f); const starts = [...s.matchAll(/\bid:\s*'[^']+'/g)].map((m) => m.index);
  starts.forEach((at, i) => { const chunk = s.slice(at, starts[i + 1] ?? s.length);
    const paths = [...chunk.matchAll(/\bpath:\s*'([^']+)'/g)].map((m) => m[1]); const al = /\balias:\s*\[([^\]]*)\]/.exec(chunk); if (al) paths.push(...[...al[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
    const mods = [...chunk.matchAll(/import\(\s*'([^']+)'\s*\)/g)].map((m) => resolve(f, m[1])).concat([...chunk.matchAll(/\bentry\('(\w+)'\)/g)].map((m) => SHELL[m[1]]), [...chunk.matchAll(/\bopsLoad\('(\w+)'\)/g)].map((m) => WORK[m[1]])).filter(Boolean);
    if (paths.length && mods.length) pages.push({ paths, modules: mods, file: f }); });
}
// an address a suite opens matches a route when every segment matches (a :param matches any one segment); an address a suite builds at
// run time (`#/replay/${id}`) ends in an open segment, which matches any one
const segs = (p) => p.replace(/^#?\//, '').split('?')[0].split('/').filter((x, i, a) => x !== '' || i < a.length - 1);
const matches = (route, addr) => { const r = segs(route), a = segs(addr); if (r.length !== a.length) return false; return r.every((x, i) => x.startsWith(':') || a[i] === '' || a[i] === x); };

// ---- the browser suites, and what each one opens ----------------------------------------------------------------------------------
const BROWSER = path.join(root, 'tests/browser');
const suites = fs.readdirSync(BROWSER).filter((f) => f.endsWith('.test.mjs')).map((f) => { const file = path.join(BROWSER, f); const s = fs.readFileSync(file, 'utf8');
  const libs = [...s.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)].map((m) => path.resolve(BROWSER, m[1])).filter((x) => fs.existsSync(x)); return { name: f.replace(/\.test\.mjs$/, ''), file, src: s, libs }; });
for (const s of suites) s.addrs = [...new Set([...s.src.matchAll(/#(\/[\w\-./%:]*?)(?=\$\{|[?'"`#\s)\]]|$)/g)].map((m) => (/\$\{/.test(s.src.slice(m.index + m[0].length, m.index + m[0].length + 2)) ? `${m[1]}` : m[1])))];
const opens = (s, route) => s.addrs.some((a) => matches(route, a));
// the suites that walk across products (rule c): each named with what it walks, and checked to exist
const ACROSS = {
  'demo-route-sweep': 'every address, every role', 'demo-access': 'refusals and destructive failures across pages', 'demo-return-trail': 'the "Back to …" chip on every product',
  'demo-search-journey': 'search into rooms, ServiceHands, Lite and back', 'demo-phoneshell': 'the shell at phone width across products', 'demo-tours': 'guided tours across products',
  'demo-rolehome': 'each role’s home and its links', 'demo': 'the investor demo shell', 'demo-offline': 'the offline copy of every page', 'demo-launch': 'launches from one product into another',
};
for (const n of Object.keys(ACROSS)) if (!suites.some((x) => x.name === n)) { console.error(`preflight: the cross-product suite ${n} named in ACROSS does not exist; correct the list`); process.exit(2); }
const SHARED_FILES = /^(apps\/demo\/src\/(App\.tsx|main\.tsx|shell\/|access\/|hardening\/|registry[^/]*\.ts|styles\/)|packages\/)/;

const why = new Map(); const choose = (n, reason) => { if (!why.has(n)) why.set(n, []); if (why.get(n).length < 4) why.get(n).push(reason); };
const changedAbs = [...changed].map((f) => path.join(root, f));
for (const s of suites) { if (changed.has(rel(s.file))) choose(s.name, 'the suite itself changed'); for (const l of s.libs) if (changed.has(rel(l))) choose(s.name, `its harness ${rel(l)} changed`); }
for (const f of changedAbs.filter((x) => deps.has(x))) {
  // a registry file serves the pages it defines; following its importers (every page that calls resolve()) would choose them all
  const isReg = /apps\/demo\/src\/registry[^/]*\.ts$/.test(f); const r = isReg ? new Set([f]) : reach([f]); const served = pages.filter((p) => (isReg ? p.file === f : p.modules.some((m) => r.has(m))));
  const shared = SHARED_FILES.test(rel(f)) || served.length >= 12;
  for (const p of served) for (const route of p.paths) for (const s of suites) if (opens(s, route)) choose(s.name, `${rel(f)} → #${route}`);
  if (shared) for (const n of Object.keys(ACROSS)) choose(n, `${rel(f)} is shared (${served.length} pages reach it): ${ACROSS[n]}`);
}
for (const f of changed) {
  if (/^apps\/website\//.test(f)) suites.filter((s) => /^website/.test(s.name)).forEach((s) => choose(s.name, `${f} (website)`));
  if (/^packages\/(design-tokens|ui)\//.test(f)) suites.filter((s) => /^(tokens|brand)$/.test(s.name)).forEach((s) => choose(s.name, `${f} (tokens and brand)`));
  if (/^tests\/(lib|browser)\/[^/]+\.mjs$/.test(f) && !/\.test\.mjs$/.test(f)) suites.filter((s) => s.src.includes(path.basename(f))).forEach((s) => choose(s.name, `its library ${f} changed`));
}
// the most directly affected first (the suite itself, then the pages the change serves), the cross-product walks last; step 3 stops at the
// first failure (unless --keep-going), so a failing preflight costs minutes, not the whole list
const rank = (n) => (why.get(n).some((w) => /suite itself|harness|library/.test(w)) ? 0 : why.get(n).some((w) => / → #/.test(w)) ? 1 : 2);
const chosen = [...why.keys()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

// expected time, from the last run of record
let secs = {}; try { const r = JSON.parse(fs.readFileSync(path.join(root, 'tests/evidence/TEST_RESULTS.json'), 'utf8')); for (const x of r.suites || []) { const m = /tests\/browser\/([\w-]+)\.test\.mjs/.exec(x.command || ''); if (m && x.seconds) secs[m[1]] = (secs[m[1]] || 0) + x.seconds; } } catch { secs = {}; }
const est = Math.round(chosen.reduce((t, n) => t + (secs[n] || 30), 0) / 60);

console.log(`preflight: ${changed.size} files changed since ${base.slice(0, 8)}${head ? ` (to ${head.slice(0, 8)})` : ' (working tree)'}; ${pages.length} pages in the registry; ${files.length} modules in the graph`);
console.log(`step 3 would run ${chosen.length} of ${suites.length} browser suites (about ${est} min by the last run of record):`);
for (const n of chosen) console.log(`  ${n.padEnd(30)} ${why.get(n).join('; ').slice(0, 170)}`);
if (has('--list')) process.exit(0);
if (head) { console.error('--head measures a committed change for --list; a run checks the working tree'); process.exit(2); }

// ---- run --------------------------------------------------------------------------------------------------------------------------
const commit = git('rev-parse', 'HEAD'); const out = path.join(root, '.local/preflight'); fs.mkdirSync(out, { recursive: true });
const report = [`# Preflight on ${commit.slice(0, 8)}${git('status', '--porcelain') ? ' plus uncommitted changes' : ''}, ${new Date().toISOString()}`, '', `Measured from ${base}. Not evidence of record: the exact-commit regression is.`, ''];
const step = (label, cmd, a) => { const t0 = Date.now(); const r = spawnSync(cmd, a, { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, env: { ...process.env, PW_COLOR_SCHEME: '' } }); const s = Math.round((Date.now() - t0) / 1000);
  const tail = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n'); const ok = r.status === 0; const line = `${ok ? 'PASS' : 'FAIL'}  ${label}  (${s} s)  ${tail[tail.length - 1]?.slice(0, 140) || ''}`;
  console.log(line); report.push(`- ${line}`); if (!ok) { const bad = tail.filter((l) => /^(not ok|FAIL)|Error|✗/.test(l)).slice(0, 8); bad.forEach((l) => { console.log(`      ${l.slice(0, 220)}`); report.push(`    - ${l.slice(0, 220)}`); }); } return ok; };
let ok = true;
if (!has('--no-build')) ok = step('step 2: build, with the type checks', process.execPath, ['scripts/build.mjs']) && ok;
if (ok) ok = step('step 2: every non-browser suite (unit, security, boundaries)', process.execPath, ['scripts/test.mjs']) && ok;
else console.log('the build failed: nothing else is run');
if (ok) { report.push('', `## Step 3: ${chosen.length} browser suites the change reaches`, ''); for (const n of chosen) { const s = suites.find((x) => x.name === n); ok = step(`step 3: ${n}`, process.execPath, [rel(s.file)]) && ok; if (!ok && !has('--keep-going')) { const left = chosen.length - chosen.indexOf(n) - 1; if (left) { console.log(`stopped at the first failure; ${left} suites not run (--keep-going runs them all)`); report.push(`- stopped at the first failure; ${left} not run`); } break; } } }
const file = path.join(out, `${commit.slice(0, 8)}-${new Date().toISOString().replace(/[:.]/g, '-')}.md`); fs.writeFileSync(file, report.join('\n') + '\n');
console.log(`\npreflight ${ok ? 'PASSED' : 'FAILED'} — ${rel(file)}${ok ? '\nnext: step 4, an independent review of the change and of its tests; then step 5, the exact-commit regression' : ''}`);
process.exit(ok ? 0 : 1);
