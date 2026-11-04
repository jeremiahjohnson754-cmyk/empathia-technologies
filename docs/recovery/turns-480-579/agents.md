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

## Turn 496 — Agent: "Validate outbox delivery guarantees"

- subagent_type: (not specified)
- isolation: worktree
- run_in_background: True

### Prompt (verbatim)

````
You are validating, and where needed fixing, the transactional outbox in the Empathia monorepo. You work in an isolated git worktree of `/home/claude/empathia-technologies`, created from branch `restoration/sprint-0-1` at commit `7c18339`. Other agents are editing the main tree at the same time. Touch only what this task needs.

## Setup (the worktree has no node_modules and no database)
- `npm ci`. The npm registry is reachable. Do not symlink the main tree's node_modules: its workspace links would point at the other agents' in-progress files.
- Build: `node scripts/build.mjs` (add `--studio` only if a suite you run needs it).
- Database: `EMPATHIA_PG_PORT=55433 node scripts/db.mjs up`. That gives a private PostgreSQL 16 cluster for this checkout. The main tree uses 55432; never touch it.
- API test ports: use 4300–4399 for any new harness `setup({ db, port })`. Use database names starting `empathia_test_outbox_`.
- Never use `pkill -f` or `pgrep -f`. Stop only processes you started, by PID.

## What exists
- `ctx.emit` writes `app.outbox_event` (tenant_id, type, aggregate_type, aggregate_id, aggregate_rev, payload, attempts, status, next_attempt_at, last_error, correlation_id) in the same transaction as the domain change.
- `services/enterprise-api/src/worker/outbox.ts` claims a batch with FOR UPDATE SKIP LOCKED. It retries with exponential backoff and dead-letters at MAX_ATTEMPTS (8).
- `POST /v1/admin/outbox/:event/retry` ("Retry a dead-lettered event (security admin)") is in `services/enterprise-api/src/modules/routes.ts`, around line 227.
- The existing coverage is in `tests/integration/api.test.mjs`, around lines 180–240 ("slice 8 — the outbox builds the read model…" and "outbox: a failing handler retries with backoff and dead-letters after 8 attempts; an admin retry delivers it"). The harness is `tests/integration/harness.mjs`.
- Roles: empathia_owner, empathia_app, empathia_worker. Row-level security is forced. The Evidence Ledger is a SHA-256 chain, `GET /v1/audit/integrity`.
- Read these files first. Find out exactly how a handler's side effects and the DELIVERED update relate transactionally, and how the worker sets tenant context.

## The owner's four validation requirements (verbatim intent)
"duplicate delivery after a worker crash, event ordering for the same room, cross-tenant isolation, and controlled dead-letter replay with full audit records". The standing architecture rule is: "external Teams notifications and connector events must go through a transactional outbox, never external calls inside the DB transaction."

Write a test for each requirement first. Run it against the current code and record whether it passed or failed before any fix. Then fix the real defects.

1. **Duplicate delivery after a worker crash.**
   - Prove what happens when a worker dies mid-delivery.
   - Internal effects (read model, notifications rows): they must apply exactly once.
   - Effects outside the database: delivery is at-least-once, so the consumer must deduplicate. Use an idempotency key derived from the event id, plus a per-(event, handler) delivery receipt or equivalent. A redelivery after a crash must not produce a second effect.
   - Kill a real worker child process with SIGKILL at a controlled point. Any fault-injection hook must be test-only, gated, and documented.
   - No real Teams/Outlook connector exists. Prove deduplication against a local stub sink, label it exactly that, and record real-connector idempotency as NOT RUN.
   - No external call may happen inside the DB transaction.
2. **Event ordering for the same room (aggregate).**
   - With two or more workers running concurrently, events for one aggregate must be delivered in aggregate_rev order.
   - A later rev must never overtake an earlier one that is still pending, retrying or dead-lettered.
   - Events for different rooms must still flow in parallel.
   - Decide and document what happens to later events when an earlier one dead-letters. Holding them until a replay or an audited skip is the safe default.
3. **Cross-tenant isolation.**
   - Each event is handled under its own tenant's context, and its writes land only in that tenant.
   - A security admin of tenant A cannot list, read, retry or replay tenant B's outbox events. That attempt must be refused without revealing that the event exists (404, not 403, if that is the codebase convention; check).
   - Payloads never cross tenants.
4. **Controlled dead-letter replay with full audit records.**
   - Only the existing security-admin authority may replay. Do not invent new roles or permissions.
   - A reason is required.
   - Replaying an event that is not dead-lettered is refused (409), and a duplicate replay request is refused or idempotent, with no double delivery.
   - Any bulk replay is bounded and explicit.
   - Each replay writes an audit event to the Evidence Ledger: who, when, why, prior attempts, last_error, and the outcome. `/v1/audit/integrity` still verifies afterwards.

## Rules (the owner's, non-negotiable)
- Do not weaken, skip or delete existing tests to make anything pass. If a test cannot run, report it as NOT RUN; never as PASS. Report results exactly as observed.
- "Never invent additional event handlers, roles or permissions merely to satisfy a numerical target. Do not weaken least privilege."
- Use synthetic data only. No real customer or company names.
- A schema change goes in `database/migrations/0027_outbox_delivery.sql`. 0026 is reserved for another agent.
- If you change a route's request or response, regenerate `docs/api/openapi.json` and `packages/api-client/src/generated.ts` with the repo's own generator. Look in package.json scripts or scripts/. I will regenerate again after merging.
- Register any new test file in `scripts/test.mjs`, the same way the existing integration suites are.
- When done, run `node scripts/test.mjs` for the integration and security suites at minimum. Report pass and fail counts for each suite. Run the full default matrix if time allows.
- Commit your work in the worktree on its own branch. Do not push. End the commit message with exactly these two lines:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx`

## Report back (concise)
- The worktree path, branch and commit sha.
- Files changed.
- For each of the four requirements: the test name(s), the result before the fix, the defect found (if any), the fix, and the result after.
- Suite counts.
- Anything NOT RUN, and why.
- Any residual risk.
````

## Turn 499 — Agent: "Installation records and negative paths"

- subagent_type: (not specified)
- isolation: (not specified; works directly in the main tree)
- run_in_background: True

### Prompt (verbatim)

````
You are implementing the owner's device-installation model and the checkpoint's negative-path tests in the Empathia monorepo. The repo is `/home/claude/empathia-technologies`, branch `restoration/sprint-0-1`, tip `457361d`, with a clean tree. Work directly in this tree. Another agent is working in `.claude/worktrees/` on the outbox worker (`services/enterprise-api/src/worker/outbox.ts`, migration 0027, outbox tests). Do not touch those files or that directory.

## Context: what exists (read these first)
**The logical position.** `app.planned_asset` (`database/migrations/0002_core.sql:125`) is the logical position in a room:
- `code PA-xxxx`, category, label, role, model (default 'generic'), placement x/y/z/rot/mount;
- `model_history` jsonb, lifecycle, removed_at.

There is no physical-asset table. A room's device is currently both the position and the hardware.

**Model substitution** is in `services/enterprise-api/src/domain/rooms.ts`:
- A PATCH of a device during recommissioning accepts a model substitution only.
- It appends to model_history, emits `commission.asset_replaced` through `ctx.emit` (the transactional outbox) and audits.
- The functions `recommissioning()`, `substitutions()`, `reverification()`, `recommissionImpact()` and `approveRevision` handle the rest.

**The shared rule.** `packages/commissioning-engine/src/substitution.ts` has `reopenedBySubstitution(rows, subs)`. The API and the demo both call it.

**The demo** (`apps/demo`) is a synthetic Visitor Mode. In `apps/demo/src/build/store.ts`:
- `swapDevice` creates a new device id on a swap, while the API keeps the same id and changes its model.
- Both approaches conflate the position with the hardware.

Also relevant in the demo: Room Story `apps/demo/src/story/assemble.ts`, Impact `apps/demo/src/build/impact.ts`, and the registry `apps/demo/src/registry.ts`.

**The end-to-end checkpoint.** `tests/e2e/checkpoint-room-lifecycle.e2e.mjs` (88 checks) writes evidence to `tests/evidence/checkpoint/`. Room R-PLN-0004, camera PA-0061 `generic` → `SYN-PTZ-12X`, 12 reopened tests, baseline v1 byte-identical.

**Tooling:**
- Build: `node scripts/build.mjs --studio`.
- Tests: `node scripts/test.mjs --browser --studio`. The film decode is the only allowed NOT_RUN.
- Database: `node scripts/db.mjs up` (port 55432).
- Migrations: `database/migrations/`; the latest is 0025. **Use 0026_device_installations.sql** (0027 is reserved for the outbox agent).
- The idempotency table is `app.idempotency_key`; check how routes use it. RLS is forced; `app.tenant_rls()` sets it up.
- Roles: empathia_owner, empathia_app, empathia_worker.
- OpenAPI: regenerate `docs/api/openapi.json` and `packages/api-client/src/generated.ts` with the repo's generator; `--check` must pass. Update the operation count in `packages/api-client/test/client.test.ts` and `docs/api/API_GUIDE.md`, and assert each new operation by name.

## The owner's requirements (verbatim intent)
- **Req 4, 18:51:** "A room's logical device position is distinguished from its physical asset identity, with the correct history for each." "a stable room position ID and a physical asset ID, with effective-dated installation records linking them". "A true replacement should not overwrite the original asset's history."
- **18:53:**
  1. "Prevent double installation of the same physical asset" (one device must not occupy two positions).
  2. "Atomic replacements in one transaction (close old, open new, record event, invalidate affected results); a failure leaves no inconsistency."
  3. Safe migration of existing records: "Unknown serial numbers should remain explicitly unknown, never fabricated as verified equipment identities."
- **18:55:** external notifications and connector events go through the transactional outbox (`ctx.emit`), never as external calls inside the DB transaction.
- **Req 1:** the demo and the API share the same authoritative camera-replacement and recommissioning rules, with no duplicate or divergent logic.
- **Req 2:** reopened tests require new execution and independent verification. Historical PASS_VERIFIED records are preserved but never count toward re-acceptance.
- **Req 3:** baseline v1 is preserved immutably, and a model change creates a detectable deviation.
- **Req 5:** "Never fabricate missing evidence."
- **Req 6, negative paths:** stale evidence, unauthorized approvals, duplicate actions, conflicting revisions, failed operations, changed device models, re-acceptance without retesting.

## Build this

### A. Schema (0026)
- **`app.physical_asset`.**
  - Columns: tenant, a stable code (for example `AS-xxxx`), category, model (immutable after creation), and `serial` nullable.
  - `identity_state`: UNKNOWN / DECLARED / OBSERVED / VERIFIED. Enforce with CHECKs that UNKNOWN ⇔ serial IS NULL. VERIFIED requires evidence.
  - Make serial unique per tenant and model when present.
- **`app.asset_installation`.**
  - Columns: position (planned_asset), asset (physical_asset), installed_at, removed_at, reasons, actors, and the event/correlation id.
  - Add an effective-date basis column, so a migrated row says honestly that its start is "known as of migration", not a fabricated install date.
  - Partial unique indexes: one open installation per position, and one open installation per asset.
  - Prevent overlapping periods per asset and per position, either with an EXCLUDE constraint (btree_gist is available locally and is a trusted extension) or with a trigger. Say which you used and why.
- **Append-only.** No DELETE. The only UPDATE allowed is closing an open row once (removed_at, plus the removal reason and actor). Enforce it with a trigger and with column grants.
- RLS on both tables. Grants by least privilege.
- **Migration of existing rows.**
  - Every current position whose lifecycle means hardware is in place gets one physical_asset with serial NULL and identity UNKNOWN, plus an open installation with the migration basis. Read the codebase for which lifecycle values mean that; for example INSTALLED_UNVERIFIED and later states, not PLANNED.
  - Do not invent serials, dates or verification. Keep `model_history` as the position's design history.
  - Test the migration: no fabricated serials, every migrated identity UNKNOWN, a row count per eligible position.

### B. A shared pure model in `packages/commissioning-engine` (for example `src/installations.ts`)
- **Planning and validation.** A replacement plan is: close the current installation, open the new one, and decide whether it is a like-for-like physical replacement (same model, different unit) or a model substitution (a design change).
- **Refusals:** an asset already installed elsewhere, no current installation, a stale expected installation, an identity downgrade.
- **Reverification for any change of physical unit at a position.** Use `reopenedBySubstitution`; extend it, do not fork it. Its reason wording must distinguish "replaced by another unit of the same model" from "substituted by a different model".
- **Byte-identical output for the existing substitution.** The existing model-substitution output for the checkpoint's 12 tests must stay byte-identical. Prove it with a diff of the normalised step-15 evidence, as was done before: keep a copy before you start.
- **Design re-approval** is required only for a model change.
- **Parity fix 1.** The general acceptance blocker in `packages/commissioning-engine/src/lifecycle.ts` (the "acceptance needs every applicable test executed, passed and independently verified … X of Y" check) currently counts results that a substitution has superseded. Make it exclude them, in both callers, so stale PASS_VERIFIED can never count, even if the specific blocker were bypassed. The API's 422 will gain an accurate count reason. Update the tests to assert it; that adds an assertion and weakens nothing.
- **Parity fix 2.** The demo names reopened tests that were re-run but are not yet independently verified; the API gives only its general blocker. Produce that sentence in the shared engine so both say the same thing.

### C. API (one transaction for each mutation; DB constraints as the backstop)
- **Endpoints:**
  - install an asset at an empty position;
  - replace the unit at a position, atomically: lock the position, close the old installation, open the new one with a new or a spare asset, write the outbox event and the audit record, and invalidate the affected results;
  - the position's history (design/model changes plus its installation timeline);
  - the asset's history (installations across positions and rooms, plus its identity changes);
  - record an asset identity (UNKNOWN → DECLARED with a serial; OBSERVED/VERIFIED only with evidence).
- **Route the existing model-substitution PATCH through the same installation transaction.** The position code stays stable; a new physical asset of the new model is installed; the old one is closed with reason SUBSTITUTED and keeps its full history.
- **Concurrency and idempotency.** Mutations accept the existing Idempotency-Key mechanism. A precondition (the expected current installation, or the codebase's revision/ETag convention) makes concurrent conflicting replacements return 409.
- **Authorization.** Reuse existing authorities whose meaning matches. If you truly need a new one, justify it in your report. "Never invent additional event handlers, roles or permissions merely to satisfy a numerical target. Do not weaken least privilege."
- **The checkpoint e2e.** Extend it so the camera swap produces two installation records for PA-0061, the original asset's history survives intact, and the evidence shows both histories. Keep the existing 88 checks passing unchanged. Add new checks; never relax old ones.

### D. Demo
- The store models positions, physical assets and installations, using the same shared engine functions. Swapping keeps the position id stable and creates or installs a physical asset. Visitor Mode is synthetic, so label any serial as synthetic, or leave it UNKNOWN.
- The Room Story and the asset registry show position history separately from asset history.
- Update the demo unit and browser tests by adding checks; keep the existing ones.

### E. Negative-path tests (Req 6)
Put the API cases in a new `tests/security/recommissioning-negative.test.mjs`, registered in `scripts/test.mjs`. Add demo unit cases where the demo has the behaviour.
- **Stale evidence:** a pre-substitution result, or evidence attached before the swap, never satisfies the re-run.
- **Unauthorized approvals:** a revision's author approving it → refused; a person without the authority → refused; the same person running and verifying a result → refused; another tenant → not found.
- **Duplicate actions:** an Idempotency-Key replay returns the same response with no duplicate rows; a double approval and a double acceptance → 409.
- **Conflicting revisions:** approving a superseded or stale revision → 409; concurrent conflicting replacements → one wins, one gets 409.
- **Failed operations:** a forced failure part-way through a replacement rolls back everything: the old installation is still open, the new one is absent, and there is no outbox event, no audit row and no result invalidation. `/v1/audit/integrity` still verifies.
- **Changed device models:** a model change during recommissioning requires re-approval; a model change in an accepted room that is not being recommissioned → refused.
- **Re-acceptance without retesting:** refused with the named reasons; historical PASS_VERIFIED is still readable but counted as 0.
- **Double installation:** installing an asset that is open elsewhere → 409, and a direct SQL insert as empathia_app hits the unique or exclusion constraint.

## Rules (the owner's)
- Do not weaken, skip or delete tests. Report NOT RUN honestly; never as PASS. No fabricated results.
- Synthetic data only. No real company, customer or manufacturer names.
- Never use `pkill -f` or `pgrep -f`.
- Do not commit. I review and commit.
- Finish by running `node scripts/build.mjs --studio` and the full `node scripts/test.mjs --browser --studio`. Fix what you broke. Write an ADR in `docs/architecture/adr/` (look for the folder and its numbering) for the position/asset/installation model.

## Report back (concise)
- Files changed.
- The schema decisions: exclusion versus trigger, the grants, the basis column.
- The authority choices.
- The proof that the existing 12-test output is byte-identical.
- The new check names per area.
- The full matrix counts (PASS/FAIL/NOT_RUN per suite group).
- Open questions or residual risks.
````

