// The release gate and the public CI workflow (founder decision E3-D5, 23 Nov 2026: repair GitHub CI without compromising the private
// Founder Studio). The gate is run as CI runs it, against result files written here; nothing private is needed or read.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const gate = path.join(repo, 'scripts/verify/no-unexpected-skips.mjs');
const STUDIO = ['browser: Founder Studio', 'e2e: founder town hall (Founder Edition)', 'e2e: founder decisions (hosted studio over the API)'];
const FILMS = 'media: full decode of every curated film';
const checkout = (suites, { studioBuilt = false } = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'empathia-gate-'));
  fs.mkdirSync(path.join(dir, 'tests/evidence'), { recursive: true });
  const n = (r) => suites.filter((s) => s.result === r).length;
  fs.writeFileSync(path.join(dir, 'tests/evidence/TEST_RESULTS.json'), JSON.stringify({ pass: n('PASS'), fail: n('FAIL'), notRun: n('NOT_RUN'), suites }));
  if (studioBuilt) { fs.mkdirSync(path.join(dir, 'apps/founder-studio/dist'), { recursive: true }); fs.writeFileSync(path.join(dir, 'apps/founder-studio/dist/index.html'), '<!doctype html>'); }
  return dir;
};
const run = (dir, ...args) => spawnSync(process.execPath, [gate, `--root=${dir}`, ...args], { encoding: 'utf8' });
const pass = (suite) => ({ suite, result: 'PASS' }); const skip = (suite, why = 'pass --studio') => ({ suite, result: 'NOT_RUN', why });
const runner = () => [pass('unit: a'), pass('browser: b'), ...STUDIO.map((s) => skip(s)), skip(FILMS, 'pass --films')];

test('RG-01 a failing suite is never releasable, with or without the declaration', () => {
  const dir = checkout([pass('unit: a'), { suite: 'unit: b', result: 'FAIL' }]);
  for (const args of [[], ['--private-store=absent']]) { const r = run(dir, ...args); assert.equal(r.status, 1); assert.match(r.stderr, /FAIL {2}unit: b/); }
});

test('RG-02 the studio suites NOT RUN without the declaration: refused, each named', () => {
  const r = run(checkout(runner())); assert.equal(r.status, 1);
  for (const s of STUDIO) assert.ok(r.stderr.includes(`NOT_RUN  ${s}`), s);
});

test('RG-03 a runner that declares it has no private store: releasable, the three named as NOT RUN and the result says it does not cover the studio', () => {
  const r = run(checkout(runner()), '--profile=platform', '--private-store=absent'); assert.equal(r.status, 0, r.stderr);
  for (const s of STUDIO) assert.ok(r.stdout.includes(`allowed skip: ${s}`), s);
  assert.match(r.stdout, /2 PASS, 0 FAIL, 4 NOT_RUN/);                      // never counted as passed
  assert.match(r.stdout, /does not cover the Founder Studio: 3 of its suites were NOT RUN/);
});

test('RG-04 the declaration is refused where the studio is built: its suites must run there', () => {
  const r = run(checkout(runner(), { studioBuilt: true }), '--private-store=absent'); assert.equal(r.status, 1);
  assert.match(r.stderr, /built in this checkout/);
});

test('RG-05 the declaration is refused for a media release', () => {
  const r = run(checkout(runner()), '--profile=media', '--private-store=absent'); assert.equal(r.status, 1);
  assert.match(r.stderr, /media release/);
});

test('RG-06 the declaration excuses the three studio suites and nothing else', () => {
  const r = run(checkout([...runner(), skip('browser: demo', 'chromium missing')]), '--private-store=absent'); assert.equal(r.status, 1);
  assert.match(r.stderr, /NOT_RUN {2}browser: demo/); assert.ok(!STUDIO.some((s) => r.stderr.includes(s)));
});

test('RG-07 a studio that ran and passed is simply counted; an unknown profile or value is refused', () => {
  const ok = run(checkout([pass('unit: a'), ...STUDIO.map(pass), skip(FILMS, 'pass --films')], { studioBuilt: true })); assert.equal(ok.status, 0, ok.stderr);
  assert.ok(!/does not cover/.test(ok.stdout));
  assert.equal(run(checkout(runner()), '--profile=anything').status, 1);
  assert.equal(run(checkout(runner()), '--private-store=present').status, 1);
});

test('RG-08 the public workflow builds nothing private, asks for no secret, and tells the gate so', () => {
  const y = fs.readFileSync(path.join(repo, '.github/workflows/ci.yml'), 'utf8');
  const runs = y.split('\n').filter((l) => /^\s+run:/.test(l) || /^\s{10}\S/.test(l)).join('\n');
  assert.ok(!/--studio/.test(runs), 'no step builds or tests the studio');
  assert.ok(!/founder-studio-assets|EMPATHIA_PRIVATE_STORE|founder-edition/i.test(runs), 'no step touches the private store');
  assert.ok(!/\$\{\{\s*secrets\./.test(y), 'the workflow reads no secret');
  assert.match(y, /permissions: \{ contents: read \}/);
  assert.match(y, /no-unexpected-skips\.mjs --profile=\$RELEASE_PROFILE --private-store=absent/);
  assert.match(y, /node scripts\/build\.mjs\n/); assert.match(y, /node scripts\/test\.mjs --browser\n/);
});
