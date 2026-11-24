# GitHub CI repair (founder decision E3-D5, 23 Nov 2026)

**Status: PREPARED on the branch `ci/e3-d5-founder-studio-private-store`. NOT MERGED. Merging to `main` redeploys production and waits for the founder's separate approval.**

## What was wrong

Every GitHub CI run since 17 Nov 2026 fails at one build step, "Founder Studio (private assets verified …)", with
`NOT PROVISIONED: the private store is not on this machine` (for example run 44821379278 on `main` at 27c7469, and run 45270728292 on
pull request 2). The workflow built with `--studio`. Since 17 Nov (1cba676) the studio is built from a private store, the Founder
Edition and the films, which is never in the repository (it is public) and never on a runner. Nothing after that step ran on GitHub, so
CI has reported nothing about the public sites for a week.

## The repair (no application code)

| File | Change |
|---|---|
| `.github/workflows/ci.yml` | Builds with `node scripts/build.mjs` (no `--studio`), tests with `node scripts/test.mjs --browser` (no `--studio`), and tells the gate `--private-store=absent`. Timeout 75 → 180 minutes: the matrix took 106 minutes in series on 20 Nov. The studio's build manifest is no longer listed as evidence, because it is not built |
| `scripts/verify/no-unexpected-skips.mjs` | With `--private-store=absent`, and only then, the three studio suites may be NOT RUN. They are named, with the reason, and the last line says the result does not cover the Founder Studio |
| `tests/unit/release-gate.test.mjs` (new, registered in `scripts/test.mjs`) | Eight checks, below |

## How the Founder Studio stays private

- The workflow reads **no secret** and has `permissions: { contents: read }`. No step names the private store, its tool or the Founder
  Edition. Nothing private is downloaded to a runner, so nothing private can appear in a log or an uploaded artifact. (RG-08)
- The alternative, giving the runner a credential for the private store, was rejected: it would put the Founder Edition and the films on
  a machine that also uploads artifacts for a public repository.
- The studio suites are **not weakened and not counted as passed**. They report NOT RUN. The local exact-commit regression, where the
  store is, still builds the studio and runs all three (last: fe30ba9d, PASS 287 · FAIL 0 · NOT_RUN 2).
- The declaration cannot be used to hide anything: it is refused in a checkout where the studio is built (RG-04), refused for a media
  release (RG-05), and excuses no other suite (RG-06). Without it the gate behaves exactly as before (RG-02).

## Evidence

| Check | Result |
|---|---|
| `tests/unit/release-gate.test.mjs` | 8/8 PASS, locally and on GitHub |
| Workflow parses as YAML; one job; no `${{ secrets.* }}` | PASS |
| GitHub Actions run 45282298279 (first commit of this branch, pull request 3) | The build step **passed** for the first time since 17 Nov, and the whole matrix ran on GitHub for the first time: **PASS 274 · FAIL 12 · NOT_RUN 4** in 78 minutes. The four NOT RUN are the three Founder Studio suites, named, and the film decode. The gate did not run, because the matrix step failed |

### The twelve failures on the runner (none is in the Founder Studio; none is caused by the repair)

They had never been seen because nothing after the build step had run on GitHub. On the same commit the local regression passes them.

| Cause on the runner | Suites | Addressed by |
|---|---|---|
| `pdftotext` and `qpdf` are not installed | security data-report, security powerbi-export, demo-exports, demo-drill, demo-service-analytics, demo-cx-analytics | Second commit: `poppler-utils` and `qpdf` in the system packages step |
| Python `openpyxl`, `python-docx`, `python-pptx` are not installed | unit: export formats | Second commit: pinned in `requirements-ci.txt` at the versions used locally |
| The runner's Chromium plays no H.264 video ("The element has no supported sources") | demo-signal-film, demo-lesson, demo-cinematic | **OPEN.** Needs a browser build with the codec on the runner, or the affected checks named as NOT RUN there. Not decided |
| Slower machine | public website `WR-ten-seconds` (animations still present at the 10-second mark), demo-offline `OF-13` | **OPEN.** To be read again after the second run; no test is loosened to make them pass |

So after the second commit the expected state is: seven suites repaired by the missing packages, five still failing. **CI is not green yet and
this document does not say it is.** The result of the second run is on the pull request's checks.

### The second run (run 45298218738, commit b1c13df6): PASS 278 · FAIL 8 · NOT_RUN 4

The system packages repaired five of the six suites that needed them. Eight suites still fail on the runner:

| Cause on the runner | Suites | State |
|---|---|---|
| Python `jsonschema` and `referencing` are not installed | security powerbi-export (PBI-02), unit: export formats | Third commit: both pinned in `requirements-ci.txt` at the versions used locally. Not yet confirmed by a run |
| The runner's Chromium plays no H.264 video | demo-signal-film, demo-lesson, demo-cinematic | **OPEN**, as before |
| Timing on a slower machine | public website `WR-ten-seconds`, demo-offline `OF-13` | **OPEN**: both failed again in the second run, so it is not a one-off |
| Not yet understood | Learn labs `LL-11` (the Lighting Lab fault "fixable to every check"; it passed in the first run and passes locally) | **OPEN.** Read as intermittent until it is seen twice; nothing is loosened |

**CI is still not green.** The expected state after the third commit is six failing suites, all named above.

### The third run (run 45316525626, commit b57e3d29): PASS 280 · FAIL 6 · NOT_RUN 4

The JSON schema packages repaired the Power BI export check. Learn labs `LL-11` passed, so it has failed once in three runs and stays
read as intermittent. Six suites still fail on the runner:

| Cause on the runner | Suites | State |
|---|---|---|
| `sharp` is not installed, so the exports are written without the shield and the checker reports "no image" (12 Word documents listed) | unit: export formats (864 of 893) | Fourth commit: `sharp@0.35.4`, the version used locally, installed outside the repository and named in `SHARP_PATH`, which the suite already reads. Not yet confirmed by a run |
| The runner's browser is not the one the local regression uses. `package.json` pins Playwright 1.56.0 (Chromium 141, build 1194); every local regression has run on Playwright 1.63.0 (build 1243). Build 1194 plays no H.264 video | demo-signal-film, demo-lesson, demo-cinematic | Fourth commit: `package.json` pins Playwright 1.63.0, so the runner downloads the build the evidence was produced on. Not yet confirmed by a run |
| Failed in all three runs, always the same way: public website `WR-ten-seconds` (40 animations still listed after the sequence has come to rest) and demo-offline `OF-13` (the chapter page does not replace the offline page) | public website, demo-offline | **OPEN.** Three identical failures do not look like timing. Both may be the older browser; the fourth run will show. No test is loosened |

**CI is still not green.** After the fourth commit the expected state was between zero and two failing suites.

### The fourth run (run 45331647050, commit 8b00835b): PASS 285 · FAIL 1 · NOT_RUN 4, in 110 minutes

The browser the evidence was produced on repaired five suites at once: the three film suites, and also public website `WR-ten-seconds`
and demo-offline `OF-13`. Those two were never timing; they were the older browser, as the third run's note suspected. No test was
changed. `sharp` repaired the missing shield: the export suite went from 864 of 893 to 912 of 913.

| Cause on the runner | Suites | State |
|---|---|---|
| LibreOffice is not installed. The export suite converts one Word, one Excel and one PowerPoint export to PDF with `soffice`; when it is absent the suite records "LibreOffice available: NOT RUN" and counts that as a failure, which is the suite doing its job | unit: export formats (912 of 913) | Fifth commit: `libreoffice-writer`, `libreoffice-calc` and `libreoffice-impress` from the runner's own package archive (Ubuntu 24.04 carries 24.2, the series used locally), with two font families so the converted pages are not empty. Not yet confirmed by a run |

The gate step has still never run on GitHub, because it runs only after a matrix with no failure.

**CI is still not green.** After the fifth commit the expected state is no failing suite and four NOT RUN (the three Founder Studio
suites, named, and the film decode), and then the gate decides. This document will say what the fifth run did once it has finished.

## What merging does

Merging this branch to `main` changes no application file. It changes the workflow, `requirements-ci.txt`, this document, and one line of
`package.json`: the Playwright version used by the tests (a development dependency; nothing in a built site contains it). Any push to
`main` makes Render redeploy production from the new commit. The founder approves that separately.
