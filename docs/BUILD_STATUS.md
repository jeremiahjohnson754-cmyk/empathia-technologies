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
| P3 Demo migration | V2.5.3 investor demo migrated into modular pages with the synthetic seed; A/B/C guided demos; reset | NOT_STARTED | — |
| P4 Auth and data | tenant/org/site membership, RLS, private storage, audit — exists for the enterprise slice; founder boundary (P4F) and public lead store | PARTIAL → P4F DONE (founder schema, role, policy flag, boundary tests); OIDC BLOCKED on a provider | `tests/security` authz 45/45, founder-boundary 6/6, site-scope 3/3, authority-matrix 2/2 (561 checks) |
| P5 Lifecycle vertical slice | request → acknowledgement → pitch → approval → funding → brief → design → plan → tests → deficiency → documentation → handoff → baseline | PARTIAL (design → commissioning → service exists; governance front half NOT_STARTED) | `tests/integration` 20/20, `tests/e2e` 21/21 (prior program) |
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
