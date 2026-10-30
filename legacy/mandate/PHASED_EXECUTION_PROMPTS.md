# CLAUDE CONTINUATION PROMPTS — EMPATHIA 2.5.3 → ONLINE PRODUCT

**Usage:** First attach the two V2.5.3 HTML files and paste `MASTER_PROMPT.md`. After Claude has created and tested the current stage in its workspace, paste the appropriate numbered follow-up below. Keep one repo and one `docs/BUILD_STATUS.md`; do not restart from a clean skeleton and do not replace the original with screenshots. When session context runs short, attach the latest repository ZIP and BUILD_STATUS.md to a new Claude session, then give the next stage.

## PROMPT 00 — Baseline forensic audit

"Execute P0 of the Empathia master mandate. Read *both* supplied V2.5.3 HTML files. Run them as local browser pages, take baseline screenshots, inventory every route, role, persona, major action, seeded scenario and user-visible limitation. Extract a machine-readable `legacy-parity.csv`, `legacy-parity.md`, and risk table of the features that cannot be inferred from a first glance. Measure file loading and note the giant minified monolith, localStorage state, browser-only role simulation, synthetic data and no actual integration. Preserve originals unchanged; create the initial repo and `docs/BUILD_STATUS.md`. Do NOT jump to a pretty new home page and quietly drop features. Show actual files, commands and evidence."

## PROMPT 01 — Architecture, repo, and running development environments

"Execute P1. Create and run the monorepo and core developer tooling defined in MASTER_PROMPT.md. Pick explicit versions, architecture tradeoffs, domain boundaries, database and auth approach, folder tree and environment management. Implement a shared design system and route skeleton. Prove `install`, `lint`, `typecheck`, `test`, `build`, and local app startup. Create an ADR explaining why we use a modular monolith and how the source is migrated incrementally. Include readable instructions for Windows and macOS/Linux. Do not mark a command as passed unless actually run. Update the parity ledger and status report."

## PROMPT 02 — Public corporate website: real and premium

"Execute P2. Build the complete *public* Empathia Technologies website in the new repo: responsive home, platform, solutions (enterprise IT/AV, integrators, MSPs, facilities), technology, about/founder, request demo, pilot partner and contact, privacy/trust. Keep confident but factual claims and a premium charcoal/silver/teal brand, with polished typography, restrained cinematic visuals and excellent mobile navigation. Implement contact and demo-lead persistence through real backend endpoints, spam protection, validation and admin notification adapter (explicitly label email adapter status). No imaginary clients, traction, certifications, funding, testimonials or partner commitments. Test the navigation, form and mobile accessibility. Provide screenshots and code."

## PROMPT 03 — Investor-safe hosted Living Campus parity

"Execute P3. Migrate the V2.5.3 investor demo into modular, working web pages. Preserve original Core entities, Search Party behavior, campus/room maps, entity passports, data stories, role-based walkthroughs, Lite, Pro, Scouter, ServiceHands, Commissioning, Assurance, Executive Intelligence, Learn/SIGNAL and legacy modules. Use the original synthetic seed reproducibly, keep the synthetic disclaimer visible, and implement guided A/B/C demonstrations with reset. Progressive migrate old routes with an old→new parity table. Do NOT ship an iframe of the huge source and call it a migration, and do not replace the real app with a handful of polished but inert cards. Supply route-by-route screenshots and test logs."

## PROMPT 04 — Real identity, tenant-scoped database, evidence storage

"Execute P4. Implement actual auth/session persistence, tenant/org/site memberships, authorization and scoped roles; Postgres migrations; stable identity graph; private artifact bucket with upload/download permission checks, hashes and version history; admin views; actual audit trail. Keep user-selectable demo personas *separate* from authenticated permissions. Prove cross-tenant and cross-site denial via direct API, search, file URL, graph and analytics calls. Implement RLS if applicable with explicit allow/deny tests. Test exports and data access revocation. No placeholder token or client-side-only security."

## PROMPT 05 — Revenue-grade end-to-end lifecycle vertical slice

"Execute P5. Build a fully persisted, browser-operable vertical slice with actual authenticated actor roles and audit: room request → vendor acknowledgement → revisioned Ops Lead pitch → authorized project approval / hold / reject → separate funding → joint engineering brief → design/Lite/Scouter proposal and discipline review → applicable test plan → technician assignment/recorded tests → deficiency/retest → final documentation/photos → independent acceptance → immutable Assurance baseline. Include explicit approvals, scope revision invalidation, negative paths, transaction/outbox, unit/schema/E2E tests. Use synthetic room hardware until verified adapters are configured. Show actual working screenshots and proof of a row created/updated in database."

## PROMPT 06 — Search Party, Scouter, ServiceHands, and personalized roles

"Execute P6A. Migrate Search Party original universal search, visible relationships, people/vendors/sites/contacts, who-covers-this, backup coverage, Teams/mail/copy actions (real only if credentials provided), plus explainable skill-based technician matching. Implement ServiceHands triage, work orders, scoped dispatch, assigned-site technician console and field evidence. Implement Scouter comparable room selection and *independent* DSP/camera/control standard proposals, with compatibility checks and approval gates. Produce 22 role journey smoke tests and enforce backend permissions for every screen/action. Add helpful empty/loading/error states and accessible mobile views."

## PROMPT 07 — Lite, drawings, Field Intelligence 1.3/1.4, Assurances

"Execute P6B/P7. Connect Lite conceptual spatial model (photo, plans, dimensions, archetype, engineering approval) with Field Intelligence v1.3 read-only plan/observation ingestion and later Assurance. Show provenance per property and distinguish simulated geometry from field measured facts. Build v1.4 optional physical-validation *entitlement and supervised state machine*, external certified instrument report ingestion and adapter contracts; deny active actions without authorized hardware/operator/calibration/occupancy preflight. Preserve approved baseline history, APEX explainable hypotheses, ServiceHands work order integration. If native CAD or device adapters unavailable, create explicit mocked adapter capability pages, and manual approved import, without claiming working measurement. Implement denial tests and a 2D fallback for 3D."

## PROMPT 08 — Executive Intelligence, standards, Learn, analytics and UX finish

"Execute P6C. Implement executive dashboard definitions using actual persisted events, approved documents, projects and service results. Show time period, exact denominator, coverage and missing source states for funded/started projects, standards alignment, issues, tasks, asset lifecycle and room/device/whiteboarding usage. Add drill-down and consistent permission restrictions. Preserve standards, SOP/SOW review, Search Party intelligence, Learn/SIGNAL experiences and appropriate privacy-aware feedback loops. Polish the design system, keyboard accessibility, search relevance, error states, and content model; do not fake telemetry, user counts, ROI or customer reviews."

## PROMPT 09 — Security, performance, ops, release validation

"Execute P8/P9. Conduct independent threat modeling and OWASP ASVS-derived checks, browser-based end-to-end testing, cross-tenant negative tests, performance/UX/a11y audit, audit log verification, event replay/idempotency tests, container/service startup tests, backup and restore rehearsal, CI/build and staging smoke tests. Optimize public-page load, route splitting, rendering and database queries, retaining feature parity. Provide actual test results, red/amber/green readiness matrix, screenshots, deployment options, DNS/TLS instructions, exact owner credentials needed, rollback plan and clear unresolved blockers. Do not call the app fully production ready if hardware/identity/compliance/integration reviews remain."

## PROMPT 10 — Independent design and parity red-team review

"Do a *skeptical* CTO/CISO/architect review of the working repo versus the two original V2.5.3 files and MASTER_PROMPT.md. Find features lost, misleading synthetic-to-live claims, unguarded mutations, cross-site leaks, slow pages, UI anti-patterns, shaky data definitions, brittle connector paths, untested workflows, and fake success indicators. Classify every issue P0/P1/P2 with an owner, exact file/route, reproduction steps, fix and acceptance test; fix P0s now, rerun the suite, and give me a final neutral design-quality assessment supported by evidence."

## PROMPT 11 — Session continuation / context-compaction rescue

"We are continuing the same Empathia V2.5.3 website/backend migration, NOT starting a new project. Read `MASTER_PROMPT.md`, `docs/BUILD_STATUS.md`, the original source hashes, and the latest parity and acceptance matrices. Discover the exact current repo state using file reads and commands; do not trust old conversational assertions. Summarize completed/incomplete phases, changed files, tests actually passing and critical blockers. Resume at the first incomplete acceptance gate, edit existing code, run tests, and update BUILD_STATUS. Preserve everything already functioning."

## PROMPT 12 — Investor-ready launch audit

"Perform a strict public-release audit: is every marketing claim true and supportable; does any page imply real-time integrations or measured engineering outcomes from the synthetic demo; are the founder story, company ownership and partner relationships accurately described; do screenshots show demo labels; do CTAs persist and notify; is SEO functional; are private data/documents protected; is mobile/performance good; is there a one-click reversible demo reset; do preview URLs work from a normal browser and NOT Google Drive HTML source preview? Prepare a launch checklist and evidence-based go/no-go decision."
