# Test results

| Date | Commit | Command | Exit | Notes |
|---|---|---|---|---|
| 12 Nov 2026 | `9db85b6` | `.local/run-matrix.sh .local/matrix-9db85b6 light` (59 browser suites) | one failure | demo D-04 (the Lite studio had no `data-native`; fixed `af32ce9`); `founder-studio` NOT RUN in a public build |
| 12 Nov 2026 | `6c8932a` | `.local/run-matrix.sh .local/matrix-6c8932a light` (59 suites, about 75 minutes) | 57 exit 0; two not | demo B-03c failed because the check expected metres where the room had been created in feet (the check was corrected in `b53515e`, the product was right); `founder-studio` NOT RUN in a public build |
| 12 Nov 2026 | `b53515e` | unit: `node --test tests/unit/*.test.mjs` | 0 | 680 pass |
| 12 Nov 2026 | `b53515e` | `.local/run-matrix.sh .local/matrix-b53515e light` (59 suites) | 58 exit 0 | no FAIL line in any log; 2,562 checks counted where a suite prints a count; `founder-studio` NOT RUN in a public build |
| 12 Nov 2026 | `b53515e` | `.local/run-matrix.sh .local/matrix-b53515e dark` (59 suites, the b53515e test files) | 58 exit 0 | no FAIL line; 2,572 checks counted; `founder-studio` NOT RUN. b53515e pushed to `phase3/legendary-experience` (staging) after both schemes |
| 12 Nov 2026 | `803bd89` | `.local/run-matrix.sh .local/matrix-803bd89 light demo-drawing demo-lite demo-journey demo-access demo demo-parity-areas` | 5 of 6 exit 0 | demo-drawing DRB-50: the check was wrong (closed `<details>`, hidden chip mark); corrected in `5267c81`, 24/24 light and dark |
| 12 Nov 2026 | staging `b53515e` | Render deploy list; TinyFish fetch and one browser run (founder's permission) | live | both static sites live; website home served in full; demo `#/investor` renders in a real browser with the synthetic banner |
| 12 Nov 2026 | `25662c0` | full matrix, light then dark, on one build (the release candidate) | 58 of 59 exit 0 in each | no FAIL line in either; 2,575 checks counted in each; `founder-studio` NOT RUN (acceptance A4); `scripts/test.mjs` PASS 101 FAIL 0; unit 686/686. Pushed to staging |
| 12 Nov 2026 | `7a64c75` | full matrix, light | 59 of 59 exit 0 | no FAIL line; `founder-studio` ran against the private V2.5.3 build present on this machine (A4) and passed |
| 12 Nov 2026 | `9a29466` | `demo-lesson` light and dark; `scripts/test.mjs` security; unit | 10/10 each; 10/10; 693/693 | the release candidate's full light matrix started |
| 12 Nov 2026 | `14c35ca` | full matrix light and dark | 60 of 60 exit 0 each | founder-studio against the private V2.5.3 build; pushed to staging; A3 run 2 on staging: closed, same room, no error |
