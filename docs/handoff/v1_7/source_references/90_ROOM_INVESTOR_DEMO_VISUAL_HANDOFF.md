# Empathia Living Campus — Investor Demo Visual Handoff
**Version:** 2026-11-05 Concept Reference 1.0  
**Status:** Visual target and development specification. NOT implemented, verified, deployed, or an operational data report.  
**Owner:** Empathia Technologies.  
**Assets:** Four generated illustrated screen boards shipped alongside this document.

## IMPORTANT: how to use the images
The four PNGs show VISUAL ART DIRECTION, not source code, pixel-perfect UX, regulatory proof, or accurately computed KPIs. AI-generated tiny labels can contain misspellings, duplicated elements, inconsistent numerical totals, and invented UI copy. **This document and the recovered actual project schemas take priority over words and numbers embedded in concept images.** Claude should reconstruct each screen with accessible DOM components, authentic interactions, coherent persistence, and deterministic synthetic fixtures—not use the entire collage as a background image. No synthetic data may be described as live telemetry. Before adding 45 rooms, verify whether the existing canonical 45-room estate is actually recoverable.

### Four concept boards
- `01_ecosystem_hero_and_workflows.png`: flagship investor experience; campus overview; global search; Lite proposal; portfolio, commissioning, service, intelligence, finance, mobile, QR, architecture.
- `02_fifteen_screen_coverage.png`: numbered 15-screen coverage: intro, perspective selector, campus, Search Party, Lite, Pro, commissioning, ServiceHands, APEX, Field Intelligence, SIGNAL, control towers, requester journey, QR, mobile.
- `03_search_and_lifecycle.png`: universal search and cross-product lifecycle in a different screen layout; room previews, registers, assurance, change coordination.
- `04_room_design_and_portfolio.png`: bigger room-design and asset/portfolio panels, synthetic multi-campus world, alerts, Search Party, drawing intelligence and sustainability.

## Visual design principles
- Premium, futuristic but warm; restrained charcoal/navy foundation, accessible white light theme, teal global action accent, 9 carefully differentiated product accent identities; vivid 3D space visuals rather than neon everywhere.
- Hierarchy: **find anything / understand the room / take the next action / prove the outcome**.
- Very high legibility; no tiny text. Dense technical data uses progressive disclosure, table virtualization, user-adjustable density and sticky filters. Touch targets WCAG 2.2 AA; keyboard and screen reader supported; reduced-motion alternatives.
- Persistent shell: Empathia mark, active tenant/campus, GLOBAL Search Party omnibox, role/perspective, notifications, help, theme; mobile has a compact two-row header, thumb-friendly actions and Search/Scan/Work navigation.
- Every view has a clear synthetic demo banner and source/provenance state: DECLARED, MODELED, SIMULATED, OBSERVED, MEASURED, VERIFIED. Only VERIFIED when relevant criteria and evidence exist (e.g. source catalog verified is distinct from field-verified installed unit).
- Explicitly distinguish a visual presentation of a 90-room sample from proven 90-room functionality. Model/render the final estate only after data generation and parity checks.

## Proposed primary investor journey — 14 scenes
01. **Landing / value:** Every room. Every device. Every decision. With its evidence. Choose guided journey or explore.
02. **View-as chooser:** Investor, Requester, Employee, Executive, Systems Engineer, Technician, Designer; explain demo perspective does not grant real privileges.
03. **Mission Control:** 90-room sample map, estate rollups derived from fixture records, today’s priorities and a transparent synthetic badge.
04. **Explore campuses:** portfolio→campus→building→floor→room selection; location breadcrumb and accessible list/map sync.
05. **Search Party:** search `camera in town halls`, filter by firmware, show device/room/owner/incident chain and safe next actions.
06. **Pro registers:** open camera device passport, then room register, owner, documents, warranty, ports, change record; all entities deep-linked.
07. **Lite requester:** start with *photos / floorplan / dimensions / project goals* and choose comparable room archetypes.
08. **Lite proposed:** inspect a conceptual 3D redesign, calibrated known dimensions and estimated unknowns labeled, compare A/B/C, use Scouter.
09. **Drawing intelligence:** trace design source, room IDs, equipment tags, cabling/network and unverified conditions; export concept package.
10. **Commissioning:** test applicability by equipment and room archetype; synthetic run, expected evidence and acceptance baseline.
11. **Assurance / Core Replay:** demonstrate device swap → tests invalidated → measured vs simulated distinction → recommissioning.
12. **ServiceHands / Field Intelligence / APEX:** triage incident, inspect graph, show supported diagnostic observations, dispatch and verification.
13. **Executive view:** budget, lifecycle capital, support risk, sustainability provenance, filter to underlying records.
14. **Learn / SIGNAL and close:** role-specific training simulation, architecture trust boundaries, CTA to request a supervised pilot.

## Screen-by-screen functional storyboard — 36 views
Every view needs loading, empty, error, offline (where applicable), restricted-state and mobile adaptations; no dead buttons.

| Screen | Primary UI | Minimum working interaction |
|---|---|---|
| 01 Public site home | corporate hero, room imagery, buyer CTA | navigate products and investor tour |
| 02 Investor start | three entry paths, test-data statement | launch guided/freeform tour |
| 03 Perspective switcher | scoped role cards and capabilities | switch visual view and reset breadcrumb safely |
| 04 Mission Control | KPIs and global estate map | filter campus / select KPI → evidence list |
| 05 90-room browser | map/list/grid and 3D thumbnail cards | select campus, archetype, room, status |
| 06 Campus level | buildings with floors | drill into building and floor |
| 07 Floor plan | accessible 2D plan, colored room areas | select space from plan or list |
| 08 Room passport | design status, occupancy, purpose, devices | jump into Lite/Pro/service/tests |
| 09 3D room viewer | orbit, plan, elevations, device labels | select object → inspector |
| 10 Global Search Party dropdown | combined terms, grouped results | keyboard arrows, Enter, Esc, scoped deep link |
| 11 Search results explorer | filters, saved queries, list/map/graph | exact ID, model, owner, file and status queries |
| 12 Search relationship map | room↔device↔port↔incident↔team | navigate one relationship with provenance |
| 13 Universal action palette | context-aware permitted actions | open, copy, request, assign (demo simulation) |
| 14 Pro portfolio | room/device KPIs and graph | every KPI opens filtered records |
| 15 Pro room register | room ID/name/campus/archetype/risk | filter, sort, group, export |
| 16 Pro device register | ID, serial, model, firmware, warranty | multi-filter and open passport |
| 17 Device passport | identity, topology, incidents, lifecycle | navigate entity evidence and changes |
| 18 Lite starting choice | blank/from similar/from files/from photo | initialize editable project |
| 19 Intake room request | goal, site, photos, floorplan, budget | autosave draft and show constraints |
| 20 Photo/plan import review | scale calibration and uncertainty | correct dimensions before model generation |
| 21 Similar-room finder | visual archetype gallery with evidence labels | choose source design and duplicate as proposal |
| 22 Lite 2D editor | grid, snapping, walls, doors, furniture | pan, measure, undo/redo, autosave |
| 23 Lite 3D preview | realistic materials, AV devices, camera views | orbit, compare planned alternatives |
| 24 Proposed compare | current/designed/proposed, A/B/C | side-by-side with budget assumptions |
| 25 Space Optimizer | coverage/sightlines/audio/supportability | show tradeoffs and underlying assumptions |
| 26 Scouter | approved catalog, alternatives, specs | filter verified vs spec-to-verify models |
| 27 Drawing Intelligence | floor plans, device tags, signal/rack views | reconcile design vs current graph |
| 28 Project/BOM/Budget | scope, estimates, change log | trace each BOM item to design and cost |
| 29 Commissioning planner | test packs, equipment, applicability | generate tests from room profile |
| 30 Commissioning test | guided steps, instrument list, evidence | demo mark simulated; capture synthetic evidence |
| 31 Assurance replay | baseline, history and drift | play synthetic change scenario; list impacted tests |
| 32 ServiceHands | triage, work order board, tech context | open→assign→work→verify→close scenario |
| 33 Field Intelligence / APEX | safe diagnostic trace and evidence | inspect hypotheses and consent-gated actions |
| 34 Executive / Sustainability | finance, exposure and efficiency | drill to room cost provenance and assumptions |
| 35 Mobile QR / Field | scan QR, room entry, jobs, photos | context and permission-aware deep link |
| 36 Learn / SIGNAL | playable case, decision branches and debrief | choose scenario branch and retain outcome |

## Data authority and fidelity
The sample estate is entirely fictional, clearly **SYNTHETIC**, with NO real customer identity or real telemetry. `90 rooms` is the **proposed visual target**, not an observed installed count. Generate every total (`devices`, `assets`, `issues`, `projects`, `warranties`, `utilization`, `pass rates`, `energy`) from deterministic test fixtures. Do not copy inconsistent totals from the concept images. Preserve the current 45 canonical room IDs/geometry/replay evidence when source exists; only append new IDs for the expansion. The new 45-room roster below is a proposal and MUST be de-duplicated against the real existing 45 before seeding.

### Add 45 distinctive room scenarios (proposed, 9 sectors × 5)
Each must have unique dimensions, purpose, seating, AV modality, accessibility requirements, network and power topology, and a different demonstrated customer journey. Device models only from a verified catalog; otherwise label `SPEC TO VERIFY`.

| ID | Sector | Room archetype | Showcase capability |
|---|---|---|---|
| ADD-01 | Corporate collaboration | Global Executive Briefing Center | multiple audiences, content switching, executive story |
| ADD-02 | Corporate collaboration | Convertible Client Experience Suite | reversible room plans and proposed mode |
| ADD-03 | Corporate collaboration | Boardroom with Integrated Translation | language routing and accessibility |
| ADD-04 | Corporate collaboration | Multisite Immersive Telepresence Room | intersite codecs, latency and dependency graph |
| ADD-05 | Corporate collaboration | Modular Project War Room | reconfigurable displays, collaboration and control |
| ADD-06 | Broadcast and events | Broadcast Master Control | SDI/IP signal flow, monitoring and failover |
| ADD-07 | Broadcast and events | Multi-camera Podcast Studio | microphones, DSP, camera presets and remote guest paths |
| ADD-08 | Broadcast and events | Esports Broadcast Gallery | high-density displays, low-latency routing |
| ADD-09 | Broadcast and events | Live Hybrid Production Theater | zones, show-control and assisted listening |
| ADD-10 | Broadcast and events | Outdoor Event Control Compound | portable racks, weather and network continuity |
| ADD-11 | Operations / resilience | Global Network Operations Center | network rack/port topology and incidents |
| ADD-12 | Operations / resilience | Cybersecurity Operations Center | privacy and role-scoped incident context |
| ADD-13 | Operations / resilience | Emergency Operations Center | redundancy and evidence trail |
| ADD-14 | Operations / resilience | Critical Incident Briefing Room | high-priority escalation and workflow orchestration |
| ADD-15 | Operations / resilience | Backup Disaster Recovery Command Room | failover, source of truth and recovery drill |
| ADD-16 | Health / research | Telemedicine Consultation Suite | audiovisual privacy, call experience and quality |
| ADD-17 | Health / research | Clinical Simulation Theater | capture, replay and operator controls |
| ADD-18 | Health / research | Medical Training Auditorium | hearing assistance, camera views and lecture streaming |
| ADD-19 | Health / research | Research Collaboration Laboratory | secure file/display sharing, asset lifecycle |
| ADD-20 | Health / research | Hospital Logistics Coordination Room | wallboards, uptime and role-scoped data |
| ADD-21 | Education | Hybrid Tiered Lecture Hall | projection geometry and mic pickup coverage |
| ADD-22 | Education | Active Learning Classroom | many display groups and BYOD switching |
| ADD-23 | Education | Interpretation & Language Lab | headset network, VoIP and signal routing |
| ADD-24 | Education | University Multipurpose Auditorium | event mode changes and commissioning |
| ADD-25 | Education | Immersive STEM Maker Studio | flexible device positions and power loads |
| ADD-26 | Industrial and logistics | Warehouse Dispatch Operations Center | ruggedized displays, network dependency |
| ADD-27 | Industrial and logistics | Manufacturing Supervisory Control Room | operator consoles, safe access controls |
| ADD-28 | Industrial and logistics | Industrial Quality Review Suite | high-resolution inspection and capture |
| ADD-29 | Industrial and logistics | Factory Safety Training Facility | simulation, SIGNAL and verified training |
| ADD-30 | Industrial and logistics | Supply-Chain Visualization Wall | huge display matrices and data sources |
| ADD-31 | Civic and hospitality | City Council Hybrid Chamber | speaker queuing, transparency and recording |
| ADD-32 | Civic and hospitality | Digital Courtroom / Hearing Room | secure evidence routing and audit policies |
| ADD-33 | Civic and hospitality | Museum Immersive Gallery | exhibit schedules, signage and accessibility |
| ADD-34 | Civic and hospitality | Grand Hotel Divisible Ballroom | room combine logic, audio and camera zones |
| ADD-35 | Civic and hospitality | Interactive Visitor Welcome Gallery | wayfinding, QR navigation, digital signage |
| ADD-36 | Infrastructure engineering | AVoIP Interoperability Lab | multicast, QoS, device capability profiles |
| ADD-37 | Infrastructure engineering | Rack / Network Integration Laboratory | cable tests, UPS and thermal/power models |
| ADD-38 | Infrastructure engineering | AV Product Certification Bay | test pack generation and approved devices |
| ADD-39 | Infrastructure engineering | Robotics & Smart-Sensor Prototype Room | permissioned measurements and simulation |
| ADD-40 | Infrastructure engineering | Building Facilities Operations Room | BMS-linked context, space and energy optimization |
| ADD-41 | Future workplace | Multimodal Accessible Collaboration Room | caption/hearing/controls adaptations |
| ADD-42 | Future workplace | HR Interview & Privacy Suite | role-based information and media privacy |
| ADD-43 | Future workplace | Distributed Coworking Neighborhood | utilization and hot-desk integrations |
| ADD-44 | Future workplace | Mobile Executive Broadcast Kit Base | portable device lifecycle and deployments |
| ADD-45 | Future workplace | Workplace Transformation Showroom | proposed vs current design and project ROI |

## Seed rules and sample stories
- Model multiple enterprise regions/time zones with 3 primary campuses and optional regional satellite sites. Do not expose real employee identities.
- Include realistic distribution: approximately one-third small/huddle/focus, one-third medium collaboration/training, remainder high-complexity specialty/large rooms. The 45 additions skew toward diversity; the preserved original 45 should balance the estate.
- Device inventory must reflect room bill of materials and lifecycle; no arbitrary inflated totals. A 2-person huddle should not receive auditorium-scale commissioning.
- Introduce 8–12 named **simulated** incidents with root-cause/evidence cards, 5 change requests, 8 managed projects, multi-year replacement planning, 5 budget scenarios, a few service tickets with different escalations, 3 approved design comparisons and 3 synthetic replay stories.
- At least one scenario demonstrates a requestor attaching a phone photo and approximate dimensions and seeing a **conceptual** proposed room compared with a similar past project. Show uncertainty and require engineer review before engineering claims.
- Synthetic commissioning: intentionally include pass, conditional and fail conditions; failures generate deficiencies and ServiceHands actions. Do not invent field measurements or claim the hardware was tested.
- Demonstrate energy and lifecycle savings as **modeled scenario assumptions**, never as proven performance.
- Separate `model_verified` (catalog identity) from `unit_verified` (physical observation), `commissioning_accepted`, and `telemetry_live`.

## Search Party — exact interaction targets
**Global hotkeys:** `/` and Cmd/Ctrl+K, escape to close, arrow and Enter navigate, focus restored. Search supports typeahead, accessible combobox, recent queries, optional voice input behind consent, saved scopes and a QR field launcher.

**Entities:** room, campus, floor, device model, physical asset, logical position, network port, cable, signal route, owner, team, vendor, warranty, design revision, drawing, budget line, project, test, evidence, incident, work order, training case, SOP, change request.

**Queries:** `ATL-4-218`, `camera in a town hall`, `Logitech Rally Camera`, `show devices with warranty expiring within 90 days`, `who supports DSP in boardroom?`, `find drawing for room 4.218`, `find rooms affected by switch SW-14`, `what is commissioning debt in north campus?`.

**Result row:** icon, title, type, unique ID, location, lifecycle status, verified-source marker, last-updated timestamp; expandable provenance; primary safe action (Open) and contextual secondary action (View room, View evidence, Request service) according to permissions. Relationship queries should either return a grounded graph path or explicitly state that the relationship is unknown. Never fabricate owners, status or cited evidence. Show fast exact-ID results and do not let AI search impair keyword search.

## Pro — register UX
Create a full-width table and card toggle for room and device registers. Preserve optional advanced columns but default to 6–8 useful columns, with sticky search/filter pills, configurable visible fields, copy-ID, export and saved views. Every cell linking to a record must navigate. Suggested device columns: Asset ID, name/model, room/site, physical position, lifecycle state, last observed, firmware, warranty horizon, support owner, criticality. Room register: Room ID, canonical name, site/floor, archetype, intended purpose, accepted baseline, readiness evidence, work orders, design revision, next review. Data remains synthetic and derived from fixtures.

## Lite — requestor’s five-minute wow journey
1. Requestor selects `Upgrade this room` and chooses existing QR / location.
2. Uploads photos / floorplan, adds approximate measurements and desired use, capacity, Teams/Zoom and budget preference.
3. System picks visually similar **approved historical example designs** (in demo, clearly marked sample designs), showing provenance and differences.
4. Lite produces **a proposed illustrative model**, NOT field-verified geometry; unknown dimensions highlighted with dotted walls/labels.
5. User visually chooses A/B/C plan layouts with 3D previews, camera FOV, sightline and accessibility planning overlays; all estimates tagged.
6. Click `See budget and tradeoffs` → BOM range, expected design constraints, workflow review status and required site survey.
7. Click `Submit for Engineering Review` → persistent request in demo-scoped store with linked design option and documents.
8. Engineering perspective sees request, reconciles measurements, approves/rejects design assumptions, generates plan/BOM/test requirements and coordinates project.
9. Allow realistic comparison of `current photo` vs `proposed render`, with 2D/3D synchronized selection and undo. Never imply photo alone yields accurate dimensions or acoustics.

## UX/test acceptance criteria for Claude
1. Start from surviving source/fixture inventory; preserve existing 45 IDs and canonical geometry. Merge only with founder approval.
2. Every UI element in visual boards maps to real route/action or explicit disabled state with explanation.
3. 90 synthetic room records have unique IDs and valid campus/floor structure; all linked records and read-only graph edges resolve.
4. Room/list/map/3D selection stays synchronized; back button preserves filters and scroll position.
5. Search exact ID, typo recovery and multiword relational queries behave deterministically; restricted records do not leak via counts/snippets/suggestions.
6. Room and device registers paginate/virtualize; CSV/XLSX/PDF exports match applied filters, data dictionary and provenance.
7. Lite returns a viewable, editable proposed model from provided or demo-approved source images, estimates are labeled; room project persists in isolated demo mode.
8. Commissioning tests are based on equipment/archetype applicability; no universal fake PASS results.
9. Role selector changes demo perspective only; the real application enforces authentication, tenant/site RBAC/ABAC server-side.
10. Desktop at 1440/1920, tablet at 768/1024, mobile at 360/390/430 checked; keyboard, high zoom, screen reader, dark/light, reduced motion, offline states.
11. Keep all visuals performant with lazy 3D, adaptive LOD, placeholder skeletons and image budgets; no hardcoded concept-art KPIs.
12. Every release provides video/screen captures of tested screen journeys, test logs, parity matrix, known gaps, and rollback plan. No public deployment or main merge without founder approval.

## Pasteable final instruction to Claude
> Treat the four reference boards as art direction and this handoff as a product acceptance contract. First recover and inventory the real project, then implement the investor demonstration screen-by-screen with 90 **fictional, internally consistent** rooms (45 preserved + up to 45 new, deduplicated), reusable components, real navigation, persistent demo-scoped workflows, working Search Party, Pro registers, and Lite requester-to-proposal interaction. Prioritize the life cycle: discover → request → visualize → design → budget → commission → assure → service → optimize. Keep numbers computed from fixture data; every claim must show its epistemic state and provenance. Never copy hallucinated numbers, incidental tiny text, or fake performance claims from the image boards. Demonstrate responsive and accessible UX, reliable APIs where applicable, screen recordings, regression/security tests and no dead actions. Nothing moves to production or main without founder review.
