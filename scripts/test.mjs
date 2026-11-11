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
for (const p of ['packages/commissioning-engine', 'packages/event-contracts', 'packages/relationship-engine', 'packages/search-party', 'packages/project-governance', 'packages/service-engine', 'packages/apex-engine', 'packages/kpi-engine', 'packages/proof-registry', 'packages/field-queue', 'packages/field-intelligence', 'packages/assurance-engine', 'packages/observability', 'packages/api-client', 'packages/schemas', 'integrations/contracts', 'integrations/mocks']) {
  const dir = path.join(root, p, 'dist/test');
  suite(`unit: ${p}`, 'unit', node, ['--test', `${p}/dist/test/**/*.test.js`], tap, fs.existsSync(dir) ? {} : { skip: 'not built (node scripts/build.mjs)' });
}
suite('unit: packages/commercial (price list, pilot readiness, activation machines)', 'unit', node, ['--test', 'packages/commercial/dist/test/**/*.test.js'], tap, fs.existsSync(path.join(root, 'packages/commercial/dist/test')) ? {} : { skip: 'not built (node scripts/build.mjs)' });
suite('unit: packages/design-tokens (contrast both themes, D7/D37/D38)', 'unit', node, ['--test', 'packages/design-tokens/test/*.test.mjs'], tap);
suite('unit: packages/ui (canonical products, ui.css on the tokens)', 'unit', node, ['--test', 'packages/ui/test/*.test.mjs'], tap);
suite('unit: ml research prototype (python)', 'unit', 'python3', ['-I', '-m', 'unittest', 'discover', '-s', 'ml/tests'], unittest, fs.existsSync(path.join(root, 'ml/datasets/synthetic_first_attempt_v1.csv')) ? {} : { skip: 'dataset not generated (node ml/datasets/generate_synthetic.mjs; python3 -I ml/training/train.py)' });
suite('unit: demo access policy and Scouter', 'unit', node, ['--test', 'tests/unit/demo-policy.test.mjs'], tap);
suite('service: intelligence-python', 'integration', 'python3', ['-I', '-m', 'unittest', 'discover', '-s', 'services/intelligence-python/tests'], unittest);
const db = fs.existsSync(path.join(root, '.local/pg/credentials.json'));
for (const f of ['tests/integration/api.test.mjs', 'tests/integration/leads.test.mjs', 'tests/integration/api-client.test.mjs', 'tests/integration/integration-worker.test.mjs', 'tests/integration/observability.test.mjs']) suite(`integration: ${path.basename(f)}`, 'integration', node, ['--test', f], tap, db ? {} : { skip: 'no local database (node scripts/db.mjs up)' });
suite('security: authz.test.mjs', 'security', node, ['--test', 'tests/security/authz.test.mjs'], tap, db ? {} : { skip: 'no local database (node scripts/db.mjs up)' });
suite('security: founder-boundary.test.mjs', 'security', node, ['--test', 'tests/security/founder-boundary.test.mjs'], tap, db ? {} : { skip: 'no local database (node scripts/db.mjs up)' });
for (const f of ['tests/security/proof-registry.test.mjs', 'tests/security/site-scope.test.mjs', 'tests/security/authority-matrix.test.mjs', 'tests/security/governance.test.mjs', 'tests/security/administration.test.mjs', 'tests/security/search-party.test.mjs', 'tests/security/oidc.test.mjs', 'tests/security/project-lifecycle.test.mjs', 'tests/security/service-lifecycle.test.mjs', 'tests/security/apex.test.mjs', 'tests/security/field-intelligence.test.mjs', 'tests/security/learn.test.mjs', 'tests/security/mission-control.test.mjs', 'tests/security/competency.test.mjs', 'tests/security/ledger.test.mjs', 'tests/security/measurement-import.test.mjs', 'tests/security/hardening.test.mjs']) suite(`security: ${path.basename(f)}`, 'security', node, ['--test', f], tap, db ? {} : { skip: 'no local database (node scripts/db.mjs up)' });
suite('e2e: website lead form over the API', 'e2e', node, ['tests/e2e/website-lead.e2e.mjs'], custom, has('--browser') ? (db ? {} : { skip: 'no local database' }) : { skip: 'pass --browser' });
suite('browser: enterprise web E2E', 'e2e', node, ['tests/browser/enterprise-web.test.mjs'], custom, has('--browser') ? {} : { skip: 'pass --browser' });
suite('browser: design tokens (themes, theme-init, Inter)', 'browser', node, ['tests/browser/tokens.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'packages/design-tokens/dist/tokens.css')) ? {} : { skip: 'tokens not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
suite('browser: brand and type on the three surfaces (D39, D7)', 'browser', node, ['tests/browser/brand.test.mjs'], custom, has('--browser') ? (['website', 'demo', 'enterprise-web'].every((a) => fs.existsSync(path.join(root, `apps/${a}/dist/index.html`))) ? {} : { skip: 'surfaces not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
suite('browser: public website', 'browser', node, ['tests/browser/website.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/website/dist/sitemap.xml')) ? {} : { skip: 'website not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
suite('browser: investor demo shell', 'browser', node, ['tests/browser/demo.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? {} : { skip: 'demo not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
// the investor demonstration's operational workspaces (rebuild/demo-ops): unit logic, then one browser suite per workspace
suite('unit: demo operational workspaces', 'unit', node, ['--test', 'tests/unit/demo-ops.test.mjs'], tap);
for (const [n, f] of [['dispatch', 'demo-dispatch'], ['ServiceHands', 'demo-servicehands'], ['Core Replay', 'demo-replay'], ['FI scan replay', 'demo-fi-scan'], ['decisions', 'demo-decisions'], ['destructive-action safeguards', 'demo-destructive'], ['enquiry links', 'demo-enquiry'], ['Learn labs', 'learn-labs'], ['hardening', 'demo-hardening']])
  suite(`browser: investor demo ${n}`, 'browser', node, [`tests/browser/${f}.test.mjs`], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? {} : { skip: 'demo not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
// uplift/parity-areas: the fifteen V2.5.3 areas the rebuild lacked, the Control Tower, and the repo-wide no-placeholder check
suite('browser: demo-parity-areas', 'browser', node, ['tests/browser/demo-parity-areas.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? { timeout: 1200000 } : { skip: 'demo not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
for (const s of ['demo-access', 'demo-viewas', 'demo-phoneshell', 'demo-scouter', 'demo-rolemotion', 'demo-searchparty-bar']) suite(`browser: ${s}`, 'browser', node, [`tests/browser/${s}.test.mjs`], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? {} : { skip: 'demo not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
// rebuild/demo-spaces: campus, rooms, tours, search bar, Search Party scenarios (unit + browser, light and dark in one run)
suite('unit: demo spaces (campus records, search, scenarios, tours)', 'unit', node, ['--test', 'tests/unit/demo-spaces.test.mjs'], tap);
suite('unit: demo Lite (45 rooms, lenses, coverage overlays, four states, wayfinding, QR)', 'unit', node, ['--test', 'tests/unit/demo-lite.test.mjs'], tap);
suite('unit: demo worlds (four worlds, 52 role configurations, no-loss, no grant)', 'unit', node, ['--test', 'tests/unit/demo-worlds.test.mjs'], tap);
suite('unit: demo estates (one model, University 38 classrooms / 4 dormitories / 3 campuses, Stadium, Convention)', 'unit', node, ['--test', 'tests/unit/demo-estates.test.mjs'], tap);
suite('unit: Space Optimizer engine (nine dimensions, options A/B/C, stated rules, every world)', 'unit', node, ['--test', 'tests/unit/demo-optimizer.test.mjs'], tap);
suite('unit: SIGNAL canon (hash manifest, 133 chapters / 1,610 panels / 387 decisions, engine rules, every chapter readable)', 'unit', node, ['--test', 'tests/unit/signal-canon.test.mjs'], tap);
suite('unit: generated documents are current (estate manifests, product census, workflow matrix)', 'unit', node, ['--test', 'tests/unit/docs-generated.test.mjs'], tap);
suite('unit: search that reads the sentence (corrections, conditions, counted answers, drop one condition; every count recomputed from the records)', 'unit', node, ['--test', 'tests/unit/demo-understand.test.mjs'], tap);
suite('unit: request portal (the proposal is the design engine\'s output; sending, refusals, following; who may ask)', 'unit', node, ['--test', 'tests/unit/demo-intake.test.mjs'], tap);
suite('unit: in this room (equipment, history, what a symptom points at, safe guidance, outcomes written to ServiceHands and the room; who may)', 'unit', node, ['--test', 'tests/unit/demo-here.test.mjs'], tap);
suite('unit: room control (panel generated from each room record; no impossible state in 18,000 random presses; commands, simulated adapter, authority, ledger)', 'unit', node, ['--test', 'tests/unit/demo-control.test.mjs'], tap);
suite('unit: connect (people directory and site champions from the estate; verified app-jump formats and encoding; schedule-aware proposals across time zones in thousands of random cases; confirm re-checks and is idempotent; one adapter contract over the simulated calendar and the mock-tested Graph adapter; who may)', 'unit', node, ['--test', 'tests/unit/demo-connect.test.mjs'], tap);
suite('unit: knowledge contract (five trust zones; no cross-tenant read in 20,000 random cases; promotion and sharing need a named person and consent; source hierarchy; freshness)', 'unit', node, ['--test', 'tests/unit/demo-knowledge-contract.test.mjs'], tap);
suite('unit: video QA (narration words, sync, captions, picture; the Film 13 scene record is what its measurements say)', 'unit', node, ['--test', 'tests/unit/media-qc.test.mjs'], tap);
suite('unit: role start pages and keyboard shortcuts (15 roles against the real policy and records; every link opens for its role)', 'unit', node, ['--test', 'tests/unit/demo-rolehome.test.mjs'], tap);
suite('unit: offline worker and its build step (atomic install, shells kept across builds, network-first with fallback, ranged answers, packs)', 'unit', node, ['--test', 'tests/unit/demo-offline.test.mjs'], tap);
suite('unit: game day state machine (phases, faults on estate records, holds, independent verification, public view)', 'unit', node, ['--test', 'tests/unit/demo-gameday.test.mjs'], tap);
suite('unit: demo core screens (health, spine, campus aggregates)', 'unit', node, ['--test', 'tests/unit/demo-core-metrics.test.mjs'], tap);
for (const s of ['demo-campus', 'demo-rooms', 'demo-lite', 'demo-tours', 'demo-searchbar', 'demo-search-scenarios', 'demo-core', 'demo-proof', 'demo-worlds', 'demo-estate', 'demo-optimizer', 'demo-story', 'demo-gameday', 'demo-play', 'demo-offline', 'demo-rolehome', 'demo-request', 'demo-here', 'demo-control', 'demo-connect']) suite(`browser: ${s}`, 'browser', node, [`tests/browser/${s}.test.mjs`], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? { timeout: 1200000 } : { skip: 'demo not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
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
// security assessment 2026-11-04 (docs/security/ASSESSMENT_2026-11-04.md): Blueprint, build chain, local servers and dist (no database), then the browser checks under no headers
suite('security: public sites (headers, build chain, servers, dist)', 'security', node, ['--test', 'tests/security/public-sites.test.mjs'], tap);
suite('browser: public sites security (CSP in the page, no request leaves, injection, tampering, View-as)', 'browser', node, ['tests/browser/public-security.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/website/dist/index.html')) && fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? {} : { skip: 'public sites not built (node scripts/build.mjs --public)' }) : { skip: 'pass --browser' });
// v18/pilot (handoff v1.8 §4): the price list and pilot readiness on the website; the pilot activation API; the demo's sandbox pilot
suite('browser: website pricing and pilot readiness', 'browser', node, ['tests/browser/website-pilot.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/website/dist/pilot.js')) ? {} : { skip: 'website not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });

const out = path.join(root, 'tests/evidence'); fs.mkdirSync(out, { recursive: true });
const sum = { at: new Date().toISOString(), node: process.version, pass: suites.filter((s) => s.result === 'PASS').length, fail: suites.filter((s) => s.result === 'FAIL').length, notRun: suites.filter((s) => s.result === 'NOT_RUN').length, suites };
fs.writeFileSync(path.join(out, 'TEST_RESULTS.json'), JSON.stringify(sum, null, 2));
fs.writeFileSync(path.join(out, 'TEST_RESULTS.md'), ['# Test results', '', `Run ${sum.at} on Node ${sum.node}. PASS ${sum.pass} · FAIL ${sum.fail} · NOT_RUN ${sum.notRun} suites.`, '', '| Suite | Kind | Result | Passed / tests | Seconds | Why not run |', '|---|---|---|---|---|---|',
  ...suites.map((s) => `| ${s.suite} | ${s.kind} | ${s.result} | ${s.result === 'NOT_RUN' ? '—' : `${s.pass}/${s.tests}`} | ${s.seconds ?? '—'} | ${s.why ?? ''} |`)].join('\n') + '\n');
console.log(`\nPASS ${sum.pass} · FAIL ${sum.fail} · NOT_RUN ${sum.notRun} — tests/evidence/TEST_RESULTS.md`);
process.exit(sum.fail ? 1 : 0);
