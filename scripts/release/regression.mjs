#!/usr/bin/env node
/**
 * The full regression of one commit, run from the checkout it is in (normally a clean worktree of the commit to be staged).
 * Founder, 12 Nov 2026: "run the full regression suite against the final combined commit, not just the earlier build".
 * Founder, 17 Nov 2026: "Remove that recurring regression exception permanently."
 *
 *   node scripts/release/regression.mjs prepare                 build everything, then provision the Founder Studio from the private store and build it
 *   node scripts/release/regression.mjs base                    unit, integration, security and deploy suites (scripts/test.mjs)
 *   node scripts/release/regression.mjs browser --scheme=light|dark [--part=k/n] [suite …] [--restore-evidence]
 *   node scripts/release/regression.mjs report                  every browser suite in both schemes, base and prepare: exit 0 only if all of it passed
 *
 * There is no list of suites that are allowed to be missing. report takes the suites from tests/browser/ itself, so one that was
 * never run, or that said NOT RUN (exit 3: for the studio, a checkout without its private files), is counted as not passed and the
 * commit is reported NOT COMPLETE. Results are kept per commit under .local/regression/<commit>/ (ignored by git), so parts can run
 * as separate jobs; browser suites take the same lock as every other browser run on this machine.
 */
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d = '') => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const git = (...a) => spawnSync('git', ['-C', root, ...a], { encoding: 'utf8' }).stdout.trim();
const commit = git('rev-parse', '--short', 'HEAD');
// test by-products (screenshots, evidence) do not make the tree a different commit; anything else does, and is recorded
const dirty = git('status', '--porcelain', '--', '.', ':!tests/evidence', ':!media/screenshots').split('\n').filter(Boolean).length;
const out = path.resolve(arg('out', path.join(root, '.local/regression', commit)));
const node = process.execPath; const cmd = process.argv[2];
const save = (rel, v) => { const f = path.join(out, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, typeof v === 'string' ? v : JSON.stringify(v, null, 1) + '\n'); };
const load = (rel) => { const f = path.join(out, rel); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const allSuites = () => fs.readdirSync(path.join(root, 'tests/browser')).filter((f) => f.endsWith('.test.mjs')).map((f) => f.replace(/\.test\.mjs$/, '')).sort();
const step = (name, args, timeout) => { const t0 = Date.now(); const r = spawnSync(node, args, { cwd: root, encoding: 'utf8', maxBuffer: 256 << 20, timeout }); const text = `${r.stdout || ''}\n${r.stderr || ''}`; save(`${name}.log`, text); return { exit: r.status, seconds: Math.round((Date.now() - t0) / 1000), text }; };

if (cmd === 'prepare') {
  const b = step('build', [path.join(root, 'scripts/build.mjs')], 3600000);
  // the studio: built from this checkout's records and the private store. A store that is absent or altered is recorded, not hidden:
  // the studio suite then reports NOT RUN and the report says so
  const s = b.exit === 0 ? step('studio', [path.join(root, 'scripts/private/founder-studio-assets.mjs'), 'provision'], 900000) : { exit: null, seconds: 0, text: 'not attempted: the build failed' };
  const last = (t) => t.trim().split('\n').pop().slice(0, 400);
  save('prepare.json', { commit, dirty, at: new Date().toISOString(), build: { result: b.exit === 0 ? 'PASS' : 'FAIL', seconds: b.seconds }, studio: { result: s.exit === 0 ? 'PROVISIONED' : 'NOT_PROVISIONED', seconds: s.seconds, detail: last(s.text) } });
  console.log(`build ${b.exit === 0 ? 'PASS' : 'FAIL'} (${b.seconds} s); studio ${s.exit === 0 ? 'PROVISIONED' : 'NOT PROVISIONED'}: ${last(s.text)}`);
  process.exit(b.exit === 0 && s.exit === 0 ? 0 : 1);
} else if (cmd === 'base') {
  const r = step('base', [path.join(root, 'scripts/test.mjs'), '--record'], 7200000);
  const line = (/^PASS \d+ · FAIL \d+[^\n]*/m.exec(r.text) || [''])[0];
  const ok = r.exit === 0 && /FAIL 0\b/.test(line);
  save('base.json', { commit, dirty, at: new Date().toISOString(), result: ok ? 'PASS' : 'FAIL', exit: r.exit, line, seconds: r.seconds });
  console.log(`base ${ok ? 'PASS' : 'FAIL'}: ${line || `exit ${r.exit}`}`); process.exit(ok ? 0 : 1);
} else if (cmd === 'browser') {
  const scheme = arg('scheme'); if (!['light', 'dark'].includes(scheme)) { console.error('--scheme=light|dark is required'); process.exit(2); }
  const named = process.argv.slice(3).filter((a) => !a.startsWith('--')); const [k, n] = arg('part', '1/1').split('/').map(Number);
  const suites = named.length ? named : allSuites().filter((_, i) => i % n === k - 1);
  let bad = 0;
  for (const s of suites) {
    const t0 = Date.now();
    const r = spawnSync('flock', ['/tmp/empathia-test.lock', node, ...(scheme === 'dark' ? ['--import', './tests/browser/color-scheme.mjs'] : []), `tests/browser/${s}.test.mjs`], { cwd: root, encoding: 'utf8', maxBuffer: 256 << 20, timeout: 2700000, env: { ...process.env, ...(scheme === 'dark' ? { PW_COLOR_SCHEME: 'dark' } : {}) } });
    const text = `${r.stdout || ''}\n${r.stderr || ''}`; save(`browser/${scheme}/${s}.log`, text);
    const notRun = r.status === 3 ? /^NOT RUN [^\n]*/m.exec(text) : null;
    const result = r.status === 0 ? 'PASS' : notRun ? 'NOT_RUN' : 'FAIL';
    const line = notRun ? notRun[0] : (text.match(/\d+ passed, \d+ failed[^\n]*|\d+\/\d+ PASS[^\n]*|\d+ of \d+ passed[^\n]*/g) || []).pop() || (r.error ? String(r.error.message) : '');
    save(`browser/${scheme}/${s}.json`, { suite: s, scheme, commit, dirty, at: new Date().toISOString(), result, exit: r.status, line: line.slice(0, 300), seconds: Math.round((Date.now() - t0) / 1000) });
    if (result !== 'PASS') { bad += 1; console.log(`${result.padEnd(7)} ${s} (${scheme}) ${line.slice(0, 200)}`); }
  }
  if (process.argv.includes('--restore-evidence')) spawnSync('git', ['-C', root, 'checkout', '-q', '--', 'tests/evidence', 'media/screenshots']);
  console.log(`${scheme}${arg('part') ? ` part ${arg('part')}` : ''}: ${suites.length - bad} of ${suites.length} passed`); process.exit(bad ? 1 : 0);
} else if (cmd === 'report') {
  const prepare = load('prepare.json'); const base = load('base.json'); const rows = [];
  for (const scheme of ['light', 'dark']) for (const s of allSuites()) { const r = load(`browser/${scheme}/${s}.json`); rows.push(r && r.commit === commit ? r : { suite: s, scheme, result: 'NOT_RUN', line: 'never run for this commit' }); }
  const count = (res) => rows.filter((r) => r.result === res).length; const notPassed = rows.filter((r) => r.result !== 'PASS');
  const onDirty = [prepare, base, ...rows].filter((r) => r && r.dirty).length;
  const problems = [
    ...(!prepare ? ['prepare was not run'] : prepare.build.result !== 'PASS' ? ['the build failed'] : prepare.studio.result !== 'PROVISIONED' ? [`the Founder Studio was not provisioned: ${prepare.studio.detail}`] : []),
    ...(!base ? ['base (unit, integration, security, deploy) was not run'] : base.result !== 'PASS' ? [`base failed: ${base.line || `exit ${base.exit}`}`] : []),
    ...(count('FAIL') ? [`${count('FAIL')} browser suite runs failed`] : []), ...(count('NOT_RUN') ? [`${count('NOT_RUN')} browser suite runs were not run`] : []),
    ...(onDirty ? [`${onDirty} results were produced with uncommitted changes in the checkout`] : []),
  ];
  const report = { commit, at: new Date().toISOString(), complete: !problems.length, problems, prepare, base, browser: { suites: allSuites().length, light: { pass: rows.filter((r) => r.scheme === 'light' && r.result === 'PASS').length }, dark: { pass: rows.filter((r) => r.scheme === 'dark' && r.result === 'PASS').length }, fail: count('FAIL'), notRun: count('NOT_RUN') }, notPassed };
  save('REPORT.json', report);
  for (const r of notPassed.slice(0, 60)) console.log(`${r.result.padEnd(7)} ${r.suite} (${r.scheme}) ${r.line || ''}`);
  console.log(`${commit}: build ${prepare ? prepare.build.result : 'NOT_RUN'}; studio ${prepare ? prepare.studio.result : 'NOT_RUN'}; base ${base ? `${base.result} (${base.line})` : 'NOT_RUN'}; browser ${report.browser.light.pass}/${report.browser.suites} light, ${report.browser.dark.pass}/${report.browser.suites} dark, ${count('FAIL')} failed, ${count('NOT_RUN')} not run`);
  console.log(problems.length ? `NOT COMPLETE: ${problems.join('; ')}` : 'COMPLETE: every suite of this commit ran and passed, with no exception');
  process.exit(problems.length ? 1 : 0);
} else { console.error('usage: regression.mjs prepare | base | browser --scheme=light|dark [--part=k/n] [suite …] [--restore-evidence] | report   [--out=<dir>]'); process.exit(2); }
