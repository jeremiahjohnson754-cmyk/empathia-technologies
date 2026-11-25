// The preflight's choice of suites (scripts/lib/impact.mjs; steps 2 and 3 of the engineering sequence, founder 25 Nov 2026 07:50 CT).
// Rewritten the same day after an independent review: the first version tested past diffs against today's code, was skipped in a
// one-commit checkout, and would have passed with the selector broken in each of the seven ways the review found. These checks use
// synthetic changes, need no history, and each one fails if its rule is taken out.
//   PRE-01  addresses: a ':param' or a run-time segment matches one segment, '*' the rest, nothing else
//   PRE-02  every page of the registry is read, with its code, the server pages too (they exist only in a build with an API; the first
//           rewrite left them out and called the flagship page's file one it could not place)
//   PRE-03  every registered suite can be chosen: by a page it opens, or by the rules for the website, the server, the studio
//   PRE-04  a change to one page's code chooses that page's suites and not the matrix (DrawingPage → demo-drawing; Dispatch → demo-dispatch)
//   PRE-05  what the frame mounts (the tour), a page's import() (export rendering), area CSS and global CSS reach the cross-product suites
//   PRE-06  a file it cannot place chooses every suite; a document chooses none; the server and the studio choose their own suites
//   PRE-07  every browser suite is run by the regression (demo-deadends was not, until this check), and the preflight writes nothing of record
//   node --test tests/unit/preflight.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { matches, addressesIn, select, registered, ACROSS, MAY_NOT_RUN } from '../../scripts/lib/impact.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const scratch = path.join(repo, '.local/preflight/tmp-unit');
const pick = async (...changed) => { const r = await select({ root: repo, changed, scratch }); return { ...r, names: r.chosen.map((c) => c.name) }; };

test('PRE-01 an address matches a route segment by segment', () => {
  const yes = [['/replay/:room', '/replay/R-ATL-4-218'], ['/here/:room', '/here/'], ['/lite/*', '/lite/room/R-1/devices'], ['/lite/*', '/lite'], ['/v25/fi/scan/:room', '/v25/fi/scan/R-NONE'], ['/replay', '/replay?at=x']];
  const no = [['/here', '/here/'], ['/replay/:room', '/replay'], ['/v25', '/v25/fi'], ['/v25/fi', '/v25/fi/scan/R-1'], ['/room/:room', '/rooms/R-1']];
  for (const [r, a] of yes) assert.ok(matches(r, a), `${a} opens ${r}`); for (const [r, a] of no) assert.ok(!matches(r, a), `${a} does not open ${r}`);
  assert.deepEqual(addressesIn("goto(page, '#/replay/R-1'); `#/here/${id}`; ['#/lite/room/X', \"#/search?q=a\"]").sort(), ['/here/', '/lite/room/X', '/replay/R-1', '/search'].sort());
});

test('PRE-02 every page of the registry is read, with its code', async () => {
  const r = await pick(); assert.ok(r.pages.length >= 170, `${r.pages.length} pages`);
  const none = r.pages.filter((p) => !p.modules.length).map((p) => p.id); assert.deepEqual(none, [], 'every page names the module it loads');
  for (const [id, re] of [['parity.intake', /decisions\/Decisions\.tsx$/], ['policy', /pages\/Control\.tsx$/], ['flagship.room', /pages\/Flagship\.tsx$/]]) { const p = r.pages.find((x) => x.id === id); assert.ok(p && p.modules.some((m) => re.test(m)), `${id}: ${p?.modules}`); }
  assert.ok(r.pages.some((p) => p.paths.some((x) => /^\/learn\//.test(x))), 'pages the registry generates from a list are there too');
});

test('PRE-03 every registered suite can be chosen', async () => {
  const r = await pick(); const byRoute = new Set(r.suites.filter((s) => s.everyRoute || r.pages.some((p) => p.paths.some((route) => s.addrs.some((a) => matches(route, a))))).map((s) => s.name));
  const byRule = /^(website|brand|tokens|founder-|enterprise-web|site-audit|verify-static)/;
  const orphans = r.suites.map((s) => s.name).filter((n) => !byRoute.has(n) && !byRule.test(n) && !(n in ACROSS)); assert.deepEqual(orphans, [], 'no suite that nothing can choose');
});

test('PRE-04 a change to one page chooses that page’s suites, not the matrix', async () => {
  const d = await pick('apps/demo/src/drawing/DrawingPage.tsx'); assert.ok(d.names.includes('demo-drawing'), d.names.join(' ')); assert.ok(d.chosen.length < 20, `${d.chosen.length} suites`); assert.deepEqual(d.unplaced, []);
  const x = await pick('apps/demo/src/dispatch/Dispatch.tsx'); assert.ok(x.names.includes('demo-dispatch'), x.names.join(' '));
  const f = await pick('apps/demo/src/fi/FiScan.tsx'); assert.ok(f.names.includes('demo-fi-scan'), 'the suite the regression on 52cdd952 failed');
  assert.match(f.chosen.find((c) => c.name === 'demo-fi-scan').reasons.join(' '), /FiScan\.tsx → #\/v25\/fi\/scan\/:room/, 'and why');
});

test('PRE-05 what everything shares reaches the suites that walk across products', async () => {
  for (const [f, why] of [['apps/demo/src/tour/Tour.tsx', 'mounted by the app frame'], ['apps/demo/src/shell/trail.tsx', 'the shell'], ['apps/demo/src/play/play.css', 'area CSS']]) {
    const r = await pick(f); for (const n of ['demo-route-sweep', 'demo-return-trail', 'demo-phoneshell']) assert.ok(r.names.includes(n), `${f} (${why}) chooses ${n}`); }
  const e = await pick('apps/demo/src/export/render.ts'); assert.ok(e.chosen.length > 5, 'a module pages load with import() reaches them');
  const g = await pick('apps/demo/src/styles/shell.css'); assert.equal(g.chosen.length, g.suites.length, 'global CSS chooses every suite');
});

test('PRE-06 placed or every suite; documents nothing; the server and the studio their own', async () => {
  const u = await pick('somewhere/new-kind-of-file.txt'); assert.deepEqual(u.unplaced, ['somewhere/new-kind-of-file.txt']); assert.equal(u.chosen.length, u.suites.length);
  for (const f of ['apps/demo/build.mjs', 'docs/legacy-parity.csv', 'packages/domain-data/data/rooms.json']) { const r = await pick(f); assert.equal(r.chosen.length, r.suites.length, `${f} reaches every page`); }
  assert.equal((await pick('docs/BUILD_STATUS.md', 'tests/unit/preflight.test.mjs', 'tests/REGRESSION_LEDGER.jsonl')).chosen.length, 0);
  const s = await pick('services/enterprise-api/src/app.ts'); for (const n of ['demo-flagship', 'demo-connected', 'enterprise-web']) assert.ok(s.names.includes(n), `the server: ${n}`);
  const fs2 = await pick('apps/founder-studio/src/main.tsx'); assert.ok(fs2.names.includes('founder-studio'));
  const w = await pick('apps/website/src/pages/home.ts'); assert.ok(w.names.includes('site-audit') && w.names.some((n) => /^website/.test(n)));
});

test('PRE-07 every browser suite is run by the regression; the preflight writes nothing of record', () => {
  // the two NOT RUN the regression itself has on the workstation are allowed by their real wording, and nothing else is
  const last = JSON.parse(fs.readFileSync(path.join(repo, 'tests/evidence/TEST_RESULTS.json'), 'utf8')).suites.filter((x) => x.result === 'NOT_RUN').map((x) => `NOT_RUN  ${x.suite} — ${x.why}`);
  assert.ok(last.length >= 1 && last.every((l) => MAY_NOT_RUN.test(l)), `the regression's own NOT RUN lines are allowed: ${last.filter((l) => !MAY_NOT_RUN.test(l)).join(' | ')}`);
  for (const bad of ['NOT_RUN  security: incidents.test.mjs — no local database', 'NOT_RUN  unit: something new — dataset not generated']) assert.ok(!MAY_NOT_RUN.test(bad), `${bad} is refused`);
  assert.deepEqual(registered(repo).unregistered, [], 'a suite no regression runs is a gap in the gate');
  const s = fs.readFileSync(path.join(repo, 'scripts/preflight.mjs'), 'utf8').replace(/^\s*(\/\/|\*).*$/gm, '');
  const mentions = [...s.matchAll(/[^\n]*tests\/evidence[^\n]*/g)].map((m) => m[0]); assert.ok(mentions.length === 1 && /readFileSync\(path\.join\(root, 'tests\/evidence\/TEST_RESULTS\.json'\)/.test(mentions[0]), 'it only reads the last results, for timings');
  assert.deepEqual([...s.matchAll(/writeFileSync\(([^,]+),/g)].map((m) => m[1].trim()), ['file'], 'it writes one file: its report, under .local/preflight');
  assert.match(s, /delete env\.CI; delete env\.EMPATHIA_EVIDENCE;/, 'never a run of record, even under CI'); assert.match(s, /EMPATHIA_EVIDENCE_DIR: path\.join\(out/, 'every suite writes to scratch');
  assert.match(s, /--files=\$\{c\.file\}/, 'step 3 runs each suite by the regression’s own runner'); assert.match(s, /--\(part\|merge\)=/, 'and refuses to start beside a regression');
});
