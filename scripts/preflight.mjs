#!/usr/bin/env node
/**
 * Preflight: the short validation that comes before the four-hour exact-commit regression.
 *
 * Founder, 25 Nov 2026 07:50 CT, after the regression on 52cdd952 spent four hours finding two failures that a few minutes of the right
 * tests would have found ("Four-hour regression cycles are too expensive to spend discovering failures that a much shorter preflight
 * could catch"). The engineering sequence is: 1 implementation · 2 preflight validation · 3 cross-product impact testing · 4 independent
 * review · 5 full exact-commit regression · 6 staging deployment (docs/engineering-handoff/TESTING_AND_EVIDENCE.md). This script is steps
 * 2 and 3. It does not replace step 5, and nothing it does is evidence of record.
 *
 *   node scripts/preflight.mjs            step 2 (the build with its type checks; every non-browser suite), then step 3 (the browser,
 *                                          end-to-end and site suites the change reaches, by the regression's own runner)
 *   node scripts/preflight.mjs --list     only say which suites step 3 would run, and why
 *   --base=<rev>   what the change is measured from (default: the commit of the last passing run in tests/REGRESSION_LEDGER.jsonl)
 *   --head=<rev>   measure a committed change instead of the working tree (with --list: "what would it choose for X")
 *   --no-build     skip the build (only when nothing has changed since the last build)
 *   --keep-going   run every chosen suite even after one fails (by default step 3 stops at the first failure)
 *
 * The choice is made by scripts/lib/impact.mjs, from the evaluated page registry and the import graph; a file it cannot place makes every
 * suite run. Step 3 runs the chosen suites through scripts/test.mjs --files, so a suite runs exactly as in the regression (its timeout,
 * its scoring, its light and dark variants, its prerequisites). Second version, 25 Nov 2026, after an independent review of the first.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { select, registered, ACROSS, rel } from './lib/impact.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
const has = (f) => process.argv.includes(f);
const git = (...a) => { const r = spawnSync('git', a, { cwd: root, encoding: 'utf8' }); if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`); return r.stdout.trim(); };
const out = path.join(root, '.local/preflight'); fs.mkdirSync(out, { recursive: true });

// the suites the regression would never run, and a cross-product list that names a suite that does not exist, are errors of the gate itself
const reg = registered(root);
if (reg.unregistered.length) { console.error(`preflight: browser suites that scripts/test.mjs never runs, so no regression runs them either: ${reg.unregistered.join(', ')}. Register them.`); process.exit(2); }
for (const n of Object.keys(ACROSS)) if (!reg.files.includes(`tests/browser/${n}.test.mjs`)) { console.error(`preflight: the cross-product suite ${n} is not a registered suite; correct ACROSS in scripts/lib/impact.mjs`); process.exit(2); }

const lastPass = () => { const lines = fs.readFileSync(path.join(root, 'tests/REGRESSION_LEDGER.jsonl'), 'utf8').trim().split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const p = lines.reverse().find((l) => l.fail === 0 && !l.ci); if (!p) throw new Error('no passing run in the ledger: pass --base'); return p.commit; };
const base = arg('base') || lastPass(); const head = arg('head');
const changed = [...new Set([...(head ? git('diff', '--name-only', base, head) : git('diff', '--name-only', base)).split('\n'), ...(head ? [] : git('ls-files', '--others', '--exclude-standard').split('\n'))].filter(Boolean))];
const r = await select({ root, changed, scratch: path.join(out, 'tmp') });

let secs = {}; try { for (const x of JSON.parse(fs.readFileSync(path.join(root, 'tests/evidence/TEST_RESULTS.json'), 'utf8')).suites || []) { const m = /((?:tests\/(?:browser|e2e)|scripts\/(?:audit|staging))\/[\w.-]+\.mjs)/.exec(x.command || ''); if (m && x.seconds) secs[m[1]] = (secs[m[1]] || 0) + x.seconds; } } catch { secs = {}; }
const est = Math.round(r.chosen.reduce((t, c) => t + (secs[c.file] || 60), 0) / 60);
console.log(`preflight: ${changed.length} files changed since ${base.slice(0, 8)}${head ? ` (to ${head.slice(0, 8)})` : ' (working tree)'}; ${r.pages.length} pages in the registry; ${r.graphSize} modules in the graph`);
if (r.unplaced.length) console.log(`not placed (so every suite is chosen): ${r.unplaced.join(', ')}`);
console.log(`step 3 would run ${r.chosen.length} of ${r.suites.length} browser, end-to-end and site suites (about ${est} min by the last run of record):`);
for (const c of r.chosen) console.log(`  ${c.name.padEnd(30)} ${c.reasons.join('; ').slice(0, 170)}`);
if (has('--list')) process.exit(0);
if (head) { console.error('--head measures a committed change for --list; a run checks the working tree'); process.exit(2); }

// a regression must run alone (TESTING_AND_EVIDENCE.md): the preflight does not start beside one
const ps = spawnSync('ps', ['-eo', 'args'], { encoding: 'utf8' }).stdout || '';
if (/scripts\/test\.mjs .*--(part|merge)=/.test(ps)) { console.error('preflight: an exact-commit regression is running; it must run alone. Wait for it.'); process.exit(2); }

const commit = git('rev-parse', 'HEAD'); const stamp = new Date().toISOString().replace(/[:.]/g, '-');
// never a run of record: not under CI, and every suite writes to scratch evidence
const env = { ...process.env, EMPATHIA_EVIDENCE_DIR: path.join(out, `evidence-${stamp}`) }; delete env.CI; delete env.EMPATHIA_EVIDENCE;
const report = [`# Preflight on ${commit.slice(0, 8)}${git('status', '--porcelain') ? ' plus uncommitted changes' : ''}, ${new Date().toISOString()}`, '', `Measured from ${base}. Not evidence of record: the exact-commit regression is.`, ''];
// what a working run may leave NOT RUN: the browser, end-to-end and site suites (step 3's), and the two the regression itself never runs here
const MAY_NOT_RUN = /— pass --browser|— pass --studio|machine-learning|ML dataset|film decode|full film/i;
const step = (label, args, timeoutMs) => { const t0 = Date.now(); const p = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 256 << 20, env, timeout: timeoutMs });
  const s = Math.round((Date.now() - t0) / 1000); const text = `${p.stdout || ''}${p.stderr || ''}`; const lines = text.trim().split('\n');
  const notRun = lines.filter((l) => /^NOT_RUN\s/.test(l)).filter((l) => !MAY_NOT_RUN.test(l));
  const ok = p.status === 0 && !notRun.length && !p.error; const summary = [...lines].reverse().find((l) => /PASS \d+ · FAIL \d+/.test(l)) || lines[lines.length - 1] || '';
  const line = `${ok ? 'PASS' : 'FAIL'}  ${label}  (${s} s)  ${p.error ? `stopped: ${p.error.message}` : summary.slice(0, 140)}`; console.log(line); report.push(`- ${line}`);
  for (const l of [...text.split('\n').filter((x) => /^FAIL\b|^not ok/.test(x)).slice(0, 8), ...notRun.map((x) => `${x} (a suite step 2 may not leave unrun)`)]) { console.log(`      ${l.slice(0, 220)}`); report.push(`    - ${l.slice(0, 220)}`); }
  return ok; };
let ok = true;
if (!has('--no-build')) ok = step('step 2: build, with the type checks', ['scripts/build.mjs'], 1800000);
if (ok) ok = step('step 2: every non-browser suite (unit, security, integration, the dependency boundaries)', ['scripts/test.mjs'], 3600000);
else console.log('the build failed: nothing else is run');
if (ok && r.chosen.length) { report.push('', `## Step 3: ${r.chosen.length} suites the change reaches`, '');
  for (const c of r.chosen) { ok = step(`step 3: ${c.name}`, ['scripts/test.mjs', '--browser', '--studio', `--files=${c.file}`], 3600000);
    if (!ok && !has('--keep-going')) { const left = r.chosen.length - r.chosen.indexOf(c) - 1; if (left) { console.log(`stopped at the first failure; ${left} suites not run (--keep-going runs them all)`); report.push(`- stopped at the first failure; ${left} not run`); } break; } } }
const file = path.join(out, `${commit.slice(0, 8)}-${stamp}.md`); fs.writeFileSync(file, report.join('\n') + '\n');
console.log(`\npreflight ${ok ? 'PASSED' : 'FAILED'} — ${rel(root, file)}${ok ? '\nnext: step 4, an independent review of the change and of its tests; then step 5, the exact-commit regression' : ''}`);
process.exit(ok ? 0 : 1);
