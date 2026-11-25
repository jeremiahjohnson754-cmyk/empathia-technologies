/**
 * Which browser suites a change reaches (step 3 of the engineering sequence; founder, 25 Nov 2026 07:50 CT). Used by scripts/preflight.mjs
 * and tested by tests/unit/preflight.test.mjs.
 *
 * Rewritten the same day after an independent review of the first version found it missed whole classes of change: it read the page
 * registry with a regular expression and lost 31 pages; '*' routes and addresses built at run time matched nothing; CSS, build scripts,
 * data, the sandbox server and the studio were invisible; modules the app frame mounts and modules a page loads with import() reached no
 * page. The rules now, each with the failure it answers:
 *   - The pages are the registry itself, bundled and evaluated in Node (as tests/unit/demo-policy.test.mjs does), so every page and
 *     alias is seen, however the entry is written; a page's code is read from its loader, including adapt(), the shell entries and the
 *     operational workspaces.
 *   - The import graph follows static imports and import(), except the registry's own import()s, which would make every page reach every
 *     other.
 *   - Every changed file is placed or the change chooses every suite ("fail closed"): a file this module cannot place is named and the
 *     whole set runs. Only files that cannot change what a browser shows are left out (documents, the ledger and evidence, non-browser
 *     tests and the scripts that run them), and step 2 runs every non-browser suite.
 *   - Something the whole app shares (the shell, App and what it mounts, the interface kit, global CSS, the build, the registry's
 *     helpers, a module twelve or more pages reach) chooses the suites that walk across products; global CSS, the build and the packages
 *     choose every suite.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const rel = (root, f) => path.relative(root, f).split(path.sep).join('/');
/** a NOT RUN line a working run may have: one step 3 covers (pass --browser, pass --studio), or one of the two the regression itself leaves NOT
 *  RUN on the workstation, matched by the runner's own reasons (scripts/test.mjs): the ML prototype's dataset, and the full film decode */
export const MAY_NOT_RUN = /— pass --browser|— pass --studio|^NOT_RUN\s+unit: ml research prototype \(python\) — dataset not generated|^NOT_RUN\s+media: full decode of every curated film — pass --films/;

// ---- addresses ----------------------------------------------------------------------------------------------------------------------
/** the segments of a route pattern or an address; an address a suite builds at run time ('#/here/${id}') keeps its open last segment */
export const segs = (p) => p.replace(/^#?\//, '').split('?')[0].split('/');
/** an address matches a route when every segment matches: a ':param' or an open segment matches one segment, '*' the rest */
export function matches(route, addr) {
  const r = segs(route), a = segs(addr);
  for (let i = 0; i < r.length; i++) { if (r[i] === '*') return a.length >= i; if (i >= a.length) return false; if (!(r[i].startsWith(':') || a[i] === '' || a[i] === r[i])) return false; }
  return a.length === r.length;
}
/** the addresses a suite's source names: '#/x/y', and '#/x/' where the rest is built at run time */
export const addressesIn = (src) => [...new Set([...src.matchAll(/#(\/[\w\-./%:*]*?)(?=\$\{|[?'"`#\s)\],;]|$)/g)].map((m) => m[1]))].filter((a) => a !== '/');

// ---- the page registry, evaluated -----------------------------------------------------------------------------------------------------
export async function loadPages(root, scratch) {
  const esbuild = await import(path.join(root, 'node_modules/esbuild/lib/main.js')); const src = path.join(root, 'apps/demo/src');
  fs.mkdirSync(scratch, { recursive: true }); const out = path.join(scratch, `registry-${process.pid}.mjs`);
  await esbuild.build({ stdin: { contents: "export { PAGES } from './registry.pages.ts';", resolveDir: src, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', splitting: false,
    nodePaths: [path.join(root, 'node_modules')], alias: { '@empathia/ui': path.join(root, 'packages/ui/src/index.ts') }, define: { 'process.env.DEMO_BUILD_ID': '"preflight"', 'process.env.DEMO_API_URL': '"http://preflight.invalid"' },   // the server pages exist only in a build with an API (registry.ops.ts); the suites for them build one
    plugins: [{ name: 'registry', setup(b) {
      // a page's code stays a lazy import(), never executed; the three loader helpers are replaced by ones that say what they load
      b.onResolve({ filter: /\.js$/ }, (a) => (a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined));
      b.onResolve({ filter: /hardening\/opsRoutes\.js$/ }, (a) => (/registry[^/]*\.ts$/.test(a.importer) ? { path: 'ops', namespace: 'shim' } : undefined));
      b.onResolve({ filter: /registry\.adapt\.js$/ }, () => ({ path: 'adapt', namespace: 'shim' }));
      b.onLoad({ filter: /.*/, namespace: 'shim' }, (a) => ({ loader: 'js', contents: a.path === 'ops'
        ? "export const opsLoad = (n) => Object.assign(() => undefined, { __mod: 'ws:' + n }); export const OPS_WORKSPACES = [];"
        : 'export const adapt = (load, render) => Object.assign(() => load().then(render), { __src: String(load) });' }));
      b.onLoad({ filter: /registry[^/]*\.ts$/ }, (a) => ({ loader: 'ts', contents: fs.readFileSync(a.path, 'utf8').replace(/\bentry\('(\w+)'\)/g, "Object.assign(entry('$1'), { __mod: 'shell:$1' })") }));
    } }] });
  const { PAGES } = await import(`${pathToFileURL(out).href}?t=${Date.now()}`); fs.rmSync(out, { force: true });
  const build = fs.readFileSync(path.join(root, 'apps/demo/build.mjs'), 'utf8');
  const mapOf = (name) => { const m = new RegExp(`const ${name} = \\{([^}]*)\\}`).exec(build); return Object.fromEntries([...(m ? m[1] : '').matchAll(/(\w+):\s*'([^']+)'/g)].map((x) => [x[1], path.join(src, x[2])])); };
  const SHELL = mapOf('SHELL_PAGES'), WORK = mapOf('WORKSPACES');
  return PAGES.map((p) => { const text = `${String(p.load || '')} ${p.load?.__src || ''}`; const mods = [...text.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)].map((m) => path.resolve(src, m[1]).replace(/\.js$/, ''));
    const tag = p.load?.__mod || ''; if (tag.startsWith('shell:')) mods.push(SHELL[tag.slice(6)]); if (tag.startsWith('ws:')) mods.push(WORK[tag.slice(3)]);
    // a loader that calls a helper inside its body (const DESK = () => opsLoad('decisions')().then(…)) names it in its text
    for (const m of text.matchAll(/\bopsLoad\d*\(\s*["'](\w+)["']\s*\)/g)) mods.push(WORK[m[1]]); for (const m of text.matchAll(/\bentry\d*\(\s*["'](\w+)["']\s*\)/g)) mods.push(SHELL[m[1]]);
    const modules = mods.filter(Boolean).map((m) => ['', '.tsx', '.ts'].map((e) => m.replace(/\.(tsx|ts)$/, '') + e).find((c) => fs.existsSync(c) && fs.statSync(c).isFile())).filter(Boolean);
    return { id: p.id, paths: [p.path, ...(p.alias || [])].filter((x) => typeof x === 'string'), modules }; });
}

// ---- the import graph -----------------------------------------------------------------------------------------------------------------
export function buildGraph(root) {
  const dirs = ['apps/demo/src', ...fs.readdirSync(path.join(root, 'packages')).map((p) => `packages/${p}/src`)].filter((d) => fs.existsSync(path.join(root, d)));
  const files = []; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules') walk(f); } else if (/\.(tsx?|mjs|js)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) files.push(f); } };
  dirs.forEach((d) => walk(path.join(root, d)));
  const pkg = (name) => ['src/index.ts', 'src/index.tsx', 'src/index.mjs'].map((c) => path.join(root, 'packages', name, c)).find((f) => fs.existsSync(f)) || null;
  const resolve = (from, spec) => { if (spec.startsWith('@empathia/')) { const [name, ...rest] = spec.slice(10).split('/'); return rest.length ? resolve(path.join(root, 'packages', name, 'x'), `./${rest.join('/')}`) : pkg(name); }
    if (!spec.startsWith('.')) return null; const b = path.resolve(path.dirname(from), spec); const stem = b.replace(/\.(js|mjs|ts|tsx)$/, '');
    for (const c of [b, `${stem}.ts`, `${stem}.tsx`, `${stem}.mjs`, `${stem}.js`, path.join(b, 'index.ts'), path.join(b, 'index.tsx')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c; return null; };
  const deps = new Map(), importers = new Map();
  for (const f of files) { const s = fs.readFileSync(f, 'utf8'); const out = new Set(); const reg = /apps\/demo\/src\/registry[^/]*\.ts$/.test(f.split(path.sep).join('/'));
    // static imports, re-exports, side-effect imports and import(); not the registry's import()s (its pages), which would join every page to every other
    const specs = [...s.matchAll(/(?:\bfrom\s+|^\s*import\s+)['"]([^'"]+)['"]/gm)].map((m) => m[1]); if (!reg) specs.push(...[...s.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]));
    for (const sp of specs) { const t = resolve(f, sp); if (t) out.add(t); }
    deps.set(f, out); for (const t of out) { if (!importers.has(t)) importers.set(t, new Set()); importers.get(t).add(f); } }
  const reach = (start) => { const seen = new Set(start); const q = [...start]; while (q.length) { const x = q.pop(); for (const i of importers.get(x) || []) if (!seen.has(i)) { seen.add(i); q.push(i); } } return seen; };
  return { files, deps, importers, reach };
}

// ---- the suites -------------------------------------------------------------------------------------------------------------------------
/** every browser, end-to-end and site suite the regression runs, read from scripts/test.mjs; and the browser suites it does not run */
export function registered(root) {
  const t = fs.readFileSync(path.join(root, 'scripts/test.mjs'), 'utf8'); const B = path.join(root, 'tests/browser');
  const browser = fs.readdirSync(B).filter((f) => f.endsWith('.test.mjs')).map((f) => f.replace(/\.test\.mjs$/, ''));
  const inRunner = (n) => t.includes(`tests/browser/${n}.test.mjs`) || new RegExp(`['"]${n.replace(/[-]/g, '\\-')}['"]`).test(t);
  const files = browser.filter(inRunner).map((n) => `tests/browser/${n}.test.mjs`);
  // the end-to-end suites and the two site checks the regression runs only with --browser or --studio (the other audit scripts run in step 2)
  for (const m of t.matchAll(/['"]((?:tests\/e2e\/[\w.-]+\.mjs)|(?:scripts\/audit\/site-audit\.mjs)|(?:scripts\/staging\/verify-static\.mjs))['"]/g)) if (!files.includes(m[1])) files.push(m[1]);
  return { files, unregistered: browser.filter((n) => !inRunner(n)).map((n) => `tests/browser/${n}.test.mjs`) };
}

// the suites that walk across products: a change to something every product shares shows up there first (the "Back to …" chip on the
// Field Intelligence page, 52cdd952). Each is named with what it walks; preflight refuses to run if one does not exist.
export const ACROSS = {
  'demo-route-sweep': 'every address, every role', 'demo-deadends': 'every control on every fixed page', 'demo-access': 'refusals and destructive failures across pages',
  'demo-return-trail': 'the "Back to …" chip on every product', 'demo-search-journey': 'search into rooms, ServiceHands, Lite and back', 'demo-phoneshell': 'the shell at phone width across products',
  'demo-tours': 'guided tours across products', 'demo-rolehome': 'each role’s home and its links', 'demo': 'the investor demo shell', 'demo-offline': 'the offline copy of every page', 'demo-launch': 'launches from one product into another',
};

// files that cannot change what a browser shows (step 2 runs every non-browser suite); everything else must be placed
const NO_BROWSER = /^(docs\/(?!legacy-parity\.csv)|[^/]+\.md$|LICENSE|\.github\/|tests\/(unit|security|integration)\/|tests\/evidence|tests\/REGRESSION_LEDGER\.jsonl|scripts\/(test|preflight|regression[\w-]*)\.mjs$|scripts\/lib\/impact\.mjs$|scripts\/verify\/|scripts\/private\/)/;
const SHARED = /^apps\/demo\/src\/(App\.tsx|main\.tsx|shell\/|access\/|hardening\/|registry\.(adapt|types|pages)\.ts|styles\/)/;

export async function select({ root, changed, scratch }) {
  const pages = await loadPages(root, scratch); const g = buildGraph(root); const { files: runnable, unregistered } = registered(root);
  const suites = runnable.map((f) => { const src = fs.readFileSync(path.join(root, f), 'utf8'); const libs = [...src.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)].map((m) => rel(root, path.resolve(path.dirname(path.join(root, f)), m[1])));
    return { file: f, name: path.basename(f).replace(/\.(test\.mjs|e2e\.mjs|mjs)$/, ''), src, libs, addrs: addressesIn(src), everyRoute: /registry/.test(src) && /readdirSync/.test(src) }; });
  const why = new Map(); const choose = (s, reason) => { if (!why.has(s.file)) why.set(s.file, []); if (why.get(s.file).length < 4) why.get(s.file).push(reason); };
  const byName = (re) => suites.filter((s) => re.test(s.name)); const all = (reason) => suites.forEach((s) => choose(s, reason));
  const demo = () => suites.filter((s) => /^demo|^tokens$|^brand$|^site-audit$|^verify-static$/.test(s.name)); const unplaced = []; const shared = [];
  const across = (f, n) => { shared.push(f); for (const name of Object.keys(ACROSS)) { const s = suites.find((x) => x.name === name); if (s) choose(s, `${f} is shared${n ? ` (${n} pages reach it)` : ''}: ${ACROSS[name]}`); } };
  const viaGraph = (abs, label) => {
    const r = g.reach([abs]); const served = pages.filter((p) => p.modules.some((m) => r.has(m)));
    for (const p of served) for (const route of p.paths) for (const s of suites) if (s.everyRoute || s.addrs.some((a) => matches(route, a))) choose(s, `${label} → #${route}`);
    const frame = [...r].some((x) => /apps\/demo\/src\/(App|main)\.tsx$/.test(x.split(path.sep).join('/')));
    if (SHARED.test(rel(root, abs)) || frame || served.length >= 12) across(label, served.length);
    return served.length || frame || SHARED.test(rel(root, abs));
  };
  for (const f of changed) {
    const abs = path.join(root, f);
    if (NO_BROWSER.test(f)) continue;
    const own = suites.find((s) => s.file === f); if (own) { choose(own, 'the suite itself changed'); continue; }
    if (/^tests\/(browser|lib|e2e)\/[^/]+\.mjs$/.test(f)) { const users = suites.filter((s) => s.libs.includes(f) || s.src.includes(path.basename(f))); users.forEach((s) => choose(s, `its library ${f} changed`)); if (!users.length) unplaced.push(f); continue; }
    if (/^(scripts\/build\.mjs|package(-lock)?\.json|packages\/|apps\/demo\/(build[\w.-]*\.mjs|server\/|public\/|index\.html)|docs\/legacy-parity\.csv|legacy\/)/.test(f) || (/^apps\/demo\/src\/styles\//.test(f))) { all(`${f} reaches every page (the build, the packages, global CSS or the data every page reads)`); continue; }
    if (/^apps\/demo\/src\/.+\.css$/.test(f)) { const dir = path.dirname(abs); let n = 0; for (const m of g.files.filter((x) => path.dirname(x) === dir)) n += viaGraph(m, `${f} (styles ${rel(root, m)})`) ? 1 : 0; across(f); byName(/^site-audit$/).forEach((s) => choose(s, `${f}: touch targets and contrast on the sites`)); continue; }
    if (/^apps\/demo\/src\//.test(f) && (g.deps.has(abs) || g.importers.has(abs))) { if (!viaGraph(abs, f)) unplaced.push(f); continue; }
    if (/^apps\/website\//.test(f) || /^scripts\/(audit|staging)\//.test(f)) { byName(/^(website|brand|site-audit|verify-static|website-lead)/).forEach((s) => choose(s, `${f} (the public website)`)); continue; }
    if (/^apps\/(enterprise-web|api)\/|^services\//.test(f)) { byName(/^(enterprise-web|demo-flagship|demo-connected|website-lead|founder-decisions)/).forEach((s) => choose(s, `${f} (the server and its sandbox)`)); continue; }
    if (/^apps\/founder-studio\//.test(f)) { byName(/^(founder-studio|founder-townhall|founder-decisions)/).forEach((s) => choose(s, `${f} (the Founder Studio)`)); continue; }
    unplaced.push(f);
  }
  if (unplaced.length) all(`not placed, so every suite runs: ${unplaced.slice(0, 3).join(', ')}${unplaced.length > 3 ? ` and ${unplaced.length - 3} more` : ''}`);
  const rank = (f) => (why.get(f).some((w) => /suite itself|library/.test(w)) ? 0 : why.get(f).some((w) => / → #/.test(w)) ? 1 : 2);
  const chosen = [...why.keys()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).map((f) => ({ file: f, name: suites.find((s) => s.file === f).name, reasons: why.get(f) }));
  return { chosen, unplaced, shared, pages, suites, unregistered, graphSize: g.files.length };
}
