# EMPATHIA TECHNOLOGIES — 110/10 CLAUDE IMPLEMENTATION HANDOFF v1.8

**Issued:** 2026-11-08  |  **Status:** founder-directed additive specification, NOT independently verified production software  |  **Scope:** the complete Empathia v1.7 baseline **plus** five mandatory proof, conversion, onboarding, performance, and flagship-film architectural improvements.

> **The promise:** A visitor should understand Empathia in seconds, verify something genuine in minutes, purchase an eligible pilot without unnecessary meetings, and ultimately use the same governed technology in an authorized real environment. The founder's vision spans the whole lifecycle; the customer's first journey should be simple.

## 0. Executive command and non-replacement agreement

Claude, **continue the existing Empathia repository, not a new project**. This v1.8 release is *additive*. Preserve in their entirety: the original Enterprise v1.2 functional authority; the original 90-room corporate estate and historical V2.5.3 features; the v1.3 Three Worlds expansion; v1.4 Four Worlds/SIGNAL requirements; v1.5 pricing, pilot, and entitlement models; v1.6 QR/import/export/executive commissioning dossier; and v1.7 shared architectural redesign, 50 improvements, 18 destructive-QA perspectives, narrative showrunner requirements, and core film plan. The original `signal-standalone.html` is canonical for story text/people/decisions, not content to overwrite with generic script output.

**Change in v1.8:** five recommendations that were previously suggestions become testable architectural requirements and release-gated workstreams:

1. **Proof Center / Demo Readiness:** evidence-linked feature-by-feature truth, not a fabricated live demo.
2. **World and persona progressive disclosure:** simple first click, full 52 role configurations preserved behind intelligent context.
3. **A frictionless, honest 3–5 room paid pilot:** interactive eligibility/readiness, verified payment/entitlement, customer-approved connection, preserved onboarding.
4. **Mobile-first performance budgets and graceful degradation:** 2D-first, progressively loaded 3D, real device/network measurements, accessible fallback, durable jobs.
5. **One flagship real engineering-lifecycle proof film:** source-to-report continuity, evidence-linked chapters, licensed media and demonstrably realistic AV/IT workflow; all original 12 planned films remain.

Every one of these improvements must ship as a reusable core capability that serves the corporate website, investor Living Campus, and real customer SaaS. Do **not** create five more siloed apps.

### 0.1 Source and precedence algorithm

- **Original artistic canon:** SIGNAL original HTML, original dialogue and decisions; adaptations require explicit, tracked approval.
- **Original enterprise functionality:** v1.2 is authoritative for its products and workflows; v1.8 cannot delete or simplify it.
- **Existing v1.7 consolidated specification:** 1,009 requirement rows and 562 tracked QA cases are preserved byte-for-byte in source copies. Earlier 77 v1.6 QA rows were transparently reconstructed candidates, not original recovered tests.
- **Latest explicit founder decisions:** 9.99 USD per enterprise named user/month (supersedes 10.00), SIGNAL individual 24.99/month, SIGNAL teams 44.99/named seat/month, 1.99/14-day paid trial, free original SIGNAL through season 2, additional durations as in the original pricing CSV, AdSync frequency rules, all original prices/bundles/pilots preserved.
- **v1.8 overlay:** only the five topics above plus strictly necessary cross-cutting refinements; do not revise unrelated product, pricing, media, and navigation requirements by implication.
- **Live code and deployed truth:** current repository SHA and actual Render deployments outrank historical *claims about what is implemented*, but **do not override product design canon**. Record gaps, do not quietly erase requirements.
- **Conflict handling:** create an explicit Change Request/ADR; explain changed behavior, evidence, migration, tests, rollback, founder approval. No silent source rewrite.

**Trust labels:** `SPECIFIED`, `SYNTHETIC_DEMO`, `IMPLEMENTED_NOT_VERIFIED`, `LAB_VERIFIED`, `CUSTOMER_AUTHORIZED`, `LIVE_OBSERVING`, `DEGRADED`, `BLOCKED`, `REVOKED`, `RELEASED_VERIFIED`. These are capability-specific, timestamped and evidence-backed. An attractive screenshot, Render URL, paid subscription or passing mock is not sufficient for a LIVE claim.

## 1. The unified architecture (do not expand to unnecessary microservices)

**Client experiences:** corporate site; public product tours; investor Living Campus; authenticated tenant SaaS; Lite spatial/2D and optional 3D; role/industry Experiences; Pro; Search Party command; SIGNAL player; mobile technician workflows.

**Shared business capabilities:** content and product catalog; lead and consent service; pricing, quotes and pilot eligibility; checkout and entitlement state; identity and policy authorization; canonical entities; search and scoped relationship projections; workflow and approval engine; evidence ledger; commissioning applicability and baseline; connector SDK and capability registry; reports and durable media jobs; proof artifact/index service; performance and telemetry service.

**Authoritative data:** tenant-scoped PostgreSQL system of record, versioned immutable evidence/report snapshots, append-only audit events and outbox, customer-approved edge observations, separate demo fixtures, data provenance. A graph projection may accelerate Search Party but cannot become independent truth by accident.

**Infrastructure:** modular monolith first + durable background workers + outbound-only approved edge gateway + object storage/media CDN + observability; extract services only with a written latency/isolation/cost reason. Design for staged rollout, feature flags, tenant-level toggles, safe migrations, backup and rollback.

### 1.1 Two websites, one purchase-to-proof funnel

- `Corporate website` is the **trust and commercial front door**. It explains real value, shows accurate technical proof, hosts short films and industry routes, and offers a legible pilot purchase flow.
- `Investor Living Campus` is the **guided, public synthetic demonstrator**, with Enterprise, Stadium, University and Convention worlds; user context alters UI but never supplies privileges. Guided tours can show verified external proof or synthetic examples with clear labels.
- `Authenticated SaaS` is the **actual private customer operating system**. Purchases create entitlements through validated payment provider events. A tenant administrator must separately authorize integrations and equipment before real telemetry begins.
- A proof artifact can be linked across both public experiences where approved, but **must be sanitized/publicly shareable**. Never put actual customer-specific AV inventories, incidents, personal records, credentials, source tokens, student data, or sensitive network topology in public proof assets.

### 1.2 The canonical vertical slice

`Landing → 3-second clear value → industry selection → 30-second use-case explanation → 3-minute guided evidence-backed demo → pilot eligibility → transparent price/terms → secure hosted checkout → verified payment event → tenant provisioning → authorized admin/connector preflight → 3–5 approved rooms → observations with provenance → asset/QR/Search Party → commissioning/Assurance → executive dossier → export → measured value → customer-approved pilot-to-production conversion`.

A customer who lacks permission for a supported connector must **see a truthful blocker with an alternate synthetic/CSV sandbox**, not a fake instant connection. Payment is **software entitlement**, not authorization to access or control equipment.

---

## 2. Improvement A: Empathia Proof Center and Demo Readiness

### 2.1 Design purpose

Create one evidence-driven `Proof Registry` (a platform service, not a new fictional product) exposed through a **Proof Center** on the corporate site, investor demo, authorized customer tenant and founder admin. Its duty is to explain **what works, where, under which permissions, how recently, and with what proof**. This is the cornerstone of genuine enterprise trust.

**Visitor UX:** an elegant, readable readiness dashboard with product and capability filters. One clear badge per capability. A plain-English proof summary, source state, last verified timestamp and test context, sanitized screenshots/video, reference docs, known limitations, next scheduled verification, and the ability to open a guided tour or contact sales. A customer sees only their own permitted evidence. Investors can explore synthetic demos without mistaking them for real vendor integrations.

### 2.2 Proof/claim lifecycle

- `PROPOSED`: roadmap, concept, or unimplemented spec; never claim available.
- `IMPLEMENTED_NOT_VERIFIED`: implementation exists but has no acceptable current evidence.
- `SYNTHETIC_DEMO`: working only against well-labeled synthetic fixture data.
- `LAB_VERIFIED`: exercised with a known representative fixture/device/lab account; not evidence of production customer operation.
- `CUSTOMER_AUTHORIZED`: tenant granted scoped consent; still not proof of successful observations.
- `LIVE_OBSERVING`: data from an approved real source with current confidence/freshness; capability-specific, not a blanket platform label.
- `DEGRADED`, `BLOCKED`, `REVOKED`: clear failure reasons and user-safe recovery steps.
- `RELEASED_VERIFIED`: gated production deployment with linked test evidence and release timestamp. It does not imply real customer data unless independently `LIVE_OBSERVING`.

**Operational distinction:** one feature can be RELEASED_VERIFIED in a product build while an individual connector instance for a given tenant is BLOCKED or DEGRADED. Never collapse these into one misleading green check.

### 2.3 Registry contract

Define `claim_id`, `capability_id`, `product`, `world`, `scope` (PUBLIC_SANITIZED / TENANT / STAFF), `tenant_id` (nullable only for public synthetic), `implementation_revision`, `environment`, `data_kind`, `verification_state`, `verification_method`, `verifier_identity`, `verified_at`, `expires_at`, `source_type`, `source_freshness_at`, `evidence_ids`, `limitations`, `claim_text_public`, `owner`, and `approval_status`. `evidence_ids` refer to immutable audit-linked evidence; public render must use separately approved sanitized derivatives. Signatures/hashes protect integrity but do not alone prove clinical/engineering accuracy.

New release pipeline produces proof candidates, not automatically approved public claims. Require release manager and claim owner approvals where relevant. Automated revocation/downgrade of stale live observation. User-readable capability matrix per vendor: inventory, telemetry, status, safe diagnostics, write/control, provenance, scope, and tested API version.

### 2.4 Stop-ship failures

Any public claim marked real from synthetic evidence; cross-tenant or private evidence exposure; broken proof link for a primary sales claim; impossible claim state transitions; falsely stating compliance or completed video/integration; no timestamp/source; live status remaining green after revocation/outage; or claims inconsistent between the corporate site and investor demo.

**Proof acceptance:** a buyer can click a pilot use case, see a genuine source-backed capability statement, and independently distinguish *works in demo* from *works in real customer environments* in under 60 seconds of reading.

---

## 3. Improvement B: progressive world and role experience

### 3.1 Design purpose

Make first interaction intuitive without discarding the **52 original world-specific role configurations**. The initial public selector shows **four worlds**; after selecting one, show at most **4–6 human-readable top-level journeys** with an optional **All roles and advanced tools** action. Contextual selection is a reversible UX preference, not security grant. Authenticated menus derive from the intersection of persona preferences and server-granted permissions. Do not assume the exact same role name has identical permissions across worlds.

### 3.2 Recommended default journey presets (new curated presentation layer)

| World | First-level journeys (illustrative; labels require UX testing) | Deeper original roles preserved |
|---|---|---|
| Enterprise (original 90 rooms) | Explore Workplace; Find & Support; Engineer & Commission; Manage Operations; Executive Overview | Employee, Visitor, Service Technician, Service Engineer, Systems Engineer, Product Architect, Operations Lead, Executive, tenant admin and remaining original v1.7 configurations |
| Stadium (Soldier Field-inspired) | Attend Game; Find Amenities; Broadcast & Production; Venue Engineering; Venue Operations | Fan, away fan, premium guest, visitor, event producer, AV/IT/broadcast engineer, tech, executive, admin etc. |
| University (Illinois-inspired) | Student Life; Discover Campus; Study & Play; Teaching & Research; Campus Technology | Student, prospective student, visitor, faculty, researcher, support, AV/IT, facilities, executive, administrator etc. |
| Convention (McCormick Place-inspired) | Attend Expo; Exhibitor Experience; Keynote & Polls; Production & Broadcast; Venue Operations | Attendee, exhibitor, speaker, event host, service, engineering, operations, executive, admin and all original v1.7 configs |

World-specific entry points must preserve original deep links and browser back navigation. Persist world preference only with appropriate consent; never carry a privileged role into a new tenant. On context change, **re-authorize all routes, invalidate scoped caches, cancel in-flight privileged fetches, and replace data with permitted content before rendering**. Accessible keyboard and screen-reader interactions, clear breadcrumbs, a helpful zero-data state, responsive layouts and low-memory devices are first-class requirements.

### 3.3 Avoid a 52-option wall

Do not place 52 role labels in a single dropdown. Roles are organized by world and purpose, advanced views are available after choosing the world, and currently authorized professional roles are discoverable by name. Provide a safe visitor/demo role to learn with synthetic data; no implicit access to production equipment. First-time tours have **Skip tour**, **Show all features**, and **What can I do here?** actions. Product experts can bypass guided onboarding.

### 3.4 Example flows

- **Executive buyer:** Corporate site → Enterprise → Executive Overview (synthetic) → evidence-linked risk metric → sample dossier → purchase eligible pilot.
- **Field technician:** Authenticated private tenant → Scan asset → permitted site → device passport → assigned work / commission / export; without selecting a world at every step.
- **Fan:** Stadium → Attend Game → find their seat/concessions and watch synthetic crowd-acoustic Experiences; no visibility into broadcast topology.
- **Student:** University → Student Life → permitted timetable/map/food/travel; separately opt into experiences and academic services.
- **Expo attendee:** Convention → Attend Expo → privacy-preserving polls, sessions and exhibitor discovery; no organizer or engineering control.

**Quantifiable UX tests:** first-time visitor should reach a relevant use case in ≤3 actions (proposed target), 90% of representative test participants should correctly state whether they're in demo vs live after a prompted task (proposed usability criterion), median wayfinding time and misclicks compared to v1.7 baseline to be measured before claiming improvement.

---

## 4. Improvement C: real self-service pilot and time-to-value

### 4.1 Commercial non-negotiables

Preserve the original product-by-product SKUs, 7 bundles and four published v1.5 pilots unchanged without founder-approved pricing migration:

- `PILOT-DISCOVERY`: **$49.99**, 14 days, synthetic tenant, sample room, readiness checklist; no real hardware promise.
- `PILOT-READONLY`: **$199.99**, 30 days, one supported and customer-approved cloud source, up to 5 rooms; self-serve, no staffed setup guarantee.
- `PILOT-HARDWARE`: **$499.99**, 30 days, up to 10 approved rooms, one named supported connector, bounded guided onboarding, no invasive tests without approval.
- `PILOT-CAMPUS`: **$1,499.99**, 45 days, up to 3 sites and 25 rooms; contract and security authorization required.

Founder's named-user Enterprise rate is **$9.99/month**, and SIGNAL retains **$24.99 individual**, **$44.99 team-seat**, **$1.99 paid 14-day trial**, free through published Season 2, controlled 2–4 episode AdSync frequency, 3/6/12-month terms as priced in v1.5, and no double-charging an included seat. No changes in this release unless founder explicitly approves them. Display taxes, renewal, cancellation, exclusions and eligibility clearly. Never put raw card/bank data into Empathia; use provider-hosted onboarding/payment and verified webhooks. Founder payout account only through processor-managed onboarding, access controls, audit and recovery.

### 4.2 Deployment Readiness Wizard: Preflight before a payment commitment where material

One page or short progressive flow: `goal → desired pilot → supported ecosystem/connector → tenant admin approval → site/room count → network/identity prerequisites → source capabilities and expected freshness → data protections → price/terms → pay or contact technical team`. The wizard outputs `READY_TO_PURCHASE`, `READY_AFTER_CUSTOMER_ACTION`, `REQUIRES_SALES_REVIEW`, or `NOT_CURRENTLY_SUPPORTED`, plus explicit blockers. **Never collect secrets in the public form.** Source platform credentials granted only through an authorized OAuth/SSO or approved managed edge setup after checkout. Some real-enterprise security reviews will necessarily take longer than self-service purchase; do not promise “connected in seconds” without evidence.

### 4.3 Actual post-payment state machine

`CHECKOUT_STARTED → PAYMENT_PENDING → PAYMENT_VERIFIED → ENTITLEMENT_CREATED → TENANT_READY → IDENTITY_APPROVED → CONNECTOR_AUTHORIZED → DISCOVERY_IN_PROGRESS → FIRST_SOURCE_VERIFIED → ASSETS_RECONCILED → PILOT_ACTIVE → FIRST_REPORT_DELIVERED → REVIEW_READY → CONVERSION_APPROVED / PILOT_ENDED / REFUNDED / DISPUTED`.

Model failure and rollback for every transition: queued retries, idempotency keys, reconciled invoices, canceled/failed charges, stale webhooks, user abort, connector denial, token expiry, unreachable edge agent and partial discovery. **Never grant hardware controls or read data just because payment succeeded.** Customer admin approval and specific vendor API capability is separately required.

### 4.4 What the first three–five rooms must demonstrate

A transparent approved pilot scope; a real observation from a supported source; correct persistent asset identities and duplicate-resolution; one asset QR scan; Search Party link to authorized records; relevant commissioning imported or run under permission; Assurance baseline comparison with uncertainty; an executive dossier with consistent PDF/DOCX/XLSX/JSON totals; audit trail; post-pilot expansion path. Provide a sample failed or stale observation to demonstrate graceful error behavior instead of fabricating green status.

### 4.5 Pilot-to-production without repeating work

Persist the same tenant identity and asset registry as paid usage expands. Upgrade entitlements (not duplicate tenant), preserve evidence hashes, signatures, accepted baselines, search relations and protected audit history. On downgrade/expiration, enforce clear read-only or archive behaviors, data export rights and documented retention/deletion. Never hold customer evidence hostage or silently erase it because subscription status changed.

**Kraft Heinz-style potential pilot:** only with company-appointed authorized admin, signed lawful scopes, proper credentials and procurement/privacy approvals. Never reuse former-employer data or connect to an organization's network merely because the founder once worked there.

---

## 5. Improvement D: performance, accessibility and graceful degradation

### 5.1 Rule: 2D utility before 3D delight

The corporate site should become useful with minimal downloaded JavaScript. The investor site should load the four worlds as lightweight cards and offer immediate text/map-based navigation. The private SaaS should make the primary action interactive without blocking on 3D model, videos, marketing animation, search reindexing, or large report generation. Lazy-load costly worlds, experiences and media only when selected; prioritize QR scan, source status, search and field operations on ordinary mobile hardware.

### 5.2 Proposed performance acceptance budgets (hypotheses; validate against actual devices)

| Path | Proposed initial engineering budget | Measurement/qualification |
|---|---|---|
| Corporate mobile landing | LCP ≤2.5s at p75, INP ≤200ms at p75, CLS ≤0.1 | Real user Web Vitals where sample is sufficient; lab emulation for CI, not substitute for field data |
| Investor world selector | Interactive selection without downloading unchosen 3D worlds | Network waterfall and low-end Android test |
| Private tenant asset passport | p95 API read <500ms under defined warm-cache/load fixture; no loading deadlock | Define fixtures/load and origin; measure server and UX separately |
| Search Party | p95 basic authorized search <1.2s under representative dataset; clear stale/partial indicator | Tenant-scoped fixture + query capture |
| QR-to-passport | Accessible asset passport displayed within target 3s on defined test hardware/network, excluding auth delay | Benchmark and publish test conditions |
| Export job enqueue | Acknowledgment <2s; generation async with visible status and retry | Fault injection and job queue telemetry |
| 3D world | First 2D interaction stays available; 3D loads progressively with quality presets | Low/med/high devices, battery and memory monitoring |
| SIGNAL film | Poster and transcript available before stream; captions and 2D reading fallback | Bandwidth simulation and accessibility tests |

These numbers are **proposed release budgets, not measured performance guarantees**. Before any public performance claim: record baseline data, mobile test profiles, RUM confidence, errors, load scenarios, and comparison. Build a budget dashboard visible to engineering/authorized founder; never leak private tenant metrics to public visitors.

### 5.3 Resilience patterns

- CDN cache only static public assets; private data caching has tenant/user/permission keys and short validity. Revoke scoped caches on role/world or authorization changes.
- Report and media processing use durable asynchronous jobs, idempotency, retry limits, DLQ, progress, cancellation and downloadable completion results; compute errors must not lose submitted evidence.
- Production visitor maps and field tasks have a usable 2D fallback; 3D is progressively enhanced. User-selectable reduced motion, low bandwidth, captions, screen-reader alternatives.
- Service and connector cards show state and freshness; outages do not render stale observations as live.
- Edge agents buffer permitted offline events with bounded storage and secure reconciliation; never claim full offline hardware control.
- Enforce accessibility including WCAG 2.2 AA target where applicable, keyboard focus, hit targets, contrast, status announcements, motion control and help text. Formal WCAG conformance requires audit rather than a checkbox.

### 5.4 Real measurement, not self-congratulation

Instrument LCP/INP/CLS, mobile memory, JS transfer, API latency, queue delay, video startup and rebuffers, search correctness, QR latency, successful pilot first telemetry, and report completion. Run synthetic monitoring plus RUM with privacy controls. Keep a baseline and compare before/after: regressions in pilot, QR, accessibility or core engineering workflows are release blockers even if the homepage looks nicer.

---

## 6. Improvement E: single flagship proof film — from source to accepted evidence

### 6.1 Position in the film library

**Preserve all original eight film concepts and the four additional films (09–12) from v1.4**. v1.8 adds **Film 13 — “ONE ROOM. ONE TRUTH.”** (working title), a 3–4 minute source-to-report technical proof film with short 75–90s, 45–60s, 15s and 6–8s derivatives. It can also be the centerpiece of the corporate homepage and guided Living Campus tour. This is a *proposed film specification*, not a completed production asset.

### 6.2 Story beats and minimum proof

| Segment | Purpose | Real or synthetic evidence label |
|---|---|---|
| 00:00–00:20 | Real operational problem: a meeting room fails ahead of a high-stakes call | Use fictional situation unless authorized customer story; no misleading live-data overlay |
| 00:20–00:45 | Approved room/device discovery and asset QR | Screen-record a working test environment; clearly show data class |
| 00:45–01:10 | Search Party finds the room/asset/owner and technical relationships | Same asset ID, same tenant, same timestamped source |
| 01:10–01:40 | Engineer executes an applicable commissioning test and attaches measurement/evidence | Genuine test result or marked synthetic result; no impossible hardware motion |
| 01:40–02:10 | Deficiency requires intervention; Assurance checks against accepted baseline | Engineering state transitions must follow policy; no fake auto-green acceptance |
| 02:10–02:35 | ServiceHands assigned; Scouter offers evidence-backed alternative where applicable | Human approval and costing/provenance visible, no AI direct hardware actuation |
| 02:35–03:05 | Resolved and verified; executive report created from immutable snapshot | PDF/DOCX/XLSX/JSON same test totals and source references |
| 03:05–03:40 | One system, multiple permitted views; public buyer sees truthful proof & starts pilot | Four-world architecture without claiming official venue affiliations or existing customers |

**Narrative law:** establish the problem, show an observable consequence, make a decision, verify the result, and produce durable evidence. Do not montage through feature names and call that proof. Production must be technically accurate about HDMI/USB-C, Dante/AES67, UC engines, microphones, DSP, camera PTZ, network behaviors, latency and telemetry limits where featured. Real engineers should review physical operation and measurements.

### 6.3 Film production contract

Scene index with timecodes, script/storyboard, source asset version, exact on-screen data class, evidence references, approved performer/voice rights, model/character continuity where used, licensing, captions/transcript/audio description, color-management notes, audio mixes, delivery profiles, posters and accessible non-video transcript. No unauthorized third-party footage/marks; no synthetic source visuals presented as actual customer results.

Reuse v1.7 SIGNAL showrunner and destructive-media QA process: inspect hands, faders, controller movement, lip sync, camera geometry, eye gaze, UI-state continuity, signal flow correctness, unnatural animation, false warnings, audio intelligibility, peak safety, captions and encoding artifacts. VidIQ can optimize online publishing strategy, *not* manufacture video. ElevenLabs/creative connectors must be authorized/licensed; AI-assisted narration must be accurately represented. Produce one 20–30 second **proof-of-visual-and-technical-continuity pilot scene** and human-approve it before generating the full film.

**Release gate:** the flagship video is never called completed until video file exists, plays across devices, has rights manifests, meets tested technical/creative QC, maintains exact IDs and business states shown in UI, and allows viewers to open corresponding sanitized proof artifacts.

---

## 7. Cross-cutting execution and change control

### 7.1 Required documentation and artifacts

- Current source audit: repository URL/context, commit SHA, Render config, deployment region/runtime, active domains, network topology, migrations, invoices and billing providers, tenant model, default feature flags and CI results. Mask secrets and sensitive records.
- v1.7-to-v1.8 migration / no-loss register for original source, all 52 role configurations, 90 rooms, every original SIGNAL chapter/decision, v1.5 prices, prior reports, and previous films.
- Exact requirements mapping: `v1.8 requirement ID → source path/route → data contract → test ID → evidence path → owner → status`.
- Five ADRs documenting assumptions, rejected alternatives, trade-offs and proof of performance/security.
- Proof Center prototype and working backend registry with permission-filtered public projection.
- Curated role/world selector navigation and secure context-switch tests.
- Pilot readiness wizard and payment webhook sandbox end-to-end test with scoped source authorization fixture.
- Performance comparison using specified mobile hardware/bandwidth and audit-ready graphs.
- Working short flagship film pilot, followed by film master if and only if approved/produced, media defects and corrections.
- Release packet including no P0/P1 stop-ship gaps, applicable QA reviewer signatures, source integrity hash, rollback and truthful deployment/feature status.

### 7.2 Build order — prioritized, not expanded scope masquerading as speed

**G0 — Audit + preserve.** Map v1.7 requirements/test baselines and current deployed truth. Restore any regressions before new work. All 1,009 historical requirements remain required even if some are unimplemented.

**G1 — Shared Proof Registry and safe public claims.** Implement claim schema, evidence references, state machine, tenant/public projections, expiration/downgrade and negative tests.

**G2 — Guided entry and role context.** Ship world-first UX, no clutter, deep-link compatibility, server-authorized role/tenant isolation, mobile accessibility.

**G3 — Pilot readiness + honest checkout-to-connection.** Validate supported connector preflight, $49.99/$199.99/$499.99/$1499.99 catalog parity, secure payment webhooks, tenant entitlements, one consented read-only supported source, source freshness and evidence.

**G4 — Performance foundation.** Budget tracking, 2D-first Lite, lazy 3D/film/media, background exports, fault injection and regression tests; prevent new work from regressing existing field/commissioning workflows.

**G5 — Flagship film continuity pilot.** Author source-linked script, storyboard and approved 20–30s working scene; technically validate and build full production only as authorized.

**G6 — Integration, destructive QA, then release.** Verify both websites, private SaaS, enterprise workflows and SIGNAL, carry forward 18 reviewer perspectives, run failure tests and evidence gates; publish only after founder-approved deployment.

### 7.3 Quantitative success indicators (measure baseline first)

- Visitor first-use-case success, buyer comprehension of demo-vs-live, time to find correct product/role, qualified pilot checkout completion and abandonment.
- Pilot proportion that reaches first **customer-authorized verified source observation**, time from authorization to first telemetry, reliable asset reconciliation and percent completing first report.
- Cross-tenant attempted access rejection, zero unauthorized mutations, audit completeness, stale observation correctness and proof claim expiry.
- Search Party task duration, QR-to-passport latency, report cross-format consistency and accessibility task completion.
- Film watch-through, pilot interest after film, caption accuracy, source proof link activation, audio/video artifact failure rates.

**Do not invent targets or percentage improvements before measuring.** Proposed UX/performance budgets are hypotheses pending testing. No claim of “best ever,” regulatory certification, perfect reliability, existing stadium/university/convention relationships or Kraft Heinz deployment without actual evidence.

### 7.4 Must not happen

No original Enterprise or SIGNAL functionality removed. No visual role change as permission escalation. No billing-based equipment authorization. No crossing demo/live/private tenant boundaries. No public private engineering records. No fake telemetry, artificially passed commissioning, or mislabelled proof. No unauthorized founder data backdoor. No bulk AI films with inconsistent identity or physical operations. No deployment/spend to external production without explicit authorization. No untested source-less 'PASS' claim.

## 8. How Claude should respond and execute

**FIRST RESPONSE:** state source archive and active Git SHA; confirm v1.7 baseline count and preservation; summarize current site/readiness statuses based on runtime evidence; identify 5 v1.8 workstreams and affected modules; list highest-impact blockers; describe the exact first vertical slice and specific tests; identify decisions requiring founder/tenant authorization. Proceed into the repository implementation if tools and permissions allow. Do not stop at generic planning. If current repo or external connectors are inaccessible, build useful staging contracts, fixtures and tested components with honest `BLOCKED` status for live deployment.

**EACH ITERATION:** changed source files; API/database/migrations; requirement IDs; tests actually run and evidence; screenshots/recordings; baseline vs new performance; risks and residual defects; authorized next action. Preserve exact files/IDs in the attached matrix. No release certification without external signatures where needed.

**Closing instruction:** Build the website people trust, the demo people remember, and the SaaS that an authorized customer can actually operate. The widest vision must be powered by a small, reliable collection of shared capabilities, not a constellation of disconnected UI demos.
