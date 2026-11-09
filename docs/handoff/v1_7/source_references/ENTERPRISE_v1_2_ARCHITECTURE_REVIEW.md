# EMPATHIA TECHNOLOGIES
## Enterprise Edition — Master Product Specification, Architecture Review and Implementation Handoff

**Version:** 1.0 | **Prepared:** 7 November 2026 | **Classification:** Founder/Engineering working specification | **Release status:** TARGET ARCHITECTURE; NOT a claim of deployed features, live customer integrations, third-party certification, or certified measurements.

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
