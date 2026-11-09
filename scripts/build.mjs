#!/usr/bin/env node
/**
 * Build everything that builds in this repository, in dependency order, and write a build log.
 *
 *   node scripts/build.mjs [--studio] [--founder-edition=<path>]
 *
 * 1. link the workspace (scripts/bootstrap.mjs)            5. regenerate-check the OpenAPI document and typed client
 * 2. design tokens                                          6. enterprise web app bundle
 * 3. TypeScript projects (tsc -b), libraries then services  7. Founder Studio (only with --studio: needs the Founder Edition HTML)
 * 4. type-check the React apps and the UI library
 * The log and a JSON summary go to .local/logs/. Any failing step stops the build (exit 1).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logs = path.join(root, '.local/logs'); fs.mkdirSync(logs, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logs, `build-${stamp}.log`);
const tsc = path.join(root, 'node_modules/typescript/bin/tsc');
const steps = [];
const log = (s) => { fs.appendFileSync(logFile, s + '\n'); };

function run(name, cmd, args, cwd = root) {
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 64 << 20 });
  const ok = r.status === 0;
  const ms = Date.now() - t0;
  log(`\n=== ${name} (${cmd} ${args.join(' ')}) — ${ok ? 'PASS' : 'FAIL'} in ${ms} ms\n${r.stdout}${r.stderr}`);
  steps.push({ step: name, result: ok ? 'PASS' : 'FAIL', ms });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${(ms / 1000).toFixed(1)} s)`);
  if (!ok) { console.error((r.stdout + r.stderr).split('\n').slice(-25).join('\n')); finish(1); }
}
function finish(code) {
  const summary = { at: new Date().toISOString(), node: process.version, result: code ? 'FAIL' : 'PASS', steps, log: path.relative(root, logFile) };
  fs.writeFileSync(path.join(logs, 'BUILD_SUMMARY.json'), JSON.stringify(summary, null, 2));
  console.log(`\nbuild ${summary.result} — log ${summary.log}`);
  process.exit(code);
}

// --public: only what the two public static sites need (the website and the synthetic investor demo): engines, their type checks,
// the two bundles and the dist-hygiene gate. Used by the Render static sites (render.yaml); the full build stays the default.
const pub = process.argv.includes('--public');
log(`Empathia build${pub ? ' (public sites only)' : ''} ${new Date().toISOString()} on ${process.platform} ${process.version}`);
run('link workspace', process.execPath, [path.join(root, 'scripts/bootstrap.mjs')]);
run('design tokens', process.execPath, [path.join(root, 'packages/design-tokens/build-tokens.mjs')]);
// v18/pilot: the price list, readiness rules and pilot machines (no dependencies; the API, the website and the demo read it)
run('tsc -b packages/commercial', process.execPath, [tsc, '-b', path.join(root, 'packages/commercial')]);
for (const p of ['packages/domain-types', 'packages/commissioning-engine', 'packages/event-contracts', 'packages/relationship-engine', 'packages/search-party', 'packages/project-governance', 'packages/service-engine', 'packages/apex-engine', 'packages/kpi-engine', 'packages/proof-registry', 'packages/field-intelligence', 'packages/assurance-engine', 'packages/observability',
  'integrations/contracts', 'integrations/mocks', 'services/enterprise-api', 'packages/api-client', 'packages/schemas'].filter((p) => !pub || !['services/enterprise-api', 'packages/api-client', 'packages/schemas', 'integrations/contracts', 'integrations/mocks'].includes(p))) run(`tsc -b ${p}`, process.execPath, [tsc, '-b', path.join(root, p)]);
// the release stamp: the commit the artifact was built from (RELEASE_SHA, else git), read by the API's config for telemetry release correlation
{
  let sha = process.env.RELEASE_SHA || 'unknown';
  if (sha === 'unknown') { const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }); if (r.status === 0) sha = r.stdout.trim(); }
  const dirty = spawnSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: root, encoding: 'utf8' });
  const info = { sha, dirty: dirty.status === 0 ? dirty.stdout.trim().length > 0 : null, builtAt: new Date().toISOString(), node: process.version };
  for (const d of ['services/enterprise-api/dist', 'apps/enterprise-web/src/generated']) { fs.mkdirSync(path.join(root, d), { recursive: true }); fs.writeFileSync(path.join(root, d, 'build-info.json'), JSON.stringify(info)); }
  log(`release stamp ${sha.slice(0, 12)}${info.dirty ? ' (dirty)' : ''}`);
}
if (pub) {
  run('generate apps/demo sources', process.execPath, [path.join(root, 'apps/demo/build.mjs'), '--generate-only']);
  for (const p of ['packages/ui', 'apps/website', 'apps/demo']) run(`type-check ${p}`, process.execPath, [tsc, '-p', path.join(root, p, 'tsconfig.json'), '--noEmit']);
  run('public website (pre-rendered)', process.execPath, [path.join(root, 'apps/website/build.mjs')]);
  run('investor demo shell', process.execPath, [path.join(root, 'apps/demo/build.mjs')]);
  run('dist hygiene (no source maps, no dev override)', process.execPath, [path.join(root, 'scripts/verify/dist-hygiene.mjs')]);
  finish(0);
}
run('JSON Schemas (events, API bodies, entities)', process.execPath, [path.join(root, 'packages/schemas/scripts/generate.mjs')]);
// generated sources first (git-ignored, derived from committed data): a fresh checkout has none until this runs (P7 finding)
run('generate apps/demo sources', process.execPath, [path.join(root, 'apps/demo/build.mjs'), '--generate-only']);
for (const p of ['packages/ui', 'apps/enterprise-web', 'apps/website', 'apps/demo']) run(`type-check ${p}`, process.execPath, [tsc, '-p', path.join(root, p, 'tsconfig.json'), '--noEmit']);
// the Founder Studio type-checks against data it generates from the Founder Edition and the films (apps/founder-studio/src/generated,
// not committed), so it is checked as part of --studio; a clean checkout without --studio reports it NOT_RUN instead of failing
const studioData = fs.existsSync(path.join(root, 'apps/founder-studio/src/generated/docs.json'));
run('OpenAPI and typed client match the route table', process.execPath, [path.join(root, 'scripts/api/export-openapi.mjs'), '--check']);
run('generated architecture diagrams match the source', process.execPath, [path.join(root, 'scripts/docs/diagrams.mjs'), '--check']);
run('enterprise web bundle', process.execPath, [path.join(root, 'apps/enterprise-web/build.mjs')]);
run('public website (pre-rendered)', process.execPath, [path.join(root, 'apps/website/build.mjs')]);
run('investor demo shell', process.execPath, [path.join(root, 'apps/demo/build.mjs')]);
run('dist hygiene (no source maps, no dev override)', process.execPath, [path.join(root, 'scripts/verify/dist-hygiene.mjs')]);
if (process.argv.includes('--studio')) {
  const fe = (process.argv.find((a) => a.startsWith('--founder-edition=')) || '').split('=')[1];
  run('Founder Studio (data + bundle)', process.execPath, [path.join(root, 'apps/founder-studio/build.mjs'), ...(fe ? [`--founder-edition=${fe}`] : [])]);
  run('type-check apps/founder-studio', process.execPath, [tsc, '-p', path.join(root, 'apps/founder-studio/tsconfig.json'), '--noEmit']);
} else if (studioData) run('type-check apps/founder-studio (existing generated data)', process.execPath, [tsc, '-p', path.join(root, 'apps/founder-studio/tsconfig.json'), '--noEmit']);
else steps.push({ step: 'Founder Studio', result: 'NOT_RUN', ms: 0, why: 'pass --studio (needs the Founder Edition HTML and the film files to generate its data)' });
finish(0);
