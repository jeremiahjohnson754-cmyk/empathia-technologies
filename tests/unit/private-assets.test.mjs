// Private assets for the Founder Studio (founder, 17 Nov 2026: "a reproducible private-asset provisioning process that keeps
// credentials and licensed content protected while allowing the entire test suite to run consistently in a clean environment").
// These checks need no private file: they are about what happens with and without them, and about what the repository holds.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync, execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tool = path.join(repo, 'scripts/private/founder-studio-assets.mjs');
const manifest = JSON.parse(fs.readFileSync(path.join(repo, 'apps/founder-studio/PRIVATE_ASSETS.json'), 'utf8'));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'empathia-private-'));
const run = (args, store) => spawnSync(process.execPath, [tool, ...args], { cwd: repo, encoding: 'utf8', env: { ...process.env, EMPATHIA_PRIVATE_STORE: store } });

test('PA-01 the manifest holds names, sizes and hashes, and nothing else', () => {
  assert.ok(manifest.files.length >= 2);
  for (const f of manifest.files) {
    assert.deepEqual(Object.keys(f).sort(), ['bytes', 'path', 'role', 'sha256']);
    assert.match(f.sha256, /^[0-9a-f]{64}$/); assert.ok(Number.isInteger(f.bytes) && f.bytes > 0);
    assert.ok(!path.isAbsolute(f.path) && !f.path.split('/').includes('..'), `${f.path} stays inside the store`);
  }
  assert.ok(fs.statSync(path.join(repo, 'apps/founder-studio/PRIVATE_ASSETS.json')).size < 8192, 'a manifest, not a container for content');
});

test('PA-02 none of the private files is tracked in the repository', () => {
  const tracked = execFileSync('git', ['-C', repo, 'ls-files'], { encoding: 'utf8', maxBuffer: 64 << 20 }).split('\n');
  const names = new Set(manifest.files.map((f) => path.basename(f.path)));
  assert.deepEqual(tracked.filter((t) => names.has(path.basename(t))), []);
  for (const p of ['apps/founder-studio/dist/index.html', 'apps/founder-studio/src/generated/docs.json']) assert.equal(spawnSync('git', ['-C', repo, 'check-ignore', '-q', p]).status, 0, `${p} is ignored`);
});

test('PA-03 the default store is outside the repository', () => {
  const src = fs.readFileSync(tool, 'utf8');
  assert.match(src, /os\.homedir\(\), '\.empathia-private'/);
  assert.ok(path.relative(repo, path.join(os.homedir(), '.empathia-private')).startsWith('..'));
});

test('PA-04 with no store: verify fails and says NOT PROVISIONED; provision builds nothing', () => {
  const store = tmp(); const checkout = tmp();
  const v = run(['verify'], store); assert.equal(v.status, 1); assert.match(v.stdout, /NOT PROVISIONED: the private store is not on this machine/);
  const p = run(['provision', `--checkout=${checkout}`], store); assert.equal(p.status, 1); assert.match(p.stderr, /NOT PROVISIONED/);
  assert.deepEqual(fs.readdirSync(checkout), []);
});

test('PA-05 a store with a missing file, or one with different content, is refused, and each is named', () => {
  const store = tmp(); const first = manifest.files[0]; const p = path.join(store, 'founder-studio', first.path);
  fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, Buffer.alloc(first.bytes));   // the right size, the wrong content
  const v = run(['verify'], store); assert.equal(v.status, 1);
  assert.match(v.stdout, new RegExp(`different content\\s+${first.bytes}\\s+${first.path.replace(/[.]/g, '\\.')}`));
  assert.equal((v.stdout.match(/^missing /gm) || []).length, manifest.files.length - 1);
  const pr = run(['provision', `--checkout=${tmp()}`], store); assert.equal(pr.status, 1); assert.match(pr.stderr, /do not match the manifest/);
});

test('PA-06 the studio suite on a studio without its private files is NOT RUN: exit 3, never 0, and it says how to provision', () => {
  const dist = tmp(); const out = tmp(); fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>studio</title>');
  const r = spawnSync(process.execPath, [path.join(repo, 'tests/browser/founder-studio.test.mjs'), dist, out], { cwd: repo, encoding: 'utf8', timeout: 60000 });
  assert.equal(r.status, 3, r.stdout + r.stderr);
  assert.match(r.stdout, /^NOT RUN founder-studio — the built studio has no Founder Edition page \(a private file\)\. Provision this checkout first: node scripts\/private\/founder-studio-assets\.mjs provision/m);
  assert.doesNotMatch(r.stdout, /\d+ passed/);
  const res = JSON.parse(fs.readFileSync(path.join(out, 'results.json'), 'utf8')); assert.equal(res.passed, 0); assert.equal(res.notRun, 'all');
});
