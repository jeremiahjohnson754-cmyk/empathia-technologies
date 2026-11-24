# GitHub CI repair (founder decision E3-D5, 23 Nov 2026)

**Status: PREPARED on the branch `ci/e3-d5-founder-studio-private-store`. NOT MERGED. Merging to `main` redeploys production and waits for the founder's separate approval.**

## What was wrong

Every GitHub CI run since 17 Nov 2026 fails at one build step, "Founder Studio (private assets verified …)", with
`NOT PROVISIONED: the private store is not on this machine` (for example run 44821379278 on `main` at 27c7469, and run 45270728292 on
pull request 2). The workflow built with `--studio`. Since 17 Nov (1cba676) the studio is built from a private store, the Founder
Edition and the films, which is never in the repository (it is public) and never on a runner. Nothing after that step ran on GitHub, so
CI has reported nothing about the public sites for a week.

## The repair (three files, no application code)

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

## What merging does

Merging this branch to `main` changes no application file, but any push to `main` makes Render redeploy production from the new commit.
The founder approves that separately.
