// The preflight's choice of suites and its verdicts (scripts/lib/impact.mjs, scripts/preflight.mjs; steps 2 and 3 of the engineering
// sequence, founder 25 Nov 2026 07:50 CT). Third version, the same day: a second independent review removed each rule of the selector in a
// scratch copy and found ten whose removal these checks did not notice. Each rule now has a check that fails without it; the comment on
// each assertion names the rule. Synthetic changes only: no history needed.
//   PRE-01  addresses: ':param', a part built at run time, and '*' match as they should, in any position
//   PRE-02  every page of the registry is read, with its code, the server pages too
//   PRE-03  every registered suite can be chosen
//   PRE-04  one page's code: its suites, the suites that open every route, in that order; not the matrix; not another app's '#/'
//   PRE-05  what everything shares: the shell's list, twelve pages or more, what the frame mounts, a page's import(), area and global CSS
//   PRE-06  tests and scripts: the suite itself, its libraries through other libraries, the runner's changed lines; an unused library and
//           any file it cannot place choose every suite; documents none; the server and the studio their own
//   PRE-07  the gate: a suite no regression runs and a missing cross-product suite are errors; a step that leaves a suite NOT RUN it may not,
//           or runs nothing, fails; the regression's own two NOT RUN pass; the preflight writes nothing of record and resumes only on proof
//   node --test tests/unit/preflight.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { matches, addressesIn, select, registered, gateErrors, judge, ACROSS, MAY_NOT_RUN } from '../../scripts/lib/impact.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const scratch = path.join(repo, '.local/preflight/tmp-unit');
const pick = async (changed, diffOf) => { const r = await select({ root: repo, changed, scratch, diffOf }); const names = r.chosen.map((c) => c.name); return { ...r, names, why: (n) => (r.chosen.find((c) => c.name === n)?.reasons || []).join(' | ') }; };

test('PRE-01 an address matches a route segment by segment', () => {
  const yes = [['/replay/:room', '/replay/R-ATL-4-218'], ['/here/:room', '/here/'], ['/lite/*', '/lite/room/R-1/devices'], ['/lite/*', '/lite'], ['/replay', '/replay?at=x'], ['/campus/:building/:floor/:room', '/campus///'], ['/campus/:building/:floor/:room', '/campus/ATL//R-1'], ['/v25/fi/scan/:room', '/v25//scan/R-1']];   // the last: a part built at run time where the route has a fixed word
  const no = [['/here', '/here/'], ['/replay/:room', '/replay'], ['/v25', '/v25/fi'], ['/v25/fi', '/v25/fi/scan/R-1'], ['/room/:room', '/rooms/R-1'], ['/campus/:building', '/campus///'], ['/v25/fi/scan/:room', '/v25/xx/scan/R-1']];
  for (const [r, a] of yes) assert.ok(matches(r, a), `${a} opens ${r}`); for (const [r, a] of no) assert.ok(!matches(r, a), `${a} does not open ${r}`);
  // a part built at run time is an open segment wherever it is, not the end of the address
  assert.deepEqual(addressesIn("goto(page, '#/replay/R-1'); `#/here/${id}`; `#/campus/${b}/${f}/${id}`; ['#/lite/room/X', \"#/search?q=a\"]").sort(), ['/campus///', '/here/', '/lite/room/X', '/replay/R-1', '/search'].sort());
});

test('PRE-02 every page of the registry is read, with its code', async () => {
  const r = await pick([]); assert.ok(r.pages.length >= 180, `${r.pages.length} pages`);
  assert.deepEqual(r.pages.filter((p) => !p.modules.length).map((p) => p.id), [], 'every page names the module it loads');
  for (const [id, re] of [['parity.intake', /decisions\/Decisions\.tsx$/], ['flagship.room', /pages\/Flagship\.tsx$/]]) { const p = r.pages.find((x) => x.id === id); assert.ok(p && p.modules.some((m) => re.test(m)), `${id}: ${p?.modules}`); }
  assert.ok(r.pages.some((p) => p.paths.some((x) => /^\/learn\//.test(x))), 'pages the registry generates from a list');
});

test('PRE-03 every registered suite can be chosen', async () => {
  const r = await pick([]); const byRoute = new Set(r.suites.filter((s) => s.everyRoute || r.pages.some((p) => p.paths.some((route) => s.addrs.some((a) => matches(route, a))))).map((s) => s.name));
  const byRule = /^(website|brand|tokens|founder-|enterprise-web|site-audit|verify-static|checkpoint-room-lifecycle)/;
  assert.deepEqual(r.suites.map((s) => s.name).filter((n) => !byRoute.has(n) && !byRule.test(n) && !(n in ACROSS)), [], 'no suite that nothing can choose');
  assert.deepEqual(r.suites.filter((s) => s.everyRoute).map((s) => s.name).sort(), ['demo-connected', 'demo-deadends', 'demo-route-sweep'], 'the suites that read every route from the registry, and no others');
});

test('PRE-04 one page’s code: its own suites first, the every-route walks after, not the matrix', async () => {
  const d = await pick(['apps/demo/src/drawing/DrawingPage.tsx']); assert.deepEqual(d.unplaced, []); assert.ok(d.chosen.length < 12, `${d.chosen.length} suites`);
  assert.match(d.why('demo-drawing'), /DrawingPage\.tsx → #\/drawings/, 'the page’s own suite, by its address');
  assert.match(d.why('demo-route-sweep'), /it opens every route/, 'the every-route rule');
  assert.ok(d.names.indexOf('demo-drawing') < d.names.indexOf('demo-deadends'), 'the page’s own suite runs before the half-hour crawl');
  const f = await pick(['apps/demo/src/fi/FiScan.tsx']); assert.match(f.why('demo-fi-scan'), /FiScan\.tsx → #\/v25\/fi\/scan\/:room/, 'the suite the regression on 52cdd952 failed');
  const fl = await pick(['apps/demo/src/pages/Flagship.tsx']); assert.ok(!/→ #/.test(fl.why('enterprise-web')), 'another app’s #/ addresses are not the demo’s');
});

test('PRE-05 what everything shares reaches the suites that walk across products', async () => {
  // the shell's list: useOps.ts is in it, reaches seven pages and is not mounted by the frame, so only that list makes it shared
  const sh = await pick(['apps/demo/src/hardening/useOps.ts']); assert.match(sh.why('demo-tours'), /useOps\.ts is shared \([1-9] pages/, 'the shell’s list');
  const many = await pick(['apps/demo/src/export/ExportMenu.tsx']); const n = Number((/ExportMenu\.tsx is shared \((\d+) pages/.exec(many.why('demo-tours')) || [])[1]); assert.ok(n >= 12, 'twelve pages or more');
  const fr = await pick(['apps/demo/src/tour/Tour.tsx']); assert.match(fr.why('demo-return-trail'), /Tour\.tsx is shared/, 'what the app frame mounts');
  const dyn = await pick(['apps/demo/src/export/render.ts']); assert.ok(dyn.chosen.some((c) => c.reasons.some((x) => /render\.ts → #/.test(x))) && dyn.chosen.length < dyn.suites.length, 'a module pages load with import() reaches their addresses');
  const css = await pick(['apps/demo/src/play/play.css']); assert.ok(css.chosen.some((c) => c.reasons.some((x) => /play\.css \(styles apps\/demo\/src\/play\/[\w.]+\) → #/.test(x))), 'area CSS reaches the pages of the modules beside it');
  assert.match(css.why('demo-phoneshell'), /play\.css is shared/, 'area CSS chooses the cross-product suites'); assert.ok(css.names.includes('site-audit'), 'and the site audit');
  const g = await pick(['apps/demo/src/styles/shell.css']); assert.equal(g.chosen.length, g.suites.length, 'global CSS chooses every suite');
});

test('PRE-06 tests and scripts are placed by what they run; what is not placed runs everything', async () => {
  const own = await pick(['tests/browser/demo-drawing.test.mjs']); assert.deepEqual(own.names, ['demo-drawing'], 'the suite itself');
  const h = await pick(['tests/browser/demo-ops-harness.mjs']); assert.match(h.why('demo-replay'), /its library tests\/browser\/demo-ops-harness\.mjs/, 'a library its suites import');
  const ev = await pick(['tests/lib/evidence.mjs']); assert.ok(ev.chosen.length > 60 && !ev.unplaced.length, `a library used through other libraries (${ev.chosen.length})`);
  const ih = await pick(['tests/integration/harness.mjs']); assert.ok(ih.names.includes('demo-flagship'), 'the integration harness the server suites use');
  const lone = await pick(['tests/lib/a-library-nothing-imports.mjs']); assert.equal(lone.chosen.length, lone.suites.length, 'a library no suite uses is not placed');
  const reg = await pick(['scripts/test.mjs'], () => "@@\n+suite('x', 'browser', node, ['tests/browser/demo-drawing.test.mjs'], custom);\n context names tests/browser/brand.test.mjs");
  assert.deepEqual(reg.names, ['demo-drawing'], 'the runner: the suites its changed lines name, not its context');
  const u = await pick(['somewhere/new-kind-of-file.txt']); assert.deepEqual(u.unplaced, ['somewhere/new-kind-of-file.txt']); assert.equal(u.chosen.length, u.suites.length);
  for (const f of ['apps/demo/build.mjs', 'docs/legacy-parity.csv', 'packages/domain-data/data/rooms.json']) { const r = await pick([f]); assert.equal(r.chosen.length, r.suites.length, `${f} reaches every page`); }
  assert.equal((await pick(['docs/BUILD_STATUS.md', 'tests/unit/preflight.test.mjs', 'tests/REGRESSION_LEDGER.jsonl'])).chosen.length, 0, 'documents and non-browser tests: none');
  const s = await pick(['services/enterprise-api/src/app.ts']); for (const n of ['demo-flagship', 'demo-connected', 'enterprise-web', 'checkpoint-room-lifecycle']) assert.ok(s.names.includes(n), `the server: ${n}`);
  assert.ok((await pick(['apps/founder-studio/src/main.tsx'])).names.includes('founder-studio'));
  const w = await pick(['apps/website/src/pages/home.ts']); assert.ok(w.names.includes('site-audit') && w.names.some((n) => /^website/.test(n)));
});

test('PRE-07 the gate, the verdicts, and what the preflight may do', () => {
  assert.deepEqual(gateErrors(repo), [], 'every browser and end-to-end suite here is run by the regression');
  const fake = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-gate-')); for (const d of ['scripts', 'tests/browser', 'tests/e2e']) fs.mkdirSync(path.join(fake, d), { recursive: true });
  fs.writeFileSync(path.join(fake, 'scripts/test.mjs'), "suite('a', 'browser', node, ['tests/browser/registered.test.mjs']);"); for (const f of ['tests/browser/registered.test.mjs', 'tests/browser/forgotten.test.mjs', 'tests/e2e/forgotten.e2e.mjs']) fs.writeFileSync(path.join(fake, f), '');
  assert.deepEqual(registered(fake).unregistered, ['tests/browser/forgotten.test.mjs', 'tests/e2e/forgotten.e2e.mjs']); assert.ok(gateErrors(fake).some((e) => /never runs/.test(e)) && gateErrors(fake).some((e) => /cross-product suite demo-route-sweep/.test(e)));
  fs.rmSync(fake, { recursive: true, force: true });
  // the regression's own two NOT RUN, by their real wording, and nothing else
  const last = JSON.parse(fs.readFileSync(path.join(repo, 'tests/evidence/TEST_RESULTS.json'), 'utf8')).suites.filter((x) => x.result === 'NOT_RUN').map((x) => `NOT_RUN  ${x.suite} — ${x.why}`);
  assert.ok(last.length >= 1 && last.every((l) => MAY_NOT_RUN.test(l)), last.join(' | '));
  assert.equal(judge(`${last.join('\n')}\nNOT_RUN  browser: x — pass --browser\nPASS 164 · FAIL 0 · NOT_RUN 3`, 0).ok, true);
  assert.equal(judge('NOT_RUN  security: incidents — no local database\nPASS 120 · FAIL 0 · NOT_RUN 1', 0).why, 'a suite was left NOT RUN that may not be');
  assert.equal(judge('PASS 0 · FAIL 0 · NOT_RUN 0', 0, { mustRun: true }).why, 'nothing ran'); assert.equal(judge('PASS 1 · FAIL 0 · NOT_RUN 0', 0, { mustRun: true }).ok, true); assert.equal(judge('PASS 3 · FAIL 1', 1).ok, false);
  const s = fs.readFileSync(path.join(repo, 'scripts/preflight.mjs'), 'utf8').replace(/^\s*(\/\/|\*).*$/gm, '');
  const mentions = [...s.matchAll(/[^\n]*tests\/evidence[^\n]*/g)].map((m) => m[0]); assert.ok(mentions.length === 1 && /readFileSync\(path\.join\(root, 'tests\/evidence\/TEST_RESULTS\.json'\)/.test(mentions[0]), 'it only reads the last results, for timings');
  assert.deepEqual([...s.matchAll(/writeFileSync\(([^,]+),/g)].map((m) => m[1].trim()).sort(), ['file', 'statePath'], 'it writes its report and its proof, under .local/preflight');
  assert.match(s, /delete env\.CI; delete env\.EMPATHIA_EVIDENCE;/, 'never a run of record, even under CI');
  assert.match(s, /'scripts\/build\.mjs', '--studio'/, 'step 2 builds the Founder Studio too: its suites must not test an old bundle');
  assert.match(s, /--files=\$\{c\.file\}`\], 3600000, true\)/, 'step 3 runs each suite by the regression’s runner, and a suite that runs nothing fails');
  for (const why of ['st.commit !== commit', 'st.tree !== treeHash', 'st.base !== base', 'st.list !== listKey', '!st.step2', 'st.built !== demoBuilt()', '!st.passed.includes(f)']) assert.ok(s.includes(why), `--from refuses without that proof: ${why}`);
  assert.match(s, /scripts\\\/release\\\/regression\\\.mjs/, 'it does not run beside either regression runner');
});
