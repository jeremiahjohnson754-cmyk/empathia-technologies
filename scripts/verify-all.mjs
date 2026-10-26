#!/usr/bin/env node
/**
 * The full local verification: build, every test suite, the API contract check, the frozen-release check, the secret scan and the
 * documentation link check. Writes tests/evidence/VERIFY_REPORT.json and .md with PASS / FAIL / NOT_RUN per check.
 *
 *   node scripts/verify-all.mjs [--browser] [--studio] [--films] [--frozen=<Empathia_V25 dir>]
 *
 * NOT_RUN is reported for anything that could not run here (for example the frozen-release check when the release folder is absent).
 * Nothing is converted to PASS. Exit 1 if any check FAILs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ev = path.join(root, 'tests/evidence'); fs.mkdirSync(ev, { recursive: true });
const checks = [];
const git = (...a) => spawnSync('git', ['-C', root, ...a], { encoding: 'utf8' }).stdout.trim();
function check(name, cmd, args, opts = {}) {
  if (opts.skip) { checks.push({ check: name, result: 'NOT_RUN', why: opts.skip }); console.log(`NOT_RUN  ${name} — ${opts.skip}`); return; }
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', maxBuffer: 256 << 20, timeout: opts.timeout || 3600000 });
  const result = r.status === 0 ? 'PASS' : 'FAIL';
  const tail = `${r.stdout}\n${r.stderr}`.trim().split('\n').slice(-3).join(' / ');
  checks.push({ check: name, result, seconds: Math.round((Date.now() - t0) / 100) / 10, evidence: opts.evidence || null, summary: tail.slice(0, 400) });
  console.log(`${result.padEnd(7)}  ${name}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
const pass = (f) => process.argv.filter((a) => a === f);
const frozen = (process.argv.find((a) => a.startsWith('--frozen=')) || '').split('=')[1] || '/home/claude/Empathia_V25';

check('build (tsc, type-check, OpenAPI contract, web bundle)', process.execPath, ['scripts/build.mjs'], { evidence: '.local/logs/BUILD_SUMMARY.json' });
check('test suites', process.execPath, ['scripts/test.mjs', ...pass('--browser'), ...pass('--studio'), ...pass('--films')], { evidence: 'tests/evidence/TEST_RESULTS.md' });
check('secret scan of tracked files', 'python3', ['-I', 'scripts/verify/scan-secrets.py', root, path.join(ev, 'SECRET_SCAN.json')], { evidence: 'tests/evidence/SECRET_SCAN.json' });
check('documentation links resolve', process.execPath, ['scripts/verify/check-links.mjs', path.join(ev, 'LINK_CHECK.json')], { evidence: 'tests/evidence/LINK_CHECK.json' });
check('frozen releases unchanged', 'python3', ['-I', 'scripts/verify/verify-frozen.py', frozen, path.join(ev, 'FROZEN_CHECK.json')], fs.existsSync(frozen) ? { evidence: 'tests/evidence/FROZEN_CHECK.json' } : { skip: `release folder ${frozen} not present on this machine` });
check('working tree clean of untracked secrets (.local ignored)', 'git', ['-C', root, 'check-ignore', '-q', '.local/pg/credentials.json']);

const rep = { at: new Date().toISOString(), commit: git('rev-parse', 'HEAD'), dirty: git('status', '--porcelain').length > 0, node: process.version, pass: checks.filter((c) => c.result === 'PASS').length, fail: checks.filter((c) => c.result === 'FAIL').length, notRun: checks.filter((c) => c.result === 'NOT_RUN').length, checks, note: 'Local verification of a production starter on synthetic data. It is not a security assessment, a performance test or production acceptance.' };
fs.writeFileSync(path.join(ev, 'VERIFY_REPORT.json'), JSON.stringify(rep, null, 2));
fs.writeFileSync(path.join(ev, 'VERIFY_REPORT.md'), ['# Verification report', '', `${rep.at} · commit \`${rep.commit.slice(0, 12)}\`${rep.dirty ? ' (uncommitted changes present)' : ''} · Node ${rep.node}`, '', `PASS ${rep.pass} · FAIL ${rep.fail} · NOT_RUN ${rep.notRun}`, '', '| Check | Result | Seconds | Evidence | Note |', '|---|---|---|---|---|',
  ...checks.map((c) => `| ${c.check} | ${c.result} | ${c.seconds ?? '—'} | ${c.evidence ?? ''} | ${(c.why || c.summary || '').replace(/\|/g, '/')} |`), '', rep.note].join('\n') + '\n');
console.log(`\nPASS ${rep.pass} · FAIL ${rep.fail} · NOT_RUN ${rep.notRun} — tests/evidence/VERIFY_REPORT.md`);
process.exit(rep.fail ? 1 : 0);
