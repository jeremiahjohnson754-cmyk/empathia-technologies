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

## The exact-commit regression

A regression is a run of record on a clean checkout of one commit, run alone (nothing else using the processor), in parts because one
background run on the workstation is limited to two hours:

```
node scripts/build.mjs
node scripts/test.mjs --browser --studio --part=1/5      (then 2/5 … 5/5; the commit must not move between parts)
node scripts/test.mjs --merge=5
```

The merge refuses if a part is missing, ran another commit, or ran on a changed working tree. On a pass, the evidence is committed
(`git add -u tests/evidence tests/REGRESSION_LEDGER.jsonl`) in a commit that names the commit it tested. A stopped or failed run is not
a result: the cause is fixed with its reason, committed, and the regression is run again on the new commit.

## What is kept

- `tests/evidence/TEST_RESULTS.json` and `.md`: the last run of record that passed, committed with the commit it tested. PASS, FAIL
  and NOT_RUN per suite; a suite that was not run is never counted as passed and carries its reason. A failed run's files are not
  committed here (the working copy is restored to the last pass); they are kept in `tests/evidence-failed`.
- `tests/REGRESSION_LEDGER.jsonl`: one line for every finished run of record, pass or fail. A later pass does not remove an earlier
  failure.
- `tests/evidence-failed/<commit>-<time>/`: the result files of every failed run of record.

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

## Suites not run, and why

| Suite | Where it does not run | Reason | What covers the risk |
|---|---|---|---|
| unit: ML research prototype | local regression | its dataset is generated on demand, not committed | GitHub CI regenerates the dataset and runs it |
| media: full decode of every curated film | local regression and CI (platform profile) | 47 minutes of video; needs `--films` and the private film masters | run before a media release; the `media` release profile refuses to skip it |
| browser and e2e: Founder Studio (three suites) | GitHub CI | the studio is built from a private store that is never on a public runner (decision E3-D5) | the local regression builds the studio and runs all three |

NOT RUN is not PASS. The release gate (`scripts/verify/no-unexpected-skips.mjs`) fails on any suite not run that is not named here
with its reason.
