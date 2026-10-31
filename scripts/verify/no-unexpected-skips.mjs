#!/usr/bin/env node
// Release control: a green run must not be manufactured by skipping. Reads tests/evidence/TEST_RESULTS.json and fails when any suite is
// FAIL, or NOT_RUN without being on the short list of skips that are deliberate and slow (each with its reason). Used by CI after the
// test runner.   node scripts/verify/no-unexpected-skips.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ALLOWED = { 'media: full decode of every curated film': 'decodes ~47 minutes of video; run with --films before a media release' };
const r = JSON.parse(fs.readFileSync(path.join(root, 'tests/evidence/TEST_RESULTS.json'), 'utf8'));
const bad = r.suites.filter((s) => s.result === 'FAIL' || (s.result === 'NOT_RUN' && !ALLOWED[s.suite]));
for (const s of r.suites.filter((x) => x.result === 'NOT_RUN' && ALLOWED[x.suite])) console.log(`allowed skip: ${s.suite} — ${ALLOWED[s.suite]}`);
if (bad.length) { console.error('not releasable:\n' + bad.map((s) => `  ${s.result}  ${s.suite}${s.why ? ` — ${s.why}` : ''}`).join('\n')); process.exit(1); }
console.log(`releasable: ${r.pass} PASS, ${r.fail} FAIL, ${r.notRun} NOT_RUN (all allowed)`);
