# Outstanding work at the pause (14 Nov 2026)

Pause: the founder returns on 16 Nov 2026. Everything below is committed on `v18/continuation`.

## Staging (14 Nov 2026, 09:14 CT)

Both `-next` sites serve **`7b212a4`**. Render reports the `empathia-demo-next` and `empathia-website-next` deploys `live` on that
commit. Its regression ran on 553ff0a and then on 7b212a4. The two commits differ only in the generated API schemas and the website's
product screenshots.

- **Build, and the unit, integration and security tests** (7b212a4): build ok; PASS 116, FAIL 0.
- **Browser, light** (553ff0a): all four batches pass, with two exceptions:
  - `demo-room-jumps` timed out once under load. Rerun on its own on 7b212a4: 11/0.
  - `founder-studio` fails in the regression worktree, which lacks local, engineer-private assets. Rerun in the main tree on 7b212a4:
    19/0.
- **Browser, light, the website suites** (rerun on 7b212a4): website 250/0, fold 37/0, pilot 54/0, brand ok.
- **Browser, dark** (7b212a4): all four batches pass, except `founder-studio` in the worktree (same reason). Rerun in the main tree on
  7b212a4: 19/0.
- **Production (`main`)** is unchanged. It waits for the founder's word.

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
