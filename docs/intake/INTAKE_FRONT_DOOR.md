# Intake: the front door and the first professional steps (19 Nov 2026)

**Directive:** founder 19 Nov 2026 13:02, "The definitive Intake experience" (phases 1–7), and 13:28, the website's Intake tile and page.
The audit and coverage matrix that came first: `INTAKE_AUDIT_2026-11-19.md`. Where this lives: `apps/demo/src/intake/`.

## What a person sees

| Address | Page | Who |
|---|---|---|
| `#/request` | **Home.** "What can we help you create, improve, or fix?", one place to describe the need, four choices (Create a space, Improve a space, Add or change equipment, Get help) and "Not sure?"; the person's drafts, what waits for them, their recent requests | the roles the portal admits (Employee, Site Champion, Executive, Business PM, AV Operations Lead, Service Manager, Systems Engineer, Designer, Platform Architect) |
| `#/request/new`, `#/request/<kind>` | **The steps**: what you need, where, what it should do, show us the space, review and send. A kind skips what it does not need | same |
| `#/request?room=…` | **One screen** from a room or a device (Lite, a room page, Search Party): the room is known, so the person says what they need and sends it | same |
| `#/requests` | **My requests**: drafts (carry on, discard after an in-page confirmation) and sent requests | same |
| `#/requests/<id>` | **One request**: what is happening, who acts next, what is needed, what happens next; space, files, the proposed room, the question and answer, routing, history | same |
| `#/request/spaces`, `#/request/help` | My spaces; how requests work | same |
| `#/request/queue` | **Requests to triage**: route, ask, close; locations to confirm | AV Operations Lead, Systems Engineer, Service Manager, Platform Architect; the Site Champion sees locations only |

## Rules the code keeps

- **Reading a description is not AI.** `classify.ts` matches word lists, says which words it went by ("Matched by word lists, not by AI"), and
  nothing starts until the person presses Start. A description that matches nothing is taken as a request in the person's own words.
- **A request is a record from its first step.** It gets its id (REQ-0001…) as a DRAFT, is saved as it changes (shortly after the last
  keystroke) and survives a refresh or a closed tab; it is sent with the same id; sending twice sends once.
- **No room record is made up.** A room on record is chosen by search (name, number, QR address, device code), recent rooms or the lists. A
  new room becomes a **provisional space** (PRV-…, AWAITING_REVIEW): requested, not built, not operational, its location "documented"
  until a Site Champion or an engineer confirms it on site (never the person who asked).
- **Nothing is measured from a photograph.** Files are fingerprinted (SHA-256) with a small preview in the browser; the original stays on
  the person's device. A size the person gives is used and labelled as theirs, "not surveyed".
- **Photo policy names keep the platform's meaning.** LOCATION_VERIFICATION_REQUIRED (the governance package and the API) means a
  photograph is needed to submit; the demonstration asks that of nobody. A new space is DOCUMENTATION_REQUIRED: needed before design, not to
  send.
- **Nobody is assigned and nothing is promised by sending.** "Who acts next" is a team or a role, never a name; no date is given.
- **Duplicates are shown, never blocking.** Requests from this browser, the decision desk's projects and open ServiceHands jobs for the
  same room are listed in the Where step.
- **A downstream refusal never loses the request.** If ServiceHands refuses the job, the draft stays a draft with its answers.
- **Routing keeps the person's words.** The operations lead routes a request in the person's own words to the decision desk or to
  ServiceHands with a note the person reads; the words stay as written.

## Events

The repository's convention (as the API's outbox names them), each `{ v: 1, at, type, by, detail, correlation: <request id> }`:
`request.drafted`, `request.updated` (an explicit save), `document.added`, `room.provisional_created`, `request.submitted`,
`request.clarification_requested`, `request.clarification_answered`, `request.triaged`, `request.closed`, `location.verified`.

## The proposed room

The review step, the received page and the request's page draw the proposed room with Empathia Lite's own 3D room view (`lite/Scene.tsx`)
and Lite's coverage model, in Lite's PROPOSED state: not designed, not approved, not built. Positions the request adds are marked as
added, a device to replace as needing attention.

## Not built yet

REQUEST CHANGES as a decision (it needs a governance transition and the API's decision column; see the audit), configurable photo policy
per tenant, notifications beyond the in-app history, Teams/Outlook/SharePoint (not connected: said so), the AI assistant, request
templates for relocation, retirement and new buildings beyond "Something else", engineering review on the request itself, deterministic
example requests for the Living Campus, the flows after approval (project, commissioning, assurance) as one connected journey.
