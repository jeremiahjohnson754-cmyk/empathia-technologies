# EMPATHIA V2.5.3 — CLAUDE MASTER BUILD MANDATE
## Transform the actual Living Campus demonstration into a premium public website, safe hosted demonstration, and authenticated enterprise web application with a real backend

**Copy this entire file to Claude after attaching the two original HTML files.** Treat it as an implementation contract. The supplemental phase prompts in this package control scope and execution.

### 0. WHO YOU ARE AND HOW YOU WORK

Act as a coordinated principal engineering team with 25+ years of relevant collective judgment spanning CTO and CIO/CISO leadership, software architecture, frontend, backend, platform engineering, enterprise identity, data modeling, distributed systems, DevSecOps, product management, UX research, accessible UI design, 3D spatial systems, AV/UC engineering, evidence-led commissioning, acoustics, hardware integration, responsible AI, analytics, and enterprise go-to-market. This is a requested review lens, not a claim that you possess human degrees or qualifications. Make defensible tradeoffs as an experienced team would.

**Mission:** Build a genuine, deployable, beautifully designed Empathia website and web application from **the actual supplied V2.5.3 Living Campus HTML source**, without gutting or replacing its distinctive functionality. Deliver runnable code, database migrations, seeded demonstrations, real backend operations, tests, deployment instructions, and a transparent readiness report. Make it feel like an integrated enterprise software product—not a generic Tailwind dashboard, a screenshot clone, a nonfunctional marketing site, or another monolithic HTML mockup.

**MANDATORY distinction:** A *public marketing website*, a *safe investor demo* and a *real authenticated multi-tenant product* are different security and data environments. They may share one design system and monorepo, but must not be confused. The user wants an actual online website plus the capable backend—not merely Google Drive preview, static hosting, or an iframe showing the previous single-file demo.

Build progressively and test. Keep all original source files read-only. Never replace the supplied v2.5.3 source with a new simplified prototype. Preserve the investor-facing story while accurately displaying implemented, simulated, proposed, and hardware-verified features.

### 1. INSTRUCTIONS ABOUT THE EXACT SUPPLIED SOURCE

Required input files:

- `Empathia-Living-Campus-V2.5.3-live(2).html` — the existing **Live Web Edition**, a *hosted synthetic demonstration*, not a production SaaS implementation.
- `Empathia-Living-Campus-V2.5.3-offline(2).html` — the corresponding **Offline Investor Edition**.

Source audit facts from supplied files (verify them on receipt rather than trusting this summary):

- Both are approximately **6.96 MB**, 2,194 physical lines, with large minified CSS/JS blocks. The two editions have largely the same application code, with edition metadata and a handful of text differences.
- The live edition identifies itself as `investor-live`, release `2.5.3`, demonstration with synthetic data. Its source explicitly states **no real system is connected or monitored**.
- Local browser state uses `localStorage`, including `empathia.living-campus.v1` and scripted/resettable synthetic scenarios. This is not a transactional backend or a multi-user identity platform.
- The existing baseline has a 14-role `AZ_KEYS` UI access model and an expanded **22-persona V2.5 model** (`V25_PERSONAS`), including vendor, requestor, operations lead, engineering reviewers, finance, field technician, site champion, facilities manager, data steward, and security admin. These are *demo personas*, not proof of server-enforced authorization.
- The existing suite includes Pro, Lite, Scouter, Intake, Budgeting, Commissioning, Assurance, Standards, Operations, Learn/SIGNAL, Core, and an Integration Fabric. It also includes Search Party, ServiceHands, Field Intelligence workflows, APEX, spatial modeling, project governance, and role-specific V2.5 workspaces.
- V2.5 sections use `#/v25/...` routes for intake, vendor, decisions, project, design, scouter, Lite, FI, optional physical validation, commissioning, tracker, service, coverage, ledger, Assurance, APEX, Executive, Learn, and policy. Inspect *all* original routes, not just these examples.
- Source exposes demo functions such as `window.__V25__`, a `V25_DESIGN` state-machine definition, a `V25_EVENTS` catalog, `V25_TYPES`, and synthetic support systems. They are useful as specifications and fixtures, not as trusted backend services or authorization enforcement.
- The source distinguishes project approval, funding, engineering authorization, plan compilation, field evidence, documentation, acceptance and Assurance baseline. Do not collapse them.
- Source has identifiable provenance labels, synthetic badges, and cautionary limitations. Preserve and strengthen those distinctions.

**First deliverable**: an accurate route-and-feature parity ledger (`docs/legacy-parity.md` and `docs/legacy-parity.csv`) that inventories the full navigation, widgets, roles, actions, datasets, calculations, sample stories, and scenario outputs of both originals. For each original behavior classify: `MIGRATED_REAL`, `MIGRATED_DEMO`, `DEFERRED_WITH_REASON`, `BLOCKED_EXTERNAL_DEPENDENCY`, or `REGRESSION` (regressions are release blockers). Map old route → new route, original data → canonical entity, existing interaction → new backend/service/fixture, responsible test.

Preserve original demo snapshots in a `legacy/` folder and baseline screenshots. Do not embed the 6.96 MB source publicly as the secret internal implementation. Source minification is not IP protection. No confidential code, credentials, unpublished investor documents or production telemetry may be exposed in public routes or bundles.

### 2. PRODUCT TOPOLOGY — FOUR DISTINCT EXPERIENCES

Build these four coherent experiences, reusing a shared visual identity, patterns, navigation, and appropriately filtered data:

**A. Public Empathia Technologies site (`www`):** Search-friendly, exceptionally polished, fast corporate presentation: Home, Platform, Solutions, How It Works, Technology, Security/Trust (truthful), About/Founder, Contact, Request Demo, Pilot Partnerships, optional approved News/Insights. Enterprise visitors should understand the offer in 30 seconds. Do not list hypothetical awards, invented customer quotes, funding, Stefanini contracts, industry endorsements, or integration guarantees. Use non-confidential screenshots/video and clear CTA routing; build public contact/pilot request forms with real backend persistence, anti-abuse controls, email notification adapter, consent/privacy text, and a working admin inbox.

**B. Investor-safe guided product demo (`demo`):** A beautiful, hosted interactive scenario using strictly synthetic entities and clearly visible “DEMONSTRATION / SYNTHETIC DATA”. No production credentials, device controls, private customer data or silent edits to live systems. Guided tours, progress steps, role perspectives, restartable scenarios, graceful exploration, short shareable route links, and optional temporary invitation tokens/rate limiting. Use the existing V2.5.3 demo as behavior reference and preserve its rich capabilities. “Investor Live Edition” must mean a hosted online *demo*, not misleading production claims.

**C. Authenticated product application (`app`):** Real authenticated users, organization/tenant membership, role/site/project/assignment authorization, durable PostgreSQL storage, properly scoped endpoints, work queue, documents and evidence, real audit log, and transactional state machines. Implement a deliberately narrow operational vertical slice first, but carry and label remaining capabilities through coherent feature modules. No pretend production functionality; module status visible to authorized admins.

**D. Operations, integrator and governance administration (`admin`):** Invite/manage users, roles/assignments, tenants, sites, scoped vendors, approved standards, approval delegation, connector health, entitlements, feature flags, evidence retention, access logs, demo inquiries, and operational health. Do not expose administrative actions through only hidden UI buttons.

Deployment can use paths or domains configured by env, e.g. `www.<configured-domain>`, `demo.<configured-domain>`, and `app.<configured-domain>`. **Never assume the user owns any domain.** Include local development equivalents.

### 3. RECOMMENDED ARCHITECTURE AND TRADEOFFS

Use a modular monolith initially, not an ungoverned collection of microservices. Recommended baseline (confirm current compatible stable releases from official documentation before installing):

- **Frontend**: Next.js App Router, React, TypeScript strict, Tailwind + well-governed design tokens, accessible headless primitives/shadcn-style components, server components where appropriate, selective client components, route-level code splitting, responsive mobile-first UX. Avoid bundling huge sample data and full knowledge corpus onto first paint.
- **Backend/API**: Next.js server handlers for the browser-facing API and a separate typed domain/service layer with strict authorization, Zod/JSON Schema validation, documented REST/OpenAPI contracts. Use server-only code for privileged operations. Background/slow work (imports, file scanning, telemetry, exports, webhook retries) must run in a durable worker/queue, not in a blocking HTTP request.
- **Database**: PostgreSQL, reproducible SQL migrations, explicit indices/unique constraints/checks, versioned entities, tenant scoping, optimistic concurrency. A managed Postgres/Supabase deployment is a reasonable first choice. If using Supabase, enforce both proper grants and Row Level Security on exposed tables, test denial and cross-tenant isolation, and keep service-role keys server-only. Use one migration/ORM tool and document the choice.
- **Identity**: production-capable authenticated sessions with MFA-ready mechanisms and enterprise OIDC/SAML/Entra ID integration plan; use an established provider/library, no home-grown password storage or fake SSO. A person may belong to multiple organizations but must select an active, server-authorized organization. Distinguish `actor`, `selected persona`, `delegation`, `role`, `scope`, and `license entitlement`.
- **Documents**: S3-compatible private object storage or managed private bucket; signed short-lived upload/download URLs after authorization; file type/size checks, virus scanning, hashes, file version records and preview safety. Separate public marketing media from protected engineering artifacts.
- **Jobs/events**: transactional outbox in the same Postgres transaction as the authoritative write; worker with retries, backoff, dead-letter review, idempotency and traceability. Avoid expensive event infrastructure until proven necessary. No “exactly once” promises; consumers must be idempotent.
- **Search**: indexed PostgreSQL full-text/fuzzy search initially, plus type-aware and ACL-filtered results. Consider an external search service only when justified by scale/relevance. Search Party contact links act on authorized contact methods; integrate Teams/email only with granted, tested OAuth scopes.
- **Observability**: structured logs, OpenTelemetry instrumentation, errors/traces, application and worker health, audit event searches, dashboards and alerts. Never record secrets or sensitive customer file contents in logs.
- **Testing/CI**: Vitest or equivalent unit/integration tests, Playwright E2E, accessibility checks, database policy tests, migration tests, contract tests, dependency and secret scans, `typecheck/lint/test/build` gates.
- **Deployment**: version-controlled repository and isolated `dev`, `staging`, and `production` environments, HTTPS, DNS and domain guide, staging previews, secrets manager, backups and restore rehearsal, rate limits, content-security policy, smoke tests and rollback. Provide a working local Docker/Compose path for Postgres and workers when possible. Suggested managed hosting can include Vercel for Next.js plus managed Postgres/storage or a reproducible alternative; justify tradeoffs, pricing and vendor lock-in.

Do **not** introduce WebSockets, Kafka, Kubernetes, Redis, vector DB, or Unreal Engine streaming solely for aesthetics or résumé appeal. Add only for explicit, measured requirements. A Three.js/React Three Fiber Lite viewer may progressively enhance 2D plans; provide static 2D and keyboard-accessible alternatives, memory and fallback budgets. UE5 digital twin is an *optional external rendering integration*, not a prerequisite for fast public website loading. No mandatory WebGL on landing pages.

Document architecture decisions in `docs/adr/`, estimated operating costs, third-party dependencies, export/migration strategy, data residency considerations, and vendor tradeoffs.

### 4. CANONICAL DATA MODEL AND TRANSACTION RULES

Keep a canonical identity across every product; do not create a separate room/device/project identity database per module. Create relational tables, constraints, migrations, and typed records covering at least:

- Enterprise/tenant/org, membership, person, role, scoped permission, site/vendor assignment, delegation, approver directory and history.
- Region/campus/site/building/floor/space/room/zone, room archetype, geometry source/validation, photo survey, spatial model and design state.
- Asset/device, manufacturer/model, connectivity, firmware, controller/DSP/camera configuration, lifecycle/warranty, network/AV signal relationships, integration capability and evidence of observability.
- Request, vendor acknowledgment, project, versioned pitch/business case, approval decision, funding authorization, budget/revision, design brief, design version, drawings, extraction assertion, RFI, DIVR design intent, Scouter proposal and reviewer decision.
- Requirements, standards, SOP, SOW, waiver/exception, commissioning rule pack, applicability result, tests, test runs, field measurements, deficiencies, final photos, evidence record, documentation status, document approval, handoff, historical Assurance baseline and drift.
- ServiceHands issue/work order/dispatch, qualified technical assignment, coverage contract, site champion/facilities contact, APEX hypothesis, safe repair plan, repair verification and reopening history.
- Learn/SIGNAL case (reviewed, privacy-safe), training records, demonstrated competency (not itself job authorization).
- Event envelopes, outbox, delivery attempts, webhook inbox and dedupe, user notification, audit/retention policy, connector status, entitlement, usage observation, metric definition and data quality.

Define globally unique stable IDs and explicit relationship table(s) or edge contracts; no name-based joins. Preserve full historical design and baseline revisions. Sensitive cross-product reads are scoped to tenant, classification, project/role/site/assignment; role switching cannot grant privileges.

Document fields using `type, unit, nullable, source provenance, validation, reviewer, retention, classification, tenant owner, state`, especially measurement and finance fields.

### 5. REQUIRED GOVERNED LIFECYCLE

Implement one complete backend-driven reference lifecycle across these modules:

1. Requestor creates new-room/renovation/repair request with site, building, floor, room type, photos, known dimensions and optional plans, constraints and requirement evidence. Photos have configurable policies and explicit privacy/consent. No generated room geometry presented as measured geometry.
2. Vendor receives authorized scoped request and acknowledges it; internal routing exception remains possible and auditable.
3. Operations Lead assembles a revisioned pitch/business case; select eligible approved approver (recent/favorite approver suggestions are convenience only). Eligible Executive explicitly APPROVES / HOLDS / REJECTS with rationale; author cannot approve their own work. Funded status requires separate Finance authority, amount, budget revision and expiry/withdrawal. Hold/reject/funding withdrawal blocks unauthorized delivery.
4. Operations Lead + Systems Engineer jointly sign off scope/technical brief and properly authorize design/installation work. Distinguish project approvals, funding, engineering approval and acceptance.
5. Design accepts CAD/Revit/Visio/BIM/PDF uploads and/or Lite conceptual modeling from known dimensions, plans, photos and archetypes. Geometry extracted from drawings or photos must be tagged `SOURCE_EXTRACTED`, `INFERRED`, `SIMULATED`, `FIELD_MEASURED`, or `ENGINEER_APPROVED` correctly. If actual native conversion is unavailable, keep an inspectable manual entry/structured import path and record connector status; do not assert full Revit support.
6. Scouter ranks compatible equipment, then prepares separately reviewable *similar-room* DSP template, camera preset and touch-panel UI recommendations. Filter for approved comparable rooms, device/firmware compatibility, context, usage, calibration and standard revision; record limitations; require engineering review. Technical proposals never silently deploy.
7. Design revision is frozen for installation with DIVR and change-impact traceability; substitutions/RFIs require re-review of impacted cost, scope, checklists and approval gates.
8. Adaptive commissioning compiles tests from project type, room type, device inventory, approved design targets, risk, and standard versions. Preserve distinction between five macro delivery phases and Tier 1 physical, Tier 2 subsystem, Tier 3 integrated test groupings. Small camera replacement must not require all complex townhall tests. Never equate design-specified SPL with actual measured SPL.
9. Service/Project Manager authorizes dispatch through Search Party matching relevant skills, certs, site scope, schedules, vendor contracts and load. Service Technician is assignment/site-restricted in all backend operations, contacts, maps, search results, and file downloads; technician gets restricted Lite engineering info, relevant SOP and field capture, not executive budgets or enterprise-wide customer data.
10. Field Intelligence **v1.3 default** supports safe, authorized, read-only/passive observation and planning, with Lite model synchronization. **v1.4 optional** physical/acoustic validation must be licensed, separately consented/authorized, occupancy-aware, scheduled, supervised and compatible with validated hardware adapters. The web app must never directly perform unsupervised active test signals, PTZ movement or disruptive configuration changes. Without real authenticated devices/calibrated instruments, allow `UNVERIFIED`, `SIMULATED`, `INCONCLUSIVE` and reviewed external reports only.
11. Technician completes checklist with provenance-rich evidence; failed results open deficiencies, corrective work and targeted retest. Reviewer independently checks evidence quality, calibration, test method and relevant limits.
12. Documentation Tracker collects as-builts, rack elevation, IP schema, DSP files, control program, firmware, device/labeling/room/rack/camera/UC evidence, final commissioning report, finished-room photos and final signed packet. Completeness counts *applicable approved requirements*, not uploaded file count. No acceptance before mandatory documentation and photo gates.
13. Authorized recipient accepts handoff; accepted commissioning results generate immutable, versioned Assurance baseline. Later drift, incidents, service repairs and recommissioning generate linked events and new baseline *versions* rather than overwriting prior acceptance.
14. APEX/Assurance produces evidence-based diagnosis and next actions; safe remediation needs explicit authorization. Work order, technician, known fix and verification are linked. Any AI suggestions are visibly advisory, with source citations and uncertainty.
15. Verified, reviewed lessons may enter Learn/SIGNAL with privacy preservation; competencies may support Search Party matching but never confer unauthorized electrical/safety certification.
16. Executive Intelligence presents projects started/funded, tasks, requests, commissioning conformance, issues, standards, SOP/SOW, lifecycle exposure, rooms and device usage. Metrics must expose source, period, denominators, telemetry coverage, freshness, privacy thresholds, and missing-data status. Whiteboarding adoption is measured from eligible instrumented sessions, never inferred as a percentage of all people.

Every transition defines **authorized persona + actual actor + required evidence + guard + transaction + event + consumer + notification + failure/recovery path + audit record**.

### 6. FRONTEND/UX: KEEP THE HEART OF THE CURRENT EXPERIENCE, IMPROVE THE DELIVERY

Honor Empathia's existing charcoal/dark, teal/accent, clean typography, editorial dashboards, room maps and relationship views. Make the result premium but engineer-credible. Design should evoke Apple-level restraint, professional CAD/engineering tools, modern B2B products and high-performance data interfaces—not indiscriminate neon sci-fi.

- Establish UI tokens, components, page templates, accessible color contrast, typography scale, icon system, tables, charts, empty/loading/error states, focus and keyboard navigation, toasts, side drawers, accessible dialogs, responsive collapsible navigation and global search.
- Keep responsive layouts for 360px phone, tablets, 1440px desktop, 4K control room displays. Support touch targets, reduced motion and screen readers. Aim for WCAG 2.2 AA; test, don't self-certify.
- Build task-oriented home views for all 22 V2.5 personas plus safe viewer and public contexts; **do not render 22 duplicated apps**. Share common shells, feature permissions and reusable task cards; condition content by actual permissions/assignments.
- Search Party remains one globally accessible authorized search experience with People/Vendors/Sites/Rooms/Devices/Projects/Standards/Communities, primary/backup coverage, “Who Covers This?” action, contact details and one-click Teams/email/copy where integrated. If integration isn't configured, explain status and offer safe alternate contact link; do not show a fake sent confirmation.
- Preserve spatial Campus → Building → Floor → Room and Lite lenses `DESIGNED / COMMISSIONED / CURRENT / PROPOSED`. 2D floorplan first, progressive enhanced 3D/digital twin, clear geometry provenance, edit history and accessible alternatives.
- Role-specific screens: Executive financial and operational dashboards, Operations Lead pitch/approval desk, Finance funding, Systems Engineer design/standard releases, Designer Lite/Scouter, Installer/Technician assigned work, Commissioning QA evidence, Security/Admin policy/connector health, Site Champion/Facilities scoped support; populate with meaningful tasks not generic metric placeholders.
- Introduce a demo tour for new visitors: **A) new townhall project, B) camera replacement, C) controlled incident → ServiceHands → Assurance verification**. Offer “show me how it works” with contextual breadcrumbs, fast skip, reset, and clear explanation of synthetic states.
- Keep public pages light and fast; avoid importing proprietary source/demo records into the public bundle. Compress media with poster/fallback and reduced-data experience. No autoplay audio or forced 3D. Keep quality through purposeful composition and subtle motion.
- Public website: Home hero and value proposition; modules/solutions; architecture/intelligence narrative; transparent demos; sectors; differentiators; founder/vision; contact/pilot form; privacy/security; legal footer. Audience variants for CIO/CTO, MSP, AV integrator, facilities. SEO, semantic metadata, sitemap, structured data where appropriate, analytics with consent. No fabricated endorsements, testimonials, customer logos, awards, certifications or fake measured ROI.

### 7. API / EVENT / INTEGRATION CONTRACTS

`V25_EVENTS` is a starting catalog, not an executable distributed contract. For every implemented event specify JSON Schema including types, required fields, discriminator, schema version, producer, consumers, authoritative transition, tenant and actor IDs, correlation/causation/idempotency IDs, timestamps, event authorization, PII classification, retry/dead-letter policy and payload evolution compatibility. Outbox + idempotent inbox; test duplicate, out-of-order, delayed, stale, partial and unauthorized events. Include OpenAPI for HTTP routes and example request/response/error formats; no root/admin shortcuts exposed to normal users.

Connector inventory: distinguish `SIMULATED`, `PROPOSED`, `CONFIGURED`, `HEALTHY`, `STALE`, `FAILED`, `READ_ONLY`, and `ACTIVE_CAPABLE`. Never claim manufacturer integration works merely because a product appears in a catalog. Build connector interfaces with per-vendor capabilities, auth scopes, per-tenant credentials, retries, rate limits, circuit breakers, audit logs, scope/revocation handling, and mocking. Useful targets to *design for* include Microsoft Teams/M365/Entra, ITSM, AV/UC monitoring, Q-SYS, Crestron, Biamp, Shure, Dante networked audio, Teams Rooms, Cisco, signage and CAD/BIM vendors; enable only verified APIs.

Field agent architecture: separately deployed signed and approved on-prem/edge collector with outbound-only TLS to ingestion/API, per-tenant/site token rotation, device allowlists, mTLS where appropriate, throttles, and safe offline buffer. No arbitrary server-originated remote PowerShell execution or credentials in the web bundle. Real camera/robotics/acoustic motions are locked behind v1.4 entitlement, approvals, occupied-space checks, manual supervised preflight, emergency abort, hardware/firmware compatibility and observation provenance; NEVER schedule disruptive tests by default.

### 8. PRIVACY, SECURITY AND ENTERPRISE GOVERNANCE

Use OWASP ASVS 5.0 as a requirements reference; apply practical controls with test evidence. Threat model tenant crossover, broken object-level authorization, IDOR, unsafe file upload, XSS/CSRF, injection, SSRF during URL import, OAuth scope misconfiguration, untrusted CAD/PDF parsing, webhook spoof/replay, agent command abuse, secrets exposure, stale/delegated admin authority, sensitive analytics, and AI prompt injection.

- Real sessions, MFA-ready auth, scoped invitation and expiration, least-privilege token scopes, HttpOnly Secure SameSite cookies where appropriate, session revocation, credential rotation, CSP/HSTS, secret manager, rate limits, CSRF defenses and input/output escaping.
- Server checks on *every* query, export, route action, file read, derived graph, search result and asynchronous job. UI role switching in the old demo is not security.
- Tenant and site authorization must survive direct URL requests, mutation API calls, asset-ID guessing, Search Party results, map overlays, dashboard aggregates and AI retrieval. Create explicit **negative tests** for cross-tenant/cross-site access and delegated role expiry.
- Encrypt data in transit and at rest via managed infrastructure, maintain backups, tested recovery objectives, admin action audits, retention/deletion/export policies; never falsely claim SOC 2, ISO 27001 or HIPAA certifications.
- Do not send identifiable room photos/audio recordings to external AI models without tenant-approved policy, consent and a documented data-processing agreement. Provide redaction/retention and user visibility.
- Respect intellectual property: do not embed internal investor deck or raw engineering algorithms on public site; use limited approved demo snapshots. Do not transfer rights or deploy confidential customer data to unauthorized environments.

### 9. AI / ANALYTICS GOVERNANCE

AI suggestions are advisory by default. Store model/version, input source references, confidence/uncertainty, reason, approval state and safe reproducibility as appropriate. Put rules and human approvers in charge of hard safety, technical and financial gates. Disable generative claims if no real inference provider is configured; labeled deterministic suggestions can work in demo mode.

AI features: drawing extraction with reviewed provenance, similarity-based Scouter proposals, issue triage explanations, knowledge retrieval limited by permissions, contextual help, executive insight annotations, recommissioning suggestions. Require grounded citations, negative evidence handling, denial on missing permissions, and no unauthorized writes/actions. Eval suite covers hallucinated room dimensions, bogus SPL, cross-tenant prompt injection, wrong device compatibility, false pass, sensitive data leakage and unsafe actions.

Metric dictionary: define source events, unit, time interval, denominator, sampling coverage, aggregation grain, refresh time, interpretation, and permission. Missing/poor coverage shows `N/A`, not 100% success. Executive metrics and Search Party intelligence must be drill-down-capable and reconcile to approved project/service/commissioning records. Avoid excessive employee-level surveillance; favor aggregated room/device utilization and privacy thresholds.

### 10. OUTPUTS: DO NOT STOP WITH A STRATEGY MEMO

Create actual files in an organized monorepo with working scripts, not descriptions of files or a single mock image:

```
/apps/website      # public-facing, SEO-ready corporate website
/apps/demo         # investor-safe, synthetic guided hosted demonstration
/apps/platform     # authenticated multi-tenant application
/packages/ui       # design system, shared components
/packages/domain   # canonical types, workflow guards, policy, event contracts
/packages/db       # migrations, seeded fixtures, RLS tests
/packages/connectors # mock, read-only, verified adapter interfaces
/packages/analytics  # metric definitions, validation
/workers           # long-running jobs and durable event consumers
/legacy            # unchanged V2.5.3 source and parity references
/docs/adr, /docs/qa, /docs/security, /docs/api, /docs/deployment
```

An equivalent simpler monorepo is acceptable if it runs and preserves boundaries; do not add needless deployment complexity. All files must be actual writable artifacts in your workspace.

Deliver: `README`, architecture diagram, ADRs, route parity matrix, entity/field glossary, migration scripts, seeding, environment template **without secrets**, API OpenAPI/JSON schemas, policy matrix, event contracts, real backend-connected lifecycle vertical slice, public website, investor demo, administrator inbox, connector status board, tests, browser screenshots, accessibility findings, deployment runbook, incident/recovery runbook, sample backup/restore, honest capability/readiness matrix and unresolved backlog with owners/dependencies/acceptance.

### 11. NON-NEGOTIABLE ACCEPTANCE TESTS

Create named automated tests and manually inspect real browser renders for at least:

**Source continuity:** (1) all original important routes inventoried; (2) no high-value feature silently removed; (3) old vs new role dashboards and Search Party actions accounted for; (4) resets remain synthetic-only.

**Website:** (5) home and product pages navigate; (6) working contact/demo/pilot form persists to backend and sends configured notification or transparently logs 'email adapter not configured'; (7) mobile, tablet, desktop accessible; (8) fast initial load and lazy 3D; (9) SEO metadata/sitemap, no invented testimonials; (10) privacy/security/legal pages truthful.

**Identity/security:** (11) user logs in/out/session expiry; (12) tenant A can't read tenant B via direct URL, API, file, search, metrics or relation graph; (13) field technician cannot read funding or unrelated site records; (14) expired delegation cannot approve; (15) unauthorized vendor cannot acknowledge unrelated request; (16) no secrets/client bundle; (17) uploads restricted and handled safely.

**Workflow:** (18) new request → acknowledgment → versioned pitch → independent project approval → independent funding → engineering approval; (19) HELD/REJECTED blocks execution; (20) scope revision invalidates stale pitch/funding/design approval as appropriate; (21) Scouter proposal requires domain reviewer; (22) Lite inferred dimensions never promoted to field measured; (23) commission small camera replacement differs from townhall; (24) failed test creates deficiency, blocks handoff; (25) missing final photos/documents blocks acceptance; (26) signed handoff establishes versioned immutable baseline; (27) drift/repair/recommission does not overwrite original baseline.

**Evidence/FI:** (28) inconclusive v1.3 scan doesn't pass commissioning; (29) v1.4 active test denied without entitlement, supervisor approval, compatible hardware, occupancy check and calibration; (30) external WAV never automatically becomes calibrated dB SPL; (31) simulated physical data stays visibly synthetic.

**Operations:** (32) outbox retries and idempotent consumer don't duplicate project funding or evidence; (33) stale connector degrades gracefully; (34) worker crash can resume; (35) error/empty/loading/offline states explain what happened; (36) production rollback and database restore instructions are tested/documented.

**Cross-browser/UX:** (37) Playwright smoke suite in Chromium/Firefox/WebKit for high-value routes; (38) keyboard navigation, focus management, contrast, reduced motion, mobile no sideways scrolling; (39) no console errors for critical flows; (40) screenshots of actual running app.

Define measurable budgets (e.g., public-site Core Web Vitals field targets: LCP <=2.5s, INP <=200ms, CLS <=0.1 at the 75th percentile, subject to real-user measurement; build-time and lab budgets separate). For protected app set tested route-based performance targets, do not promise untested global SLAs. Enforce critical tests in CI. Report pass/fail honestly and preserve logs/screenshots.

### 12. EXECUTION PHASES — MANDATORY ORDER

**P0 Source & parity:** Import both sources; hash, baseline-run, inventory routes/actions/roles; record current synthetic limitations; screenshot key pages; create feature parity acceptance matrix.

**P1 Foundation:** Create monorepo, design system, package scripts, env templates, architecture ADRs, CI, local development services and working starter routes. Prove `install`, `dev`, `typecheck`, `lint`, `test`, and `build`.

**P2 Public website:** Build and render complete marketing site with true CTAs, accessible mobile/desktop, actual brand identity; no fake claims; real contact lead capture.

**P3 Demo migration:** Migrate V2.5.3 synthetic datasets/navigation and key workflows into modular components, preserving relevant behavior; implement guided demo stories and valid reset. Keep parity matrix current. Don't write a new toy dashboard.

**P4 Auth & data:** Implement tenant/org/site membership, roles, RLS, stable IDs, migrations, private storage and audit events. Test authorization denials before any customer data flows.

**P5 Real lifecycle vertical slice:** Implement full request → approval/funding → design/Lite/Scouter → adaptive commissioning → documentation → handoff → Assurance baseline with persisted data and real permissions (real database, synthetic devices permitted). Deliver browser evidence.

**P6 Cross-product workspaces:** Migrate Search Party contacts and coverage, ServiceHands dispatch, Pro/Assurance, Exec Analytics, Scouter, Learn and remaining original features according to parity inventory. Realize integration contracts where possible; mark blocks honestly.

**P7 Connector/FI boundary:** Build capability-based connector adapters and offline/agent ingestion contracts; FI v1.3 default, FI v1.4 optional safe approval. No untested live hardware actions.

**P8 Security/reliability/quality:** Threat modeling, RLS attack tests, E2E coverage, accessibility, performance optimization, workers/events, backups/restore, rate limits, security review.

**P9 Deployment and handoff:** Deploy staging from user's authorized accounts only when credentials/access are available; provide env/hosting/domain configuration, security checklist, screenshots, test report and roll-forward/rollback instructions. Never claim to have deployed a domain or connected a vendor without evidence.

At the end of every phase provide: changed file paths, actual commands run and results, screenshots where relevant, parity ledger delta, functional checklist, open blockers/risks, next phase. Continue to code and test within available tooling; if an external credential or deployment approval is genuinely missing, implement the local/demo equivalent and record the exact blocker rather than inventing completion. Do not request hundreds of clarifications before beginning. Ask only for blockers like actual domain ownership, hosting account, legal copy approval or identity credentials at the stage they're needed. Never claim work runs asynchronously.

### 13. DESIGN / BUSINESS QUALITY BAR

The new Empathia must feel premium, purposeful, and distinct while respecting its legacy information architecture. Engineering accuracy and operational speed are equal partners with beauty. Demo experience earns investor attention, architecture earns engineering trust, user experience earns adoption, and verified outcomes earn contracts. Deliver a measurable improvement, not a cosmetic score of 12/10.

Define release statuses:
- `PUBLIC_READY` = public site tested and legally accurate;
- `DEMO_READY` = synthetic guided demo passed, safe and easy to access;
- `PILOT_READY` = authenticated vertical slice deployed with functional database/auth/QA, limited to agreed customer scope;
- `PRODUCTION_READY` = only after security, data protection, real integrations, hardware, resiliency, and independent acceptance meet explicit requirements.

Never collapse these into one blanket "fully integrated" claim.

### 14. BEGIN NOW — FIRST RESPONSE AND THEN EXECUTION

Your first output should be a concise implementation decisions table, exact baseline source findings, proposed repo tree, top ten regressions to avoid, and the testable definition of `P0 complete`. Then **actually create the repository, parity inventory and first running builds**. Do not stop after writing an implementation plan. Use the staged prompts in the accompanying file if needed to preserve context. Preserve the original file, perform real commands, and present test evidence. If resource constraints make full migration impractical in one Claude session, provide a clean working checkpoint and continue in subsequent sessions from the repository/phase ledger; do not fabricate unbuilt modules or falsely mark them green.

**This is Empathia Technologies' owned intellectual property. Treat it as a real enterprise SaaS build, with confidentiality, correctness, engineering review, and customer trust as non-negotiable constraints.**
