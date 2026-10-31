# BUILD STATUS — Empathia web transformation (Living Campus V2.5.3 + Founder Studio)

Program: `legacy/mandate/MASTER_PROMPT.md` (phases P0–P9), executed in this monorepo on top of the founder master build
(see `EMPATHIA_MASTER_COMPLETION_REPORT.md` for what already existed). Governing architecture: `docs/adr/ADR-0001-two-applications-one-ecosystem.md`.
Labels: **DONE** (built and a named test passes here) · **PARTIAL** · **NOT_STARTED** · **NOT_RUN** (test not executed) · **BLOCKED** (needs
something this environment does not have). Nothing here is production-ready, certified or independently audited; nothing is deployed.

## Phase ledger

| Phase | Scope | Status | Evidence |
|---|---|---|---|
| P0 Source and parity | originals preserved and hashed; baseline browser runs; inventories from the committed source; parity ledger (both applications); risk table; ADR-0001 | **DONE** (this commit) | `legacy/source/SHA256SUMS.txt`, `legacy/baseline/*/baseline.json` + screenshots, `legacy/inventory/*.json`, `docs/legacy-parity.{md,csv}` (207 rows), §Risks below |
| P1 Foundation | monorepo tooling (exists), `apps/website` (pre-rendered public site, 12 pages) and `apps/demo` (investor shell over the legacy address space) on the shared tokens/ui, wired into build and test; `bootstrap/typecheck/test/build` proven | **DONE** | §P1 below; `node scripts/build.mjs` PASS; `node scripts/test.mjs --browser` 17 PASS / 0 FAIL / 3 NOT_RUN; `--studio` 19/19 + 25/25 |
| P2 Public website | complete public site, lead forms persisted via the API, admin inbox, no invented claims | **DONE** (email notification adapter BLOCKED on SMTP credentials; the inbox states it) | website 32/32, leads 5/5, website-lead e2e 6/6 |
| P3 Demo migration | V2.5.3 investor demo migrated into modular pages with the synthetic seed; A/B/C guided demos; reset | **STARTED — Build a Room native** (`apps/demo` `#/v25/build`: the real commissioning engine client-side; describe → design → classification → drawings → governed lifecycle → recording → independent verification → acceptance → baseline v1 → recommission; every refusal shown and ledgered; reset). Next: Search Party graph, commissioning plan views, seven guided scenarios | `tests/browser/demo.test.mjs` 31/31 (B-01…B-18 incl. phone width, no console error, no request leaves the page) |
| P4 Auth and data | tenant/org/site membership, RLS, private storage, audit — exists for the enterprise slice; founder boundary (P4F) and public lead store; **owner decisions 2026-10-30 12:59**: versioned baselines (ADR-0003), measurements + graph identity (ADR-0004), separation of duties + delegations (ADR-0005), personas/policy + administration (ADR-0006), founder platform-health contract (ADR-0007) | PARTIAL → P4F DONE; **decisions implemented at the API/DB layer with positive and negative tests; their UI is pending (P3/P6)**; OIDC BLOCKED on a provider | `tests/security` authz 45/45, founder-boundary 6/6, site-scope 3/3, authority-matrix 2/2, **governance 9/9, administration 5/5**; migrations 0011–0015 |
| P5 Lifecycle vertical slice | request → acknowledgement → pitch → approval → funding → brief → design → plan → tests → deficiency → documentation → handoff → baseline | PARTIAL (design → commissioning → **acceptance → baseline v1 → recommissioning → baseline v2** proven end to end over the API; governance front half NOT_STARTED) | `tests/integration` 20/20, `tests/e2e` 21/21 (prior program) |
| P6 Cross-product workspaces | Search Party, ServiceHands dispatch, Scouter proposals, 22 role journeys, Lite/FI, executive KPIs, Learn | NOT_STARTED (engines exist) | — |
| P7 Connector / FI boundary | capability adapters (MOCK exist), FI v1.3 passive, v1.4 entitlement machine | PARTIAL (MOCK adapters + conformance 5/5) | `integrations/` |
| P8 Security, reliability, quality | threat model, cross-tenant and cross-application negative tests, a11y, performance, backups | PARTIAL (backup/restore drill passed in prior program) | `docs/security` |
| P9 Deployment and handoff | staging from the owner's accounts, DNS/TLS, rollback | BLOCKED (no hosting account, domain or identity provider credentials supplied) | — |

## P0 — what was actually done (2026-10-30)

Files created: `legacy/source/**` (originals, unchanged; large files kept out of git, hashes tracked), `legacy/mandate/*`,
`legacy/inventory/v253-inventory.json`, `legacy/inventory/v254-founder-inventory.json`, `legacy/baseline/{v253,founder-edition,founder-studio}/`,
`scripts/legacy/{inventory-demonstrator,baseline-run,parity-ledger}.mjs`, `docs/legacy-parity.md`, `docs/legacy-parity.csv`, `docs/adr/ADR-0001-*.md`, this file.

Commands run and results:

| Command | Result |
|---|---|
| `sha256sum` of the attached V2.5.3 files | live `9d6e53ef…` and offline `ecbde0bb…` — identical to `SOURCE_AUDIT.json` and to the frozen 2.5.3 rc3 package (source commit cf86866) |
| `node scripts/legacy/inventory-demonstrator.mjs work/source-253/src …` | 230 modules, 86 address areas, 19 V2.5 pages, 14 UI roles, 22 personas, 32 record types, 101 events, 6 state machines, 78 search destinations, 6 tours, 661 action names, 126 test suites |
| same on the 2.5.4 source (Founder Edition) | same registry counts (2.5.4 = 2.5.3 + founder-program fixes) |
| `node scripts/legacy/baseline-run.mjs …` (Chromium) | V2.5.3 live/offline: 6.63 MB, load 0.82–1.02 s, lands on `#/investor`, 16/16 desktop + 4/4 phone routes screenshotted, 0 page errors, 0 external requests. Founder Edition 2.5.4: 7.98 MB, 0.85 s, 12/12 + 4/4 routes. Founder Studio (own localhost server, key-cookie): 0.15 s, 16/16 + 4/4 routes, 0 errors, one request to its local API health endpoint |
| `node scripts/legacy/parity-ledger.mjs` | 207 rows: target MIGRATED_REAL 167, MIGRATED_DEMO 35, DEFERRED_WITH_REASON 1, BLOCKED_EXTERNAL_DEPENDENCY 4; status now DONE (slice) 6, PARTIAL 86, NOT_STARTED 115; REGRESSION 0 |

Known limitation of the inventory: it lists address *families* (areas) and registries, not the ~41,000 entity-scoped addresses the
2.5.3 crawl audit visited; the crawl results remain in `Empathia_V25/work/v25-gates-253-audit/`.

## Checkpoint 1 and the class-A refinements — what was actually done (2026-10-30, after P1)

Two secure, persistent workflows now run end to end over the API and PostgreSQL, each behind its own authorization:

| Workflow | Application | Evidence |
|---|---|---|
| Public lead → stored → audited admin inbox → handled | Living Campus (website → API → enterprise web) | `tests/integration/leads.test.mjs` 5/5; `tests/e2e/website-lead.e2e.mjs` 6/6 (real browser, real API, admin inbox) |
| Build a Room → classification approval → drawings → commissioning results → independent verification → issue → work order → close (existing slice) | Living Campus enterprise app | `tests/integration/api.test.mjs` 20/20; `tests/browser/enterprise-web.test.mjs` 21/21 |
| Founder decision: record → DECIDED/REVISITED/WITHDRAWN with rationale → immutable revisions; workspace state with optimistic concurrency | Founder Studio (hosted) | `tests/security/founder-boundary.test.mjs` 6/6; `tests/e2e/founder-decisions.e2e.mjs` 9/9 |

**Neither application can read the other's restricted records** — tested: every enterprise principal (security admin, systems engineer,
a second tenant's admin) gets 403 on every founder route and the refusal is audited; the founder principal gets 403 on people, audit
and leads, empty rooms and sites, 404 on a demo room, 403 on creating one; a forged cross-organization sign-in is refused.

Red-team class-A findings fixed with tests: RT-01, RT-02 (work orders, evidence), RT-03 (central authority + 561-check matrix), RT-05,
RT-07, RT-08, RT-20 — see the register for before/after and evidence. Open class-B decisions are listed at the end of the register.

Full run at this commit: `node scripts/build.mjs` PASS (incl. dist hygiene); `node scripts/test.mjs --browser --studio`: 25 PASS, 0 FAIL,
1 NOT_RUN (film decode, slow). Regression on the Founder Studio as a local studio: 19/19 and 25/25 unchanged.

## 2026-10-30/31 — P4-A, P4-B, OIDC, one platform, source preservation, connectors (commits fbff495 … this)

| Item | Status | Evidence |
|---|---|---|
| Search Party (API + enterprise page) | IMPLEMENTED · TESTED | `packages/search-party` 5/5; `tests/security/search-party.test.mjs` 6/6 (site + tenant negatives); E2E W-22..W-27; demo Search Party page pending |
| Commissioning readiness strip + Acceptance & assurance tab | IMPLEMENTED · TESTED | `GET /v1/rooms/{room}/readiness`; E2E W-28..W-33 |
| OIDC production identity | IMPLEMENTED · TESTED against a local JWKS · NOT VERIFIED against a named provider | `tests/security/oidc.test.mjs` 4/4 |
| One platform shell (rail: Mission Control · Pro · Lite · Search Party · Commissioning & Assurance · Field Intelligence · Learn · Administration) in the enterprise app and the demo; product landings for Commissioning, Field Intelligence, Learn | IMPLEMENTED · TESTED | E2E W-34..W-37 (38/38); demo 31/31 |
| Typography via Adobe Fonts (Acumin Pro, kit `kis0uqz`, opt-in `FONT_KIT_ID`) | IMPLEMENTED (deployment setting) · NOT exercised in tests by design (offline) | `docs/design-system/DESIGN_SYSTEM.md` |
| Postman contract (spec + generated collection + environment) | DONE (verified by listing) | `docs/operations/CONNECTOR_MATRIX.md` |
| Source preservation package (bundle + archive + manifests, secret-scanned, restore verified) | DONE · delivered to the owner | `scripts/release/preserve-source.mjs`; `releases/source/` (ignored) |
| Deployment (CI workflow, production compose overlay, Caddyfile) | WRITTEN · NOT_RUN (no container runtime, no Git remote, no domain) | `docs/operations/DEPLOYMENT_GUIDE.md` |
| GitHub remote, Render services | BLOCKED (GitHub not linked) · AWAITING AUTHORIZATION (Render costs) | connector matrix |

Full run alone after each step: **32 PASS · 0 FAIL · 1 NOT_RUN** (film decode) as of P5; 30 suites before it.

### P4-C — the seven guided scenarios (2026-10-31)

| Item | Status | Evidence |
|---|---|---|
| Search Party in the demonstration (`#/search`, `?focus=Type:id`): the shipped `@empathia/search-party` package on a synthetic estate held in the page (2 buildings, 4 rooms, 2 switches, 1 PDU, 8 assets, 1 issue, 1 work order, 3 people, 1 baseline; the Build a Room draft merged in) | IMPLEMENTED · TESTED | demo S-01..S-05: impact of SW-ATL-4A names rooms 4.218/4.220/4.231; "what depends on this" is ANSWERED from DERIVED edges and says an unrecorded link is invisible; an unmodelled question is UNKNOWN; every edge shows provenance |
| Guided scenario runner (`#/tours/investor?scenario=n`): the 17 canonical V2.5.3 steps carried over verbatim (title, narration, persona, evidence label); perspective follows the persona; Previous/Next/jump; Reset & replay clears the draft; Close | IMPLEMENTED · TESTED | demo T-01..T-06 (every step opens a page, none errors, 10 of 17 say "not migrated yet" with the ledger status) |
| Step pages native: 1 (Search Party), 3, 4a, 4b, 5b, 5c (Build a Room) = 7 of 17; the other 10 (FI, FI PV, service ×2, APEX, Learn ×2, Mission Control, Executive, Ledger) are status pages that name their ledger row | PARTIAL · honest by construction | registry now resolves every `#/v25/<page>` to its own ledger row (19 V2.5 pages added to the generated registry; D-04 now covers 105 addresses) |
| Complete journey in Build a Room: create → design → approve → window → install → commission → record → independent verification → accept (baseline v1) → recommission → change (lighting control added) → re-record → re-verify → re-accept (baseline v2, v1 superseded) → compare | IMPLEMENTED · TESTED | demo B-01..B-18 incl. B-15c..B-15g (`[data-testid=lineage]`, `[data-testid=baseline-diff]`: "1 added", changed result labels) |
| Baseline deep links `#/v25/build?tab=checks|lifecycle` | IMPLEMENTED · TESTED | T-05 |

**Preservation defect found and fixed in this step (PD-01).** The generic `build/` line in `.gitignore` had silently excluded
`apps/demo/src/build/` (Build a Room: `store.ts`, `BuildRoom.tsx`) from every commit since 457e9f0 and from the delivered source package
`empathia-source-20261031-a9f184a.tar.gz` (its `FILES.json` has no `apps/demo/src/build` entry). The builds and tests passed because the
files existed in the workspace, so nothing detected it. Fix: the rule is now `/build/` with `!**/src/build/`; the two files are committed
here; the preservation package is regenerated from this commit. Guard added: `scripts/release/preserve-source.mjs` now refuses to package
when any file under a `src/` directory is ignored.

Demo browser suite: **46 checks**. Not done: scenario pages 2, 5 (service/APEX), 6 (Learn), 7 (Mission Control, Executive, Ledger) as native demo pages; tours A/B/C (lifecycle, workplace, engineer, founder, d2a) — ledger rows stay NOT_STARTED.

### P5 — governed project lifecycle (2026-10-31, ADR-0008)

| Item | Status | Evidence |
|---|---|---|
| `@empathia/project-governance`: the demonstrator's two state machines verbatim (11 + 12 states, 11 + 11 transitions with role, authority and guard), nine request types with their sources, every guard with the demonstrator's wording | IMPLEMENTED · TESTED | 9/9 unit tests (each guard positive and negative) |
| Migration `0017_project_lifecycle.sql` (request, brief, decision, funding, design revision, review, RFI; project governance/delivery columns; tenant RLS) | IMPLEMENTED · applied by every test database | harness |
| API: 17 operations (`/v1/requests…`, `/v1/projects/{code}/route|brief|approver|decision|funding|scope|design-revisions|rfis|delivery`, `/v1/projects/catalogue`, full project record) — OpenAPI 97 | IMPLEMENTED · TESTED | `tests/security/project-lifecycle.test.mjs` 12/12: one request carried intake → review → brief → approval (hold, scope revision, delegated approval) → funding → collaborative design (DIVR, domain reviews, RFI, release by a different person, geometry from the room) → execution (rule pack pinned, field attestation, technician accepts own work order, tests read from the room) → handoff (drawings + QA photo sign-off, customer acceptance via delegation, support owner, baseline) → project CLOSED; OPERATIONAL refused for want of monitoring evidence; tenant/site isolation; authority matrix 1003 checks over 59 keyed routes |
| Events: the demonstrator's 12 project/request/design/handoff event types on the outbox, validated by contract | IMPLEMENTED · TESTED | outbox counts asserted in the suite |
| Enterprise-web pages: request desk + intake drawer (`#/requests`), project record (`#/projects/{code}`: seven stages, next governed steps with blockers, every action behind its authority, briefs, decisions, funding, design revisions with reviews and RFIs, rooms' execution facts, audit) | IMPLEMENTED · TESTED | E2E W-38..W-46 (47/47): requester raises and submits; opslead routes (short exception refused with its reason), writes the brief, cannot select themself as approver; exec approves; finance funds; designer sees no step they do not hold |
| Demonstration step pages for scenarios 2, 5, 6, 7 | NOT BUILT (next) | — |
| Field gates computed from a staff skills registry; vendor quotes; the 36-column documentation tracker | NOT BUILT — recorded as attestation / out of scope in ADR-0008 | — |

Owner decisions of 2026-10-30 20:48 CT, implemented (ADR-0008 §Owner decisions): (1) the nine request types are provisionally approved and
the catalogue is tenant-configurable (`app.request_type`, `POST /v1/admin/request-types`, Administration → Request catalogue; CAT-1,
W-47/W-48); (2) concept authorization (an approved brief; preliminary design, feasibility, concept layouts, preliminary budgets) is separate
from execution authorization (funding; DETAILED design, release for construction, field steps) — `POST /v1/projects/{code}/concept`,
revision `phase`, engine guards `concept_authorized` / `…_and_funded`; APR-2, W-45a–d. OpenAPI 99 operations; lifecycle suite 13/13; E2E 53/53.

### Native demonstration experiences (2026-10-31, owner directive 20:48 CT)

| Item | Status | Evidence |
|---|---|---|
| `@empathia/service-engine` — the demonstrator's service machine (10 states, 9 transitions with authority and guard), `hardGates` / `candidates` (explained ranking) / `preflight` / `serviceBlockers`, CERTS, WORK_NEEDS, SLA, ported verbatim | IMPLEMENTED · TESTED | 5/5 |
| `@empathia/apex-engine` — seven layers, tiers A0–A5 with bounds, four runbooks (one unsigned, one safety-critical), the symptom library, `openCase` (ranked hypotheses with caveats and cited evidence), `act` (A4 preflight blocked by the real adapter state; dry run; simulated branches with compensation) | IMPLEMENTED · TESTED | 4/4 |
| `@empathia/kpi-engine` — the 27 KPI passports over a `Records` snapshot: numerator, denominator, window, coverage, freshness, confidence with reasons; NOT_MEASURABLE is never 0% | IMPLEMENTED · TESTED | 4/4 |
| SIGNAL library extracted unchanged from the frozen 2.5.3 build into `packages/domain-data/data/SIGNAL_LIB.json` (161 lessons, 223 checks, 91 labs, 146 drills, 121 incidents, 62 cases, 125 formulas, 522 terms; provenance recorded; forbidden-name scan clean), shipped beside the demo bundle and fetched on demand | DONE | `PROVENANCE.json` |
| Demo workspace (`apps/demo/src/workspace/store.ts`): one persisted, resettable state shared by ServiceHands, APEX, Learn, Mission Control, Executive and the ledger; every mutation authority-checked and engine-guarded; every outcome (refusals included) an event | IMPLEMENTED · TESTED | demo V/A/L/M checks |
| ServiceHands `#/v25/service`: manager queue (triage, hard-gated candidates with reasons, assignment, closure under the customer policy, reopening), technician jobs (context packet from the estate graph, acceptance, preflight on the record, evidence, hand-over), independent verification | IMPLEMENTED · TESTED | V-01..V-15 |
| APEX `#/v25/apex`: cases from incidents, seven layers with cites, ranked hypotheses, A0–A5 with bounds, runbook facts, A4 preflight (owner approval → window → occupancy → real adapter state → allowlist → rate limit → dry run → simulated branch), review | IMPLEMENTED · TESTED | A-01..A-09 |
| Learn `#/v25/learn`, `#/learn`: governed cases (permission, de-identification, no names, SME ≠ proposer, steward ≠ both), lessons with checks, 146 drills in six interactive kinds, canon casebook, formulas and glossary; training recorded as training only | IMPLEMENTED · TESTED | L-01..L-09; SIGNAL labs (91 simulators) NOT migrated |
| Mission Control `#/v25`: ten stations counting live records, needs-action by perspective, latest events | IMPLEMENTED · TESTED | M-01 |
| Executive `#/v25/exec`: 27 passports with window selection, passport detail; non-executive perspectives refused | IMPLEMENTED · TESTED | M-02..M-04 |
| Ledger `#/v25/ledger` and policy `#/v25/policy`: every event with actor/UTC/local, filters; the authorities each native page checks (from the code) + the demonstrator's role × area matrix (86 × 14) verbatim | IMPLEMENTED · TESTED | M-05, M-06 |
| `@empathia/field-intelligence` — v1.3 (declarations → PLAN_ONLY plan: capabilities DECLARED or UNKNOWN, a claimed OBSERVED downgraded, pairs NOT_TESTED with null measurements, monitoring NOT_RUN, exit codes) and v1.4 Physical Validation (licence → eligibility → five-step safety preflight by different authorities → dry run that emits nothing → commissioning-lead authorization → two-confirmation arming by the consenting operator only, labelled a simulation → point-by-point run with scripted abnormal branches → E-stop with restore). Read-only adapters ADP-SLM/ADP-STI; camera/DSP/loudspeaker adapters NOT_CONFIGURED | IMPLEMENTED · TESTED | 4/4 |
| Field Intelligence `#/v25/fi`, `#/v25/fipv`, `#/fabric`: the plan for any room (archetypes and the room draft), licences per site (platform admin only), sessions proposed by systems engineering, the preflight as a form that lists what is missing, arming, run, abnormal branches, E-stop; a visitor cannot grant a licence | IMPLEMENTED · TESTED | F-01..F-14 |
| Tour: 17 of 17 steps native | DONE | T-03 (`honest === 0`) |

Not built: SIGNAL labs (91 simulators); the enterprise app's service/APEX/executive/field-intelligence pages on the new engines
(the engines are shared packages, ready for the API). Demo browser suite: **101 checks**.

### P6-A — ServiceHands in the enterprise application (2026-10-31)

| Item | Status | Evidence |
|---|---|---|
| Migration 0019: the work order on the ten-state machine (`work_type`, severity → SLA, triage, window, assignment with its explained score, acceptance, recorded preflight, evidence with recorders, verification, reopen count, customer confirmation; assignee/window constraints), `app.work_order_event` (append-only, RLS), `app.staff_profile` (certifications with expiry, skills, sites, capacity, agreement; RLS); seeded profiles for the three technicians | DONE | migrate + seed through the real code in every suite |
| API: 12 routes under `/v1/work-orders` (list, record with next steps + candidates, triage, candidates, assign, accept, preflight, start, evidence, submit, verify, close, reopen) on `@empathia/service-engine` — authority before the body, the engine's guard with its reasons, append-only event, audit, contract-validated domain events (`work_order.assigned/accepted`, `service.field_completed`, `service.repair_verified`, `incident.reopened`); site scope through the room; the old close-from-OPEN is gone (one governed step at a time) | IMPLEMENTED · TESTED | `tests/security/service-lifecycle.test.mjs` SVC-1..SVC-10; api.test slice 6 and site-scope updated to the machine; authority matrix 1207 checks / 71 keyed routes; OpenAPI 111 operations |
| Enterprise web `#/service`: the queue (active / resolved and closed) and the work-order record — stages strip, next governed step with blockers and "not your authority", triage drawer (severity, work type, scope, risk, window), hard-gated candidates with reasons and one-click assignment, preflight drawer (access, safety, permits, tools, parts counted now), evidence drawer, verification drawer (separation stated), closure under the customer policy, reopening, the event list | IMPLEMENTED · TESTED | browser W-52..W-60 (65/65) |
| Not built | — | technician/vendor profile administration in the UI (profiles are seeded; the table and RLS exist); cancellation (no transition in the ported table); SLA clocks and breach alerts |

### P6-C — Executive passports in the enterprise application (2026-10-31)

| Item | Status | Evidence |
|---|---|---|
| `GET /v1/executive/passports?days=30|90|180|365`: `@empathia/kpi-engine`'s 27 passports computed over the organization's projects, decisions, funding, requests, work orders (resolution from the verification event), deficiencies, rooms and current baselines, in the caller's site scope; sources absent from the starter (documents, standards, SOP/SOW, device support ends, usage sessions, standardization profiles, field scans, consented participation) are named and their passports NOT_MEASURABLE — never 0% | IMPLEMENTED · TESTED | api.test "executive passports" |
| Enterprise web `#/executive` (linked from Reports): the board of 27 tiles with value, arithmetic, coverage and confidence; a passport opens with definition, window, freshness, confidence reasons, source, owner, privacy, version; window selector | IMPLEMENTED · TESTED | W-61..W-63 |

### P6-B — APEX in the enterprise application (2026-10-31)

| Item | Status | Evidence |
|---|---|---|
| Migration 0020 `app.apex_case` (one per deficiency; layers, hypotheses, actions, review; RLS) | DONE | every suite migrates through it |
| API: `POST /v1/issues/{issue}/apex` (open; idempotent per issue), `GET /v1/apex/cases`, `GET /v1/apex/cases/{case}` (layers citing the room's planned assets, ranked hypotheses, actions, review, the room's current baseline, the **real** adapter state from the integration catalogue — two local mocks DECLARED, nothing SUPPORTED_VERIFIED — tiers, runbooks, what the caller may do), `POST …/act` (A0–A5 on `@empathia/apex-engine`; A3 stages a real work order through `createWorkOrder` so only a role that may raise one succeeds — the refusal is the outcome and a DENIED audit; A4 blocked step by step, dry run then labelled simulation with branches, compensation audited, rate limit), `POST …/review` (verifiers; emits `apex.diagnosis_reviewed` with hypothesis and tier) | IMPLEMENTED · TESTED | `tests/security/apex.test.mjs` APX-1..APX-5; OpenAPI 117 operations |
| Enterprise web `#/apex`: case list, case record (layers, hypotheses, selected hypothesis with caveat/evidence/negatives/next, runbook facts, tier buttons with the A4 declarations, action log with every outcome, review); "Open APEX case" on a room's deficiency | IMPLEMENTED · TESTED | browser W-64..W-67 (72/72) |

### Connector expansion directive (2026-10-31 05:34 CT) — what was actually done

| Item | Status | Evidence |
|---|---|---|
| Discovery, read-only, of every listed connector (Sentry, Firecrawl, Netlify, Mermaid Chart, Mobbin, Superhuman Docs, Lovable, Hive, tldraw, Tally, Supabase) | DONE | `docs/operations/CONNECTOR_MATRIX.md` (auth state, operations seen, what was used) |
| `@empathia/observability`: one telemetry port, three transports (none / NDJSON file / Sentry envelope endpoint), scrubbing, sampling, release naming, 429 handling, no retries; wired into the API (500 → exception event with the problem's correlation id; every request a sampled transaction; fatal process handlers; `/health` telemetry status) and the browser (window errors, unhandled rejections, ErrorBoundary with a quotable reference, API ≥ 500 with the API's correlation id); release stamped from the commit by the build | IMPLEMENTED · TESTED | unit 10/10 · OBS-1..OBS-5 · W-49..W-51; `docs/operations/OBSERVABILITY.md` |
| Delivery to a live Sentry project | **NOT RUN** | no project exists; creating one is an external action awaiting owner authorization (runbook in OBSERVABILITY.md) |
| Sentry ingest contract read from Sentry's developer documentation via Firecrawl, with provenance | DONE | `docs/research/sentry-ingest-contract.md` |
| Generated architecture diagrams 10–15 (governance, delivery, service, Field Intelligence session — edges produced by driving the engine —, event flow, package graph), drift-checked by the build, rendered locally, two validated by Mermaid Chart | DONE | `scripts/docs/diagrams.mjs --check`; `docs/architecture/SYSTEM_ARCHITECTURE.md` |
| Netlify vs Render | DONE (recommendation: Render; nothing provisioned) | `docs/operations/HOSTING_COMPARISON.md` |
| Mobbin UI standards | NOT POSSIBLE (paid plan required) | matrix |
| Superhuman Docs, Lovable, tldraw, Tally, Hive, Supabase | inventoried; not used (no workspace, spends credits, or duplicates the repository) | matrix |

Full regression after this milestone: **38 PASS · 0 FAIL · 1 NOT_RUN** (films not decoded).

## Owner decisions of 2026-10-30 12:59 CT — what was actually done

Each approved decision has an ADR, a migration, API contract entries (OpenAPI regenerated: 74 operations), positive and negative tests
over real HTTP and PostgreSQL, and parity-ledger rows (10 new "governance" rows, maturity 4–5 at the API layer; their UI is pending and
is said so in the ledger — a route existing is not a migrated feature).

| Decision | ADR | Migration | Routes | Tests |
|---|---|---|---|---|
| RT-04 versioned immutable baselines | ADR-0003 | 0011 | `GET /v1/rooms/{room}/baselines`, exceptions request/decide; lifecycle gains the governed recommissioning step | governance BL-1…BL-4 |
| RT-14/15 measurements with provenance; graph identity by key | ADR-0004 | 0013, 0014 | `GET/POST …/measurements`, `POST /v1/measurements/{id}/verify`; `GET /v1/graph` identity block | governance MEAS-1; relationship 5/5 |
| RT-16 separation of duties; delegations | ADR-0005 | 0012 | `GET/POST /v1/delegations`, revoke; `/v1/me` shows `delegated` | governance SoD-1/2, DEL-1/2, BL-1 |
| RT-17 personas canonical; administration | ADR-0006 | 0015 | `/v1/admin/policy`, invitations (+ public accept), memberships | administration ADM-1…ADM-4 |
| Founder platform-health integration | ADR-0007 | — | `GET /v1/founder/platform-health` | administration FH-1 |

Demonstrated end to end (governance.test.mjs): a room is designed, the design author is refused to approve it, another engineer
approves; every applicable test is recorded by the commissioning engineer and verified by QA; QA (the verifier) is refused to accept;
QA delegates `customer.accept` to the operations lead for three days; the operations lead accepts (audited as delegated); baseline v1 is
published bound to the approved revision's hash, the plan, every result label and the evidence objects; the baseline cannot be changed
or deleted (EM005); the room is recommissioned, one test is re-run and verified, the re-acceptance publishes v2 which supersedes v1
with the lineage intact; an exception is requested by the technician and decided by the engineer, never by its requester.

Limitations stated: no UI yet for baselines lineage, measurements, delegations, invitations or the policy view (API only);
`WITHDRAWN` baselines have no route; invitation acceptance sets a development password (OIDC binding awaits a provider); the graph
client still addresses nodes by display code (keys are stored and reported).

One finding during this step: a first full regression run was accidentally started twice in parallel, and the two runs trampled each
other's test databases and ports (5 FAIL, all interference). The run was repeated alone: `node scripts/build.mjs` PASS; `node scripts/test.mjs --browser --studio` **27 PASS · 0 FAIL · 1 NOT_RUN** (film decode). The Founder Studio snapshot test now removes a leftover snapshot from an interrupted run before judging its own.

## P1 — what was actually done (2026-10-30)

Files created: `apps/website/` (content.tsx, site.tsx, form.tsx, prerender.tsx, main.ts, styles/site.css, build.mjs, server/serve.mjs),
`apps/demo/` (App.tsx, registry.ts, main.tsx, styles/demo.css, build.mjs, server/serve.mjs; `src/generated/parity.json` generated from the
ledger at build), `tests/browser/website.test.mjs` (32 checks), `tests/browser/demo.test.mjs` (11 checks); `scripts/build.mjs` and
`scripts/test.mjs` extended; `tooling/types/react-offline` gained `react-dom/server`.

Decisions: no framework in the public site's browser bundle (site.js 1.6 KiB; pages pre-rendered with React at build time; budget enforced:
home document ≤ 40 KiB, script ≤ 8 KiB); the demo keeps the legacy `#/` address space and resolves every one of the 86 areas to a native
page or a boundary page that states the area's parity status — nothing is blank, nothing pretends. Lead forms post to `POST /v1/public/leads`
(P2; the endpoint does not exist yet, and the form says so and disables itself until the deployment configures it). Next.js is not
installable in this environment (no registry access): ADR-0002 records the deployment architecture actually used.

| Command | Result |
|---|---|
| `node scripts/build.mjs` | PASS (type-check ui, enterprise-web, website, demo; bundles; OpenAPI/client match) |
| `node scripts/test.mjs --browser` | 17 PASS · 0 FAIL · 3 NOT_RUN (studio and films need their flags) |
| `node scripts/test.mjs --studio` | Founder Studio 19/19, founder town hall 25/25 (regression after P1: unchanged) |
| `node tests/browser/website.test.mjs` | 32/32: every page (1440 px and 390 px) has title/description/h1, no sideways scroll, no console error, no outside request, internal links resolve, phone menu by keyboard, forms state "not configured", no forbidden claim |
| `node tests/browser/demo.test.mjs` | 11/11: lands on `#/investor` with the synthetic banner, three start actions (launch largest on a phone), 85 legacy areas resolve with status, deep address → area, seven scenarios with problems |

## Risks — the ten regressions this program must not commit

| # | Regression | Guard |
|---|---|---|
| 1 | Replacing a working demonstrator page with an inert card or a screenshot | a route is MIGRATED only when its named test passes; the original stays served until then |
| 2 | Treating the demo persona picker as authorization | server policy on every operation (exists); persona ≠ role in P3/P4; negative tests |
| 3 | Collapsing project approval, funding, engineering approval and acceptance into one "approve" | separate state machines and actors (P5 tests 18–27) |
| 4 | Letting a simulated or inferred measurement become a measured or verified fact | provenance tags on every measurement field (P6B/P7 tests 22, 28–31) |
| 5 | Shipping founder material (vault, films, engineering records) on `www` or `demo` | ADR-0001; cross-application negative tests (P4F); investor build keeps the 2.5.5 allowlist lineage |
| 6 | Merging founder data with customer or investor data | separate schema, role, bucket and RLS; no shared seed |
| 7 | Overwriting an accepted Assurance baseline on drift or repair | versioned immutable baselines (P5 tests 26–27) |
| 8 | Inventing customers, revenue, partners, certifications or measured ROI on the public site | copy review against `provenance/CLASSIFICATION.md`; launch audit (PROMPT 12) |
| 9 | One giant bundle again | route-level code splitting; public pages carry no demo data (budget in P1) |
| 10 | Marking unexecuted checks as passed | NOT_RUN label everywhere; `scripts/test.mjs` records each suite's own summary |

## Definition of P0 complete (testable)

- [x] both originals in `legacy/source/` with hashes matching the attachments and the frozen release
- [x] baseline run in a browser of both originals and of the Founder Studio, with screenshots and load numbers recorded
- [x] machine-readable inventory of routes/areas, roles, personas, record types, events, state machines, navigation, tours, tests
- [x] `docs/legacy-parity.md` and `.csv` covering every area, V2.5 page, navigation item, tour, role, persona, state machine and Founder Studio destination, each with target class, status now, new route, backing and test
- [x] ADR for the two-application architecture
- [x] this status file with the phase ledger and the risk table

## Owner checkpoints (2026-10-30 11:33 CT)

| Checkpoint | Meaning | Status |
|---|---|---|
| 1 Verified architecture | both applications inventoried, parity documented, risks ranked, deployment architecture selected | **DONE**: inventories and parity (207 rows with six evidence-based maturity levels), ADR-0001 (two applications), ADR-0002 (deployment architecture, runtime limits, Next.js question), separate red-team review (24 findings, `docs/review/redteam-findings.json`), `docs/STRATEGIC_REFINEMENT_REGISTER.md` (31 items: A 19 / B 9 / C 3; 11 implemented with tests) |
| 2 Working web applications | public site and both app shells functioning, auth and persistence operational, core workflows running, important interactions tested | PARTIAL → mostly in place: public site with persisted leads and audited admin inbox (real-browser test); enterprise app + API + DB with the Build a Room → commissioning → service slice; **Founder Studio hosted workflow (decisions) with its own enforced boundary, both directions tested**; demo shell functioning. Outstanding: P3 migration of demonstrated areas; P5 governance front half |
| 3 Release acceptance | regression, security denials, responsive/browser, integration-status verification, docs, deployment configuration, remaining work | NOT_STARTED |

## Blockers and external needs (unchanged)

Hosting account and domain ownership (P9); identity provider credentials for OIDC/Entra (P4 external SSO); tenant credentials for any
real connector (P7); an external security assessment before any public exposure (`NOT VERIFIED — EXTERNAL TEST REQUIRED`).
