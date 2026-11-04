# Agent calls, turns 480-579

## Turn 486 — Agent: "Unify substitution reverification rule"

- subagent_type: general-purpose
- run_in_background: True
- isolation: (not specified)

### Prompt (verbatim)

````
Repository /home/claude/empathia-technologies, branch `restoration/sprint-0-1`. There are uncommitted changes from two earlier engineers; they are under review. Build on them; do not revert them. **Do not commit, push or deploy.** Do not run `node scripts/build.mjs` or `node scripts/test.mjs` (I run those afterwards). Build and test only the parts you touch, with the commands below.

## Problem: one rule, two implementations, one of them missing

When a device in an **accepted** room is substituted during recommissioning (ACCEPTED → COMMISSIONING with a CURRENT baseline), results recorded on the previous device must not count towards re-acceptance. The owner's product rule is ported from the original V2.5.3 demonstrator's asset replacement (`v25CxReplace`). A test is reopened when either:
- its plan row names the substituted asset among the devices it covers; or
- the substituted asset is a camera and the test is a Video test of the room; or
- the substituted asset is part of the audio chain (dsp family) and the test is an Audio test; or
- the test is `identity_asset` (always re-checked after a substitution).

Each reopened test carries one reason per substitution. A reopened test's earlier result no longer counts; the test must be re-run and verified again by a different person before the room can be re-accepted.

- **The API already implements this** in `services/enterprise-api/src/domain/rooms.ts`: functions `substitutions`, `reverification` and `recommissionImpact`, the PATCH device path during recommissioning, and the re-acceptance check. It is tested by `tests/e2e/checkpoint-room-lifecycle.e2e.mjs` (88 checks) and `tests/security/governance.test.mjs` (BL-5).
- **The investor demo does not.** In `apps/demo` (Build a Room: `src/build/store.ts`, `BuildRoom.tsx`, `ImpactPanel.tsx`, `impact.ts`; Room Story: `src/story/assemble.ts`, `StoryPage.tsx`), a swap during recommissioning leaves 10 tests showing PASS_VERIFIED results recorded on the removed device, and "COMMISSIONING → ACCEPTED: no engine condition blocks it". The Impact panel states this honestly, but the behaviour diverges from the product.

## What to do

1. **Move the rule into the shared engine.** Add a pure function to `packages/commissioning-engine`, next to its other modules and exported from its index, for example:
   `reopenedBySubstitution(rows: { testId: string; domain: string; devices: string[] }[], subs: { assetId: string; label: string; category: string; from: string; to: string }[]): { testId; assets: string[]; reasons: string[] }[]`
   - Use the engine's existing `deviceFamily` so the families are identical, and the exact reason wording the API uses now, so API output does not change.
   - Add unit tests in the package's test folder covering each of the four triggers, a non-match, and two substitutions on one test.
2. **Use it in the API.** Replace the inline matching loop in `rooms.ts` `reverification` with a call to the shared function. The DB queries and the result/rerun bookkeeping stay. API behaviour must be byte-identical: the checkpoint e2e must still pass 88/88, and its saved evidence must show the same 12 reopened tests with the same reasons (compare against `tests/evidence/checkpoint/15-verification-requirements.json` before you start; copy it aside first).
3. **Use it in the demo.**
   - When Build a Room substitutes a device while the room has an accepted baseline and is recommissioning (find how the demo represents that state), mark the reopened tests' prior results as superseded for re-acceptance. Keep them in history; never delete a record. Each is shown as "recorded on the previous device · must be re-run and verified again".
   - Re-acceptance must be blocked until each reopened test has a new result recorded after the substitution and verified by a different person. Use the demo's existing lifecycle-condition mechanism, so the refusal names every reopened test, the same way other blockers do.
   - Update the Impact panel: show the reopened tests with their reasons, and remove the "no engine condition blocks it" warning once it is no longer true. Show in Room Story: a "Re-verification required" entry under Verify, linking to the plan.
   - The accepted baseline stays unchanged.
4. **Fix three demo truth bugs the previous engineer reported** (in `apps/demo/src/workspace/records.ts` and related):
   - (a) The KPI records give a Build a Room room "FUNDED" status with no funding record. Status must come only from records; with none, show it as not recorded.
   - (b) That room's project history is always empty because a filter matches the type used only for refusals. Fix the filter.
   - (c) For Atlas 4.218 the KPI records say baseline v1 while APEX says no baseline is accepted. Find which source is authoritative in the seed and make both read it. If it is genuinely ambiguous, make APEX say what the record says and report it.

## Tests (all must pass; report counts)

- Commissioning-engine unit tests: `node --test packages/commissioning-engine/dist/test/**/*.test.js` after `node node_modules/typescript/bin/tsc -b packages/commissioning-engine`.
- API: `node node_modules/typescript/bin/tsc -b services/enterprise-api`, then:
  - `node tests/e2e/checkpoint-room-lifecycle.e2e.mjs`
  - `node --test tests/security/governance.test.mjs`
  - `node --test tests/integration/api.test.mjs`
  - `node --test tests/security/search-party.test.mjs`

  The local database is `.local/pg`; if it is down, run `node scripts/db.mjs up`.
- Demo:
  - `node node_modules/typescript/bin/tsc -p apps/demo/tsconfig.json --noEmit`
  - `node apps/demo/build.mjs`
  - `node tests/browser/demo.test.mjs` (128 checks today; add checks that a swap during recommissioning reopens the tests with reasons and that re-acceptance is refused until they are re-run and independently verified, then succeeds and publishes the next baseline version while v1 is kept as SUPERSEDED, if the demo supports publishing; otherwise report)
  - the demo unit tests in `apps/demo/test/` (the way `scripts/test.mjs` registers them)
  - `node scripts/audit/site-audit.mjs --strict` (0 P0/P1).
- `node scripts/api/export-openapi.mjs --check` must pass.

## Report back

- Files changed, one line each.
- Proof that the API output is unchanged (the diff of the 12 reasons, which should be empty).
- What the demo now does, step by step.
- Exact test counts.
- How the three truth bugs were resolved.
- Anything not done and why.
````

