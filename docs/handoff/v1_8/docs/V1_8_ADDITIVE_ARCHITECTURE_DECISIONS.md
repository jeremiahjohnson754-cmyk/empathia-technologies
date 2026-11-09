# Empathia v1.8: Five Additive Architecture Decisions

**Rule:** Add these ADRs to the existing 20 v1.7 ADRs. Neither these decisions nor the accompanying sample schema authorize destructive migrations or live deployment.

## ADR-021 — Proof Registry is a shared service, not a sales database

**Decision:** Product implementation state, customer source freshness and public proof approval are separate dimensions in a typed domain model. Public claims are materialized only from sanitized, specifically approved proof derivatives.

**Why:** The investor demo, public site and operating SaaS need to tell the same truth. A successful synthetic demonstration does not prove a vendor integration supports production use.

**Alternative rejected:** Hand-editing green feature status badges across website pages; it creates drift and unverifiable claims.

**Tradeoffs:** Moderation/admin work, evidence retention cost, lifecycle state complexity. Reduce burden with templated evidence ingestion and scheduled expiry, not loose public claims.

**Proof:** Tampered proof link denied, cross-tenant protection, invalid state downgrade, identical approved claim across both websites, current test evidence.

**Rollback:** Revert page consumption to a safe static `SPECIFIED`/`SYNTHETIC_DEMO` page, disable public claims, preserve registry history.

## ADR-022 — World-first task navigation over 52 exposed role choices

**Decision:** Visitors choose among four worlds and up to 4–6 obvious goals. Existing 52 role configurations remain unchanged and accessible by advanced selection and deep link. Server permission derives from authenticated policy, never UI choice.

**Why:** First-time buyers should quickly reach what matters without learning Empathia's taxonomy.

**Alternative rejected:** A flat list of all personas, or dropping specialist personas to simplify visuals.

**Tradeoffs:** Journey presets need updates as capabilities evolve. Define centrally and map to existing persona IDs; add automated no-loss tests.

**Proof:** All existing role IDs, links, protected routes tested; switch and inflight-fetch races fail closed; novice task studies.

**Rollback:** Flag off progressive selector while leaving original role menu functional, never relaxing backend access checks.

## ADR-023 — Authorized pilot readiness and entitlements are separate state machines

**Decision:** A verified payment event grants only the purchased software SKU/scope. Connector authorization, asset discovery, telemetry availability and safe equipment operations are separately approved, capability-tested transitions.

**Why:** Faster buying must not become unauthorized discovery or a false promise of instant live data.

**Alternative rejected:** One-click connect to arbitrary customer networks after payment, or a sales-only manual intake process for every supported small pilot.

**Tradeoffs:** Extra upfront configuration and eligibility warnings. Offset through progressive forms, clear blockers and accurate expected timelines, not fabricated guarantees.

**Proof:** Duplicate webhooks, unsupported connector, revoked consent, data freshness, five-room scope limit, same tenant on plan conversion.

**Rollback:** Disable new pilot checkouts while allowing existing entitled tenants to access records and exports; preserve all payment and audit history.

## ADR-024 — 2D-first and budgeted progressive rendering

**Decision:** Essential public, field and visitor tasks render without 3D/WebGL or video. 3D scenes and cinematic files lazy load on explicit interaction. Worker jobs isolate reports and heavy media. Performance budgets are tested on documented hardware and traffic profiles.

**Why:** Premium design must not make core tasks unusable on mobile or in constrained networks.

**Alternative rejected:** Loading all digital twin worlds and high-resolution media in initial JS bundle.

**Tradeoffs:** Multiple spatial representations and renderer synchronization. Share space/asset coordinates and provenance; fallback is a first-class product, not an error screen.

**Proof:** Network waterfall, low-end phone, no-WebGL functionality, p75 Web Vitals, QR latency, queue recovery, accessibility audit.

**Rollback:** Force simplified 2D mode and reduced-media profile per device/tenant without loss of critical workflow.

## ADR-025 — Flagship source-to-proof film as a testable artifact

**Decision:** Add Film 13 as a technical proof film without replacing original Films 01–12 or SIGNAL's own cinematic work. Each scene references verifiable, approved and privacy-safe source evidence or explicitly synthetic illustration.

**Why:** One convincing source-to-report story can demonstrate more architectural coherence than another broad feature montage.

**Alternative rejected:** A generic, visually impressive montage with UI state changes unrelated to actual software.

**Tradeoffs:** Higher production cost and editorial QA. Start with a 20–30 second approval scene, then scale only if technically and creatively sound.

**Proof:** Frame-by-frame engineering review, story/asset ID continuity, licensed voices/footage, working video, captions and evidence deep links.

**Rollback:** Unpublish incomplete master and use labeled demo tour with transcript; do not advertise placeholder video as complete.

**Status for ADR-021 through ADR-025:** PROPOSED; founder approves specification, implementation/production still requires role-appropriate authorization and review. Do not mark VERIFIED by writing these entries.
