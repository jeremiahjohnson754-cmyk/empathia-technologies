// The public exposure audit (scripts/audit/public-exposure.mjs) finds what it says it finds: a scanner that only ever passes proves
// nothing. A temporary "public build" is planted with one example of each finding, and the audit must fail on each; a clean one passes.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tool = path.join(repo, 'scripts/audit/public-exposure.mjs');
const site = (files) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'empathia-px-website-')); for (const [f, body] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), body); } return d; };
const run = (d) => { const r = spawnSync(process.execPath, [tool, `--dist=${d}`], { encoding: 'utf8' }); return { code: r.status, fails: [...r.stdout.matchAll(/^FAIL (PX-\d\d)/gm)].map((m) => m[1]) }; };
const clean = { 'index.html': '<!doctype html><title>x</title><p>Contact us through the form.</p>', 'site.js': 'console.log(1)', 'robots.txt': 'User-agent: *' };

test('PX a clean build passes', () => { const r = run(site(clean)); assert.equal(r.code, 0); assert.deepEqual(r.fails, []); });

const planted = {
  'PX-01': { 'src/main.ts': 'export {}' },
  'PX-01b': { '.env': 'KEY=value' },
  'PX-02': { 'site.js': 'x()\n//# sourceMappingURL=site.js.map' },
  'PX-03': { 'site.js': 'const k = "AKIA' + 'ABCDEFGHIJKLMNOP";' },
  'PX-03b': { 'site.js': 'fetch("https://admin:hunter2pass@db.example.org")' },
  'PX-04': { 'index.html': '<p>Write to jane.doe@' + 'gmail.com</p>' },
  'PX-04b': { 'index.html': '<p>Call (312) 867-5309</p>' },
  'PX-05': { 'site.js': 'const p = "/home/claude/empathia-technologies/x"' },
  'PX-05b': { 'index.html': '<p>Server at 192.168.1.20</p>' },
  'PX-06': { 'index.html': '<img src="data:image/png;base64,' + 'A'.repeat(100 * 1024) + '">' },
  'PX-07': { 'index.html': '<p>From the ' + 'origins archive</p>' },
};
for (const [id, files] of Object.entries(planted)) {
  test(`${id} a planted finding is caught`, () => { const r = run(site({ ...clean, ...files })); assert.equal(r.code, 1, JSON.stringify(r)); assert.ok(r.fails.includes(id.slice(0, 5)), `${id}: ${JSON.stringify(r.fails)}`); });
}
test('PX the fiction range and example domains are not findings', () => { const r = run(site({ ...clean, 'index.html': '<p>(312) 555-0142 · ana@northstar.example · ops@campus.invalid</p>' })); assert.deepEqual(r.fails, []); });
