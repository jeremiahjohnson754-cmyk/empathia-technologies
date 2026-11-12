# Test results

| Date | Commit | Command | Exit | Notes |
|---|---|---|---|---|
| 12 Nov 2026 | `9db85b6` | `.local/run-matrix.sh .local/matrix-9db85b6 light` (59 browser suites) | one failure | demo D-04 (the Lite studio had no `data-native`; fixed `af32ce9`); `founder-studio` NOT RUN in a public build |
| 12 Nov 2026 | `6c8932a` | `.local/run-matrix.sh .local/matrix-6c8932a light` (59 suites, about 75 minutes) | 57 exit 0; two not | demo B-03c failed because the check expected metres where the room had been created in feet (the check was corrected in `b53515e`, the product was right); `founder-studio` NOT RUN in a public build |
| 12 Nov 2026 | `b53515e` | unit: `node --test tests/unit/*.test.mjs` | 0 | 680 pass |
