# Test results

| Date | Commit | Command | Exit | Notes |
|---|---|---|---|---|
| 12 Nov 2026 | `9db85b6` | `.local/run-matrix.sh .local/matrix-9db85b6 light` (59 browser suites) | one failure | demo D-04 (the Lite studio had no `data-native`; fixed `af32ce9`); `founder-studio` NOT RUN in a public build |
| 12 Nov 2026 | `6c8932a` | `.local/run-matrix.sh .local/matrix-6c8932a light` (59 suites, about 75 minutes) | 57 exit 0; two not | demo B-03c failed because the check expected metres where the room had been created in feet (the check was corrected in `b53515e`, the product was right); `founder-studio` NOT RUN in a public build |
| 12 Nov 2026 | `b53515e` | unit: `node --test tests/unit/*.test.mjs` | 0 | 680 pass |
| 12 Nov 2026 | `b53515e` | `.local/run-matrix.sh .local/matrix-b53515e light` (59 suites) | 58 exit 0 | no FAIL line in any log; 2,562 checks counted where a suite prints a count; `founder-studio` NOT RUN in a public build |
| 12 Nov 2026 | `b53515e` | `.local/run-matrix.sh .local/matrix-b53515e dark` (59 suites, the b53515e test files) | 58 exit 0 | no FAIL line; 2,572 checks counted; `founder-studio` NOT RUN. b53515e pushed to `phase3/legendary-experience` (staging) after both schemes |
