# 495f485e, failed in part 4 (28 Nov 2026)

The exact-commit regression on `495f485e` (the device standards and firmware posture, PRO-EN-01 and PRO-AS-03) ran all five parts and
merged: PASS 318 · FAIL 1 · NOT_RUN 2. Parts 1, 2, 3 and 5 passed; part 4 failed. The ledger line for this run stays in
`tests/REGRESSION_LEDGER.jsonl`. Nothing here is evidence of a pass, and `495f485e` was not staged.

- The failure: `browser: demo-core` 374/375, check MC-fw-01. After a version was written to the device register and the page reloaded,
  the check read Asset Intelligence's firmware tiles 1.8 s after opening it; under the regression's load the page had not drawn them yet
  ("on" and "behind" read null). The suite took 699 s in the regression against 279 s in the preflight on the same commit, where it
  passed. Every other reading in the check was as expected (899 on, 97 behind, 272 not validated, 242 without firmware, 1 without a
  standard, 1,511 in service; 97 in the "behind" set).
- The fix waits up to 8 s for the element each of the new readers reads (the standards table, the firmware tiles, the unit page's
  installed version, a set's count), as the other tile reader in the same file does. Every condition is unchanged. See the commit that
  changes `tests/browser/demo-core.test.mjs` after this one.
- The two NOT_RUN are the Python research prototype (no generated dataset) and the curated films' full decode (needs `--films`), not run
  in every run of record.
- `TEST_RESULTS.*`: the merged result. `evidence/`: the suite result files this run wrote into `tests/evidence`, set aside here before
  `tests/evidence` was restored to the last pass on this branch.
