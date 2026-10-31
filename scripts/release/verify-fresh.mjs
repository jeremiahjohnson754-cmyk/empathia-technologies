#!/usr/bin/env node
/**
 * P7 — reproducible build and QA from the committed source only. Clones HEAD into an empty directory outside this workspace (so no
 * untracked or ignored file of this workspace can make a test pass), links the toolchain the same way a new machine would
 * (scripts/bootstrap.mjs), starts its own database cluster on another port, builds, and runs the full suite there. Then it compares the
 * fresh results with this workspace's latest results suite by suite, and writes tests/evidence/FRESH_CHECKOUT.{json,md}.
 *   node scripts/release/verify-fresh.mjs [--keep]      (needs a clean working tree; do not run while another full test run is going)
 * Result values are copied from the fresh run's own TEST_RESULTS.json: nothing is inferred, a suite that did not run is NOT_RUN.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
if (git('status', '--porcelain')) { console.error('the working tree has uncommitted changes; commit first (the fresh copy is made from HEAD)'); process.exit(2); }
const commit = git('rev-parse', 'HEAD'); const short = commit.slice(0, 7);
const dir = path.join(os.tmpdir(), `empathia-fresh-${short}`);
fs.rmSync(dir, { recursive: true, force: true });
const steps = []; const t0 = Date.now();
const step = (name, cmd, args, opts = {}) => {
  const s = Date.now(); const r = spawnSync(cmd, args, { cwd: opts.cwd || dir, env: { ...process.env, ...(opts.env || {}) }, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const out = `${r.stdout || ''}${r.stderr || ''}`; fs.mkdirSync(path.join(root, '.local/logs'), { recursive: true }); fs.writeFileSync(path.join(root, `.local/logs/fresh-${name}.log`), out);
  steps.push({ name, command: [cmd, ...args].join(' '), exit: r.status, seconds: Math.round((Date.now() - s) / 100) / 10 });
  console.log(`${r.status === 0 ? 'ok  ' : 'FAIL'} ${name} (${steps.at(-1).seconds} s)`); return r.status === 0;
};
const env = { EMPATHIA_PG_PORT: '55433' };
let ok = step('clone', 'git', ['clone', '--quiet', '--no-hardlinks', root, dir], { cwd: root });
ok = ok && step('bootstrap', process.execPath, ['scripts/bootstrap.mjs']);
ok = ok && step('database', process.execPath, ['scripts/db.mjs', 'up'], { env });
ok = ok && step('build', process.execPath, ['scripts/build.mjs'], { env });
const ran = ok && (step('test', process.execPath, ['scripts/test.mjs', '--browser', '--studio'], { env }), true);
spawnSync(process.execPath, ['scripts/db.mjs', 'down'], { cwd: dir, env: { ...process.env, ...env } });

const read = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
const fresh = ran ? read(path.join(dir, 'tests/evidence/TEST_RESULTS.json')) : null;
const here = read(path.join(root, 'tests/evidence/TEST_RESULTS.json'));
const by = (r) => Object.fromEntries((r?.suites || []).map((s) => [s.suite, s]));
const F = by(fresh), H = by(here);
const differences = [...new Set([...Object.keys(F), ...Object.keys(H)])].filter((n) => F[n]?.result !== H[n]?.result || F[n]?.pass !== H[n]?.pass || F[n]?.tests !== H[n]?.tests)
  .map((n) => ({ suite: n, fresh: F[n] ? `${F[n].result} ${F[n].pass ?? ''}/${F[n].tests ?? ''}` : 'absent', workspace: H[n] ? `${H[n].result} ${H[n].pass ?? ''}/${H[n].tests ?? ''}` : 'absent' }));
const report = { at: new Date().toISOString(), commit, directory: dir, node: process.version, steps, seconds: Math.round((Date.now() - t0) / 1000),
  fresh: fresh ? { pass: fresh.pass, fail: fresh.fail, notRun: fresh.notRun, suites: fresh.suites.map((s) => ({ suite: s.suite, result: s.result, pass: s.pass, tests: s.tests, why: s.why })) } : null,
  workspace: here ? { at: here.at, pass: here.pass, fail: here.fail, notRun: here.notRun } : null, differences,
  verdict: !fresh ? 'NOT_RUN: the fresh build did not reach the test stage (see steps)' : fresh.fail ? `FAIL: ${fresh.fail} suite(s) failed in the fresh copy` : differences.length ? 'PASS with differences (see the table)' : 'PASS: the fresh copy reproduces this workspace suite by suite' };
fs.writeFileSync(path.join(root, 'tests/evidence/FRESH_CHECKOUT.json'), JSON.stringify(report, null, 2) + '\n');
const md = [`# Fresh-checkout validation (P7)`, '', `Commit \`${commit}\`, cloned into an empty directory, toolchain linked by \`scripts/bootstrap.mjs\`, its own database cluster (port 55433), \`node scripts/build.mjs\`, \`node scripts/test.mjs --browser --studio\`. Run ${report.at}, ${report.seconds} s.`, '',
  `**Verdict: ${report.verdict}**`, '', '| Step | Exit | Seconds |', '|---|---|---|', ...steps.map((s) => `| ${s.name} | ${s.exit} | ${s.seconds} |`), '',
  fresh ? `Fresh copy: PASS ${fresh.pass} · FAIL ${fresh.fail} · NOT_RUN ${fresh.notRun}. Workspace (${here?.at}): PASS ${here?.pass} · FAIL ${here?.fail} · NOT_RUN ${here?.notRun}.` : 'The fresh copy did not reach the test stage.', '',
  differences.length ? ['| Suite | Fresh copy | Workspace |', '|---|---|---|', ...differences.map((d) => `| ${d.suite} | ${d.fresh} | ${d.workspace} |`)].join('\n') : 'No suite differs between the fresh copy and this workspace.', ''].join('\n');
fs.writeFileSync(path.join(root, 'tests/evidence/FRESH_CHECKOUT.md'), md);
console.log(report.verdict);
if (!process.argv.includes('--keep')) fs.rmSync(dir, { recursive: true, force: true });
process.exit(fresh && !fresh.fail ? 0 : 1);
