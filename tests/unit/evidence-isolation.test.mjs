// The evidence of record is changed only by a run of record (founder directive, 24 Nov 2026: "A standalone test must not overwrite
// the authoritative evidence from a completed exact-commit regression"; "Preserve failed-run evidence separately").
//
// Before 24 Nov every suite wrote into tests/evidence whenever it ran, and scripts/test.mjs rewrote TEST_RESULTS on every run, so a
// working run replaced a regression's record (once with "NOT_RUN 139") until someone restored it by hand.
//   EV-01  where evidence goes: scratch by default, tests/evidence only for a run of record or CI
//   EV-02  no suite names tests/evidence itself: every one asks tests/lib/evidence.mjs
//   EV-03  a real working run of the runner leaves tests/evidence and the ledger byte-identical, writes its own results elsewhere,
//          and removes its temp directory
//   EV-04  a run of record cannot be narrowed with --only
//   EV-05  the cleanup script knows the temp prefixes the tests use and removes nothing else
//   EV-06  the stall watcher writes a line when its process is held for longer than its limit, and none otherwise
//   EV-07  a failed suite is run a second time only when the machine stalled three seconds or more while it ran
//   node --test tests/unit/evidence-isolation.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evidenceRoot, ofRecord } from '../lib/evidence.mjs';
import { prefixes } from '../../scripts/dev/clean-test-temp.mjs';
import { stallsBetween, rerunAfterStall, RERUN_AFTER_STALL_MS } from '../../scripts/dev/stalls.mjs';
import { spawn } from 'node:child_process';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = (f) => (fs.existsSync(f) ? crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') : 'absent');
const tree = (dir) => { const o = {}; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else o[path.relative(dir, f)] = sha(f); } }; if (fs.existsSync(dir)) walk(dir); return o; };

test('EV-01 evidence goes to a scratch directory unless the run is a run of record', () => {
  const rec = path.join(repo, 'tests/evidence');
  assert.equal(evidenceRoot({}), path.join(repo, '.local/evidence/standalone'), 'a suite run by hand');
  assert.equal(evidenceRoot({ EMPATHIA_EVIDENCE: 'record' }), rec, 'the runner says it is a run of record');
  assert.equal(evidenceRoot({ CI: 'true' }), rec, 'a run in CI is a run of record');
  assert.equal(evidenceRoot({ EMPATHIA_EVIDENCE: 'scratch', EMPATHIA_EVIDENCE_DIR: '.local/evidence/run-x' }), path.join(repo, '.local/evidence/run-x'), 'a working run of the runner');
  assert.equal(evidenceRoot({ CI: 'true', EMPATHIA_EVIDENCE: 'scratch', EMPATHIA_EVIDENCE_DIR: '.local/evidence/run-x' }), path.join(repo, '.local/evidence/run-x'), 'a narrowed run stays scratch even in CI');
  assert.equal(evidenceRoot({ EMPATHIA_EVIDENCE: 'record', EMPATHIA_EVIDENCE_DIR: '/somewhere/else' }), rec, 'a run of record cannot be pointed elsewhere');
  assert.equal(ofRecord({}), false); assert.equal(ofRecord({ EMPATHIA_EVIDENCE: 'anything' }), false);
});

test('EV-02 no suite writes to tests/evidence by name', () => {
  const offenders = [];
  for (const dir of ['tests/browser', 'tests/e2e', 'tests/media', 'tests/integration', 'tests/security']) { const d = path.join(repo, dir); if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter((x) => /\.(mjs|js)$/.test(x))) { const lines = fs.readFileSync(path.join(d, f), 'utf8').split('\n');
      lines.forEach((l, i) => { if (/tests\/evidence|'tests',\s*'evidence'/.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l) && !/\/\/[^'"`]*tests\/evidence[^'"`]*$/.test(l)) offenders.push(`${dir}/${f}:${i + 1}`); }); } }
  for (const f of ['deploy/render/rehearse-demo.mjs', 'scripts/evidence/connected-screens.mjs']) { const lines = fs.readFileSync(path.join(repo, f), 'utf8').split('\n'); lines.forEach((l, i) => { if (/path\.join\([^)]*tests\/evidence/.test(l)) offenders.push(`${f}:${i + 1}`); }); }
  assert.deepEqual(offenders, [], 'these lines name tests/evidence instead of asking tests/lib/evidence.mjs');
});

test('EV-03 a working run of the runner leaves the record untouched and cleans up after itself', () => {
  const rec = path.join(repo, 'tests/evidence'); const ledger = path.join(repo, 'tests/REGRESSION_LEDGER.jsonl');
  const before = { files: tree(rec), ledger: sha(ledger), failed: Object.keys(tree(path.join(repo, 'tests/evidence-failed'))).length };
  const runsBefore = new Set(fs.existsSync(path.join(repo, '.local/evidence')) ? fs.readdirSync(path.join(repo, '.local/evidence')) : []);
  const tmpBefore = new Set(fs.readdirSync(os.tmpdir()).filter((x) => x.startsWith('empathia-test-run-')));
  const env = { ...process.env }; delete env.CI; delete env.EMPATHIA_EVIDENCE; delete env.EMPATHIA_EVIDENCE_DIR; delete env.NODE_TEST_CONTEXT;   // TMPDIR is kept: the child's run directory is then made where this test looks
  const r = spawnSync(process.execPath, ['scripts/test.mjs', '--only=unit: packages/service-engine'], { cwd: repo, encoding: 'utf8', env, timeout: 120000 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /a working run: tests\/evidence is unchanged/);
  assert.deepEqual(tree(rec), before.files, 'tests/evidence is byte-identical after a working run');
  assert.equal(sha(ledger), before.ledger, 'the ledger gets no line from a working run');
  assert.equal(Object.keys(tree(path.join(repo, 'tests/evidence-failed'))).length, before.failed);
  const made = fs.readdirSync(path.join(repo, '.local/evidence')).filter((x) => x.startsWith('run-') && !runsBefore.has(x));
  assert.equal(made.length, 1, 'the working run wrote its own results directory');
  const res = JSON.parse(fs.readFileSync(path.join(repo, '.local/evidence', made[0], 'TEST_RESULTS.json'), 'utf8'));
  assert.equal(res.suites.length, 1); assert.equal(res.suites[0].result, 'PASS'); assert.match(res.suites[0].suite, /service-engine/);
  fs.rmSync(path.join(repo, '.local/evidence', made[0]), { recursive: true, force: true });
  const left = fs.readdirSync(os.tmpdir()).filter((x) => x.startsWith('empathia-test-run-') && !tmpBefore.has(x));
  assert.deepEqual(left, [], 'the run removed its temp directory');
});

test('EV-04 a run of record cannot be narrowed', () => {
  const before = sha(path.join(repo, 'tests/evidence/TEST_RESULTS.json'));
  for (const flag of ['--record', '--part=1/5', '--merge=5']) { const r = spawnSync(process.execPath, ['scripts/test.mjs', '--only=unit: packages/service-engine', flag], { cwd: repo, encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 2, `${flag}: ${r.stdout}${r.stderr}`); assert.match(r.stderr, /cannot be combined/); }
  assert.equal(sha(path.join(repo, 'tests/evidence/TEST_RESULTS.json')), before);
});

test('EV-05 the cleanup removes only directories the tests make', () => {
  const pre = prefixes(); for (const p of ['voice-', 'demo-flagship-', 'empathia-px-website-', 'empathia-test-run-']) assert.ok(pre.includes(p), `${p} is a known prefix`);
  const box = fs.mkdtempSync(path.join(os.tmpdir(), 'ev05-')); const old = Date.now() / 1000 - 4 * 3600;
  const mk = (name, aged = true) => { const d = path.join(box, name); fs.mkdirSync(d); fs.writeFileSync(path.join(d, 'f'), 'x'); if (aged) fs.utimesSync(d, old, old); return d; };
  const gone = mk('voice-Ab12Cd'); const fresh = mk('voice-Zz99Yy', false); const other = mk('claude-0'); const near = mk('voice-notes'); const file = path.join(box, 'voice-Ab12Ce'); fs.writeFileSync(file, 'x'); fs.utimesSync(file, old, old);
  const run = (args) => spawnSync(process.execPath, ['scripts/dev/clean-test-temp.mjs', ...args], { cwd: repo, encoding: 'utf8', env: { ...process.env, EMPATHIA_CLEAN_TMP: box } });
  const dry = run([]); assert.match(dry.stdout, /would remove 1 directories/); assert.ok(fs.existsSync(gone), 'listing removes nothing');
  const did = run(['--apply']); assert.match(did.stdout, /removed 1 directories/);
  assert.ok(!fs.existsSync(gone), 'an old directory with a test prefix and a mkdtemp suffix is removed');
  assert.ok(fs.existsSync(fresh), 'one modified recently is left: a run may be using it');
  assert.ok(fs.existsSync(other) && fs.existsSync(near) && fs.existsSync(file), 'anything else is left');
  fs.rmSync(box, { recursive: true, force: true });
});

// 24 Nov 2026: three checks that measure time failed across two regressions (a focus read 400 ms after a key press, a frame rate one
// below its floor, a browser timeout) and passed when run again on the same commit; the session had been paused in that hour, and
// GitHub's run of the same commit passed. Nothing recorded whether the machine had stalled. Now something does.
test('EV-06 the stall watcher notes when its process is held, and only then', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ev06-')); const file = path.join(dir, 'stalls.jsonl');
  const w = spawn(process.execPath, [path.join(repo, 'scripts/dev/stall-watch.mjs'), file, '1000'], { stdio: ['pipe', 'ignore', 'ignore'] });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(1500); assert.equal(fs.existsSync(file), false, 'a machine that keeps running writes nothing');
  const t0 = Date.now(); process.kill(w.pid, 'SIGSTOP'); await wait(2200); process.kill(w.pid, 'SIGCONT'); await wait(900); const t1 = Date.now();
  const got = stallsBetween(file, t0, t1); assert.ok(got, 'holding the process for 2.2 s is written down'); assert.equal(got.count, 1); assert.ok(got.longestMs >= 1000 && got.longestMs < 4000, `the gap is measured: ${got.longestMs} ms`);
  assert.equal(stallsBetween(file, t1 + 60000, t1 + 120000), null, 'a stall is not attributed to a suite that ran at another time');
  w.stdin.end(); await wait(300); assert.notEqual(w.exitCode, null, 'the watcher ends when the program that started it closes its input'); fs.rmSync(dir, { recursive: true, force: true });
});

test('EV-07 a second run is only for a failure during a stall of three seconds or more', () => {
  assert.equal(RERUN_AFTER_STALL_MS, 3000);
  assert.equal(rerunAfterStall(true, { count: 1, longestMs: 3000 }), true, 'failed, and the machine stalled 3 s');
  assert.equal(rerunAfterStall(true, { count: 4, longestMs: 2999 }), false, 'shorter stalls do not excuse a failure');
  assert.equal(rerunAfterStall(true, null), false, 'a failure on a machine that kept running is a failure');
  assert.equal(rerunAfterStall(false, { count: 1, longestMs: 60000 }), false, 'a pass is never run again');
  assert.equal(stallsBetween(path.join(repo, 'no-such-file.jsonl'), 0, Date.now()), null);
  const src = fs.readFileSync(path.join(repo, 'scripts/test.mjs'), 'utf8');
  assert.match(src, /if \(rerunAfterStall\(/, 'the runner asks this rule'); assert.equal((src.match(/once\(\)/g) || []).length, 2, 'the runner starts a suite in two places only: the first attempt and the one second run');
  assert.match(src, /firstAttempt/, 'and keeps the first attempt in the record');
});
