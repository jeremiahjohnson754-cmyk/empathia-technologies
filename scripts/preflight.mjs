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
 *   node scripts/preflight.mjs            step 2 (the build of every app, the Founder Studio included, with its type checks; every
 *                                          non-browser suite), then step 3 (the browser, end-to-end and site suites the change reaches,
 *                                          by the regression's own runner)
 *   node scripts/preflight.mjs --list     only say which suites step 3 would run, and why
 *   --base=<rev>   what the change is measured from (default: the commit of the last passing run in tests/REGRESSION_LEDGER.jsonl)
 *   --head=<rev>   with --list: measure a committed change (against today's code, not that commit's)
 *   --keep-going   run every chosen suite even after one fails (by default step 3 stops at the first failure)
 *   --from=<suite> resume step 3 at this suite (a background command here is cut off at two hours). It is refused unless the run it
 *                  continues passed every step before that suite on the same commit, the same working tree, the same base and the same
 *                  list, with the same build: the run keeps that proof in .local/preflight/state.json as it goes.
 *
 * The choice is made by scripts/lib/impact.mjs. Third version, 25 Nov 2026, after a second independent review.
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { select, gateErrors, judge, rel } from './lib/impact.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
const has = (f) => process.argv.includes(f);
const git = (...a) => { const r = spawnSync('git', a, { cwd: root, encoding: 'utf8', maxBuffer: 256 << 20 }); if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`); return r.stdout.trim(); };
const out = path.join(root, '.local/preflight'); fs.mkdirSync(out, { recursive: true });

const errs = gateErrors(root); if (errs.length) { for (const e of errs) console.error(`preflight: ${e}`); process.exit(2); }

const lastPass = () => { const lines = fs.readFileSync(path.join(root, 'tests/REGRESSION_LEDGER.jsonl'), 'utf8').trim().split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const p = lines.reverse().find((l) => l.fail === 0 && !l.ci); if (!p) throw new Error('no passing run in the ledger: pass --base'); return p.commit; };
const base = arg('base') || lastPass(); const head = arg('head');
const changed = [...new Set([...(head ? git('diff', '--name-only', base, head) : git('diff', '--name-only', base)).split('\n'), ...(head ? [] : git('ls-files', '--others', '--exclude-standard').split('\n'))].filter(Boolean))];
const diffOf = (f) => { try { return head ? git('diff', base, head, '--', f) : git('diff', base, '--', f); } catch { return ''; } };
const r = await select({ root, changed, scratch: path.join(out, 'tmp'), diffOf });

let secs = {}; try { for (const x of JSON.parse(fs.readFileSync(path.join(root, 'tests/evidence/TEST_RESULTS.json'), 'utf8')).suites || []) { const m = /((?:tests\/(?:browser|e2e)|scripts\/(?:audit|staging))\/[\w.-]+\.mjs)/.exec(x.command || ''); if (m && x.seconds) secs[m[1]] = (secs[m[1]] || 0) + x.seconds; } } catch { secs = {}; }
const unknown = r.chosen.filter((c) => !secs[c.file]).map((c) => c.name); const est = Math.round(r.chosen.reduce((t, c) => t + (secs[c.file] || 0), 0) / 60);
console.log(`preflight: ${changed.length} files changed since ${base.slice(0, 8)}${head ? ` (to ${head.slice(0, 8)})` : ' (working tree)'}; ${r.pages.length} pages in the registry; ${r.graphSize} modules in the graph`);
if (r.unplaced.length) console.log(`not placed (so every suite is chosen): ${r.unplaced.join(', ')}`);
console.log(`step 3 would run ${r.chosen.length} of ${r.suites.length} browser, end-to-end and site suites (about ${est} min by the last run of record${unknown.length ? `, plus ${unknown.length} with no time on record: ${unknown.join(', ')}` : ''}):`);
for (const c of r.chosen) console.log(`  ${c.name.padEnd(30)} ${c.reasons.join('; ').slice(0, 170)}`);
if (has('--list')) process.exit(0);
if (head) { console.error('--head measures a committed change for --list; a run checks the working tree'); process.exit(2); }

// a regression must run alone (TESTING_AND_EVIDENCE.md): the preflight does not start beside one, by either runner
const running = () => /scripts\/test\.mjs .*--(part|merge)=|scripts\/release\/regression\.mjs/.test(spawnSync('ps', ['-eo', 'args'], { encoding: 'utf8' }).stdout || '');
if (running()) { console.error('preflight: an exact-commit regression is running; it must run alone. Wait for it.'); process.exit(2); }

const commit = git('rev-parse', 'HEAD'); const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const treeHash = crypto.createHash('sha256').update(git('diff', 'HEAD')).update(git('ls-files', '--others', '--exclude-standard')).digest('hex').slice(0, 16);
const demoBuilt = () => { try { return JSON.parse(fs.readFileSync(path.join(root, 'apps/demo/dist/BUILD_MANIFEST.json'), 'utf8')).builtAt || ''; } catch { return ''; } };
const statePath = path.join(out, 'state.json'); const listKey = r.chosen.map((c) => c.file).join(',');
const from = arg('from');
if (from) { let st = null; try { st = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { st = null; }
  const ix = r.chosen.findIndex((c) => c.name === from); const need = r.chosen.slice(0, ix).map((c) => c.file);
  const why = ix < 0 ? 'it is not one of the chosen suites' : !st ? 'no earlier run has left its proof' : st.commit !== commit ? `the earlier run was on ${st.commit.slice(0, 8)}` : st.tree !== treeHash ? 'the working tree has changed since' : st.base !== base ? 'it measured from another base' : st.list !== listKey ? 'it chose another list' : !st.step2 ? 'its step 2 did not pass' : st.built !== demoBuilt() ? 'the demo has been rebuilt since' : need.find((f) => !st.passed.includes(f)) ? `${need.find((f) => !st.passed.includes(f))} did not pass in it` : '';
  if (why) { console.error(`--from=${from} refused: ${why}. Run the preflight from the start.`); process.exit(2); } }
const state = from ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : { commit, tree: treeHash, base, list: listKey, step2: false, built: '', passed: [] };
const save = () => fs.writeFileSync(statePath, JSON.stringify(state, null, 1));
if (!from) save();

// never a run of record: not under CI (the runner keeps a working run's evidence under .local/evidence)
const env = { ...process.env }; delete env.CI; delete env.EMPATHIA_EVIDENCE;
const report = [`# Preflight on ${commit.slice(0, 8)}${git('status', '--porcelain') ? ' plus uncommitted changes' : ''}, ${new Date().toISOString()}`, '', `Measured from ${base}. Not evidence of record: the exact-commit regression is.`, ''];
if (from) report.push(`Resumed at ${from}: step 2 and every suite before it passed in the run whose proof is in .local/preflight/state.json (same commit, tree, base, list and build).`, '');
const step = (label, args, timeoutMs, mustRun = false) => { const t0 = Date.now(); const p = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 256 << 20, env, timeout: timeoutMs });
  const s = Math.round((Date.now() - t0) / 1000); const text = `${p.stdout || ''}${p.stderr || ''}`; const v = judge(text, p.error ? -1 : p.status, { mustRun });
  const summary = [...text.trim().split('\n')].reverse().find((l) => /PASS \d+ · FAIL \d+/.test(l)) || text.trim().split('\n').pop() || '';
  const line = `${v.ok ? 'PASS' : 'FAIL'}  ${label}  (${s} s)  ${p.error ? `stopped: ${p.error.message}` : `${v.why ? `${v.why}: ` : ''}${summary.slice(0, 140)}`}`; console.log(line); report.push(`- ${line}`);
  for (const l of [...text.split('\n').filter((x) => /^FAIL\b|^not ok/.test(x)).slice(0, 8), ...v.notRun.map((x) => `${x} (a suite step 2 may not leave unrun)`)]) { console.log(`      ${l.slice(0, 220)}`); report.push(`    - ${l.slice(0, 220)}`); }
  return v.ok; };
let ok = true;
if (!from) {
  ok = step('step 2: build of every app, the Founder Studio included, with the type checks', ['scripts/build.mjs', '--studio'], 1800000);
  if (ok) ok = step('step 2: every non-browser suite (unit, security, integration, the dependency boundaries)', ['scripts/test.mjs'], 3600000);
  else console.log('the build failed: nothing else is run');
  if (ok) { state.step2 = true; state.built = demoBuilt(); save(); }
}
if (ok && r.chosen.length) { report.push('', `## Step 3: ${r.chosen.length} suites the change reaches`, '');
  for (const c of (from ? r.chosen.slice(r.chosen.findIndex((x) => x.name === from)) : r.chosen)) {
    if (running()) { console.log('a regression has started: the preflight stops (a regression runs alone)'); report.push('- stopped: a regression started'); ok = false; break; }
    ok = step(`step 3: ${c.name}`, ['scripts/test.mjs', '--browser', '--studio', `--files=${c.file}`], 3600000, true);
    if (ok) { state.passed.push(c.file); save(); }
    if (!ok && !has('--keep-going')) { const left = r.chosen.length - r.chosen.indexOf(c) - 1; if (left) { console.log(`stopped at the first failure; ${left} suites not run (--keep-going runs them all)`); report.push(`- stopped at the first failure; ${left} not run`); } break; } } }
const file = path.join(out, `${commit.slice(0, 8)}-${stamp}.md`); fs.writeFileSync(file, report.join('\n') + '\n');
console.log(`\npreflight ${ok ? 'PASSED' : 'FAILED'} — ${rel(root, file)}${ok ? '\nnext: step 4, an independent review of the change and of its tests; then step 5, the exact-commit regression' : ''}`);
process.exit(ok ? 0 : 1);
