// The frame rates the 3D scene suites measure are kept with the evidence of the run (tests/lib/frame-rates.mjs), 25 Nov 2026.
//
// Why: the exact-commit regression on 87956a57 passed and its committed record said PASS for the frame-rate checks and nothing about
// what they measured; the per-check files are under a directory git ignores. The founder's concern is the figures themselves
// (24 Nov 2026: 7, 9 and 10 measured against a floor of 8; 30 suggested as the target), so a run of record now keeps them.
//   FR-01  a suite run by hand writes its readings to scratch, never to tests/evidence; the file names the commit, the machine and says
//          in its own text that the figures are not a device's
//   FR-02  a reading that is not a measurement is refused: no number, an impossible detail, "full" that was not drawn at 100%, no check id
//   FR-03  only files written on the commit being merged are the run's: a file left by another commit, or a damaged one, is left out
//   FR-04  the three scene suites record what they measure, and the runner puts it in the ledger line and the results table
//   node --test tests/unit/frame-rates.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { reading, recordFrameRates, collectFrameRates, frameRateLines, NOT_A_DEVICE } from '../lib/frame-rates.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'frame-rates-'));
const good = { check: 'CL-13', mode: 'adapted', what: 'desktop 1280 × 860, opened as a visitor opens it', fps: 18, detail: 50, floor: 8 };

test('FR-01 a suite run by hand writes to scratch; the file names its commit and machine and says the figures are not a device’s', () => {
  const scratch = path.join(tmp, 'scratch'); const before = fs.existsSync(path.join(repo, 'tests/evidence/performance')) ? fs.readdirSync(path.join(repo, 'tests/evidence/performance')).map((f) => f + fs.statSync(path.join(repo, 'tests/evidence/performance', f)).mtimeMs).join() : 'absent';
  const env = { ...process.env, EMPATHIA_EVIDENCE_DIR: scratch }; delete env.EMPATHIA_EVIDENCE; delete env.CI;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', `import { recordFrameRates } from './tests/lib/frame-rates.mjs'; console.log(recordFrameRates('campus', [${JSON.stringify(good)}], { renderer: 'a software renderer' }));`], { cwd: repo, encoding: 'utf8', env });
  assert.equal(r.status, 0, r.stderr); const file = r.stdout.trim(); assert.equal(file, path.join(scratch, 'performance', 'campus.json'), 'written under the scratch directory');
  const after = fs.existsSync(path.join(repo, 'tests/evidence/performance')) ? fs.readdirSync(path.join(repo, 'tests/evidence/performance')).map((f) => f + fs.statSync(path.join(repo, 'tests/evidence/performance', f)).mtimeMs).join() : 'absent';
  assert.equal(after, before, 'the evidence of record is untouched');
  const rec = JSON.parse(fs.readFileSync(file, 'utf8')); const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).stdout.trim();
  assert.equal(rec.scene, 'campus'); assert.equal(rec.commit, head, 'the commit it was measured on'); assert.equal(rec.machine.cores, os.cpus().length); assert.equal(rec.machine.renderer, 'a software renderer');
  assert.equal(rec.note, NOT_A_DEVICE); assert.match(rec.note, /Not a measurement of any visitor’s device/); assert.match(rec.note, /no device has been measured/);
  assert.deepEqual(rec.readings, [good]); assert.ok(!JSON.stringify(rec).includes(os.homedir()) && !JSON.stringify(rec).includes(repo), 'no path of the machine that ran it');
});

test('FR-02 a reading that is not a measurement is refused, so it cannot be written as a number', () => {
  assert.deepEqual(reading(good), good); assert.deepEqual(reading({ ...good, triangles: 28412, draws: 103 }), { ...good, triangles: 28412, draws: 103 }, 'what the frame cost, counted, is kept when given'); assert.deepEqual(reading({ ...good, floor: undefined }), { check: 'CL-13', mode: 'adapted', what: good.what, fps: 18, detail: 50 });
  for (const [why, bad] of [['fps NaN', { ...good, fps: NaN }], ['fps as text', { ...good, fps: '18' }], ['fps negative', { ...good, fps: -1 }], ['fps absurd', { ...good, fps: 5000 }], ['fps missing', { ...good, fps: undefined }],
    ['detail below half', { ...good, detail: 40 }], ['detail above full', { ...good, detail: 120 }], ['detail as a fraction', { ...good, detail: 0.5 }], ['detail NaN', { ...good, detail: NaN }],
    ['full not at 100', { ...good, mode: 'full', detail: 80 }], ['no mode', { ...good, mode: undefined }], ['unknown mode', { ...good, mode: 'fast' }],
    ['triangles as a fraction', { ...good, triangles: 28412.5 }], ['triangles zero', { ...good, triangles: 0 }], ['draws as text', { ...good, draws: '103' }],
    ['no check', { ...good, check: '' }], ['a check that is a sentence', { ...good, check: 'the frame rate' }], ['no description', { ...good, what: '' }], ['floor as text', { ...good, floor: 'eight' }], ['nothing', null]])
    assert.throws(() => reading(bad), /frame-rate reading refused/, why);
  const dir = path.join(tmp, 'refused');
  assert.throws(() => recordFrameRates('campus', [good, { ...good, fps: NaN }], { dir, commit: 'c1' }), /refused/); assert.ok(!fs.existsSync(path.join(dir, 'campus.json')), 'nothing is written when one reading is refused');
  assert.throws(() => recordFrameRates('campus', [], { dir, commit: 'c1' }), /no readings/); assert.throws(() => recordFrameRates('../campus', [good], { dir, commit: 'c1' }), /not a scene name/); assert.throws(() => recordFrameRates('Campus Life', [good], { dir, commit: 'c1' }), /not a scene name/);
});

test('FR-03 only the files written on the commit being merged belong to the run', () => {
  const dir = path.join(tmp, 'merge');
  recordFrameRates('campus', [good, { check: 'CL-21', mode: 'full', what: 'desktop 1280 × 860, held at full detail', fps: 10, detail: 100 }, { check: 'CL-21', mode: 'adapted', what: 'desktop 1280 × 860, left to adapt', fps: 23, detail: 50 }], { dir, commit: 'this', renderer: 'software' });
  recordFrameRates('stadium', [{ check: 'SLV-12', mode: 'full', what: 'desktop 1440 × 900, held at full detail', fps: 6, detail: 100, floor: 2, triangles: 53174, draws: 155 }], { dir, commit: 'another', renderer: 'software' });
  fs.writeFileSync(path.join(dir, 'expo.json'), '{ not json'); fs.writeFileSync(path.join(dir, 'notes.txt'), 'x');
  fs.writeFileSync(path.join(dir, 'forged.json'), JSON.stringify({ scene: 'forged', commit: 'this', readings: [{ ...good, fps: 'fast' }] }));
  const got = collectFrameRates(dir, 'this');
  assert.deepEqual(got.scenes, { campus: { 'CL-13 adapted': { fps: 18, detail: 50, floor: 8 }, 'CL-21 full': { fps: 10, detail: 100 }, 'CL-21 adapted': { fps: 23, detail: 50 } } }, 'the stadium file is another commit’s; the damaged and the forged files are left out');
  assert.equal(got.machine.renderer, 'software'); assert.equal(got.machine.cores, os.cpus().length);
  assert.deepEqual(collectFrameRates(dir, 'another').scenes, { stadium: { 'SLV-12 full': { fps: 6, detail: 100, floor: 2, triangles: 53174, draws: 155 } } });
  assert.ok(frameRateLines(dir, 'another').includes('| stadium | SLV-12 full | desktop 1440 × 900, held at full detail | 6 | 100% | 2 | 53174 | 155 |'));
  assert.deepEqual(collectFrameRates(dir, 'none'), { scenes: {}, machine: null }); assert.deepEqual(collectFrameRates(path.join(tmp, 'absent'), 'this'), { scenes: {}, machine: null }); assert.deepEqual(collectFrameRates(dir, ''), { scenes: {}, machine: null });
  const lines = frameRateLines(dir, 'this'); assert.ok(lines.includes('## Frame rates this run measured')); assert.ok(lines.some((l) => l.includes(NOT_A_DEVICE)), 'the table carries the same sentence');
  assert.ok(lines.includes('| campus | CL-21 full | desktop 1280 × 860, held at full detail | 10 | 100% | — | — | — |')); assert.ok(lines.includes('| campus | CL-13 adapted | desktop 1280 × 860, opened as a visitor opens it | 18 | 50% | 8 | — | — |'));
  assert.ok(!lines.some((l) => /stadium|forged/.test(l))); assert.deepEqual(frameRateLines(dir, 'none'), [], 'a run that measured nothing adds nothing to the table');
});

test('FR-04 the scene suites record what they measure and the runner carries it into the ledger line and the results table', () => {
  const src = (f) => fs.readFileSync(path.join(repo, f), 'utf8');
  for (const [f, scene, checks, own] of [['tests/browser/demo-campus-life.test.mjs', 'campus', ["check: 'CL-13', mode: 'adapted'", "check: 'CL-21', mode: 'full'", "check: 'CL-21', mode: 'adapted'", "check: 'CL-16f', mode: 'adapted'"], 'CL-23'],
    ['tests/browser/demo-stadium-live.test.mjs', 'stadium', ["check: 'SLV-12', mode: 'full'", "check: 'SLV-15', mode: 'adapted'"], 'SLV-16'], ['tests/browser/demo-expo-live.test.mjs', 'expo', ["check: 'XPO-10', mode: 'full'", "check: 'XPO-13', mode: 'adapted'"], 'XPO-14']]) {
    const s = src(f); assert.ok(s.includes(`recordFrameRates('${scene}', FR, { renderer: GL })`), `${f} records its readings`); for (const c of checks) assert.ok(s.includes(c), `${f}: ${c}`);
    assert.ok(new RegExp(`ok\\('${own}', 'the frame rates this run measured are written beside its evidence`).test(s), `${f}: ${own} fails the suite if the record could not be written`);
    assert.ok(!/tests\/evidence/.test(s.replace(/^\s*\/\/.*$/gm, '')), `${f} does not name the evidence directory itself`);
  }
  // the floors are where they were: recording the figures changed no threshold
  assert.match(src('tests/browser/demo-campus-life.test.mjs'), /fpsDesk >= 8/); assert.match(src('tests/browser/demo-campus-life.test.mjs'), /fpsPhone >= 8/); assert.match(src('tests/browser/demo-stadium-live.test.mjs'), /fps >= 2/); assert.match(src('tests/browser/demo-expo-live.test.mjs'), /fps >= 4/);
  const t = src('scripts/test.mjs'); assert.ok(t.includes("frameRates: collectFrameRates(path.join(out, 'performance'), head)"), 'the ledger line'); assert.ok(t.includes("...frameRateLines(path.join(out, 'performance'), head)"), 'the results table');
  assert.ok(t.includes("['--test', 'tests/unit/frame-rates.test.mjs']"), 'this suite is registered');
});
