# Restoration release candidate: both websites (2026-10-31)

**Status:** release candidate frozen for the owner's inspection. **Not merged, not published, not deployed.** `main` (`ea84222`) and the
live sites are unchanged. This is not a production-readiness claim: the gate below shows what was verified and what was not.

| | |
|---|---|
| Branch | `restoration/sprint-0-1` |
| Tested revision (code) | `b5d152f`; the matrix ran there, and the clean-copy rehearsal ran on `9fa4a55`, which has the same code plus evidence and documents |
| Final commit (adds this report and evidence only) | see `git log -1`; `git diff b5d152f HEAD --stat` lists documentation and evidence only |
| Handoff bundle | `empathia-restoration-sprint-0-1.bundle` (`ea84222..restoration/sprint-0-1`) with its `.sha256`, applied as in `docs/operations/TERMUX_HANDOFF.md` |

## 1. Commits on the branch since `main`

| Commit | Purpose |
|---|---|
| `7514eca` | Sprint 0–1: public-site audit, website rebuilt, founder page, films behind a rights gate |
| `27e3733` | Warm, inviting Poppins type (self-hosted, OFL), warmer text, rounder controls |
| `8602931` | Design system: the Figma update recorded |
| `892023d`, `3e7a0a9`, `7c18339` | CI release blockers removed; release profiles; the fresh-run fixes; Termux steps |
| `457361d` | Checkpoint: room recommissioning through the API; the shared reopened-tests rule; Room Story and Impact in the demo; three demo truth fixes |
| `76c48f0` | Positions, physical assets and installation records (ADR-0012); recommissioning negative paths |
| `2493126`, `7698fa4`, `bfa9883`, `674f2c7` | Outbox: crash redelivery, per-room commit order, tenant-confined handling, audited replay, failure kinds, contract rejection |
| `28963af` | Enquiries through the owner's hosted Tally form on both sites; privacy notice |
| `7325cf2`, `84eb9c3` | API inventory regenerated (156 operations); migration test after the merge; defect register D-19…D-37 |
| `a4957d5` | D-38 shared design-binding rule; blocker order; D-35 atomic Idempotency-Key; D-36 deterministic order; D-37 commit-order probes |
| `30f1b45` | D-39 one design-edit rule for the API and the demo; the same 403 wording; journey screenshot script |
| `b5d152f` | Release-candidate UX fixes from the final review (Search Party, APEX, rail, boundary pages, 12 px labels) |

## 2. Test matrix on the tested revision

`node scripts/test.mjs --browser --studio`, then `node scripts/verify/no-unexpected-skips.mjs --profile=platform`.

| Group | Suites PASS / FAIL / NOT_RUN | Tests passed |
|---|---|---|
| Unit (engines, packages, demo modules) | 17 / 0 / 0 | 269 / 269 |
| Integration (API, leads, client, integration worker, observability, installation migration, outbox) | 7 / 0 / 0 | 63 / 64; the one not passed is the outbox suite's explicit NOT RUN test for a live Teams/Outlook connector |
| Security (authorization, tenancy, governance, recommissioning negative paths and others) | 19 / 0 / 0 | 169 / 169 |
| E2E (checkpoint room lifecycle, website lead form over the API, Town Hall, service) | 5 / 0 / 0 | 144 / 144 |
| Browser (enterprise web, public website, demo, demo enquiry, demo release UX, Founder Studio) | 6 / 0 / 0 | 429 / 429 |
| Deploy (site audit, static headers, dist hygiene) | 3 / 0 / 0 | 204 / 204 |
| Media (film decode) | 0 / 0 / 1 | NOT_RUN |

Release gate: **RELEASABLE (platform): 57 PASS, 0 FAIL, 1 NOT_RUN (all named by the profile)**. The matrix ran on `b5d152f`, with
the log in `tests/evidence/TEST_RESULTS.md` and the gate in `tests/evidence/RELEASE_GATE.json`.

**Not run, and why:**
- **Media:** full decode of every curated film. It needs the founder's film masters, which are not in the repository, and takes
  about 47 minutes. It is allowed only by the `platform` profile. The `media` profile allows no skip, so any release that ships a film
  must run it.
- **Integration, outbox:** "external delivery to a live Teams/Outlook connector". No connector exists. Delivery, deduplication and
  ordering are proven against a local stub sink only, which is not proof of a live Microsoft connector.

**Clean-copy CI rehearsal:** `node scripts/release/verify-fresh.mjs --ci` in an empty clone that reads nothing outside it.
**PASS.** Commit `9fa4a55` (the same code as `b5d152f`, plus evidence and documents) was cloned into an empty directory and run with
its own toolchain links and database cluster: build 41 s, tests 620 s, release gate RELEASABLE (platform). Fresh copy: PASS 57 ·
FAIL 0 · NOT_RUN 1. Workspace: PASS 57 · FAIL 0 · NOT_RUN 1. No suite differs between the two. Evidence is in
`tests/evidence/FRESH_CHECKOUT.{json,md}`.

## 3. Defect disposition (D-19 to D-39)

The full register, with root causes, fixes by file and regression tests, is in `docs/qa/DEFECT_REGISTER.md`.

| ID | Sev | Subsystem | Disposition | Fix commit | Regression test |
|---|---|---|---|---|---|
| D-19 | P0 | Outbox worker: tenant context, cross-tenant writes | Fixed | `2493126` | `outbox.test.mjs` tenant isolation |
| D-20 | P1 | Outbox: same-room overtaking | Fixed | `2493126` | `outbox.test.mjs` ordering |
| D-21 | P1 | Outbox: producer-supplied rev used for ordering | Fixed | `674f2c7` | `outbox.test.mjs` real producers, concurrent edits, opposite-order deadlock |
| D-22 | P1 | Outbox: malformed events delivered | Fixed | `7698fa4` | `outbox.test.mjs` contract |
| D-23 | P1 | Outbox grants: payload rewritable by the app role | Fixed | `7698fa4` | constraint-proof test |
| D-24 | P2 | Outbox replay: no reason, wrong status, thin audit | Fixed | `2493126`, `7698fa4` | `outbox.test.mjs` replay identity and traceability |
| D-25 | P2 | Outbox effects outside the database | Fixed against a stub; **live connector NOT RUN** | `2493126` | `outbox.test.mjs` SIGKILL redelivery |
| D-26 | P1 | Acceptance count included superseded results | Fixed | `76c48f0` | engine "never counts a superseded PASS_VERIFIED"; RN suite |
| D-27 | P1 | Position and physical unit were one record | Fixed | `76c48f0` | RN-01…16, MIG-1…6, checkpoint C-89…C-97 |
| D-28 | P2 | Assurance compared ids only | Fixed | `457361d`, `76c48f0` | assurance-engine tests; C-29 |
| D-29 | P2 | Demo truth: FUNDED, project history, 4.218 baseline | Fixed | `457361d` | `records.test.mjs`; A-03, A-03b |
| D-30 | P2 | Demo kept the removed device's results | Fixed | `457361d` | C-10c…C-10e, C-19b…C-19e |
| D-31 | P3 | Website: unconfigured-form notice | Fixed | `28963af` | W-*-noform |
| D-32 | P2 | Live privacy notice is wrong for Tally | **Open: deployment.** Fixed on the branch; goes live only with the approved deployment | `28963af` | W-*-privacy |
| D-33 | P3 | Tally form: "View Privacy Policy" is plain text | **Open: owner** (Tally checklist step 1) | — | — |
| D-34 | P3 | Outbox: no audited skip for a poison event | **Open: decision.** Mitigation: the event holds only its own room's later events until replayed after a fix; replay is audited | — | — |
| D-35 | P3 | Idempotency-Key not atomic | Fixed | `a4957d5` | RN-15 (failed before: 5 ≠ 4) |
| D-36 | P3 | Evidence order changed from run to run | Fixed | `a4957d5` | checkpoint C-100 |
| D-37 | P3 | Outbox probes compared `aggregate_rev` | Fixed | `a4957d5` | `outbox.test.mjs` commit-order probes |
| D-38 | P1 | Design-binding rule only in the API | Fixed | `a4957d5` | PARITY; C-98/C-99; C-19f…C-19j; B-15h…B-15k |
| D-39 | P2 | Demo accepted design edits the API refuses | Fixed | `30f1b45` | engine and demo "D-39"; PARITY over five states; RN-16; B-06b, B-15d, B-15l, C-37, C-10f |

No P0 or P1 defect is open. The three open items need a deployment (D-32), the owner's Tally edit (D-33) or the owner's decision (D-34).

## 4. Physical assets and installation records (ADR-0012)

Each requirement was proved through the real API and real database transactions. Direct SQL is used only in labelled
constraint-proof tests.

| Requirement | Proof |
|---|---|
| No unit installed in two positions | RN negative suite: an installation elsewhere gives 409; a direct insert hits the exclusion constraint (constraint proof) |
| No position with two active units | Partial unique index and EXCLUDE constraint; RN suite |
| Atomic replacement (close, open, outbox event, audit, reopened tests) | One transaction; the reopened tests are derived from the records on every read |
| An injected failure rolls everything back | Two failpoints mid-transaction plus a client disconnect: the old installation stays open, there is no new row, no outbox event, no audit row, and `/v1/audit/integrity` verifies. Failpoints fire only with NODE_ENV=test, EMPATHIA_FAILPOINTS **and** a test database |
| Old evidence readable, never counted | Pre-change evidence is refused for the re-run (BL-5, RN); the acceptance count excludes superseded results (D-26) |
| The 12 reopened tests are unchanged | Normalised step-15 diff: the 12 entries are byte-identical; only the order of the blocker sentences changed (documented) |
| Migrations keep data and can be rerun | MIG-1…6: no fabricated serial, maker, date or identity; every migrated identity UNKNOWN; a second run changes nothing |
| The accepted baseline cannot be altered | Baseline v1 stays byte-identical through the substitution, re-approval and re-acceptance (checkpoint e2e); a mutation attempt is refused (RN) |
| API and demo use the same rules and reasons | `reopenedBySubstitution`, `planReplacement`, `designEditRefusal`, the design-binding rule and the blocker order live in the shared engine; the PARITY test runs both adapters on the same input |
| Cross-tenant authorization across requests, workers, events and replay | RN tenant boundary (404); the outbox handles each event in its own tenant's context; a replay across tenants gets 404 |

## 5. Security, transactions and the outbox

| Check | Result |
|---|---|
| Per-room events follow the real commit order under concurrency | Commit-time sequence (`aggregate_seq`); 5 rounds of 3 concurrent edits; an opposite-order deadlock scenario commits both every round |
| An earlier failed event is never overtaken | Later events are held behind a pending, retrying or dead-lettered head |
| Workers set the tenant context securely | Set per event before any handler runs; cross-tenant grants removed |
| Unauthorized and malformed events are rejected | Contract check before any handler; NON_RETRYABLE dead letter; the app role cannot rewrite an event (column grants) |
| Dead-letter replay | Security-admin only; a reason is required; 409 when the event is not dead-lettered; audit records who, why, prior attempts, last error and outcome; the integrity chain verifies |
| Replayed events keep their identity | Same id, type, aggregate, tenant, payload bytes and correlation id; linked to their audit records |
| Duplicate delivery after a crash | DB effects exactly once; effects outside the database deduplicated by `outbox:<event>:<sink>` (stub sink) |
| Failure kinds | TRANSIENT, PERMANENT and NON_RETRYABLE, visible in the admin listing |
| Idempotent requests | One execution per key under concurrency (RN-15) |

## 6. The Living Room journey

**Through the API** (`tests/e2e/checkpoint-room-lifecycle.e2e.mjs`, 100 checks; request and response evidence in `tests/evidence/checkpoint/`):
1. A room designed in Lite and approved by someone other than its author.
2. The adaptive commissioning plan, with independently verified results.
3. Baseline v1 accepted.
4. The camera's model substituted during recommissioning: two installation records, and the original unit's history intact.
5. The 12 reopened tests, with their reasons.
6. Design re-approval.
7. Search Party dependencies, the Room Story and the Pro analytics.

**In the investor demo:**
- Browser checks C-01…C-37 and B-flow.
- 22 screenshots at 1440 and 390 px in the handoff (`screens/journey/`, recaptured on the final build, 44 in all, none of the 12 stages unreached; `INDEX.md` names each screen and the engine rule behind it).
- Release-candidate screenshots of both sites at 360, 768 and 1440 px in `screens/rc/` (website: 16 pages; demo: 13 addresses).
- The journey covers: Lite design, approval, plan, verification, baseline v1, recommissioning, the substitution's impact (12 reopened tests, Assurance drift against v1, Search Party, Pro: no passport changes and the panel says so), refusal with the reasons in the documented order, re-approval by a non-author, re-run, independent verification, baseline v2 with v1 SUPERSEDED, and the Room Story.
- The like-for-like physical replacement (same model, new unit; no design re-approval) is checked by C-28…C-31.

Everything in the demo is synthetic and says so.

## 7. Tally enquiries (owner-approved link-out; nothing changed in Tally)

**Entry points:** every website entry point opens `https://tally.so/r/VpG0Vy` in a new tab (`noopener noreferrer`), with the disclosure beside it:
- Request a demonstration;
- Pilots;
- Partnerships;
- Contact;
- Founder;
- About, Investor conversations.

The demo has four entry points on the investor start and a footer link on every page.

**Unchanged:** the CSP; the enterprise API lead route and its e2e (6/6).

**Privacy notice:** names Tally as processor, EU storage as Tally states it, its US email sub-processor, and retention.

**Before public rollout, the owner's checklist** (`docs/operations/LEAD_CAPTURE_TALLY.md`):
1. Link the form's privacy text.
2. Add reCAPTCHA.
3. Decide on email notifications.
4. Approve 12-month retention.
5. Make one real test submission.
6. Confirm the deployed privacy notice.

The hidden `source` field for attribution (owner's choice) is planned in task #337 and is not applied.

## 8. Final UX review (both sites, 360 / 768 / 1440)

**Website.** 48 page×width checks with no findings: no sideways scroll, broken image, failed request, console error, clipped text,
off-screen control or text under 12 px. The site audit (`--strict`, 164 page×width checks over both sites) has P0 0 and P1 0.

**Demo.** Six genuine defects were found and fixed (`b5d152f`), each with a regression check (`demo-ux.test.mjs`, 24 checks; 14 fail on the pre-fix build):
- Search Party names wrapped one letter per line on phones.
- APEX rows squeezed their cards.
- "Investor start" was scrolled out of view.
- "Pro" opened a not-migrated page.
- Boundary pages offered no way on.
- 11 px labels.

**Optional refinements, not release blockers, scheduled after this checkpoint:**
- task #337: founder presence and source attribution;
- task #338: controlled change management;
- task #333: product imagery from the demo;
- tasks #314–#317: considered motion;
- task #334: one type family across the two sites (the demo uses the shared UI font, not Poppins);
- films: they stay out until the rights evidence is on file;
- the remaining 86 legacy addresses in the demo, which state their migration status honestly.

## 9. Remaining limitations and production blockers

**For the two public static sites (the deployment you would approve):**
- D-32 is fixed only by deploying this branch.
- The Tally checklist.
- No films until their rights are verified.

**For the enterprise application (not deployed and not proposed for deployment):**
- No identity provider: OIDC/PKCE needs your IdP decision.
- No live connectors: Teams, Outlook and ITSM are NOT RUN.
- No production database or worker deployment.
- D-34 is your decision.
- The outbox deploy order: stop old workers before migration 0027.
- `btree_gist` must be available in the target PostgreSQL.

**Not measured:** LCP, INP and CLS field data, and sessions with real users.

## 10. Recommendation

**Ready for your review as a release candidate.** It is not "production-ready" and makes no such claim. The engineering gates for this
checkpoint pass on the tested revision, with the two NOT RUN items explained above. No P0 or P1 defect is open, and the API and the
demo share one set of commissioning, installation and design-edit rules, with a parity test to prove it.

**To publish the two static sites:**
1. Inspect them (the screenshots in the handoff, or the branch built locally).
2. Approve the deployment.
3. Merge `restoration/sprint-0-1` to `main` from your phone (`TERMUX_HANDOFF.md`).
4. Then complete the Tally checklist.

Rollback is one click in Render (Deploys → previous deploy → Rollback).
