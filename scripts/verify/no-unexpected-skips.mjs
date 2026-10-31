#!/usr/bin/env node
// Release-control gate: a green run must not be manufactured by skipping. Reads tests/evidence/TEST_RESULTS.json and fails when any
// suite FAILed, or was NOT_RUN without being named by the chosen release profile (each named skip carries its reason).
//   node scripts/verify/no-unexpected-skips.mjs [--profile=platform|media]
// Profiles (docs/releases/RELEASE_PROFILES.md):
//   platform  website, investor demo, Founder Studio, API and enterprise web — no film masters change; the full decode of every curated
//             film may be NOT_RUN (it needs the founder's film files and ~47 minutes of decoding).
//   media     a release that ships or changes films: nothing may be skipped; the full film decode must run and pass.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const profile = (process.argv.find((a) => a.startsWith('--profile=')) || '--profile=platform').slice(10);
const PROFILES = {
  platform: { 'media: full decode of every curated film': 'platform release ships no film; the decode needs the film masters (not in the repository) and ~47 minutes — required by the media profile' },
  media: {},
};
if (!PROFILES[profile]) { console.error(`unknown profile "${profile}" (platform | media)`); process.exit(2); }
const ALLOWED = PROFILES[profile];
const r = JSON.parse(fs.readFileSync(path.join(root, 'tests/evidence/TEST_RESULTS.json'), 'utf8'));
const bad = r.suites.filter((s) => s.result === 'FAIL' || (s.result === 'NOT_RUN' && !ALLOWED[s.suite]));
for (const s of r.suites.filter((x) => x.result === 'NOT_RUN' && ALLOWED[x.suite])) console.log(`allowed skip (${profile}): ${s.suite} — ${ALLOWED[s.suite]}`);
const report = { at: new Date().toISOString(), profile, pass: r.pass, fail: r.fail, notRun: r.notRun, blocking: bad.map((s) => ({ suite: s.suite, result: s.result, why: s.why || null })), releasable: bad.length === 0 };
fs.writeFileSync(path.join(root, 'tests/evidence/RELEASE_GATE.json'), JSON.stringify(report, null, 2) + '\n');
if (bad.length) { console.error(`NOT RELEASABLE (${profile}):\n` + bad.map((s) => `  ${s.result}  ${s.suite}${s.why ? ` — ${s.why}` : ''}`).join('\n')); process.exit(1); }
console.log(`RELEASABLE (${profile}): ${r.pass} PASS, ${r.fail} FAIL, ${r.notRun} NOT_RUN (all named by the profile)`);
