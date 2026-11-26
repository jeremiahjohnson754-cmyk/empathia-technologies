# 60393384, stopped after part 1 failed (26 Nov 2026)

The exact-commit regression on `60393384` ran parts 1 to 3 of 5. Part 1 failed (PASS 60 · FAIL 1 · NOT_RUN 1); parts 2 and 3 passed
(62 and 61, nothing failed or not run). Parts 4 and 5 were not run: a failed part means the run cannot pass, and the cause was fixed and
the regression started again on a new commit instead. Without five parts there was no merge, so this run has no `TEST_RESULTS` files and
no ledger line (the ledger records finished runs). Nothing here is evidence of a pass.

- The failure: `browser: demo-phoneshell` 48/49, check P-768-08, `Lite (current) {"refused":0,"text":15,"menu":0}`. Tapping Lite opens
  #/campus, a page loaded on demand; 350 ms after the tap the page still showed the router's loading state, "Loading Campus…" (15
  characters). Run alone, the suite passed 49/49 three times. The test now waits up to 5 s for the loading state to give way, and
  counts a page still loading after that as missed (see the commit that changes `tests/browser/demo-phoneshell.test.mjs`).
- The NOT_RUN in part 1 is the Python research prototype (no generated dataset), not run in every run of record since it was added.
- `logs/`: the three part logs. `evidence/`: the suite result files this run wrote into `tests/evidence`, set aside here before
  `tests/evidence` was restored to the last pass (`1fa2a07e`).
