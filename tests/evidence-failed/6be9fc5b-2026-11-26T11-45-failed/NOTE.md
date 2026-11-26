# 6be9fc5b, failed in part 1 (26 Nov 2026)

The exact-commit regression on `6be9fc5b` (the founder photograph with the crop he approved and its colours converted, and the record of
his 26 Nov decisions) built, then ran part 1 of 5: PASS 60 · FAIL 1 · NOT_RUN 1. Parts 2 to 5 were not run: a failed part means the run
cannot pass, and the cause was corrected and the regression started again on a new commit. Without five parts there was no merge, so
this run has no `TEST_RESULTS` files and no ledger line (the ledger records finished runs). Nothing here is evidence of a pass.

- The failure: `browser: demo-expo-live` 15/16, check XPO-13 (the hall left to adapt its detail):
  `{"held":3,"pinned":{...,"w":748,"detail":100,"fps":15},"auto":{"cssW":748,"w":479,"detail":80,"fps":25}}`. The page's `data-detail`
  said 80 while the canvas was drawn at 479 of 748 pixels, that is 64 %. The renderer changes its detail at the end of its own one-second
  measurement and resizes the canvas in that frame; the page copied the detail into `data-detail` only once a second on a separate clock,
  so what the page reported could be up to a second behind what it drew. Here the hall ran at about 25 frames a second at 80 %, at the
  edge of the 24 it holds itself to, and the governor stepped down to 64 % after the page's last report. The photograph change does not
  touch this code; the race is older and showed because the pace sat at the threshold.
- The correction is in the product, not the test: Expo LIVE and Stadium LIVE now report their detail in the frame it changes (the frame
  rate stays a once-a-second figure). Every condition of XPO-13 and SLV-15 is unchanged.
- The NOT_RUN in part 1 is the Python research prototype (no generated dataset), not run in every run of record since it was added.
- `logs/`: the build log and the part 1 log. `evidence/`: the result files this run wrote into `tests/evidence`, set aside here before
  `tests/evidence` was restored to the last pass (`6e0d7877`).
