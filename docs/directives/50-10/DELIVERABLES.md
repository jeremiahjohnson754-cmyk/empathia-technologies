# 50/10 deliverables: what exists

Founder, 17 Nov 2026 (§24): "Do not claim that a document, screenshot, video or source file exists unless it has actually been
created." Status values are the directive's: Not Started / Designed / Implemented / Locally Tested / Staging Verified /
Production Verified / Blocked. Updated 17 Nov 2026.

| # | Deliverable | Status | Where |
|---|---|---|---|
| 1 | Canonical Capability Register (original against current) | **Not Started** as one register. Parts exist: `docs/product/COMMISSIONING_SOURCE_PARITY_MATRIX.md` (the commissioning workbooks), `docs/legacy-parity.csv` (218 rows, V2.5.x), `docs/parity/LITE_INVENTORY.md` | to be assembled from these, product by product |
| 2 | Product-wide gap assessment | **first version written** | `FIRST_EXECUTION_ASSESSMENT.md` §A |
| 3 | Architecture decision record: shared data, graph, integrations, AI | **Not Started** (principles in `FIRST_EXECUTION_ASSESSMENT.md` §F; ADR-0004, 0009, 0010, 0013 cover parts) | |
| 4 | Commissioning Workstation specification | **Not Started** (comparison and recommendations in §B, §C; the built benches are specified in `docs/product/ENGINEERING_INSTRUMENT_BENCH.md`) | |
| 5 | Redline / design-to-as-built specification | **Designed in part**: `docs/product/FIELD_RECORD_AND_REDLINES.md` | |
| 6 | Assurance baseline and drift specification | **Not Started** as a 2.0 specification | |
| 7 | Search Party 2.0 specification | **Not Started** (assessment in §D) | |
| 8 | Connector capability matrix | **first version written** | §E; `integrations/README.md` |
| 9 | Harmony capability and safety matrix | **Not Started** | |
| 10 | Implementation task register | **kept** in the session's task list; not yet a file | |
| 11 | Automated verification matrix | **Not Started** as one matrix; the suites exist (`scripts/test.mjs`, `tests/browser/`, `scripts/release/regression.mjs`) | |
| 12 | Working code | see the commit history of `v18/continuation` | |
| 13 | Visual evidence | screenshots from the staged connected demonstration: `tests/evidence/` | none yet for 50/10 work |
| 14 | Test evidence | `tests/evidence/*.json`; the regression of `a05fdcb` is in progress | |
| 15 | Deployment record | `docs/operations/RENDER_DEMO_STAGING.md`, `docs/product/OUTSTANDING_2026-11-17.md` | |
| 16 | Outstanding decisions | in each report to the founder; `docs/operations/PRIVATE_ASSETS.md`, `HOSTED_RECOVERY_DRILL.md` | |
