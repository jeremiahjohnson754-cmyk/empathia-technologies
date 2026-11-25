# Testing and evidence

How a test run becomes evidence, and how it is kept from being changed afterwards. Written 24 Nov 2026 with the change that made a
working run unable to overwrite the record (`tests/lib/evidence.mjs`, `scripts/test.mjs`, `tests/unit/evidence-isolation.test.mjs`).

## Two kinds of run

| | Started by | Writes to | Changes the repository |
|---|---|---|---|
| Run of record | `scripts/test.mjs` with `--part=N/M`, `--merge=M` or `--record`; any run under CI | `tests/evidence` | yes: the evidence, committed with the commit it describes |
| Working run | `node scripts/test.mjs` (optionally `--only=<text>`); one suite run by hand | `.local/evidence/run-<time>` or `.local/evidence/standalone` | no |

`.local` is not in the repository. A run of record cannot be narrowed: `--only` with `--record`, `--part` or `--merge` is refused.
The enterprise suite's product screenshots under `media/screenshots` are re-taken only with `EMPATHIA_SCREENSHOTS=refresh`.

## The engineering sequence

Founder, 25 Nov 2026 07:50 CT, after the regression on 52cdd952 spent four hours finding two failures a short run would have found:
"Keep the same strict release gates, but catch inexpensive failures earlier." Every change goes through these six steps, in order. A step
that fails sends the change back to step 1; nothing skips ahead.

| Step | What | How |
|---|---|---|
| 1 | Implementation | the change, and the tests that would fail without it |
| 2 | Preflight validation | the build of every app, the Founder Studio included (`--studio`), which type-checks the interface kit, the website, the demo, the enterprise web app, the enterprise API and the studio; then every non-browser suite: unit, security, integration and the dependency boundaries (a server page imports only the server client and the kit, `migration-ledger`; isolation of evidence; registries). A suite left NOT RUN for any reason other than "pass --browser" or "--studio" (or the two the regression itself leaves NOT RUN here: the machine-learning prototype without its dataset, the full film decode without `--films`) fails this step; without a local database the security suites would be left NOT RUN, and that is not a pass |
| 3 | Cross-product impact testing | the browser, end-to-end and site suites the change reaches, run one by one by the regression's own runner (`scripts/test.mjs --files=…`: the same timeouts, scoring and prerequisites); a suite that runs nothing fails. Chosen by `scripts/lib/impact.mjs`: the page registry evaluated in Node gives every address and the module behind it (184 pages, the server pages included); the import graph (static imports and `import()`, not the registry's own) gives what a changed module reaches; every suite that opens one of those addresses is chosen, and the three that read every route from the registry. A change to something the whole app shares (the shell, App and what it mounts, the access policy, the loaders, a module twelve or more pages reach, area CSS) also chooses the suites that walk across products; global CSS, the build, the packages and the parity data choose every suite; the website, the server and sandbox, and the studio choose their own suites; a test library chooses the suites that import it, directly or through other libraries; a change to the runner chooses the suites its changed lines name. A changed file it cannot place makes every suite run, and is named. The suites of the change come first, the walks across products last; it stops at the first failure |
| 4 | Independent review | an agent that did not write the change reads it and its tests, looking for wrong assumptions and for tests that cannot fail or pass for the wrong reason; each finding is corrected with its reason, or answered. When a review leads to changes, steps 2 and 3 run again |
| 5 | Full exact-commit regression | every suite, on one committed checkout, as below. The gate: nothing is staged without it |
| 6 | Staging deployment | `preview/enterprise-3` moved to the passed commit; the served `BUILD_MANIFEST.json` names it; every served file matches the manifest's hash; the live check walks the changed workflows on the previews |

`node scripts/preflight.mjs` does steps 2 and 3; `--list` says which suites step 3 would run and why, without running them. It refuses to
start while either regression runner runs, stops if one starts, and refuses to run at all if a browser or end-to-end suite is not
registered with the regression or a cross-product suite it names does not exist. Because a background command on the workstation is cut
off at two hours, `--from=<suite>` resumes step 3; it is refused unless the run it continues passed every step before that suite on the
same commit, working tree, base, list and build (the run keeps that proof in `.local/preflight/state.json`). Steps 2 and 3 are working
runs: nothing they write goes to `tests/evidence` (not even under CI), and they are not evidence. Step 2 takes about twelve minutes on the
workstation. Step 3 depends on the change, and every page change includes the three suites that open every route (`demo-deadends` alone
is allowed half an hour): `DrawingPage.tsx`, 6 suites; a module several products use, tens; a shared component or area CSS, most of the
matrix, one to two hours, which is less than the regression and stops at the first failure.

What step 3 cannot know, so step 5 stays the gate: a page reached only through another page's text or a link a suite follows by pressing
it; an address a suite builds at run time from data other than the registry; a behaviour that depends on the order suites run in. The
first selector, written the same morning, read the registry as text and lost 31 pages, matched no `*` route, did not see CSS, the build,
data, the server or the studio, and missed modules the frame mounts and modules a page loads with `import()`. A second review found the
studio suites of every regression since 18 Nov testing a studio bundle built on 18 Nov (the recipe built without `--studio`; a part of a
run of record now refuses a stale build), an end-to-end suite and `demo-deadends` that no regression ran, a resume that trusted an earlier
run without proof, and ten rules whose removal the unit checks did not notice. Each is corrected; the rules' checks were then verified by
removing each rule in a scratch copy and seeing a check fail.

## The exact-commit regression

A regression is a run of record on a clean checkout of one commit, run alone (nothing else using the processor), in parts because one
background run on the workstation is limited to two hours:

```
node scripts/build.mjs --studio
node scripts/test.mjs --browser --studio --part=1/5      (then 2/5 … 5/5; the commit must not move between parts)
node scripts/test.mjs --merge=5
```

A part that runs browser or studio suites refuses to start unless the demo, the website and (with `--studio`) the Founder Studio were built from the commit under test: until 25 Nov 2026 the recipe built without `--studio`, and every regression from 18 Nov tested a studio bundle built on 18 Nov. The merge refuses if a part is missing, ran another commit, or ran on a changed working tree. On a pass, the evidence is committed
(`git add -u tests/evidence tests/REGRESSION_LEDGER.jsonl`) in a commit that names the commit it tested. A stopped or failed run is not
a result: the cause is fixed with its reason, committed, and the regression is run again on the new commit.

## What is kept

- `tests/evidence/TEST_RESULTS.json` and `.md`: the last run of record that passed, committed with the commit it tested. PASS, FAIL
  and NOT_RUN per suite; a suite that was not run is never counted as passed and carries its reason. A failed run's files are not
  committed here (the working copy is restored to the last pass); they are kept in `tests/evidence-failed`.
- `tests/REGRESSION_LEDGER.jsonl`: one line for every finished run of record, pass or fail. A later pass does not remove an earlier
  failure.
- `tests/evidence-failed/<commit>-<time>/`: the result files of every failed run of record.
- The frame rates the 3D scene suites measured, since 25 Nov 2026: in the run's ledger line (`frameRates`) and in a table at the end of
  `TEST_RESULTS.md`. See "Frame rates and pixel comparisons" below.

## Disk and temp

- A run of record does not start with less than 3 GB free (`EMPATHIA_MIN_FREE_GB` changes the floor) and says how to free space.
- Each run started by `scripts/test.mjs` gives its suites one temp directory (`TMPDIR`) and removes it when it ends (`--keep-tmp`
  keeps it for a look). Before this, suites left one small build directory per test file per run: 12,661 of them, 4.3 GB, on 24 Nov.
- `node scripts/dev/clean-test-temp.mjs` lists, and with `--apply` removes, directories left by suites run by hand. It removes only
  names made of a prefix the repository's own tests give `mkdtemp` plus six characters, not modified for two hours.

## When the machine stalls

Checks that measure time (a frame rate, a focus that must arrive, a page that must load within a limit) fail when the machine itself
stops running programs for a moment: a paused or starved virtual machine. On 24 Nov 2026 three such checks failed across two
regressions and passed when run again on the same commit, and GitHub's run of the same commit passed; nothing had recorded whether
the machine stalled.

- `scripts/dev/stall-watch.mjs` runs beside every run started by `scripts/test.mjs` and writes a line whenever its half-second
  timer fires two seconds or more late.
- After each suite the runner reads which stalls overlapped it and records them with the suite (`machineStalled`).
- A suite that **fails** while the machine stalled for **three seconds or more** is run **once** more. The first attempt stays in
  the record (`firstAttempt`), the results table says "SECOND RUN", and the ledger lists it (`secondRunAfterStall`).
- A suite that fails on a machine that kept running is a failure. It is not run again. No threshold was changed.

This measures the machine; it does not prove why a check failed. A second run that passes says the first failure coincided with a
stall, not that the product cannot fail that way.

## Frame rates and pixel comparisons in the 3D scenes

The three live scenes (`#/play/campus`, `#/play/stadium`, `#/play/expo`) share one WebGL2 renderer, `apps/demo/src/play/gl.ts`. Where a
scene cannot hold 24 frames a second it draws fewer pixels: the canvas keeps its size on the page and the picture is scaled up. The
rule is `governDetail` and `DetailGovernor` in that file. It never goes below half resolution, it restores full detail if the minimum
buys less than 1.25 times the full-detail pace, and `?detail=full` in the address turns it off.

Two things follow for tests.

- A check that compares canvas pixels before and after a control must fix the detail, or a change of detail reads as the control's
  effect. The stadium and expo suites open their main page with `?detail=full` for this reason. A new pixel-comparison check on any
  of these scenes must do the same.
- Every frame rate a suite prints is of the test machine: two cores, no graphics processor, Chromium drawing WebGL in software. The
  floors (campus 8, expo 4, stadium 2) catch a regression on that machine. They are not device figures, and no device frame rate has
  been measured. The target for ordinary hardware is 30 frames a second; it is a target until a real device is measured.

Product pictures (`scripts/media/capture-experiences.mjs`) are taken with `?detail=full`.

A drawing that is allowed to differ from full quality (the stadium's distant spectators, drawn simply on a slow machine) is judged
by limits that were set from the quality requirements before it was measured: `tests/lib/picture-diff.mjs`, explained in
`RENDERING_PERFORMANCE.md`. A check applies those limits and has none of its own; a limit is changed only with its reason written
in that file, and never to fit a result. `?lod=simple` shows the simple drawing whatever the pace, so the two can be compared at
the same resolution.

### The figures are kept, not only the verdict

The regression on 87956a57 passed, and its committed record said PASS for each frame-rate check and nothing about what was measured:
a browser suite's per-check file is under `tests/evidence/demo-shell`, which git ignores. Since 25 Nov 2026:

- Each scene suite hands its readings to `recordFrameRates` (`tests/lib/frame-rates.mjs`), which writes
  `performance/<scene>.json` beside the run's other evidence: the check, whether the scene was held at full detail or left to adapt,
  what was measured, frames a second, the detail it was drawn at, the floor if the check has one, the commit, the number of cores and
  the WebGL renderer the browser reports. The file says in its own text that the figures are the test machine's and not a device's.
- A reading that is not a number, or a detail outside 50 to 100, is refused, and the suite fails its own check (CL-23, SLV-16,
  XPO-14) rather than write it.
- The merge puts the readings written on the commit being merged into that run's line of `tests/REGRESSION_LEDGER.jsonl` and into a
  table at the end of `TEST_RESULTS.md`. A file left by a run on another commit is not counted. Both are tracked, so the figures of
  every finished run of record, pass or fail, can be compared with the last; the per-scene files themselves are not committed.
- Beside each floor there is a budget that is counted, not timed, and so is the same on every machine: the triangles and draw calls
  of a frame, which the renderer counts and puts on its canvas (`data-tris`, `data-draws`). Stadium overview 60,000 and 180 (SLV-17),
  campus 32,000 and 120 (CL-24), expo hall 8,000 and 150 (XPO-15). A change that makes a scene heavier fails here whatever the machine.
- No floor changed. These are still regression figures of one machine with no graphics processor. Device figures need devices and
  are a separate, open piece of work (roadmap A19).

## Suites not run, and why

| Suite | Where it does not run | Reason | What covers the risk |
|---|---|---|---|
| unit: ML research prototype | local regression | its dataset is generated on demand, not committed | GitHub CI regenerates the dataset and runs it |
| media: full decode of every curated film | local regression and CI (platform profile) | 47 minutes of video; needs `--films` and the private film masters | run before a media release; the `media` release profile refuses to skip it |
| browser and e2e: Founder Studio (three suites) | GitHub CI | the studio is built from a private store that is never on a public runner (decision E3-D5) | the local regression builds the studio and runs all three |

NOT RUN is not PASS. The release gate (`scripts/verify/no-unexpected-skips.mjs`) fails on any suite not run that is not named here
with its reason.
