#!/usr/bin/env node
/**
 * Run the test suites and write one machine-readable result: TEST_RESULTS.json (+ a Markdown table).
 *
 * A run of record writes to tests/evidence, the evidence that is committed with the commit it describes: any run with --part, --merge or
 * --record, and any run under CI. Every other run is a working run and writes to .local/evidence/run-<time>, so it cannot change the
 * record of a regression it is not part of (tests/lib/evidence.mjs; founder directive, 24 Nov 2026).
 *
 *   node scripts/test.mjs                 unit + integration + security (needs: node scripts/build.mjs; node scripts/db.mjs up)
 *   node scripts/test.mjs --browser       + enterprise web E2E (Chromium)
 *   node scripts/test.mjs --studio        + Founder Studio browser test and the town-hall E2E (need the built studio and the films)
 *   node scripts/test.mjs --films         + full ffmpeg decode of every curated film (slow)
 *   node scripts/test.mjs --only=<text>   a working run of the suites whose name contains the text
 *   node scripts/test.mjs --record        a run of record without parts (what the release scripts use)
 *
 * Every suite is PASS, FAIL or NOT_RUN — a suite that was not run is never counted as passed. Counts come from the runners' own output.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { stallsBetween as stallsIn, rerunAfterStall } from './dev/stalls.mjs';
import { collectFrameRates, frameRateLines } from '../tests/lib/frame-rates.mjs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const has = (f) => process.argv.includes(f);
// --part=N/M runs every M-th suite starting at the N-th (1-based), so a full browser regression can run as M shorter parts (a single
// background run on this workstation is limited to two hours); each part writes TEST_RESULTS.part-N-of-M.json, and
// `node scripts/test.mjs --merge=M` joins the parts into TEST_RESULTS.json/.md — failing if any part is missing or ran another commit.
const partArg = /^--part=(\d+)\/(\d+)$/.exec(process.argv.find((a) => a.startsWith('--part=')) || ''); const PART = partArg ? { n: Number(partArg[1]), of: Number(partArg[2]) } : null;
const mergeArg = /^--merge=(\d+)$/.exec(process.argv.find((a) => a.startsWith('--merge=')) || '');
// --only=<text> runs just the suites whose name contains the text: for working runs. A run of record is never narrowed.
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
// --files=a,b runs just the suites whose command names one of these files (the preflight's step 3, 25 Nov 2026): the same runner, timeouts,
// scoring and colour-scheme variants as the regression, for the suites a change reaches. A working run, like --only.
const FILES = (process.argv.find((a) => a.startsWith('--files=')) || '').slice(8).split(',').filter(Boolean);
// ---- where this run writes, and whether it is a run of record
const RECORD = !!(PART || mergeArg || has('--record') || (process.env.CI === 'true' && !ONLY && !FILES.length));
if ((ONLY || FILES.length) && (PART || mergeArg || has('--record'))) { console.error('--only narrows a working run; it cannot be combined with --part, --merge or --record (a run of record runs every suite)'); process.exit(2); }
const out = RECORD ? path.join(root, 'tests/evidence') : path.join(root, '.local/evidence', `run-${new Date().toISOString().replace(/[:.]/g, '-')}`);
if (RECORD) { process.env.EMPATHIA_EVIDENCE = 'record'; delete process.env.EMPATHIA_EVIDENCE_DIR; } else { process.env.EMPATHIA_EVIDENCE = 'scratch'; process.env.EMPATHIA_EVIDENCE_DIR = out; }
fs.mkdirSync(out, { recursive: true });
// ---- disk: refuse to start a run of record without room for it (24 Nov 2026: a regression once ran the disk out part-way through)
const MIN_FREE_GB = Number(process.env.EMPATHIA_MIN_FREE_GB || 3);
if (RECORD && !mergeArg) { const s = fs.statfsSync(root); const free = Number(s.bavail) * Number(s.bsize) / 2 ** 30;
  if (free < MIN_FREE_GB) { console.error(`not started: ${free.toFixed(1)} GB free, and a run of record needs ${MIN_FREE_GB} GB. Free space first (node scripts/dev/clean-test-temp.mjs --apply removes what earlier test runs left in the temp directory).`); process.exit(3); } }
// ---- temp: everything the suites create under the temp directory goes into one directory for this run, removed when it ends.
// Suites make hundreds of small build directories and never remove them; 13,000 of them (5 GB) had collected by 24 Nov 2026.
const RUN_TMP = mergeArg ? null : fs.mkdtempSync(path.join(os.tmpdir(), 'empathia-test-run-'));
// It has the temp directory's own permissions (anyone may create, only the owner may remove): the deployment rehearsal starts a database
// as another user, which puts its socket there.
if (RUN_TMP) { fs.chmodSync(RUN_TMP, 0o1777); process.env.TMPDIR = RUN_TMP; process.on('exit', () => { if (!has('--keep-tmp')) fs.rmSync(RUN_TMP, { recursive: true, force: true }); }); for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(130)); }
// ---- stalls: a small program beside the run notes every time the machine stops running programs for two seconds or more
// (scripts/dev/stall-watch.mjs). A suite that fails while the machine stalled is run once more, and both results are recorded; a suite
// that fails on a machine that kept running is a failure and is not run again.
const STALL_FILE = RUN_TMP ? path.join(RUN_TMP, 'stalls.jsonl') : null;
if (STALL_FILE) { const w = spawn(process.execPath, [path.join(root, 'scripts/dev/stall-watch.mjs'), STALL_FILE], { stdio: ['pipe', 'ignore', 'ignore'] }); w.unref(); process.on('exit', () => { try { w.stdin.end(); w.kill(); } catch { /* already gone */ } }); }
const stallsBetween = (t0, t1) => stallsIn(STALL_FILE, t0, t1);
let seq = 0;
const suites = [];
const tap = (out) => ({ tests: Number(/^# tests (\d+)/m.exec(out)?.[1] ?? NaN), pass: Number(/^# pass (\d+)/m.exec(out)?.[1] ?? NaN), fail: Number(/^# fail (\d+)/m.exec(out)?.[1] ?? NaN) });
const custom = (out) => {
  let m = /(\d+)\/(\d+) PASS/.exec(out); if (m) return { tests: Number(m[2]), pass: Number(m[1]), fail: Number(m[2]) - Number(m[1]) };
  m = /(\d+) passed, (\d+) failed(?:, (\d+) not run)?/.exec(out); if (m) return { tests: Number(m[1]) + Number(m[2]), pass: Number(m[1]), fail: Number(m[2]), notRun: Number(m[3] || 0) };
  m = /(\d+) of (\d+) passed/.exec(out); if (m) return { tests: Number(m[2]), pass: Number(m[1]), fail: Number(m[2]) - Number(m[1]) };
  return { tests: NaN, pass: NaN, fail: NaN };
};
const unittest = (out) => { const n = Number(/^Ran (\d+) test/m.exec(out)?.[1] ?? NaN); const f = /FAILED \((?:failures=(\d+))?(?:, )?(?:errors=(\d+))?/.exec(out); const fail = f ? Number(f[1] || 0) + Number(f[2] || 0) : 0; return { tests: n, pass: n - fail, fail }; };
/** a build that must finish within its budgets: one check, PASS when it says it built and no budget was exceeded */
const built = (out) => { const ok = /website built:/.test(out) && !/BUDGET EXCEEDED/.test(out); return { tests: 1, pass: ok ? 1 : 0, fail: ok ? 0 : 1 }; };

function suite(name, kind, cmd, args, parse, opts = {}) {
  seq += 1; if (mergeArg || (PART && (seq - PART.n) % PART.of !== 0)) return;
  if (ONLY && !name.includes(ONLY)) return;
  if (FILES.length && !args.some((a) => FILES.includes(a))) return;
  if (opts.skip) { suites.push({ suite: name, kind, result: 'NOT_RUN', why: opts.skip }); console.log(`NOT_RUN  ${name} — ${opts.skip}`); return; }
  let t0 = Date.now();
  const once = () => spawnSync(cmd, args, { cwd: opts.cwd || root, encoding: 'utf8', maxBuffer: 256 << 20, timeout: opts.timeout || 600000, env: { ...process.env, LOG_LEVEL: 'error' } });
  let r = once(); let out = `${r.stdout}\n${r.stderr}`; let c = parse(out); let stalled = stallsBetween(t0, Date.now()); let first = null;
  // one more run, only for a failure during which the machine itself stalled; the first attempt stays in the record
  if (rerunAfterStall(r.status !== 3 && !(r.status === 0 && c.fail === 0 && c.tests > 0), stalled)) {
    first = { result: 'FAIL', ...c, seconds: Math.round((Date.now() - t0) / 100) / 10, machineStalled: stalled, failed: out.split('\n').filter((l) => /not ok|FAIL|Error|assert/i.test(l)).slice(0, 6) };
    console.log(`FAIL     ${name}  ${c.pass}/${c.tests}  while the machine stalled ${stalled.count} time(s), longest ${(stalled.longestMs / 1000).toFixed(1)} s: run once more`);
    t0 = Date.now(); r = once(); out = `${r.stdout}\n${r.stderr}`; c = parse(out); stalled = stallsBetween(t0, Date.now()); }
  // a suite that says it could not run (exit 3 and a line starting NOT RUN) is NOT_RUN with its own reason: never PASS, and not a FAIL that hides why
  const nr = r.status === 3 ? /^NOT RUN [^\n]*?— ([^\n]+)/m.exec(out) : null;
  if (nr) { suites.push({ suite: name, kind, result: 'NOT_RUN', why: nr[1] }); console.log(`NOT_RUN  ${name} — ${nr[1]}`); return; }
  const result = r.status === 0 && c.fail === 0 && c.tests > 0 ? 'PASS' : 'FAIL';
  suites.push({ suite: name, kind, result, ...c, seconds: Math.round((Date.now() - t0) / 100) / 10, command: [path.relative(root, cmd) || cmd, ...args.map((a) => a.replace(root + '/', ''))].join(' '), ...(stalled ? { machineStalled: stalled } : {}), ...(first ? { firstAttempt: first } : {}) });
  console.log(`${result.padEnd(7)}  ${name}  ${c.pass}/${c.tests}  (${((Date.now() - t0) / 1000).toFixed(1)} s)${first ? '  [second run; the first failed while the machine stalled]' : stalled ? `  [machine stalled ${stalled.count}×, longest ${(stalled.longestMs / 1000).toFixed(1)} s]` : ''}`);
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
for (const f of ['tests/security/proof-registry.test.mjs', 'tests/security/room-thread.test.mjs', 'tests/security/demo-sandbox.test.mjs', 'tests/security/field-record.test.mjs', 'tests/security/site-scope.test.mjs', 'tests/security/authority-matrix.test.mjs', 'tests/security/governance.test.mjs', 'tests/security/administration.test.mjs', 'tests/security/search-party.test.mjs', 'tests/security/oidc.test.mjs', 'tests/security/project-lifecycle.test.mjs', 'tests/security/service-lifecycle.test.mjs', 'tests/security/apex.test.mjs', 'tests/security/field-intelligence.test.mjs', 'tests/security/learn.test.mjs', 'tests/security/mission-control.test.mjs', 'tests/security/competency.test.mjs', 'tests/security/ledger.test.mjs', 'tests/security/measurement-import.test.mjs', 'tests/security/hardening.test.mjs', 'tests/security/training-isolation.test.mjs', 'tests/security/asset-retirement.test.mjs', 'tests/security/device-register.test.mjs', 'tests/security/deficiency-workflow.test.mjs', 'tests/security/privileges.test.mjs', 'tests/security/placement.test.mjs', 'tests/security/criteria.test.mjs', 'tests/security/shutdown.test.mjs', 'tests/security/incidents.test.mjs', 'tests/security/second-technician.test.mjs', 'tests/security/flagship-model.test.mjs', 'tests/security/second-room.test.mjs', 'tests/security/measured-exception.test.mjs', 'tests/security/intelligibility-standard.test.mjs', 'tests/security/documentation.test.mjs', 'tests/security/directory.test.mjs', 'tests/security/vocabulary.test.mjs', 'tests/security/platform-jumps.test.mjs', 'tests/security/data-report.test.mjs', 'tests/security/powerbi-export.test.mjs']) suite(`security: ${path.basename(f)}`, 'security', node, ['--test', f], tap, db ? {} : { skip: 'no local database (node scripts/db.mjs up)' });
suite('e2e: website lead form over the API', 'e2e', node, ['tests/e2e/website-lead.e2e.mjs'], custom, has('--browser') ? (db ? {} : { skip: 'no local database' }) : { skip: 'pass --browser' });
suite('browser: enterprise web E2E', 'e2e', node, ['tests/browser/enterprise-web.test.mjs'], custom, has('--browser') ? {} : { skip: 'pass --browser' });
suite('browser: design tokens (themes, theme-init, Inter)', 'browser', node, ['tests/browser/tokens.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'packages/design-tokens/dist/tokens.css')) ? {} : { skip: 'tokens not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
suite('browser: brand and type on the three surfaces (D39, D7)', 'browser', node, ['tests/browser/brand.test.mjs'], custom, has('--browser') ? (['website', 'demo', 'enterprise-web'].every((a) => fs.existsSync(path.join(root, `apps/${a}/dist/index.html`))) ? {} : { skip: 'surfaces not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
suite('browser: public website', 'browser', node, ['tests/browser/website.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/website/dist/sitemap.xml')) ? {} : { skip: 'website not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
suite('browser: investor demo shell', 'browser', node, ['tests/browser/demo.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? {} : { skip: 'demo not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
// the investor demonstration's operational workspaces (rebuild/demo-ops): unit logic, then one browser suite per workspace
suite('unit: demo operational workspaces', 'unit', node, ['--test', 'tests/unit/demo-ops.test.mjs'], tap);
suite('unit: ServiceHands import — the CSV parser, hostile rows, the commit rule, round-trip of the queue exports', 'unit', node, ['--test', 'tests/unit/service-import.test.mjs'], tap);
suite('unit: reverberation instrument — known-answer decays, refusals on short range, octave filters, WAV/CSV readers', 'unit', node, ['--test', 'tests/unit/bench-reverb.test.mjs'], tap);
suite('unit: Learn cases — separation of duties held in the store, with the DENIED ledger event', 'unit', node, ['--test', 'tests/unit/learn-separation.test.mjs'], tap);
suite('unit: people and experience — who did each job, experience by complexity and kind, totals by layer and quarter', 'unit', node, ['--test', 'tests/unit/people-involvement.test.mjs'], tap);
suite('unit: engineer faults — an injected fault refuses with its reason and leaves nothing half-done; the inspection sheets name files that exist', 'unit', node, ['--test', 'tests/unit/engineer-faults.test.mjs'], tap);
suite('unit: SIGNAL title page — extracted from the reference build, inert, resolves in the canon sprite sheet, agrees with the canon', 'unit', node, ['--test', 'tests/unit/signal-titlepage.test.mjs'], tap);
suite('unit: one room end to end — handoff to service, the job does not close the deficiency, the verified retest does, APEX hypotheses, the ids that tie the stages', 'unit', node, ['--test', 'tests/unit/thread-slice.test.mjs'], tap);
suite('unit: certification study spaces — outlines add up, every question well formed, drills rebuilt from their ids, exams in the outline’s proportions, scoring and progress', 'unit', node, ['--test', 'tests/unit/certs.test.mjs'], tap);
suite('unit: SIGNAL field calculator — the reference’s evaluator, error words and fourteen helpers; never eval', 'unit', node, ['--test', 'tests/unit/field-calc.test.mjs'], tap);
suite('unit: Field Tools — every calculator checked against a value worked by hand from its formula; search and the plain-text report', 'unit', node, ['--test', 'tests/unit/field-tools.test.mjs'], tap);
suite('unit: phase 1 field record — mounting, hookups against the design, field moves decided independently, notes', 'unit', node, ['--test', 'tests/unit/field-record.test.mjs'], tap);
suite('unit: the demo connected to the API — the sandbox key is stored and the session token is not, refusals are returned in the server’s words, a lost sandbox is forgotten, the nineteen-step journey reads its state from the server', 'unit', node, ['--test', 'tests/unit/connected-client.test.mjs'], tap);
suite('unit: lifecycle refresh planning — refresh year per unit, annual plan and multi-year strategy agree, cost only when declared', 'unit', node, ['--test', 'tests/unit/refresh-plan.test.mjs'], tap);
suite('unit: the universal phase engine — the verdict rule, the sign-off, commissioning unchanged on every room, a ServiceHands job phase by phase', 'unit', node, ['--test', 'tests/unit/universal-phases.test.mjs'], tap);
suite('unit: Search Party by asset ID and by person — every unit searchable, successions recorded, people and their rooms', 'unit', node, ['--test', 'tests/unit/search-asset-person.test.mjs'], tap);
suite('unit: STI workflow — readings against the project policy, flags, the intelligibility exception and its refusals', 'unit', node, ['--test', 'tests/unit/bench-sti.test.mjs'], tap);
suite('unit: ServiceHands analytics — measures on hand-built jobs, the synthetic history, the vendor scorecard', 'unit', node, ['--test', 'tests/unit/service-analytics.test.mjs'], tap);
suite('unit: training and simulation never touch the real record (SIGNAL game day, drills, Learn cases, FI simulated run)', 'unit', node, ['--test', 'tests/unit/training-isolation.test.mjs'], tap);
suite('unit: export formats (every report in PDF, Word, Excel, PowerPoint, JSON and CSV, reopened by independent readers)', 'unit', node, ['scripts/verify/export-formats.mjs', `--out=${path.join(out, 'exports')}`], custom);
for (const [n, f] of [['dispatch', 'demo-dispatch'], ['ServiceHands', 'demo-servicehands'], ['Core Replay', 'demo-replay'], ['FI scan replay', 'demo-fi-scan'], ['decisions', 'demo-decisions'], ['destructive-action safeguards', 'demo-destructive'], ['enquiry links', 'demo-enquiry'], ['Learn labs', 'learn-labs'], ['hardening', 'demo-hardening']])
  suite(`browser: investor demo ${n}`, 'browser', node, [`tests/browser/${f}.test.mjs`], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? {} : { skip: 'demo not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
// 25 Nov 2026: the dead-ends crawl (90-2) was written on 20 Nov and never registered, so no regression ran it; an independent review of
// the preflight found it. It presses every control on every fixed page, so it is given half an hour.
suite('browser: demo-deadends (every control on every fixed page does something)', 'browser', node, ['tests/browser/demo-deadends.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? { timeout: 1800000 } : { skip: 'demo not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
// uplift/parity-areas: the fifteen V2.5.3 areas the rebuild lacked, the Control Tower, and the repo-wide no-placeholder check
suite('browser: demo-parity-areas', 'browser', node, ['tests/browser/demo-parity-areas.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? { timeout: 1200000 } : { skip: 'demo not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
for (const s of ['demo-access', 'demo-viewas', 'demo-phoneshell', 'demo-scouter', 'demo-rolemotion', 'demo-searchparty-bar', 'demo-boundaries', 'demo-training-isolation', 'demo-fieldtools', 'demo-certs', 'demo-quizlib', 'demo-fieldcalc', 'demo-story-keys', 'demo-chal-drawings', 'demo-campus-life', 'demo-stadium-live', 'demo-performance-check', 'demo-expo-live', 'demo-return-trail', 'demo-map', 'demo-gestures', 'demo-search-journey', 'demo-voice', 'demo-modules', 'demo-journeys', 'demo-links', 'demo-route-sweep', 'demo-signal-film', 'demo-launch']) suite(`browser: ${s}`, 'browser', node, [`tests/browser/${s}.test.mjs`], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? {} : { skip: 'demo not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
// rebuild/demo-spaces: campus, rooms, tours, search bar, Search Party scenarios (unit + browser, light and dark in one run)
suite('unit: demo spaces (campus records, search, scenarios, tours)', 'unit', node, ['--test', 'tests/unit/demo-spaces.test.mjs'], tap);
suite('unit: demo Lite (45 rooms, lenses, coverage overlays, four states, wayfinding, QR)', 'unit', node, ['--test', 'tests/unit/demo-lite.test.mjs'], tap);
suite('unit: demo worlds (four worlds, 52 role configurations, no-loss, no grant)', 'unit', node, ['--test', 'tests/unit/demo-worlds.test.mjs'], tap);
suite('unit: demo estates (one model, University 38 classrooms / 4 dormitories / 3 campuses, Stadium, Convention)', 'unit', node, ['--test', 'tests/unit/demo-estates.test.mjs'], tap);
suite('unit: Space Optimizer engine (nine dimensions, options A/B/C, stated rules, every world)', 'unit', node, ['--test', 'tests/unit/demo-optimizer.test.mjs'], tap);
suite('unit: SIGNAL canon (hash manifest, 133 chapters / 1,610 panels / 387 decisions, engine rules, every chapter readable)', 'unit', node, ['--test', 'tests/unit/signal-canon.test.mjs'], tap);
suite('unit: SIGNAL content bundle (lessons, quizzes, drills, labs, incidents, gates; held by hash)', 'unit', node, ['--test', 'tests/unit/signal-library.test.mjs'], tap);
suite('unit: SIGNAL interactive film (every chapter a valid film; Season 1 footage and takes placed; Ten Seats acoustics match the canon)', 'unit', node, ['--test', 'tests/unit/signal-film.test.mjs'], tap);
suite('unit: typed launch intents (#232: every website→demonstration link opens a registered page for its perspective; no open redirect)', 'unit', node, ['--test', 'tests/unit/launch-intents.test.mjs'], tap);
suite('unit: PRISM, SENTINEL, ACCORD, FORGE, OMNIPRESENCE (each on the estate’s own records and the existing engines; unknown never reported as good; what crosses to another organisation, what FORGE refuses, what a tag may carry, who may act)', 'unit', node, ['--test', 'tests/unit/modules.test.mjs'], tap);
suite('unit: Empathia VOICE (Enterprise 3.0 directive 1A, J6B: the CallPath fixture stands on the estate; unknown is never healthy; the quality method refuses rather than guesses; privacy; who may open what)', 'unit', node, ['--test', 'tests/unit/voice.test.mjs'], tap);
suite('unit: failure-map measures (count, per room, per device, per room-month, severity-weighted, repeat vs unique; 18 Nov 15:38)', 'unit', node, ['--test', 'tests/unit/heat-metrics.test.mjs'], tap);
suite('unit: SIGNAL story engine (decisions recorded as the reference does, clock, echoes, gates, quiz records)', 'unit', node, ['--test', 'tests/unit/signal-story.test.mjs'], tap);
suite('unit: SIGNAL drills (six kinds on the reference rules, all 146 drills)', 'unit', node, ['--test', 'tests/unit/signal-drills.test.mjs'], tap);
suite('unit: SIGNAL live incidents (the reference rules; all 121 solver paths end proven inside the clock)', 'unit', node, ['--test', 'tests/unit/signal-incidents.test.mjs'], tap);
suite('unit: SIGNAL Fix-It Labs (shell rules; signal flow, network, power, fill, EQ, camera, DMX, RF: every lab fails at start, its fix passes)', 'unit', node, ['--test', 'tests/unit/signal-labs.test.mjs'], tap);
suite('unit: SIGNAL Physics in Motion (24 models; all 36 physics labs fail at start and pass with their setting)', 'unit', node, ['--test', 'tests/unit/signal-physics.test.mjs'], tap);
suite('unit: SIGNAL ratings, season reviews and the loadout (six ratings from first attempts, Story Score, game over and retry)', 'unit', node, ['--test', 'tests/unit/signal-ratings.test.mjs'], tap);
suite('unit: SIGNAL meltdowns (the cascade engine; the five expert runs end proven with grade S, boundaries and idling fail)', 'unit', node, ['--test', 'tests/unit/signal-meltdown.test.mjs'], tap);
suite('unit: SIGNAL challenges (thirteen models in five modes; every start fails and every recipe passes as the reference QA logged)', 'unit', node, ['--test', 'tests/unit/signal-challenges.test.mjs'], tap);
suite('unit: SIGNAL boss levels (all twelve clear on the intended run; every wrong tap, call, question, scope, design or estimate ends it)', 'unit', node, ['--test', 'tests/unit/signal-boss.test.mjs'], tap);
suite('unit: SIGNAL Mission Control (points, the ladder, domain levels, crew trust, the systems map)', 'unit', node, ['--test', 'tests/unit/signal-mission.test.mjs'], tap);
suite('unit: SIGNAL result pop-ups (each gate cleared, the chapter complete, the quest objective and rating)', 'unit', node, ['--test', 'tests/unit/signal-pops.test.mjs'], tap);
suite('unit: SIGNAL mentor channel, built-in answers (the twenty prepared answers and seven suggestions)', 'unit', node, ['--test', 'tests/unit/signal-mentor.test.mjs'], tap);
suite('unit: Lite studio model (geometry with provenance, recipe, prediction, corrections, variants)', 'unit', node, ['--test', 'tests/unit/lite-studio.test.mjs'], tap);
suite('unit: Design a Space concept (fixes, rehearsal, identity across versions, import guard)', 'unit', node, ['--test', 'tests/unit/studio-concept.test.mjs'], tap);
suite('unit: Scouter standard kits (propose, review by another role, publish, stale, adopt)', 'unit', node, ['--test', 'tests/unit/scouter-profiles.test.mjs'], tap);
suite('unit: Build a Room edits (move, duplicate, swap within a group, retire a connection, compare revisions)', 'unit', node, ['--test', 'tests/unit/build-room-edits.test.mjs'], tap);
suite('unit: Build a Room commissioning workbook (a valid zip, seven sheets, formulas with cached counts, formula text kept as text)', 'unit', node, ['--test', 'tests/unit/build-workbook.test.mjs'], tap);
suite('unit: the five axes of the Experience Language (condition, provenance, confidence, workflow, maturity)', 'unit', node, ['--test', 'tests/unit/ui-axes.test.mjs'], tap);
suite('unit: Drawing Intelligence display viewing analysis (ST-VID-02 arithmetic, candidate sizes, provenance of every input)', 'unit', node, ['--test', 'tests/unit/drawing-viewing.test.mjs'], tap);
suite('unit: SIGNAL glossary terms in the story (first use per chapter, the reference’s expressions)', 'unit', node, ['--test', 'tests/unit/signal-glossary.test.mjs'], tap);
suite('unit: Engineering Manual (chapters, rules, workflow, exceptions)', 'unit', node, ['--test', 'tests/unit/demo-manual.test.mjs'], tap);
suite('unit: generated documents are current (estate manifests, product census, workflow matrix)', 'unit', node, ['--test', 'tests/unit/docs-generated.test.mjs'], tap);
suite('unit: search that reads the sentence (corrections, conditions, counted answers, drop one condition; every count recomputed from the records)', 'unit', node, ['--test', 'tests/unit/demo-understand.test.mjs'], tap);
suite('unit: request portal (the proposal is the design engine\'s output; sending, refusals, following; who may ask)', 'unit', node, ['--test', 'tests/unit/demo-intake.test.mjs'], tap);
suite('unit: in this room (equipment, history, what a symptom points at, safe guidance, outcomes written to ServiceHands and the room; who may)', 'unit', node, ['--test', 'tests/unit/demo-here.test.mjs'], tap);
suite('unit: room control (panel generated from each room record; no impossible state in 18,000 random presses; commands, simulated adapter, authority, ledger)', 'unit', node, ['--test', 'tests/unit/demo-control.test.mjs'], tap);
suite('unit: Site Champion (the permission model over every legacy table and registered surface; four governed actions, site scope, sixteen-role matrix, ledger)', 'unit', node, ['--test', 'tests/unit/demo-champion.test.mjs'], tap);
suite('unit: connect (people directory and site champions from the estate; verified app-jump formats and encoding; schedule-aware proposals across time zones in thousands of random cases; confirm re-checks and is idempotent; one adapter contract over the simulated calendar and the mock-tested Graph adapter; who may)', 'unit', node, ['--test', 'tests/unit/demo-connect.test.mjs'], tap);
suite('unit: room guides ("How do I use this room?" generated for all 90 rooms: no sentence names equipment a room lacks; sections follow the panel; nothing unsafe)', 'unit', node, ['--test', 'tests/unit/demo-guides.test.mjs'], tap);
suite('unit: Phase 5 documentation in the demonstration (profiles for all 90 rooms; the tracked room agrees with its dossier; sixteen-role matrix; the dossier’s gate; captures committed once)', 'unit', node, ['--test', 'tests/unit/demo-docs5.test.mjs'], tap);
suite('unit: Site Champion’s first weeks (lessons never say to open, unplug or climb; the check is marked in the store and needs the safety answer; the list is read from the record; champion only)', 'unit', node, ['--test', 'tests/unit/demo-champion-start.test.mjs'], tap);
suite('unit: Microsoft Graph document source, MOCK-TESTED (same index as the simulated library after every change; folder rename and revocation found without the feed; no link off Graph followed; token never sent to a download; nothing outside the selection asked for)', 'unit', node, ['--test', 'tests/unit/demo-knowledge-graph.test.mjs'], tap);
suite('unit: IT Onboarding Success Guide (covers the founder’s list; holds no tenant detail; personalised only from records; each item done by whoever it names; checks marked in the store; milestones derived; progress shown only to the starter, manager and, in part, mentor; revisions kept)', 'unit', node, ['--test', 'tests/unit/demo-onboard.test.mjs'], tap);
suite('unit: Instant Room rules (guided shots and their safety wording; a photograph judged by arithmetic; coverage; measurements; differences from the record as questions; a plan only when enough was captured, with every guess listed)', 'unit', node, ['--test', 'tests/unit/demo-instant.test.mjs'], tap);
suite('unit: Drawing Intelligence, reading and reviewing (six classes of knowing; no scale claimed from too little; overlaps and contradictions raised with both sources kept; untrusted input; the commissioning engine’s own rules as the standards review; revision diff)', 'unit', node, ['--test', 'tests/unit/demo-drawing.test.mjs'], tap);
suite('unit: End User Success & Training Guide chapters (the founder’s twenty-eight contents each answered; no organisation, person or room named; nothing unsafe; no step-by-step for another company’s application; every link a registered page)', 'unit', node, ['--test', 'tests/unit/demo-guide-chapters.test.mjs'], tap);
suite('unit: Harmony tool registry (asking does not grant; answers carry sources; steps are prepared, never taken; no link a role cannot open; sixteen roles)', 'unit', node, ['--test', 'tests/unit/demo-harmony.test.mjs'], tap);
suite('unit: knowledge contract (five trust zones; no cross-tenant read in 20,000 random cases; promotion and sharing need a named person and consent; source hierarchy; freshness)', 'unit', node, ['--test', 'tests/unit/demo-knowledge-contract.test.mjs'], tap);
suite('unit: knowledge ledger and governed ingestion (every object well-formed and its worked examples recomputed; isolation over all objects, both customers and every role; sync engine equals a fresh import over random sequences; untrusted documents; promotion and sharing refusals)', 'unit', node, ['--test', 'tests/unit/demo-knowledge.test.mjs'], tap);
suite('unit: video QA (narration words, sync, captions, picture; the Film 13 scene record is what its measurements say)', 'unit', node, ['--test', 'tests/unit/media-qc.test.mjs'], tap);
suite('unit: role start pages and keyboard shortcuts (16 roles against the real policy and records; every link opens for its role)', 'unit', node, ['--test', 'tests/unit/demo-rolehome.test.mjs'], tap);
suite('unit: offline worker and its build step (atomic install, shells kept across builds, network-first with fallback, ranged answers, packs)', 'unit', node, ['--test', 'tests/unit/demo-offline.test.mjs'], tap);
suite('unit: game day state machine (phases, faults on estate records, holds, independent verification, public view)', 'unit', node, ['--test', 'tests/unit/demo-gameday.test.mjs'], tap);
suite('unit: the critical signal (chain generated from estate records; simulated, inferred and known observations; the procedure for the isolated hop, for every hop; who may; engine invariants over 16,000 random actions; ledger)', 'unit', node, ['--test', 'tests/unit/demo-critical-signal.test.mjs'], tap);
suite('unit: demo core screens (health, spine, campus aggregates)', 'unit', node, ['--test', 'tests/unit/demo-core-metrics.test.mjs'], tap);
for (const s of ['demo-welcome', 'demo-coach', 'demo-campus', 'demo-rooms', 'demo-lite', 'demo-journey', 'demo-room-jumps', 'demo-cx-as-rooms', 'demo-assurance-v253', 'demo-lesson', 'demo-cinematic', 'demo-signal-lite', 'demo-mixlab', 'demo-signal-s1', 'demo-lite-spatial', 'demo-lite-tabs', 'demo-lite-arrange', 'demo-lite-worlds', 'demo-lite-eye', 'demo-lite-rooms', 'demo-lite-views', 'demo-tours', 'demo-searchbar', 'demo-search-scenarios', 'demo-core', 'demo-proof', 'demo-docs5', 'demo-guides', 'demo-worlds', 'demo-estate', 'demo-optimizer', 'demo-story', 'demo-gameday', 'demo-play', 'demo-offline', 'demo-rolehome', 'demo-request', 'demo-here', 'demo-control', 'demo-critical-signal', 'demo-champion', 'demo-connect', 'demo-knowledge', 'demo-harmony', 'demo-champion-start', 'demo-onboard', 'demo-instant', 'demo-drawing', 'demo-manual', 'demo-learn', 'demo-boss', 'demo-bench', 'demo-story-more', 'demo-exports', 'demo-drill', 'demo-search-parity', 'demo-workflows', 'demo-registers', 'demo-service-analytics', 'demo-room-qr', 'demo-request-45s', 'demo-service-import', 'demo-mission-work', 'demo-reverb', 'demo-asset-life', 'demo-deficiencies', 'demo-people', 'demo-service-phases', 'demo-sti', 'demo-plan-why', 'demo-scenarios', 'demo-waiting', 'demo-cx-analytics', 'demo-field-ux', 'demo-lite-device-checks', 'demo-refresh', 'demo-field-redline', 'demo-vertical-slice', 'demo-engineer-start', 'demo-connected', 'demo-flagship']) suite(`browser: ${s}`, 'browser', node, [`tests/browser/${s}.test.mjs`], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? { timeout: 1200000 } : { skip: 'demo not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
const studio = fs.existsSync(path.join(root, 'apps/founder-studio/dist/index.html'));
// the studio's private files (17 Nov 2026): these checks need none of them; the studio suites below report NOT_RUN, with the reason, in a checkout that has not been provisioned
suite('unit: the migration ledger is checked (the pages it calls server are the ones listed; a server page imports the server client and the interface kit and reaches no browser-held record; the client stores the sandbox’s id and key only)', 'unit', node, ['--test', 'tests/unit/migration-ledger.test.mjs'], tap);
suite('unit: private assets for the Founder Studio (the manifest holds names and hashes only; nothing private is tracked; a missing or altered store is refused; an unprovisioned studio suite is NOT RUN, never passed)', 'unit', node, ['--test', 'tests/unit/private-assets.test.mjs'], tap);
suite('unit: the release gate (a FAIL or an unnamed skip is refused; the Founder Studio suites may be NOT RUN only where the runner declares it has no private store, never where the studio is built, never for a media release; the workflow asks for no secret and builds nothing private)', 'unit', node, ['--test', 'tests/unit/release-gate.test.mjs'], tap);
suite('unit: the durable copy of the private assets (requests signed as the published example; push only to a bucket that keeps versions and gives nothing without a credential; pull keeps only files the manifest names; encrypted backups open only with the recipient’s key and restore all or nothing; no secret printed)', 'unit', node, ['--test', 'tests/unit/private-bucket.test.mjs'], tap);
suite('browser: Founder Studio', 'browser', node, ['tests/browser/founder-studio.test.mjs'], custom, has('--studio') ? (studio ? {} : { skip: 'studio not built (node scripts/private/founder-studio-assets.mjs provision, or node scripts/build.mjs --studio)' }) : { skip: 'pass --studio' });
suite('e2e: founder town hall (Founder Edition)', 'e2e', node, ['tests/e2e/founder-townhall.e2e.mjs'], custom, has('--studio') ? (studio ? {} : { skip: 'studio not built' }) : { skip: 'pass --studio' });
suite('e2e: founder decisions (hosted studio over the API)', 'e2e', node, ['tests/e2e/founder-decisions.e2e.mjs'], custom, has('--studio') ? (studio && db ? {} : { skip: 'studio not built or no local database' }) : { skip: 'pass --studio' });
suite('media: full decode of every curated film', 'media', node, ['tests/media/decode-films.mjs'], custom, has('--films') ? { timeout: 7200000 } : { skip: 'pass --films (slow: decodes ~47 minutes of video)' });

const counted = (out) => { const m = /PASS (\d+) · FAIL (\d+)/.exec(out); return m ? { tests: Number(m[1]) + Number(m[2]), pass: Number(m[1]), fail: Number(m[2]) } : { tests: NaN, pass: NaN, fail: NaN }; };
const pyyaml = spawnSync('python3', ['-I', '-c', 'import yaml'], { encoding: 'utf8' }).status === 0;
suite('deploy: Render Blueprints (static validation)', 'deploy', 'python3', ['-I', 'scripts/staging/validate-blueprints.py'], counted, pyyaml ? {} : { skip: 'PyYAML not installed (pip install pyyaml)' });
suite('deploy: the demonstration staging rehearsed from its Blueprint — the start command on an empty database, the deployment check (permissions, unauthorized access, isolation, persistence, cross-origin, reset), a restart, the V-1 gate', 'deploy', node, ['deploy/render/rehearse-demo.mjs', '--assemble'], counted, fs.existsSync(path.join(root, 'services/enterprise-api/dist/src/main.js')) ? {} : { skip: 'the API is not built (node scripts/build.mjs)' });
suite('deploy: public sites audit (functional, a11y, responsive; no P0/P1)', 'deploy', node, ['scripts/audit/site-audit.mjs', '--strict', `--out=${path.join(out, 'SITE_AUDIT.json')}`], counted, has('--browser') ? (fs.existsSync(path.join(root, 'apps/website/dist/index.html')) && fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? { timeout: 1800000 } : { skip: 'public sites not built' }) : { skip: 'pass --browser' });
suite('deploy: public static sites under the declared headers', 'deploy', node, ['scripts/staging/verify-static.mjs'], counted, has('--browser') ? (fs.existsSync(path.join(root, 'apps/website/dist/index.html')) && fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? {} : { skip: 'public sites not built (node scripts/build.mjs --public)' }) : { skip: 'pass --browser' });
// security assessment 2026-11-04 (docs/security/ASSESSMENT_2026-11-04.md): Blueprint, build chain, local servers and dist (no database), then the browser checks under no headers
suite('security: public sites (headers, build chain, servers, dist)', 'security', node, ['--test', 'tests/security/public-sites.test.mjs'], tap);
suite('browser: public sites security (CSP in the page, no request leaves, injection, tampering, View-as)', 'browser', node, ['tests/browser/public-security.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/website/dist/index.html')) && fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? {} : { skip: 'public sites not built (node scripts/build.mjs --public)' }) : { skip: 'pass --browser' });
// founder 24 Nov 05:32: a working run cannot change the evidence of record; failed runs are kept; the temp directory is cleaned
suite('unit: drawing detail follows the frame rate (lowered step by step when a scene is slow, restored when fewer pixels buy no speed, never below half, off with detail=full)', 'unit', node, ['--test', 'tests/unit/render-detail.test.mjs'], tap);
suite('unit: what a frame costs, counted (a window is one face; the view test and the face test never leave out what could be seen; the renderer counts its triangles and draw calls)', 'unit', node, ['--test', 'tests/unit/render-cost.test.mjs'], tap);
suite('unit: the limits a simplified drawing must meet (set from the quality requirements before it was measured; a dimmer, thinner, recoloured or smeared crowd is refused; a person a pixel aside is accepted; identical parts of a picture cannot dilute a difference)', 'unit', node, ['--test', 'tests/unit/picture-diff.test.mjs'], tap);
suite('unit: the performance check a visitor runs on their own device (the pace of a run of frames; a target is held by the pace and the slow frames together; the synthetic environment; the report carries the result and what a result is; the page sends nothing)', 'unit', node, ['--test', 'tests/unit/perf-check.test.mjs'], tap);
suite('unit: frame rates are kept with the evidence (each reading with the detail it was drawn at and labelled as the test machine’s; a figure that is not a number is refused; a file from another commit is not this run’s; the ledger line and the results table carry them)', 'unit', node, ['--test', 'tests/unit/frame-rates.test.mjs'], tap);
suite('unit: the preflight (steps 2 and 3 of the engineering sequence: chooses the browser suites a change reaches from the code; its cross-product list exists; writes nothing of record)', 'unit', node, ['--test', 'tests/unit/preflight.test.mjs'], tap);
suite('unit: evidence of record (a working run or a suite run by hand leaves tests/evidence and the ledger untouched; a run of record cannot be narrowed; temp cleanup removes only test directories; machine stalls are measured and only a failure during one is run a second time)', 'unit', node, ['--test', 'tests/unit/evidence-isolation.test.mjs'], tap);
suite('unit: the public exposure audit catches each planted finding (secrets, maps, contact data, machine paths, embedded data, private markers)', 'unit', node, ['--test', 'tests/unit/public-exposure.test.mjs'], tap);
suite('unit: link previews: both share cards are 1200 × 630, and the tags name the image only with a public address', 'unit', node, ['--test', 'tests/unit/share-meta.test.mjs'], tap);
// founder 19 Nov 06:08: the public builds checked for secrets, source maps, embedded data and anything that is not a public file
suite('security: public builds expose nothing private (secrets, source maps, contact data, build-machine paths, embedded data, private markers)', 'security', node, ['scripts/audit/public-exposure.mjs'], counted, fs.existsSync(path.join(root, 'apps/website/dist/index.html')) && fs.existsSync(path.join(root, 'apps/demo/dist/index.html')) ? {} : { skip: 'public sites not built (node scripts/build.mjs --public)' });
// v18/pilot (handoff v1.8 §4): the price list and pilot readiness on the website; the pilot activation API; the demo's sandbox pilot
suite('browser: website pricing and pilot readiness', 'browser', node, ['tests/browser/website-pilot.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/website/dist/pilot.js')) ? {} : { skip: 'website not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
suite('browser: website FieldLink (optional hardware, a concept: optional, labelled, no cost internals)', 'browser', node, ['tests/browser/website-fieldlink.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/website/dist/fieldlink/index.html')) ? {} : { skip: 'website not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
suite('build: the website within its budgets with the staging URLs (19 Nov 2026: the Render build failed at 49,186 B while the local build passed)', 'build', node, ['apps/website/build.mjs', `--out=${path.join(os.tmpdir(), 'empathia-website-staging-budget')}`, '--base=https://empathia-website-next.onrender.com', '--demo=https://empathia-demo-next.onrender.com', '--api=https://empathia-demo-api-l04n.onrender.com'], built, {});
suite('browser: website Build Your Empathia (price book 3: every figure from estimate(), shareable, enquiry and demonstration one click away)', 'browser', node, ['tests/browser/website-pricing.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/website/dist/build.js')) ? {} : { skip: 'website not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
suite('browser: website Follow one device and product launches (#232, 17:25 §6)', 'browser', node, ['tests/browser/website-follow.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/website/dist/platform/index.html')) ? {} : { skip: 'website not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
suite('browser: website home opening (17:25 §4: the founder headline, the room-to-estate sequence from the demonstration, two actions)', 'browser', node, ['tests/browser/website-opening.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/website/dist/index.html')) ? {} : { skip: 'website not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });
suite('browser: website first screen (90-1)', 'browser', node, ['tests/browser/website-fold.test.mjs'], custom, has('--browser') ? (fs.existsSync(path.join(root, 'apps/website/dist/pilot.js')) ? {} : { skip: 'website not built (node scripts/build.mjs)' }) : { skip: 'pass --browser' });

const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
// the enterprise web E2E re-takes its screenshots into media/screenshots by design; those, like tests/evidence, are not the tree under test
const dirty = spawnSync('git', ['status', '--porcelain', '--untracked-files=no', '--', '.', ':!tests/evidence', ':!media/screenshots', ':!tests/REGRESSION_LEDGER.jsonl', ':!tests/evidence-failed'], { cwd: root, encoding: 'utf8' }).stdout.trim() !== '';
if (PART) { fs.writeFileSync(path.join(out, `TEST_RESULTS.part-${PART.n}-of-${PART.of}.json`), JSON.stringify({ at: new Date().toISOString(), commit: head, dirty, part: PART, suites }, null, 2)); console.log(`\npart ${PART.n} of ${PART.of} on ${head.slice(0, 7)}${dirty ? ' (working tree changed)' : ''}: PASS ${suites.filter((x) => x.result === 'PASS').length} · FAIL ${suites.filter((x) => x.result === 'FAIL').length} · NOT_RUN ${suites.filter((x) => x.result === 'NOT_RUN').length}`); process.exit(suites.some((x) => x.result === 'FAIL') ? 1 : 0); }
if (mergeArg) { const M = Number(mergeArg[1]); const parts = Array.from({ length: M }, (_, i) => { const f = path.join(out, `TEST_RESULTS.part-${i + 1}-of-${M}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; });
  const bad = parts.map((x, i) => (!x ? `part ${i + 1} missing` : x.commit !== head ? `part ${i + 1} ran ${x.commit.slice(0, 7)}, not ${head.slice(0, 7)}` : x.dirty ? `part ${i + 1} ran on a changed working tree` : '')).filter(Boolean);
  if (bad.length) { console.error(`cannot merge: ${bad.join('; ')}`); process.exit(2); }
  suites.push(...parts.flatMap((x) => x.suites)); }
const sum = { at: new Date().toISOString(), node: process.version, commit: head, pass: suites.filter((s) => s.result === 'PASS').length, fail: suites.filter((s) => s.result === 'FAIL').length, notRun: suites.filter((s) => s.result === 'NOT_RUN').length, suites };
fs.writeFileSync(path.join(out, 'TEST_RESULTS.json'), JSON.stringify(sum, null, 2));
fs.writeFileSync(path.join(out, 'TEST_RESULTS.md'), ['# Test results', '', `Run ${sum.at} on Node ${sum.node}. PASS ${sum.pass} · FAIL ${sum.fail} · NOT_RUN ${sum.notRun} suites.${suites.some((s) => s.firstAttempt) ? ` ${suites.filter((s) => s.firstAttempt).length} suite(s) were run a second time because the machine stalled during a failed first attempt; both attempts are in the notes.` : ''}`, '', '| Suite | Kind | Result | Passed / tests | Seconds | Notes (why not run; machine stalls; a second run) |', '|---|---|---|---|---|---|',
  ...suites.map((s) => `| ${s.suite} | ${s.kind} | ${s.result} | ${s.result === 'NOT_RUN' ? '—' : `${s.pass}/${s.tests}`} | ${s.seconds ?? '—'} | ${[s.why, s.firstAttempt ? `SECOND RUN. The first attempt FAILED ${s.firstAttempt.pass}/${s.firstAttempt.tests} while the machine stalled ${s.firstAttempt.machineStalled.count} time(s), longest ${(s.firstAttempt.machineStalled.longestMs / 1000).toFixed(1)} s` : '', s.machineStalled ? `machine stalled ${s.machineStalled.count} time(s) during this run, longest ${(s.machineStalled.longestMs / 1000).toFixed(1)} s` : ''].filter(Boolean).join('; ')} |`),
  // the frame rates the 3D scene suites measured on this commit, when this run measured any (tests/lib/frame-rates.mjs): the machine's, never a device's
  ...frameRateLines(path.join(out, 'performance'), head)].join('\n') + '\n');
// ---- the ledger: one line for every finished run of record, pass or fail, so a later pass does not erase an earlier failure; and a
// failed run's results kept under its commit (tests/evidence itself is overwritten by the next run)
if (RECORD && !PART) {
  const failed = suites.filter((s) => s.result === 'FAIL').map((s) => s.suite); const notRun = suites.filter((s) => s.result === 'NOT_RUN').map((s) => ({ suite: s.suite, why: s.why || '' }));
  fs.appendFileSync(path.join(root, 'tests/REGRESSION_LEDGER.jsonl'), JSON.stringify({ at: sum.at, commit: head, ci: process.env.CI === 'true', pass: sum.pass, fail: sum.fail, notRun: sum.notRun, failed, notRunSuites: notRun, secondRunAfterStall: suites.filter((s) => s.firstAttempt).map((s) => ({ suite: s.suite, firstAttempt: `${s.firstAttempt.pass}/${s.firstAttempt.tests}`, longestStallMs: s.firstAttempt.machineStalled.longestMs, second: s.result })), stalledSuites: suites.filter((s) => s.machineStalled).length, frameRates: collectFrameRates(path.join(out, 'performance'), head) }) + '\n');
  if (sum.fail) { const keep = path.join(root, 'tests/evidence-failed', `${head.slice(0, 8)}-${sum.at.replace(/[:.]/g, '-')}`); fs.mkdirSync(keep, { recursive: true }); for (const f of ['TEST_RESULTS.json', 'TEST_RESULTS.md']) fs.copyFileSync(path.join(out, f), path.join(keep, f)); console.log(`failed run kept in ${path.relative(root, keep)}`); }
}
console.log(`\nPASS ${sum.pass} · FAIL ${sum.fail} · NOT_RUN ${sum.notRun} — ${path.relative(root, path.join(out, 'TEST_RESULTS.md'))}${RECORD ? '' : '  (a working run: tests/evidence is unchanged; pass --record for a run of record)'}`);
process.exit(sum.fail ? 1 : 0);
