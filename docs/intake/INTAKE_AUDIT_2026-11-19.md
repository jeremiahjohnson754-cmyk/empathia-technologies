# Intake: what exists before the 19 Nov 2026 directive (phase 1 audit and coverage matrix)

**Directive:** founder 19 Nov 2026 13:02, "The definitive Intake experience" (saved privately in `.local/directives/`). §01 asks for an
audit of what already exists before anything is built, and for a coverage matrix "identifying existing, incomplete, missing, simulated,
and verified behaviors". This document is that audit. It was written from the code on 19 Nov 2026 and has not yet been checked in a
browser against the directive; the browser suites named below are the evidence for what they cover.

**How to read the status column**
- **Tested**: built, and an automated test in the repository exercises it (the test is named). Not a claim that the test passed today:
  the release regression is the evidence for that.
- **Exists**: built, no test aimed at this behaviour.
- **Partial**: some of the requirement is built; the gap is said.
- **Simulated**: works in the demonstration's synthetic, in-browser data only.
- **Missing**: not built.
- **Connector**: needs an external system (Microsoft 365, SharePoint, Teams, a directory, a CAD service) that is not connected here.
  Built only as a truthful "not connected" state, never as a pretend integration.

## Two implementations, one purpose

| | Demonstration (`apps/demo`) | Enterprise API (`services/enterprise-api`) |
|---|---|---|
| Where | the investor demo, in the browser | the API behind staging (`staging/demo-api`), PostgreSQL |
| Data | synthetic, kept in the visitor's browser | tenant-scoped rows, migrations `0006_projects`, `0017_project_lifecycle`, `0018_request_catalogue_and_concept_authorization` |
| Request entry | `#/request` (intake.request): seven kinds of request (new room, change a room, more equipment, replace a device, event, check a device, make a room work better) | `POST /v1/requests` (DRAFT), `/v1/requests/:code/submit`, `/withdraw`; request types from `/v1/projects/catalogue`, admin `/v1/admin/request-types` |
| What a request becomes | a room request → a project on the decision desk (SUBMITTED); equipment, replacement, event → a ServiceHands job; "check a device" → Scouter; "make a room work better" → Space Optimizer | a governed project: route, brief, approver, decision, funding, scope, design revisions and their review, RFIs, delivery |
| Proposal shown before sending | the room drawn by the design engine (size from rooms of the same kind on record, MODELED), equipment from the engine's template, applicable tests | concept authorization (`/v1/projects/:code/concept`) |
| Following a request | "Your requests" on the same page, in plain words, from the project or job it became (`intake/store.ts` › standing) | `GET /v1/requests` (a requester sees their own; project roles see the tenant's within site scope) |
| Approvals | decision desk: APPROVED / HELD / REJECTED, funding separate, approvals tied to scope and pitch revisions (`decisions/store.ts`, `packages/project-governance`) | the same governance package server-side |
| Events | `request.submitted` on the decision desk's event list (demo) | outbox: `request.submitted`, `request.cancelled`, `vendor.request_acknowledged`, `project.pitch_deck_submitted`, `project.approval_requested`, `project.approval_decided`, `project.funding_authorized`, `project.funding_withdrawn`, `project.approval_reopened` |
| Older addresses | `#/intake` (the decision desk, V2.5.3's Intake) and `#/intake/new` (opens the request portal) | — |
| Site champion | `champion/` (start page, site page, recognition) | — |

**Event naming.** The directive suggests `intake.request.*` names and says to "adapt naming to the existing repository conventions rather
than introducing incompatible parallel taxonomies". The repository's convention is `request.*` and `project.*` (API outbox, demo desk);
new events follow it (`request.drafted`, `request.clarification_requested`, `room.provisional_created`, …), not a second taxonomy.

**The two request models.** The demonstration's seven kinds and the API's nine request types describe the same requests differently
(kinds are what a person asks for; types are what engineering does). The directive asks to converge on one canonical workflow. Proposal,
not yet decided: the person-facing choice stays plain (four cards and "Not sure?"), and each choice maps to one of the API catalogue's
request types, which become the canonical key in both. Recorded here as an open decision.

## Coverage matrix

### §02 Philosophy

| Requirement | Demo | API | Status | Gap |
|---|---|---|---|---|
| One front door for all thirteen example phrasings | seven kinds; no "new office", "relocate", "retire", "assess a space", "I'm not sure" | nine types; no relocation, retirement, assessment, event | Partial | relocation, retirement, assessment, new building, general "not sure" have no route |
| Natural-language start, no engineering workflow choice | a free-text "what do you need" field, after choosing a kind | `intent` text | Partial | the kind is chosen first; the words do not route |
| Employee layer and professional layer on the same record | request → desk project or ServiceHands job, linked by id | request → project, linked by `project_id` | Exists | the professional side does not open the request itself |
| No re-entering room information | room facts read from the record ("Already on record, so you are not asked") | `room_id` | Tested (RQ-11, demo-request) | |
| Advanced fields only when relevant | extras folded for a new room | — | Tested (RQ-03) | |

### §03 Home

| Requirement | Status | Gap |
|---|---|---|
| Hero "What can we help you create, improve, or fix?" and its supporting line | Missing | the page opens on "Ask for a room or equipment" and the kind grid |
| "Describe what you need…" as the primary interaction, working without AI | Missing | |
| Four cards (Create a Space, Improve a Space, Add or Change Equipment, Get Help) and "Not sure?" | Missing | seven kind tiles instead |
| Personalized welcome: identity, site, recent rooms, drafts, awaiting action, completed | Partial | "Asking as the …" role tag and "Your requests"; no drafts list, no site, no recent rooms |
| Truthful fallback without a directory | Exists | the demo says "Synthetic data" and the role; it never invents a name |
| Employee navigation Home / New Request / My Requests / My Spaces / Help | Missing | one long page |
| Professional navigation (Intake Queue, Reviews, Projects, Design, Field Work, Approvals, Reports) | Partial | the shell's role navigation reaches the desk, projects, ServiceHands; no Intake queue |
| Search Party, notifications, tenant, identity, role controls stay available | Exists | the shell provides them on every page |

### §04 Wizard

| Step | Requirement | Status | Gap |
|---|---|---|---|
| 1 | Conversational entry, goal chips (eleven goals), visual examples | Partial | uses for a new room only (six); no goals for upgrades |
| 1 | AI classification shown as editable, never silently approved | Missing | no classifier; a rules-based one (no AI) is the honest first step |
| 2 | Organization → Region → Campus → Building → Floor → Room | Partial | building + floor + room selects; no search |
| 2 | Search by name, number, floor, QR, device id, recent rooms | Missing | Search Party has room and device search; the portal does not use it |
| 2 | Duplicate detection against open requests | Missing | |
| 2 | Reuse the canonical room id when it exists | Tested (RQ-11, RQ-24) | |
| 2 | Provisional room when it does not exist; review required | Missing (demo) / Partial (API `provisional_room` text) | no entity, no review |
| 2 | Lite building/floor preview with a text alternative | Missing | |
| 3 | Questions per request type (space, device, service) | Partial | space: use, people, extras, when, urgency; device: room, position; service: none (problems go through ServiceHands "Report a problem") |
| 3 | Technical fields only in professional sections | Exists | none are asked |
| 4 | Photos, files, plans, dimensions, annotations | Missing (demo) / Partial (API references with provenance) | the demo takes no files |
| 4 | Photo policy LOCATION_VERIFICATION_REQUIRED / DOCUMENTATION_REQUIRED / OPTIONAL_REFERENCE, explained | Partial | governance package enforces LOCATION_VERIFICATION_REQUIRED; API uses NOT_REQUIRED where the directive says OPTIONAL_REFERENCE |
| 4 | Guided photo checklist for the request type | Missing | |
| 4 | Documented location vs verified location | Partial | champion `verifyRoom` verifies a room; photos are not linked |
| 4 | Never invent dimensions from a photo | Exists | the demo models size from rooms on record and labels it MODELED; no photo is read |
| 5 | Review sections (request, location, result, attachments, timing, next steps), edit any section | Partial | a live summary beside the form; no step review |
| 5 | Save draft, submit, copy summary, share | Partial | one draft in session storage, lost when the tab closes; no copy, no share |
| 5 | "Your request has been received", real id, status, next action, tracking link | Partial | "Sent: REQ-0001" and where it went; no tracking page |

### §05 Purpose-built flows

| Flow | Status | Gap |
|---|---|---|
| A New room | Partial | request → desk project with proposal; no provisional room, photos, technical review step |
| B Existing room upgrade | Partial | "change a room" → desk project; no standards check or compatibility |
| C New device onboarding | Partial | "more equipment" → ServiceHands job; no catalogue match, no provisional device |
| D Device replacement | Partial | "replace a device" picks the position, lists the tests to rerun; no Scouter step, no successor asset |
| E Relocation or removal | Missing | |
| F New building or campus | Missing | |
| G Incident or maintenance | Exists elsewhere | ServiceHands "Report a problem" (`servicehands.request`); not reached from the Intake front door |
| H Technology evaluation | Exists | hands off to Scouter for the category |
| I Event | Partial | setup job with a date; "a second job to put the room back" is promised in the text but only one job is raised |
| J General request ("not sure") | Missing | |
| K People, vendor, access onboarding | Missing | never grants access by request (the shell's rule) |

### §06 Roles

| Role | Status | Gap |
|---|---|---|
| Employee / requestor | Partial | creates and follows; no drafts list, clarifications, satisfaction, documents |
| Site champion | Partial | start page, site page, verify room, confirm access and occupancy, notes; not tied to requests |
| AV Operations Lead | Partial | decision desk decide; no Intake queue, ownership, duplicates, priority |
| Systems Engineer | Partial | brief authorship on the desk; no requirements review on the request |
| Project Manager | Partial | projects and budget pages exist; no project created from a request with milestones |
| Designer / Product Architect | Partial | Room Builder, Space Optimizer, Lite exist; no entry from a request |
| Service Manager / Technician | Exists | ServiceHands jobs from requests |
| Procurement / Finance | Partial | funding separate from approval (governance); no BOM or quote from a request |
| Executive | Exists elsewhere | executive views; not tied to Intake demand |
| Vendors | Partial | API vendor acknowledgement; demo has none |

### §07 Workspace after submission

| Requirement | Status | Gap |
|---|---|---|
| One request page with Overview, Discussion, Space & Assets, Documents, Design, Work, Approvals, History | Missing | a request is a list item; its project or job has its own page |
| Role-aware sections | Missing | |
| What is happening / who owns the next action / what is needed / what happens next | Partial | "standing" says what is happening in plain words; no owner or next action |

### §08 Approvals

| Requirement | Status | Gap |
|---|---|---|
| APPROVE / HOLD / REJECT with reasons | Tested (demo-decisions; API project-lifecycle security test) | |
| REQUEST CHANGES | Missing | |
| Funding separate from approval | Tested | |
| Approvals bound to scope and pitch revisions; a revision reopens approval | Tested (API `project.approval_reopened`) | |
| Delegation, expiry | Exists (API delegations) | not in the demo |
| Policy by type, site, scope, risk, value (no capital process for a trivial fix) | Partial | kinds route to desk or ServiceHands; no configurable policy |

### §09 Connections (Intake → product)

| Product | Status | Gap |
|---|---|---|
| Core (persistent ids, relations) | Partial | REQ ids persist per browser (demo), per tenant (API) |
| Search Party | Partial | Search Party room → ServiceHands intake (18 Nov); not → request portal; requests are not searchable |
| Lite | Partial | the proposal is drawn with the shared spatial views; Lite does not receive the request |
| Room Builder / Optimizer | Partial | "make a room work better" hands off to the optimizer |
| Scouter | Exists | evaluation hand-off |
| Procurement / budget / project | Partial | desk project; no BOM or SOW |
| ServiceHands | Tested (RQ-13, RQ-14) | jobs raised and followed |
| Commissioning | Partial | the tests a request adds are computed and shown; not handed to commissioning |
| Assurance / APEX | Missing | |
| Field Intelligence | Missing | (and never triggered from an ordinary request, by rule) |
| Pro | Partial | a room page offers “Ask for a change” (RQ-24); the room's page does not list the requests made against it |
| Learn / SIGNAL | Missing | |
| SharePoint, Teams, Outlook | Connector | not connected; must be shown as not connected |

### §10 Events

| Requirement | Status | Gap |
|---|---|---|
| Versioned contracts with tenant, entity, actor, time, correlation, idempotency | Exists (API outbox) | demo events carry type, actor, time only |
| request.submitted / request.cancelled | Exists (API) / Partial (demo submitted only) | |
| Drafted, updated, clarification, triaged, scope changed, provisional room/device, document added, location verified | Missing | |
| A failed downstream step never loses the request | Partial | demo: the request is saved only after the job or project is created; a refused ServiceHands job refuses the whole request |

### §11 AI assistant

| Requirement | Status | Gap |
|---|---|---|
| Optional assistant with editable conclusions; never invents, approves or grants | Missing | a deterministic, rules-based classifier is the first step; it is labelled as such and never called AI |

### §12 Notifications

| Requirement | Status | Gap |
|---|---|---|
| Activity feed per request | Missing | |
| Teams / Outlook | Connector | |
| No duplicate alerts; preferences | Missing | |

### §13–§16 Visuals, performance, records, security

| Requirement | Status | Gap |
|---|---|---|
| First-class Empathia look | Partial | the portal uses the design system; no home |
| Performance (2D first, 3D later) | Exists | 3D is a toggle |
| Records: provenance of photos and dimensions | Exists (API) / Missing (demo) | |
| Role checks on every route; no cross-tenant data | Tested (access suites; API RLS) | |

### §17 Journeys and §18 scenarios

None of the five journeys or twenty scenarios is built or tested end to end as written. The pieces that exist are listed above.

## Built since this audit (19 Nov 2026, evening)

What changed against the matrix above; `INTAKE_FRONT_DOOR.md` describes it. Unit evidence: `tests/unit/demo-intake.test.mjs` (IN-01 to
IN-22). Browser evidence: `tests/browser/demo-request.test.mjs` RQ-01 to RQ-49 (the result is recorded below once run).

| Section | Now |
|---|---|
| §03 Home | the directive's hero and line, describe box (word lists, labelled not AI), four cards and "Not sure?", drafts, waiting, recent; Intake navigation (Home, New request, My requests, My spaces, Help) and the professional work links |
| §04 Steps | five steps skipped by kind; drafts as records (REQ id, saved as they change, survive refresh); room search by name, number, QR address, device code; recent rooms; open work for the room shown; provisional spaces; a building not on record; photo checklist by kind, fingerprints and previews, nothing measured from a photo; a size the person gives, labelled as theirs; review with change links, save for later, copy the summary; "Your request has been received" with id, status, owner and next step |
| §05 J, G | "Something else" in the person's own words, routed by the operations lead; "Something is not working" opens ServiceHands' report |
| §06 | operations lead: triage queue (route with a note, ask a question, close a duplicate); Site Champion: locations to confirm, requests at the site; requester: answers questions |
| §07 | one page per request: what is happening, who acts next, what is needed, what happens next; space, files, the proposed room, question and answer, routing, history; access for the requester, the people who work on it and the site's champion |
| §09 | Search Party room → "Ask for work in this room"; a room's History lists its requests; the proposed room in Lite's 3D room view |
| §10 | request.drafted, request.updated, document.added, room.provisional_created, request.submitted, request.clarification_requested, request.clarification_answered, request.triaged, request.closed, location.verified, request.example_marked |
| §20 D | five Living Campus examples (enterprise, university, stadium, convention), added on request, marked |

Still open: REQUEST CHANGES (§08; needs a governance transition and the API's `project_decision` CHECK, so a migration), tenant-configurable
photo policy, notifications, the AI assistant, relocation/retirement/new-building templates, engineering review on the request, the
journeys after approval.

## Phase 2 plan (the front door), in the demonstration

Order of work, each step tested before the next:

1. **Requests as records.** A request is a stored record from its first answer: DRAFT, then SUBMITTED, with its own id, history and
   links (desk project or ServiceHands job). Several drafts survive a refresh and a closed tab. Events in the repository's convention.
2. **Home.** The directive's hero and supporting line; "Describe what you need…" classified by rules (labelled, editable, never AI);
   four cards and "Not sure?"; drafts, awaiting action and recent requests; employee navigation (Home, New request, My requests,
   My spaces, Help) inside the existing shell.
3. **Wizard.** Five steps (what, where, what it should do, show us the space, review), skipping what a request does not need. Location
   search by name, number, QR code or device id, recent rooms, duplicate warning against open requests; a provisional room when the
   room is not on record, marked for review. Photo checklist by request type; photos kept as references in this browser, never read
   for dimensions. Review with edit-any-section, save draft, copy summary, submit.
4. **Received.** "Your request has been received", the id, status, next action, and a tracking page `#/request/REQ-…`.
5. **The proposed room at the end** (founder 13:28): a new-room request ends on the proposed room drawn as Lite draws rooms.

Phases 3 to 7 follow the directive's order.
