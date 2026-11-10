# Orchestration dashboard — parallel work and independent review

Founder directive of 10 November 2026, 14:08. One integrator keeps the architecture and merges; workers build in their own
worktrees; a reviewer that did not write the code reads the actual change. This page is the one place their state is kept.
It records what happened, not what was planned: a row says "merged" only after the integrator ran the tests on the merged result.

## What is actually available here

- Workers: sub-agents started by the integrator, each optionally in its own git worktree, running in the background. Real, and used.
- One machine with 2 cores. Builds, browser suites and the non-browser matrix are **serialised by one lock**; workers think and
  edit in parallel but do not build or test at the same time. Parallelism speeds up writing and reviewing, not test time.
- No separate review service, no second machine, no deployed backend. A reviewer is another agent with read-only instructions.
- Nobody but the integrator pushes, merges or deploys. No worker touches staging or the main sites.

## Rules that came from experience

1. **Each worktree has its own `node_modules`** (`node scripts/bootstrap.mjs` inside the worktree). On 10 November a worktree
   shared the main checkout's `node_modules` by symlink; its build re-pointed the workspace package links at its own packages and
   the main checkout's API suites could not start (25 suites failed to load). Repaired the same hour; suites re-run: 65 pass, 0 fail.
2. A worker owns named folders. Shared files (registries, the build's stylesheet list, the test list) get one additive line each.
3. A reviewer runs no build and no browser suite, and writes nothing in the repository.
4. A worker's report is a claim until the integrator has merged its branch and run the suites on the merged tree.
5. Findings that are enhancements, not defects, are recorded as tasks and not built on the spot.

## Work in hand

| Stream | Worker | Lane (files) | State | Evidence |
|---|---|---|---|---|
| Integration; Lite capability | integrator | `apps/demo/src/here`, `control`, `tour`, registries, tests | **In this room** on staging (`ec1c05c`). **Room Control** and **Tour E** committed (`c45ccd3`), not yet on staging | unit `demo-here` 12, `demo-control` 8; browser `demo-here` 57, `demo-control` 34, `demo-tours` 137, both themes; full matrix on `ec1c05c`: 42 of 43 suites in each theme, 0 failed checks (founder-studio NOT RUN) |
| I. Independent review | reviewer (read-only) | reads `here/**`, `control/**` and their hooks | **Running**; no findings received yet | — |
| E. Media review | film reviewer (scratch only) | the founder's five films and picture | **Done**: every film watched by frames (not heard); names, numbers and claims listed for the founder | review file kept outside the repository until placement is decided; summary in the task list |
| H. Corporate website | worker, worktree `agent/website-collabora-founder` | `apps/website/**`, website tests | **Running**: Collabora-SING section (in development) with its film; the founder's picture on the founder page | not merged |
| C. Four worlds: Stadium | worker, worktree `agent/stadium-critical-signal` | `apps/demo/src/gameday/**`, additive stadium estate records, its own tests | **Running**: "The Critical Signal" as one workflow on the game-day engine | not merged |

## Not started as parallel streams, and why

- **University playable sandbox, real-time 3D.** No renderer decision has been made and no 3D tool is connected; starting workers
  on it before the engine audit would produce throwaway code.
- **Backend (A).** The enterprise API is code with tests and is not deployed for the demonstration; parallel work there waits for
  the decision on what the demonstration should call.
- **Convention "Build Your Expo".** Depends on the same editing engine Lite needs (drag, snap, versions); it follows that, not precedes it.
