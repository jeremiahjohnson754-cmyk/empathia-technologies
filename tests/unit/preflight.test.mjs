// The preflight (scripts/preflight.mjs): steps 2 and 3 of the engineering sequence (founder, 25 Nov 2026 07:50 CT). 25 Nov 2026.
//   PRE-01  with nothing changed it chooses no browser suite, and says so
//   PRE-02  it chooses from the code: for the change that failed the regression on 52cdd952 it chooses the suite that failed (demo-fi-scan),
//           and for the one-commit correction after it, only a few (skipped where the history is not in this checkout)
//   PRE-03  its list of cross-product suites names suites that exist (it refuses to run otherwise), and it never writes to tests/evidence
//   node --test tests/unit/preflight.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const list = (...a) => spawnSync(process.execPath, ['scripts/preflight.mjs', '--list', ...a], { cwd: repo, encoding: 'utf8' });
const known = (c) => spawnSync('git', ['cat-file', '-e', `${c}^{commit}`], { cwd: repo }).status === 0;

test('PRE-01 nothing changed: no browser suite is chosen', () => {
  const r = list('--base=HEAD', '--head=HEAD'); assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /0 files changed/); assert.match(r.stdout, /would run 0 of \d+ browser suites/);
});

test('PRE-02 it chooses the suites a change reaches, from the code', { skip: !(known('8891a3fd') && known('52cdd952') && known('53ce8657')) && 'the history is not in this checkout' }, () => {
  const a = list('--base=8891a3fd', '--head=52cdd952'); assert.equal(a.status, 0, a.stderr);
  for (const n of ['demo-fi-scan', 'demo-replay', 'demo-return-trail', 'demo-performance-check']) assert.match(a.stdout, new RegExp(`^  ${n} `, 'm'), `${n} is chosen for 8891a3fd..52cdd952`);
  assert.match(a.stdout, /^  demo-fi-scan .*fi\/FiScan\.tsx → #\/v25\/fi\/scan\/:room/m, 'and says why: the module and the address it serves');
  const b = list('--base=52cdd952', '--head=53ce8657'); assert.equal(b.status, 0, b.stderr);
  const n = Number(/would run (\d+) of/.exec(b.stdout)[1]); assert.ok(n >= 1 && n <= 6, `a two-file correction chooses a few suites, not the matrix (${n})`); assert.match(b.stdout, /^  demo-fi-scan /m);
});

test('PRE-03 its cross-product suites exist, and it writes nothing of record', () => {
  const s = fs.readFileSync(path.join(repo, 'scripts/preflight.mjs'), 'utf8');
  const across = /const ACROSS = \{([\s\S]*?)\n\};/.exec(s)[1]; for (const m of across.matchAll(/'([\w-]+)':/g)) assert.ok(fs.existsSync(path.join(repo, `tests/browser/${m[1]}.test.mjs`)), `${m[1]} exists`);
  const code = s.replace(/^\s*(\/\/|\*).*$/gm, ''); const mentions = [...code.matchAll(/[^\n]*tests\/evidence[^\n]*/g)].map((m) => m[0]);
  assert.ok(mentions.length === 1 && /readFileSync\(path\.join\(root, 'tests\/evidence\/TEST_RESULTS\.json'\)/.test(mentions[0]), 'the one mention of tests/evidence is a read of the last results, for timings');
  const writes = [...code.matchAll(/writeFileSync\(([^,]+),/g)].map((m) => m[1].trim()); assert.deepEqual(writes, ['file'], 'it writes one file: its report');
  assert.match(code, /const file = path\.join\(out, /, 'and that file is under .local/preflight');
  assert.ok(s.includes("path.join(root, '.local/preflight')"));
});
