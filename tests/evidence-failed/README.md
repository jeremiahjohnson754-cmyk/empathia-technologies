# Failed runs of record

When a run of record (an exact-commit regression, or a run with `--record`) finishes with a failing suite, `scripts/test.mjs` copies
its `TEST_RESULTS.json` and `TEST_RESULTS.md` here, into a directory named `<commit>-<time>`. `tests/evidence` is overwritten by the
next run; these are not. A later pass does not remove them.

Every finished run of record, pass or fail, also gets one line in `tests/REGRESSION_LEDGER.jsonl`.

Nothing here is evidence of a pass. The lines in the ledger marked `backfilled` were written on 24 Nov 2026 from result files already
committed. The one failed run before this directory existed (b2428342, 24 Nov 2026) is here too: its result files had been set
aside outside the repository when it failed, and were copied in unchanged.
