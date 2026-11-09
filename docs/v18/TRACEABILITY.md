# v1.8 traceability — the 90 new requirements, as of 9 November 2026

One row per v1.8 requirement. **Tested** means a test in this repository ran and passed on the current build, and names it.
**Partly** says what is covered and what is not. **Not started** means no code. Nothing is marked from a document.
The 1,009 v1.7 requirements and 562 v1.7 scenarios are preserved unchanged (`node scripts/verify/baseline-preserved.mjs`) and are
**not** claimed as passed here: each stays NOT_RUN until a test in this repository runs it.

Tests named below: `registry` = `packages/proof-registry/test/*` (22), `api` = `tests/security/proof-registry.test.mjs` (12),
`proof` = `tests/browser/demo-proof.test.mjs` (56, light and dark), `worlds` = `tests/browser/demo-worlds.test.mjs` (67, light and dark) and
`tests/unit/demo-worlds.test.mjs` (7), `pilot` = `tests/browser/website-pilot.test.mjs` (54, light and dark), `commercial` =
`packages/commercial/test/*` (15).

## Proof Center (16)

| ID | What it asks | Status | Evidence |
|---|---|---|---|
| V18-PROOF-01 | Registry owns each claim: id, capability, owner, revision | Tested | registry; proof PC-01, PC-05 |
| V18-PROOF-02 | Verification state, data kind and approval kept apart | Tested | registry; api (CHECK constraints); proof PC-03 |
| V18-PROOF-03 | Claim links to tests, environment, timestamps, method, evidence ids | Partly | Method, date, source type and evidence ids are stored and shown. Links to individual test ids are not stored |
| V18-PROOF-04 | Only approved sanitized derivatives are public | Tested | registry; api (derivative test, row policy) |
| V18-PROOF-05 | Tenant proof APIs enforce identity and role | Partly | api: tenant isolation and staff scope tested. Site grants are not applied to claims |
| V18-PROOF-06 | Approval gate; no self-publication | Partly | api: request then approve, founder organization only. The requester and approver may be the same person (no second-person rule yet) |
| V18-PROOF-07 | Live observations downgrade when stale | Tested (rule only) | registry: stale and expiry downgrade; api: expiry over HTTP. No live source exists, so nothing live has ever been downgraded |
| V18-PROOF-08 | A revoked connector invalidates dependent claims | Not started | Claims are not yet linked to connectors |
| V18-PROOF-09 | Synthetic can never be lab or live proof | Tested | registry; api (API and database both refuse) |
| V18-PROOF-10 | Vendor capability matrix only when tested and authorized | Not started | No vendor capability is claimed anywhere |
| V18-PROOF-11 | Limitations stated; no fabricated badges | Tested | Every claim carries limitations; proof PC-02; website `/proof` |
| V18-PROOF-12 | Public proof opens a sanitized demonstration route | Tested | proof PC-08, PC-09 |
| V18-PROOF-13 | Evidence integrity: sha256, version, retention | Partly | Exports carry a SHA-256 (proof DS-09). Registry evidence rows hold an id only |
| V18-PROOF-14 | Website, demo and sales export read one projection | Tested (two of three) | proof PC-04, PC-05; api. No sales export exists |
| V18-PROOF-15 | Status in words and to assistive tech | Partly | States are words, not colour (both sites). No screen-reader run recorded |
| V18-PROOF-16 | Proof analytics without customer identifiers | Not started | No analytics are collected at all |

## Four worlds (16)

| ID | What it asks | Status | Evidence |
|---|---|---|---|
| V18-JOURNEY-01 | Four worlds first | Tested | worlds |
| V18-JOURNEY-02 | Four to six journeys per world, plus advanced | Tested | worlds (5 each) |
| V18-JOURNEY-03 | The 52 role configurations preserved | Tested | worlds unit (13/14/13/12, ids from the v1.4 matrix); baseline fingerprint |
| V18-JOURNEY-04 | Context menus per world and journey | Partly | Per-world wording and landing. The shell menu itself does not change per world |
| V18-JOURNEY-05 | Selection is not authority | Tested | worlds; worlds unit |
| V18-JOURNEY-06 | Reset and re-authorize on switch | Tested (demo) | worlds S-16, S-17. The demo has no server; the API side is not built |
| V18-JOURNEY-07 | Late work cannot paint after a switch | Tested (demo) | worlds |
| V18-JOURNEY-08 | Old deep links and Back still work | Tested | worlds; existing demo suites |
| V18-JOURNEY-09 | Skip and advanced | Tested | worlds |
| V18-JOURNEY-10 | Useful guest path, synthetic | Tested | worlds |
| V18-JOURNEY-11 | Same label, different world, distinct policy | Partly | Configurations are distinct records; the demo policy still has 15 roles |
| V18-JOURNEY-12 | Phone layout and targets | Tested | worlds at 390 px |
| V18-JOURNEY-13 | Keyboard and screen reader | Partly | Keyboard tested. No screen-reader run recorded |
| V18-JOURNEY-14 | A use case within three interactions | Tested | worlds |
| V18-JOURNEY-15 | Preference persists only with consent | Tested | Nothing is persisted: the choice lives in the address |
| V18-JOURNEY-16 | Wrong-world, empty and blocked states | Partly | Owl page and empty states exist. No unavailable-connector state (no connectors) |

## Pilot readiness (16)

| ID | What it asks | Status | Evidence |
|---|---|---|---|
| V18-PILOT-01 | Four pilot fees and scopes unchanged | Tested | commercial; pilot WP-exact |
| V18-PILOT-02 | $9.99 seat, SIGNAL prices, no double billing | Tested | commercial (quote rules); pilot |
| V18-PILOT-03 | Readiness preflight | Tested | pilot WP-fixture-*, WP-unsupported |
| V18-PILOT-04 | No secret collected | Tested | pilot WP-nosecret, WP-nothing-leaves |
| V18-PILOT-05 | Four eligibility classes with reasons | Tested | pilot; commercial |
| V18-PILOT-06 | Terms transparent before commitment | Tested | pilot WP-terms, WP-total |
| V18-PILOT-07 | Entitlement only after verified webhook | Partly | State machine and signature check exist and are unit-tested (commercial). No API route, so nothing runs end to end |
| V18-PILOT-08 | Webhook idempotency | Partly | Same: rules and schema only |
| V18-PILOT-09 | Refund and dispute lifecycle | Partly | Same: rules only |
| V18-PILOT-10 | Separate customer connector consent | Partly | Same: rules and schema only |
| V18-PILOT-11 | Read-only default | Not started | No connector exists |
| V18-PILOT-12 | First telemetry provenance | Not started | No telemetry exists |
| V18-PILOT-13 | Bounded scope | Partly | Readiness check enforces it (pilot WP-scope); database guard written, not run |
| V18-PILOT-14 | Same identities on conversion | Not started | |
| V18-PILOT-15 | Exit and export policy | Not started | |
| V18-PILOT-16 | Buyer's first-outcome checklist | Not started | |

## Performance (16)

| ID | Status | Evidence |
|---|---|---|
| V18-PERFORMANCE-01 No initial 3D download | Tested (worlds selector) | worlds: no 3D chunk is requested until asked |
| V18-PERFORMANCE-02 2D fallback | Partly | The three new worlds are 2D. Not tested with WebGL disabled across Enterprise |
| V18-PERFORMANCE-03 to -05 LCP, INP, CLS | NOT_RUN | No field measurement exists; no figure is claimed |
| V18-PERFORMANCE-06 to -10, -13 to -16 | Not started | No measurement harness, queue or RUM |
| V18-PERFORMANCE-11 Video usable without stream | Partly | Website films have posters, captions and transcripts (existing suite) |
| V18-PERFORMANCE-12 Reduced motion | Partly | Existing suites cover reduced motion on earlier screens; new screens use no motion |

## Film 13 (16)

All sixteen are **not started**. No film, scene, narration or caption file for Film 13 exists. The existing films are unchanged
(V18-FILM-01 holds by not having been touched; it has no test).

## Governance (10)

| ID | Status | Evidence |
|---|---|---|
| V18-GOV-01, -02 Baseline unchanged | Tested | `scripts/verify/baseline-preserved.mjs`: 1,009 and 562 identifiers all present in v1.8 |
| V18-GOV-03 Source hashes | Partly | Recorded in `docs/recovery/SOURCE_RECONCILIATION_2026-11-09.md`; originals kept outside this public repository |
| V18-GOV-04 ADR approval | Not done | ADR-021 to ADR-025 remain PROPOSED; no reviewer acceptance |
| V18-GOV-05 No release from documents | In force | This file |
| V18-GOV-06 Demo cannot reach real systems | Tested | Every demo suite fails on any request off the page's origin |
| V18-GOV-07 Safe founder authority | Partly | Founder boundary tests exist (earlier work). No MFA |
| V18-GOV-08 Human sign-offs | Not done | No human review has been recorded; none is claimed |
| V18-GOV-09 Rollback exercises | Partly | Migration 0029 down and up tested. No staging rollback exercise |
| V18-GOV-10 Founder approvals | In force | Staging only; production cut-over and public pricing await approval |

## Count

Of 90: **30 tested**, **20 partly**, **38 not started, not done or not run**, and 2 are working rules in force rather than features. A "tested" row is tested on synthetic data in this repository;
none is verified on customer equipment, and none is live.
