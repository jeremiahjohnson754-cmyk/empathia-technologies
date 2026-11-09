# EMPATHIA TECHNOLOGIES
## Enterprise Edition — Master Product Specification, Architecture Review and Implementation Handoff

**Version:** 1.2 | **Prepared:** 7 November 2026 | **Classification:** Founder/Engineering working specification | **Release status:** TARGET ARCHITECTURE; NOT a claim of deployed features, live customer integrations, third-party certification, or certified measurements.

**Revision 1.2 coverage:** Adds founder-directed vendor-neutral contextual platform-launch actions across Search Party, ServiceHands, Room and Device Registries; canonical external resource references; honest exact-target vs portal fallback; verified vendor link capabilities; server-authorized resolver, security and acceptance matrix. Full previous v1.1 enhancements and restored history remain in force.

**Revision 1.1 coverage:** Adds full historical 18-product and shared-engine register; Harmony action-ownership contract; October 31–November 7 decision chronology; older RoomOS/InstantRoom concepts; recoverable complete Claude prompts; and an atomic restoration/parity ledger. Earlier v1.0 sections remain in force; the newer six-phase and post-signoff corrections prevail.

**Primary mission.** Build a vendor-neutral, evidence-backed engineering operating environment for intelligent physical spaces. A user should understand what a room was meant to do, what is installed, what is connected, what was tested, what changed, what is supported, what remains unknown, who can act, what it costs, and what must happen next—without reconstructing the same facts across five disconnected tools.

**Decisive additions in this edition:** Instant Connect; native embedded and connected Power BI; governed SharePoint/Teams/Outlook links; six-phase universal commissioning; 1,122-test research catalog; optional post-acceptance Field Intelligence; legacy-room recovery; customer-controlled engineering vault; and live operational adoption of the same trustworthy workflows shown in the investor experience.

> **Evidence rule:** In this document, **SOURCE FACT** means supported by supplied files or cited public documentation; **DESIGN REQUIREMENT** means a founder requirement; **RECOMMENDATION** means proposed engineering direction; **TO VERIFY** means not independently demonstrated. No capability may progress to VERIFIED merely because a mockup or test catalog describes it.

---

# PART I — THE EXECUTIVE CONTRACT

## 1. Non-negotiable product experience

1. **Find anything.** One universal Search Party omnibox for rooms, equipment, people, drawings, warranties, projects, test results, configuration versions, Power BI reports, SharePoint files and relationships, subject to access scope.
2. **Understand immediately.** Any room opens a unified passport: purpose, designed/installed/current state, spatial context, topology, owner, last observation, accepted baseline, risks, related records and trustworthy next actions.
3. **Act in context.** Users move from an abnormal Power BI finding or failed commissioning test to an exact filtered Pro room, ServiceHands task, Assurance review, engineering document or Lite design without manually repeating IDs.
4. **Prove the outcome.** No silent PASS: every final result carries applicability, target, measured or observed value, source, device/instrument, timestamp, evidence, method, responsible engineer and independent verifier where required.
5. **Respect uncertainty.** DECLARED, MODELED, INFERRED, SIMULATED, OBSERVED, MEASURED, VERIFIED, ACCEPTED, STALE, UNKNOWN and UNAVAILABLE are explicit and semantically different states; a successful connector authentication is not a verified room.
6. **Capture work once.** A technician's observed serial number should flow to Pro, Commissioning and Search Party through one reviewed canonical record. Power BI consumes governed analytic projections rather than becoming a competing write database.
7. **Respect control.** Public investor mode is isolated, synthetic and resettable. Real enterprise mode is authenticated, tenant-scoped, persistently backed and server-authorized; role-switcher UI does not create privileges.
8. **Be usable under pressure.** The top task must be reachable with minimal context switching; phone-first field flows work with poor networks; every blocked action says why and provides a lawful alternative.
9. **Preserve customer independence.** Approved engineering configurations, customer-owned source deliverables, evidence, licenses/entitlements and secrets-vault references remain obtainable by authorized customer staff when providers change.
10. **Never surprise equipment.** No silent DSP overwrite, camera actuation, test tones, microphone capture, network scans beyond approved scope or reboot. Automation uses declared capabilities, consent and stop conditions.

**Core north-star journey:** Discover → Intake/Survey → Design/Scouter/Budget → Approve → Install → Commission → Document → Signoff/Report → Operate → Monitor → Service → Recommission → Assure → Improve/Learn/Retire.

## 2. Product taxonomy and ownership boundaries

A product surface is not necessarily a separate SKU. All products must be evaluated for commercial role, user value and shared architecture; do not create artificial separate databases just to sustain names.

| Product / plane | Primary user outcome | Owns authoritative business decisions | Depends on shared platform |
|---|---|---|---|
| Empathia Core / Ledger / Identity | One explainable infrastructure history | Identity, tenant, graph relationships, provenance/event contracts | Postgres, object storage, index, auth, audit |
| Mission Control | What matters now; next best safe action | User work queues and saved views | All products and policy |
| Search Party | Find any authorized object and relationship | Search/saved searches, not original source data | Graph, index, connectors, ACL |
| Empathia Pro | Authoritative room, device and lifecycle passports | Reconciled operational entity metadata and lifecycle | Source authority, telemetry, evidence |
| Empathia Lite / Build a Room | Understand and propose physical designs | Design drafts, versioned room intent and review | Spatial model, file import, graph |
| Intake / Project Delivery | Request-to-operations governed project | Funding/design/execution approvals and handoff | Pro, Lite, Commissioning, finance |
| Scouter / Standards | Evidence-backed engineering alternatives | Recommendation rationale, approved catalog choices | Manufacturer specs, standards, costs |
| Drawing Intelligence | Translate drawings into linked project context | Proposed drawing interpretations, reconciled versions | BIM/CAD integrations, Pro, Lite |
| Universal Commissioning | Prove actual installation and performance | Test plan, executed results, deficiencies, independent acceptance | Engineering graph, evidence, adapters |
| Assurance | Detect when acceptance evidence may no longer apply | Drift cases, impacted tests, revalidation plan, baseline lineage | Config snapshots, events, Commissioning |
| Field Intelligence | Authorized observations and optional safe validation | Diagnostic collection records and observation jobs | Local agent, consent, adapters, evidence |
| ServiceHands | Move incident/deficiency to resolved and reverified | Work orders, assignment, remote sessions, closeout | Search Party, Pro, Assurance, vault |
| APEX / Executive Control Towers | Explain root causes and estate exposure | Cases, KPIs, risk recommendations with traceability | Operational facts, BI projections |
| Engineering Vault / Legacy Recovery | Recover a room's maintainable technical record | Document inventory, evidence-based recovery, transfer eligibility | Storage, permissions, devices, SharePoint |
| Empathia Connect / Instant Connect | Add a trusted source safely | Connector instances, sync health, mapping rules | IdP, edge agent, token vault, outbox |
| Power BI Intelligence | Embedded interactive BI and governed analytics | Report catalog, semantic contract, analytic data products | Analytics mart, Microsoft auth/licensing |
| Empathia Learn / SIGNAL | Transfer technical skill through authentic cases | Content versions, competency evidence, simulated learning outcomes | Case links, role scopes, media assets |
| Procurement / Lifecycle / Green | Defensible lifecycle and sustainability decisions | PO/warranty/refresh models; licensed factors | ERP, assets, usage, price/EPD provenance |
| Founder Studio / Corporate Site / Investor Campus | Explain, demonstrate, and qualify demand | Public content and synthetic demonstrations only | Design system; never live customer data |

**Clarification:** The historical 18-product vision is a portfolio ambition, not evidence that 18 independently deployable production products exist. Mission Control, ledger, Instant Connect and other items may be shared platform capabilities. APEX is an investigation/intelligence layer; executive dashboards are a perspective, not a competing source of truth.

## 3. Provenance of the current baseline

| Artifact | Supported statement | Limitation and required decision |
|---|---|---|
| V2.5.3 live/offline HTML (~6.7 MB each) | Broad legacy role/product/room design vocabulary | Historical synthetic client artifacts; not verified production backend or full media library |
| SIGNAL standalone HTML | 12-season narrative and broad learning content | Historical authored content ≠ complete playable/voiced media |
| 2026-10-31 restoration release report | Historically 57 suites PASS, 0 FAIL and one media suite NOT_RUN on a specific frozen branch; API/DB/evidence work recorded | Does not prove the new 2026-11-07 scope or deployment; live Teams/Outlook external delivery NOT_RUN |
| Engineering readiness / defect register | Evidence-oriented release gates, target-size, device/voice/SSO blockers | Browser/assistive-tech/field certification still unproven |
| 2026-11-05 investor handoff | 14 proposed tour scenes; 36 views; eventual 90 fictional rooms | Explicit concept; original 45 rooms not presumed recoverable until source inspected |
| Expanded 2026-11-07 commissioning workbook | 380 candidate tests (214 network/ICT) in inherited expansion | Candidate library, not executed tests |
| 2026-11-07 universal engineering master | 1,122 candidate tests, 431 network domain, 59 families, 45 archetypes, 38 references; six phases | Reference count ≠ standards conformity; many procedures and thresholds need expert verification; no live tests |
| Git preservation archives and bundles | Recoverable source/migrations/previous branch artifacts are supplied | Latest repository HEAD, deployment IDs, tenant credentials and active integrations require independent confirmation |
| Deep Research master report | Synthesized product intent and broad gap list | Review critically: some vendor capability examples, phase naming and generic safety/threshold claims require correction |

**Restoration acceptance:** identify authoritative branch by hash, reproduce build/test, list migration head, inventory actual routes and features, and retain every verified legacy capability or document explicit deprecation. Do not merge or publish without founder approval.

---

# PART II — CANONICAL ENTERPRISE ARCHITECTURE

## 4. Architecture principles and technical topology

**Four planes, one lifecycle graph:** (1) Engineering: requirements, geometry, standards, topology, drawings, test definition; (2) Operations: telemetry, service, diagnostics, change, assurance; (3) Business: projects, resource allocation, procurement, contracts, lifecycle and sustainability; (4) Experience: web/mobile user tasks, query, analytics, education and investor demonstration. The **canonical lifecycle graph is a logical model**, not a mandate to introduce a separate graph database immediately.

```text
PUBLIC SITE      INVESTOR DEMO (SYNTHETIC)        ENTERPRISE WEB / FIELD PWA
       |                 |                                   |
       |        Isolated fixtures + reset                     |  Entra/OIDC + RBAC/ABAC
       |                 |                                   v
       |                 |                         API Gateway / BFF
       |                 |                                   |
       |                 |                      Authorization + audit
       |                 |                                   |
       |                 +--------------> SHARED DOMAIN CONTRACTS <---+
       |                                                     |
       |               CORE: identities • graph • workflow • provenance
       |                         event outbox • file references • policy
       |                           /          |              \
       |                        Postgres   Search index     Object vault
       |                           |          |              |
       |                   Event/CDC + semantic contracts   |
       |                           |                         |
       |                       ANALYTICS MART --------> Power BI service
       |                           |                 <---- embed/API meta
       |                           |
       |                  CONNECTOR ORCHESTRATOR / INSTANT CONNECT
       |                    /          |         |              \
       |                Microsoft   Vendor      Network/edge     ITSM/BIM/ERP
       |             Graph/SharePoint Q-SYS...  SNMPv3/API/LLDP    ServiceNow...
       |                                      
       +---- public lead endpoints only; never receives tenant secrets
```

**Persistence:** PostgreSQL is proposed as transactional source of record, with durable tenant scoped row security and application policy enforcement. Use temporal relationship tables and indexed adjacency queries to start; only add a dedicated graph engine after benchmarks show the need. High-cardinality telemetry belongs in a time-series/event store or suitably partitioned tables, NOT inside the relationship table. Large drawings, media and evidence live in permissioned encrypted object storage with hashes, classification, retention and signed URLs.

**Ingestion:** connectors publish versioned source observations into an idempotent ingestion layer. Normalization does not overwrite source-origin evidence. Reconciliation resolves identity collisions; accepted changes produce durable events. Analytics projections are downstream and rebuildable. Historical events and accepted baselines cannot be silently rewritten by a delayed sync.

**Architecture anti-goals:** no browser-only credential storage; no production write operations from investor fixtures; no giant monolithic frontend replacing the recoverable source; no synchronous API fan-out to dozens of vendors on each room view; no Power BI as the source for operational commands; no unconditional voice/video capture; no independently editable duplicates of room ownership or commissioning status.

## 5. Canonical entities, relationships and authority

**Hierarchy:** Tenant → Portfolio → Region → Campus/Site → Building → Floor → Space/Room → Zone/Logical position → Physical asset → Interface/Port → Cable/Signal/Network/Power relationships. Actual physical equipment is distinct from a logical position and replaceable installed unit.

**Minimum entity vocabulary:** tenant, organization, site, building, floor, room, room archetype, zone, rack, position, physical asset, model, firmware, interface, port, patch panel, switch, VLAN, IP, MAC, subnet, circuit, cable, signal path, multicast subscription, control relation, standard, requirement, test definition, test instance, test measurement, calibration certificate, evidence artifact, deficiency, project, request, design revision, drawing, approval, installation, baseline, change, drift case, incident, work order, person, team, competency, vendor, contract, license, warranty, purchase order, cost allocation, report, connector, source observation, Power BI report/semantic model, SharePoint item and audit event.

**Common identity contract:** `id`, `tenant_id`, `site_scope`, `object_type`, `human_key`, `source_records[]`, `created_at`, `updated_at`, `valid_from/to`, `observed_at`, `observed_by`, `revision`, `confidence`, `evidence_refs[]`, `classification`, `retention_policy`, `source_authority` and `status`. Never store a credential secret in this record.

**Field-level authority, by example:** design geometry may be authoritative in approved Revit/IFC model; active IP/port information may come from network controller or NetBox; commercial cost may come from ERP; active incident status may come from ServiceNow; accepted commissioning result and baseline approval are authoritative within Empathia; Power BI is a consumer of approved analytic projections. Conflicts create reviewable cases. An asset discovered with an unrecognized MAC may be a **candidate match**, not an automatically merged device.

**Temporal graph relationships:** `source_object_id`, `target_object_id`, `relationship_type`, `tenant_id`, `source_system`, `source_record_id`, `valid_from`, `valid_to`, `observed_at`, `confidence`, `evidence_id`, `approved_by`, `revision`. Graph paths and counts must obey scope and not leak existence of restricted nodes.

## 6. Workflow and event contract

Every workflow transition checks: current state + intended transition + actor authority + scope + prerequisite evidence + idempotency key + version. A transactional outbox emits events **after** successful commit and makes replay/delivery auditable. Preserve historical tested ordering behavior when extending the original repository.

**Event envelope proposal:**

```json
{
  "event_id": "uuid",
  "schema_version": "1.0",
  "tenant_id": "tenant-id",
  "aggregate_type": "room",
  "aggregate_id": "room-id",
  "aggregate_revision": 27,
  "event_type": "CommissioningBaselineAccepted",
  "occurred_at": "2026-11-07T14:30:00Z",
  "actor_ref": "authorized-user-id",
  "correlation_id": "correlation-id",
  "idempotency_key": "request-specific-key",
  "classification": "CONFIDENTIAL",
  "source_provenance": "empathia:commissioning",
  "payload": {"baseline_id":"baseline-id","report_artifact_id":"artifact-id"}
}
```

Never use event payloads as an unchecked source of role grants or trust. Schema validation, dead-letter handling, tenant-safe ordering, retry/poison policy, trace links, replay restrictions and downstream exactly-once-effect idempotency are required.

## 7. Security, privacy and reliable enterprise operations

- OIDC Authorization Code + PKCE for browser/field users; SAML federation where required; SCIM provisioning as a separately verified integration. Service identities separate from humans. Authenticate every API call and recheck permissions server-side.
- Tenant partitioning and site/room scoping in data, cache, search, graph, BI/exports, file downloads, notifications and edge agent. Negative tests must cover every boundary, including aggregate counts and semantic model data.
- Least-privilege, just-in-time roles and expiring vendor support sessions; multi-person approval for sensitive network/DSP changes and high-impact commands. Separate evidence collector, verifier, approver and person issuing a field command.
- Secrets held only in dedicated vaults with policy and rotation. Expose **references and approved reveal workflows**, never raw passwords in Power BI, reports, SharePoint indexing, audit logs, email or AI prompts.
- Signed artifact links, access classification, retention/deletion, recovery of revoked SharePoint permissions, legal holds and audit exports. Vendor IP/ownership rules control access to customer-deliverable source, binary, license or backup.
- Edge collector uses tenant-bound registration, certificate identity, outbound authenticated transport, enrollment expiry, scoped network targets, explicit capabilities, rate limits, scheduled windows and stop/emergency-disable. Read-only default; active acoustic and camera operations require separately authorized local operator and safety checks.
- SLOs and real performance targets must be established with pilots. Proposed starting **internal objectives**, not achieved metrics: exact-ID search p95 < 500 ms on indexed estate, common room page p95 < 2 seconds on target network, successful sync visibility within published source-specific freshness SLA. Measure before committing contractual guarantees.
- Backups and restore drills cover Postgres, object evidence, integration config (minus secrets), keys, search rebuild, analytic model lineage and tenant export/delete. Verify disaster recovery under actual tenancy and scope policies.

# PART III — INSTANT CONNECT: THE ENTERPRISE ONBOARDING OPERATING SYSTEM

## 8. Product definition and user promise

**Product requirement:** An authorized customer administrator can choose a supported integration, complete a secure authentication and permission flow, inspect the precise data/actions available, preview how records would map into Empathia, resolve conflicts, approve scopes and start a monitored sync. A regular engineer subsequently sees linked room information in Search Party, Pro, Lite, Commissioning, Assurance and ServiceHands without re-entering it.

**Not the promise:** bypassing credentials; reaching any arbitrary VLAN from the public cloud; extracting inaccessible vendor source code; returning passwords from nonreversible hashes; guaranteed universal device coverage; instant telemetry freshness; one permission grant across separate Microsoft API resources; or unapproved remote control. “Instant” describes the **quality of workflow**, not automatic entitlement or guaranteed connection success.

### 8.1 Eight-step connection journey (target UX)

| Step | What the administrator sees | System action and gate |
|---|---|---|
| 1. Choose source | Searchable catalog: Microsoft 365, Power BI, SharePoint, Teams, Q-SYS, Biamp, Crestron, Cisco/Aruba, NetBox, ServiceNow, Autodesk, etc. | Show implementation and capability tier: VERIFIED ADAPTER / RESTRICTED / IMPORT-ONLY / PLANNED; show supported data center/region. |
| 2. Verify organization | Correct tenant/org and trusted publisher, allowed network endpoints | Establish tenant-bound consent and redirect validation; no unverified trust on a user-entered host. |
| 3. Authenticate and consent | Delegated or application permission summary; requested scopes; admin approval prompt | OIDC/OAuth flow where available, mTLS or API keys only when vendor-supported; secrets go to vault. |
| 4. Verify capability | What this adapter can read, receive, export or command; test connection | Capture `CapabilityManifest` with vendor, model, firmware, feature flags, policy and proof. Distinguish connected from source data accessible. |
| 5. Define scope | Select sites/workspaces/device ranges/SharePoint libraries/Power BI workspaces | Least-privilege scope enforcement, approved polling windows, read-only default. |
| 6. Preview matching | Proposed room/asset/person/file matches, ambiguous records, duplicates and changes | Dry-run reconciliation with source history and confidence; require user resolution on ambiguous merge. |
| 7. Activate | Confirm authority mapping and read/write behavior; start initial sync | Publish idempotent job with progress, event audit, retry budgets and cancellation. No writeback by default. |
| 8. Monitor and manage | Last successful sync, freshness, rate limit, source health, errors, connected objects, owners and next renewal | Expose disconnect/revoke, permission-change effect, scheduled resync and data-retention choices. |

**Initial capability tiers:** (A) Metadata link only; (B) Read-only discovery/telemetry; (C) Snapshots/configuration exports; (D) approved commands; (E) separately consented physical actuation/measurement. A connector must never inherit Tier D/E solely because it is authenticated to Tier B.

### 8.2 State machine and failure behavior

```text
NOT_CONFIGURED -> AUTH_PENDING -> AUTHORIZED -> SCOPE_PENDING
    -> DISCOVERING -> RECONCILING -> AWAITING_APPROVAL
    -> INITIAL_SYNC -> HEALTHY
                        |--> DEGRADED (partial scopes, stale refresh, rate limits)
                        |--> REAUTH_REQUIRED (revoked/expired credential)
                        |--> QUARANTINED (permission or mapping anomaly)
                        |--> DISCONNECTED (admin revoke/intentional removal)
```

**Every state needs user-facing next action:** consent denied → name missing privilege, do not store a false connected state; source throttled → preserve cursor and follow Retry-After; mismatched tenant → block sync and revoke temporary resources; unavailable vendor API → offer approved manual import; firmware missing capability → label unknown and link vendor-specific workaround; site mapping ambiguous → quarantine suggested merges rather than generating duplicate assets; permission revoked → purge/disable cached sensitive search snippets and block URLs/exports; schema drift → stop only affected fields and raise connector-health incident.

### 8.3 Connector contract (proposed schema)

```json
{
  "connector_id": "uuid",
  "tenant_id": "uuid",
  "provider": "microsoft_powerbi",
  "provider_tenant_id": "approved-tenant",
  "auth_mode": "delegated_or_app_only",
  "credential_ref": "vault://tenant/connector-id",
  "scope": {"workspaces":["approved-workspace-id"]},
  "lifecycle_state": "HEALTHY",
  "capabilities": ["DISCOVER_REPORTS","READ_METADATA","EMBED_ORG"],
  "source_authority": {"report_metadata":"powerbi"},
  "last_successful_sync_at": null,
  "last_attempted_sync_at": null,
  "sync_cursor_ref": null,
  "mapping_version": "v1",
  "consent_actor_ref": "authorized-admin",
  "consent_evidence_ref": "evidence-id",
  "rate_limit_policy": "provider-aware",
  "read_only": true
}
```

**Required connector SDK interfaces:** `authorize()`, `discoverCapabilities()`, `listResources(scope,cursor)`, `getChanges(cursor)`, `snapshot(resource)`, `mapToCanonical(sourceRecord)`, `checkPermission(user,resource,action)`, `healthCheck()`, `disconnect()`, optional `proposeCommand()` and independently approved `executeCommand()`. Version interfaces; never pretend every provider implements all methods.

**Source record contract:** stable provider IDs + tenant IDs, observed timestamp, freshness, permission scope, raw metadata hash, normalized mapping version, source URI, authority field map, provenance, and synchronization checkpoint. No silent destruction of source provenance on rename/merge.

## 9. Instant Connect integration matrix and sequencing

| Priority | Adapter family | Minimum valuable read-only capability | Write/command status |
|---|---|---|---|
| P0 | Microsoft Entra ID | Tenant identity, eligible user/team references and scope mapping | Directory writeback deferred; conditional permission and privacy review |
| P0 | Power BI | Customer-authorized workspaces, reports, semantic model metadata, embed permission diagnostics and refresh state | Refresh/report provisioning must be separately authorized; no BI→device writeback |
| P0 | SharePoint/OneDrive | Selected sites/drives/libraries, docs/metadata/deep links, changes and deletion markers | Approved upload/versioning later; respect site grants and ACL |
| P0 | Teams/Outlook | Approved person/room collaboration deep links and notification routing | Actual Graph send actions require independently reviewed scopes, consent and delivery tests |
| P0 | Generic network edge | Approved SNMPv3, LLDP, switch/router interface facts, HTTPS/REST + passive discovery where feasible | No default network writes, active scans or reboots |
| P0 | Pro/manual importer | CSV/XLSX/QR and approved engineering files; identity resolution | User-confirmed imports, never hidden auto-accept |
| P1 | Q-SYS / Biamp / Crestron / Shure | Verified model/firmware-specific status and configuration capability | Adapter-specific permissions and policy; vendor licenses/tooling may be required |
| P1 | Microsoft Teams Rooms / Zoom / Cisco | Supported room/device metadata, status, service events | Avoid inventing API coverage or remote command endpoints |
| P1 | NetBox / ServiceNow / Jira | Inventory/topology links, tickets and work-order links | Bidirectional only after authoritative-field decision |
| P1 | Autodesk APS / IFC / CAD | Versioned designs, spatial metadata, file links | Controlled change-back only after model governance |
| P2 | ERP/procurement/BMS/signage/OT | Warranty, costs, orders, environment, energy or signage metadata as permitted | Regulated/OT integration needs security/operational review |

**Provider workbooks are required:** supported API endpoint with official source link, auth mode, scopes, supported firmware, rate limits, polling/callback design, source field dictionary, `UNAVAILABLE` cases, safe-state behavior, unit/integration/contract test harness, customer license requirements and connector maintenance owner.

### 9.1 Enterprise connector operational service

- Offer per-tenant source inventory, consent audit, live capability badges, data scopes, retry queue, dead letters, connector SLO, token renewal alerts, permission drift alerts and root-cause diagnostics.
- Separate **source reachability** (network reachable), **authentication health**, **authorization scope**, **data freshness**, **normalization health**, **identity reconciliation**, **action capability** and **field evidence quality**.
- Export connector audit events and deep links into APEX and ServiceHands; don't mask partial failure with a green connected badge.
- Build a local edge registration experience with signed installer, per-site authorization and a network topology preview that is never automatically broadcast outside approved targets.
- Support versioned package upgrades, offline spool (encrypted), crash-safe cursor checkpoints, event deduplication, deleted source records, transient 429/5xx, malformed payload quarantine and reversible reprocessing.

---

# PART IV — LIVE POWER BI INTELLIGENCE AS A FIRST-CLASS EMPATHIA PRODUCT

## 10. Design: two complementary analytic experiences

**Lane A — Native operational intelligence:** low-latency room health, technician queues, live connector status, commissioning actions, active incidents and high-priority alarms are rendered from Empathia's authorized operational APIs and telemetry projections. This is suitable for actions requiring immediate truth and governed writes.

**Lane B — Governed Power BI Intelligence:** immersive embedded Power BI reports and customer-owned workspaces add sophisticated measures, dimensional drilldown, historical portfolio analysis, finance/resource intelligence, vendor performance, trends, comparison, and interactive reporting. Power BI receives governed data products and is not the operational transaction engine or source of commissioning PASS.

**“Live Power BI” means an authorized, embedded, interactive Microsoft-hosted reporting session consuming the customer's real permitted data with clearly disclosed refresh mode and freshness.** It does **not** universally imply sub-second live sensor data or unlimited API updates. Microsoft differentiates Import refresh from DirectQuery automatic page refresh; service/capacity limits apply, and legacy real-time streaming features have a deprecation notice. [M1][M5][M6][M7]

## 11. Two distinct Power BI embedding patterns

| Decision | Embed for your organization (user owns data) | Embed for your customers (app owns data) |
|---|---|---|
| Audience | Customer's authenticated Microsoft Entra users with Power BI permission | Multi-customer Empathia SaaS users without direct Power BI account requirement |
| Authentication | User obtains Entra access token; Microsoft governs content permissions | Empathia backend uses approved service principal/master identity and generates scoped embed tokens |
| Tenant deployment | Customer-owned workspaces and semantic models | Per-customer workspaces/models or rigorously reviewed RLS/OLS isolation |
| Licensing | Consumer permissions and relevant Power BI license/capacity policy | Production embedding capacity required; SKU and Fabric/Azure offering to be validated per customer |
| Authorization | User Power BI rights PLUS Empathia nav policy | Empathia entitlements PLUS server-issued embed tokens, effective identities and Microsoft model isolation |
| Recommended starting point | **P0: preferred for a corporate pilot with an existing Power BI investment** | **P1/P2: SaaS multi-tenant commercial offering once capacity/tenant architecture and isolation tests exist** |

Do **not** expose customer BI reports by using Publish to web or embedding unrestricted report URLs. Do not pass arbitrary client-provided workspace/report IDs to token generation. Enforce allow-listed tenant/workspace/report triples. Use Microsoft Power BI SDK with token expiry/renewal handling and fault states. [M1][M2][M3][M4]

### 11.1 Service principal and customer isolation requirements

For app-owns-data, create an Entra application/service principal under appropriate Microsoft consent/admin settings, ensure access to the intended Power BI workspaces and provision production capacity. Evaluate per-customer workspace + semantic model isolation, service principal profiles at large scale and RLS/OLS for within-customer visibility. **RLS must be tested using real generated embed tokens and effective identities**, not assumed from a regular Power BI “test as role” view. Permissions to Power BI workspaces or semantic models are not equivalent to Empathia's room/site ACL. [M2][M3][M4][M8]

**Commercial controls:** cost estimation per tenant/capacity, capacity exhaustion and queuing, cost attribution, report governance, export restrictions, tenant teardown, deletion/export of customer data and customer-owned BYO report options. Confirm licensing at implementation time; never hard-code a universal per-viewer entitlement rule.

## 12. Power BI integration components

1. **BI Connector (Instant Connect):** authorize tenant, select workspace(s), enumerate actual accessible reports and semantic models via supported REST APIs, capture report IDs/URLs and metadata, test embed permissions/licensing, save chosen report mappings.
2. **BI Report Catalog:** a governed report directory with owner, workspace, subject, dimension/filter contract, audience scope, refresh mode, last-successful refresh, latest data observation, sensitivity, allowed export, opening action and product surfaces.
3. **BI Embedded Viewer:** responsive reader with native frame, report/page selection, accessible controls, loading/error/no-license/expired-token/permission-revoked states, page/bookmark navigation where supported, keyboard handling, low-bandwidth fallback and “Open in Power BI” where permitted.
4. **BI Filter Bridge:** map Empathia `tenant_id` and `room_id`/`site_id` to approved semantic-model columns, use Power BI JS filter APIs to open a specific room/campus/deficiency; independently verify that model security prevents broader access. [M9]
5. **Analytics Data Product service:** governed star-schema facts and dimensions, per-tenant or per-approved-audience data exchange, mart refresh lineage, meaningful metric passports and quality checks; logs record schema versions and export jobs.
6. **Refresh Orchestrator:** source events → transform → materialized reporting mart → Power BI refresh or DirectQuery/Direct Lake scenario as supported, subject to source and capacity constraints. Record queued/running/succeeded/failed timestamps and reconcile unexpected lag. Trigger refreshes only when supported and authorized; don't assume a REST `POST` refresh makes charts instantly current. [M5][M7]
7. **Report → Action bridge:** link evidence rows from filtered visuals to authorized deep links in Pro, Search Party, Assurance and ServiceHands. A report click is a contextual navigation event, **never an automatic command or approval**.
8. **Tenant BI diagnostics:** token scope/expiry, model RLS, workspace permissions, licensing, dataset/report health, gateway status, refresh errors, report load performance, telemetry consistency and cost.

### 12.1 Data warehouse / semantic model design

**Recommended dimension models:** `DimTenant` (internal only), `DimSite`, `DimBuilding`, `DimRoom`, `DimRoomArchetype`, `DimAsset`, `DimDeviceModel`, `DimVendor`, `DimEngineer`, `DimTestDefinition`, `DimSeverity`, `DimTime`, `DimSourceState`. **Fact models:** `FactCommissioningRun`, `FactTestResult`, `FactDeficiencyLifecycle`, `FactAssuranceDebt`, `FactDriftEvent`, `FactServiceWorkOrder`, `FactAssetObservation`, `FactProjectMilestone`, `FactCost`, `FactEnergyObservation`, `FactConnectorSync`, `FactWarranty`. Publish role-appropriate subsets only.

**Metric passports** are mandatory. Examples:
- *Rooms currently accepted* = distinct room IDs with latest approved, nonsuperseded baseline satisfying approved acceptance policy; define treatment of waived exceptions.
- *Outstanding commissioning debt* = count or severity-weighted quantity of impacted applicable tests with no current verified result; report denominator, time and confidence; debt ≠ generic open ticket count.
- *Defect MTTR* = elapsed duration from explicitly defined incident start to verified resolution, excluding/including paused SLA states according to customer policy; publish coverage of missing timestamps.
- *Connector data freshness* = event-time age and ingestion-time age separately; no “live” label without declared freshness SLA.
- *Estate risk* = decomposable weighted factors with source/uncertainty and a model version; no black-box green score.
- *Economic benefit* = measured data where available and labeled assumptions/scenarios otherwise; never claim validated ROI without pre/post method.

**Mandatory quality dimensions:** lineage, event time, ingestion time, snapshot time, semantic model refresh time, source authority, completeness %, eligible denominator, access scope, known duplication, unit normalization, pending reconciliation, and unknown/unverified fraction. Keep historical snapshots for reproducibility; no “last known value” silently presented as live.

### 12.2 Freshness and update patterns (selection matrix)

| Pattern | Use case | Expected semantics | Constraints |
|---|---|---|---|
| Native API + event bus | Actively failing room / current device status / dispatch | Operational, near-source update subject to connector lag | Required when immediate action is needed |
| Power BI Import / scheduled or API refresh | Commissioning quality, project budgets, historical defects | Snapshot as of latest successful semantic model refresh | Refresh is asynchronous; shared capacity daily limits and service restrictions apply |
| Power BI DirectQuery with permitted automatic page refresh | Selected near-live operational reporting | Queries at allowed intervals; report must be actively viewed | Source/capacity settings and throttling bound cadence; not an event-stream guarantee |
| Fabric/Direct Lake where licensed/applicable | Larger governed analytics | Query model from compatible Fabric storage | Confirm actual customer licensing and model security; do not require in MVP |
| Exported Power BI templates | Customers already have BI platform | Customer operates/owns semantic models and schedules | Empathia data access and field-level entitlements still apply |

**Explicitly reject as default:** building new production architecture around legacy Power BI push/streaming models without reviewing the announced deprecation and limitations. [M6]

### 12.3 Power BI UI placement: one report, many contexts

| Empathia surface | Native core view | Connected Power BI enhancement |
|---|---|---|
| Mission Control | Now/next work, active alerts, actions | User-configurable KPI gallery with trustworthy refresh badges |
| Pro | Room/device registers and live passports | Asset age, warranty concentration, technology standards coverage, lifecycle budget |
| Commissioning | Active test execution and immutable acceptance | First-pass yield, defects by test family/engineer/site, duration and evidence coverage |
| Assurance | Change-to-test impact, active debt, version history | Estate-wide drift, revalidation aging and long-term confidence trends |
| ServiceHands | Work orders, on-site/remote execution, support sessions | MTTR, recurrence, dispatch performance, parts and provider quality |
| APEX / Executive | Root cause/evidence, incident narratives and priorities | Finance, capital planning, costs, quality, SLA and trend analysis |
| Lite / Scouter | Spatial editor and design tradeoffs | Prior design outcome benchmarks, utilization/portfolio planning (approved data only) |
| Search Party | Exact authorized record search | Find authorized reports, show filtered report entry with evidence links |
| Field Intelligence | Live diagnostic job and device observations | Historical network/signal/health trend summaries with provenance |

### 12.4 Power BI REST/API candidates (official examples)

```text
GET   /v1/bi/connectors                  # Empathia service endpoint
POST  /v1/bi/connectors                  # initiate allowed consent flow
GET   /v1/bi/reports?surface=assurance   # authorized Empathia catalog
POST  /v1/bi/embeds/organization         # user-token mediated session
POST  /v1/bi/embeds/customer             # server-only app-owns-data token, if enabled
GET   /v1/bi/reports/{reportId}/context?room_id=... # validated filter mapping
POST  /v1/bi/semantic-models/{id}/refresh-requests # approval-guarded and rate-limited
GET   /v1/bi/refresh-requests/{id}       # async state and freshness
GET   /v1/bi/health                     # source/license/capacity diagnostics

# Vendor Power BI REST examples (actual service; verify current method/permission):
GET  https://api.powerbi.com/v1.0/myorg/groups/{groupId}/reports
POST https://api.powerbi.com/v1.0/myorg/groups/{groupId}/datasets/{datasetId}/refreshes
```

All Empathia endpoints above are **proposed contracts**, not claims that existing APIs already exist. The Power BI REST endpoints are documented Microsoft APIs. [M7][M10]

**Proposed BI report binding record:** `tenant_id, surface, workspace_id, report_id, semantic_model_id, embed_mode, required_entitlement, allowed_roles, allowed_site_ids, filter_contract_version, dimensions, drill_link_template_id, last_successful_refresh, source_data_watermark, model_authority, report_owner, connected_state, classification, revocation_timestamp`.

### 12.5 Live Power BI end-to-end acceptance scenarios

- **BI-01** Organization-owned: allowed Entra user connects only an approved workspace, views report, changes report page/filters, and opens a room deep link; direct report URL beyond permitted scope is refused.
- **BI-02** App-owns-data: two customer tenants with same human-facing room label cannot see each other's model rows or report metadata; test actual embed tokens and effective identity RLS/OLS.
- **BI-03** Cross-site executive only sees approved sites in Power BI despite a manipulated `room_id` filter or report URL.
- **BI-04** Backend API returns no Microsoft secrets in browser, analytics rows or telemetry; token expiry refresh and revoked report grant are handled visibly.
- **BI-05** Model refresh fails, queue is delayed, or gateway unavailable: BI shows “last successful refresh” and a safe native operational fallback; no stale “live” badge.
- **BI-06** Report configured with Import but a user requests near-real-time: product explains it cannot meet the live freshness target, recommends permitted DirectQuery or native operational panel.
- **BI-07** Semantic column rename breaks approved filter contract: report remains viewable if authorized but deep linking is disabled and explicit mapping-repair issue raised.
- **BI-08** Large mobile report works or offers explicit accessible external view; avoid nested scroll traps and unusable micro-charts.
- **BI-09** Report export honors both Microsoft permission and Empathia data policy; no unauthorized raw rows in client network traces.
- **BI-10** Revenue-sensitive capacity use and refresh frequency are instrumented; test capacity/service throttle and entitlement changes.

---

# PART V — MICROSOFT 365, SHAREPOINT, TEAMS AND EVIDENCE ACCESS

## 13. SharePoint Knowledge Fabric and document authority

Customer authorization must be specific. Microsoft Graph Selected permissions can restrict an app to particular sites/lists/items/folders/files; **consent and a separate resource-specific grant are both required**. Broad Graph site search does NOT support `Sites.Selected` in the documented site-search endpoint, so do not promise tenant-wide search under a narrow selected-site token. Plan two modes: (a) customer-selected site/list enumeration with scoped access; (b) broader delegated search when explicitly permitted, separately reviewed. [M11][M12]

**SharePoint ingestion:** authorize explicit library/site scope; map `siteId, driveId, itemId, webUrl, etag, version, lastModifiedDateTime, owner, approved_room_id, classification, source_acl_ref`; initial crawl; delta/notifications where supported; tombstone and ACL changes; reversible index update. Microsoft `driveItem: delta` returns `@odata.nextLink`/`@odata.deltaLink` and deletion markers. Respect `429 Retry-After`; do not continuously poll blindly. [M13][M14]

**Search Party display:** secure title/snippet only if entitled, authoritative SharePoint deep link, version/update time, source and missing/expired permission state. Indexing full document content requires explicit data-governance approval and revocation/removal tests. Never assume storing a cached document is equivalent to ongoing SharePoint ACL compliance.

**Documentation Tracker Phase 5:** linked as-builts, rack/network/signal files, DSP/control source archives, pre/post photos, service operations SOP, training/manuals, certifications where applicable and signoffs. A customer can choose store-in-Empathia Vault or reference-in-SharePoint with durable permission/evidence policy; final report lists both accessible documents and unfulfilled mandatory items.

**Teams/Outlook:** permission-aware open-chat/call/calendar/email deep links can launch the installed client without requiring a write connector in MVP. Posting messages, creating meetings, sending email, automating inbox final report delivery and ChatOps require separate Graph scopes, explicit consent, sent-state audit, recipient validation, retry and real end-to-end tests. Report delivery should include a safe link/receipt, not secrets or unsecured attachments.

## 14. Microsoft identity/permission matrix (policy design)

| Operation | Read/admin requirement | Fail-safe |
|---|---|---|
| User signs into Empathia | Entra/OIDC user consent and enterprise app assignment | Deny app access without accepted tenant and mapped role |
| Admin discovers selected SharePoint library | Scoped Graph permission + explicit item/site grant | Show selectable authorized scope; no broad-search fallback without approval |
| User opens stored SharePoint document | Both Empathia ACL and effective SharePoint permission | Redirect to Microsoft auth; revoke Empathia preview/cache on access loss |
| User embeds own organization report | Power BI user entitlement and licensed capacity as applicable | Explain missing access/license; no anonymous public embed |
| External SaaS user embeds managed report | Approved service principal + scoped embed token + capacity and RLS | Deny if model authorization test or profile isolation fails |
| Expert is contacted through Teams | Permitted contact identity and deep link; privacy controls | Hide details outside permitted relation; no fabricated availability |
| Report emailed after signoff | Customer tenant-approved mail transport, verified recipients and logging | Queue retry + accessible report in Empathia; no silent delivery claim |

---

# PART VI — UNIVERSAL COMMISSIONING, ASSURANCE AND ENGINEERING HANDOFF

## 15. Universal Commissioning: exact six-phase control model

The six-phase workflow is a **founder-approved design requirement**, and its order is fixed. Retain existing Phase 4 functional commissioning behavior from legacy source; move Documentation Tracker to Phase 5 and Signoff to Phase 6. Preserve the former operational handoff requirements within Phase 5/6. The optional post-signoff Field Intelligence sweep is **NOT a seventh phase** and cannot hold up final report issuance.

| Phase | Gate and owner | Required proof and failure handling |
|---|---|---|
| **1. Requirements and readiness** | Operations Lead + Systems Engineer | Project/room type, design revision, requirements, standards applicability, equipment topology, risk matrix, evidence plan, test acceptance targets, safety jurisdiction and role assignment approved. No premature blanket pass. |
| **2. Physical installation verification** | Installer + qualified inspector | As-built equipment, position/identity, rack/mounting/cable/power installation, safety/clearances, network plans, substitutions, labeling, photos and inspection findings. Changes trigger design approval where necessary. |
| **3. Network and platform validation** | Network/UC engineer(s) | Applicable physical-layer certifier reports, VLAN/access/trunk, routing/DNS/DHCP, QoS/multicast/PTP, voice/UC, NAC/certs, edge/network performance, source/target evidence, physical network acceptance. Never claim all ICT tests needed for every room. |
| **4. Functional system commissioning** | AV/audio/video/control/broadcast discipline engineers | Full system use cases, DSP/acoustic intelligibility and response, microphone/speaker/video/camera/control/UI/signage/lighting/streaming workflows and integration-specific testing. Retain original detailed Phase 4 and its task history; no renumbering to remove functionality. |
| **5. Documentation Tracker and operational handoff** | QA/document owners + AV Operations | Mandatory project-specific deliverables complete or permitted exception: drawings, photos, network/VLAN/IP/rack maps, device inventory, DSP/control source and binaries, presets/backups, SOP, warranty/licensing, manuals, training, service ownership, deficiency closure and handoff acknowledgments. Secrets referenced only. |
| **6. Independent signoff, acceptance and baseline** | Independent acceptor + authorized AV Operations Lead | Validate current applicable tests and mandatory Phase 5 docs; approve only eligible exceptions, confirm SoD and service readiness, sign, version immutable baseline and generate/distribute official commissioning report **immediately following successful signoff**. Failed delivery retries without altering signoff. |

**Specialist control:** relevant electrical, structural, fire/life-safety, emergency voice, accessibility, network security and statutory examinations require applicable local authorities/qualified professionals; an AV Operations Lead cannot waive statutory requirements. A test must not become `NOT_APPLICABLE` merely to improve completion percentage.

### 15.1 Exact status model and acceptance formula

Define `NOT_ASSESSED`, `APPLICABILITY_PENDING`, `APPLICABLE`, `NOT_APPLICABLE_WITH_REASON`, `BLOCKED`, `READY`, `IN_PROGRESS`, `RESULT_PENDING_REVIEW`, `PASS_VERIFIED`, `FAIL_VERIFIED`, `INCONCLUSIVE`, `WAIVED_APPROVED` (only where allowed), `SUPERSEDED`, `RETEST_REQUIRED`. A test definition alone is `CANDIDATE`; it has no execution status.

**Acceptance candidate =** all applicable required current tests have approved `PASS_VERIFIED` evidence or an eligible approved exception, no unresolved non-waivable failure, Phase 5 mandatory documents complete, required separation-of-duties respected and authorized scope/targets valid. `NOT_RUN`, `INCONCLUSIVE`, stale/superseded evidence, a simulated scenario and a missing calibration do **not** equal passing acceptance.

**Deficiency capture:** identify asset/room/test, severity/priority, owner, symptoms, time, measured value, expectation, evidence, root-cause hypothesis, approved remote assistance, resolution action, retest and verification result. Status and history remain linked to ServiceHands and Assurance.

**Post-signoff sequence:** Phase 6 signoff → immediately generate signed official report → notify authorized recipients → (optional) AV Operations Lead consents to safe Field Intelligence follow-up → separate diagnostic supplemental report delivered → new observed deficiencies/recommissioning debt created as needed; never silently overwrite old accepted baseline.

## 16. 1,122-test research catalog: how it becomes a credible engineering product

**Existing research output (SOURCE FACT):** the 2026-11-07 master catalog has 1,122 **candidate** definitions, including 431 network-domain, 117 audio and 93 video, grouped into 59 test families with 45 archetype cues. It retains 380 earlier definitions and adds 742 distinct candidates at the authored-definition level. Its 38 source references have not been individually certified here for precise clause/edition applicability. Zero physical live test executions were proven by this workbook.

**Issue to fix:** a bigger number does not guarantee more reliable commissioning. Every published test needs a technical reviewer, exact applicability, observable, procedure, applicable normative/guidance references, approved threshold or project-specific criterion, units, instrument class, calibration policy, tool capability, risk and safety, evidence schema, automation tier, release/version, and a representative example/negative test.

### 16.1 Required test-definition schema

```json
{
  "test_definition_id": "UC-XXXX",
  "version": "1.0.0",
  "title": "PTP synchronization and failover verification",
  "discipline": "NETWORK",
  "family": "Timing and media transport",
  "phase": 3,
  "scope": ["applicable_AoIP", "approved_PTP_design"],
  "applicability_expression": "siteHasApprovedPTP && profileRequiresSync",
  "prohibited_when": ["live_safety_conflict", "unapproved_active_test"],
  "prerequisites": ["authorized_access", "approved_topology", "expected_clock_policy"],
  "measurement": {"name":"clock_state","unit":"profile-specific","method":"vendor-approved logs or calibrated trace"},
  "acceptance_criterion": {"reference":"approved site design and governing standard","threshold":null,"requires_engineer_target":true},
  "evidence_required": ["dated_source_record", "instrument_or_adapter_version", "config_hash", "independent_reviewer"],
  "automation_level": "READ_ONLY_OR_SUPERVISED",
  "qualified_roles": ["NETWORK_ENGINEER"],
  "retest_triggers": ["PTP_GM_CHANGE", "SWITCH_FIRMWARE_CHANGE", "TOPOLOGY_CHANGE"],
  "standards_refs": ["verified edition and clause to be supplied"],
  "publish_status": "CANDIDATE_REQUIRES_VALIDATION"
}
```

All JSON above is a **design example**, not an implemented real catalog item. Criteria depend on deployed profile. Do not hardcode a single universal STIPA threshold, DSCP marking, allowable RT60, link bandwidth or network jitter target across all systems. IEC 60268-16 describes STI measurement methodology; acceptance criteria depend on the system purpose, governing specification and jurisdiction. Similarly, multicast/PTP/802.1X requirements are topology-, endpoint- and policy-specific.

### 16.2 Technical domain scope (not a blanket pass list)

**Network/ICT:** structured copper/fiber certification, optics, PoE classification/budget, Layer 2 VLAN trunks/access/LLDP/STP/LACP, routing/VRF/IPv6/ACL, DHCP/DNS/NTP/PTP, IGMP/MLD/PIM multicast, QoS/DSCP and queueing, MTU/fragmentation and latency/jitter/loss, Wi-Fi/RF coverage and roaming, 802.1X/RADIUS/NAC, secure management/SNMPv3/syslog/NetFlow, switch/controller HA/UPS, protocol compatibility, incident logs, BGP/OSPF only where present and authorized, segmented OT and brownfield network topology.

**Audio/DSP:** noise and reverberation, STI/STIPA where applicable, microphone polar/beam coverage, speaker coverage/intelligibility, gain/EQ/dynamics, AEC, automixing, delay/phase, amplifier protections, Dante/AES67 clock/subscriptions, processing reliability, acoustic measurement instrument provenance, live sound/show control and zoned emergency interface boundaries.

**Video/UC:** display/image scaling/contrast/viewability, HDMI/SDI/HDCP/EDID, camera FOV/PTZ/framing, multi-camera tracking, codecs, Teams/Zoom/Webex session behaviors as supported, SIP/SBC/VoIP media/signaling, USB peripherals, RF wireless, capture and streaming, AV-over-IP encoding/decoding, meeting room failover, signage playback and accessible captions.

**Broadcast/production:** SMPTE ST 2110/SDI/IP essence flows where present, PTP timing, genlock, tally/intercom/IFB, production switcher, recording/streaming codecs, redundancy, timing alignment, hybrid event cues, stage lighting/network and chain-of-custody for relevant media.

**Physical/power/lighting/safety:** rack and thermals, grounding/bonding where competent, electrical inspection by licensed specialists, UPS/battery/PDU/PoE, cable pathway and labeling, rigging/structure, accessibility and assistive listening, lighting control, emergency voice integrations, egress/fire-system interface, and documented specialist signoff.

**Service/operational:** configuration backups, restore demonstration where safe, remote monitoring/alert routing, ownership, knowledge transfer, asset discovery, vendor entitlement, support SLA, outage procedure, documentation/exports, time-zone regional monitoring, replacement impact, and recommissioning triggers.

### 16.3 Catalog remediation work program

1. Normalize name, units and method vocabulary; compare semantic duplicates, near-duplicates and overlapping prerequisites with domain SME review; do not delete distinct failure modes.
2. Split compound tests that hide multiple independent acceptance criteria; combine only identical ones that share applicability and evidence.
3. Attach verified references (exact edition, section, customer adopted standard or manufacturer manual) and **source type**: normative, industry guidance, manufacturer recommendation, site design or project policy.
4. Define approval-grade templates for critical domains first: network multicast/PTP, UC audio, DSP intelligibility, commissioning evidence, failover and safety interfaces.
5. Implement algorithmic **applicability synthesis** from approved design, room archetype, installed assets, capabilities, risk, geography and dependencies; human engineer reviews plan before any test execution.
6. Validate each method with representative equipment/test lab and independent engineering SMEs. Calibration/instrument requirements must be explicit when required; simulator output never becomes field certification.
7. Version every test. When a standard or vendor behavior changes, preserve historical acceptance criteria and explicitly map successor tests and evidence impact.
8. Report meaningful **coverage**: `applicable_current / approved_test_plan`, `verified / applicable_required`, `pending / applicable_required`, percent unknown/blocked, plus test-library publishing completeness by domain. Never divide by all 1,122 tests for a basic room.

### 16.4 Detailed field scenario: speech intelligibility failure

A qualified engineer imports measured STIPA data from a calibrated instrument, links microphone/loudspeaker positions and date, selects approved design target, documents background conditions and capture chain, and marks a deficiency if below the approved criterion. ServiceHands opens an engineering assistance session with appropriate teams and vendor-supported DSP controls. Field Intelligence may supply passive logs or a **separately supervised** sweep, while Lite shows measurement positions and versioned room geometry. Engineer reviews EQ/AEC/automixer/zone/delay/power/network-synchronization hypotheses. Changes require authorized commands/backup, then independent retesting. No AI model may declare a previously failing test as passing without new valid evidence.

## 17. Assurance: evidence continuity, not status cosmetology

**Core inputs:** accepted baseline snapshot, approved design and test applicability, new device/config/firmware/topology observation, incident/change record, measurement provenance and source freshness.

**Core outputs:** precise difference, potential blast radius, affected requirements/tests, invalidated evidence with reason, risk and urgency, targeted recommissioning plan, review owner, new accepted baseline after independent revalidation. Preserve baseline V1 even after V2; never retroactively change status of historical signed report.

**Proposed change-impact policy:** deterministic rules first (`physical asset replaced`, `DSP config hash changed`, `camera firmware changed`, `switch port/VLAN modified`, `PTP master changed`, `room physical configuration changed`), then confidence-ranked recommendations. Unverified AI inferences remain advisory. Configuration drift detection must consider equivalent configuration representations (normalize where safe) and source authoritativeness to avoid false positives.

**Evidence Decay:** a model that explains why historical evidence is less applicable (not merely old), such as a changed DSP preset, repaired cabling or firmware feature difference; require transparent rule version and possible reversal by review. **Commissioning Debt:** impacted current tests needing verification; not merely general missed maintenance tasks. **Twin Fidelity:** distinguish unknown geometry and stale asset positions from verified match; never imply a score is instrument calibrated.

**Acceptance proof:** destructive scenario—replace one networked microphone, change an attached switch VLAN, update DSP firmware, show exactly which tests are potentially impacted and which unrelated tests remain valid; create ServiceHands tasks; enforce retest; accept new baseline only after correct roles/signoff.

## 18. Field Intelligence: safe observability and optional physical validation

**Default v1.3:** scoped passive/read-only reachability and management checks with approved schedules, source identification, capability/visibility reports, evidence capture, device health and network topology observations. Read-only does not mean consequence-free: enforce rate limits, allowlists, network segmentation and customer change windows.

**Optional v1.4:** separately licensed/approved physical validation where supported; local qualified operator, site consent and calibrated instruments. Controlled audio test signal, acoustics, PTZ/camera movement and instrument capture are possible designs, not proven universal features. Stop when room is occupied in a disallowed way, audio safety limit might be exceeded, required consent is missing, sensor uncertainty is excessive, device capability is unsupported, emergency mode engaged or remote watchdog expires.

**Post-signoff workflow:** after Phase 6, AV Operations Lead may request an optional safe sweep; issue a **supplemental observation report** to their authorized inbox, not a replacement for the signed final commissioning report. New findings become Assurance/ServiceHands records. Preserve measurement truth labels and do not silently overwrite accepted values.

## 19. ServiceHands: commissioning collaboration and field operations

**End-user loop:** deficiency/user complaint → triage → Search Party owner/skill match → collect room passport and past incidents → approve remote support session → compare source/device/config evidence → guided fault isolation → remediate with approved actions and rollback → collect retest evidence → independent verification → recommission if needed → close and feed knowledge back into Learn/standards.

**Engineering workstation requirements:** a single split-screen presents defect timeline, room topology, measurement charts (multi-trace frequency response, reverberation/decay, intelligibility, SPL, AEC/beamforming where instrumented), DSP/control configuration snapshot, live adapter capability, chat/video/Teams link, on-site field evidence, approved safe command actions and “Re-test” CTA. Calculations must preserve original trace, axes, units, sampling conditions, references and calibrated method.

**Dispatch:** service area, site access, primary/backup engineer, credential entitlement, travel/assignment history, equipment/parts/stock, SLA severity and labor, access to SOP and electrical/network safety prerequisites. Offline mobile capture queues are encrypted, tenant-scoped and conflict-resolved; never silently overwrite another engineer's result.

**No direct vendor connection:** show a deterministic manual diagnostic procedure based on available model/firmware and evidence, approved download/upload path and OEM escalation. AI explanation must cite real supporting records with uncertainty, not invent a command or imply direct access.

**Provider economics and trust:** record service ownership transitions, contract entitlements, warranty claims, equipment replacement and restoration; a new integrator gets time-scoped customer-authorized access with audit and eventual credential rotation/offboarding.

## 20. Engineering Vault and Legacy Room Recovery

**Requirement:** existing rooms commissioned years before Empathia must be onboardable into Pro and recoverable even when original documentation is missing. Treat recovery as a foundational adoption path, not an advanced niche case.

**Recovery workflow:** select existing room/QR/address → verify legal authority and ownership → photograph room/rack/devices, capture serials → approved network/management discovery → search SharePoint/document repositories/vendor consoles/backups → map physical/logical positions/ports/signal/power → reconstruct room in Lite with UNKNOWN/INFERRED labels → identify source projects, downloadable configs, compiled artifacts, license terms and missing original files → technician/engineer independently validates → establish **new current-state verified baseline where warranted**, not a fictitious historical commissioning certificate.

**Vault inventory must include:** DSP source and preset files; control program source/binaries and touch-panel project; network switch and routing configuration archives; cameras/presets; audio/video routing and calibration traces; racks/cables/IP/VLAN diagrams; firmware/driver versions; license and warranty proof; as-builts and CAD/BIM; manuals; vendor contact; installation/replacement history; last known-good backups; device capability and evidence ledger; approved credential-vault references.

**Limits and safeguards:** no reverse-engineered guarantee of access to proprietary program source; no bypass of encrypted credentials; no indiscriminate camera/audio recording; no unauthorized vendor-management API; no misrepresentation of proposed DSP routing as a recovered original. Support customer-owned deliverables according to contracts/rights; flag OEM-licensed artifacts separately. Record recovery completeness by *available evidence categories* and follow-up work, not a fabricated “fully restored” label.

**Handoff export:** authorized scope selection → rights/license filter → all approved native files and reference links, checksums, version manifest, missing artifacts, secrets access procedure, operational baseline, support SOP and audit receipt. Customer retains governance after integrator offboarding.

---

# PART VII — ROLE EXPERIENCES, CROSS-PRODUCT WORKFLOWS AND DESIGN SYSTEM

## 21. Role-optimized product experiences

| Persona | The five-minute success moment | Default entry and safe next action |
|---|---|---|
| AV Operations Lead | Understand current room readiness, commissioning risk, recurring defects, operator handoffs | Mission Control → risk queue → exact room/test → ServiceHands/Assurance |
| Commissioning engineer | Walk room, perform only applicable tests and attach qualified evidence | QR → Phase 3/4 test plan → failed test → guided measurements → deficiency/remote expert |
| Network engineer | See exact switches, ports, VLANs, multicast/PTP domain and dependency risk | Pro topology → evidence snapshots → approved config comparison → targeted validation |
| Service technician | Know immediately what failed, what to inspect and who can help | Assigned task → room passport → diagnostic procedure → remote expert → retest |
| Systems engineer/designer | See engineering history, room geometry, device standards and configuration source | Lite/Scouter → approved design revisions → drawing provenance → test requirements |
| Requester/facilities | Capture need without AV jargon; see a safe conceptual proposal | Photo/plan intake → Lite proposed A/B/C → cost constraints → engineering review |
| Executive/finance | Understand condition, cost, risk and evidence without technical chart overload | Control Tower → embedded Power BI portfolio view → drill to authorized Pro evidence |
| MSP/provider manager | Manage coverage, service performance, client scope and standards at scale | Multi-tenant switcher → authorized tenant → SLA/service and assurance views |
| Compliance/security | Audit access, source provenance, approved exceptions and change effects | Ledger/policy → immutable report and actor timeline → controlled export |
| Trainer/learner | Practice a technical scenario linked to actual kinds of incidents | Learn/SIGNAL → Explore/Guided/Challenge/Assessment → competency evidence |

**Unified UX language:** Show identity and provenance at every cross-product handoff. Favor “Room 4.218 / North Campus / Verified baseline V2” as a persistent context header. Avoid arbitrary duplicate objects, mystery health scores, role terminology drift and walls of dashboard cards. A tiny number of prominent actions—Open, Compare, Diagnose, Assign, Reverify, Export—is preferable to twenty equally weighted buttons.

**Three navigation layers:** lifecycle rail for new users, product rail for domain experts and global Search Party for everyone. Every result returns the user to previous filter/sort/scroll context. The system must respect keyboard (`/`, Ctrl/Cmd+K, Escape, arrow, Enter), screen readers, localization, date/time zone and reduced motion. Product surfaces share design tokens yet retain appropriate identity: Lite spatial, Pro precise, SIGNAL expressive, Executive editorial.

## 22. Five mandatory cross-product golden paths

### GP-A — New room from photo to commissioned system
Request intake → permissioned photo/floorplan → proposed Lite design with uncertain geometry → engineering survey and approved requirements → Scouter alternatives and confirmed data → budget and funded project → installation positions/assets → adaptive Phase 1–6 test plan and evidence → independent signoff → official report immediately → immutable baseline → Pro passport, Search Party, Power BI quality projection, Assurance monitoring.

### GP-B — Speech intelligibility failure during commissioning
Actual calibrated STI/STIPA measurement below **approved project-specific** target → Phase 4 deficiency → ServiceHands task and authorized engineer contact via Teams/approved room access → inspect DSP signal chain and acoustic traces, propose cause → approved change with rollback + instrument remeasurement → qualified verifier → documentation revision → Phase 6 completion. Do not universalize illustrative STIPA thresholds.

### GP-C — Existing undocumented room / integrator switch
Search Party find room → Legacy Recovery → site-authorized passive device discovery, SharePoint document search, manual photo inventory → recover available configs/source/ownership; mark unknowns → Lite reconstruct topology and spatial reality → Pro normalize assets → Field Intelligence authorized observations → new current-state baseline only after actual verification → customer-controlled handoff vault to new authorized provider.

### GP-D — Network or DSP change invalidates accepted evidence
Switch QoS/multicast/PTP policy or DSP configuration source changes → source event/observation with timestamps → Assurance impacted graph paths and test definitions → verify whether change is meaningful, create commissioning debt → ServiceHands targeted task → guided physical/system retest → new accepted baseline preserving V1 and historical report. Power BI shows debt trend after analytic refresh, not as an instantaneous action channel.

### GP-E — Executive KPI to operational action
Executive opens **live embedded customer-authorized Power BI** portfolio report → filters high recurrence / overdue drift cases → clicks allowed room/deviation → deep link validates tenant/room role on Empathia API → opens exact Pro/Assurance record → requests service or capital review → workflow event reflected in native real-time status; Power BI reflects it after its configured data-refresh interval.

## 23. Premium usability and mobile/field excellence

- Design system: neutral graphite/white, purposeful teal, amber for uncertainty, green for verified acceptance, violet for Learn; high contrast and 44px preferred touch targets. No fake neon operational data.
- Inputs: autosave drafts, inline data source, unit and locale-aware validation, clear destructive-action confirmation, schema-driven forms, role-specific defaults, auto-fill from previously approved data; never repeat the same address/room ID in a multi-step workflow.
- Dense table view: default 6–8 useful columns, saved views, advanced field chooser, CSV/XLSX/PDF export with provenance, virtualized rows where necessary; mobile card view with explicit filters.
- Search Party: exact-ID first, fast lexical search available without AI, semantic search only with cited source and permission-aware retrieval; no fake natural-language inference. Show unknown relationships honestly.
- Spatial Lite: 2D accessible fallback, synchronized asset selection, editable current/proposed revisions, dimension-confidence overlays, section views, simple mobile inspect, no uncalibrated engineering-accuracy claims.
- Network/service workstation: split pane between topology, current readings, event history, safe next actions and contextual expert help; display model/adapter limits next to control actions.
- Learn/SIGNAL: original 12-season authored content remains an authority to reconcile. Distinguish narrative panels, actually playable scenes, fully cleared audio/video, completed assessments and content not yet produced.
- Empty/error/offline: every core page has a meaningful path when tenant has zero rooms, one room, partially connected systems, expired permissions, stale data or no mobile network. Offline tasks show pending sync and conflict resolution; do not imply completed cloud commit while offline.
- Figma/code parity: component names/states, responsive grids, theme/typography, accessibility labels and tested screenshot baselines must map to implementation; Figma is not proof of implemented product.

---

# PART VIII — INDEPENDENT ARCHITECTURE REVIEW: GAPS, MISCUES AND REMEDIATIONS

## 24. Review methodology and scoring discipline

Do not use an unearned “10/10” engineering-readiness score. Rate separately: (1) strategic usefulness, (2) implementation completeness, (3) verified customer outcomes, (4) security/compliance evidence, (5) usability/accessibility, (6) operational/reliability evidence, and (7) commercial fit. **UNKNOWN is a first-class scoring result.** An offline mockup or the 1,122-test library cannot be treated as a production-ready score. Conduct field validation with actual engineers, technicians, service providers, executives and requesters before claiming “best-in-class.”

### 24.1 Prioritized risk register

| Risk | Priority | Inaccurate assumption / consequence | Required correction and acceptance evidence |
|---|---|---|---|
| Claimed universal device connection | P0 | No API/credentials/firmware; false trust and unsafe commands | Capability manifest, provenance, unsupported mode and safe fallback; vendor-lab contracts |
| BI report mistaken for live operations | P0 | Cached Import visuals drive bad real-time decision | Native operational lane + independent Power BI freshness; no report-issued device commands |
| Cross-tenant report/data leakage | P0 | Power BI RLS/OLS and Empathia ACL differ | Actual embed-token/effective-identity negative tests and per-tenant workspace strategy |
| “Consent once” across Microsoft APIs | P0 | Graph/Power BI/Teams scopes and licenses differ | Permission-by-source wizard, admin grant logs, revoked scope and expired token tests |
| Commissioning count equated to certification | P0 | Generic criteria or untested methods create false PASS | SME-vetted, site-specific target, instrument calibration, independent signoff |
| Vault implies recovering any password/source | P0 | Vendor security/license and irreversible hashes | Lawful exports/secret rotation/ownership process, clear UNAVAILABLE state |
| Role switch as security | P0 | Synthetic persona mistaken for server permission | Segregated app/demo tenants and all server-side policy checks |
| Automatic physical FI sweeps | P0 | Acoustic disturbance, privacy, unsafe movement | Explicit local operator/safety authorization, independent assessment, abort/watchdog |
| Missing current source of truth | P0 | Partial old archives treated as latest running system | Forensic repo compare, SHA/git HEAD/migration/CI restore and parity ledger |
| Internal remote support session | P1 | Unauthorized engineer could access production endpoints | Session-bound privilege grant, approvals, recording rules, expiry and command audit |
| Complex UI surfaces | P1 | Product portfolio overwhelms users | Persona jobs-to-be-done tests, one-context navigation, progressive disclosure |
| SharePoint revoked access cached | P1 | Protected documents searchable after revocation | Deletion/tombstone, permission recheck at click and export time, cache expiry |
| Asset duplicate/rename collisions | P1 | Wrong room histories and invalidation rules | Stable source IDs, physical vs logical distinction, human match queue |
| No authoritative networking policy | P1 | Default multicast/QoS values invalid at some sites | Per-site standards, exceptions, network engineer approval and protocol capability |
| Incomplete signal media | P1 | Investor story implies 133 fully produced episodes | Separate content/media manifest, licensed VO/captions and truthful player state |
| Project acceptance vs optional sweep | P1 | Signoff report delayed by a later diagnostic job | Six formal phases only; immediate immutable report; optional supplement after |
| Unvalidated “savings” and ROI | P1 | Investor/user trust risk | Actual baseline denominators, source/assumption labels and pilot measurements |
| Overcentralized database as bottleneck | P1 | Telemetry event volumes swamp Postgres graph | Separate operational/analytics/time-series retention and back-pressure |
| Power BI cost/refresh unsupported | P1 | Unexpected licensing, throttles, stale reports | Capacity/entitlements matrix and source-specific analytics design |
| Enterprise offboarding/export gaps | P1 | Customer remains locked into a provider | Customer-owned export, license rights, credential transfer and audit |
| Safety/legal code scope | P1 | False applicability of one authority across sectors | Local specialist signoffs and non-waivable statutory gates |
| One-step automatic change remediation | P2 | Fragile remote workflows and unintended downtime | Recommend → review blast radius → approve → execute → verify → rollback |

### 24.2 Misconceptions corrected from earlier summaries/research

1. **Six phases, not seven.** Optional post-signoff Field Intelligence is a separate diagnostic activity; final official report is issued right after Phase 6 signoff.
2. **STI/STIPA thresholds are not universal.** Do not treat a value shown in an example as a general pass/fail target for all spaces, especially life-safety applications.
3. **Graph is a domain concept, not necessarily a graph database.** Begin with recoverable Postgres-based graph tables and benchmark migrations rather than duplicating entities across stores.
4. **Live Power BI is permissioned BI, not a sub-second IoT feed.** DirectQuery refresh is constrained by tenant and capacity; native UI controls show live operational facts.
5. **Connectors are evidence-gated.** A known vendor name in source does not prove a released integration, nor a reachable endpoint prove entitlement to read configuration.
6. **No automatic source code recovery.** Saved compiled code and inaccessible proprietary source may not be recoverable; prefer authorized vendor/export and full configuration reconstruction process.
7. **Historical CI is not current CI.** The restoration report has a specific frozen revision and excluded media/live connector tests; new code and Microsoft integrations need new test evidence.
8. **Power BI cannot be the primary writeback path for commissioning.** Dashboard actions must reauthorize and invoke Empathia workflows on the backend.
9. **Selected SharePoint permission doesn't imply tenant-wide search.** Architect selected-site scope enumeration and separate delegated broad search modes.
10. **The investor estate is synthetic, and 90 is a target.** Do not invent recovered canonical 45 records or publish unverified fixture metrics as customer statistics.

## 25. Biggest unexploited opportunities

**A. Knowledge inheritance across provider changes:** customer-authorized vault recovery + source authority records + QR/device passports offer differentiated customer continuity. Measure time-to-first-support and missing-archive recovery rates in pilots.

**B. Commissioning-as-code differentiated by evidence quality:** the test catalog becomes a versioned procedure engine tied to real capabilities, calibrated measurement and lifecycle events. The architecture can produce QA reliability unavailable in static Excel checklists **if** implemented and field validated.

**C. Source-aware cross-product AI:** AI can cite original control drawings, file versions, recent observed ports, OEM docs and commissioning measurements while clearly saying when the system cannot know. Start with deterministic retrieval and guardrails; postpone autonomous device control.

**D. Embedded executive insight with immediate operational follow-through:** combine Power BI's rich analytics with Empathia's governed actions. This is more useful than duplicating a Power BI dashboard under a different brand.

**E. Integrator/MSP handoff operating economy:** structured contractor scope/permissions, approved service routes and customer-controlled IP chain can reduce onboarding friction and improve renewal value; validate with customer pilots rather than claim invented ROI.

**F. Lifecycle/sustainability traceability:** energy and asset carbon decisions linked to source factors, measured usage, warranty, service risk and replacement design; never silently substitute generic emissions factors or approximate utilization for actual data.

**G. Skills-to-action loop:** link verified incidents to relevant Learn/SIGNAL labs with appropriate role training, and measure whether training improves actual service outcomes. Keep fictional narrative safely segregated.

---

# PART IX — ENGINEERING ROADMAP AND RELEASE ACCEPTANCE

## 26. Phased execution, dependencies and ownership

| Stage | Deliverable and product proof | Primary owners | Unblocker / gate |
|---|---|---|---|
| **0. Preserve and audit** | Recovered repo/bundles, authoritative branch/CI, parity ledger, source manifests, integration capabilities and current deployment truth | CTO/tech lead, SRE, QA | Clean restore and baseline screenshots; preserve rollback |
| **1. Canonical continuity** | Tenant/site-scoped identities, source authority, physical/logical asset distinction, graph relation and evidence ledger; stable API schemas | Backend/data/security | Tenant-isolation and event-ordering tests |
| **2. Real Enterprise shell + Pro/Search** | OIDC, permissions, Pro passport, exact-ID/relationship search, link navigation, functional mobile | Full-stack + security/UX | Real authenticated site/room walkthrough and search negative tests |
| **3. Instant Connect P0** | Consent, capability manifest, selected scope, dry-run reconciliation, initial sync, health, revocation; Microsoft and 1–2 approved test adapters | Integrations, Microsoft identity, security | Customer/sandbox credentials and field-authority review |
| **4. Commissioning & Vault** | Six-phase workflow, criteria/SME-vetted initial test packs, doc gate, official signoff report, configuration vault/SharePoint references | AV/network SMEs, backend, mobile | Physical lab validation and legal handoff requirements |
| **5. ServiceHands & Legacy Recovery** | Field work order, qualified remote support, safe adapter view, legacy import/reconstruction, customer export | Service leads, UX, security | Technician shadow pilot and access review |
| **6. Assurance/Field Intelligence** | Passive snapshots, deterministic drift rules, targeted retests, optional authorized sweep supplement | Networking/AV/edge engineers | Qualified instruments/operations policy, baseline lineage test |
| **7. Power BI Intelligence P0/P1** | BYO organizational embedding first, report catalog, governed marts, context filter bridge, refresh status and licensed app-owns-data pilot later | BI developer, Microsoft identity, data/security | Customer Power BI tenant/licenses and actual RLS/access tests |
| **8. Lite/Scouter/Drawing intelligence** | Versioned room models and photo/BIM uncertainty, design-to-tests mapping, approved catalogs | Spatial/BIM and AV design | Real drawings/models and capability-specific engineering validation |
| **9. Executive/Apex/Learn** | Decomposable risk scores, enterprise BI reports, investigation path, SIGNAL training use cases | Data/analytics, content, UX | Validated models, media licensing and user research |
| **10. Commercialization hardening** | Performance/load/accessibility, RPO/RTO drills, connector certification, legal/privacy and pricing packages | SRE/security/product/commercial | Pilot acceptance, finance review and founder signoff |

**Dependency sequencing correction:** Power BI should start with a simple corporate user-owns-data pilot while the governed semantic model develops; it does not need a massive Fabric platform before first value. Legacy Room Recovery should be part of the initial onboarding pilot, not deferred until after every advanced feature is built. SaaS cross-tenant embed is a *different* more complex project from corporate embedding.

## 27. Proposed acceptance targets (to negotiate, not already passed)

| Capability | Demonstrable release gate | Negative evidence required |
|---|---|---|
| First-run onboarding | Admin completes authorized connection to supported source, sees specific permissions and imported source records with correct room identity | Consent denied, wrong tenant, revocation, collision and 429 |
| Power BI corporate | Embedded approved real report with licensed user identity, filtering and deep link to Pro with correct room context | Unauthorized user/report; stale refresh; model mismatch; expired token |
| Power BI SaaS | Real app-owns-data embed with two isolated tenants and tested effective identity RLS | Guess other workspace/report or alter filter; no metadata/row leakage |
| Commissioning | One physical or qualified instrument lab suite demonstrating start→Phase 6, signed report and independently verified applicable tests | Stale evidence, wrong roles, missing docs, unsafe exception |
| Assurance | Changed DSP/port/VLAN/asset triggers correct impact and targeted retest; V1 preserved | Unrelated tests not falsely invalidated; missing source not a pass |
| ServiceHands | Qualified expert assists an actual failed test under permitted session and support role; retest and close | Unauthorized commands, session expiry, offline conflict |
| Legacy Recovery | Existing undocumented room reconstructed with discovered vs inferred vs missing records separated | Unrecoverable source file/credential remains appropriately inaccessible |
| SharePoint | Source file indexed/linked from Search Party under actual approved ACL | Revoke access, delete document, forbidden export, stale snippet |
| User experience | Requester, technician, engineer, executive and MSP persona complete core jobs without coaching | Mobile/offline/reduced motion/screen readers and failure states |
| Enterprise reliability | Repeatable migration/backup restore; measured API/report/search p95; audit/observability complete | Cross-tenant negative, retry/replay, duplicate delivery and recovery |

**Required QA suites:** domain/unit, schema/migration, model consistency, tenant/site auth, graph/search leakage, source authority, connector contract/integration, actual Microsoft token and Power BI RLS, governance and separation-of-duties, safe-device/agent adversarial tests, Excel catalog drift, browser desktop/mobile, performance and accessibility (NVDA/VoiceOver/TalkBack), offline-first conflict, backup/restore, refresh/429, deployment, user acceptance and licensed media decode when media is included. `NOT_RUN` remains NOT_RUN and blocks relevant release profile unless explicitly accepted by policy.

## 28. Founder decisions required before production work

1. Initial pilot tenancy: a customer-controlled Microsoft Entra/Power BI corporate environment or Empathia-hosted SaaS? Recommend corporate **user-owns-data** pilot first where licensed, plus synthetic investor demo.
2. Admin consent boundaries: which SharePoint sites, Power BI workspaces and Teams/Outlook actions can be authorized; who is tenant-level approver?
3. BI ownership and billing: BYO customer workspaces, Empathia-managed report templates or both? Which capacity/licenses are available?
4. Pilot device/network families and legal access: Q-SYS/Biamp plus a named switch/controller family, real supported firmware and approved test lab.
5. Data residency, incident classification, company/contractor data separation and retention schedule; requirements vary by customer/industry.
6. Device vault ownership clauses for original source programs, compiled binaries, third-party licensed artifacts and credential transfer.
7. Physical validation location/qualified operator/instruments, site safety and acoustics/privacy approvals.
8. Current authoritative private Git repo HEAD/branch and expected production URLs; never use old October release documents as proof of latest deployment.
9. Explicit founder authorization before paid Power BI Embedded capacity, Render/hosting, connectors that cost money, generation credits or live customer deployments.

---

# PART X — SOURCES AND VERIFICATION NOTES

## 29. Supplied Empathia sources used

**P1.** `EMPATHIA_90_ROOM_INVESTOR_DEMO_VISUAL_HANDOFF.md` (2026-11-05): visual target; 14 scenes, 36 views, proposed 45 additions; not verified implementation.

**P2.** `RELEASE_CANDIDATE_2026-10-31.md`: restoration release, historical 57 PASS/0 FAIL/1 NOT_RUN, no live external Teams delivery; branch and test caveats.

**P3.** `ENGINEERING_READINESS_2026-10-31.md`, `DEFECT_REGISTER.md`, `TERMUX_HANDOFF.md`, `Empathia_V253_Source_Inspection_Findings.md`: actual historical restoration/limitations and access restrictions.

**P4.** `Empathia-Living-Campus-V2.5.3-live.html`, `-offline.html`, `signal-standalone.html`: legacy product concepts and authored learning; not production feature proof.

**P5.** `AV Commissioning Framework v1.3.xlsx`, `AV Commissioning & Asset Vault v1.3.xlsx`, `AV Operational Issue Intelligence Framework v1.3 .xlsx`, `AV_Commissioning_Asset_Vault.xlsx`: founder framework heritage; preserving source files as evidence.

**P6.** `Empathia_Universal_Commissioning_v1_3_Expanded_Engineering.xlsx` and `Empathia_Universal_Commissioning_Engineering_Master_2026-11-07.xlsx`, plus `Empathia_Universal_Commissioning_Research_Audit_2026-11-07.json`: catalog counts, phase correction and unexecuted status.

**P7.** `Search_Party_Infrastructure_Engineering_OS_1_5_1_PowerApps_Data_Model_v2.xlsx`, `Empathia_Field_Intelligence_v1_4_Optional_Validation_Preview.zip`, `empathia-source-20261031-*.tar.gz` and restoration `.bundle` files: available architecture/source heritage; full verification of live branch and deployment still outstanding.

**P8.** Prior Claude Connector Prompt / Phase Two / engineering command briefs and master directives recovered in conversation; provenance maintained as historical instructions, not necessarily the current source tree.

## 30. Authoritative public Microsoft references (consulted 2026-11-07)

- **[M1]** [Embed for your organization — implementation planning](https://learn.microsoft.com/en-us/power-bi/guidance/powerbi-implementation-planning-usage-scenario-embed-for-your-organization). Distinct user-owns-data scenario.
- **[M2]** [Embed for your customers — implementation planning](https://learn.microsoft.com/en-us/power-bi/guidance/powerbi-implementation-planning-usage-scenario-embed-for-your-customers). Distinct app-owns-data scenario.
- **[M3]** [Power BI embedded capacity and SKUs](https://learn.microsoft.com/en-us/power-bi/developer/embedded/embedded-capacity). Capacity and licensing matrix; must review current offering and customer plan.
- **[M4]** [Power BI embed tokens](https://learn.microsoft.com/en-us/power-bi/developer/embedded/embed-tokens) and [Generate embed token](https://learn.microsoft.com/en-us/power-bi/developer/embedded/generate-embed-token). Authentication and token shape.
- **[M5]** [Automatic page refresh in Power BI](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-automatic-page-refresh) and [Power BI data refresh](https://learn.microsoft.com/en-us/power-bi/connect-data/refresh-data). Source and capacity constraints.
- **[M6]** [Push semantic model limitations/deprecation notice](https://learn.microsoft.com/en-us/power-bi/developer/embedded/push-datasets-limitations). Do not build new long-term streaming dependency without checking replacement.
- **[M7]** [Refresh semantic model REST API](https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/refresh-dataset) and [Enhanced asynchronous refresh](https://learn.microsoft.com/en-us/power-bi/connect-data/asynchronous-refresh/).
- **[M8]** [Power BI embedded row-level security](https://learn.microsoft.com/en-us/power-bi/developer/embedded-row-level-security), [RLS effective identity](https://learn.microsoft.com/fabric/security/service-admin-row-level-security) and [service principal profile tenant isolation](https://learn.microsoft.com/en-us/power-bi/developer/embedded/embed-multi-tenancy).
- **[M9]** [Power BI embedded report filtering JS APIs](https://learn.microsoft.com/en-us/javascript/api/overview/powerbi/control-report-filters).
- **[M10]** [Power BI reports in group REST API](https://learn.microsoft.com/en-us/rest/api/power-bi/reports/get-reports-in-group).
- **[M11]** [Microsoft Graph SharePoint/OneDrive selected permissions](https://learn.microsoft.com/en-us/graph/permissions-selected-overview).
- **[M12]** [Microsoft Graph site search permission limitations](https://learn.microsoft.com/en-us/graph/api/site-search).
- **[M13]** [Microsoft Graph driveItem delta query](https://learn.microsoft.com/en-us/graph/api/driveitem-delta).
- **[M14]** [Microsoft Graph throttling and Retry-After](https://learn.microsoft.com/en-us/graph/throttling).

**Reference limitations:** Microsoft documentation establishes platform capabilities but does not prove the Empathia connector exists or that a particular customer has licensed/consented them. Vendor hardware/standards requirements also need direct, version-specific confirmation and qualified specialist review before any field commissioning certification or active control.

---

# PART XI — CLAUDE ENGINEERING EXECUTION HANDOFF

## 31. Master build directive (copy/paste)

> **EMPATHIA ENTERPRISE — AUTHORITATIVE MASTER CONTINUATION DIRECTIVE**
>
> You are the engineering implementation lead continuing the existing Empathia Technologies project. Read this entire specification and audit all supplied original sources, restoration bundles, source archives, parity ledgers, tests, the 1,122-candidate commissioning workbook, the investor visual handoff, SIGNAL authored content and prior Claude Connector Prompt directions **before editing**. Recover the current authoritative Git branch and commit. Never treat a marketing screen or historical PASS as evidence of deployed product.
>
> Preserve all proven functionality and source history. No destructive rewrite. No merger to main, production deployment, paid Power BI capacity, third-party connector provisioning, hardware actuation or media credit spending without explicit founder permission. Use a feature branch, incremental milestones, passing tests, evidence and rollback. Never disable a test merely to make CI green.
>
> **Mission:** Build an exceptionally usable, dependable vendor-neutral infrastructure lifecycle platform. The same high-fidelity product components power the isolated synthetic investor campus and a real authenticated customer enterprise application. Products share identity, source authority, version history and evidence. Never use one feature's cached duplicate as another feature's source of truth.
>
> **P0 implementation program:** (1) verify repository/architecture/parity; (2) canonical tenant/estate/room/asset/evidence/graph contracts; (3) trustworthy user sign-in and room/navigation/Search Party/Pro foundation; (4) **Instant Connect**: Entra authorization, Power BI/SharePoint/approved source selection, consent/scope, capability manifest, dry-run reconciliation, health/revoke; (5) **Live Power BI**: BYO organizational embedded reports, governed semantic/report catalog, authentic permission and licensing diagnostics, report-to-room filters, refresh freshness and native operational fallback; (6) six-phase Universal Commissioning with preserved Phase 4, Phase 5 Documentation Tracker and Phase 6 immediate signed final report; (7) ServiceHands collaboration, Engineering Vault and existing-room recovery; (8) Assurance/FI safe snapshots/retest; (9) Lite/BIM/Scouter and premium mobile role journeys.
>
> Power BI is **not** a new source of commissioning truth or immediate command channel. Choose user-owns-data embedding for initial corporate tenant where allowed; design app-owns-data as separately licensed multi-tenant architecture. Test actual embed-token RLS/OLS and permission failure scenarios before external claims. Microsoft Graph SharePoint selected-site permissions require explicit grants; don't hallucinate tenant-wide search. No legacy streaming/push dependency without current API review.
>
> Treat the 1,122 workbook rows as **candidate** tests, not certified executable scripts. Create test publishing gates for applicability, exact method, calibrated measurement, site criterion, evidence and independent verification. Issue new code in safe vertical slices; use real device lab data for verified operational tests and clearly marked synthetic fixtures for investor mode. Never fabricate device API methods, output, source code or passwords; use capability-aware fallbacks.
>
> Build the five golden paths GP-A to GP-E in this specification with measurable acceptance. Enforce tenant/site auth, least-privilege connector consent, independent acceptance, immutable report/baseline history, idempotent events, retrieval revocation and on-site FI stop conditions. Correct phase transitions and authorization must be shared between demo and enterprise where appropriate, with separate data/security modes.
>
> After each slice provide changed-file inventory, API and schema changes, migration result, tests/negative tests, screenshots/browser capture for desktop/phone, exact hash/branch, connector capability proof, semantic data freshness, vulnerabilities, disabled/planned features and rollback. Progressively improve UX but do not remove existing working routes or SIGNAL narrative because they are visually inconvenient.
>
> Stop and present explicit owner decisions only for external approvals (credentials, paid resources, deployment and actual hardware actuation). Otherwise execute safe local engineering slices without stopping at a plan.

### 31.1 Milestone prompts to run sequentially

**PROMPT 00 — Source archaeology / truth ledger:** `Restore all bundles and archives in isolated scratch environments; compare commits/tags/migrations to latest authorized remote, enumerate the current routes/API contracts/test inventories; generate architecture inventory + RESTORATION_PARITY.csv with PRESENT_WORKING / DEGRADED / PLACEHOLDER / MISSING / UNVERIFIABLE; provide reproduce commands and fail loudly on secrets. Do not edit production code.`

**PROMPT 01 — Canonical graph and tenant safety:** `Implement or reconcile room/physical asset/position/port/relationship/source authority records. Create source observation/reconciliation contracts and append-only event provenance; add tenant/site negative tests, concurrency/idempotency tests and migration rollback. Preserve old routes/ids and original acceptance semantics.`

**PROMPT 02 — Instant Connect P0:** `Build customer admin connector wizard (provider choose → authorize/consent → capability probe → scope select → dry-run match → approval → initial sync → health/revoke). First implement mock contract, then real Entra/selected SharePoint/approved Power BI metadata within authorized tenant; add all rejection/throttling/revocation tests. Prove which vendor APIs are actually called; none invented.`

**PROMPT 03 — Live Power BI P0:** `Implement user-owns-data corporate embedding with Power BI JS client, approved workspace report catalog, filter contract to room_id, explicit licenses/consent and token-expiry behavior. Materialize governed semantic data products from approved read model and show last refresh/data watermark. Add cross-site denied and stale-data scenarios; embed for customers remains gated until a separate capacity/RLS architecture is approved.`

**PROMPT 04 — Commissioning six-phase + catalog governance:** `Preserve existing Phase 4 semantics, implement Phase 5 Document Tracker and Phase 6 independent signoff, immutable baseline and immediate official report; optional FI supplement after. Create validator/importer for 1,122 candidate catalog, publish SME-reviewed test packs first, exact evidence/unit/target/applicability. Demonstrate one real lab test and failures, never all candidates PASS.`

**PROMPT 05 — ServiceHands / Vault / Legacy Recovery:** `From failed test create issue → lookup expert → approved Teams/contact session → vendor capability view or guided diagnostics → retest/verify; build customer-owned document/config repository and secrets references. Enable safe old-room onboarding even with missing files. Document vendor/license limitations and offboarding export; negative security tests required.`

**PROMPT 06 — Assurance/Field Intelligence:** `Capture read-only source configuration snapshots, compute accurate changed-field/impacted-test paths, present drift and recommissioning debt; create targeted retests. Optional v1.4 physical validation must require on-site safety/consent and not block the signed report. Prove old and new baselines separately.`

**PROMPT 07 — UX/Quality and demonstration parity:** `Apply one Figma-aligned accessible design system to website, investor and enterprise; finish GP-A..E for mobile, tablet and desktop, exact ID Search Party, Pro registers, Lite 2D/3D and Power BI drilldown. Build deterministic synthetic demo fixtures separately from live data; do not presume 90 verified rooms. Test accessibility with real assistive technology and failure states; report remaining gaps.`

**PROMPT 08 — Security, operational hardening and proposed release:** `Run full fresh-checkout build, migrations, container/device/connector contract tests, Microsoft permission/RLS, field safety, load/performance, 429 and token expiry, storage revocation, backup/restore, screen reader and media rights tests. Deliver release dossier with PASS/FAIL/NOT_RUN and owner approval gates. No unapproved deployment.`

---

## 32. Definition of completeness

A product is not 10/10 because its navigation exists, its visual concept is beautiful or its workbook contains hundreds of rows. For any product, its owner must prove **usefulness, engineering correctness, source freshness, security, accessibility, resilience, interoperability, recoverability, transparency and measurable customer satisfaction** in the workflows its target users actually perform. Evidence of those dimensions—and honest labels for what remains unbuilt—are part of the product itself.

**End of master specification.**


---

# PART XII — PROMPT RESTORATION, PORTFOLIO COMPLETENESS AND HARMONY GOVERNANCE (2026-11-07 ADDENDUM)

**Revision precedence:** This addendum is **additive** to the 7 November 2026 Enterprise Master Specification, its Instant Connect and Power BI architecture, and the underlying source-preservation rules. It resolves omissions identified after that draft, chiefly Harmony and the original full 18-product estate. It does **not** declare all original conversations or source files fully inspected. The separately included `Prompt_Archive_Recovered_Source_Text.md`, `Empathia_All_Products_Requirements_Traceability.csv` and `Prompt_Instruction_Inventory.csv` are normative review inputs, not evidence of feature completion.

## 33. Source-coverage honesty and hierarchy

The founder's instruction is to preserve **every recoverable prompt, feature, improvement, corrective decision and implementation request**, not only the 7-product commercial wedge or the modules surfaced in the most recent corporate demo. This means the engineering team must reconcile:

1. The authenticated latest repository, Git history, migrations, branch/tag tree, tests, actual deployed services and operating contracts, as independently inspected by Claude.
2. Legacy V1.4.1, V2.1–V2.5.3 live/offline/engineering-private HTML and SIGNAL standalone sources, and any older RoomOS/InstantRoom/TrainingOS implementations that can be located.
3. The source-preservation archives, bundle files, restoration parity/test logs, defect register, engineering readiness and source inspection report.
4. Historical user-authored directives in the `Claude Connector Prompt` conversation and other Empathia project chats, followed by recoverable master prompts, Deep Research reports, screenshots and reference kits.
5. The commissioning, operations intelligence, asset vault, Search Party PowerApps and Field Intelligence workbooks and preview agents.
6. The 7 November 2026 1,122-candidate commissioning catalog plus all later specific corrections made by the founder, notably the six-phase model.
7. This latest consolidated requirements ledger and any explicit founder supersession or withdrawal instructions.

**Access limitation:** The current export includes full wording of certain *prompt artifacts* and current-chat founder directives, but not an exhaustive machine-readable transcript of every earlier chat. The inventory MUST mark such records `HISTORICAL_SUMMARY` instead of falsely calling them literal recovered user prompts. Do not mark “every chat audited” until the actual transcripts are acquired and matched to this ledger. Treat similarly titled research reports as separate evidence, not independent founder approvals.

**Truth precedence rule:** a recent explicit founder correction beats an earlier proposed design; a tested production safety or identity constraint is not silently overridden by a visual prompt; actual product code beats an old screenshot on implementation status; historical concepts remain as restoration tasks unless intentionally deprecated. All disputes require an ADR and founder signoff where commercially or safety material.

## 34. Chronology of recovered founder intent

| Date / period | Directive family | Core invariant or newly raised capability | Evidence nature |
|---|---|---|---|
| Late 2025 | RoomOS / InstantRoom / TrainingOS origin | Vendor-neutral AV/IT/physical room model, digital twin, device/signal and room capture, mobile/desktop, technical training | Prior-conversation summary; source text not fully archived here |
| Nov–Dec 2025 | Universal lifecycle + devices | AV network/storage/control, presenter/visitor/technician modes, QR documentation, diagnostics, privacy boundaries, broader vendor and service integrations | Prior-conversation summary |
| Jan–Apr 2026 | Design/digital-twin + operations maturity | BIM/CAD/3D interoperability; power/room/network topologies; issue intelligence, asset vault, port profiles, KPI dashboards and governance | Prior-conversation summary and uploaded frameworks |
| July–Sep 2026 | Spatial workplace / Learn evolution | Visitor/employee/engineer mode; CitiTech/SIGNAL story and certification labs; standalone 12-season competency ecosystem; sector expansion | Prior-conversation summary and SIGNAL source |
| Sep–Oct 2026 | Canonical product family | Pro separated from Search Party; Lite, Learn and SIGNAL; Field Intelligence reachability; one system from design to service; evidence-backed lineage | Prior-conversation/project context |
| 22–23 Oct | V2.5 full-product mandate | Preserve V1.4.1 source; 18 experiences, Knowledge Fabric, Harmony, Control Studio, UE5, Onboard/Publications, Church/Frontline, Collaboro-Sing | Archived V2.5 completeness/rebuild reports |
| 30–31 Oct | Project Ascension/restoration | Git preservation, dual legacy parity, production auth security claims separated from demo, Founder Studio and two sites; connector audit; 35/10 visuals, film/voice restoration | Engineering brief, restoration mandate and recorded tests |
| 31 Oct | 50/10 full web experience | Architectural dark design, motion that communicates state, premium mobile, role-aware graph and deep technical journeys; don't compromise CI | 50/10 masterplan prompt artifact |
| 31 Oct | Release candidate freeze | 57 test suites reported passing, one media suite not run; API/DB and UI release candidate distinguished from deployed SaaS | Historical release report, not current certification |
| 1 Nov | Phase Two spatial/build research | 30 curated rooms; normalized Lite geometry; Core Replay; assisted/supervised/simulated FI; L1–L3 audio/video/lighting Learn labs | Archived Phase Two master prompt/report |
| 5 Nov | Investor visual brief | Proposed eventual 90 fictional rooms (preserve 45 if verified, add 45), 14 guided scenes, 36 screens, Search Party/Pro/Lite principal interactions | Explicit conceptual visual handoff |
| 6 Nov | Enterprise OS expansion | Vendor-neutral infrastructure graph, BIM/CAD/NetBox/ServiceNow/cloud integrations, source authority, API SDK, design-to-ops lifecycle, pass/fail truth | Enterprise rebuild master directive |
| 7 Nov | Universal Commissioning expansion | 380 candidates/214 network in first expansion; 1,122 candidate master/431 network after research; 59 families, 45 archetypes; not physically executed | Workbook evidence and current chat |
| 7 Nov | Corrected six commissioning phases | Original Phase 4 **unchanged functional commissioning**; Phase 5 Documentation Tracker; Phase 6 signoff and **immediate** official report | Explicit founder correction in current chat |
| 7 Nov | Field Intelligence post-signoff and ServiceHands | Optional safe sweep sends separate report to AV Operations Lead; real remote engineering help for intelligibility, DSP and network/video issues | Explicit founder correction in current chat |
| 7 Nov | Engineering Vault + old-room recovery | Customer-operable retrieval of paid-for configurations/source/presets and documents; recover already-installed undocumented rooms, lawfully and with provenance | Explicit founder correction in current chat |
| 7 Nov | Instant Connect and native Power BI | Admin-authorized guided connectivity, live enterprise workflows, embedded governed BI, SharePoint/Teams, vendor APIs and edge devices | Explicit founder directive and Master Spec v1.0 |
| 7 Nov | Harmony restored as mandatory engine | Leases/owner heartbeats, cross-vendor duplicate suppression, orchestration, split-brain and rollback | Founder reminder and completeness audit |
| 7 Nov | This consolidation instruction | **All recoverable prompts from all Empathia chats, every feature/improvement and original 18-product estate** must be traceable to the architecture, not just noted in memory | Explicit current user instruction |

Dates not specifically substantiated in the available file or chat have not been invented. The apparent chronological gap between 1 and 5 November is not evidence of inactivity or completed work.

## 35. Full portfolio is NOT only the seven-product commercial shortlist

The preserved 18 named experiences from the V2.5 completeness audit are: **Search Party; ServiceHands; Intake Portal; Empathia Pro; Assurance/APEX; Field Intelligence; Intelligent Universal Commissioning; Empathia Lite; Scouter; Procurement; Drawing Intelligence; Control Studio; Empathia Learn; SIGNAL; Onboard/Knowledge Publications; Experiences/UE5; Collaboro-Sing; Church/Frontline.** This is the historical naming inventory. Some are nested or cross-cutting: the later six-phase Commissioning directive supersedes the older five-phase label; Assurance and APEX must have distinct authority; Learn and SIGNAL share but are not interchangeable; Onboard's IT/End User/AV Engineering guide variants retain independent editorial lifecycles. Never relabel a historically proposed product “deployed” solely because it appears in this inventory.

The **platform-wide engines** and productized shared surfaces include: Core/Infrastructure Lifecycle Graph, Mission Control, Harmony, Action Ownership Console, Knowledge Fabric, Diagnostic Intelligence, Automation, Connect/Instant Connect, Identity/Entitlements/MSP tenancy, Evidence Ledger and Core Replay, Standards & Governance, Engineering Configuration Vault/Legacy Recovery, Power BI Intelligence, Executive/Control Towers, APEX investigation, Site Survey, project lifecycle/finance, Sustainability/Green, Room and Device Passports, QR/context navigation, design-to-ops feedback and portable/exportable engineering assets.

The 2026-11-07 requirement bank includes atomic improvements for each of these families. The document may group modules commercially, but **no scope item disappears just because its SKU or navigation rail name changes**.

## 36. Non-negotiable complete customer journeys

**J-01 New room delivery:** requester submits purpose, photographs/floor plans, measurements and location → approved intake → independent engineering/finance approvals → Lite concept + design alternatives → Scouter and BOM → install → six-phase adaptive commissioning → Phase 5 documentation / operational handoff → Phase 6 signoff → signed report immediately → baseline V1 → searchable estate/passport and Assurance.

**J-02 Existing undocumented room:** staff/AV Ops Lead chooses Recover Existing Room → scope and consent → read-only approved network/device discovery + SharePoint/archive search → Lite photographs/topology model → retrieved vs inferred configurations distinguished → gaps to ServiceHands and verified new tests → customer-owned engineering record → authorized *new* acceptance baseline. Never reconstruct an invented historic signoff.

**J-03 STIPA/intelligibility defect:** qualified engineer records actual measured STIPA and target/calibration position → fail and deficiency → ServiceHands finds qualified support and offers Teams/live authorized console → compare DSP/AEC/audio paths, source files, noise/reverb, room treatments, network clock → candidate fixes → approved safe correction via Harmony if external write action → repeat physical measurements and independent verify → attach to commissioning or recommissioning.

**J-04 Cross-vendor failure:** Utelogy/XiO/Q-SYS and Empathia report overlapping issue → canonical incident reconciled → Harmony selects authoritative action owner → duplicate actions suppressed → ServiceHands and APEX observe progress → Assurance recomputes affected evidence; no simultaneous competing device action.

**J-05 Instant Connect:** tenant admin selects provider → authenticates with requested scopes → scopes sites/data → capability probe (READ/OBSERVE/CONTROL etc) → first dry-run dedupe and source authority conflicts → named approval → initial sync → source freshness/permission audit → real room and native Power BI/SharePoint view, with a safe degraded/offline state.

**J-06 Power BI anomaly to repair:** licensed authorized embedded report shows dated aggregated incident/asset trend → click exact room_id → native Pro/Assurance confirms *current* source and last observation → ServiceHands dispatch → verified retest → analytic read model eventually refreshes, clearly showing analytic watermark and data latency.

**J-07 Optional post-signoff sweep:** Phase 6 signs and immediately releases authoritative report → separately approved FI safe sweep if chosen by AV Operations Lead → no automatic actuation → supplementary report to authorized inbox → tracked new findings and targeted revalidation, preserving signed report V1.

**J-08 Integrator transition:** customer-appointed operations role grants time-bounded access → Vault lists customer-owned/exportable files vs licensed/proprietary/unavailable data → lawful credential references/reset plan → new provider can browse approved source, settings, models, baselines and evidence → transition event and token revocation audited.

**J-09 Training loop:** genuine issue/failed test becomes a sanitized/synthetic Learn/SIGNAL scenario → student trains in appropriate level and is evaluated → competency evidence saved without pretending equipment was physically verified → technician returns to live issue with safe instructions.

**J-10 Site-wide network change:** authorized ACL/QoS/VLAN/multicast/firmware change mapped through graph → predict affected rooms and test applicability → Harmony arbitrates external change ownership → planned maintenance → actual fresh observations → targeted tests/Assurance confidence → service fallback for anomalies.

**J-11 Workplace visitor:** Lite wayfinding/space context and signage information available at appropriate public scope → visitor can find facilities without seeing confidential meeting, asset, credential or employee records.

**J-12 House of worship / Frontline:** volunteers receive scoped services/runsheets, technical readiness and SIGNAL learning without exposing corporate/MSP tenant data, with audio/livestream/lighting control permissions separated.

## 37. Harmony must be first-class architecture, not a name in a product map

### 37.1 Proposed system boundary

Harmony is a **coordination service**, not an unconditional actuator and not a replacement for vendor controllers. Its invariant is **at most one Empathia-authorized owner for a particular external write intent** at a time. It cannot guarantee mutually exclusive action across an external system that does not participate in or honor the ownership protocol; integrations must be capability- and contract-aware, conservative and auditable.

Minimum durable objects:

| Object | Required fields and semantics |
|---|---|
| `ActionIntent` | tenant_id, intent_id, target IDs, action class, reason, risk, requesting actor, source incident, idempotency key, preconditions, expiration |
| `ActionLease` | tenant_id, intent_id, owner platform/principal, fencing generation, acquired_at, expires_at, heartbeat_at, state |
| `ActionDecision` | policy/approver, external authority constraints, allowed/denied/deferred, reason, evidence snapshot, audit trail |
| `ExternalActionLink` | provider, provider incident/command reference, source state, last reconciliation watermark |
| `ExecutionAttempt` | attempt ID, command capability, safety approval, sent_at, acknowledgment state, timeout, result, rollback reference |
| `Verification` | postcondition test/observation, source confidence, independent reviewer when required; cannot be faked by successful command acknowledgment |

State machine: `DRAFT → ELIGIBILITY_CHECK → AWAITING_APPROVAL → CLAIMING → OWNED → EXECUTING → AWAITING_CONFIRMATION → VERIFYING → COMPLETED`. Separate terminal/blocked branches: `DENIED`, `CONFLICT`, `EXPIRED`, `TIMED_OUT_UNCERTAIN`, `ROLLED_BACK`, `ROLLBACK_FAILED`, `NEEDS_MANUAL_REVIEW`. Do not treat timeout as proof of failed execution: it may have succeeded remotely. Resolve ambiguity through a read-only postcondition probe or human confirmation before any retry.

### 37.2 Safety gates and ownership arbitration

- Before external write: validate tenant/site scope, device supported capability, approved change plan, source age, precondition snapshot, risk tier, consent, maintenance window, current lease fencing and foreign-system ownership.
- Only one local operator/engine owns the write. APEX proposes; ServiceHands coordinates; Assurance defines affected evidence and verifies; FI observes or performs separately authorized physical checks. Harmony is the action-owner broker.
- If external tool already owns remediation, record its authoritative ID and subscribe/read its status rather than taking a competing action.
- Lease expiry must not permit stale executors to finish work unless the target/vendor enforces fencing or verified cancellation; for unsupported vendors fail closed and require human reconciliation.
- Rate limits, backoff, outbox retries, incident deduplication, approval expiry and revocation are mandatory failure paths.
- Preserve raw command result, source acknowledgement, independent verification and rollback status; never conflate “command accepted” with “system repaired.”

### 37.3 Harmony acceptance and red-team matrix

| Test ID | Negative or failure scenario | Required behavior |
|---|---|---|
| HARM-001 | two concurrent claimants | single valid fenced owner; loser denied; audit both |
| HARM-002 | duplicated webhook/event | one action intent; no repeated device write |
| HARM-003 | lease expires during command | safe ambiguous state; no blind retry or contradictory pass |
| HARM-004 | heartbeat missing / external owner lost | state transitions to manual reconciliation or controlled transfer |
| HARM-005 | split-brain among service replicas | fail-closed fencing; no simultaneous accepted writes |
| HARM-006 | stale telemetry asserts successful repair | verification invalid; request fresh read or qualified measurement |
| HARM-007 | external vendor action already active | read/coordinate, suppress duplicate command and display owner |
| HARM-008 | client unauthorized on different site | server denies even if UI exposes button or has cached session |
| HARM-009 | token/consent revoked midflight | cancel if safely possible, clear permission to continue, document ambiguity |
| HARM-010 | remote API 429 / timeout / partial success | bounded retry only when idempotent and state confirms safe |
| HARM-011 | rollback failure | explicit escalation and retained compromised state; no green completion |
| HARM-012 | failed postcondition after successful command | work remains open; notify ServiceHands and Assurance |
| HARM-013 | conflicting incident identifiers | canonical correlation audit; no merge across tenants |
| HARM-014 | physical emergency condition | manual stop overrides remote actions; safety priority |

## 38. Comprehensive improvement architecture and visibility

**Product completeness formula:** each product requires a substantive role-specific UI; canonical identity; executable workflow; source provenance and uncertainty; authenticated authorization; operation and failure-path contract; instrument/simulator/connector evidence; accessible desktop+phone flows; exports/handoff; latency/reliability targets; independent QA; and genuinely trained end-user comprehension. Decorative page presence does not equal restored functionality.

**Architecture improvements to incorporate across products:** capability manifests over fake “universal integration,” BIM/ITSM/IPAM/ERP field authority, privacy-checked Knowledge Fabric and AI, normalized spatial scene representation, persistent multi-role workflows, safe mobile offline syncing, versioned room passports, adaptive test engine, engineering source vault, reciprocal change impact, Harmony arbitration, native operational status plus Power BI analytics, deterministic investor campus, protected real enterprise environment, sector-specific packages, and measurable customer ROI only after pilot evidence.

**Highest-impact omissions from the prior master document:** Harmony was not named in its first revision; original Control Studio, Onboard/Publications, Experiences/UE5, Collaboro-Sing and Church/Frontline were underrepresented; the historical 18-product scope was not fully explicit; early InstantRoom/RoomOS thinking and all-stage Claude prompt lineage were not indexed. This revision restores them without pretending the code is finished.

**Known architecture contradictions to resolve (ADR required):**

| ID | Conflict | Founding decision / resolution |
|---|---|---|
| ADR-GAP-01 | original five phases vs later six | six formal phases; retain old functional Phase 4; Phase 5 docs, Phase 6 independent signoff/immediate report |
| ADR-GAP-02 | post-signoff FI called a seventh phase | optional separate service with supplementary report; outside formal phase count |
| ADR-GAP-03 | 94 vs 380 vs 1,122 tests | dated catalogs, not interchangeable; maintain full lineage, candidate/validated/executed counts separately |
| ADR-GAP-04 | 30 vs 90 demonstration rooms | 30-room Phase Two milestone vs 90-room target; verified original records before any merge, never silently fabricate 45 legacy rooms |
| ADR-GAP-05 | 7 vs 18 products | seven-product first commercialization strategy is not permission to delete the 18-product roadmap |
| ADR-GAP-06 | static demo vs live SaaS | separate synthetic investor/public UI from production identity, tenant data and server actions; shared UI/domain components where safe |
| ADR-GAP-07 | global vendor access vs device limitations | adapter capability/firmware/license truth; fallback guided assistance; no unverified 95% coverage claim |
| ADR-GAP-08 | design simulation vs calibrated measurements | modelled values and physical evidence carry separate provenance and acceptance authority |
| ADR-GAP-09 | Power BI live vs actual freshness | embedding interactivity does not make all semantic models real-time; display source/refresh watermark, use native operational status |
| ADR-GAP-10 | customer-owned files vs proprietary formats | rights-based exports, never bypass encrypted control programs, vendor access or credentials |
| ADR-GAP-11 | automatic 15-min checks/biweekly deep scans vs physical safety | read-only defaults; site-local scheduled passive monitoring policy; opt-in separately approved physical validation |
| ADR-GAP-12 | AI assistant vs external device control | AI recommends/tests; all actual writes are policy-authorized and Harmony-coordinated |
| ADR-GAP-13 | demo role perspective vs authentic RBAC | UI lens not authority; server-side tenant/site enforcement for enterprise |
| ADR-GAP-14 | closed/incomplete files vs “everything restored” | parity states and missing-source backlog, no false restoral claim |
| ADR-GAP-15 | visual 35/10–100/10 vs critical task latency | visual quality targets must defer to accessibility, speed and reproducible actual workflow completeness |

## 39. Claude restoration directive: what it MUST do with this package

1. Read the master specification v1.1, this dated addendum, every atomic register row, recovered original prompt archive, original V2.5 completeness mandate, 35/10, 50/10, Phase Two and 6 Nov Enterprise prompts and all supplied source/history artifacts.
2. Compare the requirement ledger to actual implementation: `WORKING_VERIFIED`, `IMPLEMENTED_UNTESTED`, `SIMULATED`, `MOCKED`, `PLANNED`, `MISSING`, `BLOCKED_EXTERNAL`, `SUPERSEDED`, `CONFLICT` with exact file/route/API/test/owner references. No “complete” without evidence.
3. Produce a clause-level **prompt-to-feature-to-code-to-test** crosswalk. Retain all prior functionality; do not lose a feature because it is a lower-commercial-priority experience.
4. Implement/verify Harmony contracts, Action Ownership Console, fault simulator, rollback states and split-brain tests before describing closed-loop multi-vendor automation as enterprise-ready.
5. Reconcile canonical room graph, commissioning transitions, vault/doc rights, Work Order and Assistance, UI navigation, Power BI/SharePoint/Instant Connect and meaningful user journeys with the updated spec.
6. Prioritize one commercially complete vertical slice (new room, old room and failure/recommission) with real evidence and full accessible UI rather than opening 18 new mocked screens at once.
7. Generate `SOURCE_COVERAGE.md`, `PROMPT_PARITY.csv`, `FEATURE_PARITY.csv`, `GAP_REGISTER.csv`, current `API_CATALOG`, migration ledger, visual regression, full regression results and current release/rollback dossier.
8. Never merge, deploy, spend, connect personal/customer tenant, perform real hardware actuation or publish private data without explicit founder authorization; all deficits remain visible.

## 40. Canonical test of the 10/10 target

For an investor, buyer, executive, engineer, field technician, architect, MSP operator, campus visitor, volunteer, trainer, learner and data/security administrator: **can they locate the right room and authoritative context, understand what is known, take an authorized next action in very few steps, see the exact evidence, recover when a vendor connector fails, and move to the next product without data re-entry?** The experience must be tested by those personas, including nontechnical users, with task success, cognitive burden, latency, accessibility, integrity and recoverability measured in representative pilots. No fabricated satisfaction scores or unsupported market-dominance claims.

## 41. Recovered-prompt and feature appendices

This package includes: (A) **`Prompt_Archive_Recovered_Source_Text.md`** — full source text of available historical Claude prompt artifacts and verbatim current-chat founder corrections, labeled by provenance; (B) **`Prompt_Instruction_Inventory.csv`** — dates, source, status and lineage; (C) **`Empathia_All_Products_Requirements_Traceability.csv`** — atomic requirement register across the 18-product portfolio and platform-wide engines; and (D) **`PORTFOLIO_REQUIREMENT_BANK_2026-11-07.md`** — human-readable full scope, with all requirements treated as unverified implementation targets unless independent evidence is supplied. The archives do not contain private credentials or a claim of complete earlier-chat transcription.


---

# PART XIII — FULL ATOMIC PRODUCT REQUIREMENT BANK

# Empathia Technologies — Consolidated Product and Improvement Requirements

**Working evidence status:** founder directives + historical design/source artifacts. Every line is an implementation or verification requirement, NOT a claim of a shipped feature. This is an ADDITIVE restoration register; preserve older verified behavior unless a specifically documented later decision supersedes it. The accompanying ledger CSV assigns individual identifiers.

## Empathia Core / Infrastructure Lifecycle Graph
- Persist unique tenant/customer, portfolio, region, campus, building, floor, space, room, rack, position, device, port, cable and environmental zone identities.
- Represent designed, specified, purchased, installed, configured, measured, accepted, operated, replaced and retired state as temporal relationships rather than disconnected copies.
- Track owner, accountable authority, revision, source-of-truth, valid_from, valid_to, observed_at, evidence reference and tenant scope for each relationship.
- Maintain separate design intent, observed installation, accepted baseline, current observation and proposed future representations.
- Apply source-specific field authority (for example authorized BIM geometry, network IPAM, financial ERP and Empathia acceptance); detect conflicts and require reconciliation.
- Provide canonical Room, Device, System, Person, Project, Incident, Evidence, Document and Network passports with stable cross-product deep links.
- Preserve event envelopes, outbox/inbox delivery, ordering guarantees, idempotency, replay and provenance across product boundaries.
- Support temporal reconstruction without rewriting past accepted evidence or fabricating earlier observations.
- Keep high-volume time series in suitable telemetry storage or analytics projections rather than overloading the graph database model.
- Provide reversible migrations, backup/restore and safe object merge/split with identity tombstones and references.
- Expose immutable authored decision history and append-only evidence/audit chains with tamper signals.
- Make customers capable of lawful data export, retention/deletion and provider transition without losing core engineering context.

## Harmony Engine / Action Ownership and Coexistence
- Represent a unique action intent linking tenant, room/device, incident, origin, requested remediation, risk and idempotency key.
- Resolve one authoritative actor/platform for a write operation across Empathia, ServiceNow, vendor console, on-site technician and approved automation.
- Display who owns an action, why, external incident reference, lease scope, heartbeat, deadline, current state and next eligible action.
- Prevent duplicate/out-of-order execution and replayed write requests, including repeated webhooks and retry storms.
- Use bounded leases, fencing/version tokens and heartbeat timeouts for ownership handoff; stale actors must lose authority to write.
- Fail closed on split-brain, owner loss, ambiguous consent, non-idempotent uncertainty or unavailable adapter confirmation.
- Distinguish observation, recommendation, approval, command execution, verification and rollback responsibilities.
- Coordinate APEX, ServiceHands, Assurance, Field Intelligence and automation without silently taking ownership from existing vendor/ITSM tools.
- Preserve original action intention and exact result, including partial success, rollback attempt, failed rollback and unresolved manual intervention.
- Show suppressed duplicate requests and conflicting-owner decisions in an inspectable Action Ownership Console.
- Set per-action blast-radius limits, rate limits, safe stop conditions and two-person approvals for higher-risk changes.
- Enforce tenant, site and device capability authorization at command time, not only when work is initially scheduled.
- Support dry-run and deterministic chaos simulations for 429/timeouts, stale state, lease expiry, split-brain and duplicate vendor events.
- Keep Harmony queued/simulated in release claims until real controlled integration tests prove exclusivity and safety.

## Identity, Governance, MSP Tenancy and Administration
- Support named Entra/OIDC/SAML enterprise identity, user provisioning/deprovisioning and a documented SCIM strategy.
- Model separate people, roles, site scope, tenant/customer boundaries, MSP support assignments, service accounts and delegated approvals.
- Enforce server-side RBAC/ABAC and least-privilege action entitlements; public role switchers must not grant real authority.
- Separate recorder, verifier, acceptor, approver, funding authority, operations lead and independent reviewer duties.
- Provide time-limited just-in-time access for external integrators, OEM technicians and remote engineering collaborators.
- Support step-up authorization, clear command approval and emergency/break-glass procedures with audit and expiration.
- Treat external MSP super-tenant views as aggregation with enforced underlying per-customer row/column/document isolation.
- Keep customer-owned documents, proprietary vendor files, secrets, licenses, consent and contractual usage rights distinct.
- Enforce field-level redaction and source-system ACL changes in search, cached snippets, export, embeddings, mobile offline replicas and analytics.
- Provide managed onboarding/offboarding for installers/integrators, with external account disabling and credentials rotation guidance.
- Surface entitlements, licensing, assigned sites, denied actions and scope changes in an understandable administration interface.
- Preserve a private founder/company administration boundary without bypassing enterprise customer governance or data privacy.

## Mission Control / Unified Role Experiences
- Give visitors, employees, service technicians, systems engineers, product architects, operations leads, executives, verifiers and admins clear role-specific first tasks.
- Make each user's top safe action visible in one screen; allow role/perspective switching only within granted authority.
- Offer priority queue of aging incidents, new requests, pending commissioning, overdue evidence, expiring warranties, approvals and follow-up tasks.
- Include global universal Search Party entry from every product plus persistent current room/asset/project context.
- Offer action-oriented notifications, saved views, recent entities, assignment history, bookmarks and accessible keyboard shortcuts.
- Display real data freshness, source state and risk at the point of decision; do not silently promote stale observation to live fact.
- Preserve navigation, filters, scroll and selected entities across browser back, desktop, tablet and field phone.
- Expose a built-in guided tour, contextual help and example user journeys without obstructing expert workflows.
- Show actions that are unsupported or unauthorized with a reason and supported alternative, not dead-end buttons.

## Search Party / Universal Relationship and Intent
- Search exact asset/room IDs, model/serial/IP/MAC, room names, sites, people, vendors, work orders, tests, baselines, drawings, budgets, documents and events.
- Combine fast deterministic keyword/exact-match lookup with graph/path exploration and separately gated natural-language reasoning.
- Preserve original graph, keyword filters, saved queries, favorites, entity history, source conflict notices and legacy deep-link compatibility.
- Show context-specific room owner, backup owner, regional support, escalation chain, skills/license eligibility, vendor contract and service coverage.
- Map system/room interdependencies, network switch/port/VLAN, audio/video signal routes, shared infrastructure and blast radius.
- Search successful completed installations as reference projects with final photos, designs, as-builts, tested equipment, acceptance evidence and engineering contacts.
- Surface approved SharePoint and Knowledge Fabric documents with source version, permissions, freshness and direct permission-aware open actions.
- Provide Teams/Outlook contact actions only for appropriately authorized contacts and supported user accounts.
- Offer saved scopes, global keyboard command palette, QR field entry, accessible search suggestions and clear empty results.
- Never invent relationships, leak counts/snippets across tenants or expose permissions through semantic/vector retrieval.
- Link a search result directly into Pro, Lite, Commissioning, Assurance, ServiceHands, Power BI and Learn while retaining entity context.
- Expose missing information as explicit unknown edges and request a supported verification/recovery workflow.

## Empathia Pro / Room, Device, Network and Asset Registers
- Maintain room and asset passports including manufacturer, firmware, warranty, topology, current health, commissioning baseline, ownership, support, financial and documentation links.
- Provide room/device registers with searchable/filterable sortable tables, adjustable density, reliable exports and configurable columns.
- Surface approved VLANs, switch ports, uplink neighbors, link health, IPs, network roles, multicast paths, clock states and PoE budgets where authorized.
- Show current source observations separately from design/baseline and predicted states with timestamps and confidence.
- Integrate incident history, work orders, ServiceHands assignment, replacement, warranty/RMA and documented configuration changes.
- Provide standards alignment and detected drift with links to impacted tests and specific evidence rather than opaque health badges.
- Support large multi-estate asset populations with pagination/virtualized lists, efficient queries and user-specific saved views.
- Show device criticality, lifecycle exposure, unsupported firmware and security findings with auditable source calculations.
- Provide role-appropriate QR code entry for room/rack/device, with scoped sensitive information.
- Keep visualized signal/control/network/power diagrams attached to canonical graph objects rather than manually divergent diagrams.
- Track asset retirements, reassignments, site move/reuse, environmental metrics and approved disposal chain of custody.

## Empathia Lite / InstantRoom / Spatial Intelligence
- Allow campus to building to floor to space/room exploration with visitor, employee, engineer and operations spatial perspectives.
- Preserve current, designed, commissioned and proposed views, source provenance and room-specific geometry version history.
- Allow intake from photos, scanned sketches, dimensions, PDFs and permitted CAD/BIM models with uncertainty explicitly represented.
- Offer editable 2D plan and performant 2.5D/3D scene generated from normalized room model; support keyboard and non-3D equivalents.
- Represent displays, cameras, microphones, speakers, seating, doors, racks, pathways, wall treatments, power/network and furniture geometry.
- Support nine-axis Space Optimizer including camera coverage, sightlines, audio capture, reproduction, spatial efficiency, accessibility, infrastructure fit, supportability and purpose fit.
- Compare design options A/B/C with rationale, versioned engineer edits, trade-offs, budget scenarios, constraints and unresolved measurements.
- Show camera FOV, PTZ envelope, sightlines, microphone zones, speaker coverage, DSP routing, network paths and commissioning test positions where supported.
- Label indicative acoustic/coverage visualizations modeled, not certified physical measurements; expose method and assumptions.
- Integrate room photo-to-proposal journey, similar approved historical designs, engineering brief, Scouter and approval workflow.
- Provide spatial wayfinding, location orientation, employee onboarding and room booking/visitor experiences where authorized.
- Support room design time-machine, revision comparison, change impact, baseline overlay and Core Replay timeline.
- Handle unusual geometry, divisible rooms, movable walls, hybrid occupancy and high-complexity town halls without inventing coverage guarantees.
- Implement progressive 3D loading, LOD, low-power mobile fallback, reduced motion, accessible room/device list and responsive drawer controls.

## Intake / Project Governance and Project Delivery
- Support new room, retrofit, refresh, single-device, failure remediation, service enhancement, vendor change, standards exception and capital-project requests.
- Preserve requester intent, photos/floorplan, room/project link, business need, priority, success criteria and approved project classification.
- Route intake to Operations Lead and Systems Engineer with named ownership, service scope and requested evidence.
- Separate concept approval, engineering design approval, finance authorization, execution release and acceptance signoff.
- Provide approve, hold, reject, resubmit and change-order controls with named delegated approver, rationale, revision and audit.
- Generate an engineering brief with approved targets, constraints, risks, source evidence, site survey and proposed milestones.
- Support collaborative multi-designer revisions, rationale, comparison and independent review without losing prior design intent.
- Connect project planning, PM status, funding, vendor work packages, BOM, procurement, installation, commissioning and final handoff.
- Provide project schedules, completion/status, dependencies, owner assignment, financial exposure and earned-value measures with documented calculation methods.
- Support pending/rejected/on-hold flows, missing approvers and offline field edits without silently skipping governance.
- Prevent commissioning acceptance when required funded/technical work has not passed approved preconditions.

## Site Survey / Offline Field Intake
- Collect site photos, floor plans, equipment shots, dimensions, rack/port/signal observations and environmental constraints.
- Support QR/barcode entry, device serial capture and location identity matching with manual exception resolution.
- Distinguish observed vs measured vs estimated room dimensions, cable lengths and physical equipment placement.
- Enable mobile offline forms, signed queued edits, conflict detection, revalidation and later authorized sync.
- Capture permitted readings for power, acoustic background, wireless environment, accessibility and environmental constraints when qualified.
- Produce source-linked survey evidence and follow-up tasks for missing access, instruments or unsafe conditions.
- Connect preinstallation photos to final documentation tracker and later Asset Vault/Pro room history.

## Scouter / Device Evaluation, Standards and Standardization
- Provide evidence-based manufacturer and model evaluation using verified vendor specifications or labeled research needed.
- Preserve Q&A scoring, weighted criteria, review rationale, alternative A/B/C recommendations, pilot/test evidence and approval.
- Compare compatibility, DSP/control integrations, AV/UC support, firmware/security lifecycle, user experience, cost and total ownership.
- Recommend approved reference rooms and standardized DSP, camera, touch-panel and networking templates where source rights allow.
- Generate equipment recommendations subject to site requirements, warranty, service stock, installation feasibility and future supportability.
- Connect Scouter decisions to BOM, design intent, procurement, room builder, commissioning test applicability and changed standards.
- Explicitly separate approved standards from proposed substitutions and product catalog data that needs verification.
- Keep recommendations explainable and flag conflicts, vendor EOL, unknown APIs and calibration requirements.

## Procurement / BOM / Financial Lifecycle
- Generate BOM and equipment quantities from approved design revision and validated device recipes.
- Handle vendor quotations, substitution proposals, procurement approvals, receiving, serial matching and deployment readiness.
- Connect acquisition price, labor, support contracts, warranties, replacement, licensing, depreciation assumptions and TCO without fabricated savings.
- Preserve installation cost estimates and risk/uncertainty bands, especially for photo-derived conceptual designs.
- Support vendor bid evaluation, capital planning, lease/buy considerations and funding scenario comparisons.
- Detect substitution impact on topology, power/PoE, rack capacity, scope, schedule, tests and documentation.
- Maintain audit of purchase/return/RMA/refurbish/redeployment, contract rights and source authority from ERP.
- Support multi-currency, taxes, contract expiry and region-specific procurement rules when customer requirements demand them.

## Drawing Intelligence / CAD/BIM and Engineering Documents
- Ingest authorized Revit/ACC, IFC, CAD/DWG, Visio, PDF and structured drawing exports using supported formats/licensing.
- Extract or align room geometry, schedules, device symbols, identifiers, racks, cables, signal/network/power drawings and design revisions.
- Display AI-extracted interpretations as proposed/inferred until systems engineer approval.
- Reconcile drawing objects to existing physical assets and accepted room configuration without duplicating identity.
- Version drawings, comments, redlines, authors and approved change history; preserve originals and renderer sources.
- Produce connected signal flow, port/cable maps, rack elevations, risers and system context from verified graph data.
- Compare drawing-to-field discrepancy and generate site-survey/commissioning deficiencies with provenance.
- Respect Autodesk/vendor entitlements and do not represent imported BIM models as editable native Revit documents by default.

## Control Studio / AV and Building Control Design
- Offer functional editable drag-and-drop control authoring and simulation for allowed device/room classes, with save/revision/undo.
- Model button/scene/routing macros, presentation states, camera presets, speaker zones, lighting and environmental controls.
- Separate generic device abstraction and supported vendor adapter/driver capabilities; flag unsupported commands at design time.
- Show deterministic control-state transitions, event relationships and configuration rollback before deployment.
- Support multi-designer review, UI preview, device assignment, standards templates and accessible touch panels.
- Require approval and authorized sandbox/hardware validation before any code generation or actual controlled output.
- Export customer-owned source artifacts and documentation where licensing/contract rights permit.
- Handle physical room combine/split, emergency override, disconnected controls and recovery safely.

## Universal Commissioning / Six-Phase Engineering Engine
- Preserve Phase 1 readiness and requirements; create approved project-specific standards, acceptance targets and required test conditions.
- Preserve Phase 2 physical installation verification, as-installed equipment, cabling, rack, mounting, serial and electrical/network assignments.
- Preserve Phase 3 network and platform validation including significant IT/UC/AVoIP/ICT engineering depth.
- Preserve ORIGINAL Phase 4 functional system commissioning; do not silently replace it with documentation or handoff.
- Make Phase 5 Documentation Tracker include required photos, as-builts, DSP/control archives, network plans, software/config records, revisions, operational handoff and source ownership.
- Make Phase 6 independent signoff and acceptance with published report immediately after authorized signoff and immutable baseline.
- Keep optional post-signoff Field Intelligence diagnostic sweep outside the six formal phases, never blocking official report timing.
- Retain a versioned catalog of 1,122 candidate engineering tests (431 network) with original 380 lineage and granular applicability.
- Qualify candidate tests by SME review, scoped method, approved instrument, units, pass criterion, evidence and safety before publishing executable test pack.
- Cover physical AV/IT, audio DSP/acoustics, speech intelligibility, video/display/camera, control, digital signage, lighting and show systems.
- Cover structured cabling, copper/fiber certification, VLAN/L2, routing/L3, IPv4/IPv6, DNS/DHCP/NTP, wireless, PoE/UPS and switch configuration.
- Cover IGMP/PIM/multicast, QoS/DSCP, PTP timing, Dante/AES67, ST2110, VoIP/SIP/SBC, conferencing quality and broadcast transport.
- Cover cyber controls, identity/certificates, environmental safety, accessibility, OT adjacency, life-safety interfaces and jurisdiction-specific specialist review.
- Select applicable tests from approved room/project/device/network dependency manifest; avoid running irrelevant 1,122-row checklist for every room.
- Record raw measurements separately from pass decisions, source/datetime/instrument/calibration, targets/tolerances, engineer and independent verifier.
- Require approved deficiencies/retests, exception rationale, responsibility, due dates, evidence, and reviewer signoff without self-approval.
- Treat unperformed, unavailable and not applicable as distinct from verified PASS; no silent defaults, manufactured pass rate or unknown thresholds.
- Generate complete customer handoff dossier and immediate signed report with evidence/deliverables, rights and baseline references.
- Define export/report versions, hashes, storage permissions, evidence revocation, reviewer correction process and audit policy.

## Assurance / Drift, Recommissioning and Baselines
- Maintain acceptance baseline V1/V2 etc with previous versions preserved, full diff, verifier chain and externally linked evidence.
- Compare approved observed configuration, firmware, device identity, routing, network assignments, DSP presets, control programming and physical modifications.
- Distinguish a new observation from true change, source disagreement, stale connector, unsupported field or sensor uncertainty.
- Map every detected configuration/topology change to impacted design requirements, tests, safety conditions and business criticality.
- Compute and expose commissioning debt and evidence-decay factors with reason and source rather than opaque arbitrary confidence numbers.
- Issue targeted recommissioning plans based on actual change impact; refrain from indiscriminate full test repeat.
- Support customer-approved monitoring cadence and room-local time zones; default desired 15-minute passive monitoring and proposed biweekly 00:00 deep review only after feasibility/policy validation.
- Ensure no scheduled physical sweep/camera movement/test tone occurs without separately authorized hardware activation, safe operator and consent.
- Escalate failed evidence revalidation into ServiceHands and APEX with human ownership, lifecycle trace and approval.
- Apply Harmony action-owner arbitration before any governed remediation; Assurance does not automatically grant actuation authority.
- Show portfolio readiness, drift, baseline age, source freshness, critical room exposure and next proof action.
- Allow legacy-room new baseline only from newly verified evidence; never forge original historical commissioning.

## Field Intelligence / Optional Physical Validation
- Keep v1.3 passive nonintrusive reachability, discovery, multi-protocol awareness, safe plan collection and text/structured evidence as default.
- Provide a network- and VLAN-aware read-only device layer with explicit credential scope and safe route/port/protocol selection.
- Support approved snapshots/health checks at start, middle and end of defined monitoring windows, with role-safe alerting.
- Model authorized adapters for Q-SYS, Biamp, Shure, Crestron, Cisco, Microsoft, Dante and other vendors with per-operation capability proof.
- Separate v1.4 physical validation as optional, per-room licensed, calibrated, instrumented and on-site authorized.
- Require explicit permission before test tones, camera movement, microphone recording, loudness sweeps or network-active tests.
- Display acoustics, STIPA, SPL, RT60, gain/equalization and beamforming/mic coverage only with correct measurement provenance.
- Provide authorized camera FOV, pan/tilt/zoom envelope and room movement/coverage models with non-destructive hard limits.
- Link network packets/latency/jitter, media streams, UC compute health and DSP data to test/evidence applicability.
- Maintain trustworthy discovery outcomes: found, partially observable, unreachable, unsupported, not authorized, unknown.
- Generate optional post-acceptance AV Operations Lead diagnostic supplement delivered through approved mail integration.
- Use safe edge agent for local network access; browser alone must never claim to run PowerShell/hardware-validated scans.
- Feed Assurance with observed changes and ServiceHands with reproducible diagnostic artifacts; avoid direct undocumented remediation.

## ServiceHands / Engineering Assistance and Work Orders
- Handle requests, incidents, deficiencies, triage, dispatch, assignment, skill matching, onsite visit, diagnosis, repair, retest and closeout.
- Provide mobile-first technician cards with room QR, immediate issue, SOP, known fixes, last evidence, network path and vendor escalation.
- Support remote commissioning assistance launched directly from failed audio intelligibility, AEC, DSP, clocking, video or multicast test.
- Use Search Party to find approved technical specialists, current coverage, on-call owner, skills/licenses and vendor contacts.
- Launch authorized Teams/Outlook calls/chat/meeting/email from scoped contacts, with consent and meeting privacy controls.
- Open vendor-supported configuration/status views or governed support session when adapter allows, else evidence-grounded AI guided checks.
- Surface DSP project state, matrix routing, gain settings, EQ, AEC, presets, network clock and camera presets through rights-checked vault references.
- Provide multi-trace acoustic/measurement analysis: frequency response, RT60/decay, SPL, STIPA, delay, noise and target overlays.
- Clearly identify instrument type, calibration, location, timestamp, site target and uncertainty; no computer-generated graph as physical proof.
- Handle replacement integrator/provider handoff, customer-owned asset export and missing source/config rights without vendor bypass.
- Integrate field evidence/photo attachments, offline changes, time entries, parts, remote support logs, technician signatures and approval rules.
- Support service dispatch work queues, escalation, service-level targets, recurrence and resolution trend reporting.
- Generate independent retest and Assurance impact link on completed repair; keep acceptance reports/history intact.
- Support scheduled and emergency work with conflict/lease coordination through Harmony.
- Prevent duplication of ServiceNow/vendor incidents and apply single authoritative state/owner mapping.

## Engineering Vault and Legacy Room Recovery
- Permit new onboarding of already-installed rooms even when their original integrator and technical files are unavailable.
- Discover only approved devices, room topology, interfaces, network ports and observable configurations using authorized safe collection.
- Retrieve customer-accessible archives and links from SharePoint, approved network shares, vendor portals and technician uploads.
- Store DSP project backups, source/config exports, presets, racks, firmware, signal/network diagrams, contracts and final reports with hashes.
- Preserve camera, control, digital-signage and DSP engineering packages when downloadable under proper device/vendor rights.
- Keep all credentials in approved secret vault or references; never disclose stored raw passwords in ordinary UI/search, AI or exported reports.
- Offer lawful vendor-supported password reset/access recovery, JIT approval and source-code limitation disclosure rather than bypass/protection removal.
- Reconstruct proposed room geometry/topology/settings from evidence, labeling inferred versus retrieved originals distinctly.
- Provide access-controlled document completeness scoring with methodology, source freshness, reviewer and unresolved inventory.
- Show legacy discovery/recovery evidence in Pro, Lite, Search Party, ServiceHands, Assurance and planning.
- Support customer-owned handoff packages to new service integrators with contractual entitlement and controlled expiration.
- Build a *new* authorized verified baseline after recovery without claiming the room passed its original commissioning.
- Track missing source, inaccessible configuration and vendor closed ecosystem gaps as first-class actionable tasks.

## Knowledge Fabric / Content and Retrieval
- Ingest approved SharePoint/OneDrive/Teams linked knowledge, standards, SOPs, SOWs, engineering documentation and manuals.
- Keep original source identity, version, owner, ACL, freshness, citations and superseded status visible.
- Enforce deletion, revocation and permission changes in graph search, vector retrieval, thumbnails, cached data and exports.
- Explain source disagreement and stale revisions; do not return superseded instructions as approved procedure.
- Prevent prompt injection, untrusted embedded instructions and AI leakage from retrieved documents.
- Provide editable document links only when the customer and connector truly authorize editing.
- Link relevant original artifacts from service cases, commissioning tests, room passports and training modules.
- Support regional data residency, retention, legal holds, version rollback and audit of document consumption.
- Keep secure secrets/config files out of generic AI retrieval unless explicitly declassified for the requesting role.

## Diagnostic Intelligence / AI Copilot
- Build evidence-grounded engineering reasoning with traceable hypotheses, alternatives, contradictory facts and proposed next tests.
- Separate AI recommendations from device controls, acceptance decisions and credential access; require human authorization.
- Support domain-specific DSP/acoustic, video/camera, UC, network/multicast, SIP, power, control and enterprise telemetry diagnostic playbooks.
- Connect observed issue patterns to known fixes, vendor documentation, similar systems, commissioning failure patterns and training labs.
- Expose uncertainty, missing data, confidence basis and citation/source version in each technical answer.
- Perform controlled safe simulation and explain expected/observed differences without inventing calibrated data.
- Provide user feedback, error analysis, benchmark cases, prompt-injection adversarial tests and model/provider audit.
- Preserve AI traceable recommendation lineage in APEX/ServiceHands/Assurance workflows.
- Prohibit hidden automatic remediation from AI suggestions; use Harmony/Automation approval, safety gates and audit.

## Automation Engine / Policy-Authorized Workflows
- Separate automated observation, advisor, supervised execution and formally approved remote device commands.
- Require site-specific control policy, explicit operator role, equipment capability, intended change, blast radius and approved time window.
- Include precondition snapshots, idempotency, rate limits, timeouts, abort/safety stops and postcondition verification.
- Coordinate all external write operations through Harmony; no parallel actuation from APEX, ServiceHands and other platforms.
- Provide exception/rollback procedures, confidence and audit when automatic action cannot safely complete.
- Support policy simulation, change dry-run, scope-specific test harness and staged production enablement.

## Empathia Connect / Instant Connect / Connector SDK
- Provide one administratively authorized wizard: provider selection, sign-in/consent, scope, capabilities, dry-run, match/reconcile, approve and sync.
- Detect vendor model/version/API/licensing support and explicitly present discover/read/observe/control/verify/orchestrate permissions.
- Include Entra ID, Microsoft Graph, Teams, SharePoint, Power BI, supported vendor APIs and safe local edge agents.
- Provide vendor integrations for Teams Rooms/Teams Pro, Zoom, Cisco, Crestron XiO, Utelogy, Q-SYS, Biamp, Shure, Sennheiser, digital signage and broadcast platforms only as verified by current API/terms.
- Include ServiceNow, Jira, NetBox, Autodesk/ACC/Revit/IFC, ERP and facilities integrations by separate capability contract.
- Support SNMPv3, HTTPS/REST, PJLink, syslog and approved protocol drivers; never imply a single protocol supports every function.
- Dry-run canonical room/device reconciliation using serials, IDs, MAC/IP/ports and multiple authority checks; require human resolution for ambiguity.
- Show connector health, token expiry, rate limits, retry state, last successful sync, watermark, audit and reauthorization.
- Handle tenant/site permission revocations, partial data, stale records, duplicate events, webhooks and API contract/firmware drift.
- Keep local secret/token management separate from low-trust UI and generic searchable records.
- Support approved field-edge read-only observation before any active vendor command or device-control workflow.
- Maintain public versioned REST/webhook/event contracts; add GraphQL only where complex data graph exploration materially improves UX.
- Create connector test/certification harness and sandbox fixtures with fault injection and contract regression.
- Never promise universal device/95-percent support coverage without verified compatible inventory and rigorous measurement.

## Power BI / Enterprise Analytics and KPI Passports
- Support native user-owns-data Power BI report embedding with appropriate Microsoft licenses/permissions in customer tenants.
- Design app-owns-data embedding as separately approved multi-tenant architecture with capacity, embed-token, RLS/OLS and entitlements.
- Provide a report/catalog directory, report-to-room context filters and deep links to Pro, ServiceHands, Assurance and Commissioning.
- Define governed semantic dataset contracts, canonical IDs, privacy filtering, lineage, numerator/denominator and time-series aggregation.
- Show report refresh source freshness and last observed watermark; no claim that scheduled report refresh is immediate device telemetry.
- Support Power BI dashboards for device compliance, asset inventory, room acceptance, aging deficiencies, failure recurrence and fleet trends.
- Support executive projects, funding, resource utilization, vendor results, warranties, replacement and standards drift with evidence.
- Separate instant operational state in native Empathia UI from analytical snapshots in Power BI; explain time-window discrepancy.
- Apply data security (RLS/OLS and customer authorization), consent, service-account limits, export restrictions and audit in embedded contexts.
- Handle expired tokens, deleted report, license/capacity issues, mobile rendering, cross-tenant denial and offline fallback.
- Provide export or approved shareable link only when user authorization and document rights permit it.

## APEX / Executive Intelligence / Risk and Operations
- Preserve issue intelligence, recurrence, MTTR, SLA, incident aging, escalation, severity, root causes and operational analytics.
- Offer evidence-grounded A0–A5 remediation recommendation tiers with explicit authority and approval.
- Correlate incident, asset, topology, service history, changes and baseline drift rather than showing independent charts.
- Present issue counts by root cause, vendor/owner, space, category and trade with clear denominators and periods.
- Provide executive dashboards for estate health, room readiness, project delivery, lifecycle exposure, financial and support load.
- Distinguish measured, observed, modeled and synthetic KPI values and provide drilldown to individual evidence records.
- Show what changed, what is at risk, what action is recommended, estimated cost/impact and responsible owner.
- Provide sector and site-specific views for executive, AV Operations Lead, integrator, MSP, frontline support and project manager.
- Track compliance/firmware exposure, device utilization, room usage and alternative tools such as collaborative whiteboards where lawful.
- Use Harmony for governed external remediation and show when vendor platform retains action authority.

## Empathia Learn / SIGNAL / TrainingOS
- Preserve all twelve SIGNAL seasons, 133 chapters and historical panel/scene corpus with authored/playable media status separately tracked.
- Preserve SIGNAL Season 1–12 names, four learning bands beginner/intermediate/advanced/mastery, scenario consequences and case links.
- Implement Mission Control, Story, Practice, Service Mode, Case Files, Ask, labs, scenarios, troubleshooting and role-based competency progress.
- Connect Discover→Understand→Hear/See→Manipulate→Break→Diagnose→Repair→Prove→Apply→Reflect to room/device context.
- Provide hands-on L1–L3 audio, video and lighting labs with Explore, Guided, Challenge and Assessment modes.
- Include measurement-style audio analysis, frequency/EQ/RTA, AEC, signal flow, Dante/media/network, video framing/camera, lighting/glare/CCT and troubleshooting.
- Make outcomes include competence, evidence discipline, trust, safety/authority, technical debt and leadership/readiness where approved.
- Preserve original fieldbook lessons, terms, formula references, quizzes, flashcards, performance checks, labs and source citations.
- Link a real incident or failed commissioning test to a relevant simulation/lab, then record learning evidence separately from technical equipment proof.
- Build reliable narration/media playback with verified files, rights, transcripts, captions, pause/seek/resume, mobile support and no false playable claims.
- Offer staff/volunteer learning, certification pathways and policy-aware instructor/assessor privileges.
- Maintain content revision, regional/localization metadata, accessibility and editorial review before publication.

## Onboard / Knowledge Publications
- Preserve separate IT Onboarding Guide, End User Guide and AV Engineering Standards Manual product content and editorial boundaries.
- Support searchable chapters, source revisions, approvals, quick-reference, QR links and export with ownership/rights metadata.
- Provide role-based onboarding journeys and room-context instructions linked to approved live standards.
- Warn when a guide is out of date versus current device configuration or superseded company policy.
- Maintain editable authoring, draft/publish governance, review cycles, localization and archival versions.
- Connect approved procedures to ServiceHands, Search Party, Pro, Learn and commissioning documentation tracker.

## Experiences / UE5 / Immersive Spatial Workplace
- Preserve immersive visitor/employee/technician routes for campus/room exploration, future UE5/Unity native clients and browser fallback.
- Make Unreal/Unity-style digital twins read a canonical scene graph; do not create disconnected shadow room registries.
- Support building floors, reception/iLobby, tech zones, meeting rooms, confidence stations, service routes and accessibility needs.
- Include interactive room simulations, coverage overlays, role-relevant task prompts, narrated journeys and training scenarios.
- Keep a working WebGL/2.5D accessible browser fallback whenever UE5 builds cannot run or are unverified.
- Treat highly specific historical physical site illustrations as private/source-specific demo references, not public customer data.
- Never call a native UE5 build functional unless engine assets, runtime, interactions and tests were actually executed.

## Collaboro-Sing / Music and Rehearsal
- Offer opt-in licensed/original music rehearsal and collaboration journeys with clear copyright permissions.
- Provide song/setlist, practice, tempo/key, cues, lyric rights, playback controls, performance history and accessible collaboration.
- Integrate authorized sound/AV setup and learning links when they improve rehearsal without mixing commercial rights.
- Distinguish prototype from commercially licensed streaming/content acquisition and rights to transform recordings.
- Support human-focused choir/band rehearsal, call times, volunteer permissions and offline rehearsal notes when relevant.

## Church / Frontline / House-of-Worship
- Maintain a distinct frontline/house-of-worship product with volunteer teams, assignments, service schedules and run-of-show.
- Track technical production/livestream readiness, RF/mic/comms issues, recurring equipment checks and incident escalation.
- Support user-accessible stage diagrams, device responsibilities, known fixes, rehearsal notes and emergency procedures.
- Link staff/volunteer skill development and SIGNAL labs to real supported systems with privacy/consent controls.
- Offer donations/events/community content only when independently scoped and not as a mandatory AV enterprise feature.
- Preserve separate organization/tenant privacy, finances, volunteers, consent and operational data authority.

## Procurement & Sustainability / Empathia Green
- Provide lifecycle forecast and refresh priority combining technical supportability, lifecycle cost, room business function and risk.
- Track warranty, warranty extension, device reuse/redeployment, refurbishment, e-waste, disposal and chain of custody.
- Calculate energy estimates and savings only with measured or transparently modeled consumption, provenance and uncertainty.
- Support approved circular procurement, Environmental Product Declarations, software licensing and region-specific compliance sources.
- Offer Sustainability Passport per room/device summarizing energy, equipment age, repair/reuse options and source quality.
- Support an e-waste training vertical in SIGNAL where evidence and legal/safety review allow it.

## Website / Investor Campus / Founder Studio / Design System
- Deliver distinct corporate website, resettable synthetic investor Living Campus, and real authenticated enterprise application with common components but isolated data.
- Restore V2.5.3 live/offline and original Founder Studio behaviors while preserving tested contemporary backend state machines.
- Include 35/10 restoration, 50/10 signature product storytelling and 100/10 Phase Two aspirations as design quality goals, not numeric claims.
- Build a 30-room Phase Two curated synthetic Campus as a recoverable milestone, then pursue 90-room investor target only after verifying original rooms and canonical IDs.
- Preserve 14 proposed investor scenes, 36 functional screen targets, room archetypes, varied topologies, 45 candidate additions and deterministic reset.
- Give corporate site premium dark architectural editorial art direction and simple navigation to proof, product stories, pilots, founders and investor resources.
- Give investor site guided 60s, 3min and technical journeys with deep functional exploration and downloadable safe evidence descriptions.
- Restore Founder Studio, founder credentials CTS/CAPM/Network+, authorized portrait, controlled claims and privacy boundaries.
- Use real Figma design-system variables/components, responsive frames and dev handoffs tied to implemented components and screenshot regression.
- Finish licensed corporate/product films and SIGNAL narration only from verified media assets with hashes, rights, captions and audio QA.
- Include usable responsive 320px/360px/390px through ultrawide screens, accessible controls, reduced motion, screen readers and efficient 3D render budgets.
- Use semantic state colors, high-contrast typography, no generic template cards, no dead buttons and no investor-only fake functionality promoted as enterprise.
- Include user acceptance tours, scripted scenarios, keyboard/mobile QA, source capture/rollback and release evidence.
- Provide genuine live enterprise integration through the same domain flows, not only a cinematic externally hosted HTML simulation.

## Quality, Security, Safety, Deployment and Commercial Proof
- Preserve all working routes, historical tests, source files, original prompts, parity ledgers, feature counts and assets; classify differences explicitly.
- Separate VERIFIED_WORKING, IMPLEMENTED_UNTESTED, SIMULATED_FUNCTIONAL, MOCKED_UI_ONLY, QUEUED, BLOCKED_EXTERNAL and UNKNOWN.
- Add operational proof levels OFFLINE_SYNTHETIC, LOCAL_INTEGRATION_TEST, VENDOR_SANDBOX, WITNESSED_PHYSICAL, CUSTOMER_PILOT, PRODUCTION_VALIDATED.
- Require versioned API contracts, negative tenant/site authorization cases, audit, secret scanning and immutable report/evidence validation.
- Test permission revocation, stale Knowledge/SharePoint access, model hallucination/prompt injection and export/embedded BI leakage.
- Test Harmony lease/timeout/idempotency/owner loss/rollback with deterministic simulators and real permitted integrations.
- Test physical measurement instrumentation, mandatory site safety, E-stop and authorized expert oversight for active tests.
- Require rate limits, retry/backoff, offline conflict merges, webhook replays, service timeouts and data reconciliation.
- Test service continuity, backup/restore, database migration, disaster recovery and tenant export in isolated environment.
- Verify assisted technology/keyboard mobile/browser accessibility with actual users, not just one automated Chromium screenshot.
- Require privacy and legal reviews for document ownership, copyright, photo/audio collection, tenant consent, badges and telemetry.
- Establish measurable product UX metrics such as time-to-first-correct-room, task completion, support handoff, and frictionless context propagation.
- Implement observability with traces, metrics, logs, correlation IDs, connector freshness and internal service health.
- Do not weaken tests for a green CI, promote historical 57 pass suites to current certification, or mark NOT_RUN as PASS.
- Avoid unapproved merge, deployment, paid connectors/capacity, real customer access and active hardware operations.
- Keep roadmap limited by team capacity and prove a sellable end-to-end vertical slice before adding more surface area.


---

# PART VI — NOVEMBER 7 FOUNDER ADDENDUM: CONTEXTUAL SOURCE-PLATFORM LAUNCH

# EMPATHIA ENTERPRISE — FEDERATED SOURCE PLATFORM LAUNCH & CONTEXT HANDOFF
**Change ID:** EMP-2026-11-07-FED-001  
**Version:** 1.2 (additive to Master v1.1)  
**Classification:** Founder-approved target requirement; implementation/production status UNVERIFIED.  
**Change origin:** Founder directive, 7 November 2026, requested "Show me in Teams Pro Portal," "See on Utelogy," "See on Crestron," and corresponding provider actions for every room and device across Search Party, ServiceHands, and authoritative registries.  
**User experience principle:** *Meet the customer where the infrastructure already lives. Preserve the exact room/device context whenever the external platform permits it, and be explicit whenever it cannot.*

## 1. Product vision and non-negotiable behavior
Empathia must not imprison customers inside its own user interface. It should act as the **vendor-neutral launchpad, relationship layer, and engineering continuity layer** for the tools customers already own. From an Empathia **Room Passport**, **Device Passport**, **Search Party** result, or **ServiceHands** ticket/deficiency, an authorized user must be able to select an existing customer-connected management platform and open the corresponding **room, device, incident, document, or analytics report** where such a destination can be confirmed. Prioritize a one-step contextual handoff; do not require a second manual search where a supported verified external object link exists.

Visible action examples: `View in Teams Rooms Pro Management`, `View in Utelogy U-Manage`, `View in Crestron XiO Cloud`, `Open in Q-SYS`, `Open in ServiceNow`, `Open in Power BI`, `Open source in SharePoint`, `Open in Cisco Control Hub`, `Open in device management console`. These are **examples, not a certification that every destination offers a stable deep-link API**. Labels must name the actual configured service and not advertise control capabilities not supported by that connection.

**Universal presentation rule:** each resource view gets one reusable `Source Platform Actions` component—contextual primary action(s), `Open in...` overflow menu, source-link status, tenant/workspace label, external identity, capability and last-verification metadata. The same component must power Search Party, Pro Room and Device Registries, Room and Device Passports, ServiceHands, Commissioning, Assurance, APEX and Field Intelligence; role- and relevance-scoped surfaces may show fewer buttons, but must use the same resolver and access rules. On dense/mobile layouts show one relevant primary choice and a compact accessible overflow, not an array of 12 competing logos.

**Do not overstate context preservation.** Choose an explicit outcome state:
- `EXACT_TARGET_VERIFIED`: a tested provider-supported URL or native app route resolves to the intended provider object. UI: `View this room/device in [platform]`.
- `FILTERED_TARGET_VERIFIED`: supported search/query, view/filter or report route lands in a properly scoped result. UI: `Find this device in [platform]` or `View related report in [platform]`.
- `PORTAL_ONLY`: only a validated platform landing page is known. UI: `Open [platform]` with clear explanation `Selection is not carried over`; offer copyable provider ID/serial and a safe lookup workflow.
- `NOT_CONNECTED`, `NOT_MATCHED`, `MULTIPLE_MATCHES`, `USER_NOT_AUTHORIZED`, `EXTERNAL_SIGN_IN_REQUIRED`, `UNSUPPORTED_DEEP_LINK`, `STALE_REFERENCE`, `PROVIDER_UNAVAILABLE`, `UNVERIFIED_LINK`: explain precisely and offer the shortest lawful recovery step.

A successful redirect is **not** proof that the final browser page loaded the correct object unless supported by a credible verification procedure. Login prompts remain the provider's responsibility; Empathia must never imply it can bypass another provider's authentication or licensing.

## 2. Integration with the canonical Infrastructure Lifecycle Graph
Add a first-class **External Resource Reference** (ERR), linked to the stable Empathia canonical entity. Suggested fields (schema shape, not proven existing migration):

```json
{
  "id": "err-opaque-id",
  "tenant_id": "tenant-opaque-id",
  "canonical_entity": {"type":"ROOM|DEVICE|INCIDENT|PROJECT|DOCUMENT|REPORT", "id":"empathia-opaque-id"},
  "connector_instance_id": "connected-instance-opaque-id",
  "provider_key": "teams_rooms_pro|utelogy_umanage|crestron_xio|...",
  "provider_tenant_or_account_id": "external-account-id",
  "provider_entity_type": "room|device|incident|report|document|...",
  "provider_entity_id": "external-opaque-id",
  "identity_evidence": ["source-id", "serial-or-device-id", "approved-manual-match"],
  "match_status": "VERIFIED|PROPOSED|AMBIGUOUS|STALE|REVOKED",
  "match_method": "PROVIDER_ID|API_JOIN|MANUAL_APPROVED",
  "supported_launch_mode": "EXACT_TARGET|FILTERED|PORTAL_ONLY|NONE",
  "launch_resolver_key": "registered-capability-id",
  "last_checked_at": "timestamp-or-null",
  "last_verified_by": "service-or-user-principal",
  "source_authority": "provider_and_scope",
  "mapping_revision": 1
}
```

All fields are tenant scoped; provider IDs are not assumed globally unique; IDs are matched within the configured provider account, service, cloud, region, and entity type. A room may map to several provider room/space objects; a device may appear in several vendor ecosystems. A single external object must not become silently linked to competing canonical devices or tenants. On merge/split/device replacement, review references and preserve relationship history, rather than blindly applying stale pointers.

**Matching priority:** verified provider resource ID > provider API relationship > verified serial/MAC + tenant/site context > documented owner-reviewed manual match. Room names and human-readable labels are never sufficient to promote an unreviewed match to VERIFIED. Sensitive identifiers and location metadata must follow customer authorization and retention rules. Legacy Room Recovery must also build and review these references as it discovers older systems.

## 3. Guided Instant Connect integration and source capability registry
The existing Instant Connect wizard adds a mandatory `External Navigation` capability card per connector:

1. Admin selects and authorizes the vendor tenant/account, cloud, scope, and permitted authentication mode.
2. Connector enumerates reachable authorized rooms/devices from supported APIs or approved imports; records capability manifest (`DISCOVER`, `READ`, `OBSERVE`, `CONTROL`, `VERIFY`, **`OPEN_EXACT`**, **`OPEN_FILTERED`**, **`OPEN_PORTAL`**, optionally `RETURN_LINK`).
3. Entity reconciliation produces candidate mappings with confidence and evidence; ambiguous or sensitive mappings require authorized manual confirmation.
4. Provider-specific resolver validates navigation behavior using approved documented URLs/configuration—not fabricated or guessed URL patterns. Link templates, if used, require explicit registration/versioning, secure encoding, negative tests and operational review. Do not derive target URLs by string-concatenating a guessed device ID into a generic vendor hostname.
5. Runtime resolver checks Empathia user/tenant/role/site entitlement, active connector state, reference freshness and allowed destination before offering a contextual link. Provider RBAC/SSO remains an independent final authorization gate.
6. Periodic health checks detect retired, renamed, unlicensed, moved, merged, deleted or permission-revoked provider objects, and downgrade UI launch modes when mapping truth is lost. Do not delete historical evidence or silently remap.

**Connected is not the same as user-signed-in.** Empathia may know that the tenant-level connector works while the individual user's browser has no Microsoft/Utelogy/XiO session or no vendor role. Display this explicitly and let the provider prompt for sign-in.

## 4. Native UX surface contracts
**Search Party:** each search hit exposes linked platform badges/actions for its exact canonical room/device/incident, sorted by current user preference, relevance and verified capability. In relationship exploration, highlight which provider owns the source observation; allow `Open at source` from provenance drawer. Preview the target identity and tenant before opening.

**ServiceHands:** tickets, failed commissioning tests, remote-assistance sessions and work orders expose `Open affected room/device at source`. If a ticket involves several affected devices, choose the intended specific device before launching. Retain issue context on the Empathia side; a provider link must not automatically mark a ticket resolved. Show provider-assigned external incident numbers when validated, and use Harmony for approved external actions, acknowledgements and ownership—not for passive navigation.

**Room Registry / Room Passport:** show all connected systems serving the room (e.g., Teams Rooms Pro room, Q-SYS Core, Crestron room group, Utelogy room), their mapped provider IDs, freshness and click-through. Offer `View room in [platform]` only if a room-level target exists; otherwise `View room's [device] in [platform]` with explicit type and target.

**Device Registry / Device Passport:** show a preferred vendor/manufacturer management destination plus other authorized associated management planes; use exact device references when verified. Keep provider source identity, hardware identity, room assignment and support owner independently visible. Device replacement must invalidate or re-review its predecessor's links.

**Commissioning / Assurance / APEX / FI:** allow contextual source launch from failed tests, drift findings, evidence, incidents, observed telemetry and analytics. The user should return to the same Empathia task, with state preserved in a local back navigation/session token that never contains secrets. A link is not a substitute for evidence capture or acceptance.

**Power BI:** use report/page/entity context where supported, but URL filters are convenience only, not security boundaries. Recheck RLS/OLS and report authorization; a filtered report does not prove real-time device state. **SharePoint:** use authorized file/folder links and source ACL validation, including revocation handling; never publish a private document merely because it is discoverable by a connector.

**Reverse navigation:** provide `Copy Empathia room/device link` and optional admin-approved registration of return links in vendor portals that permit it. This is optional and cannot be universal; do not overwrite vendor-side metadata without permissions and an explicit admin decision. XiO Cloud documents an outbound Device Quick Links feature; this does not establish an inbound XiO deep-link contract.

## 5. Secure resolver architecture and action contract
Use a **server-authorized launch resolution API** instead of trusting client-supplied raw external URLs. Candidate contract:

```http
GET /v1/entities/{canonicalEntityId}/external-actions?entityType=ROOM|DEVICE|INCIDENT
GET /v1/external-resources/{referenceId}/launch-preview
POST /v1/external-resources/{referenceId}/resolve-launch
```

Response should include safe user-facing fields only: provider display name, type, launch mode, target summary, canonical resource context, current state, last verification, access reason, and a time-limited server-issued launch capability or one-time navigation URL. The resolver must reject unauthorized tenant/site/provider access, unsafe schemes, off-allowlist domains, untrusted redirects, reflected token/secret injection, connector mismatch, expired references, and user-supplied arbitrary open redirect destinations. Do not include access/refresh tokens, credentials, session cookies or confidential room details in URL query strings, logs or analytics. HTTPS only for hosted vendor platforms; local/native-device schemes require separately approved allowlists and safety controls. CSP/referrer policy, SSRF protection, redirect limits and audit trace are mandatory design review topics.

Actual launch in a user's browser should follow approved external navigation UX (new tab when appropriate, descriptive warning if leaving site). A backend probe of a portal cannot prove the browser user's access; separately show `Empathia verified mapping` vs `Provider authorization required`.

**Harmony boundary:** simply opening a platform is non-mutating; Harmony does not need a remediation lease for read-only navigation. If the flow offers a remote command, restart, configuration change, incident acknowledgement, or other provider-side side effect, the action must pass through the existing Harmony authorization/ownership/idempotency/verification process, not a URL shortcut.

## 6. Authoritative provider research and documentation boundaries
Research snapshots checked 7 November 2026. These references support **existence, purpose and RBAC/other functionality**, not undocumented inbound resource-specific deep links.

| Platform | Supported by public authoritative references | Exact inbound room/device deep-link status | Empathia release behavior |
|---|---|---|---|
| Microsoft Teams Rooms Pro Management | Microsoft documents portal room/device health and RBAC; entry portal is documented. Regional/commercial/government cloud endpoints differ. | **Not independently verified** as a stable public inbound deep-link contract for arbitrary room/device. | Show exact target only following tenant + portal-version validation; otherwise open portal and expose mapped room/device ID for search. |
| Utelogy U-Manage | Utelogy documents management dashboard, inventory/analytics, and third-party integration through its open API. | **Not independently verified** for arbitrary room/device URL deep links. | Where an authenticated partner/test account validates direct link, enable exact mode; otherwise `Open U-Manage` with identity handoff instructions. |
| Crestron XiO Cloud | Crestron documents cloud device management and **Device Quick Links** that launch *outbound* URLs associated to a device. | Outbound quick links **do not prove inbound** resource-specific link behavior. | Exact inbound mode only after vendor/tenant validation; optionally configure an admin-approved *reverse* Empathia link through available vendor controls. |
| Power BI | Microsoft documents securely embedded reports, report URLs, and report-level URL filtering; source permissions/RLS still apply. | Supported for appropriate reports/filters, not every arbitrary native device or room. | Report mapping to canonical entities and security-enforced report context; telemetry freshness independent. |
| Q-SYS, Biamp, Shure, Cisco, ServiceNow, additional vendors | Vendor-specific portals and APIs vary by product, model, firmware, license, deployment and tenant. | **UNVERIFIED until each adapter is documented, certified and tested.** | Capability-specific cards and graceful portal/search/manual fallbacks. |

Primary URLs:
- Microsoft Teams Rooms Pro Management overview: https://learn.microsoft.com/en-us/microsoftteams/rooms/managed-meeting-rooms-portal
- Microsoft Rooms Pro RBAC and access: https://learn.microsoft.com/en-us/microsoftteams/rooms/enrolling-mtrp-managed-service
- Crestron XiO Cloud Manage Devices / Device Quick Links: https://docs.crestron.com/en-us/8214/Content/Topics/Manage-Devices.htm
- Crestron XiO Cloud connection/registration: https://docs.crestron.com/en-us/8555/Content/Topics/Configuration/Connect-to-XiO-Cloud.htm
- Utelogy vendor solution description: https://www.utelogy.com/wp-content/uploads/2025/03/Utelogy-About-Brochure-July-2024.pdf
- Power BI secure embedding: https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-embed-secure
- Power BI URL filter limitation/security: https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-url-filters

## 7. Definition of done and adversarial QA
**Must-pass functional checks:**
1. A real authorized linked room with a documented and independently tested external target opens the exact intended provider room without second search.
2. Equivalent verified device link resolves the correct external device across provider/tenant/region scope; same display name in another tenant is never substituted.
3. Search Party, ServiceHands, Room Registry and Device Registry show consistent source actions from the same backend resolver, not per-page hard-coded URLs.
4. A room with multiple provider connections shows distinct context-labeled links and users can select a specific target where ambiguous.
5. When the provider supports only a portal/home view, the button says `Open [platform]`, does not claim direct context preservation, and offers safely copyable provider/asset identifiers.
6. Provider login is required when no vendor user session exists; Empathia neither auto-signs in nor leaks connector credentials.
7. Insufficient provider authorization shows provider login/access denied honestly; Empathia role does not confer vendor access.
8. Connector revocation, object deletion, reassignment, rename, stale mapping, bad ID, expired license, 404 and outage produce guided recovery; no green success on a blank/incorrect target.
9. Tenant A user cannot see, enumerate, request or open Tenant B mapping/launch token, even with guessed reference ID.
10. A malicious/off-allowlist/scheme-injected vendor URL or redirected destination is blocked; safe URL encoding and no open redirect.
11. Sensitive device IDs are not forwarded to unrelated third-party domains, copied into analytics, or included in referral headers without policy.
12. Mobile phone and narrow tablet display one prominent contextual action, accessible overflow and functional fallback with keyboard/screen-reader support.
13. Switching providers does not silently change commissioning evidence, service status, Assurance baseline or Harmony action owner.
14. If a provider-side mutation is initiated from Empathia, Harmony ownership/approval/lease/idempotency gates are proven separately.
15. Failed link navigation returns the user to preserved Empathia task context; no lost drafts, filters or open work order.
16. A legacy-room mapping with only inferred or ambiguous provider identity cannot appear as a verified exact link.
17. Provider clouds (commercial, GCC, GCC-High, DoD, separate regions) are resolved by configured tenant/cloud metadata, never by a global hardcoded URL.
18. Two distinct resources with same serial-like/name fields are not silently merged; merges and replacements retain link audit history.
19. Optional vendor-platform reverse links are only written after explicit admin approval and are removable/reversible.
20. Demo environment uses deterministic synthetic provider identities and nonoperational example links; it must not navigate to real customer infrastructure or claim external sign-in success.

Proof package: actual provider/version tested; source contract link; expected vs actual URL+target identifier; authenticated user-role/test tenant; logs redacted; browser screenshots; mobile a11y capture; end-to-end and adversarial tests; known exceptions; capability status per adapter. Never infer `OPEN_EXACT` from an API that only exposes inventory.

## 8. Priority, ownership and rollout
**P0**: canonical ERR with tenant/role/provider scoping; validated resolver and safe URL policy; no cross-tenant leaks; no false exact-target claims; shared UI actions; no secrets or unauthorized actions.  
**P1**: Teams Rooms Pro, Utelogy U-Manage, Crestron XiO as initial provider adapters; use true exact object deep linking only if verified, otherwise honest portal+search fallback; contextual access throughout four mandated views.  
**P1**: Power BI and SharePoint contextual source actions; Search Party result navigation; ServiceHands return context.  
**P2**: additional vendor destinations, administrative mappings UI, target health/coverage analytics, optional reverse links, device-fleet bulk launch and deep mobile native-client handoffs.

Owner roles: Platform Architect (contracts), Integration Lead (adapter link verification), Security/IAM Lead (tenant/RBAC/URL policy), Product UX (common component), QA Lead (cross-vendor matrix), AV/UC SME (physical identity mapping), Customer Admin (connection approvals). This is a product requirement and handoff directive **only**; no live connector, external login or vendor resource link has been implemented or tested by this addendum.
