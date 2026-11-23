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
| `tests/unit/release-gate.test.mjs` | 8/8 PASS (run in a miniature checkout holding the three changed files) |
| Workflow parses as YAML; one job; no `${{ secrets.* }}` | PASS |
| GitHub Actions run of the repaired workflow on the pull request for this branch | See the pull request's checks. This file records the first result once the run finishes; until then it is NOT RUN, not PASS |

## What merging does

Merging this branch to `main` changes no application file, but any push to `main` makes Render redeploy production from the new commit.
The founder approves that separately.
