#!/usr/bin/env node
// Release control: a green run must not be manufactured by skipping. Reads tests/evidence/TEST_RESULTS.json and fails when any suite is
// FAIL, or NOT_RUN without being on the short list of skips that are deliberate (each with its reason). Used by CI after the test runner.
//   node scripts/verify/no-unexpected-skips.mjs [--profile=platform|media] [--private-store=absent] [--root=<checkout>]
//
// The Founder Studio (founder decision E3-D5, 23 Nov 2026). The studio is private: its Founder Edition and films live in a private
// store that is never in this repository and never on a public runner, so a public runner cannot build it or run its three suites.
// A runner that has no store says so with --private-store=absent, and then, and only then, those three suites may be NOT RUN. They are
// named here, reported as NOT RUN, and never counted as passed; the local exact-commit regression, where the store is, runs them.
// The flag is refused where it would hide something: in a checkout where the studio is built (its suites must run there) and for a
// media release. It excuses no other suite.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const root = path.resolve(arg('root', path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')));
const profile = arg('profile', 'platform'); const store = arg('private-store', '');
const stop = (msg) => { console.error(`not releasable: ${msg}`); process.exit(1); };
if (!['platform', 'media'].includes(profile)) stop(`unknown profile "${profile}" (platform or media)`);
if (store && store !== 'absent') stop(`--private-store takes one value, "absent" (got "${store}")`);

const ALLOWED = { 'media: full decode of every curated film': 'decodes ~47 minutes of video; run with --films before a media release' };
const STUDIO_SUITES = ['browser: Founder Studio', 'e2e: founder town hall (Founder Edition)', 'e2e: founder decisions (hosted studio over the API)'];
if (store === 'absent') {
  if (profile === 'media') stop('a media release is made where the private store is; --private-store=absent is refused with --profile=media');
  if (fs.existsSync(path.join(root, 'apps/founder-studio/dist/index.html'))) stop('the Founder Studio is built in this checkout, so its suites must run here; --private-store=absent is refused');
  for (const s of STUDIO_SUITES) ALLOWED[s] = 'the Founder Studio’s private store is never on a public runner; run by the local exact-commit regression, where the store is';
}
const r = JSON.parse(fs.readFileSync(path.join(root, 'tests/evidence/TEST_RESULTS.json'), 'utf8'));
const bad = r.suites.filter((s) => s.result === 'FAIL' || (s.result === 'NOT_RUN' && !ALLOWED[s.suite]));
for (const s of r.suites.filter((x) => x.result === 'NOT_RUN' && ALLOWED[x.suite])) console.log(`allowed skip: ${s.suite} — ${ALLOWED[s.suite]}`);
if (bad.length) { console.error('not releasable:\n' + bad.map((s) => `  ${s.result}  ${s.suite}${s.why ? ` — ${s.why}` : ''}`).join('\n')); process.exit(1); }
const studioSkipped = r.suites.filter((s) => s.result === 'NOT_RUN' && STUDIO_SUITES.includes(s.suite)).length;
console.log(`releasable: ${r.pass} PASS, ${r.fail} FAIL, ${r.notRun} NOT_RUN (all allowed)`);
if (studioSkipped) console.log(`this result does not cover the Founder Studio: ${studioSkipped} of its suites were NOT RUN here (no private store on this runner)`);
