// Where a test writes its evidence (founder directive, 24 Nov 2026: "A standalone test must not overwrite the authoritative evidence
// from a completed exact-commit regression").
//
// tests/evidence is the evidence of record: what the last exact-commit regression (or a CI run) produced, committed with the commit it
// describes. Before this file, every suite wrote there whenever it ran, so running one suite by hand while working changed the record
// of a run it was not part of, and the changed files had to be restored by hand before every commit.
//
//   a run of record        scripts/test.mjs with --part, --merge or --record, or any run under CI   → tests/evidence
//   scripts/test.mjs alone a working run of the non-browser suites                                → .local/evidence/run-<time>
//   one suite run by hand  node tests/browser/<suite>.test.mjs                                    → .local/evidence/standalone
//
// .local is not in the repository. A suite that is given its output directory as an argument still uses that directory.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/** true only for a run whose results are the record: the test runner says so, or the run is in CI */
export const ofRecord = (env = process.env) => env.EMPATHIA_EVIDENCE === 'record' || (env.CI === 'true' && env.EMPATHIA_EVIDENCE !== 'scratch');
/** the directory evidence goes to for this process */
export function evidenceRoot(env = process.env) {
  if (ofRecord(env)) return path.join(repo, 'tests/evidence');
  if (env.EMPATHIA_EVIDENCE_DIR) return path.resolve(repo, env.EMPATHIA_EVIDENCE_DIR);
  return path.join(repo, '.local/evidence/standalone');
}
/** a path under it */
export const evidencePath = (...parts) => path.join(evidenceRoot(), ...parts);
