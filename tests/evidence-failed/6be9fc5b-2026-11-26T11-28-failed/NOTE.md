# 6be9fc5b, failed in part 1 (26 Nov 2026)

The exact-commit regression on `6be9fc5b` (the founder photograph with the crop he approved and its colours converted, and the record of
his 26 Nov decisions) built at 11:04 UTC, then ran part 1 of 5, which ended at 11:28:50 UTC: PASS 60 · FAIL 1 · NOT_RUN 1. Parts 2 to 5
were not run: a failed part means the run cannot pass, so the cause was corrected and a new regression is to be run on the corrected
commit. Without five parts there was no merge, so this run has no merged `TEST_RESULTS.json`/`.md` and no ledger line (the ledger records
finished runs); its part-1 file is kept in `evidence/`. Nothing here is evidence of a pass.

- The failure: `browser: demo-expo-live` 15/16, check XPO-13 (the hall left to adapt its detail):
  `{"held":3,"pinned":{"cssW":748,"cssH":666,"w":748,"dpr":1,"detail":100,"fps":15,"wide":0},"auto":{"cssW":748,"cssH":666,"w":479,"dpr":1,"detail":80,"fps":25,"wide":0}}`.
  The page's `data-detail` said 80 while the canvas was drawn at 479 of 748 pixels, that is 64 %. The renderer changes its detail at
  the end of its own one-second measurement and resizes the canvas in that frame; the page copied the detail into `data-detail` only
  once a second on a separate clock, so what the page reported could be up to a second behind what it drew. Here the hall ran at
  about 25 frames a second at 80 %, at the edge of the 24 it holds itself to, and the governor stepped down to 64 % after the page's
  last report (from full detail at 15.4 frames a second or more the first step lands on 80 %; one slower second at 80 % lands on 64 %, as in
  earlier passing runs). The photograph change does not touch this code; the once-a-second report dates from `87956a57`, and the race
  showed because the pace sat at the threshold.
- The correction is in the product, not the test: Expo LIVE, Stadium LIVE and Campus Life set their reported detail in the frame it
  changes and write it to the page synchronously in that frame (see the commit after `03c33d13`). Every condition of XPO-13, SLV-15,
  CL-21 and CL-22 is unchanged. An independent review approved `03c33d13` and then `bf0eebd8`, each with nits;
  all of them are applied in the commit after `bf0eebd8`.
- The NOT_RUN in part 1 is the Python research prototype (no generated dataset), not run in every run of record since it was added.
- `logs/`: the build log and the part 1 log (committed with `git add -f`; `*.log` is otherwise ignored). `evidence/`: the tracked
  result files this run changed in `tests/evidence`, plus three git-ignored ones copied before the next run overwrites them:
  `TEST_RESULTS.part-1-of-5.json`, `performance/expo.json` (XPO-10 at 15 fps and 100 %, XPO-13 at 25 fps and 80 %) and
  `demo-shell/demo-expo-live-default.json` (the failing suite's sixteen check results). The roughly hundred other ignored files part 1
  wrote are not kept; `tests/evidence` was restored to the last pass (`6e0d7877`).
