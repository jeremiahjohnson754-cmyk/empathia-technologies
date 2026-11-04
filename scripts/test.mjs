#!/usr/bin/env node
/**
 * Run the test suites and write one machine-readable result: tests/evidence/TEST_RESULTS.json (+ a Markdown table).
 *
 *   node scripts/test.mjs                 unit + integration + security (needs: node scripts/build.mjs; node scripts/db.mjs up)
 *   node scripts/test.mjs --browser       + enterprise web E2E (Chromium)
 *   node scripts/test.mjs --studio        + Founder Studio browser test and the town-hall E2E (need the built studio and the films)
 *   node scripts/test.mjs --films         + full ffmpeg decode of every curated film (slow)
 *
 * Every suite is PASS, FAIL or NOT_RUN — a suite that was not run is never counted as passed. Counts come from the runners' own output.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const has = (f) => process.argv.includes(f);
const suites = [];
const tap = (out) => ({ tests: Number(/^# tests (\d+)/m.exec(out)?.[1] ?? NaN), pass: Number(/^# pass (\d+)/m.exec(out)?.[1] ?? NaN), fail: Number(/^# fail (\d+)/m.exec(out)?.[1] ?? NaN) });
const custom = (out) => {
  let m = /(\d+)\/(\d+) PASS/.exec(out); if (m) return { tests: Number(m[2]), pass: Number(m[1]), fail: Number(m[2]) - Number(m[1]) };
  m = /(\d+) passed, (\d+) failed(?:, (\d+) not run)?/.exec(out); if (m) return { tests: Number(m[1]) + Number(m[2]), pass: Number(m[1]), fail: Number(m[2]), notRun: Number(m[3] || 0) };
  m = /(\d+) of (\d+) passed/.exec(out); if (m) return { tests: Number(m[2]), pass: Number(m[1]), fail: Number(m[2]) - Number(m[1]) };
  return { tests: NaN, pass: NaN, fail: NaN };
};
const unittest = (out) => { const n = Number(/^Ran (\d+) test/m.exec(out)?.[1] ?? NaN); const f = /FAILED \((?:failures=(\d+))?(?:, )?(?:errors=(\d+))?/.exec(out); const fail = f ? Number(f[1] || 0) + Number(f[2] || 0) : 0; return { tests: n, pass: n - fail, fail }; };

function suite(name, kind, cmd, args, parse, opts = {}) {
  if (opts.skip) { suites.push({ suite: name, kind, result: 'NOT_RUN', why: opts.skip }); console.log(`NOT_RUN  ${name} — ${opts.skip}`); return; }
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { cwd: opts.cwd || root, encoding: 'utf8', maxBuffer: 256 << 20, timeout: opts.timeout || 600000, env: { ...process.env, LOG_LEVEL: 'error' } });
  const out = `${r.stdout}\n${r.stderr}`;
  const c = parse(out);
  const result = r.status === 0 && c.fail === 0 && c.tests > 0 ? 'PASS' : 'FAIL';
  suites.push({ suite: name, kind, result, ...c, seconds: Math.round((Date.now() - t0) / 100) / 10, command: [path.relative(root, cmd) || cmd, ...args.map((a) => a.replace(root + '/', ''))].join(' ') });
  console.log(`${result.padEnd(7)}  ${name}  ${c.pass}/${c.tests}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (result === 'FAIL') console.log(out.split('\n').filter((l) => /not ok|FAIL|Error|assert/i.test(l)).slice(0, 12).join('\n'));
}

const node = process.execPath;
for (const p of ['packages/commissioning-engine', 'packages/event-contracts', 'packages/relationship-engine', 'packages/search-party', 'packages/project-governance', 'packages/service-engine', 'packages/apex-engine', 'packages/kpi-engine', 'packages/field-intelligence', 'packages/assurance-engine', 'packages/observability', 'packages/api-client', 'packages/schemas', 'integrations/contracts', 'integrations/mocks']) {
  const dir = path.join(root, p, 'dist/test');
  suite(`unit: ${p}`, 'unit', node, ['--test', `${p}/dist/test/**/*.test.js`], tap, fs.existsSync(dir) ? {} : { skip: 'not built (node scripts/build.mjs)' });
}
suite('unit: packages/design-tokens (contrast both themes, D7/D37/D38)', 'unit', node, ['--test', 'packages/design-tokens/test/*.test.mjs'], tap);
suite('unit: packages/ui (canonical products, ui.css on the tokens)', 'unit', node, ['--test', 'packages/ui/test/*.test.mjs'], tap);
suite('unit: ml research prototype (python)', 'unit', 'python3', ['-I', '-m', 'unittest', 'discover', '-s', 'ml/tests'], unittest, fs.existsSync(path.join(root, 'ml/datasets/synthetic_first_attempt_v1.csv')) ? {} : { skip: 'dataset not generated (node ml/datasets/generate_synthetic.mjs; python3 -I ml/training/train.py)' });
suite('service: intelligence-python', 'integration', 'python3', ['-I', '-m', 'unittest', 'discover', '-s', 'services/intelligence-python/tests'], unittest);
const db = fs.existsSync(path.join(root, '.local/pg/credentials.json'));
for (const f of ['tests/integration/api.test.mjs', 'tests/integration/leads.test.mjs', 'tests/integration/api-client.test.mjs', 'tests/integration/integration-worker.test.mjs', 'tests/integration/observability.test.mjs']) suite(`integration: ${path.basename(f)}`, 'integration', node, ['--test', f], tap, db ? {} : { skip: 'no local database (node scripts/db.mjs up)' });
suite('security: authz.test.mjs', 'security', node, ['--test', 'tests/security/authz.test.mjs'], tap, db ? {} : { skip: 'no local database (node scripts/db.mjs up)' });
suite('security: founder-boundary.test.mjs', 'security', node, ['--test', 'tests/security/founder-boundary.test.mjs'], tap, db ? {} : { skip: 'no local database (node scripts/db.mjs up)' });
for (const f of ['tests/security/site-scope.test.mjs', 'tests/security/authority-matrix.test.mjs', 'tests/security/governance.test.mjs', 'tests/security/administration.test.mjs', 'tests/security/search-party.test.mjs', 'tests/security/oidc.test.mjs', 'tests/security/project-lifecycle.test.mjs', 'tests/security/service-lifecycle.test.mjs', 'tests/security/apex.test.mjs', 'tests/security/field-intelligence.test.mjs', 'tests/security/learn.test.mjs', 'tests/security/mission-control.test.mjs', 'tests/security/competency.test.mjs', 'tests/security/ledger.test.mjs', 'tests/security/measurement-import.test.mjs', 'tests/security/hardening.test.mjs']) suite(`security: ${path.basename(f)}`, 'security', node, ['--test', f], tap, db ? {} : { skip: 'no local database (node scripts/db.mjs up)' });
suite('e2e: website lead form over the API', 'e2e', node, ['tests/e2e/website-lead.e2e.mjs'], custom, has('--browser') ? (db ? {} : { skip: 'no local database' }) : { skip: 'pass --browser' });
suite('browser: enterprise web E2E', 'e2e', node, ['tests/browser/enterprise-web.test.mjs'], custom, has('--browser') ? {} : { skip: 'pass --browser' });
suite('browser: design tokens (themes, theme-init, Inter)', 'browser', node, ['tests/browser/tokens.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'packages/design-tokens/dist/tokens.css')) ? {} : { skip: 'tokens not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
suite('browser: brand and type on the three surfaces (D39, D7)', 'browser', node, ['tests/browser/brand.test.mjs'], custom, has('--browser') ? (['website', 'demo', 'enterprise-web'].every((a) => fs.existsSync(path.join(root, `apps/${a}/dist/index.html`))) ? {} : { skip: 'surfaces not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
suite('browser: public website', 'browser', node, ['tests/browser/website.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/website/dist/sitemap.xml')) ? {} : { skip: 'website not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
suite('browser: investor demo shell', 'browser', node, ['tests/browser/demo.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? {} : { skip: 'demo not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
// rebuild/demo-spaces: campus, rooms, tours, search bar, Search Party scenarios (unit + browser, light and dark in one run)
suite('unit: demo spaces (campus records, search, scenarios, tours)', 'unit', node, ['--test', 'tests/unit/demo-spaces.test.mjs'], tap);
for (const s of ['demo-campus', 'demo-rooms', 'demo-tours', 'demo-searchbar', 'demo-search-scenarios']) suite(`browser: ${s}`, 'browser', node, [`tests/browser/${s}.test.mjs`], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? { timeout: 1200000 } : { skip: 'demo not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
const studio = fs.existsSync(path.join(root, 'apps/founder-studio/dist/index.html'));
suite('browser: Founder Studio', 'browser', node, ['tests/browser/founder-studio.test.mjs'], custom, has('--studio') ? (studio ? {} : { skip: 'studio not built (node scripts/build.mjs --studio)' }) : { skip: 'pass --studio' });
suite('e2e: founder town hall (Founder Edition)', 'e2e', node, ['tests/e2e/founder-townhall.e2e.mjs'], custom, has('--studio') ? (studio ? {} : { skip: 'studio not built' }) : { skip: 'pass --studio' });
suite('e2e: founder decisions (hosted studio over the API)', 'e2e', node, ['tests/e2e/founder-decisions.e2e.mjs'], custom, has('--studio') ? (studio && db ? {} : { skip: 'studio not built or no local database' }) : { skip: 'pass --studio' });
suite('media: full decode of every curated film', 'media', node, ['tests/media/decode-films.mjs'], custom, has('--films') ? { timeout: 7200000 } : { skip: 'pass --films (slow: decodes ~47 minutes of video)' });

const counted = (out) => { const m = /PASS (\d+) · FAIL (\d+)/.exec(out); return m ? { tests: Number(m[1]) + Number(m[2]), pass: Number(m[1]), fail: Number(m[2]) } : { tests: NaN, pass: NaN, fail: NaN }; };
const pyyaml = spawnSync('python3', ['-I', '-c', 'import yaml'], { encoding: 'utf8' }).status === 0;
suite('deploy: Render Blueprints (static validation)', 'deploy', 'python3', ['-I', 'scripts/staging/validate-blueprints.py'], counted, pyyaml ? {} : { skip: 'PyYAML not installed (pip install pyyaml)' });
suite('deploy: public sites audit (functional, a11y, responsive; no P0/P1)', 'deploy', node, ['scripts/audit/site-audit.mjs', '--strict', '--out=tests/evidence/SITE_AUDIT.json'], counted, has('--browser') ? (fs.existsSync(path.join(root, 'apps/website/dist/index.html')) && fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? { timeout: 1800000 } : { skip: 'public sites not built' }) : { skip: 'pass --browser' });
suite('deploy: public static sites under the declared headers', 'deploy', node, ['scripts/staging/verify-static.mjs'], counted, has('--browser') ? (fs.existsSync(path.join(root, 'apps/website/dist/index.html')) && fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? {} : { skip: 'public sites not built (node scripts/build.mjs --public)' }) : { skip: 'pass --browser' });

const out = path.join(root, 'tests/evidence'); fs.mkdirSync(out, { recursive: true });
const sum = { at: new Date().toISOString(), node: process.version, pass: suites.filter((s) => s.result === 'PASS').length, fail: suites.filter((s) => s.result === 'FAIL').length, notRun: suites.filter((s) => s.result === 'NOT_RUN').length, suites };
fs.writeFileSync(path.join(out, 'TEST_RESULTS.json'), JSON.stringify(sum, null, 2));
fs.writeFileSync(path.join(out, 'TEST_RESULTS.md'), ['# Test results', '', `Run ${sum.at} on Node ${sum.node}. PASS ${sum.pass} · FAIL ${sum.fail} · NOT_RUN ${sum.notRun} suites.`, '', '| Suite | Kind | Result | Passed / tests | Seconds | Why not run |', '|---|---|---|---|---|---|',
  ...suites.map((s) => `| ${s.suite} | ${s.kind} | ${s.result} | ${s.result === 'NOT_RUN' ? '—' : `${s.pass}/${s.tests}`} | ${s.seconds ?? '—'} | ${s.why ?? ''} |`)].join('\n') + '\n');
console.log(`\nPASS ${sum.pass} · FAIL ${sum.fail} · NOT_RUN ${sum.notRun} — tests/evidence/TEST_RESULTS.md`);
process.exit(sum.fail ? 1 : 0);
