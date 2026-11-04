# Brief: the owner's reference-room decisions (2026-11-01 07:41) — implement on the integrated branch

Read `/tmp/p2chk/BRIEF_COMMON.md` first (repo orientation, non-negotiable rules, report format). Your worktree starts at the integrated
branch tip (Core Replay + FI scan + Search Party merged; golden sha fd666f28…). Read `docs/phase2/CORE_REPLAY.md`,
`docs/phase2/FIELD_INTELLIGENCE_SCAN.md`, `docs/phase2/SEARCH_PARTY_HERO.md`, `packages/campus/src/history.ts` (the camera change and
re-acceptance, steps 10–11), `packages/campus/src/party.ts`, `apps/demo/src/replay/*`, `apps/demo/src/workspace/store.ts`.

## Owner decisions, verbatim
1. "Approve camera AS-0112 and baseline v2 as the canonical synthetic post-change scenario state, preserving v1 and its evidence history.
   Core Replay playback must remain read-only; merely watching or scrubbing must never mutate authoritative room state. Use an explicit
   scenario-application action where state changes are intended."
2. "Retain EXC-4218-01 as a proposed synthetic viewing-distance exception. Do not treat it as valid acceptance until the source requirement
   permits an exception, an authorized independent reviewer approves it, and the evidence, rationale, scope, and revision binding are
   recorded. Otherwise, show pending approval."
   Follow-up choice: **"v2 held, explicit approval"** — At rest: AS-0112 installed, v2 recorded as PENDING ACCEPTANCE, EXC-4218-01 pending
   approval, v1 still the last accepted baseline (room shows recommissioning held). An explicit, labelled demo action "Approve exception
   (synthetic independent reviewer)" records evidence/rationale/scope/revision and lets the engine accept v2 in the demo workspace.
3. "Approve the proposed Search Party support organization and competency mappings as clearly labeled synthetic demonstration fixtures,
   with coherent provenance and no implied real contracts or verified employee credentials."
4. "Approve list-first mobile Search Party. Keep a compact interactive graph with expandable categories, accessible list equivalents,
   accurate relationship counts, and no hidden information that users cannot discover."
Also from task #338 (controlled change, owner rules): exceptions only where the governing requirement actually permits one, with evidence,
scope and EXPIRATION recorded; unknown waivability is treated as non-waivable; never by the change's author; mandatory tests can never be
waived by review.

## What to build
A. **Canonical data at rest (packages/campus/src/history.ts):** keep every event up to and including the independent verification of the
   12 re-run tests. Replace the APPROVED `policy.exception_decided` and the acceptance (`room.lifecycle_changed` → ACCEPTED,
   `handoff.accepted`, `assurance.baseline_superseded`, the declared OPERATIONAL step) with:
   - `policy.exception_requested` (state PENDING_APPROVAL) by the requester (not the reviewer), carrying: exception id, the finding
     (`sightline:A-0101`, Medium, the engine's own rationale), the **source requirement** reference, rationale, scope (which seats / finding
     key / position), revision binding (design id + revision 2), evidence references, proposed expiry, and reviewer = null.
   - the engine's gate result recorded honestly: `lifecycleBlockers` with the open finding → refused; the room stays COMMISSIONING
     (recommissioning held). v1 stays CURRENT (last accepted, in force); v2 exists as `PENDING_ACCEPTANCE` (add the state to the Baseline
     type; adjust consumers). The replay's chapter 9/10 end at "acceptance held: exception pending approval".
   - **The source requirement**: a synthetic, labelled requirement record for the viewing-distance check (e.g. `REQ-DSN-SIGHTLINE-01`,
     MODELED planning ratio 6–8 × image height, from the synthetic organization's design standard) whose waivability is declared
     explicitly (e.g. `PERMITS_DOCUMENTED_EXCEPTION`, with conditions: independent reviewer with role X, evidence, scope, revision binding,
     expiry ≤ 12 months). Label it SYNTHETIC, never a real standard. If you can't ground it, mark waivability UNKNOWN and then the action must
     refuse — but prefer the explicit synthetic declaration so the demo can complete.
B. **Explicit scenario action (demo workspace only, never canonical):** a clearly labelled control — on the room's commissioning tab and at
   the end of the camera replay — "Approve exception EXC-4218-01 · scenario action · synthetic independent reviewer". It shows a review
   form with every required field pre-filled from the request (requirement + its waivability, reviewer role and name (synthetic, not the
   requester or designer), evidence, rationale, scope, revision binding, expiry) and a confirm step. Validation lives in a pure function in
   `packages/campus` (e.g. `exceptionDecision(request, review, requirement)`) that refuses: requirement not permitting exceptions or
   UNKNOWN; reviewer = requester/designer/recorder; missing evidence/rationale/scope/revision/expiry; revision mismatch; mandatory-test
   waiver attempts. On confirm, the demo workspace records the approval and the engine's gate is re-run → v2 ACCEPTED (and v1 SUPERSEDED)
   **in the demo workspace view only**; OPERATIONAL is not claimed (the engine requires live monitoring evidence — show that). Implement
   as a dataset overlay: e.g. `campus(scenario?)` / `applyScenario({ excApproval })` in packages/campus returning a derived dataset
   (canonical events + appended scenario events labelled `scenario: 'demo-workspace'`), with the demo reading the active scenario from its
   workspace store (persisted like other demo state, resettable with the existing Reset). Every page (room, replay, story, Search Party,
   FI scan, APEX, KPIs, ledger, Mission Control) must agree in both states. A "Reset scenario" returns to the canonical held state.
C. **Read-only replay (decision 1):** prove it: a browser test that plays, scrubs and chapter-jumps through both replays and asserts
   localStorage/sessionStorage, the workspace store and the room's rendered state are byte-identical before and after. A unit test that
   the replay engine has no write path.
D. **Search Party fixtures (decision 3):** audit labels: every support-organization node, agreement, team, person and competency says
   synthetic; agreements read as "synthetic support agreement (demonstration fixture)", no real company implied (Brightwater must read
   as fictional), competencies show "Internal competency · declared/lab-evidenced/reviewer-verified", never "certified". Unit test.
E. **Mobile Search Party (decision 4):** at 360 px list-first; the compact graph has expandable category groups ("+N more" expands in
   place and is keyboard reachable), each group header shows the accurate count (assert equals the list/graph model count), and every
   record in the graph is reachable from the list and vice versa. Browser test at 360.
F. Update every test whose expected values change because the resting state changed (baseline current = v1, v2 pending, room
   COMMISSIONING, exception pending) — values only, never weaker assertions; list each changed assertion in your report. Re-pin the golden.
   Run: packages/campus, apps/demo/test, demo-replay, demo-fi-scan, demo-search-scenarios, demo-campus, demo, demo-ux, learn-labs,
   demo-enquiry. Update CORE_REPLAY.md, CANONICAL_CAMPUS.md, REFERENCE_ROOM.md, SEARCH_PARTY_HERO.md, FIELD_INTELLIGENCE_SCAN.md.
