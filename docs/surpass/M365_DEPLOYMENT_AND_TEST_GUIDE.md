# Microsoft 365 — deployment and testing guide for real validation

Founder, 11 November 2026 (02:25): "Finish the correct Microsoft Graph adapter architecture, Teams and Outlook deep-link actions,
availability and scheduling workflows, permission handling, and contract/integration tests using deterministic simulations and mocks.
Keep real Microsoft 365 tenant validation, actual event creation, live Teams interactions, and physical mobile QA clearly marked as
pending. Do not present these as verified production integrations. Create a precise deployment and testing guide explaining which
permissions, test accounts, configuration, and devices are required for real validation."

This is that guide, for the calendar adapter and the app jumps of the Connect slice (`apps/demo/src/connect/`; design in
[CONNECT.md](CONNECT.md)). It is ONE guide: an earlier version was written by the integrator before the code existed, and a second by
the Connect lane beside the code; on 11 November 2026 the two were joined here when the two Connect implementations were reconciled
into one on the branch `agent/connect-people-actions-2`. The code it describes now exists on that branch and is tested there against
a simulated calendar and a mock transport (`tests/unit/demo-connect.test.mjs`, `tests/browser/demo-connect.test.mjs`). It has not
been released, and nothing in this document has been run against a tenant.

> **NOT CONNECTED.** Nothing in this guide has been carried out. There is no Microsoft 365 tenant, no app registration, no test
> account and no device lab for this project. The demonstration runs on a simulated calendar; the Microsoft Graph adapter
> (`graph.ts`) is **mock-tested** only. This guide says what a person with a tenant needs to do to find out whether it works.

**How to read the sources.** Every Microsoft Graph call, permission and link format below was read on Microsoft's own page (or the
RFC) on 2026-11-11 and carries that page. Pages are read through a tool that fetches the page and answers questions about it, so each
quotation was asked for word for word; where two official pages disagree, both are given. Where a step rests on a page that was
**not read** that day, it says so, and the step is to follow that page rather than this guide.

## 1. Status, in the directive's words

| Capability | Specified | Implemented | Tested | Lab-verified | Customer-authorised | Released |
|---|---|---|---|---|---|---|
| Teams deep links (chat, call, scheduling form), `mailto:`, `tel:` (formats in §9) | yes | yes (`apps.ts`), built from the official formats | Tested in the repository: every token filled and percent-encoded; in a browser the link is built and pressed but never followed, so no app was opened | **PENDING** | no | no |
| Outlook on the web: compose | no official format found | **not offered** | — | **PENDING** | no | no |
| Availability and meeting-time proposal | yes | yes, over a simulated calendar | Tested (simulated adapter) | **PENDING** | no | no |
| Event creation with confirmation, re-check and idempotent retry | yes | yes, simulated: recorded in the browser's own storage | Tested (simulated adapter) | **PENDING** | no | no |
| Graph adapter (request building, response parsing, errors, throttling) | yes | yes, against a mock transport only | Mock-tested | **PENDING** | no | no |
| Shifts awareness | yes | yes: a simulated rota; the Graph Shifts request and response against the mock transport | Tested (simulated adapter); mock-tested | **PENDING** | no | no |
| SharePoint knowledge ingestion (selected folders, delta, rename, deletion, revocation) | yes | yes: the engine over a simulated library (`apps/demo/src/knowledge/ingest.ts`); a Microsoft Graph source for it against a mock transport only (`knowledge/graph.source.ts`), imported by no page | Tested (simulated library); the Graph source mock-tested (`tests/unit/demo-knowledge-graph.test.mjs`, 11 checks) | **PENDING** | no | no |
| Real tenant validation, actual event creation, live Teams interaction, physical mobile QA | — | — | — | **PENDING: needs everything in §3–§7** | — | — |

"Simulated" means a deterministic stand-in inside the demonstration. "Mock transport" (mock-tested) means the adapter's request is
built and checked against the request and response shapes printed in the documentation; no network call is made. Neither is a
validated integration, and no row above may be moved to the right of "Tested" until a person has run §7 on a tenant.

### What is being validated

| | In the repository | To validate for real |
|---|---|---|
| Calendar adapter | `graphAdapter(cfg)` in `graph.ts`: builds each request and reads each documented response | The same six operations against a real tenant: people lookup, schedule lookup, Shifts, suggestions, create with a transaction id, cancel |
| App jumps | `apps.ts`: Teams chat, Teams call, Teams scheduling form, mailto, tel | Each link followed on each device in §6, with and without the app installed |
| Booking flow | Propose → review → explicit confirm, re-check at confirm, idempotent | The same flow ending in one real event, one invitation per attendee, and none before the confirmation |

## 2. Microsoft Graph permissions — least privilege

Request only the permissions in the first table. Each is the **least-privileged** permission the call's page lists (one name is
taken from the permissions reference instead; the reason is below the tables).

| Permission | Kind | Why it is needed | Administrator's consent required (permissions reference) | The call's official page (read 2026-11-11) |
|---|---|---|---|---|
| User.ReadBasic.All | Delegated | Find a person by name | No | https://learn.microsoft.com/graph/api/user-list |
| User.Read.All | Application | Find a person by name | **Yes** | https://learn.microsoft.com/graph/api/user-list |
| Calendars.ReadBasic | Delegated | Free/busy and working hours of people and rooms | No | https://learn.microsoft.com/en-us/graph/api/calendar-getschedule |
| Calendars.ReadBasic.All | Application | Free/busy and working hours of people and rooms | **Yes** | https://learn.microsoft.com/en-us/graph/api/calendar-getschedule |
| Calendars.Read.Shared | Delegated | Meeting-time suggestions | No | https://learn.microsoft.com/graph/api/user-findmeetingtimes |
| Calendars.ReadWrite | Delegated | Create the event; Cancel the event | No | https://learn.microsoft.com/en-us/graph/api/user-post-events https://learn.microsoft.com/en-us/graph/api/event-cancel |
| Calendars.ReadWrite | Application | Create the event; Cancel the event | **Yes** | https://learn.microsoft.com/en-us/graph/api/user-post-events https://learn.microsoft.com/en-us/graph/api/event-cancel |
| Schedule.Read.All | Delegated | Shifts of a Teams team | **Yes** | https://learn.microsoft.com/en-us/graph/api/schedule-list-shifts |
| Schedule.Read.All | Application | Shifts of a Teams team | **Yes** | https://learn.microsoft.com/en-us/graph/api/schedule-list-shifts |

Per call:

| Id | What | Signed-in user (delegated) | Application | Least-privileged delegated permission | Least-privileged application permission | Success | Source (read 2026-11-11) | Page's own date |
|---|---|---|---|---|---|---|---|---|
| `people` | Find a person by name (people lookup) | `GET /users` | `GET /users` | User.ReadBasic.All | User.Read.All | 200 | https://learn.microsoft.com/graph/api/user-list | 2025-07-23 |
| `schedule` | Free/busy and working hours of people and rooms (schedule lookup) | `POST /me/calendar/getSchedule` | `POST /users/{id|userPrincipalName}/calendar/getSchedule` | Calendars.ReadBasic | Calendars.ReadBasic.All | 200 | https://learn.microsoft.com/en-us/graph/api/calendar-getschedule | 2025-07-23 |
| `suggest` | Meeting-time suggestions (findMeetingTimes): a cross-check, not the primary path | `POST /me/findMeetingTimes` | Not supported | Calendars.Read.Shared | Not supported | 200 | https://learn.microsoft.com/graph/api/user-findmeetingtimes | 2024-04-04 |
| `create` | Create the event (this is what sends invitations) | `POST /me/events` | `POST /users/{id | userPrincipalName}/events` | Calendars.ReadWrite | Calendars.ReadWrite | 201 | https://learn.microsoft.com/en-us/graph/api/user-post-events | not shown |
| `cancel` | Cancel the event (the organiser only; sends a cancellation) | `POST /me/events/{id}/cancel` | `POST /users/{id | userPrincipalName}/events/{id}/cancel` | Calendars.ReadWrite | Calendars.ReadWrite | 202 | https://learn.microsoft.com/en-us/graph/api/event-cancel | 2024-06-21 |
| `shifts` | Shifts of a Teams team (who is on shift when) | `GET /teams/{teamId}/schedule/shifts` | `GET /teams/{teamId}/schedule/shifts` | Schedule.Read.All | Schedule.Read.All | 200 | https://learn.microsoft.com/en-us/graph/api/schedule-list-shifts | 2025-07-23 |

- **`people`**: $search="displayName:…" needs the header ConsistencyLevel: eventual and $count=true. Personal Microsoft accounts are not supported. Higher-privileged alternatives the page lists: User.Read.All, User.ReadWrite.All, Directory.Read.All, Directory.ReadWrite.All.
- **`schedule`**: availabilityViewInterval: default 30 minutes, minimum 5, maximum 1440. Without Prefer: outlook.timezone the times come back in UTC. A slot holding more than 1000 entries is answered with error 5006. The page states no limit on the number of addresses: not chunked here; to observe in real validation. TWO OFFICIAL PAGES DIFFER on the application permission: this call’s own table prints “Calendars.ReadBasic” in its Application row; the permissions reference (https://learn.microsoft.com/en-us/graph/permissions-reference, read 2026-11-11) has no application form of Calendars.ReadBasic and lists the application permission as Calendars.ReadBasic.All (“Read basic details of calendars in all mailboxes”). The name an administrator can grant is the one recorded here; to confirm in real validation. Higher-privileged alternatives the page lists: Calendars.Read, Calendars.ReadWrite.
- **`suggest`**: Application permissions and personal accounts: Not supported. Works inside the mailbox’s work hours unless activityDomain says otherwise; knows nothing about Shifts. meetingDuration is ISO 8601 (PT30M); the default is 30 minutes. Higher-privileged alternatives the page lists: Calendars.ReadWrite.Shared.
- **`create`**: A meeting without a room is created online: isOnlineMeeting true and onlineMeetingProvider “teamsForBusiness”. The event resource page (https://learn.microsoft.com/en-us/graph/api/resources/event, last updated 2025-05-15, read 2026-11-11): “After you set isOnlineMeeting to true, Microsoft Graph initializes onlineMeeting”; the provider’s possible values are “unknown, teamsForBusiness, skypeForBusiness, and skypeForConsumer”. Whether the event comes back with a join link is to observe in real validation. transactionId: “A custom identifier specified by a client app for the server to avoid redundant POST operations in case of client retries to create the same event” (https://learn.microsoft.com/en-us/graph/api/resources/event). A room is invited as an attendee of type resource, with its mailbox address. NOT STATED on the pages read: what the server answers to a second POST with the same transactionId. The mock assumes the first event is returned; to observe in real validation.
- **`cancel`**: An attendee who calls it gets HTTP 400: “You need to be an organizer to cancel a meeting.”. Returns 202 Accepted and no body.
- **`shifts`**: Request line “GET /teams/{teamId}/schedule/shifts”; “If successful, this method returns a 200 OK response code and a collection of shift objects”. The shift resource is https://learn.microsoft.com/en-us/graph/api/resources/shift (updated 2025-02-04). “The $filter parameter doesn’t support the use of the same property more than once in a query”: the page’s own example names each once (sharedShift/startDateTime ge … and sharedShift/endDateTime le …), as this adapter does. A shift is at most 24 hours; a shift identifies its person by userId (the directory object id). Higher-privileged alternatives the page lists: Schedule.ReadWrite.All, Group.Read.All, Group.ReadWrite.All.

Choose **one** kind of access and request only its column:

- **Delegated** (a person signs in; the app acts as that person and can do no more than they can). The organiser is `/me`. Needed
  if `findMeetingTimes` is wanted as a cross-check: its page says application permissions are "Not supported".
  Set: `User.ReadBasic.All`, `Calendars.ReadBasic`, `Calendars.ReadWrite`, `Schedule.Read.All`, and `Calendars.Read.Shared` only if
  `findMeetingTimes` is used. Of these, the permissions reference marks only `Schedule.Read.All` as needing an administrator's
  consent; a tenant may still require an administrator for all of them.
- **Application** (no signed-in user; the app acts on a named mailbox, `/users/{id | userPrincipalName}/…`). Set: `User.Read.All`,
  `Calendars.ReadBasic.All`, `Calendars.ReadWrite`, `Schedule.Read.All`; every one needs an administrator's consent. An application
  permission on calendars reaches **every** mailbox in the tenant ("Read and write calendars in all mailboxes") unless the tenant
  restricts it; restricting it to the test mailboxes is a tenant-administration step whose Microsoft page was **not read on
  2026-11-11**. Do not grant application permissions in a production tenant for this validation.
- **Two official pages differ on one name.** The `getSchedule` page prints `Calendars.ReadBasic` in the Application row of its
  permissions table. The permissions reference has no application form of `Calendars.ReadBasic`; the application permission there is
  `Calendars.ReadBasic.All` ("Read basic details of calendars in all mailboxes"). This guide and the adapter's "ask your
  administrator for …" message use the name the reference lists. Record in step 2 of §7.2 which name the tenant's portal offers.

Do **not** request the higher-privileged alternatives the pages list (`Calendars.Read`, `Calendars.ReadWrite.Shared`, `Group.Read.All`,
`Directory.Read.All` and so on). `Calendars.ReadWrite` is the only write permission, and it is needed for exactly two calls: create
and cancel.

**Admin consent.** The "Administrator's consent required" column above is each permission's `AdminConsentRequired` value in
Microsoft's permissions reference (https://learn.microsoft.com/en-us/graph/permissions-reference, read 2026-11-11 for these seven
permissions only: `User.ReadBasic.All`, `User.Read.All`, `Calendars.ReadBasic`, `Calendars.ReadBasic.All`, `Calendars.Read.Shared`,
`Calendars.ReadWrite`, `Schedule.Read.All`). "No" means a user may consent for themselves **unless the tenant has turned user consent
off**; every application permission is granted by an administrator.

**Knowledge from selected SharePoint sites.** Status: **mock-tested, not connected.** The ingestion engine runs over a simulated
library; `apps/demo/src/knowledge/graph.source.ts` reads a site's document library through Microsoft Graph into the same engine and
has only ever been answered by its mock (`graph.source.mock.ts`). No page imports it. The three calls, each read on its page on
2026-11-11:

| Call | Request | Least-privileged application permission the page lists | What the page says that the source depends on | Source |
|---|---|---|---|---|
| What changed | `GET /sites/{siteId}/drive/root/delta` | `Files.Read.All` | Pages end in `@odata.nextLink`, the last in `@odata.deltaLink`. `parentReference` carries no path and a renamed folder's descendants are not reported: track by id. Deleted items carry the `deleted` facet. The same item may appear twice: use the last. `410 Gone` gives a `Location` to start afresh | https://learn.microsoft.com/en-us/graph/api/driveitem-delta?view=graph-rest-1.0 |
| Who may read one document | `GET /sites/{siteId}/drive/items/{itemId}/permissions` | `Files.Read.All` | Returns direct and inherited permissions; a caller who is not the owner sees only what applies to them. The permission page says SharePoint libraries do not return `inheritedFrom` | https://learn.microsoft.com/en-us/graph/api/driveitem-list-permissions?view=graph-rest-1.0 |
| The text of one document | `GET /sites/{siteId}/drive/items/{item-id}/content` | `Files.Read.All` | `302 Found` to a preauthenticated address valid for minutes; no `Authorization` header is sent to it | https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0 |

How the source behaves (each held by a test): only the folders an administrator selected are read, and nothing is asked about a
document outside them; only `.md` and `.txt` are read as text (`.docx` and `.pdf` are refused with the reason: no text extraction
is built); a file the service marks with the malware facet, and a file over 5 MB, is never downloaded; who may read a document is
read again at every sync for every document in scope, so a removed reader is gone at the next sync whether or not the change feed
mentioned it (cost: one request per document per sync); a named user or a directory group with `read`, `write` or `owner` is a
reader, while a SharePoint site group and a sharing link with no named people grant nobody and are reported; a link is followed only
on `https://graph.microsoft.com/v1.0/`; the tenant's token is never sent to a download address; `429` waits `Retry-After` and
retries the same request; any refusal changes nothing.

**Open questions only a tenant answers** (`GRAPH_DOC_OPEN` in the source; each is a step in §7):

1. Whether an application granted `Sites.Selected` on one site may call delta, permissions and content there. The three pages list
   `Files.Read.All` as the least-privileged application permission and do not mention `Sites.Selected`. If it may not, the choice
   between a tenant-wide read permission and no ingestion is the customer's administrator's, not Empathia's.
2. Whether the permissions call, made by an application, returns every permission on a document.
3. Which member of `grantedToV2` carries a Microsoft 365 group and which a security group.
4. How long a `deltaLink` stays valid before the service answers `410 Gone`.
5. Whether a change of permissions alone appears in the change feed without the `Prefer` headers the delta page ties to
   `Sites.FullControl.All` (the source does not rely on it either way).

**Not built:** resolving which directory groups a signed-in reader belongs to (without it a real reader matches no imported
document, which fails closed); text extraction from `.docx` and `.pdf`; lists and site pages; change notifications; token
acquisition and any real transport.

The permission model for selected sites (the page was read on 2026-11-11):

| Purpose | Permission | How it is granted | Notes from the page | Source |
|---|---|---|---|---|
| Read selected sites only | `Sites.Selected` (and the narrower `Lists.SelectedOperations.Selected`, `ListItems.SelectedOperations.Selected`, `Files.SelectedOperations.Selected`) | Application, granted per site by an administrator: `POST /sites/{siteId}/permissions` with a role (`read`, `write`, `owner`, `fullcontrol`) | Three steps are all required: consent to the scope, grant the app a role on the resource, and a token carrying the scope. Granting below site level breaks permission inheritance on that resource. Empathia would ask for `read` only | https://learn.microsoft.com/en-us/graph/permissions-selected-overview |

Throttling and errors (how the adapter behaves, and what to look for):

- **throttling** — HTTP 429 with a Retry-After header: wait that many seconds, retry the request; without the header, back off exponentially. Source: https://learn.microsoft.com/graph/throttling (page updated 2025-01-15; read 2026-11-11).
- **errors** — 401: authentication missing or not valid. 403: the user does not have enough permission or a required licence. The body is { error: { code, message, innerError } }; the message is not shown to people. Source: https://learn.microsoft.com/en-us/graph/errors (page updated 2025-08-06; read 2026-11-11).

### How the product behaves around these calls (the rules the tests hold)

1. Opening an app is reported as "Opened Teams", never as "sent", "called" or "booked" (unit CX-20; browser CB-12, CB-13, CB-33).
2. A meeting is proposed, reviewed, and created only on an explicit confirmation by the person. At confirmation availability is read
   again; if the time was taken, nothing is created and new proposals are shown (CX-13, CX-15; CB-25 to CB-28). A review that is
   overtaken while it is open is withdrawn without a press (CB-97).
3. One confirmation creates at most one event: the same client-generated identifier is used on every retry (CX-14, CX-16, CX-30;
   CB-30, CB-35, CB-99).
4. A `401` or `403` is shown as what it is: not authorised, with the permission to ask an administrator for. It is never retried (CX-29).
5. A `429` waits for `Retry-After`. A retry never creates a second event (CX-30).
6. Asking Ask Empathia to book does not grant permission to book: the same authority check and the same confirmation apply (CX-22;
   CB-74 to CB-76, CB-80).
7. Contact details are shown only to roles permitted to see them, and prefilled text never carries what the reader's role cannot see
   (CX-19, CX-20; CB-45 to CB-58, CB-87, CB-101 to CB-112).

## 3. App registration and admin consent

The two Microsoft pages for these steps were read on 2026-11-11:

- Register an application: https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app (last updated 2026-06-05).
  The account must be "at least an Application Developer". "Browse to **Entra ID** > **App registrations** and select **New
  registration**"; give it a name; under **Supported account types** choose **Single tenant only** (the page recommends it "for most
  applications"); select **Register**; record the **Application (client) ID** from the **Overview** page. The page itself does not
  set a redirect address or a credential: it links to "Add a redirect URI to your application" and "Add credentials to your
  application", which were **not read**.
- Grant tenant-wide admin consent: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/grant-admin-consent (last updated
  2025-03-25). Who may grant: a **Privileged Role Administrator** "for apps requesting any permission, for any API"; a Cloud
  Application Administrator or Application Administrator for any permission "*except* Microsoft Graph app roles (application
  permissions)". So **application** access to Microsoft Graph needs a Privileged Role Administrator. Where: **Entra ID** > **App
  registrations** > the application > **API permissions** > **Grant admin consent**. The page warns that granting tenant-wide consent
  "may revoke permissions that have already been granted tenant-wide for that application", and that by default it "allows all users
  to access the application unless otherwise restricted".

1. In a **test tenant** (never a production tenant), register one application for this validation, as the first page says. Single tenant.
2. Record the application (client) id and the directory (tenant) id as configuration (§5). They are identifiers, not secrets. (The
   registration page names the client id; where the tenant id is shown was not on the page read.)
3. For **delegated** access: add a redirect address for the surface that will sign in. The demonstration is a static single page with
   `Content-Security-Policy: default-src 'self'`; it cannot call Microsoft Graph from the browser as it stands, and it must not hold a
   secret. A connected product therefore needs a **server-side** component that holds the credential and makes the Graph calls. That
   component does not exist; building it is part of the work this guide precedes.
4. For **application** access: create a credential for the application (a certificate is preferable to a client secret), stored in the
   server-side secret store. **Never** in the repository, the page, a URL, a log or this document.
5. Add the Microsoft Graph permissions of §2 for the chosen kind of access — those and no others.
6. An administrator with the role the second page names grants consent for the tenant (**API permissions** > **Grant admin consent**).
7. Confirm what was granted by reading the application's permission list back, and record the list with the date.

## 4. Test accounts and mailboxes

All in the test tenant. Names are placeholders; use the tenant's own verified domain.

| Account | Set up | Used for |
|---|---|---|
| **User A — organiser** | A licensed mailbox with Teams. Mailbox time zone and work hours set to a US zone (for example Central Time, Mon–Fri 08:00–17:00) | Signs in (delegated), or is the mailbox the application acts on. Organises every test meeting |
| **User B — colleague in another time zone** | A licensed mailbox with Teams. Mailbox time zone set to a zone that changes its clocks on **different dates** from User A's (for example London), with its own work hours | Schedule lookup across zones; the daylight-saving steps of §7 |
| **User C — shift worker** | A licensed mailbox with Teams; a member of a Teams team that has Shifts set up; at least one week of **shared** (published) shifts and one **draft** shift that is not shared | Shifts; a proposal must fall inside a shared shift and never inside the draft |
| **Room R — room mailbox** | A room resource mailbox that accepts and declines automatically | Free/busy of a room; invited as an attendee of type `resource`; its accept or decline observed after create |
| **User D — WITHOUT permission** | A licensed user who has **not** been granted (or has had revoked) what the others have: for delegated access, a user who declines consent or is outside the app's assignment; for application access, run the same calls with an app registration that lacks `Calendars.ReadWrite` | Negative tests: 401/403 must produce "Not authorised; ask your administrator for <permission>", and nothing may be created |

| **User E — a second tenant's user** (optional) | A licensed user in a **different** test tenant, with the same app registration consented there | Proves nothing of tenant 1 (people, calendars, rooms) can be read from tenant 2. There is no multi-tenant code in this slice: this step records what a single-tenant registration answers |

Seed each calendar with a few known busy blocks (write them down: these are the expected values), including one "tentative", one
"out of office" and one "working elsewhere" for User B.

## 5. Configuration values

| Value | What it is | Secret? | Where it lives |
|---|---|---|---|
| Tenant id | The directory (tenant) id of the test tenant | No | Server-side configuration |
| Client id | The application (client) id of the registration | No | Server-side configuration |
| Credential | Certificate or client secret (application access); none for a public client (delegated) | **Yes** | Server-side secret store only |
| Access mode | `delegated` or `application` (`GraphConfig.mode`) | No | Configuration |
| Organiser | User A's sign-in address (`GraphConfig.organizer`): the mailbox an application acts on | No | Configuration |
| Team id | The id of the Teams team whose Shifts are the rota (`GraphConfig.teamId`) | No | Configuration |
| Graph base | `https://graph.microsoft.com/v1.0` (`GRAPH_BASE`). National clouds use other hosts; not covered here | No | Constant |
| Retry limit | `GraphConfig.maxRetries` (default 4 retries, five attempts) | No | Configuration |
| Zone names | `WINDOWS_ZONE` in `graph.ts`: the Windows time-zone names the adapter can read. Add the test tenant's names after step 3 of §7.2 | No | Source |

The adapter takes a `transport` and a `token` function from its caller. For validation they are supplied by the server-side component
of §3; the demonstration never supplies them.

## 6. Devices

| Device | With the app | Without the app |
|---|---|---|
| **Android phone** (current Android, Chrome) | Teams and Outlook installed and signed in as User A | Teams and Outlook uninstalled; browser signed in to nothing |
| **iPhone** (current iOS, Safari) | Teams and Outlook installed and signed in as User A | Teams and Outlook uninstalled |
| Windows or macOS computer (Edge or Chrome) | Teams desktop installed and signed in | Teams not installed; Teams on the web signed in, then signed out |

On each, note which app is the default handler for `mailto:` and `tel:` links before testing. Deep links must be opened from
Empathia in the device's default browser.

## 7. Real-validation script

### 7.1 The script in twelve steps

To be run by a person; the expected result is beside each step, and the detailed steps of §7.2 that prove it are in brackets.

1. As A, open a person's profile and choose **Message in Teams** → Teams opens to a chat with that person; the compose box holds the
   prefilled text; nothing has gone anywhere until A presses Send. Empathia says "Opened Teams". [19]
2. The same on a phone without Teams → record what the browser shows. Empathia offers no store link: none is invented. [19]
3. **Call in Teams** → Teams asks for confirmation before placing the call. [20]
4. Ask for 30 minutes with B and C this week in room R → every proposal is inside A's, B's and C's working hours and C's shift, R is
   free, and each attendee's local time is shown. [5, 6, 7]
5. Confirm a proposal → one event exists in A's calendar with B, C and R; Empathia shows the event's identifier. Record the `201`
   response. A meeting without a room is created as a Teams meeting (`isOnlineMeeting: true`, `onlineMeetingProvider:
   "teamsForBusiness"`): **observe and record** whether the event carries a join link. [11]
6. Before confirming another proposal, book R for that time from Outlook → at confirmation Empathia refuses, says R is taken, and
   proposes again. Nothing was created. [14]
7. Confirm, and cut the network after the request leaves → on reconnect Empathia retries with the same identifier; exactly one event
   exists. Record how the service answered the retry. [12, 13]
8. As D → the refusal names the missing permission; the request is not repeated. [8, 9, 10]
9. Force a `429` (a burst of availability reads) → Empathia waits for `Retry-After`; no duplicate event. [16]
10. Cancel the meeting from Empathia (`POST /users/{id}/events/{eventId}/cancel`, or `/me/events/{eventId}/cancel` signed in) →
    `202`; the event is cancelled for every attendee and the room. [17, 18]
11. Ingestion (the Graph source is mock-tested only; these steps are its first real run). Connect the test site with `read`; record
    whether `Sites.Selected` alone is enough for delta, permissions and content (open question 1). Import two folders; confirm a
    third folder's documents are never requested (network log). Rename a folder in SharePoint; sync → its documents move, none is
    duplicated. Remove a reader from one document; sync → that reader no longer finds the document, its snippets or its citations
    in Empathia; record whether the change feed reported the document (open question 5). Share one document with a site group
    only; sync → it is refused as having no reader, and the report names the group. Delete a document; sync → it is gone from
    search. Leave the connection idle until the service answers `410` (or record that it did not within the test window); sync →
    a fresh read, nothing duplicated.
12. Repeat 1–5 on the second phone platform. Record device, OS version, app versions and screenshots for each step. [19 to 25]

A step counts as validated only when a person has run it on the named account and device and the evidence is filed. Until then every
row in §1 stays **PENDING**.

### 7.2 The steps in detail

Run in order. Record for each step: date, tester, device, what was sent (the adapter's `sent` list), what came back, PASS or FAIL.
A step not run is NOT RUN, never PASS. Stop and fix at the first failure that could create or send something unintended.

**A. Read-only calls (no risk of sending anything)**

1. *People lookup.* `people("<User B's first name>")`. **Expect** 200; User B with their sign-in address and directory id.
   With the `ConsistencyLevel: eventual` header removed, **expect** a 400 (confirms the header is required as the page says).
2. *Schedule lookup.* `schedule([A, B, R], Monday 00:00 UTC, Saturday 00:00 UTC)`. **Expect** each seeded busy block at the right
   instant; "free" and "working elsewhere" **not** reported busy; "tentative" and "out of office" reported busy; Room R with no
   working hours.
3. *Working hours and zone names.* From the same answer, read `workingHours.timeZone.name` for A and B. **Expect** a name present in
   `WINDOWS_ZONE`. If not, the adapter must answer "working hours unknown" and propose nothing; add the name, re-run. Record the
   names seen: this validates the one table the documentation did not.
4. *Shifts.* `shifts(Monday, Saturday)`. **Expect** User C's shared shifts with the right start and end; the draft shift **absent**.
5. *Suggestions.* `suggest({A, B, room R, 30 minutes, next 5 days})`. **Expect** every suggestion inside both people's work hours in
   their own zones, clear of every seeded block and of Room R's bookings. Compare with `native()` (`findMeetingTimes`, delegated
   only): differences are expected; record them.
6. *Shift worker.* `suggest({A, C, 30 minutes})`. **Expect** every suggestion inside one of C's shared shifts.
7. *Daylight saving.* Repeat step 5 for a week in which only one of A's and B's zones has changed its clocks. **Expect** the
   suggested instants to shift by one hour for the zone that changed and not for the other.

**B. Negative tests (still nothing may be created)**

8. *No permission, read.* As User D (or the app without the permission): `schedule([A])`. **Expect** "Not authorised; ask your
   administrator for Calendars.ReadBasic (… permission, Microsoft Graph)". Record the real status code and error body.
9. *No permission, write.* As User D: `create(...)`. **Expect** "Not authorised; ask your administrator for Calendars.ReadWrite"; then
   confirm in User A's calendar and every attendee's inbox that **no event and no invitation exist**.
10. *Expired sign-in.* With an expired token. **Expect** the "sign in again" wording (401), nothing created.

**C. Creating — the first time anything is sent. Use only the test accounts.**

11. *Create once.* Propose, review, confirm a 30-minute meeting A + B + Room R. **Expect** 201; exactly one event in A's calendar;
    exactly one invitation in B's inbox; Room R accepts. **Before** the confirmation, confirm that nothing was in any calendar or
    inbox (the propose and review steps send nothing).
12. *Same transaction id again.* Repeat the identical `create` with the same `transactionId` from a fresh adapter instance without
    `known`. **Observe and record** what the server answers. The documentation read on 2026-11-11 does not say; the mock assumes the
    first event is returned. **Expect** still exactly one event and one invitation. If a second event appears, the adapter must be
    changed to look the event up before posting, and this is a release blocker.
13. *Lost answer.* Create with the network cut after the request leaves (or a transport that drops the response). **Expect** the
    adapter to retry with the same `transactionId` and the calendar to hold one event.
14. *Conflict between review and confirm.* Review a slot; from another client book User B at that time; confirm. **Expect** a
    refusal naming User B, and no event created.
15. *Room declines.* Book Room R from another client, then (bypassing the adapter's re-check in a test harness only) create an
    overlapping event. **Observe and record** how the room's decline arrives (the attendee's response on the event). The adapter
    does not read this back today; decide whether it must.
16. *Throttling.* Drive requests until a 429 is returned (or use a tenant throttling test, if the tenant offers one). **Expect** the
    adapter to wait the `Retry-After` seconds and retry; one event; record whether the header was present.
17. *Cancel.* `cancel(eventId, "Validation finished")`. **Expect** 202; the event gone from A's calendar; a cancellation in B's inbox
    carrying the comment; Room R freed.
18. *Cancel as a non-organiser.* As User B, cancel A's event. **Expect** HTTP 400 and the adapter's "Only the organiser of a meeting
    can cancel it".

**D. App jumps — on each device of §6, with and without the app**

For each: tap the link in the demonstration (with the directory pointed at the test accounts), and record what opened.

19. *Teams chat* (`teams.chat`). **Expect** Teams opens a chat with User B with the text as a **draft**; nothing is sent until the
    tester presses Send. Without the app: record what the browser shows (this is the fallback the registry could not observe).
20. *Teams call* (`teams.call`). **Expect** Teams asks for confirmation before calling. Decline. Without the app: record.
21. *Teams scheduling form* (`teams.meeting`). **Expect** Teams' form with subject, start, end and attendees filled in, the times
    correct **in the device's time zone**, and nothing sent until Send is pressed. Check a subject containing an apostrophe, a plus
    sign, an ampersand and non-Latin text arrives intact.
22. *Send email* (`mailto:`). **Expect** the default mail app with To, Subject and a multi-line body intact, line breaks preserved.
    With no mail app configured: record what happens (the registry says "nothing opens; use Copy email").
23. *Call* (`tel:`). **Expect** the dialler with the number entered and **not dialled**. On a computer without a calling app: record.
24. *Return.* After each jump, return to the browser. **Expect** the page still there and, from another page, "Back to where I was".
25. *Copy.* Copy email and Copy contact card on each device; paste elsewhere. **Expect** the exact text; where the browser refuses
    the clipboard, the selectable fallback appears.

**E. After the run**

26. Remove every test event; revoke the app's consent if the tenant is shared; record the list of permissions that were granted.
27. Update `GRAPH_CALLS`, `WINDOWS_ZONE`, `ASSUMPTIONS` and the two documents with what was observed, each with the date and the tenant
    type. Only then may any wording stronger than "mock-tested" be used, and only for the steps that passed.

## 8. Pending

| | State | Needs |
|---|---|---|
| Real tenant validation | **Pending** | A Microsoft 365 test tenant; an administrator; the app registration of §3 |
| Actual event creation | **Pending** | Steps 11–18, with the accounts of §4 |
| Live Teams interactions | **Pending** | Steps 19–21, signed in as User A |
| Physical mobile QA | **Pending** | Steps 19–25 on an Android phone and an iPhone, each with and without Teams and Outlook |
| A server-side component to hold the credential and call Graph | **Not built** | The demonstration is a static page under `default-src 'self'` |
| Outlook on the web compose link | **Unverified, not offered** | An official Microsoft page documenting it |
| Pages not read on 2026-11-11 | "Add a redirect URI to your application"; "Add credentials to your application"; how a tenant restricts an application permission to named mailboxes; the permissions reference beyond the seven permissions of §2; places and room lists | Read them before step 1 |
| One permission name on which two official pages differ | `Calendars.ReadBasic` (the `getSchedule` page) or `Calendars.ReadBasic.All` (the permissions reference) for application access | Record what the tenant's portal offers (§2) |

## 9. Deep links (they open an app; they complete nothing)

Each format was read on the vendor's own page, or the RFC, on 2026-11-11. What could not be found on an official page is listed as
not offered, and no link is built for it. No "get the app" link is generated anywhere (founder: "Do not generate speculative download
URLs"): when an app is missing the person is told what to do instead (Copy email, the profile).

| Id | Action | Format | In the product | Source | Read | Page's own date |
|---|---|---|---|---|---|---|
| `teams.chat` | Message in Teams | `https://teams.microsoft.com/l/chat/0/0?users=<user1>,<user2>,...&topicName=<chat name>&message=<precanned text>` | Offered | https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/deep-link-teams | 2026-11-11 | 2026-03-26 |
| `teams.call` | Call in Teams | `https://teams.microsoft.com/l/call/0/0?users=<user1>,<user2>` | Offered | https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/deep-link-workflow | 2026-11-11 | 2026-06-23 |
| `teams.meeting` | Open Teams’ scheduling form | `https://teams.microsoft.com/l/meeting/new?subject=<meeting subject>&startTime=<date>&endTime=<date>&content=<content>&attendees=<user1>,<user2>,<user3>,...` | Offered | https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/deep-link-workflow | 2026-11-11 | 2026-06-23 |
| `mail.compose` | Send email | `mailto:<addr-spec>?subject=<hfvalue>&body=<hfvalue>` | Offered | https://www.rfc-editor.org/rfc/rfc6068.txt | 2026-11-11 | 2010-10 (RFC 6068) |
| `phone.call` | Call | `tel:<global-number-digits>` | Offered | https://www.rfc-editor.org/rfc/rfc3966 | 2026-11-11 | 2004-12 (RFC 3966) |
| `outlook.web.compose` | Write in Outlook on the web | `https://outlook.office.com/mail/deeplink/compose?to=<address>&subject=<subject>&body=<body>` | **Not offered** (unverified) | — | — | — |
| `teams.protocol` | Open in the Teams app directly | `msteams:/l/chat/0/0?users=<user1>` | **Not offered** (unverified) | — | — | — |

What each page says about the link (what opens, what the person still has to do, what happens without the app) is in
[CONNECT.md §4](CONNECT.md).
