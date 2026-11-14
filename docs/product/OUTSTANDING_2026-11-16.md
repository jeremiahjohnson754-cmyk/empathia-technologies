# Outstanding work at the pause (14 Nov 2026)

Pause: the founder returns on 16 Nov 2026. Everything below is committed on `v18/continuation`.

## The staging candidate

- **What is on staging.** `phase3/legendary-experience`, served by both `-next` sites, is still at `1d5dcfe`. The founder's rule of
  12 Nov holds: a commit is staged only after a full regression of that commit.
- **Candidate `59acf12`:** build ok; unit, integration and security tests PASS 115, FAIL 0; browser matrix light-00, light-01 and
  light-02 ok. Light-03 and dark-00…03 are **NOT RUN**, so the candidate is not staged.
- **Current head** (the register gate and refresh planning): unit, integration and security tests PASS 115, FAIL 0 on the gate change.
  The changed browser suites `demo.test` (110/0) and the e2e checkpoint (102/0) pass. The full browser matrix is **NOT RUN**.

## Built since the candidate

- **Device register gate before commissioning** (task #158). Built in the engine, the API and the demonstration, with tests.
  `REGISTERS.md` has the detail.
- **Lifecycle refresh planning in Pro** (task #159). Built at `#/pro/refresh`, with unit tests. `REFRESH_PLANNING.md` lists what is
  still to do.

## To do

- **Phase 1 installation documentation** (founder, 14 Nov, 06:25): how every device is mounted, and the Lite design used as a redlining
  document. Field changes are marked on the plan: a device moved during installation or commissioning because of a sprinkler or another
  site condition, with the reason, a photograph and who approved it. What each device is hooked up to is recorded, and so is whatever
  else a technician needs. Not started.
- **Regression.** Finish the full regression of the head commit (light and dark matrices), stage it, and verify both `-next` deploys.
- **Refresh planning.** The browser suite, and the export added to the format verification.
- **Earlier items:**
  - APEX by asset ID.
  - The Pro restyle to match V2.5.3.
  - The zipped evidence package.
  - Imports from other products (#144).
  - The university flagship (#142).
  - SIGNAL/Learn (#146).
  - Figma × Lite parity (#147).
  - Website screenshots (#137).
  - The Phase A state document (#141).
  - The films (they need the founder's re-upload).
