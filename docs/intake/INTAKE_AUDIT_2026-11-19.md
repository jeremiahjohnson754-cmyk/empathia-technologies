# Intake: what exists before the 19 Nov 2026 directive (phase 1 audit, first pass)

**Directive:** founder 19 Nov 2026 13:02, "The definitive Intake experience" (saved privately in `.local/directives/`). §01 asks for an
audit of what already exists before anything is built, and for a coverage matrix. This is the first pass, written from the code; it
is not yet checked in a browser. The matrix will be completed and kept up to date as the work proceeds.

## Two implementations, one purpose

| | Demonstration (`apps/demo`) | Enterprise API (`services/enterprise-api`) |
|---|---|---|
| Where | the investor demo, in the browser | the API behind staging (`staging/demo-api`), PostgreSQL |
| Data | synthetic, kept in the visitor's browser | tenant-scoped rows, migrations `0006_projects`, `0017_project_lifecycle`, `0018_request_catalogue_and_concept_authorization` |
| Request entry | `#/request` (intake.request): seven kinds of request (new room, change a room, more equipment, replace a device, event, check a device, make a room work better) | `POST /v1/requests`, `/v1/requests/:code/submit`, `/withdraw`; request types from `/v1/projects/catalogue`, admin `/v1/admin/request-types` |
| What a request becomes | a room request → a project on the decision desk (SUBMITTED); equipment, replacement, event → a ServiceHands job; "check a device" → Scouter; "make a room work better" → Space Optimizer | a governed project: route, brief, approver, decision, funding, scope, design revisions and their review, RFIs, delivery |
| Proposal shown before sending | the room drawn by the design engine (size from rooms of the same kind on record, MODELED), equipment from the engine's template, applicable tests | concept authorization (`/v1/projects/:code/concept`) |
| Following a request | "Your requests" on the same page, in plain words, from the project or job it became (`intake/store.ts` › standing) | `GET /v1/requests` (a requester sees their own; project roles see the tenant's within site scope) |
| Approvals | decision desk: APPROVED / HELD / REJECTED, funding separate, approvals tied to scope and pitch revisions (`decisions/store.ts`, `packages/project-governance`) | the same governance package server-side |
| Older addresses | `#/intake` (the decision desk, V2.5.3's Intake) and `#/intake/new` (opens the request portal) | — |
| Site champion | `champion/` (start page, site page, recognition) | — |

## First observations against the directive

- **Exists and works (demonstration):** a plain-words request with a picture of what is asked for; routing by kind; persistent request
  ids (REQ-0001…) in the browser; projects and jobs it becomes; status in the asker's words; decision desk with HOLD/REJECT reasons and
  revision-bound approvals; photo policy in the governance package (`photoPolicy`).
- **Missing or partial (demonstration):** the home in the directive's words with four cards and "Not sure?"; a five-step wizard with
  drafts that survive a refresh; location search by QR/device id with duplicate detection; provisional rooms as their own entity;
  a guided photo checklist and attachments; a request workspace with role-aware sections; a triage queue; a site champion dashboard
  tied to requests; REQUEST CHANGES as a decision; reciprocal links from Search Party, Lite, Pro back to the request; versioned
  `intake.*` events in the demonstration; notifications.
- **To reconcile:** the demonstration and the API model requests differently (kinds vs request types). The directive asks to converge
  on one canonical workflow; the API's catalogue is the candidate. Not decided yet.

Next: complete the matrix item by item (§02–§19), then phase 2.
