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

## Turn 503 — SendMessage to agent `ad94918ad61635425` (summary: "Resume installation work after interrupt")

(Not an Agent call; a message to the earlier "Installation records and negative paths" agent. The assistant then reported the agent could not be resumed and launched a restart, below.)

````
Resume the installation-records task: the user's interrupt stopped you at 19:32. You had not changed any files yet. The tree is clean at 457361d on restoration/sprint-0-1, and no database or processes are running; start the database again with `node scripts/db.mjs up`. Carry on from where your reading reached. Do not start over.

The owner has since added these points. Fold them into the same brief.

1. **Physical asset.** It is a separate identity: manufacturer, model and serial number when known, plus its own lifecycle history.
   - Add a nullable `manufacturer` column. Seed and demo data may only use fictional or synthetic makers, never real OEM names. Unknown stays NULL.
   - Historical device identity follows the physical unit, even when it moves to another position or room. The asset history must show that.
2. **Installation record.** It carries the responsible actors, the reasons and the supporting evidence references for each installation and removal.
3. **Migration.** It must be repeatable and safe: re-running it creates nothing twice. Test it independently, including a second run that changes nothing.
4. **Existing accepted design and evidence history remain immutable.** Prove that baseline v1 and the accepted revision are byte-for-byte unchanged after a physical replacement and after a model substitution.
5. **One reading of identity everywhere.** Lite, the Device Registry, Commissioning, Assurance, Search Party, Pro and Room Story must interpret the same identities and installation records consistently.
   - In the API, the read endpoints those surfaces use expose position code + current asset code + identity_state.
   - In the demo, the same three fields appear wherever a device is shown or linked. The asset registry and Room Story distinguish position history from asset history.
   - Assurance must detect a genuine installation change (a different physical unit), not only a model change. Label it differently from a model drift.
6. **Specific proofs the owner asked for.** Each needs an explicit test:
   1. a replaced asset's old verification results cannot authorize acceptance of the new installation;
   2. a new verifier independently verifies reopened tests;
   3. the accepted baseline is unchanged byte for byte;
   4. Assurance detects both model and installation changes;
   5. positions stay stable while asset identities change;
   6. the API and the demo use the same underlying rules: a test that runs the same shared function on the same input from both callers' adapters and gets equal output;
   7. no stale or contradictory status is presented as verified truth.
7. **Use real API calls and real DB transactions for the integration checks.** Never write directly to tables to manufacture a successful state. Direct SQL is allowed only to prove that a constraint refuses an invalid row (the double-installation and append-only checks), and the test must say so.
8. **Concurrent replacements and interrupted transactions.** Include two concurrent replacements on one position (exactly one wins) and an interrupted transaction (the client disconnects or the server throws mid-way): no partial rows, no outbox event, no audit row.

Everything else in your original brief stands: no commit, the full `node scripts/build.mjs --studio` plus `node scripts/test.mjs --browser --studio` at the end, an honest NOT RUN, and no weakened tests. Report as originally asked.
````

## Turn 503 — Agent: "Installation records and negative paths (restart)"

- subagent_type: (not specified)
- isolation: (not specified; main tree)
- run_in_background: True

### Prompt (verbatim)

````
You are implementing the owner's device-installation model and the checkpoint's negative-path tests in the Empathia monorepo. The repo is `/home/claude/empathia-technologies`, branch `restoration/sprint-0-1`, tip `457361d`, and the tree is clean. Work directly in this tree.

A previous attempt was interrupted before it changed any file; start from the code as it is. Another agent may work in `.claude/worktrees/` on the outbox worker (`services/enterprise-api/src/worker/outbox.ts`, migration 0027, outbox tests). Do not touch those files or that directory.

## What exists (read these first)

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

Also relevant in the demo: Room Story `apps/demo/src/story/assemble.ts`, Impact `apps/demo/src/build/impact.ts`, the registry `apps/demo/src/registry.ts`, and the Search Party estate `apps/demo/src/search/estate.ts`.

**The end-to-end checkpoint.** `tests/e2e/checkpoint-room-lifecycle.e2e.mjs` (88 checks) writes evidence to `tests/evidence/checkpoint/`. Room R-PLN-0004, camera PA-0061 `generic` → `SYN-PTZ-12X`, 12 reopened tests, baseline v1 byte-identical.

**Tooling:**
- Build: `node scripts/build.mjs --studio`.
- Tests: `node scripts/test.mjs --browser --studio`. The film decode is the only allowed NOT_RUN.
- Database: `node scripts/db.mjs up` (port 55432).
- Migrations: `database/migrations/`; the latest is 0025. **Use 0026_device_installations.sql** (0027 is reserved for the outbox work).
- The idempotency table is `app.idempotency_key`; check how routes use it. RLS is forced; `app.tenant_rls()` sets it up.
- Roles: empathia_owner, empathia_app, empathia_worker.
- OpenAPI: regenerate `docs/api/openapi.json` and `packages/api-client/src/generated.ts` with the repo's generator; `--check` must pass. Update the operation count in `packages/api-client/test/client.test.ts` (it is 151 now) and `docs/api/API_GUIDE.md`, and assert each new operation by name.

## The owner's requirements (verbatim intent)

**Logical room position.** "a stable room-position identifier representing the slot, purpose, mounting location, location geometry, and design history".

**Physical asset.** "a separate identity representing the actual installed device, manufacturer, model, serial number when known, and its own lifecycle history".

**Installation record.** "a dated relationship connecting a physical asset to a logical position, preserving installation and removal events, responsible actors, reasons, and supporting evidence".

**Invariants, in both the database and the application:**
- one active installation per room position;
- one active installation per physical asset;
- an asset cannot occupy two positions simultaneously;
- replacing equipment does not overwrite the previous physical asset's identity or history;
- existing accepted design and evidence history remain immutable;
- replacement transactions close the old installation, create the new one, record the relevant audit/outbox events, and reopen affected verification requirements atomically;
- failed replacement transactions leave the database unchanged;
- historical device identity follows the physical unit even when it moves;
- existing records migrate without inventing serial numbers or falsely claiming identity verification;
- migration is repeatable, safe, and independently tested.

"Make sure Lite, the Device Registry, Commissioning, Assurance, Search Party, Pro, and Room Story interpret the same identities and installation records consistently."

External notifications and connector events go through the transactional outbox (`ctx.emit`), never as external calls inside the DB transaction.

**The shared rules.** The demo and the API share the same authoritative camera-replacement and recommissioning rules, with no duplicate or divergent logic.

**Reopened tests.** They require new execution and independent verification. Historical PASS_VERIFIED records are preserved but never count toward re-acceptance.

**Baselines.** Baseline v1 is preserved immutably, and a model change creates a detectable deviation.

**Evidence.** "Never fabricate missing evidence."

**Explicit proofs the owner wants:**
1. A replaced physical asset's old verification results cannot authorize acceptance of the new installation.
2. A new verifier independently verifies reopened tests.
3. The accepted baseline remains byte-for-byte unchanged.
4. Assurance detects genuine model AND installation changes.
5. Logical positions remain stable while physical asset identities change.
6. The API and demo use the same underlying engineering rules.
7. No stale or contradictory status is presented as verified truth.

**Adversarial tests.** Cover stale evidence, old-camera test reuse, unauthorized approvals, duplicate actions, conflicting revisions, concurrent replacements, interrupted transactions, partially failed operations, tenant-boundary violations, overlapping installations, and baseline mutations.

"Use real API and database transactions for the integration checks rather than writing directly to database tables to manufacture successful results." Direct SQL is allowed only to prove that a constraint refuses an invalid row, and the test must say so.

## Build this

### A. Schema (0026)

**`app.physical_asset`.**
- Columns: tenant, a stable code (for example `AS-xxxx`), category, `manufacturer` nullable, model (immutable after creation), and `serial` nullable.
- Seed and demo data use only fictional or synthetic makers, never real OEM names. Unknown stays NULL.
- `identity_state`: UNKNOWN / DECLARED / OBSERVED / VERIFIED. Enforce with CHECKs that UNKNOWN ⇔ serial IS NULL. VERIFIED requires an evidence reference.
- Serial is unique per tenant + manufacturer + model when present.

**`app.asset_installation`.**
- Columns: position (planned_asset), asset (physical_asset), installed_at, removed_at, install and removal reasons, the actor of each, evidence references, and the event/correlation id.
- Add an effective-date basis column, so a migrated row says honestly that its start is "known as of migration", not a fabricated install date.
- Partial unique indexes: one open installation per position, and one open installation per asset.
- Prevent overlapping periods per asset and per position, either with an EXCLUDE constraint (btree_gist is available locally and is a trusted extension) or with a trigger. Say which you used and why.

**Append-only.** No DELETE. The only UPDATE allowed is closing an open row once (removed_at, plus the removal reason, actor and evidence). Enforce it with a trigger and with column grants.

**Access.** RLS on both tables. Grants by least privilege.

**Migration of existing rows.**
- Every current position whose lifecycle means hardware is in place gets one physical_asset with serial NULL, manufacturer NULL and identity UNKNOWN, plus an open installation with the migration basis. Read the codebase for which lifecycle values mean that; for example INSTALLED_UNVERIFIED and later states, not PLANNED.
- Do not invent serials, makers, dates or verification. Keep `model_history` as the position's design history.
- The migration is idempotent: a second run creates nothing.
- Test it: no fabricated serials or makers, every migrated identity UNKNOWN, one row per eligible position, and a second run that changes nothing.

### B. A shared pure model in `packages/commissioning-engine` (for example `src/installations.ts`)

**Planning and validation.** A replacement plan is: close the current installation, open the new one, and decide whether it is a like-for-like physical replacement (same model, different unit) or a model substitution (a design change).

**Refusals:** an asset already installed elsewhere, no current installation, a stale expected installation, an identity downgrade.

**Reverification for any change of physical unit at a position.** Use `reopenedBySubstitution`; extend it, do not fork it. Its reason wording must distinguish "replaced by another unit of the same model" from "substituted by a different model".

**Byte-identical output for the existing substitution.** The checkpoint's model-substitution output (the 12 tests and their reasons) must stay byte-identical. Copy `tests/evidence/checkpoint/15-verification-requirements.json` to a scratch folder before you start. At the end, diff the normalised file (timestamps and UUIDs replaced).

**Design re-approval** is required only for a model change.

**Parity fix 1.** The general acceptance blocker in `packages/commissioning-engine/src/lifecycle.ts` (the "acceptance needs every applicable test executed, passed and independently verified … X of Y" check) currently counts results that a substitution has superseded. Make it exclude them, in both callers, so stale PASS_VERIFIED can never count, even if the specific blocker were bypassed. The API's 422 will gain an accurate count reason. Assert it in the tests; that adds an assertion and weakens nothing.

**Parity fix 2.** The demo names reopened tests that were re-run but are not yet independently verified; the API gives only its general blocker. Produce that sentence in the shared engine so both say the same thing.

**Parity proof.** Write a test that feeds the same input through the API's adapter and the demo's adapter into the shared functions and asserts that the outputs are equal.

### C. API (one transaction for each mutation; DB constraints as the backstop)

**Endpoints:**
- install an asset at an empty position;
- replace the unit at a position, atomically: lock the position, close the old installation, open the new one with a new or a spare asset, write the outbox event and the audit record, and invalidate the affected results;
- the position's history (design/model changes plus its installation timeline);
- the asset's history (installations across positions and rooms, plus its identity changes; it follows the unit when it moves);
- record an asset identity (UNKNOWN → DECLARED with a serial; OBSERVED/VERIFIED only with evidence).

**Read endpoints.** Those used by the device registry, commissioning, assurance, search and Pro expose the position code, the current asset code and identity_state.

**Assurance.** It detects a physical installation change (a different unit), labelled differently from a model drift.

**Route the existing model-substitution PATCH through the same installation transaction.** The position code stays stable; a new physical asset of the new model is installed; the old one is closed with reason SUBSTITUTED and keeps its full history.

**Concurrency and idempotency.** Mutations accept the existing Idempotency-Key mechanism. A precondition (the expected current installation, or the codebase's revision/ETag convention) makes concurrent conflicting replacements return 409.

**Authorization.** Reuse existing authorities whose meaning matches. If you truly need a new one, justify it in your report. "Never invent additional event handlers, roles or permissions merely to satisfy a numerical target. Do not weaken least privilege."

**Immutability.** Prove that baseline v1 and the accepted revision are byte-for-byte unchanged after a physical replacement and after a model substitution.

**The checkpoint e2e.** Extend it:
- the camera swap produces two installation records for PA-0061;
- the original asset's history survives intact;
- the evidence shows both the position history and the asset history.

Keep the existing 88 checks passing unchanged. Add new checks; never relax old ones.

### D. Demo

**Store.** The store models positions, physical assets and installations, using the same shared engine functions. Swapping keeps the position id stable and creates or installs a physical asset. Visitor Mode is synthetic, so label any serial as synthetic, or leave it UNKNOWN. Makers are fictional only.

**One reading of identity.** Wherever a device is shown or linked (Lite/Build a Room, the registry, Commissioning, Assurance, Search Party, Pro, Room Story), show the same position code + asset code + identity state. The Room Story and the registry show position history separately from asset history.

**Tests.** Update the demo unit and browser tests by adding checks; keep the existing ones.

### E. Negative-path tests

Put the API cases in a new `tests/security/recommissioning-negative.test.mjs`, registered in `scripts/test.mjs`. Add demo unit cases where the demo has the behaviour.

- **Stale evidence / old-camera reuse:** a pre-replacement result, or evidence attached before the swap, never satisfies the re-run.
- **Unauthorized approvals:** a revision's author approving it → refused; a person without the authority → refused; the same person running and verifying a result → refused; another tenant → not found.
- **Duplicate actions:** an Idempotency-Key replay returns the same response with no duplicate rows; a double approval and a double acceptance → 409.
- **Conflicting revisions:** approving a superseded or stale revision → 409.
- **Concurrent replacements on one position:** exactly one wins; the other gets 409.
- **Interrupted or partially failed operations:** a forced failure part-way through a replacement (a server-side throw, or a client disconnect) rolls back everything. The old installation is still open, the new one is absent, and there is no outbox event, no audit row and no result invalidation. `/v1/audit/integrity` still verifies.
- **Changed device models:** a model change during recommissioning requires re-approval; a model change in an accepted room that is not being recommissioned → refused.
- **Re-acceptance without retesting:** refused with the named reasons; historical PASS_VERIFIED is still readable but counted as 0.
- **Overlapping or double installation:** installing an asset that is open elsewhere → 409, and a direct SQL insert as empathia_app hits the constraint. That test says it is a constraint proof.
- **Baseline mutation:** any attempt to change an accepted baseline is refused, and the bytes are unchanged.
- **Tenant boundary:** another tenant cannot read or replace positions, assets or installations (404).

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
- The byte-identical proof for the 12-test output.
- The new check names per area.
- The full matrix counts (PASS/FAIL/NOT_RUN per suite group).
- Open questions or residual risks.
````

## Turn 503 — SendMessage to agent `a098690563b8344ea` (outbox agent; summary: "Outbox follow-up: replay identity, failure kinds, malformed events")

````
Outbox follow-up: three more verification items from the owner, plus one doc fix. Same worktree, same branch (restoration/outbox-delivery-0027). Add a second commit on top of 53c6324 with the same two attribution lines. Same database port (55433) and the same rules: write the test first, record the result before the fix, never weaken a test, report NOT RUN honestly.

1. **"Replayed events retain appropriate original identity and traceability."**
   - Prove that a replay keeps the event's id, type, aggregate (type, id, rev), tenant, payload bytes and correlation_id unchanged.
   - Prove that the replay is linkable both ways: from the event to the audit record of each replay, and from the audit record to the event.
   - Prove that the delivery receipts after the replay reference the same event id.
   - If a link is missing, add it in 0027. For example, a replay count or last-replay audit id on the event, or a query the admin read uses.
2. **"Transient failures, retries, and permanent failures are distinguishable."**
   - Today a failure is retried until MAX_ATTEMPTS. Make the kind of failure visible in the event's record and in the admin listing: TRANSIENT (retrying, with next_attempt_at), PERMANENT (attempts exhausted), and NON_RETRYABLE (see item 3).
   - Test each one.
3. **"Unauthorized or malformed events are rejected."**
   - The `packages/event-contracts` package exists; read it. The worker must not hand a handler an event that fails its contract: an unknown type, a payload that fails the contract's schema, an unknown or mismatched tenant, or an aggregate rev that is missing or invalid.
   - Such an event is dead-lettered immediately as NON_RETRYABLE, with its reason. It is not retried 8 times, and later events of the same aggregate stay held behind it, as the ordering rule requires.
   - Replaying a NON_RETRYABLE event that still fails its contract is refused (422) with that reason. Payloads cannot be edited through the API.
   - Also test that an event row inserted by a role that should not be able to write to the outbox is refused by grants or RLS. That is a constraint-proof test, and it must say so.
4. **Regenerate the stale docs** you flagged: `ENDPOINTS.md` and `RBAC_MATRIX.md`, if a generator exists. If none exists, say so.

Keep the real Teams/Outlook connector as NOT_RUN / NOT_CONNECTED. A stub-sink pass is not proof of a live connector.

Report briefly: the new tests, the result before and after, the defects found, the files, the suite counts, and the commit sha.
````

## Turn 504 — SendMessage to agent `a098690563b8344ea` (summary: "Fix per-aggregate ordering to use commit order, not producer rev")

````
One more outbox fix: the per-room ordering defect you flagged as a residual risk. Same-room ordering is an owner requirement, so it must be fixed before the ordering check can count as passed.

**Where to work.** I rebased your two commits onto the checkpoint commit 457361d. Your worktree is now on branch `restoration/outbox-on-457361d` at `ff0a6ad`: d557bda and 3e9c0ac are your commits, and ff0a6ad regenerates the inventory (151 operations). The build and the OpenAPI check pass there. Keep `restoration/outbox-delivery-0027` as it is. Commit on top of ff0a6ad, with the same database port (55433) and the same rules.

**The defect.** Ordering follows the producer's `aggregate_rev`, and many producers hard-code it:
- `commission.test_failed` always sends rev 1 on a Room. A test failure appended after a room event at rev 5 is treated as earlier and can overtake it.
- Work orders use the state position (assigned 2, accepted 3, …, reopened 6+n). After a reopen, a new assignment gets rev 2 again, so it orders before the reopen.
- Issue events send 1 or 2.

**The fix.**
1. Do not rely on producers. In the emit path (inside `ctx.emit`'s transaction), assign a per-aggregate sequence `aggregate_seq` that follows the commit order for each (tenant, aggregate_type, aggregate_id). Two ways:
   - a head row in an `outbox_aggregate_head` table, using `INSERT … ON CONFLICT DO UPDATE SET last_seq = last_seq + 1 RETURNING`;
   - or a transaction-scoped advisory lock taken before the sequence is read.

   The row or lock must be held until commit. Then a later-committing producer on the same aggregate always gets a higher sequence.
2. Order delivery and the "held behind" rule by `aggregate_seq`. Keep `aggregate_rev` unchanged as the domain's revision for consumers. Backfill existing rows in 0027 from (aggregate_rev, seq) in their current order.
3. **Deadlocks:** work out the lock order when one transaction emits for several aggregates (for example a Room, then a RoomIssue). If two code paths can take them in opposite orders, either make the order consistent or explain why it can't deadlock. Add a test where two concurrent transactions emit on the same two aggregates.

**Tests (write them first; record the result before the fix):**
- A producer that sends a lower rev after a higher rev on the same room: delivery follows commit order.
- Two concurrent API transactions on the same room: their sequences follow commit order, and both succeed.
- A work order that is reopened and then reassigned: delivery follows commit order.
- Everything already in `outbox.test.mjs`, `api.test.mjs` and the security suites still passes unchanged. If an existing assertion encoded rev ordering, tell me exactly which one and why, before changing it.

Then run the build and the integration and security suites (all of them), and report:
- the commit sha;
- the before and after results;
- the files changed;
- the lock design and the deadlock reasoning;
- the suite counts.
````

## Turn 519 — Agent: "Parity, ordering and open defects"

- subagent_type: (not specified)
- isolation: (not specified; main tree)
- run_in_background: True

### Prompt (verbatim)

````
You are fixing the last release-blocking defects of the Empathia restoration checkpoint. The repo is `/home/claude/empathia-technologies`, branch `restoration/sprint-0-1`, tip `84eb9c3`, with a clean tree apart from regenerated evidence. Work directly in this tree; no other agent is running. Do not commit; I review and commit.

## Context
On this branch the API and the investor demo share `packages/commissioning-engine`:
- `substitution.ts`: `reopenedBySubstitution`, `reverificationBlockers`;
- `installations.ts`: the replacement plan;
- `lifecycle.ts`: `lifecycleBlockers`, including the acceptance count that excludes superseded results.

The owner's rule: "API and demo workflows reflect the same domain rules and refusal reasons", with "no duplicate or divergent logic".

Supporting material:
- the checkpoint e2e: `tests/e2e/checkpoint-room-lifecycle.e2e.mjs` (97 checks; evidence in `tests/evidence/checkpoint/`);
- the demo: `apps/demo/src/build/store.ts`, `BuildRoom.tsx`, `impact.ts`, `ImpactPanel.tsx`;
- demo tests: `apps/demo/test/*.test.mjs` and `tests/browser/demo.test.mjs` (C-01…C-36);
- the API: `services/enterprise-api/src/domain/rooms.ts` (`recommissionBlockers`, `approveRevision`, `recommissionImpact`) and `reverification.ts`;
- the negative-path suite: `tests/security/recommissioning-negative.test.mjs`;
- `docs/adr/ADR-0012-positions-physical-assets-installations.md`;
- `docs/qa/DEFECT_REGISTER.md`, D-19…D-37.

## Fix these, in this order

### D-38 (P1, new): a design-binding rule exists only in the API
- **The API's rule.** `recommissionBlockers` in `rooms.ts` refuses re-acceptance while the approved revision no longer describes the room after a model substitution: "the design changed while the room is recommissioned (…) and the approved revision N no longer describes it: revision M needs approval (room.design.approve, not its author) — the re-acceptance binds the approved revision".
- **The demo's gap.** The demo (`store.ts` `transition` → `lifecycleConditions`) has no such rule. After a model substitution or a category swap during recommissioning, it re-accepts and publishes baseline v2 bound to the old approved revision, which no longer describes the room.
- **The fix.**
  1. Move the rule into the shared engine, for example a design-binding fact in the lifecycle gate facts: whether the approved revision describes the current design, plus the substitutions.
  2. Make the API and the demo both use it. Produce the sentence once, in the engine, with the same wording.
  3. Give the demo the matching action: during COMMISSIONING, save the changed design as a new revision, and let someone other than its author approve that revision. This mirrors the API's `POST /v1/rooms/:room/revisions/:rev/approve`, with the same refusal for the author and for a persona without `room.design.approve`.
  4. Bind baseline v2 to the newly approved revision.
- **Which changes need re-approval.** A like-for-like unit replacement (same model) does NOT need design re-approval, in either the API or the demo: the design is unchanged. A model substitution or a category swap does.
- **Tests.**
  - Update the demo browser and unit tests that re-accept after a model or category change (for example C-19b…C-19e) so they perform the design re-approval step. Add checks that re-acceptance is refused without it, with the engine's sentence.
  - Do not delete or loosen any existing assertion. Where an existing assertion's expected flow changes, say exactly which one and why.
  - Extend the API/demo parity unit test so it covers this sentence too.

### Blocker ordering (owner: "correctness of acceptance-blocker ordering")
**Current state.** The API now lists open issues, then the reopened-tests sentence, then the design sentence. Before 76c48f0 it listed the design sentence before the reopened tests.

**The rule to implement.** Define one documented order in the shared engine, used by both the API and the demo: the order in which the work must be done and by whom.
1. The design binding (approve the revision that the re-acceptance binds).
2. Open issues (closed with their retests).
3. The reopened tests (re-run and verified independently, with the count when they are the only gap).
4. The general acceptance count, when other results are missing.

**Where to record it.** Document it in ADR-0012, or in a short section of the commissioning docs, with the reason. Assert the exact order in the checkpoint e2e (steps 15 and 17), and in a demo check with the same wording.

**Byte-identical rule.** Keep each reopened test's entry byte-identical (testId, reasons, assets, personas, rerun, result). Copy `tests/evidence/checkpoint/15-verification-requirements.json` to a scratch folder before you start, then diff the normalised entries at the end. Only the ORDER of the blocker sentences may change.

### D-35 (P3): the Idempotency-Key check is not atomic with the handler
Two concurrent requests with the same key can both execute.
- Find the idempotency mechanism (`app.idempotency_key`, migration 0004, and its use in the routes or server).
- Reserve the key inside the handler's transaction (or with an insert-first reservation), so that a concurrent duplicate waits and then replays the stored response, or gets 409. Exactly one execution, either way.
- Add a regression test with two concurrent requests carrying the same key on a mutating route (for example a replacement or a result record): exactly one effect.

### D-36 (P3): checkpoint e2e evidence is listed in a nondeterministic order across runs
Make the e2e's evidence output deterministic: sort by a stable key where the order is not meaningful. Do not reorder data whose order is meaningful, such as chronology or blocker order. Prove it by running the e2e twice and diffing the evidence after normalising timestamps and UUIDs.

### D-37 (P3): two outbox ordering probes compare `aggregate_rev`
In `tests/integration/outbox.test.mjs`, the "three concurrent workers" ordering probe and the stub sink's `earlierUndelivered` check compare `aggregate_rev`. Delivery is now ordered by `aggregate_seq`, the database-assigned commit order. Make them compare `aggregate_seq`, which proves commit order directly. Keep their existing expectations, adding to them rather than removing.

## Rules (the owner's)
- Do not weaken, skip or delete tests. Report NOT RUN honestly; never as PASS. No fabricated results.
- Synthetic data only.
- Never use `pkill -f` or `pgrep -f`.
- Keep the forced-failure hooks gated: NODE_ENV=test, plus EMPATHIA_FAILPOINTS, plus a test database name.
- If you change routes, regenerate `docs/api/openapi.json`, `packages/api-client/src/generated.ts` and `node scripts/docs/api-inventory.mjs`, and update the operation count in `packages/api-client/test/client.test.ts` (156 now). Prefer no new routes.
- The demo's design re-approval is a client-side action in the synthetic store, not an API route.
- At the end, run `node scripts/build.mjs --studio` and the full `node scripts/test.mjs --browser --studio`. The film decode is the only allowed NOT_RUN. Fix what you broke.
- Then update `docs/qa/DEFECT_REGISTER.md`:
  - add D-38;
  - for D-35, D-36, D-37 and D-38, set the state, the fix (by file) and the regression test name;
  - leave D-32, D-33 and D-34 open, as they need the owner or a deployment.

## Report back (concise)
- Files changed.
- For each defect: root cause, fix, regression test, and the result before and after.
- The documented blocker order and where it is asserted.
- The byte-identical proof.
- Any existing assertion whose flow you had to change, and why.
- The full matrix counts per suite group.
````

## Turn 540 — SendMessage to agent `a24774711c6ea06fc` (the "Parity, ordering and open defects" agent; summary: "D-39: align demo design-edit rules with API")

````
Your work is committed as a4957d5. The tablet and Tally edits you saw were mine. One more parity defect is in scope now; please take it as D-39 with the same rules: no commit, write the tests first, never weaken an assertion, report NOT RUN honestly.

**D-39 (P2): the demo allows design edits that the API refuses.** You found one case: design changes during first commissioning, before any baseline. There is a second: adding or removing devices during recommissioning. In the API:
- `POST`/`PATCH` of devices is PLANNED-only;
- an accepted room under recommissioning accepts only a model substitution (through the installation transaction) and a like-for-like unit replacement;
- anything else is refused with the API's sentence ("… is being recommissioned: only a model substitution is accepted …", and its PLANNED-only refusal).

The demo instead lets a device be added (lighting, a ceiling microphone) or removed during recommissioning or first commissioning, with re-approval.

**What to do:**
1. **Read the API's actual rules first.** Do not assume my summary: check `rooms.ts` device create, update and delete, and the lifecycle states that permit them.
2. **Put the edit-permission rule in the shared engine,** as a function of (lifecycle, recommissioning?, change kind) that returns the refusal sentence or null. Make the API and the demo both use it, with the same sentences. The API's wording should stay byte-identical where it already exists.
3. **Demo behaviour.** Edits that the rule refuses are refused with that sentence and are recorded in the demo's ledger as DENIED, the same as other refusals. The UI disables or explains the control rather than offering it.
4. **Existing demo tests that relied on the looser rule.** For example: B-15f…k (lighting added during recommissioning), C-11 if it runs outside PLANNED, and any cascade test that adds or removes during commissioning.
   - Change the scenario so the same coverage still runs where the rule allows it. For example, add the microphone while PLANNED, or as a model substitution.
   - Add explicit refusal checks for the now-refused edits.
   - Tell me exactly which assertions changed meaning and why. Delete no coverage.
5. **The 403 wording for revision approval.** The API's 403 comes from the central route check and quotes the route summary, while the demo says "may not approve a design revision". Make the authorization refusal for this action read identically in the API and the demo, preferring the engine's sentence. If changing the central route check is too broad, the demo can quote the API's exact sentence; tell me which you chose.
6. **Parity tests.** Extend the PARITY test, the API's negative-path suite (one refused add or remove during recommissioning, and one during first commissioning) and the demo tests.
7. **Clean up.** Drop the scratch database `empathia_test_d35_probe`.
8. **Finish.** Run `node scripts/build.mjs --studio` and the full `node scripts/test.mjs --browser --studio`, then update `DEFECT_REGISTER.md` (D-39: root cause, fix by file, tests, state).

**Report:**
- the files;
- the rule as implemented, as a table of state × change → allowed or the sentence;
- the changed assertions;
- the parity and negative test names;
- the matrix counts per group.
````

## Turn 540 — SendMessage to agent `a24774711c6ea06fc` (summary: "Add journey screenshot capture after D-39")

````
One addition after D-39 and your full matrix run: capture the owner's Living Room journey as screenshots for the investor-facing evidence.

Write a small script, `scripts/evidence/journey-screens.mjs`, that drives the built demo with Playwright. Reuse the flows from `tests/browser/demo.test.mjs`, but do not change that test. Use the demo's own server, as the tests do.

**Viewports and file names.** Run it at 1440×900 and at 390×844, with reduced motion. Save numbered PNGs to `/tmp/handoff/screens/journey/<width>/NN-<stage>.png`.

**The stages, in order:**
1. Lite: the room designed in Build a Room.
2. The design approved (revision preserved).
3. The commissioning plan with why each test applies.
4. Results independently verified, and baseline v1 accepted.
5. Recommissioning started.
6. The physical camera replaced: the Impact panel before and after, and the register showing the position kept and the unit changed.
7. The reopened tests with their reasons.
8. Assurance: drift against baseline v1.
9. Search Party: the dependency change.
10. Pro: the measures that changed, and those that did not.
11. Design re-approval (for a model substitution, if your flow has one), then the re-run, independent verification, and re-acceptance as baseline v2 with v1 SUPERSEDED.
12. The Room Story with the whole sequence.

**Captions.** Also write `/tmp/handoff/screens/journey/INDEX.md`: one line per screenshot, saying what it shows and which engine rule produced it. Say plainly that the demonstration runs on synthetic data.

Do not commit the PNGs (`tests/evidence/**/*.png` is git-ignored, and these live in `/tmp/handoff`). Do commit-ready the script itself.

Report the file list. If a stage can't be reached in the demo, say so plainly rather than staging it.
````

