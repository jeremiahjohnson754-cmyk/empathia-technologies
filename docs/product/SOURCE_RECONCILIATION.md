# The founder's source workbooks against the server's records

Founder, 17 Nov 2026, 15:29: "I'd also make sure Claude reconciles your original commissioning workbooks, Operational Issue
Intelligence workbook and Search Party Power Apps data model. Its report specifically acknowledges that some of those sources
haven't been reconciled yet."

Done on 18 Nov 2026 against the schema at migration 0038. **Structure only**: sheet names, column headers and the lists of allowed
values were read (with a script that prints nothing below a header row, and never reads a column that can hold an organisation, a
person or a place). No cell of the workbooks' data is in this repository, and none was read for this document. Where a header
itself contains an organisation's name it is written here as "the organisation".

Four sources:

| | Source | What it is |
|---|---|---|
| A | AV Commissioning Framework v1.3 | per-room validation sheets (audio, video, network, control), a documentation tracker, a deficiency log |
| B | AV Commissioning Asset Vault v1.3 | A plus the estate: rooms, an IP table, intelligibility exceptions, room completion, a sign-off packet, firmware baseline, a vendor scorecard |
| C | AV Operational Issue Intelligence Framework v1.3 | room and device registers, an operational issue log, a commissioning-issue log, system health, a dashboard |
| D | Search Party Infrastructure Engineering OS 1.5.1, Power Apps data model v2 | organisations, contacts, vendors, sites, rooms, devices, assets, projects, standards, relationships, support paths, evidence links, operational records, a governance queue, data quality |

Each row below says where the server holds the same thing, and whether it does: **held**, **partly**, or **not held**.

## A · Commissioning Framework

| Workbook | The server | |
|---|---|---|
| AUDIO validation: noise floor (dBA), target SPL, intelligibility score, RTA captured | `app.measurement` with a metric, unit, method, instrument, calibration and provenance; since 0037 a measurement names its test and is judged against `app.acceptance_criterion`. Metrics defined: reverberation, intelligibility, noise floor, coverage spread, limiter level | **held** for the values; a target SPL as a criterion metric is **not** defined |
| AUDIO: AEC verified, pink noise tested, gain structure verified; VIDEO: framing, tracking, presets, exposure, content share; NETWORK: VLAN, QoS, multicast, online, signed in, firmware baseline; CONTROL: UI, switching, audio and camera control, macros, scheduling, UPS, lighting | the commissioning plan's tests (94 in the library, compiled per room into `app.cx_plan_row`), each recorded as `app.test_result` with its evidence and verified by someone else (`app.verification`) | **held**, and stricter: the workbook's Yes/No becomes a result with evidence and a second person |
| "Pass/Fail" per discipline, typed | derived from the results; never typed | **held** (derived) |
| "Intelligibility Exception Logged?" | see B, intelligibility exceptions | **not held** |
| Evidence links (a URL per item) | `app.evidence_object`: the file itself, addressed by its SHA-256, with retention | **held**; a link to a file kept elsewhere is **not** a record the server has |
| DOCUMENTATION tracker: fifteen items per room (as-builts, rack elevation, IP schema, DSP file, control code, firmware list, a photo set and three named photographs, DSP, camera and UC screenshots, the commissioning report, the final sign-off PDF), a documentation percentage and a list of what is missing | five handover tests (training, support path, spares, warranty and licence register, runbook); generated drawings with approval; the device register (hostname, address, MAC, firmware) | **partly**: the register and drawings are held; a per-room documentation checklist with one evidence file per named document is **not** |
| DEFICIENCY_LOG: category, severity, root cause, assigned to, opened, target date, status, closed, evidence, validation type, user impact, repeat issue, standard issue type, days open | `app.room_issue` with its workflow (owner role, target date, root cause, corrective action, retest, verification, exception, deferral), `app.issue_event`, and the work order raised on it | **held**, except: **user impact** is not a field; **repeat issue** exists only as a work order's recurrence, not on the deficiency; category is two values (design, installation and commissioning) against the workbook's nineteen |
| Severity: Low, Medium, High, Critical | the same four | **held** |
| Root cause: twelve values | eight: DESIGN, INSTALLATION, CONFIGURATION, EQUIPMENT_FAULT, FIRMWARE, INFRASTRUCTURE, ACOUSTICS, OTHER | **partly**: the workbook's Programming Bug, Network Misconfiguration, Documentation Missing, User Error, Integration Conflict and Unknown (temporary) have no value of their own |
| Row completion percentages, a dashboard | `app.room_read_model`, the thread, analytics | **held** (derived) |

## B · Asset Vault (what it adds to A)

| Workbook | The server | |
|---|---|---|
| ROOMS: region, zone, country, location, plant or office, room type, capacity, integrator, commissioning status, last verified | `app.site`, `app.building`, `app.room` (template, occupancy, lifecycle), the room's classification | **partly**: region, zone and country are **not** fields of a site; the integrator of a room is **not** a record (a project has a vendor) |
| IP_TABLE: device type and model, firmware, IP, MAC, serial, VLAN, static or DHCP, subnet, gateway, DNS, switch name and port, PoE budget, QoS, multicast | `app.physical_asset` (model, serial), `app.asset_register_entry` (hostname, IP, MAC, firmware, location, versioned), field hook-ups (port, other end, cable) | **partly**: VLAN, addressing mode, subnet, gateway, DNS, switch port as a network fact, PoE budget are **not held** |
| INTELLIGIBILITY_EXCEPTIONS: measured value, why it is poor, root cause, mitigation, evidence, date, logged by | a deficiency may be excepted (`exception_ref`, requester and approver, never for safety or security); a baseline exception has a kind, rationale, decision and expiry. Neither names a measured value, a mitigation, or the positions it covers | **not held** as the workbook means it. V3.9's "Pass with Exception" is the same gap (task 199) |
| ROOM_COMPLETION, SIGNOFF_PACKET: documentation %, passes per discipline, open high deficiencies, ready for sign-off, vendor sign date, internal sign date | the acceptance gate (every applicable test passed and verified, no open deficiency), the lifecycle transition to ACCEPTED by someone holding the authority (lent with a record when the verifier would otherwise accept), the baseline | **partly**: acceptance is held and enforced; **two dated signatures (vendor and internal)** are not, and there is no documentation percentage because there is no documentation checklist |
| RAW data, FIRMWARE_BASELINE: baseline firmware per model, compliance, warranty start and end, care-contract dates | firmware is in the register; a result can reopen on a change of unit | **not held**: a firmware baseline per model, warranty dates and support-contract dates |
| Signage and booking-panel inventories, licence counts and expiry | a device category exists; licences are a handover test | **not held** as licence records |
| VENDOR_SCORECARD: rooms assigned and complete, average documentation, open high deficiencies, devices missing addresses per integrator | none | **not held** (and vendor names are not to be in the public repository) |

## C · Operational Issue Intelligence

| Workbook | The server | |
|---|---|---|
| Room register, device register | rooms and their devices; physical assets with identity, installation history and register | **held** (see B for the network fields) |
| Issue log: one row per issue with entry type (operational incident, engineering observation), issue type (eighteen), category (twelve), severity, root cause category and notes, detected during (commissioning, production, support round, maintenance, user report), assigned team and person, opened, SLA target, status, closed, time to resolve, resolution type (nine) and notes, evidence, recurring, escalated | a commissioning or design deficiency is `app.room_issue`; the work to fix it is `app.work_order` (severity with its service level, triage, assignment, evidence, verification, recurrence, reopen count); a diagnosis is `app.apex_case` | **partly**. **Not held: an operational incident that is not a deficiency of a design or of commissioning.** A room in service that loses audio has no record to open here except through a deficiency. Also not held: issue type, detected-during, resolution type, an escalation flag |
| Status: Open, In Progress, Blocked, Closed, Deferred, Cancelled | deficiency workflow: open, in progress, pending retest, closed, accepted exception, deferred; work order: ten states including cancelled | **partly**: there is no Blocked |
| Commissioning issues: the same columns for issues found in commissioning | `app.room_issue` opened by a failed result, with the measurement it failed on since 0037 | **held** |
| System health per room: open, in progress, blocked, resolved, critical open, last issue, a health status | `app.room_read_model` (open issues, open high, results, live health), Assurance | **held** for deficiencies; operational incidents are not counted because they are not held |
| Dashboard: totals, recurring, average days to resolve | analytics over issues and work orders | **partly**: no time-to-resolve for incidents, for the same reason |

## D · Search Party data model

| Table | The server | |
|---|---|---|
| Organizations, Vendors | `staff_profile.org_name` and a vendor on a project and a request | **not held** as records: no organisation or vendor table, no vendor contacts, coverage, contract or risk fields |
| Contacts (role, channel, escalation level, backup contact, site champion, validation status, source confidence, access level) | `app.person`, `app.membership` (role, site scope), `app.staff_profile` (skills, sites, leave, capacity), `app.competency_record` (verified by someone else) | **partly**: people who act in the system are held with what they may do and what they are verified to know. **A directory of contacts who do not sign in** (a site's facilities contact, a vendor's account manager), preferred channel, escalation level and a named backup are **not** |
| Sites (city, country, region, zone, type, champion, key and backup contacts, links) | `app.site`, `app.building` | **partly**: no address, region or zone, no site contacts |
| Rooms (profile, use, UC and control mode, counts, flags, readiness, health) | `app.room` with template, classification, lifecycle; counts and health derived | **held**; UC mode and control mode are properties of the design, not fields |
| Devices and Assets (category, type, model, serial, asset tag, hostname, addresses, firmware and approved firmware, install status, role, lifecycle, warranty, mounting, rack position, switch port, PoE) | the position (`app.planned_asset`), the unit (`app.physical_asset`), the installation of a unit in a position, the register, how it is mounted (`app.field_mounting`), what it is hooked up to | **held**, and split more finely (a position is not a unit). **Not held**: approved firmware, warranty, PoE, replacement priority and forecast year |
| Projects | `app.project` with its request, brief, reviews, decisions, funding, RFIs | **held** |
| Standards (name, phase, domain, expected condition, applies to, required, validation method) | the test library and its packs; the rule version on each compiled plan | **held** as tests; an organisation's own standards document as a record is `app.knowledge_document` |
| EntityRelationships (type, from, to, role, confidence) | `app.relationship` with provenance, and Search Party's graph, path and intent queries over it | **held** |
| SupportPaths (domain, site, primary and backup owner, vendor, escalation contact, queue, channel, hours) | the handover test "support path and owners confirmed"; a project's support owner | **not held** as a record: who to call for which domain at which site, with a backup, is the centre of this workbook and exists on the server only as a test that it was confirmed |
| EvidenceLinks (type, URL, project, vendor, site, sensitivity, validation) | `app.evidence_object` with classification and retention; relations to what cites it | **held** for files; not for links |
| OperationalRecords (expected and actual result, status, severity, tester, deficiency) | results, measurements, deficiencies | **held** |
| GovernanceQueue (a proposed change to a record: current value, proposed value, reason, confidence, steward, status) | proposals exist where a rule needs one: a field move, a classification, a drawing approval, a competency, an exception, each decided by someone else | **partly**: there is no general queue of proposed corrections to any record |
| DataQuality (table, record, field, issue, severity, recommendation, steward) | the device register reports what each unit is missing; the room's analysis raises design issues | **partly**: no data-quality issue as a record with a steward |
| SourceManifest, DataDictionary, Lookups | migrations, the OpenAPI document and its generated schemas, the audit trail | **held** in the form a service has them |

## What this shows, in order of how much it matters

1. **Operational incidents are not a record.** The server knows a deficiency of a design and a deficiency of commissioning. The
   Operational Issue Intelligence workbook is mostly about neither: a room in service with a fault, found by a user, a support
   round or monitoring. Its issue type, detected-during, resolution type and time to resolve have nowhere to live. This is the
   largest gap between the founder's working tools and the server, and ServiceHands cannot be the service desk the workbook
   describes until it is closed.
2. **Support paths and a contact directory are not records.** Search Party on the server answers from people who sign in and from
   the relationship graph. The Power Apps model answers "who do I call for audio at this site, and who is their backup", including
   people who never sign in. That is what the name Search Party meant first.
3. **A documentation checklist per room is not a record.** The workbooks track fifteen named documents and photographs per room
   with a link each, a documentation percentage, and a sign-off packet with a vendor date and an internal date. The server has five
   handover tests, the register and the drawings. V3.9's Documentation and Submission gate is the same thing (task 199).
4. **An intelligibility exception, as the workbook has it, is not a record**: the measured value, why it is poor, the mitigation and
   who logged it. With 0037 the measured value and its limit are now held, so this is a small step from here; it is also V3.9's
   Pass with Exception.
5. **The network facts of a device stop at the address.** VLAN, addressing mode, gateway, switch and port, PoE.
6. **Lifecycle facts of a unit**: firmware baseline per model, warranty and support-contract dates, replacement forecast.
7. **Vocabulary**: user impact on a deficiency; the workbook's finer root causes; a Blocked status; region and zone on a site.

Nothing above is fixed by this document. Items 1 to 4 are the ones worth a decision from the founder on order: each is a migration,
its rules, its routes and its tests.
